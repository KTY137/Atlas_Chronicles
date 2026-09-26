#!/usr/bin/env node
// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
// Authors `assets/packs/pk.grundriss` — the first Chronicle asset pack.
//
// The assets are **source code, not binaries.** Three reasons, and the third is the one that
// actually decided it:
//   1. Provenance. RB-21c refused the generator's `dist/` because 21.49 MB of `public/` carries
//      179 CC-BY-NC-SA charges. A pack whose every pixel is produced by a reviewable function in
//      this repository owes nobody an attribution and cannot acquire one by accident.
//   2. Determinism. `npm run gate:assets` re-runs this file and compares SHA-256. A drifted asset
//      is a red gate, not a discovery six months later.
//   3. Review. A diff of a PNG is a wall of base64. A diff of a polyline is a code review.
//
// These are floorplan **symbols** in an ink-on-vellum language — deliberately schematic, legible
// at 64 px, and honestly not painted battlemap art. That distinction is stated in the pack titel
// and in STATUS.md rather than left for someone to discover at the table.
//
// Run: node tools/assets/erzeuge-grundrisspaket.mjs [--pruefe]
//   --pruefe writes nothing and exits non-zero if the tree differs from what this file produces.

import { join } from "node:path";
import { fileURLToPath } from "node:url";

// Die Feder ist geteilt, damit Grundriss und Atlas erkennbar dieselbe Hand sind.
import {
  C, zufallFabrik, n, rect, circle, ellipse, line, path, poly, polyline, group, kontur, feder, svg,
  klumpen, erzeugePaket, cc0Text,
} from "./tusche.mjs";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const PAKET_ID = "pk.grundriss";
const PAKET_VERSION = "1.3.0";
const PAKET_DIR = join(ROOT, "assets", "packs", PAKET_ID);
const ZELLE = 64; // authoring pixels per grid cell — mirrored into `paket.zellgroesse`
const URHEBER = "Chronicle";

// Palette, Rauschen und Zeichenhelfer stehen in `tusche.mjs`. Die Saat trägt die Paket-Id, also
// bekommt ein gleichnamiges Asset in einem anderen Paket eine andere Zeichnung.
const zufall = zufallFabrik(PAKET_ID);

// ---------------------------------------------------------------------------------------------
// Böden — tileable. Interior detail may be jittered; the four edges may not, or the tiles seam.
// ---------------------------------------------------------------------------------------------

function bodenStein(name, rissig) {
  const r = zufall(name);
  const teile = [rect(0, 0, ZELLE, ZELLE, { fill: C.stein })];
  // Two interior seams, jittered inside the tile and pinned to the border, so N tiles laid side
  // by side still meet exactly. A jittered *edge* is the classic seamless-tile bug.
  const mx = r.zahl(26, 38), my = r.zahl(26, 38);
  teile.push(line(mx, 0, mx, ZELLE, feder({ "stroke-width": 1.6 })));
  teile.push(line(0, my, ZELLE, my, feder({ "stroke-width": 1.6 })));
  teile.push(rect(0, 0, mx, my, { fill: C.steinTief, "fill-opacity": 0.35 }));
  teile.push(rect(mx, my, ZELLE - mx, ZELLE - my, { fill: C.steinTief, "fill-opacity": 0.22 }));
  if (rissig) {
    // A crack is a short-segment random walk down the tile, not a straight diagonal. It enters at
    // y=0 and leaves at y=ZELLE so that stacked tiles continue the fracture instead of ending it.
    const punkte = [[r.zahl(8, 26), 0]];
    let x = punkte[0][0];
    for (let y = 13; y < ZELLE; y += 13) {
      x = Math.max(4, Math.min(60, x + r.zahl(-7, 9)));
      punkte.push([x, y]);
    }
    punkte.push([Math.max(4, Math.min(60, x + r.zahl(-5, 6))), ZELLE]);
    teile.push(polyline(punkte, { stroke: C.tinte, "stroke-width": 1.2, "stroke-opacity": 0.5, "stroke-linejoin": "round" }));
    const knick = punkte[2];
    teile.push(polyline([knick, [Math.max(3, knick[0] - r.zahl(7, 15)), knick[1] + r.zahl(5, 12)]], { stroke: C.tinte, "stroke-width": 0.9, "stroke-opacity": 0.34, "stroke-linejoin": "round" }));
  }
  teile.push(rect(0.6, 0.6, ZELLE - 1.2, ZELLE - 1.2, kontur({ stroke: C.tinteHell, "stroke-width": 1.2, "stroke-opacity": 0.5 })));
  return svg(rissig ? "Steinboden, rissig" : "Steinboden", ZELLE, ZELLE, teile.join(""));
}

function bodenHolz(name) {
  const r = zufall(name);
  const teile = [rect(0, 0, ZELLE, ZELLE, { fill: C.holz })];
  for (let i = 1; i < 4; i++) teile.push(line(0, i * 16, ZELLE, i * 16, feder({ "stroke-width": 1.4, stroke: C.holzTief })));
  for (let i = 0; i < 4; i++) {
    const x = r.zahl(8, 56);
    teile.push(line(x, i * 16, x, (i + 1) * 16, feder({ "stroke-width": 1.4, stroke: C.holzTief })));
    teile.push(line(r.zahl(4, 30), i * 16 + 8, r.zahl(34, 60), i * 16 + 8, feder({ "stroke-width": 0.8, stroke: C.holzTief, "stroke-opacity": 0.5 })));
  }
  return svg("Dielenboden", ZELLE, ZELLE, teile.join(""));
}

function bodenErde(name) {
  const r = zufall(name);
  const teile = [rect(0, 0, ZELLE, ZELLE, { fill: C.erde })];
  for (let i = 0; i < 16; i++) {
    teile.push(ellipse(r.zahl(5, 59), r.zahl(5, 59), r.zahl(1.4, 3.6), r.zahl(1.2, 2.8), { fill: C.tinteHell, "fill-opacity": r.zahl(0.3, 0.6) }));
  }
  for (let i = 0; i < 3; i++) {
    const cx = r.zahl(10, 54), cy = r.zahl(10, 54), rad = r.zahl(4, 6.5);
    teile.push(ellipse(cx, cy, rad, rad * r.zahl(0.7, 0.95), { fill: C.steinTief, stroke: C.tinteHell, "stroke-width": 1 }));
  }
  for (let i = 0; i < 5; i++) {
    const x = r.zahl(4, 54), y = r.zahl(4, 54);
    teile.push(polyline([[x, y], [x + r.zahl(4, 12), y + r.zahl(-4, 6)]], { stroke: C.tinteHell, "stroke-width": 0.8, "stroke-opacity": 0.35 }));
  }
  return svg("Erdboden", ZELLE, ZELLE, teile.join(""));
}

function bodenFliese(name) {
  const teile = [rect(0, 0, ZELLE, ZELLE, { fill: C.pergament })];
  for (let gx = 0; gx < 4; gx++) {
    for (let gy = 0; gy < 4; gy++) {
      const x = gx * 16, y = gy * 16;
      teile.push(poly([[x + 8, y + 1.5], [x + 14.5, y + 8], [x + 8, y + 14.5], [x + 1.5, y + 8]], {
        fill: (gx + gy) % 2 === 0 ? C.pergamentTief : C.stein, stroke: C.tinteHell, "stroke-width": 0.8,
      }));
    }
  }
  return svg("Fliesenboden", ZELLE, ZELLE, teile.join(""));
}

function bodenWasser(name) {
  const r = zufall(name);
  const teile = [rect(0, 0, ZELLE, ZELLE, { fill: C.wasser })];
  for (let i = 0; i < 4; i++) {
    const y = 8 + i * 16 + r.zahl(-3, 3);
    teile.push(path(`M0 ${n(y)} Q16 ${n(y - 4)} 32 ${n(y)} T64 ${n(y)}`, feder({ stroke: C.wasserTief, "stroke-width": 1.6 })));
  }
  return svg("Flachwasser", ZELLE, ZELLE, teile.join(""));
}

// ---------------------------------------------------------------------------------------------
// Aufbau — structure the generator places, not furniture
// ---------------------------------------------------------------------------------------------

function saeule() {
  return svg("Säule", ZELLE, ZELLE, [
    circle(32, 32, 22, { fill: C.stein, stroke: C.tinte, "stroke-width": 2.4 }),
    circle(32, 32, 14, { fill: C.steinTief, stroke: C.tinteHell, "stroke-width": 1.4 }),
    ...[0, 45, 90, 135].map((deg) => {
      const rad = (deg * Math.PI) / 180, dx = Math.cos(rad), dy = Math.sin(rad);
      return line(32 - dx * 20, 32 - dy * 20, 32 + dx * 20, 32 + dy * 20, feder({ "stroke-opacity": 0.55 }));
    }),
  ].join(""));
}

function treppe(name, richtung) {
  const h = ZELLE * 2;
  const stufen = 7;
  const teile = [rect(4, 3, ZELLE - 8, h - 6, { ...kontur(), fill: C.stein })];
  for (let i = 1; i < stufen; i++) {
    const y = 3 + (i * (h - 6)) / stufen;
    teile.push(line(4, y, ZELLE - 4, y, feder({ "stroke-width": 1.6 })));
    // Tread shading deepens away from the viewer; a floorplan stair with no direction is a bug
    // report waiting to happen, and the arrow alone is too small at table zoom.
    const tiefe = richtung === "ab" ? i / stufen : 1 - i / stufen;
    teile.push(rect(4, y, ZELLE - 8, (h - 6) / stufen, { fill: C.tinte, "fill-opacity": 0.06 + tiefe * 0.16 }));
  }
  const y0 = richtung === "auf" ? 30 : h - 30;
  const dir = richtung === "auf" ? -1 : 1;
  teile.push(polyline([[24, y0], [32, y0 + dir * 12], [40, y0]], kontur({ stroke: C.tinte, "stroke-width": 3 })));
  return svg(richtung === "auf" ? "Treppe aufwärts" : "Treppe abwärts", ZELLE, h, teile.join(""));
}

function podest() {
  const s = ZELLE * 2;
  return svg("Podest", s, s, [
    rect(6, 6, s - 12, s - 12, { ...kontur(), fill: C.stein }),
    rect(18, 18, s - 36, s - 36, { ...kontur({ "stroke-width": 1.6 }), fill: C.steinTief }),
    rect(30, 30, s - 60, s - 60, { ...kontur({ "stroke-width": 1.4 }), fill: C.pergamentTief }),
  ].join(""));
}

function schutt(name) {
  const r = zufall(name);
  const teile = [ellipse(32, 34, 24, 20, { fill: C.tinteHell, "fill-opacity": 0.18 })];
  for (let i = 0; i < 12; i++) {
    const cx = r.zahl(12, 52), cy = r.zahl(12, 52), rad = r.zahl(4.5, 9.5);
    const ecken = r.ganz(3, 5);
    teile.push(poly(Array.from({ length: ecken }, (_, k) => {
      const a = (k / ecken) * Math.PI * 2 + r.zahl(0, 0.6);
      const rr = rad * r.zahl(0.65, 1);
      return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr];
    }), { fill: C.steinTief, stroke: C.tinte, "stroke-width": 1.2, "stroke-linejoin": "round" }));
  }
  return svg("Schutt", ZELLE, ZELLE, teile.join(""));
}

function grube() {
  const s = ZELLE * 2;
  const teile = [rect(8, 8, s - 16, s - 16, { ...kontur({ "stroke-width": 2.6 }), fill: C.tinte, "fill-opacity": 0.82 })];
  for (let i = -s; i < s; i += 10) teile.push(line(i, 8, i + s - 16, s - 8, { stroke: C.pergament, "stroke-width": 0.9, "stroke-opacity": 0.28 }));
  teile.push(rect(8, 8, s - 16, s - 16, kontur({ "stroke-width": 2.6 })));
  return svg("Grube", s, s, teile.join(""));
}

// ---------------------------------------------------------------------------------------------
// Türen — drawn as symbols. The *portal* is geometry in the document; this is only its picture.
// ---------------------------------------------------------------------------------------------

function tuerHolz() {
  return svg("Holztür", ZELLE, ZELLE, [
    path("M10 54 A44 44 0 0 1 54 10", feder({ "stroke-width": 1.4, "stroke-dasharray": "4 4" })),
    rect(8, 26, 48, 12, { ...kontur(), fill: C.holz }),
    line(20, 26, 20, 38, feder({ stroke: C.holzTief })),
    line(32, 26, 32, 38, feder({ stroke: C.holzTief })),
    line(44, 26, 44, 38, feder({ stroke: C.holzTief })),
    circle(50, 32, 2.4, { fill: C.metallTief }),
  ].join(""));
}

function tuerGitter() {
  const teile = [rect(8, 26, 48, 12, { ...kontur(), fill: C.pergament })];
  for (let x = 14; x <= 50; x += 6) teile.push(line(x, 26, x, 38, { stroke: C.metallTief, "stroke-width": 2, "stroke-linecap": "round" }));
  teile.push(rect(8, 26, 48, 12, kontur()));
  return svg("Gittertür", ZELLE, ZELLE, teile.join(""));
}

function falltuer() {
  return svg("Falltür", ZELLE, ZELLE, [
    rect(12, 12, 40, 40, { ...kontur(), fill: C.holz }),
    line(12, 12, 52, 52, feder({ stroke: C.holzTief, "stroke-width": 1.6 })),
    line(52, 12, 12, 52, feder({ stroke: C.holzTief, "stroke-width": 1.6 })),
    circle(32, 32, 5, { fill: "none", stroke: C.metallTief, "stroke-width": 2.4 }),
  ].join(""));
}

// ---------------------------------------------------------------------------------------------
// Möbel und Gefäße
// ---------------------------------------------------------------------------------------------

function tischLang() {
  const w = ZELLE * 2;
  return svg("Langer Tisch", w, ZELLE, [
    rect(8, 12, w - 16, ZELLE - 24, { ...kontur(), rx: 3, fill: C.holz }),
    rect(16, 20, w - 32, ZELLE - 40, { ...feder({ stroke: C.holzTief, "stroke-width": 1.4 }), fill: "none" }),
    ...[[18, 18], [w - 18, 18], [18, ZELLE - 18], [w - 18, ZELLE - 18]].map(([x, y]) => circle(x, y, 2, { fill: C.holzTief })),
  ].join(""));
}

function tischRund() {
  return svg("Runder Tisch", ZELLE, ZELLE, [
    circle(32, 32, 24, { ...kontur(), fill: C.holz }),
    circle(32, 32, 16, feder({ stroke: C.holzTief, "stroke-width": 1.4 })),
  ].join(""));
}

function stuhl() {
  return svg("Stuhl", ZELLE, ZELLE, [
    rect(21, 23, 22, 22, { ...kontur({ "stroke-width": 1.8 }), rx: 2, fill: C.holz }),
    rect(21, 15, 22, 6, { ...kontur({ "stroke-width": 1.8 }), rx: 2, fill: C.holzTief }),
    rect(15, 23, 5, 14, { ...kontur({ "stroke-width": 1.4 }), rx: 2, fill: C.holzTief }),
    rect(44, 23, 5, 14, { ...kontur({ "stroke-width": 1.4 }), rx: 2, fill: C.holzTief }),
    line(24, 34, 40, 34, feder({ stroke: C.holzTief, "stroke-width": 1.2 })),
  ].join(""));
}

function bett() {
  const h = ZELLE * 2;
  return svg("Bett", ZELLE, h, [
    rect(8, 8, ZELLE - 16, h - 16, { ...kontur(), rx: 3, fill: C.holz }),
    rect(12, 12, ZELLE - 24, 26, { ...kontur({ "stroke-width": 1.4 }), rx: 2, fill: C.pergament }),
    rect(12, 44, ZELLE - 24, h - 56, { ...kontur({ "stroke-width": 1.4 }), rx: 2, fill: C.tuch }),
    line(12, 62, ZELLE - 12, 62, feder({ stroke: C.tinte, "stroke-opacity": 0.4 })),
  ].join(""));
}

function regal() {
  const w = ZELLE * 2;
  const teile = [rect(6, 16, w - 12, ZELLE - 32, { ...kontur(), fill: C.holzTief })];
  for (let x = 6 + 16; x < w - 12; x += 16) teile.push(line(x, 16, x, ZELLE - 16, feder({ stroke: C.tinte, "stroke-opacity": 0.5 })));
  for (let x = 12; x < w - 14; x += 5) teile.push(rect(x, 21, 3, ZELLE - 42, { fill: C.pergament, "fill-opacity": 0.85 }));
  teile.push(rect(6, 16, w - 12, ZELLE - 32, kontur()));
  return svg("Regal", w, ZELLE, teile.join(""));
}

function werkbank() {
  const w = ZELLE * 2;
  return svg("Werkbank", w, ZELLE, [
    rect(8, 14, w - 16, ZELLE - 28, { ...kontur(), rx: 2, fill: C.holzTief }),
    rect(18, 22, 28, 20, { ...kontur({ "stroke-width": 1.4 }), rx: 2, fill: C.metall }),
    line(74, 22, 74, 42, { stroke: C.metallTief, "stroke-width": 3, "stroke-linecap": "round" }),
    line(84, 24, 84, 40, { stroke: C.metallTief, "stroke-width": 3, "stroke-linecap": "round" }),
    line(94, 26, 94, 38, { stroke: C.metallTief, "stroke-width": 3, "stroke-linecap": "round" }),
  ].join(""));
}

function altar() {
  const w = ZELLE * 2;
  return svg("Altar", w, ZELLE, [
    rect(10, 10, w - 20, ZELLE - 20, { ...kontur(), fill: C.stein }),
    rect(22, 18, w - 44, ZELLE - 36, { ...kontur({ "stroke-width": 1.4 }), fill: C.steinTief }),
    circle(w / 2, 32, 9, { fill: "none", stroke: C.tinte, "stroke-width": 2 }),
    line(w / 2, 20, w / 2, 44, { stroke: C.tinte, "stroke-width": 2, "stroke-linecap": "round" }),
  ].join(""));
}

function sarkophag() {
  const h = ZELLE * 2;
  return svg("Sarkophag", ZELLE, h, [
    poly([[16, 8], [48, 8], [56, 34], [48, 120], [16, 120], [8, 34]], { ...kontur(), fill: C.stein }),
    poly([[22, 16], [42, 16], [48, 36], [42, 112], [22, 112], [16, 36]], { ...feder({ "stroke-width": 1.4 }), fill: "none" }),
    circle(32, 44, 7, feder({ "stroke-width": 1.6 })),
  ].join(""));
}

function amboss() {
  return svg("Amboss", ZELLE, ZELLE, [
    path("M12 26 L44 26 L52 32 L44 34 L44 40 L20 40 L20 34 L12 32 Z", { ...kontur(), fill: C.metallTief }),
    rect(24, 40, 16, 10, { ...kontur({ "stroke-width": 1.6 }), fill: C.metall }),
  ].join(""));
}

function truhe() {
  return svg("Truhe", ZELLE, ZELLE, [
    rect(12, 16, 40, 32, { ...kontur(), rx: 2, fill: C.holz }),
    rect(12, 16, 40, 10, { ...kontur({ "stroke-width": 1.6 }), rx: 2, fill: C.holzTief }),
    rect(28, 24, 8, 10, { ...kontur({ "stroke-width": 1.4 }), fill: C.metall }),
    circle(32, 29, 1.8, { fill: C.tinte }),
  ].join(""));
}

function fass() {
  return svg("Fass", ZELLE, ZELLE, [
    circle(32, 32, 20, { ...kontur(), fill: C.holz }),
    circle(32, 32, 13, feder({ stroke: C.metallTief, "stroke-width": 1.8 })),
    circle(32, 32, 6, feder({ stroke: C.holzTief, "stroke-width": 1.4 })),
  ].join(""));
}

function kiste() {
  return svg("Kiste", ZELLE, ZELLE, [
    rect(14, 14, 36, 36, { ...kontur(), rx: 2, fill: C.holz }),
    line(14, 14, 50, 50, feder({ stroke: C.holzTief, "stroke-width": 1.6 })),
    line(50, 14, 14, 50, feder({ stroke: C.holzTief, "stroke-width": 1.6 })),
  ].join(""));
}

function krug() {
  return svg("Krug", ZELLE, ZELLE, [
    ellipse(30, 34, 13, 15, { ...kontur({ "stroke-width": 1.8 }), fill: C.erde }),
    path("M43 28 Q52 32 43 40", kontur({ "stroke-width": 1.8 })),
    ellipse(30, 22, 7, 3.5, { ...kontur({ "stroke-width": 1.4 }), fill: C.pergamentTief }),
  ].join(""));
}

// ---------------------------------------------------------------------------------------------
// Licht und Marken
// ---------------------------------------------------------------------------------------------

function feuerschale() {
  return svg("Feuerschale", ZELLE, ZELLE, [
    circle(32, 32, 19, { ...kontur(), fill: C.metallTief }),
    circle(32, 32, 13, { fill: C.tinte, "fill-opacity": 0.75 }),
    path("M32 22 Q38 30 34 38 Q42 34 40 26 Q46 34 40 42 L24 42 Q18 34 24 26 Q22 34 30 38 Q26 30 32 22 Z", { fill: C.flamme, stroke: "none" }),
  ].join(""));
}

function kerzenstaender() {
  return svg("Kerzenständer", ZELLE, ZELLE, [
    circle(32, 32, 15, { ...kontur({ "stroke-width": 1.8 }), fill: C.metall }),
    ...[[32, 24], [25, 37], [39, 37]].map(([x, y]) => circle(x, y, 3.4, { fill: C.pergament, stroke: C.tinte, "stroke-width": 1.2 })),
    ...[[32, 24], [25, 37], [39, 37]].map(([x, y]) => circle(x, y - 0.4, 1.3, { fill: C.flamme })),
  ].join(""));
}

function markeEingang() {
  return svg("Marke: Eingang", ZELLE, ZELLE, [
    circle(32, 32, 21, { fill: C.pergament, "fill-opacity": 0.7, stroke: C.tinte, "stroke-width": 2, "stroke-dasharray": "6 4" }),
    polyline([[24, 40], [32, 24], [40, 40]], kontur({ "stroke-width": 3 })),
    line(32, 24, 32, 44, kontur({ "stroke-width": 3 })),
  ].join(""));
}

function markeGeheim() {
  return svg("Marke: Geheimgang", ZELLE, ZELLE, [
    circle(32, 32, 21, { fill: C.pergament, "fill-opacity": 0.7, stroke: C.tinte, "stroke-width": 2, "stroke-dasharray": "3 5" }),
    circle(32, 27, 6.5, { fill: "none", stroke: C.tinte, "stroke-width": 2.6 }),
    poly([[29, 32], [35, 32], [33.5, 43], [30.5, 43]], { fill: C.tinte }),
  ].join(""));
}

// ---------------------------------------------------------------------------------------------
// Höhle — dieselbe Tuschesprache, rauere Hand
// ---------------------------------------------------------------------------------------------

function bodenFels(name) {
  const r = zufall(name);
  const teile = [rect(0, 0, ZELLE, ZELLE, { fill: C.fels })];
  // Same seamless discipline as the flagstones: interior detail jitters, the four edges do not.
  const mx = r.zahl(22, 42), my = r.zahl(22, 42);
  teile.push(polyline([[mx, 0], [mx + r.zahl(-6, 6), my], [r.zahl(20, 44), ZELLE]], feder({ stroke: C.felsTief, "stroke-width": 1.4 })));
  teile.push(polyline([[0, my], [mx, my + r.zahl(-5, 5)], [ZELLE, r.zahl(20, 44)]], feder({ stroke: C.felsTief, "stroke-width": 1.4 })));
  teile.push(poly([[0, 0], [mx, 0], [mx, my], [0, my]], { fill: C.felsTief, "fill-opacity": 0.3 }));
  for (let i = 0; i < 8; i++) teile.push(ellipse(r.zahl(4, 60), r.zahl(4, 60), r.zahl(1, 2.6), r.zahl(0.8, 2), { fill: C.tinte, "fill-opacity": r.zahl(0.08, 0.2) }));
  return svg("Felsboden", ZELLE, ZELLE, teile.join(""));
}

function stalagmit(name) {
  const r = zufall(name);
  const teile = [poly(klumpen(r, 32, 34, 17, 9, 0.22), { ...kontur({ "stroke-width": 1.8 }), fill: C.fels })];
  for (const ring of [12, 7]) teile.push(poly(klumpen(r, 32, 33, ring, 8, 0.2), { ...feder({ "stroke-width": 1.2, stroke: C.felsTief }), fill: C.felsTief, "fill-opacity": 0.35 }));
  teile.push(circle(32, 32, 2.6, { fill: C.tinte, "fill-opacity": 0.65 }));
  return svg("Stalagmit", ZELLE, ZELLE, teile.join(""));
}

function tropfsteinsaeule(name) {
  const r = zufall(name);
  const teile = [poly(klumpen(r, 32, 32, 22, 11, 0.16), { ...kontur({ "stroke-width": 2.2 }), fill: C.fels })];
  for (const ring of [16, 11, 6]) teile.push(poly(klumpen(r, 32, 32, ring, 10, 0.14), feder({ "stroke-width": 1.2, stroke: C.felsTief })));
  return svg("Tropfsteinsäule", ZELLE, ZELLE, teile.join(""));
}

function felsblock(name) {
  const r = zufall(name);
  const punkte = klumpen(r, 32, 33, 21, 6, 0.18);
  const teile = [poly(punkte, { ...kontur({ "stroke-width": 2.2 }), fill: C.fels })];
  // Two facet lines from one vertex read as a block with volume rather than a flat splat.
  teile.push(polyline([punkte[0], [32, 33], punkte[3]], feder({ stroke: C.felsTief, "stroke-width": 1.6 })));
  teile.push(poly([punkte[3], [32, 33], punkte[4], punkte[5] ?? punkte[0]], { fill: C.felsTief, "fill-opacity": 0.35, stroke: "none" }));
  return svg("Felsblock", ZELLE, ZELLE, teile.join(""));
}

function pilzgruppe(name) {
  const r = zufall(name);
  const teile = [];
  for (const [cx, cy, rad] of [[24, 36, 10], [40, 30, 8], [33, 44, 6.5]]) {
    teile.push(ellipse(cx, cy + rad * 0.55, rad * 0.35, rad * 0.5, { ...kontur({ "stroke-width": 1.4 }), fill: C.pergamentTief }));
    teile.push(path(`M${n(cx - rad)} ${n(cy)} A${n(rad)} ${n(rad * 0.85)} 0 0 1 ${n(cx + rad)} ${n(cy)} Z`, { ...kontur({ "stroke-width": 1.6 }), fill: C.pilz }));
    teile.push(circle(cx - rad * 0.3, cy - rad * 0.3, 1.5, { fill: C.pergament, "fill-opacity": 0.8 }));
  }
  return svg("Pilzgruppe", ZELLE, ZELLE, teile.join(""));
}

function wasserlache(name) {
  const r = zufall(name);
  const teile = [poly(klumpen(r, 32, 33, 22, 10, 0.24), { ...kontur({ "stroke-width": 1.6, stroke: C.wasserTief }), fill: C.wasser, "fill-opacity": 0.85 })];
  teile.push(poly(klumpen(r, 30, 31, 12, 9, 0.22), { fill: C.pergament, "fill-opacity": 0.22, stroke: "none" }));
  return svg("Wasserlache", ZELLE, ZELLE, teile.join(""));
}

function knochenhaufen(name) {
  const r = zufall(name);
  const teile = [];
  for (let i = 0; i < 4; i++) {
    const x = r.zahl(14, 44), y = r.zahl(20, 46), l = r.zahl(10, 18), w = r.zahl(3, 4.5);
    const dreh = r.zahl(-60, 60);
    teile.push(group({ transform: `translate(${n(x)} ${n(y)}) rotate(${n(dreh)})` },
      rect(0, -w / 2, l, w, { ...kontur({ "stroke-width": 1.2 }), rx: w / 2, fill: C.knochen }),
      circle(0, 0, w * 0.9, { ...kontur({ "stroke-width": 1.2 }), fill: C.knochen }),
      circle(l, 0, w * 0.9, { ...kontur({ "stroke-width": 1.2 }), fill: C.knochen })));
  }
  teile.push(circle(24, 40, 8, { ...kontur({ "stroke-width": 1.6 }), fill: C.knochen }));
  teile.push(circle(21, 39, 2, { fill: C.tinte }));
  teile.push(circle(27, 39, 2, { fill: C.tinte }));
  return svg("Knochenhaufen", ZELLE, ZELLE, teile.join(""));
}

function spalte(name) {
  const r = zufall(name);
  const links = [], rechts = [];
  for (let i = 0; i <= 6; i++) {
    const y = 6 + i * 8.6;
    const breite = Math.sin((i / 6) * Math.PI) * r.zahl(6, 11) + 2;
    links.push([32 - breite + r.zahl(-2, 2), y]);
    rechts.push([32 + breite + r.zahl(-2, 2), y]);
  }
  return svg("Spalte", ZELLE, ZELLE, [
    poly([...links, ...rechts.reverse()], { ...kontur({ "stroke-width": 2 }), fill: C.tinte, "fill-opacity": 0.82 }),
  ].join(""));
}

function lagerfeuer(name) {
  const r = zufall(name);
  const teile = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    teile.push(ellipse(32 + Math.cos(a) * 20, 32 + Math.sin(a) * 20, r.zahl(4, 6), r.zahl(3.5, 5), { ...kontur({ "stroke-width": 1.4 }), fill: C.fels }));
  }
  teile.push(circle(32, 32, 13, { fill: C.tinte, "fill-opacity": 0.5 }));
  teile.push(line(24, 38, 40, 26, { stroke: C.holzTief, "stroke-width": 3, "stroke-linecap": "round" }));
  teile.push(line(24, 26, 40, 38, { stroke: C.holzTief, "stroke-width": 3, "stroke-linecap": "round" }));
  teile.push(path("M32 22 Q37 29 34 36 Q41 32 39 25 Q45 32 39 40 L25 40 Q19 32 25 25 Q23 32 30 36 Q27 29 32 22 Z", { fill: C.flamme, stroke: "none" }));
  return svg("Lagerfeuer", ZELLE, ZELLE, teile.join(""));
}

// ---------------------------------------------------------------------------------------------
// Gegenstände — Waffen, Rüstung, Schilde, Flaschen
//
// Bewusst **ohne** Schemamigration. `ASSET_ARTEN` ist geschlossen ("eine neue Art ist ein
// ausdrücklicher Schema-Akt"), und dieser Block braucht den Akt nicht: seit `amboss` in 1.0.0
// heisst `moebel` in diesem Paket "Ding, das im Raum steht", nicht "Möbel im Wortsinn", und eine
// Flasche ist wörtlich ein `gefaess`. Eine zehnte Art zu erfinden, nur um Fundstücke einzusortieren,
// hiesse die irreversible Schicht für eine Frage der Ablage anzufassen.
// ---------------------------------------------------------------------------------------------

function flasche() {
  return svg("Flasche", ZELLE, ZELLE, [
    path("M28 22 L28 29 Q21 35 21 43 L21 47 Q21 51 25 51 L39 51 Q43 51 43 47 L43 43 Q43 35 36 29 L36 22 Z", { ...kontur({ "stroke-width": 1.8 }), fill: C.wasser, "fill-opacity": 0.8 }),
    rect(26.5, 15, 11, 7, { ...kontur({ "stroke-width": 1.4 }), rx: 1.5, fill: C.holzTief }),
    line(23, 43, 41, 43, feder({ stroke: C.wasserTief, "stroke-width": 1.4 })),
  ].join(""));
}

function phiole() {
  const teile = [];
  // Drei Fläschchen statt einem: eine einzelne Phiole verschwindet bei 64 px.
  for (const [x, hoch] of [[20, 0], [32, -3], [44, 1]]) {
    teile.push(path(`M${n(x - 4)} ${n(28 + hoch)} L${n(x - 4)} ${n(34 + hoch)} Q${n(x - 7)} ${n(38 + hoch)} ${n(x - 7)} ${n(43 + hoch)} Q${n(x - 7)} ${n(47 + hoch)} ${n(x)} ${n(47 + hoch)} Q${n(x + 7)} ${n(47 + hoch)} ${n(x + 7)} ${n(43 + hoch)} Q${n(x + 7)} ${n(38 + hoch)} ${n(x + 4)} ${n(34 + hoch)} L${n(x + 4)} ${n(28 + hoch)} Z`,
      { ...kontur({ "stroke-width": 1.4 }), fill: C.pilz, "fill-opacity": 0.7 }));
    teile.push(rect(x - 3, 24 + hoch, 6, 4, { ...kontur({ "stroke-width": 1.2 }), fill: C.holzTief }));
  }
  return svg("Phiolen", ZELLE, ZELLE, teile.join(""));
}

function amphore() {
  return svg("Amphore", ZELLE, ZELLE, [
    path("M26 22 Q18 30 19 38 Q20 48 32 52 Q44 48 45 38 Q46 30 38 22 Z", { ...kontur({ "stroke-width": 1.8 }), fill: C.erde }),
    path("M26 25 Q19 27 21 34", kontur({ "stroke-width": 1.6 })),
    path("M38 25 Q45 27 43 34", kontur({ "stroke-width": 1.6 })),
    ellipse(32, 21, 7, 3.2, { ...kontur({ "stroke-width": 1.4 }), fill: C.pergamentTief }),
    line(22, 38, 42, 38, feder({ stroke: C.tinte, "stroke-opacity": 0.35 })),
  ].join(""));
}

function kessel() {
  return svg("Kessel", ZELLE, ZELLE, [
    path("M15 30 Q15 48 32 50 Q49 48 49 30 Z", { ...kontur({ "stroke-width": 2 }), fill: C.metallTief }),
    ellipse(32, 30, 17, 5, { ...kontur({ "stroke-width": 1.8 }), fill: C.tinte, "fill-opacity": 0.7 }),
    path("M16 27 Q32 14 48 27", kontur({ "stroke-width": 1.8 })),
    line(24, 51, 21, 56, kontur({ "stroke-width": 1.6 })),
    line(40, 51, 43, 56, kontur({ "stroke-width": 1.6 })),
  ].join(""));
}

function weinschlauch() {
  return svg("Weinschlauch", ZELLE, ZELLE, [
    path("M24 24 Q14 32 17 42 Q21 52 32 52 Q43 52 47 42 Q50 32 40 24 Q32 20 24 24 Z", { ...kontur({ "stroke-width": 1.8 }), fill: C.tuch }),
    rect(29, 14, 6, 10, { ...kontur({ "stroke-width": 1.4 }), rx: 1.5, fill: C.holzTief }),
    path("M23 34 Q32 40 41 34", feder({ stroke: C.tinte, "stroke-width": 1.2, "stroke-opacity": 0.45 })),
    circle(24, 27, 2, { fill: C.tinte, "fill-opacity": 0.4 }),
  ].join(""));
}

function kelch() {
  return svg("Kelch", ZELLE, ZELLE, [
    path("M22 20 Q22 34 32 38 Q42 34 42 20 Z", { ...kontur({ "stroke-width": 1.8 }), fill: C.metall }),
    line(32, 38, 32, 46, kontur({ "stroke-width": 2.4 })),
    ellipse(32, 47, 9, 3.4, { ...kontur({ "stroke-width": 1.8 }), fill: C.metallTief }),
    ellipse(32, 20, 10, 3.2, { ...kontur({ "stroke-width": 1.4 }), fill: C.flamme, "fill-opacity": 0.55 }),
  ].join(""));
}

function waffenstaender() {
  const teile = [rect(10, 40, 44, 10, { ...kontur({ "stroke-width": 1.8 }), rx: 2, fill: C.holzTief })];
  teile.push(rect(10, 14, 44, 5, { ...kontur({ "stroke-width": 1.6 }), rx: 1.5, fill: C.holzTief }));
  // Speer, Schwert, Axt. Bei 64 px liest die Silhouette, nie das Detail.
  teile.push(line(20, 16, 20, 44, { stroke: C.holz, "stroke-width": 3, "stroke-linecap": "round" }));
  teile.push(poly([[20, 7], [23.5, 16], [16.5, 16]], { ...kontur({ "stroke-width": 1.2 }), fill: C.metall }));
  teile.push(line(32, 18, 32, 44, { stroke: C.metall, "stroke-width": 4, "stroke-linecap": "round" }));
  teile.push(line(26, 21, 38, 21, kontur({ "stroke-width": 2 })));
  teile.push(line(44, 14, 44, 44, { stroke: C.holz, "stroke-width": 3, "stroke-linecap": "round" }));
  teile.push(path("M44 13 Q53 18 44 24 Z", { ...kontur({ "stroke-width": 1.4 }), fill: C.metallTief }));
  return svg("Waffenständer", ZELLE, ZELLE, teile.join(""));
}

function ruestungsstaender() {
  return svg("Rüstungsständer", ZELLE, ZELLE, [
    path("M24 12 Q32 6 40 12 L40 20 L24 20 Z", { ...kontur({ "stroke-width": 1.8 }), fill: C.metallTief }),
    line(26, 17, 38, 17, feder({ stroke: C.tinte, "stroke-opacity": 0.5 })),
    path("M20 23 L44 23 L41 42 Q32 46 23 42 Z", { ...kontur({ "stroke-width": 2 }), fill: C.metall }),
    line(32, 24, 32, 43, feder({ stroke: C.metallTief, "stroke-width": 1.4 })),
    path("M27 28 Q32 32 37 28", feder({ stroke: C.metallTief, "stroke-width": 1.2 })),
    line(32, 46, 32, 52, kontur({ "stroke-width": 2.4 })),
    ellipse(32, 53, 11, 3.4, { ...kontur({ "stroke-width": 1.6 }), fill: C.holzTief }),
  ].join(""));
}

function schildwand() {
  const w = ZELLE * 2;
  const teile = [rect(6, 18, w - 12, 30, { ...kontur({ "stroke-width": 1.8 }), fill: C.holzTief })];
  teile.push(circle(28, 33, 12, { ...kontur({ "stroke-width": 2 }), fill: C.metall }));
  teile.push(circle(28, 33, 4, { ...kontur({ "stroke-width": 1.4 }), fill: C.metallTief }));
  teile.push(path("M64 21 L76 25 L76 36 Q70 45 64 47 Q58 45 52 36 L52 25 Z", { ...kontur({ "stroke-width": 2 }), fill: C.tuch }));
  teile.push(line(64, 22, 64, 46, feder({ stroke: C.pergament, "stroke-width": 1.4 })));
  teile.push(circle(100, 33, 12, { ...kontur({ "stroke-width": 2 }), fill: C.metall }));
  for (const deg of [0, 60, 120]) {
    const rad = (deg * Math.PI) / 180;
    teile.push(line(100 - Math.cos(rad) * 10, 33 - Math.sin(rad) * 10, 100 + Math.cos(rad) * 10, 33 + Math.sin(rad) * 10, feder({ stroke: C.metallTief, "stroke-width": 1.4 })));
  }
  return svg("Schildwand", w, ZELLE, teile.join(""));
}

function waffenhaufen(name) {
  const r = zufall(name);
  const teile = [ellipse(32, 36, 23, 15, { fill: C.tinteHell, "fill-opacity": 0.16 })];
  for (let i = 0; i < 5; i++) {
    const dreh = r.zahl(-75, 75), x = r.zahl(16, 46), y = r.zahl(26, 44), l = r.zahl(20, 30);
    teile.push(group({ transform: `translate(${n(x)} ${n(y)}) rotate(${n(dreh)})` },
      line(-l / 2, 0, l / 2, 0, { stroke: r.waehle([C.holz, C.metallTief, C.metall]), "stroke-width": r.zahl(2.4, 3.6), "stroke-linecap": "round" })));
  }
  teile.push(circle(38, 40, 9, { ...kontur({ "stroke-width": 1.6 }), fill: C.metall }));
  teile.push(circle(38, 40, 3, { fill: C.metallTief }));
  return svg("Waffenhaufen", ZELLE, ZELLE, teile.join(""));
}

function schleifstein() {
  return svg("Schleifstein", ZELLE, ZELLE, [
    rect(14, 40, 36, 8, { ...kontur({ "stroke-width": 1.6 }), rx: 2, fill: C.holzTief }),
    circle(32, 30, 15, { ...kontur({ "stroke-width": 2.2 }), fill: C.steinTief }),
    circle(32, 30, 9, feder({ stroke: C.tinte, "stroke-width": 1.2, "stroke-opacity": 0.5 })),
    circle(32, 30, 2.6, { fill: C.metallTief }),
    line(47, 30, 53, 30, kontur({ "stroke-width": 2 })),
  ].join(""));
}

function muenzhaufen(name) {
  const r = zufall(name);
  const teile = [ellipse(32, 38, 20, 12, { fill: C.tinteHell, "fill-opacity": 0.16 })];
  for (let i = 0; i < 14; i++) {
    teile.push(ellipse(r.zahl(18, 46), r.zahl(30, 44), r.zahl(3.4, 5), r.zahl(2, 3), { fill: C.flamme, stroke: C.tinte, "stroke-width": 1 }));
  }
  // Ein kleiner Stapel obendrauf, sonst liest der Fleck als Kies statt als Geld.
  for (let i = 0; i < 3; i++) teile.push(ellipse(38, 34 - i * 3.4, 5, 3, { fill: C.flamme, stroke: C.tinte, "stroke-width": 1.2 }));
  return svg("Münzhaufen", ZELLE, ZELLE, teile.join(""));
}

function buecherstapel(name) {
  const r = zufall(name);
  const teile = [];
  let y = 46;
  for (let i = 0; i < 4; i++) {
    const b = r.zahl(24, 34), h = r.zahl(5, 7.5), x = 32 - b / 2 + r.zahl(-3, 3);
    teile.push(rect(x, y - h, b, h, { ...kontur({ "stroke-width": 1.4 }), rx: 1, fill: r.waehle([C.tuch, C.holzTief, C.pilz, C.wasserTief]) }));
    teile.push(line(x + 2.5, y - h + 1.5, x + 2.5, y - 1.5, feder({ stroke: C.pergament, "stroke-width": 1.4 })));
    y -= h + 0.8;
  }
  return svg("Bücherstapel", ZELLE, ZELLE, teile.join(""));
}

function schriftrollen(name) {
  const r = zufall(name);
  const teile = [];
  for (const [x, y, dreh] of [[24, 38, -18], [38, 32, 24], [31, 45, 6]]) {
    const l = r.zahl(22, 28);
    teile.push(group({ transform: `translate(${n(x)} ${n(y)}) rotate(${n(dreh)})` },
      rect(-l / 2, -5, l, 10, { ...kontur({ "stroke-width": 1.4 }), rx: 1, fill: C.pergament }),
      ellipse(-l / 2, 0, 2.6, 5.4, { ...kontur({ "stroke-width": 1.4 }), fill: C.pergamentTief }),
      ellipse(l / 2, 0, 2.6, 5.4, { ...kontur({ "stroke-width": 1.4 }), fill: C.pergamentTief }),
      line(-l / 2 + 5, -1.5, l / 2 - 5, -1.5, feder({ "stroke-width": 0.9, "stroke-opacity": 0.6 })),
      line(-l / 2 + 5, 1.8, l / 2 - 6, 1.8, feder({ "stroke-width": 0.9, "stroke-opacity": 0.6 }))));
  }
  return svg("Schriftrollen", ZELLE, ZELLE, teile.join(""));
}

// ---------------------------------------------------------------------------------------------
// Vielfalt — zweite und dritte Antworten auf die Fragen, die der Generator ohnehin stellt
//
// Gemessen vor 1.2.0: von 40 `(art, schlagwort)`-Anfragen, die `grundriss`, `hoehle` und
// `siedlung` tatsächlich stellen, hatten **26 genau einen** Kandidaten. `r.waehle` über eine
// einelementige Liste ist eine Konstante, keine Wahl — jede Halle bekam denselben Tisch, jede
// Kammer dasselbe Bett, jede Tür dasselbe Türblatt. Jedes Stück hier trägt darum mindestens ein
// bereits abgefragtes Schlagwort; ein Asset, das keine Anfrage erreicht, ist totes Gewicht.
// ---------------------------------------------------------------------------------------------

function bodenZiegel(name) {
  const r = zufall(name);
  const teile = [rect(0, 0, ZELLE, ZELLE, { fill: C.steinTief })];
  // Läuferverband: jede zweite Lage um eine halbe Ziegellänge versetzt. Die Lagenhöhe teilt 64
  // glatt und der Versatz ist fest, sonst verspringt der Verband über die Kachelgrenze.
  for (let lage = 0; lage < 4; lage++) {
    const y = lage * 16, versatz = lage % 2 === 0 ? 0 : 16;
    teile.push(line(0, y, ZELLE, y, feder({ stroke: C.tinte, "stroke-width": 1.3, "stroke-opacity": 0.45 })));
    for (let x = versatz; x < ZELLE; x += 32) {
      if (x > 0) teile.push(line(x, y, x, y + 16, feder({ stroke: C.tinte, "stroke-width": 1.1, "stroke-opacity": 0.4 })));
      teile.push(rect(x + 1, y + 1, 30, 14, { fill: C.stein, "fill-opacity": r.zahl(0.25, 0.6) }));
    }
  }
  return svg("Ziegelboden", ZELLE, ZELLE, teile.join(""));
}

function bodenMosaik(name) {
  const r = zufall(name);
  const teile = [rect(0, 0, ZELLE, ZELLE, { fill: C.pergamentTief })];
  // Achtes Raster, damit die Tesserae bei 64 px noch als Steinchen und nicht als Rauschen lesen.
  for (let gx = 0; gx < 8; gx++) for (let gy = 0; gy < 8; gy++) {
    const ring = Math.max(Math.abs(gx - 3.5), Math.abs(gy - 3.5));
    const farbe = ring < 1.5 ? C.flamme : ring < 2.5 ? C.tuch : r.waehle([C.stein, C.pergament, C.steinTief]);
    teile.push(rect(gx * 8 + 0.7, gy * 8 + 0.7, 6.6, 6.6, { fill: farbe, "fill-opacity": r.zahl(0.6, 0.95) }));
  }
  return svg("Mosaikboden", ZELLE, ZELLE, teile.join(""));
}

function bodenDielenAlt(name) {
  const r = zufall(name);
  const teile = [rect(0, 0, ZELLE, ZELLE, { fill: C.holzTief })];
  for (let i = 1; i < 4; i++) teile.push(line(0, i * 16, ZELLE, i * 16, feder({ "stroke-width": 1.6, stroke: C.tinte, "stroke-opacity": 0.5 })));
  for (let i = 0; i < 4; i++) {
    // Ausgeschlagene Dielen: eine Lücke pro Reihe zeigt den Grund darunter.
    const x = r.zahl(6, 40), b = r.zahl(8, 18);
    teile.push(rect(x, i * 16 + 2, b, 12, { fill: C.tinte, "fill-opacity": r.zahl(0.3, 0.55) }));
    teile.push(line(r.zahl(2, 30), i * 16 + 8, r.zahl(34, 62), i * 16 + 8, feder({ "stroke-width": 0.9, stroke: C.tinte, "stroke-opacity": 0.35 })));
  }
  return svg("Dielenboden, ausgeschlagen", ZELLE, ZELLE, teile.join(""));
}

function bodenSand(name) {
  const r = zufall(name);
  const teile = [rect(0, 0, ZELLE, ZELLE, { fill: C.pergamentTief })];
  // Rippel laufen durch die Kachel hindurch: Anfang und Ende liegen exakt auf den Rändern.
  for (let i = 0; i < 5; i++) {
    const y = 6 + i * 13;
    teile.push(path(`M0 ${n(y)} Q16 ${n(y + r.zahl(-4, 4))} 32 ${n(y)} T64 ${n(y)}`, feder({ stroke: C.erde, "stroke-width": 1.4, "stroke-opacity": 0.75 })));
  }
  for (let i = 0; i < 10; i++) teile.push(circle(r.zahl(3, 61), r.zahl(3, 61), r.zahl(0.8, 1.7), { fill: C.tinteHell, "fill-opacity": r.zahl(0.25, 0.5) }));
  return svg("Sandboden", ZELLE, ZELLE, teile.join(""));
}

function tuerStein() {
  return svg("Steintür", ZELLE, ZELLE, [
    path("M10 54 A44 44 0 0 1 54 10", feder({ "stroke-width": 1.4, "stroke-dasharray": "4 4" })),
    rect(8, 24, 48, 16, { ...kontur({ "stroke-width": 2.4 }), fill: C.stein }),
    line(24, 24, 24, 40, feder({ stroke: C.steinTief, "stroke-width": 1.6 })),
    line(40, 24, 40, 40, feder({ stroke: C.steinTief, "stroke-width": 1.6 })),
    circle(32, 32, 4.5, { fill: "none", stroke: C.tinte, "stroke-width": 2 }),
  ].join(""));
}

function tuerDoppel() {
  const w = ZELLE * 2;
  return svg("Doppeltür", w, ZELLE, [
    path("M20 54 A44 44 0 0 1 64 10", feder({ "stroke-width": 1.4, "stroke-dasharray": "4 4" })),
    path("M108 54 A44 44 0 0 0 64 10", feder({ "stroke-width": 1.4, "stroke-dasharray": "4 4" })),
    rect(8, 26, 56, 12, { ...kontur(), fill: C.holz }),
    rect(64, 26, 56, 12, { ...kontur(), fill: C.holz }),
    line(26, 26, 26, 38, feder({ stroke: C.holzTief })),
    line(45, 26, 45, 38, feder({ stroke: C.holzTief })),
    line(83, 26, 83, 38, feder({ stroke: C.holzTief })),
    line(102, 26, 102, 38, feder({ stroke: C.holzTief })),
    circle(59, 32, 2.4, { fill: C.metallTief }),
    circle(69, 32, 2.4, { fill: C.metallTief }),
  ].join(""));
}

function tuerGeheim() {
  return svg("Geheimtür", ZELLE, ZELLE, [
    rect(8, 26, 48, 12, { fill: C.stein, stroke: C.tinte, "stroke-width": 2, "stroke-dasharray": "5 3" }),
    line(20, 26, 20, 38, feder({ stroke: C.steinTief, "stroke-width": 1.2 })),
    line(44, 26, 44, 38, feder({ stroke: C.steinTief, "stroke-width": 1.2 })),
    // Der Angelpunkt, an dem die Wand sich dreht — das ist die ganze Aussage des Symbols.
    circle(8, 32, 3, { fill: C.tinte }),
    path("M14 44 Q26 48 38 44", feder({ "stroke-width": 1.4, "stroke-dasharray": "3 3" })),
  ].join(""));
}

function wendeltreppe() {
  const teile = [circle(32, 32, 26, { ...kontur({ "stroke-width": 2.2 }), fill: C.stein })];
  // Acht Keilstufen um eine Spindel: dieselbe Aussage wie `treppe_*`, auf einer Zelle statt zwei.
  for (let i = 0; i < 8; i++) {
    const a0 = (i / 8) * Math.PI * 2, a1 = ((i + 1) / 8) * Math.PI * 2;
    teile.push(poly([[32, 32], [32 + Math.cos(a0) * 25, 32 + Math.sin(a0) * 25], [32 + Math.cos(a1) * 25, 32 + Math.sin(a1) * 25]],
      { fill: C.tinte, "fill-opacity": 0.05 + (i / 8) * 0.16, stroke: C.tinteHell, "stroke-width": 1.2 }));
  }
  teile.push(circle(32, 32, 7, { ...kontur({ "stroke-width": 2 }), fill: C.steinTief }));
  teile.push(polyline([[44, 20], [50, 26], [44, 30]], kontur({ "stroke-width": 2.4 })));
  return svg("Wendeltreppe", ZELLE, ZELLE, teile.join(""));
}

function saeuleBruch(name) {
  const r = zufall(name);
  const teile = [circle(32, 32, 21, { fill: C.steinTief, stroke: C.tinte, "stroke-width": 2.2, "stroke-dasharray": "9 4" })];
  teile.push(poly(klumpen(r, 32, 32, 14, 7, 0.24), { ...kontur({ "stroke-width": 1.6 }), fill: C.stein }));
  // Abgeschlagene Brocken im Ring: eine Säule, die nicht mehr trägt, muss man sehen können.
  for (let i = 0; i < 4; i++) {
    const a = r.zahl(0, 6.28);
    teile.push(poly(klumpen(r, 32 + Math.cos(a) * 24, 32 + Math.sin(a) * 24, r.zahl(3.5, 6), 5, 0.3), { ...kontur({ "stroke-width": 1.2 }), fill: C.steinTief }));
  }
  return svg("Säulenstumpf", ZELLE, ZELLE, teile.join(""));
}

function brunnen() {
  return svg("Brunnen", ZELLE, ZELLE, [
    circle(32, 32, 23, { ...kontur({ "stroke-width": 2.4 }), fill: C.stein }),
    circle(32, 32, 16, { ...kontur({ "stroke-width": 1.8 }), fill: C.wasserTief }),
    circle(32, 32, 16, { fill: C.wasser, "fill-opacity": 0.55 }),
    circle(32, 32, 9, feder({ stroke: C.pergament, "stroke-width": 1.4, "stroke-opacity": 0.7 })),
    circle(32, 32, 4, feder({ stroke: C.pergament, "stroke-width": 1.2, "stroke-opacity": 0.5 })),
    line(9, 32, 55, 32, { stroke: C.holzTief, "stroke-width": 3, "stroke-linecap": "round" }),
  ].join(""));
}

function statue() {
  return svg("Statue", ZELLE, ZELLE, [
    circle(32, 32, 22, { ...kontur({ "stroke-width": 2 }), fill: C.steinTief }),
    circle(32, 32, 22, feder({ "stroke-dasharray": "3 4", "stroke-opacity": 0.7 })),
    // Von oben: Kopf, Schultern, ein vorgestreckter Arm. Genug Richtung für eine Blickachse.
    path("M22 40 Q22 26 32 26 Q42 26 42 40 Z", { ...kontur({ "stroke-width": 1.8 }), fill: C.stein }),
    circle(32, 24, 7, { ...kontur({ "stroke-width": 1.8 }), fill: C.stein }),
    line(32, 26, 32, 18, kontur({ "stroke-width": 2 })),
    ellipse(32, 42, 12, 4, { ...kontur({ "stroke-width": 1.4 }), fill: C.stein }),
  ].join(""));
}

function ketteRing() {
  const teile = [circle(32, 20, 5, { ...kontur({ "stroke-width": 2.2 }), fill: "none" })];
  // Ein Ring in der Wand und die Kette daran. Kerkerinventar, kein Schmuck.
  for (let i = 0; i < 5; i++) {
    const y = 27 + i * 6.2;
    teile.push(ellipse(32 + (i % 2 === 0 ? -2.5 : 2.5), y, 3.6, 2.6, { fill: "none", stroke: C.metallTief, "stroke-width": 1.8 }));
  }
  teile.push(ellipse(32, 55, 7, 4.5, { ...kontur({ "stroke-width": 2 }), fill: "none" }));
  return svg("Wandkette", ZELLE, ZELLE, teile.join(""));
}

function wandfackel() {
  return svg("Wandfackel", ZELLE, ZELLE, [
    rect(26, 40, 12, 12, { ...kontur({ "stroke-width": 1.6 }), rx: 2, fill: C.metallTief }),
    line(32, 40, 32, 28, { stroke: C.holzTief, "stroke-width": 4, "stroke-linecap": "round" }),
    path("M32 12 Q37 20 34 27 Q40 23 38 17 Q44 24 38 32 L26 32 Q20 24 26 17 Q24 23 30 27 Q27 20 32 12 Z", { fill: C.flamme, stroke: "none" }),
    circle(32, 27, 3.5, { fill: C.pergament, "fill-opacity": 0.55 }),
  ].join(""));
}

function laterne() {
  return svg("Laterne", ZELLE, ZELLE, [
    path("M22 18 Q32 10 42 18", kontur({ "stroke-width": 1.8 })),
    rect(21, 20, 22, 6, { ...kontur({ "stroke-width": 1.6 }), rx: 1.5, fill: C.metallTief }),
    path("M23 26 L41 26 L44 46 L20 46 Z", { ...kontur({ "stroke-width": 1.8 }), fill: C.pergament, "fill-opacity": 0.8 }),
    line(32, 26, 32, 46, feder({ stroke: C.metallTief, "stroke-width": 1.2 })),
    ellipse(32, 38, 4.5, 6, { fill: C.flamme, "fill-opacity": 0.85 }),
    rect(18, 46, 28, 5, { ...kontur({ "stroke-width": 1.6 }), rx: 1.5, fill: C.metallTief }),
  ].join(""));
}

function kandelaber() {
  const teile = [ellipse(32, 50, 13, 4.5, { ...kontur({ "stroke-width": 1.8 }), fill: C.metallTief })];
  teile.push(line(32, 50, 32, 26, kontur({ "stroke-width": 2.8 })));
  teile.push(path("M14 30 Q14 22 32 26 Q50 22 50 30", kontur({ "stroke-width": 2 })));
  for (const [x, y] of [[14, 30], [32, 24], [50, 30]]) {
    teile.push(rect(x - 2.4, y - 9, 4.8, 9, { ...kontur({ "stroke-width": 1.2 }), rx: 1, fill: C.pergament }));
    teile.push(ellipse(x, y - 12, 2.2, 3.4, { fill: C.flamme }));
  }
  return svg("Kandelaber", ZELLE, ZELLE, teile.join(""));
}

function markeFalle() {
  return svg("Marke: Falle", ZELLE, ZELLE, [
    circle(32, 32, 21, { fill: C.pergament, "fill-opacity": 0.7, stroke: C.tinte, "stroke-width": 2, "stroke-dasharray": "2 4" }),
    poly([[32, 16], [47, 44], [17, 44]], { ...kontur({ "stroke-width": 2.6 }), fill: "none" }),
    line(32, 26, 32, 36, kontur({ "stroke-width": 3 })),
    circle(32, 40, 2, { fill: C.tinte }),
  ].join(""));
}

function markeZiel() {
  return svg("Marke: Ziel", ZELLE, ZELLE, [
    circle(32, 32, 21, { fill: C.pergament, "fill-opacity": 0.7, stroke: C.tinte, "stroke-width": 2, "stroke-dasharray": "6 4" }),
    circle(32, 32, 13, { fill: "none", stroke: C.tinte, "stroke-width": 2.2 }),
    circle(32, 32, 6, { fill: "none", stroke: C.tinte, "stroke-width": 2 }),
    circle(32, 32, 2, { fill: C.tinte }),
  ].join(""));
}

function markeFrage() {
  return svg("Marke: Ungeklärt", ZELLE, ZELLE, [
    circle(32, 32, 21, { fill: C.pergament, "fill-opacity": 0.7, stroke: C.tinte, "stroke-width": 2, "stroke-dasharray": "4 4" }),
    path("M25 26 Q25 18 32 18 Q39 18 39 25 Q39 31 32 33 L32 38", kontur({ "stroke-width": 3 })),
    circle(32, 45, 2.4, { fill: C.tinte }),
  ].join(""));
}

// ---------------------------------------------------------------------------------------------
// Wände — die erste besetzte `wand`-Art des Pakets
//
// Der Generator liefert Wände als **Geometrie** (`karte.walls`) und wird das weiter tun; das steht
// so in `AUSGELASSEN_BASIS`. Diese Stempel sind für die Hand am Editor, nicht für den Erzeuger:
// ein Segment füllt genau eine Zelle, die Lagen sind an den Zellrändern gepinnt, also reihen sich
// gedrehte Kopien ohne Versprung. `EBENE.wand` (25) lag längst in `kartenwerk.ts` bereit.
// ---------------------------------------------------------------------------------------------

/** Wandband über die volle Zellbreite. Die Ränder liegen fest, damit Segmente stossen. */
function wandband(inhalt) {
  return [rect(0, 20, ZELLE, 24, { fill: C.stein, stroke: C.tinte, "stroke-width": 2 }), ...inhalt].join("");
}

function wandStein(name) {
  const r = zufall(name);
  const teile = [line(0, 32, ZELLE, 32, feder({ stroke: C.steinTief, "stroke-width": 1.5 }))];
  for (const [y0, versatz] of [[20, 0], [32, 10]]) {
    // Bis ZELLE - 2, nicht bis ZELLE: der letzte Schritt liesse einen entarteten Ziegel übrig,
    // und `Math.min(19, ZELLE - x - 2)` wurde dort negativ — ein <rect width="-1">, das der
    // Browser verwirft. Vom Assetgate ab 1.2.0 als eigene Regel abgefangen.
    for (let x = versatz; x < ZELLE - 2; x += 21) {
      if (x > 0.5) teile.push(line(x, y0, x, y0 + 12, feder({ stroke: C.steinTief, "stroke-width": 1.3 })));
      teile.push(rect(x + 1, y0 + 1, Math.min(19, ZELLE - x - 2), 10, { fill: C.steinTief, "fill-opacity": r.zahl(0.15, 0.4) }));
    }
  }
  return svg("Wand, Stein", ZELLE, ZELLE, wandband(teile));
}

function wandZiegel() {
  const teile = [];
  for (const [y0, versatz] of [[20, 0], [28, 6], [36, 0]]) {
    teile.push(line(0, y0, ZELLE, y0, feder({ stroke: C.tinte, "stroke-width": 1.1, "stroke-opacity": 0.45 })));
    for (let x = versatz; x < ZELLE; x += 12) if (x > 0.5) teile.push(line(x, y0, x, y0 + 8, feder({ stroke: C.tinte, "stroke-width": 1, "stroke-opacity": 0.4 })));
  }
  return svg("Wand, Ziegel", ZELLE, ZELLE, wandband(teile));
}

function wandBruch(name) {
  const r = zufall(name);
  const teile = [];
  // Bruchsteinmauer: unregelmässige Steine, aber die Zellkanten bleiben unangetastet.
  let x = 0;
  while (x < ZELLE) {
    const b = r.zahl(9, 17), h = r.zahl(9, 14), y = 20 + r.zahl(0, 24 - h);
    teile.push(poly(klumpen(r, Math.min(x + b / 2, ZELLE - 2), y + h / 2, Math.min(b, h) / 2 + 1.5, 6, 0.2), { fill: C.steinTief, stroke: C.tinte, "stroke-width": 1.2, "stroke-linejoin": "round" }));
    x += b * 0.85;
  }
  teile.push(rect(0, 20, ZELLE, 24, kontur({ "stroke-width": 2 })));
  return svg("Wand, Bruchstein", ZELLE, ZELLE, wandband(teile));
}

function wandHolz() {
  const teile = [rect(0, 20, ZELLE, 24, { fill: C.holz })];
  for (let x = 4; x < ZELLE; x += 9) teile.push(line(x, 20, x, 44, feder({ stroke: C.holzTief, "stroke-width": 1.4 })));
  teile.push(line(0, 25, ZELLE, 25, { stroke: C.holzTief, "stroke-width": 2.4 }));
  teile.push(line(0, 39, ZELLE, 39, { stroke: C.holzTief, "stroke-width": 2.4 }));
  teile.push(rect(0, 20, ZELLE, 24, kontur({ "stroke-width": 2 })));
  return svg("Wand, Holz", ZELLE, ZELLE, wandband(teile));
}

function wandFels(name) {
  const r = zufall(name);
  const teile = [rect(0, 20, ZELLE, 24, { fill: C.fels })];
  // Gewachsener Fels statt Mauerwerk: die Kanten des Bandes franst die Kontur, nicht die Zellkante.
  const oben = [], unten = [];
  for (let i = 0; i <= 8; i++) {
    const x = (i / 8) * ZELLE;
    oben.push([x, 20 + r.zahl(-3, 3)]);
    unten.push([x, 44 + r.zahl(-3, 3)]);
  }
  teile.push(poly([...oben, ...unten.reverse()], { fill: C.fels, stroke: C.tinte, "stroke-width": 2, "stroke-linejoin": "round" }));
  for (let i = 0; i < 6; i++) teile.push(polyline([[r.zahl(2, 60), r.zahl(22, 30)], [r.zahl(2, 60), r.zahl(34, 42)]], feder({ stroke: C.felsTief, "stroke-width": 1.2 })));
  return svg("Wand, Fels", ZELLE, ZELLE, teile.join(""));
}

// ---------------------------------------------------------------------------------------------
// Figuren — die erste besetzte `figur`-Art
//
// Marken, keine Porträts: ein Token ist von oben ein Ring mit einem Zeichen darin, und genau so
// wird es am Tisch gelesen. Die Silhouette trägt die Aussage, die Farbe trägt die Fraktion.
// `EBENE.figur` (5) liegt zwischen Möbel und Licht — eine Figur steht auf dem Tisch, nicht darin.
// ---------------------------------------------------------------------------------------------

/** Ringtoken. `gross` belegt 2x2 Zellen — das Mass, an dem eine Bestie als Bestie liest. */
function token(titel, fuellung, zeichen, gross = false) {
  const s = gross ? ZELLE * 2 : ZELLE;
  const m = s / 2, rad = m - 5;
  return svg(titel, s, s, [
    circle(m, m, rad, { fill: fuellung, stroke: C.tinte, "stroke-width": gross ? 3.2 : 2.6 }),
    circle(m, m, rad - 4, { fill: "none", stroke: C.pergament, "stroke-width": 1.4, "stroke-opacity": 0.55 }),
    zeichen(m, rad),
  ].join(""));
}

function figurHeld() {
  return token("Figur: Held", C.wasserTief, (m, rad) => group({},
    circle(m, m - rad * 0.3, rad * 0.22, { ...kontur({ "stroke-width": 2 }), fill: C.pergament }),
    path(`M${n(m - rad * 0.42)} ${n(m + rad * 0.5)} Q${n(m)} ${n(m - rad * 0.12)} ${n(m + rad * 0.42)} ${n(m + rad * 0.5)} Z`, { ...kontur({ "stroke-width": 2 }), fill: C.pergament })));
}

function figurWache() {
  return token("Figur: Wache", C.metallTief, (m, rad) => group({},
    circle(m, m - rad * 0.3, rad * 0.2, { ...kontur({ "stroke-width": 1.8 }), fill: C.pergament }),
    path(`M${n(m - rad * 0.4)} ${n(m + rad * 0.5)} Q${n(m)} ${n(m - rad * 0.1)} ${n(m + rad * 0.4)} ${n(m + rad * 0.5)} Z`, { ...kontur({ "stroke-width": 1.8 }), fill: C.pergament }),
    // Der Speer ist der Unterschied zwischen Wache und Zivilist.
    line(m + rad * 0.58, m - rad * 0.6, m + rad * 0.58, m + rad * 0.6, kontur({ "stroke-width": 2.4 }))));
}

function figurUntot() {
  return token("Figur: Untot", C.knochen, (m, rad) => group({},
    circle(m, m - rad * 0.16, rad * 0.34, { ...kontur({ "stroke-width": 2 }), fill: C.pergament }),
    circle(m - rad * 0.14, m - rad * 0.2, rad * 0.09, { fill: C.tinte }),
    circle(m + rad * 0.14, m - rad * 0.2, rad * 0.09, { fill: C.tinte }),
    poly([[m, m - rad * 0.02], [m + rad * 0.07, m + rad * 0.12], [m - rad * 0.07, m + rad * 0.12]], { fill: C.tinte }),
    line(m - rad * 0.2, m + rad * 0.3, m + rad * 0.2, m + rad * 0.3, kontur({ "stroke-width": 2 }))));
}

function figurSchwarm(name) {
  const r = zufall(name);
  return token("Figur: Schwarm", C.pilz, (m, rad) => group({},
    ...Array.from({ length: 9 }, () => {
      const a = r.zahl(0, 6.28), d = r.zahl(0, rad * 0.62);
      return circle(m + Math.cos(a) * d, m + Math.sin(a) * d, r.zahl(rad * 0.1, rad * 0.19), { ...kontur({ "stroke-width": 1.4 }), fill: C.tinte, "fill-opacity": 0.55 });
    })));
}

function figurBestie() {
  // Von oben gelesen setzt ein Betrachter ein Tier aus Rumpf, gesenktem Kopf, Ohren, vier Läufen
  // und Schweif zusammen. Ein einzelner geschwungener Umriss war dafür zu symmetrisch — er las
  // als Glocke. Die Teile einzeln zu zeichnen ist mehr Code und die einzige Fassung, die trägt.
  return token("Figur: Bestie", C.tuch, (m, rad) => group({},
    ...[[-1, -0.3], [1, -0.3], [-1, 0.3], [1, 0.3]].map(([sx, sy]) =>
      line(m + sx * rad * 0.26, m + sy * rad, m + sx * rad * 0.6, m + sy * rad + rad * 0.14, kontur({ "stroke-width": 3 }))),
    path(`M${n(m)} ${n(m + rad * 0.5)} Q${n(m + rad * 0.34)} ${n(m + rad * 0.82)} ${n(m + rad * 0.56)} ${n(m + rad * 0.56)}`, kontur({ "stroke-width": 2.6 })),
    ellipse(m, m + rad * 0.06, rad * 0.33, rad * 0.48, { ...kontur({ "stroke-width": 2.6 }), fill: C.pergament }),
    poly([[m - rad * 0.32, m - rad * 0.78], [m - rad * 0.14, m - rad * 0.6], [m - rad * 0.3, m - rad * 0.54]], { ...kontur({ "stroke-width": 1.8 }), fill: C.pergament }),
    poly([[m + rad * 0.32, m - rad * 0.78], [m + rad * 0.14, m - rad * 0.6], [m + rad * 0.3, m - rad * 0.54]], { ...kontur({ "stroke-width": 1.8 }), fill: C.pergament }),
    circle(m, m - rad * 0.48, rad * 0.25, { ...kontur({ "stroke-width": 2.6 }), fill: C.pergament }),
    circle(m - rad * 0.1, m - rad * 0.52, rad * 0.05, { fill: C.tinte }),
    circle(m + rad * 0.1, m - rad * 0.52, rad * 0.05, { fill: C.tinte })), true);
}

function figurRiese() {
  return token("Figur: Riese", C.felsTief, (m, rad) => group({},
    circle(m, m - rad * 0.34, rad * 0.2, { ...kontur({ "stroke-width": 2.6 }), fill: C.pergament }),
    path(`M${n(m - rad * 0.46)} ${n(m + rad * 0.54)} Q${n(m)} ${n(m - rad * 0.16)} ${n(m + rad * 0.46)} ${n(m + rad * 0.54)} Z`, { ...kontur({ "stroke-width": 2.6 }), fill: C.pergament }),
    line(m - rad * 0.6, m + rad * 0.6, m - rad * 0.6, m - rad * 0.5, kontur({ "stroke-width": 3.2 })),
    line(m + rad * 0.58, m - rad * 0.5, m + rad * 0.72, m + rad * 0.2, kontur({ "stroke-width": 3.2 }))), true);
}

// ---------------------------------------------------------------------------------------------
// Wohnen und Handwerk über mehrere Geschosse — 1.3.0
//
// Wandmöbel stehen mit dem Rücken an der Oberkante ihrer Fläche und zeigen nach unten: so steht
// ein Kamin an einer Nordwand ungedreht richtig, und der Erzeuger dreht ihn für jede andere Wand
// wie ein Bett. Teppiche und Läufer sind `aufbau`, flach und unter den Möbeln. Das Fenster liegt
// wie ein Türblatt quer durch die Zellmitte und wird wie eine Tür auf die Wandkante gesetzt.
// ---------------------------------------------------------------------------------------------

/** Die Flamme der Feuerschale, verschoben. Ein Feuer soll in jedem Stück gleich lesen. */
const flammeBei = (dx, dy, massstab = 1) => group({ transform: `translate(${n(dx)} ${n(dy)}) scale(${n(massstab)})` },
  path("M32 22 Q38 30 34 38 Q42 34 40 26 Q46 34 40 42 L24 42 Q18 34 24 26 Q22 34 30 38 Q26 30 32 22 Z", { fill: C.flamme, stroke: "none" }));

function kamin() {
  const w = ZELLE * 2;
  return svg("Kamin", w, ZELLE, [
    // Herdsteine vor der Öffnung, dann der Mauerblock mit der Feuerstelle darin.
    rect(18, 40, w - 36, 20, { ...kontur({ "stroke-width": 1.6 }), rx: 2, fill: C.steinTief }),
    ...[42, 64, 86].map((x) => line(x, 44, x, 58, feder({ stroke: C.tinte, "stroke-opacity": 0.45 }))),
    path(`M6 4 H${w - 6} V44 H96 L90 14 H38 L32 44 H6 Z`, { ...kontur(), fill: C.stein }),
    ...[[18, 4, 18, 44], [110, 4, 110, 44], [6, 24, 32, 24], [96, 24, 122, 24], [52, 4, 52, 14], [76, 4, 76, 14]].map(([x1, y1, x2, y2]) => line(x1, y1, x2, y2, feder({ stroke: C.steinTief, "stroke-width": 1.4 }))),
    poly([[38, 14], [90, 14], [96, 44], [32, 44]], { fill: C.tinte, "fill-opacity": 0.78, stroke: C.tinte, "stroke-width": 1.6, "stroke-linejoin": "round" }),
    line(46, 38, 82, 26, { stroke: C.holzTief, "stroke-width": 4, "stroke-linecap": "round" }),
    line(46, 26, 82, 38, { stroke: C.holzTief, "stroke-width": 4, "stroke-linecap": "round" }),
    flammeBei(32, -4),
  ].join(""));
}

function herd() {
  const w = ZELLE * 2;
  return svg("Herd", w, ZELLE, [
    rect(6, 5, w - 12, 50, { ...kontur(), rx: 3, fill: C.stein }),
    line(58, 5, 58, 55, feder({ stroke: C.steinTief, "stroke-width": 1.6 })),
    // Links der gemauerte Backofen mit seinem Mundloch nach vorn, rechts die Eisenplatte.
    circle(32, 27, 19, { ...kontur({ "stroke-width": 1.8 }), fill: C.steinTief }),
    circle(32, 27, 12, feder({ "stroke-width": 1.2 })),
    path("M22 55 L22 44 Q32 36 42 44 L42 55 Z", { fill: C.tinte, "fill-opacity": 0.8, stroke: C.tinte, "stroke-width": 1.4, "stroke-linejoin": "round" }),
    ellipse(32, 50, 5, 3, { fill: C.flamme, "fill-opacity": 0.9 }),
    rect(64, 10, 52, 38, { ...kontur({ "stroke-width": 1.6 }), rx: 2, fill: C.metallTief }),
    circle(78, 29, 8, { fill: C.tinte, "fill-opacity": 0.75, stroke: C.tinte, "stroke-width": 1.2 }),
    circle(78, 29, 4, { fill: C.flamme }),
    // Der Topf: Wand, Inhalt, Bügel. Erst der Topf macht aus der Platte einen Herd.
    circle(101, 29, 12, { ...kontur({ "stroke-width": 1.8 }), fill: C.metall }),
    circle(101, 29, 8.5, { fill: C.tuch, stroke: C.tinte, "stroke-width": 1 }),
    path("M89 29 Q101 12 113 29", kontur({ "stroke-width": 1.6 })),
    rect(70, 48, 40, 6, { fill: C.tinte, "fill-opacity": 0.8, stroke: C.tinte, "stroke-width": 1.2 }),
    ellipse(90, 51, 10, 2, { fill: C.flamme, "fill-opacity": 0.85 }),
  ].join(""));
}

function esse(name) {
  const r = zufall(name);
  const s = ZELLE * 2;
  const teile = [
    rect(16, 8, s - 32, 64, { ...kontur(), rx: 3, fill: C.stein }),
    ...[[16, 30, 30, 30], [98, 30, 112, 30], [40, 8, 40, 20], [88, 8, 88, 20]].map(([x1, y1, x2, y2]) => line(x1, y1, x2, y2, feder({ stroke: C.steinTief, "stroke-width": 1.4 }))),
    rect(54, 8, 20, 10, { fill: C.tinte, "fill-opacity": 0.6, stroke: C.tinte, "stroke-width": 1.4 }),
    ellipse(64, 44, 30, 20, { fill: C.tinte, "fill-opacity": 0.82, stroke: C.tinte, "stroke-width": 1.8 }),
  ];
  // Das Kohlebett: Brocken, in der Mitte glühend.
  for (let i = 0; i < 16; i++) {
    const a = r.zahl(0, 6.28), d = r.zahl(0, 1);
    teile.push(circle(64 + Math.cos(a) * d * 24, 44 + Math.sin(a) * d * 15, r.zahl(2, 3.6), { fill: d < 0.45 ? C.flamme : C.tinteHell, "fill-opacity": d < 0.45 ? 0.95 : 0.7 }));
  }
  teile.push(ellipse(64, 44, 9, 6, { fill: C.flamme, "fill-opacity": 0.6 }));
  // Der Rauchfang hängt über dem Feuer: gestrichelt und obenauf, wie jede Kante über Kopfhöhe.
  teile.push(poly([[10, 4], [s - 10, 4], [100, 78], [28, 78]], { fill: "none", stroke: C.tinte, "stroke-width": 1.6, "stroke-opacity": 0.75, "stroke-dasharray": "6 4", "stroke-linejoin": "round" }));
  // Der Blasebalg links vorn, die Düse zeigt in die Glut.
  teile.push(line(50, 84, 58, 62, { stroke: C.metallTief, "stroke-width": 3.4, "stroke-linecap": "round" }));
  teile.push(path("M50 84 L28 90 Q14 98 18 112 Q24 124 38 118 Z", { ...kontur({ "stroke-width": 1.8 }), fill: C.holz }));
  teile.push(path("M46 88 L31 94 Q22 100 24 110 Q28 118 37 114 Z", { fill: C.tuch, "fill-opacity": 0.8, stroke: C.tinte, "stroke-width": 1.1 }));
  teile.push(line(20, 116, 12, 124, kontur({ "stroke-width": 2.4 })));
  // Kohlenhaufen rechts vorn.
  teile.push(ellipse(96, 104, 18, 11, { fill: C.tinteHell, "fill-opacity": 0.2 }));
  for (let i = 0; i < 9; i++) teile.push(poly(klumpen(r, r.zahl(84, 108), r.zahl(98, 110), r.zahl(3, 5), 5, 0.3), { fill: C.tinte, "fill-opacity": 0.75, stroke: C.tinte, "stroke-width": 0.8 }));
  return svg("Esse", s, s, teile.join(""));
}

function theke() {
  const w = ZELLE * 3;
  const teile = [
    rect(4, 5, w - 8, 30, { ...kontur(), rx: 2, fill: C.holz }),
    line(8, 12, w - 8, 12, feder({ stroke: C.holzTief, "stroke-width": 1.4 })),
    // Das Fass mit Zapfhahn am linken Ende sagt "Schank", bevor jemand einen Krug findet.
    circle(20, 20, 11, { ...kontur({ "stroke-width": 1.6 }), fill: C.holzTief }),
    circle(20, 20, 6.5, feder({ stroke: C.metallTief, "stroke-width": 1.6 })),
    line(31, 20, 38, 20, kontur({ "stroke-width": 2.4 })),
    line(4, 40, w - 4, 40, { stroke: C.metallTief, "stroke-width": 2.4, "stroke-linecap": "round" }),
  ];
  for (const x of [56, 84, 122, 158]) {
    teile.push(path(`M${x + 5} 19 Q${x + 11} 22 ${x + 5} 27`, kontur({ "stroke-width": 1.6 })));
    teile.push(circle(x, 23, 6, { ...kontur({ "stroke-width": 1.5 }), fill: C.holzTief }));
    teile.push(circle(x, 23, 4, { fill: C.pergament }));
  }
  for (const x of [48, 96, 144]) teile.push(circle(x, 52, 7, { ...kontur({ "stroke-width": 1.6 }), fill: C.holz }));
  return svg("Theke", w, ZELLE, teile.join(""));
}

/** Kirchenbank: Rückenlehne hinten, Sitz, Wangen, Kniebrett vorn. */
function kirchbank(zellen) {
  const w = ZELLE * zellen;
  const teile = [
    rect(12, 46, w - 24, 8, { ...kontur({ "stroke-width": 1.4 }), rx: 1.5, fill: C.holzTief }),
    rect(8, 14, w - 16, 22, { ...kontur(), rx: 2, fill: C.holz }),
    line(12, 22, w - 12, 22, feder({ stroke: C.holzTief })),
    line(12, 29, w - 12, 29, feder({ stroke: C.holzTief })),
    rect(8, 7, w - 16, 7, { ...kontur({ "stroke-width": 1.8 }), rx: 1.5, fill: C.holzTief }),
    rect(4, 6, 7, 36, { ...kontur({ "stroke-width": 1.6 }), rx: 2, fill: C.holzTief }),
    rect(w - 11, 6, 7, 36, { ...kontur({ "stroke-width": 1.6 }), rx: 2, fill: C.holzTief }),
  ];
  for (let i = 1; i < zellen; i++) teile.push(line(i * ZELLE, 14, i * ZELLE, 36, feder({ stroke: C.holzTief, "stroke-width": 1.6 })));
  return svg(zellen > 2 ? "Kirchenbank, lang" : "Kirchenbank", w, ZELLE, teile.join(""));
}

/** Rautenborte zwischen zwei Punkten. Trägt die Muster aller drei Teppiche. */
function rautenreihe(x0, y0, x1, y1, schritt, halb, farbe) {
  const l = Math.hypot(x1 - x0, y1 - y0), ux = (x1 - x0) / l, uy = (y1 - y0) / l, anzahl = Math.floor(l / schritt);
  const rest = (l - anzahl * schritt) / 2;
  return Array.from({ length: anzahl }, (_, i) => {
    const t = rest + (i + 0.5) * schritt, cx = x0 + ux * t, cy = y0 + uy * t;
    return poly([[cx - ux * halb, cy - uy * halb], [cx - uy * halb * 0.8, cy + ux * halb * 0.8], [cx + ux * halb, cy + uy * halb], [cx + uy * halb * 0.8, cy - ux * halb * 0.8]], { fill: farbe, stroke: C.tinte, "stroke-width": 0.6, "stroke-opacity": 0.5 });
  }).join("");
}

function fransen(x, y0, y1, links) {
  const teile = [];
  for (let y = y0; y <= y1; y += 4) teile.push(line(x, y, x + (links ? -5 : 5), y, feder({ stroke: C.tinteHell, "stroke-width": 1 })));
  return teile.join("");
}

function teppich() {
  const w = ZELLE * 3, h = ZELLE * 2;
  return svg("Teppich", w, h, [
    fransen(14, 18, h - 18, true), fransen(w - 14, 18, h - 18, false),
    rect(14, 10, w - 28, h - 20, { ...kontur({ "stroke-width": 1.6 }), rx: 2, fill: C.tuch }),
    rect(22, 18, w - 44, h - 36, { fill: C.pergamentTief, stroke: C.tinte, "stroke-width": 1, "stroke-opacity": 0.6 }),
    rautenreihe(26, 14, w - 26, 14, 12, 3.4, C.pergamentTief),
    rautenreihe(26, h - 14, w - 26, h - 14, 12, 3.4, C.pergamentTief),
    rautenreihe(18, 22, 18, h - 22, 12, 3.4, C.pergamentTief),
    rautenreihe(w - 18, 22, w - 18, h - 22, 12, 3.4, C.pergamentTief),
    rect(30, 26, w - 60, h - 52, { fill: C.tuch, "fill-opacity": 0.85, stroke: "none" }),
    // Das Mittelmedaillon und vier Eckzwickel: das Muster, an dem man einen Teppich erkennt.
    poly([[w / 2, 32], [w / 2 + 40, h / 2], [w / 2, h - 32], [w / 2 - 40, h / 2]], { fill: C.pergamentTief, stroke: C.tinte, "stroke-width": 1.2 }),
    poly([[w / 2, 42], [w / 2 + 26, h / 2], [w / 2, h - 42], [w / 2 - 26, h / 2]], { fill: C.wasserTief, stroke: C.tinte, "stroke-width": 1 }),
    circle(w / 2, h / 2, 6, { fill: C.flamme, stroke: C.tinte, "stroke-width": 1 }),
    ...[[30, 26, 1, 1], [w - 30, 26, -1, 1], [30, h - 26, 1, -1], [w - 30, h - 26, -1, -1]].map(([x, y, sx, sy]) => poly([[x, y], [x + sx * 22, y], [x, y + sy * 18]], { fill: C.pergamentTief, stroke: C.tinte, "stroke-width": 0.9, "stroke-opacity": 0.7 })),
  ].join(""));
}

function teppichKlein() {
  const s = ZELLE * 2, m = s / 2;
  const teile = [circle(m, m, 54, { ...kontur({ "stroke-width": 1.6 }), fill: C.wasserTief })];
  teile.push(circle(m, m, 46, { fill: C.pergamentTief, stroke: C.tinte, "stroke-width": 1, "stroke-opacity": 0.6 }));
  // Ein Rautenkranz auf der Borte, dann ein Stern im Feld. Rund, damit die Kammer ihn vom Saalteppich unterscheidet.
  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * Math.PI * 2, cx = m + Math.cos(a) * 50, cy = m + Math.sin(a) * 50;
    teile.push(circle(cx, cy, 1.8, { fill: C.pergament }));
  }
  teile.push(circle(m, m, 40, { fill: C.wasserTief, "fill-opacity": 0.85, stroke: "none" }));
  teile.push(poly(Array.from({ length: 16 }, (_, k) => {
    const a = (k / 16) * Math.PI * 2 - Math.PI / 2, rr = k % 2 === 0 ? 32 : 16;
    return [m + Math.cos(a) * rr, m + Math.sin(a) * rr];
  }), { fill: C.pergamentTief, stroke: C.tinte, "stroke-width": 1.1 }));
  teile.push(circle(m, m, 9, { fill: C.tuch, stroke: C.tinte, "stroke-width": 1 }));
  return svg("Teppich, klein", s, s, teile.join(""));
}

function laeufer() {
  const h = ZELLE * 3;
  return svg("Läufer", ZELLE, h, [
    fransen2(18, 46, 8, true), fransen2(18, 46, h - 8, false),
    rect(16, 8, 32, h - 16, { ...kontur({ "stroke-width": 1.6 }), rx: 1.5, fill: C.tuch }),
    line(21, 12, 21, h - 12, { stroke: C.pergamentTief, "stroke-width": 2 }),
    line(43, 12, 43, h - 12, { stroke: C.pergamentTief, "stroke-width": 2 }),
    rautenreihe(32, 14, 32, h - 14, 16, 7, C.pergamentTief),
  ].join(""));
}

/** Fransen an der Stirnseite eines Läufers, quer statt längs. */
function fransen2(x0, x1, y, oben) {
  const teile = [];
  for (let x = x0; x <= x1; x += 4) teile.push(line(x, y, x, y + (oben ? -5 : 5), feder({ stroke: C.tinteHell, "stroke-width": 1 })));
  return teile.join("");
}

function schrank() {
  const w = ZELLE * 2;
  const teile = [
    rect(8, 4, w - 16, 46, { ...kontur(), rx: 2, fill: C.holz }),
    // Die Kleiderstange mit Bügeln: das Planzeichen, an dem jeder einen Schrank erkennt.
    line(16, 20, w - 16, 20, { stroke: C.metallTief, "stroke-width": 1.8, "stroke-linecap": "round" }),
  ];
  for (let x = 22; x <= w - 22; x += 7) teile.push(line(x, 10, x, 32, feder({ stroke: C.holzTief, "stroke-width": 1.6 })));
  teile.push(rect(8, 36, 56, 14, { ...kontur({ "stroke-width": 1.6 }), rx: 1.5, fill: C.holzTief }));
  teile.push(rect(64, 36, 56, 14, { ...kontur({ "stroke-width": 1.6 }), rx: 1.5, fill: C.holzTief }));
  teile.push(circle(58, 43, 2.2, { fill: C.metall, stroke: C.tinte, "stroke-width": 0.8 }));
  teile.push(circle(70, 43, 2.2, { fill: C.metall, stroke: C.tinte, "stroke-width": 0.8 }));
  return svg("Schrank", w, ZELLE, teile.join(""));
}

function webstuhl() {
  const w = ZELLE * 2;
  const teile = [
    rect(10, 6, 7, 44, { ...kontur({ "stroke-width": 1.6 }), rx: 1.5, fill: C.holzTief }),
    rect(w - 17, 6, 7, 44, { ...kontur({ "stroke-width": 1.6 }), rx: 1.5, fill: C.holzTief }),
  ];
  for (let x = 22; x <= w - 22; x += 4) teile.push(line(x, 14, x, 40, { stroke: C.tinteHell, "stroke-width": 0.9 }));
  // Kettbaum hinten, Schaft quer, das gewebte Stück vorn am Brustbaum.
  teile.push(rect(12, 6, w - 24, 8, { ...kontur({ "stroke-width": 1.6 }), rx: 3, fill: C.holz }));
  teile.push(rect(14, 22, w - 28, 4, { ...kontur({ "stroke-width": 1.2 }), fill: C.holzTief }));
  teile.push(rect(22, 30, w - 44, 11, { fill: C.tuch, stroke: C.tinte, "stroke-width": 1 }));
  for (let y = 32.5; y < 41; y += 2.6) teile.push(line(22, y, w - 22, y, { stroke: C.pergament, "stroke-width": 0.7, "stroke-opacity": 0.7 }));
  teile.push(ellipse(84, 28, 10, 2.6, { ...kontur({ "stroke-width": 1.2 }), fill: C.holz }));
  teile.push(rect(12, 41, w - 24, 8, { ...kontur({ "stroke-width": 1.6 }), rx: 3, fill: C.holz }));
  teile.push(rect(38, 52, w - 76, 8, { ...kontur({ "stroke-width": 1.6 }), rx: 2, fill: C.holz }));
  return svg("Webstuhl", w, ZELLE, teile.join(""));
}

function trog() {
  return svg("Trog", ZELLE, ZELLE, [
    rect(10, 16, 44, 32, { ...kontur({ "stroke-width": 2.2 }), rx: 3, fill: C.stein }),
    rect(16, 22, 32, 20, { fill: C.wasser, stroke: C.wasserTief, "stroke-width": 1.4, rx: 2 }),
    path("M19 30 Q25 27 31 30 T43 30", feder({ stroke: C.pergament, "stroke-width": 1.2, "stroke-opacity": 0.8 })),
    path("M21 36 Q27 33 33 36 T45 36", feder({ stroke: C.wasserTief, "stroke-width": 1.1 })),
    line(14, 19, 50, 19, feder({ stroke: C.steinTief, "stroke-width": 1 })),
  ].join(""));
}

function nachttisch() {
  return svg("Nachttisch", ZELLE, ZELLE, [
    rect(15, 8, 34, 34, { ...kontur(), rx: 2, fill: C.holz }),
    line(15, 36, 49, 36, feder({ stroke: C.holzTief, "stroke-width": 1.4 })),
    circle(32, 39, 1.6, { fill: C.metallTief }),
    circle(32, 22, 8, { ...kontur({ "stroke-width": 1.4 }), fill: C.metall }),
    circle(32, 22, 4, { fill: C.pergament, stroke: C.tinte, "stroke-width": 1 }),
    ellipse(32, 21.4, 1.6, 2.6, { fill: C.flamme }),
  ].join(""));
}

function bank() {
  const w = ZELLE * 2;
  return svg("Bank", w, ZELLE, [
    rect(12, 20, 6, 24, { ...kontur({ "stroke-width": 1.4 }), fill: C.holzTief }),
    rect(w - 18, 20, 6, 24, { ...kontur({ "stroke-width": 1.4 }), fill: C.holzTief }),
    rect(8, 23, w - 16, 18, { ...kontur(), rx: 2, fill: C.holz }),
    line(12, 32, w - 12, 32, feder({ stroke: C.holzTief, "stroke-width": 1.4 })),
  ].join(""));
}

function werkzeugwand() {
  const w = ZELLE * 2;
  const teile = [rect(6, 5, w - 12, 38, { ...kontur({ "stroke-width": 1.8 }), fill: C.holzTief })];
  for (const x of [22, 46, 70, 94, 112]) teile.push(circle(x, 10, 1.8, { fill: C.tinte }));
  // Hammer, Zange, Vorschlaghammer, Zange, Hufeisen — an Haken, Kopf oder Maul nach oben.
  const hammer = (x, kopf) => [
    line(x, 12, x, 38, { stroke: C.holz, "stroke-width": 3, "stroke-linecap": "round" }),
    rect(x - kopf, 9, kopf * 2, 7, { ...kontur({ "stroke-width": 1.3 }), rx: 1, fill: C.metallTief }),
  ].join("");
  const zange = (x) => [
    path(`M${x - 5} 38 L${x + 1} 16 L${x - 1} 11`, kontur({ "stroke-width": 2.2, stroke: C.metallTief })),
    path(`M${x + 5} 38 L${x - 1} 16 L${x + 1} 11`, kontur({ "stroke-width": 2.2, stroke: C.metallTief })),
    circle(x, 20, 1.5, { fill: C.tinte }),
  ].join("");
  teile.push(hammer(22, 6), zange(46), hammer(70, 9), zange(94));
  teile.push(path("M106 16 Q106 30 112 30 Q118 30 118 16", kontur({ "stroke-width": 3, stroke: C.metallTief })));
  return svg("Werkzeugwand", w, ZELLE, teile.join(""));
}

function weinregal() {
  const w = ZELLE * 3;
  const teile = [rect(4, 5, w - 8, 46, { ...kontur(), rx: 2, fill: C.holzTief })];
  // Liegende Fässer, Boden nach vorn: Dauben, zwei Reifen, Spund.
  for (const x of [10, 42, 74]) {
    teile.push(rect(x, 9, 28, 38, { ...kontur({ "stroke-width": 1.6 }), rx: 9, fill: C.holz }));
    teile.push(line(x + 1, 17, x + 27, 17, { stroke: C.metallTief, "stroke-width": 1.8 }));
    teile.push(line(x + 1, 39, x + 27, 39, { stroke: C.metallTief, "stroke-width": 1.8 }));
    teile.push(line(x + 14, 10, x + 14, 46, feder({ stroke: C.holzTief })));
    teile.push(circle(x + 14, 28, 2.2, { fill: C.holzTief, stroke: C.tinte, "stroke-width": 0.8 }));
  }
  // Daneben die Flaschenfächer: Rautengitter, in jedem Fach ein Flaschenboden.
  teile.push(rect(108, 9, w - 116, 38, { fill: C.tinte, "fill-opacity": 0.55, stroke: C.tinte, "stroke-width": 1.4 }));
  for (let x = 112; x <= w - 14; x += 9) for (const y of [15, 24, 33, 42]) {
    teile.push(circle(x + 2.5, y, 3.1, { fill: C.gruenTief, stroke: C.tinte, "stroke-width": 0.8 }));
    teile.push(circle(x + 2.5, y, 1.2, { fill: C.pergament, "fill-opacity": 0.7 }));
  }
  return svg("Weinregal", w, ZELLE, teile.join(""));
}

function fenster() {
  const teile = [
    rect(2, 24, 9, 16, { ...kontur({ "stroke-width": 1.6 }), fill: C.stein }),
    rect(ZELLE - 11, 24, 9, 16, { ...kontur({ "stroke-width": 1.6 }), fill: C.stein }),
    rect(11, 27, ZELLE - 22, 10, { fill: C.wasser, "fill-opacity": 0.9, stroke: C.tinte, "stroke-width": 1.4 }),
  ];
  // Bleiverglasung: Rauten über die ganze Scheibe, von Hand an den Scheibenrand gekappt (das Paket
  // kennt keine clipPath), dann die Kontur noch einmal obenauf.
  const links = 11, rechts = ZELLE - 11, blei = { stroke: C.tinte, "stroke-width": 0.8, "stroke-opacity": 0.7 };
  for (let x = links - 10; x < rechts; x += 7) {
    const x0 = Math.max(x, links), x1 = Math.min(x + 10, rechts);
    if (x1 <= x0) continue;
    teile.push(line(x0, 27 + (x0 - x), x1, 27 + (x1 - x), blei));
    teile.push(line(x0, 37 - (x0 - x), x1, 37 - (x1 - x), blei));
  }
  teile.push(line(32, 27, 32, 37, { stroke: C.tinte, "stroke-width": 1.6 }));
  teile.push(rect(11, 27, ZELLE - 22, 10, kontur({ "stroke-width": 1.4 })));
  teile.push(line(14, 29.5, 26, 29.5, { stroke: C.pergament, "stroke-width": 1, "stroke-opacity": 0.8 }));
  return svg("Fenster", ZELLE, ZELLE, teile.join(""));
}

// ---------------------------------------------------------------------------------------------
// The catalogue. `einheiten` is the placement footprint in grid cells, not a drawing hint.
// ---------------------------------------------------------------------------------------------

/** @type {{name: string, art: string, einheiten: [number, number], kachelbar?: boolean, schlagworte: string[], zeichne: () => string}[]} */
const KATALOG = [
  { name: "boden_stein", art: "boden", einheiten: [1, 1], kachelbar: true, schlagworte: ["stein", "trocken", "halle"], zeichne: () => bodenStein("boden_stein", false) },
  { name: "boden_stein_rissig", art: "boden", einheiten: [1, 1], kachelbar: true, schlagworte: ["stein", "verfall", "krypta"], zeichne: () => bodenStein("boden_stein_rissig", true) },
  { name: "boden_holz", art: "boden", einheiten: [1, 1], kachelbar: true, schlagworte: ["holz", "wohnraum"], zeichne: () => bodenHolz("boden_holz") },
  { name: "boden_erde", art: "boden", einheiten: [1, 1], kachelbar: true, schlagworte: ["erde", "hoehle", "keller"], zeichne: () => bodenErde("boden_erde") },
  { name: "boden_fliese", art: "boden", einheiten: [1, 1], kachelbar: true, schlagworte: ["fliese", "tempel", "gehoben"], zeichne: () => bodenFliese("boden_fliese") },
  { name: "boden_wasser", art: "boden", einheiten: [1, 1], kachelbar: true, schlagworte: ["wasser", "flach", "zisterne"], zeichne: () => bodenWasser("boden_wasser") },

  { name: "saeule", art: "aufbau", einheiten: [1, 1], schlagworte: ["stein", "halle", "traeger"], zeichne: saeule },
  { name: "treppe_auf", art: "aufbau", einheiten: [1, 2], schlagworte: ["treppe", "aufwaerts", "ausgang"], zeichne: () => treppe("treppe_auf", "auf") },
  { name: "treppe_ab", art: "aufbau", einheiten: [1, 2], schlagworte: ["treppe", "abwaerts", "tiefe"], zeichne: () => treppe("treppe_ab", "ab") },
  { name: "podest", art: "aufbau", einheiten: [2, 2], schlagworte: ["stein", "thron", "tempel"], zeichne: podest },
  { name: "schutt", art: "aufbau", einheiten: [1, 1], schlagworte: ["verfall", "geroell", "hindernis"], zeichne: () => schutt("schutt") },
  { name: "grube", art: "aufbau", einheiten: [2, 2], schlagworte: ["falle", "tiefe", "gefahr"], zeichne: grube },

  { name: "tuer_holz", art: "tuer", einheiten: [1, 1], schlagworte: ["holz", "drehbar"], zeichne: tuerHolz },
  { name: "tuer_gitter", art: "tuer", einheiten: [1, 1], schlagworte: ["metall", "sichtbar", "kerker"], zeichne: tuerGitter },
  { name: "falltuer", art: "tuer", einheiten: [1, 1], schlagworte: ["boden", "verborgen"], zeichne: falltuer },

  { name: "tisch_lang", art: "moebel", einheiten: [2, 1], schlagworte: ["holz", "halle", "mahl"], zeichne: tischLang },
  { name: "tisch_rund", art: "moebel", einheiten: [1, 1], schlagworte: ["holz", "kammer"], zeichne: tischRund },
  { name: "stuhl", art: "moebel", einheiten: [1, 1], schlagworte: ["holz", "sitz"], zeichne: stuhl },
  { name: "bett", art: "moebel", einheiten: [1, 2], schlagworte: ["holz", "wohnraum", "rast"], zeichne: bett },
  { name: "regal", art: "moebel", einheiten: [2, 1], schlagworte: ["holz", "buecher", "lager"], zeichne: regal },
  { name: "werkbank", art: "moebel", einheiten: [2, 1], schlagworte: ["holz", "handwerk", "schmiede"], zeichne: werkbank },
  { name: "altar", art: "moebel", einheiten: [2, 1], schlagworte: ["stein", "tempel", "kult"], zeichne: altar },
  { name: "sarkophag", art: "moebel", einheiten: [1, 2], schlagworte: ["stein", "krypta", "grab"], zeichne: sarkophag },
  { name: "amboss", art: "moebel", einheiten: [1, 1], schlagworte: ["metall", "schmiede", "handwerk"], zeichne: amboss },

  { name: "truhe", art: "gefaess", einheiten: [1, 1], schlagworte: ["holz", "schatz", "behaelter"], zeichne: truhe },
  { name: "fass", art: "gefaess", einheiten: [1, 1], schlagworte: ["holz", "lager", "behaelter"], zeichne: fass },
  { name: "kiste", art: "gefaess", einheiten: [1, 1], schlagworte: ["holz", "lager", "behaelter"], zeichne: kiste },
  { name: "krug", art: "gefaess", einheiten: [1, 1], schlagworte: ["ton", "vorrat", "behaelter"], zeichne: krug },

  { name: "feuerschale", art: "licht", einheiten: [1, 1], schlagworte: ["feuer", "warm", "halle"], zeichne: feuerschale },
  { name: "kerzenstaender", art: "licht", einheiten: [1, 1], schlagworte: ["kerze", "schwach", "kammer"], zeichne: kerzenstaender },

  { name: "boden_fels", art: "boden", einheiten: [1, 1], kachelbar: true, schlagworte: ["fels", "hoehle", "tief"], zeichne: () => bodenFels("boden_fels") },
  { name: "stalagmit", art: "aufbau", einheiten: [1, 1], schlagworte: ["fels", "hoehle", "hindernis"], zeichne: () => stalagmit("stalagmit") },
  { name: "tropfsteinsaeule", art: "aufbau", einheiten: [1, 1], schlagworte: ["fels", "traeger", "hoehle"], zeichne: () => tropfsteinsaeule("tropfsteinsaeule") },
  { name: "felsblock", art: "aufbau", einheiten: [1, 1], schlagworte: ["fels", "geroell", "hindernis"], zeichne: () => felsblock("felsblock") },
  { name: "pilzgruppe", art: "aufbau", einheiten: [1, 1], schlagworte: ["pilz", "feucht", "hoehle"], zeichne: () => pilzgruppe("pilzgruppe") },
  { name: "wasserlache", art: "aufbau", einheiten: [1, 1], schlagworte: ["wasser", "feucht", "flach"], zeichne: () => wasserlache("wasserlache") },
  { name: "knochenhaufen", art: "aufbau", einheiten: [1, 1], schlagworte: ["knochen", "verfall", "hoehle"], zeichne: () => knochenhaufen("knochenhaufen") },
  { name: "spalte", art: "aufbau", einheiten: [1, 1], schlagworte: ["tiefe", "gefahr", "hoehle"], zeichne: () => spalte("spalte") },
  { name: "lagerfeuer", art: "licht", einheiten: [1, 1], schlagworte: ["feuer", "warm", "lager"], zeichne: () => lagerfeuer("lagerfeuer") },

  { name: "marke_eingang", art: "marke", einheiten: [1, 1], schlagworte: ["eingang", "hinweis"], zeichne: markeEingang },
  { name: "marke_geheim", art: "marke", einheiten: [1, 1], schlagworte: ["geheim", "hinweis", "leitung"], zeichne: markeGeheim },

  // -- 1.2.0 Gegenstände: was in einem Raum liegt, steht und gefunden wird --------------------
  { name: "flasche", art: "gefaess", einheiten: [1, 1], schlagworte: ["glas", "vorrat", "behaelter"], zeichne: flasche },
  { name: "phiole", art: "gefaess", einheiten: [1, 1], schlagworte: ["alchemie", "schatz", "behaelter"], zeichne: phiole },
  { name: "amphore", art: "gefaess", einheiten: [1, 1], schlagworte: ["ton", "vorrat", "behaelter"], zeichne: amphore },
  { name: "kessel", art: "gefaess", einheiten: [1, 1], schlagworte: ["metall", "handwerk", "behaelter"], zeichne: kessel },
  { name: "weinschlauch", art: "gefaess", einheiten: [1, 1], schlagworte: ["leder", "vorrat", "behaelter"], zeichne: weinschlauch },
  { name: "kelch", art: "gefaess", einheiten: [1, 1], schlagworte: ["metall", "kult", "schatz"], zeichne: kelch },
  { name: "waffenstaender", art: "moebel", einheiten: [1, 1], schlagworte: ["waffe", "handwerk", "wache"], zeichne: waffenstaender },
  { name: "ruestungsstaender", art: "moebel", einheiten: [1, 1], schlagworte: ["ruestung", "wache", "handwerk"], zeichne: ruestungsstaender },
  { name: "schildwand", art: "moebel", einheiten: [2, 1], schlagworte: ["schild", "wache", "handwerk"], zeichne: schildwand },
  { name: "waffenhaufen", art: "moebel", einheiten: [1, 1], schlagworte: ["waffe", "geroell", "lager"], zeichne: () => waffenhaufen("waffenhaufen") },
  { name: "schleifstein", art: "moebel", einheiten: [1, 1], schlagworte: ["handwerk", "stein", "waffe"], zeichne: schleifstein },
  { name: "muenzhaufen", art: "moebel", einheiten: [1, 1], schlagworte: ["schatz", "gold", "lager"], zeichne: () => muenzhaufen("muenzhaufen") },
  { name: "buecherstapel", art: "moebel", einheiten: [1, 1], schlagworte: ["buecher", "wissen", "kammer"], zeichne: () => buecherstapel("buecherstapel") },
  { name: "schriftrollen", art: "moebel", einheiten: [1, 1], schlagworte: ["buecher", "wissen", "kult"], zeichne: () => schriftrollen("schriftrollen") },

  // -- 1.2.0 Vielfalt: zweite Antworten auf einantwortige Fragen ------------------------------
  { name: "boden_ziegel", art: "boden", einheiten: [1, 1], kachelbar: true, schlagworte: ["ziegel", "halle", "gehoben"], zeichne: () => bodenZiegel("boden_ziegel") },
  { name: "boden_mosaik", art: "boden", einheiten: [1, 1], kachelbar: true, schlagworte: ["mosaik", "gehoben", "kult"], zeichne: () => bodenMosaik("boden_mosaik") },
  { name: "boden_dielen_alt", art: "boden", einheiten: [1, 1], kachelbar: true, schlagworte: ["holz", "wohnraum", "verfall"], zeichne: () => bodenDielenAlt("boden_dielen_alt") },
  { name: "boden_sand", art: "boden", einheiten: [1, 1], kachelbar: true, schlagworte: ["sand", "keller", "trocken"], zeichne: () => bodenSand("boden_sand") },
  { name: "tuer_stein", art: "tuer", einheiten: [1, 1], schlagworte: ["stein", "drehbar", "schwer"], zeichne: tuerStein },
  // Absichtlich NICHT "drehbar": `grundriss` wählt ein Türblatt für die ganze Karte, und ein
  // zweizelliges Blatt auf einer einzelligen Öffnung wäre eine falsch gezeichnete Tür. Von Hand
  // gesetzt ist sie richtig — der Erzeuger darf sie nur nicht ziehen.
  { name: "tuer_doppel", art: "tuer", einheiten: [2, 1], schlagworte: ["holz", "halle", "doppel"], zeichne: tuerDoppel },
  { name: "tuer_geheim", art: "tuer", einheiten: [1, 1], schlagworte: ["stein", "verborgen", "geheim"], zeichne: tuerGeheim },
  { name: "wendeltreppe", art: "aufbau", einheiten: [1, 1], schlagworte: ["treppe", "aufwaerts", "abwaerts"], zeichne: wendeltreppe },
  { name: "saeule_bruch", art: "aufbau", einheiten: [1, 1], schlagworte: ["stein", "traeger", "verfall"], zeichne: () => saeuleBruch("saeule_bruch") },
  { name: "brunnen", art: "aufbau", einheiten: [1, 1], schlagworte: ["wasser", "kammer", "tief"], zeichne: brunnen },
  { name: "statue", art: "aufbau", einheiten: [1, 1], schlagworte: ["stein", "thron", "kult"], zeichne: statue },
  { name: "kette_ring", art: "aufbau", einheiten: [1, 1], schlagworte: ["metall", "kerker", "gefahr"], zeichne: ketteRing },
  { name: "wandfackel", art: "licht", einheiten: [1, 1], schlagworte: ["feuer", "warm", "wache"], zeichne: wandfackel },
  { name: "laterne", art: "licht", einheiten: [1, 1], schlagworte: ["kerze", "schwach", "lager"], zeichne: laterne },
  { name: "kandelaber", art: "licht", einheiten: [1, 1], schlagworte: ["kerze", "gehoben", "kult"], zeichne: kandelaber },
  { name: "marke_falle", art: "marke", einheiten: [1, 1], schlagworte: ["falle", "gefahr", "hinweis"], zeichne: markeFalle },
  // "eingang" fehlt hier bewusst: die Eingangsmarke ist eine Aussage, keine Geschmacksfrage.
  // Vielfalt gehört auf Möbel und Böden, nicht auf ein Symbol, das etwas Bestimmtes behauptet.
  { name: "marke_ziel", art: "marke", einheiten: [1, 1], schlagworte: ["ziel", "hinweis", "leitung"], zeichne: markeZiel },
  { name: "marke_frage", art: "marke", einheiten: [1, 1], schlagworte: ["frage", "hinweis", "wissen"], zeichne: markeFrage },

  // -- 1.2.0 Wände: Handsatz, kein Erzeugnis. Der Generator liefert Wandgeometrie. ------------
  { name: "wand_stein", art: "wand", einheiten: [1, 1], schlagworte: ["stein", "mauer", "halle"], zeichne: () => wandStein("wand_stein") },
  { name: "wand_ziegel", art: "wand", einheiten: [1, 1], schlagworte: ["ziegel", "mauer", "gehoben"], zeichne: wandZiegel },
  { name: "wand_bruch", art: "wand", einheiten: [1, 1], schlagworte: ["stein", "mauer", "verfall"], zeichne: () => wandBruch("wand_bruch") },
  { name: "wand_holz", art: "wand", einheiten: [1, 1], schlagworte: ["holz", "mauer", "wohnraum"], zeichne: wandHolz },
  { name: "wand_fels", art: "wand", einheiten: [1, 1], schlagworte: ["fels", "mauer", "hoehle"], zeichne: () => wandFels("wand_fels") },

  // -- 1.2.0 Figuren: Marken für den Tisch, keine Porträts ------------------------------------
  { name: "figur_held", art: "figur", einheiten: [1, 1], schlagworte: ["held", "spieler", "klein"], zeichne: figurHeld },
  { name: "figur_wache", art: "figur", einheiten: [1, 1], schlagworte: ["wache", "mensch", "klein"], zeichne: figurWache },
  { name: "figur_untot", art: "figur", einheiten: [1, 1], schlagworte: ["untot", "verfall", "klein"], zeichne: figurUntot },
  { name: "figur_schwarm", art: "figur", einheiten: [1, 1], schlagworte: ["schwarm", "viele", "klein"], zeichne: () => figurSchwarm("figur_schwarm") },
  { name: "figur_bestie", art: "figur", einheiten: [2, 2], schlagworte: ["bestie", "tier", "gross"], zeichne: figurBestie },
  { name: "figur_riese", art: "figur", einheiten: [2, 2], schlagworte: ["riese", "gross", "bestie"], zeichne: figurRiese },

  // -- 1.3.0 Häuser mit Geschossen: Feuerstellen, Schank, Kirche, Kammer, Werkstatt, Fenster ----
  // Hinten angehängt, nie einsortiert: `find` über Schlagworte trifft weiter dasselbe erste Stück.
  { name: "kamin", art: "moebel", einheiten: [2, 1], schlagworte: ["kamin", "feuer", "wohnraum", "warm"], zeichne: kamin },
  { name: "herd", art: "moebel", einheiten: [2, 1], schlagworte: ["herd", "feuer", "kueche"], zeichne: herd },
  { name: "esse", art: "moebel", einheiten: [2, 2], schlagworte: ["esse", "feuer", "schmiede", "handwerk"], zeichne: () => esse("esse") },
  { name: "theke", art: "moebel", einheiten: [3, 1], schlagworte: ["theke", "schank", "mahl"], zeichne: theke },
  { name: "kirchbank", art: "moebel", einheiten: [2, 1], schlagworte: ["kirchbank", "sitz", "kult"], zeichne: () => kirchbank(2) },
  { name: "kirchbank_lang", art: "moebel", einheiten: [3, 1], schlagworte: ["kirchbank", "sitz", "kult", "lang"], zeichne: () => kirchbank(3) },
  { name: "teppich", art: "aufbau", einheiten: [3, 2], schlagworte: ["teppich", "wohnraum", "boden"], zeichne: teppich },
  { name: "teppich_klein", art: "aufbau", einheiten: [2, 2], schlagworte: ["teppich", "kammer", "boden"], zeichne: teppichKlein },
  { name: "laeufer", art: "aufbau", einheiten: [1, 3], schlagworte: ["laeufer", "teppich", "flur"], zeichne: laeufer },
  { name: "schrank", art: "moebel", einheiten: [2, 1], schlagworte: ["schrank", "kammer", "lager"], zeichne: schrank },
  { name: "webstuhl", art: "moebel", einheiten: [2, 1], schlagworte: ["webstuhl", "handwerk", "kammer"], zeichne: webstuhl },
  { name: "trog", art: "gefaess", einheiten: [1, 1], schlagworte: ["trog", "wasser", "schmiede"], zeichne: trog },
  { name: "nachttisch", art: "moebel", einheiten: [1, 1], schlagworte: ["nachttisch", "kammer"], zeichne: nachttisch },
  { name: "bank", art: "moebel", einheiten: [2, 1], schlagworte: ["bank", "sitz", "halle"], zeichne: bank },
  { name: "werkzeugwand", art: "moebel", einheiten: [2, 1], schlagworte: ["werkzeug", "handwerk", "schmiede"], zeichne: werkzeugwand },
  { name: "weinregal", art: "moebel", einheiten: [3, 1], schlagworte: ["weinregal", "vorrat", "keller"], zeichne: weinregal },
  { name: "fenster", art: "aufbau", einheiten: [1, 1], schlagworte: ["fenster", "wand"], zeichne: fenster },
];

// Lowercase by contract: `assetpaket.ts` rejects mixed-case paths so that a pack authored on
// Windows cannot break on a case-sensitive server.
const LIZENZ_DATEI = "lizenz.txt";

await erzeugePaket({
  paketId: PAKET_ID,
  version: PAKET_VERSION,
  titel: "Grundriss — schematische Tuschesymbole für taktische Karten: Bau, Natur, Ausrüstung, Wand und Figur",
  urheber: URHEBER,
  zelle: ZELLE,
  lizenzDatei: LIZENZ_DATEI,
  lizenzText: cc0Text(PAKET_ID, URHEBER, "tools/assets/erzeuge-grundrisspaket.mjs"),
  lizenz: { spdx: "CC0-1.0", inhaber: `${URHEBER} 2026`, herkunft: "eigen", quelle: null },
  katalog: KATALOG,
}, PAKET_DIR);
