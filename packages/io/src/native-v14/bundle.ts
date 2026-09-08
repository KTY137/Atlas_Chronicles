// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { canonicalJson, type CanonicalValue } from "@chronicle/core";
import { createCampaignBundleV13, type CampaignBundleV13 } from "../native-v13/bundle.ts";
import type { CampaignRow } from "../campaign-schema.ts";
import { assertJson, fail, hash, object, list, string, keys, validateColumn, rejectDuplicateKeys } from "../campaign-v3-json.ts";
import { CAMPAIGN_V14_TABLES, CAMPAIGN_V14_ADDITIONAL_TABLES, CAMPAIGN_V14_MODULES, CAMPAIGN_BUNDLE_V14_LIMITS as LIMITS, type CampaignTablesV14, type CampaignModuleV14, type CampaignTableNameV14 } from "./schema.ts";
import { cartographyCoreTables, checkCartographyTables } from "./validation.ts";

export const CAMPAIGN_BUNDLE_V14_VERSION = 14 as const;
export interface CampaignBundleDataV14 { readonly campaignId: string; readonly universeId: string; readonly exportedAt: string; readonly tables: CampaignTablesV14 }
export interface CampaignBundleV14 {
  readonly format: "atlas-chronicles/campaign"; readonly version: 14;
  readonly manifest: Omit<CampaignBundleV13["manifest"], "modules"> & { readonly cartographySchemaVersion: 1;
    readonly modules: readonly { readonly name: CampaignModuleV14; readonly version: 1; readonly count: number; readonly sha256: string }[] };
  readonly tables: CampaignTablesV14;
}
export function createCampaignBundleV14(data: CampaignBundleDataV14): CampaignBundleV14 {
  assertJson(data); keys(object(data, "data"), ["campaignId", "universeId", "exportedAt", "tables"], "data");
  keys(object(data.tables, "tables"), CAMPAIGN_V14_TABLES.map(table => table.name), "tables");
  const additional: Record<string, CampaignRow[]> = {};
  for (const table of CAMPAIGN_V14_ADDITIONAL_TABLES) {
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
  const core = createCampaignBundleV13({ ...data, tables: cartographyCoreTables({ ...data.tables, ...additional } as CampaignTablesV14) });
  const originalAcks = new Map(data.tables.tactical_command_receipts.map(row => [row.command_id, row.ack]));
  const tables = { ...core.tables, ...additional,
    tactical_command_receipts: core.tables.tactical_command_receipts.map(row => ({ ...row, ack: JSON.parse(JSON.stringify(originalAcks.get(row.command_id))) })),
  } as unknown as CampaignTablesV14;
  if (CAMPAIGN_V14_TABLES.reduce((count, table) => count + tables[table.name].length, 0) > LIMITS.rows) fail("tables", "total row limit exceeded");
  checkCartographyTables(tables, data.campaignId);
  const modules = CAMPAIGN_V14_MODULES.map(name => {
    const specs = CAMPAIGN_V14_TABLES.filter(table => table.module === name);
    return { name, version: 1 as const, count: specs.reduce((count, table) => count + tables[table.name].length, 0), sha256: hash(Object.fromEntries(specs.map(table => [table.name, tables[table.name]]))) };
  });
  const bundle: CampaignBundleV14 = { format: "atlas-chronicles/campaign", version: 14,
    manifest: { ...core.manifest, cartographySchemaVersion: 1, contentHash: hash(tables), modules }, tables };
  if (Buffer.byteLength(canonicalJson(bundle as unknown as CanonicalValue), "utf8") > LIMITS.bytes) fail("$", "maximum campaign bundle size exceeded");
  return bundle;
}
export function validateCampaignBundleV14(value: unknown): CampaignBundleV14 {
  assertJson(value); const row = object(value, "$"), manifest = object(row.manifest, "manifest"); keys(row, ["format", "version", "manifest", "tables"], "$");
  if (row.format !== "atlas-chronicles/campaign" || row.version !== 14 || manifest.cartographySchemaVersion !== 1) fail("manifest", "unsupported campaign profile/version; explicit migration required");
  const bundle = createCampaignBundleV14({ campaignId: string(manifest.campaignId, "manifest.campaignId"), universeId: string(manifest.universeId, "manifest.universeId"), exportedAt: string(manifest.exportedAt, "manifest.exportedAt", 40), tables: row.tables as unknown as CampaignTablesV14 });
  keys(manifest, Object.keys(bundle.manifest), "manifest");
  if (hash(manifest) !== hash(bundle.manifest)) fail("manifest", "payload/core/module checksum or count mismatch");
  return bundle;
}
export function parseCampaignBundleV14(text: string): CampaignBundleV14 {
  if (typeof text !== "string" || Buffer.byteLength(text, "utf8") > LIMITS.bytes) fail("$", "maximum campaign bundle size exceeded");
  rejectDuplicateKeys(text); let value: unknown; try { value = JSON.parse(text); } catch { fail("$", "invalid campaign JSON"); }
  return validateCampaignBundleV14(value);
}
export function serializeCampaignBundleV14(bundle: CampaignBundleV14): string { return canonicalJson(validateCampaignBundleV14(bundle) as unknown as CanonicalValue); }
export function campaignSemanticDiffV14(a: CampaignBundleV14, b: CampaignBundleV14): readonly CampaignTableNameV14[] {
  const left = validateCampaignBundleV14(a), right = validateCampaignBundleV14(b);
  return CAMPAIGN_V14_TABLES.filter(table => hash(left.tables[table.name]) !== hash(right.tables[table.name])).map(table => table.name);
}
