// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import type { Polygon, Punkt } from "../../polygon.ts";

/**
 * **Die Kanten zwischen den Flecken als Graph.** Ecken sind Voronoi-Ecken, auf 0,02 Zellen
 * gefangen: zwei Nachbarn schneiden dieselbe Ecke in anderer Reihenfolge und weichen im letzten
 * Bit ab. `f1`/`f2` sind die Indizes der beiden Zellen in der Liste, aus der der Graph gebaut
 * wurde; `f2 = -1` heißt, die Kante hat nur eine Zelle (sie liegt am Kartenrahmen).
 */
export interface Kante { readonly nr: number; readonly u: number; readonly v: number; readonly von: Punkt; readonly bis: Punkt; readonly laenge: number; readonly f1: number; readonly f2: number }
export interface Kantengraph { readonly ecken: readonly Punkt[]; readonly kanten: readonly Kante[]; readonly an: readonly (readonly number[])[]; finde(p: Punkt): number }

const FANG = .02, RASTER = .05;

export function kantengraph(zellen: readonly Polygon[]): Kantengraph {
  const ecken: Punkt[] = [], eimer = new Map<string, number[]>();
  const suche = (p: Punkt): number => {
    const gx = Math.floor(p[0] / RASTER), gy = Math.floor(p[1] / RASTER);
    for (let x = gx - 1; x <= gx + 1; x++) for (let y = gy - 1; y <= gy + 1; y++) for (const i of eimer.get(`${x}:${y}`) ?? []) {
      const e = ecken[i]!;
      if (Math.abs(e[0] - p[0]) <= FANG && Math.abs(e[1] - p[1]) <= FANG) return i;
    }
    return -1;
  };
  const ecke = (p: Punkt): number => {
    const vorhanden = suche(p);
    if (vorhanden >= 0) return vorhanden;
    ecken.push(p);
    const key = `${Math.floor(p[0] / RASTER)}:${Math.floor(p[1] / RASTER)}`;
    eimer.set(key, [...(eimer.get(key) ?? []), ecken.length - 1]);
    return ecken.length - 1;
  };
  const roh: { u: number; v: number; f1: number; f2: number }[] = [], index = new Map<string, number>();
  zellen.forEach((zelle, f) => {
    for (let i = 0, j = zelle.length - 1; i < zelle.length; j = i++) {
      const u = ecke(zelle[j]!), v = ecke(zelle[i]!);
      if (u === v) continue;
      const key = u < v ? `${u}:${v}` : `${v}:${u}`, alt = index.get(key);
      if (alt === undefined) { index.set(key, roh.length); roh.push({ u, v, f1: f, f2: -1 }); }
      else if (roh[alt]!.f2 < 0 && roh[alt]!.f1 !== f) roh[alt]!.f2 = f;
    }
  });
  const kanten: Kante[] = roh.map((k, nr) => {
    const von = ecken[k.u]!, bis = ecken[k.v]!;
    return { nr, u: k.u, v: k.v, von, bis, laenge: Math.sqrt((bis[0] - von[0]) ** 2 + (bis[1] - von[1]) ** 2), f1: k.f1, f2: k.f2 };
  });
  const an = ecken.map(() => [] as number[]);
  for (const k of kanten) { an[k.u]!.push(k.nr); an[k.v]!.push(k.nr); }
  return { ecken, kanten, an, finde: suche };
}

/** Dijkstra mit Binärheap. Gleiche Kosten entscheidet die kleinere Eckennummer, damit derselbe
 *  Keim immer denselben Weg ergibt. Rückgabe: Kantennummern vom Start bis zum erreichten Ziel. */
export function weg(g: Kantengraph, start: number, ziele: ReadonlySet<number>, kosten: (k: Kante) => number): number[] | null {
  if (start < 0 || start >= g.ecken.length || !ziele.size) return null;
  const n = g.ecken.length, dist = new Float64Array(n).fill(Infinity), ueber = new Int32Array(n).fill(-1), fertig = new Uint8Array(n);
  const heap: [number, number][] = [];
  const kleiner = (a: [number, number], b: [number, number]) => a[0] < b[0] || (a[0] === b[0] && a[1] < b[1]);
  const push = (e: [number, number]) => {
    heap.push(e);
    for (let i = heap.length - 1; i > 0;) {
      const p = (i - 1) >> 1;
      if (!kleiner(heap[i]!, heap[p]!)) break;
      [heap[i], heap[p]] = [heap[p]!, heap[i]!]; i = p;
    }
  };
  const pop = (): [number, number] => {
    const top = heap[0]!, last = heap.pop()!;
    if (heap.length) {
      heap[0] = last;
      for (let i = 0; ;) {
        const l = 2 * i + 1, r = l + 1; let m = i;
        if (l < heap.length && kleiner(heap[l]!, heap[m]!)) m = l;
        if (r < heap.length && kleiner(heap[r]!, heap[m]!)) m = r;
        if (m === i) break;
        [heap[i], heap[m]] = [heap[m]!, heap[i]!]; i = m;
      }
    }
    return top;
  };
  dist[start] = 0; push([0, start]);
  while (heap.length) {
    const [d, e] = pop();
    if (fertig[e] || d > dist[e]!) continue;
    fertig[e] = 1;
    if (ziele.has(e)) {
      const pfad: number[] = [];
      for (let x = e; x !== start;) { const k = g.kanten[ueber[x]!]!; pfad.push(k.nr); x = k.u === x ? k.v : k.u; }
      return pfad.reverse();
    }
    for (const nr of g.an[e]!) {
      const k = g.kanten[nr]!, c = kosten(k);
      if (!(c < Infinity)) continue;
      const w = k.u === e ? k.v : k.u, nd = d + c;
      if (nd < dist[w]!) { dist[w] = nd; ueber[w] = nr; push([nd, w]); }
    }
  }
  return null;
}
