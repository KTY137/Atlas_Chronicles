// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { fail, object } from "../campaign-v3-json.ts";
import type { CampaignTablesV13 } from "./schema.ts";

/**
 * Was ein wiederhergestellter Geldstand beweisen muss.
 *
 * Die Datenbank hält diese Aussagen über Fremdschlüssel und CHECKs. Ein von Hand gebautes Paket
 * geht an der Datenbank vorbei — deshalb hält das Paket sie hier noch einmal:
 *
 *  1. **Alles gehört derselben Kampagne**, und jede Börse gehört einer Figur, die das Paket
 *     enthält. Ein Bestand ohne Figur wäre Geld, das niemandem gehört.
 *  2. **Kein negativer Betrag.** Schulden sind eine Erzählung, kein Kontostand — und eine Zahl
 *     unter null wäre genau der stille Rechenfehler, den ein Zähler verhindern soll.
 *  3. **Höchstens eine Börse je Figur** und **höchstens eine Einheit je Kampagne**. Zwei Zahlen
 *     für dieselbe Figur wären zwei Wahrheiten; zwei Namen für dasselbe Geld ebenso.
 *  4. **Ein Betrag ohne benannte Einheit ist bedeutungslos.** Wer Geld führt, hat auch gesagt,
 *     wie es heißt.
 */
export function checkGeldTables(tables: CampaignTablesV13, campaignId: string): void {
  const figuren = new Set(tables.actors.map(row => String(object(row, "tables.actors").id)));

  if (tables.geld_einheit.length > 1) fail("tables.geld_einheit", "a campaign names its currency once");
  for (const [index, value] of tables.geld_einheit.entries()) {
    const path = `tables.geld_einheit[${index}]`, row = object(value, path);
    if (row.campaign_id !== campaignId) fail(path, "currency belongs to another campaign");
    if (typeof row.name !== "string" || !/\S/.test(row.name)) fail(`${path}.name`, "a currency without a name leaves the number meaningless");
  }

  const gesehen = new Set<string>();
  for (const [index, value] of tables.geldbestand.entries()) {
    const path = `tables.geldbestand[${index}]`, row = object(value, path);
    if (row.campaign_id !== campaignId) fail(path, "purse belongs to another campaign");
    const figur = String(row.actor_id);
    if (!figuren.has(figur)) fail(`${path}.actor_id`, "purse names an actor this bundle does not contain");
    if (gesehen.has(figur)) fail(path, "two purses for one actor are two truths");
    gesehen.add(figur);
    // Der Betrag kommt als `bigint` — im Paket eine Zeichenkette aus Ziffern.
    if (!/^\d+$/.test(String(row.betrag))) fail(`${path}.betrag`, "a purse holds a whole, non-negative amount");
  }
  if (tables.geldbestand.length && !tables.geld_einheit.length)
    fail("tables.geld_einheit", "amounts without a named currency are meaningless");
}
