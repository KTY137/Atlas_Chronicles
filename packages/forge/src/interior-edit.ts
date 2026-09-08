// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { textHash } from "@chronicle/core";
import { parseTacticalCartography, parseTacticalMapDocument, type AssetpaketV1, type CartographyRegionV1, type CartographyRoomInteriorV1, type RoomIntent, type Stamp, type TacticalCartographyV1, type TacticalMapDocumentV1, type TacticalPoint, type TacticalWall } from "@chronicle/szene";
import type { CartographyEditResult, QuarterTurns } from "./cartography-edit.ts";
import { flaeche, huelle, imPolygon, q, type Polygon } from "./polygon.ts";

export type InteriorTarget = { readonly kind: "room" | "wall" | "portal"; readonly id: string };
export type InteriorEditOperation =
  | { readonly kind: "room"; readonly from: TacticalPoint; readonly to: TacticalPoint; readonly template?: "empty" | "bedroom" | "tavern"; readonly floor?: "wood" | "stone" | "tile"; readonly shape?: "rectangle" | "l"; readonly titel?: string }
  | { readonly kind: "wall"; readonly from: TacticalPoint; readonly to: TacticalPoint }
  | { readonly kind: "door"; readonly at: TacticalPoint; readonly width: number; readonly wallId?: string; readonly closed?: boolean }
  | { readonly kind: "interior-transform"; readonly target: InteriorTarget; readonly delta: TacticalPoint; readonly quarterTurns?: QuarterTurns }
  | { readonly kind: "interior-remove"; readonly target: InteriorTarget }
  | { readonly kind: "room-resize"; readonly regionId: string; readonly from: TacticalPoint; readonly to: TacticalPoint };
export interface InteriorEditInput {
  readonly document: TacticalMapDocumentV1;
  readonly cartography: TacticalCartographyV1;
  readonly protectedRegionIds: readonly string[];
  readonly operationId: string;
  readonly operation: InteriorEditOperation;
  readonly assets?: AssetpaketV1;
}
export type InteriorEditResult = Exclude<CartographyEditResult, { ok: true }> | (Extract<CartographyEditResult, { ok: true }> & { readonly addedRooms: readonly RoomIntent[]; readonly removedPlaceIds: readonly string[] });
type RoomRole = Extract<CartographyRegionV1, { role: "room" }>;
class InteriorFailure extends Error {
  constructor(readonly code: "protected" | "invalid" | "contradiction" | "budget", message: string, readonly ids: readonly string[] = []) { super(message); }
}
const fail = (code: InteriorFailure["code"], message: string, ids: readonly string[] = []): never => { throw new InteriorFailure(code, message, ids); };
const finite = (p: TacticalPoint) => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite);
const samePoint = (a: TacticalPoint, b: TacticalPoint) => Math.hypot(a[0] - b[0], a[1] - b[1]) < .001;
const rect = (a: TacticalPoint, b: TacticalPoint): Polygon => {
  const [x0, x1] = [Math.min(a[0], b[0]), Math.max(a[0], b[0])], [y0, y1] = [Math.min(a[1], b[1]), Math.max(a[1], b[1])];
  return [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
};
function distanceToEdge(point: TacticalPoint, a: TacticalPoint, b: TacticalPoint) {
  const dx = b[0] - a[0], dy = b[1] - a[1], length = Math.hypot(dx, dy);
  const along = length ? Math.max(0, Math.min(length, ((point[0] - a[0]) * dx + (point[1] - a[1]) * dy) / length)) : 0;
  const at: TacticalPoint = length ? [a[0] + dx * along / length, a[1] + dy * along / length] : a;
  return { at, along, length, distance: Math.hypot(point[0] - at[0], point[1] - at[1]) };
}
function overlaps(a: Polygon, b: Polygon): boolean {
  const aa = huelle(a), bb = huelle(b);
  if (aa[2] <= bb[0] + .001 || bb[2] <= aa[0] + .001 || aa[3] <= bb[1] + .001 || bb[3] <= aa[1] + .001) return false;
  const strictInside = (p: TacticalPoint, polygon: Polygon) => imPolygon(p, polygon) && polygon.every((a, i) => distanceToEdge(p, a, polygon[(i + 1) % polygon.length]!).distance > .001);
  const samples = (polygon: Polygon) => polygon.flatMap((p, i) => { const n = polygon[(i + 1) % polygon.length]!; return [p, [(p[0] + n[0]) / 2, (p[1] + n[1]) / 2] as TacticalPoint]; });
  if (samples(a).some(p => strictInside(p, b)) || samples(b).some(p => strictInside(p, a))) return true;
  const inwardSamples = (polygon: Polygon) => {
    const sign = Math.sign(polygon.reduce((sum, point, i) => { const next = polygon[(i + 1) % polygon.length]!; return sum + point[0] * next[1] - next[0] * point[1]; }, 0));
    return polygon.map((p, i): TacticalPoint => { const n = polygon[(i + 1) % polygon.length]!, dx = n[0] - p[0], dy = n[1] - p[1], length = Math.hypot(dx, dy), inset = Math.max(.005, length * .0001); return [(p[0] + n[0]) / 2 - sign * dy / length * inset, (p[1] + n[1]) / 2 + sign * dx / length * inset]; });
  };
  if (inwardSamples(a).some(p => strictInside(p, a) && strictInside(p, b)) || inwardSamples(b).some(p => strictInside(p, a) && strictInside(p, b))) return true;
  const cross = (p: TacticalPoint, q: TacticalPoint, r: TacticalPoint) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
  for (let i = 0; i < a.length; i++) for (let j = 0; j < b.length; j++) {
    const p = a[i]!, q = a[(i + 1) % a.length]!, r = b[j]!, s = b[(j + 1) % b.length]!;
    if (cross(p, q, r) * cross(p, q, s) < -1e-9 && cross(r, s, p) * cross(r, s, q) < -1e-9) return true;
  }
  // Identical polygons and aligned rectangles have no strictly interior edge samples.
  return a.every(p => imPolygon(p, b)) || b.every(p => imPolygon(p, a));
}

/** Pure, bounded and atomic. Only explicit ownership may carry geometry with a room. */
export function applyInteriorEdit(input: InteriorEditInput): InteriorEditResult {
  try {
    const document = parseTacticalMapDocument(input.document), cartography = parseTacticalCartography(input.cartography, document), operation = input.operation;
    if (typeof input.operationId !== "string" || !input.operationId.length || input.operationId.length > 128) fail("invalid", "Eine stabile Bearbeitungs-ID wird benötigt.");
    let regions = [...document.geometry.regions], roles = [...cartography.regions], stamps = [...document.geometry.stamps], places = [...document.geometry.places], walls = [...document.walls], portals = [...document.portals], lights = [...document.lights];
    const removedRegions = new Set<string>(), removedStamps = new Set<string>(), removedPlaces = new Set<string>(), changed = new Set<string>(), addedRooms: RoomIntent[] = [], diagnostics: string[] = [];
    const protectedIds = new Set(input.protectedRegionIds), z = cartography.construction.cellSize;
    const allIds = new Set([...regions, ...stamps, ...walls, ...portals, ...lights, ...document.geometry.places].map(value => value.id));
    const idFor = (path: string) => { const id = `interior-${textHash(JSON.stringify(["interior-edit-v1", input.operationId, path])).slice(0, 32)}`; if (allIds.has(id)) fail("invalid", "Diese Bearbeitungs-ID wurde bereits verwendet."); allIds.add(id); return id; };
    const within = (p: TacticalPoint) => finite(p) && p[0] >= 0 && p[1] >= 0 && p[0] <= document.geometry.size[0] && p[1] <= document.geometry.size[1];
    const checkPolygon = (points: Polygon, ownId?: string) => {
      if (points.length < 3 || !points.every(within) || flaeche(points) < z * z / 4) fail("invalid", "Der Raum muss auf die Karte passen und mindestens eine halbe Zelle breit und tief sein.");
      for (const other of regions) if (other.id !== ownId && overlaps(points, other.punkte)) {
        const role = roles.find(role => role.regionId === other.id)!;
        if (role.locked || protectedIds.has(other.id)) fail("protected", "Der Raum würde einen geschützten Ort überbauen.", [other.id]);
        if (["room", "building", "water"].includes(role.role)) fail("contradiction", "Der Raum überschneidet einen anderen Raum, ein Gebäude oder Wasser.", [other.id]);
      }
    };
    const room = (id: string): RoomRole & { interior: CartographyRoomInteriorV1 } => {
      const role = roles.find(role => role.regionId === id);
      if (role?.role !== "room") return fail("invalid", "Der ausgewählte Raum existiert nicht.", [id]);
      if (!role.interior) return fail("protected", "Dieser ältere Raum besitzt noch keine Bauteilzuordnung. Bearbeite seine Wände, Türen und Einrichtung einzeln oder zeichne einen neuen Raum.", [id]);
      if (role.locked) return fail("protected", "Dieser Raum ist gesperrt.", [id]);
      return role as RoomRole & { interior: CartographyRoomInteriorV1 };
    };
    const owners = (field: "wallIds" | "portalIds", id: string) => roles.filter((role): role is RoomRole & { interior: CartographyRoomInteriorV1 } => role.role === "room" && !!role.interior?.[field].includes(id));
    const mark = (id: string) => { changed.add(id); roles = roles.map(role => role.regionId === id ? { ...role, authored: true, provenance: null } : role); };
    const editInterior = (id: string, change: (value: CartographyRoomInteriorV1) => CartographyRoomInteriorV1) => { roles = roles.map(role => role.regionId === id && role.role === "room" && role.interior ? { ...role, interior: change(role.interior), authored: true, provenance: null } : role); changed.add(id); };
    const checkOwners = (owned: readonly RoomRole[], shared = false) => {
      if (owned.some(role => role.locked)) fail("protected", "Die Wand oder Tür gehört zu einem gesperrten Raum.", owned.filter(role => role.locked).map(role => role.regionId));
      if (shared && owned.length > 1) fail("protected", "Diese Grenze wird von zwei Räumen geteilt. Bearbeite die gemeinsame Wand einzeln, bevor du einen Raum verschiebst.", owned.map(role => role.regionId));
    };
    const setWalls = (oldId: string, replacement: readonly TacticalWall[]) => {
      walls = [...walls.filter(wall => wall.id !== oldId), ...replacement];
      for (const owner of owners("wallIds", oldId)) editInterior(owner.regionId, interior => ({ ...interior, wallIds: [...interior.wallIds.filter(id => id !== oldId), ...replacement.map(wall => wall.id)] }));
    };
    const portalArtwork = (portalId: string) => new Set(roles.flatMap(role => role.role === "room" ? role.interior?.portalArtwork?.filter(item => item.portalId === portalId).flatMap(item => item.stampIds) ?? [] : []));
    const removePortal = (portalId: string, restoreWall: boolean) => {
      const portal = portals.find(portal => portal.id === portalId); if (!portal) fail("invalid", "Die Tür existiert nicht.");
      const owned = owners("portalIds", portalId); checkOwners(owned);
      const artwork = portalArtwork(portalId); artwork.forEach(id => removedStamps.add(id)); stamps = stamps.filter(stamp => !artwork.has(stamp.id));
      portals = portals.filter(portal => portal.id !== portalId);
      const wall = restoreWall && !portal!.freestanding ? { id: idFor(`closed-opening:${portalId}`), kind: "wall" as const, points: portal!.bounds, elevation: portal!.elevation } : null;
      if (wall) walls.push(wall);
      for (const owner of owned) editInterior(owner.regionId, interior => ({ ...interior, portalIds: interior.portalIds.filter(id => id !== portalId), stampIds: interior.stampIds.filter(id => !artwork.has(id)), wallIds: wall ? [...interior.wallIds, wall.id] : interior.wallIds,
        ...(interior.portalArtwork ? { portalArtwork: interior.portalArtwork.filter(item => item.portalId !== portalId) } : {}) }));
    };
    if (operation.kind === "room") {
      if (!finite(operation.from) || !finite(operation.to) || ![undefined, "rectangle", "l"].includes(operation.shape) || ![undefined, "empty", "bedroom", "tavern"].includes(operation.template) || ![undefined, "wood", "stone", "tile"].includes(operation.floor)) fail("invalid", "Bitte Raumform, Vorlage und Boden prüfen.");
      const title = operation.titel ?? (operation.template === "bedroom" ? "Schlafzimmer" : operation.template === "tavern" ? "Schankraum" : "Neuer Raum");
      if (typeof title !== "string" || !title.trim() || title.length > 160 || /[\u0000-\u001f\u007f]/.test(title)) fail("invalid", "Der Raumname muss zwischen 1 und 160 Zeichen lang sein.");
      let points = rect(operation.from, operation.to);
      const [x0, y0, x1, y1] = huelle(points);
      if (x1 - x0 < z / 2 || y1 - y0 < z / 2) fail("invalid", "Ziehe einen Raum mit mindestens einer halben Zelle Seitenlänge auf.");
      if (operation.shape === "l") points = [[x0, y0], [(x0 + x1) / 2, y0], [(x0 + x1) / 2, (y0 + y1) / 2], [x1, (y0 + y1) / 2], [x1, y1], [x0, y1]];
      checkPolygon(points);
      const id = idFor("room"), wallIds: string[] = [], portalIds: string[] = [], stampIds: string[] = [];
      for (let i = 0; i < points.length; i++) {
        const a = points[i]!, b = points[(i + 1) % points.length]!;
        const dx = b[0] - a[0], dy = b[1] - a[1], length = Math.hypot(dx, dy);
        const along = (p: TacticalPoint) => ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / length;
        const onLine = (p: TacticalPoint) => Math.abs(dx * (p[1] - a[1]) - dy * (p[0] - a[0])) / length < .001;
        const at = (t: number): TacticalPoint => [q(a[0] + dx * t / length), q(a[1] + dy * t / length)];
        // Split the neighbor's wall at the new room's endpoints before sharing only the
        // exact overlapping pieces. A second coincident wall would block a visible doorway.
        for (const wall of [...walls]) {
          if (wall.kind !== "wall" || wall.points.length !== 2 || !wall.points.every(onLine)) continue;
          const values = wall.points.map(along).sort((x, y) => x - y), lo = values[0]!, hi = values[1]!;
          if (hi <= .001 || lo >= length - .001) continue;
          const cuts = [lo, ...[0, length].filter(t => t > lo + .001 && t < hi - .001), hi];
          if (cuts.length > 2) {
            checkOwners(owners("wallIds", wall.id));
            setWalls(wall.id, cuts.slice(1).map((end, part) => ({ ...wall, id: part ? idFor(`shared-wall:${i}:${wall.id}:${part}`) : wall.id, points: [at(cuts[part]!), at(end)] })));
          }
        }
        const matchingWalls = walls.filter(wall => wall.kind === "wall" && wall.points.length === 2 && wall.points.every(onLine) && wall.points.some(p => along(p) >= -.001 && along(p) <= length + .001));
        const matchingPortals = portals.filter(portal => !portal.freestanding && portal.bounds.every(onLine) && along(portal.position) > .001 && along(portal.position) < length - .001);
        const cuts = [...new Set([0, length, ...matchingWalls.flatMap(wall => wall.points.map(along)), ...matchingPortals.flatMap(portal => portal.bounds.map(along))].filter(t => t >= 0 && t <= length).map(q))].sort((x, y) => x - y);
        for (let part = 0; part + 1 < cuts.length; part++) {
          const from = cuts[part]!, to = cuts[part + 1]!, middle = (from + to) / 2;
          if (to - from < .001) continue;
          const portal = matchingPortals.find(portal => { const values = portal.bounds.map(along); return middle > Math.min(...values) - .001 && middle < Math.max(...values) + .001; });
          if (portal) { const owned = owners("portalIds", portal.id); checkOwners(owned); if (owned.length > 1) fail("contradiction", "Diese Tür verbindet bereits zwei Räume."); if (!portalIds.includes(portal.id)) portalIds.push(portal.id); continue; }
          const shared = matchingWalls.find(wall => { const values = wall.points.map(along); return middle > Math.min(...values) - .001 && middle < Math.max(...values) + .001; });
          if (shared) { const owned = owners("wallIds", shared.id); checkOwners(owned); if (owned.length > 1) fail("contradiction", "Diese Wand begrenzt bereits zwei Räume."); if (!wallIds.includes(shared.id)) wallIds.push(shared.id); }
          else { const wallId = idFor(`room-wall:${i}:${part}`); walls.push({ id: wallId, kind: "wall", points: [at(from), at(to)], elevation: document.elevation }); wallIds.push(wallId); }
        }
      }
      const pack = input.assets;
      if (operation.template && operation.template !== "empty") {
        const slots = operation.template === "bedroom" ? [["rast", .28, .35], ["kammer", .72, .7]] as const : [["mahl", .35, .55], ["sitz", .68, .7], ["behaelter", .23, .78]] as const;
        for (const [index, [tag, fx, fy]] of slots.entries()) {
          const asset = pack?.assets.find(asset => asset.schlagworte.includes(tag) && ["moebel", "gefaess"].includes(asset.art));
          if (!pack || !asset) { diagnostics.push(`Vorlage: Kein passendes Objekt für ${tag} im gewählten Katalog.`); continue; }
          const scale = z / pack.zellgroesse, x = x0 + (x1 - x0) * fx, y = y0 + (y1 - y0) * fy, hw = asset.groesse[0] * scale / 2, hh = asset.groesse[1] * scale / 2;
          if (![scale, x, y, hw, hh].every(Number.isFinite) || scale <= 0 || hw <= 0 || hh <= 0 || !rect([x - hw, y - hh], [x + hw, y + hh]).every(p => imPolygon(p, points))) { diagnostics.push(`Vorlage: ${asset.name} passt nicht in diesen Raum.`); continue; }
          const stampId = idFor(`furniture:${index}`); stamps.push({ id: stampId, a: `${pack.id}/${asset.name}`, x, y, s: scale, r: 0, l: 15 }); stampIds.push(stampId);
        }
      }
      regions.push({ id, punkte: points }); roles.push({ regionId: id, role: "room", authored: true, locked: false, provenance: null,
        interior: { schemaVersion: 1, floor: operation.floor ?? "wood", stampIds, wallIds, portalIds, lightIds: [] } });
      changed.add(id); addedRooms.push({ regionId: id, titel: title.trim() });
    } else if (operation.kind === "wall") {
      if (!within(operation.from) || !within(operation.to) || Math.hypot(operation.to[0] - operation.from[0], operation.to[1] - operation.from[1]) < z * .1) fail("invalid", "Ziehe eine Wand innerhalb der Karte auf.");
      walls.push({ id: idFor("wall"), kind: "wall", points: [operation.from, operation.to], elevation: document.elevation });
    } else if (operation.kind === "door") {
      if (!within(operation.at) || !Number.isFinite(operation.width) || operation.width < z * .1 || operation.width > z * 8 || operation.closed !== undefined && typeof operation.closed !== "boolean") fail("invalid", "Position und Türbreite prüfen.");
      let best: { wall: TacticalWall; index: number; at: TacticalPoint; along: number; length: number; distance: number } | null = null;
      for (const wall of walls) {
        if (wall.kind !== "wall" || operation.wallId && wall.id !== operation.wallId) continue;
        for (let i = 0; i + 1 < wall.points.length; i++) {
          const candidate = distanceToEdge(operation.at, wall.points[i]!, wall.points[i + 1]!);
          if ((!best || candidate.distance < best.distance) && candidate.distance <= Math.max(8, z * .45)) best = { wall, index: i, ...candidate };
        }
      }
      if (!best) fail("invalid", "Setze die Tür auf eine vorhandene Wand.");
      const chosen = best!, owned = owners("wallIds", chosen.wall.id); checkOwners(owned);
      if (operation.width > chosen.length - .002) fail("contradiction", "Die gewählte Wand ist für diese Tür zu kurz.");
      const half = operation.width / 2, center = Math.max(half, Math.min(chosen.length - half, chosen.along)), start = chosen.wall.points[chosen.index]!, end = chosen.wall.points[chosen.index + 1]!;
      const dx = (end[0] - start[0]) / chosen.length, dy = (end[1] - start[1]) / chosen.length;
      const a: TacticalPoint = [q(start[0] + dx * (center - half)), q(start[1] + dy * (center - half))], b: TacticalPoint = [q(start[0] + dx * (center + half)), q(start[1] + dy * (center + half))];
      const onLine = (p: TacticalPoint) => Math.abs(dx * (p[1] - a[1]) - dy * (p[0] - a[0])) < .001;
      const along = (p: TacticalPoint) => (p[0] - a[0]) * dx + (p[1] - a[1]) * dy;
      if (portals.some(portal => portal.bounds.every(onLine) && Math.min(operation.width, Math.max(...portal.bounds.map(along))) - Math.max(0, Math.min(...portal.bounds.map(along))) > .001)) fail("contradiction", "Hier befindet sich bereits eine Tür.");
      const allOwners = new Map(owned.map(owner => [owner.regionId, owner]));
      // Imported and hand-drawn maps may contain coincident wall strokes. Cutting just the
      // nearest one would leave an invisible second blocker across the displayed doorway.
      for (const wall of [...walls]) {
        const runs: TacticalPoint[][] = []; let current: TacticalPoint[] = [wall.points[0]!], cut = false;
        const append = (p: TacticalPoint) => { if (!samePoint(current[current.length - 1]!, p)) current.push(p); };
        for (let index = 0; index + 1 < wall.points.length; index++) {
          const from = wall.points[index]!, to = wall.points[index + 1]!, start = along(from), end = along(to), lo = Math.max(0, Math.min(start, end)), hi = Math.min(operation.width, Math.max(start, end));
          if (wall.kind !== "wall" || !onLine(from) || !onLine(to) || hi - lo <= .001) { append(to); continue; }
          cut = true;
          const p = (distance: number): TacticalPoint => [q(a[0] + dx * distance), q(a[1] + dy * distance)];
          append(p(start <= end ? lo : hi)); if (current.length > 1) runs.push(current);
          current = [p(start <= end ? hi : lo)]; append(to);
        }
        if (current.length > 1) runs.push(current);
        if (!cut) continue;
        const affected = owners("wallIds", wall.id); checkOwners(affected); affected.forEach(owner => allOwners.set(owner.regionId, owner));
        setWalls(wall.id, runs.map((points, index) => ({ ...wall, id: index ? idFor(`wall-after-door:${wall.id}:${index}`) : wall.id, points })));
      }
      const id = idFor("door"); portals.push({ id, position: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], bounds: [a, b], rotationRadians: Math.atan2(dy, dx), closed: operation.closed ?? true, freestanding: false, elevation: chosen.wall.elevation });
      for (const owner of allOwners.values()) editInterior(owner.regionId, interior => ({ ...interior, portalIds: [...interior.portalIds, id] }));
    } else if (operation.kind === "interior-remove") {
      const { target } = operation;
      if (target.kind === "room") {
        const owned = room(target.id);
        if (protectedIds.has(target.id)) fail("protected", "Dieser Raum führt zu einer vorhandenen Unterkarte. Entferne zuerst diese Verbindung im Atlas.", [target.id]);
        const sharedWalls = new Set(owned.interior.wallIds.filter(id => owners("wallIds", id).length > 1)), sharedPortals = new Set(owned.interior.portalIds.filter(id => owners("portalIds", id).length > 1));
        owned.interior.stampIds.forEach(id => removedStamps.add(id));
        owned.interior.placeIds?.forEach(id => removedPlaces.add(id)); places = places.filter(place => !removedPlaces.has(place.id));
        stamps = stamps.filter(stamp => !removedStamps.has(stamp.id)); walls = walls.filter(wall => !owned.interior.wallIds.includes(wall.id) || sharedWalls.has(wall.id));
        portals = portals.filter(portal => !owned.interior.portalIds.includes(portal.id) || sharedPortals.has(portal.id)); lights = lights.filter(light => !owned.interior.lightIds.includes(light.id));
        regions = regions.filter(region => region.id !== target.id); roles = roles.filter(role => role.regionId !== target.id); removedRegions.add(target.id); changed.add(target.id);
      } else if (target.kind === "wall") {
        if (!walls.some(wall => wall.id === target.id)) fail("invalid", "Die Wand existiert nicht.");
        checkOwners(owners("wallIds", target.id)); setWalls(target.id, []);
      } else if (target.kind === "portal") removePortal(target.id, true);
      else fail("invalid", "Unbekannte Bauteilauswahl.");
    } else if (operation.kind === "interior-transform" || operation.kind === "room-resize") {
      const target: InteriorTarget = operation.kind === "room-resize" ? { kind: "room", id: operation.regionId } : operation.target;
      const turns = operation.kind === "room-resize" ? 0 : operation.quarterTurns ?? 0, delta: TacticalPoint = operation.kind === "room-resize" ? [0, 0] : operation.delta;
      if (!finite(delta) || ![0, 1, 2, 3].includes(turns)) fail("invalid", "Verschiebung und Drehung prüfen.");
      let center: TacticalPoint, owned: (RoomRole & { interior: CartographyRoomInteriorV1 }) | undefined;
      const wallIds = new Set<string>(), portalIds = new Set<string>(), stampIds = new Set<string>(), lightIds = new Set<string>(), placeIds = new Set<string>();
      let scaleX = 1, scaleY = 1, resized: readonly [number, number, number, number] | undefined;
      if (target.kind === "room") {
        owned = room(target.id); const region = regions.find(region => region.id === target.id)!; const box = huelle(region.punkte); center = [(box[0] + box[2]) / 2, (box[1] + box[3]) / 2];
        owned.interior.wallIds.forEach(id => { checkOwners(owners("wallIds", id), true); wallIds.add(id); });
        owned.interior.portalIds.forEach(id => { checkOwners(owners("portalIds", id), true); portalIds.add(id); });
        owned.interior.stampIds.forEach(id => stampIds.add(id)); owned.interior.lightIds.forEach(id => lightIds.add(id));
        owned.interior.placeIds?.forEach(id => placeIds.add(id));
        if (operation.kind === "room-resize") {
          if (!finite(operation.from) || !finite(operation.to)) fail("invalid", "Die neue Raumgröße ist ungültig.");
          resized = huelle(rect(operation.from, operation.to));
          const sx = (resized[2] - resized[0]) / (box[2] - box[0]), sy = (resized[3] - resized[1]) / (box[3] - box[1]);
          if (sx <= 0 || sy <= 0) fail("invalid", "Breite und Tiefe müssen größer als null sein.");
          scaleX = sx; scaleY = sy;
        }
      } else if (target.kind === "wall") {
        const wall = walls.find(wall => wall.id === target.id); if (!wall) fail("invalid", "Die Wand existiert nicht."); checkOwners(owners("wallIds", target.id)); wallIds.add(target.id);
        const box = huelle(wall!.points); center = [(box[0] + box[2]) / 2, (box[1] + box[3]) / 2];
      } else if (target.kind === "portal") {
        const portal = portals.find(portal => portal.id === target.id); if (!portal) fail("invalid", "Die Tür existiert nicht."); checkOwners(owners("portalIds", target.id));
        // Moving a fitted doorway alone would leave its cut in the original wall.
        if (!portal!.freestanding && (delta[0] || delta[1] || turns)) fail("protected", "Entferne die Tür und setze sie an der neuen Wandposition; die alte Öffnung wird dabei geschlossen.");
        center = portal!.position; portalIds.add(target.id); portalArtwork(target.id).forEach(id => stampIds.add(id));
      } else return fail("invalid", "Unbekannte Bauteilauswahl.");
      const transform = (point: TacticalPoint): TacticalPoint => {
        const x = (point[0] - center[0]) * scaleX, y = (point[1] - center[1]) * scaleY;
        const [rx, ry] = turns === 1 ? [-y, x] : turns === 2 ? [-x, -y] : turns === 3 ? [y, -x] : [x, y];
        const cx = resized ? (resized[0] + resized[2]) / 2 : center[0] + delta[0], cy = resized ? (resized[1] + resized[3]) / 2 : center[1] + delta[1];
        const result: TacticalPoint = [q(cx + rx), q(cy + ry)]; if (!within(result)) fail("invalid", "Das Bauteil passt an dieser Position nicht auf die Karte."); return result;
      };
      if (owned) { const points = regions.find(region => region.id === target.id)!.punkte.map(transform); checkPolygon(points, target.id); regions = regions.map(region => region.id === target.id ? { ...region, punkte: points } : region); mark(target.id); }
      walls = walls.map(wall => wallIds.has(wall.id) ? { ...wall, points: wall.points.map(transform) } : wall);
      portals = portals.map(portal => { if (!portalIds.has(portal.id)) return portal; const bounds = portal.bounds.map(transform) as unknown as readonly [TacticalPoint, TacticalPoint]; return { ...portal, position: transform(portal.position), bounds, rotationRadians: Math.atan2(bounds[1][1] - bounds[0][1], bounds[1][0] - bounds[0][0]) }; });
      const artworkScale = Math.min(scaleX, scaleY);
      stamps = stamps.map(stamp => { if (!stampIds.has(stamp.id)) return stamp; const [x, y] = transform([stamp.x, stamp.y]); return { ...stamp, x, y, s: stamp.s * artworkScale, r: stamp.r + turns * Math.PI / 2 }; });
      lights = lights.map(light => lightIds.has(light.id) ? { ...light, position: transform(light.position), range: light.range * artworkScale } : light);
      places = places.map(place => { if (!placeIds.has(place.id)) return place; const [x, y] = transform([place.x, place.y]); return { ...place, x, y }; });
      for (const wallId of wallIds) owners("wallIds", wallId).forEach(owner => mark(owner.regionId));
      for (const portalId of portalIds) owners("portalIds", portalId).forEach(owner => mark(owner.regionId));
    } else fail("invalid", "Unbekanntes Innenraumwerkzeug.");
    const nextDocument = parseTacticalMapDocument({ ...document, geometry: { ...document.geometry, regions, stamps, places }, walls, portals, lights,
      geometryElevation: document.geometryElevation.filter(item => !(item.targetKind === "region" && removedRegions.has(item.targetId) || item.targetKind === "stamp" && removedStamps.has(item.targetId) || item.targetKind === "place" && removedPlaces.has(item.targetId))) });
    const nextCartography = parseTacticalCartography({ ...cartography, regions: roles }, nextDocument);
    return { ok: true, document: nextDocument, cartography: nextCartography, addedBuildings: [], addedRooms, removedRegionIds: [...removedRegions], removedStampIds: [...removedStamps], removedPlaceIds: [...removedPlaces], changedRegionIds: [...changed], diagnostics };
  } catch (error) {
    if (error instanceof InteriorFailure) return { ok: false, code: error.code, regionIds: error.ids, message: error.message };
    return { ok: false, code: "invalid", regionIds: [], message: error instanceof Error ? error.message : "Die Innenraumbearbeitung ist ungültig." };
  }
}
