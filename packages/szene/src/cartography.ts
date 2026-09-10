// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { canonicalHash, canonicalJson, type CanonicalValue } from "@chronicle/core";
import type { BauwerkTyp, Knoten, Weltkeim } from "./model.ts";
import { parseBoundedMapJson, parseTacticalMapDocument, TACTICAL_MAP_LIMITS, TacticalMapValidationError, type TacticalMapDocumentV1, type TacticalPoint } from "./tactical-map.ts";

/** Meaning attached to one revision's existing regions; never a second geometry store. */
export const TACTICAL_CARTOGRAPHY_VERSION = 1 as const;
export const TACTICAL_CARTOGRAPHY_LIMITS = Object.freeze({
  documentBytes: 1024 * 1024, regions: 4096, attachedStamps: 50_000,
  cellSize: 32_768, coordinate: TACTICAL_MAP_LIMITS.coordinate,
  /** Relief samples sit on construction-cell corners; the largest settlement (192×192) needs 193². */
  reliefAxis: 1025, reliefSamples: 65_536,
  /** Free names on the map: how many, how long a line each may follow, how long its text. */
  labels: 512, labelPoints: 64, labelText: 80, labelSize: 4096,
});
export const CARTOGRAPHY_ROLES = Object.freeze(["generic", "terrain", "water", "road", "lot", "building", "room"] as const);
export const CARTOGRAPHY_TERRAIN_MATERIALS = Object.freeze(["grass", "earth", "forest", "field", "rock", "sand", "swamp", "snow"] as const);
export const CARTOGRAPHY_WATER_MATERIALS = Object.freeze(["river", "lake", "sea"] as const);
export const CARTOGRAPHY_ROAD_MATERIALS = Object.freeze(["path", "street", "square", "bridge"] as const);
export type CartographyRole = typeof CARTOGRAPHY_ROLES[number];
export type CartographyTerrainMaterial = typeof CARTOGRAPHY_TERRAIN_MATERIALS[number];
export type CartographyWaterMaterial = typeof CARTOGRAPHY_WATER_MATERIALS[number];
export type CartographyRoadMaterial = typeof CARTOGRAPHY_ROAD_MATERIALS[number];
export interface CartographyRegionCommon {
  readonly regionId: string;
  readonly authored: boolean;
  readonly locked: boolean;
  /** A valid hash proves consistency only. The server determines provenance authority. */
  readonly provenance: Weltkeim | null;
}
/** Optional, explicitly versioned interior ownership profile. Geometry remains in the map.
 * Shared boundaries can belong to two rooms; furniture and lights have one owner. Absence
 * means ownership is unknown, never permission to guess it from spatial containment. */
export interface CartographyRoomInteriorV1 {
  readonly schemaVersion: 1;
  readonly floor: "wood" | "stone" | "tile";
  readonly stampIds: readonly string[];
  readonly wallIds: readonly string[];
  readonly portalIds: readonly string[];
  readonly lightIds: readonly string[];
  readonly placeIds?: readonly string[];
  /** Artwork generated for a particular opening, required to edit old painted doors safely. */
  readonly portalArtwork?: readonly { readonly portalId: string; readonly stampIds: readonly string[] }[];
}
export type CartographyRegionV1 = CartographyRegionCommon & (
  | { readonly role: "generic" | "lot" }
  | { readonly role: "room"; readonly interior?: CartographyRoomInteriorV1 }
  | { readonly role: "terrain"; readonly material: CartographyTerrainMaterial }
  | { readonly role: "water"; readonly material: CartographyWaterMaterial }
  | { readonly role: "road"; readonly material: CartographyRoadMaterial }
  | { readonly role: "building"; readonly lotRegionId?: string; readonly streetRegionId?: string; readonly attachedStampIds?: readonly string[] }
);
/**
 * The land's height, sampled on the corners of construction cells: sample (i, j) sits at
 * `construction.origin + (i·cellSize, j·cellSize)`, rows first. Heights are integer levels
 * 0..255 with `seaLevel` the water line. This is a shading and shaping layer, never a second
 * geometry store: what *is* water or rock is still said by the regions' roles.
 */
export interface CartographyReliefV1 {
  readonly schemaVersion: 1;
  readonly columns: number;
  readonly rows: number;
  readonly seaLevel: number;
  readonly heights: readonly number[];
}
/** The mood a map is painted in. It belongs to the map, not to the viewer: the game master
 * chooses it in the studio, it is saved with the revision, and the players' tiles and the PNG
 * export carry it too. `tag` is the plain painting and is never written. */
export const CARTOGRAPHY_MOODS = ["tag", "nacht", "winter", "herbst"] as const;
export type CartographyMood = typeof CARTOGRAPHY_MOODS[number];
/** How a free name is set: a place upright, a water in italics, a region spaced out, a way small. */
export const CARTOGRAPHY_LABEL_STYLES = ["ort", "wasser", "gegend", "weg"] as const;
export type CartographyLabelStyle = typeof CARTOGRAPHY_LABEL_STYLES[number];
/**
 * A free name on the map — a river's, a wood's, a region's — with the line it follows. One point
 * sets it straight there; more bend it along the path. `size` is the letter height in map units.
 * A player sees a name only when the middle of its line lies in a region they know.
 */
export interface CartographyLabelV1 {
  readonly id: string;
  readonly text: string;
  readonly points: readonly TacticalPoint[];
  readonly size: number;
  readonly style: CartographyLabelStyle;
}
export interface TacticalCartographyV1 {
  readonly schemaVersion: 1;
  readonly kind: "tactical-cartography";
  readonly construction: { readonly cellSize: number; readonly origin: TacticalPoint };
  readonly regions: readonly CartographyRegionV1[];
  /** Absent on every document written before 2026-09-10; absence keeps bytes and hash unchanged. */
  readonly relief?: CartographyReliefV1;
  /** Absent means day; absence keeps bytes and hash unchanged. */
  readonly mood?: Exclude<CartographyMood, "tag">;
  /** Absent means no free names; absence keeps bytes and hash unchanged. */
  readonly labels?: readonly CartographyLabelV1[];
}
/** The point a name hangs from: the middle of its line by arc length, or its one point. */
export function cartographyLabelAnchor(label: Pick<CartographyLabelV1, "points">): TacticalPoint {
  const points = label.points;
  if (points.length <= 1) return points[0] ?? [0, 0];
  const lengths = points.slice(1).map((point, index) => Math.hypot(point[0] - points[index]![0], point[1] - points[index]![1]));
  let remaining = lengths.reduce((sum, length) => sum + length, 0) / 2;
  for (const [index, length] of lengths.entries()) {
    if (remaining <= length && length > 0) { const a = points[index]!, b = points[index + 1]!, t = remaining / length; return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; }
    remaining -= length;
  }
  return points[0]!;
}
/** An intent for a newly drawn building, not writable node identity or provenance. */
export interface BuildingIntent { readonly regionId: string; readonly titel: string; readonly typ: BauwerkTyp }
export interface RoomIntent { readonly regionId: string; readonly titel: string }

export class TacticalCartographyValidationError extends Error {
  override readonly name = "TacticalCartographyValidationError";
  constructor(readonly path: string, message: string) { super(`${path}: ${message}`); }
}
function fail(path: string, message: string): never { throw new TacticalCartographyValidationError(path, message); }
function object(value: unknown, path: string, required: readonly string[], optional: readonly string[] = []): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(path, "object required");
  const row = value as Record<string, unknown>;
  for (const key of Object.keys(row)) if (!required.includes(key) && !optional.includes(key)) fail(`${path}.${key}`, "unknown property; an explicit schema migration is required");
  for (const key of required) if (!Object.hasOwn(row, key)) fail(`${path}.${key}`, "required property missing");
  return row;
}
function text(value: unknown, path: string, maximum = 256): string {
  if (typeof value !== "string" || !value.length || value.length > maximum || /[\u0000-\u001f\u007f]/.test(value)) fail(path, "bounded nonempty text required");
  return value;
}
function choice(value: unknown, values: readonly string[], path: string): void {
  if (typeof value !== "string" || !values.includes(value)) fail(path, `expected ${values.join("|")}`);
}
function number(value: unknown, path: string, minimum: number, maximum: number): void {
  if (typeof value !== "number" || !Number.isFinite(value) || value < minimum || value > maximum) fail(path, `finite number in ${minimum}..${maximum} required`);
}
function array(value: unknown, path: string, maximum: number): unknown[] {
  if (!Array.isArray(value) || value.length > maximum) fail(path, `array of at most ${maximum} items required`);
  return value;
}
function hash(value: unknown, path: string): string {
  if (typeof value !== "string" || !/^[a-f0-9]{64}$/.test(value)) fail(path, "SHA-256 required");
  return value;
}
function provenance(value: unknown, path: string): void {
  if (value === null) return;
  const row = object(value, path, ["generator", "version", "seed", "optionen", "keimHash"]);
  text(row.generator, `${path}.generator`); text(row.version, `${path}.version`, 128); text(row.seed, `${path}.seed`, 1024);
  if (!row.optionen || typeof row.optionen !== "object" || Array.isArray(row.optionen)) fail(`${path}.optionen`, "option object required");
  const expected = canonicalHash({ generator: row.generator, version: row.version, seed: row.seed, optionen: row.optionen } as CanonicalValue);
  if (hash(row.keimHash, `${path}.keimHash`) !== expected) fail(`${path}.keimHash`, "provenance vector/hash mismatch");
}
function freeze<T>(value: T): T {
  if (value && typeof value === "object") { for (const child of Object.values(value)) freeze(child); Object.freeze(value); }
  return value;
}
function label(value: unknown, path: string, seen: Set<string>): void {
  const row = object(value, path, ["id", "text", "points", "size", "style"]);
  const id = text(row.id, `${path}.id`, 128);
  if (seen.has(id)) fail(`${path}.id`, "duplicate label identity");
  seen.add(id);
  if (!text(row.text, `${path}.text`, TACTICAL_CARTOGRAPHY_LIMITS.labelText).trim()) fail(`${path}.text`, "bounded nonempty text required");
  const points = array(row.points, `${path}.points`, TACTICAL_CARTOGRAPHY_LIMITS.labelPoints);
  if (!points.length) fail(`${path}.points`, "at least one point required");
  points.forEach((point, index) => {
    const pair = array(point, `${path}.points[${index}]`, 2);
    if (pair.length !== 2) fail(`${path}.points[${index}]`, "exactly two coordinates required");
    pair.forEach((coordinate, axis) => number(coordinate, `${path}.points[${index}][${axis}]`, -TACTICAL_CARTOGRAPHY_LIMITS.coordinate, TACTICAL_CARTOGRAPHY_LIMITS.coordinate));
  });
  number(row.size, `${path}.size`, 1, TACTICAL_CARTOGRAPHY_LIMITS.labelSize);
  choice(row.style, CARTOGRAPHY_LABEL_STYLES, `${path}.style`);
}
function relief(value: unknown, path: string): void {
  const row = object(value, path, ["schemaVersion", "columns", "rows", "seaLevel", "heights"]);
  if (row.schemaVersion !== 1) fail(`${path}.schemaVersion`, "unsupported relief profile; an explicit schema migration is required");
  for (const axis of ["columns", "rows"] as const) {
    const size = row[axis];
    if (!Number.isSafeInteger(size) || (size as number) < 2 || (size as number) > TACTICAL_CARTOGRAPHY_LIMITS.reliefAxis) fail(`${path}.${axis}`, `integer in 2..${TACTICAL_CARTOGRAPHY_LIMITS.reliefAxis} required`);
  }
  const samples = (row.columns as number) * (row.rows as number);
  if (samples > TACTICAL_CARTOGRAPHY_LIMITS.reliefSamples) fail(`${path}.heights`, "relief sample budget exceeded");
  if (!Number.isSafeInteger(row.seaLevel) || (row.seaLevel as number) < 0 || (row.seaLevel as number) > 255) fail(`${path}.seaLevel`, "integer in 0..255 required");
  const heights = array(row.heights, `${path}.heights`, TACTICAL_CARTOGRAPHY_LIMITS.reliefSamples);
  if (heights.length !== samples) fail(`${path}.heights`, "exactly columns×rows samples required");
  for (const [index, height] of heights.entries()) if (!Number.isSafeInteger(height) || (height as number) < 0 || (height as number) > 255) fail(`${path}.heights[${index}]`, "integer in 0..255 required");
}

/**
 * Detached, frozen and closed. Supplying the matching map additionally proves total region
 * coverage and existing stamp targets. Every persistence/IO boundary must supply that map.
 * This parser never grants knowledge, authenticates a provenance claim, or changes geometry.
 */
export function parseTacticalCartography(input: unknown, document?: TacticalMapDocumentV1): TacticalCartographyV1 {
  let raw: unknown;
  try { raw = parseBoundedMapJson(input, TACTICAL_CARTOGRAPHY_LIMITS.documentBytes); }
  catch (error) { if (error instanceof TacticalMapValidationError) fail(error.path, error.message.slice(error.path.length + 2)); throw error; }
  const root = object(raw, "cartography", ["schemaVersion", "kind", "construction", "regions"], ["relief", "mood", "labels"]);
  if (root.schemaVersion !== 1 || root.kind !== "tactical-cartography") fail("cartography", "unsupported cartography profile/version; an explicit schema migration is required");
  if (Object.hasOwn(root, "relief")) relief(root.relief, "relief");
  // Day is the absence of a mood: writing it would change the hash of every untouched map.
  if (Object.hasOwn(root, "mood")) choice(root.mood, CARTOGRAPHY_MOODS.filter(mood => mood !== "tag"), "mood");
  if (Object.hasOwn(root, "labels")) { const seen = new Set<string>(); array(root.labels, "labels", TACTICAL_CARTOGRAPHY_LIMITS.labels).forEach((row, index) => label(row, `labels[${index}]`, seen)); }
  const construction = object(root.construction, "construction", ["cellSize", "origin"]);
  number(construction.cellSize, "construction.cellSize", Number.MIN_VALUE, TACTICAL_CARTOGRAPHY_LIMITS.cellSize);
  const origin = array(construction.origin, "construction.origin", 2);
  if (origin.length !== 2) fail("construction.origin", "exactly two coordinates required");
  origin.forEach((coordinate, index) => number(coordinate, `construction.origin[${index}]`, -TACTICAL_CARTOGRAPHY_LIMITS.coordinate, TACTICAL_CARTOGRAPHY_LIMITS.coordinate));
  const regions = array(root.regions, "regions", TACTICAL_CARTOGRAPHY_LIMITS.regions);
  const byId = new Map<string, Record<string, unknown>>(), attached = new Set<string>();
  const interiorReferences = { wallIds: new Map<string, number>(), portalIds: new Map<string, number>(), lightIds: new Map<string, number>(), placeIds: new Map<string, number>() };
  let interiorReferenceCount = 0;
  for (const [index, value] of regions.entries()) {
    const path = `regions[${index}]`, common = ["regionId", "role", "authored", "locked", "provenance"];
    const row = object(value, path, common, ["material", "lotRegionId", "streetRegionId", "attachedStampIds", "interior"]);
    const id = text(row.regionId, `${path}.regionId`);
    if (byId.has(id)) fail(`${path}.regionId`, "duplicate region identity");
    byId.set(id, row); choice(row.role, CARTOGRAPHY_ROLES, `${path}.role`);
    if (typeof row.authored !== "boolean" || typeof row.locked !== "boolean") fail(path, "authored and locked must be booleans");
    provenance(row.provenance, `${path}.provenance`);
    if (row.role === "terrain" || row.role === "water" || row.role === "road") {
      object(row, path, [...common, "material"]);
      choice(row.material, row.role === "terrain" ? CARTOGRAPHY_TERRAIN_MATERIALS : row.role === "water" ? CARTOGRAPHY_WATER_MATERIALS : CARTOGRAPHY_ROAD_MATERIALS, `${path}.material`);
    } else if (row.role === "building") {
      object(row, path, common, ["lotRegionId", "streetRegionId", "attachedStampIds"]);
      for (const field of ["lotRegionId", "streetRegionId"]) if (Object.hasOwn(row, field)) text(row[field], `${path}.${field}`);
      if (Object.hasOwn(row, "attachedStampIds")) for (const [stampIndex, value] of array(row.attachedStampIds, `${path}.attachedStampIds`, TACTICAL_CARTOGRAPHY_LIMITS.attachedStamps).entries()) {
        const id = text(value, `${path}.attachedStampIds[${stampIndex}]`);
        if (attached.has(id)) fail(`${path}.attachedStampIds`, "stamp must belong to at most one region and occur once");
        attached.add(id);
        if (attached.size > TACTICAL_CARTOGRAPHY_LIMITS.attachedStamps) fail("regions", "total attached stamp budget exceeded");
      }
    } else if (row.role === "room") {
      object(row, path, common, ["interior"]);
      if (Object.hasOwn(row, "interior")) {
        const interior = object(row.interior, `${path}.interior`, ["schemaVersion", "floor", "stampIds", "wallIds", "portalIds", "lightIds"], ["portalArtwork", "placeIds"]);
        if (interior.schemaVersion !== 1) fail(`${path}.interior.schemaVersion`, "unsupported interior ownership profile; explicit migration required");
        choice(interior.floor, ["wood", "stone", "tile"], `${path}.interior.floor`);
        for (const field of ["stampIds", "wallIds", "portalIds", "lightIds", "placeIds"] as const) {
          if (field === "placeIds" && !Object.hasOwn(interior, field)) continue;
          const own = new Set<string>();
          for (const item of array(interior[field], `${path}.interior.${field}`, field === "stampIds" ? TACTICAL_MAP_LIMITS.stamps : field === "wallIds" ? TACTICAL_MAP_LIMITS.walls : field === "portalIds" ? TACTICAL_MAP_LIMITS.portals : field === "placeIds" ? TACTICAL_MAP_LIMITS.places : TACTICAL_MAP_LIMITS.lights)) {
            const id = text(item, `${path}.interior.${field}`);
            if (own.has(id)) fail(`${path}.interior.${field}`, "duplicate interior reference");
            own.add(id);
            if (++interiorReferenceCount > 150_000) fail("regions.interior", "total interior reference budget exceeded");
            if (field === "stampIds") {
              if (attached.has(id)) fail(`${path}.interior.stampIds`, "stamp must belong to at most one region");
              attached.add(id);
              if (attached.size > TACTICAL_CARTOGRAPHY_LIMITS.attachedStamps) fail("regions", "total attached stamp budget exceeded");
            } else {
              const references = interiorReferences[field], count = (references.get(id) ?? 0) + 1;
              if (count > (field === "lightIds" || field === "placeIds" ? 1 : 2)) fail(`${path}.interior.${field}`, field === "lightIds" || field === "placeIds" ? "light/place must belong to at most one room" : "boundary must belong to at most two rooms");
              references.set(id, count);
            }
          }
        }
        if (Object.hasOwn(interior, "portalArtwork")) {
          const portals = new Set(interior.portalIds as string[]), stamps = new Set(interior.stampIds as string[]), mappedPortals = new Set<string>(), mappedStamps = new Set<string>();
          for (const item of array(interior.portalArtwork, `${path}.interior.portalArtwork`, TACTICAL_MAP_LIMITS.portals)) {
            const artwork = object(item, `${path}.interior.portalArtwork`, ["portalId", "stampIds"]), portalId = text(artwork.portalId, `${path}.interior.portalArtwork.portalId`);
            if (!portals.has(portalId) || mappedPortals.has(portalId)) fail(`${path}.interior.portalArtwork`, "one artwork mapping per owned portal required");
            mappedPortals.add(portalId);
            for (const id of array(artwork.stampIds, `${path}.interior.portalArtwork.stampIds`, TACTICAL_MAP_LIMITS.stamps)) {
              const stampId = text(id, `${path}.interior.portalArtwork.stampIds`);
              if (!stamps.has(stampId) || mappedStamps.has(stampId)) fail(`${path}.interior.portalArtwork.stampIds`, "distinct owned stamp required");
              mappedStamps.add(stampId);
            }
          }
        }
      }
    } else object(row, path, common);
  }
  for (const [id, row] of byId) if (row.role === "building") {
    if (Object.hasOwn(row, "lotRegionId") && byId.get(String(row.lotRegionId))?.role !== "lot") fail(`regions.${id}.lotRegionId`, "existing lot in the same cartography required");
    if (Object.hasOwn(row, "streetRegionId") && byId.get(String(row.streetRegionId))?.role !== "road") fail(`regions.${id}.streetRegionId`, "existing road in the same cartography required");
  }
  if (document !== undefined) {
    const map = parseTacticalMapDocument(document), mapRegions = new Set(map.geometry.regions.map(region => region.id)), stamps = new Set(map.geometry.stamps.map(stamp => stamp.id));
    if (byId.size !== mapRegions.size || [...byId.keys()].some(id => !mapRegions.has(id))) fail("regions", "exactly one role for every region of the matching map revision required");
    if ([...attached].some(id => !stamps.has(id))) fail("regions.attachedStampIds", "existing stamp in the matching map revision required");
    for (const [field, values] of [["wallIds", map.walls], ["portalIds", map.portals], ["lightIds", map.lights], ["placeIds", map.geometry.places]] as const) {
      const ids = new Set(values.map(value => value.id));
      if ([...interiorReferences[field].keys()].some(id => !ids.has(id))) fail(`regions.interior.${field}`, "existing geometry in the matching map revision required");
    }
  }
  return freeze(raw as TacticalCartographyV1);
}

export function serializeTacticalCartography(cartography: TacticalCartographyV1): string {
  return canonicalJson(parseTacticalCartography(cartography) as unknown as CanonicalValue);
}
export function tacticalCartographyHash(cartography: TacticalCartographyV1): string {
  return canonicalHash(parseTacticalCartography(cartography) as unknown as CanonicalValue);
}
/** Separate from, and never substituted into, the frozen v1 map/snapshot content hash. */
export function tacticalCompositionHash(contentHash: string, cartographyHash: string | null): string {
  hash(contentHash, "contentHash"); if (cartographyHash !== null) hash(cartographyHash, "cartographyHash");
  return canonicalHash({ contentHash, cartographyHash });
}

/** Shared thresholds above the water line, in height levels: where land turns to rock and
 * rock to snow, and how far apart contour lines are drawn. Generator, editor and projection
 * read the same numbers, so a painted lake and a generated one sit at the same height. */
export const RELIEF_LEVELS = Object.freeze({ rockAbove: 118, snowAbove: 160, contourStep: 12, flatLand: 40 });
/** Bilinear height at a map point in pixels; outside the sampled area the edge value holds. */
export function reliefHeightAt(relief: CartographyReliefV1, construction: TacticalCartographyV1["construction"], x: number, y: number): number {
  const u = (x - construction.origin[0]) / construction.cellSize, v = (y - construction.origin[1]) / construction.cellSize;
  const cx = Math.max(0, Math.min(relief.columns - 1, u)), cy = Math.max(0, Math.min(relief.rows - 1, v));
  const i = Math.min(relief.columns - 2, Math.floor(cx)), j = Math.min(relief.rows - 2, Math.floor(cy)), fx = cx - i, fy = cy - j;
  const at = (column: number, row: number) => relief.heights[row * relief.columns + column]!;
  return (at(i, j) * (1 - fx) + at(i + 1, j) * fx) * (1 - fy) + (at(i, j + 1) * (1 - fx) + at(i + 1, j + 1) * fx) * fy;
}
/** A flat relief for a map that never had one, so the height tool works on every map. */
export function flatRelief(construction: TacticalCartographyV1["construction"], size: readonly [number, number], height = 77 + RELIEF_LEVELS.flatLand, seaLevel = 77): CartographyReliefV1 {
  const columns = Math.min(TACTICAL_CARTOGRAPHY_LIMITS.reliefAxis, Math.max(2, Math.ceil((size[0] - construction.origin[0]) / construction.cellSize) + 1));
  const rows = Math.min(TACTICAL_CARTOGRAPHY_LIMITS.reliefAxis, Math.max(2, Math.ceil((size[1] - construction.origin[1]) / construction.cellSize) + 1));
  return { schemaVersion: 1, columns, rows, seaLevel, heights: Array.from({ length: columns * rows }, () => height) };
}

export interface LegacyCartographyEvidence {
  readonly nodes?: readonly Pick<Knoten, "id" | "art">[];
  readonly construction?: TacticalCartographyV1["construction"];
  /** Complete original building identities, obtained with the retained generated source.
   * A missing node alone, an imported polygon, its name or its shape is no road evidence. */
  readonly settlement?: {
    readonly generator: "chronicle-siedlung";
    readonly version: "1" | "2" | "3" | "4";
    readonly originalDocument: TacticalMapDocumentV1;
    readonly buildingRegionIds: readonly string[];
  };
}
/** A read/editor adapter only. Opening legacy data must never persist inferred rows. */
export function inferLegacyCartography(document: TacticalMapDocumentV1, evidence: LegacyCartographyEvidence = {}): TacticalCartographyV1 {
  const map = parseTacticalMapDocument(document), nodes = new Map<string, Pick<Knoten, "id" | "art">>();
  for (const node of evidence.nodes ?? []) {
    if (nodes.has(node.id)) fail("legacy.nodes", "duplicate node identity");
    nodes.set(node.id, node);
  }
  const roads = new Set<string>();
  if (evidence.settlement) {
    const source = evidence.settlement;
    if (source.generator !== "chronicle-siedlung" || !["1", "2", "3", "4"].includes(source.version)) fail("legacy.settlement", "known original settlement generator required");
    const original = parseTacticalMapDocument(source.originalDocument), ids = new Set(original.geometry.regions.map(region => region.id)), buildings = new Set(source.buildingRegionIds);
    if (!buildings.size || buildings.size !== source.buildingRegionIds.length || [...buildings].some(id => !ids.has(id) || nodes.get(id)?.art !== "bauwerk")
      || [...nodes.values()].some(node => node.art === "bauwerk" && ids.has(node.id) && !buildings.has(node.id))) fail("legacy.settlement", "complete original building identities and matching stored building nodes required");
    for (const id of ids) if (!buildings.has(id)) roads.add(id);
  }
  return parseTacticalCartography({
    schemaVersion: 1, kind: "tactical-cartography",
    construction: evidence.construction ?? { cellSize: map.grid.kind === "none" ? 100 : map.grid.size, origin: map.grid.kind === "none" ? [0, 0] : map.grid.origin },
    regions: map.geometry.regions.map(region => {
      const common = { regionId: region.id, authored: false, locked: false, provenance: null }, node = nodes.get(region.id);
      if (node?.art === "bauwerk") return { ...common, role: "building" };
      if (node?.art === "raum") return { ...common, role: "room" };
      if (roads.has(region.id)) return { ...common, role: "road", material: "street" };
      return { ...common, role: "generic" };
    }),
  }, map);
}
