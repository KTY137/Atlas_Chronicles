// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { Type, type Static } from "@sinclair/typebox";
import type { ThemeManifestV1, ThemeAccessibilityReportV1 } from "@chronicle/theme";

const closed = { additionalProperties: false } as const;
const id = Type.String({ minLength: 1, maxLength: 128, pattern: "^[^\\u0000-\\u001f\\u007f]+$" });
const expected = Type.Integer({ minimum: 0, maximum: 2_147_483_647 });
const version = Type.Integer({ minimum: 1, maximum: 2_147_483_647 });
const slug = Type.String({ minLength: 1, maxLength: 200, pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$" });
const text = (maxLength: number) => Type.String({ maxLength, pattern: "^[^\\u0000-\\u0008\\u000b\\u000c\\u000e-\\u001f\\u007f]*$" });
const warnings = Type.Array(text(240), { maxItems: 32, uniqueItems: true });
const ids = Type.Array(id, { maxItems: 1000, uniqueItems: true });
export const ThemePinSchema = Type.Object({ themeId: id, revision: version }, closed);
// The framework-free, bounded ThemeManifestV1 parser owns this nested closed schema.
export const ThemeCreateSchema = Type.Object({ commandId: id, manifest: Type.Unknown() }, closed);
export const ThemeReviseSchema = Type.Object({ commandId: id, expectedVersion: version, manifest: Type.Unknown() }, closed);
export const ThemePreviewSchema = Type.Object({ manifest: Type.Unknown() }, closed);
export const ThemePinUpdateSchema = Type.Object({ commandId: id, expectedVersion: expected, themeId: id, revision: version }, closed);
export const PublicationConfigureSchema = Type.Object({ commandId: id, expectedVersion: expected, enabled: Type.Boolean(),
  worldSlug: slug, title: Type.String({ minLength: 1, maxLength: 200, pattern: "\\S" }), description: text(2000),
  locale: Type.Union([Type.Literal("de"), Type.Literal("en")]), contentWarnings: warnings,
  theme: Type.Union([ThemePinSchema, Type.Null()]),
}, closed);
const publish = { expectedArticleRevisionId: id, expectedPublicationVersion: expected, expectedPolicyVersion: version,
  passageIds: Type.Array(id, { minItems: 1, maxItems: 1000, uniqueItems: true }), publicSlug: slug, contentWarnings: warnings, mintIds: ids };
export const EntryPublishSchema = Type.Object({ commandId: id, ...publish }, closed);
export const EntryPublishPreviewSchema = Type.Object(publish, closed);
export const EntryUnpublishSchema = Type.Object({ commandId: id, expectedArticleRevisionId: id, expectedPublicationVersion: version, expectedPolicyVersion: version }, closed);
const routeKind = Type.Union([Type.Literal("world"), Type.Literal("article"), Type.Literal("legacy")]);
export const PublicationRouteAddSchema = Type.Object({ commandId: id, expectedPolicyVersion: version, kind: routeKind,
  route: Type.String({ minLength: 1, maxLength: 2048 }), entryId: Type.Union([id, Type.Null()]), sourceUrl: Type.Union([text(2048), Type.Null()]),
}, closed);
export const PublicationRouteRemoveSchema = Type.Object({ commandId: id, expectedPolicyVersion: version, kind: routeKind, route: Type.String({ minLength: 1, maxLength: 2048 }) }, closed);
export const AUTHORING_OPERATIONS = ["theme.create", "theme.revise", "theme.pin", "publication.configure", "entry.publish", "entry.unpublish", "route.add", "route.remove"] as const;
export type AuthoringOperation = typeof AUTHORING_OPERATIONS[number];
export type ThemeCreateInput = Static<typeof ThemeCreateSchema>;
export type ThemeReviseInput = Static<typeof ThemeReviseSchema>;
export type ThemePinUpdateInput = Static<typeof ThemePinUpdateSchema>;
export type PublicationConfigureInput = Static<typeof PublicationConfigureSchema>;
export type EntryPublishInput = Static<typeof EntryPublishSchema>;
export type EntryPublishPreviewInput = Static<typeof EntryPublishPreviewSchema>;
export type EntryUnpublishInput = Static<typeof EntryUnpublishSchema>;
export type PublicationRouteAddInput = Static<typeof PublicationRouteAddSchema>;
export type PublicationRouteRemoveInput = Static<typeof PublicationRouteRemoveSchema>;
export interface AuthoringAck { subjectId: string; version: number }
export interface ThemeReport extends ThemeAccessibilityReportV1 { manifestHash: string }
export interface ThemeCard { id: string; revision: number; version: number; manifest: ThemeManifestV1; contentHash: string; accessibilityReport: ThemeReport }
export interface ThemePin { themeId: string; revision: number; version: number }
export interface PublicationPolicy { publicKey: string; enabled: boolean; worldSlug: string; title: string; description: string; locale: "de" | "en"; contentWarnings: string[]; theme: { themeId: string; revision: number } | null; version: number }
export interface PublicAttribution { sourceUrl: string; license: string; authors: string[]; anonymousContributions: number }
export const PUBLIC_MINT_KINDS = ["wurf", "gesprochen", "ratifikation", "berichtigung", "vollmacht"] as const;
export type PublicMintKind = typeof PUBLIC_MINT_KINDS[number];
export interface PublicationMetadata { contentWarnings: string[]; attributions: PublicAttribution[]; mints: { mintId: string; passageId: string; date: string; kind: PublicMintKind }[] }
export interface EntryPublication { entryId: string; enabled: boolean; revisionId: string; passageIds: string[]; publicSlug: string; metadata: PublicationMetadata; version: number }
export interface PublicationRoute { kind: "world" | "article" | "legacy"; route: string; entryId: string | null; sourceUrl: string | null }
/** Public ids are article slugs/ordinal anchors, never canonical passage/entry ids. */
export type PublicMark = { art: "em" | "strong" | "code" } | { art: "link"; href: string | null };
export interface PublicInline { text: string; marks: PublicMark[] }
export type PublicBlock =
  | { kind: "absatz" | "zitat" | "bildunterschrift"; inhalt: PublicInline[] }
  | { kind: "feld"; schluessel: string; label: string; gruppe: string | null; werte: PublicInline[][]; mehrwertig: boolean }
  | { kind: "liste"; geordnet: boolean; punkte: PublicInline[][] }
  | { kind: "rohblock"; quelltext: string };
export interface PublicPassage { ordinal: number; path: readonly string[]; content: PublicBlock }
export interface PublicEntry { slug: string; title: string; passages: PublicPassage[]; contentWarnings: string[]; attributions: PublicAttribution[]; mints: { ordinal: number; date: string; kind: PublicMintKind }[] }
export interface PublicWorld { publicKey: string; slug: string; title: string; description: string; locale: "de" | "en"; contentWarnings: string[]; theme: ThemeManifestV1; entries: PublicEntry[] }
