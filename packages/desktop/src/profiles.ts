import { randomBytes, randomUUID } from "node:crypto";
import { mkdir, open, readFile, readdir, rename, rm, lstat, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { join } from "node:path";
import { contained, fail, label, object, profileId } from "./policy.ts";

export interface SecretBox { available(): boolean; encrypt(text: string): Buffer; decrypt(bytes: Buffer): string }
export interface Profile { version: 1; id: string; name: string; createdAt: string; httpPort: number; pgPort: number; pgMajor: 17 }
export interface ProfileSecrets { databasePassword: string; cookieSecret: string }
export interface SetupReceipt { value: string; expiresAt: number }
export interface OwnedProfile { profile: Profile; directory: string; dataDirectory: string; secrets: ProfileSecrets }
export const originOf = (profile: Profile) => `http://localhost:${profile.httpPort}`;
export const databaseUrlOf = (owned: OwnedProfile) => `postgresql://chronicle:${encodeURIComponent(owned.secrets.databasePassword)}@127.0.0.1:${owned.profile.pgPort}/postgres`;

export function parseProfile(input: unknown): Profile {
  const value = object(input, ["version", "id", "name", "createdAt", "httpPort", "pgPort", "pgMajor"]);
  const validPort = (port: unknown) => Number.isInteger(port) && Number(port) >= 41000 && Number(port) <= 60999 && port !== 54329;
  if (value["version"] !== 1 || value["pgMajor"] !== 17 || !validPort(value["httpPort"]) || !validPort(value["pgPort"]) || value["httpPort"] === value["pgPort"] ||
      typeof value["createdAt"] !== "string" || !Number.isFinite(Date.parse(value["createdAt"]))) fail("profile-corrupt", "Profilkonfiguration ist beschädigt.");
  return { version: 1, id: profileId(value["id"]), name: label(value["name"]), createdAt: value["createdAt"] as string,
    httpPort: value["httpPort"] as number, pgPort: value["pgPort"] as number, pgMajor: 17 };
}

async function freePort(used: Set<number>): Promise<number> {
  for (let attempt = 0; attempt < 200; attempt++) {
    const port = 41000 + randomBytes(2).readUInt16BE() % 20000;
    if (used.has(port)) continue;
    const free = await new Promise<boolean>(resolve => {
      const server = createServer();
      server.once("error", () => resolve(false));
      server.listen({ host: "127.0.0.1", port, exclusive: true }, () => server.close(() => resolve(true)));
    });
    if (free) return port;
  }
  return fail("ports-unavailable", "Keine freien lokalen Ports gefunden.");
}

export class ProfileStore {
  readonly root: string;
  constructor(userData: string, private readonly box: SecretBox) { this.root = join(userData, "profiles"); }
  private async rootReady() { await mkdir(this.root, { recursive: true }); if ((await lstat(this.root)).isSymbolicLink()) fail("profile-path", "Profilordner darf keine Verknüpfung sein."); }
  async list(): Promise<Profile[]> {
    await this.rootReady();
    const result: Profile[] = [];
    for (const entry of await readdir(this.root, { withFileTypes: true })) {
      if (!entry.isDirectory() || !/^[a-f0-9-]{36}$/.test(entry.name)) continue;
      const profile = parseProfile(JSON.parse(await readFile(contained(this.root, entry.name, "profile.json"), "utf8")));
      if (profile.id !== entry.name) fail("profile-owner", "Profilzuordnung ist beschädigt.");
      result.push(profile);
    }
    return result.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }
  async create(name: string): Promise<OwnedProfile> {
    if (!this.box.available()) return fail("encryption-unavailable", "Windows-Geheimnisspeicher ist nicht verfügbar. Einrichtung angehalten.");
    await this.rootReady();
    const profiles = await this.list(), used = new Set([54329, ...profiles.flatMap(p => [p.httpPort, p.pgPort])]);
    const httpPort = await freePort(used); used.add(httpPort);
    const profile: Profile = { version: 1, id: randomUUID(), name: label(name), createdAt: new Date().toISOString(), httpPort, pgPort: await freePort(used), pgMajor: 17 };
    const directory = contained(this.root, profile.id), staging = contained(this.root, `.creating-${profile.id}`), secrets = { databasePassword: randomBytes(32).toString("hex"), cookieSecret: randomBytes(32).toString("hex") };
    await mkdir(staging);
    // Only the authenticated OS-bound ciphertext is ever persisted.
    await writeFile(join(staging, "secrets.dpapi"), this.box.encrypt(JSON.stringify(secrets)), { flag: "wx", mode: 0o600 });
    await writeFile(join(staging, "profile.json"), JSON.stringify(profile, null, 2), { flag: "wx", mode: 0o600 });
    await rename(staging, directory);
    return { profile, directory, dataDirectory: join(directory, "postgres"), secrets };
  }
  async open(id: string): Promise<OwnedProfile> {
    if (!this.box.available()) return fail("encryption-unavailable", "Windows-Geheimnisspeicher ist nicht verfügbar.");
    const directory = contained(this.root, profileId(id));
    if ((await lstat(directory)).isSymbolicLink()) fail("profile-path", "Profil darf keine Verknüpfung sein.");
    const profile = parseProfile(JSON.parse(await readFile(join(directory, "profile.json"), "utf8")));
    if (profile.id !== id) fail("profile-owner", "Profilzuordnung ist beschädigt.");
    const decrypted = object(JSON.parse(this.box.decrypt(await readFile(join(directory, "secrets.dpapi")))), ["databasePassword", "cookieSecret"]);
    if (![decrypted["databasePassword"], decrypted["cookieSecret"]].every(s => typeof s === "string" && /^[a-f0-9]{64}$/.test(s)))
      fail("secrets-corrupt", "Profilgeheimnisse sind nicht lesbar.");
    return { profile, directory, dataDirectory: join(directory, "postgres"), secrets: decrypted as unknown as ProfileSecrets };
  }
  async lock(owned: OwnedProfile): Promise<() => Promise<void>> {
    const path = join(owned.directory, "host.lock"), nonce = randomUUID();
    const create = () => writeFile(path, JSON.stringify({ pid: process.pid, nonce }), { flag: "wx", mode: 0o600 });
    try { await create(); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      const old = JSON.parse(await readFile(path, "utf8")) as { pid: number; nonce: string };
      if (!Number.isSafeInteger(old.pid) || old.pid <= 0) fail("profile-lock", "Profil-Lock ist beschädigt.");
      let absent = false;
      try { process.kill(old.pid, 0); } catch (e) { absent = (e as NodeJS.ErrnoException).code === "ESRCH"; }
      if (!absent) fail("profile-busy", "Dieses Profil wird bereits verwendet.");
      // Atomic rename, retain stale evidence. No process is stopped based on a PID file.
      await rename(path, join(owned.directory, `host.stale-${nonce}.json`));
      await create();
    }
    return async () => {
      const value = JSON.parse(await readFile(path, "utf8")) as { nonce: string };
      if (value.nonce !== nonce) fail("profile-lock", "Profil-Lock wurde ersetzt.");
      await rm(path);
    };
  }
  async saveSetupReceipt(owned: OwnedProfile, receipt: SetupReceipt): Promise<void> {
    if (!this.box.available() || typeof receipt.value !== "string" || receipt.value.length < 1 || receipt.value.length > 512 || !Number.isSafeInteger(receipt.expiresAt))
      fail("setup-receipt", "Ersteinrichtungsbeleg konnte nicht gesichert werden.");
    const directory = contained(this.root, profileId(owned.profile.id));
    const temporary = join(directory, `setup-receipt-${randomUUID()}.tmp`);
    const file = await open(temporary, "wx", 0o600);
    try {
      await file.writeFile(this.box.encrypt(JSON.stringify({ version: 1, profileId: owned.profile.id, origin: originOf(owned.profile), value: receipt.value, expiresAt: receipt.expiresAt })));
      await file.sync();
    } finally { await file.close(); }
    await rename(temporary, join(directory, "setup-receipt.dpapi"));
  }
  async readSetupReceipt(id: string): Promise<SetupReceipt | undefined> {
    const owned = await this.open(id);
    const bytes = await readFile(join(owned.directory, "setup-receipt.dpapi")).catch(error => { if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined; throw error; });
    if (!bytes) return undefined;
    if (bytes.length > 8192) fail("setup-receipt", "Ersteinrichtungsbeleg ist beschädigt.");
    const receipt = object(JSON.parse(this.box.decrypt(bytes)), ["version", "profileId", "origin", "value", "expiresAt"]);
    if (receipt["version"] !== 1 || receipt["profileId"] !== owned.profile.id || receipt["origin"] !== originOf(owned.profile) || typeof receipt["value"] !== "string" || receipt["value"].length > 512 || !Number.isSafeInteger(receipt["expiresAt"]))
      fail("setup-receipt", "Ersteinrichtungsbeleg gehört nicht zu diesem Profil.");
    return { value: receipt["value"] as string, expiresAt: receipt["expiresAt"] as number };
  }
  async clearSetupReceipt(id: string, value: string): Promise<void> {
    const receipt = await this.readSetupReceipt(id);
    if (receipt?.value === value) await rm(contained(this.root, profileId(id), "setup-receipt.dpapi"));
  }
}
