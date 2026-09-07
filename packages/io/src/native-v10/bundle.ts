import { canonicalJson, type CanonicalValue } from "@chronicle/core";
import { createCampaignBundleV9, type CampaignBundleV9 } from "../native-v9/bundle.ts";
import { CAMPAIGN_V9_TABLES, type CampaignTablesV9 } from "../native-v9/schema.ts";
import type { CampaignRow } from "../campaign-schema.ts";
import { assertJson, fail, hash, object, list, string, keys, validateColumn, rejectDuplicateKeys } from "../campaign-v3-json.ts";
import { CAMPAIGN_V10_TABLES, CAMPAIGN_V10_ADDITIONAL_TABLES, CAMPAIGN_V10_MODULES, CAMPAIGN_BUNDLE_V10_LIMITS as LIMITS, type CampaignTablesV10, type CampaignModuleV10, type CampaignTableNameV10 } from "./schema.ts";
import { checkKategorienTables } from "./validation.ts";

export const CAMPAIGN_BUNDLE_V10_VERSION = 10 as const;
export interface CampaignBundleDataV10 { readonly campaignId: string; readonly universeId: string; readonly exportedAt: string; readonly tables: CampaignTablesV10 }
export interface CampaignBundleV10 {
  readonly format: "atlas-chronicles/campaign"; readonly version: 10;
  readonly manifest: Omit<CampaignBundleV9["manifest"], "modules"> & { readonly kategorienSchemaVersion: 1;
    readonly modules: readonly { readonly name: CampaignModuleV10; readonly version: 1; readonly count: number; readonly sha256: string }[] };
  readonly tables: CampaignTablesV10;
}
export function createCampaignBundleV10(data: CampaignBundleDataV10): CampaignBundleV10 {
  assertJson(data); keys(object(data, "data"), ["campaignId", "universeId", "exportedAt", "tables"], "data");
  keys(object(data.tables, "tables"), CAMPAIGN_V10_TABLES.map(table => table.name), "tables");
  const core = createCampaignBundleV9({ ...data, tables: Object.fromEntries(CAMPAIGN_V9_TABLES.map(table => [table.name, data.tables[table.name]])) as unknown as CampaignTablesV9 });
  const additional: Record<string, CampaignRow[]> = {};
  for (const table of CAMPAIGN_V10_ADDITIONAL_TABLES) {
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
  const tables = { ...core.tables, ...additional } as CampaignTablesV10;
  if (CAMPAIGN_V10_TABLES.reduce((count, table) => count + tables[table.name].length, 0) > LIMITS.rows) fail("tables", "total row limit exceeded");
  checkKategorienTables(tables, data.campaignId);
  const modules = CAMPAIGN_V10_MODULES.map(name => {
    const specs = CAMPAIGN_V10_TABLES.filter(table => table.module === name);
    return { name, version: 1 as const, count: specs.reduce((count, table) => count + tables[table.name].length, 0), sha256: hash(Object.fromEntries(specs.map(table => [table.name, tables[table.name]]))) };
  });
  const bundle: CampaignBundleV10 = { format: "atlas-chronicles/campaign", version: 10,
    manifest: { ...core.manifest, kategorienSchemaVersion: 1, contentHash: hash(tables), modules }, tables };
  if (Buffer.byteLength(canonicalJson(bundle as unknown as CanonicalValue), "utf8") > LIMITS.bytes) fail("$", "maximum campaign bundle size exceeded");
  return bundle;
}
export function validateCampaignBundleV10(value: unknown): CampaignBundleV10 {
  assertJson(value); const row = object(value, "$"), manifest = object(row.manifest, "manifest"); keys(row, ["format", "version", "manifest", "tables"], "$");
  if (row.format !== "atlas-chronicles/campaign" || row.version !== 10 || manifest.kategorienSchemaVersion !== 1) fail("manifest", "unsupported campaign profile/version; explicit migration required");
  const bundle = createCampaignBundleV10({ campaignId: string(manifest.campaignId, "manifest.campaignId"), universeId: string(manifest.universeId, "manifest.universeId"), exportedAt: string(manifest.exportedAt, "manifest.exportedAt", 40), tables: row.tables as unknown as CampaignTablesV10 });
  keys(manifest, Object.keys(bundle.manifest), "manifest");
  if (hash(manifest) !== hash(bundle.manifest)) fail("manifest", "payload/core/module checksum or count mismatch");
  return bundle;
}
export function parseCampaignBundleV10(text: string): CampaignBundleV10 {
  if (typeof text !== "string" || Buffer.byteLength(text, "utf8") > LIMITS.bytes) fail("$", "maximum campaign bundle size exceeded");
  rejectDuplicateKeys(text); let value: unknown; try { value = JSON.parse(text); } catch { fail("$", "invalid campaign JSON"); }
  return validateCampaignBundleV10(value);
}
export function serializeCampaignBundleV10(bundle: CampaignBundleV10): string { return canonicalJson(validateCampaignBundleV10(bundle) as unknown as CanonicalValue); }
export function campaignSemanticDiffV10(a: CampaignBundleV10, b: CampaignBundleV10): readonly CampaignTableNameV10[] {
  const left = validateCampaignBundleV10(a), right = validateCampaignBundleV10(b);
  return CAMPAIGN_V10_TABLES.filter(table => hash(left.tables[table.name]) !== hash(right.tables[table.name])).map(table => table.name);
}
