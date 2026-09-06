import { describe, expect, it } from "vitest";
import { rasterTileDisplaySize } from "../src/tactical-geometry.ts";

describe("tactical raster placement at partial pyramid edges", () => {
  it("retains the source-pixel pitch and clips the fractional last texel rather than stretching the whole tile", () => {
    const [width, height] = rasterTileDisplaySize({ width: 2561, height: 1237, pixelScale: 16 }, [161, 78]);
    expect(width).toBe(2576);
    expect(height).toBe(1248);
    // Source x1280 is texel boundary80, independent of the partial texel at the far edge.
    expect(80 * width / 161).toBe(1280);
  });

  it("keeps a one-pixel native remainder at its full pyramid pitch before world clipping", () => {
    expect(rasterTileDisplaySize({ width: 1, height: 1, pixelScale: 4 }, [1, 1])).toEqual([4, 4]);
    expect(rasterTileDisplaySize({ width: 256, height: 128, pixelScale: 1 }, [256, 128])).toEqual([256, 128]);
  });
});
