// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
/** Native campaign v3: additive tactical storage from migration 011.
 * Copyright (c) 2026 Atlas Chronicles contributors. SPDX-License-Identifier: MIT
 * This fixed archive contract does not import mutable HTTP schemas. */
import { CAMPAIGN_V2_TABLES, CAMPAIGN_V2_MODULES, CAMPAIGN_BUNDLE_V2_JSON_SCHEMA, type CampaignTablesV2 } from "./campaign-schema-v2.ts";
import { type CampaignColumn, type CampaignRow } from "./campaign-schema.ts";
import { CAMPAIGN_BUNDLE_V3_LIMITS as LIMITS } from "./campaign-v3-limits.ts";

const id = (): CampaignColumn => ({ kind: "text", maxLength: 128, pattern: "^[\\s\\S]+$" });
const geometryId = (): CampaignColumn => ({ kind: "text", maxLength: 256, pattern: "^[^\\u0000-\\u001f\\u007f]+$" });
const version = (): CampaignColumn => ({ kind: "integer", minimum: 1, maximum: 2_147_483_647 });
const time = (): CampaignColumn => ({ kind: "bigint" });
const json = (): CampaignColumn => ({ kind: "json" });
const hash = (): CampaignColumn => ({ kind: "text", pattern: "^[a-f0-9]{64}$", maxLength: 64 });
const choice = (...values: string[]): CampaignColumn => ({ kind: "text", values });
const nullable = (field: CampaignColumn): CampaignColumn => ({ ...field, nullable: true });
const pose = () => ({ x: { kind: "number", minimum: -1e9, maximum: 1e9 } as CampaignColumn, y: { kind: "number", minimum: -1e9, maximum: 1e9 } as CampaignColumn,
  elevation: { kind: "number", minimum: -1e9, maximum: 1e9 } as CampaignColumn, rotation: { kind: "number", minimum: -1e9, maximum: 1e9 } as CampaignColumn,
  scale: { kind: "number", minimum: 0, maximum: 1e6 } as CampaignColumn });
function table<const N extends string>(name: N, fields: Readonly<Record<string, CampaignColumn>>, primaryKey: readonly string[]) {
  return Object.freeze({ name, module: "tactical" as const, fields: Object.freeze(fields), columns: Object.freeze(Object.keys(fields)), primaryKey: Object.freeze(primaryKey),
    bigintColumns: Object.freeze(Object.keys(fields).filter(key => fields[key]!.kind === "bigint")), jsonColumns: Object.freeze(Object.keys(fields).filter(key => fields[key]!.kind === "json")) });
}
export const CAMPAIGN_V3_ADDITIONAL_TABLES = Object.freeze([
  table("tactical_sources", { id: id(), campaign_id: id(), format: choice("uvtt", "native"), format_version: choice("0.2", "0.3", "1"), source_text: { kind: "text", maxLength: LIMITS.sourceBytes }, source_hash: hash(), source_bytes: time(), image_base64: nullable({ kind: "text", maxLength: LIMITS.sourceBase64Length }), image_meta: nullable(json()), provenance: json(), fidelity: json(), created_by: id(), created_at: time() }, ["id"]),
  table("tactical_maps", { id: id(), campaign_id: id(), name: { kind: "text", maxLength: 160 }, head_revision: version(), version: version(), created_by: id(), created_at: time() }, ["id"]),
  table("tactical_map_revisions", { map_id: id(), campaign_id: id(), revision: version(), source_id: id(), document: json(), content_hash: hash(), created_by: id(), created_at: time() }, ["map_id", "revision"]),
  table("tactical_map_anchors", { map_id: id(), campaign_id: id(), map_revision: version(), target_kind: choice("stamp", "region", "place"), target_id: geometryId(), entry_id: id(), passage_id: nullable(id()) }, ["map_id", "map_revision", "target_kind", "target_id"]),
  table("scene_tactical_plans", { scene_id: id(), campaign_id: id(), map_id: id(), map_revision: version(), version: version(), updated_by: id(), updated_at: time() }, ["scene_id"]),
  table("scene_token_plans", { scene_id: id(), campaign_id: id(), token_id: id(), actor_id: id(), ...pose() }, ["scene_id", "token_id"]),
  table("session_tactical_states", { session_id: id(), campaign_id: id(), scene_id: id(), map_id: id(), map_revision: version(), initial_snapshot: json(), initial_hash: hash(), undo_base_snapshot: json(), undo_base_hash: hash(), base_seq: time(), last_transition_seq: time(), portal_states: json(), captured_by: id(), captured_at: time() }, ["session_id"]),
  table("tactical_token_states", { session_id: id(), campaign_id: id(), token_id: id(), actor_id: id(), ...pose(), version: version() }, ["session_id", "token_id"]),
  table("tactical_command_receipts", { command_id: id(), actor_user_id: id(), campaign_id: id(), scope_kind: choice("campaign", "map", "scene", "session"), scope_id: id(), subject_kind: choice("map", "plan", "token", "portal"), subject_id: geometryId(), operation: choice("map.import", "map.revise", "plan.save", "token.move", "portal.set", "undo"), request_hash: hash(), ack: json(), created_at: time() }, ["command_id"]),
  table("tactical_transitions", { session_id: id(), campaign_id: id(), seq: time(), command_id: id(), subject_kind: choice("token", "portal"), subject_id: geometryId(), before_state: json(), after_state: json(), compensates_command_id: nullable(id()), created_at: time() }, ["session_id", "seq"]),
] as const);
export const CAMPAIGN_V3_TABLES = Object.freeze([...CAMPAIGN_V2_TABLES, ...CAMPAIGN_V3_ADDITIONAL_TABLES] as const);
export const CAMPAIGN_V3_MODULES = Object.freeze([...CAMPAIGN_V2_MODULES, "tactical"] as const);
export type CampaignModuleV3 = typeof CAMPAIGN_V3_MODULES[number];
export type CampaignAdditionalTableNameV3 = typeof CAMPAIGN_V3_ADDITIONAL_TABLES[number]["name"];
export type CampaignTableNameV3 = typeof CAMPAIGN_V3_TABLES[number]["name"];
export type CampaignTablesV3 = CampaignTablesV2 & { readonly [N in CampaignAdditionalTableNameV3]: readonly CampaignRow[] };
export function emptyCampaignTablesV3(): CampaignTablesV3 { return Object.fromEntries(CAMPAIGN_V3_TABLES.map(table => [table.name, []])) as unknown as CampaignTablesV3; }

const closed = (properties: Record<string, unknown>) => ({ type: "object", additionalProperties: false, required: Object.keys(properties), properties });
function column(field: CampaignColumn): Record<string, unknown> {
  const value: Record<string, unknown> = field.kind === "json" ? { $ref: "#/$defs/json" } : field.kind === "bigint" ? { type: "string", pattern: "^(0|[1-9][0-9]{0,18})$", maxLength: 19 } : { type: field.kind === "text" ? "string" : field.kind };
  for (const key of ["minimum", "maximum", "maxLength", "pattern"] as const) if (field[key] !== undefined) value[key] = field[key];
  if (field.values) value.enum = field.values;
  return field.nullable ? { anyOf: [value, { type: "null" }] } : value;
}
const original = CAMPAIGN_BUNDLE_V2_JSON_SCHEMA as unknown as { properties: { manifest: { properties: Record<string, unknown> }; tables: { properties: Record<string, unknown> } }; $defs: Record<string, unknown> };
export const CAMPAIGN_BUNDLE_V3_JSON_SCHEMA = {
  $schema: "https://json-schema.org/draft/2020-12/schema", $id: "urn:atlas-chronicles:campaign:3", title: "Atlas Chronicles native campaign v3",
  description: "MIT-licensed tactical campaign profile. The unchanged v2 core, original sources and bounded undo suffix require reference-parser semantic validation.",
  ...closed({ format: { const: "atlas-chronicles/campaign" }, version: { const: 3 },
    manifest: closed({ ...original.properties.manifest.properties, coreFormatVersion: { const: 2 }, tacticalMapSchemaVersion: { const: 1 }, assetMode: { const: "source-artifacts-and-tactical-sources" },
      modules: { type: "array", minItems: 11, maxItems: 11, items: closed({ name: { enum: CAMPAIGN_V3_MODULES }, version: { const: 1 }, count: { type: "integer", minimum: 0 }, sha256: column(hash()) }) } }),
    tables: closed({ ...original.properties.tables.properties, ...Object.fromEntries(CAMPAIGN_V3_ADDITIONAL_TABLES.map(table => [table.name, { type: "array", maxItems: LIMITS.rowsPerTable,
      items: closed(Object.fromEntries(Object.entries(table.fields).map(([key, field]) => [key, column(field)]))) }])) }),
  }), $defs: original.$defs,
} as const;
