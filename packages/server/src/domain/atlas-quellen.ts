// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { randomUUID } from "node:crypto";
import { dateiSlug, vermisseBild, ImportValidationError } from "@chronicle/io";
import type { LizenzStatus } from "@chronicle/chronik";
import type { Db } from "../db/index.ts";
import { createAtlas, type Kartenherkunft } from "./atlas.ts";
import { createCampaigns, type DomainConfig } from "./campaigns.ts";
import { WIKI_ASSET_GRENZEN, createWikiMedien } from "./wiki-medien.ts";
import { Conflict } from "./errors.ts";
import { holeBildbytes, holeDateiauskunft, holeSeitenkennung, holeSeitenquelle, pruefeSeitentitel, wikiBasis,
  type Dateiauskunft } from "./wiki-abruf.ts";

/**
 * WOHER EINE WELTKARTE KOMMT — zwei Eingänge, ein Weg.
 *
 * Ganz am Anfang gab es genau einen: eine Datei neben dem Programm, ein fest verdrahteter Name,
 * und jede andere Karte blieb ohne Bild. Kayas Satz dazu war deutlich — *„mach das hard coded weg
 * das ist nur ein beispiel für andaria weil ich nich weiß wie ich die json der Karte runterlade"*.
 *
 * Danach stand die fest verdrahtete Karte noch als Knopf „Beispielkarte laden" daneben. Auch der
 * ist weg, auf Ansage — *„mach die andaria map raus ich importier die dann selber nix hardcoded"*.
 * Damit trägt die App kein fremdes Bild mehr mit sich herum: **jede** Karte kommt herein, weil ein
 * Mensch sie hereinholt.
 *
 * 1. **Aus einem Wiki.** Die Spielleitung nennt Adresse und Kartennamen, der Server holt die
 *    Seite (`?action=raw`), ihre Kennung (`action=query`) und das Bild, das die Karte selbst in
 *    `mapImage` nennt. Das ist der Weg, den `design/fixtures/eron/map-andaria.README.md`
 *    dokumentiert, nur nicht mehr von Hand.
 * 2. **Als reines Bild.** Eine Inkarnate- oder Wonderdraft-Karte ist ein BILD und war deshalb
 *    lange gar nicht importierbar. Sie wird zu einer Karte mit Rahmen und ohne Marker; die
 *    Ortsmarker setzt die Spielleitung selbst oder sie kommen später aus einer Quelle dazu.
 *
 * Dazu kommt der Datei-Upload (`/maps/import`) für eine Karten-JSON, die schon auf der Platte
 * liegt. Alle enden in `atlas.importMap` und in derselben Bildzeile im Bestand. Es gibt keinen
 * zweiten Kartenweg und keine zweite Bildablage.
 *
 * `art: "beispiel"` bleibt in Schema und Typ stehen. Nicht als Nachlässigkeit: Karten, die vor
 * dieser Änderung über den alten Knopf hereinkamen, liegen mit dieser Herkunft im Bestand und
 * müssen weiter lesbar sein. Geschrieben wird der Wert nirgends mehr.
 */

export interface KarteAusWikiEingabe { readonly wiki: string; readonly titel: string }
export interface KartenbildEingabe { readonly dateiname: string; readonly lizenz?: LizenzStatus; readonly quelle?: string }
export interface KartenErgebnis {
  readonly id: string; readonly unchanged: boolean; readonly report: unknown;
  /** Was mit dem Bild passiert ist. Eine Karte ohne Bild ist eine Karte, kein Fehlschlag. */
  readonly bild: { readonly status: "geholt" | "vorhanden" | "keins" | "fehlgeschlagen"; readonly dateiname?: string; readonly grund?: string };
}

export function createAtlasQuellen(db: Db, cfg: DomainConfig = {}) {
  const now = cfg.now ?? Date.now, campaigns = createCampaigns(db, cfg);
  const atlas = createAtlas(db, cfg), medien = createWikiMedien(db, cfg);

  /**
   * Eine Bildzeile für dieses Kartenbild — angelegt, wenn es sie nicht gibt, sonst aufgefrischt.
   *
   * `lizenz_gesetzt_von='import'`, weil das Urteil vom Abruf stammt und nicht von einem Menschen;
   * ein von Hand gesetzter Stand überlebt deshalb jeden erneuten Abruf (`wiki-medien.ts`).
   */
  async function bildzeile(userId: string, campaignId: string, dateiname: string,
    angaben: { lizenz: LizenzStatus; lizenzQuelle?: string; quellUrl?: string; beschreibungsseite?: string;
      behaupteterMime?: string; urheber?: string; hochgeladenAm?: string; vonHand?: boolean }): Promise<string> {
    const member = await campaigns.requireMember(userId, campaignId, ["leitung"]);
    return db.transaction(async (tx) => {
      const vorhanden = (await tx.query<{ id: string }>("SELECT id FROM wiki_assets WHERE campaign_id=$1 AND dateiname=$2",
        [campaignId, dateiname])).rows[0];
      const gesetztVon = angaben.vonHand ? "mensch" : "import";
      if (vorhanden) {
        await tx.query(`UPDATE wiki_assets SET quell_url=COALESCE($3,quell_url), beschreibungsseite_url=COALESCE($4,beschreibungsseite_url),
          behaupteter_mime=COALESCE($5,behaupteter_mime), urheber=COALESCE($6,urheber), hochgeladen_am=COALESCE($7,hochgeladen_am),
          lizenz_status=CASE WHEN lizenz_gesetzt_von='mensch' THEN lizenz_status ELSE $8 END,
          lizenz_quelle=CASE WHEN lizenz_gesetzt_von='mensch' THEN lizenz_quelle ELSE $9 END
          WHERE id=$1 AND campaign_id=$2`,
          [vorhanden.id, campaignId, angaben.quellUrl ?? null, angaben.beschreibungsseite ?? null, angaben.behaupteterMime ?? null,
            angaben.urheber ?? null, angaben.hochgeladenAm ?? null, angaben.lizenz, angaben.lizenzQuelle ?? null]);
        return vorhanden.id;
      }
      const bestand = (await tx.query<{ count: string }>("SELECT count(*) FROM wiki_assets WHERE campaign_id=$1", [campaignId])).rows[0];
      if (Number(bestand?.count ?? 0) >= WIKI_ASSET_GRENZEN.proKampagne) throw new Conflict();
      const id = randomUUID();
      await tx.query(`INSERT INTO wiki_assets(id,campaign_id,universe_id,dateiname,behaupteter_mime,lizenz_status,lizenz_quelle,
        lizenz_gesetzt_von,beschreibungsseite_url,quell_url,urheber,hochgeladen_am,verwendet_von,verwaist,im_bestand,created_by,created_at)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'[]'::jsonb,false,true,$13,$14)`,
        [id, campaignId, member.universeId, dateiname, angaben.behaupteterMime ?? null, angaben.lizenz,
          angaben.lizenzQuelle ?? null, gesetztVon, angaben.beschreibungsseite ?? null, angaben.quellUrl ?? null,
          angaben.urheber ?? null, angaben.hochgeladenAm ?? null, userId, now()]);
      return id;
    });
  }

  /** Sind für diese Karte schon Bytes da? Dann wird nichts geholt — ein Abruf ohne Anlass. */
  async function bildVorhanden(campaignId: string, dateiname: string): Promise<boolean> {
    return Boolean((await db.query<{ mime: string | null }>("SELECT mime FROM wiki_assets WHERE campaign_id=$1 AND dateiname=$2",
      [campaignId, dateiname])).rows[0]?.mime);
  }

  /**
   * Die Karte aus einem Wiki.
   *
   * Adresse und Kartenname kommen vom Menschen. Kein Feld aus einer importierten Karte, aus einem
   * Artikel oder aus einer Sicherung erreicht diesen Aufruf, und nichts hier läuft von allein.
   *
   * Zwei Werte stammen aus geholtem Inhalt und führen zu weiteren Abrufen — beide bewusst und
   * beide gedeckelt: der Bildname aus `mapImage` wird zu einem TITEL im selben Wiki, dessen
   * Adresse der Mensch genannt hat, und die Dateiadresse aus `imageinfo` zeigt in aller Regel auf
   * das CDN dieses Wikis. Sie geht durch dieselbe Prüfung wie jede andere: nur `https:`, kein
   * privates Ziel, Weiterleitungen von Hand, harte Zeit- und Größengrenze. Ein fremder Wirt ist
   * damit erlaubt (anders ginge kein Fandom-Bild), ein unsicherer nicht.
   */
  async function ausWiki(userId: string, campaignId: string, eingabe: KarteAusWikiEingabe): Promise<KartenErgebnis> {
    await campaigns.requireMember(userId, campaignId, ["leitung"]);
    const basis = wikiBasis(eingabe.wiki), titel = pruefeSeitentitel(eingabe.titel);
    const json = await holeSeitenquelle(basis, titel, cfg.fetch);
    const kennung = await holeSeitenkennung(basis, titel, cfg.fetch);
    const herkunft: Kartenherkunft = { art: "wiki", wikiUrl: basis.href, seitentitel: titel,
      ...(kennung.pageid ? { pageid: kennung.pageid } : {}), ...(kennung.revid ? { revid: kennung.revid } : {}),
      ...(kennung.lizenz ? { lizenz: kennung.lizenz } : {}) };
    const karte = await atlas.importMap(userId, campaignId, json, herkunft);
    const dateiname = (await atlas.herkunftVon(campaignId, karte.id))?.bild_dateiname;
    if (!dateiname) return { ...karte, bild: { status: "keins" } };
    if (await bildVorhanden(campaignId, dateiname)) return { ...karte, bild: { status: "vorhanden", dateiname } };
    try {
      // Ein Bild, das nicht ankommt, darf die Karte nicht mitreißen: dieselbe Trennung, die der
      // Artikelimport zwischen Text und Bytes zieht (docs/WIKI_MEDIEN.md).
      const auskunft: Dateiauskunft = await holeDateiauskunft(basis, dateiname, cfg.fetch);
      const bytes = await holeBildbytes(auskunft.url, cfg.fetch);
      const id = await bildzeile(userId, campaignId, dateiname, {
        lizenz: auskunft.lizenzStatus, ...(auskunft.lizenzQuelle ? { lizenzQuelle: auskunft.lizenzQuelle } : {}),
        quellUrl: auskunft.url, ...(auskunft.beschreibungsseite ? { beschreibungsseite: auskunft.beschreibungsseite } : {}),
        ...(auskunft.behaupteterMime ? { behaupteterMime: auskunft.behaupteterMime } : {}),
        ...(auskunft.urheber ? { urheber: auskunft.urheber } : {}),
        ...(auskunft.hochgeladenAm ? { hochgeladenAm: auskunft.hochgeladenAm } : {}) });
      await medien.bytesAnnehmen(userId, campaignId, id, bytes);
      return { ...karte, bild: { status: "geholt", dateiname } };
    } catch (fehler) {
      return { ...karte, bild: { status: "fehlgeschlagen", dateiname, grund: fehler instanceof Error ? fehler.message : "" } };
    }
  }

  /**
   * Eine Karte, die nur aus einem Bild besteht — Inkarnate, Wonderdraft, ein Scan.
   *
   * Der Rahmen wird aus dem BILD gelesen, nicht aus dem Dateinamen und nicht aus einer Angabe:
   * `vermisseBild` bestimmt Typ und Maße aus den Magic Bytes. Aus ihnen entsteht dasselbe
   * Kartendokument, das eine Fandom-Karte mitbringt — nur mit leerer Markerliste. Damit geht sie
   * durch denselben Parser, dieselbe Prüfung, dieselbe Sicherung wie jede andere Karte.
   */
  async function ausBild(userId: string, campaignId: string, eingabe: KartenbildEingabe, bytes: Uint8Array): Promise<KartenErgebnis> {
    await campaigns.requireMember(userId, campaignId, ["leitung"]);
    if (bytes.byteLength > WIKI_ASSET_GRENZEN.bytes)
      throw new ImportValidationError("bild", `image exceeds ${Math.floor(WIKI_ASSET_GRENZEN.bytes / (1024 * 1024))} MB`);
    const name = dateiSlug(typeof eingabe.dateiname === "string" ? eingabe.dateiname.trim() : "");
    if (!name || name.length > 512) throw new ImportValidationError("dateiname", "a picture name between 1 and 512 characters is required");
    const befund = vermisseBild(bytes);
    const dokument = {
      mapImage: name, coordinateOrder: "xy", origin: "top-left",
      mapBounds: [[0, 0], [befund.breite, befund.hoehe]], categories: [], markers: [],
      // Zwei verschiedene Bilder unter demselben Namen sind zwei Karten. Ohne diese Zeile hinge
      // die Kartenidentität am Dateinamen, und ein neuer Entwurf öffnete stumm den alten.
      description: `Kartenbild sha256:${befund.sha256}`,
    };
    const karte = await atlas.importMap(userId, campaignId, JSON.stringify(dokument),
      { art: "bild", bildDateiname: name });
    const id = await bildzeile(userId, campaignId, name, {
      lizenz: eingabe.lizenz ?? "unbekannt", ...(eingabe.quelle ? { lizenzQuelle: eingabe.quelle } : {}),
      behaupteterMime: befund.mime, vonHand: true });
    await medien.bytesAnnehmen(userId, campaignId, id, bytes);
    return { ...karte, bild: { status: "geholt", dateiname: name } };
  }

  return { ausWiki, ausBild };
}
