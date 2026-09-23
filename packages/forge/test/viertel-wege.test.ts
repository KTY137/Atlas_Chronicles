// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { describe, expect, it } from "vitest";
import { flaeche, type Polygon } from "../src/polygon.ts";
import { kantengraph } from "../src/stadt/viertel/graph.ts";
import { hauptstrassen, strassenBaender } from "../src/stadt/viertel/wege.ts";

const zellen: Polygon[] = [0, 1, 2, 3, 4].flatMap(y => [0, 1, 2, 3, 4].map(x => [[x * 2, y * 2], [x * 2 + 2, y * 2], [x * 2 + 2, y * 2 + 2], [x * 2, y * 2 + 2]] as Polygon));
const g = kantengraph(zellen);
const innen = (i: number) => { const x = i % 5, y = Math.floor(i / 5); return x >= 1 && x <= 3 && y >= 1 && y <= 3; };

describe("Wege", () => {
  it("führt jedes Tor zum Markt und weiter zum Kartenrand", () => {
    const tore = [g.finde([2, 4]), g.finde([8, 6])];
    const w = hauptstrassen({ g, istStadt: innen, istKern: innen, ring: new Set(), markt: 12, tore, mitte: [5, 5], breite: 10, hoehe: 10, kosten: () => 0 });
    const marktEcken = new Set(g.kanten.filter(k => k.f1 === 12 || k.f2 === 12).flatMap(k => [k.u, k.v]));
    for (const t of tore) expect([...w.haupt].some(nr => g.kanten[nr]!.u === t || g.kanten[nr]!.v === t)).toBe(true);
    expect([...w.haupt].some(nr => marktEcken.has(g.kanten[nr]!.u) || marktEcken.has(g.kanten[nr]!.v))).toBe(true);
    expect([...w.ausfall].some(nr => { const k = g.kanten[nr]!; return [k.von, k.bis].some(p => p[0] === 0 || p[0] === 10 || p[1] === 0 || p[1] === 10); })).toBe(true);
  });
  it("umgeht gesperrte Kanten (See, Fels)", () => {
    const tore = [g.finde([2, 4])];
    const offen = hauptstrassen({ g, istStadt: innen, istKern: innen, ring: new Set(), markt: 12, tore, mitte: [5, 5], breite: 10, hoehe: 10, kosten: () => 0 });
    const gesperrt = new Set(offen.haupt);
    const umweg = hauptstrassen({ g, istStadt: innen, istKern: innen, ring: new Set(), markt: 12, tore, mitte: [5, 5], breite: 10, hoehe: 10, kosten: k => gesperrt.has(k.nr) ? Infinity : 0 });
    for (const nr of umweg.haupt) expect(gesperrt.has(nr)).toBe(false);
  });
  it("baut Bänder: zweiseitig innen, einseitig am Ortsrand, nie außerhalb der Karte", () => {
    let n = 0;
    const { gassen } = strassenBaender(g, { istStadt: innen, ring: new Set(), wege: { haupt: new Set(), ausfall: new Set() }, breiten: { haupt: 1, gasse: .5, wall: .4, ausfall: .8 }, zelleVon: i => zellen[i]!, breite: 10, hoehe: 10, id: () => `g${n++}` });
    expect(gassen.filter(s => s.a === s.b).length).toBe(12);
    expect(gassen.filter(s => s.a !== s.b).length).toBe(12);
    for (const s of gassen) {
      expect(flaeche(s.band)).toBeGreaterThan(0);
      for (const [x, y] of s.band) { expect(x).toBeGreaterThanOrEqual(0); expect(y).toBeLessThanOrEqual(10); }
    }
    // Einseitige Bänder liegen innen: ihr Schwerpunkt ist in einer Stadtzelle.
    for (const s of gassen.filter(x => x.a === x.b)) expect(innen(s.a)).toBe(true);
  });
});
