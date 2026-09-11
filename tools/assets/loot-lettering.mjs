// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import opentype from "opentype.js";
const require = createRequire(import.meta.url), fonts = new Map();
function font(weight, italic) {
  const key = `${weight}-${italic ? "italic" : "normal"}`;
  if (!fonts.has(key)) {
    const bytes = readFileSync(require.resolve(`@fontsource/libre-baskerville/files/libre-baskerville-latin-${key}.woff`));
    fonts.set(key, opentype.parse(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)));
  }
  return fonts.get(key);
}
function layout(text, size, weight, italic, spacing) {
  const face = font(weight, italic), options = { kerning: true, letterSpacing: spacing / size };
  if ([...text].some(c => face.charToGlyphIndex(c) === 0)) throw new Error(`Loot lettering contains an unsupported character: ${text}`);
  return { face, options, width: Math.max(0, face.getAdvanceWidth(text, size, options) - (text.length ? spacing : 0)) };
}
export function measureLootText(text, size, weight = 400) { return layout(String(text), size, weight, false, 0).width; }
/** Pinned WOFF glyph outlines only. Rasterizers never consult installed system fonts.
 * The SVG title preserves the readable label; paths fit within the card's text column. */
export function lootText(x, y, content, { groesse = 28, farbe = "#2c2519", anker = "middle", fett = 400, sperrung = 0, kursiv = "normal", maxWidth = 424 } = {}) {
  const text = String(content), italic = kursiv === "italic";
  let size = groesse, current = layout(text, size, fett, italic, sperrung);
  if (current.width > maxWidth) {
    // Spacing scales with glyphs so long categories cannot overflow the fixed frame.
    const ratio = maxWidth / current.width; size *= ratio; sperrung *= ratio;
    current = layout(text, size, fett, italic, sperrung);
  }
  const start = x - (anker === "middle" ? current.width / 2 : anker === "end" ? current.width : 0);
  const outline = current.face.getPath(text, start, y, size, current.options);
  const escape = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<g fill="${farbe}"><title>${escape(text)}</title><path d="${outline.toPathData(3)}"/></g>`;
}
