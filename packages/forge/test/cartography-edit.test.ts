// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { describe, expect, it } from "vitest";
import { parseTacticalMapDocument, weltkeim, type Region } from "@chronicle/szene";
import { flatRelief, parseTacticalCartography, RELIEF_LEVELS, type CartographyReliefV1, type CartographyRegionV1 } from "@chronicle/szene";
import { applyCartographyEdit, type CartographyEditOperation } from "../src/cartography-edit.ts";

const box = (id: string, x: number, y: number, w: number, h: number): Region => ({ id, punkte: [[x, y], [x + w, y], [x + w, y + h], [x, y + h]] });
const base = { authored: false, locked: false, provenance: null } as const;
const terrain = (regionId: string): Extract<CartographyRegionV1, { role: "terrain" }> => ({ ...base, regionId, role: "terrain", material: "grass" });
function fixture(regions: readonly Region[], roles: readonly CartographyRegionV1[]) {
  const document = parseTacticalMapDocument({ schemaVersion: 1, kind: "tactical-map", coordinates: "image-pixels",
    frame: { ursprung: [0, 0], einheitenProPixel: 1, ordnung: "xy", hoch: "unten" },
    geometry: { v: 3, size: [200, 200], regions, stamps: [], places: [] }, grid: { kind: "none" },
    elevation: 0, geometryElevation: [], walls: [], portals: [], lights: [],
    environment: { bakedLighting: false, ambientLightArgb: "ffffffff" }, background: null });
  const cartography = parseTacticalCartography({ schemaVersion: 1, kind: "tactical-cartography", construction: { cellSize: 20, origin: [0, 0] }, regions: roles }, document);
  return { document, cartography, protectedRegionIds: [] as string[], seed: "test-variant", operationId: "gesture-1" };
}
const street = { ...base, regionId: "street", role: "road", material: "street" } as const;
const house = { ...base, regionId: "house", role: "building", streetRegionId: "street" } as const;
const village = () => fixture([box("street", 0, 0, 20, 200), box("house", 40, 40, 20, 20)], [street, house]);
const area = (region: Region) => Math.abs(region.punkte.reduce((sum, point, i) => { const next = region.punkte[(i + 1) % region.punkte.length]!; return sum + point[0] * next[1] - next[0] * point[1]; }, 0)) / 2;

describe("atomic cartography edit operations", () => {
  it("permits a freely placed cottage without a road while retaining collision and protected-place checks", () => {
    const input = fixture([], []), operation = { kind: "building", at: [60, 60], width: 30, height: 20, typ: "haus", titel: "Waldhütte", requireRoad: false } as const;
    const result = applyCartographyEdit({ ...input, operation }); expect(result.ok).toBe(true);
    if (!result.ok) return;
    const id = result.addedBuildings[0]!.regionId;
    expect(result.cartography.regions[0]).not.toHaveProperty("streetRegionId");
    expect(applyCartographyEdit({ ...input, ...result, operationId: "moved", operation: { kind: "transform", regionId: id, delta: [50, 30], quarterTurns: 1 } }).ok).toBe(true);
    expect(applyCartographyEdit({ ...input, ...result, operationId: "overlap", operation })).toMatchObject({ ok: false, code: "contradiction" });
    const water = fixture([box("water", 30, 30, 80, 80)], [{ ...base, regionId: "water", role: "water", material: "lake" }]);
    expect(applyCartographyEdit({ ...water, operation })).toMatchObject({ ok: false, code: "contradiction" });
    const locked = fixture([box("land", 30, 30, 80, 80)], [{ ...terrain("land"), locked: true }]);
    expect(applyCartographyEdit({ ...locked, operation })).toMatchObject({ ok: false, code: "protected" });
    expect(applyCartographyEdit({ ...input, operation: { ...operation, requireRoad: true } })).toMatchObject({ ok: false, code: "contradiction" });
  });
  it("paints the chosen kind of water and rejects an unknown one instead of writing it into the map", () => {
    const input = fixture([box("ground", 0, 0, 200, 200)], [terrain("ground")]);
    const paint = (water?: string) => applyCartographyEdit({ ...input,
      operation: { kind: "terrain", points: [[50, 50]], radius: 5, material: "water", ...(water === undefined ? {} : { water }) } as CartographyEditOperation });
    const materials = (result: ReturnType<typeof paint>) => result.ok ? result.cartography.regions.filter(role => role.role === "water").map(role => role.material) : [];
    for (const water of ["lake", "sea", "river"] as const) expect(materials(paint(water)), water).toEqual([water]);
    // Callers from before the option keep painting a river, which is what they always painted.
    expect(materials(paint())).toEqual(["river"]);
    expect(paint("swamp")).toMatchObject({ ok: false, code: "invalid" });
  });
  it("paints only the local module, keeps outside objects byte-identical and conserves surface coverage", () => {
    const input = fixture([box("ground", 0, 0, 100, 100), box("outside", 150, 150, 20, 20)], [terrain("ground"), terrain("outside")]);
    const before = JSON.stringify(input), operation: CartographyEditOperation = { kind: "terrain", points: [[30, 30]], radius: 2, material: "forest" };
    const result = applyCartographyEdit({ ...input, operation }); expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.document.geometry.regions.find(value => value.id === "outside")).toEqual(input.document.geometry.regions[1]);
    expect(result.changedRegionIds).not.toContain("outside"); expect(result.document.geometry.regions.reduce((sum, value) => sum + area(value), 0)).toBe(10_400);
    expect(result.cartography.regions.filter(value => value.role === "terrain" && value.material === "forest")).toHaveLength(1);
    expect(applyCartographyEdit({ ...input, operation })).toEqual(result); expect(JSON.stringify(input)).toBe(before);
  });
  it("preserves authored, locked and child-linked objects during variation", () => {
    const roles = [terrain("manual"), terrain("locked"), terrain("child"), terrain("free")].map(role => ({ ...role, authored: role.regionId === "manual", locked: role.regionId === "locked" }));
    const input = fixture(roles.map((role, i) => box(role.regionId, i * 30, 0, 20, 20)), roles);
    const result = applyCartographyEdit({ ...input, protectedRegionIds: ["child"], operation: { kind: "variation", regionIds: ["manual", "locked", "child", "free"] } });
    expect(result.ok).toBe(true);
    if (result.ok) { expect(result.changedRegionIds).toEqual(["free"]); expect(result.diagnostics).toHaveLength(3); for (const id of ["manual", "locked", "child"]) expect(result.cartography.regions.find(value => value.regionId === id)).toEqual(input.cartography.regions.find(value => value.regionId === id)); }
  });
  it("allows explicit movement of an authored child-linked house without changing its identity", () => {
    const input = village();
    const cartography = parseTacticalCartography({ ...input.cartography, regions: [street, { ...house, authored: true }] }, input.document);
    const result = applyCartographyEdit({ ...input, cartography, protectedRegionIds: ["house"], operation: { kind: "transform", regionId: "house", delta: [-5, 0], quarterTurns: 1 } });
    expect(result.ok).toBe(true);
    if (result.ok) { expect(result.changedRegionIds).toEqual(["house"]); expect(result.addedBuildings).toEqual([]); expect(result.removedRegionIds).toEqual([]); expect(result.cartography.regions.find(value => value.regionId === "house")).toMatchObject({ role: "building", authored: true, streetRegionId: "street" }); }
  });
  it("refuses deletion and painting of a protected entrance, without partial mutation", () => {
    const input = { ...village(), protectedRegionIds: ["house"] }, before = JSON.stringify(input);
    for (const operation of [{ kind: "remove", regionId: "house" }, { kind: "terrain", points: [[50, 50]], radius: 5, material: "water" }] as const) {
      const result = applyCartographyEdit({ ...input, operation }); expect(result).toMatchObject({ ok: false, code: "protected" }); expect(result).not.toHaveProperty("document");
    }
    expect(JSON.stringify(input)).toBe(before);
  });
  it("removes attached stamps and their elevation references, reporting IDs for anchor cleanup", () => {
    const input = village(), document = parseTacticalMapDocument({ ...input.document, geometry: { ...input.document.geometry, stamps: [
      { id: "roof", a: "pk.test/roof", x: 50, y: 50, s: 1, r: 0, l: 40 }, { id: "other", a: "pk.test/tree", x: 150, y: 150, s: 1, r: 0, l: 0 },
    ] }, geometryElevation: [{ targetKind: "region", targetId: "house", elevation: 1 }, { targetKind: "stamp", targetId: "roof", elevation: 2 }, { targetKind: "stamp", targetId: "other", elevation: 3 }] });
    const cartography = parseTacticalCartography({ ...input.cartography, regions: [street, { ...house, attachedStampIds: ["roof"] }] }, document);
    const result = applyCartographyEdit({ ...input, document, cartography, operation: { kind: "remove", regionId: "house" } });
    expect(result.ok).toBe(true);
    if (result.ok) { expect(result.removedStampIds).toEqual(["roof"]); expect(result.removedRegionIds).toEqual(["house"]); expect(result.document.geometry.stamps.map(value => value.id)).toEqual(["other"]); expect(result.document.geometryElevation).toEqual([{ targetKind: "stamp", targetId: "other", elevation: 3 }]); }
  });
  it("places a typed building on dry ground beside a street and refuses collisions or isolation", () => {
    const input = village(), operation = { kind: "building", at: [45, 100], width: 20, height: 20, typ: "taverne", titel: "Zum Tor" } as const;
    const result = applyCartographyEdit({ ...input, operation }); expect(result.ok).toBe(true);
    if (result.ok) expect(result.addedBuildings).toEqual([{ regionId: result.changedRegionIds[0], titel: "Zum Tor", typ: "taverne" }]);
    expect(applyCartographyEdit({ ...input, operation: { ...operation, at: [50, 50] } })).toMatchObject({ ok: false, code: "contradiction" });
    expect(applyCartographyEdit({ ...input, operation: { ...operation, at: [150, 100] } })).toMatchObject({ ok: false, code: "contradiction" });
  });
  it("rejects a dry house footprint when water blocks its only street access", () => {
    const input = fixture([box("street", 0, 0, 20, 200), box("moat", 22, 0, 8, 200)], [street, { ...base, regionId: "moat", role: "water", material: "river" }]);
    expect(applyCartographyEdit({ ...input, operation: { kind: "building", at: [45, 90], width: 20, height: 20, titel: "Am Graben", typ: "haus" } })).toMatchObject({ ok: false, code: "contradiction" });
  });
  it("rejects a road island with no connection to the map edge or an established building address", () => {
    const input = fixture([box("street", 80, 40, 20, 100)], [street]);
    expect(applyCartographyEdit({ ...input, operation: { kind: "building", at: [115, 90], width: 20, height: 20, titel: "Insel", typ: "haus" } })).toMatchObject({ ok: false, code: "contradiction" });
  });
  it("builds a new connected road from the map edge and places a house beside that network", () => {
    const input = fixture([], []), road = applyCartographyEdit({ ...input, operation: { kind: "road", points: [[0, 90], [130, 90]], width: 8, material: "path" } });
    expect(road.ok).toBe(true); if (!road.ok) return;
    const result = applyCartographyEdit({ ...input, document: road.document, cartography: road.cartography, operationId: "house-after-road", operation: { kind: "building", at: [70, 112], width: 12, height: 12, titel: "Neubau", typ: "haus" } });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.addedBuildings).toHaveLength(1);
  });
  it("clears claimed generator provenance on manual mutations while retaining untouched evidence", () => {
    const origin = weltkeim({ generator: "test-cartography", version: "1", seed: "original", optionen: {} });
    const input = fixture([box("ground", 0, 0, 100, 100), box("outside", 150, 150, 20, 20)], [{ ...terrain("ground"), provenance: origin }, { ...terrain("outside"), provenance: origin }]);
    const result = applyCartographyEdit({ ...input, operation: { kind: "terrain", points: [[30, 30]], radius: 2, material: "forest" } });
    expect(result.ok).toBe(true); if (!result.ok) return;
    for (const role of result.cartography.regions) expect(role.provenance).toEqual(role.regionId === "outside" ? origin : null);
    const town = village(), cartography = parseTacticalCartography({ ...town.cartography, regions: [street, { ...house, provenance: origin }] }, town.document);
    const transformed = applyCartographyEdit({ ...town, cartography, operation: { kind: "transform", regionId: "house", delta: [-5, 0] } });
    expect(transformed.ok).toBe(true);
    if (transformed.ok) expect(transformed.cartography.regions.find(role => role.regionId === "house")?.provenance).toBeNull();
  });
  it("rejects a partial overlap even when both house rectangles have identical top and bottom edges", () => {
    const input = fixture([box("street", 0, 0, 200, 20), box("house", 40, 40, 20, 20)], [street, house]);
    expect(applyCartographyEdit({ ...input, operation: { kind: "building", at: [65, 50], width: 20, height: 20, titel: "Überlappung", typ: "haus" } })).toMatchObject({ ok: false, code: "contradiction" });
  });
  it("preserves the water underneath an automatically connected bridge", () => {
    const input = fixture([box("river", 80, 0, 20, 200)], [{ ...base, regionId: "river", role: "water", material: "river" }]);
    const result = applyCartographyEdit({ ...input, operation: { kind: "road", points: [[50, 90], [130, 90]], width: 8, material: "path" } });
    expect(result.ok).toBe(true);
    if (result.ok) { expect(result.cartography.regions.some(value => value.role === "road" && value.material === "bridge")).toBe(true); expect(result.document.geometry.regions.find(value => value.id === "river")).toEqual(input.document.geometry.regions[0]); }
  });
  it("keeps an existing road continuous when a new river crosses it, with an explicit bridge", () => {
    const input = fixture([box("street", 0, 86, 200, 8)], [street]);
    const result = applyCartographyEdit({ ...input, operation: { kind: "terrain", points: [[90, 50], [90, 130]], radius: 2, material: "water" } });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.cartography.regions.some(value => value.role === "road" && value.material === "bridge")).toBe(true);
    expect(result.document.geometry.regions.find(value => value.id === "street")).toEqual(input.document.geometry.regions[0]);
  });
  it("connects a new branch to an established street without losing its building address", () => {
    const input = village(), result = applyCartographyEdit({ ...input, protectedRegionIds: ["house"], operation: { kind: "road", points: [[10, 90], [130, 90]], width: 8, material: "path" } });
    expect(result.ok).toBe(true); if (!result.ok) return;
    expect(result.document.geometry.regions.find(region => region.id === "street")).toEqual(input.document.geometry.regions[0]);
    expect(result.cartography.regions.find(role => role.regionId === "house")).toEqual(house);
    expect(result.removedRegionIds).toEqual([]);
  });
  it("retains an unpainted hole when adjacent brush modules form a ring", () => {
    const input = fixture([], []), result = applyCartographyEdit({ ...input, operation: { kind: "terrain", points: [[30, 30], [70, 30], [70, 70], [30, 70], [30, 30]], radius: 2, material: "forest" } });
    expect(result.ok).toBe(true); if (!result.ok) return;
    expect(result.document.geometry.regions.reduce((sum, region) => sum + area(region), 0)).toBe(3200);
    expect(result.document.geometry.regions.every(region => !(Math.min(...region.punkte.map(p => p[0])) < 50 && Math.max(...region.punkte.map(p => p[0])) > 50 && Math.min(...region.punkte.map(p => p[1])) < 50 && Math.max(...region.punkte.map(p => p[1])) > 50))).toBe(true);
  });
  it("draws the constrained road ports as narrow connected geometry instead of full square tiles", () => {
    const input = fixture([box("ground", 0, 0, 200, 200)], [terrain("ground")]);
    const result = applyCartographyEdit({ ...input, operation: { kind: "road", points: [[50, 90], [130, 90]], width: 8, material: "path" } });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.document.geometry.regions.find(value => value.id === "ground")).toEqual(input.document.geometry.regions[0]);
    const roads = result.document.geometry.regions.filter(value => value.id !== "ground");
    expect(roads).toHaveLength(1);
    for (const road of roads) { expect(Math.max(...road.punkte.map(point => point[1])) - Math.min(...road.punkte.map(point => point[1]))).toBe(8); expect(area(road)).toBe(704); }
    for (let i = 1; i < roads.length; i++) expect(Math.max(...roads[i - 1]!.punkte.map(point => point[0]))).toBe(Math.min(...roads[i]!.punkte.map(point => point[0])));
  });
  it("does not sever an existing outside road by painting its middle as grass", () => {
    const input = fixture([box("street", 0, 80, 200, 20)], [street]);
    expect(applyCartographyEdit({ ...input, operation: { kind: "terrain", points: [[90, 90]], radius: 2, material: "grass" } })).toMatchObject({ ok: false, code: "contradiction" });
  });
  it("repaints a generated concave woodland locally without asking the user to decompose polygons", () => {
    const input = fixture([{ id: "wood", punkte: [[0, 0], [100, 0], [100, 40], [40, 40], [40, 100], [0, 100]] }], [{ ...terrain("wood"), material: "forest" }]);
    const result = applyCartographyEdit({ ...input, operation: { kind: "terrain", points: [[30, 30]], radius: 2, material: "grass" } });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.document.geometry.regions.reduce((sum, region) => sum + area(region), 0)).toBe(6400);
  });
  it("returns an explicit budget failure without partial geometry", () => {
    const input = fixture([], []), result = applyCartographyEdit({ ...input, operation: { kind: "terrain", points: [[50, 50]], radius: 25, material: "grass" }, limits: { cells: 1 } });
    expect(result).toMatchObject({ ok: false, code: "budget" }); expect(result).not.toHaveProperty("document");
  });
});

describe("the height tool shapes the relief and the terrain brush keeps it honest", () => {
  const withRelief = () => {
    const input = fixture([box("land", 0, 0, 200, 200)], [terrain("land")]);
    const relief = flatRelief(input.cartography.construction, input.document.geometry.size);
    return { ...input, cartography: parseTacticalCartography({ ...input.cartography, relief }, input.document), relief };
  };
  const at = (relief: CartographyReliefV1, i: number, j: number) => relief.heights[j * relief.columns + i]!;
  it("creates a flat relief for a map without one and raises only the land inside the brush", () => {
    const input = fixture([box("land", 0, 0, 200, 200)], [terrain("land")]);
    expect(input.cartography.relief).toBeUndefined();
    const result = applyCartographyEdit({ ...input, operation: { kind: "relief", points: [[100, 100]], radius: 40, mode: "raise", strength: 1 } });
    expect(result.ok).toBe(true); if (!result.ok) return;
    const relief = result.cartography.relief!, flat = flatRelief(input.cartography.construction, input.document.geometry.size);
    expect([relief.columns, relief.rows]).toEqual([flat.columns, flat.rows]);
    expect(at(relief, 5, 5)).toBeGreaterThan(at(flat, 5, 5));
    expect(at(relief, 6, 5)).toBeGreaterThan(at(flat, 6, 5));
    expect(at(relief, 0, 0)).toBe(at(flat, 0, 0));
    expect(at(relief, 10, 10)).toBe(at(flat, 10, 10));
    expect(relief.heights.every(h => Number.isInteger(h) && h >= 0 && h <= 255)).toBe(true);
    expect(result.changedRegionIds).toEqual([]); expect(result.document).toEqual(input.document);
  });
  it("lowers, levels towards the first point and smooths towards the neighbours", () => {
    const input = withRelief();
    const lowered = applyCartographyEdit({ ...input, operation: { kind: "relief", points: [[100, 100]], radius: 40, mode: "lower", strength: 1 } });
    expect(lowered.ok && at(lowered.cartography.relief!, 5, 5)).toBeLessThan(at(input.relief, 5, 5));
    const raised = applyCartographyEdit({ ...input, operation: { kind: "relief", points: [[100, 100]], radius: 60, mode: "raise", strength: 1 } });
    if (!raised.ok) throw new Error(raised.message);
    const peak = at(raised.cartography.relief!, 5, 5);
    const levelled = applyCartographyEdit({ ...input, ...raised, operationId: "level", operation: { kind: "relief", points: [[20, 20], [100, 100]], radius: 60, mode: "level", strength: 1 } });
    expect(levelled.ok && at(levelled.cartography.relief!, 5, 5)).toBeLessThan(peak);
    const smoothed = applyCartographyEdit({ ...input, ...raised, operationId: "smooth", operation: { kind: "relief", points: [[100, 100]], radius: 60, mode: "smooth", strength: 1 } });
    expect(smoothed.ok && at(smoothed.cartography.relief!, 5, 5)).toBeLessThan(peak);
    expect(smoothed.ok && at(smoothed.cartography.relief!, 5, 5)).toBeGreaterThan(at(input.relief, 5, 5));
  });
  it("sinks the land under painted water, lifts it under painted rock and leaves it under grass", () => {
    // The stroke sits on a cell centre: (110, 110) is the middle of construction cell (5, 5).
    const input = withRelief(), stroke = { points: [[110, 110]] as const, radius: 10 };
    const water = applyCartographyEdit({ ...input, operation: { kind: "terrain", ...stroke, material: "water", water: "lake" } });
    if (!water.ok) throw new Error(water.message);
    expect(at(water.cartography.relief!, 5, 5)).toBeLessThan(input.relief.seaLevel);
    expect(at(water.cartography.relief!, 0, 0)).toBe(at(input.relief, 0, 0));
    const rock = applyCartographyEdit({ ...input, operation: { kind: "terrain", ...stroke, material: "rock" } });
    if (!rock.ok) throw new Error(rock.message);
    expect(at(rock.cartography.relief!, 5, 5)).toBeGreaterThan(input.relief.seaLevel + RELIEF_LEVELS.rockAbove);
    const grass = applyCartographyEdit({ ...input, operation: { kind: "terrain", ...stroke, material: "grass" } });
    expect(grass.ok && grass.cartography.relief).toEqual(input.relief);
    const plain = fixture([box("land", 0, 0, 200, 200)], [terrain("land")]);
    const painted = applyCartographyEdit({ ...plain, operation: { kind: "terrain", ...stroke, material: "water", water: "lake" } });
    expect(painted.ok && painted.cartography.relief).toBeUndefined();
  });
  it("passes the relief through every other operation and refuses a malformed stroke", () => {
    const input = withRelief();
    const built = applyCartographyEdit({ ...input, operation: { kind: "building", at: [60, 60], width: 30, height: 20, typ: "haus", titel: "Hütte", requireRoad: false } });
    if (!built.ok) throw new Error(built.message);
    expect(built.cartography.relief).toEqual(input.relief);
    const removed = applyCartographyEdit({ ...input, ...built, operationId: "gone", operation: { kind: "remove", regionId: built.addedBuildings[0]!.regionId } });
    expect(removed.ok && removed.cartography.relief).toEqual(input.relief);
    for (const operation of [
      { kind: "relief", points: [[100, 100]], radius: 40, mode: "raise", strength: 2 },
      { kind: "relief", points: [[100, 100]], radius: 40, mode: "dig", strength: 1 },
      { kind: "relief", points: [[100, 100]], radius: 20 * 17, mode: "raise", strength: 1 },
      { kind: "relief", points: [[-5, 100]], radius: 40, mode: "raise", strength: 1 },
      { kind: "relief", points: [], radius: 40, mode: "raise", strength: 1 },
    ] as const) expect(applyCartographyEdit({ ...input, operation: operation as unknown as CartographyEditOperation })).toMatchObject({ ok: false, code: "invalid" });
  });
});
