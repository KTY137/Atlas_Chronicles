// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { describe, expect, it } from "vitest";
import { DEFAULT_ACCESSIBILITY_PREFERENCES, ThemeValidationError, parseAccessibilityPreferences, recoverAccessibilityPreferences, resolveTheme, serializeAccessibilityPreferences, THEME_PRESETS } from "../src/index.ts";

/** Die V1-Fassung, wie sie heute im localStorage der Spieler liegt. */
const V1 = {
  schemaVersion: 1, contrast: "high", motion: "system", transparency: "system", art: "on", font: "reader",
  density: "comfortable", atmosphere: "crafted", lowPower: false, localSkin: null,
};

describe("Sprachfeld in den lokalen Darstellungseinstellungen", () => {
  it("liefert Deutsch als Vorgabe in Schemafassung 2", () => {
    expect(DEFAULT_ACCESSIBILITY_PREFERENCES.schemaVersion).toBe(2);
    expect(DEFAULT_ACCESSIBILITY_PREFERENCES.language).toBe("de");
  });

  it("nimmt Englisch an und behält es über Serialisierung", () => {
    const gewaehlt = { ...DEFAULT_ACCESSIBILITY_PREFERENCES, language: "en" };
    const datei = serializeAccessibilityPreferences(gewaehlt);
    expect(datei).toContain('"language":"en"');
    expect(parseAccessibilityPreferences(datei)).toEqual(gewaehlt);
  });

  it("migriert eine gespeicherte V1-Datei ausdrücklich auf Deutsch", () => {
    const migriert = parseAccessibilityPreferences(JSON.stringify(V1));
    expect(migriert.schemaVersion).toBe(2);
    expect(migriert.language).toBe("de");
    expect(migriert.contrast).toBe("high");
    expect(migriert.font).toBe("reader");
    expect(Object.isFrozen(migriert)).toBe(true);
    expect(recoverAccessibilityPreferences(JSON.stringify(V1)).recovered).toBe(false);
  });

  it("migriert nur vollständige V1-Zeilen, keine halben", () => {
    const { font: _font, ...unvollstaendig } = V1;
    expect(() => parseAccessibilityPreferences(unvollstaendig)).toThrow(ThemeValidationError);
    expect(() => parseAccessibilityPreferences({ ...V1, language: "en" })).toThrow(ThemeValidationError);
    expect(() => parseAccessibilityPreferences({ ...V1, css: "unsafe" })).toThrow(ThemeValidationError);
  });

  it("weist unbekannte Sprachen, fehlende Sprache und künftige Fassungen zurück", () => {
    const { language: _language, ...ohneSprache } = DEFAULT_ACCESSIBILITY_PREFERENCES;
    for (const eingabe of [
      { ...DEFAULT_ACCESSIBILITY_PREFERENCES, language: "fr" },
      { ...DEFAULT_ACCESSIBILITY_PREFERENCES, language: "de-DE" },
      { ...DEFAULT_ACCESSIBILITY_PREFERENCES, language: null },
      ohneSprache,
      { ...DEFAULT_ACCESSIBILITY_PREFERENCES, schemaVersion: 3 },
    ]) {
      expect(() => parseAccessibilityPreferences(eingabe)).toThrow(ThemeValidationError);
      expect(recoverAccessibilityPreferences(eingabe)).toEqual({ preferences: DEFAULT_ACCESSIBILITY_PREFERENCES, recovered: true });
    }
  });

  it("lässt die aufgelöste Darstellung von der Sprache unberührt", () => {
    const deutsch = resolveTheme(THEME_PRESETS.Fantasy, DEFAULT_ACCESSIBILITY_PREFERENCES);
    const englisch = resolveTheme(THEME_PRESETS.Fantasy, { ...DEFAULT_ACCESSIBILITY_PREFERENCES, language: "en" });
    expect(englisch).toEqual(deutsch);
  });
});
