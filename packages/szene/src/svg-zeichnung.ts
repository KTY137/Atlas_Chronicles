// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
/**
 * Eine SVG eines Assetpakets ist eine Zeichnung, kein Programm und kein Abruf. Diese Regel gilt an
 * zwei Stellen und steht deshalb einmal hier: das Asset-Gate prüft jedes Paket vor der Auslieferung,
 * und der Server prüft jede SVG noch einmal, bevor er sie für die Kacheln der Runde rastert.
 */
export const SVG_VERBOTEN: readonly { readonly muster: RegExp; readonly warum: string }[] = Object.freeze([
  { muster: /<script[\s>]/i, warum: "script element" },
  { muster: /<foreignObject[\s>]/i, warum: "foreignObject" },
  { muster: /<(?:image|use)[\s>]/i, warum: "external or raster reference element" },
  { muster: /\son[a-z]+\s*=/i, warum: "inline event handler" },
  { muster: /(?:href|xlink:href)\s*=\s*["']?(?!#)/i, warum: "non-fragment href" },
  { muster: /url\s*\(\s*["']?(?!#)/i, warum: "non-fragment url() reference" },
  { muster: /javascript:/i, warum: "javascript: URL" },
  { muster: /<!ENTITY/i, warum: "entity declaration" },
  { muster: /<!DOCTYPE/i, warum: "doctype" },
]);
/** Die Gründe, aus denen `svg` keine reine Zeichnung ist; leer, wenn sie eine ist. */
export function svgVerstoesse(svg: string): readonly string[] {
  return SVG_VERBOTEN.filter(({ muster }) => muster.test(svg)).map(({ warum }) => warum);
}
