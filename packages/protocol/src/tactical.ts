// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { Type, type Static } from "@sinclair/typebox";
import { BAUWERK_TYPEN, type CartographyLabelV1, type CartographyMood, type Rahmen, type TacticalCartographyV1, type TacticalLight, type TacticalGrid, type TacticalMapDocumentV1, type TacticalPoint, type TacticalPortal, type TacticalWall } from "@chronicle/szene";

const closed = { additionalProperties: false } as const;
const id = Type.String({ minLength: 1, maxLength: 128, pattern: "^.+$" });
const geometryId = Type.String({ minLength: 1, maxLength: 256, pattern: "^[^\\u0000-\\u001f\\u007f]+$" });
const coordinate = Type.Number({ minimum: -1e9, maximum: 1e9 });
const version = Type.Integer({ minimum: 1, maximum: 2_147_483_647 });
const expected = Type.Integer({ minimum: 0, maximum: 2_147_483_647 });
const nullableId = Type.Union([id, Type.Null()]);
export const TacticalAnchorSchema = Type.Object({ targetKind: Type.Union([Type.Literal("stamp"), Type.Literal("region"), Type.Literal("place")]), targetId: geometryId, entryId: id, passageId: nullableId }, closed);
const pose = { x: coordinate, y: coordinate, elevation: coordinate, rotation: coordinate, scale: Type.Number({ exclusiveMinimum: 0, maximum: 1e6 }) };
export const TacticalTokenPlanSchema = Type.Object({ id, actorId: id, ...pose }, closed);
export const TacticalImportSchema = Type.Object({ commandId: id, name: Type.String({ minLength: 1, maxLength: 160, pattern: "\\S" }),
  format: Type.Union([Type.Literal("uvtt"), Type.Literal("native")]), sourceText: Type.String({ minLength: 1, maxLength: 64 * 1024 * 1024 }),
  provenance: Type.Unknown(), imageBase64: Type.Optional(Type.Union([Type.String({ maxLength: 64 * 1024 * 1024 }), Type.Null()])),
  anchors: Type.Optional(Type.Array(TacticalAnchorSchema, { maxItems: 72048 })),
}, closed);
export const TacticalRevisionV1Schema = Type.Object({ commandId: id, expectedVersion: version, document: Type.Unknown(), anchors: Type.Array(TacticalAnchorSchema, { maxItems: 72048 }) }, closed);
export const TacticalBuildingIntentSchema = Type.Object({ regionId: geometryId, titel: Type.String({ minLength: 1, maxLength: 160, pattern: "\\S" }), typ: Type.Union(BAUWERK_TYPEN.map(value => Type.Literal(value))) }, closed);
export const TacticalRevisionV2Schema = Type.Object({ ...TacticalRevisionV1Schema.properties, schemaVersion: Type.Literal(2), cartography: Type.Unknown(), addedBuildings: Type.Array(TacticalBuildingIntentSchema, { maxItems: 2048 }) }, closed);
export const TacticalRoomIntentSchema = Type.Object({ regionId: geometryId, titel: Type.String({ minLength: 1, maxLength: 160, pattern: "\\S" }) }, closed);
export const TacticalRevisionV3Schema = Type.Object({ ...TacticalRevisionV2Schema.properties, schemaVersion: Type.Literal(3), addedRooms: Type.Array(TacticalRoomIntentSchema, { maxItems: 2048 }) }, closed);
export const TacticalRevisionSchema = Type.Union([TacticalRevisionV1Schema, TacticalRevisionV2Schema, TacticalRevisionV3Schema]);
export const TacticalPlanSchema = Type.Object({ commandId: id, expectedVersion: expected, mapId: id, mapRevision: version, tokens: Type.Array(TacticalTokenPlanSchema, { maxItems: 1000 }) }, closed);
export const TacticalMoveSchema = Type.Object({ commandId: id, expectedVersion: version, ...pose }, closed);
export const TacticalPortalSchema = Type.Object({ commandId: id, expectedVersion: version, closed: Type.Boolean() }, closed);
export const TacticalUndoSchema = Type.Object({ commandId: id, targetCommandId: id, expectedVersion: version }, closed);
export type TacticalAnchor = Static<typeof TacticalAnchorSchema>;
export type TacticalTokenPlan = Static<typeof TacticalTokenPlanSchema>;
export type TacticalImportInput = Static<typeof TacticalImportSchema>;
export type TacticalRevisionInput = Static<typeof TacticalRevisionSchema>;
export type TacticalPlanInput = Static<typeof TacticalPlanSchema>;
export type TacticalMoveInput = Static<typeof TacticalMoveSchema>;
export type TacticalPortalInput = Static<typeof TacticalPortalSchema>;
export type TacticalUndoInput = Static<typeof TacticalUndoSchema>;
export interface TacticalAck { subjectId: string; version: number }
export interface TacticalMapSummary { id: string; name: string; revision: number; version: number }
export interface TacticalMapCard extends TacticalMapSummary { sourceId: string; contentHash: string; document: TacticalMapDocumentV1; anchors: TacticalAnchor[];
  cartography?: TacticalCartographyV1; cartographyHash?: string; compositionHash?: string; rasterDigest?: string;
  /** Inferred editor baseline only; opening this card never persists an upgrade. */
  legacyCartography?: TacticalCartographyV1;
}
export interface TacticalPlan { sceneId: string; mapId: string; mapRevision: number; version: number; tokens: TacticalTokenPlan[]; unavailable?: "map-deleted" }
export interface TacticalToken extends TacticalTokenPlan { name: string; canMove: boolean; version: number | null }
/** A knowledge-authorized semantic marker, without its private source geometry or asset. */
export interface TacticalEntity { id: string; kind: "stamp" | "place"; x: number; y: number; entryId: string; label: string }
export interface TacticalUndoTarget { commandId: string; subjectKind: "token" | "portal"; subjectId: string; version: number }
export interface TacticalView {
  sessionId: string; sceneId: string; active: boolean; gm: boolean;
  size: readonly [number, number]; frame: Rahmen; grid: TacticalGrid; elevation: number;
  regions: { id: string; points: readonly TacticalPoint[] }[];
  entities: TacticalEntity[]; tokens: TacticalToken[]; undoTargets: TacticalUndoTarget[]; digest: string; rasterDigest: string;
  /** Background or authoritative vector cartography can produce masked raster tiles. */
  hatRaster: boolean;
  /** Free names of the map. A player receives only those whose anchor lies in a known region. */
  labels?: readonly CartographyLabelV1[];
  /** The map's lights inside known regions: a player sees the lamp in the room they know. */
  lights?: readonly TacticalLight[];
  /** The tiles show a painted map: names go in ink and furniture casts its shadow, as on the GM's sheet. */
  gemalt?: boolean;
  /** The map's mood, already in the tiles; the renderer needs it for the lights and names. */
  mood?: CartographyMood;
  /** These properties are completely absent from player responses. */
  map?: TacticalMapSummary; document?: TacticalMapDocumentV1; cartography?: TacticalCartographyV1; compositionHash?: string;
  walls?: readonly TacticalWall[]; portals?: (TacticalPortal & { version: number })[];
}
