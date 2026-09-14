// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { randomUUID } from "node:crypto";
import { canonicalHash, type CanonicalValue } from "@chronicle/core";
import { validatePackageFields, type AnyRulePackage, type PackagePin } from "@chronicle/rules";
import type { FigurantragCard, FreigegebeneVorlageCard } from "@chronicle/protocol";
import type { ActorTemplateData } from "../../../protocol/src/actors.ts";
import type { Db } from "../db/index.ts";
import type { DomainConfig } from "./campaigns.ts";
import { ActorValidationError } from "./actors.ts";
import { createFigurantrag, type FigurantragBody } from "./figurantrag.ts";
import { instantiatePinnedActorInTx } from "./pinned-actors.ts";
import { Conflict, Gone } from "./errors.ts";
import { resolveRulePackage } from "./rule-package-resolution.ts";

/** Request/template hashes use the core canonical encoding; rule packages are resolved separately. */
const hash = (value: unknown) => canonicalHash(value as CanonicalValue);
interface TemplateRow { id: string; version: number; revision: number; definition: ActorTemplateData; content_hash: string }
interface AntragRow {
  id: string; campaign_id: string; antragsteller: string; template_id: string; template_revision: number; name: string;
  anfangswerte: Record<string, unknown>; state: string; reason: string | null; version: number; created_at: string | number;
  decided_by: string | null; decided_at: string | number | null; actor_id: string | null;
}
const card = (row: AntragRow, packagePin?: PackagePin): FigurantragCard => ({
  id: row.id, templateId: row.template_id, templateRevision: row.template_revision, name: row.name,
  anfangswerte: { ...row.anfangswerte }, ...(packagePin ? { package: { ...packagePin } } : {}),
  status: row.state as FigurantragCard["status"], version: row.version,
  antragsteller: row.antragsteller, createdAt: String(row.created_at), decidedBy: row.decided_by,
  decidedAt: row.decided_at === null ? null : String(row.decided_at), actorId: row.actor_id, reason: row.reason,
});

export function createPinnedFigurantrag(db: Db, cfg: DomainConfig = {}) {
  const base = createFigurantrag(db, cfg), now = cfg.now ?? Date.now;
  async function member(tx: Db, userId: string, campaignId: string, roles: readonly string[]): Promise<{ role: string }> {
    const row = (await tx.query<{ role: string }>("SELECT role FROM campaign_memberships WHERE campaign_id=$1 AND user_id=$2", [campaignId, userId])).rows[0];
    if (!row || !roles.includes(row.role)) throw new Gone();
    return row;
  }
  async function template(tx: Db, campaignId: string, id: string, revision?: number): Promise<TemplateRow> {
    const row = (await tx.query<TemplateRow>(`SELECT t.id,t.version,r.revision,r.definition,r.content_hash FROM actor_templates t
      JOIN actor_template_revisions r ON r.template_id=t.id AND r.campaign_id=t.campaign_id AND r.revision=COALESCE($3,t.head_revision)
      WHERE t.id=$1 AND t.campaign_id=$2 AND t.archived_at IS NULL`, [id, campaignId, revision ?? null])).rows[0];
    if (!row || hash(row.definition) !== row.content_hash) throw new Gone();
    return row;
  }
  async function pinnedCard(tx: Db, row: AntragRow): Promise<FigurantragCard> {
    // Historical requests remain readable even if their template was later archived. The immutable
    // revision is the authority for the package pin, not today's template head or campaign default.
    const revision = (await tx.query<{ definition: ActorTemplateData; content_hash: string }>(
      "SELECT definition,content_hash FROM actor_template_revisions WHERE template_id=$1 AND campaign_id=$2 AND revision=$3",
      [row.template_id, row.campaign_id, row.template_revision],
    )).rows[0];
    if (!revision || hash(revision.definition) !== revision.content_hash) throw new Gone();
    return card(row, revision.definition.package);
  }
  async function released(tx: Db, campaignId: string, id: string): Promise<boolean> {
    return !!(await tx.query("SELECT 1 FROM figurvorlagen_freigaben WHERE template_id=$1 AND campaign_id=$2 AND revoked_at IS NULL", [id, campaignId])).rowCount;
  }
  function merged(pkg: AnyRulePackage, definition: ActorTemplateData, delta: Record<string, unknown>) {
    const basis = validatePackageFields(pkg, definition.fields);
    for (const key of Object.keys(delta)) if (!Object.hasOwn(basis, key)) throw new ActorValidationError("Diese Vorlage kennt eines der angegebenen Felder nicht.");
    return validatePackageFields(pkg, { ...basis, ...delta });
  }

  /** Product list projection: every request carries the package pin of its exact template revision. */
  async function liste(userId: string, campaignId: string): Promise<FigurantragCard[]> {
    return db.transaction(async tx => {
      const current = await member(tx, userId, campaignId, ["leitung", "spieler"]);
      const rows = current.role === "leitung"
        ? (await tx.query<AntragRow>("SELECT * FROM figurantraege WHERE campaign_id=$1 AND state='offen' ORDER BY created_at,id", [campaignId])).rows
        : (await tx.query<AntragRow>("SELECT * FROM figurantraege WHERE campaign_id=$1 AND antragsteller=$2 ORDER BY created_at,id", [campaignId, userId])).rows;
      return Promise.all(rows.map(row => pinnedCard(tx, row)));
    });
  }

  async function freigegebeneVorlagen(userId: string, campaignId: string): Promise<FreigegebeneVorlageCard[]> {
    return db.transaction(async tx => {
      await member(tx, userId, campaignId, ["leitung", "spieler"]);
      const rows = (await tx.query<{ id: string; version: number; definition: ActorTemplateData; content_hash: string }>(`SELECT t.id,t.version,r.definition,r.content_hash
        FROM figurvorlagen_freigaben f JOIN actor_templates t ON t.id=f.template_id AND t.campaign_id=f.campaign_id
        JOIN actor_template_revisions r ON r.template_id=t.id AND r.campaign_id=t.campaign_id AND r.revision=t.head_revision
        WHERE f.campaign_id=$1 AND f.revoked_at IS NULL AND t.archived_at IS NULL ORDER BY t.created_at,t.id`, [campaignId])).rows;
      return rows.map(row => {
        if (hash(row.definition) !== row.content_hash) throw new Gone();
        return { id: row.id, name: row.definition.name, art: row.definition.kind, anfangswerte: { ...row.definition.fields }, version: row.version,
          package: { ...row.definition.package } };
      });
    });
  }

  async function beantragen(userId: string, campaignId: string, commandId: string, body: FigurantragBody): Promise<FigurantragCard> {
    const request = { campaignId, operation: "figurantrag.beantragen", input: { commandId, ...body } }, requestHash = hash(request);
    return db.transaction(async tx => {
      await member(tx, userId, campaignId, ["spieler"]);
      const old = (await tx.query<{ campaign_id: string; actor_user_id: string; request_hash: string; ack: FigurantragCard }>(
        "SELECT campaign_id,actor_user_id,request_hash,ack FROM figurantrag_events WHERE command_id=$1", [commandId])).rows[0];
      if (old) {
        if (old.campaign_id !== campaignId || old.actor_user_id !== userId || old.request_hash !== requestHash) throw new Conflict();
        const current = (await tx.query<AntragRow>("SELECT * FROM figurantraege WHERE id=$1 AND campaign_id=$2", [old.ack.id, campaignId])).rows[0];
        if (!current) throw new Gone(); return pinnedCard(tx, current);
      }
      const source = await template(tx, campaignId, body.templateId);
      if (!await released(tx, campaignId, body.templateId)) throw new Gone();
      const pkg = await resolveRulePackage(tx, campaignId, source.definition.package);
      const basis = validatePackageFields(pkg, source.definition.fields), all = merged(pkg, source.definition, body.anfangswerte);
      const delta = Object.fromEntries(Object.keys(body.anfangswerte).sort().map(key => [key, all[key] ?? basis[key]]));
      const id = randomUUID(), at = now();
      await tx.query(`INSERT INTO figurantraege(id,campaign_id,antragsteller,template_id,template_revision,name,anfangswerte,state,created_at)
        VALUES($1,$2,$3,$4,$5,$6,$7,'offen',$8)`, [id, campaignId, userId, source.id, source.revision, body.name, JSON.stringify(delta), at]);
      const row = (await tx.query<AntragRow>("SELECT * FROM figurantraege WHERE id=$1 AND campaign_id=$2", [id, campaignId])).rows[0]!;
      const ack = card(row, source.definition.package);
      await tx.query(`INSERT INTO figurantrag_events(command_id,campaign_id,actor_user_id,operation,request_hash,request,payload,ack,created_at)
        VALUES($1,$2,$3,'figurantrag.beantragen',$4,$5,$6,$7,$8)`, [commandId, campaignId, userId, requestHash, JSON.stringify(request), JSON.stringify({ schemaVersion: 1, anfangswerte: delta }), JSON.stringify(ack), at]);
      return ack;
    }).catch((error: unknown) => {
      const pg = error as { code?: string; constraint?: string };
      if (pg?.code === "23505") throw new Conflict();
      throw error;
    });
  }

  async function bestaetigen(userId: string, campaignId: string, id: string, expectedVersion: number) {
    return db.transaction(async tx => {
      await member(tx, userId, campaignId, ["leitung"]);
      const before = (await tx.query<AntragRow>("SELECT * FROM figurantraege WHERE id=$1 AND campaign_id=$2 FOR UPDATE", [id, campaignId])).rows[0];
      if (!before) throw new Gone();
      if (before.state !== "offen" || before.version !== expectedVersion) throw new Conflict();
      if (!await released(tx, campaignId, before.template_id)) throw new Conflict();
      const source = await template(tx, campaignId, before.template_id, before.template_revision);
      const pkg = await resolveRulePackage(tx, campaignId, source.definition.package);
      const values = merged(pkg, source.definition, before.anfangswerte);
      const figure = await instantiatePinnedActorInTx(tx, cfg, userId, campaignId,
        { commandId: before.id, templateId: before.template_id, templateRevision: before.template_revision, name: before.name },
        { createdBy: before.antragsteller, grantTo: before.antragsteller });
      const at = now();
      await tx.query("UPDATE actor_sheets SET fields=$3,version=version+1,updated_at=$4 WHERE actor_id=$1 AND campaign_id=$2", [figure.id, campaignId, JSON.stringify(values), at]);
      await tx.query(`UPDATE figurantraege SET state='bestaetigt',reason=NULL,decided_by=$3,decided_at=$4,actor_id=$5,version=version+1 WHERE id=$1 AND campaign_id=$2`,
        [id, campaignId, userId, at, figure.id]);
      const after = (await tx.query<AntragRow>("SELECT * FROM figurantraege WHERE id=$1 AND campaign_id=$2", [id, campaignId])).rows[0]!;
      const ack = card(after, source.definition.package), request = { campaignId, operation: "figurantrag.bestaetigen", id, expectedVersion, reason: null };
      await tx.query(`INSERT INTO figurantrag_events(command_id,campaign_id,actor_user_id,operation,request_hash,request,payload,ack,created_at)
        VALUES($1,$2,$3,'figurantrag.bestaetigen',$4,$5,$6,$7,$8)`, [randomUUID(), campaignId, userId, hash(request), JSON.stringify(request), JSON.stringify({ schemaVersion: 1, before: card(before, source.definition.package), after: ack }), JSON.stringify(ack), at]);
      return { antrag: ack, actorId: figure.id };
    });
  }

  return { ...base, liste, freigegebeneVorlagen, beantragen, bestaetigen };
}
