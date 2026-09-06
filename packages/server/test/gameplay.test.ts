import { seedActorControl } from "./actor-fixtures.ts";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DEMO_RULE_PACKAGE, stableJson } from "@chronicle/rules";
import { createTestDb, migrate, type Db } from "../src/db/index.ts";
import { createCampaigns } from "../src/domain/campaigns.ts";
import { createDocuments } from "../src/domain/documents.ts";
import { createGameplay, type IssueVollmachtInput } from "../src/domain/gameplay.ts";
import { Conflict, Gone } from "../src/domain/errors.ts";

const paragraph = (text: string) => ({ inhalt: { kind: "absatz" as const, inhalt: [{ text, marks: [] }] }, tags: ["spuren"] });
const SEED = "00000001000000020000000300000004";
describe("production gameplay with PGlite transactions", () => {
  let db: Db, clock = Date.UTC(2026, 8, 6, 12);
  const cfg = { now: () => clock, seed: () => SEED };
  beforeAll(async () => { db = await createTestDb(); await migrate(db); }, 30_000);
  afterAll(async () => { await db?.close(); });
  async function fixture() {
    const gm = randomUUID(), a = randomUUID(), b = randomUUID(), outsider = randomUUID();
    for (const [id, role] of [[gm, "leitung"], [a, "gast"], [b, "gast"], [outsider, "gast"]]) await db.query("INSERT INTO users(id,display_name,platform_role,created_at) VALUES($1,$2,$3,$4)", [id, id, role, clock]);
    const campaign = await createCampaigns(db, cfg).createCampaign(gm, { name: "Die Woche" });
    const actorA = randomUUID(), actorB = randomUUID();
    for (const [user, actor, name] of [[a, actorA, "Sera"], [b, actorB, "Brannt"]]) {
      await db.query("INSERT INTO actors(id,campaign_id,user_id,name) VALUES($1,$2,$3,$4)", [actor, campaign.id, user, name]);
      await db.query("INSERT INTO campaign_memberships(campaign_id,user_id,role,display_name,name_skeleton,actor_id) VALUES($1,$2,'spieler',$3,$3,$4)", [campaign.id, user, name, actor]);
      await seedActorControl(db, campaign.id, actor!, user!);
    }
    const documents = createDocuments(db, cfg), game = createGameplay(db, cfg);
    const entry = await documents.saveEntry(gm, campaign.id, { title: "Haus Vharon", passages: [paragraph("Sera experienced the tracks"), paragraph("Brannt heard a rumor"), paragraph("The sealed door opens"), paragraph("The guard is defeated")] });
    await documents.revealPassage(gm, campaign.id, entry.passagen[0]!.pid, actorA);
    await documents.revealPassage(gm, campaign.id, entry.passagen[1]!.pid, actorB);
    await db.query("UPDATE revelations SET quelle=$3 WHERE actor_id=$1 AND passage_id=$2", [actorA, entry.passagen[0]!.pid, { art: "wurf", wurfId: "earlier-authoritative-roll" }]);
    await db.query("UPDATE revelations SET quelle=$3 WHERE actor_id=$1 AND passage_id=$2", [actorB, entry.passagen[1]!.pid, { art: "gehoert", von: actorA }]);
    return { gm, a, b, outsider, actorA, actorB, campaignId: campaign.id, documents, game, entry, passageId: entry.passagen[2]!.pid };
  }
  const issueInput = (f: Awaited<ReturnType<typeof fixture>>, overrides: Partial<IssueVollmachtInput> = {}): IssueVollmachtInput => ({
    commandId: randomUUID(), actorId: f.actorA, passageId: f.passageId, actionId: "investigate", threshold: 1,
    expiresAt: clock + 3600_000, budgetKind: "player", fictionDate: "16. Nebelmond 842", ...overrides,
  });

  it("persists validated owner-controlled actor sheets and rejects stale or foreign writes", async () => {
    const f = await fixture();
    expect((await f.game.getSheet(f.a, f.campaignId, f.actorA)).version).toBe(0);
    const saved = await f.game.updateSheet(f.a, f.campaignId, { actorId: f.actorA, expectedVersion: 0, fields: { insight: 6 } });
    expect(saved.version).toBe(1); expect(saved.fields.insight).toBe(6);
    expect((await createGameplay(db, cfg).getSheet(f.gm, f.campaignId, f.actorA)).fields.insight).toBe(6);
    await expect(f.game.updateSheet(f.a, f.campaignId, { actorId: f.actorA, expectedVersion: 0, fields: { insight: 1 } })).rejects.toBeInstanceOf(Conflict);
    await expect(f.game.getSheet(f.b, f.campaignId, f.actorA)).rejects.toBeInstanceOf(Gone);
    await expect(f.game.updateSheet(f.a, f.campaignId, { actorId: f.actorB, expectedVersion: 0, fields: {} })).rejects.toBeInstanceOf(Gone);
  });
  it("prepares shared references and projects scene objects through held entry knowledge", async () => {
    const f = await fixture();
    const secret = await f.documents.saveEntry(f.gm, f.campaignId, { title: "Hidden map", passages: [paragraph("secret area")] });
    const scene = await f.game.createScene(f.gm, f.campaignId, { name: "At the gate", entryIds: [f.entry.entryId, secret.entryId], fictionDate: "16. Nebelmond 842" });
    expect(await f.game.listScenes(f.a, f.campaignId)).toEqual([]);
    await expect(f.game.startScene(f.a, f.campaignId, scene.id)).rejects.toBeInstanceOf(Gone);
    const started = await f.game.startScene(f.gm, f.campaignId, scene.id);
    expect((await f.game.startScene(f.gm, f.campaignId, scene.id)).id).toBe(started.id);
    const shown = await f.game.listScenes(f.a, f.campaignId);
    expect(shown[0]!.entryIds).toEqual([f.entry.entryId]); expect(stableJson(shown)).not.toContain(secret.entryId);
    expect((await db.query("SELECT id FROM game_sessions WHERE campaign_id=$1", [f.campaignId])).rowCount).toBe(1);
  });
  it("uses each actor's actual projection, including when the GM rolls for that actor", async () => {
    const f = await fixture();
    const a = await f.game.prepareAction(f.gm, f.campaignId, { commandId: randomUUID(), actorId: f.actorA, actionId: "investigate" });
    const b = await f.game.prepareAction(f.b, f.campaignId, { commandId: randomUUID(), actorId: f.actorB, actionId: "investigate" });
    expect(a.receipt.total - b.receipt.total).toBe(2); expect(a.receipt.dice).toEqual(b.receipt.dice);
    expect(a.receipt.context.knowledge.passages.map(p => p.passageId)).toEqual([f.entry.passagen[0]!.pid]);
    expect(stableJson(a)).not.toContain(f.passageId); expect(stableJson(a)).not.toContain(f.entry.passagen[1]!.pid);
    await expect(f.game.prepareAction(f.a, f.campaignId, { commandId: randomUUID(), actorId: f.actorB, actionId: "investigate" })).rejects.toBeInstanceOf(Gone);
  });
  it("rolls once, requires human mint authority, and confirms exactly once across concurrent retries", async () => {
    const f = await fixture();
    await f.game.updateSheet(f.a, f.campaignId, { actorId: f.actorA, expectedVersion: 0, fields: { insight: 6 } });
    const input = { commandId: randomUUID(), actorId: f.actorA, actionId: "investigate", targetPassageId: f.passageId, fictionDate: "16. Nebelmond 842" };
    const [roll, replay] = await Promise.all([f.game.prepareAction(f.gm, f.campaignId, input), f.game.prepareAction(f.gm, f.campaignId, input)]);
    expect(roll.id).toBe(replay.id); expect(roll.receipt.total).toBe(9);
    expect((await db.query("SELECT id FROM confirmed_mints WHERE campaign_id=$1", [f.campaignId])).rowCount).toBe(0);
    await expect(f.game.confirmAction(f.a, f.campaignId, roll.id)).rejects.toBeInstanceOf(Gone);
    await expect(f.game.confirmAction(f.b, f.campaignId, roll.id)).rejects.toBeInstanceOf(Gone);
    const confirmed = await Promise.all([f.game.confirmAction(f.gm, f.campaignId, roll.id), f.game.confirmAction(f.gm, f.campaignId, roll.id)]);
    expect(confirmed[0]).toEqual(confirmed[1]); expect(confirmed[0]!.mint?.kind).toBe("wurf");
    expect((await db.query("SELECT id FROM confirmed_mints WHERE campaign_id=$1", [f.campaignId])).rowCount).toBe(1);
    expect((await f.documents.getEntry(f.a, f.campaignId, f.entry.entryId)).passagen.map(p => p.pid)).toContain(f.passageId);
    expect((await f.documents.getEntry(f.b, f.campaignId, f.entry.entryId)).passagen.map(p => p.pid)).not.toContain(f.passageId);
    expect(confirmed[0]!.mint!.provenance).toMatchObject({ fictionDate: "16. Nebelmond 842", playDate: "2026-09-06", serverTime: clock });
    expect(Buffer.byteLength(stableJson(confirmed[0]!.mint!.provenance.augenblick))).toBeLessThanOrEqual(2048);
    expect((await f.game.replayRoll(f.a, f.campaignId, roll.id)).valid).toBe(true);
    expect((await f.game.mintProvenance(f.a, f.campaignId, f.passageId))[0]!.seal).toBe(confirmed[0]!.mint!.seal);
  });
  it("rejects a changed idempotency request and target edits between prepare and confirm", async () => {
    const f = await fixture();
    await f.game.updateSheet(f.a, f.campaignId, { actorId: f.actorA, expectedVersion: 0, fields: { insight: 6 } });
    const input = { commandId: randomUUID(), actorId: f.actorA, actionId: "investigate", targetPassageId: f.passageId };
    const roll = await f.game.prepareAction(f.gm, f.campaignId, input);
    await expect(f.game.prepareAction(f.gm, f.campaignId, { ...input, input: { topic: "other" } })).rejects.toBeInstanceOf(Conflict);
    await db.query("UPDATE passages SET content=$2 WHERE id=$1", [f.passageId, paragraph("changed author text").inhalt]);
    await expect(f.game.confirmAction(f.gm, f.campaignId, roll.id)).rejects.toBeInstanceOf(Conflict);
    expect((await f.game.getRoll(f.gm, f.campaignId, roll.id)).status).toBe("ausstehend");
    expect((await db.query("SELECT id FROM confirmed_mints WHERE campaign_id=$1", [f.campaignId])).rowCount).toBe(0);
  });
  it("executes spoken, ratification and correction mint handlers with distinct provenance", async () => {
    const f = await fixture(); const base = { commandId: randomUUID(), passageId: f.entry.passagen[0]!.pid, fictionDate: "Nebelmond", actorIds: [f.actorA] };
    await expect(f.game.mintGesprochen(f.a, f.campaignId, base)).rejects.toBeInstanceOf(Gone);
    const spoken = await f.game.mintGesprochen(f.gm, f.campaignId, base); expect(spoken.kind).toBe("gesprochen");
    expect(await f.game.mintGesprochen(f.gm, f.campaignId, base)).toEqual(spoken);
    await expect(f.game.mintGesprochen(f.gm, f.campaignId, { ...base, actorIds: [f.actorB] })).rejects.toBeInstanceOf(Conflict);
    await expect(f.game.mintRatifikation(f.gm, f.campaignId, { ...base, commandId: randomUUID(), passageId: f.passageId })).rejects.toBeInstanceOf(Gone);
    await db.query("UPDATE passages SET geltung='antrag' WHERE id=$1", [f.passageId]);
    const ratified = await f.game.mintRatifikation(f.gm, f.campaignId, { ...base, commandId: randomUUID(), passageId: f.passageId }); expect(ratified.kind).toBe("ratifikation");
    const corrected = await f.game.mintBerichtigung(f.gm, f.campaignId, { ...base, commandId: randomUUID(), passageId: f.entry.passagen[3]!.pid, ersetztPassageId: f.passageId });
    expect(corrected.kind).toBe("berichtigung"); expect(corrected.provenance.replaces).toBe(f.passageId);
    await expect(db.query("UPDATE confirmed_mints SET kind='wurf' WHERE id=$1", [corrected.id])).rejects.toMatchObject({ code: "42501" });
  });
  it("keeps defeat pending until a GM explicitly confirms the event passage", async () => {
    const f = await fixture();
    const pending = await f.game.adjustResource(f.gm, f.campaignId, { actorId: f.actorA, expectedVersion: 0, field: "vigour", delta: -6 });
    expect(pending.defeatPending).toBe(true); expect(pending.defeatedAt).toBeNull();
    expect((await db.query("SELECT id FROM confirmed_mints WHERE campaign_id=$1", [f.campaignId])).rowCount).toBe(0);
    const input = { commandId: randomUUID(), passageId: f.entry.passagen[3]!.pid, actorId: f.actorA, expectedVersion: pending.version, fictionDate: "Nebelmond" };
    await expect(f.game.confirmDefeat(f.a, f.campaignId, input)).rejects.toBeInstanceOf(Gone);
    await f.game.confirmDefeat(f.gm, f.campaignId, input);
    const final = await f.game.getSheet(f.gm, f.campaignId, f.actorA); expect(final.defeatPending).toBe(false); expect(final.defeatedAt).toBe(clock);
    expect((await db.query("SELECT id FROM confirmed_mints WHERE campaign_id=$1", [f.campaignId])).rowCount).toBe(1);
  });
  it("fires a scoped Vollmacht on the player's weekday and seals exactly one canonical result", async () => {
    const f = await fixture(); const issued = await f.game.issueVollmacht(f.gm, f.campaignId, issueInput(f));
    expect(await f.game.listVollmachten(f.b, f.campaignId)).toEqual([]);
    const own = await f.game.listVollmachten(f.a, f.campaignId); expect(own).toHaveLength(1);
    expect(stableJson(own)).not.toContain(f.passageId); expect(stableJson(own)).not.toContain("threshold");
    await expect(f.game.prepareVollmacht(f.b, f.campaignId, issued.id, { commandId: randomUUID() })).rejects.toBeInstanceOf(Gone);
    await expect(f.game.prepareVollmacht(f.a, f.campaignId, issued.id, { commandId: randomUUID(), input: { topic: "other" } })).rejects.toBeInstanceOf(Gone);
    const roll = await f.game.prepareVollmacht(f.a, f.campaignId, issued.id, { commandId: randomUUID() });
    await expect(f.game.confirmAction(f.a, f.campaignId, roll.id)).rejects.toBeInstanceOf(Gone);
    const [first, second] = await Promise.all([f.game.confirmVollmacht(f.a, f.campaignId, roll.id), f.game.confirmVollmacht(f.a, f.campaignId, roll.id)]);
    expect(first).toEqual(second); expect(first.mint?.kind).toBe("vollmacht");
    expect((await f.documents.getEntry(f.a, f.campaignId, f.entry.entryId)).passagen.some(p => p.pid === f.passageId)).toBe(true);
    expect(await f.game.listVollmachten(f.a, f.campaignId)).toEqual([]);
    expect((await db.query("SELECT id FROM confirmed_mints WHERE campaign_id=$1", [f.campaignId])).rowCount).toBe(1);
  });
  it("rejects revoked, expired and edited authorizations without writing canon", async () => {
    const f = await fixture(); const issued = await f.game.issueVollmacht(f.gm, f.campaignId, issueInput(f));
    const roll = await f.game.prepareVollmacht(f.a, f.campaignId, issued.id, { commandId: randomUUID() });
    await f.game.revokeVollmacht(f.gm, f.campaignId, issued.id);
    await expect(f.game.confirmVollmacht(f.a, f.campaignId, roll.id)).rejects.toBeInstanceOf(Gone);
    const expiring = await f.game.issueVollmacht(f.gm, f.campaignId, issueInput(f, { budgetKind: "floating", expiresAt: clock + 1000 }));
    const expiredRoll = await f.game.prepareVollmacht(f.a, f.campaignId, expiring.id, { commandId: randomUUID() });
    clock += 1001;
    await expect(f.game.confirmVollmacht(f.a, f.campaignId, expiredRoll.id)).rejects.toBeInstanceOf(Gone);
    expect(await f.game.listVollmachten(f.a, f.campaignId)).toEqual([]);
    expect((await db.query("SELECT id FROM audit WHERE campaign_id=$1 AND kind='vollmacht.expired'", [f.campaignId])).rowCount).toBe(1);
    await expect(db.query("UPDATE action_vollmachten SET threshold=0 WHERE id=$1", [expiring.id])).rejects.toMatchObject({ code: "42501" });
    expect((await db.query("SELECT id FROM confirmed_mints WHERE campaign_id=$1", [f.campaignId])).rowCount).toBe(0);
  });
  it("consumes failed authorizations unless repeatable, with at most one pending roll", async () => {
    const f = await fixture(); const once = await f.game.issueVollmacht(f.gm, f.campaignId, issueInput(f, { threshold: 100 }));
    const a = await f.game.prepareVollmacht(f.a, f.campaignId, once.id, { commandId: randomUUID() });
    await expect(f.game.prepareVollmacht(f.a, f.campaignId, once.id, { commandId: randomUUID() })).rejects.toBeInstanceOf(Conflict);
    const fail = await f.game.confirmVollmacht(f.a, f.campaignId, a.id); expect(fail.success).toBe(false); expect(fail.mint).toBeNull();
    await expect(f.game.prepareVollmacht(f.a, f.campaignId, once.id, { commandId: randomUUID() })).rejects.toBeInstanceOf(Gone);
    const repeatable = await f.game.issueVollmacht(f.gm, f.campaignId, issueInput(f, { threshold: 100, repeatable: true, budgetKind: "floating" }));
    const b = await f.game.prepareVollmacht(f.a, f.campaignId, repeatable.id, { commandId: randomUUID() }); await f.game.confirmVollmacht(f.a, f.campaignId, b.id);
    const c = await f.game.prepareVollmacht(f.a, f.campaignId, repeatable.id, { commandId: randomUUID() }); expect(c.id).not.toBe(b.id);
    expect((await db.query("SELECT id FROM confirmed_mints WHERE campaign_id=$1", [f.campaignId])).rowCount).toBe(0);
  });
  it("enforces a rolling week cap transactionally, including revoked and consumed grants", async () => {
    const f = await fixture();
    const first = await f.game.issueVollmacht(f.gm, f.campaignId, issueInput(f)); await f.game.revokeVollmacht(f.gm, f.campaignId, first.id);
    await expect(f.game.issueVollmacht(f.gm, f.campaignId, issueInput(f))).rejects.toBeInstanceOf(Conflict);
    const concurrent = await Promise.allSettled([1, 2, 3].map(() => f.game.issueVollmacht(f.gm, f.campaignId, issueInput(f, { budgetKind: "floating" }))));
    expect(concurrent.filter(r => r.status === "fulfilled")).toHaveLength(2); expect(concurrent.filter(r => r.status === "rejected")).toHaveLength(1);
    clock += 7 * 86400_000 + 1;
    expect((await f.game.issueVollmacht(f.gm, f.campaignId, issueInput(f))).status).toBe("offen");
  });
  it("authorizes historical replay before returning it, and rejects immutable evidence changes", async () => {
    const f = await fixture(); const roll = await f.game.prepareAction(f.a, f.campaignId, { commandId: randomUUID(), actorId: f.actorA, actionId: "investigate" });
    await f.game.confirmAction(f.a, f.campaignId, roll.id);
    await expect(db.query("UPDATE action_rolls SET receipt=$2 WHERE id=$1", [roll.id, { ...roll.receipt, total: 999 }])).rejects.toMatchObject({ code: "42501" });
    await expect(db.query("DELETE FROM action_rolls WHERE id=$1", [roll.id])).rejects.toMatchObject({ code: "42501" });
    await db.query("DELETE FROM campaign_memberships WHERE campaign_id=$1 AND user_id=$2", [f.campaignId, f.a]);
    await expect(f.game.confirmAction(f.a, f.campaignId, roll.id)).rejects.toBeInstanceOf(Gone);
    await expect(f.game.replayRoll(f.a, f.campaignId, roll.id)).rejects.toBeInstanceOf(Gone);
    await expect(f.game.getRoll(f.outsider, f.campaignId, roll.id)).rejects.toBeInstanceOf(Gone);
  });
  it("installs packages without changing pins and upgrades sheets without rewriting old rolls", async () => {
    const f = await fixture(); const input = { commandId: randomUUID(), actorId: f.actorA, actionId: "investigate", packageId: DEMO_RULE_PACKAGE.id, packageVersion: "1.0.0" };
    await f.game.updateSheet(f.a, f.campaignId, { actorId: f.actorA, expectedVersion: 0, fields: { insight: 2 } });
    const old = await f.game.prepareAction(f.a, f.campaignId, input);
    const next = { ...DEMO_RULE_PACKAGE, version: "1.1.0", migrations: [{ from: "1.0.0", to: "1.1.0", steps: [{ kind: "numeric", field: "insight", expression: "min(6, actor.value + 1)" }] }] };
    await f.game.installPackage(f.gm, f.campaignId, next);
    expect((await f.game.listPackages(f.a, f.campaignId)).pin.version).toBe("1.0.0");
    await expect(f.game.installPackage(f.a, f.campaignId, next)).rejects.toBeInstanceOf(Gone);
    await expect(f.game.installPackage(f.gm, f.campaignId, { ...next, name: "changed immutable content" })).rejects.toBeInstanceOf(Conflict);
    await f.game.activatePackage(f.gm, f.campaignId, { packageId: next.id, packageVersion: "1.1.0", expectedVersion: 0 });
    expect((await f.game.getSheet(f.a, f.campaignId, f.actorA)).fields.insight).toBe(3);
    expect(await f.game.prepareAction(f.a, f.campaignId, input)).toEqual(old);
    expect((await f.game.replayRoll(f.a, f.campaignId, old.id)).valid).toBe(true);
    await expect(db.query("DELETE FROM rule_packages WHERE campaign_id=$1 AND version='1.0.0'", [f.campaignId])).rejects.toMatchObject({ code: "42501" });
  });
});
