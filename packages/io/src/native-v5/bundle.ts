// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
// Copyright (c) 2026 Atlas Chronicles contributors. SPDX-License-Identifier: MIT
import { canonicalJson, type CanonicalValue } from "@chronicle/core";
import { normalizeCampaignCore } from "../campaign-bundle.ts";
import { checkActorInventoryTables } from "../campaign-bundle-v2.ts";
import { checkTacticalTables } from "../campaign-v3-tactical.ts";
import { checkAuthoringTables } from "../native-v4/validation.ts";
import { validateCampaignBundleV4, type CampaignBundleV4, type CampaignBundleDataV4 } from "../native-v4/bundle.ts";
import { CAMPAIGN_TABLES, CAMPAIGN_EXCLUSIONS, type CampaignRow, type CampaignTables } from "../campaign-schema.ts";
import { CAMPAIGN_V3_TABLES } from "../campaign-schema-v3.ts";
import { CAMPAIGN_V4_TABLES, CAMPAIGN_V4_MODULES, CAMPAIGN_BUNDLE_V4_LIMITS as LIMITS, type CampaignTablesV4, type CampaignTableNameV4 } from "../native-v4/schema.ts";
import { SUPPORTED_CAMPAIGN_RULES } from "../campaign-rules-profile.ts";
import { assertJson, fail, hash, object, list, string, keys, validateColumn, rejectDuplicateKeys } from "../campaign-v3-json.ts";

export const CAMPAIGN_BUNDLE_V5_VERSION = 5 as const;
export type CampaignBundleDataV5 = CampaignBundleDataV4;
export interface CampaignBundleV5 {
  readonly format: "atlas-chronicles/campaign"; readonly version: 5;
  readonly manifest: Omit<CampaignBundleV4["manifest"], "rulePackageSchemaVersion" | "coreFormatVersion"> & {
    readonly rulePackageSchemaVersion: 2;
    readonly ruleProfile: "rules-v1-v2@1";
    /** Table layout only: no v3 envelope is manufactured or admitted for v2 rules. */
    readonly coreTableVersion: 3;
  };
  readonly tables: CampaignTablesV4;
}
const baseNames = new Set<string>(CAMPAIGN_TABLES.map(table => table.name));
const additional = CAMPAIGN_V4_TABLES.filter(table => !baseNames.has(table.name));
function normalizeAdditional(input: CampaignTablesV4): CampaignTablesV4 {
  const tables: Record<string, CampaignRow[]> = {};
  for (const table of additional) {
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
  return tables as unknown as CampaignTablesV4;
}

export function createCampaignBundleV5(data: CampaignBundleDataV5): CampaignBundleV5 {
  assertJson(data); keys(object(data, "data"), ["campaignId", "universeId", "exportedAt", "tables"], "data");
  keys(object(data.tables, "tables"), CAMPAIGN_V4_TABLES.map(table => table.name), "tables");
  const base = normalizeCampaignCore({ campaignId: data.campaignId, universeId: data.universeId, exportedAt: data.exportedAt,
    tables: Object.fromEntries(CAMPAIGN_TABLES.map(table => [table.name, data.tables[table.name]])) as unknown as CampaignTables }, SUPPORTED_CAMPAIGN_RULES);
  const tables: CampaignTablesV4 = { ...normalizeAdditional(data.tables), ...base };
  if (CAMPAIGN_V4_TABLES.reduce((count, table) => count + tables[table.name].length, 0) > LIMITS.rows) fail("tables", "total row limit exceeded");
  checkActorInventoryTables(tables, data.campaignId, SUPPORTED_CAMPAIGN_RULES);
  checkTacticalTables(tables, data.campaignId);
  checkAuthoringTables(tables, data.campaignId);
  const modules = CAMPAIGN_V4_MODULES.map(name => {
    const specs = CAMPAIGN_V4_TABLES.filter(table => table.module === name);
    return { name, version: 1 as const, count: specs.reduce((count, table) => count + tables[table.name].length, 0),
      sha256: hash(Object.fromEntries(specs.map(table => [table.name, tables[table.name]]))) };
  });
  const bundle: CampaignBundleV5 = { format: "atlas-chronicles/campaign", version: 5, manifest: {
    profile: "complete-campaign", projection: "gm", campaignId: data.campaignId, universeId: data.universeId, exportedAt: data.exportedAt,
    blockAstVersion: 1, rulePackageSchemaVersion: 2, ruleProfile: "rules-v1-v2@1", coreTableVersion: 3,
    tacticalMapSchemaVersion: 1, themeSchemaVersion: 1, authoringSchemaVersion: 1,
    contentHash: hash(tables), coreContentHash: hash(Object.fromEntries(CAMPAIGN_V3_TABLES.map(table => [table.name, tables[table.name]]))),
    modules, excluded: CAMPAIGN_EXCLUSIONS, assetMode: "source-artifacts-and-tactical-sources",
  }, tables };
  if (Buffer.byteLength(canonicalJson(bundle as unknown as CanonicalValue), "utf8") > LIMITS.bytes) fail("$", "maximum campaign bundle size exceeded");
  return bundle;
}
export function validateCampaignBundleV5(value: unknown): CampaignBundleV5 {
  assertJson(value); const row = object(value, "$"), manifest = object(row.manifest, "manifest"); keys(row, ["format", "version", "manifest", "tables"], "$");
  keys(manifest, ["profile", "projection", "campaignId", "universeId", "exportedAt", "blockAstVersion", "rulePackageSchemaVersion", "ruleProfile", "contentHash", "coreContentHash", "coreTableVersion", "tacticalMapSchemaVersion", "themeSchemaVersion", "authoringSchemaVersion", "modules", "excluded", "assetMode"], "manifest");
  if (row.format !== "atlas-chronicles/campaign" || row.version !== 5 || manifest.profile !== "complete-campaign" || manifest.projection !== "gm" || manifest.blockAstVersion !== 1 || manifest.rulePackageSchemaVersion !== 2 || manifest.ruleProfile !== "rules-v1-v2@1" || manifest.coreTableVersion !== 3 || manifest.tacticalMapSchemaVersion !== 1 || manifest.themeSchemaVersion !== 1 || manifest.authoringSchemaVersion !== 1 || manifest.assetMode !== "source-artifacts-and-tactical-sources" || hash(manifest.excluded) !== hash(CAMPAIGN_EXCLUSIONS)) fail("manifest", "unsupported campaign profile/version; explicit migration required");
  const bundle = createCampaignBundleV5({ campaignId: string(manifest.campaignId, "manifest.campaignId"), universeId: string(manifest.universeId, "manifest.universeId"), exportedAt: string(manifest.exportedAt, "manifest.exportedAt", 40), tables: row.tables as unknown as CampaignTablesV4 });
  if (hash(manifest) !== hash(bundle.manifest)) fail("manifest", "payload/core/module checksum or count mismatch");
  return bundle;
}
export function parseCampaignBundleV5(text: string): CampaignBundleV5 {
  if (typeof text !== "string" || Buffer.byteLength(text, "utf8") > LIMITS.bytes) fail("$", "maximum campaign bundle size exceeded");
  rejectDuplicateKeys(text); let value: unknown; try { value = JSON.parse(text); } catch { fail("$", "invalid campaign JSON"); }
  return validateCampaignBundleV5(value);
}
export function serializeCampaignBundleV5(bundle: CampaignBundleV5): string { return canonicalJson(validateCampaignBundleV5(bundle) as unknown as CanonicalValue); }
export function campaignSemanticDiffV5(a: CampaignBundleV5, b: CampaignBundleV5): readonly CampaignTableNameV4[] {
  const left = validateCampaignBundleV5(a), right = validateCampaignBundleV5(b);
  return CAMPAIGN_V4_TABLES.filter(table => hash(left.tables[table.name]) !== hash(right.tables[table.name])).map(table => table.name);
}
export interface CampaignUpgradeReportV4ToV5 {
  readonly algorithm: "atlas-chronicles/v4-to-v5/supported-rules@1"; readonly sourceVersion: 4; readonly targetVersion: 5;
  readonly sourceContentHash: string; readonly targetContentHash: string; readonly sourceBundleHash: string; readonly targetBundleHash: string;
  readonly changedTables: readonly []; readonly reportHash: string;
}
/** Changes only the explicit envelope; all historical package, actor and receipt bytes survive. */
export function upgradeCampaignBundleV4(input: unknown): { bundle: CampaignBundleV5; report: CampaignUpgradeReportV4ToV5 } {
  const source = validateCampaignBundleV4(input);
  const bundle = createCampaignBundleV5({ campaignId: source.manifest.campaignId, universeId: source.manifest.universeId, exportedAt: source.manifest.exportedAt, tables: source.tables });
  const report = { algorithm: "atlas-chronicles/v4-to-v5/supported-rules@1" as const, sourceVersion: 4 as const, targetVersion: 5 as const,
    sourceContentHash: source.manifest.contentHash, targetContentHash: bundle.manifest.contentHash, sourceBundleHash: hash(source), targetBundleHash: hash(bundle), changedTables: [] as const };
  return { bundle, report: { ...report, reportHash: hash(report) } };
}
