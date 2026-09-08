// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { canonicalHash, canonicalJson, type CanonicalValue } from "@chronicle/core";
import type { BauwerkTyp, Knoten, Weltkeim } from "./model.ts";
import { parseBoundedMapJson, parseTacticalMapDocument, TACTICAL_MAP_LIMITS, TacticalMapValidationError, type TacticalMapDocumentV1, type TacticalPoint } from "./tactical-map.ts";

/** Meaning attached to one revision's existing regions; never a second geometry store. */
export const TACTICAL_CARTOGRAPHY_VERSION = 1 as const;
export const TACTICAL_CARTOGRAPHY_LIMITS = Object.freeze({
  documentBytes: 1024 * 1024, regions: 2048, attachedStamps: 50_000,
  cellSize: 32_768, coordinate: TACTICAL_MAP_LIMITS.coordinate,
});
export const CARTOGRAPHY_ROLES = Object.freeze(["generic", "terrain", "water", "road", "lot", "building", "room"] as const);
export const CARTOGRAPHY_TERRAIN_MATERIALS = Object.freeze(["grass", "earth", "forest", "field", "rock", "sand"] as const);
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
export interface TacticalCartographyV1 {
  readonly schemaVersion: 1;
  readonly kind: "tactical-cartography";
  readonly construction: { readonly cellSize: number; readonly origin: TacticalPoint };
  readonly regions: readonly CartographyRegionV1[];
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

/**
 * Detached, frozen and closed. Supplying the matching map additionally proves total region
 * coverage and existing stamp targets. Every persistence/IO boundary must supply that map.
 * This parser never grants knowledge, authenticates a provenance claim, or changes geometry.
 */
export function parseTacticalCartography(input: unknown, document?: TacticalMapDocumentV1): TacticalCartographyV1 {
  let raw: unknown;
  try { raw = parseBoundedMapJson(input, TACTICAL_CARTOGRAPHY_LIMITS.documentBytes); }
  catch (error) { if (error instanceof TacticalMapValidationError) fail(error.path, error.message.slice(error.path.length + 2)); throw error; }
  const root = object(raw, "cartography", ["schemaVersion", "kind", "construction", "regions"]);
  if (root.schemaVersion !== 1 || root.kind !== "tactical-cartography") fail("cartography", "unsupported cartography profile/version; an explicit schema migration is required");
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
