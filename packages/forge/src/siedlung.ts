// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
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
import {
  abstandPolygonStrecke, aussenkanten, clipHalbebene, einwaerts, flaeche, huelle, imPolygon, lloyd, q, qp,
  schwerpunkt, teileInParzellen, voronoi,
  type Polygon, type Punkt,
} from "./polygon.ts";

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
export const SIEDLUNG_VERSION = "2";

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

/** How `art` shifts the defaults. The product reads these through `siedlungStandard`, so its
 * controls describe the same defaults that generation actually uses. */
const SIEDLUNG_ART_STANDARD: Readonly<Record<SiedlungArt, Omit<SiedlungOptionen, "art">>> = Object.freeze({
  weiler: Object.freeze({ ausdehnung: [20, 16] as const, zellgroesse: 96, bauwerke: 9, strassenDichte: 0.1, grundstueck: [3, 5] as const, licht: false }),
  dorf: Object.freeze({ ausdehnung: [36, 28] as const, zellgroesse: 96, bauwerke: 42, strassenDichte: 0.3, grundstueck: [3, 6] as const, licht: true }),
  stadt: Object.freeze({ ausdehnung: [56, 44] as const, zellgroesse: 96, bauwerke: 130, strassenDichte: 0.55, grundstueck: [2, 5] as const, licht: true }),
});

export function siedlungStandard(art: SiedlungArt = "dorf"): SiedlungOptionen {
  if (art !== "weiler" && art !== "dorf" && art !== "stadt") fail("option", "optionen.art", "weiler, dorf oder stadt erwartet");
  return Object.freeze({ art, ...SIEDLUNG_ART_STANDARD[art] });
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
  "Keine Türen und keine Portale. Ab Fassung 2 trägt eine Stadt eine Ringmauer als " +
    "`walls`-Geometrie, und wo eine Hauptstraße sie kreuzt, bleibt eine Lücke — das Tor ist die " +
    "Lücke, kein Portal. Ein Portal führt in eine andere Karte; ein Stadttor führt in dieselbe.",
  "Keine Gebäudetypen oder Gewerbe (Schmiede, Markt, Taverne): das wäre eine Namensvergabe ohne " +
    "Beleg. Dieser Erzeuger liefert Parzellen mit Adresse, keine Artikel (model.ts:160-166). " +
    "Der Marktplatz ist die einzige Ausnahme und auch keine: er ist ein leer gelassenes Viertel, " +
    "kein benanntes Bauwerk.",
]);

/** Ein Viertel: die Voronoizelle, ihr Punkt, und wie weit sie vom Marktplatz weg liegt. */
interface Viertel {
  readonly punkt: Punkt;
  readonly zelle: Polygon;
  readonly ferne: number;
  readonly pfad: string;
}

/** Eine Gasse zwischen zwei Vierteln — die geteilte Voronoikante, zum Band verbreitert. */
interface Gasse {
  readonly id: string;
  art: "hauptstrasse" | "gasse";
  readonly a: number;
  readonly b: number;
  readonly von: Punkt;
  readonly bis: Punkt;
  readonly band: Polygon;
}

export function erzeugeSiedlung(auftrag: SiedlungAuftrag, paket: AssetpaketV1): Siedlung {
  if (typeof auftrag?.keim !== "string" || !auftrag.keim.trim() || auftrag.keim.length > 256) fail("option", "auftrag.keim", "nichtleerer Keim mit höchstens 256 Zeichen erwartet");
  const art: SiedlungArt = auftrag.optionen?.art ?? "dorf";
  if (art !== "weiler" && art !== "dorf" && art !== "stadt") fail("option", "optionen.art", "weiler, dorf oder stadt erwartet");
  const optionen: SiedlungOptionen = { ...siedlungStandard(art), ...auftrag.optionen, art };
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
  const rahmen: Polygon = [[0, 0], [breite, 0], [breite, hoehe], [0, hoehe]];

  // -- 1. Viertel: Punkte streuen, Lloyd glätten, Voronoi schneiden ---------------------------
  // Ein gestörtes Raster statt reinem Zufall: reiner Zufall erzeugt Klumpen und Splitterzellen,
  // in denen keine Parzelle Platz hat. Zwei Runden Lloyd nehmen den Rest der Klumpen heraus und
  // lassen die Unregelmässigkeit stehen, die den gewachsenen Eindruck trägt.
  // Rund ein Dutzend Parzellen je Viertel: weniger, und der Block liest als Einzelhof; mehr,
  // und das Straßennetz wird so grob, dass die Stadt wieder aus wenigen Riesenblöcken besteht.
  const zielViertel = Math.max(4, Math.min(90, Math.round((optionen.bauwerke / 7) * (0.7 + optionen.strassenDichte * 0.7)) + 3));
  const spalten = Math.max(2, Math.round(Math.sqrt((zielViertel * breite) / hoehe)));
  const reihen = Math.max(2, Math.round(zielViertel / spalten));
  const zellBreite = breite / spalten, zellHoehe = hoehe / reihen;
  const rohPunkte: Punkt[] = [];
  for (let j = 0; j < reihen; j++) {
    for (let i = 0; i < spalten; i++) {
      rohPunkte.push([
        (i + 0.5 + r.zahl(-0.34, 0.34)) * zellBreite,
        (j + 0.5 + r.zahl(-0.34, 0.34)) * zellHoehe,
      ]);
    }
  }
  const punkte = lloyd(rohPunkte, rahmen, 2).map(qp);
  const alleZellen = voronoi(punkte, rahmen);

  // -- 2. Stadtgebiet: eine gejitterte Scheibe um die Mitte -----------------------------------
  // Der Jitter je Viertel ist der Grund, warum der Umriss nicht als Kreis liest. `stadt` füllt
  // die Karte fast aus, ein Weiler ist eine Handvoll Höfe an einer Kreuzung.
  const mitteX = breite / 2 + r.zahl(-breite * 0.06, breite * 0.06);
  const mitteY = hoehe / 2 + r.zahl(-hoehe * 0.06, hoehe * 0.06);
  const maxRadius = Math.min(breite, hoehe) / 2;
  const anteil = art === "stadt" ? 1.12 : art === "dorf" ? 1.0 : 0.85;
  const gewaehlt: number[] = [];
  const abstandZurMitte = punkte.map((p) => Math.sqrt((p[0] - mitteX) ** 2 + (p[1] - mitteY) ** 2));
  for (let i = 0; i < punkte.length; i++) {
    if (alleZellen[i]!.length < 3) continue;
    if (abstandZurMitte[i]! <= maxRadius * anteil * r.zahl(0.74, 1.12)) gewaehlt.push(i);
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
  // Der Marktplatz ist das Viertel, das der Mitte am nächsten liegt, und bleibt unbebaut.
  // Zentrum und Markt sind zwei Dinge. Das **Zentrum** ist das mittigste Viertel; von ihm aus
  // wächst der Straßenstern, und es gibt es immer. Der **Markt** ist ein leer gelassenes Viertel
  // und lohnt erst ab fünf: bei vieren wäre er ein Viertel des Ortes, und der Weiler bestünde aus
  // zwei Höfen und einer Wiese. Ein Weiler hat auch keinen Marktplatz.
  let zentrumIndex = 0;
  for (let i = 1; i < viertel.length; i++) if (viertel[i]!.ferne < viertel[zentrumIndex]!.ferne) zentrumIndex = i;
  const marktIndex = viertel.length >= 5 ? zentrumIndex : -1;

  // -- 3. Gassen: geteilte Voronoikanten. Hier entsteht das Netz mit Zyklen. -------------------
  // Zwei Viertel teilen sich genau eine Kante; sie einmal als Band zu zeichnen ergibt einen
  // planaren Graphen, dessen Maschen die Blöcke sind. Das ist der ganze Unterschied zur alten
  // Kammstruktur, in der Gassen im Nichts endeten.
  const gassenBreite = Math.max(0.55, Math.min(1.6, 0.7 + optionen.strassenDichte * 0.9));
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
    (Math.abs(a[0]) < 1e-6 && Math.abs(b[0]) < 1e-6) || (Math.abs(a[0] - breite) < 1e-6 && Math.abs(b[0] - breite) < 1e-6)
    || (Math.abs(a[1]) < 1e-6 && Math.abs(b[1]) < 1e-6) || (Math.abs(a[1] - hoehe) < 1e-6 && Math.abs(b[1] - hoehe) < 1e-6);
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

  // -- 5. Parzellen: Viertel einwärts, dann rekursiv in Sehnen schneiden ----------------------
  // Die meisten Lose liegen am Blockrand, aber **nicht alle**: ein Stück, das ringsum von
  // Schnittkanten begrenzt wird, liegt mitten im Viertel (`polygon.ts` erklärt es, und
  // `polygon.test.ts` führt so einen Fall vor). Solche Lose bekommen keine Adresse — der
  // Abstandstest weiter unten wirft sie weg. „Kein Haus ist eingemauert" ist eine Prüfung.
  interface RohBauwerk { readonly pfad: string; readonly umriss: Polygon; readonly strasseId: string; readonly ferne: number }
  const proViertel: RohBauwerk[][] = [];
  const hofFlaechen: Polygon[] = [];
  for (let vi = 0; vi < viertel.length; vi++) {
    if (vi === marktIndex) { hofFlaechen.push(viertel[vi]!.zelle); proViertel.push([]); continue; }
    const block = einwaerts(viertel[vi]!.zelle, gassenBreite / 2);
    if (block.length < 3) { proViertel.push([]); continue; }
    hofFlaechen.push(block);
    // Aussen grössere Parzellen als innen: die Dichte fällt nach aussen ab, wie in jeder Stadt,
    // die um einen Markt gewachsen ist statt am Reissbrett entstanden zu sein.
    const naehe = Math.min(1, viertel[vi]!.ferne / (maxRadius || 1));
    const seite = gMin + (gMax - gMin) * naehe;
    const zielFlaeche = Math.max(1.2, seite * seite * r.zahl(0.75, 1.3));
    const lose = teileInParzellen(block, zielFlaeche, r, 9)
      .filter((los) => {
        if (flaeche(los) < Math.max(0.8, gMin * gMin * 0.28)) return false;
        // Splitter verwerfen: ein Schnitt kann ein langes dünnes Dreieck abtrennen, und das
        // liest als Fehler, nicht als Haus.
        const [hx0, hy0, hx1, hy1] = huelle(los);
        const kurz = Math.min(hx1 - hx0, hy1 - hy0), lang = Math.max(hx1 - hx0, hy1 - hy0);
        return kurz > 0.35 && lang / kurz <= 4.2;
      });
    const meine: RohBauwerk[] = [];
    for (const los of lose) {
      // Der Hof ist der Streifen zwischen Parzelle und Haus — angehängter Garten, keine Leere.
      const haus = einwaerts(los, Math.max(0.12, Math.min(0.5, Math.sqrt(flaeche(los)) * 0.16)));
      if (haus.length < 3 || flaeche(haus) < 0.5) continue;
      const s = schwerpunkt(haus);
      let beste = -1, besterAbstand = Infinity;
      for (const gi of nachbarn[vi]!) {
        const g = gassen[gi]!;
        const d = abstandPolygonStrecke(haus, g.von, g.bis);
        if (d < besterAbstand) { besterAbstand = d; beste = gi; }
      }
      // Ein Los am äusseren Blockrand grenzt an offenes Land, nicht an eine Gasse. Es zu
      // verwerfen ist billiger als eine Adresse zu vergeben, die niemand erreichen kann.
      if (beste < 0 || besterAbstand > gassenBreite / 2 + 1) continue;
      meine.push({
        pfad: `${viertel[vi]!.pfad}.los.${q(s[0])}_${q(s[1])}`,
        umriss: haus.map(qp), strasseId: gassen[beste]!.id, ferne: viertel[vi]!.ferne,
      });
    }
    meine.sort((a, b) => a.pfad < b.pfad ? -1 : a.pfad > b.pfad ? 1 : 0);
    proViertel.push(meine);
  }
  // Reihum über die Viertel einsammeln, damit das Budget die Stadt füllt statt ein Viertel.
  const rohBauwerke: RohBauwerk[] = [];
  for (let runde = 0; rohBauwerke.length < optionen.bauwerke; runde++) {
    let genommen = false;
    for (const liste of proViertel) {
      if (runde >= liste.length) continue;
      rohBauwerke.push(liste[runde]!);
      genommen = true;
      if (rohBauwerke.length >= optionen.bauwerke) break;
    }
    if (!genommen) break;
  }
  if (!rohBauwerke.length) fail("geometrie", "bauwerke", "auf diesem Raster ließ sich kein einziges Gebäude an einer Straße platzieren");

  const bauwerke: SiedlungBauwerk[] = rohBauwerke.map((b) => ({
    id: ids.knotenId("bauwerk", b.pfad), pfad: b.pfad, umriss: b.umriss, strasse: b.strasseId,
  }));
  const mitte = (b: SiedlungBauwerk): readonly [number, number] => {
    const s = schwerpunkt(b.umriss);
    return [q(s[0] * z), q(s[1] * z)];
  };
  const strassen: SiedlungStrasse[] = gassen.map((g) => ({ id: g.id, art: g.art, umriss: g.band }));

  // -- 6. Mauer und Tore: nur eine Stadt ummauert sich ----------------------------------------
  const mauern: { id: string; kind: "wall"; points: readonly (readonly [number, number])[]; elevation: number }[] = [];
  if (art === "stadt") {
    // Ein Tor ist teuer und selten. Kandidaten sind die Enden der Hauptstraßen, die tatsächlich
    // auf der Mauer liegen; genommen werden die vier äussersten. Eine Mauer mit einer Lücke je
    // Hauptstraße ist keine Mauer, sondern ein Zaunrest — die erste Fassung sah genau so aus.
    const kanten = aussenkanten(viertel.map((v) => v.zelle));
    const aufDerMauer = new Set<string>();
    for (const k of kanten) { aufDerMauer.add(`${q(k.von[0])}:${q(k.von[1])}`); aufDerMauer.add(`${q(k.bis[0])}:${q(k.bis[1])}`); }
    const torKandidaten: Punkt[] = [];
    for (const g of gassen) {
      if (g.art !== "hauptstrasse") continue;
      for (const p of [g.von, g.bis]) if (aufDerMauer.has(`${q(p[0])}:${q(p[1])}`)) torKandidaten.push(p);
    }
    torKandidaten.sort((x, y) =>
      ((y[0] - mitteX) ** 2 + (y[1] - mitteY) ** 2) - ((x[0] - mitteX) ** 2 + (x[1] - mitteY) ** 2)
      || x[1] - y[1] || x[0] - y[0]);
    const tore: Punkt[] = [];
    for (const kandidat of torKandidaten) {
      if (tore.length >= 4) break;
      if (tore.some((t) => (t[0] - kandidat[0]) ** 2 + (t[1] - kandidat[1]) ** 2 < (gassenBreite * 4) ** 2)) continue;
      tore.push(kandidat);
    }
    const amTor = (p: Punkt) => tore.some((t) => (t[0] - p[0]) ** 2 + (t[1] - p[1]) ** 2 < (gassenBreite * 1.3) ** 2);
    for (const kante of kanten) {
      const a = kante.von, b = kante.bis;
      if (amTor([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2])) continue;
      mauern.push({
        id: ids.geometrieId("mauer", `${q(a[0])}_${q(a[1])}`, `${q(b[0])}_${q(b[1])}`),
        kind: "wall", elevation: 0,
        points: [[q(a[0] * z), q(a[1] * z)], [q(b[0] * z), q(b[1] * z)]],
      });
    }
  }

  // -- 7. Stempel: Straßenbelag, Hofboden, eine Eingangsmarke, optionale Laternen -------------
  // A settlement's kind is not only numbers: a village track is dirt, a town street is paved.
  // The pack answers a query; this generator never names an asset (`kartenwerk.ts`'s own rule).
  const werk = bestuecker(paket, r, z, ids.geometrieId);
  const strassenAsset = werk.waehle("boden", optionen.art === "stadt" ? "stein" : "erde");
  const hofAsset = werk.waehle("boden", "erde");
  const inEinem = (p: Punkt, polys: readonly Polygon[]): boolean => {
    for (const poly of polys) if (imPolygon(p, poly)) return true;
    return false;
  };
  const strassenPolys = gassen.map((g) => g.band);
  let strassenzellen = 0, hofzellen = 0;
  for (let y = 0; y < hoehe; y++) {
    for (let x = 0; x < breite; x++) {
      const p: Punkt = [x + 0.5, y + 0.5];
      if (inEinem(p, strassenPolys)) {
        strassenzellen++;
        if (strassenAsset) werk.setze(strassenAsset, x, y);
      } else if (inEinem(p, hofFlaechen)) {
        hofzellen++;
        if (hofAsset) werk.setze(hofAsset, x, y);
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
  if (optionen.licht) {
    for (const g of gassen) {
      if (g.art !== "hauptstrasse") continue;
      const asset = werk.waehle("licht", "warm");
      if (!asset) continue; // recorded in nichtBedient; not fatal to the map
      const mx = Math.max(0, Math.min(breite - 1, Math.floor((g.von[0] + g.bis[0]) / 2)));
      const my = Math.max(0, Math.min(hoehe - 1, Math.floor((g.von[1] + g.bis[1]) / 2)));
      werk.setze(asset, mx, my);
      const letzter = werk.stamps[werk.stamps.length - 1]!;
      lichter.push({
        // Auf beide Enden geschluesselt: an einer Kreuzung teilen sich mehrere Hauptstrassen
        // denselben Anfangspunkt, und eine Id, die nur den kennt, waere dort nicht eindeutig.
        id: ids.geometrieId("licht", `${q(g.von[0])}_${q(g.von[1])}`, `${q(g.bis[0])}_${q(g.bis[1])}`), position: [letzter.x, letzter.y],
        range: z * 4, intensity: 0.8, colorArgb: "ffdd8a33", shadows: true, elevation: 0,
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
        ...bauwerke.map((b) => ({ id: b.id, punkte: nachPixeln(b.umriss) })),
        ...strassen.map((s) => ({ id: s.id, punkte: nachPixeln(s.umriss) })),
      ],
      places: bauwerke.map((b) => ({ id: ids.geometrieId("platz", b.pfad), x: mitte(b)[0], y: mitte(b)[1] })),
    },
    grid: { kind: "square", size: z, origin: [0, 0] },
    elevation: 0, geometryElevation: [],
    walls: sortiereNachId(mauern), portals: [], lights: sortiereNachId(lichter),
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
