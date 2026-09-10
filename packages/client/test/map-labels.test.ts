// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { describe, expect, it } from "vitest";
import type { TacticalCartographyV1, TacticalPoint } from "@chronicle/szene";
import { LABEL_SIZES, LABEL_STYLES, labelPath, labelSizeName, labelStyleName, withLabels } from "../src/features/map-labels.ts";

const cartography: TacticalCartographyV1 = { schemaVersion: 1, kind: "tactical-cartography", construction: { cellSize: 64, origin: [0, 0] }, regions: [] };

describe("names on the map: the line a name follows", () => {
  it("names every style and size in plain words", () => {
    for (const style of LABEL_STYLES) expect(labelStyleName(style)).toMatch(/\S/);
    for (const size of LABEL_SIZES) expect(labelSizeName(size.id)).toMatch(/\S/);
    expect(LABEL_SIZES.map(size => size.cells)).toEqual([.5, .8, 1.3, 2.2]);
  });
  it("turns a click or a tiny stroke into one point and keeps the ends of a real stroke", () => {
    expect(labelPath([[10, 10]], 32)).toEqual([[10, 10]]);
    expect(labelPath([[10, 10], [12, 11], [15, 12]], 32)).toEqual([[10, 10]]);
    expect(labelPath([], 32)).toEqual([]);
    const stroke: TacticalPoint[] = Array.from({ length: 80 }, (_, index) => [index * 5, 100 + Math.sin(index / 6) * 20]);
    const path = labelPath(stroke, 32);
    expect(path[0]).toEqual([0, 100]); expect(path.at(-1)).toEqual(stroke.at(-1));
    expect(path.length).toBeGreaterThan(5); expect(path.length).toBeLessThanOrEqual(64);
    for (let index = 1; index < path.length - 1; index++) expect(Math.hypot(path[index]![0] - path[index - 1]![0], path[index]![1] - path[index - 1]![1])).toBeGreaterThan(20);
  });
  it("smooths a jittery stroke and never returns more than the maximum", () => {
    const jittery: TacticalPoint[] = Array.from({ length: 400 }, (_, index) => [index * 4, 200 + (index % 2 ? 9 : -9)]);
    const path = labelPath(jittery, 8, 16);
    expect(path).toHaveLength(16);
    for (const point of path.slice(1, -1)) expect(Math.abs(point[1] - 200)).toBeLessThan(6);
  });
  it("stores names in the cartography and drops the field again when the last one goes", () => {
    const named = withLabels(cartography, [{ id: "a", text: "Silberbach", points: [[1, 1], [50, 5]], size: 40, style: "wasser" }]);
    expect(named.labels).toHaveLength(1);
    expect(withLabels(named, [])).not.toHaveProperty("labels");
    expect(withLabels(named, [])).toEqual(cartography);
  });
});
