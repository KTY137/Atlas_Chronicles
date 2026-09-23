// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import type { BauwerkTyp, KartenSetting } from "@chronicle/szene";
import type { Polygon, Punkt } from "../polygon.ts";
import type { Zufall } from "./gemeinsam.ts";
import type { Fleck } from "./viertel/flecken.ts";
import type { Bau, FleckBau, ParzellenAuftrag } from "./viertel/parzellen.ts";
import type { FleckLage, Rolle } from "./viertel/rollen.ts";
import type { Breiten } from "./viertel/wege.ts";

/**
 * **Ein Stadtstil.** Die Viertelpipeline (`viertel/index.ts`) baut jede Siedlung gleich: Flecken,
 * Kantengraph, Rollen, Straßen, Bebauung, Budget, Flur, Wasser, Dokument. Was eine Fantasy-Stadt
 * von einer heutigen Stadt oder einer Kolonie unterscheidet, sagt der Stil (Spec
 * 2026-09-23-stadt-zukunft, E4): wie die Flecken liegen, wie die Stadt sich schützt, wie ein
 * Fleck bebaut wird, welche Gebäude, Namen und Dächer es gibt.
 */
export type CartographyDachform = "giebel" | "flach" | "halle" | "kuppel" | "plattform";
export type Typliste = readonly (readonly [BauwerkTyp, number])[];
export type Art = "weiler" | "dorf" | "stadt";
/** Stein: Mauer mit Türmen (Fantasy). Zaun: Mauerlinie ohne Türme um die ganze Stadt (Sci-Fi).
 *  Ring: die Außenkanten des Kerns werden Hauptstraße (Gegenwart). */
export type Befestigung = "stein" | "zaun" | "ring";
export type Richtung = "Nord" | "Ost" | "Süd" | "West";
export interface FleckenAuftrag { readonly art: Art; readonly bauwerke: number; readonly mitte: Punkt; readonly rahmen: Polygon; readonly breite: number; readonly hoehe: number; readonly r: Zufall }
export interface SonderAuftrag {
  readonly art: Art; readonly markt: number; readonly marktMitte: Punkt; readonly torPunkte: readonly Punkt[];
  readonly flussNah: boolean;
  /** Das nächste freie Haus an `ziel` bekommt den Typ. */
  readonly setze: (ziel: Punkt, typ: BauwerkTyp) => void;
  /** Das freie Haus einer dieser Rollen, das dem Fluss am nächsten ist (unter 1,2 Zellen). */
  readonly amFluss: (typ: BauwerkTyp, rollen: readonly (Rolle | "weiler")[] | "alle") => void;
  readonly hatTyp: (typ: BauwerkTyp) => boolean;
}
export type StilBau = FleckBau & { readonly mauern?: readonly { readonly a: Punkt; readonly b: Punkt; readonly pfad: string }[] };
export interface StadtStil {
  readonly setting: KartenSetting;
  flecken(a: FleckenAuftrag): { readonly alle: readonly Fleck[]; readonly innenZiel: number };
  readonly befestigung: Befestigung;
  /** Anteil der Stadtflecken im Kern (nur mit Befestigung). */
  readonly kernAnteil: number;
  /** Wie viel ein Vorstadtfleck zur Losgröße beiträgt (Fantasy: nur an Ausfallstraßen bebaut). */
  readonly vorstadtAnteil: number;
  breiten(art: Art): Breiten;
  /** Nach der automatischen Rollenwahl, vor der Bebauung. */
  nachRollen?(lagen: readonly FleckLage[], rollen: Map<number, Rolle>, art: Art, planHat: (rolle: Rolle) => boolean): void;
  bebaue(a: ParzellenAuftrag): StilBau;
  readonly typen: Readonly<Record<Rolle | "weiler", Typliste>>;
  hoefe(art: Art): number;
  streifen(flaeche: number): number;
  sonderbauten(a: SonderAuftrag): void;
  titel(typ: BauwerkTyp, b: Bau, i: number, r: Zufall): string;
  dach(typ: BauwerkTyp): CartographyDachform | undefined;
  readonly namen: Readonly<Record<Rolle, readonly string[]>>;
  vorstadt(richtung: Richtung): string;
  readonly dorfplatz: string;
  /** Wie der Rollenschritt die Nutzung „burg" in Meldungen nennt. */
  readonly burgWort: string;
  readonly texte: { readonly zuKlein: string };
}

export const waehleTyp = (liste: Typliste, zug: number): BauwerkTyp => {
  let x = zug * liste.reduce((s, [, w]) => s + w, 0);
  for (const [typ, w] of liste) { if (x < w) return typ; x -= w; }
  return liste.at(-1)![0];
};
