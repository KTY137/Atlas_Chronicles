// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { q, qp, type Polygon, type Punkt } from "../../polygon.ts";
import type { Kantengraph } from "./graph.ts";

/**
 * **Die Stadtmauer.** Sie läuft auf den Außenkanten der Altstadtflecken, um einen Versatz nach
 * außen geschoben, damit innen eine Wallgasse Platz hat. Tore sind Mauerecken, an denen eine
 * Kante ins Umland führt; Türme stehen an jeder Ecke und entlang langer Seiten.
 */
export interface MauerLinie { readonly a: Punkt; readonly b: Punkt; readonly pfad: string }

/** Einheitsvektoren für 0°, 30°, …, 330° — Zahlliterale statt Winkelfunktion. */
const S = .8660254037844386;
const ZWOELF: readonly Punkt[] = [[1, 0], [S, .5], [.5, S], [0, 1], [-.5, S], [-S, .5], [-1, 0], [-S, -.5], [-.5, -S], [0, -1], [.5, -S], [S, -.5]];
export const zwoelfeck = (m: Punkt, radius: number): Polygon => ZWOELF.map(([x, y]) => qp([m[0] + x * radius, m[1] + y * radius]));

/** Kanten mit genau einer Kernseite. Kanten am Kartenrahmen tragen keine Mauer. */
export function mauerKanten(g: Kantengraph, istKern: (zelle: number) => boolean): number[] {
  return g.kanten.filter(k => k.f2 >= 0 && istKern(k.f1) !== istKern(k.f2)).map(k => k.nr);
}

/** Tore: Ringecken, von denen eine Kante zwischen zwei Nicht-Innen-Flecken ins Umland führt. Das
 *  erste liegt in Richtung `start`, jedes weitere so weit von den gewählten weg wie möglich —
 *  gemessen als Skalarprodukt der Richtungen, ohne Winkel. Näher als 60° kommt kein Tor dazu. */
export function waehleTore(g: Kantengraph, ring: readonly number[], istInnen: (zelle: number) => boolean, mitte: Punkt, anzahl: number, gesperrt: (p: Punkt) => boolean, start: Punkt): number[] {
  const ringEcken = [...new Set(ring.flatMap(nr => [g.kanten[nr]!.u, g.kanten[nr]!.v]))].sort((a, b) => a - b);
  const kandidaten = ringEcken.filter(e => !gesperrt(g.ecken[e]!) && g.an[e]!.some(nr => {
    const k = g.kanten[nr]!;
    return k.f2 >= 0 && !istInnen(k.f1) && !istInnen(k.f2);
  }));
  const richtung = (p: Punkt): Punkt => {
    const dx = p[0] - mitte[0], dy = p[1] - mitte[1], n = Math.sqrt(dx * dx + dy * dy) || 1;
    return [dx / n, dy / n];
  };
  const s = richtung(start);
  const erstes = [...kandidaten].sort((a, b) => {
    const da = richtung(g.ecken[a]!), db = richtung(g.ecken[b]!);
    return (db[0] * s[0] + db[1] * s[1]) - (da[0] * s[0] + da[1] * s[1]) || a - b;
  })[0];
  if (erstes === undefined) return [];
  const gewaehlt = [erstes];
  while (gewaehlt.length < anzahl) {
    let beste = -1, besterWert = Infinity;
    for (const e of kandidaten) {
      if (gewaehlt.includes(e)) continue;
      const d = richtung(g.ecken[e]!);
      const naechster = Math.max(...gewaehlt.map(x => { const o = richtung(g.ecken[x]!); return d[0] * o[0] + d[1] * o[1]; }));
      if (naechster < besterWert - 1e-9) { besterWert = naechster; beste = e; }
    }
    if (beste < 0 || besterWert > .5) break;
    gewaehlt.push(beste);
  }
  return gewaehlt;
}

/** Jede Ringkante um `versatz` nach außen geschoben, Ecken abgeschrägt. Eine Linienmenge statt
 *  eines verketteten Rings: an Y-Verzweigungen wäre „der nächste Nachbar" nicht definiert
 *  (`polygon.ts: aussenkanten`). */
export function mauerLinien(g: Kantengraph, ring: readonly number[], kernSchwerpunkt: (zelle: number) => Punkt, istKern: (zelle: number) => boolean, versatz: number): MauerLinie[] {
  const linien: MauerLinie[] = [], ecken = new Map<number, Punkt[]>();
  for (const nr of ring) {
    const k = g.kanten[nr]!, c = kernSchwerpunkt(istKern(k.f1) ? k.f1 : k.f2);
    const dx = k.bis[0] - k.von[0], dy = k.bis[1] - k.von[1], l = k.laenge || 1;
    let nx = -dy / l, ny = dx / l;
    const mx = (k.von[0] + k.bis[0]) / 2, my = (k.von[1] + k.bis[1]) / 2;
    if (nx * (c[0] - mx) + ny * (c[1] - my) > 0) { nx = -nx; ny = -ny; }
    const a = qp([k.von[0] + nx * versatz, k.von[1] + ny * versatz]), b = qp([k.bis[0] + nx * versatz, k.bis[1] + ny * versatz]);
    linien.push({ a, b, pfad: `mauer.${q(k.von[0])}_${q(k.von[1])}.${q(k.bis[0])}_${q(k.bis[1])}` });
    for (const [e, p] of [[k.u, a], [k.v, b]] as const) ecken.set(e, [...(ecken.get(e) ?? []), p]);
  }
  for (const [e, punkte] of [...ecken].sort((x, y) => x[0] - y[0]))
    if (punkte.length === 2 && (punkte[0]![0] !== punkte[1]![0] || punkte[0]![1] !== punkte[1]![1]))
      linien.push({ a: punkte[0]!, b: punkte[1]!, pfad: `mauer.ecke.${q(g.ecken[e]![0])}_${q(g.ecken[e]![1])}` });
  return linien;
}

const istEcke = (l: MauerLinie) => l.pfad.startsWith("mauer.ecke.");
const gleich = (a: Punkt, b: Punkt) => Math.abs(a[0] - b[0]) < 1e-6 && Math.abs(a[1] - b[1]) < 1e-6;

/** Türme an jeder Ecke (eine Abschrägung trägt einen Turm in ihrer Mitte), an Linienenden ohne
 *  Abschrägung und entlang von Seiten, die länger als `abstand` sind. Näher als 0,25 Zellen
 *  beieinander stehen keine zwei Türme. */
export function turmPunkte(linien: readonly MauerLinie[], abstand: number): Punkt[] {
  const punkte: Punkt[] = [];
  const add = (p: Punkt) => { if (!punkte.some(o => Math.abs(o[0] - p[0]) < .25 && Math.abs(o[1] - p[1]) < .25)) punkte.push(qp(p)); };
  for (const l of linien) {
    if (istEcke(l)) { add([(l.a[0] + l.b[0]) / 2, (l.a[1] + l.b[1]) / 2]); continue; }
    const laenge = Math.sqrt((l.b[0] - l.a[0]) ** 2 + (l.b[1] - l.a[1]) ** 2), zwischen = Math.floor(laenge / abstand);
    for (let i = 1; i <= zwischen; i++) { const t = i / (zwischen + 1); add([l.a[0] + (l.b[0] - l.a[0]) * t, l.a[1] + (l.b[1] - l.a[1]) * t]); }
  }
  for (const l of linien) if (!istEcke(l)) for (const p of [l.a, l.b])
    if (!linien.some(e => istEcke(e) && (gleich(e.a, p) || gleich(e.b, p)))) add(p);
  return punkte.sort((a, b) => a[1] - b[1] || a[0] - b[0]);
}
