// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { randomUUID } from "node:crypto";
import { stableJson } from "@chronicle/rules";
import type { KampfAufraeumen, KampfFuerLeitung, KampfFuerRunde, KampfSeite, KartenLage, KartenSichtDaten } from "@chronicle/protocol";
import { vorgabeSicht, zeigtBild } from "@chronicle/projection";
import type { Db } from "../db/index.ts";
import { createCampaigns, type DomainConfig } from "./campaigns.ts";
import { Conflict, Gone } from "./errors.ts";
import { kaempfeDarstellen, kampfFuerLeitung, kampfFuerRunde, lies, liesAlle, type KampfRoh, type KarteRoh } from "./kampf-lesen.ts";
import { naechsteFeldkarte, zugNachVerlassen } from "./kampf-zug.ts";
import { createActors, listControlledActorIds } from "./actors.ts";
import { instantiatePinnedActorInTx } from "./pinned-actors.ts";

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
 *
 * Die Lesewege projizieren je Betrachter (`kampf-lesen.ts`), die Befehle geben immer die
 * Nutzlast der Spielleitung zurück — nur sie darf sie auslösen.
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

  /** `null` = Spielleitung. Sonst die Figuren, die der Betrachter führt. */
  async function betrachter(userId: string, campaignId: string): Promise<ReadonlySet<string> | null> {
    const member = await campaigns.requireMember(userId, campaignId);
    return member.role === "leitung" ? null : new Set(await listControlledActorIds(db, member));
  }
  const darstellen = (tx: Db, campaignId: string, roh: KampfRoh, fuehrt: ReadonlySet<string> | null) =>
    fuehrt === null ? kampfFuerLeitung(tx, config, campaignId, roh) : kampfFuerRunde(tx, config, campaignId, roh, fuehrt);

  /** Alle am Tisch sehen die Kämpfe ihrer Kampagne — jede und jeder so, wie die Spielleitung es zulässt. */
  async function buehnen(userId: string, campaignId: string): Promise<readonly (KampfFuerLeitung | KampfFuerRunde)[]> {
    const fuehrt = await betrachter(userId, campaignId);
    // Ein Lesegang für alle Kämpfe: die Live-Verbindung fragt das alle paar Sekunden je Betrachter.
    return kaempfeDarstellen(db, config, campaignId, await liesAlle(db, campaignId), fuehrt);
  }
  async function buehne(userId: string, campaignId: string, kampfId: string): Promise<KampfFuerLeitung | KampfFuerRunde> {
    const fuehrt = await betrachter(userId, campaignId);
    return darstellen(db, campaignId, await lies(db, campaignId, kampfId), fuehrt);
  }

  /** „Mit den Augen der Runde": genau die Nutzlast eines Betrachters, der keine Figur führt. */
  async function alsRunde(userId: string, campaignId: string, kampfId: string): Promise<KampfFuerRunde> {
    await leitung(userId, campaignId);
    return kampfFuerRunde(db, config, campaignId, await lies(db, campaignId, kampfId), new Set());
  }

  /** Was die Runde von einer Karte sieht: Balken, Name für die Runde, Bild, Zustände. */
  async function sichtSetzen(userId: string, campaignId: string, kampfId: string, teilnehmerId: string,
    input: { sicht: KartenSichtDaten; nameFuerRunde: string | null; expectedVersion: number }): Promise<KampfFuerLeitung> {
    await leitung(userId, campaignId);
    return db.transaction(async tx => {
      const vorher = await lies(tx, campaignId, kampfId, true);
      if (vorher.zustand === "beendet") throw new Conflict();
      const karte = vorher.karten.find(k => k.id === teilnehmerId);
      if (!karte) throw new Gone();
      if (karte.version !== input.expectedVersion) throw new Conflict();
      await karteAendern(tx, campaignId, karte, { sicht: input.sicht, nameFuerRunde: input.nameFuerRunde });
      return stand(tx, campaignId, kampfId);
    });
  }

  /**
   * Das Porträt einer Karte, über den Kampf statt über die Figur: eine Spielerin darf die Figur des
   * Gegners nicht lesen, sein Bild auf dem Tisch aber sehen — wenn die Spielleitung es zeigt.
   * Dieselbe Regel wie in der Nutzlast (`zeigtBild`); wer die Karte nicht sieht, bekommt 404.
   */
  async function bild(userId: string, campaignId: string, kampfId: string, teilnehmerId: string): Promise<{ mime: string; sha256: string; data: Buffer }> {
    const fuehrt = await betrachter(userId, campaignId);
    const karte = (await lies(db, campaignId, kampfId)).karten.find(k => k.id === teilnehmerId);
    if (!karte?.actorId) throw new Gone();
    if (fuehrt !== null && !zeigtBild(karte, fuehrt)) throw new Gone();
    const row = (await db.query<{ mime: string | null; sha256: string | null; daten: string | null }>(
      "SELECT mime,sha256,daten FROM actor_portraits WHERE campaign_id=$1 AND actor_id=$2", [campaignId, karte.actorId])).rows[0];
    if (!row?.mime || !row.sha256 || !row.daten) throw new Gone();
    return { mime: row.mime, sha256: row.sha256, data: Buffer.from(row.daten, "base64") };
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

  /**
   * „Wolf aus Vorlage × 3": in EINER Transaktion N Figuren und N Karten. Jede Figur ist eine echte
   * Figur mit Bogen, Beute und Würfen (Spezifikation E1); sie gehört der Spielleitung, also sieht
   * keine Spielerin sie in ihrer Figurenliste.
   *
   * Die Befehlskennung jeder Figur ist `<commandId>:<nummer>`. Kommt derselbe Befehl zweimal (die
   * Antwort ging verloren), liefert die Figurenanlage dieselben Figuren zurück — und deren Karten
   * liegen dann schon auf dem Tisch.
   */
  async function ausVorlage(userId: string, campaignId: string, kampfId: string, input: {
    commandId: string; templateId: string; templateRevision: number; anzahl: number; name?: string;
    seite: KampfSeite; initiative: number; lage: "hand" | "feld";
  }): Promise<KampfFuerLeitung> {
    await leitung(userId, campaignId);
    return db.transaction(async tx => {
      // Erst die Kampagne, dann der Kampf: dieselbe Sperrreihenfolge wie jede Figurenanlage.
      await tx.query("SELECT id FROM campaigns WHERE id=$1 FOR UPDATE", [campaignId]);
      const vorher = await lies(tx, campaignId, kampfId, true);
      if (vorher.zustand === "beendet") throw new Conflict();
      const vorlage = (await tx.query<{ name: string }>(
        "SELECT definition->>'name' AS name FROM actor_template_revisions WHERE template_id=$1 AND campaign_id=$2 AND revision=$3",
        [input.templateId, campaignId, input.templateRevision])).rows[0];
      if (!vorlage) throw new Gone();
      const basis = (input.name ?? vorlage.name).slice(0, 150);
      const liegen = new Set(vorher.karten.flatMap(k => k.actorId ? [k.actorId] : []));
      let ordnung = naechsteOrdnung(vorher), frei = input.lage === "feld" && zugFrei(vorher);
      for (let nummer = 1; nummer <= input.anzahl; nummer++) {
        const figur = await instantiatePinnedActorInTx(tx, config, userId, campaignId, {
          commandId: `${input.commandId}:${nummer}`, templateId: input.templateId, templateRevision: input.templateRevision,
          name: input.anzahl > 1 ? `${basis} ${nummer}` : basis });
        if (liegen.has(figur.id)) continue;
        const id = randomUUID();
        await tx.query(`INSERT INTO kampf_teilnehmer(id,kampf_id,campaign_id,seite,name,actor_id,initiative,ordnung,initiative_roll_id,am_zug)
          VALUES($1,$2,$3,$4,$5,$6,$7,$8,NULL,$9)`, [id, kampfId, campaignId, input.seite, figur.name, figur.id, input.initiative, ordnung++, frei]);
        frei = false;
        await neueKarte(tx, campaignId, { id, seite: input.seite, lage: input.lage, nameFuerRunde: null, sicht: vorgabeSicht(input.seite), vomKampfAngelegt: true });
      }
      return stand(tx, campaignId, kampfId);
    });
  }

  /**
   * Nach dem Kampf die Figuren ins Archiv legen, die der Kampf selbst angelegt hat — nie andere.
   * Archivieren löscht nichts; Inventar und Beute bleiben an der Figur. Jede Figur ist ein eigener
   * `actor.archive`-Befehl: scheitert einer, bleibt der Kampf trotzdem beendet, und der Bericht
   * nennt, wer übrig blieb (Spezifikation E7).
   */
  async function archiviereKampffiguren(userId: string, campaignId: string, kampfId: string): Promise<KampfAufraeumen> {
    await leitung(userId, campaignId);
    const roh = await lies(db, campaignId, kampfId);
    if (roh.zustand !== "beendet") throw new Conflict();
    const actors = createActors(db, config), archiviert: string[] = [], nichtArchiviert: string[] = [];
    for (const karte of roh.karten) {
      if (!karte.vomKampfAngelegt || !karte.actorId) continue;
      try {
        const figur = await actors.getActor(userId, campaignId, karte.actorId);
        if (figur.archivedAt !== null || figur.version === null) continue;
        await actors.archiveActor(userId, campaignId, karte.actorId, { commandId: randomUUID(), expectedVersion: figur.version, reason: "Der Kampf ist vorbei." });
        archiviert.push(karte.actorId);
      } catch { nichtArchiviert.push(karte.actorId); }
    }
    return { archiviert, nichtArchiviert };
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

  return { buehnen, buehne, alsRunde, bild, anlegen, teilnehmerHinzufuegen, ausVorlage, archiviereKampffiguren, teilnehmerEntfernen, lageSetzen, sichtSetzen, initiativeSetzen, eroeffnen, naechsterZug, beenden };
}
