// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { randomUUID } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { CAMPAIGN_V4_ADDITIONAL_TABLES, campaignSemanticDiffV4, createCampaignBundleV3, createCampaignBundleV4, serializeCampaignBundleV3, serializeCampaignBundleV4, type CampaignBundleV4 } from "@chronicle/io";
import { authoringFixtureV4, v4Config } from "../../io/test/native-v4-fixture.ts";
import { campaignFixtureV3 } from "../../io/test/campaign-v3-fixture.ts";
import { createPgDb, type Db } from "../src/db/index.ts";
import { createAuthoring } from "../src/domain/authoring.ts";
import { createPublication } from "../src/domain/public-projection.ts";
import { initializeCampaignRestoreTarget, restoreCampaignBundle } from "../src/domain/bundles.ts";
import { exportCampaignBundle } from "./export-v4-fixture.ts";
import { runBundleCli } from "../src/bundle-cli.ts";

const connection = process.env["TEST_DATABASE_URL"], schemas = [0, 1, 2, 3].map(() => `chronicle_bundle_v4_${randomUUID().replaceAll("-", "")}`);
describe.skipIf(!connection)("native v4 authoring restoration on real PostgreSQL", () => {
  let admin: Db, destination: Db, legacy: Db, failure: Db, schemaGuard: Db, directory: string;
  let nativeUrl: string, legacyUrl: string, bundle: CampaignBundleV4, fixture: Awaited<ReturnType<typeof authoringFixtureV4>>;
  beforeAll(async () => {
    fixture = await authoringFixtureV4(); bundle = createCampaignBundleV4(fixture.data);
    directory = await mkdtemp(join(tmpdir(), "chronicle-v4-cli-")); admin = createPgDb(connection!); const databases: Db[] = [];
    for (const [index, name] of schemas.entries()) {
      await admin.query(`CREATE SCHEMA "${name}"`); const url = new URL(connection!); url.searchParams.set("options", `-c search_path=${name}`);
      if (index === 0) nativeUrl = url.href; if (index === 1) legacyUrl = url.href;
      const db = createPgDb(url.href); databases.push(db); await initializeCampaignRestoreTarget(db);
    }
    [destination, legacy, failure, schemaGuard] = databases as [Db, Db, Db, Db];
  }, 30_000);
  afterAll(async () => {
    await Promise.all([destination?.close(), legacy?.close(), failure?.close(), schemaGuard?.close()]);
    if (admin) { try { for (const name of schemas) { if (!/^chronicle_bundle_v4_[a-f0-9]{32}$/.test(name)) throw new Error("Unexpected authoring test schema"); await admin.query(`DROP SCHEMA IF EXISTS "${name}" CASCADE`); } } finally { await admin.close(); } }
    if (directory) { const path = resolve(directory); if (dirname(path) !== resolve(tmpdir()) || !basename(path).startsWith("chronicle-v4-cli-")) throw new Error("Unexpected V4 CLI cleanup path"); await rm(path, { recursive: true, force: true }); }
  });

  it("checks/restores native v4 via the actual CLI and replays old authoring commands", async () => {
    const file = join(directory, "authoring.chronicle"), output = vi.spyOn(console, "log").mockImplementation(() => {});
    try {
      await writeFile(file, serializeCampaignBundleV4(bundle));
      await runBundleCli(["check", "--input", file], { DATABASE_URL: nativeUrl });
      expect(JSON.parse(String(output.mock.calls.at(-1)![0]))).toMatchObject({ formatVersion: 4, dryRun: true, enrollmentRequired: true });
      expect((await destination.query("SELECT 1 FROM users")).rowCount).toBe(0);
      await runBundleCli(["restore", "--input", file], { DATABASE_URL: nativeUrl });
      expect(JSON.parse(String(output.mock.calls.at(-1)![0]))).toMatchObject({ formatVersion: 4, dryRun: false });
      const campaign = bundle.manifest.campaignId, domain = createAuthoring(destination, v4Config);
      expect(campaignSemanticDiffV4(bundle, await exportCampaignBundle(destination, fixture.gm, campaign, v4Config))).toEqual([]);
      for (const table of CAMPAIGN_V4_ADDITIONAL_TABLES) expect((await destination.query(`SELECT 1 FROM "${table.name}"`)).rowCount).toBe(bundle.tables[table.name].length);
      expect(await domain.createTheme(fixture.gm, campaign, fixture.createInput)).toEqual({ subjectId: fixture.themeId, version: 1 });
      expect(await domain.publishEntry(fixture.gm, campaign, fixture.entryId, fixture.publishInput)).toEqual({ subjectId: fixture.entryId, version: 1 });
      expect(campaignSemanticDiffV4(bundle, await exportCampaignBundle(destination, fixture.gm, campaign, v4Config))).toEqual([]);
      expect((await destination.query("SELECT 1 FROM credentials")).rowCount).toBe(0);
      const policy = (await domain.getPublication(fixture.gm, campaign))!;
      expect(policy.enabled).toBe(true); await expect(createPublication(destination, v4Config).getWorld(policy.publicKey)).rejects.toThrow();
      const publicWorld = await createPublication(destination, { ...v4Config, publicDeliveryEnabled: true }).getWorld(policy.publicKey);
      expect(JSON.stringify(publicWorld)).toContain("Published passage"); expect(JSON.stringify(publicWorld)).not.toContain("Changed privately after publication");
    } finally { output.mockRestore(); }
  });

  it("accepts unchanged v3 only with the explicit CLI flag and emits the deterministic migration report", async () => {
    const file = join(directory, "historical-v3.chronicle"), source = createCampaignBundleV3(campaignFixtureV3()), output = vi.spyOn(console, "log").mockImplementation(() => {});
    try {
      await writeFile(file, serializeCampaignBundleV3(source));
      await expect(runBundleCli(["check", "--input", file], { DATABASE_URL: legacyUrl })).rejects.toThrow();
      await runBundleCli(["check", "--input", file, "--upgrade-from-v3"], { DATABASE_URL: legacyUrl });
      const checked = JSON.parse(String(output.mock.calls.at(-1)![0]));
      expect(checked).toMatchObject({ formatVersion: 4, dryRun: true, migration: { sourceVersion: 3, targetVersion: 4, sourceContentHash: source.manifest.contentHash,
        steps: [{ algorithm: "atlas-chronicles/v3-to-v4/empty-authoring@1" }] } });
      expect((await legacy.query("SELECT 1 FROM users")).rowCount).toBe(0);
      await runBundleCli(["restore", "--input", file, "--upgrade-from-v3"], { DATABASE_URL: legacyUrl });
      expect(JSON.parse(String(output.mock.calls.at(-1)![0])).migration).toEqual(checked.migration);
      const reopened = await exportCampaignBundle(legacy, "gm", "campaign", v4Config);
      expect(reopened.manifest.coreContentHash).toBe(source.manifest.contentHash);
      for (const table of CAMPAIGN_V4_ADDITIONAL_TABLES) expect(reopened.tables[table.name]).toEqual([]);
    } finally { output.mockRestore(); }
  });

  it("rolls back late authoring insertion and refuses new uncovered authoring columns", async () => {
    const wrapped = (db: Db): Db => ({ close: async () => {}, query: async (sql, args) => { if (sql.startsWith('INSERT INTO "authoring_events"')) throw new Error("Injected PostgreSQL authoring failure"); return db.query(sql, args); }, transaction: work => db.transaction(tx => work(wrapped(tx))) });
    await expect(restoreCampaignBundle(wrapped(failure), bundle)).rejects.toThrow("Injected PostgreSQL authoring failure");
    expect((await failure.query("SELECT 1 FROM users")).rowCount).toBe(0); expect((await failure.query("SELECT 1 FROM theme_presets")).rowCount).toBe(0);
    await restoreCampaignBundle(schemaGuard, bundle); await schemaGuard.query("ALTER TABLE campaign_publications ADD COLUMN future_authoring_state jsonb");
    await expect(exportCampaignBundle(schemaGuard, fixture.gm, bundle.manifest.campaignId, v4Config)).rejects.toThrow(/explicit format migration/);
  });
});
