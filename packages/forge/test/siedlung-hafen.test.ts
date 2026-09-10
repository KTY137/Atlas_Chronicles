// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseAssetpaket } from "@chronicle/szene";
import { erzeugeSiedlung } from "../src/siedlung.ts";

const paket = parseAssetpaket(readFileSync(new URL("../../../assets/packs/pk.gemalt/paket.json", import.meta.url), "utf8"));
const piers = (standort: "kueste" | "see" | "fluss" | "ebene" | "gebirge", art: "dorf" | "stadt" = "dorf") => {
  const map = erzeugeSiedlung({ keim: `hafen:${standort}`, optionen: { standort, art, licht: false } }, paket);
  const regions = new Map(map.karte.geometry.regions.map(region => [region.id, region.punkte]));
  return { map, piers: map.cartography.regions.filter(role => role.role === "road" && role.material === "steg").map(role => regions.get(role.regionId)!) };
};

describe("a settlement on the water has its landing", () => {
  it("builds one pier for a village on a coast, lake or river, two for a coastal town, and none inland", () => {
    for (const standort of ["kueste", "see", "fluss"] as const) {
      const { map, piers: found } = piers(standort);
      expect(found, standort).toHaveLength(1);
      expect(map.strassen.some(road => map.cartography.regions.some(role => role.regionId === road.id && role.role === "road" && role.material === "steg")), standort).toBe(true);
      // The pier stands mostly in the water and never under a roof.
      const water = map.cartography.regions.filter(role => role.role === "water").map(role => map.karte.geometry.regions.find(region => region.id === role.regionId)!.punkte);
      const centre = found[0]!.reduce(([x, y], p) => [x + p[0] / found[0]!.length, y + p[1] / found[0]!.length], [0, 0]);
      const inside = (point: readonly number[], polygon: readonly (readonly [number, number])[]) => { let result = false; for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) { const a = polygon[i]!, b = polygon[j]!; if ((a[1] > point[1]!) !== (b[1] > point[1]!) && point[0]! < (b[0] - a[0]) * (point[1]! - a[1]) / (b[1] - a[1]) + a[0]) result = !result; } return result; };
      expect(water.some(polygon => inside(centre, polygon)), standort).toBe(true);
    }
    expect(piers("kueste", "stadt").piers).toHaveLength(2);
    expect(piers("ebene").piers).toHaveLength(0); expect(piers("gebirge").piers).toHaveLength(0);
  }, 60_000);
});
