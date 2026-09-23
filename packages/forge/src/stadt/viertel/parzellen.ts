// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import type { BauwerkTyp } from "@chronicle/szene";
import { abstandPolygonStrecke, clipHalbebene, einwaerts, einwaertsKanten, flaeche, halbiere, imPolygon, q, qp, schnittKonvex, schwerpunkt, type Polygon, type Punkt } from "../../polygon.ts";
import { getrennteDaecher, hausImLos, ohne, type Gasse, type Hausform, type Zufall } from "../gemeinsam.ts";
import type { Rolle } from "./rollen.ts";

/**
 * **Ein Fleck wird bebaut.** Der Fleck rückt von seinen Straßen ab, wird dann fortgesetzt
 * halbiert — große Stücke mit einer Gasse dazwischen, kleine ohne — bis Lose in der Größe
 * entstehen, die seine Rolle verlangt. Jedes Los mit Straßenfront bekommt ein Haus: in dichten
 * Vierteln das ganze Los bis auf eine Fuge (so entstehen geschlossene Häuserzeilen), in lockeren
 * ein Haus an der Front mit Garten dahinter. Lose ohne Front bleiben Hof — kein Haus bekommt eine
 * Adresse, die niemand erreicht. Markt und Tempelbezirk sind Plätze mit einem Bau darauf.
 */
export interface Bau {
  readonly pfad: string; readonly umriss: Polygon; readonly los: Polygon; readonly strasse: string;
  /** `null`: der Typ wird später nach der Rolle des Viertels gewürfelt. */
  readonly typ: BauwerkTyp | null; readonly titel?: string;
  /** 0 Sonderbau, 1 Hof, 2 Haus — in dieser Reihenfolge füllt die Stadt ihr Gebäudebudget. */
  readonly rang: number;
}
export interface Platz { readonly pfad: string; readonly polygon: Polygon; readonly material: "square" | "path" | "grass" | "forest" }
export interface FleckBau { readonly baue: readonly Bau[]; readonly plaetze: readonly Platz[]; readonly gassen: readonly Gasse[]; readonly hoefe: readonly Polygon[] }
export interface ParzellenAuftrag {
  readonly nr: number; readonly pfad: string; readonly zelle: Polygon; readonly rolle: Rolle; readonly vorstadt: boolean;
  readonly art: "weiler" | "dorf" | "stadt"; readonly randStrassen: readonly Gasse[];
  /** Einrückung je Zellkante (Zählung wie `einwaertsKanten`): Straßenbreite, Mauerabstand. */
  readonly abstaende: readonly number[];
  /** Mittlere Losgröße der Stadt; die Rolle skaliert sie (`ROLLEN_FAKTOR`). */
  readonly losFlaeche: number; readonly strassenDichte: number;
  readonly hindernisse: readonly Polygon[]; readonly nurAnHaupt: boolean;
  readonly r: Zufall; readonly id: (...pfad: string[]) => string;
}

/** Wie groß ein Los im Verhältnis zum Stadtmittel ist. */
export const ROLLEN_FAKTOR: Readonly<Record<Rolle, number>> = Object.freeze({ wohnen: 1, markt: 1.1, handwerk: 1.35, hafen: 1.8, adel: 3, arm: .65, frei: 1, burg: 2, tempel: 1.2 });
interface Mass { readonly zeile: boolean; readonly fuge: number; readonly hof: number; readonly tiefe: number }
const MASS: Readonly<Record<Rolle, Mass>> = Object.freeze({
  wohnen: { zeile: true, fuge: .05, hof: .08, tiefe: 2.2 }, markt: { zeile: true, fuge: .05, hof: .1, tiefe: 2.4 },
  handwerk: { zeile: true, fuge: .07, hof: .15, tiefe: 2.6 }, hafen: { zeile: true, fuge: .09, hof: 0, tiefe: 3 },
  adel: { zeile: false, fuge: .12, hof: .5, tiefe: 3 }, arm: { zeile: true, fuge: .04, hof: 0, tiefe: 1.8 },
  frei: { zeile: false, fuge: .1, hof: 0, tiefe: 2 }, burg: { zeile: false, fuge: .1, hof: 0, tiefe: 2 }, tempel: { zeile: true, fuge: .06, hof: .1, tiefe: 2.2 },
});
const GASSE = .3;

function zerteile(poly: Polygon, los: number, block: number, pfad: string, tiefe: number, a: ParzellenAuftrag, lose: { poly: Polygon; pfad: string }[], gassen: Gasse[]): void {
  const f = flaeche(poly);
  if (f <= los * 1.35 || tiefe > 12) { lose.push({ poly: poly.map(qp), pfad }); return; }
  const mitGasse = f > block && tiefe < 4;
  const h = halbiere(poly, a.r.zahl(.38, .62), a.r.zahl(-.14, .14), mitGasse ? GASSE : 0);
  if (!h) { lose.push({ poly: poly.map(qp), pfad }); return; }
  if (mitGasse && h.luecke.length >= 3)
    gassen.push({ id: a.id("gasse", pfad, "quer"), art: "gasse", a: a.nr, b: a.nr, von: qp(h.von), bis: qp(h.bis), band: h.luecke.map(qp) });
  zerteile(h.a, los, block, `${pfad}.a`, tiefe + 1, a, lose, gassen);
  zerteile(h.b, los, block, `${pfad}.b`, tiefe + 1, a, lose, gassen);
}

/** Die nächste Straße vor einem Los — oder `null`, wenn es innen liegt. Die Schwelle ist die
 *  Bandbreite: ein einseitiges Band liegt ganz neben seiner Mittellinie, ein zweiseitiges halb. */
function vorDerTuer(los: Polygon, strassen: readonly Gasse[]): Gasse | null {
  let beste: Gasse | null = null, besterAbstand = Infinity;
  for (const s of strassen) { const d = abstandPolygonStrecke(los, s.von, s.bis); if (d < besterAbstand) { besterAbstand = d; beste = s; } }
  if (!beste) return null;
  const laenge = Math.sqrt((beste.bis[0] - beste.von[0]) ** 2 + (beste.bis[1] - beste.von[1]) ** 2) || 1;
  return besterAbstand <= flaeche(beste.band) / laenge + .35 ? beste : null;
}

/** Zeilenhaus: das Los ohne Fuge, hinten auf `tiefe` gekappt — der Rest ist Hinterhof. */
function zeilenhaus(los: Polygon, gasse: Gasse, fuge: number, tiefe: number): Polygon {
  const innen = einwaerts(los, fuge);
  if (innen.length < 3) return [];
  const dx = gasse.bis[0] - gasse.von[0], dy = gasse.bis[1] - gasse.von[1], l = Math.sqrt(dx * dx + dy * dy) || 1;
  let nx = -dy / l, ny = dx / l;
  const s = schwerpunkt(los);
  if (nx * (s[0] - gasse.von[0]) + ny * (s[1] - gasse.von[1]) < 0) { nx = -nx; ny = -ny; }
  const front = Math.min(...innen.map(p => nx * p[0] + ny * p[1]));
  return clipHalbebene(innen, nx, ny, front + tiefe).map(qp);
}

/** Längste Kante als Achse, dazu die Ausdehnung längs und quer. */
export function achse(poly: Polygon): { readonly u: Punkt; readonly laenge: number; readonly breite: number } {
  let beste = 0, bl = -1;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[(i + poly.length - 1) % poly.length]!, b = poly[i]!, l = Math.sqrt((b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2);
    if (l > bl) { bl = l; beste = i; }
  }
  const a = poly[(beste + poly.length - 1) % poly.length]!, b = poly[beste]!, u: Punkt = [(b[0] - a[0]) / bl, (b[1] - a[1]) / bl];
  const along = poly.map(p => p[0] * u[0] + p[1] * u[1]), across = poly.map(p => -p[0] * u[1] + p[1] * u[0]);
  return { u, laenge: Math.max(...along) - Math.min(...along), breite: Math.max(...across) - Math.min(...across) };
}
export function rechteck(m: Punkt, u: Punkt, laenge: number, breite: number): Polygon {
  const n: Punkt = [-u[1], u[0]];
  return ([[-1, -1], [1, -1], [1, 1], [-1, 1]] as const).map(([x, y]) => qp([m[0] + u[0] * x * laenge / 2 + n[0] * y * breite / 2, m[1] + u[1] * x * laenge / 2 + n[1] * y * breite / 2]));
}
/** Kreuzgrundriss: Langhaus entlang `u`, Querhaus nach drei Achteln. Zwölf Ecken. */
function kreuz(mitte: Punkt, u: Punkt, laenge: number, breite: number): Polygon {
  const n: Punkt = [-u[1], u[0]], L = laenge / 2, W = breite / 2, qa = L * .38, T = breite * .45, WQ = breite * 1.15;
  const at = (x: number, y: number): Punkt => qp([mitte[0] + u[0] * x + n[0] * y, mitte[1] + u[1] * x + n[1] * y]);
  return [at(-L, -W), at(qa - T, -W), at(qa - T, -WQ), at(qa + T, -WQ), at(qa + T, -W), at(L, -W), at(L, W), at(qa + T, W), at(qa + T, WQ), at(qa - T, WQ), at(qa - T, W), at(-L, W)];
}
/** Ein Platz um Bauten herum: was vom Fleck bleibt, wenn man die (konvexen) Bauteile abzieht. */
export function platzUm(innen: Polygon, bauteile: readonly Polygon[], pfad: string, material: Platz["material"]): Platz[] {
  let stuecke: Polygon[] = [innen];
  for (const teil of bauteile) stuecke = stuecke.flatMap(s => ohne(s, teil));
  return stuecke.filter(s => s.length >= 3 && flaeche(s) > .05).map((polygon, i) => ({ pfad: `${pfad}.platz.${i}`, polygon: polygon.map(qp), material }));
}
const groesster = (plaetze: readonly Platz[]) => plaetze.reduce((best, p) => flaeche(p.polygon) > flaeche(best.polygon) ? p : best, plaetze[0]!);

export function bebaueFleck(a: ParzellenAuftrag): FleckBau {
  const innen = einwaertsKanten(a.zelle, a.abstaende).map(qp);
  const leer: FleckBau = { baue: [], plaetze: [], gassen: [], hoefe: [] };
  if (innen.length < 3 || flaeche(innen) < .6) return leer;
  const nass = (p: Polygon) => a.hindernisse.some(w => flaeche(schnittKonvex(p, w)) > 1e-6);

  if (a.rolle === "frei") return { ...leer, plaetze: [{ pfad: `${a.pfad}.park`, polygon: innen, material: "forest" }] };
  if (a.rolle === "markt" && a.art !== "weiler") {
    if (a.art === "stadt" && !nass(innen)) {
      const { u, laenge, breite } = achse(innen), m = schwerpunkt(innen);
      const halle = rechteck(m, u, Math.min(laenge * .34, 3.2), Math.min(breite * .26, 2.2));
      if (halle.every(p => imPolygon(p, innen))) {
        const plaetze = platzUm(innen, [rechteck(m, u, Math.min(laenge * .34, 3.2) + .7, Math.min(breite * .26, 2.2) + .7)], a.pfad, "square");
        if (plaetze.length) return { ...leer, plaetze, baue: [{ pfad: `${a.pfad}.rathaus`, umriss: halle, los: halle, strasse: a.id("markt", groesster(plaetze).pfad), typ: "rathaus", titel: "Rathaus", rang: 0 }] };
      }
    }
    // Dorf: der Anger — eine Wiese; Kirche und Taverne stehen an seinem Rand (Nachbarflecken).
    return { ...leer, plaetze: [{ pfad: `${a.pfad}.anger`, polygon: innen, material: a.art === "stadt" ? "square" : "grass" }] };
  }
  if (a.rolle === "tempel" && !nass(innen)) {
    const { u, laenge, breite } = achse(innen), m = schwerpunkt(innen);
    for (const s of [1, .85, .72, .6]) {
      const L = laenge * .62 * s, W = Math.min(breite * .26, laenge * .2) * s, dom = kreuz(m, u, L, W);
      if (!dom.every(p => imPolygon(p, innen))) continue;
      const quer: Punkt = [m[0] + u[0] * L / 2 * .38, m[1] + u[1] * L / 2 * .38];
      const plaetze = platzUm(innen, [rechteck(m, u, L + .5, W + .5), rechteck(quer, u, W * .9 + .5, W * 2.3 + .5)], a.pfad, "square");
      if (!plaetze.length) continue;
      return { ...leer, plaetze, baue: [{ pfad: `${a.pfad}.dom`, umriss: dom, los: innen, strasse: a.id("markt", groesster(plaetze).pfad), typ: "kirche", rang: 0 }] };
    }
  }

  const mass = MASS[a.rolle], losZiel = a.losFlaeche * ROLLEN_FAKTOR[a.rolle] * (a.vorstadt ? 1.4 : 1);
  const block = losZiel * (10 - a.strassenDichte * 5);
  const lose: { poly: Polygon; pfad: string }[] = [], gassen: Gasse[] = [], hoefe: Polygon[] = [], baue: Bau[] = [];
  zerteile(innen, losZiel, block, a.pfad, 0, a, lose, gassen);
  const strassen = a.nurAnHaupt ? a.randStrassen.filter(s => s.art === "hauptstrasse") : [...a.randStrassen, ...gassen];
  for (const los of lose) {
    const tuer = vorDerTuer(los.poly, strassen);
    if (!tuer || nass(los.poly)) { hoefe.push(los.poly); continue; }
    let umriss: Polygon;
    if (mass.zeile && !a.vorstadt) umriss = zeilenhaus(los.poly, tuer, mass.fuge, mass.tiefe);
    else {
      const gross = flaeche(los.poly) > losZiel * 1.6;
      const form: Hausform = gross && a.r.chance(mass.hof) ? (a.r.chance(.5) ? "u" : "l") : "rechteck";
      const w = Math.max(.65, Math.min(3.2, Math.sqrt(flaeche(los.poly)) * a.r.zahl(.6, .78)));
      umriss = hausImLos(einwaerts(los.poly, .09), tuer, w, w * a.r.zahl(.8, 1.25), form);
    }
    if (umriss.length < 3 || flaeche(umriss) < .2 || nass(umriss) || baue.some(b => !getrennteDaecher(b.umriss, umriss))) { hoefe.push(los.poly); continue; }
    const s = schwerpunkt(los.poly);
    baue.push({ pfad: `${los.pfad}.los.${q(s[0])}_${q(s[1])}`, umriss: umriss.map(qp), los: los.poly, strasse: tuer.id, typ: null, rang: 2 });
  }
  return { baue, plaetze: [], gassen, hoefe };
}
