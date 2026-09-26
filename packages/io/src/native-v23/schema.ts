// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
/**
 * Native v23 nimmt das Geschoss einer laufenden Szene auf (Migration 038). Modul `play`, kein
 * neues: wo die Runde gerade spielt, ist Spielstand wie die Szene selbst (native-v3).
 */
import { CAMPAIGN_V22_TABLES, CAMPAIGN_V22_MODULES, CAMPAIGN_BUNDLE_V22_LIMITS, type CampaignTablesV22 } from "../native-v22/schema.ts";
import type { CampaignColumn, CampaignRow } from "../campaign-schema.ts";

export const CAMPAIGN_BUNDLE_V23_LIMITS = CAMPAIGN_BUNDLE_V22_LIMITS;
const id = (): CampaignColumn => ({ kind: "text", maxLength: 128, pattern: "^[^\\u0000-\\u001f\\u007f]+$" });
function table<const N extends string>(name: N, fields: Readonly<Record<string, CampaignColumn>>, primaryKey: readonly string[]) {
  return Object.freeze({ name, module: "play" as const, fields: Object.freeze(fields), columns: Object.freeze(Object.keys(fields)), primaryKey: Object.freeze(primaryKey),
    bigintColumns: Object.freeze(Object.keys(fields).filter(k => fields[k]!.kind === "bigint")), jsonColumns: Object.freeze(Object.keys(fields).filter(k => fields[k]!.kind === "json")) });
}
export const CAMPAIGN_V23_ADDITIONAL_TABLES = Object.freeze([
  table("session_floor_states", {
    session_id: id(), campaign_id: id(), map_id: id(),
    map_revision: { kind: "integer", minimum: 1, maximum: 2147483647 },
    portal_states: { kind: "json" }, parked: { kind: "json" },
    version: { kind: "integer", minimum: 1, maximum: 2147483647 },
    command_id: id(), request_hash: { kind: "text", pattern: "^[a-f0-9]{64}$", maxLength: 64 }, ack: { kind: "json" },
    updated_by: id(), updated_at: { kind: "bigint" },
  }, ["session_id"]),
] as const);
export const CAMPAIGN_V23_TABLES = Object.freeze([...CAMPAIGN_V22_TABLES, ...CAMPAIGN_V23_ADDITIONAL_TABLES] as const);
export const CAMPAIGN_V23_MODULES = CAMPAIGN_V22_MODULES;
export type CampaignTableNameV23 = typeof CAMPAIGN_V23_TABLES[number]["name"];
export type CampaignModuleV23 = typeof CAMPAIGN_V23_MODULES[number];
export type CampaignTablesV23 = CampaignTablesV22 & { readonly session_floor_states: readonly CampaignRow[] };
export function emptyCampaignTablesV23(): CampaignTablesV23 { return Object.fromEntries(CAMPAIGN_V23_TABLES.map(t => [t.name, []])) as unknown as CampaignTablesV23; }
