// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { canonicalJson, type CanonicalValue } from "@chronicle/core";
import { createCampaignBundleV10, type CampaignBundleV10 } from "../native-v10/bundle.ts";
import { CAMPAIGN_V10_TABLES, type CampaignTablesV10 } from "../native-v10/schema.ts";
import type { CampaignRow } from "../campaign-schema.ts";
import { assertJson, fail, hash, object, list, string, keys, validateColumn, rejectDuplicateKeys } from "../campaign-v3-json.ts";
import { CAMPAIGN_V11_TABLES, CAMPAIGN_V11_ADDITIONAL_TABLES, CAMPAIGN_V11_MODULES, CAMPAIGN_BUNDLE_V11_LIMITS as LIMITS, type CampaignTablesV11, type CampaignModuleV11, type CampaignTableNameV11 } from "./schema.ts";
import { checkKampfTables } from "./validation.ts";

export const CAMPAIGN_BUNDLE_V11_VERSION = 11 as const;
export interface CampaignBundleDataV11 { readonly campaignId: string; readonly universeId: string; readonly exportedAt: string; readonly tables: CampaignTablesV11 }
export interface CampaignBundleV11 {
  readonly format: "atlas-chronicles/campaign"; readonly version: 11;
  readonly manifest: Omit<CampaignBundleV10["manifest"], "modules"> & { readonly kampfSchemaVersion: 1;
    readonly modules: readonly { readonly name: CampaignModuleV11; readonly version: 1; readonly count: number; readonly sha256: string }[] };
  readonly tables: CampaignTablesV11;
}
export function createCampaignBundleV11(data: CampaignBundleDataV11): CampaignBundleV11 {
  assertJson(data); keys(object(data, "data"), ["campaignId", "universeId", "exportedAt", "tables"], "data");
  keys(object(data.tables, "tables"), CAMPAIGN_V11_TABLES.map(table => table.name), "tables");
  const core = createCampaignBundleV10({ ...data, tables: Object.fromEntries(CAMPAIGN_V10_TABLES.map(table => [table.name, data.tables[table.name]])) as unknown as CampaignTablesV10 });
  const additional: Record<string, CampaignRow[]> = {};
  for (const table of CAMPAIGN_V11_ADDITIONAL_TABLES) {
    const seen = new Set<string>();
    additional[table.name] = list(data.tables[table.name], `tables.${table.name}`, LIMITS.rowsPerTable).map((value, index) => {
      const path = `tables.${table.name}[${index}]`, row = object(value, path); keys(row, table.columns, path);
      for (const [column, field] of Object.entries(table.fields)) validateColumn(row[column], field, `${path}.${column}`);
      const pk = canonicalJson(table.primaryKey.map(column => row[column]!) as CanonicalValue);
      if (seen.has(pk)) fail(path, "duplicate primary key"); seen.add(pk);
      return JSON.parse(JSON.stringify(row)) as CampaignRow;
    }).sort((left, right) => {
      for (const column of table.primaryKey) {
        const a = String(left[column]), b = String(right[column]); if (a !== b) return a < b ? -1 : 1;
      }
      return 0;
    });
  }
  const tables = { ...core.tables, ...additional } as CampaignTablesV11;
  if (CAMPAIGN_V11_TABLES.reduce((count, table) => count + tables[table.name].length, 0) > LIMITS.rows) fail("tables", "total row limit exceeded");
  checkKampfTables(tables, data.campaignId);
  const modules = CAMPAIGN_V11_MODULES.map(name => {
    const specs = CAMPAIGN_V11_TABLES.filter(table => table.module === name);
    return { name, version: 1 as const, count: specs.reduce((count, table) => count + tables[table.name].length, 0), sha256: hash(Object.fromEntries(specs.map(table => [table.name, tables[table.name]]))) };
  });
  const bundle: CampaignBundleV11 = { format: "atlas-chronicles/campaign", version: 11,
    manifest: { ...core.manifest, kampfSchemaVersion: 1, contentHash: hash(tables), modules }, tables };
  if (Buffer.byteLength(canonicalJson(bundle as unknown as CanonicalValue), "utf8") > LIMITS.bytes) fail("$", "maximum campaign bundle size exceeded");
  return bundle;
}
export function validateCampaignBundleV11(value: unknown): CampaignBundleV11 {
  assertJson(value); const row = object(value, "$"), manifest = object(row.manifest, "manifest"); keys(row, ["format", "version", "manifest", "tables"], "$");
  if (row.format !== "atlas-chronicles/campaign" || row.version !== 11 || manifest.kampfSchemaVersion !== 1) fail("manifest", "unsupported campaign profile/version; explicit migration required");
  const bundle = createCampaignBundleV11({ campaignId: string(manifest.campaignId, "manifest.campaignId"), universeId: string(manifest.universeId, "manifest.universeId"), exportedAt: string(manifest.exportedAt, "manifest.exportedAt", 40), tables: row.tables as unknown as CampaignTablesV11 });
  keys(manifest, Object.keys(bundle.manifest), "manifest");
  if (hash(manifest) !== hash(bundle.manifest)) fail("manifest", "payload/core/module checksum or count mismatch");
  return bundle;
}
export function parseCampaignBundleV11(text: string): CampaignBundleV11 {
  if (typeof text !== "string" || Buffer.byteLength(text, "utf8") > LIMITS.bytes) fail("$", "maximum campaign bundle size exceeded");
  rejectDuplicateKeys(text); let value: unknown; try { value = JSON.parse(text); } catch { fail("$", "invalid campaign JSON"); }
  return validateCampaignBundleV11(value);
}
export function serializeCampaignBundleV11(bundle: CampaignBundleV11): string { return canonicalJson(validateCampaignBundleV11(bundle) as unknown as CanonicalValue); }
export function campaignSemanticDiffV11(a: CampaignBundleV11, b: CampaignBundleV11): readonly CampaignTableNameV11[] {
  const left = validateCampaignBundleV11(a), right = validateCampaignBundleV11(b);
  return CAMPAIGN_V11_TABLES.filter(table => hash(left.tables[table.name]) !== hash(right.tables[table.name])).map(table => table.name);
}
