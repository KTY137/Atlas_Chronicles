// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import type { MapCamera, MapHit, MapPoint, ProjectedMapPin, ProjectedMapScene, ProjectedMapToken } from "./model.ts";

const PIN_ICONS = new Set(["place", "city", "castle", "cave", "ruin", "portal"]);
/** CSS-pixel envelope shared by vector badges and picking, independent of map scale. */
export function mapPinHitRadius(pin: Pick<ProjectedMapPin, "icon">): number {
  return pin.icon === undefined ? 7 : 12;
}

export function retainsTokenDrag(initial: ProjectedMapToken, current: ProjectedMapToken | undefined): boolean {
  return !!current?.movable && current.id === initial.id && current.revision === initial.revision
    && current.x === initial.x && current.y === initial.y && current.radius === initial.radius;
}

export const MIN_MAP_SCALE = 0.000001;
export const MAX_MAP_SCALE = 128;
function finite(value: number, label: string): number {
  if (!Number.isFinite(value)) throw new Error(`${label} must be finite`);
  return value;
}
export function normalizeCamera(camera: MapCamera): MapCamera {
  if (finite(camera.scale, "camera.scale") <= 0) throw new Error("camera.scale must be positive");
  return { x: finite(camera.x, "camera.x"), y: finite(camera.y, "camera.y"), scale: Math.min(MAX_MAP_SCALE, Math.max(MIN_MAP_SCALE, camera.scale)) };
}
export function screenToMap(point: MapPoint, camera: MapCamera): MapPoint {
  return [(point[0] - camera.x) / camera.scale, (point[1] - camera.y) / camera.scale];
}
export function mapToScreen(point: MapPoint, camera: MapCamera): MapPoint {
  return [point[0] * camera.scale + camera.x, point[1] * camera.scale + camera.y];
}
export function fitCamera(size: MapPoint, viewport: MapPoint, padding = 24): MapCamera {
  for (const value of [...size, ...viewport]) if (!Number.isFinite(value) || value <= 0) throw new Error("map and viewport dimensions must be positive");
  if (!Number.isFinite(padding) || padding < 0) throw new Error("padding must be nonnegative");
  const scale = Math.min(MAX_MAP_SCALE, Math.max(MIN_MAP_SCALE, Math.min((Math.max(1, viewport[0] - padding * 2)) / size[0], Math.max(1, viewport[1] - padding * 2) / size[1])));
  return normalizeCamera({ x: (viewport[0] - size[0] * scale) / 2, y: (viewport[1] - size[1] * scale) / 2, scale });
}
export function zoomCamera(camera: MapCamera, factor: number, anchor: MapPoint): MapCamera {
  if (!Number.isFinite(factor) || factor <= 0) throw new Error("zoom factor must be positive");
  if (!anchor.every(Number.isFinite)) throw new Error("zoom anchor must be finite");
  const old = normalizeCamera(camera);
  const location = screenToMap(anchor, old);
  const scale = Math.min(MAX_MAP_SCALE, Math.max(MIN_MAP_SCALE, old.scale * factor));
  return { x: anchor[0] - location[0] * scale, y: anchor[1] - location[1] * scale, scale };
}

/** Includes polygon edges and vertices, so adjacent cells have deterministic boundary hits. */
export function pointInPolygon(point: MapPoint, polygon: readonly MapPoint[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[j]!;
    const b = polygon[i]!;
    const cross = (point[0] - a[0]) * (b[1] - a[1]) - (point[1] - a[1]) * (b[0] - a[0]);
    if (Math.abs(cross) < 1e-8 && point[0] >= Math.min(a[0], b[0]) && point[0] <= Math.max(a[0], b[0]) && point[1] >= Math.min(a[1], b[1]) && point[1] <= Math.max(a[1], b[1])) return true;
    if ((a[1] > point[1]) !== (b[1] > point[1]) && point[0] < ((b[0] - a[0]) * (point[1] - a[1])) / (b[1] - a[1]) + a[0]) inside = !inside;
  }
  return inside;
}
export function hitTestMap(scene: ProjectedMapScene, camera: MapCamera, screen: MapPoint): MapHit | null {
  const near = (x: number, y: number, radius: number): boolean => {
    const p = mapToScreen([x, y], camera);
    return Math.hypot(screen[0] - p[0], screen[1] - p[1]) <= radius;
  };
  // Last-drawn entities win; tokens overlay pins, which overlay geography.
  const tokens = scene.tokens ?? [];
  for (let i = tokens.length - 1; i >= 0; i--) {
    const t = tokens[i]!;
    if (near(t.x, t.y, t.radius ?? 11)) return { kind: "token", id: t.id };
  }
  for (let i = scene.pins.length - 1; i >= 0; i--) {
    const p = scene.pins[i]!;
    if (near(p.x, p.y, mapPinHitRadius(p))) return { kind: "pin", id: p.id };
  }
  const point = screenToMap(screen, camera);
  if (point[0] < 0 || point[1] < 0 || point[0] > scene.width || point[1] > scene.height) return null;
  for (let i = scene.cells.length - 1; i >= 0; i--) {
    const c = scene.cells[i]!;
    if (pointInPolygon(point, c.polygon)) return { kind: "cell", id: c.id };
  }
  return null;
}

/** Geometry/resource validation only. It deliberately makes no authorization decision. */
export function validateMapScene(scene: ProjectedMapScene): void {
  if (!scene.id || typeof scene.id !== "string") throw new Error("scene.id is required");
  if (![scene.width, scene.height].every((v) => Number.isFinite(v) && v > 0 && v <= 1_000_000)) throw new Error("invalid scene dimensions");
  if (!Array.isArray(scene.cells) || !Array.isArray(scene.pins) || (scene.tokens !== undefined && !Array.isArray(scene.tokens))) throw new Error("scene collections must be arrays");
  if (scene.cells.length > 100_000 || scene.pins.length > 20_000 || (scene.tokens?.length ?? 0) > 20_000) throw new Error("scene resource limit exceeded");
  const identities = new Set<string>();
  const id = (kind: string, value: string): void => {
    if (!value || typeof value !== "string") throw new Error("entity.id is required");
    const key = `${kind}:${value}`;
    if (identities.has(key)) throw new Error("duplicate entity identity");
    identities.add(key);
  };
  const color = (value: number | undefined): void => { if (value !== undefined && (!Number.isInteger(value) || value < 0 || value > 0xffffff)) throw new Error("invalid color"); };
  if (scene.rasterScope !== undefined && (typeof scene.rasterScope !== "string" || scene.rasterScope.length > 512)) throw new Error("invalid raster scope");
  if (scene.rasterSampling !== undefined && scene.rasterSampling !== "nearest" && scene.rasterSampling !== "linear") throw new Error("invalid raster sampling");
  if (scene.grid && scene.grid.kind !== "none") {
    if (!["square", "hex"].includes(scene.grid.kind) || !Number.isFinite(scene.grid.size) || scene.grid.size <= 0 || scene.grid.origin.length !== 2 || !scene.grid.origin.every(Number.isFinite)) throw new Error("invalid grid");
    if (scene.grid.kind === "hex" && (!["pointy", "flat"].includes(scene.grid.orientation) || !["even", "odd"].includes(scene.grid.offset))) throw new Error("invalid hex grid");
  }
  if (scene.lines && (!Array.isArray(scene.lines) || scene.lines.length > 20_000)) throw new Error("invalid map lines");
  let vertices = 0;
  for (const line of scene.lines ?? []) {
    id("line", line.id); color(line.color); vertices += line.points.length;
    if (line.points.length < 2 || vertices > 1_000_000 || line.points.some((p: MapPoint) => p.length !== 2 || !p.every(Number.isFinite))) throw new Error("invalid map line");
  }
  for (const cell of scene.cells) {
    id("cell", cell.id);
    if (!Array.isArray(cell.polygon) || cell.polygon.length < 3) throw new Error("polygon needs at least three vertices");
    vertices += cell.polygon.length;
    if (vertices > 1_000_000) throw new Error("polygon resource limit exceeded");
    for (const point of cell.polygon) if (point.length !== 2 || !point.every(Number.isFinite)) throw new Error("invalid polygon coordinate");
    color(cell.fill);
  }
  for (const [kind, rows] of [["pin", scene.pins], ["token", scene.tokens ?? []]] as const) for (const item of rows) {
    id(kind, item.id);
    if (![item.x, item.y].every(Number.isFinite) || typeof item.label !== "string" || item.label.length > 4096) throw new Error("invalid map marker");
    color(item.color);
    if ("radius" in item && item.radius !== undefined && (!Number.isFinite(item.radius) || item.radius <= 0 || item.radius > 100)) throw new Error("invalid token radius");
    if ("revision" in item && item.revision !== undefined && (!Number.isSafeInteger(item.revision) || item.revision < 1)) throw new Error("invalid token revision");
  }
  for (const pin of scene.pins) if (pin.icon !== undefined && !PIN_ICONS.has(pin.icon)) throw new Error("invalid map pin icon");
}
