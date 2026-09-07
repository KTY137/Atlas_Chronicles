// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";
import test from "node:test";

/**
 * Gate **A-P2 · Der Fremdimport.**
 *
 * `assetpaket.ts` sieht `herkunft: "extern"` seit dem ersten Tag vor, aber nichts konnte so ein
 * Paket bauen — jede freie Sammlung im Netz war damit praktisch unerreichbar, egal wie klar ihre
 * Lizenz war. `importiere-fremdpaket.mjs` ist der Weg dorthin, und weil er fremde Bytes in den
 * Vertrag hebt, ist er genau die Stelle, an der Nachlässigkeit teuer wird.
 *
 * Geprüft wird deshalb nicht, dass das Skript läuft, sondern dass es sich **weigert**:
 * ohne Lizenztext, ohne Quelladresse, mit einer Quelladresse, die Zugangsdaten trägt. Das sind
 * die drei Zusagen, die `herkunft: "extern"` überhaupt erst tragbar machen (RB-21c, RB-21d §6.1).
 * Dass ein gültiger Lauf ein Paket erzeugt, das der kanonische Parser annimmt, ist die vierte.
 */

const root = fileURLToPath(new URL("../..", import.meta.url));
const skript = join(root, "tools/assets/importiere-fremdpaket.mjs");

/** Ein vollständiges 2x3-RGBA-PNG. Die Abmessungen müssen echt im IHDR stehen — genau die liest
 *  der Importeur, und genau die prüft das Gate später gegen das Manifest. */
function png(breite, hoehe) {
  const chunk = (typ, nutzlast) => {
    const koerper = Buffer.concat([Buffer.from(typ, "ascii"), nutzlast]);
    let crc = 0xffffffff;
    for (const byte of koerper) { crc ^= byte; for (let b = 0; b < 8; b++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0); }
    const laenge = Buffer.alloc(4), pruef = Buffer.alloc(4);
    laenge.writeUInt32BE(nutzlast.length); pruef.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
    return Buffer.concat([laenge, koerper, pruef]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(breite, 0); ihdr.writeUInt32BE(hoehe, 4); ihdr[8] = 8; ihdr[9] = 6;
  const roh = Buffer.alloc(hoehe * (1 + breite * 4));
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(roh)), chunk("IEND", Buffer.alloc(0)),
  ]);
}

const LIZENZ = "Creative Commons Zero v1.0 Universal.\nDies ist ein Prüfstandstext, keine echte Lizenz.\n";

async function fixture() {
  const dir = await mkdtemp(join(tmpdir(), "atlas-fremdimport-"));
  await mkdir(join(dir, "quelle", "moebel"), { recursive: true });
  await mkdir(join(dir, "ziel"), { recursive: true });
  await writeFile(join(dir, "quelle", "moebel", "Alter Tisch.png"), png(96, 64));
  await writeFile(join(dir, "quelle", "moebel", "stuhl.svg"),
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" fill="#888"/></svg>\n');
  await writeFile(join(dir, "quelle", "liesmich.txt"), "kein Bild\n");
  await writeFile(join(dir, "lizenz.txt"), LIZENZ);
  return dir;
}

const lauf = (dir, extra) => spawnSync(process.execPath, [
  skript, "--quelle", join(dir, "quelle"), "--ziel", join(dir, "ziel"),
  "--id", "pk.pruefstand", "--titel", "Prüfstand", "--urheber", "Fremdautor",
  "--spdx", "CC0-1.0", "--zellgroesse", "64", ...extra,
], { encoding: "utf8", timeout: 30_000, windowsHide: true });

test("A-P2 · Fremdimport hebt fremde Bytes in den Vertrag — oder weigert sich", async (t) => {
  const dir = await fixture();
  t.after(async () => {
    const sicher = resolve(tmpdir()) + sep;
    assert.ok(resolve(dir).startsWith(sicher) && resolve(dir).slice(sicher.length).startsWith("atlas-fremdimport-"));
    await rm(dir, { recursive: true, force: true });
  });

  await t.test("weigert sich ohne mitgelieferten Lizenztext", () => {
    const r = lauf(dir, ["--herkunft-url", "https://example.org/pack"]);
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /--lizenz/);
  });

  await t.test("weigert sich ohne benannte Quelle", () => {
    const r = lauf(dir, ["--lizenz", join(dir, "lizenz.txt")]);
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /herkunft-url/);
  });

  await t.test("weigert sich bei einer Quelladresse mit Zugangsdaten", () => {
    const r = lauf(dir, ["--lizenz", join(dir, "lizenz.txt"), "--herkunft-url", "https://nutzer:geheim@example.org/pack"]);
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /Zugangsdaten/);
  });

  await t.test("erzeugt aus einem gültigen Lauf ein Manifest, das der Vertrag annimmt", async () => {
    const r = lauf(dir, ["--lizenz", join(dir, "lizenz.txt"), "--herkunft-url", "https://example.org/pack", "--art", "moebel"]);
    assert.equal(r.status, 0, r.stdout + r.stderr);

    const manifest = JSON.parse(await readFile(join(dir, "ziel", "pk.pruefstand", "paket.json"), "utf8"));
    assert.equal(manifest.id, "pk.pruefstand");
    assert.equal(manifest.lizenz.herkunft, "extern");
    assert.equal(manifest.lizenz.quelle, "https://example.org/pack");
    // Der Beleg, nicht der Bezeichner: der Hash steht über dem Text, der wirklich mitgeliefert wird.
    assert.equal(manifest.lizenz.textSha256, createHash("sha256").update(LIZENZ, "utf8").digest("hex"));
    assert.equal(await readFile(join(dir, "ziel", "pk.pruefstand", "lizenz.txt"), "utf8"), LIZENZ);

    assert.equal(manifest.assets.length, 2, "die Nicht-Bilddatei darf nicht im Manifest stehen");
    const nachName = Object.fromEntries(manifest.assets.map((a) => [a.name, a]));

    // Der Dateiname wird zum Bezeichner normalisiert — der Parser nimmt keine Leerzeichen.
    assert.ok(nachName.alter_tisch, `erwartet alter_tisch, bekam ${Object.keys(nachName).join(", ")}`);
    // Gemessen, nicht geglaubt: 96x64 steht so im IHDR, und der Footprint folgt daraus.
    assert.deepEqual(nachName.alter_tisch.groesse, [96, 64]);
    assert.deepEqual(nachName.alter_tisch.einheiten, [2, 1]);
    assert.equal(nachName.alter_tisch.mimeType, "image/png");
    assert.deepEqual(nachName.stuhl.groesse, [32, 32], "die viewBox ist das Mass eines SVG");
    assert.deepEqual(nachName.stuhl.einheiten, [1, 1]);

    // Jede Datei traegt ihren echten Hash und ihre echte Bytezahl — sonst ist das Manifest eine
    // Behauptung ueber Bytes, die niemand nachgerechnet hat.
    for (const asset of manifest.assets) {
      const bytes = await readFile(join(dir, "ziel", "pk.pruefstand", asset.datei));
      assert.equal(createHash("sha256").update(bytes).digest("hex"), asset.sha256, asset.datei);
      assert.equal(bytes.length, asset.bytes, asset.datei);
    }
  });

  await t.test("laesst der kanonischen Pruefung nichts uebrig", async () => {
    const roh = await readFile(join(dir, "ziel", "pk.pruefstand", "paket.json"), "utf8");
    const { parseAssetpaket } = await import("@chronicle/szene");
    const paket = parseAssetpaket(roh);
    assert.equal(paket.assets.length, 2);
    assert.equal(paket.lizenz.herkunft, "extern");
  });
});
