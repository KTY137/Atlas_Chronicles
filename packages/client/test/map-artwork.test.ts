// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { describe, expect, it } from "vitest";
import { parseTacticalMapDocument, type PaketAsset } from "@chronicle/szene";
import { artworkGenre, artworkMatches, placeArtwork, type ArtworkBrush } from "../src/features/map-artwork.ts";

const document = parseTacticalMapDocument({
  schemaVersion: 1, kind: "tactical-map", coordinates: "image-pixels",
  frame: { ursprung: [0, 0], einheitenProPixel: 1, ordnung: "xy", hoch: "unten" },
  geometry: { v: 3, size: [960, 768], stamps: [], regions: [], places: [] },
  grid: { kind: "square", size: 96, origin: [0, 0] }, elevation: 0, geometryElevation: [],
  walls: [], portals: [], lights: [], environment: { bakedLighting: false, ambientLightArgb: "ffffffff" }, background: null,
});
const asset: PaketAsset = { name: "schreibtisch", art: "moebel", datei: "moebel/schreibtisch.svg", mimeType: "image/svg+xml",
  sha256: "a".repeat(64), bytes: 100, groesse: [128, 64], anker: [64, 32], einheiten: [2, 1], kachelbar: false, schlagworte: ["schreibtisch"], lizenz: null };
const brush: ArtworkBrush = { packId: "pk.zeitwelten", cellSize: 64, asset };

describe("placing artwork from its actual asset manifest", () => {
  it("combines exact genre, category, era and localized search while retaining older untagged assets", () => {
    const noir = { ...asset, name: "noir_ermittlerpult", schlagworte: ["genre_noir", "gegenwart", "schreibtisch"] };
    expect(artworkGenre(noir)).toBe("noir");
    expect(artworkMatches(noir, " KRIMI ", "moebel", "gegenwart", "noir")).toBe(true);
    expect(artworkMatches(noir, "", "all", "all", "western")).toBe(false);
    expect(artworkMatches(noir, "", "boden", "all", "noir")).toBe(false);
    expect(artworkMatches(noir, "", "all", "scifi", "noir")).toBe(false);
    expect(artworkMatches(asset, "schreibtisch", "moebel", "scifi", "all")).toBe(true);
    expect(artworkMatches(asset, "", "all", "all", "noir")).toBe(false);
  });
  it("fits the complete image footprint at all canvas edges and preserves grid scale", () => {
    const topLeft = placeArtwork(document, brush, [0, 0], "left")!;
    const bottomRight = placeArtwork(document, brush, [960, 768], "right")!;
    expect(topLeft).toMatchObject({ a: "pk.zeitwelten/schreibtisch", x: 96, y: 48, s: 1.5, r: 0, l: 15 });
    expect(bottomRight).toMatchObject({ x: 864, y: 720, s: 1.5 });
    expect(parseTacticalMapDocument({ ...document, geometry: { ...document.geometry, stamps: [topLeft, bottomRight] } }).geometry.stamps).toHaveLength(2);
    expect(document.geometry.stamps).toEqual([]);
  });
  it("declines non-finite clicks and objects larger than the map", () => {
    expect(placeArtwork(document, brush, [NaN, 20], "bad")).toBeNull();
    expect(placeArtwork(document, { ...brush, asset: { ...asset, groesse: [1024, 64] } }, [20, 20], "large")).toBeNull();
  });
  it("puts manually added floor over the base and rooftop installations over roofs", () => {
    const floor = placeArtwork(document, { ...brush, asset: { ...asset, art: "boden" } }, [200, 200], "floor")!;
    const rooftop = placeArtwork(document, { ...brush, asset: { ...asset, schlagworte: ["dach", "solar"] } }, [200, 200], "solar")!;
    expect(floor.l).toBeGreaterThan(-90); expect(floor.l).toBeLessThan(0);
    expect(rooftop.l).toBe(40);
  });
  it("keeps a usable physical scale when the map has no grid", () => {
    const stamp = placeArtwork({ ...document, grid: { kind: "none" } }, brush, [200, 200], "free")!;
    expect(stamp.s).toBe(1); expect(stamp.x).toBe(200);
  });
});
