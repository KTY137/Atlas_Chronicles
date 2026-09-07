import { canonicalJson, type CanonicalValue } from "@chronicle/core";
import { createCampaignBundleV7, type CampaignBundleV7 } from "../native-v7/bundle.ts";
import { CAMPAIGN_V7_TABLES, type CampaignTablesV7 } from "../native-v7/schema.ts";
import type { CampaignRow } from "../campaign-schema.ts";
import { assertJson, fail, hash, object, list, string, keys, validateColumn, rejectDuplicateKeys } from "../campaign-v3-json.ts";
import { CAMPAIGN_V8_TABLES, CAMPAIGN_V8_ADDITIONAL_TABLES, CAMPAIGN_V8_MODULES, CAMPAIGN_BUNDLE_V8_LIMITS as LIMITS, type CampaignTablesV8, type CampaignModuleV8, type CampaignTableNameV8 } from "./schema.ts";
import { checkZugangTables } from "./validation.ts";

export const CAMPAIGN_BUNDLE_V8_VERSION = 8 as const;
export interface CampaignBundleDataV8 { readonly campaignId: string; readonly universeId: string; readonly exportedAt: string; readonly tables: CampaignTablesV8 }
export interface CampaignBundleV8 {
  readonly format: "atlas-chronicles/campaign"; readonly version: 8;
  readonly manifest: Omit<CampaignBundleV7["manifest"], "modules"> & { readonly zugangSchemaVersion: 1;
    readonly modules: readonly { readonly name: CampaignModuleV8; readonly version: 1; readonly count: number; readonly sha256: string }[] };
  readonly tables: CampaignTablesV8;
}
export function createCampaignBundleV8(data: CampaignBundleDataV8): CampaignBundleV8 {
  assertJson(data); keys(object(data, "data"), ["campaignId", "universeId", "exportedAt", "tables"], "data");
  keys(object(data.tables, "tables"), CAMPAIGN_V8_TABLES.map(table => table.name), "tables");
  const core = createCampaignBundleV7({ ...data, tables: Object.fromEntries(CAMPAIGN_V7_TABLES.map(table => [table.name, data.tables[table.name]])) as unknown as CampaignTablesV7 });
  const additional: Record<string, CampaignRow[]> = {};
  for (const table of CAMPAIGN_V8_ADDITIONAL_TABLES) {
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
  const tables = { ...core.tables, ...additional } as CampaignTablesV8;
  if (CAMPAIGN_V8_TABLES.reduce((count, table) => count + tables[table.name].length, 0) > LIMITS.rows) fail("tables", "total row limit exceeded");
  checkZugangTables(tables, data.campaignId);
  const modules = CAMPAIGN_V8_MODULES.map(name => {
    const specs = CAMPAIGN_V8_TABLES.filter(table => table.module === name);
    return { name, version: 1 as const, count: specs.reduce((count, table) => count + tables[table.name].length, 0), sha256: hash(Object.fromEntries(specs.map(table => [table.name, tables[table.name]]))) };
  });
  const bundle: CampaignBundleV8 = { format: "atlas-chronicles/campaign", version: 8,
    manifest: { ...core.manifest, zugangSchemaVersion: 1, contentHash: hash(tables), modules }, tables };
  if (Buffer.byteLength(canonicalJson(bundle as unknown as CanonicalValue), "utf8") > LIMITS.bytes) fail("$", "maximum campaign bundle size exceeded");
  return bundle;
}
export function validateCampaignBundleV8(value: unknown): CampaignBundleV8 {
  assertJson(value); const row = object(value, "$"), manifest = object(row.manifest, "manifest"); keys(row, ["format", "version", "manifest", "tables"], "$");
  if (row.format !== "atlas-chronicles/campaign" || row.version !== 8 || manifest.zugangSchemaVersion !== 1) fail("manifest", "unsupported campaign profile/version; explicit migration required");
  const bundle = createCampaignBundleV8({ campaignId: string(manifest.campaignId, "manifest.campaignId"), universeId: string(manifest.universeId, "manifest.universeId"), exportedAt: string(manifest.exportedAt, "manifest.exportedAt", 40), tables: row.tables as unknown as CampaignTablesV8 });
  keys(manifest, Object.keys(bundle.manifest), "manifest");
  if (hash(manifest) !== hash(bundle.manifest)) fail("manifest", "payload/core/module checksum or count mismatch");
  return bundle;
}
export function parseCampaignBundleV8(text: string): CampaignBundleV8 {
  if (typeof text !== "string" || Buffer.byteLength(text, "utf8") > LIMITS.bytes) fail("$", "maximum campaign bundle size exceeded");
  rejectDuplicateKeys(text); let value: unknown; try { value = JSON.parse(text); } catch { fail("$", "invalid campaign JSON"); }
  return validateCampaignBundleV8(value);
}
export function serializeCampaignBundleV8(bundle: CampaignBundleV8): string { return canonicalJson(validateCampaignBundleV8(bundle) as unknown as CanonicalValue); }
export function campaignSemanticDiffV8(a: CampaignBundleV8, b: CampaignBundleV8): readonly CampaignTableNameV8[] {
  const left = validateCampaignBundleV8(a), right = validateCampaignBundleV8(b);
  return CAMPAIGN_V8_TABLES.filter(table => hash(left.tables[table.name]) !== hash(right.tables[table.name])).map(table => table.name);
}
