import { canonicalJson, type CanonicalValue } from "@chronicle/core";
import { createCurrentCampaignBundle as createPrevious, validateCurrentCampaignBundle as validatePrevious, type CurrentCampaignBundle as PreviousBundle } from "../native-v11/current.ts";
import type { CampaignBundleDataV11 } from "../native-v11/bundle.ts";
import { CAMPAIGN_V11_TABLES } from "../native-v11/schema.ts";
import { assertJson, fail, hash, object, keys, list, rejectDuplicateKeys } from "../campaign-v3-json.ts";
import { createCampaignBundleV12, validateCampaignBundleV12, type CampaignBundleV12, type CampaignBundleDataV12 } from "./bundle.ts";
import { CAMPAIGN_V12_TABLES, CAMPAIGN_V12_ADDITIONAL_TABLES, CAMPAIGN_BUNDLE_V12_LIMITS, emptyCampaignTablesV12, type CampaignTablesV12, type CampaignTableNameV12 } from "./schema.ts";

export type CurrentCampaignBundle = PreviousBundle | CampaignBundleV12;
/** Normalized in-memory table view only; legacy source envelopes and hashes stay intact. */
export function currentCampaignTables(bundle: CurrentCampaignBundle): CampaignTablesV12 { return { ...emptyCampaignTablesV12(), ...bundle.tables }; }
/**
 * Eine Chronik ohne eine einzige Erleichterung behält ihren v4…v11-Umschlag. Erst das erste
 * Zugeständnis verlangt v12 — dieselbe Zurückhaltung wie bei den Bildern in v7, dem
 * Zugangsvorfall in v8, den Gefüge-Kanten in v9, den Kategorien in v10 und der Kampfbühne in
 * v11: kein bestehendes Paket wird allein dadurch neu, dass diese Funktion existiert.
 */
export function createCurrentCampaignBundle(data: CampaignBundleDataV11 | CampaignBundleDataV12): CurrentCampaignBundle {
  assertJson(data); const tables = object(data.tables, "tables");
  keys(tables, CAMPAIGN_V11_TABLES.map(table => table.name), "tables", CAMPAIGN_V12_ADDITIONAL_TABLES.map(table => table.name));
  const zugestaendnis = CAMPAIGN_V12_ADDITIONAL_TABLES.some(table => Object.hasOwn(tables, table.name) && list(tables[table.name], `tables.${table.name}`).length > 0);
  if (zugestaendnis) return createCampaignBundleV12(data as CampaignBundleDataV12);
  return createPrevious({ ...data, tables: Object.fromEntries(CAMPAIGN_V11_TABLES.map(table => [table.name, data.tables[table.name]])) as unknown as CampaignBundleDataV11["tables"] });
}
export function validateCurrentCampaignBundle(value: unknown): CurrentCampaignBundle {
  assertJson(value); return object(value, "$").version === 12 ? validateCampaignBundleV12(value) : validatePrevious(value);
}
export function parseCurrentCampaignBundle(text: string): CurrentCampaignBundle {
  if (typeof text !== "string" || Buffer.byteLength(text, "utf8") > CAMPAIGN_BUNDLE_V12_LIMITS.bytes) fail("$", "maximum campaign bundle size exceeded");
  rejectDuplicateKeys(text); let value: unknown; try { value = JSON.parse(text); } catch { fail("$", "invalid campaign JSON"); }
  return validateCurrentCampaignBundle(value);
}
export function serializeCurrentCampaignBundle(bundle: CurrentCampaignBundle): string { return canonicalJson(validateCurrentCampaignBundle(bundle) as unknown as CanonicalValue); }
export function currentCampaignSemanticDiff(a: CurrentCampaignBundle, b: CurrentCampaignBundle): readonly CampaignTableNameV12[] {
  const left = currentCampaignTables(validateCurrentCampaignBundle(a)), right = currentCampaignTables(validateCurrentCampaignBundle(b));
  return CAMPAIGN_V12_TABLES.filter(table => hash(left[table.name]) !== hash(right[table.name])).map(table => table.name);
}
