import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { CAMPAIGN_V6_ADDITIONAL_TABLES, CAMPAIGN_V6_TABLES, currentCampaignSemanticDiff, parseCurrentCampaignBundle, serializeCurrentCampaignBundle } from "@chronicle/io";
import { tacticalAttribution, tacticalDocument } from "../../io/test/campaign-v3-fixture.ts";
import { createTestDb, migrate, type Db } from "../src/db/index.ts";
import { createIdentity } from "../src/identity/index.ts";
import { createCampaigns } from "../src/domain/campaigns.ts";
import { createGrundriss } from "../src/domain/grundriss.ts";
import { createTactical } from "../src/domain/tactical.ts";
import { createBetreten, type BetretenInput, type BetretenResult } from "../src/domain/betreten.ts";
import { exportCampaignBundle, initializeCampaignRestoreTarget, inspectCampaignRestore, restoreCampaignBundle } from "../src/domain/bundles.ts";

const cfg = { origin: "https://native-v6.test", cookieSecret: "native-v6-nested-maps-secret-over-thirty-two-characters", now: () => 1788696000000 };
describe("native v6 generated map persistence and restoration", () => {
  let source: Db, gm: string, campaign: string, rootId: string, childId: string, targetId: string;
  let enter: BetretenInput, entered: BetretenResult, attach: BetretenInput, attached: BetretenResult;
  beforeAll(async () => {
    source = await createTestDb(); await migrate(source); gm = (await createIdentity(source, cfg).bootstrap("Map author")).userId;
    campaign = (await createCampaigns(source, cfg).createCampaign(gm, { name: "Nested map restoration" })).id;
    rootId = (await createGrundriss(source, cfg).generate(gm, campaign, { commandId: randomUUID(), name: "Root", keim: "native-v6-root" })).ack.subjectId;
    const root = await createTactical(source, cfg).getMap(gm, campaign, rootId);
    enter = { commandId: randomUUID(), parentKind: "tactical", parentMapId: rootId, knotenId: root.document.geometry.regions[0]!.id, expectedVersion: root.version, name: "Generated child" };
    entered = await createBetreten(source, cfg).betrete(gm, campaign, enter); childId = entered.mapId;
    targetId = (await createTactical(source, cfg).importMap(gm, campaign, { commandId: randomUUID(), name: "Existing cellar", format: "native", sourceText: JSON.stringify(tacticalDocument()), provenance: tacticalAttribution })).subjectId;
    const child = await createTactical(source, cfg).getMap(gm, campaign, childId);
    attach = { commandId: randomUUID(), parentKind: "tactical", parentMapId: childId, knotenId: child.document.geometry.regions[0]!.id, expectedVersion: child.version, targetMapId: targetId };
    attached = await createBetreten(source, cfg).betrete(gm, campaign, attach);
  }, 30_000);
  afterAll(async () => { await source?.close(); });

  it("restores three levels, retained generator nodes and exact command retries into an empty target", async () => {
    const bundle = await exportCampaignBundle(source, gm, campaign, cfg), target = await createTestDb();
    try {
      expect(bundle.version).toBe(6);
      if (bundle.version !== 6) throw new Error("Nested rows require v6");
      for (const table of CAMPAIGN_V6_ADDITIONAL_TABLES) expect(bundle.tables[table.name].length).toBeGreaterThan(0);
      expect(bundle.tables.betreten_karten).toHaveLength(2);
      expect(attached.keimHash).toBeNull(); expect(entered.keimHash).toMatch(/^[a-f0-9]{64}$/);
      await initializeCampaignRestoreTarget(target);
      const parsed = parseCurrentCampaignBundle(serializeCurrentCampaignBundle(bundle));
      expect(await inspectCampaignRestore(target, parsed)).toMatchObject({ dryRun: true, formatVersion: 6 });
      expect((await target.query("SELECT 1 FROM users")).rowCount).toBe(0);
      expect(await restoreCampaignBundle(target, parsed)).toMatchObject({ dryRun: false, formatVersion: 6 });
      expect(currentCampaignSemanticDiff(bundle, await exportCampaignBundle(target, gm, campaign, cfg))).toEqual([]);
      const reopened = createBetreten(target, cfg);
      expect(await reopened.betrete(gm, campaign, enter)).toEqual(entered);
      expect(await reopened.betrete(gm, campaign, attach)).toEqual(attached);
      const children = await reopened.children(gm, campaign, { parentKind: "tactical", parentMapId: childId });
      expect(children.ancestors.map(row => row.id)).toEqual([rootId, childId]);
      expect(children.nodes.some(row => row.vorhandeneKarteId === targetId)).toBe(true);
      expect(currentCampaignSemanticDiff(bundle, await exportCampaignBundle(target, gm, campaign, cfg))).toEqual([]);
      expect((await target.query("SELECT 1 FROM credentials")).rowCount).toBe(0);
      await expect(target.query("DELETE FROM betreten_karten")).rejects.toThrow(/append-only/);
    } finally { await target.close(); }
  }, 30_000);

  it("rolls back the whole restore if its last entrance receipt cannot be inserted", async () => {
    const bundle = await exportCampaignBundle(source, gm, campaign, cfg), target = await createTestDb();
    try {
      await initializeCampaignRestoreTarget(target);
      const fault = (db: Db): Db => ({ close: async () => {}, query: async (sql, params) => { if (sql.startsWith('INSERT INTO "betreten_command_receipts"')) throw new Error("Injected nested receipt failure"); return db.query(sql, params); }, transaction: work => db.transaction(tx => work(fault(tx))) });
      await expect(restoreCampaignBundle(fault(target), bundle)).rejects.toThrow("Injected nested receipt failure");
      for (const table of CAMPAIGN_V6_TABLES) expect((await target.query(`SELECT 1 FROM "${table.name}" LIMIT 1`)).rowCount).toBe(0);
    } finally { await target.close(); }
  }, 20_000);
});
