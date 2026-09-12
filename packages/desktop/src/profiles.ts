// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { randomBytes, randomUUID } from "node:crypto";
import { mkdir, open, readFile, readdir, rename, rm, lstat, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { join } from "node:path";
import { CHRONIST_ANTHROPIC_BASE_URL, CHRONIST_ANTHROPIC_KEY_ENV, CHRONIST_ANTHROPIC_MODELS, CHRONIST_ANTHROPIC_PRICING,
  CHRONIST_ANTHROPIC_PROFILE, CHRONIST_UNCONFIGURED_MODEL, isPrivateLanOrigin } from "@chronicle/server/host";
import { chronistKey, contained, DesktopError, fail, label, object, profileId } from "./policy.ts";

export const CHRONIST_KEY_FILE = "chronist-key.dpapi";
export const CHRONIST_PROVIDERS_FILE = "chronist-providers.json";
/** The profile's own operator file. It carries no key: the key is named, not contained.
 *  Profile, addresses, model names and prices are the registry's documented defaults, so this file
 *  and the host cannot drift apart. The local entry keeps the server's unconfigured placeholder:
 *  the host fills it in from its own Ollama tag discovery and leaves any concrete model entered
 *  here untouched. Both Anthropic entries name the same key variable, so a stored key makes both
 *  available and no key leaves both visibly unavailable. */
const anthropic = (id: string, label: string, model: string) => ({ id, label, profileId: CHRONIST_ANTHROPIC_PROFILE,
  location: "fremd", baseUrl: CHRONIST_ANTHROPIC_BASE_URL, models: [model], apiKeyEnv: CHRONIST_ANTHROPIC_KEY_ENV,
  pricing: CHRONIST_ANTHROPIC_PRICING[model] });
export const CHRONIST_PROVIDER_DEFAULTS = {
  schemaVersion: 1,
  globalConcurrency: 2,
  providers: [
    { id: "ollama", label: "Ollama auf diesem Rechner", profileId: "ollama-chat-1", location: "lokal",
      baseUrl: "http://127.0.0.1:11434", models: [CHRONIST_UNCONFIGURED_MODEL], available: false },
    anthropic("anthropic", "Anthropic", CHRONIST_ANTHROPIC_MODELS.standard),
    anthropic("anthropic-haiku", "Anthropic (Sparmodus)", CHRONIST_ANTHROPIC_MODELS.economy),
  ],
} as const;

export interface SecretBox { available(): boolean; encrypt(text: string): Buffer; decrypt(bytes: Buffer): string }
export interface Profile { version: 1; id: string; name: string; createdAt: string; httpPort: number; pgPort: number; pgMajor: 17 }
export interface ProfileSecrets { databasePassword: string; cookieSecret: string }
export interface SetupReceipt { value: string; expiresAt: number; origin?: string }
export interface OwnedProfile { profile: Profile; directory: string; dataDirectory: string; secrets: ProfileSecrets }
export const originOf = (profile: Profile) => `http://localhost:${profile.httpPort}`;
export const databaseUrlOf = (owned: OwnedProfile) => `postgresql://chronicle:${encodeURIComponent(owned.secrets.databasePassword)}@127.0.0.1:${owned.profile.pgPort}/postgres`;
function setupOriginOf(profile: Profile, origin: unknown): string {
  if (origin === undefined || origin === originOf(profile)) return originOf(profile);
  if (typeof origin === "string" && isPrivateLanOrigin(origin) && Number(new URL(origin).port) === profile.httpPort) return origin;
  return fail("setup-receipt", "Ersteinrichtungsbeleg gehört nicht zur Adresse dieses Profils.");
}

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
  private async rootReady() {
    await mkdir(this.root, { recursive: true });
    if ((await lstat(this.root)).isSymbolicLink()) fail("profile-path", "Profilordner darf keine Verknüpfung sein.");
    // Reste einer Löschung, die Windows im Moment nicht freigeben wollte. Bester Aufwand und
    // ohne Folgen: sie stehen in keiner Liste, halten nichts auf, und beim nächsten Blick in
    // den Ordner ist der Griff darauf meist längst weg.
    for (const entry of await readdir(this.root, { withFileTypes: true }))
      if (entry.isDirectory() && entry.name.startsWith(".deleting-"))
        await rm(contained(this.root, entry.name), { recursive: true, force: true }).catch(() => undefined);
  }
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
  /**
   * Eine lokale Welt endgültig löschen.
   *
   * **Der Name ist die Bestätigung.** Nicht das Fenster prüft ihn, sondern diese Stelle: eine
   * versehentlich angeklickte Zeile darf keine Welt kosten, und eine Bestätigung, die nur im
   * Renderer stattfindet, ist keine. Wer löscht, tippt den Namen der Welt.
   *
   * **Was hier nicht mitgelöscht wird:** die Recovery-Punkte dieser Welt. Sie tragen ihre eigene
   * Kopie von `profile.json` und `secrets.dpapi` (siehe `RecoveryStore.create`) und bleiben
   * darum auch ohne ihr Profil wiederherstellbar. Das ist der Unterschied zwischen „gelöscht"
   * und „unwiederbringlich": wer gesichert hat, hat noch einen Weg zurück.
   *
   * Zuerst umbenannt, dann entfernt: `list()` nimmt nur Ordner mit reinem UUID-Namen an, also
   * verschwindet die Welt mit dem Umbenennen aus der Liste — auch wenn das Entfernen danach an
   * einer offenen Datei scheitert und ein Rest liegen bleibt.
   */
  async remove(id: string, expectedName: string): Promise<Profile> {
    await this.rootReady();
    const directory = contained(this.root, profileId(id));
    if ((await lstat(directory)).isSymbolicLink()) fail("profile-path", "Profil darf keine Verknüpfung sein.");
    const profile = parseProfile(JSON.parse(await readFile(join(directory, "profile.json"), "utf8")));
    if (profile.id !== id) fail("profile-owner", "Profilzuordnung ist beschädigt.");
    if (label(expectedName) !== profile.name) fail("profile-name-mismatch", `Zum Löschen muss der Name genau stimmen. Diese Welt heißt „${profile.name}".`);
    // Ein lebender Halter ist ein laufender Host. Ein Lock einer Sitzung, die es nicht mehr gibt,
    // hält nichts auf — dieselbe Unterscheidung wie in `lock()`, nur ohne etwas zu übernehmen.
    const lockFile = join(directory, "host.lock");
    const held = await readFile(lockFile, "utf8").catch(() => undefined);
    if (held !== undefined) {
      const holder = JSON.parse(held) as { pid?: number };
      if (!Number.isSafeInteger(holder.pid) || Number(holder.pid) <= 0) fail("profile-lock", "Profil-Lock ist beschädigt.");
      let absent = false;
      try { process.kill(Number(holder.pid), 0); } catch (error) { absent = (error as NodeJS.ErrnoException).code === "ESRCH"; }
      if (!absent) fail("profile-busy", "Diese Welt läuft gerade. Bitte zuerst den Host beenden.");
    }
    const grave = contained(this.root, `.deleting-${randomUUID()}`);
    await this.umbenennenMitGeduld(directory, grave);
    // Ab hier ist die Welt gelöscht: sie steht in keiner Liste mehr. Ein Rest, den Windows in
    // diesem Moment nicht freigibt, darf das nicht mehr zum Fehlschlag machen — sonst meldet
    // die Oberfläche einen Fehler für etwas, das aus jeder sichtbaren Sicht geschehen ist.
    // Weggeräumt wird er beim nächsten `rootReady()`.
    await rm(grave, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }).catch(() => undefined);
    return profile;
  }
  /**
   * Windows gibt ein Verzeichnis erst frei, wenn der letzte Griff darauf weg ist — und der eben
   * beendete Host hatte genau dieses Verzeichnis als Arbeitsverzeichnis. Das dauert
   * Millisekunden, nicht Minuten. Kurz warten und erneut versuchen ist darum richtiger, als
   * einem Menschen zu sagen, seine Welt lasse sich nicht löschen.
   *
   * Gefunden im Electron-Prüflauf gegen das installierte Paket: dort scheiterte genau dieses
   * Umbenennen, während es gegen den Bau im Checkout durchging. Ein Wettlauf, kein Zufall.
   */
  private async umbenennenMitGeduld(von: string, nach: string): Promise<void> {
    for (let versuch = 0; ; versuch += 1) {
      try { await rename(von, nach); return; }
      catch (error) {
        const code = (error as NodeJS.ErrnoException).code;
        if (versuch >= 20 || !["EPERM", "EBUSY", "EACCES", "ENOTEMPTY"].includes(code ?? ""))
          fail("profile-busy", "Diese Welt lässt sich gerade nicht löschen: etwas hält ihren Ordner noch offen. Meist ist es der eben beendete Host. Bitte in einigen Sekunden noch einmal versuchen.");
        await new Promise(resolve => setTimeout(resolve, 250));
      }
    }
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
    const origin = setupOriginOf(owned.profile, receipt.origin);
    const directory = contained(this.root, profileId(owned.profile.id));
    const temporary = join(directory, `setup-receipt-${randomUUID()}.tmp`);
    const file = await open(temporary, "wx", 0o600);
    try {
      await file.writeFile(this.box.encrypt(JSON.stringify({ version: 1, profileId: owned.profile.id, origin, value: receipt.value, expiresAt: receipt.expiresAt })));
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
    if (receipt["version"] !== 1 || receipt["profileId"] !== owned.profile.id || typeof receipt["origin"] !== "string" || typeof receipt["value"] !== "string" || receipt["value"].length > 512 || !Number.isSafeInteger(receipt["expiresAt"]))
      fail("setup-receipt", "Ersteinrichtungsbeleg gehört nicht zu diesem Profil.");
    const origin = setupOriginOf(owned.profile, receipt["origin"]);
    return { value: receipt["value"] as string, expiresAt: receipt["expiresAt"] as number, ...(origin === originOf(owned.profile) ? {} : { origin }) };
  }
  async clearSetupReceipt(id: string, value: string): Promise<void> {
    const receipt = await this.readSetupReceipt(id);
    if (receipt?.value === value) await rm(contained(this.root, profileId(id), "setup-receipt.dpapi"));
  }
  private chronistKeyPath(id: string): string { return contained(this.root, profileId(id), CHRONIST_KEY_FILE); }
  /** Management only ever learns whether a key exists, never its value. */
  async hasChronistKey(id: string): Promise<boolean> {
    const stats = await lstat(this.chronistKeyPath(id)).catch(() => undefined);
    return stats?.isFile() === true;
  }
  async saveChronistKey(id: string, value: string): Promise<void> {
    if (!this.box.available()) fail("encryption-unavailable", "Windows-Geheimnisspeicher ist nicht verfügbar. Der Chronist-Schlüssel wird nicht gespeichert.");
    const key = chronistKey(value), directory = contained(this.root, profileId(id));
    const temporary = join(directory, `chronist-key-${randomUUID()}.tmp`);
    const file = await open(temporary, "wx", 0o600);
    try {
      // Only the authenticated OS-bound ciphertext is ever persisted, bound to its own profile.
      try { await file.writeFile(this.box.encrypt(JSON.stringify({ version: 1, profileId: id, provider: "anthropic", value: key }))); await file.sync(); }
      finally { await file.close(); }
      await rename(temporary, join(directory, CHRONIST_KEY_FILE));
    } catch (error) { await rm(temporary, { force: true }); throw error; }
  }
  async readChronistKey(id: string): Promise<string | undefined> {
    const bytes = await readFile(this.chronistKeyPath(id)).catch(error => { if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined; throw error; });
    if (!bytes) return undefined;
    if (!this.box.available()) return fail("encryption-unavailable", "Windows-Geheimnisspeicher ist nicht verfügbar. Der Chronist-Schlüssel bleibt ungelesen.");
    if (bytes.length > 65_536) fail("chronist-key", "Der gespeicherte Chronist-Schlüssel ist beschädigt.");
    let stored: Record<string, unknown>;
    // Neither a decryption nor a parse failure may quote the protected material.
    try { stored = object(JSON.parse(this.box.decrypt(bytes)), ["version", "profileId", "provider", "value"]); }
    catch { return fail("chronist-key", "Der gespeicherte Chronist-Schlüssel ist nicht lesbar. Bitte im Verwaltungsfenster neu setzen oder entfernen."); }
    if (stored["version"] !== 1 || stored["profileId"] !== profileId(id) || stored["provider"] !== "anthropic")
      fail("chronist-key", "Der gespeicherte Chronist-Schlüssel gehört nicht zu diesem Profil.");
    return chronistKey(stored["value"]);
  }
  async clearChronistKey(id: string): Promise<void> { await rm(this.chronistKeyPath(id), { force: true }); }
  /**
   * Read at world start: a stored key only works with an operator file, so the profile
   * writes its own once. An existing file is never rewritten; the key never enters it.
   *
   * **An unreadable ciphertext is a missing key, not a broken world.** A copied profile
   * directory, a different Windows account or a rotated DPAPI state all leave the file
   * lying there without decrypting. Refusing to start over it costs the whole world for
   * one optional provider, and the only repair — clearing the key in the management
   * window — needs no running host anyway. So the world starts without the key and the
   * caller carries a sentence saying why the Chronist provider is absent.
   */
  async chronistHostConfig(id: string): Promise<{ key?: string; configPath?: string; hinweis?: string }> {
    const key = await this.readChronistKey(id).catch((error: unknown) => {
      if (!(error instanceof DesktopError)) throw error;
      return null;
    });
    if (key === null) return { hinweis: "Der gespeicherte Chronist-Schlüssel ist mit diesem Windows-Konto nicht lesbar. Die Welt läuft ohne ihn; bitte im Verwaltungsfenster neu setzen oder entfernen." };
    if (key === undefined) return {};
    const path = contained(this.root, profileId(id), CHRONIST_PROVIDERS_FILE);
    await writeFile(path, `${JSON.stringify(CHRONIST_PROVIDER_DEFAULTS, null, 2)}\n`, { flag: "wx", mode: 0o600 })
      .catch(error => { if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error; });
    return { key, configPath: path };
  }
}
