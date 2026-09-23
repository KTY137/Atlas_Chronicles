// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseAssetpaket } from "@chronicle/szene";
import { erzeugeSiedlung } from "../src/siedlung.ts";

const pack = (id: string) => parseAssetpaket(readFileSync(fileURLToPath(new URL(`../../../assets/packs/${id}/paket.json`, import.meta.url)), "utf8"));
const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0, 16);
const FAELLE = [
  ["gegenwart", "dorf", "fluss"], ["gegenwart", "stadt", "kueste"], ["gegenwart", "weiler", "huegel"],
  ["scifi", "dorf", "ebene"], ["scifi", "stadt", "see"], ["scifi", "weiler", "insel"],
] as const;

/** Gegenwart und Sci-Fi bleiben bis zu ihrem eigenen Baustein (Teil 2) Byte für Byte, was sie
 *  waren (Spec 2026-09-23, E2). Ein Refactoring in `siedlung.ts` darf diese Hashes nicht bewegen. */
describe("Siedlung v8 bleibt für Gegenwart und Sci-Fi unverändert", () => {
  it.each(FAELLE)("%s %s %s", (setting, art, standort) => {
    const s = erzeugeSiedlung({ keim: `gold:${setting}:${art}:${standort}`, optionen: { setting, art, standort } }, pack("pk.zeitwelten"));
    expect(hash({ karte: s.karte, cartography: s.cartography, knoten: s.knoten, bericht: s.bericht, version: s.version })).toMatchSnapshot();
  }, 30_000);
  it("gegenwart stadt mit Zonenplan", () => {
    const planung = { schemaVersion: 1 as const, zonen: [{ id: "west", name: "West", nutzung: "handwerk" as const, dichte: .8, polygon: [[0, 0], [.5, 0], [.5, 1], [0, 1]] as const }] };
    const s = erzeugeSiedlung({ keim: "gold:plan", optionen: { setting: "gegenwart", art: "stadt", planung } }, pack("pk.zeitwelten"));
    expect(s.version).toBe("9");
    expect(hash({ karte: s.karte, cartography: s.cartography, knoten: s.knoten, bericht: s.bericht })).toMatchSnapshot();
  }, 30_000);
});
