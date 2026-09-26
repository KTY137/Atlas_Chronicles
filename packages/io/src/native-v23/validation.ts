// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { parseTacticalMapDocument, type TacticalMapDocumentV1 } from "@chronicle/szene";
import { fail, object } from "../campaign-v3-json.ts";
import type { CampaignTablesV23 } from "./schema.ts";

const revisionKey = (mapId: unknown, revision: unknown) => JSON.stringify([mapId, revision]);
const version = (value: unknown) => typeof value === "number" && Number.isSafeInteger(value) && value >= 1 && value <= 2147483647;

/**
 * Was ein wiederhergestelltes Geschoss beweisen muss — dieselben Aussagen, die in der Datenbank
 * Fremdschlüssel und Domäne halten, weil ein von Hand gebautes Paket an beiden vorbeigeht:
 *
 *  1. Die Zeile gehört dieser Kampagne und einer Szene, die das Paket enthält; ihr Autor auch.
 *  2. Das Geschoss ist eine Kartenfassung des Pakets. Spielt die Szene wieder auf ihrer ersten
 *     Karte, dann in deren festgehaltener Fassung und ohne eigene Türen: die stehen in der Szene.
 *  3. Die Türen eines anderen Geschosses sind genau die Türen seiner Karte, je einmal, sortiert,
 *     und mit gültiger Version. Dasselbe gilt für jedes geparkte Geschoss, das weder die erste
 *     noch die bespielte Karte ist.
 *  4. Die Antwort der letzten Anweisung hat die Form, die der Server wiederholt.
 */
export function validateSessionFloorTables(t: CampaignTablesV23, campaignId: string): void {
  const users = new Set(t.users.map(row => String(row.id)));
  const sessions = new Map(t.session_tactical_states.map(row => [String(row.session_id), row]));
  const documents = new Map<string, TacticalMapDocumentV1>();
  const document = (mapId: unknown, revision: unknown, path: string): TacticalMapDocumentV1 => {
    const key = revisionKey(mapId, revision), known = documents.get(key);
    if (known) return known;
    const row = t.tactical_map_revisions.find(candidate => candidate.map_id === mapId && candidate.revision === revision);
    if (!row || row.campaign_id !== campaignId) fail(path, "floor names a map revision this bundle does not contain");
    const parsed = parseTacticalMapDocument(row!.document); documents.set(key, parsed); return parsed;
  };
  const doors = (value: unknown, map: TacticalMapDocumentV1, path: string) => {
    if (!Array.isArray(value)) fail(path, "door states must be a list");
    const expected = [...map.portals.map(portal => portal.id)].sort(), list = value as unknown[];
    if (list.length !== expected.length) fail(path, "door states differ from the floor's doors");
    list.forEach((raw, index) => {
      const door = object(raw, `${path}[${index}]`);
      if (Object.keys(door).sort().join() !== "closed,id,version" || door.id !== expected[index] || typeof door.closed !== "boolean" || !version(door.version))
        fail(`${path}[${index}]`, "door state differs from the floor's doors");
    });
  };
  for (const [index, value] of t.session_floor_states.entries()) {
    const path = `tables.session_floor_states[${index}]`, row = object(value, path);
    if (row.campaign_id !== campaignId) fail(path, "floor belongs to another campaign");
    const session = sessions.get(String(row.session_id));
    if (!session || session.campaign_id !== campaignId) fail(`${path}.session_id`, "floor names a scene this bundle does not contain");
    if (!users.has(String(row.updated_by))) fail(`${path}.updated_by`, "floor author missing");
    const map = document(row.map_id, row.map_revision, `${path}.map_id`);
    if (row.map_id === session!.map_id) {
      if (row.map_revision !== session!.map_revision) fail(`${path}.map_revision`, "the first map keeps the revision the scene captured");
      if (!Array.isArray(row.portal_states) || row.portal_states.length) fail(`${path}.portal_states`, "the first map's doors stay with the scene");
    } else doors(row.portal_states, map, `${path}.portal_states`);
    const parked = object(row.parked, `${path}.parked`);
    for (const [mapId, raw] of Object.entries(parked)) {
      const entry = object(raw, `${path}.parked.${mapId}`);
      if (mapId === session!.map_id || mapId === row.map_id || Object.keys(entry).sort().join() !== "portals,revision")
        fail(`${path}.parked`, "a parked floor is neither the first nor the current map");
      doors(entry.portals, document(mapId, entry.revision, `${path}.parked.${mapId}`), `${path}.parked.${mapId}.portals`);
    }
    const ack = object(row.ack, `${path}.ack`);
    if (Object.keys(ack).sort().join() !== "subjectId,version" || typeof ack.subjectId !== "string" || !ack.subjectId || !version(ack.version))
      fail(`${path}.ack`, "floor acknowledgement is not readable");
  }
}
