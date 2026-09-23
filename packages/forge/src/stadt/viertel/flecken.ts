// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { huelle, q, qp, schwerpunkt, voronoiZelle, type Polygon, type Punkt } from "../../polygon.ts";

/**
 * **Flecken: die Grundstücke der Stadtgeschichte.** Eine gewachsene Stadt ist innen eng und wird
 * nach außen weiter; ihre Viertel sind Flecken unterschiedlicher Größe. Die Punkte liegen auf
 * einer Sonnenblumenspirale (goldener Winkel), deren Ringabstand nach außen wächst, und nur die
 * inneren werden mit Lloyd beruhigt — die Flur darf grob bleiben.
 */
export interface Fleck { readonly nr: number; readonly punkt: Punkt; readonly zelle: Polygon; readonly ferne: number; readonly pfad: string }

/** 137,5° als Drehvektor, ohne Winkelfunktion (`polygon.ts`, Regel 2). */
const GOLD_X = -0.7373688780783197, GOLD_Y = 0.6754902942615238;

export function spirale(mitte: Punkt, innen: number, radiusInnen: number, rahmen: Polygon, r: { zahl(min: number, max: number): number }, max = 420): Punkt[] {
  let dx = r.zahl(-1, 1), dy = r.zahl(-1, 1), n = Math.sqrt(dx * dx + dy * dy);
  if (n < 1e-6) { dx = 1; dy = 0; n = 1; }
  dx /= n; dy /= n;
  const schritt = radiusInnen / (Math.sqrt(innen + .5) * 1.35);
  const [x0, y0, x1, y1] = huelle(rahmen);
  const weiteste = Math.sqrt(Math.max((mitte[0] - x0) ** 2, (x1 - mitte[0]) ** 2) + Math.max((mitte[1] - y0) ** 2, (y1 - mitte[1]) ** 2)) + schritt * 2;
  const punkte: Punkt[] = [];
  for (let i = 0; punkte.length < max; i++) {
    const radius = schritt * Math.sqrt(i + .5) * (1 + .35 * i / Math.max(1, innen)) * r.zahl(.92, 1.08);
    if (radius > weiteste) break;
    const quer = r.zahl(-.22, .22) * schritt;
    const p: Punkt = [mitte[0] + dx * radius - dy * quer, mitte[1] + dy * radius + dx * quer];
    if (p[0] > x0 + .05 && p[0] < x1 - .05 && p[1] > y0 + .05 && p[1] < y1 - .05) punkte.push(qp(p));
    const nx = dx * GOLD_X - dy * GOLD_Y, ny = dx * GOLD_Y + dy * GOLD_X;
    dx = nx; dy = ny;
  }
  return punkte;
}

/** Voronoi über alle Punkte; nur die ersten `innen` (die Stadt) wandern `runden`-mal auf den
 *  Schwerpunkt ihrer Zelle. `nr` bleibt die Spiralnummer, die Reihenfolge ist die der Spirale. */
export function flecken(punkte: readonly Punkt[], innen: number, rahmen: Polygon, mitte: Punkt, runden = 2): Fleck[] {
  let p = punkte.map(x => [x[0], x[1]] as Punkt);
  for (let runde = 0; runde < runden; runde++) {
    const vorher = p;
    p = vorher.map((pt, i) => {
      if (i >= innen) return pt;
      const zelle = voronoiZelle(pt, vorher, rahmen);
      return zelle.length >= 3 ? schwerpunkt(zelle) : pt;
    });
  }
  const fest = p.map(qp), result: Fleck[] = [];
  fest.forEach((pt, nr) => {
    const zelle = voronoiZelle(pt, fest, rahmen).map(qp);
    if (zelle.length < 3) return;
    result.push({ nr, punkt: pt, zelle, ferne: Math.sqrt((pt[0] - mitte[0]) ** 2 + (pt[1] - mitte[1]) ** 2), pfad: `fleck.${q(pt[0])}_${q(pt[1])}` });
  });
  return result;
}
