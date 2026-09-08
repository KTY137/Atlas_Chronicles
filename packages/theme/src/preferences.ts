// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { choice, deepFreeze, fail, object, readThemeJson, themeCanonicalJson } from "./json.ts";
import { evaluateThemeAccessibility } from "./contrast.ts";
import { parseThemeManifest } from "./manifest.ts";
import { HIGH_CONTRAST_COLORS, getThemePreset } from "./presets.ts";
import { THEME_MOTION_RECIPES, THEME_PRESET_IDS, type AccessibilityPreferencesV1, type ResolvedThemeV1, type SystemAccessibility } from "./model.ts";

/** Oberflächensprache. Sie färbt nur die Anzeige; Daten, Titel und Exporte bleiben deutsch. */
export type Sprache = "de" | "en";
export const SPRACHEN = ["de", "en"] as const;
/** Schemafassung 2: V1 plus `language`. Der Feldsatz bleibt geschlossen, Zuwachs verlangt Migration. */
export interface AccessibilityPreferencesV2 extends Omit<AccessibilityPreferencesV1, "schemaVersion"> {
  readonly schemaVersion: 2;
  readonly language: Sprache;
}
const V1_FIELDS = ["schemaVersion", "contrast", "motion", "transparency", "art", "font", "density", "atmosphere", "lowPower", "localSkin"] as const;
const V2_FIELDS = [...V1_FIELDS, "language"] as const;

export const DEFAULT_ACCESSIBILITY_PREFERENCES: AccessibilityPreferencesV2 = deepFreeze({
  schemaVersion: 2, contrast: "system", motion: "system", transparency: "system", art: "on", font: "theme",
  density: "comfortable", atmosphere: "crafted", lowPower: false, localSkin: null, language: "de",
});
/** Die Felder, die V1 und V2 teilen; die Fassungsprüfung steht beim Aufrufer. */
function checkSharedPreferenceFields(row: Record<string, unknown>): void {
  choice(row.contrast, ["system", "normal", "high"], "preferences.contrast"); choice(row.motion, ["system", "reduced"], "preferences.motion");
  choice(row.transparency, ["system", "reduced"], "preferences.transparency"); choice(row.art, ["on", "off"], "preferences.art");
  choice(row.font, ["theme", "system", "reader"], "preferences.font"); choice(row.density, ["compact", "comfortable"], "preferences.density");
  choice(row.atmosphere, ["clean", "crafted", "cinematic"], "preferences.atmosphere");
  if (typeof row.lowPower !== "boolean") fail("preferences.lowPower", "boolean required");
  if (row.localSkin !== null) choice(row.localSkin, THEME_PRESET_IDS, "preferences.localSkin");
}
export function parseAccessibilityPreferences(input: unknown): AccessibilityPreferencesV2 {
  const json = readThemeJson(input);
  const version = json !== null && typeof json === "object" && !Array.isArray(json) ? (json as Record<string, unknown>).schemaVersion : undefined;
  // Explicit migration 1 -> 2: a stored V1 file predates the language choice and stays German.
  if (version === 1) {
    const old = object(json, "preferences", V1_FIELDS);
    checkSharedPreferenceFields(old);
    return deepFreeze({ ...old, schemaVersion: 2, language: "de" } as unknown as AccessibilityPreferencesV2);
  }
  const row = object(json, "preferences", V2_FIELDS);
  if (row.schemaVersion !== 2) fail("preferences.schemaVersion", "unsupported version; explicit migration required");
  checkSharedPreferenceFields(row);
  choice(row.language, SPRACHEN, "preferences.language");
  return deepFreeze(row as unknown as AccessibilityPreferencesV2);
}
export function serializeAccessibilityPreferences(input: unknown): string { return themeCanonicalJson(parseAccessibilityPreferences(input)); }
/** Explicit recovery for local storage. Never silently use this fallback for server
 * manifests or publication decisions. The host can show the recovered flag once. */
export function recoverAccessibilityPreferences(input: unknown): { readonly preferences: AccessibilityPreferencesV2; readonly recovered: boolean } {
  try { return Object.freeze({ preferences: parseAccessibilityPreferences(input), recovered: false }); }
  catch { return Object.freeze({ preferences: DEFAULT_ACCESSIBILITY_PREFERENCES, recovered: true }); }
}

export function resolveTheme(manifestInput: unknown, preferencesInput: unknown = DEFAULT_ACCESSIBILITY_PREFERENCES, systemInput: SystemAccessibility = {}): ResolvedThemeV1 {
  const campaign = parseThemeManifest(manifestInput), preferences = parseAccessibilityPreferences(preferencesInput);
  const system = readThemeJson(systemInput) as Record<string, unknown>;
  if (!system || typeof system !== "object" || Array.isArray(system)) fail("system", "object required");
  for (const [key, value] of Object.entries(system)) {
    if (!["forcedColors", "highContrast", "reducedMotion", "reducedTransparency", "lowPower"].includes(key) || typeof value !== "boolean") fail(`system.${key}`, "known boolean preference required");
  }
  const theme = preferences.localSkin === null ? campaign : getThemePreset(preferences.localSkin);
  const forcedColors = system.forcedColors === true;
  const correctedContrast = !evaluateThemeAccessibility(theme).passes;
  const highContrast = preferences.contrast === "high" || system.highContrast === true || forcedColors || correctedContrast;
  const lowPower = preferences.lowPower || system.lowPower === true;
  const reduceMotion = preferences.motion === "reduced" || system.reducedMotion === true || lowPower;
  const typography = preferences.font === "theme" ? theme.typography
    : { display: preferences.font === "system" ? "system" : "plex", body: preferences.font === "system" ? "system" : "plex", mono: "mono" } as const;
  return deepFreeze({
    schemaVersion: 1, basePreset: theme.basePreset, colors: highContrast ? HIGH_CONTRAST_COLORS : theme.colors,
    typography, geometry: theme.geometry, sampling: theme.sampling,
    motion: THEME_MOTION_RECIPES[reduceMotion ? "none" : theme.motion], density: preferences.density,
    atmosphere: highContrast || lowPower ? "clean" : preferences.atmosphere,
    art: preferences.art === "on" && !highContrast && !lowPower && preferences.atmosphere !== "clean",
    transparency: preferences.transparency !== "reduced" && system.reducedTransparency !== true && !highContrast && !lowPower,
    highContrast, forcedColors, lowPower, correctedContrast,
  });
}
