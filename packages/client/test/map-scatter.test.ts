// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { describe, expect, it } from "vitest";
import { TACTICAL_MAP_LIMITS, type PaketAsset, type TacticalMapDocumentV1, type TacticalPoint } from "@chronicle/szene";
import { scatterAlong, scatterSettings, scatterStamps, SCATTER_SPACING } from "../src/features/map-scatter.ts";
import type { ArtworkBrush } from "../src/features/map-artwork.ts";

const document: TacticalMapDocumentV1 = { schemaVersion: 1, kind: "tactical-map", coordinates: "image-pixels", frame: { ursprung: [0, 0], einheitenProPixel: 1, ordnung: "xy", hoch: "unten" },
  geometry: { v: 3, size: [1000, 800], stamps: [], places: [], regions: [] }, grid: { kind: "square", size: 50, origin: [0, 0] }, elevation: 0, geometryElevation: [], walls: [], portals: [], lights: [],
  environment: { bakedLighting: false, ambientLightArgb: "ffffffff" }, background: null };
const asset: PaketAsset = { name: "laubbaum", art: "aufbau", datei: "aufbau/laubbaum.svg", mimeType: "image/svg+xml", sha256: "0".repeat(64), bytes: 1, groesse: [64, 64], anker: [32, 32], einheiten: [1, 1], kachelbar: false, schlagworte: ["aussen", "baum"], lizenz: null };
const brush: ArtworkBrush = { packId: "pk.natur", cellSize: 64, asset };
const stroke: TacticalPoint[] = [[100, 100], [400, 100], [400, 400]];
const distance = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);

describe("the scatter brush: one stroke, many objects", () => {
  it("starts at the stroke's start and spaces objects evenly along it when nothing is left to chance", () => {
    const placements = scatterAlong(stroke, 50, 0, "seed");
    expect(placements[0]).toEqual({ x: 100, y: 100, r: 0, s: 1 });
    expect(placements).toHaveLength(13);
    for (let index = 1; index < placements.length; index++) expect(distance(placements[index - 1]!, placements[index]!)).toBeCloseTo(50, 5);
    expect(placements.at(-1)).toEqual({ x: 400, y: 400, r: 0, s: 1 });
    expect(placements.every(p => p.r === 0 && p.s === 1)).toBe(true);
  });
  it("strays, turns and resizes within bounds, the same way for the same seed and differently for another", () => {
    const first = scatterAlong(stroke, 50, 1, "one"), again = scatterAlong(stroke, 50, 1, "one"), other = scatterAlong(stroke, 50, 1, "two");
    expect(again).toEqual(first);
    expect(other).not.toEqual(first);
    expect(first).toHaveLength(13);
    for (const [index, placement] of first.entries()) {
      const even = scatterAlong(stroke, 50, 0, "one")[index]!;
      expect(distance(placement, even)).toBeLessThanOrEqual(Math.hypot(25, 12.5) + 1e-9);
      expect(placement.r).toBeGreaterThanOrEqual(0); expect(placement.r).toBeLessThan(Math.PI * 2);
      expect(placement.s).toBeGreaterThanOrEqual(.7); expect(placement.s).toBeLessThanOrEqual(1.3);
    }
  });
  it("copes with a click, a still stroke, a bad spacing and a limit", () => {
    expect(scatterAlong([[5, 5]], 50, .5, "x")).toHaveLength(1);
    expect(scatterAlong([[5, 5], [5, 5], [5, 5]], 50, 0, "x")).toHaveLength(1);
    expect(scatterAlong([], 50, 0, "x")).toHaveLength(0);
    expect(scatterAlong(stroke, 0, 0, "x")).toHaveLength(0);
    expect(scatterAlong(stroke, Number.NaN, 0, "x")).toHaveLength(0);
    expect(scatterAlong(stroke, 10, 0, "x", 4)).toHaveLength(4);
  });
  it("turns the stroke into stamps of the brush, clamped onto the sheet, named by the caller, within the budget", () => {
    const settings = { ...scatterSettings(), on: true, spacing: 1, jitter: 0 };
    const stamps = scatterStamps(document, brush, [[-200, 30], [1300, 30]], 50, settings, "s", index => `g:${index}`);
    expect(stamps.length).toBeGreaterThan(20);
    expect(stamps.every(stamp => stamp.a === "pk.natur/laubbaum" && stamp.x >= 0 && stamp.x <= 1000 && stamp.y >= 0 && stamp.y <= 800 && stamp.l === 15)).toBe(true);
    expect(stamps.map(stamp => stamp.id)).toEqual(stamps.map((_, index) => `g:${index}`));
    expect(scatterStamps(document, brush, stroke, 50, settings, "s", index => `g:${index}`, 1, 2).every(stamp => Math.abs(stamp.r - Math.PI / 2) < 1e-9 && stamp.s === 2 * 50 / 64)).toBe(true);
    expect(scatterStamps(document, brush, stroke, 50, { ...settings, spacing: SCATTER_SPACING.min / 10 }, "s", index => `g:${index}`).length).toBe(scatterStamps(document, brush, stroke, 50, { ...settings, spacing: SCATTER_SPACING.min }, "s", index => `g:${index}`).length);
    const full = { ...document, geometry: { ...document.geometry, stamps: Array.from({ length: TACTICAL_MAP_LIMITS.stamps - 3 }, (_, index) => ({ id: `old:${index}`, a: "pk.natur/busch", x: 1, y: 1, s: 1, r: 0, l: 15 })) } };
    expect(scatterStamps(full, brush, stroke, 50, settings, "s", index => `g:${index}`)).toHaveLength(3);
    expect(scatterStamps({ ...full, geometry: { ...full.geometry, stamps: [...full.geometry.stamps, ...full.geometry.stamps.slice(0, 3)] } }, brush, stroke, 50, settings, "s", index => `g:${index}`)).toHaveLength(0);
  });
});
