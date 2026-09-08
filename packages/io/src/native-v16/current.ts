// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { canonicalJson, type CanonicalValue } from "@chronicle/core";
import { createCurrentCampaignBundle as createPrevious, validateCurrentCampaignBundle as validatePrevious, type CurrentCampaignBundle as PreviousBundle } from "../native-v15/current.ts";
import type { CampaignBundleDataV15 } from "../native-v15/bundle.ts";
import { assertJson, fail, hash, object, list, rejectDuplicateKeys } from "../campaign-v3-json.ts";
import { createCampaignBundleV16, validateCampaignBundleV16, type CampaignBundleV16, type CampaignBundleDataV16 } from "./bundle.ts";
import { CAMPAIGN_V16_TABLES, CAMPAIGN_BUNDLE_V16_LIMITS, emptyCampaignTablesV16, type CampaignTablesV16, type CampaignTableNameV16 } from "./schema.ts";
export type CurrentCampaignBundle = PreviousBundle | CampaignBundleV16;
export function currentCampaignTables(bundle: CurrentCampaignBundle): CampaignTablesV16 { return { ...emptyCampaignTablesV16(), ...bundle.tables }; }
export function createCurrentCampaignBundle(data: Parameters<typeof createPrevious>[0] | CampaignBundleDataV16): CurrentCampaignBundle {
  assertJson(data); const tables = object(data.tables, "tables");
  if ((Object.hasOwn(tables, "chronist_laeufe") && list(tables.chronist_laeufe, "tables.chronist_laeufe").length) || (Object.hasOwn(tables, "chronist_vorschlaege") && list(tables.chronist_vorschlaege, "tables.chronist_vorschlaege").length))
    return createCampaignBundleV16(data as CampaignBundleDataV16);
  const { chronist_laeufe: _runs,chronist_vorschlaege:_proposals, ...previous } = tables;
  return createPrevious({ ...data, tables: previous as unknown as CampaignBundleDataV15["tables"] });
}
export function validateCurrentCampaignBundle(value: unknown): CurrentCampaignBundle { assertJson(value); return object(value, "$").version === 16 ? validateCampaignBundleV16(value) : validatePrevious(value); }
export function parseCurrentCampaignBundle(text: string): CurrentCampaignBundle {
  if (typeof text !== "string" || Buffer.byteLength(text, "utf8") > CAMPAIGN_BUNDLE_V16_LIMITS.bytes) fail("$", "maximum campaign bundle size exceeded");
  rejectDuplicateKeys(text); let value: unknown; try { value = JSON.parse(text); } catch { fail("$", "invalid campaign JSON"); }
  return validateCurrentCampaignBundle(value);
}
export function serializeCurrentCampaignBundle(bundle: CurrentCampaignBundle): string { return canonicalJson(validateCurrentCampaignBundle(bundle) as unknown as CanonicalValue); }
export function currentCampaignSemanticDiff(a: CurrentCampaignBundle, b: CurrentCampaignBundle): readonly CampaignTableNameV16[] {
  const left = currentCampaignTables(validateCurrentCampaignBundle(a)), right = currentCampaignTables(validateCurrentCampaignBundle(b));
  return CAMPAIGN_V16_TABLES.filter(table => hash(left[table.name]) !== hash(right[table.name])).map(table => table.name);
}
