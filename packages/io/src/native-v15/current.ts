// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { canonicalJson, type CanonicalValue } from "@chronicle/core";
import { createCurrentCampaignBundle as createPrevious, validateCurrentCampaignBundle as validatePrevious, type CurrentCampaignBundle as PreviousBundle } from "../native-v14/current.ts";
import type { CampaignBundleDataV14 } from "../native-v14/bundle.ts";
import { assertJson, fail, hash, object, list, rejectDuplicateKeys } from "../campaign-v3-json.ts";
import { createCampaignBundleV15, validateCampaignBundleV15, type CampaignBundleV15, type CampaignBundleDataV15 } from "./bundle.ts";
import { CAMPAIGN_V15_TABLES, CAMPAIGN_BUNDLE_V15_LIMITS, emptyCampaignTablesV15, type CampaignTablesV15, type CampaignTableNameV15 } from "./schema.ts";
export type CurrentCampaignBundle = PreviousBundle | CampaignBundleV15;
export function currentCampaignTables(bundle: CurrentCampaignBundle): CampaignTablesV15 { return { ...emptyCampaignTablesV15(), ...bundle.tables }; }
export function createCurrentCampaignBundle(data: Parameters<typeof createPrevious>[0] | CampaignBundleDataV15): CurrentCampaignBundle {
  assertJson(data); const tables = object(data.tables, "tables");
  if (Object.hasOwn(tables, "map_lifecycle_events") && list(tables.map_lifecycle_events, "tables.map_lifecycle_events").length)
    return createCampaignBundleV15(data as CampaignBundleDataV15);
  const { map_lifecycle_events: _empty, ...previous } = tables;
  return createPrevious({ ...data, tables: previous as unknown as CampaignBundleDataV14["tables"] });
}
export function validateCurrentCampaignBundle(value: unknown): CurrentCampaignBundle { assertJson(value); return object(value, "$").version === 15 ? validateCampaignBundleV15(value) : validatePrevious(value); }
export function parseCurrentCampaignBundle(text: string): CurrentCampaignBundle {
  if (typeof text !== "string" || Buffer.byteLength(text, "utf8") > CAMPAIGN_BUNDLE_V15_LIMITS.bytes) fail("$", "maximum campaign bundle size exceeded");
  rejectDuplicateKeys(text); let value: unknown; try { value = JSON.parse(text); } catch { fail("$", "invalid campaign JSON"); }
  return validateCurrentCampaignBundle(value);
}
export function serializeCurrentCampaignBundle(bundle: CurrentCampaignBundle): string { return canonicalJson(validateCurrentCampaignBundle(bundle) as unknown as CanonicalValue); }
export function currentCampaignSemanticDiff(a: CurrentCampaignBundle, b: CurrentCampaignBundle): readonly CampaignTableNameV15[] {
  const left = currentCampaignTables(validateCurrentCampaignBundle(a)), right = currentCampaignTables(validateCurrentCampaignBundle(b));
  return CAMPAIGN_V15_TABLES.filter(table => hash(left[table.name]) !== hash(right[table.name])).map(table => table.name);
}
