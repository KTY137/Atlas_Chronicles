import { randomBytes, randomUUID, createHash } from "node:crypto";
import { resolvePassage, type LineageEvent, type Praegung, type Quelle } from "@chronicle/chronik";
import { trustPassageId } from "@chronicle/core";
import { DEMO_RULE_PACKAGE, RulePackageRegistry, defaultActorFields, evaluateAction, parseRulePackage, previewPackageMigration, replayAction, stableJson, validateEntityFields,
  type ActionResult, type EvaluationContext, type Experience, type PackagePin, type ProjectedKnowledge, type RulePackage, type Scalar } from "@chronicle/rules";
import type { Db } from "../db/index.ts";
import { createCampaigns, type DomainConfig, type Membership } from "./campaigns.ts";
import { createDocuments } from "./documents.ts";
import { Conflict, Gone } from "./errors.ts";

export interface GameplayConfig extends DomainConfig { /** Test-only entropy injection; never accepted from an HTTP request. */ seed?: () => string }
export interface ActorSheet { actorId: string; packageId: string; packageVersion: string; fields: Readonly<Record<string, Scalar>>; version: number; defeatPending: boolean; defeatedAt: number | null }
export interface PrepareActionInput {
  commandId: string; actorId: string; packageId?: string; packageVersion?: string; actionId: string;
  input?: Readonly<Record<string, Scalar>>; targetPassageId?: string; fictionDate?: string;
}
export interface IssueVollmachtInput {
  commandId: string; actorId: string; passageId: string; actionId: string; packageId?: string; packageVersion?: string;
  input?: Readonly<Record<string, Scalar>>; threshold: number; expiresAt: number; repeatable?: boolean;
  budgetKind: "player" | "floating"; fictionDate: string;
}
export interface MintInput { commandId: string; passageId: string; fictionDate: string; actorIds?: readonly string[]; expectedPassageHash?: string }
export interface MintReceipt { id: string; kind: Praegung["art"]; passageId: string; revisionId: string; provenance: Record<string, unknown>; seal: string; confirmedAt: number }
export interface ActionConfirmation { rollId: string; success: boolean; mint: MintReceipt | null; confirmedAt: number; seal: string }
export interface ActionCard { id: string; actorId: string; status: "ausstehend" | "bestaetigt" | "verworfen"; receipt: ActionResult; receiptHash: string; preparedAt: number; fictionDate: string; vollmachtId: string | null; confirmation: ActionConfirmation | null }
export interface SceneCard { id: string; name: string; entryIds: string[]; fictionDate: string; status: string; version: number }
interface RollRow { id: string; campaign_id: string; actor_id: string; prepared_by: string; command_id: string; request_hash: string; package_id: string; package_version: string; action_id: string; receipt: ActionResult; receipt_hash: string; target_passage_id: string | null; target_passage_hash: string | null; vollmacht_id: string | null; fiction_date: string; prepared_at: string; confirmed_at: string | null; status: ActionCard["status"]; confirmation: ActionConfirmation | null; scene_id: string | null; session_id: string | null }
interface VollmachtRow { id: string; campaign_id: string; actor_id: string; passage_id: string; passage_hash: string; package_id: string; package_version: string; action_id: string; threshold: number; fixed_input: Record<string, Scalar>; fiction_date: string; issued_by: string; issued_at: string; expires_at: string; repeatable: boolean; budget_kind: string; status: string; consumed_roll_id: string | null; revoked_at: string | null; request_hash: string; command_id: string }
const WEEK = 7 * 86400_000;
const digest = (value: unknown): string => createHash("sha256").update(stableJson(value)).digest("hex");
const text = (value: unknown, max = 128): string => { if (typeof value !== "string" || !value.trim() || value.length > max) throw new Gone("invalid-input"); return value; };
const number = (value: unknown): number => { if (typeof value !== "number" || !Number.isFinite(value) || Math.abs(value) > 1e12) throw new Gone("invalid-number"); return value; };
const card = (r: RollRow): ActionCard => ({ id: r.id, actorId: r.actor_id, status: r.status, receipt: r.receipt, receiptHash: r.receipt_hash, preparedAt: Number(r.prepared_at), fictionDate: r.fiction_date, vollmachtId: r.vollmacht_id, confirmation: r.confirmation });

export function createGameplay(db: Db, cfg: GameplayConfig = {}) {
  const now = cfg.now ?? Date.now; const seed = cfg.seed ?? (() => randomBytes(16).toString("hex"));
  const campaigns = createCampaigns(db, cfg);

  async function authorize(tx: Db, userId: string, campaignId: string, gm = false): Promise<Membership> {
    // Serialize gameplay commands and weekly-cap checks. Holding membership through commit
    // also prevents a concurrent membership deletion from racing an authorised mutation.
    const rows = await tx.query(`SELECT c.id FROM campaigns c JOIN campaign_memberships m ON m.campaign_id=c.id
      WHERE c.id=$1 AND m.user_id=$2 FOR UPDATE OF c FOR SHARE OF m`, [campaignId, userId]);
    if (!rows.rowCount) throw new Gone();
    return createCampaigns(tx, cfg).requireMember(userId, campaignId, gm ? ["leitung"] : undefined);
  }
  async function controller(tx: Db, member: Membership, actorId: string): Promise<{ name: string }> {
    const actor = (await tx.query<{ name: string; user_id: string }>("SELECT name,user_id FROM actors WHERE id=$1 AND campaign_id=$2", [actorId, member.campaignId])).rows[0];
    if (!actor || (member.role !== "leitung" && (member.role !== "spieler" || member.actorId !== actorId || actor.user_id !== member.userId))) throw new Gone();
    return actor;
  }
  async function audit(tx: Db, campaignId: string, userId: string, kind: string, data: unknown) {
    await tx.query("INSERT INTO audit(campaign_id,actor_user_id,kind,data,created_at) VALUES($1,$2,$3,$4,$5)", [campaignId, userId, kind, data, now()]);
  }
  async function install(tx: Db, userId: string, campaignId: string, input: unknown): Promise<RulePackage> {
    const registry = new RulePackageRegistry(); const pkg = registry.install(input); const contentHash = digest(pkg);
    const old = (await tx.query<{ content_hash: string; document: RulePackage }>("SELECT content_hash,document FROM rule_packages WHERE campaign_id=$1 AND package_id=$2 AND version=$3", [campaignId, pkg.id, pkg.version])).rows[0];
    if (old) { if (old.content_hash !== contentHash || stableJson(old.document) !== stableJson(pkg)) throw new Conflict(); return parseRulePackage(old.document); }
    await tx.query("INSERT INTO rule_packages(campaign_id,package_id,version,document,content_hash,installed_by,installed_at) VALUES($1,$2,$3,$4,$5,$6,$7)", [campaignId, pkg.id, pkg.version, pkg, contentHash, userId, now()]);
    return pkg;
  }
  async function currentPin(tx: Db, campaignId: string): Promise<PackagePin> {
    const row = (await tx.query<{ package_id: string; package_version: string }>("SELECT package_id,package_version FROM campaign_rule_pins WHERE campaign_id=$1", [campaignId])).rows[0];
    return row ? { id: row.package_id, version: row.package_version } : { id: DEMO_RULE_PACKAGE.id, version: DEMO_RULE_PACKAGE.version };
  }
  async function packageFor(tx: Db, campaignId: string, pin: PackagePin): Promise<RulePackage> {
    const row = (await tx.query<{ document: RulePackage; content_hash: string }>("SELECT document,content_hash FROM rule_packages WHERE campaign_id=$1 AND package_id=$2 AND version=$3", [campaignId, pin.id, pin.version])).rows[0];
    if (row) { if (digest(row.document) !== row.content_hash) throw new Gone("corrupt-package"); return parseRulePackage(row.document); }
    if (pin.id === DEMO_RULE_PACKAGE.id && pin.version === DEMO_RULE_PACKAGE.version) return DEMO_RULE_PACKAGE;
    throw new Gone("package");
  }
  async function listPackages(userId: string, campaignId: string) {
    await campaigns.requireMember(userId, campaignId);
    const rows = (await db.query<{ document: RulePackage }>("SELECT document FROM rule_packages WHERE campaign_id=$1 ORDER BY package_id,version", [campaignId])).rows.map(r => r.document);
    if (!rows.some(p => p.id === DEMO_RULE_PACKAGE.id && p.version === DEMO_RULE_PACKAGE.version)) rows.unshift(DEMO_RULE_PACKAGE);
    const version = (await db.query<{ version: number }>("SELECT version FROM campaign_rule_pins WHERE campaign_id=$1", [campaignId])).rows[0]?.version ?? 0;
    return { packages: rows, pin: await currentPin(db, campaignId), version };
  }
  async function installPackage(userId: string, campaignId: string, input: unknown) {
    return db.transaction(async tx => { await authorize(tx, userId, campaignId, true); return install(tx, userId, campaignId, input); });
  }
  async function activatePackage(userId: string, campaignId: string, input: { packageId: string; packageVersion: string; expectedVersion: number }) {
    return db.transaction(async tx => {
      await authorize(tx, userId, campaignId, true);
      const pinRow = (await tx.query<{ version: number }>("SELECT version FROM campaign_rule_pins WHERE campaign_id=$1", [campaignId])).rows[0];
      if (input.expectedVersion !== (pinRow?.version ?? 0)) throw new Conflict();
      const oldPin = await currentPin(tx, campaignId), next = await packageFor(tx, campaignId, { id: input.packageId, version: input.packageVersion });
      await install(tx, userId, campaignId, next);
      const sheets = (await tx.query<{ actor_id: string; fields: Record<string, Scalar>; package_id: string; package_version: string }>("SELECT * FROM actor_sheets WHERE campaign_id=$1", [campaignId])).rows;
      if (sheets.length && (oldPin.id !== next.id || oldPin.version !== next.version)) {
        if (sheets.some(s => s.package_id !== oldPin.id || s.package_version !== oldPin.version)) throw new Conflict();
        const preview = previewPackageMigration(await packageFor(tx, campaignId, oldPin), next, sheets.map(s => ({ id: s.actor_id, fields: s.fields })));
        for (const entity of preview.entities) await tx.query("UPDATE actor_sheets SET fields=$3,package_id=$4,package_version=$5,version=version+1,updated_at=$6 WHERE actor_id=$1 AND campaign_id=$2", [entity.id, campaignId, entity.after, next.id, next.version, now()]);
        await audit(tx, campaignId, userId, "rules.migration", preview);
      }
      const version = (pinRow?.version ?? 0) + 1;
      await tx.query(`INSERT INTO campaign_rule_pins(campaign_id,package_id,package_version,version) VALUES($1,$2,$3,$4)
        ON CONFLICT(campaign_id) DO UPDATE SET package_id=EXCLUDED.package_id,package_version=EXCLUDED.package_version,version=EXCLUDED.version`, [campaignId, next.id, next.version, version]);
      return { pin: { id: next.id, version: next.version }, version };
    });
  }
  async function sheet(tx: Db, campaignId: string, actorId: string): Promise<ActorSheet> {
    const row = (await tx.query<{ fields: Record<string, Scalar>; package_id: string; package_version: string; version: number; defeat_pending: boolean; defeated_at: string | null }>("SELECT * FROM actor_sheets WHERE actor_id=$1 AND campaign_id=$2", [actorId, campaignId])).rows[0];
    if (row) return { actorId, fields: row.fields, packageId: row.package_id, packageVersion: row.package_version, version: row.version, defeatPending: row.defeat_pending, defeatedAt: row.defeated_at === null ? null : Number(row.defeated_at) };
    const pin = await currentPin(tx, campaignId), pkg = await packageFor(tx, campaignId, pin);
    return { actorId, packageId: pin.id, packageVersion: pin.version, fields: defaultActorFields(pkg), version: 0, defeatPending: false, defeatedAt: null };
  }
  async function getSheet(userId: string, campaignId: string, actorId: string) {
    const member = await campaigns.requireMember(userId, campaignId); await controller(db, member, actorId); return sheet(db, campaignId, actorId);
  }
  async function updateSheet(userId: string, campaignId: string, input: { actorId: string; expectedVersion: number; fields: Readonly<Record<string, Scalar>> }) {
    return db.transaction(async tx => {
      const member = await authorize(tx, userId, campaignId); await controller(tx, member, input.actorId);
      const old = await sheet(tx, campaignId, input.actorId); if (old.version !== input.expectedVersion) throw new Conflict();
      const pkg = await packageFor(tx, campaignId, { id: old.packageId, version: old.packageVersion }); await install(tx, userId, campaignId, pkg);
      const fields = validateEntityFields(pkg.fields, input.fields);
      await tx.query(`INSERT INTO actor_sheets(actor_id,campaign_id,package_id,package_version,fields,version,updated_at) VALUES($1,$2,$3,$4,$5,1,$6)
        ON CONFLICT(actor_id,campaign_id) DO UPDATE SET fields=EXCLUDED.fields,version=actor_sheets.version+1,updated_at=EXCLUDED.updated_at`, [input.actorId, campaignId, pkg.id, pkg.version, fields, now()]);
      return sheet(tx, campaignId, input.actorId);
    });
  }
  async function adjustResource(userId: string, campaignId: string, input: { actorId: string; expectedVersion: number; field: string; delta: number }) {
    return db.transaction(async tx => {
      await authorize(tx, userId, campaignId, true); const old = await sheet(tx, campaignId, input.actorId);
      const current = old.fields[input.field]; if (typeof current !== "number") throw new Gone("resource");
      const value = current + number(input.delta);
      await createGameplay(tx, cfg).updateSheet(userId, campaignId, { actorId: input.actorId, expectedVersion: input.expectedVersion, fields: { ...old.fields, [input.field]: value } });
      if (value <= 0) await tx.query("UPDATE actor_sheets SET defeat_pending=true WHERE actor_id=$1 AND campaign_id=$2 AND defeated_at IS NULL", [input.actorId, campaignId]);
      return sheet(tx, campaignId, input.actorId);
    });
  }
  async function listScenes(userId: string, campaignId: string): Promise<SceneCard[]> {
    const member = await campaigns.requireMember(userId, campaignId), knowledge = await createDocuments(db, cfg).knowledge(userId, campaignId);
    const rows = (await db.query<{ id: string; name: string; entry_ids: string[]; fiction_date: string; status: string; version: number }>("SELECT * FROM scenes WHERE campaign_id=$1 ORDER BY created_at,id", [campaignId])).rows;
    return rows.filter(r => member.role === "leitung" || r.status !== "prepared").map(r => ({ id: r.id, name: r.name, fictionDate: r.fiction_date, status: r.status, version: r.version,
      entryIds: member.role === "leitung" ? r.entry_ids : r.entry_ids.filter(id => knowledge.bekannteEntryIds?.has(id)) }));
  }
  async function createScene(userId: string, campaignId: string, input: { name: string; entryIds: string[]; fictionDate: string }) {
    return db.transaction(async tx => {
      await authorize(tx, userId, campaignId, true); text(input.name, 160); text(input.fictionDate, 120);
      if (!Array.isArray(input.entryIds) || input.entryIds.length > 128 || new Set(input.entryIds).size !== input.entryIds.length) throw new Gone("scene-input");
      const valid = await tx.query("SELECT id FROM entries WHERE campaign_id=$1 AND id=ANY($2::text[])", [campaignId, input.entryIds]); if (valid.rowCount !== input.entryIds.length) throw new Gone();
      const id = randomUUID(); await tx.query("INSERT INTO scenes(id,campaign_id,name,entry_ids,fiction_date,created_by,created_at) VALUES($1,$2,$3,$4,$5,$6,$7)", [id, campaignId, input.name, JSON.stringify(input.entryIds), input.fictionDate, userId, now()]);
      return { id, name: input.name, entryIds: input.entryIds, fictionDate: input.fictionDate, status: "prepared", version: 1 };
    });
  }
  async function startScene(userId: string, campaignId: string, sceneId: string) {
    return db.transaction(async tx => {
      await authorize(tx, userId, campaignId, true);
      const scene = (await tx.query<{ status: string }>("SELECT status FROM scenes WHERE id=$1 AND campaign_id=$2", [sceneId, campaignId])).rows[0]; if (!scene) throw new Gone();
      if (scene.status === "active") return (await tx.query("SELECT id,scene_id AS \"sceneId\",started_at AS \"startedAt\" FROM game_sessions WHERE campaign_id=$1 AND scene_id=$2 AND ended_at IS NULL", [campaignId, sceneId])).rows[0]!;
      await tx.query("UPDATE scenes SET status='ended',version=version+1 WHERE campaign_id=$1 AND status='active'", [campaignId]);
      await tx.query("UPDATE game_sessions SET ended_at=$2 WHERE campaign_id=$1 AND ended_at IS NULL", [campaignId, now()]);
      await tx.query("UPDATE scenes SET status='active',version=version+1 WHERE campaign_id=$1 AND id=$2", [campaignId, sceneId]);
      const id = randomUUID(); await tx.query("INSERT INTO game_sessions(id,campaign_id,scene_id,started_at,started_by) VALUES($1,$2,$3,$4,$5)", [id, campaignId, sceneId, now(), userId]);
      return { id, sceneId, startedAt: now() };
    });
  }
  async function projectedActorKnowledge(tx: Db, campaignId: string, actorId: string): Promise<ProjectedKnowledge> {
    const docs = createDocuments(tx, cfg), held = await docs.held(campaignId, actorId);
    const rows = (await tx.query<{ id: string; tags: string[] }>("SELECT id,tags FROM passages WHERE campaign_id=$1 AND id=ANY($2::text[]) AND retired_at_revision IS NULL ORDER BY id", [campaignId, [...held]])).rows;
    const history = (await tx.query<{ event: LineageEvent }>("SELECT l.event FROM lineage_events l JOIN entries e ON e.id=l.entry_id WHERE e.campaign_id=$1 ORDER BY l.seq", [campaignId])).rows.map(r => r.event);
    const grants = (await tx.query<{ passage_id: string; quelle: Quelle }>("SELECT passage_id,quelle FROM revelations WHERE campaign_id=$1 AND actor_id=$2 AND revoked_at IS NULL", [campaignId, actorId])).rows;
    const experience = new Map<string, Experience>(), strength = { gehoert: 0, gesprochen: 1, erfahren: 2 };
    for (const grant of grants) {
      const grade: Experience = grant.quelle.art === "wurf" ? "erfahren" : grant.quelle.art === "gesprochen" ? "gesprochen" : "gehoert";
      for (const pid of resolvePassage(trustPassageId(grant.passage_id), history)) if (!experience.has(pid) || strength[grade] > strength[experience.get(pid)!]) experience.set(pid, grade);
    }
    return { actorId, passages: rows.map(p => ({ passageId: p.id, labels: p.tags, experience: experience.get(p.id) ?? "gehoert" })) };
  }
  async function target(tx: Db, campaignId: string, passageId: string) {
    const row = (await tx.query<{ id: string; entry_id: string; content: unknown; gen: number; geltung: string; tags: string[] }>(`SELECT p.id,p.entry_id,p.content,p.gen,p.geltung,p.tags FROM passages p
      JOIN entries e ON e.id=p.entry_id WHERE p.id=$1 AND p.campaign_id=$2 AND p.retired_at_revision IS NULL FOR UPDATE OF e,p`, [passageId, campaignId])).rows[0];
    if (!row) throw new Gone(); return { ...row, hash: digest({ id: row.id, content: row.content, gen: row.gen, tags: row.tags }) };
  }
  async function prepare(tx: Db, userId: string, campaignId: string, input: PrepareActionInput, delegated?: VollmachtRow): Promise<ActionCard> {
    const member = await authorize(tx, userId, campaignId); await controller(tx, member, input.actorId); text(input.commandId); text(input.actionId);
    const reqHash = digest({ ...input, delegated: delegated?.id ?? null });
    const previous = (await tx.query<RollRow>("SELECT * FROM action_rolls WHERE campaign_id=$1 AND prepared_by=$2 AND command_id=$3", [campaignId, userId, input.commandId])).rows[0];
    if (previous) { if (previous.request_hash !== reqHash) throw new Conflict(); return card(previous); }
    const old = await sheet(tx, campaignId, input.actorId);
    const pin = { id: input.packageId ?? old.packageId, version: input.packageVersion ?? old.packageVersion };
    if (pin.id !== old.packageId || pin.version !== old.packageVersion) throw new Gone("sheet-package-mismatch");
    if (delegated) {
      const pending = (await tx.query<RollRow>("SELECT * FROM action_rolls WHERE vollmacht_id=$1 AND status='ausstehend'", [delegated.id])).rows[0];
      if (pending) throw new Conflict();
    }
    const pkg = await packageFor(tx, campaignId, pin); await install(tx, userId, campaignId, pkg);
    const passage = input.targetPassageId ? await target(tx, campaignId, input.targetPassageId) : null;
    if (passage && !delegated && member.role !== "leitung" && !(await createDocuments(tx, cfg).held(campaignId, input.actorId)).has(trustPassageId(passage.id))) throw new Gone();
    if (delegated && passage?.hash !== delegated.passage_hash) throw new Conflict();
    const session = (await tx.query<{ id: string; scene_id: string; fiction_date: string }>("SELECT g.id,g.scene_id,s.fiction_date FROM game_sessions g JOIN scenes s ON s.id=g.scene_id WHERE g.campaign_id=$1 AND g.ended_at IS NULL", [campaignId])).rows[0];
    const fictionDate = text(input.fictionDate ?? session?.fiction_date ?? new Date(now()).toISOString().slice(0, 10), 120);
    const receipt = evaluateAction(pkg, input.actionId, { seed: seed(), actor: old.fields, input: input.input ?? {}, knowledge: await projectedActorKnowledge(tx, campaignId, input.actorId) });
    const id = randomUUID();
    await tx.query(`INSERT INTO action_rolls(id,campaign_id,actor_id,prepared_by,command_id,request_hash,package_id,package_version,action_id,receipt,receipt_hash,target_passage_id,target_passage_hash,vollmacht_id,fiction_date,prepared_at,scene_id,session_id)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)`,
      [id, campaignId, input.actorId, userId, input.commandId, reqHash, pkg.id, pkg.version, input.actionId, receipt, digest(receipt), passage?.id ?? null, passage?.hash ?? null, delegated?.id ?? null, fictionDate, now(), session?.scene_id ?? null, session?.id ?? null]);
    await audit(tx, campaignId, userId, "action.prepared", { rollId: id, actorId: input.actorId, vollmachtId: delegated?.id ?? null });
    return card((await tx.query<RollRow>("SELECT * FROM action_rolls WHERE id=$1", [id])).rows[0]!);
  }
  async function prepareAction(userId: string, campaignId: string, input: PrepareActionInput) { return db.transaction(tx => prepare(tx, userId, campaignId, input)); }

  async function rollFor(tx: Db, userId: string, campaignId: string, id: string): Promise<RollRow> {
    const member = await createCampaigns(tx, cfg).requireMember(userId, campaignId);
    const row = (await tx.query<RollRow>("SELECT * FROM action_rolls WHERE id=$1 AND campaign_id=$2", [id, campaignId])).rows[0];
    if (!row) throw new Gone(); await controller(tx, member, row.actor_id); return row;
  }
  async function getRoll(userId: string, campaignId: string, id: string) { return card(await rollFor(db, userId, campaignId, id)); }
  async function listRolls(userId: string, campaignId: string) {
    const member = await campaigns.requireMember(userId, campaignId);
    const rows = await db.query<RollRow>("SELECT * FROM action_rolls WHERE campaign_id=$1 AND ($2::boolean OR actor_id=$3) ORDER BY prepared_at DESC,id LIMIT 100", [campaignId, member.role === "leitung", member.actorId]);
    return rows.rows.map(card);
  }
  async function replayRoll(userId: string, campaignId: string, id: string) {
    const roll = await rollFor(db, userId, campaignId, id); const pkg = await packageFor(db, campaignId, { id: roll.package_id, version: roll.package_version });
    return { valid: digest(roll.receipt) === roll.receipt_hash && replayAction(pkg, roll.receipt).valid, receiptHash: roll.receipt_hash, receipt: roll.receipt };
  }

  async function mint(tx: Db, userId: string, campaignId: string, kind: Praegung["art"], input: MintInput,
    extras: { roll?: RollRow; vollmacht?: VollmachtRow; replaces?: string } = {}): Promise<MintReceipt> {
    const passage = await target(tx, campaignId, input.passageId);
    if (input.expectedPassageHash && input.expectedPassageHash !== passage.hash) throw new Conflict();
    if (kind === "ratifikation" && passage.geltung !== "antrag") throw new Gone("proposal-required");
    if (extras.replaces) { const old = await target(tx, campaignId, extras.replaces); if (old.geltung !== "kanon" || old.id === passage.id) throw new Gone("correction-source"); }
    const entry = (await tx.query<{ version: number; title: string; slug: string }>("SELECT version,title,slug FROM entries WHERE id=$1 AND campaign_id=$2 FOR UPDATE", [passage.entry_id, campaignId])).rows[0]!;
    const currentSession = (await tx.query<{ id: string; scene_id: string }>("SELECT id,scene_id FROM game_sessions WHERE campaign_id=$1 AND ended_at IS NULL", [campaignId])).rows[0];
    const serverTime = now(), id = randomUUID(), revisionId = randomUUID();
    const provenance: Record<string, unknown> = { schemaVersion: 1, kind, userId, actorId: extras.roll?.actor_id ?? null, serverTime,
      requestHash: digest({ kind, input, replaces: extras.replaces ?? null }),
      playDate: new Date(serverTime).toISOString().slice(0, 10), fictionDate: text(input.fictionDate, 120),
      rollId: extras.roll?.id ?? null, receiptHash: extras.roll?.receipt_hash ?? null, vollmachtId: extras.vollmacht?.id ?? null, replaces: extras.replaces ?? null,
      passageHash: passage.hash, package: extras.roll ? { id: extras.roll.package_id, version: extras.roll.package_version } : null,
      augenblick: { capturedAt: serverTime, sceneId: currentSession?.scene_id ?? null, sessionId: currentSession?.id ?? null } };
    const praegung: Praegung = kind === "wurf" ? { art: "wurf", wurfId: extras.roll!.id }
      : kind === "vollmacht" ? { art: "vollmacht", vollmachtId: extras.vollmacht!.id }
      : kind === "berichtigung" ? { art: "berichtigung", ersetzt: trustPassageId(extras.replaces!) }
      : { art: kind, sitzung: currentSession?.id ?? "zwischen-den-sitzungen" };
    await tx.query("UPDATE passages SET geltung='kanon',praegung=$3,provenance=$4,gen=gen+1 WHERE id=$1 AND campaign_id=$2", [passage.id, campaignId, praegung, provenance]);
    const source = await createDocuments(tx, cfg).source(campaignId, passage.entry_id);
    const document = { title: entry.title, slug: entry.slug, passagen: source.passagen, tags: source.rows.map(r => r.tags), mint: provenance };
    await tx.query("INSERT INTO revisions(id,entry_id,seq,author_user_id,content_hash,document,created_at) VALUES($1,$2,$3,$4,$5,$6,$7)", [revisionId, passage.entry_id, entry.version + 1, userId, digest(document), document, serverTime]);
    await tx.query("UPDATE entries SET version=version+1,current_revision_id=$2 WHERE id=$1", [passage.entry_id, revisionId]);
    await tx.query("INSERT INTO lineage_events(entry_id,revision_id,event,created_at) VALUES($1,$2,$3,$4)", [passage.entry_id, revisionId, { kind: "revise", pid: passage.id }, serverTime]);
    const recipients = [...new Set(input.actorIds ?? (extras.roll ? [extras.roll.actor_id] : []))]; if (recipients.length > 128) throw new Gone("recipients");
    for (const actorId of recipients) {
      if (!(await tx.query("SELECT id FROM actors WHERE id=$1 AND campaign_id=$2", [actorId, campaignId])).rowCount) throw new Gone();
      const quelle: Quelle = extras.roll ? { art: "wurf", wurfId: extras.roll.id } : { art: "gesprochen", sitzung: currentSession?.id ?? "zwischen-den-sitzungen" };
      await tx.query(`INSERT INTO revelations(campaign_id,actor_id,passage_id,granted_at,granted_by,quelle) VALUES($1,$2,$3,$4,$5,$6)
        ON CONFLICT(actor_id,passage_id) DO UPDATE SET revoked_at=NULL,quelle=EXCLUDED.quelle,granted_at=EXCLUDED.granted_at,granted_by=EXCLUDED.granted_by`, [campaignId, actorId, passage.id, serverTime, userId, quelle]);
    }
    const seal = digest({ id, passageId: passage.id, revisionId, provenance });
    await tx.query("INSERT INTO confirmed_mints(id,campaign_id,kind,passage_id,revision_id,roll_id,user_id,command_id,provenance,seal,confirmed_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)", [id, campaignId, kind, passage.id, revisionId, extras.roll?.id ?? null, userId, input.commandId, provenance, seal, serverTime]);
    await audit(tx, campaignId, userId, `praegung.${kind}`, { mintId: id, passageId: passage.id, seal });
    return { id, kind, passageId: passage.id, revisionId, provenance, seal, confirmedAt: serverTime };
  }
  async function previousMint(tx: Db, userId: string, campaignId: string, commandId: string): Promise<MintReceipt | null> {
    const row = (await tx.query<{ id: string; kind: Praegung["art"]; passage_id: string; revision_id: string; provenance: Record<string, unknown>; seal: string; confirmed_at: string }>("SELECT * FROM confirmed_mints WHERE campaign_id=$1 AND user_id=$2 AND command_id=$3", [campaignId, userId, commandId])).rows[0];
    return row ? { id: row.id, kind: row.kind, passageId: row.passage_id, revisionId: row.revision_id, provenance: row.provenance, seal: row.seal, confirmedAt: Number(row.confirmed_at) } : null;
  }
  async function manualMint(userId: string, campaignId: string, kind: "gesprochen" | "ratifikation" | "berichtigung", input: MintInput, replaces?: string) {
    return db.transaction(async tx => {
      await authorize(tx, userId, campaignId, true); text(input.commandId); const old = await previousMint(tx, userId, campaignId, input.commandId);
      if (old) { if (old.provenance.requestHash !== digest({ kind, input, replaces: replaces ?? null })) throw new Conflict(); return old; }
      return mint(tx, userId, campaignId, kind, input, replaces ? { replaces } : {});
    });
  }
  const mintGesprochen = (userId: string, campaignId: string, input: MintInput) => manualMint(userId, campaignId, "gesprochen", input);
  const mintRatifikation = (userId: string, campaignId: string, input: MintInput) => manualMint(userId, campaignId, "ratifikation", input);
  const mintBerichtigung = (userId: string, campaignId: string, input: MintInput & { ersetztPassageId: string }) => manualMint(userId, campaignId, "berichtigung", input, input.ersetztPassageId);
  async function confirmDefeat(userId: string, campaignId: string, input: MintInput & { actorId: string; expectedVersion: number }) {
    return db.transaction(async tx => {
      await authorize(tx, userId, campaignId, true); const old = await previousMint(tx, userId, campaignId, input.commandId);
      if (old) { if (old.provenance.requestHash !== digest({ kind: "gesprochen", input, replaces: null })) throw new Conflict(); return old; }
      const actor = await sheet(tx, campaignId, input.actorId); if (!actor.defeatPending || actor.version !== input.expectedVersion) throw new Conflict();
      const receipt = await mint(tx, userId, campaignId, "gesprochen", input);
      await tx.query("UPDATE actor_sheets SET defeat_pending=false,defeated_at=$3,version=version+1 WHERE actor_id=$1 AND campaign_id=$2", [input.actorId, campaignId, now()]);
      return receipt;
    });
  }
  async function getVollmacht(tx: Db, userId: string, campaignId: string, id: string, allowConsumed = false): Promise<VollmachtRow> {
    const member = await createCampaigns(tx, cfg).requireMember(userId, campaignId);
    const row = (await tx.query<VollmachtRow>("SELECT * FROM action_vollmachten WHERE id=$1 AND campaign_id=$2", [id, campaignId])).rows[0];
    if (!row) throw new Gone(); await controller(tx, member, row.actor_id);
    if (row.revoked_at !== null || row.status === "widerrufen" || row.status === "verfallen" || (!allowConsumed && row.status !== "offen") || (row.status === "offen" && Number(row.expires_at) <= now())) throw new Gone();
    return row;
  }
  async function confirm(userId: string, campaignId: string, rollId: string, delegated: boolean): Promise<ActionConfirmation> {
    return db.transaction(async tx => {
      const member = await authorize(tx, userId, campaignId); const roll = await rollFor(tx, userId, campaignId, rollId);
      if (Boolean(roll.vollmacht_id) !== delegated) throw new Gone();
      const authorization = roll.vollmacht_id ? await getVollmacht(tx, userId, campaignId, roll.vollmacht_id, true) : null;
      if (!authorization && roll.target_passage_id && member.role !== "leitung") throw new Gone("mint-authority");
      if (authorization?.status === "eingeloest" && authorization.consumed_roll_id !== roll.id) throw new Gone();
      if (roll.confirmation) return roll.confirmation; // authority is checked before idempotent replay
      if (roll.status !== "ausstehend" || (authorization && Number(authorization.expires_at) <= now())) throw new Gone();
      const pkg = await packageFor(tx, campaignId, { id: roll.package_id, version: roll.package_version });
      if (digest(roll.receipt) !== roll.receipt_hash || !replayAction(pkg, roll.receipt).valid) throw new Conflict();
      const success = authorization ? roll.receipt.total >= authorization.threshold : roll.receipt.success ?? true;
      let minted: MintReceipt | null = null;
      if (success && roll.target_passage_id) {
        if ((await target(tx, campaignId, roll.target_passage_id)).hash !== roll.target_passage_hash) throw new Conflict();
        minted = await mint(tx, userId, campaignId, authorization ? "vollmacht" : "wurf", { commandId: `roll:${roll.id}`, passageId: roll.target_passage_id, fictionDate: roll.fiction_date },
          { roll, ...(authorization ? { vollmacht: authorization } : {}) });
      }
      const confirmedAt = now(); const body = { rollId: roll.id, success, mint: minted, confirmedAt };
      const confirmation: ActionConfirmation = { ...body, seal: digest({ ...body, receiptHash: roll.receipt_hash }) };
      await tx.query("UPDATE action_rolls SET status='bestaetigt',confirmed_at=$2,confirmation=$3 WHERE id=$1", [roll.id, confirmedAt, confirmation]);
      if (authorization && (success || !authorization.repeatable)) await tx.query("UPDATE action_vollmachten SET status='eingeloest',consumed_roll_id=$2,version=version+1 WHERE id=$1", [authorization.id, roll.id]);
      await audit(tx, campaignId, userId, authorization ? "vollmacht.confirmed" : "action.confirmed", { rollId: roll.id, success, mintId: minted?.id ?? null });
      return confirmation;
    });
  }
  const confirmAction = (userId: string, campaignId: string, rollId: string) => confirm(userId, campaignId, rollId, false);
  const confirmVollmacht = (userId: string, campaignId: string, rollId: string) => confirm(userId, campaignId, rollId, true);
  async function issueVollmacht(userId: string, campaignId: string, input: IssueVollmachtInput) {
    return db.transaction(async tx => {
      const member = await authorize(tx, userId, campaignId, true); await controller(tx, member, input.actorId);
      text(input.commandId); text(input.fictionDate, 120); number(input.threshold);
      if (!Number.isSafeInteger(input.expiresAt) || input.expiresAt <= now() || input.expiresAt > now() + WEEK || !["player", "floating"].includes(input.budgetKind)) throw new Gone("vollmacht-input");
      const requestHash = digest(input);
      const old = (await tx.query<VollmachtRow>("SELECT * FROM action_vollmachten WHERE campaign_id=$1 AND issued_by=$2 AND command_id=$3", [campaignId, userId, input.commandId])).rows[0];
      if (old) { if (old.request_hash !== requestHash) throw new Conflict(); return { id: old.id, expiresAt: Number(old.expires_at), status: old.status }; }
      const count = (await tx.query<{ count: string }>(`SELECT count(*) FROM action_vollmachten WHERE campaign_id=$1 AND issued_at>$2 AND budget_kind=$3
        AND ($3='floating' OR actor_id=$4)`, [campaignId, now() - WEEK, input.budgetKind, input.actorId])).rows[0]!;
      if (Number(count.count) >= (input.budgetKind === "player" ? 1 : 2)) throw new Conflict();
      const actor = await sheet(tx, campaignId, input.actorId), pin = { id: input.packageId ?? actor.packageId, version: input.packageVersion ?? actor.packageVersion };
      if (pin.id !== actor.packageId || pin.version !== actor.packageVersion) throw new Gone();
      const pkg = await packageFor(tx, campaignId, pin); await install(tx, userId, campaignId, pkg);
      const action = pkg.actions.find(a => a.id === input.actionId); if (!action) throw new Gone();
      const fixedInput = validateEntityFields(action.inputs, input.input ?? {}), passage = await target(tx, campaignId, input.passageId), id = randomUUID();
      await tx.query(`INSERT INTO action_vollmachten(id,campaign_id,actor_id,passage_id,passage_hash,package_id,package_version,action_id,threshold,fixed_input,fiction_date,issued_by,issued_at,expires_at,repeatable,budget_kind,command_id,request_hash)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)`,
        [id, campaignId, input.actorId, passage.id, passage.hash, pkg.id, pkg.version, action.id, input.threshold, fixedInput, input.fictionDate, userId, now(), input.expiresAt, input.repeatable ?? false, input.budgetKind, input.commandId, requestHash]);
      await audit(tx, campaignId, userId, "vollmacht.issued", { id, actorId: input.actorId, passageId: passage.id, expiresAt: input.expiresAt, budgetKind: input.budgetKind });
      return { id, expiresAt: input.expiresAt, status: "offen" };
    });
  }
  async function prepareVollmacht(userId: string, campaignId: string, id: string, input: { commandId: string; input?: Readonly<Record<string, Scalar>> }) {
    return db.transaction(async tx => {
      await authorize(tx, userId, campaignId); const authorization = await getVollmacht(tx, userId, campaignId, id);
      if (input.input !== undefined && stableJson(input.input) !== stableJson(authorization.fixed_input)) throw new Gone("fixed-vollmacht-input");
      return prepare(tx, userId, campaignId, { commandId: input.commandId, actorId: authorization.actor_id, packageId: authorization.package_id, packageVersion: authorization.package_version,
        actionId: authorization.action_id, input: authorization.fixed_input, targetPassageId: authorization.passage_id, fictionDate: authorization.fiction_date }, authorization);
    });
  }
  async function listVollmachten(userId: string, campaignId: string) {
    const member = await campaigns.requireMember(userId, campaignId);
    await expireVollmachten(userId, campaignId);
    const rows = (await db.query<VollmachtRow & { slug: string }>(`SELECT v.*,e.slug FROM action_vollmachten v JOIN passages p ON p.id=v.passage_id JOIN entries e ON e.id=p.entry_id
      WHERE v.campaign_id=$1 AND ($2::boolean OR (v.actor_id=$3 AND v.status='offen' AND v.expires_at>$4 AND v.revoked_at IS NULL)) ORDER BY v.issued_at,v.id`, [campaignId, member.role === "leitung", member.actorId, now()])).rows;
    return rows.map(v => ({ id: v.id, actorId: v.actor_id, targetSlug: v.slug, actionId: v.action_id, expiresAt: Number(v.expires_at), status: v.status, repeatable: v.repeatable,
      ...(member.role === "leitung" ? { passageId: v.passage_id, threshold: v.threshold, budgetKind: v.budget_kind } : {}) }));
  }
  async function revokeVollmacht(userId: string, campaignId: string, id: string) {
    return db.transaction(async tx => {
      await authorize(tx, userId, campaignId, true);
      const v = (await tx.query<VollmachtRow>("SELECT * FROM action_vollmachten WHERE id=$1 AND campaign_id=$2", [id, campaignId])).rows[0]; if (!v) throw new Gone();
      if (v.status === "widerrufen") return { id, status: "widerrufen" };
      await tx.query("UPDATE action_vollmachten SET status='widerrufen',revoked_at=$2,version=version+1 WHERE id=$1", [id, now()]);
      await audit(tx, campaignId, userId, "vollmacht.revoked", { id }); return { id, status: "widerrufen" };
    });
  }
  async function expireVollmachten(userId: string, campaignId: string) {
    return db.transaction(async tx => {
      await authorize(tx, userId, campaignId);
      const expired = (await tx.query<{ id: string }>("UPDATE action_vollmachten SET status='verfallen',version=version+1 WHERE campaign_id=$1 AND status='offen' AND expires_at<=$2 RETURNING id", [campaignId, now()])).rows;
      for (const row of expired) await audit(tx, campaignId, userId, "vollmacht.expired", { id: row.id });
      // Expiry counts are intentionally private; callers use their own projected door list.
    });
  }
  async function mintProvenance(userId: string, campaignId: string, passageId: string) {
    const member = await campaigns.requireMember(userId, campaignId);
    if (member.role !== "leitung" && !(await createDocuments(db, cfg).held(campaignId, member.actorId)).has(trustPassageId(passageId))) throw new Gone();
    await target(db, campaignId, passageId);
    return (await db.query("SELECT id,kind,passage_id AS \"passageId\",revision_id AS \"revisionId\",provenance,seal,confirmed_at AS \"confirmedAt\" FROM confirmed_mints WHERE campaign_id=$1 AND passage_id=$2 ORDER BY confirmed_at,id", [campaignId, passageId])).rows;
  }
  return { listPackages, installPackage, activatePackage, getSheet, updateSheet, adjustResource, listScenes, createScene, startScene,
    prepareAction, confirmAction, getRoll, listRolls, replayRoll, mintGesprochen, mintRatifikation, mintBerichtigung, confirmDefeat, mintProvenance,
    issueVollmacht, prepareVollmacht, confirmVollmacht, listVollmachten, revokeVollmacht, expireVollmachten };
}
