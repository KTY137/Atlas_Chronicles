// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { canonicalJson, type CanonicalValue } from "@chronicle/core";
import { createCurrentCampaignBundle as createPrevious, validateCurrentCampaignBundle as validatePrevious, type CurrentCampaignBundle as PreviousBundle } from "../native-v21/current.ts";
import { assertJson, fail, hash, object, list, rejectDuplicateKeys } from "../campaign-v3-json.ts";
import { createCampaignBundleV22, validateCampaignBundleV22, type CampaignBundleV22, type CampaignBundleDataV22 } from "./bundle.ts";
import { CAMPAIGN_V22_TABLES, CAMPAIGN_BUNDLE_V22_LIMITS, emptyCampaignTablesV22, type CampaignTablesV22, type CampaignTableNameV22 } from "./schema.ts";
export type CurrentCampaignBundle = PreviousBundle | CampaignBundleV22;
export function currentCampaignTables(bundle: CurrentCampaignBundle): CampaignTablesV22 { return { ...emptyCampaignTablesV22(), ...bundle.tables }; }
/** Solange keine Karte eine eigene Lage hat, bleibt die bisherige Formatversion der Sicherung erhalten. */
export function createCurrentCampaignBundle(data: Parameters<typeof createPrevious>[0] | CampaignBundleDataV22): CurrentCampaignBundle {
  assertJson(data); const tables = object(data.tables, "tables");
  if (Object.hasOwn(tables, "kampf_karten") && list(tables.kampf_karten, "tables.kampf_karten").length)
    return createCampaignBundleV22(data as CampaignBundleDataV22);
  const { kampf_karten: _karten, ...previous } = tables;
  return createPrevious({ ...data, tables: previous as unknown as Parameters<typeof createPrevious>[0]["tables"] });
}
export function validateCurrentCampaignBundle(value: unknown): CurrentCampaignBundle { assertJson(value); return object(value, "$").version === 22 ? validateCampaignBundleV22(value) : validatePrevious(value); }
export function parseCurrentCampaignBundle(text: string): CurrentCampaignBundle {
  if (typeof text !== "string" || Buffer.byteLength(text, "utf8") > CAMPAIGN_BUNDLE_V22_LIMITS.bytes) fail("$", "maximum campaign bundle size exceeded");
  rejectDuplicateKeys(text); let value: unknown; try { value = JSON.parse(text); } catch { fail("$", "invalid campaign JSON"); }
  return validateCurrentCampaignBundle(value);
}
export function serializeCurrentCampaignBundle(bundle: CurrentCampaignBundle): string { return canonicalJson(validateCurrentCampaignBundle(bundle) as unknown as CanonicalValue); }
export function currentCampaignSemanticDiff(a: CurrentCampaignBundle, b: CurrentCampaignBundle): readonly CampaignTableNameV22[] {
  const left = currentCampaignTables(validateCurrentCampaignBundle(a)), right = currentCampaignTables(validateCurrentCampaignBundle(b));
  return CAMPAIGN_V22_TABLES.filter(table => hash(left[table.name]) !== hash(right[table.name])).map(table => table.name);
}
