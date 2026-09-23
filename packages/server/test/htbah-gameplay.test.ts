// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { createHash, randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DEMO_RULE_PACKAGE, defaultSupportedActorFields, evaluateSupportedAction, stableJson, supportedPackageContentHash, type AnyRulePackage, type Scalar } from "@chronicle/rules";
import { HOW_TO_BE_A_HERO_PACKAGE, HTBAH_DEFAULT_SKILLS, HTBAH_EXAMPLE_CHARACTERS, createHowToBeAHeroPackage } from "@chronicle/rules/examples";
import { createPgDb, createTestDb, migrate, type Db } from "../src/db/index.ts";
import { createCampaigns } from "../src/domain/campaigns.ts";
import { createDocuments } from "../src/domain/documents.ts";
import { createGameplay } from "../src/domain/gameplay.ts";
import { Conflict } from "../src/domain/errors.ts";
import { seedActorControl } from "./actor-fixtures.ts";

const SEED = "00000001000000020000000300000004", time = Date.UTC(2026, 8, 6, 12);
const cfg = { now: () => time, seed: () => SEED };
const hash = (value: unknown) => createHash("sha256").update(stableJson(value)).digest("hex");
const pin = (pkg: AnyRulePackage) => ({ packageId: pkg.id, packageVersion: pkg.version });
const fields = () => ({ ...HTBAH_EXAMPLE_CHARACTERS[0]!.fields });

// TEST_DATABASE_URL selects an isolated disposable schema, never the operative public schema.
describe("HTBAH supported gameplay lifecycle and authority", () => {
  let db: Db, admin: Db | undefined;
  const schema = `chronicle_htbah_${randomUUID().replaceAll("-", "")}`;
  beforeAll(async () => {
    const connection = process.env["TEST_DATABASE_URL"];
    if (connection) {
      admin = createPgDb(connection); await admin.query(`CREATE SCHEMA "${schema}"`);
      const url = new URL(connection); url.searchParams.set("options", `-c search_path=${schema}`);
      db = createPgDb(url.href);
    } else db = await createTestDb();
    await migrate(db);
  }, 30_000);
  afterAll(async () => {
    await db?.close();
    if (admin) {
      try { if (!/^chronicle_htbah_[a-f0-9]{32}$/.test(schema)) throw new Error("Unexpected test schema"); await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`); }
      finally { await admin.close(); }
    }
  });
  async function fixture(pkg: AnyRulePackage = HOW_TO_BE_A_HERO_PACKAGE) {
    const gm = randomUUID(), player = randomUUID(), actorId = randomUUID();
    await db.query("INSERT INTO users(id,display_name,platform_role,created_at) VALUES($1,'GM','leitung',$3),($2,'Hero','gast',$3)", [gm, player, time]);
    const campaignId = (await createCampaigns(db, cfg).createCampaign(gm, { name: "HTBAH" })).id;
    await db.query("INSERT INTO actors(id,campaign_id,user_id,name) VALUES($1,$2,$3,'Hero')", [actorId, campaignId, player]);
    await db.query("INSERT INTO campaign_memberships(campaign_id,user_id,role,display_name,name_skeleton,actor_id) VALUES($1,$2,'spieler','Hero','hero',$3)", [campaignId, player, actorId]);
    await seedActorControl(db, campaignId, actorId, player);
    const game = createGameplay(db, cfg);
    await game.installPackage(gm, campaignId, pkg);
    const review = await game.previewPackage(gm, campaignId, pkg);
    await game.activatePackage(gm, campaignId, { ...pin(pkg), expectedVersion: 0, previewHash: review.previewHash });
    return { gm, player, actorId, campaignId, game, pkg };
  }
  type Fixture = Awaited<ReturnType<typeof fixture>>;
  const save = (f: Fixture, value: Record<string, Scalar> = fields(), expectedVersion = 0) => f.game.updateSheet(f.player, f.campaignId, { actorId: f.actorId, expectedVersion, fields: value });
  async function passage(f: Fixture) {
    const entry = await createDocuments(db, cfg).saveEntry(f.gm, f.campaignId, { title: "Door", passages: [{ inhalt: { kind: "absatz", inhalt: [{ text: "The door opens", marks: [] }] } }] });
    return entry.passagen[0]!.pid;
  }
  async function plantedAuthorization(f: Fixture, passageId: string, actionId = "aptitude_wissen") {
    const id = randomUUID();
    const target = (await db.query("SELECT id,content,gen,tags FROM passages WHERE id=$1", [passageId])).rows[0]!;
    await db.query(`INSERT INTO action_vollmachten(id,campaign_id,actor_id,passage_id,passage_hash,package_id,package_version,action_id,threshold,fixed_input,fiction_date,issued_by,issued_at,expires_at,repeatable,budget_kind,command_id,request_hash)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,0,'{}','Today',$9,$10,$11,false,'player',$12,$5)`, [id, f.campaignId, f.actorId, passageId, hash(target), f.pkg.id, f.pkg.version, actionId, f.gm, time, time + 3600_000, randomUUID()]);
    return id;
  }

  it("H3 installs, reviews and activates a fresh campaign, then resolves unsaved V2 defaults", async () => {
    const f = await fixture();
    expect(await f.game.getSheet(f.player, f.campaignId, f.actorId)).toMatchObject({ version: 0, fields: defaultSupportedActorFields(f.pkg), defeatPending: false });
    expect((await db.query("SELECT 1 FROM actor_sheets WHERE campaign_id=$1", [f.campaignId])).rowCount).toBe(0);
    const installed = (await db.query<{ content_hash: string }>("SELECT content_hash FROM rule_packages WHERE campaign_id=$1", [f.campaignId])).rows[0]!;
    expect(installed.content_hash).toBe(supportedPackageContentHash(f.pkg));
    await expect(f.game.installPackage(f.gm, f.campaignId, { ...f.pkg, name: "Changed same version" })).rejects.toBeInstanceOf(Conflict);
    expect(await f.game.installPackage(f.gm, f.campaignId, f.pkg)).toEqual(f.pkg);
  });

  it("rejects invalid V2 defaults and self-tests before installing or reviewing an unusable package", async () => {
    // A new version needs a declared path from the shipped one; without it the package would be
    // rejected for its migration before its defaults or self-tests were ever checked.
    const f = await fixture(), base = { ...HOW_TO_BE_A_HERO_PACKAGE, version: "2.0.0", migrations: [{ from: HOW_TO_BE_A_HERO_PACKAGE.version, to: "2.0.0", steps: [] }] };
    const badDefaults = { ...base, fields: { ...base.fields, gbp_spent_handeln: { ...base.fields.gbp_spent_handeln, default: 1 } } };
    await expect(f.game.installPackage(f.gm, f.campaignId, badDefaults)).rejects.toThrow(/constraint/);
    await expect(f.game.previewPackage(f.gm, f.campaignId, badDefaults)).rejects.toThrow(/constraint/);
    const badTest = { ...base, selfTests: [{ name: "Wrong classification", actionId: "aptitude_wissen", context: { seed: SEED, actor: defaultSupportedActorFields(base), input: {}, knowledge: { actorId: f.actorId, passages: [] } }, expectedTotal: 21, expectedSuccess: true }] };
    await expect(f.game.installPackage(f.gm, f.campaignId, badTest)).rejects.toThrow(/self-test/);
    expect((await db.query("SELECT 1 FROM rule_packages WHERE campaign_id=$1", [f.campaignId])).rowCount).toBe(1);
  });

  it("H1 rejects a direct GBP reset and zero delta before sheet/version/defeat writes, including forks", async () => {
    const f = await fixture(createHowToBeAHeroPackage({ id: "table.hero.fork" }));
    const before = await save(f, { ...fields(), gbp_spent_handeln: 1 });
    for (const [field, delta] of [["gbp_spent_handeln", -1], ["gbp_spent_wissen", 0], ["hp", -100]] as const) {
      await expect(f.game.adjustResource(f.gm, f.campaignId, { actorId: f.actorId, expectedVersion: before.version, field, delta })).rejects.toThrow(/versioned sheet/i);
      expect(await f.game.getSheet(f.player, f.campaignId, f.actorId)).toEqual(before);
    }
    // Ein leergespielter Geistesblitz-Vorrat ist KEINE Niederlage. Das ist der Kern von H1, und
    // die Vitalwert-Deklaration hält ihn nicht aus Nachsicht, sondern von Bauart: `gbp_spent_*`
    // steht nicht in `vitals`, also kann keine 0 dort eine Niederlage auslösen.
    const reset = await save(f, { ...before.fields, gbp_spent_handeln: 0 }, before.version);
    expect(reset).toMatchObject({ version: 2, fields: { gbp_spent_handeln: 0 }, defeatPending: false, defeatedAt: null });
    // Lebenspunkte auf 0 sind eine. Seit Fassung 1.1.0 weist das Paket `hp` als Vitalwert mit
    // `depletion: "defeat"` aus; der versionierte Bogenschreibvorgang stellt die Niederlage an,
    // bestätigen muss sie weiterhin die Spielleitung. Die Deklaration folgt auch der Abzweigung.
    const gefallen = await save(f, { ...reset.fields, hp: 0 }, reset.version);
    expect(gefallen).toMatchObject({ version: 3, fields: { gbp_spent_handeln: 0, hp: 0 }, defeatPending: true, defeatedAt: null });
    await expect(save(f, fields(), before.version)).rejects.toBeInstanceOf(Conflict);
  });

  it("rejects cross-field effective-skill and spent-GBP attacks without saving invalid sheets", async () => {
    const f = await fixture(), before = await save(f);
    for (const bad of [{ ...before.fields, skill_klettern: 100 }, { ...before.fields, gbp_spent_handeln: 24 }]) {
      await expect(save(f, bad, before.version)).rejects.toThrow(/constraint/);
      expect(await f.game.getSheet(f.player, f.campaignId, f.actorId)).toEqual(before);
    }
  });

  it("validates corrupted stored sheets and action preconditions before preparing any roll", async () => {
    const f = await fixture(); await save(f);
    await db.query("UPDATE actor_sheets SET fields=$2 WHERE actor_id=$1", [f.actorId, { ...fields(), skill_klettern: 100 }]);
    await expect(f.game.prepareAction(f.player, f.campaignId, { commandId: randomUUID(), actorId: f.actorId, actionId: "initiative" })).rejects.toThrow(/constraint/);
    await db.query("UPDATE actor_sheets SET fields=$2 WHERE actor_id=$1", [f.actorId, defaultSupportedActorFields(f.pkg)]);
    await expect(f.game.prepareAction(f.player, f.campaignId, { commandId: randomUUID(), actorId: f.actorId, actionId: "skill_klettern" })).rejects.toThrow(/precondition/);
    expect((await db.query("SELECT 1 FROM action_rolls WHERE campaign_id=$1", [f.campaignId])).rowCount).toBe(0);
  });

  it("keeps classified failure authoritative even when its positive W100 total would pass a threshold", async () => {
    const f = await fixture(), targetPassageId = await passage(f);
    const request = { commandId: randomUUID(), actorId: f.actorId, actionId: "aptitude_wissen", targetPassageId };
    const roll = await f.game.prepareAction(f.gm, f.campaignId, request);
    expect(roll.receipt).toMatchObject({ schemaVersion: 2, packageContentHash: supportedPackageContentHash(f.pkg), success: false });
    expect(roll.receipt.total).toBeGreaterThan(0);
    expect(await f.game.prepareAction(f.gm, f.campaignId, request)).toEqual(roll);
    const confirmed = await f.game.confirmAction(f.gm, f.campaignId, roll.id);
    expect(confirmed).toMatchObject({ success: false, mint: null });
    expect(await f.game.confirmAction(f.gm, f.campaignId, roll.id)).toEqual(confirmed);
    expect((await f.game.replayRoll(f.player, f.campaignId, roll.id)).valid).toBe(true);
    expect((await db.query("SELECT 1 FROM confirmed_mints WHERE campaign_id=$1", [f.campaignId])).rowCount).toBe(0);
  });

  it("confirms an actor-bound classified success once and seals the full receipt and package hash", async () => {
    const f = await fixture(); await save(f);
    const roll = await f.game.prepareAction(f.gm, f.campaignId, { commandId: randomUUID(), actorId: f.actorId, actionId: "skill_klettern", targetPassageId: await passage(f) });
    expect(roll.receipt.success).toBe(true); expect(roll.receiptHash).toBe(hash(roll.receipt));
    const [first, second] = await Promise.all([f.game.confirmAction(f.gm, f.campaignId, roll.id), f.game.confirmAction(f.gm, f.campaignId, roll.id)]);
    expect(first).toEqual(second); expect(first.mint?.kind).toBe("wurf");
    expect(first.mint?.provenance.receiptHash).toBe(roll.receiptHash);
    expect(first.seal).toBe(hash({ rollId: roll.id, success: true, mint: first.mint, confirmedAt: first.confirmedAt, receiptHash: roll.receiptHash }));
    expect((await db.query("SELECT 1 FROM confirmed_mints WHERE campaign_id=$1", [f.campaignId])).rowCount).toBe(1);
    expect((await f.game.replayRoll(f.player, f.campaignId, roll.id)).valid).toBe(true);
  });

  it("rejects classified outcome actions when issuing an unused threshold-only Vollmacht", async () => {
    const f = await fixture();
    await expect(f.game.issueVollmacht(f.gm, f.campaignId, { commandId: randomUUID(), actorId: f.actorId, passageId: await passage(f), actionId: "aptitude_wissen", threshold: 0, expiresAt: time + 3600_000, budgetKind: "player", fictionDate: "Today" })).rejects.toThrow(/classified.*Vollmacht/);
    expect((await db.query("SELECT 1 FROM action_vollmachten WHERE campaign_id=$1", [f.campaignId])).rowCount).toBe(0);
  });

  it("defensively rejects imported classified Vollmachten during preparation before any roll", async () => {
    const f = await fixture(), id = await plantedAuthorization(f, await passage(f));
    await expect(f.game.prepareVollmacht(f.player, f.campaignId, id, { commandId: randomUUID() })).rejects.toThrow(/classified.*Vollmacht/);
    expect((await db.query("SELECT 1 FROM action_rolls WHERE campaign_id=$1", [f.campaignId])).rowCount).toBe(0);
  });

  it.each(["aptitude_wissen", "initiative"])("defensively rejects a sealed classified delegated receipt even when the stored action is %s", async actionId => {
    const f = await fixture(), passageId = await passage(f), id = await plantedAuthorization(f, passageId, actionId);
    const receipt = evaluateSupportedAction(f.pkg, "aptitude_wissen", { seed: SEED, actor: defaultSupportedActorFields(f.pkg), input: {}, knowledge: { actorId: f.actorId, passages: [] } });
    const rollId = randomUUID();
    const target = (await db.query("SELECT id,content,gen,tags FROM passages WHERE id=$1", [passageId])).rows[0]!;
    await db.query(`INSERT INTO action_rolls(id,campaign_id,actor_id,prepared_by,command_id,request_hash,package_id,package_version,action_id,receipt,receipt_hash,target_passage_id,target_passage_hash,vollmacht_id,fiction_date,prepared_at)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$14,$9,$10,$11,$6,$12,'Today',$13)`, [rollId, f.campaignId, f.actorId, f.player, randomUUID(), hash(target), f.pkg.id, f.pkg.version, receipt, hash(receipt), passageId, id, time, actionId]);
    await expect(f.game.confirmVollmacht(f.player, f.campaignId, rollId)).rejects.toThrow(/classified.*Vollmacht/);
    expect((await f.game.getRoll(f.player, f.campaignId, rollId)).status).toBe("ausstehend");
    expect((await db.query<{ status: string }>("SELECT status FROM action_vollmachten WHERE id=$1", [id])).rows[0]!.status).toBe("offen");
    expect((await db.query("SELECT 1 FROM confirmed_mints WHERE campaign_id=$1", [f.campaignId])).rowCount).toBe(0);
  });

  it("H3 reviews explicit catalogue additions and archival, preserving historical receipts and archived fields", async () => {
    const f = await fixture(); await save(f);
    const roll = await f.game.prepareAction(f.player, f.campaignId, { commandId: randomUUID(), actorId: f.actorId, actionId: "initiative" });
    const next = createHowToBeAHeroPackage({ version: "1.3.0", skills: [...HTBAH_DEFAULT_SKILLS.filter(skill => skill.id !== "geschichte"), { id: "segeln", label: "Segeln", group: "wissen" }], migrations: [{ from: f.pkg.version, to: "1.3.0", steps: [{ kind: "archive", field: "skill_geschichte" }, { kind: "archive", field: "bonus_geschichte" }, { kind: "add", field: "skill_segeln", value: 0 }, { kind: "add", field: "bonus_segeln", value: true }] }] });
    await f.game.installPackage(f.gm, f.campaignId, next);
    const review = await f.game.previewPackage(f.gm, f.campaignId, next);
    expect(review.migration?.entities[0]?.archived).toEqual({ skill_geschichte: 25, bonus_geschichte: true });
    await f.game.activatePackage(f.gm, f.campaignId, { ...pin(next), expectedVersion: 1, previewHash: review.previewHash });
    expect(await f.game.getSheet(f.player, f.campaignId, f.actorId)).toMatchObject({ packageVersion: "1.3.0", version: 2, fields: { skill_segeln: 0, skill_klettern: 65 } });
    expect((await f.game.getRoll(f.player, f.campaignId, roll.id)).receipt).toEqual(roll.receipt);
    expect((await f.game.replayRoll(f.player, f.campaignId, roll.id)).valid).toBe(true);
    const audit = (await db.query<{ data: { entities: { archived: unknown }[] } }>("SELECT data FROM audit WHERE campaign_id=$1 AND kind='rules.migration'", [f.campaignId])).rows[0]!;
    expect(audit.data.entities[0]!.archived).toEqual({ skill_geschichte: 25, bonus_geschichte: true });
  });

  it("rejects missing catalogue operations, invalid migration targets and stale review hashes", async () => {
    const f = await fixture(); const before = await save(f);
    const added = { id: "segeln", label: "Segeln", group: "wissen" as const };
    const missing = createHowToBeAHeroPackage({ version: "1.3.0", skills: [...HTBAH_DEFAULT_SKILLS, added], migrations: [{ from: f.pkg.version, to: "1.3.0", steps: [] }] });
    await expect(f.game.previewPackage(f.gm, f.campaignId, missing)).rejects.toThrow(/explicit add\/archive/);
    const invalid = createHowToBeAHeroPackage({ version: "1.3.0", migrations: [{ from: f.pkg.version, to: "1.3.0", steps: [{ kind: "numeric", field: "skill_klettern", expression: "100" }] }] });
    await expect(f.game.previewPackage(f.gm, f.campaignId, invalid)).rejects.toThrow(/constraint/);
    const valid = createHowToBeAHeroPackage({ version: "1.3.0", migrations: [{ from: f.pkg.version, to: "1.3.0", steps: [] }] });
    await f.game.installPackage(f.gm, f.campaignId, valid);
    const review = await f.game.previewPackage(f.gm, f.campaignId, valid);
    await save(f, { ...before.fields, hp: 99 }, before.version);
    await expect(f.game.activatePackage(f.gm, f.campaignId, { ...pin(valid), expectedVersion: 1, previewHash: review.previewHash })).rejects.toBeInstanceOf(Conflict);
    expect((await f.game.listPackages(f.gm, f.campaignId)).pin.version).toBe(f.pkg.version);
  });

  it("rejects invalid source fields in migration and cross-system changes with saved sheets", async () => {
    const f = await fixture(); await save(f);
    await expect(f.game.previewPackage(f.gm, f.campaignId, DEMO_RULE_PACKAGE)).rejects.toThrow();
    const next = createHowToBeAHeroPackage({ version: "1.3.0", migrations: [{ from: f.pkg.version, to: "1.3.0", steps: [] }] });
    await db.query("UPDATE actor_sheets SET fields=$2 WHERE actor_id=$1", [f.actorId, { ...fields(), gbp_spent_handeln: 24 }]);
    await expect(f.game.previewPackage(f.gm, f.campaignId, next)).rejects.toThrow(/constraint/);
  });

  it("admits an explicit same-ID V1-to-V2 transition while retaining V1 receipt bytes and replay", async () => {
    const f = await fixture(DEMO_RULE_PACKAGE);
    await save(f, { ...defaultSupportedActorFields(DEMO_RULE_PACKAGE), insight: 4 });
    const roll = await f.game.prepareAction(f.player, f.campaignId, { commandId: randomUUID(), actorId: f.actorId, actionId: "investigate" });
    const next = { ...DEMO_RULE_PACKAGE, schemaVersion: 2 as const, version: "2.0.0", migrations: [{ from: DEMO_RULE_PACKAGE.version, to: "2.0.0", steps: [] }] };
    await f.game.installPackage(f.gm, f.campaignId, next);
    const review = await f.game.previewPackage(f.gm, f.campaignId, next);
    await f.game.activatePackage(f.gm, f.campaignId, { ...pin(next), expectedVersion: 1, previewHash: review.previewHash });
    expect((await f.game.getSheet(f.player, f.campaignId, f.actorId)).fields.insight).toBe(4);
    expect((await f.game.getRoll(f.player, f.campaignId, roll.id)).receipt).toEqual(roll.receipt);
    expect((await f.game.replayRoll(f.player, f.campaignId, roll.id)).valid).toBe(true);
    expect(roll.receipt.schemaVersion).toBe(1);
  });
});
