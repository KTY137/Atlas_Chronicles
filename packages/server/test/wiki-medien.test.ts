// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDb, migrate, type Db } from "../src/db/index.ts";
import { createIdentity } from "../src/identity/index.ts";
import { createCampaigns } from "../src/domain/campaigns.ts";
import { createImports } from "../src/domain/imports.ts";
import { createDocuments } from "../src/domain/documents.ts";
import { createWikiMedien } from "../src/domain/wiki-medien.ts";
import { Gone } from "../src/domain/errors.ts";
import { CAMPAIGN_V7_ADDITIONAL_TABLES, currentCampaignSemanticDiff, ImportValidationError, parseCurrentCampaignBundle, serializeCurrentCampaignBundle } from "@chronicle/io";
import { exportCampaignBundle, initializeCampaignRestoreTarget, inspectCampaignRestore, restoreCampaignBundle } from "../src/domain/bundles.ts";

/**
 * DAS BILD KOMMT AN — der ganze Weg, an echtem Material.
 *
 * Import eines echten Eron-Artikels mit Portrait → Asset-Zeile mit Herkunft und Lizenzurteil →
 * Bytes einer echten Datei aus `design/fixtures/eron/media/` → Auslieferung.
 *
 * Die zwei Behauptungen, auf die es ankommt, und beide werden hier scharf geprüft:
 *
 * 1. **Der Dateiname lügt, die Bytes nicht.** Die Quelle nennt `Bodin.jpg`, geliefert wird WebP.
 *    Gespeichert wird der gemessene Typ, und der Widerspruch wird gemeldet statt geglättet.
 * 2. **Ein Bild ist so verborgen wie seine Passage.** Wer den Absatz nicht sehen darf, bekommt
 *    das Bild auch dann nicht, wenn er seine Adresse kennt — sonst wäre die Freigabe von Wissen
 *    umgehbar, indem man die Bilder direkt abruft.
 */
const fixture = (name: string) => JSON.parse(readFileSync(new URL(`../../../design/fixtures/eron/${name}`, import.meta.url), "utf8"));
const bytesVon = (name: string) => new Uint8Array(readFileSync(new URL(`../../../design/fixtures/eron/media/${name}`, import.meta.url)));

const alleArtikel = fixture("articles.json") as { title: string; pageid: number; ns: number; revid: number; wikitext: string }[];
const templates = fixture("templates.json") as unknown[];
const medienBestand = fixture("media.json") as { title: string }[];
const artikel = alleArtikel.filter((row) => ["Bodin", "Song Kayn"].includes(row.title));

/**
 * Kaya, 2026-09-11: „ich kann nix mehr importieren, der Auswahl übernehmen Befehl schlägt fehl".
 * Das Postgres-Protokoll: `wiki_assets_campaign_id_dateiname_key` — das Kartenbild lag schon im
 * Bestand (Karte aus dem Wiki geholt), und der Artikelimport suchte nur nach seiner eigenen
 * Kennung, fand nichts und fügte denselben Dateinamen ein zweites Mal ein.
 */
describe("Ein Bild, das schon unter demselben Namen im Bestand liegt", () => {
  let db: Db;
  afterAll(async () => { await db?.close(); });
  it("bricht den Import nicht ab, sondern nimmt die vorhandene Zeile", async () => {
    db = await createTestDb();
    await migrate(db);
    const config = { origin: "https://medien.test", cookieSecret: "medien-test-cookie-secret-more-than-32-characters", bootstrapToken: "medien-bootstrap-secret-more-than-32-characters" };
    const gm = (await createIdentity(db, config).bootstrap("Kaya")).userId;
    const runde = await createCampaigns(db).createCampaign(gm, { name: "Eron" });
    // So legt der Kartenweg (`atlas-quellen.ts#bildzeile`) eine Zeile an: eigene Kennung, derselbe Name.
    await db.query(`INSERT INTO wiki_assets(id,campaign_id,universe_id,dateiname,lizenz_status,lizenz_gesetzt_von,verwendet_von,verwaist,im_bestand,created_by,created_at)
      VALUES($1,$2,$3,'Bodin.jpg','unbekannt','mensch','[]'::jsonb,false,true,$4,$5)`, ["vorher-da-0000-0000-0000-000000000000", runde.id, runde.universeId, gm, Date.now()]);
    const imports = createImports(db, {});
    const preview = await imports.previewEron(gm, runde.id, { articles: artikel, templates, wikiUrl: "https://eron.fandom.com/de/", media: medienBestand });
    await imports.acceptEron(gm, runde.id, preview.artifactId, preview.entries.map((entry) => entry.id));
    const zeilen = (await db.query<{ id: string }>("SELECT id FROM wiki_assets WHERE campaign_id=$1 AND dateiname='Bodin.jpg'", [runde.id])).rows;
    expect(zeilen).toHaveLength(1);
    const verwendet = await db.query("SELECT 1 FROM wiki_asset_uses WHERE campaign_id=$1 AND asset_id=$2", [runde.id, zeilen[0]!.id]);
    expect(verwendet.rowCount).toBeGreaterThan(0);
  }, 60_000);
});

describe("Wiki-Medien — Herkunft, Bytes und Sicht", () => {
  let db: Db, gm: string, spieler: string, campaign: string, actorId: string;
  const config = { origin: "https://medien.test", cookieSecret: "medien-test-cookie-secret-more-than-32-characters", bootstrapToken: "medien-bootstrap-secret-more-than-32-characters" };
  let assetId: string;

  beforeAll(async () => {
    db = await createTestDb();
    await migrate(db);
    const identity = createIdentity(db, config), campaigns = createCampaigns(db);
    gm = (await identity.bootstrap("Kaya")).userId;
    campaign = (await campaigns.createCampaign(gm, { name: "Eron" })).id;
    const invite = await campaigns.issueInvitation(gm, campaign);
    const join = await campaigns.requestJoin(invite.code, { displayName: "Song" });
    // `approveJoin` legt zugleich die Figur an, die die Spielerin führt — ohne sie wäre
    // „darf diese Leserin das?" keine Frage mit zwei möglichen Antworten.
    const mitglied = await campaigns.approveJoin(gm, campaign, join.id);
    spieler = mitglied.userId; actorId = mitglied.actorId;

    const imports = createImports(db, {});
    const preview = await imports.previewEron(gm, campaign, {
      articles: artikel, templates, wikiUrl: "https://eron.fandom.com/de/", media: medienBestand,
    });
    await imports.acceptEron(gm, campaign, preview.artifactId, preview.entries.map((entry) => entry.id));
    const row = (await db.query<{ id: string }>("SELECT id FROM wiki_assets WHERE campaign_id=$1 AND dateiname=$2", [campaign, "Bodin.jpg"])).rows[0];
    assetId = row!.id;
  }, 60_000);
  afterAll(async () => { await db?.close(); });

  it("legt für das Portrait eine Zeile mit belegter Herkunft an — und behauptet keinen Typ", async () => {
    const medien = createWikiMedien(db, {});
    const { assets, bilanz } = await medien.bestand(gm, campaign);
    const bodin = assets.find((asset) => asset.dateiname === "Bodin.jpg")!;
    expect(bodin).toMatchObject({ vorhanden: false, verwaist: false, imBestand: true, lizenzStatus: "unbekannt", behaupteterMime: "image/jpeg" });
    expect(bodin.mime).toBeNull();
    expect(bodin.sha256).toBeNull();
    expect(bodin.urheber).toBeTruthy();
    expect(bodin.quellUrl).toMatch(/^https:\/\//);
    expect(bilanz.vorhanden).toBe(0);
    expect(bilanz.offen).toBeGreaterThan(0);
    /**
     * Zwei von 74 Artikeln wurden importiert. In die Kampagne gehören daher genau: die Bilder
     * dieser zwei, plus die Dateien, die im Quell-Wiki überhaupt niemand benutzt. Die Bilder der
     * 72 nicht übernommenen Artikel gehören ausdrücklich NICHT dazu — `Irme.png` steht im
     * Bestand des Wikis und wird vom Artikel „Irme" benutzt, den hier niemand importiert hat.
     */
    expect(assets.some((asset) => asset.dateiname === "SongKayn.png")).toBe(true);
    expect(assets.some((asset) => asset.dateiname === "Irme.png")).toBe(false);
    expect(assets.filter((asset) => asset.verwaist).length).toBe(bilanz.verwaist);
    expect(bilanz.verwaist).toBeGreaterThanOrEqual(10);
    expect(bilanz.gesamt).toBe(2 + bilanz.verwaist);
    expect(bilanz.gesamt).toBeLessThan(medienBestand.length);
  });

  it("nimmt echte Bytes an, misst sie und widerspricht dem Dateinamen des Wikis", async () => {
    const medien = createWikiMedien(db, {});
    const befund = await medien.bytesAnnehmen(gm, campaign, assetId, bytesVon("Bodin.webp"));
    expect(befund).toMatchObject({ mime: "image/webp", breite: 512, hoehe: 512, gespeichert: true, formatWiderspruch: true });
    expect(befund.sha256).toMatch(/^[a-f0-9]{64}$/);
    const { assets, bilanz } = await medien.bestand(gm, campaign);
    const bodin = assets.find((asset) => asset.dateiname === "Bodin.jpg")!;
    expect(bodin).toMatchObject({ vorhanden: true, mime: "image/webp", breite: 512, hoehe: 512, formatWiderspruch: true });
    expect(bilanz.vorhanden).toBe(1);
    expect(bilanz.formatwidersprueche).toBe(1);
  });

  it("nimmt dieselbe Datei zweimal an, andere Bytes unter derselben Kennung aber nie", async () => {
    const medien = createWikiMedien(db, {});
    const nochmal = await medien.bytesAnnehmen(gm, campaign, assetId, bytesVon("Bodin.webp"));
    expect(nochmal.gespeichert).toBe(false);
    await expect(medien.bytesAnnehmen(gm, campaign, assetId, bytesVon("SongKayn.webp"))).rejects.toThrow(/Konflikt|version-conflict/);
  });

  it("weist zurück, was es nicht ehrlich vermessen kann", async () => {
    const medien = createWikiMedien(db, {});
    const zweiter = (await db.query<{ id: string }>("SELECT id FROM wiki_assets WHERE campaign_id=$1 AND dateiname=$2", [campaign, "SongKayn.png"])).rows[0]!;
    await expect(medien.bytesAnnehmen(gm, campaign, zweiter.id, new TextEncoder().encode("<svg xmlns='http://www.w3.org/2000/svg'/>")))
      .rejects.toThrow(ImportValidationError);
    await expect(medien.bytesAnnehmen(gm, campaign, "gibtesnicht", bytesVon("Bodin.webp"))).rejects.toThrow(Gone);
  });

  it("liefert das Bild an die Spielleitung und verweigert es, solange die Passage verborgen ist", async () => {
    const medien = createWikiMedien(db, {});
    const fuerGm = await medien.ausliefern(gm, campaign, assetId);
    expect(fuerGm.mime).toBe("image/webp");
    expect(fuerGm.daten.byteLength).toBe(bytesVon("Bodin.webp").byteLength);

    // Die Spielerin kennt die Adresse — und bekommt trotzdem nichts, weil ihr niemand die
    // Passage freigegeben hat, die das Bild zeigt.
    await expect(medien.ausliefern(spieler, campaign, assetId).then(file => file.mime)).rejects.toThrow(Gone);

    const docs = createDocuments(db, {});
    const bildPassage = (await db.query<{ passage_id: string }>(
      "SELECT passage_id FROM wiki_asset_uses WHERE campaign_id=$1 AND asset_id=$2", [campaign, assetId])).rows[0]!;
    await docs.revealPassage(gm, campaign, bildPassage.passage_id, actorId);
    const fuerSpielerin = await medien.ausliefern(spieler, campaign, assetId);
    expect(fuerSpielerin.sha256).toBe(fuerGm.sha256);
  });

  /**
   * Der eigentliche Beweis: ein Kampagnenpaket, das die Bilder eurer Chronik NICHT mitnimmt,
   * wäre ein verlustbehafteter Export, der sich vollständig nennt. Die Referenzprüfung misst
   * beim Öffnen jede Datei erneut nach — eine Zeile, die einen Typ behauptet, den ihre Bytes
   * nicht hergeben, kommt gar nicht erst durch.
   */
  it("nimmt die Bilder in das Kampagnenpaket auf und stellt sie byteidentisch wieder her", async () => {
    const paket = await exportCampaignBundle(db, gm, campaign, {});
    expect(paket.version).toBe(7);
    if (paket.version !== 7) throw new Error("Bilder verlangen v7");
    for (const table of CAMPAIGN_V7_ADDITIONAL_TABLES) expect(paket.tables[table.name].length).toBeGreaterThan(0);
    const zeile = paket.tables.wiki_assets.find((row) => row.dateiname === "Bodin.jpg")!;
    expect(zeile).toMatchObject({ mime: "image/webp", breite: 512, hoehe: 512, behaupteter_mime: "image/jpeg" });

    const ziel = await createTestDb();
    try {
      await initializeCampaignRestoreTarget(ziel);
      const gelesen = parseCurrentCampaignBundle(serializeCurrentCampaignBundle(paket));
      expect(await inspectCampaignRestore(ziel, gelesen)).toMatchObject({ dryRun: true, formatVersion: 7 });
      expect(await restoreCampaignBundle(ziel, gelesen)).toMatchObject({ dryRun: false, formatVersion: 7 });
      expect(currentCampaignSemanticDiff(paket, await exportCampaignBundle(ziel, gm, campaign, {}))).toEqual([]);
      // Nicht nur „die Zeile ist da": die Datei kommt aus der wiederhergestellten Datenbank
      // Byte für Byte so heraus, wie sie hineingegangen ist.
      const wieder = await createWikiMedien(ziel, {}).ausliefern(gm, campaign, assetId);
      expect(Buffer.compare(wieder.daten, Buffer.from(bytesVon("Bodin.webp")))).toBe(0);
    } finally { await ziel.close(); }
  }, 60_000);

  it("weist ein Paket zurück, dessen Bytes ihrer eigenen Zeile widersprechen", async () => {
    const paket = await exportCampaignBundle(db, gm, campaign, {});
    if (paket.version !== 7) throw new Error("Bilder verlangen v7");
    const text = serializeCurrentCampaignBundle(paket);
    const manipuliert = JSON.parse(text) as { tables: { wiki_assets: Record<string, unknown>[] } };
    const zeile = manipuliert.tables.wiki_assets.find((row) => row.dateiname === "Bodin.jpg")!;
    // Dieselbe Datei, mit einem anderen behaupteten Typ in der Spalte. Genau der Fall, den ein
    // Importer, der der Dateiendung glaubt, jahrelang unbemerkt produziert.
    zeile.mime = "image/png";
    expect(() => parseCurrentCampaignBundle(JSON.stringify(manipuliert))).toThrow(/type disagrees|checksum|mismatch/);
  }, 60_000);

  it("lässt einen Menschen das Importurteil überstimmen und hält die Entscheidung fest", async () => {
    const medien = createWikiMedien(db, {});
    await medien.lizenzSetzen(gm, campaign, assetId, "frei", "Kaya ist Miturheber");
    const zeile = (await db.query<{ lizenz_status: string; lizenz_gesetzt_von: string }>(
      "SELECT lizenz_status,lizenz_gesetzt_von FROM wiki_assets WHERE id=$1 AND campaign_id=$2", [assetId, campaign])).rows[0];
    expect(zeile).toMatchObject({ lizenz_status: "frei", lizenz_gesetzt_von: "mensch" });
    // Nur die Spielleitung entscheidet über Lizenzen, und nur sie sieht überhaupt den Bestand.
    await expect(medien.lizenzSetzen(spieler, campaign, assetId, "unbekannt", null)).rejects.toThrow();
    await expect(medien.bestand(spieler, campaign)).rejects.toThrow();
  });

  it("stops delivering an image after its revealed passage is retired", async () => {
    const docs = createDocuments(db), medien = createWikiMedien(db);
    await medien.bytesAnnehmen(gm, campaign, assetId, bytesVon("Bodin.webp"));
    const use = (await db.query<{ passage_id: string; entry_id: string }>(
      "SELECT passage_id,entry_id FROM wiki_asset_uses WHERE campaign_id=$1 AND asset_id=$2", [campaign, assetId])).rows[0]!;
    await docs.revealPassage(gm, campaign, use.passage_id, actorId);
    await expect(medien.ausliefern(spieler, campaign, assetId)).resolves.toHaveProperty("mime", "image/webp");
    const before = await docs.source(campaign, use.entry_id);
    await docs.saveEntry(gm, campaign, { title: before.entry.title, expectedVersion: before.entry.version,
      passages: before.passagen.filter(p => p.pid !== use.passage_id).map(p => ({ pid: p.pid, inhalt: p.inhalt })) }, use.entry_id);
    expect([...(await docs.knowledge(spieler, campaign)).gehaltenePids]).not.toContain(use.passage_id);
    await expect(medien.ausliefern(spieler, campaign, assetId)).rejects.toThrow(Gone);
    await expect(medien.ausliefern(gm, campaign, assetId)).resolves.toHaveProperty("mime", "image/webp");
  });
});
