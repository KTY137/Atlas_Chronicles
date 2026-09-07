// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { fail, object } from "../campaign-v3-json.ts";
import type { CampaignTablesV9 } from "./schema.ts";

/**
 * Was eine wiederhergestellte Beziehungskante beweisen muss.
 *
 * Die Kante ist eine Aussage, die an einer Passage hängt. Eine Kante ohne ihre Passage ist
 * keine schwächere Kante, sondern eine Aussage ohne Sprecher — und im Archiv wäre sie genau
 * die Zeile, die einer Leserin später etwas zeigt, das ihr niemand erzählt hat. Deshalb prüft
 * dieser Lauf drei Dinge, die das JSON-Schema allein nicht ausdrücken kann:
 *
 *  1. **Die Kante gehört dieser Kampagne.**
 *  2. **Ihre Passage und beide Einträge liegen im selben Paket.** Sonst könnte die Sicht nach
 *     einer Wiederherstellung nicht mehr entschieden werden.
 *  3. **Sie verbindet zwei verschiedene Einträge.** Eine Schleife ist im Stammbaum wie im
 *     Politogramm keine Aussage.
 */
export function checkGefuegeTables(tables: CampaignTablesV9, campaignId: string): void {
  const passagen = new Set(tables.passages.map(row => String(object(row, "tables.passages").id)));
  const eintraege = new Set(tables.entries.map(row => String(object(row, "tables.entries").id)));

  for (const [index, value] of tables.beziehungen.entries()) {
    const path = `tables.beziehungen[${index}]`, row = object(value, path);
    if (row.campaign_id !== campaignId) fail(path, "relationship belongs to another campaign");
    if (!passagen.has(String(row.passage_id)))
      fail(`${path}.passage_id`, "relationship is anchored on a passage this bundle does not contain");
    for (const column of ["von_entry_id", "nach_entry_id"] as const)
      if (!eintraege.has(String(row[column]))) fail(`${path}.${column}`, "relationship points at an entry this bundle does not contain");
    if (row.von_entry_id === row.nach_entry_id) fail(path, "a relationship connects two different entries");
  }
}
