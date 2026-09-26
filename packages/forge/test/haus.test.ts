// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { BAUWERK_SETTINGS, floorPointInside, parseAssetpaket, type BauwerkTyp, type KartenSetting, type TacticalMapDocumentV1 } from "@chronicle/szene";
import { erzeugeHaus, geschossName, planeHaus, rahmenRechteck, rauschenFuerTest, type Haus } from "./haus-hilfe.ts";

const paket = (id: string) => parseAssetpaket(readFileSync(new URL(`../../../assets/packs/${id}/paket.json`, import.meta.url), "utf8"));
const FANTASY = paket("pk.grundriss"), ZEIT = paket("pk.zeitwelten"), GEMALT = paket("pk.gemalt"), GENRES = paket("pk.genres");
const packFuer = (s: KartenSetting) => s === "fantasy" ? FANTASY : ZEIT;
type Paket = typeof FANTASY;

const RECHTECK: [number, number][] = [[0, 0], [1.6, 0], [1.6, 1.1], [0, 1.1]];
const GEDREHT: [number, number][] = [[1, 0], [2.2, .7], [1.6, 1.7], [.4, 1]];
const TRAPEZ: [number, number][] = [[0, 0], [2, 0], [1.4, 1.2], [.3, 1.2]];
const L_FORM: [number, number][] = [[0, 0], [2.4, 0], [2.4, .9], [1, .9], [1, 2], [0, 2]];
const KREIS: [number, number][] = Array.from({ length: 12 }, (_, i) => [1 + Math.cos(i * Math.PI / 6) * .7, 1 + Math.sin(i * Math.PI / 6) * .7] as [number, number]);
const KREUZ: [number, number][] = [[1, 0], [2, 0], [2, 1], [3, 1], [3, 2], [2, 2], [2, 4], [1, 4], [1, 2], [0, 2], [0, 1], [1, 1]];

/** Zellmitte → Region; `null` außerhalb aller Räume. */
function raumBei(karte: TacticalMapDocumentV1, x: number, y: number): string | null {
  const treffer = karte.geometry.regions.filter(r => floorPointInside([x, y], r.punkte));
  return treffer.length ? treffer[0]!.id : null;
}

function pruefeHaus(h: Haus, setting: KartenSetting, pack: Paket = packFuer(setting)) {
  const grid = h.geschosse[0]!.grundriss.karte.grid, z = grid.kind === "none" ? 64 : grid.size;
  const rahmen = JSON.stringify({ size: h.geschosse[0]!.grundriss.karte.geometry.size, grid: h.geschosse[0]!.grundriss.karte.grid });
  for (const g of h.geschosse) {
    const karte = g.grundriss.karte, [pw, ph] = karte.geometry.size, W = pw / z, H = ph / z;
    expect(JSON.stringify({ size: karte.geometry.size, grid: karte.grid }), `${g.name}: gleicher Rahmen`).toBe(rahmen);
    // Räume überlappen nicht.
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const n = karte.geometry.regions.filter(r => floorPointInside([(x + .5) * z, (y + .5) * z], r.punkte)).length;
      expect(n, `${g.name} Feld ${x}:${y}`).toBeLessThanOrEqual(1);
    }
    // Wände liegen achsenparallel auf Zellkanten.
    for (const w of karte.walls) for (const [px, py] of w.points) { expect(px % z).toBe(0); expect(py % z).toBe(0); }
    // Jeder Raum ist über Türen erreichbar.
    const nachbarn = new Map<string, Set<string>>(), aussenTueren: string[] = [];
    for (const p of karte.portals) {
      const [[ax, ay], [bx, by]] = p.bounds, senk = ax === bx;
      const a = senk ? raumBei(karte, ax - z / 2, (ay + by) / 2) : raumBei(karte, (ax + bx) / 2, ay - z / 2);
      const b = senk ? raumBei(karte, ax + z / 2, (ay + by) / 2) : raumBei(karte, (ax + bx) / 2, ay + z / 2);
      if (a && b) { (nachbarn.get(a) ?? nachbarn.set(a, new Set()).get(a)!).add(b); (nachbarn.get(b) ?? nachbarn.set(b, new Set()).get(b)!).add(a); }
      else aussenTueren.push(p.id);
    }
    const eingang = g.grundriss.raeume.find(r => r.rolle === "eingang")?.id ?? karte.geometry.regions[0]!.id;
    const erreicht = new Set([eingang]), q = [eingang];
    while (q.length) for (const n of nachbarn.get(q.pop()!) ?? []) if (!erreicht.has(n)) { erreicht.add(n); q.push(n); }
    expect(erreicht.size, `${g.name}: alle Räume erreichbar`).toBe(karte.geometry.regions.length);
    expect(aussenTueren.length, `${g.name}: Haustür nur im Erdgeschoss`).toBe(g.stufe === 0 ? 1 : 0);
    // Kein Möbel steht in einer Türöffnung.
    const moebel = karte.geometry.stamps.filter(s => /\/(?!.*(boden|tuer|marke|fenster|teppich|laeufer|treppe))/.test(s.a) && s.l > -100 && s.l < 20);
    for (const p of karte.portals) {
      const [[ax, ay], [bx, by]] = p.bounds, senk = ax === bx;
      const zellen = senk ? [[ax - z / 2, (ay + by) / 2], [ax + z / 2, (ay + by) / 2]] : [[(ax + bx) / 2, ay - z / 2], [(ax + bx) / 2, ay + z / 2]];
      for (const [cx, cy] of zellen) for (const s of moebel) if (Math.abs(s.x - cx!) < z * .45 && Math.abs(s.y - cy!) < z * .45 && !/licht|stuhl|sitz|kerze/.test(s.a)) {
        const asset = pack.assets.find(a => s.a.endsWith(`/${a.name}`));
        if (asset && asset.einheiten[0] * asset.einheiten[1] === 1) expect.fail(`${g.name}: ${s.a} steht in der Tür ${p.id}`);
      }
    }
  }
  // Treppen: Position in beiden Geschossen im genannten Raum.
  for (const t of h.treppen) {
    const von = h.geschosse.find(g => g.stufe === t.vonStufe)!.grundriss.karte, nach = h.geschosse.find(g => g.stufe === t.nachStufe)!.grundriss.karte;
    expect(floorPointInside(t.position, von.geometry.regions.find(r => r.id === t.vonRaum)!.punkte)).toBe(true);
    expect(floorPointInside(t.position, nach.geometry.regions.find(r => r.id === t.nachRaum)!.punkte)).toBe(true);
  }
  expect(h.treppen.length).toBe(h.geschosse.length - 1);
  // Hinauf und hinunter sind auf jedem Geschoss zwei getrennte Punkte.
  for (const g of h.geschosse) {
    const punkte = h.treppen.filter(t => t.vonStufe === g.stufe || t.nachStufe === g.stufe).map(t => t.position.join());
    expect(new Set(punkte).size, `${g.name}: getrennte Treppenpunkte`).toBe(punkte.length);
  }
}

describe("Hausplan: Häuser von innen aus dem echten Umriss", () => {
  it("baut ein Fantasy-Haus mit Keller, Erdgeschoss und Obergeschoss und verbindet sie mit Treppen", () => {
    const h = erzeugeHaus({ keim: "haus:1", profil: "haus", setting: "fantasy", umriss: RECHTECK }, FANTASY);
    expect(h.geschosse.map(g => g.name)).toEqual(["Keller", "Erdgeschoss", "Obergeschoss"]);
    pruefeHaus(h, "fantasy");
    const eg = h.geschosse.find(g => g.stufe === 0)!.grundriss;
    expect(eg.knoten.find(k => k.id === eg.wurzelId)?.bauwerk?.typ).toBe("haus");
    expect(eg.knoten.filter(k => k.art === "raum").map(k => k.titel)).toEqual(expect.arrayContaining(["Stube", "Küche"]));
  });

  it("ist deterministisch und hängt vom Keim ab", () => {
    const a = erzeugeHaus({ keim: "gleich", profil: "taverne", setting: "fantasy", umriss: TRAPEZ }, FANTASY);
    const b = erzeugeHaus({ keim: "gleich", profil: "taverne", setting: "fantasy", umriss: TRAPEZ }, FANTASY);
    const c = erzeugeHaus({ keim: "anders", profil: "taverne", setting: "fantasy", umriss: TRAPEZ }, FANTASY);
    expect(b.geschosse.map(g => g.grundriss.karte)).toEqual(a.geschosse.map(g => g.grundriss.karte));
    expect(c.geschosse[0]!.grundriss.keim.keimHash).not.toBe(a.geschosse[0]!.grundriss.keim.keimHash);
  });

  it("folgt dem Umriss: eine L-Form bleibt eine L-Form, ein Rundbau wird radial geteilt", () => {
    const r = rauschenFuerTest("l");
    const L = planeHaus({ umriss: L_FORM, profil: "haus", setting: "gegenwart", r });
    const flaeche = L.drin.reduce((s, v) => s + v, 0), R = rahmenRechteck(L_FORM);
    expect(flaeche / ((R.u1 - R.u0) * (R.n1 - R.n0) * L.massstab ** 2)).toBeLessThan(.8);
    const rund = planeHaus({ umriss: KREIS, profil: "raumstation", setting: "scifi", r: rauschenFuerTest("k") });
    expect(rund.rund).toBe(true);
    expect(rund.treppe?.rund).toBe(true);
  });

  it("legt die Haustür auf die Straßenseite", () => {
    for (const [strasse, pruef] of [[[0, 1], (dx: number, dy: number) => dy], [[0, -1], (dx: number, dy: number) => -dy]] as const) {
      const p = planeHaus({ umriss: RECHTECK, profil: "haus", setting: "fantasy", strasse, r: rauschenFuerTest("t") });
      // Der Rahmen legt die lange Achse waagrecht; die Straße (in Elternkoordinaten) wird mitgedreht.
      expect(Math.abs(p.tuer.dx) + Math.abs(p.tuer.dy)).toBe(1);
      expect(pruef(p.tuer.dx, p.tuer.dy) !== 0 || p.tuer.dx !== 0).toBe(true);
    }
  });

  it("setzt Kamin, Theke, Esse und Altar als Pflichtstücke", () => {
    const zaehle = (h: Haus, stufe: number, name: RegExp) => h.geschosse.find(g => g.stufe === stufe)!.grundriss.karte.geometry.stamps.filter(s => name.test(s.a)).length;
    const taverne = erzeugeHaus({ keim: "schank", profil: "taverne", setting: "fantasy", umriss: GEDREHT }, FANTASY);
    pruefeHaus(taverne, "fantasy");
    expect(zaehle(taverne, 0, /\/(tisch|stuhl)/)).toBeGreaterThanOrEqual(4);
    const kirche = erzeugeHaus({ keim: "kirche", profil: "kirche", setting: "fantasy", umriss: KREUZ }, FANTASY);
    pruefeHaus(kirche, "fantasy");
    expect(zaehle(kirche, 0, /\/altar/)).toBeGreaterThanOrEqual(1);
  });

  for (const setting of ["fantasy", "gegenwart", "scifi"] as const) {
    it(`erzeugt jedes ${setting}-Gebäude in jeder Umrissform gültig`, () => {
      for (const profil of BAUWERK_SETTINGS[setting] as readonly BauwerkTyp[]) for (const [name, umriss] of Object.entries({ RECHTECK, GEDREHT, TRAPEZ, L_FORM, KREIS })) {
        const h = erzeugeHaus({ keim: `${setting}:${profil}:${name}`, profil, setting, umriss }, packFuer(setting));
        expect(h.geschosse.length, `${profil} ${name}`).toBeGreaterThanOrEqual(1);
        for (const g of h.geschosse) expect(g.name).toBe(geschossName(g.stufe, setting));
        pruefeHaus(h, setting);
      }
    }, 240_000);
  }

  // Ein Innenraum erbt den Stil seiner Stadt: auch ein gemaltes Dorf oder das Genre-Archiv trägt ein Haus.
  for (const [name, pack, settings] of [["gemalt", GEMALT, ["fantasy"]], ["genres", GENRES, ["fantasy", "gegenwart", "scifi"]]] as const) {
    it(`baut jedes Gebäude auch mit dem Paket ${name}`, () => {
      for (const setting of settings) for (const profil of BAUWERK_SETTINGS[setting] as readonly BauwerkTyp[]) for (const [form, umriss] of Object.entries({ RECHTECK, L_FORM, KREIS })) {
        const h = erzeugeHaus({ keim: `${name}:${setting}:${profil}:${form}`, profil, setting, umriss }, pack);
        expect(h.geschosse[0]!.grundriss.karte.geometry.stamps.every(s => s.a.startsWith(`${pack.id}/`)), `${name} ${profil}`).toBe(true);
        pruefeHaus(h, setting, pack);
      }
    }, 240_000);
  }
});
