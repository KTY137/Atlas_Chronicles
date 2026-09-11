// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { Type, type Static } from "@sinclair/typebox";
import type { MapFloorStack, RoomFog, TacticalPoint } from "@chronicle/szene";
const closed = { additionalProperties: false } as const;
const id = Type.String({ minLength: 1, maxLength: 128, pattern: "^[^\\u0000-\\u001f\\u007f]+$" });
const regionId = Type.String({ minLength: 1, maxLength: 256, pattern: "^[^\\u0000-\\u001f\\u007f]+$" });
const name = Type.String({ minLength: 1, maxLength: 160, pattern: "\\S" });
const version = Type.Integer({ minimum: 1, maximum: 2147483647 });
const expected = Type.Integer({ minimum: 0, maximum: 2147483647 });
const linkKind = Type.Union([Type.Literal("stairs"), Type.Literal("lift"), Type.Literal("opening")]);
const point = Type.Tuple([Type.Number({ minimum: 0, maximum: 32768 }), Type.Number({ minimum: 0, maximum: 32768 })]);
export const MapFloorAddSchema = Type.Object({ commandId: id, expectedVersion: expected, expectedMapVersion: version,
  name, level: Type.Integer({ minimum: -8, maximum: 32 }), fromRegionId: regionId, linkKind, copyContents: Type.Boolean() }, closed);
export const MapFloorLinkSchema = Type.Object({ commandId: id, expectedVersion: version, name, kind: linkKind,
  toMapId: id, fromRegionId: regionId, toRegionId: regionId, position: point }, closed);
export const MapFloorUnlinkSchema = Type.Object({ commandId: id, expectedVersion: version, linkId: id }, closed);
export const MapFloorDetachSchema = Type.Object({ commandId: id, expectedVersion: version }, closed);
export const MapFloorRenameSchema = Type.Object({ commandId: id, expectedVersion: version, name }, closed);
export const RoomFogSetSchema = Type.Object({ commandId: id, expectedVersion: expected, mapRevision: version,
  action: Type.Union([Type.Literal("reveal"), Type.Literal("hide"), Type.Literal("enable"), Type.Literal("knowledge")]),
  audience: Type.Union([id, Type.Null()]), regionIds: Type.Array(regionId, { maxItems: 4096, uniqueItems: true }) }, closed);
export type MapFloorAddInput = Static<typeof MapFloorAddSchema>;
export type MapFloorLinkInput = Static<typeof MapFloorLinkSchema>;
export type MapFloorUnlinkInput = Static<typeof MapFloorUnlinkSchema>;
export type MapFloorDetachInput = Static<typeof MapFloorDetachSchema>;
export type MapFloorRenameInput = Static<typeof MapFloorRenameSchema>;
export type RoomFogSetInput = Static<typeof RoomFogSetSchema>;
export interface MapFloorView { version: number; stack: MapFloorStack; unavailable: readonly string[] }
export interface MapStudioAck { version: number; mapId: string }
export interface RoomFogView {
  version: number; mapId: string; mapRevision: number; state: RoomFog;
  rooms: readonly { id: string; name: string; points: readonly TacticalPoint[] }[];
  actors: readonly { actorId: string; name: string }[];
}
