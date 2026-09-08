// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { KARTEN_SETTINGS, parseAssetpaket, serializeTacticalMapDocument } from "@chronicle/szene";
import { erzeugeSiedlung, SIEDLUNG_STANDORTE, type Siedlung, type SiedlungStandort } from "../src/siedlung.ts";

const paket = parseAssetpaket(readFileSync(new URL("../../../assets/packs/pk.grundriss/paket.json", import.meta.url), "utf8"));
type Polygon = readonly (readonly [number, number])[];
// Independent separating-axis check; a concave L roof is tested as its two rectangular wings.
function overlaps(a: Polygon, b: Polygon): boolean {
  for (const poly of [a, b]) for (let i = 0; i < poly.length; i++) {
    const p = poly[i]!, n = poly[(i + 1) % poly.length]!, nx = n[1] - p[1], ny = p[0] - n[0];
    if (Math.hypot(nx, ny) < 1e-8) continue;
    const aa = a.map(([x, y]) => x * nx + y * ny), bb = b.map(([x, y]) => x * nx + y * ny);
    if (Math.max(...aa) <= Math.min(...bb) + .001 || Math.max(...bb) <= Math.min(...aa) + .001) return false;
  }
  return true;
}
function geometry(map: Siedlung, match: (role: Siedlung["cartography"]["regions"][number]) => boolean): Polygon[] {
  const ids = new Set(map.cartography.regions.filter(match).map(role => role.regionId));
  return map.karte.geometry.regions.filter(region => ids.has(region.id)).map(region => region.punkte);
}
function landIsBuildable(map: Siedlung, standort: SiedlungStandort) {
  const blocked = geometry(map, role => role.role === "water" || standort === "gebirge" && role.role === "terrain" && role.material === "rock");
  const buildings = geometry(map, role => role.role === "building").flatMap(p => p.length === 6 ? [[p[0]!, p[1]!, p[2]!, p[5]!], [p[2]!, p[3]!, p[4]!, p[5]!]] : [p]);
  const roads = standort === "fluss" ? [] : geometry(map, role => role.role === "road");
  for (const polygon of [...buildings, ...roads]) for (const obstacle of blocked) expect(overlaps(polygon, obstacle), `${standort}: built geometry overlaps water or rock`).toBe(false);
  expect(map.bauwerke.length).toBeGreaterThan(0);
  for (const building of map.bauwerke) expect(map.strassen.some(road => road.id === building.strasse)).toBe(true);
}

describe("settlement location owns physical terrain and buildable land", () => {
  it.each(SIEDLUNG_STANDORTE)("%s is deterministic, recorded in the seed and has dry building addresses", standort => {
    const request = { keim: "location:address", optionen: { standort, bauwerke: 24, licht: false } };
    const a = erzeugeSiedlung(request, paket), b = erzeugeSiedlung(request, paket);
    expect(a.keim.optionen.standort).toBe(standort);
    expect(serializeTacticalMapDocument(a.karte)).toBe(serializeTacticalMapDocument(b.karte));
    expect(a.cartography).toEqual(b.cartography);
    const water = a.cartography.regions.filter(role => role.role === "water");
    if (["ebene", "wald", "gebirge"].includes(standort)) expect(water).toHaveLength(0);
    else {
      expect(water.length).toBeGreaterThan(0);
      expect(water.every(role => role.material === (standort === "fluss" ? "river" : standort === "see" ? "lake" : "sea"))).toBe(true);
    }
    if (standort === "gebirge") expect(geometry(a, role => role.role === "terrain" && role.material === "rock").length).toBeGreaterThan(1);
    if (standort === "wald") expect(geometry(a, role => role.role === "terrain" && role.material === "forest").length).toBeGreaterThan(0);
    if (standort === "ebene") expect(geometry(a, role => role.role === "terrain" && role.material === "forest")).toHaveLength(0);
    if (standort === "insel") {
      const [w, h] = a.karte.geometry.size;
      const sea = geometry(a, role => role.role === "water");
      for (const [axis, edge] of [[0, 0], [0, w], [1, 0], [1, h]] as const) expect(sea.some(polygon => polygon.some(point => point[axis] === edge))).toBe(true);
    }
    landIsBuildable(a, standort);
  });

  it("keeps the historical river default while every explicit location changes the seed", () => {
    const make = (standort?: SiedlungStandort) => erzeugeSiedlung({ keim: "location:default", optionen: { art: "weiler", ...(standort ? { standort } : {}) } }, paket);
    const defaultMap = make();
    expect(defaultMap).toEqual(make("fluss"));
    expect(new Set(SIEDLUNG_STANDORTE.map(standort => make(standort).keim.keimHash)).size).toBe(7);
  });

  it.each(KARTEN_SETTINGS)("keeps low-bound coast, island and mountain settlements buildable in %s", setting => {
    for (const standort of ["kueste", "insel", "gebirge"] as const) for (const keim of ["location:small", "location:edge"]) {
      landIsBuildable(erzeugeSiedlung({ keim, optionen: { standort, setting, art: "weiler", ausdehnung: [12, 12], grundstueck: [2, 4], bauwerke: 9, licht: false } }, paket), standort);
    }
  });

  it.each(["mountains", "", null, 3])("rejects unknown locations: %s", standort => {
    expect(() => erzeugeSiedlung({ keim: "invalid", optionen: { standort: standort as SiedlungStandort } }, paket)).toThrow();
  });
});
