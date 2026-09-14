// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import {
  buildRuleRuntime,
  previewRuleRuntime,
  supportedPackageContentHash,
  type PackagePin,
} from "@chronicle/rules";
import type { Db } from "../db/index.ts";
import { createCampaigns } from "./campaigns.ts";
import { Conflict } from "./errors.ts";
import { resolveRulePackage } from "./rule-package-resolution.ts";

/**
 * Read-only, host-authoritative rules projection used by sheet/template editors.
 * It deliberately lives outside the gameplay command aggregate: reading or previewing
 * another installed package must never activate it or mutate an actor.
 */
export function createRuleRuntimeDomain(db: Db) {
  const campaigns = createCampaigns(db);

  async function runtime(userId: string, campaignId: string, pin: PackagePin) {
    await campaigns.requireMember(userId, campaignId);
    return buildRuleRuntime(await resolveRulePackage(db, campaignId, pin));
  }

  async function preview(userId: string, campaignId: string, pin: PackagePin, contentHash: string, fields: unknown) {
    await campaigns.requireMember(userId, campaignId);
    const pkg = await resolveRulePackage(db, campaignId, pin);
    if (supportedPackageContentHash(pkg) !== contentHash) throw new Conflict("Das Regelpaket wurde geändert. Bitte erneut laden.");
    return previewRuleRuntime(pkg, fields);
  }

  async function assertContentHash(userId: string, campaignId: string, pin: PackagePin, contentHash: string) {
    await campaigns.requireMember(userId, campaignId);
    const pkg = await resolveRulePackage(db, campaignId, pin);
    if (supportedPackageContentHash(pkg) !== contentHash) throw new Conflict("Das Regelpaket wurde geändert. Bitte erneut laden.");
  }

  return { runtime, preview, assertContentHash };
}
