// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
// Four historical/fantastic material languages, with 25 separately composed plans each.
import { asset, C, R, F, L, O, P, slab, group, poly, ellipse, n } from "./genre-tusche.mjs";

const repeat = (count, draw) => Array.from({ length: count }, (_, i) => draw(i)).join("");
const points = (cx, cy, radius, count, angle = 0) => Array.from({ length: count }, (_, i) => {
  const a = angle + i * Math.PI * 2 / count;
  return [cx + Math.cos(a) * radius, cy + Math.sin(a) * radius];
});
const polygon = (vertices, fill, width = 1) => poly(vertices, { fill, stroke: C.ink, "stroke-width": width, "stroke-linejoin": "round" });

export const heritage = [
  // FANTASY — living timber, handmade instruments, cloth and mineral light.
  asset("fantasy", "wurzelplatten", "Wurzelsteinboden mit überwachsenen Fugen", "boden", [1, 1], "stein erde trocken keller hof", () =>
    F(0, 0, 64, 64, "#a9af91") + P("M0 21H25L33 0M25 21L38 43L64 37M38 43L28 64M0 48L13 43L25 21", "none", "#697968", 2)
    + P("M0 24Q18 22 26 29T64 31M29 64Q44 45 31 29L34 0", "none", "#7c6649", 2.2)
    + [[18, 25], [35, 36], [33, 53], [48, 31]].map(([x, y]) => ellipse(x, y, 5, 2, { fill: "#627e59", transform: `rotate(-30 ${x} ${y})` })).join(""), true),
  asset("fantasy", "eichendielen", "Breite Eichendielen mit Schwalbenschwanzreparatur", "boden", [1, 1], "holz wohnraum halle trocken", () =>
    F(0, 0, 64, 64, "#bc9a6a") + repeat(4, i => L(0, i * 16, 64, i * 16, "#765b40", 1.4)
      + P(`M0 ${i * 16 + 6}Q18 ${i * 16 + 2} 32 ${i * 16 + 7}T64 ${i * 16 + 6}`, "none", "#987849", .8))
    + L(21, 0, 21, 16) + L(45, 16, 45, 32) + L(9, 32, 9, 48) + L(37, 48, 37, 64)
    + polygon([[28, 28], [33, 30], [38, 28], [38, 36], [33, 34], [28, 36]], "#755b45", .7), true),
  asset("fantasy", "runenintarsie", "Steinintarsie mit achtstrahliger Kristallrose", "boden", [1, 1], "stein gehoben halle kult trocken", () =>
    F(0, 0, 64, 64, "#d2ccb1") + polygon(points(32, 32, 31, 8, Math.PI / 8), "#738d85")
    + repeat(8, i => polygon([points(32, 32, 27, 8, Math.PI / 8)[i], points(32, 32, 11, 8, Math.PI / 4)[i], [32, 32]], i % 2 ? "#bba076" : "#c8d9be", .6))
    + O(32, 32, 7, "#689d98") + [[4, 4], [60, 4], [4, 60], [60, 60]].map(([x, y]) => O(x, y, 2, "#a3875c")).join(""), true),
  asset("fantasy", "astwerkwand", "Geflochtene Astwerkwand mit zwei lebenden Stützen", "wand", [2, 1], "holz tragend natur", ({ p }) =>
    P("M7 22Q29 15 55 24T121 20L121 39Q94 47 68 37T7 43Z", p.wood)
    + repeat(9, i => P(`M${12 + i * 12} 24l8 14m-6 -14l-6 14`, "none", "#655e43", 1.3))
    + [9, 119].map(x => O(x, 32, 8, p.wood) + O(x, 32, 4, "none", { stroke: "#735638" })).join("")),
  asset("fantasy", "rundbogentuer", "Runde Holztür mit schmiedeeisernem Scharnier", "tuer", [1, 1], "drehbar holz eingang wohnraum", ({ p }) =>
    P("M6 50V27A26 26 0 0 1 58 27V50L51 50V27A19 19 0 0 0 13 27V50Z", p.ceramic)
    + P("M14 48L20 13Q30 11 37 18L27 52Z", p.wood) + L(23, 18, 17, 47, "#785939", 1)
    + L(17, 27, 33, 30, C.dark, 3) + O(27, 40, 2, C.amber) + P("M27 52Q49 47 50 28", "none", C.teal, 1, { "stroke-dasharray": "3 3" })),
  asset("fantasy", "kristallleuchte", "Dreikristallleuchte in einer Messingkrone", "licht", [1, 1], "kalt warm kristall kult", ({ p }) =>
    O(32, 32, 22, p.copper) + O(32, 32, 17, C.dark)
    + [[26, 20, 0], [42, 35, 120], [22, 42, 240]].map(([x, y, a]) => group({ transform: `rotate(${a} ${x} ${y})` }, P(`M${x} ${y - 11}l7 9l-4 16l-8 -1l-3 -15Z`, "#a2e6d6"), L(x, y - 9, x + 1, y + 11, "#efffe3", 1.8))).join("")),
  asset("fantasy", "kraeuterkessel", "Kräuterkessel mit hölzernem Rührlöffel und Bündeln", "gefaess", [1, 1], "behaelter kult handwerk kraeuter", ({ p }) =>
    ellipse(32, 36, 25, 20, { fill: p.metal, stroke: C.ink, "stroke-width": 1.2 }) + O(32, 34, 17, "#617e67")
    + P("M7 28Q-1 34 7 40M57 28Q65 34 57 40", "none", C.dark, 3) + L(19, 47, 49, 11, "#b99567", 4)
    + [20, 28, 38].map((x, i) => ellipse(x, 30 + i * 5, 5, 2, { fill: "#b2c581", transform: `rotate(${i * 45} ${x} ${30 + i * 5})` })).join("") + O(40, 38, 2, "#c1dbc1")),
  asset("fantasy", "wendeltreppe", "Steinerne Wendeltreppe um eine Eichenstütze", "aufbau", [2, 2], "treppe aufwaerts abwaerts stein", ({ p }) =>
    O(64, 64, 53, p.ceramic) + O(64, 64, 47, "#9ba794")
    + repeat(13, i => { const a = .2 + i * .42; return L(64 + Math.cos(a) * 13, 64 + Math.sin(a) * 13, 64 + Math.cos(a) * 47, 64 + Math.sin(a) * 47, "#5e736e", 1.4); })
    + polygon([[67, 66], [112, 65], [101, 98], [77, 110]], "#65756c") + O(64, 64, 12, p.wood) + O(64, 64, 5, "#b58c5a")
    + P("M24 57Q28 25 58 21m-6 -4l6 4l-5 5", "none", C.white, 2)),
  asset("fantasy", "alchemiepult", "Geschwungenes Alchemiepult mit Retorte und Waage", "moebel", [2, 1], "handwerk wissen labor tisch", ({ p }) =>
    P("M6 11Q58 0 119 10L120 52Q91 63 65 49Q39 62 8 52Z", p.wood)
    + R(14, 15, 38, 34, "#dccbaa", 2) + O(32, 32, 11, p.glass) + P("M37 23L46 13H62V19H48L42 29", p.glass)
    + O(77, 34, 9, p.copper) + L(77, 15, 77, 40, C.dark, 2) + L(63, 18, 92, 18, C.dark, 2)
    + P("M63 18l-5 14h10ZM92 18l-5 14h10Z", "#c3aa72") + R(99, 18, 12, 26, "#698c78", 2)),
  asset("fantasy", "sternensphaere", "Armillarsphäre auf dreieckigem Steinfuß", "moebel", [2, 2], "wissen astronomie kult", ({ p }) =>
    polygon([[64, 7], [118, 101], [10, 101]], p.ceramic) + O(64, 65, 41, "none", { stroke: "#956f45", "stroke-width": 6 })
    + ellipse(64, 65, 21, 41, { fill: "none", stroke: "#d1b36f", "stroke-width": 4, transform: "rotate(36 64 65)" })
    + ellipse(64, 65, 40, 12, { fill: "none", stroke: "#a57c4e", "stroke-width": 4, transform: "rotate(-25 64 65)" })
    + repeat(12, i => { const a = i * Math.PI / 6; return O(64 + Math.cos(a) * 41, 65 + Math.sin(a) * 41, 2, C.white); })
    + O(64, 65, 9, p.glass) + L(41, 110, 87, 110, C.edge, 2)),
  asset("fantasy", "zauberwebstuhl", "Webstuhl mit sternengemustertem Tuch und Schiffchen", "moebel", [2, 2], "handwerk tuch werkbank", ({ p }) =>
    R(13, 8, 12, 112, p.wood, 2) + R(103, 8, 12, 112, p.wood, 2) + slab(9, 16, 110, 12, p.wood, 2)
    + F(27, 29, 74, 68, "#736f8d") + repeat(15, i => L(29 + i * 5, 25, 29 + i * 5, 105, "#d6c9a1", .65))
    + repeat(3, i => polygon([[42 + i * 21, 46], [50 + i * 21, 57], [42 + i * 21, 68], [34 + i * 21, 57]], "#a4c4bd", .6))
    + slab(9, 100, 110, 13, p.wood, 2) + P("M42 84Q68 71 86 82L61 90Z", p.copper) + L(29, 115, 99, 115, "#dac9a4", 2)),
  asset("fantasy", "pilzhockergruppe", "Pilztisch mit drei verschieden großen Sitzkappen", "moebel", [2, 2], "sitz mahl rast natur", ({ p }) =>
    P("M52 37Q22 44 27 70Q32 91 69 89Q94 88 98 62Q95 35 70 35Z", "#b4806c")
    + P("M35 57Q57 44 89 59", "none", "#d7b6a0", 3) + O(48, 67, 4, "#e0ceb1") + O(76, 53, 6, "#d9c6a5")
    + [[23, 25, 16], [104, 31, 14], [68, 108, 13]].map(([x, y, rad]) => O(x, y, rad, p.wood) + O(x - 3, y - 4, 3, "#efdfbd") + O(x + 5, y + 4, 2, "#dfc79b")).join("")),
  asset("fantasy", "kartografentisch", "Kartografentisch mit Küstenkarte, Kompass und Gewicht", "moebel", [2, 2], "wissen tisch karte", ({ p }) =>
    polygon([[14, 12], [115, 19], [110, 111], [9, 103]], p.wood) + P("M24 23L101 28L96 96L21 89Q28 67 24 23Z", "#e2d6b4")
    + P("M39 25l7 13l-9 9l17 9l-2 16l16 8l-1 14M46 38l19 4l11 -8M53 56l26 9l14 -10", "none", "#68908d", 2)
    + P("M30 78l4 -7l4 7m31 -27l4 -7l4 7m-12 38l4 -7l4 7", "none", "#858265", 1)
    + O(94, 107, 10, p.copper) + polygon([[94, 99], [98, 109], [90, 105]], C.dark) + O(18, 17, 5, p.metal) + L(109, 31, 105, 75, "#886340", 3)),
  asset("fantasy", "reiseharfe", "Geschwungene Reiseharfe auf einem Lederpolster", "moebel", [1, 2], "musik kult rast", ({ p }) =>
    ellipse(32, 108, 26, 12, { fill: "#86735e", stroke: C.ink }) + P("M12 111Q19 48 17 12Q24 1 36 12Q53 26 53 95L39 114Z", p.wood)
    + P("M25 24Q42 34 44 89L21 101Z", "#364e51") + repeat(7, i => L(25 + i * 2.5, 30 + i * 3, 21 + i * 3.2, 97 - i * 1.4, "#dfc894", .8))
    + P("M17 110Q28 94 49 94", "none", "#d2ac68", 3) + O(26, 14, 4, p.copper)),
  asset("fantasy", "buecherkarussell", "Sechseckiges Bücherkarussell mit radialen Fächern", "moebel", [2, 2], "buecher wissen lager regal", ({ p }) =>
    polygon(points(64, 64, 55, 6, Math.PI / 6), p.wood) + repeat(6, i => group({ transform: `rotate(${i * 60} 64 64)` },
      R(47, 20, 34, 26, "#5f544c", 1) + repeat(5, j => R(49 + j * 6, 22, 5, 21 - j % 2 * 4, ["#869d86", "#aa795f", "#c3af7b"][j % 3], .5))))
    + polygon(points(64, 64, 17, 6, Math.PI / 6), p.copper) + O(64, 64, 6, "#718678")),
  asset("fantasy", "reisebettrolle", "Ausgerolltes Reisebett mit Fellkragen und Gepäckriemen", "moebel", [1, 2], "rast bett kammer lager", ({ p }) =>
    P("M9 16Q30 7 55 18L51 110L45 118L34 113L26 120L16 114L8 106Z", "#8c7a64")
    + R(13, 29, 38, 76, p.fabric, 6) + P("M16 35Q30 25 48 37M16 44Q27 54 47 44", "none", "#c1c8b6", 2)
    + R(9, 13, 47, 19, "#c7b597", 8) + L(21, 14, 21, 31, "#6b5641", 4) + L(43, 14, 43, 31, "#6b5641", 4)
    + R(17, 21, 8, 6, "none", 1, { stroke: "#d8b568" }) + P("M18 96Q32 87 47 97", "none", "#526d74", 1.2)),
  asset("fantasy", "wabenregal", "Wabenregal mit Wachstafeln und Vorratsrollen", "moebel", [2, 1], "lager regal vorrat wissen", ({ p }) =>
    P("M7 14L24 4H101L120 15V50L103 59H24L7 49Z", p.wood)
    + repeat(8, i => { const x = 23 + i % 4 * 27, y = 19 + Math.floor(i / 4) * 27; return polygon(points(x, y, 13, 6), "#625d49")
      + (i % 2 ? R(x - 7, y - 5, 14, 10, "#c8af77", 1) + L(x - 4, y - 2, x + 4, y - 2, "#8c7650", .8) : O(x, y, 6, "#bd9c67") + O(x, y, 2, "#796749")); })),
  asset("fantasy", "runenschmiede", "Runenschmiede mit Hufeisenesse, Amboss und Blasebalg", "moebel", [2, 2], "handwerk werkbank metall schmiede", ({ p }) =>
    P("M8 54V18Q35 -1 61 18V54H48V24H21V54Z", p.ceramic) + F(23, 28, 23, 20, "#4b4640", 3)
    + repeat(5, i => O(26 + i % 3 * 8, 33 + Math.floor(i / 3) * 9, 4, i % 2 ? "#d9a154" : "#a96041"))
    + P("M76 22Q119 8 119 43L84 55L73 46Z", p.wood) + repeat(5, i => L(82 + i * 7, 22, 88 + i * 5, 47, "#765337", 1))
    + slab(15, 74, 94, 39, p.wood) + P("M29 83H70L94 91L73 97H68V105H40V97H29Z", p.metal) + P("M48 88l4 -5l4 5l-4 5Z", "none", C.cyan, 1.2)),
  asset("fantasy", "bannkreis", "Ritualkreis mit unterbrochenen Kreidebahnen und Fokussteinen", "marke", [2, 2], "kult magie markierung", () =>
    O(64, 64, 51, "none", { stroke: "#c8d5bd", "stroke-width": 2, "stroke-dasharray": "24 5" })
    + O(64, 64, 43, "none", { stroke: "#9bbbae", "stroke-width": 1.2 }) + polygon(points(64, 64, 41, 3, -.5), "none", 1.2)
    + P("M34 70Q64 32 94 70M39 84Q64 57 89 84", "none", "#a4ccbe", 1.4)
    + repeat(5, i => { const a = i * Math.PI * 2 / 5; return polygon(points(64 + Math.cos(a) * 51, 64 + Math.sin(a) * 51, 6, 5), "#829d96"); }) + O(64, 64, 6, "#d1e3c3")),
  asset("fantasy", "kristallgarten", "Kristallgarten in einem unregelmäßigen Steinsaum", "aufbau", [2, 2], "garten kristall hof aussen", ({ p }) =>
    P("M7 52L23 18L54 8L97 18L120 54L108 101L64 120L23 105Z", p.ceramic)
    + P("M18 56L30 28L58 19L90 29L108 58L96 91L63 107L32 94Z", "#637b71")
    + [[43, 51, 24], [75, 39, 19], [85, 77, 27], [42, 87, 15]].map(([x, y, r]) => polygon([[x, y - r], [x + 12, y - 3], [x + 7, y + r], [x - 10, y + 8], [x - 12, y - 6]], "#9bc9c1")
      + P(`M${x} ${y - r}v${r * 2}m0 ${-r}l12 -3`, "none", "#e0efd6", 1.5)).join("")),
  asset("fantasy", "marktsegel", "Dreieckiges Marktsegel über zwei Warenbänken", "aufbau", [3, 2], "markt handel strasse aussen", ({ p }) =>
    slab(19, 89, 62, 25, p.wood) + slab(112, 87, 58, 27, p.wood) + repeat(5, i => O(28 + i * 10, 102, 4, ["#b38354", "#728e69", "#b36d52"][i % 3]))
    + repeat(4, i => R(119 + i * 11, 94, 8, 14, "#b9ab84", 1))
    + polygon([[12, 95], [96, 11], [181, 96]], "#b7b599") + polygon([[12, 95], [96, 11], [94, 89]], "#899887")
    + L(96, 11, 94, 89, "#d8d2ad", 2) + [[12, 95], [96, 11], [181, 96]].map(([x, y]) => O(x, y, 5, p.wood)).join("")),
  asset("fantasy", "wasserrad", "Liegender Mühlenplan mit Wasserrad und Holzgerinne", "aufbau", [3, 2], "wasser muhle handwerk aussen", ({ p }) =>
    F(9, 12, 174, 29, "#658e91", 4) + R(7, 8, 178, 7, p.wood, 1) + R(7, 40, 178, 7, p.wood, 1)
    + O(87, 68, 47, p.wood) + O(87, 68, 35, "#576968") + repeat(12, i => group({ transform: `rotate(${i * 30} 87 68)` }, R(82, 21, 10, 28, "#be9b6c", 1), L(87, 35, 87, 65, "#d3b37f", 3)))
    + O(87, 68, 10, p.metal) + R(13, 60, 33, 17, p.ceramic, 2) + R(131, 60, 43, 17, p.ceramic, 2) + L(21, 68, 163, 68, "#6e5643", 5)),
  asset("fantasy", "greifenhorst", "Großer geflochtener Horst mit drei gesprenkelten Eiern", "aufbau", [2, 2], "natur nest tier aussen", ({ r }) =>
    ellipse(64, 64, 54, 47, { fill: "#8b7757", stroke: C.ink, "stroke-width": 2 })
    + ellipse(64, 64, 38, 32, { fill: "#554f3d" })
    + repeat(28, i => { const a = i * Math.PI / 14, x = 64 + Math.cos(a) * 47, y = 64 + Math.sin(a) * 40; return L(x - Math.sin(a) * 10, y + Math.cos(a) * 10, x + Math.sin(a) * 10, y - Math.cos(a) * 10, i % 2 ? "#b6a06f" : "#756549", 2); })
    + [[49, 58, -22], [78, 53, 18], [66, 80, 70]].map(([x, y, a]) => group({ transform: `rotate(${a} ${x} ${y})` }, ellipse(x, y, 11, 16, { fill: "#cbd1ad", stroke: C.ink }), repeat(5, () => O(x + r.zahl(-6, 6), y + r.zahl(-9, 9), 1, "#8b9676")))).join("")),
  asset("fantasy", "schwebebruecke", "Schwebende Steintrittbrücke zwischen zwei Ankerinseln", "aufbau", [3, 1], "bruecke weg aussen magie", ({ p }) =>
    polygon([[6, 13], [32, 5], [45, 32], [31, 58], [6, 49]], p.ceramic) + polygon([[151, 14], [177, 7], [187, 32], [178, 55], [150, 49]], p.ceramic)
    + repeat(5, i => polygon([[43 + i * 21, 18 + i % 2 * 3], [60 + i * 21, 16], [63 + i * 21, 44], [44 + i * 21, 46 - i % 2 * 4]], "#99b7ad"))
    + P("M23 22Q91 4 169 23M21 44Q100 59 173 43", "none", "#72b5b1", 1.6, { "stroke-dasharray": "3 4" }) + O(22, 32, 5, "#c4e0c9") + O(171, 32, 5, "#c4e0c9")),
  asset("fantasy", "gildenwegweiser", "Vierarmiger Gildenwegweiser mit Pflasterfuß", "marke", [1, 1], "eingang hinweis weg strasse", ({ p }) =>
    O(32, 32, 13, p.ceramic) + polygon([[7, 17], [36, 17], [44, 23], [36, 29], [7, 29]], p.wood)
    + polygon([[57, 35], [27, 35], [19, 41], [27, 47], [57, 47]], p.wood) + R(29, 7, 6, 49, p.copper, 2)
    + P("M14 20l3 5l3 -5m24 19h7m-4 -2v7", "none", "#eadcb3", 1.2) + O(32, 32, 4, "#76928a")),

  // GOTHIC — carved stone, iron tracery, tall instruments and garden geometry.
  asset("gothic", "schachmarmor", "Diagonal verlegter Schachmarmor mit feinen Adern", "boden", [1, 1], "stein marmor gehoben halle trocken", () =>
    F(0, 0, 64, 64, "#b8b9b2") + repeat(8, i => { const x = i % 4 * 32 - 32, y = Math.floor(i / 4) * 32 + 16; return polygon([[x, y], [x + 16, y - 16], [x + 32, y], [x + 16, y + 16]], "#59636a", .5); })
    + P("M0 8l10 6l5 -3l17 11l7 -3l25 13M0 40l12 7l9 -3l17 12l10 -2l16 10", "none", "#8c9692", .65), true),
  asset("gothic", "grabschiefer", "Versetzte schmale Schieferplatten einer Krypta", "boden", [1, 1], "stein keller trocken krypta", () =>
    F(0, 0, 64, 64, "#535c62") + repeat(4, i => L(0, i * 16, 64, i * 16, "#252f37", 2) + L(i % 2 * 32 + 16, i * 16, i % 2 * 32 + 16, i * 16 + 16, "#252f37", 2)
      + L(3, i * 16 + 3, 60, i * 16 + 3, "#788387", .7))
    + P("M9 13l6 -6l4 1M39 26l7 -5m-7 35l8 -4l3 2", "none", "#85908d", .8), true),
  asset("gothic", "rosettenfliesen", "Rosettenfliesen mit vierblättrigen Steineinlagen", "boden", [1, 1], "fliesen stein kult gehoben trocken", () =>
    F(0, 0, 64, 64, "#c8c0b1") + R(2, 2, 60, 60, "none", 0, { stroke: "#7d7372", "stroke-width": 1 })
    + repeat(4, i => group({ transform: `rotate(${i * 90} 32 32)` }, P("M32 31Q13 23 22 13Q30 7 32 21Q35 7 43 13Q51 24 32 31Z", "#7f727c", "#615967", .7)))
    + O(32, 32, 7, "#a8916f") + polygon([[5, 5], [13, 5], [5, 13]], "#747f7a") + polygon([[59, 59], [51, 59], [59, 51]], "#747f7a"), true),
  asset("gothic", "strebewand", "Steinwand mit drei abgestuften Strebepfeilern", "wand", [3, 1], "stein tragend kirche", ({ p }) =>
    R(5, 9, 182, 21, p.ceramic, 1) + repeat(7, i => L(10 + i * 25, 10, 10 + i * 25, 29, "#718080", 1))
    + [26, 96, 166].map(x => P(`M${x - 14} 28h28v12h-6v15h-16V40h-6Z`, "#899997") + L(x - 8, 33, x + 8, 33, "#c9d2c9", 1.5)).join("")),
  asset("gothic", "eisentor", "Geöffnetes schmiedeeisernes Doppeltor", "tuer", [2, 1], "drehbar metall eingang schwer", ({ p }) =>
    R(4, 11, 14, 41, p.ceramic, 2) + R(110, 11, 14, 41, p.ceramic, 2)
    + group({ transform: "rotate(-27 18 22)" }, R(18, 19, 43, 8, "#45515a", 1), repeat(6, i => P(`M${22 + i * 6} 19v-8m-2 3l2 -3l2 3`, "none", "#869593", 1.5)))
    + group({ transform: "rotate(27 110 22)" }, R(67, 19, 43, 8, "#45515a", 1), repeat(6, i => P(`M${72 + i * 6} 19v-8m-2 3l2 -3l2 3`, "none", "#869593", 1.5)))
    + P("M20 30Q37 53 60 51M108 30Q91 53 68 51", "none", "#a2ac9a", 1, { "stroke-dasharray": "3 3" })),
  asset("gothic", "kerzenkrone", "Achtarmige eiserne Kerzenkrone von oben", "licht", [2, 2], "kerze warm kult kirche wache", ({ p }) =>
    O(64, 64, 38, "none", { stroke: "#434c54", "stroke-width": 7 })
    + repeat(8, i => group({ transform: `rotate(${i * 45} 64 64)` }, P("M64 64Q55 49 64 17", "none", "#6e777a", 4), O(64, 16, 8, p.copper), O(64, 16, 4, "#e9dcb6"), ellipse(64, 14, 2, 4, { fill: "#edb356" })))
    + O(64, 64, 11, p.metal) + polygon(points(64, 64, 7, 4), "#80777e")),
  asset("gothic", "reliquienurne", "Achteckige Reliquienurne mit Metallspangen", "gefaess", [1, 1], "kult behaelter schatz", ({ p }) =>
    polygon(points(32, 32, 26, 8, Math.PI / 8), "#8e8e93") + polygon(points(32, 32, 20, 8, Math.PI / 8), p.ceramic)
    + repeat(4, i => group({ transform: `rotate(${i * 90} 32 32)` }, R(29, 7, 6, 16, p.copper, 1)))
    + P("M32 20Q21 29 24 39H40Q43 29 32 20Z", "#665d70") + O(32, 31, 4, "#baaaa3")),
  asset("gothic", "kryptatreppe", "Zweiläufige Kryptatreppe mit halbrundem Wendepodest", "aufbau", [2, 3], "treppe aufwaerts abwaerts krypta stein", ({ p }) =>
    P("M9 177V51A55 44 0 0 1 119 51V177H73V57H55V177Z", p.ceramic)
    + repeat(10, i => L(13, 64 + i * 11, 51, 64 + i * 11, "#6b797a", 1.4) + L(77, 64 + i * 11, 115, 64 + i * 11, "#6b797a", 1.4))
    + P("M31 145V63Q31 28 65 29Q98 29 98 62V145m-4 -6l4 6l4 -6", "none", "#f1ecda", 2)
    + R(57, 60, 14, 117, "#49575e", 1)),
  asset("gothic", "sarkophag", "Steinsarkophag mit eingelassenem figürlichem Deckel", "moebel", [1, 2], "kult grab stein", ({ p }) =>
    P("M14 7H50L58 22L53 118H11L6 22Z", "#7c878a") + P("M18 12H46L51 25L47 111H17L13 25Z", p.ceramic)
    + O(32, 32, 9, "#acb4ac") + P("M23 43Q32 38 41 43L45 83L36 104H27L19 83Z", "#a2aaa5")
    + P("M24 52l8 14l8 -14M32 68v29M20 18h24", "none", "#687977", 1.3) + R(9, 114, 46, 6, "#5a6b6d", 1)),
  asset("gothic", "pfeifenorgel", "Pfeifenorgel mit gestaffelten Pfeifenfeldern und Spieltisch", "moebel", [3, 2], "musik kult kirche", ({ p }) =>
    P("M8 9H184V81H119V115H73V81H8Z", "#705d56") + [19, 74, 130].map((x, k) =>
      repeat(7, i => R(x + i * 6, 15 + Math.abs(i - 3) * (k === 1 ? 5 : 3), 5, 58 - Math.abs(i - 3) * (k === 1 ? 5 : 3), p.metal, 2))).join("")
    + R(59, 79, 74, 18, p.wood, 2) + repeat(14, i => F(62 + i * 4.8, 82, 4, 11, "#ddd7bf", .2))
    + repeat(9, i => F(64 + i * 7, 82, 3, 6, "#333d43")) + R(78, 102, 36, 14, "#8b7380", 2)),
  asset("gothic", "beichtstuhl", "Dreiteiliger Beichtstuhl mit mittlerem Sitz und Seitenkniebänken", "moebel", [3, 2], "kult sitz kammer kirche", ({ p }) =>
    P("M8 13H184V116H131V105H61V116H8Z", p.wood)
    + R(17, 22, 37, 68, "#524f51", 1) + R(74, 22, 44, 69, "#4c4851", 1) + R(137, 22, 38, 68, "#524f51", 1)
    + R(60, 16, 9, 92, "#ab906a", 1) + R(123, 16, 9, 92, "#ab906a", 1)
    + [63, 128].map(x => repeat(5, i => L(x - 2, 31 + i * 10, x + 3, 37 + i * 10, "#342f34", 1))).join("")
    + R(78, 62, 36, 25, "#8a677b", 5) + R(18, 96, 37, 14, "#9f8190", 2) + R(138, 96, 37, 14, "#9f8190", 2)),
  asset("gothic", "lesepult", "Flügelpult mit offenem Buch und versetzten Kerzentellern", "moebel", [1, 1], "buecher wissen kult tisch", ({ p }) =>
    P("M8 19L29 10L32 14L35 10L56 19L53 50L32 44L11 50Z", p.wood)
    + P("M14 21Q23 16 31 21V42Q23 37 14 43ZM33 21Q41 16 50 21V43Q41 37 33 42Z", "#d8ceb3")
    + repeat(4, i => P(`M17 ${25 + i * 4}q6 -3 11 0m8 0q6 -3 11 0`, "none", "#7c7869", .6))
    + O(8, 10, 5, p.copper) + O(56, 54, 5, p.copper) + O(8, 10, 2, "#ebd9a8") + O(56, 54, 2, "#ebd9a8")),
  asset("gothic", "chorgestuehl", "Vier geschnitzte Chorstühle mit hochklappbaren Sitzen", "moebel", [3, 1], "sitz kult kirche", ({ p }) =>
    slab(7, 8, 178, 12, p.wood, 1) + repeat(4, i => R(12 + i * 44, 20, 36, 32, "#716375", 5)
      + P(`M${11 + i * 44} 19v35m38 -35v35`, "none", "#bd9b69", 4)
      + P(`M${19 + i * 44} 39q11 8 22 0`, "none", "#a992a0", 1.5) + O(11 + i * 44, 20, 4, p.copper))
    + L(10, 56, 181, 56, "#725844", 4)),
  asset("gothic", "katafalk", "Katafalk mit gefaltetem Bahrtuch und sechs Säulenknäufen", "moebel", [2, 3], "kult grab tuch", ({ p }) =>
    R(12, 10, 104, 172, p.wood, 4) + P("M23 16H105L112 171L93 179L74 173L56 181L34 173L18 180Z", "#60576e")
    + R(33, 29, 62, 130, "#807083", 7) + P("M40 45Q64 64 87 45M37 145Q64 128 91 148M64 39V151", "none", "#b8a2ad", 1.5)
    + [24, 91, 161].flatMap(y => [15, 113].map(x => O(x, y, 6, p.copper))).join("")),
  asset("gothic", "reliquienschrein", "Kreuzförmiger Reliquienschrein mit Emailfeldern", "moebel", [2, 2], "kult schatz vitrine", ({ p }) =>
    P("M45 9H83V42H116V82H83V117H45V82H12V42H45Z", p.copper)
    + P("M51 16H77V49H109V75H77V110H51V75H19V49H51Z", "#796d84")
    + R(46, 43, 37, 38, p.glass, 7) + P("M54 52l19 19m0 -19L54 71", "none", "#d9c395", 2)
    + [[64, 22], [102, 62], [64, 102], [26, 62]].map(([x, y]) => O(x, y, 5, "#bfc9ba")).join("")),
  asset("gothic", "seziertisch", "Steinerner Untersuchungstisch mit Ablauf und Werkzeugbrett", "moebel", [2, 2], "medizin handwerk tisch wissen", ({ p }) =>
    R(12, 12, 77, 105, p.ceramic, 8) + R(19, 19, 63, 91, "#99aaa7", 6)
    + P("M27 29v69h47M74 29V98", "none", "#cdd7ce", 2) + O(51, 99, 5, "#3a5057")
    + slab(98, 23, 20, 81, p.wood, 2) + P("M105 32v23m-3 -16h6M105 67l8 18m0 -18l-8 18", "none", "#d0d3c5", 2)
    + P("M88 97h14v18", "none", p.copper, 5)),
  asset("gothic", "spitzbogenschrank", "Spitzbogenschrank mit geöffnetem Deckel und Samtfächern", "moebel", [2, 1], "lager regal kammer", ({ p }) =>
    P("M7 16L29 6L49 16L64 5L80 16L100 6L121 16V56H7Z", p.wood)
    + [14, 51, 88].map(x => R(x, 22, 27, 26, "#64586a", 1) + P(`M${x + 4} 27h19m-19 6h19m-19 6h19`, "none", "#a194a3", .7)).join("")
    + L(8, 51, 120, 51, "#d2ae74", 2) + O(64, 13, 3, p.copper)),
  asset("gothic", "pendeluhr", "Lange Pendeluhr in Draufsicht mit offenem Wartungsflügel", "moebel", [1, 2], "uhr wissen kammer", ({ p }) =>
    P("M15 10Q32 -1 49 10L46 40V112H18V40Z", p.wood) + O(32, 23, 14, "#d8ccb0")
    + repeat(12, i => { const a = i * Math.PI / 6; return L(32 + Math.cos(a) * 10, 23 + Math.sin(a) * 10, 32 + Math.cos(a) * 12, 23 + Math.sin(a) * 12, "#64585b", 1); })
    + P("M32 14v9l7 4", "none", "#3b4850", 1.5) + R(23, 43, 18, 62, "#45494c", 2)
    + L(32, 47, 32, 90, "#bba269", 2) + O(32, 89, 7, p.copper) + P("M46 44L58 54V115L46 105Z", p.wood)),
  asset("gothic", "rosenhecke", "Formale Rosenhecke mit gebrochener Mittelöffnung", "aufbau", [3, 2], "garten gruen hof aussen", ({ p }) =>
    P("M9 13H183V115H112V97H164V32H28V97H78V115H9Z", p.ceramic)
    + P("M17 21H175V106H116M74 106H18V21", "none", "#556b5d", 15)
    + repeat(18, i => { const x = i < 9 ? 27 + i * 17 : i % 2 ? 18 : 175, y = i < 9 ? 22 : 36 + (i - 9) * 8; return O(x, y, 3.5, i % 3 ? "#a36d78" : "#c39c96"); })
    + F(35, 39, 121, 48, "#8a9180", 1) + L(96, 39, 96, 85, "#b9b6a1", 8)),
  asset("gothic", "zisternenbrunnen", "Vierpassbrunnen mit zentralem Wasserspeier", "aufbau", [2, 2], "wasser brunnen hof aussen", ({ p }) =>
    P("M38 12Q64 1 88 12L90 37Q120 39 117 66Q119 91 90 93L87 116Q63 127 39 114L37 92Q8 89 9 64Q6 39 36 36Z", p.ceramic)
    + P("M43 23Q64 14 79 23L80 44Q105 45 104 64Q106 80 80 82L78 105Q63 110 48 103L47 81Q23 80 22 64Q20 46 47 45Z", "#6e969b")
    + O(64, 64, 15, p.ceramic) + polygon([[59, 59], [71, 60], [86, 74], [69, 70]], "#8c9994")
    + P("M80 77q7 8 14 5M34 59q-7 10 0 20", "none", "#bad9cf", 1.5)),
  asset("gothic", "mausoleumsdach", "Mausoleumsdach mit Kreuzfirst und vier Eckfialen", "aufbau", [3, 3], "dach grab gebaeude aussen", ({ p }) =>
    R(14, 14, 164, 164, p.ceramic, 2) + polygon([[24, 25], [167, 25], [167, 167], [24, 167]], "#647480")
    + polygon([[24, 25], [96, 76], [167, 25]], "#8798a2") + polygon([[167, 25], [114, 96], [167, 167]], "#4e6572")
    + polygon([[24, 167], [96, 115], [167, 167]], "#566877") + P("M24 25L96 96L167 25M96 96L24 167M96 96L167 167", "none", "#b2bcb9", 2)
    + R(90, 65, 12, 64, p.copper, 1) + R(69, 90, 54, 12, p.copper, 1)
    + [[19, 19], [174, 19], [19, 174], [174, 174]].map(([x, y]) => polygon(points(x, y, 8, 4), p.ceramic)).join("")),
  asset("gothic", "grabreihen", "Zwei verschiedene Gräber mit Beeteinfassung und Steinplatten", "aufbau", [2, 3], "grab garten stein aussen", ({ p }) =>
    R(10, 11, 46, 170, p.ceramic, 4) + R(72, 24, 45, 153, p.ceramic, 2)
    + R(16, 41, 34, 132, "#737866", 2) + R(78, 52, 33, 117, "#89856e", 1)
    + P("M14 40V22Q33 1 52 22V40Z", "#a6aeaa") + P("M77 49V30H112V49Z", "#a4b4ad")
    + P("M25 24h16m-8 -7v18", "none", "#647478", 1.5) + O(94, 39, 6, "none", { stroke: "#687b7e" })
    + [69, 101, 133].map(y => R(20, y, 26, 22, "#919b90", 2)).join("") + P("M84 79q24 20 1 43q17 20 13 32", "none", "#576e57", 3)),
  asset("gothic", "eisenzaun", "Spitzenbesetzter Eisenzaun mit ornamentalen Knoten", "aufbau", [3, 1], "zaun grenze strasse aussen", ({ p }) =>
    [11, 96, 181].map(x => R(x - 6, 16, 12, 38, p.ceramic, 1)).join("")
    + L(13, 28, 179, 28, "#36454e", 4) + L(13, 43, 179, 43, "#36454e", 3)
    + repeat(14, i => { const x = 20 + i * 12; return L(x, 16, x, 51, "#4c5f68", 2) + polygon([[x, 9], [x + 4, 19], [x - 4, 19]], "#7f9294"); })
    + [54, 138].map(x => P(`M${x} 26q-14 10 0 18q14 -8 0 -18Z`, "none", "#b49770", 1.5)).join("")),
  asset("gothic", "glockenstuhl", "Offener Glockenstuhl mit zwei verschieden großen Glocken", "aufbau", [2, 2], "glocke kirche aussen dach", ({ p }) =>
    R(12, 9, 12, 110, p.wood, 2) + R(103, 9, 12, 110, p.wood, 2) + R(12, 13, 103, 10, p.wood, 1) + R(12, 105, 103, 10, p.wood, 1)
    + O(47, 58, 23, p.copper) + O(47, 58, 16, "#786249") + O(47, 58, 6, "#c3ac7b")
    + O(91, 80, 17, p.copper) + O(91, 80, 11, "#76634b") + O(91, 80, 4, "#c3ac7b")
    + L(17, 36, 111, 36, "#5a4c42", 5) + L(47, 35, 47, 58, C.dark, 3) + L(91, 36, 91, 80, C.dark, 3)),
  asset("gothic", "heraldikpodest", "Heraldikpodest mit eingelassenem Schild und zwei Stangen", "marke", [2, 1], "eingang kult schild hinweis", ({ p }) =>
    P("M8 14H120V54H8Z", p.ceramic) + P("M44 12H84V35Q78 48 64 56Q50 48 44 35Z", "#786277")
    + P("M64 16V46M49 29H79", "none", "#c4b189", 3) + L(23, 8, 23, 55, p.copper, 3) + L(105, 8, 105, 55, p.copper, 3)
    + polygon([[16, 10], [30, 10], [23, 3]], "#8c9f99") + polygon([[98, 10], [112, 10], [105, 3]], "#8c9f99")),

  // ANTIKE — warm masonry, bronze, woven surfaces and practical public works.
  asset("antike", "kiesmosaik", "Kiesmosaik mit geschwungenen Bändern und Einzelsteinen", "boden", [1, 1], "stein trocken halle hof", ({ r }) =>
    F(0, 0, 64, 64, "#cabf9e") + repeat(76, () => ellipse(r.zahl(1, 63), r.zahl(1, 63), r.zahl(1.2, 2.5), r.zahl(.9, 1.7), { fill: r.waehle(["#a99e81", "#e1d5b1", "#b6ad92"]), stroke: "#978c73", "stroke-width": .35 }))
    + P("M0 11Q16 25 32 11T64 11M0 43Q16 57 32 43T64 43", "none", "#775f4d", 3)
    + P("M0 15Q16 29 32 15T64 15M0 47Q16 61 32 47T64 47", "none", "#e0d2a9", 1), true),
  asset("antike", "flechtmarmor", "Marmormosaik mit rechtwinklig verflochtenen Steinbändern", "boden", [1, 1], "marmor stein gehoben halle trocken", () =>
    F(0, 0, 64, 64, "#d4c8a8") + repeat(4, i => { const x = i % 2 * 32, y = Math.floor(i / 2) * 32; return group({ transform: `rotate(${i % 2 * 90} ${x + 16} ${y + 16})` },
      R(x + 3, y + 3, 26, 9, "#8c8776", 0, { stroke: "#aca087", "stroke-width": .5 }), R(x + 3, y + 20, 26, 9, "#b38d74", 0, { stroke: "#7f735e", "stroke-width": .5 }),
      F(x + 12, y + 3, 8, 26, "#e5dab9"), L(x + 14, y + 4, x + 14, y + 27, "#b4a88a", .5)); }), true),
  asset("antike", "terracotta", "Achteckiger Terrakottaboden mit kleinen Rauteinlagen", "boden", [1, 1], "fliesen trocken wohnraum halle", () =>
    F(0, 0, 64, 64, "#8b725a") + repeat(4, i => { const x = i % 2 * 32, y = Math.floor(i / 2) * 32; return polygon([[x + 7, y + 1], [x + 25, y + 1], [x + 31, y + 7], [x + 31, y + 25], [x + 25, y + 31], [x + 7, y + 31], [x + 1, y + 25], [x + 1, y + 7]], i % 2 ? "#bb8867" : "#c89976", .6)
      + L(x + 8, y + 4, x + 23, y + 4, "#e0b48c", .8); }) + polygon([[27, 32], [32, 27], [37, 32], [32, 37]], "#d8c9a1", .4), true),
  asset("antike", "saeulenwand", "Säulengang mit drei runden Säulen auf quadratischen Plinthen", "wand", [3, 1], "stein saeule tragend halle", ({ p }) =>
    slab(6, 8, 180, 11, p.ceramic, 0) + [30, 96, 162].map(x => R(x - 21, 20, 42, 39, "#bdb697", 1)
      + O(x, 38, 17, "#e0d3b3") + O(x, 38, 11, "#c3b494") + repeat(12, i => { const a = i * Math.PI / 6; return L(x + Math.cos(a) * 12, 38 + Math.sin(a) * 12, x + Math.cos(a) * 16, 38 + Math.sin(a) * 16, "#9c927b", .8); })).join("")),
  asset("antike", "bronzetuer", "Bronzetür mit reliefierten Feldern und offenem Flügel", "tuer", [1, 1], "drehbar metall eingang", ({ p }) =>
    R(5, 8, 54, 10, p.ceramic, 0) + R(6, 17, 8, 41, "#b3aa8c", 0)
    + polygon([[15, 18], [47, 30], [47, 58], [15, 45]], p.copper)
    + P("M19 23l23 9v8l-23 -9ZM19 35l23 9v8l-23 -9Z", "#81907b", "#554e43", .8)
    + O(39, 42, 3, "none", { stroke: "#d2b46f", "stroke-width": 1.8 }) + P("M18 51Q51 51 54 21", "none", "#a89977", 1, { "stroke-dasharray": "2 3" })),
  asset("antike", "oellampentraeger", "Bronzener Öllampenträger mit drei geschnäbelten Lampen", "licht", [1, 1], "warm oel wache kult", ({ p }) =>
    O(32, 32, 8, p.copper) + repeat(3, i => group({ transform: `rotate(${i * 120} 32 32)` },
      L(32, 30, 32, 15, "#88704c", 4), P("M23 14Q23 5 32 6Q41 5 41 14L35 19L32 25L29 19Z", p.copper), O(32, 12, 4, "#565c48"),
      P("M30 22Q27 17 32 16Q37 19 33 23Z", "#e4af54", "#a16c3e", .5)))),
  asset("antike", "amphorenkorb", "Transportkorb mit zwei Amphoren und Ausgusskanne", "gefaess", [1, 1], "behaelter vorrat wasser lager", ({ p }) =>
    ellipse(32, 35, 26, 23, { fill: p.wood, stroke: C.ink }) + repeat(6, i => P(`M${10 + i * 8} 20Q${5 + i * 9} 36 ${12 + i * 7} 53`, "none", "#765d41", .8))
    + [[22, 29, 8], [43, 31, 9], [31, 46, 7]].map(([x, y, rad]) => O(x, y, rad, "#c1926d") + O(x, y, rad * .45, "#674d3a")
      + P(`M${x - rad} ${y - 3}q-6 3 0 7M${x + rad} ${y - 3}q6 3 0 7`, "none", "#a67550", 2)).join("")),
  asset("antike", "freitreppe", "Breite halbkreisförmige Freitreppe mit seitlichen Wangen", "aufbau", [2, 2], "treppe aufwaerts abwaerts stein aussen", ({ p }) =>
    P("M8 115V65A56 56 0 0 1 120 65V115Z", p.ceramic) + repeat(7, i => P(`M${12 + i * 6} 112V65A${52 - i * 6} ${52 - i * 6} 0 0 1 ${116 - i * 6} 65V112`, "none", "#968d76", 1.3))
    + R(9, 111, 110, 9, "#b8b097", 1) + P("M64 103V64m-4 6l4 -6l4 6", "none", "#fff3d3", 2)),
  asset("antike", "triclinium", "Dreiseitige Speiseliegen um einen achteckigen Serviertisch", "moebel", [2, 2], "mahl sitz rast gehoben", ({ p }) =>
    R(8, 8, 111, 29, p.wood, 2) + R(8, 38, 29, 82, p.wood, 2) + R(90, 38, 29, 82, p.wood, 2)
    + R(13, 13, 101, 18, "#b48875", 6) + R(13, 43, 18, 70, "#b48875", 6) + R(95, 43, 18, 70, "#b48875", 6)
    + [27, 63, 99].map(x => R(x, 13, 13, 18, "#d1b38c", 5)).join("") + polygon(points(64, 75, 23, 8, Math.PI / 8), "#dbcba8")
    + O(57, 73, 7, "#c19867") + O(74, 81, 5, "#829675") + O(67, 64, 4, "#876e52")),
  asset("antike", "schreibbank", "Schreibbank mit entrolltem Papyrus und Schilfrohren", "moebel", [2, 1], "wissen tisch schreiben", ({ p }) =>
    P("M8 14Q63 7 119 13L115 51Q62 60 10 52Z", p.wood) + R(20, 18, 72, 30, "#ddd0a4", 2)
    + R(18, 16, 6, 35, "#c7ae7d", 3) + R(88, 16, 6, 35, "#c7ae7d", 3)
    + repeat(5, i => L(29, 23 + i * 5, 76 - i % 2 * 9, 23 + i * 5, "#817254", .8)) + O(107, 27, 6, "#373d37")
    + L(98, 46, 113, 35, "#dac18c", 2) + L(94, 42, 109, 32, "#b9a274", 1.5)),
  asset("antike", "marktwaage", "Marktwaage mit zwei Schalen und drei Gewichtssteinen", "moebel", [1, 1], "handel waage wissen", ({ p }) =>
    R(21, 43, 22, 14, p.wood, 2) + L(32, 17, 32, 49, "#a5834e", 5) + L(10, 19, 53, 14, "#af9156", 3)
    + P("M11 20L4 38H22ZM52 16L42 35H61Z", "none", "#8a7855", 1.3)
    + P("M4 38Q13 48 22 38ZM42 35Q51 46 61 35Z", p.copper)
    + [10, 17, 53].map((x, i) => O(x, 54, 2.5 + i * .6, "#8b927e")).join("")),
  asset("antike", "muehlstein", "Großer Getreidemühlstein mit Hebel und Kornmulde", "moebel", [2, 2], "handwerk muhle mahl", ({ p }) =>
    O(64, 66, 49, "#a99f81") + O(64, 66, 40, p.ceramic) + repeat(10, i => group({ transform: `rotate(${i * 36} 64 66)` }, P("M70 29L70 57L84 43", "none", "#8e8c74", 1.2)))
    + O(64, 66, 13, "#665d49") + R(52, 54, 24, 24, p.wood, 2) + L(64, 66, 112, 14, "#9b764f", 7)
    + R(8, 12, 36, 23, p.wood, 4) + repeat(10, i => ellipse(14 + i % 5 * 6, 19 + Math.floor(i / 5) * 7, 2.5, 1.4, { fill: "#d5bd80" }))),
  asset("antike", "toepferscheibe", "Töpferscheibe mit unfertiger Schale und Tonstücken", "moebel", [1, 1], "handwerk keramik werkbank", ({ p }) =>
    polygon([[8, 52], [11, 22], [46, 11], [59, 49]], p.wood) + O(29, 29, 22, "#bdab88") + O(29, 29, 17, "#d8c6a3")
    + O(29, 29, 11, "#bb8560") + O(29, 29, 7, "#805c43") + P("M26 25Q31 22 34 27", "none", "#d1a27b", 1.5)
    + P("M42 47l9 -5l7 7l-11 8Z", "#a97150") + L(12, 57, 33, 57, "#776144", 4)),
  asset("antike", "gewichtswebrahmen", "Gewichtswebrahmen mit einzeln beschwerten Kettfäden", "moebel", [2, 2], "handwerk tuch werkbank", ({ p }) =>
    R(11, 8, 10, 105, p.wood, 1) + R(107, 8, 10, 105, p.wood, 1) + R(7, 10, 114, 13, p.wood, 3)
    + F(25, 24, 78, 51, "#c5b994", 0) + repeat(16, i => L(27 + i * 4.8, 25, 27 + i * 4.8, 75, i % 3 ? "#e2d5b4" : "#7f8c77", .8))
    + repeat(9, i => L(29 + i * 8.5, 75, 29 + i * 8.5, 101, "#9a8966", 1) + P(`M${25 + i * 8.5} 101h8l2 14h-12Z`, "#b18b69"))
    + L(25, 65, 103, 65, "#9d7157", 3) + R(38, 82, 50, 6, "#a28258", 2)),
  asset("antike", "kohleherd", "Niedriger Kohleherd mit zwei Bronzepfannen und Rost", "moebel", [2, 1], "mahl kueche herd handwerk", ({ p }) =>
    R(7, 9, 114, 47, "#b9a48a", 4) + R(14, 17, 99, 30, "#494d43", 2)
    + repeat(9, i => O(19 + i * 10, 36 - i % 2 * 9, 4, i % 3 ? "#a46d45" : "#d3a65d"))
    + O(33, 30, 15, p.copper) + O(33, 30, 11, "#858a62") + L(43, 20, 56, 10, "#8c7447", 4)
    + O(80, 32, 16, p.copper) + O(80, 32, 12, "#8d6950") + L(94, 36, 114, 41, "#8c7447", 4)
    + L(11, 52, 116, 52, "#d2c2a3", 1.5)),
  asset("antike", "spieltafel", "Spieltafel mit Linienfeldern, Steinen und Würfelbecher", "moebel", [2, 1], "spiel rast tisch sitz", ({ p }) =>
    R(8, 9, 112, 46, p.wood, 5) + R(16, 15, 73, 33, "#d7c699", 1)
    + repeat(4, i => L(23 + i * 19, 18, 23 + i * 19, 44, "#8d7b57", .8)) + L(19, 24, 86, 24, "#8d7b57", .8) + L(19, 38, 86, 38, "#8d7b57", .8)
    + [[23, 24], [42, 38], [61, 24], [80, 38], [42, 24]].map(([x, y], i) => O(x, y, 3.5, i % 2 ? "#494c41" : "#f0dfb8")).join("")
    + O(105, 24, 8, "#94724e") + R(99, 37, 9, 9, "#e6d2a6", 1) + O(103, 41, 1, "#6c624c")),
  asset("antike", "schriftrollenfaecher", "Fächerförmige Schriftrollenablage mit offenen Rollen", "moebel", [2, 1], "wissen buecher lager regal", ({ p }) =>
    P("M8 51Q6 6 64 6Q122 6 120 51Z", p.wood)
    + repeat(7, i => group({ transform: `rotate(${-36 + i * 12} 64 55)` }, R(60, 15, 8, 33, "#d8c798", 3), O(64, 18, 3, "#937f56"), L(62, 25, 62, 41, "#b4a072", .7)))
    + R(18, 49, 92, 10, "#a08257", 2) + R(37, 39, 52, 14, "#eee1bb", 2)
    + L(42, 43, 78, 43, "#8b7955", .8) + L(42, 47, 70, 47, "#8b7955", .8)),
  asset("antike", "badebecken", "Achteckiges Badebecken mit breiter Einstiegstreppe", "aufbau", [3, 3], "wasser bad medizin gehoben", ({ p }) =>
    polygon([[42, 9], [150, 9], [183, 42], [183, 150], [150, 183], [42, 183], [9, 150], [9, 42]], "#b5a788")
    + polygon([[48, 22], [144, 22], [170, 48], [170, 145], [145, 170], [48, 170], [22, 145], [22, 48]], "#d4c7a7")
    + polygon([[51, 35], [139, 35], [157, 53], [157, 137], [137, 157], [53, 157], [35, 137], [35, 53]], "#70a29e")
    + repeat(4, i => R(57 + i * 5, 35 + i * 11, 78 - i * 10, 11, ["#d0c4a7", "#b8bda4", "#a3b6a1", "#8eaaa0"][i], 0, { stroke: "#738f89", "stroke-width": .8 }))
    + P("M52 120q18 -10 34 0t34 0t22 -2M72 142q24 -8 47 0", "none", "#b8d3bb", 1.7)),
  asset("antike", "hypokaustum", "Freigelegtes Hypokaustum mit Ziegelpfeilern und Feuerkanal", "aufbau", [2, 2], "heizung keller ruine handwerk", ({ p }) =>
    R(8, 8, 111, 111, "#8f8168", 2) + P("M8 89H48V118H8Z", "#484e43")
    + repeat(12, i => { const x = 24 + i % 4 * 26, y = 25 + Math.floor(i / 4) * 27; return R(x - 8, y - 8, 16, 16, "#b68160", 1)
      + R(x - 6, y - 6, 12, 12, "#c89b77", 0) + L(x - 5, y, x + 5, y, "#926a4d", .7); })
    + P("M62 118V91H119V118Z", p.ceramic) + P("M73 96l9 7l-3 11m13 -18l12 12", "none", "#aaa183", 1.2)),
  asset("antike", "zisternenmund", "Zisternenöffnung mit zur Seite geschobenem Steinverschluss", "aufbau", [1, 1], "wasser brunnen vorrat aussen", ({ p }) =>
    O(28, 33, 24, "#b6aa8a") + O(28, 33, 17, "#394f51") + O(28, 33, 11, "#597d79")
    + repeat(8, i => { const a = i * Math.PI / 4; return L(28 + Math.cos(a) * 18, 33 + Math.sin(a) * 18, 28 + Math.cos(a) * 23, 33 + Math.sin(a) * 23, "#7f7a64", 1); })
    + ellipse(45, 24, 13, 20, { fill: p.ceramic, stroke: C.ink, transform: "rotate(22 45 24)" })
    + P("M40 18q7 -5 9 3v10", "none", "#8a764e", 3)),
  asset("antike", "saeulenrundbau", "Runder Säulenbau mit radial gegliedertem Kegeldach", "aufbau", [3, 3], "dach gebaeude kult aussen", ({ p }) =>
    O(96, 96, 85, "#c3b494") + repeat(12, i => { const a = i * Math.PI / 6; return O(96 + Math.cos(a) * 76, 96 + Math.sin(a) * 76, 7, p.ceramic); })
    + O(96, 96, 68, "#ae8068") + repeat(12, i => { const a = i * Math.PI / 6; return L(96, 96, 96 + Math.cos(a) * 66, 96 + Math.sin(a) * 66, "#765c4b", 1.5); })
    + O(96, 96, 52, "none", { stroke: "#c09778", "stroke-width": 1.2 }) + O(96, 96, 34, "none", { stroke: "#c09778", "stroke-width": 1.2 })
    + O(96, 96, 10, p.copper) + R(80, 173, 32, 9, "#dbceb0", 0)),
  asset("antike", "streitwagen", "Zweirädriger Streitwagen mit gebogenem Korb und langer Deichsel", "aufbau", [2, 3], "verkehr wagen aussen", ({ p }) =>
    L(64, 70, 64, 179, "#957047", 8) + P("M24 28Q64 2 103 28V81Q64 110 24 81Z", p.wood)
    + P("M31 31Q64 11 96 31V74Q64 94 31 74Z", "#8e936e") + P("M29 34Q63 17 99 34", "none", "#d0b06e", 4)
    + [14, 113].map(x => R(x - 7, 29, 14, 66, "#4c5349", 5) + L(x, 35, x, 88, "#ab8957", 3)).join("")
    + L(8, 67, 120, 67, "#755d42", 5) + P("M48 170h32m-23 -8v16m14 -16v16", "none", "#b59664", 3)),
  asset("antike", "lastkarren", "Vierrolliger Lastkarren mit Steinsäulen und Zugjoch", "aufbau", [2, 3], "verkehr wagen lager aussen", ({ p }) =>
    R(18, 15, 92, 104, p.wood, 3) + repeat(6, i => L(25 + i * 15, 19, 25 + i * 15, 115, "#7b5c40", 1))
    + [[13, 26], [108, 26], [13, 90], [108, 90]].map(([x, y]) => R(x, y, 9, 29, "#444e45", 3)).join("")
    + R(32, 25, 23, 74, p.ceramic, 9) + R(65, 37, 27, 69, "#c6c0a4", 10)
    + L(23, 50, 105, 50, "#a18753", 3) + L(23, 86, 105, 86, "#a18753", 3)
    + L(48, 116, 43, 173, "#b38b58", 5) + L(80, 116, 85, 173, "#b38b58", 5) + P("M31 173Q64 162 97 173", "none", "#957147", 7)),
  asset("antike", "sonnenuhr", "Halbkreisförmige Sonnenuhr auf einem gekanteten Sockel", "moebel", [1, 1], "wissen uhr hof aussen", ({ p }) =>
    polygon([[11, 11], [53, 11], [60, 52], [4, 52]], "#b0a587") + P("M10 45A22 27 0 0 1 54 45Z", p.ceramic)
    + repeat(9, i => { const a = Math.PI + i * Math.PI / 8; return L(32, 43, 32 + Math.cos(a) * 19, 43 + Math.sin(a) * 22, "#978767", .8); })
    + polygon([[29, 44], [34, 18], [38, 44]], "#877759") + L(9, 56, 55, 56, "#d5c8a8", 2)),
  asset("antike", "obststand", "Obststand mit geneigten Körben, Feigen und Getreidesack", "moebel", [3, 1], "markt mahl handel vorrat aussen", ({ p }) =>
    slab(7, 9, 178, 47, p.wood, 2) + repeat(3, i => R(14 + i * 46, 16, 40, 31, "#9f8359", 5)
      + repeat(12, j => O(21 + i * 46 + j % 4 * 8, 23 + Math.floor(j / 4) * 8, 3.4, ["#849169", "#9a7480", "#c5a168"][i])))
    + P("M157 17Q176 8 180 25L177 49Q160 58 151 44Z", "#cbbb91") + ellipse(165, 23, 9, 6, { fill: "#9c875e" })
    + repeat(7, i => ellipse(159 + i % 3 * 5, 20 + Math.floor(i / 3) * 3, 2, 1, { fill: "#ddc688" }))),

  // WUXIA — historic courtyards, tea, scholarship, garden paths and training spaces.
  asset("wuxia", "kieshof", "Hofpflaster mit fächerförmig gesetzten Kieseln", "boden", [1, 1], "stein erde trocken hof", () =>
    F(0, 0, 64, 64, "#afb19a") + repeat(5, row => repeat(9, col => {
      const a = Math.PI + col * Math.PI / 8, rad = 8 + row * 7;
      return ellipse(32 + Math.cos(a) * rad, 61 + Math.sin(a) * rad, 3.4, 1.8, { fill: row % 2 ? "#737e70" : "#d2d2b7", stroke: "#818977", "stroke-width": .5, transform: `rotate(${a * 180 / Math.PI + 90} ${n(32 + Math.cos(a) * rad)} ${n(61 + Math.sin(a) * rad)})` });
    })) + P("M0 13Q32 -8 64 13", "none", "#d5d6bb", 3), true),
  asset("wuxia", "bambusmatte", "Fein gebundene Bambusmatte mit gestaffelten Knoten", "boden", [1, 1], "holz trocken wohnraum halle", () =>
    F(0, 0, 64, 64, "#b3b082") + repeat(12, i => R(i * 5.5, 0, 5, 64, i % 2 ? "#c7bf8b" : "#b1ab79", 0, { stroke: "#88865f", "stroke-width": .6 })
      + L(i * 5.5 + .5, 15 + i % 3 * 15, i * 5.5 + 4.5, 15 + i % 3 * 15, "#7b8059", 1.4))
    + L(0, 5, 64, 5, "#dad1a0", 1.6) + L(0, 59, 64, 59, "#dad1a0", 1.6), true),
  asset("wuxia", "steinbaender", "Rechteckiges Gartenpflaster mit eingelassenen dunklen Steinbändern", "boden", [1, 1], "stein trocken gehoben hof", () =>
    F(0, 0, 64, 64, "#c5c7b0") + F(0, 27, 64, 10, "#687c74") + F(27, 0, 10, 64, "#687c74")
    + [[2, 2], [39, 2], [2, 39], [39, 39]].map(([x, y]) => R(x, y, 23, 23, "#b2b9a3", 1, { stroke: "#8a9787", "stroke-width": .7 })).join("")
    + R(28, 28, 8, 8, "#d0c49a", 0, { stroke: "#9a9b7a", "stroke-width": .6 })
    + L(3, 6, 22, 6, "#d3d6bc", .7) + L(40, 43, 59, 43, "#d3d6bc", .7), true),
  asset("wuxia", "hofmauer", "Verputzte Hofmauer mit geschwungener Ziegelabdeckung", "wand", [3, 1], "stein ziegel tragend hof", ({ p }) =>
    R(6, 22, 180, 25, "#d5d3bc", 1) + P("M5 22Q18 31 31 17H162Q176 29 187 21V29Q177 37 160 26H33Q18 39 5 30Z", "#566f6b")
    + repeat(21, i => L(13 + i * 8, 21, 13 + i * 8, 28, "#8d9d8b", .8)) + L(11, 44, 181, 44, "#a9b4a0", 1.5)
    + R(17, 43, 10, 12, p.ceramic, 0) + R(165, 43, 10, 12, p.ceramic, 0)),
  asset("wuxia", "faltportal", "Geöffnetes vierflügeliges Holzportal mit Gitterfüllungen", "tuer", [2, 1], "drehbar holz eingang hof", ({ p }) =>
    R(5, 10, 118, 9, p.wood, 1) + [10, 113].map(x => R(x, 18, 7, 40, "#86714f", 1)).join("")
    + polygon([[17, 19], [35, 29], [26, 45], [17, 39]], "#9b815b") + polygon([[35, 29], [50, 19], [48, 39], [26, 45]], "#bba576")
    + polygon([[111, 19], [93, 29], [102, 45], [111, 39]], "#9b815b") + polygon([[93, 29], [78, 19], [80, 39], [102, 45]], "#bba576")
    + P("M20 24l12 7l-5 8l-7 -4ZM37 31l9 -7v11l-14 6ZM108 24l-12 7l5 8l7 -4ZM91 31l-9 -7v11l14 6Z", "#758d7c", "#554f3e", .7)
    + P("M50 44q14 13 28 0", "none", "#9baa88", 1, { "stroke-dasharray": "3 3" })),
  asset("wuxia", "papierlaterne", "Achteckige Papierlaterne mit Holzstreben und Tragring", "licht", [1, 1], "warm papier wache kult", ({ p }) =>
    polygon(points(32, 32, 24, 8, Math.PI / 8), "#d9c895") + polygon(points(32, 32, 18, 8, Math.PI / 8), "#efdfac")
    + repeat(8, i => { const a = Math.PI / 8 + i * Math.PI / 4; return L(32 + Math.cos(a) * 10, 32 + Math.sin(a) * 10, 32 + Math.cos(a) * 24, 32 + Math.sin(a) * 24, "#8e7952", 1.2); })
    + O(32, 32, 9, p.wood) + O(32, 32, 5, "#e9b968") + P("M23 10Q32 0 41 10", "none", "#6f694d", 2)),
  asset("wuxia", "teewassertopf", "Großer Teewassertopf mit Bambusschöpfkelle und Henkel", "gefaess", [1, 1], "behaelter wasser vorrat tee", ({ p }) =>
    O(31, 34, 24, "#657f74") + O(31, 34, 18, "#3d6262") + P("M10 27Q5 1 31 6Q55 3 53 27", "none", "#bbad79", 4)
    + O(31, 33, 11, "#9bbdaf") + O(31, 33, 6, "#6c968b") + L(36, 38, 56, 57, "#c6b884", 3)
    + P("M13 43q7 10 15 9", "none", "#a7c0a5", 1.5)),
  asset("wuxia", "gartentreppe", "Versetzte Gartentreppe aus Naturstein mit seitlichem Entwässerungsband", "aufbau", [2, 2], "treppe aufwaerts abwaerts stein garten", ({ p }) =>
    P("M12 13L108 8L117 115L16 120Z", "#8e9d8b") + repeat(7, i => polygon([[18 + i % 2 * 4, 16 + i * 14], [97 + i % 2 * 4, 12 + i * 14], [101 + i % 2 * 3, 25 + i * 14], [18 + i % 2 * 4, 29 + i * 14]], p.ceramic))
    + P("M105 18L111 107", "none", "#496f6d", 4) + P("M60 102L58 35m-4 5l4 -5l4 5", "none", "#eff0d5", 1.8)),
  asset("wuxia", "teetafel", "Niedrige Teetafel mit Bambusablett und vier Sitzkissen", "moebel", [2, 2], "tee mahl tisch sitz rast", ({ p }) =>
    R(23, 27, 82, 73, p.wood, 7) + R(36, 42, 56, 39, "#809283", 3)
    + repeat(6, i => L(40, 47 + i * 5, 88, 47 + i * 5, "#53695e", .7))
    + O(56, 61, 10, "#a6ba9e") + O(56, 61, 5, "#78977f") + P("M64 58l10 -5l-5 11Z", "#a6ba9e")
    + [[77, 69], [43, 82], [85, 43]].map(([x, y]) => O(x, y, 4, "#d2d8b3") + O(x, y, 2, "#769181")).join("")
    + [[45, 7, 37, 16], [44, 106, 38, 16], [4, 45, 15, 37], [110, 44, 14, 38]].map(([x, y, w, h]) => R(x, y, w, h, "#849c82", 6)).join("")),
  asset("wuxia", "kalligraphietisch", "Kalligraphietisch mit Papierbahn, Tuschstein und Pinselablage", "moebel", [3, 1], "wissen schreiben tisch handwerk", ({ p }) =>
    P("M9 11Q91 3 183 11V52Q91 59 9 51Z", p.wood) + R(35, 15, 94, 34, "#e1dcc0", 1)
    + R(32, 13, 7, 39, "#c7c9a8", 3) + R(126, 13, 7, 39, "#c7c9a8", 3)
    + P("M51 23q6 -6 12 1l-9 5l11 10m13 -16l-4 16m-3 -8l15 -4m14 -4q9 8 -1 16m-4 -7h13", "none", "#434f44", 1.3)
    + R(143, 19, 27, 19, "#3c534e", 7) + F(150, 23, 13, 9, "#253e3a", 3)
    + L(142, 47, 176, 42, "#bfac77", 2) + L(15, 20, 20, 44, "#947545", 3)),
  asset("wuxia", "guqin", "Guqin-Zither mit sieben Saiten auf geformtem Holzkorpus", "moebel", [3, 1], "musik wissen rast kult", ({ p }) =>
    P("M10 25Q10 12 26 15L147 13Q172 7 181 22V43Q171 54 150 48L28 47Q10 49 10 37Z", "#674f42")
    + P("M18 25Q28 19 44 23L151 20Q168 16 175 25V39Q163 43 150 40H39Q24 43 18 37Z", p.wood)
    + repeat(7, i => L(24, 25 + i * 2.2, 166, 24 + i * 2.2, "#d1c197", .65))
    + repeat(13, i => O(40 + i * 8.7, 18, 1, "#ddd9b8")) + L(29, 23, 29, 40, "#343f3b", 2.5) + L(165, 21, 165, 41, "#343f3b", 2.5)),
  asset("wuxia", "weiqibrett", "Weiqibrett mit neun Linien und zwei offenen Steinschalen", "moebel", [2, 2], "spiel wissen tisch rast", ({ p }) =>
    R(23, 21, 83, 85, "#c7ad79", 3) + repeat(9, i => L(31 + i * 8.1, 29, 31 + i * 8.1, 97, "#766c4c", .7) + L(31, 29 + i * 8.5, 97, 29 + i * 8.5, "#766c4c", .7))
    + [[2, 2], [2, 3], [3, 2], [4, 4], [5, 3], [6, 6], [5, 6], [6, 5], [4, 6]].map(([x, y], i) => O(31 + x * 8.1, 29 + y * 8.5, 3.3, i % 2 ? "#e7e6cb" : "#364d46", { "stroke-width": .5 })).join("")
    + O(12, 12, 10, p.wood) + O(12, 12, 7, "#374a40") + O(116, 115, 10, p.wood) + O(116, 115, 7, "#e1ddbd")),
  asset("wuxia", "medizinladen", "Apothekentheke mit Wurzelbündeln, Mörser und Schubfächern", "moebel", [3, 1], "medizin kraeuter handwerk lager", ({ p }) =>
    R(7, 9, 179, 46, p.wood, 2) + repeat(6, i => R(13 + i * 20, 16, 17, 30, "#8b8a65", 1) + L(16 + i * 20, 25, 26 + i * 20, 25, "#d3c496", 1.2))
    + P("M18 33l8 5m10 -5l9 9m17 -8l-5 8m24 -10l8 8m15 -7l-4 9m17 -10l6 9", "none", "#bcac70", 2)
    + O(158, 33, 18, "#a8b49b") + O(158, 33, 12, "#6b816b") + L(155, 36, 178, 15, "#b8c2a4", 6)),
  asset("wuxia", "rollenpult", "Langes Rollenpult mit offener Landschaftszeichnung und Beschwerern", "moebel", [2, 1], "wissen buecher tisch kunst", ({ p }) =>
    R(8, 11, 112, 43, "#75654a", 2) + P("M17 16H111V48H17Q23 34 17 16Z", "#d5d4b1")
    + P("M26 39l15 -16l7 9l12 -12l17 21M71 40l13 -15l12 15M22 45Q59 35 108 45", "none", "#668475", 1.1)
    + O(91, 23, 5, "#b7b38c") + R(12, 15, 7, 34, p.wood, 3) + R(109, 15, 7, 34, p.wood, 3)
    + R(35, 50, 16, 6, "#9cac92", 2) + R(78, 9, 16, 6, "#9cac92", 2)),
  asset("wuxia", "rundfensterschirm", "Gebogener Holzschirm mit runder Gitteröffnung", "moebel", [3, 1], "trennwand holz kammer wohnraum", ({ p }) =>
    P("M8 23Q96 -5 184 23V43Q96 16 8 43Z", p.wood)
    + [22, 48, 145, 171].map(x => R(x, 20, 8, 25, "#607b6b", 1)).join("") + O(96, 31, 24, "#b4bea0") + O(96, 31, 18, "#647f70")
    + P("M83 19l26 24M109 19L83 43M78 31h36M96 13v36", "none", "#c1c6a4", 1.2)
    + R(15, 42, 24, 11, "#8e7855", 2) + R(152, 42, 24, 11, "#8e7855", 2)),
  asset("wuxia", "uebungspfaehle", "Sieben unterschiedlich breite Übungspfähle auf festem Hofboden", "aufbau", [2, 2], "training holz hof aussen", ({ p }) =>
    P("M9 23L92 8L119 29L113 111L34 121L8 92Z", "#a2ad8d")
    + [[29, 31, 12], [63, 23, 9], [96, 37, 13], [42, 67, 10], [83, 75, 12], [26, 103, 9], [72, 107, 8]].map(([x, y, rad]) =>
      O(x, y, rad, p.wood) + O(x - 1, y, rad * .6, "none", { stroke: "#896b48", "stroke-width": .8 }) + P(`M${x - 2} ${y - rad + 2}l2 ${rad - 2}`, "none", "#67563c", .8)).join("")),
  asset("wuxia", "waffenstaender", "Übungswaffenständer mit Stäben, Scheiden und geflochtenem Schutzschild", "moebel", [2, 2], "waffe schild training lager", ({ p }) =>
    R(13, 9, 12, 107, p.wood, 1) + R(104, 9, 12, 107, p.wood, 1) + R(9, 27, 111, 9, p.wood, 1) + R(9, 93, 111, 10, p.wood, 1)
    + L(36, 14, 40, 113, "#b69d6d", 4) + L(52, 13, 50, 115, "#d0bd8b", 3)
    + P("M68 20L72 108L64 108L63 20Z", "#536c60") + L(59, 32, 77, 32, "#b59861", 3)
    + ellipse(89, 69, 17, 27, { fill: "#b7aa77", stroke: C.ink }) + repeat(7, i => L(77, 48 + i * 6, 102, 48 + i * 6, "#837b53", .7)) + O(89, 69, 5, "#6e7e63")),
  asset("wuxia", "reisebuendel", "Tuchbündel mit Bambustrage, zusammengerollter Matte und Sandalen", "moebel", [1, 2], "rast reise lager", ({ p }) =>
    L(12, 10, 52, 111, "#b6a574", 5) + L(48, 10, 13, 111, "#b6a574", 5)
    + P("M15 38Q32 23 51 39L55 75Q34 95 10 77Z", "#788f79") + P("M16 42l30 34m0 -37L17 76", "none", "#b4c3a0", 2)
    + R(12, 12, 42, 21, "#c2b785", 7) + repeat(8, i => L(17 + i * 4.5, 14, 17 + i * 4.5, 30, "#8e8d63", .7))
    + [21, 42].map(x => ellipse(x, 104, 7, 13, { fill: p.wood, stroke: C.ink }) + P(`M${x - 4} 99l4 6l4 -6`, "none", "#61715a", 2)).join("")),
  asset("wuxia", "lacktruhe", "Lacktruhe mit geschwungenen Metallbeschlägen und floraler Deckeleinlage", "moebel", [2, 1], "lager truhe schatz kammer", ({ p }) =>
    R(8, 10, 112, 44, "#735b4b", 6) + R(15, 15, 98, 33, "#806d58", 4)
    + P("M28 19q11 8 0 24m72 -24q-11 8 0 24", "none", "#c7b480", 3) + R(59, 45, 11, 12, p.copper, 2)
    + P("M47 37Q61 17 83 31M61 29Q51 15 47 25Q48 32 61 29M69 28Q76 16 84 24Q86 30 69 28", "none", "#a6b594", 1.4)
    + O(63, 50, 2, "#5f654f")),
  asset("wuxia", "mondtor", "Rundes Gartentor im Grundriss zwischen zwei gebogenen Mauerarmen", "aufbau", [3, 1], "eingang tor garten aussen", ({ p }) =>
    P("M6 16Q38 14 64 27L58 44Q36 31 6 36Z", "#c3c7af") + P("M186 16Q154 14 128 27L134 44Q156 31 186 36Z", "#c3c7af")
    + ellipse(96, 31, 36, 22, { fill: "none", stroke: "#819781", "stroke-width": 10 })
    + P("M66 35Q96 9 126 35", "none", "#c8d0b2", 2) + R(62, 23, 12, 26, p.ceramic, 2) + R(118, 23, 12, 26, p.ceramic, 2)
    + L(80, 52, 112, 52, "#a9b69c", 4)),
  asset("wuxia", "pavillondach", "Sechseckiges Pavillondach mit geschwungenen Traufen und Firstknauf", "aufbau", [3, 3], "dach gebaeude garten aussen", ({ p }) =>
    P("M96 8Q111 31 169 49Q158 94 179 143Q135 145 96 185Q55 146 12 144Q34 95 24 49Q78 34 96 8Z", "#536f64")
    + repeat(6, i => { const a = -Math.PI / 2 + i * Math.PI / 3; return P(`M96 96Q${n(96 + Math.cos(a) * 35 - Math.sin(a) * 12)} ${n(96 + Math.sin(a) * 35 + Math.cos(a) * 12)} ${n(96 + Math.cos(a) * 85)} ${n(96 + Math.sin(a) * 85)}`, "none", "#a1b197", 3); })
    + repeat(3, i => polygon(points(96, 96, 28 + i * 18, 6, -Math.PI / 2), "none", .75))
    + O(96, 96, 13, p.copper) + O(96, 96, 6, "#9bb69a")),
  asset("wuxia", "lotusteich", "Lotusteich mit natürlichem Steinrand, Blättern und Trittstein", "aufbau", [3, 2], "wasser garten natur aussen", ({ p }) =>
    P("M9 35Q24 1 68 12Q116 -2 170 18Q193 38 175 70Q195 112 144 116Q83 133 32 111Q-1 92 9 35Z", "#a4b39a")
    + P("M19 39Q29 13 71 23Q120 9 161 29Q178 43 163 70Q181 99 140 105Q84 120 41 101Q11 87 19 39Z", "#65958a")
    + [[47, 46, 15], [78, 86, 18], [132, 40, 13], [140, 86, 14]].map(([x, y, rad]) => P(`M${x} ${y}l${rad} -4a${rad} ${rad} 0 1 1 -3 -6Z`, "#9db589", "#527d68", .8)).join("")
    + repeat(7, i => ellipse(112, 64, 4, 11, { fill: "#d6b8b1", stroke: "#9e9390", "stroke-width": .5, transform: `rotate(${i * 360 / 7} 112 73)` }))
    + O(112, 73, 4, "#d2bd78") + polygon([[20, 69], [44, 65], [52, 83], [28, 88]], p.ceramic)),
  asset("wuxia", "bogenbruecke", "Schmale Gartenbogenbrücke mit segmentierten Geländern", "aufbau", [3, 1], "bruecke weg garten aussen", ({ p }) =>
    P("M7 15Q96 1 185 15V52Q96 62 7 52Z", "#b1bba2")
    + repeat(13, i => P(`M${12 + i * 13} 18Q${17 + i * 13} 32 ${12 + i * 13} 49`, "none", "#839982", 1.2))
    + P("M8 12Q96 -1 184 12M8 54Q96 65 184 54", "none", "#5f7a67", 5)
    + repeat(7, i => R(11 + i * 27, 9, 7, 10, p.ceramic, 2) + R(11 + i * 27, 48, 7, 10, p.ceramic, 2))),
  asset("wuxia", "steinlaternenweg", "Trittsteinweg mit zwei pagodenförmigen Gartenlaternen", "aufbau", [2, 3], "weg garten licht aussen", ({ p }) =>
    P("M61 8Q87 54 57 89Q25 133 66 183", "none", "#93a28a", 28)
    + repeat(7, i => { const y = 17 + i * 25, x = 62 + Math.sin(i * 1.05) * 15; return polygon([[x - 13, y - 7], [x + 10, y - 10], [x + 15, y + 8], [x - 9, y + 11]], p.ceramic); })
    + [[22, 55], [104, 133]].map(([x, y]) => R(x - 15, y - 15, 30, 30, "#91a48b", 2) + polygon([[x, y - 22], [x + 22, y], [x, y + 22], [x - 22, y]], "#6f8a73")
      + polygon([[x, y - 12], [x + 12, y], [x, y + 12], [x - 12, y]], "#b5c3a2") + O(x, y, 5, "#d6c693")).join("")),
  asset("wuxia", "bambusbeet", "Bambusbeet mit dichtem Blattwerk und sichtbaren Stängelquerschnitten", "aufbau", [2, 2], "garten natur gruen aussen", ({ p }) =>
    R(8, 9, 112, 110, "#aaa787", 5) + R(15, 16, 98, 95, "#72846a", 3)
    + [[32, 36], [73, 31], [96, 61], [56, 66], [33, 93], [87, 96]].map(([x, y], index) =>
      repeat(5, i => group({ transform: `rotate(${i * 72 + index * 21} ${x} ${y})` }, P(`M${x} ${y}q-5 -14 2 -25q8 11 -2 25Z`, i % 2 ? "#9fb687" : "#5e7f61", "#53765a", .7)))
      + O(x, y, 4, p.wood) + O(x, y, 2, "#5e7658")).join("")),
];
