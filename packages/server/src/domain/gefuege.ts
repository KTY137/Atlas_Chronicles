import { randomUUID } from "node:crypto";
import { trustPassageId, type PassageId } from "@chronicle/core";
import { graphVon, istGerichtet, type Beziehungsart, type Gefuegegraph } from "@chronicle/chronik";
import type { Db } from "../db/index.ts";
import { createDocuments } from "./documents.ts";
import { createCampaigns, type DomainConfig } from "./campaigns.ts";
import { Gone } from "./errors.ts";

/**
 * `Das Gefüge` — Stammbaum und Politogramm über EINEM Kantenmodell.
 *
 * Die Sichtbarkeitsregel ist eine einzige und sie ist geliehen, nicht erfunden: **eine Kante
 * erscheint genau dann, wenn die Leserin die Passage hält, die sie behauptet.** Dieselbe
 * Herleitung (`held`, aufgelöst durch die Lineage) trägt schon den Artikel; das Gefüge führt
 * keine zweite Rechtepolitik ein.
 *
 * Ein Knoten, dessen Eintrag die Leserin nicht kennt, wird **genannt, aber nicht begehbar** —
 * exakt die Regel, nach der ein Link im Artikel blau oder rot ist. Er kann genannt werden,
 * weil die gehaltene Passage ihn selbst nennt.
 */
/** 400, nicht 404: fuer die Spielleitung ist eine Schleife eine fehlerhafte Eingabe, kein Geheimnis. */
export class UngueltigeBeziehung extends Error {
  readonly statusCode = 400;
  constructor(message: string) { super(message); }
}

export interface Knoten { entryId: string; titel: string; slug: string; bekannt: boolean }
export interface Kante {
  id: string; passageId: string; vonEntryId: string; nachEntryId: string;
  art: Beziehungsart; rolle: string | null; graph: Gefuegegraph; gerichtet: boolean;
}
export interface Gefuege { knoten: readonly Knoten[]; kanten: readonly Kante[] }

interface Row {
  id: string; passage_id: string; von_entry_id: string; nach_entry_id: string;
  art: Beziehungsart; rolle: string | null;
}

const kante = (row: Row): Kante => ({
  id: row.id, passageId: row.passage_id, vonEntryId: row.von_entry_id, nachEntryId: row.nach_entry_id,
  art: row.art, rolle: row.rolle, graph: graphVon(row.art), gerichtet: istGerichtet(row.art),
});

export function createGefuege(db: Db, config: DomainConfig = {}) {
  const campaigns = createCampaigns(db, config), now = config.now ?? Date.now;

  async function leitung(userId: string, campaignId: string) {
    const member = await campaigns.requireMember(userId, campaignId);
    if (member.role !== "leitung") throw new Gone();
    return member;
  }

  /**
   * Die gehaltenen Passagen dieser Leserin, aufgelöst durch die Lineage — dieselbe Menge, aus
   * der die Artikelprojektion entsteht. Für die Spielleitung: alles.
   */
  async function sichtbareAnker(userId: string, campaignId: string): Promise<ReadonlySet<PassageId> | null> {
    const member = await campaigns.requireMember(userId, campaignId);
    if (member.role === "leitung") return null;
    return createDocuments(db, config).held(campaignId, member.actorId);
  }

  async function bauen(userId: string, campaignId: string, rows: Row[]): Promise<Gefuege> {
    const wissen = await createDocuments(db, config).knowledge(userId, campaignId);
    const kanten = rows.map(kante);
    const ids = [...new Set(kanten.flatMap(k => [k.vonEntryId, k.nachEntryId]))];
    const namen = ids.length ? (await db.query<{ id: string; title: string; slug: string }>(
      "SELECT id,title,slug FROM entries WHERE campaign_id=$1 AND id=ANY($2::text[])", [campaignId, ids])).rows : [];
    const knoten = namen.map(row => ({ entryId: row.id, titel: row.title, slug: row.slug,
      bekannt: wissen.bekannteEntryIds ? wissen.bekannteEntryIds.has(row.id) : true }))
      .sort((a, b) => a.titel < b.titel ? -1 : a.titel > b.titel ? 1 : a.entryId < b.entryId ? -1 : 1);
    return { knoten, kanten };
  }

  async function offene(campaignId: string, anker: ReadonlySet<PassageId> | null, entryId?: string): Promise<Row[]> {
    const rows = (await db.query<Row>(`SELECT id,passage_id,von_entry_id,nach_entry_id,art,rolle FROM beziehungen
      WHERE campaign_id=$1 AND withdrawn_at IS NULL ${entryId ? "AND (von_entry_id=$2 OR nach_entry_id=$2)" : ""}
      ORDER BY created_at,id`, entryId ? [campaignId, entryId] : [campaignId])).rows;
    return anker ? rows.filter(row => anker.has(trustPassageId(row.passage_id))) : rows;
  }

  async function gefuege(userId: string, campaignId: string, entryId?: string): Promise<Gefuege> {
    const anker = await sichtbareAnker(userId, campaignId);
    if (entryId) {
      // Ein Eintrag, den die Leserin gar nicht kennt, hat für sie auch kein Gefüge.
      const wissen = await createDocuments(db, config).knowledge(userId, campaignId);
      if (wissen.bekannteEntryIds && !wissen.bekannteEntryIds.has(entryId)) throw new Gone();
    }
    return bauen(userId, campaignId, await offene(campaignId, anker, entryId));
  }

  async function anlegen(userId: string, campaignId: string, input: { passageId: string; vonEntryId: string; nachEntryId: string; art: Beziehungsart; rolle?: string }): Promise<Kante> {
    await leitung(userId, campaignId);
    if (input.vonEntryId === input.nachEntryId) throw new UngueltigeBeziehung("Eine Beziehung braucht zwei verschiedene Einträge.");
    const row = (await db.query<Row>(`INSERT INTO beziehungen(id,campaign_id,passage_id,von_entry_id,nach_entry_id,art,rolle,created_at,created_by)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id,passage_id,von_entry_id,nach_entry_id,art,rolle`,
      [randomUUID(), campaignId, input.passageId, input.vonEntryId, input.nachEntryId, input.art, input.rolle ?? null, now(), userId])).rows[0];
    if (!row) throw new Gone();
    return kante(row);
  }

  async function zurueckziehen(userId: string, campaignId: string, id: string): Promise<{ ok: true }> {
    await leitung(userId, campaignId);
    const result = await db.query("UPDATE beziehungen SET withdrawn_at=$1,withdrawn_by=$2 WHERE id=$3 AND campaign_id=$4 AND withdrawn_at IS NULL",
      [now(), userId, id, campaignId]);
    if (!result.rowCount) throw new Gone();
    return { ok: true };
  }

  return { gefuege, anlegen, zurueckziehen };
}
