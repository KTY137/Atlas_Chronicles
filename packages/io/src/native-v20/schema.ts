// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { CAMPAIGN_V19_TABLES, CAMPAIGN_V19_MODULES, CAMPAIGN_BUNDLE_V19_LIMITS, type CampaignTablesV19 } from "../native-v19/schema.ts";
import type { CampaignColumn, CampaignRow } from "../campaign-schema.ts";
export const CAMPAIGN_BUNDLE_V20_LIMITS = CAMPAIGN_BUNDLE_V19_LIMITS;
const id = (): CampaignColumn => ({ kind: "text", maxLength: 128, pattern: "^[^\u0000-\u001f\u007f]+$" });
const version = (): CampaignColumn => ({ kind: "integer", minimum: 1, maximum: 2147483647 });
const time = (): CampaignColumn => ({ kind: "bigint" });
const json = (): CampaignColumn => ({ kind: "json" });
function table<const N extends string>(name: N, fields: Readonly<Record<string, CampaignColumn>>, primaryKey: readonly string[]) {
  return Object.freeze({ name, module: "map-studio" as const, fields: Object.freeze(fields), columns: Object.freeze(Object.keys(fields)), primaryKey: Object.freeze(primaryKey),
    bigintColumns: Object.freeze(Object.keys(fields).filter(k => fields[k]!.kind === "bigint")), jsonColumns: Object.freeze(Object.keys(fields).filter(k => fields[k]!.kind === "json")) });
}
export const CAMPAIGN_V20_ADDITIONAL_TABLES = Object.freeze([
  table("map_floor_stacks", { root_map_id: id(), campaign_id: id(), version: version(), document: json(), created_by: id(), created_at: time(), updated_by: id(), updated_at: time() }, ["root_map_id"]),
  table("map_room_fog", { map_id: id(), campaign_id: id(), map_revision: version(), version: version(), document: json(), updated_by: id(), updated_at: time() }, ["map_id", "map_revision"]),
  table("map_studio_commands", { command_id: id(), campaign_id: id(), actor_user_id: id(), scope_id: id(),
    operation: { kind: "text", values: ["floor.add", "floor.link", "floor.unlink", "floor.rename", "floor.detach", "fog.set"] },
    request_hash: { kind: "text", maxLength: 64, pattern: "^[a-f0-9]{64}$" }, request: json(), ack: json(), created_at: time() }, ["command_id"]),
] as const);
export const CAMPAIGN_V20_TABLES = Object.freeze([...CAMPAIGN_V19_TABLES, ...CAMPAIGN_V20_ADDITIONAL_TABLES] as const);
export const CAMPAIGN_V20_MODULES = Object.freeze([...CAMPAIGN_V19_MODULES, "map-studio"] as const);
export type CampaignTableNameV20 = typeof CAMPAIGN_V20_TABLES[number]["name"];
export type CampaignModuleV20 = typeof CAMPAIGN_V20_MODULES[number];
export type CampaignTablesV20 = CampaignTablesV19 & { readonly map_floor_stacks: readonly CampaignRow[]; readonly map_room_fog: readonly CampaignRow[]; readonly map_studio_commands: readonly CampaignRow[] };
export function emptyCampaignTablesV20(): CampaignTablesV20 { return Object.fromEntries(CAMPAIGN_V20_TABLES.map(t => [t.name, []])) as unknown as CampaignTablesV20; }
