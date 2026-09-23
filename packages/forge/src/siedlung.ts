// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { type CanonicalValue, type KnotenId } from "@chronicle/core";
import { parseRoadPlan, type RoadPlan, parseSettlementPlan, type SettlementPlan, KARTEN_SETTINGS, parseTacticalMapDocument, weltkeim, type AssetpaketV1, type BauwerkTyp, type KartenSetting, type Herkunft, type Knoten, type TacticalMapDocumentV1, type Weltkeim } from "@chronicle/szene";
import { type TacticalCartographyV1, type CartographyDachform } from "@chronicle/szene";
import { AUSGELASSEN_BASIS, KARTENWERK_LIMITS, fail, idFabrik, rauschen, type GrundrissEltern } from "./kartenwerk.ts";
import { flaeche, q, qp, schnittKonvex, type Polygon, type Punkt } from "./polygon.ts";
import { ohne } from "./stadt/gemeinsam.ts";
import { erzeugeViertelStadt } from "./stadt/viertel/index.ts";
import { FANTASY } from "./stadt/viertel/stil.ts";
import { MODERN } from "./stadt/modern/stil.ts";
import { KOLONIE } from "./stadt/kolonie/stil.ts";

/** Convex clipping keeps the same geometry authoritative for water, lots and bridges. */
const schnitt = schnittKonvex;
import { type RoadRouteReport } from "./road-routing.ts";
import { type RoadNetworkReport } from "./road-network.ts";
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
/** Fantasy-Siedlungen aus Vierteln (`stadt/viertel`, Spec 2026-09-23). Gegenwart und Sci-Fi bleiben bei 8/9/10. */
export const SIEDLUNG_VIERTEL_VERSION = "11";
/** Gegenwart und Sci-Fi aus derselben Viertelpipeline mit eigenem Stil (Spec 2026-09-23-stadt-zukunft, E2). */
export const SIEDLUNG_ZUKUNFT_VERSION = "12";

export const SIEDLUNG_LIMITS = Object.freeze({
  ...KARTENWERK_LIMITS, bauwerkeMin: 1, bauwerkeMax: 512, grundstueckMin: 2, grundstueckMax: 24,
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
  /** Nur Fantasy: die Altstadt bekommt eine Mauer mit Türmen und Toren. Vorgabe: bei einer Stadt ja. */
  readonly mauer?: boolean;
  /** Nur Fantasy: eine Burg auf dem höchsten Fleck an der Mauer. Vorgabe: bei einer Stadt ja. */
  readonly burg?: boolean;
}

/** One default vector per settlement kind, shared by the engine and the product controls. */
const SIEDLUNG_ART_STANDARD: Readonly<Record<SiedlungArt, Omit<SiedlungOptionen, "art">>> = Object.freeze({
  weiler: Object.freeze({ ausdehnung: [20, 16] as const, zellgroesse: 96, bauwerke: 9, strassenDichte: 0.1, grundstueck: [3, 5] as const, licht: false }),
  dorf: Object.freeze({ ausdehnung: [36, 28] as const, zellgroesse: 96, bauwerke: 42, strassenDichte: 0.3, grundstueck: [3, 6] as const, licht: true }),
  stadt: Object.freeze({ ausdehnung: [56, 44] as const, zellgroesse: 96, bauwerke: 224, strassenDichte: 0.55, grundstueck: [2, 5] as const, licht: true }),
});

/** Die Vorgaben je Ortsart. Eine Fantasy-Stadt aus Vierteln ist dichter bebaut (320 statt 224
 * Gebäude); Gegenwart und Sci-Fi bauen größere Häuser und behalten 224. Eine Kolonie hat als Stadt
 * einen Schutzzaun (Spec 2026-09-23-stadt-zukunft, E8). */
export function siedlungStandard(art: SiedlungArt = "dorf", setting: KartenSetting = "fantasy"): SiedlungOptionen {
  if (art !== "weiler" && art !== "dorf" && art !== "stadt") fail("option", "optionen.art", "weiler, dorf oder stadt erwartet");
  const viertel = setting === "fantasy" ? { mauer: art === "stadt", burg: art === "stadt", ...(art === "stadt" ? { bauwerke: 320 } : {}) } : setting === "scifi" ? { mauer: art === "stadt" } : {};
  return Object.freeze({ art, setting: "fantasy", standort: "fluss", relief: .5, bewaldung: .5, ...SIEDLUNG_ART_STANDARD[art], ...viertel });
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
  /** Wie die Kartenoptik das Dach zeichnet; fehlt es, gilt die Vorgabe des Settings (v11 schreibt keins). */
  readonly dach?: CartographyDachform;
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
  /** Nur v11: die erzeugten Viertel mit Rolle und Namen. */
  readonly viertel?: readonly { readonly id: string; readonly nutzung: string; readonly name: string; readonly flecken: number; readonly flaeche: number }[];
  /** Nur v11: dieselben Viertel als Zonenplan, den die Spielleitung übernehmen und verschieben kann. */
  readonly viertelPlan?: SettlementPlan;
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
  const optionen: SiedlungOptionen = { ...siedlungStandard(art, setting), ...auftrag.optionen, art, setting, standort };
  const relief = optionen.relief ?? .5, bewaldung = optionen.bewaldung ?? .5;
  for (const [name, value] of [["relief", relief], ["bewaldung", bewaldung]] as const) if (typeof value !== "number" || !(value >= 0 && value <= 1)) fail("option", `optionen.${name}`, "Zahl in 0..1 erwartet");
  const [breite, hoehe] = optionen.ausdehnung;
  const planung = optionen.planung === undefined ? undefined : parseSettlementPlan(optionen.planung);
  const verkehr = optionen.verkehr === undefined ? undefined : parseRoadPlan(optionen.verkehr);
  const strassenGeplant = !!verkehr?.knoten.length;
  const geplant = !!planung?.zonen.length, version = setting === "fantasy" ? SIEDLUNG_VIERTEL_VERSION : SIEDLUNG_ZUKUNFT_VERSION;
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
  for (const name of ["mauer", "burg"] as const) if (optionen[name] !== undefined && typeof optionen[name] !== "boolean") fail("option", `optionen.${name}`, "Boolean erwartet");
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
    generator: SIEDLUNG_ERZEUGER, version, seed: auftrag.keim,
    optionen: {
      art: optionen.art, ausdehnung: [breite, hoehe], zellgroesse: optionen.zellgroesse,
      bauwerke: optionen.bauwerke, strassenDichte: optionen.strassenDichte, grundstueck: [gMin, gMax],
      licht: optionen.licht, setting, standort, relief, bewaldung,
      ...(setting === "fantasy" ? { mauer: optionen.mauer ?? art === "stadt", burg: optionen.burg ?? art === "stadt" } : setting === "scifi" ? { mauer: optionen.mauer ?? art === "stadt" } : {}),
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
  const g = grundlage(auftrag, paket), basis = { erzeuger: SIEDLUNG_ERZEUGER, ausgelassen: AUSGELASSEN };
  // Ein Generator, drei Stile (Spec 2026-09-23-stadt-zukunft, E4): Fantasy v11, Gegenwart und Sci-Fi v12.
  return erzeugeViertelStadt(g, basis, g.setting === "fantasy" ? FANTASY : g.setting === "gegenwart" ? MODERN : KOLONIE);
}
