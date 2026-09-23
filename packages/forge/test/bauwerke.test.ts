// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { assetIndex, BAUWERK_TYPEN, parseAssetpaket, parseTacticalMapDocument, serializeTacticalMapDocument } from "@chronicle/szene";
import { BAUWERK_AUSDEHNUNG, bauwerkAusdehnung, erzeugeGrundriss, erzeugeSiedlung } from "../src/index.ts";

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
    expect(() => erzeugeGrundriss({ keim: "a", optionen: { profil: "zitadelle" as never } }, paket)).toThrow();
    expect(() => erzeugeGrundriss({ keim: "a", optionen: { profil: null as never } }, paket)).toThrow();
    expect(() => erzeugeGrundriss({ keim: "a", optionen: { profil: "kirche", zellen: [12, 12], minRaum: 10 } }, paket)).toThrow();
  });
});

describe("a typed building is one house: sized by its kind, enclosed, entered from the street", () => {
  const stampAt = (g: ReturnType<typeof erzeugeGrundriss>, art: string) => g.karte.geometry.stamps.filter(s => s.a.split("/")[1]?.startsWith(art));
  for (const profil of ["haus", "kirche", "taverne", "schmiede", "lager", "turm"] as const) it(`${profil}: default extent, hallway between the rooms, a front door with the entrance mark inside it`, () => {
    const g = erzeugeGrundriss({ keim: `haus:${profil}`, optionen: { profil, moeblierung: 0 } }, paket), z = g.keim.optionen.zellgroesse as number;
    expect(g.karte.geometry.size).toEqual(BAUWERK_AUSDEHNUNG[profil].map(cells => cells * z));
    expect(g.karte.geometry.size[0]).toBeLessThanOrEqual(24 * z);
    // The gaps the program leaves between rooms are hallway floor now, so the house is enclosed.
    expect(g.bericht.gangzellen).toBeGreaterThan(0);
    for (const room of g.raeume) expect(room.tueren.length, room.thema).toBeGreaterThan(0);
    // The front door sits on the building's bottom wall: the one portal at the lowest room edge.
    const bottom = Math.max(...g.raeume.map(room => (room.zellen[1] + room.zellen[3]) * z));
    const front = g.karte.portals.filter(portal => portal.position[1] === bottom && portal.rotationRadians === 0);
    expect(front).toHaveLength(1);
    // The entrance mark stands in the cell just inside the front door, on top of that cell's floor.
    const marks = g.karte.geometry.stamps.filter(stamp => Math.abs(stamp.x - front[0]!.position[0]) < 1e-6 && Math.abs(stamp.y - (front[0]!.position[1] - z / 2)) < 1e-6);
    expect(marks.length).toBeGreaterThanOrEqual(2);
    expect(g.bericht.stampsNachArt["marke"]).toBe(1);
    expect(stampAt(g, "boden").length).toBeGreaterThan(g.raeume.length);
  });
  it("scales the interior from the building's outline on the town map, within the program's limits", () => {
    expect(bauwerkAusdehnung("haus")).toEqual(BAUWERK_AUSDEHNUNG.haus);
    expect(bauwerkAusdehnung("haus", [3, 2])).toEqual([14, 12]);
    expect(bauwerkAusdehnung("kirche", [6, 5])).toEqual([27, 23]);
    expect(bauwerkAusdehnung("lager", [12, 12])).toEqual([40, 30]);
    expect(bauwerkAusdehnung("turm", [1, 1])).toEqual([12, 12]);
    for (const profil of BAUWERK_TYPEN) {
      const [w, h] = bauwerkAusdehnung(profil);
      expect(w).toBeGreaterThanOrEqual(12); expect(h).toBeGreaterThanOrEqual(12); expect(w * h).toBeLessThanOrEqual(1200);
      const g = erzeugeGrundriss({ keim: `default:${profil}`, optionen: { profil, moeblierung: 0 } }, paket);
      expect(g.raeume.length).toBeGreaterThanOrEqual(2);
    }
  });
  it("keeps an explicitly chosen extent and the free floorplan's canvas untouched", () => {
    const chosen = erzeugeGrundriss({ keim: "gewählt", optionen: { profil: "haus", zellen: [24, 18], moeblierung: 0 } }, paket);
    expect(chosen.karte.geometry.size).toEqual([24 * 64, 18 * 64]);
    const free = erzeugeGrundriss({ keim: "frei", optionen: { profil: "frei", moeblierung: 0 } }, paket);
    expect(free.karte.geometry.size).toEqual([40 * 64, 30 * 64]);
  });
});

describe("furniture stands where it belongs", () => {
  const cell = (stamp: { x: number; y: number }, z: number) => [Math.floor(stamp.x / z), Math.floor(stamp.y / z)] as const;
  it("puts beds and shelves against a wall of their room, tables in the open and chairs at a table facing it", () => {
    let beds = 0, wallBeds = 0, chairs = 0, seated = 0, tables = 0, openTables = 0;
    for (const keim of ["moebel:1", "moebel:2", "moebel:3", "moebel:4"]) {
      const g = erzeugeGrundriss({ keim, optionen: { profil: "taverne", zellen: [24, 18] } }, paket), z = g.keim.optionen.zellgroesse as number;
      const rooms = g.raeume.map(room => ({ room, cells: new Set(Array.from({ length: room.zellen[2] }, (_, dx) => Array.from({ length: room.zellen[3] }, (_, dy) => `${room.zellen[0] + dx}:${room.zellen[1] + dy}`)).flat()) }));
      const roomOf = (x: number, y: number) => rooms.find(({ cells }) => cells.has(`${x}:${y}`));
      const SEITEN = [[0, -1], [1, 0], [0, 1], [-1, 0]] as const;
      const isWall = (x: number, y: number) => { const own = roomOf(x, y); return !!own && SEITEN.some(([dx, dy]) => !own.cells.has(`${x + dx}:${y + dy}`)); };
      const stamps = g.karte.geometry.stamps, name = (stamp: { a: string }) => stamp.a.split("/")[1]!;
      const footprint = (stamp: { x: number; y: number; r: number }, w0: number, h0: number) => {
        const quer = Math.abs(Math.round(stamp.r / (Math.PI / 2))) % 2 === 1, w = quer ? h0 : w0, h = quer ? w0 : h0;
        const zx = Math.round(stamp.x / z - w / 2), zy = Math.round(stamp.y / z - h / 2), cells: [number, number][] = [];
        for (let yy = zy; yy < zy + h; yy++) for (let xx = zx; xx < zx + w; xx++) cells.push([xx, yy]);
        return cells;
      };
      const tableCells = new Set<string>();
      for (const stamp of stamps.filter(s => name(s).startsWith("tisch"))) {
        tables++;
        const cells = footprint(stamp, name(stamp) === "tisch_lang" ? 2 : 1, 1);
        for (const [xx, yy] of cells) tableCells.add(`${xx}:${yy}`);
        if (cells.every(([xx, yy]) => !isWall(xx, yy))) openTables++;
      }
      for (const stamp of stamps.filter(s => name(s) === "bett" || name(s) === "regal")) {
        beds++;
        const cells = footprint(stamp, name(stamp) === "bett" ? 1 : 2, name(stamp) === "bett" ? 2 : 1);
        if (cells.some(([xx, yy]) => isWall(xx, yy))) wallBeds++;
      }
      for (const stamp of stamps.filter(s => name(s) === "stuhl")) {
        chairs++;
        const [x, y] = cell(stamp, z);
        if (SEITEN.some(([dx, dy]) => tableCells.has(`${x + dx}:${y + dy}`))) seated++;
      }
    }
    expect(beds).toBeGreaterThan(4); expect(wallBeds).toBe(beds);
    expect(tables).toBeGreaterThan(4); expect(openTables / tables).toBeGreaterThan(.6);
    expect(chairs).toBeGreaterThan(4); expect(seated / chairs).toBeGreaterThan(.8);
  });
  it("stays deterministic and keeps every piece inside its room with the new preferences", () => {
    const a = erzeugeGrundriss({ keim: "moebel:det", optionen: { profil: "haus" } }, paket), b = erzeugeGrundriss({ keim: "moebel:det", optionen: { profil: "haus" } }, paket);
    expect(serializeTacticalMapDocument(a.karte)).toBe(serializeTacticalMapDocument(b.karte));
    const z = a.keim.optionen.zellgroesse as number;
    for (const room of a.raeume) {
      const interior = a.cartography!.regions.find(region => region.regionId === room.id)!;
      if (interior.role !== "room" || !interior.interior) continue;
      for (const id of interior.interior.stampIds) {
        const stamp = a.karte.geometry.stamps.find(s => s.id === id)!;
        if (stamp.l < -50) continue;
        expect(stamp.x / z).toBeGreaterThan(room.zellen[0] - .01); expect(stamp.x / z).toBeLessThan(room.zellen[0] + room.zellen[2] + .01);
        expect(stamp.y / z).toBeGreaterThan(room.zellen[1] - .01); expect(stamp.y / z).toBeLessThan(room.zellen[1] + room.zellen[3] + .01);
      }
    }
  });
});

describe("Innenwände", () => {
  /** Jede Zellkante am Rand eines Raums, als `s|w:festeAchse:laufendeAchse`. */
  const raumKanten = (raum: { zellen: readonly [number, number, number, number] }): string[] => {
    const [x, y, w, h] = raum.zellen, kanten: string[] = [];
    for (let i = 0; i < w; i++) { kanten.push(`w:${y}:${x + i}`, `w:${y + h}:${x + i}`); }
    for (let i = 0; i < h; i++) { kanten.push(`s:${x}:${y + i}`, `s:${x + w}:${y + i}`); }
    return kanten;
  };
  /** Wandläufe und Türen in dieselben Einheitskanten zerlegt. */
  const belegteKanten = (karte: { walls: readonly { points: readonly (readonly [number, number])[] }[]; portals: readonly { bounds: readonly (readonly [number, number])[] }[] }, z: number) => {
    const wand = new Set<string>(), tuer = new Set<string>();
    const zerlege = (ziel: Set<string>, a: readonly [number, number], b: readonly [number, number]) => {
      const [ax, ay] = [Math.round(a[0] / z), Math.round(a[1] / z)], [bx, by] = [Math.round(b[0] / z), Math.round(b[1] / z)];
      if (ax === bx) for (let i = Math.min(ay, by); i < Math.max(ay, by); i++) ziel.add(`s:${ax}:${i}`);
      else for (let i = Math.min(ax, bx); i < Math.max(ax, bx); i++) ziel.add(`w:${ay}:${i}`);
    };
    for (const w of karte.walls) for (let i = 1; i < w.points.length; i++) zerlege(wand, w.points[i - 1]!, w.points[i]!);
    for (const p of karte.portals) zerlege(tuer, p.bounds[0]!, p.bounds[1]!);
    return { wand, tuer };
  };

  it("umschliesst jeden Raum eines Gebäudes — jede Raumkante ist Wand oder Tür, nie offener Boden", () => {
    for (const typ of ["haus", "taverne", "kirche", "schmiede", "hotel"] as const) {
      const innen = erzeugeGrundriss({ keim: `innenwand:${typ}`, optionen: { profil: typ } }, paket);
      const z = innen.keim.optionen.zellgroesse as number;
      const { wand, tuer } = belegteKanten(innen.karte, z);
      const offen = innen.raeume.flatMap(raum => raumKanten(raum).filter(kante => !wand.has(kante) && !tuer.has(kante)));
      expect({ typ, offen }).toEqual({ typ, offen: [] });
    }
  });

  it("stellt jede Tür in eine Wand statt in die freie Fläche", () => {
    const innen = erzeugeGrundriss({ keim: "innenwand:tuerlinie", optionen: { profil: "haus" } }, paket);
    const z = innen.keim.optionen.zellgroesse as number;
    const { wand, tuer } = belegteKanten(innen.karte, z);
    // Eine Tür sitzt in einer Wandlinie: an mindestens einem ihrer beiden Enden geht die Wand weiter.
    for (const kante of tuer) {
      const [achse, fest, lauf] = kante.split(":") as [string, string, string];
      const vor = `${achse}:${fest}:${Number(lauf) - 1}`, nach = `${achse}:${fest}:${Number(lauf) + 1}`;
      expect({ kante, inWand: wand.has(vor) || wand.has(nach) }).toEqual({ kante, inWand: true });
    }
  });
});

describe("fantasy civic buildings added for district towns", () => {
  it.each(["burg", "rathaus", "muehle", "bauernhof", "kaserne"] as const)("builds an interior with at least two rooms for %s", typ => {
    const g = erzeugeGrundriss({ keim: `neu:${typ}`, optionen: { profil: typ } }, paket);
    expect(g.raeume.length).toBeGreaterThanOrEqual(2);
    expect(g.knoten.find(n => n.id === g.wurzelId)?.bauwerk?.typ).toBe(typ);
  });
});

