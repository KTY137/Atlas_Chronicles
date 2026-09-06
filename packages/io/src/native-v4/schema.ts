/** Native V4 additive migration-012 contract. Published V1/V2/V3 stay unchanged.
 * Copyright (c) 2026 Atlas Chronicles contributors. SPDX-License-Identifier: MIT */
import { CAMPAIGN_V3_TABLES, CAMPAIGN_V3_MODULES, CAMPAIGN_BUNDLE_V3_JSON_SCHEMA, type CampaignTablesV3 } from "../campaign-schema-v3.ts";
import { CAMPAIGN_BUNDLE_V3_LIMITS } from "../campaign-v3-limits.ts";
import type { CampaignColumn, CampaignRow } from "../campaign-schema.ts";

export const CAMPAIGN_BUNDLE_V4_LIMITS = Object.freeze({ ...CAMPAIGN_BUNDLE_V3_LIMITS, authoringRequestBytes: 512 * 1024 });
export const AUTHORING_V4_OPERATIONS = Object.freeze(["theme.create", "theme.revise", "theme.pin", "publication.configure", "entry.publish", "entry.unpublish", "route.add", "route.remove"] as const);
const id = (): CampaignColumn => ({ kind: "text", maxLength: 128, pattern: "^[^\\u0000-\\u001f\\u007f]+$" });
const text = (maxLength: number): CampaignColumn => ({ kind: "text", maxLength });
const version = (): CampaignColumn => ({ kind: "integer", minimum: 1, maximum: 2_147_483_647 });
const time = (): CampaignColumn => ({ kind: "bigint" });
const json = (): CampaignColumn => ({ kind: "json" });
const hash = (): CampaignColumn => ({ kind: "text", maxLength: 64, pattern: "^[a-f0-9]{64}$" });
const nullable = (column: CampaignColumn): CampaignColumn => ({ ...column, nullable: true });
const choice = (...values: string[]): CampaignColumn => ({ kind: "text", values });
const slug = (): CampaignColumn => ({ kind: "text", maxLength: 200, pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$" });
function table<const N extends string>(name: N, fields: Readonly<Record<string, CampaignColumn>>, primaryKey: readonly string[]) {
  return Object.freeze({ name, module: "authoring" as const, fields: Object.freeze(fields), columns: Object.freeze(Object.keys(fields)), primaryKey: Object.freeze(primaryKey),
    bigintColumns: Object.freeze(Object.keys(fields).filter(key => fields[key]!.kind === "bigint")), jsonColumns: Object.freeze(Object.keys(fields).filter(key => fields[key]!.kind === "json")) });
}
export const CAMPAIGN_V4_ADDITIONAL_TABLES = Object.freeze([
  table("theme_presets", { id: id(), campaign_id: id(), head_revision: version(), version: version(), created_by: id(), created_at: time() }, ["id"]),
  table("theme_preset_revisions", { theme_id: id(), campaign_id: id(), revision: version(), manifest: json(), content_hash: hash(), accessibility_report: json(), created_by: id(), created_at: time() }, ["theme_id", "revision"]),
  table("campaign_theme_pins", { campaign_id: id(), theme_id: id(), theme_revision: version(), version: version(), updated_by: id(), updated_at: time() }, ["campaign_id"]),
  table("campaign_publications", { campaign_id: id(), public_key: { kind: "text", maxLength: 24, pattern: "^[A-Za-z0-9_-]{24}$" }, enabled: { kind: "boolean" }, world_slug: slug(), title: text(200), description: text(2000), locale: choice("de", "en"), content_warnings: json(), theme_id: nullable(id()), theme_revision: nullable(version()), version: version(), updated_by: id(), updated_at: time() }, ["campaign_id"]),
  table("entry_publications", { entry_id: id(), campaign_id: id(), revision_id: id(), passage_ids: json(), public_slug: slug(), public_metadata: json(), version: version(), published_by: id(), published_at: time() }, ["entry_id"]),
  table("publication_routes", { campaign_id: id(), kind: choice("world", "article", "legacy"), route: text(2048), entry_id: nullable(id()), source_url: nullable(text(2048)), created_by: id(), created_at: time() }, ["campaign_id", "kind", "route"]),
  table("authoring_events", { command_id: id(), campaign_id: id(), actor_user_id: id(), operation: choice(...AUTHORING_V4_OPERATIONS), subject_id: id(), request: json(), request_hash: hash(), before_state: nullable(json()), after_state: json(), ack: json(), created_at: time() }, ["command_id"]),
] as const);
export const CAMPAIGN_V4_TABLES = Object.freeze([...CAMPAIGN_V3_TABLES, ...CAMPAIGN_V4_ADDITIONAL_TABLES] as const);
export const CAMPAIGN_V4_MODULES = Object.freeze([...CAMPAIGN_V3_MODULES, "authoring"] as const);
export type CampaignModuleV4 = typeof CAMPAIGN_V4_MODULES[number];
export type CampaignAdditionalTableNameV4 = typeof CAMPAIGN_V4_ADDITIONAL_TABLES[number]["name"];
export type CampaignTableNameV4 = typeof CAMPAIGN_V4_TABLES[number]["name"];
export type CampaignTablesV4 = CampaignTablesV3 & { readonly [N in CampaignAdditionalTableNameV4]: readonly CampaignRow[] };
export function emptyCampaignTablesV4(): CampaignTablesV4 { return Object.fromEntries(CAMPAIGN_V4_TABLES.map(table => [table.name, []])) as unknown as CampaignTablesV4; }

const closed = (properties: Record<string, unknown>) => ({ type: "object", additionalProperties: false, required: Object.keys(properties), properties });
function column(field: CampaignColumn): Record<string, unknown> {
  const value: Record<string, unknown> = field.kind === "json" ? { $ref: "#/$defs/json" } : field.kind === "bigint" ? { type: "string", pattern: "^(0|[1-9][0-9]{0,18})$", maxLength: 19 } : { type: field.kind === "text" ? "string" : field.kind };
  for (const key of ["minimum", "maximum", "maxLength", "pattern"] as const) if (field[key] !== undefined) value[key] = field[key];
  if (field.values) value.enum = field.values;
  return field.nullable ? { anyOf: [value, { type: "null" }] } : value;
}
const original = CAMPAIGN_BUNDLE_V3_JSON_SCHEMA as unknown as { properties: { manifest: { properties: Record<string, unknown> }; tables: { properties: Record<string, unknown> } }; $defs: Record<string, unknown> };
export const CAMPAIGN_BUNDLE_V4_JSON_SCHEMA = {
  $schema: "https://json-schema.org/draft/2020-12/schema", $id: "urn:atlas-chronicles:campaign:4", title: "Atlas Chronicles native campaign v4",
  description: "Additive authoring profile. The unchanged V3 core, complete immutable authoring replay, source references and theme reports require reference-parser semantic validation.",
  ...closed({ format: { const: "atlas-chronicles/campaign" }, version: { const: 4 },
    manifest: closed({ ...original.properties.manifest.properties, coreFormatVersion: { const: 3 }, themeSchemaVersion: { const: 1 }, authoringSchemaVersion: { const: 1 },
      modules: { type: "array", minItems: CAMPAIGN_V4_MODULES.length, maxItems: CAMPAIGN_V4_MODULES.length, items: closed({ name: { enum: CAMPAIGN_V4_MODULES }, version: { const: 1 }, count: { type: "integer", minimum: 0 }, sha256: column(hash()) }) } }),
    tables: closed({ ...original.properties.tables.properties, ...Object.fromEntries(CAMPAIGN_V4_ADDITIONAL_TABLES.map(table => [table.name, { type: "array", maxItems: CAMPAIGN_BUNDLE_V4_LIMITS.rowsPerTable,
      items: closed(Object.fromEntries(Object.entries(table.fields).map(([key, field]) => [key, column(field)]))) }])) }),
  }), $defs: original.$defs,
} as const;
