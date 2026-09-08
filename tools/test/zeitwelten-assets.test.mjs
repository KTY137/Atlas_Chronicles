// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import { bauePaket } from "../assets/tusche.mjs";
import { zeitweltenKonfiguration } from "../assets/erzeuge-zeitweltenpaket.mjs";

const files = bauePaket(zeitweltenKonfiguration);
const { assets } = JSON.parse(files.get("paket.json"));
const eras = ["fantasy", "gegenwart", "scifi"];
const matches = (era, art, tag) => assets.filter(asset => asset.art === art && asset.schlagworte.includes(tag) && !asset.schlagworte.some(t => eras.includes(t) && t !== era));

test("Zeitwelten has exactly 100 independent drawings, not renamed or recolored copies", () => {
  assert.equal(assets.length, 100);
  for (const property of ["name", "datei", "sha256"]) assert.equal(new Set(assets.map(a => a[property])).size, 100, property);
  const geometry = assets.map(asset => {
    const body = files.get(asset.datei).replace(/<defs>[\s\S]*?<\/defs>/g, "");
    return [...body.matchAll(/<(?:rect|circle|ellipse|line|path|polygon|g)\b[^>]*>/g)].map(([element]) => element
      .replace(/\s(?:fill|stroke|stroke-width|stroke-linecap|stroke-linejoin|opacity|fill-opacity|stroke-opacity|filter|clip-path|id)="[^"]*"/g, "")).join("");
  });
  assert.equal(new Set(geometry).size, 100, "each asset needs different geometry beyond palette/IDs");
  assert.deepEqual([...files.keys()].filter(name => !name.endsWith(".svg")).sort(), ["lizenz.txt", "paket.json"]);
});

test("Zeitwelten covers contemporary and sci-fi furniture queries with honest setting tags", () => {
  const furniture = "schreibtisch computer empfang kaffeemaschine kuechenzeile regal kasse kuehlregal krankenbett operation spind werkbank schulbank hotelbett ticket scanner labortisch konsole vitrine tresor sofa mahl sitz rast lager buecher wissen kult handwerk waffe kammer schild".split(" ");
  for (const era of ["gegenwart", "scifi"]) {
    for (const tag of furniture) assert.ok(matches(era, "moebel", tag).length, `${era}:moebel/${tag}`);
    for (const tag of "beton fliesen teppich metall steril wohnraum halle keller gehoben trocken erde stein".split(" ")) assert.ok(matches(era, "boden", tag).length, `${era}:boden/${tag}`);
    for (const tag of ["maschine", "verkehr", "antenne", "aufwaerts", "abwaerts"]) assert.ok(matches(era, "aufbau", tag).length, `${era}:aufbau/${tag}`);
    for (const tag of ["kalt", "warm", "kerze", "wache"]) assert.ok(matches(era, "licht", tag).length, `${era}:licht/${tag}`);
    for (const tag of ["vorrat", "behaelter", "kult"]) assert.ok(matches(era, "gefaess", tag).length, `${era}:gefaess/${tag}`);
    assert.ok(matches(era, "marke", "eingang").length);
  }
  assert.ok(matches("gegenwart", "boden", "asphalt").length);
  assert.ok(matches("gegenwart", "tuer", "drehbar").length);
  assert.ok(matches("scifi", "tuer", "schiebbar").length);
  assert.ok(matches("scifi", "moebel", "kryokapsel").length);
  assert.ok(matches("scifi", "aufbau", "reaktor").length);
  assert.equal(matches("gegenwart", "aufbau", "reaktor").length, 0);
  assert.equal(matches("gegenwart", "moebel", "kryokapsel").length, 0);
  assert.equal(matches("scifi", "aufbau", "auto").length, 0);
  const bulkhead = assets.find(asset => asset.name === "tuer_schott");
  assert.ok(!bulkhead.schlagworte.includes("drehbar"));
  for (const name of ["antenne_parabol", "solardach", "klimadach", "dachgarten"]) assert.ok(assets.find(asset => asset.name === name).schlagworte.includes("dach"), `${name} must render over the roof`);
});

test("all 100 SVGs rasterize visibly at 64 and 128 px; floors cover every pixel", async () => {
  for (const asset of assets) {
    assert.deepEqual(asset.anker, asset.groesse.map(value => value / 2));
    assert.deepEqual(asset.groesse, asset.einheiten.map(value => value * 64));
    for (const size of [64, 128]) {
      const { data, info } = await sharp(Buffer.from(files.get(asset.datei))).resize(size, size, { fit: "inside" }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      assert.equal(Math.max(info.width, info.height), size, asset.name);
      let covered = 0, opaque = 0;
      for (let offset = 3; offset < data.length; offset += 4) {
        if (data[offset] > 32) covered++;
        if (data[offset] === 255) opaque++;
      }
      assert.ok(covered > info.width * info.height * .06, `${asset.name}: visible silhouette at ${size}px`);
      if (asset.kachelbar) assert.equal(opaque, info.width * info.height, `${asset.name}: no transparent tile seams`);
    }
  }
});
