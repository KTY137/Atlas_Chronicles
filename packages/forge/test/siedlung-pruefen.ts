// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { expect } from "vitest";
import { parseTacticalCartography, TACTICAL_CARTOGRAPHY_LIMITS } from "@chronicle/szene";
import type { Siedlung } from "../src/siedlung.ts";
import { getrennteDaecher } from "../src/stadt/gemeinsam.ts";
import { abstandPolygonStrecke, flaeche, schnittKonvex } from "../src/polygon.ts";

/** Was jede Siedlung einhält: Gebäude an einer ausgegebenen Straße, keine Dachüberlappung, nichts
 *  im Wasser, eine gültige Kartografie unter den Grenzen (Regionen, Bytes). */
export function pruefeSiedlung(s: Siedlung, wo: string): void {
  expect(s.bauwerke.length, wo).toBeGreaterThan(0);
  const strassen = new Set(s.strassen.map(x => x.id));
  for (const b of s.bauwerke) expect(strassen.has(b.strasse), `${wo} ${b.pfad}`).toBe(true);
  for (let a = 0; a < s.bauwerke.length; a++) for (let c = a + 1; c < s.bauwerke.length; c++)
    expect(getrennteDaecher(s.bauwerke[a]!.umriss, s.bauwerke[c]!.umriss), `${wo} ${s.bauwerke[a]!.pfad} / ${s.bauwerke[c]!.pfad}`).toBe(true);
  const z = s.karte.grid.kind === "square" ? s.karte.grid.size : 1, flaechen = new Map(s.karte.geometry.regions.map(g => [g.id, g.punkte.map(([x, y]) => [x / z, y / z] as const)]));
  const wasser = s.cartography.regions.filter(r => r.role === "water").map(r => flaechen.get(r.regionId)!);
  for (const b of s.bauwerke) for (const w of wasser) expect(flaeche(schnittKonvex(b.umriss, w)), `${wo} ${b.pfad} im Wasser`).toBeLessThan(1e-3);
  expect(() => parseTacticalCartography(s.cartography, s.karte), wo).not.toThrow();
  expect(JSON.stringify(s.cartography).length, wo).toBeLessThanOrEqual(TACTICAL_CARTOGRAPHY_LIMITS.documentBytes);
  expect(s.karte.geometry.regions.length, wo).toBeLessThanOrEqual(4096);
}

/** Welcher Anteil der Gebäude am größten zusammenhängenden Straßennetz liegt. Zwei Straßenflächen
 *  hängen zusammen, wenn sie sich berühren (Brücken und Kreuzungsflächen zählen mit). */
export function netzAnteil(s: Siedlung): number {
  const flaechen = s.strassen.map(x => ({ id: x.id, p: x.umriss, box: [Math.min(...x.umriss.map(q => q[0])), Math.min(...x.umriss.map(q => q[1])), Math.max(...x.umriss.map(q => q[0])), Math.max(...x.umriss.map(q => q[1]))] as const }));
  const eltern = flaechen.map((_, i) => i), wurzel = (i: number): number => eltern[i] === i ? i : (eltern[i] = wurzel(eltern[i]!));
  for (let i = 0; i < flaechen.length; i++) for (let j = i + 1; j < flaechen.length; j++) {
    const a = flaechen[i]!, b = flaechen[j]!, e = .06;
    if (a.box[2] + e < b.box[0] || b.box[2] + e < a.box[0] || a.box[3] + e < b.box[1] || b.box[3] + e < a.box[1]) continue;
    const beruehrt = b.p.some((q, k) => abstandPolygonStrecke(a.p, q, b.p[(k + 1) % b.p.length]!) <= e);
    if (beruehrt) eltern[wurzel(i)] = wurzel(j);
  }
  const index = new Map(flaechen.map((f, i) => [f.id, i])), zaehler = new Map<number, number>();
  for (const b of s.bauwerke) { const w = wurzel(index.get(b.strasse)!); zaehler.set(w, (zaehler.get(w) ?? 0) + 1); }
  return Math.max(...zaehler.values()) / s.bauwerke.length;
}
