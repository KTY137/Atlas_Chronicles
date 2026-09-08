// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { Type, type Static } from "@sinclair/typebox";

const closed = { additionalProperties: false } as const;
const id = Type.String({ minLength: 1, maxLength: 128 });
export const MapKindSchema = Type.Union([Type.Literal("atlas"), Type.Literal("tactical")]);
export type MapKind = Static<typeof MapKindSchema>;
export interface MapReference { kind: MapKind; id: string }
export interface MapVersionPin extends MapReference { name: string; version: number }
export interface MapDeletionEntrance {
  parentKind: MapKind; parentMapId: string; parentName: string;
  knotenId: string; parentVersion: number;
}
export interface MapDeletionPlan { sceneId: string; name: string; version: number; mapId: string }
export interface MapDeletionBlocker { sessionId: string; sceneId: string; name: string; mapId: string }
export interface MapDeletionPreview {
  root: MapVersionPin;
  /** Complete, stably sorted subtree. Every member must be explicitly confirmed. */
  maps: MapVersionPin[];
  incoming: MapDeletionEntrance | null;
  affectedPlans: MapDeletionPlan[];
  blockers: MapDeletionBlocker[];
  confirmationHash: string;
}
export const MapDeleteSchema = Type.Object({
  commandId: id,
  expectedVersion: Type.Integer({ minimum: 1, maximum: 2_147_483_647 }),
  confirmationHash: Type.String({ pattern: "^[a-f0-9]{64}$" }),
  /** Values are exactly `${kind}:${id}` from the displayed preview. */
  confirmedMapIds: Type.Array(Type.String({ minLength: 3, maxLength: 260 }), { minItems: 1, maxItems: 10000, uniqueItems: true }),
}, closed);
export type MapDeleteInput = Static<typeof MapDeleteSchema>;
export interface MapDeletionAck {
  commandId: string;
  root: MapReference;
  /** The versions after retirement; retained geometry revisions are unchanged. */
  deletedMaps: MapVersionPin[];
  parent: MapVersionPin | null;
  affectedSceneIds: string[];
  deletedAt: number;
}
export type MapDeletionErrorCode = "map-in-use" | "deletion-preview-changed" | "map-deleted" | "conflict";
export interface MapDeletionFailure {
  error: string;
  code: MapDeletionErrorCode;
  blockers?: MapDeletionBlocker[];
}
