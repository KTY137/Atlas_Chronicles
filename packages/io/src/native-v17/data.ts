// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
/** Zeilenformen des Moduls `figurantrag`. Datenformen, keine Laufzeit — Native liest sie als Daten. */
export type FigurantragState = "offen" | "bestaetigt" | "abgelehnt" | "zurueckgezogen";
export type FigurantragEventOperation = "figurvorlage.freigeben" | "figurvorlage.entziehen"
  | "figurantrag.beantragen" | "figurantrag.zuruecknehmen" | "figurantrag.bestaetigen" | "figurantrag.ablehnen";
export interface FigurvorlageFreigabeRow {
  template_id: string; campaign_id: string; version: number;
  freed_by: string; freed_at: string; revoked_at: string | null;
}
export interface FigurantragRow {
  id: string; campaign_id: string; antragsteller: string; template_id: string; template_revision: number;
  name: string; anfangswerte: Record<string, string | number | boolean>; state: FigurantragState;
  reason: string | null; version: number; created_at: string;
  decided_by: string | null; decided_at: string | null; actor_id: string | null;
}
export interface FigurantragEventRow {
  seq: string; command_id: string; campaign_id: string; actor_user_id: string;
  operation: FigurantragEventOperation; request_hash: string;
  request: Record<string, unknown>; payload: Record<string, unknown>; ack: Record<string, unknown>;
  created_at: string;
}
/**
 * Wer im Modul `figurantrag` als Mensch vorkommt.
 *
 * Ein Antragsteller kann die Kampagne verlassen haben; sein Antrag bleibt trotzdem ein Beleg und
 * braucht seine Identitaetszeile, sonst laesst sich die Sicherung nicht wieder einspielen.
 */
export function collectFigurantragIdentityIds(freigaben: readonly FigurvorlageFreigabeRow[],
  antraege: readonly FigurantragRow[], events: readonly FigurantragEventRow[]): readonly string[] {
  const ids = new Set<string>();
  for (const row of freigaben) ids.add(row.freed_by);
  for (const row of antraege) { ids.add(row.antragsteller); if (row.decided_by) ids.add(row.decided_by); }
  for (const row of events) ids.add(row.actor_user_id);
  return [...ids].sort();
}
