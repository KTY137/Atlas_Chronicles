// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { TacticalCartographyV1, TacticalMapDocumentV1 } from "@chronicle/szene";
import type { TacticalAnchor } from "../../protocol/src/tactical.ts";
import { createPgDb, createTestDb, migrate, type Db } from "../src/db/index.ts";
import { createIdentity } from "../src/identity/index.ts";
import { createCampaigns } from "../src/domain/campaigns.ts";
import { createDocuments } from "../src/domain/documents.ts";
import { createGameplay } from "../src/domain/gameplay.ts";
import { createActors } from "../src/domain/actors.ts";
import { createCommunication } from "../src/domain/communication.ts";
import { createTactical, tacticalHash } from "../src/domain/tactical.ts";
import { Gone } from "../src/domain/errors.ts";
import { seedActorControl } from "./actor-fixtures.ts";

const config = { origin: "https://tactical-entities.test", cookieSecret: "tactical-entities-cookie-secret-with-more-than-32-characters" };
const provenance = { name: "Entity fixture", creator: "Test", sourceUrl: null, license: "CC0-1.0", licenseUrl: null, retrievedAt: null, generator: null, generatorVersion: null };
const command = () => ({ commandId: randomUUID() });
const paragraph = (text: string) => ({ inhalt: { kind: "absatz" as const, inhalt: [{ text, marks: [] }] } });
const document = (): TacticalMapDocumentV1 => ({ schemaVersion: 1, kind: "tactical-map", coordinates: "image-pixels",
  frame: { ursprung: [0, 0], einheitenProPixel: 1, ordnung: "xy", hoch: "unten" },
  geometry: { v: 3, size: [64, 64], stamps: [
    { id: "visible-stamp", a: "pk.private/chest", x: 10, y: 10, s: 20, r: 1, l: 9 },
    { id: "unknown-stamp", a: "pk.private/secret", x: 20, y: 10, s: 2, r: 0, l: 2 },
  ], places: [{ id: "visible-place", x: 12, y: 10 }, { id: "outside-place", x: 40, y: 10 }, { id: "unbound-place", x: 15, y: 10 }, { id: "split-place", x: 18, y: 10 }],
  regions: [{ id: "left", punkte: [[0, 0], [31, 0], [31, 64], [0, 64]] }, { id: "right", punkte: [[32, 0], [64, 0], [64, 64], [32, 64]] }] },
  grid: { kind: "none" }, elevation: 0, geometryElevation: [], walls: [], portals: [], lights: [],
  environment: { bakedLighting: false, ambientLightArgb: "ffffffff" }, background: null });

for (const engine of ["PGlite", "PostgreSQL"] as const) describe.skipIf(engine === "PostgreSQL" && !process.env["TEST_DATABASE_URL"])(`tactical entity projection on ${engine}`, () => {
  let db: Db, admin: Db | undefined, gm: string;
  const schema = `chronicle_entities_${randomUUID().replaceAll("-", "")}`;
  beforeAll(async () => {
    if (engine === "PostgreSQL") {
      admin = createPgDb(process.env["TEST_DATABASE_URL"]!); await admin.query(`CREATE SCHEMA "${schema}"`);
      const url = new URL(process.env["TEST_DATABASE_URL"]!); url.searchParams.set("options", `-c search_path=${schema}`); db = createPgDb(url.href);
    } else db = await createTestDb();
    await migrate(db); gm = (await createIdentity(db, config).bootstrap("Kaya")).userId;
  }, 30_000);
  afterAll(async () => {
    await db?.close();
    if (admin) { try { if (!/^chronicle_entities_[a-f0-9]{32}$/.test(schema)) throw new Error("Unexpected entity test schema"); await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`); } finally { await admin.close(); } }
  });
  async function fixture(start = true) {
    const campaign = (await createCampaigns(db).createCampaign(gm, { name: "Entity campaign" })).id;
    const a = { userId: randomUUID(), actorId: randomUUID() }, b = { userId: randomUUID(), actorId: randomUUID() };
    for (const [person, name] of [[a, "Sera"], [b, "Brannt"]] as const) {
      await db.query("INSERT INTO users(id,display_name,created_at) VALUES($1,$2,1)", [person.userId, name]);
      await db.query("INSERT INTO actors(id,campaign_id,user_id,name) VALUES($1,$2,$3,$4)", [person.actorId, campaign, person.userId, name]);
      await db.query("INSERT INTO campaign_memberships(campaign_id,user_id,role,display_name,name_skeleton,actor_id) VALUES($1,$2,'spieler',$3,$3,$4)", [campaign, person.userId, name, person.actorId]);
      await seedActorControl(db, campaign, person.actorId, person.userId);
    }
    const docs = createDocuments(db), tactical = createTactical(db), game = createGameplay(db), actors = createActors(db);
    const rooms = await docs.saveEntry(gm, campaign, { title: "Rooms", passages: [paragraph("Left room"), paragraph("Right room")] });
    const alpha = await docs.saveEntry(gm, campaign, { title: "Old tower", passages: [paragraph("A known tower")] });
    const beta = await docs.saveEntry(gm, campaign, { title: "Secret vault", passages: [paragraph("A hidden vault")] });
    const split = await docs.saveEntry(gm, campaign, { title: "Two chambers", passages: [paragraph("First.Second.")] });
    for (const actor of [a, b]) await docs.revealPassage(gm, campaign, rooms.passagen[0]!.pid, actor.actorId);
    await docs.revealPassage(gm, campaign, rooms.passagen[1]!.pid, b.actorId);
    await docs.revealPassage(gm, campaign, alpha.passagen[0]!.pid, a.actorId);
    await docs.revealPassage(gm, campaign, beta.passagen[0]!.pid, b.actorId);
    const anchors: TacticalAnchor[] = [
      { targetKind: "region", targetId: "left", entryId: rooms.entryId, passageId: rooms.passagen[0]!.pid },
      { targetKind: "region", targetId: "right", entryId: rooms.entryId, passageId: rooms.passagen[1]!.pid },
      { targetKind: "stamp", targetId: "visible-stamp", entryId: alpha.entryId, passageId: alpha.passagen[0]!.pid },
      { targetKind: "stamp", targetId: "unknown-stamp", entryId: beta.entryId, passageId: null },
      { targetKind: "place", targetId: "visible-place", entryId: alpha.entryId, passageId: null },
      { targetKind: "place", targetId: "outside-place", entryId: alpha.entryId, passageId: null },
      { targetKind: "place", targetId: "split-place", entryId: split.entryId, passageId: split.passagen[0]!.pid },
    ];
    const imported = await tactical.importMap(gm, campaign, { ...command(), name: "Private map title", format: "native", sourceText: JSON.stringify(document()), provenance, anchors });
    const scene = await game.createScene(gm, campaign, { name: "The gate", entryIds: [], fictionDate: "Day one" });
    await tactical.savePlan(gm, campaign, scene.id, { ...command(), expectedVersion: 0, mapId: imported.subjectId, mapRevision: 1, tokens: [] });
    const sessionId = start ? String((await game.startScene(gm, campaign, scene.id)).id) : "";
    return { campaign, a, b, docs, tactical, game, actors, alpha, beta, split, rooms, anchors, sceneId: scene.id, mapId: imported.subjectId, sessionId };
  }

  it("requires own anchor knowledge and a known region, and exposes only the semantic DTO", async () => {
    const f = await fixture(), view = await f.tactical.getSession(f.a.userId, f.campaign, f.sessionId);
    expect(view.entities).toEqual([
      { id: "visible-place", kind: "place", x: 12, y: 10, entryId: f.alpha.entryId, label: "Old tower" },
      { id: "visible-stamp", kind: "stamp", x: 10, y: 10, entryId: f.alpha.entryId, label: "Old tower" },
    ]);
    const serialized = JSON.stringify(view);
    for (const hidden of ["unknown-stamp", "outside-place", "unbound-place", "split-place", "pk.private", "Secret vault", f.beta.entryId, f.alpha.passagen[0]!.pid]) expect(serialized).not.toContain(hidden);
    const full = await f.tactical.getSession(gm, f.campaign, f.sessionId);
    expect(full.entities.map(e => e.id)).toEqual(["outside-place", "split-place", "unknown-stamp", "visible-place", "visible-stamp"]);
    expect(full.document?.geometry.places.some(p => p.id === "unbound-place")).toBe(true);
    const { digest, ...body } = view; expect(digest).toBe(tacticalHash(body));
    await expect(f.docs.getEntry(f.a.userId, f.campaign, f.beta.entryId)).rejects.toBeInstanceOf(Gone);
  });

  it("hands a free name to a player only once the middle of its line lies in a region they know", async () => {
    const f = await fixture(false);
    const role = (id: string) => ({ regionId: id, role: "generic" as const, authored: false, locked: false, provenance: null });
    const cartography: TacticalCartographyV1 = { schemaVersion: 1, kind: "tactical-cartography", construction: { cellSize: 8, origin: [0, 0] }, regions: [role("left"), role("right")],
      labels: [{ id: "hall", text: "Linke Halle", points: [[4, 30], [28, 30]], size: 6, style: "ort" }, { id: "vault", text: "Rechter Saal", points: [[40, 20]], size: 6, style: "gegend" }, { id: "beyond", text: "Jenseits der Karte", points: [[70, 10]], size: 6, style: "weg" }] };
    const lit = { ...document(), lights: [{ id: "left-lamp", position: [8, 8] as const, range: 20, intensity: .8, colorArgb: "ffdd8a33", shadows: true, elevation: 0 }, { id: "right-lamp", position: [50, 50] as const, range: 20, intensity: .8, colorArgb: "ffdd8a33", shadows: true, elevation: 0 }] };
    const labelled = await f.tactical.importMap(gm, f.campaign, { ...command(), name: "Named map", format: "native", sourceText: JSON.stringify(lit), provenance, anchors: f.anchors.slice(0, 2) }, { cartography, nodes: [] });
    const scene = await f.game.createScene(gm, f.campaign, { name: "Named", entryIds: [], fictionDate: "Day two" });
    await f.tactical.savePlan(gm, f.campaign, scene.id, { ...command(), expectedVersion: 0, mapId: labelled.subjectId, mapRevision: 1, tokens: [] });
    const sessionId = String((await f.game.startScene(gm, f.campaign, scene.id)).id);
    const a = await f.tactical.getSession(f.a.userId, f.campaign, sessionId), b = await f.tactical.getSession(f.b.userId, f.campaign, sessionId), full = await f.tactical.getSession(gm, f.campaign, sessionId);
    expect(a.labels?.map(label => label.text)).toEqual(["Linke Halle"]);
    expect(b.labels?.map(label => label.text)).toEqual(["Linke Halle", "Rechter Saal"]);
    expect(full.labels?.map(label => label.text)).toEqual(["Linke Halle", "Rechter Saal", "Jenseits der Karte"]);
    for (const hidden of ["Rechter Saal", "Jenseits", "right-lamp"]) expect(JSON.stringify(a)).not.toContain(hidden);
    // Lights follow the same mask, and a painted map tells the picture so: ink names, shadows, the mood.
    expect(a.lights?.map(light => light.id)).toEqual(["left-lamp"]);
    expect(b.lights?.map(light => light.id)).toEqual(["left-lamp", "right-lamp"]);
    expect(a.gemalt).toBe(true); expect(a).not.toHaveProperty("mood");
  });

  it("keeps bulk anchor validation scoped to geometry, campaign and the passage's own article", async () => {
    const f = await fixture(false), foreignCampaign = (await createCampaigns(db).createCampaign(gm, { name: "Foreign knowledge" })).id;
    const foreign = await f.docs.saveEntry(gm, foreignCampaign, { title: "Foreign place", passages: [paragraph("Foreign")] });
    const input = { ...command(), name: "Invalid binding", format: "native", sourceText: JSON.stringify(document()), provenance };
    for (const anchor of [
      { ...f.anchors[4]!, entryId: foreign.entryId },
      { ...f.anchors[4]!, passageId: f.beta.passagen[0]!.pid },
    ]) await expect(f.tactical.importPreview(gm, f.campaign, { ...input, anchors: [anchor] })).rejects.toBeInstanceOf(Gone);
    await expect(f.tactical.importPreview(gm, f.campaign, { ...input, anchors: [{ ...f.anchors[4]!, targetId: "missing" }] })).rejects.toThrow(/Geometrieziel/);
    await expect(f.tactical.importPreview(gm, f.campaign, { ...input, anchors: [f.anchors[4]!, f.anchors[4]!] })).rejects.toThrow(/Geometrieziel/);
    expect(await f.tactical.listMaps(gm, f.campaign)).toHaveLength(1);
  });

  it("resolves every split successor, denies partial knowledge and retirements, and keeps current titles", async () => {
    const f = await fixture(), initial = await f.tactical.getSession(f.a.userId, f.campaign, f.sessionId);
    expect(initial.entities).toHaveLength(2);
    const split = await f.docs.saveEntry(gm, f.campaign, { title: "Two chambers", expectedVersion: f.split.version!, passages: [paragraph("First."), paragraph("Second.")] }, f.split.entryId);
    await f.docs.revealPassage(gm, f.campaign, split.passagen[0]!.pid, f.a.actorId);
    expect((await f.tactical.getSession(f.a.userId, f.campaign, f.sessionId)).entities.map(e => e.id)).not.toContain("split-place");
    await f.docs.revealPassage(gm, f.campaign, split.passagen[1]!.pid, f.a.actorId);
    const visible = await f.tactical.getSession(f.a.userId, f.campaign, f.sessionId);
    expect(visible.entities.find(e => e.id === "split-place")?.label).toBe("Two chambers");
    expect(visible.rasterDigest).toBe(initial.rasterDigest); expect(visible.digest).not.toBe(initial.digest);
    await f.docs.saveEntry(gm, f.campaign, { title: "Empty chambers", expectedVersion: split.version!, passages: [] }, f.split.entryId);
    expect((await f.tactical.getSession(f.a.userId, f.campaign, f.sessionId)).entities.map(e => e.id)).not.toContain("split-place");
    await f.docs.saveEntry(gm, f.campaign, { title: "Renamed tower", expectedVersion: f.alpha.version!, passages: [{ pid: f.alpha.passagen[0]!.pid, ...paragraph("A known tower") }] }, f.alpha.entryId);
    const renamed = await f.tactical.getSession(f.a.userId, f.campaign, f.sessionId);
    expect(renamed.entities.map(e => e.label)).toEqual(["Renamed tower", "Renamed tower"]);
    expect(renamed.rasterDigest).toBe(initial.rasterDigest); expect(renamed.digest).not.toBe(initial.digest);
    expect((await f.docs.getEntry(f.a.userId, f.campaign, f.alpha.entryId)).titel).toBe("Renamed tower");
  });

  it("keeps hidden article edits and later private stamp revisions out of the player digest and realtime sequence", async () => {
    const f = await fixture(), before = await f.tactical.getSession(f.a.userId, f.campaign, f.sessionId), live = createCommunication(db);
    expect(before.entities).toHaveLength(2); const sequence = await live.sync(f.a.userId, f.campaign);
    await f.docs.saveEntry(gm, f.campaign, { title: "Another private vault", expectedVersion: f.beta.version!, passages: [{ pid: f.beta.passagen[0]!.pid, ...paragraph("A hidden vault") }] }, f.beta.entryId);
    const original = document(), changed = { ...original, geometry: { ...original.geometry, stamps: original.geometry.stamps.map(s => s.id === "unknown-stamp" ? { ...s, a: "pk.hidden/new-asset", x: 29, y: 30, r: 3, s: 500, l: 100 } : s) } };
    await f.tactical.reviseMap(gm, f.campaign, f.mapId, { ...command(), expectedVersion: 1, document: changed, anchors: f.anchors });
    expect(await f.tactical.getSession(f.a.userId, f.campaign, f.sessionId)).toEqual(before);
    expect(await live.sync(f.a.userId, f.campaign)).toBe(sequence);
  });

  it("projects only the selected controlled reader and removes entities on knowledge and control revocation", async () => {
    const f = await fixture(), before = await f.tactical.getSession(f.a.userId, f.campaign, f.sessionId);
    expect(before.entities.map(e => e.id)).toEqual(["visible-place", "visible-stamp"]);
    await f.actors.grantController(gm, f.campaign, f.b.actorId, f.a.userId, { ...command(), expectedVersion: 0, reason: "Shared control" });
    expect((await f.tactical.getSession(f.a.userId, f.campaign, f.sessionId)).entities).toEqual(before.entities);
    await f.actors.setReaderPerspective(f.a.userId, f.campaign, { ...command(), expectedVersion: 1, actorId: f.b.actorId });
    expect((await f.tactical.getSession(f.a.userId, f.campaign, f.sessionId)).entities.map(e => e.id)).toEqual(["unknown-stamp"]);
    await db.query("UPDATE revelations SET revoked_at=1 WHERE campaign_id=$1 AND actor_id=$2 AND passage_id=$3", [f.campaign, f.b.actorId, f.beta.passagen[0]!.pid]);
    const revoked = await f.tactical.getSession(f.a.userId, f.campaign, f.sessionId); expect(revoked.entities).toEqual([]); expect(revoked.regions).toHaveLength(2);
    await f.docs.revealPassage(gm, f.campaign, f.beta.passagen[0]!.pid, f.b.actorId);
    await f.actors.revokeController(gm, f.campaign, f.b.actorId, f.a.userId, { ...command(), expectedVersion: 1, reason: "Revoke perspective" });
    const noReader = await f.tactical.getSession(f.a.userId, f.campaign, f.sessionId); expect(noReader.entities).toEqual([]); expect(noReader.regions).toEqual([]);
  });

  it("pins entity position and binding until the next deliberate scene start", async () => {
    const f = await fixture(), before = await f.tactical.getSession(f.a.userId, f.campaign, f.sessionId), original = document();
    expect(before.entities).toHaveLength(2);
    const changed = { ...original, geometry: { ...original.geometry, places: original.geometry.places.map(p => p.id === "visible-place" ? { ...p, x: 25, y: 25 } : p) } };
    const anchors = f.anchors.map(a => a.targetId === "visible-place" ? { ...a, entryId: f.beta.entryId, passageId: null } : a);
    await f.tactical.reviseMap(gm, f.campaign, f.mapId, { ...command(), expectedVersion: 1, document: changed, anchors });
    await f.tactical.savePlan(gm, f.campaign, f.sceneId, { ...command(), expectedVersion: 1, mapId: f.mapId, mapRevision: 2, tokens: [] });
    expect(String((await f.game.startScene(gm, f.campaign, f.sceneId)).id)).toBe(f.sessionId);
    expect(await f.tactical.getSession(f.a.userId, f.campaign, f.sessionId)).toEqual(before);
    await db.query("UPDATE game_sessions SET ended_at=2 WHERE id=$1", [f.sessionId]); await db.query("UPDATE scenes SET status='ended' WHERE id=$1", [f.sceneId]);
    const next = String((await f.game.startScene(gm, f.campaign, f.sceneId)).id);
    expect((await f.tactical.getSession(f.a.userId, f.campaign, next)).entities.map(e => e.id)).toEqual(["visible-stamp"]);
    expect((await f.tactical.getSession(f.b.userId, f.campaign, next)).entities.find(e => e.id === "visible-place")).toMatchObject({ x: 25, y: 25, entryId: f.beta.entryId, label: "Secret vault" });
  });

  it("includes exact region/map boundaries, rejects out-of-map points and sorts IDs by UTF-16", async () => {
    const f = await fixture(false), original = document();
    const places = [{ id: "\uE000", x: 0, y: 0 }, { id: "\u{1F600}", x: 31, y: 64 }, { id: "edge", x: 31, y: 30 },
      { id: "outside-region", x: 31.0001, y: 30 }, { id: "negative", x: -0.001, y: 10 }, { id: "outside-map", x: 10, y: 64.001 }];
    const changed: TacticalMapDocumentV1 = { ...original, geometry: { ...original.geometry, stamps: [], places,
      regions: [{ id: "left", punkte: [[-10, -10], [31, -10], [31, 70], [-10, 70]] }] } };
    const anchors: TacticalAnchor[] = [f.anchors[0]!, ...places.map(p => ({ targetKind: "place" as const, targetId: p.id, entryId: f.alpha.entryId, passageId: null }))];
    await f.tactical.reviseMap(gm, f.campaign, f.mapId, { ...command(), expectedVersion: 1, document: changed, anchors });
    await f.tactical.savePlan(gm, f.campaign, f.sceneId, { ...command(), expectedVersion: 1, mapId: f.mapId, mapRevision: 2, tokens: [] });
    const sessionId = String((await f.game.startScene(gm, f.campaign, f.sceneId)).id);
    expect((await f.tactical.getSession(f.a.userId, f.campaign, sessionId)).entities.map(e => e.id)).toEqual(["edge", "\u{1F600}", "\uE000"]);
    expect((await f.tactical.getSession(gm, f.campaign, sessionId)).entities).toHaveLength(places.length);
  });

  it("returns all 50,000 stamps and 20,000 places with bounded SQL, including shared passage anchors", async () => {
    const f = await fixture(false), original = document();
    const stamps = Array.from({ length: 50_000 }, (_, i) => ({ id: `stamp-${String(i).padStart(5, "0")}`, a: "pk.private/asset", x: 10, y: 10, s: 1, r: 0, l: 0 }));
    const places = Array.from({ length: 20_000 }, (_, i) => ({ id: `place-${String(i).padStart(5, "0")}`, x: 20, y: 20 }));
    const changed = { ...original, geometry: { ...original.geometry, stamps, places } };
    const anchors: TacticalAnchor[] = [...f.anchors.filter(a => a.targetKind === "region"),
      ...stamps.map(s => ({ targetKind: "stamp" as const, targetId: s.id, entryId: f.alpha.entryId, passageId: f.alpha.passagen[0]!.pid })),
      ...places.map(p => ({ targetKind: "place" as const, targetId: p.id, entryId: f.alpha.entryId, passageId: null }))];
    const queries: string[] = [];
    const track = (source: Db): Db => ({ ...source, query: async (sql, params) => { queries.push(sql); return source.query(sql, params); }, transaction: work => source.transaction(tx => work(track(tx))) });
    const tactical = createTactical(track(db));
    await tactical.reviseMap(gm, f.campaign, f.mapId, { ...command(), expectedVersion: 1, document: changed, anchors });
    expect(queries.length).toBeLessThan(25);
    await f.tactical.savePlan(gm, f.campaign, f.sceneId, { ...command(), expectedVersion: 1, mapId: f.mapId, mapRevision: 2, tokens: [] });
    const sessionId = String((await f.game.startScene(gm, f.campaign, f.sceneId)).id); queries.length = 0;
    const view = await tactical.getSession(f.a.userId, f.campaign, sessionId);
    expect(view.entities).toHaveLength(70_000); expect(queries.length).toBeLessThan(25);
    expect(view.entities[0]).toMatchObject({ id: "place-00000", label: "Old tower" }); expect(view.entities.at(-1)).toMatchObject({ id: "stamp-49999", label: "Old tower" });
    expect(view.entities.every(e => Object.keys(e).sort().join(",") === "entryId,id,kind,label,x,y")).toBe(true);
  }, 60_000);
});
