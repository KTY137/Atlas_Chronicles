// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { randomUUID } from "node:crypto";
import type { Db } from "../db/index.ts";
import { createCampaigns, type DomainConfig } from "./campaigns.ts";
import { Conflict, Gone } from "./errors.ts";

/**
 * Die Kampfbühne — wer ist dran, in welcher Runde, auf welcher Seite.
 *
 * Sie führt **keine zweite Rechtepolitik** ein: die Spielleitung stellt die Bühne und schiebt den
 * Zug weiter, alle am Tisch sehen sie. Das ist dieselbe Trennung, nach der die Spielleitung
 * Szenen führt und die Runde sie liest — ein Kampf ist nichts Heimliches, sonst wüsste niemand,
 * wann er dran ist.
 *
 * **Figur und Runde sichern den Zug gemeinsam.** Dieselbe Figur ist in der nächsten Runde
 * wieder dran; ihre Kennung allein erkennt dann keinen verspäteten zweiten Klick mehr.
 * Schreibvorgänge sperren die Bühne, bevor sie diesen gemeinsamen Stand lesen.
 */

export type Seite = "gefaehrten" | "gegner" | "neutral";
export type Kampfzustand = "vorbereitet" | "laufend" | "beendet";

export interface Teilnehmer {
  id: string; name: string; seite: Seite; actorId: string | null;
  initiative: number; ordnung: number; initiativeRollId: string | null; amZug: boolean;
}
export interface Kampf {
  id: string; name: string; zustand: Kampfzustand; runde: number;
  erstelltAm: number; beendetAm: number | null; teilnehmer: readonly Teilnehmer[];
}

interface KampfRow { id: string; name: string; zustand: Kampfzustand; runde: number; erstellt_am: string | number; beendet_am: string | number | null }
interface TeilnehmerRow { id: string; name: string; seite: Seite; actor_id: string | null; initiative: number; ordnung: number; initiative_roll_id: string | null; am_zug: boolean }

/**
 * Die Reihenfolge der Bühne: höhere Initiative zuerst, Gleichstand nach der stabilen
 * Ordnungszahl. Ohne den zweiten Schlüssel hinge die Reihenfolge zweier gleich schneller
 * Kämpfender daran, in welcher Reihenfolge die Datenbank Zeilen zurückgibt — also an nichts.
 */
const nachInitiative = (a: Teilnehmer, b: Teilnehmer): number =>
  b.initiative - a.initiative || a.ordnung - b.ordnung;

const teilnehmer = (row: TeilnehmerRow): Teilnehmer => ({
  id: row.id, name: row.name, seite: row.seite, actorId: row.actor_id,
  initiative: Number(row.initiative), ordnung: Number(row.ordnung),
  initiativeRollId: row.initiative_roll_id, amZug: row.am_zug,
});

export function createKampfbuehne(db: Db, config: DomainConfig = {}) {
  const campaigns = createCampaigns(db, config), now = config.now ?? Date.now;

  async function leitung(userId: string, campaignId: string) {
    const member = await campaigns.requireMember(userId, campaignId);
    // 404 statt 403: wer nicht führen darf, soll nicht einmal erfahren, dass es die Bühne gibt.
    if (member.role !== "leitung") throw new Gone();
    return member;
  }

  async function lies(tx: Db, campaignId: string, kampfId: string, sperren = false): Promise<Kampf> {
    const kopf = (await tx.query<KampfRow>(
      `SELECT id,name,zustand,runde,erstellt_am,beendet_am FROM kaempfe WHERE id=$1 AND campaign_id=$2${sperren ? " FOR UPDATE" : ""}`,
      [kampfId, campaignId])).rows[0];
    if (!kopf) throw new Gone();
    const reihen = (await tx.query<TeilnehmerRow>(
      "SELECT id,name,seite,actor_id,initiative,ordnung,initiative_roll_id,am_zug FROM kampf_teilnehmer WHERE campaign_id=$1 AND kampf_id=$2",
      [campaignId, kampfId])).rows;
    return { id: kopf.id, name: kopf.name, zustand: kopf.zustand, runde: Number(kopf.runde),
      erstelltAm: Number(kopf.erstellt_am), beendetAm: kopf.beendet_am === null ? null : Number(kopf.beendet_am),
      teilnehmer: reihen.map(teilnehmer).sort(nachInitiative) };
  }

  /** Alle am Tisch sehen die Bühnen ihrer Kampagne — auch Beobachtende. */
  async function buehnen(userId: string, campaignId: string): Promise<readonly Kampf[]> {
    await campaigns.requireMember(userId, campaignId);
    const koepfe = (await db.query<KampfRow>(
      "SELECT id,name,zustand,runde,erstellt_am,beendet_am FROM kaempfe WHERE campaign_id=$1 ORDER BY erstellt_am DESC,id",
      [campaignId])).rows;
    const alle: Kampf[] = [];
    for (const kopf of koepfe) alle.push(await lies(db, campaignId, kopf.id));
    return alle;
  }

  async function buehne(userId: string, campaignId: string, kampfId: string): Promise<Kampf> {
    await campaigns.requireMember(userId, campaignId);
    return lies(db, campaignId, kampfId);
  }

  async function anlegen(userId: string, campaignId: string, input: { name: string }): Promise<Kampf> {
    await leitung(userId, campaignId);
    const id = randomUUID();
    await db.query("INSERT INTO kaempfe(id,campaign_id,name,zustand,runde,erstellt_am) VALUES($1,$2,$3,'vorbereitet',0,$4)",
      [id, campaignId, input.name, now()]);
    return lies(db, campaignId, id);
  }

  /**
   * Eine Karte auf die Bühne stellen. Die Ordnungszahl vergibt der Server fortlaufend — sie ist
   * die Aufnahmereihenfolge und entscheidet nur Gleichstände; sie vom Aufrufer zu nehmen hieße,
   * ihm die Eindeutigkeit anzuvertrauen, die die Datenbank ohnehin erzwingt.
   */
  async function teilnehmerHinzufuegen(userId: string, campaignId: string, kampfId: string,
    input: { name: string; seite: Seite; initiative: number; actorId?: string | null; initiativeRollId?: string | null }): Promise<Kampf> {
    await leitung(userId, campaignId);
    return db.transaction(async tx => {
      const kampf = (await tx.query<{ zustand: Kampfzustand }>("SELECT zustand FROM kaempfe WHERE id=$1 AND campaign_id=$2 FOR UPDATE", [kampfId, campaignId])).rows[0];
      if (!kampf) throw new Gone();
      // Ein beendeter Kampf nimmt niemanden mehr auf.
      if (kampf.zustand === "beendet") throw new Conflict();
      const naechste = (await tx.query<{ n: number | string | null }>(
        "SELECT max(ordnung) AS n FROM kampf_teilnehmer WHERE campaign_id=$1 AND kampf_id=$2", [campaignId, kampfId])).rows[0]?.n;
      const amZug = kampf.zustand === "laufend" && (naechste === null || naechste === undefined);
      await tx.query(`INSERT INTO kampf_teilnehmer(id,kampf_id,campaign_id,seite,name,actor_id,initiative,ordnung,initiative_roll_id,am_zug)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [randomUUID(), kampfId, campaignId, input.seite, input.name, input.actorId ?? null, input.initiative,
          naechste === null || naechste === undefined ? 0 : Number(naechste) + 1, input.initiativeRollId ?? null, amZug]);
      return lies(tx, campaignId, kampfId);
    });
  }

  /**
   * Eine Karte wieder herunternehmen. War sie am Zug, wandert der Zug weiter — ein laufender
   * Kampf ohne jemanden am Zug wäre eine Bühne, auf der niemand handeln kann und die niemand
   * mehr weiterschieben könnte.
   */
  async function teilnehmerEntfernen(userId: string, campaignId: string, kampfId: string, teilnehmerId: string): Promise<Kampf> {
    await leitung(userId, campaignId);
    return db.transaction(async tx => {
      const vorher = await lies(tx, campaignId, kampfId, true);
      const weg = vorher.teilnehmer.find(t => t.id === teilnehmerId);
      if (!weg) throw new Gone();
      if (weg.amZug) {
        const rest = vorher.teilnehmer.filter(t => t.id !== teilnehmerId);
        const stelle = vorher.teilnehmer.indexOf(weg);
        const nachfolger = rest[stelle % rest.length];
        await tx.query("UPDATE kampf_teilnehmer SET am_zug=false WHERE id=$1 AND campaign_id=$2", [teilnehmerId, campaignId]);
        if (nachfolger) await tx.query("UPDATE kampf_teilnehmer SET am_zug=true WHERE id=$1 AND campaign_id=$2", [nachfolger.id, campaignId]);
        if (nachfolger && stelle === rest.length)
          await tx.query("UPDATE kaempfe SET runde=runde+1 WHERE id=$1 AND campaign_id=$2", [kampfId, campaignId]);
      }
      await tx.query("DELETE FROM kampf_teilnehmer WHERE id=$1 AND campaign_id=$2", [teilnehmerId, campaignId]);
      return lies(tx, campaignId, kampfId);
    });
  }

  /** Die Bühne eröffnen: Runde 1, und die höchste Initiative ist dran. */
  async function eroeffnen(userId: string, campaignId: string, kampfId: string): Promise<Kampf> {
    await leitung(userId, campaignId);
    return db.transaction(async tx => {
      const kampf = await lies(tx, campaignId, kampfId, true);
      // Zweimal eröffnen würde die Runde zurücksetzen und den laufenden Zug verwerfen.
      if (kampf.zustand !== "vorbereitet") throw new Conflict();
      const erster = kampf.teilnehmer[0];
      // Eine leere Bühne hat niemanden, der anfangen könnte.
      if (!erster) throw new Conflict();
      await tx.query("UPDATE kaempfe SET zustand='laufend',runde=1 WHERE id=$1 AND campaign_id=$2", [kampfId, campaignId]);
      await tx.query("UPDATE kampf_teilnehmer SET am_zug=true WHERE id=$1 AND campaign_id=$2", [erster.id, campaignId]);
      return lies(tx, campaignId, kampfId);
    });
  }

  /**
   * Den Zug weiterschieben. `von` und `runde` nennen den erwarteten Zug, auch wenn dieselbe
   * Figur inzwischen in einer späteren Runde wieder an der Reihe ist.
   */
  async function naechsterZug(userId: string, campaignId: string, kampfId: string, von: string, runde: number): Promise<Kampf> {
    await leitung(userId, campaignId);
    return db.transaction(async tx => {
      const kampf = await lies(tx, campaignId, kampfId, true);
      // Nur ein laufender Kampf hat einen nächsten Zug.
      if (kampf.zustand !== "laufend" || kampf.runde !== runde) throw new Conflict();
      const stelle = kampf.teilnehmer.findIndex(t => t.amZug);
      const aktuell = kampf.teilnehmer[stelle];
      // Der Zug ist inzwischen weitergegangen — ein zweiter Klick würde jemanden überspringen.
      if (!aktuell || aktuell.id !== von) throw new Conflict();
      const naechste = kampf.teilnehmer[(stelle + 1) % kampf.teilnehmer.length]!;
      await tx.query("UPDATE kampf_teilnehmer SET am_zug=false WHERE id=$1 AND campaign_id=$2", [aktuell.id, campaignId]);
      await tx.query("UPDATE kampf_teilnehmer SET am_zug=true WHERE id=$1 AND campaign_id=$2", [naechste.id, campaignId]);
      // Der Wechsel zurück an den Anfang der Reihenfolge ist die neue Runde — nicht ein Zähler,
      // den die Oberfläche nebenher hochzählt und der dann von ihr abhängt.
      if ((stelle + 1) % kampf.teilnehmer.length === 0)
        await tx.query("UPDATE kaempfe SET runde=runde+1 WHERE id=$1 AND campaign_id=$2", [kampfId, campaignId]);
      return lies(tx, campaignId, kampfId);
    });
  }

  /** Die Bühne schließen. Niemand bleibt am Zug — ein beendeter Kampf hat keinen. */
  async function beenden(userId: string, campaignId: string, kampfId: string): Promise<Kampf> {
    await leitung(userId, campaignId);
    return db.transaction(async tx => {
      const kampf = await lies(tx, campaignId, kampfId, true);
      // Zweimal beenden würde den Beendigungszeitpunkt überschreiben.
      if (kampf.zustand === "beendet") throw new Conflict();
      await tx.query("UPDATE kampf_teilnehmer SET am_zug=false WHERE campaign_id=$1 AND kampf_id=$2 AND am_zug", [campaignId, kampfId]);
      // Ein nie eröffneter Kampf hat Runde 0; der CHECK verlangt, dass nur `vorbereitet` dort
      // steht. Er wird deshalb beim Schließen auf Runde 1 gehoben: er hat stattgefunden, wenn
      // auch ohne einen einzigen Zug.
      await tx.query("UPDATE kaempfe SET zustand='beendet',beendet_am=$3,runde=greatest(runde,1) WHERE id=$1 AND campaign_id=$2",
        [kampfId, campaignId, now()]);
      return lies(tx, campaignId, kampfId);
    });
  }

  return { buehnen, buehne, anlegen, teilnehmerHinzufuegen, teilnehmerEntfernen, eroeffnen, naechsterZug, beenden };
}
