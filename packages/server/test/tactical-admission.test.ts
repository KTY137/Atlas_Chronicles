// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { randomBytes, randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { buildApp } from "../src/app.ts";
import { createTestDb, migrate, type Db } from "../src/db/index.ts";
import { createIdentity } from "../src/identity/index.ts";
import { createCampaigns } from "../src/domain/campaigns.ts";
import { createGameplay } from "../src/domain/gameplay.ts";
import { createTactical } from "../src/domain/tactical.ts";
import * as raster from "../src/domain/tactical-raster.ts";

describe("tactical HTTP admission keeps the application usable under tile traffic", () => {
  let db: Db, cookie: string, campaign: string, mapId: string, sessionId: string;
  const config = { origin: "https://tactical-admission.test", cookieSecret: randomBytes(32).toString("hex"), bootstrapToken: randomBytes(32).toString("hex") };
  const base = () => `/api/campaigns/${campaign}`;
  const mapTile = () => `${base()}/tactical/maps/${mapId}/tiles/0/0/0`;
  const liveTile = () => `${base()}/sessions/${sessionId}/tactical/tiles/0/0/0`;
  beforeAll(async () => {
    db = await createTestDb(); await migrate(db);
    const identity = createIdentity(db, config), gm = (await identity.bootstrap("Kaya")).userId;
    cookie = `chronicle_session=${(await identity.issueSession(gm)).value}`;
    campaign = (await createCampaigns(db).createCampaign(gm, { name: "Tile admission" })).id;
    const tactical = createTactical(db);
    mapId = (await tactical.importMap(gm, campaign, {
      commandId: randomUUID(), name: "Small native map", format: "native",
      sourceText: JSON.stringify({ schemaVersion: 1, kind: "tactical-map", coordinates: "image-pixels",
        frame: { ursprung: [0, 0], einheitenProPixel: 1, ordnung: "xy", hoch: "unten" },
        geometry: { v: 3, size: [64, 64], stamps: [], regions: [], places: [] },
        grid: { kind: "square", size: 8, origin: [0, 0] }, elevation: 0, geometryElevation: [], walls: [], portals: [], lights: [],
        environment: { bakedLighting: false, ambientLightArgb: "ffffffff" }, background: null }),
      provenance: { name: "Fixture", creator: "Fixture", license: "CC0-1.0", sourceUrl: null, licenseUrl: null, retrievedAt: null, generator: null, generatorVersion: null },
    })).subjectId;
    const game = createGameplay(db), scene = await game.createScene(gm, campaign, { name: "Tile scene", entryIds: [], fictionDate: "Today" });
    await tactical.savePlan(gm, campaign, scene.id, { commandId: randomUUID(), expectedVersion: 0, mapId, mapRevision: 1, tokens: [] });
    sessionId = String((await game.startScene(gm, campaign, scene.id)).id);
  }, 30_000);
  afterEach(() => vi.restoreAllMocks());
  afterAll(async () => db?.close());

  it("serves over 240 real tiles without spending the unchanged 240-request application budget", async () => {
    const app = await buildApp(db, config);
    try {
      for (let i = 0; i < 241; i++) {
        const response = await app.inject({ url: i % 2 ? liveTile() : mapTile(), headers: { cookie } });
        expect(response.statusCode, `tile ${i + 1}`).toBe(200);
        expect(response.headers["content-type"]).toBe("image/png");
      }
      for (let i = 0; i < 240; i++) {
        const response = await app.inject({ url: `${base()}/tactical/maps`, headers: { cookie } });
        expect(response.statusCode, `map list ${i + 1}`).toBe(200);
        expect(response.json().some((map: { id: string }) => map.id === mapId)).toBe(true);
      }
      expect((await app.inject({ url: `${base()}/tactical/maps`, headers: { cookie } })).statusCode).toBe(429);
      expect((await app.inject({ url: mapTile(), headers: { cookie } })).statusCode).toBe(200);
    } finally { await app.close(); }
  }, 30_000);

  it("shares a bounded tile bucket across both routes, resists forged identities, and keeps real users separate", async () => {
    const app = await buildApp(db, config);
    try {
      for (let i = 0; i < 768; i++) {
        const response = await app.inject({ url: i % 2 ? liveTile() : mapTile(),
          headers: { cookie: `chronicle_session=forged-${i}`, "x-user-id": randomUUID() } });
        expect(response.statusCode, `denied tile ${i + 1}`).toBe(404);
      }
      for (const url of [mapTile(), liveTile()]) {
        const response = await app.inject({ url });
        expect(response.statusCode).toBe(429);
        expect(Number(response.headers["retry-after"])).toBeGreaterThan(0);
        expect(Number(response.headers["retry-after"])).toBeLessThanOrEqual(60);
      }
      expect((await app.inject({ url: "/api/health" })).statusCode).toBe(200);
      expect((await app.inject({ url: mapTile(), headers: { cookie } })).statusCode).toBe(200);
    } finally { await app.close(); }
  }, 30_000);

  it.each(["busy", "timeout"] as const)("reports raster %s as retryable 503 after authorization, then recovers", async code => {
    const app = await buildApp(db, config);
    try {
      const render = vi.spyOn(raster, "renderTacticalTile").mockRejectedValueOnce(new raster.TacticalRasterError(code, "private worker details"));
      const denied = await app.inject({ url: mapTile() });
      expect(denied.statusCode).toBe(404); expect(render).not.toHaveBeenCalled();
      const response = await app.inject({ url: mapTile(), headers: { cookie } });
      expect(response.statusCode).toBe(503);
      expect(response.headers["retry-after"]).toBe("1");
      expect(response.headers["cache-control"]).toBe("no-store");
      expect(response.json().error).not.toContain("private worker");
      expect((await app.inject({ url: mapTile(), headers: { cookie } })).statusCode).toBe(200);
    } finally { await app.close(); }
  });

  it("keeps malformed raster input at 400 and unexpected faults at 500 without retry advice", async () => {
    const app = await buildApp(db, config);
    try {
      vi.spyOn(raster, "renderTacticalTile")
        .mockRejectedValueOnce(new raster.TacticalRasterError("invalid", "private decoder details"))
        .mockRejectedValueOnce(new Error("private unexpected fault"));
      for (const status of [400, 500]) {
        const response = await app.inject({ url: mapTile(), headers: { cookie } });
        expect(response.statusCode).toBe(status); expect(response.headers["retry-after"]).toBeUndefined();
        expect(response.json().error).not.toContain("private");
      }
    } finally { await app.close(); }
  });
});
