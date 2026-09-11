// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { describe, expect, it } from "vitest";
import { imageRasterLayout, rasterTilesFit } from "../src/tactical-geometry.ts";
import type { MapPoint } from "../src/model.ts";

/** Die Kacheln so, wie die Atlas-Ansicht sie dem Renderer übergibt — mit den Maßen des Ausschnitts. */
const tilesFor = (size: MapPoint) => imageRasterLayout(size).tiles.map(tile => ({ ...tile, image: { width: tile.sw, height: tile.sh } }));

describe("ein Kartenbild über die ganze Karte", () => {
  it("passt für jede Kartengröße durch die Kachelprüfung des Renderers", () => {
    for (const size of [[1600, 1000], [8192, 8192], [640, 480], [5000, 300], [8193, 17], [300, 5000], [1, 1], [16384, 9000]] as MapPoint[]) {
      const layout = imageRasterLayout(size), tiles = tilesFor(size);
      expect(rasterTilesFit(size, tiles), `${size}`).toBe(true);
      // Lückenlos: die Kacheln decken genau die Karte, und jeder Ausschnitt liegt im verkleinerten Bild.
      expect(tiles.reduce((sum, tile) => sum + tile.width * tile.height, 0)).toBe(size[0] * size[1]);
      for (const tile of layout.tiles) {
        expect(tile.sx + tile.sw).toBeLessThanOrEqual(layout.bitmap[0]);
        expect(tile.sy + tile.sh).toBeLessThanOrEqual(layout.bitmap[1]);
      }
    }
  });

  it("verliert kein Bild bei nicht quadratischen Karten — die feste 8192er-Aufteilung tat es", () => {
    const fest = [[0, 0], [1024, 0], [0, 1024], [1024, 1024]].map(([x, y]) => ({ id: `${x}:${y}`, left: x! * 4, top: y! * 4, width: 4096, height: 4096, pixelScale: 4, image: { width: 1024, height: 1024 } }));
    expect(rasterTilesFit([8192, 8192], fest)).toBe(true);
    expect(rasterTilesFit([1600, 1000], fest)).toBe(false);
    expect(imageRasterLayout([1600, 1000])).toMatchObject({ pixelScale: 1, bitmap: [1600, 1000] });
  });

  it("hält die Bildgröße im Rahmen und behält die bisherige Auflösung großer Karten", () => {
    expect(imageRasterLayout([8192, 8192])).toMatchObject({ pixelScale: 4, bitmap: [2048, 2048] });
    expect(imageRasterLayout([8192, 8192]).tiles).toHaveLength(4);
    const riesig = imageRasterLayout([16384, 9000]);
    expect(Math.max(...riesig.bitmap)).toBeLessThanOrEqual(2048);
  });

  it("rundet gebrochene Kartenmaße ab, statt über den Rand zu ragen", () => {
    const size: MapPoint = [1000.5, 700.25];
    expect(rasterTilesFit(size, tilesFor(size))).toBe(true);
    expect(imageRasterLayout(size).bitmap).toEqual([1000, 700]);
    expect(imageRasterLayout([0.5, 10]).tiles).toEqual([]);
  });
});
