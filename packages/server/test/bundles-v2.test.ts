import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { createCampaignBundle, emptyCampaignTables, parseCampaignBundle, upgradeCampaignBundleV1, upgradeCampaignBundleV2, upgradeCampaignBundleV3, campaignSemanticDiffV4, CAMPAIGN_TABLES, type CampaignTables, type CampaignRow } from "@chronicle/io";
import { createTestDb, migrate, type Db } from "../src/db/index.ts";
import { inspectCampaignRestore, restoreCampaignBundle } from "../src/domain/bundles.ts";
import { exportCampaignBundle } from "./export-v4-fixture.ts";
import { runBundleCli } from "../src/bundle-cli.ts";

describe("unchanged explicit v1 to v2 upgrade inside the v4 restore chain", () => {
  it("requires an explicit option and restores all v1 seals with only deterministic additions", async () => {
    const source = parseCampaignBundle(await readFile(new URL("../../io/test/fixtures/campaign-v1.chronicle", import.meta.url), "utf8"));
    const upgraded = upgradeCampaignBundleV1(source), v3 = upgradeCampaignBundleV2(upgraded.bundle), v4 = upgradeCampaignBundleV3(v3.bundle), target = await createTestDb();
    try {
      await migrate(target);
      await expect(inspectCampaignRestore(target, source)).rejects.toThrow(/explicit.*upgrade-from-v1/);
      await expect(restoreCampaignBundle(target, source)).rejects.toThrow(/explicit.*upgrade-from-v1/);
      const before = (await target.query("SELECT last_value::text,is_called FROM lineage_events_seq_seq")).rows;
      expect((await inspectCampaignRestore(target, source, { upgradeFromV1: true })).migration?.steps).toEqual([upgraded.report, v3.report, v4.report]);
      expect((await target.query("SELECT 1 FROM users")).rowCount).toBe(0);
      expect((await target.query("SELECT last_value::text,is_called FROM lineage_events_seq_seq")).rows).toEqual(before);
      expect((await restoreCampaignBundle(target, source, { upgradeFromV1: true })).migration?.steps).toEqual([upgraded.report, v3.report, v4.report]);
      const reopened = await exportCampaignBundle(target, "gm", "campaign", { now: () => Date.parse(source.manifest.exportedAt) });
      expect(campaignSemanticDiffV4(v4.bundle, reopened)).toEqual([]);
      for (const table of CAMPAIGN_TABLES) expect(reopened.tables[table.name]).toEqual(source.tables[table.name]);
      expect((await target.query("SELECT 1 FROM credentials")).rowCount).toBe(0);
      expect((await target.query("SELECT 1 FROM users WHERE platform_role<>'gast'")).rowCount).toBe(0);
      expect(reopened.tables.actor_inventory_events).toEqual([]);
    } finally { await target.close(); }
  }, 20_000);

  it("produces exactly migration 010's SQL backfill for authorized and unbound legacy actors", async () => {
    const db = await createTestDb();
    const tables = emptyCampaignTables() as unknown as Record<keyof CampaignTables, CampaignRow[]>;
    tables.users = ["gm", "player", "observer"].map(id => ({ id, display_name: id, created_at: "1" }));
    tables.universes = [{ id: "u", owner_user_id: "gm", name: "Old universe" }];
    tables.campaigns = [{ id: "c", universe_id: "u", owner_user_id: "gm", name: "Old campaign", version: 1, created_at: "1" }];
    tables.actors = [
      { id: "primary", campaign_id: "c", user_id: "player", name: "Player actor" },
      { id: "secondary", campaign_id: "c", user_id: "player", name: "No old authority" },
      { id: "observer-actor", campaign_id: "c", user_id: "observer", name: "Observer historical binding" },
    ];
    tables.campaign_memberships = [
      { campaign_id: "c", user_id: "gm", role: "leitung", display_name: "gm", name_skeleton: "gm", actor_id: null },
      { campaign_id: "c", user_id: "player", role: "spieler", display_name: "player", name_skeleton: "player", actor_id: "primary" },
      { campaign_id: "c", user_id: "observer", role: "beobachter", display_name: "observer", name_skeleton: "observer", actor_id: "observer-actor" },
    ];
    const source = createCampaignBundle({ campaignId: "c", universeId: "u", exportedAt: "2026-09-06T00:00:00.000Z", tables: tables as CampaignTables });
    try {
      // Execute the real pre-010 SQL, recording its genuine checksums. No migration
      // file is edited and no currently configured application database is opened.
      const directory = new URL("../src/db/migrations/", import.meta.url);
      await db.query("CREATE TABLE schema_migrations(name text PRIMARY KEY,sha256 text NOT NULL)");
      for (const name of (await readdir(directory)).filter(name => /^00[1-9]_.*\.sql$/.test(name)).sort()) {
        const sql = await readFile(new URL(name, directory), "utf8");
        await db.transaction(async tx => {
          for (const statement of sql.split(/^-- statement\s*$/m).map(part => part.trim()).filter(Boolean)) await tx.query(statement);
          await tx.query("INSERT INTO schema_migrations(name,sha256) VALUES($1,$2)", [name, createHash("sha256").update(sql).digest("hex")]);
        });
      }
      for (const name of ["users", "universes", "campaigns", "actors", "campaign_memberships"] as const) {
        const columns = CAMPAIGN_TABLES.find(table => table.name === name)!.columns.map(column => `"${column}"`).join(",");
        await db.query(`INSERT INTO "${name}" (${columns}) SELECT ${columns} FROM jsonb_populate_recordset(NULL::"${name}",$1::jsonb)`, [JSON.stringify(source.tables[name])]);
      }
      await migrate(db);
      const actual = await exportCampaignBundle(db, "gm", "c", { now: () => Date.parse(source.manifest.exportedAt) });
      expect(campaignSemanticDiffV4(upgradeCampaignBundleV3(upgradeCampaignBundleV2(upgradeCampaignBundleV1(source).bundle).bundle).bundle, actual)).toEqual([]);
      expect(actual.tables.actor_controllers).toHaveLength(1);
      expect(actual.tables.actor_controllers[0]!.actor_id).toBe("primary");
    } finally { await db.close(); }
  }, 20_000);

  it("rejects misplaced or repeated upgrade flags before opening a database", async () => {
    await expect(runBundleCli(["initialize", "--upgrade-from-v1"], {})).rejects.toThrow(/check or restore/);
    await expect(runBundleCli(["check", "--upgrade-from-v1", "--upgrade-from-v1"], {})).rejects.toThrow(/single explicit option/);
    const tripwire: Db = { query: async () => { throw new Error("Unexpected database read"); }, transaction: async () => { throw new Error("Unexpected database transaction"); }, close: async () => {} };
    const input = { version: 1 };
    await expect(restoreCampaignBundle(tripwire, input)).rejects.toThrow(/explicit/);
    await expect(inspectCampaignRestore(tripwire, { version: 2 }, { upgradeFromV1: true })).rejects.toThrow(/version 1 source/);
  });
});
