// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { type CanonicalValue, type KnotenId } from "@chronicle/core";
import {
  parseRoadPlan, type RoadPlan, parseSettlementPlan, type SettlementPlan, type SettlementZone, BAUWERK_LABEL, BAUWERK_SETTINGS, KARTEN_SETTINGS, parseTacticalMapDocument, weltkeim,
  type AssetpaketV1, type BauwerkTyp, type KartenSetting, type Herkunft, type Kante, type Knoten, type TacticalLight,
  type TacticalMapDocumentV1, type Weltkeim,
} from "@chronicle/szene";
import { parseTacticalCartography, type TacticalCartographyV1, type CartographyRegionV1 } from "@chronicle/szene";
import {
  AUSGELASSEN_BASIS, KARTENWERK_LIMITS, bestuecker, fail, idFabrik, rauschen, sortiereNachId,
  type GrundrissEltern,
} from "./kartenwerk.ts";
import {
  abstandPolygonStrecke, aussenkanten, clipHalbebene, doppelflaeche, einwaerts, flaeche, huelle, imPolygon, lloyd, q, qp,
  schnittKonvex, schwerpunkt, teileInParzellen, voronoi,
  type Polygon, type Punkt,
} from "./polygon.ts";
import { roofZone, zoneDraw, zoneBuilding } from "./siedlung-plan.ts";
import { freieMauer, frontParzellen, getrennteDaecher, hausImLos, mitAbstand, ohne, type Gasse } from "./stadt/gemeinsam.ts";

/** Convex clipping keeps the same geometry authoritative for water, lots and bridges. */
const schnitt = schnittKonvex;
import { routeRoadPlan, type RoadRouteReport } from "./road-routing.ts";
import { inspectRoadNetwork, type RoadNetworkReport } from "./road-network.ts";
import { erzeugeLandschaft, RELIEF_STANDORTE, type FlussStueck, type ReliefStandort } from "./relief.ts";

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
export const SIEDLUNG_VERSION = "8";
/** Planning is opt-in. Missing/empty plans retain the complete v8 output, including IDs. */
const SIEDLUNG_PLAN_VERSION = "9";

export const SIEDLUNG_LIMITS = Object.freeze({
  ...KARTENWERK_LIMITS, bauwerkeMin: 1, bauwerkeMax: 256, grundstueckMin: 2, grundstueckMax: 24,
});

export type SiedlungArt = "weiler" | "dorf" | "stadt";
/** The physical surroundings; the list lives with the relief that shapes them (`relief.ts`). */
export const SIEDLUNG_STANDORTE = RELIEF_STANDORTE;
export type SiedlungStandort = ReliefStandort;

export interface SiedlungOptionen {
  readonly verkehr?: RoadPlan;
  readonly planung?: SettlementPlan;
  readonly setting?: KartenSetting;
  /** Physical surroundings, normalized into the seed; older callers retain the river default. */
  readonly standort?: SiedlungStandort;
  /** 0..1: how strongly the land rises and falls, from a flat plain to a mountainous one. */
  readonly relief?: number;
  /** 0..1: how much of the open land outside the town carries woodland. */
  readonly bewaldung?: number;
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

/** One default vector per settlement kind, shared by the engine and the product controls. */
const SIEDLUNG_ART_STANDARD: Readonly<Record<SiedlungArt, Omit<SiedlungOptionen, "art">>> = Object.freeze({
  weiler: Object.freeze({ ausdehnung: [20, 16] as const, zellgroesse: 96, bauwerke: 9, strassenDichte: 0.1, grundstueck: [3, 5] as const, licht: false }),
  dorf: Object.freeze({ ausdehnung: [36, 28] as const, zellgroesse: 96, bauwerke: 42, strassenDichte: 0.3, grundstueck: [3, 6] as const, licht: true }),
  stadt: Object.freeze({ ausdehnung: [56, 44] as const, zellgroesse: 96, bauwerke: 224, strassenDichte: 0.55, grundstueck: [2, 5] as const, licht: true }),
});

export function siedlungStandard(art: SiedlungArt = "dorf"): SiedlungOptionen {
  if (art !== "weiler" && art !== "dorf" && art !== "stadt") fail("option", "optionen.art", "weiler, dorf oder stadt erwartet");
  return Object.freeze({ art, setting: "fantasy", standort: "fluss", relief: .5, bewaldung: .5, ...SIEDLUNG_ART_STANDARD[art] });
}

export const SIEDLUNG_STANDARD: SiedlungOptionen = siedlungStandard();

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
  readonly typ: BauwerkTyp;
  readonly titel: string;
  /** Stable generation path — the ward's point and the lot's centroid, both as coordinates.
   * A grid coordinate, never an array index (invariant I8). */
  readonly pfad: string;
  /**
   * Der Umriss in Zellen, gegen den Uhrzeigersinn, auf Tausendstel quantisiert.
   *
   * **Fassung 2 ersetzt hier ein Rechteck durch ein Polygon**, und das ist eine Migration, kein
   * Feld mehr: eine gewachsene Siedlung hat keine achsenparallelen Häuser, und ein Rechteck
   * konnte das nicht behaupten, ohne zu lügen. Nach Kayas Migrationsregel ist die Form eines
   * Bauwerks die irreversible Schicht — sie wird einmal maximal gebaut, nicht billig und später
   * teuer. Konvex ist sie nicht garantiert; einfach (überschneidungsfrei) immer.
   */
  readonly umriss: Polygon;
  /** The street this building fronts, by `SiedlungStrasse.id` — the fact the adjacency tests check. */
  readonly strasse: string;
}

export interface SiedlungStrasse {
  readonly id: string;
  /** `hauptstrasse` liegt auf einem Pfad von einem Tor zum Markt, `gasse` ist alles andere. */
  readonly art: "hauptstrasse" | "gasse";
  /** Das Straßenband in Zellen — die geteilte Viertelkante, auf Fahrbahnbreite verbreitert. */
  readonly umriss: Polygon;
}

export interface SiedlungBericht {
  readonly verkehr?: RoadNetworkReport & { readonly routes: readonly RoadRouteReport[]; readonly invalidNodes: readonly string[]; readonly reservedRegions: readonly string[] };
  readonly planung?: { readonly zonen: readonly { id: string; name: string; anzahl: number }[]; readonly verworfen: number };
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
  readonly cartography: TacticalCartographyV1;
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
  "Keine Türen und keine Portale. Ab Fassung 2 trägt eine Stadt eine Ringmauer als " +
    "`walls`-Geometrie, und wo eine Hauptstraße sie kreuzt, bleibt eine Lücke — das Tor ist die " +
    "Lücke, kein Portal. Ein Portal führt in eine andere Karte; ein Stadttor führt in dieselbe.",
  "Gebäudetypen und Namen beschreiben die Adresse. Keine Gewerbe-Simulation, Bewohner oder Artikel; " +
    "die Spielleitung kann Namen, Typ und Beschreibung bearbeiten, ohne vorhandene Innenräume neu zu erzeugen.",
]);

/** Ein Viertel: die Voronoizelle, ihr Punkt, und wie weit sie vom Marktplatz weg liegt. */
interface Viertel {
  readonly punkt: Punkt;
  readonly zelle: Polygon;
  readonly ferne: number;
  readonly pfad: string;
}

/** Everything both layouts share: validated options, the seed vector, the river and the land.
 * Drawn first and in this order, so a layout that follows sees the exact random stream v8 saw. */
function grundlage(auftrag: SiedlungAuftrag, paket: AssetpaketV1) {
  if (typeof auftrag?.keim !== "string" || !auftrag.keim.trim() || auftrag.keim.length > 256) fail("option", "auftrag.keim", "nichtleerer Keim mit höchstens 256 Zeichen erwartet");
  const art: SiedlungArt = auftrag.optionen?.art ?? "dorf";
  if (art !== "weiler" && art !== "dorf" && art !== "stadt") fail("option", "optionen.art", "weiler, dorf oder stadt erwartet");
  const setting = auftrag.optionen?.setting === undefined ? "fantasy" : auftrag.optionen.setting;
  if (!KARTEN_SETTINGS.some(era => era === setting)) fail("option", "optionen.setting", "fantasy, gegenwart oder scifi erwartet");
  const standort = auftrag.optionen?.standort === undefined ? "fluss" : auftrag.optionen.standort;
  if (!SIEDLUNG_STANDORTE.some(value => value === standort)) fail("option", "optionen.standort", `${SIEDLUNG_STANDORTE.join(", ")} erwartet`);
  const optionen: SiedlungOptionen = { ...siedlungStandard(art), ...auftrag.optionen, art, setting, standort };
  const relief = optionen.relief ?? .5, bewaldung = optionen.bewaldung ?? .5;
  for (const [name, value] of [["relief", relief], ["bewaldung", bewaldung]] as const) if (typeof value !== "number" || !(value >= 0 && value <= 1)) fail("option", `optionen.${name}`, "Zahl in 0..1 erwartet");
  const [breite, hoehe] = optionen.ausdehnung;
  const planung = optionen.planung === undefined ? undefined : parseSettlementPlan(optionen.planung);
  const verkehr = optionen.verkehr === undefined ? undefined : parseRoadPlan(optionen.verkehr);
  const strassenGeplant = !!verkehr?.knoten.length;
  const geplant = !!planung?.zonen.length, version = strassenGeplant ? "10" : geplant ? SIEDLUNG_PLAN_VERSION : SIEDLUNG_VERSION;
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
  const layoutKeim = weltkeim({
    generator: SIEDLUNG_ERZEUGER, version: SIEDLUNG_VERSION, seed: auftrag.keim,
    optionen: {
      art: optionen.art, ausdehnung: [breite, hoehe], zellgroesse: optionen.zellgroesse,
      bauwerke: optionen.bauwerke, strassenDichte: optionen.strassenDichte, grundstueck: [gMin, gMax],
      licht: optionen.licht, setting, standort, relief, bewaldung,
      paket: { id: paket.id, version: paket.version, zellgroesse: paket.zellgroesse },
    } as Readonly<Record<string, CanonicalValue>>,
  });
  const keim = geplant || strassenGeplant ? weltkeim({ generator: SIEDLUNG_ERZEUGER, version, seed: auftrag.keim,
    optionen: { ...layoutKeim.optionen, ...(geplant ? { planung: planung as unknown as CanonicalValue } : {}),
      ...(strassenGeplant ? { verkehr: verkehr as unknown as CanonicalValue } : {}) } }) : layoutKeim;
  const r = rauschen(layoutKeim.keimHash);
  const z = optionen.zellgroesse;
  const ids = idFabrik(SIEDLUNG_ERZEUGER, version, keim.keimHash);
  const rahmen: Polygon = [[0, 0], [breite, 0], [breite, hoehe], [0, hoehe]];
  const rand = Math.min(breite, hoehe) * (art === "weiler" ? .14 : .12);
  const ortsRahmen: Polygon = [[rand, rand], [breite - rand, rand], [breite - rand, hoehe - rand], [rand, hoehe - rand]];
  // One continuous river made from touching convex reaches. Streets keep their network;
  // the actual overlap is a separate bridge surface above this water, never erased water.
  const quer = r.ganz(0, 1) === 1, laenge = quer ? breite : hoehe, querMass = quer ? hoehe : breite;
  const kontrollen = [r.zahl(.18, .32), r.zahl(.12, .3), r.zahl(.68, .9), r.zahl(.58, .76)].map(value => value * querMass);
  const flussBreite = Math.max(.65, Math.min(3.8, Math.min(breite, hoehe) * .066)), breitStart = r.zahl(.85, 1.05), breitEnde = r.zahl(1.05, 1.4);
  const flussPunkte: Punkt[] = Array.from({ length: 17 }, (_, i) => {
    const t = i / 16, u = 1 - t, querOrt = u ** 3 * kontrollen[0]! + 3 * u * u * t * kontrollen[1]! + 3 * u * t * t * kontrollen[2]! + t ** 3 * kontrollen[3]!;
    return quer ? [q(laenge * t), q(querOrt)] : [q(querOrt), q(laenge * t)];
  });
  const ufer = flussPunkte.map((point, i) => {
    const a = flussPunkte[Math.max(0, i - 1)]!, b = flussPunkte[Math.min(flussPunkte.length - 1, i + 1)]!, dx = b[0] - a[0], dy = b[1] - a[1], size = Math.hypot(dx, dy);
    const half = flussBreite * (breitStart * (1 - i / 16) + breitEnde * i / 16) / 2;
    return { left: qp([point[0] - dy / size * half, point[1] + dx / size * half]), right: qp([point[0] + dy / size * half, point[1] - dx / size * half]) };
  });
  // The land itself: a height field shaped by the location (`relief.ts`). Water, rock, beach,
  // swamp and the outer woods are derived from it instead of drawn. The guaranteed river of
  // `fluss` is carved into it as a valley, so every tributary the hydrology finds runs into it.
  const landschaft = erzeugeLandschaft({ breite, hoehe, standort, keimHash: layoutKeim.keimHash, relief, bewaldung,
    kern: { x: breite / 2, y: hoehe / 2, rx: breite * .42, ry: hoehe * .42 },
    ...(standort === "fluss" ? { flussAchse: flussPunkte, flussBreite } : {}) });
  const fluss: FlussStueck[] = [
    ...(standort === "fluss" ? ufer.slice(1).flatMap((b, i): FlussStueck[] => {
      const polygon = schnitt([ufer[i]!.left, ufer[i]!.right, b.right, b.left], rahmen);
      return polygon.length >= 3 ? [{ polygon, von: flussPunkte[i]!, bis: flussPunkte[i + 1]! }] : [];
    }) : []),
    ...landschaft.fluesse,
  ];
  const wasser: Polygon[] = [...landschaft.wasser], fels: Polygon[] = [...landschaft.fels], strand: Polygon[] = [...landschaft.strand], sumpf: Polygon[] = [...landschaft.sumpf];
  const wasserMaterial = landschaft.wasserMaterial;
  // Every obstacle is convex. Houses never stand in water or on rock. Streets stop at a lake,
  // the sea and a rock face, but cross any river: the overlap becomes a bridge below.
  const hartHindernisse = [...wasser, ...fels];
  const bauHindernisse = [...hartHindernisse, ...fluss.map(stueck => stueck.polygon)];
  const strassenHindernisse = hartHindernisse;
  return { auftrag, paket, art, setting, standort, optionen, relief, bewaldung, breite, hoehe, planung, verkehr, strassenGeplant, geplant, version, L, gMin, gMax, layoutKeim, keim, r, z, ids, rahmen, rand, ortsRahmen, flussBreite, flussPunkte, landschaft, fluss, wasser, fels, strand, sumpf, wasserMaterial, hartHindernisse, bauHindernisse, strassenHindernisse };
}
export type SiedlungGrund = ReturnType<typeof grundlage>;

export function erzeugeSiedlung(auftrag: SiedlungAuftrag, paket: AssetpaketV1): Siedlung {
  const g = grundlage(auftrag, paket);
  const { art, setting, standort, optionen, relief, bewaldung, breite, hoehe, planung, verkehr, strassenGeplant, geplant, version, L, gMin, gMax, layoutKeim, keim, r, z, ids, rahmen, rand, ortsRahmen, flussBreite, flussPunkte, landschaft, fluss, wasser, fels, strand, sumpf, wasserMaterial, hartHindernisse, bauHindernisse, strassenHindernisse } = g;
  let planVerworfen = 0;

  // -- 1. Viertel: Punkte streuen, Lloyd glätten, Voronoi schneiden ---------------------------
  // Ein gestörtes Raster statt reinem Zufall: reiner Zufall erzeugt Klumpen und Splitterzellen,
  // in denen keine Parzelle Platz hat. Eine Runde Lloyd beruhigt die Verteilung, danach
  // verdichtet die Stadt ihre Mitte, ohne die Unregelmässigkeit zu verlieren.
  // Rund ein Dutzend Parzellen je Viertel: weniger, und der Block liest als Einzelhof; mehr,
  // und das Straßennetz wird so grob, dass die Stadt wieder aus wenigen Riesenblöcken besteht.
  const zielViertel = Math.max(4, Math.min(90, Math.round((optionen.bauwerke / (art === "stadt" ? 5.2 : art === "dorf" ? 4.8 : 6)) * (0.7 + optionen.strassenDichte * 0.7)) + 3));
  const spalten = Math.max(2, Math.round(Math.sqrt((zielViertel * breite) / hoehe)));
  const reihen = Math.max(2, Math.round(zielViertel / spalten));
  const zellBreite = (breite - 2 * rand) / spalten, zellHoehe = (hoehe - 2 * rand) / reihen;
  const rohPunkte: Punkt[] = [];
  const streuung = setting === "fantasy" ? .34 : setting === "gegenwart" ? .035 : 0;
  for (let j = 0; j < reihen; j++) {
    for (let i = 0; i < spalten; i++) {
      rohPunkte.push([
        rand + (i + 0.5 + r.zahl(-streuung, streuung) + (setting === "scifi" && j % 2 ? .18 : 0)) * zellBreite,
        rand + (j + 0.5 + r.zahl(-streuung, streuung)) * zellHoehe,
      ]);
    }
  }
  // The old centre has short blocks and many front doors. Outer wards get wider gardens.
  // Compress only the planning points, never already generated or persisted geometry.
  const punkte = (setting === "fantasy" ? lloyd(rohPunkte, ortsRahmen, 1) : rohPunkte).map(([x, y]) => {
    if (art !== "stadt" || setting !== "fantasy") return qp([x, y]);
    const compress = (value: number, size: number) => {
      const unit = (value - size / 2) / (size / 2 - rand);
      return size / 2 + Math.sign(unit) * Math.abs(unit) ** 1.55 * (size / 2 - rand);
    };
    return qp([compress(x, breite), compress(y, hoehe)]);
  });
  const alleZellen = voronoi(punkte, ortsRahmen);

  // -- 2. Stadtgebiet: eine gejitterte Scheibe um die Mitte -----------------------------------
  // Der Jitter je Viertel ist der Grund, warum der Umriss nicht als Kreis liest. `stadt` füllt
  // die Karte fast aus, ein Weiler ist eine Handvoll Höfe an einer Kreuzung.
  const mitteX = breite / 2 + r.zahl(-breite * 0.06, breite * 0.06);
  const mitteY = hoehe / 2 + r.zahl(-hoehe * 0.06, hoehe * 0.06);
  const maxRadius = Math.min(breite, hoehe) / 2;
  const anteil = art === "stadt" ? 1.03 : art === "dorf" ? 1.0 : 0.85;
  const gewaehlt: number[] = [];
  const abstandZurMitte = punkte.map((p) => Math.sqrt((p[0] - mitteX) ** 2 + (p[1] - mitteY) ** 2));
  for (let i = 0; i < punkte.length; i++) {
    if (alleZellen[i]!.length < 3) continue;
    if (setting !== "fantasy" || abstandZurMitte[i]! <= maxRadius * anteil * r.zahl(0.74, 1.12)) gewaehlt.push(i);
  }
  // Ein Ort ohne Mitte ist kein Ort: notfalls die nächstgelegenen Viertel nehmen.
  if (gewaehlt.length < 3) {
    const nachNaehe = punkte.map((_, i) => i).filter((i) => alleZellen[i]!.length >= 3)
      .sort((a, b) => abstandZurMitte[a]! - abstandZurMitte[b]! || a - b);
    gewaehlt.length = 0;
    gewaehlt.push(...nachNaehe.slice(0, Math.min(3, nachNaehe.length)));
  }
  if (gewaehlt.length < 3) fail("geometrie", "viertel", "auf diesem Raster ließen sich keine drei zusammenhängenden Viertel schneiden");
  // Stabile Reihenfolge über die Geometrie, nicht über den Erzeugungsindex (Invariante I8).
  gewaehlt.sort((a, b) => punkte[a]![1] - punkte[b]![1] || punkte[a]![0] - punkte[b]![0]);

  const viertel: Viertel[] = gewaehlt.map((i) => ({
    punkt: punkte[i]!, zelle: alleZellen[i]!.map(qp), ferne: abstandZurMitte[i]!,
    pfad: `viertel.${q(punkte[i]![0])}_${q(punkte[i]![1])}`,
  }));
  // Zentrum und Markt sind zwei Dinge. Vom mittigsten Viertel wächst der Straßenstern.
  // Ein kompakter Markt sitzt im nächsten trockenen Viertel, dessen Straßenfronten weiter
  // bewohnt werden. Platz und Zugang werden vor der Parzellierung freigehalten.
  let zentrumIndex = 0;
  for (let i = 1; i < viertel.length; i++) if (viertel[i]!.ferne < viertel[zentrumIndex]!.ferne) zentrumIndex = i;
  const marktIndex = viertel.length >= 5 ? viertel.map((ward, index) => ({ ward, index }))
    .sort((a, b) => a.ward.ferne - b.ward.ferne || a.index - b.index)
    .find(({ ward }) => !bauHindernisse.some(water => imPolygon(schwerpunkt(ward.zelle), water)
      || water.some((point, i) => abstandPolygonStrecke([schwerpunkt(ward.zelle)], point, water[(i + 1) % water.length]!) < 1.7)))?.index ?? zentrumIndex : -1;

  // -- 3. Gassen: geteilte Voronoikanten. Hier entsteht das Netz mit Zyklen. -------------------
  // Zwei Viertel teilen sich genau eine Kante; sie einmal als Band zu zeichnen ergibt einen
  // planaren Graphen, dessen Maschen die Blöcke sind. Das ist der ganze Unterschied zur alten
  // Kammstruktur, in der Gassen im Nichts endeten.
  const gassenBreite = setting === "gegenwart" ? 1.4 + optionen.strassenDichte * .6
    : setting === "scifi" ? 1.2 + optionen.strassenDichte * .5 : Math.max(0.55, Math.min(1.2, 0.58 + optionen.strassenDichte * 0.6));
  const kantenTreffer = new Map<string, { a: number; b: number; von: Punkt; bis: Punkt }>();
  for (let vi = 0; vi < viertel.length; vi++) {
    const zelle = viertel[vi]!.zelle;
    for (let i = 0, j = zelle.length - 1; i < zelle.length; j = i++) {
      const a = zelle[j]!, b = zelle[i]!;
      const mx = q((a[0] + b[0]) / 2), my = q((a[1] + b[1]) / 2);
      // Der Mittelpunkt ist der stabilste Schlüssel: beide Nachbarn schneiden dieselbe
      // Bisektrice, aber in anderer Reihenfolge, und Endpunkte können im letzten Bit abweichen.
      const key = `${Math.round(mx * 100)}:${Math.round(my * 100)}`;
      const vorhanden = kantenTreffer.get(key);
      if (vorhanden) { if (vorhanden.b < 0) vorhanden.b = vi; }
      else kantenTreffer.set(key, { a: vi, b: -1, von: a, bis: b });
    }
  }
  const gassen: Gasse[] = [];
  const nachbarn: number[][] = viertel.map(() => []);
  /** Viertel mit mindestens einer Aussenkante — die Tore der Siedlung sitzen hier. */
  const amRand = viertel.map(() => false);
  /** Liegt die Kante auf dem Kartenrahmen? Dann ist sie der Rand der **Leinwand**, nicht des
   *  Ortes: dort gehört keine Randgasse hin, sonst rahmt ein Weg die ganze Karte ein. */
  const aufDemRahmen = (a: Punkt, b: Punkt): boolean =>
    (Math.abs(a[0] - rand) < .002 && Math.abs(b[0] - rand) < .002) || (Math.abs(a[0] - breite + rand) < .002 && Math.abs(b[0] - breite + rand) < .002)
    || (Math.abs(a[1] - rand) < .002 && Math.abs(b[1] - rand) < .002) || (Math.abs(a[1] - hoehe + rand) < .002 && Math.abs(b[1] - hoehe + rand) < .002);
  for (const kante of [...kantenTreffer.values()].sort((x, y) => x.von[1] - y.von[1] || x.von[0] - y.von[0])) {
    if (kante.b < 0) amRand[kante.a] = true;
    const ex = kante.bis[0] - kante.von[0], ey = kante.bis[1] - kante.von[1];
    const laenge = Math.sqrt(ex * ex + ey * ey);
    if (laenge < gassenBreite) continue; // zu kurz für eine begehbare Gasse
    if (kante.b < 0 && aufDemRahmen(kante.von, kante.bis)) continue;
    let nx = (-ey / laenge) * (gassenBreite / 2), ny = (ex / laenge) * (gassenBreite / 2);
    // **Aussenkante = Randgasse.** Eine erste Fassung übersprang sie, und damit verlor jedes Los,
    // das nur ans offene Land grenzte, seine Adresse: ein Dorf schrumpfte von 24 auf 12 Höfe.
    // Der Ortsrand ist aber erreichbar — er hat einen Weg. Also bekommt er einen, und zwar ganz
    // nach innen versetzt, damit er innerhalb der Mauer bleibt statt auf ihr zu liegen.
    const randgasse = kante.b < 0;
    if (randgasse) {
      const mx = (kante.von[0] + kante.bis[0]) / 2, my = (kante.von[1] + kante.bis[1]) / 2;
      const zumPunkt: Punkt = [viertel[kante.a]!.punkt[0] - mx, viertel[kante.a]!.punkt[1] - my];
      const nachInnen = nx * zumPunkt[0] + ny * zumPunkt[1] > 0 ? 1 : -1;
      nx *= nachInnen; ny *= nachInnen;
    }
    // Auf den Rahmen beschnitten: eine Viertelkante kann auf der Kartengrenze liegen, und ein
    // Band um sie ragte zur Hälfte hinaus — Geometrie ausserhalb der Karte ist ein Fehler, kein
    // Überstand (siedlung.test.ts: „hält jedes Stück Geometrie innerhalb der Karte").
    const rohBand: Polygon = randgasse
      ? [
        [kante.von[0], kante.von[1]], [kante.bis[0], kante.bis[1]],
        [kante.bis[0] + 2 * nx, kante.bis[1] + 2 * ny], [kante.von[0] + 2 * nx, kante.von[1] + 2 * ny],
      ]
      : [
        [kante.von[0] + nx, kante.von[1] + ny], [kante.bis[0] + nx, kante.bis[1] + ny],
        [kante.bis[0] - nx, kante.bis[1] - ny], [kante.von[0] - nx, kante.von[1] - ny],
      ];
    let band = rohBand;
    for (const [rnx, rny, rc] of [[-1, 0, 0], [1, 0, breite], [0, -1, 0], [0, 1, hoehe]] as const) {
      band = clipHalbebene(band, rnx, rny, rc);
    }
    if (band.length < 3) continue;
    gassen.push({
      id: ids.geometrieId("gasse", `${q(kante.von[0])}_${q(kante.von[1])}`, `${q(kante.bis[0])}_${q(kante.bis[1])}`),
      // Eine Randgasse hat nur einen Anlieger. `b = a` macht sie in der Breitensuche zur
      // Schleife auf sich selbst, also wird sie nie Teil des Hauptstraßensterns — richtig so:
      // ein Feldweg am Ortsrand ist keine Durchgangsstraße.
      art: "gasse", a: kante.a, b: randgasse ? kante.a : kante.b, von: kante.von, bis: kante.bis,
      band: band.map(qp),
    });
    nachbarn[kante.a]!.push(gassen.length - 1);
    if (!randgasse) nachbarn[kante.b]!.push(gassen.length - 1);
  }
  // A redundant street running lengthways through the river is neither a quay nor a
  // plausible bridge. Remove it only when its endpoints retain an actual alternate route.
  // This happens before parcel/address creation, so no house can keep a deleted address.
  const endpointKey = (point: Punkt) => `${Math.round(point[0] * 100)}:${Math.round(point[1] * 100)}`;
  for (let index = gassen.length - 1; index >= 0; index--) {
    const candidate = gassen[index]!, dx = candidate.bis[0] - candidate.von[0], dy = candidate.bis[1] - candidate.von[1];
    const alongWater = fluss.some(stueck => {
      if (flaeche(schnitt(candidate.band, stueck.polygon)) < .08) return false;
      const wx = stueck.bis[0] - stueck.von[0], wy = stueck.bis[1] - stueck.von[1];
      return Math.abs(dx * wx + dy * wy) / (Math.hypot(dx, dy) * (Math.hypot(wx, wy) || 1)) > .84;
    });
    if (!alongWater) continue;
    const start = endpointKey(candidate.von), target = endpointKey(candidate.bis), reached = new Set([start]), pending = [start];
    for (let cursor = 0; cursor < pending.length && !reached.has(target); cursor++) {
      for (const [otherIndex, other] of gassen.entries()) {
        if (otherIndex === index) continue;
        const a = endpointKey(other.von), b = endpointKey(other.bis), next = a === pending[cursor] ? b : b === pending[cursor] ? a : null;
        if (next === null || reached.has(next)) continue;
        reached.add(next); pending.push(next);
      }
    }
    if (reached.has(target)) gassen.splice(index, 1);
  }
  // Only rivers receive bridges. Lake, sea and mountain faces stop the full road width;
  // shortened frontages become the addresses used by parcel generation below.
  if (strassenHindernisse.length) {
    const clearance = strassenHindernisse.map(polygon => mitAbstand(polygon, gassenBreite + .045));
    const trockeneGassen = gassen.flatMap(road => freieMauer(road.von, road.bis, clearance).flatMap(([von, bis], index) => {
      if (Math.hypot(bis[0] - von[0], bis[1] - von[1]) < gassenBreite) return [];
      const dx = bis[0] - von[0], dy = bis[1] - von[1];
      const band = clipHalbebene(clipHalbebene(road.band, -dx, -dy, -dx * von[0] - dy * von[1]), dx, dy, dx * bis[0] + dy * bis[1]).map(qp);
      if (band.length < 3 || flaeche(band) < .02 || strassenHindernisse.some(polygon => flaeche(schnitt(band, polygon)) > 1e-10)) return [];
      return [{ ...road, id: ids.geometrieId("landstrasse", road.id, `${index}`), von, bis, band }];
    }));
    gassen.splice(0, gassen.length, ...trockeneGassen);
  }
  for (const list of nachbarn) list.length = 0;
  for (const [index, road] of gassen.entries()) {
    nachbarn[road.a]!.push(index);
    if (road.b !== road.a) nachbarn[road.b]!.push(index);
  }
  if (!gassen.length) fail("geometrie", "strassen", "die gewählten Viertel teilen sich keine einzige Kante");

  // -- 4. Hauptstraßen: von jedem Randviertel zurück zum Markt --------------------------------
  // Breitensuche vom Marktplatz aus, dann von jedem Tor am Elternzeiger entlang zurück. Die
  // Vereinigung dieser Pfade ist der radiale Straßenstern, den eine gewachsene Stadt hat —
  // und sie ist zusammenhängend, weil sie aus einem Baum stammt.
  const eltern = new Array<number>(viertel.length).fill(-1);
  const elternGasse = new Array<number>(viertel.length).fill(-1);
  const gesehen = new Array<boolean>(viertel.length).fill(false);
  gesehen[zentrumIndex] = true;
  const schlange = [zentrumIndex];
  for (let kopf = 0; kopf < schlange.length; kopf++) {
    const hier = schlange[kopf]!;
    for (const gi of nachbarn[hier]!) {
      const g = gassen[gi]!;
      const dort = g.a === hier ? g.b : g.a;
      if (gesehen[dort]) continue;
      gesehen[dort] = true; eltern[dort] = hier; elternGasse[dort] = gi;
      schlange.push(dort);
    }
  }
  // Ein Tor ist ein Viertel mit einer Aussenkante — es grenzt an das offene Land. Das wird beim
  // Kantenzählen festgehalten, nicht hinterher aus der Nachbarzahl geraten: seit es Randgassen
  // gibt, ist ein Randviertel an seiner Nachbarzahl nicht mehr zu erkennen, und der Stern der
  // Hauptstraßen verschwand geräuschlos.
  for (let vi = 0; vi < viertel.length; vi++) {
    if (!amRand[vi] || !gesehen[vi]) continue;
    for (let hier = vi; elternGasse[hier]! >= 0; hier = eltern[hier]!) gassen[elternGasse[hier]!]!.art = "hauptstrasse";
  }
  // Narrow lanes leave hierarchy and air between roofs. Their endpoints remain shared,
  // so changing the width cannot disconnect the original road graph.
  for (let i = 0; i < gassen.length; i++) {
    const g = gassen[i]!, scale = g.art === "hauptstrasse" ? 1 : setting === "fantasy" ? .52 : .76;
    const dx = g.bis[0] - g.von[0], dy = g.bis[1] - g.von[1], length2 = dx * dx + dy * dy;
    gassen[i] = { ...g, band: g.band.map(point => {
      const t = ((point[0] - g.von[0]) * dx + (point[1] - g.von[1]) * dy) / length2;
      const foot: Punkt = [g.von[0] + t * dx, g.von[1] + t * dy];
      return qp([foot[0] + (point[0] - foot[0]) * scale, foot[1] + (point[1] - foot[1]) * scale]);
    }) };
  }
  // Only arrival roads meet the image edge. Buildings keep a countryside margin on all sides.
  const arrivals: { point: Punkt; ward: number; side: number }[] = [];
  for (const g of gassen) for (const point of [g.von, g.bis]) {
    const distances = [point[1] - rand, breite - rand - point[0], hoehe - rand - point[1], point[0] - rand];
    const side = distances.indexOf(Math.min(...distances));
    const edge: Punkt = side === 0 ? [point[0] + rand * .3, 0] : side === 1 ? [breite, point[1] + rand * .3] : side === 2 ? [point[0] - rand * .3, hoehe] : [0, point[1] - rand * .3];
    if (distances[side]! < .002 && !arrivals.some(value => value.side === side)
      && !bauHindernisse.some(water => imPolygon(point, water) || imPolygon(edge, water))) arrivals.push({ point, ward: g.a, side });
  }
  for (const arrival of arrivals.slice(0, art === "weiler" ? 2 : 4)) {
    const a = arrival.point, side = arrival.side, b: Punkt = side === 0 ? [q(a[0] + rand * .3), 0] : side === 1 ? [breite, q(a[1] + rand * .3)] : side === 2 ? [q(a[0] - rand * .3), hoehe] : [0, q(a[1] - rand * .3)];
    const dx = b[0] - a[0], dy = b[1] - a[1], length = Math.hypot(dx, dy), half = gassenBreite * .36, nx = -dy / length * half, ny = dx / length * half;
    const band = schnitt([[a[0] + nx, a[1] + ny], [b[0] + nx, b[1] + ny], [b[0] - nx, b[1] - ny], [a[0] - nx, a[1] - ny]], rahmen);
    if (strassenHindernisse.some(polygon => flaeche(schnitt(band, polygon)) > 1e-10)) continue;
    gassen.push({ id: ids.geometrieId("zufahrt", `${side}`), art: "hauptstrasse", a: arrival.ward, b: arrival.ward, von: a, bis: b, band });
  }

  // Explicit links supplement the automatic layout. Reserve their entire footprint BEFORE
  // placing buildings. Empty/missing plans do not touch the old PRNG or its output contract.
  const routed = strassenGeplant ? routeRoadPlan(verkehr!, { width: breite, height: hoehe,
    obstacles: hartHindernisse, rivers: fluss.map(f => f.polygon), elevation: landschaft.hoehe }) : undefined;
  const roadReservations = routed?.surfaces.map(s => s.polygon) ?? [];

  // The market and its walk to a dry street are reserved before roofs are fitted.
  // A plaza painted after generation could otherwise erase a house or become unreachable.
  let marktFlaeche: Polygon = [], marktZugang: Polygon = [];
  if (marktIndex >= 0) {
    const center = schwerpunkt(viertel[marktIndex]!.zelle), [x0, y0, x1, y1] = huelle(viertel[marktIndex]!.zelle);
    const half = Math.min(art === "stadt" ? 1.5 : 1.15, (x1 - x0) * .22, (y1 - y0) * .22);
    marktFlaeche = ([[center[0] - half, center[1] - half * .8], [center[0] + half, center[1] - half * .8], [center[0] + half, center[1] + half * .8], [center[0] - half, center[1] + half * .8]] as Polygon).map(qp);
    const paths = nachbarn[marktIndex]!.map(index => gassen[index]!).map(road => {
      const dx = road.bis[0] - road.von[0], dy = road.bis[1] - road.von[1], t = Math.max(0, Math.min(1, ((center[0] - road.von[0]) * dx + (center[1] - road.von[1]) * dy) / (dx * dx + dy * dy)));
      const end: Punkt = [road.von[0] + t * dx, road.von[1] + t * dy], distance = Math.hypot(end[0] - center[0], end[1] - center[1]);
      const nx = (end[1] - center[1]) / (distance || 1) * .2, ny = (center[0] - end[0]) / (distance || 1) * .2;
      return { distance, polygon: ([[center[0] + nx, center[1] + ny], [end[0] + nx, end[1] + ny], [end[0] - nx, end[1] - ny], [center[0] - nx, center[1] - ny]] as Polygon).map(qp) };
    }).filter(path => path.distance > .05 && !bauHindernisse.some(water => flaeche(schnitt(path.polygon, water)) > 1e-10)).sort((a, b) => a.distance - b.distance);
    marktZugang = paths[0]?.polygon ?? [];
  }

  // -- 5. Parzellen: Viertel einwärts, dann rekursiv in Sehnen schneiden ----------------------
  // Stadt und Dorf erhalten zusammenhängende Straßenfronten um freie Innenhöfe. Beim
  // Weiler bleiben rekursiv geteilte Bauernhöfe; innere Lose ohne Straßenanschluss werden
  // dort verworfen. Kein Haus erhält eine bloß angenommene Adresse.
  interface RohBauwerk { readonly zone?: SettlementZone; readonly pfad: string; readonly umriss: Polygon; readonly los: Polygon; readonly strasseId: string; readonly ferne: number }
  const proViertel: RohBauwerk[][] = [];
  const hofFlaechen: Polygon[] = [];
  for (let vi = 0; vi < viertel.length; vi++) {
    const block = einwaerts(viertel[vi]!.zelle, gassenBreite * .56);
    if (block.length < 3) { proViertel.push([]); continue; }
    hofFlaechen.push(block);
    // Aussen grössere Parzellen als innen: die Dichte fällt nach aussen ab, wie in jeder Stadt,
    // die um einen Markt gewachsen ist statt am Reissbrett entstanden zu sein.
    const naehe = Math.min(1, viertel[vi]!.ferne / (maxRadius || 1));
    const seite = gMin + (gMax - gMin) * naehe;
    const zielFlaeche = Math.max(1.2, seite * seite * r.zahl(.34, .58));
    const frontage = Math.max(1.05, seite * (art === "stadt" ? .46 : .48));
    const lose = (art === "weiler" ? teileInParzellen(block, zielFlaeche, r, 9)
      : frontParzellen(block, nachbarn[vi]!.map(index => gassen[index]!), frontage, Math.max(1.8, seite * .92), r))
      .filter((los) => {
        if (flaeche(los) < Math.max(0.8, gMin * gMin * (art === "stadt" ? .22 : .28))) return false;
        // Splitter verwerfen: ein Schnitt kann ein langes dünnes Dreieck abtrennen, und das
        // liest als Fehler, nicht als Haus.
        const [hx0, hy0, hx1, hy1] = huelle(los);
        const kurz = Math.min(hx1 - hx0, hy1 - hy0), lang = Math.max(hx1 - hx0, hy1 - hy0);
        return kurz > 0.35 && lang / kurz <= 4.2;
      });
    const meine: RohBauwerk[] = [];
    for (const los of lose) {
      // Der Hof ist der Streifen zwischen Parzelle und Haus — angehängter Garten, keine Leere.
      const innen = einwaerts(los, .09);
      if (innen.length < 3) continue;
      const s = schwerpunkt(los);
      let beste = -1, besterAbstand = Infinity;
      for (const gi of nachbarn[vi]!) {
        const g = gassen[gi]!;
        const d = abstandPolygonStrecke(innen, g.von, g.bis);
        if (d < besterAbstand) { besterAbstand = d; beste = gi; }
      }
      // Ein Los am äusseren Blockrand grenzt an offenes Land, nicht an eine Gasse. Es zu
      // verwerfen ist billiger als eine Adresse zu vergeben, die niemand erreichen kann.
      if (beste < 0 || besterAbstand > gassenBreite / 2 + 1) continue;
      const w = art === "weiler" ? Math.max(.65, Math.min(setting === "fantasy" ? 2.7 : 3.4, Math.sqrt(flaeche(los)) * r.zahl(.64, .77)))
        : Math.max(.65, Math.min(frontage * r.zahl(.83, .94), Math.sqrt(flaeche(los)) * .9));
      const haus = hausImLos(innen, gassen[beste]!, w, w * r.zahl(.84, 1.32), setting === "fantasy" && r.zahl(0, 1) < .21 ? "l" : "rechteck");
      if (haus.length < 3 || bauHindernisse.some(wasser => flaeche(schnitt(haus, wasser)) > 1e-10 || wasser.some((point, i) => abstandPolygonStrecke(haus, point, wasser[(i + 1) % wasser.length]!) < .04))) continue;
      if (hartHindernisse.some(polygon => flaeche(schnitt(los, polygon)) > 1e-10)) continue;
      if ([marktFlaeche, marktZugang, ...roadReservations].some(reserve => reserve.length >= 3 && flaeche(schnitt(haus, reserve)) > 1e-10)) continue;
      if (meine.some(other => !getrennteDaecher(haus, other.umriss))) continue;
      meine.push({
        pfad: `${viertel[vi]!.pfad}.los.${q(s[0])}_${q(s[1])}`,
        umriss: haus.map(qp), los: los.map(qp), strasseId: gassen[beste]!.id, ferne: viertel[vi]!.ferne,
      });
    }
    meine.sort((a, b) => a.pfad < b.pfad ? -1 : a.pfad > b.pfad ? 1 : 0);
    proViertel.push(meine);
  }
  // Reihum über die Viertel einsammeln, damit das Budget die Stadt füllt statt ein Viertel.
  const rohBauwerke: RohBauwerk[] = [];
  for (let runde = 0; rohBauwerke.length < optionen.bauwerke; runde++) {
    let genommen = false;
    for (const [index, liste] of proViertel.entries()) {
      const batch = art === "stadt" ? viertel[index]!.ferne < maxRadius * .42 ? 4 : viertel[index]!.ferne < maxRadius * .68 ? 2 : 1 : 1;
      for (let j = runde * batch; j < Math.min(liste.length, (runde + 1) * batch); j++) {
        rohBauwerke.push(liste[j]!);
        genommen = true;
        if (rohBauwerke.length >= optionen.bauwerke) break;
      }
      if (rohBauwerke.length >= optionen.bauwerke) break;
    }
    if (!genommen) break;
  }
  // Filter the already fitted and budgeted candidates, not the parcel loop. Removing a
  // candidate there would let later overlapping roofs take its place and make density jump.
  if (geplant) {
    const candidates = rohBauwerke.splice(0);
    for (const b of candidates) {
      const zone = roofZone(planung!, b.umriss.map(([x, y]) => [x / breite, y / hoehe] as const));
      const amUfer = () => [...wasser, ...fluss.map(f => f.polygon)].some(poly => poly.some((point, i) => abstandPolygonStrecke(b.umriss, point, poly[(i + 1) % poly.length]!) <= 4));
      if (zone === "excluded" || zone && (zoneDraw(layoutKeim.keimHash, b.pfad, "density") >= zone.dichte || zone.nutzung === "hafen" && setting !== "scifi" && !amUfer())) { planVerworfen++; continue; }
      rohBauwerke.push({ ...b, ...(zone ? { zone } : {}) });
    }
  }
  if (!rohBauwerke.length && !geplant && !strassenGeplant) fail("geometrie", "bauwerke", "auf diesem Raster ließ sich kein einziges Gebäude an einer Straße platzieren");

  // The largest plots serve the public buildings. Houses remain the majority; even a small
  // settlement with three addresses has a church, an inn and a home. No wiki entries are minted.
  const nachGroesse = [...rohBauwerke].sort((a, b) => Math.abs(flaeche(b.umriss)) - Math.abs(flaeche(a.umriss)) || (a.pfad < b.pfad ? -1 : a.pfad > b.pfad ? 1 : 0));
  const rang = new Map(nachGroesse.map((b, i) => [b.pfad, i]));
  const hausnamen = ["Linden", "Weber", "Falk", "Birken", "Mühlen", "Rosen", "Stein", "Eichen"];
  const kirchennamen = ["Kirche des Morgenlichts", "Kirche am Brunnen", "Kirche der stillen Wacht", "Kirche der Heimkehr"];
  const tavernennamen = ["Zum Silberfuchs", "Zur alten Brücke", "Zum goldenen Hirsch", "Zum roten Kessel"];
  const bauwerke: SiedlungBauwerk[] = rohBauwerke.map((b, i) => {
    const platz = rang.get(b.pfad)!;
    const modern: readonly BauwerkTyp[] = ["krankenhaus", "bahnhof", "wohnblock", "schule", "supermarkt", "polizei", "feuerwache", "cafe", "buero", "restaurant", "hotel", "fabrik", "labor", "bibliothek", "museum", "bank", "werkstatt"];
    const raumfahrt: readonly BauwerkTyp[] = ["raumhafen", "kommando", "raumstation", "medstation", "reaktor", "labor", "werkstatt", "fabrik", "lager"];
    const mix = setting === "gegenwart" ? modern : raumfahrt;
    const typ: BauwerkTyp = b.zone ? zoneBuilding(b.zone, setting, zoneDraw(layoutKeim.keimHash, b.pfad, "type")) : setting !== "fantasy"
      ? platz < mix.length ? mix[platz]! : platz % 3 ? (setting === "gegenwart" ? "wohnblock" : "raumstation") : r.waehle(BAUWERK_SETTINGS[setting])!
      : platz === 0 ? "kirche" : platz === 1 ? "taverne" : platz === 3 ? "schmiede"
        : platz === 4 || platz > 8 && platz % 11 === 0 ? "lager" : platz === 6 && art === "stadt" ? "turm"
          : platz === 7 ? "bibliothek" : platz === 9 ? "museum" : platz === 12 ? "bank" : platz === 15 ? "werkstatt" : "haus";
    const titel = setting === "gegenwart" ? `${BAUWERK_LABEL[typ]} ${r.waehle(["Nordpark", "Parkallee", "Westend", "Hafenring"])} ${i + 1}`
      : setting === "scifi" ? `${BAUWERK_LABEL[typ]} ${r.waehle(["Orion", "Vega", "Nova", "Kepler"])} ${i + 1}`
        : typ === "kirche" ? r.waehle(kirchennamen)! : typ === "taverne" ? r.waehle(tavernennamen)!
          : typ === "haus" ? `Haus ${r.waehle(hausnamen)} ${i + 1}` : `${BAUWERK_LABEL[typ]} ${i + 1}`;
    return { id: ids.knotenId("bauwerk", b.pfad), pfad: b.pfad, umriss: b.umriss, strasse: b.strasseId, typ, titel };
  });
  const mitte = (b: SiedlungBauwerk): readonly [number, number] => {
    const s = schwerpunkt(b.umriss);
    return [q(s[0] * z), q(s[1] * z)];
  };
  const strassen: SiedlungStrasse[] = gassen.map((g) => ({ id: g.id, art: g.art, umriss: g.band }));
  const extraRegions: { readonly id: string; readonly polygon: Polygon; readonly role: CartographyRegionV1 }[] = [];
  const generatedRole = (regionId: string) => ({ regionId, authored: false, locked: false, provenance: keim });
  for (const surface of routed?.surfaces ?? []) {
    const id = ids.geometrieId("verkehr", surface.key);
    strassen.push({ id, art: surface.art, umriss: surface.polygon });
    extraRegions.push({ id, polygon: surface.polygon, role: { ...generatedRole(id), role: "road", material: surface.square ? "square" : surface.art === "hauptstrasse" ? "street" : "path" } });
  }
  const groundId = ids.geometrieId("gelände", "grund");
  extraRegions.push({ id: groundId, polygon: rahmen, role: { ...generatedRole(groundId), role: "terrain", material: "grass" } });
  for (const [material, polygons] of [["rock", fels], ["sand", strand], ["swamp", sumpf]] as const) for (const [index, polygon] of polygons.entries()) {
    const id = ids.geometrieId("standort", material, `${index}`);
    extraRegions.push({ id, polygon, role: { ...generatedRole(id), role: "terrain", material } });
  }
  const junctions = new Map<string, { point: Punkt; count: number; radius: number; main: boolean }>();
  for (const road of gassen) for (const point of [road.von, road.bis]) {
    const key = `${Math.round(point[0] * 100)}:${Math.round(point[1] * 100)}`, old = junctions.get(key);
    const radius = flaeche(road.band) / Math.hypot(road.bis[0] - road.von[0], road.bis[1] - road.von[1]) / 2;
    junctions.set(key, { point, count: (old?.count ?? 0) + 1, radius: Math.max(old?.radius ?? 0, radius), main: old?.main === true || road.art === "hauptstrasse" });
  }
  for (const [key, junction] of junctions) {
    if (junction.count < 2) continue;
    const directions: Punkt[] = [[1, 0], [.707107, .707107], [0, 1], [-.707107, .707107], [-1, 0], [-.707107, -.707107], [0, -1], [.707107, -.707107]];
    const polygon = schnitt(directions.map(([x, y]) => qp([junction.point[0] + x * junction.radius, junction.point[1] + y * junction.radius])), rahmen);
    const id = ids.geometrieId("kreuzung", key);
    extraRegions.push({ id, polygon, role: { ...generatedRole(id), role: "road", material: art === "stadt" ? "street" : "path" } });
    strassen.push({ id, art: junction.main ? "hauptstrasse" : "gasse", umriss: polygon });
  }
  const habitatObstacles = [...bauHindernisse.map(poly => mitAbstand(poly, .035)), ...strand, ...sumpf,
    ...strassen.map(road => mitAbstand(road.umriss, .06)), ...(standort === "wald" ? rohBauwerke.map(building => mitAbstand(building.los, .08)) : [])]
    .filter(polygon => polygon.length >= 3).map(polygon => ({ polygon, box: huelle(polygon) }));
  // Countryside already placed: the outer woods are cut around it, so no field carries trees.
  const bewachsen: { polygon: Polygon; box: readonly [number, number, number, number] }[] = [];
  const landscape = (polygon: Polygon, path: string, material: "forest" | "field", outer = false) => {
    let pieces = [schnitt(polygon, rahmen)];
    for (const obstacle of outer ? [...habitatObstacles, ...bewachsen] : habitatObstacles) pieces = pieces.flatMap(piece => {
      const box = huelle(piece);
      return box[2] <= obstacle.box[0] || box[0] >= obstacle.box[2] || box[3] <= obstacle.box[1] || box[1] >= obstacle.box[3]
        ? [piece] : ohne(piece, obstacle.polygon);
    });
    for (const [index, piece] of pieces.entries()) {
      if (piece.length < 3 || flaeche(piece) < .18) continue;
      const id = ids.geometrieId("landschaft", material, path, `${index}`);
      extraRegions.push({ id, polygon: piece, role: { ...generatedRole(id), role: "terrain", material } });
      if (!outer) bewachsen.push({ polygon: piece, box: huelle(piece) });
    }
  };
  const woodland = (polygon: Polygon, path: string) => {
    const [x0, y0, x1, y1] = huelle(polygon), center = schwerpunkt(polygon);
    const directions: Punkt[] = [[1, 0], [.92, .38], [.71, .71], [.38, .92], [0, 1], [-.38, .92], [-.71, .71], [-.92, .38], [-1, 0], [-.92, -.38], [-.71, -.71], [-.38, -.92], [0, -1], [.38, -.92], [.71, -.71], [.92, -.38]];
    const outline = directions.map(([dx, dy], i) => { const jitter = .92 + .025 * Math.sin(i / directions.length * Math.PI * 6); return qp([center[0] + dx * (x1 - x0) * .5 * jitter, center[1] + dy * (y1 - y0) * .5 * jitter]); });
    const shape = schnitt(outline, polygon);
    if (shape.length >= 3) landscape(shape, path, "forest");
  };
  // Large quiet patches frame the settlement. Their edge remains the generated landscape,
  // rather than thousands of repeated floor stamps competing with roofs and roads. Whether a
  // ward outside the town turns to wood or to fields is the land's own decision: its moisture.
  for (let i = 0; i < alleZellen.length; i++) {
    if (gewaehlt.includes(i) || alleZellen[i]!.length < 3) continue;
    const polygon = einwaerts(alleZellen[i]!, .22); if (polygon.length < 3) continue;
    const path = `${punkte[i]![0]}_${punkte[i]![1]}`;
    if (standort === "wald" || landschaft.feuchte(punkte[i]![0], punkte[i]![1]) >= landschaft.waldSchwelle) woodland(polygon, path);
    else for (const [index, field] of teileInParzellen(polygon, flaeche(polygon) / 2, r, 2).entries()) {
      const shape = einwaerts(field, .15); if (shape.length < 3) continue;
      landscape(shape, `${path}.${index}`, "field");
    }
  }
  const fieldGroups: Polygon[] = [
    [[breite * .34, .05], [breite - .05, .05], [breite * .96, rand * .72], [breite * .54, rand * .94], [breite * .4, rand * .48]],
    [[breite * .13, hoehe - rand * .55], [breite * .3, hoehe - rand * .94], [breite * .49, hoehe - rand * .7], [breite * .5, hoehe - .05], [breite * .12, hoehe - .05]],
  ];
  for (const [group, polygon] of (standort === "wald" ? [] : fieldGroups).entries()) for (const [index, field] of teileInParzellen(polygon, flaeche(polygon) / 3, r, 3).entries()) {
    const shape = einwaerts(field, .1);
    if (shape.length >= 3) landscape(shape, `flur.${group}.${index}`, "field");
  }
  // The outer woods grow where the relief is wet: continuous there, open where it is dry, and
  // never over water, rock, beach, swamp, fields or a road.
  for (const [index, polygon] of landschaft.wald.entries()) landscape(polygon, `wald.${index}`, "forest", true);
  const tragendeStrassen = [...strassen];
  for (const [i, polygon] of wasser.entries()) {
    const id = ids.geometrieId("wasser", `abschnitt.${i}`);
    extraRegions.push({ id, polygon, role: { ...generatedRole(id), role: "water", material: wasserMaterial } });
  }
  // Every river reach, the guaranteed one and every tributary, becomes water; where a street
  // crosses it the overlap is a bridge surface above the water, never erased water.
  for (const [i, stueck] of fluss.entries()) {
    const id = ids.geometrieId("fluss", `abschnitt.${i}`);
    extraRegions.push({ id, polygon: stueck.polygon, role: { ...generatedRole(id), role: "water", material: "river" } });
    const box = huelle(stueck.polygon);
    for (const gasse of tragendeStrassen) {
      const roadBox = huelle(gasse.umriss);
      if (roadBox[2] <= box[0] || roadBox[0] >= box[2] || roadBox[3] <= box[1] || roadBox[1] >= box[3]) continue;
      const bridge = schnitt(gasse.umriss, stueck.polygon); if (bridge.length < 3 || flaeche(bridge) < .00001) continue;
      const bridgeId = ids.geometrieId("brücke", gasse.id, `abschnitt.${i}`);
      extraRegions.push({ id: bridgeId, polygon: bridge, role: { ...generatedRole(bridgeId), role: "road", material: "bridge" } });
      strassen.push({ id: bridgeId, art: gasse.art, umriss: bridge });
    }
  }
  for (const roh of rohBauwerke) {
    const id = ids.geometrieId("grundstück", roh.pfad);
    extraRegions.push({ id, polygon: roh.los, role: { ...generatedRole(id), role: "lot" } });
  }
  if (marktIndex >= 0) {
    let parts: Polygon[] = [marktFlaeche];
    for (const water of bauHindernisse) parts = parts.flatMap(polygon => ohne(polygon, water));
    for (const [index, polygon] of parts.entries()) {
      if (polygon.length < 3 || flaeche(polygon) < .04) continue;
      const id = ids.geometrieId("markt", viertel[marktIndex]!.pfad, `${index}`);
      extraRegions.push({ id, polygon, role: { ...generatedRole(id), role: "road", material: "square" } });
      strassen.push({ id, art: "gasse", umriss: polygon });
    }
    if (marktZugang.length >= 3) {
      const id = ids.geometrieId("marktweg", viertel[marktIndex]!.pfad);
      extraRegions.push({ id, polygon: marktZugang, role: { ...generatedRole(id), role: "road", material: "path" } });
      strassen.push({ id, art: "gasse", umriss: marktZugang });
    }
  }

  // -- 5b. Der Steg: eine Siedlung am Wasser hat einen Landeplatz -------------------------------
  // From the town's centre to the nearest point of the shore, then straight on into the water:
  // planks on posts, drawn by the projection with boats alongside. A town on a coast gets two.
  if (standort === "kueste" || standort === "see" || standort === "fluss") {
    const ufer = [...wasser, ...(standort === "fluss" ? fluss.map(stueck => stueck.polygon) : [])];
    const mitteOrt: Punkt = marktIndex >= 0 ? schwerpunkt(viertel[marktIndex]!.zelle) : [breite / 2, hoehe / 2];
    const kandidaten = ufer.flatMap(polygon => polygon.filter(p => p[0] > .5 && p[1] > .5 && p[0] < breite - .5 && p[1] < hoehe - .5).map(p => ({ p, polygon, abstand: Math.hypot(p[0] - mitteOrt[0], p[1] - mitteOrt[1]) })))
      .sort((first, second) => first.abstand - second.abstand || first.p[0] - second.p[0] || first.p[1] - second.p[1]);
    const haeuser = bauwerke.map(b => b.umriss);
    let gesetzt = 0;
    for (const kandidat of kandidaten) {
      if (gesetzt >= (art === "stadt" && standort !== "fluss" ? 2 : 1)) break;
      const richtung: Punkt = [schwerpunkt(kandidat.polygon)[0] - kandidat.p[0], schwerpunkt(kandidat.polygon)[1] - kandidat.p[1]], norm = Math.hypot(richtung[0], richtung[1]) || 1;
      const dx = richtung[0] / norm, dy = richtung[1] / norm, laenge = standort === "fluss" ? Math.min(1.6, Math.max(.8, flussBreite * .55)) : art === "stadt" ? 3.2 : 2.2, halb = .26;
      const start: Punkt = [kandidat.p[0] - dx * .35, kandidat.p[1] - dy * .35], ende: Punkt = [start[0] + dx * (laenge + .35), start[1] + dy * (laenge + .35)];
      const steg = schnittKonvex([qp([start[0] - dy * halb, start[1] + dx * halb]), qp([ende[0] - dy * halb, ende[1] + dx * halb]), qp([ende[0] + dy * halb, ende[1] - dx * halb]), qp([start[0] + dy * halb, start[1] - dx * halb])], rahmen);
      if (steg.length < 3 || flaeche(steg) < .1) continue;
      // The pier has to stand in this water, not cross a house, and keep clear of an earlier pier.
      if (flaeche(schnitt(steg, kandidat.polygon)) < flaeche(steg) * .45) continue;
      if (haeuser.some(haus => flaeche(schnitt(steg, haus)) > 1e-6)) continue;
      const stegId = ids.geometrieId("steg", `${q(kandidat.p[0])}_${q(kandidat.p[1])}`);
      if (extraRegions.some(region => region.role.role === "road" && region.role.material === "steg" && Math.hypot(schwerpunkt(region.polygon)[0] - kandidat.p[0], schwerpunkt(region.polygon)[1] - kandidat.p[1]) < 4)) continue;
      extraRegions.push({ id: stegId, polygon: steg, role: { ...generatedRole(stegId), role: "road", material: "steg" } });
      strassen.push({ id: stegId, art: "gasse", umriss: steg });
      gesetzt++;
    }
  }

  // -- 6. Mauer und Tore: nur eine Stadt ummauert sich ----------------------------------------
  const mauern: { id: string; kind: "wall"; points: readonly (readonly [number, number])[]; elevation: number }[] = [];
  if (art === "stadt" && setting === "fantasy") {
    // An old defensive core, with later suburbs outside it. Choosing whole inner wards
    // retains the irregular block silhouette instead of following the rectangular canvas.
    const kern = viertel.filter(ward => ward.ferne < maxRadius * .66);
    const kanten = aussenkanten((kern.length >= 3 ? kern : viertel.slice(0, 3)).map(ward => ward.zelle));
    const versatz = gassenBreite * .88;
    const wallLines: { path: string; a: Punkt; b: Punkt }[] = [];
    const ecken = new Map<string, Punkt[]>();
    for (const kante of kanten) {
      const dx = kante.bis[0] - kante.von[0], dy = kante.bis[1] - kante.von[1], length = Math.hypot(dx, dy);
      if (length < .05) continue;
      const middle: Punkt = [(kante.von[0] + kante.bis[0]) / 2, (kante.von[1] + kante.bis[1]) / 2];
      const sign = (middle[0] - mitteX) * -dy + (middle[1] - mitteY) * dx > 0 ? 1 : -1;
      const offset: Punkt = [-dy / length * versatz * sign, dx / length * versatz * sign];
      const a = qp([kante.von[0] + offset[0], kante.von[1] + offset[1]]), b = qp([kante.bis[0] + offset[0], kante.bis[1] + offset[1]]);
      const path = `${q(kante.von[0])}_${q(kante.von[1])}.${q(kante.bis[0])}_${q(kante.bis[1])}`;
      wallLines.push({ path, a, b });
      for (const [original, shifted] of [[kante.von, a], [kante.bis, b]] as const) {
        const key = `${q(original[0])}_${q(original[1])}`, old = ecken.get(key) ?? [];
        old.push(shifted); ecken.set(key, old);
      }
    }
    // Bevel joins keep the offset silhouette closed. Roads and water then cut real gates,
    // not marker icons; no wall survives across a bridge, river or an existing building.
    for (const [path, points] of ecken) if (points.length === 2) wallLines.push({ path: `ecke.${path}`, a: points[0]!, b: points[1]! });
    // A wall has a visible stone body and capped ends, not just a zero-width centre line.
    // Set back from roofs before clipping so neither the stone nor its shadow re-enters a
    // house at a cut endpoint. Split concave L roofs into convex pieces before expanding;
    // intersecting all six half-planes would otherwise discard one of the wings.
    const roofClearance = Math.max(.24, 5 / z);
    const roofObstacles = bauwerke.flatMap(building => {
      const p = building.umriss;
      const pieces = p.length === 6 ? [[p[0]!, p[1]!, p[2]!, p[5]!], [p[2]!, p[3]!, p[4]!, p[5]!]] : [p];
      return pieces.map(piece => mitAbstand(piece, roofClearance));
    });
    const obstacles = [...bauHindernisse.map(poly => mitAbstand(poly, .07)), ...strassen.map(road => mitAbstand(road.umriss, .14)), ...roofObstacles];
    for (const line of wallLines) for (const [index, [a, b]] of freieMauer(line.a, line.b, obstacles).entries()) {
      if ([a, b].some(([x, y]) => x < 0 || x > breite || y < 0 || y > hoehe)) continue;
      mauern.push({ id: ids.geometrieId("mauer", line.path, `${index}`), kind: "wall", elevation: 0,
        points: [[q(a[0] * z), q(a[1] * z)], [q(b[0] * z), q(b[1] * z)]] });
    }
  }

  // -- 7. Stempel: Straßenbelag, Hofboden, eine Eingangsmarke, optionale Laternen -------------
  // A settlement's kind is not only numbers: a village track is dirt, a town street is paved.
  // The pack answers a query; this generator never names an asset (`kartenwerk.ts`'s own rule).
  const werk = bestuecker(paket, r, z, ids.geometrieId, setting);
  // Retain the genre pack's tangible paving vocabulary as one focal detail. Continuous
  // ground is drawn from canonical materials instead of repeating opaque floor squares.
  const belag = werk.waehle("boden", setting === "gegenwart" ? "asphalt" : setting === "scifi" ? "metall" : optionen.art === "stadt" ? "stein" : "erde");
  if (belag) {
    const g = gassen.find(value => value.art === "hauptstrasse") ?? gassen[0]!;
    werk.setze(belag, Math.max(0, Math.min(breite - 1, Math.floor((g.von[0] + g.bis[0]) / 2))), Math.max(0, Math.min(hoehe - 1, Math.floor((g.von[1] + g.bis[1]) / 2))));
  }
  const inEinem = (p: Punkt, polys: readonly Polygon[]): boolean => {
    for (const poly of polys) if (imPolygon(p, poly)) return true;
    return false;
  };
  const strassenPolys = strassen.map((g) => g.umriss);
  const bauwerkPolys = bauwerke.map(b => b.umriss);
  let strassenzellen = 0, hofzellen = 0;
  for (let y = 0; y < hoehe; y++) {
    for (let x = 0; x < breite; x++) {
      const p: Punkt = [x + 0.5, y + 0.5];
      if (inEinem(p, bauwerkPolys)) continue;
      if (inEinem(p, strassenPolys)) {
        strassenzellen++;
      } else if (inEinem(p, hofFlaechen)) {
        hofzellen++;
      }
    }
  }
  const eingangAsset = werk.waehle("marke", "eingang");
  if (eingangAsset) {
    // Am äussersten Punkt einer Hauptstraße: dort betritt man den Ort.
    let torX = Math.floor(mitteX), torY = Math.floor(mitteY), weiteste = -1;
    for (const g of gassen) {
      if (g.art !== "hauptstrasse") continue;
      for (const p of [g.von, g.bis]) {
        const d = (p[0] - mitteX) ** 2 + (p[1] - mitteY) ** 2;
        if (d > weiteste) { weiteste = d; torX = Math.max(0, Math.min(breite - 1, Math.floor(p[0]))); torY = Math.max(0, Math.min(hoehe - 1, Math.floor(p[1]))); }
      }
    }
    werk.setze(eingangAsset, torX, torY);
  }

  const lichter: TacticalLight[] = [];
  if (setting !== "fantasy") {
    const verkehr = werk.waehle("aufbau", "verkehr");
    if (verkehr) {
      const frei: [number, number][] = [];
      const obstacles = [...bauwerkPolys, ...bauHindernisse].map(polygon => ({ polygon, box: huelle(polygon) }));
      for (let y = 0; y < hoehe; y++) for (let x = 0; x < breite; x++) {
        const point: Punkt = [x + .5, y + .5], cell: Polygon = [[x, y], [x + 1, y], [x + 1, y + 1], [x, y + 1]];
        if ((inEinem(point, strassenPolys) || inEinem(point, hofFlaechen)) && !obstacles.some(({ polygon, box }) => box[0] < x + 1 && box[2] > x && box[1] < y + 1 && box[3] > y && flaeche(schnitt(polygon, cell)) > 1e-10)) frei.push([x, y]);
      }
      for (let i = 0; i < Math.min(12, Math.max(1, Math.floor(bauwerke.length / 6))); i++) {
        if (!werk.platziere(verkehr, frei)) continue;
        const stamp = werk.stamps[werk.stamps.length - 1]!, [w, h] = verkehr.einheiten, x = stamp.x / z - w / 2, y = stamp.y / z - h / 2;
        const id = ids.geometrieId("stellfläche", stamp.id), polygon: Polygon = [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
        extraRegions.push({ id, polygon, role: { ...generatedRole(id), role: "terrain", material: "rock" } });
      }
    }
  }
  if (optionen.licht) {
    for (const g of gassen) {
      if (g.art !== "hauptstrasse") continue;
      const asset = werk.waehle("licht", setting === "fantasy" ? "warm" : "kalt");
      if (!asset) continue; // recorded in nichtBedient; not fatal to the map
      const mx = Math.max(0, Math.min(breite - 1, Math.floor((g.von[0] + g.bis[0]) / 2)));
      const my = Math.max(0, Math.min(hoehe - 1, Math.floor((g.von[1] + g.bis[1]) / 2)));
      werk.setze(asset, mx, my);
      const letzter = werk.stamps[werk.stamps.length - 1]!;
      lichter.push({
        // Auf beide Enden geschluesselt: an einer Kreuzung teilen sich mehrere Hauptstrassen
        // denselben Anfangspunkt, und eine Id, die nur den kennt, waere dort nicht eindeutig.
        id: ids.geometrieId("licht", `${q(g.von[0])}_${q(g.von[1])}`, `${q(g.bis[0])}_${q(g.bis[1])}`), position: [letzter.x, letzter.y],
        range: z * 4, intensity: 0.8, colorArgb: setting === "fantasy" ? "ffdd8a33" : "ffb9ddff", shadows: true, elevation: 0,
      });
    }
  }

  // -- 8. Dokument ----------------------------------------------------------------------------
  const nachPixeln = (poly: Polygon): readonly (readonly [number, number])[] => poly.map((p) => [q(p[0] * z), q(p[1] * z)] as const);
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
        ...extraRegions.map(value => ({ id: value.id, punkte: nachPixeln(value.polygon) })),
        ...bauwerke.map((b) => ({ id: b.id, punkte: nachPixeln(b.umriss) })),
        ...gassen.map((s) => ({ id: s.id, punkte: nachPixeln(s.band) })),
      ],
      places: bauwerke.map((b) => ({ id: ids.geometrieId("platz", b.pfad), x: mitte(b)[0], y: mitte(b)[1] })),
    },
    grid: { kind: "square", size: z, origin: [0, 0] },
    elevation: 0, geometryElevation: [],
    walls: sortiereNachId(mauern), portals: [], lights: sortiereNachId(lichter),
    environment: { bakedLighting: false, ambientLightArgb: setting === "scifi" ? "ffb4c6dd" : setting === "gegenwart" ? "ffe0e4e7" : "ffd9cba0" },
    background: null,
  });
  const cartography = parseTacticalCartography({ schemaVersion: 1, kind: "tactical-cartography", construction: { cellSize: z, origin: [0, 0] }, relief: landschaft.relief, regions: [
    ...extraRegions.map(value => value.role),
    ...bauwerke.map(b => ({ ...generatedRole(b.id), role: "building", streetRegionId: b.strasse, lotRegionId: ids.geometrieId("grundstück", b.pfad) })),
    ...gassen.map(g => ({ ...generatedRole(g.id), role: "road", material: art === "stadt" ? "street" : "path" })),
  ] }, karte);

  // -- containment: the settlement's `ort`, and one `bauwerk` per building ---------------------
  const herkunft = (pfad: readonly string[], kindKeim: string): Herkunft =>
    ({ erzeuger: SIEDLUNG_ERZEUGER, version, keimHash: keim.keimHash, erzeugungspfad: pfad, kindKeim });
  const wurzelId = ids.knotenId("siedlung");
  const wurzelEltern: readonly Kante[] = auftrag.eltern ? [{ von: wurzelId, nach: auftrag.eltern.knotenId, art: auftrag.eltern.art }] : [];
  const knoten: Knoten[] = [{
    id: wurzelId, art: "ort", titel: auftrag.titel ?? null, eltern: wurzelEltern, rahmen: karte.frame,
    anker: auftrag.eltern ? { in: auftrag.eltern.knotenId, bei: auftrag.eltern.bei, massstab: auftrag.eltern.massstab } : null,
    herkunft: herkunft(["ort"], ids.kindKeim("ort")), sichtAnker: null,
  }];
  for (const b of bauwerke) {
    knoten.push({
      id: b.id, art: "bauwerk", titel: b.titel,
      bauwerk: { typ: b.typ, beschreibung: "" },
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
    art: "siedlung", erzeuger: SIEDLUNG_ERZEUGER, version, keim, wurzelId, karte, cartography,
    knoten: Object.freeze(knoten), bauwerke: Object.freeze(bauwerke), strassen: Object.freeze(strassen),
    bericht: Object.freeze({
      ...(routed ? { verkehr: { routes: routed.routes, invalidNodes: routed.invalidNodes, reservedRegions: routed.surfaces.map(s => ids.geometrieId("verkehr", s.key)),
        ...inspectRoadNetwork(strassen, bauwerke, breite, hoehe, verkehr!, routed.routes) } } : {}),
      ...(geplant ? { planung: { zonen: planung!.zonen.map(zone => ({ id: zone.id, name: zone.name, anzahl: rohBauwerke.filter(b => b.zone?.id === zone.id).length })), verworfen: planVerworfen } } : {}),
      bauwerke: bauwerke.length, angefordert: optionen.bauwerke, strassen: strassen.length,
      strassenzellen, hofzellen, stamps: werk.stamps.length, stampsNachArt: Object.freeze({ ...werk.nachArt }),
      paket: Object.freeze({ id: paket.id, version: paket.version, assets: paket.assets.length }),
      nichtBedient: Object.freeze([...werk.nichtBedient].sort()),
      ausgelassen: AUSGELASSEN,
    }),
  });
}
