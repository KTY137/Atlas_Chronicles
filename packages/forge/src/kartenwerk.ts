// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { canonicalHash, deriveKnotenId, type KnotenId } from "@chronicle/core";
import { KARTEN_SETTINGS, assetVerweis, type KartenSetting, type AssetpaketV1, type Herkunft, type Kante, type KantenArt, type Knoten, type KnotenArt, type PaketAsset, type Rahmen, type Stamp, type TacticalWall, type Weltkeim } from "@chronicle/szene";

/**
 * The machinery the map generators share, in one place.
 *
 * `erzeugeGrundriss` (built rooms and corridors) and `erzeugeHoehle` (natural caverns) differ in
 * exactly one thing: how cells become floor. Everything after that — tracing walls out of the
 * floor/rock boundary, asking the pack for furniture, minting ids, hanging rooms under a root node
 * with anchors and child seeds — is identical, and a second copy of it is precisely the parallel
 * stack the constitution forbids. So it lives here once and the layouts stay thin.
 *
 * This module is internal scaffolding and is deliberately not re-exported from the package.
 */

export const KARTENWERK_LIMITS = Object.freeze({
  zellenMin: 12, zellenMax: 192, zellenGesamt: 20_000,
  zellgroesseMin: 16, zellgroesseMax: 512, kantePixelMax: 32_768,
  raeumeMin: 2, raeumeMax: 64, versucheProStueck: 32,
});

/** Rock. Every other grid value is walkable; each layout gives its own values meaning. */
export const FELS = 0;

/** Draw order. A floor under a chest, a marker over everything. */
export const EBENE: Readonly<Record<string, number>> = Object.freeze({
  boden: -100, aufbau: -10, moebel: 0, gefaess: 0, figur: 5, licht: 10, tuer: 20, wand: 25, marke: 30,
});

/**
 * What no generator in this package does. Named on every run rather than left to be discovered:
 * a report that only counts what was produced is an advertisement, not a report.
 */
export const AUSGELASSEN_BASIS: readonly string[] = Object.freeze([
  "Sichtlinien und Nebel werden nicht berechnet; geliefert wird Wandgeometrie, aus der ein Renderer sie ableiten kann.",
  "Kein Hintergrundbild und keine Kachelpyramide: `background` ist null, die Karte ist reine Geometrie und Stamps.",
  "Keine Höhen: alle Elevationen sind 0 und `geometryElevation` ist leer. Ein Höhenband am Knoten (`hoehe_von`/`hoehe_bis`/`ordinal`, RB-21a R6) existiert im Datenmodell noch nicht, deshalb erzeugt dieses Paket auch keine Geschwisterebenen.",
  "Keine Fallen, Gegner, Schätze oder Begegnungen.",
  "Keine Artikel, Passagen oder Wissensvergaben. Ein Raum ist ein Knoten und eine Region, nie ein Eintrag.",
  "Keine Wandstärke: eine Wand ist eine Linie zwischen Boden und Fels, kein Volumen.",
]);

export class GrundrissError extends Error {
  override readonly name = "GrundrissError";
  constructor(readonly code: "option" | "budget" | "paket" | "geometrie" | "tiefe", readonly path: string, message: string) {
    super(`${path}: ${message}`);
  }
}
export const fail = (code: GrundrissError["code"], path: string, message: string): never => { throw new GrundrissError(code, path, message); };

// ---------------------------------------------------------------------------------------------
// Deterministic noise
// ---------------------------------------------------------------------------------------------

const rotl = (x: number, k: number): number => ((x << k) | (x >>> (32 - k))) >>> 0;

/**
 * xoshiro128** seeded from four words of the `keimHash`. Implemented here rather than pulled in:
 * a PRNG is four lines of integer arithmetic, and a dependency whose version bump silently
 * reshuffles every stored floorplan is the opposite of a saving.
 */
export function rauschen(keimHash: string) {
  let s0 = Number.parseInt(keimHash.slice(0, 8), 16) >>> 0;
  let s1 = Number.parseInt(keimHash.slice(8, 16), 16) >>> 0;
  let s2 = Number.parseInt(keimHash.slice(16, 24), 16) >>> 0;
  let s3 = Number.parseInt(keimHash.slice(24, 32), 16) >>> 0;
  if ((s0 | s1 | s2 | s3) === 0) s0 = 1; // the all-zero state is xoshiro's single fixed point
  const next = (): number => {
    const result = (Math.imul(rotl(Math.imul(s1, 5) >>> 0, 7), 9) >>> 0) / 4294967296;
    const t = (s1 << 9) >>> 0;
    s2 = (s2 ^ s0) >>> 0; s3 = (s3 ^ s1) >>> 0; s1 = (s1 ^ s2) >>> 0; s0 = (s0 ^ s3) >>> 0;
    s2 = (s2 ^ t) >>> 0; s3 = rotl(s3, 11);
    return result;
  };
  return {
    ganz: (min: number, max: number): number => (max <= min ? min : min + Math.floor(next() * (max - min + 1))),
    /**
     * Gleitkomma in [min, max), auf Tausendstel quantisiert.
     *
     * Die Quantisierung ist kein Schoenheitsfehler, sondern der Grund, warum das Ergebnis
     * ueberhaupt reproduzierbar bleibt: die Zahl geht in Polygongeometrie ein, die kanonisch
     * serialisiert und gehasht wird. Ganzzahlige Tausendstel ueberstehen jeden Float-Drucker.
     */
    zahl: (min: number, max: number): number => Math.round((min + next() * (max - min)) * 1000) / 1000,
    chance: (p: number): boolean => next() < p,
    waehle: <T,>(list: readonly T[]): T | null => (list.length ? list[Math.floor(next() * list.length)]! : null),
  };
}
export type Rauschen = ReturnType<typeof rauschen>;

// ---------------------------------------------------------------------------------------------
// Shared result shape
// ---------------------------------------------------------------------------------------------

export interface GrundrissEltern {
  readonly knotenId: KnotenId;
  readonly art: KantenArt;
  /** Where this artefact sits in the parent's frame — the anchor, not a zoom level. */
  readonly bei: readonly [number, number];
  readonly massstab: number;
}

export interface GrundrissRaum {
  readonly id: KnotenId;
  /** Stable generation path, e.g. `l.r.l` or `kammer.3`. Never an array index (invariant I8). */
  readonly pfad: string;
  readonly thema: string;
  /** Bounding box `[x, y, breite, hoehe]` in cells. For a cavern, a box around a blob. */
  readonly zellen: readonly [number, number, number, number];
  readonly tueren: readonly string[];
  readonly rolle: "eingang" | "tiefe" | "kammer";
}

export interface GrundrissBericht {
  readonly raeume: number;
  readonly gangzellen: number;
  readonly bodenzellen: number;
  readonly tueren: number;
  readonly waende: number;
  readonly lichter: number;
  readonly stamps: number;
  readonly stampsNachArt: Readonly<Record<string, number>>;
  readonly themen: Readonly<Record<string, number>>;
  readonly paket: { readonly id: string; readonly version: string; readonly assets: number };
  /** Theme slots the pack could not serve. Degradation is visible or it is a lie. */
  readonly nichtBedient: readonly string[];
  /** Slots the pack could serve but the room had no room for. */
  readonly nichtPlatziert: readonly string[];
  readonly ausgelassen: readonly string[];
}

// ---------------------------------------------------------------------------------------------
// Ids
// ---------------------------------------------------------------------------------------------

export interface IdFabrik {
  knotenId(...pfad: string[]): KnotenId;
  geometrieId(...pfad: string[]): string;
  kindKeim(...pfad: string[]): string;
}

/** All ids derive from the `keimHash`, never from an array index (invariant I8). */
export function idFabrik(erzeuger: string, version: string, keimHash: string): IdFabrik {
  return {
    knotenId: (...pfad) => deriveKnotenId({ erzeuger, version, keim: keimHash, kind: "knoten", pfad }),
    geometrieId: (...pfad) => canonicalHash({ keim: keimHash, pfad }).slice(0, 32),
    kindKeim: (...pfad) => canonicalHash({ keim: keimHash, kind: "kind", pfad }).slice(0, 32),
  };
}

// ---------------------------------------------------------------------------------------------
// Walls — the boundary between floor and rock, merged into maximal runs
// ---------------------------------------------------------------------------------------------

/** Merge unit edges keyed `fest:lauf` into `[fest, laufStart, laufEnde]` runs. */
function laeufe(kanten: ReadonlySet<string>): [number, number, number][] {
  const nachFest = new Map<number, number[]>();
  for (const key of kanten) {
    const [fest, lauf] = key.split(":").map(Number) as [number, number];
    (nachFest.get(fest) ?? nachFest.set(fest, []).get(fest)!).push(lauf);
  }
  const ergebnis: [number, number, number][] = [];
  for (const fest of [...nachFest.keys()].sort((a, b) => a - b)) {
    const werte = nachFest.get(fest)!.sort((a, b) => a - b);
    let anfang = werte[0]!, vorher = werte[0]!;
    for (const wert of werte.slice(1)) {
      if (wert === vorher + 1) { vorher = wert; continue; }
      ergebnis.push([fest, anfang, vorher + 1]); anfang = wert; vorher = wert;
    }
    ergebnis.push([fest, anfang, vorher + 1]);
  }
  return ergebnis;
}

/**
 * Every unit edge where a floor cell meets rock or the map border, merged into maximal runs and
 * emitted in image pixels. Works on any floor shape — a rectangle, a corridor, or a cavern — which
 * is exactly why the two layouts can share it unchanged.
 */
export function wandLaeufe(
  istBoden: (x: number, y: number) => boolean,
  breite: number, hoehe: number, zellgroesse: number,
  id: (...pfad: string[]) => string,
): TacticalWall[] {
  const waagrecht = new Set<string>(), senkrecht = new Set<string>();
  const boden = (x: number, y: number) => x >= 0 && y >= 0 && x < breite && y < hoehe && istBoden(x, y);
  for (let y = 0; y < hoehe; y++) for (let x = 0; x < breite; x++) {
    if (!boden(x, y)) continue;
    if (!boden(x, y - 1)) waagrecht.add(`${y}:${x}`);
    if (!boden(x, y + 1)) waagrecht.add(`${y + 1}:${x}`);
    if (!boden(x - 1, y)) senkrecht.add(`${x}:${y}`);
    if (!boden(x + 1, y)) senkrecht.add(`${x + 1}:${y}`);
  }
  const z = zellgroesse;
  return [
    ...laeufe(waagrecht).map(([y, x0, x1]): TacticalWall => ({ id: id("wand", "w", `${y}:${x0}:${x1}`), kind: "wall", points: [[x0 * z, y * z], [x1 * z, y * z]], elevation: 0 })),
    ...laeufe(senkrecht).map(([x, y0, y1]): TacticalWall => ({ id: id("wand", "s", `${x}:${y0}:${y1}`), kind: "wall", points: [[x * z, y0 * z], [x * z, y1 * z]], elevation: 0 })),
  ];
}

// ---------------------------------------------------------------------------------------------
// Outline — a cell blob as one polygon ring
// ---------------------------------------------------------------------------------------------

/**
 * Trace a 4-connected cell set into a single closed ring in cell coordinates, clockwise with y
 * growing downwards, collinear points removed.
 *
 * **`SceneDoc.Region.punkte` is one ring, so a hole cannot be represented.** A cavern chamber that
 * wraps around a rock pillar therefore loses its hole here. That is a limit of the scene format,
 * not an oversight, and the caller says so in `bericht.ausgelassen` rather than quietly shipping a
 * region that claims to contain rock.
 */
export function umriss(zellen: ReadonlySet<string>): readonly (readonly [number, number])[] {
  const drin = (x: number, y: number) => zellen.has(`${x}:${y}`);
  /** Directed boundary edges with the interior on the right, so the ring comes out clockwise. */
  const kanten = new Map<string, [number, number][]>();
  const fuegeHinzu = (von: readonly [number, number], nach: readonly [number, number]) => {
    const key = `${von[0]}:${von[1]}`;
    (kanten.get(key) ?? kanten.set(key, []).get(key)!).push([nach[0], nach[1]]);
  };
  const sortiert = [...zellen].map((k) => k.split(":").map(Number) as [number, number]).sort((a, b) => a[1] - b[1] || a[0] - b[0]);
  for (const [x, y] of sortiert) {
    if (!drin(x, y - 1)) fuegeHinzu([x, y], [x + 1, y]);
    if (!drin(x + 1, y)) fuegeHinzu([x + 1, y], [x + 1, y + 1]);
    if (!drin(x, y + 1)) fuegeHinzu([x + 1, y + 1], [x, y + 1]);
    if (!drin(x - 1, y)) fuegeHinzu([x, y + 1], [x, y]);
  }
  const ersteZelle = sortiert[0];
  if (!ersteZelle) return [];
  // The topmost-then-leftmost cell's top-left corner is always on the outer ring, never in a hole.
  const start: [number, number] = [ersteZelle[0], ersteZelle[1]];
  const ring: [number, number][] = [start];
  let aktuell = start;
  for (let schritt = 0; schritt < zellen.size * 4 + 8; schritt++) {
    const ausgehend = kanten.get(`${aktuell[0]}:${aktuell[1]}`);
    if (!ausgehend?.length) break;
    // Deterministic at a pinch vertex: always take the first remaining edge in insertion order.
    const naechste = ausgehend.shift()!;
    aktuell = naechste;
    if (naechste[0] === start[0] && naechste[1] === start[1]) break;
    ring.push(naechste);
  }
  const vereinfacht: [number, number][] = [];
  for (let i = 0; i < ring.length; i++) {
    const vor = ring[(i - 1 + ring.length) % ring.length]!, hier = ring[i]!, nach = ring[(i + 1) % ring.length]!;
    const kollinear = (hier[0] - vor[0]) * (nach[1] - hier[1]) === (hier[1] - vor[1]) * (nach[0] - hier[0]);
    if (!kollinear) vereinfacht.push(hier);
  }
  return vereinfacht.length >= 3 ? vereinfacht : ring;
}

// ---------------------------------------------------------------------------------------------
// Furnishing — the pack answers queries, the generator never names an asset
// ---------------------------------------------------------------------------------------------

export interface Bestuecker {
  /** Ask the pack for an `art` carrying a `schlagwort`. An unanswerable query becomes a report line. */
  waehle(art: string, schlagwort: string): PaketAsset | null;
  /** Place a stamp at a known cell without reserving anything — floors, doors, markers. */
  setze(asset: PaketAsset, zx: number, zy: number, drehung?: number): void;
  /** Place a stamp on free cells drawn from `zellen`, reserving its footprint. With a `Lage`,
   * the preferred spots are tried first — a bed against its wall, a chair at its table — and
   * only then any free cell; the piece is turned so its back faces the side named. */
  platziere(asset: PaketAsset, zellen: readonly (readonly [number, number])[], lage?: Lage): boolean;
  /** Keep a cell clear of furniture — doorways, stairs, the cell a transition sits on. */
  sperre(x: number, y: number): void;
  readonly stamps: Stamp[];
  readonly nachArt: Record<string, number>;
  readonly nichtBedient: Set<string>;
}

/**
 * Where a piece would rather stand. `seite` is the side (0 north, 1 east, 2 south, 3 west) the
 * piece leans against — the wall behind a bed, the table beside a chair — and the footprint
 * extends away from it; `drehung` in quarter turns is how the piece is turned there. A piece is
 * drawn with its back at the top, so a bed on a north wall keeps its head against it unturned,
 * and a chair at a table to its north is turned twice, to face it.
 */
export interface Lage { readonly bevorzugt: readonly { readonly x: number; readonly y: number; readonly seite: 0 | 1 | 2 | 3; readonly drehung: 0 | 1 | 2 | 3 }[] }

export function passtZumSetting(asset: Pick<PaketAsset, "schlagworte">, setting?: KartenSetting): boolean {
  return setting === undefined || !KARTEN_SETTINGS.some(era => asset.schlagworte.includes(era)) || asset.schlagworte.includes(setting);
}

export function bestuecker(paket: AssetpaketV1, r: Rauschen, zellgroesse: number, id: (...pfad: string[]) => string, setting?: KartenSetting): Bestuecker {
  const stamps: Stamp[] = [], nachArt: Record<string, number> = {}, nichtBedient = new Set<string>();
  const belegt = new Set<string>();
  const massstab = zellgroesse / paket.zellgroesse;
  const setze = (asset: PaketAsset, zx: number, zy: number, drehung = 0): void => {
    const [ew, eh] = asset.einheiten;
    stamps.push({
      id: id("stamp", asset.name, `${zx}:${zy}`), a: assetVerweis(paket.id, asset.name),
      x: (zx + ew / 2) * zellgroesse, y: (zy + eh / 2) * zellgroesse, s: massstab, r: drehung, l: EBENE[asset.art] ?? 0,
    });
    nachArt[asset.art] = (nachArt[asset.art] ?? 0) + 1;
  };
  return {
    stamps, nachArt, nichtBedient, setze,
    sperre: (x, y) => { belegt.add(`${x}:${y}`); },
    waehle(art, schlagwort) {
      const kandidaten = paket.assets.filter((a) => a.art === art && a.schlagworte.includes(schlagwort) && passtZumSetting(a, setting));
      if (!kandidaten.length) { nichtBedient.add(`${art}/${schlagwort}`); return null; }
      return r.waehle(kandidaten);
    },
    platziere(asset, zellen, lage) {
      if (!zellen.length) return false;
      const erlaubt = new Set(zellen.map(([x, y]) => `${x}:${y}`));
      const [ew, eh] = asset.einheiten;
      const frei = (zx: number, zy: number, w: number, h: number): boolean => {
        for (let y = zy; y < zy + h; y++) for (let x = zx; x < zx + w; x++) if (!erlaubt.has(`${x}:${y}`) || belegt.has(`${x}:${y}`)) return false;
        return true;
      };
      const belege = (zx: number, zy: number, w: number, h: number) => { for (let y = zy; y < zy + h; y++) for (let x = zx; x < zx + w; x++) belegt.add(`${x}:${y}`); };
      // Preferred spots first, drawn at random from the list so two beds do not both claim the
      // first wall cell. The footprint turns with the piece; the anchor is the cell touching the
      // side, and the piece extends away from it.
      if (lage?.bevorzugt.length) {
        for (let versuch = 0; versuch < Math.min(KARTENWERK_LIMITS.versucheProStueck, lage.bevorzugt.length * 2); versuch++) {
          const spot = lage.bevorzugt[r.ganz(0, lage.bevorzugt.length - 1)]!;
          const quer = spot.drehung % 2 === 1, w = quer ? eh : ew, h = quer ? ew : eh;
          const ax = spot.seite === 1 ? spot.x - w + 1 : spot.x, ay = spot.seite === 2 ? spot.y - h + 1 : spot.y;
          if (!frei(ax, ay, w, h)) continue;
          belege(ax, ay, w, h);
          // `setze` anchors by the unturned footprint; shift so the turned one is centred here.
          setze(asset, ax + (w - ew) / 2, ay + (h - eh) / 2, spot.drehung * Math.PI / 2);
          return true;
        }
      }
      for (let versuch = 0; versuch < KARTENWERK_LIMITS.versucheProStueck; versuch++) {
        const [zx, zy] = zellen[r.ganz(0, zellen.length - 1)]!;
        if (!frei(zx, zy, ew, eh)) continue;
        belege(zx, zy, ew, eh);
        setze(asset, zx, zy);
        return true;
      }
      return false;
    },
  };
}

// ---------------------------------------------------------------------------------------------
// Containment — the address, which is the whole point (RB-21d:172)
// ---------------------------------------------------------------------------------------------

export interface KnotenBau {
  readonly erzeuger: string;
  readonly version: string;
  readonly keim: Weltkeim;
  readonly wurzelId: KnotenId;
  /**
   * `bauwerk` asserts construction and `ort` does not. A keep is built; a cavern is a place that
   * was found. The containment model must never claim someone built a cave, so the two layouts
   * mint different root kinds on purpose.
   */
  readonly wurzelArt: KnotenArt;
  readonly titel: string | null;
  readonly rahmen: Rahmen;
  readonly eltern?: GrundrissEltern | undefined;
  readonly raeume: readonly GrundrissRaum[];
  readonly mitte: (raum: GrundrissRaum) => readonly [number, number];
  readonly ids: IdFabrik;
}

export function baueKnoten(bau: KnotenBau): Knoten[] {
  const herkunft = (pfad: readonly string[], kindKeim: string): Herkunft => ({
    erzeuger: bau.erzeuger, version: bau.version, keimHash: bau.keim.keimHash, erzeugungspfad: pfad, kindKeim,
  });
  const eltern: readonly Kante[] = bau.eltern ? [{ von: bau.wurzelId, nach: bau.eltern.knotenId, art: bau.eltern.art }] : [];
  const knoten: Knoten[] = [{
    id: bau.wurzelId, art: bau.wurzelArt, titel: bau.titel, eltern, rahmen: bau.rahmen,
    anker: bau.eltern ? { in: bau.eltern.knotenId, bei: bau.eltern.bei, massstab: bau.eltern.massstab } : null,
    herkunft: herkunft([bau.wurzelArt], bau.ids.kindKeim(bau.wurzelArt)), sichtAnker: null,
  }];
  for (const raum of bau.raeume) {
    knoten.push({
      id: raum.id, art: "raum", titel: null,
      eltern: [{ von: raum.id, nach: bau.wurzelId, art: "liegt_in_geografie" }],
      rahmen: bau.rahmen,
      anker: { in: bau.wurzelId, bei: bau.mitte(raum), massstab: 1 },
      // The derived child seed, stored rather than discarded: this room is a re-derivable address
      // for whatever is generated inside it next (RB-21d:677-679). `verschachtelung.ts` consumes it.
      herkunft: herkunft(["raum", raum.pfad], bau.ids.kindKeim("raum", raum.pfad)),
      sichtAnker: null,
    });
  }
  return knoten;
}

/** Sort any identified geometry so the document never depends on traversal order. */
export const sortiereNachId = <T extends { id: string }>(rows: T[]): T[] =>
  rows.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
