// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { Type } from "@sinclair/typebox";
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
  // A figure. Everything past `assetId`/`inhalt` is optional so that a document written before
  // images were imported still validates — the schema grew, it was not redefined.
  Type.Object({ kind: Type.Literal("bildunterschrift"), assetId: Id, inhalt: inlines,
    dateiname: Type.Optional(Type.String({ maxLength: 512 })), alt: Type.Optional(Type.String({ maxLength: 2000 })),
    ausrichtung: Type.Optional(Type.Union([Type.Literal("links"), Type.Literal("rechts"), Type.Literal("zentriert"), Type.Literal("ohne")])),
    breite: Type.Optional(Type.Integer({ minimum: 1, maximum: 20_000 })), ausInfobox: Type.Optional(Type.Boolean()) }, closed),
  Type.Object({ kind: Type.Literal("liste"), geordnet: Type.Boolean(), punkte: Type.Array(inlines, { maxItems: 1000 }) }, closed),
  Type.Object({ kind: Type.Literal("feld"), schluessel: Id, label: Type.String({ maxLength: 200 }), gruppe: Type.Optional(Type.String({ maxLength: 200 })),
    werte: Type.Array(inlines, { maxItems: 1000 }), mehrwertig: Type.Boolean(), klauselKandidat: Type.Boolean() }, closed),
  Type.Object({ kind: Type.Literal("rohblock"), quelltext: Type.String({ maxLength: 128_000 }),
    grund: Type.Union([Type.Literal("wikitabelle"), Type.Literal("unbekannte-vorlage"), Type.Literal("generator-prosa"), Type.Literal("sonstiges")]) }, closed),
]);
