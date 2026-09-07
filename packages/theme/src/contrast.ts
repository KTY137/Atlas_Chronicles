// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { deepFreeze, fail } from "./json.ts";
import { parseThemeManifest } from "./manifest.ts";
import type { ThemeColorToken } from "./model.ts";

export const THEME_CONTRAST_ALGORITHM = "wcag22-srgb-opaque-v1" as const;
export interface ThemeContrastPair {
  readonly id: string;
  readonly foreground: ThemeColorToken;
  readonly background: ThemeColorToken;
  readonly minimum: 3 | 4.5;
  readonly kind: "normal-text" | "non-text" | "inactive-product";
}
export interface ThemeContrastResult extends ThemeContrastPair { readonly ratio: number; readonly passes: boolean }
export interface ThemeAccessibilityReportV1 {
  readonly algorithm: typeof THEME_CONTRAST_ALGORITHM;
  readonly pairs: readonly ThemeContrastResult[];
  readonly failures: readonly string[];
  readonly passes: boolean;
}

const surfaces = ["bg", "bg-deep", "surface", "surface-2", "surface-hover", "input-bg"] as const;
const readingSurfaces = [...surfaces, "accent-soft", "ok-soft", "danger-soft", "warning-soft", "info-soft", "private-soft"] as const;
const pairs: ThemeContrastPair[] = [];
function pair(foreground: ThemeColorToken, background: ThemeColorToken, minimum: 3 | 4.5, kind: ThemeContrastPair["kind"]): void {
  pairs.push({ id: `${foreground}/${background}`, foreground, background, minimum, kind });
}
for (const foreground of ["text", "text-muted", "text-faint", "link", "link-visited", "accent"] as const) {
  for (const background of readingSurfaces) pair(foreground, background, 4.5, "normal-text");
}
for (const foreground of ["ok", "danger", "warning", "info", "private"] as const) {
  for (const background of [...surfaces, `${foreground}-soft` as ThemeColorToken]) pair(foreground, background, 4.5, "normal-text");
}
for (const background of readingSurfaces) {
  pair("control-line", background, 3, "non-text");
  pair("focus", background, 3, "non-text");
}
pair("accent-ink", "accent", 4.5, "normal-text");
pair("accent-ink", "accent-strong", 4.5, "normal-text");
pair("selection-ink", "selection", 4.5, "normal-text");
// Inactive controls are excepted by WCAG 1.4.3/1.4.11. This is an explicit,
// stricter product requirement, not a claim that WCAG requires this pair.
pair("disabled", "disabled-bg", 4.5, "inactive-product");
export const THEME_CONTRAST_PAIRS: readonly ThemeContrastPair[] = deepFreeze(pairs);

/** W3C G18: https://www.w3.org/WAI/WCAG22/Techniques/general/G18.html
 * Current sRGB transfer threshold 0.04045, coefficients 0.2126/0.7152/0.0722.
 * Opaque input only: no alpha compositing or guesses about the rendered backdrop. */
export function relativeLuminance(color: string): number {
  if (typeof color !== "string" || !/^#[a-fA-F0-9]{6}$/.test(color)) fail("color", "opaque #RRGGBB color required");
  const channel = (offset: number) => {
    const s = Number.parseInt(color.slice(offset, offset + 2), 16) / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}
export function contrastRatio(first: string, second: string): number {
  const a = relativeLuminance(first), b = relativeLuminance(second);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
/** Token-pair evidence only. Does not inspect CSS, text size, opacity, actual
 * focus adjacency, images, forced-colors output, keyboard or assistive technology.
 * The normal-text threshold is intentionally used even for display headings.
 * Never round a ratio before comparing it to its threshold. */
export function evaluateThemeAccessibility(input: unknown): ThemeAccessibilityReportV1 {
  const manifest = parseThemeManifest(input);
  const results = THEME_CONTRAST_PAIRS.map(spec => {
    const ratio = contrastRatio(manifest.colors[spec.foreground], manifest.colors[spec.background]);
    return { ...spec, ratio, passes: ratio >= spec.minimum };
  });
  const failures = results.filter(result => !result.passes).map(result => result.id);
  return deepFreeze({ algorithm: THEME_CONTRAST_ALGORITHM, pairs: results, failures, passes: failures.length === 0 });
}
