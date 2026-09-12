// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DEMO_RULE_PACKAGE } from "@chronicle/rules";
import { createTestDb, migrate, type Db } from "../src/db/index.ts";
import { createIdentity } from "../src/identity/index.ts";
import { createCampaigns } from "../src/domain/campaigns.ts";
import { createActors } from "../src/domain/actors.ts";
import { createActorDeletion } from "../src/domain/actor-deletion.ts";
import { createGameplay } from "../src/domain/gameplay.ts";
import { exportCampaignBundle } from "../src/domain/bundles.ts";
import { Conflict, Gone } from "../src/domain/errors.ts";

const config = { origin: "https://actor-delete.test", cookieSecret: "actor-delete-test-cookie-secret-with-more-than-32-characters" };
const command = () => ({ commandId: randomUUID() });
const reason = "Versehentlich doppelt angelegt";
const actorDefinition = (name = "Torwache") => ({ schemaVersion: 1, name, kind: "npc" as const, loreEntryId: null,
  package: { id: DEMO_RULE_PACKAGE.id, version: DEMO_RULE_PACKAGE.version }, fields: { insight: 2 } });
const itemDefinition = () => ({ schemaVersion: 1, name: "Messingschlüssel", loreEntryId: null, tags: ["Werkzeug"] });

describe("endgültiges Löschen von Figuren und Figurvorlagen", () => {
  let db: Db, gm: string;
  beforeAll(async () => { db = await createTestDb(); await migrate(db); gm = (await createIdentity(db, config).bootstrap("Kaya")).userId; }, 30_000);
  afterAll(async () => db?.close());

  async function fixture() {
    const campaign = (await createCampaigns(db).createCampaign(gm, { name: "Löschtest" })).id;
    return { campaign, actors: createActors(db), deletion: createActorDeletion(db), game: createGameplay(db) };
  }
  async function npc(f: Awaited<ReturnType<typeof fixture>>, name = "Torwache") {
    const template = await f.actors.createActorTemplate(gm, f.campaign, { ...command(), definition: actorDefinition(name) });
    const actor = await f.actors.instantiateActor(gm, f.campaign, { ...command(), templateId: template.id, templateRevision: template.revision });
    return { template, actor };
  }

  it("löscht eine unbenutzte Figur samt Bogen und eigener Erzeugungshistorie atomar", async () => {
    const f = await fixture(), { actor } = await npc(f);
    expect((await db.query("SELECT 1 FROM actor_sheets WHERE actor_id=$1", [actor.id])).rowCount).toBe(1);
    expect((await db.query("SELECT 1 FROM actor_inventory_events WHERE subject_id=$1", [actor.id])).rowCount).toBe(1);

    const deleted = await f.deletion.deleteActor(gm, f.campaign, actor.id, { ...command(), expectedVersion: 1, reason });
    expect(deleted).toMatchObject({ id: actor.id, name: actor.name });
    await expect(f.actors.getActor(gm, f.campaign, actor.id)).rejects.toBeInstanceOf(Gone);
    await expect(f.game.getSheet(gm, f.campaign, actor.id)).rejects.toBeInstanceOf(Gone);
    expect((await db.query("SELECT 1 FROM actor_inventory_events WHERE subject_id=$1", [actor.id])).rowCount).toBe(0);
    await expect(exportCampaignBundle(db, gm, f.campaign)).resolves.toBeDefined();
  });

  it("blockiert Figuren, auf die Inventarhistorie zeigt, ohne Teil-Löschung", async () => {
    const f = await fixture(), { actor } = await npc(f);
    const itemTemplate = await f.actors.createItemTemplate(gm, f.campaign, { ...command(), definition: itemDefinition() });
    await f.actors.instantiateItem(gm, f.campaign, { ...command(), templateId: itemTemplate.id, templateRevision: 1, holderActorId: actor.id });

    await expect(f.deletion.deleteActor(gm, f.campaign, actor.id, { ...command(), expectedVersion: 1, reason })).rejects.toThrow(/Historie|Inventar/);
    await expect(f.actors.getActor(gm, f.campaign, actor.id)).resolves.toMatchObject({ id: actor.id });
    expect((await db.query("SELECT 1 FROM actor_sheets WHERE actor_id=$1", [actor.id])).rowCount).toBe(1);
  });

  it("löscht eine unbenutzte Vorlage samt Revisionen, schützt aber eine bereits verwendete", async () => {
    const f = await fixture();
    const unused = await f.actors.createActorTemplate(gm, f.campaign, { ...command(), definition: actorDefinition("Entwurf") });
    await f.deletion.deleteActorTemplate(gm, f.campaign, unused.id, { ...command(), expectedVersion: unused.version, reason });
    await expect(f.actors.getActorTemplate(gm, f.campaign, unused.id)).rejects.toBeInstanceOf(Gone);
    expect((await db.query("SELECT 1 FROM actor_template_revisions WHERE template_id=$1", [unused.id])).rowCount).toBe(0);
    expect((await db.query("SELECT 1 FROM actor_inventory_events WHERE subject_id=$1", [unused.id])).rowCount).toBe(0);

    const { template: used } = await npc(f, "Benutzt");
    await expect(f.deletion.deleteActorTemplate(gm, f.campaign, used.id, { ...command(), expectedVersion: used.version, reason })).rejects.toThrow(/benutzt|Historie/);
    await expect(f.actors.getActorTemplate(gm, f.campaign, used.id)).resolves.toMatchObject({ id: used.id });
    await expect(exportCampaignBundle(db, gm, f.campaign)).resolves.toBeDefined();
  });

  it("lässt rohe History-Deletes weiterhin nicht zu", async () => {
    const f = await fixture(), { actor } = await npc(f);
    await expect(db.query("DELETE FROM actor_inventory_events WHERE campaign_id=$1 AND subject_id=$2", [f.campaign, actor.id])).rejects.toThrow(/append-only/);
  });

  it("schützt eigene und fremde Figuren vor Spieler-Löschung und weist fremde Kampagnen und alte Versionen zurück", async () => {
    const f = await fixture(), campaigns = createCampaigns(db), invitation = await campaigns.issueInvitation(gm, f.campaign);
    const owner = await campaigns.approveJoin(gm, f.campaign, (await campaigns.requestJoin(invitation.code, { displayName: "Sera" })).id);
    const { actor, template } = await npc(f);
    for (const actorId of [owner.actorId, actor.id])
      await expect(f.deletion.deleteActor(owner.userId, f.campaign, actorId, { ...command(), expectedVersion: 1, reason })).rejects.toBeInstanceOf(Gone);
    await expect(f.deletion.deleteActorTemplate(owner.userId, f.campaign, template.id, { ...command(), expectedVersion: 1, reason })).rejects.toBeInstanceOf(Gone);
    const other = (await campaigns.createCampaign(gm, { name: "Andere Welt" })).id;
    await expect(f.deletion.deleteActor(gm, other, actor.id, { ...command(), expectedVersion: 1, reason })).rejects.toBeInstanceOf(Gone);
    await expect(f.deletion.deleteActor(gm, f.campaign, actor.id, { ...command(), expectedVersion: 2, reason })).rejects.toBeInstanceOf(Conflict);
    await expect(f.actors.getActor(gm, f.campaign, actor.id)).resolves.toMatchObject({ id: actor.id, version: 1 });
  });

  it("löst beim unbenutzten Spielercharakter nur Kontroll- und Primärfigurenverweise und erhält die Mitgliedschaft", async () => {
    const f = await fixture(), campaigns = createCampaigns(db), invitation = await campaigns.issueInvitation(gm, f.campaign);
    const owner = await campaigns.approveJoin(gm, f.campaign, (await campaigns.requestJoin(invitation.code, { displayName: "Liva" })).id);
    const perspective = await f.actors.getReaderPerspective(owner.userId, f.campaign);
    await f.deletion.deleteActor(gm, f.campaign, owner.actorId, { ...command(), expectedVersion: 1, reason });
    expect((await db.query("SELECT actor_id FROM campaign_memberships WHERE campaign_id=$1 AND user_id=$2", [f.campaign, owner.userId])).rows).toEqual([{ actor_id: null }]);
    expect((await db.query("SELECT actor_id,version FROM reader_perspectives WHERE campaign_id=$1 AND user_id=$2", [f.campaign, owner.userId])).rows).toEqual([{ actor_id: null, version: perspective.version + 1 }]);
    expect((await db.query("SELECT 1 FROM actor_controllers WHERE actor_id=$1", [owner.actorId])).rowCount).toBe(0);
    expect((await f.actors.listActors(owner.userId, f.campaign))).toEqual([]);
    await expect(exportCampaignBundle(db, gm, f.campaign)).resolves.toBeDefined();
  });
});
