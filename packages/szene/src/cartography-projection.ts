// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import type { KartenSetting } from "./model.ts";
import type { TacticalCartographyV1 } from "./cartography.ts";
import type { TacticalMapDocumentV1, TacticalPoint } from "./tactical-map.ts";

/** Bump whenever these pixels change; this pin belongs in every cartography raster key. */
export const rendererVersion = "cartography-5" as const;
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
  fantasy: { background: 0xe0d8bc, generic: 0xcac3ae, grass: 0xc5c48d, earth: 0xbba079, forest: 0x536b48, field: 0xb6a379, rock: 0xa8a69a, sand: 0xdfcd9e, water: 0x659eaf, path: 0xe4d5af, street: 0xe0d6bd, square: 0xd8c9aa, bridge: 0xb49470, lot: 0xcac392, room: 0xd2c5ab, roof: 0xbd7354, roofLight: 0xdd9870, roofDark: 0x683e32 },
  gegenwart: { background: 0xd8d8cb, generic: 0xb6b7af, grass: 0xaabb97, earth: 0xbaab92, forest: 0x6d8c72, field: 0xbaba8b, rock: 0xa5aaa8, sand: 0xdacaac, water: 0x83afb9, path: 0xd1c6af, street: 0x909894, square: 0xbfc1b9, bridge: 0xa9aba4, lot: 0xc6cbbd, room: 0xced0c7, roof: 0xa2aaa8, roofLight: 0xc4cbc8, roofDark: 0x717f7d },
  scifi: { background: 0x536368, generic: 0x67767a, grass: 0x8caa90, earth: 0x9b8f7d, forest: 0x537c76, field: 0x9cac7b, rock: 0x839097, sand: 0xbeb695, water: 0x5a9fae, path: 0x96aaa8, street: 0x465b63, square: 0x7f9299, bridge: 0xa3b8ba, lot: 0x7d9190, room: 0x9bafb2, roof: 0x91aeb4, roofLight: 0xbcd2d4, roofDark: 0x5b7b88 },
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
 * subdivides its shared edge; duplicate polygons on the same side still have one shore. */
function waterBanks(regions: readonly { id: string; punkte: readonly TacticalPoint[] }[]): Map<string, Bank[]> {
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
export function cartographyDraw(document: TacticalMapDocumentV1, cartography: TacticalCartographyV1, setting: KartenSetting = "fantasy"): CartographyDrawing {
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
  const banks=waterBanks(regions.filter(region=>region.role?.role==="water"));
  const ink = setting === "scifi" ? 0x304d57 : 0x504537;
  const pen = Math.max(.8, Math.min(4, cartography.construction.cellSize * .035));
  const bridge = (role: typeof regions[number]["role"]) => role?.role === "road" && role.material === "bridge" ? 1 : 0;
  regions.sort((a, b) => order[a.role?.role ?? "generic"] - order[b.role?.role ?? "generic"] || bridge(a.role) - bridge(b.role) || a.index - b.index);
  let roofsStarted = false;
  for (const region of regions) {
    const { id, punkte: points, role } = region;
    let fill: number = palette.generic;
    if (role?.role === "terrain") fill = palette[role.material];
    else if (role?.role === "water") fill = palette.water;
    else if (role?.role === "road") fill = palette[role.material];
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
    emit(id, points, fill, document.background && (!role || role.role === "generic" || role.role === "room") ? .08 : 1, false);
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
    } else if (role?.role === "lot") {
      const axes = roofAxes(points), edge = Math.max(.7, cartography.construction.cellSize * .008);
      for (let index = 0; index < points.length; index++) {
        const a = points[index]!, b = points[(index + 1) % points.length]!, length = Math.hypot(b[0] - a[0], b[1] - a[1]);
        if (!length) continue;
        const nx = -(b[1] - a[1]) / length * edge, ny = (b[0] - a[0]) / length * edge;
        emit(id, [[a[0]-nx,a[1]-ny],[b[0]-nx,b[1]-ny],[b[0]+nx,b[1]+ny],[a[0]+nx,a[1]+ny]], palette.roofDark, .13);
      }
      emit(id, band(points, axes.across, axes.top, axes.top + edge), palette.background, .4);
    } else if (role?.role === "terrain" && role.material === "field") {
      const axes = roofAxes(points), count = Math.min(44, Math.max(6, Math.ceil((axes.bottom - axes.top) / (cartography.construction.cellSize * .18))));
      for (let index = 1; index < count; index++) {
        const at = axes.top + (axes.bottom - axes.top) * index / count;
        emit(id, band(points, axes.across, at, at + pen * .7), palette.roofDark, .3);
        emit(id, band(points, axes.across, at + pen, at + pen * 1.6), palette.sand, .3);
      }
    } else if (role?.role === "terrain" && role.material === "forest") {
      const radius = Math.max(.8, Math.min(Math.max(cartography.construction.cellSize * .2, Math.sqrt(width * height / 150) * .6), Math.min(width, height) / 7));
      // A jittered canopy packs trees into a continuous wood. Independent random centres
      // left large bare polygon patches, which read as scattered stones at town scale.
      const spacing = Math.max(radius * 1.42, Math.sqrt(width * height / 240));
      const columns = Math.ceil(width / spacing), rows = Math.ceil(height / spacing);
      for (let tree = 0; tree < Math.min(320, columns * rows) && decorationPoints + 120 <= 250_000 - basePoints && decorationPolygons + 5 < 30_000 - basePolygons; tree++) {
        const row = Math.floor(tree / columns), column = tree % columns;
        const x = minX + (column + .4 + (row % 2) * .3 + (phase(id, tree * 4 + 1) - .5) * .4) * spacing;
        const y = minY + (row + .45 + (phase(id, tree * 4 + 2) - .5) * .4) * spacing;
        const size = radius * (.92 + phase(id, tree * 4 + 3) * .28);
        const crown = Array.from({ length: 24 }, (_, index) => { const angle = index * Math.PI / 12, r = size * (.88 + .09 * Math.cos(angle * 8) + .08 * phase(id, tree * 41 + index)); return [x + Math.cos(angle) * r, y + Math.sin(angle) * r] as TacticalPoint; });
        if (inside([x,y], points)) {
          emit(id, crown.map(point => [point[0] + size * .28, point[1] + size * .32]), 0x263c2b, .34);
          emit(id, crown.map(point => [x + (point[0] - x) * 1.055, y + (point[1] - y) * 1.055]), ink, .9);
          emit(id, crown, mix(palette.forest, palette.grass, .25 + phase(id, tree * 4) * .32));
          emit(id, crown.map(point => [x + (point[0] - x) * .65 - size * .15, y + (point[1] - y) * .65 - size * .15]), palette.grass, .3);
        }
      }
    } else if (role?.role === "water") {
      for (const {a,b,inward:winding} of banks.get(id)??[]) {
        // No ink around the image frame, even where the river enters/leaves the map.
        if (a[0] === b[0] && (a[0] === 0 || a[0] === document.geometry.size[0]) || a[1] === b[1] && (a[1] === 0 || a[1] === document.geometry.size[1])) continue;
        emit(id, line(a,b,pen*3.8,-winding*pen*1.3), palette.sand);
        emit(id, line(a,b,pen*.7,-winding*pen*.2), ink, .7);
        emit(id, line(a,b,pen*1.4,winding*pen*1.25), 0xd1e3d9, .75);
        emit(id, line(a,b,pen*2.5,winding*pen*3.1), 0xa4ccd0, .3);
      }
      // Short ripples use one global map lattice. Per-segment full-width stripes exposed
      // the generator's river tessellation as regular seams in the finished image.
      const spacing = Math.max(12, cartography.construction.cellSize * .75);
      const startX = Math.floor(minX / spacing), startY = Math.floor(minY / spacing);
      const step = Math.max(1, Math.ceil(Math.sqrt((Math.ceil(maxX / spacing) - startX + 1) * (Math.ceil(maxY / spacing) - startY + 1) / 128)));
      for (let row = startY; row <= Math.ceil(maxY / spacing); row += step) for (let column = startX; column <= Math.ceil(maxX / spacing); column += step) {
        if (phase(`${column}:${row}`, 3) > .35) continue;
        const x = column * spacing + spacing * phase(`${column}:${row}`, 1), y = row * spacing + spacing * phase(`${column}:${row}`, 2);
        const ripple: TacticalPoint[] = [[x,y],[x+spacing*.2,y],[x+spacing*.2,y+spacing*.014],[x,y+spacing*.014]];
        if (ripple.every(point => inside(point, points))) emit(id, ripple, 0xe1eeea, .24);
      }
    } else if (role?.role === "road" && role.material === "bridge") {
      const axis = width >= height ? 0 : 1, min = axis ? minY : minX, size = axis ? height : width;
      for (let index = 1; index < 9; index++) emit(id, stripe(points, axis, min + size * index / 9, min + size * (index + .18) / 9), palette.roofDark, .25);
    }
  }
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
  return { rendererVersion, width: document.geometry.size[0], height: document.geometry.size[1], background: document.background ? null : palette.background, polygons };
}
