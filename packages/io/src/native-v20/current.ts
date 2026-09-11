// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { canonicalJson, type CanonicalValue } from "@chronicle/core";
import { createCurrentCampaignBundle as createPrevious, validateCurrentCampaignBundle as validatePrevious, type CurrentCampaignBundle as PreviousBundle } from "../native-v19/current.ts";
import type { CampaignBundleDataV19 } from "../native-v19/bundle.ts";
import { assertJson, fail, hash, object, list, rejectDuplicateKeys } from "../campaign-v3-json.ts";
import { createCampaignBundleV20, validateCampaignBundleV20, type CampaignBundleV20, type CampaignBundleDataV20 } from "./bundle.ts";
import { CAMPAIGN_V20_TABLES, CAMPAIGN_BUNDLE_V20_LIMITS, emptyCampaignTablesV20, type CampaignTablesV20, type CampaignTableNameV20 } from "./schema.ts";
export type CurrentCampaignBundle = PreviousBundle | CampaignBundleV20;
export function currentCampaignTables(bundle: CurrentCampaignBundle): CampaignTablesV20 { return { ...emptyCampaignTablesV20(), ...bundle.tables }; }
/** Solange Geschosse und Raumnebel fehlen, bleibt die bisherige Formatversion der Sicherung erhalten. */
const STUDIO_TABLES = ["map_floor_stacks", "map_room_fog", "map_studio_commands"] as const;
export function createCurrentCampaignBundle(data: Parameters<typeof createPrevious>[0] | CampaignBundleDataV20): CurrentCampaignBundle {
  assertJson(data); const tables = object(data.tables, "tables");
  if (STUDIO_TABLES.some(name => Object.hasOwn(tables, name) && list(tables[name], `tables.${name}`).length))
    return createCampaignBundleV20(data as CampaignBundleDataV20);
  const { map_floor_stacks: _floors, map_room_fog: _fog, map_studio_commands: _commands, ...previous } = tables;
  return createPrevious({ ...data, tables: previous as unknown as CampaignBundleDataV19["tables"] });
}
export function validateCurrentCampaignBundle(value: unknown): CurrentCampaignBundle { assertJson(value); return object(value, "$").version === 20 ? validateCampaignBundleV20(value) : validatePrevious(value); }
export function parseCurrentCampaignBundle(text: string): CurrentCampaignBundle {
  if (typeof text !== "string" || Buffer.byteLength(text, "utf8") > CAMPAIGN_BUNDLE_V20_LIMITS.bytes) fail("$", "maximum campaign bundle size exceeded");
  rejectDuplicateKeys(text); let value: unknown; try { value = JSON.parse(text); } catch { fail("$", "invalid campaign JSON"); }
  return validateCurrentCampaignBundle(value);
}
export function serializeCurrentCampaignBundle(bundle: CurrentCampaignBundle): string { return canonicalJson(validateCurrentCampaignBundle(bundle) as unknown as CanonicalValue); }
export function currentCampaignSemanticDiff(a: CurrentCampaignBundle, b: CurrentCampaignBundle): readonly CampaignTableNameV20[] {
  const left = currentCampaignTables(validateCurrentCampaignBundle(a)), right = currentCampaignTables(validateCurrentCampaignBundle(b));
  return CAMPAIGN_V20_TABLES.filter(table => hash(left[table.name]) !== hash(right[table.name])).map(table => table.name);
}
