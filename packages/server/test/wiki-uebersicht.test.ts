import { seedActorControl } from "./actor-fixtures.ts";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../src/app.ts";
import { createTestDb, migrate, type Db } from "../src/db/index.ts";
import { createCampaigns } from "../src/domain/campaigns.ts";
import { createDocuments, type PassageInput } from "../src/domain/documents.ts";
import { createIdentity } from "../src/identity/index.ts";
import { currentCampaignTables, parseCurrentCampaignBundle } from "@chronicle/io";

const config = { origin: "https://chronicle.test", cookieSecret: "wiki-uebersicht-cookie-secret-long-enough", bootstrapToken: "wiki-uebersicht-bootstrap-secret-long-enough" };
const paragraph = (text: string): PassageInput => ({ inhalt: { kind: "absatz", inhalt: [{ text, marks: [] }] } });

describe("die Übersicht zeigt die Ordnung der Welt, nicht mehr als die Figur weiß", () => {
  let db: Db, app: FastifyInstance, campaignId: string, cookie: string, gmCookie: string;
  const gm = randomUUID(), player = randomUUID(), actor = randomUUID();
  let docs: ReturnType<typeof createDocuments>;
  let stadtId = "";
  const get = (path: string, session = cookie) => app.inject({ method: "GET", url: `/api/campaigns/${campaignId}${path}`, headers: { cookie: session } });
  const setArt = (entryId: string, art: string) => db.query("UPDATE entries SET art=$2 WHERE id=$1", [entryId, art]);

  beforeAll(async () => {
    db = await createTestDb(); await migrate(db);
    for (const [id, role] of [[gm, "leitung"], [player, "gast"]]) await db.query("INSERT INTO users(id,display_name,platform_role,created_at) VALUES($1,$1,$2,1)", [id, role]);
    campaignId = (await createCampaigns(db).createCampaign(gm, { name: "Übersicht" })).id;
    await db.query("INSERT INTO actors(id,campaign_id,user_id,name) VALUES($1,$2,$3,'Leserin')", [actor, campaignId, player]);
    await db.query("INSERT INTO campaign_memberships(campaign_id,user_id,role,display_name,name_skeleton,actor_id) VALUES($1,$2,'spieler','Leserin','leserin',$3)", [campaignId, player, actor]);
    await seedActorControl(db, campaignId, actor, player);
    const identity = createIdentity(db, config);
    cookie = `chronicle_session=${(await identity.issueSession(player)).value}`;
    gmCookie = `chronicle_session=${(await identity.issueSession(gm)).value}`;
    docs = createDocuments(db); app = await buildApp(db, config);
  }, 30_000);
  afterAll(async () => { await app?.close(); await db?.close(); });

  it("gruppiert der Spielleitung die Artikel nach ihrer Art und nennt jede Art nur einmal", async () => {
    const stadt = await docs.saveEntry(gm, campaignId, { title: "Andaria", passages: [paragraph("Eine Stadt am Fluss")] });
    const hafen = await docs.saveEntry(gm, campaignId, { title: "Hafenviertel", passages: [paragraph("Ein Viertel")] });
    const fuerst = await docs.saveEntry(gm, campaignId, { title: "Fürst Vharon", passages: [paragraph("Ein Mann mit Absichten")] });
    await setArt(stadt.entryId, "ort"); await setArt(hafen.entryId, "ort"); await setArt(fuerst.entryId, "charakter");
    stadtId = stadt.entryId;

    const response = await get("/navigation", gmCookie);
    expect(response.statusCode, response.body).toBe(200);
    const body = response.json();
    expect(body.arten).toEqual(expect.arrayContaining([
      { art: "ort", bekannt: 2, gesamt: 2 },
      { art: "charakter", bekannt: 1, gesamt: 1 },
    ]));
    expect(body.arten).toHaveLength(2);
    expect(body.artikel).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: stadt.entryId, titel: "Andaria", art: "ort", bekannt: true, elternId: null }),
    ]));
  });

  it("zählt der Spielerin die unbekannten mit, verrät aber keinen ihrer Titel", async () => {
    const bekannt = await docs.saveEntry(gm, campaignId, { title: "Die Bruchbucht", passages: [paragraph("Ein Hafen, den sie kennt")] });
    await setArt(bekannt.entryId, "ort");
    await docs.revealPassage(gm, campaignId, bekannt.passagen[0]!.pid, actor);

    const response = await get("/navigation");
    expect(response.statusCode, response.body).toBe(200);
    const body = response.json();
    // Drei Orte stehen in der Chronik, die Figur kennt einen davon.
    expect(body.arten).toEqual(expect.arrayContaining([{ art: "ort", bekannt: 1, gesamt: 3 }]));
    const ihrer = body.artikel.find((eintrag: { id: string }) => eintrag.id === bekannt.entryId);
    expect(ihrer).toMatchObject({ titel: "Die Bruchbucht", slug: bekannt.slug, bekannt: true });
    // Die Silhouette: der unbekannte Artikel ist da, aber ohne Namen und ohne Adresse.
    const fremder = body.artikel.find((eintrag: { id: string }) => eintrag.id === stadtId);
    expect(fremder).toBeDefined();
    expect(fremder.bekannt).toBe(false);
    expect(fremder.titel).toBeUndefined();
    expect(fremder.slug).toBeUndefined();
    // Der schärfste Test: kein einziger fremder Titel steht irgendwo in der Antwort.
    expect(response.body).not.toMatch(/Andaria|Hafenviertel|Vharon/);
  });

  it("zeigt die Kategorie beiden Seiten, aber ihre Mitglieder nur der Spielleitung", async () => {
    const kategorie = randomUUID(), unterkategorie = randomUUID();
    await db.query("INSERT INTO categories(id,campaign_id,slug,title) VALUES($1,$2,'goetter','Götter')", [kategorie, campaignId]);
    await db.query("INSERT INTO categories(id,campaign_id,slug,title,parent_category_id) VALUES($1,$2,'alte-goetter','Alte Götter',$3)", [unterkategorie, campaignId, kategorie]);
    const gesehen = await docs.saveEntry(gm, campaignId, { title: "Der Namenlose", passages: [paragraph("Ein Gott, von dem sie hörte")] });
    const verborgen = await docs.saveEntry(gm, campaignId, { title: "Sethra die Stumme", passages: [paragraph("Eine Göttin, von der sie nichts weiß")] });
    for (const eintrag of [gesehen, verborgen]) await db.query("INSERT INTO entry_categories(campaign_id,entry_id,category_id) VALUES($1,$2,$3)", [campaignId, eintrag.entryId, kategorie]);
    await docs.revealPassage(gm, campaignId, gesehen.passagen[0]!.pid, actor);

    const leitung = (await get("/navigation", gmCookie)).json();
    expect(leitung.kategorien).toEqual(expect.arrayContaining([
      { id: kategorie, slug: "goetter", titel: "Götter", elternId: null, sichtbarkeit: "silhouette", bekannt: 2, gesamt: 2 },
      { id: unterkategorie, slug: "alte-goetter", titel: "Alte Götter", elternId: kategorie, sichtbarkeit: "silhouette", bekannt: 0, gesamt: 0 },
    ]));

    const response = await get("/navigation");
    const spielerin = response.json();
    // Die Kategorie selbst ist sichtbar — sie ist die Silhouette. Ihr Inhalt ist es nicht.
    expect(spielerin.kategorien).toEqual(expect.arrayContaining([
      { id: kategorie, slug: "goetter", titel: "Götter", elternId: null, sichtbarkeit: "silhouette", bekannt: 1, gesamt: 2 },
    ]));
    expect(spielerin.artikel.find((e: { id: string }) => e.id === gesehen.entryId)).toMatchObject({ titel: "Der Namenlose", kategorieIds: [kategorie] });
    // Auch der unbekannte Artikel trägt seine Kategorie — sonst wäre die Zahl oben nicht belegbar.
    expect(spielerin.artikel.find((e: { id: string }) => e.id === verborgen.entryId)).toMatchObject({ bekannt: false, kategorieIds: [kategorie] });
    expect(response.body).not.toMatch(/Sethra/);
  });

  it("nimmt die Kategorien in das Kampagnenpaket auf, statt den Export zum Stehen zu bringen", async () => {
    const response = await get("/export", gmCookie);
    expect(response.statusCode, response.body).toBe(200);
    const bundle = parseCurrentCampaignBundle(response.body);
    const tabellen = currentCampaignTables(bundle);
    expect(tabellen.categories.map(zeile => zeile.slug).sort()).toEqual(["alte-goetter", "goetter"]);
    expect(tabellen.entry_categories).toHaveLength(2);
  });
});
