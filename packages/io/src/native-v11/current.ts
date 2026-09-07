// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { canonicalJson, type CanonicalValue } from "@chronicle/core";
import { createCurrentCampaignBundle as createPrevious, validateCurrentCampaignBundle as validatePrevious, type CurrentCampaignBundle as PreviousBundle } from "../native-v10/current.ts";
import type { CampaignBundleDataV10 } from "../native-v10/bundle.ts";
import { CAMPAIGN_V10_TABLES } from "../native-v10/schema.ts";
import { assertJson, fail, hash, object, keys, list, rejectDuplicateKeys } from "../campaign-v3-json.ts";
import { createCampaignBundleV11, validateCampaignBundleV11, type CampaignBundleV11, type CampaignBundleDataV11 } from "./bundle.ts";
import { CAMPAIGN_V11_TABLES, CAMPAIGN_V11_ADDITIONAL_TABLES, CAMPAIGN_BUNDLE_V11_LIMITS, emptyCampaignTablesV11, type CampaignTablesV11, type CampaignTableNameV11 } from "./schema.ts";

export type CurrentCampaignBundle = PreviousBundle | CampaignBundleV11;
/** Normalized in-memory table view only; legacy source envelopes and hashes stay intact. */
export function currentCampaignTables(bundle: CurrentCampaignBundle): CampaignTablesV11 { return { ...emptyCampaignTablesV11(), ...bundle.tables }; }
/**
 * Eine Chronik ohne einen einzigen Kampf behält ihren v4…v10-Umschlag. Erst die erste Bühne
 * verlangt v11 — dieselbe Zurückhaltung wie bei den Bildern in v7, dem Zugangsvorfall in v8, den
 * Gefüge-Kanten in v9 und den Kategorien in v10: kein bestehendes Paket wird allein dadurch neu,
 * dass diese Funktion existiert. Eine Runde, die nie gekämpft hat, exportiert weiter wie bisher.
 */
export function createCurrentCampaignBundle(data: CampaignBundleDataV10 | CampaignBundleDataV11): CurrentCampaignBundle {
  assertJson(data); const tables = object(data.tables, "tables");
  keys(tables, CAMPAIGN_V10_TABLES.map(table => table.name), "tables", CAMPAIGN_V11_ADDITIONAL_TABLES.map(table => table.name));
  const buehne = CAMPAIGN_V11_ADDITIONAL_TABLES.some(table => Object.hasOwn(tables, table.name) && list(tables[table.name], `tables.${table.name}`).length > 0);
  if (buehne) return createCampaignBundleV11(data as CampaignBundleDataV11);
  return createPrevious({ ...data, tables: Object.fromEntries(CAMPAIGN_V10_TABLES.map(table => [table.name, data.tables[table.name]])) as unknown as CampaignBundleDataV10["tables"] });
}
export function validateCurrentCampaignBundle(value: unknown): CurrentCampaignBundle {
  assertJson(value); return object(value, "$").version === 11 ? validateCampaignBundleV11(value) : validatePrevious(value);
}
export function parseCurrentCampaignBundle(text: string): CurrentCampaignBundle {
  if (typeof text !== "string" || Buffer.byteLength(text, "utf8") > CAMPAIGN_BUNDLE_V11_LIMITS.bytes) fail("$", "maximum campaign bundle size exceeded");
  rejectDuplicateKeys(text); let value: unknown; try { value = JSON.parse(text); } catch { fail("$", "invalid campaign JSON"); }
  return validateCurrentCampaignBundle(value);
}
export function serializeCurrentCampaignBundle(bundle: CurrentCampaignBundle): string { return canonicalJson(validateCurrentCampaignBundle(bundle) as unknown as CanonicalValue); }
export function currentCampaignSemanticDiff(a: CurrentCampaignBundle, b: CurrentCampaignBundle): readonly CampaignTableNameV11[] {
  const left = currentCampaignTables(validateCurrentCampaignBundle(a)), right = currentCampaignTables(validateCurrentCampaignBundle(b));
  return CAMPAIGN_V11_TABLES.filter(table => hash(left[table.name]) !== hash(right[table.name])).map(table => table.name);
}
