// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DEMO_RULE_PACKAGE, buildRuleRuntime, parseSupportedRulePackage } from "@chronicle/rules";
import { createTestDb, migrate, type Db } from "../src/db/index.ts";
import { createIdentity } from "../src/identity/index.ts";
import { createCampaigns } from "../src/domain/campaigns.ts";
import { createGameplay } from "../src/domain/gameplay.ts";
import { buildApp } from "../src/app.ts";

const config = {
  origin: "https://pinned-rules.test",
  cookieSecret: "pinned-rules-test-cookie-secret-long-enough",
  bootstrapToken: "pinned-rules-bootstrap-secret-long-enough",
};
const lite = parseSupportedRulePackage(JSON.parse(gunzipSync(readFileSync(
  new URL("../../rules/test/fixtures/chronicles-lite-v1.rules.json.gz", import.meta.url),
)).toString("utf8")));

describe("actor creation follows the immutable template rule pin", () => {
  let db: Db, app: Awaited<ReturnType<typeof buildApp>>, gm: string, cookie: string;

  beforeAll(async () => {
    db = await createTestDb();
    await migrate(db);
    const identity = createIdentity(db, config);
    gm = (await identity.bootstrap("Pinned Rules GM")).userId;
    cookie = `chronicle_session=${(await identity.issueSession(gm)).value}`;
    app = await buildApp(db, config);
  }, 30_000);

  afterAll(async () => {
    await app?.close();
    await db?.close();
  });

  it("instantiates Chronicles Lite while the campaign standard still points at the demo package", async () => {
    const campaignId = (await createCampaigns(db).createCampaign(gm, { name: "Pinned rules" })).id;
    const game = createGameplay(db);
    await game.installPackage(gm, campaignId, lite);
    const runtime = buildRuleRuntime(lite);
    const base = `/api/campaigns/${campaignId}`;
    const post = (path: string, payload: unknown) => app.inject({
      method: "POST",
      url: base + path,
      headers: { cookie, origin: config.origin, "content-type": "application/json" },
      payload: JSON.stringify(payload),
    });

    // Installing a package must not silently activate it. This reproduces the historical bug:
    // the template deliberately differs from the campaign's active standard package.
    expect((await game.listPackages(gm, campaignId)).pin).toEqual({
      id: DEMO_RULE_PACKAGE.id,
      version: DEMO_RULE_PACKAGE.version,
    });

    const templateResponse = await post("/actor-templates", {
      commandId: randomUUID(),
      packageContentHash: runtime.contentHash,
      definition: {
        schemaVersion: 1,
        name: "Lite Kundschafter",
        kind: "npc",
        loreEntryId: null,
        package: runtime.pin,
        fields: runtime.defaults,
      },
    });
    expect(templateResponse.statusCode, templateResponse.body).toBe(200);
    const template = templateResponse.json();

    const instantiateResponse = await post("/actors/instantiate", {
      commandId: randomUUID(),
      templateId: template.id,
      templateRevision: template.revision,
      name: "Ayla",
    });
    expect(instantiateResponse.statusCode, instantiateResponse.body).toBe(200);
    const actor = instantiateResponse.json();

    const sheet = await game.getSheet(gm, campaignId, actor.id);
    expect(sheet.packageId).toBe(lite.id);
    expect(sheet.packageVersion).toBe(lite.version);
    expect(sheet.fields).toEqual(runtime.defaults);
    expect((await game.listPackages(gm, campaignId)).pin).toEqual({
      id: DEMO_RULE_PACKAGE.id,
      version: DEMO_RULE_PACKAGE.version,
    });
  });
});
