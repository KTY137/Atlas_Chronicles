// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { MAX_TIEFE, type AssetpaketV1, type Knoten, type KnotenId } from "@chronicle/szene";
import { fail, type GrundrissEltern, type GrundrissRaum } from "./kartenwerk.ts";
import { GRUNDRISS_STANDARD, erzeugeGrundriss, type Grundriss, type GrundrissOptionen } from "./grundriss.ts";
import { HOEHLE_STANDARD, erzeugeHoehle, type HoehleOptionen } from "./hoehle.ts";

/**
 * **Verschachtelte Karten** — and RB-21a §3.1 already ruled what that sentence may mean:
 *
 *   > *"'nested maps' means a graph of linked artifacts with containment and anchors. It does not
 *   >  mean one continuous LOD zoom, and nobody has to prove otherwise because three sources
 *   >  already have."*
 *
 * The three sources are the corpus's own Andaria map, the two generator authors saying in public
 * that their scales *"exchange information by putting it into a URL … a seed, a few flags and a
 * name"*, and Unreal streaming discrete sublevels with world-origin rebasing because float
 * precision fails before scale does. So this module builds a **chain of separate artefacts**, each
 * with its own `Rahmen`, joined by one containment edge and one anchor — and never a zoom.
 *
 * **What it refuses, and the refusal is the interesting part.** A second dungeon *level* is not a
 * child. RB-21a R6 rules that vertical position is a scalar band on the node
 * (`hoehe_von`/`hoehe_bis`/`ordinal`), and §1.3 case 3 rules the underdark a **sibling** of the
 * surface, not its descendant — with OSM's `level=-1`, IMDF's `ordinal` and Unreal's sublevels as
 * three independent precedents. `Knoten` carries no such band yet. Therefore this module nests
 * only what is genuinely *inside* something: a shrine in a cavern chamber, a vault under a hall,
 * a hut in a courtyard. Stacking floors would be a lie that costs a migration to undo.
 *
 * **The chain is re-derivable from the top seed alone.** Each level is generated from the parent
 * room's stored `Herkunft.kindKeim` — the derived child seed every tool in the corpus computes and
 * throws away (RB-21d:143-157). Nothing else is carried between levels.
 */

export const VERSCHACHTELUNG_VERSION = "1";

/** How far a child map may be finer than the room it sits in before "inside" stops being true. */
export const MAX_MASSSTABSSPRUNG = 32;

export type EbenenArt = "grundriss" | "hoehle";

export interface EbenenAuftrag {
  readonly art: EbenenArt;
  readonly titel?: string;
  readonly optionen?: Partial<GrundrissOptionen> & Partial<HoehleOptionen>;
  /**
   * Which room of the level above receives this one. `groesster` is the default because it is the
   * choice that keeps the scale jump smallest, and the scale jump is what makes "inside" true.
   */
  readonly durch?: "groesster" | "tiefe" | "eingang";
}

export interface VerschachtelungsAuftrag {
  readonly keim: string;
  /** Where the outermost artefact hangs — typically an `Ort` from the world import. */
  readonly eltern?: GrundrissEltern;
  /**
   * The parent's own containment depth, so the chain can refuse to exceed `MAX_TIEFE` instead of
   * building a graph that the projector will later refuse to walk.
   */
  readonly elternTiefe?: number;
  readonly ebenen: readonly EbenenAuftrag[];
}

/**
 * **Der Übergang** (RB-21a §3.5) — a named, addressable step between two map artefacts, never
 * disguised as a zoom. It is a row about a pair, not a field on either side, which is the same
 * shape §3.3 rules for `Anker`: *"the anchor is a row per (Karte, Ort), not a column on Ort."*
 *
 * The practical consequence is worth stating: the parent document is **byte-identical** whether or
 * not a child exists. Nothing is written back into a map that has already been generated.
 */
export interface Uebergang {
  /** The room of the level above that you step out of. */
  readonly von: KnotenId;
  /** The root node of the child artefact you step into. */
  readonly nach: KnotenId;
  /** Whose frame `bei` is expressed in: the root of the level above. */
  readonly inKarte: KnotenId;
  readonly bei: readonly [number, number];
  /**
   * Parent frame units per child frame unit. A child map 40 cells wide inside a 10-cell room has
   * `massstab` 0.25: one child cell is a quarter of a parent cell.
   */
  readonly massstab: number;
  readonly tiefe: number;
}

export interface VerschachtelungsBericht {
  readonly ebenen: number;
  readonly knoten: number;
  readonly raeume: number;
  /** `grundriss:bauwerk › raum:halle › hoehle:ort …` — the chain, readable, for a log or handoff. */
  readonly kette: readonly string[];
  readonly massstaebe: readonly number[];
  readonly ausgelassen: readonly string[];
}

export interface Verschachtelung {
  readonly version: typeof VERSCHACHTELUNG_VERSION;
  /** Outermost first. Every entry is an ordinary artefact and stands on its own. */
  readonly ebenen: readonly Grundriss[];
  readonly uebergaenge: readonly Uebergang[];
  /** Every node of every level. A fragment: merge it under a parent before validating. */
  readonly knoten: readonly Knoten[];
  readonly bericht: VerschachtelungsBericht;
}

const AUSGELASSEN: readonly string[] = Object.freeze([
  "Keine Geschwisterebenen. Eine tiefere Stockwerksebene ist per RB-21a R6 ein Geschwister mit Höhenband, kein Kind; `Knoten` trägt noch kein Band, also wird hier nichts gestapelt.",
  "Kein durchgehender Zoom. Zwei Ebenen sind zwei Artefakte mit eigenen Rahmen; der Übergang ist benannt und adressierbar, nie eine Vergrößerung (RB-21a §3.5).",
  "Keine Rückwirkung auf die Elternkarte. Der Übergang ist eine eigene Zeile, kein Feld im Elterndokument — die Elternkarte bleibt Byte für Byte dieselbe, ob sie ein Kind trägt oder nicht.",
  "Keine Wissensvergabe. Dass ein Raum ein Kind trägt, ist Geometrie; wer davon erfahren darf, entscheidet die Projektion und nicht dieser Erzeuger.",
]);

function waehleRaum(karte: Grundriss, durch: EbenenAuftrag["durch"]): GrundrissRaum {
  if (durch === "tiefe" || durch === "eingang") {
    const rolle = durch === "tiefe" ? "tiefe" : "eingang";
    const treffer = karte.raeume.filter((raum) => raum.rolle === rolle);
    if (treffer.length) return treffer[0]!;
  }
  // Largest by cell area; ties broken by path so the choice never depends on array order.
  let ziel = karte.raeume[0]!;
  for (const raum of karte.raeume) {
    const flaeche = raum.zellen[2] * raum.zellen[3], beste = ziel.zellen[2] * ziel.zellen[3];
    if (flaeche > beste || (flaeche === beste && raum.pfad < ziel.pfad)) ziel = raum;
  }
  return ziel;
}

/**
 * A level's extent in cells, read straight out of its option vector. Generating the child merely
 * to measure it would run the whole layout twice and is exactly the kind of waste that hides in a
 * loop until somebody profiles it.
 */
function kindZellen(ebene: EbenenAuftrag): readonly [number, number] {
  const standard = ebene.art === "hoehle" ? HOEHLE_STANDARD.zellen : GRUNDRISS_STANDARD.zellen;
  const gewaehlt = ebene.optionen?.zellen ?? standard;
  return [gewaehlt[0]!, gewaehlt[1]!];
}

function erzeugeEbene(ebene: EbenenAuftrag, keim: string, eltern: GrundrissEltern | undefined, paket: AssetpaketV1): Grundriss {
  const gemeinsam = {
    keim,
    ...(ebene.titel === undefined ? {} : { titel: ebene.titel }),
    ...(eltern === undefined ? {} : { eltern }),
  };
  if (ebene.art === "hoehle") {
    return erzeugeHoehle({ ...gemeinsam, ...(ebene.optionen === undefined ? {} : { optionen: ebene.optionen as Partial<HoehleOptionen> }) }, paket);
  }
  return erzeugeGrundriss({ ...gemeinsam, ...(ebene.optionen === undefined ? {} : { optionen: ebene.optionen as Partial<GrundrissOptionen> }) }, paket);
}

export function erzeugeVerschachtelt(auftrag: VerschachtelungsAuftrag, paket: AssetpaketV1): Verschachtelung {
  if (typeof auftrag?.keim !== "string" || !auftrag.keim.trim()) fail("option", "auftrag.keim", "nichtleerer Keim erwartet");
  if (!Array.isArray(auftrag.ebenen) || !auftrag.ebenen.length) fail("option", "auftrag.ebenen", "mindestens eine Ebene erwartet");
  for (const [i, ebene] of auftrag.ebenen.entries()) {
    if (ebene?.art !== "grundriss" && ebene?.art !== "hoehle") fail("option", `auftrag.ebenen[${i}].art`, "grundriss oder hoehle erwartet");
  }
  const elternTiefe = auftrag.elternTiefe ?? 0;
  if (!Number.isSafeInteger(elternTiefe) || elternTiefe < 0) fail("option", "auftrag.elternTiefe", "nichtnegative Ganzzahl erwartet");
  // Each level contributes a root and a room, so the chain costs two levels of containment depth.
  // Refusing here beats building a graph that `tiefe()` will later refuse to walk.
  const kosten = auftrag.ebenen.length * 2;
  if (elternTiefe + kosten > MAX_TIEFE) {
    fail("tiefe", "auftrag.ebenen", `${auftrag.ebenen.length} Ebenen kosten ${kosten} Containment-Stufen und überschreiten mit Elterntiefe ${elternTiefe} das Maximum ${MAX_TIEFE}`);
  }

  const ebenen: Grundriss[] = [], uebergaenge: Uebergang[] = [], knoten: Knoten[] = [];
  const kette: string[] = [], massstaebe: number[] = [];
  let keim = auftrag.keim;
  let eltern: GrundrissEltern | undefined = auftrag.eltern;
  /** The transition whose destination is not minted yet; closed as soon as the child exists. */
  let offen: Omit<Uebergang, "nach"> | null = null;

  for (const [tiefe, ebene] of auftrag.ebenen.entries()) {
    const karte = erzeugeEbene(ebene, keim, eltern, paket);
    ebenen.push(karte);
    knoten.push(...karte.knoten);
    kette.push(`${karte.art}:${karte.knoten[0]!.art}`);
    if (offen) { uebergaenge.push({ ...offen, nach: karte.wurzelId }); offen = null; }
    if (tiefe === auftrag.ebenen.length - 1) break;

    // -- descend -------------------------------------------------------------------------------
    const naechste = auftrag.ebenen[tiefe + 1]!;
    const raum = waehleRaum(karte, naechste.durch);
    // `fail` returns `never`, but TypeScript narrows through a never-returning call only when the
    // callee is declared with an explicit annotation, so the value is taken from the call instead.
    const kindKeim: string = karte.knoten.find((k) => k.id === raum.id)?.herkunft?.kindKeim
      ?? fail("geometrie", `ebene[${tiefe}].raum`, "der gewählte Raum trägt keinen Kindkeim");

    // The scale that makes "inside" true: the child map drawn so that it fits its parent room.
    const [kindBreite, kindHoehe] = kindZellen(naechste);
    const massstab = Math.min(raum.zellen[2] / kindBreite, raum.zellen[3] / kindHoehe);
    if (!Number.isFinite(massstab) || massstab <= 0) fail("geometrie", `ebene[${tiefe + 1}]`, "der Kindmaßstab ist nicht berechenbar");
    if (massstab < 1 / MAX_MASSSTABSSPRUNG) {
      fail("geometrie", `ebene[${tiefe + 1}]`,
        `eine Karte von ${kindBreite}x${kindHoehe} Zellen in einem Raum von ${raum.zellen[2]}x${raum.zellen[3]} Zellen wäre ${Math.round(1 / massstab)}-fach feiner als ihr Elternteil; jenseits von ${MAX_MASSSTABSSPRUNG}-fach sind das nicht zwei Sichten auf denselben Ort`);
    }
    massstaebe.push(massstab);

    const zellgroesse = karte.karte.grid.kind === "square" ? karte.karte.grid.size : 1 / karte.karte.frame.einheitenProPixel;
    const bei: readonly [number, number] = [
      (raum.zellen[0] + raum.zellen[2] / 2) * zellgroesse,
      (raum.zellen[1] + raum.zellen[3] / 2) * zellgroesse,
    ];
    offen = { von: raum.id, inKarte: karte.wurzelId, bei, massstab, tiefe: tiefe + 1 };
    kette.push(`raum:${raum.thema}`);
    keim = kindKeim;
    eltern = { knotenId: raum.id, art: "liegt_in_geografie", bei, massstab };
  }

  return Object.freeze({
    version: VERSCHACHTELUNG_VERSION,
    ebenen: Object.freeze(ebenen), uebergaenge: Object.freeze(uebergaenge), knoten: Object.freeze(knoten),
    bericht: Object.freeze({
      ebenen: ebenen.length, knoten: knoten.length,
      raeume: ebenen.reduce((sum, e) => sum + e.raeume.length, 0),
      kette: Object.freeze(kette), massstaebe: Object.freeze(massstaebe),
      ausgelassen: AUSGELASSEN,
    }),
  });
}
