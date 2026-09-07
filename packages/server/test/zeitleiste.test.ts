import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../src/app.ts";
import { createTestDb, migrate, type Db } from "../src/db/index.ts";
import { createCampaigns } from "../src/domain/campaigns.ts";
import { createDocuments, type PassageInput } from "../src/domain/documents.ts";
import { createIdentity } from "../src/identity/index.ts";
import { leseWeltjahr } from "../src/domain/zeitleiste.ts";
import { seedActorControl } from "./actor-fixtures.ts";

const config = { origin: "https://chronicle.test", cookieSecret: "zeitleiste-cookie-secret-long-enough", bootstrapToken: "zeitleiste-bootstrap-secret-long-enough" };
const absatz = (text: string): PassageInput => ({ inhalt: { kind: "absatz", inhalt: [{ text, marks: [] }] } });
const feld = (schluessel: string, label: string, wert: string): PassageInput =>
  ({ inhalt: { kind: "feld", schluessel, label, mehrwertig: false, klauselKandidat: false, werte: [[{ text: wert, marks: [] }]] } });

describe("Der Weltjahr-Leser liest den Kalender der Quelle, ohne ihn zu erfinden", () => {
  it("liest die Formen, die im echten Bestand vorkommen", () => {
    expect(leseWeltjahr("837")).toEqual({ jahr: 837, genau: true });
    expect(leseWeltjahr("819 n. K")).toEqual({ jahr: 819, genau: true });
    expect(leseWeltjahr("837 n. K.")).toEqual({ jahr: 837, genau: true });
    expect(leseWeltjahr("c.a 1200 v. K.")).toEqual({ jahr: -1200, genau: false });
    expect(leseWeltjahr("Winter 866")).toEqual({ jahr: 866, genau: false });
  });

  it("gibt nichts zurück, wo nichts steht — statt eine Null zu erfinden", () => {
    for (const wert of ["", "   ", "unbekannt", "vor langer Zeit", "n. K."]) expect(leseWeltjahr(wert)).toBeNull();
  });

  it("liest keine Zahl, die gar kein Jahr ist", () => {
    // Ein Wert mit Einheit ist eine Messung, kein Datum. Sonst wuerde `Groesse: 180 cm`
    // zum Jahr 180 und stuende zwischen zwei Schlachten.
    expect(leseWeltjahr("180 cm")).toBeNull();
    expect(leseWeltjahr("1,80 m")).toBeNull();
  });
});

describe("Die Zeitleiste — errechnet aus dem, was die Leserin hält", () => {
  let db: Db, app: FastifyInstance, campaignId: string, gmCookie: string, playerCookie: string;
  let docs: ReturnType<typeof createDocuments>;
  const gm = randomUUID(), player = randomUUID(), sera = randomUUID();
  const get = (path: string, session = gmCookie) => app.inject({ method: "GET", url: `/api/campaigns/${campaignId}${path}`, headers: { cookie: session } });

  beforeAll(async () => {
    db = await createTestDb(); await migrate(db);
    for (const [id, role] of [[gm, "leitung"], [player, "gast"]]) await db.query("INSERT INTO users(id,display_name,platform_role,created_at) VALUES($1,$1,$2,1)", [id, role]);
    campaignId = (await createCampaigns(db).createCampaign(gm, { name: "Eron" })).id;
    await db.query("INSERT INTO actors(id,campaign_id,user_id,name) VALUES($1,$2,$3,'Sera')", [sera, campaignId, player]);
    await db.query("INSERT INTO campaign_memberships(campaign_id,user_id,role,display_name,name_skeleton,actor_id) VALUES($1,$2,'spieler','Sera','sera',$3)", [campaignId, player, sera]);
    await seedActorControl(db, campaignId, sera, player);
    const identity = createIdentity(db, config);
    gmCookie = `chronicle_session=${(await identity.issueSession(gm)).value}`;
    playerCookie = `chronicle_session=${(await identity.issueSession(player)).value}`;
    docs = createDocuments(db); app = await buildApp(db, config);

    const alrik = await docs.saveEntry(gm, campaignId, { title: "Alrik von Vharon", passages: [
      feld("Geburt", "Geburtsdatum", "819 n. K"), feld("Tod", "Todesdatum", "Winter 866"),
      feld("Größe", "Körpergröße", "180 cm"), absatz("Alrik ritt nach Norden.")] });
    const haus = await docs.saveEntry(gm, campaignId, { title: "Haus Ker", passages: [
      feld("gründung", "Gründung", "c.a 1200 v. K.")] });
    // Sera haelt nur Alriks Geburt — nicht seinen Tod, nicht die Gruendung.
    await docs.revealPassage(gm, campaignId, alrik.passagen[0]!.pid, sera);
    void haus;
  }, 30_000);
  afterAll(async () => { await app?.close(); await db?.close(); });

  it("errechnet die Ereignisse aus den Datumsfeldern und ordnet sie nach dem Weltjahr", async () => {
    const response = await get("/zeitleiste");
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.ereignisse.map((e: { jahr: number | null; art: string }) => [e.jahr, e.art])).toEqual([
      [-1200, "gruendung"], [819, "geburt"], [866, "tod"],
    ]);
    expect(body.ereignisse[0]).toMatchObject({ roh: "c.a 1200 v. K.", genau: false, titel: "Haus Ker" });
    expect(body.ereignisse[2]).toMatchObject({ roh: "Winter 866", genau: false, titel: "Alrik von Vharon" });
  });

  it("nimmt keine Messung für ein Datum", async () => {
    expect((await get("/zeitleiste")).body).not.toContain("180 cm");
  });

  it("zeigt einer Spielerin nur die Ereignisse, deren Passage sie hält", async () => {
    const body = (await get("/zeitleiste", playerCookie)).json();
    expect(body.ereignisse).toHaveLength(1);
    expect(body.ereignisse[0]).toMatchObject({ jahr: 819, art: "geburt", titel: "Alrik von Vharon" });
    expect(JSON.stringify(body)).not.toContain("Haus Ker");
    expect(JSON.stringify(body)).not.toContain("866");
  });

  it("führt jedes Ereignis auf seine Passage zurück, damit die Belegkarte erreichbar bleibt", async () => {
    const body = (await get("/zeitleiste", playerCookie)).json();
    expect(body.ereignisse[0].passageId).toEqual(expect.any(String));
    expect(body.ereignisse[0].entryId).toEqual(expect.any(String));
  });
});
