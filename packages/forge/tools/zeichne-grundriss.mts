#!/usr/bin/env node
// Renders a generated `Grundriss` to a standalone SVG, so a floorplan can be *looked at* instead
// of asserted about. This is a diagnostic, not the renderer: `packages/render` owns Pixi, and
// nothing here is on a delivery path. It resolves every `Stamp.a` through the real pack manifest,
// which makes it a second, independent check that the references the generator emits are real.
//
// Run: node --import tsx packages/forge/tools/zeichne-grundriss.mts [keim] [--aus <datei>]

import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { assetIndex, parseAssetpaket, type AssetpaketV1 } from "@chronicle/szene";
import { erzeugeGrundriss, erzeugeHoehle, erzeugeVerschachtelt, type Grundriss, type Verschachtelung } from "../src/index.ts";

const ROOT = fileURLToPath(new URL("../../..", import.meta.url));
const PAKET_DIR = join(ROOT, "assets", "packs", "pk.grundriss");

export function ladePaket(dir = PAKET_DIR): AssetpaketV1 {
  return parseAssetpaket(readFileSync(join(dir, "paket.json"), "utf8"));
}

/** Strip the wrapper element; the caller re-frames the children under its own transform. */
function innereis(svg: string): string {
  const start = svg.indexOf(">", svg.indexOf("<svg")) + 1;
  return svg.slice(start, svg.lastIndexOf("</svg>")).replace(/<title>[\s\S]*?<\/title>/g, "").trim();
}

export function zeichneGrundriss(grundriss: Grundriss, paket: AssetpaketV1, paketDir = PAKET_DIR): string {
  const { defs, inhalt } = zeichneInneres(grundriss, paket, paketDir);
  const [breite, hoehe] = grundriss.karte.geometry.size;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${breite} ${hoehe}" width="${breite}" height="${hoehe}">\n${defs}\n${inhalt}\n</svg>\n`;
}

function zeichneInneres(grundriss: Grundriss, paket: AssetpaketV1, paketDir: string): { defs: string; inhalt: string } {
  const index = assetIndex([paket]);
  const inhalte = new Map<string, string>();
  const [breite, hoehe] = grundriss.karte.geometry.size;
  const teile: string[] = [`<rect x="0" y="0" width="${breite}" height="${hoehe}" fill="#1d1a15"/>`];

  // Each asset is defined once and instanced. Inlining a 64x64 floor tile 400 times produced a
  // 940 kB artefact that no one would open in a diff; a <defs>/<use> preview is ~40 kB.
  for (const stamp of [...grundriss.karte.geometry.stamps].sort((a, b) => a.l - b.l)) {
    const treffer = index.get(stamp.a);
    if (!treffer) throw new Error(`Stamp ${stamp.id} verweist auf unbekanntes Asset ${stamp.a}`);
    const { asset } = treffer;
    if (!inhalte.has(stamp.a)) inhalte.set(stamp.a, innereis(readFileSync(join(paketDir, asset.datei), "utf8")));
    const [ax, ay] = asset.anker;
    const dreh = stamp.r === 0 ? "" : ` rotate(${((stamp.r * 180) / Math.PI).toFixed(3)})`;
    teile.push(`<use href="#a${[...inhalte.keys()].indexOf(stamp.a)}" transform="translate(${stamp.x} ${stamp.y})${dreh} scale(${stamp.s}) translate(${-ax} ${-ay})"/>`);
  }
  const defs = `<defs>${[...inhalte.values()].map((inhalt, i) => `<g id="a${i}">${inhalt}</g>`).join("")}</defs>`;
  teile.unshift(defs);
  for (const licht of grundriss.karte.lights) {
    const rgb = `#${licht.colorArgb.slice(2)}`;
    teile.push(`<circle cx="${licht.position[0]}" cy="${licht.position[1]}" r="${licht.range}" fill="${rgb}" fill-opacity="${(licht.intensity * 0.1).toFixed(3)}"/>`);
  }
  for (const wand of grundriss.karte.walls) {
    teile.push(`<polyline points="${wand.points.map((p) => p.join(",")).join(" ")}" fill="none" stroke="#15120e" stroke-width="7" stroke-linecap="square"/>`);
  }
  for (const tuer of grundriss.karte.portals) {
    const [a, b] = tuer.bounds;
    teile.push(`<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="#dd8a33" stroke-width="5" stroke-linecap="round" stroke-opacity="0.85"/>`);
  }
  for (const region of grundriss.karte.geometry.regions) {
    teile.push(`<polygon points="${region.punkte.map((p) => p.join(",")).join(" ")}" fill="none" stroke="#dd8a33" stroke-width="2" stroke-opacity="0.35" stroke-dasharray="10 8"/>`);
  }
  for (const raum of grundriss.raeume) {
    const [zx, zy, zw, zh] = raum.zellen;
    const g = grundriss.karte.grid.kind === "square" ? grundriss.karte.grid.size : 64;
    teile.push(`<text x="${(zx + zw / 2) * g}" y="${(zy + zh / 2) * g}" text-anchor="middle" font-family="system-ui,sans-serif" font-size="17" fill="#1d1a15" fill-opacity="0.55">${raum.thema}${raum.rolle === "kammer" ? "" : ` · ${raum.rolle}`}</text>`);
  }
  const kopf = teile.shift()!;
  return { defs: kopf, inhalt: teile.join("\n") };
}

/**
 * The whole chain in one picture: every level at its own scale, side by side, with the room a
 * transition leaves from outlined and joined to the artefact it leads into. RB-21a §3.5 insists
 * the step between two maps is **named and addressable, never a zoom** — so it is drawn as a line
 * between two separate drawings and never as one continuous surface.
 */
export function zeichneVerschachtelung(v: Verschachtelung, paket: AssetpaketV1, paketDir = PAKET_DIR): string {
  const LUECKE = 320;
  const hoechste = Math.max(...v.ebenen.map((e) => e.karte.geometry.size[1]));
  const defs: string[] = [], gruppen: string[] = [], marken: string[] = [];
  const versatz: number[] = [];
  let x = 0;
  for (const [i, ebene] of v.ebenen.entries()) {
    const [breite, hoehe] = ebene.karte.geometry.size;
    const y = (hoechste - hoehe) / 2;
    versatz.push(x);
    // Each level defines its own symbols, so ids are prefixed per level or level 2 would draw
    // level 1's floor.
    const teil = zeichneInneres(ebene, paket, paketDir);
    defs.push(teil.defs.replaceAll('id="a', `id="e${i}a`));
    gruppen.push(`<g transform="translate(${x} ${y})">${teil.inhalt.replaceAll('href="#a', `href="#e${i}a`)}<rect x="0" y="0" width="${breite}" height="${hoehe}" fill="none" stroke="#7a6f5f" stroke-width="6"/></g>`);
    marken.push(`<text x="${x + breite / 2}" y="${y - 34}" text-anchor="middle" font-family="system-ui,sans-serif" font-size="58" fill="#e9e0cb">${i + 1}. ${ebene.knoten[0]!.titel ?? ebene.art} — ${ebene.art}, ${ebene.raeume.length} Räume</text>`);
    x += breite + LUECKE;
  }
  for (const [i, uebergang] of v.uebergaenge.entries()) {
    const eltern = v.ebenen[i]!, kind = v.ebenen[i + 1]!;
    const raum = eltern.raeume.find((raumX) => raumX.id === uebergang.von)!;
    const zelle = eltern.karte.grid.kind === "square" ? eltern.karte.grid.size : 64;
    const ex = versatz[i]!, ey = (hoechste - eltern.karte.geometry.size[1]) / 2;
    const kx = versatz[i + 1]!, ky = (hoechste - kind.karte.geometry.size[1]) / 2;
    marken.push(`<rect x="${ex + raum.zellen[0] * zelle}" y="${ey + raum.zellen[1] * zelle}" width="${raum.zellen[2] * zelle}" height="${raum.zellen[3] * zelle}" fill="none" stroke="#dd8a33" stroke-width="10"/>`);
    const vonX = ex + (raum.zellen[0] + raum.zellen[2]) * zelle, vonY = ey + (raum.zellen[1] + raum.zellen[3] / 2) * zelle;
    const nachY = ky + kind.karte.geometry.size[1] / 2;
    marken.push(`<path d="M${vonX} ${vonY} C${vonX + 160} ${vonY}, ${kx - 160} ${nachY}, ${kx} ${nachY}" fill="none" stroke="#dd8a33" stroke-width="8" stroke-dasharray="26 18"/>`);
    marken.push(`<text x="${(vonX + kx) / 2}" y="${(vonY + nachY) / 2 - 22}" text-anchor="middle" font-family="system-ui,sans-serif" font-size="50" fill="#dd8a33">Übergang · Maßstab ${uebergang.massstab.toFixed(2)}</text>`);
  }
  // Level labels are centred on their map and the last one overhangs, so the frame carries a
  // margin instead of clipping the caption of the deepest artefact.
  const RAND = 260;
  const gesamt = x - LUECKE + RAND * 2;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-RAND} -140 ${gesamt} ${hoechste + 200}" width="${gesamt}" height="${hoechste + 200}">`,
    `<rect x="${-RAND}" y="-140" width="${gesamt}" height="${hoechste + 200}" fill="#14120f"/>`,
    ...defs, ...gruppen, ...marken, "</svg>", "",
  ].join("\n");
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1].replace(/\\/g, "/")}`).href) {
  const argumente = process.argv.slice(2);
  const ausIndex = argumente.indexOf("--aus");
  const ziel = ausIndex >= 0 ? argumente[ausIndex + 1]! : join(ROOT, "design", "spikes", "grundriss", "grundriss.svg");
  const keim = argumente.find((a) => !a.startsWith("--") && a !== ziel) ?? "eron:kellergewoelbe:1";
  const paket = ladePaket();
  if (argumente.includes("--verschachtelt")) {
    const v = erzeugeVerschachtelt({
      keim,
      ebenen: [
        { art: "grundriss", titel: "Haus Vharon", optionen: { zellen: [34, 26], raeume: 7 } },
        { art: "hoehle", titel: "Der Hohlgang", optionen: { zellen: [20, 18], kammern: 4 } },
        { art: "grundriss", titel: "Der Schrein", optionen: { zellen: [14, 12], raeume: 3, minRaum: 2 } },
      ],
    }, paket);
    mkdirSync(dirname(ziel), { recursive: true });
    writeFileSync(ziel, zeichneVerschachtelung(v, paket), "utf8");
    console.log(`${ziel}\n  keim=${keim}`);
    console.log(`  Kette: ${v.bericht.kette.join(" > ")}`);
    console.log(`  Maßstäbe: ${v.bericht.massstaebe.map((m) => m.toFixed(3)).join(", ")} · ${v.bericht.knoten} Knoten`);
    process.exit(0);
  }
  const hoehle = argumente.includes("--hoehle");
  const grundriss = hoehle
    ? erzeugeHoehle({ keim, titel: "Vorschau", optionen: { zellen: [44, 32], kammern: 6 } }, paket)
    : erzeugeGrundriss({ keim, titel: "Vorschau", optionen: { zellen: [40, 30], raeume: 9, schleifen: 2 } }, paket);
  mkdirSync(dirname(ziel), { recursive: true });
  writeFileSync(ziel, zeichneGrundriss(grundriss, paket), "utf8");
  const b = grundriss.bericht;
  console.log(`${ziel}\n  art=${grundriss.art} keim=${keim} keimHash=${grundriss.keim.keimHash.slice(0, 16)}…`);
  console.log(`  ${b.raeume} Räume · ${b.tueren} Türen · ${b.waende} Wandläufe · ${b.lichter} Lichter · ${b.stamps} Stamps · ${b.bodenzellen} Bodenzellen (${b.gangzellen} Gang)`);
  console.log(`  Themen: ${Object.entries(b.themen).map(([k, v]) => `${k}×${v}`).join(", ")}`);
  if (b.nichtBedient.length) console.log(`  nicht bedient: ${b.nichtBedient.join(", ")}`);
  if (b.nichtPlatziert.length) console.log(`  nicht platziert: ${b.nichtPlatziert.length}`);
}
