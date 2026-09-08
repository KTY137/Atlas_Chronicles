// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import type { MapPoint, ProjectedMapStamp } from "./model.ts";

/** Editor-only picking uses the visible bitmap footprint, including rotation and layer order. */
export function hitTestStamp(stamps: readonly ProjectedMapStamp[], point: MapPoint, sizes: ReadonlyMap<string, readonly [number, number]>): string | undefined {
  let chosen: ProjectedMapStamp | undefined;
  for (const stamp of stamps) {
    if (stamp.l <= -50 || chosen && stamp.l < chosen.l) continue;
    const size = sizes.get(stamp.asset);
    if (!size) continue;
    const dx = point[0] - stamp.x, dy = point[1] - stamp.y, cos = Math.cos(stamp.r), sin = Math.sin(stamp.r);
    if (Math.abs(dx * cos + dy * sin) <= size[0] * stamp.s / 2 && Math.abs(-dx * sin + dy * cos) <= size[1] * stamp.s / 2) chosen = stamp;
  }
  return chosen?.id;
}
