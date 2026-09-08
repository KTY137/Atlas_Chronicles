// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { copyFile, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
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
