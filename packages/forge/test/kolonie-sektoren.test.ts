// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { describe, expect, it } from "vitest";
import { rauschen } from "../src/kartenwerk.ts";
import { doppelflaeche, flaeche, schnittKonvex, type Polygon } from "../src/polygon.ts";
import { sektoren } from "../src/stadt/kolonie/sektoren.ts";
import { kantengraph } from "../src/stadt/viertel/graph.ts";

const rahmen: Polygon = [[0, 0], [56, 0], [56, 44], [0, 44]];
const konvex = (p: Polygon) => {
  const zeichen = p.map((a, i) => { const b = p[(i + 1) % p.length]!, c = p[(i + 2) % p.length]!; return (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]); }).filter(z => Math.abs(z) > 1e-6);
  return zeichen.every(z => z > 0) || zeichen.every(z => z < 0);
};

/** Spec 2026-09-23-stadt-zukunft, 6.1–6.2: Nabe, Ringe und Speichen zerlegen die Karte. */
describe("Ringsektoren der Kolonie", () => {
  it.each(["weiler", "dorf", "stadt"] as const)("%s: konvexe Zellen, die die Karte ohne Überlappung füllen", art => {
    const { alle, innenZiel } = sektoren({ art, bauwerke: 200, mitte: [28.3, 21.7], rahmen, breite: 56, hoehe: 44, r: rauschen(`sektor:${art}`) });
    expect(innenZiel).toBeGreaterThan(art === "weiler" ? 4 : 12);
    expect(alle[0]!.ferne).toBeLessThan(1);
    for (const f of alle) expect(konvex(f.zelle), f.pfad).toBe(true);
    for (let i = 0; i < alle.length; i++) for (let j = i + 1; j < alle.length; j++)
      expect(flaeche(schnittKonvex(alle[i]!.zelle, alle[j]!.zelle)), `${alle[i]!.pfad} / ${alle[j]!.pfad}`).toBeLessThan(1e-3);
    expect(alle.reduce((s, f) => s + flaeche(f.zelle), 0)).toBeCloseTo(56 * 44, -1);
    alle.forEach((f, i) => expect(f.nr).toBe(i));
    expect(alle.every(f => doppelflaeche(f.zelle) !== 0)).toBe(true);
  });
  it("verbindet Nabe und inneren Ring über gemeinsame Kanten (keine offenen Innenkanten)", () => {
    const { alle } = sektoren({ art: "stadt", bauwerke: 200, mitte: [28, 22], rahmen, breite: 56, hoehe: 44, r: rauschen("graph") });
    const g = kantengraph(alle.map(f => f.zelle));
    const innen = new Set(alle.flatMap((f, i) => f.pfad.startsWith("sektor.0.") || f.pfad.startsWith("sektor.1.") ? [i] : []));
    for (const k of g.kanten) if (innen.has(k.f1)) expect(k.f2, `Kante ${k.nr}`).toBeGreaterThanOrEqual(0);
  });
});
