// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { createHash, randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import sharp from "sharp";
import Fastify from "fastify";
import { createCurrentCampaignBundle, currentCampaignSemanticDiff, currentCampaignTables, parseCurrentCampaignBundle, serializeCurrentCampaignBundle } from "@chronicle/io";
import { inferLegacyCartography, parseTacticalCartography, serializeTacticalMapDocument, tacticalCartographyHash, weltkeim, type TacticalCartographyV1, type TacticalMapDocumentV1 } from "@chronicle/szene";
import type { TacticalMapCard } from "../../protocol/src/tactical.ts";
import { createTestDb, migrate, type Db } from "../src/db/index.ts";
import { createIdentity } from "../src/identity/index.ts";
import { createCampaigns } from "../src/domain/campaigns.ts";
import { createDocuments } from "../src/domain/documents.ts";
import { createGameplay } from "../src/domain/gameplay.ts";
import { createBetreten } from "../src/domain/betreten.ts";
import { createDeletion } from "../src/domain/deletion.ts";
import { exportCampaignBundle, initializeCampaignRestoreTarget, restoreCampaignBundle } from "../src/domain/bundles.ts";
import { captureTacticalSession, createTactical, tacticalHash } from "../src/domain/tactical.ts";
import { Conflict, Gone } from "../src/domain/errors.ts";
import { registerTactical } from "../src/http/tactical.ts";

const config = { origin: "https://cartography.test", cookieSecret: "cartography-secret-more-than-32-characters", now: Date.now };
const provenance = { name: "Cartography fixture", creator: "Tests", sourceUrl: null, license: "CC0-1.0", licenseUrl: null, retrievedAt: null, generator: null, generatorVersion: null };
const document = (): TacticalMapDocumentV1 => ({ schemaVersion: 1, kind: "tactical-map", coordinates: "image-pixels",
  frame: { ursprung: [0, 0], einheitenProPixel: 1, ordnung: "xy", hoch: "unten" },
  geometry: { v: 3, size: [64, 64], stamps: [], places: [], regions: [{ id: "known", punkte: [[0, 0], [32, 0], [32, 64], [0, 64]] }, { id: "secret", punkte: [[32, 0], [64, 0], [64, 64], [32, 64]] }] },
  grid: { kind: "square", size: 8, origin: [0, 0] }, elevation: 0, geometryElevation: [], walls: [], portals: [], lights: [], environment: { bakedLighting: false, ambientLightArgb: "ffffffff" }, background: null });
const baseline = () => inferLegacyCartography(document());
const edit = (card: TacticalMapCard) => ({ schemaVersion: 2 as const, commandId: randomUUID(), expectedVersion: card.version, document: card.document,
  anchors: card.anchors, cartography: card.cartography ?? card.legacyCartography!, addedBuildings: [] as { regionId: string; titel: string; typ: "haus" }[] });

describe("revision cartography at the existing persistence boundary", () => {
  let db: Db, gm: string;
  beforeAll(async () => { db = await createTestDb(); await migrate(db); gm = (await createIdentity(db, config).bootstrap("Kaya")).userId; }, 30_000);
  afterAll(async () => { await db?.close(); });
  async function fixture(generated?: TacticalCartographyV1, withImage = false) {
    const campaign = (await createCampaigns(db).createCampaign(gm, { name: "Cartography" })).id, tactical = createTactical(db, config);
    const image = withImage ? await sharp({ create: { width: 64, height: 64, channels: 4, background: { r: 30, g: 50, b: 220, alpha: 1 } } }).png().toBuffer() : undefined;
    const map = image ? { ...document(), background: { sha256: createHash("sha256").update(image).digest("hex"), mimeType: "image/png" as const, width: 64, height: 64 } } : document();
    const imported = await tactical.importMap(gm, campaign, { commandId: randomUUID(), name: "Map", format: "native", sourceText: serializeTacticalMapDocument(map), provenance, ...(image ? { imageBase64: image.toString("base64") } : {}) }, generated ? { cartography: generated, nodes: [] } : undefined);
    return { campaign, tactical, mapId: imported.subjectId, card: await tactical.getMap(gm, campaign, imported.subjectId) };
  }
  async function counts(mapId: string) {
    const result: Record<string, number> = {};
    for (const table of ["tactical_map_revisions", "tactical_map_cartography", "tactical_map_nodes"]) result[table] = Number((await db.query<{ n: string }>(`SELECT count(*) AS n FROM ${table} WHERE map_id=$1`, [mapId])).rows[0]!.n);
    return result;
  }
  it("opening and exporting a legacy map never adopts cartography", async () => {
    const f = await fixture();
    expect(f.card.cartography).toBeUndefined(); expect(f.card.legacyCartography?.regions.every(row => row.role === "generic")).toBe(true);
    await f.tactical.getMap(gm, f.campaign, f.mapId);
    expect((await counts(f.mapId)).tactical_map_cartography).toBe(0);
    expect((await exportCampaignBundle(db, gm, f.campaign)).version).toBeLessThan(14);
  });
  it("saves revision, roles and a new building atomically and replays the same receipt", async () => {
    const f = await fixture(), input = edit(f.card);
    const house = { id: "new-house", punkte: [[8, 8], [24, 8], [24, 24], [8, 24]] as const };
    input.document = { ...input.document, geometry: { ...input.document.geometry, regions: [...input.document.geometry.regions, house] } };
    input.cartography = parseTacticalCartography({ ...input.cartography, regions: [...input.cartography.regions, { regionId: house.id, role: "building", authored: true, locked: false, provenance: null }] }, input.document);
    input.addedBuildings = [{ regionId: house.id, titel: "New House", typ: "haus" }];
    const ack = await f.tactical.reviseMap(gm, f.campaign, f.mapId, input);
    expect(ack.version).toBe(2); expect(await f.tactical.reviseMap(gm, f.campaign, f.mapId, input)).toEqual(ack);
    await expect(f.tactical.reviseMap(gm, f.campaign, f.mapId, { ...input, addedBuildings: [{ ...input.addedBuildings[0], titel: "Changed retry" }] })).rejects.toThrow();
    expect(await counts(f.mapId)).toEqual({ tactical_map_revisions: 2, tactical_map_cartography: 1, tactical_map_nodes: 1 });
    const node = (await db.query<{ data: { herkunft: { kindKeim: string } } }>("SELECT data FROM tactical_map_nodes WHERE map_id=$1", [f.mapId])).rows[0]!.data;
    expect(node.herkunft.kindKeim).toBe(tacticalHash(["chronicle-room-child-v1", f.campaign, f.mapId, house.id]));
    const current = await f.tactical.getMap(gm, f.campaign, f.mapId);
    expect(current.cartographyHash).toBe(tacticalCartographyHash(input.cartography)); expect(current.rasterDigest).not.toBe(current.contentHash);
    await expect(f.tactical.reviseMap(gm, f.campaign, f.mapId, { commandId: randomUUID(), expectedVersion: 2, document: current.document, anchors: [] })).rejects.toThrow(/aktuellen Karteneditor/);
    const children = await createBetreten(db, config).children(gm, f.campaign, { parentKind: "tactical", parentMapId: f.mapId });
    expect(children.nodes.map(row => row.knotenId)).toEqual([house.id]);
  });
  it("does not let a role conversion bypass the new-building intent and node boundary", async () => {
    const f = await fixture(), input = edit(f.card);
    input.cartography = parseTacticalCartography({ ...input.cartography, regions: input.cartography.regions.map(row => row.regionId === "known" ? { ...row, role: "building", authored: true } : row) });
    await expect(f.tactical.reviseMap(gm, f.campaign, f.mapId, input)).rejects.toThrow(/neue.*Region/);
    expect(await counts(f.mapId)).toEqual({ tactical_map_revisions: 1, tactical_map_cartography: 0, tactical_map_nodes: 0 });
  });
  it("does not retype historic legacy regions when current room metadata is later created", async () => {
    const f = await fixture(), before = await f.tactical.getMap(gm, f.campaign, f.mapId, 1);
    await createBetreten(db, config).updateMetadata(gm, f.campaign, f.mapId, "known", { commandId: randomUUID(), expectedVersion: f.card.version, titel: "Named later" });
    const historic = await f.tactical.getMap(gm, f.campaign, f.mapId, 1);
    expect(historic.legacyCartography).toEqual(before.legacyCartography);
    expect((await counts(f.mapId)).tactical_map_cartography).toBe(0);
  });
  it("rolls back a late building INSERT failure including the already inserted revision and roles", async () => {
    const f = await fixture(), input = edit(f.card), id = "fail-building";
    await db.query("CREATE FUNCTION fail_cartography_test_node() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.knoten_id='fail-building' THEN RAISE EXCEPTION 'forced late node failure'; END IF; RETURN NEW; END $$");
    await db.query("CREATE TRIGGER fail_cartography_test_node BEFORE INSERT ON tactical_map_nodes FOR EACH ROW EXECUTE FUNCTION fail_cartography_test_node()");
    input.document = { ...input.document, geometry: { ...input.document.geometry, regions: [...input.document.geometry.regions, { id, punkte: [[2, 2], [4, 2], [4, 4]] }] } };
    input.cartography = parseTacticalCartography({ ...input.cartography, regions: [...input.cartography.regions, { regionId: id, role: "building", authored: true, locked: false, provenance: null }] }, input.document);
    input.addedBuildings = [{ regionId: id, titel: "Fail", typ: "haus" }];
    try { await expect(f.tactical.reviseMap(gm, f.campaign, f.mapId, input)).rejects.toThrow(/forced late node failure/); }
    finally { await db.query("DROP TRIGGER fail_cartography_test_node ON tactical_map_nodes"); await db.query("DROP FUNCTION fail_cartography_test_node()"); }
    expect(await counts(f.mapId)).toEqual({ tactical_map_revisions: 1, tactical_map_cartography: 0, tactical_map_nodes: 0 });
    expect((await f.tactical.getMap(gm, f.campaign, f.mapId)).version).toBe(1);
    expect((await db.query("SELECT 1 FROM tactical_command_receipts WHERE command_id=$1", [input.commandId])).rowCount).toBe(0);
  });
  it("preserves trusted provenance only for unchanged geometry and rejects client claims", async () => {
    const seed = weltkeim({ generator: "fixture", version: "1", seed: "seed", optionen: {} });
    const cartography = parseTacticalCartography({ ...baseline(), regions: baseline().regions.map(region => ({ ...region, provenance: seed })) });
    const f = await fixture(cartography), input = edit(f.card);
    expect((await f.tactical.reviseMap(gm, f.campaign, f.mapId, input)).version).toBe(2);
    const current = await f.tactical.getMap(gm, f.campaign, f.mapId), changed = edit(current);
    changed.document = { ...changed.document, geometry: { ...changed.document.geometry, regions: changed.document.geometry.regions.map(region => region.id === "known" ? { ...region, punkte: [[0, 0], [30, 0], [30, 64], [0, 64]] } : region) } };
    await expect(f.tactical.reviseMap(gm, f.campaign, f.mapId, changed)).rejects.toThrow(/Generatorherkunft/);
    changed.cartography = parseTacticalCartography({ ...changed.cartography, regions: changed.cartography.regions.map(region => region.regionId === "known" ? { ...region, authored: true, provenance: null } : region) });
    await f.tactical.reviseMap(gm, f.campaign, f.mapId, changed);
    expect((await f.tactical.getMap(gm, f.campaign, f.mapId)).cartography?.regions[0]?.provenance).toBeNull();
  });
  it("protects child identity and uses CAS that includes metadata and entrance edits", async () => {
    const f = await fixture(), input = edit(f.card);
    input.document = { ...input.document, geometry: { ...input.document.geometry, regions: [...input.document.geometry.regions, { id: "house", punkte: [[8, 8], [20, 8], [20, 20]] }] } };
    input.cartography = parseTacticalCartography({ ...input.cartography, regions: [...input.cartography.regions, { regionId: "house", role: "building", authored: true, locked: false, provenance: null }] }, input.document);
    input.addedBuildings = [{ regionId: "house", titel: "House", typ: "haus" }]; await f.tactical.reviseMap(gm, f.campaign, f.mapId, input);
    const saved = await f.tactical.getMap(gm, f.campaign, f.mapId);
    const sibling = await f.tactical.importMap(gm, f.campaign, { commandId: randomUUID(), name: "Inside", format: "native", sourceText: serializeTacticalMapDocument(document()), provenance });
    const entering = createBetreten(db, config), commandId = randomUUID();
    await entering.betrete(gm, f.campaign, { commandId, knotenId: "house", parentKind: "tactical", parentMapId: f.mapId, expectedVersion: saved.version, targetMapId: sibling.subjectId });
    await expect(f.tactical.reviseMap(gm, f.campaign, f.mapId, edit(saved))).rejects.toThrow();
    let current = await f.tactical.getMap(gm, f.campaign, f.mapId);
    await entering.updateMetadata(gm, f.campaign, f.mapId, "house", { commandId: randomUUID(), expectedVersion: current.version, titel: "Named house", bauwerk: { typ: "haus", beschreibung: "" } });
    current = await f.tactical.getMap(gm, f.campaign, f.mapId);
    const wrong = edit(current); wrong.cartography = parseTacticalCartography({ ...wrong.cartography, regions: wrong.cartography.regions.map(row => row.regionId === "house" ? { regionId: row.regionId, authored: true, locked: false, provenance: null, role: "water", material: "lake" } : row) });
    await expect(f.tactical.reviseMap(gm, f.campaign, f.mapId, wrong)).rejects.toThrow(/Rolle eines Zugangs/);
    const move = edit(current); move.document = { ...move.document, geometry: { ...move.document.geometry, regions: move.document.geometry.regions.map(row => row.id === "house" ? { ...row, punkte: row.punkte.map(([x, y]) => [x + 1, y + 1] as const) } : row) } };
    const ack = await f.tactical.reviseMap(gm, f.campaign, f.mapId, move);
    expect((await entering.children(gm, f.campaign, { parentKind: "tactical", parentMapId: f.mapId })).nodes.find(node => node.knotenId === "house")?.vorhandeneKarteId).toBe(sibling.subjectId);
    // Regression: a map version advanced by metadata is not a revision number.
    const bundle = await exportCampaignBundle(db, gm, f.campaign); expect(bundle.version).toBe(14);
    const originalReceipt = (await db.query<{ ack: unknown }>("SELECT ack FROM tactical_command_receipts WHERE command_id=$1", [move.commandId])).rows[0]!.ack;
    expect(currentCampaignTables(bundle).tactical_command_receipts.find(row => row.command_id === move.commandId)?.ack).toEqual(originalReceipt);
    const tables = currentCampaignTables(bundle);
    expect(() => createCurrentCampaignBundle({ campaignId: f.campaign, universeId: bundle.manifest.universeId, exportedAt: bundle.manifest.exportedAt,
      tables: { ...tables, tactical_map_cartography: tables.tactical_map_cartography.map(row => row.map_revision === 3 ? { ...row, map_version: ack.version - 1 } : row) } })).toThrow(/revision\/CAS mapping/);
    const target = await createTestDb();
    try {
      await initializeCampaignRestoreTarget(target); await restoreCampaignBundle(target, bundle);
      expect(await createTactical(target, config).reviseMap(gm, f.campaign, f.mapId, move)).toEqual(ack);
      expect(currentCampaignSemanticDiff(bundle, await exportCampaignBundle(target, gm, f.campaign))).toEqual([]);
    } finally { await target.close(); }
  }, 30_000);
  it("roundtrips v14 through the empty-target restore and deletes all sidecars", async () => {
    const f = await fixture(baseline()), bundle = await exportCampaignBundle(db, gm, f.campaign);
    expect(bundle.version).toBe(14);
    const parsed = parseCurrentCampaignBundle(serializeCurrentCampaignBundle(bundle)); expect(currentCampaignSemanticDiff(bundle, parsed)).toEqual([]);
    const target = await createTestDb();
    try { await initializeCampaignRestoreTarget(target); await restoreCampaignBundle(target, bundle); expect(currentCampaignSemanticDiff(bundle, await exportCampaignBundle(target, gm, f.campaign))).toEqual([]); }
    finally { await target.close(); }
    await expect(db.query("UPDATE tactical_map_cartography SET content_hash=$2 WHERE map_id=$1", [f.mapId, "0".repeat(64)])).rejects.toThrow();
    await expect(db.query("DELETE FROM tactical_map_cartography WHERE map_id=$1", [f.mapId])).rejects.toThrow();
    const receipt = await createDeletion(db).deleteCampaign(gm, f.campaign);
    expect(receipt.rowCounts.tactical_map_cartography).toBe(1); expect((await counts(f.mapId)).tactical_map_cartography).toBe(0);
  }, 30_000);
  it("rejects resealed native sidecars with wrong identity, hash or a missing later revision", async () => {
    const f = await fixture(baseline()); await f.tactical.reviseMap(gm, f.campaign, f.mapId, edit(f.card));
    const bundle = await exportCampaignBundle(db, gm, f.campaign), tables = currentCampaignTables(bundle);
    const data = { campaignId: f.campaign, universeId: bundle.manifest.universeId, exportedAt: bundle.manifest.exportedAt, tables };
    expect(() => createCurrentCampaignBundle(data)).not.toThrow();
    for (const patch of [{ campaign_id: "foreign" }, { map_id: "foreign" }, { content_hash: "0".repeat(64) }, { map_version: 0 }, { map_version: 2 }, { map_version: 999 }]) expect(() => createCurrentCampaignBundle({ ...data, tables: { ...tables, tactical_map_cartography: tables.tactical_map_cartography.map((row, index) => index === 0 ? { ...row, ...patch } : row) } })).toThrow();
    expect(() => createCurrentCampaignBundle({ ...data, tables: { ...tables, tactical_map_cartography: tables.tactical_map_cartography.filter(row => row.map_revision !== 2) } })).toThrow(/missing/);
  });
  it("hides private cartography from players and masks painted pixels after knowledge projection", async () => {
    const cartography = parseTacticalCartography({ ...baseline(), regions: baseline().regions.map(row => ({ ...row, role: "terrain", material: "grass" })) });
    const f = await fixture(cartography), campaigns = createCampaigns(db), invitation = await campaigns.issueInvitation(gm, f.campaign);
    const request = await campaigns.requestJoin(invitation.code, { displayName: "Player" }), player = await campaigns.approveJoin(gm, f.campaign, request.id);
    const member = await campaigns.requireMember(player.userId, f.campaign), docs = createDocuments(db);
    const entry = await docs.saveEntry(gm, f.campaign, { title: "Field", passages: [{ inhalt: { kind: "absatz", inhalt: [{ text: "Known half", marks: [] }] } }] });
    await docs.revealPassage(gm, f.campaign, entry.passagen[0]!.pid, member.actorId!);
    const input = edit(f.card); input.anchors = [{ targetKind: "region", targetId: "known", entryId: entry.entryId, passageId: entry.passagen[0]!.pid }];
    await f.tactical.reviseMap(gm, f.campaign, f.mapId, input);
    const game = createGameplay(db), scene = await game.createScene(gm, f.campaign, { name: "Field", entryIds: [entry.entryId], fictionDate: "Today" });
    await f.tactical.savePlan(gm, f.campaign, scene.id, { commandId: randomUUID(), expectedVersion: 0, mapId: f.mapId, mapRevision: 2, tokens: [] });
    const session = await game.startScene(gm, f.campaign, scene.id); await db.transaction(tx => captureTacticalSession(tx, f.campaign, scene.id, String(session.id), gm, Date.now()));
    const view = await f.tactical.getSession(player.userId, f.campaign, String(session.id)); expect(view.hatRaster).toBe(true);
    for (const key of ["cartography", "compositionHash", "document", "map"]) expect(Object.hasOwn(view, key)).toBe(false);
    await expect(f.tactical.getMap(player.userId, f.campaign, f.mapId)).rejects.toThrow();
    await expect(f.tactical.reviseMap(player.userId, f.campaign, f.mapId, { ...input, commandId: randomUUID(), expectedVersion: 2 })).rejects.toThrow();
    const tile = await f.tactical.getTile(player.userId, f.campaign, String(session.id), 0, 0, 0, view.rasterDigest), rgba = await sharp(tile.bytes).ensureAlpha().raw().toBuffer();
    expect(rgba[(12 * 64 + 12) * 4 + 3]).toBe(255); expect(rgba[(12 * 64 + 40) * 4 + 3]).toBe(0);
    const app = Fastify(); registerTactical(app, db, config);
    try {
      const cookie = (await createIdentity(db, config).issueSession(player.userId)).setCookie;
      const stillMasked = await app.inject({ url: `/api/campaigns/${f.campaign}/sessions/${session.id}/tactical/tiles/0/0/0?view=${view.rasterDigest}&layer=background`, headers: { cookie } });
      expect(stillMasked.statusCode).toBe(200); expect(stillMasked.rawPayload).toEqual(tile.bytes);
    } finally { await app.close(); }
    const current = await f.tactical.getMap(gm, f.campaign, f.mapId), next = edit(current); next.cartography = parseTacticalCartography({ ...next.cartography, regions: next.cartography.regions.map(row => ({ ...row, authored: true, role: "terrain", material: "sand" })) });
    await f.tactical.reviseMap(gm, f.campaign, f.mapId, next);
    expect((await f.tactical.getSession(player.userId, f.campaign, String(session.id))).rasterDigest).toBe(view.rasterDigest);
    const stored = (await db.query<{ initial_snapshot: { map: object } }>("SELECT initial_snapshot FROM session_tactical_states WHERE session_id=$1", [session.id])).rows[0]!;
    expect(Object.keys(stored.initial_snapshot.map).sort()).toEqual(["contentHash", "id", "revision"]);
    await db.query("UPDATE revelations SET revoked_at=1 WHERE actor_id=$1 AND passage_id=$2", [member.actorId, entry.passagen[0]!.pid]);
    const revoked = await f.tactical.getSession(player.userId, f.campaign, String(session.id));
    expect(revoked.regions).toEqual([]); expect(revoked.rasterDigest).not.toBe(view.rasterDigest);
    await expect(f.tactical.getTile(player.userId, f.campaign, String(session.id), 0, 0, 0, view.rasterDigest)).rejects.toThrow();
    const blank = await f.tactical.getTile(player.userId, f.campaign, String(session.id), 0, 0, 0, revoked.rasterDigest);
    expect((await sharp(blank.bytes).ensureAlpha().raw().toBuffer()).every(value => value === 0)).toBe(true);
  });
  it("admits the explicit v2 HTTP body and refuses missing roles, forged imports and stale raster pins", async () => {
    const f = await fixture(), app = Fastify(); registerTactical(app, db, config);
    app.setErrorHandler((error: Error & { statusCode?: number }, _req, reply) => reply.code(error instanceof Gone ? 404 : error instanceof Conflict ? 409 : error.statusCode ?? 500).send({ error: error.message }));
    const cookie = (await createIdentity(db, config).issueSession(gm)).setCookie, base = `/api/campaigns/${f.campaign}/tactical/maps/${f.mapId}`;
    try {
      const response = await app.inject({ method: "PUT", url: `${base}/revision`, headers: { cookie }, payload: edit(f.card) });
      expect(response.statusCode, response.body).toBe(200);
      const read = await app.inject({ url: base, headers: { cookie } }); expect(read.statusCode, read.body).toBe(200);
      const card = read.json() as TacticalMapCard;
      expect(card.cartography).toBeDefined(); expect(card.legacyCartography).toBeUndefined();
      const invalid = await app.inject({ method: "PUT", url: `${base}/revision`, headers: { cookie }, payload: { ...edit(card), cartography: { ...card.cartography!, regions: [] } } });
      expect(invalid.statusCode, invalid.body).toBe(400);
      const old = await app.inject({ method: "PUT", url: `${base}/revision`, headers: { cookie }, payload: { commandId: randomUUID(), expectedVersion: card.version, document: card.document, anchors: card.anchors } });
      expect(old.statusCode, old.body).toBe(400);
      const forged = await app.inject({ method: "POST", url: `/api/campaigns/${f.campaign}/tactical/maps`, headers: { cookie }, payload: { commandId: randomUUID(), name: "Forged generator", format: "native", sourceText: serializeTacticalMapDocument(document()), provenance, generated: { cartography: card.cartography, nodes: [] } } });
      expect(forged.statusCode, forged.body).toBe(400);
      const stale = await app.inject({ url: `${base}/tiles/0/0/0?revision=${card.revision}&view=${card.contentHash}`, headers: { cookie } }); expect(stale.statusCode).toBe(409);
      const tile = await app.inject({ url: `${base}/tiles/0/0/0?revision=${card.revision}&view=${card.rasterDigest}`, headers: { cookie } });
      expect(tile.statusCode, tile.body).toBe(200); expect(tile.headers["x-tactical-view"]).toBe(card.rasterDigest); expect(tile.headers["cache-control"]).toContain("no-store");
    } finally { await app.close(); }
  });
  it("serves a separately addressed original background only to the GM and honors historic pins", async () => {
    const cartography = parseTacticalCartography({ ...baseline(), regions: baseline().regions.map(row => ({ ...row, role: "terrain", material: "grass" })) });
    const f = await fixture(cartography, true), app = Fastify(); registerTactical(app, db, config);
    app.setErrorHandler((error: Error & { statusCode?: number }, _req, reply) => reply.code(error instanceof Gone ? 404 : error instanceof Conflict ? 409 : error.statusCode ?? 500).send({ error: error.message }));
    const cookie = (await createIdentity(db, config).issueSession(gm)).setCookie, base = `/api/campaigns/${f.campaign}/tactical/maps/${f.mapId}/tiles/0/0/0`;
    const pixel = async (buffer: Buffer) => [...(await sharp(buffer).ensureAlpha().raw().toBuffer()).subarray(0, 4)];
    try {
      const painted = await app.inject({ url: `${base}?revision=1&view=${f.card.rasterDigest}`, headers: { cookie } });
      expect(painted.statusCode).toBe(200); expect(await pixel(painted.rawPayload)).not.toEqual([30, 50, 220, 255]);
      const backgroundUrl = `${base}?revision=1&view=${f.card.rasterDigest}&layer=background`;
      const background = await app.inject({ url: backgroundUrl, headers: { cookie } });
      expect(background.statusCode, background.body).toBe(200); expect(await pixel(background.rawPayload)).toEqual([30, 50, 220, 255]);
      expect(background.headers["x-tactical-view"]).toBe(f.card.rasterDigest); expect(background.headers["x-tactical-layer"]).toBe("background");
      const campaigns = createCampaigns(db), invitation = await campaigns.issueInvitation(gm, f.campaign), request = await campaigns.requestJoin(invitation.code, { displayName: "Background player" });
      const player = await campaigns.approveJoin(gm, f.campaign, request.id), playerCookie = (await createIdentity(db, config).issueSession(player.userId)).setCookie;
      expect((await app.inject({ url: backgroundUrl, headers: { cookie: playerCookie } })).statusCode).toBe(404);
      const next = edit(f.card); next.cartography = parseTacticalCartography({ ...next.cartography, regions: next.cartography.regions.map(row => ({ ...row, authored: true, role: "terrain", material: "sand" })) });
      await f.tactical.reviseMap(gm, f.campaign, f.mapId, next);
      const historic = await app.inject({ url: backgroundUrl, headers: { cookie } });
      expect(historic.statusCode).toBe(200); expect(await pixel(historic.rawPayload)).toEqual([30, 50, 220, 255]);
      expect((await app.inject({ url: `${base}?revision=2&view=${f.card.rasterDigest}&layer=background`, headers: { cookie } })).statusCode).toBe(409);
      const vector = await fixture(cartography);
      expect((await app.inject({ url: `/api/campaigns/${vector.campaign}/tactical/maps/${vector.mapId}/tiles/0/0/0?layer=background`, headers: { cookie } })).statusCode).toBe(400);
    } finally { await app.close(); }
  });
  it("exports cartography as UVTT pixels and reports loss of editing semantics", async () => {
    const f = await fixture(baseline()), exported = await f.tactical.exportMap(gm, f.campaign, f.mapId);
    expect(JSON.parse(exported.json).image).toBeTruthy(); expect(exported.fidelity.nativeRoundTrip).toBe(false);
    expect(exported.fidelity.issues.some(issue => issue.path === "cartography" && issue.severity === "loss")).toBe(true);
  });
});
