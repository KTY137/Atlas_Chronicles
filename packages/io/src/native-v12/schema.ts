// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
/**
 * Native v12 nimmt die Erleichterungen in das Kampagnenpaket auf (Migration 022).
 *
 * Warum eine eigene Generation: `requireCoveredSchema` in `domain/bundles.ts` prüft in beide
 * Richtungen — jede dauerhafte Spalte des laufenden Schemas muss in einem Profil vorkommen, und
 * jede Profilspalte muss es im Schema geben. Eine neue Tabelle ohne Profil bringt **jeden Export
 * zum Stehen**; so hat der Wächter schon die Bilder in v7, den Zugangsvorfall in v8, die
 * Gefüge-Kanten in v9, die Kategorien in v10 und die Kampfbühne in v11 gefunden. Generationen
 * sind additiv: ein älteres Paket, das `erleichterungen` nicht kennt, bleibt gültig.
 *
 * Modul `play`, kein neues: ein Zugeständnis am Tisch ist Spielstand — dieselbe Überlegung, mit
 * der v11 die Kampfbühne unter `play` gelassen hat.
 */
import { CAMPAIGN_V11_TABLES, CAMPAIGN_V11_MODULES, CAMPAIGN_BUNDLE_V11_LIMITS, type CampaignTablesV11 } from "../native-v11/schema.ts";
import type { CampaignColumn, CampaignRow } from "../campaign-schema.ts";

export const CAMPAIGN_BUNDLE_V12_LIMITS = CAMPAIGN_BUNDLE_V11_LIMITS;

const id = (maxLength = 128): CampaignColumn => ({ kind: "text", maxLength, pattern: "^[^\\u0000-\\u001f\\u007f]+$" });
const text = (maxLength: number): CampaignColumn => ({ kind: "text", maxLength });
const nullable = (column: CampaignColumn): CampaignColumn => ({ ...column, nullable: true });
const bigint = (): CampaignColumn => ({ kind: "bigint" });
const json = (): CampaignColumn => ({ kind: "json" });

function table<const N extends string>(name: N, fields: Readonly<Record<string, CampaignColumn>>, primaryKey: readonly string[]) {
  return Object.freeze({ name, module: "play" as const, fields: Object.freeze(fields), columns: Object.freeze(Object.keys(fields)), primaryKey: Object.freeze(primaryKey),
    bigintColumns: Object.freeze(Object.keys(fields).filter(key => fields[key]!.kind === "bigint")), jsonColumns: Object.freeze(Object.keys(fields).filter(key => fields[key]!.kind === "json")) });
}

export const CAMPAIGN_V12_ADDITIONAL_TABLES = Object.freeze([
  table("erleichterungen", {
    id: id(), campaign_id: id(), actor_id: id(),
    gemeinte_aktion: text(128), gewuerfelte_aktion: text(128),
    eingaben: json(), grund: text(500),
    gewaehrt_von: id(), gewaehrt_am: bigint(),
    eingeloest_roll_id: nullable(id()), eingeloest_am: nullable(bigint()), widerrufen_am: nullable(bigint()),
  }, ["id"]),
] as const);

export const CAMPAIGN_V12_TABLES = Object.freeze([...CAMPAIGN_V11_TABLES, ...CAMPAIGN_V12_ADDITIONAL_TABLES] as const);
export const CAMPAIGN_V12_MODULES = CAMPAIGN_V11_MODULES;
export type CampaignTableNameV12 = typeof CAMPAIGN_V12_TABLES[number]["name"];
export type CampaignModuleV12 = typeof CAMPAIGN_V12_MODULES[number];
export type CampaignTablesV12 = CampaignTablesV11 & { readonly [N in typeof CAMPAIGN_V12_ADDITIONAL_TABLES[number]["name"]]: readonly CampaignRow[] };
export function emptyCampaignTablesV12(): CampaignTablesV12 { return Object.fromEntries(CAMPAIGN_V12_TABLES.map(table => [table.name, []])) as unknown as CampaignTablesV12; }
