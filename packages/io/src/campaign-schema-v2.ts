// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
/** Native campaign v2: additive actor/inventory storage, migration 010.
 * Copyright (c) 2026 Atlas Chronicles contributors. SPDX-License-Identifier: MIT
 * This frozen contract deliberately does not import mutable HTTP schemas.
 */
import { CAMPAIGN_TABLES, CAMPAIGN_MODULES, CAMPAIGN_BUNDLE_JSON_SCHEMA, CAMPAIGN_BUNDLE_LIMITS, type CampaignColumn, type CampaignRow, type CampaignTables } from "./campaign-schema.ts";

export const CAMPAIGN_ACTOR_KINDS = Object.freeze(["player_character", "npc", "creature", "companion", "vehicle", "unspecified"] as const);
export const CAMPAIGN_ACTOR_OPERATIONS = Object.freeze([
  "actor.template.create", "actor.template.revise", "actor.template.archive", "actor.instantiate", "actor.update", "actor.archive",
  "actor.controller.grant", "actor.controller.revoke", "reader.perspective",
  "item.template.create", "item.template.revise", "item.template.archive", "item.instantiate", "item.update", "item.transfer", "item.archive",
] as const);
// Preserve every nonempty legacy text ID, including embedded line breaks.
const id = (): CampaignColumn => ({ kind: "text", maxLength: 128, pattern: "^[\\s\\S]+$" });
const version = (): CampaignColumn => ({ kind: "integer", minimum: 1, maximum: 2_147_483_647 });
const time = (): CampaignColumn => ({ kind: "bigint" });
const json = (): CampaignColumn => ({ kind: "json" });
const hash = (): CampaignColumn => ({ kind: "text", pattern: "^[a-f0-9]{64}$", maxLength: 64 });
const nullable = (field: CampaignColumn): CampaignColumn => ({ ...field, nullable: true });
function table<const N extends string>(name: N, module: "actors" | "inventory", fields: Readonly<Record<string, CampaignColumn>>, primaryKey: readonly string[]) {
  return Object.freeze({ name, module, fields: Object.freeze(fields), columns: Object.freeze(Object.keys(fields)), primaryKey: Object.freeze(primaryKey),
    bigintColumns: Object.freeze(Object.keys(fields).filter(key => fields[key]!.kind === "bigint")),
    jsonColumns: Object.freeze(Object.keys(fields).filter(key => fields[key]!.kind === "json")) });
}
const header = () => ({ id: id(), campaign_id: id(), head_revision: version(), version: version(), created_by: id(), created_at: time(), archived_at: nullable(time()) });
const revision = () => ({ template_id: id(), campaign_id: id(), revision: version(), definition: json(), content_hash: hash(), created_by: id(), created_at: time() });
export const CAMPAIGN_V2_ADDITIONAL_TABLES = Object.freeze([
  table("actor_templates", "actors", header(), ["id"]),
  table("actor_template_revisions", "actors", revision(), ["template_id", "revision"]),
  table("actor_profiles", "actors", { actor_id: id(), campaign_id: id(), kind: { kind: "text", values: CAMPAIGN_ACTOR_KINDS }, template_id: nullable(id()), template_revision: nullable(version()), lore_entry_id: nullable(id()), version: version(), archived_at: nullable(time()), created_by: nullable(id()), created_at: nullable(time()) }, ["actor_id"]),
  table("actor_controllers", "actors", { actor_id: id(), campaign_id: id(), user_id: id(), permission: { kind: "text", values: ["control"] }, version: version(), granted_by: nullable(id()), granted_at: nullable(time()), revoked_at: nullable(time()) }, ["actor_id", "user_id"]),
  table("reader_perspectives", "actors", { campaign_id: id(), user_id: id(), actor_id: nullable(id()), version: version(), updated_at: nullable(time()) }, ["campaign_id", "user_id"]),
  table("item_templates", "inventory", header(), ["id"]),
  table("item_template_revisions", "inventory", revision(), ["template_id", "revision"]),
  table("item_instances", "inventory", { id: id(), campaign_id: id(), template_id: id(), template_revision: version(), holder_actor_id: nullable(id()), state: json(), version: version(), created_by: id(), created_at: time(), archived_at: nullable(time()) }, ["id"]),
  table("actor_inventory_events", "inventory", { id: id(), campaign_id: id(), actor_user_id: id(), operation: { kind: "text", values: CAMPAIGN_ACTOR_OPERATIONS }, subject_id: id(), command_id: id(), request: json(), request_hash: hash(), before_state: nullable(json()), after_state: nullable(json()), result: json(), reason: nullable({ kind: "text", maxLength: 500, pattern: "\\S" }), created_at: time() }, ["id"]),
] as const);
export const CAMPAIGN_V2_TABLES = Object.freeze([...CAMPAIGN_TABLES, ...CAMPAIGN_V2_ADDITIONAL_TABLES] as const);
export const CAMPAIGN_V2_MODULES = Object.freeze([...CAMPAIGN_MODULES, "actors", "inventory"] as const);
export type CampaignModuleV2 = typeof CAMPAIGN_V2_MODULES[number];
export type CampaignAdditionalTableNameV2 = typeof CAMPAIGN_V2_ADDITIONAL_TABLES[number]["name"];
export type CampaignTableNameV2 = typeof CAMPAIGN_V2_TABLES[number]["name"];
export type CampaignTablesV2 = CampaignTables & { readonly [N in CampaignAdditionalTableNameV2]: readonly CampaignRow[] };
export function emptyCampaignTablesV2(): CampaignTablesV2 { return Object.fromEntries(CAMPAIGN_V2_TABLES.map(table => [table.name, []])) as unknown as CampaignTablesV2; }

const closed = (properties: Record<string, unknown>) => ({ type: "object", additionalProperties: false, required: Object.keys(properties), properties });
function column(field: CampaignColumn): Record<string, unknown> {
  const result: Record<string, unknown> = field.kind === "json" ? { $ref: "#/$defs/json" }
    : field.kind === "bigint" ? { type: "string", pattern: "^(0|[1-9][0-9]{0,18})$", maxLength: 19 }
    : { type: field.kind === "text" ? "string" : field.kind };
  for (const key of ["minimum", "maximum", "maxLength", "pattern"] as const) if (field[key] !== undefined) result[key] = field[key];
  if (field.values) result.enum = field.values;
  return field.nullable ? { anyOf: [result, { type: "null" }] } : result;
}
// Reuse the published v1 schema, without modifying its object or changing its URI.
const original = CAMPAIGN_BUNDLE_JSON_SCHEMA as unknown as { properties: { manifest: { properties: Record<string, unknown> }; tables: { properties: Record<string, unknown> } }; $defs: Record<string, unknown> };
export const CAMPAIGN_BUNDLE_V2_JSON_SCHEMA = {
  $schema: "https://json-schema.org/draft/2020-12/schema", $id: "urn:atlas-chronicles:campaign:2",
  title: "Atlas Chronicles native campaign v2",
  description: "MIT-licensed additive actor/inventory profile. The unchanged v1 core and all semantic references and hashes are checked by the reference parser.",
  ...closed({ format: { const: "atlas-chronicles/campaign" }, version: { const: 2 },
    manifest: closed({ ...original.properties.manifest.properties, coreContentHash: column(hash()),
      modules: { type: "array", minItems: 10, maxItems: 10, items: closed({ name: { enum: CAMPAIGN_V2_MODULES }, version: { const: 1 }, count: { type: "integer", minimum: 0 }, sha256: column(hash()) }) } }),
    tables: closed({ ...original.properties.tables.properties, ...Object.fromEntries(CAMPAIGN_V2_ADDITIONAL_TABLES.map(table => [table.name,
      { type: "array", maxItems: CAMPAIGN_BUNDLE_LIMITS.rowsPerTable, items: closed(Object.fromEntries(Object.entries(table.fields).map(([key, field]) => [key, column(field)]))) }])) }),
  }),
  $defs: original.$defs,
} as const;
