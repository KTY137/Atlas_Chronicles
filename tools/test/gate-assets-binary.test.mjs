import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { cp, mkdir, mkdtemp, rm, symlink, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";
import test from "node:test";

const root = fileURLToPath(new URL("../..", import.meta.url));
const sha256 = bytes => createHash("sha256").update(bytes).digest("hex");
const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><path d="M0 0h1v1H0z"/></svg>';

// A complete synthetic 1x1 RGBA PNG. Its inert text chunk deliberately contains an SVG
// execution marker: only assets declared as SVG should undergo source-text inspection.
function chunk(type, payload) {
  const body = Buffer.concat([Buffer.from(type, "ascii"), payload]);
  let crc = 0xffffffff;
  for (const byte of body) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  const length = Buffer.alloc(4), checksum = Buffer.alloc(4);
  length.writeUInt32BE(payload.length); checksum.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
  return Buffer.concat([length, body, checksum]);
}
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(1, 0); ihdr.writeUInt32BE(1, 4); ihdr[8] = 8; ihdr[9] = 6;
const png = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr),
  chunk("tEXt", Buffer.from('Comment\0<script>alert("inert PNG metadata")</script>')),
  chunk("IDAT", deflateSync(Buffer.from([0, 128, 64, 32, 255]))), chunk("IEND", Buffer.alloc(0)),
]);

test("asset gate checks raw binary identity and preserves SVG-only validation", async t => {
  const fixture = await mkdtemp(join(tmpdir(), "atlas-gate-assets-binary-"));
  const modules = join(fixture, "node_modules"), pack = join(fixture, "assets/packs/pk.binary-fixture");
  let linked = false;
  t.after(async () => {
    // Unlink the shared dependency junction first; recursive cleanup only owns our temp root.
    if (linked) await unlink(modules);
    const safeParent = resolve(tmpdir()) + sep;
    assert.ok(resolve(fixture).startsWith(safeParent));
    assert.ok(resolve(fixture).slice(safeParent.length).startsWith("atlas-gate-assets-binary-"));
    await rm(fixture, { recursive: true, force: true });
  });
  await mkdir(join(fixture, "tools/assets"), { recursive: true });
  await mkdir(pack, { recursive: true });
  // Execute the actual gate unchanged, including its real parser and author-script check.
  // No repository asset, dependency, gate source, shared cache, database or port is mutated.
  await cp(join(root, "tools/gate-assets.mjs"), join(fixture, "tools/gate-assets.mjs"));
  // Whole directories, not named files: the gate reproduces every pack in its ERZEUGER list from
  // source, and those scripts share tools/assets/tusche.mjs. Staging by name meant a second pack
  // (or a shared module) silently broke this fixture instead of the thing it is meant to guard.
  await cp(join(root, "tools/assets"), join(fixture, "tools/assets"), { recursive: true });
  await cp(join(root, "assets/packs"), join(fixture, "assets/packs"), { recursive: true });
  await symlink(join(root, "node_modules"), modules, process.platform === "win32" ? "junction" : "dir");
  linked = true;
  const licenceText = "Synthetic regression fixture only; no project artwork or distribution grant.\n";
  await writeFile(join(pack, "license.txt"), licenceText);

  const run = async (bytes, mimeType, identity = {}) => {
    const manifest = {
      schemaVersion: 1, kind: "asset-pack", id: "pk.binary-fixture", titel: "Binary gate regression", version: "1.0.0",
      urheber: "Regression fixture", zellgroesse: 1,
      lizenz: { spdx: "LicenseRef-TestFixture", inhaber: "Regression fixture", herkunft: "eigen", quelle: null,
        datei: "license.txt", textSha256: sha256(licenceText) },
      assets: [{ name: "pixel", art: "marke", datei: "pixel.bin", mimeType, sha256: sha256(bytes), bytes: bytes.length,
        groesse: [1, 1], anker: [0, 0], einheiten: [1, 1], kachelbar: false, schlagworte: ["test"], lizenz: null, ...identity }],
    };
    await writeFile(join(pack, "pixel.bin"), bytes);
    await writeFile(join(pack, "paket.json"), JSON.stringify(manifest));
    const result = spawnSync(process.execPath, ["--import", import.meta.resolve("tsx"), join(fixture, "tools/gate-assets.mjs")],
      { cwd: fixture, encoding: "utf8", timeout: 30_000, windowsHide: true });
    assert.ifError(result.error);
    return { code: result.status, output: result.stdout + result.stderr };
  };

  await t.test("accepts the ordinary SVG pack baseline", async () => {
    const result = await run(Buffer.from(svg), "image/svg+xml");
    assert.equal(result.code, 0, result.output);
  });
  await t.test("accepts PNG raw SHA-256 and byte length, even with inert script text", async () => {
    const result = await run(png, "image/png");
    assert.equal(result.code, 0, result.output);
  });
  await t.test("rejects a manifest forged from lossy UTF-8 decoding of PNG bytes", async () => {
    const decoded = png.toString("utf8");
    assert.notEqual(sha256(decoded), sha256(png));
    assert.notEqual(Buffer.byteLength(decoded), png.length);
    const result = await run(png, "image/png", { sha256: sha256(decoded), bytes: Buffer.byteLength(decoded) });
    assert.equal(result.code, 1, result.output);
    assert.match(result.output, /sha256 mismatch/);
    assert.match(result.output, /byte count mismatch/);
  });
  await t.test("still rejects executable SVG content", async () => {
    const result = await run(Buffer.from(svg.replace("</svg>", "<script>alert(1)</script></svg>")), "image/svg+xml");
    assert.equal(result.code, 1, result.output);
    assert.match(result.output, /SVG contains script element/);
  });
  await t.test("still rejects SVG viewBox disagreement", async () => {
    const result = await run(Buffer.from(svg.replace('viewBox="0 0 1 1"', 'viewBox="0 0 2 2"')), "image/svg+xml");
    assert.equal(result.code, 1, result.output);
    assert.match(result.output, /declared groesse 1x1/);
  });
});
