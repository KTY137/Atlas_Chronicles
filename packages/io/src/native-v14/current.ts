// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { canonicalJson, type CanonicalValue } from "@chronicle/core";
import { createCurrentCampaignBundle as createPrevious, validateCurrentCampaignBundle as validatePrevious, type CurrentCampaignBundle as PreviousBundle } from "../native-v13/current.ts";
import type { CampaignBundleDataV13 } from "../native-v13/bundle.ts";
import { CAMPAIGN_V13_TABLES } from "../native-v13/schema.ts";
import { assertJson, fail, hash, object, keys, list, rejectDuplicateKeys } from "../campaign-v3-json.ts";
import { createCampaignBundleV14, validateCampaignBundleV14, type CampaignBundleV14, type CampaignBundleDataV14 } from "./bundle.ts";
import { CAMPAIGN_V14_TABLES, CAMPAIGN_V14_ADDITIONAL_TABLES, CAMPAIGN_BUNDLE_V14_LIMITS, emptyCampaignTablesV14, type CampaignTablesV14, type CampaignTableNameV14 } from "./schema.ts";

export type CurrentCampaignBundle = PreviousBundle | CampaignBundleV14;
/** Normalized in-memory table view only; legacy source envelopes and hashes stay intact. */
export function currentCampaignTables(bundle: CurrentCampaignBundle): CampaignTablesV14 { return { ...emptyCampaignTablesV14(), ...bundle.tables }; }
/** Empty cartography preserves the existing source envelope; only retained rows require v14. */
export function createCurrentCampaignBundle(data: CampaignBundleDataV13 | CampaignBundleDataV14): CurrentCampaignBundle {
  assertJson(data); const tables = object(data.tables, "tables");
  keys(tables, CAMPAIGN_V13_TABLES.map(table => table.name), "tables", CAMPAIGN_V14_ADDITIONAL_TABLES.map(table => table.name));
  const cartography = CAMPAIGN_V14_ADDITIONAL_TABLES.some(table => Object.hasOwn(tables, table.name) && list(tables[table.name], `tables.${table.name}`).length > 0);
  if (cartography) return createCampaignBundleV14(data as CampaignBundleDataV14);
  return createPrevious({ ...data, tables: Object.fromEntries(CAMPAIGN_V13_TABLES.map(table => [table.name, data.tables[table.name]])) as unknown as CampaignBundleDataV13["tables"] });
}
export function validateCurrentCampaignBundle(value: unknown): CurrentCampaignBundle {
  assertJson(value); return object(value, "$").version === 14 ? validateCampaignBundleV14(value) : validatePrevious(value);
}
export function parseCurrentCampaignBundle(text: string): CurrentCampaignBundle {
  if (typeof text !== "string" || Buffer.byteLength(text, "utf8") > CAMPAIGN_BUNDLE_V14_LIMITS.bytes) fail("$", "maximum campaign bundle size exceeded");
  rejectDuplicateKeys(text); let value: unknown; try { value = JSON.parse(text); } catch { fail("$", "invalid campaign JSON"); }
  return validateCurrentCampaignBundle(value);
}
export function serializeCurrentCampaignBundle(bundle: CurrentCampaignBundle): string { return canonicalJson(validateCurrentCampaignBundle(bundle) as unknown as CanonicalValue); }
export function currentCampaignSemanticDiff(a: CurrentCampaignBundle, b: CurrentCampaignBundle): readonly CampaignTableNameV14[] {
  const left = currentCampaignTables(validateCurrentCampaignBundle(a)), right = currentCampaignTables(validateCurrentCampaignBundle(b));
  return CAMPAIGN_V14_TABLES.filter(table => hash(left[table.name]) !== hash(right[table.name])).map(table => table.name);
}
