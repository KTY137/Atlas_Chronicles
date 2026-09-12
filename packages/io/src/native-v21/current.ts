// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { canonicalJson, type CanonicalValue } from "@chronicle/core";
import { createCurrentCampaignBundle as createPrevious, validateCurrentCampaignBundle as validatePrevious, type CurrentCampaignBundle as PreviousBundle } from "../native-v20/current.ts";
import type { CampaignBundleDataV20 } from "../native-v20/bundle.ts";
import { assertJson, fail, hash, object, list, rejectDuplicateKeys } from "../campaign-v3-json.ts";
import { createCampaignBundleV21, validateCampaignBundleV21, type CampaignBundleV21, type CampaignBundleDataV21 } from "./bundle.ts";
import { CAMPAIGN_V21_TABLES, CAMPAIGN_BUNDLE_V21_LIMITS, emptyCampaignTablesV21, type CampaignTablesV21, type CampaignTableNameV21 } from "./schema.ts";
export type CurrentCampaignBundle = PreviousBundle | CampaignBundleV21;
export function currentCampaignTables(bundle: CurrentCampaignBundle): CampaignTablesV21 { return { ...emptyCampaignTablesV21(), ...bundle.tables }; }
/** Solange Abenteuerbaum und Figurenbilder fehlen, bleibt die bisherige Formatversion der Sicherung erhalten. */
const TABLETOP_TABLES = ["adventure_trees", "actor_portraits"] as const;
export function createCurrentCampaignBundle(data: Parameters<typeof createPrevious>[0] | CampaignBundleDataV21): CurrentCampaignBundle {
  assertJson(data); const tables = object(data.tables, "tables");
  if (TABLETOP_TABLES.some(name => Object.hasOwn(tables, name) && list(tables[name], `tables.${name}`).length))
    return createCampaignBundleV21(data as CampaignBundleDataV21);
  const { adventure_trees: _adventures, actor_portraits: _portraits, ...previous } = tables;
  return createPrevious({ ...data, tables: previous as unknown as CampaignBundleDataV20["tables"] });
}
export function validateCurrentCampaignBundle(value: unknown): CurrentCampaignBundle { assertJson(value); return object(value, "$").version === 21 ? validateCampaignBundleV21(value) : validatePrevious(value); }
export function parseCurrentCampaignBundle(text: string): CurrentCampaignBundle {
  if (typeof text !== "string" || Buffer.byteLength(text, "utf8") > CAMPAIGN_BUNDLE_V21_LIMITS.bytes) fail("$", "maximum campaign bundle size exceeded");
  rejectDuplicateKeys(text); let value: unknown; try { value = JSON.parse(text); } catch { fail("$", "invalid campaign JSON"); }
  return validateCurrentCampaignBundle(value);
}
export function serializeCurrentCampaignBundle(bundle: CurrentCampaignBundle): string { return canonicalJson(validateCurrentCampaignBundle(bundle) as unknown as CanonicalValue); }
export function currentCampaignSemanticDiff(a: CurrentCampaignBundle, b: CurrentCampaignBundle): readonly CampaignTableNameV21[] {
  const left = currentCampaignTables(validateCurrentCampaignBundle(a)), right = currentCampaignTables(validateCurrentCampaignBundle(b));
  return CAMPAIGN_V21_TABLES.filter(table => hash(left[table.name]) !== hash(right[table.name])).map(table => table.name);
}
