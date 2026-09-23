// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { KAMPF_SEITEN, type BalkenFuerLeitung, type BalkenFuerRunde, type BalkenMaske, type KampfFuerLeitung, type KampfFuerRunde, type KampfSeite,
  type KarteFuerLeitung, type KarteFuerRunde, type KartenBild, type KartenLage, type KartenSichtDaten, type KartenZustand, type Wortstufe } from "@chronicle/protocol";
import type { ActionCard } from "./game-api";

/**
 * Die Ansichtslogik des Kampftischs — rein und ohne Übersetzung, damit sie prüfbar bleibt.
 *
 * Sie rechnet nichts nach, was der Server liefert: welche Stufe ein Balken hat und was die Runde
 * sieht, steht in der Nutzlast. Hier wird nur geordnet, beschriftet und in eine gemeinsame Form
 * gebracht, damit eine Karte der Spielleitung und eine Karte der Runde gleich gezeichnet werden.
 *
 * Die Tabellen enden auf `_LABEL`: `tools/gate-sprache.mjs` erkennt genau diese Endung als
 * Anzeigetabelle und verlangt für jeden Wert einen Katalogeintrag.
 */
export type Kampf = KampfFuerLeitung | KampfFuerRunde;
export const istLeitungssicht = (kampf: Kampf): kampf is KampfFuerLeitung => "leitung" in kampf;

export interface BalkenAnsicht { readonly anzeige: BalkenFuerRunde; readonly leitung: BalkenFuerLeitung | null }
export interface KartenAnsicht {
  readonly id: string; readonly name: string; readonly nameFuerRunde: string | null; readonly seite: KampfSeite; readonly lage: KartenLage;
  readonly initiative: number; readonly gewuerfelt: boolean; readonly amZug: boolean; readonly eigene: boolean;
  readonly bild: KartenBild | null; readonly zustaende: readonly KartenZustand[]; readonly balken: readonly BalkenAnsicht[];
  readonly aufgebraucht: boolean;
  /** Wo ein Wert geändert werden darf: die Figur und der Stand ihres Bogens. */
  readonly bearbeitbar: { readonly actorId: string; readonly bogenVersion: number } | null;
  /** Nur in der Sicht der Spielleitung: die Karte, auf die sich ihre Befehle beziehen. */
  readonly roh: KarteFuerLeitung | null;
  /** Nur die Spielleitung erfährt, dass eine Karte gar keinen Bogen hat — für die Runde sähe das aus wie „alles verborgen“. */
  readonly ohneWerte: boolean;
}

export function ansichtFuerLeitung(k: KarteFuerLeitung): KartenAnsicht {
  return {
    id: k.id, name: k.name, nameFuerRunde: k.nameFuerRunde, seite: k.seite, lage: k.lage, initiative: k.initiative, gewuerfelt: k.gewuerfelt,
    amZug: k.amZug, eigene: false, bild: k.bild, zustaende: k.zustaende,
    balken: k.balken.map(b => ({ anzeige: { id: b.id, label: b.label, art: b.art, anzeige: "genau", wert: b.wert, hoechst: b.hoechst }, leitung: b })),
    aufgebraucht: k.aufgebraucht,
    bearbeitbar: k.actorId !== null && k.bogenVersion !== null ? { actorId: k.actorId, bogenVersion: k.bogenVersion } : null,
    roh: k, ohneWerte: k.actorId === null,
  };
}
export function ansichtFuerRunde(k: KarteFuerRunde): KartenAnsicht {
  return {
    id: k.id, name: k.name, nameFuerRunde: null, seite: k.seite, lage: k.lage, initiative: k.initiative, gewuerfelt: k.gewuerfelt,
    amZug: k.amZug, eigene: k.eigene, bild: k.bild, zustaende: k.zustaende, balken: k.balken.map(anzeige => ({ anzeige, leitung: null })),
    aufgebraucht: false,
    bearbeitbar: k.eigene && k.actorId !== undefined && k.bogenVersion !== undefined ? { actorId: k.actorId, bogenVersion: k.bogenVersion } : null,
    roh: null, ohneWerte: false,
  };
}

/** Gegner oben, Dazwischen in der Mitte, Gefährten unten — wie ein Kartenspiel auf dem Tisch. */
const TISCHORDNUNG: readonly KampfSeite[] = ["gegner", "neutral", "gefaehrten"];
export function reihen(karten: readonly KartenAnsicht[]): { readonly seite: KampfSeite; readonly karten: readonly KartenAnsicht[] }[] {
  return TISCHORDNUNG.map(seite => ({ seite, karten: karten.filter(k => k.seite === seite && (k.lage === "feld" || k.lage === "umgelegt")) }))
    .filter(reihe => reihe.karten.length > 0);
}

export const SEITEN = KAMPF_SEITEN;
export const SEITE_LABEL: Readonly<Record<KampfSeite, string>> = { gegner: "Gegner", neutral: "Dazwischen", gefaehrten: "Gefährten" };
export const MASKE_LABEL: Readonly<Record<BalkenMaske, string>> = { genau: "Genau", fuellstand: "Nur Füllstand", worte: "In Worten", verborgen: "Verborgen" };
export const MASKE_ERKLAERUNG_LABEL: Readonly<Record<BalkenMaske, string>> = {
  genau: "Zahl und Balken, zum Beispiel 37 / 100.",
  fuellstand: "Der Balken grob in Zehnteln, ohne Zahl.",
  worte: "Ein Wort wie „angeschlagen“ oder „fast leer“.",
  verborgen: "Die Runde sieht diesen Balken gar nicht.",
};
export const WORT_LEBEN_LABEL: Readonly<Record<Wortstufe, string>> = { voll: "unversehrt", gut: "angeschlagen", knapp: "schwer angeschlagen", leer: "am Boden" };
export const WORT_VORRAT_LABEL: Readonly<Record<Wortstufe, string>> = { voll: "voll", gut: "gut gefüllt", knapp: "fast leer", leer: "leer" };

export type LageWeg = "feld>hand" | "feld>umgelegt" | "feld>ablage" | "umgelegt>feld" | "umgelegt>hand" | "umgelegt>ablage" | "hand>feld" | "hand>ablage" | "ablage>feld" | "ablage>hand";
export const LAGE_WEGE: Readonly<Record<KartenLage, readonly LageWeg[]>> = {
  feld: ["feld>hand", "feld>umgelegt", "feld>ablage"],
  umgelegt: ["umgelegt>feld", "umgelegt>hand", "umgelegt>ablage"],
  hand: ["hand>feld", "hand>ablage"],
  ablage: ["ablage>feld", "ablage>hand"],
};
export const LAGE_WEG_LABEL: Readonly<Record<LageWeg, string>> = {
  "feld>hand": "In die Hand (verdecken)", "feld>umgelegt": "Umlegen", "feld>ablage": "Vom Feld nehmen",
  "umgelegt>feld": "Aufstehen lassen", "umgelegt>hand": "In die Hand (verdecken)", "umgelegt>ablage": "Vom Feld nehmen",
  "hand>feld": "Aufs Feld (ausspielen)", "hand>ablage": "In die Ablage",
  "ablage>feld": "Aufs Feld", "ablage>hand": "In die Hand",
};
export const zielDes = (weg: LageWeg): KartenLage => weg.slice(weg.indexOf(">") + 1) as KartenLage;

export const AUFNAHMEN = ["vorlage", "figur", "name"] as const;
export type Aufnahme = typeof AUFNAHMEN[number];
export const AUFNAHME_LABEL: Readonly<Record<Aufnahme, string>> = { vorlage: "Aus Vorlage", figur: "Figur am Tisch", name: "Nur Name" };

/** Leben ist rot; jeder andere Balken bekommt reihum eine eigene Farbe des Looks. */
export type BalkenFarbe = "danger" | "info" | "ok" | "warning" | "private";
const VORRAT_FARBEN: readonly BalkenFarbe[] = ["info", "ok", "warning", "private"];
export const balkenFarbe = (b: BalkenAnsicht, stelle: number): BalkenFarbe =>
  b.anzeige.art === "leben" ? "danger" : VORRAT_FARBEN[stelle % VORRAT_FARBEN.length]!;

export const initialen = (name: string): string =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map(wort => wort[0]!.toLocaleUpperCase()).join("");

/** Ausdrücklich der jüngste — die Reihenfolge der Liste verspricht niemand. */
export function juengsterInitiativwurf(wuerfe: readonly ActionCard[], actorId: string | null): ActionCard | null {
  if (!actorId) return null;
  return [...wuerfe].filter(karte => karte.actorId === actorId && karte.receipt.action?.id === "initiative")
    .sort((a, b) => b.preparedAt - a.preparedAt)[0] ?? null;
}

/** Was eine Karte auslösen kann. Der Kampftisch führt es aus; die Karte kennt keinen Weg zum Server. */
export interface KartenAktionen {
  lage(karte: KarteFuerLeitung, lage: KartenLage): void;
  sicht(karte: KarteFuerLeitung, sicht: KartenSichtDaten, nameFuerRunde: string | null): void;
  maske(karte: KarteFuerLeitung, vital: string, maske: BalkenMaske): void;
  initiative(karte: KarteFuerLeitung, initiative: number, initiativeRollId: string | null): void;
  loeschen(karte: KarteFuerLeitung): void;
  wert(actorId: string, vital: string, wert: number, bogenVersion: number): void;
  inventar?: (actorId: string) => void;
}
