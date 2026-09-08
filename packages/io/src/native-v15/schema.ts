// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { CAMPAIGN_V14_TABLES, CAMPAIGN_V14_MODULES, CAMPAIGN_BUNDLE_V14_LIMITS, type CampaignTablesV14 } from "../native-v14/schema.ts";
import type { CampaignColumn, CampaignRow } from "../campaign-schema.ts";
export const CAMPAIGN_BUNDLE_V15_LIMITS = CAMPAIGN_BUNDLE_V14_LIMITS;
const id = (): CampaignColumn => ({ kind: "text", maxLength: 128, pattern: "^[^\\u0000-\\u001f\\u007f]+$" });
const fields: Readonly<Record<string, CampaignColumn>> = Object.freeze({
  seq: { kind: "bigint" }, command_id: id(), campaign_id: id(), actor_user_id: id(),
  operation: { kind: "text", values: ["map.delete", "map.enter", "map.revise"] },
  request_hash: { kind: "text", maxLength: 64, pattern: "^[a-f0-9]{64}$" },
  request: { kind: "json" }, payload: { kind: "json" }, ack: { kind: "json" }, created_at: { kind: "bigint" },
});
export const CAMPAIGN_V15_ADDITIONAL_TABLES = Object.freeze([
  Object.freeze({ name: "map_lifecycle_events" as const, module: "map-lifecycle" as const, fields,
    columns: Object.freeze(Object.keys(fields)), primaryKey: Object.freeze(["seq"]),
    bigintColumns: Object.freeze(["seq", "created_at"]), jsonColumns: Object.freeze(["request", "payload", "ack"]) }),
] as const);
export const CAMPAIGN_V15_TABLES = Object.freeze([...CAMPAIGN_V14_TABLES, ...CAMPAIGN_V15_ADDITIONAL_TABLES] as const);
export const CAMPAIGN_V15_MODULES = Object.freeze([...CAMPAIGN_V14_MODULES, "map-lifecycle"] as const);
export type CampaignTableNameV15 = typeof CAMPAIGN_V15_TABLES[number]["name"];
export type CampaignModuleV15 = typeof CAMPAIGN_V15_MODULES[number];
export type CampaignTablesV15 = CampaignTablesV14 & { readonly map_lifecycle_events: readonly CampaignRow[] };
export function emptyCampaignTablesV15(): CampaignTablesV15 { return Object.fromEntries(CAMPAIGN_V15_TABLES.map(table => [table.name, []])) as unknown as CampaignTablesV15; }
