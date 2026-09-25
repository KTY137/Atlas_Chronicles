// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { clipHalbebene, q, qp, type Polygon, type Punkt } from "../../polygon.ts";
import type { Gasse } from "../gemeinsam.ts";
import { weg, type Kante, type Kantengraph } from "./graph.ts";

/**
 * **Wege durch die Stadt.** Hauptstraßen laufen vom Tor zum Markt über die Kanten zwischen
 * Stadtflecken; schon benutzte Kanten kosten weniger, damit sich Straßen bündeln wie gewachsene
 * Wege. Vom Tor geht es durch die Flur weiter zum Kartenrand. Jede Kante mit einer Stadtseite
 * wird ein Straßenband — zweiseitig zwischen zwei Stadtflecken, einseitig nach innen am Ortsrand
 * und an der Mauer (dort ist es die Wallgasse).
 */
export interface WegeAuftrag {
  readonly g: Kantengraph; readonly istStadt: (z: number) => boolean; readonly istKern: (z: number) => boolean;
  readonly ring: ReadonlySet<number>;
  /** Kanten am Stadtrand (die Mauer oder, ohne Mauer, der Ortsrand). Ein Tor liegt an einer Ecke mit
   *  nur einem Stadtfleck; von dort führt die Hauptstraße ein Stück am Rand entlang nach innen. */
  readonly randKanten?: ReadonlySet<number>;
  readonly markt: number; readonly tore: readonly number[]; readonly mitte: Punkt;
  readonly breite: number; readonly hoehe: number;
  /** Zuschlag je Kante: eine Flussquerung kostet eine Brücke, See und Fels sind gesperrt (`Infinity`). */
  readonly kosten: (k: Kante) => number;
}
export interface Wege { readonly haupt: ReadonlySet<number>; readonly ausfall: ReadonlySet<number> }
export interface Breiten { readonly haupt: number; readonly gasse: number; readonly wall: number; readonly ausfall: number }

const amRahmen = (p: Punkt, breite: number, hoehe: number) => p[0] < .01 || p[1] < .01 || p[0] > breite - .01 || p[1] > hoehe - .01;

export function hauptstrassen(a: WegeAuftrag): Wege {
  const { g } = a, haupt = new Set<number>(), ausfall = new Set<number>();
  const marktEcken = new Set(g.kanten.filter(k => k.f1 === a.markt || k.f2 === a.markt).flatMap(k => [k.u, k.v]));
  const innen = (k: Kante) => k.f2 >= 0 && a.istStadt(k.f1) && a.istStadt(k.f2) && !a.ring.has(k.nr);
  for (const tor of a.tore) {
    const rand = a.randKanten ?? a.ring;
    const pfad = a.markt >= 0 ? weg(g, tor, marktEcken, k => innen(k) ? k.laenge * (haupt.has(k.nr) ? .45 : 1) + a.kosten(k) : rand.has(k.nr) ? k.laenge * 3 + a.kosten(k) : Infinity) : null;
    for (const nr of pfad ?? []) haupt.add(nr);
    const t = g.ecken[tor]!, dx = t[0] - a.mitte[0], dy = t[1] - a.mitte[1], n = Math.sqrt(dx * dx + dy * dy) || 1;
    const kartenrand = new Set<number>();
    g.ecken.forEach((p, e) => {
      if (!amRahmen(p, a.breite, a.hoehe)) return;
      const ex = p[0] - a.mitte[0], ey = p[1] - a.mitte[1], m = Math.sqrt(ex * ex + ey * ey) || 1;
      if ((ex * dx + ey * dy) / (m * n) >= .6) kartenrand.add(e);
    });
    const draussen = weg(g, tor, kartenrand, k => (amRahmen(k.von, a.breite, a.hoehe) && amRahmen(k.bis, a.breite, a.hoehe)) || a.istKern(k.f1) || (k.f2 >= 0 && a.istKern(k.f2)) ? Infinity : k.laenge * (ausfall.has(k.nr) ? .5 : 1) + a.kosten(k));
    for (const nr of draussen ?? []) ausfall.add(nr);
  }
  return { haupt, ausfall };
}

export function strassenBaender(g: Kantengraph, a: {
  istStadt(z: number): boolean; istKern?(z: number): boolean; ring: ReadonlySet<number>; wege: Wege; breiten: Breiten;
  zelleVon(z: number): Polygon; breite: number; hoehe: number; id(...pfad: string[]): string;
}): { gassen: Gasse[]; kanteZuGasse: ReadonlyMap<number, number> } {
  const gassen: Gasse[] = [], kanteZuGasse = new Map<number, number>();
  const kanten = [...g.kanten].sort((x, y) => x.von[1] - y.von[1] || x.von[0] - y.von[0] || x.bis[1] - y.bis[1] || x.bis[0] - y.bis[0]);
  for (const k of kanten) {
    if (amRahmen(k.von, a.breite, a.hoehe) && amRahmen(k.bis, a.breite, a.hoehe)) continue;
    const s1 = a.istStadt(k.f1), s2 = k.f2 >= 0 && a.istStadt(k.f2), ausfall = a.wege.ausfall.has(k.nr);
    if (!s1 && !s2 && !ausfall) continue;
    if (k.laenge < .3) continue;
    const ring = a.ring.has(k.nr), einseitig = ring || (s1 !== s2 && !ausfall);
    const breite = ausfall ? a.breiten.ausfall : a.wege.haupt.has(k.nr) ? a.breiten.haupt : ring ? a.breiten.wall : a.breiten.gasse;
    const dx = k.bis[0] - k.von[0], dy = k.bis[1] - k.von[1];
    let nx = -dy / k.laenge, ny = dx / k.laenge;
    // Einseitig heißt: das Band liegt ganz auf der Stadtseite (an der Mauer: auf der Kernseite).
    const innenZelle = !einseitig ? k.f1 : ring ? ((a.istKern ?? a.istStadt)(k.f1) ? k.f1 : k.f2) : s1 ? k.f1 : k.f2;
    if (einseitig) {
      const z = a.zelleVon(innenZelle), c = z.reduce<[number, number]>((s, p) => [s[0] + p[0] / z.length, s[1] + p[1] / z.length], [0, 0]);
      if (nx * (c[0] - (k.von[0] + k.bis[0]) / 2) + ny * (c[1] - (k.von[1] + k.bis[1]) / 2) < 0) { nx = -nx; ny = -ny; }
    }
    const h = breite / 2;
    const roh: Polygon = einseitig
      ? [k.von, k.bis, [k.bis[0] + nx * breite, k.bis[1] + ny * breite], [k.von[0] + nx * breite, k.von[1] + ny * breite]]
      : [[k.von[0] + nx * h, k.von[1] + ny * h], [k.bis[0] + nx * h, k.bis[1] + ny * h], [k.bis[0] - nx * h, k.bis[1] - ny * h], [k.von[0] - nx * h, k.von[1] - ny * h]];
    let band = roh;
    for (const [rx, ry, rc] of [[-1, 0, 0], [1, 0, a.breite], [0, -1, 0], [0, 1, a.hoehe]] as const) band = clipHalbebene(band, rx, ry, rc);
    if (band.length < 3) continue;
    kanteZuGasse.set(k.nr, gassen.length);
    gassen.push({
      id: a.id("gasse", `${q(k.von[0])}_${q(k.von[1])}`, `${q(k.bis[0])}_${q(k.bis[1])}`),
      art: a.wege.haupt.has(k.nr) || ausfall ? "hauptstrasse" : "gasse",
      a: einseitig ? innenZelle : k.f1, b: einseitig ? innenZelle : k.f2 >= 0 ? k.f2 : k.f1,
      von: k.von, bis: k.bis, band: band.map(qp),
    });
  }
  return { gassen, kanteZuGasse };
}
