// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { randomUUID } from "node:crypto";
import { stableJson } from "@chronicle/rules";
import type { KampfFuerLeitung, KampfFuerRunde, KampfSeite, KartenLage, KartenSichtDaten } from "@chronicle/protocol";
import { vorgabeSicht } from "@chronicle/projection";
import type { Db } from "../db/index.ts";
import { createCampaigns, type DomainConfig } from "./campaigns.ts";
import { Conflict, Gone } from "./errors.ts";
import { kampfFuerLeitung, lies, type KampfRoh, type KarteRoh } from "./kampf-lesen.ts";
import { naechsteFeldkarte, zugNachVerlassen } from "./kampf-zug.ts";

/**
 * Der Kampftisch — wer liegt wo, wer ist dran, in welcher Runde, und was sieht die Runde davon.
 *
 * Die Spielleitung führt, alle am Tisch sehen zu — aber nur, was die Spielleitung sie sehen
 * lässt. Karten in der Hand oder in der Ablage erreichen niemanden sonst (Spezifikation E2/E4).
 *
 * **Figur und Runde sichern den Zug gemeinsam.** Dieselbe Figur ist in der nächsten Runde
 * wieder dran; ihre Kennung allein erkennt dann keinen verspäteten zweiten Klick mehr.
 * Schreibvorgänge sperren den Kampf, bevor sie Lage oder Zug lesen — so gilt „wer am Zug ist,
 * liegt auf dem Feld", obwohl keine Datenbankregel es über zwei Tabellen halten kann.
 */

export type Seite = KampfSeite;
export type { Kampfzustand } from "@chronicle/protocol";

interface NeueKarte { id: string; seite: KampfSeite; lage: KartenLage; nameFuerRunde: string | null; sicht: KartenSichtDaten; vomKampfAngelegt: boolean }
/** Eine Karte, die in allem der Voreinstellung entspricht, braucht keine Zeile (Spezifikation, Datenmodell). */
const istVoreinstellung = (k: NeueKarte): boolean =>
  k.lage === "feld" && k.nameFuerRunde === null && !k.vomKampfAngelegt && stableJson(k.sicht) === stableJson(vorgabeSicht(k.seite));
const naechsteOrdnung = (roh: KampfRoh): number => roh.karten.reduce((hoechste, k) => Math.max(hoechste, k.ordnung), -1) + 1;

export function createKampfbuehne(db: Db, config: DomainConfig = {}) {
  const campaigns = createCampaigns(db, config), now = config.now ?? Date.now;

  async function leitung(userId: string, campaignId: string) {
    const member = await campaigns.requireMember(userId, campaignId);
    // 404 statt 403: wer nicht führen darf, soll nicht einmal erfahren, dass es die Bühne gibt.
    if (member.role !== "leitung") throw new Gone();
    return member;
  }

  async function neueKarte(tx: Db, campaignId: string, karte: NeueKarte): Promise<void> {
    if (istVoreinstellung(karte)) return;
    await tx.query(`INSERT INTO kampf_karten(teilnehmer_id,campaign_id,lage,name_fuer_runde,sicht,vom_kampf_angelegt,version,geaendert_am)
      VALUES($1,$2,$3,$4,$5,$6,1,$7)`, [karte.id, campaignId, karte.lage, karte.nameFuerRunde, JSON.stringify(karte.sicht), karte.vomKampfAngelegt, now()]);
  }

  async function karteAendern(tx: Db, campaignId: string, karte: KarteRoh,
    aenderung: { lage?: KartenLage; nameFuerRunde?: string | null; sicht?: KartenSichtDaten }): Promise<void> {
    await tx.query(`INSERT INTO kampf_karten(teilnehmer_id,campaign_id,lage,name_fuer_runde,sicht,vom_kampf_angelegt,version,geaendert_am)
      VALUES($1,$2,$3,$4,$5,$6,1,$7)
      ON CONFLICT(teilnehmer_id) DO UPDATE SET lage=EXCLUDED.lage,name_fuer_runde=EXCLUDED.name_fuer_runde,sicht=EXCLUDED.sicht,
        version=kampf_karten.version+1,geaendert_am=EXCLUDED.geaendert_am`,
    [karte.id, campaignId, aenderung.lage ?? karte.lage, aenderung.nameFuerRunde === undefined ? karte.nameFuerRunde : aenderung.nameFuerRunde,
      JSON.stringify(aenderung.sicht ?? karte.sicht), karte.vomKampfAngelegt, now()]);
  }

  /** Die Karte `wegId` war am Zug und verlässt das Feld: der Zug geht weiter, wie am Tisch. */
  async function zugAbgeben(tx: Db, campaignId: string, roh: KampfRoh, wegId: string): Promise<void> {
    const { amZug, neueRunde } = zugNachVerlassen(roh.karten, wegId);
    await tx.query("UPDATE kampf_teilnehmer SET am_zug=false WHERE id=$1 AND campaign_id=$2", [wegId, campaignId]);
    if (amZug) await tx.query("UPDATE kampf_teilnehmer SET am_zug=true WHERE id=$1 AND campaign_id=$2", [amZug, campaignId]);
    if (neueRunde) await tx.query("UPDATE kaempfe SET runde=runde+1 WHERE id=$1 AND campaign_id=$2", [roh.id, campaignId]);
  }

  /** Ein laufender Kampf ohne jemanden am Zug gibt den Zug der nächsten Karte, die aufs Feld kommt. */
  const zugFrei = (roh: KampfRoh): boolean => roh.zustand === "laufend" && !roh.karten.some(k => k.amZug);

  const stand = async (tx: Db, campaignId: string, kampfId: string): Promise<KampfFuerLeitung> =>
    kampfFuerLeitung(tx, config, campaignId, await lies(tx, campaignId, kampfId));

  /**
   * Alle am Tisch sehen die Kämpfe ihrer Kampagne. AUFGABE 4 ersetzt diese beiden Lesewege durch
   * die Projektion je Betrachter — bis dahin bekommt jede Rolle die Nutzlast der Spielleitung.
   */
  async function buehnen(userId: string, campaignId: string): Promise<readonly (KampfFuerLeitung | KampfFuerRunde)[]> {
    await campaigns.requireMember(userId, campaignId);
    const koepfe = (await db.query<{ id: string }>("SELECT id FROM kaempfe WHERE campaign_id=$1 ORDER BY erstellt_am DESC,id", [campaignId])).rows;
    const alle: KampfFuerLeitung[] = [];
    for (const kopf of koepfe) alle.push(await stand(db, campaignId, kopf.id));
    return alle;
  }
  async function buehne(userId: string, campaignId: string, kampfId: string): Promise<KampfFuerLeitung | KampfFuerRunde> {
    await campaigns.requireMember(userId, campaignId);
    return stand(db, campaignId, kampfId);
  }

  async function anlegen(userId: string, campaignId: string, input: { name: string }): Promise<KampfFuerLeitung> {
    await leitung(userId, campaignId);
    const id = randomUUID();
    await db.query("INSERT INTO kaempfe(id,campaign_id,name,zustand,runde,erstellt_am) VALUES($1,$2,$3,'vorbereitet',0,$4)", [id, campaignId, input.name, now()]);
    return stand(db, campaignId, id);
  }

  /**
   * Eine Karte auf den Tisch legen — aufs Feld oder verdeckt in die Hand. Die Ordnungszahl vergibt
   * der Server fortlaufend; sie entscheidet nur Gleichstände der Initiative.
   */
  async function teilnehmerHinzufuegen(userId: string, campaignId: string, kampfId: string, input: {
    name: string; seite: KampfSeite; initiative: number; actorId?: string | null; initiativeRollId?: string | null;
    lage?: "hand" | "feld"; nameFuerRunde?: string | null; sicht?: KartenSichtDaten;
  }): Promise<KampfFuerLeitung> {
    await leitung(userId, campaignId);
    return db.transaction(async tx => {
      const vorher = await lies(tx, campaignId, kampfId, true);
      // Ein beendeter Kampf nimmt niemanden mehr auf.
      if (vorher.zustand === "beendet") throw new Conflict();
      const id = randomUUID(), lage = input.lage ?? "feld";
      await tx.query(`INSERT INTO kampf_teilnehmer(id,kampf_id,campaign_id,seite,name,actor_id,initiative,ordnung,initiative_roll_id,am_zug)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [id, kampfId, campaignId, input.seite, input.name, input.actorId ?? null, input.initiative, naechsteOrdnung(vorher),
        input.initiativeRollId ?? null, lage === "feld" && zugFrei(vorher)]);
      await neueKarte(tx, campaignId, { id, seite: input.seite, lage, nameFuerRunde: input.nameFuerRunde ?? null,
        sicht: input.sicht ?? vorgabeSicht(input.seite), vomKampfAngelegt: false });
      return stand(tx, campaignId, kampfId);
    });
  }

  /** Eine Karte ganz löschen — für Versehen. Wer nur vom Feld soll, kommt in die Ablage. */
  async function teilnehmerEntfernen(userId: string, campaignId: string, kampfId: string, teilnehmerId: string): Promise<KampfFuerLeitung> {
    await leitung(userId, campaignId);
    return db.transaction(async tx => {
      const vorher = await lies(tx, campaignId, kampfId, true);
      const weg = vorher.karten.find(k => k.id === teilnehmerId);
      if (!weg) throw new Gone();
      if (weg.amZug) await zugAbgeben(tx, campaignId, vorher, weg.id);
      await tx.query("DELETE FROM kampf_karten WHERE teilnehmer_id=$1 AND campaign_id=$2", [teilnehmerId, campaignId]);
      await tx.query("DELETE FROM kampf_teilnehmer WHERE id=$1 AND campaign_id=$2", [teilnehmerId, campaignId]);
      return stand(tx, campaignId, kampfId);
    });
  }

  /**
   * Die Spielleitung legt eine Karte woanders hin. Verlässt die Karte am Zug das Feld, geht der Zug
   * weiter; kommt eine Karte auf ein Feld, auf dem niemand am Zug ist, ist sie sofort dran.
   */
  async function lageSetzen(userId: string, campaignId: string, kampfId: string, teilnehmerId: string,
    input: { lage: KartenLage; expectedVersion: number }): Promise<KampfFuerLeitung> {
    await leitung(userId, campaignId);
    return db.transaction(async tx => {
      const vorher = await lies(tx, campaignId, kampfId, true);
      if (vorher.zustand === "beendet") throw new Conflict();
      const karte = vorher.karten.find(k => k.id === teilnehmerId);
      if (!karte) throw new Gone();
      if (karte.version !== input.expectedVersion) throw new Conflict();
      if (karte.lage === input.lage) return stand(tx, campaignId, kampfId);
      if (karte.amZug) await zugAbgeben(tx, campaignId, vorher, karte.id);
      await karteAendern(tx, campaignId, karte, { lage: input.lage });
      if (input.lage === "feld" && zugFrei(vorher))
        await tx.query("UPDATE kampf_teilnehmer SET am_zug=true WHERE id=$1 AND campaign_id=$2", [karte.id, campaignId]);
      return stand(tx, campaignId, kampfId);
    });
  }

  /**
   * Die Initiative neu setzen. Die Karte am Zug bleibt am Zug; ab dem nächsten Zug gilt die neue
   * Reihenfolge. Wer von Hand setzt, verliert den Beleg — eine Karte, die einen Wurf behauptet, den
   * sie nicht zeigt, wäre schlimmer als eine ohne.
   */
  async function initiativeSetzen(userId: string, campaignId: string, kampfId: string, teilnehmerId: string,
    input: { initiative: number; initiativeRollId: string | null }): Promise<KampfFuerLeitung> {
    await leitung(userId, campaignId);
    return db.transaction(async tx => {
      const vorher = await lies(tx, campaignId, kampfId, true);
      if (vorher.zustand === "beendet") throw new Conflict();
      if (!vorher.karten.some(k => k.id === teilnehmerId)) throw new Gone();
      await tx.query("UPDATE kampf_teilnehmer SET initiative=$3,initiative_roll_id=$4 WHERE id=$1 AND campaign_id=$2",
        [teilnehmerId, campaignId, input.initiative, input.initiativeRollId]);
      return stand(tx, campaignId, kampfId);
    });
  }

  /** Den Kampf eröffnen: Runde 1, und die höchste Initiative auf dem Feld ist dran. */
  async function eroeffnen(userId: string, campaignId: string, kampfId: string): Promise<KampfFuerLeitung> {
    await leitung(userId, campaignId);
    return db.transaction(async tx => {
      const vorher = await lies(tx, campaignId, kampfId, true);
      // Zweimal eröffnen würde die Runde zurücksetzen und den laufenden Zug verwerfen.
      if (vorher.zustand !== "vorbereitet") throw new Conflict();
      const erste = vorher.karten.find(k => k.lage === "feld");
      // Ein leeres Feld hat niemanden, der anfangen könnte — verdeckte Karten fangen nicht an.
      if (!erste) throw new Conflict();
      await tx.query("UPDATE kaempfe SET zustand='laufend',runde=1 WHERE id=$1 AND campaign_id=$2", [kampfId, campaignId]);
      await tx.query("UPDATE kampf_teilnehmer SET am_zug=true WHERE id=$1 AND campaign_id=$2", [erste.id, campaignId]);
      return stand(tx, campaignId, kampfId);
    });
  }

  /** Den Zug weiterschieben. `von` und `runde` nennen den erwarteten Zug. */
  async function naechsterZug(userId: string, campaignId: string, kampfId: string, von: string, runde: number): Promise<KampfFuerLeitung> {
    await leitung(userId, campaignId);
    return db.transaction(async tx => {
      const vorher = await lies(tx, campaignId, kampfId, true);
      if (vorher.zustand !== "laufend" || vorher.runde !== runde) throw new Conflict();
      const aktuell = vorher.karten.find(k => k.amZug);
      // Der Zug ist inzwischen weitergegangen — ein zweiter Klick würde jemanden überspringen.
      if (!aktuell || aktuell.id !== von) throw new Conflict();
      const weiter = naechsteFeldkarte(vorher.karten, aktuell.id);
      if (!weiter) throw new Conflict();
      await tx.query("UPDATE kampf_teilnehmer SET am_zug=false WHERE id=$1 AND campaign_id=$2", [aktuell.id, campaignId]);
      await tx.query("UPDATE kampf_teilnehmer SET am_zug=true WHERE id=$1 AND campaign_id=$2", [weiter.id, campaignId]);
      // Der Sprung an den Anfang der Feld-Karten IST die neue Runde.
      if (weiter.neueRunde) await tx.query("UPDATE kaempfe SET runde=runde+1 WHERE id=$1 AND campaign_id=$2", [kampfId, campaignId]);
      return stand(tx, campaignId, kampfId);
    });
  }

  /** Den Kampf schließen. Niemand bleibt am Zug — ein beendeter Kampf hat keinen. */
  async function beenden(userId: string, campaignId: string, kampfId: string): Promise<KampfFuerLeitung> {
    await leitung(userId, campaignId);
    return db.transaction(async tx => {
      const vorher = await lies(tx, campaignId, kampfId, true);
      if (vorher.zustand === "beendet") throw new Conflict();
      await tx.query("UPDATE kampf_teilnehmer SET am_zug=false WHERE campaign_id=$1 AND kampf_id=$2 AND am_zug", [campaignId, kampfId]);
      // Ein nie eröffneter Kampf hat Runde 0; der CHECK verlangt, dass nur `vorbereitet` dort steht.
      await tx.query("UPDATE kaempfe SET zustand='beendet',beendet_am=$3,runde=greatest(runde,1) WHERE id=$1 AND campaign_id=$2", [kampfId, campaignId, now()]);
      return stand(tx, campaignId, kampfId);
    });
  }

  return { buehnen, buehne, anlegen, teilnehmerHinzufuegen, teilnehmerEntfernen, lageSetzen, initiativeSetzen, eroeffnen, naechsterZug, beenden };
}
