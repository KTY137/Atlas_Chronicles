// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { gueltigeKartenSicht } from "@chronicle/protocol";
import { fail, object } from "../campaign-v3-json.ts";
import type { CampaignTablesV22 } from "./schema.ts";

/**
 * Was eine wiederhergestellte Kartenlage beweisen muss — dieselben Aussagen, die in der Datenbank
 * Fremdschlüssel und Domäne halten, weil ein von Hand gebautes Paket an beiden vorbeigeht:
 *
 *  1. Die Karte gehört dieser Kampagne und zeigt auf einen Teilnehmer, den das Paket enthält.
 *  2. Die Sichteinstellung hat die Form, die der Server liest. Eine unlesbare würde beim Lesen
 *     als „alles verborgen" gezeigt; das Paket soll sie gar nicht erst hereintragen.
 *  3. Wer am Zug ist, liegt auf dem Feld. Eine verdeckte Karte am Zug wäre ein Zug, den die
 *     Runde nicht sehen darf, auf einer Bühne, die niemand weiterschieben kann.
 */
export function validateKampfkartenTables(t: CampaignTablesV22, campaignId: string): void {
  const teilnehmer = new Map(t.kampf_teilnehmer.map(row => [String(object(row, "tables.kampf_teilnehmer").id), row]));
  for (const [index, value] of t.kampf_karten.entries()) {
    const path = `tables.kampf_karten[${index}]`, row = object(value, path);
    if (row.campaign_id !== campaignId) fail(path, "card belongs to another campaign");
    const teil = teilnehmer.get(String(row.teilnehmer_id));
    if (!teil || teil.campaign_id !== campaignId) fail(`${path}.teilnehmer_id`, "card names a combatant this bundle does not contain");
    if (!teil) continue;
    if (!gueltigeKartenSicht(row.sicht)) fail(`${path}.sicht`, "card visibility settings are not readable");
    if (teil.am_zug === true && row.lage !== "feld") fail(`${path}.lage`, "a combatant at turn lies on the field");
  }
}
