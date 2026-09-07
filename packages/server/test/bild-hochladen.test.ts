// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { ImportValidationError } from "@chronicle/io";
import { buildApp } from "../src/app.ts";
import { createTestDb, migrate, type Db } from "../src/db/index.ts";
import { createIdentity } from "../src/identity/index.ts";
import { createCampaigns } from "../src/domain/campaigns.ts";
import { createActors } from "../src/domain/actors.ts";
import { createWikiMedien } from "../src/domain/wiki-medien.ts";
import { Gone } from "../src/domain/errors.ts";

/**
 * EIGENE BILDER — ohne dass je ein Wiki importiert wurde.
 *
 * Der Bildbestand entstand als zweite Haelfte des Wiki-Imports: Bytes liessen sich nur in eine
 * Zeile schieben, die der Import angelegt hatte. Wer nie ein Wiki importiert hat — und das sind
 * die meisten Runden — konnte damit kein einziges Bild hochladen und keine Lootkarte bebildern.
 *
 * Diese Suite baut die Kampagne deshalb ABSICHTLICH ohne jeden Import auf. Sie ist genau dann
 * gruen, wenn der neue Eingang wirklich fuer sich allein traegt.
 */

/** Ein echtes 1x1-PNG. Der Server bestimmt den Typ aus den Magic Bytes, nicht aus dem Namen. */
const PNG_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
const png = () => new Uint8Array(Buffer.from(PNG_BASE64, "base64"));
const config = { origin: "https://bild.test", cookieSecret: "bild-hochladen-cookie-secret-over-32-characters",
  bootstrapToken: "bild-hochladen-bootstrap-token-over-32-characters" };
const befehl = () => ({ commandId: randomUUID() });

describe("Ein eigenes Bild hochladen", () => {
  let db: Db, gm: string, spielerin: string, spielerinActor: string, campaign: string;
  let medien: ReturnType<typeof createWikiMedien>, actors: ReturnType<typeof createActors>;
  let app: FastifyInstance, gmCookie: string, spielerinCookie: string;

  beforeAll(async () => {
    db = await createTestDb();
    await migrate(db);
    const identity = createIdentity(db, config), campaigns = createCampaigns(db);
    gm = (await identity.bootstrap("Kaya")).userId;
    campaign = (await campaigns.createCampaign(gm, { name: "Ohne Wiki" })).id;
    const invite = await campaigns.issueInvitation(gm, campaign);
    const join = await campaigns.requestJoin(invite.code, { displayName: "Song" });
    const mitglied = await campaigns.approveJoin(gm, campaign, join.id);
    spielerin = mitglied.userId; spielerinActor = mitglied.actorId;
    medien = createWikiMedien(db, {}); actors = createActors(db);
    gmCookie = `chronicle_session=${(await identity.issueSession(gm)).value}`;
    spielerinCookie = `chronicle_session=${(await identity.issueSession(spielerin)).value}`;
    app = await buildApp(db, config);
  }, 30_000);
  afterAll(async () => { await app?.close(); await db?.close(); });

  it("nimmt ein PNG an, obwohl nie ein Wiki importiert wurde", async () => {
    const angelegt = await medien.anlegen(gm, campaign, { dateiname: "drachenklinge.png", lizenz: "frei", quelle: "Selbst gezeichnet" });
    expect(angelegt.angelegt).toBe(true);
    // Zwei Schritte, ein Weg: die Zeile entsteht leer, die Bytes gehen durch dieselbe Vermessung
    // wie jede Wiki-Datei — Typ und Masse aus den Magic Bytes.
    const befund = await medien.bytesAnnehmen(gm, campaign, angelegt.id, png());
    expect(befund).toMatchObject({ mime: "image/png", breite: 1, hoehe: 1, gespeichert: true });

    const { assets } = await medien.bestand(gm, campaign);
    const zeile = assets.find((asset) => asset.id === angelegt.id)!;
    expect(zeile).toMatchObject({ dateiname: "drachenklinge.png", vorhanden: true, selbstHochgeladen: true, lizenzStatus: "frei" });
    // Der Formatwiderspruch bleibt aus: hier BEHAUPTET niemand einen Typ, es misst nur einer.
    expect(zeile.formatWiderspruch).toBe(false);
    expect(zeile.behaupteterMime).toBeNull();

    const datei = await medien.ausliefern(gm, campaign, angelegt.id);
    expect(datei.mime).toBe("image/png");
    expect(datei.daten.toString("base64")).toBe(PNG_BASE64);
  });

  it("laesst denselben Namen wiederholen, solange die Zeile leer ist — und danach nicht mehr", async () => {
    const erster = await medien.anlegen(gm, campaign, { dateiname: "zweiter-versuch.png" });
    const zweiter = await medien.anlegen(gm, campaign, { dateiname: "zweiter-versuch.png" });
    // Ein Fehlschlag beim Hochladen darf keinen Namen fuer immer verbrennen.
    expect(zweiter).toMatchObject({ id: erster.id, angelegt: false });
    await medien.bytesAnnehmen(gm, campaign, erster.id, png());
    // Sobald ein Bild darin liegt, ist der Name vergeben: ein Upload ueberschreibt kein Bild.
    await expect(medien.anlegen(gm, campaign, { dateiname: "zweiter-versuch.png" })).rejects.toThrow(ImportValidationError);
    const { assets } = await medien.bestand(gm, campaign);
    expect(assets.filter((asset) => asset.dateiname === "zweiter-versuch.png")).toHaveLength(1);
  });

  it("weist ab, was kein Bild ist — und laesst die Zeile leer statt halb gefuellt", async () => {
    const angelegt = await medien.anlegen(gm, campaign, { dateiname: "kein-bild.png" });
    await expect(medien.bytesAnnehmen(gm, campaign, angelegt.id, new Uint8Array(Buffer.from("%PDF-1.7 kein Bild")))).rejects.toThrow();
    const { assets } = await medien.bestand(gm, campaign);
    const zeile = assets.find((asset) => asset.id === angelegt.id)!;
    expect(zeile.vorhanden).toBe(false);
    expect(zeile.mime).toBeNull();
    // Und die Auslieferung verspricht nichts, was nicht da ist.
    await expect(medien.ausliefern(gm, campaign, angelegt.id)).rejects.toThrow(Gone);
  });

  it("prueft den Namen: Pfadtrenner und Steuerzeichen nein, Umlaute ja", async () => {
    for (const dateiname of ["karten/burg.png", `karten${String.fromCharCode(92)}burg.png`, `zeilen${String.fromCharCode(10)}umbruch.png`, "   "])
      await expect(medien.anlegen(gm, campaign, { dateiname })).rejects.toThrow(ImportValidationError);
    // Der Name ist Anzeigetext, kein Pfad — und Anzeigetext darf deutsch sein.
    const angelegt = await medien.anlegen(gm, campaign, { dateiname: "Bärenhöhle groß.png" });
    expect(angelegt.dateiname).toBe("Bärenhöhle groß.png");
  });

  it("laesst nur die Spielleitung Bilder anlegen", async () => {
    await expect(medien.anlegen(spielerin, campaign, { dateiname: "heimlich.png" })).rejects.toThrow(Gone);
  });

  /**
   * DER GRUND, WARUM ES DIESES BILD GIBT: es ist das Gesicht einer Lootkarte.
   *
   * Eine Karte ohne Bild ist ein leerer Rahmen — und genau das sah eine Spielerin, solange ein
   * Bild nur ueber eine freigegebene Passage sichtbar war: ein selbst hochgeladenes Kartenbild
   * haengt an keiner Passage. Wer den Gegenstand haelt, sieht sein Bild; wer ihn nicht haelt,
   * sieht es nicht, auch wenn er die Adresse kennt.
   */
  it("zeigt das Kartengesicht dem, der die Karte haelt — und sonst niemandem", async () => {
    const bild = await medien.anlegen(gm, campaign, { dateiname: "flammenschwert.png", lizenz: "frei" });
    await medien.bytesAnnehmen(gm, campaign, bild.id, png());
    const vorlage = await actors.createItemTemplate(gm, campaign, { ...befehl(), definition: {
      schemaVersion: 2, name: "Flammenschwert", loreEntryId: null, tags: [], seltenheit: "legendaer",
      kategorie: "Waffe", bildAssetId: bild.id, spruch: "Es brennt, seit Bodin es fallen liess.", zeilen: [],
    } });

    // Vor der Uebergabe: die Spielerin kennt die Adresse und bekommt trotzdem nichts.
    await expect(medien.ausliefern(spielerin, campaign, bild.id)).rejects.toThrow(Gone);

    await actors.instantiateItem(gm, campaign, { ...befehl(), templateId: vorlage.id, templateRevision: 1, holderActorId: spielerinActor });
    const datei = await medien.ausliefern(spielerin, campaign, bild.id);
    expect(datei.daten.toString("base64")).toBe(PNG_BASE64);

    // Und der Bestand selbst bleibt der Spielleitung vorbehalten: das Bild sehen heisst nicht,
    // die Liste aller Bilder sehen zu duerfen.
    await expect(medien.bestand(spielerin, campaign)).rejects.toThrow(Gone);
  });

  /**
   * DERSELBE WEG DURCH DIE ECHTE ANWENDUNG.
   *
   * Die Fachlichkeit zu pruefen genuegt nicht: eine Route, die es nicht gibt, ein geschlossenes
   * Schema, das den Rumpf abweist, ein fehlender Herkunftskopf — jeder dieser Faelle laesst die
   * Oberflaeche ins Leere greifen, waehrend die Domaene gruen bleibt.
   *
   * `null` heisst hier ausdruecklich OHNE `Origin`. `undefined` waere untauglich: es aktiviert
   * den Vorgabewert, und der Fall haette die Herkunft doch mitgeschickt.
   */
  const post = (pfad: string, body: unknown, cookie: string, origin: string | null = config.origin) =>
    app.inject({ method: "POST", url: `/api/campaigns/${campaign}${pfad}`,
      headers: { cookie, "content-type": "application/json", ...(origin === null ? {} : { origin }) }, payload: JSON.stringify(body) });

  it("traegt denselben Weg ueber HTTP: Zeile anlegen, Bytes schicken, Bild abholen", async () => {
    const angelegt = await post("/wiki-medien", { dateiname: "wappen.png", lizenz: "frei" }, gmCookie);
    expect(angelegt.statusCode).toBe(200);
    const id = angelegt.json().id as string;

    const hoch = await app.inject({ method: "PUT", url: `/api/campaigns/${campaign}/wiki-medien/${id}/bytes`,
      headers: { cookie: gmCookie, "content-type": "application/octet-stream", origin: config.origin }, payload: Buffer.from(PNG_BASE64, "base64") });
    expect(hoch.statusCode).toBe(200);
    expect(hoch.json()).toMatchObject({ mime: "image/png", gespeichert: true });

    const datei = await app.inject({ method: "GET", url: `/api/campaigns/${campaign}/wiki-medien/${id}/datei`, headers: { cookie: gmCookie } });
    expect(datei.statusCode).toBe(200);
    expect(datei.headers["content-type"]).toBe("image/png");
    expect(datei.rawPayload.toString("base64")).toBe(PNG_BASE64);
  });

  it("weist ab, was die Anwendung schuetzt: fremde Herkunft, Spielerin, unbekanntes Feld", async () => {
    // Ohne passenden `Origin` antwortet die Anwendung wie auf alles Unerlaubte: 404.
    expect((await post("/wiki-medien", { dateiname: "ohne-herkunft.png" }, gmCookie, null)).statusCode).toBe(404);
    expect((await post("/wiki-medien", { dateiname: "fremde-herkunft.png" }, gmCookie, "https://woanders.test")).statusCode).toBe(404);
    expect((await post("/wiki-medien", { dateiname: "heimlich-http.png" }, spielerinCookie)).statusCode).toBe(404);
    // Geschlossenes Schema: ein erfundenes Feld ist eine Eingabe, die niemand liest.
    expect((await post("/wiki-medien", { dateiname: "erfunden.png", geheim: true }, gmCookie)).statusCode).toBe(400);
    // Und nichts davon hat eine Zeile hinterlassen.
    const { assets } = await medien.bestand(gm, campaign);
    expect(assets.filter((asset) => asset.dateiname.includes("herkunft") || asset.dateiname.includes("heimlich") || asset.dateiname.includes("erfunden"))).toHaveLength(0);
  });

  /**
   * EIN BILD WIEDER LOSWERDEN — und die Sperre, die den eigentlichen Inhalt ausmacht.
   *
   * Ohne Loeschweg war ein Vertipper endgueltig: der Name blieb je Kampagne fuer immer belegt.
   * Mit einem unbedachten Loeschweg waere es schlimmer — `wiki_asset_uses` haengt per
   * ON DELETE CASCADE an der Bildzeile, ein Loeschen naehme die Verwendungen stillschweigend mit
   * und liesse Artikel mit leeren Rahmen zurueck.
   */
  it("entfernt ein Bild, das niemand zeigt — und der Name ist danach wieder frei", async () => {
    const bild = await medien.anlegen(gm, campaign, { dateiname: "vertippt.png" });
    await medien.bytesAnnehmen(gm, campaign, bild.id, png());
    expect((await medien.bestand(gm, campaign)).assets.find((a) => a.id === bild.id)!.loeschbar).toBe(true);

    expect(await medien.loeschen(gm, campaign, bild.id)).toMatchObject({ geloescht: true, dateiname: "vertippt.png" });
    expect((await medien.bestand(gm, campaign)).assets.some((a) => a.id === bild.id)).toBe(false);
    // Der Beleg, dass wirklich Platz entstanden ist: derselbe Name traegt wieder ein neues Bild.
    const neu = await medien.anlegen(gm, campaign, { dateiname: "vertippt.png" });
    expect(neu.angelegt).toBe(true);
    expect(neu.id).not.toBe(bild.id);
  });

  it("weigert sich, ein Bild zu entfernen, das eine Lootkarte zeigt", async () => {
    const bild = await medien.anlegen(gm, campaign, { dateiname: "gebunden.png" });
    await medien.bytesAnnehmen(gm, campaign, bild.id, png());
    await actors.createItemTemplate(gm, campaign, { ...befehl(), definition: {
      schemaVersion: 2, name: "Gebundener Kelch", loreEntryId: null, tags: [], seltenheit: "selten",
      kategorie: "Gefaess", bildAssetId: bild.id, spruch: "", zeilen: [],
    } });
    // Die Liste sagt es vor dem Klick, der Server sagt es nochmal danach.
    expect((await medien.bestand(gm, campaign)).assets.find((a) => a.id === bild.id)!.loeschbar).toBe(false);
    await expect(medien.loeschen(gm, campaign, bild.id)).rejects.toThrow(ImportValidationError);
    // Und das Bild ist noch da: eine Absage darf nichts halb erledigen.
    expect((await medien.ausliefern(gm, campaign, bild.id)).daten.toString("base64")).toBe(PNG_BASE64);
  });

  it("laesst nur die Spielleitung entfernen und kennt kein fremdes Bild", async () => {
    const bild = await medien.anlegen(gm, campaign, { dateiname: "fremd.png" });
    await expect(medien.loeschen(spielerin, campaign, bild.id)).rejects.toThrow(Gone);
    await expect(medien.loeschen(gm, campaign, randomUUID())).rejects.toThrow(Gone);
    // Der abgewiesene Versuch hat die Zeile nicht angeruehrt.
    expect((await medien.bestand(gm, campaign)).assets.some((a) => a.id === bild.id)).toBe(true);
  });

  it("entfernt ueber die echte Anwendung mit DELETE — und nicht ohne Herkunft", async () => {
    const angelegt = await post("/wiki-medien", { dateiname: "per-route.png" }, gmCookie);
    const id = angelegt.json().id as string;
    const entfernen = (origin: string | null) => app.inject({ method: "DELETE",
      url: `/api/campaigns/${campaign}/wiki-medien/${id}`,
      headers: { cookie: gmCookie, ...(origin === null ? {} : { origin }) } });
    // Auch ein Loeschen ist ein Schreibzugriff: ohne passenden Origin antwortet die Anwendung 404.
    expect((await entfernen(null)).statusCode).toBe(404);
    expect((await entfernen(config.origin)).statusCode).toBe(200);
    expect((await medien.bestand(gm, campaign)).assets.some((a) => a.id === id)).toBe(false);
  });
});
