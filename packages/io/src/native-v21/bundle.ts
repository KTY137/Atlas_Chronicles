// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { canonicalJson, type CanonicalValue } from "@chronicle/core";
import { createCampaignBundleV20, type CampaignBundleV20 } from "../native-v20/bundle.ts";
import type { CampaignRow } from "../campaign-schema.ts";
import { assertJson, fail, hash, object, list, string, keys, validateColumn, rejectDuplicateKeys } from "../campaign-v3-json.ts";
import { CAMPAIGN_V21_TABLES, CAMPAIGN_V21_MODULES, CAMPAIGN_BUNDLE_V21_LIMITS as LIMITS,
  type CampaignTablesV21, type CampaignModuleV21, type CampaignTableNameV21 } from "./schema.ts";
import { validateTabletopTables } from "./validation.ts";

export const CAMPAIGN_BUNDLE_V21_VERSION = 21 as const;
export interface CampaignBundleDataV21 { readonly campaignId: string; readonly universeId: string; readonly exportedAt: string; readonly tables: CampaignTablesV21 }
export interface CampaignBundleV21 {
  readonly format: "atlas-chronicles/campaign"; readonly version: 21;
  readonly manifest: Omit<CampaignBundleV20["manifest"], "modules"> & { readonly tabletopSchemaVersion: 1;
    readonly modules: readonly { readonly name: CampaignModuleV21; readonly version: 1; readonly count: number; readonly sha256: string }[] };
  readonly tables: CampaignTablesV21;
}
export function createCampaignBundleV21(data: CampaignBundleDataV21): CampaignBundleV21 {
  assertJson(data); keys(object(data, "data"), ["campaignId", "universeId", "exportedAt", "tables"], "data");
  keys(object(data.tables, "tables"), CAMPAIGN_V21_TABLES.map(table => table.name), "tables");
  // Alle Zeilen werden vollstaendig geprueft, BEVOR die eng gefasste Vorgängerprüfung laeuft.
  const original: Record<string, CampaignRow[]> = {};
  let rowCount = 0;
  for (const table of CAMPAIGN_V21_TABLES) {
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
  const validated = original as unknown as CampaignTablesV21;
  const { adventure_trees, actor_portraits, ...previous } = validated;
  const core = createCampaignBundleV20({ ...data, tables: previous as unknown as CampaignBundleV20["tables"] });
  const tables: CampaignTablesV21 = { ...core.tables, adventure_trees, actor_portraits };
  validateTabletopTables(tables, data.campaignId);
  const modules = CAMPAIGN_V21_MODULES.map(name => {
    const specs = CAMPAIGN_V21_TABLES.filter(table => table.module === name);
    return { name, version: 1 as const, count: specs.reduce((count, table) => count + tables[table.name].length, 0), sha256: hash(Object.fromEntries(specs.map(table => [table.name, tables[table.name]]))) };
  });
  const bundle: CampaignBundleV21 = { format: "atlas-chronicles/campaign", version: 21,
    manifest: { ...core.manifest, tabletopSchemaVersion: 1, contentHash: hash(tables), modules }, tables };
  if (Buffer.byteLength(canonicalJson(bundle as unknown as CanonicalValue), "utf8") > LIMITS.bytes) fail("$", "maximum campaign bundle size exceeded");
  return bundle;
}
export function validateCampaignBundleV21(value: unknown): CampaignBundleV21 {
  assertJson(value); const row = object(value, "$"), manifest = object(row.manifest, "manifest"); keys(row, ["format", "version", "manifest", "tables"], "$");
  if (row.format !== "atlas-chronicles/campaign" || row.version !== 21 || manifest.tabletopSchemaVersion !== 1) fail("manifest", "unsupported campaign profile/version; explicit migration required");
  const bundle = createCampaignBundleV21({ campaignId: string(manifest.campaignId, "manifest.campaignId"), universeId: string(manifest.universeId, "manifest.universeId"), exportedAt: string(manifest.exportedAt, "manifest.exportedAt", 40), tables: row.tables as unknown as CampaignTablesV21 });
  keys(manifest, Object.keys(bundle.manifest), "manifest");
  if (hash(manifest) !== hash(bundle.manifest)) fail("manifest", "payload/core/module checksum or count mismatch");
  return bundle;
}
export function parseCampaignBundleV21(text: string): CampaignBundleV21 {
  if (typeof text !== "string" || Buffer.byteLength(text, "utf8") > LIMITS.bytes) fail("$", "maximum campaign bundle size exceeded");
  rejectDuplicateKeys(text); let value: unknown; try { value = JSON.parse(text); } catch { fail("$", "invalid campaign JSON"); }
  return validateCampaignBundleV21(value);
}
export function serializeCampaignBundleV21(bundle: CampaignBundleV21): string { return canonicalJson(validateCampaignBundleV21(bundle) as unknown as CanonicalValue); }
export function campaignSemanticDiffV21(a: CampaignBundleV21, b: CampaignBundleV21): readonly CampaignTableNameV21[] {
  const left = validateCampaignBundleV21(a), right = validateCampaignBundleV21(b);
  return CAMPAIGN_V21_TABLES.filter(table => hash(left.tables[table.name]) !== hash(right.tables[table.name])).map(table => table.name);
}
