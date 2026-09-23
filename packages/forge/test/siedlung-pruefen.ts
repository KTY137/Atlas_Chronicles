// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { expect } from "vitest";
import { parseTacticalCartography, TACTICAL_CARTOGRAPHY_LIMITS } from "@chronicle/szene";
import type { Siedlung } from "../src/siedlung.ts";
import { getrennteDaecher } from "../src/stadt/gemeinsam.ts";
import { flaeche, schnittKonvex } from "../src/polygon.ts";

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
