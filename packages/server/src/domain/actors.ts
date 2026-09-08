// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { createHash, randomInt, randomUUID } from "node:crypto";
import { Value } from "@sinclair/typebox/value";
import type { Static, TSchema } from "@sinclair/typebox";
import { DEMO_RULE_PACKAGE, parseSupportedRulePackage, stableJson, validatePackageFields, type AnyRulePackage as RulePackage } from "@chronicle/rules";
import { ImportValidationError } from "@chronicle/io";
import * as P from "../../../protocol/src/actors.ts";
import type { Db } from "../db/index.ts";
import type { DomainConfig, Membership } from "./campaigns.ts";
import { createDocuments } from "./documents.ts";
import { Conflict, Gone } from "./errors.ts";

const hash = (value: unknown) => createHash("sha256").update(stableJson(value)).digest("hex");
const timestamp = (value: string | number | null) => value === null ? null : Number(value);
type TemplateKind = "actor" | "item";
type Operation = typeof P.ACTOR_INVENTORY_OPERATIONS[number];
interface ProfileRow {
  id: string; campaign_id: string; name: string; kind: P.ActorCard["kind"]; version: number;
  template_id: string | null; template_revision: number | null; lore_entry_id: string | null; archived_at: string | null;
}
interface ItemRow {
  id: string; campaign_id: string; template_id: string; template_revision: number;
  holder_actor_id: string | null; state: P.ItemState; version: number; archived_at: string | null;
}
interface HeadRow { id: string; campaign_id: string; head_revision: number; version: number; archived_at: string | null }
interface GrantRow { user_id: string; permission: "control"; version: number; granted_by: string | null; granted_at: string | null; revoked_at: string | null }
export class ActorValidationError extends Error { readonly statusCode = 400; }
function parse<T extends TSchema>(schema: T, input: unknown): Static<T> {
  const copy: unknown = JSON.parse(stableJson(input));
  if (!Value.Check(schema, copy)) throw new ActorValidationError("Bitte Figuren- oder Gegenstandsdaten prüfen.");
  return copy;
}
async function member(db: Db, userId: string, campaignId: string): Promise<Membership> {
  const row = (await db.query<Membership>(`SELECT m.campaign_id AS "campaignId",m.user_id AS "userId",m.role,
    m.display_name AS "displayName",m.actor_id AS "actorId",c.universe_id AS "universeId"
    FROM campaign_memberships m JOIN campaigns c ON c.id=m.campaign_id WHERE m.campaign_id=$1 AND m.user_id=$2`, [campaignId, userId])).rows[0];
  if (!row) throw new Gone();
  return row;
}
async function profile(db: Db, campaignId: string, actorId: string): Promise<ProfileRow> {
  const row = (await db.query<ProfileRow>(`SELECT a.id,a.name,p.* FROM actors a JOIN actor_profiles p
    ON p.actor_id=a.id AND p.campaign_id=a.campaign_id WHERE a.id=$1 AND a.campaign_id=$2`, [actorId, campaignId])).rows[0];
  if (!row) throw new Gone();
  return row;
}
async function explicitControl(db: Db, current: Membership, actorId: string): Promise<boolean> {
  return !!(await db.query(`SELECT 1 FROM actor_controllers g JOIN campaign_memberships m
    ON m.campaign_id=g.campaign_id AND m.user_id=g.user_id JOIN actor_profiles p ON p.actor_id=g.actor_id AND p.campaign_id=g.campaign_id
    WHERE g.campaign_id=$1 AND g.actor_id=$2 AND g.user_id=$3 AND g.permission='control' AND g.revoked_at IS NULL
    AND p.archived_at IS NULL AND m.role IN ('leitung','spieler')`, [current.campaignId, actorId, current.userId])).rowCount;
}

/** Shared by commands, sheets, rolls and the renderer; the historical custodian grants nothing. */
export async function authorizeActor(db: Db, viewer: Membership, actorId: string, options: { active?: boolean } = {}): Promise<{ id: string; name: string }> {
  const current = await member(db, viewer.userId, viewer.campaignId), actor = await profile(db, current.campaignId, actorId);
  if (options.active !== false && actor.archived_at !== null) throw new Gone();
  if (current.role === "leitung") return { id: actor.id, name: actor.name };
  if (current.role !== "spieler" || !(await db.query("SELECT 1 FROM actor_controllers WHERE campaign_id=$1 AND actor_id=$2 AND user_id=$3 AND permission='control' AND revoked_at IS NULL", [current.campaignId, actorId, current.userId])).rowCount) throw new Gone();
  return { id: actor.id, name: actor.name };
}
export async function listControlledActorIds(db: Db, viewer: Membership, options: { active?: boolean } = {}): Promise<string[]> {
  const current = await member(db, viewer.userId, viewer.campaignId);
  if (current.role === "beobachter") return [];
  return (await db.query<{ id: string }>(`SELECT p.actor_id AS id FROM actor_profiles p WHERE p.campaign_id=$1
    AND ($4::boolean OR p.archived_at IS NULL) AND ($2::boolean OR EXISTS(SELECT 1 FROM actor_controllers g
      WHERE g.actor_id=p.actor_id AND g.campaign_id=p.campaign_id AND g.user_id=$3 AND g.permission='control' AND g.revoked_at IS NULL))
    ORDER BY p.actor_id COLLATE "C"`, [current.campaignId, current.role === "leitung", current.userId, options.active === false])).rows.map(row => row.id);
}
/** Private correspondence/perspectives require an explicit grant even for the GM. */
export async function authorizeActorPerspective(db: Db, viewer: Membership, actorId: string): Promise<void> {
  if (!await explicitControl(db, viewer, actorId)) throw new Gone();
}

/**
 * Die Spielerprojektion einer Figurvorlage — Name, Art und Anfangswerte, sonst nichts.
 *
 * **Ohne `beute`.** Die Beutetabelle ist Spielleitungswissen: sie verriete vorab, was an einer
 * Figur haengt. Sie wird beim Erschaffen ausgewuerfelt, nicht vorher angekuendigt.
 *
 * **Ohne `loreEntryId`.** Der Verweis zeigt auf einen Wikiartikel, dessen Sichtbarkeit am
 * Wissensblick des Lesers haengt. Die einfachste sichere Regel laesst ihn fuer Spieler IMMER
 * weg — sonst braeuchte jede einzelne Vorlagenkarte eine zweite Wissensabfrage, und ein
 * vergessener Pfad waere ein stiller Hinweis auf einen Artikel, den niemand freigegeben hat.
 * Wer den Artikel kennen darf, findet ihn im Wiki; die Vorlagenkarte ist nicht der Weg dorthin.
 *
 * Auch `package` und `schemaVersion` fallen weg: beides ist Werkstattbuchhaltung, keine Angabe,
 * die bei der Wahl einer Figur hilft.
 */
export function templateForPlayer(id: string, version: number, definition: P.ActorTemplateData):
  { id: string; name: string; art: string; anfangswerte: Record<string, unknown>; version: number } {
  return { id, name: definition.name, art: definition.kind, anfangswerte: { ...definition.fields }, version };
}

export function createActors(db: Db, cfg: DomainConfig = {}) {
  const now = cfg.now ?? Date.now;
  async function knownLore(tx: Db, current: Membership): Promise<ReadonlySet<string> | null> {
    return current.role === "leitung" ? null : (await createDocuments(tx, cfg).knowledge(current.userId, current.campaignId)).bekannteEntryIds ?? new Set<string>();
  }
  function projectActor(card: P.ActorCard, known: ReadonlySet<string> | null): P.ActorCard {
    return known === null ? card : { ...card, version: null, loreEntryId: card.loreEntryId !== null && known.has(card.loreEntryId) ? card.loreEntryId : null };
  }
  function projectItem(card: P.ItemCard, known: ReadonlySet<string> | null): P.ItemCard {
    return known === null || card.definition.loreEntryId === null || known.has(card.definition.loreEntryId) ? card
      : { ...card, definition: { ...card.definition, loreEntryId: null } };
  }
  async function projectResult<T>(tx: Db, current: Membership, operation: Operation, result: T): Promise<T> {
    if (["actor.instantiate", "actor.update", "actor.archive"].includes(operation))
      return projectActor(result as P.ActorCard, await knownLore(tx, current)) as T;
    if (["item.instantiate", "item.update", "item.transfer", "item.archive"].includes(operation))
      return projectItem(result as P.ItemCard, await knownLore(tx, current)) as T;
    return result;
  }
  async function authorize(tx: Db, userId: string, campaignId: string, gm = false) {
    if (!(await tx.query(`SELECT c.id FROM campaigns c JOIN campaign_memberships m ON m.campaign_id=c.id
      WHERE c.id=$1 AND m.user_id=$2 FOR UPDATE OF c FOR SHARE OF m`, [campaignId, userId])).rowCount) throw new Gone();
    const current = await member(tx, userId, campaignId);
    if (gm && current.role !== "leitung") throw new Gone();
    return current;
  }
  async function command<T>(userId: string, campaignId: string, operation: Operation, subjectId: string | null,
    input: { commandId: string; reason?: string; [key: string]: unknown }, gm: boolean,
    work: (tx: Db, current: Membership) => Promise<{ subjectId: string; before: unknown; after: unknown; result: T }>,
    check?: (tx: Db, current: Membership) => Promise<void>): Promise<T> {
    return db.transaction(async tx => {
      const current = await authorize(tx, userId, campaignId, gm);
      await check?.(tx, current);
      const request = { campaignId, operation, subjectId, input }, requestHash = hash(request);
      const old = (await tx.query<{ campaign_id: string; request_hash: string; result: T }>("SELECT campaign_id,request_hash,result FROM actor_inventory_events WHERE actor_user_id=$1 AND command_id=$2", [userId, input.commandId])).rows[0];
      if (old) { if (old.campaign_id !== campaignId || old.request_hash !== requestHash) throw new Conflict(); return projectResult(tx, current, operation, old.result); }
      const outcome = await work(tx, current);
      await tx.query(`INSERT INTO actor_inventory_events(id,campaign_id,actor_user_id,operation,subject_id,command_id,request,request_hash,before_state,after_state,result,reason,created_at)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`, [randomUUID(), campaignId, userId, operation, outcome.subjectId, input.commandId, JSON.stringify(request), requestHash,
        outcome.before === null ? null : JSON.stringify(outcome.before), outcome.after === null ? null : JSON.stringify(outcome.after), JSON.stringify(outcome.result), input.reason ?? null, now()]);
      // Durable receipts remain canonical; every delivery, including a retry, uses today's reader knowledge.
      return projectResult(tx, current, operation, outcome.result);
    }).catch((error: unknown) => {
      // Campaign locks are independent, while a user's durable command identity is global.
      const failure = error as { code?: string; constraint?: string };
      if (failure?.code === "23505" && failure.constraint === "actor_inventory_events_actor_user_id_command_id_key") throw new Conflict();
      throw error;
    });
  }
  async function lore(tx: Db, campaignId: string, entryId: string | null) {
    if (entryId !== null && !(await tx.query("SELECT 1 FROM entries WHERE id=$1 AND campaign_id=$2", [entryId, campaignId])).rowCount) throw new Gone();
  }
  /**
   * Das Kartengesicht muss ein Bild sein, das es GIBT — und das eine Datei hat.
   *
   * Eine Vorlagenrevision ist unveraenderlich und inhaltsgehasht. Ein Bildverweis, der ins Leere
   * zeigt, waere damit ein dauerhaftes Versprechen auf ein Bild, das niemand mehr einloesen kann:
   * die Karte zeigt bis in alle Ewigkeit den Platzhalter, und korrigieren laesst sich das nur
   * durch eine neue Revision. Deshalb wird hier gefragt, bevor geschrieben wird.
   *
   * Zwei getrennte Antworten, weil es zwei getrennte Abhilfen sind: ein Bild, das diese Kampagne
   * gar nicht kennt, ist schlicht nicht da (404, wie jeder unbekannte Verweis). Ein Bild, dessen
   * Zeile steht, dem aber die Bytes fehlen, ist ein Bild in Arbeit — und wer es waehlt, soll
   * lesen, dass er es erst holen oder hochladen muss.
   */
  async function kartenbild(tx: Db, campaignId: string, assetId: string) {
    const row = (await tx.query<{ mime: string | null }>(
      "SELECT mime FROM wiki_assets WHERE id=$1 AND campaign_id=$2", [assetId, campaignId])).rows[0];
    if (!row) throw new Gone("kartenbild");
    if (row.mime === null) throw new ImportValidationError("bildAssetId", "the chosen picture has no file yet: fetch or upload it before putting it on a card");
  }
  async function rulePackage(tx: Db, campaignId: string, pin: { id: string; version: string }): Promise<RulePackage> {
    const row = (await tx.query<{ document: unknown; content_hash: string }>("SELECT document,content_hash FROM rule_packages WHERE campaign_id=$1 AND package_id=$2 AND version=$3", [campaignId, pin.id, pin.version])).rows[0];
    if (row) { if (hash(row.document) !== row.content_hash) throw new Gone(); return parseSupportedRulePackage(row.document); }
    if (pin.id === DEMO_RULE_PACKAGE.id && pin.version === DEMO_RULE_PACKAGE.version) return DEMO_RULE_PACKAGE;
    throw new Gone();
  }
  async function installDemo(tx: Db, campaignId: string, userId: string, pkg: RulePackage) {
    await tx.query(`INSERT INTO rule_packages(campaign_id,package_id,version,document,content_hash,installed_by,installed_at)
      VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING`, [campaignId, pkg.id, pkg.version, JSON.stringify(pkg), hash(pkg), userId, now()]);
  }
  async function definition(tx: Db, current: Membership, kind: TemplateKind, value: P.ActorTemplateData | P.ItemContract) {
    await lore(tx, current.campaignId, value.loreEntryId);
    if (kind === "item") {
      const item = value as P.ItemContract;
      if (item.schemaVersion === 2 && item.bildAssetId !== null) await kartenbild(tx, current.campaignId, item.bildAssetId);
      return item;
    }
    const actor = value as P.ActorTemplateData, pkg = await rulePackage(tx, current.campaignId, actor.package);
    // The native bundle requires valid, pinned references and an ordered range. Check these
    // before storing immutable revisions, even when a one-percent drop never gets rolled.
    if (actor.schemaVersion === 2) for (const drop of actor.beute) {
      if (drop.menge[0] > drop.menge[1]) throw new ActorValidationError("Die kleinste Beutemenge darf die groesste nicht uebersteigen.");
      await template<P.ItemContract>(tx, current.campaignId, "item", drop.templateId, drop.templateRevision);
    }
    const resolved = { ...actor, fields: { ...validatePackageFields(pkg, actor.fields) } };
    await installDemo(tx, current.campaignId, current.userId, pkg);
    return resolved;
  }
  async function head(tx: Db, campaignId: string, kind: TemplateKind, id: string): Promise<HeadRow> {
    const row = (await tx.query<HeadRow>(`SELECT * FROM ${kind}_templates WHERE id=$1 AND campaign_id=$2`, [id, campaignId])).rows[0];
    if (!row) throw new Gone();
    return row;
  }
  async function template<T>(tx: Db, campaignId: string, kind: TemplateKind, id: string, revision?: number): Promise<P.TemplateCard<T>> {
    const h = await head(tx, campaignId, kind, id), selected = revision ?? h.head_revision;
    const row = (await tx.query<{ definition: T; content_hash: string }>(`SELECT definition,content_hash FROM ${kind}_template_revisions WHERE template_id=$1 AND campaign_id=$2 AND revision=$3`, [id, campaignId, selected])).rows[0];
    if (!row || hash(row.definition) !== row.content_hash) throw new Gone();
    return { id, revision: selected, version: h.version, archivedAt: timestamp(h.archived_at), definition: row.definition, contentHash: row.content_hash };
  }
  /**
   * Der Stand der Spielerfreigabe an einer Figurvorlage — nur fuer die Spielleitung.
   *
   * Er haengt hier und nicht am Antragsmodul, weil die Karte ohne ihn unvollstaendig ist: der
   * Schalter, der die Freigabe umlegt, braucht deren eigene Version. Fehlt sie, raet er, und nach
   * einem Entzug mit erneuter Freigabe ist die geratene Zahl dauerhaft falsch.
   *
   * Der Beleg im Ereignisbuch bleibt davon unberuehrt: `command()` schreibt weiterhin die reine
   * Vorlagenkarte, und dieses Feld kommt erst danach an die ausgelieferte Antwort. Eine
   * unveraenderliche Quittung soll keinen Zustand tragen, der sich spaeter aendert.
   */
  async function freigabestand(campaignId: string, templateId: string) {
    const row = (await db.query<{ version: number; revoked_at: string | null }>(
      "SELECT version,revoked_at FROM figurvorlagen_freigaben WHERE template_id=$1 AND campaign_id=$2", [templateId, campaignId])).rows[0];
    return row ? { frei: row.revoked_at === null, version: row.version } : null;
  }
  async function mitFreigabe<T>(campaignId: string, kind: TemplateKind, card: P.TemplateCard<T>): Promise<P.TemplateCard<T>> {
    return kind === "item" ? card : { ...card, freigabe: await freigabestand(campaignId, card.id) };
  }
  async function listTemplates<T>(userId: string, campaignId: string, kind: TemplateKind) {
    if ((await member(db, userId, campaignId)).role !== "leitung") throw new Gone();
    const ids = (await db.query<{ id: string }>(`SELECT id FROM ${kind}_templates WHERE campaign_id=$1 AND archived_at IS NULL ORDER BY created_at,id`, [campaignId])).rows;
    const cards: P.TemplateCard<T>[] = [];
    for (const row of ids) cards.push(await mitFreigabe(campaignId, kind, await template<T>(db, campaignId, kind, row.id)));
    return cards;
  }
  async function getTemplate<T>(userId: string, campaignId: string, kind: TemplateKind, id: string, revision?: number) {
    if ((await member(db, userId, campaignId)).role !== "leitung") throw new Gone();
    return mitFreigabe(campaignId, kind, await template<T>(db, campaignId, kind, id, revision));
  }
  async function saveTemplate<T extends P.ActorTemplateData | P.ItemContract>(userId: string, campaignId: string, kind: TemplateKind,
    input: { commandId: string; definition: T; expectedVersion?: number; reason?: string }, id?: string): Promise<P.TemplateCard<T>> {
    return mitFreigabe(campaignId, kind, await command<P.TemplateCard<T>>(userId, campaignId, `${kind}.template.${id ? "revise" : "create"}`, id ?? null, input, true, async (tx, current) => {
      const value = await definition(tx, current, kind, input.definition), before = id ? await template<T>(tx, campaignId, kind, id) : null;
      if (before && (before.archivedAt !== null || before.version !== input.expectedVersion)) throw new Conflict();
      const targetId = id ?? randomUUID(), nextRevision = before ? before.revision + 1 : 1;
      if (!before) await tx.query(`INSERT INTO ${kind}_templates(id,campaign_id,created_by,created_at) VALUES($1,$2,$3,$4)`, [targetId, campaignId, userId, now()]);
      await tx.query(`INSERT INTO ${kind}_template_revisions(template_id,campaign_id,revision,definition,content_hash,created_by,created_at) VALUES($1,$2,$3,$4,$5,$6,$7)`, [targetId, campaignId, nextRevision, JSON.stringify(value), hash(value), userId, now()]);
      if (before) await tx.query(`UPDATE ${kind}_templates SET head_revision=$3,version=version+1 WHERE id=$1 AND campaign_id=$2`, [targetId, campaignId, nextRevision]);
      const after = await template<T>(tx, campaignId, kind, targetId);
      return { subjectId: targetId, before, after, result: after };
    }));
  }
  async function archiveTemplate<T>(userId: string, campaignId: string, kind: TemplateKind, id: string, raw: unknown) {
    const input = parse(P.ArchiveObject, raw);
    return mitFreigabe(campaignId, kind, await command<P.TemplateCard<T>>(userId, campaignId, `${kind}.template.archive`, id, input, true, async tx => {
      const before = await template<T>(tx, campaignId, kind, id);
      if (before.version !== input.expectedVersion || before.archivedAt !== null) throw new Conflict();
      await tx.query(`UPDATE ${kind}_templates SET archived_at=$3,version=version+1 WHERE id=$1 AND campaign_id=$2`, [id, campaignId, now()]);
      const after = await template<T>(tx, campaignId, kind, id);
      return { subjectId: id, before, after, result: after };
    }));
  }
  async function actorCard(tx: Db, current: Membership, actorId: string): Promise<P.ActorCard> {
    const actor = await profile(tx, current.campaignId, actorId);
    return { id: actor.id, campaignId: actor.campaign_id, name: actor.name, kind: actor.kind, version: actor.version,
      archivedAt: timestamp(actor.archived_at), loreEntryId: actor.lore_entry_id,
      template: actor.template_id === null ? null : { id: actor.template_id, revision: actor.template_revision! },
      canControl: actor.archived_at === null, canReadAs: await explicitControl(tx, current, actorId) };
  }
  async function listActors(userId: string, campaignId: string): Promise<P.ActorCard[]> {
    const current = await member(db, userId, campaignId), ids = await listControlledActorIds(db, current);
    const known = await knownLore(db, current), cards: P.ActorCard[] = [];
    for (const id of ids) cards.push(projectActor(await actorCard(db, current, id), known));
    return cards;
  }
  async function getActor(userId: string, campaignId: string, actorId: string): Promise<P.ActorCard> {
    const current = await member(db, userId, campaignId);
    await authorizeActor(db, current, actorId, { active: false });
    return projectActor(await actorCard(db, current, actorId), await knownLore(db, current));
  }
/**
 * Die Beute einer Figurvorlage auswürfeln — beim Erschaffen, in derselben Transaktion.
 *
 * **Jede Zeile wird einzeln entschieden.** Eine Beutetabelle ist keine Auswahl von einem aus
 * vielen, sondern eine Liste von Möglichkeiten: der Wolf trägt vielleicht das Fell und vielleicht
 * den Zahn, unabhängig voneinander.
 *
 * **Die Gegenstände sind ihr eigener Beleg.** Sie in die Nutzlast des `actor.instantiate`-Ereignisses
 * zu schreiben käme nicht in Frage: deren Feldliste ist im eingefrorenen v1-Profil festgelegt, und
 * ein zusätzliches Feld dort bricht jeden Export — das ist in dieser Sitzung schon einmal passiert.
 * Ein eigener `item.instantiate`-Befehl je Stück wäre der andere Weg und ginge auch nicht: er
 * öffnete eine zweite Transaktion auf derselben Verbindung und wartete damit auf sich selbst.
 */
async function wuerfleBeute(tx: Db, campaignId: string, userId: string, actorId: string,
  definition: P.ActorTemplateData, at: number): Promise<void> {
  if (definition.schemaVersion !== 2 || !definition.beute.length) return;
  for (const zeile of definition.beute) {
    if (zufallsProzent() > zeile.wahrscheinlichkeit) continue;
    const [von, bis] = zeile.menge;
    const menge = von + Math.floor(zufall() * (bis - von + 1));
    await tx.query(`INSERT INTO item_instances(id,campaign_id,template_id,template_revision,holder_actor_id,state,created_by,created_at)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,
      [randomUUID(), campaignId, zeile.templateId, zeile.templateRevision, actorId,
        JSON.stringify({ quantity: menge, notes: "", equipped: false }), userId, at]);
  }
}
/** Gleichverteilt in [0,1). Aus `crypto`, damit die Beute nicht an einem schwachen Zufall haengt. */
const zufall = (): number => randomInt(0, 2 ** 30) / 2 ** 30;
/** 1..100 — dieselbe Skala wie die Wahrscheinlichkeit, damit der Vergleich keine Umrechnung braucht. */
const zufallsProzent = (): number => randomInt(1, 101);

  /**
   * Eine Figur erschaffen.
   *
   * `origin` ist der einzige Unterschied zwischen „die Spielleitung legt eine Figur an" und
   * „die Spielleitung bestaetigt den Antrag eines Spielers": die Figur gehoert dann dem
   * Antragsteller (`createdBy`) und die Kontrolle geht an ihn (`grantTo`), waehrend der Befehl
   * weiterhin der Spielleitung gehoert — sie hat ihn ausgeloest, sie steht im Ereignisbuch.
   * Ohne `origin` verhaelt sich alles wie zuvor: beides ist die aufrufende Person.
   */
  async function instantiateActor(userId: string, campaignId: string, raw: unknown,
    origin: { createdBy?: string; grantTo?: string } = {}): Promise<P.ActorCard> {
    const input = parse(P.ActorInstantiate, raw);
    const owner = origin.createdBy ?? userId, controller = origin.grantTo ?? userId;
    return command(userId, campaignId, "actor.instantiate", null, input, true, async (tx, current) => {
      const source = await template<P.ActorTemplateData>(tx, campaignId, "actor", input.templateId, input.templateRevision);
      if (source.archivedAt !== null) throw new Gone();
      const pin = (await tx.query<{ package_id: string; package_version: string }>("SELECT package_id,package_version FROM campaign_rule_pins WHERE campaign_id=$1", [campaignId])).rows[0];
      if (source.definition.package.id !== (pin?.package_id ?? DEMO_RULE_PACKAGE.id) || source.definition.package.version !== (pin?.package_version ?? DEMO_RULE_PACKAGE.version)) throw new Conflict();
      const pkg = await rulePackage(tx, campaignId, source.definition.package), fields = validatePackageFields(pkg, source.definition.fields);
      await installDemo(tx, campaignId, userId, pkg);
      const id = randomUUID(), at = now();
      await tx.query("INSERT INTO actors(id,campaign_id,user_id,name) VALUES($1,$2,$3,$4)", [id, campaignId, owner, input.name ?? source.definition.name]);
      await tx.query(`INSERT INTO actor_profiles(actor_id,campaign_id,kind,template_id,template_revision,lore_entry_id,created_by,created_at)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8)`, [id, campaignId, source.definition.kind, input.templateId, input.templateRevision, source.definition.loreEntryId, owner, at]);
      await tx.query("INSERT INTO actor_controllers(actor_id,campaign_id,user_id,granted_by,granted_at) VALUES($1,$2,$3,$4,$5)", [id, campaignId, controller, userId, at]);
      await tx.query("INSERT INTO actor_sheets(actor_id,campaign_id,package_id,package_version,fields,updated_at) VALUES($1,$2,$3,$4,$5,$6)", [id, campaignId, pkg.id, pkg.version, JSON.stringify(fields), at]);
      await wuerfleBeute(tx, campaignId, userId, id, source.definition, at);
      const after = await actorCard(tx, current, id);
      return { subjectId: id, before: null, after, result: after };
    });
  }
  async function updateActor(userId: string, campaignId: string, actorId: string, raw: unknown): Promise<P.ActorCard> {
    const input = parse(P.ActorProfileUpdate, raw);
    return command(userId, campaignId, "actor.update", actorId, input, true, async (tx, current) => {
      const before = await actorCard(tx, current, actorId);
      if (before.version !== input.expectedVersion || before.archivedAt !== null) throw new Conflict();
      await lore(tx, campaignId, input.loreEntryId);
      await tx.query("UPDATE actors SET name=$3 WHERE id=$1 AND campaign_id=$2", [actorId, campaignId, input.name]);
      await tx.query("UPDATE actor_profiles SET kind=$3,lore_entry_id=$4,version=version+1 WHERE actor_id=$1 AND campaign_id=$2", [actorId, campaignId, input.kind, input.loreEntryId]);
      const after = await actorCard(tx, current, actorId);
      return { subjectId: actorId, before, after, result: after };
    });
  }
  async function archiveActor(userId: string, campaignId: string, actorId: string, raw: unknown): Promise<P.ActorCard> {
    const input = parse(P.ArchiveObject, raw);
    return command(userId, campaignId, "actor.archive", actorId, input, true, async (tx, current) => {
      const before = await actorCard(tx, current, actorId);
      if (before.version !== input.expectedVersion || before.archivedAt !== null) throw new Conflict();
      await tx.query("UPDATE actor_profiles SET archived_at=$3,version=version+1 WHERE actor_id=$1 AND campaign_id=$2", [actorId, campaignId, now()]);
      const after = await actorCard(tx, current, actorId);
      return { subjectId: actorId, before, after, result: after };
    });
  }
  const grantCard = (row: GrantRow): P.ControllerCard => ({ userId: row.user_id, permission: row.permission, version: row.version,
    grantedBy: row.granted_by, grantedAt: timestamp(row.granted_at), revokedAt: timestamp(row.revoked_at) });
  async function listControllers(userId: string, campaignId: string, actorId: string): Promise<P.ControllerCard[]> {
    if ((await member(db, userId, campaignId)).role !== "leitung") throw new Gone();
    await profile(db, campaignId, actorId);
    return (await db.query<GrantRow>("SELECT * FROM actor_controllers WHERE actor_id=$1 AND campaign_id=$2 ORDER BY user_id COLLATE \"C\"", [actorId, campaignId])).rows.map(grantCard);
  }
  async function changeController(userId: string, campaignId: string, actorId: string, targetUserId: string, raw: unknown, revoke: boolean): Promise<P.ControllerCard> {
    const input = parse(revoke ? P.ActorControllerRevoke : P.ActorControllerGrant, raw);
    return command(userId, campaignId, revoke ? "actor.controller.revoke" : "actor.controller.grant", actorId, { ...input, targetUserId }, true, async tx => {
      if ((await profile(tx, campaignId, actorId)).archived_at !== null) throw new Gone();
      const target = await member(tx, targetUserId, campaignId); if (!revoke && target.role === "beobachter") throw new Gone();
      const old = (await tx.query<GrantRow>("SELECT * FROM actor_controllers WHERE actor_id=$1 AND campaign_id=$2 AND user_id=$3", [actorId, campaignId, targetUserId])).rows[0];
      if ((old?.version ?? 0) !== input.expectedVersion || (revoke && !old)) throw new Conflict();
      if (revoke) await tx.query("UPDATE actor_controllers SET revoked_at=$4,version=version+1 WHERE actor_id=$1 AND campaign_id=$2 AND user_id=$3", [actorId, campaignId, targetUserId, now()]);
      else await tx.query(`INSERT INTO actor_controllers(actor_id,campaign_id,user_id,granted_by,granted_at) VALUES($1,$2,$3,$4,$5)
        ON CONFLICT(actor_id,user_id) DO UPDATE SET granted_by=EXCLUDED.granted_by,granted_at=EXCLUDED.granted_at,revoked_at=NULL,version=actor_controllers.version+1`, [actorId, campaignId, targetUserId, userId, now()]);
      const after = grantCard((await tx.query<GrantRow>("SELECT * FROM actor_controllers WHERE actor_id=$1 AND campaign_id=$2 AND user_id=$3", [actorId, campaignId, targetUserId])).rows[0]!);
      return { subjectId: actorId, before: old ? grantCard(old) : null, after, result: after };
    });
  }
  async function perspective(tx: Db, current: Membership): Promise<P.ReaderPerspective> {
    const row = (await tx.query<{ actor_id: string | null; version: number }>("SELECT actor_id,version FROM reader_perspectives WHERE campaign_id=$1 AND user_id=$2", [current.campaignId, current.userId])).rows[0];
    const actorId = row?.actor_id && await explicitControl(tx, current, row.actor_id) ? row.actor_id : null;
    return { actorId, version: row?.version ?? 0 };
  }
  async function getReaderPerspective(userId: string, campaignId: string) { return perspective(db, await member(db, userId, campaignId)); }
  async function setReaderPerspective(userId: string, campaignId: string, raw: unknown): Promise<P.ReaderPerspective> {
    const input = parse(P.ReaderPerspectiveUpdate, raw);
    return command(userId, campaignId, "reader.perspective", userId, input, false, async (tx, current) => {
      const before = await perspective(tx, current); if (before.version !== input.expectedVersion) throw new Conflict();
      await tx.query(`INSERT INTO reader_perspectives(campaign_id,user_id,actor_id,updated_at) VALUES($1,$2,$3,$4)
        ON CONFLICT(campaign_id,user_id) DO UPDATE SET actor_id=EXCLUDED.actor_id,updated_at=EXCLUDED.updated_at,version=reader_perspectives.version+1`, [campaignId, userId, input.actorId, now()]);
      const after = await perspective(tx, current);
      return { subjectId: userId, before, after, result: after };
    }, async (tx, current) => { if (input.actorId !== null) await authorizeActorPerspective(tx, current, input.actorId); });
  }
  async function itemRow(tx: Db, campaignId: string, id: string): Promise<ItemRow> {
    const row = (await tx.query<ItemRow>("SELECT * FROM item_instances WHERE id=$1 AND campaign_id=$2", [id, campaignId])).rows[0];
    if (!row) throw new Gone(); return row;
  }
  async function itemAccess(tx: Db, current: Membership, id: string, active = true): Promise<ItemRow> {
    const item = await itemRow(tx, current.campaignId, id);
    if (active && item.archived_at !== null) throw new Gone();
    if (item.holder_actor_id !== null) await authorizeActor(tx, current, item.holder_actor_id, { active });
    else if (current.role !== "leitung") throw new Gone();
    return item;
  }
  async function itemCard(tx: Db, campaignId: string, item: ItemRow): Promise<P.ItemCard> {
    const source = await template<P.ItemContract>(tx, campaignId, "item", item.template_id, item.template_revision);
    return { id: item.id, version: item.version, holderActorId: item.holder_actor_id, archivedAt: timestamp(item.archived_at),
      template: { id: item.template_id, revision: item.template_revision }, definition: source.definition, state: item.state };
  }
  async function listItems(userId: string, campaignId: string, actorId?: string): Promise<P.ItemCard[]> {
    const current = await member(db, userId, campaignId);
    if (actorId !== undefined) await authorizeActor(db, current, actorId);
    else if (current.role !== "leitung") throw new Gone();
    const rows = (await db.query<ItemRow>(`SELECT * FROM item_instances WHERE campaign_id=$1 AND archived_at IS NULL
      AND ($2::text IS NULL OR holder_actor_id=$2) ORDER BY created_at,id`, [campaignId, actorId ?? null])).rows;
    const known = await knownLore(db, current), cards: P.ItemCard[] = [];
    for (const row of rows) cards.push(projectItem(await itemCard(db, campaignId, row), known));
    return cards;
  }
  async function getItem(userId: string, campaignId: string, id: string): Promise<P.ItemCard> {
    const current = await member(db, userId, campaignId);
    return projectItem(await itemCard(db, campaignId, await itemAccess(db, current, id, false)), await knownLore(db, current));
  }
  async function instantiateItem(userId: string, campaignId: string, raw: unknown): Promise<P.ItemCard> {
    const input = parse(P.ItemInstantiate, raw);
    return command(userId, campaignId, "item.instantiate", null, input, true, async (tx, current) => {
      const source = await template<P.ItemContract>(tx, campaignId, "item", input.templateId, input.templateRevision);
      if (source.archivedAt !== null) throw new Gone();
      if (input.holderActorId !== null) await authorizeActor(tx, current, input.holderActorId);
      const id = randomUUID(), state: P.ItemState = input.state ?? { quantity: 1, notes: "", equipped: false };
      await tx.query(`INSERT INTO item_instances(id,campaign_id,template_id,template_revision,holder_actor_id,state,created_by,created_at)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8)`, [id, campaignId, input.templateId, input.templateRevision, input.holderActorId, JSON.stringify(state), userId, now()]);
      const after = await itemCard(tx, campaignId, await itemRow(tx, campaignId, id));
      return { subjectId: id, before: null, after, result: after };
    });
  }
  async function updateItem(userId: string, campaignId: string, id: string, raw: unknown): Promise<P.ItemCard> {
    const input = parse(P.ItemUpdate, raw);
    return command(userId, campaignId, "item.update", id, input, false, async (tx, current) => {
      const row = await itemAccess(tx, current, id), before = await itemCard(tx, campaignId, row);
      if (row.version !== input.expectedVersion) throw new Conflict();
      await tx.query("UPDATE item_instances SET state=$3,version=version+1 WHERE id=$1 AND campaign_id=$2", [id, campaignId, JSON.stringify(input.state)]);
      const after = await itemCard(tx, campaignId, await itemRow(tx, campaignId, id));
      return { subjectId: id, before, after, result: after };
    }, async (tx, current) => { await itemAccess(tx, current, id, false); });
  }
  async function transferItem(userId: string, campaignId: string, id: string, raw: unknown): Promise<P.ItemCard> {
    const input = parse(P.ItemCustodyChange, raw);
    // Issuance/custody is an explicit GM action; controlling an actor does not grant another inventory.
    return command(userId, campaignId, "item.transfer", id, input, true, async (tx, current) => {
      const row = await itemAccess(tx, current, id, false), before = await itemCard(tx, campaignId, row);
      if (row.version !== input.expectedVersion || row.archived_at !== null) throw new Conflict();
      if (input.holderActorId !== null) await authorizeActor(tx, current, input.holderActorId);
      await tx.query("UPDATE item_instances SET holder_actor_id=$3,version=version+1 WHERE id=$1 AND campaign_id=$2", [id, campaignId, input.holderActorId]);
      const after = await itemCard(tx, campaignId, await itemRow(tx, campaignId, id));
      return { subjectId: id, before, after, result: after };
    });
  }
  async function archiveItem(userId: string, campaignId: string, id: string, raw: unknown): Promise<P.ItemCard> {
    const input = parse(P.ArchiveObject, raw);
    return command(userId, campaignId, "item.archive", id, input, true, async (tx, current) => {
      const row = await itemAccess(tx, current, id), before = await itemCard(tx, campaignId, row);
      if (row.version !== input.expectedVersion) throw new Conflict();
      await tx.query("UPDATE item_instances SET archived_at=$3,version=version+1 WHERE id=$1 AND campaign_id=$2", [id, campaignId, now()]);
      const after = await itemCard(tx, campaignId, await itemRow(tx, campaignId, id));
      return { subjectId: id, before, after, result: after };
    });
  }
  return {
    listActors, getActor, instantiateActor, updateActor, archiveActor, listControllers,
    grantController: (u: string, c: string, a: string, target: string, input: unknown) => changeController(u, c, a, target, input, false),
    revokeController: (u: string, c: string, a: string, target: string, input: unknown) => changeController(u, c, a, target, input, true),
    getReaderPerspective, setReaderPerspective, listItems, getItem, instantiateItem, updateItem, transferItem, archiveItem,
    listActorTemplates: (u: string, c: string) => listTemplates<P.ActorTemplateData>(u, c, "actor"),
    getActorTemplate: (u: string, c: string, id: string, revision?: number) => getTemplate<P.ActorTemplateData>(u, c, "actor", id, revision),
    createActorTemplate: (u: string, c: string, raw: unknown) => saveTemplate(u, c, "actor", parse(P.ActorTemplateCreate, raw)),
    reviseActorTemplate: (u: string, c: string, id: string, raw: unknown) => saveTemplate(u, c, "actor", parse(P.ActorTemplateRevise, raw), id),
    archiveActorTemplate: (u: string, c: string, id: string, raw: unknown) => archiveTemplate<P.ActorTemplateData>(u, c, "actor", id, raw),
    listItemTemplates: (u: string, c: string) => listTemplates<P.ItemContract>(u, c, "item"),
    getItemTemplate: (u: string, c: string, id: string, revision?: number) => getTemplate<P.ItemContract>(u, c, "item", id, revision),
    createItemTemplate: (u: string, c: string, raw: unknown) => saveTemplate(u, c, "item", parse(P.ItemTemplateCreate, raw)),
    reviseItemTemplate: (u: string, c: string, id: string, raw: unknown) => saveTemplate(u, c, "item", parse(P.ItemTemplateRevise, raw), id),
    archiveItemTemplate: (u: string, c: string, id: string, raw: unknown) => archiveTemplate<P.ItemContract>(u, c, "item", id, raw),
  };
}
