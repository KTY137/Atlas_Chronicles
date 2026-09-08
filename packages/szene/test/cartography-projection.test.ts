// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { describe, expect, it } from "vitest";
import { cartographyDraw, cartographyPaintsWalls, rendererVersion } from "../src/cartography-projection.ts";
import type { TacticalCartographyV1 } from "../src/cartography.ts";
import type { TacticalMapDocumentV1, TacticalPoint } from "../src/tactical-map.ts";

function fixture(): { document: TacticalMapDocumentV1; cartography: TacticalCartographyV1 } {
  const rectangle = (x: number, y: number, width: number, height: number): TacticalPoint[] => [[x,y],[x+width,y],[x+width,y+height],[x,y+height]];
  return {
    document: { schemaVersion: 1, kind: "tactical-map", coordinates: "image-pixels", frame: { ursprung: [0,0], einheitenProPixel: 1, ordnung: "xy", hoch: "unten" },
      geometry: { v: 3, size: [600,600], stamps: [], places: [], regions: ["bridge","road","water","lot","forest","house"].map((id,index)=>({ id, punkte: rectangle(index*80,100,60,40) })) },
      grid: { kind: "square", size: 64, origin: [0,0] }, elevation: 0, geometryElevation: [], walls: [], portals: [], lights: [], environment: { bakedLighting: false, ambientLightArgb: "ffffffff" }, background: null },
    cartography: { schemaVersion: 1, kind: "tactical-cartography", construction: { cellSize: 64, origin: [0,0] }, regions: [
      { regionId: "bridge", role: "road", material: "bridge", authored: false, locked: false, provenance: null },
      { regionId: "road", role: "road", material: "street", authored: false, locked: false, provenance: null },
      { regionId: "water", role: "water", material: "river", authored: false, locked: false, provenance: null },
      { regionId: "lot", role: "lot", authored: false, locked: false, provenance: null },
      { regionId: "forest", role: "terrain", material: "forest", authored: false, locked: false, provenance: null },
      { regionId: "house", role: "building", authored: false, locked: false, provenance: null },
    ] },
  };
}
describe("shared bounded cartography drawing", () => {
  it("paints water above lots and bridges above ordinary roads regardless of source ordering", () => {
    const { document, cartography } = fixture(), drawing = cartographyDraw(document, cartography);
    const first = (id: string) => drawing.polygons.findIndex(polygon=>polygon.regionId===id);
    expect(first("water")).toBeGreaterThan(first("lot")); expect(first("road")).toBeGreaterThan(first("water")); expect(first("bridge")).toBeGreaterThan(first("road"));
    expect(drawing.rendererVersion).toBe(rendererVersion);
  });
  it("aligns roof ridge geometry with a rotated footprint instead of the world's axes", () => {
    const { document, cartography } = fixture(), along: TacticalPoint = [Math.SQRT1_2,Math.SQRT1_2], across: TacticalPoint = [-Math.SQRT1_2,Math.SQRT1_2];
    const points = [[-50,-20],[50,-20],[50,20],[-50,20]].map(([u,v])=>[300+along[0]*u!+across[0]*v!,300+along[1]*u!+across[1]*v!] as TacticalPoint);
    const next = { ...document, geometry: { ...document.geometry, regions: [{ id: "house", punkte: points }] } };
    const drawing = cartographyDraw(next,{ ...cartography, regions: cartography.regions.filter(region=>region.regionId==="house") });
    const ridge = drawing.polygons.find(polygon=>polygon.opacity===.7)!;
    const alongValues = ridge.points.map(p=>p[0]*along[0]+p[1]*along[1]), acrossValues = ridge.points.map(p=>p[0]*across[0]+p[1]*across[1]);
    expect(Math.max(...alongValues)-Math.min(...alongValues)).toBeCloseTo(100); expect(Math.max(...acrossValues)-Math.min(...acrossValues)).toBeLessThan(5);
  });
  it("is deterministic, detached and exposes only drawing primitives without private role metadata", () => {
    const { document, cartography } = fixture(), before = JSON.stringify({document,cartography});
    const first = cartographyDraw(document,cartography), second = cartographyDraw(document,cartography);
    expect(first).toEqual(second); expect(JSON.stringify({document,cartography})).toBe(before);
    expect(first.polygons.every(polygon=>Object.keys(polygon).sort().join(",")==="fill,opacity,points,regionId")).toBe(true);
    expect(first.polygons.every(polygon=>polygon.points.every(point=>point.every(Number.isFinite)))).toBe(true);
    expect(first.polygons[0]!.points).not.toBe(document.geometry.regions[0]!.punkte);
    expect(cartographyDraw(document,cartography,"scifi")).not.toEqual(first);
  });
  it("paints outdoor walls in the shared drawing while leaving room-plan wall overlays intact", () => {
    const {document,cartography} = fixture();
    const withWall: TacticalMapDocumentV1 = { ...document, walls: [{ id:"perimeter",kind:"wall",points:[[20,20],[500,20]],elevation:0 }] };
    expect(cartographyPaintsWalls(cartography,withWall)).toBe(true);
    expect(cartographyDraw(withWall,cartography).polygons.some(p=>p.regionId==="perimeter")).toBe(true);
    const interior: TacticalCartographyV1 = { ...cartography,regions:cartography.regions.map(r=>r.role==="building"?{regionId:r.regionId,role:"room",authored:false,locked:false,provenance:null}:r) };
    expect(cartographyPaintsWalls(interior,withWall)).toBe(false);
    expect(cartographyDraw(withWall,interior).polygons.some(p=>p.regionId==="perimeter")).toBe(false);
    expect(withWall.walls).toHaveLength(1);
  });
  it("keeps every base region when dense canopy decoration reaches its drawing budget", () => {
    const {document,cartography} = fixture();
    const regions = Array.from({length:2048},(_,i)=>({id:`forest-${i}`,punkte:[[0,0],[600,0],[600,600],[0,600]] as TacticalPoint[]}));
    const semantic: TacticalCartographyV1 = {...cartography,regions:regions.map(region=>({regionId:region.id,role:"terrain",material:"forest",authored:false,locked:false,provenance:null}))};
    const drawing = cartographyDraw({...document,geometry:{...document.geometry,regions}},semantic);
    expect(new Set(drawing.polygons.map(p=>p.regionId)).size).toBe(2048);
    expect(drawing.polygons.length).toBeLessThanOrEqual(32768);
    expect(drawing.polygons.reduce((total,p)=>total+p.points.length,0)).toBeLessThanOrEqual(262144);
  });
  it("reserves the complete stone wall before optional forest decoration consumes its budget", () => {
    const {document,cartography} = fixture();
    const forests = Array.from({length:300},(_,i)=>({id:`forest-${i}`,punkte:[[0,0],[600,0],[600,600],[0,600]] as TacticalPoint[]}));
    const house=document.geometry.regions.find(region=>region.id==="house")!;
    const source: TacticalMapDocumentV1={...document,geometry:{...document.geometry,regions:[...forests,house]},walls:[{id:"perimeter",kind:"wall",points:[[20,20],[500,20]],elevation:0}]};
    const semantic:TacticalCartographyV1={...cartography,regions:[...forests.map(region=>({regionId:region.id,role:"terrain" as const,material:"forest" as const,authored:false,locked:false,provenance:null})),cartography.regions.find(region=>region.regionId==="house")!]};
    const drawing=cartographyDraw(source,semantic);
    expect(drawing.polygons.filter(p=>p.regionId==="perimeter").length).toBeGreaterThanOrEqual(2);
    expect(drawing.polygons.reduce((total,p)=>total+p.points.length,0)).toBeLessThanOrEqual(262144);
    const complex={...source,walls:[{...source.walls[0]!,points:Array.from({length:32000},(_,i)=>[i%600,i%599] as TacticalPoint)}]};
    expect(cartographyPaintsWalls(semantic,complex)).toBe(false);
  });
});
