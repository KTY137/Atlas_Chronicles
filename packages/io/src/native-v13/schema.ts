/**
 * Native v13 nimmt den Geldzähler in das Kampagnenpaket auf (Migration 023).
 *
 * Warum eine eigene Generation: `requireCoveredSchema` in `domain/bundles.ts` prüft in beide
 * Richtungen — eine neue Tabelle ohne Profil bringt **jeden Export zum Stehen**. So hat der
 * Wächter schon die Bilder in v7, den Zugangsvorfall in v8, die Gefüge-Kanten in v9, die
 * Kategorien in v10, die Kampfbühne in v11 und die Erleichterungen in v12 gefunden. Generationen
 * sind additiv: ein älteres Paket, das `geldbestand` nicht kennt, bleibt gültig.
 *
 * Modul `play`, kein neues: eine Börse ist Spielstand.
 */
import { CAMPAIGN_V12_TABLES, CAMPAIGN_V12_MODULES, CAMPAIGN_BUNDLE_V12_LIMITS, type CampaignTablesV12 } from "../native-v12/schema.ts";
import type { CampaignColumn, CampaignRow } from "../campaign-schema.ts";

export const CAMPAIGN_BUNDLE_V13_LIMITS = CAMPAIGN_BUNDLE_V12_LIMITS;

const id = (maxLength = 128): CampaignColumn => ({ kind: "text", maxLength, pattern: "^[^\\u0000-\\u001f\\u007f]+$" });
const text = (maxLength: number): CampaignColumn => ({ kind: "text", maxLength });
const integer = (minimum: number, maximum: number): CampaignColumn => ({ kind: "integer", minimum, maximum });
const bigint = (): CampaignColumn => ({ kind: "bigint" });

function table<const N extends string>(name: N, fields: Readonly<Record<string, CampaignColumn>>, primaryKey: readonly string[]) {
  return Object.freeze({ name, module: "play" as const, fields: Object.freeze(fields), columns: Object.freeze(Object.keys(fields)), primaryKey: Object.freeze(primaryKey),
    bigintColumns: Object.freeze(Object.keys(fields).filter(key => fields[key]!.kind === "bigint")), jsonColumns: Object.freeze(Object.keys(fields).filter(key => fields[key]!.kind === "json")) });
}

export const CAMPAIGN_V13_ADDITIONAL_TABLES = Object.freeze([
  table("geld_einheit", {
    campaign_id: id(), name: text(40), version: integer(1, 2_147_483_647), geaendert_am: bigint(),
  }, ["campaign_id"]),
  table("geldbestand", {
    campaign_id: id(), actor_id: id(),
    // `bigint`, weil eine Börse in manchen Systemen sehr groß wird — und weil die Spalte in der
    // Datenbank ohnehin `bigint` ist. Ein `integer` hier wäre eine zweite, engere Wahrheit.
    betrag: bigint(), version: integer(1, 2_147_483_647), geaendert_am: bigint(),
  }, ["campaign_id", "actor_id"]),
] as const);

export const CAMPAIGN_V13_TABLES = Object.freeze([...CAMPAIGN_V12_TABLES, ...CAMPAIGN_V13_ADDITIONAL_TABLES] as const);
export const CAMPAIGN_V13_MODULES = CAMPAIGN_V12_MODULES;
export type CampaignTableNameV13 = typeof CAMPAIGN_V13_TABLES[number]["name"];
export type CampaignModuleV13 = typeof CAMPAIGN_V13_MODULES[number];
export type CampaignTablesV13 = CampaignTablesV12 & { readonly [N in typeof CAMPAIGN_V13_ADDITIONAL_TABLES[number]["name"]]: readonly CampaignRow[] };
export function emptyCampaignTablesV13(): CampaignTablesV13 { return Object.fromEntries(CAMPAIGN_V13_TABLES.map(table => [table.name, []])) as unknown as CampaignTablesV13; }
