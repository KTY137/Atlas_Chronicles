// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { DEMO_RULE_PACKAGE } from "@chronicle/rules";
import { buildApp } from "../src/app.ts";
import { createTestDb, migrate, type Db } from "../src/db/index.ts";
import { createCampaigns } from "../src/domain/campaigns.ts";
import { createGameplay } from "../src/domain/gameplay.ts";
import { createIdentity } from "../src/identity/index.ts";

// Die Domain kennt die Rechte; hier wird geprüft, dass die drei neuen Wege durch die echte
// Anwendung erreichbar sind und dass der Konfliktsatz beim Nutzer ankommt statt beim Log.
const config = { origin: "https://regelarchiv-http.test", cookieSecret: "regelarchiv-http-cookie-secret-with-more-than-32-chars", bootstrapToken: "regelarchiv-http-bootstrap-secret-more-than-32ch" };

describe("Regelpaket-Bibliothek über HTTP", () => {
  let db: Db, app: FastifyInstance, campaignId: string, gmCookie: string, spielerCookie: string;
  const gm = randomUUID(), spieler = randomUUID();
  const zweite = { ...DEMO_RULE_PACKAGE, version: "1.1.0" };

  beforeAll(async () => {
    db = await createTestDb(); await migrate(db);
    for (const [id, name, rolle] of [[gm, "Kaya", "leitung"], [spieler, "Sera", "gast"]] as const)
      await db.query("INSERT INTO users(id,display_name,platform_role,created_at) VALUES($1,$2,$3,$4)", [id, name, rolle, Date.now()]);
    campaignId = (await createCampaigns(db).createCampaign(gm, { name: "Regelarchiv über HTTP" })).id;
    const actorId = randomUUID();
    await db.query("INSERT INTO actors(id,campaign_id,user_id,name) VALUES($1,$2,$3,'Sera')", [actorId, campaignId, spieler]);
    await db.query("INSERT INTO campaign_memberships(campaign_id,user_id,role,display_name,name_skeleton,actor_id) VALUES($1,$2,'spieler','Sera','sera',$3)", [campaignId, spieler, actorId]);
    const game = createGameplay(db);
    await game.installPackage(gm, campaignId, DEMO_RULE_PACKAGE);
    await game.installPackage(gm, campaignId, zweite);
    const identity = createIdentity(db, config);
    gmCookie = `chronicle_session=${(await identity.issueSession(gm)).value}`;
    spielerCookie = `chronicle_session=${(await identity.issueSession(spieler)).value}`;
    app = await buildApp(db, config);
  }, 60_000);
  afterAll(async () => { await app?.close(); await db?.close(); });

  const url = (pfad: string) => `/api/campaigns/${campaignId}${pfad}`;
  const get = (pfad: string, cookie: string) => app.inject({ method: "GET", url: url(pfad), headers: { cookie } });
  const send = (method: "POST" | "DELETE", pfad: string, body: unknown, cookie: string) =>
    app.inject({ method, url: url(pfad), headers: { cookie, "content-type": "application/json", origin: config.origin }, payload: JSON.stringify(body) });

  const wahl = { packageId: DEMO_RULE_PACKAGE.id, packageVersion: "1.1.0" };

  it("nimmt, holt zurück und löscht über die echten Routen", async () => {
    const stand = async () => (await get("/rules", gmCookie)).json().bibliothek.find((item: { version: string }) => item.version === "1.1.0");
    expect(await stand()).toMatchObject({ genommen: false, loeschbar: true });

    expect((await send("POST", "/rules/archive", wahl, spielerCookie)).statusCode).toBe(404);
    expect((await send("POST", "/rules/archive", wahl, gmCookie)).statusCode).toBe(200);
    expect(await stand()).toMatchObject({ genommen: true });
    expect((await send("POST", "/rules/unarchive", wahl, gmCookie)).statusCode).toBe(200);
    expect(await stand()).toMatchObject({ genommen: false });

    expect((await send("DELETE", "/rules", wahl, spielerCookie)).statusCode).toBe(404);
    expect((await send("DELETE", "/rules", wahl, gmCookie)).statusCode).toBe(200);
    expect(await stand()).toBeUndefined();
  });

  it("sagt beim verwehrten Löschen in einem Satz, was im Weg steht", async () => {
    const antwort = await send("DELETE", "/rules", { packageId: DEMO_RULE_PACKAGE.id, packageVersion: DEMO_RULE_PACKAGE.version }, gmCookie);
    expect(antwort.statusCode).toBe(409);
    expect(antwort.json().error).toMatch(/angeheftet/);
    expect(antwort.json().error).not.toMatch(/aktuellen Stand/);
  });

  it("weist einen unbekannten Zusatz im Befehl ab", async () => {
    const antwort = await send("POST", "/rules/archive", { ...wahl, packageVersion: DEMO_RULE_PACKAGE.version, heimlich: true }, gmCookie);
    expect(antwort.statusCode).toBe(400);
  });
});
