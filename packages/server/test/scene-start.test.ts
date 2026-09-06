import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import type { TacticalMapDocumentV1 } from "@chronicle/szene";
import { buildApp } from "../src/app.ts";
import { createTestDb, migrate, type Db } from "../src/db/index.ts";
import { createIdentity } from "../src/identity/index.ts";
import { createCampaigns } from "../src/domain/campaigns.ts";
import { createGameplay } from "../src/domain/gameplay.ts";
import { createTactical } from "../src/domain/tactical.ts";

describe("scene start preserves reviewed preparation", () => {
  let db: Db, app: FastifyInstance, gm: string, cookie: string;
  const config = { origin: "https://scene-start.test", cookieSecret: "scene-start-test-cookie-secret-more-than-32-characters", bootstrapToken: "scene-start-bootstrap-secret-long-enough" };
  beforeAll(async () => {
    db = await createTestDb(); await migrate(db);
    const identity = createIdentity(db, config); gm = (await identity.bootstrap("Kaya")).userId;
    cookie = `chronicle_session=${(await identity.issueSession(gm)).value}`;
    app = await buildApp(db, config);
  }, 30_000);
  afterAll(async () => { await app?.close(); await db?.close(); });
  async function fixture() {
    const campaign = (await createCampaigns(db).createCampaign(gm, { name: "Start consistency" })).id;
    const game = createGameplay(db), tactical = createTactical(db);
    const first = await game.createScene(gm, campaign, { name: "Current", entryIds: [], fictionDate: "One" });
    const next = await game.createScene(gm, campaign, { name: "Prepared", entryIds: [], fictionDate: "Two" });
    const active = await game.startScene(gm, campaign, first.id);
    const document: TacticalMapDocumentV1 = { schemaVersion: 1, kind: "tactical-map", coordinates: "image-pixels",
      frame: { ursprung: [0, 0], einheitenProPixel: 1, ordnung: "xy", hoch: "unten" }, geometry: { v: 3, size: [64, 64], stamps: [], places: [], regions: [] },
      grid: { kind: "none" }, elevation: 0, geometryElevation: [], walls: [], portals: [], lights: [], environment: { bakedLighting: false, ambientLightArgb: "ffffffff" }, background: null };
    const map = await tactical.importMap(gm, campaign, { commandId: randomUUID(), name: "Map", format: "native", sourceText: JSON.stringify(document),
      provenance: { name: "Fixture", creator: "Test", sourceUrl: null, license: "CC0-1.0", licenseUrl: null, retrievedAt: null, generator: null, generatorVersion: null } });
    const save = (expectedVersion: number) => tactical.savePlan(gm, campaign, next.id, { commandId: randomUUID(), expectedVersion, mapId: map.subjectId, mapRevision: 1, tokens: [] });
    const start = (payload?: unknown) => app.inject({ method: "POST", url: `/api/campaigns/${campaign}/scenes/${next.id}/start`, headers: { cookie, origin: config.origin }, ...(payload === undefined ? {} : { payload: payload as object }) });
    return { campaign, game, next, active, save, start };
  }
  it("rejects an unseen plan revision before ending the current session", async () => {
    const f = await fixture(); await f.save(0); await f.save(1);
    expect((await f.start({ expectedSceneVersion: 1, expectedPlanVersion: 1 })).statusCode).toBe(409);
    expect((await db.query("SELECT id FROM game_sessions WHERE campaign_id=$1 AND ended_at IS NULL", [f.campaign])).rows).toEqual([{ id: f.active.id }]);
    const accepted = await f.start({ expectedSceneVersion: 1, expectedPlanVersion: 2 }); expect(accepted.statusCode).toBe(200);
    const initial = (await db.query("SELECT initial_hash FROM session_tactical_states WHERE session_id=$1", [accepted.json().id])).rows;
    expect(initial).toHaveLength(1);
    // Editing tomorrow's plan must not recapture a currently active scene on a retry.
    await f.save(2);
    expect((await f.start({ expectedSceneVersion: 1, expectedPlanVersion: 2 })).json()).toEqual(accepted.json());
    expect((await db.query("SELECT initial_hash FROM session_tactical_states WHERE session_id=$1", [accepted.json().id])).rows).toEqual(initial);
  });
  it("rejects a stale scene version and malformed preconditions while keeping empty-body compatibility", async () => {
    const f = await fixture();
    expect((await f.start({ expectedSceneVersion: 2, expectedPlanVersion: 0 })).statusCode).toBe(409);
    expect((await f.start({ expectedSceneVersion: -1 })).statusCode).toBe(400);
    expect((await f.start()).statusCode).toBe(200);
    expect((await db.query("SELECT id FROM game_sessions WHERE campaign_id=$1", [f.campaign])).rowCount).toBe(2);
  });
});
