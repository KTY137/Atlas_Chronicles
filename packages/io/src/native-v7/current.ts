import { canonicalJson, type CanonicalValue } from "@chronicle/core";
import { createCurrentCampaignBundle as createPrevious, validateCurrentCampaignBundle as validatePrevious, type CurrentCampaignBundle as PreviousBundle } from "../native-v6/current.ts";
import type { CampaignBundleDataV6 } from "../native-v6/bundle.ts";
import { CAMPAIGN_V6_TABLES } from "../native-v6/schema.ts";
import { assertJson, fail, hash, object, keys, list, rejectDuplicateKeys } from "../campaign-v3-json.ts";
import { createCampaignBundleV7, validateCampaignBundleV7, type CampaignBundleV7, type CampaignBundleDataV7 } from "./bundle.ts";
import { CAMPAIGN_V7_TABLES, CAMPAIGN_V7_ADDITIONAL_TABLES, CAMPAIGN_BUNDLE_V7_LIMITS, emptyCampaignTablesV7, type CampaignTablesV7, type CampaignTableNameV7 } from "./schema.ts";

export type CurrentCampaignBundle = PreviousBundle | CampaignBundleV7;
/** Normalized in-memory table view only; legacy source envelopes and hashes stay intact. */
export function currentCampaignTables(bundle: CurrentCampaignBundle): CampaignTablesV7 { return { ...emptyCampaignTablesV7(), ...bundle.tables }; }
/**
 * Eine Kampagne ohne importierte Bilder behaelt ihren v4/v5/v6-Umschlag. Erst das erste Bild
 * verlangt v7 — so wird kein bestehendes Paket allein dadurch neu, dass diese Funktion existiert.
 */
export function createCurrentCampaignBundle(data: CampaignBundleDataV6 | CampaignBundleDataV7): CurrentCampaignBundle {
  assertJson(data); const tables = object(data.tables, "tables");
  keys(tables, CAMPAIGN_V6_TABLES.map(table => table.name), "tables", CAMPAIGN_V7_ADDITIONAL_TABLES.map(table => table.name));
  const medien = CAMPAIGN_V7_ADDITIONAL_TABLES.some(table => Object.hasOwn(tables, table.name) && list(tables[table.name], `tables.${table.name}`).length > 0);
  if (medien) return createCampaignBundleV7(data as CampaignBundleDataV7);
  return createPrevious({ ...data, tables: Object.fromEntries(CAMPAIGN_V6_TABLES.map(table => [table.name, data.tables[table.name]])) as unknown as CampaignBundleDataV6["tables"] });
}
export function validateCurrentCampaignBundle(value: unknown): CurrentCampaignBundle {
  assertJson(value); return object(value, "$").version === 7 ? validateCampaignBundleV7(value) : validatePrevious(value);
}
export function parseCurrentCampaignBundle(text: string): CurrentCampaignBundle {
  if (typeof text !== "string" || Buffer.byteLength(text, "utf8") > CAMPAIGN_BUNDLE_V7_LIMITS.bytes) fail("$", "maximum campaign bundle size exceeded");
  rejectDuplicateKeys(text); let value: unknown; try { value = JSON.parse(text); } catch { fail("$", "invalid campaign JSON"); }
  return validateCurrentCampaignBundle(value);
}
export function serializeCurrentCampaignBundle(bundle: CurrentCampaignBundle): string { return canonicalJson(validateCurrentCampaignBundle(bundle) as unknown as CanonicalValue); }
export function currentCampaignSemanticDiff(a: CurrentCampaignBundle, b: CurrentCampaignBundle): readonly CampaignTableNameV7[] {
  const left = currentCampaignTables(validateCurrentCampaignBundle(a)), right = currentCampaignTables(validateCurrentCampaignBundle(b));
  return CAMPAIGN_V7_TABLES.filter(table => hash(left[table.name]) !== hash(right[table.name])).map(table => table.name);
}
