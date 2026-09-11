// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { Value } from "@sinclair/typebox/value";
import { stableJson } from "@chronicle/rules";
import * as P from "../../../protocol/src/actors.ts";
import type { Db } from "../db/index.ts";
import type { DomainConfig } from "./campaigns.ts";
import { ActorValidationError } from "./actors.ts";
import { Conflict, Gone } from "./errors.ts";

interface ActorRow { id: string; name: string; version: number }
interface TemplateRow { id: string; name: string; version: number }
export interface PermanentDeleteReceipt { readonly id: string; readonly name: string; readonly deletedAt: number }

function input(raw: unknown): { commandId: string; expectedVersion: number; reason: string } {
  const copy: unknown = JSON.parse(stableJson(raw));
  if (!Value.Check(P.ArchiveObject, copy)) throw new ActorValidationError("Bitte Grund und aktuellen Stand prüfen.");
  return copy;
}
async function gm(tx: Db, userId: string, campaignId: string): Promise<void> {
  const found = await tx.query(`SELECT 1 FROM campaigns c JOIN campaign_memberships m ON m.campaign_id=c.id
    WHERE c.id=$1 AND m.user_id=$2 AND m.role='leitung' FOR UPDATE OF c FOR SHARE OF m`, [campaignId, userId]);
  if (!found.rowCount) throw new Gone();
}
const fk = (error: unknown) => (error as { code?: string }).code === "23503";

/**
 * Eng begrenzter harter Löschpfad. Die normale Actor-Domain bleibt append-only/archivierbar.
 * Hier darf nur gelöscht werden, solange keine fremde Spielhistorie auf das Objekt zeigt.
 */
export function createActorDeletion(db: Db, cfg: DomainConfig = {}) {
  const now = cfg.now ?? Date.now;

  async function deleteActor(userId: string, campaignId: string, actorId: string, raw: unknown): Promise<PermanentDeleteReceipt> {
    const request = input(raw);
    try {
      return await db.transaction(async tx => {
        await gm(tx, userId, campaignId);
        const actor = (await tx.query<ActorRow>(`SELECT a.id,a.name,p.version FROM actors a JOIN actor_profiles p
          ON p.actor_id=a.id AND p.campaign_id=a.campaign_id WHERE a.id=$1 AND a.campaign_id=$2 FOR UPDATE OF a,p`, [actorId, campaignId])).rows[0];
        if (!actor) throw new Gone();
        if (actor.version !== request.expectedVersion) throw new Conflict();

        // Historie eines ANDEREN Objekts darf nie still mitverschwinden. Insbesondere Reader-
        // Perspektiven und Gegenstandsquittungen enthalten Actor-IDs nur in JSON und haben daher
        // keinen SQL-Fremdschlüssel, der uns automatisch schützen könnte.
        const external = await tx.query(`SELECT 1 FROM actor_inventory_events WHERE campaign_id=$1 AND subject_id<>$2 AND (
          request #>> '{input,actorId}'=$2 OR request #>> '{input,holderActorId}'=$2 OR
          before_state ->> 'actorId'=$2 OR after_state ->> 'actorId'=$2 OR result ->> 'actorId'=$2 OR
          before_state ->> 'holderActorId'=$2 OR after_state ->> 'holderActorId'=$2 OR result ->> 'holderActorId'=$2
        ) LIMIT 1`, [campaignId, actorId]);
        if (external.rowCount) throw new ActorValidationError("Diese Figur kommt bereits in der Historie eines anderen Objekts vor. Archiviere sie stattdessen.");

        await tx.query("SELECT set_config('chronicle.deleting_actor', $1, true)", [actorId]);
        // Die Mitgliedschaft selbst bleibt bestehen; nur ihre optionale alte Primärfigur fällt weg.
        await tx.query("UPDATE campaign_memberships SET actor_id=NULL WHERE campaign_id=$1 AND actor_id=$2", [campaignId, actorId]);
        await tx.query("UPDATE reader_perspectives SET actor_id=NULL,version=version+1,updated_at=$3 WHERE campaign_id=$1 AND actor_id=$2", [campaignId, actorId, now()]);
        await tx.query("DELETE FROM actor_controllers WHERE campaign_id=$1 AND actor_id=$2", [campaignId, actorId]);
        await tx.query("DELETE FROM actor_sheets WHERE campaign_id=$1 AND actor_id=$2", [campaignId, actorId]);
        await tx.query(`DELETE FROM actor_inventory_events WHERE campaign_id=$1 AND subject_id=$2
          AND operation IN ('actor.instantiate','actor.update','actor.archive','actor.controller.grant','actor.controller.revoke')`, [campaignId, actorId]);
        // Wuerfe, Briefe, Szenen, Inventar, Antraege usw. behalten ihre Fremdschluessel. Gibt es
        // davon etwas, rollt die gesamte Transaktion zurück und unten entsteht eine klare Meldung.
        await tx.query("DELETE FROM actor_profiles WHERE campaign_id=$1 AND actor_id=$2", [campaignId, actorId]);
        await tx.query("DELETE FROM actors WHERE campaign_id=$1 AND id=$2", [campaignId, actorId]);
        return { id: actor.id, name: actor.name, deletedAt: now() };
      });
    } catch (error) {
      if (fk(error)) throw new ActorValidationError("Diese Figur wird noch von Inventar, Würfen, Szenen, Nachrichten oder anderer Historie verwendet. Archiviere sie stattdessen.");
      throw error;
    }
  }

  async function deleteActorTemplate(userId: string, campaignId: string, templateId: string, raw: unknown): Promise<PermanentDeleteReceipt> {
    const request = input(raw);
    try {
      return await db.transaction(async tx => {
        await gm(tx, userId, campaignId);
        const template = (await tx.query<TemplateRow>(`SELECT t.id,t.version,r.definition->>'name' AS name FROM actor_templates t
          JOIN actor_template_revisions r ON r.template_id=t.id AND r.campaign_id=t.campaign_id AND r.revision=t.head_revision
          WHERE t.id=$1 AND t.campaign_id=$2 FOR UPDATE OF t,r`, [templateId, campaignId])).rows[0];
        if (!template) throw new Gone();
        if (template.version !== request.expectedVersion) throw new Conflict();

        const actorUse = await tx.query(`SELECT 1 FROM actor_inventory_events
          WHERE campaign_id=$1 AND operation='actor.instantiate' AND request #>> '{input,templateId}'=$2 LIMIT 1`, [campaignId, templateId]);
        const applicationUse = await tx.query(`SELECT 1 FROM figurantrag_events
          WHERE campaign_id=$1 AND (request ->> 'templateId'=$2 OR request #>> '{input,templateId}'=$2) LIMIT 1`, [campaignId, templateId]);
        if (actorUse.rowCount || applicationUse.rowCount)
          throw new ActorValidationError("Diese Figurvorlage wurde bereits benutzt oder freigegeben. Archiviere sie stattdessen, damit historische Belege gültig bleiben.");

        await tx.query("SELECT set_config('chronicle.deleting_actor_template', $1, true)", [templateId]);
        await tx.query("DELETE FROM figurvorlagen_freigaben WHERE campaign_id=$1 AND template_id=$2", [campaignId, templateId]);
        await tx.query(`DELETE FROM actor_inventory_events WHERE campaign_id=$1 AND subject_id=$2
          AND operation IN ('actor.template.create','actor.template.revise','actor.template.archive')`, [campaignId, templateId]);
        // actor_template_head ist DEFERRABLE; die Revisionen muessen wegen ihres FK auf den Header
        // zuerst weg, danach ist die Transaktion als Ganzes wieder konsistent.
        await tx.query("DELETE FROM actor_template_revisions WHERE campaign_id=$1 AND template_id=$2", [campaignId, templateId]);
        await tx.query("DELETE FROM actor_templates WHERE campaign_id=$1 AND id=$2", [campaignId, templateId]);
        return { id: template.id, name: template.name, deletedAt: now() };
      });
    } catch (error) {
      if (fk(error)) throw new ActorValidationError("Diese Figurvorlage wird noch von einer Figur, einem Antrag oder anderer Historie verwendet. Archiviere sie stattdessen.");
      throw error;
    }
  }

  return { deleteActor, deleteActorTemplate };
}
