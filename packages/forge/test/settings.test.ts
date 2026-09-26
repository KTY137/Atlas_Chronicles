// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { BAUWERK_LABEL, BAUWERK_SETTINGS, BAUWERK_TYPEN, KARTEN_SETTINGS, assetIndex, parseAssetpaket, parseTacticalMapDocument,
  serializeTacticalMapDocument, type AssetpaketV1, type BauwerkTyp, type KartenSetting } from "@chronicle/szene";
import { erzeugeGrundriss, erzeugeSiedlung } from "../src/index.ts";
import { bestuecker, rauschen } from "../src/kartenwerk.ts";

const paket = parseAssetpaket(readFileSync(new URL("../../../assets/packs/pk.grundriss/paket.json", import.meta.url), "utf8"));
const index = assetIndex([paket]);

describe("settings and architectural programs", () => {
  it("exports 33 named programs, keeps the original six and recommends era-specific city services", () => {
    // 2026-09-23: +5 für die Viertelstadt (Burg, Rathaus, Mühle, Bauernhof, Kaserne), additiv angehängt.
    expect(BAUWERK_TYPEN).toHaveLength(33); expect(new Set(BAUWERK_TYPEN).size).toBe(33);
    expect(BAUWERK_TYPEN.slice(0, 6)).toEqual(["haus", "kirche", "taverne", "schmiede", "lager", "turm"]);
    for (const typ of BAUWERK_TYPEN) expect(BAUWERK_LABEL[typ]).toEqual(expect.any(String));
    expect(BAUWERK_SETTINGS.gegenwart).toEqual(expect.arrayContaining(["krankenhaus", "schule", "polizei", "supermarkt"]));
    expect(BAUWERK_SETTINGS.scifi).toEqual(expect.arrayContaining(["raumstation", "reaktor", "raumhafen", "medstation"]));
    expect(BAUWERK_SETTINGS.fantasy).toEqual(expect.arrayContaining(["burg", "rathaus", "muehle", "bauernhof", "kaserne"]));
  });

  for (const profil of BAUWERK_TYPEN) for (const zellen of [[12, 12], [40, 30]] as const) {
    it(`${profil} at ${zellen.join("×")} has reachable floors, distinct rooms and usable doors`, () => {
      // The legacy pack remains a valid consumer. Missing specialist props are reported;
      // geometric reachability is checked independently of the new pack's art delivery.
      const g = erzeugeGrundriss({ keim: "programs", optionen: { profil, zellen, moeblierung: 0 } }, paket);
      expect(parseTacticalMapDocument(g.karte)).toEqual(g.karte);
      expect(g.raeume.length).toBeGreaterThanOrEqual(2);
      const z = g.karte.grid.kind === "square" ? g.karte.grid.size : 64;
      const cells = new Set(g.karte.geometry.stamps.filter(s => index.get(s.a)?.asset.art === "boden").map(s => `${Math.floor(s.x / z)}:${Math.floor(s.y / z)}`));
      const queue = [...cells].slice(0, 1), visited = new Set(queue);
      for (let i = 0; i < queue.length; i++) {
        const [x, y] = queue[i]!.split(":").map(Number) as [number, number];
        expect(x).toBeGreaterThanOrEqual(0); expect(x).toBeLessThan(zellen[0]);
        expect(y).toBeGreaterThanOrEqual(0); expect(y).toBeLessThan(zellen[1]);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
          const key = `${x + dx}:${y + dy}`;
          if (cells.has(key) && !visited.has(key)) { visited.add(key); queue.push(key); }
        }
      }
      expect(visited.size).toBeGreaterThan(0); expect(visited.size).toBe(cells.size);
      for (const room of g.raeume) {
        expect(room.tueren.length, room.thema).toBeGreaterThan(0);
        expect(g.karte.geometry.regions.some(region => region.id === room.id)).toBe(true);
        expect(g.knoten.find(node => node.id === room.id)?.titel).toEqual(expect.any(String));
        const [x, y, w, h] = room.zellen;
        for (const other of g.raeume) if (other !== room) {
          const [ox, oy, ow, oh] = other.zellen;
          expect(x + w <= ox || ox + ow <= x || y + h <= oy || oy + oh <= y).toBe(true);
        }
      }
    });
  }

  it.each([
    ["krankenhaus", ["triage", "station", "operation", "analyse", "apotheke"]],
    ["schule", ["foyer", "klassenraum", "lehrerzimmer", "mensa"]],
    ["supermarkt", ["verkaufsflaeche", "kassen", "lager", "kuehllager"]],
    ["raumstation", ["schleuse", "kommando", "quartier", "lebenserhaltung", "medizin"]],
    ["reaktor", ["reaktorkern", "leitstelle", "kuehlung", "wartung", "schleuse"]],
  ] as const)("%s has its real room program, with geometry different from a house", (profil, expected) => {
    const g = erzeugeGrundriss({ keim: "uses", optionen: { profil } }, paket);
    expect(g.raeume.map(room => room.thema)).toEqual(expect.arrayContaining([...expected]));
    expect(g.raeume.map(room => room.zellen)).not.toEqual(erzeugeGrundriss({ keim: "uses", optionen: { profil: "haus" } }, paket).raeume.map(room => room.zellen));
  });

  it("settings change street planning and building programs as well as deterministic identities", () => {
    const cities = KARTEN_SETTINGS.map(setting => erzeugeSiedlung({ keim: "same-city", optionen: { setting, art: "stadt", bauwerke: 45 } }, paket));
    expect(new Set(cities.map(city => city.keim.keimHash)).size).toBe(3);
    expect(new Set(cities.map(city => JSON.stringify(city.strassen.map(road => road.umriss)))).size).toBe(3);
    for (const [i, city] of cities.entries()) {
      const setting = KARTEN_SETTINGS[i]!;
      expect(city.keim.optionen.setting).toBe(setting);
      expect(city.knoten.filter(node => node.art === "bauwerk").every(node => BAUWERK_SETTINGS[setting].includes(node.bauwerk!.typ))).toBe(true);
      const repeated = erzeugeSiedlung({ keim: "same-city", optionen: { setting, art: "stadt", bauwerke: 45 } }, paket);
      expect(serializeTacticalMapDocument(repeated.karte)).toBe(serializeTacticalMapDocument(city.karte));
      expect(repeated.knoten).toEqual(city.knoten);
    }
    expect(cities[1]!.bauwerke.map(b => b.typ)).toEqual(expect.arrayContaining(["krankenhaus", "bahnhof", "wohnblock"]));
    expect(cities[2]!.bauwerke.map(b => b.typ)).toEqual(expect.arrayContaining(["raumstation", "kommando", "reaktor"]));
    // Gegenwart hat einen Stadtring als Straße, keine Mauer; die Kolonie einen Schutzzaun (Spec 2026-09-23-stadt-zukunft, E8).
    expect(cities[1]!.karte.walls).toEqual([]); expect(cities[2]!.karte.walls.length).toBeGreaterThan(0);
    expect(cities[2]!.bauwerke.some(b => b.typ === "turm")).toBe(false);
  });

  it("stores the setting in floorplan identity and uses modern room programs in free layouts", () => {
    const modern = erzeugeGrundriss({ keim: "free", optionen: { setting: "gegenwart" } }, paket);
    const future = erzeugeGrundriss({ keim: "free", optionen: { setting: "scifi" } }, paket);
    expect(modern.keim.optionen.setting).toBe("gegenwart"); expect(future.keim.optionen.setting).toBe("scifi");
    expect(modern.keim.keimHash).not.toBe(future.keim.keimHash);
    for (const map of [modern, future]) expect(map.raeume.some(room => ["krypta", "waffenkammer", "tempel"].includes(room.thema))).toBe(false);
    expect(erzeugeGrundriss({ keim: "legacy" }, paket)).toEqual(erzeugeGrundriss({ keim: "legacy", optionen: { setting: "fantasy" } }, paket));
    expect(erzeugeSiedlung({ keim: "legacy" }, paket)).toEqual(erzeugeSiedlung({ keim: "legacy", optionen: { setting: "fantasy" } }, paket));
    for (const setting of ["modern", null, ""] as unknown as KartenSetting[]) {
      expect(() => erzeugeGrundriss({ keim: "bad", optionen: { setting } }, paket)).toThrow();
      expect(() => erzeugeSiedlung({ keim: "bad", optionen: { setting } }, paket)).toThrow();
    }
  });

  for (const setting of ["gegenwart", "scifi"] as const) for (const ausdehnung of [[24, 18], [40, 30]] as const) {
    it(`${setting} ${ausdehnung.join("×")} keeps every building next to its named street and inside the map`, () => {
      const city = erzeugeSiedlung({ keim: "frontage", optionen: { setting, art: "stadt", ausdehnung, bauwerke: 24 } }, paket);
      for (const building of city.bauwerke) {
        expect(building.umriss.every(([x, y]) => x >= 0 && y >= 0 && x <= ausdehnung[0] && y <= ausdehnung[1])).toBe(true);
        const street = city.strassen.find(street => street.id === building.strasse)!;
        expect(street).toBeDefined();
        let distance = Infinity;
        for (const [from, to] of [[building.umriss, street.umriss], [street.umriss, building.umriss]] as const) {
          for (const p of from) for (let i = 0; i < to.length; i++) {
            const a = to[i]!, b = to[(i + 1) % to.length]!, dx = b[0] - a[0], dy = b[1] - a[1];
            const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy || 1)));
            distance = Math.min(distance, Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy));
          }
        }
        expect(distance, building.pfad).toBeLessThanOrEqual(2);
      }
    });
  }

  it("allows neutral and selected-era assets, never props marked exclusively for another era", () => {
    const basis = paket.assets.find(asset => asset.art === "moebel")!;
    const fixture: AssetpaketV1 = { ...paket, assets: [
      { ...basis, name: "medieval", schlagworte: ["computer", "fantasy"] },
      { ...basis, name: "modern", schlagworte: ["computer", "gegenwart"] },
      { ...basis, name: "future", schlagworte: ["computer", "scifi"] },
      { ...basis, name: "neutral", schlagworte: ["computer"] },
    ] };
    for (const setting of KARTEN_SETTINGS) {
      const werk = bestuecker(fixture, rauschen("era-filter"), 64, (...path) => path.join(":"), setting);
      const choices = Array.from({ length: 100 }, () => werk.waehle("moebel", "computer")!);
      expect(choices.some(asset => asset.name === "neutral")).toBe(true);
      expect(choices.some(asset => asset.schlagworte.includes(setting))).toBe(true);
      expect(choices.every(asset => !KARTEN_SETTINGS.some(era => asset.schlagworte.includes(era)) || asset.schlagworte.includes(setting))).toBe(true);
    }
  });

  for (const stil of ["grundriss", "gemalt"] as const) for (const profil of ["bibliothek", "museum", "bank", "werkstatt"] as const) {
    it(`${profil} in fantasy uses the existing ${stil} pack with era-appropriate civic furniture`, () => {
      const classic = parseAssetpaket(readFileSync(new URL(`../../../assets/packs/pk.${stil}/paket.json`, import.meta.url), "utf8"));
      const map = erzeugeGrundriss({ keim: "classic-civic", optionen: { profil, setting: "fantasy" } }, classic);
      expect(map.bericht.nichtBedient).toEqual([]);
      expect(map.raeume.length).toBeGreaterThanOrEqual(4);
    });
  }
});
