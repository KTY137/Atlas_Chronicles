// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDb, migrate, type Db } from "../src/db/index.ts";
import { createCampaigns } from "../src/domain/campaigns.ts";
import { createIdentity } from "../src/identity/index.ts";
import { createActors } from "../src/domain/actors.ts";
import { Gone } from "../src/domain/errors.ts";

// Das Admininventar ist die Werkbank der Spielleitung: sie entwirft Lootkarten, legt sie in
// ihren eigenen Vorrat und gibt sie aus. Zwei Aussagen tragen das Ganze — nur sie darf
// Gegenstände in die Welt setzen, und der Vorrat gehört ihr allein. Beide standen bisher nur
// im Code.
const config = { origin: "https://admininventar.test", cookieSecret: "admininventar-cookie-secret-with-more-than-32-characters" };
const befehl = () => ({ commandId: randomUUID() });
const grund = "Ausdrückliche Prüfänderung";
/** Eine echte Lootkarte, Fassung 2 — dieselbe, die die Spielleitung in der Werkstatt baut. */
const lootkarte = (name = "Laterne des Kartografen") => ({
  schemaVersion: 2 as const, name, loreEntryId: null, tags: ["licht"],
  seltenheit: "selten" as const, kategorie: "Werkzeug", bildAssetId: null,
  spruch: "Sie brennt auch dort, wo es nichts zu sehen gibt.",
  zeilen: [{ label: "Gewicht", wert: "1 Pfund" }],
});

describe("Das Admininventar", () => {
  let db: Db, gm: string;
  beforeAll(async () => { db = await createTestDb(); await migrate(db); gm = (await createIdentity(db, config).bootstrap("Kaya")).userId; }, 30_000);
  afterAll(async () => db?.close());

  async function fixture() {
    const campaign = (await createCampaigns(db).createCampaign(gm, { name: "Vorrat" })).id;
    const userId = randomUUID(), actorId = randomUUID();
    await db.query("INSERT INTO users(id,display_name,created_at) VALUES($1,'Sera',$2)", [userId, Date.now()]);
    await db.query("INSERT INTO actors(id,campaign_id,user_id,name) VALUES($1,$2,$3,'Sera')", [actorId, campaign, userId]);
    await db.query("INSERT INTO campaign_memberships(campaign_id,user_id,role,display_name,name_skeleton,actor_id) VALUES($1,$2,'spieler','Sera','sera',$3)", [campaign, userId, actorId]);
    await db.query("INSERT INTO actor_profiles(actor_id,campaign_id,kind,created_by,created_at) VALUES($1,$2,'player_character',$3,$4)", [actorId, campaign, gm, Date.now()]);
    await db.query("INSERT INTO actor_controllers(actor_id,campaign_id,user_id,granted_by,granted_at) VALUES($1,$2,$3,$4,$5)", [actorId, campaign, userId, gm, Date.now()]);
    await db.query("INSERT INTO reader_perspectives(campaign_id,user_id,actor_id) VALUES($1,$2,$3)", [campaign, userId, actorId]);
    return { campaign, spieler: userId, actorId, actors: createActors(db) };
  }

  it("entwirft eine Lootkarte, legt sie in den Vorrat und gibt sie aus", async () => {
    const f = await fixture();
    const vorlage = await f.actors.createItemTemplate(gm, f.campaign, { ...befehl(), definition: lootkarte() });
    expect(vorlage.definition).toMatchObject({ schemaVersion: 2, seltenheit: "selten", kategorie: "Werkzeug" });

    // In den Vorrat heisst: ohne Traeger. Das IST das Admininventar — keine zweite Tabelle.
    const stueck = await f.actors.instantiateItem(gm, f.campaign, { ...befehl(), templateId: vorlage.id, templateRevision: 1, holderActorId: null });
    expect(stueck.holderActorId).toBeNull();
    expect((await f.actors.listItems(gm, f.campaign)).map(i => i.id)).toContain(stueck.id);

    // Und dann wandert sie an den Tisch.
    const gegeben = await f.actors.transferItem(gm, f.campaign, stueck.id, { ...befehl(), expectedVersion: stueck.version, reason: grund, holderActorId: f.actorId });
    expect(gegeben.holderActorId).toBe(f.actorId);
    // Danach liegt sie bei der Figur — und nicht mehr im Vorrat.
    expect((await f.actors.listItems(f.spieler, f.campaign, f.actorId)).map(i => i.id)).toEqual([stueck.id]);
    expect((await f.actors.listItems(gm, f.campaign, undefined)).filter(i => i.holderActorId === null)).toEqual([]);
    // Die Karte behaelt ihr Gesicht auf dem Weg: die Spielerin sieht dieselbe Lootkarte.
    expect((await f.actors.getItem(f.spieler, f.campaign, stueck.id)).definition).toMatchObject({ schemaVersion: 2, seltenheit: "selten" });
  });

  it("haelt den Vorrat für die Spielleitung allein", async () => {
    const f = await fixture();
    const vorlage = await f.actors.createItemTemplate(gm, f.campaign, { ...befehl(), definition: lootkarte("Siegelring") });
    const stueck = await f.actors.instantiateItem(gm, f.campaign, { ...befehl(), templateId: vorlage.id, templateRevision: 1, holderActorId: null });
    // Ein Vorrat, den die Runde einsehen kann, ist keine Vorbereitung mehr, sondern eine Ansage.
    await expect(f.actors.listItems(f.spieler, f.campaign)).rejects.toBeInstanceOf(Gone);
    await expect(f.actors.getItem(f.spieler, f.campaign, stueck.id)).rejects.toBeInstanceOf(Gone);
    // Auch das eigene Inventar zeigt ihn nicht: er liegt nicht dort.
    expect(await f.actors.listItems(f.spieler, f.campaign, f.actorId)).toEqual([]);
  });

  it("laesst nur die Spielleitung Gegenstaende in die Welt setzen", async () => {
    const f = await fixture();
    const vorlage = await f.actors.createItemTemplate(gm, f.campaign, { ...befehl(), definition: lootkarte("Dietrich") });
    // Nicht einmal in das eigene Inventar: wer sich selbst Loot geben kann, braucht keine Truhe.
    for (const traeger of [null, f.actorId])
      await expect(f.actors.instantiateItem(f.spieler, f.campaign, { ...befehl(), templateId: vorlage.id, templateRevision: 1, holderActorId: traeger }))
        .rejects.toBeInstanceOf(Gone);
    expect(await f.actors.listItems(gm, f.campaign)).toEqual([]);
  });

  it("laesst nur die Spielleitung Lootkarten entwerfen und überarbeiten", async () => {
    const f = await fixture();
    await expect(f.actors.createItemTemplate(f.spieler, f.campaign, { ...befehl(), definition: lootkarte("Fälschung") })).rejects.toBeInstanceOf(Gone);
    const vorlage = await f.actors.createItemTemplate(gm, f.campaign, { ...befehl(), definition: lootkarte("Echt") });
    await expect(f.actors.reviseItemTemplate(f.spieler, f.campaign, vorlage.id, { ...befehl(), expectedVersion: 1, reason: grund, definition: lootkarte("Umgeschrieben") })).rejects.toBeInstanceOf(Gone);
    await expect(f.actors.archiveItemTemplate(f.spieler, f.campaign, vorlage.id, { ...befehl(), expectedVersion: 1, reason: grund })).rejects.toBeInstanceOf(Gone);
    // Und die Vorlage steht danach unveraendert da.
    expect((await f.actors.getItemTemplate(gm, f.campaign, vorlage.id)).definition.name).toBe("Echt");
  });
});
