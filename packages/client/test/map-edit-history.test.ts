// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { describe, expect, it } from "vitest";
import { inferLegacyCartography, parseTacticalMapDocument } from "@chronicle/szene";
import { acknowledgeEdit, acceptEdit, beginEdit, commitEdit, editDocument, editDirty, editFingerprint, editHistory, previewEdit, redoEdit, undoEdit, type MapEditSnapshot } from "../src/features/map-edit-history.ts";

const document = parseTacticalMapDocument({ schemaVersion: 1, kind: "tactical-map", coordinates: "image-pixels", frame: { ursprung: [0,0], einheitenProPixel: 1, ordnung: "xy", hoch: "unten" },
  geometry: { v: 3, size: [400,400], regions: [{ id: "house", punkte: [[10,10],[50,10],[50,50],[10,50]] }], stamps: [{ id: "roof", a: "pk.grundriss/roof", x: 30, y: 30, s: 1, r: 0, l: 1 }], places: [] },
  grid: { kind: "none" }, elevation: 0, geometryElevation: [{ targetKind: "stamp", targetId: "roof", elevation: 2 }], walls: [], portals: [], lights: [], environment: { bakedLighting: false, ambientLightArgb: "ffffffff" }, background: null });
const snapshot: MapEditSnapshot = { document, cartography: inferLegacyCartography(document), anchors: [{ targetKind: "stamp", targetId: "roof", entryId: "knowledge", passageId: null }], addedBuildings: [{ regionId: "house", titel: "Haus", typ: "haus" }] };

describe("complete map draft history", () => {
  it("retains exact canonical JSON for reordered objects, numeric keys, omitted fields and Unicode", () => {
    const original: MapEditSnapshot = { ...snapshot, addedRooms: undefined, cartography: { ...snapshot.cartography, regions: [{
      ...snapshot.cartography.regions[0]!, provenance: { generator: "test", version: "1", seed: "seed", keimHash: "a".repeat(64),
        optionen: { z: [null, true, false, -0, "\ud800", "Straße 🌲\n\""], "10": "zehn", "2": "zwei", a: { z: 3, a: 1 } } },
    }] } };
    const legacyFingerprint = JSON.stringify(original, (_key, child: unknown) => child && typeof child === "object" && !Array.isArray(child)
      ? Object.fromEntries(Object.entries(child).sort(([a], [b]) => a.localeCompare(b))) : child);
    const reordered = Object.fromEntries(Object.entries(JSON.parse(JSON.stringify(original)) as MapEditSnapshot).reverse()) as unknown as MapEditSnapshot;
    expect(editFingerprint(original)).toBe(legacyFingerprint);
    expect(editFingerprint(reordered)).toBe(legacyFingerprint);
    expect(editDirty({ ...editHistory(original), present: reordered })).toBe(false);
    const changed = { ...original, document: { ...original.document, geometry: { ...original.document.geometry,
      stamps: original.document.geometry.stamps.map(stamp => ({ ...stamp, x: stamp.x + 1 })),
    } } };
    expect(editFingerprint(changed)).not.toBe(legacyFingerprint);
    expect(editFingerprint(original)).toBe(legacyFingerprint);
  });
  it("enforces the exact UTF-8 history budget after cached reads and a new undo branch", () => {
    const first = { ...snapshot, addedBuildings: [{ ...snapshot.addedBuildings[0]!, titel: "Häuser am 🌲" }] };
    const second = { ...first, document: { ...document, elevation: 1 } };
    const third = { ...first, document: { ...document, elevation: 2 } };
    const bytes = (value: MapEditSnapshot) => new TextEncoder().encode(editFingerprint(value)).byteLength;
    const budget = bytes(first) + bytes(second);
    expect(commitEdit(editHistory(first), second, { steps: 100, bytes: budget }).past).toEqual([first]);
    expect(commitEdit(editHistory(first), second, { steps: 100, bytes: budget - 1 }).past).toEqual([]);
    const branch = commitEdit(undoEdit(commitEdit(editHistory(first), second)), third, { steps: 100, bytes: bytes(first) + bytes(third) });
    expect(branch.past).toEqual([first]); expect(branch.future).toEqual([]);
    expect(undoEdit(branch).present).toBe(first);
  });
  it("preserves cartography and attachment identity for metadata edits and unrelated artwork", () => {
    const generated: MapEditSnapshot = { ...snapshot, cartography: { ...snapshot.cartography, regions: [{ regionId: "house", role: "building", authored: false, locked: false, provenance: null, attachedStampIds: ["roof"] }] } };
    const metadata = editDocument(generated, { ...document, grid: { kind: "square", size: 25, origin: [0, 0] } });
    expect(metadata.cartography).toBe(generated.cartography);
    expect(metadata.addedBuildings).toBe(generated.addedBuildings);
    const artwork = editDocument(generated, { ...document, geometry: { ...document.geometry, stamps: [...document.geometry.stamps, { ...document.geometry.stamps[0]!, id: "unowned", x: 100 }] } });
    expect(artwork.cartography).toBe(generated.cartography);
    const edited = commitEdit(editHistory(generated), artwork);
    expect(edited.present.cartography).toBe(generated.cartography);
    expect(undoEdit(edited).present).toBe(generated);
  });
  it("retains unchanged room attachments and removes references only to deleted objects", () => {
    const room: MapEditSnapshot = { ...snapshot, cartography: { ...snapshot.cartography, regions: [{ regionId: "house", role: "room", authored: true, locked: false, provenance: null,
      interior: { schemaVersion: 1, floor: "wood", stampIds: ["roof"], wallIds: [], portalIds: [], lightIds: [], placeIds: [], portalArtwork: [] },
    }] } };
    expect(editDocument(room, { ...document, elevation: 1 }).cartography).toBe(room.cartography);
    const removed = editDocument(room, { ...document, geometry: { ...document.geometry, stamps: [] } });
    expect(removed.cartography.regions[0]).toMatchObject({ interior: { stampIds: [], wallIds: [], portalArtwork: [] } });
    expect(room.cartography.regions[0]).toMatchObject({ interior: { stampIds: ["roof"] } });
    expect(undoEdit(commitEdit(editHistory(room), removed)).present).toBe(room);
  });
  it("marks a generated owner manually authored when its attached artwork is moved or removed in the existing inspector", () => {
    const generated: MapEditSnapshot = { ...snapshot, cartography: { ...snapshot.cartography, regions: [{ regionId: "house", role: "building", authored: false, locked: false, provenance: { generator: "test", version: "1", seed: "seed", optionen: {}, keimHash: "a".repeat(64) }, attachedStampIds: ["roof"] }] } };
    for (const stamps of [document.geometry.stamps.map(stamp => ({ ...stamp, x: 70 })), []]) {
      const edited = editDocument(generated, { ...document, geometry: { ...document.geometry, stamps } });
      expect(edited.cartography.regions[0]).toMatchObject({ authored: true, provenance: null });
      expect(undoEdit(commitEdit(editHistory(generated), edited)).present).toEqual(generated);
    }
  });
  it("restores geometry, role identity, artwork elevation, knowledge and pending building intents atomically", () => {
    const removed: MapEditSnapshot = { document: { ...document, geometry: { ...document.geometry, regions: [], stamps: [] }, geometryElevation: [] },
      cartography: { ...snapshot.cartography, regions: [] }, anchors: [], addedBuildings: [] };
    const changed = commitEdit(editHistory(snapshot), removed);
    expect(undoEdit(changed).present).toEqual(snapshot);
    expect(redoEdit(undoEdit(changed)).present).toEqual(removed);
    expect(changed.baseline).toBe(snapshot);
  });
  it("uses one undo step for a completed gesture and ignores a late preview from an abandoned gesture", () => {
    const moved = { ...snapshot, document: { ...document, elevation: 2 } };
    let history = beginEdit(editHistory(snapshot), "first", "same-seed");
    history = previewEdit(history, "first", moved);
    expect(history.past).toHaveLength(0); expect(history.present).toBe(snapshot); expect(editDirty(history)).toBe(true);
    history = beginEdit(undoEdit(history), "second", "new-seed");
    expect(previewEdit(history, "first", moved)).toBe(history);
    history = acceptEdit(previewEdit(history, "second", moved));
    expect(history.past).toHaveLength(1); expect(history.present).toBe(moved); expect(undoEdit(history).present).toBe(snapshot);
  });
  it("bounds undo memory while retaining the saved baseline and clears redo on a different edit", () => {
    let history = editHistory(snapshot);
    for (let elevation = 1; elevation <= 8; elevation++) history = commitEdit(history, { ...snapshot, document: { ...document, elevation } }, { steps: 2, bytes: 20_000 });
    expect(history.past).toHaveLength(2); expect(history.baseline).toBe(snapshot);
    history = commitEdit(undoEdit(history), { ...snapshot, document: { ...document, elevation: 99 } }, { steps: 2, bytes: 1 });
    expect(history.future).toHaveLength(0); expect(history.past).toHaveLength(0); expect(history.baseline).toBe(snapshot); expect(editDirty(history)).toBe(true);
  });
  it("adopts the acknowledged save without losing edits made during a delayed reload", () => {
    const submitted = { ...snapshot, document: { ...document, elevation: 1 } };
    const later = { ...submitted, document: { ...document, elevation: 2 } };
    const saved = { ...submitted, addedBuildings: [] };
    const history = acknowledgeEdit(commitEdit(commitEdit(editHistory(snapshot), submitted), later), submitted, saved);
    expect(history.baseline).toEqual(saved); expect(history.present.document.elevation).toBe(2);
    expect(history.present.addedBuildings).toEqual([]); expect(editDirty(history)).toBe(true);
    expect(undoEdit(history).present).toEqual(saved);
  });
  it("resets only the acknowledged unchanged draft, without creating another revision or retaining an old undo branch", () => {
    const submitted = { ...snapshot, document: { ...document, elevation: 1 } }, saved = { ...submitted, addedBuildings: [] };
    const history = acknowledgeEdit(commitEdit(editHistory(snapshot), submitted), submitted, saved);
    expect(history).toEqual(editHistory(saved)); expect(editDirty(history)).toBe(false);
  });
  it("retains a new in-flight gesture and its preview when the submitted save reloads", () => {
    const submitted = { ...snapshot, document: { ...document, elevation: 1 } }, saved = { ...submitted, addedBuildings: [] };
    const preview = { ...submitted, document: { ...document, elevation: 7 } };
    const pending = previewEdit(beginEdit(commitEdit(editHistory(snapshot), submitted), "later-gesture", "stable-seed"), "later-gesture", preview);
    const acknowledged = acknowledgeEdit(pending, submitted, saved);
    expect(acknowledged.gesture).toMatchObject({ id: "later-gesture", seed: "stable-seed", preview: { document: { elevation: 7 } } });
    expect(acknowledged.gesture!.baseline.addedBuildings).toEqual([]);
    expect(acceptEdit(acknowledged).present.document.elevation).toBe(7);
    expect(undoEdit(acceptEdit(acknowledged)).present).toEqual(saved);
  });
  it("never restores generator provenance onto a house or attached artwork manually moved after submission", () => {
    const trusted = { generator: "test", version: "1", seed: "seed", optionen: {}, keimHash: "a".repeat(64) };
    const submitted: MapEditSnapshot = { ...snapshot, cartography: { ...snapshot.cartography, regions: [{ regionId: "house", role: "building", authored: false, locked: false, provenance: trusted, attachedStampIds: ["roof"] }] } };
    const manual: MapEditSnapshot = { ...submitted, cartography: { ...submitted.cartography, regions: submitted.cartography.regions.map(region => ({ ...region, authored: true, provenance: null })) },
      document: { ...document, geometry: { ...document.geometry, regions: document.geometry.regions.map(region => ({ ...region, punkte: region.punkte.map(point => [point[0]+10,point[1]] as const) })) } } };
    expect(acknowledgeEdit(commitEdit(editHistory(submitted), manual), submitted, submitted).present.cartography.regions[0]!.provenance).toBeNull();
    const attachedOnly = { ...manual, document: { ...document, geometry: { ...document.geometry, stamps: document.geometry.stamps.map(stamp => ({ ...stamp, x: stamp.x+10 })) } } };
    expect(acknowledgeEdit(commitEdit(editHistory(submitted), attachedOnly), submitted, submitted).present.cartography.regions[0]!.provenance).toBeNull();
  });
  it("uses the saved anchor ordering for an unchanged gesture baseline while keeping newly edited bindings", () => {
    const submitted: MapEditSnapshot = { ...snapshot, anchors: [...snapshot.anchors, { targetKind: "region", targetId: "house", entryId: "knowledge", passageId: null }] };
    const saved = { ...submitted, anchors: [...submitted.anchors].reverse(), addedBuildings: [] };
    const preview = { ...submitted, anchors: submitted.anchors.map(anchor => ({ ...anchor, entryId: "new-binding" })) };
    const history = previewEdit(beginEdit(editHistory(submitted), "later", "seed"), "later", preview);
    const acknowledged = acknowledgeEdit(history, submitted, saved);
    expect(editFingerprint(acknowledged.gesture!.baseline)).toBe(editFingerprint(acknowledged.present));
    expect(acknowledged.gesture!.preview!.anchors.every(anchor => anchor.entryId === "new-binding")).toBe(true);
  });
  it("treats Undo after PUT as a new manual edit against the saved geometry and retains pending Redo", () => {
    const trusted = { generator: "test", version: "1", seed: "seed", optionen: {}, keimHash: "a".repeat(64) };
    const original: MapEditSnapshot = { ...snapshot, cartography: { ...snapshot.cartography, regions: [{ regionId: "house", role: "building", authored: false, locked: false, provenance: trusted }] }, addedBuildings: [] };
    const moved = editDocument(original, { ...document, geometry: { ...document.geometry, regions: document.geometry.regions.map(region => ({ ...region, punkte: region.punkte.map(point => [point[0]+10,point[1]] as const) })) } });
    const acknowledged = acknowledgeEdit(undoEdit(commitEdit(editHistory(original), moved)), moved, moved);
    expect(acknowledged.present.document).toEqual(original.document);
    expect(acknowledged.present.cartography.regions[0]).toMatchObject({ authored: true, provenance: null });
    expect(acknowledged.future).toHaveLength(1); expect(redoEdit(acknowledged).present.document).toEqual(moved.document);
  });
  it("preserves Redo for an edit undone while the submitted save reloads", () => {
    const submitted = { ...snapshot, document: { ...document, elevation: 1 } }, later = { ...snapshot, document: { ...document, elevation: 2 } };
    const history = undoEdit(commitEdit(commitEdit(editHistory(snapshot), submitted), later));
    const acknowledged = acknowledgeEdit(history, submitted, { ...submitted, addedBuildings: [] });
    expect(acknowledged.future).toHaveLength(1); expect(redoEdit(acknowledged).present.document.elevation).toBe(2);
  });
});
