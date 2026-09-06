import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import Fastify from "fastify";
import sharp from "sharp";
import { stableJson } from "@chronicle/rules";
import { inspectUvttImage, type UvttProvenance } from "@chronicle/forge";
import type { TacticalMapDocumentV1 } from "@chronicle/szene";
import { createPgDb, createTestDb, migrate, type Db } from "../src/db/index.ts";
import { createIdentity } from "../src/identity/index.ts";
import { createCampaigns } from "../src/domain/campaigns.ts";
import { createDocuments } from "../src/domain/documents.ts";
import { createGameplay } from "../src/domain/gameplay.ts";
import { createActors } from "../src/domain/actors.ts";
import { captureTacticalSession, createTactical, tacticalHash } from "../src/domain/tactical.ts";
import { applyTacticalPatch, type TacticalSnapshot, type TacticalTokenState, type TacticalPortalState } from "../src/domain/tactical-state.ts";
import { Conflict, Gone } from "../src/domain/errors.ts";
import { registerTactical } from "../src/http/tactical.ts";
import { seedActorControl } from "./actor-fixtures.ts";

const config = { origin: "https://tactical.test", cookieSecret: "tactical-test-cookie-secret-with-more-than-32-characters" };
const provenance: UvttProvenance = { name: "Test map", creator: "Test fixture", sourceUrl: null, license: "CC0-1.0", licenseUrl: null, retrievedAt: null, generator: null, generatorVersion: null };
const command = () => ({ commandId: randomUUID() });
const pose = (x = 10) => ({ x, y: 10, elevation: 0, rotation: 0, scale: 1 });
const paragraph = (text: string) => ({ inhalt: { kind: "absatz" as const, inhalt: [{ text, marks: [] }] } });
function deferred() { let resolve!: () => void; const promise = new Promise<void>(done => { resolve = done; }); return { promise, resolve }; }
const document = (): TacticalMapDocumentV1 => ({ schemaVersion: 1, kind: "tactical-map", coordinates: "image-pixels", frame: { ursprung: [0, 0], einheitenProPixel: 1, ordnung: "xy", hoch: "unten" },
  geometry: { v: 3, size: [64, 64], stamps: [], places: [], regions: [
    { id: "known", punkte: [[0, 0], [31, 0], [31, 64], [0, 64]] },
    { id: "secret", punkte: [[32, 0], [64, 0], [64, 64], [32, 64]] },
  ] }, grid: { kind: "square", size: 8, origin: [0, 0] }, elevation: 0, geometryElevation: [], walls: [],
  portals: [0, 1].map(n => ({ id: `portal-${n}`, position: [40 + n, 20], bounds: [[40 + n, 19], [40 + n, 21]], rotationRadians: 0, closed: true, freestanding: false, elevation: 0 })), lights: [], environment: { bakedLighting: false, ambientLightArgb: "ffffffff" }, background: null });

for (const engine of ["PGlite", "PostgreSQL"] as const) describe.skipIf(engine === "PostgreSQL" && !process.env["TEST_DATABASE_URL"])(`persisted tactical commands on ${engine}`, () => {
  let db: Db, admin: Db | undefined, gm: string;
  const schema = `chronicle_tactical_${randomUUID().replaceAll("-", "")}`;
  beforeAll(async () => {
    if (engine === "PostgreSQL") {
      admin = createPgDb(process.env["TEST_DATABASE_URL"]!); await admin.query(`CREATE SCHEMA "${schema}"`);
      const url = new URL(process.env["TEST_DATABASE_URL"]!); url.searchParams.set("options", `-c search_path=${schema} -c statement_timeout=12000`); db = createPgDb(url.href);
    } else db = await createTestDb();
    await migrate(db); gm = (await createIdentity(db, config).bootstrap("Kaya")).userId;
  }, 30_000);
  afterAll(async () => {
    await db?.close();
    if (admin) { try { if (!/^chronicle_tactical_[a-f0-9]{32}$/.test(schema)) throw new Error("Unexpected test schema"); await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`); } finally { await admin.close(); } }
  });
  async function fixture(start = true) {
    const campaign = (await createCampaigns(db).createCampaign(gm, { name: "Tactical campaign" })).id;
    const a = { userId: randomUUID(), actorId: randomUUID() }, b = { userId: randomUUID(), actorId: randomUUID() }, npcId = randomUUID();
    for (const [person, name] of [[a, "Sera"], [b, "Brannt"]] as const) {
      await db.query("INSERT INTO users(id,display_name,created_at) VALUES($1,$2,1)", [person.userId, name]);
      await db.query("INSERT INTO actors(id,campaign_id,user_id,name) VALUES($1,$2,$3,$4)", [person.actorId, campaign, person.userId, name]);
      await db.query("INSERT INTO campaign_memberships(campaign_id,user_id,role,display_name,name_skeleton,actor_id) VALUES($1,$2,'spieler',$3,$3,$4)", [campaign, person.userId, name, person.actorId]);
      await seedActorControl(db, campaign, person.actorId, person.userId);
    }
    await db.query("INSERT INTO actors(id,campaign_id,user_id,name) VALUES($1,$2,$3,'Secret guardian')", [npcId, campaign, gm]);
    await db.query("INSERT INTO actor_profiles(actor_id,campaign_id,kind) VALUES($1,$2,'npc')", [npcId, campaign]);
    await db.query("INSERT INTO actor_controllers(actor_id,campaign_id,user_id) VALUES($1,$2,$3)", [npcId, campaign, gm]);
    const docs = createDocuments(db), tactical = createTactical(db), game = createGameplay(db), actors = createActors(db);
    const entry = await docs.saveEntry(gm, campaign, { title: "Rooms", passages: [paragraph("Known room"), paragraph("Secret room")] });
    await docs.revealPassage(gm, campaign, entry.passagen[0]!.pid, a.actorId);
    await docs.revealPassage(gm, campaign, entry.passagen[1]!.pid, b.actorId);
    const anchors = ["known", "secret"].map((targetId, i) => ({ targetKind: "region" as const, targetId, entryId: entry.entryId, passageId: entry.passagen[i]!.pid }));
    const imported = await tactical.importMap(gm, campaign, { ...command(), name: "Hidden planning name", format: "native", sourceText: JSON.stringify(document()), provenance, anchors });
    const scene = await game.createScene(gm, campaign, { name: "The gate", entryIds: [entry.entryId], fictionDate: "Day one" });
    const tokens = [{ id: "own", actorId: a.actorId, ...pose() }, { id: "own-two", actorId: a.actorId, ...pose(12) }, { id: "party", actorId: b.actorId, ...pose(15) }, { id: "hidden", actorId: npcId, ...pose(20) }];
    await tactical.savePlan(gm, campaign, scene.id, { ...command(), expectedVersion: 0, mapId: imported.subjectId, mapRevision: 1, tokens });
    let sessionId = "";
    if (start) sessionId = await db.transaction(async tx => {
      const session = await createGameplay(tx).startScene(gm, campaign, scene.id); const id = String(session.id);
      await captureTacticalSession(tx, campaign, scene.id, id, gm, Date.now()); return id;
    });
    return { campaign, a, b, npcId, docs, tactical, game, actors, entry, anchors, sceneId: scene.id, mapId: imported.subjectId, tokens, sessionId };
  }
  async function invariant(sessionId: string) {
    const row = (await db.query<{ initial_snapshot: TacticalSnapshot; initial_hash: string; undo_base_snapshot: TacticalSnapshot; undo_base_hash: string; base_seq: string; last_transition_seq: string; portal_states: TacticalPortalState[] }>("SELECT * FROM session_tactical_states WHERE session_id=$1", [sessionId])).rows[0]!;
    expect(tacticalHash(row.initial_snapshot)).toBe(row.initial_hash); expect(tacticalHash(row.undo_base_snapshot)).toBe(row.undo_base_hash);
    const ring = (await db.query<{ seq: string; subject_kind: "token" | "portal"; subject_id: string; before_state: TacticalTokenState | TacticalPortalState; after_state: TacticalTokenState | TacticalPortalState }>("SELECT * FROM tactical_transitions WHERE session_id=$1 ORDER BY seq", [sessionId])).rows;
    expect(ring.length).toBeLessThanOrEqual(50); expect(ring.map(t => Number(t.seq))).toEqual(Array.from({ length: Number(row.last_transition_seq) - Number(row.base_seq) }, (_, i) => Number(row.base_seq) + i + 1));
    let replay = row.undo_base_snapshot;
    for (const t of ring) replay = applyTacticalPatch(replay, { subjectKind: t.subject_kind, subjectId: t.subject_id, before: t.before_state, after: t.after_state });
    const live = (await db.query<TacticalTokenState>('SELECT token_id AS id,actor_id AS "actorId",x,y,elevation,rotation,scale,version FROM tactical_token_states WHERE session_id=$1 ORDER BY token_id COLLATE "C"', [sessionId])).rows;
    expect(replay.tokens).toEqual(live); expect(replay.portals).toEqual(row.portal_states); return { row, ring };
  }

  it("pins the scene plan once and never mutates its active session from later preparation", async () => {
    const f = await fixture(), first = await f.tactical.getSession(gm, f.campaign, f.sessionId);
    await f.tactical.reviseMap(gm, f.campaign, f.mapId, { ...command(), expectedVersion: 1, document: { ...document(), grid: { kind: "none" } }, anchors: f.anchors });
    await f.tactical.savePlan(gm, f.campaign, f.sceneId, { ...command(), expectedVersion: 1, mapId: f.mapId, mapRevision: 2, tokens: f.tokens.map(t => ({ ...t, x: 25 })) });
    await db.transaction(tx => captureTacticalSession(tx, f.campaign, f.sceneId, f.sessionId, gm, Date.now()));
    expect(String((await f.game.startScene(gm, f.campaign, f.sceneId)).id)).toBe(f.sessionId);
    const unchanged = await f.tactical.getSession(gm, f.campaign, f.sessionId);
    expect(unchanged.tokens).toEqual(first.tokens); expect(unchanged.grid.kind).toBe("square"); expect(unchanged.map?.revision).toBe(1);
    await db.query("UPDATE game_sessions SET ended_at=2 WHERE id=$1", [f.sessionId]); await db.query("UPDATE scenes SET status='ended' WHERE id=$1", [f.sceneId]);
    const next = await db.transaction(async tx => { const s = await createGameplay(tx).startScene(gm, f.campaign, f.sceneId); const id = String(s.id); await captureTacticalSession(tx, f.campaign, f.sceneId, id, gm, 3); return id; });
    expect((await f.tactical.getSession(gm, f.campaign, next)).tokens.every(t => t.x === 25 && t.version === 1)).toBe(true);
    expect((await f.tactical.getSession(gm, f.campaign, next)).grid.kind).toBe("none"); await invariant(f.sessionId); await invariant(next);
    await expect(db.query("UPDATE session_tactical_states SET initial_hash=$2 WHERE session_id=$1", [f.sessionId, "0".repeat(64)])).rejects.toThrow();
    await expect(db.query("DELETE FROM tactical_map_revisions WHERE map_id=$1", [f.mapId])).rejects.toThrow();
  });

  it("projects one current knowledge perspective, hides unknown NPCs and does not leak hidden-only changes", async () => {
    const f = await fixture(), before = await f.tactical.getSession(f.a.userId, f.campaign, f.sessionId);
    expect(before.regions.map(r => r.id)).toEqual(["known"]); expect(before.tokens.map(t => t.id)).toEqual(["own", "own-two", "party"]);
    expect(before.tokens.find(t => t.id === "party")).toMatchObject({ version: null, canMove: false });
    for (const key of ["map", "document", "walls", "portals", "sourceId", "version"]) expect(Object.hasOwn(before, key)).toBe(false);
    expect(stableJson(before)).not.toContain(f.npcId); expect(stableJson(before)).not.toContain("Hidden planning name");
    await f.tactical.moveToken(gm, f.campaign, f.sessionId, "hidden", { ...command(), expectedVersion: 1, ...pose(21) });
    await f.tactical.setPortal(gm, f.campaign, f.sessionId, "portal-0", { ...command(), expectedVersion: 1, closed: false });
    expect(await f.tactical.getSession(f.a.userId, f.campaign, f.sessionId)).toEqual(before);
    await f.actors.grantController(gm, f.campaign, f.b.actorId, f.a.userId, { ...command(), expectedVersion: 0, reason: "Shared control" });
    expect((await f.tactical.getSession(f.a.userId, f.campaign, f.sessionId)).regions).toEqual(before.regions);
    await f.actors.setReaderPerspective(f.a.userId, f.campaign, { ...command(), expectedVersion: 1, actorId: f.b.actorId });
    const switched = await f.tactical.getSession(f.a.userId, f.campaign, f.sessionId); expect(switched.regions.map(r => r.id)).toEqual(["secret"]); expect(switched.tokens).toEqual([]); expect(switched.rasterDigest).not.toBe(before.rasterDigest);
    await f.actors.revokeController(gm, f.campaign, f.b.actorId, f.a.userId, { ...command(), expectedVersion: 1, reason: "Revoke perspective" });
    expect((await f.tactical.getSession(f.a.userId, f.campaign, f.sessionId)).regions).toEqual([]);
  });

  it("requires visible destinations and current control; durable retries bind route targets and survive newer versions", async () => {
    const f = await fixture(), before = await f.tactical.getSession(f.a.userId, f.campaign, f.sessionId), move = { ...command(), expectedVersion: 1, ...pose(13) };
    await expect(f.tactical.moveToken(f.a.userId, f.campaign, f.sessionId, "own", { ...command(), expectedVersion: 1, ...pose(40) })).rejects.toBeInstanceOf(Gone);
    const ack = await f.tactical.moveToken(f.a.userId, f.campaign, f.sessionId, "own", move);
    await expect(f.tactical.moveToken(f.a.userId, f.campaign, f.sessionId, "own-two", move)).rejects.toBeInstanceOf(Conflict);
    const portal = { ...command(), expectedVersion: 1, closed: false }; await f.tactical.setPortal(gm, f.campaign, f.sessionId, "portal-0", portal);
    await expect(f.tactical.setPortal(gm, f.campaign, f.sessionId, "portal-1", portal)).rejects.toBeInstanceOf(Conflict);
    await expect(f.tactical.setPortal(f.a.userId, f.campaign, f.sessionId, "portal-0", { ...portal, ...command() })).rejects.toBeInstanceOf(Gone);
    await expect(f.tactical.moveToken(f.a.userId, f.campaign, f.sessionId, "own", { ...move, ...command() })).rejects.toBeInstanceOf(Conflict);
    await f.tactical.moveToken(f.a.userId, f.campaign, f.sessionId, "own", { ...command(), expectedVersion: 2, ...pose(14) });
    expect(await createTactical(db).moveToken(f.a.userId, f.campaign, f.sessionId, "own", move)).toEqual(ack);
    const current = await f.tactical.getSession(f.a.userId, f.campaign, f.sessionId); expect(current.rasterDigest).toBe(before.rasterDigest); expect(current.digest).not.toBe(before.digest);
    await db.query("UPDATE game_sessions SET ended_at=2 WHERE id=$1", [f.sessionId]);
    expect(await f.tactical.moveToken(f.a.userId, f.campaign, f.sessionId, "own", move)).toEqual(ack);
    await f.actors.revokeController(gm, f.campaign, f.a.actorId, f.a.userId, { ...command(), expectedVersion: 1, reason: "Revoke control" });
    await expect(f.tactical.moveToken(f.a.userId, f.campaign, f.sessionId, "own", move)).rejects.toBeInstanceOf(Gone);
    await invariant(f.sessionId);
  });

  it("compacts 52 transitions to a contiguous 50-patch window while retaining old minimal retry receipts", async () => {
    const f = await fixture(), moves = Array.from({ length: 52 }, (_, i) => ({ ...command(), expectedVersion: i + 1, ...pose(11 + i % 10) }));
    for (const move of moves) await f.tactical.moveToken(f.a.userId, f.campaign, f.sessionId, "own", move);
    const { row, ring } = await invariant(f.sessionId); expect(Number(row.base_seq)).toBe(2); expect(ring).toHaveLength(50); expect(row.initial_snapshot.tokens.find(t => t.id === "own")?.x).toBe(10);
    expect(await createTactical(db).moveToken(f.a.userId, f.campaign, f.sessionId, "own", moves[0])).toEqual({ subjectId: "own", version: 2 });
    const receipts = (await db.query<{ ack: unknown }>("SELECT ack FROM tactical_command_receipts WHERE scope_id=$1 AND operation='token.move'", [f.sessionId])).rows; expect(receipts).toHaveLength(52);
    expect(receipts.every(r => Object.keys(r.ack as object).sort().join(",") === "subjectId,version")).toBe(true);
    await expect(f.tactical.undo(f.a.userId, f.campaign, f.sessionId, { ...command(), targetCommandId: moves[0]!.commandId, expectedVersion: 53 })).rejects.toBeInstanceOf(Conflict);
    for (let i = 51; i >= 49; i--) await f.tactical.undo(f.a.userId, f.campaign, f.sessionId, { ...command(), targetCommandId: moves[i]!.commandId, expectedVersion: 53 + 51 - i });
    const final = await invariant(f.sessionId); expect(Number(final.row.base_seq)).toBe(5); expect(Number(final.row.last_transition_seq)).toBe(55);
    expect((await f.tactical.getSession(f.a.userId, f.campaign, f.sessionId)).tokens.find(t => t.id === "own")?.x).toBe(moves[48]!.x);
  }, 30_000);

  it("undoes A then B through compensations, ignores historic versions, and records no-op retry without a patch", async () => {
    const f = await fixture(), a = { ...command(), expectedVersion: 1, ...pose(14) }, b = { ...command(), expectedVersion: 2, ...pose(18) };
    await f.tactical.moveToken(f.a.userId, f.campaign, f.sessionId, "own", a); await f.tactical.moveToken(f.a.userId, f.campaign, f.sessionId, "own", b);
    await expect(f.tactical.undo(f.a.userId, f.campaign, f.sessionId, { ...command(), targetCommandId: a.commandId, expectedVersion: 3 })).rejects.toBeInstanceOf(Conflict);
    const undo = { ...command(), targetCommandId: b.commandId, expectedVersion: 3 }; expect((await f.tactical.undo(f.a.userId, f.campaign, f.sessionId, undo)).version).toBe(4);
    expect((await f.tactical.undo(f.a.userId, f.campaign, f.sessionId, { ...command(), targetCommandId: a.commandId, expectedVersion: 4 })).version).toBe(5);
    expect((await f.tactical.undo(f.a.userId, f.campaign, f.sessionId, undo)).version).toBe(4);
    const noop = { ...command(), expectedVersion: 5, ...pose() }; expect((await f.tactical.moveToken(f.a.userId, f.campaign, f.sessionId, "own", noop)).version).toBe(5);
    expect((await invariant(f.sessionId)).ring).toHaveLength(4);
    expect((await f.tactical.getSession(f.a.userId, f.campaign, f.sessionId)).undoTargets).toEqual([]);
  });

  it("rolls live state, compaction and receipts back together when acknowledgement persistence fails", async () => {
    const f = await fixture(), broken: Db = { ...db, transaction: fn => db.transaction(tx => fn({ ...tx, query: async (sql, params) => { if (sql.startsWith("INSERT INTO tactical_command_receipts")) throw new Error("injected receipt failure"); return tx.query(sql, params); } })) };
    for (let i = 0; i < 50; i++) await f.tactical.moveToken(f.a.userId, f.campaign, f.sessionId, "own", { ...command(), expectedVersion: i + 1, ...pose(11 + i % 10) });
    const before = await invariant(f.sessionId), input = { ...command(), expectedVersion: 51, ...pose(13) };
    await expect(createTactical(broken).moveToken(f.a.userId, f.campaign, f.sessionId, "own", input)).rejects.toThrow("injected receipt failure");
    expect(await invariant(f.sessionId)).toEqual(before); expect((await db.query("SELECT 1 FROM tactical_command_receipts WHERE command_id=$1", [input.commandId])).rowCount).toBe(0);
    expect((await f.tactical.moveToken(f.a.userId, f.campaign, f.sessionId, "own", input)).version).toBe(52);
  }, 30_000);

  it("retains the real external UVTT source once, and rejects a container that cannot really decode before insertion", async () => {
    const f = await fixture(false), sourceText = await readFile(new URL("../../forge/test/fixtures/uvtt/sampleMap.dd2vtt", import.meta.url), "utf8");
    const metadata = JSON.parse(await readFile(new URL("../../forge/test/fixtures/uvtt/provenance.json", import.meta.url), "utf8")) as { provenance: UvttProvenance };
    const input = { ...command(), name: "External map", format: "uvtt", sourceText, provenance: metadata.provenance };
    const imported = await f.tactical.importMap(gm, f.campaign, input), source = await f.tactical.getSource(gm, f.campaign, imported.subjectId);
    expect(source.source_text).toBe(sourceText); expect(source.image_base64).toBeNull(); expect(Object.hasOwn(source.image_meta!, "base64")).toBe(false);
    expect((await f.tactical.exportMap(gm, f.campaign, imported.subjectId)).json).toBe(sourceText);
    const image = await sharp({ create: { width: 64, height: 64, channels: 4, background: "red" } }).png().toBuffer();
    // Preserve PNG chunk lengths/checksums while invalidating its compressed pixels.
    const malformed = Buffer.from(image);
    for (let at = 8; at < malformed.length;) {
      const length = malformed.readUInt32BE(at);
      if (malformed.toString("ascii", at + 4, at + 8) === "IDAT") {
        malformed.fill(0, at + 8, at + 8 + length); let crc = 0xffffffff;
        for (const byte of malformed.subarray(at + 4, at + 8 + length)) { crc ^= byte; for (let bit = 0; bit < 8; bit++) crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1; }
        malformed.writeUInt32BE((crc ^ 0xffffffff) >>> 0, at + 8 + length);
      }
      at += length + 12;
    }
    const truncated = malformed.toString("base64"), ref = inspectUvttImage(truncated);
    const bad = { ...command(), name: "Broken pixels", format: "native", sourceText: JSON.stringify({ ...document(), background: { sha256: ref.sha256, mimeType: ref.mimeType, width: ref.width, height: ref.height } }), imageBase64: truncated, provenance };
    const count = (await f.tactical.listMaps(gm, f.campaign)).length;
    await expect(f.tactical.importMap(gm, f.campaign, bad)).rejects.toThrow(); expect(await f.tactical.listMaps(gm, f.campaign)).toHaveLength(count);
  }, 30_000);

  it("serves projected and GM raster tiles with revision/view guards and uniform denied GM resources", async () => {
    const f = await fixture(), app = Fastify(); registerTactical(app, db, config);
    app.setErrorHandler((error: Error & { statusCode?: number }, _req, reply) => reply.code(error instanceof Gone ? 404 : error instanceof Conflict ? 409 : error.statusCode ?? 500).send({ error: error instanceof Gone ? "unavailable" : error.message }));
    const identity = createIdentity(db, config), player = (await identity.issueSession(f.a.userId)).setCookie, leader = (await identity.issueSession(gm)).setCookie;
    try {
      const url = `/api/campaigns/${f.campaign}`, view = await f.tactical.getSession(f.a.userId, f.campaign, f.sessionId);
      for (const path of [`/tactical/maps/${f.mapId}`, `/tactical/maps/${f.mapId}/source`, `/tactical/maps/missing/source`, `/scenes/${f.sceneId}/tactical-plan`, `/tactical/maps/${f.mapId}/tiles/0/0/0`]) expect((await app.inject({ method: "GET", url: url + path, headers: { cookie: player } })).statusCode).toBe(404);
      const tile = await app.inject({ method: "GET", url: `${url}/sessions/${f.sessionId}/tactical/tiles/0/0/0?view=${view.rasterDigest}`, headers: { cookie: player } });
      expect(tile.statusCode).toBe(200); expect(tile.headers["x-tactical-view"]).toBe(view.rasterDigest); expect(tile.headers["cache-control"]).toContain("no-store");
      const pixels = await sharp(tile.rawPayload).raw().ensureAlpha().toBuffer(); expect(pixels[4 * 40 + 3]).toBe(0);
      const stale = await app.inject({ method: "GET", url: `${url}/sessions/${f.sessionId}/tactical/tiles/0/0/0?view=${"0".repeat(64)}`, headers: { cookie: player } }); expect(stale.statusCode).toBe(409);
      const map = await f.tactical.getMap(gm, f.campaign, f.mapId), full = await app.inject({ method: "GET", url: `${url}/tactical/maps/${f.mapId}/tiles/0/0/0?revision=1&view=${map.contentHash}`, headers: { cookie: leader } }); expect(full.statusCode).toBe(200);
      expect((await app.inject({ method: "POST", url: `${url}/tactical/maps/import-preview`, headers: { cookie: leader }, payload: { ...command(), name: "Invalid", format: "native", sourceText: "{}", provenance } })).statusCode).toBe(400);
    } finally { await app.close(); }
  });

  it("round-trips Unicode geometry and token identities independently of database collation", async () => {
    const f = await fixture(false), doc = document(), unicode = ["\uE000", "\u{1F600}"];
    const changed = { ...doc, geometry: { ...doc.geometry, regions: doc.geometry.regions.map((region, i) => ({ ...region, id: unicode[i]! })) } };
    const bindings = f.anchors.map((a, i) => ({ ...a, targetId: unicode[i]! }));
    const imported = await f.tactical.importMap(gm, f.campaign, { ...command(), name: "Unicode", format: "native", sourceText: JSON.stringify(changed), provenance, anchors: bindings });
    expect((await f.tactical.getMap(gm, f.campaign, imported.subjectId)).anchors.map(a => a.targetId)).toEqual([...unicode].sort());
    await f.tactical.savePlan(gm, f.campaign, f.sceneId, { ...command(), expectedVersion: 1, mapId: imported.subjectId, mapRevision: 1, tokens: unicode.map(id => ({ id, actorId: f.a.actorId, ...pose() })) });
    const session = await f.game.startScene(gm, f.campaign, f.sceneId), id = String(session.id);
    expect((await f.tactical.getSession(gm, f.campaign, id)).tokens.map(t => t.id)).toEqual([...unicode].sort());
  });

  it("requires all current passage successors and never treats a partial split or unbound region as knowledge", async () => {
    const f = await fixture();
    const split = await f.docs.saveEntry(gm, f.campaign, { title: "Rooms", expectedVersion: 1, passages: [paragraph("Known "), paragraph("room"), { pid: f.entry.passagen[1]!.pid, ...paragraph("Secret room") }] }, f.entry.entryId);
    expect((await f.tactical.getSession(f.a.userId, f.campaign, f.sessionId)).regions.map(r => r.id)).toEqual(["known"]);
    await db.query("UPDATE revelations SET revoked_at=2 WHERE actor_id=$1 AND passage_id=$2", [f.a.actorId, f.entry.passagen[0]!.pid]);
    await f.docs.revealPassage(gm, f.campaign, split.passagen[0]!.pid, f.a.actorId);
    expect((await f.tactical.getSession(f.a.userId, f.campaign, f.sessionId)).regions).toEqual([]);
    await f.docs.revealPassage(gm, f.campaign, split.passagen[1]!.pid, f.a.actorId);
    expect((await f.tactical.getSession(f.a.userId, f.campaign, f.sessionId)).regions.map(r => r.id)).toEqual(["known"]);
    const other = await f.tactical.importMap(gm, f.campaign, { ...command(), name: "Unbound", format: "native", sourceText: JSON.stringify(document()), provenance });
    await f.tactical.savePlan(gm, f.campaign, f.sceneId, { ...command(), expectedVersion: 1, mapId: other.subjectId, mapRevision: 1, tokens: f.tokens });
    await db.query("UPDATE game_sessions SET ended_at=2 WHERE id=$1", [f.sessionId]); await db.query("UPDATE scenes SET status='ended' WHERE id=$1", [f.sceneId]);
    const next = String((await f.game.startScene(gm, f.campaign, f.sceneId)).id);
    expect((await f.tactical.getSession(f.a.userId, f.campaign, next)).regions).toEqual([]);
  });

  it("discards an already projected tile when its knowledge perspective is revoked before delivery", async () => {
    const f = await fixture(), release = deferred(); let projected = false;
    const observed: Db = { ...db, transaction: async fn => {
      const result = await db.transaction(fn);
      if (result && typeof result === "object" && "request" in result && "digest" in result) { projected = true; await release.promise; }
      return result;
    } };
    const pending = createTactical(observed).getTile(f.a.userId, f.campaign, f.sessionId, 0, 0, 0); void pending.catch(() => {});
    try {
      await expect.poll(() => projected).toBe(true);
      await f.actors.revokeController(gm, f.campaign, f.a.actorId, f.a.userId, { ...command(), expectedVersion: 1, reason: "Revoke while raster is outstanding" });
    } finally { release.resolve(); }
    await expect(pending).rejects.toBeInstanceOf(Conflict);
  });

  it("clips player movement and token visibility to the image even when an authorized polygon extends beyond it", async () => {
    const f = await fixture(false), doc = document();
    const changed = { ...doc, geometry: { ...doc.geometry, regions: [{ id: "known", punkte: [[-100, -100], [100, -100], [100, 100], [-100, 100]] as const }, doc.geometry.regions[1]!] } };
    await f.tactical.reviseMap(gm, f.campaign, f.mapId, { ...command(), expectedVersion: 1, document: changed, anchors: f.anchors });
    await f.tactical.savePlan(gm, f.campaign, f.sceneId, { ...command(), expectedVersion: 1, mapId: f.mapId, mapRevision: 2, tokens: f.tokens.map(t => t.id === "own-two" ? { ...t, x: -10 } : t) });
    const id = String((await f.game.startScene(gm, f.campaign, f.sceneId)).id), view = await f.tactical.getSession(f.a.userId, f.campaign, id);
    expect(view.tokens.some(t => t.id === "own-two")).toBe(false);
    await expect(f.tactical.moveToken(f.a.userId, f.campaign, id, "own", { ...command(), expectedVersion: 1, ...pose(-2) })).rejects.toBeInstanceOf(Gone);
    expect((await f.tactical.moveToken(gm, f.campaign, id, "own-two", { ...command(), expectedVersion: 1, ...pose(15) })).version).toBe(2);
  });

  it.skipIf(engine !== "PostgreSQL")("serializes competing moves and maps a global command collision from another campaign to conflict", async () => {
    const f = await fixture(), one = { ...command(), expectedVersion: 1, ...pose(13) }, two = { ...command(), expectedVersion: 1, ...pose(14) };
    const cas = await Promise.allSettled([f.tactical.moveToken(f.a.userId, f.campaign, f.sessionId, "own", one), f.tactical.moveToken(f.a.userId, f.campaign, f.sessionId, "own", two)]);
    expect(cas.filter(r => r.status === "fulfilled")).toHaveLength(1); expect(cas.find(r => r.status === "rejected")?.reason).toBeInstanceOf(Conflict);
    const retry = { ...command(), expectedVersion: 2, ...pose(15) }, acks = await Promise.all([f.tactical.moveToken(f.a.userId, f.campaign, f.sessionId, "own", retry), f.tactical.moveToken(f.a.userId, f.campaign, f.sessionId, "own", retry)]);
    expect(acks[0]).toEqual(acks[1]); expect(acks[0]?.version).toBe(3);
    const other = await fixture(), global = { ...command(), expectedVersion: 1, ...pose(17) }, release = deferred(); let firstInserted = false, secondMissed = false;
    const observed = (first: boolean): Db => ({ ...db, transaction: work => db.transaction(tx => {
      const wrapped: Db = { ...tx, transaction: nested => nested(wrapped), query: async <T>(sql: string, params?: readonly unknown[]) => {
        const result = await tx.query<T>(sql, params);
        if (first && sql.startsWith("INSERT INTO tactical_transitions")) { firstInserted = true; await release.promise; }
        if (!first && sql.startsWith("SELECT * FROM tactical_command_receipts") && result.rowCount === 0) secondMissed = true;
        return result;
      } }; return work(wrapped);
    }) });
    const pending = [createTactical(observed(true)).moveToken(gm, f.campaign, f.sessionId, "own-two", global)]; void pending[0]!.catch(() => {});
    let results: PromiseSettledResult<unknown>[] = [];
    try {
      await expect.poll(() => firstInserted).toBe(true);
      pending.push(createTactical(observed(false)).moveToken(gm, other.campaign, other.sessionId, "own-two", global)); void pending[1]!.catch(() => {});
      await expect.poll(() => secondMissed).toBe(true);
    } finally { release.resolve(); results = await Promise.allSettled(pending); }
    expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1); expect(results.find(r => r.status === "rejected")?.reason).toBeInstanceOf(Conflict);
    expect((await invariant(other.sessionId)).ring).toHaveLength(0);
  }, 30_000);
});
