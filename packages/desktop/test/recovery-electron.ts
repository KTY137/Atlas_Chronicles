// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
/** Headless Electron integration harness. Never imported by the application. */
import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { app, safeStorage } from "electron";
import { startEmbeddedHost } from "@chronicle/server/host";
import { ProfileStore, databaseUrlOf, originOf } from "../src/profiles.ts";
import { ManagedPostgres } from "../src/postgres.ts";
import { RecoveryStore, inspectMigrationAdmission } from "../src/recovery.ts";

const directory = dirname(fileURLToPath(import.meta.url));
if (!directory.replaceAll("\\", "/").includes("/.local/desktop-profiles/recovery-")) throw new Error("Recovery harness requires an isolated directory.");
app.setPath("userData", join(directory, "user-data"));
void app.whenReady().then(async () => {
  const resources = process.argv[2]!;
  const box = { available: () => safeStorage.isEncryptionAvailable(), encrypt: (text: string) => safeStorage.encryptString(text), decrypt: (bytes: Buffer) => safeStorage.decryptString(bytes) };
  const store = new ProfileStore(app.getPath("userData"), box), recovery = new RecoveryStore(app.getPath("userData"), join(resources, "runtime"), resources, box);
  const source = await store.create("Recovery source"), unlock = await store.lock(source), pg = new ManagedPostgres(join(resources, "runtime"), source);
  let host: Awaited<ReturnType<typeof startEmbeddedHost>> | undefined;
  let targetPg: ManagedPostgres | undefined;
  let targetUnlock: (() => Promise<void>) | undefined;
  const evidence: { passed: boolean; checks: string[]; node: string; error?: string } = { passed: false, checks: [], node: process.versions.node };
  const pass = (text: string) => { evidence.checks.push(text); console.log(`PASS ${text}`); };
  try {
    await pg.start();
    const virgin = await inspectMigrationAdmission(source, resources); assert.equal(virgin.recoveryRequired, false);
    const sourceConfig = { databaseUrl: databaseUrlOf(source), origin: originOf(source.profile), cookieSecret: source.secrets.cookieSecret, staticRoot: join(resources, "client") };
    host = await startEmbeddedHost(sourceConfig);
    const gm = await host.setup("Recovery GM");
    const response = await fetch(`${sourceConfig.origin}/api/campaigns`, { method: "POST", headers: { origin: sourceConfig.origin, "Content-Type": "application/json", cookie: `chronicle_session=${gm.value}` }, body: JSON.stringify({ name: "Host recovery continuity" }) });
    assert.equal(response.status, 200);
    await assert.rejects(recovery.create(source, pg, "0.1.0"), /vollständig beendet/);
    await host.close(); host = undefined;
    const admission = await inspectMigrationAdmission(source, resources); assert.equal(admission.pending.length, 0);
    const manifest = await recovery.create(source, pg, "0.1.0");
    assert.equal(manifest.counts.credentials, 1); assert.equal(manifest.counts.users, 1); assert.equal(manifest.counts.campaigns, 1);
    pass("refuses live application backup; drained own PG produces authenticated device-bound dump with credentials");
    await pg.stop(); await unlock();
    const manifestPath = join(recovery.root, manifest.id, "recovery.json"), saved = await readFile(manifestPath, "utf8"), before = (await store.list()).length;
    await writeFile(manifestPath, JSON.stringify({ ...manifest, appVersion: "9.9.9" }));
    await assert.rejects(recovery.restore(manifest.id, "Must never be created", store), /authentisch/);
    assert.equal((await store.list()).length, before);
    await writeFile(manifestPath, saved);
    pass("tampered manifest fails authentication before allocating any destination profile");
    const restored = await recovery.restore(manifest.id, "Recovered host", store);
    assert.notEqual(restored.owned.profile.id, source.profile.id); assert.notEqual(restored.owned.profile.httpPort, source.profile.httpPort);
    assert.notEqual(restored.owned.secrets.databasePassword, source.secrets.databasePassword);
    assert.equal(restored.owned.secrets.cookieSecret, source.secrets.cookieSecret);
    targetUnlock = await store.lock(restored.owned); targetPg = new ManagedPostgres(join(resources, "runtime"), restored.owned); await targetPg.start();
    const targetConfig = { databaseUrl: databaseUrlOf(restored.owned), origin: originOf(restored.owned.profile), cookieSecret: restored.owned.secrets.cookieSecret, staticRoot: join(resources, "client") };
    host = await startEmbeddedHost(targetConfig);
    const me = await fetch(`${targetConfig.origin}/api/me`, { headers: { cookie: `chronicle_session=${gm.value}` } });
    assert.equal(me.status, 200); const identity = await me.json() as { userId: string; credentialId: string };
    assert.equal(identity.userId, gm.userId); assert.equal(identity.credentialId, gm.credentialId);
    pass("restore allocates new PG profile, preserves exact original credential and signing key, and authenticates the same session over HTTP");
    await host.close(); host = undefined; await targetPg.stop(); await targetUnlock(); targetUnlock = undefined;
    evidence.passed = true;
  } catch (error) { evidence.error = error instanceof Error ? error.message : "Recovery smoke failed"; process.exitCode = 1; }
  finally {
    try { await host?.close(); await targetPg?.stop(); await pg.stop(); await targetUnlock?.(); } catch { evidence.error = "Recovery cleanup was not confirmed"; process.exitCode = 1; }
    await mkdir(directory, { recursive: true }); await writeFile(join(directory, "evidence.json"), JSON.stringify(evidence, null, 2));
    console.log(`Recovery evidence: ${join(directory, "evidence.json")}`); app.exit(evidence.passed ? 0 : 1);
  }
});
