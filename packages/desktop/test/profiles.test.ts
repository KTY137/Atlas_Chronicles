// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { randomBytes } from "node:crypto";
import { copyFile, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
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
