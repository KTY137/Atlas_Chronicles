// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import {readFileSync} from "node:fs";
import {describe,it,expect} from "vitest";
import {parseAssetpaket,parseTacticalMapDocument,parseTacticalCartography,type RoadPlan} from "@chronicle/szene";
import {erzeugeSiedlung} from "../src/siedlung.ts";
import {flaeche,schnittKonvex} from "../src/polygon.ts";
const pack=parseAssetpaket(readFileSync("assets/packs/pk.gemalt/paket.json","utf8"));
const traffic:RoadPlan={schemaVersion:1,maxSteigung:24,knoten:[{id:"entry",name:"Westtor",art:"tor",position:[.15,.5]},{id:"market",name:"Neuer Markt",art:"platz",position:[.85,.5]}],verbindungen:[{id:"main",von:"entry",nach:"market",art:"hauptstrasse",bruecke:false}]};
// Die Versionen 9/10 gehören seit 2026-09-23 dem Rasterbaustein (Gegenwart/Sci-Fi); Fantasy ist v11 (unten).
const generate=(verkehr?:RoadPlan,setting:"gegenwart"|"fantasy"="gegenwart")=>erzeugeSiedlung({keim:"roads-regression",optionen:{standort:"ebene",relief:0,setting,...(verkehr?{verkehr}:{})}},pack);
describe("roads integrated into the canonical town generator",()=>{
 it("keeps exact old output for missing and empty plans",()=>{expect(generate({...traffic,knoten:[],verbindungen:[]})).toEqual(generate());});
 it("emits ordinary editable regions and a versioned full constraint vector",()=>{const m=generate(traffic);expect(m.version).toBe("10");expect(m.keim.optionen.verkehr).toEqual(traffic);expect(m.bericht.verkehr!.routes.every(r=>r.status==="gebaut")).toBe(true);expect(m.bericht.verkehr!.unreachableNodes).toEqual([]);expect(()=>parseTacticalMapDocument(m.karte)).not.toThrow();expect(()=>parseTacticalCartography(m.cartography,m.karte)).not.toThrow();expect(m.cartography.regions.some(r=>r.role==="road"&&r.material==="square")).toBe(true);});
 it("reserves all new streets and squares before fitting roofs",()=>{const m=generate(traffic);expect(m.bericht.verkehr!.reservedRegions.length).toBeGreaterThan(1); const reserved=new Set(m.bericht.verkehr!.reservedRegions);for(const b of m.bauwerke)for(const r of m.strassen.filter(s=>reserved.has(s.id)))expect(flaeche(schnittKonvex(b.umriss,r.umriss))).toBeLessThan(1e-8);expect(m.bauwerke.length).toBeGreaterThan(0);});
 it("does not silently change relief or the older zone-only version",()=>{const m=generate(traffic),base=generate();expect(m.cartography.relief).toEqual(base.cartography.relief);const p={schemaVersion:1 as const,zonen:[{id:"clear",name:"Anger",nutzung:"frei" as const,dichte:0,polygon:[[0,0],[1,0],[1,1],[0,1]] as const}]};const z=erzeugeSiedlung({keim:"roads-regression",optionen:{setting:"gegenwart",standort:"ebene",planung:p,verkehr:traffic}},pack);expect(z.bauwerke).toHaveLength(0);expect(z.bericht.verkehr!.routes[0]!.status).toBe("gebaut");expect(z.keim.optionen.planung).toEqual(p);});
 it("keeps ordinary zone-only v9 identities when an empty road plan is supplied",()=>{
   const planung={schemaVersion:1 as const,zonen:[{id:"craft",name:"Handwerk",nutzung:"handwerk" as const,dichte:1,polygon:[[0,0],[1,0],[1,1],[0,1]] as const}]};
   const first=erzeugeSiedlung({keim:"roads-zones",optionen:{planung,setting:"gegenwart"}},pack);
   expect(first.version).toBe("9");
   expect(erzeugeSiedlung({keim:"roads-zones",optionen:{planung,setting:"gegenwart",verkehr:{...traffic,knoten:[],verbindungen:[]}}},pack)).toEqual(first);
 });
 it("creates real bridge surfaces on a requested river route without erasing water",()=>{
   const v={...traffic,maxSteigung:64,knoten:traffic.knoten.map(n=>({...n,art:"tor" as const}))};
   const first=erzeugeSiedlung({keim:"roads-river",optionen:{standort:"fluss",relief:0,verkehr:v}},pack);
   expect(first.bericht.verkehr!.routes[0]!.status).toBe("kein-weg");
   const second=erzeugeSiedlung({keim:"roads-river",optionen:{standort:"fluss",relief:0,verkehr:{...v,verbindungen:[{...v.verbindungen[0]!,bruecke:true}]}}},pack);
   expect(second.bericht.verkehr!.routes[0]!.status).toBe("gebaut");expect(second.bericht.verkehr!.unreachableNodes).toEqual([]);
   const regions=new Map(second.karte.geometry.regions.map(r=>[r.id,r.punkte])),reserved=new Set(second.bericht.verkehr!.reservedRegions);
   const crossings=second.cartography.regions.filter(r=>r.role==="road"&&r.material==="bridge"&&second.karte.geometry.regions.some(s=>reserved.has(s.id)&&flaeche(schnittKonvex(s.punkte,regions.get(r.regionId)!))>1e-8));
   expect(crossings.length).toBeGreaterThan(0);
   const water=(m:typeof first)=>m.cartography.regions.filter(r=>r.role==="water").map(r=>m.karte.geometry.regions.find(s=>s.id===r.regionId)!.punkte);
   expect(water(second)).toEqual(water(first));
 });
 it("different road classes change the road shape and provenance reproducibly",()=>{const m=generate(traffic),n=generate({...traffic,verbindungen:[{...traffic.verbindungen[0]!,art:"gasse"}]});expect(m.keim.keimHash).not.toBe(n.keim.keimHash);expect(m.karte.geometry).not.toEqual(n.karte.geometry);expect(generate(traffic)).toEqual(m);});
 it("fantasy (v11) builds and reserves a planned road as well",()=>{
   const m=generate(traffic,"fantasy");
   expect(m.version).toBe("11");expect(m.keim.optionen.verkehr).toEqual(traffic);
   expect(m.bericht.verkehr!.routes.every(r=>r.status==="gebaut")).toBe(true);
   const reserved=new Set(m.bericht.verkehr!.reservedRegions);
   for(const b of m.bauwerke)for(const r of m.strassen.filter(s=>reserved.has(s.id)))expect(flaeche(schnittKonvex(b.umriss,r.umriss))).toBeLessThan(1e-8);
   expect(generate({...traffic,knoten:[],verbindungen:[]},"fantasy")).toEqual(generate(undefined,"fantasy"));
 });
});
