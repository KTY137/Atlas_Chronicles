// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { canonicalJson, type CanonicalValue } from "@chronicle/core";
import { createCampaignBundleV18, type CampaignBundleV18 } from "../native-v18/bundle.ts";
import type { CampaignRow } from "../campaign-schema.ts";
import { assertJson, fail, hash, object, list, string, keys, validateColumn, rejectDuplicateKeys } from "../campaign-v3-json.ts";
import { CAMPAIGN_V19_TABLES, CAMPAIGN_V19_MODULES, CAMPAIGN_BUNDLE_V19_LIMITS as LIMITS,
  type CampaignTablesV19, type CampaignModuleV19, type CampaignTableNameV19 } from "./schema.ts";
import { validateKartenherkunftTables } from "./validation.ts";

export const CAMPAIGN_BUNDLE_V19_VERSION = 19 as const;
export interface CampaignBundleDataV19 { readonly campaignId: string; readonly universeId: string; readonly exportedAt: string; readonly tables: CampaignTablesV19 }
export interface CampaignBundleV19 {
  readonly format: "atlas-chronicles/campaign"; readonly version: 19;
  readonly manifest: Omit<CampaignBundleV18["manifest"], "modules"> & { readonly kartenherkunftSchemaVersion: 1;
    readonly modules: readonly { readonly name: CampaignModuleV19; readonly version: 1; readonly count: number; readonly sha256: string }[] };
  readonly tables: CampaignTablesV19;
}
export function createCampaignBundleV19(data: CampaignBundleDataV19): CampaignBundleV19 {
  assertJson(data); keys(object(data, "data"), ["campaignId", "universeId", "exportedAt", "tables"], "data");
  keys(object(data.tables, "tables"), CAMPAIGN_V19_TABLES.map(table => table.name), "tables");
  // Alle Zeilen werden vollstaendig geprueft, BEVOR die eng gefasste Vorgaengerpruefung laeuft.
  const original: Record<string, CampaignRow[]> = {};
  let rowCount = 0;
  for (const table of CAMPAIGN_V19_TABLES) {
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
  const validated = original as unknown as CampaignTablesV19;
  const { atlas_karten_herkunft, ...previous } = validated;
  const core = createCampaignBundleV18({ ...data, tables: previous as unknown as CampaignBundleV18["tables"] });
  const tables: CampaignTablesV19 = { ...core.tables, atlas_karten_herkunft };
  validateKartenherkunftTables(tables, data.campaignId);
  const modules = CAMPAIGN_V19_MODULES.map(name => {
    const specs = CAMPAIGN_V19_TABLES.filter(table => table.module === name);
    return { name, version: 1 as const, count: specs.reduce((count, table) => count + tables[table.name].length, 0), sha256: hash(Object.fromEntries(specs.map(table => [table.name, tables[table.name]]))) };
  });
  const bundle: CampaignBundleV19 = { format: "atlas-chronicles/campaign", version: 19,
    manifest: { ...core.manifest, kartenherkunftSchemaVersion: 1, contentHash: hash(tables), modules }, tables };
  if (Buffer.byteLength(canonicalJson(bundle as unknown as CanonicalValue), "utf8") > LIMITS.bytes) fail("$", "maximum campaign bundle size exceeded");
  return bundle;
}
export function validateCampaignBundleV19(value: unknown): CampaignBundleV19 {
  assertJson(value); const row = object(value, "$"), manifest = object(row.manifest, "manifest"); keys(row, ["format", "version", "manifest", "tables"], "$");
  if (row.format !== "atlas-chronicles/campaign" || row.version !== 19 || manifest.kartenherkunftSchemaVersion !== 1) fail("manifest", "unsupported campaign profile/version; explicit migration required");
  const bundle = createCampaignBundleV19({ campaignId: string(manifest.campaignId, "manifest.campaignId"), universeId: string(manifest.universeId, "manifest.universeId"), exportedAt: string(manifest.exportedAt, "manifest.exportedAt", 40), tables: row.tables as unknown as CampaignTablesV19 });
  keys(manifest, Object.keys(bundle.manifest), "manifest");
  if (hash(manifest) !== hash(bundle.manifest)) fail("manifest", "payload/core/module checksum or count mismatch");
  return bundle;
}
export function parseCampaignBundleV19(text: string): CampaignBundleV19 {
  if (typeof text !== "string" || Buffer.byteLength(text, "utf8") > LIMITS.bytes) fail("$", "maximum campaign bundle size exceeded");
  rejectDuplicateKeys(text); let value: unknown; try { value = JSON.parse(text); } catch { fail("$", "invalid campaign JSON"); }
  return validateCampaignBundleV19(value);
}
export function serializeCampaignBundleV19(bundle: CampaignBundleV19): string { return canonicalJson(validateCampaignBundleV19(bundle) as unknown as CanonicalValue); }
export function campaignSemanticDiffV19(a: CampaignBundleV19, b: CampaignBundleV19): readonly CampaignTableNameV19[] {
  const left = validateCampaignBundleV19(a), right = validateCampaignBundleV19(b);
  return CAMPAIGN_V19_TABLES.filter(table => hash(left.tables[table.name]) !== hash(right.tables[table.name])).map(table => table.name);
}
