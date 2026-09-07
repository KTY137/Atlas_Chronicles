/**
 * Native v8 nimmt den Zugangsvorfall in das Kampagnenpaket auf (Migration 018).
 *
 * Warum eine eigene Generation: Die Abdeckungsprüfung in `domain/bundles.ts` verlangt, dass
 * jede dauerhafte Spalte des Anwendungsschemas in einem Profil vorkommt. Eine neue Tabelle
 * ohne Profil bringt jeden Export zum Stehen — genau so hat der Wächter schon die Bilder in
 * v7 gefunden.
 *
 * Warum überhaupt eine neue Tabelle statt einer erweiterten `access_incidents`: Deren
 * Fremdschlüssel zeigt auf `vollmachten`, und dorthin schreibt der Produktionscode nie. Echte
 * Türen sind `action_vollmachten`. Die alte Tabelle bleibt unverändert im v1-Profil stehen —
 * leer, aber unangetastet, weil die Generationen additiv sind und ein Umformen bestehender
 * Tabellen gegen diesen Entwurf arbeitet.
 *
 * Die Tür wird als zwei nullbare Spalten geführt, nicht als Textdiskriminator: So trägt jede
 * Art einen echten Fremdschlüssel, und „genau eine" ist eine geprüfte Aussage statt einer
 * Verabredung (siehe validation.ts).
 */
import { CAMPAIGN_V7_TABLES, CAMPAIGN_V7_MODULES, CAMPAIGN_BUNDLE_V7_LIMITS, CAMPAIGN_BUNDLE_V7_JSON_SCHEMA, type CampaignTablesV7 } from "../native-v7/schema.ts";
import type { CampaignColumn, CampaignRow } from "../campaign-schema.ts";

export const CAMPAIGN_BUNDLE_V8_LIMITS = CAMPAIGN_BUNDLE_V7_LIMITS;

const id = (maxLength = 128): CampaignColumn => ({ kind: "text", maxLength, pattern: "^[^\\u0000-\\u001f\\u007f]+$" });
const nullable = (column: CampaignColumn): CampaignColumn => ({ ...column, nullable: true });

function table<const N extends string>(name: N, fields: Readonly<Record<string, CampaignColumn>>, primaryKey: readonly string[]) {
  return Object.freeze({ name, module: "zugang" as const, fields: Object.freeze(fields), columns: Object.freeze(Object.keys(fields)), primaryKey: Object.freeze(primaryKey),
    bigintColumns: Object.freeze(Object.keys(fields).filter(key => fields[key]!.kind === "bigint")), jsonColumns: Object.freeze(Object.keys(fields).filter(key => fields[key]!.kind === "json")) });
}

export const CAMPAIGN_V8_ADDITIONAL_TABLES = Object.freeze([
  table("zugangsvorfaelle", {
    id: { kind: "bigint" }, campaign_id: id(), user_id: id(),
    dokument_vollmacht_id: nullable(id()), aktions_vollmacht_id: nullable(id()),
    created_at: { kind: "bigint" },
  }, ["id"]),
] as const);

export const CAMPAIGN_V8_TABLES = Object.freeze([...CAMPAIGN_V7_TABLES, ...CAMPAIGN_V8_ADDITIONAL_TABLES] as const);
export const CAMPAIGN_V8_MODULES = Object.freeze([...CAMPAIGN_V7_MODULES, "zugang"] as const);
export type CampaignTableNameV8 = typeof CAMPAIGN_V8_TABLES[number]["name"];
export type CampaignModuleV8 = typeof CAMPAIGN_V8_MODULES[number];
export type CampaignTablesV8 = CampaignTablesV7 & { readonly [N in typeof CAMPAIGN_V8_ADDITIONAL_TABLES[number]["name"]]: readonly CampaignRow[] };
export function emptyCampaignTablesV8(): CampaignTablesV8 { return Object.fromEntries(CAMPAIGN_V8_TABLES.map(table => [table.name, []])) as unknown as CampaignTablesV8; }

const closed = (properties: Record<string, unknown>) => ({ type: "object", additionalProperties: false, required: Object.keys(properties), properties });
function column(field: CampaignColumn): Record<string, unknown> {
  const value: Record<string, unknown> = field.kind === "json" ? { $ref: "#/$defs/json" } : field.kind === "bigint" ? { type: "string", pattern: "^(0|[1-9][0-9]{0,18})$", maxLength: 19 } : { type: field.kind === "text" ? "string" : field.kind };
  for (const key of ["minimum", "maximum", "maxLength", "pattern"] as const) if (field[key] !== undefined) value[key] = field[key];
  if (field.values) value.enum = field.values;
  return field.nullable ? { anyOf: [value, { type: "null" }] } : value;
}
const previous = CAMPAIGN_BUNDLE_V7_JSON_SCHEMA;
const previousTables = (previous as unknown as { properties: { tables: { properties: Record<string, unknown> } } }).properties.tables.properties;
const previousManifest = (previous as unknown as { properties: { manifest: { properties: Record<string, unknown> } } }).properties.manifest.properties;
export const CAMPAIGN_BUNDLE_V8_JSON_SCHEMA = {
  ...previous, $id: "urn:atlas-chronicles:campaign:8", title: "Atlas Chronicles native campaign v8",
  description: "Access incidents against an open Vollmacht. Each row names exactly one door, of one of the two kinds, and the reference parser rejects a row that names both or neither.",
  properties: { ...previous.properties, version: { const: 8 },
    manifest: closed({ ...previousManifest, zugangSchemaVersion: { const: 1 },
      modules: { type: "array", minItems: CAMPAIGN_V8_MODULES.length, maxItems: CAMPAIGN_V8_MODULES.length, items: closed({ name: { enum: CAMPAIGN_V8_MODULES }, version: { const: 1 }, count: { type: "integer", minimum: 0 }, sha256: column({ kind: "text", maxLength: 64, pattern: "^[a-f0-9]{64}$" }) }) } }),
    tables: closed({ ...previousTables, ...Object.fromEntries(CAMPAIGN_V8_ADDITIONAL_TABLES.map(table => [table.name, { type: "array", maxItems: CAMPAIGN_BUNDLE_V8_LIMITS.rowsPerTable,
      items: closed(Object.fromEntries(Object.entries(table.fields).map(([key, field]) => [key, column(field)]))) }])) }),
  }, $defs: (previous as unknown as { $defs: unknown }).$defs,
} as const;
