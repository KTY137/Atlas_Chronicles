// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
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
  /** Aurora — dritter ratifizierter Look (design/07-shell-redesign.md §7):
   * tiefes Indigo mit chromatischer Tiefe, Teal als Akzent, Violett als zweite
   * Stimme. Alle 135 deklarierten Kontrastpaare bestehen. */
  Aurora: preset("Aurora", {
    bg: "#0d1120", "bg-deep": "#080b16", surface: "#141a2c", "surface-2": "#1c2338", "surface-hover": "#262e45", "input-bg": "#0b0f1c",
    line: "#2c3450", "line-strong": "#5a6486", "control-line": "#98a2c0",
    text: "#eef1fa", "text-muted": "#c3cadf", "text-faint": "#aab2cc",
    accent: "#6fe3c4", "accent-strong": "#a5f5de", "accent-ink": "#04211a", "accent-soft": "#122a2a",
    link: "#7ce0e8", "link-visited": "#c4b5fd", focus: "#a5f5de",
    ok: "#8fe3b8", "ok-soft": "#0f2620", danger: "#ffa8bf", "danger-soft": "#2a1520", warning: "#f5d68a", "warning-soft": "#2a2214",
    info: "#a8cdf5", "info-soft": "#121f2e", private: "#d3bdfb", "private-soft": "#1e1a30",
    selection: "#6fe3c4", "selection-ink": "#04211a", disabled: "#aab2cc", "disabled-bg": "#1c2338", overlay: "#080b16",
  }, { display: "system", body: "plex", mono: "mono" }, { spacing: 8, radius: 12, border: 1, edges: "clean", icons: "stroke" }, "linear", "snappy"),

  /* -------------------------------------------------------------------------------------
     Sieben Looks aus der Frischekur vom 2026-09-10. Jede Palette wurde entworfen und danach
     mit tools/theme-kontrast.mjs gegen dieselben 135 Paare gerechnet, die auch der Test
     prueft; nachjustiert wurde ausschliesslich die Helligkeit, Farbton und Saettigung
     blieben stehen. Drei der zwoelf Looks sind hell (Medieval, Parchment, Dawn) — das ist
     der Grund, warum keine Regel in der Oberflaeche eine dunkle Farbe fest verdrahten darf.
     ------------------------------------------------------------------------------------- */

  /** Midnight — kuehles Graphit mit Stahlblau. Der ruhige Arbeitslook: nichts leuchtet,
   * alles ist lesbar. Gedacht fuer lange Sitzungen am Schreibtisch. */
  Midnight: preset("Midnight", {
    bg: "#0e1013", "bg-deep": "#08090b", surface: "#15181d", "surface-2": "#1c2027", "surface-hover": "#262b33", "input-bg": "#0b0d10",
    line: "#252a33", "line-strong": "#4a515e", "control-line": "#8f98a8",
    text: "#eef1f5", "text-muted": "#c2c9d4", "text-faint": "#a7afbd",
    accent: "#7fb8ff", "accent-strong": "#a9d1ff", "accent-ink": "#05101d", "accent-soft": "#13202e", link: "#8cc3ff", "link-visited": "#cbb4f7", focus: "#a9d1ff",
    ok: "#8bdcab", "ok-soft": "#0f241a", danger: "#ff9f9f", "danger-soft": "#2a1616", warning: "#f2d287", "warning-soft": "#282013", info: "#9ccdf5", "info-soft": "#111f2c", private: "#cbb4f7", "private-soft": "#1b1730",
    selection: "#7fb8ff", "selection-ink": "#05101d", disabled: "#a7afbd", "disabled-bg": "#1c2027", overlay: "#08090b",
  }, { display: "system", body: "plex", mono: "mono" }, { spacing: 8, radius: 8, border: 1, edges: "clean", icons: "stroke" }, "linear", "snappy"),

  /** Verdant — Waldboden bei Sonnenstand: tiefes Gruen, Gold als Akzent. */
  Verdant: preset("Verdant", {
    bg: "#0b120e", "bg-deep": "#060a08", surface: "#111a14", "surface-2": "#18241c", "surface-hover": "#223026", "input-bg": "#091009",
    line: "#22301f", "line-strong": "#4a5c46", "control-line": "#93a48d",
    text: "#f1f4e9", "text-muted": "#c8d2bd", "text-faint": "#adb9a2",
    accent: "#e8c06a", "accent-strong": "#ffdc93", "accent-ink": "#141005", "accent-soft": "#2a2412", link: "#a8dfa0", "link-visited": "#d9bdf0", focus: "#ffdc93",
    ok: "#96e0a0", "ok-soft": "#0f2416", danger: "#ffa693", "danger-soft": "#2b1713", warning: "#f0cd7d", "warning-soft": "#282011", info: "#a3cfe4", "info-soft": "#11222a", private: "#d9bdf0", "private-soft": "#1e1a2c",
    selection: "#e8c06a", "selection-ink": "#141005", disabled: "#adb9a2", "disabled-bg": "#18241c", overlay: "#060a08",
  }, { display: "cinzel", body: "plex", mono: "mono" }, { spacing: 8, radius: 12, border: 1, edges: "clean", icons: "facet" }, "linear", "gentle"),

  /** Ember — Glutkern: warmes Dunkel, Kupfer und Rost, geaetzte Kanten. */
  Ember: preset("Ember", {
    bg: "#140d0b", "bg-deep": "#0b0605", surface: "#1c1310", "surface-2": "#251916", "surface-hover": "#31221d", "input-bg": "#100a08",
    line: "#33221d", "line-strong": "#61453c", "control-line": "#b09189",
    text: "#f8ece5", "text-muted": "#dcc3b7", "text-faint": "#c4a99c",
    accent: "#ff9a63", "accent-strong": "#ffc09a", "accent-ink": "#1d0c04", "accent-soft": "#331a11", link: "#ffb07f", "link-visited": "#e5b0e0", focus: "#ffc09a",
    ok: "#a8d69a", "ok-soft": "#182415", danger: "#ff9c9c", "danger-soft": "#331616", warning: "#f4cf85", "warning-soft": "#2d2313", info: "#a9cbe8", "info-soft": "#16222c", private: "#e5b0e0", "private-soft": "#2a1a29",
    selection: "#ff9a63", "selection-ink": "#1d0c04", disabled: "#c4a99c", "disabled-bg": "#251916", overlay: "#0b0605",
  }, { display: "cinzel", body: "serif", mono: "mono" }, { spacing: 6, radius: 4, border: 2, edges: "etched", icons: "rune" }, "linear", "measured"),

  /** Astral — Sternkarte: Indigo-Nacht, Violett und Silber. */
  Astral: preset("Astral", {
    bg: "#0e0a1a", "bg-deep": "#080512", surface: "#161029", "surface-2": "#1e1636", "surface-hover": "#292044", "input-bg": "#0b0716",
    line: "#2a2145", "line-strong": "#524673", "control-line": "#a096c4",
    text: "#f0edfb", "text-muted": "#cbc4e6", "text-faint": "#b1a9d1",
    accent: "#c9a8ff", "accent-strong": "#e2ccff", "accent-ink": "#13082a", "accent-soft": "#221a3a", link: "#9dc4ff", "link-visited": "#f0aee0", focus: "#e2ccff",
    ok: "#8fdcb4", "ok-soft": "#122620", danger: "#ff9fbb", "danger-soft": "#2c1523", warning: "#f2d68e", "warning-soft": "#282116", info: "#9dc4ff", "info-soft": "#141f34", private: "#f0aee0", "private-soft": "#2a1830",
    selection: "#c9a8ff", "selection-ink": "#13082a", disabled: "#b1a9d1", "disabled-bg": "#1e1636", overlay: "#080512",
  }, { display: "cinzel", body: "plex", mono: "mono" }, { spacing: 6, radius: 12, border: 1, edges: "clean", icons: "facet" }, "linear", "gentle"),

  /** Brass — Messing und Sepia: warme Werkstatt, gebuerstetes Metall, geschnittene Ecke. */
  Brass: preset("Brass", {
    bg: "#12100c", "bg-deep": "#0a0907", surface: "#1a1712", "surface-2": "#231f18", "surface-hover": "#2f2a20", "input-bg": "#0e0c09",
    line: "#2e2920", "line-strong": "#5b5240", "control-line": "#a99c80",
    text: "#f5eddc", "text-muted": "#d4c8ae", "text-faint": "#bcaf95",
    accent: "#d8a94a", "accent-strong": "#f2c86f", "accent-ink": "#171004", "accent-soft": "#2b2212", link: "#e0bd6d", "link-visited": "#d5b0d8", focus: "#f2c86f",
    ok: "#a9cf94", "ok-soft": "#1c2415", danger: "#f09d8c", "danger-soft": "#2e1a15", warning: "#e8c87a", "warning-soft": "#2b2313", info: "#a4c4d8", "info-soft": "#172128", private: "#d5b0d8", "private-soft": "#271c27",
    selection: "#d8a94a", "selection-ink": "#171004", disabled: "#bcaf95", "disabled-bg": "#231f18", overlay: "#0a0907",
  }, { display: "cinzel", body: "serif", mono: "mono" }, { spacing: 6, radius: 4, border: 2, edges: "cut", icons: "rune" }, "linear", "measured"),

  /** Parchment — heller, ruhiger Arbeitsplatz: warmes Weiss, Tintenblau. Der zweite helle
   * Look neben Medieval, aber ohne dessen Mittelalter-Anmutung. */
  Parchment: preset("Parchment", {
    bg: "#f6f4ef", "bg-deep": "#eae7de", surface: "#fffefb", "surface-2": "#f0ede4", "surface-hover": "#e2ded1", "input-bg": "#ffffff",
    line: "#d8d3c6", "line-strong": "#a49d8c", "control-line": "#6f6a5c",
    text: "#1e1d1a", "text-muted": "#4a473f", "text-faint": "#57534a",
    accent: "#2a4d8f", "accent-strong": "#1c3563", "accent-ink": "#ffffff", "accent-soft": "#dfe4ef", link: "#22467f", "link-visited": "#6a3a7a", focus: "#1c3563",
    ok: "#2c5f38", "ok-soft": "#dde9dd", danger: "#8c2b26", "danger-soft": "#f2dcd8", warning: "#6b4c12", "warning-soft": "#efe4c9", info: "#204a63", "info-soft": "#d9e6ec", private: "#6a3a7a", "private-soft": "#e8dded",
    selection: "#2a4d8f", "selection-ink": "#ffffff", disabled: "#57534a", "disabled-bg": "#f0ede4", overlay: "#1e1d1a",
  }, { display: "serif", body: "system", mono: "mono" }, { spacing: 8, radius: 8, border: 1, edges: "clean", icons: "stroke" }, "linear", "snappy"),

  /** Dawn — Morgenrot: helles Warm, Rose und Aprikose. */
  Dawn: preset("Dawn", {
    bg: "#fdf3ec", "bg-deep": "#f5e3d7", surface: "#fffaf6", "surface-2": "#f8ebe1", "surface-hover": "#efdbcc", "input-bg": "#fffdfb",
    line: "#e6d2c3", "line-strong": "#b39a88", "control-line": "#7d6455",
    text: "#2a1e19", "text-muted": "#54413a", "text-faint": "#5f4b42",
    accent: "#a03c56", "accent-strong": "#7d2942", "accent-ink": "#fff7f3", "accent-soft": "#f6dde2", link: "#94374f", "link-visited": "#6b3c86", focus: "#7d2942",
    ok: "#2f5c3c", "ok-soft": "#dfeadd", danger: "#93291f", "danger-soft": "#f6dbd3", warning: "#6d4a15", "warning-soft": "#f2e3c7", info: "#23495f", "info-soft": "#dbe6eb", private: "#6b3c86", "private-soft": "#ebdff2",
    selection: "#a03c56", "selection-ink": "#fff7f3", disabled: "#5f4b42", "disabled-bg": "#f8ebe1", overlay: "#2a1e19",
  }, { display: "cinzel", body: "plex", mono: "mono" }, { spacing: 8, radius: 12, border: 1, edges: "clean", icons: "stroke" }, "linear", "gentle"),
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
