import { seedActorControl } from "./actor-fixtures.ts";
import { randomUUID } from "node:crypto";
import { trustEntryId } from "@chronicle/core";
import { parseCampaignBundleV4 } from "@chronicle/io";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../src/app.ts";
import { createTestDb, migrate, type Db } from "../src/db/index.ts";
import { createCampaigns } from "../src/domain/campaigns.ts";
import { createDocuments, type PassageInput } from "../src/domain/documents.ts";
import { createIdentity } from "../src/identity/index.ts";
import { Conflict } from "../src/domain/errors.ts";

const config = { origin: "https://chronicle.test", cookieSecret: "wiki-navigation-cookie-secret-long-enough", bootstrapToken: "wiki-navigation-bootstrap-secret-long-enough" };
const paragraph = (text: string): PassageInput => ({ inhalt: { kind: "absatz", inhalt: [{ text, marks: [] }] } });
const link = (text: string, slug: string, id?: string): PassageInput => ({ inhalt: { kind: "absatz", inhalt: [{ text, marks: [{ art: "link", zielSlug: slug, ...(id ? { zielEntryId: trustEntryId(id) } : {}) }] }] } });

describe("wiki navigation follows the reader's current knowledge", () => {
  let db: Db, app: FastifyInstance, campaignId: string, cookie: string, gmCookie: string;
  const gm = randomUUID(), player = randomUUID(), actor = randomUUID();
  let docs: ReturnType<typeof createDocuments>;
  const get = (path: string, session = cookie) => app.inject({ method: "GET", url: `/api/campaigns/${campaignId}${path}`, headers: { cookie: session } });
  beforeAll(async () => {
    db = await createTestDb(); await migrate(db);
    for (const [id, role] of [[gm, "leitung"], [player, "gast"]]) await db.query("INSERT INTO users(id,display_name,platform_role,created_at) VALUES($1,$1,$2,1)", [id, role]);
    campaignId = (await createCampaigns(db).createCampaign(gm, { name: "Navigation" })).id;
    await db.query("INSERT INTO actors(id,campaign_id,user_id,name) VALUES($1,$2,$3,'Reader')", [actor, campaignId, player]);
    await db.query("INSERT INTO campaign_memberships(campaign_id,user_id,role,display_name,name_skeleton,actor_id) VALUES($1,$2,'spieler','Reader','reader',$3)", [campaignId, player, actor]);
    await seedActorControl(db, campaignId, actor, player);
    const identity = createIdentity(db, config);
    cookie = `chronicle_session=${(await identity.issueSession(player)).value}`;
    gmCookie = `chronicle_session=${(await identity.issueSession(gm)).value}`;
    docs = createDocuments(db); app = await buildApp(db, config);
  }, 30_000);
  afterAll(async () => { await app?.close(); await db?.close(); });

  it("returns only links in held passages, with unchanged bytes after hidden edits", async () => {
    const target = await docs.saveEntry(gm, campaignId, { title: "Known destination", passages: [paragraph("Destination")] });
    await docs.revealPassage(gm, campaignId, target.passagen[0]!.pid, actor);
    const source = await docs.saveEntry(gm, campaignId, { title: "Known source", passages: [paragraph("Known preface"), link("Concealed reference", target.slug, target.entryId), link("A visible reference", target.slug, target.entryId)] });
    await docs.revealPassage(gm, campaignId, source.passagen[0]!.pid, actor);
    await docs.revealPassage(gm, campaignId, source.passagen[2]!.pid, actor);
    const secret = await docs.saveEntry(gm, campaignId, { title: "Hidden source", passages: [link("Hidden source text", target.slug, target.entryId)] });
    const before = await get(`/entries/${target.entryId}/backlinks`);
    expect(before.statusCode).toBe(200);
    expect(before.json()).toEqual([{ entryId: source.entryId, title: source.titel, slug: source.slug, passageId: source.passagen[2]!.pid, excerpt: "A visible reference" }]);
    expect((await get(`/entries/${target.entryId}/backlinks`, gmCookie)).json()).toHaveLength(3);
    await docs.saveEntry(gm, campaignId, { title: "A very different secret", expectedVersion: 1, passages: [{ ...link("Additional secret", target.slug), pid: secret.passagen[0]!.pid }, link("Another secret", target.slug)] }, secret.entryId);
    expect((await get(`/entries/${target.entryId}/backlinks`)).body).toBe(before.body);
    expect(before.body).not.toMatch(/Concealed|Hidden|ord|total|version/);
  });

  it("treats concealed and nonexistent destinations identically, including their old slugs", async () => {
    const hidden = await docs.saveEntry(gm, campaignId, { title: "Concealed destination", passages: [paragraph("Secret")] });
    await docs.saveEntry(gm, campaignId, { title: "Renamed secret", slug: "renamed-secret", expectedVersion: 1, passages: [{ ...paragraph("Secret"), pid: hidden.passagen[0]!.pid }] }, hidden.entryId);
    const missing = await get("/wiki/never-existed");
    for (const path of [`/wiki/${hidden.slug}`, "/wiki/renamed-secret", `/entries/${hidden.entryId}/backlinks`, "/entries/never-existed/backlinks"]) {
      const response = await get(path); expect(response.statusCode).toBe(404); expect(response.body).toBe(missing.body);
    }
    const gmAlias = await get(`/wiki/${hidden.slug}`, gmCookie);
    expect(gmAlias.json()).toEqual({ entryId: hidden.entryId, slug: "renamed-secret", title: "Renamed secret" });
  });

  it("resolves an authored slug link after learning its target and keeps it through a rename without rewriting the source", async () => {
    const target = await docs.saveEntry(gm, campaignId, { title: "Future destination", passages: [paragraph("Knowledge")] });
    const source = await docs.saveEntry(gm, campaignId, { title: "A promise", passages: [link("Follow the old name", target.slug)] });
    await docs.revealPassage(gm, campaignId, source.passagen[0]!.pid, actor);
    expect(JSON.stringify((await get(`/entries/${source.entryId}`)).json())).not.toContain(target.entryId);
    await docs.revealPassage(gm, campaignId, target.passagen[0]!.pid, actor);
    await docs.saveEntry(gm, campaignId, { title: "New destination name", slug: "new-destination-name", expectedVersion: 1, passages: [{ ...paragraph("Knowledge"), pid: target.passagen[0]!.pid }] }, target.entryId);
    expect((await get(`/entries/${source.entryId}`)).json().passagen[0].inhalt.inhalt[0].marks[0].zielEntryId).toBe(target.entryId);
    expect((await get(`/wiki/${target.slug}`)).json().slug).toBe("new-destination-name");
    expect((await get(`/entries/${target.entryId}/backlinks`)).json()[0].entryId).toBe(source.entryId);
    expect((await docs.getEntry(gm, campaignId, source.entryId)).revisionId).toBe(source.revisionId);
    expect((await docs.history(gm, campaignId, source.entryId))).toHaveLength(1);
  });

  it("reserves old slugs for their original entry and permits that entry to reclaim one", async () => {
    const target = await docs.saveEntry(gm, campaignId, { title: "Reserved name", passages: [paragraph("Original")] });
    await docs.saveEntry(gm, campaignId, { title: "Moved", slug: "reserved-name-moved", expectedVersion: 1, passages: [{ ...paragraph("Original"), pid: target.passagen[0]!.pid }] }, target.entryId);
    await expect(docs.saveEntry(gm, campaignId, { title: "Impostor", slug: target.slug, passages: [paragraph("Different article")] })).rejects.toBeInstanceOf(Conflict);
    await docs.saveEntry(gm, campaignId, { title: "Original again", slug: target.slug, expectedVersion: 2, passages: [{ ...paragraph("Original"), pid: target.passagen[0]!.pid }] }, target.entryId);
    expect((await get(`/wiki/${target.slug}`, gmCookie)).json().entryId).toBe(target.entryId);
  });

  it("downloads the complete native campaign only for its GM, excluding credentials", async () => {
    const response = await get("/export", gmCookie);
    expect(response.statusCode, response.body).toBe(200);
    expect(response.headers["content-disposition"]).toContain("campaign.chronicle");
    const bundle = parseCampaignBundleV4(response.body);
    expect(bundle.manifest.campaignId).toBe(campaignId);
    expect(bundle.tables.entries.length).toBeGreaterThan(0);
    expect(bundle.tables).not.toHaveProperty("credentials");
    expect(response.body).not.toContain(config.cookieSecret);
    expect(response.body).not.toContain(gmCookie);
    const denied = await get("/export");
    expect(denied.statusCode).toBe(404);
    expect((await get("/export", "")).body).toBe(denied.body);
  });
});
