// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import opentype from 'opentype.js';

// Build-time only: exact npm versions + lock integrity, no system-font lookup at render time.
// Only generated outlines enter the images. No font binary is copied into the application.
const fonts = new Map();
function fontFor(weight = 400, italic = 'normal') {
  const variant = `${weight >= 600 ? 700 : 400}-${italic === 'italic' ? 'italic' : 'normal'}`;
  if (!fonts.has(variant)) {
    const path = fileURLToPath(import.meta.resolve(`@fontsource/libre-baskerville/files/libre-baskerville-latin-${variant}.woff`));
    const bytes = readFileSync(path);
    fonts.set(variant, opentype.parse(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)));
  }
  return fonts.get(variant);
}
export function letteringWidth(value, size, weight = 400, italic = 'normal', spacing = 0) {
  return fontFor(weight, italic).getAdvanceWidth(String(value), size, { kerning: true, letterSpacing: spacing / size });
}
export function letteringPath(x, y, value, { groesse = 28, farbe = '#2c2519', anker = 'middle', fett = 400, sperrung = 0, kursiv = 'normal', maxBreite = 400 } = {}) {
  value = String(value);
  const font = fontFor(fett, kursiv);
  for (const char of value) if (char.trim() && !font.charToGlyphIndex(char)) throw new Error(`Loot lettering lacks glyph ${JSON.stringify(char)}`);
  const originalWidth = letteringWidth(value, groesse, fett, kursiv, sperrung);
  if (originalWidth > maxBreite) {
    const ratio = maxBreite / originalWidth;
    groesse *= ratio; sperrung *= ratio;
  }
  const width = letteringWidth(value, groesse, fett, kursiv, sperrung);
  const left = anker === 'end' ? x - width : anker === 'middle' ? x - width / 2 : x;
  const path = font.getPath(value, left, y, groesse, {kerning:true, letterSpacing:sperrung/groesse});
  return `<path d="${path.toPathData(3)}" fill="${farbe}"/>`;
}
