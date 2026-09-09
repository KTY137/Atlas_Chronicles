// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
/** Zeilenform des Moduls `regelarchiv`. Eine Datenform, keine Laufzeit. */
export interface RulePackageArchivRow {
  campaign_id: string; package_id: string; version: string;
  archived_at: string; archived_by: string;
}
/**
 * Wer im Modul `regelarchiv` als Mensch vorkommt.
 *
 * Wer ein Paket aus der Bibliothek genommen hat, kann die Kampagne inzwischen verlassen haben.
 * Die Zeile bleibt trotzdem, und ohne seine Identitaetszeile liesse sich die Sicherung nicht
 * wieder einspielen.
 */
export function collectRegelarchivIdentityIds(archiv: readonly RulePackageArchivRow[]): readonly string[] {
  return [...new Set(archiv.map(row => row.archived_by))].sort();
}
