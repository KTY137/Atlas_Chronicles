// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../src/app.ts";
import { createTestDb, migrate, type Db } from "../src/db/index.ts";
import { createIdentity } from "../src/identity/index.ts";
import { createCampaigns } from "../src/domain/campaigns.ts";
import { createDocuments } from "../src/domain/documents.ts";

const config = { origin: "https://chronicle.test", cookieSecret: "wiki-move-secret-long-enough-for-test", bootstrapToken: "wiki-move-bootstrap-secret-long-enough" };
describe("moving wiki entries keeps the existing campaign and knowledge boundaries", () => {
  let db: Db, app: Awaited<ReturnType<typeof buildApp>>, campaignId: string, gmCookie: string, playerCookie: string, entryId: string;
  const a = randomUUID(), b = randomUUID(), other = randomUUID(), foreign = randomUUID();
  const move = (body: unknown, cookie = gmCookie, id = entryId) => app.inject({ method: "POST", url: `/api/campaigns/${campaignId}/entries/${id}/navigation`, headers: { cookie, origin: config.origin }, payload: body as object });
  beforeAll(async () => {
    db = await createTestDb(); await migrate(db);
    const identity = createIdentity(db, config), campaigns = createCampaigns(db);
    const gm = await identity.bootstrap("Navigation GM");
    gmCookie = `chronicle_session=${gm.value}`;
    campaignId = (await campaigns.createCampaign(gm.userId, { name: "Move world" })).id;
    const invitation = await campaigns.issueInvitation(gm.userId, campaignId);
    const request = await campaigns.requestJoin(invitation.code, { displayName: "Reader" });
    const player = await campaigns.approveJoin(gm.userId, campaignId, request.id);
    playerCookie = `chronicle_session=${(await identity.issueSession(player.userId)).value}`;
    const second = (await campaigns.createCampaign(gm.userId, { name: "Other world" })).id;
    entryId = (await createDocuments(db).saveEntry(gm.userId, campaignId, { title: "Secret article", passages: [{ inhalt: { kind: "absatz", inhalt: [{ text: "Still secret", marks: [] }] } }] })).entryId;
    for (const id of [a, b, other, foreign]) await db.query("INSERT INTO categories(id,campaign_id,slug,title) VALUES($1,$2,$1,$1)", [id, id === foreign ? second : campaignId]);
    for (const id of [a, other]) await db.query("INSERT INTO entry_categories(campaign_id,entry_id,category_id) VALUES($1,$2,$3)", [campaignId, entryId, id]);
    app = await buildApp(db, config);
  }, 30_000);
  afterAll(async () => { await app?.close(); await db?.close(); });
  const input = () => ({ fromCategoryId: a, destination: { kind: "category", id: b }, expectedCategoryIds: [a, other], expectedArt: "sonstiges" });

  it("rejects player writes and unknown entries without revealing existence", async () => {
    const denied = await move(input(), playerCookie);
    expect(denied.statusCode).toBe(404);
    expect((await move(input(), playerCookie, randomUUID())).body).toBe(denied.body);
  });
  it("validates the closed command and destination campaign before any write", async () => {
    expect((await move({ ...input(), unexpected: true })).statusCode).toBe(400);
    expect((await move({ ...input(), destination: { kind: "category", id: foreign } })).statusCode).toBe(404);
    expect((await move({ ...input(), fromCategoryId: b })).statusCode).toBe(409);
  });
  it("replaces only the source category, preserving other memberships, text and reader secrecy", async () => {
    const response = await move(input());
    expect(response.statusCode, response.body).toBe(200);
    expect(response.json().kategorieIds).toEqual([b, other].sort());
    const entry = (await db.query<{ title: string; version: number }>("SELECT title,version FROM entries WHERE id=$1", [entryId])).rows[0];
    expect(entry).toEqual({ title: "Secret article", version: 1 });
    const nav = await app.inject({ url: `/api/campaigns/${campaignId}/navigation`, headers: { cookie: playerCookie } });
    expect(nav.body).not.toMatch(/Secret article|Still secret/);
    expect(nav.json().artikel.find((value: { id: string }) => value.id === entryId).bekannt).toBe(false);
  });
  it("rejects a stale move and permits explicit reclassification into a built-in group", async () => {
    expect((await move(input())).statusCode).toBe(409);
    const response = await move({ fromCategoryId: b, destination: { kind: "art", art: "ort" }, expectedCategoryIds: [b, other], expectedArt: "sonstiges" });
    expect(response.statusCode, response.body).toBe(200);
    expect(response.json()).toEqual({ entryId, art: "ort", kategorieIds: [] });
    const recategorized = await move({ fromCategoryId: null, destination: { kind: "category", id: a }, expectedCategoryIds: [], expectedArt: "ort" });
    expect(recategorized.statusCode, recategorized.body).toBe(200);
    expect(recategorized.json().kategorieIds).toEqual([a]);
  });
});
