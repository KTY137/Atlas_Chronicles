// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { bauePaket, erzeugePaket } from "../assets/tusche.mjs";
import { expeditionKonfiguration as config } from "../assets/erzeuge-expeditionspaket.mjs";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const PACK = join(ROOT, "assets/packs/pk.expedition");
const sha256 = text => createHash("sha256").update(text).digest("hex");
const expectedNames = "farnbusch wurzelwerk dornenranke seerosen riesenblatt lianenbuendel wacholderbusch treibholz kristalldruse stalagmitengruppe felsbogen schuttfaecher spinnennetz pilzring fossilienskelett runenplatte expeditionszelt schlafrolle reiserucksack kochdreibein vorratsnetz brennholzstapel kletterseil lagerplane".split(" ");
const built = bauePaket(config);
const manifest = JSON.parse(built.get("paket.json"));

async function inventory(dir, prefix = "") {
  const names = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const name = prefix + entry.name;
    if (entry.isDirectory()) names.push(...await inventory(join(dir, entry.name), name + "/"));
    else names.push(name);
  }
  return names.sort();
}

test("24 named, distinct compositions, not recoloured duplicates", () => {
  assert.deepEqual(manifest.assets.map(asset => asset.name), expectedNames);
  const shapes = manifest.assets.map(asset => built.get(asset.datei)
    .replace(/<title>[^<]*<\/title>/g, "")
    .replace(/#[a-f0-9]{6}/gi, "COLOUR"));
  assert.equal(new Set(shapes).size, 24);
});

test("eight motifs per area; no accidental era or generator-style promise", () => {
  for (const area of ["wald", "hoehle", "lager"]) {
    // The second tag is the primary area; pilzring also has a useful secondary wald tag.
    assert.equal(manifest.assets.filter(asset => asset.schlagworte[1] === area).length, 8);
  }
  for (const asset of manifest.assets) {
    assert.equal(new Set(asset.schlagworte).size, asset.schlagworte.length);
    assert.ok(asset.schlagworte.includes("expedition"));
    assert.ok(!asset.schlagworte.some(tag => tag.startsWith("genre_") || ["gegenwart", "scifi", "fantasy"].includes(tag)));
    assert.equal(asset.kachelbar, false);
  }
});

test("all 26 committed files reproduce exactly; no missing or orphaned files", async () => {
  assert.deepEqual(await inventory(PACK), [...built.keys()].sort());
  for (const [name, bytes] of built) assert.equal(await readFile(join(PACK, name), "utf8"), bytes, name);
  assert.deepEqual([...bauePaket(config)], [...built], "second build must be byte-identical");
});

test("hashes, UTF-8 byte counts, footprints, centred anchors and viewBoxes agree", () => {
  assert.equal(manifest.lizenz.textSha256, sha256(built.get("lizenz.txt")));
  for (const asset of manifest.assets) {
    const bytes = built.get(asset.datei);
    assert.equal(asset.sha256, sha256(bytes), asset.name);
    assert.equal(asset.bytes, Buffer.byteLength(bytes), asset.name);
    assert.deepEqual(asset.groesse, asset.einheiten.map(n => n * config.zelle));
    assert.deepEqual(asset.anker, asset.groesse.map(n => n / 2));
    assert.ok(bytes.includes(`viewBox="0 0 ${asset.groesse.join(" ")}"`), asset.name);
  }
});

test("CLI --pruefe succeeds on the committed pack", () => {
  const result = spawnSync(process.execPath, [join(ROOT, "tools/assets/erzeuge-expeditionspaket.mjs"), "--pruefe"], { encoding: "utf8", timeout: 10000 });
  assert.equal(result.status, 0, result.error?.message ?? result.stderr);
  assert.match(result.stdout, /26 Dateien identisch reproduziert/);
});

test("read-only checking rejects tampering, missing assets, missing licence and orphans", async t => {
  const cases = [
    ["tampered asset", dir => writeFile(join(dir, "aufbau/farnbusch.svg"), "changed")],
    ["missing asset", dir => rm(join(dir, "aufbau/farnbusch.svg"))],
    ["missing licence", dir => rm(join(dir, "lizenz.txt"))],
    ["orphan", dir => writeFile(join(dir, "orphan.svg"), "unlisted")],
  ];
  const script = `import { erzeugePaket } from ${JSON.stringify(new URL("../assets/tusche.mjs", import.meta.url).href)};
import { expeditionKonfiguration } from ${JSON.stringify(new URL("../assets/erzeuge-expeditionspaket.mjs", import.meta.url).href)};
await erzeugePaket(expeditionKonfiguration, process.argv[1], ["--pruefe"]);`;
  for (const [name, mutate] of cases) await t.test(name, async () => {
    const dir = await mkdtemp(join(tmpdir(), "atlas-expedition-"));
    try {
      await erzeugePaket(config, dir, []);
      await mutate(dir);
      const before = await inventory(dir);
      const hashes = await Promise.all(before.map(async path => sha256(await readFile(join(dir, path)))));
      const result = spawnSync(process.execPath, ["--input-type=module", "-e", script, dir], { encoding: "utf8", timeout: 10000 });
      assert.equal(result.status, 1, result.error?.message ?? result.stderr);
      assert.match(result.stderr, /--pruefe ROT/);
      assert.deepEqual(await inventory(dir), before, "check must not repair the fixture");
      assert.deepEqual(await Promise.all(before.map(async path => sha256(await readFile(join(dir, path))))), hashes);
    } finally { await rm(dir, { recursive: true, force: true }); }
  });
});
