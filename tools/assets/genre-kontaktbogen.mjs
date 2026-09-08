#!/usr/bin/env node
// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import sharp from "sharp";
import { bauePaket } from "./tusche.mjs";
import { genreKonfiguration } from "./erzeuge-genrepaket.mjs";
import { GENRES } from "./genre-tusche.mjs";

const out = fileURLToPath(new URL("../../.local/genre-assets", import.meta.url));
const files = bauePaket(genreKonfiguration), { assets } = JSON.parse(files.get("paket.json"));
const labels = ["Fantasy & Magie", "Gothic & Horror", "Antike", "Wuxia", "Piraten & Seefahrt", "Western", "Steampunk", "Noir & Krimi", "Cyberpunk", "Weltraum", "Postapokalypse", "Unterwasser"];
const escape = text => text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll('"', "&quot;");
const label = (text, width, height = 28, size = 11) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><text x="${width / 2}" y="18" font-family="sans-serif" font-size="${size}" fill="#263b43" text-anchor="middle">${escape(text)}</text></svg>`);
await mkdir(out, { recursive: true });
const overview = [];
for (const [genreIndex, genre] of GENRES.entries()) {
  const items = assets.filter(asset => asset.schlagworte.includes(`genre_${genre}`));
  for (const size of [64, 128]) {
    const cellWidth = 190, cellHeight = size + 58, layers = [{ input: label(labels[genreIndex], cellWidth * 5, 36, 19), left: 0, top: 0 }];
    for (const [i, asset] of items.entries()) {
      const left = i % 5 * cellWidth, top = 40 + Math.floor(i / 5) * cellHeight;
      const picture = await sharp(Buffer.from(files.get(asset.datei))).resize(size, size, { fit: "contain", background: "#e5e8df" }).png().toBuffer();
      layers.push({ input: picture, left: left + Math.floor((cellWidth - size) / 2), top: top + 6 });
      layers.push({ input: label(`${i + 1}. ${asset.name.slice(genre.length + 1)}`, cellWidth), left, top: top + size + 10 });
      layers.push({ input: label(`${asset.einheiten.join(" × ")} · ${asset.art}`, cellWidth, 22, 10), left, top: top + size + 32 });
      if (size === 64) {
        const preview = await sharp(Buffer.from(files.get(asset.datei))).resize(64, 64, { fit: "contain", background: "#e5e8df" }).png().toBuffer();
        const panelX = genreIndex % 4 * 380, panelY = Math.floor(genreIndex / 4) * 418;
        overview.push({ input: preview, left: panelX + i % 5 * 74 + 7, top: panelY + Math.floor(i / 5) * 74 + 40 });
      }
    }
    await sharp({ create: { width: cellWidth * 5, height: cellHeight * 5 + 40, channels: 4, background: "#e5e8df" } }).composite(layers).png().toFile(join(out, `${genre}-${size}.png`));
  }
  overview.push({ input: label(labels[genreIndex], 370, 32, 16), left: genreIndex % 4 * 380, top: Math.floor(genreIndex / 4) * 418 });
  const floors = items.filter(asset => asset.kachelbar), tileLayers = [];
  for (const [i, asset] of floors.entries()) {
    const tile = await sharp(Buffer.from(files.get(asset.datei))).resize(64, 64).png().toBuffer();
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) tileLayers.push({ input: tile, left: i * 280 + x * 64, top: y * 64 });
    tileLayers.push({ input: label(asset.name.slice(genre.length + 1), 256), left: i * 280, top: 260 });
  }
  await sharp({ create: { width: 840, height: 292, channels: 4, background: "#e5e8df" } }).composite(tileLayers).png().toFile(join(out, `${genre}-floors-4x4.png`));
}
await sharp({ create: { width: 1520, height: 1254, channels: 4, background: "#e5e8df" } }).composite(overview).png().toFile(join(out, "300-assets.png"));
const cards = assets.map(asset => {
  const genre = GENRES.find(id => asset.schlagworte.includes(`genre_${id}`));
  return `<article data-genre="${genre}" data-search="${escape(`${asset.name} ${asset.art} ${asset.schlagworte.join(" ")} ${labels[GENRES.indexOf(genre)]}`.toLowerCase())}"><img src="data:image/svg+xml;base64,${Buffer.from(files.get(asset.datei)).toString("base64")}" alt="${escape(asset.name)}"><strong>${escape(asset.name.slice(genre.length + 1).replaceAll("_", " "))}</strong><span>${labels[GENRES.indexOf(genre)]}</span><small>${asset.einheiten.join(" × ")} Zellen · ${asset.art}</small></article>`;
}).join("\n");
await writeFile(join(out, "galerie.html"), `<!doctype html><html lang="de"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Genre-Archiv · 300 Kartenassets</title><style>body{margin:24px;background:#e9ece3;color:#263b43;font:15px system-ui}h1{font-size:30px;margin:8px 0}header{position:sticky;top:0;background:#e9ece3;padding:12px 0;z-index:1}button,input,select{font:inherit;padding:9px;margin:0 8px 8px 0;border:1px solid #9baea5;border-radius:6px;max-width:100%;box-sizing:border-box}main{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:14px}article{display:flex;align-items:center;flex-direction:column;background:#dce4d9;border:1px solid #c0cdc2;border-radius:9px;padding:14px;gap:8px}article img{width:128px;height:128px;object-fit:contain}article strong{font-size:13px;text-align:center}article span,article small{font-size:12px;color:#53666b}[hidden]{display:none!important}.compact img{width:64px;height:64px}details{margin:20px 0}details a{display:inline-block;margin:8px}#count{font-weight:600}</style><header><h1>300 Motive. Zwölf Welten.</h1><p>Genre-Archiv 1.0.0 · neue Draufsichten für Innenräume, Städte und Abenteuer · CC0</p><select id="genre" aria-label="Genre"><option value="all">Alle Genres</option>${GENRES.map((genre, i) => `<option value="${genre}">${labels[i]}</option>`).join("")}</select><input id="search" aria-label="Assets suchen" placeholder="Objekt oder Material suchen"><button id="size">64 / 128 Pixel</button><span id="count">300 Assets</span></header><main>${cards}</main><details><summary>Kontaktbögen und kachelbare Böden</summary>${GENRES.map((genre, i) => `<p>${labels[i]}: <a href="${genre}-128.png">25 Motive</a><a href="${genre}-floors-4x4.png">Böden in 4 × 4</a></p>`).join("")}</details><script>const genre=document.querySelector('#genre'),search=document.querySelector('#search'),cards=[...document.querySelectorAll('article')];function filter(){let count=0;for(const card of cards){card.hidden=(genre.value!=='all'&&card.dataset.genre!==genre.value)||!card.dataset.search.includes(search.value.trim().toLowerCase());if(!card.hidden)count++}document.querySelector('#count').textContent=count+' Assets'}genre.addEventListener('change',filter);search.addEventListener('input',filter);document.querySelector('#size').addEventListener('click',()=>document.querySelector('main').classList.toggle('compact'));</script></html>\n`, "utf8");
console.log(`300 assets, twelve contact sheets at 64/128px and twelve tiled-floor sheets: ${out}`);
