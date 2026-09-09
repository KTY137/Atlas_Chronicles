// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { CAMPAIGN_V17_TABLES, CAMPAIGN_V17_MODULES, CAMPAIGN_BUNDLE_V17_LIMITS, type CampaignTablesV17 } from "../native-v17/schema.ts";
import type { CampaignColumn, CampaignRow } from "../campaign-schema.ts";
export const CAMPAIGN_BUNDLE_V18_LIMITS = CAMPAIGN_BUNDLE_V17_LIMITS;
const id = (): CampaignColumn => ({ kind: "text", maxLength: 128, pattern: "^[^\u0000-\u001f\u007f]+$" });
const text = (maxLength: number): CampaignColumn => ({ kind: "text", maxLength });
const time = (): CampaignColumn => ({ kind: "bigint" });
function table<const N extends string>(name: N, fields: Readonly<Record<string, CampaignColumn>>, primaryKey: readonly string[]) {
  return Object.freeze({ name, module: "regelarchiv" as const, fields: Object.freeze(fields),
    columns: Object.freeze(Object.keys(fields)), primaryKey: Object.freeze(primaryKey),
    bigintColumns: Object.freeze(Object.keys(fields).filter(k => fields[k]!.kind === "bigint")),
    jsonColumns: Object.freeze(Object.keys(fields).filter(k => fields[k]!.kind === "json")) });
}
/** `version` traegt dieselbe Laenge wie `rule_packages.version` (campaign-schema.ts:54). */
export const CAMPAIGN_V18_ADDITIONAL_TABLES = Object.freeze([
  table("rule_package_archiv", { campaign_id: id(), package_id: id(), version: text(128),
    archived_at: time(), archived_by: id() }, ["campaign_id", "package_id", "version"]),
] as const);
export const CAMPAIGN_V18_TABLES = Object.freeze([...CAMPAIGN_V17_TABLES, ...CAMPAIGN_V18_ADDITIONAL_TABLES] as const);
export const CAMPAIGN_V18_MODULES = Object.freeze([...CAMPAIGN_V17_MODULES, "regelarchiv"] as const);
export type CampaignTableNameV18 = typeof CAMPAIGN_V18_TABLES[number]["name"];
export type CampaignModuleV18 = typeof CAMPAIGN_V18_MODULES[number];
export type CampaignTablesV18 = CampaignTablesV17 & { readonly rule_package_archiv: readonly CampaignRow[] };
export function emptyCampaignTablesV18(): CampaignTablesV18 { return Object.fromEntries(CAMPAIGN_V18_TABLES.map(t => [t.name, []])) as unknown as CampaignTablesV18; }
