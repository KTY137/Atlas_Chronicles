// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { copyFile, mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { isAbsolute, join } from "node:path";
import { expect, it } from "vitest";
import { CHRONIST_ANTHROPIC_BASE_URL, CHRONIST_ANTHROPIC_KEY_ENV, CHRONIST_ANTHROPIC_MODELS, CHRONIST_ANTHROPIC_PRICING,
  CHRONIST_ANTHROPIC_PROFILE, CHRONIST_UNCONFIGURED_MODEL } from "@chronicle/server/host";
import { ProfileStore } from "../src/profiles.ts";

it("refuses setup without OS encryption and preserves only ciphertext across reopening", async () => {
  const directory = await mkdtemp(join(tmpdir(), "chronicle-profile-test-"));
  // Test adapter is deliberately marked as test-only; actual DPAPI is exercised in Electron smoke.
  const ciphertext = randomBytes(96); let plaintext = "";
  try {
    const unavailable = new ProfileStore(directory, { available: () => false, encrypt: () => { throw new Error("must not run"); }, decrypt: () => "" });
    await expect(unavailable.create("World")).rejects.toThrow("Windows");
    const store = new ProfileStore(directory, { available: () => true, encrypt: text => { plaintext = text; return ciphertext; }, decrypt: bytes => { expect(bytes).toEqual(ciphertext); return plaintext; } });
    const owned = await store.create("World");
    expect(await readFile(join(owned.directory, "secrets.dpapi"))).toEqual(ciphertext);
    expect(await store.open(owned.profile.id)).toEqual(owned);
    expect(await readFile(join(owned.directory, "profile.json"), "utf8")).not.toContain(owned.secrets.cookieSecret);
    const unlock = await store.lock(owned);
    await expect(store.lock(owned)).rejects.toThrow("bereits verwendet");
    await unlock();
    await (await store.lock(owned))();
  } finally { await rm(directory, { recursive: true, force: true }); }
});
it("persists the first-login receipt privately and refuses cross-profile replay", async () => {
  const directory = await mkdtemp(join(tmpdir(), "chronicle-receipt-test-")), values = new Map<string, string>();
  const store = new ProfileStore(directory, {
    available: () => true,
    encrypt: text => { const cipher = randomBytes(96); values.set(cipher.toString("hex"), text); return cipher; },
    decrypt: bytes => { const text = values.get(bytes.toString("hex")); if (!text) throw new Error("Unknown test ciphertext"); return text; },
  });
  try {
    const a = await store.create("Original"), b = await store.create("Different");
    const receipt = { value: "private-test-session", expiresAt: Date.now() + 60000 };
    await store.saveSetupReceipt(a, receipt);
    expect(await store.readSetupReceipt(a.profile.id)).toEqual(receipt);
    expect((await readFile(join(a.directory, "setup-receipt.dpapi"))).includes(Buffer.from(receipt.value))).toBe(false);
    await copyFile(join(a.directory, "setup-receipt.dpapi"), join(b.directory, "setup-receipt.dpapi"));
    await expect(store.readSetupReceipt(b.profile.id)).rejects.toThrow("diesem Profil");
    await store.clearSetupReceipt(a.profile.id, "different"); expect(await store.readSetupReceipt(a.profile.id)).toEqual(receipt);
    await store.clearSetupReceipt(a.profile.id, receipt.value); expect(await store.readSetupReceipt(a.profile.id)).toBeUndefined();
  } finally { await rm(directory, { recursive: true, force: true }); }
});
it("keeps the Chronist key encrypted inside its own profile and never in clear text", async () => {
  const directory = await mkdtemp(join(tmpdir(), "chronicle-chronist-key-test-")), values = new Map<string, string>();
  const store = new ProfileStore(directory, {
    available: () => true,
    encrypt: text => { const cipher = randomBytes(96); values.set(cipher.toString("hex"), text); return cipher; },
    decrypt: bytes => { const text = values.get(bytes.toString("hex")); if (!text) throw new Error("Unknown test ciphertext"); return text; },
  });
  const key = "synthetic-test-key-a4f2c9";
  try {
    const a = await store.create("Original"), b = await store.create("Different");
    expect(await store.hasChronistKey(a.profile.id)).toBe(false);
    expect(await store.readChronistKey(a.profile.id)).toBeUndefined();
    await store.saveChronistKey(a.profile.id, key);
    expect(await store.hasChronistKey(a.profile.id)).toBe(true);
    expect(await store.readChronistKey(a.profile.id)).toBe(key);
    const bytes = await readFile(join(a.directory, "chronist-key.dpapi"));
    expect(bytes.includes(Buffer.from(key)), "Der Schlüssel darf nie im Klartext auf der Platte stehen").toBe(false);
    expect((await readdir(a.directory)).filter(name => name.endsWith(".tmp"))).toEqual([]);
    expect(await store.hasChronistKey(b.profile.id)).toBe(false);
    await copyFile(join(a.directory, "chronist-key.dpapi"), join(b.directory, "chronist-key.dpapi"));
    await expect(store.readChronistKey(b.profile.id)).rejects.toThrow("Profil");
    await expect(store.saveChronistKey("22222222-2222-4222-8222-222222222222", key)).rejects.toThrow();
    await expect(store.saveChronistKey("../../.local", key)).rejects.toThrow();
    await store.clearChronistKey(a.profile.id);
    expect(await store.hasChronistKey(a.profile.id)).toBe(false);
    expect(await store.readChronistKey(a.profile.id)).toBeUndefined();
    await store.clearChronistKey(a.profile.id);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
it("refuses to store a Chronist key without the Windows secret store", async () => {
  const directory = await mkdtemp(join(tmpdir(), "chronicle-chronist-key-off-")), id = "11111111-1111-4111-8111-111111111111";
  const store = new ProfileStore(directory, { available: () => false, encrypt: () => { throw new Error("must not run"); }, decrypt: () => "" });
  try {
    await expect(store.saveChronistKey(id, "synthetic-test-key")).rejects.toThrow("Windows");
    expect(await store.hasChronistKey(id)).toBe(false);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
it("starts the world without the key when the stored ciphertext cannot be read, and says so", async () => {
  // Ein fremdes Windows-Konto oder eine DPAPI-Rotation macht genau das aus dem Chiffrat: es
  // liegt da und entschlüsselt nicht. Das darf den Weltstart nicht verhindern — ohne Schlüssel
  // fehlt der Chronist-Anbieter, ohne Welt fehlt alles.
  const directory = await mkdtemp(join(tmpdir(), "chronicle-chronist-key-fremd-"));
  const box = { available: () => true, encrypt: (text: string) => Buffer.from(text, "utf8"),
    decrypt: () => { throw new Error("Decryption failed"); } };
  const store = new ProfileStore(directory, box);
  try {
    const owned = await store.create("Original"), file = join(owned.directory, "chronist-providers.json");
    await writeFile(join(owned.directory, "chronist-key.dpapi"), Buffer.from("fremdes-chiffrat"), { mode: 0o600 });
    // Der ausdrückliche Leser sagt weiterhin die Wahrheit; nur der Weltstart trägt sie anders.
    await expect(store.readChronistKey(owned.profile.id)).rejects.toThrow("nicht lesbar");
    const konfiguration = await store.chronistHostConfig(owned.profile.id);
    expect(konfiguration.key).toBeUndefined();
    expect(konfiguration.configPath).toBeUndefined();
    expect(konfiguration.hinweis).toContain("Chronist-Schlüssel");
    // Ohne brauchbaren Schlüssel entsteht auch keine profilinterne Betreiberdatei: der Host
    // behält seine eigene Ollama-Erkennung statt sie gegen einen toten Eintrag zu tauschen.
    expect(existsSync(file)).toBe(false);
    // Die Verwaltung sieht die Datei weiterhin — entfernen und neu setzen bleibt ihr Weg.
    expect(await store.hasChronistKey(owned.profile.id)).toBe(true);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
it("writes its own operator file once beside a stored key and never rewrites or fills it with the key", async () => {
  const directory = await mkdtemp(join(tmpdir(), "chronicle-chronist-config-test-")), values = new Map<string, string>();
  const store = new ProfileStore(directory, {
    available: () => true,
    encrypt: text => { const cipher = randomBytes(96); values.set(cipher.toString("hex"), text); return cipher; },
    decrypt: bytes => { const text = values.get(bytes.toString("hex")); if (!text) throw new Error("Unknown test ciphertext"); return text; },
  });
  const key = "synthetic-test-key-9be21f";
  try {
    const owned = await store.create("Original"), file = join(owned.directory, "chronist-providers.json");
    // Without a stored key nothing is configured: the host keeps its own Ollama discovery.
    expect(await store.chronistHostConfig(owned.profile.id)).toEqual({});
    expect(existsSync(file)).toBe(false);
    await store.saveChronistKey(owned.profile.id, key);
    expect(await store.chronistHostConfig(owned.profile.id)).toEqual({ key, configPath: file });
    expect(isAbsolute(file)).toBe(true);
    const written = await readFile(file, "utf8");
    expect(written).not.toContain(key);
    const settings = JSON.parse(written) as { schemaVersion: number; globalConcurrency: number; providers: Record<string, unknown>[] };
    expect(settings.schemaVersion).toBe(1);
    // The written file is the registry's documented default, not a second hand-kept copy of it.
    expect(settings.providers.map(provider => provider.profileId)).toEqual(["ollama-chat-1", CHRONIST_ANTHROPIC_PROFILE, CHRONIST_ANTHROPIC_PROFILE]);
    expect(settings.providers[0]).toMatchObject({ id: "ollama", location: "lokal", baseUrl: "http://127.0.0.1:11434",
      models: [CHRONIST_UNCONFIGURED_MODEL], available: false });
    expect(settings.providers.slice(1)).toEqual([
      { id: "anthropic", label: "Anthropic", profileId: CHRONIST_ANTHROPIC_PROFILE, location: "fremd", baseUrl: CHRONIST_ANTHROPIC_BASE_URL,
        models: [CHRONIST_ANTHROPIC_MODELS.standard], apiKeyEnv: CHRONIST_ANTHROPIC_KEY_ENV, pricing: CHRONIST_ANTHROPIC_PRICING["claude-sonnet-5"] },
      { id: "anthropic-haiku", label: "Anthropic (Sparmodus)", profileId: CHRONIST_ANTHROPIC_PROFILE, location: "fremd", baseUrl: CHRONIST_ANTHROPIC_BASE_URL,
        models: [CHRONIST_ANTHROPIC_MODELS.economy], apiKeyEnv: CHRONIST_ANTHROPIC_KEY_ENV, pricing: CHRONIST_ANTHROPIC_PRICING["claude-haiku-4-5"] },
    ]);
    // Neither Anthropic entry may pin availability: the stored key alone decides for both.
    expect(settings.providers.slice(1).some(provider => "available" in provider)).toBe(false);
    expect(settings.providers[1]!.baseUrl).toBe("https://api.anthropic.com/v1");
    expect(settings.providers.slice(1).map(provider => (provider.models as string[])[0])).toEqual(["claude-sonnet-5", "claude-haiku-4-5"]);
    expect(settings.providers.slice(1).map(provider => provider.pricing)).toEqual([
      { currency: "USD", asOf: "2026-09-08", inputMicrosPerMillion: 2_000_000, outputMicrosPerMillion: 10_000_000 },
      { currency: "USD", asOf: "2026-09-08", inputMicrosPerMillion: 1_000_000, outputMicrosPerMillion: 5_000_000 }]);
    expect(settings.providers.some(provider => "apiKey" in provider), "Die Betreiberdatei enthält nie einen Schlüssel").toBe(false);
    // An operator may edit this file; a later start must leave it byte for byte alone.
    const edited = `${written.replace("Kein lokales Modell eingerichtet", "mein-lokales-modell")}\n`;
    await writeFile(file, edited);
    expect(await store.chronistHostConfig(owned.profile.id)).toEqual({ key, configPath: file });
    expect(await readFile(file, "utf8")).toBe(edited);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

/**
 * Eine Welt loeschen.
 *
 * Der Anlass ist eine Bitte von Kaya („die option lokale welten zu löschen wäre auch gut"), und
 * die einzige Frage, die dabei zaehlt, ist die nach dem Versehen: eine Welt sind Monate Spiel.
 * Bestaetigt wird deshalb durch Tippen des Namens, und geprueft wird er hier — nicht im Fenster.
 */
it("löscht eine Welt nur gegen ihren getippten Namen und nie unter einem laufenden Host", async () => {
  const directory = await mkdtemp(join(tmpdir(), "chronicle-loeschen-test-"));
  const werte = new Map<string, string>();
  try {
    const store = new ProfileStore(directory, { available: () => true,
      encrypt: text => { const key = randomBytes(8).toString("hex"); werte.set(key, text); return Buffer.from(key); },
      decrypt: bytes => werte.get(bytes.toString())! });
    const welt = await store.create("Die Nordlande"), andere = await store.create("Die Sudlande");

    // Ein falscher Name loescht nichts — und die Fehlermeldung nennt den richtigen, sonst
    // raet man an der eigenen Welt herum.
    await expect(store.remove(welt.profile.id, "Die Nordlanden")).rejects.toThrow("Die Nordlande");
    await expect(store.remove(welt.profile.id, "  ")).rejects.toThrow();
    expect((await store.list()).map(profile => profile.name).sort()).toEqual(["Die Nordlande", "Die Sudlande"]);

    // Ein lebender Halter des Locks ist eine laufende Welt. Sie wird nicht unter sich weggezogen.
    const unlock = await store.lock(welt);
    await expect(store.remove(welt.profile.id, "Die Nordlande")).rejects.toThrow("läuft gerade");
    await unlock();

    // Fuehrende und folgende Leerzeichen sind Tippfehler, kein anderer Name: `label()` trimmt.
    expect((await store.remove(welt.profile.id, " Die Nordlande ")).id).toBe(welt.profile.id);
    expect(existsSync(welt.directory)).toBe(false);
    expect((await store.list()).map(profile => profile.name)).toEqual(["Die Sudlande"]);
    // Kein Rest im Profilordner: weder der Ordner selbst noch ein Grab daneben.
    expect(await readdir(join(directory, "profiles"))).toEqual([andere.profile.id]);

    // Ein Rest, den Windows beim Loeschen nicht freigab, steht in keiner Liste und wird beim
    // naechsten Blick in den Ordner weggeraeumt. (Gefunden im Pruefkauf gegen das Paket: dort
    // hielt der eben beendete Host den Ordner noch, das Umbenennen scheiterte.)
    const rest = join(directory, "profiles", ".deleting-6c59fc3e-1172-43d9-9e90-a60b5b46bed6");
    await mkdir(rest, { recursive: true });
    await writeFile(join(rest, "profile.json"), "kaputt");
    expect((await store.list()).map(profile => profile.name)).toEqual(["Die Sudlande"]);
    expect(existsSync(rest)).toBe(false);

    // Dieselbe Welt ein zweites Mal loeschen ist kein stiller Erfolg.
    await expect(store.remove(welt.profile.id, "Die Nordlande")).rejects.toThrow();
    // Und die verbliebene Welt ist unversehrt: Geheimnisse lesbar, Ports unveraendert.
    expect(await store.open(andere.profile.id)).toEqual(andere);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
