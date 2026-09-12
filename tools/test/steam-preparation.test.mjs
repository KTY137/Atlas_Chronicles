// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, readdir, realpath, rm, symlink, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { measureArtifactFiles } from "../../packages/desktop/tools/package.mjs";
import { verifyArtifactFiles } from "../../packages/desktop/tools/installer.mjs";
import { parseSteamArguments, prepareSteamArtifact, steamPreviewScripts, validateSteamIds } from "../../packages/desktop/tools/steam.mjs";

const workspace = fileURLToPath(new URL("../../", import.meta.url));
const inside = (parent, target) => {
  const suffix = relative(parent, target);
  return suffix && !isAbsolute(suffix) && !suffix.split(sep).includes("..");
};

async function fixture(t) {
  const fixtureRoot = join(workspace, ".local", "steam-preparation-tests");
  await mkdir(fixtureRoot, { recursive: true });
  const root = await realpath(fixtureRoot);
  assert.ok(inside(await realpath(workspace), root));
  const directory = await mkdtemp(join(root, "case-"));
  t.after(async () => {
    const target = await realpath(directory);
    assert.ok(inside(root, target) && dirname(target) === root && relative(root, target).startsWith("case-"));
    await rm(target, { recursive: true, force: true });
  });
  const artifactDirectory = join(directory, "artifact"), source = join(artifactDirectory, "app");
  const files = {
    "AtlasChronicles.exe": "fixed executable", "LICENSE": "Electron MIT license", "LICENSES.chromium.html": "Chromium notices",
    "resources/app/LICENSE": "Atlas license notice",
    "resources/app/package.json": JSON.stringify({ name: "atlas-chronicles", version: "0.4.3", main: "main.cjs", license: "BUSL-1.1" }),
    "resources/app/build.json": JSON.stringify({ electron: "44.2.0", postgres: "17.11" }),
    "resources/app/DEPENDENCIES.json": "{}", "resources/app/main.cjs": "main", "resources/app/worker.cjs": "original worker",
    "resources/app/preload.cjs": "preload", "resources/app/client/index.html": "client", "resources/app/manager/index.html": "manager",
    "resources/app/runtime/runtime.json": "{}", "resources/app/runtime/server_license.txt": "PostgreSQL notices",
    "resources/app/runtime/commandlinetools_3rd_party_licenses.txt": "command-line notices",
    "resources/app/migrations/001_initial.sql": "SELECT 1;",
    ...Object.fromEntries(["postgres", "initdb", "pg_ctl", "pg_dump", "pg_restore"].map(name => [`resources/app/runtime/bin/${name}.exe`, name])),
  };
  for (const [name, content] of Object.entries(files)) {
    await mkdir(dirname(join(source, name)), { recursive: true });
    await writeFile(join(source, name), content);
  }
  let record;
  async function recordSource() {
    const inventory = await measureArtifactFiles(source);
    record = { kind: "unsigned-local-unpacked-windows-app", version: "0.4.3", paths: [source], electron: "44.2.0", postgres: "17.11",
      ...inventory, exeSha256: inventory.files["AtlasChronicles.exe"].sha256, missingReleaseGates: ["reference hardware"], publicRelease: false };
    await writeFile(join(artifactDirectory, "artifact.json"), JSON.stringify(record));
    return record;
  }
  await recordSource();
  return { directory, artifactDirectory, source, outputDirectory: join(directory, "steam"), record, recordSource };
}

// Independent minimal KeyValues reader: validate complete syntax/nesting, not substring presence.
function readVdf(text) {
  const tokens = text.match(/"[^"\r\n]*"|[{}]|\S+/g) ?? [];
  let at = 0;
  function object(nested = false) {
    const result = {};
    while (at < tokens.length) {
      const key = tokens[at++];
      if (key === "}") { assert.ok(nested); return result; }
      assert.match(key, /^"[^"\r\n]*"$/);
      const value = tokens[at++];
      if (value === "{") result[key.slice(1, -1)] = object(true);
      else { assert.match(value, /^"[^"\r\n]*"$/); result[key.slice(1, -1)] = value.slice(1, -1); }
    }
    assert.equal(nested, false, "Every VDF block must close");
    return result;
  }
  return object();
}

test("stages exact content without inventing Steam IDs or copying adjacent artifact evidence", async t => {
  const f = await fixture(t);
  await writeFile(join(f.artifactDirectory, "private-evidence.txt"), "must stay outside depot");
  const prepared = await prepareSteamArtifact(f);
  assert.deepEqual(prepared.steamworks, { appId: null, depotId: null });
  assert.deepEqual(prepared.files, f.record.files);
  assert.deepEqual(await readdir(join(f.outputDirectory, "scripts")), []);
  assert.equal(prepared.launch.executable, "AtlasChronicles.exe");
  assert.equal(prepared.launch.arguments, "");
  assert.equal(prepared.uploaded, false);
  assert.equal(prepared.steamCmdExecuted, false);
  assert.equal(prepared.publicRelease, false);
  assert.ok(prepared.missingReleaseGates.includes("reference hardware"));
  await verifyArtifactFiles(prepared.contentDirectory, f.record);
  await verifyArtifactFiles(f.source, f.record);
  assert.equal(JSON.parse(await readFile(join(f.outputDirectory, "steam-preparation.json"))).artifactRecordSha256.length, 64);
});

test("assigned test IDs produce relocatable preview VDF with depot root launch and no live branch", async t => {
  const f = await fixture(t);
  // Synthetic IDs exist only in this fixture; they are never used for real staging or Steam calls.
  const prepared = await prepareSteamArtifact({ ...f, appId: "123456", depotId: "123457" });
  const app = readVdf(await readFile(join(f.outputDirectory, "scripts/app_build_123456.vdf"), "utf8")).AppBuild;
  const depot = readVdf(await readFile(join(f.outputDirectory, "scripts/depot_build_123457.vdf"), "utf8")).DepotBuild;
  assert.equal(app.Preview, "1");
  assert.equal(app.SetLive, undefined);
  assert.equal(app.ContentRoot, "../content");
  assert.equal(app.BuildOutput, "../output");
  assert.equal(app.Depots["123457"], "depot_build_123457.vdf");
  assert.deepEqual(depot.FileMapping, { LocalPath: "*", DepotPath: ".", Recursive: "1" });
  assert.deepEqual(prepared.steamworks, { appId: "123456", depotId: "123457" });
});

test("IDs and descriptions cannot inject VDF syntax or silently select a sample app", () => {
  assert.equal(validateSteamIds(), null);
  for (const id of ["", "0", "-1", "01", "4294967296", "12\"\nSetLive", "../../480", 480])
    assert.throws(() => steamPreviewScripts(id, "123457", "0.4.3"), /app-id/);
  assert.throws(() => validateSteamIds("123456"), /depot-id/);
  assert.throws(() => validateSteamIds(undefined, "123457"), /app-id/);
  assert.throws(() => validateSteamIds("123456", "123456"), /separate/);
  assert.throws(() => steamPreviewScripts("123456", "123457", "0.4.3\"\n"), /version/);
});

test("a modified worker with unchanged executable and byte count refuses staging", async t => {
  const f = await fixture(t);
  await writeFile(join(f.source, "resources/app/worker.cjs"), "modified worker");
  await assert.rejects(prepareSteamArtifact(f), /resource differs.*worker\.cjs/);
  assert.deepEqual(await readdir(f.directory), ["artifact"]);
});

test("unrecorded content refuses staging", async t => {
  const f = await fixture(t);
  await writeFile(join(f.source, "unexpected.txt"), "unexpected");
  await assert.rejects(prepareSteamArtifact(f), /Unrecorded packaged resource/);
});

test("even recorded secrets and development Steam IDs cannot enter the depot", async t => {
  const f = await fixture(t);
  for (const name of ["steam_appid.txt", "world.dpapi", ".env", "database.dump", "certificate.pfx"]) {
    await writeFile(join(f.source, name), "private");
    await f.recordSource();
    await assert.rejects(prepareSteamArtifact(f), /Private or development-only/);
    await rm(join(f.source, name));
  }
});

test("missing launch/runtime and license files fail before creating output", async t => {
  const f = await fixture(t);
  await rm(join(f.source, "resources/app/runtime/bin/pg_dump.exe"));
  await f.recordSource();
  await assert.rejects(prepareSteamArtifact(f), /resource missing.*pg_dump\.exe/);
  assert.deepEqual(await readdir(f.directory), ["artifact"]);
});

test("metadata mismatch cannot mislabel the staged version", async t => {
  const f = await fixture(t);
  await writeFile(join(f.source, "resources/app/package.json"), JSON.stringify({ name: "atlas-chronicles", version: "0.4.2", main: "main.cjs" }));
  await f.recordSource();
  await assert.rejects(prepareSteamArtifact(f), /metadata differs/);
});

test("existing staging content is preserved", async t => {
  const f = await fixture(t);
  await mkdir(f.outputDirectory);
  await writeFile(join(f.outputDirectory, "sentinel"), "keep");
  await assert.rejects(prepareSteamArtifact(f), { code: "EEXIST" });
  assert.equal(await readFile(join(f.outputDirectory, "sentinel"), "utf8"), "keep");
});

test("a source outside its selected artifact is refused", async t => {
  const f = await fixture(t);
  await writeFile(join(f.artifactDirectory, "artifact.json"), JSON.stringify({ ...f.record, paths: [f.directory] }));
  await assert.rejects(prepareSteamArtifact(f), /must stay inside/);
});

test("staging cannot be nested into or enclose its source artifact", async t => {
  const f = await fixture(t);
  await assert.rejects(prepareSteamArtifact({ ...f, outputDirectory: join(f.artifactDirectory, "steam") }), /must be separate/);
  await assert.rejects(prepareSteamArtifact({ ...f, outputDirectory: f.directory }), /must be separate/);
});

test("junction resources are rejected without traversing their target", async t => {
  const f = await fixture(t);
  await symlink(join(f.source, "resources"), join(f.source, "junction"), process.platform === "win32" ? "junction" : "dir");
  await assert.rejects(prepareSteamArtifact(f), /must not be a link/);
});

test("older artifacts expose their missing Atlas license gate without confusing Electron's notice", async t => {
  const f = await fixture(t);
  await rm(join(f.source, "resources/app/LICENSE"));
  await f.recordSource();
  const prepared = await prepareSteamArtifact(f);
  assert.ok(prepared.missingReleaseGates.some(gate => gate.includes("Atlas license")));
});

test("CLI requires explicit artifact selection and rejects paths, duplicate flags and upload switches", () => {
  assert.deepEqual(parseSteamArguments(["--artifact=2026-09-12T20-07-13-703Z", "--stage=review"]), { artifact: "2026-09-12T20-07-13-703Z", stage: "review" });
  for (const args of [[], ["--artifact=../outside"], ["--artifact=C:/outside"], ["--artifact=valid", "--stage=.."],
    ["--artifact=one", "--artifact=two"], ["--artifact=one", "--upload"], ["--artifact=one", "--app-id=123456"]])
    assert.throws(() => parseSteamArguments(args));
});
