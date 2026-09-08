// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
// Shared material strokes, never a repeated whole-object template.
import { svg, rect, circle, ellipse, line, path, poly, group, zufallFabrik, n } from "./tusche.mjs";
export { rect, circle, ellipse, line, path, poly, group, n } from "./tusche.mjs";
const ZELLE = 64;
const zufall = zufallFabrik("pk.genres");
export const C = { ink: "#263b43", edge: "#4e6267", steel: "#91a6ad", pale: "#d5dfdb", white: "#e9ede3", dark: "#3a4e55", teal: "#55a6a5", cyan: "#72dbe0", amber: "#dfac58", copper: "#b98766", wood: "#ba946c", green: "#879d79", fabric: "#718c96", red: "#b8614f", black: "#1c3039", glass: "#9ec9cc" };

/** Center anchors and whole-cell footprints are supplied by the existing package builder.
 * Margins include all contact shadows; no object quietly paints into its neighbour's cell. */
function drawing(name, title, units, draw, tiled = false) {
  const w = units[0] * ZELLE, h = units[1] * ZELLE, id = `genre-${name}`;
  const gradient = (key, light, middle, dark) => `<linearGradient id="${id}-${key}" x1="0" y1="0" x2=".75" y2="1"><stop stop-color="${light}"/><stop offset=".5" stop-color="${middle}"/><stop offset="1" stop-color="${dark}"/></linearGradient>`;
  const defs = `<defs>${gradient("metal", "#c7d4d4", "#8da4ab", "#647e89")}${gradient("ceramic", "#f2f1e5", "#d7e0db", "#a4b7b4")}${gradient("wood", "#d1af80", "#b68d60", "#8d6848")}${gradient("fabric", "#a4b6b6", "#728e99", "#4e6b79")}${gradient("copper", "#d7b08b", "#af7b57", "#815640")}${gradient("glass", "#b7e1df", "#6aa7b5", "#3f737f")}<filter id="${id}-shadow" x="-10%" y="-10%" width="120%" height="125%"><feDropShadow dx="0" dy="1.6" stdDeviation="1.2" flood-color="#13262c" flood-opacity=".32"/></filter><clipPath id="${id}-bounds">${rect(0, 0, w, h)}</clipPath></defs>`;
  const p = Object.fromEntries(["metal", "ceramic", "wood", "fabric", "copper", "glass"].map(key => [key, `url(#${id}-${key})`]));
  return svg(title, w, h, defs + group({ "clip-path": `url(#${id}-bounds)` }, group(tiled ? {} : { filter: `url(#${id}-shadow)` }, draw({ w, h, p, r: zufall(name) }))));
}
export const R = (x, y, w, h, fill = C.steel, radius = 3, extra = {}) => rect(x, y, w, h, { rx: radius, fill, stroke: C.ink, "stroke-width": 1.15, ...extra });
export const F = (x, y, w, h, fill, radius = 0, extra = {}) => rect(x, y, w, h, { rx: radius, fill, ...extra });
export const L = (x, y, x2, y2, color = C.edge, width = 1, extra = {}) => line(x, y, x2, y2, { stroke: color, "stroke-width": width, "stroke-linecap": "round", ...extra });
export const O = (x, y, radius, fill, extra = {}) => circle(x, y, radius, { fill, stroke: C.ink, "stroke-width": 1, ...extra });
export const P = (d, fill = "none", stroke = C.ink, width = 1.2, extra = {}) => path(d, { fill, stroke, "stroke-width": width, "stroke-linejoin": "round", "stroke-linecap": "round", ...extra });
export const slab = (x, y, w, h, fill, radius = 3) => R(x, y, w, h, fill, radius) + L(x + 3, y + 2, x + w - 3, y + 2, "#fff", .9, { opacity: .55 });
export const cross = (x, y, size = 12, color = C.teal) => F(x - size / 6, y - size / 2, size / 3, size, color, 1) + F(x - size / 2, y - size / 6, size, size / 3, color, 1);
export const bolts = (x, y, w, h) => [[x, y], [x + w, y], [x, y + h], [x + w, y + h]].map(([cx, cy]) => O(cx, cy, 1.3, C.pale) + L(cx - .6, cy, cx + .6, cy, C.edge, .6)).join("");
export const ribs = (x, y, w, h, count = 6) => F(x, y, w, h, C.dark, 1) + Array.from({ length: count }, (_, i) => L(x + 2, y + (i + .5) * h / count, x + w - 2, y + (i + .5) * h / count, C.steel, 1.1)).join("");
export const screen = (x, y, w, h) => R(x, y, w, h, C.black, 2) + F(x + 2, y + 2, w - 4, h - 4, "#234b59", 1) + P(`M${x + 4} ${y + h * .65}h${n(w * .15)}l${n(w * .12)} ${n(-h * .28)}l${n(w * .12)} ${n(h * .4)}l${n(w * .14)} ${n(-h * .24)}h${n(w * .17)}`, "none", C.cyan, 1) + L(x + 4, y + 4, x + w * .55, y + 4, "#b0e9df", .6);
export const chair = (cx, cy, fill, angle = 0) => group({ transform: `rotate(${angle} ${cx} ${cy})` }, R(cx - 9, cy - 7, 18, 16, fill, 5), slab(cx - 11, cy - 11, 22, 6, fill, 3), R(cx - 12, cy - 3, 3, 11, C.dark, 1), R(cx + 9, cy - 3, 3, 11, C.dark, 1));
export const plant = (cx, cy, radius = 12) => O(cx, cy, radius * .7, C.copper) + Array.from({ length: 7 }, (_, i) => ellipse(cx, cy - radius * .42, radius * .28, radius * .65, { fill: i % 2 ? "#718f63" : "#a0b186", stroke: "#435e49", "stroke-width": .7, transform: `rotate(${i * 360 / 7} ${cx} ${cy})` })).join("") + O(cx, cy, 2.5, "#c9d2a8");
export const hazard = (x, y, w, h) => F(x, y, w, h, C.amber, 1) + Array.from({ length: Math.floor(w / 9) }, (_, i) => poly([[x + i * 9 + 2, y + h], [x + i * 9 + 6, y], [x + i * 9 + 9, y], [x + i * 9 + 5, y + h]], { fill: C.dark })).join("");
export const arrow = (x, y, length, color = C.white) => P(`M${x} ${y + length}V${y}m-4 5l4 -5l4 5`, "none", color, 2);
export const keys = (x, y, cols = 7, rows = 3) => R(x, y, cols * 4 + 3, rows * 4 + 2, C.pale, 1) + Array.from({ length: rows * cols }, (_, i) => F(x + 2 + i % cols * 4, y + 2 + Math.floor(i / cols) * 4, 2.5, 2, C.edge, .4)).join("");
export const books = (x, y, count = 7, vertical = false) => Array.from({ length: count }, (_, i) => {
  const colors = [C.teal, C.amber, C.red, C.pale, C.fabric];
  return vertical ? R(x, y + i * 6, 16 + i % 3 * 2, 5, colors[i % colors.length], .5) : R(x + i * 6, y, 5, 16 + i % 3 * 2, colors[i % colors.length], .5);
}).join("");
export const bed = (x, y, w, h, p) => slab(x, y, w, h, p.wood, 3) + R(x + 3, y + 4, w - 6, h - 8, p.ceramic, 5) + R(x + 6, y + 8, w - 12, 15, C.white, 4) + R(x + 4, y + 29, w - 8, h - 36, p.fabric, 4) + L(x + 5, y + 36, x + w - 5, y + 36, C.pale, 2) + P(`M${x + 10} ${y + 42}q5 7 0 14m${w - 22} 7q-5 8 0 13`, "none", "#536f7c", .8);

export const GENRES = ["fantasy", "gothic", "antike", "wuxia", "piraten", "western", "steampunk", "noir", "cyberpunk", "weltraum", "postapokalypse", "unterwasser"];
export const GENRE_ERA = { fantasy: "fantasy", gothic: "fantasy", antike: "fantasy", wuxia: "fantasy", piraten: "fantasy", western: "fantasy", steampunk: "fantasy", noir: "gegenwart", cyberpunk: "scifi", weltraum: "scifi", postapokalypse: "gegenwart", unterwasser: "scifi" };
/** Each caller supplies its own full composition; the genre is an exact filterable tag. */
export function asset(genre, name, title, art, units, tags, draw, tiled = false) {
  if (!GENRES.includes(genre)) throw new Error(`Unknown asset genre: ${genre}`);
  const id = `${genre}_${name}`;
  return { name: id, art, einheiten: units, schlagworte: [...new Set([`genre_${genre}`, GENRE_ERA[genre], ...tags.split(" ").filter(Boolean)])], kachelbar: tiled,
    zeichne: () => drawing(id, title, units, draw, tiled) };
}
