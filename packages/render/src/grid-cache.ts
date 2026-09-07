// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import type { TacticalGrid } from "@chronicle/szene";
import type { MapCamera, MapPoint } from "./model.ts";
import { visibleGridLines } from "./tactical-geometry.ts";

const EMPTY: readonly (readonly MapPoint[])[] = [];
function sameGrid(a: TacticalGrid | undefined, b: TacticalGrid | undefined): boolean {
  if (!a || !b || a.kind === "none" || b.kind === "none") return a?.kind === b?.kind;
  return a.kind === b.kind && a.size === b.size && a.origin[0] === b.origin[0] && a.origin[1] === b.origin[1]
    && (a.kind !== "hex" || b.kind !== "hex" || (a.orientation === b.orientation && a.offset === b.offset));
}

/** A single bounded viewport window, containing only presentation grid geometry.
 * Returning the retained array lets the renderer skip path construction entirely.
 * World paths/knowledge remain outside this cache. */
export function createGridGeometryCache() {
  let previousGrid: TacticalGrid | undefined, width = 0, height = 0;
  let cached = EMPTY, x0 = 0, y0 = 0, x1 = 0, y1 = 0, limited = false;
  return {
    lines(size: MapPoint, viewport: MapPoint, camera: MapCamera, grid: TacticalGrid | undefined): readonly (readonly MapPoint[])[] {
      if (!grid || grid.kind === "none" || grid.size * camera.scale < 10) return EMPTY;
      const left = Math.max(0, -camera.x / camera.scale), top = Math.max(0, -camera.y / camera.scale);
      const right = Math.min(size[0], (viewport[0] - camera.x) / camera.scale), bottom = Math.min(size[1], (viewport[1] - camera.y) / camera.scale);
      if (left >= right || top >= bottom) return EMPTY;
      if (width === size[0] && height === size[1] && sameGrid(previousGrid, grid)
        && left >= x0 && top >= y0 && right <= x1 && bottom <= y1
        && (!limited || (left === x0 && top === y0 && right === x1 && bottom === y1))) return cached;

      // Cell-aligned padding avoids rebuilding at every pointer delta. The
      // existing 2048-path cap still applies; overflowing windows use exact bounds.
      const s = grid.size, [ox, oy] = grid.origin;
      x0 = Math.max(0, ox + (Math.floor((left - ox) / s) - 1) * s);
      y0 = Math.max(0, oy + (Math.floor((top - oy) / s) - 1) * s);
      x1 = Math.min(size[0], ox + (Math.ceil((right - ox) / s) + 1) * s);
      y1 = Math.min(size[1], oy + (Math.ceil((bottom - oy) / s) + 1) * s);
      cached = visibleGridLines(size, [(x1 - x0) * camera.scale, (y1 - y0) * camera.scale], { x: -x0 * camera.scale, y: -y0 * camera.scale, scale: camera.scale }, grid);
      limited = cached.length >= 2048;
      if (limited) { cached = visibleGridLines(size, viewport, camera, grid); x0 = left; y0 = top; x1 = right; y1 = bottom; }
      width = size[0]; height = size[1]; previousGrid = { ...grid, origin: [grid.origin[0], grid.origin[1]] };
      return cached;
    },
  };
}
