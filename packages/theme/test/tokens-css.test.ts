// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
/**
 * Haelt `packages/ui/src/tokens.css` und das Preset „Fantasy" zusammen.
 *
 * Die CSS-Datei ist der Startwert der Oberflaeche: sie gilt beim ersten Anstrich, auf dem
 * Absturzschirm und in jedem Prueftisch ohne Darstellungs-Provider. Sie wurde von Hand
 * gepflegt und lief dabei vom Preset weg — zehn Farben wichen ab, zwanzig Token fehlten
 * ganz, sodass `var(--focus)` und `var(--input-bg)` dort ins Leere liefen. Genau das faengt
 * dieser Test ab. Es wird die Datei gelesen, nicht importiert: eine Paketgrenze entsteht
 * dadurch nicht.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { THEME_COLOR_TOKENS, THEME_PRESETS } from "../src/index.ts";

const pfad = fileURLToPath(new URL("../../ui/src/tokens.css", import.meta.url));
const css = readFileSync(pfad, "utf8");

/** Liest `--name: wert;` aus dem `:root`-Block. Kommentare zaehlen nicht als Deklaration. */
function token(name: string): string | undefined {
  const ohneKommentare = css.replace(/\/\*[\s\S]*?\*\//g, "");
  return new RegExp(`--${name}\\s*:\\s*([^;]+);`).exec(ohneKommentare)?.[1]?.trim();
}

describe("tokens.css als Startwert", () => {
  it("fuehrt alle 34 Farbtoken mit genau den Werten des Fantasy-Presets", () => {
    const fantasy = THEME_PRESETS.Fantasy.colors;
    const abweichungen = THEME_COLOR_TOKENS
      .map(name => ({ name, css: token(name), preset: fantasy[name] }))
      .filter(eintrag => eintrag.css !== eintrag.preset);
    expect(abweichungen).toEqual([]);
  });

  it("fuehrt die Aliasse und die Form- und Bewegungswerte des Presets", () => {
    const { colors, geometry } = THEME_PRESETS.Fantasy;
    expect(token("muted")).toBe(colors["text-muted"]);
    expect(token("surface-1")).toBe(colors.surface);
    expect(token("radius")).toBe(`${geometry.radius}px`);
    expect(token("theme-border")).toBe(`${geometry.border}px`);
    expect(token("theme-space")).toBe(`${geometry.spacing}px`);
  });

  /** Ohne diese drei Stufen greifen die Erhebungsregeln der Oberflaeche auf nichts zurueck. */
  it("fuehrt die drei Stufen der Erhebungsleiter", () => {
    for (const stufe of ["shadow-1", "shadow-2", "shadow-3"]) expect(token(stufe)).toMatch(/rgba?\(/);
  });
});
