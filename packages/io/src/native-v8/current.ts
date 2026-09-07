import { canonicalJson, type CanonicalValue } from "@chronicle/core";
import { createCurrentCampaignBundle as createPrevious, validateCurrentCampaignBundle as validatePrevious, type CurrentCampaignBundle as PreviousBundle } from "../native-v7/current.ts";
import type { CampaignBundleDataV7 } from "../native-v7/bundle.ts";
import { CAMPAIGN_V7_TABLES } from "../native-v7/schema.ts";
import { assertJson, fail, hash, object, keys, list, rejectDuplicateKeys } from "../campaign-v3-json.ts";
import { createCampaignBundleV8, validateCampaignBundleV8, type CampaignBundleV8, type CampaignBundleDataV8 } from "./bundle.ts";
import { CAMPAIGN_V8_TABLES, CAMPAIGN_V8_ADDITIONAL_TABLES, CAMPAIGN_BUNDLE_V8_LIMITS, emptyCampaignTablesV8, type CampaignTablesV8, type CampaignTableNameV8 } from "./schema.ts";

export type CurrentCampaignBundle = PreviousBundle | CampaignBundleV8;
/** Normalized in-memory table view only; legacy source envelopes and hashes stay intact. */
export function currentCampaignTables(bundle: CurrentCampaignBundle): CampaignTablesV8 { return { ...emptyCampaignTablesV8(), ...bundle.tables }; }
/**
 * Eine Kampagne, in der nie jemand ausgesperrt war, behält ihren v4/v5/v6/v7-Umschlag. Erst
 * der erste Zugangsvorfall verlangt v8 — dieselbe Zurückhaltung wie bei den Bildern in v7:
 * kein bestehendes Paket wird allein dadurch neu, dass diese Funktion existiert.
 */
export function createCurrentCampaignBundle(data: CampaignBundleDataV7 | CampaignBundleDataV8): CurrentCampaignBundle {
  assertJson(data); const tables = object(data.tables, "tables");
  keys(tables, CAMPAIGN_V7_TABLES.map(table => table.name), "tables", CAMPAIGN_V8_ADDITIONAL_TABLES.map(table => table.name));
  const vorfaelle = CAMPAIGN_V8_ADDITIONAL_TABLES.some(table => Object.hasOwn(tables, table.name) && list(tables[table.name], `tables.${table.name}`).length > 0);
  if (vorfaelle) return createCampaignBundleV8(data as CampaignBundleDataV8);
  return createPrevious({ ...data, tables: Object.fromEntries(CAMPAIGN_V7_TABLES.map(table => [table.name, data.tables[table.name]])) as unknown as CampaignBundleDataV7["tables"] });
}
export function validateCurrentCampaignBundle(value: unknown): CurrentCampaignBundle {
  assertJson(value); return object(value, "$").version === 8 ? validateCampaignBundleV8(value) : validatePrevious(value);
}
export function parseCurrentCampaignBundle(text: string): CurrentCampaignBundle {
  if (typeof text !== "string" || Buffer.byteLength(text, "utf8") > CAMPAIGN_BUNDLE_V8_LIMITS.bytes) fail("$", "maximum campaign bundle size exceeded");
  rejectDuplicateKeys(text); let value: unknown; try { value = JSON.parse(text); } catch { fail("$", "invalid campaign JSON"); }
  return validateCurrentCampaignBundle(value);
}
export function serializeCurrentCampaignBundle(bundle: CurrentCampaignBundle): string { return canonicalJson(validateCurrentCampaignBundle(bundle) as unknown as CanonicalValue); }
export function currentCampaignSemanticDiff(a: CurrentCampaignBundle, b: CurrentCampaignBundle): readonly CampaignTableNameV8[] {
  const left = currentCampaignTables(validateCurrentCampaignBundle(a)), right = currentCampaignTables(validateCurrentCampaignBundle(b));
  return CAMPAIGN_V8_TABLES.filter(table => hash(left[table.name]) !== hash(right[table.name])).map(table => table.name);
}
