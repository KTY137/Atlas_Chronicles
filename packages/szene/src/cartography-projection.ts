// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import type { KartenSetting } from "./model.ts";
import { RELIEF_LEVELS, reliefHeightAt, type CartographyReliefV1, type TacticalCartographyV1 } from "./cartography.ts";
import type { TacticalMapDocumentV1, TacticalPoint } from "./tactical-map.ts";

/** Bump whenever these pixels change; this pin belongs in every cartography raster key. */
export const rendererVersion = "cartography-10" as const;
/** What of the relief the viewer wants drawn. Presentation only; the stored map is untouched. */
export interface CartographyView { readonly contours?: boolean; readonly shading?: boolean; /** Parchment mottle and edge vignette on a generated map. */ readonly paper?: boolean }
export interface CartographyPolygon {
  readonly regionId: string;
  readonly points: readonly TacticalPoint[];
  readonly fill: number;
  readonly opacity: number;
}
export interface CartographyDrawing {
  readonly rendererVersion: typeof rendererVersion;
  readonly width: number;
  readonly height: number;
  readonly background: number | null;
  readonly polygons: readonly CartographyPolygon[];
}
const palettes = {
  fantasy: { background: 0xe0d8bc, generic: 0xcac3ae, grass: 0xc5c48d, earth: 0xbba079, forest: 0x536b48, field: 0xb6a379, rock: 0xa8a69a, sand: 0xdfcd9e, swamp: 0x7c8a63, snow: 0xeef0ea, water: 0x659eaf, path: 0xe4d5af, street: 0xe0d6bd, square: 0xd8c9aa, bridge: 0xb49470, lot: 0xcac392, room: 0xd2c5ab, roof: 0xbd7354, roofLight: 0xdd9870, roofDark: 0x683e32 },
  gegenwart: { background: 0xd8d8cb, generic: 0xb6b7af, grass: 0xaabb97, earth: 0xbaab92, forest: 0x6d8c72, field: 0xbaba8b, rock: 0xa5aaa8, sand: 0xdacaac, swamp: 0x86927a, snow: 0xe8ebe9, water: 0x83afb9, path: 0xd1c6af, street: 0x909894, square: 0xbfc1b9, bridge: 0xa9aba4, lot: 0xc6cbbd, room: 0xced0c7, roof: 0xa2aaa8, roofLight: 0xc4cbc8, roofDark: 0x717f7d },
  scifi: { background: 0x536368, generic: 0x67767a, grass: 0x8caa90, earth: 0x9b8f7d, forest: 0x537c76, field: 0x9cac7b, rock: 0x839097, sand: 0xbeb695, swamp: 0x62777a, snow: 0xc7d1d4, water: 0x5a9fae, path: 0x96aaa8, street: 0x465b63, square: 0x7f9299, bridge: 0xa3b8ba, lot: 0x7d9190, room: 0x9bafb2, roof: 0x91aeb4, roofLight: 0xbcd2d4, roofDark: 0x5b7b88 },
} as const;
const order = { terrain: 0, lot: 1, generic: 2, room: 3, water: 4, road: 5, building: 6 };
/** Polygon half-plane clipping uses map coordinates identically in SVG and WebGL consumers. */
function half(points: readonly TacticalPoint[], axis: 0 | 1, at: number, greater: boolean): TacticalPoint[] {
  const result: TacticalPoint[] = [];
  for (let i = 0; i < points.length; i++) {
    const a = points[i]!, b = points[(i + 1) % points.length]!, da = (a[axis] - at) * (greater ? 1 : -1), db = (b[axis] - at) * (greater ? 1 : -1);
    if (da >= 0) result.push([a[0], a[1]]);
    if ((da >= 0) !== (db >= 0)) { const t = da / (da - db); result.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); }
  }
  return result;
}
function stripe(points: readonly TacticalPoint[], axis: 0 | 1, from: number, to: number): TacticalPoint[] { return half(half(points, axis, from, true), axis, to, false); }
function clip(points: readonly TacticalPoint[], direction: TacticalPoint, at: number, greater: boolean): TacticalPoint[] {
  const result: TacticalPoint[] = [];
  for (let i = 0; i < points.length; i++) {
    const a = points[i]!, b = points[(i + 1) % points.length]!, sign = greater ? 1 : -1;
    const da = (a[0] * direction[0] + a[1] * direction[1] - at) * sign, db = (b[0] * direction[0] + b[1] * direction[1] - at) * sign;
    if (da >= 0) result.push(a);
    if ((da >= 0) !== (db >= 0)) { const t = da / (da - db); result.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); }
  }
  return result;
}
function band(points: readonly TacticalPoint[], direction: TacticalPoint, from: number, to: number): TacticalPoint[] { return clip(clip(points, direction, from, true), direction, to, false); }
function phase(id: string, index = 0): number {
  let hash = 2166136261 ^ Math.imul(index + 1, 0x9e3779b1);
  for (let i = 0; i < id.length; i++) hash = Math.imul(hash ^ id.charCodeAt(i), 16777619);
  hash = Math.imul(hash ^ hash >>> 16, 0x7feb352d); hash = Math.imul(hash ^ hash >>> 15, 0x846ca68b);
  return ((hash ^ hash >>> 16) >>> 0) / 4294967296;
}
function tint(color: number, shift: number): number {
  const channel = (value: number) => Math.max(0, Math.min(255, Math.round(value + shift)));
  return channel(color >> 16) << 16 | channel(color >> 8 & 255) << 8 | channel(color & 255);
}
function roofAxes(points: readonly TacticalPoint[]) {
  let longest = 0, along: TacticalPoint = [1, 0];
  for (let i = 0; i < points.length; i++) { const a = points[i]!, b = points[(i + 1) % points.length]!, x = b[0] - a[0], y = b[1] - a[1], length = Math.hypot(x, y); if (length > longest) { longest = length; along = [x / length, y / length]; } }
  if (along[0] < 0 || along[0] === 0 && along[1] < 0) along = [-along[0], -along[1]];
  const across: TacticalPoint = [-along[1], along[0]], u = points.map(point => point[0] * along[0] + point[1] * along[1]), v = points.map(point => point[0] * across[0] + point[1] * across[1]);
  return { along, across, left: Math.min(...u), right: Math.max(...u), top: Math.min(...v), bottom: Math.max(...v) };
}
function inside(point: TacticalPoint, polygon: readonly TacticalPoint[]): boolean {
  let result = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i]!, b = polygon[j]!;
    if ((a[1] > point[1]) !== (b[1] > point[1]) && point[0] < (b[0] - a[0]) * (point[1] - a[1]) / (b[1] - a[1]) + a[0]) result = !result;
  }
  return result;
}
function mix(first: number, second: number, amount: number): number {
  const channel = (shift: number) => Math.round((first >> shift & 255) * (1 - amount) + (second >> shift & 255) * amount);
  return channel(16) << 16 | channel(8) << 8 | channel(0);
}

interface Bank { readonly a: TacticalPoint; readonly b: TacticalPoint; readonly inward: number }
/** Sweep collinear edge intervals. Opposite occupied sides cancel even if a neighbour
 * subdivides its shared edge; duplicate polygons on the same side still have one shore.
 * Any material group may be swept: the generator tessellates one wood, one massif or one
 * lake into many polygons, and only the outer silhouette of that group is a real edge.
 * Decorating every polygon instead would expose the tessellation as a lattice of seams. */
function regionBanks(regions: readonly { id: string; punkte: readonly TacticalPoint[] }[]): Map<string, Bank[]> {
  interface Edge { id: string; side: number; from: number; to: number }
  interface Group { u: number; v: number; c: number; edges: Edge[] }
  const groups = new Map<string, Group>(), result = new Map<string, Bank[]>();
  for (const region of regions) {
    const points = region.punkte;
    const winding = Math.sign(points.reduce((sum,a,i)=>{const b=points[(i+1)%points.length]!;return sum+a[0]*b[1]-b[0]*a[1];},0));
    if (!winding) continue;
    for (let i=0;i<points.length;i++) {
      const a=points[i]!,b=points[(i+1)%points.length]!,dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy);
      if (!length) continue;
      const direction=dx<0||dx===0&&dy<0?-1:1,u=dx/length*direction,v=dy/length*direction,c=-v*a[0]+u*a[1];
      // Sub-nanopixel normalization absorbs only arithmetic noise in shared coordinates.
      const key=`${u.toFixed(12)},${v.toFixed(12)},${c.toFixed(9)}`;
      const group=groups.get(key)??{u,v,c,edges:[]};
      const first=group.u*a[0]+group.v*a[1],second=group.u*b[0]+group.v*b[1];
      group.edges.push({id:region.id,side:winding*direction,from:Math.min(first,second),to:Math.max(first,second)});
      groups.set(key,group);
    }
  }
  for (const group of groups.values()) {
    const events=group.edges.flatMap((edge,index)=>[{at:edge.from,index,start:true},{at:edge.to,index,start:false}]).sort((a,b)=>a.at-b.at);
    const left=new Set<number>(),right=new Set<number>();let previous=events[0]!.at,index=0;
    const point=(t:number):TacticalPoint=>[group.u*t-group.v*group.c,group.v*t+group.u*group.c];
    while(index<events.length) {
      const at=events[index]!.at;
      if(at>previous&&!!left.size!==!!right.size) {
        const active=left.size?left:right,edge=group.edges[active.values().next().value!]!,banks=result.get(edge.id)??[];
        banks.push({a:point(previous),b:point(at),inward:left.size?1:-1});result.set(edge.id,banks);
      }
      while(index<events.length&&events[index]!.at===at) {
        const event=events[index++]!,set=group.edges[event.index]!.side>0?left:right;
        if(event.start)set.add(event.index);else set.delete(event.index);
      }
      previous=at;
    }
  }
  return result;
}
function line(a: TacticalPoint, b: TacticalPoint, thickness: number, offset = 0): TacticalPoint[] {
  const dx = b[0] - a[0], dy = b[1] - a[1], length = Math.hypot(dx, dy);
  if (!length) return [];
  const x = -dy / length, y = dx / length, lo = offset - thickness / 2, hi = offset + thickness / 2;
  return [[a[0]+x*lo,a[1]+y*lo],[b[0]+x*lo,b[1]+y*lo],[b[0]+x*hi,b[1]+y*hi],[a[0]+x*hi,a[1]+y*hi]];
}
/** Outdoor building plans have stone perimeter walls. Room plans and wall geometry too
 * large for the shared polygon budget retain the complete existing line overlay. */
export function cartographyPaintsWalls(cartography: TacticalCartographyV1, document: TacticalMapDocumentV1): boolean {
  const segments=document.walls.reduce((sum,wall)=>sum+wall.points.length-1,0);
  const regionPoints=document.geometry.regions.reduce((sum,region)=>sum+region.punkte.length,0);
  return cartography.regions.some(region => region.role === "building") && !cartography.regions.some(region => region.role === "room")
    && regionPoints+segments*8<=240_000 && document.geometry.regions.length+segments*2<=28_000;
}

/**
 * Pure display geometry only. Callers supply an authorized matching revision and apply the
 * exact knowledge mask to the final drawing. Names, seeds, URLs and DOM never enter output.
 * Missing role evidence remains generic; absence of a building is never proof of a road.
 */
export function cartographyDraw(document: TacticalMapDocumentV1, cartography: TacticalCartographyV1, setting: KartenSetting = "fantasy", view: CartographyView = {}): CartographyDrawing {
  const palette = palettes[setting], roles = new Map(cartography.regions.map(region => [region.regionId, region]));
  const polygons: CartographyPolygon[] = []; let decorationPoints = 0, decorationPolygons = 0;
  const paintWalls=cartographyPaintsWalls(cartography,document),wallSegments=paintWalls?document.walls.reduce((sum,wall)=>sum+wall.points.length-1,0):0;
  const basePoints = document.geometry.regions.reduce((sum, region) => sum + region.punkte.length, 0)+wallSegments*8;
  const basePolygons=document.geometry.regions.length+wallSegments*2;
  const emit = (regionId: string, points: readonly TacticalPoint[], fill: number, opacity = 1, decoration = true) => {
    // Decorative detail is deterministic and bounded separately; every semantic base polygon
    // is always retained within the shared rasterizer's 32K-polygon / 256K-point admission.
    if (points.length < 3 || decoration && (decorationPolygons >= 30_000 - basePolygons || decorationPoints + points.length > 250_000 - basePoints)) return;
    if (decoration) { decorationPoints += points.length; decorationPolygons++; }
    polygons.push({ regionId, points: points.map(point => [point[0], point[1]] as const), fill, opacity });
  };
  const regions = document.geometry.regions.map((region, index) => ({ ...region, index, role: roles.get(region.id) }));
  const banks=regionBanks(regions.filter(region=>region.role?.role==="water"));
  // One silhouette per contiguous material area, for the same reason water has one shore.
  const groupBank=(material:"rock"|"field")=>regionBanks(regions.filter(region=>region.role?.role==="terrain"&&region.role.material===material));
  const rockBanks=groupBank("rock"), fieldBanks=groupBank("field");
  const roadBanks=regionBanks(regions.filter(region=>region.role?.role==="road"));
  // Which roofs stand on which plot, so a garden never grows under a house.
  const lotHouses = new Map<string, readonly (readonly TacticalPoint[])[]>();
  for (const region of regions) if (region.role?.role === "building" && region.role.lotRegionId) lotHouses.set(region.role.lotRegionId, [...(lotHouses.get(region.role.lotRegionId) ?? []), region.punkte]);
  const ink = setting === "scifi" ? 0x304d57 : 0x504537;
  const pen = Math.max(.8, Math.min(4, cartography.construction.cellSize * .035));
  const bridge = (role: typeof regions[number]["role"]) => role?.role === "road" && role.material === "bridge" ? 1 : 0;
  // Rock is the last ground to be painted and the relief goes down just before it: contour
  // lines belong on meadow, field and wood, while a massif carries its own drawn summits.
  const rank = (role: typeof regions[number]["role"]) => order[role?.role ?? "generic"] + (role?.role === "terrain" ? role.material === "rock" ? .5 : role.material === "forest" ? .2 : 0 : 0);
  regions.sort((a, b) => rank(a.role) - rank(b.role) || bridge(a.role) - bridge(b.role) || a.index - b.index);
  // The relief is drawn once, above every ground material and below water, roads and roofs:
  // hillshade from the height field and contour lines above the water line. Both attach to the
  // largest ground region — the scene check wants a real region id, and the knowledge mask
  // works on pixels, so the owner only has to exist. Under water nothing is drawn: water is
  // where the land lies at or below the water line, so no contour ever crosses a lake.
  const relief = cartography.relief, seaLevel = relief?.seaLevel ?? 77;
  // Paper first: a generated map is drawn on aged parchment, mottled from one global lattice
  // so the blotches never follow any region. Imported images keep their own surface.
  const paperOwner = document.background || view.paper === false ? undefined : regions[0]?.id;
  const [paperWidth, paperHeight] = document.geometry.size;
  if (paperOwner) {
    const spacing = Math.max(48, cartography.construction.cellSize * 1.4);
    const across = Math.ceil(paperWidth / spacing) + 1, down = Math.ceil(paperHeight / spacing) + 1, step = Math.max(1, Math.ceil(Math.sqrt(across * down / 900)));
    for (let row = 0; row <= down; row += step) for (let column = 0; column <= across; column += step) {
      const key = `paper:${column}:${row}`, x = column * spacing + spacing * phase(key, 1), y = row * spacing + spacing * phase(key, 2), size = spacing * (.5 + phase(key, 3) * .6);
      const blotch = Array.from({ length: 9 }, (_, index) => { const angle = index * Math.PI * 2 / 9, reach = size * (.7 + .3 * phase(key, 10 + index)); return [x + Math.cos(angle) * reach, y + Math.sin(angle) * reach * .8] as TacticalPoint; });
      emit(paperOwner, blotch, phase(key, 4) < .5 ? tint(palette.background, -9) : tint(palette.background, 8), .24);
    }
  }
  const groundOwner = regions.filter(region => region.role?.role === "terrain" || !region.role || region.role.role === "generic")
    .map(region => { const xs = region.punkte.map(p => p[0]), ys = region.punkte.map(p => p[1]); return { id: region.id, size: (Math.max(...xs) - Math.min(...xs)) * (Math.max(...ys) - Math.min(...ys)) }; })
    .sort((a, b) => b.size - a.size || (a.id < b.id ? -1 : 1))[0]?.id ?? regions[0]?.id;
  // The mottle belongs to open ground — meadow, earth, sand, field, marsh, snow. A map whose only
  // ground is a massif or a wood gets none: rock has its crags and a wood its crowns.
  const openOwner = regions.filter(region => region.role?.role === "terrain" && !["rock", "forest"].includes(region.role.material))
    .map(region => { const xs = region.punkte.map(p => p[0]), ys = region.punkte.map(p => p[1]); return { id: region.id, size: (Math.max(...xs) - Math.min(...xs)) * (Math.max(...ys) - Math.min(...ys)) }; })
    .sort((a, b) => b.size - a.size || (a.id < b.id ? -1 : 1))[0]?.id;
  let reliefDrawn = !relief || !groundOwner, groundDressed = !openOwner;
  // Before the relief and the woods: the open ground gets a painter's mottle from the global
  // lattice, two tones of the meadow at low opacity, so a plain is a surface, not a fill.
  const dressGround = () => {
    if (!openOwner) return;
    const spacing = Math.max(40, cartography.construction.cellSize * 2.2), across = Math.ceil(paperWidth / spacing) + 1, down = Math.ceil(paperHeight / spacing) + 1;
    const step = Math.max(1, Math.ceil(Math.sqrt(across * down / 700))), warm = mix(palette.grass, palette.sand, .5), cool = mix(palette.grass, palette.forest, .45);
    for (let row = 0; row <= down; row += step) for (let column = 0; column <= across; column += step) {
      const key = `ground:${column}:${row}`, x = column * spacing + spacing * phase(key, 1), y = row * spacing + spacing * phase(key, 2), size = spacing * (.55 + phase(key, 3) * .55);
      const blotch = Array.from({ length: 9 }, (_, index) => { const angle = index * Math.PI * 2 / 9, reach = size * (.7 + .3 * phase(key, 10 + index)); return [x + Math.cos(angle) * reach, y + Math.sin(angle) * reach * .75] as TacticalPoint; });
      emit(openOwner, blotch, phase(key, 4) < .5 ? warm : cool, .11);
    }
  };
  const drawRelief = () => {
    if (!relief || !groundOwner) return;
    const { construction } = cartography, z = construction.cellSize, [ox, oy] = construction.origin;
    const columns = relief.columns - 1, rows = relief.rows - 1, sea = relief.seaLevel;
    const at = (i: number, j: number) => relief.heights[Math.max(0, Math.min(relief.rows - 1, j)) * relief.columns + Math.max(0, Math.min(relief.columns - 1, i))]!;
    const sample = (u: number, v: number) => reliefHeightAt(relief, construction, ox + u * z, oy + v * z);
    // Contour levels every `contourStep` above the water line; a mountainous map thins them to
    // whatever count the budget carries. Terraces and lines share the levels, so they agree.
    let crossings = 0;
    for (let v = 0; v < rows; v++) for (let u = 0; u < columns; u++) { const h = [at(u, v), at(u + 1, v), at(u + 1, v + 1), at(u, v + 1)]; crossings += Math.floor((Math.max(...h) - Math.max(sea, Math.min(...h))) / RELIEF_LEVELS.contourStep); }
    const step = RELIEF_LEVELS.contourStep * Math.max(1, Math.ceil(crossings / 9_000));
    // Every isoline segment is found once per cell and level; shading and ink both use it.
    // Shaded relief is done the way Tanaka drew it: each contour is illuminated, light along
    // the flank that faces the north-west light and dark along the flank that turns away,
    // wider the more squarely it faces or turns. Nothing is stacked over an area, so a high
    // plateau stays the colour of its ground, and a map without slopes stays untouched.
    const light = tint(palette.background, 34), shadow = 0x2b3a2e;
    /** Convex pieces of one cell where `keep(value)` holds, the isoline interpolated linearly. */
    const cellPieces = (h: readonly number[], level: number, keep: (value: number) => boolean, u: number, v: number): TacticalPoint[][] => {
      const square: TacticalPoint[] = [[u, v], [u + 1, v], [u + 1, v + 1], [u, v + 1]], inside = h.map(keep), count = inside.filter(Boolean).length;
      if (!count) return []; if (count === 4) return [square];
      const cross = (k: number, l: number): TacticalPoint => { const s = h[k] === h[l] ? .5 : Math.max(0, Math.min(1, (level - h[k]!) / (h[l]! - h[k]!))); return [square[k]![0] + (square[l]![0] - square[k]![0]) * s, square[k]![1] + (square[l]![1] - square[k]![1]) * s]; };
      if (count === 2 && inside[0] === inside[2]) return inside[0] ? [[square[0]!, cross(0, 1), cross(3, 0)], [square[2]!, cross(2, 3), cross(1, 2)]] : [[square[1]!, cross(1, 2), cross(0, 1)], [square[3]!, cross(3, 0), cross(2, 3)]];
      const piece: TacticalPoint[] = [];
      for (let k = 0; k < 4; k++) { const l = (k + 1) % 4; if (inside[k]) piece.push(square[k]!); if (inside[k] !== inside[l]) piece.push(cross(k, l)); }
      return [piece];
    };
    const toMap = (piece: readonly TacticalPoint[]) => piece.map(([u, v]) => [ox + u * z, oy + v * z] as TacticalPoint);
    if (view.shading !== false) {
      // Bathymetry: the sea floor falls away from the shore in steps of the same contour interval,
      // each step a shade deeper. Water is where the land lies under the water line, so these
      // bands never leave the water. A huge sea keeps one shelf so the budget survives.
      let wet = 0;
      for (let v = 0; v < rows; v++) for (let u = 0; u < columns; u++) if (Math.min(at(u, v), at(u + 1, v), at(u + 1, v + 1), at(u, v + 1)) < sea) wet++;
      const deep = mix(palette.water, 0x1d3648, .55), bands = wet * 3 > 6000 ? 1 : 3;
      for (let band = 1; band <= bands; band++) {
        const level = sea - band * step * (bands === 1 ? 1.5 : 1);
        for (let v = 0; v < rows; v++) for (let u = 0; u < columns; u++) {
          const h = [at(u, v), at(u + 1, v), at(u + 1, v + 1), at(u, v + 1)];
          if (Math.min(...h) >= level) continue;
          for (const piece of cellPieces(h, level, value => value < level, u, v)) emit(groundOwner, toMap(piece), deep, .15);
        }
      }
      // Hills: on land that rises above the plain but stays below the rock, small drawn mounds
      // on one global lattice, denser the higher the land; not on tilled fields.
      const fields = regions.filter(region => region.role?.role === "terrain" && region.role.material === "field").map(region => { const xs = region.punkte.map(p => p[0]), ys = region.punkte.map(p => p[1]); return { points: region.punkte, box: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)] as const }; });
      const hillLine = sea + RELIEF_LEVELS.flatLand + 16, rockLine = sea + RELIEF_LEVELS.rockAbove, spacing = Math.max(8, z * 1.35), mound = tint(palette.background, 22);
      for (let row = 0; row <= Math.ceil(rows * z / spacing); row++) for (let column = 0; column <= Math.ceil(columns * z / spacing); column++) {
        const key = `hill:${column}:${row}`, x = ox + column * spacing + spacing * (.15 + .7 * phase(key, 1)), y = oy + row * spacing + spacing * (.15 + .7 * phase(key, 2));
        if (x < ox || y < oy || x > ox + columns * z || y > oy + rows * z) continue;
        const height = reliefHeightAt(relief, construction, x, y);
        if (height < hillLine || height > rockLine - 4 || phase(key, 51) > Math.min(1, (height - hillLine) / 50) * .85) continue;
        if (fields.some(field => x >= field.box[0] && x <= field.box[2] && y >= field.box[1] && y <= field.box[3] && inside([x, y], field.points))) continue;
        const w = z * .5 * (.8 + .4 * phase(key, 52)), h = w * .42 * (.9 + .3 * phase(key, 53));
        const arc: TacticalPoint[] = [[x - w / 2, y], [x - w * .3, y - h * .75], [x - w * .08, y - h], [x + w * .18, y - h * .9], [x + w * .4, y - h * .55], [x + w / 2, y]];
        emit(groundOwner, arc, mound, .55);
        emit(groundOwner, [[x + w * .02, y - h * .98], [x + w * .18, y - h * .9], [x + w * .4, y - h * .55], [x + w / 2, y], [x + w * .05, y]], shadow, .16);
        for (let index = 0; index + 1 < arc.length; index++) emit(groundOwner, line(arc[index]!, arc[index + 1]!, pen * .42), ink, .5);
      }
    }
    if (view.shading !== false || view.contours !== false) {
      for (let v = 0; v < rows; v++) for (let u = 0; u < columns; u++) {
        const corners: TacticalPoint[] = [[u, v], [u + 1, v], [u + 1, v + 1], [u, v + 1]], h = [at(u, v), at(u + 1, v), at(u + 1, v + 1), at(u, v + 1)];
        const low = Math.min(...h), high = Math.max(...h);
        if (high <= sea) continue;
        for (let level = sea + step * Math.max(1, Math.ceil((low - sea) / step)); level <= high; level += step) {
          if (level <= low) continue;
          const points: TacticalPoint[] = [];
          for (let e = 0; e < 4; e++) {
            const a = h[e]!, b = h[(e + 1) % 4]!;
            if (a >= level === b >= level) continue;
            const s = (level - a) / (b - a), p = corners[e]!, q = corners[(e + 1) % 4]!;
            points.push([ox + (p[0] + (q[0] - p[0]) * s) * z, oy + (p[1] + (q[1] - p[1]) * s) * z]);
          }
          const firm = Math.round((level - sea) / step) % 5 === 0;
          // Downhill direction of this cell, from its own four corners; the strip sits on the
          // lower side of the line, where the slope falls away from the contour.
          const gx = (h[1]! - h[0]! + h[2]! - h[3]!) / 2, gy = (h[3]! - h[0]! + h[2]! - h[1]!) / 2, slope = Math.hypot(gx, gy) || 1;
          const downX = -gx / slope, downY = -gy / slope, lit = -(downX + downY) * .707;
          const stroke = (a: TacticalPoint, b: TacticalPoint) => {
            if (view.shading !== false && Math.abs(lit) > .12) {
              const width = pen * (.6 + 2.2 * Math.abs(lit)), nx = -(b[1] - a[1]), ny = b[0] - a[0], toward = nx * downX + ny * downY >= 0 ? 1 : -1;
              emit(groundOwner, line(a, b, width, toward * width / 2), lit > 0 ? light : shadow, lit > 0 ? .18 + .3 * lit : .1 + .34 * -lit);
            }
            if (view.contours !== false) emit(groundOwner, line(a, b, pen * (firm ? .55 : .36)), ink, firm ? .46 : .3);
          };
          if (points.length === 2) stroke(points[0]!, points[1]!);
          else if (points.length === 4) { stroke(points[0]!, points[1]!); stroke(points[2]!, points[3]!); }
        }
      }
    }
  };
  let roofsStarted = false;
  for (const region of regions) {
    const { id, punkte: points, role } = region;
    if (!groundDressed && rank(role) > 0) { groundDressed = true; dressGround(); }
    if (!reliefDrawn && rank(role) > 0) { reliefDrawn = true; drawRelief(); }
    let fill: number = palette.generic;
    if (role?.role === "terrain") fill = palette[role.material];
    // A farmland is a patchwork: every parcel is young green, ripe gold or turned earth.
    if (role?.role === "terrain" && role.material === "field") fill = [palette.field, mix(palette.field, palette.grass, .5), mix(palette.field, 0xd9b45a, .55)][Math.floor(phase(id, 3) * 3)]!;
    // A massif pales with height, from its grey foot to its bright shoulders under the snow.
    if (role?.role === "terrain" && role.material === "rock" && relief) {
      const centre: TacticalPoint = [points.reduce((sum, point) => sum + point[0], 0) / points.length, points.reduce((sum, point) => sum + point[1], 0) / points.length];
      const rockLine = relief.seaLevel + RELIEF_LEVELS.rockAbove, above = Math.max(0, Math.min(1, (reliefHeightAt(relief, cartography.construction, centre[0], centre[1]) - rockLine) / Math.max(1, 255 - rockLine)));
      fill = mix(palette.rock, mix(palette.rock, palette.background, .5), above * .7);
    }
    else if (role?.role === "water") fill = palette.water;
    else if (role?.role === "road") fill = palette[role.material];
    else if (role?.role === "room" && role.interior) fill = role.interior.floor === "wood" ? 0xb78c60 : role.interior.floor === "tile" ? 0xd0cbbc : 0x929591;
    else if (role?.role === "lot" || role?.role === "room") fill = palette[role.role];
    else if (role?.role === "building") fill = palette.roof;
    if (role?.role === "building" && !roofsStarted) {
      roofsStarted = true;
      for (const house of regions.filter(item => item.role?.role === "building")) {
        const axes = roofAxes(house.punkte), shadow = Math.max(1, Math.min(cartography.construction.cellSize * .18, (axes.bottom - axes.top) * .25));
        emit(house.id, house.punkte.map(point => [point[0] + shadow * 1.05, point[1] + shadow * 1.3]), 0x26332b, .09);
        emit(house.id, house.punkte.map(point => [point[0] + shadow * .75, point[1] + shadow]), 0x26332b, .38);
      }
    }
    emit(id, points, fill, document.background && (!role || role.role === "generic" || role.role === "room" && !role.interior) ? .08 : 1, false);
    const xs = points.map(point => point[0]), ys = points.map(point => point[1]);
    const minX = Math.min(...xs), minY = Math.min(...ys), maxX = Math.max(...xs), maxY = Math.max(...ys);
    const width = maxX - minX, height = maxY - minY;
    if (!width || !height) continue;
    if (role?.role === "building") {
      const axes = roofAxes(points), middle = (axes.top + axes.bottom) / 2, shift = (phase(id) - .5) * 24;
      const ridge = Math.max(.65, Math.min(2.2, (axes.bottom - axes.top) * .035));
      if (setting === "fantasy") {
        emit(id, clip(points, axes.across, middle, false), tint(palette.roofLight, shift));
        emit(id, clip(points, axes.across, middle, true), tint(palette.roof, shift - 16));
        emit(id, band(points, axes.across, middle - ridge, middle + ridge), tint(palette.roofDark, shift), .7);
        // Fine seams follow the house's own long axis, including rotated footprints.
        for (let index = 1; index < 5; index++) {
          const at = axes.left + (axes.right - axes.left) * index / 5;
          emit(id, band(points, axes.along, at, at + ridge * .35), palette.roofDark, .18);
        }
        // Most houses have a chimney on the shaded slope, a little off the ridge, with its own
        // shadow; the hearth is what makes a roof a home rather than a lid.
        if (axes.bottom - axes.top > cartography.construction.cellSize * .35 && phase(id, 7) < .72) {
          const size = Math.max(1.5, ridge * 2.2), a = axes.left + (axes.right - axes.left) * (.62 + phase(id, 8) * .22), c = middle + size * 1.4;
          const at = (u: number, v: number): TacticalPoint => [axes.along[0] * u + axes.across[0] * v, axes.along[1] * u + axes.across[1] * v];
          const stack: TacticalPoint[] = [at(a - size / 2, c - size / 2), at(a + size / 2, c - size / 2), at(a + size / 2, c + size / 2), at(a - size / 2, c + size / 2)];
          if (stack.every(point => inside(point, points))) {
            emit(id, stack.map(point => [point[0] + size * .45, point[1] + size * .55]), 0x26332b, .35);
            emit(id, stack, 0x5a4a40);
            emit(id, [at(a - size / 2, c - size / 2), at(a + size / 2, c - size / 2), at(a + size / 2, c - size * .18), at(a - size / 2, c - size * .18)], 0x8d7a6a);
          }
        }
      } else {
        emit(id, points, tint(palette.roofLight, shift - 10));
        const edge = Math.max(.5, (axes.bottom - axes.top) * .07);
        emit(id, band(points, axes.across, axes.top, axes.top + edge), palette.roofLight);
        emit(id, band(points, axes.across, axes.bottom - edge, axes.bottom), palette.roofDark, .6);
        for (let index = 1; index < (setting === "scifi" ? 5 : 3); index++) {
          const at = axes.left + (axes.right - axes.left) * index / (setting === "scifi" ? 5 : 3);
          emit(id, band(points, axes.along, at, at + ridge * .65), palette.roofDark, .35);
        }
      }
      for (let index = 0; index < points.length; index++) {
        const a = points[index]!, b = points[(index + 1) % points.length]!;
        emit(id, line(a, b, pen), ink, .9);
      }
    } else if (role?.role === "room" && role.interior) {
      const step = Math.max(cartography.construction.cellSize * (role.interior.floor === "wood" ? .35 : .7), Math.max(width, height) / 70);
      const seam = Math.max(.5, step * .025);
      for (let y = minY + step; y < maxY; y += step) emit(id, stripe(points, 1, y, y + seam), 0x403c36, .25);
      if (role.interior.floor !== "wood") for (let x = minX + step; x < maxX; x += step) emit(id, stripe(points, 0, x, x + seam), 0x403c36, .22);
    } else if (role?.role === "lot") {
      const axes = roofAxes(points), edge = Math.max(.7, cartography.construction.cellSize * .008);
      for (let index = 0; index < points.length; index++) {
        const a = points[index]!, b = points[(index + 1) % points.length]!, length = Math.hypot(b[0] - a[0], b[1] - a[1]);
        if (!length) continue;
        const nx = -(b[1] - a[1]) / length * edge, ny = (b[0] - a[0]) / length * edge;
        emit(id, [[a[0]-nx,a[1]-ny],[b[0]-nx,b[1]-ny],[b[0]+nx,b[1]+ny],[a[0]+nx,a[1]+ny]], palette.roofDark, .13);
        // A picket fence along the plot: short posts in ink, a gap between each, so the yard
        // reads as fenced without a hard line boxing the map in.
        const posts = Math.min(60, Math.floor(length / (pen * 2.4)));
        for (let post = 0; post < posts && decorationPoints + 4 <= 250_000 - basePoints; post++) {
          const t = (post + .3) / posts, u = (post + .55) / posts;
          emit(id, line([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u], pen * .55), ink, .3);
        }
      }
      emit(id, band(points, axes.across, axes.top, axes.top + edge), palette.background, .4);
      // The yard behind the house: vegetable beds in short rows, a fruit tree or a bush, from
      // the global lattice, never under the roof. It is what makes a plot a home's garden.
      const houses = lotHouses.get(id) ?? [], spacing = Math.max(8, cartography.construction.cellSize * .5);
      const startX = Math.floor(minX / spacing), startY = Math.floor(minY / spacing), soil = tint(palette.earth, -34), leaf = mix(palette.forest, palette.grass, .4);
      const free = (point: TacticalPoint) => inside(point, points) && !houses.some(house => inside(point, house));
      for (let row = startY; row <= Math.ceil(maxY / spacing); row++) for (let column = startX; column <= Math.ceil(maxX / spacing); column++) {
        const key = `${column}:${row}`, pick = phase(key, 71);
        const x = column * spacing + spacing * phase(key, 72), y = row * spacing + spacing * phase(key, 73);
        if (pick < .34) {
          // Three furrows side by side, along the plot's own axis.
          const half = spacing * .3, step = spacing * .16;
          const rows = [-1, 0, 1].map(offset => [[x + axes.across[0] * step * offset - axes.along[0] * half, y + axes.across[1] * step * offset - axes.along[1] * half], [x + axes.across[0] * step * offset + axes.along[0] * half, y + axes.across[1] * step * offset + axes.along[1] * half]] as [TacticalPoint, TacticalPoint]);
          if (rows.every(([p, q]) => free(p) && free(q))) for (const [p, q] of rows) emit(id, line(p, q, pen * .5), soil, .38);
        } else if (pick < .44) {
          const size = spacing * (.32 + phase(key, 74) * .12);
          if (!free([x - size, y]) || !free([x + size, y]) || !free([x, y - size]) || !free([x, y + size])) continue;
          const crown = Array.from({ length: 14 }, (_, index) => { const angle = index * Math.PI / 7, reach = size * (.85 + .15 * phase(key, 80 + index)); return [x + Math.cos(angle) * reach, y + Math.sin(angle) * reach] as TacticalPoint; });
          emit(id, crown.map(point => [point[0] + size * .3, point[1] + size * .32]), 0x263c2b, .3);
          emit(id, crown.map(point => [x + (point[0] - x) * 1.06, y + (point[1] - y) * 1.06]), ink, .85);
          emit(id, crown, leaf);
          emit(id, crown.map(point => [x + (point[0] - x) * .6 - size * .12, y + (point[1] - y) * .6 - size * .12]), palette.grass, .35);
        } else if (pick < .52) {
          const size = spacing * .2;
          const bush: TacticalPoint[] = [[x - size, y + size * .2], [x - size * .6, y - size * .5], [x, y - size * .7], [x + size * .6, y - size * .45], [x + size, y + size * .25], [x + size * .4, y + size * .6], [x - size * .5, y + size * .55]];
          if (bush.every(free)) { emit(id, bush.map(point => [point[0] + size * .25, point[1] + size * .3]), 0x263c2b, .25); emit(id, bush, tint(palette.forest, 12)); }
        }
      }
    } else if (role?.role === "terrain" && role.material === "field") {
      for (const { a, b, inward: winding } of fieldBanks.get(id) ?? []) emit(id, line(a, b, pen*1.1, winding*pen*.55), palette.forest, .32);
      const axes = roofAxes(points), count = Math.min(44, Math.max(6, Math.ceil((axes.bottom - axes.top) / (cartography.construction.cellSize * .18))));
      for (let index = 1; index < count; index++) {
        const at = axes.top + (axes.bottom - axes.top) * index / count;
        emit(id, band(points, axes.across, at, at + pen * .7), palette.roofDark, .3);
        emit(id, band(points, axes.across, at + pen, at + pen * 1.6), palette.sand, .3);
      }
    } else if (role?.role === "terrain" && role.material === "rock") {
      // A massif is drawn relief, not a grey patch. Peaks stand inside the region, lit from
      // the north-west, each with a cast shadow and an ink silhouette; the group's own outer
      // edge gets a lit talus rim so the range sits on the land instead of floating over it.
      const light = mix(palette.rock, palette.background, .5), dark = tint(palette.rock, -42), snow = mix(light, palette.background, .55);
      for (const { a, b, inward: winding } of rockBanks.get(id) ?? []) {
        emit(id, line(a, b, pen*2.2, winding*pen*1.1), light, .45);
        emit(id, line(a, b, pen*.6), ink, .5);
      }
      // A peak is roughly one construction cell wide, so a range reads as many drawn summits
      // rather than as a handful of giant triangles. The summits sit on ONE global lattice, for
      // the same reason the ripples and the tufts do: the generator tessellates a massif into
      // many pieces, and a lattice per piece printed that tessellation as fields of dwarf crags.
      const size = Math.max(3, cartography.construction.cellSize * .46), spacing = Math.max(4, cartography.construction.cellSize * .82);
      const startX = Math.floor(minX / spacing), startY = Math.floor(minY / spacing);
      const peaks: { x: number; y: number; size: number; snow: boolean; key: string }[] = [];
      const rockLine = relief ? relief.seaLevel + RELIEF_LEVELS.rockAbove : 0, snowLine = relief ? relief.seaLevel + RELIEF_LEVELS.snowAbove : Infinity;
      for (let row = startY; row <= Math.ceil(maxY / spacing); row++) for (let column = startX; column <= Math.ceil(maxX / spacing); column++) {
        const key = `${column}:${row}`;
        const x = column * spacing + spacing * (.2 + .6 * phase(key, 21) + (row % 2) * .25), y = row * spacing + spacing * (.25 + .5 * phase(key, 22));
        if (!inside([x, y], points)) continue;
        // With a relief the summits follow the land: a crag grows with the height under it, the
        // fringe of a massif keeps only its talus, and snow lies where the land is high enough.
        // Without one, a coarse second lattice raises whole shoulders so summits still cluster.
        if (relief) {
          const height = reliefHeightAt(relief, cartography.construction, x, y), above = (height - rockLine) / Math.max(1, 255 - rockLine);
          if (height < rockLine - 6) continue;
          peaks.push({ x, y, key, size: size * (.6 + phase(key, 23) * .4) * (.6 + Math.max(0, above) * 1.3), snow: height >= snowLine });
        } else {
          const massif = phase(`${Math.floor(x / (spacing * 3.5))}:${Math.floor(y / (spacing * 3.5))}`, 11);
          peaks.push({ x, y, key, size: size * (.5 + phase(key, 23) * .7) * (.62 + massif * .82), snow: false });
        }
      }
      // Painter's order: a peak further down the map overlaps the one standing behind it.
      peaks.sort((first, second) => first.y - second.y || first.x - second.x);
      for (const peak of peaks) {
        const half = peak.size, high = peak.size * 1.5, foot = peak.y + high * .5, key = peak.key;
        // Every summit gets its own stone tone and its own shoulders. Without that a range
        // reads as one triangle stamped in a grid, which is exactly how the first pass looked.
        const stone = (phase(key, 25) - .5) * 26;
        const apex: TacticalPoint = [peak.x + (phase(key, 24) - .5) * half * .34, peak.y - high * .5];
        const heart: TacticalPoint = [peak.x, foot - high * .34];
        const lift = .3 + phase(key, 26) * .3, drop = .28 + phase(key, 27) * .28;
        const shoulder: TacticalPoint = [peak.x - half * (.3 + phase(key, 28) * .22), foot - high * lift];
        const ridgeFoot: TacticalPoint = [peak.x + half * .06, foot];
        const silhouette: TacticalPoint[] = [apex, [peak.x + half * (.26 + phase(key, 29) * .2), foot - high * drop], [peak.x + half, foot], [peak.x - half, foot], shoulder];
        emit(id, silhouette.map(point => [point[0] + half * .3, point[1] + high * .12]), 0x26332b, .18);
        emit(id, silhouette.map(point => [heart[0] + (point[0] - heart[0]) * 1.08, heart[1] + (point[1] - heart[1]) * 1.08]), ink, .8);
        emit(id, silhouette, tint(dark, stone));
        emit(id, [apex, shoulder, [peak.x - half, foot], ridgeFoot], tint(light, stone));
        emit(id, line(apex, ridgeFoot, Math.max(.4, pen * .45)), ink, .35);
        if (peak.snow || !relief && peak.size > size * .9) emit(id, [apex, [apex[0] + half * .2, apex[1] + high * .19], [apex[0] - half * .18, apex[1] + high * .17]], snow, .85);
      }
    } else if (role?.role === "terrain" && role.material === "snow") {
      // A snowfield is quiet: the pale fill, and sparse blue-shadowed drifts on the global lattice.
      const spacing = Math.max(12, cartography.construction.cellSize * .6), drift = mix(palette.water, palette.snow, .55);
      const startX = Math.floor(minX / spacing), startY = Math.floor(minY / spacing);
      const step = Math.max(1, Math.ceil(Math.sqrt((Math.ceil(maxX / spacing) - startX + 1) * (Math.ceil(maxY / spacing) - startY + 1) / 1200)));
      for (let row = startY; row <= Math.ceil(maxY / spacing); row += step) for (let column = startX; column <= Math.ceil(maxX / spacing); column += step) {
        const key = `${column}:${row}`;
        if (phase(key, 9) > .3) continue;
        const x = column * spacing + spacing * phase(key, 1), y = row * spacing + spacing * phase(key, 2), scale = spacing * (.25 + phase(key, 3) * .2);
        const shape: TacticalPoint[] = [[x - scale, y + scale * .1], [x - scale * .3, y - scale * .12], [x + scale * .9, y - scale * .05], [x + scale * .5, y + scale * .22]];
        if (shape.every(point => inside(point, points))) emit(id, shape, drift, .35);
      }
    } else if (role?.role === "terrain" && role.material === "swamp") {
      // A marsh: dark pools and reed strokes, sampled from the global lattice like every ground.
      const spacing = Math.max(10, cartography.construction.cellSize * .5), pool = mix(palette.water, palette.swamp, .45), reed = tint(palette.swamp, -38);
      const startX = Math.floor(minX / spacing), startY = Math.floor(minY / spacing);
      const step = Math.max(1, Math.ceil(Math.sqrt((Math.ceil(maxX / spacing) - startX + 1) * (Math.ceil(maxY / spacing) - startY + 1) / 1800)));
      for (let row = startY; row <= Math.ceil(maxY / spacing); row += step) for (let column = startX; column <= Math.ceil(maxX / spacing); column += step) {
        const key = `${column}:${row}`, pick = phase(key, 6);
        if (pick > .5) continue;
        const x = column * spacing + spacing * phase(key, 1), y = row * spacing + spacing * phase(key, 2), scale = spacing * (.18 + phase(key, 3) * .16);
        if (pick < .18) {
          const puddle = Array.from({ length: 10 }, (_, index) => { const angle = index * Math.PI / 5; return [x + Math.cos(angle) * scale * 1.5, y + Math.sin(angle) * scale * .8] as TacticalPoint; });
          if (puddle.every(point => inside(point, points))) emit(id, puddle, pool, .55);
          continue;
        }
        const stroke = Math.max(.6, scale * .16), blades: readonly (readonly [number, number])[] = [[-.5, .95], [0, 1.15], [.5, .9]];
        if (blades.every(([foot, tall]) => inside([x + scale * foot, y + scale * .5], points) && inside([x + scale * foot * .6, y - scale * tall], points)))
          for (const [foot, tall] of blades) emit(id, line([x + scale * foot, y + scale * .5], [x + scale * foot * .6, y - scale * tall], stroke), reed, .5);
      }
    } else if (role?.role === "terrain" && (role.material === "grass" || role.material === "earth" || role.material === "sand")) {
      // Open ground gets a hand on it: tufts, pebbles and dune strokes. They sample one global
      // lattice for the same reason the ripples do -- a per-polygon scatter would print the
      // generator's tessellation onto the meadow as a visible grid of clusters.
      const material = role.material;
      const spacing = Math.max(10, cartography.construction.cellSize * (material === "sand" ? .7 : .45));
      const startX = Math.floor(minX / spacing), startY = Math.floor(minY / spacing);
      const step = Math.max(1, Math.ceil(Math.sqrt((Math.ceil(maxX / spacing) - startX + 1) * (Math.ceil(maxY / spacing) - startY + 1) / 1800)));
      const shade = material === "grass" ? mix(palette.grass, palette.forest, .5) : material === "earth" ? tint(palette.earth, -26) : tint(palette.sand, -20);
      for (let row = startY; row <= Math.ceil(maxY / spacing); row += step) for (let column = startX; column <= Math.ceil(maxX / spacing); column += step) {
        const key = `${column}:${row}`;
        if (phase(key, material === "grass" ? 5 : 7) > (material === "sand" ? .3 : .42)) continue;
        const x = column * spacing + spacing * phase(key, 1), y = row * spacing + spacing * phase(key, 2), scale = spacing * (.2 + phase(key, 3) * .16);
        if (material === "grass") {
          // Three drawn blades, not one filled glyph: at map scale a solid tuft reads as a
          // stamped symbol, while separate strokes stay a texture the eye passes over.
          const stroke = Math.max(.6, scale * .17), lean = (phase(key, 4) - .5) * .5;
          const blades: readonly (readonly [number, number, number])[] = [[-.55, -.85, .75], [.02, .1, 1], [.55, .9, .7]];
          if (blades.every(([foot, head, tall]) => inside([x + scale * foot, y + scale * .8], points) && inside([x + scale * (head + lean), y - scale * tall], points)))
            for (const [foot, head, tall] of blades) emit(id, line([x + scale * foot, y + scale * .8], [x + scale * (head + lean), y - scale * tall], stroke), shade, .34);
          continue;
        }
        const shape: TacticalPoint[] = material === "earth"
          ? [[x - scale, y], [x - scale * .4, y - scale * .7], [x + scale * .6, y - scale * .5], [x + scale, y + scale * .3], [x, y + scale * .8]]
          : [[x - scale * 2, y], [x - scale * .6, y - scale * .35], [x + scale * 1.8, y - scale * .1], [x - scale * .4, y + scale * .3]];
        if (shape.every(point => inside(point, points))) emit(id, shape, shade, material === "sand" ? .22 : .3);
      }
    } else if (role?.role === "terrain" && role.material === "forest") {
      // A jittered canopy packs trees into a continuous wood, sampled from ONE global lattice
      // sized by the construction cell: the generator now hands a wood over as many convex
      // pieces, and a lattice per piece drew each strip as a dark block with dwarf trees.
      // A crown whose centre lies in this piece is drawn whole; where it reaches into the
      // neighbouring piece it meets the same wood, so the seam never shows.
      const spacing = Math.max(6, cartography.construction.cellSize * .34), radius = spacing * .8;
      const startX = Math.floor(minX / spacing), startY = Math.floor(minY / spacing);
      const step = Math.max(1, Math.ceil(Math.sqrt((Math.ceil(maxX / spacing) - startX + 1) * (Math.ceil(maxY / spacing) - startY + 1) / 6000)));
      for (let row = startY; row <= Math.ceil(maxY / spacing); row += step) for (let column = startX; column <= Math.ceil(maxX / spacing); column += step) {
        if (decorationPoints + 120 > 250_000 - basePoints || decorationPolygons + 5 >= 30_000 - basePolygons) break;
        const key = `${column}:${row}`;
        const x = column * spacing + spacing * (.2 + .6 * phase(key, 31) + (row % 2) * .3), y = row * spacing + spacing * (.2 + .6 * phase(key, 32));
        if (!inside([x, y], points)) continue;
        const size = radius * (.86 + phase(key, 33) * .34);
        // High, cold land grows spruce; elsewhere a few conifers stand among the broadleaves.
        const conifer = relief ? reliefHeightAt(relief, cartography.construction, x, y) > seaLevel + RELIEF_LEVELS.flatLand + 36 || phase(key, 35) < .18 : phase(key, 35) < .25;
        if (conifer) {
          const s = size * 1.05;
          const spruce: TacticalPoint[] = [[x, y - s * 1.7], [x + s * .42, y - s * .75], [x + s * .22, y - s * .75], [x + s * .68, y + s * .1], [x + s * .36, y + s * .1], [x + s * .55, y + s * .75], [x - s * .55, y + s * .75], [x - s * .36, y + s * .1], [x - s * .68, y + s * .1], [x - s * .22, y - s * .75], [x - s * .42, y - s * .75]];
          emit(id, spruce.map(point => [point[0] + s * .25, point[1] + s * .3]), 0x263c2b, .34);
          emit(id, spruce.map(point => [x + (point[0] - x) * 1.06, y + (point[1] - y) * 1.06]), ink, .9);
          emit(id, spruce, tint(palette.forest, -14 + phase(key, 36) * 20));
          emit(id, [[x, y - s * 1.7], [x - s * .42, y - s * .75], [x - s * .22, y - s * .75], [x - s * .68, y + s * .1], [x - s * .36, y + s * .1], [x - s * .55, y + s * .75], [x, y + s * .75]], mix(palette.forest, palette.grass, .35), .5);
          continue;
        }
        const crown = Array.from({ length: 24 }, (_, index) => { const angle = index * Math.PI / 12, r = size * (.88 + .09 * Math.cos(angle * 8) + .08 * phase(key, 40 + index)); return [x + Math.cos(angle) * r, y + Math.sin(angle) * r] as TacticalPoint; });
        emit(id, crown.map(point => [point[0] + size * .28, point[1] + size * .32]), 0x263c2b, .34);
        emit(id, crown.map(point => [x + (point[0] - x) * 1.055, y + (point[1] - y) * 1.055]), ink, .9);
        emit(id, crown, mix(palette.forest, palette.grass, .25 + phase(key, 34) * .32));
        emit(id, crown.map(point => [x + (point[0] - x) * .65 - size * .15, y + (point[1] - y) * .65 - size * .15]), palette.grass, .3);
      }
    } else if (role?.role === "water") {
      for (const {a,b,inward:winding} of banks.get(id)??[]) {
        // No ink around the image frame, even where the river enters/leaves the map.
        if (a[0] === b[0] && (a[0] === 0 || a[0] === document.geometry.size[0]) || a[1] === b[1] && (a[1] === 0 || a[1] === document.geometry.size[1])) continue;
        emit(id, line(a,b,pen*3.8,-winding*pen*1.3), palette.sand);
        emit(id, line(a,b,pen*.7,-winding*pen*.2), ink, .7);
        emit(id, line(a,b,pen*1.4,winding*pen*1.25), 0xd1e3d9, .75);
        emit(id, line(a,b,pen*2.5,winding*pen*3.1), 0xa4ccd0, .3);
        // Standing water carries the drawn halo: shore-parallel lines fading outward. A river
        // is left alone; its two banks are close enough that halos would merge into a smear.
        if (role.material !== "river") {
          for (let ring = 1; ring <= 3; ring++) emit(id, line(a,b,pen*.55,-winding*(pen*4+ring*pen*4.6)), palette.water, .34-ring*.07);
          // A shallow shelf keeps open water from reading as one flat blue field.
          emit(id, line(a,b,pen*7,winding*pen*6.4), 0xa4ccd0, .17);
        }
      }
      // Short ripples use one global map lattice. Per-segment full-width stripes exposed
      // the generator's river tessellation as regular seams in the finished image.
      const spacing = Math.max(12, cartography.construction.cellSize * .75);
      const startX = Math.floor(minX / spacing), startY = Math.floor(minY / spacing);
      const step = Math.max(1, Math.ceil(Math.sqrt((Math.ceil(maxX / spacing) - startX + 1) * (Math.ceil(maxY / spacing) - startY + 1) / 700)));
      const swell = role.material === "river" ? 1 : 2;
      for (let row = startY; row <= Math.ceil(maxY / spacing); row += step) for (let column = startX; column <= Math.ceil(maxX / spacing); column += step) {
        const key = `${column}:${row}`;
        if (phase(key, 3) > .35) continue;
        const x = column * spacing + spacing * phase(key, 1), y = row * spacing + spacing * phase(key, 2);
        // Standing water gets the drawn double swell; a river keeps its single short ripple,
        // because two strokes in a narrow channel merge into a smear at map scale.
        for (let stroke = 0; stroke < swell; stroke++) {
          const length = spacing * (.2 + stroke * .1), thickness = Math.max(.7, spacing * .016);
          const at: TacticalPoint = [x - stroke * spacing * .08, y + stroke * spacing * .11];
          const ripple: TacticalPoint[] = [at, [at[0]+length,at[1]], [at[0]+length,at[1]+thickness], [at[0],at[1]+thickness]];
          if (ripple.every(point => inside(point, points))) emit(id, ripple, 0xe1eeea, .26);
        }
      }
    } else if (role?.role === "road" && role.material === "bridge") {
      const axis = width >= height ? 0 : 1, min = axis ? minY : minX, size = axis ? height : width;
      for (let index = 1; index < 9; index++) emit(id, stripe(points, axis, min + size * index / 9, min + size * (index + .18) / 9), palette.roofDark, .25);
    } else if (role?.role === "road") {
      // A road is inked along the outer edge of the whole network, never along the seam between
      // two reaches. A track carries two faint wheel ruts; a paved street a sprinkle of cobbles.
      for (const { a, b, inward: winding } of roadBanks.get(id) ?? []) emit(id, line(a, b, pen * .45, winding * pen * .12), ink, .22);
      if (role.material === "path") {
        const axes = roofAxes(points), middle = (axes.top + axes.bottom) / 2, span = axes.bottom - axes.top;
        for (const offset of [-.24, .24]) emit(id, band(points, axes.across, middle + span * offset - pen * .14, middle + span * offset + pen * .14), tint(palette.path, -48), .28);
      } else {
        const spacing = Math.max(4, pen * 2.8), startX = Math.floor(minX / spacing), startY = Math.floor(minY / spacing);
        const step = Math.max(1, Math.ceil(Math.sqrt((Math.ceil(maxX / spacing) - startX + 1) * (Math.ceil(maxY / spacing) - startY + 1) / 900)));
        for (let row = startY; row <= Math.ceil(maxY / spacing); row += step) for (let column = startX; column <= Math.ceil(maxX / spacing); column += step) {
          const key = `${column}:${row}`;
          if (phase(key, 61) > .45) continue;
          const x = column * spacing + spacing * phase(key, 62), y = row * spacing + spacing * phase(key, 63), s = spacing * .2;
          const stone: TacticalPoint[] = [[x - s, y - s * .7], [x + s, y - s * .7], [x + s, y + s * .7], [x - s, y + s * .7]];
          if (stone.every(point => inside(point, points))) emit(id, stone, tint(palette[role.material], -24), .2);
        }
      }
    }
  }
  if (!groundDressed) { groundDressed = true; dressGround(); }
  if (!reliefDrawn) { reliefDrawn = true; drawRelief(); }
  if (paintWalls) {
    const wallWidth = pen * 3.6, stone = setting === "scifi" ? 0x8ea5aa : 0xaaa08a;
    const junctions = new Map<string, { point: TacticalPoint; directions: TacticalPoint[]; wallId: string }>();
    for (const wall of document.walls) for (let index = 1; index < wall.points.length; index++) {
      const a = wall.points[index - 1]!, b = wall.points[index]!, dx = b[0] - a[0], dy = b[1] - a[1], length = Math.hypot(dx,dy);
      if (!length) continue;
      emit(wall.id, line([a[0]+pen*1.5,a[1]+pen*2],[b[0]+pen*1.5,b[1]+pen*2],wallWidth+pen), 0x26332b, .27);
      emit(wall.id, line(a,b,wallWidth+pen), ink, 1, false);
      emit(wall.id, line(a,b,wallWidth), stone, 1, false);
      emit(wall.id, line(a,b,pen,wallWidth*.28), 0xe0d6b9, .8);
      const crenels = Math.min(128, Math.floor(length / (wallWidth * 1.6)));
      for (let tooth = 0; tooth < crenels && decorationPoints + 4 <= 250_000 - basePoints; tooth++) {
        const from = (tooth + .2) / crenels, to = (tooth + .48) / crenels;
        emit(wall.id, line([a[0]+dx*from,a[1]+dy*from],[a[0]+dx*to,a[1]+dy*to],wallWidth), ink, .55);
      }
      for (const [point, direction] of [[a,[dx/length,dy/length]],[b,[-dx/length,-dy/length]]] as const) {
        const key = `${point[0]},${point[1]}`, junction = junctions.get(key) ?? { point, directions: [], wallId: wall.id };
        junction.directions.push(direction); junctions.set(key,junction);
      }
    }
    // Gate ends and real corners get a cap; collinear construction seams stay invisible.
    for (const junction of junctions.values()) {
      const {point,directions,wallId} = junction;
      if (directions.length === 2 && directions[0]![0]*directions[1]![0]+directions[0]![1]*directions[1]![1] < -.9) continue;
      const radius = wallWidth * .8;
      const cap = Array.from({length:8},(_,i) => [point[0]+Math.cos(i*Math.PI/4)*radius,point[1]+Math.sin(i*Math.PI/4)*radius] as TacticalPoint);
      emit(wallId,cap,ink);
      emit(wallId,cap.map(p=>[point[0]+(p[0]-point[0])*.7,point[1]+(p[1]-point[1])*.7]),stone);
    }
  }
  // Last, the vignette: four stepped bands darken the sheet towards its edges, the way old
  // paper and a printed frame do. Presentation only, on a generated map only.
  if (paperOwner) {
    const depth = Math.min(paperWidth, paperHeight) * .05;
    for (let ring = 0; ring < 4; ring++) {
      const outer = depth * ring / 4, inner = depth * (ring + 1) / 4, alpha = .055 - ring * .012;
      emit(paperOwner, [[outer, outer], [paperWidth - outer, outer], [paperWidth - outer, inner], [outer, inner]], 0x2b2218, alpha);
      emit(paperOwner, [[outer, paperHeight - inner], [paperWidth - outer, paperHeight - inner], [paperWidth - outer, paperHeight - outer], [outer, paperHeight - outer]], 0x2b2218, alpha);
      emit(paperOwner, [[outer, inner], [inner, inner], [inner, paperHeight - inner], [outer, paperHeight - inner]], 0x2b2218, alpha);
      emit(paperOwner, [[paperWidth - inner, inner], [paperWidth - outer, inner], [paperWidth - outer, paperHeight - inner], [paperWidth - inner, paperHeight - inner]], 0x2b2218, alpha);
    }
  }
  return { rendererVersion, width: document.geometry.size[0], height: document.geometry.size[1], background: document.background ? null : palette.background, polygons };
}
