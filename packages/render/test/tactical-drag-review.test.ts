// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { describe, expect, it } from "vitest";
import { retainsTokenDrag } from "../src/geometry.ts";
import type { ProjectedMapToken } from "../src/model.ts";

const pickedUp: ProjectedMapToken = { id: "token-a", x: 10, y: 20, label: "Sera", revision: 4, movable: true, radius: 11 };

describe("tactical drag optimistic concurrency", () => {
  it.each(["x", "y"] as const)("cancels the picked-up token when a remote movement changes %s", axis => {
    expect(retainsTokenDrag(pickedUp, { ...pickedUp, [axis]: pickedUp[axis] + 5 })).toBe(false);
  });

  it("cancels after a remote move and undo even when the token returns to its original position", () => {
    // Pose equality alone does not preserve the version observed at pointerdown.
    expect(retainsTokenDrag(pickedUp, { ...pickedUp, revision: 6 })).toBe(false);
  });

  it("preserves the gesture across another token's movement and a cosmetic label refresh", () => {
    const refreshed: ProjectedMapToken[] = [
      { ...pickedUp, id: "token-b", x: 90, revision: 12 },
      { ...pickedUp, label: "Sera the Scout", color: 0x81b8d1 },
    ];
    expect(retainsTokenDrag(pickedUp, refreshed.find(token => token.id === pickedUp.id))).toBe(true);
  });

  it("preserves an unchanged preparation token that has no live server version", () => {
    const planned: ProjectedMapToken = { id: "planned", x: 10, y: 20, label: "Draft", movable: true };
    expect(retainsTokenDrag(planned, { ...planned })).toBe(true);
    expect(retainsTokenDrag(planned, { ...planned, x: 12 })).toBe(false);
  });

  it.each([undefined, { ...pickedUp, movable: false }])("cancels when the projection removes movement permission or the token", current => {
    expect(retainsTokenDrag(pickedUp, current)).toBe(false);
  });
});
