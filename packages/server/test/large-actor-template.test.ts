// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import Fastify from "fastify";
import { Value } from "@sinclair/typebox/value";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DEMO_RULE_PACKAGE, defaultSupportedActorFields, parseSupportedRulePackage } from "@chronicle/rules";
import { RULE_LIMITS } from "../../rules/src/validation.ts";
import { ActorTemplateCreate, ActorTemplateRevise } from "../../protocol/src/actors.ts";
import { SheetUpdate } from "../../protocol/src/gameplay.ts";
import { FigurantragAntragBody } from "../../protocol/src/figurantrag.ts";
import { createTestDb, migrate, type Db } from "../src/db/index.ts";
import { createCampaigns } from "../src/domain/campaigns.ts";
import { createGameplay } from "../src/domain/gameplay.ts";
import { createActors } from "../src/domain/actors.ts";

const values = (count: number) => Object.fromEntries(Array.from({ length: count }, (_, i) => [`skill_${i}`, 10]));
const definition = (count: number, schemaVersion = 1) => ({ schemaVersion, name: "Large template", kind: "npc", loreEntryId: null,
  package: { id: "test.large-template", version: "1.0.0" }, fields: values(count), ...(schemaVersion === 2 ? { beute: [] } : {}) });
const command = () => ({ commandId: randomUUID() });

// Protocol packages remain independent of the rules engine. These contract tests
// deliberately compare their public bounds so a future engine change cannot drift.
describe("large character field maps at all write boundaries", () => {
  it.each([1, 2])("accepts 65, 100 and 512 fields for template schema %s, but not 513", schemaVersion => {
    for (const count of [65, 100, RULE_LIMITS.fields]) {
      const draft = { ...command(), definition: definition(count, schemaVersion) };
      expect(Value.Check(ActorTemplateCreate, draft)).toBe(true);
      expect(Value.Check(ActorTemplateRevise, { ...draft, expectedVersion: 1, reason: "Revise" })).toBe(true);
    }
    const draft = { ...command(), definition: definition(RULE_LIMITS.fields + 1, schemaVersion) };
    expect(Value.Check(ActorTemplateCreate, draft)).toBe(false);
    expect(Value.Check(ActorTemplateRevise, { ...draft, expectedVersion: 1, reason: "Revise" })).toBe(false);
  });

  it("uses the same finite bound for sheet updates and player requests", () => {
    for (const count of [65, 100, 129, RULE_LIMITS.fields, RULE_LIMITS.fields + 1]) {
      const accepted = count <= RULE_LIMITS.fields;
      expect(Value.Check(SheetUpdate, { expectedVersion: 1, fields: values(count) })).toBe(accepted);
      expect(Value.Check(FigurantragAntragBody, { ...command(), templateId: "template", name: "Scout", anfangswerte: values(count) })).toBe(accepted);
    }
  });

  it.each([1, 2])("keeps published rule-package JSON schema v%s consistent with runtime limits", version => {
    const schema = JSON.parse(readFileSync(new URL(`../../rules/schema/rule-package-v${version}.schema.json`, import.meta.url), "utf8"));
    expect(schema.properties.fields.maxProperties).toBe(RULE_LIMITS.fields);
    expect(schema.$defs.scalarMap.maxProperties).toBe(RULE_LIMITS.fields);
  });

  it("still rejects malformed identifiers, non-scalars and extra top-level properties", () => {
    for (const fields of [{ "bad key": 1 }, { skill_0: {} }, { skill_0: [] }, { skill_0: null }, { skill_0: 1e13 }]) {
      expect(Value.Check(ActorTemplateCreate, { ...command(), definition: { ...definition(100), fields } })).toBe(false);
    }
    expect(Value.Check(ActorTemplateCreate, { ...command(), definition: definition(100), unexpected: true })).toBe(false);
  });
});

describe("large rule packages through HTTP validation and persisted templates", () => {
  let db: Db, gm: string;
  beforeAll(async () => {
    db = await createTestDb(); await migrate(db); gm = randomUUID();
    await db.query("INSERT INTO users(id,display_name,platform_role,created_at) VALUES($1,'GM','leitung',1)", [gm]);
  }, 30_000);
  afterAll(async () => { await db?.close(); });

  async function fixture(count: number) {
    const pkg = parseSupportedRulePackage({ ...DEMO_RULE_PACKAGE, id: "test.large-template", name: "Large skill catalogue",
      fields: Object.fromEntries(Object.keys(values(count)).map(key => [key, { type: "integer", label: key, default: 10, minimum: 0, maximum: 50 }])),
      layout: { sections: [{ id: "skills", label: "Skills", fields: Object.keys(values(count)) }] },
      actions: [{ id: "check", name: "Check", version: "1.0.0", expression: "1d50 + actor.skill_0", inputs: {}, disclosure: "Test check", requiresConfirmation: true }],
      migrations: [], selfTests: [] });
    const campaign = (await createCampaigns(db).createCampaign(gm, { name: "Large templates" })).id;
    const game = createGameplay(db), actors = createActors(db);
    await game.installPackage(gm, campaign, pkg);
    const review = await game.previewPackage(gm, campaign, pkg);
    await game.activatePackage(gm, campaign, { packageId: pkg.id, packageVersion: pkg.version, expectedVersion: 0, previewHash: review.previewHash });
    // Same public body schemas and real domain writes as the application routes;
    // identity is fixed to this isolated test campaign, not bypassed in production.
    const app = Fastify({ ajv: { customOptions: { removeAdditional: false } } });
    app.post("/templates", { schema: { body: ActorTemplateCreate } }, req => actors.createActorTemplate(gm, campaign, req.body));
    app.put<{ Params: { id: string } }>("/templates/:id", { schema: { body: ActorTemplateRevise } }, req => actors.reviseActorTemplate(gm, campaign, req.params.id, req.body));
    return { pkg, campaign, game, actors, app };
  }

  it.each([100, RULE_LIMITS.fields])("creates, reloads, revises and instantiates a %s-field template without dropping skills", async count => {
    const f = await fixture(count);
    try {
      const draft = { ...command(), definition: definition(count) };
      const response = await f.app.inject({ method: "POST", url: "/templates", payload: draft });
      expect(response.statusCode, response.body).toBe(200);
      const first = response.json();
      expect(first.definition.fields).toEqual(defaultSupportedActorFields(f.pkg));
      const retry = await f.app.inject({ method: "POST", url: "/templates", payload: draft });
      expect(retry.statusCode, retry.body).toBe(200);
      expect(retry.json().id).toBe(first.id);
      const changed = { ...definition(count, 2), fields: { ...values(count), skill_0: 25 } };
      const revision = await f.app.inject({ method: "PUT", url: `/templates/${first.id}`, payload: { ...command(), expectedVersion: first.version, reason: "Improve melee", definition: changed } });
      expect(revision.statusCode, revision.body).toBe(200);
      const second = revision.json();
      const actor = await f.actors.instantiateActor(gm, f.campaign, { ...command(), templateId: first.id, templateRevision: second.revision });
      expect((await f.game.getSheet(gm, f.campaign, actor.id)).fields).toEqual(changed.fields);
      const old = await f.actors.getActorTemplate(gm, f.campaign, first.id, 1);
      expect(old.definition.fields).toEqual(values(count));
      expect(old.contentHash).toBe(first.contentHash);
      const invalid = await f.app.inject({ method: "POST", url: "/templates", payload: { ...command(), definition: definition(RULE_LIMITS.fields + 1) } });
      expect(invalid.statusCode).toBe(400);
      await expect(f.actors.createActorTemplate(gm, f.campaign, { ...command(), definition: { ...definition(count), fields: { ...values(count), foreign_skill: 1 } } })).rejects.toThrow();
      await expect(f.actors.createActorTemplate(gm, f.campaign, { ...command(), definition: { ...definition(count), fields: { ...values(count), skill_0: 99 } } })).rejects.toThrow();
    } finally { await f.app.close(); }
  });
});
