// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../src/app.ts";
import { createTestDb, migrate, type Db } from "../src/db/index.ts";
import { createCampaigns } from "../src/domain/campaigns.ts";
import { createDocuments, type PassageInput } from "../src/domain/documents.ts";
import { createIdentity } from "../src/identity/index.ts";
import { seedActorControl } from "./actor-fixtures.ts";

// Der Wiki-Export nimmt die Chronik als LESBARE Datei mit. Die eine Frage, an der alles hängt:
// enthält er, was die exportierende Person sehen darf — und nichts darüber hinaus?
const config = { origin: "https://chronicle.test", cookieSecret: "wiki-export-cookie-secret-long-enough", bootstrapToken: "wiki-export-bootstrap-secret-long-enough" };
const absatz = (text: string): PassageInput => ({ inhalt: { kind: "absatz", inhalt: [{ text, marks: [] }] } });

describe("Der Wiki-Export zeigt genau den Blick der exportierenden Person", () => {
  let db: Db, app: FastifyInstance, campaignId: string, spielerCookie: string, gmCookie: string, fremdCookie: string;
  const gm = randomUUID(), spieler = randomUUID(), fremd = randomUUID(), actor = randomUUID();
  let docs: ReturnType<typeof createDocuments>;
  const hole = (session: string) => app.inject({ method: "GET", url: `/api/campaigns/${campaignId}/wiki-export`, headers: { cookie: session } });

  beforeAll(async () => {
    db = await createTestDb(); await migrate(db);
    for (const [id, role] of [[gm, "leitung"], [spieler, "gast"], [fremd, "gast"]])
      await db.query("INSERT INTO users(id,display_name,platform_role,created_at) VALUES($1,$1,$2,1)", [id, role]);
    // Ein Name mit Umlaut und Leerzeichen: der Dateiname muss ihn überstehen, ohne die Kopfzeile
    // zu sprengen. Genau deshalb steht im Header eine kodierte Fassung neben dem ASCII-Rückfall.
    campaignId = (await createCampaigns(db).createCampaign(gm, { name: "Die Grüne Küste" })).id;
    await db.query("INSERT INTO actors(id,campaign_id,user_id,name) VALUES($1,$2,$3,'Leserin')", [actor, campaignId, spieler]);
    await db.query("INSERT INTO campaign_memberships(campaign_id,user_id,role,display_name,name_skeleton,actor_id) VALUES($1,$2,'spieler','Leserin','leserin',$3)", [campaignId, spieler, actor]);
    await seedActorControl(db, campaignId, actor, spieler);
    const identity = createIdentity(db, config);
    spielerCookie = `chronicle_session=${(await identity.issueSession(spieler)).value}`;
    gmCookie = `chronicle_session=${(await identity.issueSession(gm)).value}`;
    fremdCookie = `chronicle_session=${(await identity.issueSession(fremd)).value}`;
    docs = createDocuments(db); app = await buildApp(db, config);

    const hafen = await docs.saveEntry(gm, campaignId, { title: "Der Hafen", passages: [
      absatz("Die Kaimauer traegt seit Jahren."), absatz("Unter der Mauer liegt ein Tunnel."),
    ] });
    // Nur die erste Passage wird der Figur eroeffnet — die zweite ist ein Geheimnis.
    await docs.revealPassage(gm, campaignId, hafen.passagen[0]!.pid, actor);
    await docs.saveEntry(gm, campaignId, { title: "Die Verschwoerung", passages: [absatz("Sie treffen sich im Keller.")] });
  }, 30_000);
  afterAll(async () => { await app?.close(); await db?.close(); });

  it("gibt der Spielleitung den vollständigen Stand", async () => {
    const antwort = await hole(gmCookie);
    expect(antwort.statusCode).toBe(200);
    expect(antwort.body).toContain("Vollständiger Stand");
    expect(antwort.body).toContain("Der Hafen");
    expect(antwort.body).toContain("Unter der Mauer liegt ein Tunnel");
    expect(antwort.body).toContain("Die Verschwoerung");
  });

  it("gibt der Spielerin nur, was ihre Figur hält — und sagt es ihr", async () => {
    const antwort = await hole(spielerCookie);
    expect(antwort.statusCode).toBe(200);
    // Was sie hält, steht drin.
    expect(antwort.body).toContain("Der Hafen");
    expect(antwort.body).toContain("Die Kaimauer traegt seit Jahren");
    // Und was sie nicht hält, steht NICHT drin — weder die verborgene Passage desselben
    // Artikels noch der Artikel, den sie gar nicht kennt. Das ist der ganze Test.
    expect(antwort.body).not.toContain("Unter der Mauer liegt ein Tunnel");
    expect(antwort.body).not.toContain("Die Verschwoerung");
    expect(antwort.body).not.toContain("Sie treffen sich im Keller");
    // Ein Ausschnitt, der sich fuer das Ganze ausgibt, waere die unangenehmste Sorte Fehler.
    expect(antwort.body).toContain("**dein** Blick");
    expect(antwort.body).not.toContain("Vollständiger Stand");
  });

  it("liefert die Datei mit lesbarem Namen und ohne gesprengte Kopfzeile", async () => {
    const antwort = await hole(gmCookie);
    expect(antwort.headers["content-type"]).toContain("text/markdown");
    const disposition = String(antwort.headers["content-disposition"]);
    expect(disposition).toContain("attachment");
    // Der Umlaut ueberlebt kodiert; daneben steht ein ASCII-Rueckfall fuer alte Browser.
    expect(disposition).toContain("filename*=UTF-8''");
    expect(decodeURIComponent(/filename\*=UTF-8''([^;]+)/.exec(disposition)![1]!)).toBe("die-grüne-küste.md");
    expect(/filename="([^"]*)"/.exec(disposition)![1]).toMatch(/^[\x20-\x7e]+$/);
    expect(disposition).not.toMatch(/[\r\n]/);
  });

  it("verweigert die Chronik einer fremden Kampagne", async () => {
    // Dieselbe Antwort wie ueberall: wer nicht dazugehoert, erfaehrt nicht einmal, dass es sie gibt.
    expect((await hole(fremdCookie)).statusCode).toBe(404);
  });
});
