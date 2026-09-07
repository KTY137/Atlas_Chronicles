// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
/**
 * Native v11 nimmt die Kampfbühne in das Kampagnenpaket auf (Migration 021).
 *
 * Warum eine eigene Generation: `requireCoveredSchema` in `domain/bundles.ts` prüft in beide
 * Richtungen — jede dauerhafte Spalte des laufenden Schemas muss in einem Profil vorkommen, und
 * jede Profilspalte muss es im Schema geben. Eine neue Tabelle ohne Profil bringt deshalb **jeden
 * Export zum Stehen**; so hat der Wächter schon die Bilder in v7, den Zugangsvorfall in v8, die
 * Gefüge-Kanten in v9 und die Kategorien in v10 gefunden. Die Bühne in ein eingefrorenes Profil
 * zu schreiben wäre der kürzere Weg und der falsche: ein älteres Paket, das `kaempfe` nicht
 * kennt, würde beim Wiederherstellen als unvollständig abgewiesen. Generationen sind additiv.
 *
 * Modul `play`, kein neues: ein Kampf ist Spielstand. Damit deckt der Modulhash des Spiels ihn
 * mit ab, statt ihn in einem Nebenraum zu führen — dieselbe Überlegung, mit der v10 die
 * Kategorien unter `wiki` gelassen hat.
 *
 * Warum zwei Tabellen: die Bühne und die Karten darauf sind zwei Aussagen. Ein Kampf hat einen
 * Zustand und eine Runde; ein Teilnehmer hat eine Seite, eine Initiative und einen Zug. Sie in
 * eine Tabelle zu falten hieße, die Runde je Karte zu wiederholen und sie damit widersprechbar
 * zu machen.
 */
import { CAMPAIGN_V10_TABLES, CAMPAIGN_V10_MODULES, CAMPAIGN_BUNDLE_V10_LIMITS, type CampaignTablesV10 } from "../native-v10/schema.ts";
import type { CampaignColumn, CampaignRow } from "../campaign-schema.ts";

export const CAMPAIGN_BUNDLE_V11_LIMITS = CAMPAIGN_BUNDLE_V10_LIMITS;

const id = (maxLength = 128): CampaignColumn => ({ kind: "text", maxLength, pattern: "^[^\\u0000-\\u001f\\u007f]+$" });
const text = (maxLength: number): CampaignColumn => ({ kind: "text", maxLength });
const nullable = (column: CampaignColumn): CampaignColumn => ({ ...column, nullable: true });
const choice = (...values: string[]): CampaignColumn => ({ kind: "text", values });
const integer = (minimum: number, maximum: number): CampaignColumn => ({ kind: "integer", minimum, maximum });
const bigint = (): CampaignColumn => ({ kind: "bigint" });
const bool = (): CampaignColumn => ({ kind: "boolean" });

function table<const N extends string>(name: N, fields: Readonly<Record<string, CampaignColumn>>, primaryKey: readonly string[]) {
  return Object.freeze({ name, module: "play" as const, fields: Object.freeze(fields), columns: Object.freeze(Object.keys(fields)), primaryKey: Object.freeze(primaryKey),
    bigintColumns: Object.freeze(Object.keys(fields).filter(key => fields[key]!.kind === "bigint")), jsonColumns: Object.freeze(Object.keys(fields).filter(key => fields[key]!.kind === "json")) });
}

export const CAMPAIGN_V11_ADDITIONAL_TABLES = Object.freeze([
  table("kaempfe", {
    id: id(), campaign_id: id(), name: text(512),
    zustand: choice("vorbereitet", "laufend", "beendet"),
    runde: integer(0, 1_000_000),
    erstellt_am: bigint(), beendet_am: nullable(bigint()),
  }, ["id"]),
  table("kampf_teilnehmer", {
    id: id(), kampf_id: id(), campaign_id: id(),
    seite: choice("gefaehrten", "gegner", "neutral"),
    name: text(512), actor_id: nullable(id()),
    // Initiative darf negativ sein: nicht jedes Regelsystem zählt von null aufwärts, und ein
    // Malus, den das Paket erlaubt, darf am Exportprofil nicht scheitern.
    initiative: integer(-1_000_000, 1_000_000),
    ordnung: integer(0, 1_000_000),
    initiative_roll_id: nullable(id()), am_zug: bool(),
  }, ["id"]),
] as const);

export const CAMPAIGN_V11_TABLES = Object.freeze([...CAMPAIGN_V10_TABLES, ...CAMPAIGN_V11_ADDITIONAL_TABLES] as const);
export const CAMPAIGN_V11_MODULES = CAMPAIGN_V10_MODULES;
export type CampaignTableNameV11 = typeof CAMPAIGN_V11_TABLES[number]["name"];
export type CampaignModuleV11 = typeof CAMPAIGN_V11_MODULES[number];
export type CampaignTablesV11 = CampaignTablesV10 & { readonly [N in typeof CAMPAIGN_V11_ADDITIONAL_TABLES[number]["name"]]: readonly CampaignRow[] };
export function emptyCampaignTablesV11(): CampaignTablesV11 { return Object.fromEntries(CAMPAIGN_V11_TABLES.map(table => [table.name, []])) as unknown as CampaignTablesV11; }
