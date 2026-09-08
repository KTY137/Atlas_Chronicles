// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseAssetpaket, parseTacticalCartography, parseTacticalMapDocument, type TacticalCartographyV1, type TacticalMapDocumentV1 } from "@chronicle/szene";
import { applyInteriorEdit, type InteriorEditInput, type InteriorEditOperation, type InteriorEditResult } from "../src/interior-edit.ts";
import { applyCartographyEdit } from "../src/cartography-edit.ts";
import { erzeugeGrundriss } from "../src/grundriss.ts";

const pack = parseAssetpaket(readFileSync(new URL("../../../assets/packs/pk.grundriss/paket.json", import.meta.url), "utf8"));
function fixture(): Omit<InteriorEditInput, "operation"> {
  const document = parseTacticalMapDocument({ schemaVersion: 1, kind: "tactical-map", coordinates: "image-pixels", frame: { ursprung: [0, 0], einheitenProPixel: 1, ordnung: "xy", hoch: "unten" },
    geometry: { v: 3, size: [800, 600], regions: [], stamps: [], places: [] }, grid: { kind: "square", size: 40, origin: [0, 0] }, elevation: 0, geometryElevation: [], walls: [], portals: [], lights: [], environment: { bakedLighting: false, ambientLightArgb: "ffffffff" }, background: null });
  return { document, cartography: { schemaVersion: 1, kind: "tactical-cartography", construction: { cellSize: 40, origin: [0, 0] }, regions: [] }, operationId: "first", protectedRegionIds: [], assets: pack };
}
function success(result: InteriorEditResult): Extract<InteriorEditResult, { ok: true }> { expect(result.ok, !result.ok ? result.message : "").toBe(true); if (!result.ok) throw Error(result.message); return result; }
const drawRoom = (extra: Partial<Extract<InteriorEditOperation, { kind: "room" }>> = {}) => success(applyInteriorEdit({ ...fixture(), operation: { kind: "room", from: [40, 40], to: [240, 240], ...extra } }));
const edit = (state: { document: TacticalMapDocumentV1; cartography: TacticalCartographyV1 }, operation: InteriorEditOperation, operationId = "next") => applyInteriorEdit({ ...fixture(), ...state, operation, operationId });

describe("interior construction and identity", () => {
  it("creates a named room with real walls, explicit ownership and furniture", () => {
    const result = drawRoom({ template: "bedroom", titel: "Gästezimmer" });
    expect(result.document.walls).toHaveLength(4);
    expect(result.document.geometry.stamps.length).toBeGreaterThan(0);
    expect(result.addedRooms).toEqual([{ regionId: result.document.geometry.regions[0]!.id, titel: "Gästezimmer" }]);
    expect(parseTacticalCartography(result.cartography, result.document)).toEqual(result.cartography);
  });
  it("moves explicit room contents while preserving child identity and unowned overlapping artwork", () => {
    const created = drawRoom({ template: "bedroom" }), id = created.addedRooms[0]!.regionId;
    const loose = { id: "loose", a: "pk.grundriss/test", x: 100, y: 100, s: 1, r: 0, l: 1 };
    const document = { ...created.document, geometry: { ...created.document.geometry, stamps: [...created.document.geometry.stamps, loose] } };
    const before = JSON.stringify(document);
    const moved = success(applyInteriorEdit({ ...fixture(), document, cartography: created.cartography, protectedRegionIds: [id], operationId: "move", operation: { kind: "interior-transform", target: { kind: "room", id }, delta: [280, 0], quarterTurns: 1 } }));
    expect(moved.document.geometry.regions[0]!.id).toBe(id);
    expect(moved.document.geometry.stamps.find(stamp => stamp.id === "loose")).toEqual(loose);
    expect(moved.document.geometry.stamps[0]!.r).toBeCloseTo(Math.PI / 2);
    expect(JSON.stringify(document)).toBe(before);
    expect(moved.addedRooms).toEqual([]);
  });
  it("cuts a real doorway, transforms it with its room and restores a wall when removed", () => {
    const created = drawRoom(), id = created.addedRooms[0]!.regionId;
    const opened = success(edit(created, { kind: "door", at: [140, 43], width: 40 }));
    const door = opened.document.portals[0]!;
    expect(door.bounds).toEqual([[120, 40], [160, 40]]);
    expect(opened.document.walls.some(wall => wall.points[0]![1] === 40 && wall.points[0]![0] < 140 && wall.points[1]![0] > 140)).toBe(false);
    const moved = success(edit(opened, { kind: "interior-transform", target: { kind: "room", id }, delta: [280, 0] }, "move"));
    expect(moved.document.portals[0]!.position).toEqual([420, 40]);
    const closed = success(edit(opened, { kind: "interior-remove", target: { kind: "portal", id: door.id } }, "close"));
    expect(closed.document.portals).toHaveLength(0);
    expect(closed.document.walls.some(wall => JSON.stringify(wall.points) === JSON.stringify(door.bounds))).toBe(true);
  });
  it("keeps a shared wall for the neighbor and refuses moving it with only one room", () => {
    const first = drawRoom(), id = first.addedRooms[0]!.regionId;
    const both = success(edit(first, { kind: "room", from: [240, 40], to: [440, 240] }));
    expect(both.document.walls).toHaveLength(7);
    expect(edit(both, { kind: "interior-transform", target: { kind: "room", id }, delta: [0, 280] }, "move")).toMatchObject({ ok: false, code: "protected" });
    const removed = success(edit(both, { kind: "interior-remove", target: { kind: "room", id } }, "remove"));
    expect(removed.document.walls).toHaveLength(4);
    expect(removed.document.geometry.regions).toHaveLength(1);
  });
  it("shares a partial neighbor boundary and cuts one actual passage through both rooms", () => {
    const first = drawRoom(), id = first.addedRooms[0]!.regionId;
    const both = success(edit(first, { kind: "room", from: [240, 100], to: [400, 200] }));
    const opened = success(edit(both, { kind: "door", at: [240, 150], width: 40 }, "door"));
    const portal = opened.document.portals[0]!;
    expect(opened.cartography.regions.filter(role => role.role === "room" && role.interior?.portalIds.includes(portal.id))).toHaveLength(2);
    expect(opened.document.walls.some(wall => wall.points[0]![0] === 240 && wall.points[1]![0] === 240 && Math.min(wall.points[0]![1], wall.points[1]![1]) < 150 && Math.max(wall.points[0]![1], wall.points[1]![1]) > 150)).toBe(false);
    expect(edit(opened, { kind: "interior-transform", target: { kind: "room", id }, delta: [100, 100] }, "move")).toMatchObject({ ok: false, code: "protected" });
  });
  it("keeps an existing doorway open when drawing the neighboring room", () => {
    const first = drawRoom(), opened = success(edit(first, { kind: "door", at: [240, 140], width: 40 }, "door"));
    const both = success(edit(opened, { kind: "room", from: [240, 40], to: [440, 240] }, "neighbor"));
    expect(both.cartography.regions.every(role => role.role === "room" && role.interior?.portalIds.includes(opened.document.portals[0]!.id))).toBe(true);
    expect(both.document.walls.some(wall => wall.points[0]![0] === 240 && wall.points[1]![0] === 240 && Math.min(wall.points[0]![1], wall.points[1]![1]) < 140 && Math.max(wall.points[0]![1], wall.points[1]![1]) > 140)).toBe(false);
  });
  it("refuses overlaps, out-of-bounds edits and linked-room removal without partial changes", () => {
    const created = drawRoom(), before = JSON.stringify(created), id = created.addedRooms[0]!.regionId;
    expect(edit(created, { kind: "room", from: [100, 100], to: [300, 300] })).toMatchObject({ ok: false, code: "contradiction" });
    expect(edit(created, { kind: "room", from: [40, 40], to: [240, 240] })).toMatchObject({ ok: false, code: "contradiction" });
    expect(edit(created, { kind: "interior-transform", target: { kind: "room", id }, delta: [-100, 0] })).toMatchObject({ ok: false, code: "invalid" });
    expect(applyInteriorEdit({ ...fixture(), ...created, protectedRegionIds: [id], operation: { kind: "interior-remove", target: { kind: "room", id } } })).toMatchObject({ ok: false, code: "protected" });
    expect(JSON.stringify(created)).toBe(before);
  });
  it("does not guess legacy ownership and prevents exterior deletion from orphaning room parts", () => {
    const created = drawRoom(), id = created.addedRooms[0]!.regionId;
    const legacy: TacticalCartographyV1 = { ...created.cartography, regions: created.cartography.regions.map(role => ({ regionId: role.regionId, role: "room", authored: true, locked: false, provenance: null })) };
    expect(edit({ ...created, cartography: legacy }, { kind: "interior-transform", target: { kind: "room", id }, delta: [20, 0] })).toMatchObject({ ok: false, code: "protected" });
    expect(applyCartographyEdit({ ...fixture(), ...created, seed: "test", operation: { kind: "remove", regionId: id } })).toMatchObject({ ok: false, code: "protected" });
  });
  it("retains the L-shaped gap as free area and allows independent room width and depth", () => {
    const created = drawRoom({ shape: "l" }), id = created.addedRooms[0]!.regionId;
    expect(created.document.walls).toHaveLength(6);
    expect(edit(created, { kind: "room", from: [150, 50], to: [230, 130] })).toMatchObject({ ok: true });
    expect(edit(created, { kind: "room-resize", regionId: id, from: [40, 40], to: [340, 440] })).toMatchObject({ ok: true });
    expect(edit(created, { kind: "room-resize", regionId: id, from: [40, 40], to: [440, 440] })).toMatchObject({ ok: true });
  });
  it("creates deterministic, bounded standalone walls and refuses misplaced or oversized doors", () => {
    const operation = { kind: "wall", from: [30, 30], to: [300, 150] } as const;
    const first = success(edit(fixture(), operation)); expect(edit(fixture(), operation)).toEqual(first);
    expect(edit(first, { kind: "door", at: [700, 500], width: 40 }, "door")).toMatchObject({ ok: false });
    expect(edit(first, { kind: "door", at: [100, 60], width: 400 }, "door")).toMatchObject({ ok: false });
    expect(edit(first, { kind: "wall", from: [NaN, 0], to: [100, 100] })).toMatchObject({ ok: false });
  });
  it("cuts every coincident wall stroke so the visible doorway has no duplicate blocker", () => {
    const first = drawRoom(), duplicate = success(edit(first, { kind: "wall", from: [40, 40], to: [240, 40] }, "duplicate"));
    const opened = success(edit(duplicate, { kind: "door", at: [140, 40], width: 40 }, "door"));
    expect(opened.document.walls.filter(wall => wall.points[0]![1] === 40 && wall.points[1]![1] === 40).every(wall => Math.max(wall.points[0]![0], wall.points[1]![0]) <= 120 || Math.min(wall.points[0]![0], wall.points[1]![0]) >= 160)).toBe(true);
  });
});

describe("source-owned generated interiors", () => {
  it("owns generated floors, furniture, walls, doors and lights from construction evidence", () => {
    const generated = erzeugeGrundriss({ keim: "source-ownership", optionen: { profil: "haus", zellen: [32, 24], moeblierung: 1 } }, pack);
    expect(generated.version).toBe("7");
    const cartography = parseTacticalCartography(generated.cartography, generated.karte);
    expect(cartography.regions.every(role => role.role === "room" && !!role.interior)).toBe(true);
    const owned = cartography.regions.find(role => role.role === "room" && role.interior!.portalIds.length)!;
    if (owned.role !== "room" || !owned.interior) throw Error("ownership missing");
    expect(owned.interior.stampIds.length).toBeGreaterThan(0);
    expect(owned.interior.wallIds.length).toBeGreaterThan(0);
    const portalId = owned.interior.portalIds[0]!, artwork = owned.interior.portalArtwork!.find(item => item.portalId === portalId)!.stampIds;
    expect(artwork.length).toBeGreaterThan(0);
    const removed = success(edit({ document: generated.karte, cartography }, { kind: "interior-remove", target: { kind: "portal", id: portalId } }));
    expect(removed.document.geometry.stamps.some(stamp => artwork.includes(stamp.id))).toBe(false);
    expect(removed.document.portals.some(portal => portal.id === portalId)).toBe(false);
    const removedRoom = success(edit({ document: generated.karte, cartography }, { kind: "interior-remove", target: { kind: "room", id: owned.regionId } }, "remove-room"));
    expect(removedRoom.removedPlaceIds).toEqual(owned.interior.placeIds);
    expect(removedRoom.document.geometry.places.some(place => owned.interior!.placeIds!.includes(place.id))).toBe(false);
  });
});
