import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDb, migrate, type Db } from "../src/db/index.ts";
import { createCampaigns } from "../src/domain/campaigns.ts";
import { createDocuments } from "../src/domain/documents.ts";
import { createGameplay } from "../src/domain/gameplay.ts";
import { createWeek } from "../src/domain/week.ts";
import { createCommunication } from "../src/domain/communication.ts";
import { DEMO_RULE_PACKAGE } from "@chronicle/rules";

describe("live refresh includes the reader's week and rules", () => {
  let db: Db;
  beforeAll(async () => { db = await createTestDb(); await migrate(db); }, 30_000);
  afterAll(async () => db?.close());
  async function fixture() {
    const gm = randomUUID(), a = randomUUID(), b = randomUUID(), actorA = randomUUID(), actorB = randomUUID();
    for (const [id, role] of [[gm, "leitung"], [a, "gast"], [b, "gast"]]) await db.query("INSERT INTO users(id,display_name,platform_role,created_at) VALUES($1,$1,$2,1)", [id, role]);
    const campaign = (await createCampaigns(db).createCampaign(gm, { name: "Zwischen den Abenden" })).id;
    for (const [user, actor] of [[a, actorA], [b, actorB]]) {
      await db.query("INSERT INTO actors(id,campaign_id,user_id,name) VALUES($1,$2,$3,$3)", [actor, campaign, user]);
      await db.query("INSERT INTO campaign_memberships(campaign_id,user_id,role,display_name,name_skeleton,actor_id) VALUES($1,$2,'spieler',$2,$2,$3)", [campaign, user, actor]);
    }
    const docs = createDocuments(db), game = createGameplay(db), week = createWeek(db), live = createCommunication(db);
    const entry = await docs.saveEntry(gm, campaign, { title: "Der Weg", passages: [{ inhalt: { kind: "absatz", inhalt: [{ text: "Eine bekannte Spur.", marks: [] }] } }] });
    await docs.revealPassage(gm, campaign, entry.passagen[0]!.pid, actorA);
    await docs.revealPassage(gm, campaign, entry.passagen[0]!.pid, actorB);
    return { gm, a, b, actorA, actorB, campaign, entry, docs, game, week, live };
  }
  it("refreshes an edited sheet for its controller and GM without waking another player", async () => {
    const f = await fixture();
    const first = await Promise.all([f.a, f.b, f.gm].map(id => f.live.sync(id, f.campaign)));
    await f.game.updateSheet(f.a, f.campaign, { actorId: f.actorA, expectedVersion: 0, fields: { insight: 5 } });
    expect(await f.live.sync(f.a, f.campaign)).toBe(first[0]! + 1);
    expect(await f.live.sync(f.b, f.campaign)).toBe(first[1]);
    expect(await f.live.sync(f.gm, f.campaign)).toBe(first[2]! + 1);
    const next = { ...DEMO_RULE_PACKAGE, version: "1.1.0", migrations: [{ from: "1.0.0", to: "1.1.0", steps: [] }] };
    await f.game.installPackage(f.gm, f.campaign, next);
    await f.game.activatePackage(f.gm, f.campaign, { packageId: next.id, packageVersion: next.version, expectedVersion: 0 });
    expect(await f.live.sync(f.b, f.campaign)).toBe(first[1]! + 1);
  });
  it("refreshes private mail and read marks only for readers allowed to see them", async () => {
    const f = await fixture();
    await f.week.setClock(f.gm, f.campaign, { version: 0, day: 0, label: "Montag", postDays: 2 });
    const firstA = await f.live.sync(f.a, f.campaign), firstB = await f.live.sync(f.b, f.campaign);
    await f.week.sendLetter(f.a, f.campaign, { commandId: randomUUID(), toActorIds: [f.actorB], passageIds: [f.entry.passagen[0]!.pid], note: "Nur im Brief" });
    expect(await f.live.sync(f.a, f.campaign)).toBe(firstA + 1);
    expect(await f.live.sync(f.b, f.campaign)).toBe(firstB);
    await f.week.markRead(f.a, f.campaign, f.entry.entryId);
    expect(await f.live.sync(f.a, f.campaign)).toBe(firstA + 2);
    expect(await f.live.sync(f.b, f.campaign)).toBe(firstB);
  });
});
