// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { TacticalMapDocumentV1 } from "@chronicle/szene";
import { createTestDb, migrate, type Db } from "../src/db/index.ts";
import { createIdentity } from "../src/identity/index.ts";
import { createCampaigns } from "../src/domain/campaigns.ts";
import { createGameplay } from "../src/domain/gameplay.ts";
import { createTactical } from "../src/domain/tactical.ts";
import { createCommunication } from "../src/domain/communication.ts";

describe("tactical scene and live integration", () => {
  let db: Db;
  beforeAll(async () => { db = await createTestDb(); await migrate(db); }, 30_000);
  afterAll(async () => db?.close());
  it("starts a legitimate large tactical map through gameplay and synchronizes its projected digest", async () => {
    const config = { origin: "https://tactical-integration.test", cookieSecret: "tactical-integration-cookie-secret-with-more-than-32-characters" };
    const gm = (await createIdentity(db, config).bootstrap("Kaya")).userId;
    const campaign = (await createCampaigns(db).createCampaign(gm, { name: "Large tactical map" })).id;
    const tactical = createTactical(db), game = createGameplay(db);
    const document: TacticalMapDocumentV1 = { schemaVersion: 1, kind: "tactical-map", coordinates: "image-pixels",
      frame: { ursprung: [0, 0], einheitenProPixel: 1, ordnung: "xy", hoch: "unten" },
      geometry: { v: 3, size: [512, 512], regions: [], places: [], stamps: Array.from({ length: 20_000 }, (_, i) => ({
        id: `source-stamp-${String(i).padStart(8, "0")}`, a: "pk.test/tree", x: i % 512, y: Math.floor(i / 512), s: 1, r: 0, l: 0,
      })) }, grid: { kind: "none" }, elevation: 0, geometryElevation: [], walls: [], portals: [], lights: [],
      environment: { bakedLighting: false, ambientLightArgb: "ffffffff" }, background: null };
    const sourceText = JSON.stringify(document); expect(Buffer.byteLength(sourceText)).toBeGreaterThan(1024 * 1024);
    const map = await tactical.importMap(gm, campaign, { commandId: randomUUID(), name: "Twenty thousand stamps", format: "native", sourceText,
      provenance: { name: "Large native fixture", creator: "Test", sourceUrl: null, license: "CC0-1.0", licenseUrl: null, retrievedAt: null, generator: null, generatorVersion: null } });
    const scene = await game.createScene(gm, campaign, { name: "Large scene", entryIds: [], fictionDate: "Day one" });
    await tactical.savePlan(gm, campaign, scene.id, { commandId: randomUUID(), expectedVersion: 0, mapId: map.subjectId, mapRevision: 1, tokens: [] });
    // No direct capture helper: this verifies the production gameplay integration.
    const session = await game.startScene(gm, campaign, scene.id), view = await tactical.getActive(gm, campaign);
    expect(view?.sessionId).toBe(session.id); expect(view?.document?.geometry.stamps).toHaveLength(20_000);
    const initial = (await db.query("SELECT initial_hash FROM session_tactical_states WHERE session_id=$1", [session.id])).rows;
    expect((await game.startScene(gm, campaign, scene.id)).id).toBe(session.id);
    expect((await db.query("SELECT initial_hash FROM session_tactical_states WHERE session_id=$1", [session.id])).rows).toEqual(initial);
    // A new cursor starts at zero; hashing this unchanged map must stay stable.
    await expect(createCommunication(db).sync(gm, campaign)).resolves.toBe(0);
    await expect(createCommunication(db).sync(gm, campaign)).resolves.toBe(0);
  }, 30_000);
});
