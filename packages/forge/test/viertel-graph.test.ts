// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { describe, expect, it } from "vitest";
import type { Polygon } from "../src/polygon.ts";
import { kantengraph, weg } from "../src/stadt/viertel/graph.ts";

const zellen: Polygon[] = [
  [[0, 0], [1, 0], [1, 1], [0, 1]],
  [[1, 0], [2, 0], [2, 1], [1.0000004, 1]],
  [[0, 1], [1, 1], [1, 2], [0, 2]],
];
describe("Kantengraph", () => {
  it("fängt fast gleiche Ecken zu einer und zählt geteilte Kanten einmal", () => {
    const g = kantengraph(zellen);
    expect(g.ecken.length).toBe(8);
    expect(g.kanten.length).toBe(10);
    expect(g.kanten.filter(k => k.f2 >= 0).map(k => [k.f1, k.f2].sort())).toEqual([[0, 1], [0, 2]]);
  });
  it("findet den billigsten Weg und respektiert gesperrte Kanten", () => {
    const g = kantengraph(zellen), start = g.finde([0, 0]), ziel = g.finde([2, 1]);
    const w = weg(g, start, new Set([ziel]), k => k.laenge)!;
    expect(w.reduce((s, n) => s + g.kanten[n]!.laenge, 0)).toBeCloseTo(3, 6);
    const erste = g.kanten[w[0]!]!;
    expect([erste.u, erste.v]).toContain(start);
    expect(weg(g, start, new Set([ziel]), () => Infinity)).toBeNull();
  });
  it("findet nichts für eine unbekannte Ecke", () => {
    const g = kantengraph(zellen);
    expect(g.finde([5, 5])).toBe(-1);
    expect(weg(g, -1, new Set([0]), k => k.laenge)).toBeNull();
  });
});
