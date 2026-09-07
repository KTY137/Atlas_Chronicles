// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createCampaignBundleV3, campaignSemanticDiffV4, upgradeCampaignBundleV3 } from "@chronicle/io";
import { campaignFixtureV3 } from "../../io/test/campaign-v3-fixture.ts";
import { createPgDb, type Db } from "../src/db/index.ts";
import { initializeCampaignRestoreTarget, restoreCampaignBundle } from "../src/domain/bundles.ts";
import { exportCampaignBundle } from "./export-v4-fixture.ts";
import { createTactical } from "../src/domain/tactical.ts";
import { runBundleCli } from "../src/bundle-cli.ts";

const connection = process.env["TEST_DATABASE_URL"], cfg = { now: () => 1788696000000 };
const schemas = [0, 1, 2].map(() => `chronicle_bundle_v3_${randomUUID().replaceAll("-", "")}`);
function deferred() { let resolve!: () => void; const promise = new Promise<void>(done => { resolve = done; }); return { promise, resolve }; }
describe.skipIf(!connection)("native v3 restoration on PostgreSQL", () => {
  let admin: Db, source: Db, target: Db, cli: Db, cliUrl: string;
  const bundle = createCampaignBundleV3(campaignFixtureV3()), expected = upgradeCampaignBundleV3(bundle).bundle;
  beforeAll(async () => {
    admin = createPgDb(connection!); const databases: Db[] = [];
    for (const name of schemas) {
      await admin.query(`CREATE SCHEMA "${name}"`);
      const url = new URL(connection!); url.searchParams.set("options", `-c search_path=${name}`);
      const db = createPgDb(url.href); databases.push(db); await initializeCampaignRestoreTarget(db);
      if (name === schemas[2]) cliUrl = url.href;
    }
    [source, target, cli] = databases as [Db, Db, Db]; await restoreCampaignBundle(source, bundle, { upgradeFromV3: true });
  }, 30_000);
  afterAll(async () => {
    await Promise.all([source?.close(), target?.close(), cli?.close()]);
    if (admin) {
      for (const name of schemas) {
        if (!/^chronicle_bundle_v3_[a-f0-9]{32}$/.test(name)) throw new Error("Unexpected tactical test schema");
        await admin.query(`DROP SCHEMA IF EXISTS "${name}" CASCADE`);
      }
      await admin.close();
    }
  });
  it("restores real deferred map cycles and old receipts with zero semantic difference", async () => {
    await restoreCampaignBundle(target, await exportCampaignBundle(source, "gm", "campaign", cfg));
    expect(campaignSemanticDiffV4(expected, await exportCampaignBundle(target, "gm", "campaign", cfg))).toEqual([]);
    const replay = await createTactical(target, cfg).moveToken("sera", "campaign", "session", "token", { commandId: "move-1", expectedVersion: 1, x: 1, y: 0, elevation: 0, rotation: 0, scale: 1 });
    expect(replay).toEqual({ subjectId: "token", version: 2 });
    expect(campaignSemanticDiffV4(expected, await exportCampaignBundle(target, "gm", "campaign", cfg))).toEqual([]);
    await expect(target.query("DELETE FROM tactical_command_receipts WHERE command_id='move-1'")).rejects.toThrow(/append-only/);
  });
  it("collects one tactical snapshot while a movement commits between state and token reads", async () => {
    const reached = deferred(), release = deferred(); let stopped = false;
    const pause = (inner: Db): Db => ({ close: async () => {}, query: async (sql, args) => {
      if (!stopped && sql.includes('FROM "tactical_token_states"')) { stopped = true; reached.resolve(); await release.promise; }
      return inner.query(sql, args);
    }, transaction: work => inner.transaction(tx => work(pause(tx))) });
    const exporting = exportCampaignBundle(pause(source), "gm", "campaign", cfg);
    await reached.promise;
    try {
      expect(await createTactical(source, cfg).moveToken("gm", "campaign", "session", "token", { commandId: "during-export", expectedVersion: 54, x: 54, y: 0, elevation: 0, rotation: 0, scale: 1 })).toEqual({ subjectId: "token", version: 55 });
    } finally { release.resolve(); }
    expect(campaignSemanticDiffV4(expected, await exporting)).toEqual([]);
    expect((await exportCampaignBundle(source, "gm", "campaign", cfg)).tables.tactical_token_states[0]).toMatchObject({ x: 54, version: 55 });
  }, 15_000);
  it("checks and restores v2 only through the explicit CLI upgrade flag", async () => {
    const file = fileURLToPath(new URL("../../io/test/fixtures/campaign-v2.chronicle", import.meta.url)), output = vi.spyOn(console, "log").mockImplementation(() => {});
    try {
      await expect(runBundleCli(["check", "--input", file], { DATABASE_URL: cliUrl })).rejects.toThrow();
      await runBundleCli(["check", "--input", file, "--upgrade-from-v2"], { DATABASE_URL: cliUrl });
      const checked = JSON.parse(String(output.mock.calls.at(-1)![0]));
      expect(checked).toMatchObject({ formatVersion: 4, dryRun: true, migration: { sourceVersion: 2, targetVersion: 4, steps: [{ algorithm: "atlas-chronicles/v2-to-v3/empty-tactical@1" }, { algorithm: "atlas-chronicles/v3-to-v4/empty-authoring@1" }] } });
      expect((await cli.query("SELECT 1 FROM users")).rowCount).toBe(0);
      await runBundleCli(["restore", "--input", file, "--upgrade-from-v2"], { DATABASE_URL: cliUrl });
      expect(JSON.parse(String(output.mock.calls.at(-1)![0])).migration).toEqual(checked.migration);
      expect((await cli.query("SELECT 1 FROM credentials")).rowCount).toBe(0);
      expect((await cli.query("SELECT 1 FROM session_tactical_states")).rowCount).toBe(0);
    } finally { output.mockRestore(); }
  });
});
