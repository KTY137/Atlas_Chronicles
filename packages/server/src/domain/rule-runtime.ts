// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { createHash } from "node:crypto";
import {
  DEMO_RULE_PACKAGE,
  buildRuleRuntime,
  parseSupportedRulePackage,
  previewRuleRuntime,
  stableJson,
  supportedPackageContentHash,
  type AnyRulePackage,
  type PackagePin,
} from "@chronicle/rules";
import type { Db } from "../db/index.ts";
import { createCampaigns } from "./campaigns.ts";
import { Conflict, Gone } from "./errors.ts";

const digest = (value: unknown) => createHash("sha256").update(stableJson(value)).digest("hex");

/**
 * Read-only, host-authoritative rules projection used by sheet/template editors.
 * It deliberately lives outside the gameplay command aggregate: reading or previewing
 * another installed package must never activate it or mutate an actor.
 */
export function createRuleRuntimeDomain(db: Db) {
  const campaigns = createCampaigns(db);

  async function packageFor(campaignId: string, pin: PackagePin): Promise<AnyRulePackage> {
    const row = (await db.query<{ document: AnyRulePackage; content_hash: string }>(
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

  async function runtime(userId: string, campaignId: string, pin: PackagePin) {
    await campaigns.requireMember(userId, campaignId);
    return buildRuleRuntime(await packageFor(campaignId, pin));
  }

  async function preview(userId: string, campaignId: string, pin: PackagePin, contentHash: string, fields: unknown) {
    await campaigns.requireMember(userId, campaignId);
    const pkg = await packageFor(campaignId, pin);
    if (supportedPackageContentHash(pkg) !== contentHash) throw new Conflict("Das Regelpaket wurde geändert. Bitte erneut laden.");
    return previewRuleRuntime(pkg, fields);
  }

  async function assertContentHash(userId: string, campaignId: string, pin: PackagePin, contentHash: string) {
    await campaigns.requireMember(userId, campaignId);
    const pkg = await packageFor(campaignId, pin);
    if (supportedPackageContentHash(pkg) !== contentHash) throw new Conflict("Das Regelpaket wurde geändert. Bitte erneut laden.");
  }

  return { runtime, preview, assertContentHash };
}
