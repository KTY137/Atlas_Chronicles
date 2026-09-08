// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
/**
 * Raumuhr — was eine Kampagne tatsächlich verbraucht hat.
 *
 * `design/10-hosted-betrieb-und-auslieferung.md` §3.4 wählt als Einheit die Wandzeit offener
 * `game_session`-Intervalle, nicht Compute-Weckungen: `CHAMPION.md` §14.1 rechnet auf
 * Scale-to-Zero, der gebaute Verbund läuft aber als Dauerprozess. Die Sitzungszeit ist die
 * Einheit, die es heute wirklich gibt, die ein Tisch versteht und die nachrechenbar ist.
 *
 * **Kein Ledger, mit Absicht.** Raumstunden sind aus `game_sessions` ableitbar; eine eigene
 * Tabelle friert nur eine Abrechnungsperiode ein, und eine Abrechnung gibt es ohne die
 * Geldentscheidungen aus §7.2 nicht. Sie wäre außerdem eine neue Formatgeneration, direkt nach
 * v8 — und die Kette hasht bei jeder Generation die gesamte Tabellenmenge neu. Erst der
 * Bericht, die Tabelle mit der ersten echten Rechnung.
 */
import type { Db } from "../db/index.ts";
import { createCampaigns } from "./campaigns.ts";

export interface MeteringConfig { now?: () => number }

export interface CampaignUsage {
  readonly campaignId: string;
  /** Das ausgewertete Fenster, in Millisekunden seit Epoche. */
  readonly from: number;
  readonly to: number;
  /** Sitzungen, die das Fenster berühren. */
  readonly sessions: number;
  /** Davon beim Stichtag noch offen. */
  readonly openSessions: number;
  /** Die Einheit: Wandzeit offener Sitzungen, auf das Fenster beschnitten. */
  readonly roomSeconds: number;
}

interface Zeile { sessions: string; open_sessions: string; ms: string }

export function createMetering(db: Db, cfg: MeteringConfig = {}) {
  const now = cfg.now ?? Date.now;

  /**
   * Jedes Intervall wird auf das Fenster beschnitten, statt Sitzungen nach ihrem Beginn zu
   * zählen: Ein Abend, der über Mitternacht läuft, gehört sonst ganz in einen Monat und im
   * anderen fehlt er. Eine noch offene Sitzung zählt bis zum Fensterende, nie darüber hinaus.
   */
  async function fenster(campaignId: string, from: number, to: number): Promise<{ zeilen: number; offen: number; sekunden: number }> {
    const row = (await db.query<Zeile>(
      `SELECT count(*) AS sessions,
              count(*) FILTER (WHERE ended_at IS NULL) AS open_sessions,
              COALESCE(SUM(LEAST(COALESCE(ended_at,$3),$3) - GREATEST(started_at,$2)),0) AS ms
       FROM game_sessions
       WHERE campaign_id=$1 AND started_at < $3 AND COALESCE(ended_at,$3) > $2`,
      [campaignId, from, to])).rows[0]!;
    return { zeilen: Number(row.sessions), offen: Number(row.open_sessions), sekunden: Math.round(Number(row.ms) / 1000) };
  }

  /**
   * Der Verbrauch einer Kampagne. Nur die Spielleitung darf ihn sehen: Nach S1 zahlt genau
   * eine Person für einen Tisch, und die Rechnung geht niemanden sonst etwas an.
   */
  async function campaignUsage(userId: string, campaignId: string, from = 0, to = now()): Promise<CampaignUsage> {
    await createCampaigns(db, cfg).requireMember(userId, campaignId, ["leitung"]);
    const raum = await fenster(campaignId, from, to);
    return { campaignId, from, to,
      sessions: raum.zeilen, openSessions: raum.offen, roomSeconds: raum.sekunden };
  }

  /** Dieselbe Rechnung über alle Kampagnen — die Betreibersicht. */
  async function allUsage(from = 0, to = now()): Promise<readonly CampaignUsage[]> {
    const ids = (await db.query<{ id: string }>("SELECT id FROM campaigns ORDER BY created_at,id")).rows;
    const alle: CampaignUsage[] = [];
    for (const { id } of ids) {
      const raum = await fenster(id, from, to);
      alle.push({ campaignId: id, from, to, sessions: raum.zeilen, openSessions: raum.offen,
        roomSeconds: raum.sekunden });
    }
    return alle;
  }

  return { campaignUsage, allUsage };
}
