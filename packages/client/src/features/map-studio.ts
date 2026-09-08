// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import type { TacticalMapDocumentV1, TacticalPoint } from "@chronicle/szene";

export type InteriorTarget = { kind: "room" | "wall" | "portal"; id: string };
export function snapPoint(point: TacticalPoint, size: number, enabled: boolean, origin: TacticalPoint = [0, 0]): TacticalPoint {
  return enabled ? [origin[0] + Math.round((point[0] - origin[0]) / size) * size, origin[1] + Math.round((point[1] - origin[1]) / size) * size] : point;
}
const distanceToSegment = (point: TacticalPoint, a: TacticalPoint, b: TacticalPoint) => {
  const dx = b[0] - a[0], dy = b[1] - a[1], length = dx * dx + dy * dy;
  const t = length ? Math.max(0, Math.min(1, ((point[0] - a[0]) * dx + (point[1] - a[1]) * dy) / length)) : 0;
  return Math.hypot(point[0] - a[0] - t * dx, point[1] - a[1] - t * dy);
};
export function interiorHit(document: TacticalMapDocumentV1, point: TacticalPoint, tolerance: number): InteriorTarget | null {
  let selected: InteriorTarget | null = null, distance = tolerance;
  for (const portal of document.portals) {
    const next = distanceToSegment(point, ...portal.bounds);
    if (next <= distance) { distance = next; selected = { kind: "portal", id: portal.id }; }
  }
  if (selected) return selected;
  for (const wall of document.walls) for (let index = 1; index < wall.points.length; index++) {
    const next = distanceToSegment(point, wall.points[index - 1]!, wall.points[index]!);
    if (next <= distance) { distance = next; selected = { kind: "wall", id: wall.id }; }
  }
  return selected;
}
