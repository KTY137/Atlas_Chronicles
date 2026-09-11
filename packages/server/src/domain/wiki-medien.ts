// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { randomUUID } from "node:crypto";
import { vermisseBild, formatWiderspruch, ImportValidationError, type EronImportResult } from "@chronicle/io";
import type { LizenzStatus } from "@chronicle/chronik";
import type { Db } from "../db/index.ts";
import { createCampaigns, type DomainConfig, type Membership } from "./campaigns.ts";
import { listControlledActorIds } from "./actors.ts";
import { createDocuments } from "./documents.ts";
import { Conflict, Gone } from "./errors.ts";

/**
 * WIKI-MEDIEN — die zweite Hälfte des Imports.
 *
 * Der Artikelimport schreibt Zeilen OHNE Bytes: Herkunft, Lizenzurteil, Quelladresse, und welche
 * Passage welches Bild zeigt. Die Bytes kommen danach, einzeln, wiederholbar, und sie kommen
 * durch dieselbe Prüfung wie eine taktische Karte: Format und Maße aus den Magic Bytes, nie aus
 * dem Dateinamen. Genau deshalb sind es zwei Schritte — ein Artikelimport, der auf 30 CDN-
 * Antworten wartet, sieht für die Spielleitung aus wie ein Absturz, und ein Bild, das nicht
 * ankommt, darf den Text nicht mitreißen.
 */

export const WIKI_ASSET_GRENZEN = Object.freeze({
  /** Eine Datei. Deckungsgleich mit der Prüfung in @chronicle/io, hier als Serverzusage. */
  bytes: 24 * 1024 * 1024,
  /** Bilder je Kampagne. Ein Wiki mit mehr Dateien importiert Artikel trotzdem vollständig. */
  proKampagne: 5_000,
});

/**
 * Steuerzeichen und Pfadtrenner im Dateinamen. Der Name ist hier reiner Anzeigetext — er wird nie
 * zu einem Pfad und nie zu einer Adresse, die Bytes liegen in der Zeile. Genau deshalb soll er
 * auch nicht so aussehen: „karten/burg.png" verspricht einen Ordner, den es nicht gibt.
 */
const PFADTRENNER = ["/", String.fromCharCode(92)];
const unerlaubterName = (name: string): boolean =>
  [...name].some(zeichen => zeichen < " " || zeichen === String.fromCharCode(127) || PFADTRENNER.includes(zeichen));

export interface WikiAssetZeile {
  readonly id: string;
  readonly dateiname: string;
  readonly mime: string | null;
  readonly sha256: string | null;
  readonly bytes: number | null;
  readonly breite: number | null;
  readonly hoehe: number | null;
  readonly behaupteterMime: string | null;
  readonly lizenzStatus: LizenzStatus;
  readonly lizenzQuelle: string | null;
  readonly beschreibungsseiteUrl: string | null;
  readonly quellUrl: string | null;
  readonly urheber: string | null;
  readonly hochgeladenAm: string | null;
  readonly verwendetVon: readonly string[];
  readonly verwaist: boolean;
  readonly imBestand: boolean;
  readonly vorhanden: boolean;
  readonly formatWiderspruch: boolean;
  /**
   * Selbst hochgeladen statt aus einem Wiki geholt. Abgeleitet aus `import_id IS NULL`, also aus
   * dem, was ohnehin in der Zeile steht — keine zweite Wahrheit daneben. Die Anzeige braucht den
   * Unterschied: „im Quell-Wiki nicht vorhanden" ist über ein eigenes Bild schlicht falsch.
   */
  readonly selbstHochgeladen: boolean;
}

interface Row {
  id: string; dateiname: string; mime: string | null; sha256: string | null; bytes: string | null;
  breite: number | null; hoehe: number | null; behaupteter_mime: string | null;
  lizenz_status: LizenzStatus; lizenz_quelle: string | null; beschreibungsseite_url: string | null;
  quell_url: string | null; urheber: string | null; hochgeladen_am: string | null;
  verwendet_von: string[]; verwaist: boolean; im_bestand: boolean; import_id: string | null;
}

const zeile = (row: Row): WikiAssetZeile => ({
  id: row.id, dateiname: row.dateiname, mime: row.mime, sha256: row.sha256,
  bytes: row.bytes === null ? null : Number(row.bytes), breite: row.breite, hoehe: row.hoehe,
  behaupteterMime: row.behaupteter_mime, lizenzStatus: row.lizenz_status, lizenzQuelle: row.lizenz_quelle,
  beschreibungsseiteUrl: row.beschreibungsseite_url, quellUrl: row.quell_url, urheber: row.urheber,
  hochgeladenAm: row.hochgeladen_am, verwendetVon: row.verwendet_von ?? [], verwaist: row.verwaist,
  imBestand: row.im_bestand, vorhanden: row.mime !== null,
  formatWiderspruch: row.mime !== null && formatWiderspruch(row.behaupteter_mime ?? undefined, row.mime),
  selbstHochgeladen: row.import_id === null,
});

const SPALTEN = `id,dateiname,mime,sha256,bytes,breite,hoehe,behaupteter_mime,lizenz_status,lizenz_quelle,
  beschreibungsseite_url,quell_url,urheber,hochgeladen_am,verwendet_von,verwaist,im_bestand,import_id`;

/**
 * Schreibt die Entwürfe eines angenommenen Imports. Läuft INNERHALB der Import-Transaktion:
 * entweder ein Artikel und seine Bilder landen zusammen, oder keins von beidem.
 *
 * Bereits vorhandene Bytes werden nie überschrieben. Ein Reimport aktualisiert Herkunft und
 * Lizenzurteil, nicht die Datei — und ein von Hand gesetzter Lizenzstatus (`mensch`) überlebt
 * jeden Reimport, weil sonst die Entscheidung eines Menschen still zurückgenommen würde.
 */
export async function schreibeAssetEntwuerfe(
  tx: Db, campaignId: string, userId: string, now: number,
  result: Pick<EronImportResult, "assets" | "passages" | "importId">, entryIds: ReadonlySet<string>,
): Promise<{ angelegt: number; aktualisiert: number }> {
  let angelegt = 0, aktualisiert = 0;
  if (!result.assets.length) return { angelegt, aktualisiert };
  const bestand = (await tx.query<{ count: string }>("SELECT count(*) FROM wiki_assets WHERE campaign_id=$1", [campaignId])).rows[0];
  let frei = WIKI_ASSET_GRENZEN.proKampagne - Number(bestand?.count ?? 0);
  /**
   * Welche Datei überhaupt in die Kampagne gehört, und warum genau diese beiden Fälle:
   *
   * - **Was eine angenommene Passage zeigt.** Wer 2 von 74 Artikeln übernimmt, bekommt die
   *   Bilder dieser 2 — und nicht die der 72 anderen, die er ausdrücklich nicht wollte.
   * - **Was im Quell-Wiki überhaupt niemand benutzt.** Eine verwaiste Datei gehört zu keinem
   *   Artikel, also auch zu keinem abgelehnten. Sie wird als Zeile mitgeführt und sichtbar als
   *   verwaist geführt, ihre Bytes werden aber nie von allein geholt. Genau so kommt die
   *   Spielleitung an die fünf Andaria-Karten, die kein Artikel einbindet, ohne dass irgendwer
   *   sie ihr aufdrängt.
   */
  const gezeigt = new Set<string>();
  for (const passage of result.passages) {
    if (passage.inhalt.kind === "bildunterschrift" && entryIds.has(passage.entryId)) gezeigt.add(String(passage.inhalt.assetId));
  }
  for (const asset of result.assets) {
    /**
     * Gesucht wird nach der eigenen Kennung UND nach dem Dateinamen — eindeutig ist in der Tabelle der
     * Name je Runde. Ein Kartenbild, das der Atlas unter eigener Kennung angelegt hat, ist dieselbe
     * Datei; nur nach der Kennung gesucht, fügte der Import den Namen ein zweites Mal ein, und der
     * ganze Import scheiterte (Kaya, 2026-09-11).
     */
    let vorhanden = (await tx.query<{ id: string; lizenz_gesetzt_von: string }>(
      "SELECT id,lizenz_gesetzt_von FROM wiki_assets WHERE id=$1 AND campaign_id=$2", [asset.id, campaignId])).rows[0]
      ?? (await tx.query<{ id: string; lizenz_gesetzt_von: string }>(
        "SELECT id,lizenz_gesetzt_von FROM wiki_assets WHERE dateiname=$1 AND campaign_id=$2", [asset.dateiname, campaignId])).rows[0];
    if (vorhanden && vorhanden.id !== asset.id) {
      // Die Passagen dieses Imports zeigen ihr Bild über die Import-Kennung. Benutzt noch keine Passage
      // die vorhandene Zeile, bekommt sie diese Kennung; Bytes, Lizenzurteil und Namensbezüge bleiben.
      // Wird sie schon benutzt, bleibt sie unberührt — dann zeigen die neuen Passagen kein Bild, aber
      // der Import gelingt, und die älteren Passagen zeigen ihres weiter.
      const benutzt = (await tx.query("SELECT 1 FROM wiki_asset_uses WHERE asset_id=$1 AND campaign_id=$2 LIMIT 1", [vorhanden.id, campaignId])).rowCount;
      if (!benutzt) {
        await tx.query("UPDATE wiki_assets SET id=$1 WHERE id=$2 AND campaign_id=$3", [asset.id, vorhanden.id, campaignId]);
        vorhanden = { ...vorhanden, id: asset.id };
      }
    }
    if (!vorhanden && !gezeigt.has(asset.id) && !asset.verwaist) continue;
    if (!vorhanden) {
      if (frei <= 0) throw new Conflict();
      frei -= 1;
      await tx.query(`INSERT INTO wiki_assets(id,campaign_id,universe_id,dateiname,behaupteter_mime,lizenz_status,lizenz_quelle,
        lizenz_gesetzt_von,beschreibungsseite_url,quell_url,urheber,hochgeladen_am,verwendet_von,verwaist,im_bestand,import_id,created_by,created_at)
        VALUES($1,$2,$3,$4,$5,$6,$7,'import',$8,$9,$10,$11,$12::jsonb,$13,$14,$15,$16,$17)`,
        [asset.id, campaignId, asset.universeId, asset.dateiname, asset.behaupteterMime ?? null, asset.lizenzStatus,
          asset.lizenzQuelle ?? null, asset.beschreibungsseiteUrl ?? null, asset.quellUrl ?? null, asset.urheber ?? null,
          asset.hochgeladenAm ?? null, JSON.stringify(asset.verwendetVon), asset.verwaist, asset.imBestand,
          result.importId, userId, now]);
      angelegt += 1;
    } else {
      // `lizenz_gesetzt_von='mensch'` ist eine Entscheidung, kein Zwischenstand.
      await tx.query(`UPDATE wiki_assets SET behaupteter_mime=COALESCE($3,behaupteter_mime),
        beschreibungsseite_url=COALESCE($4,beschreibungsseite_url), quell_url=COALESCE($5,quell_url),
        urheber=COALESCE($6,urheber), hochgeladen_am=COALESCE($7,hochgeladen_am),
        verwendet_von=$8::jsonb, verwaist=$9, im_bestand=$10,
        lizenz_status=CASE WHEN lizenz_gesetzt_von='mensch' THEN lizenz_status ELSE $11 END,
        lizenz_quelle=CASE WHEN lizenz_gesetzt_von='mensch' THEN lizenz_quelle ELSE $12 END
        WHERE id=$1 AND campaign_id=$2`,
        [vorhanden.id, campaignId, asset.behaupteterMime ?? null, asset.beschreibungsseiteUrl ?? null, asset.quellUrl ?? null,
          asset.urheber ?? null, asset.hochgeladenAm ?? null, JSON.stringify(asset.verwendetVon), asset.verwaist,
          asset.imBestand, asset.lizenzStatus, asset.lizenzQuelle ?? null]);
      aktualisiert += 1;
    }
  }
  for (const passage of result.passages) {
    if (passage.inhalt.kind !== "bildunterschrift" || !entryIds.has(passage.entryId)) continue;
    const assetId = String(passage.inhalt.assetId);
    if (!(await tx.query("SELECT 1 FROM wiki_assets WHERE id=$1 AND campaign_id=$2", [assetId, campaignId])).rowCount) continue;
    await tx.query(`INSERT INTO wiki_asset_uses(asset_id,campaign_id,passage_id,entry_id) VALUES($1,$2,$3,$4)
      ON CONFLICT DO NOTHING`, [assetId, campaignId, passage.pid, passage.entryId]);
  }
  return { angelegt, aktualisiert };
}

export function createWikiMedien(db: Db, cfg: DomainConfig = {}) {
  const now = cfg.now ?? Date.now, campaigns = createCampaigns(db, cfg);

  /** Der Bestand. Nur die Spielleitung sieht ihn — er nennt Dateien, die noch niemand sehen darf. */
  async function bestand(userId: string, campaignId: string) {
    await campaigns.requireMember(userId, campaignId, ["leitung"]);
    // Die Bindung wird EINMAL je Bestand geholt und auf die Zeilen verteilt: eine Abfrage je Bild
    // waere bei 5.000 Bildern derselbe Befund zu einem tausendfachen Preis.
    const gebunden = await gebundeneBilder(db, campaignId);
    const rows = (await db.query<Row>(`SELECT ${SPALTEN} FROM wiki_assets WHERE campaign_id=$1
      ORDER BY verwaist, dateiname COLLATE "C"`, [campaignId])).rows
      .map((row) => ({ ...zeile(row), loeschbar: !gebunden.has(row.id) }));
    const offen = rows.filter((row) => !row.vorhanden && !row.verwaist && row.quellUrl);
    return {
      assets: rows,
      bilanz: {
        gesamt: rows.length, vorhanden: rows.filter((row) => row.vorhanden).length,
        offen: offen.length, verwaist: rows.filter((row) => row.verwaist).length,
        ohneQuelle: rows.filter((row) => !row.vorhanden && !row.quellUrl).length,
        nachLizenz: { frei: rows.filter((r) => r.lizenzStatus === "frei").length,
          zitat: rows.filter((r) => r.lizenzStatus === "zitat").length,
          unbekannt: rows.filter((r) => r.lizenzStatus === "unbekannt").length },
        formatwidersprueche: rows.filter((row) => row.formatWiderspruch).length,
      },
    };
  }

  /**
   * Ein Bild, das kein Wiki mitgebracht hat.
   *
   * Der Bestand war die zweite Hälfte des Imports — und damit für jede Spielleitung verschlossen,
   * die nie ein Wiki importiert hat: Bytes ließen sich nur in eine Zeile schieben, die der Import
   * angelegt hatte. Wer eigene Bilder hat, bekommt hier dieselbe Zeile von Hand. Kein zweiter
   * Bilderweg, sondern ein zweiter Eingang in denselben: die Zeile entsteht OHNE Bytes, die Bytes
   * kommen danach durch `bytesAnnehmen` und damit durch dieselbe Vermessung wie jede andere Datei.
   *
   * **Wiederholbar.** Ein zweiter Versuch mit demselben Namen greift auf die eigene, noch leere
   * Zeile zurück, statt einen Namen für immer zu verbrennen: der erste Versuch kann an den Bytes
   * gescheitert sein, der Name ist je Kampagne eindeutig, und eine Zeile ohne Bytes zeigt nichts
   * an, was verlorengehen könnte. Eine Zeile MIT Bytes und jede Zeile aus einem Import bleiben
   * unangetastet — ein Upload überschreibt kein fremdes Bild.
   *
   * Der Lizenzstand kommt von einem Menschen und wird als solcher notiert (`mensch`): niemand hat
   * hier ein Wiki befragt, und ein späterer Reimport darf die Angabe nicht still zurücknehmen.
   */
  async function anlegen(userId: string, campaignId: string, input: { dateiname: string; lizenz?: LizenzStatus; quelle?: string | null }) {
    const member = await campaigns.requireMember(userId, campaignId, ["leitung"]);
    const dateiname = input.dateiname.trim();
    if (!dateiname || dateiname.length > 512) throw new ImportValidationError("dateiname", "a name between 1 and 512 characters is required");
    if (unerlaubterName(dateiname)) throw new ImportValidationError("dateiname", "the name must not contain path separators or control characters");
    return db.transaction(async (tx) => {
      const bestand = (await tx.query<{ count: string }>("SELECT count(*) FROM wiki_assets WHERE campaign_id=$1", [campaignId])).rows[0];
      if (Number(bestand?.count ?? 0) >= WIKI_ASSET_GRENZEN.proKampagne)
        throw new ImportValidationError("bild", `this campaign already holds ${WIKI_ASSET_GRENZEN.proKampagne} pictures`);
      const id = randomUUID();
      // `ON CONFLICT` statt „vorher nachsehen": zwei gleichzeitige Uploads desselben Namens sind
      // sonst ein Rennen, das die Eindeutigkeit als 500 sichtbar macht statt als Antwort.
      const angelegt = await tx.query<{ id: string }>(`INSERT INTO wiki_assets(id,campaign_id,universe_id,dateiname,
        lizenz_status,lizenz_quelle,lizenz_gesetzt_von,verwendet_von,verwaist,im_bestand,created_by,created_at)
        VALUES($1,$2,$3,$4,$5,$6,'mensch','[]'::jsonb,false,false,$7,$8)
        ON CONFLICT (campaign_id,dateiname) DO NOTHING RETURNING id`,
        [id, campaignId, member.universeId, dateiname, input.lizenz ?? "unbekannt", input.quelle ?? null, userId, now()]);
      if (angelegt.rowCount) return { id, dateiname, angelegt: true as const };
      const belegt = (await tx.query<{ id: string; sha256: string | null; import_id: string | null }>(
        "SELECT id,sha256,import_id FROM wiki_assets WHERE campaign_id=$1 AND dateiname=$2", [campaignId, dateiname])).rows[0];
      if (!belegt || belegt.sha256 !== null || belegt.import_id !== null)
        throw new ImportValidationError("dateiname", "a picture with this name already exists in this campaign");
      return { id: belegt.id, dateiname, angelegt: false as const };
    });
  }

  /**
   * Wer zeigt dieses Bild? Beide Bindungen in EINER Abfrage je Kampagne, nicht je Zeile:
   *
   * - eine Passage, die es einbindet (`wiki_asset_uses`), und
   * - ein Kartengesicht einer Gegenstandsvorlage (`definition->>'bildAssetId'`).
   *
   * Dieselben zwei Gründe, aus denen ein Bild überhaupt ausgeliefert wird — die Liste der
   * Sichtbarkeitsgründe und die Liste der Löschsperren dürfen nicht auseinanderlaufen.
   */
  async function gebundeneBilder(tx: Db, campaignId: string): Promise<ReadonlySet<string>> {
    const [passagen, gesichter] = await Promise.all([
      tx.query<{ asset_id: string }>("SELECT DISTINCT asset_id FROM wiki_asset_uses WHERE campaign_id=$1", [campaignId]),
      tx.query<{ id: string }>(`SELECT DISTINCT definition->>'bildAssetId' AS id FROM item_template_revisions
        WHERE campaign_id=$1 AND definition->>'bildAssetId' IS NOT NULL`, [campaignId]),
    ]);
    return new Set([...passagen.rows.map(row => row.asset_id), ...gesichter.rows.map(row => row.id)]);
  }

  /**
   * Ein Bild wieder loswerden — aber nur eines, das niemand zeigt.
   *
   * Ohne diesen Weg war ein Vertipper endgültig: der Name blieb je Kampagne für immer belegt, und
   * eine falsch hochgeladene Datei lag bis zum Ende der Runde im Bestand. Das ist die Lücke, die
   * beim Bau des Uploads offen blieb, und sie gehört zum selben Feature.
   *
   * **Die Sperre ist der eigentliche Inhalt.** `wiki_asset_uses` hängt per `ON DELETE CASCADE` an
   * der Bildzeile: ein unbedachtes Löschen nähme die Verwendungen stillschweigend mit und ließe
   * Artikel mit leeren Bildrahmen zurück. Und eine Gegenstandsvorlage ist unveränderlich und
   * inhaltsgehasht — ihr Gesicht nachträglich ins Leere zeigen zu lassen wäre eine Karte, die
   * ihre eigene Vergangenheit verliert. Deshalb: kein Kaskadenlöschen, sondern eine Absage, die
   * sagt, wer das Bild noch hält.
   */
  async function loeschen(userId: string, campaignId: string, assetId: string) {
    await campaigns.requireMember(userId, campaignId, ["leitung"]);
    return db.transaction(async (tx) => {
      const row = (await tx.query<{ dateiname: string }>(
        "SELECT dateiname FROM wiki_assets WHERE id=$1 AND campaign_id=$2 FOR UPDATE", [assetId, campaignId])).rows[0];
      if (!row) throw new Gone("asset");
      if ((await gebundeneBilder(tx, campaignId)).has(assetId))
        throw new ImportValidationError("bild", "this picture is shown by an article or an item card and cannot be deleted");
      await tx.query("DELETE FROM wiki_assets WHERE id=$1 AND campaign_id=$2", [assetId, campaignId]);
      return { geloescht: true as const, dateiname: row.dateiname };
    });
  }

  /**
   * Bytes annehmen. Die Prüfung entscheidet über Typ und Maße; der Dateiname des Wikis wird
   * dabei nur noch als Behauptung mitgeführt. Idempotent: dieselben Bytes zweimal sind kein
   * Fehler, andere Bytes für dieselbe Datei sind einer.
   */
  async function bytesAnnehmen(userId: string, campaignId: string, assetId: string, daten: Uint8Array) {
    await campaigns.requireMember(userId, campaignId, ["leitung"]);
    if (daten.byteLength > WIKI_ASSET_GRENZEN.bytes) throw new ImportValidationError("bild", `image exceeds ${Math.floor(WIKI_ASSET_GRENZEN.bytes / (1024 * 1024))} MB`);
    const befund = vermisseBild(daten);
    return db.transaction(async (tx) => {
      const row = (await tx.query<{ sha256: string | null; behaupteter_mime: string | null }>(
        "SELECT sha256,behaupteter_mime FROM wiki_assets WHERE id=$1 AND campaign_id=$2 FOR UPDATE", [assetId, campaignId])).rows[0];
      if (!row) throw new Gone("asset");
      if (row.sha256 && row.sha256 !== befund.sha256) throw new Conflict();
      if (row.sha256 === befund.sha256) return { ...befund, gespeichert: false, formatWiderspruch: formatWiderspruch(row.behaupteter_mime ?? undefined, befund.mime) };
      await tx.query(`UPDATE wiki_assets SET mime=$3,sha256=$4,bytes=$5,breite=$6,hoehe=$7,daten=$8,geholt_von=$9,geholt_am=$10
        WHERE id=$1 AND campaign_id=$2`,
        [assetId, campaignId, befund.mime, befund.sha256, befund.bytes, befund.breite, befund.hoehe,
          Buffer.from(daten).toString("base64"), userId, now()]);
      return { ...befund, gespeichert: true, formatWiderspruch: formatWiderspruch(row.behaupteter_mime ?? undefined, befund.mime) };
    });
  }

  /**
   * Auslieferung. Die Spielleitung sieht alles; für alle anderen gibt es genau zwei Gründe, ein
   * Bild zu sehen — und beide sind Gründe, die sie schon haben, bevor sie das Bild abrufen:
   *
   * 1. **Eine Passage, die es zeigt, ist ihnen freigegeben.** Ein Bild, das an einer verborgenen
   *    Passage hängt, ist verborgen — sonst wäre die Freigabe von Wissen umgehbar, indem man die
   *    Bilder direkt abruft.
   * 2. **Sie halten einen Gegenstand, der es als Kartengesicht trägt.** Das Bild einer Lootkarte
   *    IST die Karte; wer den Gegenstand im Inventar hat, sieht sein Bild. Ohne diesen Fall wäre
   *    jede Karte in der Hand einer Spielerin ein leerer Rahmen — und genau das war sie, solange
   *    nur der erste Grund zählte.
   *
   * Welche Figuren jemand öffnen darf, entscheidet weiterhin `listControlledActorIds`: dieselbe
   * Regel wie im Inventar selbst, nicht eine zweite daneben, die eines Tages auseinanderläuft.
   */
  async function ausliefern(userId: string, campaignId: string, assetId: string) {
    const member = await campaigns.requireMember(userId, campaignId);
    const row = (await db.query<{ mime: string | null; daten: string | null; sha256: string | null }>(
      "SELECT mime,daten,sha256 FROM wiki_assets WHERE id=$1 AND campaign_id=$2", [assetId, campaignId])).rows[0];
    if (!row?.daten || !row.mime) throw new Gone("asset");
    if (member.role !== "leitung" && !(await darfSehen(member, assetId))) throw new Gone("asset");
    return { mime: row.mime, sha256: row.sha256!, daten: Buffer.from(row.daten, "base64") };
  }

  async function darfSehen(member: Membership, assetId: string): Promise<boolean> {
    if (member.actorId) {
      // Use the same effective knowledge as the article: raw revelations can name retired
      // ancestors, and split/merge descendants can be visible without a direct revelation.
      const held = await createDocuments(db, cfg).held(member.campaignId, member.actorId);
      const ausPassage = await db.query(`SELECT 1 FROM wiki_asset_uses u
        JOIN passages p ON p.id=u.passage_id AND p.campaign_id=u.campaign_id
        WHERE u.asset_id=$1 AND u.campaign_id=$2 AND u.passage_id=ANY($3::text[])
          AND p.retired_at_revision IS NULL AND p.content->>'kind'='bildunterschrift'
          AND p.content->>'assetId'=$1 LIMIT 1`, [assetId, member.campaignId, [...held]]);
      if (ausPassage.rowCount) return true;
    }
    const meine = await listControlledActorIds(db, member);
    if (!meine.length) return false;
    const ausInventar = await db.query(`SELECT 1 FROM item_instances i
      JOIN item_template_revisions r ON r.template_id=i.template_id AND r.campaign_id=i.campaign_id AND r.revision=i.template_revision
      WHERE i.campaign_id=$1 AND i.archived_at IS NULL AND i.holder_actor_id=ANY($2::text[])
        AND r.definition->>'bildAssetId'=$3 LIMIT 1`, [member.campaignId, meine, assetId]);
    return ausInventar.rowCount > 0;
  }

  /** Ein Mensch überstimmt das Importurteil. Das ist eine Entscheidung und wird als solche notiert. */
  async function lizenzSetzen(userId: string, campaignId: string, assetId: string, status: LizenzStatus, quelle: string | null) {
    await campaigns.requireMember(userId, campaignId, ["leitung"]);
    const updated = await db.query(`UPDATE wiki_assets SET lizenz_status=$3,lizenz_quelle=$4,lizenz_gesetzt_von='mensch'
      WHERE id=$1 AND campaign_id=$2`, [assetId, campaignId, status, quelle]);
    if (!updated.rowCount) throw new Gone("asset");
    return { ok: true as const };
  }

  return { bestand, anlegen, loeschen, bytesAnnehmen, ausliefern, lizenzSetzen };
}
