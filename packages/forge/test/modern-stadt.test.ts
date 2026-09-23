// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseAssetpaket, parseTacticalCartography, TACTICAL_CARTOGRAPHY_LIMITS } from "@chronicle/szene";
import { erzeugeSiedlung, type Siedlung } from "../src/siedlung.ts";
import { getrennteDaecher } from "../src/stadt/gemeinsam.ts";
import { flaeche, schnittKonvex, type Polygon } from "../src/polygon.ts";

const paket = parseAssetpaket(readFileSync(fileURLToPath(new URL("../../../assets/packs/pk.zeitwelten/paket.json", import.meta.url)), "utf8"));
const gen = (keim: string, optionen: Record<string, unknown>) => erzeugeSiedlung({ keim, optionen: { setting: "gegenwart", ...optionen } }, paket);
const STANDORTE = ["ebene", "fluss", "kueste", "huegel", "see"] as const;

/** Längste Kante eines Straßenbands als Richtung in 10°-Stufen (0..17). */
const richtung = (band: Polygon) => {
  let beste = 0, winkel = 0;
  band.forEach((p, i) => { const n = band[(i + 1) % band.length]!, l = Math.hypot(n[0] - p[0], n[1] - p[1]); if (l > beste) { beste = l; winkel = Math.atan2(n[1] - p[1], n[0] - p[0]); } });
  return Math.round(((winkel + Math.PI) % Math.PI) / Math.PI * 18) % 18;
};
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

/** Spec 2026-09-23-stadt-zukunft, Abschnitt 5: die heutige Stadt (Version 12). */
describe("Gegenwart v12", () => {
  it("hat Innenstadt mit Rathaus, Park, Pflichtbauten, Flach- und Hallendächer und keine Mauer", () => {
    const s = gen("v12:g:a", { art: "stadt", standort: "ebene" });
    expect(s.version).toBe("12");
    const typen = new Set(s.bauwerke.map(b => b.typ));
    for (const t of ["rathaus", "krankenhaus", "polizei", "feuerwache", "schule", "bahnhof", "wohnblock", "buero"]) expect(typen, t).toContain(t);
    expect(s.bericht.viertel?.some(v => v.nutzung === "frei")).toBe(true);
    expect(s.karte.walls.length).toBe(0);
    const daecher = s.cartography.regions.flatMap(r => r.role === "building" && r.dach ? [r.dach] : []);
    expect(daecher.filter(d => d === "flach").length).toBeGreaterThan(20);
    expect(daecher).toContain("halle");
    expect(daecher).toContain("giebel");
    expect(new Set(s.bauwerke.map(b => b.titel)).size).toBe(s.bauwerke.length);
    expect(s.cartography.labels?.some(l => ["Innenstadt", "City", "Altstadt"].includes(l.text))).toBe(true);
  }, 30_000);
  it("dreht die Raster je Stadtteil", () => {
    const s = gen("v12:g:b", { art: "stadt", standort: "ebene" });
    // Ein Raster hat zwei Richtungen im rechten Winkel (gleicher Rest mod 90°). Mehrere Raster
    // unterschiedlicher Drehung zeigen sich als mehrere häufige Reste — das starre v8-Raster hat einen.
    const zaehler = new Map<number, number>();
    for (const x of s.strassen) if (x.art === "gasse" && x.umriss.length === 4) { const d = richtung(x.umriss) % 9; zaehler.set(d, (zaehler.get(d) ?? 0) + 1); }
    const gesamt = [...zaehler.values()].reduce((a, b) => a + b, 0);
    expect([...zaehler.values()].filter(n => n >= gesamt * .15).length).toBeGreaterThanOrEqual(2);
  }, 30_000);
  it.each(STANDORTE)("%s: gültig, ohne Überlappung, alles an Straßen, nichts im Wasser, genug Gebäude", standort => {
    for (const art of ["weiler", "dorf", "stadt"] as const) {
      const s = gen(`v12:g:${standort}:${art}`, { art, standort }), wo = `${standort}/${art}`;
      pruefeSiedlung(s, wo);
      // Heutige Gebäude sind größer als Fantasy-Häuser: die Gebäudezahl ist ein Höchstwert, erreicht
      // wird mindestens die Hälfte (Ledger, Task 4, Ruling).
      if (art !== "weiler") expect(s.bauwerke.length, wo).toBeGreaterThanOrEqual(Math.floor(s.bericht.angefordert * .5));
    }
  }, 60_000);
  it("ist deterministisch", () => {
    expect(gen("v12:g:det", { art: "dorf", standort: "fluss" })).toEqual(gen("v12:g:det", { art: "dorf", standort: "fluss" }));
  }, 30_000);
  it("nennt eine Zone „Rathaus & Ämter“ außerhalb der Stadt nicht „Burg“", () => {
    const planung = { schemaVersion: 1 as const, zonen: [{ id: "b", name: "Amt", nutzung: "burg" as const, dichte: 1, polygon: [[0, 0], [.04, 0], [.04, .04], [0, .04]] as const }] };
    const s = gen("v12:g:burg", { art: "stadt", standort: "ebene", planung });
    expect(s.version).toBe("12");
    expect(s.bericht.ausgelassen.join(" ")).toContain("Rathaus & Ämter");
    expect(s.bericht.ausgelassen.join(" ")).not.toContain("Burg");
  }, 30_000);
  it("baut auf einem winzigen Weiler wenigstens ein Haus", () => {
    expect(gen("v12:g:tiny", { art: "weiler", standort: "fluss", ausdehnung: [24, 18], bauwerke: 3 }).bauwerke.length).toBeGreaterThan(0);
  }, 30_000);
});
