// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { CHRONICLE_HEROES_PACKAGE } from "@chronicle/rules";
import { RULE_BODY_LIMIT } from "@chronicle/protocol";
import { createTestDb, migrate, type Db } from "../src/db/index.ts";
import { createIdentity } from "../src/identity/index.ts";
import { createCampaigns } from "../src/domain/campaigns.ts";
import { buildApp } from "../src/app.ts";

// Kaya, 2026-09-25: „so dass man sich nie Sorgen machen muss“. Ein Regelpaket in der Größe eines
// ganzen Systems muss über die echte HTTP-Grenze passen; bis dahin nahm der Server höchstens 2 MiB an.
const config = { origin: "https://size.test", cookieSecret: "size-test-cookie-secret-long-enough", bootstrapToken: "size-bootstrap-secret-long-enough" };

function bigPackage(): Record<string, unknown> {
  const base = JSON.parse(JSON.stringify(CHRONICLE_HEROES_PACKAGE)) as Record<string, any>;
  const text = "Ein langer Regeltext mit allen Einzelheiten eines Zaubers. ".repeat(60);
  const abilities = Array.from({ length: 1500 }, (_, i) => ({ id: `zauber_${i}`, name: `Zauber ${i}`, group: `Zauber/Grad ${i % 10}`, rank: i % 10, kind: "einsatz", cost: 1, price: 1, text }));
  return { ...base, id: "de.groesse.vollstaendig", abilities };
}

describe("große Regelpakete über HTTP", () => {
  let db: Db, app: Awaited<ReturnType<typeof buildApp>>, cookie: string, campaignId: string;
  beforeAll(async () => {
    db = await createTestDb(); await migrate(db);
    const identity = createIdentity(db, config), gm = (await identity.bootstrap("Size GM")).userId;
    cookie = `chronicle_session=${(await identity.issueSession(gm)).value}`;
    campaignId = (await createCampaigns(db).createCampaign(gm, { name: "Groesse" })).id;
    app = await buildApp(db, config);
  }, 30_000);
  afterAll(async () => { await app?.close(); await db?.close(); });

  it("installiert und prüft ein Paket weit über der alten 2-MiB-Grenze", async () => {
    const payload = JSON.stringify(bigPackage());
    expect(payload.length).toBeGreaterThan(4 * 1024 * 1024);
    expect(payload.length).toBeLessThan(RULE_BODY_LIMIT);
    const headers = { cookie, origin: config.origin, "content-type": "application/json" };
    const installed = await app.inject({ method: "POST", url: `/api/campaigns/${campaignId}/rules`, headers, payload });
    expect(installed.statusCode, installed.body.slice(0, 300)).toBe(200);
    const preview = await app.inject({ method: "POST", url: `/api/campaigns/${campaignId}/rules/preview`, headers, payload: JSON.stringify({ package: JSON.parse(payload) }) });
    expect(preview.statusCode, preview.body.slice(0, 300)).toBe(200);
  }, 120_000);

  it("behält für alle anderen Wege die kleine Grenze", async () => {
    const headers = { cookie, origin: config.origin, "content-type": "application/json" };
    const response = await app.inject({ method: "POST", url: `/api/campaigns/${campaignId}/scenes`, headers, payload: JSON.stringify({ name: "x".repeat(3 * 1024 * 1024) }) });
    expect(response.statusCode).toBe(413);
  });
});
