// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { createHash } from "node:crypto";
import {
  DEMO_RULE_PACKAGE,
  defaultSupportedActorFields,
  parseSupportedRulePackage,
  previewSupportedPackageMigration,
  stableJson,
  validatePackageFields,
  type AnyRulePackage,
} from "@chronicle/rules";
import type { Scalar } from "@chronicle/rules";
import type { Db } from "../db/index.ts";
import type { DomainConfig } from "./campaigns.ts";
import { Conflict, Gone } from "./errors.ts";
import { resolveRulePackage } from "./rule-package-resolution.ts";

/** Preview fingerprints use stable JSON too, but are not stored package-content hashes. */
const digest = (value: unknown) => createHash("sha256").update(stableJson(value)).digest("hex");
interface SheetRow { actor_id: string; fields: Record<string, Scalar>; package_id: string; package_version: string; version: number }
interface Pin { id: string; version: string }

export function createRuleActivation(db: Db, cfg: DomainConfig = {}) {
  const now = cfg.now ?? Date.now;
  async function authorize(tx: Db, userId: string, campaignId: string): Promise<void> {
    const row = (await tx.query<{ role: string }>(`SELECT m.role FROM campaigns c JOIN campaign_memberships m ON m.campaign_id=c.id
      WHERE c.id=$1 AND m.user_id=$2 FOR UPDATE OF c FOR SHARE OF m`, [campaignId, userId])).rows[0];
    if (!row || row.role !== "leitung") throw new Gone();
  }
  async function currentPin(tx: Db, campaignId: string): Promise<Pin> {
    const row = (await tx.query<{ package_id: string; package_version: string }>(
      "SELECT package_id,package_version FROM campaign_rule_pins WHERE campaign_id=$1", [campaignId])).rows[0];
    return row ? { id: row.package_id, version: row.package_version } : { id: DEMO_RULE_PACKAGE.id, version: DEMO_RULE_PACKAGE.version };
  }
  async function review(tx: Db, campaignId: string, next: AnyRulePackage, expectedHash?: string) {
    const from = await currentPin(tx, campaignId), previous = await resolveRulePackage(tx, campaignId, from);
    const pinVersion = (await tx.query<{ version: number }>("SELECT version FROM campaign_rule_pins WHERE campaign_id=$1", [campaignId])).rows[0]?.version ?? 0;
    const sheets = (await tx.query<SheetRow>(
      "SELECT actor_id,fields,package_id,package_version,version FROM actor_sheets WHERE campaign_id=$1 ORDER BY actor_id COLLATE \"C\"", [campaignId])).rows;
    // Only sheets following the old campaign default migrate. Explicitly pinned sheets are
    // independent actors and are deliberately excluded from this default switch.
    const followers = sheets.filter(sheet => sheet.package_id === from.id && sheet.package_version === from.version);
    if (next.schemaVersion === 2) defaultSupportedActorFields(next);
    if (previous.schemaVersion === 2) for (const actor of followers) validatePackageFields(previous, actor.fields);
    const to = { id: next.id, version: next.version };
    const previewHash = digest({ schemaVersion: 2, campaignId, previous, next, pinVersion, followers });
    if (expectedHash !== undefined && expectedHash !== previewHash) throw new Conflict();
    const migration = followers.length && (from.id !== to.id || from.version !== to.version)
      ? previewSupportedPackageMigration(previous, next, followers.map(sheet => ({ id: sheet.actor_id, fields: sheet.fields }))) : null;
    return { from, to, pinVersion, migration, previewHash, followerCount: followers.length, pinnedCount: sheets.length - followers.length };
  }
  async function previewPackage(userId: string, campaignId: string, input: unknown) {
    return db.transaction(async tx => {
      await authorize(tx, userId, campaignId);
      return review(tx, campaignId, parseSupportedRulePackage(input));
    });
  }
  async function activatePackage(userId: string, campaignId: string, input: { packageId: string; packageVersion: string; expectedVersion: number; previewHash?: string }) {
    return db.transaction(async tx => {
      await authorize(tx, userId, campaignId);
      const pinRow = (await tx.query<{ version: number }>("SELECT version FROM campaign_rule_pins WHERE campaign_id=$1", [campaignId])).rows[0];
      if (input.expectedVersion !== (pinRow?.version ?? 0)) throw new Conflict();
      const next = await resolveRulePackage(tx, campaignId, { id: input.packageId, version: input.packageVersion });
      const state = await review(tx, campaignId, next, input.previewHash);
      if (state.migration) {
        for (const entity of state.migration.entities) await tx.query(
          "UPDATE actor_sheets SET fields=$3,package_id=$4,package_version=$5,version=version+1,updated_at=$6 WHERE actor_id=$1 AND campaign_id=$2",
          [entity.id, campaignId, entity.after, next.id, next.version, now()]);
        await tx.query("INSERT INTO audit(campaign_id,actor_user_id,kind,data,created_at) VALUES($1,$2,'rules.migration',$3,$4)",
          [campaignId, userId, state.migration, now()]);
      }
      const version = (pinRow?.version ?? 0) + 1;
      await tx.query(`INSERT INTO campaign_rule_pins(campaign_id,package_id,package_version,version) VALUES($1,$2,$3,$4)
        ON CONFLICT(campaign_id) DO UPDATE SET package_id=EXCLUDED.package_id,package_version=EXCLUDED.package_version,version=EXCLUDED.version`,
        [campaignId, next.id, next.version, version]);
      return { pin: { id: next.id, version: next.version }, version };
    });
  }
  return { previewPackage, activatePackage };
}
