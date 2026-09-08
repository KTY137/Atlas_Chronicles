// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { DEMO_RULE_PACKAGE } from "@chronicle/rules";
import { buildApp } from "../src/app.ts";
import { createTestDb, migrate, type Db } from "../src/db/index.ts";
import { createActors } from "../src/domain/actors.ts";
import { createCampaigns } from "../src/domain/campaigns.ts";
import { createIdentity } from "../src/identity/index.ts";

// Der ganze Weg durch die echte Anwendung: freigeben, beantragen, entscheiden. Die Rechte liegen
// in der Domain; hier wird geprüft, dass die Routen sie erreichen und dass der Fehlerbehandler
// der Anwendung Konflikt, Nichtverfügbarkeit und Eingabefehler unverändert abbildet.
const config = { origin: "https://figurantrag-http.test", cookieSecret: "figurantrag-http-cookie-secret-with-more-than-32-chars", bootstrapToken: "figurantrag-http-bootstrap-secret-more-than-32ch" };

describe("Figurantrag über HTTP", () => {
  let db: Db, app: FastifyInstance, campaignId: string, gmCookie: string, spielerCookie: string, templateId: string;
  const gm = randomUUID(), spieler = randomUUID();

  beforeAll(async () => {
    db = await createTestDb(); await migrate(db);
    for (const [id, name, rolle] of [[gm, "Kaya", "leitung"], [spieler, "Sera", "gast"]] as const)
      await db.query("INSERT INTO users(id,display_name,platform_role,created_at) VALUES($1,$2,$3,$4)", [id, name, rolle, Date.now()]);
    campaignId = (await createCampaigns(db).createCampaign(gm, { name: "Anträge über HTTP" })).id;
    const actorId = randomUUID();
    await db.query("INSERT INTO actors(id,campaign_id,user_id,name) VALUES($1,$2,$3,'Sera')", [actorId, campaignId, spieler]);
    await db.query("INSERT INTO campaign_memberships(campaign_id,user_id,role,display_name,name_skeleton,actor_id) VALUES($1,$2,'spieler','Sera','sera',$3)", [campaignId, spieler, actorId]);
    templateId = (await createActors(db).createActorTemplate(gm, campaignId, { commandId: randomUUID(), definition: {
      schemaVersion: 1, name: "Wanderin", kind: "player_character", loreEntryId: null,
      package: { id: DEMO_RULE_PACKAGE.id, version: DEMO_RULE_PACKAGE.version }, fields: { insight: 3, vigour: 9 },
    } })).id;
    const identity = createIdentity(db, config);
    gmCookie = `chronicle_session=${(await identity.issueSession(gm)).value}`;
    spielerCookie = `chronicle_session=${(await identity.issueSession(spieler)).value}`;
    app = await buildApp(db, config);
  }, 60_000);
  afterAll(async () => { await app?.close(); await db?.close(); });

  const url = (pfad: string) => `/api/campaigns/${campaignId}${pfad}`;
  const get = (pfad: string, cookie: string) => app.inject({ method: "GET", url: url(pfad), headers: { cookie } });
  const send = (method: "POST" | "PUT", pfad: string, body: unknown, cookie: string) =>
    app.inject({ method, url: url(pfad), headers: { cookie, "content-type": "application/json", origin: config.origin }, payload: JSON.stringify(body) });

  it("führt Freigabe, Antrag und Bestätigung durch die echten Routen", async () => {
    // `freigegeben` ist ein fester Pfad und darf nicht als Vorlagen-ID gelesen werden.
    const leer = await get("/actor-templates/freigegeben", spielerCookie);
    expect(leer.statusCode).toBe(200); expect(leer.json()).toEqual([]);
    // Ohne Freigabe existiert die Vorlage für einen Spieler nicht.
    const zuFrueh = await send("POST", "/figurantraege", { commandId: randomUUID(), templateId, name: "Nell", anfangswerte: {} }, spielerCookie);
    expect(zuFrueh.statusCode).toBe(404);

    const frei = await send("PUT", `/actor-templates/${templateId}/freigabe`, { expectedVersion: 0 }, gmCookie);
    expect(frei.statusCode).toBe(200);
    expect(frei.json()).toMatchObject({ templateId, freigegeben: true, version: 1 });
    const auswahl = await get("/actor-templates/freigegeben", spielerCookie);
    // Die Spielerprojektion: Name, Art und Anfangswerte — keine Beutetabelle, kein Artikelverweis.
    expect(auswahl.json()).toHaveLength(1);
    expect(auswahl.json()[0]).toEqual({ id: templateId, name: "Wanderin", art: "player_character", anfangswerte: { insight: 3, vigour: 9, name: "Reisende Person" }, version: 1 });

    const antrag = await send("POST", "/figurantraege", { commandId: randomUUID(), templateId, name: "Nell", anfangswerte: { insight: 5 } }, spielerCookie);
    expect(antrag.statusCode).toBe(200);
    expect(antrag.json()).toMatchObject({ status: "offen", name: "Nell", version: 1, anfangswerte: { insight: 5 } });
    const id = antrag.json().id as string;
    // Die Spielleitung sieht offene Anträge, der Spieler seine eigenen.
    expect((await get("/figurantraege", gmCookie)).json()).toHaveLength(1);
    expect((await get("/figurantraege", spielerCookie)).json()).toHaveLength(1);

    expect((await send("POST", `/figurantraege/${id}/bestaetigen`, { expectedVersion: 7 }, gmCookie)).statusCode).toBe(409);
    const bestaetigt = await send("POST", `/figurantraege/${id}/bestaetigen`, { expectedVersion: 1 }, gmCookie);
    expect(bestaetigt.statusCode).toBe(200);
    const { antrag: karte, actorId } = bestaetigt.json();
    expect(karte).toMatchObject({ status: "bestaetigt", version: 2 });
    expect(typeof actorId).toBe("string");
    // Die Figur gehört der antragstellenden Person und trägt die bestätigten Werte.
    const bogen = await get(`/actors/${actorId}/sheet`, spielerCookie);
    expect(bogen.statusCode).toBe(200);
    expect(bogen.json().fields).toMatchObject({ insight: 5, vigour: 9 });
    // Ein zweiter Zugriff auf denselben Antrag ist ein Konflikt, kein zweiter Bogen.
    expect((await send("POST", `/figurantraege/${id}/bestaetigen`, { expectedVersion: 2 }, gmCookie)).statusCode).toBe(409);
    expect((await get("/figurantraege", gmCookie)).json()).toEqual([]);
  }, 60_000);

  it("bildet Rechte, Eingabefehler und Ablehnung ab", async () => {
    // Ein Spieler schaltet keine Freigabe: die Domain wirft `Gone`, die Anwendung antwortet 404.
    expect((await send("PUT", `/actor-templates/${templateId}/freigabe`, { expectedVersion: 1 }, spielerCookie)).statusCode).toBe(404);
    // Ein unbekanntes Feld ist ein Tippfehler, kein stillschweigend verworfener Wunsch.
    expect((await send("POST", "/figurantraege", { commandId: randomUUID(), templateId, name: "Nell", anfangswerte: { fremd: 1 } }, spielerCookie)).statusCode).toBe(400);
    // Der Körper ist geschlossen; eine mitgeschickte Zusatzangabe wird abgewiesen.
    expect((await send("POST", "/figurantraege", { commandId: randomUUID(), templateId, name: "Nell", anfangswerte: {}, actorId: "x" }, spielerCookie)).statusCode).toBe(400);

    const antrag = await send("POST", "/figurantraege", { commandId: randomUUID(), templateId, name: "Zweite", anfangswerte: {} }, spielerCookie);
    expect(antrag.statusCode).toBe(200);
    const id = antrag.json().id as string;
    // Eine Ablehnung ohne Grund ist keine Ablehnung.
    expect((await send("POST", `/figurantraege/${id}/ablehnen`, { expectedVersion: 1 }, gmCookie)).statusCode).toBe(400);
    const abgelehnt = await send("POST", `/figurantraege/${id}/ablehnen`, { expectedVersion: 1, reason: "Zu viele Wanderinnen." }, gmCookie);
    expect(abgelehnt.statusCode).toBe(200);
    expect(abgelehnt.json()).toMatchObject({ status: "abgelehnt", reason: "Zu viele Wanderinnen.", actorId: null });

    // Zurücknehmen bleibt dem Antragsteller vorbehalten; der Entzug der Freigabe der Spielleitung.
    const dritter = await send("POST", "/figurantraege", { commandId: randomUUID(), templateId, name: "Dritte", anfangswerte: {} }, spielerCookie);
    const drittId = dritter.json().id as string;
    expect((await send("POST", `/figurantraege/${drittId}/zuruecknehmen`, { expectedVersion: 1 }, gmCookie)).statusCode).toBe(404);
    expect((await send("POST", `/figurantraege/${drittId}/zuruecknehmen`, { expectedVersion: 1 }, spielerCookie)).json()).toMatchObject({ status: "zurueckgezogen" });
    expect((await send("POST", `/actor-templates/${templateId}/freigabe/entziehen`, { expectedVersion: 0 }, gmCookie)).statusCode).toBe(409);
    const entzogen = await send("POST", `/actor-templates/${templateId}/freigabe/entziehen`, { expectedVersion: 1 }, gmCookie);
    expect(entzogen.json()).toMatchObject({ freigegeben: false, version: 2 });
    expect((await get("/actor-templates/freigegeben", spielerCookie)).json()).toEqual([]);
  }, 60_000);
});
