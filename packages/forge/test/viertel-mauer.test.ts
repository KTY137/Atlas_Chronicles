// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { describe, expect, it } from "vitest";
import { flaeche, schwerpunkt, type Polygon } from "../src/polygon.ts";
import { kantengraph } from "../src/stadt/viertel/graph.ts";
import { mauerKanten, mauerLinien, turmPunkte, waehleTore, zwoelfeck } from "../src/stadt/viertel/mauer.ts";

// 3×3 Quadrate der Kantenlänge 2; Kern ist das mittlere.
const zellen: Polygon[] = [0, 1, 2].flatMap(y => [0, 1, 2].map(x => [[x * 2, y * 2], [x * 2 + 2, y * 2], [x * 2 + 2, y * 2 + 2], [x * 2, y * 2 + 2]] as Polygon));
const g = kantengraph(zellen), kern = (i: number) => i === 4;

describe("Mauer", () => {
  it("umschließt genau den Kern", () => {
    const ring = mauerKanten(g, kern);
    expect(ring.length).toBe(4);
    expect(ring.reduce((s, nr) => s + g.kanten[nr]!.laenge, 0)).toBeCloseTo(8, 6);
  });
  it("setzt Tore an Mauerecken, gestreut, nie an gesperrte Stellen", () => {
    const ring = mauerKanten(g, kern);
    const tore = waehleTore(g, ring, kern, [3, 3], 2, p => p[0] === 2 && p[1] === 2, [0, 3]);
    expect(tore.length).toBe(2);
    const punkte = tore.map(t => g.ecken[t]!);
    expect(punkte).not.toContainEqual([2, 2]);
    expect(Math.hypot(punkte[0]![0] - punkte[1]![0], punkte[0]![1] - punkte[1]![1])).toBeCloseTo(Math.SQRT2 * 2, 6);
  });
  it("setzt keine zwei Tore dicht nebeneinander", () => {
    const ring = mauerKanten(g, kern);
    expect(waehleTore(g, ring, kern, [3, 3], 8, () => false, [0, 3]).length).toBeLessThanOrEqual(4);
  });
  it("versetzt die Mauer nach außen und stellt Türme an Ecken und lange Seiten", () => {
    const ring = mauerKanten(g, kern);
    const linien = mauerLinien(g, ring, i => schwerpunkt(zellen[i]!), kern, .3);
    for (const l of linien) for (const p of [l.a, l.b]) expect(Math.max(Math.abs(p[0] - 3), Math.abs(p[1] - 3))).toBeGreaterThan(1.05);
    expect(turmPunkte(linien, 6).length).toBe(4);
    expect(turmPunkte(linien, .9).length).toBeGreaterThan(4);
  });
  it("zeichnet runde Türme ohne Winkelfunktion", () => {
    const t = zwoelfeck([0, 0], 1);
    expect(t.length).toBe(12);
    expect(flaeche(t)).toBeCloseTo(3, 2);
  });
});
