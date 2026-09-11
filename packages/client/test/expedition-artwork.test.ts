// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseAssetpaket, parseTacticalMapDocument } from "@chronicle/szene";
import { artworkBrush, artworkMatches, placeArtwork } from "../src/features/map-artwork.ts";
const pack = parseAssetpaket(readFileSync("assets/packs/pk.expedition/paket.json", "utf8"));
const document = parseTacticalMapDocument({
  schemaVersion: 1, kind: "tactical-map", coordinates: "image-pixels",
  frame: { ursprung: [0, 0], einheitenProPixel: 1, ordnung: "xy", hoch: "unten" },
  geometry: { v: 3, size: [960, 768], stamps: [], regions: [], places: [] },
  grid: { kind: "square", size: 96, origin: [0, 0] }, elevation: 0, geometryElevation: [],
  walls: [], portals: [], lights: [], environment: { bakedLighting: false, ambientLightArgb: "ffffffff" }, background: null,
});
describe("expedition manifest through real editor placement", () => {
  it("keeps all 24 neutral motifs discoverable in every setting", () => {
    expect(pack.assets).toHaveLength(24);
    for (const era of ["all", "fantasy", "gegenwart", "scifi"]) {
      expect(pack.assets.filter(asset => artworkMatches(asset,"","all",era,"all"))).toHaveLength(24);
    }
  });
  it.each(pack.assets.map(asset => [asset.name, asset] as const))("places %s from its actual footprint and serializes it", (_name, asset) => {
    const brush = artworkBrush(pack,asset);
    const stamp = placeArtwork(document,brush,[960,768],`placed-${asset.name}`)!;
    expect(artworkMatches(asset, asset.name.replaceAll("_", " "), asset.art, "all", "all")).toBe(true);
    expect(stamp.a).toBe(`pk.expedition/${asset.name}`);
    expect(stamp.s).toBe(96/pack.zellgroesse);
    expect(stamp.x+asset.groesse[0]*stamp.s/2).toBeLessThanOrEqual(960);
    expect(stamp.y+asset.groesse[1]*stamp.s/2).toBeLessThanOrEqual(768);
    const copy = parseTacticalMapDocument(JSON.stringify({...document,geometry:{...document.geometry,stamps:[stamp]}}));
    expect(copy.geometry.stamps).toEqual([stamp]);
  });
});
