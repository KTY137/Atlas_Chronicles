import { createHash, randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { CanonicalValue } from "@chronicle/core";
import { campaignSemanticDiffV4, createCampaignBundleV4, parseCampaignBundleV4, serializeCampaignBundleV4, type CampaignBundleV4 } from "@chronicle/io";
import type { TacticalMapDocumentV1 } from "@chronicle/szene";
import type { TacticalAnchor, TacticalView } from "../../protocol/src/tactical.ts";
import { createPgDb, migrate, type Db } from "../src/db/index.ts";
import { createIdentity } from "../src/identity/index.ts";
import { createCampaigns } from "../src/domain/campaigns.ts";
import { createDocuments } from "../src/domain/documents.ts";
import { createGameplay } from "../src/domain/gameplay.ts";
import { createTactical, tacticalHash } from "../src/domain/tactical.ts";
import type { TacticalSnapshot } from "../src/domain/tactical-state.ts";
import { initializeCampaignRestoreTarget, restoreCampaignBundle } from "../src/domain/bundles.ts";
import { exportCampaignBundle } from "./export-v4-fixture.ts";
import { seedActorControl } from "./actor-fixtures.ts";

const connection = process.env["TEST_DATABASE_URL"];
const config = { origin: "https://entity-restore.test", cookieSecret: "entity-restore-cookie-secret-more-than-thirty-two-characters", now: () => 1788700000000 };
const command = () => ({ commandId: randomUUID() });
const paragraph = (text: string) => ({ inhalt: { kind: "absatz" as const, inhalt: [{ text, marks: [] }] } });

describe.skipIf(!connection)("native v4 tactical entity restoration on real PostgreSQL", () => {
  let admin: Db, source: Db, destination: Db, twin: Db, gm: string, player: string, campaign: string, mapId: string, sceneId: string;
  let bundle: CampaignBundleV4;
  const schemas = [0, 1, 2].map(() => `chronicle_entity_restore_${randomUUID().replaceAll("-", "")}`);
  const sessions: string[] = [], playerViews: TacticalView[] = [], gmViews: TacticalView[] = [];
  beforeAll(async () => {
    admin = createPgDb(connection!); const databases: Db[] = [];
    for (const schema of schemas) {
      await admin.query(`CREATE SCHEMA "${schema}"`); const url = new URL(connection!); url.searchParams.set("options", `-c search_path=${schema}`);
      databases.push(createPgDb(url.href));
    }
    [source, destination, twin] = databases as [Db, Db, Db]; await migrate(source); await initializeCampaignRestoreTarget(destination); await initializeCampaignRestoreTarget(twin);
    gm = (await createIdentity(source, config).bootstrap("Entity GM")).userId;
    campaign = (await createCampaigns(source, config).createCampaign(gm, { name: "Portable entity knowledge" })).id;
    player = randomUUID(); const actor = randomUUID();
    await source.query("INSERT INTO users(id,display_name,created_at) VALUES($1,'Sera',1)", [player]);
    await source.query("INSERT INTO actors(id,campaign_id,user_id,name) VALUES($1,$2,$3,'Sera')", [actor, campaign, player]);
    await source.query("INSERT INTO campaign_memberships(campaign_id,user_id,role,display_name,name_skeleton,actor_id) VALUES($1,$2,'spieler','Sera','sera',$3)", [campaign, player, actor]);
    await seedActorControl(source, campaign, actor, player);
    const docs = createDocuments(source, config), tactical = createTactical(source, config), game = createGameplay(source, config);
    const known = await docs.saveEntry(gm, campaign, { title: "The known hall", passages: [paragraph("Visible room and chest")] });
    const unknown = await docs.saveEntry(gm, campaign, { title: "The hidden vault", passages: [paragraph("A private vault")] });
    await docs.revealPassage(gm, campaign, known.passagen[0]!.pid, actor);
    const document: TacticalMapDocumentV1 = { schemaVersion: 1, kind: "tactical-map", coordinates: "image-pixels", frame: { ursprung: [0, 0], einheitenProPixel: 1, ordnung: "xy", hoch: "unten" },
      geometry: { v: 3, size: [64, 64], stamps: [{ id: "chest", a: "pk.private/chest", x: 20, y: 20, s: 1, r: 1, l: 9 }, { id: "secret", a: "pk.private/vault", x: 25, y: 25, s: 1, r: 0, l: 1 }],
        places: [{ id: "hall", x: 10, y: 10 }], regions: [{ id: "room", punkte: [[0, 0], [64, 0], [64, 64], [0, 64]] }] },
      grid: { kind: "none" }, elevation: 0, geometryElevation: [], walls: [], portals: [], lights: [], environment: { bakedLighting: false, ambientLightArgb: "ffffffff" }, background: null };
    const anchors: TacticalAnchor[] = [
      { targetKind: "region", targetId: "room", entryId: known.entryId, passageId: known.passagen[0]!.pid },
      { targetKind: "stamp", targetId: "chest", entryId: known.entryId, passageId: known.passagen[0]!.pid },
      { targetKind: "place", targetId: "hall", entryId: known.entryId, passageId: null },
      { targetKind: "stamp", targetId: "secret", entryId: unknown.entryId, passageId: unknown.passagen[0]!.pid },
    ];
    mapId = (await tactical.importMap(gm, campaign, { ...command(), name: "Entity source", format: "native", sourceText: JSON.stringify(document), anchors,
      provenance: { name: "Test source", creator: "Test", sourceUrl: null, license: "CC0-1.0", licenseUrl: null, retrievedAt: null, generator: null, generatorVersion: null } })).subjectId;
    sceneId = (await game.createScene(gm, campaign, { name: "Portable scene", entryIds: [], fictionDate: "First evening" })).id;
    await tactical.savePlan(gm, campaign, sceneId, { ...command(), expectedVersion: 0, mapId, mapRevision: 1, tokens: [] });
    sessions.push(String((await game.startScene(gm, campaign, sceneId)).id));
    await source.query("UPDATE game_sessions SET ended_at=$2 WHERE id=$1", [sessions[0], config.now()]); await source.query("UPDATE scenes SET status='ended' WHERE id=$1", [sceneId]);
    const revised = { ...document, geometry: { ...document.geometry, places: [{ id: "hall", x: 30, y: 30 }] } };
    await tactical.reviseMap(gm, campaign, mapId, { ...command(), expectedVersion: 1, document: revised, anchors });
    await tactical.savePlan(gm, campaign, sceneId, { ...command(), expectedVersion: 1, mapId, mapRevision: 2, tokens: [] });
    sessions.push(String((await game.startScene(gm, campaign, sceneId)).id));
    for (const sessionId of sessions) {
      playerViews.push(await tactical.getSession(player, campaign, sessionId)); gmViews.push(await tactical.getSession(gm, campaign, sessionId));
    }
    bundle = await exportCampaignBundle(source, gm, campaign, config);
  }, 30_000);
  afterAll(async () => {
    await Promise.all([source?.close(), destination?.close(), twin?.close()]);
    if (admin) { try { for (const schema of schemas) { if (!/^chronicle_entity_restore_[a-f0-9]{32}$/.test(schema)) throw new Error("Unexpected entity restore schema"); await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`); } } finally { await admin.close(); } }
  });

  it("restores active and ended pinned entity maps, anchors, titles, knowledge and exact digests", async () => {
    expect(bundle.version).toBe(4);
    expect(new Set(bundle.tables.tactical_map_anchors.map(a => a.target_kind))).toEqual(new Set(["region", "stamp", "place"]));
    expect(playerViews.map(v => v.entities.map(e => e.id))).toEqual([["chest", "hall"], ["chest", "hall"]]);
    expect(playerViews.map(v => v.entities.find(e => e.id === "hall")!.x)).toEqual([10, 30]);
    expect(playerViews.map(v => v.active)).toEqual([false, true]);
    const restored = await restoreCampaignBundle(destination, parseCampaignBundleV4(serializeCampaignBundleV4(bundle))); expect(restored.formatVersion).toBe(4);
    const tactical = createTactical(destination, config);
    for (const [index, sessionId] of sessions.entries()) {
      expect(await tactical.getSession(player, campaign, sessionId)).toEqual(playerViews[index]);
      expect(await tactical.getSession(gm, campaign, sessionId)).toEqual(gmViews[index]);
    }
    expect(await tactical.getPlan(gm, campaign, sceneId)).toEqual(await createTactical(source, config).getPlan(gm, campaign, sceneId));
    for (const revision of [1, 2]) expect(await tactical.getMap(gm, campaign, mapId, revision)).toEqual(await createTactical(source, config).getMap(gm, campaign, mapId, revision));
    expect(campaignSemanticDiffV4(bundle, await exportCampaignBundle(destination, gm, campaign, config))).toEqual([]);
  });

  // Rehash the document/anchor seal and its pinned snapshots before testing graph
  // rejection, so a checksum failure cannot masquerade as relationship validation.
  function mutatedTables(change: (tables: Record<keyof typeof bundle.tables, Record<string, CanonicalValue>[]>) => void) {
    const tables = structuredClone(bundle.tables) as unknown as Record<keyof typeof bundle.tables, Record<string, CanonicalValue>[]>;
    change(tables);
    for (const revision of tables.tactical_map_revisions) {
      const anchors = tables.tactical_map_anchors.filter(a => a.map_id === revision.map_id && a.map_revision === revision.revision)
        .map(a => ({ targetKind: a.target_kind, targetId: a.target_id, entryId: a.entry_id, passageId: a.passage_id }))
        .sort((a, b) => `${a.targetKind}:${a.targetId}` < `${b.targetKind}:${b.targetId}` ? -1 : 1);
      revision.content_hash = tacticalHash({ document: revision.document, anchors });
      for (const session of tables.session_tactical_states.filter(s => s.map_id === revision.map_id && s.map_revision === revision.revision)) {
        for (const [snapshotKey, hashKey] of [["initial_snapshot", "initial_hash"], ["undo_base_snapshot", "undo_base_hash"]]) {
          const snapshot = session[snapshotKey!] as unknown as TacticalSnapshot;
          const next = { ...snapshot, map: { ...snapshot.map, contentHash: String(revision.content_hash) } };
          session[snapshotKey!] = next as unknown as CanonicalValue; session[hashKey!] = tacticalHash(next);
        }
      }
    }
    return { campaignId: bundle.manifest.campaignId, universeId: bundle.manifest.universeId, exportedAt: bundle.manifest.exportedAt, tables };
  }
  function mutatedAnchor(change: (anchor: Record<string, CanonicalValue>) => void) {
    return mutatedTables(tables => change(tables.tactical_map_anchors.find(a => a.target_id === "hall" && a.map_revision === 2)!));
  }

  it("keeps complete player views identical across valid restored hidden-asset and position twins", async () => {
    const alter = (document: TacticalMapDocumentV1) => ({ ...document, geometry: { ...document.geometry,
      stamps: document.geometry.stamps.map(stamp => stamp.id === "secret" ? { ...stamp, a: "pk.secret/changed", x: 60, y: 60, r: 3, s: 500, l: 99 } : stamp) } });
    const data = mutatedTables(tables => {
      for (const revision of tables.tactical_map_revisions) revision.document = alter(revision.document as unknown as TacticalMapDocumentV1) as unknown as CanonicalValue;
      for (const source of tables.tactical_sources) {
        const sourceText = JSON.stringify(alter(JSON.parse(String(source.source_text)) as TacticalMapDocumentV1));
        source.source_text = sourceText; source.source_bytes = String(Buffer.byteLength(sourceText)); source.source_hash = createHash("sha256").update(sourceText).digest("hex");
      }
    });
    await restoreCampaignBundle(twin, createCampaignBundleV4(data));
    for (const [index, sessionId] of sessions.entries()) {
      expect(await createTactical(twin, config).getSession(player, campaign, sessionId)).toEqual(playerViews[index]);
      expect((await createTactical(twin, config).getSession(gm, campaign, sessionId)).digest).not.toBe(gmViews[index]!.digest);
    }
  });

  it("rejects a rehashed reference to an unavailable article", () => {
    expect(() => createCampaignBundleV4(mutatedAnchor(anchor => { anchor.entry_id = "foreign-entry"; }))).toThrow(/entries|reference/i);
  });
  it("rejects a rehashed passage from another valid campaign article", () => {
    const privatePassage = bundle.tables.tactical_map_anchors.find(a => a.target_id === "secret")!.passage_id!;
    expect(() => createCampaignBundleV4(mutatedAnchor(anchor => { anchor.passage_id = privatePassage; }))).toThrow(/another entry/i);
  });
  it("rejects a rehashed missing place geometry target", () => {
    expect(() => createCampaignBundleV4(mutatedAnchor(anchor => { anchor.target_id = "missing-place"; }))).toThrow(/geometry target/i);
  });
});
