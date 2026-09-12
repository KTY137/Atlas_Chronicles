// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { test } from "node:test";
import assert from "node:assert/strict";
import { lootText, measureLootText } from "../assets/loot-lettering.mjs";
import sharp from "sharp";

test("loot text uses deterministic outlines and never a system-font SVG text element", () => {
  for (const content of ["Gewöhnlich", "Ungewöhnlich", "Schlüssel", "Große Wächter", "42 × 2", "A & B"]) {
    const a = lootText(256, 50, content), b = lootText(256, 50, content);
    assert.equal(a, b); assert.match(a, /<path d="M/); assert.doesNotMatch(a, /<text|font-family/);
    assert.ok(measureLootText(content, 20) > 0);
  }
});
test("all used font weights and italics render actual opaque pixels", async () => {
  for (const fett of [400, 600, 700]) for (const kursiv of ["normal", "italic"]) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="100">${lootText(256, 60, "Äpfel & größere Schlüssel", { fett, kursiv })}</svg>`;
    const pixels = await sharp(Buffer.from(svg)).ensureAlpha().raw().toBuffer();
    assert.ok(pixels.some((v, i) => i % 4 === 3 && v > 0));
  }
});
test("unsupported glyphs fail instead of silently substituting a missing-glyph box", () => {
  assert.throws(() => lootText(0, 0, "\u{1f984}"), /unsupported character/);
});
