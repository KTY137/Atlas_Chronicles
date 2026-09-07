import type { Db } from "../db/index.ts";
import { createCampaigns, type DomainConfig } from "./campaigns.ts";
import { authorizeActor } from "./actors.ts";
import { Conflict, Gone } from "./errors.ts";

/**
 * Der Geldzähler — eine Zahl, die der Figur gehört.
 *
 * **Kein neuer Rechteweg.** Wer die Figur führt, führt auch ihre Börse: dieselbe Prüfung wie bei
 * `updateItem`. Die Einheit dagegen gehört der Runde und wird von der Spielleitung benannt.
 *
 * **Fassungen, keine Deltas.** Jede Änderung nennt die erwartete Fassung; zwei Leute, die
 * gleichzeitig kaufen, bekommen einen Konflikt statt eines stillen Verlusts — dieselbe Regel wie
 * beim Bogen. Ein `+5`-Befehl wäre bequemer und würde genau diesen Verlust verstecken.
 *
 * **Fassung 0 heißt: es gibt noch keine Zeile.** Eine Figur ohne Börse hat null, nicht „nichts";
 * die erste Änderung legt sie an.
 */

export interface Geldeinheit { name: string; version: number }
export interface Geldstand { actorId: string; betrag: number; version: number }

export function createGeld(db: Db, config: DomainConfig = {}) {
  const campaigns = createCampaigns(db, config), now = config.now ?? Date.now;

  async function leitung(userId: string, campaignId: string) {
    const member = await campaigns.requireMember(userId, campaignId);
    if (member.role !== "leitung") throw new Gone();
    return member;
  }

  /** Wie diese Runde ihr Geld nennt. `null`, solange niemand es gesagt hat. */
  async function einheit(userId: string, campaignId: string): Promise<Geldeinheit | null> {
    await campaigns.requireMember(userId, campaignId);
    const row = (await db.query<{ name: string; version: number }>(
      "SELECT name,version FROM geld_einheit WHERE campaign_id=$1", [campaignId])).rows[0];
    return row ? { name: row.name, version: Number(row.version) } : null;
  }

  async function einheitSetzen(userId: string, campaignId: string, input: { name: string; expectedVersion: number }): Promise<Geldeinheit> {
    await leitung(userId, campaignId);
    const name = input.name.trim();
    if (!name || name.length > 40) throw new Conflict();
    return db.transaction(async tx => {
      const vorher = (await tx.query<{ version: number }>("SELECT version FROM geld_einheit WHERE campaign_id=$1 FOR UPDATE", [campaignId])).rows[0];
      if (Number(vorher?.version ?? 0) !== input.expectedVersion) throw new Conflict();
      if (vorher) await tx.query("UPDATE geld_einheit SET name=$2,version=version+1,geaendert_am=$3 WHERE campaign_id=$1", [campaignId, name, now()]);
      else await tx.query("INSERT INTO geld_einheit(campaign_id,name,geaendert_am) VALUES($1,$2,$3)", [campaignId, name, now()]);
      const row = (await tx.query<{ name: string; version: number }>("SELECT name,version FROM geld_einheit WHERE campaign_id=$1", [campaignId])).rows[0];
      if (!row) throw new Gone();
      return { name: row.name, version: Number(row.version) };
    });
  }

  /** Der Stand einer Figur. Ohne Zeile: null bei Fassung 0 — nicht „nichts", sondern noch nichts. */
  async function bestand(userId: string, campaignId: string, actorId: string): Promise<Geldstand> {
    const member = await campaigns.requireMember(userId, campaignId);
    await authorizeActor(db, member, actorId, { active: false });
    const row = (await db.query<{ betrag: string | number; version: number }>(
      "SELECT betrag,version FROM geldbestand WHERE campaign_id=$1 AND actor_id=$2", [campaignId, actorId])).rows[0];
    return { actorId, betrag: Number(row?.betrag ?? 0), version: Number(row?.version ?? 0) };
  }

  /** Alle Börsen der Runde — für die Spielleitung, die den Überblick braucht. */
  async function alle(userId: string, campaignId: string): Promise<readonly Geldstand[]> {
    await leitung(userId, campaignId);
    const rows = (await db.query<{ actor_id: string; betrag: string | number; version: number }>(
      "SELECT actor_id,betrag,version FROM geldbestand WHERE campaign_id=$1 ORDER BY actor_id", [campaignId])).rows;
    return rows.map(row => ({ actorId: row.actor_id, betrag: Number(row.betrag), version: Number(row.version) }));
  }

  async function setzen(userId: string, campaignId: string, actorId: string, input: { betrag: number; expectedVersion: number }): Promise<Geldstand> {
    if (!Number.isSafeInteger(input.betrag) || input.betrag < 0) throw new Conflict();
    return db.transaction(async tx => {
      // Innerhalb der Transaktion ueber `tx` fragen, nicht ueber `db`: die Datenbank haelt EINE
      // Verbindung, und eine Abfrage daneben wartet auf die offene Transaktion — auf sich selbst.
      const member = await createCampaigns(tx, config).requireMember(userId, campaignId);
      await authorizeActor(tx, member, actorId);
      const vorher = (await tx.query<{ version: number }>("SELECT version FROM geldbestand WHERE campaign_id=$1 AND actor_id=$2 FOR UPDATE", [campaignId, actorId])).rows[0];
      if (Number(vorher?.version ?? 0) !== input.expectedVersion) throw new Conflict();
      if (vorher) await tx.query("UPDATE geldbestand SET betrag=$3,version=version+1,geaendert_am=$4 WHERE campaign_id=$1 AND actor_id=$2", [campaignId, actorId, input.betrag, now()]);
      else await tx.query("INSERT INTO geldbestand(campaign_id,actor_id,betrag,geaendert_am) VALUES($1,$2,$3,$4)", [campaignId, actorId, input.betrag, now()]);
      const row = (await tx.query<{ betrag: string | number; version: number }>("SELECT betrag,version FROM geldbestand WHERE campaign_id=$1 AND actor_id=$2", [campaignId, actorId])).rows[0];
      if (!row) throw new Gone();
      return { actorId, betrag: Number(row.betrag), version: Number(row.version) };
    });
  }

  return { einheit, einheitSetzen, bestand, alle, setzen };
}
