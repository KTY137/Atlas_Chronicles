// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Value } from "@sinclair/typebox/value";
import { DEMO_RULE_PACKAGE, RULE_LIMITS, RULE_RUNTIME_CONTRACT, buildRuleRuntime, parseSupportedRulePackage, type AnyRulePackage, type FieldSchema } from "@chronicle/rules";
import { RuleValues, RULE_VALUE_FIELD_LIMIT, FigurantragAntragBody } from "@chronicle/protocol";
import { createTestDb, migrate, type Db } from "../src/db/index.ts";
import { createIdentity } from "../src/identity/index.ts";
import { createCampaigns } from "../src/domain/campaigns.ts";
import { createGameplay } from "../src/domain/gameplay.ts";
import { createActors } from "../src/domain/actors.ts";
import { buildApp } from "../src/app.ts";

const config = { origin: "https://runtime.test", cookieSecret: "runtime-test-cookie-secret-long-enough", bootstrapToken: "runtime-bootstrap-secret-long-enough" };
const lite = parseSupportedRulePackage(JSON.parse(gunzipSync(readFileSync(new URL("../../rules/test/fixtures/chronicles-lite-v1.rules.json.gz", import.meta.url))).toString("utf8")));
function largePackage(): AnyRulePackage {
  const fields: Record<string, FieldSchema> = { ...DEMO_RULE_PACKAGE.fields };
  while (Object.keys(fields).length < RULE_LIMITS.fields) fields[`field_${Object.keys(fields).length}`] = { type: "integer", label: "Value", default: 0, minimum: 0, maximum: 100 };
  return parseSupportedRulePackage({ ...DEMO_RULE_PACKAGE, id: "runtime.bounds", fields });
}

describe("host-authoritative rule runtime over the real HTTP boundary", () => {
  let db: Db, app: Awaited<ReturnType<typeof buildApp>>, gm: string, cookie: string, outsiderCookie: string;
  beforeAll(async () => {
    db = await createTestDb(); await migrate(db);
    const identity = createIdentity(db, config);
    gm = (await identity.bootstrap("Runtime GM")).userId;
    cookie = `chronicle_session=${(await identity.issueSession(gm)).value}`;
    const outsider = randomUUID();
    await db.query("INSERT INTO users(id,display_name,platform_role,created_at) VALUES($1,'Outsider','gast',1)", [outsider]);
    outsiderCookie = `chronicle_session=${(await identity.issueSession(outsider)).value}`;
    app = await buildApp(db, config);
  }, 30_000);
  afterAll(async () => { await app?.close(); await db?.close(); });
  async function fixture(pkg = lite) {
    const id = (await createCampaigns(db).createCampaign(gm, { name: "Runtime boundary" })).id;
    const game = createGameplay(db); await game.installPackage(gm, id, pkg);
    const base = `/api/campaigns/${id}`, runtime = buildRuleRuntime(pkg);
    const get = (path: string, as = cookie) => app.inject({ method: "GET", url: base + path, headers: { cookie: as } });
    const post = (path: string, payload: unknown, as = cookie) => app.inject({ method: "POST", url: base + path, headers: { cookie: as, origin: config.origin, "content-type": "application/json" }, payload: JSON.stringify(payload) });
    const selection = { packageId: pkg.id, packageVersion: pkg.version };
    const preview = { ...selection, contentHash: runtime.contentHash, fields: runtime.defaults };
    const definition = { schemaVersion: 1, name: "Runtime figure", kind: "npc", loreEntryId: null, package: runtime.pin, fields: runtime.defaults };
    const snapshot = async () => {
      const result: Record<string, unknown> = {};
      for (const table of ["actor_sheets", "actor_templates", "actor_inventory_events", "rule_packages", "campaign_rule_pins", "audit"]) result[table] = (await db.query(`SELECT * FROM ${table} WHERE campaign_id=$1`, [id])).rows;
      return result;
    };
    return { id, base, pkg, game, get, post, selection, runtime, preview, definition, snapshot };
  }

  it("reads exactly the selected installed package without activating it or writing actor data", async () => {
    const f = await fixture(), before = await f.snapshot();
    const response = await f.get(`/rules/runtime?${new URLSearchParams(f.selection)}`);
    expect(response.statusCode, response.body).toBe(200);
    expect(response.json()).toMatchObject({ contractVersion: RULE_RUNTIME_CONTRACT, pin: f.runtime.pin, contentHash: f.runtime.contentHash, abilities: [], conditions: [], abilityField: null });
    expect(Object.keys(response.json().fields)).toHaveLength(107);
    expect(response.json().actions).toHaveLength(103);
    const evaluated = await f.post("/rules/runtime/preview", f.preview);
    expect(evaluated.statusCode, evaluated.body).toBe(200); expect(evaluated.json().valid).toBe(true);
    expect(await f.snapshot()).toEqual(before);
    expect((await f.game.listPackages(gm, f.id)).pin.id).toBe(DEMO_RULE_PACKAGE.id);
  });

  it("returns validation errors without derived values, silent repairs or writes", async () => {
    const f = await fixture(), before = await f.snapshot();
    for (const fields of [{ ...f.runtime.defaults, handeln: Number(f.runtime.defaults.handeln) - 5 }, { ...f.runtime.defaults, unknown_old_skill: 8 }]) {
      const response = await f.post("/rules/runtime/preview", { ...f.preview, fields });
      expect(response.statusCode, response.body).toBe(200);
      expect(response.json()).toMatchObject({ valid: false, fields: null, computed: {}, vitals: [], abilities: null });
      expect(response.json().errors.length).toBeGreaterThan(0);
    }
    expect(await f.snapshot()).toEqual(before);
  });

  it("rejects foreign campaigns, uninstalled pins, forged hashes and client package injection", async () => {
    const f = await fixture(), before = await f.snapshot();
    expect((await f.get(`/rules/runtime?${new URLSearchParams(f.selection)}`, outsiderCookie)).statusCode).toBe(404);
    expect((await f.post("/rules/runtime/preview", f.preview, outsiderCookie)).statusCode).toBe(404);
    expect((await f.get("/rules/runtime?packageId=not.installed&packageVersion=1.0.0")).statusCode).toBe(404);
    expect((await f.post("/rules/runtime/preview", { ...f.preview, contentHash: "0".repeat(64) })).statusCode).toBe(409);
    expect((await f.post("/rules/runtime/preview", { ...f.preview, package: DEMO_RULE_PACKAGE })).statusCode).toBe(400);
    expect(await f.snapshot()).toEqual(before);
  });

  it("rejects corrupted stored package content instead of exposing a fallback manifest", async () => {
    const f = await fixture();
    await db.query("UPDATE rule_packages SET content_hash=$2 WHERE campaign_id=$1", [f.id, "f".repeat(64)]);
    expect((await f.get(`/rules/runtime?${new URLSearchParams(f.selection)}`)).statusCode).toBe(404);
    expect((await f.post("/rules/runtime/preview", f.preview)).statusCode).toBe(404);
  });

  it("creates and revises the real 107-field Lite template through HTTP", async () => {
    const f = await fixture();
    const created = await f.post("/actor-templates", { commandId: randomUUID(), definition: f.definition, packageContentHash: f.runtime.contentHash });
    expect(created.statusCode, created.body).toBe(200);
    const card = created.json(); expect(Object.keys(card.definition.fields)).toHaveLength(107);
    const revised = await app.inject({ method: "PUT", url: `${f.base}/actor-templates/${card.id}`, headers: { cookie, origin: config.origin, "content-type": "application/json" }, payload: {
      commandId: randomUUID(), expectedVersion: card.version, reason: "Changed skill draft", packageContentHash: f.runtime.contentHash,
      definition: { ...f.definition, fields: { ...f.runtime.defaults, name: "Revised" } },
    } });
    expect(revised.statusCode, revised.body).toBe(200);
    expect(revised.json().definition.fields.name).toBe("Revised");
    expect(revised.json().revision).toBe(card.revision + 1);
  });

  it("protects immutable template revisions against stale runtime hashes", async () => {
    const f = await fixture(), before = await f.snapshot();
    const response = await f.post("/actor-templates", { commandId: randomUUID(), definition: f.definition, packageContentHash: "0".repeat(64) });
    expect(response.statusCode, response.body).toBe(409);
    expect(await f.snapshot()).toEqual(before);
  });

  it("uses the same 512-field bound for all transport schemas and rejects the 513th", async () => {
    const f = await fixture(largePackage());
    expect(RULE_VALUE_FIELD_LIMIT).toBe(RULE_LIMITS.fields);
    expect(Value.Check(RuleValues, f.runtime.defaults)).toBe(true);
    expect(Value.Check(FigurantragAntragBody, { commandId: "request", templateId: "template", name: "Large", anfangswerte: f.runtime.defaults })).toBe(true);
    const tooMany = { ...f.runtime.defaults, overflow: 1 };
    expect(Value.Check(RuleValues, tooMany)).toBe(false);
    expect(Value.Check(FigurantragAntragBody, { commandId: "request", templateId: "template", name: "Large", anfangswerte: tooMany })).toBe(false);
    const before = await f.snapshot();
    expect((await f.post("/actor-templates", { commandId: randomUUID(), definition: { ...f.definition, fields: tooMany } })).statusCode).toBe(400);
    expect((await f.post("/rules/runtime/preview", { ...f.preview, fields: tooMany })).statusCode).toBe(400);
    expect(await f.snapshot()).toEqual(before);
    const accepted = await f.post("/actor-templates", { commandId: randomUUID(), definition: f.definition, packageContentHash: f.runtime.contentHash });
    expect(accepted.statusCode, accepted.body).toBe(200);
  });

  it("saves a 512-field instantiated sheet, rejects stale hashes and still enforces expectedVersion", async () => {
    const f = await fixture(largePackage());
    await f.game.activatePackage(gm, f.id, { ...f.selection, expectedVersion: 0 });
    const actors = createActors(db);
    const template = await actors.createActorTemplate(gm, f.id, { commandId: randomUUID(), definition: f.definition });
    const actor = await actors.instantiateActor(gm, f.id, { commandId: randomUUID(), templateId: template.id, templateRevision: 1 });
    const sheet = await f.game.getSheet(gm, f.id, actor.id);
    const put = (body: unknown) => app.inject({ method: "PUT", url: `${f.base}/actors/${actor.id}/sheet`, headers: { cookie, origin: config.origin, "content-type": "application/json" }, payload: JSON.stringify(body) });
    const body = { expectedVersion: sheet.version, fields: { ...sheet.fields, insight: 3 }, packageContentHash: f.runtime.contentHash };
    expect((await put({ ...body, packageContentHash: "0".repeat(64) })).statusCode).toBe(409);
    expect((await f.game.getSheet(gm, f.id, actor.id)).version).toBe(sheet.version);
    const saved = await put(body); expect(saved.statusCode, saved.body).toBe(200);
    expect(Object.keys(saved.json().fields)).toHaveLength(512);
    expect(saved.json().fields.insight).toBe(3);
    expect((await put(body)).statusCode).toBe(409);
    expect((await put({ ...body, expectedVersion: saved.json().version, fields: { ...body.fields, overflow: 1 } })).statusCode).toBe(400);
  });
});
