import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { DEMO_RULE_PACKAGE } from "@chronicle/rules";
import { createTestDb, migrate, type Db } from "../src/db/index.ts";
import { createIdentity } from "../src/identity/index.ts";
import { createCampaigns } from "../src/domain/campaigns.ts";
import { createGameplay } from "../src/domain/gameplay.ts";
import { createActors } from "../src/domain/actors.ts";
import { buildApp } from "../src/app.ts";

describe("gameplay HTTP accepts the published RulePackage value bounds", () => {
  let db: Db, app: FastifyInstance, cookie: string, campaign: string, actor: string;
  const fieldId = `lore-${"x".repeat(91)}`, value = "x".repeat(4096);
  beforeAll(async () => {
    db = await createTestDb(); await migrate(db);
    const config = { origin: "https://rule-bounds.test", cookieSecret: "rule-bounds-test-cookie-secret-long-enough", bootstrapToken: "rule-bounds-bootstrap-secret-long-enough" };
    const identity = createIdentity(db, config), gm = (await identity.bootstrap("Kaya")).userId;
    cookie = `chronicle_session=${(await identity.issueSession(gm)).value}`;
    campaign = (await createCampaigns(db).createCampaign(gm, { name: "Boundary compatibility" })).id;
    const game = createGameplay(db), actors = createActors(db);
    const stringField = { type: "string", label: "Long text", default: "", maxLength: 4096 };
    const pkg = { ...DEMO_RULE_PACKAGE, version: "1.2.0", fields: { ...DEMO_RULE_PACKAGE.fields, [fieldId]: stringField },
      actions: DEMO_RULE_PACKAGE.actions.map(a => ({ ...a, inputs: { ...a.inputs, [fieldId]: stringField } })) };
    await game.installPackage(gm, campaign, pkg);
    await game.activatePackage(gm, campaign, { packageId: pkg.id, packageVersion: pkg.version, expectedVersion: 0 });
    const template = await actors.createActorTemplate(gm, campaign, { commandId: randomUUID(), definition: { schemaVersion: 1, name: "Reader", kind: "npc", loreEntryId: null, package: { id: pkg.id, version: pkg.version }, fields: {} } });
    actor = (await actors.instantiateActor(gm, campaign, { commandId: randomUUID(), templateId: template.id, templateRevision: 1 })).id;
    app = await buildApp(db, config);
  }, 30_000);
  afterAll(async () => { await app?.close(); await db?.close(); });
  it("saves a 96-character field identifier and 4096-character sheet value", async () => {
    const url = `/api/campaigns/${campaign}/actors/${actor}/sheet`;
    const current = (await app.inject({ method: "GET", url, headers: { cookie } })).json();
    const response = await app.inject({ method: "PUT", url, headers: { cookie, origin: "https://rule-bounds.test" }, payload: { expectedVersion: current.version, fields: { ...current.fields, [fieldId]: value } } });
    expect(response.statusCode, response.body).toBe(200);
    expect(response.json().fields[fieldId]).toBe(value);
  });
  it("uses the same permitted values in real action preparation", async () => {
    const response = await app.inject({ method: "POST", url: `/api/campaigns/${campaign}/rolls`, headers: { cookie, origin: "https://rule-bounds.test" }, payload: { commandId: randomUUID(), actorId: actor, actionId: "investigate", input: { topic: "spuren", [fieldId]: value } } });
    expect(response.statusCode, response.body).toBe(200);
    expect(response.json().status).toBe("ausstehend");
  });
});
