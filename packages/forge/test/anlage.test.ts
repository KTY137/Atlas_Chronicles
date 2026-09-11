// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseAssetpaket, parseTacticalCartography, parseTacticalMapDocument, serializeTacticalMapDocument } from "@chronicle/szene";
import { ANLAGE_ARTEN, ANLAGE_ERZEUGER, ANLAGE_STANDARD, anlageOptionen, erzeugeAnlage, type AnlageArt, type AnlageOptionen } from "../src/anlage.ts";
import { idFabrik } from "../src/kartenwerk.ts";
import { flaeche, schnittKonvex } from "../src/polygon.ts";
import { erzeugeSiedlung } from "../src/siedlung.ts";
import { erzeugeGrundriss } from "../src/grundriss.ts";
import { RELIEF_STANDORTE } from "../src/relief.ts";

const pack = parseAssetpaket(readFileSync(new URL("../../../assets/packs/pk.gemalt/paket.json", import.meta.url), "utf8"));
const make = (anlage: AnlageArt, more: Partial<AnlageOptionen> = {}, seed = "compound-regression") => erzeugeAnlage({ keim: seed, titel: "Anlage", optionen: { anlage, ...more } }, pack);

describe("architectural compounds on the existing map contract", () => {
  it.each(ANLAGE_ARTEN)("%s is deterministic, round-trippable and keeps durable building addresses", anlage => {
    const result = make(anlage);
    expect(make(anlage)).toEqual(result);
    expect(parseTacticalMapDocument(serializeTacticalMapDocument(result.karte))).toEqual(result.karte);
    expect(parseTacticalCartography(result.cartography, result.karte)).toEqual(result.cartography);
    expect(result.erzeuger).toBe(ANLAGE_ERZEUGER);
    expect(result.keim.optionen.anlage).toBe(anlage);
    expect(result.bauwerke.length).toBe(ANLAGE_STANDARD[anlage].bauwerke);
    for (const b of result.bauwerke) {
      const node = result.knoten.find(n => n.id === b.id)!;
      expect(node.bauwerk?.typ).toBe(b.typ);
      expect(node.herkunft?.kindKeim).toBeTruthy();
      expect(result.karte.geometry.regions.some(r => r.id === b.id)).toBe(true);
      expect(result.strassen.some(r => r.id === b.strasse)).toBe(true);
      const interior = erzeugeGrundriss({ keim: node.herkunft!.kindKeim!, optionen: { profil: b.typ } }, pack);
      expect(interior.raeume.length).toBeGreaterThan(1);
    }
  });
  it("uses a ring wall, gate and keep for castles, but axial wings and parterres for palaces", () => {
    const castle = make("burg"), palace = make("schloss");
    expect(castle.karte.walls).toHaveLength(5); expect(castle.karte.portals).toHaveLength(1);
    expect(castle.karte.portals[0]!.closed).toBe(false);
    expect(castle.bauwerke.some(b => b.titel === "Bergfried")).toBe(true);
    expect(palace.karte.walls).toHaveLength(0); expect(palace.karte.portals).toHaveLength(0);
    expect(palace.bauwerke.filter(b => b.titel.endsWith("flügel"))).toHaveLength(2);
    expect(palace.cartography.regions.filter(r => r.role === "terrain" && r.material === "field")).toHaveLength(6);
    expect(palace.keim.keimHash).not.toBe(castle.keim.keimHash);
  });
  it("bridges the moat and leaves the gate opening free of walls", () => {
    const result = make("burg", { graben: true }), gate = result.karte.portals[0]!;
    const ids = idFabrik(result.erzeuger, result.version, result.keim.keimHash);
    for (let i = 0; i < 4; i++) expect(result.cartography.regions.find(r => r.regionId === ids.geometrieId("water", `moat:${i}`))).toMatchObject({ role: "water", material: "lake" });
    expect(result.cartography.regions.some(r => r.role === "road" && r.material === "bridge")).toBe(true);
    for (const wall of result.karte.walls) {
      if (wall.points[0]![1] !== gate.position[1] || wall.points[1]![1] !== gate.position[1]) continue;
      const [left, right] = wall.points.map(p => p[0]).sort((a, b) => a - b);
      expect(gate.position[0] <= left! || gate.position[0] >= right!).toBe(true);
    }
  });
  it.each(ANLAGE_ARTEN)("%s has no roof/roof, roof/water or roof/road overlaps across locations", anlage => {
    for (const standort of RELIEF_STANDORTE) {
      const result = make(anlage, { standort, ausdehnung: [32, 28] }, `compound:${standort}`);
      const z = result.karte.grid.kind === "square" ? result.karte.grid.size : 1;
      const roofs = result.bauwerke.map(b => b.umriss);
      const obstacleIds = new Set(result.cartography.regions.filter(r => r.role === "water" || r.role === "road").map(r => r.regionId));
      const obstacles = result.karte.geometry.regions.filter(r => obstacleIds.has(r.id)).map(r => r.punkte.map(p => [p[0] / z, p[1] / z] as const));
      roofs.forEach((roof, i) => {
        for (const other of [...roofs.slice(i + 1), ...obstacles]) {
          const intersection = schnittKonvex(roof, other);
          expect(intersection.length < 3 ? 0 : flaeche(intersection), `${anlage}/${standort} roof ${i}`).toBeLessThan(.002);
        }
      });
      for (const region of result.karte.geometry.regions) for (const [x, y] of region.punkte) {
        expect(x).toBeGreaterThanOrEqual(0); expect(y).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThanOrEqual(32 * z); expect(y).toBeLessThanOrEqual(28 * z);
      }
    }
  });
  it("controls palace symmetry without breaking the gate-to-wing approach", () => {
    const symmetric = make("schloss", { symmetrie: 1 }), irregular = make("schloss", { symmetrie: 0 });
    const wings = symmetric.bauwerke.filter(b => b.pfad.endsWith("wing"));
    expect(wings[0]!.umriss.map(p => p[1])).toEqual(wings[1]!.umriss.map(p => p[1]));
    expect(irregular.bauwerke.find(b => b.pfad === "east-wing")!.umriss).not.toEqual(wings[1]!.umriss);
  });
  it("never runs the ordinary town generator to fabricate an architectural type", () => {
    const village = erzeugeSiedlung({ keim: "before-after", optionen: { art: "weiler" } }, pack);
    make("burg"); make("schloss");
    expect(erzeugeSiedlung({ keim: "before-after", optionen: { art: "weiler" } }, pack)).toEqual(village);
    expect(make("burg").erzeuger).not.toBe(village.erzeuger);
  });
  it("changes geometry with a new seed and honors light/count settings", () => {
    const a = make("burg", { bauwerke: 7, licht: false }, "A"), b = make("burg", {}, "B");
    expect(a.bauwerke).toHaveLength(7); expect(a.karte.lights).toHaveLength(0);
    expect(b.karte.lights).toHaveLength(12); expect(a.bauwerke[0]!.umriss).not.toEqual(b.bauwerke[0]!.umriss);
  });
  it.each([
    { anlage: "fake" }, { anlage: "burg", art: "stadt" }, { anlage: "burg", symmetrie: 1 }, { anlage: "schloss", graben: false },
    { anlage: "burg", ausdehnung: [24, 24] }, { anlage: "burg", bauwerke: 6 }, { anlage: "schloss", bauwerke: 8 },
    { anlage: "schloss", symmetrie: NaN }, { anlage: "burg", graben: "false" }, { anlage: "burg", licht: undefined },
  ])("rejects invalid or irrelevant options %j", input => {
    expect(() => anlageOptionen(input as Partial<AnlageOptionen>)).toThrow();
  });
});
