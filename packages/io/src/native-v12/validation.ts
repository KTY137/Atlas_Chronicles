// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { fail, object } from "../campaign-v3-json.ts";
import type { CampaignTablesV12 } from "./schema.ts";

/**
 * Was eine wiederhergestellte Erleichterung beweisen muss.
 *
 * Die Datenbank hält diese Aussagen über Fremdschlüssel, CHECKs und ein partielles eindeutiges
 * Register. Ein von Hand gebautes Paket geht an der Datenbank vorbei — deshalb hält das Paket
 * sie hier noch einmal:
 *
 *  1. **Alles gehört derselben Kampagne**, und Figur, Gewährende und der einlösende Wurf sind im
 *     Paket enthalten. Ein Zugeständnis, das auf einen Wurf zeigt, den niemand nachschlagen kann,
 *     verspricht einen Beleg, den es nicht gibt.
 *  2. **Einlösung ist ein Ereignis mit Beleg und Zeitpunkt** — beides oder keines. Und was
 *     eingelöst wurde, ist nicht auch widerrufen.
 *  3. **Höchstens eine offene Erleichterung je Figur und gemeinter Probe.** Zwei gleichzeitig
 *     wären ein Stapel, und ein Stapel wäre der Dauerbonus, den das Regelwerk ausdrücklich nicht
 *     hat.
 *  4. **Ein Grund steht immer da.** Eine Erleichterung ohne Begründung ist eine Zahl ohne
 *     Absprache — und genau die soll sie ersetzen.
 */
export function checkErleichterungenTables(tables: CampaignTablesV12, campaignId: string): void {
  const figuren = new Set(tables.actors.map(row => String(object(row, "tables.actors").id)));
  const nutzer = new Set(tables.users.map(row => String(object(row, "tables.users").id)));
  const wuerfe = new Set(tables.action_rolls.map(row => String(object(row, "tables.action_rolls").id)));
  const offen = new Set<string>();

  for (const [index, value] of tables.erleichterungen.entries()) {
    const path = `tables.erleichterungen[${index}]`, row = object(value, path);
    if (row.campaign_id !== campaignId) fail(path, "concession belongs to another campaign");
    if (!figuren.has(String(row.actor_id))) fail(`${path}.actor_id`, "concession names an actor this bundle does not contain");
    if (!nutzer.has(String(row.gewaehrt_von))) fail(`${path}.gewaehrt_von`, "concession names a granter this bundle does not contain");
    if (typeof row.grund !== "string" || !/\S/.test(row.grund)) fail(`${path}.grund`, "a concession without a reason is a number without an agreement");

    const eingeloest = row.eingeloest_roll_id !== null && row.eingeloest_roll_id !== undefined;
    const zeitpunkt = row.eingeloest_am !== null && row.eingeloest_am !== undefined;
    if (eingeloest !== zeitpunkt) fail(path, "redemption needs both its roll and its time, or neither");
    if (eingeloest && !wuerfe.has(String(row.eingeloest_roll_id)))
      fail(`${path}.eingeloest_roll_id`, "concession names a roll this bundle does not contain");
    if (zeitpunkt && row.widerrufen_am !== null && row.widerrufen_am !== undefined)
      fail(path, "a redeemed concession cannot also be withdrawn");

    if (!zeitpunkt && (row.widerrufen_am === null || row.widerrufen_am === undefined)) {
      const platz = `${String(row.actor_id)} ${String(row.gemeinte_aktion)}`;
      if (offen.has(platz)) fail(path, "two open concessions for one actor and check");
      offen.add(platz);
    }
  }
}
