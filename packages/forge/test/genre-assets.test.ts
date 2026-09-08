// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { BAUWERK_SETTINGS, KARTEN_SETTINGS, assetIndex, parseAssetpaket, pruefeStampVerweise } from "@chronicle/szene";
import { erzeugeGrundriss } from "../src/grundriss.ts";
import { erzeugeSiedlung } from "../src/siedlung.ts";

const pack = parseAssetpaket(readFileSync(new URL("../../../assets/packs/pk.genres/paket.json", import.meta.url), "utf8"));
const index = assetIndex([pack]);
const byName = new Map(pack.assets.map(asset => [`${pack.id}/${asset.name}`, asset]));
describe("genre archive artwork in the existing generators", () => {
  for (const setting of KARTEN_SETTINGS) {
    for (const profil of BAUWERK_SETTINGS[setting]) it(`${setting}/${profil} uses real genre artwork from the selected era`, () => {
      const result = erzeugeGrundriss({ keim: `genre:${setting}:${profil}`, optionen: { setting, profil } }, pack);
      expect(result.karte.geometry.stamps.length).toBeGreaterThan(10);
      expect(pruefeStampVerweise(result.karte.geometry, index)).toEqual([]);
      for (const stamp of result.karte.geometry.stamps) {
        const asset = byName.get(stamp.a)!;
        expect(asset.schlagworte.filter(tag => KARTEN_SETTINGS.includes(tag as typeof setting))).toEqual([setting]);
      }
    });
    it(`${setting} cities resolve every placed reference deterministically`, () => {
      const request = { keim: `genre-city:${setting}`, optionen: { setting, bauwerke: 24 } };
      const result = erzeugeSiedlung(request, pack);
      expect(pruefeStampVerweise(result.karte.geometry, index)).toEqual([]);
      expect(result.karte.geometry.stamps.length).toBeGreaterThan(10);
      expect(erzeugeSiedlung(request, pack)).toEqual(result);
      expect(result.bauwerke.length).toBeGreaterThan(2);
    });
  }
});
