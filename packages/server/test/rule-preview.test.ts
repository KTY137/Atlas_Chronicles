import { seedActorControl } from "./actor-fixtures.ts";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DEMO_RULE_PACKAGE } from "@chronicle/rules";
import { createTestDb, migrate, type Db } from "../src/db/index.ts";
import { createCampaigns } from "../src/domain/campaigns.ts";
import { createGameplay } from "../src/domain/gameplay.ts";
import { createIdentity } from "../src/identity/index.ts";
import { buildApp } from "../src/app.ts";

const config = { origin: "https://chronicle.test", cookieSecret: "rule-preview-cookie-secret-long-enough", bootstrapToken: "rule-preview-bootstrap-secret-long-enough" };
const next = { ...DEMO_RULE_PACKAGE, version: "1.1.0", migrations: [{ from: "1.0.0", to: "1.1.0", steps: [{ kind: "numeric", field: "insight", expression: "min(6, actor.value + 1)" }] }] };

describe("reviewed rule activation", () => {
  let db: Db, app: Awaited<ReturnType<typeof buildApp>>;
  beforeAll(async () => { db = await createTestDb(); await migrate(db); app = await buildApp(db, config); }, 30_000);
  afterAll(async () => { await app?.close(); await db?.close(); });
  async function fixture() {
    const gm = randomUUID(), player = randomUUID(), actor = randomUUID();
    for (const [id, role] of [[gm, "leitung"], [player, "gast"]]) await db.query("INSERT INTO users(id,display_name,platform_role,created_at) VALUES($1,$1,$2,1)", [id, role]);
    const campaignId = (await createCampaigns(db).createCampaign(gm, { name: "Regelvorschau" })).id;
    await db.query("INSERT INTO actors(id,campaign_id,user_id,name) VALUES($1,$2,$3,'Sera')", [actor, campaignId, player]);
    await db.query("INSERT INTO campaign_memberships(campaign_id,user_id,role,display_name,name_skeleton,actor_id) VALUES($1,$2,'spieler','Sera','sera',$3)", [campaignId, player, actor]);
    await seedActorControl(db, campaignId, actor, player);
    const identity = createIdentity(db, config), game = createGameplay(db);
    const gmCookie = `chronicle_session=${(await identity.issueSession(gm)).value}`, playerCookie = `chronicle_session=${(await identity.issueSession(player)).value}`;
    const post = (suffix: string, body: unknown, cookie = gmCookie) => app.inject({ method: "POST", url: `/api/campaigns/${campaignId}/rules${suffix}`, headers: { cookie, origin: config.origin, "content-type": "application/json" }, payload: JSON.stringify(body) });
    await game.updateSheet(player, campaignId, { actorId: actor, expectedVersion: 0, fields: { insight: 2 } });
    return { gm, player, actor, campaignId, game, post, playerCookie };
  }

  it("previews an uninstalled draft without writes and exposes live sheets only to the GM", async () => {
    const f = await fixture();
    const before = (await db.query("SELECT * FROM actor_sheets WHERE campaign_id=$1", [f.campaignId])).rows;
    const result = await f.post("/preview", { package: next });
    expect(result.statusCode).toBe(200);
    expect(result.json()).toMatchObject({ from: { id: next.id, version: "1.0.0" }, to: { id: next.id, version: "1.1.0" }, pinVersion: 0, migration: { entities: [{ id: f.actor, before: { insight: 2 }, after: { insight: 3 } }] }, previewHash: expect.stringMatching(/^[a-f0-9]{64}$/) });
    expect((await db.query("SELECT * FROM actor_sheets WHERE campaign_id=$1", [f.campaignId])).rows).toEqual(before);
    expect((await f.game.listPackages(f.gm, f.campaignId)).packages.some(pkg => pkg.version === next.version)).toBe(false);
    const denied = await f.post("/preview", { package: next }, f.playerCookie);
    expect(denied.statusCode).toBe(404); expect(denied.body).not.toContain(f.actor);
    expect((await f.post("/preview", { package: { ...next, schemaVersion: 999 } })).statusCode).toBe(400);
  });

  it("rejects a stale reviewed snapshot even when a sheet rewrite retained identical values", async () => {
    const f = await fixture();
    const review = await f.post("/preview", { package: next }); expect(review.statusCode).toBe(200);
    await f.game.installPackage(f.gm, f.campaignId, next);
    const sheet = await f.game.getSheet(f.player, f.campaignId, f.actor);
    await f.game.updateSheet(f.player, f.campaignId, { actorId: f.actor, expectedVersion: sheet.version, fields: sheet.fields });
    const stale = await f.post("/activate", { packageId: next.id, packageVersion: next.version, expectedVersion: 0, previewHash: review.json().previewHash });
    expect(stale.statusCode).toBe(409);
    expect((await f.game.getSheet(f.player, f.campaignId, f.actor)).fields.insight).toBe(2);
    expect((await f.game.listPackages(f.gm, f.campaignId)).version).toBe(0);
    const refreshed = (await f.post("/preview", { package: next })).json();
    expect(refreshed.previewHash).not.toBe(review.json().previewHash);
    expect((await f.post("/activate", { packageId: next.id, packageVersion: next.version, expectedVersion: refreshed.pinVersion, previewHash: refreshed.previewHash })).statusCode).toBe(200);
    expect((await f.game.getSheet(f.player, f.campaignId, f.actor)).fields.insight).toBe(3);
  });

  it("binds review to exact target content and newly persisted sheets", async () => {
    const f = await fixture(), alternative = { ...next, name: "Andere Regeln" };
    const review = await f.post("/preview", { package: next }); expect(review.statusCode).toBe(200);
    await f.game.installPackage(f.gm, f.campaignId, alternative);
    expect((await f.post("/activate", { packageId: next.id, packageVersion: next.version, expectedVersion: 0, previewHash: review.json().previewHash })).statusCode).toBe(409);
    const exact = (await f.post("/preview", { package: alternative })).json();
    const actor = randomUUID();
    await db.query("INSERT INTO actors(id,campaign_id,user_id,name) VALUES($1,$2,$3,'Zweite Figur')", [actor, f.campaignId, f.gm]);
    await seedActorControl(db, f.campaignId, actor, f.gm);
    await f.game.updateSheet(f.gm, f.campaignId, { actorId: actor, expectedVersion: 0, fields: { insight: 4 } });
    expect((await f.post("/activate", { packageId: next.id, packageVersion: next.version, expectedVersion: 0, previewHash: exact.previewHash })).statusCode).toBe(409);
    expect((await f.game.getSheet(f.gm, f.campaignId, actor)).fields.insight).toBe(4);
  });
});
