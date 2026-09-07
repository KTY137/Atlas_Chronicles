// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
// Copyright (c) 2026 Atlas Chronicles contributors. SPDX-License-Identifier: MIT
import { canonicalJson, type CanonicalValue } from "@chronicle/core";
import { createCampaignBundleV2, validateCampaignBundleV2, type CampaignBundleV2 } from "./campaign-bundle-v2.ts";
import { CAMPAIGN_V2_TABLES, type CampaignTablesV2 } from "./campaign-schema-v2.ts";
import { CAMPAIGN_EXCLUSIONS, type CampaignRow } from "./campaign-schema.ts";
import { CAMPAIGN_V3_TABLES, CAMPAIGN_V3_ADDITIONAL_TABLES, CAMPAIGN_V3_MODULES, type CampaignTablesV3, type CampaignTableNameV3, type CampaignModuleV3 } from "./campaign-schema-v3.ts";
import { CAMPAIGN_BUNDLE_V3_LIMITS as LIMITS } from "./campaign-v3-limits.ts";
import { assertJson, fail, hash, object, list, string, keys, validateColumn, rejectDuplicateKeys } from "./campaign-v3-json.ts";
import { checkTacticalTables } from "./campaign-v3-tactical.ts";

export const CAMPAIGN_BUNDLE_V3_VERSION = 3 as const;
export interface CampaignBundleDataV3 { readonly campaignId: string; readonly universeId: string; readonly exportedAt: string; readonly tables: CampaignTablesV3 }
export interface CampaignBundleV3 {
  readonly format: "atlas-chronicles/campaign"; readonly version: 3;
  readonly manifest: Omit<CampaignBundleV2["manifest"], "modules" | "assetMode"> & {
    readonly coreFormatVersion: 2; readonly tacticalMapSchemaVersion: 1;
    readonly assetMode: "source-artifacts-and-tactical-sources";
    readonly modules: readonly { readonly name: CampaignModuleV3; readonly version: 1; readonly count: number; readonly sha256: string }[];
  };
  readonly tables: CampaignTablesV3;
}

function normalizeAdditional(input: CampaignTablesV3): Pick<CampaignTablesV3, typeof CAMPAIGN_V3_ADDITIONAL_TABLES[number]["name"]> {
  const tables: Record<string, CampaignRow[]> = {};
  for (const table of CAMPAIGN_V3_ADDITIONAL_TABLES) {
    const seen = new Set<string>();
    tables[table.name] = list(input[table.name], `tables.${table.name}`).map((value, index) => {
      const path = `tables.${table.name}[${index}]`, row = object(value, path); keys(row, table.columns, path);
      for (const [column, field] of Object.entries(table.fields)) validateColumn(row[column], field, `${path}.${column}`);
      const pk = canonicalJson(table.primaryKey.map(column => row[column]!) as CanonicalValue);
      if (seen.has(pk)) fail(path, "duplicate primary key"); seen.add(pk);
      return JSON.parse(JSON.stringify(row)) as CampaignRow;
    }).sort((left, right) => {
      for (const column of table.primaryKey) {
        const a = left[column], b = right[column];
        const order = typeof a === "number" && typeof b === "number" ? a - b : String(a) < String(b) ? -1 : String(a) > String(b) ? 1 : 0;
        if (order) return order;
      }
      return 0;
    });
  }
  return tables as unknown as ReturnType<typeof normalizeAdditional>;
}

export function createCampaignBundleV3(data: CampaignBundleDataV3): CampaignBundleV3 {
  assertJson(data); keys(object(data, "data"), ["campaignId", "universeId", "exportedAt", "tables"], "data");
  keys(object(data.tables, "tables"), CAMPAIGN_V3_TABLES.map(table => table.name), "tables");
  const core = createCampaignBundleV2({ campaignId: data.campaignId, universeId: data.universeId, exportedAt: data.exportedAt,
    tables: Object.fromEntries(CAMPAIGN_V2_TABLES.map(table => [table.name, data.tables[table.name]])) as unknown as CampaignTablesV2 });
  const tables: CampaignTablesV3 = { ...core.tables, ...normalizeAdditional(data.tables) };
  if (CAMPAIGN_V3_TABLES.reduce((count, table) => count + tables[table.name].length, 0) > LIMITS.rows) fail("tables", "total row limit exceeded");
  checkTacticalTables(tables, data.campaignId);
  const modules = CAMPAIGN_V3_MODULES.map(name => {
    const specs = CAMPAIGN_V3_TABLES.filter(table => table.module === name);
    return { name, version: 1 as const, count: specs.reduce((count, table) => count + tables[table.name].length, 0), sha256: hash(Object.fromEntries(specs.map(table => [table.name, tables[table.name]]))) };
  });
  const bundle: CampaignBundleV3 = { format: "atlas-chronicles/campaign", version: 3,
    manifest: { ...core.manifest, coreContentHash: core.manifest.contentHash, coreFormatVersion: 2, tacticalMapSchemaVersion: 1,
      assetMode: "source-artifacts-and-tactical-sources", contentHash: hash(tables), modules }, tables };
  if (Buffer.byteLength(canonicalJson(bundle as unknown as CanonicalValue), "utf8") > LIMITS.bytes) fail("$", "maximum campaign bundle size exceeded");
  return bundle;
}
export function validateCampaignBundleV3(value: unknown): CampaignBundleV3 {
  assertJson(value); const row = object(value, "$"), manifest = object(row.manifest, "manifest"); keys(row, ["format", "version", "manifest", "tables"], "$");
  keys(manifest, ["profile", "projection", "campaignId", "universeId", "exportedAt", "blockAstVersion", "rulePackageSchemaVersion", "contentHash", "coreContentHash", "coreFormatVersion", "tacticalMapSchemaVersion", "modules", "excluded", "assetMode"], "manifest");
  if (row.format !== "atlas-chronicles/campaign" || row.version !== 3 || manifest.profile !== "complete-campaign" || manifest.projection !== "gm" || manifest.blockAstVersion !== 1 || manifest.rulePackageSchemaVersion !== 1 || manifest.coreFormatVersion !== 2 || manifest.tacticalMapSchemaVersion !== 1 || manifest.assetMode !== "source-artifacts-and-tactical-sources" || hash(manifest.excluded) !== hash(CAMPAIGN_EXCLUSIONS)) fail("manifest", "unsupported campaign profile/version; explicit migration required");
  const bundle = createCampaignBundleV3({ campaignId: string(manifest.campaignId, "manifest.campaignId"), universeId: string(manifest.universeId, "manifest.universeId"), exportedAt: string(manifest.exportedAt, "manifest.exportedAt", 40), tables: row.tables as unknown as CampaignTablesV3 });
  if (hash(manifest) !== hash(bundle.manifest)) fail("manifest", "payload/core/module checksum or count mismatch");
  return bundle;
}
export function parseCampaignBundleV3(text: string): CampaignBundleV3 {
  if (typeof text !== "string" || Buffer.byteLength(text, "utf8") > LIMITS.bytes) fail("$", "maximum campaign bundle size exceeded");
  let value: unknown; try { value = JSON.parse(text); } catch { fail("$", "invalid campaign JSON"); }
  rejectDuplicateKeys(text); return validateCampaignBundleV3(value);
}
export function serializeCampaignBundleV3(bundle: CampaignBundleV3): string { return canonicalJson(validateCampaignBundleV3(bundle) as unknown as CanonicalValue); }
export function campaignSemanticDiffV3(a: CampaignBundleV3, b: CampaignBundleV3): readonly CampaignTableNameV3[] {
  const left = validateCampaignBundleV3(a), right = validateCampaignBundleV3(b);
  return CAMPAIGN_V3_TABLES.filter(table => hash(left.tables[table.name]) !== hash(right.tables[table.name])).map(table => table.name);
}
export interface CampaignUpgradeReportV2ToV3 {
  readonly algorithm: "atlas-chronicles/v2-to-v3/empty-tactical@1";
  readonly sourceVersion: 2; readonly targetVersion: 3;
  readonly sourceContentHash: string; readonly targetContentHash: string; readonly sourceBundleHash: string;
  readonly addedRows: readonly { readonly table: string; readonly count: number }[]; readonly reportHash: string;
}
/** Explicit empty addition only: no inferred scene plan, initial state or historical motion. */
export function upgradeCampaignBundleV2(input: unknown): { bundle: CampaignBundleV3; report: CampaignUpgradeReportV2ToV3 } {
  const source = validateCampaignBundleV2(input);
  const tables = { ...source.tables, ...Object.fromEntries(CAMPAIGN_V3_ADDITIONAL_TABLES.map(table => [table.name, []])) } as CampaignTablesV3;
  const bundle = createCampaignBundleV3({ campaignId: source.manifest.campaignId, universeId: source.manifest.universeId, exportedAt: source.manifest.exportedAt, tables });
  const receipt = { algorithm: "atlas-chronicles/v2-to-v3/empty-tactical@1" as const, sourceVersion: 2 as const, targetVersion: 3 as const,
    sourceContentHash: source.manifest.contentHash, targetContentHash: bundle.manifest.contentHash, sourceBundleHash: hash(source),
    addedRows: CAMPAIGN_V3_ADDITIONAL_TABLES.map(table => ({ table: table.name, count: 0 })) };
  return { bundle, report: { ...receipt, reportHash: hash(receipt) } };
}
