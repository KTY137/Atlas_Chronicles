/**
 * Native campaign storage profile v1. This file contains no database implementation.
 * Names are a fixed serialization contract, never identifiers supplied by a bundle.
 * Copyright (c) 2026 Atlas Chronicles contributors. SPDX-License-Identifier: MIT
 */
export type CampaignModule = "identities" | "wiki" | "atlas" | "rules" | "play" | "week" | "communication" | "evidence";
export interface CampaignColumn {
  readonly kind: "text" | "integer" | "number" | "boolean" | "bigint" | "json";
  readonly nullable?: boolean;
  readonly minimum?: number;
  readonly maximum?: number;
  readonly maxLength?: number;
  readonly values?: readonly string[];
  readonly pattern?: string;
}
const id = (): CampaignColumn => ({ kind: "text", maxLength: 128 });
const text = (maxLength = 1_000_000): CampaignColumn => ({ kind: "text", maxLength });
const choice = (...values: string[]): CampaignColumn => ({ kind: "text", values });
const integer = (minimum = 0, maximum = 2_147_483_647): CampaignColumn => ({ kind: "integer", minimum, maximum });
const number = (minimum = -1e12, maximum = 1e12): CampaignColumn => ({ kind: "number", minimum, maximum });
const bigint = (): CampaignColumn => ({ kind: "bigint" });
const json = (): CampaignColumn => ({ kind: "json" });
const bool = (): CampaignColumn => ({ kind: "boolean" });
const hash = (): CampaignColumn => ({ kind: "text", pattern: "^[a-f0-9]{64}$", maxLength: 64 });
const nullable = (column: CampaignColumn): CampaignColumn => ({ ...column, nullable: true });

function table<const N extends string>(name: N, module: CampaignModule, fields: Readonly<Record<string, CampaignColumn>>, primaryKey: readonly string[]) {
  return Object.freeze({ name, module, fields: Object.freeze(fields), columns: Object.freeze(Object.keys(fields)), primaryKey: Object.freeze(primaryKey),
    bigintColumns: Object.freeze(Object.keys(fields).filter(k => fields[k]!.kind === "bigint")),
    jsonColumns: Object.freeze(Object.keys(fields).filter(k => fields[k]!.kind === "json")) });
}

/** Exhaustive durable row/column allowlist for the v1 profile (migrations 001 through 008). */
export const CAMPAIGN_TABLES = Object.freeze([
  table("users", "identities", { id: id(), display_name: text(512), created_at: bigint() }, ["id"]),
  table("universes", "identities", { id: id(), owner_user_id: id(), name: text(512) }, ["id"]),
  table("campaigns", "identities", { id: id(), universe_id: id(), owner_user_id: id(), name: text(512), version: integer(1), created_at: bigint() }, ["id"]),
  table("actors", "identities", { id: id(), campaign_id: id(), user_id: id(), name: text(512) }, ["id"]),
  table("campaign_memberships", "identities", { campaign_id: id(), user_id: id(), role: choice("leitung", "spieler", "beobachter"), display_name: text(512), name_skeleton: text(1024), actor_id: nullable(id()) }, ["campaign_id", "user_id"]),
  table("universe_memberships", "identities", { universe_id: id(), user_id: id(), role: choice("besitzer", "verwalter", "autor", "leser") }, ["universe_id", "user_id"]),
  table("entries", "wiki", { id: id(), universe_id: id(), campaign_id: id(), slug: text(512), title: text(512), art: choice("charakter", "organisation", "spezies", "gegenstand", "ereignis", "ort", "regelseite", "sonstiges"), version: integer(1), current_revision_id: id(), created_by: id(), kanonstatus: choice("kanon", "geruecht", "apokryph", "abgeloest"), public: bool(), parent_entry_id: nullable(id()) }, ["id"]),
  table("revisions", "wiki", { id: id(), entry_id: id(), seq: integer(1), author_user_id: id(), content_hash: hash(), document: json(), created_at: bigint() }, ["id"]),
  table("passages", "wiki", { id: id(), entry_id: id(), campaign_id: id(), revision_id: id(), ord: integer(), path: json(), content: json(), ast_version: integer(1, 1), retired_at_revision: nullable(id()), gen: integer(1), geltung: choice("notiz", "antrag", "kanon"), praegung: nullable(json()), tags: json(), provenance: nullable(json()) }, ["id"]),
  table("revelations", "wiki", { campaign_id: id(), actor_id: id(), passage_id: id(), granted_at: bigint(), granted_by: id(), vollmacht_id: nullable(id()), quelle: json(), revoked_at: nullable(bigint()) }, ["actor_id", "passage_id"]),
  table("lineage_events", "wiki", { seq: bigint(), entry_id: id(), revision_id: id(), event: json(), created_at: bigint() }, ["seq"]),
  table("entry_aliases", "wiki", { campaign_id: id(), slug: text(512), entry_id: id() }, ["campaign_id", "slug"]),
  table("artifacts", "wiki", { id: id(), campaign_id: id(), kind: choice("eron-preview", "azgaar", "eron-map"), source_hash: hash(), source: json(), report: json(), created_by: id(), created_at: bigint() }, ["id"]),
  table("import_acceptances", "wiki", { artifact_id: id(), entry_id: id(), revision_id: id(), accepted_by: id(), accepted_at: bigint() }, ["artifact_id", "entry_id"]),
  table("atlas_maps", "atlas", { id: id(), campaign_id: id(), artifact_id: id(), title: text(512), width: number(Number.MIN_VALUE), height: number(Number.MIN_VALUE), version: integer(1), created_at: bigint() }, ["id"]),
  table("atlas_nodes", "atlas", { map_id: id(), id: id(), campaign_id: id(), data: json(), entry_id: nullable(id()) }, ["map_id", "id"]),
  table("atlas_revelations", "atlas", { map_id: id(), node_id: id(), campaign_id: id(), actor_id: id(), knowledge: choice("benannt", "erschlossen"), granted_by: id(), granted_at: bigint() }, ["map_id", "node_id", "actor_id"]),
  table("rule_packages", "rules", { campaign_id: id(), package_id: id(), version: text(128), document: json(), content_hash: hash(), installed_by: id(), installed_at: bigint() }, ["campaign_id", "package_id", "version"]),
  table("campaign_rule_pins", "rules", { campaign_id: id(), package_id: id(), package_version: text(128), version: integer(1) }, ["campaign_id"]),
  table("actor_sheets", "rules", { actor_id: id(), campaign_id: id(), package_id: id(), package_version: text(128), fields: json(), version: integer(1), defeat_pending: bool(), defeated_at: nullable(bigint()), updated_at: bigint() }, ["actor_id", "campaign_id"]),
  table("scenes", "play", { id: id(), campaign_id: id(), name: text(512), entry_ids: json(), fiction_date: text(120), status: choice("prepared", "active", "ended"), created_by: id(), created_at: bigint(), version: integer(1) }, ["id"]),
  table("game_sessions", "play", { id: id(), campaign_id: id(), scene_id: id(), started_at: bigint(), ended_at: nullable(bigint()), started_by: id() }, ["id"]),
  table("vollmachten", "play", { id: id(), campaign_id: id(), actor_id: id(), passage_id: id(), issued_by: id(), target_slug: text(512), threshold: integer(1, 20), expires_at: bigint(), issued_at: bigint(), repeatable: bool(), budget_kind: choice("player", "floating"), status: choice("offen", "eingeloest", "verfallen", "widerrufen"), consumed_roll_id: nullable(id()), version: integer(1), package_pin: text(256) }, ["id"]),
  table("rolls", "play", { id: id(), campaign_id: id(), vollmacht_id: id(), seed: text(1024), expression: choice("1d20"), result: integer(1, 20), threshold: integer(1, 20), package_pin: text(256), status: choice("ausstehend", "bestaetigt", "verworfen"), rolled_at: bigint(), confirmed_at: nullable(bigint()), confirmation: nullable(json()) }, ["id"]),
  table("action_vollmachten", "play", { id: id(), campaign_id: id(), actor_id: id(), passage_id: id(), passage_hash: hash(), package_id: id(), package_version: text(128), action_id: id(), threshold: number(), fixed_input: json(), fiction_date: text(120), issued_by: id(), issued_at: bigint(), expires_at: bigint(), repeatable: bool(), budget_kind: choice("player", "floating"), status: choice("offen", "eingeloest", "verfallen", "widerrufen"), consumed_roll_id: nullable(id()), revoked_at: nullable(bigint()), version: integer(1), command_id: id(), request_hash: hash() }, ["id"]),
  table("action_rolls", "play", { id: id(), campaign_id: id(), actor_id: id(), prepared_by: id(), command_id: id(), request_hash: hash(), package_id: id(), package_version: text(128), action_id: id(), receipt: json(), receipt_hash: hash(), target_passage_id: nullable(id()), target_passage_hash: nullable(hash()), vollmacht_id: nullable(id()), fiction_date: text(120), prepared_at: bigint(), confirmed_at: nullable(bigint()), status: choice("ausstehend", "bestaetigt", "verworfen"), confirmation: nullable(json()), scene_id: nullable(id()), session_id: nullable(id()) }, ["id"]),
  table("confirmed_mints", "play", { id: id(), campaign_id: id(), kind: choice("wurf", "gesprochen", "ratifikation", "berichtigung", "vollmacht"), passage_id: id(), revision_id: id(), roll_id: nullable(id()), user_id: id(), command_id: id(), provenance: json(), seal: hash(), confirmed_at: bigint() }, ["id"]),
  table("week_clocks", "week", { campaign_id: id(), day: integer(0, 1_000_000), label: text(120), post_days: integer(0, 365), version: integer(1), updated_at: bigint(), updated_by: id() }, ["campaign_id"]),
  table("letters", "week", { id: id(), campaign_id: id(), from_actor_id: id(), sent_by: id(), command_id: id(), request_hash: hash(), note: text(4000), snapshots: json(), seal: hash(), sent_at: bigint(), sent_day: integer(), sent_label: text(120), arrival_day: integer() }, ["id"]),
  table("letter_recipients", "week", { letter_id: id(), campaign_id: id(), actor_id: id(), delivered_at: nullable(bigint()), delivered_day: nullable(integer()), delivered_label: nullable(text(120)), read_at: nullable(bigint()), read_day: nullable(integer()) }, ["letter_id", "actor_id"]),
  table("letter_delivery_receipts", "week", { letter_id: id(), campaign_id: id(), actor_id: id(), proof: json(), seal: hash(), delivered_at: bigint() }, ["letter_id", "actor_id"]),
  table("reading_watermarks", "week", { campaign_id: id(), reader_user_id: id(), actor_id: nullable(id()), entry_id: id(), projected_hashes: json(), read_at: bigint() }, ["campaign_id", "reader_user_id", "entry_id"]),
  table("week_baselines", "week", { session_id: id(), campaign_id: id(), captured_at: bigint(), knowledge: json(), lineage_seq: bigint() }, ["session_id"]),
  table("campaign_messages", "communication", { id: id(), campaign_id: id(), user_id: id(), author_name: text(512), body: text(8000), parent_id: nullable(id()), kind: choice("letter"), session_id: nullable(id()), created_at: bigint(), expires_at: nullable(bigint()), removed_at: nullable(bigint()) }, ["id"]),
  table("audit", "evidence", { id: bigint(), campaign_id: id(), actor_user_id: nullable(id()), kind: choice("rules.migration", "action.prepared", "action.confirmed", "vollmacht.confirmed", "vollmacht.issued", "vollmacht.revoked", "vollmacht.expired", "praegung.wurf", "praegung.gesprochen", "praegung.ratifikation", "praegung.berichtigung", "praegung.vollmacht"), data: json(), created_at: bigint() }, ["id"]),
  table("access_incidents", "evidence", { id: bigint(), campaign_id: id(), user_id: nullable(id()), vollmacht_id: id(), created_at: bigint() }, ["id"]),
] as const);

export type CampaignTableName = typeof CAMPAIGN_TABLES[number]["name"];
export type CampaignRow = Readonly<Record<string, import("@chronicle/core").CanonicalValue>>;
export type CampaignTables = { readonly [N in CampaignTableName]: readonly CampaignRow[] };
export const CAMPAIGN_MODULES = Object.freeze(["identities", "wiki", "atlas", "rules", "play", "week", "communication", "evidence"] as const);
export const CAMPAIGN_EXCLUSIONS = Object.freeze(["authentication", "delivery-cache", "table-chat", "media-runtime"] as const);
export const CAMPAIGN_EXCLUDED_TABLES = Object.freeze(["credentials", "auth_challenges", "invitations", "join_requests", "pairing_codes", "commands", "events", "event_cursors", "media_rooms", "media_whisper_members", "media_presence", "media_blocks", "media_cleanup", "schema_migrations"] as const);
export const CAMPAIGN_BUNDLE_LIMITS = Object.freeze({ bytes: 128 * 1024 * 1024, rows: 1_000_000, rowsPerTable: 200_000, depth: 64, nodes: 5_000_000, stringLength: 64 * 1024 * 1024 });

/** A fresh complete empty table collection, useful to database adapters and fixtures. */
export function emptyCampaignTables(): CampaignTables { return Object.fromEntries(CAMPAIGN_TABLES.map(t => [t.name, []])) as unknown as CampaignTables; }

function columnSchema(column: CampaignColumn): Record<string, unknown> {
  const schema: Record<string, unknown> = column.kind === "json" ? { $ref: "#/$defs/json" }
    : column.kind === "bigint" ? { type: "string", pattern: "^(0|[1-9][0-9]{0,18})$", maxLength: 19 }
    : { type: column.kind === "text" ? "string" : column.kind };
  if (column.minimum !== undefined) schema.minimum = column.minimum;
  if (column.maximum !== undefined) schema.maximum = column.maximum;
  if (column.maxLength !== undefined) schema.maxLength = column.maxLength;
  if (column.pattern) schema.pattern = column.pattern;
  if (column.values) schema.enum = column.values;
  return column.nullable ? { anyOf: [schema, { type: "null" }] } : schema;
}
const closed = (properties: Record<string, unknown>): Record<string, unknown> => ({ type: "object", additionalProperties: false, required: Object.keys(properties), properties });
/** Structural JSON Schema. The reference parser additionally checks scope, graphs and hashes. */
export const CAMPAIGN_BUNDLE_JSON_SCHEMA = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "urn:atlas-chronicles:campaign:1",
  title: "Atlas Chronicles native campaign v1",
  description: "MIT-licensed closed campaign storage profile. Semantic constraints are checked by the reference parser; credentials and runtime state are excluded.",
  ...closed({ format: { const: "atlas-chronicles/campaign" }, version: { const: 1 },
    manifest: closed({ profile: { const: "complete-campaign" }, projection: { const: "gm" }, campaignId: columnSchema(id()), universeId: columnSchema(id()), exportedAt: { type: "string", format: "date-time" }, blockAstVersion: { const: 1 }, rulePackageSchemaVersion: { const: 1 }, contentHash: columnSchema(hash()),
      modules: { type: "array", minItems: 8, maxItems: 8, items: closed({ name: { enum: CAMPAIGN_MODULES }, version: { const: 1 }, count: { type: "integer", minimum: 0 }, sha256: columnSchema(hash()) }) },
      excluded: { const: CAMPAIGN_EXCLUSIONS }, assetMode: { const: "source-artifacts-only" } }),
    tables: closed(Object.fromEntries(CAMPAIGN_TABLES.map(t => [t.name, { type: "array", maxItems: CAMPAIGN_BUNDLE_LIMITS.rowsPerTable, items: closed(Object.fromEntries(Object.entries(t.fields).map(([k, v]) => [k, columnSchema(v)]))) }]))),
  }),
  $defs: { json: { anyOf: [{ type: ["string", "number", "boolean", "null"] }, { type: "array", items: { $ref: "#/$defs/json" } }, { type: "object", propertyNames: { not: { enum: ["__proto__", "prototype", "constructor"] } }, additionalProperties: { $ref: "#/$defs/json" } }] } },
} as const;
