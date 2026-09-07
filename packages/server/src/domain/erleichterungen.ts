import { randomUUID } from "node:crypto";
import type { Scalar } from "@chronicle/rules";
import type { Db } from "../db/index.ts";
import { createCampaigns, type DomainConfig } from "./campaigns.ts";
import { authorizeActor } from "./actors.ts";
import { Conflict, Gone } from "./errors.ts";

/**
 * Erleichterungen — die Spielleitung gewährt ein Zugeständnis, die Spielerin würfelt es selbst.
 *
 * **Der Wurf wird hier nicht gemacht.** Eingelöst wird in `gameplay.prepareAction`, dem einen
 * Weg, auf dem in diesem Haus Würfel fallen. Ein zweiter Wurfpfad neben ihm hätte eine zweite
 * Beleg-, Sitzungs- und Paketlogik — und genau die würde eines Tages auseinanderlaufen.
 *
 * **Die Eingaben kommen aus der Zeile, nicht aus der Anfrage.** Wer einlöst, sagt nur *welche*
 * Erleichterung; *was* sie zugesteht, hat die Spielleitung festgelegt. Sonst wäre das
 * Zugeständnis nur ein Vorwand, eigene Zahlen zu setzen.
 */

export interface ErleichterungEingabe {
  actorId: string; gemeinteAktion: string; gewuerfelteAktion: string;
  eingaben: Readonly<Record<string, Scalar>>; grund: string;
}
export interface Erleichterung {
  id: string; actorId: string; gemeinteAktion: string; gewuerfelteAktion: string;
  eingaben: Readonly<Record<string, Scalar>>; grund: string;
  gewaehrtVon: string; gewaehrtAm: number;
  eingeloestRollId: string | null; eingeloestAm: number | null; widerrufenAm: number | null;
}
interface Row {
  id: string; actor_id: string; gemeinte_aktion: string; gewuerfelte_aktion: string;
  eingaben: Record<string, Scalar>; grund: string; gewaehrt_von: string; gewaehrt_am: string | number;
  eingeloest_roll_id: string | null; eingeloest_am: string | number | null; widerrufen_am: string | number | null;
}
const zahl = (value: string | number | null): number | null => value === null ? null : Number(value);
const karte = (row: Row): Erleichterung => ({
  id: row.id, actorId: row.actor_id, gemeinteAktion: row.gemeinte_aktion, gewuerfelteAktion: row.gewuerfelte_aktion,
  eingaben: row.eingaben, grund: row.grund, gewaehrtVon: row.gewaehrt_von, gewaehrtAm: Number(row.gewaehrt_am),
  eingeloestRollId: row.eingeloest_roll_id, eingeloestAm: zahl(row.eingeloest_am), widerrufenAm: zahl(row.widerrufen_am),
});
const SPALTEN = "id,actor_id,gemeinte_aktion,gewuerfelte_aktion,eingaben,grund,gewaehrt_von,gewaehrt_am,eingeloest_roll_id,eingeloest_am,widerrufen_am";

/**
 * Die offene Erleichterung einer Figur, gesperrt für die Einlösung.
 *
 * Steht bewusst hier und nicht in `gameplay.ts`: sie ist eine Aussage über Erleichterungen, und
 * `gameplay` soll sie benutzen, nicht kennen.
 */
export async function sperreOffeneErleichterung(tx: Db, campaignId: string, actorId: string, id: string): Promise<Erleichterung> {
  const row = (await tx.query<Row>(`SELECT ${SPALTEN} FROM erleichterungen
    WHERE id=$1 AND campaign_id=$2 AND actor_id=$3 AND eingeloest_am IS NULL AND widerrufen_am IS NULL FOR UPDATE`,
    [id, campaignId, actorId])).rows[0];
  if (!row) throw new Gone();
  return karte(row);
}
/** Die Einlösung festhalten — untrennbar von dem Wurf, der sie eingelöst hat. */
export async function loeseErleichterungEin(tx: Db, campaignId: string, id: string, rollId: string, jetzt: number): Promise<void> {
  const ergebnis = await tx.query(`UPDATE erleichterungen SET eingeloest_roll_id=$3,eingeloest_am=$4
    WHERE id=$1 AND campaign_id=$2 AND eingeloest_am IS NULL AND widerrufen_am IS NULL`, [id, campaignId, rollId, jetzt]);
  if (!ergebnis.rowCount) throw new Conflict();
}

export function createErleichterungen(db: Db, config: DomainConfig = {}) {
  const campaigns = createCampaigns(db, config), now = config.now ?? Date.now;

  async function leitung(userId: string, campaignId: string) {
    const member = await campaigns.requireMember(userId, campaignId);
    if (member.role !== "leitung") throw new Gone();
    return member;
  }

  async function gewaehren(userId: string, campaignId: string, eingabe: ErleichterungEingabe): Promise<Erleichterung> {
    await leitung(userId, campaignId);
    if (!/\S/.test(eingabe.grund)) throw new Conflict();
    return db.transaction(async tx => {
      // Innerhalb der Transaktion wird ueber `tx` gefragt, nicht ueber `db`: die Datenbank haelt
      // EINE Verbindung, und eine Abfrage daneben wartet auf die offene Transaktion — auf sich
      // selbst. Gemessen, nicht vermutet: mit `db` haengt der Aufruf unbegrenzt.
      const member = await createCampaigns(tx, config).requireMember(userId, campaignId);
      // Die Figur muss es geben und der Kampagne gehören — dieselbe Prüfung wie überall sonst.
      await authorizeActor(tx, member, eingabe.actorId);
      const id = randomUUID();
      try {
        await tx.query(`INSERT INTO erleichterungen(id,campaign_id,actor_id,gemeinte_aktion,gewuerfelte_aktion,eingaben,grund,gewaehrt_von,gewaehrt_am)
          VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [id, campaignId, eingabe.actorId, eingabe.gemeinteAktion, eingabe.gewuerfelteAktion,
            JSON.stringify(eingabe.eingaben), eingabe.grund.trim(), userId, now()]);
      } catch (fehler) {
        // Das partielle eindeutige Register lässt nur EINE offene Erleichterung je Figur und
        // gemeinter Probe zu. Zwei gleichzeitig wären ein Stapel — und ein Stapel wäre der
        // Dauerbonus, den das Regelwerk nicht hat.
        if (String((fehler as { code?: string }).code) === "23505") throw new Conflict();
        throw fehler;
      }
      const row = (await tx.query<Row>(`SELECT ${SPALTEN} FROM erleichterungen WHERE id=$1`, [id])).rows[0];
      if (!row) throw new Gone();
      return karte(row);
    });
  }

  /**
   * Was gerade offensteht. Die Spielleitung sieht alle, eine Spielerin nur die ihrer eigenen
   * Figuren — sie soll wissen, was ihr zugestanden wurde, aber nicht, was andere bekommen haben.
   */
  async function offene(userId: string, campaignId: string, actorId?: string): Promise<readonly Erleichterung[]> {
    const member = await campaigns.requireMember(userId, campaignId);
    if (actorId) await authorizeActor(db, member, actorId, { active: false });
    else if (member.role !== "leitung") throw new Gone();
    const rows = (await db.query<Row>(`SELECT ${SPALTEN} FROM erleichterungen
      WHERE campaign_id=$1 AND eingeloest_am IS NULL AND widerrufen_am IS NULL
      AND ($2::text IS NULL OR actor_id=$2) ORDER BY gewaehrt_am,id`, [campaignId, actorId ?? null])).rows;
    return rows.map(karte);
  }

  /** Zurückgenommen, nicht gelöscht: eine widerrufene Absprache hat es trotzdem gegeben. */
  async function widerrufen(userId: string, campaignId: string, id: string): Promise<{ ok: true }> {
    await leitung(userId, campaignId);
    const ergebnis = await db.query(`UPDATE erleichterungen SET widerrufen_am=$3
      WHERE id=$1 AND campaign_id=$2 AND eingeloest_am IS NULL AND widerrufen_am IS NULL`, [id, campaignId, now()]);
    if (!ergebnis.rowCount) throw new Gone();
    return { ok: true };
  }

  return { gewaehren, offene, widerrufen };
}
