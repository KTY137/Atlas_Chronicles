#!/usr/bin/env node
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

import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const PAKET_ID = "pk.grundriss";
const PAKET_VERSION = "1.1.0";
const PAKET_DIR = join(ROOT, "assets", "packs", PAKET_ID);
const ZELLE = 64; // authoring pixels per grid cell — mirrored into `paket.zellgroesse`
const URHEBER = "Chronicle";

// ---------------------------------------------------------------------------------------------
// Palette — one ink language, so a generated floorplan reads as one drawing
// ---------------------------------------------------------------------------------------------

const C = {
  tinte: "#2f2a22",
  tinteHell: "#7a6f5f",
  pergament: "#e9e0cb",
  pergamentTief: "#ded2b8",
  stein: "#d5cbb4",
  steinTief: "#c4b99f",
  holz: "#c39b6d",
  holzTief: "#a97f52",
  metall: "#9aa0a8",
  metallTief: "#7b828b",
  wasser: "#93b0bd",
  wasserTief: "#6f95a6",
  flamme: "#dd8a33",
  tuch: "#b26b5e",
  erde: "#cdbb9c",
  fels: "#b9b2a4",
  felsTief: "#9d968a",
  knochen: "#e3ddcc",
  pilz: "#a98fb0",
};

// ---------------------------------------------------------------------------------------------
// Deterministic noise. Seeded per asset name, never per run.
// ---------------------------------------------------------------------------------------------

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function zufall(name) {
  const digest = createHash("sha256").update(`pk.grundriss/${name}`, "utf8").digest();
  const rnd = mulberry32(digest.readUInt32BE(0));
  return {
    // Quantised on purpose: `toFixed` in the drawing helpers would still round, but rounding here
    // means the *geometry* is integral tenths, so no platform's float printer can diverge.
    zahl: (min, max) => Math.round((min + rnd() * (max - min)) * 10) / 10,
    ganz: (min, max) => min + Math.floor(rnd() * (max - min + 1)),
    waehle: (list) => list[Math.floor(rnd() * list.length)],
  };
}

// ---------------------------------------------------------------------------------------------
// SVG helpers. No script, no external reference, no raster — the asset gate enforces all three.
// ---------------------------------------------------------------------------------------------

const n = (value) => {
  const rounded = Math.round(value * 100) / 100;
  return Object.is(rounded, -0) ? "0" : String(rounded);
};
const attrs = (row) => Object.entries(row).filter(([, v]) => v !== undefined && v !== null).map(([k, v]) => ` ${k}="${typeof v === "number" ? n(v) : v}"`).join("");
const rect = (x, y, w, h, o = {}) => `<rect${attrs({ x, y, width: w, height: h, ...o })}/>`;
const circle = (cx, cy, r, o = {}) => `<circle${attrs({ cx, cy, r, ...o })}/>`;
const ellipse = (cx, cy, rx, ry, o = {}) => `<ellipse${attrs({ cx, cy, rx, ry, ...o })}/>`;
const line = (x1, y1, x2, y2, o = {}) => `<line${attrs({ x1, y1, x2, y2, ...o })}/>`;
const path = (d, o = {}) => `<path${attrs({ d, ...o })}/>`;
const poly = (points, o = {}) => `<polygon${attrs({ points: points.map(([x, y]) => `${n(x)},${n(y)}`).join(" "), ...o })}/>`;
const polyline = (points, o = {}) => `<polyline${attrs({ points: points.map(([x, y]) => `${n(x)},${n(y)}`).join(" "), fill: "none", ...o })}/>`;
const group = (o, ...kinder) => `<g${attrs(o)}>${kinder.join("")}</g>`;

const kontur = (extra = {}) => ({ fill: "none", stroke: C.tinte, "stroke-width": 2, "stroke-linejoin": "round", "stroke-linecap": "round", ...extra });
const feder = (extra = {}) => ({ fill: "none", stroke: C.tinteHell, "stroke-width": 1.2, "stroke-linecap": "round", ...extra });

function svg(titel, breite, hoehe, inhalt) {
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n(breite)} ${n(hoehe)}" width="${n(breite)}" height="${n(hoehe)}">`,
    `<title>${titel}</title>`,
    inhalt,
    `</svg>`,
    "",
  ].join("\n");
}

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

/** A rough, closed blob. Used for boulders, puddles and bone piles alike. */
function klumpen(r, cx, cy, radius, ecken, rauheit) {
  return Array.from({ length: ecken }, (_, k) => {
    const a = (k / ecken) * Math.PI * 2;
    const rr = radius * r.zahl(1 - rauheit, 1 + rauheit);
    return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr];
  });
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
];

// Lowercase by contract: `assetpaket.ts` rejects mixed-case paths so that a pack authored on
// Windows cannot break on a case-sensitive server.
const LIZENZ_DATEI = "lizenz.txt";
const LIZENZ_TEXT = `Chronicle — Assetpaket "${PAKET_ID}"

Copyright (c) 2026 ${URHEBER}

Zu diesem Werk gehoerende Grafiken wurden vollstaendig in diesem Repository erzeugt
(tools/assets/erzeuge-grundrisspaket.mjs). Es wurde kein fremdes Bild-, Textur-, Schrift-
oder Vorlagenmaterial verwendet, eingebettet, abgepaust oder abgeleitet.

Der Urheber gibt dieses Werk unter CC0 1.0 Universal (Public Domain Dedication) frei:
https://creativecommons.org/publicdomain/zero/1.0/

Soweit nach Gesetz moeglich, verzichtet der Urheber weltweit auf alle Urheber- und
verwandten Schutzrechte an diesem Werk. Das Werk darf ohne Genehmigung und ohne
Namensnennung kopiert, veraendert, verbreitet und auch kommerziell genutzt werden.

Diese Datei ist die Lizenzquelle des Pakets. Ihr SHA-256 steht als "textSha256" im
Manifest paket.json; die Pruefung erfolgt in tools/gate-assets.mjs.
`;

// ---------------------------------------------------------------------------------------------

const sha256 = (text) => createHash("sha256").update(text, "utf8").digest("hex");
const bytes = (text) => Buffer.byteLength(text, "utf8");

/** viewBox is authored, never parsed back out of the string by a consumer. */
function abmessung(eintrag) {
  return [eintrag.einheiten[0] * ZELLE, eintrag.einheiten[1] * ZELLE];
}

function baue() {
  const dateien = new Map();
  dateien.set(LIZENZ_DATEI, LIZENZ_TEXT);
  const assets = [];
  for (const eintrag of KATALOG) {
    const inhalt = eintrag.zeichne();
    const datei = `${eintrag.art}/${eintrag.name}.svg`;
    if (dateien.has(datei)) throw new Error(`doppelte Datei ${datei}`);
    dateien.set(datei, inhalt);
    const [breite, hoehe] = abmessung(eintrag);
    assets.push({
      name: eintrag.name,
      art: eintrag.art,
      datei,
      mimeType: "image/svg+xml",
      sha256: sha256(inhalt),
      bytes: bytes(inhalt),
      groesse: [breite, hoehe],
      // Centre anchor for everything in this pack, declared rather than assumed: the field exists
      // precisely so a later pack may anchor a door leaf on its hinge.
      anker: [Math.round(breite / 2), Math.round(hoehe / 2)],
      einheiten: eintrag.einheiten,
      kachelbar: eintrag.kachelbar === true,
      schlagworte: eintrag.schlagworte,
      lizenz: null,
    });
  }
  const paket = {
    schemaVersion: 1,
    kind: "asset-pack",
    id: PAKET_ID,
    titel: "Grundriss — schematische Tuschesymbole für taktische Karten, gebaute und natürliche",
    version: PAKET_VERSION,
    urheber: URHEBER,
    zellgroesse: ZELLE,
    lizenz: {
      spdx: "CC0-1.0",
      inhaber: `${URHEBER} 2026`,
      herkunft: "eigen",
      quelle: null,
      datei: LIZENZ_DATEI,
      textSha256: sha256(LIZENZ_TEXT),
    },
    assets,
  };
  const sortiere = (value) =>
    Array.isArray(value) ? value.map(sortiere)
      : value && typeof value === "object" ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([k, v]) => [k, sortiere(v)]))
        : value;
  dateien.set("paket.json", `${JSON.stringify(sortiere(paket), null, 2)}\n`);
  return dateien;
}

async function vorhandeneDateien(dir) {
  const gefunden = [];
  const walk = async (aktuell) => {
    let eintraege;
    try { eintraege = await readdir(aktuell, { withFileTypes: true }); } catch { return; }
    for (const eintrag of eintraege) {
      const p = join(aktuell, eintrag.name);
      if (eintrag.isDirectory()) await walk(p);
      else gefunden.push(relative(dir, p).split(sep).join("/"));
    }
  };
  await walk(dir);
  return gefunden.sort();
}

async function main() {
  const pruefe = process.argv.includes("--pruefe");
  const dateien = baue();
  const vorhanden = await vorhandeneDateien(PAKET_DIR);
  const abweichungen = [];

  for (const [pfad, inhalt] of dateien) {
    const ziel = join(PAKET_DIR, pfad);
    let alt = null;
    try { alt = await readFile(ziel, "utf8"); } catch { /* neu */ }
    if (alt === inhalt) continue;
    abweichungen.push(alt === null ? `fehlt: ${pfad}` : `abweichend: ${pfad}`);
    if (!pruefe) { await mkdir(dirname(ziel), { recursive: true }); await writeFile(ziel, inhalt, "utf8"); }
  }
  for (const pfad of vorhanden) {
    if (dateien.has(pfad)) continue;
    abweichungen.push(`verwaist: ${pfad}`);
    if (!pruefe) await rm(join(PAKET_DIR, pfad), { force: true });
  }

  if (pruefe) {
    if (abweichungen.length) {
      console.error(`assets:erzeugen --pruefe ROT — ${abweichungen.length} Abweichung(en):`);
      for (const zeile of abweichungen) console.error(`  ${zeile}`);
      process.exit(1);
    }
    console.log(`assets:erzeugen --pruefe GRÜN — ${dateien.size} Dateien identisch reproduziert`);
    return;
  }
  console.log(`assets:erzeugen — ${KATALOG.length} Assets, ${dateien.size} Dateien in assets/packs/${PAKET_ID}`);
  for (const zeile of abweichungen) console.log(`  ${zeile}`);
  if (!abweichungen.length) console.log("  (unverändert)");
}

await main();
