// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseAssetpaket, type RoadPlan } from "@chronicle/szene";
import { erzeugeSiedlung } from "../src/siedlung.ts";

const pack = (id: string) => parseAssetpaket(readFileSync(fileURLToPath(new URL(`../../../assets/packs/${id}/paket.json`, import.meta.url)), "utf8"));
const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0, 16);
const paket = pack("pk.grundriss");
const FAELLE = (["weiler", "dorf", "stadt"] as const).flatMap(art => (["fluss", "kueste", "huegel", "moor", "ebene"] as const).map(standort => [art, standort] as const));
const fingerabdruck = (s: ReturnType<typeof erzeugeSiedlung>) => hash({ karte: s.karte, cartography: s.cartography, knoten: s.knoten, bericht: s.bericht });

/** Teil 2 baut die Viertelpipeline in eine Pipeline mit Stilen um (Spec 2026-09-23-stadt-zukunft,
 *  E3/E4). Fantasy muss dabei Byte für Byte bleiben, was Teil 1 gebaut hat. */
describe("Fantasy v11 bleibt unverändert", () => {
  it.each(FAELLE)("%s %s", (art, standort) => {
    const s = erzeugeSiedlung({ keim: `gold11:${art}:${standort}`, optionen: { art, standort } }, paket);
    expect(s.version).toBe("11");
    expect(fingerabdruck(s)).toMatchSnapshot();
  }, 30_000);
  it("Stadt mit Zonenplan", () => {
    const planung = { schemaVersion: 1 as const, zonen: [{ id: "w", name: "West", nutzung: "handwerk" as const, dichte: .8, polygon: [[0, 0], [.5, 0], [.5, 1], [0, 1]] as const }] };
    expect(fingerabdruck(erzeugeSiedlung({ keim: "gold11:plan", optionen: { art: "stadt", planung } }, paket))).toMatchSnapshot();
  }, 30_000);
  it("Stadt mit Straßenplan", () => {
    const verkehr: RoadPlan = { schemaVersion: 1, maxSteigung: 24, knoten: [{ id: "a", name: "Westtor", art: "tor", position: [.1, .5] }, { id: "b", name: "Markt", art: "platz", position: [.85, .5] }],
      verbindungen: [{ id: "ab", von: "a", nach: "b", art: "hauptstrasse", bruecke: false }] };
    expect(fingerabdruck(erzeugeSiedlung({ keim: "gold11:verkehr", optionen: { art: "stadt", standort: "ebene", verkehr } }, paket))).toMatchSnapshot();
  }, 30_000);
});
