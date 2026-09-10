// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  assetIndex, parseAssetpaket, parseTacticalMapDocument, pruefeContainment, pruefeStampVerweise,
  serializeTacticalMapDocument, type AssetpaketV1,
} from "@chronicle/szene";
import { trustKnotenId } from "@chronicle/core";
import { GrundrissError, erzeugeGrundriss, erzeugeHoehle } from "../src/index.ts";

/**
 * Gate **A-G3 · Die Höhle** — the second map kind, and the assumption it breaks.
 *
 * `erzeugeGrundriss` emits a four-point rectangle per room, because its rooms *are* rectangles.
 * That made "the scene format carries arbitrary region polygons" a statement about the type and
 * not about any code in this repository. A cavern chamber is a blob, so this generator has to
 * trace an outline — and that is the assertion this file exists for.
 *
 * The other half is what the cavern refuses. A UVTT portal is a door or a window
 * (`tactical-map.ts:21-25`); a narrow passage between two chambers is neither, and emitting one
 * would put a false statement into an interchange format four other tools read. So a cavern emits
 * no portals and says why in its report, rather than producing a plausible-looking lie.
 */

const PAKET_DIR = fileURLToPath(new URL("../../../assets/packs/pk.grundriss/", import.meta.url));
const paket: AssetpaketV1 = parseAssetpaket(readFileSync(`${PAKET_DIR}paket.json`, "utf8"));
const index = assetIndex([paket]);

const graben = (keim: string, optionen: Record<string, unknown> = {}) =>
  erzeugeHoehle({ keim, titel: "Prüfhöhle", optionen }, paket);

const SAATEN = ["eron:hohlgang:1", "eron:schlund:2", "andaria/tropfstein-3", "0", "ß-keim"];

describe("A-G3 · Höhle — Determinismus und Optionsvektor", () => {
  it("liefert zweimal dasselbe Dokument und dieselben Ids", () => {
    const a = graben("eron:hohlgang:1"), b = graben("eron:hohlgang:1");
    expect(serializeTacticalMapDocument(b.karte)).toBe(serializeTacticalMapDocument(a.karte));
    expect(b.knoten.map((k) => k.id)).toStrictEqual(a.knoten.map((k) => k.id));
    expect(b.bericht).toStrictEqual(a.bericht);
  });

  it("behandelt jede geänderte Option als andere Höhle, auch geometrisch", () => {
    const a = graben("eron:hohlgang:1");
    const grundform = (g: typeof a) => g.raeume.map((r) => r.zellen.join(":")).join("|");
    for (const optionen of [{ fuellung: 0.5 }, { glaettung: 3 }, { kammern: 5 }, { zellen: [40, 30] }, { moeblierung: 0.5 }, { licht: false }] as const) {
      const b = graben("eron:hohlgang:1", optionen);
      expect(b.keim.keimHash, JSON.stringify(optionen)).not.toBe(a.keim.keimHash);
      expect(grundform(b), JSON.stringify(optionen)).not.toBe(grundform(a));
    }
  });

  it("trägt einen eigenen Erzeugernamen — eine Höhle ist kein Grundriss mit anderen Zahlen", () => {
    const h = graben("eron:hohlgang:1");
    expect(h.art).toBe("hoehle");
    expect(h.erzeuger).toBe("chronicle-hoehle");
    expect(h.keim.generator).toBe("chronicle-hoehle");
    // Same seed, different generator ⇒ different world. Otherwise two artefacts would share ids.
    const g = erzeugeGrundriss({ keim: "eron:hohlgang:1" }, paket);
    expect(h.keim.keimHash).not.toBe(g.keim.keimHash);
    expect(h.wurzelId).not.toBe(g.wurzelId);
  });
});

describe("A-G3 · Höhle — die Region ist ein Umriss, kein Kasten", () => {
  it("liefert für jede Kammer ein echtes Polygon", () => {
    for (const keim of SAATEN) {
      const h = graben(keim);
      const ecken = h.karte.geometry.regions.map((r) => r.punkte.length);
      expect(ecken.every((n) => n >= 3), keim).toBe(true);
      // A rectangle would be four points. Caverns are not rectangles, and at least one chamber
      // must prove it or the tracing code is not being exercised at all.
      expect(ecken.some((n) => n > 8), `${keim}: ${ecken.join(",")}`).toBe(true);
    }
  });

  it("schließt jeden Umriss und hält ihn auf dem Zellraster", () => {
    const h = graben("eron:hohlgang:1");
    const z = h.karte.grid.kind === "square" ? h.karte.grid.size : 64;
    for (const region of h.karte.geometry.regions) {
      for (const [x, y] of region.punkte) {
        expect(Number.isInteger(x / z), `${x}`).toBe(true);
        expect(Number.isInteger(y / z), `${y}`).toBe(true);
      }
      // Consecutive ring points are axis-parallel: a traced cell boundary never runs diagonally.
      for (let i = 0; i < region.punkte.length; i++) {
        const a = region.punkte[i]!, b = region.punkte[(i + 1) % region.punkte.length]!;
        expect(a[0] === b[0] || a[1] === b[1], `${a} -> ${b}`).toBe(true);
      }
    }
  });

  it("hält jeden Umrisspunkt innerhalb der Karte", () => {
    for (const keim of SAATEN) {
      const h = graben(keim);
      const [breite, hoehe] = h.karte.geometry.size;
      for (const region of h.karte.geometry.regions) for (const [x, y] of region.punkte) {
        expect(x >= 0 && x <= breite && y >= 0 && y <= hoehe, `${keim}: ${x},${y}`).toBe(true);
      }
    }
  });

  it("benutzt die KnotenId der Kammer als Region-Id", () => {
    const h = graben("eron:hohlgang:1");
    // Since version 2 the rock mass is a region of its own (the cave's ground); every other region is a chamber.
    const felsMasse = h.cartography!.regions.find(role => role.role === "terrain")!.regionId;
    expect(h.karte.geometry.regions.map((r) => r.id).filter(id => id !== felsMasse).sort()).toStrictEqual(h.raeume.map((r) => r.id).sort());
  });
});

describe("A-G3 · Höhle — was sie nicht behauptet", () => {
  it("erzeugt keine Portale und nennt den Grund", () => {
    for (const keim of SAATEN) {
      const h = graben(keim);
      expect(h.karte.portals, keim).toStrictEqual([]);
      expect(h.raeume.every((r) => r.tueren.length === 0), keim).toBe(true);
      expect(h.bericht.tueren, keim).toBe(0);
    }
    const ausgelassen = graben("eron:hohlgang:1").bericht.ausgelassen.join(" ");
    expect(ausgelassen).toContain("Keine Portale");
    expect(ausgelassen).toContain("Innenloch");
    expect(ausgelassen).toContain("zweite Ebene");
  });

  it("wurzelt als `ort`, nicht als `bauwerk` — niemand hat eine Höhle gebaut", () => {
    const h = graben("eron:hohlgang:1");
    const wurzel = h.knoten.find((k) => k.id === h.wurzelId)!;
    expect(wurzel.art).toBe("ort");
    expect(erzeugeGrundriss({ keim: "x" }, paket).knoten[0]!.art).toBe("bauwerk");
  });

  it("hängt unter einem Elternknoten und besteht die Containment-Prüfung", () => {
    const weltId = trustKnotenId("welt-hoehlenpruefstand");
    const h = erzeugeHoehle({
      keim: "eron:hohlgang:1",
      eltern: { knotenId: weltId, art: "liegt_in_geografie", bei: [10, 20], massstab: 8 },
    }, paket);
    expect(pruefeContainment([
      { id: weltId, art: "welt", titel: "Prüfwelt", eltern: [], rahmen: { ursprung: [0, 0], einheitenProPixel: 1, ordnung: "xy", hoch: "unten" }, anker: null, herkunft: null, sichtAnker: null },
      ...h.knoten,
    ])).toStrictEqual([]);
  });
});

describe("A-G3 · Höhle — begehbar, bestückt, gültig", () => {
  it("wird vom kanonischen Parser angenommen", () => {
    for (const keim of SAATEN) {
      const h = graben(keim);
      expect(serializeTacticalMapDocument(parseTacticalMapDocument(serializeTacticalMapDocument(h.karte)))).toBe(serializeTacticalMapDocument(h.karte));
    }
  });

  it("löst jeden Stamp gegen das echte Paket auf und bedient jede Themenanfrage", () => {
    for (const keim of SAATEN) {
      const h = graben(keim);
      expect(pruefeStampVerweise(h.karte.geometry, index), keim).toStrictEqual([]);
      expect(h.bericht.nichtBedient, keim).toStrictEqual([]);
      expect(h.bericht.bodenzellen, keim).toBeGreaterThan(0);
    }
  });

  it("bedeckt jede Bodenzelle mit genau einer Kammer", () => {
    for (const keim of SAATEN) {
      const h = graben(keim);
      const boeden = h.karte.geometry.stamps.filter((s) => index.get(s.a)!.asset.art === "boden");
      const stellen = new Set(boeden.map((s) => `${s.x}:${s.y}`));
      expect(stellen.size, keim).toBe(boeden.length);
      expect(boeden.length, keim).toBe(h.bericht.bodenzellen);
    }
  });

  it("hält sich über den Optionsraum an seine Zusagen", () => {
    for (let i = 0; i < 24; i++) {
      const optionen = {
        zellen: [20 + (i % 13) * 2, 16 + (i % 11)],
        kammern: 2 + (i % 7), fuellung: 0.4 + (i % 4) * 0.03, glaettung: 2 + (i % 4),
        moeblierung: (i % 5) / 4, licht: i % 2 === 0,
      };
      const h = graben(`raster:${i}`, optionen);
      const wo = JSON.stringify(optionen);
      expect(h.raeume.length, wo).toBeGreaterThanOrEqual(2);
      expect(h.raeume.length, wo).toBeLessThanOrEqual(optionen.kammern);
      expect(pruefeStampVerweise(h.karte.geometry, index), wo).toStrictEqual([]);
      expect(h.karte.portals, wo).toStrictEqual([]);
    }
  });
});

describe("A-G3 · Höhle — Grenzen", () => {
  for (const [name, auftrag, code] of [
    ["leerer Keim", { keim: " " }, "option"],
    ["Füllung außerhalb", { keim: "a", optionen: { fuellung: 0.9 } }, "option"],
    ["Kammerzahl 1", { keim: "a", optionen: { kammern: 1 } }, "option"],
    ["Raster zu klein", { keim: "a", optionen: { zellen: [4, 4] } }, "option"],
    ["Zellbudget", { keim: "a", optionen: { zellen: [180, 180] } }, "budget"],
    ["zu viele Kammern für den Hohlraum", { keim: "a", optionen: { zellen: [12, 12], kammern: 32, mindestFlaeche: 40 } }, "geometrie"],
  ] as const) {
    it(`weist „${name}" mit Code ${code} zurück`, () => {
      let gefangen: unknown;
      try { erzeugeHoehle(auftrag as never, paket); } catch (error) { gefangen = error; }
      expect(gefangen).toBeInstanceOf(GrundrissError);
      expect((gefangen as GrundrissError).code).toBe(code);
    });
  }
});

describe("the cave owns its chambers like a house owns its rooms", () => {
  it("stores the rock as ground and every chamber as a stone-floored room that owns the stamps, lights and walls on its cells", () => {
    const cave = erzeugeHoehle({ keim: "cave:owner", optionen: { licht: true, moeblierung: 1 } }, paket);
    expect(cave.cartography).toBeDefined();
    const roles = cave.cartography!.regions, rock = roles.filter(role => role.role === "terrain"), rooms = roles.filter(role => role.role === "room");
    expect(rock).toHaveLength(1); expect(rock[0]).toMatchObject({ role: "terrain", material: "rock" });
    expect(rooms).toHaveLength(cave.raeume.length);
    for (const room of rooms) expect(room.role === "room" && room.interior?.floor).toBe("stone");
    const owned = rooms.flatMap(room => room.role === "room" ? room.interior!.stampIds : []);
    expect(new Set(owned).size).toBe(owned.length);
    expect(owned.length).toBeGreaterThan(cave.karte.geometry.stamps.length * .8);
    const lights = rooms.flatMap(room => room.role === "room" ? room.interior!.lightIds : []);
    expect(lights.length).toBe(cave.karte.lights.length);
    const walls = rooms.flatMap(room => room.role === "room" ? room.interior!.wallIds : []);
    expect(walls.length).toBeGreaterThan(cave.karte.walls.length * .9);
    expect(cave.karte.geometry.regions.some(region => region.id === rock[0]!.regionId)).toBe(true);
  });
});
