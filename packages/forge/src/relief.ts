// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { RELIEF_LEVELS, type CartographyReliefV1, CARTOGRAPHY_STANDORTE, type CartographyStandort } from "@chronicle/szene";
import { doppelflaeche, flaeche, qp, schnittKonvex, type Polygon, type Punkt } from "./polygon.ts";

/**
 * **Das Land unter der Siedlung.**
 *
 * Bis Fassung 6 setzte der Siedlungsgenerator für jeden Standort handgelegte Formen: ein See
 * war eine Ellipse, ein Gebirge drei feste Dreiecke, die Küste eine gewellte Gerade. Das war
 * eine Kulisse, keine Landschaft — nichts floss bergab, weil es kein Bergab gab. Dieses Modul
 * ersetzt die Kulisse durch ein **Höhenfeld**: aus dem Keim entsteht deterministisches Rauschen,
 * der Standort formt es (Massiv, Becken, Gefälle ins Meer, radialer Abfall), und alles
 * Weitere wird **abgeleitet** statt gezeichnet — Wasser liegt unter dem Meeresspiegel, Fels
 * über der Felsschwelle, Sand am Ufer, Flüsse folgen dem steilsten Abstieg, Wald wächst, wo es
 * feucht ist.
 *
 * Drei Zusagen, die der Rest des Generators braucht:
 *
 *  1. **Jede Fläche ist konvex.** Der Siedlungsbau schneidet Lose, Gassen und Mauern mit
 *     Halbebenen-Clipping gegen seine Hindernisse; ein konkaves Hindernis würde dort still
 *     falsche Ergebnisse liefern. Ein Zellquadrat, von einer Isolinie geschnitten, ist konvex —
 *     das ist der Grund, warum die Konturen je Zelle entstehen (Marching Squares) und nicht
 *     als ein großes Polygon.
 *  2. **Volle Zellen werden verschmolzen.** Ein Meer aus tausend Einzelquadraten würde jede
 *     Hindernisprüfung tausendfach kosten und das Flächenbudget der Kartografie sprengen.
 *     Innere Zellen werden zeilen- und dann spaltenweise zu Rechtecken zusammengefasst; nur
 *     Uferzellen bleiben klein. Die Nahtlinien sieht niemand: die Kantenschau des Renderers
 *     hebt geteilte Kanten auf (`regionBanks`).
 *  3. **Das Höhenfeld ist dieselbe Zahl, die gespeichert wird.** Alle Ableitungen laufen auf
 *     den ganzzahligen Stufen 0..255, die in `cartography.relief` landen — nicht auf einer
 *     Gleitkomma-Vorstufe. Was der Editor später mit dem Höhenwerkzeug sieht, ist exakt das,
 *     woraus die Flächen entstanden sind.
 */

export const RELIEF_VERSION = "1";
/** Meeresspiegel in Höhenstufen; die Fels- und Schneeschwellen liegen in `RELIEF_LEVELS` darüber. */
export const MEERESSPIEGEL = 77;
export const RELIEF_STANDORTE = CARTOGRAPHY_STANDORTE;
export type ReliefStandort = CartographyStandort;

export interface ReliefAuftrag {
  readonly breite: number;
  readonly hoehe: number;
  readonly standort: ReliefStandort;
  readonly keimHash: string;
  /** 0..1: wie stark sich das Land hebt und senkt. */
  readonly relief: number;
  /** 0..1: wie viel des offenen Landes Wald trägt. */
  readonly bewaldung: number;
  /** Ortskern als Ellipse in Zellen; dort bleibt das Land baubar flach. */
  readonly kern: { readonly x: number; readonly y: number; readonly rx: number; readonly ry: number };
  /** Achse des garantierten Flusses in Zellen, nur beim Standort `fluss`. */
  readonly flussAchse?: readonly Punkt[];
  readonly flussBreite?: number;
}
export interface FlussStueck { readonly polygon: Polygon; readonly von: Punkt; readonly bis: Punkt }
export interface Landschaft {
  readonly relief: CartographyReliefV1;
  /** Stehendes Wasser: See, Meer oder Moortümpel. Leer, wo der Standort keines hat. */
  readonly wasser: readonly Polygon[];
  readonly wasserMaterial: "lake" | "sea";
  /** Flussbänder, jedes Stück mit seiner Laufrichtung. Straßen dürfen sie mit Brücken queren. */
  readonly fluesse: readonly FlussStueck[];
  readonly fels: readonly Polygon[];
  readonly strand: readonly Polygon[];
  readonly sumpf: readonly Polygon[];
  readonly wald: readonly Polygon[];
  /** Feuchte 0..1 an einer Stelle in Zellen — für die Entscheidung Wald oder Flur je Viertel. */
  readonly feuchte: (x: number, y: number) => number;
  /** Ab dieser Feuchte trägt offenes Land Wald. */
  readonly waldSchwelle: number;
  /** Höhe in Stufen an einer Stelle in Zellen, bilinear. */
  readonly hoehe: (x: number, y: number) => number;
}

// ---------------------------------------------------------------------------------------------
// Rauschen: gehasht aus dem Keim, unabhängig von jeder Iterationsreihenfolge
// ---------------------------------------------------------------------------------------------
function mische(seed: number, x: number, y: number, salz: number): number {
  let h = (seed ^ Math.imul(salz + 1, 0x9e3779b1)) >>> 0;
  h = Math.imul(h ^ Math.imul(x | 0, 0x85ebca77) ^ Math.imul(y | 0, 0xc2b2ae35), 0x27d4eb2f) >>> 0;
  h = Math.imul(h ^ h >>> 15, 0x7feb352d); h = Math.imul(h ^ h >>> 13, 0x846ca68b);
  return ((h ^ h >>> 16) >>> 0) / 4294967296;
}
const glatt = (t: number): number => t * t * (3 - 2 * t);
function wertRauschen(seed: number, x: number, y: number, salz: number): number {
  const x0 = Math.floor(x), y0 = Math.floor(y), fx = glatt(x - x0), fy = glatt(y - y0);
  const a = mische(seed, x0, y0, salz), b = mische(seed, x0 + 1, y0, salz), c = mische(seed, x0, y0 + 1, salz), d = mische(seed, x0 + 1, y0 + 1, salz);
  return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy;
}
/** Fraktales Rauschen in 0..1, fünf Oktaven; um 0,5 zentriert mit Streuung etwa 0,15. */
function fbm(seed: number, x: number, y: number, salz: number, oktaven = 5): number {
  let summe = 0, amplitude = 1, gesamt = 0, frequenz = 1;
  for (let o = 0; o < oktaven; o++) {
    summe += wertRauschen(seed, x * frequenz + o * 17.31, y * frequenz - o * 11.7, salz + o) * amplitude;
    gesamt += amplitude; amplitude *= .5; frequenz *= 2;
  }
  return summe / gesamt;
}
/** Kammrauschen: scharfe Grate statt weicher Hügel, für Gebirgszüge. */
function kamm(seed: number, x: number, y: number, salz: number): number {
  let summe = 0, amplitude = 1, gesamt = 0, frequenz = 1;
  for (let o = 0; o < 4; o++) {
    const n = 1 - Math.abs(2 * wertRauschen(seed, x * frequenz + o * 7.9, y * frequenz + o * 13.1, salz + o) - 1);
    summe += n * n * amplitude; gesamt += amplitude; amplitude *= .55; frequenz *= 2.1;
  }
  return summe / gesamt;
}
const klemme = (v: number, lo = 0, hi = 1): number => Math.max(lo, Math.min(hi, v));

// ---------------------------------------------------------------------------------------------
// Konturstücke je Zelle
// ---------------------------------------------------------------------------------------------
interface Feld { readonly columns: number; readonly rows: number; readonly werte: ArrayLike<number> }
const wert = (feld: Feld, i: number, j: number): number => feld.werte[j * feld.columns + i]!;

/** Konvexe Stücke der Zelle (x, y), in denen `v ≥ t` (bzw. `v < t`) gilt, Isolinie linear
 * interpoliert. Ein Sattel liefert zwei getrennte Dreiecke, sonst genau ein Polygon. */
function marching(ecken: readonly [number, number, number, number], t: number, drinnen: (v: number) => boolean, x: number, y: number): Polygon[] {
  const punkte: readonly Punkt[] = [[x, y], [x + 1, y], [x + 1, y + 1], [x, y + 1]];
  const drin = ecken.map(drinnen);
  const anzahl = drin.filter(Boolean).length;
  if (!anzahl) return [];
  if (anzahl === 4) return [punkte];
  const kreuzung = (k: number, l: number): Punkt => {
    const vp = ecken[k]!, vq = ecken[l]!, s = vp === vq ? .5 : klemme((t - vp) / (vq - vp));
    return [punkte[k]![0] + (punkte[l]![0] - punkte[k]![0]) * s, punkte[k]![1] + (punkte[l]![1] - punkte[k]![1]) * s];
  };
  const saeubere = (poly: Punkt[]): Polygon[] => {
    const clean = poly.filter((p, i) => !i || Math.abs(p[0] - poly[i - 1]![0]) > 1e-9 || Math.abs(p[1] - poly[i - 1]![1]) > 1e-9);
    if (clean.length > 1 && Math.abs(clean[0]![0] - clean.at(-1)![0]) < 1e-9 && Math.abs(clean[0]![1] - clean.at(-1)![1]) < 1e-9) clean.pop();
    return clean.length >= 3 && flaeche(clean) > 1e-6 ? [clean] : [];
  };
  if (anzahl === 2 && drin[0] === drin[2]) {
    // Sattel: zwei gegenüberliegende Ecken drinnen. Zwei Dreiecke, jedes für sich konvex.
    return drin[0]
      ? [...saeubere([punkte[0]!, kreuzung(0, 1), kreuzung(3, 0)]), ...saeubere([punkte[2]!, kreuzung(2, 3), kreuzung(1, 2)])]
      : [...saeubere([punkte[1]!, kreuzung(1, 2), kreuzung(0, 1)]), ...saeubere([punkte[3]!, kreuzung(3, 0), kreuzung(2, 3)])];
  }
  const poly: Punkt[] = [];
  for (let k = 0; k < 4; k++) {
    const l = (k + 1) % 4;
    if (drin[k]) poly.push(punkte[k]!);
    if (drin[k] !== drin[l]) poly.push(kreuzung(k, l));
  }
  return saeubere(poly);
}

/** Alle Stücke des Feldes mit `lo ≤ v < hi`, volle Zellen zu Rechtecken verschmolzen. Die
 * Isolinien liegen exakt bei `lo` und `hi`, sodass benachbarte Bänder (Wasser | Strand | Land)
 * lückenlos aneinanderstoßen. `zusatz` schneidet jedes Stück zusätzlich mit einem zweiten
 * Kriterium derselben Zelle, etwa Wald nur auf feuchtem Land. */
function stuecke(feld: Feld, lo: number, hi: number, zusatz?: (x: number, y: number) => Polygon[] | null): Polygon[] {
  const spalten = feld.columns - 1, zeilen = feld.rows - 1, voll: boolean[][] = [], teile: Polygon[] = [];
  for (let y = 0; y < zeilen; y++) {
    const zeile: boolean[] = []; voll.push(zeile);
    for (let x = 0; x < spalten; x++) {
      const ecken: [number, number, number, number] = [wert(feld, x, y), wert(feld, x + 1, y), wert(feld, x + 1, y + 1), wert(feld, x, y + 1)];
      const untere = lo === -Infinity ? null : marching(ecken, lo, v => v >= lo, x, y);
      const obere = hi === Infinity ? null : marching(ecken, hi, v => v < hi, x, y);
      let zelle: Polygon[] = untere === null ? obere ?? [[[x, y], [x + 1, y], [x + 1, y + 1], [x, y + 1]]] : obere === null ? untere : untere.flatMap(a => obere.map(b => schnittKonvex(a, b))).filter(p => p.length >= 3 && flaeche(p) > 1e-6);
      let ganz = zelle.length === 1 && zelle[0]!.length === 4 && flaeche(zelle[0]!) > .999999;
      if (zusatz) {
        const extra = zusatz(x, y);
        if (extra === null) { zeile.push(false); continue; }
        zelle = zelle.flatMap(a => extra.map(b => schnittKonvex(a, b))).filter(p => p.length >= 3 && flaeche(p) > 1e-6);
        ganz = ganz && zelle.length === 1 && zelle[0]!.length === 4 && flaeche(zelle[0]!) > .999999;
      }
      zeile.push(ganz);
      if (!ganz) teile.push(...zelle);
    }
  }
  // Volle Zellen: erst Läufe je Zeile, dann gleiche Läufe übereinander zu einem Rechteck.
  const rechtecke: { x0: number; x1: number; y0: number; y1: number }[] = [];
  let vorige = new Map<string, { x0: number; x1: number; y0: number; y1: number }>();
  for (let y = 0; y < zeilen; y++) {
    const aktuelle = new Map<string, { x0: number; x1: number; y0: number; y1: number }>();
    for (let x = 0; x < spalten; x++) {
      if (!voll[y]![x]) continue;
      const start = x; while (x + 1 < spalten && voll[y]![x + 1]) x++;
      const schluessel = `${start}:${x}`, oben = vorige.get(schluessel);
      if (oben && oben.y1 === y) { oben.y1 = y + 1; aktuelle.set(schluessel, oben); }
      else { const neu = { x0: start, x1: x + 1, y0: y, y1: y + 1 }; rechtecke.push(neu); aktuelle.set(schluessel, neu); }
    }
    vorige = aktuelle;
  }
  return [...rechtecke.map(r => [[r.x0, r.y0], [r.x1, r.y0], [r.x1, r.y1], [r.x0, r.y1]] as Polygon), ...teile.map(p => p.map(qp))];
}

// ---------------------------------------------------------------------------------------------
// Hydrologie: Senken füllen, steilster Abstieg, Abfluss sammeln, Läufe verfolgen
// ---------------------------------------------------------------------------------------------
const NACHBARN: readonly (readonly [number, number, number])[] = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, Math.SQRT2], [-1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, -1, Math.SQRT2]];
function hydrologie(feld: Feld, ausguss: (index: number) => boolean) {
  const { columns, rows } = feld, n = columns * rows, gefuellt = new Float64Array(n), besucht = new Uint8Array(n);
  // Kleiner binärer Haufen nach gefüllter Höhe, Index als Zweitschlüssel: deterministisch.
  const haufen: number[] = [];
  const kleiner = (a: number, b: number) => gefuellt[a]! < gefuellt[b]! || gefuellt[a] === gefuellt[b] && a < b;
  const rein = (i: number) => { haufen.push(i); let k = haufen.length - 1; while (k > 0) { const e = (k - 1) >> 1; if (!kleiner(haufen[k]!, haufen[e]!)) break; [haufen[k], haufen[e]] = [haufen[e]!, haufen[k]!]; k = e; } };
  const raus = (): number => { const top = haufen[0]!, last = haufen.pop()!; if (haufen.length) { haufen[0] = last; let k = 0; for (;;) { const l = 2 * k + 1, r = l + 1; let m = k; if (l < haufen.length && kleiner(haufen[l]!, haufen[m]!)) m = l; if (r < haufen.length && kleiner(haufen[r]!, haufen[m]!)) m = r; if (m === k) break; [haufen[k], haufen[m]] = [haufen[m]!, haufen[k]!]; k = m; } } return top; };
  for (let i = 0; i < n; i++) { gefuellt[i] = feld.werte[i]!; const x = i % columns, y = (i / columns) | 0; if (ausguss(i) || !x || !y || x === columns - 1 || y === rows - 1) { besucht[i] = 1; rein(i); } }
  while (haufen.length) {
    const c = raus(), cx = c % columns, cy = (c / columns) | 0;
    for (const [dx, dy] of NACHBARN) {
      const x = cx + dx, y = cy + dy; if (x < 0 || y < 0 || x >= columns || y >= rows) continue;
      const i = y * columns + x; if (besucht[i]) continue;
      besucht[i] = 1; gefuellt[i] = Math.max(feld.werte[i]!, gefuellt[c]! + .01); rein(i);
    }
  }
  const ziel = new Int32Array(n).fill(-1);
  for (let i = 0; i < n; i++) {
    if (ausguss(i)) continue;
    const cx = i % columns, cy = (i / columns) | 0; let beste = -1, gefaelle = 0;
    for (const [dx, dy, d] of NACHBARN) {
      const x = cx + dx, y = cy + dy; if (x < 0 || y < 0 || x >= columns || y >= rows) continue;
      const j = y * columns + x, s = (gefuellt[i]! - gefuellt[j]!) / d;
      if (s > gefaelle || s === gefaelle && beste >= 0 && s > 0 && j < beste) { gefaelle = s; beste = j; }
    }
    ziel[i] = beste;
  }
  const reihenfolge = Array.from({ length: n }, (_, i) => i).sort((a, b) => gefuellt[b]! - gefuellt[a]! || a - b);
  const abfluss = new Float64Array(n).fill(1);
  for (const i of reihenfolge) if (ziel[i]! >= 0) abfluss[ziel[i]!]! += abfluss[i]!;
  return { ziel, abfluss, gefuellt };
}

function chaikin(punkte: readonly Punkt[]): Punkt[] {
  if (punkte.length < 3) return [...punkte];
  const raus: Punkt[] = [punkte[0]!];
  for (let i = 0; i < punkte.length - 1; i++) {
    const a = punkte[i]!, b = punkte[i + 1]!;
    raus.push([a[0] * .75 + b[0] * .25, a[1] * .75 + b[1] * .25], [a[0] * .25 + b[0] * .75, a[1] * .25 + b[1] * .75]);
  }
  raus.push(punkte.at(-1)!);
  return raus;
}
const konvex = (poly: Polygon): boolean => {
  let sign = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]!, b = poly[(i + 1) % poly.length]!, c = poly[(i + 2) % poly.length]!;
    const kreuz = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]);
    if (Math.abs(kreuz) < 1e-12) continue;
    if (!sign) sign = Math.sign(kreuz); else if (Math.sign(kreuz) !== sign) return false;
  }
  return true;
};
/** Ein Flussband aus einer Mittellinie und Halbbreiten je Punkt: konvexe Vierecke je Abschnitt,
 * auf den Rahmen beschnitten. Ein Viereck, das an einer engen Kurve umkippt, wird in zwei
 * Dreiecke zerlegt statt als Schleife durchgereicht. */
export function flussBand(mitte: readonly Punkt[], halbbreite: readonly number[], rahmen: Polygon): FlussStueck[] {
  const ufer = mitte.map((p, i) => {
    const a = mitte[Math.max(0, i - 1)]!, b = mitte[Math.min(mitte.length - 1, i + 1)]!, dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
    return { left: [p[0] - dy / l * halbbreite[i]!, p[1] + dx / l * halbbreite[i]!] as Punkt, right: [p[0] + dy / l * halbbreite[i]!, p[1] - dx / l * halbbreite[i]!] as Punkt };
  });
  const result: FlussStueck[] = [];
  for (let i = 0; i + 1 < mitte.length; i++) {
    const quad: Polygon = [ufer[i]!.left, ufer[i]!.right, ufer[i + 1]!.right, ufer[i + 1]!.left];
    const teile = konvex(quad) ? [quad] : [[quad[0]!, quad[1]!, quad[2]!], [quad[0]!, quad[2]!, quad[3]!]];
    for (const teil of teile) {
      const geschnitten = schnittKonvex(Math.sign(doppelflaeche(teil)) === Math.sign(doppelflaeche(rahmen)) ? teil : [...teil].reverse(), rahmen);
      if (geschnitten.length >= 3 && flaeche(geschnitten) > 1e-5) result.push({ polygon: geschnitten, von: mitte[i]!, bis: mitte[i + 1]! });
    }
  }
  return result;
}

function abstandZurLinie(p: Punkt, linie: readonly Punkt[]): { abstand: number; anteil: number } {
  let beste = Infinity, anteil = 0, laenge = 0;
  const laengen = linie.map((a, i) => i ? Math.hypot(a[0] - linie[i - 1]![0], a[1] - linie[i - 1]![1]) : 0);
  const gesamt = laengen.reduce((s, l) => s + l, 0) || 1;
  for (let i = 0; i + 1 < linie.length; i++) {
    const a = linie[i]!, b = linie[i + 1]!, dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy || 1;
    const t = klemme(((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2), d = Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
    if (d < beste) { beste = d; anteil = (laenge + t * laengen[i + 1]!) / gesamt; }
    laenge += laengen[i + 1]!;
  }
  return { abstand: beste, anteil };
}

// ---------------------------------------------------------------------------------------------
// Die Landschaft
// ---------------------------------------------------------------------------------------------
export function erzeugeLandschaft(auftrag: ReliefAuftrag): Landschaft {
  const { breite, hoehe, standort, kern } = auftrag;
  const columns = breite + 1, rows = hoehe + 1, n = columns * rows;
  const seed = Number.parseInt(auftrag.keimHash.slice(0, 8), 16) >>> 0, seed2 = Number.parseInt(auftrag.keimHash.slice(8, 16), 16) >>> 0;
  const param = (k: number) => mische(seed2, k, 0, 99);
  const A = .5 + klemme(auftrag.relief), sea = MEERESSPIEGEL / 255, land = (MEERESSPIEGEL + RELIEF_LEVELS.flatLand) / 255;
  const welle = Math.max(6, Math.min(breite, hoehe) / 3);
  const kernNaehe = (x: number, y: number) => glatt(klemme(1 - Math.hypot((x - kern.x) / kern.rx, (y - kern.y) / kern.ry)));
  const seite = Math.floor(param(1) * 4); // 0 Nord, 1 Ost, 2 Süd, 3 West
  const seeMitte: Punkt = [breite * (.64 + param(2) * .2), hoehe * (.24 + param(3) * .22)];
  const tal = auftrag.flussAchse && auftrag.flussAchse.length >= 2 ? auftrag.flussAchse : null;
  const talBreite = Math.max(3, Math.min(breite, hoehe) * .16);
  const werte = new Float64Array(n);
  for (let j = 0; j < rows; j++) for (let i = 0; i < columns; i++) {
    const u = i / breite, v = j / hoehe;
    const roh = fbm(seed, i / welle, j / welle, 1), warp = fbm(seed, i / welle * .7 + 31, j / welle * .7 - 17, 2) - .5;
    const nc = (roh - .5) * (1 - .8 * kernNaehe(i, j));
    let h = land;
    if (standort === "ebene") h += nc * .10 * A;
    else if (standort === "wald") h += nc * .12 * A;
    else if (standort === "huegel") h += nc * .06 * A + Math.max(0, fbm(seed, i / (welle * 1.5) + 7, j / (welle * 1.5) + 3, 3) - .38) * .6 * A * (1 - .7 * kernNaehe(i, j));
    else if (standort === "gebirge") {
      const d = (seite === 0 ? v : seite === 1 ? 1 - u : seite === 2 ? 1 - v : u) + warp * .18;
      const maske = glatt(klemme((.5 - d) / .44));
      h += nc * .10 * A + Math.pow(maske, 1.3) * (.30 + kamm(seed, i / (welle * .8), j / (welle * .8), 4) * .42) * A * (1 - .9 * kernNaehe(i, j));
    } else if (standort === "fluss") {
      const { abstand, anteil } = abstandZurLinie([i, j], tal ?? [[0, hoehe / 2], [breite, hoehe / 2]]);
      h += nc * .12 * A + .035 - .16 * A * Math.exp(-((abstand / talBreite) ** 2)) + .05 * (.5 - anteil);
    } else if (standort === "see") {
      // A lake is a basin with a wandering shore: two warps, one broad and one fine, so the
      // rim reads as bays and spits instead of a drawn ellipse.
      const dn = Math.hypot((i - seeMitte[0]) / (breite * .22), (j - seeMitte[1]) / (hoehe * .28)) + warp * .55 + (fbm(seed, i / (welle * .45) + 3, j / (welle * .45) + 8, 5) - .5) * .3;
      h += nc * .10 * A + .02 - klemme(1.25 - dn) * .36;
    } else if (standort === "moor") {
      h += -.07 + nc * .30 * A;
      // Three pools are dug on purpose, on a ring outside the town core, so every moor has open
      // water and not only the seeds whose noise happens to dip below the water line.
      for (let k = 0; k < 3; k++) {
        const angle = (param(20 + k) + k) / 3 * Math.PI * 2, cx = breite / 2 + Math.cos(angle) * breite * .36, cy = hoehe / 2 + Math.sin(angle) * hoehe * .36;
        h -= .14 * Math.exp(-((i - cx) ** 2 + (j - cy) ** 2) / (welle * .55) ** 2);
      }
    }
    else if (standort === "kueste") {
      const d = (seite === 0 ? v : seite === 1 ? 1 - u : seite === 2 ? 1 - v : u), ufer = .30 + warp * .16;
      h += nc * .10 * A + Math.min((d - ufer) * 2.2, .08 * A);
    } else if (standort === "insel") {
      const dn = Math.hypot((i - breite / 2) / (breite * .5), (j - hoehe / 2) / (hoehe * .5)) + warp * .22;
      h += nc * .12 * A + Math.min((.62 - dn) * 1.1, .10 * A);
    }
    werte[j * columns + i] = Math.round(klemme(h, .02, 1) * 255);
  }
  const feld: Feld = { columns, rows, werte };
  const rahmen: Polygon = [[0, 0], [breite, 0], [breite, hoehe], [0, hoehe]];
  const felsStufe = MEERESSPIEGEL + RELIEF_LEVELS.rockAbove, strandStufe = MEERESSPIEGEL + 9;
  const stehend = standort === "see" || standort === "kueste" || standort === "insel" || standort === "moor";
  const wasser = stehend ? stuecke(feld, -Infinity, MEERESSPIEGEL + 1) : [];
  const strand = standort === "moor" || !stehend ? [] : stuecke(feld, MEERESSPIEGEL + 1, strandStufe);
  // Flüsse: der garantierte Lauf des Standorts `fluss` ist ein Ausguss wie das Meer; alles
  // andere fließt bergab bis dorthin, ins stehende Wasser oder über den Kartenrand.
  const kanal = new Uint8Array(n);
  if (tal && auftrag.flussBreite) for (let j = 0; j < rows; j++) for (let i = 0; i < columns; i++) if (abstandZurLinie([i, j], tal).abstand <= auftrag.flussBreite / 2 + .35) kanal[j * columns + i] = 1;
  const { ziel, abfluss, gefuellt } = hydrologie(feld, i => werte[i]! <= MEERESSPIEGEL || kanal[i] === 1);
  const schwelle = Math.max(14, Math.round(n * .012));
  const zufluss = new Uint8Array(n); for (let i = 0; i < n; i++) if (ziel[i]! >= 0 && abfluss[i]! >= schwelle) zufluss[ziel[i]!] = 1;
  const istAusguss = (i: number) => werte[i]! <= MEERESSPIEGEL || kanal[i] === 1 || ziel[i]! < 0;
  const spur = (start: number, beansprucht: Uint8Array | null): number[] => {
    const pfad = [start]; let c = start;
    while (!istAusguss(c)) { c = ziel[c]!; pfad.push(c); if (beansprucht?.[c]) break; if (pfad.length > n) break; }
    return pfad;
  };
  const quellen: number[] = [];
  for (let i = 0; i < n; i++) if (abfluss[i]! >= schwelle && !istAusguss(i) && !zufluss[i]) quellen.push(i);
  const kandidaten = quellen.map(q => ({ q, laenge: spur(q, null).length })).sort((a, b) => b.laenge - a.laenge || a.q - b.q);
  const beansprucht = new Uint8Array(n), laeufe: { pfad: number[]; }[] = [];
  const maxAbfluss = Math.max(1, ...quellen.map(q => abfluss[spur(q, null).at(-2) ?? q]!));
  const imKern = (i: number) => kernNaehe(i % columns, (i / columns) | 0) > .05;
  for (const { q } of kandidaten) {
    if (laeufe.length >= 4) break;
    const pfad = spur(q, beansprucht);
    if (pfad.length < 6 || pfad.some(imKern)) continue;
    for (const i of pfad) beansprucht[i] = 1;
    laeufe.push({ pfad });
  }
  const fluesse: FlussStueck[] = [];
  for (const { pfad } of laeufe) {
    // Two rounds of corner cutting turn the eight-connected trace into a river's curve; the
    // spring end tapers to a thread, because a brook does not start at full width.
    const punkte = chaikin(chaikin(pfad.map(i => [i % columns, (i / columns) | 0] as Punkt)));
    const breiten = pfad.map((i, k) => (.18 + .42 * Math.sqrt(abfluss[i]! / maxAbfluss)) * Math.min(1, (k + 1) / 5));
    const halb = punkte.map((_, k) => breiten[Math.min(pfad.length - 1, Math.round(k / Math.max(1, punkte.length - 1) * (pfad.length - 1)))]!);
    fluesse.push(...flussBand(punkte, halb, rahmen));
    for (const i of pfad) werte[i] = Math.min(werte[i]!, MEERESSPIEGEL - 1);
  }
  const fels = stuecke(feld, felsStufe, Infinity);
  // Feuchte: Rauschen plus Nähe zu Wasser; im Ortskern bleibt das Land offen.
  const nass = new Float64Array(n).fill(Infinity), schlange: number[] = [];
  for (let i = 0; i < n; i++) if (werte[i]! <= MEERESSPIEGEL) { nass[i] = 0; schlange.push(i); }
  for (let k = 0; k < schlange.length; k++) {
    const c = schlange[k]!, cx = c % columns, cy = (c / columns) | 0;
    for (const [dx, dy] of NACHBARN.slice(0, 4)) { const x = cx + dx, y = cy + dy; if (x < 0 || y < 0 || x >= columns || y >= rows) continue; const i = y * columns + x; if (nass[i] === Infinity) { nass[i] = nass[c]! + 1; schlange.push(i); } }
  }
  const reichweite = Math.max(4, Math.min(breite, hoehe) * .18);
  const feuchteWerte = new Float64Array(n);
  for (let j = 0; j < rows; j++) for (let i = 0; i < columns; i++) {
    const k = j * columns + i, wet = nass[k] === Infinity ? 0 : klemme(1 - nass[k]! / reichweite);
    // A moor is wet by definition: the bias is large enough that every seed carries marsh
    // outside the town core, not only the ones whose noise happens to run high.
    feuchteWerte[k] = (.6 * fbm(seed2, i / (welle * .9) + 5, j / (welle * .9) - 9, 7) + .4 * wet + (standort === "moor" ? .22 : 0)) * (1 - .85 * kernNaehe(i, j));
  }
  const feuchteFeld: Feld = { columns, rows, werte: feuchteWerte };
  // Offenes Land trägt bei mittlerer Bewaldung nur einzelne Gehölze; ein Waldstandort ist Wald.
  const waldSchwelle = (standort === "wald" ? .45 : standort === "ebene" ? .80 : .70) - .42 * klemme(auftrag.bewaldung);
  const sumpfStufe = MEERESSPIEGEL + RELIEF_LEVELS.flatLand - 8;
  const sumpf = standort === "moor" ? stuecke(feuchteFeld, .5, Infinity, (x, y) => marching([wert(feld, x, y), wert(feld, x + 1, y), wert(feld, x + 1, y + 1), wert(feld, x, y + 1)], sumpfStufe, v => v < sumpfStufe, x, y).flatMap(p => marching([wert(feld, x, y), wert(feld, x + 1, y), wert(feld, x + 1, y + 1), wert(feld, x, y + 1)], MEERESSPIEGEL + 1, v => v >= MEERESSPIEGEL + 1, x, y).map(o => schnittKonvex(p, o))).filter(p => p.length >= 3 && flaeche(p) > 1e-6)) : [];
  const waldUnten = standort === "moor" ? sumpfStufe : stehend ? strandStufe : MEERESSPIEGEL + 1;
  const wald = stuecke(feuchteFeld, waldSchwelle, Infinity, (x, y) => {
    const ecken: [number, number, number, number] = [wert(feld, x, y), wert(feld, x + 1, y), wert(feld, x + 1, y + 1), wert(feld, x, y + 1)];
    const untere = marching(ecken, waldUnten, v => v >= waldUnten, x, y);
    if (!untere.length) return null;
    const obere = marching(ecken, felsStufe, v => v < felsStufe, x, y);
    return untere.flatMap(a => obere.map(b => schnittKonvex(a, b))).filter(p => p.length >= 3 && flaeche(p) > 1e-6);
  });
  const relief: CartographyReliefV1 = { schemaVersion: 1, columns, rows, seaLevel: MEERESSPIEGEL, heights: Array.from(werte, v => Math.max(0, Math.min(255, Math.round(v)))) };
  const bilinear = (arr: ArrayLike<number>, x: number, y: number) => {
    const cx = klemme(x, 0, columns - 1), cy = klemme(y, 0, rows - 1), i = Math.min(columns - 2, Math.floor(cx)), j = Math.min(rows - 2, Math.floor(cy)), fx = cx - i, fy = cy - j;
    const at = (c: number, r: number) => arr[r * columns + c]!;
    return (at(i, j) * (1 - fx) + at(i + 1, j) * fx) * (1 - fy) + (at(i, j + 1) * (1 - fx) + at(i + 1, j + 1) * fx) * fy;
  };
  void gefuellt;
  return {
    relief, wasser, wasserMaterial: standort === "kueste" || standort === "insel" ? "sea" : "lake", fluesse, fels, strand, sumpf, wald,
    feuchte: (x, y) => bilinear(feuchteWerte, x, y), waldSchwelle, hoehe: (x, y) => bilinear(relief.heights, x, y),
  };
}
