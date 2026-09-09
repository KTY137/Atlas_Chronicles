// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { CAMPAIGN_V18_TABLES, CAMPAIGN_V18_MODULES, CAMPAIGN_BUNDLE_V18_LIMITS, type CampaignTablesV18 } from "../native-v18/schema.ts";
import type { CampaignColumn, CampaignRow } from "../campaign-schema.ts";
export const CAMPAIGN_BUNDLE_V19_LIMITS = CAMPAIGN_BUNDLE_V18_LIMITS;
const id = (): CampaignColumn => ({ kind: "text", maxLength: 128, pattern: "^[^\u0000-\u001f\u007f]+$" });
const text = (maxLength: number): CampaignColumn => ({ kind: "text", maxLength });
const nullable = (column: CampaignColumn): CampaignColumn => ({ ...column, nullable: true });
const time = (): CampaignColumn => ({ kind: "bigint" });
function table<const N extends string>(name: N, fields: Readonly<Record<string, CampaignColumn>>, primaryKey: readonly string[]) {
  return Object.freeze({ name, module: "kartenherkunft" as const, fields: Object.freeze(fields),
    columns: Object.freeze(Object.keys(fields)), primaryKey: Object.freeze(primaryKey),
    bigintColumns: Object.freeze(Object.keys(fields).filter(k => fields[k]!.kind === "bigint")),
    jsonColumns: Object.freeze(Object.keys(fields).filter(k => fields[k]!.kind === "json")) });
}
/**
 * WOHER EINE KARTE KOMMT — die Zeile, die den fest verdrahteten Pfad ersetzt.
 *
 * Sie steht neben dem Artefakt und nicht darin: `artifacts.source` ist das unveraenderte
 * Quelldokument und wird Zeichen fuer Zeichen gegen seinen Hash gehalten. Ein Abrufzeitpunkt
 * darin machte dieselbe Karte bei jedem Abruf zu einer anderen Karte.
 *
 * `wiki_url` und `seitentitel` gehoeren zusammen und sind bei einer reinen Bildkarte beide leer;
 * `bild_dateiname` zeigt auf die Zeile im Bildbestand, die die Bytes traegt.
 */
export const CAMPAIGN_V19_ADDITIONAL_TABLES = Object.freeze([
  table("atlas_karten_herkunft", {
    map_id: id(), campaign_id: id(),
    art: { kind: "text", values: ["wiki", "beispiel", "bild"] },
    wiki_url: nullable(text(2000)), seitentitel: nullable(text(512)),
    pageid: nullable({ kind: "bigint" }), revid: nullable({ kind: "bigint" }),
    bild_dateiname: nullable(text(512)), lizenz: nullable(text(2000)),
    abgerufen_am: time(), geholt_von: id(),
  }, ["map_id"]),
] as const);
export const CAMPAIGN_V19_TABLES = Object.freeze([...CAMPAIGN_V18_TABLES, ...CAMPAIGN_V19_ADDITIONAL_TABLES] as const);
export const CAMPAIGN_V19_MODULES = Object.freeze([...CAMPAIGN_V18_MODULES, "kartenherkunft"] as const);
export type CampaignTableNameV19 = typeof CAMPAIGN_V19_TABLES[number]["name"];
export type CampaignModuleV19 = typeof CAMPAIGN_V19_MODULES[number];
export type CampaignTablesV19 = CampaignTablesV18 & { readonly atlas_karten_herkunft: readonly CampaignRow[] };
export function emptyCampaignTablesV19(): CampaignTablesV19 { return Object.fromEntries(CAMPAIGN_V19_TABLES.map(t => [t.name, []])) as unknown as CampaignTablesV19; }
