/**
 * Native v9 nimmt das Gefüge in das Kampagnenpaket auf (Migration 019).
 *
 * Warum eine eigene Generation: die Abdeckungsprüfung in `domain/bundles.ts` verlangt, dass
 * jede dauerhafte Spalte des Anwendungsschemas in einem Profil vorkommt. Eine neue Tabelle
 * ohne Profil bringt jeden Export zum Stehen — genau so hat der Wächter die Bilder in v7 und
 * den Zugangsvorfall in v8 gefunden.
 *
 * Warum `graph` und `gerichtet` NICHT im Profil stehen: beide werden aus `art` abgeleitet.
 * Eine gespeicherte Ableitung ist eine zweite Wahrheit, die im Archiv Jahre später von der
 * ersten abweichen kann — und ein Paket ist genau der Ort, an dem so eine Abweichung
 * unbemerkt überdauert.
 */
import { CAMPAIGN_V8_TABLES, CAMPAIGN_V8_MODULES, CAMPAIGN_BUNDLE_V8_LIMITS, CAMPAIGN_BUNDLE_V8_JSON_SCHEMA, type CampaignTablesV8 } from "../native-v8/schema.ts";
import type { CampaignColumn, CampaignRow } from "../campaign-schema.ts";

export const CAMPAIGN_BUNDLE_V9_LIMITS = CAMPAIGN_BUNDLE_V8_LIMITS;

const id = (maxLength = 128): CampaignColumn => ({ kind: "text", maxLength, pattern: "^[^\u0000-\u001f\u007f]+$" });
const nullable = (column: CampaignColumn): CampaignColumn => ({ ...column, nullable: true });

export const BEZIEHUNGSARTEN = Object.freeze(["elternteil_von", "verheiratet_mit", "geschwister_von", "buendnis_mit", "feindschaft_mit", "lehen_von", "mitglied_von"] as const);

function table<const N extends string>(name: N, fields: Readonly<Record<string, CampaignColumn>>, primaryKey: readonly string[]) {
  return Object.freeze({ name, module: "gefuege" as const, fields: Object.freeze(fields), columns: Object.freeze(Object.keys(fields)), primaryKey: Object.freeze(primaryKey),
    bigintColumns: Object.freeze(Object.keys(fields).filter(key => fields[key]!.kind === "bigint")), jsonColumns: Object.freeze(Object.keys(fields).filter(key => fields[key]!.kind === "json")) });
}

export const CAMPAIGN_V9_ADDITIONAL_TABLES = Object.freeze([
  table("beziehungen", {
    id: id(), campaign_id: id(), passage_id: id(), von_entry_id: id(), nach_entry_id: id(),
    art: { kind: "text", maxLength: 32, values: BEZIEHUNGSARTEN },
    rolle: nullable({ kind: "text", maxLength: 160 }),
    created_at: { kind: "bigint" }, created_by: id(),
    withdrawn_at: nullable({ kind: "bigint" }), withdrawn_by: nullable(id()),
  }, ["id"]),
] as const);

export const CAMPAIGN_V9_TABLES = Object.freeze([...CAMPAIGN_V8_TABLES, ...CAMPAIGN_V9_ADDITIONAL_TABLES] as const);
export const CAMPAIGN_V9_MODULES = Object.freeze([...CAMPAIGN_V8_MODULES, "gefuege"] as const);
export type CampaignTableNameV9 = typeof CAMPAIGN_V9_TABLES[number]["name"];
export type CampaignModuleV9 = typeof CAMPAIGN_V9_MODULES[number];
export type CampaignTablesV9 = CampaignTablesV8 & { readonly [N in typeof CAMPAIGN_V9_ADDITIONAL_TABLES[number]["name"]]: readonly CampaignRow[] };
export function emptyCampaignTablesV9(): CampaignTablesV9 { return Object.fromEntries(CAMPAIGN_V9_TABLES.map(table => [table.name, []])) as unknown as CampaignTablesV9; }

const closed = (properties: Record<string, unknown>) => ({ type: "object", additionalProperties: false, required: Object.keys(properties), properties });
function column(field: CampaignColumn): Record<string, unknown> {
  const value: Record<string, unknown> = field.kind === "json" ? { $ref: "#/$defs/json" } : field.kind === "bigint" ? { type: "string", pattern: "^(0|[1-9][0-9]{0,18})$", maxLength: 19 } : { type: field.kind === "text" ? "string" : field.kind };
  for (const key of ["minimum", "maximum", "maxLength", "pattern"] as const) if (field[key] !== undefined) value[key] = field[key];
  if (field.values) value.enum = field.values;
  return field.nullable ? { anyOf: [value, { type: "null" }] } : value;
}
const previous = CAMPAIGN_BUNDLE_V8_JSON_SCHEMA;
const previousTables = (previous as unknown as { properties: { tables: { properties: Record<string, unknown> } } }).properties.tables.properties;
const previousManifest = (previous as unknown as { properties: { manifest: { properties: Record<string, unknown> } } }).properties.manifest.properties;
export const CAMPAIGN_BUNDLE_V9_JSON_SCHEMA = {
  ...previous, $id: "urn:atlas-chronicles:campaign:9", title: "Atlas Chronicles native campaign v9",
  description: "Relationship edges for kinship and politics. Every edge is anchored on a passage this bundle contains, and its graph and direction are derived from its art, never stored.",
  properties: { ...previous.properties, version: { const: 9 },
    manifest: closed({ ...previousManifest, gefuegeSchemaVersion: { const: 1 },
      modules: { type: "array", minItems: CAMPAIGN_V9_MODULES.length, maxItems: CAMPAIGN_V9_MODULES.length, items: closed({ name: { enum: CAMPAIGN_V9_MODULES }, version: { const: 1 }, count: { type: "integer", minimum: 0 }, sha256: column({ kind: "text", maxLength: 64, pattern: "^[a-f0-9]{64}$" }) }) } }),
    tables: closed({ ...previousTables, ...Object.fromEntries(CAMPAIGN_V9_ADDITIONAL_TABLES.map(table => [table.name, { type: "array", maxItems: CAMPAIGN_BUNDLE_V9_LIMITS.rowsPerTable,
      items: closed(Object.fromEntries(Object.entries(table.fields).map(([key, field]) => [key, column(field)]))) }])) }),
  }, $defs: (previous as unknown as { $defs: unknown }).$defs,
} as const;
