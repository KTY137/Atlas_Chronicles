import { createHash } from "node:crypto";
import { setImmediate as immediate } from "node:timers/promises";
import sharp from "sharp";
import { inspectUvttImage } from "@chronicle/forge";
import type { TacticalImageRef, TacticalPoint } from "@chronicle/szene";

/** Derived artifacts only. Never use this private cache identity as a player-visible revision. */
export const TACTICAL_RASTER_DECODER_ID = `chronicle-raster-v1:center-evenodd-union:whole-footprint-box:rgba8:${JSON.stringify(Object.fromEntries(Object.entries(sharp.versions).sort(([a], [b]) => a.localeCompare(b, "en"))))}`;
export const TACTICAL_RASTER_LIMITS = Object.freeze({
  pixels: 16_000_000, dimension: 32768, imageBytes: 16 * 1024 * 1024,
  regions: 2048, points: 20_000, coordinate: 1_000_000_000, edgeChecks: 20_000_000, maskPixelWrites: 64_000_000,
  tileSize: 1024, concurrent: 1, queue: 8, queueWaitMs: 5_000, jobTimeoutMs: 15_000,
  cacheBytes: 64 * 1024 * 1024, cacheEntries: 32,
});
export type TacticalRasterPolygon = readonly TacticalPoint[];
export interface TacticalTileRequest {
  readonly image: Uint8Array | null;
  readonly documentSize: readonly [number, number];
  /** Already authorized image-pixel polygons, interpreted as a union of even-odd rings.
   * null explicitly authorizes the full background; [] authorizes no pixels.
   * A base pixel is inside at its center, with left-inclusive/right-exclusive crossings.
   * Coarse pixels require every base pixel in their box footprint to be authorized. */
  readonly regions: readonly TacticalRasterPolygon[] | null;
  readonly level: number; readonly x: number; readonly y: number; readonly tileSize?: number;
}
export interface TacticalTile { readonly bytes: Buffer; readonly mimeType: "image/png"; readonly width: number; readonly height: number }
export interface ValidatedTacticalImage extends TacticalImageRef { readonly bytes: number; readonly decoderId: string }
export interface TacticalRasterOptions {
  readonly maxConcurrent?: number; readonly maxQueue?: number; readonly queueWaitMs?: number;
  readonly jobTimeoutMs?: number; readonly maxCacheBytes?: number; readonly maxCacheEntries?: number;
}
export interface TacticalRasterStats {
  readonly active: number; readonly queued: number; readonly cacheBytes: number; readonly cacheEntries: number;
  readonly cacheHits: number; readonly cacheMisses: number;
}
export interface TacticalRasterService {
  validateImage(image: Uint8Array, expected: TacticalImageRef): Promise<ValidatedTacticalImage>;
  renderTacticalTile(request: TacticalTileRequest): Promise<TacticalTile>;
  clearCache(): void;
  stats(): TacticalRasterStats;
}
export class TacticalRasterError extends Error {
  override readonly name = "TacticalRasterError";
  constructor(readonly code: "invalid" | "busy" | "timeout", message: string) { super(message); }
}
const fail = (message: string): never => { throw new TacticalRasterError("invalid", message); };
const digest = (bytes: Uint8Array | string): string => createHash("sha256").update(bytes).digest("hex");
function integer(value: unknown, min: number, max: number, name: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < min || value > max) fail(`${name} must be an integer in ${min}..${max}`);
  return value as number;
}
function size(value: readonly [number, number]): readonly [number, number] {
  if (!Array.isArray(value) || value.length !== 2) fail("documentSize must contain width and height");
  const width = integer(value[0], 1, TACTICAL_RASTER_LIMITS.dimension, "width"), height = integer(value[1], 1, TACTICAL_RASTER_LIMITS.dimension, "height");
  if (width * height > TACTICAL_RASTER_LIMITS.pixels) fail("server raster pixel limit is 16,000,000");
  return [width, height];
}
function sourceCopy(image: Uint8Array): Buffer {
  // Only in-memory bytes reach sharp: strings, filesystem paths, URLs and SVG are never inputs.
  if (!(image instanceof Uint8Array) || image.byteLength === 0 || image.byteLength > TACTICAL_RASTER_LIMITS.imageBytes) fail("image must contain at most 16 MiB of encoded PNG or WebP bytes");
  return Buffer.from(image);
}
function expectedCopy(expected: TacticalImageRef): TacticalImageRef {
  if (!expected || typeof expected !== "object" || typeof expected.sha256 !== "string" || !/^[0-9a-f]{64}$/.test(expected.sha256) || !["image/png", "image/webp"].includes(expected.mimeType)) fail("expected image metadata is invalid");
  const [width, height] = size([expected.width, expected.height]);
  return { sha256: expected.sha256, mimeType: expected.mimeType, width, height };
}
interface Job { readonly deadline: number; check(): void; seconds(): number; pause(): Promise<void> }
function jobContext(timeoutMs: number): Job {
  const deadline = performance.now() + timeoutMs;
  const check = () => { if (performance.now() >= deadline) throw new TacticalRasterError("timeout", "tactical raster processing deadline exceeded"); };
  return { deadline, check, seconds() { check(); return Math.max(1, Math.ceil((deadline - performance.now()) / 1000)); }, async pause() { await immediate(); check(); } };
}
function inputPipeline(image: Buffer, job: Job) {
  return sharp(image, { failOn: "warning", limitInputPixels: TACTICAL_RASTER_LIMITS.pixels, limitInputChannels: 4,
    unlimited: false, sequentialRead: true, animated: false, pages: 1, autoOrient: false }).timeout({ seconds: job.seconds() });
}
async function decode(image: Buffer, dimensions: readonly [number, number], job: Job, expected?: TacticalImageRef): Promise<{ rgba: Buffer; metadata: ValidatedTacticalImage }> {
  job.check();
  let inspected: ReturnType<typeof inspectUvttImage>;
  try { inspected = inspectUvttImage(image.toString("base64")); }
  catch { return fail("invalid or unsupported static PNG/WebP container"); }
  size([inspected.width, inspected.height]);
  if (inspected.width !== dimensions[0] || inspected.height !== dimensions[1]) fail("image dimensions do not match the tactical document");
  if (expected && (expected.sha256 !== inspected.sha256 || expected.mimeType !== inspected.mimeType)) fail("image content hash or MIME type does not match the expected metadata");
  job.check();
  try {
    const metadata = await inputPipeline(image, job).metadata();
    job.check();
    if (!(["png", "webp"].includes(metadata.format ?? "")) || metadata.width !== dimensions[0] || metadata.height !== dimensions[1] || (metadata.pages ?? 1) !== 1 || metadata.delay || metadata.loop !== undefined) fail("decoder reported incompatible or animated image metadata");
    // Full compressed-pixel decode is mandatory even during admission. Container checks alone
    // cannot reject a valid chunk table containing invalid compressed image data.
    const decoded = await inputPipeline(image, job).toColourspace("srgb").ensureAlpha().raw({ depth: "uchar" }).toBuffer({ resolveWithObject: true });
    job.check();
    if (decoded.info.width !== dimensions[0] || decoded.info.height !== dimensions[1] || decoded.info.channels !== 4 || decoded.data.length !== dimensions[0] * dimensions[1] * 4) fail("decoded pixel layout is incompatible");
    return { rgba: decoded.data, metadata: { sha256: inspected.sha256, mimeType: inspected.mimeType, width: inspected.width, height: inspected.height, bytes: image.length, decoderId: TACTICAL_RASTER_DECODER_ID } };
  } catch (error) {
    job.check();
    if (error instanceof TacticalRasterError) throw error;
    return fail("image pixel decoder rejected the source");
  }
}

interface TileGeometry { width: number; height: number; sourceWidth: number; sourceHeight: number; left: number; top: number; factor: number }
function tileGeometry(request: TacticalTileRequest): TileGeometry {
  const [sourceWidth, sourceHeight] = size(request.documentSize), tileSize = integer(request.tileSize ?? 256, 1, TACTICAL_RASTER_LIMITS.tileSize, "tileSize");
  const lastLevel = Math.max(0, Math.ceil(Math.log2(Math.max(sourceWidth, sourceHeight) / tileSize)));
  const level = integer(request.level, 0, lastLevel, "level"), factor = 2 ** level;
  const levelWidth = Math.ceil(sourceWidth / factor), levelHeight = Math.ceil(sourceHeight / factor);
  const x = integer(request.x, 0, Math.ceil(levelWidth / tileSize) - 1, "x"), y = integer(request.y, 0, Math.ceil(levelHeight / tileSize) - 1, "y");
  return { width: Math.min(tileSize, levelWidth - x * tileSize), height: Math.min(tileSize, levelHeight - y * tileSize), sourceWidth, sourceHeight, left: x * tileSize, top: y * tileSize, factor };
}
function polygonsCopy(regions: readonly TacticalRasterPolygon[] | null, height: number): readonly TacticalRasterPolygon[] | null {
  if (regions === null) return null;
  if (!Array.isArray(regions) || regions.length > TACTICAL_RASTER_LIMITS.regions) fail("regions must be a bounded array of authorized polygons or explicit null");
  let points = 0, work = 0;
  const polygons = Array.from(regions, polygon => {
    if (!Array.isArray(polygon) || polygon.length < 3 || (points += polygon.length) > TACTICAL_RASTER_LIMITS.points) fail("polygon vertex budget exceeded or fewer than three vertices");
    let minY = Infinity, maxY = -Infinity;
    const copied = Array.from(polygon, (point: TacticalPoint) => {
      if (!Array.isArray(point) || point.length !== 2 || [point[0], point[1]].some(value => typeof value !== "number" || !Number.isFinite(value) || Math.abs(value) > TACTICAL_RASTER_LIMITS.coordinate)) fail("polygon coordinates must be bounded finite image pixels");
      minY = Math.min(minY, point[1]!); maxY = Math.max(maxY, point[1]!);
      return [point[0]!, point[1]!] as TacticalPoint;
    });
    work += Math.max(0, Math.min(height, Math.ceil(maxY - 0.5)) - Math.max(0, Math.ceil(minY - 0.5))) * copied.length;
    if (work > TACTICAL_RASTER_LIMITS.edgeChecks) fail("polygon rasterization work budget exceeded");
    return copied;
  });
  // Union order has no meaning, so equivalent caller order shares only private masked cache data.
  return polygons.sort((a, b) => { const sa = JSON.stringify(a), sb = JSON.stringify(b); return sa < sb ? -1 : sa > sb ? 1 : 0; });
}
const allowed = (mask: Buffer, index: number): boolean => (mask[index >>> 3]! & (1 << (index & 7))) !== 0;
async function makeMask(polygons: readonly TacticalRasterPolygon[] | null, width: number, height: number, job: Job): Promise<Buffer | null> {
  if (polygons === null) return null;
  const mask = Buffer.alloc(Math.ceil(width * height / 8)); let pixelWrites = 0;
  for (const polygon of polygons) {
    let minY = height, maxY = 0;
    for (const point of polygon) { minY = Math.min(minY, point[1]); maxY = Math.max(maxY, point[1]); }
    const startY = Math.max(0, Math.ceil(minY - 0.5)), endY = Math.min(height, Math.ceil(maxY - 0.5));
    for (let y = startY; y < endY; y++) {
      const cy = y + 0.5, crossings: number[] = [];
      for (let i = 0; i < polygon.length; i++) {
        const a = polygon[i]!, b = polygon[(i + 1) % polygon.length]!;
        if ((a[1] > cy) !== (b[1] > cy)) crossings.push(a[0] + (cy - a[1]) * (b[0] - a[0]) / (b[1] - a[1]));
      }
      crossings.sort((a, b) => a - b);
      for (let i = 0; i + 1 < crossings.length; i += 2) {
        const startX = Math.max(0, Math.ceil(crossings[i]! - 0.5)), endX = Math.min(width, Math.ceil(crossings[i + 1]! - 0.5));
        pixelWrites += Math.max(0, endX - startX);
        if (pixelWrites > TACTICAL_RASTER_LIMITS.maskPixelWrites) fail("polygon pixel-write work budget exceeded");
        for (let x = startX; x < endX; x++) { const index = y * width + x; mask[index >>> 3] = mask[index >>> 3]! | (1 << (index & 7)); }
      }
      if ((y & 31) === 0) await job.pause();
    }
    job.check();
  }
  return mask;
}
interface MaskedSource { readonly rgba: Buffer; readonly mask: Buffer | null; readonly bytes: number }
async function materializeMask(rgba: Buffer, mask: Buffer | null, width: number, height: number, job: Job): Promise<void> {
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pixel = y * width + x, at = pixel * 4;
      if (mask !== null && !allowed(mask, pixel)) rgba.fill(0, at, at + 4);
      else if (rgba[at + 3] === 0) rgba.fill(0, at, at + 3);
    }
    if ((y & 31) === 0) await job.pause();
  }
}
async function boxTile(source: MaskedSource | null, geometry: TileGeometry, job: Job): Promise<Buffer> {
  const { width, height, sourceWidth, sourceHeight, left, top, factor } = geometry, output = Buffer.alloc(width * height * 4);
  if (!source) return output;
  // A separate, already sanitized raw buffer is the sole input to this box filter.
  // sharp resize executes before composite even if calls are reversed:
  // https://sharp.pixelplumbing.com/api-composite/ . Never combine masking and resizing.
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const x0 = (left + x) * factor, y0 = (top + y) * factor, x1 = Math.min(sourceWidth, x0 + factor), y1 = Math.min(sourceHeight, y0 + factor);
      let red = 0, green = 0, blue = 0, alpha = 0, visible = true;
      footprint: for (let sy = y0; sy < y1; sy++) {
        for (let sx = x0; sx < x1; sx++) {
          const pixel = sy * sourceWidth + sx, at = pixel * 4;
          if (source.mask !== null && !allowed(source.mask, pixel)) { visible = false; break footprint; }
          const a = source.rgba[at + 3]!;
          red += source.rgba[at]! * a; green += source.rgba[at + 1]! * a; blue += source.rgba[at + 2]! * a; alpha += a;
        }
        if ((sy & 127) === 0 && factor >= 128) await job.pause();
      }
      if (visible && alpha !== 0) {
        const at = (y * width + x) * 4, a = Math.round(alpha / ((x1 - x0) * (y1 - y0)));
        if (a !== 0) { output[at] = Math.round(red / alpha); output[at + 1] = Math.round(green / alpha); output[at + 2] = Math.round(blue / alpha); output[at + 3] = a; }
      }
    }
    if ((y & 15) === 0) await job.pause();
  }
  job.check(); return output;
}

/** One service owns a bounded queue and LRU of sanitized pixels. No DB, network, auth,
 * source-byte cache, disk files, or global sharp configuration is involved. A timed-out
 * caller releases no worker slot until its native operation actually settles. libvips'
 * timeout bounds native processing (not native thread-pool wait); the caller timer also
 * bounds the response wait while retaining that slot. Queue wait has its own deadline. */
export function createTacticalRasterService(options: TacticalRasterOptions = {}): TacticalRasterService {
  const concurrent = integer(options.maxConcurrent ?? TACTICAL_RASTER_LIMITS.concurrent, 1, 4, "maxConcurrent");
  const maxQueue = integer(options.maxQueue ?? TACTICAL_RASTER_LIMITS.queue, 0, 32, "maxQueue");
  const queueWaitMs = integer(options.queueWaitMs ?? TACTICAL_RASTER_LIMITS.queueWaitMs, 1, 60_000, "queueWaitMs");
  const timeoutMs = integer(options.jobTimeoutMs ?? TACTICAL_RASTER_LIMITS.jobTimeoutMs, 1, 60_000, "jobTimeoutMs");
  const maxCacheBytes = integer(options.maxCacheBytes ?? TACTICAL_RASTER_LIMITS.cacheBytes, 0, 128 * 1024 * 1024, "maxCacheBytes");
  const maxCacheEntries = integer(options.maxCacheEntries ?? TACTICAL_RASTER_LIMITS.cacheEntries, 0, 128, "maxCacheEntries");
  let active = 0, cacheBytes = 0, cacheHits = 0, cacheMisses = 0;
  const cache = new Map<string, MaskedSource>();
  const queue: { start(): void; timer: ReturnType<typeof setTimeout> }[] = [];
  function capacity(): void { if (active >= concurrent && queue.length >= maxQueue) throw new TacticalRasterError("busy", "tactical raster capacity exhausted"); }
  function run<T>(work: (job: Job) => Promise<T>): Promise<T> {
    capacity();
    return new Promise<T>((resolve, reject) => {
      const start = () => {
        active++;
        const job = jobContext(timeoutMs), timer = setTimeout(() => reject(new TacticalRasterError("timeout", "tactical raster processing deadline exceeded")), timeoutMs);
        const release = () => {
          clearTimeout(timer); active--;
          const next = queue.shift(); if (next) { clearTimeout(next.timer); next.start(); }
        };
        // Do not Promise.race(...).finally(release): a rejected caller is not cancelled libvips.
        void Promise.resolve().then(() => work(job)).then(value => { release(); resolve(value); }, error => { release(); reject(error); });
      };
      if (active < concurrent) start();
      else {
        const item = { start, timer: setTimeout(() => { const index = queue.indexOf(item); if (index !== -1) queue.splice(index, 1); reject(new TacticalRasterError("busy", "tactical raster queue wait exceeded")); }, queueWaitMs) };
        queue.push(item);
      }
    });
  }
  function remember(key: string, value: MaskedSource): void {
    if (value.bytes > maxCacheBytes || maxCacheEntries === 0) return;
    const previous = cache.get(key); if (previous) { cacheBytes -= previous.bytes; cache.delete(key); }
    while (cache.size >= maxCacheEntries || cacheBytes + value.bytes > maxCacheBytes) {
      const oldest = cache.keys().next().value; if (oldest === undefined) break;
      cacheBytes -= cache.get(oldest)!.bytes; cache.delete(oldest);
    }
    cache.set(key, value); cacheBytes += value.bytes;
  }
  return {
    async validateImage(image, expected) {
      capacity(); const bytes = sourceCopy(image), metadata = expectedCopy(expected);
      return run(async job => (await decode(bytes, [metadata.width, metadata.height], job, metadata)).metadata);
    },
    async renderTacticalTile(request) {
      capacity();
      if (!request || typeof request !== "object") fail("tile request required");
      const geometry = tileGeometry(request), polygons = polygonsCopy(request.regions, geometry.sourceHeight), image = request.image === null ? null : sourceCopy(request.image);
      return run(async job => {
        let source: MaskedSource | null = null;
        if (image !== null) {
          const key = digest(`${TACTICAL_RASTER_DECODER_ID}\n${digest(image)}\n${geometry.sourceWidth},${geometry.sourceHeight}\n${JSON.stringify(polygons)}`);
          source = cache.get(key) ?? null;
          if (source) { cacheHits++; cache.delete(key); cache.set(key, source); }
          else {
            cacheMisses++;
            const decoded = await decode(image, [geometry.sourceWidth, geometry.sourceHeight], job);
            const mask = await makeMask(polygons, geometry.sourceWidth, geometry.sourceHeight, job);
            await materializeMask(decoded.rgba, mask, geometry.sourceWidth, geometry.sourceHeight, job);
            source = { rgba: decoded.rgba, mask, bytes: decoded.rgba.length + (mask?.length ?? 0) + key.length * 2 };
            job.check(); remember(key, source);
          }
        }
        const rgba = await boxTile(source, geometry, job);
        // Fresh raw input drops source EXIF/XMP/ICC/text chunks. Alpha-zero RGB is already zero.
        const bytes = await sharp(rgba, { raw: { width: geometry.width, height: geometry.height, channels: 4 } })
          .timeout({ seconds: job.seconds() }).png({ compressionLevel: 6, adaptiveFiltering: false, palette: false }).toBuffer();
        job.check();
        return { bytes, mimeType: "image/png", width: geometry.width, height: geometry.height };
      });
    },
    clearCache() { cache.clear(); cacheBytes = 0; },
    stats() { return { active, queued: queue.length, cacheBytes, cacheEntries: cache.size, cacheHits, cacheMisses }; },
  };
}

const defaultService = createTacticalRasterService();
export const validateImage: TacticalRasterService["validateImage"] = (image, expected) => defaultService.validateImage(image, expected);
export const renderTacticalTile: TacticalRasterService["renderTacticalTile"] = request => defaultService.renderTacticalTile(request);
