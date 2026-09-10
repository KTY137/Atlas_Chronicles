// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
/**
 * Die Werkstattbegriffe, wie sie in der Oberflaeche heissen.
 *
 * Im Datenmodell traegt jede Farbe einen Tokennamen (`accent-ink`, `surface-2`,
 * `control-line`), jede Schrift eine Kennung (`cinzel`, `plex`), jedes Tempo eine
 * (`snappy`, `stepped`). Diese Namen gehoeren in die gespeicherte Datei und duerfen sich nie
 * aendern — aber sie erklaeren niemandem, was er einstellt. Die Werkstatt zeigte sie bis
 * zum 10. September 2026 roh an: 34 Farbfelder waren mit ihren Tokennamen beschriftet.
 *
 * Hier steht fuer jeden dieser Namen ein Alltagswort und ein Satz, der das SICHTBARE Ergebnis
 * beschreibt. Nicht die Rolle im Code, sondern die Stelle im Bild: „Der Ring, der zeigt, wo du
 * gerade mit der Tabulatortaste stehst."
 *
 * Alle Tabellen enden auf `_LABEL`, weil `tools/gate-sprache.mjs` genau diese Endung als
 * Anzeigetabelle erkennt: `t(FARBROLLE_LABEL[token])` gilt damit als Fundstelle fuer jeden
 * Wert, und das Sprachgate verlangt fuer jeden einen Katalogeintrag.
 */
import type { ThemeColorToken, ThemeFontId, ThemeMotionId } from "@chronicle/theme";

/** Der Name, der ueber dem Farbfeld steht. */
export const FARBROLLE_LABEL: Record<ThemeColorToken, string> = {
  bg: "Seitengrund",
  "bg-deep": "Tiefer Grund",
  surface: "Kartenfläche",
  "surface-2": "Zweite Fläche",
  "surface-hover": "Fläche beim Überfahren",
  "input-bg": "Eingabefeld",
  line: "Trennlinie",
  "line-strong": "Kräftige Linie",
  "control-line": "Rahmen von Bedienelementen",
  text: "Fließtext",
  "text-muted": "Zurückgenommener Text",
  "text-faint": "Blasser Text",
  accent: "Leitfarbe",
  "accent-strong": "Leitfarbe kräftig",
  "accent-ink": "Schrift auf der Leitfarbe",
  "accent-soft": "Leitfarbe zart",
  link: "Verweis",
  "link-visited": "Besuchter Verweis",
  focus: "Fokusrahmen",
  ok: "Gelungen",
  "ok-soft": "Gelungen zart",
  danger: "Gefahr",
  "danger-soft": "Gefahr zart",
  warning: "Warnung",
  "warning-soft": "Warnung zart",
  info: "Hinweis",
  "info-soft": "Hinweis zart",
  private: "Nur für dich",
  "private-soft": "Nur für dich zart",
  selection: "Markierter Text",
  "selection-ink": "Schrift auf der Markierung",
  disabled: "Gesperrter Text",
  "disabled-bg": "Gesperrte Fläche",
  overlay: "Abdunklung",
};

/** Ein Satz je Farbe: wo im Bild sieht man sie? */
export const FARBROLLE_ERKLAERUNG_LABEL: Record<ThemeColorToken, string> = {
  bg: "Die Farbe der ganzen Seite, hinter allem anderen.",
  "bg-deep": "Noch etwas tiefer als der Seitengrund — für Randbereiche und eingelassene Kästen.",
  surface: "Tafeln, Karten und Leisten, die auf der Seite liegen.",
  "surface-2": "Felder, die auf einer Tafel noch einmal abgesetzt sind.",
  "surface-hover": "Wie eine Fläche aussieht, sobald der Mauszeiger darüber steht.",
  "input-bg": "Der Grund in Textfeldern und Auswahllisten.",
  line: "Die feinen Linien zwischen Abschnitten.",
  "line-strong": "Deutlichere Rahmen um Tafeln und Kästen.",
  "control-line": "Der Rand von Knöpfen, Feldern und Auswahllisten.",
  text: "Die normale Schriftfarbe für alles, was man liest.",
  "text-muted": "Nebensächliches: Datumsangaben, Hilfssätze, Feldbeschriftungen.",
  "text-faint": "Das Leiseste, was noch lesbar sein muss.",
  accent: "Die eine Farbe, die das Aussehen trägt: wichtigste Knöpfe, Verweise, Markierungen.",
  "accent-strong": "Die Leitfarbe, sobald der Zeiger auf dem Knopf steht.",
  "accent-ink": "Die Schrift, die auf einem Knopf in Leitfarbe steht.",
  "accent-soft": "Ein zarter Hauch der Leitfarbe als Fläche hinter Ausgewähltem.",
  link: "Ein anklickbarer Verweis mitten im Text.",
  "link-visited": "Ein Verweis, den du schon geöffnet hast.",
  focus: "Der Ring, der zeigt, wo du gerade mit der Tabulatortaste stehst.",
  ok: "Meldungen, die sagen: hat geklappt.",
  "ok-soft": "Die Fläche hinter einer solchen Meldung.",
  danger: "Fehler — und alles, was etwas endgültig löscht.",
  "danger-soft": "Die Fläche hinter einer Fehlermeldung.",
  warning: "Hinweise, die zum Nachdenken auffordern, aber nichts kaputt machen.",
  "warning-soft": "Die Fläche hinter einem solchen Hinweis.",
  info: "Neutrale Erklärungen und Zusatzangaben.",
  "info-soft": "Die Fläche hinter einer Erklärung.",
  private: "Kennzeichnet, was nur deine Figur oder nur die Spielleitung sieht.",
  "private-soft": "Die Fläche hinter einer solchen Kennzeichnung.",
  selection: "Der Balken hinter Text, den du mit der Maus markierst.",
  "selection-ink": "Die Schrift innerhalb einer Markierung.",
  disabled: "Die Schrift auf einem Knopf, den man gerade nicht drücken kann.",
  "disabled-bg": "Die Fläche eines solchen Knopfs.",
  overlay: "Dunkelt den Hintergrund ab, wenn ein Fenster darüber liegt.",
};

/** Die Überschriften der sechs Farbgruppen. */
export const FARBGRUPPE_LABEL = {
  flaechen: "Flächen",
  linien: "Linien und Rahmen",
  schrift: "Schrift",
  leitfarbe: "Leitfarbe und Verweise",
  meldungen: "Meldungen",
  rest: "Auswahl, Gesperrtes, Abdunklung",
} as const;

/** Welche Farbe in welcher Gruppe steht. Die Reihenfolge ist die Anzeigereihenfolge. */
export const FARBGRUPPEN: readonly { readonly gruppe: keyof typeof FARBGRUPPE_LABEL; readonly token: readonly ThemeColorToken[] }[] = [
  { gruppe: "flaechen", token: ["bg", "bg-deep", "surface", "surface-2", "surface-hover", "input-bg"] },
  { gruppe: "linien", token: ["line", "line-strong", "control-line"] },
  { gruppe: "schrift", token: ["text", "text-muted", "text-faint"] },
  { gruppe: "leitfarbe", token: ["accent", "accent-strong", "accent-ink", "accent-soft", "link", "link-visited", "focus"] },
  { gruppe: "meldungen", token: ["ok", "ok-soft", "danger", "danger-soft", "warning", "warning-soft", "info", "info-soft", "private", "private-soft"] },
  { gruppe: "rest", token: ["selection", "selection-ink", "disabled", "disabled-bg", "overlay"] },
];

export const SCHRIFT_LABEL: Record<ThemeFontId, string> = {
  cinzel: "Cinzel — verschnörkelte Antiqua",
  plex: "IBM Plex — klare Groteske",
  system: "Schrift meines Geräts",
  serif: "Georgia — klassische Buchschrift",
  mono: "Schreibmaschinenschrift",
};
export const SCHRIFT_ERKLAERUNG_LABEL: Record<ThemeFontId, string> = {
  cinzel: "Römische Großbuchstaben mit Serifen. Feierlich, gut für Titel, anstrengend für lange Absätze.",
  plex: "Sachlich und auch klein sehr gut lesbar. Die übliche Wahl für Lesetext.",
  system: "Die Schrift, die dein Gerät ohnehin benutzt. Lädt nichts nach und wirkt vertraut.",
  serif: "Ruhige Buchschrift mit Serifen. Angenehm bei langen Textstellen.",
  mono: "Jeder Buchstabe gleich breit, wie auf einer Schreibmaschine. Gut für Zahlen.",
};

export const TEMPO_LABEL: Record<ThemeMotionId, string> = {
  snappy: "Schnell",
  measured: "Mittel",
  gentle: "Sanft",
  stepped: "Ruckartig",
  none: "Ohne Übergang",
};
export const TEMPO_ERKLAERUNG_LABEL: Record<ThemeMotionId, string> = {
  snappy: "Knöpfe und Tafeln reagieren fast sofort.",
  measured: "Ein spürbarer, ruhiger Übergang.",
  gentle: "Weiche, langsame Übergänge.",
  stepped: "Der Übergang springt in vier Stufen, statt weich zu gleiten. Passt zum Pixelbild.",
  none: "Alles erscheint sofort. Wer Bewegung nicht mag, kann das ohnehin für sich allein einstellen.",
};

export const KANTE_LABEL = {
  clean: "Glatt",
  etched: "Geprägt",
  cut: "Ecke abgeschnitten",
  pixel: "Treppenkante",
} as const;
export const KANTE_ERKLAERUNG_LABEL = {
  clean: "Gewöhnliche Rahmen, ringsum gleich.",
  etched: "Doppelt gezogene Linie, wie in Papier geprägt.",
  cut: "Oben ein kräftiger Strich, unten rechts eine gerade Ecke.",
  pixel: "Keine Rundungen, dazu ein harter versetzter Schatten.",
} as const;

export const SYMBOL_LABEL = {
  stroke: "Dünne Striche",
  rune: "Runenhaft eckig",
  facet: "Kräftig facettiert",
  pixel: "Pixelig",
} as const;

export const LIZENZ_LABEL = {
  "LicenseRef-Project": "Nur innerhalb dieses Projekts",
  "All-Rights-Reserved": "Alle Rechte bei mir — niemand darf sie weitergeben",
  "CC0-1.0": "Gemeinfrei — jeder darf alles damit machen",
  "CC-BY-4.0": "Weitergabe erlaubt, wenn ich genannt werde",
} as const;

/** Die Zahlenwerte der Form. Eine nackte 4 in einer Liste sagt nichts. */
export const ABSTAND_LABEL: Record<number, string> = { 4: "4 Punkt — eng", 6: "6 Punkt — mittel", 8: "8 Punkt — weit" };
export const RUNDUNG_LABEL: Record<number, string> = {
  0: "0 — scharfe Ecken", 4: "4 — leicht gerundet", 8: "8 — deutlich gerundet", 12: "12 — stark gerundet",
};
export const STRICH_LABEL: Record<number, string> = { 1: "Dünn — 1 Punkt", 2: "Kräftig — 2 Punkte" };

/** Die Überschriften und Hilfssätze der Formgruppe. */
export const FORM_LABEL = {
  spacing: "Grundabstand",
  radius: "Ecken abrunden",
  border: "Dicke der Linien",
  edges: "Kantenform",
  icons: "Symbolform",
} as const;
