// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { assetIndex, parseAssetpaket, parseTacticalMapDocument, serializeTacticalMapDocument } from "@chronicle/szene";
import { erzeugeGrundriss, erzeugeSiedlung } from "../src/index.ts";

const paket = parseAssetpaket(readFileSync(new URL("../../../assets/packs/pk.grundriss/paket.json", import.meta.url), "utf8"));
const assets = assetIndex([paket]);

describe("named city buildings and architectural interiors", () => {
  it("gives a city a church, an inn and homes with stable editable metadata and distinct child seeds", () => {
    const a = erzeugeSiedlung({ keim: "stadt:kirchentuer", optionen: { art: "stadt" } }, paket);
    const b = erzeugeSiedlung({ keim: "stadt:kirchentuer", optionen: { art: "stadt" } }, paket);
    const knoten = a.knoten.filter(k => k.art === "bauwerk");
    expect(b.knoten).toEqual(a.knoten);
    expect(knoten.map(k => k.bauwerk?.typ)).toEqual(expect.arrayContaining(["kirche", "haus", "taverne"]));
    expect(new Set(knoten.map(k => k.titel)).size).toBe(knoten.length);
    expect(new Set(knoten.map(k => k.herkunft?.kindKeim)).size).toBe(knoten.length);
    for (const k of knoten) {
      expect(k.sichtAnker).toBeNull();
      expect(k.bauwerk?.beschreibung).toBe("");
      const bau = a.bauwerke.find(b => b.id === k.id)!;
      expect(bau.titel).toBe(k.titel); expect(bau.typ).toBe(k.bauwerk!.typ);
    }
    for (const typ of ["kirche", "haus"] as const) {
      const k = knoten.find(k => k.bauwerk?.typ === typ)!;
      const innen = erzeugeGrundriss({ keim: k.herkunft!.kindKeim!, titel: k.titel!, optionen: { profil: k.bauwerk!.typ } }, paket);
      expect(innen.knoten.find(n => n.id === innen.wurzelId)?.bauwerk?.typ).toBe(typ);
      expect(innen.knoten.find(n => n.id === innen.wurzelId)?.titel).toBe(k.titel);
    }
  });

  it("builds a church with a long nave, narrower sanctuary and cross wings; a home has domestic rooms", () => {
    const kirche = erzeugeGrundriss({ keim: "gleich", optionen: { profil: "kirche" } }, paket);
    const haus = erzeugeGrundriss({ keim: "gleich", optionen: { profil: "haus" } }, paket);
    expect(kirche.raeume.map(r => r.thema)).toEqual(["kirchenschiff", "altar", "sakristei", "kapelle"]);
    expect(haus.raeume.map(r => r.thema)).toEqual(["wohnraum", "kueche", "schlafzimmer", "schlafzimmer"]);
    const nave = kirche.raeume[0]!.zellen, altar = kirche.raeume[1]!.zellen;
    expect(nave[3]).toBeGreaterThan(nave[2]);
    expect(altar[2]).toBeLessThan(nave[2]);
    expect(altar[1] + altar[3]).toBeLessThan(nave[1]);
    expect(kirche.raeume.map(r => r.zellen)).not.toEqual(haus.raeume.map(r => r.zellen));
    expect(haus.knoten.map(k => k.titel)).toEqual(expect.arrayContaining(["Küche", "Wohnstube", "Schlafzimmer"]));
    expect(kirche.knoten.map(k => k.titel)).toEqual(expect.arrayContaining(["Kirchenschiff", "Altarraum"]));
    expect(kirche.keim.keimHash).not.toBe(haus.keim.keimHash);
  });

  for (const profil of ["haus", "kirche", "taverne", "schmiede", "lager", "turm"] as const) for (const zellen of [[12, 12], [24, 18], [40, 30]] as const) {
    it(`${profil} on ${zellen.join("×")} emits connected, bounded floors and doors to every room`, () => {
      const auftrag = { keim: `gebäude:${profil}:${zellen.join(":")}`, optionen: { profil, zellen, moeblierung: 0 } };
      const g = erzeugeGrundriss(auftrag, paket);
      expect(parseTacticalMapDocument(g.karte)).toEqual(g.karte);
      expect(serializeTacticalMapDocument(erzeugeGrundriss(auftrag, paket).karte)).toBe(serializeTacticalMapDocument(g.karte));
      expect(g.keim.optionen.profil).toBe(profil);
      expect(g.bericht.nichtBedient).toEqual([]);
      expect(g.raeume.length).toBeGreaterThanOrEqual(2);
      for (const r of g.raeume) expect(r.tueren.length, r.thema).toBeGreaterThan(0);
      const z = g.karte.grid.kind === "square" ? g.karte.grid.size : 64;
      const boden = new Set(g.karte.geometry.stamps.filter(s => assets.get(s.a)?.asset.art === "boden")
        .map(s => `${Math.floor(s.x / z)}:${Math.floor(s.y / z)}`));
      const offen = [...boden].slice(0, 1), gesehen = new Set(offen);
      for (let i = 0; i < offen.length; i++) {
        const [x, y] = offen[i]!.split(":").map(Number) as [number, number];
        expect(x).toBeGreaterThanOrEqual(0); expect(x).toBeLessThan(zellen[0]);
        expect(y).toBeGreaterThanOrEqual(0); expect(y).toBeLessThan(zellen[1]);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const key = `${x + dx!}:${y + dy!}`;
          if (boden.has(key) && !gesehen.has(key)) { gesehen.add(key); offen.push(key); }
        }
      }
      expect(boden.size).toBeGreaterThan(0);
      expect(gesehen.size).toBe(boden.size);
    });
  }

  it("preserves omitted legacy profiles as frei and rejects unknown profiles", () => {
    const a = erzeugeGrundriss({ keim: "legacy" }, paket);
    const b = erzeugeGrundriss({ keim: "legacy", optionen: { profil: "frei" } }, paket);
    expect(a).toEqual(b);
    expect(() => erzeugeGrundriss({ keim: "a", optionen: { profil: "burg" as never } }, paket)).toThrow();
    expect(() => erzeugeGrundriss({ keim: "a", optionen: { profil: null as never } }, paket)).toThrow();
    expect(() => erzeugeGrundriss({ keim: "a", optionen: { profil: "kirche", zellen: [12, 12], minRaum: 10 } }, paket)).toThrow();
  });
});
