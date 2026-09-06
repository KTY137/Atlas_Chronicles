import type { Rahmen, SceneDoc } from "./model.ts";

/** Versioned data, never an authorization decision or a renderer capability promise. */
export const TACTICAL_MAP_VERSION = 1 as const;
export const TACTICAL_MAP_LIMITS = Object.freeze({
  documentBytes: 32 * 1024 * 1024, sourceBytes: 64 * 1024 * 1024, imageBytes: 48 * 1024 * 1024,
  depth: 48, nodes: 2_000_000, coordinate: 1_000_000_000, dimension: 32768, pixels: 144_000_000,
  stamps: 50_000, regions: 2048, places: 20_000, walls: 20_000, portals: 20_000, lights: 4096, points: 200_000,
});
export type TacticalPoint = readonly [number, number];
export type TacticalGrid =
  /** Square cell pitch, in image pixels. */
  | { readonly kind: "square"; readonly size: number; readonly origin: TacticalPoint }
  /** Hex circumradius (center to vertex), in image pixels; offset selects shifted rows
   * for pointy hexes, shifted columns for flat hexes. Origin is the (0,0) hex center. */
  | { readonly kind: "hex"; readonly size: number; readonly origin: TacticalPoint; readonly orientation: "pointy" | "flat"; readonly offset: "even" | "odd" }
  | { readonly kind: "none" };
export interface TacticalWall {
  readonly id: string; readonly kind: "wall" | "object"; readonly points: readonly TacticalPoint[]; readonly elevation: number;
}
export interface TacticalPortal {
  readonly id: string; readonly position: TacticalPoint; readonly bounds: readonly [TacticalPoint, TacticalPoint]; readonly rotationRadians: number;
  /** Preserve the UVTT flag. It alone does not distinguish a window from an open door. */
  readonly closed: boolean; readonly freestanding: boolean; readonly elevation: number;
}
export interface TacticalLight {
  readonly id: string; readonly position: TacticalPoint; readonly range: number; readonly intensity: number;
  /** Eight hexadecimal digits in alpha/red/green/blue order, without a # prefix. */
  readonly colorArgb: string; readonly shadows: boolean; readonly elevation: number;
}
export interface TacticalImageRef {
  readonly sha256: string; readonly mimeType: "image/png" | "image/webp"; readonly width: number; readonly height: number;
}
export interface TacticalGeometryElevation {
  readonly targetKind: "stamp" | "region" | "place"; readonly targetId: string; readonly elevation: number;
}
export interface TacticalMapDocumentV1 {
  readonly schemaVersion: 1; readonly kind: "tactical-map"; readonly coordinates: "image-pixels";
  /** Geometry is local image pixels. External coordinates = origin + pixels * unitsPerPixel,
   * with the declared axis order/direction. A child map has its own independent frame. */
  readonly frame: Rahmen;
  readonly geometry: SceneDoc;
  readonly grid: TacticalGrid;
  /** Scalar default for geometry that has no per-element elevation; never a scene level. */
  readonly elevation: number;
  /** Individual scalar overrides without changing the published SceneDoc v3 rows. */
  readonly geometryElevation: readonly TacticalGeometryElevation[];
  readonly walls: readonly TacticalWall[]; readonly portals: readonly TacticalPortal[]; readonly lights: readonly TacticalLight[];
  readonly environment: { readonly bakedLighting: boolean; readonly ambientLightArgb: string };
  /** Content address only; this document contains no image bytes or permission-bearing URL. */
  readonly background: TacticalImageRef | null;
}

export class TacticalMapValidationError extends Error {
  override readonly name = "TacticalMapValidationError";
  constructor(readonly path: string, message: string) { super(`${path}: ${message}`); }
}
function fail(path: string, message: string): never { throw new TacticalMapValidationError(path, message); }
const forbiddenKey = (key: string) => key === "__proto__" || key === "constructor" || key === "prototype";
type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

/** Bounded JSON shared with file adapters. Duplicate object keys are rejected before JSON.parse.
 * This is intentionally browser-pure: no Node, DB, network, image decode, or host execution. */
export function parseBoundedMapJson(input: unknown, maxBytes = TACTICAL_MAP_LIMITS.documentBytes): unknown {
  let raw = input;
  if (typeof input === "string") {
    if (new TextEncoder().encode(input).byteLength > maxBytes) fail("json", "byte limit exceeded");
    const text = input.charCodeAt(0) === 0xfeff ? input.slice(1) : input;
    let cursor = 0, nodes = 0;
    const space = () => { while (cursor < text.length && /[\t\r\n ]/.test(text[cursor]!)) cursor++; };
    const stringToken = (): string => {
      const begin = cursor++; let escaped = false;
      while (cursor < text.length) { const c = text[cursor++]!; if (!escaped && c === '"') { try { return JSON.parse(text.slice(begin, cursor)) as string; } catch { return fail("json", "invalid string"); } } if (!escaped && c === "\\") escaped = true; else escaped = false; }
      return fail("json", "unterminated string");
    };
    const value = (depth: number): void => {
      if (++nodes > TACTICAL_MAP_LIMITS.nodes || depth > TACTICAL_MAP_LIMITS.depth) fail("json", "complexity limit exceeded");
      space(); const token = text[cursor];
      if (token === '"') { stringToken(); return; }
      if (token === "{") {
        cursor++; space(); const keys = new Set<string>(); if (text[cursor] === "}") { cursor++; return; }
        for (;;) { space(); if (text[cursor] !== '"') fail("json", "object key expected"); const key = stringToken(); if (keys.has(key)) fail("json", "duplicate object key"); if (forbiddenKey(key)) fail("json", "prototype key forbidden"); keys.add(key); space(); if (text[cursor++] !== ":") fail("json", "colon expected"); value(depth + 1); space(); const separator = text[cursor++]; if (separator === "}") return; if (separator !== ",") fail("json", "object separator expected"); }
      }
      if (token === "[") {
        cursor++; space(); if (text[cursor] === "]") { cursor++; return; }
        for (;;) { value(depth + 1); space(); const separator = text[cursor++]; if (separator === "]") return; if (separator !== ",") fail("json", "array separator expected"); }
      }
      const begin = cursor; while (cursor < text.length && !/[\s,}\]]/.test(text[cursor]!)) cursor++;
      if (begin === cursor) fail("json", "value expected");
    };
    value(0); space(); if (cursor !== text.length) fail("json", "trailing data");
    try { raw = JSON.parse(text) as unknown; } catch { fail("json", "invalid JSON"); }
  }
  let nodes = 0; const active = new Set<object>();
  const snapshot = (value: unknown, path: string, depth: number): JsonValue => {
    if (++nodes > TACTICAL_MAP_LIMITS.nodes || depth > TACTICAL_MAP_LIMITS.depth) fail(path, "complexity limit exceeded");
    if (value === null || typeof value === "boolean" || typeof value === "string") return value;
    if (typeof value === "number") { if (!Number.isFinite(value)) fail(path, "finite number required"); return value; }
    if (typeof value !== "object") return fail(path, "JSON value required");
    if (active.has(value)) fail(path, "cyclic input"); active.add(value);
    if (Object.getOwnPropertySymbols(value).length) fail(path, "symbol properties forbidden");
    if (Array.isArray(value)) {
      if (Object.keys(value).length !== value.length || Object.getOwnPropertyNames(value).length !== value.length + 1) fail(path, "dense JSON array required");
      const result = Array.from({ length: value.length }, (_, index) => { const descriptor = Object.getOwnPropertyDescriptor(value, String(index)); if (!descriptor || !("value" in descriptor)) fail(path, "accessors and sparse arrays forbidden"); return snapshot(descriptor.value, `${path}[${index}]`, depth + 1); });
      active.delete(value); return result;
    }
    if (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) fail(path, "plain JSON object required");
    const result: Record<string, JsonValue> = {};
    for (const key of Object.getOwnPropertyNames(value)) {
      if (forbiddenKey(key)) fail(path, "prototype key forbidden"); const descriptor = Object.getOwnPropertyDescriptor(value, key)!;
      if (!("value" in descriptor) || !descriptor.enumerable) fail(path, "enumerable data property required");
      result[key] = snapshot(descriptor.value, `${path}.${key}`, depth + 1);
    }
    active.delete(value); return result;
  };
  const result = snapshot(raw, "json", 0);
  if (typeof input !== "string" && new TextEncoder().encode(JSON.stringify(result)).byteLength > maxBytes) fail("json", "byte limit exceeded");
  return result;
}
function object(value: unknown, path: string, required: readonly string[], optional: readonly string[] = []): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(path, "object required");
  const row = value as Record<string, unknown>;
  for (const key of Object.keys(row)) if (!required.includes(key) && !optional.includes(key)) fail(`${path}.${key}`, "unknown property; an explicit schema migration is required");
  for (const key of required) if (!Object.hasOwn(row, key)) fail(`${path}.${key}`, "required property missing");
  return row;
}
function number(value: unknown, path: string, min: number = -TACTICAL_MAP_LIMITS.coordinate, max: number = TACTICAL_MAP_LIMITS.coordinate): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) fail(path, `finite number in ${min}..${max} required`); return value as number;
}
function integer(value: unknown, path: string, min: number, max: number): number { const n = number(value, path, min, max); if (!Number.isSafeInteger(n)) fail(path, "integer required"); return n; }
function string(value: unknown, path: string, max = 256): string { if (typeof value !== "string" || !value.length || value.length > max || /[\u0000-\u001f\u007f]/.test(value)) fail(path, "bounded nonempty text required"); return value as string; }
function boolean(value: unknown, path: string): void { if (typeof value !== "boolean") fail(path, "boolean required"); }
function choice(value: unknown, choices: readonly string[], path: string): void { if (typeof value !== "string" || !choices.includes(value)) fail(path, `expected ${choices.join(" | ")}`); }
function array(value: unknown, path: string, max: number): unknown[] { if (!Array.isArray(value) || value.length > max) fail(path, `array with at most ${max} members required`); return value as unknown[]; }
function point(value: unknown, path: string): void { const p = array(value, path, 2); if (p.length !== 2) fail(path, "coordinate pair required"); p.forEach((n, i) => number(n, `${path}[${i}]`)); }
function color(value: unknown, path: string): void { if (typeof value !== "string" || !/^[a-fA-F0-9]{8}$/.test(value)) fail(path, "eight ARGB hexadecimal digits required"); }
function freeze<T>(value: T): T { if (value && typeof value === "object") { for (const child of Object.values(value)) freeze(child); Object.freeze(value); } return value; }

export function parseTacticalMapDocument(input: string | unknown): TacticalMapDocumentV1 {
  const raw = parseBoundedMapJson(input), root = object(raw, "map", ["schemaVersion", "kind", "coordinates", "frame", "geometry", "grid", "elevation", "geometryElevation", "walls", "portals", "lights", "environment", "background"]);
  if (root.schemaVersion !== 1 || root.kind !== "tactical-map" || root.coordinates !== "image-pixels") fail("map", "unsupported tactical map profile; explicit migration required");
  const frame = object(root.frame, "frame", ["ursprung", "einheitenProPixel", "ordnung", "hoch"]); point(frame.ursprung, "frame.ursprung"); number(frame.einheitenProPixel, "frame.einheitenProPixel", Number.MIN_VALUE); choice(frame.ordnung, ["xy", "yx"], "frame.ordnung"); choice(frame.hoch, ["oben", "unten"], "frame.hoch");
  const geometry = object(root.geometry, "geometry", ["v", "size", "stamps", "regions", "places"], ["base"]);
  if (geometry.v !== 3) fail("geometry.v", "existing SceneDoc v3 required"); const size = array(geometry.size, "geometry.size", 2); if (size.length !== 2) fail("geometry.size", "width and height required");
  const width = number(size[0], "width", Number.MIN_VALUE, TACTICAL_MAP_LIMITS.dimension), height = number(size[1], "height", Number.MIN_VALUE, TACTICAL_MAP_LIMITS.dimension);
  if (width * height > TACTICAL_MAP_LIMITS.pixels) fail("geometry.size", "pixel budget exceeded");
  if (geometry.base !== undefined) {
    const base = object(geometry.base, "geometry.base", ["basisUrl", "kachelgroesse", "ebenen"]);
    // SceneDoc v3 itself remains unchanged. Tactical imports accept only logical cache
    // references here; a server maps them to an authorized source, never a remote URL.
    if (!/^asset:[a-f0-9]{64}$/.test(string(base.basisUrl, "geometry.base.basisUrl"))) fail("geometry.base.basisUrl", "content-addressed asset reference required");
    integer(base.kachelgroesse, "geometry.base.kachelgroesse", 64, 4096); integer(base.ebenen, "geometry.base.ebenen", 1, 16);
  }
  let points = 0; const allIds = new Set<string>();
  const id = (value: unknown, path: string) => { const s = string(value, path); if (allIds.has(s)) fail(path, "duplicate geometry identity"); allIds.add(s); };
  const vertices = (value: unknown, path: string, min: number) => { const rows = array(value, path, TACTICAL_MAP_LIMITS.points); if (rows.length < min) fail(path, `at least ${min} points required`); points += rows.length; if (points > TACTICAL_MAP_LIMITS.points) fail(path, "total point budget exceeded"); rows.forEach((p, i) => point(p, `${path}[${i}]`)); };
  for (const [i, item] of array(geometry.stamps, "stamps", TACTICAL_MAP_LIMITS.stamps).entries()) {
    const path = `stamps[${i}]`, stamp = object(item, path, ["id", "a", "x", "y", "s", "r", "l"], ["t", "f"]); id(stamp.id, `${path}.id`);
    if (!/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(string(stamp.a, `${path}.a`))) fail(`${path}.a`, "pack-qualified asset reference required");
    number(stamp.x, `${path}.x`); number(stamp.y, `${path}.y`); number(stamp.s, `${path}.s`, Number.MIN_VALUE, 1_000_000); number(stamp.r, `${path}.r`); integer(stamp.l, `${path}.l`, -32768, 32767);
    if (stamp.t !== undefined) integer(stamp.t, `${path}.t`, 0, 0xffffff); if (stamp.f !== undefined) integer(stamp.f, `${path}.f`, 0, 15);
  }
  for (const [i, item] of array(geometry.regions, "regions", TACTICAL_MAP_LIMITS.regions).entries()) { const path = `regions[${i}]`, region = object(item, path, ["id", "punkte"]); id(region.id, `${path}.id`); vertices(region.punkte, `${path}.punkte`, 3); }
  for (const [i, item] of array(geometry.places, "places", TACTICAL_MAP_LIMITS.places).entries()) { const path = `places[${i}]`, place = object(item, path, ["id", "x", "y"]); id(place.id, `${path}.id`); number(place.x, `${path}.x`); number(place.y, `${path}.y`); }
  const grid = object(root.grid, "grid", ["kind"], ["size", "origin", "orientation", "offset"]); choice(grid.kind, ["square", "hex", "none"], "grid.kind");
  if (grid.kind === "none") object(grid, "grid", ["kind"]);
  else { object(grid, "grid", grid.kind === "square" ? ["kind", "size", "origin"] : ["kind", "size", "origin", "orientation", "offset"]); number(grid.size, "grid.size", Number.MIN_VALUE, TACTICAL_MAP_LIMITS.dimension); point(grid.origin, "grid.origin"); if (grid.kind === "hex") { choice(grid.orientation, ["pointy", "flat"], "grid.orientation"); choice(grid.offset, ["even", "odd"], "grid.offset"); } }
  number(root.elevation, "elevation");
  const elevationIds = new Set<string>();
  const geometryIds = { stamp: new Set((geometry.stamps as { id: string }[]).map(v => v.id)), region: new Set((geometry.regions as { id: string }[]).map(v => v.id)), place: new Set((geometry.places as { id: string }[]).map(v => v.id)) };
  for (const [i, item] of array(root.geometryElevation, "geometryElevation", TACTICAL_MAP_LIMITS.stamps + TACTICAL_MAP_LIMITS.regions + TACTICAL_MAP_LIMITS.places).entries()) {
    const path = `geometryElevation[${i}]`, row = object(item, path, ["targetKind", "targetId", "elevation"]); choice(row.targetKind, ["stamp", "region", "place"], `${path}.targetKind`); string(row.targetId, `${path}.targetId`); number(row.elevation, `${path}.elevation`);
    const key = `${row.targetKind}:${row.targetId}`; if (elevationIds.has(key) || !geometryIds[row.targetKind as keyof typeof geometryIds].has(row.targetId as string)) fail(path, "unique existing geometry target required"); elevationIds.add(key);
  }
  for (const [i, item] of array(root.walls, "walls", TACTICAL_MAP_LIMITS.walls).entries()) { const path = `walls[${i}]`, wall = object(item, path, ["id", "kind", "points", "elevation"]); id(wall.id, `${path}.id`); choice(wall.kind, ["wall", "object"], `${path}.kind`); vertices(wall.points, `${path}.points`, 2); number(wall.elevation, `${path}.elevation`); }
  for (const [i, item] of array(root.portals, "portals", TACTICAL_MAP_LIMITS.portals).entries()) { const path = `portals[${i}]`, portal = object(item, path, ["id", "position", "bounds", "rotationRadians", "closed", "freestanding", "elevation"]); id(portal.id, `${path}.id`); point(portal.position, `${path}.position`); vertices(portal.bounds, `${path}.bounds`, 2); if ((portal.bounds as unknown[]).length !== 2) fail(`${path}.bounds`, "exactly two endpoints required"); number(portal.rotationRadians, `${path}.rotationRadians`); number(portal.elevation, `${path}.elevation`); boolean(portal.closed, `${path}.closed`); boolean(portal.freestanding, `${path}.freestanding`); }
  for (const [i, item] of array(root.lights, "lights", TACTICAL_MAP_LIMITS.lights).entries()) { const path = `lights[${i}]`, light = object(item, path, ["id", "position", "range", "intensity", "colorArgb", "shadows", "elevation"]); id(light.id, `${path}.id`); point(light.position, `${path}.position`); number(light.range, `${path}.range`, 0); number(light.intensity, `${path}.intensity`, 0, 1_000_000); color(light.colorArgb, `${path}.colorArgb`); boolean(light.shadows, `${path}.shadows`); number(light.elevation, `${path}.elevation`); }
  const environment = object(root.environment, "environment", ["bakedLighting", "ambientLightArgb"]); boolean(environment.bakedLighting, "environment.bakedLighting"); color(environment.ambientLightArgb, "environment.ambientLightArgb");
  if (root.background !== null) {
    const bg = object(root.background, "background", ["sha256", "mimeType", "width", "height"]); if (typeof bg.sha256 !== "string" || !/^[a-f0-9]{64}$/.test(bg.sha256)) fail("background.sha256", "SHA-256 required"); choice(bg.mimeType, ["image/png", "image/webp"], "background.mimeType"); integer(bg.width, "background.width", 1, TACTICAL_MAP_LIMITS.dimension); integer(bg.height, "background.height", 1, TACTICAL_MAP_LIMITS.dimension);
    if (bg.width !== width || bg.height !== height) fail("background", "image dimensions must equal geometry size");
  }
  return freeze(raw as TacticalMapDocumentV1);
}

export function serializeTacticalMapDocument(document: TacticalMapDocumentV1): string {
  const map = parseTacticalMapDocument(document);
  const sort = (value: unknown): unknown => Array.isArray(value) ? value.map(sort) : value && typeof value === "object" ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([key, child]) => [key, sort(child)])) : value;
  return JSON.stringify(sort(map));
}
