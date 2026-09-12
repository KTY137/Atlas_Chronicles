// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { TABLE_DICE_ACTION_ID, TABLE_DICE_PACKAGE_ID, type AdventureTree } from "@chronicle/protocol";
import { currentCampaignSemanticDiff, validateCurrentCampaignBundle, vermisseBild } from "@chronicle/io";
import { createTestDb, migrate, type Db } from "../src/db/index.ts";
import { createCampaigns } from "../src/domain/campaigns.ts";
import { createGameplay } from "../src/domain/gameplay.ts";
import { createTabletop, AdventureValidationError } from "../src/domain/tabletop.ts";
import { tableDicePackage } from "../src/domain/table-dice.ts";
import { Conflict, Gone } from "../src/domain/errors.ts";
import { exportCampaignBundle, restoreCampaignBundle } from "../src/domain/bundles.ts";
import { seedActorControl } from "./actor-fixtures.ts";
import { buildApp } from "../src/app.ts";
import { createIdentity } from "../src/identity/index.ts";

const clock = Date.UTC(2026, 8, 12, 14), cfg = { now: () => clock, seed: () => "00000001000000020000000300000004" };
const tree = (sceneId: string | null = null): AdventureTree => ({ schemaVersion: 1, name: "Der Turm", rootId: "gate", nodes: [
  { id: "gate", title: "Das Tor", notes: "Der Wächter ist ein Geist.", sceneId: null, choices: [{ id: "enter", label: "Eintreten", targetId: "hall" }, { id: "leave", label: "Umkehren", targetId: "forest" }] },
  { id: "hall", title: "Die Halle", notes: "Nur die Leitung kennt den Schatz.", sceneId, choices: [] },
  { id: "forest", title: "Der Wald", notes: "", sceneId: null, choices: [] },
] });
describe("persisted tabletop commands and private adventure trees", () => {
  let db: Db;
  beforeAll(async () => { db = await createTestDb(); await migrate(db); }, 60_000);
  afterAll(async () => { await db?.close(); });
  async function fixture() {
    const gm = randomUUID(), a = randomUUID(), b = randomUUID(), outsider = randomUUID();
    for (const [id, role] of [[gm, "leitung"], [a, "gast"], [b, "gast"], [outsider, "gast"]])
      await db.query("INSERT INTO users(id,display_name,platform_role,created_at) VALUES($1,$2,$3,$4)", [id, id, role, clock]);
    const campaignId = (await createCampaigns(db, cfg).createCampaign(gm, { name: "Am Tisch" })).id;
    const actorA = randomUUID(), actorB = randomUUID(), secretActor = randomUUID();
    for (const [user, actor, name] of [[a, actorA, "Sera"], [b, actorB, "Brannt"]]) {
      await db.query("INSERT INTO actors(id,campaign_id,user_id,name) VALUES($1,$2,$3,$4)", [actor, campaignId, user, name]);
      await db.query("INSERT INTO campaign_memberships(campaign_id,user_id,role,display_name,name_skeleton,actor_id) VALUES($1,$2,'spieler',$3,$3,$4)", [campaignId, user, name, actor]);
      await seedActorControl(db, campaignId, actor!, user!);
    }
    await db.query("INSERT INTO actors(id,campaign_id,user_id,name) VALUES($1,$2,$3,'Secret dragon')", [secretActor, campaignId, gm]);
    await db.query("INSERT INTO actor_profiles(actor_id,campaign_id,kind) VALUES($1,$2,'npc')", [secretActor, campaignId]);
    return { gm, a, b, outsider, actorA, actorB, secretActor, campaignId, game: createGameplay(db, cfg), table: createTabletop(db, cfg) };
  }
  const draft = (actorId: string) => ({ commandId: randomUUID(), actorId, actionId: TABLE_DICE_ACTION_ID, tableDice: { count: 3, minimum: -5, maximum: 8 } });

  it("rolls once with signed ranges, retains deterministic evidence and leaves sheets/pins unchanged", async () => {
    const f = await fixture(), input = draft(f.actorA), before = await f.game.getSheet(f.a, f.campaignId, f.actorA);
    const [first, retried] = await Promise.all([f.game.prepareAction(f.a, f.campaignId, input), f.game.prepareAction(f.a, f.campaignId, input)]);
    expect(retried).toEqual(first);
    expect(first.receipt.context.actor).toEqual({}); expect(first.receipt.context.knowledge.passages).toEqual([]);
    const values = first.receipt.dice.flatMap(die => die.rolls.flat()).map(value => value - 6);
    expect(values).toHaveLength(3); expect(values.every(value => value >= -5 && value <= 8)).toBe(true);
    expect(first.receipt.total).toBe(values.reduce((sum, value) => sum + value, 0));
    expect(await f.game.getSheet(f.a, f.campaignId, f.actorA)).toEqual(before);
    expect((await f.game.replayRoll(f.a, f.campaignId, first.id)).valid).toBe(true);
    expect((await f.game.listPackages(f.gm, f.campaignId)).packages.some(pkg => pkg.id === TABLE_DICE_PACKAGE_ID)).toBe(false);
    await expect(f.game.prepareAction(f.a, f.campaignId, { ...input, tableDice: { ...input.tableDice, count: 2 } })).rejects.toBeInstanceOf(Conflict);
    await expect(f.game.installPackage(f.gm, f.campaignId, tableDicePackage(input.tableDice))).rejects.toBeInstanceOf(Gone);
    await expect(f.game.activatePackage(f.gm, f.campaignId, { packageId: first.receipt.package.id, packageVersion: first.receipt.package.version, expectedVersion: 0 })).rejects.toBeInstanceOf(Gone);
  });
  it("shares only free table rolls of the known party, keeping private rolls and NPCs private", async () => {
    const f = await fixture(), publicRoll = await f.game.prepareAction(f.b, f.campaignId, draft(f.actorB));
    const privateRoll = await f.game.prepareAction(f.b, f.campaignId, { commandId: randomUUID(), actorId: f.actorB, actionId: "investigate" });
    const secretRoll = await f.game.prepareAction(f.gm, f.campaignId, draft(f.secretActor));
    const shown = await f.game.listTableRolls(f.a, f.campaignId);
    expect(shown.map(card => card.id)).toEqual([publicRoll.id]);
    expect((await f.game.replayRoll(f.a, f.campaignId, publicRoll.id)).valid).toBe(true);
    await expect(f.game.getRoll(f.a, f.campaignId, privateRoll.id)).rejects.toBeInstanceOf(Gone);
    await expect(f.game.getRoll(f.a, f.campaignId, secretRoll.id)).rejects.toBeInstanceOf(Gone);
    await expect(f.game.confirmAction(f.a, f.campaignId, publicRoll.id)).rejects.toBeInstanceOf(Gone);
    await expect(f.game.prepareAction(f.a, f.campaignId, draft(f.actorB))).rejects.toBeInstanceOf(Gone);
    await expect(f.game.listTableRolls(f.outsider, f.campaignId)).rejects.toBeInstanceOf(Gone);
  });
  it("rejects unsafe counts, faces and mixed authority before rolling", async () => {
    const f = await fixture();
    for (const spec of [{ count: 0, minimum: 1, maximum: 20 }, { count: 101, minimum: 1, maximum: 6 }, { count: 1, minimum: 10, maximum: 9 }, { count: 1, minimum: 1, maximum: 1 }, { count: 1, minimum: 1, maximum: 100001 }, { count: 1.5, minimum: 1, maximum: 6 }])
      await expect(f.game.prepareAction(f.a, f.campaignId, { ...draft(f.actorA), tableDice: spec })).rejects.toBeInstanceOf(Gone);
    for (const fields of [{ targetPassageId: "secret" }, { input: { minimum: 999 } }, { erleichterungId: "foreign" }, { packageId: "foreign" }, { actionId: "investigate" }])
      await expect(f.game.prepareAction(f.gm, f.campaignId, { ...draft(f.actorA), ...fields })).rejects.toBeInstanceOf(Gone);
    expect((await db.query("SELECT id FROM action_rolls WHERE campaign_id=$1", [f.campaignId])).rowCount).toBe(0);
  });
  it("persists an editable GM tree, protects CAS/idempotency, follows a branch and starts its real scene", async () => {
    const f = await fixture(), scene = await f.game.createScene(f.gm, f.campaignId, { name: "Die Halle", entryIds: [], fictionDate: "Frostmond" });
    expect((await f.table.getAdventure(f.gm, f.campaignId)).version).toBe(0);
    const input = { commandId: randomUUID(), expectedVersion: 0, document: tree(scene.id) };
    const saved = await f.table.saveAdventure(f.gm, f.campaignId, input);
    expect(await f.table.saveAdventure(f.gm, f.campaignId, input)).toEqual(saved);
    expect(await createTabletop(db, cfg).getAdventure(f.gm, f.campaignId)).toEqual(saved);
    await expect(f.table.saveAdventure(f.gm, f.campaignId, { ...input, commandId: randomUUID() })).rejects.toBeInstanceOf(Conflict);
    await expect(f.table.saveAdventure(f.gm, f.campaignId, { ...input, document: { ...input.document, name: "Changed request" } })).rejects.toBeInstanceOf(Conflict);
    const advanced = await f.table.advanceAdventure(f.gm, f.campaignId, { commandId: randomUUID(), expectedVersion: saved.version, nodeId: "hall", expectedSceneVersion: scene.version });
    expect(advanced.currentNodeId).toBe("hall"); expect(advanced.version).toBe(2);
    expect((await f.game.listScenes(f.a, f.campaignId))[0]!.status).toBe("active");
    expect((await db.query("SELECT id FROM game_sessions WHERE campaign_id=$1", [f.campaignId])).rowCount).toBe(1);
    for (const user of [f.a, f.b, f.outsider]) {
      await expect(f.table.getAdventure(user, f.campaignId)).rejects.toBeInstanceOf(Gone);
      await expect(f.table.saveAdventure(user, f.campaignId, { ...input, commandId: randomUUID() })).rejects.toBeInstanceOf(Gone);
      await expect(f.table.advanceAdventure(user, f.campaignId, { commandId: randomUUID(), expectedVersion: 2, nodeId: "forest" })).rejects.toBeInstanceOf(Gone);
    }
    const cleared = await f.table.saveAdventure(f.gm, f.campaignId, { commandId: randomUUID(), expectedVersion: 2, document: { schemaVersion: 1, name: "Ein neues Abenteuer", rootId: null, nodes: [] } });
    expect(cleared.currentNodeId).toBeNull(); expect((await f.game.listScenes(f.gm, f.campaignId))).toHaveLength(1);
  });
  it("rejects broken references and cycles and rolls back a scene conflict with the tree unchanged", async () => {
    const f = await fixture();
    const cycle = tree(); cycle.nodes[1]!.choices.push({ id: "back", label: "Zurück", targetId: "gate" });
    const dangling = tree(); dangling.nodes[0]!.choices[0]!.targetId = "missing";
    for (const document of [cycle, dangling, { ...tree(), rootId: "missing" }, tree("foreign-scene")])
      await expect(f.table.saveAdventure(f.gm, f.campaignId, { commandId: randomUUID(), expectedVersion: 0, document })).rejects.toBeInstanceOf(AdventureValidationError);
    const scene = await f.game.createScene(f.gm, f.campaignId, { name: "Die Halle", entryIds: [], fictionDate: "Frostmond" });
    const saved = await f.table.saveAdventure(f.gm, f.campaignId, { commandId: randomUUID(), expectedVersion: 0, document: tree(scene.id) });
    await expect(f.table.advanceAdventure(f.gm, f.campaignId, { commandId: randomUUID(), expectedVersion: 1, nodeId: "hall", expectedSceneVersion: 999 })).rejects.toBeInstanceOf(Conflict);
    expect(await f.table.getAdventure(f.gm, f.campaignId)).toEqual(saved);
    expect((await db.query("SELECT id FROM game_sessions WHERE campaign_id=$1", [f.campaignId])).rowCount).toBe(0);
  });
  it("round-trips the current tree, portrait bytes and free roll evidence through a new database", async () => {
    const f = await fixture();
    const saved = await f.table.saveAdventure(f.gm, f.campaignId, { commandId: randomUUID(), expectedVersion: 0, document: tree() });
    await f.table.advanceAdventure(f.gm, f.campaignId, { commandId: randomUUID(), expectedVersion: saved.version, nodeId: "forest" });
    const roll = await f.game.prepareAction(f.a, f.campaignId, draft(f.actorA)); await f.game.confirmAction(f.a, f.campaignId, roll.id);
    const bytes = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==", "base64"), image = vermisseBild(bytes);
    await db.query("INSERT INTO actor_portraits(actor_id,campaign_id,version,mime,sha256,bytes,breite,hoehe,daten,updated_by,updated_at) VALUES($1,$2,1,$3,$4,$5,$6,$7,$8,$9,$10)", [f.actorA, f.campaignId, image.mime, image.sha256, image.bytes, image.breite, image.hoehe, bytes.toString("base64"), f.a, clock]);
    const bundle = await exportCampaignBundle(db, f.gm, f.campaignId, { now: () => clock });
    expect(bundle.version).toBe(21);
    const target = await createTestDb();
    try {
      await migrate(target); await restoreCampaignBundle(target, bundle);
      expect((await createTabletop(target, cfg).getAdventure(f.gm, f.campaignId)).currentNodeId).toBe("forest");
      expect((await createGameplay(target, cfg).replayRoll(f.a, f.campaignId, roll.id)).valid).toBe(true);
      const reopened = await exportCampaignBundle(target, f.gm, f.campaignId, { now: () => clock });
      expect(currentCampaignSemanticDiff(bundle, reopened)).toEqual([]);
    } finally { await target.close(); }
    const tampered = JSON.parse(JSON.stringify(bundle)); tampered.tables.actor_portraits[0].sha256 = "0".repeat(64);
    expect(() => validateCurrentCampaignBundle(tampered)).toThrow();
    const broken = JSON.parse(JSON.stringify(bundle)); broken.tables.adventure_trees[0].current_node_id = "missing";
    expect(() => validateCurrentCampaignBundle(broken)).toThrow();
  }, 60_000);
  it("keeps adventure HTTP responses GM-only and checks write origins and closed payloads", async () => {
    const f = await fixture(), config = { origin: "https://tabletop.test", cookieSecret: "tabletop-cookie-secret-with-more-than-32-characters", bootstrapToken: "tabletop-bootstrap-with-more-than-32-characters" };
    const identity = createIdentity(db, config), gmCookie = `chronicle_session=${(await identity.issueSession(f.gm)).value}`, playerCookie = `chronicle_session=${(await identity.issueSession(f.a)).value}`;
    const app = await buildApp(db, config), base = `/api/campaigns/${f.campaignId}`;
    try {
      expect((await app.inject({ method: "GET", url: `${base}/tabletop/adventure`, headers: { cookie: playerCookie } })).statusCode).toBe(404);
      const input = { commandId: randomUUID(), expectedVersion: 0, document: tree() };
      expect((await app.inject({ method: "PUT", url: `${base}/tabletop/adventure`, headers: { cookie: gmCookie }, payload: input })).statusCode).toBe(404);
      expect((await app.inject({ method: "PUT", url: `${base}/tabletop/adventure`, headers: { cookie: gmCookie, origin: config.origin }, payload: { ...input, unknown: "rejected" } })).statusCode).toBe(400);
      const saved = await app.inject({ method: "PUT", url: `${base}/tabletop/adventure`, headers: { cookie: gmCookie, origin: config.origin }, payload: input });
      expect(saved.statusCode).toBe(200); expect(saved.json().document.nodes[1].notes).toContain("Schatz");
      const denied = await app.inject({ method: "GET", url: `${base}/tabletop/adventure`, headers: { cookie: playerCookie } });
      expect(denied.statusCode).toBe(404); expect(denied.body).not.toContain("Schatz");
      expect((await app.inject({ method: "POST", url: `${base}/rolls`, headers: { cookie: playerCookie, origin: config.origin }, payload: { ...draft(f.actorA), tableDice: { count: 101, minimum: 1, maximum: 20 } } })).statusCode).toBe(400);
      expect((await app.inject({ method: "POST", url: `${base}/rolls`, headers: { cookie: playerCookie, origin: config.origin }, payload: draft(f.actorB) })).statusCode).toBe(404);
      const roll = await app.inject({ method: "POST", url: `${base}/rolls`, headers: { cookie: playerCookie, origin: config.origin }, payload: draft(f.actorA) });
      expect(roll.statusCode).toBe(200); expect(roll.json().receipt.package.id).toBe(TABLE_DICE_PACKAGE_ID);
    } finally { await app.close(); }
  }, 60_000);
});
