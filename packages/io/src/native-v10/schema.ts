/**
 * Native v10 nimmt die Wiki-Kategorien in das Kampagnenpaket auf (Migration 020).
 *
 * Warum eine eigene Generation: Die Abdeckungsprüfung in `domain/bundles.ts` verlangt, dass jede
 * dauerhafte Spalte des Anwendungsschemas in einem Profil vorkommt. Eine neue Tabelle ohne Profil
 * bringt jeden Export zum Stehen — so hat der Wächter schon die Bilder in v7, den
 * Zugangsvorfall in v8 und die Gefüge-Kanten in v9 gefunden. Die Kategorien in das eingefrorene v1-Profil zu schreiben wäre
 * der kürzere Weg und der falsche: ein altes Paket, das `categories` nicht kennt, würde beim
 * Wiederherstellen als unvollständig abgewiesen. Generationen sind additiv.
 *
 * Warum zwei Tabellen und keine Spalte an `entries`: Ein Artikel gehört zu beliebig vielen
 * Kategorien. `entries.art` bleibt die eine Typisierung aus der Infobox, `entry_categories` ist
 * die Mengenzugehörigkeit, und `entries.parent_entry_id` bleibt das Enthaltensein. Drei Aussagen,
 * drei Orte.
 *
 * Modul `wiki`, nicht ein neues: eine Kategorie ist Wiki-Inhalt. Damit deckt der Modulhash des
 * Wikis sie mit ab, statt sie in einem Nebenraum zu führen.
 */
import { CAMPAIGN_V9_TABLES, CAMPAIGN_V9_MODULES, CAMPAIGN_BUNDLE_V9_LIMITS, type CampaignTablesV9 } from "../native-v9/schema.ts";
import type { CampaignColumn, CampaignRow } from "../campaign-schema.ts";

export const CAMPAIGN_BUNDLE_V10_LIMITS = CAMPAIGN_BUNDLE_V9_LIMITS;

const id = (maxLength = 128): CampaignColumn => ({ kind: "text", maxLength, pattern: "^[^\\u0000-\\u001f\\u007f]+$" });
const text = (maxLength: number): CampaignColumn => ({ kind: "text", maxLength });
const nullable = (column: CampaignColumn): CampaignColumn => ({ ...column, nullable: true });
const choice = (...values: string[]): CampaignColumn => ({ kind: "text", values });

function table<const N extends string>(name: N, fields: Readonly<Record<string, CampaignColumn>>, primaryKey: readonly string[]) {
  return Object.freeze({ name, module: "wiki" as const, fields: Object.freeze(fields), columns: Object.freeze(Object.keys(fields)), primaryKey: Object.freeze(primaryKey),
    bigintColumns: Object.freeze(Object.keys(fields).filter(key => fields[key]!.kind === "bigint")), jsonColumns: Object.freeze(Object.keys(fields).filter(key => fields[key]!.kind === "json")) });
}

export const CAMPAIGN_V10_ADDITIONAL_TABLES = Object.freeze([
  table("categories", {
    id: id(), campaign_id: id(), slug: text(512), title: text(512),
    parent_category_id: nullable(id()),
    sichtbarkeit: choice("verborgen", "silhouette", "offen"),
  }, ["id"]),
  table("entry_categories", {
    campaign_id: id(), entry_id: id(), category_id: id(),
  }, ["campaign_id", "entry_id", "category_id"]),
] as const);

export const CAMPAIGN_V10_TABLES = Object.freeze([...CAMPAIGN_V9_TABLES, ...CAMPAIGN_V10_ADDITIONAL_TABLES] as const);
export const CAMPAIGN_V10_MODULES = CAMPAIGN_V9_MODULES;
export type CampaignTableNameV10 = typeof CAMPAIGN_V10_TABLES[number]["name"];
export type CampaignModuleV10 = typeof CAMPAIGN_V10_MODULES[number];
export type CampaignTablesV10 = CampaignTablesV9 & { readonly [N in typeof CAMPAIGN_V10_ADDITIONAL_TABLES[number]["name"]]: readonly CampaignRow[] };
export function emptyCampaignTablesV10(): CampaignTablesV10 { return Object.fromEntries(CAMPAIGN_V10_TABLES.map(table => [table.name, []])) as unknown as CampaignTablesV10; }
