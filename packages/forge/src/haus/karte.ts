// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
/**
 * **Haus** — der Hausplan wird zu Karten: eine Karte je Geschoss, alle im selben Rahmen, und die
 * Treppen als Übergänge dazwischen.
 *
 * Jedes Geschoss ist ein vollständiger Grundriss im Sinne von `grundriss.ts` (Karte, Kartografie,
 * Knoten, Bericht), nur dass die Räume dem Hausplan folgen statt festen Rechtecken. Möbel, Böden,
 * Türen, Fenster und Treppen sind Stempel aus dem Paket; die Möbelregeln fragen das Paket nach
 * Art und Schlagwort und übernehmen die **echten Maße** des Assets, bevor geplant wird. So steht
 * kein Tisch halb in der Wand, und ein Paket ohne Kamin bekommt eine Feuerstelle statt einer Lücke.
 */
import { type CanonicalValue, type KnotenId } from "@chronicle/core";
import {
  BAUWERK_LABEL, BAUWERK_TYPEN, KARTEN_SETTINGS, parseTacticalMapDocument, parseTacticalCartography, weltkeim,
  type AssetpaketV1, type BauwerkTyp, type KartenSetting, type Knoten, type TacticalLight, type TacticalPortal, type TacticalWall,
} from "@chronicle/szene";
import {
  AUSGELASSEN_BASIS, baueKnoten, bestuecker, fail, idFabrik, passtZumSetting, rauschen, sortiereNachId, wandLaeufe,
  type GrundrissEltern, type GrundrissRaum,
} from "../kartenwerk.ts";
import { BAUWERK_AUSDEHNUNG, BAUWERK_MASSSTAB, ZEIT_THEMEN, zeitThema } from "../bauprogramme.ts";
import { imPolygon, type Polygon, type Punkt } from "../polygon.ts";
import type { Grundriss } from "../grundriss.ts";
import { planeHaus, HAUS_LIMITS, type HausGeschossPlan, type HausMoebel, type HausPlan } from "./plan.ts";
import { moebelFuer, MOEBEL_REGELN, type MoebelRegel } from "./programme.ts";

export const HAUS_ERZEUGER = "chronicle-haus";
/** Eine Erhöhung ist eine Migration: sie ändert jede Kennung, die dieses Modul prägt. */
export const HAUS_VERSION = "1";

type PaketAsset = AssetpaketV1["assets"][number];

export interface HausAuftrag {
  readonly keim: string;
  readonly titel?: string;
  readonly eltern?: GrundrissEltern;
  readonly profil: BauwerkTyp;
  readonly setting?: KartenSetting;
  /** Umriss auf der Elternkarte in deren Feldern, beliebig gedreht. Ohne Umriss ein Rechteck nach Gebäudetyp. */
  readonly umriss?: Polygon;
  /** Außennormale der Straßenseite (Elternkoordinaten). */
  readonly strasse?: Punkt;
  readonly zellgroesse?: number;
  readonly moeblierung?: number;
  readonly licht?: boolean;
}
export interface HausGeschoss { readonly stufe: number; readonly name: string; readonly grundriss: Grundriss }
export interface HausTreppe {
  readonly id: string; readonly name: string; readonly kind: "stairs";
  readonly vonStufe: number; readonly nachStufe: number;
  readonly vonRaum: KnotenId; readonly nachRaum: KnotenId;
  /** In Kartenpixeln; alle Geschosse teilen den Rahmen. */
  readonly position: readonly [number, number];
}
export interface Haus {
  readonly art: "haus"; readonly erzeuger: string; readonly version: string;
  readonly geschosse: readonly HausGeschoss[];
  readonly treppen: readonly HausTreppe[];
  readonly plan: HausPlan;
}

export function geschossName(stufe: number, setting: KartenSetting): string {
  if (setting === "scifi") return stufe < 0 ? "Unterdeck" : stufe === 0 ? "Hauptdeck" : "Oberdeck";
  return stufe < 0 ? "Keller" : stufe === 0 ? "Erdgeschoss" : "Obergeschoss";
}

/** Die Außennormale der Kante, vor der eine Straße liegt — die längste solche Kante. */
export function strassenSeite(umriss: Polygon, strassen: readonly Polygon[]): Punkt | undefined {
  let cx = 0, cy = 0; for (const [x, y] of umriss) { cx += x; cy += y; } cx /= umriss.length; cy /= umriss.length;
  let best: { l: number; n: Punkt } | undefined;
  for (let i = 0; i < umriss.length; i++) {
    const a = umriss[i]!, b = umriss[(i + 1) % umriss.length]!, l = Math.hypot(b[0] - a[0], b[1] - a[1]); if (l < 1e-6) continue;
    const m: Punkt = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; let n: Punkt = [(b[1] - a[1]) / l, -(b[0] - a[0]) / l];
    if ((m[0] - cx) * n[0] + (m[1] - cy) * n[1] < 0) n = [-n[0], -n[1]];
    const p: Punkt = [m[0] + n[0] * .35, m[1] + n[1] * .35];
    if (strassen.some(s => imPolygon(p, s)) && (!best || l > best.l)) best = { l, n };
  }
  return best?.n;
}

// -- Asset-Anfragen je Möbeltyp: erst das eigene Stück, dann Ersatz ----------------------------------
const Q = (...q: (readonly [string, string])[]) => q;
const ANFRAGEN: Readonly<Record<string, readonly (readonly [string, string])[]>> = Object.freeze({
  kamin: Q(["moebel", "kamin"], ["licht", "warm"]), herd: Q(["moebel", "herd"], ["moebel", "kuechenzeile"], ["licht", "warm"]),
  esse: Q(["moebel", "esse"], ["moebel", "handwerk"]), theke: Q(["moebel", "theke"], ["moebel", "empfang"], ["moebel", "mahl"]),
  kirchbank: Q(["moebel", "kirchbank"], ["moebel", "sitz"]), bank: Q(["moebel", "bank"], ["moebel", "sitz"]),
  teppich: Q(["aufbau", "teppich"]), teppich_klein: Q(["aufbau", "teppich"]), teppich_modern: Q(["aufbau", "teppich"]), laeufer: Q(["aufbau", "laeufer"], ["aufbau", "teppich"]),
  schrank: Q(["moebel", "schrank"], ["moebel", "kammer"], ["moebel", "lager"]), schrank_modern: Q(["moebel", "spind"], ["moebel", "regal"]),
  webstuhl: Q(["moebel", "webstuhl"], ["moebel", "handwerk"]), trog: Q(["gefaess", "trog"], ["gefaess", "vorrat"]),
  nachttisch: Q(["moebel", "nachttisch"], ["licht", "kerze"]), werkzeugwand: Q(["moebel", "werkzeug"], ["moebel", "handwerk"]),
  weinregal: Q(["moebel", "weinregal"], ["gefaess", "vorrat"]), tafel: Q(["moebel", "mahl"], ["moebel", "tisch"]),
  tisch: Q(["moebel", "kammer"], ["moebel", "tisch"], ["moebel", "mahl"]), rundtisch: Q(["moebel", "kammer"], ["moebel", "tisch"], ["moebel", "mahl"]),
  arbeitstisch: Q(["moebel", "werkbank"], ["moebel", "handwerk"], ["moebel", "mahl"]), truhe: Q(["gefaess", "schatz"], ["gefaess", "behaelter"]),
  regal: Q(["moebel", "regal"], ["moebel", "buecher"], ["moebel", "lager"]), kerzen: Q(["licht", "kerze"], ["licht", "warm"]),
  fass: Q(["gefaess", "lager"], ["gefaess", "behaelter"], ["gefaess", "vorrat"]), kisten: Q(["gefaess", "lager"], ["gefaess", "behaelter"]),
  sack: Q(["gefaess", "vorrat"], ["gefaess", "behaelter"]), behaelter: Q(["gefaess", "behaelter"], ["gefaess", "lager"]),
  bett: Q(["moebel", "bett"], ["moebel", "rast"]), bett_modern: Q(["moebel", "bett"], ["moebel", "rast"]), doppelbett: Q(["moebel", "bett"], ["moebel", "rast"]),
  koje: Q(["moebel", "koje"], ["moebel", "bett"], ["moebel", "rast"]), krankenbett: Q(["moebel", "krankenbett"], ["moebel", "bett"]),
  kryokapsel: Q(["moebel", "kryokapsel"], ["moebel", "bett"]), sofa: Q(["moebel", "sofa"], ["moebel", "sitz"]),
  sessel: Q(["moebel", "sitz"]), stuhl: Q(["moebel", "sitz"]), couchtisch: Q(["moebel", "couchtisch"], ["moebel", "tisch"]),
  esstisch: Q(["moebel", "mahl"], ["moebel", "tisch"]), fernseher: Q(["moebel", "fernseher"], ["moebel", "computer"]),
  pflanze: Q(["moebel", "pflanze"], ["aufbau", "garten"]), kuechenzeile: Q(["moebel", "kuechenzeile"]), kuehlschrank: Q(["moebel", "kuehlung"]),
  wc: Q(["moebel", "toilette"]), waschbecken: Q(["moebel", "sanitaer"], ["moebel", "wasser"]), dusche: Q(["moebel", "dusche"]), wanne: Q(["moebel", "wanne"], ["moebel", "dusche"]),
  schreibtisch: Q(["moebel", "schreibtisch"], ["moebel", "wissen"]), schreibpult: Q(["moebel", "wissen"], ["moebel", "schreibtisch"], ["moebel", "buecher"]),
  spielzeug: Q(["moebel", "spielzeug"]), tischtennis: Q(["moebel", "tischtennis"]), waschmaschine: Q(["moebel", "waschmaschine"]),
  heizung: Q(["aufbau", "heizung"], ["aufbau", "maschine"]), briefkaesten: Q(["moebel", "briefkasten"]),
  holotisch: Q(["moebel", "holotisch"], ["moebel", "konsole"]), spind: Q(["moebel", "spind"]), konsole: Q(["moebel", "konsole"], ["moebel", "computer"]),
  kommandokonsole: Q(["moebel", "konsole"], ["moebel", "computer"]), anzug: Q(["moebel", "anzug"], ["moebel", "spind"]),
  hydroregal: Q(["moebel", "hydroregal"], ["aufbau", "garten"]), tank: Q(["gefaess", "tank"], ["gefaess", "behaelter"]),
  rohre: Q(["aufbau", "rohre"], ["aufbau", "maschine"]), bildschirmwand: Q(["moebel", "bildschirm"], ["moebel", "konsole"]),
  labortisch: Q(["moebel", "labortisch"], ["moebel", "labor"]), reaktor: Q(["aufbau", "reaktor"], ["aufbau", "maschine"]),
  server: Q(["aufbau", "server"], ["moebel", "computer"]), waffenstaender: Q(["moebel", "waffe"]), ruestung: Q(["moebel", "ruestung"], ["moebel", "waffe"]),
  thron: Q(["aufbau", "thron"]), saeule: Q(["aufbau", "traeger"]), altar: Q(["moebel", "kult"]), sarkophag: Q(["moebel", "grab"]),
  amboss: Q(["moebel", "handwerk"]), werkbank: Q(["moebel", "werkbank"], ["moebel", "handwerk"]),
});
const LICHT: Readonly<Record<string, { farbe: string; staerke: number }>> = Object.freeze({
  kamin: { farbe: "ffdd8a33", staerke: .95 }, herd: { farbe: "ffdd8a33", staerke: .85 }, esse: { farbe: "ffe0702a", staerke: 1 },
  kerzen: { farbe: "ffe8c98a", staerke: .55 }, nachttisch: { farbe: "ffe8c98a", staerke: .4 }, altar: { farbe: "ffe8c98a", staerke: .6 },
  holotisch: { farbe: "ff7ff0ff", staerke: .7 }, reaktor: { farbe: "ffffc050", staerke: .9 }, bildschirmwand: { farbe: "ff7fdcff", staerke: .5 },
});
const TISCHE = new Set(["tafel", "esstisch", "rundtisch", "tisch"]);
const WAND_TAGS = new Set(["rast", "bett", "hotelbett", "krankenbett", "regal", "buecher", "lager", "spind", "tresor", "kuehlregal", "kuehlung", "vitrine", "wissen", "schreibtisch", "handwerk", "kuechenzeile", "kult", "waffe", "ruestung", "schild", "empfang", "theke", "tafel", "kasse", "server", "wache", "behaelter", "vorrat", "computer", "konsole", "maschine", "schmiede"]);
const MITTE_TAGS = new Set(["mahl", "tisch", "konferenz", "thron", "feuer", "operation", "podest", "halle"]);

/** Namen, die ein Typ bevorzugt, wenn mehrere Assets dasselbe Schlagwort tragen (Tisch und Bücherstapel heißen beide „kammer“). */
const NAMEN: Readonly<Record<string, RegExp>> = Object.freeze({
  tisch: /tisch/, rundtisch: /tisch_rund|tisch/, tafel: /tisch_lang|tafel|tisch/, esstisch: /esstisch|tisch/, stuhl: /stuhl|sitz/, sessel: /sessel|sitz/,
  fass: /fass/, kisten: /kiste/, sack: /sack|schlauch|krug|amphore/, truhe: /truhe/, bett: /^bett|bett/, doppelbett: /doppel/, bett_modern: /bett/,
  regal: /regal/, kerzen: /kerze|kandelaber/, amboss: /amboss/, werkbank: /werkbank/, altar: /altar/, sarkophag: /sarkophag/,
  waffenstaender: /waffen/, ruestung: /ruestung/, schreibpult: /schreib|buecher/, kommandokonsole: /kommando/, konsole: /konsole|terminal/,
  behaelter: /kiste|container|behaelter/, tank: /tank/, spind: /spind/, sofa: /sofa/, waschbecken: /wasch/,
});
/** Das Asset zu einem Typ: bevorzugt eines gleichen oder passenden Namens, dann eines mit den gewünschten Maßen. */
function waehleAsset(paket: AssetpaketV1, setting: KartenSetting, typ: string, masse?: readonly [number, number]): PaketAsset | null {
  const anfragen = ANFRAGEN[typ] ?? (typ.startsWith("anfrage:") ? [typ.slice(8).split("/") as unknown as readonly [string, string]] : []);
  const stamm = typ.replace(/_(modern|klein)$/, "");
  for (const [art, tag] of anfragen) {
    const k = paket.assets.filter(a => a.art === art && a.schlagworte.includes(tag) && passtZumSetting(a, setting));
    if (!k.length) continue;
    const muster = NAMEN[typ];
    const gut = (a: PaketAsset) => (a.name === typ || a.name === stamm ? 0 : a.name.startsWith(stamm) ? 1 : muster?.test(a.name) ? 2 : 3) * 2 + (masse && a.einheiten[0] === masse[0] && a.einheiten[1] === masse[1] ? 0 : 1);
    return k.slice().sort((a, b) => gut(a) - gut(b) || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))[0]!;
  }
  return null;
}

const BODEN_TAG: Readonly<Record<KartenSetting, Readonly<Record<string, string>>>> = Object.freeze({
  fantasy: { kueche: "halle", werkstatt: "halle", lager: "keller", vorrat: "keller", weinkeller: "keller", verlies: "keller", mahlwerk: "keller", stall: "keller", schiff: "gehoben", chor: "kult", krypta: "krypta", rittersaal: "gehoben", ratssaal: "gehoben", wache: "halle", waffenkammer: "halle" },
  gegenwart: { wohnen: "wohnraum", kind: "wohnraum", buero_klein: "wohnraum", flur: "wohnraum", schlafen: "teppich", hobby: "beton", technik: "beton", schiff: "stein", chor: "stein" },
  scifi: {},
});
const STANDARD_BODEN: Readonly<Record<KartenSetting, string>> = Object.freeze({ fantasy: "wohnraum", gegenwart: "fliesen", scifi: "metall" });
const kartografieBoden = (tag: string): "wood" | "stone" | "tile" =>
  /wohnraum|holz|dielen|teppich|parkett/.test(tag) ? "wood" : /keller|halle|stein|krypta|erde|sand|beton|trocken/.test(tag) ? "stone" : "tile";

/** Umriss einer Zellmenge als Polygon: die Randkanten, zu einer Schleife verkettet. */
function zellUmriss(zellen: readonly number[], W: number, z: number): [number, number][] {
  const menge = new Set(zellen), nach = new Map<string, [number, number]>();
  const kante = (ax: number, ay: number, bx: number, by: number) => { nach.set(`${ax},${ay}`, [bx, by]); };
  for (const c of zellen) {
    const x = c % W, y = (c - x) / W;
    if (!menge.has(c - W) || y === 0) kante(x, y, x + 1, y);
    if (!menge.has(c + 1) || x === W - 1) kante(x + 1, y, x + 1, y + 1);
    if (!menge.has(c + W)) kante(x + 1, y + 1, x, y + 1);
    if (!menge.has(c - 1) || x === 0) kante(x, y + 1, x, y);
  }
  // Start an der kleinsten Ecke; eine Berührung zweier Zellen über Eck bleibt eine Schleife.
  const start = [...nach.keys()].sort((a, b) => { const [ax, ay] = a.split(",").map(Number) as [number, number], [bx, by] = b.split(",").map(Number) as [number, number]; return ay - by || ax - bx; })[0]!;
  const punkte: [number, number][] = []; let k = start, schutz = 0;
  do { const [x, y] = k.split(",").map(Number) as [number, number]; punkte.push([x, y]); const n = nach.get(k)!; nach.delete(k); k = `${n[0]},${n[1]}`; } while (k !== start && nach.has(k) && ++schutz < 100000);
  // Kollineare Punkte fallen weg.
  const out: [number, number][] = [];
  for (let i = 0; i < punkte.length; i++) {
    const a = punkte[(i + punkte.length - 1) % punkte.length]!, b = punkte[i]!, c = punkte[(i + 1) % punkte.length]!;
    if ((b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]) !== 0) out.push([b[0] * z, b[1] * z]);
  }
  return out;
}

export function erzeugeHaus(auftrag: HausAuftrag, paket: AssetpaketV1): Haus {
  if (typeof auftrag?.keim !== "string" || !auftrag.keim.trim() || auftrag.keim.length > 256) fail("option", "auftrag.keim", "nichtleerer Keim mit höchstens 256 Zeichen erwartet");
  const profil = auftrag.profil;
  if (!BAUWERK_TYPEN.some(t => t === profil)) fail("option", "auftrag.profil", "bekannter Gebäudetyp erwartet");
  const setting = auftrag.setting ?? "fantasy";
  if (!KARTEN_SETTINGS.some(s => s === setting)) fail("option", "auftrag.setting", "fantasy, gegenwart oder scifi erwartet");
  const z = auftrag.zellgroesse ?? 64;
  if (!Number.isSafeInteger(z) || z < 16 || z > 512) fail("option", "auftrag.zellgroesse", "Ganzzahl in 16..512 erwartet");
  const moeblierung = auftrag.moeblierung ?? 1;
  if (typeof moeblierung !== "number" || !(moeblierung >= 0 && moeblierung <= 1)) fail("option", "auftrag.moeblierung", "Zahl in 0..1 erwartet");
  const licht = auftrag.licht ?? true;
  if (!paket?.assets?.length) fail("paket", "paket", "Assetpaket mit mindestens einem Asset erwartet");
  const [dw, dh] = BAUWERK_AUSDEHNUNG[profil];
  const umriss: Polygon = auftrag.umriss ?? [[0, 0], [dw / BAUWERK_MASSSTAB, 0], [dw / BAUWERK_MASSSTAB, dh / BAUWERK_MASSSTAB], [0, dh / BAUWERK_MASSSTAB]];
  if (!Array.isArray(umriss) || umriss.length < 3 || umriss.length > 64 || umriss.some(p => !Array.isArray(p) || p.length !== 2 || !p.every(Number.isFinite))) fail("option", "auftrag.umriss", "3 bis 64 Punkte erwartet");
  const rundeZahl = (v: number) => Math.round(v * 1000) / 1000;
  const keim = weltkeim({
    generator: HAUS_ERZEUGER, version: HAUS_VERSION, seed: auftrag.keim,
    optionen: {
      profil, setting, zellgroesse: z, moeblierung, licht,
      umriss: umriss.map(([x, y]) => [rundeZahl(x), rundeZahl(y)]), strasse: auftrag.strasse ? [rundeZahl(auftrag.strasse[0]), rundeZahl(auftrag.strasse[1])] : null,
      paket: { id: paket.id, version: paket.version, zellgroesse: paket.zellgroesse },
    } as unknown as Readonly<Record<string, CanonicalValue>>,
  });
  const nichtBedient = new Set<string>();
  // Regeln mit den echten Maßen; Raumarten ohne eigene Regeln bekommen die Stücke ihres Themas.
  const regeln = (art: string, zellen: number): MoebelRegel[] => {
    let basis: readonly MoebelRegel[] = MOEBEL_REGELN[art] ? moebelFuer(art, zellen) : [];
    if (!basis.length) {
      let stuecke: readonly (readonly [string, string])[] = [];
      try { if (ZEIT_THEMEN[art] || setting === "fantasy") stuecke = zeitThema(art, setting).stuecke; } catch { stuecke = []; }
      if (!stuecke.length) stuecke = [["moebel", "regal"], ["moebel", "tisch"], ["licht", setting === "fantasy" ? "kerze" : "kalt"]];
      const durchgaenge = Math.min(3, Math.max(1, Math.round(zellen / 14)));
      basis = Array.from({ length: durchgaenge }, () => stuecke).flat().map(([a2, tag], i) => ({ typ: `anfrage:${a2}/${tag}`, masse: [1, 1] as const, lage: (MITTE_TAGS.has(tag) ? "mitte" : a2 === "licht" ? "ecke" : "wand") as MoebelRegel["lage"], pflicht: i === 0 }));
    }
    const out: MoebelRegel[] = [];
    for (const r of basis) {
      if (r.lage === "reihe") { out.push(r); continue; }
      const asset = waehleAsset(paket, setting, r.typ, r.masse);
      if (!asset) { nichtBedient.add(r.typ); continue; }
      const lage = r.typ.startsWith("anfrage:") ? (asset.schlagworte.some(t => MITTE_TAGS.has(t)) ? "mitte" : asset.schlagworte.some(t => WAND_TAGS.has(t)) ? "wand" : r.lage) : r.lage;
      out.push({ ...r, lage, masse: [asset.einheiten[0], asset.einheiten[1]] });
    }
    return out;
  };
  const plan = planeHaus({ umriss, profil, setting, r: rauschen(keim.keimHash), moeblierung, regeln, ...(auftrag.strasse ? { strasse: auftrag.strasse } : {}) });
  const geschosse = plan.geschosse.map(g => baueGeschoss({ plan, g, paket, setting, profil, z, keim, licht, auftrag, nichtBedient }));
  // Treppen: ein Übergang je benachbartem Geschosspaar im Treppenblock. Hinauf und hinunter liegen
  // in verschiedenen Hälften des Blocks — abwechselnd oben und unten —, damit ein Geschoss mit
  // beiden Übergängen zwei getrennt anklickbare Punkte hat.
  const treppen: HausTreppe[] = [];
  if (plan.treppe) for (let i = 0; i + 1 < geschosse.length; i++) {
    const unten = geschosse[i]!, oben = geschosse[i + 1]!, T = plan.treppe;
    const obenImBlock = ((unten.stufe % 2) + 2) % 2 === 0, zeile = obenImBlock ? T.y : T.y + T.h - 1;
    const c = zeile * plan.breite + T.x, raumUnten = unten.plan.raum[c]!, raumOben = oben.plan.raum[c]!;
    const idU = unten.raumIds.get(raumUnten), idO = oben.raumIds.get(raumOben);
    if (!idU || !idO) continue;
    treppen.push({
      id: idFabrik(HAUS_ERZEUGER, HAUS_VERSION, keim.keimHash).geometrieId("treppe", String(unten.stufe), String(oben.stufe)),
      name: `Treppe ${geschossName(unten.stufe, setting)} – ${geschossName(oben.stufe, setting)}`, kind: "stairs",
      vonStufe: unten.stufe, nachStufe: oben.stufe, vonRaum: idU, nachRaum: idO, position: [(T.x + T.w / 2) * z, (zeile + .5) * z],
    });
  }
  return Object.freeze({
    art: "haus", erzeuger: HAUS_ERZEUGER, version: HAUS_VERSION,
    geschosse: Object.freeze(geschosse.map(g => Object.freeze({ stufe: g.stufe, name: geschossName(g.stufe, setting), grundriss: g.grundriss }))),
    treppen: Object.freeze(treppen), plan,
  });
}

interface GeschossBau {
  readonly plan: HausPlan; readonly g: HausGeschossPlan; readonly paket: AssetpaketV1; readonly setting: KartenSetting; readonly profil: BauwerkTyp;
  readonly z: number; readonly keim: ReturnType<typeof weltkeim>; readonly licht: boolean; readonly auftrag: HausAuftrag; readonly nichtBedient: Set<string>;
}
function baueGeschoss(b: GeschossBau): { stufe: number; grundriss: Grundriss; plan: HausGeschossPlan; raumIds: Map<number, KnotenId> } {
  const { plan, g, paket, setting, profil, z, keim } = b, W = plan.breite, H = plan.hoehe;
  const ids = idFabrik(HAUS_ERZEUGER, HAUS_VERSION, `${keim.keimHash}:${g.stufe}`);
  const r = rauschen(ids.kindKeim("geschoss"));
  const werk = bestuecker(paket, r, z, ids.geometrieId, setting);
  const xy = (i: number): [number, number] => [i % W, (i - (i % W)) / W];
  const idx = (x: number, y: number) => y * W + x;
  const raumVon = (x: number, y: number) => x < 0 || y < 0 || x >= W || y >= H ? -1 : g.raum[idx(x, y)]!;
  const raumIds = new Map<number, KnotenId>(), pfade = new Map<number, string>(), zaehler = new Map<string, number>();
  for (const q of g.raeume) { const n = (zaehler.get(q.art) ?? 0) + 1; zaehler.set(q.art, n); const pfad = `${g.stufe}/${q.art}/${n}`; pfade.set(q.index, pfad); raumIds.set(q.index, ids.knotenId("raum", pfad)); }
  const stampsJeRaum = new Map<number, string[]>(), waendeJeRaum = new Map<number, string[]>(), tuerenJeRaum = new Map<number, string[]>(), lichterJeRaum = new Map<number, string[]>(), tuerGrafik = new Map<string, string[]>();
  const nimm = (m: Map<number, string[]>, raum: number, id: string) => { if (raum >= 0) (m.get(raum) ?? m.set(raum, []).get(raum)!).push(id); };
  const claim = (raum: number, vorher: number) => { for (const s of werk.stamps.slice(vorher)) nimm(stampsJeRaum, raum, s.id); };

  // -- Türen (Portale) ----------------------------------------------------------------------------
  const tuerKanten = new Set<string>(), portale: TacticalPortal[] = [], blockiert = new Set<number>();
  const portal = (id: string, senkrecht: boolean, fest: number, lauf: number, raum: number) => {
    const a: [number, number] = senkrecht ? [fest * z, lauf * z] : [lauf * z, fest * z], e: [number, number] = senkrecht ? [fest * z, (lauf + 1) * z] : [(lauf + 1) * z, fest * z];
    tuerKanten.add(`${senkrecht ? "s" : "w"}:${fest}:${lauf}`);
    portale.push({ id, position: [(a[0] + e[0]) / 2, (a[1] + e[1]) / 2], bounds: [a, e], rotationRadians: senkrecht ? Math.PI / 2 : 0, closed: true, freestanding: false, elevation: 0 });
    nimm(tuerenJeRaum, raum, id);
  };
  for (const t of g.tueren) {
    const senkrecht = t.d === 0, fest = senkrecht ? t.x + 1 : t.y + 1, lauf = senkrecht ? t.y : t.x;
    portal(ids.geometrieId("tuer", senkrecht ? "s" : "w", `${fest}:${lauf}`), senkrecht, fest, lauf, t.nach);
    blockiert.add(idx(t.x, t.y)); blockiert.add(senkrecht ? idx(t.x + 1, t.y) : idx(t.x, t.y + 1));
  }
  const eg = g.stufe === 0, T = plan.tuer, eingangRaum = eg ? g.raum[idx(T.x, T.y)]! : -1;
  if (eg) {
    const senkrecht = T.dx !== 0, fest = senkrecht ? (T.dx > 0 ? T.x + 1 : T.x) : (T.dy > 0 ? T.y + 1 : T.y), lauf = senkrecht ? T.y : T.x;
    portal(ids.geometrieId("tuer", "aussen", `${fest}:${lauf}`), senkrecht, fest, lauf, eingangRaum);
    blockiert.add(idx(T.x, T.y));
  }
  if (plan.treppe) for (const c of plan.treppe.zellen) blockiert.add(c);

  // -- Wände: wo der Raum wechselt, außer an Türen -------------------------------------------------
  const waende: TacticalWall[] = [];
  for (const lauf of wandLaeufe({ eigner: (x, y) => raumVon(x, y), aussen: -1, breite: W, hoehe: H, zellgroesse: z, id: ids.geometrieId, offen: (s, fest, l) => tuerKanten.has(`${s ? "s" : "w"}:${fest}:${l}`) })) {
    const a = lauf.points[0]!, e = lauf.points[1]!, senk = a[0] === e[0], laenge = Math.round(Math.hypot(e[0] - a[0], e[1] - a[1]) / z);
    let start = 0, paar = "";
    const schliesse = (ende: number) => {
      if (ende <= start) return;
      const id = ids.geometrieId("raumwand", lauf.id, String(start));
      waende.push({ ...lauf, id, points: [[a[0] + (senk ? 0 : start * z), a[1] + (senk ? start * z : 0)], [a[0] + (senk ? 0 : ende * z), a[1] + (senk ? ende * z : 0)]] });
      for (const raum of paar.split("|").map(Number)) if (raum >= 0) nimm(waendeJeRaum, raum, id);
      start = ende;
    };
    for (let s = 0; s < laenge; s++) {
      const x = Math.round(a[0] / z) + (senk ? 0 : s), y = Math.round(a[1] / z) + (senk ? s : 0);
      const p = senk ? [raumVon(x - 1, y), raumVon(x, y)] : [raumVon(x, y - 1), raumVon(x, y)], key = p.sort((u, v) => u - v).join("|");
      if (key !== paar) { schliesse(s); paar = key; }
    }
    schliesse(laenge);
  }

  // -- Böden je Raum --------------------------------------------------------------------------------
  const bodenTag = new Map<number, string>();
  for (const q of g.raeume) {
    const tag = g.stufe < 0 ? (setting === "fantasy" ? "keller" : setting === "gegenwart" ? "beton" : "metall") : BODEN_TAG[setting][q.art] ?? (ZEIT_THEMEN[q.art] ? zeitThema(q.art, setting).boden : STANDARD_BODEN[setting]);
    const asset = werk.waehle("boden", tag) ?? werk.waehle("boden", STANDARD_BODEN[setting]);
    bodenTag.set(q.index, asset ? (paket.assets.find(x => x.name === asset.name)?.schlagworte.join(" ") ?? tag) : tag);
    if (!asset) continue;
    const vorher = werk.stamps.length; for (const c of q.zellen) { const [x, y] = xy(c); werk.setze(asset, x, y); } claim(q.index, vorher);
  }
  // -- Treppe: Läufe aufwärts links, abwärts rechts; im Rundbau eine Wendeltreppe ---------------------
  if (plan.treppe) {
    const Tr = plan.treppe, raum = g.raum[Tr.zellen[0]!]!, vorher = werk.stamps.length;
    const wendel = Tr.rund ? paket.assets.find(a => a.art === "aufbau" && a.schlagworte.includes("aufwaerts") && a.schlagworte.includes("abwaerts") && a.einheiten[0] === 2 && a.einheiten[1] === 2 && passtZumSetting(a, setting)) : undefined;
    if (wendel) werk.setze(wendel, Tr.x, Tr.y);
    else {
      const lauf = (tag: string) => paket.assets.filter(a => a.art === "aufbau" && a.schlagworte.includes(tag) && a.einheiten[0] === 1 && a.einheiten[1] === 2 && passtZumSetting(a, setting)).sort((p, q) => (p.name < q.name ? -1 : 1))[0];
      const hoch = lauf("aufwaerts"), runter = lauf("abwaerts");
      if (g.oben && hoch) werk.setze(hoch, Tr.x, Tr.y);
      if (g.unten && (runter ?? hoch)) werk.setze((runter ?? hoch)!, Tr.x + 1, Tr.y, runter ? 0 : Math.PI);
    }
    claim(raum, vorher);
  }
  // -- Möbel --------------------------------------------------------------------------------------
  const lichter: TacticalLight[] = [];
  const bbox = (zellen: readonly number[]) => { let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for (const c of zellen) { const [x, y] = xy(c); x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); } return [x0, y0, x1 - x0 + 1, y1 - y0 + 1] as const; };
  const nichtPlatziert: string[] = [];
  const DREHUNG = [0, Math.PI / 2, Math.PI, Math.PI * 1.5] as const;
  const belegt = new Set<number>();
  const setzeMoebel = (m: HausMoebel) => {
    const w = m.o % 2 === 0 ? m.fw : m.fh, t = m.o % 2 === 0 ? m.fh : m.fw;
    const asset = waehleAsset(paket, setting, m.typ, [w, t]);
    if (!asset) { b.nichtBedient.add(m.typ); return; }
    const vorher = werk.stamps.length, [ew, eh] = asset.einheiten;
    // Kürzere Assets als geplant (eine Bank für eine lange Reihe) werden entlang der Länge wiederholt.
    const kopien = ew < w ? Math.floor(w / ew) : 1;
    for (let k = 0; k < kopien; k++) {
      const u = (k - (kopien - 1) / 2) * ew, cx = m.x + m.fw / 2 + (m.o % 2 === 0 ? u : 0), cy = m.y + m.fh / 2 + (m.o % 2 === 0 ? 0 : u);
      werk.setze(asset, cx - ew / 2, cy - eh / 2, DREHUNG[m.o]);
    }
    claim(m.raum, vorher);
    if (!m.boden) for (let y = m.y; y < m.y + m.fh; y++) for (let x = m.x; x < m.x + m.fw; x++) belegt.add(idx(x, y));
    const L = LICHT[m.typ] ?? (asset.art === "licht" ? { farbe: asset.schlagworte.includes("kerze") ? "ffe8c98a" : "ffdd8a33", staerke: asset.schlagworte.includes("kerze") ? .55 : .9 } : undefined);
    if (b.licht && L) {
      const q = g.raeume.find(x => x.index === m.raum), [, , bw, bh] = bbox(q?.zellen ?? [idx(m.x, m.y)]);
      const id = ids.geometrieId("licht", String(m.raum), `${m.x}:${m.y}`);
      lichter.push({ id, position: [(m.x + m.fw / 2) * z, (m.y + m.fh / 2) * z], range: Math.max(bw, bh) * z * .85, intensity: L.staerke, colorArgb: L.farbe, shadows: true, elevation: 0 });
      nimm(lichterJeRaum, m.raum, id);
    }
  };
  for (const m of g.moebel.filter(x => x.boden)) setzeMoebel(m);
  for (const m of g.moebel.filter(x => !x.boden)) setzeMoebel(m);
  // Stühle an die Tische, mit dem Gesicht zum Tisch.
  const stuhl = waehleAsset(paket, setting, "stuhl", [1, 1]);
  if (stuhl && stuhl.einheiten[0] === 1 && stuhl.einheiten[1] === 1) for (const m of g.moebel) {
    if (!TISCHE.has(m.typ)) continue;
    const imRaum = (x: number, y: number) => raumVon(x, y) === m.raum;
    const seiten: [number, number, number][] = [];
    // Die Lehne zeigt vom Tisch weg: oben 0, rechts 1, unten 2, links 3.
    for (let x = m.x; x < m.x + m.fw; x++) { seiten.push([x, m.y - 1, 0], [x, m.y + m.fh, 2]); }
    for (let y = m.y; y < m.y + m.fh; y++) { seiten.push([m.x - 1, y, 3], [m.x + m.fw, y, 1]); }
    const lang = m.fw >= m.fh, zahl = m.fw * m.fh === 1 ? 2 : 4;
    let n = 0;
    for (const [x, y, o] of seiten) {
      if (n >= zahl) break;
      const langeSeite = lang ? o === 0 || o === 2 : o === 1 || o === 3; if (m.fw * m.fh > 1 && !langeSeite) continue;
      const c = idx(x, y); if (!imRaum(x, y) || belegt.has(c) || blockiert.has(c)) continue;
      const vorher = werk.stamps.length; werk.setze(stuhl, x, y, DREHUNG[o]); claim(m.raum, vorher); belegt.add(c); n++;
    }
  }
  // Deckenlicht in Gegenwart und Kolonie: nur die Lichtquelle — eine Lampe von oben sähe aus wie ein Möbel.
  if (setting !== "fantasy") for (const q of g.raeume) {
    if (q.zellen.length < 6) continue;
    const [bx, by, bw, bh] = bbox(q.zellen), mx = bx + Math.floor(bw / 2), my = by + Math.floor(bh / 2);
    const c = q.zellen.includes(idx(mx, my)) ? idx(mx, my) : q.zellen[Math.floor(q.zellen.length / 2)]!, [lx, ly] = xy(c);
    if (b.licht) { const id = ids.geometrieId("licht", "decke", String(q.index)); lichter.push({ id, position: [(lx + .5) * z, (ly + .5) * z], range: Math.max(bw, bh) * z * .9, intensity: .8, colorArgb: setting === "scifi" ? "ffc9f4ff" : "fff4ecd8", shadows: true, elevation: 0 }); nimm(lichterJeRaum, q.index, id); }
  }
  // -- Fenster, Türblätter, Eingangsmarke -------------------------------------------------------------
  const fensterAsset = paket.assets.filter(a => a.art === "aufbau" && a.schlagworte.includes("fenster") && passtZumSetting(a, setting)).sort((p, q) => (p.name < q.name ? -1 : 1))[0];
  if (fensterAsset) for (const f of g.fenster) {
    const mx = f.x + .5 + f.dx * .5, my = f.y + .5 + f.dy * .5, vorher = werk.stamps.length;
    werk.setze(fensterAsset, mx - fensterAsset.einheiten[0] / 2, my - fensterAsset.einheiten[1] / 2, f.dx !== 0 ? Math.PI / 2 : 0);
    // Fenster liegen über der Wandlinie, sonst deckt die Wand sie zu.
    const s = werk.stamps[werk.stamps.length - 1]!; werk.stamps[werk.stamps.length - 1] = { ...s, l: 26 };
    claim(f.raum, vorher);
  }
  const tuerTag = setting === "scifi" && paket.assets.some(a => a.art === "tuer" && a.schlagworte.includes("schiebbar") && passtZumSetting(a, setting)) ? "schiebbar" : "drehbar";
  const tuerAsset = werk.waehle("tuer", tuerTag);
  if (tuerAsset) for (const p of portale) {
    const [ew, eh] = tuerAsset.einheiten, vorher = werk.stamps.length;
    werk.setze(tuerAsset, p.position[0] / z - ew / 2, p.position[1] / z - eh / 2, p.rotationRadians);
    tuerGrafik.set(p.id, werk.stamps.slice(vorher).map(s => s.id));
    const besitzer = [...tuerenJeRaum].find(([, liste]) => liste.includes(p.id))?.[0]; if (besitzer !== undefined) claim(besitzer, vorher);
  }
  if (eg) { const marke = werk.waehle("marke", "eingang"); if (marke) { const vorher = werk.stamps.length; werk.setze(marke, T.x, T.y); claim(eingangRaum, vorher); } }

  // -- Räume, Knoten, Dokument ------------------------------------------------------------------------
  const tiefeVon = new Map<number, number>();
  { const start = eg ? eingangRaum : g.raum[plan.treppe?.zellen[0] ?? 0] ?? -1; const q = [start]; tiefeVon.set(start, 0);
    for (let k = 0; k < q.length; k++) { const a = q[k]!; for (const t of g.tueren) { const n = t.von === a ? t.nach : t.nach === a ? t.von : -1; if (n >= 0 && !tiefeVon.has(n)) { tiefeVon.set(n, tiefeVon.get(a)! + 1); q.push(n); } } } }
  const tiefster = [...tiefeVon.entries()].sort((p, q) => q[1] - p[1] || p[0] - q[0])[0]?.[0];
  const eingang = eg ? eingangRaum : g.raum[plan.treppe?.zellen[0] ?? 0] ?? g.raeume[0]!.index;
  const raeume: GrundrissRaum[] = g.raeume.map(q => ({
    id: raumIds.get(q.index)!, pfad: pfade.get(q.index)!, thema: q.art, zellen: bbox(q.zellen),
    tueren: (tuerenJeRaum.get(q.index) ?? []).slice().sort(), rolle: q.index === eingang ? "eingang" : q.index === tiefster ? "tiefe" : "kammer",
  }));
  const ankerZelle = new Map<number, number>();
  for (const q of g.raeume) { const mx = q.zellen.reduce((s, c) => s + xy(c)[0], 0) / q.zellen.length, my = q.zellen.reduce((s, c) => s + xy(c)[1], 0) / q.zellen.length; let best = q.zellen[0]!; for (const c of q.zellen) { const [x, y] = xy(c), [bx2, by2] = xy(best); if (Math.hypot(x - mx, y - my) < Math.hypot(bx2 - mx, by2 - my)) best = c; } ankerZelle.set(q.index, best); }
  const mitte = (raum: GrundrissRaum): readonly [number, number] => { const q = g.raeume.find(x => raumIds.get(x.index) === raum.id)!, [x, y] = xy(ankerZelle.get(q.index)!); return [(x + .5) * z, (y + .5) * z]; };
  const orte = g.raeume.map(q => ({ id: ids.geometrieId("ort", pfade.get(q.index)!), x: mitte(raeume.find(x => x.id === raumIds.get(q.index))!)[0], y: mitte(raeume.find(x => x.id === raumIds.get(q.index))!)[1] }));
  const karte = parseTacticalMapDocument({
    schemaVersion: 1, kind: "tactical-map", coordinates: "image-pixels",
    frame: { ursprung: [0, 0], einheitenProPixel: 1 / z, ordnung: "xy", hoch: "unten" },
    geometry: {
      v: 3, size: [W * z, H * z], stamps: sortiereNachId(werk.stamps),
      regions: g.raeume.map(q => ({ id: raumIds.get(q.index)!, punkte: zellUmriss(q.zellen, W, z) })),
      places: orte,
    },
    grid: { kind: "square", size: z, origin: [0, 0] },
    elevation: 0, geometryElevation: [],
    walls: sortiereNachId(waende), portals: sortiereNachId(portale), lights: sortiereNachId(lichter),
    environment: { bakedLighting: false, ambientLightArgb: g.stufe < 0 ? "ff121110" : "ff1c1a17" },
    background: null,
  });
  const wurzelId = ids.knotenId("bauwerk");
  const titel = eg ? (b.auftrag.titel ?? BAUWERK_LABEL[profil]) : `${b.auftrag.titel ?? BAUWERK_LABEL[profil]} · ${geschossName(g.stufe, setting)}`;
  const knoten: Knoten[] = baueKnoten({ erzeuger: HAUS_ERZEUGER, version: HAUS_VERSION, keim, wurzelId, wurzelArt: "bauwerk", titel, rahmen: karte.frame, eltern: eg ? b.auftrag.eltern : undefined, raeume, mitte, ids });
  const nummer = new Map<string, number>(), gleich = new Map<string, number>();
  for (const q of g.raeume) gleich.set(q.titel, (gleich.get(q.titel) ?? 0) + 1);
  for (let i = 0; i < knoten.length; i++) {
    const k = knoten[i]!;
    if (k.id === wurzelId) { knoten[i] = { ...k, titel, bauwerk: { typ: profil, beschreibung: "" } }; continue; }
    const q = g.raeume.find(x => raumIds.get(x.index) === k.id)!;
    const n = (nummer.get(q.titel) ?? 0) + 1; nummer.set(q.titel, n);
    knoten[i] = { ...k, titel: gleich.get(q.titel)! > 1 ? `${q.titel} ${n}` : q.titel };
  }
  const cartography = parseTacticalCartography({
    schemaVersion: 1, kind: "tactical-cartography", construction: { cellSize: z, origin: [0, 0] },
    regions: g.raeume.map(q => {
      const eigene = new Set(stampsJeRaum.get(q.index) ?? []), tueren = (tuerenJeRaum.get(q.index) ?? []).slice().sort();
      return {
        regionId: raumIds.get(q.index)!, role: "room", authored: false, locked: false, provenance: keim,
        interior: {
          schemaVersion: 1, floor: kartografieBoden(bodenTag.get(q.index) ?? ""), stampIds: [...eigene].sort(), wallIds: (waendeJeRaum.get(q.index) ?? []).slice().sort(),
          portalIds: tueren, lightIds: (lichterJeRaum.get(q.index) ?? []).slice().sort(), placeIds: [ids.geometrieId("ort", pfade.get(q.index)!)],
          portalArtwork: tueren.map(portalId => ({ portalId, stampIds: (tuerGrafik.get(portalId) ?? []).filter(s => eigene.has(s)) })),
        },
      };
    }),
  }, karte);
  let bodenzellen = 0; for (let i = 0; i < W * H; i++) if (g.raum[i]! >= 0) bodenzellen++;
  const grundriss: Grundriss = Object.freeze({
    art: "grundriss", erzeuger: HAUS_ERZEUGER, version: HAUS_VERSION, keim, wurzelId, karte, cartography,
    knoten: Object.freeze(knoten), raeume: Object.freeze(raeume),
    bericht: Object.freeze({
      raeume: raeume.length, gangzellen: 0, bodenzellen, tueren: portale.length, waende: waende.length, lichter: lichter.length,
      stamps: werk.stamps.length, stampsNachArt: Object.freeze({ ...werk.nachArt }),
      themen: Object.freeze(Object.fromEntries([...zaehler.entries()])),
      paket: Object.freeze({ id: paket.id, version: paket.version, assets: paket.assets.length }),
      nichtBedient: Object.freeze([...new Set([...werk.nichtBedient, ...b.nichtBedient])].sort()), nichtPlatziert: Object.freeze(nichtPlatziert),
      ausgelassen: AUSGELASSEN_BASIS,
    }),
  });
  return { stufe: g.stufe, grundriss, plan: g, raumIds };
}

export { HAUS_LIMITS };
