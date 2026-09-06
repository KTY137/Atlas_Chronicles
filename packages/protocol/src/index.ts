import { Type, type Static } from "@sinclair/typebox";
export * from "./gameplay.ts";
export * from "./realtime.ts";

const closed = { additionalProperties: false } as const;
export const Id = Type.String({ minLength: 1, maxLength: 256 });
export const DisplayName = Type.String({ minLength: 1, maxLength: 240 });
export const Mark = Type.Union([
  Type.Object({ art: Type.Literal("em") }, closed), Type.Object({ art: Type.Literal("strong") }, closed),
  Type.Object({ art: Type.Literal("code") }, closed),
  Type.Object({ art: Type.Literal("link"), zielSlug: Type.String({ maxLength: 200 }), zielEntryId: Type.Optional(Id) }, closed),
]);
export const Inline = Type.Object({ text: Type.String({ maxLength: 64_000 }), marks: Type.Array(Mark, { maxItems: 16 }) }, closed);
const inlines = Type.Array(Inline, { maxItems: 2000 });
export const Block = Type.Union([
  Type.Object({ kind: Type.Literal("absatz"), inhalt: inlines }, closed),
  Type.Object({ kind: Type.Literal("zitat"), inhalt: inlines }, closed),
  Type.Object({ kind: Type.Literal("bildunterschrift"), assetId: Id, inhalt: inlines }, closed),
  Type.Object({ kind: Type.Literal("liste"), geordnet: Type.Boolean(), punkte: Type.Array(inlines, { maxItems: 1000 }) }, closed),
  Type.Object({ kind: Type.Literal("feld"), schluessel: Id, label: Type.String({ maxLength: 200 }), gruppe: Type.Optional(Type.String({ maxLength: 200 })),
    werte: Type.Array(inlines, { maxItems: 1000 }), mehrwertig: Type.Boolean(), klauselKandidat: Type.Boolean() }, closed),
  Type.Object({ kind: Type.Literal("rohblock"), quelltext: Type.String({ maxLength: 128_000 }),
    grund: Type.Union([Type.Literal("wikitabelle"), Type.Literal("unbekannte-vorlage"), Type.Literal("generator-prosa"), Type.Literal("sonstiges")]) }, closed),
]);
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
