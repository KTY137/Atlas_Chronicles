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
import { erzeugeGrundriss, type Grundriss, type GrundrissOptionen } from "../src/index.ts";

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
  for (const raum of grundriss.raeume) {
    const [zx, zy, zw, zh] = raum.zellen;
    const g = grundriss.karte.grid.kind === "square" ? grundriss.karte.grid.size : 64;
    teile.push(`<text x="${(zx + zw / 2) * g}" y="${(zy + zh / 2) * g}" text-anchor="middle" font-family="system-ui,sans-serif" font-size="17" fill="#1d1a15" fill-opacity="0.55">${raum.thema}${raum.rolle === "kammer" ? "" : ` · ${raum.rolle}`}</text>`);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${breite} ${hoehe}" width="${breite}" height="${hoehe}">\n${teile.join("\n")}\n</svg>\n`;
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1].replace(/\\/g, "/")}`).href) {
  const argumente = process.argv.slice(2);
  const ausIndex = argumente.indexOf("--aus");
  const ziel = ausIndex >= 0 ? argumente[ausIndex + 1]! : join(ROOT, "design", "spikes", "grundriss", "grundriss.svg");
  const keim = argumente.find((a) => !a.startsWith("--") && a !== ziel) ?? "eron:kellergewoelbe:1";
  const optionen: Partial<GrundrissOptionen> = { zellen: [40, 30], raeume: 9, schleifen: 2 };
  const paket = ladePaket();
  const grundriss = erzeugeGrundriss({ keim, titel: "Vorschau", optionen }, paket);
  mkdirSync(dirname(ziel), { recursive: true });
  writeFileSync(ziel, zeichneGrundriss(grundriss, paket), "utf8");
  const b = grundriss.bericht;
  console.log(`${ziel}\n  keim=${keim} keimHash=${grundriss.keim.keimHash.slice(0, 16)}…`);
  console.log(`  ${b.raeume} Räume · ${b.tueren} Türen · ${b.waende} Wandläufe · ${b.lichter} Lichter · ${b.stamps} Stamps · ${b.bodenzellen} Bodenzellen (${b.gangzellen} Gang)`);
  console.log(`  Themen: ${Object.entries(b.themen).map(([k, v]) => `${k}×${v}`).join(", ")}`);
  if (b.nichtBedient.length) console.log(`  nicht bedient: ${b.nichtBedient.join(", ")}`);
  if (b.nichtPlatziert.length) console.log(`  nicht platziert: ${b.nichtPlatziert.length}`);
}
