import { vermisseBild, formatWiderspruch, ImportValidationError, type EronImportResult } from "@chronicle/io";
import type { LizenzStatus } from "@chronicle/chronik";
import type { Db } from "../db/index.ts";
import { createCampaigns, type DomainConfig } from "./campaigns.ts";
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
}

interface Row {
  id: string; dateiname: string; mime: string | null; sha256: string | null; bytes: string | null;
  breite: number | null; hoehe: number | null; behaupteter_mime: string | null;
  lizenz_status: LizenzStatus; lizenz_quelle: string | null; beschreibungsseite_url: string | null;
  quell_url: string | null; urheber: string | null; hochgeladen_am: string | null;
  verwendet_von: string[]; verwaist: boolean; im_bestand: boolean;
}

const zeile = (row: Row): WikiAssetZeile => ({
  id: row.id, dateiname: row.dateiname, mime: row.mime, sha256: row.sha256,
  bytes: row.bytes === null ? null : Number(row.bytes), breite: row.breite, hoehe: row.hoehe,
  behaupteterMime: row.behaupteter_mime, lizenzStatus: row.lizenz_status, lizenzQuelle: row.lizenz_quelle,
  beschreibungsseiteUrl: row.beschreibungsseite_url, quellUrl: row.quell_url, urheber: row.urheber,
  hochgeladenAm: row.hochgeladen_am, verwendetVon: row.verwendet_von ?? [], verwaist: row.verwaist,
  imBestand: row.im_bestand, vorhanden: row.mime !== null,
  formatWiderspruch: row.mime !== null && formatWiderspruch(row.behaupteter_mime ?? undefined, row.mime),
});

const SPALTEN = `id,dateiname,mime,sha256,bytes,breite,hoehe,behaupteter_mime,lizenz_status,lizenz_quelle,
  beschreibungsseite_url,quell_url,urheber,hochgeladen_am,verwendet_von,verwaist,im_bestand`;

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
    const vorhanden = (await tx.query<{ lizenz_gesetzt_von: string }>(
      "SELECT lizenz_gesetzt_von FROM wiki_assets WHERE id=$1 AND campaign_id=$2", [asset.id, campaignId])).rows[0];
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
        [asset.id, campaignId, asset.behaupteterMime ?? null, asset.beschreibungsseiteUrl ?? null, asset.quellUrl ?? null,
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
    const rows = (await db.query<Row>(`SELECT ${SPALTEN} FROM wiki_assets WHERE campaign_id=$1
      ORDER BY verwaist, dateiname COLLATE "C"`, [campaignId])).rows.map(zeile);
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
   * Auslieferung. Die einzige Frage vor einem Bild ist dieselbe wie vor einem Absatz: hält diese
   * Leserin eine Passage, die es zeigt? Die Spielleitung sieht alles; alle anderen sehen ein
   * Bild genau dann, wenn ihnen eine Passage damit freigegeben wurde. Ein Bild, das an einer
   * verborgenen Passage hängt, ist verborgen — sonst wäre die Freigabe von Wissen umgehbar,
   * indem man die Bilder direkt abruft.
   */
  async function ausliefern(userId: string, campaignId: string, assetId: string) {
    const member = await campaigns.requireMember(userId, campaignId);
    const row = (await db.query<{ mime: string | null; daten: string | null; sha256: string | null }>(
      "SELECT mime,daten,sha256 FROM wiki_assets WHERE id=$1 AND campaign_id=$2", [assetId, campaignId])).rows[0];
    if (!row?.daten || !row.mime) throw new Gone("asset");
    if (member.role !== "leitung") {
      if (!member.actorId) throw new Gone("asset");
      const erlaubt = await db.query(`SELECT 1 FROM wiki_asset_uses u
        JOIN revelations r ON r.passage_id=u.passage_id AND r.campaign_id=u.campaign_id
        WHERE u.asset_id=$1 AND u.campaign_id=$2 AND r.actor_id=$3 AND r.revoked_at IS NULL LIMIT 1`,
        [assetId, campaignId, member.actorId]);
      if (!erlaubt.rowCount) throw new Gone("asset");
    }
    return { mime: row.mime, sha256: row.sha256!, daten: Buffer.from(row.daten, "base64") };
  }

  /** Ein Mensch überstimmt das Importurteil. Das ist eine Entscheidung und wird als solche notiert. */
  async function lizenzSetzen(userId: string, campaignId: string, assetId: string, status: LizenzStatus, quelle: string | null) {
    await campaigns.requireMember(userId, campaignId, ["leitung"]);
    const updated = await db.query(`UPDATE wiki_assets SET lizenz_status=$3,lizenz_quelle=$4,lizenz_gesetzt_von='mensch'
      WHERE id=$1 AND campaign_id=$2`, [assetId, campaignId, status, quelle]);
    if (!updated.rowCount) throw new Gone("asset");
    return { ok: true as const };
  }

  return { bestand, bytesAnnehmen, ausliefern, lizenzSetzen };
}
