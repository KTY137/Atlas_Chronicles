// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import type { MapPoint, ProjectedMapStamp } from "./model.ts";

/** Editor-only picking uses the visible bitmap footprint, including rotation and layer order.
 * Ties within a layer follow the draw order (`renderer.ts#drawStamps` sorts by layer, then id),
 * so the object that is visibly on top is the one that gets picked, whatever the array order. */
export function hitTestStamp(stamps: readonly ProjectedMapStamp[], point: MapPoint, sizes: ReadonlyMap<string, readonly [number, number]>): string | undefined {
  let chosen: ProjectedMapStamp | undefined;
  for (const stamp of stamps) {
    if (stamp.l <= -50 || chosen && (stamp.l < chosen.l || stamp.l === chosen.l && stamp.id < chosen.id)) continue;
    const size = sizes.get(stamp.asset);
    if (!size) continue;
    const dx = point[0] - stamp.x, dy = point[1] - stamp.y, cos = Math.cos(stamp.r), sin = Math.sin(stamp.r);
    if (Math.abs(dx * cos + dy * sin) <= size[0] * stamp.s / 2 && Math.abs(-dx * sin + dy * cos) <= size[1] * stamp.s / 2) chosen = stamp;
  }
  return chosen?.id;
}
