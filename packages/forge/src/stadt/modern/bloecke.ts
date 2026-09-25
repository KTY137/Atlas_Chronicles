// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import type { BauwerkTyp } from "@chronicle/szene";
import { abstandPolygonStrecke, clipHalbebene, einwaerts, einwaertsKanten, flaeche, imPolygon, q, qp, schnittKonvex, schwerpunkt, type Polygon, type Punkt } from "../../polygon.ts";
import { frontParzellen, getrennteDaecher, hausImLos, type Gasse } from "../gemeinsam.ts";
import { vieleck } from "../kreis.ts";
import { achse, platzUm, rechteck, vorDerTuer, type Bau, type FleckBau, type ParzellenAuftrag, type Platz } from "../viertel/parzellen.ts";
import { raster, type Block } from "./raster.ts";

/**
 * **Ein heutiger Stadtteil wird bebaut** (Spec 2026-09-23-stadt-zukunft, 5.4). Der Stadtteil
 * bekommt ein gedrehtes Straßenraster, jeder Block wird nach der Rolle des Stadtteils gefüllt:
 * Hochhäuser und ein Rathausplatz in der Innenstadt, Blockrand mit grünem Hof im Kern,
 * Einfamilienhäuser mit Garten draußen, Zeilenbauten, Villen, Gewerbehallen, Schule und Klinik,
 * Ämter, Parks. Jedes Haus hat eine Straße vor seinem Los.
 */
type Schluessel = "markt" | "kern" | "aussen" | "arm" | "adel" | "handwerk" | "hafen" | "tempel" | "burg";
const MASCHE: Readonly<Record<Schluessel, readonly [number, number]>> = {
  markt: [5, 5], kern: [5.2, 6.4], aussen: [4.4, 7], arm: [6.5, 8], adel: [7, 8], handwerk: [8, 9], hafen: [8, 9], tempel: [7, 7], burg: [7, 7],
};
const zwischen = (poly: Polygon, d: Punkt, lo: number, hi: number): Polygon =>
  poly.length < 3 ? [] : clipHalbebene(clipHalbebene(poly, d[0], d[1], hi), -d[0], -d[1], -lo);
const einheit = (a: Punkt, b: Punkt): Punkt => { const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; return [(b[0] - a[0]) / l, (b[1] - a[1]) / l]; };

/** Die Richtung des Rasters: die längste Hauptstraße am Rand, sonst die längste Randstraße, sonst die längste Kante. */
function rasterRichtung(a: ParzellenAuftrag, innen: Polygon): Punkt {
  const laenge = (s: Gasse) => Math.hypot(s.bis[0] - s.von[0], s.bis[1] - s.von[1]);
  const haupt = a.randStrassen.filter(s => s.art === "hauptstrasse").sort((x, y) => laenge(y) - laenge(x) || (x.id < y.id ? -1 : 1))[0]
    ?? [...a.randStrassen].sort((x, y) => laenge(y) - laenge(x) || (x.id < y.id ? -1 : 1))[0];
  if (haupt) return einheit(haupt.von, haupt.bis);
  return achse(innen).u;
}

/** Blockkanten, an denen eine Straße liegt, längste zuerst: Anfang, Richtung, Länge, Normale nach innen. */
function fronten(block: Polygon, strassen: readonly Gasse[]) {
  const m = schwerpunkt(block), result: { a: Punkt; t: Punkt; n: Punkt; laenge: number }[] = [];
  block.forEach((p, i) => {
    const b = block[(i + 1) % block.length]!, laenge = Math.hypot(b[0] - p[0], b[1] - p[1]);
    if (laenge < 1.5) return;
    const mitte: Punkt = [(p[0] + b[0]) / 2, (p[1] + b[1]) / 2];
    if (!strassen.some(s => abstandPolygonStrecke([mitte], s.von, s.bis) <= flaeche(s.band) / (Math.hypot(s.bis[0] - s.von[0], s.bis[1] - s.von[1]) || 1) + .35)) return;
    const t = einheit(p, b); let n: Punkt = [-t[1], t[0]];
    if ((m[0] - p[0]) * n[0] + (m[1] - p[1]) * n[1] < 0) n = [-n[0], -n[1]];
    result.push({ a: p, t, n, laenge });
  });
  return result.sort((x, y) => y.laenge - x.laenge);
}
const kanten = (block: Polygon) => block.flatMap((p, i) => { const b = block[(i + 1) % block.length]!; return Math.hypot(b[0] - p[0], b[1] - p[1]) >= 1.5 ? [{ von: p, bis: b }] : []; });
/** Das größte Rechteck entlang `u` um `m`, das in `poly` passt — in drei Stufen geschrumpft. */
function passend(poly: Polygon, m: Punkt, u: Punkt, laenge: number, breite: number): Polygon {
  for (const s of [1, .82, .66, .5]) {
    const r = rechteck(m, u, laenge * s, breite * s);
    if (r.every(p => imPolygon(p, poly))) return r;
  }
  return [];
}

export function bebaueStadtteil(a: ParzellenAuftrag): FleckBau {
  const innen = einwaertsKanten(a.zelle, a.abstaende).map(qp);
  const leer: FleckBau = { baue: [], plaetze: [], gassen: [], hoefe: [] };
  if (innen.length < 3 || flaeche(innen) < .6) return leer;
  const nass = (p: Polygon) => a.hindernisse.some(w => flaeche(schnittKonvex(p, w)) > 1e-6);
  const s = Math.max(.6, Math.min(1.35, Math.sqrt(a.losFlaeche / 7)));
  const baue: Bau[] = [], plaetze: Platz[] = [], hoefe: Polygon[] = [];
  const u = rasterRichtung(a, innen), v: Punkt = [-u[1], u[0]];

  if (a.rolle === "frei") {
    // Park: Rasen, zwei Wege über Kreuz, Baumgruppen in den vier Feldern.
    if (nass(innen)) return leer;
    const m = schwerpunkt(innen), cu = m[0] * u[0] + m[1] * u[1], cv = m[0] * v[0] + m[1] * v[1], w = .25;
    plaetze.push({ pfad: `${a.pfad}.park`, polygon: innen, material: "grass" });
    const wege = [zwischen(innen, v, cv - w, cv + w), zwischen(zwischen(innen, u, cu - w, cu + w), v, -Infinity, cv - w), zwischen(zwischen(innen, u, cu - w, cu + w), v, cv + w, Infinity)];
    for (const [k, weg] of wege.entries()) if (weg.length >= 3 && flaeche(weg) > .3) plaetze.push({ pfad: `${a.pfad}.weg.${k}`, polygon: weg.map(qp), material: "path" });
    const ausU = innen.map(p => p[0] * u[0] + p[1] * u[1] - cu), ausV = innen.map(p => p[0] * v[0] + p[1] * v[1] - cv);
    for (const [k, [su, sv]] of ([[1, 1], [1, -1], [-1, 1], [-1, -1]] as const).entries()) {
      const du = (su > 0 ? Math.max(...ausU) : Math.min(...ausU)) * .5, dv = (sv > 0 ? Math.max(...ausV) : Math.min(...ausV)) * .5;
      const radius = Math.min(1.6, Math.abs(du) * .6, Math.abs(dv) * .6);
      if (radius < .6) continue;
      const hain = vieleck([m[0] + u[0] * du + v[0] * dv, m[1] + u[1] * du + v[1] * dv], radius, 12);
      if (hain.every(p => imPolygon(p, innen))) plaetze.push({ pfad: `${a.pfad}.hain.${k}`, polygon: hain, material: "forest" });
    }
    return { ...leer, plaetze };
  }

  const schluessel: Schluessel = a.rolle === "wohnen" ? (a.vorstadt || a.art !== "stadt" ? "aussen" : "kern") : a.rolle;
  const [mu, mv] = MASCHE[schluessel];
  const netz = a.art === "weiler" ? { strassen: [], bloecke: [{ pfad: `${a.pfad}.b`, poly: innen }], gruen: [] }
    : raster(a, innen, u, mu * s, mv * s, a.art === "stadt" ? .65 : .6);
  const strassen = [...a.randStrassen, ...netz.strassen];
  for (const [k, g] of netz.gruen.entries()) plaetze.push({ pfad: `${a.pfad}.gruen.${k}`, polygon: g, material: "grass" });
  const setze = (pfad: string, umriss: Polygon, los: Polygon, tuer: Gasse | string, typ: BauwerkTyp | null, rang: number, titel?: string): boolean => {
    if (umriss.length < 3 || flaeche(umriss) < .2 || nass(umriss) || baue.some(b => !getrennteDaecher(b.umriss, umriss))) return false;
    // Ein Los, das ins Wasser reicht, wäre über dem Fluss gezeichnet: dann ist das Haus sein eigenes Los.
    baue.push({ pfad, umriss: umriss.map(qp), los: (nass(los) ? umriss : los).map(qp), strasse: typeof tuer === "string" ? tuer : tuer.id, typ, rang, ...(titel ? { titel } : {}) });
    return true;
  };
  const losPfad = (los: Polygon, zusatz = "los") => { const m = schwerpunkt(los); return `${a.pfad}.${zusatz}.${q(m[0])}_${q(m[1])}`; };
  // Der Block, der der Mitte des Stadtteils am nächsten liegt, trägt den Platz.
  const mitte = schwerpunkt(innen);
  const bloecke = [...netz.bloecke].sort((x, y) => {
    const dx = schwerpunkt(x.poly), dy = schwerpunkt(y.poly);
    return Math.hypot(dx[0] - mitte[0], dx[1] - mitte[1]) - Math.hypot(dy[0] - mitte[0], dy[1] - mitte[1]) || (x.pfad < y.pfad ? -1 : 1);
  });

  /** Häuser mit Garten: Lose in Reihe an jeder Straßenseite des Blocks, das Haus vorn, der Garten hinten. */
  const einfamilien = (b: Block, frontage: number, breite: number, tiefe: number, typ: BauwerkTyp | null, lform: number) => {
    const lose = frontParzellen(b.poly, kanten(b.poly), frontage, tiefe * 2.2, a.r);
    for (const los of lose) {
      const tuer = vorDerTuer(los, strassen);
      if (!tuer || nass(los)) { hoefe.push(los); continue; }
      const b0 = breite * a.r.zahl(.9, 1.1), t0 = tiefe * a.r.zahl(.9, 1.1), innenLos = einwaerts(los, .12);
      // Ein Ecklos ist schräg geschnitten; passt kein Haus an die Front, steht ein kleineres in seiner Mitte.
      const umriss = hausImLos(innenLos, tuer, b0, t0, a.r.chance(lform) ? "l" : "rechteck");
      const haus = umriss.length ? umriss : innenLos.length >= 3 ? passend(innenLos, schwerpunkt(innenLos), einheit(tuer.von, tuer.bis), b0 * .85, t0 * .85) : [];
      if (!setze(losPfad(los), haus, los, tuer, typ, 2)) hoefe.push(los);
    }
    const garten = einwaerts(b.poly, tiefe * 2.2 + .1);
    if (garten.length >= 3 && flaeche(garten) >= 1 && !nass(garten)) plaetze.push({ pfad: `${b.pfad}.garten`, polygon: garten.map(qp), material: "grass" });
  };
  const blockrand = (b: Block, frontage: number, tiefe: number, typ: BauwerkTyp | null) => {
    const lose = frontParzellen(b.poly, kanten(b.poly), frontage, tiefe, a.r);
    for (const los of lose) {
      const tuer = vorDerTuer(los, strassen);
      if (!tuer || nass(los)) { hoefe.push(los); continue; }
      if (!setze(losPfad(los), einwaerts(los, .05), los, tuer, typ, 2)) hoefe.push(los);
    }
    const hof = einwaerts(b.poly, tiefe + .12);
    if (hof.length >= 3 && flaeche(hof) >= 1 && !nass(hof)) plaetze.push({ pfad: `${b.pfad}.hof`, polygon: hof.map(qp), material: "grass" });
  };
  /** Hallen stehen an der Straße: eine Reihe an jeder der zwei längsten Straßenseiten, lange Seiten
   *  mit zwei Hallen und einer Zufahrt dazwischen. Der Hof dahinter bleibt Lagerfläche. */
  const hallen = (b: Block, typ: BauwerkTyp | null) => {
    const seiten = fronten(b.poly, strassen).slice(0, 2);
    if (!seiten.length) { hoefe.push(b.poly); return; }
    for (const front of seiten) {
      const tiefe = Math.max(...b.poly.map(p => (p[0] - front.a[0]) * front.n[0] + (p[1] - front.a[1]) * front.n[1]));
      const c0 = front.a[0] * front.n[0] + front.a[1] * front.n[1], belegt = .4;
      const mitteKante: Punkt = [front.a[0] + front.t[0] * front.laenge / 2, front.a[1] + front.t[1] * front.laenge / 2];
      const zwei = front.laenge > 6 * s * 2 + 1.6, l = zwei ? (front.laenge * .86 - 1) / 2 : Math.min(front.laenge * .8, 6 * s);
      const tm = mitteKante[0] * front.t[0] + mitteKante[1] * front.t[1];
      const spalten: readonly (readonly [number, number, number])[] = zwei ? [[-(l / 2 + .5), -Infinity, tm], [l / 2 + .5, tm, Infinity]] : [[0, -Infinity, Infinity]];
      const d0 = Math.min((tiefe - belegt) * (seiten.length > 1 ? .42 : .6), 3.6 * s);
      if (d0 < 1.2) continue;
      for (const [versatz, von, bis] of spalten) {
        // Am Ufer rückt die Halle zur Straße, bis sie trocken steht.
        for (const anteil of [1, .75, .55]) {
          const dd = d0 * anteil, m: Punkt = [mitteKante[0] + front.t[0] * versatz + front.n[0] * (belegt + dd / 2), mitteKante[1] + front.t[1] * versatz + front.n[1] * (belegt + dd / 2)];
          const halle = passend(b.poly, m, front.t, l, dd), los = zwischen(zwischen(b.poly, front.n, c0 + belegt - .4, c0 + belegt + dd + .4), front.t, von, bis);
          const tuer = los.length >= 3 ? vorDerTuer(los, strassen) : null;
          if (halle.length && tuer && !nass(halle) && setze(losPfad(los, "halle"), halle, los, tuer, typ, 2)) break;
        }
      }
    }
  };

  for (const [k, b] of bloecke.entries()) {
    const { u: ub, laenge: L, breite: B } = achse(b.poly), m = schwerpunkt(b.poly);
    if (schluessel === "markt") {
      if (k === 0 && a.art === "stadt" && !nass(b.poly)) {
        const rathaus = passend(b.poly, m, ub, Math.min(L * .34, 3.4), Math.min(B * .3, 2.4));
        const platz = rathaus.length ? platzUm(b.poly, [rechteck(m, ub, Math.min(L * .34, 3.4) + .7, Math.min(B * .3, 2.4) + .7)], b.pfad, "square") : [];
        if (platz.length) {
          plaetze.push(...platz);
          const groesster = platz.reduce((x, y) => flaeche(y.polygon) > flaeche(x.polygon) ? y : x);
          setze(`${b.pfad}.rathaus`, rathaus, rathaus, a.id("markt", groesster.pfad), "rathaus", 0, "Rathaus");
          continue;
        }
      }
      if (k === 0 && a.art === "dorf" && !nass(b.poly)) { plaetze.push({ pfad: `${b.pfad}.platz`, polygon: b.poly, material: "square" }); continue; }
      if (a.art !== "stadt") { einfamilien(b, 2.1 * s, 1.5 * s, 1.35 * s, "haus", 0); continue; }
      // Hochhäuser: ein Turm je Blockhälfte, wenn der Block lang genug ist. Rang 1, damit die
      // Pflichtbauten (Klinik, Wache …) nicht ausgerechnet die Türme der Innenstadt übernehmen.
      const tuer = vorDerTuer(b.poly, strassen), lt = Math.min(4.2 * s, L * .6), bt = Math.min(B * .55, 3.2 * s);
      const orte: Punkt[] = L > lt * 2.3 ? [-1, 1].map(sg => [m[0] + ub[0] * sg * L / 4, m[1] + ub[1] * sg * L / 4] as Punkt) : [m];
      let gebaut = 0;
      for (const [x, o] of orte.entries()) {
        const turm = passend(b.poly, o, ub, orte.length > 1 ? Math.min(lt, L * .4) : lt, bt);
        const los = orte.length > 1 ? zwischen(b.poly, ub, x === 0 ? -Infinity : m[0] * ub[0] + m[1] * ub[1], x === 0 ? m[0] * ub[0] + m[1] * ub[1] : Infinity) : b.poly;
        if (tuer && los.length >= 3 && setze(losPfad(los, "turm"), turm, los, vorDerTuer(los, strassen) ?? tuer, x === 0 ? "buero" : null, 1)) gebaut++;
      }
      if (!gebaut) hoefe.push(b.poly);
    } else if (schluessel === "kern") blockrand(b, 2.3 * s, 1.8 * s, null);
    else if (schluessel === "aussen") einfamilien(b, 2.1 * s, 1.5 * s, 1.35 * s, a.art === "weiler" ? null : "haus", .15);
    else if (schluessel === "adel") einfamilien(b, 3.4 * s, 2.3 * s, 1.9 * s, null, .35);
    else if (schluessel === "arm") {
      const front = fronten(b.poly, strassen)[0], tuer = vorDerTuer(b.poly, strassen);
      if (!front || !tuer) { hoefe.push(b.poly); continue; }
      const tiefe = Math.max(...b.poly.map(p => (p[0] - front.a[0]) * front.n[0] + (p[1] - front.a[1]) * front.n[1]));
      const t0 = front.a[0] * front.t[0] + front.a[1] * front.t[1];
      for (let x = .6; x + 1.5 <= front.laenge - .4; x += 3.4) {
        const los = zwischen(b.poly, front.t, t0 + x - .9, t0 + x + 2.5);
        for (const l of [Math.min(6.5, tiefe - .5), Math.min(6.5, tiefe - .5) * .6]) {
          if (l < 2.4) break;
          const c: Punkt = [front.a[0] + front.t[0] * (x + .75) + front.n[0] * (.3 + l / 2), front.a[1] + front.t[1] * (x + .75) + front.n[1] * (.3 + l / 2)];
          const riegel = rechteck(c, front.n, l, 1.5);
          if (riegel.every(p => imPolygon(p, b.poly)) && los.length >= 3 && setze(losPfad(los, "zeile"), riegel, los, tuer, "wohnblock", 2)) break;
        }
      }
    } else if (schluessel === "handwerk" || schluessel === "hafen") hallen(b, schluessel === "hafen" ? "lager" : null);
    else if (schluessel === "tempel") {
      const tuer = vorDerTuer(b.poly, strassen);
      const bau = tuer ? hausImLos(b.poly, tuer, Math.min(L * .6, 8), Math.min(B * .45, 4.5), "u") : [];
      // Ein Krankenhaus und eine Schule je Stadtteil; die übrigen Blöcke sind Wohnblöcke am Rand.
      if (k > 1 || !tuer || !setze(`${b.pfad}.campus`, bau, b.poly, tuer, k === 0 ? "krankenhaus" : "schule", 0)) blockrand(b, 2.3 * s, 1.8 * s, "wohnblock");
    } else {
      const lose = frontParzellen(b.poly, kanten(b.poly), 6 * s, 3.2, a.r), aemter: BauwerkTyp[] = ["rathaus", "polizei", "feuerwache"];
      for (const los of lose) {
        const tuer = vorDerTuer(los, strassen);
        if (!tuer) { hoefe.push(los); continue; }
        const typ = aemter.shift() ?? null;
        if (!setze(losPfad(los, "amt"), einwaerts(los, .08), los, tuer, typ, typ ? 0 : 2)) { if (typ) aemter.unshift(typ); hoefe.push(los); }
      }
      const hof = einwaerts(b.poly, 3.3);
      if (hof.length >= 3 && flaeche(hof) >= 1 && !nass(hof)) plaetze.push({ pfad: `${b.pfad}.hof`, polygon: hof.map(qp), material: "square" });
    }
  }
  return { baue, plaetze, gassen: netz.strassen, hoefe };
}
