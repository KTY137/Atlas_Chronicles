// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { describe, expect, it } from "vitest";
import { GrundrissError } from "../src/kartenwerk.ts";
import { flaeche } from "../src/polygon.ts";
import { kreisRichtungen, vieleck } from "../src/stadt/kreis.ts";

/** Kreise ohne Winkelfunktion (`polygon.ts`, Regel 2): Halbwinkel mit `Math.sqrt`. */
describe("Kreisrichtungen", () => {
  it("trifft das Zwölfeck der Mauertürme", () => {
    const S = .8660254037844386, soll = [[1, 0], [S, .5], [.5, S], [0, 1], [-.5, S], [-S, .5], [-1, 0], [-S, -.5], [-.5, -S], [0, -1], [.5, -S], [S, -.5]];
    kreisRichtungen(12).forEach((d, i) => { expect(d[0]).toBeCloseTo(soll[i]![0]!, 12); expect(d[1]).toBeCloseTo(soll[i]![1]!, 12); });
  });
  it("liefert Einheitsvektoren und den Viertelkreis nach einem Viertel", () => {
    const d = kreisRichtungen(32);
    expect(d).toHaveLength(32);
    for (const p of d) expect(Math.hypot(p[0], p[1])).toBeCloseTo(1, 12);
    expect(d[8]![0]).toBeCloseTo(0, 12); expect(d[8]![1]).toBeCloseTo(1, 12);
  });
  it("lehnt Teilungen ab, die sich nicht halbieren lassen", () => {
    expect(() => kreisRichtungen(10)).toThrow(GrundrissError);
  });
  it("baut ein gedrehtes Vieleck mit der Fläche eines Kreises", () => {
    const p = vieleck([5, 5], 2, 32, [0, 1]);
    expect(p).toHaveLength(32);
    expect(flaeche(p)).toBeGreaterThan(Math.PI * 4 * .98);
    expect(p[0]![0]).toBeCloseTo(5, 3); expect(p[0]![1]).toBeCloseTo(7, 3);
  });
});
