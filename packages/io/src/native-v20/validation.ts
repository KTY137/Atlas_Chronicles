// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { parseMapFloorStack, parseRoomFog, parseTacticalMapDocument, validateFloorMaps, type TacticalMapDocumentV1 } from "@chronicle/szene";
import { fail, hash, keys, object, string } from "../campaign-v3-json.ts";
import type { CampaignTablesV20 } from "./schema.ts";

function require(value: unknown, message: string): asserts value { if (!value) fail("map-studio", message); }
const revisionKey = (mapId: unknown, revision: unknown) => JSON.stringify([mapId, revision]);
const integer = (v: unknown, min = 1) => typeof v === "number" && Number.isSafeInteger(v) && v >= min && v <= 2147483647;
/** Additive v20 constraints; previous bundles still go through their frozen v1..v19 rules. */
export function validateMapStudioTables(t: CampaignTablesV20, campaignId: string): void {
  const users = new Set(t.users.map(r => r.id)), actors = new Set(t.actor_profiles.filter(r => r.campaign_id === campaignId).map(r => r.actor_id));
  const maps = new Map(t.tactical_maps.filter(r => r.campaign_id === campaignId).map(r => [String(r.id), r]));
  const revisions = new Map(t.tactical_map_revisions.filter(r => r.campaign_id === campaignId).map(r => [revisionKey(r.map_id, r.revision), parseTacticalMapDocument(r.document)]));
  const drawings = new Map(t.tactical_map_cartography.filter(r => r.campaign_id === campaignId).map(r => [revisionKey(r.map_id, r.map_revision), r.document as unknown as { regions: { regionId: string; role: string }[] }]));
  const roomIds = (mapId: unknown, revision: unknown, map: TacticalMapDocumentV1) => {
    const roles = drawings.get(revisionKey(mapId, revision));
    return new Set(map.geometry.regions.filter(r => !roles || roles.regions.some(role => role.regionId === r.id && ["room", "generic"].includes(role.role))).map(r => r.id));
  };
  const members = new Set<string>();
  for (const row of t.map_floor_stacks) {
    require(row.campaign_id === campaignId && users.has(row.created_by) && users.has(row.updated_by), "floor campaign/author missing");
    require(BigInt(String(row.updated_at)) >= BigInt(String(row.created_at)), "floor update precedes creation");
    const stack = parseMapFloorStack(row.document); require(stack.rootMapId === row.root_map_id, "floor root mismatch");
    const documents = new Map<string, TacticalMapDocumentV1>();
    for (const floor of stack.floors) {
      const map = maps.get(floor.mapId); require(map && !members.has(floor.mapId), "floor map absent or belongs to more than one stack");
      members.add(floor.mapId);
      const doc = revisions.get(revisionKey(floor.mapId, map.head_revision)); require(doc, "floor head revision absent"); documents.set(floor.mapId, doc);
    }
    validateFloorMaps(stack, documents);
    for (const link of stack.links) for (const [mapId, regionId] of [[link.fromMapId, link.fromRegionId], [link.toMapId, link.toRegionId]])
      require(roomIds(mapId, maps.get(mapId!)!.head_revision, documents.get(mapId!)!).has(regionId!), "floor link must name rooms");
  }
  for (const row of t.map_room_fog) {
    require(row.campaign_id === campaignId && users.has(row.updated_by), "fog campaign/author missing");
    const document = revisions.get(revisionKey(row.map_id, row.map_revision)); require(document, "fog map revision absent");
    const fog = parseRoomFog(row.document), valid = roomIds(row.map_id, row.map_revision, document);
    require(fog.party.every(id => valid.has(id)), "fog room missing");
    for (const actor of fog.actors) require(actors.has(actor.actorId) && [...actor.revealed, ...actor.hidden].every(id => valid.has(id)), "fog actor/room missing");
  }
  const commandKeys: Record<string, readonly string[]> = {
    "floor.add": ["commandId", "expectedVersion", "expectedMapVersion", "name", "level", "fromRegionId", "linkKind", "copyContents"],
    "floor.link": ["commandId", "expectedVersion", "name", "kind", "toMapId", "fromRegionId", "toRegionId", "position"],
    "floor.unlink": ["commandId", "expectedVersion", "linkId"],
    "floor.rename": ["commandId", "expectedVersion", "name"],
    "floor.detach": ["commandId", "expectedVersion"],
    "fog.set": ["commandId", "expectedVersion", "mapRevision", "action", "audience", "regionIds"],
  };
  for (const row of t.map_studio_commands) {
    require(row.campaign_id === campaignId && users.has(row.actor_user_id) && maps.has(String(row.scope_id)), "command campaign/actor/scope missing");
    const input = object(row.request, "studio.request"), ack = object(row.ack, "studio.ack"), operation = String(row.operation);
    keys(input, commandKeys[operation]!, "studio.request"); keys(ack, ["version", "mapId"], "studio.ack");
    require(input.commandId === row.command_id && integer(input.expectedVersion, 0) && integer(ack.version) && ack.version === Number(input.expectedVersion) + 1 && maps.has(String(ack.mapId)), "command identity/version/target mismatch");
    require(hash({ userId: row.actor_user_id, campaignId, mapId: row.scope_id, operation, input }) === row.request_hash, "command request hash mismatch");
    if (Object.hasOwn(input, "name")) require(!!string(input.name, "studio.name", 160).trim(), "empty floor name");
    if (operation === "floor.add") {
      require(integer(input.expectedMapVersion) && Number.isSafeInteger(input.level) && Number(input.level) >= -8 && Number(input.level) <= 32 && ["stairs", "lift", "opening"].includes(String(input.linkKind)) && typeof input.copyContents === "boolean", "invalid floor add request");
      string(input.fromRegionId, "studio.room", 256);
    }
    if (operation === "floor.link") {
      require(maps.has(String(input.toMapId)) && ["stairs", "lift", "opening"].includes(String(input.kind)) && Array.isArray(input.position) && input.position.length === 2 && input.position.every(n => typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= 32768), "invalid floor link request");
      string(input.fromRegionId, "studio.room", 256); string(input.toRegionId, "studio.room", 256);
    }
    if (operation === "floor.unlink") string(input.linkId, "studio.link", 128);
    if (operation === "fog.set") {
      require(integer(input.mapRevision) && revisions.has(revisionKey(row.scope_id, input.mapRevision)), "fog command revision missing");
      const valid = roomIds(row.scope_id, input.mapRevision, revisions.get(revisionKey(row.scope_id, input.mapRevision))!);
      require(["reveal", "hide", "enable", "knowledge"].includes(String(input.action)) && (input.audience === null || actors.has(input.audience)), "invalid fog command action/audience");
      require(Array.isArray(input.regionIds) && input.regionIds.length <= 4096 && new Set(input.regionIds).size === input.regionIds.length && input.regionIds.every(id => typeof id === "string" && valid.has(id)), "invalid fog command rooms");
      require(["enable", "knowledge"].includes(String(input.action)) ? input.regionIds.length === 0 && input.audience === null : input.regionIds.length > 0, "fog action payload mismatch");
    }
  }
}
