// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { fail, object } from "../campaign-v3-json.ts";
import type { CampaignTablesV8 } from "./schema.ts";

/**
 * Was ein wiederhergestellter Zugangsvorfall beweisen muss.
 *
 * Der Vorfall ist ein Beweis über eine Aussperrung, und ein Beweis, der auf eine Tür zeigt,
 * die es im selben Paket nicht gibt, ist kein Beweis. Deshalb prüft dieser Lauf drei Dinge,
 * die das JSON-Schema allein nicht ausdrücken kann:
 *
 *  1. **Genau eine Tür.** Zwei nullbare Spalten erlauben im Schema auch „beide" und „keine".
 *     Beides ist ein Vorfall ohne Aussage — die Datenbank hält das per CHECK, das Paket hält
 *     es hier, damit ein von Hand gebautes Paket nicht durchrutscht.
 *  2. **Die Tür existiert und gehört derselben Kampagne.** Sonst wäre der Vorfall eine
 *     Behauptung über eine fremde Welt.
 *  3. **Der Ausgesperrte ist Mitglied.** Ein Vorfall über jemanden, der nie am Tisch saß,
 *     verschiebt Gate W1s Nenner in die falsche Richtung.
 */
export function checkZugangTables(tables: CampaignTablesV8, campaignId: string): void {
  const dokumentTueren = new Set(tables.vollmachten.map(row => String(object(row, "tables.vollmachten").id)));
  const aktionsTueren = new Set(tables.action_vollmachten.map(row => String(object(row, "tables.action_vollmachten").id)));
  const mitglieder = new Set(tables.campaign_memberships.map(row => String(object(row, "tables.campaign_memberships").user_id)));

  for (const [index, value] of tables.zugangsvorfaelle.entries()) {
    const path = `tables.zugangsvorfaelle[${index}]`, row = object(value, path);
    if (row.campaign_id !== campaignId) fail(path, "access incident belongs to another campaign");

    const dokument = row.dokument_vollmacht_id, aktion = row.aktions_vollmacht_id;
    const genannt = [dokument, aktion].filter(item => item !== null && item !== undefined).length;
    if (genannt !== 1) fail(path, "an access incident names exactly one door, of exactly one kind");

    if (dokument !== null && dokument !== undefined && !dokumentTueren.has(String(dokument)))
      fail(`${path}.dokument_vollmacht_id`, "access incident points at a Vollmacht this bundle does not contain");
    if (aktion !== null && aktion !== undefined && !aktionsTueren.has(String(aktion)))
      fail(`${path}.aktions_vollmacht_id`, "access incident points at an action Vollmacht this bundle does not contain");

    if (!mitglieder.has(String(row.user_id)))
      fail(`${path}.user_id`, "access incident names someone who is not a member of this campaign");
  }
}
