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
import { delaunayKanten, spannbaumMitSchleifen, type Polygon, type Punkt } from "./polygon.ts";
import { loeseWfc, type WfcKachel } from "./wfc.ts";

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
export const GRUNDRISS_VERSION = "4";

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
  /**
   * Wie die Räume auf die Karte kommen.
   *
   * - `raster` — rekursive Binärteilung (BSP). Räume füllen die Blätter eines Teilungsbaums,
   *   liegen also auf einem impliziten Gitter. Richtig für Gebautes mit Plan: ein Kellergewölbe,
   *   eine Kaserne, ein Turm.
   * - `kachelwerk` — **Wave Function Collapse** legt auf einem groben Feldraster fest, welches
   *   Feld überhaupt ein Raum wird und wohin es Durchgänge öffnet. Weil ein offener Sockel nur an
   *   einen offenen passt, muss ein Nachbar jeden Durchgang erwidern; das Muster entsteht aus
   *   Propagation statt aus Ziehung. Richtig für Anlagen, die nach einem System gebaut wurden und
   *   trotzdem keinen Plan mehr erkennen lassen: Katakomben, Minen, Kerkerflügel.
   * - `streuung` — Räume werden in eine Ellipse gestreut, per Trennkraft auseinandergeschoben,
   *   dann über den **minimalen Spannbaum ihrer Delaunay-Triangulierung** verbunden, plus einige
   *   zurückgelegte Kanten. Das ist das Verfahren, das TinyKeep beschrieben hat; es liefert
   *   verschieden grosse Räume in unregelmässiger Lage und einen Kerker, der Schleifen hat statt
   *   nur eines Wegs. Richtig für Gewachsenes und Gegrabenes.
   *
   * Der Spannbaum ist der Kern: er garantiert, dass jeder Raum erreichbar ist — und garantiert
   * zugleich, dass es genau **einen** Weg dorthin gibt. Erst die zurückgelegten Kanten machen aus
   * dem Baum einen Grundriss, in dem der Spieler eine Wahl hat.
   */
  readonly anordnung: "raster" | "streuung" | "kachelwerk";
}

export const GRUNDRISS_STANDARD: GrundrissOptionen = Object.freeze({
  zellen: [40, 30] as const, zellgroesse: 64, raeume: 11, minRaum: 3, schleifen: 3,
  moeblierung: 1, licht: true, gangboden: "trocken", anordnung: "streuung",
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

// ---------------------------------------------------------------------------------------------
// Kachelwerk — der Kachelsatz, mit dem Wave Function Collapse das Verbindungsmuster legt
// ---------------------------------------------------------------------------------------------

/**
 * **Warum die Kacheln Struktur tragen und nicht Kunst.**
 *
 * `wfc.ts` löst ein Gitter über **Kantensockel**: zwei Kacheln dürfen sich berühren, wenn die
 * einander zugewandten Sockel gleich sind. Dieser Satz lebt also davon, dass die Kanten einer
 * Kachel etwas *bedeuten*.
 *
 * Die Bodenassets des Pakets bedeuten an ihren Kanten nichts — sie füllen die ganze Zelle. WFC
 * darauf anzuwenden ergibt entweder „alles dieselbe Kachel" (wenn Sockel gleich Material) oder
 * gewichtetes Rauschen (wenn alle Sockel gleich sind); in beiden Fällen entscheidet der Solver
 * nichts, was `waehle` nicht billiger entschieden hätte. Ein Solver, der nichts entscheidet, ist
 * kein Einsatz, sondern Dekoration.
 *
 * Also entscheidet er hier, wo er nicht entartet: über **Durchgängen**. Jede Kachel ist eine
 * Teilmenge der vier Himmelsrichtungen — `o` heisst „hier geht es weiter", `z` heisst „hier ist
 * Fels". Weil ein offener Sockel nur an einen offenen passt, muss ein Nachbar den Durchgang
 * *erwidern*; daraus wächst ein Muster, in dem Sackgassen, Ecken, Kreuzungen und leere Felder
 * einander bedingen. Das ist echte Propagation, keine Ziehung.
 *
 * Der Satz ist **vollständig** — alle 16 Teilmengen von {N,O,S,W}. Vollständigkeit ist kein
 * Ehrgeiz, sondern die Absicherung gegen den einen Fall, den Gumin selbst als unentscheidbar
 * benennt: ob ein Satz ein WxH-Rechteck überhaupt kachelt. Zu jedem Sockel existiert hier eine
 * Gegenkachel, also kann kein Widerspruch aus dem Satz selbst entstehen.
 *
 * **Die Gewichte sind nicht Geschmack, sondern Perkolation.** Ein Feld ist genau dann mit seinem
 * Nachbarn verbunden, wenn die gemeinsame Kante offen ist — und ob aus diesen Kanten *ein*
 * Kerker wird oder ein Dutzend Inseln, entscheidet der Anteil offener Kanten. Für das
 * Quadratgitter liegt die Perkolationsschwelle bei **50 %**: darunter zerfällt der Graph, darüber
 * wächst eine Riesenkomponente.
 *
 * Der erste Satz Gewichte lag bei 1,91 offenen Kanten je Kachel, also 48 % — knapp *unter* der
 * Schwelle. Gemessen: von zwanzig Feldern trug die grösste Insel im Mittel 9,3, und die Karte
 * lieferte 8,6 statt der angeforderten 11 Räume. Der jetzige Satz liegt bei 2,43 (61 %) und damit
 * bei einer mittleren Insel von 13,9 bei Minimum 10 — genug Reserve über dem Budget, ohne die
 * Anlage zum Schwamm zu machen, in dem jede Kachel eine Kreuzung ist.
 *
 * Die Zahlen stehen hier, weil die Grösse dieser Werte sonst wie Willkür aussieht: sie sind an
 * einer Schwelle bemessen, und wer sie verschiebt, verschiebt den Zusammenhang der Karte.
 */
const KACHELWERK_GEWICHT: readonly number[] = [0.12, 0.35, 1.8, 2.4, 1.0];
const KACHELWERK: readonly WfcKachel[] = Object.freeze(
  Array.from({ length: 16 }, (_, maske) => {
    const kanten = [0, 1, 2, 3].map((richtung) => ((maske >> richtung) & 1) === 1 ? "o" : "z") as unknown as readonly [string, string, string, string];
    const offen = kanten.filter((k) => k === "o").length;
    return Object.freeze({ id: `k${maske.toString(16)}`, gewicht: KACHELWERK_GEWICHT[offen]!, kanten });
  }),
);
/** Öffnet die Kachel nach `richtung`? Richtungen im Uhrzeigersinn ab Norden, wie in `wfc.ts`. */
const kachelOffen = (id: string | null, richtung: number): boolean =>
  id !== null && ((Number.parseInt(id.slice(1), 16) >> richtung) & 1) === 1;

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
  if (optionen.anordnung !== "raster" && optionen.anordnung !== "streuung" && optionen.anordnung !== "kachelwerk") fail("option", "optionen.anordnung", "raster, streuung oder kachelwerk erwartet");
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
      licht: optionen.licht, gangboden: optionen.gangboden, anordnung: optionen.anordnung,
      paket: { id: paket.id, version: paket.version, zellgroesse: paket.zellgroesse },
    } as Readonly<Record<string, CanonicalValue>>,
  });
  const r = rauschen(keim.keimHash);
  const z = optionen.zellgroesse;
  const ids = idFabrik(GRUNDRISS_ERZEUGER, GRUNDRISS_VERSION, keim.keimHash);

  // -- partition and rooms ---------------------------------------------------------------------
  const rohRaeume: RohRaum[] = [];
  let wurzel: Blatt | null = null;
  /** Von `kachelwerk` gelegte Verbindungen, als Indexpaare in `rohRaeume`. */
  const kachelKanten: [number, number][] = [];
  if (optionen.anordnung === "kachelwerk") {
    // **Das Raster wird am Budget bemessen, nicht am Mindestmass.** Erst stand hier
    // `minRaum + 2` als Feldgrösse; auf 40x30 ergab das ein 8x6-Raster mit 3x3 nutzbarer Fläche
    // je Feld — winzige Kammern, und von 48 Feldern trugen elf einen Raum. Sinnvoll ist der
    // umgekehrte Weg: so viele Felder, wie das Budget etwa braucht, dann sind sie so gross wie
    // die Karte hergibt.
    const zielFelder = Math.max(4, Math.round(optionen.raeume * 1.7));
    const feldMin = optionen.minRaum + 2;
    const spalten = Math.max(2, Math.min(Math.floor(breite / feldMin), Math.round(Math.sqrt((zielFelder * breite) / hoehe))));
    const reihen = Math.max(2, Math.min(Math.floor(hoehe / feldMin), Math.round(zielFelder / spalten)));
    // **Bester aus drei Läufen.** WFC sagt lokale Regeln zu und sonst nichts — wie gross die
    // grösste zusammenhängende Insel ausfällt, ist Ergebnis, nicht Zusage. Bei einer Saat kamen
    // so sechs Räume statt der elf angeforderten heraus. Drei Läufe mit abgeleiteten Saaten
    // kosten nichts Nennenswertes und nehmen den Ausreisser heraus, ohne den Solver zu belügen:
    // gewählt wird nach der Zahl belegter Felder, und die Wahl ist reproduzierbar, weil die
    // Saaten es sind.
    let loesung = loeseWfc({ keim: `${keim.keimHash}:kachelwerk:0`, breite: spalten, hoehe: reihen, kacheln: KACHELWERK });
    let belegtZahl = loesung.raster.filter((id) => id !== null && id !== "k0").length;
    for (let versuch = 1; versuch < 3; versuch++) {
      const kandidat = loeseWfc({ keim: `${keim.keimHash}:kachelwerk:${versuch}`, breite: spalten, hoehe: reihen, kacheln: KACHELWERK });
      const zahl = kandidat.raster.filter((id) => id !== null && id !== "k0").length;
      if (zahl > belegtZahl) { loesung = kandidat; belegtZahl = zahl; }
    }
    const feldBreite = Math.floor(breite / spalten), feldHoehe = Math.floor(hoehe / reihen);
    const feldIdx = (sx: number, sy: number) => sy * spalten + sx;

    // Nur Felder mit mindestens einem Durchgang werden Räume. Ein völlig geschlossenes Feld ist
    // Fels — genau dafür ist die leere Kachel da, und ohne sie wäre die Karte ein Vollraster.
    const besetzt: boolean[] = loesung.raster.map((id) => id !== null && id !== "k0");
    // Der Graph: eine Kante nur, wenn **beide** Seiten den Durchgang erwidern. Das ist die
    // Zusage des Kachelsatzes, und sie hier noch einmal zu prüfen kostet nichts.
    const graph: number[][] = Array.from({ length: spalten * reihen }, () => []);
    for (let sy = 0; sy < reihen; sy++) {
      for (let sx = 0; sx < spalten; sx++) {
        const hier = feldIdx(sx, sy);
        if (!besetzt[hier]) continue;
        for (const [richtung, dx, dy, gegen] of [[1, 1, 0, 3], [2, 0, 1, 0]] as const) {
          const nx = sx + dx, ny = sy + dy;
          if (nx >= spalten || ny >= reihen) continue;
          const dort = feldIdx(nx, ny);
          if (!besetzt[dort]) continue;
          if (!kachelOffen(loesung.raster[hier]!, richtung) || !kachelOffen(loesung.raster[dort]!, gegen)) continue;
          graph[hier]!.push(dort); graph[dort]!.push(hier);
        }
      }
    }
    // **Die grösste zusammenhängende Insel gewinnt.** WFC kennt keine globale Erreichbarkeit; es
    // erfüllt lokale Regeln und darf deshalb zwei getrennte Höhlensysteme legen. Eine Karte mit
    // zwei Hälften, zwischen denen es keinen Weg gibt, verwirft der Erreichbarkeitstest weiter
    // unten ohnehin — hier wird die kleinere Hälfte still fallen gelassen, statt die ganze
    // Erzeugung an einer Eigenschaft scheitern zu lassen, die der Solver nicht zusagt.
    let beste: number[] = [];
    const gesehen = new Set<number>();
    for (let start = 0; start < besetzt.length; start++) {
      if (!besetzt[start] || gesehen.has(start)) continue;
      const insel: number[] = [start];
      gesehen.add(start);
      for (let kopf = 0; kopf < insel.length; kopf++) {
        for (const nachbar of graph[insel[kopf]!]!) {
          if (gesehen.has(nachbar)) continue;
          gesehen.add(nachbar); insel.push(nachbar);
        }
      }
      if (insel.length > beste.length) beste = insel;
    }
    // **Auf das Budget stutzen, indem Blätter fallen — nicht, indem eine Blase wächst.**
    // Erst wuchs hier eine Breitensuche von einem Feld aus, und die Karte klumpte in eine Ecke,
    // während der Rest Fels blieb. Umgekehrt ist es richtig: die ganze Insel behalten und so
    // lange das am schwächsten verbundene Feld entfernen, wie das Budget überschritten ist —
    // aber nur, wenn der Rest zusammenhängend bleibt. So schrumpft die Anlage von den Rändern
    // her und bleibt über die Karte verteilt.
    const drin = new Set<number>(beste);
    const zusammenhaengend = (menge: Set<number>): boolean => {
      if (menge.size <= 1) return true;
      const [erster] = menge;
      const gesehen2 = new Set<number>([erster!]);
      const schlange2 = [erster!];
      for (let kopf = 0; kopf < schlange2.length; kopf++) {
        for (const nachbar of graph[schlange2[kopf]!]!) {
          if (!menge.has(nachbar) || gesehen2.has(nachbar)) continue;
          gesehen2.add(nachbar); schlange2.push(nachbar);
        }
      }
      return gesehen2.size === menge.size;
    };
    while (drin.size > optionen.raeume) {
      const nachGrad = [...drin].sort((a, b) =>
        (graph[a]!.filter((n) => drin.has(n)).length - graph[b]!.filter((n) => drin.has(n)).length) || a - b);
      let entfernt = false;
      for (const kandidat of nachGrad) {
        drin.delete(kandidat);
        if (zusammenhaengend(drin)) { entfernt = true; break; }
        drin.add(kandidat);
      }
      if (!entfernt) break; // ein reiner Ring lässt sich nicht weiter stutzen
    }
    const behalten = [...drin].sort((a, b) => a - b);
    if (behalten.length < L.raeumeMin) fail("geometrie", "raeume", "das Kachelwerk legte keine zwei verbundenen Felder");

    const raumVonFeld = new Map<number, number>();
    for (const feldNr of behalten) {
      const sx = feldNr % spalten, sy = (feldNr - (feldNr % spalten)) / spalten;
      const x0 = sx * feldBreite + 1, y0 = sy * feldHoehe + 1;
      const freiW = feldBreite - 2, freiH = feldHoehe - 2;
      if (freiW < optionen.minRaum || freiH < optionen.minRaum) continue;
      const mindestens = (frei: number) => Math.max(optionen.minRaum, Math.ceil(frei * 0.6));
      const w = r.ganz(mindestens(freiW), freiW), h = r.ganz(mindestens(freiH), freiH);
      const x = x0 + r.ganz(0, freiW - w), y = y0 + r.ganz(0, freiH - h);
      raumVonFeld.set(feldNr, rohRaeume.length);
      rohRaeume.push({ x, y, w, h, pfad: `k${sx}_${sy}`, thema: r.waehle(THEMEN) ?? THEMEN[0]! });
    }
    for (const feldNr of behalten) {
      const a = raumVonFeld.get(feldNr);
      if (a === undefined) continue;
      for (const nachbar of graph[feldNr]!) {
        const b = raumVonFeld.get(nachbar);
        if (b === undefined || b <= a) continue;
        kachelKanten.push([a, b]);
      }
    }
    if (rohRaeume.length < L.raeumeMin) fail("geometrie", "raeume", "nach dem Zuschnitt trug das Kachelwerk weniger als zwei Räume");
  } else if (optionen.anordnung === "streuung") {
    // **Streuen, auseinanderschieben, das Grösste behalten.**
    //
    // Kandidaten fallen in eine Ellipse statt in das ganze Rechteck: ein Kerker, der bis in jede
    // Ecke reicht, sieht aus wie ein Grundriss, der die Leinwand ausfüllen musste. Die Ellipse
    // gibt ihm einen Umriss. Danach schiebt eine Trennkraft überlappende Räume auseinander —
    // immer entlang der Achse mit der *kleineren* Überlappung, weil das der kürzeste Weg aus der
    // Überschneidung ist und die gestreute Anordnung am wenigsten stört.
    // **Am Raster gedeckelt.** Ohne Deckel zog die Streuung auf einem 16x14-Raster Räume bis
    // 13x13 — davon passt genau einer, und der Erzeuger scheiterte an einem völlig legalen
    // Optionsvektor. Die längere Seite darf höchstens die halbe kürzere Kartenseite messen,
    // damit zwei Räume nebeneinander immer Platz haben.
    const maxSeite = Math.max(optionen.minRaum, Math.floor(Math.min(breite, hoehe) / 2) - 1);
    const spanne = Math.max(0, Math.min(10, Math.round(optionen.minRaum * 1.6), maxSeite - optionen.minRaum));
    const kandidatenZahl = Math.max(optionen.raeume, Math.min(L.raeumeMax * 2, Math.round(optionen.raeume * 2.2)));
    const mx = breite / 2, my = hoehe / 2;
    const kandidaten: { x: number; y: number; w: number; h: number }[] = [];
    for (let i = 0; i < kandidatenZahl; i++) {
      const w = optionen.minRaum + r.ganz(0, spanne), h = optionen.minRaum + r.ganz(0, spanne);
      // Ablehnungsstichprobe in der Ellipse — aber ein Kandidat wird nie **verworfen**, nur
      // schlechter platziert. Ein verworfener Kandidat war auf engen Rastern der zweite Grund,
      // warum am Ende zu wenige Räume übrig blieben; die Trennkraft räumt ohnehin auf.
      let x = r.ganz(1, Math.max(1, breite - w - 1)), y = r.ganz(1, Math.max(1, hoehe - h - 1));
      for (let versuch = 0; versuch < 10; versuch++) {
        const nx = (x + w / 2 - mx) / (breite / 2), ny = (y + h / 2 - my) / (hoehe / 2);
        if (nx * nx + ny * ny <= 0.92) break;
        x = r.ganz(1, Math.max(1, breite - w - 1));
        y = r.ganz(1, Math.max(1, hoehe - h - 1));
      }
      kandidaten.push({ x, y, w, h });
    }
    for (let runde = 0; runde < 24; runde++) {
      let bewegt = false;
      for (let i = 0; i < kandidaten.length; i++) {
        for (let j = i + 1; j < kandidaten.length; j++) {
          const a = kandidaten[i]!, b = kandidaten[j]!;
          // Ein Zellrand Luft zwischen zwei Räumen: sonst teilen sie sich eine Wand und die
          // Türerkennung sieht eine Öffnung, wo keine ist.
          const uebX = Math.min(a.x + a.w + 1, b.x + b.w + 1) - Math.max(a.x - 1, b.x - 1);
          const uebY = Math.min(a.y + a.h + 1, b.y + b.h + 1) - Math.max(a.y - 1, b.y - 1);
          if (uebX <= 0 || uebY <= 0) continue;
          bewegt = true;
          if (uebX <= uebY) {
            const schub = Math.ceil(uebX / 2);
            if (a.x + a.w / 2 <= b.x + b.w / 2) { a.x -= schub; b.x += schub; } else { a.x += schub; b.x -= schub; }
          } else {
            const schub = Math.ceil(uebY / 2);
            if (a.y + a.h / 2 <= b.y + b.h / 2) { a.y -= schub; b.y += schub; } else { a.y += schub; b.y -= schub; }
          }
          a.x = Math.max(1, Math.min(breite - a.w - 1, a.x)); a.y = Math.max(1, Math.min(hoehe - a.h - 1, a.y));
          b.x = Math.max(1, Math.min(breite - b.w - 1, b.x)); b.y = Math.max(1, Math.min(hoehe - b.h - 1, b.y));
        }
      }
      if (!bewegt) break;
    }
    // Wer nach der Trennung noch überlappt, fällt raus — die Karte darf keine zwei Räume in
    // derselben Zelle behaupten, und ein Reparaturlauf wäre hier teurer als ein Verzicht.
    // Nach Fläche absteigend packen, **bevor** überlappende verworfen werden: in
    // Erzeugungsreihenfolge blockierte ein zufällig früher Splitter den Platz eines grossen
    // Raums, und die Karte verlor genau die Räume, die sie tragen sollten.
    const nachGroesse = [...kandidaten].sort((a, b) => (b.w * b.h) - (a.w * a.h) || a.y - b.y || a.x - b.x);
    const frei: typeof kandidaten = [];
    for (const k of nachGroesse) {
      if (k.x < 1 || k.y < 1 || k.x + k.w > breite - 1 || k.y + k.h > hoehe - 1) continue;
      if (frei.some((f) => k.x - 1 < f.x + f.w + 1 && f.x - 1 < k.x + k.w + 1 && k.y - 1 < f.y + f.h + 1 && f.y - 1 < k.y + k.h + 1)) continue;
      frei.push(k);
    }
    for (const k of frei.slice(0, optionen.raeume)) {
      rohRaeume.push({ x: k.x, y: k.y, w: k.w, h: k.h, pfad: `s${k.x}_${k.y}`, thema: r.waehle(THEMEN) ?? THEMEN[0]! });
    }
    rohRaeume.sort((a, b) => a.y - b.y || a.x - b.x);
    if (rohRaeume.length < L.raeumeMin) fail("geometrie", "raeume", "die Streuung trug auf diesem Raster keine zwei überschneidungsfreien Räume");
  } else {
  const teilung = partitioniere(breite, hoehe, optionen, r);
  wurzel = teilung.wurzel;
  const blaetter = teilung.blaetter;
  if (blaetter.length < L.raeumeMin) fail("geometrie", "raeume", "das Raster trägt keine zwei Räume");
  for (const blatt of blaetter) {
    const freiW = blatt.w - 2, freiH = blatt.h - 2;
    if (freiW < optionen.minRaum || freiH < optionen.minRaum) continue;
    // **Gross gezogen, nicht gleichverteilt.** Bis Fassung 1 lief die Ziehung über die ganze
    // Spanne `[minRaum, freiW]`, ein Raum schöpfte sein Blatt also im Mittel zur Hälfte aus — bei
    // 40x30 Zellen und acht Räumen waren rund elf Prozent der Karte begehbar und der Rest Fels.
    // Gerendert las das als Kisten an Drähten, nicht als Gewölbe. Die Untergrenze liegt jetzt bei
    // 60 % des Blattes, die Streuung bleibt: Räume dürfen verschieden gross sein, aber keiner
    // darf mehr in seiner Ecke verschwinden.
    const mindestens = (frei: number) => Math.max(optionen.minRaum, Math.ceil(frei * 0.6));
    const w = r.ganz(mindestens(freiW), freiW), h = r.ganz(mindestens(freiH), freiH);
    const x = blatt.x + 1 + r.ganz(0, freiW - w), y = blatt.y + 1 + r.ganz(0, freiH - h);
    blatt.raum = rohRaeume.length;
    rohRaeume.push({ x, y, w, h, pfad: blatt.pfad || "wurzel", thema: r.waehle(THEMEN) ?? THEMEN[0]! });
  }
  if (rohRaeume.length < L.raeumeMin) fail("geometrie", "raeume", "nach dem Zuschnitt bleiben weniger als zwei Räume");
  }

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
  /**
   * Ein Gangstück, wahlweise als Halle zwei Zellen breit.
   *
   * Die Verbreiterung geht immer zur **gleichen** Seite (+1 in der Querachse) statt symmetrisch:
   * so bleibt die gegrabene Achse selbst unverändert, und die Anschlussstelle an einem Raum
   * verschiebt sich nicht. Eine symmetrische Verbreiterung hätte die Türerkennung verschoben,
   * die auf zusammenhängenden Öffnungsläufen an der Raumkante beruht.
   */
  const grabeQuer = (x: number, y: number, waagrecht: boolean, breit: boolean) => {
    grabe(x, y);
    if (breit) grabe(waagrecht ? x : x + 1, waagrecht ? y + 1 : y);
  };
  const gang = (a: readonly [number, number], b: readonly [number, number], zuerstWaagrecht: boolean, breit = false) => {
    const [ax, ay] = a, [bx, by] = b;
    if (zuerstWaagrecht) {
      for (let x = Math.min(ax, bx); x <= Math.max(ax, bx); x++) grabeQuer(x, ay, true, breit);
      for (let y = Math.min(ay, by); y <= Math.max(ay, by); y++) grabeQuer(bx, y, false, breit);
    } else {
      for (let y = Math.min(ay, by); y <= Math.max(ay, by); y++) grabeQuer(ax, y, false, breit);
      for (let x = Math.min(ax, bx); x <= Math.max(ax, bx); x++) grabeQuer(x, by, true, breit);
    }
  };
  const verbinde = (blatt: Blatt): [number, number] | null => {
    if (!blatt.links || !blatt.rechts) return blatt.raum >= 0 ? mitteZelle(rohRaeume[blatt.raum]!) : null;
    const a = verbinde(blatt.links), b = verbinde(blatt.rechts);
    if (a && b) gang(a, b, r.chance(0.5), r.chance(0.28));
    return a ?? b;
  };
  if (optionen.anordnung === "kachelwerk") {
    // Die Verbindungen stehen schon fest — sie sind das, was WFC entschieden hat. Hier wird nur
    // noch gegraben. Keine Schleifen nachträglich: ein Muster, in dem beide Seiten den Durchgang
    // erwidern mussten, trägt seine Kreuzungen bereits.
    for (const [a, b] of kachelKanten) {
      gang(mitteZelle(rohRaeume[a]!), mitteZelle(rohRaeume[b]!), r.chance(0.5), r.chance(0.28));
    }
  } else if (optionen.anordnung === "streuung") {
    // Delaunay über die Raummitten, minimaler Spannbaum darüber, dann `schleifen` Kanten zurück.
    // Der Spannbaum verbindet alles und nichts doppelt; die Rückgaben sind die Abkürzungen.
    const mitten: Punkt[] = rohRaeume.map((raum) => {
      const [cx, cy] = mitteZelle(raum);
      return [cx + 0.5, cy + 0.5];
    });
    const rahmen: Polygon = [[0, 0], [breite, 0], [breite, hoehe], [0, hoehe]];
    const kanten = mitten.length >= 2
      ? delaunayKanten(mitten, rahmen)
      : [];
    const gewaehlt = kanten.length
      ? spannbaumMitSchleifen(kanten, (k) => {
        const a = mitten[k.a]!, b = mitten[k.b]!;
        return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;
      }, mitten.length, optionen.schleifen)
      : [];
    for (const kante of gewaehlt) {
      gang(mitteZelle(rohRaeume[kante.a]!), mitteZelle(rohRaeume[kante.b]!), r.chance(0.5), r.chance(0.28));
    }
    // Sicherheitsnetz: entartete Punktlagen können eine Zelle ohne geteilte Kante hinterlassen.
    // Dann bleibt ein Raum ohne Delaunay-Nachbarn, und der Erreichbarkeitstest weiter unten
    // würde die ganze Karte verwerfen. Ein Strang zum nächstgelegenen Raum ist billiger.
    const verbunden = new Set<number>();
    for (const kante of gewaehlt) { verbunden.add(kante.a); verbunden.add(kante.b); }
    for (let i = 0; i < rohRaeume.length; i++) {
      if (verbunden.has(i) || rohRaeume.length < 2) continue;
      let naechster = i === 0 ? 1 : 0;
      for (let j = 0; j < rohRaeume.length; j++) {
        if (j === i) continue;
        const d = (mitten[j]![0] - mitten[i]![0]) ** 2 + (mitten[j]![1] - mitten[i]![1]) ** 2;
        const best = (mitten[naechster]![0] - mitten[i]![0]) ** 2 + (mitten[naechster]![1] - mitten[i]![1]) ** 2;
        if (d < best) naechster = j;
      }
      gang(mitteZelle(rohRaeume[i]!), mitteZelle(rohRaeume[naechster]!), r.chance(0.5));
    }
  } else {
    if (wurzel) verbinde(wurzel);
    for (let i = 0; i < optionen.schleifen && rohRaeume.length > 2; i++) {
      const a = r.ganz(0, rohRaeume.length - 1);
      let b = r.ganz(0, rohRaeume.length - 1);
      if (b === a) b = (b + 1) % rohRaeume.length;
      gang(mitteZelle(rohRaeume[a]!), mitteZelle(rohRaeume[b]!), r.chance(0.5));
    }
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
