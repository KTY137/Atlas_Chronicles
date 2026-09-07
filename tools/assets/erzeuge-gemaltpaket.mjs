#!/usr/bin/env node
// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
// Authors `assets/packs/pk.gemalt` — die gemalte Battlemap-Schwester von `pk.grundriss`.
//
// Gleiche Namen, gleiche Footprints, andere Hand. Weil `Stamp.a` paketqualifiziert ist, ist der
// Wechsel zwischen beiden ein Tausch der Paket-Id und sonst nichts: `pk.grundriss/truhe` und
// `pk.gemalt/truhe` bezeichnen dieselbe Truhe an derselben Stelle in zwei Stilen. Die Tusche
// bleibt für die Übersichtskarte richtig, wo ein Symbol bei 16 px lesbar sein muss; gemalt ist
// richtig, wo man auf den Tisch zoomt.
//
// Zur Technik und zur Lizenzfrage siehe den Kopf von `tools/assets/pinsel.mjs`.
//
// **Jede `id` trägt den Assetnamen als Präfix.** Gefunden beim Nebeneinanderlegen: zwei Assets
// hatten beide `id="woelbung"`, und in einem Dokument, das mehrere Paket-SVGs einbettet, gewinnt
// das erste — die Säule bekam die Holzmaserung des Fasses. In der Anwendung lädt jedes Asset als
// eigenes Bild und die Kollision kann nicht auftreten; ein Kontaktbogen ist aber ein völlig
// legitimer Anblick, und ein Asset, das nur allein richtig aussieht, ist nicht fertig.
//
// Run: node tools/assets/erzeuge-gemaltpaket.mjs [--pruefe]

import { join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  zufallFabrik, n, rect, circle, ellipse, line, path, poly, polyline, group, svg,
  klumpen, erzeugePaket, cc0Text,
} from "./tusche.mjs";
import { M, korn, flecken, weichzeichner, verlauf, rundverlauf, defs, fuge, grund, mische } from "./pinsel.mjs";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const PAKET_ID = "pk.gemalt";
const PAKET_VERSION = "1.1.0";
const PAKET_DIR = join(ROOT, "assets", "packs", PAKET_ID);
const ZELLE = 64;
const URHEBER = "Chronicle";

const zufall = zufallFabrik(PAKET_ID);
/** Namensraum für die `defs` eines Assets. Siehe Dateikopf: ohne Präfix kollidieren sie. */
const kennung = (name) => (teil) => `${name}-${teil}`;

// ---------------------------------------------------------------------------------------------
// Böden — kachelbar. Innen darf alles zittern, die vier Ränder nicht.
//
// Die Kachelprobe (4x4 nebeneinander) ist Teil der Arbeit, nicht die Kür: eine Kachel kann
// nahtlos **und** trotzdem falsch sein, wenn ein auffälliges Einzelmerkmal darin sitzt. Das liest
// sich gekachelt als Punktraster. Deshalb sitzen Äste, Blöcke und Flecken hier entweder auf der
// Kante (laufen also über) oder sind so gedämpft, dass sie sich nicht zum Muster addieren.
// ---------------------------------------------------------------------------------------------

function bodenStein(name) {
  const r = zufall(name), q = kennung(name);
  const reihen = [15, 17, 16, 16];
  const teile = [grund(ZELLE, M.steinTief, q("korn"))];
  let y = 0;
  for (const hoehe of reihen) {
    const schnitte = [0];
    let x = r.zahl(13, 22);
    while (x < ZELLE - 10) { schnitte.push(Math.round(x * 10) / 10); x += r.zahl(12, 23); }
    schnitte.push(ZELLE);
    for (let i = 0; i < schnitte.length - 1; i++) {
      const x0 = schnitte[i], x1 = schnitte[i + 1];
      // Wert **und** Ton je Platte: nur Helligkeit zu variieren liess das Feld gekachelt grau
      // wirken. Ein Hauch Umbra bzw. Blau bringt den Steinbruch, den die Vorlage zeigt.
      const wert = mische(M.stein, r.zahl(0, 1) > 0.5 ? M.steinHell : M.steinTief, r.zahl(0.08, 0.6));
      const ton = mische(wert, r.zahl(0, 1) > 0.5 ? M.erde : M.wasser, r.zahl(0.03, 0.14));
      teile.push(rect(x0 + 0.8, y + 0.8, x1 - x0 - 1.6, hoehe - 1.6, { fill: ton, rx: 1.6, filter: `url(#${q("korn")})` }));
      teile.push(polyline([[x0 + 1.4, y + hoehe - 1.6], [x0 + 1.4, y + 1.4], [x1 - 1.4, y + 1.4]],
        { stroke: M.steinHell, "stroke-width": 0.9, "stroke-opacity": 0.34, fill: "none" }));
      teile.push(polyline([[x0 + 1.6, y + hoehe - 1.5], [x1 - 1.5, y + hoehe - 1.5], [x1 - 1.5, y + 1.6]],
        { stroke: M.schatten, "stroke-width": 1, "stroke-opacity": 0.3, fill: "none" }));
      if (i > 0) teile.push(fuge(x0, y, x0, y + hoehe, q("weich"), { breite: 1.3 }));
    }
    y += hoehe;
    if (y < ZELLE) teile.push(fuge(0, y, ZELLE, y, q("weich"), { breite: 1.3 }));
  }
  teile.push(rect(0, 0, ZELLE, ZELLE, { fill: M.schatten, "fill-opacity": 0.1, filter: `url(#${q("flecken")})` }));
  return svg("Steinboden, gemalt", ZELLE, ZELLE,
    defs(korn(q("korn"), { frequenz: 0.85, oktaven: 5, saat: 4, staerke: 0.34 }),
      flecken(q("flecken"), { frequenz: 0.035, saat: 21, staerke: 0.55 }),
      weichzeichner(q("weich"), 1.1)) + teile.join(""));
}

function bodenSteinRissig(name) {
  const r = zufall(name), q = kennung(name);
  const teile = [bodenSteinRumpf(name, r, q)];
  // Der Riss betritt bei y=0 und verlässt bei y=ZELLE, damit gestapelte Kacheln ihn fortsetzen.
  const punkte = [[r.zahl(10, 30), 0]];
  let x = punkte[0][0];
  for (let yy = 13; yy < ZELLE; yy += 13) { x = Math.max(5, Math.min(59, x + r.zahl(-8, 9))); punkte.push([x, yy]); }
  punkte.push([Math.max(5, Math.min(59, x + r.zahl(-6, 6))), ZELLE]);
  teile.push(polyline(punkte, { stroke: M.schatten, "stroke-width": 2.6, "stroke-opacity": 0.35, fill: "none", filter: `url(#${q("weich")})` }));
  teile.push(polyline(punkte, { stroke: M.schatten, "stroke-width": 1.1, "stroke-opacity": 0.8, fill: "none", "stroke-linejoin": "round" }));
  return svg("Steinboden rissig, gemalt", ZELLE, ZELLE,
    defs(korn(q("korn"), { frequenz: 0.9, oktaven: 5, saat: 6, staerke: 0.38 }),
      flecken(q("flecken"), { frequenz: 0.03, saat: 26, staerke: 0.6 }),
      weichzeichner(q("weich"), 1.1)) + teile.join(""));
}

/** Der Plattenverband ohne `defs` und ohne SVG-Hülle — von zwei Böden geteilt. */
function bodenSteinRumpf(name, r, q) {
  const teile = [grund(ZELLE, M.steinTief, q("korn"))];
  let y = 0;
  for (const hoehe of [16, 16, 16, 16]) {
    const schnitte = [0];
    let x = r.zahl(12, 21);
    while (x < ZELLE - 10) { schnitte.push(Math.round(x * 10) / 10); x += r.zahl(13, 24); }
    schnitte.push(ZELLE);
    for (let i = 0; i < schnitte.length - 1; i++) {
      const x0 = schnitte[i], x1 = schnitte[i + 1];
      const wert = mische(M.stein, r.zahl(0, 1) > 0.5 ? M.steinHell : M.steinTief, r.zahl(0.1, 0.65));
      teile.push(rect(x0 + 0.8, y + 0.8, x1 - x0 - 1.6, hoehe - 1.6, { fill: mische(wert, M.erde, r.zahl(0.02, 0.16)), rx: 1.4, filter: `url(#${q("korn")})` }));
      teile.push(polyline([[x0 + 1.6, y + hoehe - 1.5], [x1 - 1.5, y + hoehe - 1.5], [x1 - 1.5, y + 1.6]],
        { stroke: M.schatten, "stroke-width": 1, "stroke-opacity": 0.32, fill: "none" }));
      if (i > 0) teile.push(fuge(x0, y, x0, y + hoehe, q("weich"), { breite: 1.2 }));
    }
    y += hoehe;
    if (y < ZELLE) teile.push(fuge(0, y, ZELLE, y, q("weich"), { breite: 1.2 }));
  }
  teile.push(rect(0, 0, ZELLE, ZELLE, { fill: M.schatten, "fill-opacity": 0.14, filter: `url(#${q("flecken")})` }));
  return teile.join("");
}

function bodenHolz(name) {
  const r = zufall(name), q = kennung(name);
  const teile = [grund(ZELLE, M.holzTief, q("korn"))];
  for (let i = 0; i < 4; i++) {
    const y = i * 16;
    const ton = mische(M.holz, i % 2 === 0 ? M.holzHell : M.holzTief, r.zahl(0.1, 0.42));
    teile.push(rect(0, y + 0.9, ZELLE, 16 - 1.8, { fill: ton, filter: `url(#${q("korn")})` }));
    for (let k = 0; k < 3; k++) {
      const yy = y + 3.5 + k * 4.2;
      teile.push(path(`M0 ${n(yy)} Q${n(r.zahl(14, 24))} ${n(yy + r.zahl(-1.6, 1.6))} 32 ${n(yy)} T64 ${n(yy)}`,
        { fill: "none", stroke: M.holzRitze, "stroke-width": r.zahl(0.5, 0.9), "stroke-opacity": r.zahl(0.18, 0.42) }));
    }
    // Nur jede zweite Diele bekommt einen Ast, und der ist flach: vier gleich starke Äste pro
    // Kachel ergaben gekachelt ein Punktraster über den ganzen Boden.
    if (i % 2 === 1) {
      const ax = r.zahl(8, 54);
      teile.push(ellipse(ax, y + 8, 3, 1.9, { fill: M.holzRitze, "fill-opacity": 0.3 }));
      teile.push(ellipse(ax, y + 8, 1.3, 0.85, { fill: M.holzRitze, "fill-opacity": 0.45 }));
    }
    teile.push(fuge(0, y, ZELLE, y, q("weich"), { breite: 1.2, farbe: M.holzRitze }));
  }
  return svg("Dielenboden, gemalt", ZELLE, ZELLE,
    defs(korn(q("korn"), { frequenz: "0.02 1.1", oktaven: 4, saat: 8, staerke: 0.4 }), weichzeichner(q("weich"), 1)) + teile.join(""));
}

function bodenErde(name) {
  const r = zufall(name), q = kennung(name);
  const teile = [grund(ZELLE, M.erde, q("korn"))];
  // Grosse Tonflächen laufen über die Kante hinaus, statt als Insel in der Kachelmitte zu sitzen:
  // eine Insel wiederholt sich sichtbar, ein angeschnittener Fleck verschmilzt mit dem Nachbarn.
  for (const [cx, cy] of [[0, r.zahl(10, 54)], [ZELLE, r.zahl(10, 54)], [r.zahl(10, 54), 0], [r.zahl(10, 54), ZELLE]]) {
    teile.push(poly(klumpen(r, cx, cy, r.zahl(14, 22), 9, 0.32),
      { fill: r.zahl(0, 1) > 0.5 ? M.erdeHell : M.erdeTief, "fill-opacity": r.zahl(0.12, 0.24), filter: `url(#${q("korn")})` }));
  }
  // Steinchen: unregelmässige Vielecke statt Ovale, in Grösse und Ton gestreut, und wenige.
  for (let i = 0; i < 6; i++) {
    const cx = r.zahl(4, 60), cy = r.zahl(4, 60), rad = r.zahl(1.6, 3.8);
    const ton = mische(M.fels, r.zahl(0, 1) > 0.5 ? M.felsHell : M.felsTief, r.zahl(0.1, 0.7));
    const punkte = klumpen(r, cx, cy, rad, r.ganz(4, 6), 0.3);
    teile.push(poly(punkte, { fill: M.schatten, "fill-opacity": 0.28, transform: "translate(0.6 0.8)" }));
    teile.push(poly(punkte, { fill: ton, filter: `url(#${q("korn")})` }));
    teile.push(polyline([punkte[0], [cx, cy]], { stroke: M.felsHell, "stroke-width": 0.6, "stroke-opacity": 0.3, fill: "none" }));
  }
  for (let i = 0; i < 12; i++) {
    const x = r.zahl(3, 58), y = r.zahl(3, 58);
    teile.push(polyline([[x, y], [x + r.zahl(3, 8), y + r.zahl(-3, 4)]], { stroke: M.erdeTief, "stroke-width": 0.7, "stroke-opacity": r.zahl(0.2, 0.45), fill: "none" }));
  }
  teile.push(rect(0, 0, ZELLE, ZELLE, { fill: M.schatten, "fill-opacity": 0.1, filter: `url(#${q("flecken")})` }));
  return svg("Erdboden, gemalt", ZELLE, ZELLE,
    defs(korn(q("korn"), { frequenz: 1.3, oktaven: 5, saat: 12, staerke: 0.5 }),
      flecken(q("flecken"), { frequenz: 0.05, saat: 5, staerke: 0.45 })) + teile.join(""));
}

function bodenFliese(name) {
  const r = zufall(name), q = kennung(name);
  const teile = [grund(ZELLE, M.fuge, q("korn"))];
  // Schachbrett aus Rauten, 16 px Raster: der Verband trifft die Kachelkante exakt.
  for (let gx = 0; gx < 4; gx++) for (let gy = 0; gy < 4; gy++) {
    const x = gx * 16, y = gy * 16, hell = (gx + gy) % 2 === 0;
    const ton = mische(hell ? M.steinHell : M.stein, hell ? M.knochen : M.steinTief, r.zahl(0.1, 0.45));
    teile.push(poly([[x + 8, y + 0.9], [x + 15.1, y + 8], [x + 8, y + 15.1], [x + 0.9, y + 8]],
      { fill: ton, filter: `url(#${q("korn")})` }));
    teile.push(polyline([[x + 0.9, y + 8], [x + 8, y + 0.9], [x + 15.1, y + 8]],
      { stroke: M.knochen, "stroke-width": 0.7, "stroke-opacity": 0.3, fill: "none" }));
    teile.push(polyline([[x + 0.9, y + 8], [x + 8, y + 15.1], [x + 15.1, y + 8]],
      { stroke: M.schatten, "stroke-width": 0.8, "stroke-opacity": 0.34, fill: "none" }));
  }
  teile.push(rect(0, 0, ZELLE, ZELLE, { fill: M.schatten, "fill-opacity": 0.12, filter: `url(#${q("flecken")})` }));
  return svg("Fliesenboden, gemalt", ZELLE, ZELLE,
    defs(korn(q("korn"), { frequenz: 1, oktaven: 4, saat: 33, staerke: 0.3 }),
      flecken(q("flecken"), { frequenz: 0.04, saat: 39, staerke: 0.5 })) + teile.join(""));
}

function bodenWasser(name) {
  const r = zufall(name), q = kennung(name);
  const teile = [grund(ZELLE, M.wasser, q("korn"))];
  teile.push(rect(0, 0, ZELLE, ZELLE, { fill: "url(#" + q("tiefe") + ")" }));
  for (let i = 0; i < 5; i++) {
    const y = 6 + i * 13;
    teile.push(path(`M0 ${n(y)} Q16 ${n(y - r.zahl(2, 5))} 32 ${n(y)} T64 ${n(y)}`,
      { fill: "none", stroke: M.wasserHell, "stroke-width": r.zahl(1, 1.8), "stroke-opacity": r.zahl(0.25, 0.5) }));
  }
  return svg("Flachwasser, gemalt", ZELLE, ZELLE,
    defs(korn(q("korn"), { frequenz: 0.6, oktaven: 4, saat: 41, staerke: 0.26 }),
      rundverlauf(q("tiefe"), [[0, M.wasserHell, 0.22], [1, M.schatten, 0.34]], 0.4, 0.35, 0.85)) + teile.join(""));
}

function bodenFels(name) {
  const r = zufall(name), q = kennung(name);
  const teile = [grund(ZELLE, M.fels, q("korn"))];
  // Gewachsener Fels: grosse, an den Rändern angeschnittene Platten mit Rissen dazwischen.
  for (const [cx, cy] of [[0, 0], [ZELLE, 12], [18, ZELLE], [ZELLE, ZELLE], [0, 40]]) {
    const punkte = klumpen(r, cx, cy, r.zahl(18, 28), 8, 0.26);
    teile.push(poly(punkte, { fill: mische(M.fels, r.zahl(0, 1) > 0.5 ? M.felsHell : M.felsTief, r.zahl(0.15, 0.5)), filter: `url(#${q("korn")})` }));
    teile.push(poly(punkte, { fill: "none", stroke: M.schatten, "stroke-width": 1.3, "stroke-opacity": 0.45, "stroke-linejoin": "round" }));
  }
  for (let i = 0; i < 5; i++) {
    teile.push(polyline([[r.zahl(0, 64), r.zahl(0, 20)], [r.zahl(10, 54), r.zahl(24, 42)], [r.zahl(0, 64), r.zahl(46, 64)]],
      { stroke: M.schatten, "stroke-width": 0.9, "stroke-opacity": 0.3, fill: "none" }));
  }
  teile.push(rect(0, 0, ZELLE, ZELLE, { fill: M.schatten, "fill-opacity": 0.12, filter: `url(#${q("flecken")})` }));
  return svg("Felsboden, gemalt", ZELLE, ZELLE,
    defs(korn(q("korn"), { frequenz: 1.15, oktaven: 5, saat: 47, staerke: 0.46 }),
      flecken(q("flecken"), { frequenz: 0.04, saat: 52, staerke: 0.5 })) + teile.join(""));
}

// ---------------------------------------------------------------------------------------------
// Wände — ein Segment füllt eine Zelle, Ränder gepinnt, damit gereihte Kopien stossen
// ---------------------------------------------------------------------------------------------

function wandStein(name) {
  const r = zufall(name), q = kennung(name);
  const teile = [rect(0, 18, ZELLE, 28, { fill: M.steinTief, filter: `url(#${q("korn")})` })];
  for (const [y0, versatz, hoehe] of [[18, 0, 14], [32, 10, 14]]) {
    for (let x = versatz; x < ZELLE - 2; x += 21) {
      const b = Math.min(20, ZELLE - x - 1);
      teile.push(rect(x + 0.7, y0 + 0.7, b - 1.4, hoehe - 1.4, { fill: mische(M.stein, r.zahl(0, 1) > 0.5 ? M.steinHell : M.steinTief, r.zahl(0.1, 0.6)), rx: 1.4, filter: `url(#${q("korn")})` }));
      teile.push(polyline([[x + 1.2, y0 + hoehe - 1.3], [x + b - 1.3, y0 + hoehe - 1.3], [x + b - 1.3, y0 + 1.2]],
        { stroke: M.schatten, "stroke-width": 1, "stroke-opacity": 0.34, fill: "none" }));
    }
  }
  teile.push(fuge(0, 32, ZELLE, 32, q("weich"), { breite: 1.4 }));
  teile.push(rect(0, 18, ZELLE, 28, { fill: "none", stroke: M.schatten, "stroke-width": 2.2, "stroke-opacity": 0.7 }));
  teile.push(line(0, 19.2, ZELLE, 19.2, { stroke: M.steinHell, "stroke-width": 0.9, "stroke-opacity": 0.3 }));
  return svg("Wand Stein, gemalt", ZELLE, ZELLE,
    defs(korn(q("korn"), { frequenz: 0.9, oktaven: 5, saat: 55, staerke: 0.36 }), weichzeichner(q("weich"), 1.1)) + teile.join(""));
}

function wandHolz(name) {
  const r = zufall(name), q = kennung(name);
  const teile = [rect(0, 18, ZELLE, 28, { fill: M.holzTief, filter: `url(#${q("korn")})` })];
  for (let x = 0; x < ZELLE; x += 8) {
    teile.push(rect(x + 0.5, 18.6, 7, 26.8, { fill: mische(M.holz, r.zahl(0, 1) > 0.5 ? M.holzHell : M.holzTief, r.zahl(0.1, 0.5)), filter: `url(#${q("korn")})` }));
    teile.push(line(x + 0.4, 18.6, x + 0.4, 45.4, { stroke: M.holzRitze, "stroke-width": 0.8, "stroke-opacity": 0.5 }));
  }
  for (const y of [23, 41]) {
    teile.push(rect(0, y - 1.8, ZELLE, 3.6, { fill: M.eisen, "fill-opacity": 0.9, filter: `url(#${q("korn")})` }));
    teile.push(line(0, y - 1.4, ZELLE, y - 1.4, { stroke: M.eisenHell, "stroke-width": 0.7, "stroke-opacity": 0.4 }));
  }
  teile.push(rect(0, 18, ZELLE, 28, { fill: "none", stroke: M.schatten, "stroke-width": 2, "stroke-opacity": 0.7 }));
  return svg("Wand Holz, gemalt", ZELLE, ZELLE,
    defs(korn(q("korn"), { frequenz: "0.04 1.2", oktaven: 4, saat: 59, staerke: 0.4 })) + teile.join(""));
}

function wandFels(name) {
  const r = zufall(name), q = kennung(name);
  const teile = [rect(0, 18, ZELLE, 28, { fill: M.felsTief, filter: `url(#${q("korn")})` })];
  let x = 0;
  while (x < ZELLE) {
    const b = r.zahl(9, 17), h = r.zahl(10, 16), y = 19 + r.zahl(0, 26 - h);
    const punkte = klumpen(r, Math.min(x + b / 2, ZELLE - 1), y + h / 2, Math.min(b, h) / 2 + 1.6, 6, 0.22);
    teile.push(poly(punkte, { fill: mische(M.fels, r.zahl(0, 1) > 0.5 ? M.felsHell : M.felsTief, r.zahl(0.1, 0.6)), filter: `url(#${q("korn")})` }));
    teile.push(poly(punkte, { fill: "none", stroke: M.schatten, "stroke-width": 1.1, "stroke-opacity": 0.5, "stroke-linejoin": "round" }));
    x += b * 0.82;
  }
  teile.push(rect(0, 18, ZELLE, 28, { fill: "none", stroke: M.schatten, "stroke-width": 2, "stroke-opacity": 0.65 }));
  return svg("Wand Fels, gemalt", ZELLE, ZELLE,
    defs(korn(q("korn"), { frequenz: 1.1, oktaven: 5, saat: 61, staerke: 0.44 })) + teile.join(""));
}

// ---------------------------------------------------------------------------------------------
// Möbel, Gefäße, Aufbau
// ---------------------------------------------------------------------------------------------

/** Weicher Bodenschatten unter einem Gegenstand — was ein Objekt auf den Boden stellt. */
const wurf = (form, weichId, versatz = "translate(1.2 1.6)") =>
  form({ fill: M.schatten, "fill-opacity": 0.34, transform: versatz, filter: `url(#${weichId})` });

function tischLang(name) {
  const r = zufall(name), q = kennung(name);
  const w = ZELLE * 2;
  const teile = [wurf((o) => rect(7, 9, w - 14, ZELLE - 18, { rx: 3, ...o }), q("weich"))];
  teile.push(rect(7, 9, w - 14, ZELLE - 18, { fill: M.holzTief, rx: 3, filter: `url(#${q("korn")})` }));
  for (let i = 0; i < 5; i++) {
    const y = 13 + i * 7.6;
    teile.push(rect(12, y, w - 24, 6.8, { fill: mische(M.holz, i % 2 === 0 ? M.holzHell : M.holzTief, r.zahl(0.08, 0.4)), rx: 1.2, filter: `url(#${q("korn")})` }));
    teile.push(path(`M12 ${n(y + 3.4)} Q${n(r.zahl(40, 60))} ${n(y + r.zahl(1.4, 5))} ${n(w - 12)} ${n(y + 3.4)}`,
      { fill: "none", stroke: M.holzRitze, "stroke-width": 0.7, "stroke-opacity": 0.4 }));
    teile.push(line(12, y + 6.9, w - 12, y + 6.9, { stroke: M.holzRitze, "stroke-width": 0.9, "stroke-opacity": 0.55 }));
  }
  const ast = r.zahl(40, 84);
  teile.push(ellipse(ast, 24, 4.4, 3, { fill: M.holzRitze, "fill-opacity": 0.42 }));
  teile.push(ellipse(ast, 24, 2, 1.4, { fill: M.holzRitze, "fill-opacity": 0.7 }));
  teile.push(rect(7, 9, w - 14, ZELLE - 18, { fill: "none", stroke: M.holzRitze, "stroke-width": 2.2, rx: 3, "stroke-opacity": 0.8 }));
  teile.push(rect(8.4, 10.4, w - 16.8, ZELLE - 20.8, { fill: "none", stroke: M.holzHell, "stroke-width": 0.9, rx: 2.4, "stroke-opacity": 0.32 }));
  for (const [x, y] of [[14, 16], [w - 14, 16], [14, ZELLE - 16], [w - 14, ZELLE - 16]]) {
    teile.push(circle(x, y, 2.6, { fill: M.eisen, filter: `url(#${q("korn")})` }));
    teile.push(circle(x - 0.6, y - 0.6, 1.1, { fill: M.eisenHell, "fill-opacity": 0.6 }));
  }
  return svg("Langer Tisch, gemalt", w, ZELLE,
    defs(korn(q("korn"), { frequenz: "0.03 1.2", oktaven: 4, saat: 15, staerke: 0.38 }), weichzeichner(q("weich"), 2)) + teile.join(""));
}

function tischRund(name) {
  const r = zufall(name), q = kennung(name);
  const teile = [wurf((o) => circle(32, 32, 23, o), q("weich"))];
  teile.push(circle(32, 32, 23, { fill: `url(#${q("woelbung")})`, filter: `url(#${q("korn")})` }));
  for (let i = 0; i < 7; i++) {
    const x = 32 - 21 + i * 6.4;
    teile.push(line(x, 32 - Math.sqrt(Math.max(0, 484 - (x - 32) ** 2)), x, 32 + Math.sqrt(Math.max(0, 484 - (x - 32) ** 2)),
      { stroke: M.holzRitze, "stroke-width": 0.9, "stroke-opacity": r.zahl(0.3, 0.55) }));
  }
  teile.push(circle(32, 32, 23, { fill: "none", stroke: M.holzRitze, "stroke-width": 2.4, "stroke-opacity": 0.85 }));
  teile.push(circle(30.9, 30.9, 22, { fill: "none", stroke: M.holzHell, "stroke-width": 1, "stroke-opacity": 0.3 }));
  return svg("Runder Tisch, gemalt", ZELLE, ZELLE,
    defs(korn(q("korn"), { frequenz: "1 0.04", oktaven: 4, saat: 71, staerke: 0.36 }),
      rundverlauf(q("woelbung"), [[0, M.holzHell], [0.5, M.holz], [1, M.holzTief]], 0.36, 0.3, 0.82),
      weichzeichner(q("weich"), 2)) + teile.join(""));
}

function stuhl(name) {
  const q = kennung(name);
  const teile = [wurf((o) => rect(20, 22, 24, 24, { rx: 2.5, ...o }), q("weich"))];
  teile.push(rect(20, 22, 24, 24, { fill: `url(#${q("holzverlauf")})`, rx: 2.5, filter: `url(#${q("korn")})` }));
  teile.push(rect(20, 22, 24, 24, { fill: "none", stroke: M.holzRitze, "stroke-width": 1.8, rx: 2.5, "stroke-opacity": 0.8 }));
  teile.push(rect(20, 14, 24, 7, { fill: M.holzTief, rx: 2, filter: `url(#${q("korn")})` }));
  teile.push(rect(20, 14, 24, 7, { fill: "none", stroke: M.holzRitze, "stroke-width": 1.4, rx: 2, "stroke-opacity": 0.75 }));
  for (const x of [26, 32, 38]) teile.push(line(x, 24, x, 44, { stroke: M.holzRitze, "stroke-width": 0.8, "stroke-opacity": 0.35 }));
  teile.push(line(21.2, 23.2, 42.8, 23.2, { stroke: M.holzHell, "stroke-width": 0.9, "stroke-opacity": 0.32 }));
  return svg("Stuhl, gemalt", ZELLE, ZELLE,
    defs(korn(q("korn"), { frequenz: "0.05 1.1", oktaven: 4, saat: 73, staerke: 0.34 }),
      verlauf(q("holzverlauf"), [[0, M.holzHell], [0.5, M.holz], [1, M.holzTief]], 125),
      weichzeichner(q("weich"), 1.8)) + teile.join(""));
}

function bett(name) {
  const q = kennung(name), h = ZELLE * 2;
  const teile = [wurf((o) => rect(7, 9, ZELLE - 14, h - 18, { rx: 3, ...o }), q("weich"))];
  teile.push(rect(7, 9, ZELLE - 14, h - 18, { fill: `url(#${q("holzverlauf")})`, rx: 3, filter: `url(#${q("korn")})` }));
  teile.push(rect(7, 9, ZELLE - 14, h - 18, { fill: "none", stroke: M.holzRitze, "stroke-width": 2.2, rx: 3, "stroke-opacity": 0.8 }));
  teile.push(rect(12, 14, ZELLE - 24, 24, { fill: M.knochen, rx: 3, filter: `url(#${q("stoff")})` }));
  teile.push(rect(12, 14, ZELLE - 24, 24, { fill: "none", stroke: M.schatten, "stroke-width": 1.2, rx: 3, "stroke-opacity": 0.45 }));
  teile.push(rect(12, 44, ZELLE - 24, h - 56, { fill: `url(#${q("tuchverlauf")})`, rx: 3, filter: `url(#${q("stoff")})` }));
  for (let i = 0; i < 3; i++) {
    const y = 56 + i * 20;
    teile.push(path(`M12 ${n(y)} Q32 ${n(y + 4)} ${n(ZELLE - 12)} ${n(y)}`, { fill: "none", stroke: M.tuchTief, "stroke-width": 1.4, "stroke-opacity": 0.55 }));
  }
  teile.push(rect(12, 44, ZELLE - 24, h - 56, { fill: "none", stroke: M.schatten, "stroke-width": 1.2, rx: 3, "stroke-opacity": 0.5 }));
  return svg("Bett, gemalt", ZELLE, h,
    defs(korn(q("korn"), { frequenz: "0.04 1", oktaven: 4, saat: 88, staerke: 0.34 }),
      korn(q("stoff"), { frequenz: 1.6, oktaven: 3, saat: 90, staerke: 0.3 }),
      verlauf(q("holzverlauf"), [[0, M.holzHell], [0.5, M.holz], [1, M.holzTief]], 125),
      verlauf(q("tuchverlauf"), [[0, M.tuch], [1, M.tuchTief]], 118),
      weichzeichner(q("weich"), 2.4)) + teile.join(""));
}

function regal(name) {
  const r = zufall(name), q = kennung(name), w = ZELLE * 2;
  const teile = [wurf((o) => rect(6, 15, w - 12, ZELLE - 30, { rx: 2, ...o }), q("weich"))];
  teile.push(rect(6, 15, w - 12, ZELLE - 30, { fill: M.holzTief, rx: 2, filter: `url(#${q("korn")})` }));
  // Buchrücken in wechselnden Farben — was ein Regal von einer Kiste unterscheidet.
  let x = 11;
  while (x < w - 13) {
    const b = r.zahl(3.5, 6.5), hoehe = r.zahl(20, 26);
    const farbe = r.waehle([M.tuch, M.gruen, M.wasser, M.holzHell, M.goldTief, M.pilz]);
    teile.push(rect(x, 32 - hoehe / 2, b, hoehe, { fill: mische(farbe, M.schatten, r.zahl(0, 0.3)), filter: `url(#${q("korn")})` }));
    teile.push(line(x + 0.5, 32 - hoehe / 2 + 1, x + 0.5, 32 + hoehe / 2 - 1, { stroke: M.knochen, "stroke-width": 0.6, "stroke-opacity": 0.3 }));
    x += b + r.zahl(0.4, 1.4);
  }
  for (const bx of [6 + (w - 12) / 3, 6 + ((w - 12) * 2) / 3]) {
    teile.push(rect(bx - 1.6, 15, 3.2, ZELLE - 30, { fill: M.holzTief, filter: `url(#${q("korn")})` }));
  }
  teile.push(rect(6, 15, w - 12, ZELLE - 30, { fill: "none", stroke: M.holzRitze, "stroke-width": 2.4, rx: 2, "stroke-opacity": 0.85 }));
  return svg("Regal, gemalt", w, ZELLE,
    defs(korn(q("korn"), { frequenz: 1, oktaven: 4, saat: 95, staerke: 0.34 }), weichzeichner(q("weich"), 2)) + teile.join(""));
}

function altar(name) {
  const q = kennung(name), w = ZELLE * 2;
  const teile = [wurf((o) => rect(10, 10, w - 20, ZELLE - 20, { rx: 2, ...o }), q("weich"))];
  teile.push(rect(10, 10, w - 20, ZELLE - 20, { fill: `url(#${q("steinverlauf")})`, rx: 2, filter: `url(#${q("korn")})` }));
  teile.push(rect(10, 10, w - 20, ZELLE - 20, { fill: "none", stroke: M.schatten, "stroke-width": 2.2, rx: 2, "stroke-opacity": 0.7 }));
  teile.push(rect(22, 17, w - 44, ZELLE - 34, { fill: mische(M.stein, M.steinTief, 0.4), rx: 1.5, filter: `url(#${q("korn")})` }));
  teile.push(rect(22, 17, w - 44, ZELLE - 34, { fill: "none", stroke: M.schatten, "stroke-width": 1.4, rx: 1.5, "stroke-opacity": 0.55 }));
  teile.push(circle(w / 2, 32, 9.5, { fill: "none", stroke: M.gold, "stroke-width": 2.4, "stroke-opacity": 0.9 }));
  teile.push(line(w / 2, 20, w / 2, 44, { stroke: M.gold, "stroke-width": 2.4, "stroke-opacity": 0.9, "stroke-linecap": "round" }));
  teile.push(circle(w / 2, 32, 9.5, { fill: "none", stroke: M.goldTief, "stroke-width": 0.9, "stroke-opacity": 0.6, transform: "translate(0.8 0.8)" }));
  return svg("Altar, gemalt", w, ZELLE,
    defs(korn(q("korn"), { frequenz: 0.85, oktaven: 5, saat: 101, staerke: 0.34 }),
      verlauf(q("steinverlauf"), [[0, M.steinHell], [0.5, M.stein], [1, M.steinTief]], 125),
      weichzeichner(q("weich"), 2.2)) + teile.join(""));
}

function sarkophag(name) {
  const q = kennung(name), h = ZELLE * 2;
  const umriss = [[16, 8], [48, 8], [56, 34], [48, 120], [16, 120], [8, 34]];
  const teile = [wurf((o) => poly(umriss, o), q("weich"))];
  teile.push(poly(umriss, { fill: `url(#${q("steinverlauf")})`, filter: `url(#${q("korn")})` }));
  teile.push(poly(umriss, { fill: "none", stroke: M.schatten, "stroke-width": 2.2, "stroke-opacity": 0.72, "stroke-linejoin": "round" }));
  teile.push(poly([[22, 16], [42, 16], [48, 36], [42, 112], [22, 112], [16, 36]],
    { fill: "none", stroke: M.schatten, "stroke-width": 1.4, "stroke-opacity": 0.5, "stroke-linejoin": "round" }));
  // Eine eingemeisselte Gestalt: das ist der Unterschied zwischen Sarkophag und Steinkiste.
  teile.push(circle(32, 42, 7, { fill: mische(M.stein, M.steinTief, 0.55), stroke: M.schatten, "stroke-width": 1.2, "stroke-opacity": 0.5 }));
  teile.push(path("M24 56 Q32 50 40 56 L38 96 Q32 100 26 96 Z", { fill: mische(M.stein, M.steinTief, 0.5), stroke: M.schatten, "stroke-width": 1.2, "stroke-opacity": 0.5 }));
  teile.push(line(32, 60, 32, 92, { stroke: M.schatten, "stroke-width": 1, "stroke-opacity": 0.4 }));
  return svg("Sarkophag, gemalt", ZELLE, h,
    defs(korn(q("korn"), { frequenz: 0.8, oktaven: 5, saat: 107, staerke: 0.36 }),
      verlauf(q("steinverlauf"), [[0, M.steinHell], [0.45, M.stein], [1, M.steinTief]], 122),
      weichzeichner(q("weich"), 2.4)) + teile.join(""));
}

function amboss(name) {
  const q = kennung(name);
  const form = "M12 26 L44 26 L52 32 L44 34 L44 40 L20 40 L20 34 L12 32 Z";
  const teile = [path(form, { fill: M.schatten, "fill-opacity": 0.36, transform: "translate(1.4 1.8)", filter: `url(#${q("weich")})` })];
  teile.push(rect(23, 40, 18, 11, { fill: M.holzTief, rx: 1.5, filter: `url(#${q("korn")})` }));
  teile.push(path(form, { fill: `url(#${q("eisenverlauf")})`, filter: `url(#${q("korn")})` }));
  teile.push(path(form, { fill: "none", stroke: M.schatten, "stroke-width": 1.8, "stroke-opacity": 0.75, "stroke-linejoin": "round" }));
  teile.push(line(14, 27.4, 43, 27.4, { stroke: M.metallHell, "stroke-width": 1.1, "stroke-opacity": 0.45 }));
  return svg("Amboss, gemalt", ZELLE, ZELLE,
    defs(korn(q("korn"), { frequenz: 0.9, oktaven: 4, saat: 113, staerke: 0.3 }),
      verlauf(q("eisenverlauf"), [[0, M.metallHell], [0.4, M.metall], [1, M.eisen]], 120),
      weichzeichner(q("weich"), 1.8)) + teile.join(""));
}

function truhe(name) {
  const q = kennung(name);
  const teile = [wurf((o) => rect(11, 15, 42, 34, { rx: 2.5, ...o }), q("weich"))];
  teile.push(rect(11, 15, 42, 34, { fill: `url(#${q("holzverlauf")})`, rx: 2.5, filter: `url(#${q("korn")})` }));
  for (let i = 0; i < 4; i++) teile.push(line(13, 17 + i * 8, 51, 17 + i * 8, { stroke: M.holzRitze, "stroke-width": 0.9, "stroke-opacity": 0.45 }));
  for (const x of [18, 46]) {
    teile.push(rect(x - 3, 15, 6, 34, { fill: M.eisen, filter: `url(#${q("korn")})` }));
    teile.push(line(x - 2.4, 16, x - 2.4, 48, { stroke: M.eisenHell, "stroke-width": 0.8, "stroke-opacity": 0.42 }));
  }
  teile.push(rect(11, 15, 42, 11, { fill: M.holzHell, "fill-opacity": 0.2, rx: 2.5 }));
  teile.push(rect(28, 26, 9, 11, { fill: M.eisen, rx: 1.4, filter: `url(#${q("korn")})` }));
  teile.push(circle(32.5, 31.5, 2.2, { fill: M.schatten, "fill-opacity": 0.85 }));
  teile.push(circle(31.8, 30.8, 0.9, { fill: M.gold, "fill-opacity": 0.7 }));
  teile.push(rect(11, 15, 42, 34, { fill: "none", stroke: M.schatten, "stroke-width": 1.8, rx: 2.5, "stroke-opacity": 0.7 }));
  return svg("Truhe, gemalt", ZELLE, ZELLE,
    defs(korn(q("korn"), { frequenz: "0.05 1", oktaven: 4, saat: 22, staerke: 0.36 }),
      verlauf(q("holzverlauf"), [[0, M.holzHell], [0.45, M.holz], [1, M.holzTief]], 128),
      weichzeichner(q("weich"), 1.8)) + teile.join(""));
}

function fass(name) {
  const q = kennung(name);
  const teile = [wurf((o) => circle(32, 32, 21, o), q("weich"))];
  teile.push(circle(32, 32, 21, { fill: `url(#${q("woelbung")})`, filter: `url(#${q("korn")})` }));
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    teile.push(line(32 + Math.cos(a) * 4, 32 + Math.sin(a) * 4, 32 + Math.cos(a) * 20, 32 + Math.sin(a) * 20,
      { stroke: M.holzRitze, "stroke-width": 0.9, "stroke-opacity": 0.4 }));
  }
  teile.push(circle(32, 32, 21, { fill: "none", stroke: M.eisen, "stroke-width": 3.2, "stroke-opacity": 0.95 }));
  teile.push(circle(31.4, 31.4, 21, { fill: "none", stroke: M.eisenHell, "stroke-width": 0.9, "stroke-opacity": 0.35 }));
  teile.push(circle(32, 32, 13, { fill: "none", stroke: M.eisen, "stroke-width": 2.2, "stroke-opacity": 0.85 }));
  teile.push(circle(32, 32, 4.5, { fill: M.holzTief, filter: `url(#${q("korn")})` }));
  teile.push(circle(31.4, 31.4, 3.2, { fill: M.holzHell, "fill-opacity": 0.3 }));
  return svg("Fass, gemalt", ZELLE, ZELLE,
    defs(korn(q("korn"), { frequenz: 0.9, oktaven: 4, saat: 31, staerke: 0.4 }),
      rundverlauf(q("woelbung"), [[0, M.holzHell], [0.55, M.holz], [1, M.holzTief]], 0.36, 0.3, 0.8),
      weichzeichner(q("weich"), 1.8)) + teile.join(""));
}

function kiste(name) {
  const r = zufall(name), q = kennung(name);
  const teile = [wurf((o) => rect(14, 14, 36, 36, { rx: 2, ...o }), q("weich"))];
  teile.push(rect(14, 14, 36, 36, { fill: `url(#${q("holzverlauf")})`, rx: 2, filter: `url(#${q("korn")})` }));
  for (let i = 0; i < 4; i++) teile.push(line(14, 18 + i * 9, 50, 18 + i * 9, { stroke: M.holzRitze, "stroke-width": 0.9, "stroke-opacity": r.zahl(0.3, 0.5) }));
  teile.push(line(15, 15, 49, 49, { stroke: M.holzTief, "stroke-width": 3, "stroke-opacity": 0.75 }));
  teile.push(line(49, 15, 15, 49, { stroke: M.holzTief, "stroke-width": 3, "stroke-opacity": 0.75 }));
  teile.push(rect(14, 14, 36, 36, { fill: "none", stroke: M.schatten, "stroke-width": 1.8, rx: 2, "stroke-opacity": 0.72 }));
  teile.push(rect(15.2, 15.2, 33.6, 33.6, { fill: "none", stroke: M.holzHell, "stroke-width": 0.9, rx: 1.6, "stroke-opacity": 0.3 }));
  return svg("Kiste, gemalt", ZELLE, ZELLE,
    defs(korn(q("korn"), { frequenz: "0.06 1", oktaven: 4, saat: 127, staerke: 0.36 }),
      verlauf(q("holzverlauf"), [[0, M.holzHell], [0.5, M.holz], [1, M.holzTief]], 125),
      weichzeichner(q("weich"), 1.8)) + teile.join(""));
}

function krug(name) {
  const q = kennung(name);
  const teile = [wurf((o) => ellipse(30, 34, 13, 15, o), q("weich"))];
  teile.push(path("M43 28 Q53 32 43 40", { fill: "none", stroke: M.erdeTief, "stroke-width": 4, "stroke-linecap": "round" }));
  teile.push(ellipse(30, 34, 13, 15, { fill: `url(#${q("woelbung")})`, filter: `url(#${q("korn")})` }));
  teile.push(ellipse(30, 34, 13, 15, { fill: "none", stroke: M.schatten, "stroke-width": 1.6, "stroke-opacity": 0.65 }));
  teile.push(ellipse(30, 22, 7.5, 3.8, { fill: M.erdeTief, stroke: M.schatten, "stroke-width": 1.2, "stroke-opacity": 0.6 }));
  teile.push(ellipse(30, 21.4, 5.5, 2.4, { fill: M.schatten, "fill-opacity": 0.6 }));
  return svg("Krug, gemalt", ZELLE, ZELLE,
    defs(korn(q("korn"), { frequenz: 1, oktaven: 4, saat: 131, staerke: 0.34 }),
      rundverlauf(q("woelbung"), [[0, M.erdeHell], [0.5, M.erde], [1, M.erdeTief]], 0.34, 0.3, 0.85),
      weichzeichner(q("weich"), 1.8)) + teile.join(""));
}

function saeule(name) {
  const q = kennung(name);
  const teile = [circle(33.4, 33.6, 22, { fill: M.schatten, "fill-opacity": 0.34, filter: `url(#${q("weich")})` })];
  teile.push(circle(32, 32, 22, { fill: `url(#${q("woelbung")})`, filter: `url(#${q("korn")})` }));
  teile.push(circle(32, 32, 22, { fill: "none", stroke: M.schatten, "stroke-width": 2, "stroke-opacity": 0.65 }));
  teile.push(circle(32, 32, 14.5, { fill: mische(M.stein, M.steinTief, 0.35), filter: `url(#${q("korn")})` }));
  teile.push(circle(32, 32, 14.5, { fill: "none", stroke: M.schatten, "stroke-width": 1.4, "stroke-opacity": 0.5 }));
  teile.push(circle(30.8, 30.8, 13.6, { fill: "none", stroke: M.steinHell, "stroke-width": 1, "stroke-opacity": 0.34 }));
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    teile.push(line(32 + Math.cos(a) * 15.5, 32 + Math.sin(a) * 15.5, 32 + Math.cos(a) * 21, 32 + Math.sin(a) * 21,
      { stroke: M.schatten, "stroke-width": 1.1, "stroke-opacity": 0.32 }));
  }
  return svg("Säule, gemalt", ZELLE, ZELLE,
    defs(korn(q("korn"), { frequenz: 0.8, oktaven: 5, saat: 63, staerke: 0.38 }),
      rundverlauf(q("woelbung"), [[0, M.steinHell], [0.5, M.stein], [1, M.steinTief]], 0.34, 0.3, 0.82),
      weichzeichner(q("weich"), 2.2)) + teile.join(""));
}

function treppe(name, richtung) {
  const r = zufall(name), q = kennung(name), h = ZELLE * 2, stufen = 7;
  const teile = [rect(4, 3, ZELLE - 8, h - 6, { fill: M.steinTief, filter: `url(#${q("korn")})` })];
  for (let i = 0; i < stufen; i++) {
    const y = 3 + (i * (h - 6)) / stufen, hoehe = (h - 6) / stufen;
    const tiefe = richtung === "ab" ? i / stufen : 1 - i / stufen;
    // Jede Stufe ist ein eigener Steinkörper mit Lichtkante und Verdeckung darunter — daraus
    // entsteht die Treppe, nicht aus einem Verlauf über die ganze Fläche.
    teile.push(rect(5, y + 0.6, ZELLE - 10, hoehe - 1.2, { fill: mische(mische(M.stein, M.steinTief, 0.15 + tiefe * 0.5), M.erde, r.zahl(0.02, 0.12)), rx: 1.2, filter: `url(#${q("korn")})` }));
    teile.push(line(5.6, y + 1.2, ZELLE - 5.6, y + 1.2, { stroke: M.steinHell, "stroke-width": 0.9, "stroke-opacity": 0.3 }));
    teile.push(line(5, y + hoehe - 0.6, ZELLE - 5, y + hoehe - 0.6, { stroke: M.schatten, "stroke-width": 1.6, "stroke-opacity": 0.5 }));
  }
  const y0 = richtung === "auf" ? 34 : h - 34, dir = richtung === "auf" ? -1 : 1;
  teile.push(polyline([[24, y0], [32, y0 + dir * 13], [40, y0]], { fill: "none", stroke: M.schatten, "stroke-width": 4.4, "stroke-opacity": 0.5, "stroke-linecap": "round", "stroke-linejoin": "round" }));
  teile.push(polyline([[24, y0], [32, y0 + dir * 13], [40, y0]], { fill: "none", stroke: M.knochen, "stroke-width": 2.4, "stroke-opacity": 0.85, "stroke-linecap": "round", "stroke-linejoin": "round" }));
  teile.push(rect(4, 3, ZELLE - 8, h - 6, { fill: "none", stroke: M.schatten, "stroke-width": 2, "stroke-opacity": 0.6 }));
  return svg(richtung === "auf" ? "Treppe aufwärts, gemalt" : "Treppe abwärts, gemalt", ZELLE, h,
    defs(korn(q("korn"), { frequenz: 0.85, oktaven: 5, saat: richtung === "auf" ? 137 : 139, staerke: 0.34 })) + teile.join(""));
}

function podest(name) {
  const q = kennung(name), s = ZELLE * 2;
  const teile = [];
  for (const [i, [x, b]] of [[6, s - 12], [18, s - 36], [30, s - 60]].entries()) {
    teile.push(rect(x + 1, x + 1.4, b, b, { fill: M.schatten, "fill-opacity": 0.3, filter: `url(#${q("weich")})` }));
    teile.push(rect(x, x, b, b, { fill: mische(M.stein, M.steinHell, 0.12 + i * 0.16), rx: 2, filter: `url(#${q("korn")})` }));
    teile.push(rect(x, x, b, b, { fill: "none", stroke: M.schatten, "stroke-width": 2 - i * 0.3, rx: 2, "stroke-opacity": 0.65 }));
    teile.push(polyline([[x + 1.4, x + b - 1.4], [x + 1.4, x + 1.4], [x + b - 1.4, x + 1.4]],
      { fill: "none", stroke: M.steinHell, "stroke-width": 1, "stroke-opacity": 0.34 }));
  }
  return svg("Podest, gemalt", s, s,
    defs(korn(q("korn"), { frequenz: 0.8, oktaven: 5, saat: 149, staerke: 0.32 }), weichzeichner(q("weich"), 2.4)) + teile.join(""));
}

function schutt(name) {
  const r = zufall(name), q = kennung(name);
  const teile = [];
  const brocken = [];
  // Zwei grosse Brocken in der Mitte, sieben kleine im Ring darum: der Haufen soll zentriert
  // sitzen, nicht in eine Ecke driften wie in der ersten Fassung.
  for (let i = 0; i < 9; i++) {
    const gross = i < 2;
    const a = (i / 9) * Math.PI * 2 + r.zahl(0, 0.7);
    const d = gross ? r.zahl(0, 5) : r.zahl(13, 20);
    brocken.push({ cx: 32 + Math.cos(a) * d, cy: 33 + Math.sin(a) * d * 0.85, rad: gross ? r.zahl(9, 12) : r.zahl(4, 7), ecken: r.ganz(5, 7) });
  }
  brocken.sort((a, b) => a.cy - b.cy);
  for (const b of brocken) {
    const punkte = klumpen(r, b.cx, b.cy, b.rad, b.ecken, 0.24);
    const ton = mische(M.fels, r.zahl(0, 1) > 0.5 ? M.felsHell : M.felsTief, r.zahl(0.1, 0.6));
    teile.push(poly(punkte, { fill: M.schatten, "fill-opacity": 0.3, transform: "translate(1.2 1.6)", filter: `url(#${q("weich")})` }));
    teile.push(poly(punkte, { fill: ton, filter: `url(#${q("korn")})` }));
    teile.push(poly([punkte[0], [b.cx, b.cy], punkte[Math.min(2, punkte.length - 1)]], { fill: M.schatten, "fill-opacity": 0.22 }));
    teile.push(polyline([punkte[0], [b.cx, b.cy]], { stroke: M.felsHell, "stroke-width": 0.8, "stroke-opacity": 0.4, fill: "none" }));
    teile.push(poly(punkte, { fill: "none", stroke: M.schatten, "stroke-width": 1.2, "stroke-opacity": 0.6, "stroke-linejoin": "round" }));
  }
  return svg("Schutt, gemalt", ZELLE, ZELLE,
    defs(korn(q("korn"), { frequenz: 1.1, oktaven: 5, saat: 44, staerke: 0.44 }), weichzeichner(q("weich"), 1.6)) + teile.join(""));
}

function felsblock(name) {
  const r = zufall(name), q = kennung(name);
  const punkte = klumpen(r, 32, 33, 21, 6, 0.18);
  const teile = [poly(punkte, { fill: M.schatten, "fill-opacity": 0.36, transform: "translate(1.6 2)", filter: `url(#${q("weich")})` })];
  teile.push(poly(punkte, { fill: `url(#${q("woelbung")})`, filter: `url(#${q("korn")})` }));
  teile.push(poly([punkte[3], [32, 33], punkte[4], punkte[5] ?? punkte[0]], { fill: M.schatten, "fill-opacity": 0.3 }));
  teile.push(polyline([punkte[0], [32, 33], punkte[3]], { stroke: M.felsHell, "stroke-width": 1.2, "stroke-opacity": 0.4, fill: "none" }));
  teile.push(poly(punkte, { fill: "none", stroke: M.schatten, "stroke-width": 2, "stroke-opacity": 0.7, "stroke-linejoin": "round" }));
  return svg("Felsblock, gemalt", ZELLE, ZELLE,
    defs(korn(q("korn"), { frequenz: 1.05, oktaven: 5, saat: 151, staerke: 0.44 }),
      rundverlauf(q("woelbung"), [[0, M.felsHell], [0.5, M.fels], [1, M.felsTief]], 0.34, 0.28, 0.85),
      weichzeichner(q("weich"), 2.2)) + teile.join(""));
}

function grube(name) {
  const q = kennung(name), s = ZELLE * 2;
  const teile = [rect(8, 8, s - 16, s - 16, { fill: mische(M.stein, M.steinTief, 0.4), rx: 2, filter: `url(#${q("korn")})` })];
  // Die Tiefe kommt aus dem Radialverlauf: Rand hell, Mitte fast schwarz.
  teile.push(rect(8, 8, s - 16, s - 16, { fill: `url(#${q("tiefe")})`, rx: 2 }));
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    teile.push(line(64 + Math.cos(a) * 26, 64 + Math.sin(a) * 26, 64 + Math.cos(a) * 54, 64 + Math.sin(a) * 54,
      { stroke: M.schatten, "stroke-width": 1.4, "stroke-opacity": 0.4 }));
  }
  teile.push(rect(8, 8, s - 16, s - 16, { fill: "none", stroke: M.schatten, "stroke-width": 2.8, rx: 2, "stroke-opacity": 0.8 }));
  teile.push(rect(9.4, 9.4, s - 18.8, s - 18.8, { fill: "none", stroke: M.steinHell, "stroke-width": 1.1, rx: 2, "stroke-opacity": 0.32 }));
  return svg("Grube, gemalt", s, s,
    defs(korn(q("korn"), { frequenz: 0.9, oktaven: 5, saat: 157, staerke: 0.36 }),
      rundverlauf(q("tiefe"), [[0, M.schatten, 0.96], [0.55, M.schatten, 0.8], [1, M.schatten, 0.18]], 0.5, 0.5, 0.62)) + teile.join(""));
}

function tuerHolz(name) {
  const r = zufall(name), q = kennung(name);
  const teile = [rect(7, 25, 50, 14, { fill: M.schatten, "fill-opacity": 0.35, transform: "translate(0 1.4)", filter: `url(#${q("weich")})` })];
  teile.push(rect(7, 25, 50, 14, { fill: `url(#${q("holzverlauf")})`, rx: 1.6, filter: `url(#${q("korn")})` }));
  for (let i = 1; i < 5; i++) teile.push(line(7 + i * 10, 25, 7 + i * 10, 39, { stroke: M.holzRitze, "stroke-width": 1, "stroke-opacity": r.zahl(0.35, 0.6) }));
  for (const x of [14, 50]) {
    teile.push(rect(x - 2.5, 25, 5, 14, { fill: M.eisen, filter: `url(#${q("korn")})` }));
    teile.push(circle(x, 28, 1.2, { fill: M.eisenHell, "fill-opacity": 0.55 }));
    teile.push(circle(x, 36, 1.2, { fill: M.eisenHell, "fill-opacity": 0.55 }));
  }
  teile.push(circle(50, 32, 2.6, { fill: M.eisen }));
  teile.push(circle(49.3, 31.3, 1.1, { fill: M.eisenHell, "fill-opacity": 0.6 }));
  teile.push(rect(7, 25, 50, 14, { fill: "none", stroke: M.schatten, "stroke-width": 1.6, rx: 1.6, "stroke-opacity": 0.72 }));
  teile.push(line(8, 26.2, 56, 26.2, { stroke: M.holzHell, "stroke-width": 0.9, "stroke-opacity": 0.3 }));
  return svg("Holztür, gemalt", ZELLE, ZELLE,
    defs(korn(q("korn"), { frequenz: "0.05 1.1", oktaven: 4, saat: 51, staerke: 0.36 }),
      verlauf(q("holzverlauf"), [[0, M.holzHell], [0.4, M.holz], [1, M.holzTief]], 110),
      weichzeichner(q("weich"), 1.8)) + teile.join(""));
}

function tuerGitter(name) {
  const q = kennung(name);
  const teile = [rect(7, 25, 50, 14, { fill: M.schatten, "fill-opacity": 0.4, transform: "translate(0 1.4)", filter: `url(#${q("weich")})` })];
  teile.push(rect(7, 25, 50, 14, { fill: M.schatten, "fill-opacity": 0.55, rx: 1.4 }));
  for (let x = 12; x <= 52; x += 6.6) {
    teile.push(line(x, 26, x, 38, { stroke: M.eisen, "stroke-width": 3, "stroke-linecap": "round" }));
    teile.push(line(x - 0.7, 26.4, x - 0.7, 37.6, { stroke: M.metallHell, "stroke-width": 0.9, "stroke-opacity": 0.4, "stroke-linecap": "round" }));
  }
  teile.push(rect(7, 25, 50, 14, { fill: "none", stroke: M.eisen, "stroke-width": 3, rx: 1.4 }));
  teile.push(rect(7.9, 25.9, 48.2, 12.2, { fill: "none", stroke: M.metallHell, "stroke-width": 0.9, rx: 1.2, "stroke-opacity": 0.35 }));
  return svg("Gittertür, gemalt", ZELLE, ZELLE,
    defs(korn(q("korn"), { frequenz: 0.9, oktaven: 4, saat: 163, staerke: 0.3 }), weichzeichner(q("weich"), 1.8)) + teile.join(""));
}

function falltuer(name) {
  const r = zufall(name), q = kennung(name);
  const teile = [rect(12, 12, 40, 40, { fill: M.schatten, "fill-opacity": 0.4, transform: "translate(1.2 1.6)", filter: `url(#${q("weich")})` })];
  teile.push(rect(12, 12, 40, 40, { fill: `url(#${q("holzverlauf")})`, rx: 1.6, filter: `url(#${q("korn")})` }));
  for (let i = 0; i < 5; i++) teile.push(line(12, 16 + i * 8, 52, 16 + i * 8, { stroke: M.holzRitze, "stroke-width": 0.9, "stroke-opacity": r.zahl(0.3, 0.5) }));
  for (const x of [18, 46]) teile.push(rect(x - 2.2, 12, 4.4, 40, { fill: M.eisen, filter: `url(#${q("korn")})` }));
  teile.push(circle(32, 32, 5.5, { fill: "none", stroke: M.eisen, "stroke-width": 3 }));
  teile.push(circle(31.2, 31.2, 5.5, { fill: "none", stroke: M.metallHell, "stroke-width": 0.9, "stroke-opacity": 0.4 }));
  teile.push(rect(12, 12, 40, 40, { fill: "none", stroke: M.schatten, "stroke-width": 1.8, rx: 1.6, "stroke-opacity": 0.75 }));
  return svg("Falltür, gemalt", ZELLE, ZELLE,
    defs(korn(q("korn"), { frequenz: "0.06 1", oktaven: 4, saat: 167, staerke: 0.36 }),
      verlauf(q("holzverlauf"), [[0, M.holzHell], [0.45, M.holz], [1, M.holzTief]], 122),
      weichzeichner(q("weich"), 1.8)) + teile.join(""));
}

function feuerschale(name) {
  const q = kennung(name);
  const teile = [circle(33, 33.4, 20, { fill: M.schatten, "fill-opacity": 0.3, filter: `url(#${q("weich")})` })];
  teile.push(circle(32, 32, 20, { fill: `url(#${q("metallverlauf")})`, filter: `url(#${q("korn")})` }));
  teile.push(circle(32, 32, 20, { fill: "none", stroke: M.schatten, "stroke-width": 2, "stroke-opacity": 0.7 }));
  teile.push(circle(32, 32, 14.5, { fill: M.schatten, "fill-opacity": 0.9 }));
  teile.push(circle(32, 32, 13, { fill: `url(#${q("glut")})` }));
  teile.push(path("M32 21 Q37 28 34.2 34 Q40 30.5 38.4 24.6 Q43.5 30.5 38.4 38 L25.6 38 Q20.5 30.5 25.6 24.6 Q24 30.5 29.8 34 Q27 28 32 21 Z",
    { fill: `url(#${q("flammenverlauf")})` }));
  teile.push(circle(32, 34, 4, { fill: M.flammeHell, "fill-opacity": 0.75, filter: `url(#${q("weich")})` }));
  return svg("Feuerschale, gemalt", ZELLE, ZELLE,
    defs(korn(q("korn"), { frequenz: 0.75, oktaven: 4, saat: 77, staerke: 0.34 }),
      verlauf(q("metallverlauf"), [[0, M.metallHell], [0.5, M.metall], [1, M.metallTief]], 122),
      rundverlauf(q("glut"), [[0, M.flammeHell, 0.95], [0.45, M.flamme, 0.7], [1, M.flamme, 0]], 0.5, 0.5, 0.5),
      verlauf(q("flammenverlauf"), [[0, M.flammeHell], [1, M.flamme]], 90),
      weichzeichner(q("weich"), 2)) + teile.join(""));
}

function lagerfeuer(name) {
  const r = zufall(name), q = kennung(name);
  const teile = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const cx = 32 + Math.cos(a) * 20, cy = 32 + Math.sin(a) * 20;
    const punkte = klumpen(r, cx, cy, r.zahl(4.5, 6.5), 5, 0.25);
    teile.push(poly(punkte, { fill: M.schatten, "fill-opacity": 0.3, transform: "translate(0.8 1.2)", filter: `url(#${q("weich")})` }));
    teile.push(poly(punkte, { fill: mische(M.fels, r.zahl(0, 1) > 0.5 ? M.felsHell : M.felsTief, r.zahl(0.1, 0.6)), filter: `url(#${q("korn")})` }));
    teile.push(poly(punkte, { fill: "none", stroke: M.schatten, "stroke-width": 1.1, "stroke-opacity": 0.55, "stroke-linejoin": "round" }));
  }
  teile.push(circle(32, 32, 15, { fill: M.schatten, "fill-opacity": 0.6 }));
  teile.push(circle(32, 32, 15, { fill: `url(#${q("glut")})` }));
  for (const [x1, y1, x2, y2] of [[24, 38, 40, 26], [24, 26, 40, 38]]) {
    teile.push(line(x1, y1, x2, y2, { stroke: M.holzTief, "stroke-width": 4, "stroke-linecap": "round" }));
    teile.push(line(x1, y1 - 0.7, x2, y2 - 0.7, { stroke: M.holzHell, "stroke-width": 1, "stroke-opacity": 0.35, "stroke-linecap": "round" }));
  }
  teile.push(path("M32 20 Q38 28 34.4 35 Q41 31 39 24 Q45.5 31 39 40 L25 40 Q18.5 31 25 24 Q23 31 29.6 35 Q26 28 32 20 Z",
    { fill: `url(#${q("flammenverlauf")})` }));
  teile.push(circle(32, 33, 5, { fill: M.flammeHell, "fill-opacity": 0.7, filter: `url(#${q("weich")})` }));
  return svg("Lagerfeuer, gemalt", ZELLE, ZELLE,
    defs(korn(q("korn"), { frequenz: 1.05, oktaven: 5, saat: 173, staerke: 0.42 }),
      rundverlauf(q("glut"), [[0, M.flammeHell, 0.9], [0.5, M.flamme, 0.6], [1, M.flamme, 0]], 0.5, 0.5, 0.5),
      verlauf(q("flammenverlauf"), [[0, M.flammeHell], [1, M.flamme]], 90),
      weichzeichner(q("weich"), 2.2)) + teile.join(""));
}

function kerzenstaender(name) {
  const q = kennung(name);
  const teile = [circle(33, 33.4, 15, { fill: M.schatten, "fill-opacity": 0.32, filter: `url(#${q("weich")})` })];
  teile.push(circle(32, 32, 15, { fill: `url(#${q("metallverlauf")})`, filter: `url(#${q("korn")})` }));
  teile.push(circle(32, 32, 15, { fill: "none", stroke: M.schatten, "stroke-width": 1.6, "stroke-opacity": 0.65 }));
  for (const [x, y] of [[32, 24], [25, 37], [39, 37]]) {
    teile.push(circle(x, y, 3.8, { fill: M.knochen, stroke: M.schatten, "stroke-width": 1.1, "stroke-opacity": 0.55 }));
    teile.push(circle(x, y, 6, { fill: `url(#${q("schein")})` }));
    teile.push(ellipse(x, y - 0.6, 1.3, 1.9, { fill: M.flammeHell }));
  }
  return svg("Kerzenständer, gemalt", ZELLE, ZELLE,
    defs(korn(q("korn"), { frequenz: 0.9, oktaven: 4, saat: 179, staerke: 0.3 }),
      verlauf(q("metallverlauf"), [[0, M.metallHell], [0.5, M.metall], [1, M.metallTief]], 124),
      rundverlauf(q("schein"), [[0, M.flammeHell, 0.7], [1, M.flamme, 0]], 0.5, 0.5, 0.5),
      weichzeichner(q("weich"), 1.8)) + teile.join(""));
}

function werkbank(name) {
  const r = zufall(name), q = kennung(name), w = ZELLE * 2;
  const teile = [wurf((o) => rect(8, 13, w - 16, ZELLE - 26, { rx: 2, ...o }), q("weich"))];
  teile.push(rect(8, 13, w - 16, ZELLE - 26, { fill: `url(#${q("holzverlauf")})`, rx: 2, filter: `url(#${q("korn")})` }));
  for (let i = 0; i < 4; i++) teile.push(line(8, 17 + i * 8, w - 8, 17 + i * 8, { stroke: M.holzRitze, "stroke-width": 0.9, "stroke-opacity": r.zahl(0.28, 0.5) }));
  teile.push(rect(17, 21, 30, 22, { fill: M.metallTief, rx: 1.5, filter: `url(#${q("korn")})` }));
  teile.push(rect(17, 21, 30, 22, { fill: "none", stroke: M.schatten, "stroke-width": 1.4, rx: 1.5, "stroke-opacity": 0.6 }));
  teile.push(line(18, 22.2, 46, 22.2, { stroke: M.metallHell, "stroke-width": 0.9, "stroke-opacity": 0.4 }));
  for (const [x, l] of [[74, 20], [84, 16], [94, 12]]) {
    teile.push(line(x, 32 - l / 2, x, 32 + l / 2, { stroke: M.eisen, "stroke-width": 3.4, "stroke-linecap": "round" }));
    teile.push(line(x - 0.8, 32 - l / 2 + 1, x - 0.8, 32 + l / 2 - 1, { stroke: M.metallHell, "stroke-width": 0.9, "stroke-opacity": 0.45, "stroke-linecap": "round" }));
  }
  teile.push(rect(8, 13, w - 16, ZELLE - 26, { fill: "none", stroke: M.holzRitze, "stroke-width": 2.2, rx: 2, "stroke-opacity": 0.82 }));
  return svg("Werkbank, gemalt", w, ZELLE,
    defs(korn(q("korn"), { frequenz: "0.04 1.1", oktaven: 4, saat: 181, staerke: 0.36 }),
      verlauf(q("holzverlauf"), [[0, M.holzHell], [0.5, M.holz], [1, M.holzTief]], 125),
      weichzeichner(q("weich"), 2)) + teile.join(""));
}

// ---------------------------------------------------------------------------------------------
// Welle 2 — die Assets, ohne die `pk.gemalt` kein Drop-in ist
//
// Gemessen statt geschätzt: `pk.gemalt` 1.0.0 beantwortete 34 der 47 `(art, schlagwort)`-Anfragen,
// die `grundriss`, `hoehle` und `siedlung` stellen. Ein Paket, das eine Anfrage nicht bedienen
// kann, ist als Stiltausch unbrauchbar — der Generator liefert dann eine Karte mit Löchern und
// eine Zeile in `bericht.nichtBedient`. Diese Welle schliesst alle dreizehn.
// ---------------------------------------------------------------------------------------------

function bodenZiegel(name) {
  const r = zufall(name), q = kennung(name);
  const teile = [grund(ZELLE, M.fuge, q("korn"))];
  // Läuferverband: Lagenhöhe 16 teilt 64 glatt, Versatz fest — sonst verspringt der Verband
  // über die Kachelgrenze und die Wand sieht gekachelt aus wie ein Reissverschluss.
  for (let lage = 0; lage < 4; lage++) {
    const y = lage * 16, versatz = lage % 2 === 0 ? 0 : 16;
    for (let x = versatz - 32; x < ZELLE; x += 32) {
      const ton = mische(mische(M.tuch, M.erde, r.zahl(0.3, 0.62)), M.schatten, r.zahl(0.02, 0.26));
      teile.push(rect(x + 1, y + 1, 30, 14, { fill: ton, rx: 1.2, filter: `url(#${q("korn")})` }));
      teile.push(polyline([[x + 1.6, y + 14.4], [x + 1.6, y + 1.6], [x + 30.4, y + 1.6]],
        { stroke: M.knochen, "stroke-width": 0.8, "stroke-opacity": 0.22, fill: "none" }));
      teile.push(polyline([[x + 1.8, y + 14.5], [x + 30.5, y + 14.5], [x + 30.5, y + 1.8]],
        { stroke: M.schatten, "stroke-width": 1, "stroke-opacity": 0.34, fill: "none" }));
    }
    if (lage > 0) teile.push(fuge(0, y, ZELLE, y, q("weich"), { breite: 1.2 }));
  }
  teile.push(rect(0, 0, ZELLE, ZELLE, { fill: M.schatten, "fill-opacity": 0.12, filter: `url(#${q("flecken")})` }));
  return svg("Ziegelboden, gemalt", ZELLE, ZELLE,
    defs(korn(q("korn"), { frequenz: 0.95, oktaven: 5, saat: 191, staerke: 0.36 }),
      flecken(q("flecken"), { frequenz: 0.04, saat: 193, staerke: 0.5 }),
      weichzeichner(q("weich"), 1)) + teile.join(""));
}

function stalagmit(name) {
  const r = zufall(name), q = kennung(name);
  const teile = [];
  const aussen = klumpen(r, 32, 34, 17, 9, 0.2);
  teile.push(poly(aussen, { fill: M.schatten, "fill-opacity": 0.36, transform: "translate(1.6 2)", filter: `url(#${q("weich")})` }));
  teile.push(poly(aussen, { fill: `url(#${q("kegel")})`, filter: `url(#${q("korn")})` }));
  // Ringe nach innen: ein Tropfstein ist ein Kegel von oben, und den liest man an den Stufen.
  for (const [ring, ton] of [[12, 0.3], [7, 0.6], [3.2, 0.85]]) {
    const p = klumpen(r, 32, 33, ring, 8, 0.18);
    teile.push(poly(p, { fill: mische(M.fels, M.felsHell, ton), filter: `url(#${q("korn")})` }));
    teile.push(poly(p, { fill: "none", stroke: M.schatten, "stroke-width": 1, "stroke-opacity": 0.42, "stroke-linejoin": "round" }));
  }
  teile.push(poly(aussen, { fill: "none", stroke: M.schatten, "stroke-width": 1.8, "stroke-opacity": 0.66, "stroke-linejoin": "round" }));
  return svg("Stalagmit, gemalt", ZELLE, ZELLE,
    defs(korn(q("korn"), { frequenz: 1.1, oktaven: 5, saat: 197, staerke: 0.42 }),
      rundverlauf(q("kegel"), [[0, M.felsHell], [0.55, M.fels], [1, M.felsTief]], 0.36, 0.3, 0.85),
      weichzeichner(q("weich"), 2.2)) + teile.join(""));
}

function tropfsteinsaeule(name) {
  const r = zufall(name), q = kennung(name);
  const aussen = klumpen(r, 32, 32, 22, 11, 0.14);
  const teile = [poly(aussen, { fill: M.schatten, "fill-opacity": 0.34, transform: "translate(1.6 2)", filter: `url(#${q("weich")})` })];
  teile.push(poly(aussen, { fill: `url(#${q("kegel")})`, filter: `url(#${q("korn")})` }));
  for (const [ring, ton] of [[16, 0.22], [11, 0.45], [6, 0.7]]) {
    const p = klumpen(r, 32, 32, ring, 10, 0.13);
    teile.push(poly(p, { fill: mische(M.fels, M.felsHell, ton), "fill-opacity": 0.85, filter: `url(#${q("korn")})` }));
    teile.push(poly(p, { fill: "none", stroke: M.schatten, "stroke-width": 0.9, "stroke-opacity": 0.36, "stroke-linejoin": "round" }));
  }
  teile.push(poly(aussen, { fill: "none", stroke: M.schatten, "stroke-width": 2, "stroke-opacity": 0.68, "stroke-linejoin": "round" }));
  return svg("Tropfsteinsäule, gemalt", ZELLE, ZELLE,
    defs(korn(q("korn"), { frequenz: 1, oktaven: 5, saat: 199, staerke: 0.4 }),
      rundverlauf(q("kegel"), [[0, M.felsHell], [0.5, M.fels], [1, M.felsTief]], 0.34, 0.28, 0.88),
      weichzeichner(q("weich"), 2.2)) + teile.join(""));
}

function pilzgruppe(name) {
  const r = zufall(name), q = kennung(name);
  const teile = [];
  for (const [cx, cy, rad] of [[24, 37, 10], [41, 30, 8.5], [33, 46, 6.5]]) {
    teile.push(ellipse(cx + 1, cy + rad * 0.6 + 1.4, rad * 0.8, rad * 0.32, { fill: M.schatten, "fill-opacity": 0.34, filter: `url(#${q("weich")})` }));
    teile.push(ellipse(cx, cy + rad * 0.55, rad * 0.36, rad * 0.5, { fill: M.knochen, filter: `url(#${q("korn")})` }));
    teile.push(ellipse(cx, cy + rad * 0.55, rad * 0.36, rad * 0.5, { fill: "none", stroke: M.schatten, "stroke-width": 1.1, "stroke-opacity": 0.5 }));
    teile.push(path(`M${n(cx - rad)} ${n(cy)} A${n(rad)} ${n(rad * 0.88)} 0 0 1 ${n(cx + rad)} ${n(cy)} Z`,
      { fill: `url(#${q("hut")})`, filter: `url(#${q("korn")})` }));
    teile.push(path(`M${n(cx - rad)} ${n(cy)} A${n(rad)} ${n(rad * 0.88)} 0 0 1 ${n(cx + rad)} ${n(cy)} Z`,
      { fill: "none", stroke: M.schatten, "stroke-width": 1.4, "stroke-opacity": 0.6 }));
    // Tupfen: was einen Pilz von einer Kuppel unterscheidet.
    for (let i = 0; i < 3; i++) {
      teile.push(circle(cx + r.zahl(-rad * 0.55, rad * 0.55), cy - r.zahl(rad * 0.15, rad * 0.5), r.zahl(1, 1.9),
        { fill: M.knochen, "fill-opacity": 0.72 }));
    }
  }
  return svg("Pilzgruppe, gemalt", ZELLE, ZELLE,
    defs(korn(q("korn"), { frequenz: 1.2, oktaven: 4, saat: 211, staerke: 0.34 }),
      rundverlauf(q("hut"), [[0, mische(M.pilz, M.knochen, 0.3)], [0.6, M.pilz], [1, mische(M.pilz, M.schatten, 0.4)]], 0.36, 0.3, 0.85),
      weichzeichner(q("weich"), 1.8)) + teile.join(""));
}

function wasserlache(name) {
  const r = zufall(name), q = kennung(name);
  const umriss = klumpen(r, 32, 33, 22, 10, 0.22);
  const teile = [poly(umriss, { fill: M.schatten, "fill-opacity": 0.4, filter: `url(#${q("weich")})` })];
  teile.push(poly(umriss, { fill: `url(#${q("tiefe")})`, filter: `url(#${q("korn")})` }));
  // Spiegelung: zwei helle Bögen, sonst liest die Lache als Loch.
  teile.push(path("M18 26 Q28 20 38 24", { fill: "none", stroke: M.wasserHell, "stroke-width": 1.6, "stroke-opacity": 0.5 }));
  teile.push(path("M22 40 Q32 36 44 39", { fill: "none", stroke: M.wasserHell, "stroke-width": 1.2, "stroke-opacity": 0.32 }));
  teile.push(poly(umriss, { fill: "none", stroke: M.schatten, "stroke-width": 1.4, "stroke-opacity": 0.55, "stroke-linejoin": "round" }));
  return svg("Wasserlache, gemalt", ZELLE, ZELLE,
    defs(korn(q("korn"), { frequenz: 0.7, oktaven: 4, saat: 223, staerke: 0.26 }),
      rundverlauf(q("tiefe"), [[0, M.wasserHell], [0.5, M.wasser], [1, mische(M.wasser, M.schatten, 0.55)]], 0.38, 0.32, 0.85),
      weichzeichner(q("weich"), 2.4)) + teile.join(""));
}

function knochenhaufen(name) {
  const r = zufall(name), q = kennung(name);
  const teile = [ellipse(32, 36, 22, 15, { fill: M.schatten, "fill-opacity": 0.28, filter: `url(#${q("weich")})` })];
  for (let i = 0; i < 5; i++) {
    const x = r.zahl(14, 46), y = r.zahl(20, 46), l = r.zahl(11, 19), b = r.zahl(3, 4.6), dreh = r.zahl(-70, 70);
    teile.push(group({ transform: `translate(${n(x)} ${n(y)}) rotate(${n(dreh)})` },
      rect(0, -b / 2, l, b, { fill: `url(#${q("knochenverlauf")})`, rx: b / 2, filter: `url(#${q("korn")})` }),
      circle(0, 0, b * 0.95, { fill: `url(#${q("knochenverlauf")})`, filter: `url(#${q("korn")})` }),
      circle(l, 0, b * 0.95, { fill: `url(#${q("knochenverlauf")})`, filter: `url(#${q("korn")})` }),
      rect(0, -b / 2, l, b, { fill: "none", stroke: M.schatten, "stroke-width": 0.9, "stroke-opacity": 0.5, rx: b / 2 })));
  }
  // Der Schädel macht den Haufen zum Knochenhaufen.
  teile.push(path("M22 46 Q20 34 25 32 Q32 29 39 32 Q44 34 42 46 Z", { fill: `url(#${q("knochenverlauf")})`, filter: `url(#${q("korn")})` }));
  teile.push(path("M22 46 Q20 34 25 32 Q32 29 39 32 Q44 34 42 46 Z", { fill: "none", stroke: M.schatten, "stroke-width": 1.3, "stroke-opacity": 0.6 }));
  teile.push(ellipse(27.5, 39, 3, 3.4, { fill: M.schatten, "fill-opacity": 0.85 }));
  teile.push(ellipse(36.5, 39, 3, 3.4, { fill: M.schatten, "fill-opacity": 0.85 }));
  teile.push(path("M30 45 L32 42 L34 45 Z", { fill: M.schatten, "fill-opacity": 0.75 }));
  return svg("Knochenhaufen, gemalt", ZELLE, ZELLE,
    defs(korn(q("korn"), { frequenz: 1.15, oktaven: 4, saat: 227, staerke: 0.3 }),
      rundverlauf(q("knochenverlauf"), [[0, "#ece5cf"], [0.6, M.knochen], [1, mische(M.knochen, M.erdeTief, 0.5)]], 0.34, 0.28, 0.9),
      weichzeichner(q("weich"), 2.4)) + teile.join(""));
}

function spalte(name) {
  const r = zufall(name), q = kennung(name);
  const links = [], rechts = [];
  for (let i = 0; i <= 6; i++) {
    const y = 5 + i * 9;
    const breite = Math.sin((i / 6) * Math.PI) * r.zahl(6, 11) + 2;
    links.push([32 - breite + r.zahl(-2, 2), y]);
    rechts.push([32 + breite + r.zahl(-2, 2), y]);
  }
  const umriss = [...links, ...rechts.slice().reverse()];
  const teile = [poly(umriss, { fill: M.felsTief, transform: "scale(1.35) translate(-8.4 -8.4)", "fill-opacity": 0.5, filter: `url(#${q("weich")})` })];
  teile.push(poly(umriss, { fill: `url(#${q("tiefe")})` }));
  teile.push(poly(umriss, { fill: "none", stroke: M.schatten, "stroke-width": 1.6, "stroke-opacity": 0.75, "stroke-linejoin": "round" }));
  // Eine helle Bruchkante links: sonst ist es ein Fleck, kein Spalt im Fels.
  teile.push(polyline(links, { fill: "none", stroke: M.felsHell, "stroke-width": 1.1, "stroke-opacity": 0.4 }));
  return svg("Spalte, gemalt", ZELLE, ZELLE,
    defs(rundverlauf(q("tiefe"), [[0, M.schatten, 1], [0.6, M.schatten, 0.94], [1, M.felsTief, 0.7]], 0.5, 0.5, 0.7),
      weichzeichner(q("weich"), 3)) + teile.join(""));
}

function brunnen(name) {
  const q = kennung(name);
  const teile = [circle(33, 33.4, 23, { fill: M.schatten, "fill-opacity": 0.34, filter: `url(#${q("weich")})` })];
  teile.push(circle(32, 32, 23, { fill: `url(#${q("kranz")})`, filter: `url(#${q("korn")})` }));
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    teile.push(line(32 + Math.cos(a) * 16.5, 32 + Math.sin(a) * 16.5, 32 + Math.cos(a) * 22.5, 32 + Math.sin(a) * 22.5,
      { stroke: M.schatten, "stroke-width": 1.1, "stroke-opacity": 0.34 }));
  }
  teile.push(circle(32, 32, 23, { fill: "none", stroke: M.schatten, "stroke-width": 2, "stroke-opacity": 0.68 }));
  teile.push(circle(32, 32, 16, { fill: `url(#${q("tiefe")})` }));
  teile.push(circle(32, 32, 16, { fill: "none", stroke: M.schatten, "stroke-width": 1.6, "stroke-opacity": 0.6 }));
  teile.push(circle(32, 32, 9, { fill: "none", stroke: M.wasserHell, "stroke-width": 1.1, "stroke-opacity": 0.3 }));
  teile.push(line(8, 32, 56, 32, { stroke: M.holzTief, "stroke-width": 3.4, "stroke-linecap": "round" }));
  teile.push(line(8, 31.2, 56, 31.2, { stroke: M.holzHell, "stroke-width": 1, "stroke-opacity": 0.4, "stroke-linecap": "round" }));
  return svg("Brunnen, gemalt", ZELLE, ZELLE,
    defs(korn(q("korn"), { frequenz: 0.85, oktaven: 5, saat: 229, staerke: 0.36 }),
      rundverlauf(q("kranz"), [[0, M.steinHell], [0.5, M.stein], [1, M.steinTief]], 0.34, 0.3, 0.85),
      rundverlauf(q("tiefe"), [[0, M.wasser, 0.9], [0.55, mische(M.wasser, M.schatten, 0.6), 0.95], [1, M.schatten, 1]], 0.42, 0.38, 0.7),
      weichzeichner(q("weich"), 2.4)) + teile.join(""));
}

function markeEingang(name) {
  const q = kennung(name);
  // Eine eingemeisselte Platte, kein Aufkleber: die Marke muss auf dem Boden liegen können.
  const teile = [circle(33, 33.4, 21, { fill: M.schatten, "fill-opacity": 0.3, filter: `url(#${q("weich")})` })];
  teile.push(circle(32, 32, 21, { fill: `url(#${q("platte")})`, filter: `url(#${q("korn")})` }));
  teile.push(circle(32, 32, 21, { fill: "none", stroke: M.schatten, "stroke-width": 2, "stroke-opacity": 0.7 }));
  teile.push(circle(30.9, 30.9, 20, { fill: "none", stroke: M.steinHell, "stroke-width": 1, "stroke-opacity": 0.3 }));
  for (const [breite, farbe, deckung, dy] of [[5.2, M.schatten, 0.8, 0.9], [3, M.gold, 0.95, 0]]) {
    teile.push(polyline([[23, 41], [32, 24], [41, 41]], { fill: "none", stroke: farbe, "stroke-width": breite, "stroke-opacity": deckung, "stroke-linecap": "round", "stroke-linejoin": "round", transform: `translate(0 ${n(dy)})` }));
    teile.push(line(32, 25, 32, 45, { stroke: farbe, "stroke-width": breite, "stroke-opacity": deckung, "stroke-linecap": "round", transform: `translate(0 ${n(dy)})` }));
  }
  return svg("Marke Eingang, gemalt", ZELLE, ZELLE,
    defs(korn(q("korn"), { frequenz: 0.9, oktaven: 5, saat: 233, staerke: 0.34 }),
      rundverlauf(q("platte"), [[0, M.steinHell], [0.5, M.stein], [1, M.steinTief]], 0.34, 0.3, 0.85),
      weichzeichner(q("weich"), 2)) + teile.join(""));
}

function waffenstaender(name) {
  const q = kennung(name);
  const teile = [wurf((o) => rect(10, 13, 44, 38, { rx: 2, ...o }), q("weich"))];
  teile.push(rect(10, 44, 44, 8, { fill: `url(#${q("holzverlauf")})`, rx: 1.6, filter: `url(#${q("korn")})` }));
  teile.push(rect(10, 13, 44, 6, { fill: `url(#${q("holzverlauf")})`, rx: 1.6, filter: `url(#${q("korn")})` }));
  // Speer, Schwert, Axt — jede Waffe mit Stiel, Kopf und Lichtkante.
  teile.push(line(20, 16, 20, 48, { stroke: M.holzTief, "stroke-width": 3.4, "stroke-linecap": "round" }));
  teile.push(poly([[20, 5], [24, 16], [16, 16]], { fill: `url(#${q("eisenverlauf")})`, filter: `url(#${q("korn")})` }));
  teile.push(poly([[20, 5], [24, 16], [16, 16]], { fill: "none", stroke: M.schatten, "stroke-width": 1.1, "stroke-opacity": 0.6, "stroke-linejoin": "round" }));
  teile.push(rect(30, 12, 4.4, 36, { fill: `url(#${q("eisenverlauf")})`, filter: `url(#${q("korn")})` }));
  teile.push(rect(25, 18, 14.4, 3.4, { fill: M.eisen, rx: 1.2 }));
  teile.push(line(31, 13, 31, 47, { stroke: M.metallHell, "stroke-width": 0.9, "stroke-opacity": 0.5 }));
  teile.push(line(44, 14, 44, 48, { stroke: M.holzTief, "stroke-width": 3.4, "stroke-linecap": "round" }));
  teile.push(path("M44 11 Q54 17 44 24 Z", { fill: `url(#${q("eisenverlauf")})`, filter: `url(#${q("korn")})` }));
  teile.push(path("M44 11 Q54 17 44 24 Z", { fill: "none", stroke: M.schatten, "stroke-width": 1.1, "stroke-opacity": 0.6 }));
  teile.push(rect(10, 44, 44, 8, { fill: "none", stroke: M.holzRitze, "stroke-width": 1.6, rx: 1.6, "stroke-opacity": 0.8 }));
  return svg("Waffenständer, gemalt", ZELLE, ZELLE,
    defs(korn(q("korn"), { frequenz: 0.9, oktaven: 4, saat: 239, staerke: 0.34 }),
      verlauf(q("holzverlauf"), [[0, M.holzHell], [0.5, M.holz], [1, M.holzTief]], 125),
      verlauf(q("eisenverlauf"), [[0, M.metallHell], [0.4, M.metall], [1, M.eisen]], 118),
      weichzeichner(q("weich"), 2)) + teile.join(""));
}

function ruestungsstaender(name) {
  const q = kennung(name);
  const teile = [wurf((o) => ellipse(32, 52, 12, 4, o), q("weich"))];
  teile.push(ellipse(32, 52, 12, 4, { fill: `url(#${q("holzverlauf")})`, filter: `url(#${q("korn")})` }));
  teile.push(line(32, 52, 32, 44, { stroke: M.holzTief, "stroke-width": 3.4 }));
  // Brustpanzer, dann Helm darüber: von oben ein besetzter Ständer.
  teile.push(path("M19 22 L45 22 L42 43 Q32 48 22 43 Z", { fill: `url(#${q("eisenverlauf")})`, filter: `url(#${q("korn")})` }));
  teile.push(path("M19 22 L45 22 L42 43 Q32 48 22 43 Z", { fill: "none", stroke: M.schatten, "stroke-width": 1.8, "stroke-opacity": 0.7, "stroke-linejoin": "round" }));
  teile.push(line(32, 23, 32, 44, { stroke: M.schatten, "stroke-width": 1.2, "stroke-opacity": 0.45 }));
  teile.push(path("M24 28 Q32 33 40 28", { fill: "none", stroke: M.metallHell, "stroke-width": 1.1, "stroke-opacity": 0.4 }));
  teile.push(path("M23 11 Q32 4 41 11 L41 21 L23 21 Z", { fill: `url(#${q("eisenverlauf")})`, filter: `url(#${q("korn")})` }));
  teile.push(path("M23 11 Q32 4 41 11 L41 21 L23 21 Z", { fill: "none", stroke: M.schatten, "stroke-width": 1.6, "stroke-opacity": 0.7, "stroke-linejoin": "round" }));
  teile.push(rect(25, 14, 14, 3.4, { fill: M.schatten, "fill-opacity": 0.75, rx: 1 }));
  teile.push(line(24.5, 12, 39.5, 12, { stroke: M.metallHell, "stroke-width": 1, "stroke-opacity": 0.45 }));
  return svg("Rüstungsständer, gemalt", ZELLE, ZELLE,
    defs(korn(q("korn"), { frequenz: 0.85, oktaven: 4, saat: 241, staerke: 0.32 }),
      verlauf(q("holzverlauf"), [[0, M.holzHell], [0.5, M.holz], [1, M.holzTief]], 125),
      verlauf(q("eisenverlauf"), [[0, M.metallHell], [0.42, M.metall], [1, M.metallTief]], 120),
      weichzeichner(q("weich"), 2)) + teile.join(""));
}

function schildwand(name) {
  const q = kennung(name), w = ZELLE * 2;
  const teile = [wurf((o) => rect(6, 17, w - 12, 30, { rx: 2, ...o }), q("weich"))];
  teile.push(rect(6, 17, w - 12, 30, { fill: `url(#${q("holzverlauf")})`, rx: 2, filter: `url(#${q("korn")})` }));
  for (let x = 10; x < w - 10; x += 9) teile.push(line(x, 18, x, 46, { stroke: M.holzRitze, "stroke-width": 0.8, "stroke-opacity": 0.4 }));
  // Rundschild, Wappenschild, Rundschild.
  for (const cx of [28, 100]) {
    teile.push(circle(cx + 1, 33.4, 12.5, { fill: M.schatten, "fill-opacity": 0.4, filter: `url(#${q("weich")})` }));
    teile.push(circle(cx, 33, 12.5, { fill: `url(#${q("eisenverlauf")})`, filter: `url(#${q("korn")})` }));
    teile.push(circle(cx, 33, 12.5, { fill: "none", stroke: M.schatten, "stroke-width": 1.8, "stroke-opacity": 0.7 }));
    teile.push(circle(cx, 33, 4.4, { fill: M.metallHell, "fill-opacity": 0.8 }));
    teile.push(circle(cx - 1, 32, 2.4, { fill: M.knochen, "fill-opacity": 0.5 }));
  }
  const wappen = "M64 20 L76 24.5 L76 35 Q70 44 64 46.5 Q58 44 52 35 L52 24.5 Z";
  teile.push(path(wappen, { fill: M.schatten, "fill-opacity": 0.4, transform: "translate(1 1.2)", filter: `url(#${q("weich")})` }));
  teile.push(path(wappen, { fill: `url(#${q("tuchverlauf")})`, filter: `url(#${q("korn")})` }));
  teile.push(path(wappen, { fill: "none", stroke: M.schatten, "stroke-width": 1.8, "stroke-opacity": 0.72, "stroke-linejoin": "round" }));
  teile.push(line(64, 21, 64, 45.5, { stroke: M.gold, "stroke-width": 1.6, "stroke-opacity": 0.6 }));
  teile.push(rect(6, 17, w - 12, 30, { fill: "none", stroke: M.holzRitze, "stroke-width": 2, rx: 2, "stroke-opacity": 0.8 }));
  return svg("Schildwand, gemalt", w, ZELLE,
    defs(korn(q("korn"), { frequenz: 0.9, oktaven: 4, saat: 251, staerke: 0.34 }),
      verlauf(q("holzverlauf"), [[0, M.holzHell], [0.5, M.holz], [1, M.holzTief]], 125),
      verlauf(q("eisenverlauf"), [[0, M.metallHell], [0.4, M.metall], [1, M.metallTief]], 118),
      verlauf(q("tuchverlauf"), [[0, M.tuch], [1, M.tuchTief]], 118),
      weichzeichner(q("weich"), 2)) + teile.join(""));
}

function buecherstapel(name) {
  const r = zufall(name), q = kennung(name);
  const teile = [wurf((o) => rect(14, 22, 36, 26, { rx: 1.5, ...o }), q("weich"))];
  let y = 47;
  for (let i = 0; i < 4; i++) {
    const b = r.zahl(24, 34), h = r.zahl(5.5, 7.5), x = 32 - b / 2 + r.zahl(-3, 3);
    const farbe = r.waehle([M.tuch, M.gruen, M.wasser, M.goldTief, M.pilz]);
    teile.push(rect(x, y - h, b, h, { fill: mische(farbe, M.schatten, r.zahl(0.05, 0.3)), rx: 1, filter: `url(#${q("korn")})` }));
    teile.push(rect(x, y - h, b, h, { fill: "none", stroke: M.schatten, "stroke-width": 1, "stroke-opacity": 0.55, rx: 1 }));
    teile.push(rect(x + 1.6, y - h + 0.9, 2.2, h - 1.8, { fill: M.knochen, "fill-opacity": 0.55 }));
    teile.push(line(x + 0.8, y - h + 0.8, x + b - 0.8, y - h + 0.8, { stroke: M.knochen, "stroke-width": 0.7, "stroke-opacity": 0.28 }));
    y -= h + 0.7;
  }
  return svg("Bücherstapel, gemalt", ZELLE, ZELLE,
    defs(korn(q("korn"), { frequenz: 1.1, oktaven: 4, saat: 257, staerke: 0.3 }), weichzeichner(q("weich"), 1.8)) + teile.join(""));
}

function muenzhaufen(name) {
  const r = zufall(name), q = kennung(name);
  const teile = [ellipse(32, 38, 20, 12, { fill: M.schatten, "fill-opacity": 0.3, filter: `url(#${q("weich")})` })];
  for (let i = 0; i < 16; i++) {
    const cx = r.zahl(17, 47), cy = r.zahl(29, 45), rad = r.zahl(3.2, 4.8);
    teile.push(ellipse(cx, cy, rad, rad * 0.62, { fill: `url(#${q("gold")})`, filter: `url(#${q("korn")})` }));
    teile.push(ellipse(cx, cy, rad, rad * 0.62, { fill: "none", stroke: M.goldTief, "stroke-width": 0.7, "stroke-opacity": 0.7 }));
  }
  // Ein Stapel obendrauf, sonst liest der Fleck als Kies statt als Geld.
  for (let i = 0; i < 4; i++) {
    teile.push(ellipse(38, 35 - i * 3.2, 4.8, 3, { fill: `url(#${q("gold")})`, filter: `url(#${q("korn")})` }));
    teile.push(ellipse(38, 35 - i * 3.2, 4.8, 3, { fill: "none", stroke: M.goldTief, "stroke-width": 0.8, "stroke-opacity": 0.8 }));
  }
  teile.push(ellipse(36.6, 30.6, 2.2, 1.3, { fill: "#f2d489", "fill-opacity": 0.7 }));
  return svg("Münzhaufen, gemalt", ZELLE, ZELLE,
    defs(korn(q("korn"), { frequenz: 1.3, oktaven: 4, saat: 263, staerke: 0.26 }),
      rundverlauf(q("gold"), [[0, "#f0cd7c"], [0.55, M.gold], [1, M.goldTief]], 0.34, 0.28, 0.9),
      weichzeichner(q("weich"), 2.4)) + teile.join(""));
}

function kelch(name) {
  const q = kennung(name);
  const teile = [ellipse(32, 47, 10, 4, { fill: M.schatten, "fill-opacity": 0.36, filter: `url(#${q("weich")})` })];
  teile.push(path("M21 19 Q21 34 32 39 Q43 34 43 19 Z", { fill: `url(#${q("gold")})`, filter: `url(#${q("korn")})` }));
  teile.push(path("M21 19 Q21 34 32 39 Q43 34 43 19 Z", { fill: "none", stroke: M.schatten, "stroke-width": 1.6, "stroke-opacity": 0.65 }));
  teile.push(line(32, 39, 32, 45, { stroke: M.goldTief, "stroke-width": 3.4 }));
  teile.push(ellipse(32, 46.5, 9, 3.4, { fill: `url(#${q("gold")})`, filter: `url(#${q("korn")})` }));
  teile.push(ellipse(32, 46.5, 9, 3.4, { fill: "none", stroke: M.schatten, "stroke-width": 1.4, "stroke-opacity": 0.6 }));
  teile.push(ellipse(32, 19, 11, 3.6, { fill: mische(M.tuch, M.schatten, 0.25), stroke: M.goldTief, "stroke-width": 1.4 }));
  teile.push(ellipse(30.4, 18.4, 4.2, 1.4, { fill: M.flammeHell, "fill-opacity": 0.35 }));
  teile.push(path("M23 22 Q24 32 31 36", { fill: "none", stroke: "#f2d489", "stroke-width": 1.2, "stroke-opacity": 0.55 }));
  return svg("Kelch, gemalt", ZELLE, ZELLE,
    defs(korn(q("korn"), { frequenz: 0.95, oktaven: 4, saat: 269, staerke: 0.24 }),
      rundverlauf(q("gold"), [[0, "#f2d489"], [0.5, M.gold], [1, M.goldTief]], 0.32, 0.26, 0.9),
      weichzeichner(q("weich"), 2)) + teile.join(""));
}

function flasche(name) {
  const q = kennung(name);
  const koerperForm = "M27 23 L27 30 Q20 36 20 44 L20 48 Q20 52 24 52 L40 52 Q44 52 44 48 L44 44 Q44 36 37 30 L37 23 Z";
  const teile = [ellipse(32, 51, 13, 4, { fill: M.schatten, "fill-opacity": 0.36, filter: `url(#${q("weich")})` })];
  teile.push(path(koerperForm, { fill: `url(#${q("glas")})`, filter: `url(#${q("korn")})` }));
  teile.push(path(koerperForm, { fill: "none", stroke: M.schatten, "stroke-width": 1.6, "stroke-opacity": 0.6, "stroke-linejoin": "round" }));
  // Glanzstreifen links: das eine Detail, an dem Glas als Glas liest.
  teile.push(path("M25 34 Q22.5 40 23 49", { fill: "none", stroke: "#dff0f4", "stroke-width": 2, "stroke-opacity": 0.42, "stroke-linecap": "round" }));
  teile.push(path("M23 44 Q32 41 41 44 L41 48 Q41 51 38 51 L26 51 Q23 51 23 48 Z", { fill: M.tuchTief, "fill-opacity": 0.6 }));
  teile.push(rect(26, 15, 12, 8, { fill: M.holzTief, rx: 1.6, filter: `url(#${q("korn")})` }));
  teile.push(rect(26, 15, 12, 8, { fill: "none", stroke: M.schatten, "stroke-width": 1.2, "stroke-opacity": 0.6, rx: 1.6 }));
  return svg("Flasche, gemalt", ZELLE, ZELLE,
    defs(korn(q("korn"), { frequenz: 0.8, oktaven: 4, saat: 271, staerke: 0.2 }),
      verlauf(q("glas"), [[0, "#9dc4cc"], [0.45, M.wasser], [1, mische(M.wasser, M.schatten, 0.45)]], 118),
      weichzeichner(q("weich"), 2)) + teile.join(""));
}

function amphore(name) {
  const q = kennung(name);
  const form = "M26 22 Q17 31 18 39 Q19 49 32 53 Q45 49 46 39 Q47 31 38 22 Z";
  const teile = [ellipse(32, 52, 13, 4.5, { fill: M.schatten, "fill-opacity": 0.36, filter: `url(#${q("weich")})` })];
  teile.push(path("M26 25 Q17 27 20 35", { fill: "none", stroke: M.erdeTief, "stroke-width": 3.4, "stroke-linecap": "round" }));
  teile.push(path("M38 25 Q47 27 44 35", { fill: "none", stroke: M.erdeTief, "stroke-width": 3.4, "stroke-linecap": "round" }));
  teile.push(path(form, { fill: `url(#${q("ton")})`, filter: `url(#${q("korn")})` }));
  teile.push(path(form, { fill: "none", stroke: M.schatten, "stroke-width": 1.6, "stroke-opacity": 0.62, "stroke-linejoin": "round" }));
  teile.push(path("M20 37 Q32 41 44 37", { fill: "none", stroke: M.erdeTief, "stroke-width": 1.4, "stroke-opacity": 0.55 }));
  teile.push(path("M21 43 Q32 47 43 43", { fill: "none", stroke: M.erdeTief, "stroke-width": 1.1, "stroke-opacity": 0.4 }));
  teile.push(ellipse(32, 21, 7.5, 3.4, { fill: M.erdeTief, stroke: M.schatten, "stroke-width": 1.2, "stroke-opacity": 0.6 }));
  teile.push(ellipse(32, 20.6, 5.4, 2.2, { fill: M.schatten, "fill-opacity": 0.6 }));
  return svg("Amphore, gemalt", ZELLE, ZELLE,
    defs(korn(q("korn"), { frequenz: 1, oktaven: 4, saat: 277, staerke: 0.32 }),
      rundverlauf(q("ton"), [[0, M.erdeHell], [0.5, M.erde], [1, M.erdeTief]], 0.34, 0.28, 0.88),
      weichzeichner(q("weich"), 2)) + teile.join(""));
}

function wandfackel(name) {
  const q = kennung(name);
  const teile = [circle(32, 30, 22, { fill: `url(#${q("schein")})` })];
  teile.push(rect(26, 40, 12, 13, { fill: `url(#${q("eisenverlauf")})`, rx: 2, filter: `url(#${q("korn")})` }));
  teile.push(rect(26, 40, 12, 13, { fill: "none", stroke: M.schatten, "stroke-width": 1.4, "stroke-opacity": 0.65, rx: 2 }));
  teile.push(line(32, 41, 32, 27, { stroke: M.holzTief, "stroke-width": 4.4, "stroke-linecap": "round" }));
  teile.push(line(31.2, 40, 31.2, 28, { stroke: M.holzHell, "stroke-width": 1.1, "stroke-opacity": 0.4, "stroke-linecap": "round" }));
  teile.push(path("M32 8 Q38 18 34.4 26 Q41 21 39 13 Q46 21 39 32 L25 32 Q18 21 25 13 Q23 21 29.6 26 Q26 18 32 8 Z",
    { fill: `url(#${q("flammenverlauf")})` }));
  teile.push(ellipse(32, 25, 4, 6, { fill: M.flammeHell, "fill-opacity": 0.8, filter: `url(#${q("weich")})` }));
  return svg("Wandfackel, gemalt", ZELLE, ZELLE,
    defs(korn(q("korn"), { frequenz: 0.9, oktaven: 4, saat: 281, staerke: 0.3 }),
      verlauf(q("eisenverlauf"), [[0, M.metallHell], [0.4, M.metall], [1, M.eisen]], 120),
      rundverlauf(q("schein"), [[0, M.flamme, 0.45], [0.55, M.flamme, 0.16], [1, M.flamme, 0]], 0.5, 0.5, 0.5),
      verlauf(q("flammenverlauf"), [[0, M.flammeHell], [1, M.flamme]], 90),
      weichzeichner(q("weich"), 2.4)) + teile.join(""));
}

function tuerStein(name) {
  const q = kennung(name);
  const teile = [rect(7, 24, 50, 16, { fill: M.schatten, "fill-opacity": 0.35, transform: "translate(0 1.4)", filter: `url(#${q("weich")})` })];
  teile.push(rect(7, 24, 50, 16, { fill: `url(#${q("steinverlauf")})`, rx: 1.4, filter: `url(#${q("korn")})` }));
  for (const x of [24, 40]) teile.push(line(x, 24, x, 40, { stroke: M.schatten, "stroke-width": 1.3, "stroke-opacity": 0.45 }));
  teile.push(circle(32, 32, 5, { fill: "none", stroke: M.schatten, "stroke-width": 2.4, "stroke-opacity": 0.7 }));
  teile.push(circle(31.2, 31.2, 5, { fill: "none", stroke: M.steinHell, "stroke-width": 1, "stroke-opacity": 0.4 }));
  teile.push(rect(7, 24, 50, 16, { fill: "none", stroke: M.schatten, "stroke-width": 2, "stroke-opacity": 0.72, rx: 1.4 }));
  teile.push(line(8, 25.2, 56, 25.2, { stroke: M.steinHell, "stroke-width": 0.9, "stroke-opacity": 0.32 }));
  return svg("Steintür, gemalt", ZELLE, ZELLE,
    defs(korn(q("korn"), { frequenz: 0.85, oktaven: 5, saat: 283, staerke: 0.36 }),
      verlauf(q("steinverlauf"), [[0, M.steinHell], [0.45, M.stein], [1, M.steinTief]], 118),
      weichzeichner(q("weich"), 1.8)) + teile.join(""));
}

// ---------------------------------------------------------------------------------------------

const KATALOG = [
  { name: "boden_stein", art: "boden", einheiten: [1, 1], kachelbar: true, schlagworte: ["stein", "trocken", "halle"], zeichne: () => bodenStein("boden_stein") },
  { name: "boden_stein_rissig", art: "boden", einheiten: [1, 1], kachelbar: true, schlagworte: ["stein", "verfall", "krypta"], zeichne: () => bodenSteinRissig("boden_stein_rissig") },
  { name: "boden_holz", art: "boden", einheiten: [1, 1], kachelbar: true, schlagworte: ["holz", "wohnraum"], zeichne: () => bodenHolz("boden_holz") },
  { name: "boden_erde", art: "boden", einheiten: [1, 1], kachelbar: true, schlagworte: ["erde", "hoehle", "keller"], zeichne: () => bodenErde("boden_erde") },
  { name: "boden_fliese", art: "boden", einheiten: [1, 1], kachelbar: true, schlagworte: ["fliese", "tempel", "gehoben"], zeichne: () => bodenFliese("boden_fliese") },
  { name: "boden_wasser", art: "boden", einheiten: [1, 1], kachelbar: true, schlagworte: ["wasser", "flach", "zisterne"], zeichne: () => bodenWasser("boden_wasser") },
  { name: "boden_fels", art: "boden", einheiten: [1, 1], kachelbar: true, schlagworte: ["fels", "hoehle", "tief"], zeichne: () => bodenFels("boden_fels") },

  { name: "wand_stein", art: "wand", einheiten: [1, 1], schlagworte: ["stein", "mauer", "halle"], zeichne: () => wandStein("wand_stein") },
  { name: "wand_holz", art: "wand", einheiten: [1, 1], schlagworte: ["holz", "mauer", "wohnraum"], zeichne: () => wandHolz("wand_holz") },
  { name: "wand_fels", art: "wand", einheiten: [1, 1], schlagworte: ["fels", "mauer", "hoehle"], zeichne: () => wandFels("wand_fels") },

  { name: "tuer_holz", art: "tuer", einheiten: [1, 1], schlagworte: ["holz", "drehbar"], zeichne: () => tuerHolz("tuer_holz") },
  { name: "tuer_gitter", art: "tuer", einheiten: [1, 1], schlagworte: ["metall", "sichtbar", "kerker"], zeichne: () => tuerGitter("tuer_gitter") },
  { name: "falltuer", art: "tuer", einheiten: [1, 1], schlagworte: ["boden", "verborgen"], zeichne: () => falltuer("falltuer") },

  { name: "saeule", art: "aufbau", einheiten: [1, 1], schlagworte: ["stein", "halle", "traeger"], zeichne: () => saeule("saeule") },
  { name: "treppe_auf", art: "aufbau", einheiten: [1, 2], schlagworte: ["treppe", "aufwaerts", "ausgang"], zeichne: () => treppe("treppe_auf", "auf") },
  { name: "treppe_ab", art: "aufbau", einheiten: [1, 2], schlagworte: ["treppe", "abwaerts", "tiefe"], zeichne: () => treppe("treppe_ab", "ab") },
  { name: "podest", art: "aufbau", einheiten: [2, 2], schlagworte: ["stein", "thron", "tempel"], zeichne: () => podest("podest") },
  { name: "schutt", art: "aufbau", einheiten: [1, 1], schlagworte: ["verfall", "geroell", "hindernis"], zeichne: () => schutt("schutt") },
  { name: "felsblock", art: "aufbau", einheiten: [1, 1], schlagworte: ["fels", "geroell", "hindernis"], zeichne: () => felsblock("felsblock") },
  { name: "grube", art: "aufbau", einheiten: [2, 2], schlagworte: ["falle", "tiefe", "gefahr"], zeichne: () => grube("grube") },

  { name: "tisch_lang", art: "moebel", einheiten: [2, 1], schlagworte: ["holz", "halle", "mahl"], zeichne: () => tischLang("tisch_lang") },
  { name: "tisch_rund", art: "moebel", einheiten: [1, 1], schlagworte: ["holz", "kammer"], zeichne: () => tischRund("tisch_rund") },
  { name: "stuhl", art: "moebel", einheiten: [1, 1], schlagworte: ["holz", "sitz"], zeichne: () => stuhl("stuhl") },
  { name: "bett", art: "moebel", einheiten: [1, 2], schlagworte: ["holz", "wohnraum", "rast"], zeichne: () => bett("bett") },
  { name: "regal", art: "moebel", einheiten: [2, 1], schlagworte: ["holz", "buecher", "lager"], zeichne: () => regal("regal") },
  { name: "werkbank", art: "moebel", einheiten: [2, 1], schlagworte: ["holz", "handwerk", "schmiede"], zeichne: () => werkbank("werkbank") },
  { name: "altar", art: "moebel", einheiten: [2, 1], schlagworte: ["stein", "tempel", "kult"], zeichne: () => altar("altar") },
  { name: "sarkophag", art: "moebel", einheiten: [1, 2], schlagworte: ["stein", "krypta", "grab"], zeichne: () => sarkophag("sarkophag") },
  { name: "amboss", art: "moebel", einheiten: [1, 1], schlagworte: ["metall", "schmiede", "handwerk"], zeichne: () => amboss("amboss") },

  { name: "truhe", art: "gefaess", einheiten: [1, 1], schlagworte: ["holz", "schatz", "behaelter"], zeichne: () => truhe("truhe") },
  { name: "fass", art: "gefaess", einheiten: [1, 1], schlagworte: ["holz", "lager", "behaelter"], zeichne: () => fass("fass") },
  { name: "kiste", art: "gefaess", einheiten: [1, 1], schlagworte: ["holz", "lager", "behaelter"], zeichne: () => kiste("kiste") },
  { name: "krug", art: "gefaess", einheiten: [1, 1], schlagworte: ["ton", "vorrat", "behaelter"], zeichne: () => krug("krug") },

  { name: "feuerschale", art: "licht", einheiten: [1, 1], schlagworte: ["feuer", "warm", "halle"], zeichne: () => feuerschale("feuerschale") },
  { name: "kerzenstaender", art: "licht", einheiten: [1, 1], schlagworte: ["kerze", "schwach", "kammer"], zeichne: () => kerzenstaender("kerzenstaender") },
  { name: "lagerfeuer", art: "licht", einheiten: [1, 1], schlagworte: ["feuer", "warm", "lager"], zeichne: () => lagerfeuer("lagerfeuer") },
  { name: "wandfackel", art: "licht", einheiten: [1, 1], schlagworte: ["feuer", "warm", "wache"], zeichne: () => wandfackel("wandfackel") },

  // -- Welle 2: die dreizehn Anfragen, die 1.0.0 nicht bedienen konnte, plus Materialbreite ----
  { name: "boden_ziegel", art: "boden", einheiten: [1, 1], kachelbar: true, schlagworte: ["ziegel", "halle", "gehoben"], zeichne: () => bodenZiegel("boden_ziegel") },
  { name: "tuer_stein", art: "tuer", einheiten: [1, 1], schlagworte: ["stein", "drehbar", "schwer"], zeichne: () => tuerStein("tuer_stein") },
  { name: "stalagmit", art: "aufbau", einheiten: [1, 1], schlagworte: ["fels", "hoehle", "hindernis"], zeichne: () => stalagmit("stalagmit") },
  { name: "tropfsteinsaeule", art: "aufbau", einheiten: [1, 1], schlagworte: ["fels", "traeger", "hoehle"], zeichne: () => tropfsteinsaeule("tropfsteinsaeule") },
  { name: "pilzgruppe", art: "aufbau", einheiten: [1, 1], schlagworte: ["pilz", "feucht", "hoehle"], zeichne: () => pilzgruppe("pilzgruppe") },
  { name: "wasserlache", art: "aufbau", einheiten: [1, 1], schlagworte: ["wasser", "feucht", "flach"], zeichne: () => wasserlache("wasserlache") },
  { name: "knochenhaufen", art: "aufbau", einheiten: [1, 1], schlagworte: ["knochen", "verfall", "hoehle"], zeichne: () => knochenhaufen("knochenhaufen") },
  { name: "spalte", art: "aufbau", einheiten: [1, 1], schlagworte: ["tiefe", "gefahr", "hoehle"], zeichne: () => spalte("spalte") },
  { name: "brunnen", art: "aufbau", einheiten: [1, 1], schlagworte: ["wasser", "kammer", "tief"], zeichne: () => brunnen("brunnen") },
  { name: "waffenstaender", art: "moebel", einheiten: [1, 1], schlagworte: ["waffe", "handwerk", "wache"], zeichne: () => waffenstaender("waffenstaender") },
  { name: "ruestungsstaender", art: "moebel", einheiten: [1, 1], schlagworte: ["ruestung", "wache", "handwerk"], zeichne: () => ruestungsstaender("ruestungsstaender") },
  { name: "schildwand", art: "moebel", einheiten: [2, 1], schlagworte: ["schild", "wache", "handwerk"], zeichne: () => schildwand("schildwand") },
  { name: "buecherstapel", art: "moebel", einheiten: [1, 1], schlagworte: ["buecher", "wissen", "kammer"], zeichne: () => buecherstapel("buecherstapel") },
  { name: "muenzhaufen", art: "moebel", einheiten: [1, 1], schlagworte: ["schatz", "gold", "lager"], zeichne: () => muenzhaufen("muenzhaufen") },
  { name: "kelch", art: "gefaess", einheiten: [1, 1], schlagworte: ["metall", "kult", "schatz"], zeichne: () => kelch("kelch") },
  { name: "flasche", art: "gefaess", einheiten: [1, 1], schlagworte: ["glas", "vorrat", "behaelter"], zeichne: () => flasche("flasche") },
  { name: "amphore", art: "gefaess", einheiten: [1, 1], schlagworte: ["ton", "vorrat", "behaelter"], zeichne: () => amphore("amphore") },
  { name: "marke_eingang", art: "marke", einheiten: [1, 1], schlagworte: ["eingang", "hinweis"], zeichne: () => markeEingang("marke_eingang") },
];

const LIZENZ_DATEI = "lizenz.txt";

await erzeugePaket({
  paketId: PAKET_ID,
  version: PAKET_VERSION,
  titel: "Gemalt — Materialien für die taktische Karte: Stein, Holz, Eisen, Stoff und Feuer",
  urheber: URHEBER,
  zelle: ZELLE,
  lizenzDatei: LIZENZ_DATEI,
  lizenzText: cc0Text(PAKET_ID, URHEBER, "tools/assets/erzeuge-gemaltpaket.mjs"),
  lizenz: { spdx: "CC0-1.0", inhaber: `${URHEBER} 2026`, herkunft: "eigen", quelle: null },
  katalog: KATALOG,
}, PAKET_DIR);
