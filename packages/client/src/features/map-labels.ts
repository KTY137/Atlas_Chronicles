// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { CARTOGRAPHY_LABEL_STYLES, type CartographyLabelStyle, type CartographyLabelV1, type TacticalCartographyV1, type TacticalPoint } from "@chronicle/szene";
import { t } from "../i18n";

/**
 * Names on the map: a river's, a wood's, a region's. The tool turns a stroke into the line the
 * name follows; the shared cartography stores it; the renderer sets the letters along it.
 */
export const LABEL_STYLES: readonly CartographyLabelStyle[] = CARTOGRAPHY_LABEL_STYLES;
export type LabelSizeId = "klein" | "normal" | "gross" | "riesig";
/** Letter height in construction cells per size step. */
export const LABEL_SIZES: readonly { readonly id: LabelSizeId; readonly cells: number }[] = [{ id: "klein", cells: .5 }, { id: "normal", cells: .8 }, { id: "gross", cells: 1.3 }, { id: "riesig", cells: 2.2 }];
// Looked up on every render so a language change reaches them.
export function labelStyleName(style: CartographyLabelStyle): string {
  switch (style) { case "ort": return t("Ort"); case "wasser": return t("Gewässer"); case "gegend": return t("Gegend"); case "weg": return t("Weg"); }
}
export function labelSizeName(size: LabelSizeId): string {
  switch (size) { case "klein": return t("Klein"); case "normal": return t("Normal"); case "gross": return t("Groß"); case "riesig": return t("Riesig"); }
}
/**
 * The line a name follows, from the raw stroke: points closer than `step` are dropped, the
 * rest smoothed once, and a stroke shorter than a step is a click — one point, a straight name.
 * Never more than `maximum` points, evenly thinned.
 */
export function labelPath(stroke: readonly TacticalPoint[], step: number, maximum = 64): TacticalPoint[] {
  if (!stroke.length) return [];
  const kept: TacticalPoint[] = [stroke[0]!];
  for (const point of stroke.slice(1)) { const last = kept.at(-1)!; if (Math.hypot(point[0] - last[0], point[1] - last[1]) >= step) kept.push(point); }
  const last = stroke.at(-1)!, tail = kept.at(-1)!;
  if (kept.length > 1 && (tail !== last) && Math.hypot(last[0] - tail[0], last[1] - tail[1]) >= step * .4) kept.push(last);
  let total = 0;
  for (let index = 1; index < kept.length; index++) total += Math.hypot(kept[index]![0] - kept[index - 1]![0], kept[index]![1] - kept[index - 1]![1]);
  if (kept.length < 2 || total < step) return [stroke[0]!];
  const smooth = kept.map((point, index) => index === 0 || index === kept.length - 1 ? point
    : [(kept[index - 1]![0] + point[0] * 2 + kept[index + 1]![0]) / 4, (kept[index - 1]![1] + point[1] * 2 + kept[index + 1]![1]) / 4] as TacticalPoint);
  if (smooth.length <= maximum) return smooth;
  return Array.from({ length: maximum }, (_, index) => smooth[Math.round(index * (smooth.length - 1) / (maximum - 1))]!);
}
/** The cartography with these names; none at all leaves the field out, so an untouched map
 * keeps its hash. */
export function withLabels(cartography: TacticalCartographyV1, labels: readonly CartographyLabelV1[]): TacticalCartographyV1 {
  const { labels: _previous, ...rest } = cartography;
  return labels.length ? { ...rest, labels } : rest;
}
