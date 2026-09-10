// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { textHash } from "@chronicle/core";
import { BAUWERK_TYPEN, parseTacticalMapDocument, type BauwerkTyp, type TacticalMapDocumentV1, type TacticalPoint } from "@chronicle/szene";
import { CARTOGRAPHY_WATER_MATERIALS, TACTICAL_CARTOGRAPHY_LIMITS, RELIEF_LEVELS, flatRelief, parseTacticalCartography, reliefHeightAt, type BuildingIntent, type CartographyReliefV1, type CartographyRegionV1, type CartographyTerrainMaterial, type CartographyWaterMaterial, type TacticalCartographyV1 } from "@chronicle/szene";
import { CARTOGRAPHY_EDIT_LIMITS, CARTOGRAPHY_PATTERNS, solveCartographyPatterns, type Cardinal, type EditLimits, type PatternBoundary, type PatternCell, type PatternPort } from "./cartography-patterns.ts";
import { clipHalbebene, doppelflaeche, flaeche, huelle, imPolygon, q, type Polygon } from "./polygon.ts";

export type QuarterTurns = 0 | 1 | 2 | 3;
export type CartographyEditOperation =
  /** `water` names what the painted water *is* — river, lake or sea. It changes only the role
   * the brush writes, never the module adjacency: for the pattern solver water is water.
   * Absent, it stays a river, which is what every caller before this option painted. */
  | { readonly kind: "terrain"; readonly points: readonly TacticalPoint[]; readonly radius: number; readonly material: CartographyTerrainMaterial | "water"; readonly water?: CartographyWaterMaterial }
  | { readonly kind: "road"; readonly points: readonly TacticalPoint[]; readonly width: number; readonly material: "path" | "street" | "square" }
  | { readonly kind: "building"; readonly at: TacticalPoint; readonly width: number; readonly height: number; readonly quarterTurns?: QuarterTurns; readonly shape?: "rectangle" | "l"; readonly typ: BauwerkTyp; readonly titel: string; readonly requireRoad?: boolean }
  | { readonly kind: "transform"; readonly regionId: string; readonly delta: TacticalPoint; readonly quarterTurns?: QuarterTurns }
  | { readonly kind: "remove"; readonly regionId: string }
  | { readonly kind: "variation"; readonly regionIds: readonly string[] }
  /** The height tool. `raise`/`lower` push the land within the brush, `smooth` averages it,
   * `level` pulls it towards the height under the stroke's first point. `strength` 0..1. A map
   * without relief receives a flat one first, so the tool works on every map. */
  | { readonly kind: "relief"; readonly points: readonly TacticalPoint[]; readonly radius: number; readonly mode: "raise" | "lower" | "smooth" | "level"; readonly strength: number };
export const RELIEF_MODES = Object.freeze(["raise", "lower", "smooth", "level"] as const);
export interface CartographyEditInput {
  readonly document: TacticalMapDocumentV1;
  readonly cartography: TacticalCartographyV1;
  readonly protectedRegionIds: readonly string[];
  readonly operation: CartographyEditOperation;
  readonly seed: string;
  readonly operationId: string;
  readonly limits?: Partial<EditLimits>;
}
export type CartographyEditResult =
  | { readonly ok: true; readonly document: TacticalMapDocumentV1; readonly cartography: TacticalCartographyV1;
      readonly addedBuildings: readonly BuildingIntent[]; readonly removedRegionIds: readonly string[];
      readonly removedStampIds: readonly string[]; readonly changedRegionIds: readonly string[]; readonly diagnostics: readonly string[] }
  | { readonly ok: false; readonly code: "contradiction" | "budget" | "protected" | "invalid"; readonly regionIds: readonly string[]; readonly message: string };
class EditFailure extends Error {
  constructor(readonly code: "contradiction" | "budget" | "protected" | "invalid", message: string, readonly regionIds: readonly string[] = []) { super(message); }
}
function reject(code: EditFailure["code"], message: string, ids: readonly string[] = []): never { throw new EditFailure(code, message, ids); }
const rect = (left: number, top: number, right: number, bottom: number): Polygon => [[left, top], [right, top], [right, bottom], [left, bottom]];
const finitePoint = (point: TacticalPoint) => Array.isArray(point) && point.length === 2 && point.every(Number.isFinite);
const positive = (value: number) => Number.isFinite(value) && value > 0;
const turning = (value: number | undefined) => value === undefined || [0, 1, 2, 3].includes(value);
const common = (regionId: string) => ({ regionId, authored: true, locked: false, provenance: null });
/** Continuous arms end at the exact module edge; absent ports end inside the module. */
export function networkFootprint(x: number, y: number, size: number, width: number, mask: number): Polygon {
  const half = Math.min(size, width) / 2, xl = x + size / 2 - half, xr = x + size / 2 + half, yt = y + size / 2 - half, yb = y + size / 2 + half;
  const points: TacticalPoint[] = [[xl, yt]];
  points.push(...(mask & 1 ? [[xl, y], [xr, y], [xr, yt]] : [[xr, yt]]) as TacticalPoint[]);
  points.push(...(mask & 2 ? [[x + size, yt], [x + size, yb], [xr, yb]] : [[xr, yb]]) as TacticalPoint[]);
  points.push(...(mask & 4 ? [[xr, y + size], [xl, y + size], [xl, yb]] : [[xl, yb]]) as TacticalPoint[]);
  points.push(...(mask & 8 ? [[x, yb], [x, yt], [xl, yt]] : [[xl, yt]]) as TacticalPoint[]);
  return points.slice(0, -1).filter((point, i) => !i || point[0] !== points[i - 1]![0] || point[1] !== points[i - 1]![1]).map(point => [q(point[0]), q(point[1])] as const);
}
function rotate(point: TacticalPoint, center: TacticalPoint, turns: QuarterTurns): TacticalPoint {
  const x = point[0] - center[0], y = point[1] - center[1];
  const offset: TacticalPoint = turns === 0 ? [x, y] : turns === 1 ? [-y, x] : turns === 2 ? [-x, -y] : [y, -x];
  return [q(center[0] + offset[0]), q(center[1] + offset[1])];
}
function clipped(a: Polygon, b: Polygon): Polygon {
  let intersection = a;
  const sign = Math.sign(doppelflaeche(b));
  for (let i = 0; i < b.length && intersection.length; i++) {
    const p = b[i]!, n = b[(i + 1) % b.length]!, nx = sign * (n[1] - p[1]), ny = sign * (p[0] - n[0]);
    intersection = clipHalbebene(intersection, nx, ny, nx * p[0] + ny * p[1]);
  }
  return intersection;
}
function intersects(a: Polygon, b: Polygon): boolean {
  const boxA = huelle(a), boxB = huelle(b);
  if (boxA[2] <= boxB[0] + .001 || boxB[2] <= boxA[0] + .001 || boxA[3] <= boxB[1] + .001 || boxB[3] <= boxA[1] + .001) return false;
  // Area clipping also catches partially overlapping collinear edges. Strict vertex
  // samples alone miss two equally tall rectangles shifted sideways by half a roof.
  if (convex(b)) {
    return flaeche(clipped(a, b)) > .001;
  }
  if (convex(a)) return intersects(b, a);
  // Vertex samples include edges and centroid, so touching edges alone do not collide.
  const inside = (point: TacticalPoint, polygon: Polygon) => imPolygon(point, polygon) && polygon.every((p, i) => {
    const n = polygon[(i + 1) % polygon.length]!;
    return Math.abs((n[0] - p[0]) * (point[1] - p[1]) - (n[1] - p[1]) * (point[0] - p[0])) > .001
      || point[0] < Math.min(p[0], n[0]) || point[0] > Math.max(p[0], n[0]) || point[1] < Math.min(p[1], n[1]) || point[1] > Math.max(p[1], n[1]);
  });
  if (a.some(p => inside(p, b)) || b.some(p => inside(p, a))) return true;
  for (let i = 0; i < a.length; i++) for (let j = 0; j < b.length; j++) {
    const p = a[i]!, n = a[(i + 1) % a.length]!, t = b[j]!, u = b[(j + 1) % b.length]!;
    const cross = (x: TacticalPoint, y: TacticalPoint, z: TacticalPoint) => (y[0] - x[0]) * (z[1] - x[1]) - (y[1] - x[1]) * (z[0] - x[0]);
    if (cross(p, n, t) * cross(p, n, u) < -1e-9 && cross(t, u, p) * cross(t, u, n) < -1e-9) return true;
  }
  return inside([(boxA[0] + boxA[2]) / 2, (boxA[1] + boxA[3]) / 2], b) || inside([(boxB[0] + boxB[2]) / 2, (boxB[1] + boxB[3]) / 2], a);
}
/** Subtract an axis-aligned brush module without editing points outside it. */
function subtractBox(polygon: Polygon, box: readonly [number, number, number, number]): Polygon[] {
  let inside = polygon; const outside: Polygon[] = [];
  for (const [nx, ny, c] of [[-1, 0, -box[0]], [1, 0, box[2]], [0, -1, -box[1]], [0, 1, box[3]]] as const) {
    const part = clipHalbebene(inside, -nx, -ny, -c).map(p => [q(p[0]), q(p[1])] as const);
    if (part.length >= 3 && flaeche(part) > .001) outside.push(part);
    inside = clipHalbebene(inside, nx, ny, c); if (!inside.length) break;
  }
  return outside;
}
function convex(polygon: Polygon): boolean {
  let sign = 0;
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i]!, b = polygon[(i + 1) % polygon.length]!, c = polygon[(i + 2) % polygon.length]!;
    const cross = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]);
    if (Math.abs(cross) < .001) continue;
    if (sign && Math.sign(cross) !== sign) return false; sign = Math.sign(cross);
  }
  return sign !== 0;
}
/** Bounded ear clipping lets ordinary concave woodland and road turns use the same brush. */
function convexParts(polygon: Polygon, spend: () => void): Polygon[] {
  if (convex(polygon)) return [polygon];
  const cross = (a: TacticalPoint, b: TacticalPoint, c: TacticalPoint) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  const points = polygon.filter((point, i) => { const previous = polygon[(i + polygon.length - 1) % polygon.length]!; return point[0] !== previous[0] || point[1] !== previous[1]; });
  const orientation = Math.sign(doppelflaeche(points)), triangles: Polygon[] = [];
  while (points.length > 3) {
    let found = false;
    for (let i = 0; i < points.length; i++) {
      spend();
      const a = points[(i + points.length - 1) % points.length]!, b = points[i]!, c = points[(i + 1) % points.length]!, turn = cross(a, b, c) * orientation;
      if (Math.abs(turn) < 1e-8) { points.splice(i, 1); found = true; break; }
      if (turn < 0) continue;
      const occupied = points.some((point, index) => {
        spend();
        return index !== i && index !== (i + 1) % points.length && index !== (i + points.length - 1) % points.length
          && cross(a, b, point) * orientation >= -1e-8 && cross(b, c, point) * orientation >= -1e-8 && cross(c, a, point) * orientation >= -1e-8;
      });
      if (occupied) continue;
      triangles.push([a, b, c]); points.splice(i, 1); found = true; break;
    }
    if (!found) reject("invalid", "Die Fläche besitzt keinen einfachen, bearbeitbaren Umriss.");
  }
  if (points.length === 3) triangles.push(points);
  return triangles;
}
/** Union only newly painted modules. Shared partial edges cancel after exact subdivision;
 * holes/point-touching components stay separate because native regions have no hole rings. */
function joinedModules(polygons: readonly Polygon[], spend: () => void): Polygon[] | null {
  const segments: { a: TacticalPoint; b: TacticalPoint; line: string; axis: 0 | 1 }[] = [], lines = new Map<string, Set<number>>();
  for (const original of polygons) {
    const polygon = doppelflaeche(original) < 0 ? [...original].reverse() : original;
    for (let i = 0; i < polygon.length; i++) {
      const a = polygon[i]!, b = polygon[(i + 1) % polygon.length]!;
      if (a[0] === b[0] && a[1] === b[1]) continue;
      if (a[0] !== b[0] && a[1] !== b[1]) return null;
      const axis = a[0] === b[0] ? 1 : 0, line = axis ? `v:${a[0]}` : `h:${a[1]}`, values = lines.get(line) ?? new Set<number>();
      values.add(a[axis]); values.add(b[axis]); lines.set(line, values); segments.push({ a, b, line, axis });
    }
  }
  const values = new Map([...lines].map(([key, line]) => [key, [...line].sort((a, b) => a - b)])), edges = new Map<string, { a: TacticalPoint; b: TacticalPoint }>();
  const pointKey = (point: TacticalPoint) => `${point[0]},${point[1]}`;
  for (const segment of segments) {
    const line = values.get(segment.line)!, lo = Math.min(segment.a[segment.axis], segment.b[segment.axis]), hi = Math.max(segment.a[segment.axis], segment.b[segment.axis]);
    let left = 0, right = line.length;
    while (left < right) { spend(); const middle = (left + right) >>> 1; if (line[middle]! < lo) left = middle + 1; else right = middle; }
    for (let i = left; i + 1 < line.length && line[i + 1]! <= hi; i++) {
      spend();
      let a: TacticalPoint = segment.axis ? [segment.a[0], line[i]!] : [line[i]!, segment.a[1]], b: TacticalPoint = segment.axis ? [segment.a[0], line[i + 1]!] : [line[i + 1]!, segment.a[1]];
      if (segment.a[segment.axis] > segment.b[segment.axis]) [a, b] = [b, a];
      const key = `${pointKey(a)}>${pointKey(b)}`, reverse = `${pointKey(b)}>${pointKey(a)}`;
      if (edges.has(reverse)) edges.delete(reverse); else if (edges.has(key)) return null; else edges.set(key, { a, b });
    }
  }
  const outgoing = new Map<string, { a: TacticalPoint; b: TacticalPoint }>();
  for (const edge of edges.values()) { if (outgoing.has(pointKey(edge.a))) return null; outgoing.set(pointKey(edge.a), edge); }
  const result: Polygon[] = [];
  for (const start of [...outgoing.keys()].sort()) {
    if (!outgoing.has(start)) continue;
    const loop: TacticalPoint[] = []; let current = start;
    do { spend(); const edge = outgoing.get(current); if (!edge) return null; loop.push(edge.a); outgoing.delete(current); current = pointKey(edge.b); } while (current !== start);
    if (doppelflaeche(loop) <= .001) return null;
    result.push(loop.filter((point, i) => { const before = loop[(i + loop.length - 1) % loop.length]!, after = loop[(i + 1) % loop.length]!; return (point[0] - before[0]) * (after[1] - point[1]) !== (point[1] - before[1]) * (after[0] - point[0]); }));
  }
  return result;
}

/** One user gesture in, one fully validated document out. Never mutates an input object. */
export function applyCartographyEdit(input: CartographyEditInput): CartographyEditResult {
  try {
    const document = parseTacticalMapDocument(input.document), cartography = parseTacticalCartography(input.cartography, document);
    if (typeof input.seed !== "string" || !input.seed.length || input.seed.length > 1024 || typeof input.operationId !== "string" || !input.operationId.length || input.operationId.length > 128) reject("invalid", "Keim und stabile Bearbeitungs-ID fehlen.");
    const limits = { ...CARTOGRAPHY_EDIT_LIMITS, ...input.limits };
    for (const name of Object.keys(CARTOGRAPHY_EDIT_LIMITS) as (keyof EditLimits)[]) if (!Number.isSafeInteger(limits[name]) || limits[name] < 0 || limits[name] > CARTOGRAPHY_EDIT_LIMITS[name]) reject("invalid", "Ungültiges Bearbeitungsbudget.");
    const protectedIds = new Set(input.protectedRegionIds), roles = new Map(cartography.regions.map(role => [role.regionId, role]));
    let regions = [...document.geometry.regions], stamps = [...document.geometry.stamps], relief: CartographyReliefV1 | undefined = cartography.relief;
    /** Corner samples of a construction cell, for coupling painted water and rock to the land's height. */
    const cellCorners = (base: CartographyReliefV1, cellX: number, cellY: number): number[] => {
      const result: number[] = [];
      for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]] as const) { const i = cellX + dx, j = cellY + dy; if (i >= 0 && j >= 0 && i < base.columns && j < base.rows) result.push(j * base.columns + i); }
      return result;
    };
    const changed = new Set<string>(), removed = new Set<string>(), removedStamps = new Set<string>(), addedBuildings: BuildingIntent[] = [], diagnostics: string[] = [];
    const allIds = new Set([...regions, ...stamps, ...document.geometry.places, ...document.walls, ...document.portals, ...document.lights].map(value => value.id));
    const idFor = (path: string): string => {
      const id = `edit-${textHash(JSON.stringify(["cartography-edit-v1", input.operationId, path])).slice(0, 32)}`;
      if (allIds.has(id)) reject("invalid", "Diese Bearbeitungs-ID wurde für ein vorhandenes Objekt bereits verwendet.");
      allIds.add(id); return id;
    };
    const within = (polygon: Polygon) => polygon.length >= 3 && flaeche(polygon) > .001 && polygon.every(p => finitePoint(p) && p[0] >= 0 && p[1] >= 0 && p[0] <= document.geometry.size[0] && p[1] <= document.geometry.size[1]);
    const region = (id: string) => regions.find(value => value.id === id) ?? reject("invalid", "Die ausgewählte Fläche existiert nicht.", [id]);
    const put = (id: string, points: Polygon, role: CartographyRegionV1) => {
      if (!within(points)) reject("invalid", "Die Fläche liegt außerhalb der Karte oder besitzt keine gültige Größe.", [id]);
      const found = regions.some(value => value.id === id);
      regions = found ? regions.map(value => value.id === id ? { id, punkte: points } : value) : [...regions, { id, punkte: points }];
      roles.set(id, role); changed.add(id);
    };
    const cannotChange = (id: string, variation = false) => roles.get(id)!.locked || variation && (roles.get(id)!.authored || protectedIds.has(id));
    const erase = (id: string) => {
      const role = roles.get(id)!;
      if (role.role === "room") reject("protected", "Entferne Räume mit dem Innenraumwerkzeug, damit Wände, Türen und Einrichtung zusammen erhalten bleiben.", [id]);
      if (protectedIds.has(id) || role.locked) reject("protected", "Dieser Zugang oder diese gesperrte Fläche muss erhalten bleiben.", [id]);
      if ([...roles.values()].some(other => other.role === "building" && (other.lotRegionId === id || other.streetRegionId === id))) reject("protected", "Diese Fläche wird von einem Gebäude als Grundstück oder Zugang benötigt.", [id]);
      for (const stampId of role.role === "building" ? role.attachedStampIds ?? [] : []) removedStamps.add(stampId);
      stamps = stamps.filter(stamp => !removedStamps.has(stamp.id)); regions = regions.filter(value => value.id !== id); roles.delete(id); removed.add(id); changed.add(id);
    };
    const checkBuilding = (points: Polygon, ownId?: string, requireRoad = true) => {
      if (!within(points)) reject("invalid", "Das Gebäude passt nicht auf die Karte.");
      for (const other of regions) if (other.id !== ownId && intersects(points, other.punkte)) {
        const role = roles.get(other.id)!;
        if (role.locked || protectedIds.has(other.id)) reject("protected", "Das Gebäude würde einen geschützten Ort überbauen.", [other.id]);
        if (["building", "room", "water", "road"].includes(role.role)) reject("contradiction", "Das Gebäude überschneidet ein Haus, einen Raum, Wasser oder eine Straße.", [other.id]);
      }
      if (!requireRoad) return undefined;
      const z = cartography.construction.cellSize;
      let closest: { id: string; distance: number } | null = null;
      const roads = regions.filter(value => roles.get(value.id)!.role === "road");
      const rooted = new Set(roads.filter(road => road.punkte.some(([x, y]) => x <= .001 || y <= .001 || x >= document.geometry.size[0] - .001 || y >= document.geometry.size[1] - .001)
        || [...roles.values()].some(role => role.role === "building" && role.streetRegionId === road.id)).map(road => road.id));
      const roadJoins = (a: Polygon, b: Polygon) => {
        if (intersects(a, b)) return true;
        for (let i = 0; i < a.length; i++) for (let j = 0; j < b.length; j++) {
          const p = a[i]!, n = a[(i + 1) % a.length]!, t = b[j]!, u = b[(j + 1) % b.length]!, dx = n[0] - p[0], dy = n[1] - p[1], length = Math.hypot(dx, dy);
          if (length < .001 || Math.abs(dx * (t[1] - p[1]) - dy * (t[0] - p[0])) / length > .002 || Math.abs(dx * (u[1] - p[1]) - dy * (u[0] - p[0])) / length > .002) continue;
          const pt = ((t[0] - p[0]) * dx + (t[1] - p[1]) * dy) / length, pu = ((u[0] - p[0]) * dx + (u[1] - p[1]) * dy) / length;
          if (Math.min(length, Math.max(pt, pu)) - Math.max(0, Math.min(pt, pu)) > z * .01) return true;
        }
        return false;
      };
      const connected = new Map<string, boolean>(); let networkWork = 0;
      const reachable = (id: string): boolean => {
        if (connected.has(id)) return connected.get(id)!;
        const seen = new Set([id]), queue = [roads.find(road => road.id === id)!]; let found = false;
        for (let i = 0; i < queue.length && !found; i++) {
          const current = queue[i]!; if (rooted.has(current.id)) { found = true; break; }
          for (const road of roads) {
            if (++networkWork > limits.propagations) reject("budget", "Das Straßen-Anschlussbudget ist ausgeschöpft.");
            if (!seen.has(road.id) && roadJoins(current.punkte, road.punkte)) { seen.add(road.id); queue.push(road); }
          }
        }
        for (const visited of seen) connected.set(visited, found);
        return found;
      };
      const obstacles = regions.filter(value => value.id !== ownId && ["building", "water", "ort"].includes(roles.get(value.id)!.role));
      const frontage = points.flatMap((p, i) => { const next = points[(i + 1) % points.length]!; return [p, [(p[0] + next[0]) / 2, (p[1] + next[1]) / 2] as TacticalPoint]; });
      for (const road of roads) {
        let distance = Infinity;
        for (const p of frontage) for (let i = 0; i < road.punkte.length; i++) {
          const a = road.punkte[i]!, b = road.punkte[(i + 1) % road.punkte.length]!, dx = b[0] - a[0], dy = b[1] - a[1], length = dx * dx + dy * dy;
          const t = length ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / length)) : 0;
          const end: TacticalPoint = [a[0] + t * dx, a[1] + t * dy], gap = Math.hypot(p[0] - end[0], p[1] - end[1]);
          if (gap > z || gap >= distance) continue;
          if (gap > .001) {
            const halfWidth = Math.min(z * .025, .5), nx = (end[1] - p[1]) / gap * halfWidth, ny = (p[0] - end[0]) / gap * halfWidth;
            const access: Polygon = [[p[0] + nx, p[1] + ny], [end[0] + nx, end[1] + ny], [end[0] - nx, end[1] - ny], [p[0] - nx, p[1] - ny]];
            if (obstacles.some(obstacle => intersects(access, obstacle.punkte))) continue;
          }
          distance = gap;
        }
        if (distance <= z && (!closest || distance < closest.distance || distance === closest.distance && road.id < closest.id) && reachable(road.id)) closest = { id: road.id, distance };
      }
      if (!closest) reject("contradiction", "Das Gebäude benötigt eine erreichbare Straße in höchstens einem Modul Abstand.");
      return closest.id;
    };
    const operation = input.operation;
    if (operation.kind === "remove") { region(operation.regionId); erase(operation.regionId); }
    else if (operation.kind === "transform") {
      const old = region(operation.regionId), role = roles.get(old.id)!;
      if (role.role !== "building") reject("invalid", "Verschieben und Drehen ist für Gebäude vorgesehen; Flächen bearbeitest du mit dem Pinsel.", [old.id]);
      if (cannotChange(old.id)) reject("protected", "Entsperre diese Fläche vor dem Bearbeiten.", [old.id]);
      if (!finitePoint(operation.delta) || !turning(operation.quarterTurns)) reject("invalid", "Ungültige Verschiebung oder Drehung.");
      const box = huelle(old.punkte), center: TacticalPoint = [(box[0] + box[2]) / 2, (box[1] + box[3]) / 2], turns = operation.quarterTurns ?? 0;
      const transform = (point: TacticalPoint): TacticalPoint => { const at = rotate(point, center, turns); return [q(at[0] + operation.delta[0]), q(at[1] + operation.delta[1])]; };
      const points = old.punkte.map(transform);
      let nextRole: CartographyRegionV1 = { ...role, authored: true, provenance: null };
      if (role.role === "building") {
        const streetRegionId = checkBuilding(points, old.id, !!role.streetRegionId);
        const { lotRegionId: _lot, streetRegionId: _street, ...remaining } = role;
        nextRole = { ...remaining, authored: true, provenance: null, ...(streetRegionId ? { streetRegionId } : {}), ...(role.lotRegionId && points.every(point => imPolygon(point, region(role.lotRegionId!).punkte)) ? { lotRegionId: role.lotRegionId } : {}) };
        const attached = new Set(role.attachedStampIds ?? []);
        stamps = stamps.map(stamp => { if (!attached.has(stamp.id)) return stamp; const at = transform([stamp.x, stamp.y]); return { ...stamp, x: at[0], y: at[1], r: stamp.r + turns * Math.PI / 2 }; });
      }
      put(old.id, points, nextRole);
    } else if (operation.kind === "building") {
      if (!finitePoint(operation.at) || !positive(operation.width) || !positive(operation.height) || !turning(operation.quarterTurns) || !BAUWERK_TYPEN.includes(operation.typ) || typeof operation.titel !== "string" || !operation.titel.trim() || operation.titel.trim().length > 160 || operation.requireRoad !== undefined && typeof operation.requireRoad !== "boolean") reject("invalid", "Gebäudetyp, Name und Abmessungen prüfen.");
      const [cx, cy] = operation.at, w = operation.width / 2, h = operation.height / 2;
      const shape: Polygon = operation.shape === "l" ? [[cx - w, cy - h], [cx, cy - h], [cx, cy], [cx + w, cy], [cx + w, cy + h], [cx - w, cy + h]] : rect(cx - w, cy - h, cx + w, cy + h);
      const points = shape.map(point => rotate(point, operation.at, operation.quarterTurns ?? 0)), streetRegionId = checkBuilding(points, undefined, operation.requireRoad ?? true), id = idFor("building");
      const lot = regions.find(value => roles.get(value.id)!.role === "lot" && points.every(point => imPolygon(point, value.punkte)));
      put(id, points, { ...common(id), role: "building", ...(streetRegionId ? { streetRegionId } : {}), ...(lot ? { lotRegionId: lot.id } : {}) });
      addedBuildings.push({ regionId: id, titel: operation.titel.trim(), typ: operation.typ });
    } else if (operation.kind === "variation") {
      if (!Array.isArray(operation.regionIds) || operation.regionIds.length > limits.cells) reject("budget", "Die Auswahl ist zu groß.");
      for (const id of [...new Set(operation.regionIds)].sort()) {
        const old = region(id), role = roles.get(id)!;
        if (cannotChange(id, true)) { diagnostics.push(`Geschützte Fläche erhalten: ${id}`); continue; }
        const salt = Number.parseInt(textHash(`${input.seed}:${id}`).slice(0, 8), 16);
        if (role.role === "terrain") {
          const options = CARTOGRAPHY_PATTERNS.filter(pattern => !pattern.roadMask && !pattern.waterMask).map(pattern => pattern.id);
          const solved = solveCartographyPatterns({ seed: `${input.seed}:${id}`, cells: [{ x: 0, y: 0, candidates: options }], limits });
          if (!solved.ok) reject(solved.code, solved.message, [id]);
          put(id, old.punkte, { ...role, authored: true, provenance: null, material: solved.assignments[0]!.pattern.ground });
        } else if (role.role === "building") {
          const box = huelle(old.punkte), inset = .03 + (salt % 10) / 100;
          // Fit inside the old roof, preserving the original address and every outside object.
          const center: TacticalPoint = [(box[0] + box[2]) / 2, (box[1] + box[3]) / 2], scale = 1 - 2 * inset;
          const resize = (point: TacticalPoint): TacticalPoint => [q(center[0] + (point[0] - center[0]) * scale), q(center[1] + (point[1] - center[1]) * scale)];
          const points = old.punkte.map(resize);
          if (points.every(point => imPolygon(point, old.punkte))) {
            const streetRegionId = checkBuilding(points, id, !!role.streetRegionId), { streetRegionId: _street, ...rest } = role;
            put(id, points, { ...rest, authored: true, provenance: null, ...(streetRegionId ? { streetRegionId } : {}) });
            const attached = new Set(role.attachedStampIds ?? []);
            stamps = stamps.map(stamp => { if (!attached.has(stamp.id)) return stamp; const at = resize([stamp.x, stamp.y]); return { ...stamp, x: at[0], y: at[1], s: stamp.s * scale }; });
          }
          else diagnostics.push(`Grundriss erhalten: ${id}`);
        } else diagnostics.push(`Diese Rolle bleibt bei Gelände-/Gebäudevariation erhalten: ${id}`);
      }
    } else if (operation.kind === "relief") {
      const z = cartography.construction.cellSize, [ox, oy] = cartography.construction.origin;
      if (!Array.isArray(operation.points) || !operation.points.length || operation.points.length > 4096 || operation.points.some(point => !finitePoint(point) || point[0] < 0 || point[1] < 0 || point[0] > document.geometry.size[0] || point[1] > document.geometry.size[1])
        || !positive(operation.radius) || operation.radius > z * 16 || !RELIEF_MODES.includes(operation.mode) || typeof operation.strength !== "number" || !(operation.strength >= 0 && operation.strength <= 1)) reject("invalid", "Ungültiger Pinselzug für das Höhenwerkzeug.");
      const base = relief ?? flatRelief(cartography.construction, document.geometry.size), heights = [...base.heights];
      // One weight per sample, the strongest touch of the stroke: a stroke reads as one drawn
      // shape, not as a pile of stamps that grows with every pointer event along the way.
      const weights = new Map<number, number>();
      const r = operation.radius / z; let work = 0;
      for (const point of operation.points) {
        const cx = (point[0] - ox) / z, cy = (point[1] - oy) / z;
        for (let j = Math.max(0, Math.floor(cy - r)); j <= Math.min(base.rows - 1, Math.ceil(cy + r)); j++) for (let i = Math.max(0, Math.floor(cx - r)); i <= Math.min(base.columns - 1, Math.ceil(cx + r)); i++) {
          if (++work > limits.propagations) reject("budget", "Der Pinselzug überschreitet das Arbeitsbudget.");
          const d = Math.hypot(i - cx, j - cy) / r; if (d >= 1) continue;
          const w = (1 - d * d) ** 2, k = j * base.columns + i;
          if (w > (weights.get(k) ?? 0)) weights.set(k, w);
        }
      }
      if (!weights.size) reject("invalid", "Der Pinselzug liegt außerhalb der Karte.");
      const amount = operation.strength * 28, reference = reliefHeightAt(base, cartography.construction, operation.points[0]![0], operation.points[0]![1]);
      for (const [k, w] of weights) {
        const h = base.heights[k]!;
        let next = h;
        if (operation.mode === "raise") next = h + amount * w;
        else if (operation.mode === "lower") next = h - amount * w;
        else if (operation.mode === "level") next = h + (reference - h) * w * Math.max(.25, operation.strength);
        else {
          const i = k % base.columns, j = Math.floor(k / base.columns); let sum = 0, count = 0;
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) { const x = i + dx, y = j + dy; if (x >= 0 && y >= 0 && x < base.columns && y < base.rows) { sum += base.heights[y * base.columns + x]!; count++; } }
          next = h + (sum / count - h) * w * Math.max(.3, operation.strength);
        }
        heights[k] = Math.max(0, Math.min(255, Math.round(next)));
      }
      relief = { ...base, heights };
    } else if (operation.kind === "terrain" || operation.kind === "road") {
      const z = cartography.construction.cellSize, [ox, oy] = cartography.construction.origin;
      const radius = operation.kind === "terrain" ? operation.radius : operation.width / 2;
      if (operation.kind === "terrain" && operation.water !== undefined && !CARTOGRAPHY_WATER_MATERIALS.includes(operation.water)) reject("invalid", "Unbekannte Wasserart; wähle Fluss, See oder Meer.");
      if (!Array.isArray(operation.points) || !operation.points.length || operation.points.length > 4096 || operation.points.some(point => !finitePoint(point) || point[0] < 0 || point[1] < 0 || point[0] > document.geometry.size[0] || point[1] > document.geometry.size[1]) || !positive(radius) || radius > z * 16) reject("invalid", "Ungültiger Pinselzug oder Pinselradius.");
      const selection = new Map<string, { x: number; y: number }>();
      const cellKey = (x: number, y: number) => `${x},${y}`;
      let sweepWork = 0;
      for (let i = 0; i < operation.points.length; i++) {
        const a = operation.points[i]!, b = operation.points[i + 1] ?? a;
        const minX = Math.floor((Math.min(a[0], b[0]) - radius - ox) / z), maxX = Math.floor((Math.max(a[0], b[0]) + radius - ox) / z);
        const minY = Math.floor((Math.min(a[1], b[1]) - radius - oy) / z), maxY = Math.floor((Math.max(a[1], b[1]) + radius - oy) / z);
        if ((maxX - minX + 1) * (maxY - minY + 1) > limits.cells * 4) reject("budget", "Der Pinselzug ist zu groß.");
        for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
          if (++sweepWork > limits.propagations) reject("budget", "Der Pinselzug überschreitet das Arbeitsbudget.");
          const px = ox + (x + .5) * z, py = oy + (y + .5) * z, dx = b[0] - a[0], dy = b[1] - a[1], length = dx * dx + dy * dy;
          const t = length ? Math.max(0, Math.min(1, ((px - a[0]) * dx + (py - a[1]) * dy) / length)) : 0;
          if (Math.hypot(px - a[0] - t * dx, py - a[1] - t * dy) > Math.max(radius, z * .5)) continue;
          if (ox + x * z < 0 || oy + y * z < 0 || ox + (x + 1) * z > document.geometry.size[0] || oy + (y + 1) * z > document.geometry.size[1]) continue;
          selection.set(cellKey(x, y), { x, y }); if (selection.size > limits.cells) reject("budget", "Die Auswahl enthält zu viele Module.");
        }
      }
      if (!selection.size) reject("invalid", "Der Pinselzug liegt außerhalb der bebaubaren Karte.");
      const cells = [...selection.values()].sort((a, b) => a.y - b.y || a.x - b.x), boundary: PatternBoundary[] = [], modules: PatternCell[] = [];
      const offsets = [[0, -1], [1, 0], [0, 1], [-1, 0]] as const;
      const roleAt = (point: TacticalPoint) => [...regions].reverse().filter(value => imPolygon(point, value.punkte)).map(value => roles.get(value.id)!).find(role => role.role === "road" || role.role === "water");
      for (const cell of cells) {
        const x = ox + cell.x * z, y = oy + cell.y * z, polygon = rect(x, y, x + z, y + z);
        for (const old of regions) if (intersects(polygon, old.punkte)) {
          const role = roles.get(old.id)!;
          if (role.locked || protectedIds.has(old.id) || ["building", "room", "generic"].includes(role.role)) reject("protected", "Der Pinselzug würde einen geschützten Ort übermalen.", [old.id]);
        }
        let road = 0, water = 0;
        for (let side = 0; side < 4; side++) {
          const [dx, dy] = offsets[side]!, adjacent = selection.has(cellKey(cell.x + dx, cell.y + dy));
          const outside = roleAt([x + z * (.5 + dx * .501), y + z * (.5 + dy * .501)]);
          let port: PatternPort = outside?.role === "road" ? "road" : outside?.role === "water" ? "water" : "land";
          if (!adjacent && operation.kind === "road") {
            const onEdge = side === 0 && y === 0 || side === 1 && x + z === document.geometry.size[0] || side === 2 && y + z === document.geometry.size[1] || side === 3 && x === 0;
            const edgePoint: TacticalPoint = [x + z * (.5 + dx * .5), y + z * (.5 + dy * .5)];
            if (onEdge && operation.points.some(point => Math.hypot(point[0] - edgePoint[0], point[1] - edgePoint[1]) <= Math.max(radius, z * .5))) port = "road";
          }
          if (operation.kind === "road" && adjacent) port = "road";
          else if (operation.kind === "terrain" && operation.material === "water" && adjacent) port = "water";
          else if (operation.kind === "terrain" && operation.material !== "water" && adjacent) port = "land";
          if (port === "road") road |= 1 << side; if (port === "water") water |= 1 << side;
          if (!adjacent) boundary.push({ ...cell, side: side as Cardinal, port });
        }
        let candidates: string[];
        if (operation.kind === "terrain" && operation.material !== "water") candidates = [`terrain:${operation.material}`];
        else {
          // Isolated water is a lake; an isolated road square remains a walkable earth patch.
          if (!road && !water) candidates = [operation.kind === "terrain" ? "terrain:sand" : "terrain:earth"];
          else candidates = CARTOGRAPHY_PATTERNS.filter(pattern => pattern.roadMask === road && pattern.waterMask === water).map(pattern => pattern.id);
        }
        if (!candidates.length) reject("contradiction", "Hier ist keine passende Straße, Wasserführung oder Brücke möglich.");
        modules.push({ ...cell, candidates });
      }
      const solved = solveCartographyPatterns({ seed: input.seed, cells: modules, boundary, limits });
      if (!solved.ok) reject(solved.code, solved.message);
      // Each module replaces only the covered part of editable surface geometry. The old ID
      // follows its first retained fragment; only newly split fragments receive new IDs.
      let cuts = 0; const paintedIds: string[] = [];
      for (const cell of cells) {
        const x = ox + cell.x * z, y = oy + cell.y * z, box = [x, y, x + z, y + z] as const, polygon = rect(...box);
        for (const old of [...regions]) {
          const role = roles.get(old.id)!;
          if (!intersects(polygon, old.punkte) || role.role === "lot" || operation.kind === "road" && (role.role === "water" || role.role === "terrain" || role.role === "road")
            || operation.kind === "terrain" && operation.material === "water" && (role.role === "terrain" || role.role === "road")) continue;
          if (++cuts > limits.propagations) reject("budget", "Das Geometriebudget ist ausgeschöpft.");
          if ([...roles.values()].some(other => other.role === "building" && other.streetRegionId === old.id)) reject("protected", "Diese Straße ist ein vorhandener Gebäudezugang.", [old.id]);
          const parts = convexParts(old.punkte, () => { if (++cuts > limits.propagations) reject("budget", "Das Geometriebudget ist ausgeschöpft."); }).flatMap(part => subtractBox(part, box));
          if (!parts.length) { regions = regions.filter(value => value.id !== old.id); roles.delete(old.id); removed.add(old.id); changed.add(old.id); }
          else {
            put(old.id, parts[0]!, { ...role, authored: true, provenance: null });
            for (let i = 1; i < parts.length; i++) { const id = idFor(`split:${old.id}:${cell.x}:${cell.y}:${i}`); put(id, parts[i]!, { ...role, regionId: id, authored: true, provenance: null }); }
          }
        }
        const id = idFor(`module:${cell.x}:${cell.y}`), pattern = solved.assignments.find(value => value.x === cell.x && value.y === cell.y)!.pattern;
        const role: CartographyRegionV1 = operation.kind === "terrain" ? operation.material === "water" ? { ...common(id), role: "water", material: operation.water ?? "river" } : { ...common(id), role: "terrain", material: operation.material }
          : { ...common(id), role: "road", material: pattern.waterMask ? "bridge" : operation.material };
        const surface = operation.kind === "road" ? networkFootprint(x, y, z, Math.min(z, operation.width), pattern.roadMask)
          : operation.material === "water" && pattern.waterMask ? networkFootprint(x, y, z, z * .7, pattern.waterMask) : polygon;
        put(id, surface, role);
        paintedIds.push(id);
        // Painted water sinks the land under it and painted rock lifts it, so contour lines and
        // shading agree with the brush. Every other material leaves the relief alone.
        if (relief && operation.kind === "terrain" && (operation.material === "water" || operation.material === "rock")) {
          const heights = [...relief.heights], water = operation.material === "water";
          for (const k of cellCorners(relief, cell.x, cell.y)) heights[k] = water ? Math.min(heights[k]!, relief.seaLevel - 6) : Math.max(heights[k]!, Math.min(255, relief.seaLevel + RELIEF_LEVELS.rockAbove + 4));
          relief = { ...relief, heights: heights.map(h => Math.max(0, Math.min(255, h))) };
        }
        if (operation.kind === "terrain" && operation.material === "water" && pattern.roadMask) {
          for (const road of [...regions].filter(value => roles.get(value.id)!.role === "road")) {
            if (!intersects(surface, road.punkte)) continue;
            if (!convex(surface) && !convex(road.punkte)) reject("contradiction", "Diese Kreuzung benötigt eine einfache gerade Brückenfläche.");
            const points = (convex(surface) ? clipped(road.punkte, surface) : clipped(surface, road.punkte)).map(point => [q(point[0]), q(point[1])] as const);
            if (points.length < 3 || flaeche(points) <= .001) continue;
            const bridgeId = idFor(`bridge:${cell.x}:${cell.y}:${road.id}`);
            put(bridgeId, points, { ...common(bridgeId), role: "road", material: "bridge" });
          }
        }
      }
      const groups = new Map<string, string[]>();
      for (const id of paintedIds) { const role = roles.get(id)!, key = `${role.role}:${"material" in role ? role.material : ""}`; groups.set(key, [...groups.get(key) ?? [], id]); }
      for (const [key, ids] of groups) {
        if (ids.length < 2) continue;
        const joined = joinedModules(ids.map(id => region(id).punkte), () => { if (++cuts > limits.propagations) reject("budget", "Das Geometriebudget ist ausgeschöpft."); });
        if (!joined || joined.length >= ids.length) continue;
        const role = roles.get(ids[0]!)!, replaced = new Set(ids);
        regions = regions.filter(value => !replaced.has(value.id)); for (const id of ids) { roles.delete(id); changed.delete(id); }
        for (const [index, points] of joined.entries()) { const id = idFor(`joined:${key}:${index}`); put(id, points, { ...role, regionId: id }); }
      }
    } else reject("invalid", "Unbekanntes Kartenwerkzeug.");
    if (regions.length > TACTICAL_CARTOGRAPHY_LIMITS.regions || regions.reduce((sum, value) => sum + value.punkte.length, 0) > 20_000) reject("budget", "Zu viele Flächen oder Eckpunkte; wähle einen kleineren Bereich.");
    const next = parseTacticalMapDocument({ ...document, geometry: { ...document.geometry, regions, stamps }, geometryElevation: document.geometryElevation.filter(value => !(value.targetKind === "region" && removed.has(value.targetId) || value.targetKind === "stamp" && removedStamps.has(value.targetId))) });
    const nextCartography = parseTacticalCartography({ ...cartography, ...(relief ? { relief } : {}), regions: regions.map(value => roles.get(value.id)!) }, next);
    return { ok: true, document: next, cartography: nextCartography, addedBuildings, removedRegionIds: [...removed].sort(), removedStampIds: [...removedStamps].sort(), changedRegionIds: [...changed].sort(), diagnostics };
  } catch (error) {
    return error instanceof EditFailure ? { ok: false, code: error.code, regionIds: error.regionIds, message: error.message }
      : { ok: false, code: "invalid", regionIds: [], message: error instanceof Error ? error.message : "Ungültige Kartenbearbeitung." };
  }
}
