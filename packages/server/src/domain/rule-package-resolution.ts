// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import {
  DEMO_RULE_PACKAGE,
  parseSupportedRulePackage,
  supportedPackageContentHash,
  type AnyRulePackage,
  type PackagePin,
} from "@chronicle/rules";
import type { Db } from "../db/index.ts";
import { Gone } from "./errors.ts";

/**
 * Resolve exactly one immutable rule package for a campaign.
 *
 * `rule_packages.content_hash` is the rules package hash: SHA-256 over the rules `stableJson`
 * representation. It is intentionally NOT `@chronicle/core`'s canonical hash. Keeping this
 * check in one place prevents actor/template/runtime paths from silently choosing different hash
 * dialects and rejecting valid non-demo packages as corrupt.
 */
export async function resolveRulePackage(db: Db, campaignId: string, pin: PackagePin): Promise<AnyRulePackage> {
  const row = (await db.query<{ document: unknown; content_hash: string }>(
    "SELECT document,content_hash FROM rule_packages WHERE campaign_id=$1 AND package_id=$2 AND version=$3",
    [campaignId, pin.id, pin.version],
  )).rows[0];
  if (row) {
    try {
      const pkg = parseSupportedRulePackage(row.document);
      if (supportedPackageContentHash(pkg) !== row.content_hash) throw new Gone("corrupt-package");
      return pkg;
    } catch (error) {
      if (error instanceof Gone) throw error;
      throw new Gone("corrupt-package");
    }
  }
  if (pin.id === DEMO_RULE_PACKAGE.id && pin.version === DEMO_RULE_PACKAGE.version) return DEMO_RULE_PACKAGE;
  throw new Gone("package");
}
