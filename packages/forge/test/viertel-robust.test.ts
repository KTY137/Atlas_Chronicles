// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseAssetpaket, parseSettlementPlan } from "@chronicle/szene";
import { GrundrissError } from "../src/kartenwerk.ts";
import { erzeugeSiedlung } from "../src/siedlung.ts";

const pack = (id: string) => parseAssetpaket(readFileSync(fileURLToPath(new URL(`../../../assets/packs/${id}/paket.json`, import.meta.url)), "utf8"));
const grundriss = pack("pk.grundriss"), gemalt = pack("pk.gemalt");

/** Befunde der Schlussprüfung 2026-09-23: Eingaben, die die Oberfläche erlaubt, dürfen den Server
 *  weder abstürzen lassen noch mit einem rohen Fehler (HTTP 500) beantworten. */
describe("Viertelstadt hält gewöhnliche Eingaben aus", () => {
  it("baut auf einem winzigen Weiler am Fluss wenigstens einen Hof", () => {
    for (const [keim, p] of [["tiny:fluss:weiler:2", grundriss], ["tiny:fluss:weiler:0", gemalt]] as const) {
      const s = erzeugeSiedlung({ keim, optionen: { art: "weiler", standort: "fluss", ausdehnung: [24, 18], bauwerke: 3, zellgroesse: 128 } }, p);
      expect(s.bauwerke.length, keim).toBeGreaterThan(0);
    }
  });
  it("antwortet auf zu kleine Karten mit einer erklärten Absage statt einem rohen Fehler", () => {
    for (const standort of ["insel", "moor", "see"] as const) for (let i = 0; i < 6; i++) {
      try { erzeugeSiedlung({ keim: `klein:${standort}:${i}`, optionen: { art: "dorf", standort, ausdehnung: [12, 12] } }, gemalt); }
      catch (error) { expect(error, `${standort}/${i}`).toBeInstanceOf(GrundrissError); }
    }
  }, 60_000);
  it("vergibt jeder Laterne eine eigene Kennung, auch wenn Hauptstraßen dieselbe Zelle kreuzen", () => {
    expect(() => erzeugeSiedlung({ keim: "d3:see", optionen: { art: "stadt", standort: "see" } }, gemalt)).not.toThrow();
  }, 30_000);
  it("bleibt auf großen Karten unter der Grenze von 4096 Flächen", () => {
    for (const optionen of [{ standort: "moor", ausdehnung: [192, 104] }, { standort: "see", ausdehnung: [141, 141] }] as const) {
      const s = erzeugeSiedlung({ keim: "g", optionen: { art: "stadt", zellgroesse: 32, ...optionen } }, grundriss);
      expect(s.karte.geometry.regions.length).toBeLessThanOrEqual(4096);
    }
  }, 180_000);
  it("liefert nur gültige Viertel-Zonenpläne", () => {
    for (const standort of ["gebirge", "huegel"] as const) for (let i = 0; i < 6; i++) {
      const s = erzeugeSiedlung({ keim: `p${i}`, optionen: { art: "stadt", standort } }, grundriss);
      expect(() => parseSettlementPlan(s.bericht.viertelPlan), `${standort}/${i}`).not.toThrow();
    }
  }, 120_000);
  it("nennt eine Burgzone außerhalb der Stadt, statt die Burg stumm wegzulassen", () => {
    const planung = { schemaVersion: 1 as const, zonen: [{ id: "b", name: "Burg", nutzung: "burg" as const, dichte: 1, polygon: [[0, 0], [.04, 0], [.04, .04], [0, .04]] as const }] };
    const s = erzeugeSiedlung({ keim: "burg:aussen", optionen: { art: "stadt", standort: "ebene", planung } }, grundriss);
    expect(s.bauwerke.some(b => b.typ === "burg")).toBe(false);
    expect(s.bericht.ausgelassen.join(" ")).toContain("Burgzone");
  }, 30_000);
  it("zerlegt die Flur einer Moorstadt in begrenzt viele Stücke (vorher: Speicher voll, Server tot)", () => {
    const t0 = performance.now();
    const s = erzeugeSiedlung({ keim: "d5:moor", optionen: { art: "stadt", standort: "moor" } }, gemalt);
    expect(s.bauwerke.length).toBeGreaterThan(200);
    expect(performance.now() - t0).toBeLessThan(15_000);
  }, 60_000);
});
