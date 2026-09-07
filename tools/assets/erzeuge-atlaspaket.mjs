#!/usr/bin/env node
// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
// Authors `assets/packs/pk.atlas` — Chronicle's second asset pack, and the first for the map you
// look at from above rather than stand on.
//
// Why a second pack rather than more rows in `pk.grundriss`: the packs answer different questions.
// A floorplan symbol is drawn at the scale of a person — a table is a table, a door swings. An
// overland symbol is a **pictogram at the scale of a day's march**: one drawn mountain means a
// range, one drawn tower means a holding with people in it. Mixing the two under one id would
// make `Stamp.a` ambiguous about scale, and `zellgroesse` would be lying to one of them.
//
// The gap this fills is concrete and was measured, not imagined: `forge/src/azgaar.ts:279` and
// `forge/src/eron-map.ts:114` both ship `stamps: []`. The world map has regions and places and
// **not one symbol** — an atlas of named nothing. These are the symbols it was missing.
//
// Same rules as the first pack, for the same reasons (see `erzeuge-grundrisspaket.mjs`): the art
// is source code, the pack reproduces under `--pruefe`, and every pixel is ours, so the pack owes
// nobody an attribution and cannot acquire one by accident.
//
// Run: node tools/assets/erzeuge-atlaspaket.mjs [--pruefe]

import { join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  C, zufallFabrik, n, rect, circle, ellipse, line, path, poly, polyline, group, kontur, feder, svg,
  klumpen, erzeugePaket, cc0Text,
} from "./tusche.mjs";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const PAKET_ID = "pk.atlas";
const PAKET_VERSION = "1.1.0";
const PAKET_DIR = join(ROOT, "assets", "packs", PAKET_ID);
const ZELLE = 64; // authoring pixels per map cell — mirrored into `paket.zellgroesse`
const URHEBER = "Chronicle";

const zufall = zufallFabrik(PAKET_ID);

// ---------------------------------------------------------------------------------------------
// Gelände — kachelbare Flächen. Innen darf es zittern, die vier Ränder niemals, sonst nähen die
// Kacheln nicht. Dieselbe Disziplin wie bei den Böden in `pk.grundriss`.
// ---------------------------------------------------------------------------------------------

function gelaendeGras(name) {
  const r = zufall(name);
  const teile = [rect(0, 0, ZELLE, ZELLE, { fill: C.gruen })];
  for (let i = 0; i < 22; i++) {
    const x = r.zahl(4, 60), y = r.zahl(6, 60);
    teile.push(polyline([[x, y], [x - r.zahl(1.5, 3), y - r.zahl(3, 6)]], feder({ stroke: C.gruenTief, "stroke-width": 1.1 })));
    teile.push(polyline([[x, y], [x + r.zahl(1.5, 3), y - r.zahl(3, 6)]], feder({ stroke: C.gruenTief, "stroke-width": 1.1 })));
  }
  return svg("Gelände: Grasland", ZELLE, ZELLE, teile.join(""));
}

function gelaendeWald(name) {
  const r = zufall(name);
  const teile = [rect(0, 0, ZELLE, ZELLE, { fill: C.gruenTief })];
  // Kronen dürfen den Rand überlappen, aber nicht darüber hinausragen: sie werden hart beschnitten,
  // und weil das Muster gespiegelt gesetzt wird, schliesst der Waldrand über die Kachelgrenze.
  for (let i = 0; i < 9; i++) {
    const cx = r.zahl(6, 58), cy = r.zahl(6, 58), rad = r.zahl(6, 10);
    teile.push(poly(klumpen(r, cx, cy, rad, 7, 0.18), { fill: C.gruen, stroke: C.tinte, "stroke-width": 1.2, "stroke-linejoin": "round" }));
    teile.push(line(cx, cy + rad * 0.6, cx, cy + rad * 1.1, feder({ stroke: C.holzTief, "stroke-width": 1.4 })));
  }
  return svg("Gelände: Wald", ZELLE, ZELLE, teile.join(""));
}

function gelaendeHuegel(name) {
  const r = zufall(name);
  const teile = [rect(0, 0, ZELLE, ZELLE, { fill: C.erde })];
  for (let reihe = 0; reihe < 4; reihe++) {
    const y = 12 + reihe * 15;
    for (let i = 0; i < 3; i++) {
      const x = i * 22 + r.zahl(2, 10);
      teile.push(path(`M${n(x)} ${n(y)} Q${n(x + 7)} ${n(y - 8)} ${n(x + 14)} ${n(y)}`, feder({ stroke: C.tinte, "stroke-width": 1.5, "stroke-opacity": 0.6 })));
    }
  }
  return svg("Gelände: Hügelland", ZELLE, ZELLE, teile.join(""));
}

function gelaendeBerg(name) {
  const r = zufall(name);
  const teile = [rect(0, 0, ZELLE, ZELLE, { fill: C.felsTief })];
  for (let i = 0; i < 7; i++) {
    const x = r.zahl(4, 54), y = r.zahl(16, 58), b = r.zahl(9, 15), h = r.zahl(10, 18);
    teile.push(poly([[x, y], [x + b / 2, y - h], [x + b, y]], { fill: C.fels, stroke: C.tinte, "stroke-width": 1.3, "stroke-linejoin": "round" }));
    teile.push(polyline([[x + b / 2, y - h], [x + b / 2 - 2.5, y - h * 0.45]], feder({ stroke: C.tinte, "stroke-width": 1, "stroke-opacity": 0.5 })));
  }
  return svg("Gelände: Gebirge", ZELLE, ZELLE, teile.join(""));
}

function gelaendeSumpf(name) {
  const r = zufall(name);
  const teile = [rect(0, 0, ZELLE, ZELLE, { fill: C.gruenTief })];
  for (let i = 0; i < 6; i++) {
    teile.push(poly(klumpen(r, r.zahl(10, 54), r.zahl(10, 54), r.zahl(5, 9), 8, 0.26), { fill: C.wasserTief, "fill-opacity": 0.75, stroke: "none" }));
  }
  // Waagerechte Striche sind die kartografische Konvention für Sumpf; ohne sie liest es als Teich.
  for (let i = 0; i < 12; i++) {
    const x = r.zahl(6, 48), y = r.zahl(6, 58);
    teile.push(line(x, y, x + r.zahl(5, 11), y, feder({ stroke: C.tinte, "stroke-width": 1.1, "stroke-opacity": 0.55 })));
  }
  return svg("Gelände: Sumpf", ZELLE, ZELLE, teile.join(""));
}

function gelaendeSand(name) {
  const r = zufall(name);
  const teile = [rect(0, 0, ZELLE, ZELLE, { fill: C.pergamentTief })];
  for (let i = 0; i < 5; i++) {
    const y = 7 + i * 13;
    teile.push(path(`M0 ${n(y)} Q16 ${n(y + r.zahl(-4, 4))} 32 ${n(y)} T64 ${n(y)}`, feder({ stroke: C.erde, "stroke-width": 1.5, "stroke-opacity": 0.85 })));
  }
  for (let i = 0; i < 8; i++) teile.push(circle(r.zahl(4, 60), r.zahl(4, 60), r.zahl(0.7, 1.5), { fill: C.tinteHell, "fill-opacity": 0.4 }));
  return svg("Gelände: Wüste", ZELLE, ZELLE, teile.join(""));
}

function gelaendeWasser(name) {
  const r = zufall(name);
  const teile = [rect(0, 0, ZELLE, ZELLE, { fill: C.wasserTief })];
  for (let i = 0; i < 4; i++) {
    const y = 8 + i * 16 + r.zahl(-2, 2);
    teile.push(path(`M0 ${n(y)} Q16 ${n(y - 4)} 32 ${n(y)} T64 ${n(y)}`, feder({ stroke: C.wasser, "stroke-width": 1.8 })));
  }
  return svg("Gelände: See", ZELLE, ZELLE, teile.join(""));
}

function gelaendeSchnee(name) {
  const r = zufall(name);
  const teile = [rect(0, 0, ZELLE, ZELLE, { fill: C.pergament })];
  for (let i = 0; i < 10; i++) {
    const x = r.zahl(6, 58), y = r.zahl(6, 58), rad = r.zahl(2.5, 5);
    for (const deg of [0, 60, 120]) {
      const a = (deg * Math.PI) / 180;
      teile.push(line(x - Math.cos(a) * rad, y - Math.sin(a) * rad, x + Math.cos(a) * rad, y + Math.sin(a) * rad, feder({ stroke: C.wasserTief, "stroke-width": 1, "stroke-opacity": 0.6 })));
    }
  }
  return svg("Gelände: Schnee", ZELLE, ZELLE, teile.join(""));
}

// ---------------------------------------------------------------------------------------------
// Landmarken — Pictogramme im Massstab eines Tagesmarschs
// ---------------------------------------------------------------------------------------------

function berg(name) {
  const r = zufall(name);
  const s = ZELLE * 2;
  const teile = [];
  // Drei Gipfel, der mittlere höchst und mit Schneekappe: das kartografische Gebirge, kein Dreieck.
  for (const [x, basis, hoehe, breite] of [[26, 100, 46, 40], [64, 104, 74, 54], [102, 100, 40, 38]]) {
    teile.push(poly([[x - breite / 2, basis], [x, basis - hoehe], [x + breite / 2, basis]], { ...kontur({ "stroke-width": 2.6 }), fill: C.fels }));
    teile.push(poly([[x - breite / 2, basis], [x, basis - hoehe], [x - breite * 0.14, basis]], { fill: C.felsTief, "fill-opacity": 0.5, stroke: "none" }));
  }
  teile.push(poly([[64, 30], [74, 44], [68, 42], [64, 47], [59, 42], [54, 44]], { fill: C.pergament, stroke: C.tinte, "stroke-width": 1.6, "stroke-linejoin": "round" }));
  teile.push(line(20, 100, 108, 100, feder({ stroke: C.tinte, "stroke-width": 1.4, "stroke-opacity": 0.5 })));
  for (let i = 0; i < 3; i++) teile.push(polyline([[r.zahl(30, 96), r.zahl(70, 92)], [r.zahl(30, 96), r.zahl(94, 102)]], feder({ "stroke-width": 1, "stroke-opacity": 0.4 })));
  return svg("Gebirge", s, s, teile.join(""));
}

function huegel() {
  return svg("Hügel", ZELLE, ZELLE, [
    path("M8 46 Q20 26 32 46 Z", { ...kontur({ "stroke-width": 2.2 }), fill: C.erde }),
    path("M28 46 Q42 22 56 46 Z", { ...kontur({ "stroke-width": 2.4 }), fill: C.erde }),
    path("M28 46 Q42 22 42 46 Z", { fill: C.tinteHell, "fill-opacity": 0.22, stroke: "none" }),
    line(6, 46, 58, 46, feder({ stroke: C.tinte, "stroke-width": 1.4, "stroke-opacity": 0.55 })),
  ].join(""));
}

function vulkan() {
  return svg("Vulkan", ZELLE, ZELLE, [
    poly([[10, 52], [26, 18], [38, 18], [54, 52]], { ...kontur({ "stroke-width": 2.4 }), fill: C.felsTief }),
    poly([[10, 52], [26, 18], [32, 18], [32, 52]], { fill: C.tinte, "fill-opacity": 0.18, stroke: "none" }),
    line(26, 18, 38, 18, kontur({ "stroke-width": 2.4 })),
    path("M27 17 Q24 8 30 4 Q28 11 34 9 Q32 15 38 16", { ...kontur({ "stroke-width": 2, stroke: C.flamme }), fill: "none" }),
    path("M28 20 Q32 32 30 44", feder({ stroke: C.flamme, "stroke-width": 2.4, "stroke-opacity": 0.85 })),
  ].join(""));
}

function waldLaub(name) {
  const r = zufall(name);
  const teile = [];
  for (const [cx, cy, rad] of [[22, 36, 12], [42, 30, 14], [32, 46, 10]]) {
    teile.push(poly(klumpen(r, cx, cy, rad, 9, 0.16), { ...kontur({ "stroke-width": 2 }), fill: C.gruen }));
    teile.push(line(cx, cy + rad * 0.7, cx, cy + rad * 1.35, kontur({ "stroke-width": 2, stroke: C.holzTief })));
  }
  return svg("Laubwald", ZELLE, ZELLE, teile.join(""));
}

function waldNadel() {
  const teile = [];
  for (const [x, basis, hoehe] of [[20, 48, 26], [42, 44, 22], [31, 54, 32]]) {
    const b = hoehe * 0.52;
    for (let stufe = 0; stufe < 3; stufe++) {
      const y = basis - (stufe * hoehe) / 4;
      const w = b * (1 - stufe * 0.22);
      teile.push(poly([[x - w / 2, y], [x, y - hoehe / 2.1], [x + w / 2, y]], { ...kontur({ "stroke-width": 1.8 }), fill: C.gruenTief }));
    }
    teile.push(line(x, basis, x, basis + 5, kontur({ "stroke-width": 2, stroke: C.holzTief })));
  }
  return svg("Nadelwald", ZELLE, ZELLE, teile.join(""));
}

function sumpf(name) {
  const r = zufall(name);
  const teile = [poly(klumpen(r, 32, 36, 22, 10, 0.2), { ...kontur({ "stroke-width": 2, stroke: C.wasserTief }), fill: C.wasserTief, "fill-opacity": 0.55 })];
  for (const y of [28, 36, 44]) {
    teile.push(line(16, y, 30, y, kontur({ "stroke-width": 2, stroke: C.tinte })));
    teile.push(line(36, y + 4, 48, y + 4, kontur({ "stroke-width": 2, stroke: C.tinte })));
  }
  // Schilf: der Unterschied zwischen Sumpf und See ist, dass etwas herausragt.
  for (const [x, h] of [[22, 12], [40, 15], [31, 10]]) {
    teile.push(line(x, 22, x, 22 - h, feder({ stroke: C.gruenTief, "stroke-width": 1.6 })));
  }
  return svg("Sumpf", ZELLE, ZELLE, teile.join(""));
}

function duene(name) {
  const r = zufall(name);
  const teile = [];
  // Erst der Schattenhang, dann die Kämme darüber: Erdton auf Sandton war bei 64 px praktisch
  // unsichtbar, und eine Düne ohne Leeseite ist nur eine Welle.
  teile.push(path("M6 26 Q22 12 32 26 Q44 34 58 22 L58 52 L6 52 Z", { fill: C.erde, "fill-opacity": 0.55, stroke: "none" }));
  for (let i = 0; i < 3; i++) {
    const y = 26 + i * 11;
    teile.push(path(`M6 ${n(y)} Q${n(r.zahl(18, 26))} ${n(y - 13)} 32 ${n(y)} Q${n(r.zahl(40, 48))} ${n(y + 8)} 58 ${n(y - 3)}`, kontur({ "stroke-width": 2.2, stroke: C.tinte, "stroke-opacity": 0.75 })));
  }
  return svg("Dünen", ZELLE, ZELLE, teile.join(""));
}

function ruine() {
  return svg("Ruine", ZELLE, ZELLE, [
    // Gebrochene Zinnen — eine Ruine ist eine Silhouette, der etwas fehlt.
    poly([[14, 50], [14, 24], [20, 24], [20, 32], [26, 32], [26, 20], [32, 20], [32, 38], [40, 38], [40, 26], [46, 26], [46, 50]],
      { ...kontur({ "stroke-width": 2.2 }), fill: C.stein }),
    line(14, 50, 50, 50, kontur({ "stroke-width": 2.2 })),
    rect(28, 42, 7, 8, { fill: C.tinte, "fill-opacity": 0.65, stroke: "none" }),
    poly([[48, 50], [52, 44], [56, 50]], { fill: C.steinTief, stroke: C.tinte, "stroke-width": 1.4 }),
  ].join(""));
}

function steinkreis() {
  const teile = [ellipse(32, 36, 24, 15, feder({ "stroke-dasharray": "4 4", "stroke-width": 1.4 }))];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const x = 32 + Math.cos(a) * 22, y = 36 + Math.sin(a) * 13.5;
    teile.push(rect(x - 3, y - 7, 6, 12, { ...kontur({ "stroke-width": 1.6 }), rx: 1.5, fill: C.steinTief }));
  }
  return svg("Steinkreis", ZELLE, ZELLE, teile.join(""));
}

function grabhuegel() {
  return svg("Grabhügel", ZELLE, ZELLE, [
    path("M8 46 Q32 16 56 46 Z", { ...kontur({ "stroke-width": 2.4 }), fill: C.gruenTief }),
    path("M8 46 Q32 16 32 46 Z", { fill: C.tinte, "fill-opacity": 0.14, stroke: "none" }),
    // Der offene Zugang macht aus einem Hügel ein Grab.
    path("M26 46 L26 36 Q32 30 38 36 L38 46 Z", { ...kontur({ "stroke-width": 2 }), fill: C.tinte, "fill-opacity": 0.75 }),
    line(6, 46, 58, 46, kontur({ "stroke-width": 2 })),
  ].join(""));
}

function bruecke() {
  return svg("Brücke", ZELLE, ZELLE, [
    rect(0, 26, ZELLE, 12, { fill: C.wasser, "fill-opacity": 0.6, stroke: "none" }),
    line(0, 26, ZELLE, 26, feder({ stroke: C.wasserTief, "stroke-width": 1.4 })),
    line(0, 38, ZELLE, 38, feder({ stroke: C.wasserTief, "stroke-width": 1.4 })),
    path("M16 42 Q32 18 48 42", kontur({ "stroke-width": 3.2, stroke: C.stein })),
    path("M16 42 Q32 18 48 42", kontur({ "stroke-width": 1.4 })),
    line(14, 42, 50, 42, kontur({ "stroke-width": 2.4 })),
    line(20, 20, 20, 14, feder({ "stroke-width": 1.4 })),
    line(44, 20, 44, 14, feder({ "stroke-width": 1.4 })),
  ].join(""));
}

function mine() {
  return svg("Mine", ZELLE, ZELLE, [
    path("M10 50 Q32 20 54 50 Z", { ...kontur({ "stroke-width": 2.2 }), fill: C.felsTief }),
    path("M24 50 L24 38 Q32 30 40 38 L40 50 Z", { ...kontur({ "stroke-width": 2 }), fill: C.tinte, "fill-opacity": 0.8 }),
    // Gekreuzte Hauen: das Zeichen für "hier wird gefördert", nicht für "hier ist ein Loch".
    line(22, 22, 42, 34, kontur({ "stroke-width": 2.4, stroke: C.metallTief })),
    line(42, 22, 22, 34, kontur({ "stroke-width": 2.4, stroke: C.holzTief })),
  ].join(""));
}

function stadt(name) {
  const r = zufall(name);
  const s = ZELLE * 2;
  const teile = [];
  // Ummauert, mit Türmen und dichter Bebauung: eine Stadt ist erst eine Stadt, wenn sie eine
  // Mauer hat. Das unterscheidet sie auf einen Blick vom Dorf.
  teile.push(circle(64, 68, 44, { ...kontur({ "stroke-width": 3 }), fill: C.stein }));
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
    teile.push(rect(64 + Math.cos(a) * 44 - 6, 68 + Math.sin(a) * 44 - 6, 12, 12, { ...kontur({ "stroke-width": 2 }), fill: C.steinTief }));
  }
  for (let i = 0; i < 9; i++) {
    const a = r.zahl(0, 6.28), d = r.zahl(0, 27);
    const x = 64 + Math.cos(a) * d, y = 68 + Math.sin(a) * d, b = r.zahl(9, 15), h = r.zahl(10, 17);
    teile.push(rect(x - b / 2, y - h / 2, b, h, { ...kontur({ "stroke-width": 1.6 }), fill: C.pergamentTief }));
    teile.push(poly([[x - b / 2, y - h / 2], [x, y - h / 2 - 6], [x + b / 2, y - h / 2]], { ...kontur({ "stroke-width": 1.4 }), fill: C.tuch }));
  }
  teile.push(rect(58, 108, 12, 8, { ...kontur({ "stroke-width": 2 }), fill: C.holzTief }));
  return svg("Stadt", s, s, teile.join(""));
}

function dorf(name) {
  const r = zufall(name);
  const teile = [];
  for (const [x, y] of [[22, 34], [42, 28], [32, 46]]) {
    const b = r.zahl(13, 17), h = r.zahl(10, 13);
    teile.push(rect(x - b / 2, y - h / 2, b, h, { ...kontur({ "stroke-width": 1.8 }), fill: C.pergamentTief }));
    teile.push(poly([[x - b / 2 - 1.5, y - h / 2], [x, y - h / 2 - 7], [x + b / 2 + 1.5, y - h / 2]], { ...kontur({ "stroke-width": 1.8 }), fill: C.tuch }));
  }
  return svg("Dorf", ZELLE, ZELLE, teile.join(""));
}

function burg() {
  return svg("Burg", ZELLE, ZELLE, [
    rect(14, 26, 36, 26, { ...kontur({ "stroke-width": 2.2 }), fill: C.stein }),
    // Zinnenkranz, gezeichnet als Kerben statt als Zacken: bei 64 px liest das sauberer.
    ...[14, 24, 34, 44].map((x) => rect(x, 20, 6, 8, { ...kontur({ "stroke-width": 1.6 }), fill: C.steinTief })),
    rect(10, 14, 10, 38, { ...kontur({ "stroke-width": 2.2 }), fill: C.steinTief }),
    rect(44, 14, 10, 38, { ...kontur({ "stroke-width": 2.2 }), fill: C.steinTief }),
    poly([[8, 14], [15, 6], [22, 14]], { ...kontur({ "stroke-width": 1.8 }), fill: C.tuch }),
    poly([[42, 14], [49, 6], [56, 14]], { ...kontur({ "stroke-width": 1.8 }), fill: C.tuch }),
    path("M28 52 L28 42 Q32 37 36 42 L36 52 Z", { ...kontur({ "stroke-width": 1.8 }), fill: C.tinte, "fill-opacity": 0.75 }),
  ].join(""));
}

function turm() {
  return svg("Turm", ZELLE, ZELLE, [
    path("M24 52 L26 20 L38 20 L40 52 Z", { ...kontur({ "stroke-width": 2.2 }), fill: C.stein }),
    ...[24, 30, 36].map((x) => rect(x + 0.5, 14, 5, 7, { ...kontur({ "stroke-width": 1.4 }), fill: C.steinTief })),
    rect(29, 30, 6, 8, { fill: C.tinte, "fill-opacity": 0.7, stroke: "none" }),
    line(20, 52, 44, 52, kontur({ "stroke-width": 2.2 })),
  ].join(""));
}

function hafen() {
  return svg("Hafen", ZELLE, ZELLE, [
    rect(0, 34, ZELLE, 30, { fill: C.wasser, "fill-opacity": 0.55, stroke: "none" }),
    path("M0 34 Q16 30 32 34 T64 34", feder({ stroke: C.wasserTief, "stroke-width": 1.6 })),
    // Mole und ein Segel: ein Hafen ist Wasser plus etwas Gebautes, das hineinragt.
    rect(6, 26, 26, 8, { ...kontur({ "stroke-width": 1.8 }), fill: C.holzTief }),
    ...[10, 18, 26].map((x) => line(x, 34, x, 42, feder({ stroke: C.holzTief, "stroke-width": 1.6 }))),
    line(46, 44, 46, 16, kontur({ "stroke-width": 2.2 })),
    poly([[46, 17], [58, 34], [46, 34]], { ...kontur({ "stroke-width": 1.8 }), fill: C.pergament }),
    path("M36 44 Q46 50 56 44", kontur({ "stroke-width": 2.4, stroke: C.holzTief })),
  ].join(""));
}

function lager(name) {
  const r = zufall(name);
  const teile = [];
  for (const [x, y, b] of [[20, 42, 18], [44, 38, 16]]) {
    teile.push(poly([[x - b / 2, y], [x, y - b], [x + b / 2, y]], { ...kontur({ "stroke-width": 2 }), fill: C.pergamentTief }));
    teile.push(line(x, y - b, x, y, feder({ "stroke-width": 1.4 })));
  }
  teile.push(circle(32, 24, 6, { fill: C.tinte, "fill-opacity": 0.35, stroke: "none" }));
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    teile.push(ellipse(32 + Math.cos(a) * 7, 24 + Math.sin(a) * 5, r.zahl(1.6, 2.6), r.zahl(1.4, 2.2), { fill: C.fels, stroke: C.tinte, "stroke-width": 1 }));
  }
  teile.push(path("M32 22 Q35 17 33 13 Q37 16 36 21 Q39 17 37 25 L27 25 Q25 18 29 15 Q28 20 31 22 Z", { fill: C.flamme, stroke: "none" }));
  return svg("Lager", ZELLE, ZELLE, teile.join(""));
}

function hoehle(name) {
  const r = zufall(name);
  // Ein Hoehleneingang ist von oben ein Felsbuckel mit einem dunklen Maul darin. Ohne den Buckel
  // ist es ein Loch, ohne das Maul ein Huegel.
  const teile = [path("M8 48 Q32 16 56 48 Z", { ...kontur({ "stroke-width": 2.4 }), fill: C.felsTief })];
  teile.push(path("M8 48 Q32 16 30 48 Z", { fill: C.tinte, "fill-opacity": 0.16, stroke: "none" }));
  for (let i = 0; i < 3; i++) {
    teile.push(polyline([[r.zahl(12, 24), r.zahl(36, 46)], [r.zahl(26, 40), r.zahl(26, 34)]], feder({ stroke: C.tinte, "stroke-width": 1, "stroke-opacity": 0.4 })));
  }
  teile.push(path("M22 48 Q22 32 32 32 Q42 32 42 48 Z", { ...kontur({ "stroke-width": 2 }), fill: C.tinte, "fill-opacity": 0.85 }));
  teile.push(line(6, 48, 58, 48, kontur({ "stroke-width": 2.2 })));
  return svg("Hoehleneingang", ZELLE, ZELLE, teile.join(""));
}

function portal() {
  // Der Uebergang in eine andere Karte. Bewusst kein Tor und kein Treppensymbol: das Zeichen sagt
  // "hier geht es hinein", nicht "hier steht ein Bauwerk".
  const teile = [circle(32, 32, 20, { fill: C.pergament, "fill-opacity": 0.75, stroke: C.tinte, "stroke-width": 2 })];
  teile.push(circle(32, 32, 20, feder({ "stroke-dasharray": "5 4", "stroke-width": 1.4 })));
  teile.push(ellipse(32, 32, 11, 14, { ...kontur({ "stroke-width": 2.4 }), fill: C.wasserTief, "fill-opacity": 0.55 }));
  teile.push(ellipse(32, 32, 6, 8.5, feder({ stroke: C.pergament, "stroke-width": 1.6, "stroke-opacity": 0.8 })));
  teile.push(polyline([[32, 44], [32, 52]], kontur({ "stroke-width": 2.6 })));
  teile.push(polyline([[27, 47], [32, 52], [37, 47]], kontur({ "stroke-width": 2.6 })));
  return svg("Portal", ZELLE, ZELLE, teile.join(""));
}

// ---------------------------------------------------------------------------------------------
// Marken — was die Karte über sich selbst sagt
// ---------------------------------------------------------------------------------------------

function markeNorden() {
  return svg("Marke: Norden", ZELLE, ZELLE, [
    circle(32, 32, 22, { fill: C.pergament, "fill-opacity": 0.75, stroke: C.tinte, "stroke-width": 1.8 }),
    poly([[32, 8], [38, 32], [32, 26], [26, 32]], { ...kontur({ "stroke-width": 1.8 }), fill: C.tinte }),
    poly([[32, 56], [26, 32], [32, 38], [38, 32]], { ...kontur({ "stroke-width": 1.8 }), fill: C.pergamentTief }),
    line(10, 32, 54, 32, feder({ "stroke-width": 1.2, "stroke-opacity": 0.6 })),
  ].join(""));
}

function markeWeg() {
  return svg("Marke: Weg", ZELLE, ZELLE, [
    path("M6 50 Q22 40 26 26 Q30 12 52 10", kontur({ "stroke-width": 4, stroke: C.pergamentTief })),
    path("M6 50 Q22 40 26 26 Q30 12 52 10", { fill: "none", stroke: C.tinte, "stroke-width": 1.6, "stroke-dasharray": "5 5", "stroke-linecap": "round" }),
    circle(6, 50, 3, { fill: C.tinte }),
    circle(52, 10, 3, { fill: C.tinte }),
  ].join(""));
}

function markeGrenze() {
  const teile = [];
  // Punkt-Strich, die Konvention für eine politische Grenze — kein Weg, keine Küste.
  teile.push(polyline([[4, 54], [22, 38], [40, 30], [60, 10]], { fill: "none", stroke: C.tinte, "stroke-width": 2.2, "stroke-dasharray": "10 4 2 4", "stroke-linecap": "round" }));
  for (const [x, y] of [[22, 38], [40, 30]]) teile.push(circle(x, y, 2.6, { fill: C.pergament, stroke: C.tinte, "stroke-width": 1.6 }));
  return svg("Marke: Grenze", ZELLE, ZELLE, teile.join(""));
}

function markeGefahr() {
  return svg("Marke: Gefahr", ZELLE, ZELLE, [
    circle(32, 32, 21, { fill: C.pergament, "fill-opacity": 0.7, stroke: C.tinte, "stroke-width": 2, "stroke-dasharray": "2 4" }),
    // Der Totenkopf ist die älteste Randnotiz der Kartografie und braucht keine Legende.
    path("M20 30 Q20 16 32 16 Q44 16 44 30 Q44 38 38 40 L26 40 Q20 38 20 30 Z", { ...kontur({ "stroke-width": 2 }), fill: C.knochen }),
    circle(27, 29, 3.4, { fill: C.tinte }),
    circle(37, 29, 3.4, { fill: C.tinte }),
    poly([[32, 32], [34.5, 37], [29.5, 37]], { fill: C.tinte }),
    rect(26, 41, 12, 5, { ...kontur({ "stroke-width": 1.6 }), rx: 1.5, fill: C.knochen }),
    line(29, 41, 29, 46, feder({ "stroke-width": 1.2 })),
    line(35, 41, 35, 46, feder({ "stroke-width": 1.2 })),
  ].join(""));
}

// ---------------------------------------------------------------------------------------------
// Der Katalog. `einheiten` ist der Platzbedarf in Kartenzellen, kein Zeichenhinweis.
// ---------------------------------------------------------------------------------------------

/** @type {{name: string, art: string, einheiten: [number, number], kachelbar?: boolean, schlagworte: string[], zeichne: () => string}[]} */
const KATALOG = [
  { name: "gelaende_gras", art: "boden", einheiten: [1, 1], kachelbar: true, schlagworte: ["gras", "ebene", "gemaessigt"], zeichne: () => gelaendeGras("gelaende_gras") },
  { name: "gelaende_wald", art: "boden", einheiten: [1, 1], kachelbar: true, schlagworte: ["wald", "dicht", "gemaessigt"], zeichne: () => gelaendeWald("gelaende_wald") },
  { name: "gelaende_huegel", art: "boden", einheiten: [1, 1], kachelbar: true, schlagworte: ["huegel", "erde", "gemaessigt"], zeichne: () => gelaendeHuegel("gelaende_huegel") },
  { name: "gelaende_berg", art: "boden", einheiten: [1, 1], kachelbar: true, schlagworte: ["berg", "fels", "unwegsam"], zeichne: () => gelaendeBerg("gelaende_berg") },
  { name: "gelaende_sumpf", art: "boden", einheiten: [1, 1], kachelbar: true, schlagworte: ["sumpf", "feucht", "unwegsam"], zeichne: () => gelaendeSumpf("gelaende_sumpf") },
  { name: "gelaende_sand", art: "boden", einheiten: [1, 1], kachelbar: true, schlagworte: ["sand", "wueste", "trocken"], zeichne: () => gelaendeSand("gelaende_sand") },
  { name: "gelaende_wasser", art: "boden", einheiten: [1, 1], kachelbar: true, schlagworte: ["wasser", "see", "meer"], zeichne: () => gelaendeWasser("gelaende_wasser") },
  { name: "gelaende_schnee", art: "boden", einheiten: [1, 1], kachelbar: true, schlagworte: ["schnee", "kalt", "unwegsam"], zeichne: () => gelaendeSchnee("gelaende_schnee") },

  { name: "berg", art: "aufbau", einheiten: [2, 2], schlagworte: ["berg", "fels", "unwegsam"], zeichne: () => berg("berg") },
  { name: "huegel", art: "aufbau", einheiten: [1, 1], schlagworte: ["huegel", "erde", "gemaessigt"], zeichne: huegel },
  { name: "vulkan", art: "aufbau", einheiten: [1, 1], schlagworte: ["vulkan", "feuer", "gefahr"], zeichne: vulkan },
  { name: "wald_laub", art: "aufbau", einheiten: [1, 1], schlagworte: ["wald", "laub", "gemaessigt"], zeichne: () => waldLaub("wald_laub") },
  { name: "wald_nadel", art: "aufbau", einheiten: [1, 1], schlagworte: ["wald", "nadel", "kalt"], zeichne: waldNadel },
  { name: "sumpf", art: "aufbau", einheiten: [1, 1], schlagworte: ["sumpf", "feucht", "unwegsam"], zeichne: () => sumpf("sumpf") },
  { name: "duene", art: "aufbau", einheiten: [1, 1], schlagworte: ["sand", "wueste", "trocken"], zeichne: () => duene("duene") },
  { name: "ruine", art: "aufbau", einheiten: [1, 1], schlagworte: ["ruine", "verfall", "abenteuer"], zeichne: ruine },
  { name: "steinkreis", art: "aufbau", einheiten: [1, 1], schlagworte: ["kult", "alt", "abenteuer"], zeichne: steinkreis },
  { name: "grabhuegel", art: "aufbau", einheiten: [1, 1], schlagworte: ["grab", "alt", "abenteuer"], zeichne: grabhuegel },
  { name: "bruecke", art: "aufbau", einheiten: [1, 1], schlagworte: ["bruecke", "weg", "fluss"], zeichne: bruecke },
  { name: "mine", art: "aufbau", einheiten: [1, 1], schlagworte: ["mine", "handwerk", "fels"], zeichne: mine },
  { name: "stadt", art: "aufbau", einheiten: [2, 2], schlagworte: ["stadt", "siedlung", "gross"], zeichne: () => stadt("stadt") },
  { name: "dorf", art: "aufbau", einheiten: [1, 1], schlagworte: ["dorf", "siedlung", "klein"], zeichne: () => dorf("dorf") },
  { name: "burg", art: "aufbau", einheiten: [1, 1], schlagworte: ["burg", "wehr", "siedlung"], zeichne: burg },
  { name: "turm", art: "aufbau", einheiten: [1, 1], schlagworte: ["turm", "wehr", "klein"], zeichne: turm },
  { name: "hafen", art: "aufbau", einheiten: [1, 1], schlagworte: ["hafen", "siedlung", "meer"], zeichne: hafen },
  { name: "lager", art: "aufbau", einheiten: [1, 1], schlagworte: ["lager", "rast", "klein"], zeichne: () => lager("lager") },
  // Die beiden schliessen das Icon-Vokabular `AtlasMarkerIcon` (place | city | castle | cave |
  // ruin | portal) ab: dorf/stadt/burg/ruine standen schon, cave und portal fehlten.
  { name: "hoehle", art: "aufbau", einheiten: [1, 1], schlagworte: ["hoehle", "fels", "abenteuer"], zeichne: () => hoehle("hoehle") },
  { name: "portal", art: "marke", einheiten: [1, 1], schlagworte: ["portal", "uebergang", "hinweis"], zeichne: portal },

  { name: "marke_norden", art: "marke", einheiten: [1, 1], schlagworte: ["norden", "kompass", "hinweis"], zeichne: markeNorden },
  { name: "marke_weg", art: "marke", einheiten: [1, 1], schlagworte: ["weg", "leitung", "hinweis"], zeichne: markeWeg },
  { name: "marke_grenze", art: "marke", einheiten: [1, 1], schlagworte: ["grenze", "leitung", "hinweis"], zeichne: markeGrenze },
  { name: "marke_gefahr", art: "marke", einheiten: [1, 1], schlagworte: ["gefahr", "warnung", "hinweis"], zeichne: markeGefahr },
];

const LIZENZ_DATEI = "lizenz.txt";

await erzeugePaket({
  paketId: PAKET_ID,
  version: PAKET_VERSION,
  titel: "Atlas — Tuschepictogramme für die Übersichtskarte: Gelände, Landmarken, Siedlungen",
  urheber: URHEBER,
  zelle: ZELLE,
  lizenzDatei: LIZENZ_DATEI,
  lizenzText: cc0Text(PAKET_ID, URHEBER, "tools/assets/erzeuge-atlaspaket.mjs"),
  lizenz: { spdx: "CC0-1.0", inhaber: `${URHEBER} 2026`, herkunft: "eigen", quelle: null },
  katalog: KATALOG,
}, PAKET_DIR);
