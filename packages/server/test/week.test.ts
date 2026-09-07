// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { seedActorControl } from "./actor-fixtures.ts";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { stableJson } from "@chronicle/rules";
import { createTestDb, migrate, type Db } from "../src/db/index.ts";
import { createCampaigns } from "../src/domain/campaigns.ts";
import { createDocuments } from "../src/domain/documents.ts";
import { createGameplay } from "../src/domain/gameplay.ts";
import { createWeek } from "../src/domain/week.ts";
import { Conflict, Gone } from "../src/domain/errors.ts";
import { buildApp } from "../src/app.ts";
import { registerWeek } from "../src/http/week.ts";
import { createIdentity } from "../src/identity/index.ts";

const paragraph = (text: string) => ({ inhalt: { kind: "absatz" as const, inhalt: [{ text, marks: [] }] }, tags: ["spuren"] });
describe("the production week: fictional mail, frozen sources and inline unread state", () => {
  let db: Db, app: FastifyInstance, wallClock = Date.UTC(2026, 8, 6);
  const config = { now: () => wallClock, origin: "https://week.test", cookieSecret: "week-test-secret-at-least-32-characters", bootstrapToken: "week-bootstrap-secret-at-least-32-characters" };
  beforeAll(async () => {
    db = await createTestDb(); await migrate(db); app = await buildApp(db, config);
    if (!app.hasRoute({ method: "GET", url: "/api/campaigns/:campaignId/week/clock" })) registerWeek(app, db, config);
  }, 30_000);
  afterAll(async () => { await app?.close(); await db?.close(); });
  async function fixture() {
    const gm = randomUUID(), a = randomUUID(), b = randomUUID(), c = randomUUID();
    for (const [id, role] of [[gm, "leitung"], [a, "gast"], [b, "gast"], [c, "gast"]]) await db.query("INSERT INTO users(id,display_name,platform_role,created_at) VALUES($1,$2,$3,$4)", [id, id, role, wallClock]);
    const campaignId = (await createCampaigns(db, config).createCampaign(gm, { name: "The week" })).id;
    const actors = [randomUUID(), randomUUID(), randomUUID()];
    for (const [i, user] of [a, b, c].entries()) {
      await db.query("INSERT INTO actors(id,campaign_id,user_id,name) VALUES($1,$2,$3,$4)", [actors[i], campaignId, user, `Actor ${i}`]);
      await db.query("INSERT INTO campaign_memberships(campaign_id,user_id,role,display_name,name_skeleton,actor_id) VALUES($1,$2,'spieler',$3,$3,$4)", [campaignId, user, `Actor ${i}`, actors[i]]);
      await seedActorControl(db, campaignId, actors[i]!, user!);
    }
    const docs = createDocuments(db, config), week = createWeek(db, config), game = createGameplay(db, config);
    const entry = await docs.saveEntry(gm, campaignId, { title: "Haus Vharon", passages: [paragraph("A knows the route"), paragraph("B knows the garden"), paragraph("The sealed cellar")] });
    await docs.revealPassage(gm, campaignId, entry.passagen[0]!.pid, actors[0]!);
    await docs.revealPassage(gm, campaignId, entry.passagen[1]!.pid, actors[1]!);
    await db.query("UPDATE revelations SET quelle=$3 WHERE actor_id=$1 AND passage_id=$2", [actors[0], entry.passagen[0]!.pid, { art: "wurf", wurfId: "original-trace" }]);
    return { gm, a, b, c, actorA: actors[0]!, actorB: actors[1]!, actorC: actors[2]!, campaignId, entry, docs, week, game };
  }
  const send = (f: Awaited<ReturnType<typeof fixture>>, extra = {}) => ({ commandId: randomUUID(), toActorIds: [f.actorB], passageIds: [f.entry.passagen[0]!.pid], note: "A personal note, never canon", ...extra });

  it("starts with zero postal delay and version-controls the GM's monotonic fictional clock", async () => {
    const f = await fixture(); expect(await f.week.getClock(f.a, f.campaignId)).toEqual({ day: 0, label: "Tag 0", postDays: 0, version: 0 });
    await expect(f.week.setClock(f.a, f.campaignId, { day: 1, label: "Day 1", postDays: 2, version: 0 })).rejects.toBeInstanceOf(Gone);
    expect(await f.week.setClock(f.gm, f.campaignId, { day: 10, label: "16. Nebelmond", postDays: 2, version: 0 })).toEqual({ day: 10, label: "16. Nebelmond", postDays: 2, version: 1 });
    await expect(f.week.setClock(f.gm, f.campaignId, { day: 11, label: "Next", postDays: 2, version: 0 })).rejects.toBeInstanceOf(Conflict);
    await expect(f.week.setClock(f.gm, f.campaignId, { day: 9, label: "Earlier", postDays: 2, version: 1 })).rejects.toBeInstanceOf(Conflict);
  });
  it("delivers zero-day letters immediately as hearsay without making notes canonical", async () => {
    const f = await fixture(), input = send(f, { note: '<script>alert("untrusted")</script>' });
    const letter = await f.week.sendLetter(f.a, f.campaignId, input);
    expect(letter.recipients[0]!.deliveredDay).toBe(0);
    const received = await f.week.getLetter(f.b, f.campaignId, letter.id);
    expect(received.note).toBe(input.note); expect(received.noteIsCanon).toBe(false);
    expect(stableJson(received.articles)).toContain("A knows the route");
    expect((await f.docs.getEntry(f.b, f.campaignId, f.entry.entryId)).passagen).toHaveLength(2);
    const grant = (await db.query<{ quelle: unknown }>("SELECT quelle FROM revelations WHERE actor_id=$1 AND passage_id=$2", [f.actorB, f.entry.passagen[0]!.pid])).rows[0]!;
    expect(grant.quelle).toEqual({ art: "gehoert", von: f.actorA });
    expect((await db.query("SELECT id FROM confirmed_mints WHERE campaign_id=$1", [f.campaignId])).rowCount).toBe(0);
    const contents = (await db.query("SELECT content FROM passages WHERE campaign_id=$1", [f.campaignId])).rows;
    expect(stableJson(contents)).not.toContain("script");
  });
  it("delivers according to fictional days even if wall-clock weeks pass first", async () => {
    const f = await fixture();
    await f.week.setClock(f.gm, f.campaignId, { day: 10, label: "Spring 10", postDays: 3, version: 0 });
    const sent = await f.week.sendLetter(f.a, f.campaignId, send(f)); expect(sent.arrivalDay).toBe(13);
    wallClock += 14 * 86400_000;
    expect(await f.week.listLetters(f.b, f.campaignId)).toEqual([]);
    await expect(f.week.getLetter(f.b, f.campaignId, sent.id)).rejects.toBeInstanceOf(Gone);
    await f.week.setClock(f.gm, f.campaignId, { day: 12, label: "Spring 12", postDays: 0, version: 1 });
    expect(await f.week.listLetters(f.b, f.campaignId)).toEqual([]);
    await f.week.setClock(f.gm, f.campaignId, { day: 13, label: "Spring 13", postDays: 0, version: 2 });
    const received = await f.week.getLetter(f.b, f.campaignId, sent.id);
    expect(received.recipients[0]).toMatchObject({ deliveredAt: wallClock, deliveredDay: 13, deliveredLabel: "Spring 13" });
    expect((received.delivery[0]!.proof as { sentDay: number; scheduledDay: number }).scheduledDay).toBe(13);
  });
  it("freezes heard evidence and never grants edited text that was not in the envelope", async () => {
    const f = await fixture();
    await f.week.setClock(f.gm, f.campaignId, { day: 0, label: "First", postDays: 2, version: 0 });
    const sent = await f.week.sendLetter(f.a, f.campaignId, send(f)); const frozen = stableJson(sent.articles);
    await db.query("UPDATE passages SET content=$2 WHERE id=$1", [f.entry.passagen[0]!.pid, paragraph("A later secret was never sent").inhalt]);
    await f.week.setClock(f.gm, f.campaignId, { day: 2, label: "Arrival", postDays: 2, version: 1 });
    const received = await f.week.getLetter(f.b, f.campaignId, sent.id);
    expect(stableJson(received.articles)).toBe(frozen); expect(stableJson(received)).not.toContain("A later secret");
    expect(stableJson(received.delivery)).toContain("historical-only");
    expect((await f.docs.getEntry(f.b, f.campaignId, f.entry.entryId)).passagen).toHaveLength(1);
    await expect(db.query("UPDATE letters SET note='changed' WHERE id=$1", [sent.id])).rejects.toMatchObject({ code: "42501" });
    await expect(db.query("DELETE FROM letter_delivery_receipts WHERE letter_id=$1", [sent.id])).rejects.toMatchObject({ code: "42501" });
  });
  it("preserves stronger firsthand knowledge when a heard copy arrives", async () => {
    const f = await fixture(); await f.docs.revealPassage(f.gm, f.campaignId, f.entry.passagen[0]!.pid, f.actorB);
    await db.query("UPDATE revelations SET quelle=$3 WHERE actor_id=$1 AND passage_id=$2", [f.actorB, f.entry.passagen[0]!.pid, { art: "wurf", wurfId: "B-own-roll" }]);
    await f.week.sendLetter(f.a, f.campaignId, send(f));
    expect((await db.query<{ quelle: unknown }>("SELECT quelle FROM revelations WHERE actor_id=$1 AND passage_id=$2", [f.actorB, f.entry.passagen[0]!.pid])).rows[0]!.quelle).toEqual({ art: "wurf", wurfId: "B-own-roll" });
  });
  it("requires sender ownership and held passages, validates every recipient before writing", async () => {
    const f = await fixture();
    await expect(f.week.sendLetter(f.a, f.campaignId, send(f, { passageIds: [f.entry.passagen[2]!.pid] }))).rejects.toBeInstanceOf(Gone);
    await expect(f.week.sendLetter(f.gm, f.campaignId, send(f, { fromActorId: f.actorA }))).rejects.toBeInstanceOf(Gone);
    await expect(f.week.sendLetter(f.a, f.campaignId, send(f, { toActorIds: [f.actorB, "foreign-actor"] }))).rejects.toBeInstanceOf(Gone);
    expect((await db.query("SELECT id FROM letters WHERE campaign_id=$1", [f.campaignId])).rowCount).toBe(0);
  });
  it("keeps each recipient's envelope private, including from a non-recipient GM", async () => {
    const f = await fixture(); const letter = await f.week.sendLetter(f.a, f.campaignId, send(f));
    expect(await f.week.listLetters(f.c, f.campaignId)).toEqual([]); expect(await f.week.listLetters(f.gm, f.campaignId)).toEqual([]);
    await expect(f.week.getLetter(f.gm, f.campaignId, letter.id)).rejects.toBeInstanceOf(Gone);
    const multi = await f.week.sendLetter(f.a, f.campaignId, send(f, { toActorIds: [f.actorB, f.actorC] }));
    expect((await f.week.getLetter(f.b, f.campaignId, multi.id)).recipients.map(r => r.actorId)).toEqual([f.actorB]);
    expect((await f.week.getLetter(f.c, f.campaignId, multi.id)).recipients.map(r => r.actorId)).toEqual([f.actorC]);
    await f.week.readLetter(f.b, f.campaignId, multi.id); const first = await f.week.readLetter(f.b, f.campaignId, multi.id);
    wallClock += 1000; const replay = await f.week.readLetter(f.b, f.campaignId, multi.id); expect(replay).toEqual(first);
    expect((await f.week.getLetter(f.c, f.campaignId, multi.id)).recipients[0]!.readAt).toBeNull();
  });
  it("idempotently sends/delivers once and rechecks the sender before cached replay", async () => {
    const f = await fixture(), input = send(f);
    const [a, b] = await Promise.all([f.week.sendLetter(f.a, f.campaignId, input), f.week.sendLetter(f.a, f.campaignId, input)]);
    expect(a.id).toBe(b.id); expect((await db.query("SELECT letter_id FROM letter_delivery_receipts WHERE campaign_id=$1", [f.campaignId])).rowCount).toBe(1);
    await expect(f.week.sendLetter(f.a, f.campaignId, { ...input, note: "different" })).rejects.toBeInstanceOf(Conflict);
    await db.query("DELETE FROM campaign_memberships WHERE campaign_id=$1 AND user_id=$2", [f.campaignId, f.a]);
    await expect(f.week.sendLetter(f.a, f.campaignId, input)).rejects.toBeInstanceOf(Gone);
  });
  it("marks only projected passages unread in document order and keeps hidden changes byte-identical", async () => {
    const f = await fixture(); const initial = await f.week.umbruch(f.a, f.campaignId, f.entry.entryId);
    expect(initial.passagen.map(p => p.pid)).toEqual([f.entry.passagen[0]!.pid]); expect(initial.unreadCount).toBe(1);
    const read = await f.week.markRead(f.a, f.campaignId, f.entry.entryId); expect(read.unreadCount).toBe(0);
    const bytes = stableJson(read);
    await db.query("UPDATE entries SET version=version+100 WHERE id=$1", [f.entry.entryId]);
    await db.query("UPDATE passages SET content=$2,gen=gen+999 WHERE id=$1", [f.entry.passagen[2]!.pid, paragraph("An entirely different hidden world").inhalt]);
    expect(stableJson(await f.week.umbruch(f.a, f.campaignId, f.entry.entryId))).toBe(bytes);
    await f.docs.revealPassage(f.gm, f.campaignId, f.entry.passagen[2]!.pid, f.actorA);
    const arrival = await f.week.umbruch(f.a, f.campaignId, f.entry.entryId);
    expect(arrival.passagen.map(p => [p.pid, p.unread])).toEqual([[f.entry.passagen[0]!.pid, false], [f.entry.passagen[2]!.pid, true]]);
    expect(arrival.unreadCount).toBe(1); expect(stableJson(arrival)).not.toMatch(/generation|hiddenCount|timestamp|read_at|"version"/);
  });
  it("stores the server's projected reading snapshot and leaves no standalone unread feed", async () => {
    const f = await fixture(); await f.week.markRead(f.a, f.campaignId, f.entry.entryId);
    const mark = (await db.query<{ projected_hashes: Record<string, string> }>("SELECT projected_hashes FROM reading_watermarks WHERE campaign_id=$1 AND reader_user_id=$2", [f.campaignId, f.a])).rows[0]!;
    expect(Object.keys(mark.projected_hashes)).toEqual([f.entry.passagen[0]!.pid]);
    await expect(f.week.umbruch(f.c, f.campaignId, f.entry.entryId)).rejects.toBeInstanceOf(Gone);
    await expect(f.week.umbruch(f.a, f.campaignId, "absent-entry")).rejects.toBeInstanceOf(Gone);
  });
  it("computes GM week state differences from a session snapshot, without an event log", async () => {
    const f = await fixture();
    expect((await f.week.difference(f.gm, f.campaignId)).baselineKnown).toBe(false);
    const scene = await f.game.createScene(f.gm, f.campaignId, { name: "Saturday", entryIds: [f.entry.entryId], fictionDate: "Nebelmond" });
    await f.game.startScene(f.gm, f.campaignId, scene.id);
    const baseline = await f.week.difference(f.gm, f.campaignId); expect(baseline.baselineKnown).toBe(true); expect(baseline.knowledgeAdded).toEqual([]);
    await f.week.sendLetter(f.a, f.campaignId, send(f));
    const delta = await f.week.difference(f.gm, f.campaignId);
    expect(delta.knowledgeAdded.map(g => [g.actorId, g.passageId])).toEqual([[f.actorB, f.entry.passagen[0]!.pid]]);
    expect((await db.query("SELECT seq FROM events WHERE campaign_id=$1", [f.campaignId])).rowCount).toBe(0);
    await expect(f.week.difference(f.a, f.campaignId)).rejects.toBeInstanceOf(Gone);
    await expect(db.query("DELETE FROM week_baselines WHERE campaign_id=$1", [f.campaignId])).rejects.toMatchObject({ code: "42501" });
  });
  it("enforces identical 404 envelopes and rejects invented read IDs through actual HTTP", async () => {
    const f = await fixture(), identity = createIdentity(db, config), s = await identity.issueSession(f.c);
    const letter = await f.week.sendLetter(f.a, f.campaignId, send(f));
    const headers = { cookie: `chronicle_session=${s.value}`, origin: config.origin };
    const forbidden = await app.inject({ method: "GET", url: `/api/campaigns/${f.campaignId}/week/letters/${letter.id}`, headers });
    const absent = await app.inject({ method: "GET", url: `/api/campaigns/${f.campaignId}/week/letters/never-existed`, headers });
    expect(forbidden.statusCode).toBe(404); expect(forbidden.body).toBe(absent.body);
    const gmDifference = await app.inject({ method: "GET", url: `/api/campaigns/${f.campaignId}/week/difference`, headers }); expect(gmDifference.statusCode).toBe(404);
    const actorSession = await identity.issueSession(f.a);
    const injected = await app.inject({ method: "POST", url: `/api/campaigns/${f.campaignId}/entries/${f.entry.entryId}/read`, headers: { ...headers, cookie: `chronicle_session=${actorSession.value}` }, payload: { passageIds: [f.entry.passagen[2]!.pid] } });
    expect(injected.statusCode).toBe(400);
    const marked = await app.inject({ method: "POST", url: `/api/campaigns/${f.campaignId}/entries/${f.entry.entryId}/read`, headers: { ...headers, cookie: `chronicle_session=${actorSession.value}` }, payload: {} });
    expect(marked.statusCode).toBe(200); expect(marked.json().unreadCount).toBe(0);
  });
  it("does not mark unseen concurrent article content as read", async () => {
    const f = await fixture();
    const seen = await f.week.umbruch(f.a, f.campaignId, f.entry.entryId);
    expect(seen.readHash).toMatch(/^[a-f0-9]{64}$/);
    await f.docs.revealPassage(f.gm, f.campaignId, f.entry.passagen[2]!.pid, f.actorA);
    await expect(f.week.markRead(f.a, f.campaignId, f.entry.entryId, seen.readHash)).rejects.toBeInstanceOf(Conflict);
    const fresh = await f.week.umbruch(f.a, f.campaignId, f.entry.entryId);
    expect(fresh.unreadCount).toBeGreaterThan(0);
    expect((await f.week.markRead(f.a, f.campaignId, f.entry.entryId, fresh.readHash)).unreadCount).toBe(0);
  });

});
