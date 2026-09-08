// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { canonicalJson, type CanonicalValue } from "@chronicle/core";
import { createCampaignBundleV14, type CampaignBundleV14 } from "../native-v14/bundle.ts";
import type { CampaignRow } from "../campaign-schema.ts";
import { assertJson, fail, hash, object, list, string, keys, validateColumn, rejectDuplicateKeys } from "../campaign-v3-json.ts";
import { CAMPAIGN_V15_TABLES, CAMPAIGN_V15_MODULES, CAMPAIGN_BUNDLE_V15_LIMITS as LIMITS, type CampaignTablesV15, type CampaignModuleV15, type CampaignTableNameV15 } from "./schema.ts";
import { lifecycleCoreTables } from "./validation.ts";

export const CAMPAIGN_BUNDLE_V15_VERSION = 15 as const;
export interface CampaignBundleDataV15 { readonly campaignId: string; readonly universeId: string; readonly exportedAt: string; readonly tables: CampaignTablesV15 }
export interface CampaignBundleV15 {
  readonly format: "atlas-chronicles/campaign"; readonly version: 15;
  readonly manifest: Omit<CampaignBundleV14["manifest"], "modules"> & { readonly mapLifecycleSchemaVersion: 1;
    readonly modules: readonly { readonly name: CampaignModuleV15; readonly version: 1; readonly count: number; readonly sha256: string }[] };
  readonly tables: CampaignTablesV15;
}
export function createCampaignBundleV15(data: CampaignBundleDataV15): CampaignBundleV15 {
  assertJson(data); keys(object(data, "data"), ["campaignId", "universeId", "exportedAt", "tables"], "data");
  keys(object(data.tables, "tables"), CAMPAIGN_V15_TABLES.map(table => table.name), "tables");
  // Validate all original rows BEFORE the narrowly scoped legacy validation projection.
  const original: Record<string, CampaignRow[]> = {};
  let rowCount = 0;
  for (const table of CAMPAIGN_V15_TABLES) {
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
  const validated = original as unknown as CampaignTablesV15;
  const core = createCampaignBundleV14({ ...data, tables: lifecycleCoreTables(validated, data.campaignId) });
  // Retired baseline links/receipts are immutable evidence. The projection never becomes storage.
  const tables: CampaignTablesV15 = { ...core.tables,
    betreten_karten: validated.betreten_karten,
    betreten_command_receipts: validated.betreten_command_receipts,
    tactical_command_receipts: validated.tactical_command_receipts,
    map_lifecycle_events: validated.map_lifecycle_events,
  };
  const modules = CAMPAIGN_V15_MODULES.map(name => {
    const specs = CAMPAIGN_V15_TABLES.filter(table => table.module === name);
    return { name, version: 1 as const, count: specs.reduce((count, table) => count + tables[table.name].length, 0), sha256: hash(Object.fromEntries(specs.map(table => [table.name, tables[table.name]]))) };
  });
  const bundle: CampaignBundleV15 = { format: "atlas-chronicles/campaign", version: 15,
    manifest: { ...core.manifest, mapLifecycleSchemaVersion: 1, contentHash: hash(tables), modules }, tables };
  if (Buffer.byteLength(canonicalJson(bundle as unknown as CanonicalValue), "utf8") > LIMITS.bytes) fail("$", "maximum campaign bundle size exceeded");
  return bundle;
}
export function validateCampaignBundleV15(value: unknown): CampaignBundleV15 {
  assertJson(value); const row = object(value, "$"), manifest = object(row.manifest, "manifest"); keys(row, ["format", "version", "manifest", "tables"], "$");
  if (row.format !== "atlas-chronicles/campaign" || row.version !== 15 || manifest.mapLifecycleSchemaVersion !== 1) fail("manifest", "unsupported campaign profile/version; explicit migration required");
  const bundle = createCampaignBundleV15({ campaignId: string(manifest.campaignId, "manifest.campaignId"), universeId: string(manifest.universeId, "manifest.universeId"), exportedAt: string(manifest.exportedAt, "manifest.exportedAt", 40), tables: row.tables as unknown as CampaignTablesV15 });
  keys(manifest, Object.keys(bundle.manifest), "manifest");
  if (hash(manifest) !== hash(bundle.manifest)) fail("manifest", "payload/core/module checksum or count mismatch");
  return bundle;
}
export function parseCampaignBundleV15(text: string): CampaignBundleV15 {
  if (typeof text !== "string" || Buffer.byteLength(text, "utf8") > LIMITS.bytes) fail("$", "maximum campaign bundle size exceeded");
  rejectDuplicateKeys(text); let value: unknown; try { value = JSON.parse(text); } catch { fail("$", "invalid campaign JSON"); }
  return validateCampaignBundleV15(value);
}
export function serializeCampaignBundleV15(bundle: CampaignBundleV15): string { return canonicalJson(validateCampaignBundleV15(bundle) as unknown as CanonicalValue); }
export function campaignSemanticDiffV15(a: CampaignBundleV15, b: CampaignBundleV15): readonly CampaignTableNameV15[] {
  const left = validateCampaignBundleV15(a), right = validateCampaignBundleV15(b);
  return CAMPAIGN_V15_TABLES.filter(table => hash(left.tables[table.name]) !== hash(right.tables[table.name])).map(table => table.name);
}
