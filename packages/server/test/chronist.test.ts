import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDb, migrate, type Db } from "../src/db/index.ts";
import { createCampaigns } from "../src/domain/campaigns.ts";
import { createDocuments, type PassageInput } from "../src/domain/documents.ts";
import { createChronist } from "../src/domain/chronist.ts";
import { createIdentity } from "../src/identity/index.ts";
import { seedActorControl } from "./actor-fixtures.ts";

/**
 * Der Chronist schlaegt Aenderungen vor — und die eine Frage, die ueber allem steht, ist nicht
 * „findet er den Widerspruch?", sondern **„zeigt er ihn dem Richtigen?"**. Er leitet keine
 * Sichtbarkeit her: er liest die Zeitleiste, und die filtert bereits durch dieselbe
 * Wissensgrenze wie der Artikel. Dieser Test haelt genau das fest.
 */
const config = { origin: "https://chronist.test", cookieSecret: "chronist-cookie-secret-with-more-than-32-characters" };
const datum = (schluessel: string, label: string, wert: string): PassageInput => ({
  inhalt: { kind: "feld", schluessel, label, werte: [[{ text: wert, marks: [] }]], mehrwertig: false, klauselKandidat: false },
});

describe("Der Chronist", () => {
  let db: Db, gm: string;
  beforeAll(async () => { db = await createTestDb(); await migrate(db); gm = (await createIdentity(db, config).bootstrap("Kaya")).userId; }, 30_000);
  afterAll(async () => db?.close());

  async function fixture() {
    const campaign = (await createCampaigns(db).createCampaign(gm, { name: "Die Chronik" })).id;
    const spieler = randomUUID(), actorId = randomUUID();
    await db.query("INSERT INTO users(id,display_name,created_at) VALUES($1,'Sera',$2)", [spieler, Date.now()]);
    await db.query("INSERT INTO actors(id,campaign_id,user_id,name) VALUES($1,$2,$3,'Sera')", [actorId, campaign, spieler]);
    await db.query("INSERT INTO campaign_memberships(campaign_id,user_id,role,display_name,name_skeleton,actor_id) VALUES($1,$2,'spieler','Sera','sera',$3)", [campaign, spieler, actorId]);
    await seedActorControl(db, campaign, actorId, spieler);
    return { campaign, spieler, actorId, docs: createDocuments(db), chronist: createChronist(db) };
  }

  it("findet den Widerspruch und nennt den Artikel, in dem er steckt", async () => {
    const f = await fixture();
    await f.docs.saveEntry(gm, f.campaign, { title: "Mara von Eron", passages: [
      datum("geburt", "Geburt", "812"), datum("tod", "Tod", "799"),
    ] });
    const befunde = await f.chronist.vorschlaege(gm, f.campaign);
    expect(befunde).toHaveLength(1);
    expect(befunde[0]).toMatchObject({ art: "tod_vor_geburt", titel: "Mara von Eron" });
    expect(befunde[0]!.passagen).toHaveLength(2);
  });

  it("zeigt keinen Widerspruch, dessen zweite Hälfte die Leserin nicht kennt", async () => {
    // Das ist der Kern. Wer nur die Geburt kennt, hat keinen Widerspruch vor sich — und darf
    // auch keinen gemeldet bekommen, denn die Meldung wuerde das Todesjahr verraten.
    const f = await fixture();
    const eintrag = await f.docs.saveEntry(gm, f.campaign, { title: "Der Wehrmeister", passages: [
      datum("geburt", "Geburt", "812"), datum("tod", "Tod", "799"),
    ] });
    await f.docs.revealPassage(gm, f.campaign, eintrag.passagen[0]!.pid, f.actorId);

    expect((await f.chronist.vorschlaege(gm, f.campaign)).map(b => b.art)).toEqual(["tod_vor_geburt"]);
    expect(await f.chronist.vorschlaege(f.spieler, f.campaign)).toEqual([]);

    // Erst wenn sie auch die zweite Haelfte haelt, sieht sie den Widerspruch.
    await f.docs.revealPassage(gm, f.campaign, eintrag.passagen[1]!.pid, f.actorId);
    expect((await f.chronist.vorschlaege(f.spieler, f.campaign)).map(b => b.art)).toEqual(["tod_vor_geburt"]);
  });

  it("meldet ein Datumsfeld ohne lesbares Jahr samt seinem Rohtext", async () => {
    const f = await fixture();
    await f.docs.saveEntry(gm, f.campaign, { title: "Der Fall von Mowach", passages: [
      datum("datum", "Datum", "im Winter nach dem Fall"),
    ] });
    const befunde = await f.chronist.vorschlaege(gm, f.campaign);
    expect(befunde).toHaveLength(1);
    expect(befunde[0]).toMatchObject({ art: "unlesbares_datum" });
    expect(befunde[0]!.text).toContain("im Winter nach dem Fall");
  });

  it("schweigt über eine widerspruchsfreie Chronik", async () => {
    const f = await fixture();
    await f.docs.saveEntry(gm, f.campaign, { title: "Sera", passages: [
      datum("geburt", "Geburt", "780"), datum("tod", "Tod", "831"),
    ] });
    expect(await f.chronist.vorschlaege(gm, f.campaign)).toEqual([]);
  });
});
