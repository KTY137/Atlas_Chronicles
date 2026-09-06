import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, dirname, basename } from "node:path";
import { describe, expect, it } from "vitest";
import { CAMPAIGN_V3_ADDITIONAL_TABLES, CAMPAIGN_V4_TABLES, createCampaignBundleV3, campaignSemanticDiffV4, parseCampaignBundleV2, upgradeCampaignBundleV2, upgradeCampaignBundleV3 } from "@chronicle/io";
import { campaignFixtureV3 } from "../../io/test/campaign-v3-fixture.ts";
import { createTestDb, migrate, type Db } from "../src/db/index.ts";
import { initializeCampaignRestoreTarget, inspectCampaignRestore, restoreCampaignBundle } from "../src/domain/bundles.ts";
import { exportCampaignBundle } from "./export-v4-fixture.ts";
import { createTactical } from "../src/domain/tactical.ts";
import { runBundleCli } from "../src/bundle-cli.ts";

const cfg = { now: () => 1788696000000 }, pose = (x: number) => ({ x, y: 0, elevation: 0, rotation: 0, scale: 1 });
describe("native v3 tactical restoration", () => {
  it("reopens all ten modules and deduplicates a pruned command after native restore and restart", async () => {
    const directory = await mkdtemp(join(tmpdir(), "chronicle-tactical-bundle-")), bundle = createCampaignBundleV3(campaignFixtureV3()), expected = upgradeCampaignBundleV3(bundle).bundle;
    let target = await createTestDb(directory);
    try {
      await initializeCampaignRestoreTarget(target);
      expect((await inspectCampaignRestore(target, bundle, { upgradeFromV3: true })).formatVersion).toBe(4);
      for (const table of CAMPAIGN_V4_TABLES) expect((await target.query(`SELECT 1 FROM "${table.name}" LIMIT 1`)).rowCount).toBe(0);
      await restoreCampaignBundle(target, bundle, { upgradeFromV3: true });
      for (const table of CAMPAIGN_V3_ADDITIONAL_TABLES) expect((await target.query(`SELECT 1 FROM "${table.name}" LIMIT 1`)).rowCount).toBe(1);
      expect(campaignSemanticDiffV4(expected, await exportCampaignBundle(target, "gm", "campaign", cfg))).toEqual([]);
      await target.close(); target = await createTestDb(directory); await migrate(target);
      const tactical = createTactical(target, cfg), first = { commandId: "move-1", expectedVersion: 1, ...pose(1) };
      expect(await tactical.moveToken("sera", "campaign", "session", "token", first)).toEqual({ subjectId: "token", version: 2 });
      expect(campaignSemanticDiffV4(expected, await exportCampaignBundle(target, "gm", "campaign", cfg))).toEqual([]);
      await expect(tactical.moveToken("sera", "campaign", "session", "token", { ...first, x: 100 })).rejects.toThrow();
      expect((await target.query("SELECT x,version FROM tactical_token_states WHERE token_id='token'")).rows[0]).toEqual({ x: 53, version: 54 });
      const move = { commandId: "new-move", expectedVersion: 54, ...pose(54) };
      expect(await tactical.moveToken("gm", "campaign", "session", "token", move)).toEqual({ subjectId: "token", version: 55 });
      expect(await tactical.undo("gm", "campaign", "session", { commandId: "undo-new", targetCommandId: "new-move", expectedVersion: 55 })).toEqual({ subjectId: "token", version: 56 });
      expect(await tactical.undo("gm", "campaign", "session", { commandId: "undo-older", targetCommandId: "move-53", expectedVersion: 56 })).toEqual({ subjectId: "token", version: 57 });
      expect(await tactical.moveToken("gm", "campaign", "session", "token", { commandId: "noop", expectedVersion: 57, ...pose(52) })).toEqual({ subjectId: "token", version: 57 });
      expect(await tactical.setPortal("gm", "campaign", "session", "portal", { commandId: "portal-open", expectedVersion: 1, closed: false })).toEqual({ subjectId: "portal", version: 2 });
      expect(await tactical.undo("gm", "campaign", "session", { commandId: "portal-undo", targetCommandId: "portal-open", expectedVersion: 2 })).toEqual({ subjectId: "portal", version: 3 });
      const changed = await exportCampaignBundle(target, "gm", "campaign", cfg);
      expect(changed.tables.tactical_transitions).toHaveLength(50);
      expect(changed.tables.session_tactical_states[0]).toMatchObject({ base_seq: "8", last_transition_seq: "58" });
      expect(changed.tables.session_tactical_states[0]!.initial_snapshot).toEqual(bundle.tables.session_tactical_states[0]!.initial_snapshot);
      expect(changed.tables.tactical_command_receipts.find(row => row.command_id === "move-1")!.ack).toEqual({ subjectId: "token", version: 2 });
      expect(changed.tables.tactical_transitions.some(row => row.command_id === "noop")).toBe(false);
      const second = await createTestDb();
      try {
        await initializeCampaignRestoreTarget(second); await restoreCampaignBundle(second, changed);
        expect(await createTactical(second, cfg).moveToken("sera", "campaign", "session", "token", first)).toEqual({ subjectId: "token", version: 2 });
        expect(campaignSemanticDiffV4(changed, await exportCampaignBundle(second, "gm", "campaign", cfg))).toEqual([]);
      } finally { await second.close(); }
      await target.query("UPDATE actor_controllers SET revoked_at=$1 WHERE actor_id='actor-sera' AND user_id='sera'", [cfg.now()]);
      await expect(tactical.moveToken("sera", "campaign", "session", "token", first)).rejects.toThrow();
      expect((await target.query("SELECT version FROM tactical_token_states WHERE token_id='token'")).rows[0]!.version).toBe(57);
    } finally {
      await target.close();
      const resolved = resolve(directory);
      if (dirname(resolved) !== resolve(tmpdir()) || !basename(resolved).startsWith("chronicle-tactical-bundle-")) throw new Error("Unexpected tactical test cleanup path");
      await rm(resolved, { recursive: true, force: true });
    }
  }, 30_000);

  it("rolls back every tactical and core row on a late receipt insertion failure", async () => {
    const db = await createTestDb();
    try {
      await initializeCampaignRestoreTarget(db);
      const fault = (inner: Db): Db => ({ close: async () => {}, query: async (sql, params) => {
        if (sql.startsWith('INSERT INTO "tactical_command_receipts"')) throw new Error("Injected tactical restore failure");
        return inner.query(sql, params);
      }, transaction: work => inner.transaction(tx => work(fault(tx))) });
      await expect(restoreCampaignBundle(fault(db), createCampaignBundleV3(campaignFixtureV3()), { upgradeFromV3: true })).rejects.toThrow("Injected tactical restore failure");
      for (const table of CAMPAIGN_V4_TABLES) expect((await db.query(`SELECT 1 FROM "${table.name}" LIMIT 1`)).rowCount).toBe(0);
    } finally { await db.close(); }
  }, 15_000);

  it("requires an explicit v2 upgrade and adds no invented tactical history", async () => {
    const source = parseCampaignBundleV2(await readFile(new URL("../../io/test/fixtures/campaign-v2.chronicle", import.meta.url), "utf8")), upgraded = upgradeCampaignBundleV2(source), v4 = upgradeCampaignBundleV3(upgraded.bundle), target = await createTestDb();
    try {
      await initializeCampaignRestoreTarget(target);
      await expect(inspectCampaignRestore(target, source)).rejects.toThrow(/explicit.*upgrade-from-v2/);
      const checked = await inspectCampaignRestore(target, source, { upgradeFromV2: true });
      expect(checked.migration?.steps).toEqual([upgraded.report, v4.report]);
      expect((await target.query("SELECT 1 FROM users")).rowCount).toBe(0);
      const restored = await restoreCampaignBundle(target, source, { upgradeFromV2: true });
      expect(restored.migration).toEqual(checked.migration);
      expect(campaignSemanticDiffV4(v4.bundle, await exportCampaignBundle(target, "gm", "campaign", cfg))).toEqual([]);
      for (const table of CAMPAIGN_V3_ADDITIONAL_TABLES) expect((await target.query(`SELECT 1 FROM "${table.name}" LIMIT 1`)).rowCount).toBe(0);
    } finally { await target.close(); }
  }, 15_000);

  it("rejects mixed upgrade flags and wrong source versions before database access", async () => {
    await expect(runBundleCli(["check", "--upgrade-from-v1", "--upgrade-from-v2"], {})).rejects.toThrow(/single explicit option/);
    await expect(runBundleCli(["initialize", "--upgrade-from-v2"], {})).rejects.toThrow(/check or restore/);
    const tripwire: Db = { query: async () => { throw new Error("Unexpected query"); }, transaction: async () => { throw new Error("Unexpected transaction"); }, close: async () => {} };
    await expect(inspectCampaignRestore(tripwire, { version: 3 }, { upgradeFromV2: true })).rejects.toThrow(/version 2 source/);
    await expect(inspectCampaignRestore(tripwire, { version: 1 }, { upgradeFromV1: true, upgradeFromV2: true })).rejects.toThrow(/exactly one/);
  });

  it.each([
    "ALTER TABLE tactical_token_states ADD COLUMN future_position jsonb",
    "CREATE TABLE tactical_future_history(id text PRIMARY KEY)",
  ])("keeps complete schema coverage after %s", async ddl => {
    const target = await createTestDb();
    try {
      await initializeCampaignRestoreTarget(target); await restoreCampaignBundle(target, createCampaignBundleV3(campaignFixtureV3()), { upgradeFromV3: true });
      await target.query(ddl);
      await expect(exportCampaignBundle(target, "gm", "campaign", cfg)).rejects.toThrow(/explicit format migration/);
    } finally { await target.close(); }
  }, 15_000);
});
