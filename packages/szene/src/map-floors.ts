// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { canonicalJson, type CanonicalValue } from "@chronicle/core";
import { parseBoundedMapJson, type TacticalMapDocumentV1, type TacticalPoint } from "./tactical-map.ts";

/** Floors refer to ordinary maps. Their scalar elevations and immutable map documents are
 * not overloaded with containment or permission data. A link is travel, never containment. */
export const MAP_FLOOR_LIMITS = Object.freeze({ floors: 16, links: 64, minLevel: -8, maxLevel: 32 });
export type MapFloorLinkKind = "stairs" | "lift" | "opening";
export interface MapFloor { readonly mapId: string; readonly level: number; readonly name: string }
export interface MapFloorLink {
  readonly id: string; readonly name: string; readonly kind: MapFloorLinkKind;
  readonly fromMapId: string; readonly toMapId: string;
  readonly fromRegionId: string; readonly toRegionId: string;
  /** Both maps use the same coordinate frame: one physical shaft, one pair of coordinates. */
  readonly position: TacticalPoint;
}
export interface MapFloorStack {
  readonly schemaVersion: 1; readonly rootMapId: string;
  readonly floors: readonly MapFloor[]; readonly links: readonly MapFloorLink[];
}
export class MapFloorValidationError extends Error { override readonly name = "MapFloorValidationError"; }
function fail(): never { throw new MapFloorValidationError("Bitte Geschosse, Raumanbindungen und Übergänge prüfen."); }
const text = (v: unknown, max: number): v is string => typeof v === "string" && v.length <= max && !!v.trim() && !/[\u0000-\u001f\u007f-\u009f]/u.test(v);
function closed(v: unknown, keys: readonly string[]): asserts v is Record<string, unknown> {
  if (!v || typeof v !== "object" || Array.isArray(v) || Object.keys(v).length !== keys.length || Object.keys(v).some(k => !keys.includes(k))) fail();
}
export function parseMapFloorStack(input: unknown): MapFloorStack {
  const v = parseBoundedMapJson(input, 128 * 1024);
  closed(v, ["schemaVersion", "rootMapId", "floors", "links"]);
  if (v.schemaVersion !== 1 || !text(v.rootMapId, 128) || !Array.isArray(v.floors) || !v.floors.length || v.floors.length > MAP_FLOOR_LIMITS.floors
    || !Array.isArray(v.links) || v.links.length > MAP_FLOOR_LIMITS.links) fail();
  const maps = new Map<string, number>(), levels = new Set<number>(), ids = new Set<string>();
  for (const f of v.floors) {
    closed(f, ["mapId", "level", "name"]);
    if (!text(f.mapId, 128) || !text(f.name, 160) || !Number.isSafeInteger(f.level) || (f.level as number) < MAP_FLOOR_LIMITS.minLevel || (f.level as number) > MAP_FLOOR_LIMITS.maxLevel
      || maps.has(f.mapId) || levels.has(f.level as number)) fail();
    maps.set(f.mapId, f.level as number); levels.add(f.level as number);
  }
  if (maps.get(v.rootMapId) !== 0) fail();
  for (const link of v.links) {
    closed(link, ["id", "name", "kind", "fromMapId", "toMapId", "fromRegionId", "toRegionId", "position"]);
    if (!text(link.id, 128) || ids.has(link.id) || !text(link.name, 160) || !["stairs", "lift", "opening"].includes(link.kind as string)
      || !maps.has(link.fromMapId as string) || !maps.has(link.toMapId as string) || link.fromMapId === link.toMapId
      || !text(link.fromRegionId, 256) || !text(link.toRegionId, 256) || !Array.isArray(link.position) || link.position.length !== 2
      || link.position.some(n => typeof n !== "number" || !Number.isFinite(n) || n < 0 || n > 32768)
      || link.kind !== "lift" && Math.abs(maps.get(link.fromMapId as string)! - maps.get(link.toMapId as string)!) !== 1) fail();
    ids.add(link.id);
  }
  const stack = v as unknown as MapFloorStack;
  return { ...stack, floors: [...stack.floors].sort((a, b) => a.level - b.level), links: [...stack.links].sort((a, b) => a.id.localeCompare(b.id, "en")) };
}
/** Strictly inside: a stair anchor on a wall or outside its named room is not a landing. */
export function floorPointInside(point: TacticalPoint, polygon: readonly TacticalPoint[]): boolean {
  const [x, y] = point; let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[j]!, b = polygon[i]!;
    const cross = (x - a[0]) * (b[1] - a[1]) - (y - a[1]) * (b[0] - a[0]);
    if (Math.abs(cross) < 1e-7 && x >= Math.min(a[0], b[0]) && x <= Math.max(a[0], b[0]) && y >= Math.min(a[1], b[1]) && y <= Math.max(a[1], b[1])) return false;
    if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
  }
  return inside;
}
/** A scanline interior anchor works for concave rooms too; never guess from a bounding box. */
export function floorRoomAnchor(points: readonly TacticalPoint[]): TacticalPoint {
  if (points.length < 3) return fail();
  const ys = [...new Set(points.map(p => p[1]))].sort((a, b) => a - b);
  let best: { width: number; point: TacticalPoint } | undefined;
  for (let k = 1; k < ys.length; k++) {
    const y = (ys[k - 1]! + ys[k]!) / 2, xs: number[] = [];
    for (let j = 0; j < points.length; j++) {
      const a = points[j]!, b = points[(j + 1) % points.length]!;
      if ((a[1] > y) !== (b[1] > y)) xs.push(a[0] + (y - a[1]) * (b[0] - a[0]) / (b[1] - a[1]));
    }
    xs.sort((a, b) => a - b);
    for (let i = 1; i < xs.length; i += 2) {
      const width = Math.min(xs[i]! - xs[i - 1]!, ys[k]! - ys[k - 1]!);
      const point: TacticalPoint = [(xs[i]! + xs[i - 1]!) / 2, y];
      if (width > 0 && (!best || width > best.width) && floorPointInside(point, points)) best = { width, point };
    }
  }
  return best?.point ?? fail();
}
export function validateFloorMaps(stack: MapFloorStack, maps: ReadonlyMap<string, TacticalMapDocumentV1>): void {
  const root = maps.get(stack.rootMapId); if (!root) fail();
  const frame = (doc: TacticalMapDocumentV1) => canonicalJson({ size: doc.geometry.size, frame: doc.frame, grid: doc.grid } as unknown as CanonicalValue);
  for (const floor of stack.floors) if (!maps.has(floor.mapId) || frame(maps.get(floor.mapId)!) !== frame(root)) fail();
  for (const link of stack.links) {
    for (const [mapId, regionId] of [[link.fromMapId, link.fromRegionId], [link.toMapId, link.toRegionId]] as const) {
      const map = maps.get(mapId)!, room = map.geometry.regions.find(r => r.id === regionId);
      if (!room || !floorPointInside(link.position, room.punkte) || link.position[0] >= map.geometry.size[0] || link.position[1] >= map.geometry.size[1]) fail();
    }
  }
}
