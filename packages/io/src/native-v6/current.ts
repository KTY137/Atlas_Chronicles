// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { canonicalJson, type CanonicalValue } from "@chronicle/core";
import { createCurrentCampaignBundle as createPrevious, validateCurrentCampaignBundle as validatePrevious, type CurrentCampaignBundle as PreviousBundle } from "../native-v5/current.ts";
import type { CampaignBundleDataV4 } from "../native-v4/bundle.ts";
import { CAMPAIGN_V4_TABLES } from "../native-v4/schema.ts";
import { assertJson, fail, hash, object, keys, list, rejectDuplicateKeys } from "../campaign-v3-json.ts";
import { createCampaignBundleV6, validateCampaignBundleV6, type CampaignBundleV6, type CampaignBundleDataV6 } from "./bundle.ts";
import { CAMPAIGN_V6_TABLES, CAMPAIGN_V6_ADDITIONAL_TABLES, CAMPAIGN_BUNDLE_V6_LIMITS, emptyCampaignTablesV6, type CampaignTablesV6, type CampaignTableNameV6 } from "./schema.ts";

export type CurrentCampaignBundle = PreviousBundle | CampaignBundleV6;
/** Normalized in-memory table view only; legacy source envelopes and hashes stay intact. */
export function currentCampaignTables(bundle: CurrentCampaignBundle): CampaignTablesV6 { return { ...emptyCampaignTablesV6(), ...bundle.tables }; }
/** Empty nesting keeps the v4/v5 envelope; any durable entrance, node or receipt requires v6. */
export function createCurrentCampaignBundle(data: CampaignBundleDataV4 | CampaignBundleDataV6): CurrentCampaignBundle {
  assertJson(data); const tables = object(data.tables, "tables");
  keys(tables, CAMPAIGN_V4_TABLES.map(table => table.name), "tables", CAMPAIGN_V6_ADDITIONAL_TABLES.map(table => table.name));
  const nesting = CAMPAIGN_V6_ADDITIONAL_TABLES.some(table => Object.hasOwn(tables, table.name) && list(tables[table.name], `tables.${table.name}`).length > 0);
  if (nesting) return createCampaignBundleV6(data as CampaignBundleDataV6);
  return createPrevious({ ...data, tables: Object.fromEntries(CAMPAIGN_V4_TABLES.map(table => [table.name, data.tables[table.name]])) as unknown as CampaignBundleDataV4["tables"] });
}
export function validateCurrentCampaignBundle(value: unknown): CurrentCampaignBundle {
  assertJson(value); return object(value, "$").version === 6 ? validateCampaignBundleV6(value) : validatePrevious(value);
}
export function parseCurrentCampaignBundle(text: string): CurrentCampaignBundle {
  if (typeof text !== "string" || Buffer.byteLength(text, "utf8") > CAMPAIGN_BUNDLE_V6_LIMITS.bytes) fail("$", "maximum campaign bundle size exceeded");
  rejectDuplicateKeys(text); let value: unknown; try { value = JSON.parse(text); } catch { fail("$", "invalid campaign JSON"); }
  return validateCurrentCampaignBundle(value);
}
export function serializeCurrentCampaignBundle(bundle: CurrentCampaignBundle): string { return canonicalJson(validateCurrentCampaignBundle(bundle) as unknown as CanonicalValue); }
export function currentCampaignSemanticDiff(a: CurrentCampaignBundle, b: CurrentCampaignBundle): readonly CampaignTableNameV6[] {
  const left = currentCampaignTables(validateCurrentCampaignBundle(a)), right = currentCampaignTables(validateCurrentCampaignBundle(b));
  return CAMPAIGN_V6_TABLES.filter(table => hash(left[table.name]) !== hash(right[table.name])).map(table => table.name);
}
