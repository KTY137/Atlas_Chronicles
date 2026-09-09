// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { canonicalJson, type CanonicalValue } from "@chronicle/core";
import { createCurrentCampaignBundle as createPrevious, validateCurrentCampaignBundle as validatePrevious, type CurrentCampaignBundle as PreviousBundle } from "../native-v18/current.ts";
import type { CampaignBundleDataV18 } from "../native-v18/bundle.ts";
import { assertJson, fail, hash, object, list, rejectDuplicateKeys } from "../campaign-v3-json.ts";
import { createCampaignBundleV19, validateCampaignBundleV19, type CampaignBundleV19, type CampaignBundleDataV19 } from "./bundle.ts";
import { CAMPAIGN_V19_TABLES, CAMPAIGN_BUNDLE_V19_LIMITS, emptyCampaignTablesV19, type CampaignTablesV19, type CampaignTableNameV19 } from "./schema.ts";
export type CurrentCampaignBundle = PreviousBundle | CampaignBundleV19;
export function currentCampaignTables(bundle: CurrentCampaignBundle): CampaignTablesV19 { return { ...emptyCampaignTablesV19(), ...bundle.tables }; }
/** Solange keine Karte ihre Herkunft mitschreibt, bleibt die Sicherung einer Runde eine V18-Datei. */
const KARTENHERKUNFT_TABLES = ["atlas_karten_herkunft"] as const;
export function createCurrentCampaignBundle(data: Parameters<typeof createPrevious>[0] | CampaignBundleDataV19): CurrentCampaignBundle {
  assertJson(data); const tables = object(data.tables, "tables");
  if (KARTENHERKUNFT_TABLES.some(name => Object.hasOwn(tables, name) && list(tables[name], `tables.${name}`).length))
    return createCampaignBundleV19(data as CampaignBundleDataV19);
  const { atlas_karten_herkunft: _ohneHerkunft, ...previous } = tables;
  return createPrevious({ ...data, tables: previous as unknown as CampaignBundleDataV18["tables"] });
}
export function validateCurrentCampaignBundle(value: unknown): CurrentCampaignBundle { assertJson(value); return object(value, "$").version === 19 ? validateCampaignBundleV19(value) : validatePrevious(value); }
export function parseCurrentCampaignBundle(text: string): CurrentCampaignBundle {
  if (typeof text !== "string" || Buffer.byteLength(text, "utf8") > CAMPAIGN_BUNDLE_V19_LIMITS.bytes) fail("$", "maximum campaign bundle size exceeded");
  rejectDuplicateKeys(text); let value: unknown; try { value = JSON.parse(text); } catch { fail("$", "invalid campaign JSON"); }
  return validateCurrentCampaignBundle(value);
}
export function serializeCurrentCampaignBundle(bundle: CurrentCampaignBundle): string { return canonicalJson(validateCurrentCampaignBundle(bundle) as unknown as CanonicalValue); }
export function currentCampaignSemanticDiff(a: CurrentCampaignBundle, b: CurrentCampaignBundle): readonly CampaignTableNameV19[] {
  const left = currentCampaignTables(validateCurrentCampaignBundle(a)), right = currentCampaignTables(validateCurrentCampaignBundle(b));
  return CAMPAIGN_V19_TABLES.filter(table => hash(left[table.name]) !== hash(right[table.name])).map(table => table.name);
}
