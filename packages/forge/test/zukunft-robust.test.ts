// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseAssetpaket, TACTICAL_CARTOGRAPHY_LIMITS, type RoadPlan } from "@chronicle/szene";
import { GrundrissError } from "../src/kartenwerk.ts";
import { erzeugeSiedlung } from "../src/siedlung.ts";

const paket = parseAssetpaket(readFileSync(fileURLToPath(new URL("../../../assets/packs/pk.zeitwelten/paket.json", import.meta.url)), "utf8"));
const SETTINGS = ["gegenwart", "scifi"] as const;

/** Spec 2026-09-23-stadt-zukunft, Review Focus: Eingaben, die die Oberfläche erlaubt, dürfen weder
 *  den Server lahmlegen noch mit einem rohen Fehler enden, und keine Karte sprengt ihre Grenzen. */
describe("Gegenwart und Sci-Fi halten gewöhnliche Eingaben aus", () => {
  it.each(SETTINGS)("%s: Großstadt 88×64 mit 480 Gebäuden bleibt im Budget", setting => {
    const t0 = performance.now();
    const s = erzeugeSiedlung({ keim: `gross:${setting}`, optionen: { setting, art: "stadt", ausdehnung: [88, 64], bauwerke: 480 } }, paket);
    expect(performance.now() - t0).toBeLessThan(15_000);
    expect(s.karte.geometry.regions.length).toBeLessThanOrEqual(4096);
    expect(JSON.stringify(s.cartography).length).toBeLessThanOrEqual(TACTICAL_CARTOGRAPHY_LIMITS.documentBytes);
    expect(s.bauwerke.length).toBeGreaterThanOrEqual(240);
  }, 60_000);
  it.each(SETTINGS)("%s: große Moor-, See- und Inselstädte bleiben unter 4096 Flächen", setting => {
    for (const standort of ["moor", "see", "insel"] as const) {
      const s = erzeugeSiedlung({ keim: `flaechen:${setting}:${standort}`, optionen: { setting, standort, art: "stadt", zellgroesse: 32, ausdehnung: [192, 104] } }, paket);
      expect(s.karte.geometry.regions.length, standort).toBeLessThanOrEqual(4096);
    }
  }, 180_000);
  it.each(SETTINGS)("%s: winzige Karten liefern eine Karte oder eine erklärte Absage", setting => {
    for (const standort of ["insel", "moor", "see"] as const) for (let i = 0; i < 4; i++) {
      try { erzeugeSiedlung({ keim: `klein:${setting}:${standort}:${i}`, optionen: { setting, standort, art: "dorf", ausdehnung: [12, 12] } }, paket); }
      catch (error) { expect(error, `${standort}/${i}`).toBeInstanceOf(GrundrissError); }
    }
  }, 60_000);
  it.each(SETTINGS)("%s: ein Straßenplan wird gebaut", setting => {
    const verkehr: RoadPlan = { schemaVersion: 1, maxSteigung: 24, knoten: [{ id: "a", name: "Tor", art: "tor", position: [.12, .5] }, { id: "b", name: "Platz", art: "platz", position: [.5, .5] }],
      verbindungen: [{ id: "ab", von: "a", nach: "b", art: "hauptstrasse", bruecke: false }] };
    const s = erzeugeSiedlung({ keim: `verkehr:${setting}`, optionen: { setting, art: "stadt", standort: "ebene", relief: 0, verkehr } }, paket);
    expect(s.version).toBe("12");
    expect(s.bericht.verkehr!.routes.every(r => r.status === "gebaut")).toBe(true);
  }, 30_000);
});
