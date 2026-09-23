// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { clipHalbebene, einwaertsKanten, flaeche, q, qp, schnittKonvex, sehne, type Polygon, type Punkt } from "../../polygon.ts";
import type { Gasse } from "../gemeinsam.ts";
import type { ParzellenAuftrag } from "../viertel/parzellen.ts";

/**
 * **Ein Straßenraster im Stadtteil** (Spec 2026-09-23-stadt-zukunft, 5.3). Heutige Stadtteile
 * sind geplant: ein rechtwinkliges Netz, gedreht nach der Hauptstraße, an der der Stadtteil liegt.
 * Straßen quer zu `u` laufen durch; die Straßen quer zu `v` reichen nur von einer zur nächsten —
 * so treffen sie sich in T- und Kreuzungen, ohne dass sich zwei Straßenflächen überdecken. Blöcke
 * sind die Maschen dazwischen (konvex, weil Stadtteil und Streifen konvex sind).
 */
export interface Block { readonly pfad: string; readonly poly: Polygon }
export interface Raster { readonly strassen: readonly Gasse[]; readonly bloecke: readonly Block[]; readonly gruen: readonly Polygon[] }

/** Der Teil von `poly` mit `lo ≤ d·p ≤ hi`. */
const zwischen = (poly: Polygon, d: Punkt, lo: number, hi: number): Polygon =>
  poly.length < 3 ? [] : clipHalbebene(clipHalbebene(poly, d[0], d[1], hi), -d[0], -d[1], -lo);

function schnitte(poly: Polygon, d: Punkt, masche: number, phase: number): number[] {
  const werte = poly.map(p => p[0] * d[0] + p[1] * d[1]), lo = Math.min(...werte), hi = Math.max(...werte), result: number[] = [];
  for (let c = lo + phase; c < hi - masche * .45; c += masche) if (c > lo + masche * .45) result.push(c);
  return result;
}

export function raster(a: ParzellenAuftrag, innen: Polygon, u: Punkt, mu: number, mv: number, breite: number): Raster {
  const v: Punkt = [-u[1], u[0]], h = breite / 2;
  // Die Straßen reichen bis knapp in die Hauptstraße am Rand, damit keine Fuge bleibt.
  const aussenRoh = einwaertsKanten(a.zelle, a.abstaende.map(d => Math.max(0, d - .15)));
  const aussen = aussenRoh.length >= 3 ? aussenRoh : innen;
  const cu = schnitte(innen, u, mu, a.r.zahl(.3, .7) * mu), cv = schnitte(innen, v, mv, a.r.zahl(.3, .7) * mv);
  const nass = (p: Polygon) => a.hindernisse.some(w => flaeche(schnittKonvex(p, w)) > 1e-6);
  const strassen: Gasse[] = [];
  const strasse = (poly: Polygon, d: Punkt, c: number, name: string): boolean => {
    const band = zwischen(poly, d, c - h, c + h), s = sehne(poly, d[0], d[1], c);
    if (!s || band.length < 3 || Math.hypot(s[1][0] - s[0][0], s[1][1] - s[0][1]) < 1.2 || nass(band)) return false;
    strassen.push({ id: a.id("gasse", a.pfad, "raster", name), art: "gasse", a: a.nr, b: a.nr, von: qp(s[0]), bis: qp(s[1]), band: band.map(qp) });
    return true;
  };
  // Geteilt wird nur, wo die Straße wirklich entsteht: sonst läge zwischen zwei Blöcken eine Lücke ohne Straße.
  const grenzen = (liste: readonly number[]) => [-Infinity, ...liste, Infinity];
  const gu = grenzen(cu.filter((c, k) => strasse(aussen, u, c, `u${k}`)));
  const bloecke: Block[] = [], gruen: Polygon[] = [];
  for (let s = 0; s + 1 < gu.length; s++) {
    const streifen = zwischen(aussen, u, gu[s]! + h, gu[s + 1]! - h);
    const gv = grenzen(cv.filter((c, k) => strasse(streifen, v, c, `v${k}.${s}`)));
    for (let t = 0; t + 1 < gv.length; t++) {
      const block = zwischen(zwischen(innen, u, gu[s]! + h, gu[s + 1]! - h), v, gv[t]! + h, gv[t + 1]! - h).map(qp);
      if (block.length < 3 || flaeche(block) < .5) continue;
      // Ein Block am Ufer bleibt, solange ein Drittel trocken ist: die Bauer setzen nur trockene Häuser
      // (Wasser ist oft aus vielen kleinen Stücken gebaut; Abziehen zerlegte den Block in Splitter).
      const nassFlaeche = a.hindernisse.reduce((sum, w) => sum + flaeche(schnittKonvex(block, w)), 0);
      if (nassFlaeche > flaeche(block) * .67) continue;
      if (flaeche(block) < mu * mv * .4) { if (nassFlaeche < 1e-6) gruen.push(block); continue; }
      const m = block.reduce<[number, number]>((sum, p) => [sum[0] + p[0] / block.length, sum[1] + p[1] / block.length], [0, 0]);
      bloecke.push({ pfad: `${a.pfad}.b${q(m[0])}_${q(m[1])}`, poly: block });
    }
  }
  return { strassen, bloecke, gruen };
}
