import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { expect, it } from "vitest";
import { ARCHIVE_SHA256, verifyRuntime } from "../src/postgres.ts";

it("admits official GMT+ timezone names and rejects changed runtime bytes before launch", async () => {
  const root = await mkdtemp(join(tmpdir(), "chronicle-runtime-test-")), content = Buffer.from("test fixture, never executable");
  const files = Object.fromEntries(["bin/initdb.exe", "bin/pg_ctl.exe", "bin/postgres.exe", "bin/pg_dump.exe", "bin/pg_restore.exe", "server_license.txt", "commandlinetools_3rd_party_licenses.txt", "share/timezone/Etc/GMT+12"].map(path => [path, createHash("sha256").update(content).digest("hex")]));
  try {
    for (const file of Object.keys(files)) { await mkdir(dirname(join(root, file)), { recursive: true }); await writeFile(join(root, file), content); }
    await writeFile(join(root, "runtime.json"), JSON.stringify({ version: 1, platform: "win32", architecture: "x64", postgres: "17.11", source: "https://get.enterprisedb.com/postgresql/postgresql-17.11-1-windows-x64-binaries.zip", archiveSha256: ARCHIVE_SHA256, files }));
    await expect(verifyRuntime(root)).resolves.toBeUndefined();
    await writeFile(join(root, "bin/postgres.exe"), "modified");
    await expect(verifyRuntime(root)).rejects.toThrow("verändert");
    const manifest = JSON.parse(await readFile(join(root, "runtime.json"), "utf8")); manifest.postgres = "18.0";
    await writeFile(join(root, "runtime.json"), JSON.stringify(manifest));
    await expect(verifyRuntime(root)).rejects.toThrow("passt nicht");
  } finally { await rm(root, { recursive: true, force: true }); }
});
