// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { randomInt, randomUUID } from "node:crypto";
import { Value } from "@sinclair/typebox/value";
import { canonicalHash, type CanonicalValue } from "@chronicle/core";
import { DEMO_RULE_PACKAGE, parseSupportedRulePackage, stableJson, validatePackageFields, type AnyRulePackage } from "@chronicle/rules";
import * as P from "../../../protocol/src/actors.ts";
import type { Db } from "../db/index.ts";
import type { DomainConfig } from "./campaigns.ts";
import { ActorValidationError } from "./actors.ts";
import { Conflict, Gone } from "./errors.ts";

const digest = (value: unknown) => canonicalHash(value as CanonicalValue);

interface TemplateRow {
  definition: P.ActorTemplateData;
  content_hash: string;
  archived_at: string | number | null;
}
interface EventRow { campaign_id: string; request_hash: string; result: P.ActorCard }

async function packageFor(tx: Db, campaignId: string, pin: { id: string; version: string }): Promise<AnyRulePackage> {
  const row = (await tx.query<{ document: unknown; content_hash: string }>(
    "SELECT document,content_hash FROM rule_packages WHERE campaign_id=$1 AND package_id=$2 AND version=$3",
    [campaignId, pin.id, pin.version],
  )).rows[0];
  if (row) {
    if (digest(row.document) !== row.content_hash) throw new Gone("corrupt-package");
    return parseSupportedRulePackage(row.document);
  }
  if (pin.id === DEMO_RULE_PACKAGE.id && pin.version === DEMO_RULE_PACKAGE.version) return DEMO_RULE_PACKAGE;
  throw new Gone("package");
}

async function requireGm(tx: Db, userId: string, campaignId: string): Promise<void> {
  const row = (await tx.query<{ role: string }>(`SELECT m.role FROM campaigns c JOIN campaign_memberships m ON m.campaign_id=c.id
    WHERE c.id=$1 AND m.user_id=$2 FOR UPDATE OF c FOR SHARE OF m`, [campaignId, userId])).rows[0];
  if (!row || row.role !== "leitung") throw new Gone();
}

async function template(tx: Db, campaignId: string, templateId: string, revision: number): Promise<TemplateRow> {
  const row = (await tx.query<TemplateRow>(`SELECT r.definition,r.content_hash,t.archived_at FROM actor_templates t
    JOIN actor_template_revisions r ON r.template_id=t.id AND r.campaign_id=t.campaign_id
    WHERE t.id=$1 AND t.campaign_id=$2 AND r.revision=$3`, [templateId, campaignId, revision])).rows[0];
  if (!row || row.archived_at !== null || digest(row.definition) !== row.content_hash) throw new Gone();
  return row;
}

async function rollLoot(tx: Db, campaignId: string, userId: string, actorId: string, definition: P.ActorTemplateData, at: number): Promise<void> {
  if (definition.schemaVersion !== 2) return;
  for (const row of definition.beute) {
    if (randomInt(1, 101) > row.wahrscheinlichkeit) continue;
    const [minimum, maximum] = row.menge;
    const quantity = randomInt(minimum, maximum + 1);
    await tx.query(`INSERT INTO item_instances(id,campaign_id,template_id,template_revision,holder_actor_id,state,created_by,created_at)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8)`, [randomUUID(), campaignId, row.templateId, row.templateRevision, actorId,
      JSON.stringify({ quantity, notes: "", equipped: false }), userId, at]);
  }
}

type ActorInstantiateInput = { commandId: string; templateId: string; templateRevision: number; name?: string };

function parseInstantiate(raw: unknown): ActorInstantiateInput {
  const copy = JSON.parse(stableJson(raw));
  if (!Value.Check(P.ActorInstantiate, copy)) throw new ActorValidationError("Bitte Figurendaten prüfen.");
  return copy as ActorInstantiateInput;
}

/** Same operation, but for a caller that already owns the surrounding transaction. */
export async function instantiatePinnedActorInTx(tx: Db, cfg: DomainConfig, userId: string, campaignId: string, raw: unknown,
  origin: { createdBy?: string; grantTo?: string } = {}): Promise<P.ActorCard> {
  const input = parseInstantiate(raw);
  const request = { campaignId, operation: "actor.instantiate", subjectId: null, input };
  const requestHash = digest(request), now = cfg.now ?? Date.now;
  await requireGm(tx, userId, campaignId);
  const old = (await tx.query<EventRow>(
    "SELECT campaign_id,request_hash,result FROM actor_inventory_events WHERE actor_user_id=$1 AND command_id=$2", [userId, input.commandId])).rows[0];
  if (old) {
    if (old.campaign_id !== campaignId || old.request_hash !== requestHash) throw new Conflict();
    return old.result;
  }
  const source = await template(tx, campaignId, input.templateId, input.templateRevision);
  const pkg = await packageFor(tx, campaignId, source.definition.package);
  const fields = validatePackageFields(pkg, source.definition.fields);
  if (pkg.id === DEMO_RULE_PACKAGE.id && pkg.version === DEMO_RULE_PACKAGE.version) {
    await tx.query(`INSERT INTO rule_packages(campaign_id,package_id,version,document,content_hash,installed_by,installed_at)
      VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING`,
    [campaignId, pkg.id, pkg.version, JSON.stringify(pkg), digest(pkg), userId, now()]);
  }
  const owner = origin.createdBy ?? userId, controller = origin.grantTo ?? userId;
  const actorId = randomUUID(), at = now();
  await tx.query("INSERT INTO actors(id,campaign_id,user_id,name) VALUES($1,$2,$3,$4)", [actorId, campaignId, owner, input.name ?? source.definition.name]);
  await tx.query(`INSERT INTO actor_profiles(actor_id,campaign_id,kind,template_id,template_revision,lore_entry_id,created_by,created_at)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8)`, [actorId, campaignId, source.definition.kind, input.templateId, input.templateRevision, source.definition.loreEntryId, owner, at]);
  await tx.query("INSERT INTO actor_controllers(actor_id,campaign_id,user_id,granted_by,granted_at) VALUES($1,$2,$3,$4,$5)", [actorId, campaignId, controller, userId, at]);
  await tx.query("INSERT INTO actor_sheets(actor_id,campaign_id,package_id,package_version,fields,updated_at) VALUES($1,$2,$3,$4,$5,$6)",
    [actorId, campaignId, pkg.id, pkg.version, JSON.stringify(fields), at]);
  await rollLoot(tx, campaignId, userId, actorId, source.definition, at);
  const result: P.ActorCard = {
    id: actorId, campaignId, name: input.name ?? source.definition.name, kind: source.definition.kind,
    version: 1, archivedAt: null, loreEntryId: source.definition.loreEntryId,
    template: { id: input.templateId, revision: input.templateRevision }, canControl: true, canReadAs: controller === userId,
  };
  await tx.query(`INSERT INTO actor_inventory_events(id,campaign_id,actor_user_id,operation,subject_id,command_id,request,request_hash,before_state,after_state,result,reason,created_at)
    VALUES($1,$2,$3,'actor.instantiate',$4,$5,$6,$7,NULL,$8,$9,NULL,$10)`,
    [randomUUID(), campaignId, userId, actorId, input.commandId, JSON.stringify(request), requestHash, JSON.stringify(result), JSON.stringify(result), at]);
  return result;
}

/** Instantiate the immutable template revision with the package pinned into that revision. */
export async function instantiatePinnedActor(db: Db, cfg: DomainConfig, userId: string, campaignId: string, raw: unknown,
  origin: { createdBy?: string; grantTo?: string } = {}): Promise<P.ActorCard> {
  return db.transaction(tx => instantiatePinnedActorInTx(tx, cfg, userId, campaignId, raw, origin)).catch((error: unknown) => {
    const pg = error as { code?: string; constraint?: string };
    if (pg?.code === "23505" && pg.constraint === "actor_inventory_events_actor_user_id_command_id_key") throw new Conflict();
    throw error;
  });
}
