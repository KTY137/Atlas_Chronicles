// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { describe, expect, it } from "vitest";
import { BANNER_IDS, DEFAULT_ACCESSIBILITY_PREFERENCES, ThemeValidationError, parseAccessibilityPreferences, recoverAccessibilityPreferences, resolveTheme, serializeAccessibilityPreferences, THEME_PRESETS } from "../src/index.ts";

/** Die V1-Fassung, wie sie heute im localStorage der Spieler liegt. */
const V1 = {
  schemaVersion: 1, contrast: "high", motion: "system", transparency: "system", art: "on", font: "reader",
  density: "comfortable", atmosphere: "crafted", lowPower: false, localSkin: null,
};

describe("Sprachfeld in den lokalen Darstellungseinstellungen", () => {
  it("liefert Deutsch als Vorgabe in Schemafassung 3", () => {
    expect(DEFAULT_ACCESSIBILITY_PREFERENCES.schemaVersion).toBe(3);
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
    expect(migriert.schemaVersion).toBe(3);
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
      { ...DEFAULT_ACCESSIBILITY_PREFERENCES, schemaVersion: 4 },
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

describe("Pixelart-Banner in lokalen Einstellungen", () => {
  it("erhält bei der V2-Migration Sprache, Farbschema und Barrierefreiheit", () => {
    const v2 = { ...V1, schemaVersion: 2, language: "en", localSkin: "Cyberpunk", motion: "reduced" };
    const recovered = recoverAccessibilityPreferences(JSON.stringify(v2));
    expect(recovered.recovered).toBe(false);
    expect(recovered.preferences).toEqual({ ...v2, schemaVersion: 3, banner: "none", bannerAnimation: true });
    expect(() => parseAccessibilityPreferences({ ...v2, banner: "mondburg" })).toThrow(ThemeValidationError);
    const { language: _language, ...incomplete } = v2;
    expect(() => parseAccessibilityPreferences(incomplete)).toThrow(ThemeValidationError);
  });

  it("speichert alle 25 Motive und die Standbildwahl unabhängig vom Kampagnentheme", () => {
    expect(new Set(BANNER_IDS).size).toBe(25);
    for (const banner of ["none", ...BANNER_IDS]) {
      const preferences = { ...DEFAULT_ACCESSIBILITY_PREFERENCES, banner, bannerAnimation: false };
      expect(parseAccessibilityPreferences(serializeAccessibilityPreferences(preferences))).toEqual(preferences);
      expect(resolveTheme(THEME_PRESETS.Fantasy, preferences)).toEqual(resolveTheme(THEME_PRESETS.Fantasy));
    }
  });

  it.each([
    "mondburg", "gluehwald", "drachenberge", "himmelsinseln", "kristallhoehle",
    "luftschiffhafen", "uhrwerkstadt", "stahlwerk", "wuestenexpress", "eiswacht",
    "neonregen", "dachgaerten", "biolabor", "datenstrom", "tiefseestation",
    "sonnenraster", "pastellpalmen", "raketenhafen", "orbitalring", "geisterstadt",
    "sternwarte", "versunkener_tempel", "pilzdorf", "wolkenkloster", "nachtmarkt",
  ])("erhält das gespeicherte Motiv %s ohne Rücksetzen anderer Einstellungen", banner => {
    // Literal persisted IDs protect earlier installations from an accidental catalogue rename.
    const saved = { ...DEFAULT_ACCESSIBILITY_PREFERENCES, banner, bannerAnimation: false,
      language: "en", localSkin: "Cyberpunk", motion: "reduced", font: "reader" };
    expect(recoverAccessibilityPreferences(JSON.stringify(saved))).toEqual({ preferences: saved, recovered: false });
  });

  it("weist fremde Ressourcen, fehlende Felder und ungültige Animationswerte zurück", () => {
    const { banner: _banner, ...missing } = DEFAULT_ACCESSIBILITY_PREFERENCES;
    for (const invalid of [
      missing,
      { ...DEFAULT_ACCESSIBILITY_PREFERENCES, banner: "https://example.org/banner.gif" },
      { ...DEFAULT_ACCESSIBILITY_PREFERENCES, banner: "unknown" },
      { ...DEFAULT_ACCESSIBILITY_PREFERENCES, bannerAnimation: "false" },
    ]) expect(() => parseAccessibilityPreferences(invalid)).toThrow(ThemeValidationError);
  });
});
