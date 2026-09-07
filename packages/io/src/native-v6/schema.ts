// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
/** Native v6 preserves immutable, map-scoped entrances from migrations 013/014. */
import { CAMPAIGN_V4_TABLES, CAMPAIGN_V4_MODULES, CAMPAIGN_BUNDLE_V4_LIMITS, type CampaignTablesV4 } from "../native-v4/schema.ts";
import { CAMPAIGN_BUNDLE_V5_JSON_SCHEMA } from "../native-v5/schema.ts";
import type { CampaignColumn, CampaignRow } from "../campaign-schema.ts";

export const CAMPAIGN_BUNDLE_V6_LIMITS = CAMPAIGN_BUNDLE_V4_LIMITS;
const id = (maxLength = 128): CampaignColumn => ({ kind: "text", maxLength, pattern: "^[^\\u0000-\\u001f\\u007f]+$" });
const digest = (): CampaignColumn => ({ kind: "text", maxLength: 64, pattern: "^[a-f0-9]{64}$" });
function table<const N extends string>(name: N, fields: Readonly<Record<string, CampaignColumn>>, primaryKey: readonly string[]) {
  return Object.freeze({ name, module: "nested-maps" as const, fields: Object.freeze(fields), columns: Object.freeze(Object.keys(fields)), primaryKey: Object.freeze(primaryKey),
    bigintColumns: Object.freeze(Object.keys(fields).filter(key => fields[key]!.kind === "bigint")), jsonColumns: Object.freeze(Object.keys(fields).filter(key => fields[key]!.kind === "json")) });
}
export const CAMPAIGN_V6_ADDITIONAL_TABLES = Object.freeze([
  table("tactical_map_nodes", { map_id: id(), knoten_id: id(256), campaign_id: id(), data: { kind: "json" } }, ["map_id", "knoten_id"]),
  table("betreten_karten", { campaign_id: id(), parent_kind: { kind: "text", values: ["atlas", "tactical"] }, parent_map_id: id(), knoten_id: id(256), map_id: id(), keim_hash: { ...digest(), nullable: true }, created_by: id(), created_at: { kind: "bigint" } }, ["campaign_id", "parent_kind", "parent_map_id", "knoten_id"]),
  table("betreten_command_receipts", { command_id: id(), campaign_id: id(), actor_user_id: id(), request_hash: digest(), response: { kind: "json" }, created_at: { kind: "bigint" } }, ["command_id"]),
] as const);
export const CAMPAIGN_V6_TABLES = Object.freeze([...CAMPAIGN_V4_TABLES, ...CAMPAIGN_V6_ADDITIONAL_TABLES] as const);
export const CAMPAIGN_V6_MODULES = Object.freeze([...CAMPAIGN_V4_MODULES, "nested-maps"] as const);
export type CampaignTableNameV6 = typeof CAMPAIGN_V6_TABLES[number]["name"];
export type CampaignModuleV6 = typeof CAMPAIGN_V6_MODULES[number];
export type CampaignTablesV6 = CampaignTablesV4 & { readonly [N in typeof CAMPAIGN_V6_ADDITIONAL_TABLES[number]["name"]]: readonly CampaignRow[] };
export function emptyCampaignTablesV6(): CampaignTablesV6 { return Object.fromEntries(CAMPAIGN_V6_TABLES.map(table => [table.name, []])) as unknown as CampaignTablesV6; }

const closed = (properties: Record<string, unknown>) => ({ type: "object", additionalProperties: false, required: Object.keys(properties), properties });
function column(field: CampaignColumn): Record<string, unknown> {
  const value: Record<string, unknown> = field.kind === "json" ? { $ref: "#/$defs/json" } : field.kind === "bigint" ? { type: "string", pattern: "^(0|[1-9][0-9]{0,18})$", maxLength: 19 } : { type: field.kind === "text" ? "string" : field.kind };
  for (const key of ["minimum", "maximum", "maxLength", "pattern"] as const) if (field[key] !== undefined) value[key] = field[key];
  if (field.values) value.enum = field.values;
  return field.nullable ? { anyOf: [value, { type: "null" }] } : value;
}
const previous = CAMPAIGN_BUNDLE_V5_JSON_SCHEMA;
const previousTables = (previous as unknown as { properties: { tables: { properties: Record<string, unknown> } } }).properties.tables.properties;
export const CAMPAIGN_BUNDLE_V6_JSON_SCHEMA = {
  ...previous, $id: "urn:atlas-chronicles:campaign:6", title: "Atlas Chronicles native campaign v6",
  description: "Supported rules with immutable nested map addresses, retained generator nodes and entrance receipts. The reference parser also validates campaign scope, parent targets, child uniqueness, cycles and receipt targets.",
  properties: { ...previous.properties, version: { const: 6 },
    manifest: closed({ ...previous.properties.manifest.properties, nestedMapSchemaVersion: { const: 1 },
      modules: { type: "array", minItems: CAMPAIGN_V6_MODULES.length, maxItems: CAMPAIGN_V6_MODULES.length, items: closed({ name: { enum: CAMPAIGN_V6_MODULES }, version: { const: 1 }, count: { type: "integer", minimum: 0 }, sha256: column(digest()) }) } }),
    tables: closed({ ...previousTables, ...Object.fromEntries(CAMPAIGN_V6_ADDITIONAL_TABLES.map(table => [table.name, { type: "array", maxItems: CAMPAIGN_BUNDLE_V6_LIMITS.rowsPerTable,
      items: closed(Object.fromEntries(Object.entries(table.fields).map(([key, field]) => [key, column(field)]))) }])) }),
  },
} as const;
