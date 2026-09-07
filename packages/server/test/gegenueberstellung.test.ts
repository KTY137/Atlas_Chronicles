import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../src/app.ts";
import { createTestDb, migrate, type Db } from "../src/db/index.ts";
import { createCampaigns } from "../src/domain/campaigns.ts";
import { createDocuments, type PassageInput } from "../src/domain/documents.ts";
import { createIdentity } from "../src/identity/index.ts";
import { seedActorControl } from "./actor-fixtures.ts";

const config = { origin: "https://chronicle.test", cookieSecret: "gegenueberstellung-cookie-secret-long-enough", bootstrapToken: "gegenueberstellung-bootstrap-secret-long-enough" };
const paragraph = (text: string): PassageInput => ({ inhalt: { kind: "absatz", inhalt: [{ text, marks: [] }] } });

describe("Die Gegenüberstellung — derselbe Artikel für zwei Figuren", () => {
  let db: Db, app: FastifyInstance, campaignId: string, gmCookie: string, playerCookie: string;
  let docs: ReturnType<typeof createDocuments>;
  let entryId: string, pids: string[] = [];
  const gm = randomUUID(), player = randomUUID(), brannt = randomUUID(), livia = randomUUID();
  let fremdeFigur = "";
  const get = (path: string, session = gmCookie) =>
    app.inject({ method: "GET", url: `/api/campaigns/${campaignId}${path}`, headers: { cookie: session } });

  beforeAll(async () => {
    db = await createTestDb(); await migrate(db);
    for (const [id, role] of [[gm, "leitung"], [player, "gast"]]) await db.query("INSERT INTO users(id,display_name,platform_role,created_at) VALUES($1,$1,$2,1)", [id, role]);
    campaignId = (await createCampaigns(db).createCampaign(gm, { name: "Gegenüberstellung" })).id;
    for (const [id, name] of [[brannt, "Brannt"], [livia, "Livia"]]) await db.query("INSERT INTO actors(id,campaign_id,user_id,name) VALUES($1,$2,$3,$4)", [id, campaignId, player, name]);
    await db.query("INSERT INTO campaign_memberships(campaign_id,user_id,role,display_name,name_skeleton,actor_id) VALUES($1,$2,'spieler','Spieler','spieler',$3)", [campaignId, player, brannt]);
    await seedActorControl(db, campaignId, brannt, player);
    await seedActorControl(db, campaignId, livia, player);
    const other = (await createCampaigns(db).createCampaign(gm, { name: "Fremde Runde" })).id;
    fremdeFigur = randomUUID();
    await db.query("INSERT INTO actors(id,campaign_id,user_id,name) VALUES($1,$2,$3,'Fremd')", [fremdeFigur, other, gm]);
    const identity = createIdentity(db, config);
    gmCookie = `chronicle_session=${(await identity.issueSession(gm)).value}`;
    playerCookie = `chronicle_session=${(await identity.issueSession(player)).value}`;
    docs = createDocuments(db); app = await buildApp(db, config);

    const entry = await docs.saveEntry(gm, campaignId, { title: "Die Mühle am Fluss",
      passages: [paragraph("Beide kennen die Mühle."), paragraph("Nur Brannt sah den Keller."), paragraph("Nur Livia hörte den Namen."), paragraph("Niemand weiß davon.")] });
    entryId = entry.entryId; pids = entry.passagen.map(p => p.pid);
    await docs.revealPassage(gm, campaignId, pids[0]!, brannt);
    await docs.revealPassage(gm, campaignId, pids[0]!, livia);
    await docs.revealPassage(gm, campaignId, pids[1]!, brannt);
    await docs.revealPassage(gm, campaignId, pids[2]!, livia);
  }, 30_000);
  afterAll(async () => { await app?.close(); await db?.close(); });

  it("stellt zwei Sichten desselben Eintrags nebeneinander und markiert jede Abweichung", async () => {
    const response = await get(`/entries/${entryId}/gegenueberstellung?links=${brannt}&rechts=${livia}`);
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.titel).toBe("Die Mühle am Fluss");
    expect(body.links).toMatchObject({ actorId: brannt, name: "Brannt" });
    expect(body.rechts).toMatchObject({ actorId: livia, name: "Livia" });
    expect(body.links.passagen.map((p: { pid: string }) => p.pid)).toEqual([pids[0], pids[1]]);
    expect(body.rechts.passagen.map((p: { pid: string }) => p.pid)).toEqual([pids[0], pids[2]]);
    expect(body.zeilen).toEqual([
      { pid: pids[0], ord: 0, seite: "beide" },
      { pid: pids[1], ord: 1, seite: "nur-links" },
      { pid: pids[2], ord: 2, seite: "nur-rechts" },
    ]);
  });

  it("nennt die unbekannte Passage nicht — auch nicht als Lücke", async () => {
    const body = (await get(`/entries/${entryId}/gegenueberstellung?links=${brannt}&rechts=${livia}`)).body;
    expect(body).not.toContain("Niemand weiß davon");
    expect(body).not.toContain(pids[3]);
  });

  it("ist für einen Spieler byte-identisch mit einem Eintrag, den es nicht gibt", async () => {
    const missing = await get(`/entries/${randomUUID()}/gegenueberstellung?links=${brannt}&rechts=${livia}`, playerCookie);
    const forged = await get(`/entries/${entryId}/gegenueberstellung?links=${brannt}&rechts=${livia}`, playerCookie);
    expect(forged.statusCode).toBe(404);
    expect(forged.body).toBe(missing.body);
  });

  it("behandelt eine Figur aus einer fremden Kampagne, als gäbe es den Eintrag nicht", async () => {
    const missing = await get(`/entries/${randomUUID()}/gegenueberstellung?links=${brannt}&rechts=${livia}`);
    for (const query of [`links=${fremdeFigur}&rechts=${livia}`, `links=${brannt}&rechts=${fremdeFigur}`, `links=${brannt}`, ""]) {
      const response = await get(`/entries/${entryId}/gegenueberstellung?${query}`);
      expect(response.statusCode).toBe(404);
      expect(response.body).toBe(missing.body);
    }
  });
});
