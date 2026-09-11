// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { parseMapFloorStack, parseRoomFog, parseTacticalMapDocument, validateFloorMaps,
  MapFloorValidationError, type MapFloorStack, type RoomFog, type TacticalMapDocumentV1, type TacticalCartographyV1 } from "@chronicle/szene";
import type { Db } from "../db/index.ts";

export interface FloorStackRow { root_map_id: string; campaign_id: string; version: number; document: MapFloorStack }
export interface RoomFogRow { map_id: string; map_revision: number; campaign_id: string; version: number; document: RoomFog }
export async function floorStackFor(tx: Db, campaignId: string, mapId: string): Promise<FloorStackRow | null> {
  const rows = (await tx.query<FloorStackRow>("SELECT root_map_id,campaign_id,version,document FROM map_floor_stacks WHERE campaign_id=$1 AND document->'floors' @> $2::jsonb LIMIT 2", [campaignId, JSON.stringify([{ mapId }])])).rows;
  if (rows.length > 1) throw new MapFloorValidationError("Eine Karte darf nur einem Geschossverband angehören.");
  return rows[0] ? { ...rows[0], document: parseMapFloorStack(rows[0].document) } : null;
}
export async function roomFogFor(tx: Db, campaignId: string, mapId: string, revision: number): Promise<RoomFogRow | null> {
  const row = (await tx.query<RoomFogRow>("SELECT map_id,map_revision,campaign_id,version,document FROM map_room_fog WHERE campaign_id=$1 AND map_id=$2 AND map_revision=$3", [campaignId, mapId, revision])).rows[0];
  return row ? { ...row, document: parseRoomFog(row.document) } : null;
}
export function fogRoomIds(document: TacticalMapDocumentV1, cartography?: TacticalCartographyV1): Set<string> {
  const roles = cartography ? new Map(cartography.regions.map(r => [r.regionId, r.role])) : null;
  return new Set(document.geometry.regions.filter(r => !roles || roles.get(r.id) === "room" || roles.get(r.id) === "generic").map(r => r.id));
}
/** Shared by editing and stack commands, under the caller's campaign lock. */
export async function validateStoredFloorMaps(tx: Db, campaignId: string, stack: MapFloorStack,
  replacement?: { mapId: string; document: TacticalMapDocumentV1; cartography?: TacticalCartographyV1 }): Promise<void> {
  const rows = (await tx.query<{ map_id: string; document: unknown; cartography: TacticalCartographyV1 | null }>(`SELECT r.map_id,r.document,c.document AS cartography FROM tactical_maps m
    JOIN tactical_map_revisions r ON r.map_id=m.id AND r.revision=m.head_revision
    LEFT JOIN tactical_map_cartography c ON c.map_id=r.map_id AND c.map_revision=r.revision
    WHERE m.campaign_id=$1 AND m.id=ANY($2::text[])`, [campaignId, stack.floors.map(f => f.mapId)])).rows;
  const maps = new Map(rows.map(r => [r.map_id, parseTacticalMapDocument(r.document)]));
  if (replacement) maps.set(replacement.mapId, replacement.document);
  validateFloorMaps(stack, maps);
  for (const link of stack.links) for (const [mapId, regionId] of [[link.fromMapId, link.fromRegionId], [link.toMapId, link.toRegionId]] as const) {
    const drawing = replacement?.mapId === mapId ? replacement.cartography : rows.find(r => r.map_id === mapId)?.cartography ?? undefined;
    if (!fogRoomIds(maps.get(mapId)!, drawing).has(regionId)) throw new MapFloorValidationError("Ein Geschossübergang benötigt auf beiden Seiten einen Raum.");
  }
}
export async function validateFloorRevision(tx: Db, campaignId: string, mapId: string, document: TacticalMapDocumentV1, cartography?: TacticalCartographyV1): Promise<void> {
  const stack = await floorStackFor(tx, campaignId, mapId);
  if (stack) await validateStoredFloorMaps(tx, campaignId, stack.document, { mapId, document, ...(cartography ? { cartography } : {}) });
}
