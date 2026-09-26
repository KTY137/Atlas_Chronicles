// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseAssetpaket, parseTacticalCartography, TACTICAL_CARTOGRAPHY_LIMITS } from "@chronicle/szene";
import { GrundrissError } from "../src/kartenwerk.ts";
import { erzeugeSiedlung, SIEDLUNG_LIMITS } from "../src/siedlung.ts";

const pack = (id: string) => parseAssetpaket(readFileSync(fileURLToPath(new URL(`../../../assets/packs/${id}/paket.json`, import.meta.url)), "utf8"));
const grundriss = pack("pk.grundriss"), zeitwelten = pack("pk.zeitwelten");

/** Kaya 2026-09-26: „max 1000 Gebäude ca. statt nur 256", dann „make it 1024 buildings". Eine Metropole muss in die Grenzen des
 *  Kartenformats passen (4096 Flächen, 1 MiB Kartografie) und in vertretbarer Zeit entstehen. */
describe("Metropole mit bis zu 1024 Gebäuden", () => {
  it("nimmt 1024 Gebäude an und lehnt 1025 mit einer erklärten Absage ab", () => {
    expect(SIEDLUNG_LIMITS.bauwerkeMax).toBe(1024);
    expect(() => erzeugeSiedlung({ keim: "zu-viel", optionen: { art: "stadt", bauwerke: 1025 } }, grundriss)).toThrow(GrundrissError);
  });
  it.each([["fantasy", 700], ["gegenwart", 450], ["scifi", 400]] as const)("%s: 1024 verlangt auf 144×104 — gültig, in den Grenzen, mindestens %i Gebäude", (setting, mindestens) => {
    const t0 = performance.now();
    const s = erzeugeSiedlung({ keim: `metropole:${setting}`, optionen: { setting, art: "stadt", standort: "fluss", ausdehnung: [144, 104], zellgroesse: 64, bauwerke: 1024 } }, setting === "fantasy" ? grundriss : zeitwelten);
    const dauer = performance.now() - t0;
    expect(s.bauwerke.length).toBeGreaterThanOrEqual(mindestens);
    expect(s.bauwerke.length).toBeLessThanOrEqual(1024);
    expect(s.karte.geometry.regions.length).toBeLessThanOrEqual(4096);
    expect(JSON.stringify(s.cartography).length).toBeLessThanOrEqual(TACTICAL_CARTOGRAPHY_LIMITS.documentBytes);
    expect(() => parseTacticalCartography(s.cartography, s.karte)).not.toThrow();
    expect(dauer).toBeLessThan(40_000);
  }, 120_000);
  it.each(["fantasy", "gegenwart", "scifi"] as const)("%s: eine Moor-Metropole auf der größten Karte bleibt unter 4096 Flächen statt abzubrechen", setting => {
    const s = erzeugeSiedlung({ keim: `worst:${setting}:moor`, optionen: { setting, art: "stadt", standort: "moor", ausdehnung: [192, 104], zellgroesse: 64, bauwerke: 1024 } }, setting === "fantasy" ? grundriss : zeitwelten);
    expect(s.karte.geometry.regions.length).toBeLessThanOrEqual(4096);
    expect(s.bauwerke.length).toBeGreaterThan(400);
    expect(() => parseTacticalCartography(s.cartography, s.karte)).not.toThrow();
  }, 120_000);
});
