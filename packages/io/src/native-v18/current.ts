// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { canonicalJson, type CanonicalValue } from "@chronicle/core";
import { createCurrentCampaignBundle as createPrevious, validateCurrentCampaignBundle as validatePrevious, type CurrentCampaignBundle as PreviousBundle } from "../native-v17/current.ts";
import type { CampaignBundleDataV17 } from "../native-v17/bundle.ts";
import { assertJson, fail, hash, object, list, rejectDuplicateKeys } from "../campaign-v3-json.ts";
import { createCampaignBundleV18, validateCampaignBundleV18, type CampaignBundleV18, type CampaignBundleDataV18 } from "./bundle.ts";
import { CAMPAIGN_V18_TABLES, CAMPAIGN_BUNDLE_V18_LIMITS, emptyCampaignTablesV18, type CampaignTablesV18, type CampaignTableNameV18 } from "./schema.ts";
export type CurrentCampaignBundle = PreviousBundle | CampaignBundleV18;
export function currentCampaignTables(bundle: CurrentCampaignBundle): CampaignTablesV18 { return { ...emptyCampaignTablesV18(), ...bundle.tables }; }
/** Solange keine Kampagne ein Paket aus der Bibliothek genommen hat, bleibt ihre Sicherung eine V17-Datei. */
const REGELARCHIV_TABLES = ["rule_package_archiv"] as const;
export function createCurrentCampaignBundle(data: Parameters<typeof createPrevious>[0] | CampaignBundleDataV18): CurrentCampaignBundle {
  assertJson(data); const tables = object(data.tables, "tables");
  if (REGELARCHIV_TABLES.some(name => Object.hasOwn(tables, name) && list(tables[name], `tables.${name}`).length))
    return createCampaignBundleV18(data as CampaignBundleDataV18);
  const { rule_package_archiv: _genommen, ...previous } = tables;
  return createPrevious({ ...data, tables: previous as unknown as CampaignBundleDataV17["tables"] });
}
export function validateCurrentCampaignBundle(value: unknown): CurrentCampaignBundle { assertJson(value); return object(value, "$").version === 18 ? validateCampaignBundleV18(value) : validatePrevious(value); }
export function parseCurrentCampaignBundle(text: string): CurrentCampaignBundle {
  if (typeof text !== "string" || Buffer.byteLength(text, "utf8") > CAMPAIGN_BUNDLE_V18_LIMITS.bytes) fail("$", "maximum campaign bundle size exceeded");
  rejectDuplicateKeys(text); let value: unknown; try { value = JSON.parse(text); } catch { fail("$", "invalid campaign JSON"); }
  return validateCurrentCampaignBundle(value);
}
export function serializeCurrentCampaignBundle(bundle: CurrentCampaignBundle): string { return canonicalJson(validateCurrentCampaignBundle(bundle) as unknown as CanonicalValue); }
export function currentCampaignSemanticDiff(a: CurrentCampaignBundle, b: CurrentCampaignBundle): readonly CampaignTableNameV18[] {
  const left = currentCampaignTables(validateCurrentCampaignBundle(a)), right = currentCampaignTables(validateCurrentCampaignBundle(b));
  return CAMPAIGN_V18_TABLES.filter(table => hash(left[table.name]) !== hash(right[table.name])).map(table => table.name);
}
