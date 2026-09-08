// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { describe, expect, it } from "vitest";
import { hitTestStamp } from "../src/stamp-hit.ts";

describe("direct furniture selection", () => {
  const sizes = new Map([["pack/table", [80, 20] as const]]);
  const table = { id: "table", asset: "pack/table", x: 100, y: 100, r: Math.PI / 2, s: 2, l: 15 };
  it("picks the rotated and scaled footprint, not its unrotated bounding box", () => {
    expect(hitTestStamp([table], [100, 175], sizes)).toBe("table");
    expect(hitTestStamp([table], [175, 100], sizes)).toBeUndefined();
  });
  it("picks the upper visible object and excludes floors and unloaded images", () => {
    expect(hitTestStamp([table, { ...table, id: "upper", l: 20 }], [100, 100], sizes)).toBe("upper");
    expect(hitTestStamp([{ ...table, l: -80 }], [100, 100], sizes)).toBeUndefined();
    expect(hitTestStamp([table], [100, 100], new Map())).toBeUndefined();
  });
});
