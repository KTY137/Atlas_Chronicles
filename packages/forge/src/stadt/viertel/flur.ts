// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { clipHalbebene, einwaerts, flaeche, qp, type Polygon } from "../../polygon.ts";
import { hausImLos, type Gasse, type Zufall } from "../gemeinsam.ts";
import type { Bau } from "./parzellen.ts";

/** Gewannflur: parallele Streifen quer zur längsten Kante, leicht ungleich breit — so lesen
 *  Felder als bewirtschaftetes Land statt als Flickenteppich. */
export function flurStreifen(zelle: Polygon, streifen: number, r: Zufall): Polygon[] {
  let beste = 0, bl = -1;
  for (let i = 0; i < zelle.length; i++) {
    const a = zelle[(i + zelle.length - 1) % zelle.length]!, b = zelle[i]!, l = Math.sqrt((b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2);
    if (l > bl) { bl = l; beste = i; }
  }
  const a = zelle[(beste + zelle.length - 1) % zelle.length]!, b = zelle[beste]!, ux = (b[0] - a[0]) / bl, uy = (b[1] - a[1]) / bl;
  const along = zelle.map(p => p[0] * ux + p[1] * uy), lo = Math.min(...along), hi = Math.max(...along);
  const schnitte = [lo];
  for (let i = 1; i < streifen; i++) schnitte.push(lo + (hi - lo) * (i + r.zahl(-.2, .2)) / streifen);
  schnitte.push(hi);
  const result: Polygon[] = [];
  for (let i = 0; i < streifen; i++) {
    const s = clipHalbebene(clipHalbebene(zelle, -ux, -uy, -schnitte[i]!), ux, uy, schnitte[i + 1]!);
    if (s.length >= 3) result.push(s.map(qp));
  }
  return result;
}

/** Ein Hof an der Landstraße: ein L-förmiges Haus — Wohnteil und Scheunenflügel in einem. */
export function bauernhof(zelle: Polygon, strasse: Gasse, pfad: string, r: Zufall): Bau[] {
  const los = einwaerts(zelle, .15);
  if (los.length < 3 || flaeche(los) < 4) return [];
  const haus = hausImLos(los, strasse, r.zahl(1.3, 1.8), r.zahl(1, 1.3), "l");
  if (haus.length < 3) return [];
  return [{ pfad: `${pfad}.hof`, umriss: haus.map(qp), los: los.map(qp), strasse: strasse.id, typ: "bauernhof", rang: 1 }];
}
