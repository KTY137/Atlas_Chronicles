// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { canonicalJson, type CanonicalValue } from "@chronicle/core";
import { createCampaignBundleV6, type CampaignBundleV6 } from "../native-v6/bundle.ts";
import { CAMPAIGN_V6_TABLES, type CampaignTablesV6 } from "../native-v6/schema.ts";
import type { CampaignRow } from "../campaign-schema.ts";
import { assertJson, fail, hash, object, list, string, keys, validateColumn, rejectDuplicateKeys } from "../campaign-v3-json.ts";
import { CAMPAIGN_V7_TABLES, CAMPAIGN_V7_ADDITIONAL_TABLES, CAMPAIGN_V7_MODULES, CAMPAIGN_BUNDLE_V7_LIMITS as LIMITS, type CampaignTablesV7, type CampaignModuleV7, type CampaignTableNameV7 } from "./schema.ts";
import { checkWikiMediaTables } from "./validation.ts";

export const CAMPAIGN_BUNDLE_V7_VERSION = 7 as const;
export interface CampaignBundleDataV7 { readonly campaignId: string; readonly universeId: string; readonly exportedAt: string; readonly tables: CampaignTablesV7 }
export interface CampaignBundleV7 {
  readonly format: "atlas-chronicles/campaign"; readonly version: 7;
  readonly manifest: Omit<CampaignBundleV6["manifest"], "modules"> & { readonly wikiMediaSchemaVersion: 1;
    readonly modules: readonly { readonly name: CampaignModuleV7; readonly version: 1; readonly count: number; readonly sha256: string }[] };
  readonly tables: CampaignTablesV7;
}
export function createCampaignBundleV7(data: CampaignBundleDataV7): CampaignBundleV7 {
  assertJson(data); keys(object(data, "data"), ["campaignId", "universeId", "exportedAt", "tables"], "data");
  keys(object(data.tables, "tables"), CAMPAIGN_V7_TABLES.map(table => table.name), "tables");
  const core = createCampaignBundleV6({ ...data, tables: Object.fromEntries(CAMPAIGN_V6_TABLES.map(table => [table.name, data.tables[table.name]])) as unknown as CampaignTablesV6 });
  const additional: Record<string, CampaignRow[]> = {};
  for (const table of CAMPAIGN_V7_ADDITIONAL_TABLES) {
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
  const tables = { ...core.tables, ...additional } as CampaignTablesV7;
  if (CAMPAIGN_V7_TABLES.reduce((count, table) => count + tables[table.name].length, 0) > LIMITS.rows) fail("tables", "total row limit exceeded");
  checkWikiMediaTables(tables, data.campaignId);
  const modules = CAMPAIGN_V7_MODULES.map(name => {
    const specs = CAMPAIGN_V7_TABLES.filter(table => table.module === name);
    return { name, version: 1 as const, count: specs.reduce((count, table) => count + tables[table.name].length, 0), sha256: hash(Object.fromEntries(specs.map(table => [table.name, tables[table.name]]))) };
  });
  const bundle: CampaignBundleV7 = { format: "atlas-chronicles/campaign", version: 7,
    manifest: { ...core.manifest, wikiMediaSchemaVersion: 1, contentHash: hash(tables), modules }, tables };
  if (Buffer.byteLength(canonicalJson(bundle as unknown as CanonicalValue), "utf8") > LIMITS.bytes) fail("$", "maximum campaign bundle size exceeded");
  return bundle;
}
export function validateCampaignBundleV7(value: unknown): CampaignBundleV7 {
  assertJson(value); const row = object(value, "$"), manifest = object(row.manifest, "manifest"); keys(row, ["format", "version", "manifest", "tables"], "$");
  if (row.format !== "atlas-chronicles/campaign" || row.version !== 7 || manifest.wikiMediaSchemaVersion !== 1) fail("manifest", "unsupported campaign profile/version; explicit migration required");
  const bundle = createCampaignBundleV7({ campaignId: string(manifest.campaignId, "manifest.campaignId"), universeId: string(manifest.universeId, "manifest.universeId"), exportedAt: string(manifest.exportedAt, "manifest.exportedAt", 40), tables: row.tables as unknown as CampaignTablesV7 });
  keys(manifest, Object.keys(bundle.manifest), "manifest");
  if (hash(manifest) !== hash(bundle.manifest)) fail("manifest", "payload/core/module checksum or count mismatch");
  return bundle;
}
export function parseCampaignBundleV7(text: string): CampaignBundleV7 {
  if (typeof text !== "string" || Buffer.byteLength(text, "utf8") > LIMITS.bytes) fail("$", "maximum campaign bundle size exceeded");
  rejectDuplicateKeys(text); let value: unknown; try { value = JSON.parse(text); } catch { fail("$", "invalid campaign JSON"); }
  return validateCampaignBundleV7(value);
}
export function serializeCampaignBundleV7(bundle: CampaignBundleV7): string { return canonicalJson(validateCampaignBundleV7(bundle) as unknown as CanonicalValue); }
export function campaignSemanticDiffV7(a: CampaignBundleV7, b: CampaignBundleV7): readonly CampaignTableNameV7[] {
  const left = validateCampaignBundleV7(a), right = validateCampaignBundleV7(b);
  return CAMPAIGN_V7_TABLES.filter(table => hash(left.tables[table.name]) !== hash(right.tables[table.name])).map(table => table.name);
}
