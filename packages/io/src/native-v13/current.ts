// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { canonicalJson, type CanonicalValue } from "@chronicle/core";
import { createCurrentCampaignBundle as createPrevious, validateCurrentCampaignBundle as validatePrevious, type CurrentCampaignBundle as PreviousBundle } from "../native-v12/current.ts";
import type { CampaignBundleDataV12 } from "../native-v12/bundle.ts";
import { CAMPAIGN_V12_TABLES } from "../native-v12/schema.ts";
import { assertJson, fail, hash, object, keys, list, rejectDuplicateKeys } from "../campaign-v3-json.ts";
import { createCampaignBundleV13, validateCampaignBundleV13, type CampaignBundleV13, type CampaignBundleDataV13 } from "./bundle.ts";
import { CAMPAIGN_V13_TABLES, CAMPAIGN_V13_ADDITIONAL_TABLES, CAMPAIGN_BUNDLE_V13_LIMITS, emptyCampaignTablesV13, type CampaignTablesV13, type CampaignTableNameV13 } from "./schema.ts";

export type CurrentCampaignBundle = PreviousBundle | CampaignBundleV13;
/** Normalized in-memory table view only; legacy source envelopes and hashes stay intact. */
export function currentCampaignTables(bundle: CurrentCampaignBundle): CampaignTablesV13 { return { ...emptyCampaignTablesV13(), ...bundle.tables }; }
/**
 * Eine Chronik ohne einen einzigen Geldstand behält ihren v4…v12-Umschlag. Erst die erste Börse
 * verlangt v13 — dieselbe Zurückhaltung wie bei den Bildern in v7, dem Zugangsvorfall in v8, den
 * Gefüge-Kanten in v9, den Kategorien in v10, der Kampfbühne in v11 und den Erleichterungen in
 * v12: kein bestehendes Paket wird allein dadurch neu, dass diese Funktion existiert.
 */
export function createCurrentCampaignBundle(data: CampaignBundleDataV12 | CampaignBundleDataV13): CurrentCampaignBundle {
  assertJson(data); const tables = object(data.tables, "tables");
  keys(tables, CAMPAIGN_V12_TABLES.map(table => table.name), "tables", CAMPAIGN_V13_ADDITIONAL_TABLES.map(table => table.name));
  const boerse = CAMPAIGN_V13_ADDITIONAL_TABLES.some(table => Object.hasOwn(tables, table.name) && list(tables[table.name], `tables.${table.name}`).length > 0);
  if (boerse) return createCampaignBundleV13(data as CampaignBundleDataV13);
  return createPrevious({ ...data, tables: Object.fromEntries(CAMPAIGN_V12_TABLES.map(table => [table.name, data.tables[table.name]])) as unknown as CampaignBundleDataV12["tables"] });
}
export function validateCurrentCampaignBundle(value: unknown): CurrentCampaignBundle {
  assertJson(value); return object(value, "$").version === 13 ? validateCampaignBundleV13(value) : validatePrevious(value);
}
export function parseCurrentCampaignBundle(text: string): CurrentCampaignBundle {
  if (typeof text !== "string" || Buffer.byteLength(text, "utf8") > CAMPAIGN_BUNDLE_V13_LIMITS.bytes) fail("$", "maximum campaign bundle size exceeded");
  rejectDuplicateKeys(text); let value: unknown; try { value = JSON.parse(text); } catch { fail("$", "invalid campaign JSON"); }
  return validateCurrentCampaignBundle(value);
}
export function serializeCurrentCampaignBundle(bundle: CurrentCampaignBundle): string { return canonicalJson(validateCurrentCampaignBundle(bundle) as unknown as CanonicalValue); }
export function currentCampaignSemanticDiff(a: CurrentCampaignBundle, b: CurrentCampaignBundle): readonly CampaignTableNameV13[] {
  const left = currentCampaignTables(validateCurrentCampaignBundle(a)), right = currentCampaignTables(validateCurrentCampaignBundle(b));
  return CAMPAIGN_V13_TABLES.filter(table => hash(left[table.name]) !== hash(right[table.name])).map(table => table.name);
}
