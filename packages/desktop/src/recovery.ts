// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
/** Device-bound operating recovery. This is deliberately separate from native
 * campaign interchange, and accepts only IDs in this application's own store. */
import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { spawn } from "node:child_process";
import { createReadStream } from "node:fs";
import { createConnection } from "node:net";
import { cp, lstat, mkdir, readFile, readdir, rename, rm, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createPgDb } from "@chronicle/server/host";
import { contained, fail, object, profileId, safeEnvironment } from "./policy.ts";
import { databaseUrlOf, originOf, parseProfile, ProfileStore, type OwnedProfile, type ProfileSecrets, type SecretBox } from "./profiles.ts";
import { ManagedPostgres, verifyRuntime } from "./postgres.ts";

const FILES = ["database.dump", "secrets.dpapi", "profile.json"] as const;
const SHA = /^[a-f0-9]{64}$/;
const MAX_DUMP = 8 * 1024 * 1024 * 1024;
export interface MigrationPin { name: string; sha256: string }
export interface RecoveryManifest {
  version: 1; kind: "chronicle-device-recovery"; id: string; createdAt: string;
  appVersion: string; postgres: "17.11"; sourceProfileId: string; sourceOrigin: string;
  schema: MigrationPin[]; counts: { users: number; credentials: number; campaigns: number };
  files: Record<typeof FILES[number], { bytes: number; sha256: string }>;
  hmac: string;
}
const digest = (bytes: Buffer | string) => createHash("sha256").update(bytes).digest("hex");
const stable = (value: unknown): string => JSON.stringify(value, (_key, input: unknown) => input && typeof input === "object" && !Array.isArray(input)
  ? Object.fromEntries(Object.entries(input).sort(([a], [b]) => a.localeCompare(b, "en"))) : input);
export function recoveryAuthentication(manifest: Omit<RecoveryManifest, "hmac">, cookieSecret: string): string {
  return createHmac("sha256", cookieSecret).update(stable(manifest)).digest("hex");
}
export function parseRecoveryManifest(input: unknown): RecoveryManifest {
  const m = object(input, ["version", "kind", "id", "createdAt", "appVersion", "postgres", "sourceProfileId", "sourceOrigin", "schema", "counts", "files", "hmac"]);
  if (m["version"] !== 1 || m["kind"] !== "chronicle-device-recovery" || m["postgres"] !== "17.11" ||
      typeof m["createdAt"] !== "string" || !Number.isFinite(Date.parse(m["createdAt"])) || typeof m["appVersion"] !== "string" || !/^\d+\.\d+\.\d+$/.test(m["appVersion"]) ||
      typeof m["sourceOrigin"] !== "string" || !/^http:\/\/localhost:[0-9]{5}$/.test(m["sourceOrigin"]) || typeof m["hmac"] !== "string" || !SHA.test(m["hmac"]))
    fail("recovery-manifest", "Recovery-Punkt hat ein unbekanntes oder beschädigtes Format.");
  profileId(m["id"]); profileId(m["sourceProfileId"]);
  if (!Array.isArray(m["schema"]) || m["schema"].length > 1000) fail("recovery-schema", "Recovery-Schemavertrag ist beschädigt.");
  const names = new Set<string>();
  for (const pin of m["schema"] as unknown[]) {
    const p = object(pin, ["name", "sha256"]);
    if (typeof p["name"] !== "string" || !/^[0-9]{3}_[a-z0-9_]+\.sql$/.test(p["name"]) || names.has(p["name"]) || typeof p["sha256"] !== "string" || !SHA.test(p["sha256"]))
      fail("recovery-schema", "Recovery-Schemavertrag ist beschädigt.");
    names.add(p["name"] as string);
  }
  const counts = object(m["counts"], ["users", "credentials", "campaigns"]);
  if (!["users", "credentials", "campaigns"].every(key => Number.isSafeInteger(counts[key]) && Number(counts[key]) >= 0)) fail("recovery-counts", "Recovery-Datenstand ist beschädigt.");
  const files = object(m["files"], FILES);
  for (const name of FILES) {
    const file = object(files[name], ["bytes", "sha256"]);
    if (!Number.isSafeInteger(file["bytes"]) || Number(file["bytes"]) < 1 || Number(file["bytes"]) > (name === "database.dump" ? MAX_DUMP : 65536) || typeof file["sha256"] !== "string" || !SHA.test(file["sha256"]))
      fail("recovery-file", "Recovery-Dateivertrag ist beschädigt.");
  }
  return m as unknown as RecoveryManifest;
}
async function fileDigest(path: string, maximum: number): Promise<{ bytes: number; sha256: string }> {
  const info = await lstat(path);
  if (!info.isFile() || info.isSymbolicLink() || info.size < 1 || info.size > maximum) fail("recovery-file", "Recovery-Datei ist zu groß oder ungültig.");
  const hash = createHash("sha256"); let bytes = 0;
  for await (const chunk of createReadStream(path, { highWaterMark: 1024 * 1024 })) {
    bytes += (chunk as Buffer).length;
    if (bytes > maximum) fail("recovery-file", "Recovery-Datei überschreitet die Größenbegrenzung.");
    hash.update(chunk as Buffer);
  }
  if (bytes !== info.size) fail("recovery-file", "Recovery-Datei wurde während des Lesens verändert.");
  return { bytes, sha256: hash.digest("hex") };
}

export async function packagedMigrations(resources: string): Promise<MigrationPin[]> {
  const directory = join(resources, "migrations"), result: MigrationPin[] = [];
  for (const name of (await readdir(directory)).filter(name => name.endsWith(".sql")).sort()) {
    if (!/^[0-9]{3}_[a-z0-9_]+\.sql$/.test(name)) fail("schema-resource", "Unbekannte Migration im Paket.");
    result.push({ name, sha256: digest(await readFile(join(directory, name))) });
  }
  if (!result.length) fail("schema-resource", "Paket enthält keine Migrationen.");
  return result;
}
export function migrationAdmission(applied: readonly MigrationPin[], packaged: readonly MigrationPin[]) {
  // Klartext für die zwei Ursachen. Am 12./13.09. lief 0.4.3 über 0.5.0; die Welten standen auf
  // Datenstufe 036, die ältere App kannte nur bis 032 und sagte nur „Datenbankschema passt nicht“.
  const stufe = (name: string) => name.slice(0, 3), hoechste = packaged.at(-1)?.name ?? "000";
  const unbekannt = applied.filter(old => !packaged.some(pin => pin.name === old.name)).sort((a, b) => a.name.localeCompare(b.name));
  if (unbekannt.length) fail("schema-incompatible", `Diese Welt wurde zuletzt mit einer neueren Version von Atlas Chronicles geöffnet (Datenstufe ${stufe(unbekannt.at(-1)!.name)}). Diese Installation kennt nur bis Datenstufe ${stufe(hoechste)}. Bitte die neueste Version installieren; die Welt selbst ist unverändert.`);
  const veraendert = applied.find(old => !packaged.some(pin => pin.name === old.name && pin.sha256 === old.sha256));
  if (veraendert) fail("schema-incompatible", `Diese Installation hat eine abweichende Fassung der Datenstufe ${stufe(veraendert.name)} als die Welt. Das passiert bei einem beschädigten oder fremden Installationspaket. Bitte Atlas Chronicles neu installieren; die Welt selbst ist unverändert.`);
  const pending = packaged.filter(pin => !applied.some(old => old.name === pin.name));
  return { pending, recoveryRequired: applied.length > 0 && pending.length > 0 };
}
export async function inspectMigrationAdmission(owned: OwnedProfile, resources: string) {
  const db = createPgDb(databaseUrlOf(owned));
  try {
    const exists = (await db.query<{ present: boolean }>("SELECT to_regclass('public.schema_migrations') IS NOT NULL AS present")).rows[0]!.present;
    const applied = exists ? (await db.query<MigrationPin>("SELECT name,sha256 FROM schema_migrations ORDER BY name")).rows : [];
    return { applied, ...migrationAdmission(applied, await packagedMigrations(resources)) };
  } finally { await db.close(); }
}

async function applicationStopped(owned: OwnedProfile): Promise<void> {
  const occupied = await new Promise<boolean>((resolve, reject) => {
    const socket = createConnection({ host: "127.0.0.1", port: owned.profile.httpPort });
    socket.once("connect", () => { socket.destroy(); resolve(true); });
    socket.once("error", error => { if ((error as NodeJS.ErrnoException).code === "ECONNREFUSED") resolve(false); else reject(error); });
    socket.setTimeout(2000, () => { socket.destroy(); reject(new Error("Local application port check timed out.")); });
  });
  if (occupied) fail("recovery-live-host", "Vor der Host-Sicherung muss die Spielanwendung vollständig beendet sein.");
}
async function databaseState(owned: OwnedProfile) {
  const db = createPgDb(databaseUrlOf(owned));
  try {
    const schema = (await db.query<MigrationPin>("SELECT name,sha256 FROM schema_migrations ORDER BY name")).rows;
    const counts = (await db.query<{ users: number; credentials: number; campaigns: number }>("SELECT (SELECT count(*)::integer FROM users) AS users,(SELECT count(*)::integer FROM credentials) AS credentials,(SELECT count(*)::integer FROM campaigns) AS campaigns")).rows[0]!;
    return { schema, counts };
  } finally { await db.close(); }
}

export class RecoveryStore {
  readonly root: string;
  constructor(userData: string, readonly runtime: string, readonly resources: string, private readonly box: SecretBox) { this.root = join(userData, "recovery"); }
  private async tool(name: "pg_dump" | "pg_restore", owned: OwnedProfile, args: string[]): Promise<void> {
    await verifyRuntime(this.runtime);
    // libpq cannot read a password file beyond Windows MAX_PATH even when Node can
    // create it. Keep all 128 random bits while avoiding the long decorative prefix.
    const passfile = join(owned.directory, `pg-${randomUUID().replaceAll("-", "")}.tmp`);
    await writeFile(passfile, `127.0.0.1:${owned.profile.pgPort}:postgres:chronicle:${owned.secrets.databasePassword}\n`, { flag: "wx", mode: 0o600 });
    try {
      await new Promise<void>((resolve, reject) => {
        const child = spawn(join(this.runtime, "bin", `${name}.exe`), ["--host=127.0.0.1", `--port=${owned.profile.pgPort}`, "--username=chronicle", "--dbname=postgres", "--no-password", ...args], {
          windowsHide: true, shell: false, stdio: "ignore", env: { ...safeEnvironment(process.env), PGPASSFILE: passfile },
        });
        const timer = setTimeout(() => { child.kill(); reject(new Error("Recovery operation timed out.")); }, 300_000);
        child.once("error", error => { clearTimeout(timer); reject(error); });
        child.once("exit", code => { clearTimeout(timer); if (code === 0) resolve(); else reject(new Error("Recovery operation failed.")); });
      });
    } catch { fail("recovery-tool", "PostgreSQL-Sicherung oder Wiederherstellung fehlgeschlagen. Quelle bleibt erhalten."); }
    finally { await rm(passfile, { force: true }); }
  }
  async create(owned: OwnedProfile, postgres: ManagedPostgres, appVersion: string): Promise<RecoveryManifest> {
    if (postgres.owned.profile.id !== owned.profile.id) fail("recovery-owner", "Recovery-Operation gehört nicht zum ausgewählten Host.");
    await applicationStopped(owned);
    await postgres.verifyOwnership();
    const before = await databaseState(owned), id = randomUUID();
    await mkdir(this.root, { recursive: true });
    const staging = contained(this.root, `.creating-${id}`), destination = contained(this.root, id);
    await mkdir(staging);
    // The caller retains the exclusive profile lock throughout drain/dump/commit.
    await this.tool("pg_dump", owned, ["--format=custom", "--compress=6", "--no-owner", "--no-privileges", `--file=${join(staging, "database.dump")}`]);
    const after = await databaseState(owned);
    if (stable(before) !== stable(after)) fail("recovery-concurrent", "Datenstand hat sich während der Sicherung geändert; Recovery-Punkt wird nicht freigegeben.");
    await cp(join(owned.directory, "secrets.dpapi"), join(staging, "secrets.dpapi"));
    await cp(join(owned.directory, "profile.json"), join(staging, "profile.json"));
    const files = {} as RecoveryManifest["files"];
    for (const name of FILES) files[name] = await fileDigest(join(staging, name), name === "database.dump" ? MAX_DUMP : 65536);
    const unsigned: Omit<RecoveryManifest, "hmac"> = { version: 1, kind: "chronicle-device-recovery", id, createdAt: new Date().toISOString(), appVersion, postgres: "17.11", sourceProfileId: owned.profile.id, sourceOrigin: originOf(owned.profile), ...before, files };
    const manifest = parseRecoveryManifest({ ...unsigned, hmac: recoveryAuthentication(unsigned, owned.secrets.cookieSecret) });
    await writeFile(join(staging, "recovery.json"), JSON.stringify(manifest, null, 2), { flag: "wx", mode: 0o600 });
    await rename(staging, destination);
    await this.verify(id);
    return manifest;
  }
  async list(): Promise<Array<{ id: string; createdAt: string; sourceProfileId: string; appVersion: string }>> {
    await mkdir(this.root, { recursive: true });
    const result: Array<{ id: string; createdAt: string; sourceProfileId: string; appVersion: string }> = [];
    for (const entry of await readdir(this.root, { withFileTypes: true })) {
      if (!entry.isDirectory() || !/^[a-f0-9-]{36}$/.test(entry.name)) continue;
      // Listings are labels, never admission. Streaming the full dump belongs to
      // explicit verification/restore, not a management status poll.
      const path = contained(this.root, profileId(entry.name), "recovery.json");
      if ((await stat(path)).size > 65536) continue;
      const manifest = parseRecoveryManifest(JSON.parse(await readFile(path, "utf8")));
      result.push({ id: manifest.id, createdAt: manifest.createdAt, sourceProfileId: manifest.sourceProfileId, appVersion: manifest.appVersion });
    }
    return result.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  async verify(id: string): Promise<{ manifest: RecoveryManifest; directory: string; secrets: ProfileSecrets }> {
    if (!this.box.available()) fail("recovery-encryption", "Windows-Geheimnisspeicher ist nicht verfügbar.");
    const directory = contained(this.root, profileId(id));
    if ((await lstat(directory)).isSymbolicLink() || (await stat(join(directory, "recovery.json"))).size > 65536) fail("recovery-path", "Recovery-Punkt ist ungültig.");
    const manifest = parseRecoveryManifest(JSON.parse(await readFile(join(directory, "recovery.json"), "utf8")));
    if (manifest.id !== id) fail("recovery-id", "Recovery-Punkt gehört nicht zu dieser Auswahl.");
    for (const name of FILES) {
      const actual = await fileDigest(join(directory, name), name === "database.dump" ? MAX_DUMP : 65536);
      if (actual.bytes !== manifest.files[name].bytes || actual.sha256 !== manifest.files[name].sha256)
        fail("recovery-integrity", "Recovery-Datei ist beschädigt oder wurde verändert.");
    }
    const secrets = object(JSON.parse(this.box.decrypt(await readFile(join(directory, "secrets.dpapi")))), ["databasePassword", "cookieSecret"]);
    if (![secrets["databasePassword"], secrets["cookieSecret"]].every(value => typeof value === "string" && SHA.test(value))) fail("recovery-secrets", "Recovery-Geheimnisse sind für dieses Windows-Konto nicht lesbar.");
    const { hmac, ...unsigned } = manifest;
    if (!timingSafeEqual(Buffer.from(hmac, "hex"), Buffer.from(recoveryAuthentication(unsigned, secrets["cookieSecret"] as string), "hex"))) fail("recovery-authentication", "Recovery-Manifest ist nicht authentisch.");
    const sourceProfile = parseProfile(JSON.parse(await readFile(join(directory, "profile.json"), "utf8")));
    if (sourceProfile.id !== manifest.sourceProfileId || originOf(sourceProfile) !== manifest.sourceOrigin) fail("recovery-profile", "Recovery-Profilzuordnung ist beschädigt.");
    migrationAdmission(manifest.schema, await packagedMigrations(this.resources));
    return { manifest, directory, secrets: secrets as unknown as ProfileSecrets };
  }
  async restore(id: string, name: string, store: ProfileStore, assertCurrent: () => void = () => undefined): Promise<{ owned: OwnedProfile; manifest: RecoveryManifest }> {
    const source = await this.verify(id);
    assertCurrent();
    const owned = await store.create(name), unlock = await store.lock(owned), postgres = new ManagedPostgres(this.runtime, owned);
    try {
      assertCurrent();
      await postgres.start();
      assertCurrent();
      const db = createPgDb(databaseUrlOf(owned));
      try {
        if ((await db.query("SELECT 1 FROM pg_tables WHERE schemaname='public' LIMIT 1")).rowCount) fail("recovery-target", "Recovery-Ziel muss eine neue leere Datenbank sein.");
      } finally { await db.close(); }
      assertCurrent();
      // Authentication and hashes were verified before any destination was created.
      await this.tool("pg_restore", owned, ["--exit-on-error", "--single-transaction", "--no-owner", "--no-privileges", join(source.directory, "database.dump")]);
      const restored = await databaseState(owned);
      if (stable(restored) !== stable({ schema: source.manifest.schema, counts: source.manifest.counts })) fail("recovery-verification", "Wiederhergestellter Datenstand stimmt nicht mit dem Recovery-Punkt überein.");
      // The new local DB keeps its new SCRAM password; signing existing browser
      // credentials requires the original cookie key. No token goes to a renderer.
      owned.secrets.cookieSecret = source.secrets.cookieSecret;
      const staging = join(owned.directory, "recovered-secrets.tmp");
      await writeFile(staging, this.box.encrypt(JSON.stringify(owned.secrets)), { flag: "wx", mode: 0o600 });
      await rename(staging, join(owned.directory, "secrets.dpapi"));
      return { owned, manifest: source.manifest };
    } finally { await postgres.stop(); await unlock(); }
  }
}
