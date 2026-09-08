// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import test from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { future } from "../assets/genres-future.mjs";

// Compare the pixels that actually meet when the rendered 64px floor is repeated.
// Allow eight intensity levels for antialiasing, or the ordinary texture variation
// within a busy floor. A misplaced track or a missing row makes the seam stand out
// beyond that same raster's interior; no source-coordinate expectations are used.
const ANTIALIAS_ALLOWANCE = 8;
function meanJump(data, axis, cut) {
  let difference = 0;
  for (let position = 0; position < 64; position++) {
    const first = axis === "x" ? position * 64 + cut : position + cut * 64;
    const last = axis === "x" ? position * 64 + (cut + 63) % 64 : position + ((cut + 63) % 64) * 64;
    for (let channel = 0; channel < 3; channel++) difference += Math.abs(data[first * 3 + channel] - data[last * 3 + channel]);
  }
  return difference / (64 * 3);
}
for (const floor of future.filter(asset => asset.art === "boden")) {
  test(`${floor.name}: adjoining raster edges remain continuous in both directions`, async () => {
    const { data, info } = await sharp(Buffer.from(floor.zeichne())).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    assert.equal(info.width, 64);
    assert.equal(info.height, 64);
    assert.equal(info.channels, 3);
    for (const axis of ["x", "y"]) {
      let interior = 0;
      for (let cut = 1; cut < 64; cut++) interior += meanJump(data, axis, cut) / 63;
      const limit = Math.max(ANTIALIAS_ALLOWANCE, interior * 1.2), mean = meanJump(data, axis, 0);
      assert.ok(mean <= limit, `${axis} seam has mean intensity jump ${mean.toFixed(2)} > ${limit.toFixed(2)}`);
    }
  });
}
