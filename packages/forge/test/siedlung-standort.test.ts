// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { KARTEN_SETTINGS, parseAssetpaket, RELIEF_LEVELS, serializeTacticalMapDocument, TACTICAL_CARTOGRAPHY_LIMITS } from "@chronicle/szene";
import { erzeugeSiedlung, SIEDLUNG_STANDORTE, type Siedlung, type SiedlungStandort } from "../src/siedlung.ts";
import { MEERESSPIEGEL } from "../src/relief.ts";

const paket = parseAssetpaket(readFileSync(new URL("../../../assets/packs/pk.grundriss/paket.json", import.meta.url), "utf8"));
type Polygon = readonly (readonly [number, number])[];
type Role = Siedlung["cartography"]["regions"][number];
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
function geometry(map: Siedlung, match: (role: Role) => boolean): Polygon[] {
  const ids = new Set(map.cartography.regions.filter(match).map(role => role.regionId));
  return map.karte.geometry.regions.filter(region => ids.has(region.id)).map(region => region.punkte);
}
const isRiver = (role: Role) => role.role === "water" && role.material === "river";
const isStanding = (role: Role) => role.role === "water" && role.material !== "river";
const isRock = (role: Role) => role.role === "terrain" && role.material === "rock";
/** Houses never stand in any water or on rock. Streets stop at standing water and rock faces,
 * and wherever a street crosses a river the crossing is a bridge — in every location. */
function landIsBuildable(map: Siedlung, standort: SiedlungStandort) {
  const blocked = [...geometry(map, role => role.role === "water"), ...geometry(map, isRock)];
  const hard = [...geometry(map, isStanding), ...geometry(map, isRock)];
  const buildings = geometry(map, role => role.role === "building").flatMap(p => p.length === 6 ? [[p[0]!, p[1]!, p[2]!, p[5]!], [p[2]!, p[3]!, p[4]!, p[5]!]] : [p]);
  for (const polygon of buildings) for (const obstacle of blocked) expect(overlaps(polygon, obstacle), `${standort}: a building stands in water or on rock`).toBe(false);
  // A bridge stands over a river and a pier reaches into the water on purpose; every other road stops at the shore.
  const roads = geometry(map, role => role.role === "road" && role.material !== "bridge" && role.material !== "steg"), bridges = geometry(map, role => role.role === "road" && role.material === "bridge");
  for (const road of roads) for (const obstacle of hard) expect(overlaps(road, obstacle), `${standort}: a street runs through a lake, the sea or rock`).toBe(false);
  const rivers = geometry(map, isRiver);
  let crossings = 0;
  for (const road of roads) for (const river of rivers) {
    if (!overlaps(road, river)) continue;
    crossings++;
    expect(bridges.some(bridge => overlaps(bridge, river) && overlaps(bridge, road)), `${standort}: a street crosses a river without a bridge`).toBe(true);
  }
  expect(map.bauwerke.length).toBeGreaterThan(0);
  for (const building of map.bauwerke) expect(map.strassen.some(road => road.id === building.strasse)).toBe(true);
  return crossings;
}

describe("settlement location owns physical terrain and buildable land", () => {
  it.each(SIEDLUNG_STANDORTE)("%s is deterministic, recorded in the seed, carries its relief and has dry building addresses", standort => {
    const request = { keim: "location:address", optionen: { standort, bauwerke: 24, licht: false } };
    const a = erzeugeSiedlung(request, paket), b = erzeugeSiedlung(request, paket);
    expect(a.keim.optionen.standort).toBe(standort);
    expect(a.keim.optionen).toMatchObject({ relief: .5, bewaldung: .5 });
    expect(serializeTacticalMapDocument(a.karte)).toBe(serializeTacticalMapDocument(b.karte));
    expect(a.cartography).toEqual(b.cartography);
    // The relief is stored on the cartography, sampled on every construction-cell corner.
    const [w, h] = a.keim.optionen.ausdehnung as [number, number];
    expect(a.cartography.relief).toMatchObject({ schemaVersion: 1, columns: w + 1, rows: h + 1, seaLevel: MEERESSPIEGEL });
    expect(a.cartography.relief!.heights).toHaveLength((w + 1) * (h + 1));
    expect(a.cartography.regions.length).toBeLessThanOrEqual(TACTICAL_CARTOGRAPHY_LIMITS.regions);
    const standing = a.cartography.regions.filter(isStanding), rivers = a.cartography.regions.filter(isRiver);
    if (["ebene", "huegel", "wald", "gebirge", "fluss"].includes(standort)) expect(standing).toHaveLength(0);
    else {
      expect(standing.length).toBeGreaterThan(0);
      expect(standing.every(role => role.role === "water" && role.material === (standort === "kueste" || standort === "insel" ? "sea" : "lake"))).toBe(true);
    }
    if (standort === "fluss") expect(rivers.length).toBeGreaterThan(8);
    if (standort === "gebirge") {
      expect(geometry(a, isRock).length).toBeGreaterThan(1);
      expect(Math.max(...a.cartography.relief!.heights)).toBeGreaterThan(MEERESSPIEGEL + RELIEF_LEVELS.rockAbove);
    }
    if (standort === "huegel") expect(Math.max(...a.cartography.relief!.heights)).toBeGreaterThan(MEERESSPIEGEL + RELIEF_LEVELS.flatLand + 20);
    if (standort === "wald") expect(geometry(a, role => role.role === "terrain" && role.material === "forest").length).toBeGreaterThan(0);
    if (standort === "moor") expect(geometry(a, role => role.role === "terrain" && role.material === "swamp").length).toBeGreaterThan(0);
    if (standort === "insel") {
      const [w, h] = a.karte.geometry.size;
      const sea = geometry(a, isStanding);
      for (const [axis, edge] of [[0, 0], [0, w], [1, 0], [1, h]] as const) expect(sea.some(polygon => polygon.some(point => point[axis] === edge))).toBe(true);
    }
    landIsBuildable(a, standort);
  });

  it("keeps a plain open where a forest location is wooded, and bridges its guaranteed river", () => {
    const make = (standort: SiedlungStandort) => erzeugeSiedlung({ keim: "location:woods", optionen: { standort, bauwerke: 24, licht: false } }, paket);
    const forestArea = (map: Siedlung) => geometry(map, role => role.role === "terrain" && role.material === "forest").reduce((sum, p) => sum + Math.abs(p.reduce((s, a, i) => { const b = p[(i + 1) % p.length]!; return s + a[0] * b[1] - b[0] * a[1]; }, 0)) / 2, 0);
    expect(forestArea(make("ebene"))).toBeLessThan(forestArea(make("wald")) / 3);
    expect(landIsBuildable(make("fluss"), "fluss")).toBeGreaterThan(0);
  });

  it("keeps the historical river default while every explicit location changes the seed", () => {
    const make = (standort?: SiedlungStandort) => erzeugeSiedlung({ keim: "location:default", optionen: { art: "weiler", ...(standort ? { standort } : {}) } }, paket);
    const defaultMap = make();
    expect(defaultMap).toEqual(make("fluss"));
    expect(new Set(SIEDLUNG_STANDORTE.map(standort => make(standort).keim.keimHash)).size).toBe(SIEDLUNG_STANDORTE.length);
  });

  it("lets relief and woodland sliders change the seed and refuses values outside 0..1", () => {
    const make = (optionen: Record<string, unknown>) => erzeugeSiedlung({ keim: "location:sliders", optionen: { art: "weiler", standort: "huegel", ...optionen } as never }, paket);
    const flat = make({ relief: 0 }), mountainous = make({ relief: 1 });
    expect(flat.keim.keimHash).not.toBe(mountainous.keim.keimHash);
    expect(Math.max(...mountainous.cartography.relief!.heights) - Math.min(...mountainous.cartography.relief!.heights))
      .toBeGreaterThan(Math.max(...flat.cartography.relief!.heights) - Math.min(...flat.cartography.relief!.heights));
    expect(make({ bewaldung: 0 }).keim.keimHash).not.toBe(make({ bewaldung: 1 }).keim.keimHash);
    for (const value of [1.5, -1, "viel", Number.NaN]) {
      expect(() => make({ relief: value })).toThrow();
      expect(() => make({ bewaldung: value })).toThrow();
    }
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
