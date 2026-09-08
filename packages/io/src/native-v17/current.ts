// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { canonicalJson, type CanonicalValue } from "@chronicle/core";
import { createCurrentCampaignBundle as createPrevious, validateCurrentCampaignBundle as validatePrevious, type CurrentCampaignBundle as PreviousBundle } from "../native-v16/current.ts";
import type { CampaignBundleDataV16 } from "../native-v16/bundle.ts";
import { assertJson, fail, hash, object, list, rejectDuplicateKeys } from "../campaign-v3-json.ts";
import { createCampaignBundleV17, validateCampaignBundleV17, type CampaignBundleV17, type CampaignBundleDataV17 } from "./bundle.ts";
import { CAMPAIGN_V17_TABLES, CAMPAIGN_BUNDLE_V17_LIMITS, emptyCampaignTablesV17, type CampaignTablesV17, type CampaignTableNameV17 } from "./schema.ts";
export type CurrentCampaignBundle = PreviousBundle | CampaignBundleV17;
export function currentCampaignTables(bundle: CurrentCampaignBundle): CampaignTablesV17 { return { ...emptyCampaignTablesV17(), ...bundle.tables }; }
/** Solange keine Kampagne Antraege kennt, bleibt ihre Sicherung eine V16-Datei. */
const FIGURANTRAG_TABLES = ["figurvorlagen_freigaben", "figurantraege", "figurantrag_events"] as const;
export function createCurrentCampaignBundle(data: Parameters<typeof createPrevious>[0] | CampaignBundleDataV17): CurrentCampaignBundle {
  assertJson(data); const tables = object(data.tables, "tables");
  if (FIGURANTRAG_TABLES.some(name => Object.hasOwn(tables, name) && list(tables[name], `tables.${name}`).length))
    return createCampaignBundleV17(data as CampaignBundleDataV17);
  const { figurvorlagen_freigaben: _releases, figurantraege: _applications, figurantrag_events: _events, ...previous } = tables;
  return createPrevious({ ...data, tables: previous as unknown as CampaignBundleDataV16["tables"] });
}
export function validateCurrentCampaignBundle(value: unknown): CurrentCampaignBundle { assertJson(value); return object(value, "$").version === 17 ? validateCampaignBundleV17(value) : validatePrevious(value); }
export function parseCurrentCampaignBundle(text: string): CurrentCampaignBundle {
  if (typeof text !== "string" || Buffer.byteLength(text, "utf8") > CAMPAIGN_BUNDLE_V17_LIMITS.bytes) fail("$", "maximum campaign bundle size exceeded");
  rejectDuplicateKeys(text); let value: unknown; try { value = JSON.parse(text); } catch { fail("$", "invalid campaign JSON"); }
  return validateCurrentCampaignBundle(value);
}
export function serializeCurrentCampaignBundle(bundle: CurrentCampaignBundle): string { return canonicalJson(validateCurrentCampaignBundle(bundle) as unknown as CanonicalValue); }
export function currentCampaignSemanticDiff(a: CurrentCampaignBundle, b: CurrentCampaignBundle): readonly CampaignTableNameV17[] {
  const left = currentCampaignTables(validateCurrentCampaignBundle(a)), right = currentCampaignTables(validateCurrentCampaignBundle(b));
  return CAMPAIGN_V17_TABLES.filter(table => hash(left[table.name]) !== hash(right[table.name])).map(table => table.name);
}
