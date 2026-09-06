import { parseThemeManifest } from "./manifest.ts";
import { choice, deepFreeze } from "./json.ts";
import { THEME_PRESET_IDS, type ThemeColors, type ThemeManifestV1, type ThemePresetId } from "./model.ts";

const dark: ThemeColors = {
  bg: "#0a0c0d", "bg-deep": "#060708", surface: "#121517", "surface-2": "#191d20", "surface-hover": "#24282b", "input-bg": "#0d1011",
  line: "#353938", "line-strong": "#62665f", "control-line": "#96998f",
  text: "#f0ebe1", "text-muted": "#c4beaf", "text-faint": "#b6b0a1",
  accent: "#e6a55a", "accent-strong": "#ffc476", "accent-ink": "#17110a", "accent-soft": "#292115",
  link: "#f0b976", "link-visited": "#d6b7ec", focus: "#ffd99c",
  ok: "#b6d4a9", "ok-soft": "#152619", danger: "#ffb1a6", "danger-soft": "#2c1918",
  warning: "#f5d181", "warning-soft": "#292312", info: "#a2d4ef", "info-soft": "#14242b", private: "#d6b7ec", "private-soft": "#241b2b",
  selection: "#f0b976", "selection-ink": "#17110a", disabled: "#b6b0a1", "disabled-bg": "#191d20", overlay: "#060708",
};
const attribution = { creator: "Atlas Chronicles", license: "LicenseRef-Project", notice: "Source-owned preset; no third-party imagery. Project licensing applies." } as const;
function preset(name: ThemePresetId, colors: ThemeColors, typography: ThemeManifestV1["typography"], geometry: ThemeManifestV1["geometry"], sampling: ThemeManifestV1["sampling"], motion: ThemeManifestV1["motion"]): ThemeManifestV1 {
  return parseThemeManifest({ schemaVersion: 1, name, basePreset: name, colors, typography, geometry, sampling, motion, attribution });
}
export const THEME_PRESETS: Readonly<Record<ThemePresetId, ThemeManifestV1>> = deepFreeze({
  Cyberpunk: preset("Cyberpunk", {
    ...dark, bg: "#080d17", "bg-deep": "#040711", surface: "#101827", "surface-2": "#182235", "surface-hover": "#222d40", "input-bg": "#090f1c",
    "text-muted": "#c0cfdd", "text-faint": "#afc0d1", accent: "#62e8e8", "accent-strong": "#a5ffff", "accent-ink": "#041515", "accent-soft": "#102a30", link: "#83ecf4", "link-visited": "#e5b7ff", focus: "#b4ffff", "control-line": "#91aab9", selection: "#62e8e8", "selection-ink": "#041515",
  }, { display: "plex", body: "plex", mono: "mono" }, { spacing: 4, radius: 4, border: 1, edges: "cut", icons: "stroke" }, "linear", "snappy"),
  Medieval: preset("Medieval", {
    bg: "#eee3cb", "bg-deep": "#e3d5b8", surface: "#fbf2df", "surface-2": "#f1e5cc", "surface-hover": "#decca9", "input-bg": "#fffaef",
    line: "#c1ad85", "line-strong": "#8c7854", "control-line": "#75603f",
    text: "#2f2519", "text-muted": "#493a28", "text-faint": "#50402d",
    accent: "#704217", "accent-strong": "#573011", "accent-ink": "#fff5dd", "accent-soft": "#ead7b6", link: "#62380f", "link-visited": "#633961", focus: "#4b2b10",
    ok: "#315332", "ok-soft": "#dce6ce", danger: "#7b2520", "danger-soft": "#f2d8ce", warning: "#624811", "warning-soft": "#eee1b8", info: "#284b63", "info-soft": "#d8e3e5", private: "#633961", "private-soft": "#e8dce6",
    selection: "#704217", "selection-ink": "#fff5dd", disabled: "#50402d", "disabled-bg": "#e3d5b8", overlay: "#2f2519",
  }, { display: "cinzel", body: "serif", mono: "mono" }, { spacing: 6, radius: 4, border: 2, edges: "etched", icons: "rune" }, "linear", "measured"),
  Fantasy: preset("Fantasy", dark, { display: "cinzel", body: "plex", mono: "mono" }, { spacing: 8, radius: 12, border: 1, edges: "clean", icons: "facet" }, "linear", "gentle"),
  PixelArt: preset("PixelArt", {
    ...dark, bg: "#141326", "bg-deep": "#080815", surface: "#1b1a30", "surface-2": "#24213a", "surface-hover": "#302b45", "input-bg": "#10101f",
    text: "#fff3d6", "text-muted": "#e1d3bd", "text-faint": "#cbbca9", accent: "#ffd46d", "accent-strong": "#ffedb0", "accent-ink": "#21180b", "accent-soft": "#312814", link: "#ffe398", "link-visited": "#e5bfff", focus: "#fff2bb", "control-line": "#bca6ce", selection: "#ffd46d", "selection-ink": "#21180b",
  }, { display: "mono", body: "mono", mono: "mono" }, { spacing: 8, radius: 0, border: 2, edges: "pixel", icons: "pixel" }, "nearest", "stepped"),
});
/** Public default is fixed, never obtained from a private campaign pin. */
export const DEFAULT_THEME_PRESET: ThemePresetId = "Fantasy";
export const PUBLIC_DEFAULT_THEME: ThemeManifestV1 = THEME_PRESETS.Fantasy;
export function getThemePreset(id: ThemePresetId): ThemeManifestV1 { choice(id, THEME_PRESET_IDS, "preset"); return THEME_PRESETS[id]; }

/** All declared meaningful pairs exceed their required contrast in this fallback.
 * Native forced-colors still belongs to the user agent, not to this RGB palette. */
export const HIGH_CONTRAST_COLORS: ThemeColors = deepFreeze({
  bg: "#000000", "bg-deep": "#000000", surface: "#000000", "surface-2": "#000000", "surface-hover": "#000000", "input-bg": "#000000",
  line: "#ffffff", "line-strong": "#ffffff", "control-line": "#ffffff", text: "#ffffff", "text-muted": "#ffffff", "text-faint": "#ffffff",
  accent: "#ffff00", "accent-strong": "#ffffff", "accent-ink": "#000000", "accent-soft": "#000000", link: "#ffff00", "link-visited": "#00ffff", focus: "#ffffff",
  ok: "#aaffaa", "ok-soft": "#000000", danger: "#ffaaaa", "danger-soft": "#000000", warning: "#ffff00", "warning-soft": "#000000", info: "#aaddff", "info-soft": "#000000", private: "#ffbbff", "private-soft": "#000000",
  selection: "#ffff00", "selection-ink": "#000000", disabled: "#ffffff", "disabled-bg": "#000000", overlay: "#000000",
});
