// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { canonicalJson, type CanonicalValue } from "@chronicle/core";
import { createCampaignBundleV16, type CampaignBundleV16 } from "../native-v16/bundle.ts";
import type { CampaignRow } from "../campaign-schema.ts";
import type { HouseFloors } from "../native-v15/validation.ts";
import { assertJson, fail, hash, object, list, string, keys, validateColumn, rejectDuplicateKeys } from "../campaign-v3-json.ts";
import { CAMPAIGN_V17_TABLES, CAMPAIGN_V17_MODULES, CAMPAIGN_BUNDLE_V17_LIMITS as LIMITS,
  type CampaignTablesV17, type CampaignModuleV17, type CampaignTableNameV17 } from "./schema.ts";
import { validateFigurantragTables } from "./validation.ts";

export const CAMPAIGN_BUNDLE_V17_VERSION = 17 as const;
export interface CampaignBundleDataV17 { readonly campaignId: string; readonly universeId: string; readonly exportedAt: string; readonly tables: CampaignTablesV17 }
export interface CampaignBundleV17 {
  readonly format: "atlas-chronicles/campaign"; readonly version: 17;
  readonly manifest: Omit<CampaignBundleV16["manifest"], "modules"> & { readonly figurantragSchemaVersion: 1;
    readonly modules: readonly { readonly name: CampaignModuleV17; readonly version: 1; readonly count: number; readonly sha256: string }[] };
  readonly tables: CampaignTablesV17;
}
export function createCampaignBundleV17(data: CampaignBundleDataV17, floorsOf?: HouseFloors): CampaignBundleV17 {
  assertJson(data); keys(object(data, "data"), ["campaignId", "universeId", "exportedAt", "tables"], "data");
  keys(object(data.tables, "tables"), CAMPAIGN_V17_TABLES.map(table => table.name), "tables");
  // Validate all original rows BEFORE the narrowly scoped legacy validation projection.
  const original: Record<string, CampaignRow[]> = {};
  let rowCount = 0;
  for (const table of CAMPAIGN_V17_TABLES) {
    const seen = new Set<string>();
    original[table.name] = list(data.tables[table.name], `tables.${table.name}`, LIMITS.rowsPerTable).map((value, index) => {
      const path = `tables.${table.name}[${index}]`, row = object(value, path); keys(row, table.columns, path);
      for (const [column, field] of Object.entries(table.fields)) validateColumn(row[column], field, `${path}.${column}`);
      const pk = canonicalJson(table.primaryKey.map(column => row[column]!) as CanonicalValue);
      if (seen.has(pk)) fail(path, "duplicate primary key"); seen.add(pk);
      return JSON.parse(JSON.stringify(row)) as CampaignRow;
    }).sort((left, right) => {
      for (const column of table.primaryKey) { const a = String(left[column]), b = String(right[column]); if (a !== b) return a < b ? -1 : 1; }
      return 0;
    });
    rowCount += original[table.name]!.length;
    if (rowCount > LIMITS.rows) fail("tables", "total row limit exceeded");
  }
  const validated = original as unknown as CampaignTablesV17;
  const { figurvorlagen_freigaben, figurantraege, figurantrag_events, ...previous } = validated;
  const core = createCampaignBundleV16({ ...data, tables: previous as unknown as CampaignBundleV16["tables"] }, floorsOf);
  const tables: CampaignTablesV17 = { ...core.tables, figurvorlagen_freigaben, figurantraege, figurantrag_events };
  validateFigurantragTables(tables, data.campaignId);
  const modules = CAMPAIGN_V17_MODULES.map(name => {
    const specs = CAMPAIGN_V17_TABLES.filter(table => table.module === name);
    return { name, version: 1 as const, count: specs.reduce((count, table) => count + tables[table.name].length, 0), sha256: hash(Object.fromEntries(specs.map(table => [table.name, tables[table.name]]))) };
  });
  const bundle: CampaignBundleV17 = { format: "atlas-chronicles/campaign", version: 17,
    manifest: { ...core.manifest, figurantragSchemaVersion: 1, contentHash: hash(tables), modules }, tables };
  if (Buffer.byteLength(canonicalJson(bundle as unknown as CanonicalValue), "utf8") > LIMITS.bytes) fail("$", "maximum campaign bundle size exceeded");
  return bundle;
}
export function validateCampaignBundleV17(value: unknown): CampaignBundleV17 {
  assertJson(value); const row = object(value, "$"), manifest = object(row.manifest, "manifest"); keys(row, ["format", "version", "manifest", "tables"], "$");
  if (row.format !== "atlas-chronicles/campaign" || row.version !== 17 || manifest.figurantragSchemaVersion !== 1) fail("manifest", "unsupported campaign profile/version; explicit migration required");
  const bundle = createCampaignBundleV17({ campaignId: string(manifest.campaignId, "manifest.campaignId"), universeId: string(manifest.universeId, "manifest.universeId"), exportedAt: string(manifest.exportedAt, "manifest.exportedAt", 40), tables: row.tables as unknown as CampaignTablesV17 });
  keys(manifest, Object.keys(bundle.manifest), "manifest");
  if (hash(manifest) !== hash(bundle.manifest)) fail("manifest", "payload/core/module checksum or count mismatch");
  return bundle;
}
export function parseCampaignBundleV17(text: string): CampaignBundleV17 {
  if (typeof text !== "string" || Buffer.byteLength(text, "utf8") > LIMITS.bytes) fail("$", "maximum campaign bundle size exceeded");
  rejectDuplicateKeys(text); let value: unknown; try { value = JSON.parse(text); } catch { fail("$", "invalid campaign JSON"); }
  return validateCampaignBundleV17(value);
}
export function serializeCampaignBundleV17(bundle: CampaignBundleV17): string { return canonicalJson(validateCampaignBundleV17(bundle) as unknown as CanonicalValue); }
export function campaignSemanticDiffV17(a: CampaignBundleV17, b: CampaignBundleV17): readonly CampaignTableNameV17[] {
  const left = validateCampaignBundleV17(a), right = validateCampaignBundleV17(b);
  return CAMPAIGN_V17_TABLES.filter(table => hash(left.tables[table.name]) !== hash(right.tables[table.name])).map(table => table.name);
}
