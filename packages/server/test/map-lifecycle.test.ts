// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createCurrentCampaignBundle, currentCampaignSemanticDiff, currentCampaignTables } from "@chronicle/io";
import { tacticalAttribution, tacticalDocument } from "../../io/test/campaign-v3-fixture.ts";
import { createTestDb, migrate, type Db } from "../src/db/index.ts";
import { createIdentity } from "../src/identity/index.ts";
import { createCampaigns } from "../src/domain/campaigns.ts";
import { createTactical } from "../src/domain/tactical.ts";
import { createBetreten } from "../src/domain/betreten.ts";
import { createMapLifecycle } from "../src/domain/map-lifecycle.ts";
import { createGameplay } from "../src/domain/gameplay.ts";
import { createDeletion } from "../src/domain/deletion.ts";
import { Gone } from "../src/domain/errors.ts";
import { createAtlas } from "../src/domain/atlas.ts";
import { exportCampaignBundle, initializeCampaignRestoreTarget, restoreCampaignBundle } from "../src/domain/bundles.ts";
import { readFileSync } from "node:fs";
/** Die mitgelieferte Beispielkarte als reine Quelle — derselbe Weg wie jeder andere Import. */
const beispielkarte = () => readFileSync(new URL("../../../design/fixtures/eron/map-andaria.json", import.meta.url), "utf8");

const config = { origin: "https://map-lifecycle.test", cookieSecret: "map-lifecycle-secret-more-than-thirty-two-characters", now: Date.now };
describe("map retirement and retained evidence", () => {
  let db: Db, gm: string;
  beforeAll(async () => { db = await createTestDb(); await migrate(db); gm = (await createIdentity(db, config).bootstrap("Kaya")).userId; }, 30_000);
  afterAll(async () => { await db?.close(); });
  async function fixture() {
    const campaign = (await createCampaigns(db).createCampaign(gm, { name: "Retirement" })).id;
    const tactical = createTactical(db, config), entering = createBetreten(db, config), lifecycle = createMapLifecycle(db, config);
    const makeMap = async (name: string) => (await tactical.importMap(gm, campaign, { commandId: randomUUID(), name, format: "native", sourceText: JSON.stringify(tacticalDocument()), provenance: tacticalAttribution })).subjectId;
    const parent = await makeMap("Parent"), child = await makeMap("Child"), grandchild = await makeMap("Grandchild");
    const enter = { commandId: randomUUID(), parentKind: "tactical" as const, parentMapId: parent, knotenId: "room", expectedVersion: 1, targetMapId: child };
    await entering.betrete(gm, campaign, enter);
    await entering.betrete(gm, campaign, { ...enter, commandId: randomUUID(), parentMapId: child, targetMapId: grandchild });
    const reference = { kind: "tactical" as const, id: child };
    const preview = await lifecycle.preview(gm, campaign, reference);
    const input = { commandId: randomUUID(), expectedVersion: preview.root.version, confirmationHash: preview.confirmationHash, confirmedMapIds: preview.maps.map(map => `${map.kind}:${map.id}`) };
    return { campaign, tactical, entering, lifecycle, makeMap, parent, child, grandchild, enter, reference, preview, input };
  }
  it("preserves the previous current-writer contract for tables without new sidecars", async () => {
    const f = await fixture(), bundle = await exportCampaignBundle(db, gm, f.campaign);
    const { map_lifecycle_events: _events, tactical_map_cartography: _cartography, ...previous } = currentCampaignTables(bundle);
    const rebuilt = createCurrentCampaignBundle({ campaignId: f.campaign, universeId: bundle.manifest.universeId, exportedAt: bundle.manifest.exportedAt, tables: previous });
    expect(rebuilt).toEqual(bundle);
  });
  it("requires the entire displayed subtree and keeps command retries bound to their original result", async () => {
    const f = await fixture();
    expect(f.preview.maps.map(map => map.id).sort()).toEqual([f.child, f.grandchild].sort());
    const before = (await db.query("SELECT * FROM betreten_karten WHERE campaign_id=$1 ORDER BY map_id", [f.campaign])).rows;
    await expect(f.lifecycle.remove(gm, f.campaign, f.reference, { ...f.input, confirmedMapIds: [`tactical:${f.child}`] })).rejects.toMatchObject({ code: "deletion-preview-changed" });
    expect(await f.tactical.listMaps(gm, f.campaign)).toHaveLength(3);
    const ack = await f.lifecycle.remove(gm, f.campaign, f.reference, f.input);
    expect((await db.query("SELECT * FROM betreten_karten WHERE campaign_id=$1 ORDER BY map_id", [f.campaign])).rows).toEqual(before);
    expect((await f.tactical.listMaps(gm, f.campaign)).map(map => map.id)).toEqual([f.parent]);
    const replacement = await f.makeMap("Replacement");
    await f.entering.betrete(gm, f.campaign, { ...f.enter, commandId: randomUUID(), targetMapId: replacement, expectedVersion: ack.parent!.version });
    expect(await f.lifecycle.remove(gm, f.campaign, f.reference, f.input)).toEqual(ack);
    await expect(f.lifecycle.remove(gm, f.campaign, f.reference, { ...f.input, expectedVersion: 100 })).rejects.toMatchObject({ code: "conflict" });
    await expect(f.entering.betrete(gm, f.campaign, f.enter)).rejects.toMatchObject({ code: "map-deleted" });
    for (const read of [() => f.tactical.getMap(gm, f.campaign, f.child, 1), () => f.tactical.getSource(gm, f.campaign, f.child, 1),
      () => f.tactical.exportMap(gm, f.campaign, f.child, 1), () => f.tactical.getMapTile(gm, f.campaign, f.child, 1, 0, 0, 0)])
      await expect(read()).rejects.toBeInstanceOf(Gone);
  });
  it("exports/restores a legacy V1 save after deletion with its exact CAS acknowledgement", async () => {
    const f = await fixture(); await f.lifecycle.remove(gm, f.campaign, f.reference, f.input);
    const card = await f.tactical.getMap(gm, f.campaign, f.parent);
    const input = { commandId: randomUUID(), expectedVersion: card.version, document: { ...card.document, geometry: { ...card.document.geometry, regions: [] } }, anchors: [] };
    const ack = await f.tactical.reviseMap(gm, f.campaign, f.parent, input);
    expect(ack.version).toBe(4); expect((await f.tactical.getMap(gm, f.campaign, f.parent)).revision).toBe(2);
    const bundle = await exportCampaignBundle(db, gm, f.campaign), target = await createTestDb();
    try {
      await initializeCampaignRestoreTarget(target); await restoreCampaignBundle(target, bundle);
      expect(await createTactical(target, config).reviseMap(gm, f.campaign, f.parent, input)).toEqual(ack);
      expect(currentCampaignSemanticDiff(bundle, await exportCampaignBundle(target, gm, f.campaign))).toEqual([]);
      const tables = currentCampaignTables(bundle), mapping = tables.map_lifecycle_events.find(row => row.operation === "map.revise")!;
      expect(mapping).toBeDefined();
      for (const changed of [tables.map_lifecycle_events.filter(row => row !== mapping), tables.map_lifecycle_events.map(row => row !== mapping ? row : { ...row, payload: { ...(row.payload as object), mapVersion: 3 } })])
        expect(() => createCurrentCampaignBundle({ campaignId: f.campaign, universeId: bundle.manifest.universeId, exportedAt: bundle.manifest.exportedAt, tables: { ...tables, map_lifecycle_events: changed } })).toThrow();
      const removed = await createDeletion(target).deleteCampaign(gm, f.campaign);
      expect(removed.rowCounts.map_lifecycle_events).toBe(2);
    } finally { await target.close(); }
  }, 30_000);
  it("blocks an active table, preserves ended views and marks a prepared plan unavailable", async () => {
    const f = await fixture(), game = createGameplay(db);
    const scene = await game.createScene(gm, f.campaign, { name: "At the table", fictionDate: "Day one", entryIds: [] });
    await f.tactical.savePlan(gm, f.campaign, scene.id, { commandId: randomUUID(), expectedVersion: 0, mapId: f.child, mapRevision: 1, tokens: [] });
    const sessionId = String((await game.startScene(gm, f.campaign, scene.id)).id);
    const saved = await f.tactical.getSession(gm, f.campaign, sessionId);
    await expect(f.lifecycle.remove(gm, f.campaign, f.reference, f.input)).rejects.toMatchObject({ code: "map-in-use", blockers: [{ sessionId }] });
    const intermission = await game.createScene(gm, f.campaign, { name: "Intermission", fictionDate: "Day two", entryIds: [] });
    const intermissionSession = String((await game.startScene(gm, f.campaign, intermission.id)).id);
    const preview = await f.lifecycle.preview(gm, f.campaign, f.reference);
    await f.lifecycle.remove(gm, f.campaign, f.reference, { ...f.input, confirmationHash: preview.confirmationHash });
    expect((await f.tactical.getPlan(gm, f.campaign, scene.id))?.unavailable).toBe("map-deleted");
    const history = await f.tactical.getSession(gm, f.campaign, sessionId);
    expect(history).toMatchObject({ document: saved.document, regions: saved.regions, tokens: saved.tokens, portals: saved.portals, rasterDigest: saved.rasterDigest, active: false });
    expect((await f.tactical.getTile(gm, f.campaign, sessionId, 0, 0, 0)).bytes.length).toBeGreaterThan(0);
    const sessionsBefore = (await db.query("SELECT * FROM game_sessions WHERE campaign_id=$1 ORDER BY id", [f.campaign])).rows;
    await expect(game.startScene(gm, f.campaign, scene.id)).rejects.toThrow(/gelöscht|map-deleted/);
    expect((await db.query("SELECT * FROM game_sessions WHERE campaign_id=$1 ORDER BY id", [f.campaign])).rows).toEqual(sessionsBefore);
    expect((await db.query("SELECT id FROM game_sessions WHERE campaign_id=$1 AND ended_at IS NULL", [f.campaign])).rows).toEqual([{ id: intermissionSession }]);
    expect((await exportCampaignBundle(db, gm, f.campaign)).version).toBe(15);
  });
  it("requires a V1 mapping even when its CAS happens to name a different later geometry revision", async () => {
    const f = await fixture(); await f.lifecycle.remove(gm, f.campaign, f.reference, f.input);
    for (let index = 0; index < 3; index++) {
      const card = await f.tactical.getMap(gm, f.campaign, f.parent);
      await f.tactical.reviseMap(gm, f.campaign, f.parent, { commandId: randomUUID(), expectedVersion: card.version, document: card.document, anchors: [] });
    }
    const bundle = await exportCampaignBundle(db, gm, f.campaign), tables = currentCampaignTables(bundle);
    const mapping = tables.map_lifecycle_events.find(row => row.operation === "map.revise" && (row.payload as { mapRevision?: number }).mapRevision === 2)!;
    expect(mapping).toBeDefined();
    expect(() => createCurrentCampaignBundle({ campaignId: f.campaign, universeId: bundle.manifest.universeId, exportedAt: bundle.manifest.exportedAt,
      tables: { ...tables, map_lifecycle_events: tables.map_lifecycle_events.filter(row => row !== mapping) } })).toThrow(/mapping|revision\/CAS/);
  });
  it("rejects stale descendant/parent revisions and non-GM or cross-campaign requests without effects", async () => {
    const f = await fixture(), player = randomUUID();
    await db.query("INSERT INTO users(id,display_name,created_at) VALUES($1,'Player',1)", [player]);
    await db.query("INSERT INTO campaign_memberships(campaign_id,user_id,role,display_name,name_skeleton) VALUES($1,$2,'spieler','Player','player')", [f.campaign, player]);
    for (const user of [player, randomUUID()]) {
      await expect(f.lifecycle.preview(user, f.campaign, f.reference)).rejects.toBeInstanceOf(Gone);
      await expect(f.lifecycle.remove(user, f.campaign, f.reference, f.input)).rejects.toBeInstanceOf(Gone);
    }
    const other = (await createCampaigns(db).createCampaign(gm, { name: "Other" })).id;
    await expect(f.lifecycle.preview(gm, other, f.reference)).rejects.toBeInstanceOf(Gone);
    const card = await f.tactical.getMap(gm, f.campaign, f.grandchild);
    await f.tactical.reviseMap(gm, f.campaign, f.grandchild, { commandId: randomUUID(), expectedVersion: card.version, document: card.document, anchors: [] });
    await expect(f.lifecycle.remove(gm, f.campaign, f.reference, f.input)).rejects.toMatchObject({ code: "deletion-preview-changed" });
    expect((await db.query("SELECT 1 FROM map_lifecycle_events WHERE campaign_id=$1", [f.campaign])).rowCount).toBe(0);
    const refreshed = await f.lifecycle.preview(gm, f.campaign, f.reference);
    const replacement = await f.makeMap("Another nested room");
    await f.entering.betrete(gm, f.campaign, { ...f.enter, commandId: randomUUID(), parentMapId: f.grandchild, expectedVersion: 2, targetMapId: replacement });
    await expect(f.lifecycle.remove(gm, f.campaign, f.reference, { ...f.input, confirmationHash: refreshed.confirmationHash })).rejects.toMatchObject({ code: "deletion-preview-changed" });
    expect(await f.tactical.listMaps(gm, f.campaign)).toHaveLength(4);
  });
  it("rolls back all CAS changes when the durable deletion event cannot be written", async () => {
    const f = await fixture();
    const before = (await db.query("SELECT id,version FROM tactical_maps WHERE campaign_id=$1 ORDER BY id", [f.campaign])).rows;
    const failWrite = (inner: Db): Db => ({ close: async () => {}, query: (sql, values) => {
      if (sql.startsWith("INSERT INTO map_lifecycle_events")) throw new Error("Injected event failure");
      return inner.query(sql, values);
    }, transaction: work => inner.transaction(tx => work(failWrite(tx))) });
    await expect(createMapLifecycle(failWrite(db), config).remove(gm, f.campaign, f.reference, f.input)).rejects.toThrow("Injected event failure");
    expect((await db.query("SELECT id,version FROM tactical_maps WHERE campaign_id=$1 ORDER BY id", [f.campaign])).rows).toEqual(before);
    expect((await f.entering.children(gm, f.campaign, { parentKind: "tactical", parentMapId: f.parent })).nodes[0]?.vorhandeneKarteId).toBe(f.child);
  });
  it("restores a retired Atlas subtree plus a fresh identical import without duplicating source bytes", async () => {
    const campaign = (await createCampaigns(db).createCampaign(gm, { name: "Atlas retirement" })).id;
    const atlas = createAtlas(db), original = await atlas.importMap(gm, campaign, beispielkarte()), card = await atlas.getMap(gm, campaign, original.id);
    if (card.version === undefined) throw new Error("An editable Atlas map must expose its CAS version");
    const tactical = createTactical(db), child = (await tactical.importMap(gm, campaign, { commandId: randomUUID(), name: "Interior", format: "native", sourceText: JSON.stringify(tacticalDocument()), provenance: tacticalAttribution })).subjectId;
    await createBetreten(db, config).betrete(gm, campaign, { commandId: randomUUID(), parentKind: "atlas", parentMapId: original.id, knotenId: card.nodes[0]!.id, expectedVersion: card.version, targetMapId: child });
    const lifecycle = createMapLifecycle(db), reference = { kind: "atlas" as const, id: original.id }, preview = await lifecycle.preview(gm, campaign, reference);
    expect(preview.maps).toHaveLength(2);
    await lifecycle.remove(gm, campaign, reference, { commandId: randomUUID(), expectedVersion: preview.root.version, confirmationHash: preview.confirmationHash, confirmedMapIds: preview.maps.map(map => `${map.kind}:${map.id}`) });
    await expect(atlas.mapImage(gm, campaign, original.id)).rejects.toBeInstanceOf(Gone);
    const next = await atlas.importMap(gm, campaign, beispielkarte()); expect(next.id).not.toBe(original.id);
    expect((await db.query("SELECT 1 FROM artifacts WHERE campaign_id=$1", [campaign])).rowCount).toBe(1);
    const bundle = await exportCampaignBundle(db, gm, campaign), target = await createTestDb();
    try {
      await initializeCampaignRestoreTarget(target); await restoreCampaignBundle(target, bundle);
      expect(await createAtlas(target).listMaps(gm, campaign)).toEqual(await atlas.listMaps(gm, campaign));
      expect(await createTactical(target).listMaps(gm, campaign)).toEqual([]);
      expect(currentCampaignSemanticDiff(bundle, await exportCampaignBundle(target, gm, campaign))).toEqual([]);
    } finally { await target.close(); }
  }, 30_000);
});
