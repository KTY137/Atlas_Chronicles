// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { canonicalJson, type CanonicalValue } from "@chronicle/core";
import { createCampaignBundleV15, type CampaignBundleV15 } from "../native-v15/bundle.ts";
import type { CampaignRow } from "../campaign-schema.ts";
import { assertJson, fail, hash, object, list, string, keys, validateColumn, rejectDuplicateKeys } from "../campaign-v3-json.ts";
import { CAMPAIGN_V16_TABLES, CAMPAIGN_V16_MODULES, CAMPAIGN_BUNDLE_V16_LIMITS as LIMITS, type CampaignTablesV16, type CampaignModuleV16, type CampaignTableNameV16 } from "./schema.ts";
import { validateChronistTables } from "./validation.ts";

export const CAMPAIGN_BUNDLE_V16_VERSION = 16 as const;
export interface CampaignBundleDataV16 { readonly campaignId: string; readonly universeId: string; readonly exportedAt: string; readonly tables: CampaignTablesV16 }
export interface CampaignBundleV16 {
  readonly format: "atlas-chronicles/campaign"; readonly version: 16;
  readonly manifest: Omit<CampaignBundleV15["manifest"], "modules"> & { readonly chronistSchemaVersion: 1;
    readonly modules: readonly { readonly name: CampaignModuleV16; readonly version: 1; readonly count: number; readonly sha256: string }[] };
  readonly tables: CampaignTablesV16;
}
export function createCampaignBundleV16(data: CampaignBundleDataV16): CampaignBundleV16 {
  assertJson(data); keys(object(data, "data"), ["campaignId", "universeId", "exportedAt", "tables"], "data");
  keys(object(data.tables, "tables"), CAMPAIGN_V16_TABLES.map(table => table.name), "tables");
  // Validate all original rows BEFORE the narrowly scoped legacy validation projection.
  const original: Record<string, CampaignRow[]> = {};
  let rowCount = 0;
  for (const table of CAMPAIGN_V16_TABLES) {
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
  const validated = original as unknown as CampaignTablesV16;
  const {chronist_laeufe,chronist_vorschlaege,...previous}=validated;
  const core = createCampaignBundleV15({ ...data, tables: previous });
  const tables: CampaignTablesV16 = { ...core.tables,chronist_laeufe,chronist_vorschlaege };
  validateChronistTables(tables,data.campaignId);
  const modules = CAMPAIGN_V16_MODULES.map(name => {
    const specs = CAMPAIGN_V16_TABLES.filter(table => table.module === name);
    return { name, version: 1 as const, count: specs.reduce((count, table) => count + tables[table.name].length, 0), sha256: hash(Object.fromEntries(specs.map(table => [table.name, tables[table.name]]))) };
  });
  const bundle: CampaignBundleV16 = { format: "atlas-chronicles/campaign", version: 16,
    manifest: { ...core.manifest, chronistSchemaVersion: 1, contentHash: hash(tables), modules }, tables };
  if (Buffer.byteLength(canonicalJson(bundle as unknown as CanonicalValue), "utf8") > LIMITS.bytes) fail("$", "maximum campaign bundle size exceeded");
  return bundle;
}
export function validateCampaignBundleV16(value: unknown): CampaignBundleV16 {
  assertJson(value); const row = object(value, "$"), manifest = object(row.manifest, "manifest"); keys(row, ["format", "version", "manifest", "tables"], "$");
  if (row.format !== "atlas-chronicles/campaign" || row.version !== 16 || manifest.chronistSchemaVersion !== 1) fail("manifest", "unsupported campaign profile/version; explicit migration required");
  const bundle = createCampaignBundleV16({ campaignId: string(manifest.campaignId, "manifest.campaignId"), universeId: string(manifest.universeId, "manifest.universeId"), exportedAt: string(manifest.exportedAt, "manifest.exportedAt", 40), tables: row.tables as unknown as CampaignTablesV16 });
  keys(manifest, Object.keys(bundle.manifest), "manifest");
  if (hash(manifest) !== hash(bundle.manifest)) fail("manifest", "payload/core/module checksum or count mismatch");
  return bundle;
}
export function parseCampaignBundleV16(text: string): CampaignBundleV16 {
  if (typeof text !== "string" || Buffer.byteLength(text, "utf8") > LIMITS.bytes) fail("$", "maximum campaign bundle size exceeded");
  rejectDuplicateKeys(text); let value: unknown; try { value = JSON.parse(text); } catch { fail("$", "invalid campaign JSON"); }
  return validateCampaignBundleV16(value);
}
export function serializeCampaignBundleV16(bundle: CampaignBundleV16): string { return canonicalJson(validateCampaignBundleV16(bundle) as unknown as CanonicalValue); }
export function campaignSemanticDiffV16(a: CampaignBundleV16, b: CampaignBundleV16): readonly CampaignTableNameV16[] {
  const left = validateCampaignBundleV16(a), right = validateCampaignBundleV16(b);
  return CAMPAIGN_V16_TABLES.filter(table => hash(left.tables[table.name]) !== hash(right.tables[table.name])).map(table => table.name);
}
