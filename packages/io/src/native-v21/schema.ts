// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { CAMPAIGN_V20_TABLES, CAMPAIGN_V20_MODULES, CAMPAIGN_BUNDLE_V20_LIMITS, type CampaignTablesV20 } from "../native-v20/schema.ts";
import type { CampaignColumn, CampaignRow } from "../campaign-schema.ts";
export const CAMPAIGN_BUNDLE_V21_LIMITS = CAMPAIGN_BUNDLE_V20_LIMITS;
const id = (): CampaignColumn => ({ kind: "text", maxLength: 128, pattern: "^[^\u0000-\u001f\u007f]+$" });
const version = (): CampaignColumn => ({ kind: "integer", minimum: 1, maximum: 2147483647 });
const time = (): CampaignColumn => ({ kind: "bigint" });
const nullable = (column: CampaignColumn): CampaignColumn => ({ ...column, nullable: true });
function table<const N extends string>(name: N, fields: Readonly<Record<string, CampaignColumn>>, primaryKey: readonly string[]) {
  return Object.freeze({ name, module: "tabletop" as const, fields: Object.freeze(fields), columns: Object.freeze(Object.keys(fields)), primaryKey: Object.freeze(primaryKey),
    bigintColumns: Object.freeze(Object.keys(fields).filter(k => fields[k]!.kind === "bigint")), jsonColumns: Object.freeze(Object.keys(fields).filter(k => fields[k]!.kind === "json")) });
}
export const CAMPAIGN_V21_ADDITIONAL_TABLES = Object.freeze([
  table("adventure_trees", { campaign_id: id(), version: version(), document: { kind: "json" }, current_node_id: nullable(id()), updated_by: id(), updated_at: time() }, ["campaign_id"]),
  table("actor_portraits", { actor_id: id(), campaign_id: id(), version: version(),
    mime: nullable({ kind: "text", values: ["image/png", "image/jpeg", "image/webp", "image/gif"] }),
    sha256: nullable({ kind: "text", maxLength: 64, pattern: "^[a-f0-9]{64}$" }), bytes: nullable(time()),
    breite: nullable({ kind: "integer", minimum: 1, maximum: 4096 }), hoehe: nullable({ kind: "integer", minimum: 1, maximum: 4096 }),
    daten: nullable({ kind: "text", maxLength: Math.ceil(8 * 1024 * 1024 / 3) * 4 }), updated_by: id(), updated_at: time(),
  }, ["actor_id", "campaign_id"]),
] as const);
export const CAMPAIGN_V21_TABLES = Object.freeze([...CAMPAIGN_V20_TABLES, ...CAMPAIGN_V21_ADDITIONAL_TABLES] as const);
export const CAMPAIGN_V21_MODULES = Object.freeze([...CAMPAIGN_V20_MODULES, "tabletop"] as const);
export type CampaignTableNameV21 = typeof CAMPAIGN_V21_TABLES[number]["name"];
export type CampaignModuleV21 = typeof CAMPAIGN_V21_MODULES[number];
export type CampaignTablesV21 = CampaignTablesV20 & { readonly adventure_trees: readonly CampaignRow[]; readonly actor_portraits: readonly CampaignRow[] };
export function emptyCampaignTablesV21(): CampaignTablesV21 { return Object.fromEntries(CAMPAIGN_V21_TABLES.map(t => [t.name, []])) as unknown as CampaignTablesV21; }
