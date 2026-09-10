// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
/**
 * Der Reparaturvorschlag. Geprüft wird nicht, dass er „schön" ist, sondern dass er hält, was
 * die Werkstatt dem Nutzer verspricht: ein Klick, und die gemeldete Paarung besteht — ohne
 * dass dabei eine andere zerbricht und ohne dass die gewählte Farbe eine andere wird.
 */
import { describe, expect, it } from "vitest";
import {
  THEME_COLOR_TOKENS, THEME_PRESET_IDS, THEME_PRESETS, ThemeValidationError,
  contrastRatio, evaluateThemeAccessibility, getThemePreset, suggestAccessibleColor,
} from "../src/index.ts";

// `structuredClone` loest die Einfrierung des Presets; die Zusicherung geht ueber `unknown`,
// weil das Manifest bewusst KEINE Index-Signatur hat — genau das schuetzt es im Betrieb.
const entwurf = () => structuredClone(getThemePreset("Fantasy")) as unknown as {
  colors: Record<string, string>; [key: string]: unknown;
};

/** Farbton und Sättigung einer Farbe, grob — reicht, um „dieselbe Farbe" zu prüfen. */
function farbton(hex: string): number {
  const wert = (versatz: number) => Number.parseInt(hex.slice(versatz, versatz + 2), 16) / 255;
  const r = wert(1), g = wert(3), b = wert(5);
  const hoch = Math.max(r, g, b), tief = Math.min(r, g, b);
  if (hoch === tief) return -1;
  const spanne = hoch - tief;
  return (hoch === r ? (g - b) / spanne + (g < b ? 6 : 0) : hoch === g ? (b - r) / spanne + 2 : (r - g) / spanne + 4) / 6;
}

describe("Reparaturvorschlag für eine Farbe", () => {
  it("meldet nichts zu tun, wenn die Farbe schon besteht", () => {
    for (const id of THEME_PRESET_IDS) {
      const vorschlag = suggestAccessibleColor(getThemePreset(id), "text");
      expect(vorschlag.failing).toEqual([]);
      expect(vorschlag.suggestion).toBe(getThemePreset(id).colors.text);
    }
  });

  it("repariert eine zu blasse Schrift und lässt dabei alles andere bestehen", () => {
    const wert = entwurf();
    wert.colors.text = "#4a4034"; // dunkles Braun auf fast schwarzem Grund
    expect(evaluateThemeAccessibility(wert).passes).toBe(false);
    const vorschlag = suggestAccessibleColor(wert, "text");
    expect(vorschlag.failing.length).toBeGreaterThan(0);
    expect(vorschlag.suggestion).not.toBeNull();

    wert.colors.text = vorschlag.suggestion!;
    const bericht = evaluateThemeAccessibility(wert);
    expect(bericht.failures).toEqual([]);
    expect(bericht.passes).toBe(true);
  });

  it("behält den Farbton bei und verschiebt nur die Helligkeit", () => {
    const wert = entwurf();
    wert.colors.accent = "#7a4a12"; // gedecktes Kupfer, zu dunkel für den Grund
    const vorschlag = suggestAccessibleColor(wert, "accent");
    expect(vorschlag.suggestion).not.toBeNull();
    // Derselbe Farbton — Kupfer bleibt Kupfer, es wird nie Grün vorgeschlagen.
    expect(farbton(vorschlag.suggestion!)).toBeCloseTo(farbton("#7a4a12"), 2);
  });

  it("nimmt auch die Paarungen mit, in denen die Farbe der Hintergrund ist", () => {
    const wert = entwurf();
    // Eine zarte Fläche so weit aufhellen, dass der Text darauf verschwindet.
    wert.colors["ok-soft"] = "#b8d4ab";
    expect(evaluateThemeAccessibility(wert).passes).toBe(false);
    const vorschlag = suggestAccessibleColor(wert, "ok-soft");
    expect(vorschlag.suggestion).not.toBeNull();
    wert.colors["ok-soft"] = vorschlag.suggestion!;
    expect(evaluateThemeAccessibility(wert).failures).toEqual([]);
  });

  it("gibt null zurück, wenn keine Helligkeit derselben Farbe reicht", () => {
    const wert = entwurf();
    // Der Grund selbst ist mittelgrau: darauf besteht weder helles noch dunkles Mittelgrau
    // gegen alle sechs Textfarben gleichzeitig.
    wert.colors.bg = "#7f7f7f"; wert.colors.surface = "#7f7f7f"; wert.colors["surface-2"] = "#7f7f7f";
    wert.colors["surface-hover"] = "#7f7f7f"; wert.colors["input-bg"] = "#7f7f7f"; wert.colors["bg-deep"] = "#7f7f7f";
    const vorschlag = suggestAccessibleColor(wert, "text-muted");
    expect(vorschlag.failing.length).toBeGreaterThan(0);
    expect(vorschlag.suggestion).toBeNull();
  });

  it("weist eine unbekannte Farbe und einen kaputten Entwurf zurück", () => {
    expect(() => suggestAccessibleColor(THEME_PRESETS.Fantasy, "gibtsnicht" as never)).toThrow(ThemeValidationError);
    expect(() => suggestAccessibleColor({ schemaVersion: 1 }, "text")).toThrow(ThemeValidationError);
  });

  /** Der eigentliche Nutzwert: für JEDE der 34 Farben muss ein Vorschlag entstehen können,
   * sonst gäbe es in der Werkstatt Felder mit einem Knopf, der nie etwas tut. */
  it("kann jede der 34 Farben aus einem kaputten Zustand zurückholen", () => {
    for (const token of THEME_COLOR_TOKENS) {
      const wert = entwurf();
      const vorher = wert.colors[token]!;
      wert.colors[token] = "#808080";
      const vorschlag = suggestAccessibleColor(wert, token);
      if (vorschlag.failing.length === 0) continue; // Mittelgrau bestand hier zufällig.
      expect(vorschlag.suggestion, `${token} ohne Vorschlag`).not.toBeNull();
      wert.colors[token] = vorschlag.suggestion!;
      const offen = evaluateThemeAccessibility(wert).failures;
      // Übrig bleiben dürfen nur Paarungen, die diese Farbe gar nicht berühren.
      expect(offen.filter(id => id.split("/").includes(token)), `${token}: ${offen.join(", ")}`).toEqual([]);
      expect(contrastRatio(vorher, vorher)).toBe(1); // Rechnung lebt.
    }
  });
});
