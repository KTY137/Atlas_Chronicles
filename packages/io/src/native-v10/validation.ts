// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { fail, object } from "../campaign-v3-json.ts";
import type { CampaignTablesV10 } from "./schema.ts";

/**
 * Was eine wiederhergestellte Kategorie beweisen muss.
 *
 * Die Datenbank hält diese Aussagen über Fremdschlüssel und einen CHECK. Ein von Hand gebautes
 * Paket geht an der Datenbank vorbei, deshalb hält das Paket sie hier noch einmal:
 *
 *  1. **Alles gehört derselben Kampagne.** Eine Kategorie oder Zuordnung aus einer fremden Welt
 *     ist keine Ordnung, sondern ein Leck.
 *  2. **Zuordnungen zeigen auf Vorhandenes.** Eine Zuordnung auf einen Eintrag oder eine
 *     Kategorie, die das Paket nicht enthält, wäre eine Ordnung über Nichts.
 *  3. **Die Unterkategorien bilden keinen Kreis.** Ein Kreis in `parent_category_id` lässt jeden
 *     Leser, der den Baum aufbaut, endlos laufen — derselbe Grund, aus dem `entries.parent_entry_id`
 *     schon azyklisch geprüft wird.
 */
export function checkKategorienTables(tables: CampaignTablesV10, campaignId: string): void {
  const eltern = new Map<string, string | null>();

  for (const [index, value] of tables.categories.entries()) {
    const path = `tables.categories[${index}]`, row = object(value, path);
    if (row.campaign_id !== campaignId) fail(path, "category belongs to another campaign");
    const parent = row.parent_category_id;
    eltern.set(String(row.id), parent === null || parent === undefined ? null : String(parent));
  }
  for (const [kind, elternteil] of eltern) {
    if (elternteil !== null && !eltern.has(elternteil))
      fail("tables.categories", "a category names a parent this bundle does not contain");
    // Kreise: der Kette folgen, begrenzt durch die Zahl der Kategorien.
    let laeufer = elternteil, schritte = 0;
    while (laeufer !== null && laeufer !== undefined) {
      if (laeufer === kind) fail("tables.categories", "category parent cycle");
      if (++schritte > eltern.size) fail("tables.categories", "category parent cycle");
      laeufer = eltern.get(laeufer) ?? null;
    }
  }

  const eintraege = new Set(tables.entries.map(row => String(object(row, "tables.entries").id)));
  for (const [index, value] of tables.entry_categories.entries()) {
    const path = `tables.entry_categories[${index}]`, row = object(value, path);
    if (row.campaign_id !== campaignId) fail(path, "category assignment belongs to another campaign");
    if (!eintraege.has(String(row.entry_id)))
      fail(`${path}.entry_id`, "category assignment names an entry this bundle does not contain");
    if (!eltern.has(String(row.category_id)))
      fail(`${path}.category_id`, "category assignment names a category this bundle does not contain");
  }
}
