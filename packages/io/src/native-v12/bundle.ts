import { canonicalJson, type CanonicalValue } from "@chronicle/core";
import { createCampaignBundleV11, type CampaignBundleV11 } from "../native-v11/bundle.ts";
import { CAMPAIGN_V11_TABLES, type CampaignTablesV11 } from "../native-v11/schema.ts";
import type { CampaignRow } from "../campaign-schema.ts";
import { assertJson, fail, hash, object, list, string, keys, validateColumn, rejectDuplicateKeys } from "../campaign-v3-json.ts";
import { CAMPAIGN_V12_TABLES, CAMPAIGN_V12_ADDITIONAL_TABLES, CAMPAIGN_V12_MODULES, CAMPAIGN_BUNDLE_V12_LIMITS as LIMITS, type CampaignTablesV12, type CampaignModuleV12, type CampaignTableNameV12 } from "./schema.ts";
import { checkErleichterungenTables } from "./validation.ts";

export const CAMPAIGN_BUNDLE_V12_VERSION = 12 as const;
export interface CampaignBundleDataV12 { readonly campaignId: string; readonly universeId: string; readonly exportedAt: string; readonly tables: CampaignTablesV12 }
export interface CampaignBundleV12 {
  readonly format: "atlas-chronicles/campaign"; readonly version: 12;
  readonly manifest: Omit<CampaignBundleV11["manifest"], "modules"> & { readonly erleichterungSchemaVersion: 1;
    readonly modules: readonly { readonly name: CampaignModuleV12; readonly version: 1; readonly count: number; readonly sha256: string }[] };
  readonly tables: CampaignTablesV12;
}
export function createCampaignBundleV12(data: CampaignBundleDataV12): CampaignBundleV12 {
  assertJson(data); keys(object(data, "data"), ["campaignId", "universeId", "exportedAt", "tables"], "data");
  keys(object(data.tables, "tables"), CAMPAIGN_V12_TABLES.map(table => table.name), "tables");
  const core = createCampaignBundleV11({ ...data, tables: Object.fromEntries(CAMPAIGN_V11_TABLES.map(table => [table.name, data.tables[table.name]])) as unknown as CampaignTablesV11 });
  const additional: Record<string, CampaignRow[]> = {};
  for (const table of CAMPAIGN_V12_ADDITIONAL_TABLES) {
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
  const tables = { ...core.tables, ...additional } as CampaignTablesV12;
  if (CAMPAIGN_V12_TABLES.reduce((count, table) => count + tables[table.name].length, 0) > LIMITS.rows) fail("tables", "total row limit exceeded");
  checkErleichterungenTables(tables, data.campaignId);
  const modules = CAMPAIGN_V12_MODULES.map(name => {
    const specs = CAMPAIGN_V12_TABLES.filter(table => table.module === name);
    return { name, version: 1 as const, count: specs.reduce((count, table) => count + tables[table.name].length, 0), sha256: hash(Object.fromEntries(specs.map(table => [table.name, tables[table.name]]))) };
  });
  const bundle: CampaignBundleV12 = { format: "atlas-chronicles/campaign", version: 12,
    manifest: { ...core.manifest, erleichterungSchemaVersion: 1, contentHash: hash(tables), modules }, tables };
  if (Buffer.byteLength(canonicalJson(bundle as unknown as CanonicalValue), "utf8") > LIMITS.bytes) fail("$", "maximum campaign bundle size exceeded");
  return bundle;
}
export function validateCampaignBundleV12(value: unknown): CampaignBundleV12 {
  assertJson(value); const row = object(value, "$"), manifest = object(row.manifest, "manifest"); keys(row, ["format", "version", "manifest", "tables"], "$");
  if (row.format !== "atlas-chronicles/campaign" || row.version !== 12 || manifest.erleichterungSchemaVersion !== 1) fail("manifest", "unsupported campaign profile/version; explicit migration required");
  const bundle = createCampaignBundleV12({ campaignId: string(manifest.campaignId, "manifest.campaignId"), universeId: string(manifest.universeId, "manifest.universeId"), exportedAt: string(manifest.exportedAt, "manifest.exportedAt", 40), tables: row.tables as unknown as CampaignTablesV12 });
  keys(manifest, Object.keys(bundle.manifest), "manifest");
  if (hash(manifest) !== hash(bundle.manifest)) fail("manifest", "payload/core/module checksum or count mismatch");
  return bundle;
}
export function parseCampaignBundleV12(text: string): CampaignBundleV12 {
  if (typeof text !== "string" || Buffer.byteLength(text, "utf8") > LIMITS.bytes) fail("$", "maximum campaign bundle size exceeded");
  rejectDuplicateKeys(text); let value: unknown; try { value = JSON.parse(text); } catch { fail("$", "invalid campaign JSON"); }
  return validateCampaignBundleV12(value);
}
export function serializeCampaignBundleV12(bundle: CampaignBundleV12): string { return canonicalJson(validateCampaignBundleV12(bundle) as unknown as CanonicalValue); }
export function campaignSemanticDiffV12(a: CampaignBundleV12, b: CampaignBundleV12): readonly CampaignTableNameV12[] {
  const left = validateCampaignBundleV12(a), right = validateCampaignBundleV12(b);
  return CAMPAIGN_V12_TABLES.filter(table => hash(left.tables[table.name]) !== hash(right.tables[table.name])).map(table => table.name);
}
