import { type CanonicalValue, type KnotenId } from "@chronicle/core";
import {
  parseTacticalMapDocument, weltkeim,
  type AssetpaketV1, type Knoten, type TacticalLight, type TacticalMapDocumentV1, type TacticalPortal, type TacticalWall, type Weltkeim,
} from "@chronicle/szene";
import {
  AUSGELASSEN_BASIS, FELS, KARTENWERK_LIMITS, baueKnoten, bestuecker, fail, idFabrik,
  rauschen, sortiereNachId, wandLaeufe,
  type GrundrissBericht, type GrundrissEltern, type GrundrissRaum, type Rauschen,
} from "./kartenwerk.ts";

/**
 * **The first generation Chronicle performs itself**, rather than importing: rooms, corridors and
 * doors — a built place.
 *
 * `IMPLEMENTATION_PLAN.md:140` is explicit that Azgaar import is the *first* map function and that
 * an embedded generator is a later, separate step. This is that step's built-floorplan half, and it
 * is built on the finished contracts rather than beside them: it emits an ordinary
 * `TacticalMapDocumentV1` that `parseTacticalMapDocument` accepts, and ordinary `Knoten` that
 * `pruefeContainment` accepts. Nothing here is a private data path.
 *
 * Three rulings from the corpus are load-bearing and none of them is about dungeon layout:
 *
 *  1. **`seed + the complete option vector + the generator version`, or it is nothing**
 *     (RB-21d:104). Same seed with a changed canvas kept `(id, name)` for **0 of 664** generated
 *     settlements. So the seed alone never reaches the PRNG here: it goes into a `Weltkeim`
 *     together with every option *and the asset pack's id and version*, and the resulting
 *     `keimHash` is what seeds both the noise and every derived id. Change the pack, and you have
 *     honestly made a different floorplan instead of quietly making the same one differently.
 *  2. **"The gap is not the generator. It is the address"** (RB-21d:172). Watabou's dungeons are
 *     real and free and thrown into a `pointer-events: none` iframe, because there is nowhere to
 *     put them. So this generator's actual product is not the rectangles — it is that every room
 *     leaves here as a `Knoten` with an id, a typed parent edge, its own `Rahmen`, an `Anker` in
 *     its building's frame and a `kindKeim` for whatever is generated inside it next.
 *  3. **The generator emits doors, not articles** (`model.ts:160-166`). A room is a `Knoten` and a
 *     `Region`. It is never an `Entry`, never a passage, never a knowledge grant. Writing 1,000
 *     stubs is how a generator destroys the red link it was supposed to feed.
 *
 * Deliberately **not** here, and reported rather than implied: line of sight, fog, secret doors,
 * traps, encounters, treasure, elevation, a background raster, a tile pyramid, and any decision
 * about who may see what.
 */

export const GRUNDRISS_ERZEUGER = "chronicle-grundriss";
/** A bump is a migration, not an upgrade (RB-21d:240) — it changes every id this file mints. */
export const GRUNDRISS_VERSION = "1";

export const GRUNDRISS_LIMITS = Object.freeze({
  ...KARTENWERK_LIMITS, minRaumMin: 2, minRaumMax: 16, schleifenMax: 16,
});

export interface GrundrissOptionen {
  /** Grid extent in cells. The pixel extent is this times `zellgroesse`. */
  readonly zellen: readonly [number, number];
  readonly zellgroesse: number;
  /** Target room count. The partition stops early when no leaf can be split any further. */
  readonly raeume: number;
  readonly minRaum: number;
  /** Extra corridors beyond the spanning tree — a dungeon that is a tree plays like a queue. */
  readonly schleifen: number;
  /** 0 places nothing but stairs; 1 attempts every slot of a room's theme. */
  readonly moeblierung: number;
  readonly licht: boolean;
  /** Floor tag for corridors. Rooms take theirs from their theme. */
  readonly gangboden: string;
}

export const GRUNDRISS_STANDARD: GrundrissOptionen = Object.freeze({
  zellen: [40, 30] as const, zellgroesse: 64, raeume: 8, minRaum: 3, schleifen: 2,
  moeblierung: 1, licht: true, gangboden: "trocken",
});

export interface GrundrissAuftrag {
  /**
   * The seed. Typically an `Ort.kindKeim` or a parent room's `Herkunft.kindKeim` — the derived
   * child seed Azgaar computes as `seed + cellId` and then discards (RB-21d:143-157). Storing it
   * is the whole nesting mechanism.
   */
  readonly keim: string;
  readonly titel?: string;
  readonly optionen?: Partial<GrundrissOptionen>;
  readonly eltern?: GrundrissEltern;
}

export interface Grundriss {
  readonly art: "grundriss" | "hoehle";
  readonly erzeuger: string;
  readonly version: string;
  readonly keim: Weltkeim;
  /** The artefact's root node — the one that owns this map's `Rahmen`. */
  readonly wurzelId: KnotenId;
  readonly karte: TacticalMapDocumentV1;
  /** The root and one node per room. A fragment: merge it under a parent before validating. */
  readonly knoten: readonly Knoten[];
  readonly raeume: readonly GrundrissRaum[];
  readonly bericht: GrundrissBericht;
}

export { GrundrissError } from "./kartenwerk.ts";
export type { GrundrissEltern, GrundrissRaum, GrundrissBericht } from "./kartenwerk.ts";

// ---------------------------------------------------------------------------------------------
// Themes — expressed as pack *queries*, never as asset names
// ---------------------------------------------------------------------------------------------

/**
 * A theme names an `art` and a `schlagwort`, and the pack answers. Hard-coding `sarkophag` here
 * would make the generator and one specific pack a single unit, which is exactly the coupling
 * `Stamp.a` was introduced to avoid. An unanswerable query degrades into a report line.
 */
interface Thema {
  readonly schluessel: string;
  readonly boden: string;
  readonly stuecke: readonly (readonly [string, string])[];
}
const THEMEN: readonly Thema[] = Object.freeze([
  { schluessel: "halle", boden: "halle", stuecke: [["moebel", "mahl"], ["moebel", "sitz"], ["moebel", "sitz"], ["aufbau", "traeger"], ["moebel", "schild"], ["licht", "warm"]] },
  { schluessel: "kammer", boden: "wohnraum", stuecke: [["moebel", "rast"], ["gefaess", "schatz"], ["moebel", "sitz"], ["licht", "kerze"]] },
  { schluessel: "lager", boden: "keller", stuecke: [["moebel", "lager"], ["gefaess", "behaelter"], ["gefaess", "behaelter"], ["gefaess", "vorrat"], ["moebel", "schatz"]] },
  { schluessel: "krypta", boden: "krypta", stuecke: [["moebel", "grab"], ["moebel", "grab"], ["aufbau", "geroell"], ["licht", "kerze"]] },
  { schluessel: "bibliothek", boden: "wohnraum", stuecke: [["moebel", "buecher"], ["moebel", "buecher"], ["moebel", "wissen"], ["moebel", "kammer"], ["moebel", "sitz"], ["licht", "kerze"]] },
  { schluessel: "schmiede", boden: "keller", stuecke: [["moebel", "handwerk"], ["moebel", "handwerk"], ["moebel", "waffe"], ["gefaess", "behaelter"], ["licht", "warm"]] },
  { schluessel: "tempel", boden: "gehoben", stuecke: [["moebel", "kult"], ["gefaess", "kult"], ["aufbau", "thron"], ["aufbau", "traeger"], ["aufbau", "traeger"], ["licht", "warm"]] },
  { schluessel: "zisterne", boden: "flach", stuecke: [["gefaess", "vorrat"], ["aufbau", "geroell"], ["licht", "kerze"]] },
  { schluessel: "waffenkammer", boden: "keller", stuecke: [["moebel", "waffe"], ["moebel", "ruestung"], ["moebel", "schild"], ["gefaess", "behaelter"], ["licht", "wache"]] },
]);

const AUSGELASSEN: readonly string[] = Object.freeze([
  ...AUSGELASSEN_BASIS,
  "Keine Geheimtüren. Ein Stamp trägt keine eigene Sichtbarkeit; eine 'versteckte' Marke im Dokument wäre für Spieler sichtbar und damit ein Leck, kein Feature.",
]);

// ---------------------------------------------------------------------------------------------
// Partition
// ---------------------------------------------------------------------------------------------

interface Blatt { x: number; y: number; w: number; h: number; pfad: string; links: Blatt | null; rechts: Blatt | null; raum: number }

function partitioniere(breite: number, hoehe: number, optionen: GrundrissOptionen, r: Rauschen): { wurzel: Blatt; blaetter: Blatt[] } {
  const minBlatt = optionen.minRaum + 2; // one cell of rock on each side, always
  const wurzel: Blatt = { x: 0, y: 0, w: breite, h: hoehe, pfad: "", links: null, rechts: null, raum: -1 };
  const blaetter = [wurzel];
  const teilbar = (b: Blatt) => b.w >= minBlatt * 2 || b.h >= minBlatt * 2;
  while (blaetter.length < optionen.raeume) {
    // Largest first, ties broken by path: a stable order, so the partition never depends on
    // array churn. Rooms therefore stay comparable between two runs of the same option vector.
    const kandidaten = blaetter.filter(teilbar);
    if (!kandidaten.length) break;
    let ziel = kandidaten[0]!;
    for (const b of kandidaten) {
      const groesser = b.w * b.h > ziel.w * ziel.h;
      if (groesser || (b.w * b.h === ziel.w * ziel.h && b.pfad < ziel.pfad)) ziel = b;
    }
    const senkrecht = ziel.w >= minBlatt * 2 && (ziel.h < minBlatt * 2 || (ziel.w > ziel.h * 1.2 ? true : ziel.h > ziel.w * 1.2 ? false : r.chance(0.5)));
    const laenge = senkrecht ? ziel.w : ziel.h;
    const schnitt = r.ganz(minBlatt, laenge - minBlatt);
    ziel.links = senkrecht
      ? { x: ziel.x, y: ziel.y, w: schnitt, h: ziel.h, pfad: `${ziel.pfad}l`, links: null, rechts: null, raum: -1 }
      : { x: ziel.x, y: ziel.y, w: ziel.w, h: schnitt, pfad: `${ziel.pfad}l`, links: null, rechts: null, raum: -1 };
    ziel.rechts = senkrecht
      ? { x: ziel.x + schnitt, y: ziel.y, w: ziel.w - schnitt, h: ziel.h, pfad: `${ziel.pfad}r`, links: null, rechts: null, raum: -1 }
      : { x: ziel.x, y: ziel.y + schnitt, w: ziel.w, h: ziel.h - schnitt, pfad: `${ziel.pfad}r`, links: null, rechts: null, raum: -1 };
    blaetter.splice(blaetter.indexOf(ziel), 1, ziel.links, ziel.rechts);
  }
  blaetter.sort((a, b) => (a.pfad < b.pfad ? -1 : a.pfad > b.pfad ? 1 : 0));
  return { wurzel, blaetter };
}

// ---------------------------------------------------------------------------------------------
// Generation
// ---------------------------------------------------------------------------------------------

const RAUM = 1, GANG = 2;

interface RohRaum { x: number; y: number; w: number; h: number; pfad: string; thema: Thema }

export function erzeugeGrundriss(auftrag: GrundrissAuftrag, paket: AssetpaketV1): Grundriss {
  if (typeof auftrag?.keim !== "string" || !auftrag.keim.trim() || auftrag.keim.length > 256) fail("option", "auftrag.keim", "nichtleerer Keim mit höchstens 256 Zeichen erwartet");
  const optionen: GrundrissOptionen = { ...GRUNDRISS_STANDARD, ...auftrag.optionen };
  const [breite, hoehe] = optionen.zellen;
  const L = GRUNDRISS_LIMITS;
  const ganzIn = (wert: number, min: number, max: number, pfad: string): number =>
    Number.isSafeInteger(wert) && wert >= min && wert <= max ? wert : fail("option", pfad, `Ganzzahl in ${min}..${max} erwartet`);
  ganzIn(breite, L.zellenMin, L.zellenMax, "optionen.zellen[0]");
  ganzIn(hoehe, L.zellenMin, L.zellenMax, "optionen.zellen[1]");
  ganzIn(optionen.zellgroesse, L.zellgroesseMin, L.zellgroesseMax, "optionen.zellgroesse");
  ganzIn(optionen.raeume, L.raeumeMin, L.raeumeMax, "optionen.raeume");
  ganzIn(optionen.minRaum, L.minRaumMin, L.minRaumMax, "optionen.minRaum");
  ganzIn(optionen.schleifen, 0, L.schleifenMax, "optionen.schleifen");
  if (typeof optionen.moeblierung !== "number" || !(optionen.moeblierung >= 0 && optionen.moeblierung <= 1)) fail("option", "optionen.moeblierung", "Zahl in 0..1 erwartet");
  if (typeof optionen.licht !== "boolean") fail("option", "optionen.licht", "Boolean erwartet");
  if (typeof optionen.gangboden !== "string" || !optionen.gangboden.trim()) fail("option", "optionen.gangboden", "Schlagwort erwartet");
  if (breite * hoehe > L.zellenGesamt) fail("budget", "optionen.zellen", `höchstens ${L.zellenGesamt} Zellen`);
  if (breite * optionen.zellgroesse > L.kantePixelMax || hoehe * optionen.zellgroesse > L.kantePixelMax) fail("budget", "optionen.zellgroesse", `höchstens ${L.kantePixelMax} Pixel Kantenlänge`);
  if (optionen.minRaum + 2 > Math.min(breite, hoehe)) fail("option", "optionen.minRaum", "Raummindestmaß passt nicht in das Raster");
  if (!paket?.assets?.length) fail("paket", "paket", "Assetpaket mit mindestens einem Asset erwartet");

  // The seed alone is a lottery ticket (RB-21d:234). The stored unit is seed + every option +
  // the pack identity + the generator version, hashed.
  const keim = weltkeim({
    generator: GRUNDRISS_ERZEUGER,
    version: GRUNDRISS_VERSION,
    seed: auftrag.keim,
    optionen: {
      zellen: [breite, hoehe], zellgroesse: optionen.zellgroesse, raeume: optionen.raeume,
      minRaum: optionen.minRaum, schleifen: optionen.schleifen, moeblierung: optionen.moeblierung,
      licht: optionen.licht, gangboden: optionen.gangboden,
      paket: { id: paket.id, version: paket.version, zellgroesse: paket.zellgroesse },
    } as Readonly<Record<string, CanonicalValue>>,
  });
  const r = rauschen(keim.keimHash);
  const z = optionen.zellgroesse;
  const ids = idFabrik(GRUNDRISS_ERZEUGER, GRUNDRISS_VERSION, keim.keimHash);

  // -- partition and rooms ---------------------------------------------------------------------
  const { wurzel, blaetter } = partitioniere(breite, hoehe, optionen, r);
  if (blaetter.length < L.raeumeMin) fail("geometrie", "raeume", "das Raster trägt keine zwei Räume");
  const rohRaeume: RohRaum[] = [];
  for (const blatt of blaetter) {
    const freiW = blatt.w - 2, freiH = blatt.h - 2;
    if (freiW < optionen.minRaum || freiH < optionen.minRaum) continue;
    const w = r.ganz(optionen.minRaum, freiW), h = r.ganz(optionen.minRaum, freiH);
    const x = blatt.x + 1 + r.ganz(0, freiW - w), y = blatt.y + 1 + r.ganz(0, freiH - h);
    blatt.raum = rohRaeume.length;
    rohRaeume.push({ x, y, w, h, pfad: blatt.pfad || "wurzel", thema: r.waehle(THEMEN) ?? THEMEN[0]! });
  }
  if (rohRaeume.length < L.raeumeMin) fail("geometrie", "raeume", "nach dem Zuschnitt bleiben weniger als zwei Räume");

  // -- carve -----------------------------------------------------------------------------------
  const gitter = new Uint8Array(breite * hoehe);
  const raumVon = new Int16Array(breite * hoehe).fill(-1);
  const idx = (x: number, y: number) => y * breite + x;
  const drin = (x: number, y: number) => x >= 0 && y >= 0 && x < breite && y < hoehe;
  rohRaeume.forEach((raum, i) => {
    for (let y = raum.y; y < raum.y + raum.h; y++) for (let x = raum.x; x < raum.x + raum.w; x++) { gitter[idx(x, y)] = RAUM; raumVon[idx(x, y)] = i; }
  });
  const mitteZelle = (raum: RohRaum): [number, number] => [raum.x + (raum.w >> 1), raum.y + (raum.h >> 1)];
  const grabe = (x: number, y: number) => { if (drin(x, y) && gitter[idx(x, y)] === FELS) gitter[idx(x, y)] = GANG; };
  const gang = (a: readonly [number, number], b: readonly [number, number], zuerstWaagrecht: boolean) => {
    const [ax, ay] = a, [bx, by] = b;
    if (zuerstWaagrecht) {
      for (let x = Math.min(ax, bx); x <= Math.max(ax, bx); x++) grabe(x, ay);
      for (let y = Math.min(ay, by); y <= Math.max(ay, by); y++) grabe(bx, y);
    } else {
      for (let y = Math.min(ay, by); y <= Math.max(ay, by); y++) grabe(ax, y);
      for (let x = Math.min(ax, bx); x <= Math.max(ax, bx); x++) grabe(x, by);
    }
  };
  const verbinde = (blatt: Blatt): [number, number] | null => {
    if (!blatt.links || !blatt.rechts) return blatt.raum >= 0 ? mitteZelle(rohRaeume[blatt.raum]!) : null;
    const a = verbinde(blatt.links), b = verbinde(blatt.rechts);
    if (a && b) gang(a, b, r.chance(0.5));
    return a ?? b;
  };
  verbinde(wurzel);
  for (let i = 0; i < optionen.schleifen && rohRaeume.length > 2; i++) {
    const a = r.ganz(0, rohRaeume.length - 1);
    let b = r.ganz(0, rohRaeume.length - 1);
    if (b === a) b = (b + 1) % rohRaeume.length;
    gang(mitteZelle(rohRaeume[a]!), mitteZelle(rohRaeume[b]!), r.chance(0.5));
  }

  // -- connectivity: fail loudly rather than emit an unplayable map -----------------------------
  const start = mitteZelle(rohRaeume[0]!);
  const erreicht = new Uint8Array(breite * hoehe);
  const abstand = new Int32Array(breite * hoehe).fill(-1);
  const schlange: number[] = [idx(start[0], start[1])];
  erreicht[schlange[0]!] = 1; abstand[schlange[0]!] = 0;
  for (let head = 0; head < schlange.length; head++) {
    const stelle = schlange[head]!, cx = stelle % breite, cy = (stelle - (stelle % breite)) / breite;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const nx = cx + dx, ny = cy + dy;
      if (!drin(nx, ny) || gitter[idx(nx, ny)] === FELS || erreicht[idx(nx, ny)]) continue;
      erreicht[idx(nx, ny)] = 1; abstand[idx(nx, ny)] = abstand[stelle]! + 1; schlange.push(idx(nx, ny));
    }
  }
  for (const [i, raum] of rohRaeume.entries()) {
    const [mx, my] = mitteZelle(raum);
    if (!erreicht[idx(mx, my)]) fail("geometrie", `raum[${i}]`, "Raum ist vom Eingang aus nicht erreichbar");
  }
  // Stricter than "every room centre": an L-shaped corridor can leave a walled pocket that no
  // room owns, and a sealed alcove on a battlemap is a bug the GM discovers at the table.
  for (let feld = 0; feld < gitter.length; feld++) {
    if (gitter[feld] !== FELS && !erreicht[feld]) fail("geometrie", `zelle[${feld % breite}:${(feld - (feld % breite)) / breite}]`, "eingeschlossene Bodenzelle ohne Zugang");
  }

  // Entrance is the first room in partition order — stable, and independent of the map's shape.
  // The deep room is the one furthest from it along actual walkable cells, not in a straight line.
  let tiefsterRaum = 0, tiefsteEntfernung = -1;
  rohRaeume.forEach((raum, i) => {
    const [mx, my] = mitteZelle(raum), d = abstand[idx(mx, my)] ?? -1;
    if (d > tiefsteEntfernung) { tiefsteEntfernung = d; tiefsterRaum = i; }
  });

  // -- walls -----------------------------------------------------------------------------------
  const waende: TacticalWall[] = wandLaeufe((x, y) => gitter[idx(x, y)] !== FELS, breite, hoehe, z, ids.geometrieId);

  // -- portals: room/corridor openings, one per contiguous run ---------------------------------
  interface Oeffnung { raum: number; senkrecht: boolean; fest: number; lauf: number }
  const oeffnungen: Oeffnung[] = [];
  for (let y = 0; y < hoehe; y++) for (let x = 0; x < breite; x++) {
    if (gitter[idx(x, y)] !== RAUM) continue;
    const raum = raumVon[idx(x, y)]!;
    if (drin(x, y - 1) && gitter[idx(x, y - 1)] === GANG) oeffnungen.push({ raum, senkrecht: false, fest: y, lauf: x });
    if (drin(x, y + 1) && gitter[idx(x, y + 1)] === GANG) oeffnungen.push({ raum, senkrecht: false, fest: y + 1, lauf: x });
    if (drin(x - 1, y) && gitter[idx(x - 1, y)] === GANG) oeffnungen.push({ raum, senkrecht: true, fest: x, lauf: y });
    if (drin(x + 1, y) && gitter[idx(x + 1, y)] === GANG) oeffnungen.push({ raum, senkrecht: true, fest: x + 1, lauf: y });
  }
  const gruppen = new Map<string, Oeffnung[]>();
  for (const o of oeffnungen) {
    const key = `${o.raum}:${o.senkrecht ? "s" : "w"}:${o.fest}`;
    (gruppen.get(key) ?? gruppen.set(key, []).get(key)!).push(o);
  }
  const tueren: TacticalPortal[] = [];
  const tuerZelle: [number, number][] = [];
  const tuerenJeRaum = new Map<number, string[]>();
  for (const key of [...gruppen.keys()].sort()) {
    const gruppe = gruppen.get(key)!.sort((a, b) => a.lauf - b.lauf);
    let lauf: Oeffnung[] = [];
    const schliesse = () => {
      if (!lauf.length) return;
      const gewaehlt = lauf[lauf.length >> 1]!;
      const { senkrecht: s, fest, lauf: v, raum } = gewaehlt;
      const a: readonly [number, number] = s ? [fest * z, v * z] : [v * z, fest * z];
      const b: readonly [number, number] = s ? [fest * z, (v + 1) * z] : [(v + 1) * z, fest * z];
      const id = ids.geometrieId("tuer", s ? "s" : "w", `${fest}:${v}`);
      tueren.push({ id, position: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], bounds: [a, b], rotationRadians: s ? Math.PI / 2 : 0, closed: true, freestanding: false, elevation: 0 });
      (tuerenJeRaum.get(raum) ?? tuerenJeRaum.set(raum, []).get(raum)!).push(id);
      // Keep both cells beside a door clear of furniture, or the first thing the party meets is
      // a barrel in the doorway.
      if (s) { tuerZelle.push([fest - 1, v], [fest, v]); } else { tuerZelle.push([v, fest - 1], [v, fest]); }
      lauf = [];
    };
    for (const o of gruppe) {
      if (lauf.length && o.lauf !== lauf[lauf.length - 1]!.lauf + 1) schliesse();
      lauf.push(o);
    }
    schliesse();
  }

  // -- stamps ----------------------------------------------------------------------------------
  const werk = bestuecker(paket, r, z, ids.geometrieId);
  const nichtPlatziert: string[] = [];
  for (const [x, y] of tuerZelle) werk.sperre(x, y);

  const zellenVon = (raum: RohRaum): [number, number][] => {
    const liste: [number, number][] = [];
    for (let y = raum.y; y < raum.y + raum.h; y++) for (let x = raum.x; x < raum.x + raum.w; x++) liste.push([x, y]);
    return liste;
  };

  // Floors first, so that everything else draws over a complete surface.
  const gangboden = werk.waehle("boden", optionen.gangboden);
  const raumboden = rohRaeume.map((raum) => werk.waehle("boden", raum.thema.boden) ?? gangboden);
  for (let y = 0; y < hoehe; y++) for (let x = 0; x < breite; x++) {
    const feld = gitter[idx(x, y)];
    if (feld === FELS) continue;
    const asset = feld === RAUM ? raumboden[raumVon[idx(x, y)]!] ?? gangboden : gangboden;
    if (asset) werk.setze(asset, x, y);
  }

  // Stairs before furniture: an entrance that could not be placed is a broken map, a chair that
  // could not be placed is a report line.
  const setzeMarkiert = (raum: RohRaum, art: string, schlagwort: string) => {
    const asset = werk.waehle(art, schlagwort);
    if (!asset) return;
    if (!werk.platziere(asset, zellenVon(raum))) nichtPlatziert.push(`${raum.pfad}:${art}/${schlagwort}`);
  };
  setzeMarkiert(rohRaeume[0]!, "aufbau", "aufwaerts");
  setzeMarkiert(rohRaeume[0]!, "marke", "eingang");
  if (tiefsterRaum !== 0) setzeMarkiert(rohRaeume[tiefsterRaum]!, "aufbau", "abwaerts");

  const lichter: TacticalLight[] = [];
  const themen: Record<string, number> = {};
  rohRaeume.forEach((raum, i) => {
    themen[raum.thema.schluessel] = (themen[raum.thema.schluessel] ?? 0) + 1;
    // A theme is a *density*, not a shopping list: running its slots once leaves a 9x7 hall with
    // four objects in it. Passes scale with floor area and are capped, so a large room reads as
    // furnished without a big room becoming a warehouse.
    const durchgaenge = Math.min(4, Math.max(1, Math.round((raum.w * raum.h) / 14)));
    for (const [art, schlagwort] of Array.from({ length: durchgaenge }, () => raum.thema.stuecke).flat()) {
      if (!r.chance(optionen.moeblierung)) continue;
      const asset = werk.waehle(art, schlagwort);
      if (!asset) continue;
      if (!werk.platziere(asset, zellenVon(raum))) nichtPlatziert.push(`${raum.pfad}:${art}/${schlagwort}`);
      else if (optionen.licht && art === "licht") {
        const letzter = werk.stamps[werk.stamps.length - 1]!;
        lichter.push({
          id: ids.geometrieId("licht", `${i}`, `${letzter.x}:${letzter.y}`), position: [letzter.x, letzter.y],
          // Reach is the room, not the map: a torch that lights the whole floorplan is a renderer
          // demo, not a table tool.
          range: Math.max(raum.w, raum.h) * z * 0.85, intensity: schlagwort === "kerze" ? 0.55 : 0.9,
          colorArgb: schlagwort === "kerze" ? "ffe8c98a" : "ffdd8a33", shadows: true, elevation: 0,
        });
      }
    }
  });

  // Doors last, on top of their opening.
  const tuerAsset = werk.waehle("tuer", "drehbar");
  if (tuerAsset) {
    for (const tuer of tueren) {
      // A door sits on the edge between two cells, so its anchor cell is half a cell off. Routed
      // through the same `setze` as everything else: `Stamp.a` is composed in exactly one place.
      const [ew, eh] = tuerAsset.einheiten;
      werk.setze(tuerAsset, tuer.position[0] / z - ew / 2, tuer.position[1] / z - eh / 2, tuer.rotationRadians);
    }
  }

  // -- document --------------------------------------------------------------------------------
  const raeume: GrundrissRaum[] = rohRaeume.map((raum, i) => ({
    id: ids.knotenId("raum", raum.pfad),
    pfad: raum.pfad,
    thema: raum.thema.schluessel,
    zellen: [raum.x, raum.y, raum.w, raum.h] as const,
    tueren: (tuerenJeRaum.get(i) ?? []).slice().sort(),
    rolle: i === 0 ? "eingang" : i === tiefsterRaum ? "tiefe" : "kammer",
  }));
  const mitte = (raum: GrundrissRaum): readonly [number, number] =>
    [(raum.zellen[0] + raum.zellen[2] / 2) * z, (raum.zellen[1] + raum.zellen[3] / 2) * z];
  const karte = parseTacticalMapDocument({
    schemaVersion: 1, kind: "tactical-map", coordinates: "image-pixels",
    frame: { ursprung: [0, 0], einheitenProPixel: 1 / z, ordnung: "xy", hoch: "unten" },
    geometry: {
      v: 3, size: [breite * z, hoehe * z],
      stamps: sortiereNachId(werk.stamps),
      // The region id **is** the room's KnotenId, so a `MapAnchor` binding a region and a
      // containment node cannot drift apart into two identities for one room.
      regions: raeume.map((raum) => ({
        id: raum.id,
        punkte: [
          [raum.zellen[0] * z, raum.zellen[1] * z], [(raum.zellen[0] + raum.zellen[2]) * z, raum.zellen[1] * z],
          [(raum.zellen[0] + raum.zellen[2]) * z, (raum.zellen[1] + raum.zellen[3]) * z], [raum.zellen[0] * z, (raum.zellen[1] + raum.zellen[3]) * z],
        ],
      })),
      places: raeume.map((raum) => ({ id: ids.geometrieId("ort", raum.pfad), x: mitte(raum)[0], y: mitte(raum)[1] })),
    },
    grid: { kind: "square", size: z, origin: [0, 0] },
    elevation: 0, geometryElevation: [],
    walls: sortiereNachId(waende), portals: sortiereNachId(tueren), lights: sortiereNachId(lichter),
    environment: { bakedLighting: false, ambientLightArgb: "ff1c1a17" },
    background: null,
  });

  const wurzelId = ids.knotenId("bauwerk");
  const knoten = baueKnoten({
    erzeuger: GRUNDRISS_ERZEUGER, version: GRUNDRISS_VERSION, keim, wurzelId,
    // A floorplan is built, so its root asserts construction.
    wurzelArt: "bauwerk", titel: auftrag.titel ?? null, rahmen: karte.frame,
    eltern: auftrag.eltern, raeume, mitte, ids,
  });

  let bodenzellen = 0, gangzellen = 0;
  for (const feld of gitter) { if (feld !== FELS) bodenzellen++; if (feld === GANG) gangzellen++; }

  return Object.freeze({
    art: "grundriss", erzeuger: GRUNDRISS_ERZEUGER, version: GRUNDRISS_VERSION, keim, wurzelId, karte,
    knoten: Object.freeze(knoten), raeume: Object.freeze(raeume),
    bericht: Object.freeze({
      raeume: raeume.length, gangzellen, bodenzellen, tueren: tueren.length, waende: waende.length,
      lichter: lichter.length, stamps: werk.stamps.length, stampsNachArt: Object.freeze({ ...werk.nachArt }),
      themen: Object.freeze({ ...themen }),
      paket: Object.freeze({ id: paket.id, version: paket.version, assets: paket.assets.length }),
      nichtBedient: Object.freeze([...werk.nichtBedient].sort()), nichtPlatziert: Object.freeze(nichtPlatziert.slice().sort()),
      ausgelassen: AUSGELASSEN,
    }),
  });
}
