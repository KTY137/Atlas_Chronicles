// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { ImportValidationError } from "@chronicle/io";
import { buildApp, type AppConfig } from "../src/app.ts";
import { createTestDb, migrate, type Db } from "../src/db/index.ts";
import { createIdentity } from "../src/identity/index.ts";
import { createCampaigns } from "../src/domain/campaigns.ts";
import { createAtlas } from "../src/domain/atlas.ts";
import { createAtlasQuellen } from "../src/domain/atlas-quellen.ts";
import { createWikiMedien } from "../src/domain/wiki-medien.ts";
import { Gone } from "../src/domain/errors.ts";
import { pruefeSeitentitel, wikiBasis } from "../src/domain/wiki-abruf.ts";

/**
 * DIE KARTE KOMMT AUS DEM WIKI — und der fest verdrahtete Pfad ist weg.
 *
 * Kaya: *„mach das hard coded weg das ist nur ein beispiel für andaria weil ich nich weiß wie ich
 * die json der Karte runterlade auf wiki fandom"*. Diese Suite prüft genau das: die Spielleitung
 * nennt Adresse und Kartennamen, die App holt Karte UND Bild, schreibt mit, woher beides kommt,
 * und behandelt eine unbekannte Lizenz als unbekannt.
 *
 * **Kein Test spricht mit dem Netz.** `cfg.fetch` ist die Grenze; hier steht eine Attrappe, die
 * jede angefragte Adresse mitschreibt. Genau daran hängt die zweite Prüfung dieser Datei: dass
 * ein Import NICHTS abruft und dass kein Inhalt einen Abruf auslösen kann.
 */

const KARTE = readFileSync(new URL("../../../design/fixtures/eron/map-andaria.json", import.meta.url), "utf8");
/** Ein echtes 1×1-PNG. Maße und Typ liest der Server aus den Magic Bytes, nicht aus dem Namen. */
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
const config = { origin: "https://karte.test", cookieSecret: "karte-aus-wiki-cookie-secret-over-32-characters",
  bootstrapToken: "karte-aus-wiki-bootstrap-token-over-32-characters" };

interface Abruf { url: string; redirect?: string }

/** Ein Wiki aus Papier. Jede Antwort ist eine Entscheidung dieses Tests, keine des Netzes. */
function wikiAttrappe(overrides: Record<string, () => Response> = {}) {
  const gesehen: Abruf[] = [];
  const antworten: Record<string, () => Response> = {
    "https://eron.example/de/wiki/Karte%3AAndaria?action=raw": () => new Response(KARTE, { status: 200 }),
    "https://eron.example/de/api.php?action=query&prop=revisions&rvprop=ids%7Ctimestamp&rvslots=main&meta=siteinfo&siprop=rightsinfo&format=json&formatversion=2&titles=Karte%3AAndaria":
      () => new Response(JSON.stringify({ query: { rightsinfo: { text: "CC BY-SA 3.0" },
        pages: [{ pageid: 280, title: "Karte:Andaria", revisions: [{ revid: 1149, timestamp: "2025-12-07T12:25:25Z" }] }] } }), { status: 200 }),
    "https://eron.example/de/api.php?action=query&prop=imageinfo&iiprop=url%7Csize%7Cmime%7Cextmetadata&format=json&formatversion=2&titles=Datei%3AAndaria_03.02.2024.jpg":
      () => new Response(JSON.stringify({ query: { pages: [{ title: "Datei:Andaria 03.02.2024.jpg",
        imageinfo: [{ url: "https://static.example/eron/Andaria.jpg", descriptionurl: "https://eron.example/de/wiki/Datei:Andaria_03.02.2024.jpg",
          mime: "image/jpeg", size: PNG.byteLength, width: 8192, height: 8192,
          extmetadata: { Artist: { value: "<a href=\"x\">Cornelius Holloway</a>" }, DateTimeOriginal: { value: "2024-02-03T13:52:25Z" } } }] }] } }), { status: 200 }),
    "https://static.example/eron/Andaria.jpg": () => new Response(PNG, { status: 200, headers: { "content-type": "image/jpeg" } }),
    ...overrides,
  };
  const invoke: typeof fetch = async (input, init) => {
    const url = String(input);
    gesehen.push({ url, ...(init?.redirect ? { redirect: init.redirect } : {}) });
    const antwort = antworten[url];
    if (!antwort) return new Response("", { status: 404 });
    return antwort();
  };
  return { invoke, gesehen };
}

describe("Eine Weltkarte aus einem Wiki, ohne fest verdrahtete Datei", () => {
  let db: Db, gm: string, spielerin: string, actor: string, campaign: string;
  beforeAll(async () => {
    db = await createTestDb(); await migrate(db);
    const identity = createIdentity(db, config), campaigns = createCampaigns(db);
    gm = (await identity.bootstrap("Kaya")).userId;
    campaign = (await campaigns.createCampaign(gm, { name: "Andaria" })).id;
    const invite = await campaigns.issueInvitation(gm, campaign);
    const join = await campaigns.requestJoin(invite.code, { displayName: "Song" });
    const mitglied = await campaigns.approveJoin(gm, campaign, join.id);
    spielerin = mitglied.userId; actor = mitglied.actorId;
  }, 60_000);
  afterAll(async () => { await db?.close(); });

  it("weist alles ab, was kein öffentliches https-Wiki ist", () => {
    expect(wikiBasis("eron.fandom.com/de").href).toBe("https://eron.fandom.com/de/");
    expect(wikiBasis("https://eron.fandom.com/de/").href).toBe("https://eron.fandom.com/de/");
    for (const schlecht of ["http://eron.fandom.com/de", "https://user:pw@eron.fandom.com/", "https://127.0.0.1/w/",
      "https://192.168.1.4/w/", "https://localhost/w/", "https://10.0.0.9/", "file:///etc/passwd", "https://eron.fandom.com/?a=b"])
      expect(() => wikiBasis(schlecht)).toThrow(ImportValidationError);
    for (const schlecht of ["", "  ", "Karte:[Andaria]", "Karte|Andaria", "a".repeat(300)])
      expect(() => pruefeSeitentitel(schlecht)).toThrow(ImportValidationError);
  });

  it("holt Karte und Bild, schreibt Herkunft mit und markiert die unbekannte Lizenz als unbekannt", async () => {
    const wiki = wikiAttrappe();
    const quellen = createAtlasQuellen(db, { fetch: wiki.invoke });
    const ergebnis = await quellen.ausWiki(gm, campaign, { wiki: "eron.example/de", titel: "Karte:Andaria" });
    expect(ergebnis.unchanged).toBe(false);
    expect(ergebnis.bild).toMatchObject({ status: "geholt", dateiname: "Andaria 03.02.2024.jpg" });
    // Vier Abrufe, alle mit manueller Weiterleitung: Seite, Kennung, Dateiauskunft, Bytes.
    expect(wiki.gesehen.map(a => a.redirect)).toEqual(["manual", "manual", "manual", "manual"]);

    const herkunft = (await db.query("SELECT * FROM atlas_karten_herkunft WHERE map_id=$1", [ergebnis.id])).rows[0] as Record<string, unknown>;
    expect(herkunft).toMatchObject({ art: "wiki", wiki_url: "https://eron.example/de/", seitentitel: "Karte:Andaria",
      bild_dateiname: "Andaria 03.02.2024.jpg", lizenz: "CC BY-SA 3.0" });
    expect(String(herkunft.pageid)).toBe("280"); expect(String(herkunft.revid)).toBe("1149");
    expect(Number(herkunft.abgerufen_am)).toBeGreaterThan(0);

    const bestand = await createWikiMedien(db).bestand(gm, campaign);
    const zeile = bestand.assets.find(a => a.dateiname === "Andaria 03.02.2024.jpg")!;
    // Das Quell-Wiki nennt keine Lizenz. Unbekannt bleibt unbekannt — nie stillschweigend frei.
    expect(zeile.lizenzStatus).toBe("unbekannt");
    expect(zeile.vorhanden).toBe(true); expect(zeile.mime).toBe("image/png");
    expect(zeile.behaupteterMime).toBe("image/jpeg"); expect(zeile.formatWiderspruch).toBe(true);
    expect(zeile.urheber).toBe("Cornelius Holloway");
    expect(zeile.quellUrl).toBe("https://static.example/eron/Andaria.jpg");
  }, 60_000);

  it("zeigt der Spielleitung Hintergrund, Herkunft und Markerbeschreibung, der Spielerin nichts davon", async () => {
    const atlas = createAtlas(db);
    const karte = (await atlas.listMaps(gm, campaign))[0]!;
    const sicht = await atlas.getMap(gm, campaign, karte.id) as Record<string, any>;
    // Der Hintergrund kommt aus dem BILD (1×1 gemessen), nicht aus dem Kartenrahmen (8192).
    expect(sicht.background).toEqual({ url: `/api/campaigns/${campaign}/maps/${karte.id}/image`, width: 1, height: 1 });
    expect(sicht.herkunft).toMatchObject({ art: "wiki", wikiUrl: "https://eron.example/de/", seitentitel: "Karte:Andaria", pageid: 280, revid: 1149 });
    const mitText = sicht.nodes.filter((n: { description?: string }) => n.description);
    expect(mitText.length).toBeGreaterThan(50);
    expect(mitText[0].description.length).toBeGreaterThan(0);

    const bild = await atlas.mapImage(gm, campaign, karte.id);
    expect(bild.mime).toBe("image/png");
    expect(Buffer.from(bild.daten).equals(PNG)).toBe(true);

    const pin = sicht.pins[0];
    await atlas.revealNode(gm, campaign, karte.id, pin.id, actor);
    const spielersicht = await atlas.getMap(spielerin, campaign, karte.id) as Record<string, any>;
    expect(spielersicht).not.toHaveProperty("background");
    expect(spielersicht).not.toHaveProperty("herkunft");
    expect(spielersicht.nodes.every((n: { description?: string }) => n.description === undefined)).toBe(true);
    await expect(atlas.mapImage(spielerin, campaign, karte.id)).rejects.toBeInstanceOf(Gone);
  }, 60_000);

  it("ruft beim gewöhnlichen Import nichts ab — kein Inhalt löst einen Abruf aus", async () => {
    const wiki = wikiAttrappe();
    const eigene = (await createCampaigns(db).createCampaign(gm, { name: "Ohne Netz" })).id;
    await createAtlas(db, { fetch: wiki.invoke }).importMap(gm, eigene, KARTE);
    expect(wiki.gesehen).toEqual([]);
  }, 60_000);

  it("folgt einer Weiterleitung nur nach erneuter Prüfung und bricht bei http ab", async () => {
    const eigene = (await createCampaigns(db).createCampaign(gm, { name: "Umleitung" })).id;
    const wiki = wikiAttrappe({
      "https://eron.example/de/wiki/Karte%3AAndaria?action=raw": () =>
        new Response("", { status: 302, headers: { location: "http://eron.example/de/wiki/Karte:Andaria?action=raw" } }),
    });
    await expect(createAtlasQuellen(db, { fetch: wiki.invoke })
      .ausWiki(gm, eigene, { wiki: "eron.example/de", titel: "Karte:Andaria" })).rejects.toThrow(ImportValidationError);
    expect(wiki.gesehen).toHaveLength(1);
  }, 60_000);

  it("behält die Karte, wenn nur das Bild nicht ankommt", async () => {
    const eigene = (await createCampaigns(db).createCampaign(gm, { name: "Karte ohne Bild" })).id;
    const wiki = wikiAttrappe({ "https://static.example/eron/Andaria.jpg": () => new Response("", { status: 500 }) });
    const ergebnis = await createAtlasQuellen(db, { fetch: wiki.invoke })
      .ausWiki(gm, eigene, { wiki: "eron.example/de", titel: "Karte:Andaria" });
    expect(ergebnis.unchanged).toBe(false);
    expect(ergebnis.bild.status).toBe("fehlgeschlagen");
    const sicht = await createAtlas(db).getMap(gm, eigene, ergebnis.id) as Record<string, any>;
    expect(sicht.pins).toHaveLength(190);
    expect(sicht).not.toHaveProperty("background");
    // Die Karte weiß trotzdem, welches Bild sie sucht.
    expect((await createAtlas(db).herkunftVon(eigene, ergebnis.id))?.bild_dateiname).toBe("Andaria 03.02.2024.jpg");
  }, 60_000);

  it("macht aus einem hochgeladenen Kartenbild eine Karte ohne Marker", async () => {
    const eigene = (await createCampaigns(db).createCampaign(gm, { name: "Inkarnate" })).id;
    const quellen = createAtlasQuellen(db);
    const ergebnis = await quellen.ausBild(gm, eigene, { dateiname: "Nordmark.png", lizenz: "frei", quelle: "Selbst gezeichnet" }, new Uint8Array(PNG));
    const sicht = await createAtlas(db).getMap(gm, eigene, ergebnis.id) as Record<string, any>;
    expect(sicht.title).toBe("Nordmark");
    expect(sicht.pins).toEqual([]);
    expect(sicht.background).toEqual({ url: `/api/campaigns/${eigene}/maps/${ergebnis.id}/image`, width: 1, height: 1 });
    expect(sicht.herkunft).toMatchObject({ art: "bild" });
    const zeile = (await createWikiMedien(db).bestand(gm, eigene)).assets[0]!;
    expect(zeile).toMatchObject({ dateiname: "Nordmark.png", lizenzStatus: "frei", vorhanden: true });
  }, 60_000);
});

/**
 * Dieselben Wege durch die echte Anwendung: geschlossene Schemata, Rollenprüfung und der
 * rohe Byteweg für ein Kartenbild, der ohne HTTP gar nicht geprüft werden kann.
 */
describe("Die Kartenwege durch die echte Anwendung", () => {
  let db: Db, app: FastifyInstance, gmCookie: string, spielerCookie: string, campaign: string;
  const wiki = wikiAttrappe();
  beforeAll(async () => {
    db = await createTestDb(); await migrate(db);
    const identity = createIdentity(db, config), campaigns = createCampaigns(db);
    const gm = (await identity.bootstrap("Kaya")).userId;
    campaign = (await campaigns.createCampaign(gm, { name: "Über HTTP" })).id;
    const invite = await campaigns.issueInvitation(gm, campaign);
    const join = await campaigns.requestJoin(invite.code, { displayName: "Song" });
    const mitglied = await campaigns.approveJoin(gm, campaign, join.id);
    gmCookie = `chronicle_session=${(await identity.issueSession(gm)).value}`;
    spielerCookie = `chronicle_session=${(await identity.issueSession(mitglied.userId)).value}`;
    app = await buildApp(db, { ...config, fetch: wiki.invoke } as AppConfig);
  }, 60_000);
  afterAll(async () => { await app?.close(); await db?.close(); });
  const kopf = (cookie: string) => ({ cookie, origin: config.origin });

  it("holt über POST /maps/aus-wiki, weist Spielerin und unsichere Adresse ab", async () => {
    const gut = await app.inject({ method: "POST", url: `/api/campaigns/${campaign}/maps/aus-wiki`,
      headers: kopf(gmCookie), payload: { wiki: "eron.example/de", titel: "Karte:Andaria" } });
    expect(gut.statusCode).toBe(200);
    expect(gut.json()).toMatchObject({ unchanged: false, bild: { status: "geholt" } });

    const spielerin = await app.inject({ method: "POST", url: `/api/campaigns/${campaign}/maps/aus-wiki`,
      headers: kopf(spielerCookie), payload: { wiki: "eron.example/de", titel: "Karte:Andaria" } });
    expect(spielerin.statusCode).toBe(404);

    const heimnetz = await app.inject({ method: "POST", url: `/api/campaigns/${campaign}/maps/aus-wiki`,
      headers: kopf(gmCookie), payload: { wiki: "192.168.1.4/w", titel: "Karte:Andaria" } });
    expect(heimnetz.statusCode).toBe(400);

    const zuviel = await app.inject({ method: "POST", url: `/api/campaigns/${campaign}/maps/aus-wiki`,
      headers: kopf(gmCookie), payload: { wiki: "eron.example/de", titel: "Karte:Andaria", extra: 1 } });
    expect(zuviel.statusCode).toBe(400);
  }, 60_000);

  it("nimmt rohe Bildbytes für eine Bildkarte an und liefert sie autorisiert wieder aus", async () => {
    const antwort = await app.inject({ method: "POST",
      url: `/api/campaigns/${campaign}/maps/bild?dateiname=${encodeURIComponent("Nordmark.png")}`,
      headers: { ...kopf(gmCookie), "content-type": "application/octet-stream" }, payload: PNG });
    expect(antwort.statusCode).toBe(200);
    const karte = antwort.json() as { id: string };
    const bild = await app.inject({ method: "GET", url: `/api/campaigns/${campaign}/maps/${karte.id}/image`, headers: kopf(gmCookie) });
    expect(bild.statusCode).toBe(200);
    expect(bild.headers["content-type"]).toContain("image/png");
    expect(bild.headers["cache-control"]).toBe("private, no-store");
    expect(Buffer.from(bild.rawPayload).equals(PNG)).toBe(true);
    expect((await app.inject({ method: "GET", url: `/api/campaigns/${campaign}/maps/${karte.id}/image`, headers: kopf(spielerCookie) })).statusCode).toBe(404);
    // Ohne Dateinamen gibt es keine Bildkarte — die Anfrage ist unvollständig, nicht ratbar.
    expect((await app.inject({ method: "POST", url: `/api/campaigns/${campaign}/maps/bild`,
      headers: { ...kopf(gmCookie), "content-type": "application/octet-stream" }, payload: PNG })).statusCode).toBe(400);
  }, 60_000);
});
