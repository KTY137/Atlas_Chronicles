// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import sharp from "sharp";
import { ASSET_GENRES, parseAssetpaket } from "@chronicle/szene";
import { bauePaket } from "../assets/tusche.mjs";
import { genreKonfiguration } from "../assets/erzeuge-genrepaket.mjs";
import { GENRES } from "../assets/genre-tusche.mjs";

const files = bauePaket(genreKonfiguration), pack = parseAssetpaket(files.get("paket.json"));
const geometry = svg => [...svg.replace(/<defs>[\s\S]*?<\/defs>/g, "").matchAll(/<(?:rect|circle|ellipse|line|path|polygon|g)\b[^>]*>/g)]
  .map(([element]) => element.replace(/\s(?:fill|stroke|stroke-width|stroke-linecap|stroke-linejoin|opacity|fill-opacity|stroke-opacity|filter|clip-path|id)="[^"]*"/g, "")).join("");

test("300 new drawings cover twelve genres with functional variety, not recolored duplicates", () => {
  assert.deepEqual(GENRES, [...ASSET_GENRES]); assert.equal(pack.assets.length, 300);
  for (const key of ["name", "datei", "sha256"]) assert.equal(new Set(pack.assets.map(asset => asset[key])).size, 300, key);
  const shapes = pack.assets.map(asset => geometry(files.get(asset.datei)));
  assert.equal(new Set(shapes).size, 300, "distinct compositions beyond colors and IDs");
  const priorShapes = new Set(), root = fileURLToPath(new URL("../../assets/packs", import.meta.url));
  for (const name of readdirSync(root).filter(name => name !== "pk.genres")) {
    const previous = JSON.parse(readFileSync(join(root, name, "paket.json"), "utf8"));
    for (const asset of previous.assets.filter(asset => asset.mimeType === "image/svg+xml")) priorShapes.add(geometry(readFileSync(join(root, name, asset.datei), "utf8")));
  }
  for (const [i, shape] of shapes.entries()) assert.ok(!priorShapes.has(shape), `${pack.assets[i].name} repeats existing artwork`);
  for (const genre of GENRES) {
    const assets = pack.assets.filter(asset => asset.schlagworte.includes(`genre_${genre}`));
    assert.equal(assets.length, 25, genre);
    for (const [art, count] of [["boden", 3], ["wand", 1], ["tuer", 1], ["licht", 1], ["gefaess", 1]]) assert.equal(assets.filter(asset => asset.art === art).length, count, `${genre}/${art}`);
    assert.ok(assets.filter(asset => asset.art === "aufbau").length >= 2, `${genre}: architecture and outdoor props`);
    assert.ok(assets.filter(asset => asset.art === "moebel").length >= 5, `${genre}: interior props`);
    for (const asset of assets) assert.equal(asset.schlagworte.filter(tag => tag.startsWith("genre_")).length, 1, asset.name);
  }
});

test("every genre drawing rasterizes at 64 and 128 pixels, with consistent footprints and opaque floor tiles", async () => {
  const ids = new Set();
  for (const asset of pack.assets) {
    assert.deepEqual(asset.groesse, asset.einheiten.map(value => value * 64));
    assert.deepEqual(asset.anker, asset.groesse.map(value => value / 2));
    const svg = files.get(asset.datei);
    for (const [, id] of svg.matchAll(/\bid="([^"]+)"/g)) { assert.ok(!ids.has(id), `duplicate SVG id ${id}`); ids.add(id); }
    for (const size of [64, 128]) {
      const { data, info } = await sharp(Buffer.from(svg)).resize(size, size, { fit: "inside" }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      assert.equal(Math.max(info.width, info.height), size);
      let visible = 0, opaque = 0;
      for (let i = 3; i < data.length; i += 4) { if (data[i] > 32) visible++; if (data[i] === 255) opaque++; }
      assert.ok(visible > info.width * info.height * .06, `${asset.name}: visible silhouette at ${size}px`);
      if (asset.art === "boden") { assert.equal(asset.kachelbar, true); assert.equal(opaque, info.width * info.height, `${asset.name}: no transparent tile seams`); }
    }
  }
});
