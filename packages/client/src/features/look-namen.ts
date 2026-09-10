// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
/**
 * Die Looks, wie sie in der Oberflaeche heissen.
 *
 * Im Datenmodell traegt jeder Look eine feste englische Kennung (`Fantasy`, `PixelArt`,
 * `Parchment`, …). Die steht in gespeicherten Dateien und darf sich nie aendern. Am Tisch
 * sitzt aber eine Spielleitung, kein Entwickler: „PixelArt" und „Parchment" sagen ihr nichts,
 * und eine Liste roher Kennungen ist genau der Fachjargon, den die Oberflaeche nicht zeigen
 * soll. Deshalb zwei Tabellen — ein Alltagsname und ein Satz, der das SICHTBARE Ergebnis
 * beschreibt, nicht den Mechanismus.
 *
 * Die Namen enden auf `_LABEL`, weil `tools/gate-sprache.mjs` genau diese Endung als
 * Anzeigetabelle erkennt: der Aufruf `t(LOOK_LABEL[id])` gilt damit als Fundstelle fuer
 * jeden Wert der Tabelle, und das Sprachgate verlangt fuer jeden einen Katalogeintrag.
 */
import { THEME_PRESET_IDS, getThemePreset, type ThemePresetId } from "@chronicle/theme";

export const LOOK_LABEL: Record<ThemePresetId, string> = {
  Fantasy: "Lagerfeuer",
  Midnight: "Mitternacht",
  Aurora: "Polarlicht",
  Astral: "Sternkarte",
  Cyberpunk: "Neonstadt",
  Verdant: "Waldlicht",
  Ember: "Glutkern",
  Brass: "Messing",
  PixelArt: "Pixelbild",
  Medieval: "Handschrift",
  Parchment: "Tageslicht",
  Dawn: "Morgenrot",
};

/** Ein Satz je Look. Er beschreibt, was man sieht — keine Tokennamen, keine Zahlen. */
export const LOOK_ERKLAERUNG_LABEL: Record<ThemePresetId, string> = {
  Fantasy: "Dunkler Grund, warmes Bernstein. So sieht die App aus, wenn niemand etwas umstellt.",
  Midnight: "Dunkles Graublau, nichts leuchtet. Angenehm, wenn ihr lange am Stück spielt.",
  Aurora: "Tiefes Nachtblau mit Türkis. Kühl, aber freundlich.",
  Astral: "Nachtviolett mit Silber, wie eine alte Himmelskarte.",
  Cyberpunk: "Fast schwarz mit grellem Türkis und harten, abgeschrägten Ecken.",
  Verdant: "Dunkles Grün mit Gold und weich gerundeten Ecken.",
  Ember: "Dunkles Braun mit Kupfer, Rahmen wirken wie in Metall geätzt.",
  Brass: "Sepia und gebürstetes Messing, an Kästen ist oben eine Kante abgeschnitten.",
  PixelArt: "Keine Rundungen, harte Farben, Schrift wie an einem alten Bildschirm.",
  Medieval: "Heller Pergamentton mit brauner Tinte und doppelt gezogenem Rahmen.",
  Parchment: "Heller, fast weißer Arbeitsplatz mit Tintenblau. Gut bei Tageslicht.",
  Dawn: "Heller warmer Ton mit Rosé. Weich und freundlich.",
};

/** Relative Helligkeit nach WCAG — dieselbe Formel wie im Theme-Paket, hier nur, um in der
 * Auswahl „Hell" oder „Dunkel" danebenschreiben zu können. */
function helligkeit(hex: string): number {
  const kanal = (offset: number) => {
    const wert = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return wert <= 0.04045 ? wert / 12.92 : ((wert + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * kanal(1) + 0.7152 * kanal(3) + 0.0722 * kanal(5);
}

export interface LookVorschau {
  readonly id: ThemePresetId;
  readonly hell: boolean;
  /** Die vier Farben, die eine Kachel zeigt: Fläche, Karte, Akzent, Schrift. */
  readonly proben: readonly string[];
  readonly grund: string;
  readonly schrift: string;
  readonly rand: string;
  readonly radius: number;
}

/** Einmal berechnet: die Presets sind eingefroren, die Vorschau ändert sich nie. */
export const LOOK_VORSCHAU: readonly LookVorschau[] = THEME_PRESET_IDS.map(id => {
  const { colors, geometry } = getThemePreset(id);
  return {
    id, hell: helligkeit(colors.bg) > 0.18,
    proben: [colors.bg, colors.surface, colors.accent, colors.text],
    grund: colors.surface, schrift: colors.text, rand: colors["line-strong"], radius: geometry.radius,
  };
});
