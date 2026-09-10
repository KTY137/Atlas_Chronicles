// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
/**
 * Die Zugangsverwaltung des Hostfensters.
 *
 * Der Anlass steht im Betriebsprotokoll vom 10.09.2026: die Spielleitung, die diesen Server
 * selbst eingerichtet hatte, stand nach Ablauf ihrer Sitzung vor der Anmeldeseite — ohne Weg
 * zurück, weil jeder Weg hinein eine gültige Sitzung verlangt. Diese Reihe hält fest, was das
 * Hostfenster stattdessen darf, und vor allem, was es **nicht** darf.
 */
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDb, migrate, type Db } from "../src/db/index.ts";
import { createIdentity } from "../src/identity/index.ts";
import { createCampaigns } from "../src/domain/campaigns.ts";
import { hostEinladung, hostKopplung, hostRolle, hostRunden, HostZugangError } from "../src/domain/hostzugaenge.ts";

// `now` gehoert zu DomainConfig; die Identitaetsfunktionen nehmen dieselbe Form.
const config = { origin: "http://localhost:3000", cookieSecret: "hostzugaenge-test-cookie-secret-over-thirty-two", now: () => Date.now() };
let db: Db;
let campaignId: string, leitung: string, spieler: string;

beforeAll(async () => {
  db = await createTestDb();
  await migrate(db);
  const identity = createIdentity(db, config), campaigns = createCampaigns(db, config);
  leitung = (await identity.bootstrap("Die Spielleitung")).userId;
  const campaign = await campaigns.createCampaign(leitung, { name: "Die offenen Annalen" });
  campaignId = campaign.id;
  // Ein zweites Mitglied über den echten Beitrittsweg — so entsteht auch im Betrieb ein Spieler.
  const invite = await campaigns.issueInvitation(leitung, campaignId);
  const request = await campaigns.requestJoin(invite.code, { displayName: "Arin" });
  const pending = await campaigns.listPendingJoins(leitung, campaignId);
  await campaigns.approveJoin(leitung, campaignId, pending[0]!.id as string);
  spieler = (await campaigns.claimJoin(request.id, request.pollToken)).userId;
}, 30_000);
afterAll(async () => { await db?.close(); });

describe("Was das Hostfenster sieht", () => {
  it("nennt Runden, Mitglieder, Rollen — und wer gerade nicht mehr hereinkommt", async () => {
    const runden = await hostRunden(db);
    const runde = runden.find(kandidat => kandidat.campaignId === campaignId);
    expect(runde?.name).toBe("Die offenen Annalen");
    const namen = runde!.members.map(mitglied => mitglied.displayName).sort();
    expect(namen).toEqual(["Arin", "Die Spielleitung"]);

    const gm = runde!.members.find(mitglied => mitglied.userId === leitung)!;
    expect(gm.role).toBe("leitung");
    // Die eingerichtete Spielleitung darf eigene Runden anlegen; ein beigetretener Spieler nicht.
    expect(gm.platformLeitung).toBe(true);
    expect(runde!.members.find(mitglied => mitglied.userId === spieler)!.platformLeitung).toBe(false);
  });

  it("meldet einen abgelaufenen Zugang als „kommt nicht herein“", async () => {
    // Genau der Fall aus dem Betrieb: die Sitzung ist abgelaufen, der Mensch existiert weiter.
    await db.query("UPDATE credentials SET expires_at=$1 WHERE user_id=$2", [Date.now() - 1000, leitung]);
    const runde = (await hostRunden(db)).find(kandidat => kandidat.campaignId === campaignId)!;
    expect(runde.members.find(mitglied => mitglied.userId === leitung)!.hasAccess).toBe(false);
  });
});

describe("Der Weg zurück", () => {
  it("erzeugt einen einlösbaren Kopplungscode für ein Mitglied", async () => {
    const kopplung = await hostKopplung(db, campaignId, leitung, config);
    // Kein Formatversprechen — der Code kommt aus `secretToken()` und darf sich aendern.
    // Geprueft wird, dass er undurchsichtig und lang genug ist, um nicht geraten zu werden.
    expect(kopplung.code.length).toBeGreaterThanOrEqual(32);
    expect(kopplung.expiresAt).toBeGreaterThan(Date.now());
    // Der Nachweis, auf den es ankommt: derselbe Code laesst sich auf dem normalen Weg einloesen.
    const sitzung = await createIdentity(db, config).redeemPairing(kopplung.code);
    expect(sitzung.credentialId).toBeTruthy();
    expect(sitzung.expiresAt).toBeGreaterThan(Date.now());
    // Und der Beweis, dass der Weg zurueck wirklich zurueckfuehrt: derselbe Mensch, der eben
    // noch ausgesperrt war, kommt danach wieder herein.
    const runde = (await hostRunden(db)).find(kandidat => kandidat.campaignId === campaignId)!;
    expect(runde.members.find(mitglied => mitglied.userId === leitung)!.hasAccess).toBe(true);
  });

  it("stellt keinen Code für jemanden aus, der nicht zu dieser Runde gehört", async () => {
    await expect(hostKopplung(db, campaignId, randomUUID(), config)).rejects.toThrow(HostZugangError);
  });
});

describe("Einladungen aus dem Hostfenster", () => {
  it("erzeugt einen Code, den der gewöhnliche Beitrittsweg annimmt", async () => {
    const einladung = await hostEinladung(db, campaignId);
    expect(einladung.expiresAt).toBeGreaterThan(Date.now());
    // Der eigentliche Punkt: der Code muss denselben Hashweg nehmen wie `issueInvitation`,
    // sonst ist er beim Einloesen wertlos — und das faellt erst dem Eingeladenen auf.
    const anfrage = await createCampaigns(db, config).requestJoin(einladung.code, { displayName: "Tuva" });
    expect(anfrage.id).toBeTruthy();
  });

  it("weist eine unbekannte Runde und eine unsinnige Gültigkeit zurück", async () => {
    await expect(hostEinladung(db, randomUUID())).rejects.toThrow(HostZugangError);
    await expect(hostEinladung(db, campaignId, 1000)).rejects.toThrow(HostZugangError);
    await expect(hostEinladung(db, "keine-kennung")).rejects.toThrow(HostZugangError);
  });
});

describe("Wer die Runde führt", () => {
  it("macht einen Spieler zur Spielleitung und wieder zurück", async () => {
    expect(await hostRolle(db, campaignId, spieler, "leitung")).toMatchObject({ role: "leitung", changed: true });
    let runde = (await hostRunden(db)).find(kandidat => kandidat.campaignId === campaignId)!;
    expect(runde.members.find(mitglied => mitglied.userId === spieler)!.role).toBe("leitung");
    // Eine Rollenaenderung IN einer Runde erweitert nicht die Rechte AUF dem Server. Das sind
    // zwei Fragen; sie zu vermischen waere eine stille Rechteerweiterung.
    expect(runde.members.find(mitglied => mitglied.userId === spieler)!.platformLeitung).toBe(false);

    expect(await hostRolle(db, campaignId, spieler, "spieler")).toMatchObject({ changed: true });
    runde = (await hostRunden(db)).find(kandidat => kandidat.campaignId === campaignId)!;
    expect(runde.members.find(mitglied => mitglied.userId === spieler)!.role).toBe("spieler");
  });

  it("meldet eine Rolle, die schon gilt, als unveraendert statt sie zu schreiben", async () => {
    expect(await hostRolle(db, campaignId, spieler, "spieler")).toMatchObject({ changed: false });
  });

  /** Die Zusicherung, die alles andere traegt: eine Runde ohne Spielleitung koennte niemand
   * mehr fuehren, niemanden mehr hereinlassen — und waere von hier aus nicht reparierbar. */
  it("laesst eine Runde nie ohne Spielleitung zurueck", async () => {
    await expect(hostRolle(db, campaignId, leitung, "spieler")).rejects.toThrow(HostZugangError);
    const runde = (await hostRunden(db)).find(kandidat => kandidat.campaignId === campaignId)!;
    expect(runde.members.filter(mitglied => mitglied.role === "leitung")).toHaveLength(1);

    // Mit einer zweiten Spielleitung ist der Rueckzug erlaubt — und danach ist die Runde
    // weiterhin gefuehrt.
    await hostRolle(db, campaignId, spieler, "leitung");
    expect(await hostRolle(db, campaignId, leitung, "spieler")).toMatchObject({ changed: true });
    const danach = (await hostRunden(db)).find(kandidat => kandidat.campaignId === campaignId)!;
    expect(danach.members.filter(mitglied => mitglied.role === "leitung").map(mitglied => mitglied.userId)).toEqual([spieler]);
    await hostRolle(db, campaignId, leitung, "leitung");
  });

  it("weist ein fremdes Mitglied und eine unbekannte Rolle zurueck", async () => {
    await expect(hostRolle(db, campaignId, randomUUID(), "leitung")).rejects.toThrow(HostZugangError);
    await expect(hostRolle(db, campaignId, spieler, "chef" as never)).rejects.toThrow(HostZugangError);
  });
});
