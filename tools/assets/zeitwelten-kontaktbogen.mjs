#!/usr/bin/env node
// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
// Reproducible review artifacts; kept outside the distributable asset pack.
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import sharp from "sharp";
import { bauePaket } from "./tusche.mjs";
import { zeitweltenKonfiguration } from "./erzeuge-zeitweltenpaket.mjs";

const root = fileURLToPath(new URL("../..", import.meta.url));
const out = join(root, ".local", "map-expansion");
const files = bauePaket(zeitweltenKonfiguration);
const { assets } = JSON.parse(files.get("paket.json"));
const escape = text => text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll('"', "&quot;");
const label = (text, width, height = 28) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><text x="${width / 2}" y="16" font-family="sans-serif" font-size="10" fill="#263b43" text-anchor="middle">${escape(text)}</text></svg>`);
await mkdir(out, { recursive: true });

for (const size of [64, 128]) {
  const cellWidth = 166, cellHeight = size + 58, layers = [];
  for (const [i, asset] of assets.entries()) {
    const left = i % 10 * cellWidth, top = Math.floor(i / 10) * cellHeight;
    const picture = await sharp(Buffer.from(files.get(asset.datei))).resize(size, size, { fit: "contain", background: "#e4e8df" }).png().toBuffer();
    layers.push({ input: picture, left: left + Math.floor((cellWidth - size) / 2), top: top + 8 });
    layers.push({ input: label(`${i + 1}. ${asset.name}`, cellWidth), left, top: top + size + 14 });
    layers.push({ input: label(`${asset.einheiten.join(" × ")} · ${asset.art}`, cellWidth, 20), left, top: top + size + 34 });
  }
  await sharp({ create: { width: 1660, height: cellHeight * Math.ceil(assets.length / 10), channels: 4, background: "#e4e8df" } }).composite(layers).png().toFile(join(out, `asset-contact-sheet-${size}.png`));
}

const floors = assets.filter(asset => asset.kachelbar), tileSize = 64, spacing = 20, block = tileSize * 4 + spacing;
const layers = [];
for (const [index, asset] of floors.entries()) {
  const image = await sharp(Buffer.from(files.get(asset.datei))).resize(tileSize, tileSize).png().toBuffer();
  const left = index % 4 * block, top = Math.floor(index / 4) * (block + 28);
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) layers.push({ input: image, left: left + x * tileSize, top: top + y * tileSize });
  layers.push({ input: label(asset.name, tileSize * 4), left, top: top + tileSize * 4 + 4 });
}
await sharp({ create: { width: block * 4, height: Math.ceil(floors.length / 4) * (block + 28), channels: 4, background: "#e4e8df" } }).composite(layers).png().toFile(join(out, "asset-floor-tiles-4x4.png"));

const cards = assets.map((asset, i) => `<article data-search="${escape(`${asset.name} ${asset.art} ${asset.schlagworte.join(" ")}`)}"><img src="data:image/svg+xml;base64,${Buffer.from(files.get(asset.datei)).toString("base64")}" alt="${escape(asset.name)}"><strong>${i + 1}. ${escape(asset.name)}</strong><span>${asset.einheiten.join(" × ")} Zellen · ${asset.art}</span><small>${asset.schlagworte.join(" · ")}</small></article>`).join("\n");
await writeFile(join(out, "asset-contact-sheet.html"), `<!doctype html><html lang="de"><meta charset="utf-8"><title>Zeitwelten · ${assets.length} Kartenassets</title><style>body{margin:32px;background:#edf0e8;color:#263b43;font:14px system-ui}h1{font-size:25px}header{position:sticky;top:0;background:#edf0e8;padding:12px 0;z-index:1}button,input{font:inherit;padding:8px;margin:0 8px 8px 0}main{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:16px}article{display:flex;align-items:center;flex-direction:column;background:#e4e8df;border:1px solid #c1ccc3;border-radius:9px;padding:12px;gap:7px}article img{width:128px;height:128px;object-fit:contain}article strong{font-size:12px}article small{font-size:11px;line-height:1.4;text-align:center;color:#52676a}article span{font-size:12px}[hidden]{display:none!important}.compact img{width:64px;height:64px}</style><header><h1>Zeitwelten · ${assets.length} eigenständige Draufsichten</h1><p>${zeitweltenKonfiguration.paketId} ${zeitweltenKonfiguration.version} · CC0 · Metall, Keramik, Glas und Holz · 64 Pixel je Rasterzelle</p><input aria-label="Assets filtern" placeholder="Asset, Kategorie oder Tag suchen" oninput="for(const card of document.querySelectorAll('article'))card.hidden=!card.dataset.search.includes(this.value.toLowerCase())"><button onclick="document.querySelector('main').classList.toggle('compact')">64 / 128 Pixel</button><a href="asset-floor-tiles-4x4.png">Böden in 4 × 4 Kachelung</a></header><main>${cards}</main></html>\n`, "utf8");
console.log(`Contact sheets: ${out} (${assets.length} assets at 64/128 px; ${floors.length} floors tiled 4 × 4)`);
