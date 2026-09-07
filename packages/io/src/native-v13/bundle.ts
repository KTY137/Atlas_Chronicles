import { canonicalJson, type CanonicalValue } from "@chronicle/core";
import { createCampaignBundleV12, type CampaignBundleV12 } from "../native-v12/bundle.ts";
import { CAMPAIGN_V12_TABLES, type CampaignTablesV12 } from "../native-v12/schema.ts";
import type { CampaignRow } from "../campaign-schema.ts";
import { assertJson, fail, hash, object, list, string, keys, validateColumn, rejectDuplicateKeys } from "../campaign-v3-json.ts";
import { CAMPAIGN_V13_TABLES, CAMPAIGN_V13_ADDITIONAL_TABLES, CAMPAIGN_V13_MODULES, CAMPAIGN_BUNDLE_V13_LIMITS as LIMITS, type CampaignTablesV13, type CampaignModuleV13, type CampaignTableNameV13 } from "./schema.ts";
import { checkGeldTables } from "./validation.ts";

export const CAMPAIGN_BUNDLE_V13_VERSION = 13 as const;
export interface CampaignBundleDataV13 { readonly campaignId: string; readonly universeId: string; readonly exportedAt: string; readonly tables: CampaignTablesV13 }
export interface CampaignBundleV13 {
  readonly format: "atlas-chronicles/campaign"; readonly version: 13;
  readonly manifest: Omit<CampaignBundleV12["manifest"], "modules"> & { readonly geldSchemaVersion: 1;
    readonly modules: readonly { readonly name: CampaignModuleV13; readonly version: 1; readonly count: number; readonly sha256: string }[] };
  readonly tables: CampaignTablesV13;
}
export function createCampaignBundleV13(data: CampaignBundleDataV13): CampaignBundleV13 {
  assertJson(data); keys(object(data, "data"), ["campaignId", "universeId", "exportedAt", "tables"], "data");
  keys(object(data.tables, "tables"), CAMPAIGN_V13_TABLES.map(table => table.name), "tables");
  const core = createCampaignBundleV12({ ...data, tables: Object.fromEntries(CAMPAIGN_V12_TABLES.map(table => [table.name, data.tables[table.name]])) as unknown as CampaignTablesV12 });
  const additional: Record<string, CampaignRow[]> = {};
  for (const table of CAMPAIGN_V13_ADDITIONAL_TABLES) {
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
  const tables = { ...core.tables, ...additional } as CampaignTablesV13;
  if (CAMPAIGN_V13_TABLES.reduce((count, table) => count + tables[table.name].length, 0) > LIMITS.rows) fail("tables", "total row limit exceeded");
  checkGeldTables(tables, data.campaignId);
  const modules = CAMPAIGN_V13_MODULES.map(name => {
    const specs = CAMPAIGN_V13_TABLES.filter(table => table.module === name);
    return { name, version: 1 as const, count: specs.reduce((count, table) => count + tables[table.name].length, 0), sha256: hash(Object.fromEntries(specs.map(table => [table.name, tables[table.name]]))) };
  });
  const bundle: CampaignBundleV13 = { format: "atlas-chronicles/campaign", version: 13,
    manifest: { ...core.manifest, geldSchemaVersion: 1, contentHash: hash(tables), modules }, tables };
  if (Buffer.byteLength(canonicalJson(bundle as unknown as CanonicalValue), "utf8") > LIMITS.bytes) fail("$", "maximum campaign bundle size exceeded");
  return bundle;
}
export function validateCampaignBundleV13(value: unknown): CampaignBundleV13 {
  assertJson(value); const row = object(value, "$"), manifest = object(row.manifest, "manifest"); keys(row, ["format", "version", "manifest", "tables"], "$");
  if (row.format !== "atlas-chronicles/campaign" || row.version !== 13 || manifest.geldSchemaVersion !== 1) fail("manifest", "unsupported campaign profile/version; explicit migration required");
  const bundle = createCampaignBundleV13({ campaignId: string(manifest.campaignId, "manifest.campaignId"), universeId: string(manifest.universeId, "manifest.universeId"), exportedAt: string(manifest.exportedAt, "manifest.exportedAt", 40), tables: row.tables as unknown as CampaignTablesV13 });
  keys(manifest, Object.keys(bundle.manifest), "manifest");
  if (hash(manifest) !== hash(bundle.manifest)) fail("manifest", "payload/core/module checksum or count mismatch");
  return bundle;
}
export function parseCampaignBundleV13(text: string): CampaignBundleV13 {
  if (typeof text !== "string" || Buffer.byteLength(text, "utf8") > LIMITS.bytes) fail("$", "maximum campaign bundle size exceeded");
  rejectDuplicateKeys(text); let value: unknown; try { value = JSON.parse(text); } catch { fail("$", "invalid campaign JSON"); }
  return validateCampaignBundleV13(value);
}
export function serializeCampaignBundleV13(bundle: CampaignBundleV13): string { return canonicalJson(validateCampaignBundleV13(bundle) as unknown as CanonicalValue); }
export function campaignSemanticDiffV13(a: CampaignBundleV13, b: CampaignBundleV13): readonly CampaignTableNameV13[] {
  const left = validateCampaignBundleV13(a), right = validateCampaignBundleV13(b);
  return CAMPAIGN_V13_TABLES.filter(table => hash(left.tables[table.name]) !== hash(right.tables[table.name])).map(table => table.name);
}
