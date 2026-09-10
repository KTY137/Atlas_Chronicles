// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { describe, expect, it } from "vitest";
import { canonicalHash, type CanonicalValue, type KnotenId } from "@chronicle/core";
import {
  inferLegacyCartography, parseTacticalCartography, serializeTacticalCartography, tacticalCartographyHash,
  tacticalCompositionHash, TacticalCartographyValidationError, TACTICAL_CARTOGRAPHY_LIMITS, reliefHeightAt, flatRelief, RELIEF_LEVELS, cartographyLabelAnchor,
  type CartographyLabelV1, type CartographyRegionV1, type LegacyCartographyEvidence, type TacticalCartographyV1,
} from "../src/cartography.ts";
import { weltkeim } from "../src/containment.ts";
import { parseTacticalMapDocument, serializeTacticalMapDocument, type TacticalMapDocumentV1 } from "../src/tactical-map.ts";

const common = (regionId: string) => ({ regionId, authored: false, locked: false, provenance: null });
const map = (ids = ["lot", "road", "house", "water", "terrain", "room", "unknown"]): TacticalMapDocumentV1 => ({
  schemaVersion: 1, kind: "tactical-map", coordinates: "image-pixels",
  frame: { ursprung: [0, 0], einheitenProPixel: 1, ordnung: "xy", hoch: "unten" },
  geometry: { v: 3, size: [1000, 1000], stamps: [{ id: "roof", a: "pk.grundriss/wand", x: 30, y: 30, s: 1, r: 0, l: 1 }],
    regions: ids.map((id, i) => ({ id, punkte: [[i * 100, 0], [i * 100 + 80, 0], [i * 100 + 80, 80], [i * 100, 80]] })), places: [] },
  grid: { kind: "square", size: 100, origin: [20, 30] }, elevation: 0, geometryElevation: [], walls: [], portals: [], lights: [],
  environment: { bakedLighting: false, ambientLightArgb: "ffffffff" }, background: null,
});
const cartography = (): TacticalCartographyV1 => ({
  schemaVersion: 1, kind: "tactical-cartography", construction: { cellSize: 100, origin: [0, 0] },
  regions: [
    { ...common("lot"), role: "lot" }, { ...common("road"), role: "road", material: "street" },
    { ...common("house"), role: "building", lotRegionId: "lot", streetRegionId: "road", attachedStampIds: ["roof"] },
    { ...common("water"), role: "water", material: "river" }, { ...common("terrain"), role: "terrain", material: "grass" },
    { ...common("room"), role: "room" }, { ...common("unknown"), role: "generic" },
  ],
});
const withRegion = (regionId: string, extra: Record<string, unknown>) => ({ ...cartography(), regions: cartography().regions.map(region => region.regionId === regionId ? { ...region, ...extra } : region) });

describe("closed revision cartography v1", () => {
  it("retains all declared roles without copying geometry or widening tactical v1", () => {
    const document = map(), before = serializeTacticalMapDocument(document), result = parseTacticalCartography(cartography(), document);
    expect(result).toEqual(cartography()); expect(serializeTacticalMapDocument(document)).toBe(before);
    expect(parseTacticalCartography(serializeTacticalCartography(result), document)).toEqual(result);
    expect(() => parseTacticalMapDocument({ ...document, cartography: result })).toThrow(/migration/);
    expect(() => parseTacticalMapDocument({ ...document, geometry: { ...document.geometry, regions: [{ ...document.geometry.regions[0], role: "lot" }] } })).toThrow(/migration/);
  });
  it("detaches and deeply freezes role, attachment and provenance values", () => {
    const seed = weltkeim({ generator: "chronicle-siedlung", version: "5", seed: "seed", optionen: { art: "dorf", limits: { buildings: 12 } } });
    const input = withRegion("house", { provenance: seed }), result = parseTacticalCartography(input, map());
    (input.regions[2] as { locked: boolean }).locked = true;
    expect(result.regions[2]!.locked).toBe(false);
    expect(Object.isFrozen(result.regions[2])).toBe(true);
    const building = result.regions[2]!;
    expect(building.role).toBe("building");
    if (building.role === "building") expect(Object.isFrozen(building.attachedStampIds)).toBe(true);
    expect(Object.isFrozen(building.provenance!.optionen.limits)).toBe(true);
  });
  it.each([
    ["unknown", { material: "grass" }], ["house", { material: "grass" }], ["terrain", { lotRegionId: "lot" }],
    ["water", { material: "grass" }], ["road", { material: "asphalt" }], ["room", { attachedStampIds: ["roof"] }],
    ["house", { kindKeim: "private" }], ["house", { titel: "Secret House" }], ["house", { punkte: [[1, 2]] }],
    ["house", { assetUrl: "https://example.invalid/image" }], ["house", { canEdit: true }], ["house", { authored: 1 }],
  ])("rejects undeclared or mistyped fields on %s: %j", (id, extra) => {
    expect(() => parseTacticalCartography(withRegion(id as string, extra as Record<string, unknown>), map())).toThrow(TacticalCartographyValidationError);
  });
  it("rejects undeclared roots, new versions and missing required role fields", () => {
    expect(() => parseTacticalCartography({ ...cartography(), schemaVersion: 2 })).toThrow(/migration/);
    expect(() => parseTacticalCartography({ ...cartography(), permissions: [] })).toThrow(/migration/);
    expect(() => parseTacticalCartography({ ...cartography(), regions: [{ ...common("road"), role: "road" }] })).toThrow(/required/);
    expect(() => parseTacticalCartography({ ...cartography(), regions: [{ ...common("terrain"), role: "lava" }] })).toThrow(/expected/);
  });
  it.each([0, -1, Infinity, NaN, 32769])("rejects invalid construction cell size %s", cellSize => {
    expect(() => parseTacticalCartography({ ...cartography(), construction: { cellSize, origin: [0, 0] } })).toThrow(TacticalCartographyValidationError);
  });
  it("bounds coordinates and requires a coordinate pair", () => {
    for (const origin of [[0], [0, 0, 0], [0, 1_000_000_001]]) expect(() => parseTacticalCartography({ ...cartography(), construction: { cellSize: 100, origin } })).toThrow();
  });
  it("rejects duplicate, missing, additional and foreign-map region identities", () => {
    expect(() => parseTacticalCartography({ ...cartography(), regions: [...cartography().regions, cartography().regions[0]] }, map())).toThrow(/duplicate region/);
    expect(() => parseTacticalCartography({ ...cartography(), regions: cartography().regions.slice(0, -1) }, map())).toThrow(/exactly one role/);
    expect(() => parseTacticalCartography({ ...cartography(), regions: [...cartography().regions, { ...common("extra"), role: "generic" }] }, map())).toThrow(/exactly one role/);
    expect(() => parseTacticalCartography(cartography(), map(["other"]))).toThrow(/exactly one role/);
  });
  it("requires matching reference roles and forbids ownership cycles", () => {
    expect(() => parseTacticalCartography(withRegion("house", { lotRegionId: "road" }), map())).toThrow(/existing lot/);
    expect(() => parseTacticalCartography(withRegion("house", { streetRegionId: "house" }), map())).toThrow(/existing road/);
    expect(() => parseTacticalCartography(withRegion("house", { lotRegionId: "missing" }), map())).toThrow(/existing lot/);
  });
  it("requires existing stamp identities with exclusive, unique ownership", () => {
    expect(() => parseTacticalCartography(withRegion("house", { attachedStampIds: ["absent"] }), map())).toThrow(/existing stamp/);
    expect(() => parseTacticalCartography(withRegion("house", { attachedStampIds: ["roof", "roof"] }), map())).toThrow(/at most one/);
    const input = withRegion("unknown", { role: "building", attachedStampIds: ["roof"] });
    expect(() => parseTacticalCartography(input, map())).toThrow(/at most one/);
  });
  it("checks provenance vector consistency without treating its hash as permission", () => {
    const provenance = weltkeim({ generator: "some-tool", version: "1", seed: "one", optionen: { size: 4 } });
    expect(parseTacticalCartography(withRegion("house", { provenance }), map()).regions[2]!.provenance).toEqual(provenance);
    expect(() => parseTacticalCartography(withRegion("house", { provenance: { ...provenance, seed: "two" } }), map())).toThrow(/vector\/hash/);
    expect(() => parseTacticalCartography(withRegion("house", { provenance: { ...provenance, permissions: ["gm"] } }), map())).toThrow(/migration/);
  });
  it("keeps legacy content hashes separate and seals each different composition", () => {
    const before = cartography(), changed = withRegion("house", { locked: true }) as TacticalCartographyV1;
    const content = canonicalHash({ document: map(), anchors: [] } as unknown as CanonicalValue), first = tacticalCartographyHash(before), second = tacticalCartographyHash(changed);
    expect(first).not.toBe(second);
    expect(tacticalCompositionHash(content, first)).not.toBe(tacticalCompositionHash(content, second));
    expect(tacticalCompositionHash(content, null)).not.toBe(tacticalCompositionHash(content, first));
    expect(content).toBe(canonicalHash({ document: map(), anchors: [] } as unknown as CanonicalValue));
    expect(() => tacticalCompositionHash("wrong", first)).toThrow(/SHA-256/);
  });
  it("canonicalizes property order while preserving explicit region order", () => {
    const original = cartography(), reordered = { regions: original.regions, construction: original.construction, kind: original.kind, schemaVersion: original.schemaVersion };
    expect(serializeTacticalCartography(reordered)).toBe(serializeTacticalCartography(original));
    expect(tacticalCartographyHash(reordered)).toBe(tacticalCartographyHash(original));
  });
  it("bounds total roles, attachment references and UTF-8 bytes", () => {
    const regions = Array.from({ length: 4097 }, (_, index): CartographyRegionV1 => ({ ...common(`r${index}`), role: "generic" }));
    expect(() => parseTacticalCartography({ ...cartography(), regions })).toThrow(/4096/);
    expect(() => parseTacticalCartography(withRegion("house", { attachedStampIds: Array(50_001).fill("x") }))).toThrow(/50000/);
    expect(() => parseTacticalCartography('"' + "é".repeat(TACTICAL_CARTOGRAPHY_LIMITS.documentBytes / 2) + '"')).toThrow(/byte limit/);
  });
  it("rejects duplicate JSON keys, accessors and cycles before inspecting role fields", () => {
    expect(() => parseTacticalCartography('{"schemaVersion":1,"schemaVersion":1}')).toThrow(/duplicate/);
    let calls = 0;
    const input = Object.defineProperty({}, "regions", { enumerable: true, get() { calls++; return []; } });
    expect(() => parseTacticalCartography(input)).toThrow(/data property/); expect(calls).toBe(0);
    const cyclic: unknown[] = []; cyclic.push(cyclic); expect(() => parseTacticalCartography(cyclic)).toThrow(/cyclic/);
  });
});

describe("explicit interior ownership profile", () => {
  const interior = () => ({ schemaVersion: 1, floor: "wood", stampIds: [], wallIds: ["wall"], portalIds: ["door"], lightIds: ["light"], placeIds: ["place"], portalArtwork: [] });
  const document = (): TacticalMapDocumentV1 => ({ ...map(), geometry: { ...map().geometry, places: [{ id: "place", x: 550, y: 50 }] },
    walls: [{ id: "wall", kind: "wall", points: [[500, 0], [580, 0]], elevation: 0 }],
    portals: [{ id: "door", position: [550, 0], bounds: [[540, 0], [560, 0]], rotationRadians: 0, closed: true, freestanding: false, elevation: 0 }],
    lights: [{ id: "light", position: [550, 50], range: 40, intensity: .5, colorArgb: "ffffffff", shadows: true, elevation: 0 }] });
  it("roundtrips explicit ownership while preserving old records and rejecting absent geometry", () => {
    const old = serializeTacticalCartography(cartography());
    const owned = withRegion("room", { interior: interior() }), parsed = parseTacticalCartography(owned, document());
    expect(parseTacticalCartography(serializeTacticalCartography(parsed), document())).toEqual(parsed);
    expect(serializeTacticalCartography(cartography())).toBe(old);
    for (const field of ["wallIds", "portalIds", "lightIds", "placeIds", "stampIds"]) {
      expect(() => parseTacticalCartography(withRegion("room", { interior: { ...interior(), [field]: ["absent"] } }), document())).toThrow(/existing/);
    }
  });
  it("requires a supported version, closed fields and unique local references", () => {
    for (const extra of [{ schemaVersion: 2 }, { floor: "lava" }, { permissions: true }, { wallIds: ["wall", "wall"] }]) {
      expect(() => parseTacticalCartography(withRegion("room", { interior: { ...interior(), ...extra } }), document())).toThrow();
    }
    expect(() => parseTacticalCartography(withRegion("house", { interior: interior() }), document())).toThrow(/migration/);
  });
  it("allows two room owners per boundary while retaining exclusive furniture, light and place ownership", () => {
    const primary = withRegion("room", { interior: interior() });
    const share = (extra: Record<string, unknown>) => ({ ...primary, regions: primary.regions.map(role => role.regionId === "unknown" ? { regionId: role.regionId, role: "room", authored: true, locked: false, provenance: null, interior: { ...interior(), stampIds: [], lightIds: [], placeIds: [], ...extra } } : role) });
    expect(() => parseTacticalCartography(share({}), document())).not.toThrow();
    for (const field of ["lightIds", "placeIds"]) expect(() => parseTacticalCartography(share({ [field]: interior()[field as "lightIds" | "placeIds"] }), document())).toThrow(/at most one/);
    const three = share({});
    const tripled = { ...three, regions: three.regions.map(role => role.regionId === "lot" ? { regionId: role.regionId, role: "room", authored: true, locked: false, provenance: null, interior: { ...interior(), lightIds: [], placeIds: [] } } : role) };
    expect(() => parseTacticalCartography(tripled, document())).toThrow(/at most two/);
    expect(() => parseTacticalCartography(withRegion("room", { interior: { ...interior(), stampIds: ["roof"] } }), document())).toThrow(/at most one/);
  });
  it("limits painted doorway associations to their explicit room-owned stamp and portal", () => {
    expect(() => parseTacticalCartography(withRegion("room", { interior: { ...interior(), portalArtwork: [{ portalId: "foreign", stampIds: [] }] } }), document())).toThrow(/owned portal/);
    expect(() => parseTacticalCartography(withRegion("room", { interior: { ...interior(), portalArtwork: [{ portalId: "door", stampIds: ["roof"] }] } }), document())).toThrow(/owned stamp/);
  });
});

describe("evidence-based legacy cartography", () => {
  const nodes: NonNullable<LegacyCartographyEvidence["nodes"]> = [{ id: "house" as KnotenId, art: "bauwerk" }, { id: "room" as KnotenId, art: "raum" }];
  it("keeps arbitrary imported and newly drawn polygons generic, independently of shape/name/order", () => {
    const document = map(["road", "water", "house"]), before = serializeTacticalMapDocument(document);
    expect(inferLegacyCartography(document).regions.map(region => region.role)).toEqual(["generic", "generic", "generic"]);
    expect(serializeTacticalMapDocument(document)).toBe(before);
  });
  it("uses matching building/room nodes and never invents full generator provenance", () => {
    const result = inferLegacyCartography(map(), { nodes });
    expect(result.regions.find(region => region.regionId === "house")!.role).toBe("building");
    expect(result.regions.find(region => region.regionId === "room")!.role).toBe("room");
    expect(result.regions.find(region => region.regionId === "road")!.role).toBe("generic");
    expect(result.regions.every(region => region.provenance === null)).toBe(true);
    expect(result.construction).toEqual({ cellSize: 100, origin: [20, 30] });
  });
  it("recognizes only retained original settlement roads and preserves new generic terrain", () => {
    const original = map(["road", "house"]), document = map(["new-water", "house", "road"]);
    const result = inferLegacyCartography(document, { nodes, settlement: { generator: "chronicle-siedlung", version: "4", originalDocument: original, buildingRegionIds: ["house"] } });
    expect(result.regions.map(region => region.role)).toEqual(["generic", "building", "road"]);
  });
  it("requires complete matching original building evidence, never just absent nodes", () => {
    const settlement = { generator: "chronicle-siedlung", version: "4", originalDocument: map(["road", "house"]), buildingRegionIds: ["house"] } as const;
    expect(() => inferLegacyCartography(map(), { settlement })).toThrow(/matching stored building/);
    expect(() => inferLegacyCartography(map(), { nodes, settlement: { ...settlement, buildingRegionIds: [] } })).toThrow(/complete original/);
    expect(() => inferLegacyCartography(map(), { nodes, settlement: { ...settlement, buildingRegionIds: ["missing"] } })).toThrow(/complete original/);
    expect(() => inferLegacyCartography(map(), { nodes: [...nodes, nodes[0]!] })).toThrow(/duplicate node/);
  });
  it("supports gridless legacy documents without persisting an inferred upgrade", () => {
    const result = inferLegacyCartography({ ...map([]), grid: { kind: "none" } });
    expect(result.construction).toEqual({ cellSize: 100, origin: [0, 0] }); expect(result.regions).toEqual([]);
  });
});

describe("relief: the land's height as an optional, hashed part of the cartography", () => {
  const relief = (heights: number[], columns = 3, rows = 2, seaLevel = 77) => ({ schemaVersion: 1 as const, columns, rows, seaLevel, heights });
  it("leaves documents without relief byte- and hash-identical to before", () => {
    const document = map(), plain = cartography();
    expect(serializeTacticalCartography(plain)).not.toContain("relief");
    expect(parseTacticalCartography(plain, document)).not.toHaveProperty("relief");
    const withRelief = { ...plain, relief: relief([0, 50, 100, 150, 200, 255]) };
    const parsed = parseTacticalCartography(withRelief, document);
    expect(parsed.relief).toEqual(withRelief.relief);
    expect(Object.isFrozen(parsed.relief!.heights)).toBe(true);
    expect(tacticalCartographyHash(withRelief)).not.toBe(tacticalCartographyHash(plain));
    expect(parseTacticalCartography(serializeTacticalCartography(withRelief), document)).toEqual(parsed);
  });
  it.each([
    ["wrong sample count", relief([1, 2, 3])],
    ["fraction", relief([0, 1.5, 2, 3, 4, 5])],
    ["out of range", relief([0, 1, 2, 3, 4, 256])],
    ["negative", relief([0, 1, 2, 3, 4, -1])],
    ["one column", relief([1, 2], 1, 2)],
    ["sea level", relief([0, 1, 2, 3, 4, 5], 3, 2, 300)],
    ["unknown profile", { ...relief([0, 1, 2, 3, 4, 5]), schemaVersion: 2 }],
    ["extra property", { ...relief([0, 1, 2, 3, 4, 5]), unit: "m" }],
    ["over budget", relief(new Array(1025 * 65).fill(0), 1025, 65)],
  ])("rejects a malformed relief instead of storing it: %s", (_name, value) => {
    expect(() => parseTacticalCartography({ ...cartography(), relief: value }, map())).toThrow(TacticalCartographyValidationError);
  });
  it("samples bilinearly on construction-cell corners and holds the edge value outside", () => {
    const value = { ...cartography(), relief: relief([0, 100, 200, 0, 100, 200]) };
    const construction = value.construction;
    expect(reliefHeightAt(value.relief, construction, 0, 0)).toBe(0);
    expect(reliefHeightAt(value.relief, construction, 100, 0)).toBe(100);
    expect(reliefHeightAt(value.relief, construction, 50, 50)).toBe(50);
    expect(reliefHeightAt(value.relief, construction, 150, 100)).toBe(150);
    expect(reliefHeightAt(value.relief, construction, -500, -500)).toBe(0);
    expect(reliefHeightAt(value.relief, construction, 5000, 5000)).toBe(200);
  });
  it("makes a flat relief covering the whole map for maps that never had one", () => {
    const flat = flatRelief({ cellSize: 100, origin: [0, 0] }, [1000, 850]);
    expect([flat.columns, flat.rows]).toEqual([11, 10]);
    expect(flat.heights).toHaveLength(110);
    expect(new Set(flat.heights).size).toBe(1);
    expect(flat.heights[0]).toBeGreaterThan(flat.seaLevel);
    expect(parseTacticalCartography({ ...cartography(), relief: flat }, map()).relief).toEqual(flat);
    expect(RELIEF_LEVELS.rockAbove).toBeLessThan(RELIEF_LEVELS.snowAbove);
  });
});

describe("mood: night, winter and autumn belong to the map, day is its absence", () => {
  it("accepts every mood but day, keeps a map without one byte-identical, and hashes the mood", () => {
    const document = map(), plain = cartography();
    expect(serializeTacticalCartography(plain)).not.toContain("mood");
    for (const mood of ["nacht", "winter", "herbst"] as const) {
      const parsed = parseTacticalCartography({ ...plain, mood }, document);
      expect(parsed.mood).toBe(mood);
      expect(tacticalCartographyHash({ ...plain, mood })).not.toBe(tacticalCartographyHash(plain));
      expect(parseTacticalCartography(serializeTacticalCartography({ ...plain, mood }), document)).toEqual(parsed);
    }
    expect(() => parseTacticalCartography({ ...plain, mood: "tag" }, document)).toThrow(TacticalCartographyValidationError);
    expect(() => parseTacticalCartography({ ...plain, mood: "daemmerung" }, document)).toThrow(TacticalCartographyValidationError);
    expect(() => parseTacticalCartography({ ...plain, mood: 2 }, document)).toThrow(TacticalCartographyValidationError);
  });
});

describe("free names: a river's, a wood's, a region's, with the line each follows", () => {
  const name = (over: Record<string, unknown> = {}): CartographyLabelV1 => ({ id: "silberbach", text: "Silberbach", points: [[10, 10], [110, 10], [110, 60]], size: 40, style: "wasser", ...over }) as CartographyLabelV1;
  it("keeps a map without names byte-identical, stores and hashes them, and hangs each from the middle of its line", () => {
    const document = map(), plain = cartography();
    expect(serializeTacticalCartography(plain)).not.toContain("labels");
    const named = { ...plain, labels: [name(), name({ id: "feste", text: "Alte Feste", points: [[30, 30]], style: "ort" })] };
    const parsed = parseTacticalCartography(named, document);
    expect(parsed.labels).toEqual(named.labels);
    expect(tacticalCartographyHash(named)).not.toBe(tacticalCartographyHash(plain));
    expect(parseTacticalCartography(serializeTacticalCartography(named), document)).toEqual(parsed);
    expect(cartographyLabelAnchor(name())).toEqual([85, 10]);
    expect(cartographyLabelAnchor({ points: [[30, 30]] })).toEqual([30, 30]);
    expect(cartographyLabelAnchor({ points: [[5, 5], [5, 5]] })).toEqual([5, 5]);
  });
  it.each([
    ["empty text", [name({ text: "   " })]],
    ["long text", [name({ text: "x".repeat(81) })]],
    ["no points", [name({ points: [] })]],
    ["too many points", [name({ points: Array.from({ length: 65 }, (_, k) => [k, 0]) })]],
    ["bad point", [name({ points: [[1, 2, 3]] })]],
    ["tiny size", [name({ size: 0 })]],
    ["unknown style", [name({ style: "fett" })]],
    ["extra property", [name({ farbe: "rot" })]],
    ["duplicate identity", [name(), name({ text: "Zweimal" })]],
    ["not a list", "Silberbach"],
  ])("rejects %s", (_reason, labels) => {
    expect(() => parseTacticalCartography({ ...cartography(), labels }, map())).toThrow(TacticalCartographyValidationError);
  });
});
