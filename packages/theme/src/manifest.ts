import { THEME_COLOR_TOKENS, THEME_FONT_IDS, THEME_LICENSE_IDS, THEME_LIMITS, THEME_MOTION_IDS, THEME_PRESET_IDS, type ThemeManifestV1 } from "./model.ts";
import { choice, deepFreeze, fail, object, plainText, readThemeJson, themeCanonicalJson } from "./json.ts";

/** Structural validation is separate from the contrast admission report so an editor
 * can explain and repair a structurally valid inaccessible draft without discarding it. */
export function parseThemeManifest(input: unknown): ThemeManifestV1 {
  const row = object(readThemeJson(input), "theme", ["schemaVersion", "name", "basePreset", "colors", "typography", "geometry", "sampling", "motion", "attribution"]);
  if (row.schemaVersion !== 1) fail("theme.schemaVersion", "unsupported version; explicit migration required");
  plainText(row.name, "theme.name", THEME_LIMITS.name); choice(row.basePreset, THEME_PRESET_IDS, "theme.basePreset");
  const colors = object(row.colors, "theme.colors", THEME_COLOR_TOKENS);
  for (const key of THEME_COLOR_TOKENS) if (typeof colors[key] !== "string" || !/^#[a-fA-F0-9]{6}$/.test(colors[key])) fail(`theme.colors.${key}`, "opaque #RRGGBB color required");
  const typography = object(row.typography, "theme.typography", ["display", "body", "mono"]);
  choice(typography.display, THEME_FONT_IDS, "theme.typography.display"); choice(typography.body, THEME_FONT_IDS, "theme.typography.body"); choice(typography.mono, ["mono"], "theme.typography.mono");
  const geometry = object(row.geometry, "theme.geometry", ["spacing", "radius", "border", "edges", "icons"]);
  choice(geometry.spacing, [4, 6, 8], "theme.geometry.spacing"); choice(geometry.radius, [0, 4, 8, 12], "theme.geometry.radius"); choice(geometry.border, [1, 2], "theme.geometry.border");
  choice(geometry.edges, ["clean", "etched", "cut", "pixel"], "theme.geometry.edges"); choice(geometry.icons, ["stroke", "rune", "facet", "pixel"], "theme.geometry.icons");
  choice(row.sampling, ["linear", "nearest"], "theme.sampling"); choice(row.motion, THEME_MOTION_IDS, "theme.motion");
  const attribution = object(row.attribution, "theme.attribution", ["creator", "license", "notice"]);
  plainText(attribution.creator, "theme.attribution.creator", THEME_LIMITS.creator); choice(attribution.license, THEME_LICENSE_IDS, "theme.attribution.license"); plainText(attribution.notice, "theme.attribution.notice", THEME_LIMITS.notice, true);
  return deepFreeze(row as unknown as ThemeManifestV1);
}
/** The .chronicle-theme file is exactly canonical ThemeManifestV1 JSON. */
export function serializeThemeManifest(input: unknown): string { return themeCanonicalJson(parseThemeManifest(input)); }
