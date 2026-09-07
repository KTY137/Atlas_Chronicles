/**
 * Native v7 nimmt die Bilder des Wikis in das Kampagnenpaket auf (Migration 015).
 *
 * Warum das eine eigene Generation ist und keine stille Erweiterung: ein Kampagnenexport, der
 * die Bilder eurer Chronik weglässt, ist ein verlustbehafteter Export, der sich als vollständig
 * ausgibt. Die Abdeckungsprüfung in `domain/bundles.ts` erzwingt genau das — jede dauerhafte
 * Spalte muss in einem Profil vorkommen — und sie hat diese beiden Tabellen sofort gefunden.
 *
 * Die Bytes liegen als base64 in der Zeile, wie schon `tactical_sources.image_base64` in v3. Ein
 * Dateipfad neben dem Paket wäre die Stelle, an der ein Paket beim Umzug unvollständig wird.
 */
import { CAMPAIGN_V6_TABLES, CAMPAIGN_V6_MODULES, CAMPAIGN_BUNDLE_V6_LIMITS, type CampaignTablesV6 } from "../native-v6/schema.ts";
import { CAMPAIGN_BUNDLE_V6_JSON_SCHEMA } from "../native-v6/schema.ts";
import type { CampaignColumn, CampaignRow } from "../campaign-schema.ts";

export const CAMPAIGN_BUNDLE_V7_LIMITS = CAMPAIGN_BUNDLE_V6_LIMITS;

const id = (maxLength = 128): CampaignColumn => ({ kind: "text", maxLength, pattern: "^[^\\u0000-\\u001f\\u007f]+$" });
const digest = (): CampaignColumn => ({ kind: "text", maxLength: 64, pattern: "^[a-f0-9]{64}$" });
const text = (maxLength: number): CampaignColumn => ({ kind: "text", maxLength });
const nullable = (column: CampaignColumn): CampaignColumn => ({ ...column, nullable: true });

function table<const N extends string>(name: N, fields: Readonly<Record<string, CampaignColumn>>, primaryKey: readonly string[]) {
  return Object.freeze({ name, module: "wiki-medien" as const, fields: Object.freeze(fields), columns: Object.freeze(Object.keys(fields)), primaryKey: Object.freeze(primaryKey),
    bigintColumns: Object.freeze(Object.keys(fields).filter(key => fields[key]!.kind === "bigint")), jsonColumns: Object.freeze(Object.keys(fields).filter(key => fields[key]!.kind === "json")) });
}

export const CAMPAIGN_V7_ADDITIONAL_TABLES = Object.freeze([
  table("wiki_assets", {
    id: id(), campaign_id: id(), universe_id: id(), dateiname: text(512),
    // Gemessen, nicht behauptet: gemeinsam gesetzt oder gemeinsam null (siehe validation.ts).
    mime: nullable({ kind: "text", values: ["image/png", "image/jpeg", "image/webp", "image/gif"] }),
    sha256: nullable(digest()), bytes: nullable({ kind: "bigint" }),
    breite: nullable({ kind: "integer", minimum: 1, maximum: 20_000 }),
    hoehe: nullable({ kind: "integer", minimum: 1, maximum: 20_000 }),
    daten: nullable(text(CAMPAIGN_BUNDLE_V7_LIMITS.sourceBase64Length)),
    behaupteter_mime: nullable(text(200)),
    lizenz_status: { kind: "text", values: ["frei", "zitat", "unbekannt"] },
    lizenz_quelle: nullable(text(4096)),
    lizenz_gesetzt_von: { kind: "text", values: ["import", "mensch"] },
    beschreibungsseite_url: nullable(text(4096)), quell_url: nullable(text(4096)),
    urheber: nullable(text(512)), hochgeladen_am: nullable(text(64)),
    verwendet_von: { kind: "json" }, verwaist: { kind: "boolean" }, im_bestand: { kind: "boolean" },
    import_id: nullable(id()), created_by: id(), created_at: { kind: "bigint" },
    geholt_von: nullable(id()), geholt_am: nullable({ kind: "bigint" }),
  }, ["id", "campaign_id"]),
  table("wiki_asset_uses", {
    asset_id: id(), campaign_id: id(), passage_id: id(), entry_id: id(),
  }, ["asset_id", "campaign_id", "passage_id"]),
] as const);

export const CAMPAIGN_V7_TABLES = Object.freeze([...CAMPAIGN_V6_TABLES, ...CAMPAIGN_V7_ADDITIONAL_TABLES] as const);
export const CAMPAIGN_V7_MODULES = Object.freeze([...CAMPAIGN_V6_MODULES, "wiki-medien"] as const);
export type CampaignTableNameV7 = typeof CAMPAIGN_V7_TABLES[number]["name"];
export type CampaignModuleV7 = typeof CAMPAIGN_V7_MODULES[number];
export type CampaignTablesV7 = CampaignTablesV6 & { readonly [N in typeof CAMPAIGN_V7_ADDITIONAL_TABLES[number]["name"]]: readonly CampaignRow[] };
export function emptyCampaignTablesV7(): CampaignTablesV7 { return Object.fromEntries(CAMPAIGN_V7_TABLES.map(table => [table.name, []])) as unknown as CampaignTablesV7; }

const closed = (properties: Record<string, unknown>) => ({ type: "object", additionalProperties: false, required: Object.keys(properties), properties });
function column(field: CampaignColumn): Record<string, unknown> {
  const value: Record<string, unknown> = field.kind === "json" ? { $ref: "#/$defs/json" } : field.kind === "bigint" ? { type: "string", pattern: "^(0|[1-9][0-9]{0,18})$", maxLength: 19 } : { type: field.kind === "text" ? "string" : field.kind };
  for (const key of ["minimum", "maximum", "maxLength", "pattern"] as const) if (field[key] !== undefined) value[key] = field[key];
  if (field.values) value.enum = field.values;
  return field.nullable ? { anyOf: [value, { type: "null" }] } : value;
}
const previous = CAMPAIGN_BUNDLE_V6_JSON_SCHEMA;
const previousTables = (previous as unknown as { properties: { tables: { properties: Record<string, unknown> } } }).properties.tables.properties;
const previousManifest = (previous as unknown as { properties: { manifest: { properties: Record<string, unknown> } } }).properties.manifest.properties;
export const CAMPAIGN_BUNDLE_V7_JSON_SCHEMA = {
  ...previous, $id: "urn:atlas-chronicles:campaign:7", title: "Atlas Chronicles native campaign v7",
  description: "Imported wiki media with measured format, provenance and licence state. The reference parser re-measures every stored image and re-derives its digest; a byte payload that disagrees with its row is rejected rather than repaired.",
  properties: { ...previous.properties, version: { const: 7 },
    manifest: closed({ ...previousManifest, wikiMediaSchemaVersion: { const: 1 },
      modules: { type: "array", minItems: CAMPAIGN_V7_MODULES.length, maxItems: CAMPAIGN_V7_MODULES.length, items: closed({ name: { enum: CAMPAIGN_V7_MODULES }, version: { const: 1 }, count: { type: "integer", minimum: 0 }, sha256: column(digest()) }) } }),
    tables: closed({ ...previousTables, ...Object.fromEntries(CAMPAIGN_V7_ADDITIONAL_TABLES.map(table => [table.name, { type: "array", maxItems: CAMPAIGN_BUNDLE_V7_LIMITS.rowsPerTable,
      items: closed(Object.fromEntries(Object.entries(table.fields).map(([key, field]) => [key, column(field)]))) }])) }),
  }, $defs: (previous as unknown as { $defs: unknown }).$defs,
} as const;
