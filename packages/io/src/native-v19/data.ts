// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
/** Zeilenform des Moduls `kartenherkunft`. Eine Datenform, keine Laufzeit. */
export interface AtlasKartenherkunftRow {
  map_id: string; campaign_id: string; art: "wiki" | "beispiel" | "bild";
  wiki_url: string | null; seitentitel: string | null;
  pageid: string | null; revid: string | null;
  bild_dateiname: string | null; lizenz: string | null;
  abgerufen_am: string; geholt_von: string;
}
/**
 * Wer im Modul `kartenherkunft` als Mensch vorkommt.
 *
 * Wer die Karte geholt hat, kann die Runde inzwischen verlassen haben. Die Herkunft bleibt
 * trotzdem stehen — sonst waere die Karte danach wieder von nirgendwo — und ohne seine
 * Identitaetszeile liesse sich die Sicherung nicht wieder einspielen.
 */
export function collectKartenherkunftIdentityIds(zeilen: readonly AtlasKartenherkunftRow[]): readonly string[] {
  return [...new Set(zeilen.map(row => row.geholt_von))].sort();
}
