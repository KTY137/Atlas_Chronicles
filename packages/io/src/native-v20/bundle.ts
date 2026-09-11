// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { canonicalJson, type CanonicalValue } from "@chronicle/core";
import { createCampaignBundleV19, type CampaignBundleV19 } from "../native-v19/bundle.ts";
import type { CampaignRow } from "../campaign-schema.ts";
import { assertJson, fail, hash, object, list, string, keys, validateColumn, rejectDuplicateKeys } from "../campaign-v3-json.ts";
import { CAMPAIGN_V20_TABLES, CAMPAIGN_V20_MODULES, CAMPAIGN_BUNDLE_V20_LIMITS as LIMITS,
  type CampaignTablesV20, type CampaignModuleV20, type CampaignTableNameV20 } from "./schema.ts";
import { validateMapStudioTables } from "./validation.ts";

export const CAMPAIGN_BUNDLE_V20_VERSION = 20 as const;
export interface CampaignBundleDataV20 { readonly campaignId: string; readonly universeId: string; readonly exportedAt: string; readonly tables: CampaignTablesV20 }
export interface CampaignBundleV20 {
  readonly format: "atlas-chronicles/campaign"; readonly version: 20;
  readonly manifest: Omit<CampaignBundleV19["manifest"], "modules"> & { readonly mapStudioSchemaVersion: 1;
    readonly modules: readonly { readonly name: CampaignModuleV20; readonly version: 1; readonly count: number; readonly sha256: string }[] };
  readonly tables: CampaignTablesV20;
}
export function createCampaignBundleV20(data: CampaignBundleDataV20): CampaignBundleV20 {
  assertJson(data); keys(object(data, "data"), ["campaignId", "universeId", "exportedAt", "tables"], "data");
  keys(object(data.tables, "tables"), CAMPAIGN_V20_TABLES.map(table => table.name), "tables");
  // Alle Zeilen werden vollstaendig geprueft, BEVOR die eng gefasste Vorgängerprüfung laeuft.
  const original: Record<string, CampaignRow[]> = {};
  let rowCount = 0;
  for (const table of CAMPAIGN_V20_TABLES) {
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
  const validated = original as unknown as CampaignTablesV20;
  const { map_floor_stacks, map_room_fog, map_studio_commands, ...previous } = validated;
  const core = createCampaignBundleV19({ ...data, tables: previous as unknown as CampaignBundleV19["tables"] });
  const tables: CampaignTablesV20 = { ...core.tables, map_floor_stacks, map_room_fog, map_studio_commands };
  validateMapStudioTables(tables, data.campaignId);
  const modules = CAMPAIGN_V20_MODULES.map(name => {
    const specs = CAMPAIGN_V20_TABLES.filter(table => table.module === name);
    return { name, version: 1 as const, count: specs.reduce((count, table) => count + tables[table.name].length, 0), sha256: hash(Object.fromEntries(specs.map(table => [table.name, tables[table.name]]))) };
  });
  const bundle: CampaignBundleV20 = { format: "atlas-chronicles/campaign", version: 20,
    manifest: { ...core.manifest, mapStudioSchemaVersion: 1, contentHash: hash(tables), modules }, tables };
  if (Buffer.byteLength(canonicalJson(bundle as unknown as CanonicalValue), "utf8") > LIMITS.bytes) fail("$", "maximum campaign bundle size exceeded");
  return bundle;
}
export function validateCampaignBundleV20(value: unknown): CampaignBundleV20 {
  assertJson(value); const row = object(value, "$"), manifest = object(row.manifest, "manifest"); keys(row, ["format", "version", "manifest", "tables"], "$");
  if (row.format !== "atlas-chronicles/campaign" || row.version !== 20 || manifest.mapStudioSchemaVersion !== 1) fail("manifest", "unsupported campaign profile/version; explicit migration required");
  const bundle = createCampaignBundleV20({ campaignId: string(manifest.campaignId, "manifest.campaignId"), universeId: string(manifest.universeId, "manifest.universeId"), exportedAt: string(manifest.exportedAt, "manifest.exportedAt", 40), tables: row.tables as unknown as CampaignTablesV20 });
  keys(manifest, Object.keys(bundle.manifest), "manifest");
  if (hash(manifest) !== hash(bundle.manifest)) fail("manifest", "payload/core/module checksum or count mismatch");
  return bundle;
}
export function parseCampaignBundleV20(text: string): CampaignBundleV20 {
  if (typeof text !== "string" || Buffer.byteLength(text, "utf8") > LIMITS.bytes) fail("$", "maximum campaign bundle size exceeded");
  rejectDuplicateKeys(text); let value: unknown; try { value = JSON.parse(text); } catch { fail("$", "invalid campaign JSON"); }
  return validateCampaignBundleV20(value);
}
export function serializeCampaignBundleV20(bundle: CampaignBundleV20): string { return canonicalJson(validateCampaignBundleV20(bundle) as unknown as CanonicalValue); }
export function campaignSemanticDiffV20(a: CampaignBundleV20, b: CampaignBundleV20): readonly CampaignTableNameV20[] {
  const left = validateCampaignBundleV20(a), right = validateCampaignBundleV20(b);
  return CAMPAIGN_V20_TABLES.filter(table => hash(left.tables[table.name]) !== hash(right.tables[table.name])).map(table => table.name);
}
