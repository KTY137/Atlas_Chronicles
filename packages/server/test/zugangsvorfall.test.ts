import { randomBytes, randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDb, migrate, type Db } from "../src/db/index.ts";
import { createCampaigns } from "../src/domain/campaigns.ts";
import { createDocuments } from "../src/domain/documents.ts";
import { createIdentity } from "../src/identity/index.ts";
import { Gone } from "../src/domain/errors.ts";

/**
 * Der Zugangsvorfall — `CHAMPION.md:372-376`: „the server logs an event whenever a device
 * presents no/expired credential against a character holding an open Vollmacht."
 *
 * Bis Migration 018 stand er nur im Schema und in der Doku. Der Grund war nicht Nachlässigkeit,
 * sondern ein toter Fremdschlüssel: `access_incidents` zeigt auf `vollmachten`, und dorthin
 * schreibt der Produktionscode nie — echte Türen sind `action_vollmachten`.
 */
describe("Zugangsvorfall — Aussperrung wird belegt, bevor die 404 fällt", () => {
  let db: Db;
  let clock = Date.UTC(2026, 8, 7, 12);
  const cfg = { origin: "http://localhost:3000", cookieSecret: randomBytes(32).toString("hex"), now: () => clock };
  beforeAll(async () => { db = await createTestDb(); await migrate(db); }, 30_000);
  afterAll(async () => { await db?.close(); });

  /** Eine Kampagne, ein Spieler mit Figur, und eine offene Aktions-Vollmacht auf seinen Namen. */
  async function tischMitOffenerTuer() {
    const gm = randomUUID(), spieler = randomUUID(), actor = randomUUID();
    for (const [id, role] of [[gm, "leitung"], [spieler, "gast"]]) {
      await db.query("INSERT INTO users(id,display_name,platform_role,created_at) VALUES($1,$2,$3,$4)", [id, id, role, clock]);
    }
    const campaign = await createCampaigns(db, { now: () => clock }).createCampaign(gm, { name: "Aussperrung" });
    await db.query("INSERT INTO actors(id,campaign_id,user_id,name) VALUES($1,$2,$3,$4)", [actor, campaign.id, spieler, "Sera"]);
    await db.query("INSERT INTO campaign_memberships(campaign_id,user_id,role,display_name,name_skeleton,actor_id) VALUES($1,$2,'spieler',$3,$3,$4)", [campaign.id, spieler, "Sera", actor]);
    // Die Tür zeigt auf eine echte Passage — action_vollmachten hat darauf einen Fremdschlüssel.
    const eintrag = await createDocuments(db, { now: () => clock }).saveEntry(gm, campaign.id, {
      title: "Haus Vharon", passages: [{ inhalt: { kind: "absatz", inhalt: [{ text: "Der versiegelte Keller", marks: [] }] }, tags: ["spuren"] }],
    });
    // action_vollmachten zeigt auch auf ein installiertes Regelpaket.
    await db.query(`INSERT INTO rule_packages(campaign_id,package_id,version,document,content_hash,installed_by,installed_at)
      VALUES($1,'demo','1.0.0','{}',$2,$3,$4)`, [campaign.id, "b".repeat(64), gm, clock]);
    const tuer = randomUUID();
    await db.query(`INSERT INTO action_vollmachten(id,campaign_id,actor_id,passage_id,passage_hash,package_id,package_version,
      action_id,threshold,fixed_input,fiction_date,issued_by,issued_at,expires_at,repeatable,budget_kind,command_id,request_hash)
      VALUES($1,$2,$3,$4,$5,'demo','1.0.0','oeffne',10,'{}','1. Regen',$6,$7,$8,false,'player',$9,$5)`,
      [tuer, campaign.id, actor, eintrag.passagen[0]!.pid, "a".repeat(64), gm, clock, clock + 7 * 86400_000, randomUUID()]);
    return { gm, spieler, actor, campaignId: campaign.id, tuer };
  }

  const vorfaelle = async (campaignId: string) =>
    (await db.query<{ aktions_vollmacht_id: string; user_id: string }>(
      "SELECT aktions_vollmacht_id,user_id FROM zugangsvorfaelle WHERE campaign_id=$1", [campaignId])).rows;

  /** Lässt das Credential ablaufen, ohne es zu entfernen — genau der Fall aus CHAMPION. */
  async function credentialVerfallen(cookieWert: string) {
    const credentialId = cookieWert.split(".")[0]!;
    await db.query("UPDATE credentials SET expires_at=$2 WHERE id=$1", [credentialId, clock - 1]);
  }

  it("belegt die Aussperrung und antwortet trotzdem mit derselben 404", async () => {
    const t = await tischMitOffenerTuer();
    const identity = createIdentity(db, cfg);
    const sitzung = await identity.issueSession(t.spieler);
    await credentialVerfallen(sitzung.value);

    await expect(identity.authenticate(`chronicle_session=${sitzung.value}`)).rejects.toBeInstanceOf(Gone);

    const belegt = await vorfaelle(t.campaignId);
    expect(belegt).toHaveLength(1);
    expect(belegt[0]).toEqual({ aktions_vollmacht_id: t.tuer, user_id: t.spieler });
  });

  it("zählt eine Tür einmal, auch wenn das Gerät in Schleife fragt", async () => {
    const t = await tischMitOffenerTuer();
    const identity = createIdentity(db, cfg);
    const sitzung = await identity.issueSession(t.spieler);
    await credentialVerfallen(sitzung.value);

    for (let i = 0; i < 5; i++) {
      await expect(identity.authenticate(`chronicle_session=${sitzung.value}`)).rejects.toBeInstanceOf(Gone);
    }
    expect(await vorfaelle(t.campaignId)).toHaveLength(1);
  });

  it("schreibt nichts für eine geratene Credential-Id — der Beleg ist kein Aufklärungswerkzeug", async () => {
    const t = await tischMitOffenerTuer();
    const identity = createIdentity(db, cfg);
    const echt = await identity.issueSession(t.spieler);
    await credentialVerfallen(echt.value);
    // Dieselbe Id, ein anderes Geheimnis: der MAC wird über den ganzen Körper gerechnet, also
    // ist auch dieses Cookie formal von uns — nur das Geheimnis stimmt nicht.
    const [id] = echt.value.split(".");
    const gefaelscht = await identity.issueSession(t.spieler);
    const fremdesGeheimnis = gefaelscht.value.split(".")[1];
    const gebastelt = `${id}.${fremdesGeheimnis}.${gefaelscht.value.split(".")[2]}`;

    await expect(identity.authenticate(`chronicle_session=${gebastelt}`)).rejects.toBeInstanceOf(Gone);
    expect(await vorfaelle(t.campaignId)).toHaveLength(0);
  });

  it("schweigt, wenn der Ausgesperrte gar keine offene Tür hält", async () => {
    const t = await tischMitOffenerTuer();
    await db.query("UPDATE action_vollmachten SET status='widerrufen',revoked_at=$2 WHERE id=$1", [t.tuer, clock]);
    const identity = createIdentity(db, cfg);
    const sitzung = await identity.issueSession(t.spieler);
    await credentialVerfallen(sitzung.value);

    await expect(identity.authenticate(`chronicle_session=${sitzung.value}`)).rejects.toBeInstanceOf(Gone);
    expect(await vorfaelle(t.campaignId)).toHaveLength(0);
  });

  it("schweigt für ein gültiges Credential — ein Vorfall ist kein Anmeldeprotokoll", async () => {
    const t = await tischMitOffenerTuer();
    const identity = createIdentity(db, cfg);
    const sitzung = await identity.issueSession(t.spieler);
    const kontext = await identity.authenticate(`chronicle_session=${sitzung.value}`);
    expect(kontext.userId).toBe(t.spieler);
    expect(await vorfaelle(t.campaignId)).toHaveLength(0);
  });

  it("bleibt append-only: der Beleg lässt sich weder ändern noch einzeln löschen", async () => {
    const t = await tischMitOffenerTuer();
    const identity = createIdentity(db, cfg);
    const sitzung = await identity.issueSession(t.spieler);
    await credentialVerfallen(sitzung.value);
    await expect(identity.authenticate(`chronicle_session=${sitzung.value}`)).rejects.toBeInstanceOf(Gone);

    await expect(db.query("DELETE FROM zugangsvorfaelle WHERE campaign_id=$1", [t.campaignId])).rejects.toThrow(/append-only/);
    await expect(db.query("UPDATE zugangsvorfaelle SET user_id=$2 WHERE campaign_id=$1", [t.campaignId, t.gm])).rejects.toThrow(/append-only/);
    expect(await vorfaelle(t.campaignId)).toHaveLength(1);
  });
});
