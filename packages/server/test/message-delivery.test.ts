// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { randomUUID } from "node:crypto";
import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { createTestDb, migrate, type Db } from "../src/db/index.ts";
import { createIdentity } from "../src/identity/index.ts";
import { createCampaigns } from "../src/domain/campaigns.ts";
import { createCommunication } from "../src/domain/communication.ts";
import { createGameplay } from "../src/domain/gameplay.ts";
import { Conflict } from "../src/domain/errors.ts";

describe("delivery stays visible and bound to the intended table", () => {
  let db: Db, gm: string;
  const config = { origin: "https://chronicle.test", cookieSecret: "message-delivery-test-cookie-secret-32-long", now: () => 1_800_000_000_000 };
  beforeAll(async () => { db = await createTestDb(); await migrate(db); gm = (await createIdentity(db, config).bootstrap("Kaya")).userId; }, 30_000);
  afterAll(async () => { await db?.close(); });

  it("includes newly saved posts after the channel exceeds 500 messages", async () => {
    const campaign = (await createCampaigns(db, config).createCampaign(gm, { name: "Long campaign" })).id;
    await db.query(`INSERT INTO campaign_messages(id,campaign_id,user_id,author_name,body,kind,created_at)
      SELECT 'post-'||n,$1,$2,'Kaya','Post '||n,'letter',n FROM generate_series(1,501) AS n`, [campaign, gm]);
    const messages = await createCommunication(db, config).messages(gm, campaign);
    expect(messages).toHaveLength(500);
    expect(messages[0]!.body).toBe("Post 2");
    expect(messages.at(-1)!.body).toBe("Post 501");
  });

  it("rejects a stale scene draft but acknowledges a retry already saved at the old table", async () => {
    const campaign = (await createCampaigns(db, config).createCampaign(gm, { name: "Two tables" })).id;
    const game = createGameplay(db, config), live = createCommunication(db, config);
    const scene = await game.createScene(gm, campaign, { name: "First scene", entryIds: [], fictionDate: "Morning" });
    await game.startScene(gm, campaign, scene.id);
    const active = (await game.listScenes(gm, campaign)).find(row => row.id === scene.id)!;
    const draft = { commandId: randomUUID(), kind: "table" as const, body: "For the first table", expectedScene: { id: active.id, version: active.version } };
    const saved = await live.send(gm, campaign, draft);
    const second = await game.createScene(gm, campaign, { name: "Second scene", entryIds: [], fictionDate: "Afternoon" });
    await game.startScene(gm, campaign, second.id);
    expect(await live.send(gm, campaign, draft)).toEqual(saved);
    await expect(live.send(gm, campaign, { ...draft, commandId: randomUUID() })).rejects.toBeInstanceOf(Conflict);
    expect(await live.messages(gm, campaign, "table")).toEqual([]);
    await game.startScene(gm, campaign, scene.id);
    await expect(live.send(gm, campaign, { ...draft, commandId: randomUUID() })).rejects.toBeInstanceOf(Conflict);
  });
});
