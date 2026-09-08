// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { describe, expect, it, vi } from "vitest";
import sharp from "sharp";
import { rendererVersion, type CartographyDrawing } from "../../szene/src/cartography-projection.ts";
import { createTacticalRasterService } from "../src/domain/tactical-raster.ts";
import type { TacticalPoint } from "@chronicle/szene";

describe("independent cartography raster boundary review", () => {
  it("zeros RGB when a valid positive drawing opacity rounds output alpha to zero", async () => {
    const drawing: CartographyDrawing = { rendererVersion, width: 4, height: 4, background: null,
      polygons: [{ regionId: "faint", points: [[0, 0], [4, 0], [4, 4], [0, 4]], fill: 0xff0000, opacity: 0.001 }] };
    const service = createTacticalRasterService();
    const tile = await service.renderTacticalTile({ image: null, documentSize: [4, 4], drawing, regions: null, level: 0, x: 0, y: 0 });
    const exported = await service.renderCartographyImage({ image: null, documentSize: [4, 4], drawing });
    const rgba = await sharp(tile.bytes).ensureAlpha().raw().toBuffer();
    expect([...rgba.subarray(0, 4)]).toEqual([0, 0, 0, 0]);
    expect(tile.bytes).toEqual(exported.bytes);
  });
  it("matches an independent every-base-pixel union oracle across all levels and tile offsets", async () => {
    const width = 31, height = 17, tileSize = 4;
    const known = [
      [[.5, -2], [9.5, -2], [9.5, 14.5], [.5, 14.5]],
      [[9.5, 0], [21, 0], [21, 5], [16.5, 5], [16.5, 17], [9.5, 17]],
      [[18, 6], [32, 6], [32, 17], [23.5, 17], [23.5, 9], [18, 9]],
      [[3, 12], [14, 12], [11, 17], [3, 17]],
    ] as const;
    const contains = ([x, y]: TacticalPoint, polygon: readonly TacticalPoint[]) => {
      let inside = false;
      for (let a = 0, b = polygon.length - 1; a < polygon.length; b = a++) {
        const one = polygon[a]!, two = polygon[b]!;
        if ((one[1] > y) !== (two[1] > y) && x < (two[0] - one[0]) * (y - one[1]) / (two[1] - one[1]) + one[0]) inside = !inside;
      }
      return inside;
    };
    const native = Array.from({ length: height }, (_, y) => Array.from({ length: width }, (_, x) => known.some(polygon => contains([x + .5, y + .5], polygon))));
    const drawing: CartographyDrawing = { rendererVersion, width, height, background: null,
      polygons: [{ regionId: "whole", points: [[0, 0], [width, 0], [width, height], [0, height]], fill: 0x123456, opacity: 1 }] };
    const image = await sharp({ create: { width, height, channels: 4, background: { r: 0x12, g: 0x34, b: 0x56, alpha: 1 } } }).png().toBuffer();
    const service = createTacticalRasterService();
    for (let level = 0; level <= 3; level++) {
      const factor = 2 ** level, columns = Math.ceil(width / factor / tileSize), rows = Math.ceil(height / factor / tileSize);
      for (let y = 0; y < rows; y++) for (let x = 0; x < columns; x++) {
        const common = { documentSize: [width, height] as const, regions: known, level, x, y, tileSize };
        const vector = await service.renderTacticalTile({ ...common, image: null, drawing });
        const bitmap = await service.renderTacticalTile({ ...common, image });
        const pixels = await sharp(vector.bytes).ensureAlpha().raw().toBuffer();
        expect(vector.bytes).toEqual(bitmap.bytes);
        for (let py = 0; py < vector.height; py++) for (let px = 0; px < vector.width; px++) {
          const startX = (x * tileSize + px) * factor, startY = (y * tileSize + py) * factor;
          const endX = Math.min(width, startX + factor), endY = Math.min(height, startY + factor);
          const visible = native.slice(startY, endY).every(row => row.slice(startX, endX).every(Boolean));
          const at = (py * vector.width + px) * 4;
          expect([...pixels.subarray(at, at + 4)], `level=${level},tile=${x}/${y},pixel=${px}/${py}`).toEqual(visible ? [0x12, 0x34, 0x56, 255] : [0, 0, 0, 0]);
        }
      }
    }
  });
  it("cannot allocate a document-sized JavaScript buffer for a 144M coarse vector tile", async () => {
    const points = [[0, 0], [12000, 0], [12000, 12000], [0, 12000]] as const;
    const drawing: CartographyDrawing = { rendererVersion, width: 12000, height: 12000, background: null,
      polygons: [{ regionId: "whole", points, fill: 0x123456, opacity: 1 }] };
    const allocations: number[] = [], original = Buffer.alloc;
    const spy = vi.spyOn(Buffer, "alloc").mockImplementation(((size: number, ...arguments_: unknown[]) => {
      allocations.push(size);
      if (size > 256 * 256 * 4) throw new Error("A tile requested a document-sized buffer");
      return Reflect.apply(original, Buffer, [size, ...arguments_]);
    }) as typeof Buffer.alloc);
    try {
      const tile = await createTacticalRasterService().renderTacticalTile({ image: null, documentSize: [12000, 12000], drawing, regions: [points], level: 6, x: 0, y: 0 });
      expect([tile.width, tile.height]).toEqual([188, 188]);
      expect(Math.max(...allocations)).toBeLessThanOrEqual(188 * 188 * 4);
    } finally { spy.mockRestore(); }
  });
});
