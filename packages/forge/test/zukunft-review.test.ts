// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseAssetpaket, type SettlementPlan } from "@chronicle/szene";
import { erzeugeSiedlung } from "../src/siedlung.ts";
import { abstandPolygonStrecke, flaeche, huelle, imPolygon, schwerpunkt } from "../src/polygon.ts";
import { netzAnteil } from "./siedlung-pruefen.ts";

const pack = (id: string) => parseAssetpaket(readFileSync(fileURLToPath(new URL(`../../../assets/packs/${id}/paket.json`, import.meta.url)), "utf8"));
const zeitwelten = pack("pk.zeitwelten"), grundriss = pack("pk.grundriss");
const zone = (nutzung: "burg" | "hafen", polygon: readonly (readonly [number, number])[]): SettlementPlan => ({ schemaVersion: 1, zonen: [{ id: "z", name: "Zone", nutzung, dichte: 1, polygon }] });

/** Befunde der Schlussprüfung von Teil 2 (2026-09-25): was eine Spielleitung mit gewöhnlichen
 *  Eingaben sieht, bevor der Zweig in `main` kommt. */
describe("Schlussprüfung Teil 2", () => {
  it.each(["gegenwart", "scifi"] as const)("%s: eine Burgzone mitten in der Stadt nennt nie „Burg“ und meldet sich höchstens einmal", setting => {
    for (let i = 0; i < 4; i++) for (const polygon of [[[.35, .35], [.65, .35], [.65, .65], [.35, .65]], [[.47, .47], [.53, .47], [.53, .53], [.47, .53]], [[.3, .45], [.4, .45], [.4, .55], [.3, .55]]] as const) {
      const s = erzeugeSiedlung({ keim: `burgzone:${setting}:${i}`, optionen: { setting, art: "stadt", standort: i % 2 ? "fluss" : "kueste", planung: zone("burg", polygon) } }, zeitwelten);
      const text = s.bericht.ausgelassen.join(" ");
      expect(text).not.toMatch(/Burg(?!zone)/);
      expect(new Set(s.bericht.ausgelassen).size).toBe(s.bericht.ausgelassen.length);
    }
  }, 60_000);
  it.each(["split:1", "split:5", "split:8", "split:3"])("Kolonie am Fluss (%s): fast alle Gebäude hängen an einem Straßennetz", keim => {
    const s = erzeugeSiedlung({ keim, optionen: { setting: "scifi", art: "stadt", standort: "fluss" } }, zeitwelten);
    expect(netzAnteil(s)).toBeGreaterThanOrEqual(.9);
  }, 30_000);
  it("eine heutige Stadt am Fluss hängt ebenso zusammen", () => {
    for (const keim of ["split:1", "split:5"]) expect(netzAnteil(erzeugeSiedlung({ keim, optionen: { setting: "gegenwart", art: "stadt", standort: "fluss" } }, zeitwelten)), keim).toBeGreaterThanOrEqual(.9);
  }, 60_000);
  it.each([["ebene", true], ["fluss", true], ["kueste", true], ["ebene", false], ["fluss", false]] as const)("Kolonie %s (Zaun %s) hat einen Raumhafen mit Landefeld", (standort, mauer) => {
    for (const keim of ["port:0", "port:1", "port:2"]) {
      const s = erzeugeSiedlung({ keim, optionen: { setting: "scifi", art: "stadt", standort, mauer } }, zeitwelten);
      expect(s.bauwerke.filter(b => b.typ === "raumhafen" && b.dach === "plattform").length, `${standort}/${mauer}/${keim}`).toBeGreaterThanOrEqual(1);
    }
  }, 60_000);
  it("eine gemalte Raumhafenzone ohne Platz für ein Landefeld sagt es in Klartext", () => {
    const s = erzeugeSiedlung({ keim: "port:klein", optionen: { setting: "scifi", art: "stadt", standort: "ebene", planung: zone("hafen", [[.43, .43], [.57, .43], [.57, .57], [.43, .57]]) } }, zeitwelten);
    expect(s.bericht.viertel?.some(v => v.nutzung === "hafen")).toBe(true);
    if (!s.bauwerke.some(b => b.typ === "raumhafen")) expect(s.bericht.ausgelassen.join(" ")).toContain("Landefeld");
  }, 30_000);
  it("Fantasy bleibt v11: ein Hof in einer trockenen Hafenzone bleibt stehen wie vorher", () => {
    for (let i = 0; i < 12; i++) {
      const optionen = { art: "dorf" as const, standort: "ebene" as const };
      const base = erzeugeSiedlung({ keim: `hof:${i}`, optionen }, grundriss);
      const wasser = base.cartography.regions.filter(r => r.role === "water").map(r => base.karte.geometry.regions.find(g => g.id === r.regionId)!.punkte.map(([x, y]) => [x / 96, y / 96] as const));
      const hof = base.bauwerke.find(b => b.pfad.endsWith(".hof") && wasser.every(w => w.every((p, k) => abstandPolygonStrecke(b.umriss, p, w[(k + 1) % w.length]!) > 5)));
      if (!hof) continue;
      const [x0, y0, x1, y1] = huelle(hof.umriss), [bw, bh] = [base.karte.geometry.size[0] / 96, base.karte.geometry.size[1] / 96];
      const plan = zone("hafen", [[x0 / bw, y0 / bh], [x1 / bw, y0 / bh], [x1 / bw, y1 / bh], [x0 / bw, y1 / bh]]);
      const mit = erzeugeSiedlung({ keim: `hof:${i}`, optionen: { ...optionen, planung: plan } }, grundriss);
      expect(mit.bauwerke.some(b => b.pfad === hof.pfad)).toBe(true);
      return;
    }
    throw new Error("kein trockener Hof gefunden");
  }, 60_000);
  it("stellt Autos nicht in Parks und Gärten", () => {
    for (const keim of ["park:1", "park:2"]) {
      const s = erzeugeSiedlung({ keim, optionen: { setting: "gegenwart", art: "stadt", standort: "ebene" } }, zeitwelten);
      const z = 96, flaechen = new Map(s.karte.geometry.regions.map(g => [g.id, g.punkte.map(([x, y]) => [x / z, y / z] as const)]));
      const [bw, bh] = [s.karte.geometry.size[0] / z, s.karte.geometry.size[1] / z];
      const rasen = s.cartography.regions.filter(r => r.role === "terrain" && r.material === "grass").map(r => flaechen.get(r.regionId)!).filter(p => flaeche(p) < bw * bh * .5);
      const fels = s.cartography.regions.filter(r => r.role === "terrain" && r.material === "rock").map(r => flaechen.get(r.regionId)!);
      for (const f of fels) expect(rasen.some(r => imPolygon(schwerpunkt(f), r)), keim).toBe(false);
    }
  }, 60_000);
});
