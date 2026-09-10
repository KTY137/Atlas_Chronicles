// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseAssetpaket, parseTacticalCartography, parseTacticalMapDocument, type TacticalPoint } from "@chronicle/szene";
import { erzeugeRegion, REGION_STANDARD, REGION_STANDORTE } from "../src/region.ts";
import { GrundrissError } from "../src/kartenwerk.ts";

const paket = parseAssetpaket(readFileSync(new URL("../../../assets/packs/pk.gemalt/paket.json", import.meta.url), "utf8"));
const HEAVY = 60_000;
const inside = (point: TacticalPoint, polygon: readonly TacticalPoint[]) => { let result = false; for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) { const a = polygon[i]!, b = polygon[j]!; if ((a[1] > point[1]) !== (b[1] > point[1]) && point[0] < (b[0] - a[0]) * (point[1] - a[1]) / (b[1] - a[1]) + a[0]) result = !result; } return result; };

describe("the region: the land above the towns", () => {
  it("settles the requested number of places apart from each other, on dry land, each with its own size and surroundings, and joins them all by road", () => {
    const region = erzeugeRegion({ keim: "probe:region", titel: "Probe", optionen: { standort: "huegel" } }, paket);
    expect(region.art).toBe("region"); expect(region.orte).toHaveLength(REGION_STANDARD.orte);
    expect(region.bericht).toMatchObject({ orte: 7, angefordert: 7, verbunden: true }); expect(region.bericht.strassen).toBeGreaterThan(6);
    const sizes = region.orte.map(ort => ort.groesse);
    expect(sizes.filter(size => size === "stadt")).toHaveLength(1); expect(sizes.filter(size => size === "dorf").length).toBeGreaterThanOrEqual(1); expect(sizes).toContain("weiler");
    for (const [index, ort] of region.orte.entries()) {
      expect(REGION_STANDORTE).toContain(ort.standort);
      expect(ort.titel).toMatch(/^[A-ZÄÖÜ][a-zäöüß]+$/);
      for (const other of region.orte.slice(index + 1)) expect(Math.hypot(other.mitte[0] - ort.mitte[0], other.mitte[1] - ort.mitte[1])).toBeGreaterThan(4);
      const water = region.cartography.regions.filter(role => role.role === "water").map(role => region.karte.geometry.regions.find(polygon => polygon.id === role.regionId)!);
      expect(water.some(polygon => inside([ort.mitte[0] * 112, ort.mitte[1] * 112], polygon.punkte))).toBe(false);
    }
    expect(new Set(region.orte.map(ort => ort.titel)).size).toBe(region.orte.length);
  }, HEAVY);
  it("stores every place as an enterable ort with its size and surroundings in the cartography and a node with a child seed, and leaves free names to the game master", () => {
    const region = erzeugeRegion({ keim: "probe:region" }, paket);
    const orte = region.cartography.regions.filter(role => role.role === "ort");
    expect(orte).toHaveLength(region.orte.length);
    for (const ort of region.orte) {
      const role = region.cartography.regions.find(role => role.regionId === ort.id);
      expect(role).toMatchObject({ role: "ort", groesse: ort.groesse, standort: ort.standort });
      const node = region.knoten.find(node => node.id === ort.id)!;
      expect(node.art).toBe("ort"); expect(node.titel).toBe(ort.titel); expect(node.herkunft?.kindKeim).toMatch(/^[0-9a-f]{32}$/);
      expect(node.herkunft?.erzeugungspfad).toEqual(["ort", ort.pfad, ort.groesse, ort.standort]);
      expect(region.cartography.labels).toBeUndefined();
    }
    expect(region.knoten.find(node => node.id === region.wurzelId)?.art).toBe("region");
    expect(() => parseTacticalMapDocument(region.karte)).not.toThrow();
    expect(() => parseTacticalCartography(region.cartography, region.karte)).not.toThrow();
    expect(region.cartography.relief).toBeDefined();
  }, HEAVY);
  it("is deterministic for the same seed and different for another, and every location kind carries a region", () => {
    const first = erzeugeRegion({ keim: "probe:region" }, paket), again = erzeugeRegion({ keim: "probe:region" }, paket), other = erzeugeRegion({ keim: "probe:region-2" }, paket);
    expect(again.karte).toEqual(first.karte); expect(again.cartography).toEqual(first.cartography); expect(again.keim.keimHash).toBe(first.keim.keimHash);
    expect(other.keim.keimHash).not.toBe(first.keim.keimHash); expect(other.orte.map(ort => ort.mitte)).not.toEqual(first.orte.map(ort => ort.mitte));
    for (const standort of REGION_STANDORTE) {
      const region = erzeugeRegion({ keim: `probe:${standort}`, optionen: { standort, orte: 4, ausdehnung: [32, 24] } }, paket);
      expect(region.orte.length).toBeGreaterThan(0); expect(region.cartography.regions.length).toBeLessThanOrEqual(4096);
    }
  }, HEAVY * 2);
  it.each([
    ["too many places", { orte: 25 }], ["no places", { orte: 0 }], ["a strange location", { standort: "wueste" }], ["a tiny sheet", { ausdehnung: [8, 8] }], ["a relief off the scale", { relief: 2 }],
  ])("refuses %s", (_reason, optionen) => {
    expect(() => erzeugeRegion({ keim: "probe:region", optionen: optionen as never }, paket)).toThrow(GrundrissError);
  });
});
