// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DEMO_RULE_PACKAGE } from "@chronicle/rules";
import { createTestDb, migrate, type Db } from "../src/db/index.ts";
import { createCampaigns } from "../src/domain/campaigns.ts";
import { createIdentity } from "../src/identity/index.ts";
import { createActors } from "../src/domain/actors.ts";
import { Gone } from "../src/domain/errors.ts";

/**
 * Containerinventare — der Kutschloot.
 *
 * Der Befund, der diesem Test vorausging: das Schema braucht **keine neue Sache** dafür. Eine
 * Kutsche ist eine Figur der Art `vehicle`, und `holder_actor_id` trägt sie wie jede andere.
 * Eine eigene Behältertabelle wäre eine Doppelung — und die Figurenarten stehen ohnehin im
 * eingefrorenen Exportprofil, eine neue Art bräche jeden Export.
 *
 * Was dieser Test festhält, ist deshalb nicht ein neues Modell, sondern die Frage, ob der Weg
 * wirklich trägt: liegt Loot im Behälter, sieht ihn nur wer darf, und kommt er wieder heraus?
 */
const config = { origin: "https://container.test", cookieSecret: "container-cookie-secret-with-more-than-32-characters" };
const befehl = () => ({ commandId: randomUUID() });
const grund = "Ausdrückliche Prüfänderung";
const kutsche = { schemaVersion: 1 as const, name: "Handelskutsche", kind: "vehicle" as const, loreEntryId: null,
  package: { id: DEMO_RULE_PACKAGE.id, version: DEMO_RULE_PACKAGE.version }, fields: {} };
const beute = { schemaVersion: 2 as const, name: "Ballen Seide", loreEntryId: null, tags: ["handel"],
  seltenheit: "ungewoehnlich" as const, kategorie: "Ware", bildAssetId: null,
  spruch: "Weich, teuer, und im Regen wertlos.", zeilen: [{ label: "Wert", wert: "120 Silber" }] };

describe("Containerinventare", () => {
  let db: Db, gm: string;
  beforeAll(async () => { db = await createTestDb(); await migrate(db); gm = (await createIdentity(db, config).bootstrap("Kaya")).userId; }, 30_000);
  afterAll(async () => db?.close());

  async function fixture() {
    const campaign = (await createCampaigns(db).createCampaign(gm, { name: "Die Straße" })).id;
    const spieler = randomUUID(), heldId = randomUUID();
    await db.query("INSERT INTO users(id,display_name,created_at) VALUES($1,'Sera',$2)", [spieler, Date.now()]);
    await db.query("INSERT INTO actors(id,campaign_id,user_id,name) VALUES($1,$2,$3,'Sera')", [heldId, campaign, spieler]);
    await db.query("INSERT INTO campaign_memberships(campaign_id,user_id,role,display_name,name_skeleton,actor_id) VALUES($1,$2,'spieler','Sera','sera',$3)", [campaign, spieler, heldId]);
    await db.query("INSERT INTO actor_profiles(actor_id,campaign_id,kind,created_by,created_at) VALUES($1,$2,'player_character',$3,$4)", [heldId, campaign, gm, Date.now()]);
    await db.query("INSERT INTO actor_controllers(actor_id,campaign_id,user_id,granted_by,granted_at) VALUES($1,$2,$3,$4,$5)", [heldId, campaign, spieler, gm, Date.now()]);
    await db.query("INSERT INTO reader_perspectives(campaign_id,user_id,actor_id) VALUES($1,$2,$3)", [campaign, spieler, heldId]);
    const actors = createActors(db);
    // Der Behälter: eine Figur der Art `vehicle`, die niemand führt.
    const vorlage = await actors.createActorTemplate(gm, campaign, { ...befehl(), definition: kutsche });
    const behaelter = await actors.instantiateActor(gm, campaign, { ...befehl(), templateId: vorlage.id, templateRevision: 1 });
    return { campaign, spieler, heldId, behaelterId: behaelter.id, actors };
  }

  it("trägt Loot, den nur die Spielleitung sieht, solange niemand die Kutsche führt", async () => {
    const f = await fixture();
    expect((await f.actors.getActor(gm, f.campaign, f.behaelterId)).kind).toBe("vehicle");
    const vorlage = await f.actors.createItemTemplate(gm, f.campaign, { ...befehl(), definition: beute });
    const ballen = await f.actors.instantiateItem(gm, f.campaign, { ...befehl(), templateId: vorlage.id, templateRevision: 1, holderActorId: f.behaelterId });
    expect(ballen.holderActorId).toBe(f.behaelterId);

    expect((await f.actors.listItems(gm, f.campaign, f.behaelterId)).map(i => i.id)).toEqual([ballen.id]);
    // Wer die Kutsche nicht führt, sieht auch nicht hinein — die Beute ist noch nicht gefunden.
    await expect(f.actors.listItems(f.spieler, f.campaign, f.behaelterId)).rejects.toBeInstanceOf(Gone);
    await expect(f.actors.getItem(f.spieler, f.campaign, ballen.id)).rejects.toBeInstanceOf(Gone);
  });

  it("öffnet sich, sobald die Spielleitung die Kutsche der Runde überlässt", async () => {
    const f = await fixture();
    const vorlage = await f.actors.createItemTemplate(gm, f.campaign, { ...befehl(), definition: beute });
    const ballen = await f.actors.instantiateItem(gm, f.campaign, { ...befehl(), templateId: vorlage.id, templateRevision: 1, holderActorId: f.behaelterId });

    // Die Kutsche wird gefunden: die Spielleitung gibt sie frei.
    await f.actors.grantController(gm, f.campaign, f.behaelterId, f.spieler, { ...befehl(), expectedVersion: 0, reason: grund });
    expect((await f.actors.listItems(f.spieler, f.campaign, f.behaelterId)).map(i => i.id)).toEqual([ballen.id]);
    // Und die Runde kann darin wirtschaften — die Menge ist Sache derer, die den Behälter führen.
    const geteilt = await f.actors.updateItem(f.spieler, f.campaign, ballen.id, { ...befehl(), expectedVersion: ballen.version, reason: grund, state: { quantity: 3, notes: "Aufgeteilt", equipped: false } });
    expect(geteilt.state.quantity).toBe(3);
  });

  it("gibt den Loot wieder heraus — und der Behälter ist danach leer", async () => {
    const f = await fixture();
    const vorlage = await f.actors.createItemTemplate(gm, f.campaign, { ...befehl(), definition: beute });
    const ballen = await f.actors.instantiateItem(gm, f.campaign, { ...befehl(), templateId: vorlage.id, templateRevision: 1, holderActorId: f.behaelterId });

    const genommen = await f.actors.transferItem(gm, f.campaign, ballen.id, { ...befehl(), expectedVersion: ballen.version, reason: grund, holderActorId: f.heldId });
    expect(genommen.holderActorId).toBe(f.heldId);
    expect(await f.actors.listItems(gm, f.campaign, f.behaelterId)).toEqual([]);
    expect((await f.actors.listItems(f.spieler, f.campaign, f.heldId)).map(i => i.id)).toEqual([ballen.id]);
    // Und die Karte behält ihr Gesicht auf dem Weg aus der Kutsche in die Hand.
    expect((await f.actors.getItem(f.spieler, f.campaign, ballen.id)).definition).toMatchObject({ schemaVersion: 2, seltenheit: "ungewoehnlich" });
  });

  it("hält mehrere Behälter auseinander", async () => {
    // „Verschiedene Inventare" heisst: jeder Behälter hat seinen eigenen, und sie vermischen sich nicht.
    const f = await fixture();
    const zweite = await f.actors.instantiateActor(gm, f.campaign, { ...befehl(),
      templateId: (await f.actors.createActorTemplate(gm, f.campaign, { ...befehl(), definition: { ...kutsche, name: "Planwagen" } })).id, templateRevision: 1 });
    const vorlage = await f.actors.createItemTemplate(gm, f.campaign, { ...befehl(), definition: beute });
    const hier = await f.actors.instantiateItem(gm, f.campaign, { ...befehl(), templateId: vorlage.id, templateRevision: 1, holderActorId: f.behaelterId });
    const dort = await f.actors.instantiateItem(gm, f.campaign, { ...befehl(), templateId: vorlage.id, templateRevision: 1, holderActorId: zweite.id });

    expect((await f.actors.listItems(gm, f.campaign, f.behaelterId)).map(i => i.id)).toEqual([hier.id]);
    expect((await f.actors.listItems(gm, f.campaign, zweite.id)).map(i => i.id)).toEqual([dort.id]);
    // Und der Vorrat der Spielleitung ist keiner von beiden: dort liegt nichts.
    expect((await f.actors.listItems(gm, f.campaign)).filter(i => i.holderActorId === null)).toEqual([]);
  });
});
