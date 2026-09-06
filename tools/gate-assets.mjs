#!/usr/bin/env node
// Gate A-P1 — "Das Paket".
//
// `SceneDoc.stamps[].a` is a pack-qualified reference and `packages/szene/src/assetpaket.ts` is
// the format it points at. That parser is deliberately browser-pure: it can validate a manifest
// and it can never look at a byte on disk. This gate is the other half, and it checks the four
// things a pure parser structurally cannot:
//
//   1. **The bytes are the bytes.** Every `sha256`/`bytes` row matches the file it names, and the
//      licence text hashes to the `textSha256` that claims it. RB-21d:596: an SPDX identifier is a
//      claim, a hashed licence text is evidence. A manifest that says CC0 over a file nobody
//      hashed is exactly the `NOASSERTION` trap with better manners.
//   2. **No orphans, no strays.** A file in the pack that no manifest row owns is an asset with no
//      licence, shipped. That is the RB-21c failure mode (179 CC-BY-NC-SA charges inside a
//      `public/` nobody enumerated) reproduced at small scale.
//   3. **The SVG is a drawing, not a program.** Packs are content-addressed and will one day be
//      user-supplied. An SVG with `<script>`, an event handler, an external reference or an
//      embedded raster is a delivery vehicle, and the parser cannot see inside the file.
//   4. **The pack reproduces.** `tools/assets/erzeuge-grundrisspaket.mjs --pruefe` must be green,
//      so an asset can never drift away from the code that claims to author it.
//
// The schema itself is NOT re-validated here in a second dialect. This gate imports the one
// canonical parser through tsx and lets it rule. Two validators for one format is the parallel
// stack the constitution forbids.
//
// Run: node --import tsx tools/gate-assets.mjs

import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { readFile, readdir, stat } from "node:fs/promises";
import { join, relative, sep } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { parseAssetpaket, assetIndex } from "@chronicle/szene";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const PACKS = join(ROOT, "assets", "packs");

/** Every author script whose `--pruefe` must be green. One row per pack that is generated. */
const ERZEUGER = [{ paket: "pk.grundriss", skript: "tools/assets/erzeuge-grundrisspaket.mjs" }];

/** Anything that turns a drawing into an execution or a fetch. Case-insensitive, source-level. */
const SVG_VERBOTEN = [
  { muster: /<script[\s>]/i, warum: "script element" },
  { muster: /<foreignObject[\s>]/i, warum: "foreignObject" },
  { muster: /<(?:image|use)[\s>]/i, warum: "external or raster reference element" },
  { muster: /\son[a-z]+\s*=/i, warum: "inline event handler" },
  { muster: /(?:href|xlink:href)\s*=\s*["']?(?!#)/i, warum: "non-fragment href" },
  { muster: /url\s*\(\s*["']?(?!#)/i, warum: "non-fragment url() reference" },
  { muster: /javascript:/i, warum: "javascript: URL" },
  { muster: /<!ENTITY/i, warum: "entity declaration" },
  { muster: /<!DOCTYPE/i, warum: "doctype" },
];

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

async function dateienUnter(dir) {
  const gefunden = [];
  const walk = async (aktuell) => {
    for (const eintrag of await readdir(aktuell, { withFileTypes: true })) {
      const p = join(aktuell, eintrag.name);
      if (eintrag.isDirectory()) await walk(p);
      else gefunden.push(relative(dir, p).split(sep).join("/"));
    }
  };
  await walk(dir);
  return gefunden.sort();
}

async function pruefePaket(paketDir, id, fehler) {
  const melde = (pfad, text) => fehler.push(`${id}/${pfad}: ${text}`);
  let manifestText;
  try { manifestText = await readFile(join(paketDir, "paket.json"), "utf8"); }
  catch { melde("paket.json", "missing manifest"); return null; }

  let paket;
  try { paket = parseAssetpaket(manifestText); }
  catch (error) { melde("paket.json", `rejected by parseAssetpaket — ${error.message}`); return null; }

  if (paket.id !== id) melde("paket.json", `pack id "${paket.id}" must equal its directory name "${id}"`);

  const vorhanden = new Set(await dateienUnter(paketDir));
  vorhanden.delete("paket.json");
  const beansprucht = new Set();

  const lizenzen = [paket.lizenz, ...paket.assets.map((a) => a.lizenz).filter(Boolean)];
  for (const lizenz of lizenzen) {
    if (beansprucht.has(lizenz.datei)) continue;
    beansprucht.add(lizenz.datei);
    let text;
    try { text = await readFile(join(paketDir, lizenz.datei), "utf8"); }
    catch { melde(lizenz.datei, "declared licence text is missing"); continue; }
    if (sha256(text) !== lizenz.textSha256) melde(lizenz.datei, "licence text does not match textSha256");
  }

  for (const asset of paket.assets) {
    beansprucht.add(asset.datei);
    let inhalt;
    try { inhalt = await readFile(join(paketDir, asset.datei)); }
    catch { melde(asset.datei, `declared by asset "${asset.name}" but missing`); continue; }
    if (sha256(inhalt) !== asset.sha256) melde(asset.datei, `sha256 mismatch for asset "${asset.name}"`);
    if (inhalt.length !== asset.bytes) melde(asset.datei, `byte count mismatch for asset "${asset.name}"`);
    if (asset.mimeType === "image/svg+xml") {
      const svg = inhalt.toString("utf8");
      for (const { muster, warum } of SVG_VERBOTEN) if (muster.test(svg)) melde(asset.datei, `SVG contains ${warum}; a pack asset is a drawing, never a program or a fetch`);
      const viewBox = `viewBox="0 0 ${asset.groesse[0]} ${asset.groesse[1]}"`;
      if (!svg.includes(viewBox)) melde(asset.datei, `declared groesse ${asset.groesse.join("x")} is not the authored ${viewBox}`);
    }
  }

  for (const datei of vorhanden) if (!beansprucht.has(datei)) melde(datei, "file in pack is owned by no manifest row; an unlisted file has no licence");

  return paket;
}

async function main() {
  const fehler = [];
  let paketDirs = [];
  try { paketDirs = (await readdir(PACKS, { withFileTypes: true })).filter((e) => e.isDirectory()).map((e) => e.name).sort(); }
  catch { console.error(`gate:assets — no pack directory at ${PACKS}`); process.exit(2); }
  if (!paketDirs.length) { console.error("gate:assets — no packs found"); process.exit(2); }

  const pakete = [];
  for (const id of paketDirs) {
    const paket = await pruefePaket(join(PACKS, id), id, fehler);
    if (paket) pakete.push(paket);
  }

  // Every pack in one index: a duplicate pack id would make `Stamp.a` ambiguous across the product.
  let verweise = 0;
  if (pakete.length) {
    try { verweise = assetIndex(pakete).size; }
    catch (error) { fehler.push(`assets: ${error.message}`); }
  }

  for (const { paket, skript } of ERZEUGER) {
    if (!paketDirs.includes(paket)) { fehler.push(`${paket}: declared generated by ${skript} but the pack is absent`); continue; }
    try { await stat(join(ROOT, skript)); }
    catch { fehler.push(`${skript}: author script for ${paket} is missing`); continue; }
    try { await promisify(execFile)(process.execPath, [join(ROOT, skript), "--pruefe"], { cwd: ROOT }); }
    catch (error) { fehler.push(`${skript} --pruefe failed; the pack no longer reproduces from its source:\n${String(error.stdout ?? "")}${String(error.stderr ?? "")}`.trimEnd()); }
  }

  if (fehler.length) {
    console.error(`\nGATE ROT — Assetpakete (${fehler.length}):\n`);
    for (const zeile of fehler) console.error(`  ${zeile}`);
    console.error("");
    process.exit(1);
  }
  const assets = pakete.reduce((sum, p) => sum + p.assets.length, 0);
  console.log(`gate:assets GREEN — ${pakete.length} pack(s), ${assets} assets, ${verweise} resolvable references, ${ERZEUGER.length} reproduced from source`);
}

await main();
