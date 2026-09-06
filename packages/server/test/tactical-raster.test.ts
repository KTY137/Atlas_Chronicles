import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { setImmediate as immediate } from "node:timers/promises";
import sharp, { type Sharp } from "sharp";
import { describe, expect, it, vi } from "vitest";
import { inspectUvttImage } from "@chronicle/forge";
import type { TacticalImageRef } from "@chronicle/szene";
import { createTacticalRasterService, TACTICAL_RASTER_DECODER_ID, TACTICAL_RASTER_LIMITS, type TacticalRasterPolygon, type TacticalTileRequest } from "../src/domain/tactical-raster.ts";

const hash = (value: Uint8Array) => createHash("sha256").update(value).digest("hex");
const metadata = (image: Buffer, width: number, height: number, mimeType: TacticalImageRef["mimeType"] = "image/png"): TacticalImageRef => ({ sha256: hash(image), width, height, mimeType });
const rectangle = (left: number, top: number, right: number, bottom: number): TacticalRasterPolygon => [[left, top], [right, top], [right, bottom], [left, bottom]];
async function png(width: number, height: number, pixel: (x: number, y: number) => readonly [number, number, number, number]): Promise<Buffer> {
  const bytes = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) bytes.set(pixel(x, y), (y * width + x) * 4);
  return sharp(bytes, { raw: { width, height, channels: 4 } }).png().toBuffer();
}
async function rgba(image: Buffer) { return sharp(image).ensureAlpha().raw().toBuffer({ resolveWithObject: true }); }
function pixelAt(data: Buffer, width: number, x: number, y: number): number[] { return [...data.subarray((y * width + x) * 4, (y * width + x) * 4 + 4)]; }
const request = (image: Buffer | null, width: number, height: number, regions: readonly TacticalRasterPolygon[] | null = null): TacticalTileRequest => ({ image, documentSize: [width, height], regions, level: 0, x: 0, y: 0 });
const crc = (bytes: Buffer): number => { let value = 0xffffffff; for (const byte of bytes) { value ^= byte; for (let bit = 0; bit < 8; bit++) value = value & 1 ? (value >>> 1) ^ 0xedb88320 : value >>> 1; } return (value ^ 0xffffffff) >>> 0; };
function chunk(type: string, data: Buffer): Buffer { const result = Buffer.alloc(data.length + 12); result.writeUInt32BE(data.length); result.write(type, 4); data.copy(result, 8); result.writeUInt32BE(crc(result.subarray(4, -4)), result.length - 4); return result; }
function chunks(image: Buffer): { type: string; data: Buffer }[] {
  const result: { type: string; data: Buffer }[] = [];
  for (let at = 8; at < image.length;) { const length = image.readUInt32BE(at); result.push({ type: image.toString("ascii", at + 4, at + 8), data: image.subarray(at + 8, at + 8 + length) }); at += length + 12; }
  return result;
}
async function realImage(): Promise<Buffer> {
  // Real BSD-3-Clause Imagix/uvtt2fgu corpus; provenance and upstream license are beside it.
  const path = new URL("../../forge/test/fixtures/uvtt/sampleMap.dd2vtt", import.meta.url);
  const text = await readFile(path, "utf8");
  expect(hash(Buffer.from(text))).toBe("3384e501dd30c2c978c6d56d8ad7ab75ebcc282accd9580511fef9a776d4dc4a");
  return Buffer.from((JSON.parse(text) as { image: string }).image, "base64");
}

describe("bounded tactical raster pixel admission", () => {
  it("fully decodes the real external 2560-square UVTT PNG and renders its pyramid", async () => {
    const image = await realImage(), service = createTacticalRasterService();
    expect(await service.validateImage(image, metadata(image, 2560, 2560))).toEqual({ ...metadata(image, 2560, 2560), bytes: image.length, decoderId: TACTICAL_RASTER_DECODER_ID });
    const tile = await service.renderTacticalTile({ ...request(image, 2560, 2560, [rectangle(0, 0, 1280, 2560)]), level: 4 });
    expect([tile.width, tile.height, tile.mimeType]).toEqual([160, 160, "image/png"]);
    const decoded = await rgba(tile.bytes);
    expect(decoded.data.subarray(80 * 4, 160 * 4).every(value => value === 0)).toBe(true);
    expect(service.stats().cacheBytes).toBeLessThanOrEqual(TACTICAL_RASTER_LIMITS.cacheBytes);
    expect(TACTICAL_RASTER_DECODER_ID).toContain(`"sharp":"${sharp.versions.sharp}"`);
    expect(TACTICAL_RASTER_DECODER_ID).toContain(`"vips":"${sharp.versions.vips}"`);
  }, 20_000);

  it("admits static lossless WebP through the actual decoder", async () => {
    const image = await sharp({ create: { width: 12, height: 8, channels: 4, background: { r: 20, g: 30, b: 40, alpha: 1 } } }).webp({ lossless: true }).toBuffer();
    const service = createTacticalRasterService();
    expect((await service.validateImage(image, metadata(image, 12, 8, "image/webp"))).mimeType).toBe("image/webp");
    expect(pixelAt((await rgba((await service.renderTacticalTile(request(image, 12, 8))).bytes)).data, 12, 0, 0)).toEqual([20, 30, 40, 255]);
  });

  it("rejects valid PNG chunk checksums with invalid compressed pixels", async () => {
    const valid = await png(8, 8, () => [1, 2, 3, 255]);
    const malformed = Buffer.concat([valid.subarray(0, 8), ...chunks(valid).map(row => chunk(row.type, row.type === "IDAT" ? Buffer.from("not a zlib stream") : row.data))]);
    expect(inspectUvttImage(malformed.toString("base64")).width).toBe(8);
    await expect(createTacticalRasterService().validateImage(malformed, metadata(malformed, 8, 8))).rejects.toMatchObject({ code: "invalid", message: "image pixel decoder rejected the source" });
  });

  it("rejects mismatched content, MIME and dimensions and truncated bytes", async () => {
    const image = await png(8, 9, () => [1, 2, 3, 255]), service = createTacticalRasterService(), expected = metadata(image, 8, 9);
    for (const invalid of [{ ...expected, sha256: "0".repeat(64) }, { ...expected, mimeType: "image/webp" as const }, { ...expected, height: 10 }]) {
      await expect(service.validateImage(image, invalid)).rejects.toMatchObject({ code: "invalid" });
    }
    await expect(service.validateImage(image.subarray(0, -1), expected)).rejects.toMatchObject({ code: "invalid" });
    await expect(service.renderTacticalTile(request(image, 9, 8))).rejects.toMatchObject({ code: "invalid" });
  });

  it("rejects animation, SVG, URLs and paths rather than passing them to sharp", async () => {
    const image = await png(8, 8, () => [1, 2, 3, 255]), header = chunks(image)[0]!;
    const animation = Buffer.alloc(8); animation.writeUInt32BE(2);
    const animated = Buffer.concat([image.subarray(0, 8), chunk("IHDR", header.data), chunk("acTL", animation), image.subarray(33)]);
    const service = createTacticalRasterService();
    for (const invalid of [animated, Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><image href="http://127.0.0.1/secret"/></svg>'), "https://example.test/image.png", "C:\\private\\image.png"]) {
      await expect(service.validateImage(invalid as Uint8Array, metadata(image, 8, 8))).rejects.toMatchObject({ code: "invalid" });
    }
  });

  it("enforces the stricter server image and pixel budget before decoding", async () => {
    const image = await png(8, 8, () => [1, 2, 3, 255]), rows = chunks(image), header = Buffer.from(rows[0]!.data);
    header.writeUInt32BE(4001, 0); header.writeUInt32BE(4001, 4);
    const oversized = Buffer.concat([image.subarray(0, 8), chunk("IHDR", header), ...rows.slice(1).map(row => chunk(row.type, row.data))]);
    expect(inspectUvttImage(oversized.toString("base64")).width).toBe(4001); // Portable source contract is deliberately larger.
    const service = createTacticalRasterService();
    await expect(service.validateImage(oversized, metadata(oversized, 4001, 4001))).rejects.toMatchObject({ code: "invalid", message: "server raster pixel limit is 16,000,000" });
    await expect(service.validateImage(Buffer.alloc(TACTICAL_RASTER_LIMITS.imageBytes + 1), metadata(image, 8, 8))).rejects.toMatchObject({ code: "invalid" });
  });
});

describe("server-masked PNG pyramids", () => {
  it("removes hidden RGB including alpha-zero RGB, and preserves the explicit full-view distinction", async () => {
    const image = await png(4, 2, x => x === 0 ? [91, 72, 63, 0] : [20, 240, 80, 255]), service = createTacticalRasterService();
    const masked = await rgba((await service.renderTacticalTile(request(image, 4, 2, [rectangle(0, 0, 2, 2)]))).bytes);
    expect(pixelAt(masked.data, 4, 0, 0)).toEqual([0, 0, 0, 0]);
    expect(pixelAt(masked.data, 4, 1, 0)).toEqual([20, 240, 80, 255]);
    expect(pixelAt(masked.data, 4, 2, 0)).toEqual([0, 0, 0, 0]);
    const hidden = await rgba((await service.renderTacticalTile(request(image, 4, 2, []))).bytes);
    expect(hidden.data.every(value => value === 0)).toBe(true);
    const full = await rgba((await service.renderTacticalTile(request(image, 4, 2))).bytes);
    expect(pixelAt(full.data, 4, 0, 0)).toEqual([0, 0, 0, 0]);
    expect(pixelAt(full.data, 4, 3, 0)).toEqual([20, 240, 80, 255]);
  });

  it("secret pixel twins produce byte-identical visible tiles at EVERY level, without boundary bleed", async () => {
    const width = 513, height = 257, service = createTacticalRasterService();
    const a = await png(width, height, (x, y) => x < 255 ? [200, 0, 0, 255] : [0, 255, y % 255, 255]);
    const b = await png(width, height, (x, y) => x < 255 ? [200, 0, 0, 255] : [x % 255, y % 255, 255, 255]);
    const regions = [rectangle(0, 0, 255, height)];
    for (let level = 0; level <= 2; level++) {
      const factor = 2 ** level, columns = Math.ceil(Math.ceil(width / factor) / 256), rows = Math.ceil(Math.ceil(height / factor) / 256);
      for (let y = 0; y < rows; y++) for (let x = 0; x < columns; x++) {
        const tileA = await service.renderTacticalTile({ ...request(a, width, height, regions), level, x, y });
        const tileB = await service.renderTacticalTile({ ...request(b, width, height, regions), level, x, y });
        expect(tileB.bytes.equals(tileA.bytes)).toBe(true);
        const raw = await rgba(tileA.bytes);
        for (let py = 0; py < tileA.height; py++) for (let px = 0; px < tileA.width; px++) {
          const sourceEnd = Math.min(width, ((x * 256 + px) + 1) * factor);
          expect(pixelAt(raw.data, tileA.width, px, py)).toEqual(sourceEnd <= 255 ? [200, 0, 0, 255] : [0, 0, 0, 0]);
        }
      }
    }
  }, 20_000);

  it("uses the whole coarse footprint, including odd image edges, with alpha-weighted box color", async () => {
    const image = await png(5, 3, (x, y) => x === 4 ? [11, 22, 33, 255] : y === 0 ? [200, 0, 0, 255] : [0, 0, 200, 0]), service = createTacticalRasterService();
    const base = { ...request(image, 5, 3), tileSize: 2, level: 1 };
    const left = await service.renderTacticalTile(base), right = await service.renderTacticalTile({ ...base, x: 1 });
    expect([left.width, left.height, right.width, right.height]).toEqual([2, 2, 1, 2]);
    expect(pixelAt((await rgba(left.bytes)).data, 2, 0, 0)).toEqual([200, 0, 0, 128]);
    expect(pixelAt((await rgba(right.bytes)).data, 1, 0, 1)).toEqual([11, 22, 33, 255]);
    const masked = await service.renderTacticalTile({ ...base, regions: [rectangle(0, 0, 1, 3)] });
    expect((await rgba(masked.bytes)).data.every(value => value === 0)).toBe(true);
  });

  it("rasterizes concave polygons and overlapping unions in native image coordinates", async () => {
    const image = await png(6, 6, () => [1, 2, 3, 255]), service = createTacticalRasterService();
    const regions = [[[0, 0], [4, 0], [4, 2], [2, 2], [2, 4], [0, 4]], rectangle(3, 3, 6, 6)] as const;
    const tile = await service.renderTacticalTile(request(image, 6, 6, regions)), raw = await rgba(tile.bytes);
    expect(pixelAt(raw.data, 6, 3, 0)).toEqual([1, 2, 3, 255]);
    expect(pixelAt(raw.data, 6, 0, 3)).toEqual([1, 2, 3, 255]);
    expect(pixelAt(raw.data, 6, 2, 2)).toEqual([0, 0, 0, 0]);
    expect(pixelAt(raw.data, 6, 5, 5)).toEqual([1, 2, 3, 255]);
    expect((await service.renderTacticalTile(request(image, 6, 6, [...regions].reverse()))).bytes.equals(tile.bytes)).toBe(true);
    expect(service.stats().cacheHits).toBe(1);
  });

  it("defines exact half-pixel boundaries as left inclusive and right exclusive", async () => {
    const image = await png(4, 2, () => [100, 20, 30, 255]), service = createTacticalRasterService();
    const tile = await service.renderTacticalTile(request(image, 4, 2, [rectangle(0.5, 0, 2.5, 2)])), raw = await rgba(tile.bytes);
    expect(pixelAt(raw.data, 4, 0, 0)).toEqual([100, 20, 30, 255]);
    expect(pixelAt(raw.data, 4, 1, 0)).toEqual([100, 20, 30, 255]);
    expect(pixelAt(raw.data, 4, 2, 0)).toEqual([0, 0, 0, 0]);
  });

  it("strips EXIF, ICC, XMP, orientation and text instead of forwarding source metadata", async () => {
    const plain = await png(8, 8, () => [10, 20, 30, 255]);
    const encoded = await sharp(plain).withMetadata({ orientation: 6 }).withExif({ IFD0: { Artist: "private GM metadata" } }).withXmp('<x:xmpmeta xmlns:x="adobe:ns:meta/">private GM metadata</x:xmpmeta>').png().toBuffer();
    const image = Buffer.concat([encoded.subarray(0, 33), chunk("tEXt", Buffer.from("Comment\0private GM metadata")), encoded.subarray(33)]);
    expect((await sharp(image).metadata()).exif).toBeDefined();
    const service = createTacticalRasterService(); await service.validateImage(image, metadata(image, 8, 8));
    const tile = await service.renderTacticalTile(request(image, 8, 8)), result = await sharp(tile.bytes).metadata();
    for (const key of ["exif", "icc", "xmp", "iptc", "comments", "orientation"]) expect(result[key as keyof typeof result]).toBeUndefined();
    expect(tile.bytes.includes(Buffer.from("private GM"))).toBe(false);
    expect(chunks(tile.bytes).map(row => row.type)).toEqual(["IHDR", "pHYs", "IDAT", "IEND"]);
  });

  it("renders absent backgrounds as transparent bounded tiles", async () => {
    const tile = await createTacticalRasterService().renderTacticalTile({ ...request(null, 513, 257), x: 2, y: 1 });
    expect([tile.width, tile.height]).toEqual([1, 1]);
    expect([...((await rgba(tile.bytes)).data)]).toEqual([0, 0, 0, 0]);
  });

  it("rejects malformed geometry, unbounded polygon work and invalid tile coordinates", async () => {
    const service = createTacticalRasterService(), base = request(null, 513, 257);
    for (const invalid of [{ level: 3 }, { level: -1 }, { x: 3 }, { y: 2 }, { tileSize: 0 }, { tileSize: 1025 }, { level: 0.5 }, { documentSize: [Infinity, 20] }, { regions: undefined }, { regions: [[[0, 0], [1, 1], [NaN, 2]]] }, { regions: [[[0, 0], [1, 1]]] }]) {
      await expect(service.renderTacticalTile({ ...base, ...invalid } as TacticalTileRequest)).rejects.toMatchObject({ code: "invalid" });
    }
    const tall = Array.from({ length: 100 }, () => rectangle(0, 0, 1, 32768));
    await expect(service.renderTacticalTile({ ...request(null, 1, 32768, [...tall, ...tall]), level: 0 })).rejects.toMatchObject({ code: "invalid", message: "polygon rasterization work budget exceeded" });
  });
});

describe("bounded raster scheduling and private derived cache", () => {
  it("bounds cache memory, separates authorization policies and protects cached pixels from caller mutation", async () => {
    const image = await png(8, 8, () => [10, 20, 30, 255]), service = createTacticalRasterService({ maxCacheBytes: 512, maxCacheEntries: 1 });
    const full = await service.renderTacticalTile(request(image, 8, 8));
    expect(service.stats().cacheEntries).toBe(1);
    const fullBytes = Buffer.from(full.bytes); full.bytes.fill(0);
    expect((await service.renderTacticalTile(request(image, 8, 8))).bytes.equals(fullBytes)).toBe(true);
    expect(service.stats().cacheHits).toBe(1);
    await service.renderTacticalTile(request(image, 8, 8, []));
    expect(service.stats().cacheEntries).toBe(1);
    expect(service.stats().cacheBytes).toBeLessThanOrEqual(512);
    expect((await service.renderTacticalTile(request(image, 8, 8))).bytes.equals(fullBytes)).toBe(true);
    expect(service.stats().cacheMisses).toBe(3);
    service.clearCache(); expect(service.stats().cacheBytes).toBe(0);
  });

  it("rejects excess work immediately, snapshots admitted bytes/polygons, and drains its bounded queue", async () => {
    const image = await png(256, 256, () => [10, 20, 30, 255]), service = createTacticalRasterService({ maxConcurrent: 1, maxQueue: 1 });
    const first = service.renderTacticalTile(request(image, 256, 256));
    const mutableImage = Buffer.from(image), polygon: [number, number][] = [[0, 0], [128, 0], [128, 256], [0, 256]];
    const second = service.renderTacticalTile(request(mutableImage, 256, 256, [polygon]));
    mutableImage.fill(0); polygon[1]![0] = 256; polygon[2]![0] = 256;
    expect(service.stats()).toMatchObject({ active: 1, queued: 1 });
    await expect(service.renderTacticalTile(request(image, 256, 256))).rejects.toMatchObject({ code: "busy" });
    await first; const result = await rgba((await second).bytes);
    expect(pixelAt(result.data, 256, 200, 0)).toEqual([0, 0, 0, 0]);
    expect(pixelAt(result.data, 256, 100, 0)).toEqual([10, 20, 30, 255]);
    expect(service.stats()).toMatchObject({ active: 0, queued: 0 });
  });

  it("expires queued work without retaining it or adding native workers", async () => {
    const image = await realImage(), service = createTacticalRasterService({ maxConcurrent: 1, maxQueue: 1, queueWaitMs: 1 });
    const first = service.renderTacticalTile(request(image, 2560, 2560));
    const queued = service.renderTacticalTile(request(image, 2560, 2560, []));
    await expect(queued).rejects.toMatchObject({ code: "busy", message: "tactical raster queue wait exceeded" });
    expect(service.stats()).toMatchObject({ active: 1, queued: 0 });
    await first;
    expect(service.stats().active).toBe(0);
  }, 20_000);

  it("times out work and eventually releases native capacity without caching an unfinished mask", async () => {
    const image = await realImage(), service = createTacticalRasterService({ maxConcurrent: 1, maxQueue: 0, jobTimeoutMs: 1 });
    await expect(service.renderTacticalTile(request(image, 2560, 2560))).rejects.toMatchObject({ code: "timeout" });
    for (let attempts = 0; service.stats().active !== 0 && attempts < 1000; attempts++) await immediate();
    expect(service.stats()).toMatchObject({ active: 0, queued: 0, cacheEntries: 0, cacheBytes: 0 });
  }, 20_000);

  it("does not release capacity when the caller expires while a decoder promise is still pending", async () => {
    const image = await png(8, 8, () => [1, 2, 3, 255]), service = createTacticalRasterService({ maxConcurrent: 1, maxQueue: 0, jobTimeoutMs: 1000 });
    let release!: () => void, entered!: () => void;
    const held = new Promise<void>(resolve => { release = resolve; }), decoding = new Promise<void>(resolve => { entered = resolve; });
    // Hold the completion of a REAL sharp decode to deterministically exercise native lag.
    // Pixel behavior remains tested above without instrumentation.
    const original = sharp.prototype.toBuffer;
    const spy = vi.spyOn(sharp.prototype, "toBuffer").mockImplementationOnce(function(this: Sharp, ...args: unknown[]) {
      const result: unknown = Reflect.apply(original, this, args);
      entered();
      return Promise.resolve(result).then(async decoded => { await held; return decoded; });
    } as typeof original);
    try {
      const running = service.renderTacticalTile(request(image, 8, 8));
      const rejected = expect(running).rejects.toMatchObject({ code: "timeout" });
      await decoding; await rejected;
      expect(service.stats()).toMatchObject({ active: 1, queued: 0 });
      await expect(service.renderTacticalTile(request(image, 8, 8))).rejects.toMatchObject({ code: "busy" });
      release();
      for (let attempts = 0; service.stats().active !== 0 && attempts < 1000; attempts++) await immediate();
      expect(service.stats()).toMatchObject({ active: 0, cacheEntries: 0 });
    } finally { release(); spy.mockRestore(); }
  });
});
