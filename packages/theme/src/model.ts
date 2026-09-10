// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
/** Published V1 is closed data. Adding fields requires an explicit new version. */
export const THEME_VERSION = 1 as const;
export const THEME_LIMITS = Object.freeze({ bytes: 64 * 1024, depth: 12, nodes: 4096, name: 100, creator: 200, notice: 2000 });
/** Die zwölf mitgelieferten Looks. Reihenfolge = Anzeigereihenfolge in der Oberfläche.
 * Eine neue Kennung erweitert die geschlossene Auswahl von V1 nach hinten: ältere Dateien
 * bleiben lesbar, eine Datei mit neuer Kennung ist von einem älteren Stand aber nicht lesbar. */
export const THEME_PRESET_IDS = Object.freeze([
  "Fantasy", "Midnight", "Aurora", "Astral", "Cyberpunk", "Verdant",
  "Ember", "Brass", "PixelArt", "Medieval", "Parchment", "Dawn",
] as const);
export type ThemePresetId = typeof THEME_PRESET_IDS[number];
/** CSS token names without `--`. Legacy --muted/--surface-1 are renderer aliases,
 * not independently editable colors. Line tokens are decorative; control-line is meaningful. */
export const THEME_COLOR_TOKENS = Object.freeze([
  "bg", "bg-deep", "surface", "surface-2", "surface-hover", "input-bg", "line", "line-strong", "control-line",
  "text", "text-muted", "text-faint", "accent", "accent-strong", "accent-ink", "accent-soft", "link", "link-visited", "focus",
  "ok", "ok-soft", "danger", "danger-soft", "warning", "warning-soft", "info", "info-soft", "private", "private-soft",
  "selection", "selection-ink", "disabled", "disabled-bg", "overlay",
] as const);
export type ThemeColorToken = typeof THEME_COLOR_TOKENS[number];
export type ThemeColors = Readonly<Record<ThemeColorToken, string>>;
export const THEME_FONT_IDS = Object.freeze(["cinzel", "plex", "system", "serif", "mono"] as const);
export type ThemeFontId = typeof THEME_FONT_IDS[number];
export interface ThemeTypography { readonly display: ThemeFontId; readonly body: ThemeFontId; readonly mono: "mono" }
export interface ThemeGeometry {
  readonly spacing: 4 | 6 | 8;
  readonly radius: 0 | 4 | 8 | 12;
  readonly border: 1 | 2;
  readonly edges: "clean" | "etched" | "cut" | "pixel";
  readonly icons: "stroke" | "rune" | "facet" | "pixel";
}
export const THEME_MOTION_IDS = Object.freeze(["snappy", "measured", "gentle", "stepped", "none"] as const);
export type ThemeMotionId = typeof THEME_MOTION_IDS[number];
export interface ThemeMotionRecipe {
  readonly controlMs: number; readonly panelMs: number; readonly ambientMs: number;
  readonly cadence: "smooth" | "steps" | "none";
}
export const THEME_MOTION_RECIPES: Readonly<Record<ThemeMotionId, ThemeMotionRecipe>> = Object.freeze({
  snappy: Object.freeze({ controlMs: 120, panelMs: 220, ambientMs: 600, cadence: "smooth" }),
  measured: Object.freeze({ controlMs: 160, panelMs: 280, ambientMs: 800, cadence: "smooth" }),
  gentle: Object.freeze({ controlMs: 180, panelMs: 340, ambientMs: 1000, cadence: "smooth" }),
  stepped: Object.freeze({ controlMs: 160, panelMs: 320, ambientMs: 800, cadence: "steps" }),
  none: Object.freeze({ controlMs: 0, panelMs: 0, ambientMs: 0, cadence: "none" }),
});
export const THEME_LICENSE_IDS = Object.freeze(["LicenseRef-Project", "All-Rights-Reserved", "CC0-1.0", "CC-BY-4.0"] as const);
export interface ThemeManifestV1 {
  readonly schemaVersion: 1;
  readonly name: string;
  readonly basePreset: ThemePresetId;
  readonly colors: ThemeColors;
  readonly typography: ThemeTypography;
  readonly geometry: ThemeGeometry;
  readonly sampling: "linear" | "nearest";
  readonly motion: ThemeMotionId;
  /** Plain attribution text, never HTML or a remotely loaded resource. A license label
   * records the author's assertion; the parser does not adjudicate ownership. */
  readonly attribution: { readonly creator: string; readonly license: typeof THEME_LICENSE_IDS[number]; readonly notice: string };
}
export interface AccessibilityPreferencesV1 {
  readonly schemaVersion: 1;
  readonly contrast: "system" | "normal" | "high";
  readonly motion: "system" | "reduced";
  readonly transparency: "system" | "reduced";
  readonly art: "on" | "off";
  readonly font: "theme" | "system" | "reader";
  readonly density: "compact" | "comfortable";
  readonly atmosphere: "clean" | "crafted" | "cinematic";
  readonly lowPower: boolean;
  /** null follows the campaign pin; a preset replaces the skin, never its authority. */
  readonly localSkin: ThemePresetId | null;
}
/** The host reads media queries; this package only consumes their boolean values. */
export interface SystemAccessibility {
  readonly forcedColors?: boolean;
  readonly highContrast?: boolean;
  readonly reducedMotion?: boolean;
  readonly reducedTransparency?: boolean;
  readonly lowPower?: boolean;
}
export interface ResolvedThemeV1 {
  readonly schemaVersion: 1;
  readonly basePreset: ThemePresetId;
  readonly colors: ThemeColors;
  readonly typography: ThemeTypography;
  readonly geometry: ThemeGeometry;
  readonly sampling: "linear" | "nearest";
  readonly motion: ThemeMotionRecipe;
  readonly density: AccessibilityPreferencesV1["density"];
  readonly atmosphere: AccessibilityPreferencesV1["atmosphere"];
  readonly art: boolean;
  readonly transparency: boolean;
  readonly highContrast: boolean;
  /** Host must preserve native forced-color adjustment; supplied RGB is a fallback only. */
  readonly forcedColors: boolean;
  readonly lowPower: boolean;
  readonly correctedContrast: boolean;
}
