// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { describe, expect, it } from "vitest";
import { createGridGeometryCache } from "../src/grid-cache.ts";
import { visibleGridLines } from "../src/tactical-geometry.ts";

describe("bounded presentation grid reuse", () => {
  it("retains a covered window and regenerates after leaving it or changing the grid", () => {
    const cache = createGridGeometryCache(), grid = { kind: "square", origin: [3, 7], size: 50 } as const;
    const original = cache.lines([2000, 2000], [400, 300], { x: -100, y: -100, scale: 1 }, grid);
    expect(cache.lines([2000, 2000], [400, 300], { x: -110, y: -110, scale: 1 }, grid)).toBe(original);
    const moved = cache.lines([2000, 2000], [400, 300], { x: -700, y: -700, scale: 1 }, grid);
    expect(moved).not.toBe(original);
    expect(cache.lines([2000, 2000], [400, 300], { x: -700, y: -700, scale: 1 }, { ...grid, origin: [13, 17] })).not.toBe(moved);
    expect(cache.lines([2000, 2000], [400, 300], { x: 0, y: 0, scale: .01 }, grid)).toEqual([]);
    expect(cache.lines([2000, 2000], [400, 300], { x: 2100, y: 2100, scale: 1 }, grid)).toEqual([]);
  });

  it.each(["square", "pointy", "flat"] as const)("covers every originally visible %s path within a reused window", kind => {
    const cache = createGridGeometryCache(), grid = kind === "square" ? { kind, origin: [13, 17], size: 30 } as const
      : { kind: "hex", orientation: kind, offset: "odd", origin: [13, 17], size: 30 } as const;
    const camera = { x: -110, y: -110, scale: 1 }, size = [2000, 2000] as const, viewport = [400, 300] as const;
    cache.lines(size, viewport, { ...camera, x: -100, y: -100 }, grid);
    const retained = cache.lines(size, viewport, camera, grid), visible = visibleGridLines(size, viewport, camera, grid);
    for (const line of visible) {
      if (kind !== "square") expect(retained).toContainEqual(line);
      else {
        const a = line[0]!, b = line[1]!;
        expect(retained.some(candidate => { const c = candidate[0]!, d = candidate[1]!;
          return a[0] === b[0] ? c[0] === a[0] && d[0] === a[0] && c[1] <= a[1] && d[1] >= b[1]
            : c[1] === a[1] && d[1] === a[1] && c[0] <= a[0] && d[0] >= b[0]; })).toBe(true);
      }
    }
  });

  it("does not reuse truncated geometry as if it covered the whole old viewport", () => {
    const cache = createGridGeometryCache(), grid = { kind: "square", origin: [0, 0], size: 10 } as const, size = [32768, 32768] as const;
    const capped = cache.lines(size, [32000, 32000], { x: 0, y: 0, scale: 1 }, grid); expect(capped).toHaveLength(2048);
    const detailed = cache.lines(size, [400, 300], { x: -25000, y: -25000, scale: 1 }, grid);
    expect(detailed).not.toBe(capped); expect(detailed.length).toBeLessThan(2048);
    expect(detailed.some(line => line[0]![0] === 25000 && line[1]![0] === 25000)).toBe(true);
  });
});
