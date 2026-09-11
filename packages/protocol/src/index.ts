// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { Type, type Static } from "@sinclair/typebox";
import { Id, Block, DisplayName } from "./document-schema.ts";
export * from "./gameplay.ts";
export * from "./realtime.ts";
export * from "./actors.ts";

const closed = { additionalProperties: false } as const;
export * from "./document-schema.ts";
export const PassageDraft = Type.Object({ pid: Type.Optional(Id), inhalt: Block,
  pfad: Type.Optional(Type.Array(Type.String({ maxLength: 200 }), { maxItems: 24 })),
  tags: Type.Optional(Type.Array(Type.String({ minLength: 1, maxLength: 80 }), { maxItems: 64 })) }, closed);
export const SaveDocument = Type.Object({ title: Type.String({ minLength: 1, maxLength: 200 }), slug: Type.Optional(Type.String({ minLength: 1, maxLength: 200 })),
  passages: Type.Array(PassageDraft, { maxItems: 1000 }), expectedVersion: Type.Optional(Type.Integer({ minimum: 1 })) }, closed);
export const CreateCampaign = Type.Object({ name: Type.String({ minLength: 1, maxLength: 160 }) }, closed);
export const NameBody = Type.Object({ displayName: DisplayName }, closed);
export const ClaimJoin = Type.Object({ pollToken: Type.String({ minLength: 32, maxLength: 128 }) }, closed);
export const InviteBody = Type.Object({ ttlMs: Type.Optional(Type.Integer({ minimum: 60_000, maximum: 604800_000 })) }, closed);
export const Reveal = Type.Object({ passageId: Id, actorId: Id }, closed);
export const PairBody = Type.Object({ userId: Id }, closed);
export const PairRedeem = Type.Object({ code: Type.String({ minLength: 32, maxLength: 128 }) }, closed);
export const WebAuthnFinish = Type.Object({ challengeId: Id, response: Type.Record(Type.String(), Type.Unknown()), label: Type.Optional(Type.String({ maxLength: 80 })) }, closed);
export const Empty = Type.Object({}, closed);
export const NotFound = Type.Object({ error: Type.Literal("Nicht verfügbar") }, closed);
export type SaveDocumentBody = Static<typeof SaveDocument>;
export type CreateCampaignBody = Static<typeof CreateCampaign>;
export type NameBodyType = Static<typeof NameBody>;
export type RevealBody = Static<typeof Reveal>;

// Closed transport commands. Identity comes exclusively from the authenticated connection.
export const Command = Type.Object({ commandId: Id, campaignId: Id,
  payload: Type.Union([
    Type.Object({ kind: Type.Literal("reveal"), passageId: Id, actorId: Id }, closed),
    Type.Object({ kind: Type.Literal("presence"), state: Type.Union([Type.Literal("online"), Type.Literal("away")]) }, closed),
  ]) }, closed);
export type CommandBody = Static<typeof Command>;
export * from "./tactical.ts";
export * from "./map-lifecycle.ts";
export * from "./authoring.ts";
export * from "./chronist.ts";
export * from "./figurantrag.ts";
export * from "./map-studio.ts";
