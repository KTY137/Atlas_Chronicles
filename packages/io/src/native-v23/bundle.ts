// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { canonicalJson, type CanonicalValue } from "@chronicle/core";
import { createCampaignBundleV22, type CampaignBundleV22 } from "../native-v22/bundle.ts";
import type { CampaignRow } from "../campaign-schema.ts";
import { assertJson, fail, hash, object, list, string, keys, validateColumn, rejectDuplicateKeys } from "../campaign-v3-json.ts";
import { CAMPAIGN_V23_TABLES, CAMPAIGN_V23_MODULES, CAMPAIGN_BUNDLE_V23_LIMITS as LIMITS,
  type CampaignTablesV23, type CampaignModuleV23, type CampaignTableNameV23 } from "./schema.ts";
import { validateSessionFloorTables } from "./validation.ts";

export const CAMPAIGN_BUNDLE_V23_VERSION = 23 as const;
export interface CampaignBundleDataV23 { readonly campaignId: string; readonly universeId: string; readonly exportedAt: string; readonly tables: CampaignTablesV23 }
export interface CampaignBundleV23 {
  readonly format: "atlas-chronicles/campaign"; readonly version: 23;
  readonly manifest: Omit<CampaignBundleV22["manifest"], "modules"> & { readonly geschossSchemaVersion: 1;
    readonly modules: readonly { readonly name: CampaignModuleV23; readonly version: 1; readonly count: number; readonly sha256: string }[] };
  readonly tables: CampaignTablesV23;
}
export function createCampaignBundleV23(data: CampaignBundleDataV23): CampaignBundleV23 {
  assertJson(data); keys(object(data, "data"), ["campaignId", "universeId", "exportedAt", "tables"], "data");
  keys(object(data.tables, "tables"), CAMPAIGN_V23_TABLES.map(table => table.name), "tables");
  // Alle Zeilen werden vollstaendig geprueft, BEVOR die eng gefasste Vorgängerprüfung laeuft.
  const original: Record<string, CampaignRow[]> = {};
  let rowCount = 0;
  for (const table of CAMPAIGN_V23_TABLES) {
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
  const validated = original as unknown as CampaignTablesV23;
  const { session_floor_states, ...previous } = validated;
  const core = createCampaignBundleV22({ ...data, tables: previous as unknown as CampaignBundleV22["tables"] });
  const tables: CampaignTablesV23 = { ...core.tables, session_floor_states };
  validateSessionFloorTables(tables, data.campaignId);
  const modules = CAMPAIGN_V23_MODULES.map(name => {
    const specs = CAMPAIGN_V23_TABLES.filter(table => table.module === name);
    return { name, version: 1 as const, count: specs.reduce((count, table) => count + tables[table.name].length, 0), sha256: hash(Object.fromEntries(specs.map(table => [table.name, tables[table.name]]))) };
  });
  const bundle: CampaignBundleV23 = { format: "atlas-chronicles/campaign", version: 23,
    manifest: { ...core.manifest, geschossSchemaVersion: 1, contentHash: hash(tables), modules }, tables };
  if (Buffer.byteLength(canonicalJson(bundle as unknown as CanonicalValue), "utf8") > LIMITS.bytes) fail("$", "maximum campaign bundle size exceeded");
  return bundle;
}
export function validateCampaignBundleV23(value: unknown): CampaignBundleV23 {
  assertJson(value); const row = object(value, "$"), manifest = object(row.manifest, "manifest"); keys(row, ["format", "version", "manifest", "tables"], "$");
  if (row.format !== "atlas-chronicles/campaign" || row.version !== 23 || manifest.geschossSchemaVersion !== 1) fail("manifest", "unsupported campaign profile/version; explicit migration required");
  const bundle = createCampaignBundleV23({ campaignId: string(manifest.campaignId, "manifest.campaignId"), universeId: string(manifest.universeId, "manifest.universeId"), exportedAt: string(manifest.exportedAt, "manifest.exportedAt", 40), tables: row.tables as unknown as CampaignTablesV23 });
  keys(manifest, Object.keys(bundle.manifest), "manifest");
  if (hash(manifest) !== hash(bundle.manifest)) fail("manifest", "payload/core/module checksum or count mismatch");
  return bundle;
}
export function parseCampaignBundleV23(text: string): CampaignBundleV23 {
  if (typeof text !== "string" || Buffer.byteLength(text, "utf8") > LIMITS.bytes) fail("$", "maximum campaign bundle size exceeded");
  rejectDuplicateKeys(text); let value: unknown; try { value = JSON.parse(text); } catch { fail("$", "invalid campaign JSON"); }
  return validateCampaignBundleV23(value);
}
export function serializeCampaignBundleV23(bundle: CampaignBundleV23): string { return canonicalJson(validateCampaignBundleV23(bundle) as unknown as CanonicalValue); }
export function campaignSemanticDiffV23(a: CampaignBundleV23, b: CampaignBundleV23): readonly CampaignTableNameV23[] {
  const left = validateCampaignBundleV23(a), right = validateCampaignBundleV23(b);
  return CAMPAIGN_V23_TABLES.filter(table => hash(left.tables[table.name]) !== hash(right.tables[table.name])).map(table => table.name);
}
