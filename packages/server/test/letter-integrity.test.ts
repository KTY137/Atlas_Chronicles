import { seedActorControl } from "./actor-fixtures.ts";
import { createHash, randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { stableJson } from "@chronicle/rules";
import { createTestDb, migrate, type Db } from "../src/db/index.ts";
import { createCampaigns } from "../src/domain/campaigns.ts";
import { createDocuments, type PassageInput } from "../src/domain/documents.ts";
import { Gone } from "../src/domain/errors.ts";
import { createWeek } from "../src/domain/week.ts";

const paragraph = (text: string, pfad = ["The old heading"]): PassageInput => ({
  inhalt: { kind: "absatz", inhalt: [{ text, marks: [] }] }, pfad, tags: ["spuren"],
});
const hash = (value: unknown) => createHash("sha256").update(stableJson(value)).digest("hex");

describe("delayed letter snapshot identity", () => {
  let db: Db;
  const config = { now: () => Date.UTC(2026, 8, 6) };
  beforeAll(async () => { db = await createTestDb(); await migrate(db); }, 30_000);
  afterAll(async () => { await db?.close(); });

  async function fixture(twoMailedPassages = false) {
    const gm = randomUUID(), sender = randomUUID(), recipient = randomUUID();
    for (const [id, role] of [[gm, "leitung"], [sender, "gast"], [recipient, "gast"]]) {
      await db.query("INSERT INTO users(id,display_name,platform_role,created_at) VALUES($1,$2,$3,$4)", [id, id, role, config.now()]);
    }
    const campaignId = (await createCampaigns(db, config).createCampaign(gm, { name: "Letter integrity" })).id;
    const actorSender = randomUUID(), actorRecipient = randomUUID();
    for (const [userId, actorId] of [[sender, actorSender], [recipient, actorRecipient]]) {
      await db.query("INSERT INTO actors(id,campaign_id,user_id,name) VALUES($1,$2,$3,$4)", [actorId, campaignId, userId, actorId]);
      await db.query("INSERT INTO campaign_memberships(campaign_id,user_id,role,display_name,name_skeleton,actor_id) VALUES($1,$2,'spieler',$3,$3,$4)", [campaignId, userId, userId, actorId]);
      await seedActorControl(db, campaignId, actorId!, userId!);
    }
    const docs = createDocuments(db, config), week = createWeek(db, config);
    const originalPassages = [paragraph("The mailed text"), paragraph("An unmailed secret"), paragraph("The second mailed text")];
    const entry = await docs.saveEntry(gm, campaignId, {
      title: "The old title", slug: "the-old-slug", passages: originalPassages,
    });
    const passageIds = [entry.passagen[0]!.pid, ...(twoMailedPassages ? [entry.passagen[2]!.pid] : [])];
    for (const passageId of passageIds) await docs.revealPassage(gm, campaignId, passageId, actorSender);
    await week.setClock(gm, campaignId, { day: 0, label: "Sent", postDays: 1, version: 0 });
    const sent = await week.sendLetter(sender, campaignId, { commandId: randomUUID(), toActorIds: [actorRecipient], passageIds, note: "Frozen evidence" });
    const passages = originalPassages.map((p, i) => ({ ...p, pid: entry.passagen[i]!.pid }));
    const stored = (await db.query<{ snapshots: unknown; seal: string }>("SELECT snapshots,seal FROM letters WHERE id=$1", [sent.id])).rows[0]!;
    return { gm, recipient, actorRecipient, campaignId, docs, week, entry, passageIds, passages, sent, stored: stableJson(stored) };
  }

  async function deliver(f: Awaited<ReturnType<typeof fixture>>, grant: "current" | "historical-only") {
    await f.week.setClock(f.gm, f.campaignId, { day: 1, label: "Arrived", postDays: 1, version: 1 });
    const received = await f.week.getLetter(f.recipient, f.campaignId, f.sent.id);
    expect(stableJson(received.articles)).toBe(stableJson(f.sent.articles));
    expect(received.seal).toBe(f.sent.seal);
    const proof = received.delivery[0]!.proof as { passages: { passageId: string; grant: string }[] };
    expect(proof.passages.map(p => [p.passageId, p.grant])).toEqual(f.passageIds.map(id => [id, grant]));
    const stored = (await db.query("SELECT snapshots,seal FROM letters WHERE id=$1", [f.sent.id])).rows[0]!;
    expect(stableJson(stored)).toBe(f.stored);
    const grants = await db.query("SELECT passage_id FROM revelations WHERE actor_id=$1 AND revoked_at IS NULL", [f.actorRecipient]);
    expect(grants.rowCount).toBe(grant === "current" ? f.passageIds.length : 0);
    if (grant === "historical-only") {
      await expect(f.docs.getEntry(f.recipient, f.campaignId, f.entry.entryId)).rejects.toBeInstanceOf(Gone);
      expect(await f.docs.listEntries(f.recipient, f.campaignId)).toEqual([]);
    } else {
      const current = await f.docs.getEntry(f.recipient, f.campaignId, f.entry.entryId);
      const { citations: _citations, ...frozen } = f.sent.articles[0]!;
      expect(current).toEqual(frozen);
    }
    return received;
  }

  it.each(["title", "path", "slug"] as const)("preserves only the frozen letter when the GM changes its %s", async field => {
    const f = await fixture();
    const changed = `unmailed-${field}-secret`;
    await f.docs.saveEntry(f.gm, f.campaignId, {
      title: field === "title" ? changed : f.entry.titel,
      slug: field === "slug" ? changed : f.entry.slug,
      expectedVersion: 1,
      passages: f.passages.map((p, i) => field === "path" && i === 0 ? { ...p, pfad: [changed] } : p),
    }, f.entry.entryId);
    const received = await deliver(f, "historical-only");
    expect(stableJson(received)).not.toContain(changed);
  });

  it("grants the unchanged mailed passage after editing only hidden content and its heading", async () => {
    const f = await fixture();
    await f.docs.saveEntry(f.gm, f.campaignId, {
      title: f.entry.titel, slug: f.entry.slug, expectedVersion: 1,
      passages: f.passages.map((p, i) => i === 1 ? { ...paragraph("Changed hidden content", ["Changed hidden heading"]), pid: p.pid! } : p),
    }, f.entry.entryId);
    await deliver(f, "current");
  });

  it("ignores source ordinal shifts caused by inserting a hidden passage", async () => {
    const f = await fixture(true);
    await f.docs.saveEntry(f.gm, f.campaignId, {
      title: f.entry.titel, slug: f.entry.slug, expectedVersion: 1,
      passages: [paragraph("An inserted secret"), ...f.passages],
    }, f.entry.entryId);
    await deliver(f, "current");
  });

  it("preserves only the frozen order when the GM reorders mailed passages", async () => {
    const f = await fixture(true);
    await f.docs.saveEntry(f.gm, f.campaignId, {
      title: f.entry.titel, slug: f.entry.slug, expectedVersion: 1,
      passages: [f.passages[2]!, f.passages[1]!, f.passages[0]!],
    }, f.entry.entryId);
    await deliver(f, "historical-only");
  });

  it("accepts existing content-and-tags source hashes without rewriting sealed snapshots", async () => {
    const f = await fixture();
    const legacyHash = hash({ passageId: f.passageIds[0], content: f.entry.passagen[0]!.inhalt, tags: ["spuren"] });
    expect(f.sent.articles[0]!.citations[0]!.sourceHash).toBe(legacyHash);
    await deliver(f, "current");
  });
});
