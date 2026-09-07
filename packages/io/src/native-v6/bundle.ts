import { canonicalJson, type CanonicalValue } from "@chronicle/core";
import { createCampaignBundleV5, type CampaignBundleV5 } from "../native-v5/bundle.ts";
import { CAMPAIGN_V4_TABLES, type CampaignTablesV4 } from "../native-v4/schema.ts";
import type { CampaignRow } from "../campaign-schema.ts";
import { assertJson, fail, hash, object, list, string, keys, validateColumn, rejectDuplicateKeys } from "../campaign-v3-json.ts";
import { CAMPAIGN_V6_TABLES, CAMPAIGN_V6_ADDITIONAL_TABLES, CAMPAIGN_V6_MODULES, CAMPAIGN_BUNDLE_V6_LIMITS as LIMITS, type CampaignTablesV6, type CampaignModuleV6, type CampaignTableNameV6 } from "./schema.ts";
import { checkNestedMapTables } from "./validation.ts";

export const CAMPAIGN_BUNDLE_V6_VERSION = 6 as const;
export interface CampaignBundleDataV6 { readonly campaignId: string; readonly universeId: string; readonly exportedAt: string; readonly tables: CampaignTablesV6 }
export interface CampaignBundleV6 {
  readonly format: "atlas-chronicles/campaign"; readonly version: 6;
  readonly manifest: Omit<CampaignBundleV5["manifest"], "modules"> & { readonly nestedMapSchemaVersion: 1;
    readonly modules: readonly { readonly name: CampaignModuleV6; readonly version: 1; readonly count: number; readonly sha256: string }[] };
  readonly tables: CampaignTablesV6;
}
export function createCampaignBundleV6(data: CampaignBundleDataV6): CampaignBundleV6 {
  assertJson(data); keys(object(data, "data"), ["campaignId", "universeId", "exportedAt", "tables"], "data");
  keys(object(data.tables, "tables"), CAMPAIGN_V6_TABLES.map(table => table.name), "tables");
  const core = createCampaignBundleV5({ ...data, tables: Object.fromEntries(CAMPAIGN_V4_TABLES.map(table => [table.name, data.tables[table.name]])) as unknown as CampaignTablesV4 });
  const additional: Record<string, CampaignRow[]> = {};
  for (const table of CAMPAIGN_V6_ADDITIONAL_TABLES) {
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
  const tables = { ...core.tables, ...additional } as CampaignTablesV6;
  if (CAMPAIGN_V6_TABLES.reduce((count, table) => count + tables[table.name].length, 0) > LIMITS.rows) fail("tables", "total row limit exceeded");
  checkNestedMapTables(tables, data.campaignId);
  const modules = CAMPAIGN_V6_MODULES.map(name => {
    const specs = CAMPAIGN_V6_TABLES.filter(table => table.module === name);
    return { name, version: 1 as const, count: specs.reduce((count, table) => count + tables[table.name].length, 0), sha256: hash(Object.fromEntries(specs.map(table => [table.name, tables[table.name]]))) };
  });
  const bundle: CampaignBundleV6 = { format: "atlas-chronicles/campaign", version: 6,
    manifest: { ...core.manifest, nestedMapSchemaVersion: 1, contentHash: hash(tables), modules }, tables };
  if (Buffer.byteLength(canonicalJson(bundle as unknown as CanonicalValue), "utf8") > LIMITS.bytes) fail("$", "maximum campaign bundle size exceeded");
  return bundle;
}
export function validateCampaignBundleV6(value: unknown): CampaignBundleV6 {
  assertJson(value); const row = object(value, "$"), manifest = object(row.manifest, "manifest"); keys(row, ["format", "version", "manifest", "tables"], "$");
  if (row.format !== "atlas-chronicles/campaign" || row.version !== 6 || manifest.nestedMapSchemaVersion !== 1) fail("manifest", "unsupported campaign profile/version; explicit migration required");
  const bundle = createCampaignBundleV6({ campaignId: string(manifest.campaignId, "manifest.campaignId"), universeId: string(manifest.universeId, "manifest.universeId"), exportedAt: string(manifest.exportedAt, "manifest.exportedAt", 40), tables: row.tables as unknown as CampaignTablesV6 });
  keys(manifest, Object.keys(bundle.manifest), "manifest");
  if (hash(manifest) !== hash(bundle.manifest)) fail("manifest", "payload/core/module checksum or count mismatch");
  return bundle;
}
export function parseCampaignBundleV6(text: string): CampaignBundleV6 {
  if (typeof text !== "string" || Buffer.byteLength(text, "utf8") > LIMITS.bytes) fail("$", "maximum campaign bundle size exceeded");
  rejectDuplicateKeys(text); let value: unknown; try { value = JSON.parse(text); } catch { fail("$", "invalid campaign JSON"); }
  return validateCampaignBundleV6(value);
}
export function serializeCampaignBundleV6(bundle: CampaignBundleV6): string { return canonicalJson(validateCampaignBundleV6(bundle) as unknown as CanonicalValue); }
export function campaignSemanticDiffV6(a: CampaignBundleV6, b: CampaignBundleV6): readonly CampaignTableNameV6[] {
  const left = validateCampaignBundleV6(a), right = validateCampaignBundleV6(b);
  return CAMPAIGN_V6_TABLES.filter(table => hash(left.tables[table.name]) !== hash(right.tables[table.name])).map(table => table.name);
}
