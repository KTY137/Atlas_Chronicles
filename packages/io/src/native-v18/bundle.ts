// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { canonicalJson, type CanonicalValue } from "@chronicle/core";
import { createCampaignBundleV17, type CampaignBundleV17 } from "../native-v17/bundle.ts";
import type { CampaignRow } from "../campaign-schema.ts";
import { assertJson, fail, hash, object, list, string, keys, validateColumn, rejectDuplicateKeys } from "../campaign-v3-json.ts";
import { CAMPAIGN_V18_TABLES, CAMPAIGN_V18_MODULES, CAMPAIGN_BUNDLE_V18_LIMITS as LIMITS,
  type CampaignTablesV18, type CampaignModuleV18, type CampaignTableNameV18 } from "./schema.ts";
import { validateRegelarchivTables } from "./validation.ts";

export const CAMPAIGN_BUNDLE_V18_VERSION = 18 as const;
export interface CampaignBundleDataV18 { readonly campaignId: string; readonly universeId: string; readonly exportedAt: string; readonly tables: CampaignTablesV18 }
export interface CampaignBundleV18 {
  readonly format: "atlas-chronicles/campaign"; readonly version: 18;
  readonly manifest: Omit<CampaignBundleV17["manifest"], "modules"> & { readonly regelarchivSchemaVersion: 1;
    readonly modules: readonly { readonly name: CampaignModuleV18; readonly version: 1; readonly count: number; readonly sha256: string }[] };
  readonly tables: CampaignTablesV18;
}
export function createCampaignBundleV18(data: CampaignBundleDataV18): CampaignBundleV18 {
  assertJson(data); keys(object(data, "data"), ["campaignId", "universeId", "exportedAt", "tables"], "data");
  keys(object(data.tables, "tables"), CAMPAIGN_V18_TABLES.map(table => table.name), "tables");
  // Validate all original rows BEFORE the narrowly scoped legacy validation projection.
  const original: Record<string, CampaignRow[]> = {};
  let rowCount = 0;
  for (const table of CAMPAIGN_V18_TABLES) {
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
  const validated = original as unknown as CampaignTablesV18;
  const { rule_package_archiv, ...previous } = validated;
  const core = createCampaignBundleV17({ ...data, tables: previous as unknown as CampaignBundleV17["tables"] });
  const tables: CampaignTablesV18 = { ...core.tables, rule_package_archiv };
  validateRegelarchivTables(tables, data.campaignId);
  const modules = CAMPAIGN_V18_MODULES.map(name => {
    const specs = CAMPAIGN_V18_TABLES.filter(table => table.module === name);
    return { name, version: 1 as const, count: specs.reduce((count, table) => count + tables[table.name].length, 0), sha256: hash(Object.fromEntries(specs.map(table => [table.name, tables[table.name]]))) };
  });
  const bundle: CampaignBundleV18 = { format: "atlas-chronicles/campaign", version: 18,
    manifest: { ...core.manifest, regelarchivSchemaVersion: 1, contentHash: hash(tables), modules }, tables };
  if (Buffer.byteLength(canonicalJson(bundle as unknown as CanonicalValue), "utf8") > LIMITS.bytes) fail("$", "maximum campaign bundle size exceeded");
  return bundle;
}
export function validateCampaignBundleV18(value: unknown): CampaignBundleV18 {
  assertJson(value); const row = object(value, "$"), manifest = object(row.manifest, "manifest"); keys(row, ["format", "version", "manifest", "tables"], "$");
  if (row.format !== "atlas-chronicles/campaign" || row.version !== 18 || manifest.regelarchivSchemaVersion !== 1) fail("manifest", "unsupported campaign profile/version; explicit migration required");
  const bundle = createCampaignBundleV18({ campaignId: string(manifest.campaignId, "manifest.campaignId"), universeId: string(manifest.universeId, "manifest.universeId"), exportedAt: string(manifest.exportedAt, "manifest.exportedAt", 40), tables: row.tables as unknown as CampaignTablesV18 });
  keys(manifest, Object.keys(bundle.manifest), "manifest");
  if (hash(manifest) !== hash(bundle.manifest)) fail("manifest", "payload/core/module checksum or count mismatch");
  return bundle;
}
export function parseCampaignBundleV18(text: string): CampaignBundleV18 {
  if (typeof text !== "string" || Buffer.byteLength(text, "utf8") > LIMITS.bytes) fail("$", "maximum campaign bundle size exceeded");
  rejectDuplicateKeys(text); let value: unknown; try { value = JSON.parse(text); } catch { fail("$", "invalid campaign JSON"); }
  return validateCampaignBundleV18(value);
}
export function serializeCampaignBundleV18(bundle: CampaignBundleV18): string { return canonicalJson(validateCampaignBundleV18(bundle) as unknown as CanonicalValue); }
export function campaignSemanticDiffV18(a: CampaignBundleV18, b: CampaignBundleV18): readonly CampaignTableNameV18[] {
  const left = validateCampaignBundleV18(a), right = validateCampaignBundleV18(b);
  return CAMPAIGN_V18_TABLES.filter(table => hash(left.tables[table.name]) !== hash(right.tables[table.name])).map(table => table.name);
}
