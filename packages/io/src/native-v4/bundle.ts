// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
// Copyright (c) 2026 Atlas Chronicles contributors. SPDX-License-Identifier: MIT
import { canonicalJson, type CanonicalValue } from "@chronicle/core";
import { createCampaignBundleV3, validateCampaignBundleV3, type CampaignBundleV3 } from "../campaign-bundle-v3.ts";
import { CAMPAIGN_V3_TABLES, type CampaignTablesV3 } from "../campaign-schema-v3.ts";
import { CAMPAIGN_EXCLUSIONS, type CampaignRow } from "../campaign-schema.ts";
import { assertJson, fail, hash, object, list, string, keys, validateColumn, rejectDuplicateKeys } from "../campaign-v3-json.ts";
import { CAMPAIGN_BUNDLE_V4_LIMITS as LIMITS, CAMPAIGN_V4_ADDITIONAL_TABLES, CAMPAIGN_V4_TABLES, CAMPAIGN_V4_MODULES, type CampaignTablesV4, type CampaignTableNameV4, type CampaignModuleV4 } from "./schema.ts";
import { checkAuthoringTables } from "./validation.ts";

export const CAMPAIGN_BUNDLE_V4_VERSION = 4 as const;
export interface CampaignBundleDataV4 { readonly campaignId: string; readonly universeId: string; readonly exportedAt: string; readonly tables: CampaignTablesV4 }
export interface CampaignBundleV4 {
  readonly format: "atlas-chronicles/campaign"; readonly version: 4;
  readonly manifest: Omit<CampaignBundleV3["manifest"], "modules" | "coreFormatVersion"> & {
    readonly coreFormatVersion: 3; readonly themeSchemaVersion: 1; readonly authoringSchemaVersion: 1;
    readonly modules: readonly { readonly name: CampaignModuleV4; readonly version: 1; readonly count: number; readonly sha256: string }[];
  };
  readonly tables: CampaignTablesV4;
}
function normalizeAdditional(input: CampaignTablesV4): Pick<CampaignTablesV4, typeof CAMPAIGN_V4_ADDITIONAL_TABLES[number]["name"]> {
  const tables: Record<string, CampaignRow[]> = {};
  for (const table of CAMPAIGN_V4_ADDITIONAL_TABLES) {
    const seen = new Set<string>();
    tables[table.name] = list(input[table.name], `tables.${table.name}`).map((value, index) => {
      const path = `tables.${table.name}[${index}]`, row = object(value, path); keys(row, table.columns, path);
      for (const [column, field] of Object.entries(table.fields)) validateColumn(row[column], field, `${path}.${column}`);
      const pk = canonicalJson(table.primaryKey.map(column => row[column]!) as CanonicalValue);
      if (seen.has(pk)) fail(path, "duplicate primary key"); seen.add(pk);
      return JSON.parse(JSON.stringify(row)) as CampaignRow;
    }).sort((left, right) => {
      for (const column of table.primaryKey) {
        const a = left[column], b = right[column], order = typeof a === "number" && typeof b === "number" ? a - b : String(a) < String(b) ? -1 : String(a) > String(b) ? 1 : 0;
        if (order) return order;
      }
      return 0;
    });
  }
  return tables as unknown as ReturnType<typeof normalizeAdditional>;
}
export function createCampaignBundleV4(data: CampaignBundleDataV4): CampaignBundleV4 {
  assertJson(data); keys(object(data, "data"), ["campaignId", "universeId", "exportedAt", "tables"], "data"); keys(object(data.tables, "tables"), CAMPAIGN_V4_TABLES.map(table => table.name), "tables");
  const core = createCampaignBundleV3({ campaignId: data.campaignId, universeId: data.universeId, exportedAt: data.exportedAt,
    tables: Object.fromEntries(CAMPAIGN_V3_TABLES.map(table => [table.name, data.tables[table.name]])) as unknown as CampaignTablesV3 });
  const tables: CampaignTablesV4 = { ...core.tables, ...normalizeAdditional(data.tables) };
  if (CAMPAIGN_V4_TABLES.reduce((count, table) => count + tables[table.name].length, 0) > LIMITS.rows) fail("tables", "total row limit exceeded");
  checkAuthoringTables(tables, data.campaignId);
  const modules = CAMPAIGN_V4_MODULES.map(name => {
    const specs = CAMPAIGN_V4_TABLES.filter(table => table.module === name);
    return { name, version: 1 as const, count: specs.reduce((count, table) => count + tables[table.name].length, 0), sha256: hash(Object.fromEntries(specs.map(table => [table.name, tables[table.name]]))) };
  });
  const bundle: CampaignBundleV4 = { format: "atlas-chronicles/campaign", version: 4,
    manifest: { ...core.manifest, coreContentHash: core.manifest.contentHash, coreFormatVersion: 3, themeSchemaVersion: 1, authoringSchemaVersion: 1, contentHash: hash(tables), modules }, tables };
  if (Buffer.byteLength(canonicalJson(bundle as unknown as CanonicalValue), "utf8") > LIMITS.bytes) fail("$", "maximum campaign bundle size exceeded");
  return bundle;
}
export function validateCampaignBundleV4(value: unknown): CampaignBundleV4 {
  assertJson(value); const row = object(value, "$"), manifest = object(row.manifest, "manifest"); keys(row, ["format", "version", "manifest", "tables"], "$");
  keys(manifest, ["profile", "projection", "campaignId", "universeId", "exportedAt", "blockAstVersion", "rulePackageSchemaVersion", "contentHash", "coreContentHash", "coreFormatVersion", "tacticalMapSchemaVersion", "themeSchemaVersion", "authoringSchemaVersion", "modules", "excluded", "assetMode"], "manifest");
  if (row.format !== "atlas-chronicles/campaign" || row.version !== 4 || manifest.profile !== "complete-campaign" || manifest.projection !== "gm" || manifest.blockAstVersion !== 1 || manifest.rulePackageSchemaVersion !== 1 || manifest.coreFormatVersion !== 3 || manifest.tacticalMapSchemaVersion !== 1 || manifest.themeSchemaVersion !== 1 || manifest.authoringSchemaVersion !== 1 || manifest.assetMode !== "source-artifacts-and-tactical-sources" || hash(manifest.excluded) !== hash(CAMPAIGN_EXCLUSIONS)) fail("manifest", "unsupported campaign profile/version; explicit migration required");
  const bundle = createCampaignBundleV4({ campaignId: string(manifest.campaignId, "manifest.campaignId"), universeId: string(manifest.universeId, "manifest.universeId"), exportedAt: string(manifest.exportedAt, "manifest.exportedAt", 40), tables: row.tables as unknown as CampaignTablesV4 });
  if (hash(manifest) !== hash(bundle.manifest)) fail("manifest", "payload/core/module checksum or count mismatch");
  return bundle;
}
export function parseCampaignBundleV4(text: string): CampaignBundleV4 {
  if (typeof text !== "string" || Buffer.byteLength(text, "utf8") > LIMITS.bytes) fail("$", "maximum campaign bundle size exceeded");
  rejectDuplicateKeys(text); let value: unknown; try { value = JSON.parse(text); } catch { fail("$", "invalid campaign JSON"); }
  return validateCampaignBundleV4(value);
}
export function serializeCampaignBundleV4(bundle: CampaignBundleV4): string { return canonicalJson(validateCampaignBundleV4(bundle) as unknown as CanonicalValue); }
export function campaignSemanticDiffV4(a: CampaignBundleV4, b: CampaignBundleV4): readonly CampaignTableNameV4[] {
  const left = validateCampaignBundleV4(a), right = validateCampaignBundleV4(b);
  return CAMPAIGN_V4_TABLES.filter(table => hash(left.tables[table.name]) !== hash(right.tables[table.name])).map(table => table.name);
}
export interface CampaignUpgradeReportV3ToV4 {
  readonly algorithm: "atlas-chronicles/v3-to-v4/empty-authoring@1"; readonly sourceVersion: 3; readonly targetVersion: 4;
  readonly sourceContentHash: string; readonly targetContentHash: string; readonly sourceBundleHash: string;
  readonly addedRows: readonly { readonly table: string; readonly count: number }[]; readonly reportHash: string;
}
export function upgradeCampaignBundleV3(input: unknown): { bundle: CampaignBundleV4; report: CampaignUpgradeReportV3ToV4 } {
  const source = validateCampaignBundleV3(input), tables = { ...source.tables, ...Object.fromEntries(CAMPAIGN_V4_ADDITIONAL_TABLES.map(table => [table.name, []])) } as CampaignTablesV4;
  const bundle = createCampaignBundleV4({ campaignId: source.manifest.campaignId, universeId: source.manifest.universeId, exportedAt: source.manifest.exportedAt, tables });
  const report = { algorithm: "atlas-chronicles/v3-to-v4/empty-authoring@1" as const, sourceVersion: 3 as const, targetVersion: 4 as const,
    sourceContentHash: source.manifest.contentHash, targetContentHash: bundle.manifest.contentHash, sourceBundleHash: hash(source), addedRows: CAMPAIGN_V4_ADDITIONAL_TABLES.map(table => ({ table: table.name, count: 0 })) };
  return { bundle, report: { ...report, reportHash: hash(report) } };
}
