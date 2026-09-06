import { createHash, randomUUID } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import Fastify from "fastify";
import { DEMO_RULE_PACKAGE, stableJson } from "@chronicle/rules";
import { createTestDb, migrate, type Db } from "../src/db/index.ts";
import { createCampaigns } from "../src/domain/campaigns.ts";
import { createIdentity } from "../src/identity/index.ts";
import { createGameplay } from "../src/domain/gameplay.ts";
import { createDocuments } from "../src/domain/documents.ts";
import { ActorValidationError, authorizeActor, authorizeActorPerspective, createActors, listControlledActorIds } from "../src/domain/actors.ts";
import { Conflict, Gone } from "../src/domain/errors.ts";
import { registerActors } from "../src/http/actors.ts";
import { exportCampaignBundle } from "../src/domain/bundles.ts";

const config = { origin: "https://actors.test", cookieSecret: "actors-test-cookie-secret-with-more-than-32-characters" };
const reason = "Explicit test change";
const command = () => ({ commandId: randomUUID() });
const actorDefinition = (insight = 2) => ({ schemaVersion: 1, name: "Torwache", kind: "npc", loreEntryId: null,
  package: { id: DEMO_RULE_PACKAGE.id, version: DEMO_RULE_PACKAGE.version }, fields: { insight } });
const itemDefinition = (name = "Messingschlüssel") => ({ schemaVersion: 1, name, loreEntryId: null, tags: ["Werkzeug"] });

describe("actor templates, explicit control and item custody", () => {
  let db: Db, gm: string;
  beforeAll(async () => { db = await createTestDb(); await migrate(db); gm = (await createIdentity(db, config).bootstrap("Kaya")).userId; }, 30_000);
  afterAll(async () => db?.close());
  async function fixture() {
    const campaigns = createCampaigns(db), campaign = (await campaigns.createCampaign(gm, { name: "Figuren und Gegenstände" })).id;
    const people: { userId: string; actorId: string }[] = [];
    for (const name of ["Sera", "Brannt"]) {
      const userId = randomUUID(), actorId = randomUUID();
      await db.query("INSERT INTO users(id,display_name,created_at) VALUES($1,$2,$3)", [userId, name, Date.now()]);
      await db.query("INSERT INTO actors(id,campaign_id,user_id,name) VALUES($1,$2,$3,$4)", [actorId, campaign, userId, name]);
      await db.query("INSERT INTO campaign_memberships(campaign_id,user_id,role,display_name,name_skeleton,actor_id) VALUES($1,$2,'spieler',$3,$3,$4)", [campaign, userId, name, actorId]);
      await db.query("INSERT INTO actor_profiles(actor_id,campaign_id,kind,created_by,created_at) VALUES($1,$2,'player_character',$3,$4)", [actorId, campaign, gm, Date.now()]);
      await db.query("INSERT INTO actor_controllers(actor_id,campaign_id,user_id,granted_by,granted_at) VALUES($1,$2,$3,$4,$5)", [actorId, campaign, userId, gm, Date.now()]);
      await db.query("INSERT INTO reader_perspectives(campaign_id,user_id,actor_id) VALUES($1,$2,$3)", [campaign, userId, actorId]);
      people.push({ userId, actorId });
    }
    return { campaign, a: people[0]!, b: people[1]!, actors: createActors(db), game: createGameplay(db), campaigns };
  }
  async function npc(f: Awaited<ReturnType<typeof fixture>>) {
    const template = await f.actors.createActorTemplate(gm, f.campaign, { ...command(), definition: actorDefinition() });
    const actor = await f.actors.instantiateActor(gm, f.campaign, { ...command(), templateId: template.id, templateRevision: 1 });
    return { template, actor };
  }

  it("freezes revisions and instantiates independent sheets with references to the same lore", async () => {
    const f = await fixture(), docs = createDocuments(db);
    const lore = await docs.saveEntry(gm, f.campaign, { title: "Die Torwache", passages: [{ inhalt: { kind: "absatz", inhalt: [{ text: "Die Wache kennt einen geheimen Weg.", marks: [] }] } }] });
    const draft = { ...command(), definition: { ...actorDefinition(2), loreEntryId: lore.entryId } };
    const template = await f.actors.createActorTemplate(gm, f.campaign, draft);
    expect(await f.actors.createActorTemplate(gm, f.campaign, draft)).toEqual(template);
    const first = await f.actors.instantiateActor(gm, f.campaign, { ...command(), templateId: template.id, templateRevision: 1, name: "Alrik" });
    const next = await f.actors.reviseActorTemplate(gm, f.campaign, template.id, { ...command(), expectedVersion: 1, reason, definition: { ...actorDefinition(5), loreEntryId: lore.entryId } });
    const second = await f.actors.instantiateActor(gm, f.campaign, { ...command(), templateId: template.id, templateRevision: next.revision, name: "Borik" });
    expect(first.id).not.toBe(second.id);
    expect(first.loreEntryId).toBe(lore.entryId); expect(second.loreEntryId).toBe(lore.entryId);
    expect(first.template).toEqual({ id: template.id, revision: 1 });
    expect((await f.game.getSheet(gm, f.campaign, first.id)).fields.insight).toBe(2);
    expect((await f.game.getSheet(gm, f.campaign, second.id)).fields.insight).toBe(5);
    expect(await f.actors.getActorTemplate(gm, f.campaign, template.id, 1)).toMatchObject({ definition: template.definition, contentHash: template.contentHash });
    expect((await db.query("SELECT 1 FROM entries WHERE campaign_id=$1", [f.campaign])).rowCount).toBe(1);
    expect((await f.actors.listControllers(gm, f.campaign, first.id))[0]).toMatchObject({ userId: gm, permission: "control", revokedAt: null });
    await expect(f.actors.createActorTemplate(gm, f.campaign, { ...draft, definition: actorDefinition(3) })).rejects.toBeInstanceOf(Conflict);
  });

  it("allows shared explicit control and revokes it without resurrecting historical owner authority", async () => {
    const f = await fixture(), { actor } = await npc(f);
    const a = await f.campaigns.requireMember(f.a.userId, f.campaign);
    expect(await f.actors.listActors(f.a.userId, f.campaign)).toHaveLength(1);
    await expect(authorizeActor(db, a, actor.id)).rejects.toBeInstanceOf(Gone);
    const grant = { ...command(), expectedVersion: 0, reason };
    await f.actors.grantController(gm, f.campaign, actor.id, f.a.userId, grant);
    await f.actors.grantController(gm, f.campaign, actor.id, f.b.userId, { ...command(), expectedVersion: 0, reason });
    expect(await listControlledActorIds(db, a)).toContain(actor.id);
    await expect(authorizeActor(db, a, actor.id)).resolves.toMatchObject({ id: actor.id });
    await f.actors.setReaderPerspective(f.a.userId, f.campaign, { ...command(), expectedVersion: 1, actorId: actor.id });
    await f.actors.revokeController(gm, f.campaign, actor.id, f.a.userId, { ...command(), expectedVersion: 1, reason });
    expect(await f.actors.getReaderPerspective(f.a.userId, f.campaign)).toEqual({ actorId: null, version: 2 });
    await expect(authorizeActor(db, a, actor.id)).rejects.toBeInstanceOf(Gone);
    // A retry returns its original receipt, but never rewrites the subsequent revocation.
    expect(await f.actors.grantController(gm, f.campaign, actor.id, f.a.userId, grant)).toMatchObject({ version: 1, revokedAt: null });
    await expect(authorizeActor(db, a, actor.id)).rejects.toBeInstanceOf(Gone);
    await f.actors.revokeController(gm, f.campaign, f.a.actorId, f.a.userId, { ...command(), expectedVersion: 1, reason });
    await expect(authorizeActor(db, a, f.a.actorId)).rejects.toBeInstanceOf(Gone);
    const orphan = randomUUID();
    await db.query("INSERT INTO actors(id,campaign_id,user_id,name) VALUES($1,$2,$3,'No profile')", [orphan, f.campaign, f.a.userId]);
    await expect(authorizeActor(db, a, orphan)).rejects.toBeInstanceOf(Gone);
  });

  it("keeps GM gameplay authority separate from private correspondence and reader choice", async () => {
    const f = await fixture(), current = await f.campaigns.requireMember(gm, f.campaign), { actor } = await npc(f);
    await expect(authorizeActor(db, current, f.a.actorId)).resolves.toBeDefined();
    await expect(authorizeActorPerspective(db, current, f.a.actorId)).rejects.toBeInstanceOf(Gone);
    const before = await f.actors.getReaderPerspective(gm, f.campaign);
    await expect(f.actors.setReaderPerspective(gm, f.campaign, { ...command(), expectedVersion: before.version, actorId: f.a.actorId })).rejects.toBeInstanceOf(Gone);
    expect(await f.actors.setReaderPerspective(gm, f.campaign, { ...command(), expectedVersion: before.version, actorId: actor.id })).toMatchObject({ actorId: actor.id });
    expect((await f.actors.getActor(gm, f.campaign, f.a.actorId)).canReadAs).toBe(false);
    expect((await f.actors.getActor(gm, f.campaign, actor.id)).canReadAs).toBe(true);
  });

  it("refuses old package templates after activation and keeps migration input uniformly pinned", async () => {
    const f = await fixture(), { template, actor } = await npc(f);
    const next = { ...DEMO_RULE_PACKAGE, version: "1.1.0", migrations: [{ from: "1.0.0", to: "1.1.0", steps: [] }] };
    await f.game.installPackage(gm, f.campaign, next);
    await f.game.activatePackage(gm, f.campaign, { packageId: next.id, packageVersion: next.version, expectedVersion: 0 });
    await expect(f.actors.instantiateActor(gm, f.campaign, { ...command(), templateId: template.id, templateRevision: 1 })).rejects.toBeInstanceOf(Conflict);
    expect((await f.game.getSheet(gm, f.campaign, actor.id)).packageVersion).toBe(next.version);
    const revised = await f.actors.reviseActorTemplate(gm, f.campaign, template.id, { ...command(), expectedVersion: 1, reason, definition: { ...actorDefinition(), package: { id: next.id, version: next.version } } });
    const fresh = await f.actors.instantiateActor(gm, f.campaign, { ...command(), templateId: template.id, templateRevision: revised.revision });
    expect((await f.game.getSheet(gm, f.campaign, fresh.id)).packageVersion).toBe(next.version);
    expect((await f.game.previewPackage(gm, f.campaign, next)).migration).toBeNull();
  });

  it("roundtrips immutable actor defaults at the existing rule package identifier and string bounds", async () => {
    const f = await fixture(), fieldId = `lore-${"x".repeat(91)}`, value = "x".repeat(4096);
    const pkg = { ...DEMO_RULE_PACKAGE, version: "1.2.0", fields: { ...DEMO_RULE_PACKAGE.fields,
      [fieldId]: { type: "string", label: "Lange Notiz", default: value, maxLength: 4096 } } };
    await f.game.installPackage(gm, f.campaign, pkg);
    const definition = { ...actorDefinition(), package: { id: pkg.id, version: pkg.version }, fields: {} };
    const saved = await f.actors.createActorTemplate(gm, f.campaign, { ...command(), definition });
    expect(saved.definition.fields[fieldId]).toBe(value);
    const bundle = await exportCampaignBundle(db, gm, f.campaign);
    expect(bundle.tables.actor_template_revisions[0]?.definition).toEqual(saved.definition);
    const explicit = await f.actors.createActorTemplate(gm, f.campaign, { ...command(), definition: { ...definition, fields: { [fieldId]: value } } });
    expect(explicit.definition).toEqual(saved.definition);
  });

  it("retains historical actor evidence after archival while rejecting new actions", async () => {
    const f = await fixture(), { actor, template } = await npc(f);
    await f.actors.grantController(gm, f.campaign, actor.id, f.a.userId, { ...command(), expectedVersion: 0, reason });
    const viewer = await f.campaigns.requireMember(f.a.userId, f.campaign);
    await f.actors.archiveActor(gm, f.campaign, actor.id, { ...command(), expectedVersion: 1, reason });
    await expect(authorizeActor(db, viewer, actor.id)).rejects.toBeInstanceOf(Gone);
    await expect(authorizeActor(db, viewer, actor.id, { active: false })).resolves.toBeDefined();
    expect(await listControlledActorIds(db, viewer, { active: false })).toContain(actor.id);
    expect(await listControlledActorIds(db, viewer)).not.toContain(actor.id);
    await f.actors.archiveActorTemplate(gm, f.campaign, template.id, { ...command(), expectedVersion: 1, reason });
    expect((await f.actors.getActorTemplate(gm, f.campaign, template.id, 1)).contentHash).toBe(template.contentHash);
    await expect(f.actors.instantiateActor(gm, f.campaign, { ...command(), templateId: template.id, templateRevision: 1 })).rejects.toBeInstanceOf(Gone);
  });

  it("keeps template item state independent and transfers custody without exposing another inventory", async () => {
    const f = await fixture(), template = await f.actors.createItemTemplate(gm, f.campaign, { ...command(), definition: itemDefinition() });
    const first = await f.actors.instantiateItem(gm, f.campaign, { ...command(), templateId: template.id, templateRevision: 1, holderActorId: f.a.actorId });
    const second = await f.actors.instantiateItem(gm, f.campaign, { ...command(), templateId: template.id, templateRevision: 1, holderActorId: f.a.actorId });
    await f.actors.reviseItemTemplate(gm, f.campaign, template.id, { ...command(), expectedVersion: 1, reason, definition: itemDefinition("Eisenschlüssel") });
    const update = { ...command(), expectedVersion: 1, reason, state: { quantity: 2, notes: "Am Gürtel", equipped: true } };
    const changed = await f.actors.updateItem(f.a.userId, f.campaign, first.id, update);
    expect(await f.actors.updateItem(f.a.userId, f.campaign, first.id, update)).toEqual(changed);
    expect(changed.definition.name).toBe("Messingschlüssel");
    expect((await f.actors.getItem(f.a.userId, f.campaign, second.id)).state).toEqual({ quantity: 1, notes: "", equipped: false });
    await expect(f.actors.listItems(f.b.userId, f.campaign, f.a.actorId)).rejects.toBeInstanceOf(Gone);
    await expect(f.actors.transferItem(f.a.userId, f.campaign, first.id, { ...command(), expectedVersion: 2, reason, holderActorId: f.b.actorId })).rejects.toBeInstanceOf(Gone);
    const move = { ...command(), expectedVersion: 2, reason, holderActorId: f.b.actorId };
    const moved = await f.actors.transferItem(gm, f.campaign, first.id, move);
    expect(await f.actors.transferItem(gm, f.campaign, first.id, move)).toEqual(moved);
    await expect(f.actors.getItem(f.a.userId, f.campaign, first.id)).rejects.toBeInstanceOf(Gone);
    expect((await f.actors.listItems(f.b.userId, f.campaign, f.b.actorId)).map(i => i.id)).toEqual([first.id]);
    expect((await f.actors.listItems(f.a.userId, f.campaign, f.a.actorId)).map(i => i.id)).toEqual([second.id]);
  });

  it("rejects cross-campaign relations atomically and keeps request receipts and revisions immutable", async () => {
    const f = await fixture(), foreign = await fixture();
    const template = await f.actors.createItemTemplate(gm, f.campaign, { ...command(), definition: itemDefinition() });
    const before = (await db.query("SELECT 1 FROM actor_inventory_events WHERE campaign_id=$1", [f.campaign])).rowCount;
    await expect(f.actors.instantiateItem(gm, f.campaign, { ...command(), templateId: template.id, templateRevision: 1, holderActorId: foreign.a.actorId })).rejects.toBeInstanceOf(Gone);
    expect((await db.query("SELECT 1 FROM actor_inventory_events WHERE campaign_id=$1", [f.campaign])).rowCount).toBe(before);
    expect((await db.query("SELECT 1 FROM item_instances WHERE campaign_id=$1", [f.campaign])).rowCount).toBe(0);
    await expect(db.query("UPDATE item_template_revisions SET definition='{}' WHERE template_id=$1", [template.id])).rejects.toThrow(/append-only/);
    await expect(db.query("DELETE FROM actor_inventory_events WHERE campaign_id=$1", [f.campaign])).rejects.toThrow(/append-only/);
    const event = (await db.query<{ request: unknown; request_hash: string; result: unknown; after_state: unknown }>("SELECT request,request_hash,result,after_state FROM actor_inventory_events WHERE campaign_id=$1", [f.campaign])).rows[0]!;
    expect(event.request_hash).toBe(createHash("sha256").update(stableJson(event.request)).digest("hex"));
    expect(event.result).toEqual(event.after_state);
  });

  it("clears a removed membership's perspective and denies its retained historical grant", async () => {
    const f = await fixture(), viewer = await f.campaigns.requireMember(f.a.userId, f.campaign);
    await db.query("DELETE FROM campaign_memberships WHERE campaign_id=$1 AND user_id=$2", [f.campaign, f.a.userId]);
    expect((await db.query("SELECT 1 FROM reader_perspectives WHERE campaign_id=$1 AND user_id=$2", [f.campaign, f.a.userId])).rowCount).toBe(0);
    expect((await db.query("SELECT 1 FROM actor_controllers WHERE actor_id=$1", [f.a.actorId])).rowCount).toBe(1);
    await expect(authorizeActor(db, viewer, f.a.actorId)).rejects.toBeInstanceOf(Gone);
  });

  it("projects actor lore using the chosen reader knowledge without granting it through control", async () => {
    const f = await fixture(), docs = createDocuments(db);
    const entry = await docs.saveEntry(gm, f.campaign, { title: "Verborgene Herkunft", passages: [{ inhalt: { kind: "absatz", inhalt: [{ text: "Nicht durch Kontrolle offenlegen", marks: [] }] } }] });
    const before = await f.actors.getActor(f.a.userId, f.campaign, f.a.actorId);
    await f.actors.updateActor(gm, f.campaign, f.a.actorId, { ...command(), expectedVersion: 1, reason, name: before.name, kind: "player_character", loreEntryId: entry.entryId });
    const hidden = await f.actors.getActor(f.a.userId, f.campaign, f.a.actorId);
    expect(hidden).toEqual(before);
    expect(hidden.version).toBeNull();
    expect((await f.actors.listActors(f.a.userId, f.campaign))[0]?.loreEntryId).toBeNull();
    const pid = (await docs.source(f.campaign, entry.entryId)).passagen[0]!.pid;
    await docs.revealPassage(gm, f.campaign, pid, f.a.actorId);
    expect((await f.actors.getActor(f.a.userId, f.campaign, f.a.actorId)).loreEntryId).toBe(entry.entryId);
    await f.actors.setReaderPerspective(f.a.userId, f.campaign, { ...command(), expectedVersion: 1, actorId: null });
    expect((await f.actors.getActor(f.a.userId, f.campaign, f.a.actorId)).loreEntryId).toBeNull();
    expect((await f.actors.getActor(gm, f.campaign, f.a.actorId)).loreEntryId).toBe(entry.entryId);
  });

  it("reprojects hidden item lore on reads and retries while retaining canonical immutable receipts", async () => {
    const f = await fixture(), docs = createDocuments(db);
    const entry = await docs.saveEntry(gm, f.campaign, { title: "Geheimer Schlüssel", passages: [{ inhalt: { kind: "absatz", inhalt: [{ text: "Der Schlüssel öffnet die Gruft", marks: [] }] } }] });
    const template = await f.actors.createItemTemplate(gm, f.campaign, { ...command(), definition: { ...itemDefinition(), loreEntryId: entry.entryId } });
    const item = await f.actors.instantiateItem(gm, f.campaign, { ...command(), templateId: template.id, templateRevision: 1, holderActorId: f.a.actorId });
    const concealed = { ...item, definition: { ...item.definition, loreEntryId: null } };
    expect(await f.actors.getItem(f.a.userId, f.campaign, item.id)).toEqual(concealed);
    expect(await f.actors.listItems(f.a.userId, f.campaign, f.a.actorId)).toEqual([concealed]);
    const pid = (await docs.source(f.campaign, entry.entryId)).passagen[0]!.pid;
    await docs.revealPassage(gm, f.campaign, pid, f.a.actorId);
    const draft = { ...command(), expectedVersion: 1, reason, state: { quantity: 1, notes: "Trage ich", equipped: true } };
    const visible = await f.actors.updateItem(f.a.userId, f.campaign, item.id, draft);
    expect(visible.definition.loreEntryId).toBe(entry.entryId);
    await db.query("UPDATE revelations SET revoked_at=1 WHERE campaign_id=$1 AND actor_id=$2 AND passage_id=$3", [f.campaign, f.a.actorId, pid]);
    const retry = await f.actors.updateItem(f.a.userId, f.campaign, item.id, draft);
    expect(retry).toEqual({ ...visible, definition: { ...visible.definition, loreEntryId: null } });
    const receipt = (await db.query<{ after_state: unknown; result: typeof visible }>("SELECT after_state,result FROM actor_inventory_events WHERE actor_user_id=$1 AND command_id=$2", [f.a.userId, draft.commandId])).rows[0]!;
    expect(receipt.result).toEqual(receipt.after_state);
    expect(receipt.result.definition.loreEntryId).toBe(entry.entryId);
    expect((await db.query("SELECT 1 FROM actor_inventory_events WHERE actor_user_id=$1 AND command_id=$2", [f.a.userId, draft.commandId])).rowCount).toBe(1);
  });

  it("uses authenticated HTTP identity and rejects undeclared item effects", async () => {
    const f = await fixture(), identity = createIdentity(db, config);
    const gmCookie = (await identity.issueSession(gm)).setCookie, playerCookie = (await identity.issueSession(f.a.userId)).setCookie;
    const app = Fastify({ ajv: { customOptions: { removeAdditional: false, coerceTypes: false } } });
    app.setErrorHandler((error, _req, reply) => reply.code(error instanceof Gone ? 404 : error instanceof Conflict ? 409 : error instanceof ActorValidationError || (error as { validation?: unknown }).validation ? 400 : 500).send({ error: "unavailable" }));
    registerActors(app, db, config);
    try {
      const post = (body: unknown, cookie = gmCookie) => app.inject({ method: "POST", url: `/api/campaigns/${f.campaign}/item-templates`, headers: { cookie, "content-type": "application/json" }, payload: JSON.stringify(body) });
      expect((await post({ ...command(), definition: { ...itemDefinition(), effect: "actor.insight + 100" } })).statusCode).toBe(400);
      expect((await post({ ...command(), definition: itemDefinition() }, playerCookie)).statusCode).toBe(404);
      const created = await post({ ...command(), definition: itemDefinition() }); expect(created.statusCode).toBe(200);
      expect(created.json()).toMatchObject({ revision: 1, definition: itemDefinition() });
      expect((await app.inject({ method: "GET", url: `/api/campaigns/${f.campaign}/actors`, headers: { cookie: playerCookie } })).json().map((a: { id: string }) => a.id)).toEqual([f.a.actorId]);
    } finally { await app.close(); }
  });
});

it("migration 010 backfills only historical player authority without inventing creator provenance", async () => {
  const db = await createTestDb(), path = new URL("../src/db/migrations/", import.meta.url);
  try {
    for (const filename of (await readdir(path)).filter(name => /^00[1-9]_.*\.sql$/.test(name)).sort())
      for (const sql of (await readFile(new URL(filename, path), "utf8")).split(/^-- statement\s*$/m).map(s => s.trim()).filter(Boolean)) await db.query(sql);
    const gm = randomUUID(), user = randomUUID(), observer = randomUUID(), campaign = randomUUID(), universe = randomUUID();
    for (const id of [gm, user, observer]) await db.query("INSERT INTO users(id,display_name,created_at) VALUES($1,$1,1)", [id]);
    await db.query("INSERT INTO universes(id,owner_user_id,name) VALUES($1,$2,'Legacy')", [universe, gm]);
    await db.query("INSERT INTO campaigns(id,universe_id,owner_user_id,name,created_at) VALUES($1,$2,$3,'Legacy',1)", [campaign, universe, gm]);
    const primary = randomUUID(), extra = randomUUID(), watched = randomUUID();
    for (const [id, owner] of [[primary, user], [extra, user], [watched, observer]]) await db.query("INSERT INTO actors(id,campaign_id,user_id,name) VALUES($1,$2,$3,$1)", [id, campaign, owner]);
    for (const [id, role, actor] of [[gm, "leitung", null], [user, "spieler", primary], [observer, "beobachter", watched]])
      await db.query("INSERT INTO campaign_memberships(campaign_id,user_id,role,display_name,name_skeleton,actor_id) VALUES($1,$2,$3,$2,$2,$4)", [campaign, id, role, actor]);
    for (const sql of (await readFile(new URL("010_actor_instances.sql", path), "utf8")).split(/^-- statement\s*$/m).map(s => s.trim()).filter(Boolean)) await db.query(sql);
    expect((await db.query("SELECT actor_id,user_id,granted_by,granted_at,revoked_at,version FROM actor_controllers")).rows).toEqual([{ actor_id: primary, user_id: user, granted_by: null, granted_at: null, revoked_at: null, version: 1 }]);
    expect((await db.query("SELECT kind,created_by,created_at,template_id,template_revision,version FROM actor_profiles WHERE actor_id=$1", [extra])).rows[0]).toEqual({ kind: "unspecified", created_by: null, created_at: null, template_id: null, template_revision: null, version: 1 });
    expect((await db.query("SELECT actor_id FROM reader_perspectives WHERE user_id=$1", [observer])).rows[0]).toEqual({ actor_id: null });
    expect((await db.query("SELECT actor_id FROM reader_perspectives WHERE user_id=$1", [user])).rows[0]).toEqual({ actor_id: primary });
  } finally { await db.close(); }
}, 30_000);
