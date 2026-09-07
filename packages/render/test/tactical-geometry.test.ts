// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { describe, expect, it } from "vitest";
import { fitCamera } from "../src/geometry.ts";
import { snapMapPoint, visibleGridLines, visibleMapTiles } from "../src/tactical-geometry.ts";

describe("tactical camera and snap geometry", () => {
  it("requests only bounded viewport tiles with exact clipped edges at all scales", () => {
    for (const scale of [.01, .4, 1, 7]) {
      const tiles = visibleMapTiles([2561, 1237], [1440, 960], { x: -80 * scale, y: 0, scale });
      expect(tiles.length).toBeGreaterThan(0); expect(tiles.length).toBeLessThanOrEqual(128);
      expect(new Set(tiles.map(t => `${t.level}:${t.x}:${t.y}`)).size).toBe(tiles.length);
      for (const t of tiles) { expect(t.left + t.width).toBeLessThanOrEqual(2561); expect(t.top + t.height).toBeLessThanOrEqual(1237); }
    }
    expect(visibleMapTiles([2560, 2560], [1440, 960], { x: 1441, y: 0, scale: 1 })).toEqual([]);
    const all = visibleMapTiles([257, 129], [1440, 960], fitCamera([257, 129], [1440, 960]));
    expect(all).toHaveLength(2); expect(all[1]).toMatchObject({ x: 1, left: 256, width: 1, height: 129 });
    expect(() => visibleMapTiles([256, 256], [1, 1], { x: 0, y: 0, scale: Number.NaN })).toThrow();
  });
  it("snaps square cell centres relative to an offset, including negative cells", () => {
    const grid = { kind: "square", origin: [5, 7], size: 10 } as const;
    expect(snapMapPoint([6, 9], grid)).toEqual([10, 12]);
    expect(snapMapPoint([3, 4], grid)).toEqual([0, 2]);
    expect(snapMapPoint([6.7, 9.4], { kind: "none" })).toEqual([6.7, 9.4]);
  });
  it("keeps hex centres fixed for both orientations and both offset names", () => {
    for (const orientation of ["pointy", "flat"] as const) for (const offset of ["even", "odd"] as const) {
      const grid = { kind: "hex", origin: [13, 17], size: 32, orientation, offset } as const;
      for (const point of [[13, 17], [100, 250], [-70, 32]] as const) {
        const center = snapMapPoint(point, grid), again = snapMapPoint(center, grid);
        expect(again[0]).toBeCloseTo(center[0], 10); expect(again[1]).toBeCloseTo(center[1], 10);
        expect(Math.hypot(center[0] - point[0], center[1] - point[1])).toBeLessThanOrEqual(32.00001);
      }
    }
  });
  it("drops subpixel grids and bounds visible overlay work", () => {
    expect(visibleGridLines([1000, 1000], [400, 300], { x: 0, y: 0, scale: .01 }, { kind: "square", origin: [0, 0], size: 10 })).toEqual([]);
    expect(visibleGridLines([1000, 1000], [400, 300], { x: 0, y: 0, scale: 1 }, { kind: "square", origin: [0, 0], size: 100 })).toHaveLength(9);
    expect(visibleGridLines([32768, 32768], [32000, 32000], { x: 0, y: 0, scale: 1 }, { kind: "hex", origin: [0, 0], size: 10, orientation: "flat", offset: "odd" }).length).toBeLessThanOrEqual(2048);
  });
});
