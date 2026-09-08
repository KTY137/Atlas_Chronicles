// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { canonicalJson, textHash, type CanonicalValue } from "@chronicle/core";
import { sha256Hex } from "@chronicle/core";
import { KARTEN_SETTINGS, TACTICAL_MAP_LIMITS, parseBoundedMapJson, parseTacticalMapDocument, serializeTacticalMapDocument, type KartenSetting, type TacticalImageRef, type TacticalMapDocumentV1, type TacticalPoint } from "@chronicle/szene";
import { parseTacticalCartography, type TacticalCartographyV1 } from "@chronicle/szene";

export const UVTT_ADAPTER_VERSION = 1 as const;
export interface UvttProvenance {
  readonly name: string; readonly creator: string; readonly sourceUrl: string | null; readonly license: string;
  readonly licenseUrl: string | null; readonly retrievedAt: string | null; readonly generator: string | null; readonly generatorVersion: string | null;
  /** Generated maps retain their normalized setting here; older sources default to fantasy. */
  readonly setting?: KartenSetting;
}
export interface FidelityIssue {
  readonly code: "source-only" | "defaulted" | "ambiguous-portal" | "no-region-bindings" | "image-missing" | "unsupported-export" | "source-rebased";
  readonly path: string; readonly severity: "info" | "warning" | "loss"; readonly message: string;
}
export interface FidelityReport {
  readonly version: 1; readonly direction: "import" | "export";
  readonly sourceRetained: boolean; readonly exactSource: boolean; readonly nativeRoundTrip: boolean;
  readonly counts: { readonly walls: number; readonly objectBlockers: number; readonly portals: number; readonly lights: number };
  readonly issues: readonly FidelityIssue[];
}
export interface UvttImage extends TacticalImageRef { readonly base64: string; readonly bytes: number }
export interface UvttImport {
  readonly adapterVersion: 1; readonly document: TacticalMapDocumentV1; readonly image: UvttImage | null;
  readonly source: { readonly format: "uvtt"; readonly formatVersion: 0.2 | 0.3; readonly json: string; readonly sha256: string; readonly bytes: number; readonly provenance: UvttProvenance };
  readonly fidelity: FidelityReport;
}
export interface UvttExport { readonly json: string; readonly fidelity: FidelityReport }
export class UvttValidationError extends Error {
  override readonly name = "UvttValidationError";
  constructor(readonly path: string, message: string) { super(`${path}: ${message}`); }
}
type Row = Record<string, unknown>;
function fail(path: string, message: string): never { throw new UvttValidationError(path, message); }
const record = (value: unknown, path: string): Row => { if (!value || typeof value !== "object" || Array.isArray(value)) fail(path, "object required"); return value as Row; };
const list = (value: unknown, path: string, max: number): unknown[] => { if (!Array.isArray(value) || value.length > max) fail(path, `array with at most ${max} items required`); return value as unknown[]; };
const number = (value: unknown, path: string, min: number = -TACTICAL_MAP_LIMITS.coordinate, max: number = TACTICAL_MAP_LIMITS.coordinate): number => { if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) fail(path, "finite bounded number required"); return value as number; };
const boolean = (value: unknown, path: string): boolean => { if (typeof value !== "boolean") fail(path, "boolean required"); return value as boolean; };
const color = (value: unknown, path: string): string => { if (typeof value !== "string" || !/^[a-fA-F0-9]{8}$/.test(value)) fail(path, "eight ARGB hexadecimal digits required"); return value as string; };
const freeze = <T,>(value: T): T => { if (value && typeof value === "object") { Object.values(value).forEach(freeze); Object.freeze(value); } return value; };
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const sameJson = (a: unknown, b: unknown): boolean => canonicalJson(a as CanonicalValue) === canonicalJson(b as CanonicalValue);
const counts = (doc: TacticalMapDocumentV1): FidelityReport["counts"] => ({ walls: doc.walls.filter(w => w.kind === "wall").length, objectBlockers: doc.walls.filter(w => w.kind === "object").length, portals: doc.portals.length, lights: doc.lights.length });
const identity = (sourceHash: string, path: string): string => `uvtt-${textHash(`uvtt-v1\n${sourceHash}\n${path}`).slice(0, 32)}`;
function provenance(input: UvttProvenance): UvttProvenance {
  const row = record(parseBoundedMapJson(input, 16_384), "provenance"), keys = ["name", "creator", "sourceUrl", "license", "licenseUrl", "retrievedAt", "generator", "generatorVersion"];
  if (Object.keys(row).some(key => !keys.includes(key) && key !== "setting") || keys.some(key => !Object.hasOwn(row, key))) fail("provenance", "closed provenance record required");
  if (Object.hasOwn(row, "setting") && !KARTEN_SETTINGS.some(setting => setting === row.setting)) fail("provenance.setting", "known map setting required");
  for (const key of keys) { const value = row[key]; if (value === null && !["name", "creator", "license"].includes(key)) continue; if (typeof value !== "string" || !value.trim() || value.length > 2048 || /[\u0000-\u001f\u007f]/.test(value)) fail(`provenance.${key}`, "bounded nonempty text or explicit null required"); }
  for (const key of ["sourceUrl", "licenseUrl"]) if (row[key] !== null) { try { const url = new URL(row[key] as string); if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) fail(`provenance.${key}`, "HTTP(S) attribution URL without credentials required"); } catch { fail(`provenance.${key}`, "valid attribution URL required"); } }
  if (row.retrievedAt !== null && (typeof row.retrievedAt !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(row.retrievedAt) || !Number.isFinite(Date.parse(row.retrievedAt)))) fail("provenance.retrievedAt", "UTC timestamp required");
  return freeze(row as unknown as UvttProvenance);
}

const crcTable = Uint32Array.from({ length: 256 }, (_, value) => { let crc = value; for (let bit = 0; bit < 8; bit++) crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1; return crc >>> 0; });
function crc32(data: Uint8Array): number { let crc = 0xffffffff; for (const value of data) crc = crcTable[(crc ^ value) & 255]! ^ (crc >>> 8); return (crc ^ 0xffffffff) >>> 0; }
/** Container inspection only, not a pixel decoder. Servers must decode/re-encode in their
 * bounded image pipeline before delivery; nothing in this adapter delivers a player texture. */
export function inspectUvttImage(base64: string): UvttImage {
  if (typeof base64 !== "string" || !base64.length || base64.length % 4 !== 0 || base64.length > Math.ceil(TACTICAL_MAP_LIMITS.imageBytes / 3) * 4 || !/^[A-Za-z0-9+/]*={0,2}$/.test(base64)) fail("image", "bounded canonical base64 required");
  const bytes = Buffer.from(base64, "base64"); if (bytes.length > TACTICAL_MAP_LIMITS.imageBytes || bytes.toString("base64") !== base64) fail("image", "noncanonical or oversized base64");
  let width = 0, height = 0, mimeType: UvttImage["mimeType"];
  if (bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    mimeType = "image/png"; let offset = 8, chunks = 0, data = false, ended = false;
    while (offset < bytes.length) {
      if (++chunks > 8192 || offset + 12 > bytes.length) fail("image", "invalid PNG chunk table"); const length = bytes.readUInt32BE(offset), type = bytes.toString("ascii", offset + 4, offset + 8), end = offset + 12 + length;
      if (end > bytes.length || !/^[A-Za-z]{4}$/.test(type) || crc32(bytes.subarray(offset + 4, end - 4)) !== bytes.readUInt32BE(end - 4)) fail("image", "invalid PNG chunk or checksum");
      if (chunks === 1) { if (type !== "IHDR" || length !== 13) fail("image", "PNG IHDR required"); width = bytes.readUInt32BE(offset + 8); height = bytes.readUInt32BE(offset + 12); }
      else if (type === "IHDR") fail("image", "duplicate PNG header");
      if (type === "acTL" || type === "fcTL" || type === "fdAT") fail("image", "animated backgrounds are unsupported");
      if (type === "IDAT") data = true;
      if (type === "IEND") { if (length !== 0 || !data || end !== bytes.length) fail("image", "invalid PNG terminator"); ended = true; }
      offset = end;
    }
    if (!ended) fail("image", "PNG terminator missing");
  } else if (bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP") {
    mimeType = "image/webp"; if (bytes.length < 20 || bytes.readUInt32LE(4) + 8 !== bytes.length) fail("image", "invalid WebP container size");
    let offset = 12, frames = 0, chunks = 0, extended: [number, number] | null = null;
    while (offset < bytes.length) {
      if (++chunks > 1024 || offset + 8 > bytes.length) fail("image", "invalid WebP chunks"); const type = bytes.toString("ascii", offset, offset + 4), length = bytes.readUInt32LE(offset + 4), start = offset + 8, end = start + length;
      if (end + (length & 1) > bytes.length) fail("image", "truncated WebP chunk");
      if (type === "ANIM" || type === "ANMF") fail("image", "animated backgrounds are unsupported");
      if (type === "VP8X") { if (length !== 10 || extended || (bytes[start]! & 2)) fail("image", "unsupported WebP extended header"); extended = [bytes.readUIntLE(start + 4, 3) + 1, bytes.readUIntLE(start + 7, 3) + 1]; }
      if (type === "VP8 ") { if (++frames > 1 || length < 10 || (bytes[start]! & 1) || bytes.toString("hex", start + 3, start + 6) !== "9d012a") fail("image", "invalid WebP VP8 frame"); width = bytes.readUInt16LE(start + 6) & 0x3fff; height = bytes.readUInt16LE(start + 8) & 0x3fff; }
      if (type === "VP8L") { if (++frames > 1 || length < 5 || bytes[start] !== 0x2f) fail("image", "invalid WebP lossless frame"); const bits = bytes.readUInt32LE(start + 1); if (bits >>> 29) fail("image", "unsupported WebP lossless version"); width = (bits & 0x3fff) + 1; height = ((bits >>> 14) & 0x3fff) + 1; }
      offset = end + (length & 1);
    }
    if (!frames || extended && (extended[0] !== width || extended[1] !== height)) fail("image", "WebP dimension mismatch");
  } else return fail("image", "only static PNG and WebP containers are supported");
  if (!width || !height || width > TACTICAL_MAP_LIMITS.dimension || height > TACTICAL_MAP_LIMITS.dimension || width * height > TACTICAL_MAP_LIMITS.pixels) fail("image", "pixel budget exceeded");
  return freeze({ base64, bytes: bytes.length, sha256: sha256Hex(bytes), mimeType, width, height });
}

export function importUvtt(json: string, attribution: UvttProvenance): UvttImport {
  if (typeof json !== "string") fail("source", "original JSON text required");
  const source = record(parseBoundedMapJson(json, TACTICAL_MAP_LIMITS.sourceBytes), "uvtt"), originProvenance = provenance(attribution), hash = textHash(json), issues: FidelityIssue[] = [];
  const issue = (code: FidelityIssue["code"], path: string, message: string, severity: FidelityIssue["severity"] = "info") => issues.push({ code, path, severity, message });
  const unknown = (row: Row, known: readonly string[], path: string) => { for (const key of Object.keys(row)) if (!known.includes(key)) issue("source-only", `${path}.${key}`, "Property retained in the original source; not interpreted as Chronicle behavior."); };
  unknown(source, ["format", "resolution", "line_of_sight", "objects_line_of_sight", "portals", "lights", "environment", "image"], "uvtt");
  if (source.format !== 0.2 && source.format !== 0.3) fail("format", "only UVTT 0.2 and 0.3 are supported; explicit adapter migration required");
  const resolution = record(source.resolution, "resolution"); unknown(resolution, ["map_origin", "map_size", "pixels_per_grid"], "resolution");
  const rawPoint = (value: unknown, path: string): TacticalPoint => { const p = record(value, path); unknown(p, ["x", "y"], path); return [number(p.x, `${path}.x`), number(p.y, `${path}.y`)]; };
  const origin = rawPoint(resolution.map_origin, "resolution.map_origin"), size = rawPoint(resolution.map_size, "resolution.map_size");
  const ppg = number(resolution.pixels_per_grid, "resolution.pixels_per_grid", 1, 16384); if (!Number.isSafeInteger(ppg)) fail("resolution.pixels_per_grid", "integer required");
  const declaredWidth = size[0] * ppg, declaredHeight = size[1] * ppg;
  const image = source.image === undefined || source.image === "" ? null : inspectUvttImage(source.image as string);
  // Cell counts such as 2560/77 cannot be represented exactly as binary floats.
  // Only reconcile arithmetic roundoff; the image's integer pixel metadata is authoritative.
  const samePixels = (declared: number, actual: number) => Math.abs(declared - actual) <= 8 * Number.EPSILON * Math.max(1, Math.abs(declared), actual);
  if (image && (!samePixels(declaredWidth, image.width) || !samePixels(declaredHeight, image.height))) fail("resolution", "embedded image dimensions do not match map_size × pixels_per_grid");
  const width = image?.width ?? declaredWidth, height = image?.height ?? declaredHeight;
  if (width <= 0 || height <= 0 || width > TACTICAL_MAP_LIMITS.dimension || height > TACTICAL_MAP_LIMITS.dimension || width * height > TACTICAL_MAP_LIMITS.pixels) fail("resolution.map_size", "pixel budget exceeded");
  let points = 0;
  const position = (value: unknown, path: string): TacticalPoint => { if (++points > TACTICAL_MAP_LIMITS.points) fail(path, "point budget exceeded"); const [x, y] = rawPoint(value, path); return [number((x - origin[0]) * ppg, `${path}.localX`), number((y - origin[1]) * ppg, `${path}.localY`)]; };
  const array = (key: string, max: number) => { if (source[key] === undefined) { issue("defaulted", key, "Missing optional collection interpreted as empty."); return []; } return list(source[key], key, max); };
  const walls: TacticalMapDocumentV1["walls"][number][] = [];
  for (const key of ["line_of_sight", "objects_line_of_sight"] as const) for (const [i, raw] of array(key, TACTICAL_MAP_LIMITS.walls).entries()) {
    const path = `${key}[${i}]`, line = list(raw, path, TACTICAL_MAP_LIMITS.points); if (line.length < 2) fail(path, "wall polyline requires at least two points");
    walls.push({ id: identity(hash, path), kind: key === "line_of_sight" ? "wall" : "object", points: line.map((p, j) => position(p, `${path}[${j}]`)), elevation: 0 });
  }
  const portals = array("portals", TACTICAL_MAP_LIMITS.portals).map((raw, i) => {
    const path = `portals[${i}]`, row = record(raw, path); unknown(row, ["position", "bounds", "rotation", "closed", "freestanding"], path);
    const bounds = list(row.bounds, `${path}.bounds`, 2); if (bounds.length !== 2) fail(`${path}.bounds`, "two endpoints required");
    issue("ambiguous-portal", path, "Original closed/freestanding flags are preserved. UVTT does not reliably distinguish an open door from a window.");
    if (row.freestanding === undefined) issue("defaulted", `${path}.freestanding`, "Absent freestanding flag interpreted as false.");
    return { id: identity(hash, path), position: position(row.position, `${path}.position`), bounds: [position(bounds[0], `${path}.bounds[0]`), position(bounds[1], `${path}.bounds[1]`)] as const, rotationRadians: number(row.rotation, `${path}.rotation`), closed: boolean(row.closed, `${path}.closed`), freestanding: row.freestanding === undefined ? false : boolean(row.freestanding, `${path}.freestanding`), elevation: 0 };
  });
  const lights = array("lights", TACTICAL_MAP_LIMITS.lights).map((raw, i) => {
    const path = `lights[${i}]`, row = record(raw, path); unknown(row, ["position", "range", "intensity", "color", "shadows"], path);
    return { id: identity(hash, path), position: position(row.position, `${path}.position`), range: number(number(row.range, `${path}.range`, 0) * ppg, `${path}.rangePixels`, 0), intensity: number(row.intensity, `${path}.intensity`, 0, 1_000_000), colorArgb: color(row.color, `${path}.color`), shadows: boolean(row.shadows, `${path}.shadows`), elevation: 0 };
  });
  const environment = source.environment === undefined ? {} : record(source.environment, "environment"); unknown(environment, ["baked_lighting", "ambient_light"], "environment");
  if (environment.baked_lighting === undefined) issue("defaulted", "environment.baked_lighting", "Absent baked-lighting flag interpreted as false.");
  if (environment.ambient_light === undefined) issue("defaulted", "environment.ambient_light", "Absent ambient light interpreted as opaque white.");
  if (!image) issue("image-missing", "image", "No embedded image; geometry remains usable as an outline.", "warning");
  issue("no-region-bindings", "regions", "UVTT provides no Chronicle region passages, article bindings, access grants, or tokens. None are generated.");
  const gridOrigin = origin.map(n => ((-n * ppg) % ppg + ppg) % ppg);
  const document = parseTacticalMapDocument({ schemaVersion: 1, kind: "tactical-map", coordinates: "image-pixels", frame: { ursprung: origin, einheitenProPixel: 1 / ppg, ordnung: "xy", hoch: "unten" }, geometry: { v: 3, size: [width, height], stamps: [], regions: [], places: [] }, grid: { kind: "square", size: ppg, origin: gridOrigin }, elevation: 0, geometryElevation: [], walls, portals, lights,
    environment: { bakedLighting: environment.baked_lighting === undefined ? false : boolean(environment.baked_lighting, "environment.baked_lighting"), ambientLightArgb: environment.ambient_light === undefined ? "ffffffff" : color(environment.ambient_light, "environment.ambient_light") }, background: image ? { sha256: image.sha256, mimeType: image.mimeType, width: image.width, height: image.height } : null });
  return freeze({ adapterVersion: 1, document, image, source: { format: "uvtt", formatVersion: source.format, json, sha256: hash, bytes: Buffer.byteLength(json, "utf8"), provenance: originProvenance }, fidelity: { version: 1, direction: "import", sourceRetained: true, exactSource: true, nativeRoundTrip: true, counts: counts(document), issues } });
}

function exportLosses(doc: TacticalMapDocumentV1): FidelityIssue[] {
  const issues: FidelityIssue[] = [], loss = (path: string, message: string) => issues.push({ code: "unsupported-export", path, severity: "loss", message });
  const grid = doc.grid;
  if (grid.kind !== "square") loss("grid", `${grid.kind} grid is not represented by legacy UVTT; the export declares only pixel resolution.`);
  else {
    if (grid.origin.some((n, i) => n !== ((-doc.frame.ursprung[i]! * grid.size) % grid.size + grid.size) % grid.size)) loss("grid.origin", "Independent grid offset differs from UVTT crop alignment and cannot be retained with this source frame.");
    if (doc.frame.einheitenProPixel !== 1 / grid.size) loss("frame.einheitenProPixel", "Independent source-unit scale differs from UVTT grid resolution; exported coordinates use the declared grid size.");
  }
  if (doc.frame.ordnung !== "xy" || doc.frame.hoch !== "unten") loss("frame", "UVTT uses top-left xy coordinates; the source frame is rebased for export.");
  if (doc.elevation !== 0 || doc.geometryElevation.length || [...doc.walls, ...doc.portals, ...doc.lights].some(item => item.elevation !== 0)) loss("elevation", "Scalar elevations are not represented by legacy UVTT.");
  for (const field of ["stamps", "regions", "places"] as const) if (doc.geometry[field].length) loss(`geometry.${field}`, `Chronicle ${field} have no legacy UVTT representation; retain the native document.`);
  if (doc.geometry.base) loss("geometry.base", "The derived tile pyramid reference is not exported; the embedded original image is used.");
  if (doc.walls.length || doc.portals.length || doc.lights.length) loss("geometry.identities", "Legacy UVTT has no native geometry identifiers. Reimporting edited output derives new identities; retain the native document and original source for historical bindings.");
  return issues;
}
function writeUvtt(doc: TacticalMapDocumentV1, image: UvttImage | null, source?: { raw: Row; imported: UvttImport }): UvttExport {
  if (doc.background) {
    if (!image) fail("export.image", "the referenced original image bytes are required"); const actual = inspectUvttImage(image.base64);
    if (!sameJson({ sha256: actual.sha256, mimeType: actual.mimeType, width: actual.width, height: actual.height }, doc.background)) fail("export.image", "image bytes do not match document background");
    image = actual;
  } else image = null;
  const issues = exportLosses(doc), out: Row = source ? clone(source.raw) : {};
  const ppg = doc.grid.kind === "square" ? doc.grid.size : 1 / doc.frame.einheitenProPixel;
  if (!Number.isSafeInteger(ppg) || ppg < 1 || ppg > 16384) fail("export.resolution", "legacy UVTT requires integer pixels_per_grid in 1..16384");
  const compatibleFrame = doc.frame.ordnung === "xy" && doc.frame.hoch === "unten", origin = compatibleFrame ? doc.frame.ursprung : [0, 0];
  const old = source?.imported.document, sameFrame = !!old && old.grid.kind === "square" && old.grid.size === ppg && sameJson(old.frame, doc.frame);
  const point = (p: TacticalPoint, previous?: unknown, previousPoint?: TacticalPoint): Row => {
    // Unchanged positions retain exact upstream numbers and extra coordinate metadata.
    if (sameFrame && previous && previousPoint && canonicalJson(p) === canonicalJson(previousPoint)) return clone(record(previous, "source point"));
    const result = previous ? clone(record(previous, "source point")) : {}; result.x = number(p[0] / ppg + origin[0]!, "export.x"); result.y = number(p[1] / ppg + origin[1]!, "export.y"); return result;
  };
  const pointArray = (current: readonly TacticalPoint[], previous: readonly TacticalPoint[] | undefined, raw: readonly unknown[] | undefined, path: string): Row[] => {
    if (!previous || !raw) return current.map(p => point(p));
    // Vertices have no native IDs. Array position is safe only for an unchanged sequence.
    // Otherwise retain attributes only when a coordinate occurs once in both sequences.
    const unchanged = current.length === previous.length && current.every((p, i) => p[0] === previous[i]![0] && p[1] === previous[i]![1]);
    const priorIndices = new Map<string, number | null>(), currentCounts = new Map<string, number>(), retained = new Set<number>();
    previous.forEach((p, i) => { const key = canonicalJson(p); priorIndices.set(key, priorIndices.has(key) ? null : i); });
    current.forEach(p => { const key = canonicalJson(p); currentCounts.set(key, (currentCounts.get(key) ?? 0) + 1); });
    const result = current.map((p, i) => {
      const key = canonicalJson(p), index = unchanged ? i : currentCounts.get(key) === 1 ? priorIndices.get(key) : undefined;
      if (index === undefined || index === null) return point(p);
      retained.add(index); return point(p, raw[index], previous[index]);
    });
    const unmatched = raw.filter((row, i) => !retained.has(i) && Object.keys(record(row, `${path}[${i}]`)).some(key => key !== "x" && key !== "y")).length;
    if (unmatched) issues.push({ code: "source-only", path, severity: "loss", message: `${unmatched} source point(s) have unknown properties without an unambiguous surviving coordinate. Those properties remain only in the original source; they are not reassigned by array index.` });
    return result;
  };
  out.format = source?.imported.source.formatVersion ?? 0.3;
  const resolution = source ? clone(record(source.raw.resolution, "source.resolution")) : {};
  resolution.map_origin = { ...(source ? record(resolution.map_origin, "source.origin") : {}), x: origin[0], y: origin[1] };
  resolution.map_size = { ...(source ? record(resolution.map_size, "source.size") : {}), x: doc.geometry.size[0] / ppg, y: doc.geometry.size[1] / ppg }; resolution.pixels_per_grid = ppg; out.resolution = resolution;
  const oldWallSources = new Map<string, { points: readonly TacticalPoint[]; raw: unknown[] | undefined; path: string }>();
  for (const kind of ["wall", "object"] as const) {
    const key = kind === "wall" ? "line_of_sight" : "objects_line_of_sight", raw = source && Array.isArray(source.raw[key]) ? source.raw[key] as unknown[][] : [];
    old?.walls.filter(w => w.kind === kind).forEach((wall, i) => oldWallSources.set(wall.id, { points: wall.points, raw: raw[i], path: `${key}[${i}]` }));
  }
  for (const kind of ["wall", "object"] as const) {
    const key = kind === "wall" ? "line_of_sight" : "objects_line_of_sight";
    out[key] = doc.walls.filter(w => w.kind === kind).map((wall, i) => { const previous = oldWallSources.get(wall.id); return pointArray(wall.points, previous?.points, previous?.raw, previous?.path ?? `${key}[${i}]`); });
  }
  const oldPortals = source && Array.isArray(source.raw.portals) ? source.raw.portals as Row[] : [];
  const oldPortalIndices = new Map(old?.portals.map((portal, index) => [portal.id, index]));
  out.portals = doc.portals.map(portal => { const index = oldPortalIndices.get(portal.id) ?? -1, previous = old?.portals[index], raw = oldPortals[index], result = raw ? clone(raw) : {};
    result.position = point(portal.position, raw?.position, previous?.position); result.bounds = pointArray(portal.bounds, previous?.bounds, raw?.bounds as unknown[] | undefined, `portals[${index}].bounds`); result.rotation = portal.rotationRadians; result.closed = portal.closed; result.freestanding = portal.freestanding; return result;
  });
  const oldLights = source && Array.isArray(source.raw.lights) ? source.raw.lights as Row[] : [];
  const oldLightIndices = new Map(old?.lights.map((light, index) => [light.id, index]));
  out.lights = doc.lights.map(light => { const index = oldLightIndices.get(light.id) ?? -1, previous = old?.lights[index], raw = oldLights[index], result = raw ? clone(raw) : {};
    result.position = point(light.position, raw?.position, previous?.position); result.range = sameFrame && previous?.range === light.range ? raw?.range : number(light.range / ppg, "export.light.range", 0); result.intensity = light.intensity; result.color = light.colorArgb; result.shadows = light.shadows; return result;
  });
  out.environment = { ...(source?.raw.environment ? clone(record(source.raw.environment, "source.environment")) : {}), baked_lighting: doc.environment.bakedLighting, ambient_light: doc.environment.ambientLightArgb };
  if (image) out.image = image.base64; else delete out.image;
  if (source) {
    issues.push({ code: "source-rebased", path: "source", severity: "info", message: "Edited native fields exported. Unknown source properties are retained on surviving identities; the exact original remains in the native import artifact." });
    const currentIds = new Set([...doc.walls, ...doc.portals, ...doc.lights].map(item => item.id));
    const removed = [...(old?.walls ?? []), ...(old?.portals ?? []), ...(old?.lights ?? [])].filter(item => !currentIds.has(item.id));
    if (removed.length) issues.push({ code: "source-only", path: "source.removed", severity: "warning", message: "Properties attached to removed geometry remain only in the original source artifact." });
  }
  const json = JSON.stringify(out, null, 2) + "\n"; if (Buffer.byteLength(json, "utf8") > TACTICAL_MAP_LIMITS.sourceBytes) fail("export", "source byte budget exceeded");
  return freeze({ json, fidelity: { version: 1, direction: "export", sourceRetained: !!source, exactSource: false, nativeRoundTrip: !issues.some(i => i.severity === "loss"), counts: counts(doc), issues } });
}

/** An untouched import returns byte-for-byte original JSON, including unknown extensions. */
export function exportUvtt(imported: UvttImport, editedDocument: TacticalMapDocumentV1 = imported.document): UvttExport {
  if (imported.adapterVersion !== 1 || imported.source.format !== "uvtt") fail("source", "unsupported import adapter version");
  const verified = importUvtt(imported.source.json, imported.source.provenance);
  if (verified.source.sha256 !== imported.source.sha256 || verified.source.bytes !== imported.source.bytes || verified.source.formatVersion !== imported.source.formatVersion || serializeTacticalMapDocument(verified.document) !== serializeTacticalMapDocument(imported.document)) fail("source", "import artifact differs from its retained source");
  const document = parseTacticalMapDocument(editedDocument);
  if (serializeTacticalMapDocument(document) === serializeTacticalMapDocument(verified.document)) return freeze({ json: verified.source.json, fidelity: { ...verified.fidelity, direction: "export", exactSource: true } });
  return writeUvtt(document, verified.image, { raw: record(parseBoundedMapJson(verified.source.json, TACTICAL_MAP_LIMITS.sourceBytes), "source"), imported: verified });
}
/** Export a natively authored document. Unsupported semantics are explicit in the report. */
export function exportTacticalUvtt(document: TacticalMapDocumentV1, image: UvttImage | null = null, cartography?: TacticalCartographyV1): UvttExport {
  const doc = parseTacticalMapDocument(document);
  if (cartography) {
    parseTacticalCartography(cartography, doc);
    if (!doc.background || !image) fail("export.cartography", "Kartografie benötigt ein gerendertes, eingebettetes Bild; für verlustfreie Daten bitte nativ exportieren.");
    image = inspectUvttImage(image.base64);
    if (image.width * image.height > 16_000_000) fail("export.cartography", "Der Bildexport ist auf 16 Megapixel begrenzt. Eine kleinere Auflösung ausdrücklich wählen oder nativ exportieren.");
  }
  const result = writeUvtt(doc, image);
  if (!cartography) return result;
  return freeze({ ...result, fidelity: { ...result.fidelity, nativeRoundTrip: false, issues: [...result.fidelity.issues, {
    code: "unsupported-export" as const, path: "cartography", severity: "loss" as const,
    message: "Kartografie ist als Bild enthalten. Geländerollen, Sperren, Herkunft, Gebäudeadressen und lokale Variationen bleiben ausschließlich in der nativen Sicherung erhalten.",
  }] } });
}
