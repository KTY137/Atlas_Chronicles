// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDb, migrate, type Db } from "../src/db/index.ts";
import { createCampaigns } from "../src/domain/campaigns.ts";
import { createActors } from "../src/domain/actors.ts";
import { createDocuments } from "../src/domain/documents.ts";
import { createGameplay } from "../src/domain/gameplay.ts";
import { createWeek } from "../src/domain/week.ts";
import { createCommunication } from "../src/domain/communication.ts";
import { Gone } from "../src/domain/errors.ts";
import { DEMO_RULE_PACKAGE } from "@chronicle/rules";

describe("actor control remains distinct from the reader's knowledge perspective", () => {
  let db: Db;
  beforeAll(async () => { db = await createTestDb(); await migrate(db); }, 30_000);
  afterAll(async () => db?.close());
  async function fixture() {
    const gm = randomUUID(); await db.query("INSERT INTO users(id,display_name,platform_role,created_at) VALUES($1,'GM','leitung',1)", [gm]);
    const campaigns = createCampaigns(db), campaign = (await campaigns.createCampaign(gm, { name: "Gemeinsame Figuren" })).id;
    const invite = await campaigns.issueInvitation(gm, campaign), members = [];
    for (const displayName of ["Sera", "Dorn"]) {
      const request = await campaigns.requestJoin(invite.code, { displayName });
      members.push(await campaigns.approveJoin(gm, campaign, request.id));
    }
    const a = members[0]!, b = members[1]!, docs = createDocuments(db), actors = createActors(db), game = createGameplay(db), week = createWeek(db), live = createCommunication(db);
    const entry = await docs.saveEntry(gm, campaign, { title: "Zwei Wege", passages: ["Nur Sera kennt das Tor.", "Nur Dorn kennt den Keller."].map(text => ({ inhalt: { kind: "absatz" as const, inhalt: [{ text, marks: [] }] } })) });
    await docs.revealPassage(gm, campaign, entry.passagen[0]!.pid, a.actorId); await docs.revealPassage(gm, campaign, entry.passagen[1]!.pid, b.actorId);
    return { gm, campaign, campaigns, a, b, docs, actors, game, week, live, entry };
  }
  it("lets another controller act without merging knowledge and removes every future admission on revoke", async () => {
    const f = await fixture();
    const original = await f.docs.getEntry(f.b.userId, f.campaign, f.entry.entryId);
    await f.actors.grantController(f.gm, f.campaign, f.a.actorId, f.b.userId, { commandId: randomUUID(), expectedVersion: 0, reason: "Gemeinsam spielen" });
    await f.game.updateSheet(f.b.userId, f.campaign, { actorId: f.a.actorId, expectedVersion: 0, fields: { insight: 5 } });
    const roll = await f.game.prepareAction(f.b.userId, f.campaign, { commandId: randomUUID(), actorId: f.a.actorId, actionId: "investigate" });
    expect(await f.docs.getEntry(f.b.userId, f.campaign, f.entry.entryId)).toEqual(original);
    await f.actors.setReaderPerspective(f.b.userId, f.campaign, { commandId: randomUUID(), expectedVersion: 1, actorId: f.a.actorId });
    const projected = await f.docs.getEntry(f.b.userId, f.campaign, f.entry.entryId);
    expect(projected.passagen.map(p => p.pid)).toEqual([f.entry.passagen[0]!.pid]);
    await f.actors.revokeController(f.gm, f.campaign, f.a.actorId, f.b.userId, { commandId: randomUUID(), expectedVersion: 1, reason: "Vertretung beendet" });
    expect((await f.campaigns.requireMember(f.b.userId, f.campaign)).actorId).toBeNull();
    await expect(f.docs.getEntry(f.b.userId, f.campaign, f.entry.entryId)).rejects.toBeInstanceOf(Gone);
    await expect(f.game.getSheet(f.b.userId, f.campaign, f.a.actorId)).rejects.toBeInstanceOf(Gone);
    await expect(f.game.getRoll(f.b.userId, f.campaign, roll.id)).rejects.toBeInstanceOf(Gone);
    await expect(f.game.confirmAction(f.b.userId, f.campaign, roll.id)).rejects.toBeInstanceOf(Gone);
    await expect(f.actors.setReaderPerspective(f.b.userId, f.campaign, { commandId: randomUUID(), expectedVersion: 2, actorId: f.a.actorId })).rejects.toBeInstanceOf(Gone);
  });
  it("never turns implicit GM control into access to a player's private mail", async () => {
    const f = await fixture();
    const letter = await f.week.sendLetter(f.a.userId, f.campaign, { commandId: randomUUID(), toActorIds: [f.b.actorId], passageIds: [f.entry.passagen[0]!.pid], note: "Privater Brief" });
    await expect(f.actors.setReaderPerspective(f.gm, f.campaign, { commandId: randomUUID(), expectedVersion: 1, actorId: f.b.actorId })).rejects.toBeInstanceOf(Gone);
    await expect(f.week.getLetter(f.gm, f.campaign, letter.id)).rejects.toBeInstanceOf(Gone);
    await expect(f.week.sendLetter(f.gm, f.campaign, { commandId: randomUUID(), fromActorId: f.a.actorId, toActorIds: [f.b.actorId], passageIds: [f.entry.passagen[0]!.pid], note: "Impersonation" })).rejects.toBeInstanceOf(Gone);
    expect((await f.game.getSheet(f.gm, f.campaign, f.a.actorId)).actorId).toBe(f.a.actorId);
  });
  it("keeps historical rolls readable after archival and refuses new actions or pending confirmation", async () => {
    const f = await fixture();
    const pending = await f.game.prepareAction(f.a.userId, f.campaign, { commandId: randomUUID(), actorId: f.a.actorId, actionId: "investigate" });
    await f.actors.archiveActor(f.gm, f.campaign, f.a.actorId, { commandId: randomUUID(), expectedVersion: 1, reason: "Figur verlässt die Runde" });
    expect((await f.game.getRoll(f.a.userId, f.campaign, pending.id)).id).toBe(pending.id);
    expect((await f.game.replayRoll(f.a.userId, f.campaign, pending.id)).valid).toBe(true);
    await expect(f.game.confirmAction(f.a.userId, f.campaign, pending.id)).rejects.toBeInstanceOf(Gone);
    await expect(f.game.prepareAction(f.a.userId, f.campaign, { commandId: randomUUID(), actorId: f.a.actorId, actionId: "investigate" })).rejects.toBeInstanceOf(Gone);
  });
  it("does not advance another reader's live sequence for an undisclosed NPC or inventory", async () => {
    const f = await fixture(), before = await f.live.sync(f.b.userId, f.campaign);
    const template = await f.actors.createActorTemplate(f.gm, f.campaign, { commandId: randomUUID(), definition: { schemaVersion: 1, name: "Geheime Begleitung", kind: "companion", loreEntryId: null, package: { id: DEMO_RULE_PACKAGE.id, version: DEMO_RULE_PACKAGE.version }, fields: {} } });
    const actor = await f.actors.instantiateActor(f.gm, f.campaign, { commandId: randomUUID(), templateId: template.id, templateRevision: template.revision });
    const itemTemplate = await f.actors.createItemTemplate(f.gm, f.campaign, { commandId: randomUUID(), definition: { schemaVersion: 1, name: "Geheimer Schlüssel", loreEntryId: null, tags: [] } });
    await f.actors.instantiateItem(f.gm, f.campaign, { commandId: randomUUID(), templateId: itemTemplate.id, templateRevision: itemTemplate.revision, holderActorId: actor.id });
    // Installing the built-in package changes no projected package bytes.
    expect(await f.live.sync(f.b.userId, f.campaign)).toBe(before);
    await f.actors.grantController(f.gm, f.campaign, actor.id, f.a.userId, { commandId: randomUUID(), expectedVersion: 0, reason: "Gemeinsame Begleitung" });
    expect(await f.live.sync(f.b.userId, f.campaign)).toBe(before);
    expect((await f.actors.listActors(f.b.userId, f.campaign)).map(a => a.id)).not.toContain(actor.id);
  });
});
