// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import type { TacticalGrid } from "@chronicle/szene";
import { normalizeCamera, screenToMap } from "./geometry.ts";
import type { MapCamera, MapPoint, MapRasterTile } from "./model.ts";

/** World extent assigned to decoded raster texels (separate from the clipped map bounds). */
export function rasterTileDisplaySize(tile: Pick<MapRasterTile, "width" | "height" | "pixelScale">, pixels: MapPoint): MapPoint {
  if (![...pixels, tile.pixelScale].every(v => Number.isFinite(v) && v > 0)) throw new Error("invalid raster pixel scale");
  // Keep every complete texel at the declared LOD scale. The last partial texel
  // is cropped by the map's mask, never compressed into its remaining width.
  return [pixels[0] * tile.pixelScale, pixels[1] * tile.pixelScale];
}

type RasterTileShape = Pick<MapRasterTile, "id" | "left" | "top" | "width" | "height" | "pixelScale"> & { readonly image: { readonly width: number; readonly height: number } };
/** The admission rule of `setRasterTiles`, pure, so a caller can lay tiles out against the same rule. */
export function rasterTilesFit(size: MapPoint, tiles: readonly RasterTileShape[]): boolean {
  return tiles.length <= 128 && new Set(tiles.map(t => t.id)).size === tiles.length && tiles.every(t => [t.left, t.top, t.width, t.height, t.pixelScale].every(Number.isFinite)
    && t.left >= 0 && t.top >= 0 && t.width > 0 && t.height > 0 && t.pixelScale >= 1 && t.pixelScale <= 32768 && Number.isInteger(Math.log2(t.pixelScale))
    && t.left + t.width <= size[0] && t.top + t.height <= size[1] && t.image.width === Math.ceil(t.width / t.pixelScale) && t.image.height === Math.ceil(t.height / t.pixelScale)
    && t.image.width <= 1024 && t.image.height <= 1024);
}

/** One tile of a picture laid over a whole map: its cut-out in the scaled picture and its world rectangle. */
export interface ImageRasterTile { readonly id: string; readonly sx: number; readonly sy: number; readonly sw: number; readonly sh: number; readonly left: number; readonly top: number; readonly width: number; readonly height: number; readonly pixelScale: number }
export interface ImageRasterLayout { readonly pixelScale: number; readonly bitmap: MapPoint; readonly tiles: readonly ImageRasterTile[] }
/**
 * A single picture stretched over the map's own extent, cut into tiles `rasterTilesFit` admits.
 * The picture is scaled to at most `maxEdge` pixels on its longer side at a power-of-two pitch;
 * fractional map sizes are floored so no tile reaches past the edge.
 */
export function imageRasterLayout(size: MapPoint, maxEdge = 2048, tileEdge = 1024): ImageRasterLayout {
  const [width, height] = size.map(v => Number.isFinite(v) ? Math.floor(v) : 0) as [number, number];
  if (width < 1 || height < 1) return { pixelScale: 1, bitmap: [0, 0], tiles: [] };
  let pixelScale = 1;
  while (Math.ceil(Math.max(width, height) / pixelScale) > maxEdge && pixelScale < 32768) pixelScale *= 2;
  const bitmap: MapPoint = [Math.ceil(width / pixelScale), Math.ceil(height / pixelScale)], tiles: ImageRasterTile[] = [];
  for (let sy = 0; sy < bitmap[1]; sy += tileEdge) for (let sx = 0; sx < bitmap[0]; sx += tileEdge) {
    const left = sx * pixelScale, top = sy * pixelScale;
    tiles.push({ id: `${sx}:${sy}`, sx, sy, sw: Math.min(tileEdge, bitmap[0] - sx), sh: Math.min(tileEdge, bitmap[1] - sy),
      left, top, width: Math.min(tileEdge * pixelScale, width - left), height: Math.min(tileEdge * pixelScale, height - top), pixelScale });
  }
  return { pixelScale, bitmap, tiles };
}

export interface VisibleTile { readonly level: number; readonly x: number; readonly y: number; readonly left: number; readonly top: number; readonly width: number; readonly height: number }
/** Requests are chosen from the viewport, never from private geometry or source assets. */
export function visibleMapTiles(size: MapPoint, viewport: MapPoint, camera: MapCamera, pixelRatio = 1, tileSize = 256): VisibleTile[] {
  if (![...size, ...viewport, pixelRatio, tileSize].every(v => Number.isFinite(v) && v > 0) || !Number.isInteger(tileSize)) throw new Error("invalid tile viewport");
  const view = normalizeCamera(camera), maxLevel = Math.max(0, Math.ceil(Math.log2(Math.max(...size) / tileSize)));
  let level = Math.max(0, Math.min(maxLevel, Math.floor(Math.log2(1 / (view.scale * Math.min(pixelRatio, 2))))));
  const [left, top] = screenToMap([0, 0], view), [right, bottom] = screenToMap(viewport, view);
  if (left >= size[0] || top >= size[1] || right <= 0 || bottom <= 0) return [];
  const range = (l: number) => {
    const span = tileSize * 2 ** l;
    return { span, x0: Math.floor(Math.max(0, left) / span), y0: Math.floor(Math.max(0, top) / span),
      x1: Math.ceil(Math.min(size[0], right) / span) - 1, y1: Math.ceil(Math.min(size[1], bottom) / span) - 1 };
  };
  while (level < maxLevel) { const r = range(level); if ((r.x1 - r.x0 + 1) * (r.y1 - r.y0 + 1) <= 128) break; level++; }
  const r = range(level), tiles: VisibleTile[] = [];
  for (let y = r.y0; y <= r.y1; y++) for (let x = r.x0; x <= r.x1; x++) tiles.push({ level, x, y, left: x * r.span, top: y * r.span,
    width: Math.min(r.span, size[0] - x * r.span), height: Math.min(r.span, size[1] - y * r.span) });
  return tiles;
}

/** The square origin is a grid intersection; the hex origin is the (0,0) cell centre. */
export function snapMapPoint(point: MapPoint, grid: TacticalGrid): MapPoint {
  if (!point.every(Number.isFinite)) throw new Error("invalid snap point");
  if (grid.kind === "none") return [...point];
  const [x, y] = [point[0] - grid.origin[0], point[1] - grid.origin[1]], s = grid.size;
  if (!(s > 0) || !Number.isFinite(s)) throw new Error("invalid grid size");
  if (grid.kind === "square") return [grid.origin[0] + (Math.floor(x / s) + .5) * s, grid.origin[1] + (Math.floor(y / s) + .5) * s];
  // Axial cube rounding is independent of the odd/even offset used to label cells.
  const q = grid.orientation === "pointy" ? (Math.sqrt(3) / 3 * x - y / 3) / s : 2 * x / (3 * s);
  const r = grid.orientation === "pointy" ? 2 * y / (3 * s) : (-x / 3 + Math.sqrt(3) / 3 * y) / s;
  let a = Math.round(q), b = Math.round(-q - r), c = Math.round(r);
  const da = Math.abs(a - q), db = Math.abs(b + q + r), dc = Math.abs(c - r);
  if (da > db && da > dc) a = -b - c; else if (db > dc) b = -a - c; else c = -a - b;
  return grid.orientation === "pointy" ? [grid.origin[0] + s * Math.sqrt(3) * (a + c / 2), grid.origin[1] + s * 1.5 * c]
    : [grid.origin[0] + s * 1.5 * a, grid.origin[1] + s * Math.sqrt(3) * (c + a / 2)];
}

/** Bounded, camera-dependent grid overlay. Geometry remains only a presentation aid. */
export function visibleGridLines(size: MapPoint, viewport: MapPoint, camera: MapCamera, grid: TacticalGrid): readonly (readonly MapPoint[])[] {
  if (grid.kind === "none" || grid.size * camera.scale < 10) return [];
  const p = screenToMap([0, 0], camera), end = screenToMap(viewport, camera);
  const bounds = [Math.max(0, p[0]), Math.max(0, p[1]), Math.min(size[0], end[0]), Math.min(size[1], end[1])] as const;
  if (bounds[0] >= bounds[2] || bounds[1] >= bounds[3]) return [];
  const lines: MapPoint[][] = [], s = grid.size, [ox, oy] = grid.origin;
  if (grid.kind === "square") {
    for (let x = ox + Math.ceil((bounds[0] - ox) / s) * s; x <= bounds[2] && lines.length < 2048; x += s) lines.push([[x, bounds[1]], [x, bounds[3]]]);
    for (let y = oy + Math.ceil((bounds[1] - oy) / s) * s; y <= bounds[3] && lines.length < 2048; y += s) lines.push([[bounds[0], y], [bounds[2], y]]);
  } else {
    const pointy = grid.orientation === "pointy", dx = pointy ? Math.sqrt(3) * s : 1.5 * s, dy = pointy ? 1.5 * s : Math.sqrt(3) * s;
    // Whole plane lattice is the same for even/odd indexing; offset only names its cells.
    for (let row = Math.floor((bounds[1] - oy) / dy) - 1; row <= Math.ceil((bounds[3] - oy) / dy) + 1 && lines.length < 2048; row++) {
      for (let col = Math.floor((bounds[0] - ox) / dx) - 1; col <= Math.ceil((bounds[2] - ox) / dx) + 1 && lines.length < 2048; col++) {
        const cx = ox + col * dx + (pointy && Math.abs(row % 2) ? dx / 2 : 0), cy = oy + row * dy + (!pointy && Math.abs(col % 2) ? dy / 2 : 0);
        const vertices: MapPoint[] = Array.from({ length: 7 }, (_, i) => { const angle = (i * 60 + (pointy ? -30 : 0)) * Math.PI / 180; return [cx + s * Math.cos(angle), cy + s * Math.sin(angle)]; });
        lines.push(vertices);
      }
    }
  }
  return lines;
}
