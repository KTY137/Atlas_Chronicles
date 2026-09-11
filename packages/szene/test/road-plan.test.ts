// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { describe,it,expect } from "vitest";
import { parseRoadPlan } from "../src/road-plan.ts";
const valid=()=>({schemaVersion:1,maxSteigung:24,knoten:[{id:"a",name:" Tor ",art:"tor",position:[0,.5]},{id:"b",name:"Platz",art:"platz",position:[.7,.5]}],verbindungen:[{id:"link",von:"a",nach:"b",art:"hauptstrasse",bruecke:true}]});
describe("closed road constraint graph",()=>{
 it("detaches input, normalizes names, and preserves all graph fields",()=>{const p=valid(),r=parseRoadPlan(p);expect(r.knoten[0]!.name).toBe("Tor");p.knoten[0]!.position[0]=1;expect(r.knoten[0]!.position).toEqual([0,.5]);expect(r.verbindungen[0]!.bruecke).toBe(true);});
 for(const [name,change] of [
 ["version",(p:any)=>p.schemaVersion=2], ["unknown root",(p:any)=>p.secret="bad"], ["missing array",(p:any)=>delete p.knoten],
 ["duplicate node",(p:any)=>p.knoten.push(p.knoten[0])], ["duplicate coordinate",(p:any)=>p.knoten[1].position=p.knoten[0].position],
 ["dangling edge",(p:any)=>p.verbindungen[0].nach="absent"], ["self loop",(p:any)=>p.verbindungen[0].nach="a"],
 ["parallel duplicate",(p:any)=>p.verbindungen.push({...p.verbindungen[0],id:"reverse",von:"b",nach:"a"})],
 ["unknown node",(p:any)=>p.knoten[0].wiki="secret"], ["NaN",(p:any)=>p.knoten[0].position[0]=NaN],
 ["outside",(p:any)=>p.knoten[0].position[1]=1.01], ["empty name",(p:any)=>p.knoten[0].name=" "],
 ["control chars",(p:any)=>p.knoten[0].name="a\n"], ["name budget",(p:any)=>p.knoten[0].name="a".repeat(81)],
 ["invalid kind",(p:any)=>p.knoten[0].art="house"], ["edge material",(p:any)=>p.verbindungen[0].art="sea"],
 ["bridge string",(p:any)=>p.verbindungen[0].bruecke="false"], ["slope zero",(p:any)=>p.maxSteigung=0],
 ["slope large",(p:any)=>p.maxSteigung=65], ["slope fraction",(p:any)=>p.maxSteigung=1.2],
 ["node budget",(p:any)=>p.knoten=Array.from({length:25},(_,i)=>({...p.knoten[0],id:`p${i}`,position:[i/26,.5]}))],
 ] as const)it(`rejects ${name}`,()=>{const p=valid();change(p);expect(()=>parseRoadPlan(p)).toThrow();});
 it("accepts an empty graph for clearing the plan",()=>expect(parseRoadPlan({schemaVersion:1,maxSteigung:24,knoten:[],verbindungen:[]})).toEqual({schemaVersion:1,maxSteigung:24,knoten:[],verbindungen:[]}));
});
