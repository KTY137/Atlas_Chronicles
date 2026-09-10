#!/usr/bin/env node
// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
// Authors `assets/packs/pk.natur` — Außenmotive für die gemalte Landschaft: Bäume, Büsche,
// Felsen, Schilf, Boote und Hofzeug. Das Paket zum Streupinsel des Kartenstudios.
//
// Dieselbe Hand wie `pk.gemalt` (Verlauf für die Form, Korn für das Material, weicher Schatten
// nach Südost), aber von oben gesehen und für die Landschaft gedacht: eine Baumkrone ist ein
// rauer Klumpen mit Lichtseite, ein Nadelbaum ein Stern, Schilf ein Büschel Striche. Jeder
// Schatten ist in die Zeichnung gebacken, denn der Renderer legt seinen weichen Möbelschatten nur
// unter Ebenen −10..10, und Aufbauten stehen auf 15.
//
// **Jede `id` trägt den Assetnamen als Präfix** (siehe `erzeuge-gemaltpaket.mjs`): ein
// Kontaktbogen bettet viele dieser SVGs in ein Dokument ein, und ohne Präfix gewinnt die erste.
//
// Run: node tools/assets/erzeuge-naturpaket.mjs [--pruefe]

import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { zufallFabrik, circle, ellipse, line, path, poly, polyline, svg, klumpen, erzeugePaket, cc0Text, rect } from "./tusche.mjs";
import { M, korn, weichzeichner, verlauf, rundverlauf, defs, mische } from "./pinsel.mjs";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const PAKET_ID = "pk.natur";
const PAKET_VERSION = "1.0.0";
const PAKET_DIR = join(ROOT, "assets", "packs", PAKET_ID);
const ZELLE = 64;
const URHEBER = "Chronicle";

const zufall = zufallFabrik(PAKET_ID);
const kennung = (name) => (teil) => `${name}-${teil}`;

/** Die Landschaftspalette: Laub, Nadel, Schilf und Heu neben den Materialien des Pinsels. */
const N = {
  laub: "#5c7a3f", laubHell: "#8fab5a", laubTief: "#3a5228", laubSchatten: "#22331a",
  nadel: "#3d5c44", nadelHell: "#6f8f66", nadelTief: "#26392b",
  schilf: "#8b9b4c", schilfHell: "#bcc46e", schilfTief: "#5c6a2e",
  heu: "#c9a94f", heuHell: "#e2c877", heuTief: "#8c7130",
  moos: "#6e8a45",
  bluete: "#efd9df", blueteTief: "#c98ea2",
};

/** Der gebackene Schatten: dieselbe Form, nach Südost versetzt und weichgezeichnet. */
const schatten = (form, weichId, dx = 2.4, dy = 2.8, deckung = 0.34) =>
  form({ fill: M.schatten, "fill-opacity": deckung, transform: `translate(${dx} ${dy})`, filter: `url(#${weichId})` });

// ---------------------------------------------------------------------------------------------
// Bäume und Büsche
// ---------------------------------------------------------------------------------------------

/** Eine Laubkrone von oben: rauer Klumpen, Lichtseite oben links, Blattballen in zwei Tönen. */
function krone(r, q, cx, cy, radius, ecken, teile, { ballen = 5, kornId = q("korn"), verlaufId = q("kugel"), weichId = q("weich") } = {}) {
  // Gelappt statt gezackt: jede zweite Ecke liegt etwas innen, so wird der Umriss zur Wolke.
  const punkte = klumpen(r, cx, cy, radius, ecken, 0.1).map(([x, y], k) => k % 2 ? [cx + (x - cx) * 0.9, cy + (y - cy) * 0.9] : [x, y]);
  const form = (o) => poly(punkte, o);
  teile.push(schatten(form, weichId, radius * 0.14, radius * 0.17));
  teile.push(form({ fill: `url(#${verlaufId})`, filter: `url(#${kornId})` }));
  // Blattballen: helle Wölbungen zur Lichtseite, dunkle Mulden zur Schattenseite.
  for (let k = 0; k < ballen; k++) {
    const a = r.zahl(0, Math.PI * 2), d = r.zahl(0.15, 0.6) * radius, rr = r.zahl(0.22, 0.36) * radius;
    const x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d, licht = Math.cos(a + Math.PI * 0.75) > 0;
    teile.push(circle(x, y, rr, { fill: licht ? N.laubHell : N.laubTief, "fill-opacity": licht ? 0.62 : 0.5, filter: `url(#${weichId})` }));
    teile.push(circle(x - rr * 0.25, y - rr * 0.25, rr * 0.45, { fill: licht ? N.laubHell : N.laub, "fill-opacity": 0.4 }));
  }
  teile.push(form({ fill: "none", stroke: N.laubSchatten, "stroke-width": 1.5, "stroke-opacity": 0.62, "stroke-linejoin": "round" }));
  teile.push(form({ fill: "none", stroke: N.laubHell, "stroke-width": 0.9, "stroke-opacity": 0.32, transform: "translate(-0.8 -0.9)" }));
}
const kroneDefs = (q, saat) => defs(
  korn(q("korn"), { frequenz: 0.9, oktaven: 4, saat, staerke: 0.36 }),
  rundverlauf(q("kugel"), [[0, N.laubHell], [0.45, N.laub], [1, N.laubTief]], 0.36, 0.3, 0.82),
  weichzeichner(q("weich"), 1.8));

function laubbaum(name) {
  const r = zufall(name), q = kennung(name), teile = [];
  krone(r, q, 32, 31, 22, 15, teile, { ballen: 5 });
  return svg("Laubbaum, von oben", ZELLE, ZELLE, kroneDefs(q, 301) + teile.join(""));
}
function laubbaumGross(name) {
  const r = zufall(name), q = kennung(name), teile = [];
  krone(r, q, 64, 62, 46, 22, teile, { ballen: 11 });
  return svg("Großer Laubbaum, von oben", ZELLE * 2, ZELLE * 2, kroneDefs(q, 303) + teile.join(""));
}
function baumgruppe(name) {
  const r = zufall(name), q = kennung(name), teile = [];
  // Drei Kronen, die hintere zuerst: die vordere überlappt die hintere, wie Bäume es tun.
  krone(r, q, 44, 42, 24, 14, teile, { ballen: 4 });
  krone(r, q, 86, 50, 22, 13, teile, { ballen: 4 });
  krone(r, q, 62, 82, 27, 16, teile, { ballen: 6 });
  return svg("Baumgruppe, von oben", ZELLE * 2, ZELLE * 2, kroneDefs(q, 305) + teile.join(""));
}
function busch(name) {
  const r = zufall(name), q = kennung(name), teile = [];
  krone(r, q, 32, 34, 15, 11, teile, { ballen: 3 });
  // Ein paar Beeren, damit der Busch kein kleiner Baum ist.
  for (let k = 0; k < 5; k++) teile.push(circle(32 + r.zahl(-8, 8), 34 + r.zahl(-7, 7), 1.3, { fill: N.blueteTief, "fill-opacity": 0.85 }));
  return svg("Busch, von oben", ZELLE, ZELLE, kroneDefs(q, 307) + teile.join(""));
}

/** Ein Nadelbaum von oben ist ein Stern: Zweigspitzen außen, der Stamm als dunkler Kern. */
function nadel(r, q, cx, cy, radius, spitzen, teile) {
  const punkte = Array.from({ length: spitzen * 2 }, (_, k) => {
    const a = (k / (spitzen * 2)) * Math.PI * 2 - Math.PI / 2, rr = (k % 2 ? 0.52 : 1) * radius * r.zahl(0.9, 1.08);
    return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr];
  });
  const form = (o) => poly(punkte, o);
  teile.push(schatten(form, q("weich"), radius * 0.12, radius * 0.16, 0.36));
  teile.push(form({ fill: `url(#${q("kegel")})`, filter: `url(#${q("korn")})`, "stroke-linejoin": "round" }));
  // Die Zweige laufen von der Spitze nach außen; dunkel, damit der Stern sich nicht in eine Scheibe verliert.
  for (let k = 0; k < spitzen; k++) {
    const a = (k / spitzen) * Math.PI * 2 - Math.PI / 2;
    teile.push(line(cx, cy, cx + Math.cos(a) * radius * 0.92, cy + Math.sin(a) * radius * 0.92, { stroke: N.nadelTief, "stroke-width": 1.1, "stroke-opacity": 0.55, "stroke-linecap": "round" }));
  }
  teile.push(form({ fill: "none", stroke: N.nadelTief, "stroke-width": 1.3, "stroke-opacity": 0.7, "stroke-linejoin": "round" }));
  teile.push(circle(cx, cy, radius * 0.11, { fill: M.holzTief, "fill-opacity": 0.9 }));
  teile.push(circle(cx - radius * 0.06, cy - radius * 0.07, radius * 0.05, { fill: M.holzHell, "fill-opacity": 0.55 }));
}
const nadelDefs = (q, saat) => defs(
  korn(q("korn"), { frequenz: 1.1, oktaven: 4, saat, staerke: 0.34 }),
  rundverlauf(q("kegel"), [[0, N.nadelHell], [0.5, N.nadel], [1, N.nadelTief]], 0.4, 0.36, 0.8),
  weichzeichner(q("weich"), 1.8));
function nadelbaum(name) {
  const r = zufall(name), q = kennung(name), teile = [];
  nadel(r, q, 32, 32, 26, 9, teile);
  return svg("Nadelbaum, von oben", ZELLE, ZELLE, nadelDefs(q, 311) + teile.join(""));
}
function nadelbaumGross(name) {
  const r = zufall(name), q = kennung(name), teile = [];
  nadel(r, q, 64, 64, 54, 13, teile);
  return svg("Große Tanne, von oben", ZELLE * 2, ZELLE * 2, nadelDefs(q, 313) + teile.join(""));
}

function baumstumpf(name) {
  const r = zufall(name), q = kennung(name), teile = [];
  const aussen = klumpen(r, 32, 33, 15, 12, 0.08);
  const form = (o) => poly(aussen, o);
  teile.push(schatten(form, q("weich"), 2, 2.4));
  teile.push(form({ fill: `url(#${q("rinde")})`, filter: `url(#${q("korn")})` }));
  // Die Schnittfläche mit Jahresringen.
  teile.push(circle(32, 33, 11.5, { fill: M.holzHell, filter: `url(#${q("korn")})` }));
  for (let k = 1; k <= 5; k++) teile.push(circle(32 + r.zahl(-0.6, 0.6), 33 + r.zahl(-0.6, 0.6), k * 2.1, { fill: "none", stroke: M.holzTief, "stroke-width": 0.7, "stroke-opacity": 0.5 }));
  teile.push(line(32, 33, 32 + r.zahl(4, 9), 33 + r.zahl(-8, -3), { stroke: M.holzRitze, "stroke-width": 1, "stroke-opacity": 0.6, "stroke-linecap": "round" }));
  teile.push(form({ fill: "none", stroke: M.holzRitze, "stroke-width": 1.5, "stroke-opacity": 0.6, "stroke-linejoin": "round" }));
  return svg("Baumstumpf, von oben", ZELLE, ZELLE,
    defs(korn(q("korn"), { frequenz: 0.9, oktaven: 4, saat: 317, staerke: 0.36 }),
      rundverlauf(q("rinde"), [[0, M.holz], [0.75, M.holzTief], [1, M.holzRitze]], 0.4, 0.4, 0.7),
      weichzeichner(q("weich"), 1.8)) + teile.join(""));
}

function totholz(name) {
  const r = zufall(name), q = kennung(name), teile = [], w = ZELLE * 2;
  // Ein liegender Stamm, leicht verjüngt, mit zwei Aststummeln; die Schnittfläche links.
  const stamm = [[12, 24], [w - 14, 27], [w - 10, 34], [w - 14, 41], [12, 44]];
  const form = (o) => poly(stamm, o);
  teile.push(schatten(form, q("weich"), 2.6, 3));
  teile.push(form({ fill: `url(#${q("rinde")})`, filter: `url(#${q("korn")})`, "stroke-linejoin": "round" }));
  for (let k = 0; k < 7; k++) {
    const x = r.zahl(22, w - 24);
    teile.push(line(x, 26 + r.zahl(0, 3), x + r.zahl(-4, 4), 42 - r.zahl(0, 3), { stroke: M.holzRitze, "stroke-width": 0.8, "stroke-opacity": 0.35, "stroke-linecap": "round" }));
  }
  for (const [x, richtung] of [[44, -1], [88, 1]]) {
    const ast = [[x, 34 + richtung * 8], [x + 6, 34 + richtung * 8], [x + 10, 34 + richtung * 18], [x + 4, 34 + richtung * 19]];
    teile.push(poly(ast, { fill: M.holzTief, stroke: M.holzRitze, "stroke-width": 1.2, "stroke-opacity": 0.6, "stroke-linejoin": "round", filter: `url(#${q("korn")})` }));
  }
  teile.push(ellipse(12, 34, 4.2, 10.2, { fill: M.holzHell, stroke: M.holzRitze, "stroke-width": 1.2, "stroke-opacity": 0.6 }));
  for (let k = 1; k <= 3; k++) teile.push(ellipse(12, 34, k * 1.2, k * 2.9, { fill: "none", stroke: M.holzTief, "stroke-width": 0.6, "stroke-opacity": 0.5 }));
  teile.push(form({ fill: "none", stroke: M.holzRitze, "stroke-width": 1.5, "stroke-opacity": 0.62, "stroke-linejoin": "round" }));
  teile.push(polyline([[14, 26], [w - 16, 29]], { stroke: M.holzHell, "stroke-width": 1, "stroke-opacity": 0.35 }));
  return svg("Umgestürzter Stamm, von oben", w, ZELLE,
    defs(korn(q("korn"), { frequenz: "0.05 0.9", oktaven: 4, saat: 319, staerke: 0.38 }),
      verlauf(q("rinde"), [[0, M.holzHell], [0.55, M.holz], [1, M.holzTief]], 90),
      weichzeichner(q("weich"), 1.8)) + teile.join(""));
}

// ---------------------------------------------------------------------------------------------
// Fels
// ---------------------------------------------------------------------------------------------

function findling(name) {
  const r = zufall(name), q = kennung(name), teile = [];
  const punkte = klumpen(r, 32, 34, 22, 8, 0.24);
  const form = (o) => poly(punkte, o);
  teile.push(schatten(form, q("weich"), 2.6, 3));
  teile.push(form({ fill: `url(#${q("woelbung")})`, filter: `url(#${q("korn")})`, "stroke-linejoin": "round" }));
  // Eine Bruchkante quer über den Stein und ein Moospolster auf der Wetterseite.
  teile.push(polyline([punkte[1], [30, 33], punkte[5]], { stroke: M.felsTief, "stroke-width": 1.4, "stroke-opacity": 0.5 }));
  teile.push(polyline([punkte[0], [31, 32], punkte[2]], { stroke: M.felsHell, "stroke-width": 1, "stroke-opacity": 0.45 }));
  teile.push(poly(klumpen(r, 23, 26, 7, 8, 0.3), { fill: N.moos, "fill-opacity": 0.55, filter: `url(#${q("weich")})` }));
  teile.push(form({ fill: "none", stroke: M.schatten, "stroke-width": 1.8, "stroke-opacity": 0.68, "stroke-linejoin": "round" }));
  return svg("Findling, von oben", ZELLE, ZELLE,
    defs(korn(q("korn"), { frequenz: 1.05, oktaven: 5, saat: 331, staerke: 0.44 }),
      rundverlauf(q("woelbung"), [[0, M.felsHell], [0.5, M.fels], [1, M.felsTief]], 0.34, 0.28, 0.85),
      weichzeichner(q("weich"), 2)) + teile.join(""));
}

function geroell(name) {
  const r = zufall(name), q = kennung(name), teile = [];
  const steine = [[20, 22, 9], [42, 18, 7], [34, 40, 10], [16, 44, 6], [50, 44, 7.5], [30, 28, 4.5]];
  for (const [cx, cy, radius] of steine) {
    const punkte = klumpen(r, cx, cy, radius, 6, 0.22), form = (o) => poly(punkte, o);
    teile.push(schatten(form, q("weich"), 1.6, 1.9, 0.3));
    teile.push(form({ fill: mische(M.fels, r.waehle([M.felsHell, M.felsTief, M.erde]), r.zahl(0.1, 0.5)), filter: `url(#${q("korn")})` }));
    teile.push(polyline([punkte[4], punkte[5], punkte[0]], { stroke: M.felsHell, "stroke-width": 0.9, "stroke-opacity": 0.45 }));
    teile.push(form({ fill: "none", stroke: M.schatten, "stroke-width": 1.2, "stroke-opacity": 0.62, "stroke-linejoin": "round" }));
  }
  return svg("Geröll, von oben", ZELLE, ZELLE,
    defs(korn(q("korn"), { frequenz: 1.2, oktaven: 4, saat: 337, staerke: 0.4 }), weichzeichner(q("weich"), 1.4)) + teile.join(""));
}

// ---------------------------------------------------------------------------------------------
// Ufer und Wasser
// ---------------------------------------------------------------------------------------------

function schilf(name) {
  const r = zufall(name), q = kennung(name), teile = [];
  // Ein feuchter Grund, darauf ein Büschel Halme, die vom Fuß aus nach allen Seiten liegen.
  teile.push(ellipse(32, 36, 17, 12, { fill: M.wasser, "fill-opacity": 0.22, filter: `url(#${q("weich")})` }));
  const halme = 13;
  for (let k = 0; k < halme; k++) {
    const a = (k / halme) * Math.PI * 2 + r.zahl(-0.2, 0.2), laenge = r.zahl(14, 24), fuss = [32 + r.zahl(-3, 3), 36 + r.zahl(-2, 2)];
    const spitze = [fuss[0] + Math.cos(a) * laenge, fuss[1] + Math.sin(a) * laenge * 0.8];
    const knick = [fuss[0] + Math.cos(a + 0.35) * laenge * 0.55, fuss[1] + Math.sin(a + 0.35) * laenge * 0.45];
    const farbe = r.waehle([N.schilf, N.schilfHell, N.schilfTief]);
    teile.push(path(`M${fuss[0]} ${fuss[1]} Q${knick[0]} ${knick[1]} ${spitze[0]} ${spitze[1]}`, { fill: "none", stroke: M.schatten, "stroke-width": 2.2, "stroke-opacity": 0.22, "stroke-linecap": "round", transform: "translate(1.2 1.5)" }));
    teile.push(path(`M${fuss[0]} ${fuss[1]} Q${knick[0]} ${knick[1]} ${spitze[0]} ${spitze[1]}`, { fill: "none", stroke: farbe, "stroke-width": 1.5, "stroke-linecap": "round" }));
    // Jeder dritte Halm trägt einen Kolben.
    if (k % 3 === 0) teile.push(ellipse(spitze[0], spitze[1], 1.4, 3, { fill: M.holzTief, transform: `rotate(${Math.round((a * 180) / Math.PI + 90)} ${spitze[0]} ${spitze[1]})` }));
  }
  return svg("Schilf, von oben", ZELLE, ZELLE, defs(weichzeichner(q("weich"), 2.2)) + teile.join(""));
}

function seerosen(name) {
  const r = zufall(name), q = kennung(name), teile = [];
  const blaetter = [[22, 24, 9], [42, 20, 7.5], [36, 42, 10], [16, 44, 6.5], [50, 44, 6]];
  for (const [cx, cy, radius] of blaetter) {
    const kerbe = r.zahl(0, Math.PI * 2), form = (o) => path(`M${cx} ${cy} L${cx + Math.cos(kerbe - 0.35) * radius} ${cy + Math.sin(kerbe - 0.35) * radius} A${radius} ${radius} 0 1 0 ${cx + Math.cos(kerbe + 0.35) * radius} ${cy + Math.sin(kerbe + 0.35) * radius} Z`, o);
    teile.push(form({ fill: M.schatten, "fill-opacity": 0.2, transform: "translate(0.8 1.2)", filter: `url(#${q("weich")})` }));
    teile.push(form({ fill: `url(#${q("blatt")})`, filter: `url(#${q("korn")})` }));
    teile.push(form({ fill: "none", stroke: N.laubTief, "stroke-width": 1, "stroke-opacity": 0.6, "stroke-linejoin": "round" }));
    for (let k = 0; k < 3; k++) { const a = kerbe + Math.PI * 0.5 + k * 0.9; teile.push(line(cx, cy, cx + Math.cos(a) * radius * 0.85, cy + Math.sin(a) * radius * 0.85, { stroke: N.laubHell, "stroke-width": 0.6, "stroke-opacity": 0.45 })); }
  }
  // Eine offene Blüte auf dem größten Blatt.
  for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; teile.push(ellipse(36 + Math.cos(a) * 3.2, 42 + Math.sin(a) * 3.2, 1.6, 3.4, { fill: N.bluete, stroke: N.blueteTief, "stroke-width": 0.5, transform: `rotate(${Math.round((a * 180) / Math.PI + 90)} ${36 + Math.cos(a) * 3.2} ${42 + Math.sin(a) * 3.2})` })); }
  teile.push(circle(36, 42, 1.8, { fill: N.heuHell }));
  return svg("Seerosen, von oben", ZELLE, ZELLE,
    defs(korn(q("korn"), { frequenz: 0.8, oktaven: 3, saat: 341, staerke: 0.26 }),
      rundverlauf(q("blatt"), [[0, N.laubHell], [0.6, N.laub], [1, N.laubTief]], 0.35, 0.35, 0.8),
      weichzeichner(q("weich"), 1.4)) + teile.join(""));
}

function boot(name) {
  const r = zufall(name), q = kennung(name), teile = [], h = ZELLE * 2;
  // Ein Ruderboot, Bug oben: der Rumpf als Spindel, Planken quer, zwei Duchten, Riemen ausgelegt.
  const rumpf = `M32 8 C46 30 46 92 32 ${h - 8} C18 92 18 30 32 8 Z`;
  const form = (o) => path(rumpf, o);
  teile.push(schatten(form, q("weich"), 3, 3.4));
  teile.push(form({ fill: `url(#${q("planken")})`, filter: `url(#${q("korn")})` }));
  teile.push(path(`M32 16 C41 34 41 90 32 ${h - 16} C23 90 23 34 32 16 Z`, { fill: M.holzTief, "fill-opacity": 0.55 }));
  for (let y = 24; y < h - 20; y += 9) { const halb = 9 * Math.sin(((y - 8) / (h - 16)) * Math.PI) + 1; teile.push(line(32 - halb, y + r.zahl(-0.6, 0.6), 32 + halb, y + r.zahl(-0.6, 0.6), { stroke: M.holzRitze, "stroke-width": 0.7, "stroke-opacity": 0.5 })); }
  for (const y of [44, 82]) { teile.push(rect(21, y - 3, 22, 6, { fill: M.holzHell, stroke: M.holzRitze, "stroke-width": 1, "stroke-opacity": 0.6, rx: 1, filter: `url(#${q("korn")})` })); }
  for (const seite of [-1, 1]) {
    teile.push(line(32 + seite * 12, 62, 32 + seite * 27, 40, { stroke: M.holzTief, "stroke-width": 2.2, "stroke-linecap": "round" }));
    teile.push(ellipse(32 + seite * 27, 38, 2.6, 5.5, { fill: M.holzHell, stroke: M.holzRitze, "stroke-width": 0.9, "stroke-opacity": 0.6, transform: `rotate(${seite * 32} ${32 + seite * 27} 38)` }));
  }
  teile.push(form({ fill: "none", stroke: M.holzRitze, "stroke-width": 1.6, "stroke-opacity": 0.66 }));
  return svg("Ruderboot, von oben", ZELLE, h,
    defs(korn(q("korn"), { frequenz: "0.9 0.05", oktaven: 4, saat: 347, staerke: 0.36 }),
      verlauf(q("planken"), [[0, M.holzHell], [0.5, M.holz], [1, M.holzTief]], 0),
      weichzeichner(q("weich"), 2)) + teile.join(""));
}

// ---------------------------------------------------------------------------------------------
// Hofzeug
// ---------------------------------------------------------------------------------------------

function heuhaufen(name) {
  const r = zufall(name), q = kennung(name), teile = [];
  const punkte = klumpen(r, 32, 33, 21, 14, 0.1), form = (o) => poly(punkte, o);
  teile.push(schatten(form, q("weich"), 2.6, 3));
  teile.push(form({ fill: `url(#${q("haufen")})`, filter: `url(#${q("korn")})` }));
  for (let k = 0; k < 26; k++) {
    const a = r.zahl(0, Math.PI * 2), d0 = r.zahl(2, 8), d1 = d0 + r.zahl(6, 12);
    teile.push(line(32 + Math.cos(a) * d0, 33 + Math.sin(a) * d0, 32 + Math.cos(a + 0.1) * d1, 33 + Math.sin(a + 0.1) * d1, { stroke: r.waehle([N.heuTief, N.heuHell]), "stroke-width": 0.8, "stroke-opacity": 0.55, "stroke-linecap": "round" }));
  }
  teile.push(form({ fill: "none", stroke: N.heuTief, "stroke-width": 1.4, "stroke-opacity": 0.6, "stroke-linejoin": "round" }));
  teile.push(line(32, 33, 32, 20, { stroke: M.holzTief, "stroke-width": 1.6, "stroke-linecap": "round" }));
  return svg("Heuhaufen, von oben", ZELLE, ZELLE,
    defs(korn(q("korn"), { frequenz: 1.3, oktaven: 4, saat: 353, staerke: 0.38 }),
      rundverlauf(q("haufen"), [[0, N.heuHell], [0.5, N.heu], [1, N.heuTief]], 0.4, 0.36, 0.78),
      weichzeichner(q("weich"), 2)) + teile.join(""));
}

function karren(name) {
  const r = zufall(name), q = kennung(name), teile = [], h = ZELLE * 2;
  // Deichsel nach oben, Ladefläche aus Brettern, zwei Räder mit Speichen seitlich.
  const bett = (o) => rect(18, 40, 28, 62, { rx: 2, ...o });
  teile.push(schatten(bett, q("weich"), 3, 3.4));
  for (const seite of [-1, 1]) {
    const cx = 32 + seite * 20, cy = 72;
    teile.push(circle(cx + 2, cy + 2.4, 11, { fill: M.schatten, "fill-opacity": 0.3, filter: `url(#${q("weich")})` }));
    teile.push(circle(cx, cy, 11, { fill: "none", stroke: M.holzTief, "stroke-width": 4.2 }));
    teile.push(circle(cx, cy, 11, { fill: "none", stroke: M.eisen, "stroke-width": 1.2, "stroke-opacity": 0.8 }));
    for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI; teile.push(line(cx - Math.cos(a) * 9, cy - Math.sin(a) * 9, cx + Math.cos(a) * 9, cy + Math.sin(a) * 9, { stroke: M.holzTief, "stroke-width": 1.4 })); }
    teile.push(circle(cx, cy, 2.2, { fill: M.eisen }));
  }
  teile.push(bett({ fill: `url(#${q("bretter")})`, filter: `url(#${q("korn")})` }));
  for (let x = 24; x < 46; x += 5.5) teile.push(line(x, 42, x + r.zahl(-0.4, 0.4), 100, { stroke: M.holzRitze, "stroke-width": 0.7, "stroke-opacity": 0.5 }));
  teile.push(bett({ fill: "none", stroke: M.holzRitze, "stroke-width": 1.6, "stroke-opacity": 0.66 }));
  for (const x of [22, 42]) teile.push(line(x, 40, x + (x < 32 ? 4 : -4), 10, { stroke: M.holzTief, "stroke-width": 2.6, "stroke-linecap": "round" }));
  teile.push(line(26, 12, 38, 12, { stroke: M.holzTief, "stroke-width": 2.4, "stroke-linecap": "round" }));
  return svg("Karren, von oben", ZELLE, h,
    defs(korn(q("korn"), { frequenz: "0.9 0.05", oktaven: 4, saat: 359, staerke: 0.36 }),
      verlauf(q("bretter"), [[0, M.holzHell], [0.5, M.holz], [1, M.holzTief]], 0),
      weichzeichner(q("weich"), 2)) + teile.join(""));
}

function zaun(name) {
  const r = zufall(name), q = kennung(name), teile = [], w = ZELLE * 2;
  // Zwei Riegel quer, Pfosten im Abstand; von oben ist ein Zaun ein schmales Band mit Schatten.
  teile.push(rect(2, 27, w - 4, 12, { fill: M.schatten, "fill-opacity": 0.26, transform: "translate(1.6 2.4)", filter: `url(#${q("weich")})` }));
  for (const y of [29, 35]) teile.push(line(2, y + r.zahl(-0.4, 0.4), w - 2, y + r.zahl(-0.4, 0.4), { stroke: M.holz, "stroke-width": 2.6, "stroke-linecap": "round", filter: `url(#${q("korn")})` }));
  for (const y of [29, 35]) teile.push(line(2, y - 0.8, w - 2, y - 0.8, { stroke: M.holzHell, "stroke-width": 0.8, "stroke-opacity": 0.5 }));
  for (let x = 6; x <= w - 6; x += 19) {
    teile.push(rect(x - 2.6, 24, 5.2, 16, { fill: M.holzTief, stroke: M.holzRitze, "stroke-width": 1, "stroke-opacity": 0.6, rx: 1, filter: `url(#${q("korn")})` }));
    teile.push(circle(x, 32, 1, { fill: M.holzHell, "fill-opacity": 0.6 }));
  }
  return svg("Zaunstück, von oben", w, ZELLE,
    defs(korn(q("korn"), { frequenz: "0.05 0.9", oktaven: 4, saat: 367, staerke: 0.34 }), weichzeichner(q("weich"), 1.8)) + teile.join(""));
}

// ---------------------------------------------------------------------------------------------

const KATALOG = [
  { name: "laubbaum", art: "aufbau", einheiten: [1, 1], schlagworte: ["aussen", "baum", "wald", "laub"], zeichne: () => laubbaum("laubbaum") },
  { name: "laubbaum_gross", art: "aufbau", einheiten: [2, 2], schlagworte: ["aussen", "baum", "wald", "laub", "gross"], zeichne: () => laubbaumGross("laubbaum_gross") },
  { name: "baumgruppe", art: "aufbau", einheiten: [2, 2], schlagworte: ["aussen", "baum", "wald", "laub", "gruppe"], zeichne: () => baumgruppe("baumgruppe") },
  { name: "nadelbaum", art: "aufbau", einheiten: [1, 1], schlagworte: ["aussen", "baum", "wald", "nadel"], zeichne: () => nadelbaum("nadelbaum") },
  { name: "nadelbaum_gross", art: "aufbau", einheiten: [2, 2], schlagworte: ["aussen", "baum", "wald", "nadel", "gross"], zeichne: () => nadelbaumGross("nadelbaum_gross") },
  { name: "busch", art: "aufbau", einheiten: [1, 1], schlagworte: ["aussen", "busch", "hecke", "laub"], zeichne: () => busch("busch") },
  { name: "baumstumpf", art: "aufbau", einheiten: [1, 1], schlagworte: ["aussen", "holz", "wald", "lichtung"], zeichne: () => baumstumpf("baumstumpf") },
  { name: "totholz", art: "aufbau", einheiten: [2, 1], schlagworte: ["aussen", "holz", "wald", "hindernis"], zeichne: () => totholz("totholz") },
  { name: "findling", art: "aufbau", einheiten: [1, 1], schlagworte: ["aussen", "fels", "stein", "hindernis"], zeichne: () => findling("findling") },
  { name: "geroell", art: "aufbau", einheiten: [1, 1], schlagworte: ["aussen", "fels", "stein", "geroell"], zeichne: () => geroell("geroell") },
  { name: "schilf", art: "aufbau", einheiten: [1, 1], schlagworte: ["aussen", "ufer", "wasser", "sumpf"], zeichne: () => schilf("schilf") },
  { name: "seerosen", art: "aufbau", einheiten: [1, 1], schlagworte: ["aussen", "wasser", "see", "bluete"], zeichne: () => seerosen("seerosen") },
  { name: "boot", art: "aufbau", einheiten: [1, 2], schlagworte: ["aussen", "wasser", "boot", "hafen"], zeichne: () => boot("boot") },
  { name: "heuhaufen", art: "aufbau", einheiten: [1, 1], schlagworte: ["aussen", "hof", "feld", "vorrat"], zeichne: () => heuhaufen("heuhaufen") },
  { name: "karren", art: "aufbau", einheiten: [1, 2], schlagworte: ["aussen", "hof", "weg", "verkehr"], zeichne: () => karren("karren") },
  { name: "zaun", art: "aufbau", einheiten: [2, 1], schlagworte: ["aussen", "hof", "holz", "grenze"], zeichne: () => zaun("zaun") },
];

const LIZENZ_DATEI = "lizenz.txt";

await erzeugePaket({
  paketId: PAKET_ID,
  version: PAKET_VERSION,
  titel: "Natur — Bäume, Felsen, Schilf, Boote und Hofzeug für die gemalte Landschaft",
  urheber: URHEBER,
  zelle: ZELLE,
  lizenzDatei: LIZENZ_DATEI,
  lizenzText: cc0Text(PAKET_ID, URHEBER, "tools/assets/erzeuge-naturpaket.mjs"),
  lizenz: { spdx: "CC0-1.0", inhaber: `${URHEBER} 2026`, herkunft: "eigen", quelle: null },
  katalog: KATALOG,
}, PAKET_DIR);
