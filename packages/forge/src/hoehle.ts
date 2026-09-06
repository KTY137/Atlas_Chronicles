import { type CanonicalValue } from "@chronicle/core";
import { parseTacticalMapDocument, weltkeim, type AssetpaketV1, type TacticalLight } from "@chronicle/szene";
import {
  AUSGELASSEN_BASIS, FELS, KARTENWERK_LIMITS, baueKnoten, bestuecker, fail, idFabrik,
  rauschen, sortiereNachId, umriss, wandLaeufe,
  type GrundrissEltern, type GrundrissRaum,
} from "./kartenwerk.ts";
import type { Grundriss } from "./grundriss.ts";

/**
 * The second map kind on the same contract: a natural cavern.
 *
 * It exists for two reasons, and the second one is the engineering reason.
 *
 *  1. **A cavern plays nothing like a keep.** Rectangles and doors are a built place; a cave is
 *     chambers that flow into each other with no threshold to close.
 *  2. **It breaks an assumption the first generator was quietly resting on.** `erzeugeGrundriss`
 *     emits a `Region` per room as a four-point rectangle, because its rooms *are* rectangles. A
 *     cavern chamber is a blob, so its region has to be a traced outline. Until something in this
 *     package produced one, "the scene format carries arbitrary region polygons" was a claim about
 *     the type and not about the code.
 *
 * Two rulings shape what this deliberately does **not** do:
 *
 * - **No portals.** A UVTT portal is a door or a window (`tactical-map.ts:21-25`). A cavern has
 *   neither; emitting one for a narrow passage would put a false statement in an interchange
 *   format that four other tools read. Chambers connect through shared geometry, and the report
 *   says so instead of inventing a door.
 * - **No second level.** RB-21a R6 and §1.3 case 3 rule that vertical position is a scalar band on
 *   the node (`hoehe_von`/`hoehe_bis`/`ordinal`) and that the underdark is a **sibling**, not a
 *   child. `Knoten` has no such band yet, so this generator does not fake depth by nesting.
 *
 * Its root node is an `ort`, not a `bauwerk`: nobody built this place, and the containment model
 * must not claim otherwise.
 */

export const HOEHLE_ERZEUGER = "chronicle-hoehle";
export const HOEHLE_VERSION = "1";

export const HOEHLE_LIMITS = Object.freeze({
  ...KARTENWERK_LIMITS, kammernMin: 2, kammernMax: 32, glaettungMax: 12, mindestFlaecheMin: 4,
});

export interface HoehleOptionen {
  readonly zellen: readonly [number, number];
  readonly zellgroesse: number;
  /** Target chamber count. Chambers are a partition of the floor, not separate excavations. */
  readonly kammern: number;
  /** Initial rock probability. Below ~0.4 the cave is a room; above ~0.55 it is gravel. */
  readonly fuellung: number;
  /** Smoothing passes. Each one is the classic 4-5 majority rule. */
  readonly glaettung: number;
  readonly moeblierung: number;
  readonly licht: boolean;
  /** Floor blobs smaller than this are filled back in rather than tunnelled to. */
  readonly mindestFlaeche: number;
}

export const HOEHLE_STANDARD: HoehleOptionen = Object.freeze({
  zellen: [44, 32] as const, zellgroesse: 64, kammern: 6, fuellung: 0.45, glaettung: 4,
  moeblierung: 1, licht: true, mindestFlaeche: 12,
});

export interface HoehleAuftrag {
  readonly keim: string;
  readonly titel?: string;
  readonly optionen?: Partial<HoehleOptionen>;
  readonly eltern?: GrundrissEltern;
}

interface Thema {
  readonly schluessel: string;
  readonly boden: string;
  readonly stuecke: readonly (readonly [string, string])[];
}
const THEMEN: readonly Thema[] = Object.freeze([
  { schluessel: "kaverne", boden: "hoehle", stuecke: [["aufbau", "fels"], ["aufbau", "geroell"], ["aufbau", "fels"]] },
  { schluessel: "pilzhain", boden: "hoehle", stuecke: [["aufbau", "pilz"], ["aufbau", "feucht"], ["aufbau", "pilz"]] },
  { schluessel: "knochenlager", boden: "hoehle", stuecke: [["aufbau", "knochen"], ["licht", "lager"], ["aufbau", "geroell"]] },
  { schluessel: "tropfsteinhalle", boden: "tief", stuecke: [["aufbau", "hoehle"], ["aufbau", "fels"], ["aufbau", "fels"]] },
  { schluessel: "schlund", boden: "tief", stuecke: [["aufbau", "gefahr"], ["aufbau", "geroell"]] },
  { schluessel: "unterlauf", boden: "flach", stuecke: [["aufbau", "wasser"], ["aufbau", "wasser"], ["aufbau", "geroell"]] },
]);

const AUSGELASSEN: readonly string[] = Object.freeze([
  ...AUSGELASSEN_BASIS,
  "Keine Portale. Ein UVTT-Portal ist eine Tür oder ein Fenster; eine Engstelle zwischen zwei Kammern ist beides nicht, und eine Falschaussage in einem Austauschformat ist teurer als eine fehlende Angabe.",
  "Kein Innenloch in einer Kammerregion: `SceneDoc.Region.punkte` ist genau ein Ring. Eine Kammer, die einen Felspfeiler umschließt, verliert ihn im Umriss und behält ihn in der Wandgeometrie.",
  "Keine zweite Ebene. Ein Höhenband am Knoten existiert noch nicht (RB-21a R6), und eine tiefere Ebene wäre ein Geschwister mit Band, kein Kind — verschachtelt wird nur, was wirklich ineinander liegt.",
]);

const BODEN = 1;
/** How often the automaton may be rolled again before the request itself is judged impossible. */
const HOEHLE_VERSUCHE = 12;

export function erzeugeHoehle(auftrag: HoehleAuftrag, paket: AssetpaketV1): Grundriss {
  if (typeof auftrag?.keim !== "string" || !auftrag.keim.trim() || auftrag.keim.length > 256) fail("option", "auftrag.keim", "nichtleerer Keim mit höchstens 256 Zeichen erwartet");
  const optionen: HoehleOptionen = { ...HOEHLE_STANDARD, ...auftrag.optionen };
  const [breite, hoehe] = optionen.zellen;
  const L = HOEHLE_LIMITS;
  const ganzIn = (wert: number, min: number, max: number, pfad: string): number =>
    Number.isSafeInteger(wert) && wert >= min && wert <= max ? wert : fail("option", pfad, `Ganzzahl in ${min}..${max} erwartet`);
  ganzIn(breite, L.zellenMin, L.zellenMax, "optionen.zellen[0]");
  ganzIn(hoehe, L.zellenMin, L.zellenMax, "optionen.zellen[1]");
  ganzIn(optionen.zellgroesse, L.zellgroesseMin, L.zellgroesseMax, "optionen.zellgroesse");
  ganzIn(optionen.kammern, L.kammernMin, L.kammernMax, "optionen.kammern");
  ganzIn(optionen.glaettung, 0, L.glaettungMax, "optionen.glaettung");
  ganzIn(optionen.mindestFlaeche, L.mindestFlaecheMin, 4096, "optionen.mindestFlaeche");
  if (typeof optionen.fuellung !== "number" || !(optionen.fuellung >= 0.2 && optionen.fuellung <= 0.7)) fail("option", "optionen.fuellung", "Zahl in 0.2..0.7 erwartet");
  if (typeof optionen.moeblierung !== "number" || !(optionen.moeblierung >= 0 && optionen.moeblierung <= 1)) fail("option", "optionen.moeblierung", "Zahl in 0..1 erwartet");
  if (typeof optionen.licht !== "boolean") fail("option", "optionen.licht", "Boolean erwartet");
  if (breite * hoehe > L.zellenGesamt) fail("budget", "optionen.zellen", `höchstens ${L.zellenGesamt} Zellen`);
  if (breite * optionen.zellgroesse > L.kantePixelMax || hoehe * optionen.zellgroesse > L.kantePixelMax) fail("budget", "optionen.zellgroesse", `höchstens ${L.kantePixelMax} Pixel Kantenlänge`);
  if (!paket?.assets?.length) fail("paket", "paket", "Assetpaket mit mindestens einem Asset erwartet");

  const keim = weltkeim({
    generator: HOEHLE_ERZEUGER, version: HOEHLE_VERSION, seed: auftrag.keim,
    optionen: {
      zellen: [breite, hoehe], zellgroesse: optionen.zellgroesse, kammern: optionen.kammern,
      fuellung: optionen.fuellung, glaettung: optionen.glaettung, moeblierung: optionen.moeblierung,
      licht: optionen.licht, mindestFlaeche: optionen.mindestFlaeche,
      paket: { id: paket.id, version: paket.version, zellgroesse: paket.zellgroesse },
    } as Readonly<Record<string, CanonicalValue>>,
  });
  const r = rauschen(keim.keimHash);
  const z = optionen.zellgroesse;
  const ids = idFabrik(HOEHLE_ERZEUGER, HOEHLE_VERSION, keim.keimHash);
  const idx = (x: number, y: number) => y * breite + x;
  const drin = (x: number, y: number) => x >= 0 && y >= 0 && x < breite && y < hoehe;

  // -- cellular automaton, retried ---------------------------------------------------------------
  // On a small grid the automaton genuinely fails sometimes: a 16x14 draw can leave its largest
  // cavity at 21 cells. That is a property of the process, not of the request, so the generator
  // rolls again from the same stream rather than rejecting options that are perfectly reasonable.
  // Deterministic, because the retry policy is fixed and the stream is seeded by the `keimHash`.
  const versucheHoehle = (): { gitter: Uint8Array; bodenFelder: number[] } | null => {
    let gitter = new Uint8Array(breite * hoehe);
    for (let y = 0; y < hoehe; y++) for (let x = 0; x < breite; x++) {
      // The border is always rock: a cavern that opens onto the canvas edge has no wall there,
      // and the map would leak into nothing.
      gitter[idx(x, y)] = x === 0 || y === 0 || x === breite - 1 || y === hoehe - 1 || r.chance(optionen.fuellung) ? FELS : BODEN;
    }
    // The 3x3 block **includes the cell itself**, and that is not a detail. Counting only the 8
    // neighbours makes rock collapse instead of smoothing: at 45 % fill a cell has 3.6 rock
    // neighbours on average, so P(>=5 of 8) is about 0.26 and each pass roughly halves the rock —
    // after four passes the "cavern" is one open hall with islands, which is exactly what the
    // first run produced. Over 9 cells the same threshold sits near the fill fraction, and the
    // rule becomes a smoother instead of an eraser.
    for (let pass = 0; pass < optionen.glaettung; pass++) {
      const naechstes = new Uint8Array(breite * hoehe);
      for (let y = 0; y < hoehe; y++) for (let x = 0; x < breite; x++) {
        let fels = 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          if (!drin(x + dx, y + dy) || gitter[idx(x + dx, y + dy)] === FELS) fels++;
        }
        const rand = x === 0 || y === 0 || x === breite - 1 || y === hoehe - 1;
        naechstes[idx(x, y)] = rand || fels >= 5 ? FELS : BODEN;
      }
      gitter = naechstes;
    }

    // Keep the largest blob and fill the crumbs. A cavern is one connected system; two systems
    // that never meet are two maps, and tunnelling between them would be building, not erosion.
    const marke = new Int32Array(breite * hoehe).fill(-1);
    const blobs: number[][] = [];
    for (let feld = 0; feld < gitter.length; feld++) {
      if (gitter[feld] === FELS || (marke[feld] ?? -1) >= 0) continue;
      const nummer = blobs.length, zellen: number[] = [feld];
      marke[feld] = nummer;
      for (let head = 0; head < zellen.length; head++) {
        const stelle = zellen[head]!, cx = stelle % breite, cy = (stelle - (stelle % breite)) / breite;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
          const nx = cx + dx, ny = cy + dy;
          if (!drin(nx, ny) || gitter[idx(nx, ny)] === FELS || (marke[idx(nx, ny)] ?? -1) >= 0) continue;
          marke[idx(nx, ny)] = nummer; zellen.push(idx(nx, ny));
        }
      }
      blobs.push(zellen);
    }
    if (!blobs.length) return null;
    let groesster = 0;
    blobs.forEach((blob, i) => { if (blob.length > blobs[groesster]!.length) groesster = i; });
    for (const [i, blob] of blobs.entries()) if (i !== groesster) for (const feld of blob) gitter[feld] = FELS;
    const bodenFelder = blobs[groesster]!;
    // Two chambers are the floor of the contract; below that this is not a cavern system.
    return bodenFelder.length < optionen.mindestFlaeche * L.kammernMin ? null : { gitter, bodenFelder };
  };

  let versuche = 0;
  let ergebnis: { gitter: Uint8Array; bodenFelder: number[] } | null = null;
  while (versuche < HOEHLE_VERSUCHE && !ergebnis) { ergebnis = versucheHoehle(); versuche++; }
  const { gitter, bodenFelder } = ergebnis ?? fail("geometrie", "hoehle",
    `nach ${HOEHLE_VERSUCHE} Versuchen trug kein Hohlraum ${L.kammernMin} Kammern von je ${optionen.mindestFlaeche} Zellen; das Raster ${breite}x${hoehe} ist bei Füllung ${optionen.fuellung} zu klein`);

  // The chamber target is a *wish*, capped by what the cavity actually supports. Refusing outright
  // would be inconsistent with the sampling below, which already stops early when the cave runs
  // out of room — one function must not hold two policies for one situation. The requested value
  // stays in the `Weltkeim`; the achieved value is in the report.
  const zielKammern = Math.max(L.kammernMin, Math.min(optionen.kammern, Math.floor(bodenFelder.length / optionen.mindestFlaeche)));

  // -- chambers: farthest-point seeds, then a multi-source BFS partition ------------------------
  const bfs = (quellen: readonly number[]): { abstand: Int32Array; naechste: Int32Array } => {
    const abstand = new Int32Array(breite * hoehe).fill(-1);
    const naechste = new Int32Array(breite * hoehe).fill(-1);
    const schlange = [...quellen];
    quellen.forEach((feld, i) => { abstand[feld] = 0; naechste[feld] = i; });
    for (let head = 0; head < schlange.length; head++) {
      const stelle = schlange[head]!, cx = stelle % breite, cy = (stelle - (stelle % breite)) / breite;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const nx = cx + dx, ny = cy + dy;
        if (!drin(nx, ny) || gitter[idx(nx, ny)] === FELS || (abstand[idx(nx, ny)] ?? -1) >= 0) continue;
        abstand[idx(nx, ny)] = abstand[stelle]! + 1; naechste[idx(nx, ny)] = naechste[stelle]!; schlange.push(idx(nx, ny));
      }
    }
    return { abstand, naechste };
  };
  // The first seed is the floor cell furthest from an arbitrary but stable start, so the entrance
  // ends up at one end of the cave rather than wherever the scan happened to begin.
  const anker = bodenFelder[0]!;
  const ersteWelle = bfs([anker]);
  let ersterKeim = anker;
  for (const feld of bodenFelder) if ((ersteWelle.abstand[feld] ?? -1) > (ersteWelle.abstand[ersterKeim] ?? -1)) ersterKeim = feld;
  const keime = [ersterKeim];
  while (keime.length < zielKammern) {
    const welle = bfs(keime);
    let weitester = -1, weite = -1;
    for (const feld of bodenFelder) if ((welle.abstand[feld] ?? -1) > weite) { weite = welle.abstand[feld]!; weitester = feld; }
    if (weitester < 0 || weite <= 0) break;
    keime.push(weitester);
  }
  if (keime.length < L.kammernMin) fail("geometrie", "kammern", "der Hohlraum trägt keine zwei Kammern");
  const verteilung = bfs(keime);
  for (const feld of bodenFelder) {
    if (verteilung.naechste[feld]! < 0) fail("geometrie", "kammern", "eine Bodenzelle blieb ohne Kammer — der Hohlraum ist nicht zusammenhängend");
  }

  const kammerZellen: [number, number][][] = keime.map(() => []);
  const kammerSchluessel: Set<string>[] = keime.map(() => new Set<string>());
  for (const feld of bodenFelder) {
    const k = verteilung.naechste[feld]!, x = feld % breite, y = (feld - (feld % breite)) / breite;
    kammerZellen[k]!.push([x, y]);
    kammerSchluessel[k]!.add(`${x}:${y}`);
  }

  const themen: Record<string, number> = {};
  const rohKammern = keime.map((keimFeld, i) => {
    const zellen = kammerZellen[i]!;
    let x0 = breite, y0 = hoehe, x1 = 0, y1 = 0;
    for (const [x, y] of zellen) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
    const thema = r.waehle(THEMEN) ?? THEMEN[0]!;
    themen[thema.schluessel] = (themen[thema.schluessel] ?? 0) + 1;
    // The path is the seed's coordinates, which are a stable function of the option vector and
    // never an array index (invariant I8).
    return { pfad: `kammer.${keimFeld % breite}_${(keimFeld - (keimFeld % breite)) / breite}`, thema, zellen, schluessel: kammerSchluessel[i]!, kasten: [x0, y0, x1 - x0 + 1, y1 - y0 + 1] as const, keimFeld };
  });

  // Entrance is the first seed; the deep chamber is the one furthest from it in walkable steps.
  const vomEingang = bfs([keime[0]!]);
  let tiefste = 0, tiefsteWeite = -1;
  rohKammern.forEach((kammer, i) => {
    const d = vomEingang.abstand[kammer.keimFeld] ?? -1;
    if (d > tiefsteWeite) { tiefsteWeite = d; tiefste = i; }
  });

  // -- geometry --------------------------------------------------------------------------------
  const waende = wandLaeufe((x, y) => gitter[idx(x, y)] !== FELS, breite, hoehe, z, ids.geometrieId);

  const werk = bestuecker(paket, r, z, ids.geometrieId);
  const nichtPlatziert: string[] = [];
  const boeden = rohKammern.map((kammer) => werk.waehle("boden", kammer.thema.boden));
  rohKammern.forEach((kammer, i) => {
    const asset = boeden[i];
    if (!asset) return;
    for (const [x, y] of kammer.zellen) werk.setze(asset, x, y);
  });

  const setzeMarkiert = (kammer: (typeof rohKammern)[number], art: string, schlagwort: string) => {
    const asset = werk.waehle(art, schlagwort);
    if (!asset) return;
    if (!werk.platziere(asset, kammer.zellen)) nichtPlatziert.push(`${kammer.pfad}:${art}/${schlagwort}`);
  };
  setzeMarkiert(rohKammern[0]!, "marke", "eingang");
  if (tiefste !== 0) setzeMarkiert(rohKammern[tiefste]!, "aufbau", "tiefe");

  const lichter: TacticalLight[] = [];
  rohKammern.forEach((kammer, i) => {
    // A cavern chamber is far larger than a built room, so its density cap is higher.
    const durchgaenge = Math.min(9, Math.max(1, Math.round(kammer.zellen.length / 12)));
    for (const [art, schlagwort] of Array.from({ length: durchgaenge }, () => kammer.thema.stuecke).flat()) {
      if (!r.chance(optionen.moeblierung)) continue;
      const asset = werk.waehle(art, schlagwort);
      if (!asset) continue;
      if (!werk.platziere(asset, kammer.zellen)) nichtPlatziert.push(`${kammer.pfad}:${art}/${schlagwort}`);
      else if (optionen.licht && art === "licht") {
        const letzter = werk.stamps[werk.stamps.length - 1]!;
        lichter.push({
          id: ids.geometrieId("licht", `${i}`, `${letzter.x}:${letzter.y}`), position: [letzter.x, letzter.y],
          range: Math.max(kammer.kasten[2], kammer.kasten[3]) * z * 0.8, intensity: 0.85,
          colorArgb: "ffdd8a33", shadows: true, elevation: 0,
        });
      }
    }
  });

  const raeume: GrundrissRaum[] = rohKammern.map((kammer, i) => ({
    id: ids.knotenId("raum", kammer.pfad),
    pfad: kammer.pfad,
    thema: kammer.thema.schluessel,
    zellen: kammer.kasten,
    // A cavern has no doors, and `tueren` stays empty rather than being filled with something else.
    tueren: [],
    rolle: i === 0 ? "eingang" : i === tiefste ? "tiefe" : "kammer",
  }));
  const mitte = (raum: GrundrissRaum): readonly [number, number] =>
    [(raum.zellen[0] + raum.zellen[2] / 2) * z, (raum.zellen[1] + raum.zellen[3] / 2) * z];

  const karte = parseTacticalMapDocument({
    schemaVersion: 1, kind: "tactical-map", coordinates: "image-pixels",
    frame: { ursprung: [0, 0], einheitenProPixel: 1 / z, ordnung: "xy", hoch: "unten" },
    geometry: {
      v: 3, size: [breite * z, hoehe * z],
      stamps: sortiereNachId(werk.stamps),
      // The traced outline, not a bounding box. This is the assertion the rectangles could not make.
      regions: rohKammern.map((kammer, i) => ({
        id: raeume[i]!.id,
        punkte: umriss(kammer.schluessel).map(([x, y]) => [x * z, y * z] as const),
      })),
      places: rohKammern.map((kammer, i) => ({
        id: ids.geometrieId("ort", kammer.pfad),
        x: (kammer.keimFeld % breite + 0.5) * z,
        y: ((kammer.keimFeld - (kammer.keimFeld % breite)) / breite + 0.5) * z,
      })),
    },
    grid: { kind: "square", size: z, origin: [0, 0] },
    elevation: 0, geometryElevation: [],
    walls: sortiereNachId(waende), portals: [], lights: sortiereNachId(lichter),
    environment: { bakedLighting: false, ambientLightArgb: "ff14120f" },
    background: null,
  });

  const wurzelId = ids.knotenId("hoehle");
  const knoten = baueKnoten({
    erzeuger: HOEHLE_ERZEUGER, version: HOEHLE_VERSION, keim, wurzelId,
    // `ort`, not `bauwerk`: nobody built this. The containment model must not say otherwise.
    wurzelArt: "ort", titel: auftrag.titel ?? null, rahmen: karte.frame,
    eltern: auftrag.eltern, raeume, mitte, ids,
  });

  return Object.freeze({
    art: "hoehle", erzeuger: HOEHLE_ERZEUGER, version: HOEHLE_VERSION, keim, wurzelId, karte,
    knoten: Object.freeze(knoten), raeume: Object.freeze(raeume),
    bericht: Object.freeze({
      raeume: raeume.length, gangzellen: 0, bodenzellen: bodenFelder.length, tueren: 0,
      waende: waende.length, lichter: lichter.length, stamps: werk.stamps.length,
      stampsNachArt: Object.freeze({ ...werk.nachArt }), themen: Object.freeze({ ...themen }),
      paket: Object.freeze({ id: paket.id, version: paket.version, assets: paket.assets.length }),
      nichtBedient: Object.freeze([...werk.nichtBedient].sort()),
      nichtPlatziert: Object.freeze(nichtPlatziert.slice().sort()),
      ausgelassen: AUSGELASSEN,
    }),
  });
}
