// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, dirname, basename } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { CAMPAIGN_V4_ADDITIONAL_TABLES, CAMPAIGN_V4_TABLES, campaignSemanticDiffV4, createCampaignBundleV3, upgradeCampaignBundleV3 } from "@chronicle/io";
import { getThemePreset } from "@chronicle/theme";
import { campaignFixtureV3 } from "../../io/test/campaign-v3-fixture.ts";
import { createTestDb, migrate, type Db } from "../src/db/index.ts";
import { createIdentity } from "../src/identity/index.ts";
import { createCampaigns } from "../src/domain/campaigns.ts";
import { createDocuments } from "../src/domain/documents.ts";
import { createAuthoring } from "../src/domain/authoring.ts";
import { createPublication } from "../src/domain/public-projection.ts";
import { initializeCampaignRestoreTarget, inspectCampaignRestore, restoreCampaignBundle } from "../src/domain/bundles.ts";
import { exportCampaignBundle } from "./export-v4-fixture.ts";
import { runBundleCli } from "../src/bundle-cli.ts";

const cfg = { origin: "https://bundle-authoring.test", cookieSecret: "bundle-authoring-test-secret-over-thirty-two-characters", now: () => 1788696000000 };
const paragraph = (text: string) => ({ inhalt: { kind: "absatz" as const, inhalt: [{ text, marks: [] }] } });
describe("native v4 complete authoring restoration", () => {
  let source: Db, gm: string, campaign: string, entryId: string, publicKey: string, themeId: string;
  let themeCommand: { commandId: string; manifest: ReturnType<typeof getThemePreset> }, publishCommand: Record<string, unknown>;
  beforeAll(async () => {
    source = await createTestDb(); await migrate(source); gm = (await createIdentity(source, cfg).bootstrap("Kaya")).userId;
    campaign = (await createCampaigns(source, cfg).createCampaign(gm, { name: "Authoring restoration" })).id;
    const docs = createDocuments(source, cfg), entry = await docs.saveEntry(gm, campaign, { title: "Shared article", passages: [paragraph("Selected public passage"), paragraph("Private passage")] });
    entryId = entry.entryId; const authoring = createAuthoring(source, cfg);
    themeCommand = { commandId: randomUUID(), manifest: getThemePreset("Fantasy") };
    themeId = (await authoring.createTheme(gm, campaign, themeCommand)).subjectId;
    await authoring.pinTheme(gm, campaign, { commandId: randomUUID(), expectedVersion: 0, themeId, revision: 1 });
    await authoring.reviseTheme(gm, campaign, themeId, { commandId: randomUUID(), expectedVersion: 1, manifest: { ...themeCommand.manifest, name: "Private later theme" } });
    const policy = { commandId: randomUUID(), expectedVersion: 0, enabled: true, worldSlug: "original-world", title: "Public world", description: "An explicit publication", locale: "de", contentWarnings: ["Fantasy violence"], theme: { themeId, revision: 1 } };
    await authoring.configurePublication(gm, campaign, policy);
    publishCommand = { commandId: randomUUID(), expectedArticleRevisionId: entry.revisionId!, expectedPublicationVersion: 0, expectedPolicyVersion: 1, passageIds: [entry.passagen[0]!.pid], publicSlug: "published-article", contentWarnings: [], mintIds: [] };
    await authoring.publishEntry(gm, campaign, entryId, publishCommand);
    await authoring.configurePublication(gm, campaign, { ...policy, commandId: randomUUID(), expectedVersion: 1, worldSlug: "current-world" });
    await authoring.addRoute(gm, campaign, { commandId: randomUUID(), expectedPolicyVersion: 2, kind: "article", route: "older-article", entryId, sourceUrl: null });
    await docs.saveEntry(gm, campaign, { title: "Private later title", expectedVersion: entry.version!, passages: [{ ...paragraph("Private replacement"), pid: entry.passagen[0]!.pid }, { ...paragraph("Still private"), pid: entry.passagen[1]!.pid }] }, entryId);
    publicKey = (await authoring.getPublication(gm, campaign))!.publicKey;
  }, 30_000);
  afterAll(async () => { await source?.close(); });

  it("reopens all seven authoring tables, frozen publications and old command receipts without enabling host delivery", async () => {
    const bundle = await exportCampaignBundle(source, gm, campaign, cfg), directory = await mkdtemp(join(tmpdir(), "chronicle-authoring-restore-"));
    let target = await createTestDb(directory);
    try {
      expect(bundle.version).toBe(4); for (const table of CAMPAIGN_V4_ADDITIONAL_TABLES) expect(bundle.tables[table.name].length).toBeGreaterThan(0);
      expect(bundle.tables.users.some(user => user.id === bundle.tables.entry_publications[0]!.published_by)).toBe(true);
      await initializeCampaignRestoreTarget(target);
      expect(await inspectCampaignRestore(target, bundle)).toMatchObject({ formatVersion: 4, dryRun: true, enrollmentRequired: true });
      expect((await target.query("SELECT 1 FROM users")).rowCount).toBe(0);
      await restoreCampaignBundle(target, bundle);
      expect(campaignSemanticDiffV4(bundle, await exportCampaignBundle(target, gm, campaign, cfg))).toEqual([]);
      await target.close(); target = await createTestDb(directory); await migrate(target);
      const authoring = createAuthoring(target, cfg);
      expect((await authoring.getTheme(gm, campaign, themeId)).revision).toBe(2);
      expect((await authoring.getThemePin(gm, campaign)).pin).toMatchObject({ themeId, revision: 1 });
      expect(await authoring.createTheme(gm, campaign, themeCommand)).toEqual({ subjectId: themeId, version: 1 });
      expect(await authoring.publishEntry(gm, campaign, entryId, publishCommand)).toEqual({ subjectId: entryId, version: 1 });
      await expect(authoring.publishEntry(gm, campaign, entryId, { ...publishCommand, publicSlug: "changed-retry" })).rejects.toThrow();
      expect(campaignSemanticDiffV4(bundle, await exportCampaignBundle(target, gm, campaign, cfg))).toEqual([]);
      expect((await target.query("SELECT 1 FROM credentials")).rowCount).toBe(0);
      await expect(createPublication(target, cfg).getWorld(publicKey)).rejects.toThrow();
      const world = await createPublication(target, { ...cfg, publicDeliveryEnabled: true }).getWorld(publicKey);
      expect(JSON.stringify(world)).toContain("Selected public passage"); expect(JSON.stringify(world)).not.toContain("Private replacement");
      await expect(target.query("DELETE FROM theme_preset_revisions")).rejects.toThrow(/append-only/);
      await expect(target.query("DELETE FROM authoring_events")).rejects.toThrow(/append-only/);
    } finally {
      await target.close(); const path = resolve(directory);
      if (dirname(path) !== resolve(tmpdir()) || !basename(path).startsWith("chronicle-authoring-restore-")) throw new Error("Unexpected authoring test cleanup path");
      await rm(path, { recursive: true, force: true });
    }
  }, 30_000);

  it("rolls back every restored row if the final immutable authoring event insertion fails", async () => {
    const bundle = await exportCampaignBundle(source, gm, campaign, cfg), target = await createTestDb();
    try {
      await initializeCampaignRestoreTarget(target);
      const fault = (db: Db): Db => ({ close: async () => {}, query: async (sql, params) => { if (sql.startsWith('INSERT INTO "authoring_events"')) throw new Error("Injected final authoring failure"); return db.query(sql, params); }, transaction: work => db.transaction(tx => work(fault(tx))) });
      await expect(restoreCampaignBundle(fault(target), bundle)).rejects.toThrow("Injected final authoring failure");
      for (const table of CAMPAIGN_V4_TABLES) expect((await target.query(`SELECT 1 FROM "${table.name}" LIMIT 1`)).rowCount).toBe(0);
    } finally { await target.close(); }
  }, 15_000);

  it("requires an explicit v3 upgrade and retains its unchanged tactical seals", async () => {
    const source = createCampaignBundleV3(campaignFixtureV3()), upgraded = upgradeCampaignBundleV3(source), target = await createTestDb();
    try {
      await initializeCampaignRestoreTarget(target);
      await expect(inspectCampaignRestore(target, source)).rejects.toThrow(/explicit.*upgrade-from-v3/);
      const checked = await inspectCampaignRestore(target, source, { upgradeFromV3: true });
      expect(checked).toMatchObject({ formatVersion: 4, migration: { sourceVersion: 3, targetVersion: 4, steps: [upgraded.report] } });
      await restoreCampaignBundle(target, source, { upgradeFromV3: true });
      expect(campaignSemanticDiffV4(upgraded.bundle, await exportCampaignBundle(target, "gm", "campaign", cfg))).toEqual([]);
      for (const table of CAMPAIGN_V4_ADDITIONAL_TABLES) expect((await target.query(`SELECT 1 FROM "${table.name}"`)).rowCount).toBe(0);
    } finally { await target.close(); }
  }, 15_000);

  it("rejects conflicting, repeated or misplaced v3 flags before any database access", async () => {
    for (const args of [["initialize", "--upgrade-from-v3"], ["check", "--upgrade-from-v3", "--upgrade-from-v3"], ["restore", "--upgrade-from-v2", "--upgrade-from-v3"]])
      await expect(runBundleCli(args, {})).rejects.toThrow(/check or restore|single explicit option/);
    const tripwire: Db = { query: async () => { throw new Error("Unexpected database access"); }, transaction: async () => { throw new Error("Unexpected database access"); }, close: async () => {} };
    await expect(inspectCampaignRestore(tripwire, { version: 4 }, { upgradeFromV3: true })).rejects.toThrow(/version 3 source/);
  });
});
