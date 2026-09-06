import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { campaignSemanticDiffV3 as campaignSemanticDiff, type CampaignBundleV3 as CampaignBundle } from "@chronicle/io";
import { createPgDb, migrate, type Db } from "../src/db/index.ts";
import { createIdentity } from "../src/identity/index.ts";
import { createCampaigns } from "../src/domain/campaigns.ts";
import { createDocuments } from "../src/domain/documents.ts";
import { createGameplay } from "../src/domain/gameplay.ts";
import { seedBundleActors } from "./bundle-actors-fixture.ts";
import { runBundleCli } from "../src/bundle-cli.ts";
import { exportCampaignBundle, initializeCampaignRestoreTarget, restoreCampaignBundle } from "../src/domain/bundles.ts";

const connection = process.env["TEST_DATABASE_URL"];
const schemas = [0, 1, 2, 3].map(() => `chronicle_bundle_${randomUUID().replaceAll("-", "")}`);
const config = { origin: "https://bundle.test", cookieSecret: "bundle-test-cookie-secret".repeat(2), now: () => Date.UTC(2026, 8, 6, 12), seed: () => "00000001000000020000000300000004" };
const paragraph = (text: string) => ({ inhalt: { kind: "absatz" as const, inhalt: [{ text, marks: [] }] } });
function deferred() { let resolve!: () => void; const promise = new Promise<void>(done => { resolve = done; }); return { promise, resolve }; }

describe.skipIf(!connection)("native campaign restore on real PostgreSQL", () => {
  let admin: Db, source: Db, target: Db, failedTarget: Db, cliTarget: Db, cliUrl: string, gm: string, campaign: string, entry: string, bundle: CampaignBundle;
  beforeAll(async () => {
    admin = createPgDb(connection!);
    const databases: Db[] = [];
    for (const schema of schemas) {
      await admin.query(`CREATE SCHEMA "${schema}"`);
      const url = new URL(connection!); url.searchParams.set("options", `-c search_path=${schema}`);
      if (schema === schemas[3]) cliUrl = url.href;
      const db = createPgDb(url.href); databases.push(db); await initializeCampaignRestoreTarget(db);
    }
    [source, target, failedTarget, cliTarget] = databases as [Db, Db, Db, Db];
    gm = (await createIdentity(source, config).bootstrap("Kaya")).userId;
    const campaigns = createCampaigns(source, config); campaign = (await campaigns.createCampaign(gm, { name: "Postgres restoration" })).id;
    const invitation = await campaigns.issueInvitation(gm, campaign), joined = await campaigns.requestJoin(invitation.code, { displayName: "Sera" });
    const player = await campaigns.approveJoin(gm, campaign, joined.id);
    const docs = createDocuments(source, config), created = await docs.saveEntry(gm, campaign, { title: "Original snapshot", passages: [paragraph("Original atom")] });
    entry = created.entryId;
    const game = createGameplay(source, config), scene = await game.createScene(gm, campaign, { name: "Evening", entryIds: [entry], fictionDate: "Day 1" });
    await game.startScene(gm, campaign, scene.id);
    const door = await game.issueVollmacht(gm, campaign, { commandId: randomUUID(), actorId: player.actorId, passageId: created.passagen[0]!.pid, actionId: "investigate", threshold: -1000, expiresAt: config.now() + 60_000, budgetKind: "player", fictionDate: "Day 1" });
    const roll = await game.prepareVollmacht(player.userId, campaign, door.id, { commandId: randomUUID() }); await game.confirmVollmacht(player.userId, campaign, roll.id);
    await seedBundleActors(source, campaign, gm, player.userId, entry, config);
    bundle = await exportCampaignBundle(source, gm, campaign, config);
  }, 30_000);
  afterAll(async () => {
    await Promise.all([source?.close(), target?.close(), failedTarget?.close(), cliTarget?.close()]);
    if (admin) {
      for (const schema of schemas) {
        if (!/^chronicle_bundle_[a-f0-9]{32}$/.test(schema)) throw new Error("Unexpected test schema");
        await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
      }
      await admin.close();
    }
  });

  it("restores real deferred cycles and history with zero semantic difference", async () => {
    await restoreCampaignBundle(target, bundle);
    expect(campaignSemanticDiff(bundle, await exportCampaignBundle(target, gm, campaign, config))).toEqual([]);
    expect((await target.query("SELECT 1 FROM credentials")).rowCount).toBe(0);
    expect((await target.query("SELECT 1 FROM action_vollmachten WHERE consumed_roll_id IS NOT NULL")).rowCount).toBe(1);
    expect((await target.query("SELECT 1 FROM week_baselines")).rowCount).toBe(1);
    expect((await target.query("SELECT 1 FROM actor_template_revisions")).rowCount).toBe(2);
    expect((await target.query("SELECT 1 FROM item_template_revisions")).rowCount).toBe(2);
    await expect(target.query("DELETE FROM week_baselines")).rejects.toThrow(/append-only/);
    await migrate(target); // migration checksums, including 009, remain repeatable.
  });

  it("checks and restores an explicit v1 input through the real local administrator CLI", async () => {
    const input = fileURLToPath(new URL("../../io/test/fixtures/campaign-v1.chronicle", import.meta.url)), output = vi.spyOn(console, "log").mockImplementation(() => {});
    try {
      await expect(runBundleCli(["check", "--input", input], { DATABASE_URL: cliUrl })).rejects.toThrow();
      await runBundleCli(["check", "--input", input, "--upgrade-from-v1"], { DATABASE_URL: cliUrl });
      const checked = JSON.parse(String(output.mock.calls.at(-1)![0]));
      expect(checked).toMatchObject({ formatVersion: 3, dryRun: true, migration: { sourceVersion: 1, targetVersion: 3 } });
      expect((await cliTarget.query("SELECT 1 FROM users")).rowCount).toBe(0);
      await runBundleCli(["restore", "--upgrade-from-v1", "--input", input], { DATABASE_URL: cliUrl });
      const restored = JSON.parse(String(output.mock.calls.at(-1)![0]));
      expect(restored.migration).toEqual(checked.migration);
      expect(restored).toMatchObject({ dryRun: false, enrollmentRequired: true });
      expect((await cliTarget.query("SELECT 1 FROM credentials")).rowCount).toBe(0);
      expect((await exportCampaignBundle(cliTarget, "gm", "campaign", config)).manifest.coreContentHash).toBe(checked.migration.steps[0].targetContentHash);
    } finally { output.mockRestore(); }
  });

  it("exports one snapshot while an ordinary writer commits between table reads", async () => {
    const selected = deferred(), resume = deferred();
    const paused: Db = { ...source, transaction: fn => source.transaction(tx => fn({ ...tx, query: async <T>(sql: string, params?: readonly unknown[]) => {
      const result = await tx.query<T>(sql, params);
      if (sql.includes('FROM "entries" WHERE')) { selected.resolve(); await resume.promise; }
      return result;
    } })) };
    const exporting = exportCampaignBundle(paused, gm, campaign, config);
    await selected.promise;
    try {
      const docs = createDocuments(source, config), old = await docs.getEntry(gm, campaign, entry);
      await docs.saveEntry(gm, campaign, { title: "Later committed title", expectedVersion: old.version!, passages: [{ ...paragraph("Later content"), pid: old.passagen[0]!.pid }] }, entry);
    } finally { resume.resolve(); }
    const snapshot = await exporting;
    expect(snapshot.tables.entries[0]!.title).toBe("Original snapshot");
    expect(campaignSemanticDiff(bundle, snapshot)).toEqual([]);
    expect((await exportCampaignBundle(source, gm, campaign, config)).tables.entries[0]!.title).toBe("Later committed title");
  });

  it("rolls back prior identity restarts when the final restore step fails", async () => {
    const sequences = async () => (await failedTarget.query("SELECT last_value::text,is_called FROM lineage_events_seq_seq")).rows;
    const before = await sequences();
    const fault: Db = { ...failedTarget, transaction: fn => failedTarget.transaction(tx => fn({ ...tx, query: async <T>(sql: string, params?: readonly unknown[]) => {
      if (sql.startsWith('ALTER TABLE "access_incidents"')) throw new Error("Final restore failure");
      return tx.query<T>(sql, params);
    } })) };
    await expect(restoreCampaignBundle(fault, bundle)).rejects.toThrow("Final restore failure");
    expect((await failedTarget.query("SELECT 1 FROM users")).rowCount).toBe(0);
    expect((await failedTarget.query("SELECT 1 FROM lineage_events")).rowCount).toBe(0);
    expect(await sequences()).toEqual(before);
    await restoreCampaignBundle(failedTarget, bundle);
    expect(campaignSemanticDiff(bundle, await exportCampaignBundle(failedTarget, gm, campaign, config))).toEqual([]);
  });

  it("holds GM membership until snapshot collection finishes", async () => {
    const selected = deferred(), resume = deferred(), changerStarted = deferred();
    const paused: Db = { ...source, transaction: fn => source.transaction(tx => fn({ ...tx, query: async <T>(sql: string, params?: readonly unknown[]) => {
      const result = await tx.query<T>(sql, params);
      if (sql.includes('FROM "entries" WHERE')) { selected.resolve(); await resume.promise; }
      return result;
    } })) };
    const exporting = exportCampaignBundle(paused, gm, campaign, config);
    await selected.promise;
    let changerPid = 0, changed = false;
    const changing = source.transaction(async tx => {
      changerPid = (await tx.query<{ pid: number }>("SELECT pg_backend_pid() AS pid")).rows[0]!.pid;
      changerStarted.resolve();
      await tx.query("UPDATE campaign_memberships SET role='beobachter' WHERE campaign_id=$1 AND user_id=$2", [campaign, gm]);
      changed = true;
    });
    try {
      await changerStarted.promise;
      await expect.poll(async () => (await admin.query<{ blocked: boolean }>("SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE pid=$1 AND wait_event_type='Lock') AS blocked", [changerPid])).rows[0]!.blocked).toBe(true);
      expect(changed).toBe(false);
      resume.resolve();
      const snapshot = await exporting;
      expect(snapshot.tables.campaign_memberships.find(row => row.user_id === gm)!.role).toBe("leitung");
      await changing;
      await expect(exportCampaignBundle(source, gm, campaign, config)).rejects.toThrow();
    } finally {
      resume.resolve(); await Promise.allSettled([exporting, changing]);
      await source.query("UPDATE campaign_memberships SET role='leitung' WHERE campaign_id=$1 AND user_id=$2", [campaign, gm]);
    }
  });
});
