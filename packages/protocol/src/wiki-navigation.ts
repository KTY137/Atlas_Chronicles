// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { Type, type Static } from "@sinclair/typebox";
import { Id } from "./document-schema.ts";

const closed = { additionalProperties: false } as const;
export const NavigationEntryArt = Type.Union([
  Type.Literal("charakter"), Type.Literal("organisation"), Type.Literal("spezies"), Type.Literal("gegenstand"),
  Type.Literal("ereignis"), Type.Literal("ort"), Type.Literal("regelseite"), Type.Literal("sonstiges"),
]);
export const NavigationDestination = Type.Union([
  Type.Object({ kind: Type.Literal("category"), id: Id }, closed),
  Type.Object({ kind: Type.Literal("art"), art: NavigationEntryArt }, closed),
]);
export const MoveNavigationEntry = Type.Object({
  fromCategoryId: Type.Union([Id, Type.Null()]),
  destination: NavigationDestination,
  expectedCategoryIds: Type.Array(Id, { maxItems: 1000, uniqueItems: true }),
  expectedArt: NavigationEntryArt,
}, closed);
export type MoveNavigationEntryBody = Static<typeof MoveNavigationEntry>;
export type NavigationDestinationValue = Static<typeof NavigationDestination>;
