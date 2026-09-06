import { type CanonicalValue, type KnotenId } from "@chronicle/core";
import {
  parseTacticalMapDocument, weltkeim,
  type AssetpaketV1, type Herkunft, type Kante, type Knoten, type TacticalLight,
  type TacticalMapDocumentV1, type Weltkeim,
} from "@chronicle/szene";
import {
  AUSGELASSEN_BASIS, KARTENWERK_LIMITS, bestuecker, fail, idFabrik, rauschen, sortiereNachId,
  type GrundrissEltern,
} from "./kartenwerk.ts";

/**
 * **The scale between a generated world and a single building.**
 *
 * `erzeugeGrundriss` (built rooms) and `erzeugeHoehle` (natural caverns) both answer "what is
 * inside one building". Nothing in the package answered "where does that building stand, and
 * what does it take to get there from the road" — the settlement itself. This module is that
 * third peer, built on the same finished contracts rather than beside them (`kartenwerk.ts`'s own
 * doc comment: a second copy of the shared machinery is precisely the parallel stack the
 * constitution forbids): it emits an ordinary `TacticalMapDocumentV1` that `parseTacticalMapDocument`
 * accepts, and ordinary `Knoten` that `pruefeContainment` accepts.
 *
 * The same three rulings from `grundriss.ts` are load-bearing here, one scale up:
 *
 *  1. **`seed + the complete option vector + the generator version`, or it is nothing** (RB-21d:104).
 *     `Weltkeim` carries every option that can change the plan — extent, building target, street
 *     density, plot range, settlement kind and the asset pack's own id and version — hashed into
 *     `keimHash`, which alone seeds the noise and every minted id.
 *  2. **"The gap is not the generator. It is the address"** (RB-21d:172). A building here is not a
 *     rectangle for its own sake — it is a `Knoten` with an id, a typed parent edge into this
 *     settlement's `ort`, its own `Anker` in the settlement's frame, and a `kindKeim`. That
 *     `kindKeim` is what a later call to `erzeugeGrundriss` (or `erzeugeHoehle`) consumes to grow
 *     a floorplan *inside* this exact building, re-derivable from nothing but the top seed —
 *     precisely the chain `kette.test.ts` and `verschachtelung.ts` already exercise one level
 *     down. Without the stored `kindKeim` the settlement would be a picture; with it, it is an
 *     address book.
 *  3. **The generator emits doors, not articles** (`model.ts:160-166`). A building is a `Knoten`
 *     and a `Region`. It is never an `Entry`, a passage, or a knowledge grant — the same discipline
 *     `grundriss.ts` applies to rooms, one containment level higher.
 *
 * The containment ladder (`KnotenArt`) already names this level: `... > ort > bauwerk > raum > ...`.
 * A settlement roots as `ort` — a place, exactly like a found cavern is an `ort` and unlike a single
 * built keep, which roots as `bauwerk` (`hoehle.ts`'s own comment: "nobody built this place"). A
 * settlement genuinely *was* built, but it is not itself one construction; it is the place that
 * holds many. Each building inside it roots as `bauwerk` — the identical kind `erzeugeGrundriss`
 * already mints for a single building's own root, because that is what it is.
 *
 * Deliberately **not** here, and reported rather than implied: building interiors, wall geometry,
 * doors and portals, and any named building type or trade (smithy, market, tavern). All of that is
 * the job of the floorplan a building's `kindKeim` addresses, not of this layer. Drawing it here
 * would either duplicate `kartenwerk.ts`'s room machinery under a different name (the parallel
 * stack again) or hand out a made-up shop sign no downstream fact backs — an article this
 * generator has no standing to write.
 */

export const SIEDLUNG_ERZEUGER = "chronicle-siedlung";
/** A bump is a migration, not an upgrade (RB-21d:240) — it changes every id this file mints. */
export const SIEDLUNG_VERSION = "1";

export const SIEDLUNG_LIMITS = Object.freeze({
  ...KARTENWERK_LIMITS, bauwerkeMin: 1, bauwerkeMax: 256, grundstueckMin: 2, grundstueckMax: 24,
});

export type SiedlungArt = "weiler" | "dorf" | "stadt";

export interface SiedlungOptionen {
  /** Hamlet, village or town — shifts every default below, and is itself part of the option vector
   * because it also chooses the street surface (dirt track vs paved stone), not only the numbers. */
  readonly art: SiedlungArt;
  /** Grid extent in cells. The pixel extent is this times `zellgroesse`. */
  readonly ausdehnung: readonly [number, number];
  readonly zellgroesse: number;
  /** Target building count. Placement stops early when no street frontage is left to claim. */
  readonly bauwerke: number;
  /** 0 carves no lanes off the main road; 1 branches as densely as the grid supports. */
  readonly strassenDichte: number;
  /** `[min, max]` side length in cells for a plot's street frontage and its depth. */
  readonly grundstueck: readonly [number, number];
  readonly licht: boolean;
}

/** How `art` shifts the defaults. Kept private: a caller who wants a specific kind's numbers asks
 * for them by generating, not by reaching into this table. */
const SIEDLUNG_ART_STANDARD: Readonly<Record<SiedlungArt, Omit<SiedlungOptionen, "art">>> = Object.freeze({
  weiler: Object.freeze({ ausdehnung: [20, 16] as const, zellgroesse: 96, bauwerke: 4, strassenDichte: 0.1, grundstueck: [3, 5] as const, licht: false }),
  dorf: Object.freeze({ ausdehnung: [36, 28] as const, zellgroesse: 96, bauwerke: 12, strassenDichte: 0.3, grundstueck: [3, 6] as const, licht: true }),
  stadt: Object.freeze({ ausdehnung: [56, 44] as const, zellgroesse: 96, bauwerke: 30, strassenDichte: 0.55, grundstueck: [2, 5] as const, licht: true }),
});

export const SIEDLUNG_STANDARD: SiedlungOptionen = Object.freeze({ art: "dorf", ...SIEDLUNG_ART_STANDARD.dorf });

export interface SiedlungAuftrag {
  /** The seed. Typically a world-scale `Ort.kindKeim`, or a room's `Herkunft.kindKeim` one scale
   * down — the same derived-seed convention `grundriss.ts` documents on `GrundrissAuftrag.keim`. */
  readonly keim: string;
  readonly titel?: string;
  readonly optionen?: Partial<SiedlungOptionen>;
  readonly eltern?: GrundrissEltern;
}

export interface SiedlungBauwerk {
  readonly id: KnotenId;
  /** Stable generation path — street kind, its fixed axis, which side, and the frontage cursor
   * position that produced it. A grid coordinate, never an array index (invariant I8). */
  readonly pfad: string;
  /** Bounding box `[x, y, breite, hoehe]` in cells. */
  readonly zellen: readonly [number, number, number, number];
  /** The street this building fronts, by `SiedlungStrasse.id` — the fact the adjacency tests check. */
  readonly strasse: string;
}

export interface SiedlungStrasse {
  readonly id: string;
  readonly art: "hauptstrasse" | "gasse";
  /** Bounding box `[x, y, breite, hoehe]` in cells; one cell thick along its short axis. */
  readonly zellen: readonly [number, number, number, number];
}

export interface SiedlungBericht {
  readonly bauwerke: number;
  /** What the option vector asked for. Placement is capped by frontage, never padded to match. */
  readonly angefordert: number;
  readonly strassen: number;
  readonly strassenzellen: number;
  readonly hofzellen: number;
  readonly stamps: number;
  readonly stampsNachArt: Readonly<Record<string, number>>;
  readonly paket: { readonly id: string; readonly version: string; readonly assets: number };
  /** Theme slots the pack could not serve. Degradation is visible or it is a lie. */
  readonly nichtBedient: readonly string[];
  readonly ausgelassen: readonly string[];
}

export interface Siedlung {
  readonly art: "siedlung";
  readonly erzeuger: string;
  readonly version: string;
  readonly keim: Weltkeim;
  /** The artefact's root node — the settlement's own `ort`, which owns this map's `Rahmen`. */
  readonly wurzelId: KnotenId;
  readonly karte: TacticalMapDocumentV1;
  /** The root and one node per building. A fragment: merge it under a parent before validating. */
  readonly knoten: readonly Knoten[];
  readonly bauwerke: readonly SiedlungBauwerk[];
  readonly strassen: readonly SiedlungStrasse[];
  readonly bericht: SiedlungBericht;
}

export { GrundrissError } from "./kartenwerk.ts";

const AUSGELASSEN: readonly string[] = Object.freeze([
  ...AUSGELASSEN_BASIS,
  "Keine Gebäudeinnenräume und keine Wandgeometrie je Gebäude: das Innere ist die Aufgabe des " +
    "Grundrisses (oder der Höhle), den der gespeicherte `kindKeim` jedes Bauwerks adressiert — " +
    "nicht dieser Ebene. Eine zweite Kopie der Raum-Maschinerie aus `kartenwerk.ts` wäre genau der " +
    "parallele Stack, den die Konstitution verbietet.",
  "Keine Türen und keine Portale: eine Tür gehört zur Wand, die es hier noch nicht gibt. Dass ein " +
    "Gebäude die Straße berührt, ist Geometrie dieser Ebene; wo genau die Tür sitzt, entscheidet " +
    "der Grundriss, der später hineingebaut wird.",
  "Keine Gebäudetypen oder Gewerbe (Schmiede, Markt, Taverne): das wäre eine Namensvergabe ohne " +
    "Beleg. Dieser Erzeuger liefert Parzellen mit Adresse, keine Artikel (model.ts:160-166).",
]);

// ---------------------------------------------------------------------------------------------
// Grid values — LEER is unclaimed land, everything else is a committed use of it
// ---------------------------------------------------------------------------------------------

const LEER = 0, STRASSE = 1, BAUWERK = 2, HOF = 3;

interface StrassenLauf {
  readonly id: string;
  readonly art: "hauptstrasse" | "gasse";
  /** True for a lane running along y (fixed x); false for the main road (fixed y). */
  readonly senkrecht: boolean;
  readonly fest: number;
  /** Half-open `[von, bis)` span along the running axis. */
  readonly von: number;
  readonly bis: number;
}

interface RohBauwerk {
  readonly pfad: string;
  readonly zellen: readonly [number, number, number, number];
  readonly strasseId: string;
}

export function erzeugeSiedlung(auftrag: SiedlungAuftrag, paket: AssetpaketV1): Siedlung {
  if (typeof auftrag?.keim !== "string" || !auftrag.keim.trim() || auftrag.keim.length > 256) fail("option", "auftrag.keim", "nichtleerer Keim mit höchstens 256 Zeichen erwartet");
  const art: SiedlungArt = auftrag.optionen?.art ?? "dorf";
  if (art !== "weiler" && art !== "dorf" && art !== "stadt") fail("option", "optionen.art", "weiler, dorf oder stadt erwartet");
  const optionen: SiedlungOptionen = { ...SIEDLUNG_ART_STANDARD[art], ...auftrag.optionen, art };
  const [breite, hoehe] = optionen.ausdehnung;
  const L = SIEDLUNG_LIMITS;
  const ganzIn = (wert: number, min: number, max: number, pfad: string): number =>
    Number.isSafeInteger(wert) && wert >= min && wert <= max ? wert : fail("option", pfad, `Ganzzahl in ${min}..${max} erwartet`);
  ganzIn(breite, L.zellenMin, L.zellenMax, "optionen.ausdehnung[0]");
  ganzIn(hoehe, L.zellenMin, L.zellenMax, "optionen.ausdehnung[1]");
  ganzIn(optionen.zellgroesse, L.zellgroesseMin, L.zellgroesseMax, "optionen.zellgroesse");
  ganzIn(optionen.bauwerke, L.bauwerkeMin, L.bauwerkeMax, "optionen.bauwerke");
  if (typeof optionen.strassenDichte !== "number" || !(optionen.strassenDichte >= 0 && optionen.strassenDichte <= 1)) fail("option", "optionen.strassenDichte", "Zahl in 0..1 erwartet");
  const [gMin, gMax] = optionen.grundstueck;
  ganzIn(gMin, L.grundstueckMin, L.grundstueckMax, "optionen.grundstueck[0]");
  ganzIn(gMax, L.grundstueckMin, L.grundstueckMax, "optionen.grundstueck[1]");
  if (gMin > gMax) fail("option", "optionen.grundstueck", "Minimum darf das Maximum nicht überschreiten");
  if (typeof optionen.licht !== "boolean") fail("option", "optionen.licht", "Boolean erwartet");
  if (breite * hoehe > L.zellenGesamt) fail("budget", "optionen.ausdehnung", `höchstens ${L.zellenGesamt} Zellen`);
  if (breite * optionen.zellgroesse > L.kantePixelMax || hoehe * optionen.zellgroesse > L.kantePixelMax) fail("budget", "optionen.zellgroesse", `höchstens ${L.kantePixelMax} Pixel Kantenlänge`);
  if (gMin + 2 > Math.min(breite, hoehe)) fail("option", "optionen.grundstueck", "Grundstücksmindestmaß passt nicht in das Raster");
  if (!paket?.assets?.length) fail("paket", "paket", "Assetpaket mit mindestens einem Asset erwartet");

  // The seed alone is a lottery ticket (RB-21d:234). The stored unit is seed + every option +
  // the pack identity + the generator version, hashed. `art` is included explicitly rather than
  // left implicit in the numbers it defaults: it also picks the street surface below, so two
  // settlements that differ only in `art` must never share a `keimHash` even if every numeric
  // option was overridden back to equality.
  const keim = weltkeim({
    generator: SIEDLUNG_ERZEUGER, version: SIEDLUNG_VERSION, seed: auftrag.keim,
    optionen: {
      art: optionen.art, ausdehnung: [breite, hoehe], zellgroesse: optionen.zellgroesse,
      bauwerke: optionen.bauwerke, strassenDichte: optionen.strassenDichte, grundstueck: [gMin, gMax],
      licht: optionen.licht,
      paket: { id: paket.id, version: paket.version, zellgroesse: paket.zellgroesse },
    } as Readonly<Record<string, CanonicalValue>>,
  });
  const r = rauschen(keim.keimHash);
  const z = optionen.zellgroesse;
  const ids = idFabrik(SIEDLUNG_ERZEUGER, SIEDLUNG_VERSION, keim.keimHash);

  const idx = (x: number, y: number) => y * breite + x;
  const drin = (x: number, y: number) => x >= 0 && y >= 0 && x < breite && y < hoehe;
  const gitter = new Uint8Array(breite * hoehe);

  // -- streets: one main road, branching lanes ------------------------------------------------
  // A settlement is legible from one spine: the main road runs the full width, and lanes branch
  // off it rather than the grid carrying several unrelated roads that happen to cross.
  const y0 = Math.floor(hoehe / 2);
  for (let x = 0; x < breite; x++) gitter[idx(x, y0)] = STRASSE;

  interface Spur { readonly x: number; readonly yVon: number; readonly yBis: number }
  const spuren: Spur[] = [];
  const zielSpuren = Math.max(0, Math.round(optionen.strassenDichte * (breite / 4)));
  if (zielSpuren > 0) {
    const schritt = breite / (zielSpuren + 1);
    for (let i = 1; i <= zielSpuren; i++) {
      const x = Math.round(i * schritt);
      if (x < 2 || x > breite - 3) continue; // margin: a lane needs room for frontage on both sides
      const nachOben = i % 2 === 1; // alternate so lanes do not all pile onto one half of the map
      const maxLaenge = nachOben ? y0 - 1 : hoehe - 1 - y0;
      if (maxLaenge < gMin + 1) continue;
      const laenge = r.ganz(Math.min(gMin + 1, maxLaenge), maxLaenge);
      spuren.push(nachOben ? { x, yVon: y0 - laenge, yBis: y0 } : { x, yVon: y0, yBis: y0 + laenge });
    }
  }
  for (const spur of spuren) for (let y = Math.min(spur.yVon, spur.yBis); y <= Math.max(spur.yVon, spur.yBis); y++) gitter[idx(spur.x, y)] = STRASSE;

  const strassenLaeufe: StrassenLauf[] = [
    { id: ids.geometrieId("strasse", "haupt"), art: "hauptstrasse", senkrecht: false, fest: y0, von: 0, bis: breite },
    ...spuren.map((spur): StrassenLauf => ({
      id: ids.geometrieId("strasse", "gasse", `${spur.x}`), art: "gasse", senkrecht: true, fest: spur.x,
      von: Math.min(spur.yVon, spur.yBis), bis: Math.max(spur.yVon, spur.yBis) + 1,
    })),
  ];

  // -- plots and buildings: walk each street's frontage on both sides -------------------------
  // Placing a building flush against its street cell, rather than leaving a gap, is what makes
  // "every building touches a street" true by construction instead of by a later repair pass.
  const kannPlatzieren = (x: number, y: number, w: number, h: number): boolean => {
    if (x < 0 || y < 0 || x + w > breite || y + h > hoehe) return false;
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) if (gitter[idx(xx, yy)] !== LEER) return false;
    return true;
  };
  const markiere = (x: number, y: number, w: number, h: number, wert: number): void => {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) gitter[idx(xx, yy)] = wert;
  };
  // The ring of cells one step outside the footprint. Cells that are not `LEER` — the street side
  // among them — are skipped by the caller, so the yard never overwrites the street or a neighbour.
  const hofRing = (x: number, y: number, w: number, h: number): (readonly [number, number])[] => {
    const zellen: (readonly [number, number])[] = [];
    for (let yy = y - 1; yy <= y + h; yy++) for (let xx = x - 1; xx <= x + w; xx++) {
      if (xx >= x && xx < x + w && yy >= y && yy < y + h) continue;
      if (drin(xx, yy)) zellen.push([xx, yy]);
    }
    return zellen;
  };

  const rohBauwerke: RohBauwerk[] = [];
  for (const lauf of strassenLaeufe) {
    for (const seite of ["a", "b"] as const) {
      let cursor = lauf.von;
      while (cursor < lauf.bis && rohBauwerke.length < optionen.bauwerke) {
        const frontbreite = r.ganz(gMin, gMax);
        const tiefe = r.ganz(gMin, gMax);
        if (cursor + frontbreite > lauf.bis) { cursor++; continue; } // keep the whole frontage on this street
        let x: number, y: number, bw: number, bh: number;
        if (!lauf.senkrecht) {
          bw = frontbreite; bh = tiefe; x = cursor;
          y = seite === "a" ? lauf.fest - tiefe : lauf.fest + 1;
        } else {
          bw = tiefe; bh = frontbreite; y = cursor;
          x = seite === "a" ? lauf.fest - tiefe : lauf.fest + 1;
        }
        if (kannPlatzieren(x, y, bw, bh)) {
          markiere(x, y, bw, bh, BAUWERK);
          for (const [hx, hy] of hofRing(x, y, bw, bh)) if (gitter[idx(hx, hy)] === LEER) gitter[idx(hx, hy)] = HOF;
          rohBauwerke.push({ pfad: `${lauf.art}.${lauf.senkrecht ? "s" : "w"}${lauf.fest}.${seite}.${cursor}`, zellen: [x, y, bw, bh], strasseId: lauf.id });
          cursor += frontbreite + 1; // a one-cell gap, so neighbours on the same frontage never touch
        } else {
          cursor++;
        }
      }
    }
  }
  if (!rohBauwerke.length) fail("geometrie", "bauwerke", "auf diesem Raster ließ sich kein einziges Gebäude an einer Straße platzieren");

  const bauwerke: SiedlungBauwerk[] = rohBauwerke.map((b) => ({
    id: ids.knotenId("bauwerk", b.pfad), pfad: b.pfad, zellen: b.zellen, strasse: b.strasseId,
  }));
  const mitte = (b: SiedlungBauwerk): readonly [number, number] => [(b.zellen[0] + b.zellen[2] / 2) * z, (b.zellen[1] + b.zellen[3] / 2) * z];

  const strassen: SiedlungStrasse[] = strassenLaeufe.map((lauf) => ({
    id: lauf.id, art: lauf.art,
    zellen: lauf.senkrecht ? [lauf.fest, lauf.von, 1, lauf.bis - lauf.von] as const : [lauf.von, lauf.fest, lauf.bis - lauf.von, 1] as const,
  }));

  // -- stamps: street surface, yard ground, an entrance marker, optional streetlamps ----------
  // A settlement's kind is not only numbers: a village track is dirt, a town street is paved.
  // The pack answers a query; this generator never names an asset (`kartenwerk.ts`'s own rule).
  const werk = bestuecker(paket, r, z, ids.geometrieId);
  const strassenAsset = werk.waehle("boden", optionen.art === "stadt" ? "stein" : "erde");
  const hofAsset = werk.waehle("boden", "erde");
  for (let y = 0; y < hoehe; y++) for (let x = 0; x < breite; x++) {
    const feld = gitter[idx(x, y)];
    if (feld === STRASSE && strassenAsset) werk.setze(strassenAsset, x, y);
    else if (feld === HOF && hofAsset) werk.setze(hofAsset, x, y);
  }
  const eingangAsset = werk.waehle("marke", "eingang");
  if (eingangAsset) werk.setze(eingangAsset, 0, y0);

  const lichter: TacticalLight[] = [];
  if (optionen.licht) {
    for (const spur of spuren) {
      const asset = werk.waehle("licht", "warm");
      if (!asset) continue; // recorded in nichtBedient; not fatal to the map
      werk.setze(asset, spur.x, y0);
      const letzter = werk.stamps[werk.stamps.length - 1]!;
      lichter.push({
        id: ids.geometrieId("licht", `${spur.x}`), position: [letzter.x, letzter.y],
        range: z * 4, intensity: 0.8, colorArgb: "ffdd8a33", shadows: true, elevation: 0,
      });
    }
  }

  let strassenzellen = 0, hofzellen = 0;
  for (const feld of gitter) { if (feld === STRASSE) strassenzellen++; else if (feld === HOF) hofzellen++; }

  // -- document -------------------------------------------------------------------------------
  const rechteck = (zellen: readonly [number, number, number, number]): readonly (readonly [number, number])[] => {
    const [x, y, w, h] = zellen;
    return [[x * z, y * z], [(x + w) * z, y * z], [(x + w) * z, (y + h) * z], [x * z, (y + h) * z]];
  };
  const karte = parseTacticalMapDocument({
    schemaVersion: 1, kind: "tactical-map", coordinates: "image-pixels",
    frame: { ursprung: [0, 0], einheitenProPixel: 1 / z, ordnung: "xy", hoch: "unten" },
    geometry: {
      v: 3, size: [breite * z, hoehe * z],
      stamps: sortiereNachId(werk.stamps),
      // A building's region id **is** its KnotenId — the same one-identity discipline
      // `grundriss.ts` applies to rooms. A street has no accompanying `Knoten` (nothing nests
      // inside a street), so its region id is ordinary derived geometry, not a containment key.
      regions: [
        ...bauwerke.map((b) => ({ id: b.id, punkte: rechteck(b.zellen) })),
        ...strassen.map((s) => ({ id: s.id, punkte: rechteck(s.zellen) })),
      ],
      places: bauwerke.map((b) => ({ id: ids.geometrieId("platz", b.pfad), x: mitte(b)[0], y: mitte(b)[1] })),
    },
    grid: { kind: "square", size: z, origin: [0, 0] },
    elevation: 0, geometryElevation: [],
    // No wall or portal geometry at this scale — see `AUSGELASSEN`.
    walls: [], portals: [], lights: sortiereNachId(lichter),
    environment: { bakedLighting: false, ambientLightArgb: "ffd9cba0" },
    background: null,
  });

  // -- containment: the settlement's `ort`, and one `bauwerk` per building ---------------------
  const herkunft = (pfad: readonly string[], kindKeim: string): Herkunft =>
    ({ erzeuger: SIEDLUNG_ERZEUGER, version: SIEDLUNG_VERSION, keimHash: keim.keimHash, erzeugungspfad: pfad, kindKeim });
  const wurzelId = ids.knotenId("siedlung");
  const wurzelEltern: readonly Kante[] = auftrag.eltern ? [{ von: wurzelId, nach: auftrag.eltern.knotenId, art: auftrag.eltern.art }] : [];
  const knoten: Knoten[] = [{
    id: wurzelId, art: "ort", titel: auftrag.titel ?? null, eltern: wurzelEltern, rahmen: karte.frame,
    anker: auftrag.eltern ? { in: auftrag.eltern.knotenId, bei: auftrag.eltern.bei, massstab: auftrag.eltern.massstab } : null,
    herkunft: herkunft(["ort"], ids.kindKeim("ort")), sichtAnker: null,
  }];
  for (const b of bauwerke) {
    knoten.push({
      id: b.id, art: "bauwerk", titel: null,
      eltern: [{ von: b.id, nach: wurzelId, art: "liegt_in_geografie" }],
      rahmen: karte.frame,
      anker: { in: wurzelId, bei: mitte(b), massstab: 1 },
      // The derived child seed, stored rather than discarded: this building is a re-derivable
      // address for the floorplan generated inside it next (RB-21d:677-679).
      herkunft: herkunft(["bauwerk", b.pfad], ids.kindKeim("bauwerk", b.pfad)),
      sichtAnker: null,
    });
  }

  return Object.freeze({
    art: "siedlung", erzeuger: SIEDLUNG_ERZEUGER, version: SIEDLUNG_VERSION, keim, wurzelId, karte,
    knoten: Object.freeze(knoten), bauwerke: Object.freeze(bauwerke), strassen: Object.freeze(strassen),
    bericht: Object.freeze({
      bauwerke: bauwerke.length, angefordert: optionen.bauwerke, strassen: strassen.length,
      strassenzellen, hofzellen, stamps: werk.stamps.length, stampsNachArt: Object.freeze({ ...werk.nachArt }),
      paket: Object.freeze({ id: paket.id, version: paket.version, assets: paket.assets.length }),
      nichtBedient: Object.freeze([...werk.nichtBedient].sort()),
      ausgelassen: AUSGELASSEN,
    }),
  });
}
