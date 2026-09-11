// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { describe, it, expect } from "vitest";
import { parseRoadPlan, type RoadPlan } from "@chronicle/szene";
import { routeRoadPlan, type RoadRoutingTerrain } from "../src/road-routing.ts";
import { inspectRoadNetwork } from "../src/road-network.ts";
import { flaeche, schnittKonvex as schnitt, type Polygon } from "../src/polygon.ts";
const rect=(x:number,y:number,w:number,h:number):Polygon=>[[x,y],[x+w,y],[x+w,y+h],[x,y+h]];
const plan=(bruecke=false):RoadPlan=>parseRoadPlan({schemaVersion:1,maxSteigung:24,knoten:[{id:"west",name:"Westtor",art:"tor",position:[.1,.5]},{id:"east",name:"Markt",art:"platz",position:[.9,.5]}],verbindungen:[{id:"main",von:"west",nach:"east",art:"hauptstrasse",bruecke}]});
const flat:RoadRoutingTerrain={width:20,height:20,obstacles:[],rivers:[],elevation:()=>100};
describe("full-width, terrain-aware road routing",()=>{
 it("routes a real connected corridor with exact endpoints and a reserved square",()=>{const r=routeRoadPlan(plan(),flat);expect(r.routes[0]!.status).toBe("gebaut");expect(r.routes[0]!.points).toEqual([[.1,.5],[.9,.5]]);expect(r.routes[0]!.length).toBe(16);expect(r.surfaces.some(s=>s.square)).toBe(true);expect(r.invalidNodes).toEqual([]);});
 it("detours around rock without any footprint overlap",()=>{const obstacle=rect(8,7,4,6),r=routeRoadPlan(plan(),{...flat,obstacles:[obstacle]});expect(r.routes[0]!.status).toBe("gebaut");expect(r.routes[0]!.length).toBeGreaterThan(16);for(const s of r.surfaces)expect(flaeche(schnitt(s.polygon,obstacle))).toBeLessThan(1e-8);});
 it("cannot cross a lake, even with bridges enabled",()=>{const r=routeRoadPlan(plan(true),{...flat,obstacles:[rect(8,0,4,20)]});expect(r.routes[0]!.status).toBe("kein-weg");expect(r.surfaces).toHaveLength(0);});
 it("crosses a river only when explicitly enabled",()=>{const t={...flat,rivers:[rect(8,0,4,20)]};expect(routeRoadPlan(plan(),t).routes[0]!.status).toBe("kein-weg");const r=routeRoadPlan(plan(true),t);expect(r.routes[0]!.status).toBe("gebaut");expect(r.routes[0]!.riverCrossings).toBe(1);});
 it("refuses endpoints and plazas in water instead of silently moving them",()=>{const r=routeRoadPlan(plan(true),{...flat,rivers:[rect(17,8,3,4)]});expect(r.invalidNodes).toContain("east");expect(r.routes[0]!.status).toBe("endpunkt");expect(r.surfaces).toEqual([]);});
 it("does not squeeze a wide road through a narrow dry slit",()=>{const obstacles=[rect(8,0,4,9.6),rect(8,10.4,4,9.6)],t={...flat,obstacles};expect(routeRoadPlan(plan(),t).routes[0]!.status).toBe("kein-weg");const p=plan();expect(routeRoadPlan({...p,verbindungen:[{...p.verbindungen[0]!,art:"gasse"}]},t).routes[0]!.status).toBe("gebaut");});
 it("obeys the slope ceiling and accepts a gentler alternative",()=>{const r=routeRoadPlan({...plan(),maxSteigung:1},{...flat,elevation:x=>x<8?100:180});expect(r.routes[0]!.status).toBe("kein-weg");const detour=routeRoadPlan({...plan(),maxSteigung:24},{...flat,elevation:(x,y)=>x>7&&x<13&&y>7&&y<13?220:100});expect(detour.routes[0]!.status).toBe("gebaut");expect(detour.routes[0]!.length).toBeGreaterThan(16);});
 it("clips boundary gate corridors to the map",()=>{const p=plan();const r=routeRoadPlan({...p,knoten:[{...p.knoten[0]!,position:[0,.5]},p.knoten[1]!] },flat);expect(r.routes[0]!.status).toBe("gebaut");expect(r.surfaces.every(s=>s.polygon.every(p=>p.every(n=>n>=0&&n<=20)))).toBe(true);});
 it("is deterministic including turn choices, reports and geometry",()=>{const t={...flat,obstacles:[rect(8,7,4,6)]};expect(routeRoadPlan(plan(),t)).toEqual(routeRoadPlan(plan(),t));});
 it("checks subcell endpoint connectors and does not draw a line through rock",()=>{const p=plan();const r=routeRoadPlan({...p,knoten:[{...p.knoten[0]!,position:[.37,.5]},p.knoten[1]!]},{...flat,obstacles:[rect(7,9,1,2)]});expect(r.routes[0]!.status).toBe("endpunkt");});
});
describe("routing resource and precision boundaries", () => {
 it("counts a thin river crossed between grid sample points", () => {
   const r=routeRoadPlan(plan(true),{...flat,rivers:[rect(8.35,0,.1,20)]});
   expect(r.routes[0]!.status).toBe("gebaut");expect(r.routes[0]!.riverCrossings).toBe(1);
 });
 it("counts separate river contacts even along a single smoothed segment", () => {
   const r=routeRoadPlan(plan(true),{...flat,rivers:[rect(8.2,0,.1,20),rect(8.7,0,.1,20)]});
   expect(r.routes[0]!.riverCrossings).toBe(2);
 });
 it("smooths a diagonal without retaining grid staircases", () => {
   const p=plan();
   const r=routeRoadPlan({...p,knoten:[p.knoten[0]!,{...p.knoten[1]!,position:[.9,.8]}]},flat);
   expect(r.routes[0]!.points).toEqual([[.1,.5],[.9,.8]]);
   expect(r.routes[0]!.length).toBeCloseTo(Math.hypot(16,6),3);
 });
 it("refuses non-finite terrain and out-of-budget grids", () => {
   expect(routeRoadPlan(plan(),{...flat,elevation:()=>NaN}).routes[0]!.status).toBe("endpunkt");
   expect(()=>routeRoadPlan(plan(),{...flat,width:193})).toThrow();
   expect(()=>routeRoadPlan(plan(),{...flat,width:192,height:192})).toThrow();
 });
 it("shares a hard search budget across a maximum-size disconnected graph", () => {
   const knoten=Array.from({length:24},(_,i)=>({id:`n${i}`,name:`Node ${i}`,art:"tor" as const,position:[i<12?.1:.9,(i%12+1)/13] as const}));
   const verbindungen=Array.from({length:32},(_,i)=>({id:`e${i}`,von:`n${Math.floor(i/3)}`,nach:`n${12+i%3}`,art:"hauptstrasse" as const,bruecke:true}));
   const r=routeRoadPlan({...plan(),knoten,verbindungen},{width:100,height:192,elevation:()=>0,rivers:[],obstacles:[rect(49,0,2,192)]});
   expect(r.routes).toHaveLength(32);expect(r.routes.some(e=>e.status==="budget")).toBe(true);
   expect(r.routes.every(e=>e.status==="kein-weg"||e.status==="budget")).toBe(true);
   expect(r.surfaces).toEqual([]);
 });
});
describe("geometry-derived road connectivity",()=>{
 it("recognizes a crossing even when no corner lies in the other road",()=>{const roads=[{id:"a",umriss:rect(0,9,20,2)},{id:"b",umriss:rect(9,0,2,20)}];expect(inspectRoadNetwork(roads,[],20,20,{...plan(),knoten:[]},[]).components).toBe(1);});
 it("joins touching surfaces but not a small gap; reports unserved buildings",()=>{const roads=[{id:"a",umriss:rect(0,9,4,2)},{id:"b",umriss:rect(4,9,4,2)},{id:"c",umriss:rect(9,9,2,2)}];const r=inspectRoadNetwork(roads,[{id:"home",strasse:"b"},{id:"lost",strasse:"c"},{id:"missing",strasse:"unknown"}],20,20,{...plan(),knoten:[]},[]);expect(r.components).toBe(2);expect(r.unreachableBuildings).toEqual(["lost","missing"]);});
 it("distinguishes planned graph bottlenecks from the automatic network",()=>{const p=plan(),r=routeRoadPlan(p,flat);const report=inspectRoadNetwork(r.surfaces.map(s=>({id:s.key,umriss:s.polygon})),[],20,20,p,r.routes);expect(report.components).toBe(1);expect(report.unreachableNodes).toEqual([]);expect(report.singleLinks).toEqual(["main"]);});
 it("does not grant connectivity to an unbuilt isolated target",()=>{const p=plan();const r=inspectRoadNetwork([],[],20,20,p,[]);expect(r.unreachableNodes).toEqual(["west","east"]);});
});
