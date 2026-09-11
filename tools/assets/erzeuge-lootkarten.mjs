#!/usr/bin/env node
// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
//
// Zeichnet die vierzig Beutekarten von ChronicleHeroes nach `assets/loot/chronicle-heroes/`.
//
// **Die Liste ist die Quelle, nicht dieses Skript.** Namen, Seltenheit, Sprüche und Zeilen stehen
// in `packages/rules/src/templates/chronicle-heroes-loot.ts` und werden hier importiert. Wer eine
// Karte ändert, ändert die Liste; dieser Lauf zieht die Bilder nach. `--pruefe` hält beide Seiten
// zusammen und bricht ab, statt stillschweigend zu übermalen.
//
// **Warum PNG und nicht SVG wie die Assetpakete.** Eine Lootkarte ist keine Kachel auf einer
// Karte, sondern ein Bild im Bildbestand einer Kampagne: der Kartenvertrag zeigt es über
// `bildAssetId` aus dem hochgeladenen Bestand. Dort liegen Rasterbilder. Gezeichnet wird trotzdem
// als Vektor — dieselbe Hand wie `pk.gemalt` — und erst zum Schluss gerastert.
//
// Run: node --import tsx tools/assets/erzeuge-lootkarten.mjs [--pruefe]

import { mkdir, readFile, readdir, writeFile, rm } from "node:fs/promises";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { join, resolve } from "node:path";
import sharp from "sharp";
import { letteringPath, letteringWidth } from "./loot-lettering.mjs";
import { CHRONICLE_LOOT_DECK, CHRONICLE_LOOT_SPREAD, CHRONICLE_LOOT_IMAGE_DIR } from "../../packages/rules/src/templates/chronicle-heroes-loot.ts";
import { zufallFabrik, n, rect, circle, ellipse, line, path, poly, polyline, svg, klumpen } from "./tusche.mjs";
import { M, korn, weichzeichner, verlauf, rundverlauf, defs, mische } from "./pinsel.mjs";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const OUT = join(ROOT, CHRONICLE_LOOT_IMAGE_DIR);
const BREITE = 512, HOEHE = 768;
const zufall = zufallFabrik("chronicle-heroes-loot");
const q = (name) => (teil) => `${name}-${teil}`;

/** Die fünf Stufen tragen je eine eigene Rahmenfarbe; das ist die schnellste Auskunft der Karte. */
const STUFE = {
  gewoehnlich: { rand: "#8a8378", tief: "#5d574f", wort: "Gewöhnlich" },
  ungewoehnlich: { rand: "#5f7145", tief: "#3d4a2b", wort: "Ungewöhnlich" },
  selten: { rand: "#4e6f7d", tief: "#2f4854", wort: "Selten" },
  episch: { rand: "#7a5a86", tief: "#4c3557", wort: "Episch" },
  legendaer: { rand: "#c8963c", tief: "#8a6220", wort: "Legendär" },
};

// Pinned glyph outlines instead of host-dependent Georgia/Times/DejaVu substitutions.
const text = letteringPath;

// ---------------------------------------------------------------------------------------------
// Sinnbilder — zehn Familien, aus denen alle vierzig Karten schöpfen. Farbe und Beiwerk je Karte
// aus dem Kartennamen gesät, damit zwei Klingen nicht dieselbe Klinge sind.
// ---------------------------------------------------------------------------------------------
const MITTE = BREITE / 2, BILD = 300;

function klinge(r, k, ton) {
  const lang = r.zahl(150, 200), breit = r.zahl(16, 26);
  return [
    poly([[MITTE, BILD - lang], [MITTE + breit, BILD - lang * .62], [MITTE + breit * .7, BILD + 40], [MITTE - breit * .7, BILD + 40], [MITTE - breit, BILD - lang * .62]],
      { fill: `url(#${k("stahl")})`, filter: `url(#${k("korn")})` }),
    polyline([[MITTE, BILD - lang], [MITTE, BILD + 36]], { stroke: M.metallHell, "stroke-width": 2, "stroke-opacity": .5 }),
    rect(MITTE - 52, BILD + 40, 104, 16, { fill: ton, rx: 4, filter: `url(#${k("korn")})` }),
    rect(MITTE - 13, BILD + 56, 26, 84, { fill: M.holzTief, rx: 5, filter: `url(#${k("korn")})` }),
    circle(MITTE, BILD + 150, 15, { fill: ton, stroke: M.schatten, "stroke-width": 2, "stroke-opacity": .6 }),
  ].join("");
}
function bogen(r, k, ton) {
  return [
    path(`M${MITTE - 70} ${BILD - 150} Q${MITTE + 92} ${BILD + 10} ${MITTE - 70} ${BILD + 170}`,
      { fill: "none", stroke: `url(#${k("stahl")})`, "stroke-width": 17, "stroke-linecap": "round", filter: `url(#${k("korn")})` }),
    path(`M${MITTE - 70} ${BILD - 150} Q${MITTE + 84} ${BILD + 10} ${MITTE - 70} ${BILD + 170}`,
      { fill: "none", stroke: M.holzHell, "stroke-width": 3, "stroke-opacity": .4 }),
    line(MITTE - 70, BILD - 150, MITTE - 70, BILD + 170, { stroke: "#e6dcc4", "stroke-width": 3 }),
    ...[-1, 1].map(s => ellipse(MITTE - 70, BILD + s * 160, 8, 12, { fill: ton })),
  ].join("");
}
function panzer(r, k, ton) {
  const reihen = [];
  for (let y = 0; y < 6; y++) for (let x = 0; x < 6; x++) {
    const px = MITTE - 105 + x * 42 + (y % 2) * 21, py = BILD - 120 + y * 42;
    reihen.push(circle(px, py, 17, { fill: mische(ton, y % 2 ? M.metallHell : M.metallTief, .3), stroke: M.schatten, "stroke-width": 2, "stroke-opacity": .45, filter: `url(#${k("korn")})` }));
  }
  return [
    poly([[MITTE - 128, BILD - 145], [MITTE + 128, BILD - 145], [MITTE + 108, BILD + 130], [MITTE, BILD + 175], [MITTE - 108, BILD + 130]],
      { fill: `url(#${k("stahl")})`, filter: `url(#${k("korn")})` }),
    `<g clip-path="url(#${k("umriss")})">${reihen.join("")}</g>`,
    poly([[MITTE - 128, BILD - 145], [MITTE + 128, BILD - 145], [MITTE + 108, BILD + 130], [MITTE, BILD + 175], [MITTE - 108, BILD + 130]],
      { fill: "none", stroke: M.schatten, "stroke-width": 5, "stroke-opacity": .7, "stroke-linejoin": "round" }),
  ].join("");
}
function phiole(r, k, ton) {
  return [
    path(`M${MITTE - 26} ${BILD - 140} L${MITTE - 26} ${BILD - 70} Q${MITTE - 86} ${BILD + 10} ${MITTE - 56} ${BILD + 120} L${MITTE + 56} ${BILD + 120} Q${MITTE + 86} ${BILD + 10} ${MITTE + 26} ${BILD - 70} L${MITTE + 26} ${BILD - 140} Z`,
      { fill: "#dfe7e4", "fill-opacity": .55, stroke: M.schatten, "stroke-width": 3, "stroke-opacity": .5 }),
    path(`M${MITTE - 74} ${BILD + 10} Q${MITTE - 86} ${BILD + 40} ${MITTE - 56} ${BILD + 118} L${MITTE + 56} ${BILD + 118} Q${MITTE + 86} ${BILD + 40} ${MITTE + 74} ${BILD + 10} Z`,
      { fill: ton, filter: `url(#${k("korn")})` }),
    ellipse(MITTE, BILD + 12, 74, 12, { fill: mische(ton, "#ffffff", .35) }),
    rect(MITTE - 32, BILD - 158, 64, 26, { fill: M.holzTief, rx: 6 }),
    ellipse(MITTE - 26, BILD + 60, 10, 26, { fill: "#ffffff", "fill-opacity": .25 }),
  ].join("");
}
function buch(r, k, ton) {
  const seiten = [];
  for (let i = 0; i < 5; i++) seiten.push(line(MITTE + 96, BILD - 100 + i * 46, MITTE + 104, BILD - 100 + i * 46, { stroke: "#cfc4a6", "stroke-width": 6 }));
  return [
    rect(MITTE - 108, BILD - 140, 216, 280, { fill: ton, rx: 10, filter: `url(#${k("korn")})` }),
    rect(MITTE - 96, BILD - 128, 192, 256, { fill: "none", stroke: mische(ton, "#ffffff", .35), "stroke-width": 3, "stroke-opacity": .6, rx: 6 }),
    rect(MITTE + 92, BILD - 134, 18, 268, { fill: "#e8dfc6", rx: 4 }),
    ...seiten,
    circle(MITTE, BILD, 40, { fill: "none", stroke: mische(ton, "#ffffff", .5), "stroke-width": 4, "stroke-opacity": .7 }),
    line(MITTE, BILD - 40, MITTE, BILD + 40, { stroke: mische(ton, "#ffffff", .5), "stroke-width": 4, "stroke-opacity": .7 }),
  ].join("");
}
function reif(r, k, ton) {
  return [
    circle(MITTE, BILD + 10, 96, { fill: "none", stroke: `url(#${k("stahl")})`, "stroke-width": 26, filter: `url(#${k("korn")})` }),
    circle(MITTE, BILD + 10, 96, { fill: "none", stroke: M.schatten, "stroke-width": 3, "stroke-opacity": .45 }),
    poly([[MITTE, BILD - 130], [MITTE + 34, BILD - 86], [MITTE, BILD - 44], [MITTE - 34, BILD - 86]],
      { fill: ton, stroke: M.schatten, "stroke-width": 3, "stroke-opacity": .55, filter: `url(#${k("korn")})` }),
    poly([[MITTE, BILD - 130], [MITTE + 34, BILD - 86], [MITTE, BILD - 100]], { fill: "#ffffff", "fill-opacity": .3 }),
  ].join("");
}
function werkzeug(r, k, ton) {
  const punkte = klumpen(r, MITTE, BILD + 40, 78, 9, .16);
  return [
    rect(MITTE - 16, BILD - 150, 32, 190, { fill: M.holzTief, rx: 8, filter: `url(#${k("korn")})` }),
    poly(punkte, { fill: ton, stroke: M.schatten, "stroke-width": 4, "stroke-opacity": .6, "stroke-linejoin": "round", filter: `url(#${k("korn")})` }),
    circle(MITTE, BILD + 36, 26, { fill: mische(ton, M.schatten, .45) }),
    circle(MITTE - 12, BILD + 24, 10, { fill: "#ffffff", "fill-opacity": .22 }),
    line(MITTE, BILD - 150, MITTE, BILD - 120, { stroke: M.metallHell, "stroke-width": 5, "stroke-opacity": .5 }),
  ].join("");
}
function zehrung(r, k, ton) {
  return [
    path(`M${MITTE - 84} ${BILD - 60} Q${MITTE} ${BILD - 140} ${MITTE + 84} ${BILD - 60} L${MITTE + 66} ${BILD + 130} Q${MITTE} ${BILD + 170} ${MITTE - 66} ${BILD + 130} Z`,
      { fill: ton, stroke: M.schatten, "stroke-width": 4, "stroke-opacity": .6, "stroke-linejoin": "round", filter: `url(#${k("korn")})` }),
    ellipse(MITTE, BILD - 62, 84, 20, { fill: mische(ton, "#ffffff", .3) }),
    path(`M${MITTE + 80} ${BILD - 20} Q${MITTE + 140} ${BILD + 20} ${MITTE + 72} ${BILD + 70}`,
      { fill: "none", stroke: ton, "stroke-width": 18, "stroke-linecap": "round" }),
    ...[0, 1, 2].map(i => line(MITTE - 40 + i * 40, BILD + 10, MITTE - 40 + i * 40, BILD + 90, { stroke: M.schatten, "stroke-width": 3, "stroke-opacity": .2 })),
  ].join("");
}
function tuch(r, k, ton) {
  return [
    path(`M${MITTE - 120} ${BILD - 130} Q${MITTE} ${BILD - 90} ${MITTE + 120} ${BILD - 130} L${MITTE + 96} ${BILD + 150} Q${MITTE} ${BILD + 110} ${MITTE - 96} ${BILD + 150} Z`,
      { fill: ton, stroke: M.schatten, "stroke-width": 4, "stroke-opacity": .55, "stroke-linejoin": "round", filter: `url(#${k("korn")})` }),
    ...[0, 1, 2, 3].map(i => path(`M${MITTE - 84 + i * 56} ${BILD - 112} Q${MITTE - 74 + i * 56} ${BILD + 10} ${MITTE - 66 + i * 56} ${BILD + 128}`,
      { fill: "none", stroke: M.schatten, "stroke-width": 3, "stroke-opacity": .18 })),
  ].join("");
}
function muenze(r, k, ton) {
  const stapel = [];
  for (let i = 0; i < 7; i++) {
    const x = MITTE - 60 + (i % 3) * 60, y = BILD + 90 - Math.floor(i / 3) * 34;
    stapel.push(ellipse(x, y, 40, 15, { fill: mische(ton, M.schatten, .35) }));
    stapel.push(ellipse(x, y - 7, 40, 15, { fill: ton, stroke: M.schatten, "stroke-width": 2, "stroke-opacity": .5, filter: `url(#${k("korn")})` }));
    stapel.push(ellipse(x - 10, y - 10, 12, 5, { fill: "#ffffff", "fill-opacity": .25 }));
  }
  return stapel.join("");
}
const SINNBILDER = { klinge, bogen, panzer, phiole, buch, reif, werkzeug, zehrung, tuch, muenze };
const TON = {
  klinge: [M.metall, M.eisenHell, "#8d7a5a"], bogen: [M.holz, M.holzHell, "#6d5a3a"],
  panzer: [M.metall, "#7f6a4e", "#6f7c86"], phiole: ["#a8434f", "#4e7f6a", "#5f6f9e"],
  buch: ["#7a4a34", "#3f5a4a", "#4a4560"], reif: [M.gold, "#b9c0c8", "#c8963c"],
  werkzeug: [M.metall, "#8a6f4a", "#6f7c86"], zehrung: ["#b08a4a", "#8a6f4a", "#9c8452"],
  tuch: ["#8a4034", "#4a5a6a", "#6a6a4a"], muenze: [M.gold, "#b87333", "#c8963c"],
};

export function zeichneKarte(karte) {
  const r = zufall(karte.id), k = q(karte.id), stufe = STUFE[karte.seltenheit];
  const toene = TON[karte.sinnbild], ton = toene[r.ganz(0, toene.length - 1)];
  const teile = [];
  // Pergament, Rahmen, Rahmeninnenkante
  teile.push(rect(0, 0, BREITE, HOEHE, { fill: "#e6dcc2", filter: `url(#${k("papier")})` }));
  teile.push(rect(0, 0, BREITE, HOEHE, { fill: `url(#${k("vignette")})` }));
  teile.push(rect(14, 14, BREITE - 28, HOEHE - 28, { fill: "none", stroke: stufe.rand, "stroke-width": 10, rx: 18 }));
  teile.push(rect(28, 28, BREITE - 56, HOEHE - 56, { fill: "none", stroke: stufe.tief, "stroke-width": 2, "stroke-opacity": .7, rx: 10 }));
  // Bildfeld
  teile.push(rect(44, 96, BREITE - 88, 360, { fill: "#ded2b4", "fill-opacity": .6, rx: 8 }));
  teile.push(SINNBILDER[karte.sinnbild](r, k, ton));
  teile.push(rect(44, 96, BREITE - 88, 360, { fill: "none", stroke: stufe.tief, "stroke-width": 2, "stroke-opacity": .5, rx: 8 }));
  // Kopf: Kategorie
  teile.push(text(MITTE, 62, karte.kategorie.toUpperCase(), { groesse: 20, farbe: stufe.tief, sperrung: 4, fett: 600 }));
  // Name, bei Bedarf zweizeilig
  const name = karte.name, umbruch = name.length > 22 ? name.lastIndexOf(" ", Math.ceil(name.length / 2) + 4) : -1;
  if (umbruch > 0) {
    teile.push(text(MITTE, 512, name.slice(0, umbruch), { groesse: 34, fett: 700 }));
    teile.push(text(MITTE, 550, name.slice(umbruch + 1), { groesse: 34, fett: 700 }));
  } else teile.push(text(MITTE, 528, name, { groesse: 36, fett: 700 }));
  teile.push(line(120, 566, BREITE - 120, 566, { stroke: stufe.rand, "stroke-width": 2, "stroke-opacity": .8 }));
  // Spruch
  teile.push(text(MITTE, 596, karte.spruch, { groesse: 19, kursiv: "italic", farbe: "#5a5145" }));
  // Zeilen
  // Beschriftung links, Wert rechts. Ein langer Wert schrumpft, bis er neben seine Beschriftung
  // passt, und rutscht darunter, wenn auch das nicht reicht — Text darf nie Text ueberdecken.
  const breiteVon = (inhalt, groesse, fett = 400) => letteringWidth(inhalt, groesse, fett);
  let y = 640;
  for (const zeile of karte.zeilen.slice(0, 3)) {
    const platz = BREITE - 144 - breiteVon(zeile.label, 19) - 16;
    let groesse = 19;
    while (groesse > 14 && breiteVon(zeile.wert, groesse, 600) > platz) groesse -= 1;
    teile.push(text(72, y, zeile.label, { groesse: 19, anker: "start", farbe: "#5a5145" }));
    if (breiteVon(zeile.wert, groesse, 600) <= platz) {
      teile.push(text(BREITE - 72, y, zeile.wert, { groesse, anker: "end", fett: 600 }));
      y += 30;
    } else {
      teile.push(text(BREITE - 72, y + 24, zeile.wert, { groesse: 17, anker: "end", fett: 600 }));
      y += 52;
    }
  }
  // Fuß: Seltenheit
  teile.push(rect(0, HOEHE - 62, BREITE, 34, { fill: stufe.rand, "fill-opacity": .18 }));
  teile.push(text(MITTE, HOEHE - 38, stufe.wort.toUpperCase(), { groesse: 18, farbe: stufe.tief, sperrung: 6, fett: 700 }));
  return svg(`${karte.name} — ChronicleHeroes`, BREITE, HOEHE,
    defs(
      korn(k("papier"), { frequenz: .9, oktaven: 4, saat: 11, staerke: .22 }),
      korn(k("korn"), { frequenz: 1.05, oktaven: 4, saat: 23, staerke: .34 }),
      verlauf(k("stahl"), [[0, M.metallHell], [.45, M.metall], [1, M.metallTief]], 118),
      rundverlauf(k("vignette"), [[.55, "#000000", 0], [1, "#2b2218", .22]], .5, .5, .78),
      weichzeichner(k("weich"), 2.2),
      `<clipPath id="${k("umriss")}"><polygon points="${MITTE - 128},${BILD - 145} ${MITTE + 128},${BILD - 145} ${MITTE + 108},${BILD + 130} ${MITTE},${BILD + 175} ${MITTE - 108},${BILD + 130}"/></clipPath>`,
    ) + teile.join(""));
}

const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");

async function main() {
  const pruefe = process.argv.includes("--pruefe");
  const verteilung = {};
  for (const karte of CHRONICLE_LOOT_DECK) verteilung[karte.seltenheit] = (verteilung[karte.seltenheit] ?? 0) + 1;
  for (const [stufe, erwartet] of Object.entries(CHRONICLE_LOOT_SPREAD)) {
    if (verteilung[stufe] !== erwartet) throw new Error(`Verteilung stimmt nicht: ${stufe} hat ${verteilung[stufe] ?? 0}, erwartet ${erwartet}`);
  }
  await mkdir(OUT, { recursive: true });
  const dateien = new Map(), eintraege = [];
  for (const karte of CHRONICLE_LOOT_DECK) {
    const bytes = await sharp(Buffer.from(zeichneKarte(karte), "utf8"), { density: 144 }).resize(BREITE, HOEHE).png({ compressionLevel: 9 }).toBuffer();
    dateien.set(karte.bild, bytes);
    eintraege.push({ id: karte.id, datei: karte.bild, name: karte.name, seltenheit: karte.seltenheit, bytes: bytes.length, sha256: hash(bytes), breite: BREITE, hoehe: HOEHE });
  }
  const manifest = `${JSON.stringify({ kind: "loot-deck", deck: "chronicle-heroes", karten: eintraege.sort((a, b) => (a.id < b.id ? -1 : 1)) }, null, 2)}\n`;
  dateien.set("karten.json", Buffer.from(manifest, "utf8"));

  const vorhanden = (await readdir(OUT).catch(() => [])).filter(name => name.endsWith(".png") || name === "karten.json");
  const abweichungen = [];
  for (const [name, bytes] of dateien) {
    const ziel = join(OUT, name);
    const alt = await readFile(ziel).catch(() => null);
    if (alt && Buffer.compare(alt, Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes)) === 0) continue;
    abweichungen.push(alt === null ? `fehlt: ${name}` : `abweichend: ${name}`);
    if (!pruefe) await writeFile(ziel, bytes);
  }
  for (const name of vorhanden) {
    if (dateien.has(name)) continue;
    abweichungen.push(`verwaist: ${name}`);
    if (!pruefe) await rm(join(OUT, name), { force: true });
  }
  if (pruefe) {
    if (abweichungen.length) {
      console.error(`Beutekarten --pruefe ROT — ${abweichungen.length} Abweichung(en):`);
      for (const zeile of abweichungen) console.error(`  ${zeile}`);
      process.exit(1);
    }
    console.log(`Beutekarten --pruefe GRÜN — ${dateien.size} Dateien identisch reproduziert`);
    return;
  }
  console.log(`${CHRONICLE_LOOT_DECK.length} Beutekarten (${BREITE}×${HOEHE}) in ${resolve(OUT)}`);
  for (const zeile of abweichungen) console.log(`  ${zeile}`);
  if (!abweichungen.length) console.log("  (unverändert)");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
