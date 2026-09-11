// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { ROAD_PLAN_LIMITS, parseRoadPlan, type RoadPlan, type PlanPoint } from "@chronicle/szene";
import { flaeche, schnittKonvex, huelle, type Polygon, type Punkt } from "./polygon.ts";

export interface RoadRoutingTerrain {
  readonly width: number;
  readonly height: number;
  readonly obstacles: readonly Polygon[];
  readonly rivers: readonly Polygon[];
  readonly elevation: (x: number, y: number) => number;
}
export interface PlannedRoadSurface {
  readonly key: string;
  readonly polygon: Polygon;
  readonly art: "hauptstrasse" | "gasse";
  readonly square?: boolean;
}
export interface RoadRouteReport {
  readonly id: string;
  readonly von: string;
  readonly nach: string;
  readonly status: "gebaut" | "endpunkt" | "kein-weg" | "budget";
  readonly points: readonly PlanPoint[];
  readonly length: number;
  readonly riverCrossings: number;
}
export interface RoutedRoadPlan {
  readonly surfaces: readonly PlannedRoadSurface[];
  readonly routes: readonly RoadRouteReport[];
  readonly invalidNodes: readonly string[];
}
const q = (n: number) => Math.round(n * 1000) / 1000;
const boundsOverlap = (a: readonly number[], b: readonly number[]) => a[0]! <= b[2]! && a[2]! >= b[0]! && a[1]! <= b[3]! && a[3]! >= b[1]!;
const square = ([x, y]: Punkt, half: number): Polygon => [[x-half,y-half],[x+half,y-half],[x+half,y+half],[x-half,y+half]];
function band(a: Punkt, b: Punkt, width: number): Polygon {
  const d = Math.hypot(b[0]-a[0],b[1]-a[1]);
  const nx = -(b[1]-a[1]) / d * width/2, ny = (b[0]-a[0]) / d * width/2;
  return [[a[0]+nx,a[1]+ny],[a[0]-nx,a[1]-ny],[b[0]-nx,b[1]-ny],[b[0]+nx,b[1]+ny]];
}
/** Bounded A* queue, stable tie-breaking. No path enumeration or recursive DFS. */
class Queue {
  private heap: { id: number; score: number }[] = [];
  private less(a: { id: number; score: number }, b: { id: number; score: number }) {
    return a.score < b.score || a.score === b.score && a.id < b.id;
  }
  push(id: number, score: number) {
    const h = this.heap;
    h.push({id,score});
    let i = h.length-1;
    while (i) {
      const p = (i-1)>>1;
      if (!this.less(h[i]!,h[p]!)) break;
      [h[i],h[p]] = [h[p]!,h[i]!]; i = p;
    }
  }
  pop(): number | undefined {
    const h = this.heap, first = h[0], last = h.pop();
    if (!first) return undefined;
    if (h.length && last) {
      h[0] = last;
      let i = 0;
      while (true) {
        let j = i*2+1;
        if (j >= h.length) break;
        if (j+1 < h.length && this.less(h[j+1]!,h[j]!)) j++;
        if (!this.less(h[j]!,h[i]!)) break;
        [h[i],h[j]] = [h[j]!,h[i]!]; i = j;
      }
    }
    return first.id;
  }
}
function compress(path: readonly Punkt[]): Punkt[] {
  const points: Punkt[] = [];
  for (const p of path) {
    const last = points.at(-1), prev = points.at(-2);
    if (last && Math.hypot(p[0]-last[0],p[1]-last[1]) < 1e-8) continue;
    if (prev && last && Math.abs((last[0]-prev[0])*(p[1]-last[1])-(last[1]-prev[1])*(p[0]-last[0])) < 1e-8
      && (last[0]-prev[0])*(p[0]-last[0])+(last[1]-prev[1])*(p[1]-last[1]) >= 0) points.pop();
    points.push(p);
  }
  return points;
}

/** Complete route or no route. Every accepted segment is checked at its FULL width. Lakes,
 * sea and rock are hard obstacles; only explicitly allowed river crossings create bridges.
 * Coordinates and widths are construction cells, not physical slope units. The CPU and
 * geometry budgets apply to the entire graph, not separately to each user-supplied link. */
export function routeRoadPlan(plan: RoadPlan, terrain: RoadRoutingTerrain): RoutedRoadPlan {
  plan = parseRoadPlan(plan);
  if (![terrain.width,terrain.height].every(n => Number.isSafeInteger(n) && n >= 12 && n <= 192) || terrain.width*terrain.height > 20000)
    throw new Error("Straßenraster überschreitet das Kartenbudget.");
  const {width:w,height:h} = terrain, frame: Polygon = [[0,0],[w,0],[w,h],[0,h]];
  const obstacles = terrain.obstacles.map(p => ({p,box:huelle(p)})), rivers = terrain.rivers.map(p => ({p,box:huelle(p)}));
  const intersects = (poly: Polygon, items: typeof obstacles) => {
    const box = huelle(poly);
    return items.some(o => boundsOverlap(box,o.box) && Math.abs(flaeche(schnittKonvex(poly,o.p))) > 1e-8);
  };
  const clipped = (poly: Polygon) => schnittKonvex(poly,frame).map(p => [q(p[0]),q(p[1])] as const);
  const nodes = new Map(plan.knoten.map(n => [n.id,[n.position[0]*w,n.position[1]*h] as Punkt]));
  const invalidNodes = plan.knoten.filter(n => {
    const p = nodes.get(n.id)!;
    return !Number.isFinite(terrain.elevation(p[0],p[1])) || intersects(clipped(square(p,n.art === "platz" ? 1.2 : .6)),[...obstacles,...rivers]);
  }).map(n => n.id);
  const surfaces: PlannedRoadSurface[] = [], routes: RoadRouteReport[] = [];
  const cols = w+1, count = cols*(h+1), toPoint = (id: number): Punkt => [id%cols,Math.floor(id/cols)];
  const grid = (p: Punkt) => Math.round(p[1])*cols+Math.round(p[0]);
  const caches = new Map<string,{ nodes: Int8Array; steps: Map<number,boolean> }>();
  // Reserve room for every plaza up front, including those on a later successful link.
  const surfaceLimit = ROAD_PLAN_LIMITS.segments - plan.knoten.filter(n => n.art === "platz").length;
  let segments = 0, remaining: number = ROAD_PLAN_LIMITS.searchNodes, smoothing: number = ROAD_PLAN_LIMITS.smoothingChecks;
  for (const edge of plan.verbindungen) {
    const start = nodes.get(edge.von)!, end = nodes.get(edge.nach)!, width = edge.art === "hauptstrasse" ? 1.2 : .65;
    const fail = (status: RoadRouteReport["status"]) => routes.push({id:edge.id,von:edge.von,nach:edge.nach,status,points:[],length:0,riverCrossings:0});
    if (invalidNodes.includes(edge.von) || invalidNodes.includes(edge.nach)) { fail("endpunkt"); continue; }
    if (remaining <= 0) { fail("budget"); continue; }
    const banned = edge.bruecke ? obstacles : [...obstacles,...rivers];
    const free = (poly: Polygon) => !intersects(clipped(poly),banned);
    const passSegment = (a: Punkt,b: Punkt) => {
      const length = Math.hypot(b[0]-a[0],b[1]-a[1]);
      let old = terrain.elevation(a[0],a[1]);
      if (!Number.isFinite(old)) return false;
      if (length < 1e-8) return true;
      if (!free(band(a,b,width))) return false;
      // Quarter-cell samples see sharp rises between endpoints, not only their net change.
      const samples = Math.max(1,Math.ceil(length*4));
      for (let i = 1; i <= samples; i++) {
        const x = a[0]+(b[0]-a[0])*i/samples, y = a[1]+(b[1]-a[1])*i/samples, level = terrain.elevation(x,y);
        if (!Number.isFinite(level) || Math.abs(level-old) > plan.maxSteigung*length/samples+1e-8) return false;
        old = level;
      }
      return true;
    };
    const from = grid(start), to = grid(end), target = toPoint(to);
    if (!passSegment(start,toPoint(from)) || !passSegment(target,end)) { fail("endpunkt"); continue; }
    const key = `${edge.art}:${edge.bruecke}`;
    const cache = caches.get(key) ?? { nodes: new Int8Array(count), steps: new Map<number,boolean>() };
    caches.set(key,cache);
    const nodeFree = (id: number) => {
      if (!cache.nodes[id]) cache.nodes[id] = free(square(toPoint(id),width/2)) ? 1 : -1;
      return cache.nodes[id] === 1;
    };
    if (!nodeFree(from) || !nodeFree(to)) { fail("endpunkt"); continue; }
    const closed = new Uint8Array(count), distance = new Float64Array(count).fill(Infinity), parent = new Int32Array(count).fill(-1);
    const queue = new Queue();
    distance[from] = 0; queue.push(from,0);
    let reached = false;
    for (let visited = 0; visited < count && remaining > 0;) {
      const here = queue.pop();
      if (here === undefined) break;
      if (closed[here]) continue;
      closed[here] = 1; visited++; remaining--;
      if (here === to) { reached = true; break; }
      const a = toPoint(here);
      for (const [dx,dy] of [[1,0],[0,1],[-1,0],[0,-1]] as const) {
        const x = a[0]+dx, y = a[1]+dy;
        if (x < 0 || x > w || y < 0 || y > h) continue;
        const next = y*cols+x;
        if (closed[next] || !nodeFree(next)) continue;
        const b: Punkt = [x,y], stepKey = Math.min(here,next)*count+Math.max(here,next);
        if (!cache.steps.has(stepKey)) cache.steps.set(stepKey,passSegment(a,b));
        if (!cache.steps.get(stepKey)) continue;
        const river = intersects(square(b,width/2),rivers);
        const cost = 1+Math.abs(terrain.elevation(x,y)-terrain.elevation(a[0],a[1]))*.2+(river ? 5 : 0), total = distance[here]!+cost;
        if (total >= distance[next]!) continue;
        distance[next] = total; parent[next] = here;
        queue.push(next,total+Math.abs(x-target[0])+Math.abs(y-target[1]));
      }
    }
    if (!reached) { fail(remaining <= 0 ? "budget" : "kein-weg"); continue; }
    const path: Punkt[] = [];
    for (let at = to; at !== -1; at = parent[at]!) path.push(toPoint(at));
    path.reverse(); path.unshift(start); path.push(end);
    const corners = compress(path), points: Punkt[] = [];
    // Remove the grid's staircase only when the complete straight band still passes the
    // same obstacle and slope checks. Never smooth blindly through a corner or shoreline.
    for (let i = 0; i < corners.length;) {
      points.push(corners[i]!);
      if (i === corners.length-1) break;
      let next = i+1;
      for (let candidate = corners.length-1; candidate > i+1 && smoothing > 0; candidate--) {
        smoothing--;
        if (passSegment(corners[i]!,corners[candidate]!)) { next = candidate; break; }
      }
      i = next;
    }
    if (points.length < 2) { fail("endpunkt"); continue; }
    if (segments+points.length*2-1 > surfaceLimit) { fail("budget"); continue; }
    const added: PlannedRoadSurface[] = [];
    points.forEach((p,i) => {
      added.push({key:`${edge.id}.join.${i}`,polygon:clipped(square(p,width/2)),art:edge.art});
      if (i) added.push({key:`${edge.id}.line.${i}`,polygon:clipped(band(points[i-1]!,p,width)),art:edge.art});
    });
    // Quantization must not introduce a sliver across a forbidden boundary.
    if (added.some(s => s.polygon.length < 3 || !free(s.polygon))) { fail("kein-weg"); continue; }
    segments += added.length; surfaces.push(...added);
    // Count disjoint river contacts along the actual, smoothed route. Testing only grid
    // centres would miss a narrow tributary between samples or merge two separate rivers.
    const contacts: [number,number][] = [];
    let length = 0;
    for (let i = 1; i < points.length; i++) {
      const a = points[i-1]!, b = points[i]!, dx = b[0]-a[0], dy = b[1]-a[1], distance = Math.hypot(dx,dy), polygon = band(a,b,width);
      for (const river of rivers) {
        if (!boundsOverlap(huelle(polygon),river.box)) continue;
        const overlap = schnittKonvex(polygon,river.p);
        if (Math.abs(flaeche(overlap)) <= 1e-8) continue;
        const projected = overlap.map(p => Math.max(0,Math.min(distance,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/distance)));
        contacts.push([length+Math.min(...projected),length+Math.max(...projected)]);
      }
      length += distance;
    }
    contacts.sort((a,b) => a[0]-b[0]);
    let endOfCrossing = -Infinity, crossings = 0;
    for (const contact of contacts) {
      if (contact[0] > endOfCrossing+1e-8) crossings++;
      endOfCrossing = Math.max(endOfCrossing,contact[1]);
    }
    routes.push({id:edge.id,von:edge.von,nach:edge.nach,status:"gebaut",points:points.map(p => [q(p[0]/w),q(p[1]/h)]),
      length:q(length),riverCrossings:crossings});
  }
  for (const n of plan.knoten) {
    if (n.art !== "platz" || invalidNodes.includes(n.id) || !routes.some(e => e.status === "gebaut" && (e.von === n.id || e.nach === n.id))) continue;
    surfaces.push({key:`platz.${n.id}`,polygon:clipped(square(nodes.get(n.id)!,1.2)),art:"hauptstrasse",square:true});
  }
  return {surfaces,routes,invalidNodes};
}
