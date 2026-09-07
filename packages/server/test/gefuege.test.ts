// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../src/app.ts";
import { createTestDb, migrate, type Db } from "../src/db/index.ts";
import { createCampaigns } from "../src/domain/campaigns.ts";
import { createDocuments, type PassageInput } from "../src/domain/documents.ts";
import { createIdentity } from "../src/identity/index.ts";
import { seedActorControl } from "./actor-fixtures.ts";
import { exportCampaignBundle, initializeCampaignRestoreTarget, restoreCampaignBundle } from "../src/domain/bundles.ts";
import { currentCampaignTables } from "@chronicle/io";

const config = { origin: "https://chronicle.test", cookieSecret: "gefuege-cookie-secret-long-enough-x", bootstrapToken: "gefuege-bootstrap-secret-long-enough-x" };
const absatz = (text: string): PassageInput => ({ inhalt: { kind: "absatz", inhalt: [{ text, marks: [] }] } });

describe("Das Gefüge — Stammbaum und Politogramm durch das Wissen der Figur", () => {
  let db: Db, app: FastifyInstance, campaignId: string, gmCookie: string, playerCookie: string;
  let docs: ReturnType<typeof createDocuments>;
  const gm = randomUUID(), player = randomUUID(), sera = randomUUID();
  let alrik = "", mira = "", hausKer = "";
  let ankerVater = "", ankerFeind = "", geheimerAnker = "";
  const get = (path: string, session = gmCookie) => app.inject({ method: "GET", url: `/api/campaigns/${campaignId}${path}`, headers: { cookie: session } });
  const post = (path: string, body: unknown, session = gmCookie) => app.inject({ method: "POST", url: `/api/campaigns/${campaignId}${path}`, headers: { cookie: session, origin: config.origin }, payload: body as object });

  beforeAll(async () => {
    db = await createTestDb(); await migrate(db);
    for (const [id, role] of [[gm, "leitung"], [player, "gast"]]) await db.query("INSERT INTO users(id,display_name,platform_role,created_at) VALUES($1,$1,$2,1)", [id, role]);
    campaignId = (await createCampaigns(db).createCampaign(gm, { name: "Haus Vharon" })).id;
    await db.query("INSERT INTO actors(id,campaign_id,user_id,name) VALUES($1,$2,$3,'Sera')", [sera, campaignId, player]);
    await db.query("INSERT INTO campaign_memberships(campaign_id,user_id,role,display_name,name_skeleton,actor_id) VALUES($1,$2,'spieler','Sera','sera',$3)", [campaignId, player, sera]);
    await seedActorControl(db, campaignId, sera, player);
    const identity = createIdentity(db, config);
    gmCookie = `chronicle_session=${(await identity.issueSession(gm)).value}`;
    playerCookie = `chronicle_session=${(await identity.issueSession(player)).value}`;
    docs = createDocuments(db); app = await buildApp(db, config);

    const a = await docs.saveEntry(gm, campaignId, { title: "Alrik von Vharon", passages: [absatz("Alrik ist der Vater von Sera."), absatz("Alrik hasst Haus Ker.")] });
    const m = await docs.saveEntry(gm, campaignId, { title: "Mira von Vharon", passages: [absatz("Mira ist Alriks Gemahlin.")] });
    const k = await docs.saveEntry(gm, campaignId, { title: "Haus Ker", passages: [absatz("Haus Ker hält den Nordpass.")] });
    alrik = a.entryId; mira = m.entryId; hausKer = k.entryId;
    ankerVater = a.passagen[0]!.pid; ankerFeind = a.passagen[1]!.pid; geheimerAnker = m.passagen[0]!.pid;
    // Sera hält den Vater-Anker und den Feind-Anker, aber nicht den über Mira.
    await docs.revealPassage(gm, campaignId, ankerVater, sera);
    await docs.revealPassage(gm, campaignId, ankerFeind, sera);
  }, 30_000);
  afterAll(async () => { await app?.close(); await db?.close(); });

  it("legt eine Kante an, die an ihrer Passage hängt, und ordnet sie ihrem Graphen zu", async () => {
    const vater = await post("/beziehungen", { passageId: ankerVater, vonEntryId: alrik, nachEntryId: alrik, art: "elternteil_von" });
    expect(vater.statusCode).toBe(400);
    const echt = await post("/beziehungen", { passageId: ankerVater, vonEntryId: alrik, nachEntryId: hausKer, art: "elternteil_von" });
    expect(echt.statusCode).toBe(200);
    expect(echt.json()).toMatchObject({ art: "elternteil_von", graph: "stammbaum", gerichtet: true, passageId: ankerVater });
    const feind = await post("/beziehungen", { passageId: ankerFeind, vonEntryId: alrik, nachEntryId: hausKer, art: "feindschaft_mit" });
    expect(feind.json()).toMatchObject({ art: "feindschaft_mit", graph: "politogramm", gerichtet: false });
    const ehe = await post("/beziehungen", { passageId: geheimerAnker, vonEntryId: alrik, nachEntryId: mira, art: "verheiratet_mit" });
    expect(ehe.json()).toMatchObject({ art: "verheiratet_mit", graph: "stammbaum", gerichtet: false });
  });

  it("weist eine Art zurück, die das Modell nicht kennt", async () => {
    const response = await post("/beziehungen", { passageId: ankerVater, vonEntryId: alrik, nachEntryId: mira, art: "mag_lieber" });
    expect(response.statusCode).toBe(400);
  });

  it("zeigt der Spielleitung das ganze Gefüge", async () => {
    const graph = (await get("/gefuege")).json();
    expect(graph.kanten).toHaveLength(3);
    expect(graph.knoten.map((n: { entryId: string }) => n.entryId).sort()).toEqual([alrik, hausKer, mira].sort());
    expect(graph.knoten.every((n: { bekannt: boolean }) => n.bekannt)).toBe(true);
  });

  it("zeigt einer Spielerin nur die Kanten, deren Passage sie hält", async () => {
    const graph = (await get("/gefuege", playerCookie)).json();
    expect(graph.kanten.map((k: { art: string }) => k.art).sort()).toEqual(["elternteil_von", "feindschaft_mit"]);
    expect(JSON.stringify(graph)).not.toContain(mira);
    expect(JSON.stringify(graph)).not.toContain("Mira");
  });

  it("nennt einen Knoten, dessen Eintrag die Leserin nicht kennt, ohne ihn begehbar zu machen", async () => {
    const graph = (await get("/gefuege", playerCookie)).json();
    const ker = graph.knoten.find((n: { entryId: string }) => n.entryId === hausKer);
    expect(ker).toMatchObject({ titel: "Haus Ker", bekannt: false });
    const alrikKnoten = graph.knoten.find((n: { entryId: string }) => n.entryId === alrik);
    expect(alrikKnoten).toMatchObject({ bekannt: true });
  });

  it("gibt das Gefüge eines einzelnen Eintrags zurück, auf seine Nachbarn beschränkt", async () => {
    const graph = (await get(`/entries/${alrik}/gefuege`, playerCookie)).json();
    expect(graph.kanten).toHaveLength(2);
    expect(graph.knoten.map((n: { entryId: string }) => n.entryId).sort()).toEqual([alrik, hausKer].sort());
  });

  it("hat für einen Eintrag, den die Leserin nicht hält, kein Gefüge — wie der Artikel selbst", async () => {
    const artikel = await get(`/entries/${hausKer}`, playerCookie);
    const gefuege = await get(`/entries/${hausKer}/gefuege`, playerCookie);
    const fehlend = await get(`/entries/${randomUUID()}/gefuege`, playerCookie);
    expect(artikel.statusCode).toBe(404);
    expect(gefuege.statusCode).toBe(404);
    expect(gefuege.body).toBe(fehlend.body);
  });

  it("lässt eine Spielerin keine Kante anlegen und bestätigt die Route auch nicht", async () => {
    const missing = await get(`/entries/${randomUUID()}/gefuege`, playerCookie);
    const forged = await post("/beziehungen", { passageId: ankerVater, vonEntryId: alrik, nachEntryId: mira, art: "buendnis_mit" }, playerCookie);
    expect(forged.statusCode).toBe(404);
    expect(forged.body).toBe(missing.body);
  });

  it("trägt jede Kante durch Export und Wiederherstellung — auch die zurückgezogene", async () => {
    const bundle = await exportCampaignBundle(db, gm, campaignId);
    const exportiert = currentCampaignTables(bundle).beziehungen;
    expect(exportiert.length).toBeGreaterThan(0);
    const ziel = await createTestDb(); await migrate(ziel);
    try {
      await initializeCampaignRestoreTarget(ziel);
      await restoreCampaignBundle(ziel, bundle);
      const zurueck = (await ziel.query<{ id: string; art: string; passage_id: string }>(
        "SELECT id,art,passage_id FROM beziehungen ORDER BY id")).rows;
      const erwartet = [...exportiert].map(row => ({ id: String(row.id), art: String(row.art), passage_id: String(row.passage_id) }))
        .sort((a, b) => a.id < b.id ? -1 : 1);
      expect(zurueck).toEqual(erwartet);
    } finally { await ziel.close(); }
  }, 60_000);

  it("nimmt eine zurückgezogene Kante aus jedem Gefüge, ohne die Passage anzutasten", async () => {
    const kanten = (await get("/gefuege")).json().kanten as { id: string; art: string }[];
    const feind = kanten.find(k => k.art === "feindschaft_mit")!;
    expect((await post(`/beziehungen/${feind.id}/zurueckziehen`, {})).statusCode).toBe(200);
    expect((await get("/gefuege")).json().kanten).toHaveLength(2);
    expect((await get("/gefuege", playerCookie)).json().kanten).toHaveLength(1);
    expect((await get(`/entries/${alrik}`, playerCookie)).body).toContain("Alrik hasst Haus Ker");
  });
});
