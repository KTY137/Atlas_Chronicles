// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { canonicalJson, type CanonicalValue } from "@chronicle/core";
import { createCurrentCampaignBundle as createPrevious, validateCurrentCampaignBundle as validatePrevious, type CurrentCampaignBundle as PreviousBundle } from "../native-v22/current.ts";
import { assertJson, fail, hash, object, list, rejectDuplicateKeys } from "../campaign-v3-json.ts";
import { createCampaignBundleV23, validateCampaignBundleV23, type CampaignBundleV23, type CampaignBundleDataV23 } from "./bundle.ts";
import { CAMPAIGN_V23_TABLES, CAMPAIGN_BUNDLE_V23_LIMITS, emptyCampaignTablesV23, type CampaignTablesV23, type CampaignTableNameV23 } from "./schema.ts";
export type CurrentCampaignBundle = PreviousBundle | CampaignBundleV23;
export function currentCampaignTables(bundle: CurrentCampaignBundle): CampaignTablesV23 { return { ...emptyCampaignTablesV23(), ...bundle.tables }; }
/** Solange keine Szene das Geschoss gewechselt hat, bleibt die bisherige Formatversion der Sicherung erhalten. */
export function createCurrentCampaignBundle(data: Parameters<typeof createPrevious>[0] | CampaignBundleDataV23): CurrentCampaignBundle {
  assertJson(data); const tables = object(data.tables, "tables");
  if (Object.hasOwn(tables, "session_floor_states") && list(tables.session_floor_states, "tables.session_floor_states").length)
    return createCampaignBundleV23(data as CampaignBundleDataV23);
  const { session_floor_states: _geschosse, ...previous } = tables;
  return createPrevious({ ...data, tables: previous as unknown as Parameters<typeof createPrevious>[0]["tables"] });
}
export function validateCurrentCampaignBundle(value: unknown): CurrentCampaignBundle { assertJson(value); return object(value, "$").version === 23 ? validateCampaignBundleV23(value) : validatePrevious(value); }
export function parseCurrentCampaignBundle(text: string): CurrentCampaignBundle {
  if (typeof text !== "string" || Buffer.byteLength(text, "utf8") > CAMPAIGN_BUNDLE_V23_LIMITS.bytes) fail("$", "maximum campaign bundle size exceeded");
  rejectDuplicateKeys(text); let value: unknown; try { value = JSON.parse(text); } catch { fail("$", "invalid campaign JSON"); }
  return validateCurrentCampaignBundle(value);
}
export function serializeCurrentCampaignBundle(bundle: CurrentCampaignBundle): string { return canonicalJson(validateCurrentCampaignBundle(bundle) as unknown as CanonicalValue); }
export function currentCampaignSemanticDiff(a: CurrentCampaignBundle, b: CurrentCampaignBundle): readonly CampaignTableNameV23[] {
  const left = currentCampaignTables(validateCurrentCampaignBundle(a)), right = currentCampaignTables(validateCurrentCampaignBundle(b));
  return CAMPAIGN_V23_TABLES.filter(table => hash(left[table.name]) !== hash(right[table.name])).map(table => table.name);
}
