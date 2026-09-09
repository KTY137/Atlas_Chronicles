// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
/**
 * Der Figurantrag — ein Spieler bittet um eine Figur, die Spielleitung entscheidet.
 *
 * **Warum der Antrag ein eigenes Objekt ist und keine halbfertige Figur.** Der naheliegende Weg
 * waere gewesen, sofort eine Zeile in `actors` mit einem Feld `bestaetigt=false` anzulegen. Dann
 * muessten `authorizeActor` und seine acht Aufrufer — Befehle, Boegen, Wuerfe, Briefe, die
 * Kampfbuehne, der Leserblick — alle dieselbe zusaetzliche Bedingung tragen, und eine einzige
 * vergessene Stelle gaebe Zugriff auf eine Figur, die niemand freigegeben hat. Deshalb entsteht
 * die Figur erst bei der Bestaetigung, ueber denselben `instantiateActor`, den die Spielleitung
 * auch sonst benutzt. Es gibt nie eine unbestaetigte Figur, und `authorizeActor` bleibt Zeile
 * fuer Zeile unveraendert.
 *
 * **Die Paketbindung wird zweimal geprueft, mit zwei verschiedenen Absichten.** Beim Antrag
 * freundlich: eine Vorlage aus einem anderen Regelpaket taucht in der Auswahl gar nicht erst auf,
 * und wer sie doch nennt, bekommt einen Konflikt statt einer stillen Ablehnung Wochen spaeter.
 * Bei der Bestaetigung autoritativ: zwischen Antrag und Entscheidung kann die Spielleitung das
 * Paket gewechselt haben, und dann entsteht die Figur nicht.
 *
 * **Die Freigabe muss bei der Bestaetigung noch stehen.** Ein Entzug zwischen Antrag und
 * Entscheidung ist eine Aussage der Spielleitung: aus dieser Vorlage entstehen keine neuen
 * Figuren mehr. Der Antrag bleibt offen und sichtbar — die Spielleitung kann ihn ablehnen oder
 * die Freigabe erneuern —, aber bestaetigen laesst er sich erst danach wieder.
 */
import { randomUUID } from "node:crypto";
import { Value } from "@sinclair/typebox/value";
import { canonicalHash, type CanonicalValue } from "@chronicle/core";
import { DEMO_RULE_PACKAGE, parseSupportedRulePackage, validatePackageFields, type AnyRulePackage } from "@chronicle/rules";
import { FigurantragAblehnungBody, FigurantragAntragBody, FigurantragEntscheidungBody, FigurvorlageFreigabeBody,
  type FigurantragAntragInput, type FigurantragCard, type FigurantragFreigabeAck, type FigurantragOperation,
  type FigurantragStatus, type FreigegebeneVorlageCard } from "@chronicle/protocol";
import type { ActorTemplateData } from "../../../protocol/src/actors.ts";
import type { Db } from "../db/index.ts";
import { ActorValidationError, createActors, templateForPlayer } from "./actors.ts";
import type { DomainConfig, Membership } from "./campaigns.ts";
import { Conflict, Gone } from "./errors.ts";

const hash = (value: unknown) => canonicalHash(value as CanonicalValue);
const zeit = (value: string | number | null) => value === null ? null : String(value);

interface FreigabeRow {
  template_id: string; campaign_id: string; version: number;
  freed_by: string; freed_at: string | number; revoked_at: string | number | null;
}
interface AntragRow {
  id: string; campaign_id: string; antragsteller: string; template_id: string; template_revision: number;
  name: string; anfangswerte: Record<string, unknown>; state: FigurantragStatus; reason: string | null;
  version: number; created_at: string | number; decided_by: string | null; decided_at: string | number | null;
  actor_id: string | null;
}
interface VorlageRow { id: string; version: number; head_revision: number; definition: ActorTemplateData; content_hash: string }

export interface FigurantragBody { templateId: string; name: string; anfangswerte: Record<string, unknown> }

const antragCard = (row: AntragRow): FigurantragCard => ({
  id: row.id, templateId: row.template_id, templateRevision: row.template_revision, name: row.name,
  anfangswerte: { ...row.anfangswerte },
  status: row.state, version: row.version, antragsteller: row.antragsteller, createdAt: String(row.created_at),
  decidedBy: row.decided_by, decidedAt: zeit(row.decided_at), actorId: row.actor_id, reason: row.reason,
});
const freigabeAck = (row: FreigabeRow): FigurantragFreigabeAck => ({
  templateId: row.template_id, campaignId: row.campaign_id, freigegeben: row.revoked_at === null,
  version: row.version, freedBy: row.freed_by, freedAt: String(row.freed_at), revokedAt: zeit(row.revoked_at),
});

export function createFigurantrag(db: Db, cfg: DomainConfig = {}) {
  const now = cfg.now ?? Date.now;

  /** Dieselbe Kampagnensperre wie in `actors.ts`: erst die Kampagne, dann die Mitgliedschaft. */
  async function authorize(tx: Db, userId: string, campaignId: string, rollen?: readonly Membership["role"][]): Promise<Membership> {
    if (!(await tx.query(`SELECT c.id FROM campaigns c JOIN campaign_memberships m ON m.campaign_id=c.id
      WHERE c.id=$1 AND m.user_id=$2 FOR UPDATE OF c FOR SHARE OF m`, [campaignId, userId])).rowCount) throw new Gone();
    return member(tx, userId, campaignId, rollen);
  }
  async function member(tx: Db, userId: string, campaignId: string, rollen?: readonly Membership["role"][]): Promise<Membership> {
    const row = (await tx.query<Membership>(`SELECT m.campaign_id AS "campaignId",m.user_id AS "userId",m.role,
      m.display_name AS "displayName",m.actor_id AS "actorId",c.universe_id AS "universeId"
      FROM campaign_memberships m JOIN campaigns c ON c.id=m.campaign_id WHERE m.campaign_id=$1 AND m.user_id=$2`, [campaignId, userId])).rows[0];
    if (!row || (rollen && !rollen.includes(row.role))) throw new Gone();
    return row;
  }
  /** Das aktive Regelpaket der Kampagne. Ohne Pin gilt das Demopaket — wie ueberall sonst auch. */
  async function pin(tx: Db, campaignId: string): Promise<{ id: string; version: string }> {
    const row = (await tx.query<{ package_id: string; package_version: string }>(
      "SELECT package_id,package_version FROM campaign_rule_pins WHERE campaign_id=$1", [campaignId])).rows[0];
    return { id: row?.package_id ?? DEMO_RULE_PACKAGE.id, version: row?.package_version ?? DEMO_RULE_PACKAGE.version };
  }
  const passendesPaket = (definition: ActorTemplateData, aktiv: { id: string; version: string }) =>
    definition.package.id === aktiv.id && definition.package.version === aktiv.version;
  async function rulePackage(tx: Db, campaignId: string, wanted: { id: string; version: string }): Promise<AnyRulePackage> {
    const row = (await tx.query<{ document: unknown; content_hash: string }>(
      "SELECT document,content_hash FROM rule_packages WHERE campaign_id=$1 AND package_id=$2 AND version=$3", [campaignId, wanted.id, wanted.version])).rows[0];
    if (row) { if (hash(row.document) !== row.content_hash) throw new Gone(); return parseSupportedRulePackage(row.document); }
    if (wanted.id === DEMO_RULE_PACKAGE.id && wanted.version === DEMO_RULE_PACKAGE.version) return DEMO_RULE_PACKAGE;
    throw new Gone();
  }
  /** Eine Vorlage samt aktueller Revision. Ein gebrochener Inhaltshash ist keine Vorlage mehr. */
  async function vorlage(tx: Db, campaignId: string, templateId: string, revision?: number): Promise<VorlageRow> {
    const head = (await tx.query<{ id: string; version: number; head_revision: number; archived_at: string | null }>(
      "SELECT id,version,head_revision,archived_at FROM actor_templates WHERE id=$1 AND campaign_id=$2", [templateId, campaignId])).rows[0];
    if (!head || head.archived_at !== null) throw new Gone();
    const row = (await tx.query<{ definition: ActorTemplateData; content_hash: string }>(
      "SELECT definition,content_hash FROM actor_template_revisions WHERE template_id=$1 AND campaign_id=$2 AND revision=$3",
      [templateId, campaignId, revision ?? head.head_revision])).rows[0];
    if (!row || hash(row.definition) !== row.content_hash) throw new Gone();
    return { id: head.id, version: head.version, head_revision: revision ?? head.head_revision, definition: row.definition, content_hash: row.content_hash };
  }
  async function freigabe(tx: Db, campaignId: string, templateId: string): Promise<FreigabeRow | undefined> {
    return (await tx.query<FreigabeRow>("SELECT * FROM figurvorlagen_freigaben WHERE template_id=$1 AND campaign_id=$2", [templateId, campaignId])).rows[0];
  }
  async function antrag(tx: Db, campaignId: string, id: string): Promise<AntragRow> {
    const row = (await tx.query<AntragRow>("SELECT * FROM figurantraege WHERE id=$1 AND campaign_id=$2 FOR UPDATE", [id, campaignId])).rows[0];
    if (!row) throw new Gone();
    return row;
  }
  /** Jede Entscheidung hinterlaesst ihren Beleg: Anfrage, Hash und ausgelieferte Antwort. */
  async function beleg(tx: Db, campaignId: string, userId: string, operation: FigurantragOperation, commandId: string,
    request: unknown, requestHash: string, payload: unknown, ack: unknown): Promise<void> {
    await tx.query(`INSERT INTO figurantrag_events(command_id,campaign_id,actor_user_id,operation,request_hash,request,payload,ack,created_at)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`, [commandId, campaignId, userId, operation, requestHash,
      JSON.stringify(request), JSON.stringify(payload), JSON.stringify(ack), now()]);
  }
  /**
   * Nur `beantragen` kann hier hineinlaufen, und nur `beantragen` traegt diesen Fang.
   *
   * Ein wiederholter Befehl und ein zweiter offener Antrag sind derselbe Sachverhalt: hier
   * wurde dieselbe Sache zweimal gewollt. Beides ist ein Konflikt, kein Serverfehler.
   *
   * Die uebrigen fuenf Operationen hatten denselben Fang und konnten ihn nie ausloesen: sie
   * schreiben keine Zeile nach `figurantraege`, und ihre Belegzeile traegt eine frische
   * `randomUUID()` als Befehls-ID, die mit nichts kollidiert. Ein Fang, der nie greift,
   * behauptet einen Schutz, den es nicht gibt; ihre Einmaligkeit steht in `expectedVersion`.
   */
  function doppelterBefehl(error: unknown): never {
    const pg = error as { code?: string; constraint?: string };
    if (pg?.code === "23505" && (pg.constraint === "figurantrag_events_command_id_key" || pg.constraint === "figurantraege_ein_offener")) throw new Conflict();
    throw error;
  }
  function pruefe<T>(schema: Parameters<typeof Value.Check>[0], input: unknown): T {
    if (!Value.Check(schema, input)) throw new ActorValidationError("Bitte die Angaben zum Figurantrag pruefen.");
    return input as T;
  }
  /**
   * Die Anfangswerte eines Antrags sind eine **Abweichung**, kein vollstaendiger Bogen.
   *
   * Ein vollstaendiger Bogen im Antrag haette die Vorlage stillschweigend ersetzt: was der Spieler
   * nicht nennt, waere auf den Paketstandard zurueckgefallen, und die Spielleitung haette einen
   * Bogen bestaetigt, den sie nie so entworfen hat. Deshalb bleibt die Vorlagenrevision die
   * Grundlage, und der Antrag nennt nur, was daran anders sein soll.
   *
   * Zurueck kommen genau die genannten Schluessel in ihrer geprueften Form — das ist es, was auf
   * der Antragskarte steht und was die Spielleitung bestaetigt. Ein Schluessel, den das Paket
   * nicht kennt, ist kein Wunsch, sondern ein Tippfehler: 400, nicht stillschweigend verworfen.
   */
  function abweichung(pkg: AnyRulePackage, definition: ActorTemplateData, gewuenscht: Record<string, unknown>): Record<string, unknown> {
    const basis = validatePackageFields(pkg, definition.fields);
    for (const key of Object.keys(gewuenscht))
      if (!Object.hasOwn(basis, key)) throw new ActorValidationError("Diese Vorlage kennt eines der angegebenen Felder nicht.");
    const zusammen = werteFuerBogen(pkg, definition, gewuenscht);
    return Object.fromEntries(Object.keys(gewuenscht).sort().map(key => [key, zusammen[key]!]));
  }
  /** Vorlagenwerte, darueber die genannten Abweichungen — einmal durch die Paketpruefung. */
  function werteFuerBogen(pkg: AnyRulePackage, definition: ActorTemplateData, gewaehlt: Record<string, unknown>) {
    return validatePackageFields(pkg, { ...validatePackageFields(pkg, definition.fields), ...gewaehlt });
  }

  /** Freigeben und Entziehen sind derselbe Schalter; nur die Richtung unterscheidet sie. */
  async function schalte(userId: string, campaignId: string, templateId: string, expectedVersion: number, frei: boolean): Promise<FigurantragFreigabeAck> {
    pruefe(FigurvorlageFreigabeBody, { expectedVersion });
    const operation: FigurantragOperation = frei ? "figurvorlage.freigeben" : "figurvorlage.entziehen";
    const request = { campaignId, operation, templateId, expectedVersion }, requestHash = hash(request);
    return db.transaction(async tx => {
      await authorize(tx, userId, campaignId, ["leitung"]);
      await vorlage(tx, campaignId, templateId);
      const before = await freigabe(tx, campaignId, templateId), at = now();
      if ((before?.version ?? 0) !== expectedVersion) throw new Conflict();
      if (before && (before.revoked_at === null) === frei) throw new Conflict();
      if (!before) {
        if (!frei) throw new Conflict();
        await tx.query("INSERT INTO figurvorlagen_freigaben(template_id,campaign_id,freed_by,freed_at) VALUES($1,$2,$3,$4)", [templateId, campaignId, userId, at]);
      } else {
        await tx.query(`UPDATE figurvorlagen_freigaben SET version=version+1,freed_by=$3,freed_at=$4,revoked_at=$5
          WHERE template_id=$1 AND campaign_id=$2`, [templateId, campaignId, userId, at, frei ? null : at]);
      }
      const after = (await freigabe(tx, campaignId, templateId))!, ack = freigabeAck(after);
      await beleg(tx, campaignId, userId, operation, randomUUID(), request, requestHash, { schemaVersion: 1, before: before ? freigabeAck(before) : null, after: ack }, ack);
      return ack;
    });
  }

  /**
   * Die Vorlagenauswahl eines Spielers: freigegeben, nicht archiviert, aus dem aktiven Paket.
   * Projiziert wird ausnahmslos — auch fuer die Spielleitung, denn diese Liste ist die
   * Spielersicht und soll in der Vorschau genau das zeigen, was ein Spieler saehe.
   */
  async function freigegebeneVorlagen(userId: string, campaignId: string): Promise<FreigegebeneVorlageCard[]> {
    // In einer Transaktion, weil die Liste eine einzige Aussage ist: liest sie Mitgliedschaft,
    // Paketbindung und Freigaben aus drei Augenblicken, kann eine Vorlage aus einem Paket
    // erscheinen, das zwischendurch gewechselt wurde. Und in einer Abfrage statt zweien je
    // Vorlage — die Kopfzeile und ihre Revision holt derselbe Verbund.
    return db.transaction(async tx => {
      await member(tx, userId, campaignId, ["leitung", "spieler"]);
      const aktiv = await pin(tx, campaignId);
      const rows = (await tx.query<{ id: string; version: number; definition: ActorTemplateData; content_hash: string }>(
        `SELECT t.id,t.version,r.definition,r.content_hash FROM figurvorlagen_freigaben f
        JOIN actor_templates t ON t.id=f.template_id AND t.campaign_id=f.campaign_id
        JOIN actor_template_revisions r ON r.template_id=t.id AND r.campaign_id=t.campaign_id AND r.revision=t.head_revision
        WHERE f.campaign_id=$1 AND f.revoked_at IS NULL AND t.archived_at IS NULL ORDER BY t.created_at,t.id`, [campaignId])).rows;
      const karten: FreigegebeneVorlageCard[] = [];
      for (const row of rows) {
        // Derselbe Riegel wie in `vorlage`: eine Vorlage mit gebrochenem Inhaltshash ist keine.
        if (hash(row.definition) !== row.content_hash) throw new Gone();
        if (!passendesPaket(row.definition, aktiv)) continue;
        karten.push(templateForPlayer(row.id, row.version, row.definition));
      }
      return karten;
    });
  }

  async function beantragen(userId: string, campaignId: string, commandId: string, body: FigurantragBody): Promise<FigurantragCard> {
    const input = pruefe<FigurantragAntragInput>(FigurantragAntragBody, { commandId, ...body });
    const request = { campaignId, operation: "figurantrag.beantragen" as const, input }, requestHash = hash(request);
    return db.transaction(async tx => {
      await authorize(tx, userId, campaignId, ["spieler"]);
      const alt = (await tx.query<{ campaign_id: string; actor_user_id: string; request_hash: string; ack: FigurantragCard }>(
        "SELECT campaign_id,actor_user_id,request_hash,ack FROM figurantrag_events WHERE command_id=$1", [commandId])).rows[0];
      if (alt) {
        if (alt.campaign_id !== campaignId || alt.actor_user_id !== userId || alt.request_hash !== requestHash) throw new Conflict();
        // Die Quittung im Ereignisbuch bleibt, was sie war — sie ist der Beleg des damaligen
        // Augenblicks. Ausgeliefert wird trotzdem der heutige Stand desselben Antrags: wer
        // nach einem Verbindungsabbruch denselben Befehl wiederholt, bekaeme sonst „offen“
        // fuer einen Antrag, den die Spielleitung laengst bestaetigt hat, und legt in gutem
        // Glauben einen zweiten an. `actors.ts` haelt es mit `projectResult` genauso.
        return antragCard(await antrag(tx, campaignId, alt.ack.id));
      }
      const source = await vorlage(tx, campaignId, input.templateId);
      // 410, nicht 409: eine nicht freigegebene Vorlage existiert fuer einen Spieler nicht.
      const frei = await freigabe(tx, campaignId, input.templateId);
      if (!frei || frei.revoked_at !== null) throw new Gone();
      const aktiv = await pin(tx, campaignId);
      if (!passendesPaket(source.definition, aktiv)) throw new Conflict();
      const gewaehlt = abweichung(await rulePackage(tx, campaignId, aktiv), source.definition, input.anfangswerte);
      const id = randomUUID(), at = now();
      await tx.query(`INSERT INTO figurantraege(id,campaign_id,antragsteller,template_id,template_revision,name,anfangswerte,state,created_at)
        VALUES($1,$2,$3,$4,$5,$6,$7,'offen',$8)`, [id, campaignId, userId, source.id, source.head_revision, input.name, JSON.stringify(gewaehlt), at]);
      const ack = antragCard(await antrag(tx, campaignId, id));
      await beleg(tx, campaignId, userId, "figurantrag.beantragen", commandId, request, requestHash, { schemaVersion: 1, anfangswerte: gewaehlt }, ack);
      return ack;
    }).catch(doppelterBefehl);
  }

  /** Zuruecknehmen, Bestaetigen und Ablehnen sind dieselbe Entscheidung mit drei Ausgaengen. */
  async function entscheide(userId: string, campaignId: string, id: string, expectedVersion: number,
    ziel: "zurueckgezogen" | "bestaetigt" | "abgelehnt", reason: string | null): Promise<{ antrag: FigurantragCard; actorId: string | null }> {
    const operation: FigurantragOperation = ziel === "zurueckgezogen" ? "figurantrag.zuruecknehmen"
      : ziel === "bestaetigt" ? "figurantrag.bestaetigen" : "figurantrag.ablehnen";
    pruefe(ziel === "abgelehnt" ? FigurantragAblehnungBody : FigurantragEntscheidungBody,
      ziel === "abgelehnt" ? { expectedVersion, reason } : { expectedVersion });
    const request = { campaignId, operation, id, expectedVersion, reason }, requestHash = hash(request);
    return db.transaction(async tx => {
      const current = await authorize(tx, userId, campaignId, ziel === "zurueckgezogen" ? ["spieler"] : ["leitung"]);
      const before = await antrag(tx, campaignId, id);
      // Ein fremder Antrag existiert fuer einen Spieler nicht; erst danach entscheidet die Version.
      if (ziel === "zurueckgezogen" && before.antragsteller !== current.userId) throw new Gone();
      if (before.state !== "offen" || before.version !== expectedVersion) throw new Conflict();
      const at = now();
      let actorId: string | null = null;
      if (ziel === "bestaetigt") {
        const frei = await freigabe(tx, campaignId, before.template_id);
        if (!frei || frei.revoked_at !== null) throw new Conflict();
        const source = await vorlage(tx, campaignId, before.template_id, before.template_revision);
        const aktiv = await pin(tx, campaignId);
        if (!passendesPaket(source.definition, aktiv)) throw new Conflict();
        // Die Figur entsteht ueber den gewoehnlichen Befehl: dieselbe Pruefung, dasselbe
        // Ereignisbuch. Die Antrags-ID ist seine Befehls-ID, damit ein Wiederholungsversuch
        // dieselbe Figur trifft statt eine zweite zu erschaffen.
        const figur = await createActors(tx, cfg).instantiateActor(userId, campaignId,
          { commandId: before.id, templateId: before.template_id, templateRevision: before.template_revision, name: before.name },
          { createdBy: before.antragsteller, grantTo: before.antragsteller });
        actorId = figur.id;
        // Der Bogen entsteht aus der Vorlagenrevision, darueber die bestaetigten Abweichungen.
        // Ein nicht genanntes Vorlagenfeld bleibt damit stehen, statt auf den Paketstandard
        // zurueckzufallen. Die Version steigt wie bei jedem anderen Schreiber auf diesen Bogen.
        const werte = werteFuerBogen(await rulePackage(tx, campaignId, aktiv), source.definition, before.anfangswerte);
        await tx.query("UPDATE actor_sheets SET fields=$3,version=version+1,updated_at=$4 WHERE actor_id=$1 AND campaign_id=$2",
          [actorId, campaignId, JSON.stringify(werte), at]);
      }
      await tx.query(`UPDATE figurantraege SET state=$3,reason=$4,decided_by=$5,decided_at=$6,actor_id=$7,version=version+1
        WHERE id=$1 AND campaign_id=$2`, [id, campaignId, ziel, ziel === "abgelehnt" ? reason : null, current.userId, at, actorId]);
      const ack = antragCard(await antrag(tx, campaignId, id));
      await beleg(tx, campaignId, userId, operation, randomUUID(), request, requestHash,
        { schemaVersion: 1, before: antragCard(before), after: ack }, ack);
      return { antrag: ack, actorId };
    });
  }

  /**
   * Wer sieht welche Antraege: ein Spieler seine eigenen, die Spielleitung die offenen.
   * Entschiedene Antraege sind erledigt; was aus ihnen wurde, steht in der Figur oder im
   * Ereignisbuch, nicht in der Arbeitsliste.
   */
  async function liste(userId: string, campaignId: string): Promise<FigurantragCard[]> {
    const current = await member(db, userId, campaignId, ["leitung", "spieler"]);
    const rows = current.role === "leitung"
      ? (await db.query<AntragRow>("SELECT * FROM figurantraege WHERE campaign_id=$1 AND state='offen' ORDER BY created_at,id", [campaignId])).rows
      : (await db.query<AntragRow>("SELECT * FROM figurantraege WHERE campaign_id=$1 AND antragsteller=$2 ORDER BY created_at,id", [campaignId, userId])).rows;
    return rows.map(antragCard);
  }

  return {
    freigeben: (u: string, c: string, templateId: string, expectedVersion: number) => schalte(u, c, templateId, expectedVersion, true),
    entziehen: (u: string, c: string, templateId: string, expectedVersion: number) => schalte(u, c, templateId, expectedVersion, false),
    freigegebeneVorlagen,
    beantragen,
    zuruecknehmen: async (u: string, c: string, id: string, expectedVersion: number) =>
      (await entscheide(u, c, id, expectedVersion, "zurueckgezogen", null)).antrag,
    liste,
    bestaetigen: async (u: string, c: string, id: string, expectedVersion: number) => {
      const result = await entscheide(u, c, id, expectedVersion, "bestaetigt", null);
      return { antrag: result.antrag, actorId: result.actorId! };
    },
    ablehnen: async (u: string, c: string, id: string, expectedVersion: number, reason: string) =>
      (await entscheide(u, c, id, expectedVersion, "abgelehnt", reason)).antrag,
  };
}
