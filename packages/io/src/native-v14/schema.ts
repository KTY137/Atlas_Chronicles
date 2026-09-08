// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { CAMPAIGN_V13_TABLES, CAMPAIGN_V13_MODULES, CAMPAIGN_BUNDLE_V13_LIMITS, type CampaignTablesV13 } from "../native-v13/schema.ts";
import type { CampaignColumn, CampaignRow } from "../campaign-schema.ts";

export const CAMPAIGN_BUNDLE_V14_LIMITS = CAMPAIGN_BUNDLE_V13_LIMITS;
const id = (): CampaignColumn => ({ kind: "text", maxLength: 128, pattern: "^[^\\u0000-\\u001f\\u007f]+$" });
const fields = Object.freeze({ map_id: id(), campaign_id: id(), map_revision: { kind: "integer", minimum: 1, maximum: 2_147_483_647 } as CampaignColumn,
  map_version: { kind: "integer", minimum: 1, maximum: 2_147_483_647 } as CampaignColumn,
  document: { kind: "json" } as CampaignColumn, content_hash: { kind: "text", maxLength: 64, pattern: "^[a-f0-9]{64}$" } as CampaignColumn });
export const CAMPAIGN_V14_ADDITIONAL_TABLES = Object.freeze([
  Object.freeze({ name: "tactical_map_cartography" as const, module: "cartography" as const, fields,
    columns: Object.freeze(Object.keys(fields)), primaryKey: Object.freeze(["map_id", "map_revision"]),
    bigintColumns: Object.freeze([] as string[]), jsonColumns: Object.freeze(["document"]) }),
] as const);
export const CAMPAIGN_V14_TABLES = Object.freeze([...CAMPAIGN_V13_TABLES, ...CAMPAIGN_V14_ADDITIONAL_TABLES] as const);
export const CAMPAIGN_V14_MODULES = Object.freeze([...CAMPAIGN_V13_MODULES, "cartography"] as const);
export type CampaignTableNameV14 = typeof CAMPAIGN_V14_TABLES[number]["name"];
export type CampaignModuleV14 = typeof CAMPAIGN_V14_MODULES[number];
export type CampaignTablesV14 = CampaignTablesV13 & { readonly tactical_map_cartography: readonly CampaignRow[] };
export function emptyCampaignTablesV14(): CampaignTablesV14 { return Object.fromEntries(CAMPAIGN_V14_TABLES.map(table => [table.name, []])) as unknown as CampaignTablesV14; }
