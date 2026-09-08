// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { CAMPAIGN_V16_TABLES, CAMPAIGN_V16_MODULES, CAMPAIGN_BUNDLE_V16_LIMITS, type CampaignTablesV16 } from "../native-v16/schema.ts";
import type { CampaignColumn, CampaignRow } from "../campaign-schema.ts";
export const CAMPAIGN_BUNDLE_V17_LIMITS = CAMPAIGN_BUNDLE_V16_LIMITS;
const id = (): CampaignColumn => ({ kind: "text", maxLength: 128, pattern: "^[^\\u0000-\\u001f\\u007f]+$" });
const nullable = (field: CampaignColumn): CampaignColumn => ({ ...field, nullable: true });
const text = (maxLength: number): CampaignColumn => ({ kind: "text", maxLength });
const hash = (): CampaignColumn => ({ kind: "text", maxLength: 64, pattern: "^[a-f0-9]{64}$" });
const json = (): CampaignColumn => ({ kind: "json" });
const time = (): CampaignColumn => ({ kind: "bigint" });
const integer = (): CampaignColumn => ({ kind: "integer", minimum: 1, maximum: 2147483647 });
const choice = (...values: string[]): CampaignColumn => ({ kind: "text", values });
function table<const N extends string>(name: N, fields: Readonly<Record<string, CampaignColumn>>, primaryKey: readonly string[]) {
  return Object.freeze({ name, module: "figurantrag" as const, fields: Object.freeze(fields),
    columns: Object.freeze(Object.keys(fields)), primaryKey: Object.freeze(primaryKey),
    bigintColumns: Object.freeze(Object.keys(fields).filter(k => fields[k]!.kind === "bigint")),
    jsonColumns: Object.freeze(Object.keys(fields).filter(k => fields[k]!.kind === "json")) });
}
export const FIGURANTRAG_STATES = ["offen", "bestaetigt", "abgelehnt", "zurueckgezogen"] as const;
export const FIGURANTRAG_EVENT_OPERATIONS = ["figurvorlage.freigeben", "figurvorlage.entziehen",
  "figurantrag.beantragen", "figurantrag.zuruecknehmen", "figurantrag.bestaetigen", "figurantrag.ablehnen"] as const;
export const CAMPAIGN_V17_ADDITIONAL_TABLES = Object.freeze([
  table("figurvorlagen_freigaben", { template_id: id(), campaign_id: id(), version: integer(),
    freed_by: id(), freed_at: time(), revoked_at: nullable(time()) }, ["template_id"]),
  table("figurantraege", { id: id(), campaign_id: id(), antragsteller: id(), template_id: id(), template_revision: integer(),
    name: text(160), anfangswerte: json(), state: choice(...FIGURANTRAG_STATES), reason: nullable(text(500)),
    version: integer(), created_at: time(), decided_by: nullable(id()), decided_at: nullable(time()), actor_id: nullable(id()) }, ["id"]),
  table("figurantrag_events", { seq: time(), command_id: id(), campaign_id: id(), actor_user_id: id(),
    operation: choice(...FIGURANTRAG_EVENT_OPERATIONS), request_hash: hash(), request: json(), payload: json(), ack: json(),
    created_at: time() }, ["seq"]),
] as const);
export const CAMPAIGN_V17_TABLES = Object.freeze([...CAMPAIGN_V16_TABLES, ...CAMPAIGN_V17_ADDITIONAL_TABLES] as const);
export const CAMPAIGN_V17_MODULES = Object.freeze([...CAMPAIGN_V16_MODULES, "figurantrag"] as const);
export type CampaignTableNameV17 = typeof CAMPAIGN_V17_TABLES[number]["name"];
export type CampaignModuleV17 = typeof CAMPAIGN_V17_MODULES[number];
export type CampaignTablesV17 = CampaignTablesV16 & {
  readonly figurvorlagen_freigaben: readonly CampaignRow[];
  readonly figurantraege: readonly CampaignRow[];
  readonly figurantrag_events: readonly CampaignRow[];
};
export function emptyCampaignTablesV17(): CampaignTablesV17 { return Object.fromEntries(CAMPAIGN_V17_TABLES.map(t => [t.name, []])) as unknown as CampaignTablesV17; }
