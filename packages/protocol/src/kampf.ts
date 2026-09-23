// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { Type, type Static } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";

/**
 * Der Kampftisch auf dem Draht — Anfragen als Schema, Antworten als Typ.
 *
 * Zwei Antwortformen, und der Unterschied ist die Aussage: die Spielleitung bekommt die Wahrheit
 * samt ihren Einstellungen (`KampfFuerLeitung`), alle anderen bekommen, was die Spielleitung sie
 * sehen lässt (`KampfFuerRunde`). Die zweite Form hat KEINE Felder für Verborgenes — keine
 * Ordnungszahl, keine Sichteinstellung, kein „verdeckt“ —, damit ein vergessener Filter nicht still
 * etwas mitschickt (Grenze B9, `packages/core/src/nurleitung.ts`).
 */
export const KAMPF_SEITEN = ["gefaehrten", "gegner", "neutral"] as const;
export const KARTEN_LAGEN = ["hand", "feld", "umgelegt", "ablage"] as const;
export const BALKEN_MASKEN = ["genau", "fuellstand", "worte", "verborgen"] as const;
export type KampfSeite = typeof KAMPF_SEITEN[number];
export type KartenLage = typeof KARTEN_LAGEN[number];
export type BalkenMaske = typeof BALKEN_MASKEN[number];
export type Kampfzustand = "vorbereitet" | "laufend" | "beendet";
export type Wortstufe = "voll" | "gut" | "knapp" | "leer";
/** `leben` = Erschöpfung ist Niederlage (`depletion: "defeat"`), `vorrat` = jeder andere Balken. */
export type BalkenArt = "leben" | "vorrat";

const closed = { additionalProperties: false } as const;
const id = Type.String({ minLength: 1, maxLength: 128 });
const version = Type.Integer({ minimum: 0, maximum: 2_147_483_647 });
const initiative = Type.Integer({ minimum: -1_000_000, maximum: 1_000_000 });
const Maske = Type.Union([Type.Literal("genau"), Type.Literal("fuellstand"), Type.Literal("worte"), Type.Literal("verborgen")]);
const Lage = Type.Union([Type.Literal("hand"), Type.Literal("feld"), Type.Literal("umgelegt"), Type.Literal("ablage")]);
export const KampfSeiteSchema = Type.Union([Type.Literal("gefaehrten"), Type.Literal("gegner"), Type.Literal("neutral")]);
/** Eine neue Karte kommt aufs Feld oder verdeckt in die Hand — umgelegt oder abgelegt beginnt niemand. */
export const StartLageSchema = Type.Union([Type.Literal("hand"), Type.Literal("feld")]);
export const NameFuerRundeSchema = Type.Union([Type.String({ minLength: 1, maxLength: 160, pattern: "\\S" }), Type.Null()]);

/** Was die Runde von einer Karte sieht, Fassung 1. Balkenkennungen folgen der Feldregel der Regelpakete. */
export const KartenSicht = Type.Object({
  schema: Type.Literal(1),
  standard: Maske,
  balken: Type.Record(Type.String({ pattern: "^[a-z][a-z0-9_-]{0,95}$" }), Maske, { maxProperties: 8 }),
  zustaende: Type.Boolean(),
  bild: Type.Boolean(),
}, closed);
export type KartenSichtDaten = Static<typeof KartenSicht>;
export const gueltigeKartenSicht = (wert: unknown): wert is KartenSichtDaten => Value.Check(KartenSicht, wert);

export const KarteLageSetzen = Type.Object({ lage: Lage, expectedVersion: version }, closed);
export const KarteSichtSetzen = Type.Object({ sicht: KartenSicht, nameFuerRunde: NameFuerRundeSchema, expectedVersion: version }, closed);
export const KarteInitiativeSetzen = Type.Object({ initiative, initiativeRollId: Type.Union([id, Type.Null()]) }, closed);
/** `commandId` bleibt kürzer als eine Kennung: je Figur wird `:<nummer>` angehängt. */
export const KartenAusVorlage = Type.Object({
  commandId: Type.String({ minLength: 1, maxLength: 120 }), templateId: id, templateRevision: Type.Integer({ minimum: 1, maximum: 2_147_483_647 }),
  anzahl: Type.Integer({ minimum: 1, maximum: 12 }), name: Type.Optional(Type.String({ minLength: 1, maxLength: 150, pattern: "\\S" })),
  seite: KampfSeiteSchema, initiative, lage: StartLageSchema,
}, closed);
export const KampfBeenden = Type.Object({ archivieren: Type.Optional(Type.Boolean()) }, closed);
export const VitalSetzen = Type.Object({ wert: Type.Number({ minimum: -1_000_000_000, maximum: 1_000_000_000 }), expectedVersion: version }, closed);

/** Ein Balken, wie ihn ein Betrachter ohne Leitung bekommt. Ein verborgener Balken fehlt ganz. */
export type BalkenFuerRunde =
  | { readonly id: string; readonly label: string; readonly art: BalkenArt; readonly anzeige: "genau"; readonly wert: number; readonly hoechst: number }
  | { readonly id: string; readonly label: string; readonly art: BalkenArt; readonly anzeige: "fuellstand"; readonly zehntel: number }
  | { readonly id: string; readonly label: string; readonly art: BalkenArt; readonly anzeige: "worte"; readonly stufe: Wortstufe };
export interface BalkenFuerLeitung {
  readonly id: string; readonly label: string; readonly wert: number; readonly hoechst: number; readonly art: BalkenArt;
  readonly maske: BalkenMaske;
  /** Was die Runde von diesem Balken bekommt, von derselben Funktion erzeugt. `null` = nichts. */
  readonly fuerRunde: BalkenFuerRunde | null;
}
export interface KartenZustand { readonly id: string; readonly name: string }
export interface KartenBild { readonly version: number }

export interface KarteFuerLeitung {
  readonly id: string; readonly name: string; readonly nameFuerRunde: string | null; readonly seite: KampfSeite; readonly lage: KartenLage;
  readonly actorId: string | null; readonly initiative: number; readonly ordnung: number; readonly initiativeRollId: string | null;
  readonly gewuerfelt: boolean; readonly amZug: boolean; readonly sicht: KartenSichtDaten; readonly vomKampfAngelegt: boolean;
  /** Stand der Kartenzeile; 0 = noch keine Zeile (Voreinstellung). */
  readonly version: number;
  readonly bogenVersion: number | null; readonly balken: readonly BalkenFuerLeitung[]; readonly zustaende: readonly KartenZustand[];
  readonly bild: KartenBild | null;
  /** Ein Balken mit Niederlage-Folge ist leer oder der Bogen wartet auf die Niederlage. Nur ein Hinweis. */
  readonly aufgebraucht: boolean;
}
export interface KarteFuerRunde {
  readonly id: string; readonly name: string; readonly seite: KampfSeite; readonly lage: "feld" | "umgelegt";
  readonly initiative: number; readonly gewuerfelt: boolean; readonly amZug: boolean;
  /** Der Betrachter führt diese Figur. Nur dann tragen die beiden folgenden Felder etwas. */
  readonly eigene: boolean; readonly actorId?: string; readonly bogenVersion?: number;
  readonly balken: readonly BalkenFuerRunde[]; readonly zustaende: readonly KartenZustand[]; readonly bild: KartenBild | null;
}
export interface KampfKopf {
  readonly id: string; readonly name: string; readonly zustand: Kampfzustand; readonly runde: number;
  readonly erstelltAm: number; readonly beendetAm: number | null;
}
export interface KampfFuerLeitung extends KampfKopf { readonly leitung: true; readonly teilnehmer: readonly KarteFuerLeitung[] }
export interface KampfFuerRunde extends KampfKopf { readonly teilnehmer: readonly KarteFuerRunde[] }
export interface KampfAufraeumen { readonly archiviert: readonly string[]; readonly nichtArchiviert: readonly string[] }
