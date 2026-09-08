// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { BAUWERK_SETTINGS, KARTEN_SETTINGS, assetIndex, parseAssetpaket, pruefeStampVerweise, serializeTacticalMapDocument } from "@chronicle/szene";
import { erzeugeGrundriss, erzeugeSiedlung } from "../src/index.ts";

const paket = parseAssetpaket(readFileSync(new URL("../../../assets/packs/pk.zeitwelten/paket.json", import.meta.url), "utf8"));
const index = assetIndex([paket]);

describe("the real Zeitwelten pack serves the era-specific generators", () => {
  it("contains exactly 100 distinct assets with their own content evidence", () => {
    expect(paket.assets).toHaveLength(100);
    expect(new Set(paket.assets.map(asset => asset.name)).size).toBe(100);
    expect(new Set(paket.assets.map(asset => asset.sha256)).size).toBe(100);
  });

  for (const setting of ["gegenwart", "scifi"] as const) for (const profil of BAUWERK_SETTINGS[setting]) {
    it(`${setting}/${profil} resolves every room query without selecting foreign-era props`, () => {
      const g = erzeugeGrundriss({ keim: `real-pack:${setting}:${profil}`, optionen: { setting, profil } }, paket);
      expect(g.bericht.nichtBedient).toEqual([]);
      expect(pruefeStampVerweise(g.karte.geometry, index)).toEqual([]);
      expect(g.karte.geometry.stamps.length).toBeGreaterThan(g.bericht.bodenzellen);
      expect(g.keim.optionen.paket).toEqual({ id: paket.id, version: paket.version, zellgroesse: paket.zellgroesse });
      for (const stamp of g.karte.geometry.stamps) {
        const asset = index.get(stamp.a)!.asset;
        expect(!KARTEN_SETTINGS.some(era => asset.schlagworte.includes(era)) || asset.schlagworte.includes(setting), `${stamp.a} in ${setting}`).toBe(true);
      }
      const [w, h] = g.karte.geometry.size;
      expect(g.karte.geometry.regions.every(region => region.punkte.every(([x, y]) => x >= 0 && y >= 0 && x <= w && y <= h))).toBe(true);
      expect(g.raeume.every(room => room.tueren.length > 0)).toBe(true);
      if (setting === "scifi") expect(g.karte.geometry.stamps.some(stamp => {
        const asset = index.get(stamp.a)!.asset; return asset.art === "tuer" && asset.schlagworte.includes("schiebbar");
      })).toBe(true);
    });
  }

  it.each(["gegenwart", "scifi"] as const)("%s free floorplans use the same complete real asset contract", setting => {
    const map = erzeugeGrundriss({ keim: "free-audit", optionen: { setting } }, paket);
    expect(map.bericht.nichtBedient).toEqual([]);
    expect(pruefeStampVerweise(map.karte.geometry, index)).toEqual([]);
    expect(map.raeume.every(room => room.tueren.length > 0)).toBe(true);
  });

  for (const setting of KARTEN_SETTINGS) {
    it(`${setting} cities have real era-appropriate floors and street furnishings`, () => {
      const request = { keim: "zeitstadt", optionen: { setting, art: "stadt" as const, ausdehnung: [40, 30] as const, bauwerke: 32 } };
      const city = erzeugeSiedlung(request, paket);
      expect(city.bericht.nichtBedient).toEqual([]);
      expect(pruefeStampVerweise(city.karte.geometry, index)).toEqual([]);
      expect(serializeTacticalMapDocument(erzeugeSiedlung(request, paket).karte)).toBe(serializeTacticalMapDocument(city.karte));
      const assets = city.karte.geometry.stamps.map(stamp => index.get(stamp.a)!.asset);
      expect(assets.some(asset => asset.art === "boden")).toBe(true);
      if (setting !== "fantasy") expect(assets.some(asset => asset.schlagworte.includes("verkehr"))).toBe(true);
      expect(assets.every(asset => !KARTEN_SETTINGS.some(era => asset.schlagworte.includes(era)) || asset.schlagworte.includes(setting))).toBe(true);
    });
  }
});
