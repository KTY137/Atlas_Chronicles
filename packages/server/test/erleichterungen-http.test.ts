// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { HOW_TO_BE_A_HERO_PACKAGE, HTBAH_EXAMPLE_CHARACTERS } from "@chronicle/rules/examples";
import { buildApp } from "../src/app.ts";
import { createTestDb, migrate, type Db } from "../src/db/index.ts";
import { createCampaigns } from "../src/domain/campaigns.ts";
import { createGameplay } from "../src/domain/gameplay.ts";
import { createIdentity } from "../src/identity/index.ts";
import { seedActorControl } from "./actor-fixtures.ts";

// Die ganze Geste durch die echte Anwendung: die Spielleitung gewährt, die Spielerin würfelt es
// selbst — und der Wurf nimmt die abgesprochenen Zahlen, nicht die mitgeschickten.
const config = { origin: "https://erleichterung.test", cookieSecret: "erleichterung-cookie-secret-with-more-than-32-chars", bootstrapToken: "erleichterung-bootstrap-secret-with-more-than-32" };
const time = Date.UTC(2026, 8, 7, 12);

describe("Erleichterungen über HTTP", () => {
  let db: Db, app: FastifyInstance, campaignId: string, gmCookie: string, spielerCookie: string, actorId: string;
  const gm = randomUUID(), spieler = randomUUID();

  beforeAll(async () => {
    db = await createTestDb(); await migrate(db);
    actorId = randomUUID();
    for (const [id, name, rolle] of [[gm, "Kaya", "leitung"], [spieler, "Sera", "gast"]] as const)
      await db.query("INSERT INTO users(id,display_name,platform_role,created_at) VALUES($1,$2,$3,$4)", [id, name, rolle, time]);
    const cfg = { now: () => time, seed: () => "00000001000000020000000300000004" };
    campaignId = (await createCampaigns(db, cfg).createCampaign(gm, { name: "Am Seil" })).id;
    await db.query("INSERT INTO actors(id,campaign_id,user_id,name) VALUES($1,$2,$3,'Sera')", [actorId, campaignId, spieler]);
    await db.query("INSERT INTO campaign_memberships(campaign_id,user_id,role,display_name,name_skeleton,actor_id) VALUES($1,$2,'spieler','Sera','sera',$3)", [campaignId, spieler, actorId]);
    await seedActorControl(db, campaignId, actorId, spieler);
    const game = createGameplay(db, cfg);
    await game.installPackage(gm, campaignId, HOW_TO_BE_A_HERO_PACKAGE);
    const review = await game.previewPackage(gm, campaignId, HOW_TO_BE_A_HERO_PACKAGE);
    await game.activatePackage(gm, campaignId, { packageId: HOW_TO_BE_A_HERO_PACKAGE.id, packageVersion: HOW_TO_BE_A_HERO_PACKAGE.version, expectedVersion: 0, previewHash: review.previewHash });
    await game.updateSheet(spieler, campaignId, { actorId, expectedVersion: 0, fields: { ...HTBAH_EXAMPLE_CHARACTERS[0]!.fields } });
    const identity = createIdentity(db, config);
    gmCookie = `chronicle_session=${(await identity.issueSession(gm)).value}`;
    spielerCookie = `chronicle_session=${(await identity.issueSession(spieler)).value}`;
    app = await buildApp(db, config);
  }, 60_000);
  afterAll(async () => { await app?.close(); await db?.close(); });

  // Jeder schreibende Zugriff braucht einen passenden `Origin` — die CSRF-Abwehr in app.ts.
  // Ohne ihn antwortet die Anwendung mit derselben 404 wie auf alles Unerlaubte.
  // `null` heisst ausdruecklich OHNE Herkunftskopf. `undefined` waere hier untauglich: es
  // aktiviert den Vorgabewert, und der Fall haette die Herkunft doch mitgeschickt.
  const post = (pfad: string, body: unknown, cookie: string, origin: string | null = config.origin) =>
    app.inject({ method: "POST", url: `/api/campaigns/${campaignId}${pfad}`, headers: { cookie, "content-type": "application/json", ...(origin === null ? {} : { origin }) }, payload: JSON.stringify(body) });
  const get = (pfad: string, cookie: string) => app.inject({ method: "GET", url: `/api/campaigns/${campaignId}${pfad}`, headers: { cookie } });
  const zugestaendnis = (grund = "Du hast das Seil vorher gesichert.") => ({
    actorId, gemeinteAktion: "skill_klettern", gewuerfelteAktion: "manual_ruling",
    eingaben: { target: 70, critical_success_max: 5, critical_failure_min: 95, skill_check: true }, grund,
  });

  it("gewährt, zeigt der Spielerin und wird von ihr selbst gewürfelt", async () => {
    const gewaehrt = await post("/erleichterungen", zugestaendnis(), gmCookie);
    expect(gewaehrt.statusCode).toBe(200);
    const id = gewaehrt.json().id as string;

    // Die Spielerin sieht, was ihr zugestanden wurde — samt Begründung.
    const ihre = await get(`/actors/${actorId}/erleichterungen`, spielerCookie);
    expect(ihre.statusCode).toBe(200);
    expect(ihre.json()).toHaveLength(1);
    expect(ihre.json()[0].grund).toContain("Seil");

    // Und würfelt selbst — mit absichtlich mitgeschickten eigenen Zahlen, die NICHT gelten.
    const wurf = await post("/rolls", { commandId: randomUUID(), actorId, actionId: "damage",
      input: { target: 99, critical_success_max: 99, critical_failure_min: 100, skill_check: true }, erleichterungId: id }, spielerCookie);
    expect(wurf.statusCode).toBe(200);
    expect(wurf.json().receipt.action.id).toBe("manual_ruling");
    expect(wurf.json().receipt.context.input).toMatchObject({ target: 70, critical_success_max: 5 });

    // Danach ist sie eingelöst und steht nicht mehr offen.
    expect((await get(`/actors/${actorId}/erleichterungen`, spielerCookie)).json()).toHaveLength(0);
  });

  it("gehört der Spielleitung: gewähren, überblicken, zurücknehmen", async () => {
    // Wer nicht führt, erfährt nicht einmal, dass es die Tür gibt.
    expect((await post("/erleichterungen", zugestaendnis("Weil ich es will."), spielerCookie)).statusCode).toBe(404);
    expect((await get("/erleichterungen", spielerCookie)).statusCode).toBe(404);
    expect((await get("/erleichterungen", gmCookie)).statusCode).toBe(200);

    const gewaehrt = await post("/erleichterungen", zugestaendnis("Der Wind hat nachgelassen."), gmCookie);
    const id = gewaehrt.json().id as string;
    const weg = await app.inject({ method: "DELETE", url: `/api/campaigns/${campaignId}/erleichterungen/${id}`, headers: { cookie: gmCookie, origin: config.origin } });
    expect(weg.statusCode).toBe(200);
    // Zurückgenommen heißt: nicht mehr einlösbar.
    expect((await post("/rolls", { commandId: randomUUID(), actorId, actionId: "manual_ruling", erleichterungId: id }, spielerCookie)).statusCode).toBe(404);
  });

  it("weist einen schreibenden Zugriff ohne passende Herkunft ab", async () => {
    // Die CSRF-Abwehr gilt auch hier: eine fremde Seite darf keine Erleichterung gewaehren,
    // selbst wenn sie das Sitzungsplaetzchen mitschickt.
    expect((await post("/erleichterungen", zugestaendnis(), gmCookie, null)).statusCode).toBe(404);
    expect((await post("/erleichterungen", zugestaendnis(), gmCookie, "https://woanders.test")).statusCode).toBe(404);
  });

  it("weist ein Zugeständnis ohne echte Begründung an der Tür ab", async () => {
    // Eine Begründung aus Leerzeichen ist keine — und das entscheidet das Schema, nicht der Zufall.
    expect((await post("/erleichterungen", zugestaendnis("   "), gmCookie)).statusCode).toBe(400);
    expect((await post("/erleichterungen", { ...zugestaendnis(), erfunden: 1 }, gmCookie)).statusCode).toBe(400);
  });
});
