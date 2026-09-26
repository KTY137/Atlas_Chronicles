// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { CHRONICLES_LITE_PACKAGE, DEMO_RULE_PACKAGE, buildRuleRuntime } from "@chronicle/rules";
import { createTestDb, migrate, type Db } from "../src/db/index.ts";
import { createIdentity } from "../src/identity/index.ts";
import { createCampaigns, DEFAULT_CAMPAIGN_RULES } from "../src/domain/campaigns.ts";
import { createGameplay } from "../src/domain/gameplay.ts";
import { createActors } from "../src/domain/actors.ts";
import { hostRundeAnlegen } from "../src/domain/hostzugaenge.ts";
import { buildApp } from "../src/app.ts";

// Kaya, 2026-09-26: „mach btw Chronicles Lite als Standardregelwerk rein“.
const config = { origin: "https://standard.test", cookieSecret: "standard-test-cookie-secret-long-enough", bootstrapToken: "standard-bootstrap-secret-long-enough" };
const LITE = { id: CHRONICLES_LITE_PACKAGE.id, version: CHRONICLES_LITE_PACKAGE.version };

describe("Chronicles Lite ist das Standardregelwerk neuer Runden", () => {
  let db: Db, app: Awaited<ReturnType<typeof buildApp>>, gm: string, cookie: string;
  beforeAll(async () => {
    db = await createTestDb(); await migrate(db);
    const identity = createIdentity(db, config);
    gm = (await identity.bootstrap("Standard GM")).userId;
    cookie = `chronicle_session=${(await identity.issueSession(gm)).value}`;
    app = await buildApp(db, config);
  }, 30_000);
  afterAll(async () => { await app?.close(); await db?.close(); });

  it("installiert und heftet Lite an, wenn die Spielleitung eine Runde anlegt", async () => {
    expect(DEFAULT_CAMPAIGN_RULES).toBe(CHRONICLES_LITE_PACKAGE);
    const created = await app.inject({ method: "POST", url: "/api/campaigns", headers: { cookie, origin: config.origin, "content-type": "application/json" }, payload: JSON.stringify({ name: "Neue Runde" }) });
    expect(created.statusCode, created.body).toBe(200);
    const id = created.json().id as string;
    const listed = await createGameplay(db).listPackages(gm, id);
    expect(listed.pin).toEqual(LITE);
    expect(listed.version).toBe(1);
    expect(listed.packages.map(pkg => pkg.id)).toContain(LITE.id);
    const runtime = await app.inject({ method: "GET", url: `/api/campaigns/${id}/rules/runtime?${new URLSearchParams({ packageId: LITE.id, packageVersion: LITE.version })}`, headers: { cookie } });
    expect(runtime.statusCode, runtime.body).toBe(200);
    expect(runtime.json().contentHash).toBe(buildRuleRuntime(CHRONICLES_LITE_PACKAGE).contentHash);
  });

  it("legt in der neuen Runde eine Figur nach Lite an", async () => {
    const id = (await createCampaigns(db).createCampaign(gm, { name: "Figurenrunde" }, { rules: DEFAULT_CAMPAIGN_RULES })).id;
    const runtime = buildRuleRuntime(CHRONICLES_LITE_PACKAGE), actors = createActors(db);
    const template = await actors.createActorTemplate(gm, id, { commandId: randomUUID(), definition: { schemaVersion: 1, name: "Lite-Figur", kind: "npc", loreEntryId: null, package: runtime.pin, fields: runtime.defaults } });
    const actor = await actors.instantiateActor(gm, id, { commandId: randomUUID(), templateId: template.id, templateRevision: 1 });
    const sheet = await createGameplay(db).getSheet(gm, id, actor.id);
    expect({ id: sheet.packageId, version: sheet.packageVersion }).toEqual(LITE);
  });

  it("gibt Lite auch Runden aus dem Hostfenster", async () => {
    const runde = await hostRundeAnlegen(db, "Hostrunde", {});
    expect((await createGameplay(db).listPackages(gm, runde.id)).pin).toEqual(LITE);
  });

  it("lässt Runden ohne eigene Wahl beim eingebauten Demopaket, damit ältere Bögen passen", async () => {
    const id = (await createCampaigns(db).createCampaign(gm, { name: "Alte Runde" })).id;
    const listed = await createGameplay(db).listPackages(gm, id);
    expect(listed.pin).toEqual({ id: DEMO_RULE_PACKAGE.id, version: DEMO_RULE_PACKAGE.version });
    expect(listed.version).toBe(0);
  });
});
