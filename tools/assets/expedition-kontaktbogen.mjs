#!/usr/bin/env node
// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { bauePaket } from "./tusche.mjs";
import { expeditionKonfiguration as config } from "./erzeuge-expeditionspaket.mjs";
const files = bauePaket(config);
const pack = JSON.parse(files.get("paket.json"));
const escape = value => String(value).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const groups = [["wald", "Wald und Ufer"], ["hoehle", "Höhlen und Ruinen"], ["lager", "Lager und Ausrüstung"]];
const html = `<!doctype html><html lang="de"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Atlas Chronicles – Expeditionen</title><style>
body{margin:2rem auto;padding:0 1rem;max-width:1200px;background:#f1ede3;color:#283b36;font:16px system-ui,sans-serif}h1{font-size:2rem}section{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:1rem}figure{margin:0;padding:1rem;background:#fbf8f0;border:1px solid #d8d4c9;border-radius:10px}img{width:128px;height:128px;object-fit:contain;display:block;margin:auto}small{display:block;margin-top:.4rem;color:#58675f}a{color:inherit}h2{margin-top:2rem}
</style><h1>Wildnis &amp; Expeditionen</h1><p>24 zusätzliche Vektor-Kartenassets · pk.expedition 1.0.0 · CC0-1.0</p>${groups.map(([area, title]) => `<h2>${title}</h2><section>${pack.assets.filter(a => a.schlagworte[1] === area).map(a => {
  const source = files.get(a.datei), title = source.match(/<title>([^<]+)<\/title>/)?.[1] ?? a.name;
  const uri = "data:image/svg+xml;base64," + Buffer.from(source).toString("base64");
  return `<figure><img src="${uri}" alt="${escape(title)}"><figcaption>${escape(title)}<small>${a.einheiten.join(" × ")} Zellen · ${escape(a.art)}</small><a download="${escape(a.name)}.svg" href="${uri}">SVG herunterladen</a></figcaption></figure>`;
}).join("")}</section>`).join("")}</html>`;
const target = fileURLToPath(new URL("../../.local/expedition-assets/", import.meta.url));
await mkdir(target, { recursive: true });
await writeFile(join(target, "galerie.html"), html, "utf8");
console.log(join(target, "galerie.html"));
