// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDb, migrate, type Db } from "../src/db/index.ts";
import { createIdentity } from "../src/identity/index.ts";
import { createCampaigns } from "../src/domain/campaigns.ts";
import { createActors } from "../src/domain/actors.ts";
import { createActorPortraits } from "../src/domain/actor-portrait.ts";
import { createActorDeletion } from "../src/domain/actor-deletion.ts";
import { Conflict, Gone } from "../src/domain/errors.ts";
import { ACTOR_PORTRAIT_LIMITS } from "../../protocol/src/actor-portrait.ts";
import { buildApp } from "../src/app.ts";

const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aC1kAAAAASUVORK5CYII=", "base64");
const config = { origin: "https://portrait.test", cookieSecret: "portrait-test-cookie-secret-more-than-32-characters", bootstrapToken: "portrait-test-bootstrap-token-more-than-32-characters" };

describe("character portraits: original bytes, authority and independent revisions", () => {
  let db: Db, gm: string, app: Awaited<ReturnType<typeof buildApp>>;
  beforeAll(async () => { db = await createTestDb(); await migrate(db); gm = (await createIdentity(db, config).bootstrap("Portrait GM")).userId; app = await buildApp(db, config); }, 30_000);
  afterAll(async () => { await app?.close(); await db?.close(); });
  async function fixture() {
    const campaigns = createCampaigns(db), campaign = (await campaigns.createCampaign(gm, { name: "Portrait fixture" })).id;
    const invite = await campaigns.issueInvitation(gm, campaign);
    const a = await campaigns.approveJoin(gm, campaign, (await campaigns.requestJoin(invite.code, { displayName: "Sera" })).id);
    const b = await campaigns.approveJoin(gm, campaign, (await campaigns.requestJoin(invite.code, { displayName: "Liva" })).id);
    return { campaign, a, b, portraits: createActorPortraits(db), actors: createActors(db) };
  }
  it("stores the original, accepts an acknowledgement retry, retains removal revisions and rejects a stale revival", async () => {
    const f = await fixture();
    expect(await f.portraits.get(f.a.userId, f.campaign, f.a.actorId)).toMatchObject({ version: 0, image: null });
    const saved = await f.portraits.upload(f.a.userId, f.campaign, f.a.actorId, 0, png);
    expect(saved).toMatchObject({ version: 1, image: { mime: "image/png", width: 1, height: 1, bytes: png.length } });
    expect((await f.portraits.file(gm, f.campaign, f.a.actorId)).data).toEqual(png);
    expect(await f.portraits.upload(f.a.userId, f.campaign, f.a.actorId, 0, png)).toEqual(saved);
    const cleared = await f.portraits.remove(f.a.userId, f.campaign, f.a.actorId, 1);
    expect(cleared).toMatchObject({ version: 2, image: null });
    expect(await f.portraits.remove(f.a.userId, f.campaign, f.a.actorId, 1)).toEqual(cleared);
    await expect(f.portraits.upload(f.a.userId, f.campaign, f.a.actorId, 0, png)).rejects.toBeInstanceOf(Conflict);
    await expect(f.portraits.file(f.a.userId, f.campaign, f.a.actorId)).rejects.toBeInstanceOf(Gone);
    expect((await f.actors.getActor(gm, f.campaign, f.a.actorId)).version).toBe(1);
  });
  it("denies other players, other campaigns and revoked controllers on metadata, bytes and mutations", async () => {
    const f = await fixture(), other = (await createCampaigns(db).createCampaign(gm, { name: "Other world" })).id;
    await f.portraits.upload(f.a.userId, f.campaign, f.a.actorId, 0, png);
    for (const user of [f.b.userId, randomUUID()]) {
      await expect(f.portraits.get(user, f.campaign, f.a.actorId)).rejects.toBeInstanceOf(Gone);
      await expect(f.portraits.file(user, f.campaign, f.a.actorId)).rejects.toBeInstanceOf(Gone);
      await expect(f.portraits.upload(user, f.campaign, f.a.actorId, 1, png)).rejects.toBeInstanceOf(Gone);
      await expect(f.portraits.remove(user, f.campaign, f.a.actorId, 1)).rejects.toBeInstanceOf(Gone);
    }
    await expect(f.portraits.get(gm, other, f.a.actorId)).rejects.toBeInstanceOf(Gone);
    await f.actors.revokeController(gm, f.campaign, f.a.actorId, f.a.userId, { commandId: randomUUID(), expectedVersion: 1, reason: "Controller reassigned" });
    await expect(f.portraits.file(f.a.userId, f.campaign, f.a.actorId)).rejects.toBeInstanceOf(Gone);
    await expect(f.portraits.upload(f.a.userId, f.campaign, f.a.actorId, 1, png)).rejects.toBeInstanceOf(Gone);
  });
  it("rejects scripts, oversized files and excessive dimensions before storing any portrait", async () => {
    const f = await fixture();
    await expect(f.portraits.upload(f.a.userId, f.campaign, f.a.actorId, 0, Buffer.from("<svg onload='alert(1)'/>"))).rejects.toThrow();
    await expect(f.portraits.upload(f.a.userId, f.campaign, f.a.actorId, 0, Buffer.alloc(ACTOR_PORTRAIT_LIMITS.bytes + 1))).rejects.toThrow(/8 MB/);
    const huge = Buffer.from(png); huge.writeUInt32BE(4097, 16);
    await expect(f.portraits.upload(f.a.userId, f.campaign, f.a.actorId, 0, huge)).rejects.toThrow(/4096/);
    expect(await f.portraits.get(f.a.userId, f.campaign, f.a.actorId)).toMatchObject({ version: 0, image: null });
  });
  it("serves an owner upload through HTTP with private raster headers and rejects CSRF and strangers", async () => {
    const f = await fixture(), session = await createIdentity(db, config).issueSession(f.a.userId), outsider = await createIdentity(db, config).issueSession(f.b.userId);
    const base = "/api/campaigns/" + f.campaign + "/actors/" + f.a.actorId + "/portrait";
    const headers = { cookie: "chronicle_session=" + session.value, origin: config.origin, "content-type": "application/octet-stream" };
    expect((await app.inject({ method: "PUT", url: base + "/bytes?expectedVersion=0", headers: { ...headers, origin: "https://elsewhere.test" }, payload: png })).statusCode).toBe(404);
    expect(await f.portraits.get(f.a.userId, f.campaign, f.a.actorId)).toMatchObject({ version: 0, image: null });
    const huge = Buffer.from(png); huge.writeUInt32BE(4097, 16);
    const invalid = await app.inject({ method: "PUT", url: base + "/bytes?expectedVersion=0", headers, payload: huge });
    expect(invalid.statusCode).toBe(400); expect(invalid.json().error).toContain("4096");
    expect((await app.inject({ method: "PUT", url: base + "/bytes?expectedVersion=0", headers, payload: png })).statusCode).toBe(200);
    const image = await app.inject({ method: "GET", url: base + "/file", headers: { cookie: headers.cookie } });
    expect(image.statusCode).toBe(200); expect(image.rawPayload).toEqual(png);
    expect(image.headers["content-type"]).toBe("image/png"); expect(image.headers["x-content-type-options"]).toBe("nosniff");
    expect(image.headers["cache-control"]).toContain("no-store");
    expect((await app.inject({ method: "GET", url: base + "/file", headers: { cookie: "chronicle_session=" + outsider.value } })).statusCode).toBe(404);
    expect((await app.inject({ method: "DELETE", url: base, headers: { cookie: headers.cookie, origin: config.origin }, payload: { expectedVersion: 1 } })).statusCode).toBe(200);
    expect((await app.inject({ method: "GET", url: base, headers: { cookie: headers.cookie } })).json()).toMatchObject({ version: 2, image: null });
  });
  it("reports a protected deletion's actual history conflict through HTTP while leaving every actor row intact", async () => {
    const f = await fixture(), session = await createIdentity(db, config).issueSession(gm);
    const item = await f.actors.createItemTemplate(gm, f.campaign, { commandId: randomUUID(), definition: { schemaVersion: 1, name: "History test", loreEntryId: null, tags: [] } });
    await f.actors.instantiateItem(gm, f.campaign, { commandId: randomUUID(), templateId: item.id, templateRevision: 1, holderActorId: f.a.actorId });
    const result = await app.inject({ method: "DELETE", url: "/api/campaigns/" + f.campaign + "/actors/" + f.a.actorId,
      headers: { cookie: "chronicle_session=" + session.value, origin: config.origin }, payload: { commandId: randomUUID(), expectedVersion: 1, reason: "Regression check" } });
    expect(result.statusCode).toBe(400);
    expect(result.json().error).toContain("Historie"); expect(result.json().error).toContain("Archiviere");
    expect((await f.actors.getActor(gm, f.campaign, f.a.actorId)).id).toBe(f.a.actorId);
  });
  it("removes the portrait with an unused actor while keeping the player's membership", async () => {
    const f = await fixture(); await f.portraits.upload(f.a.userId, f.campaign, f.a.actorId, 0, png);
    await createActorDeletion(db).deleteActor(gm, f.campaign, f.a.actorId, { commandId: randomUUID(), expectedVersion: 1, reason: "Test character duplicated" });
    expect((await db.query("SELECT 1 FROM actor_portraits WHERE actor_id=$1", [f.a.actorId])).rowCount).toBe(0);
    expect((await db.query("SELECT actor_id FROM campaign_memberships WHERE campaign_id=$1 AND user_id=$2", [f.campaign, f.a.userId])).rows[0]).toMatchObject({ actor_id: null });
  });
});
