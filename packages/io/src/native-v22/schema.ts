// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
/**
 * Native v22 nimmt die Kartenlage des Kampftischs auf (Migration 037). Modul `play`, kein neues:
 * wo eine Karte liegt, ist Spielstand wie der Kampf selbst (native-v11).
 */
import { CAMPAIGN_V21_TABLES, CAMPAIGN_V21_MODULES, CAMPAIGN_BUNDLE_V21_LIMITS, type CampaignTablesV21 } from "../native-v21/schema.ts";
import type { CampaignColumn, CampaignRow } from "../campaign-schema.ts";

export const CAMPAIGN_BUNDLE_V22_LIMITS = CAMPAIGN_BUNDLE_V21_LIMITS;
const id = (): CampaignColumn => ({ kind: "text", maxLength: 128, pattern: "^[^\\u0000-\\u001f\\u007f]+$" });
function table<const N extends string>(name: N, fields: Readonly<Record<string, CampaignColumn>>, primaryKey: readonly string[]) {
  return Object.freeze({ name, module: "play" as const, fields: Object.freeze(fields), columns: Object.freeze(Object.keys(fields)), primaryKey: Object.freeze(primaryKey),
    bigintColumns: Object.freeze(Object.keys(fields).filter(k => fields[k]!.kind === "bigint")), jsonColumns: Object.freeze(Object.keys(fields).filter(k => fields[k]!.kind === "json")) });
}
export const CAMPAIGN_V22_ADDITIONAL_TABLES = Object.freeze([
  table("kampf_karten", {
    teilnehmer_id: id(), campaign_id: id(),
    lage: { kind: "text", values: ["hand", "feld", "umgelegt", "ablage"] },
    // Wie die Eingabe (`NameFuerRundeSchema`): mindestens ein sichtbares Zeichen — das deckt auch
    // „mindestens 1 Zeichen“ der Datenbank. `geaendert_am >= 0` hält die Spaltenart `bigint` selbst
    // (nur nichtnegative Dezimalziffern).
    name_fuer_runde: { kind: "text", maxLength: 160, pattern: "\\S", nullable: true },
    sicht: { kind: "json" },
    vom_kampf_angelegt: { kind: "boolean" },
    version: { kind: "integer", minimum: 1, maximum: 2147483647 },
    geaendert_am: { kind: "bigint" },
  }, ["teilnehmer_id"]),
] as const);
export const CAMPAIGN_V22_TABLES = Object.freeze([...CAMPAIGN_V21_TABLES, ...CAMPAIGN_V22_ADDITIONAL_TABLES] as const);
export const CAMPAIGN_V22_MODULES = CAMPAIGN_V21_MODULES;
export type CampaignTableNameV22 = typeof CAMPAIGN_V22_TABLES[number]["name"];
export type CampaignModuleV22 = typeof CAMPAIGN_V22_MODULES[number];
export type CampaignTablesV22 = CampaignTablesV21 & { readonly kampf_karten: readonly CampaignRow[] };
export function emptyCampaignTablesV22(): CampaignTablesV22 { return Object.fromEntries(CAMPAIGN_V22_TABLES.map(t => [t.name, []])) as unknown as CampaignTablesV22; }
