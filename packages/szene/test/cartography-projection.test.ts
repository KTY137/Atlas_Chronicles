// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { describe, expect, it } from "vitest";
import { cartographyDraw, cartographyPaintsWalls, rendererVersion } from "../src/cartography-projection.ts";
import type { CartographyReliefV1, TacticalCartographyV1 } from "../src/cartography.ts";
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
  it("draws a rock massif as relief over its whole extent, lit on one flank and shaded on the other", () => {
    const { document, cartography } = fixture();
    const punkte: TacticalPoint[] = [[0,0],[400,0],[400,1200],[0,1200]];
    const drawing = cartographyDraw({ ...document, geometry: { ...document.geometry, size: [400,1200], regions: [{ id: "rock", punkte }] } },
      { ...cartography, regions: [{ regionId: "rock", role: "terrain", material: "rock", authored: false, locked: false, provenance: null }] });
    const painted = drawing.polygons.filter(polygon => polygon.regionId === "rock");
    const middle = (polygon: typeof painted[number]) => polygon.points.reduce((sum, point) => sum + point[1], 0) / polygon.points.length;
    // A capped peak count must widen the lattice, not stop after the first rows: a tall massif
    // whose lower half stays bare grey is the exact regression this covers.
    expect(painted.filter(polygon => middle(polygon) < 300).length).toBeGreaterThan(20);
    expect(painted.filter(polygon => middle(polygon) > 900).length).toBeGreaterThan(20);
    const fills = new Set(painted.map(polygon => polygon.fill));
    expect(fills.size).toBeGreaterThan(3);
    expect(painted.every(polygon => polygon.points.every(point => point[0] > -400 && point[0] < 800 && point[1] > -400 && point[1] < 1600))).toBe(true);
  });
  it("rims a massif along the material group's outer silhouette instead of the seam between two rock polygons", () => {
    const { document, cartography } = fixture();
    const half = (left: number): TacticalPoint[] => [[left,0],[left+100,0],[left+100,100],[left,100]];
    const drawing = cartographyDraw({ ...document, geometry: { ...document.geometry, size: [200,100], regions: [{ id: "west", punkte: half(0) }, { id: "east", punkte: half(100) }] } },
      { ...cartography, regions: (["west","east"] as const).map(regionId => ({ regionId, role: "terrain" as const, material: "rock" as const, authored: false, locked: false, provenance: null })) });
    // The ink rim is the only paint drawn at this opacity, so it identifies the silhouette.
    const rims = drawing.polygons.filter(polygon => polygon.opacity === .5);
    const centre = (polygon: typeof rims[number]) => polygon.points.reduce((sum, point) => sum + point[0], 0) / polygon.points.length;
    expect(rims.some(polygon => Math.abs(centre(polygon)) < 4)).toBe(true);
    expect(rims.some(polygon => Math.abs(centre(polygon) - 200) < 4)).toBe(true);
    expect(rims.some(polygon => Math.abs(centre(polygon) - 100) < 4)).toBe(false);
  });
  it("gives standing water an outward halo and leaves a river's narrow channel without one", () => {
    const { document, cartography } = fixture();
    const punkte: TacticalPoint[] = [[200,200],[400,200],[400,400],[200,400]];
    const outside = (material: "sea" | "river") => cartographyDraw(
      { ...document, geometry: { ...document.geometry, size: [600,600], regions: [{ id: "water", punkte }] } },
      { ...cartography, regions: [{ regionId: "water", role: "water", material, authored: false, locked: false, provenance: null }] }, "fantasy", { paper: false })
      .polygons.some(polygon => polygon.points.some(point => point[0] < 180 || point[0] > 420 || point[1] < 180 || point[1] > 420));
    expect(outside("sea")).toBe(true);
    expect(outside("river")).toBe(false);
  });
  it("samples ground texture from one global lattice, so re-tessellating a meadow does not move it", () => {
    const { document, cartography } = fixture();
    const meadow = (regions: readonly { id: string; punkte: TacticalPoint[] }[]) => cartographyDraw(
      { ...document, geometry: { ...document.geometry, size: [600,600], regions } },
      { ...cartography, regions: regions.map(region => ({ regionId: region.id, role: "terrain" as const, material: "grass" as const, authored: false, locked: false, provenance: null })) })
      .polygons.filter(polygon => polygon.opacity === .34).map(polygon => polygon.points.map(point => point.map(value => value.toFixed(3)).join()).join(" "));
    const whole = meadow([{ id: "whole", punkte: [[0,0],[600,0],[600,600],[0,600]] }]);
    const split = meadow([{ id: "west", punkte: [[0,0],[300,0],[300,600],[0,600]] }, { id: "east", punkte: [[300,0],[600,0],[600,600],[300,600]] }]);
    expect(whole.length).toBeGreaterThan(30);
    expect(split.length).toBeGreaterThan(20);
    // Splitting the meadow may drop a blade that straddles the new seam; it must never shift one.
    expect(split.filter(blade => !whole.includes(blade))).toEqual([]);
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

describe("relief in the painted drawing: shading, contour lines and summits that follow the land", () => {
  const withRelief = (heights: (i: number, j: number) => number, columns = 11, rows = 11) => {
    const { document, cartography } = fixture();
    const relief: CartographyReliefV1 = { schemaVersion: 1, columns, rows, seaLevel: 77, heights: Array.from({ length: columns * rows }, (_, k) => Math.max(0, Math.min(255, Math.round(heights(k % columns, Math.floor(k / columns)))))) };
    const ground = { id: "ground", punkte: [[0, 0], [600, 0], [600, 600], [0, 600]] as TacticalPoint[] };
    return { document: { ...document, geometry: { ...document.geometry, regions: [ground, ...document.geometry.regions] } },
      cartography: { ...cartography, construction: { cellSize: 60, origin: [0, 0] as TacticalPoint }, relief, regions: [{ regionId: "ground", role: "terrain", material: "grass", authored: false, locked: false, provenance: null } as const, ...cartography.regions] } };
  };
  const ink = 0x504537;
  it("draws nothing extra for a flat map and no relief at all without one", () => {
    const flat = withRelief(() => 117), { relief: _relief, ...without } = flat.cartography;
    const flatDrawing = cartographyDraw(flat.document, flat.cartography), plainDrawing = cartographyDraw(flat.document, without);
    expect(flatDrawing.polygons.length).toBe(plainDrawing.polygons.length);
    expect(flatDrawing.rendererVersion).toBe("cartography-9");
  });
  it("shades a slope on its lit and shadowed flanks and draws contour lines only above the water line", () => {
    // A ridge along the middle: land rises from the west edge to a crest and falls to the east,
    // where it sinks under the water line. The east third must stay bare of lines and shade.
    const ridge = withRelief(i => i <= 5 ? 90 + i * 22 : 200 - (i - 5) * 40);
    const drawing = cartographyDraw(ridge.document, ridge.cartography);
    const ground = drawing.polygons.filter(p => p.regionId === "ground").slice(1);
    // Light is the paper lifted by 34 per channel (0xe0d8bc → 0xfffade), shadow a fixed ink green.
    const LIGHT = 0xfffade, DARK = 0x2b3a2e;
    const shade = ground.filter(p => p.points.length === 4 && (p.fill === LIGHT || p.fill === DARK)), lines = ground.filter(p => p.fill === ink);
    expect(shade.length).toBeGreaterThan(20); expect(lines.length).toBeGreaterThan(20);
    const lit = shade.filter(p => p.fill === LIGHT), dark = shade.filter(p => p.fill === DARK);
    expect(lit.length).toBeGreaterThan(0); expect(dark.length).toBeGreaterThan(0);
    // West flank faces north-west light (rises towards the east): lit. East flank: shadowed.
    const centre = (p: typeof shade[number]) => p.points.reduce((s, q) => s + q[0], 0) / p.points.length;
    expect(lit.every(p => centre(p) < 300)).toBe(true); expect(dark.every(p => centre(p) > 300)).toBe(true);
    const underWater = [...shade, ...lines].filter(p => p.points.every(q => q[0] > 480));
    expect(underWater).toEqual([]);
    const { relief: _relief, ...without } = ridge.cartography;
    const none = cartographyDraw(ridge.document, ridge.cartography, "fantasy", { contours: false, shading: false });
    expect(none.polygons.length).toBe(cartographyDraw(ridge.document, without).polygons.length);
    // Contours off leaves the hills their ink outlines (they belong to the shading); the contour lines themselves are gone.
    expect(cartographyDraw(ridge.document, ridge.cartography, "fantasy", { contours: false }).polygons.filter(p => p.regionId === "ground" && p.fill === ink && (p.opacity === .3 || p.opacity === .46))).toHaveLength(0);
    expect(cartographyDraw(ridge.document, ridge.cartography, "fantasy", { contours: false, shading: false, paper: false }).polygons.filter(p => p.regionId === "ground" && p.fill === ink)).toHaveLength(0);
  });
  it("grows summits with the land under a rock region and puts snow only above the snow line", () => {
    const { document, cartography } = fixture();
    const rock = { id: "massif", punkte: [[60, 60], [540, 60], [540, 540], [60, 540]] as TacticalPoint[] };
    const roles = [...cartography.regions.filter(r => r.regionId !== "forest"), { regionId: "massif", role: "terrain", material: "rock", authored: false, locked: false, provenance: null } as const];
    const base = { document: { ...document, geometry: { ...document.geometry, regions: [...document.geometry.regions.filter(r => r.id !== "forest"), rock] } }, cartography: { ...cartography, construction: { cellSize: 60, origin: [0, 0] as TacticalPoint }, regions: roles } };
    const heights = (level: (i: number) => number): CartographyReliefV1 => ({ schemaVersion: 1, columns: 11, rows: 11, seaLevel: 77, heights: Array.from({ length: 121 }, (_, k) => level(k % 11)) });
    const low = cartographyDraw(base.document, { ...base.cartography, relief: heights(() => 120) }, "fantasy", { contours: false, shading: false });
    const high = cartographyDraw(base.document, { ...base.cartography, relief: heights(i => i < 5 ? 200 : 250) }, "fantasy", { contours: false, shading: false });
    const massif = (drawing: typeof low) => drawing.polygons.filter(p => p.regionId === "massif");
    // Land far below the rock line carries only the talus rim, no summits at all.
    expect(massif(low).length).toBeLessThan(massif(high).length / 3);
    const snow = massif(high).filter(p => p.opacity === .85 && p.points.length === 3);
    expect(snow.length).toBeGreaterThan(0);
    // The snow line runs through the bilinear ramp between column 4 (200) and column 5 (250).
    expect(snow.every(p => p.points[0]![0] > 280)).toBe(true);
    expect(snow.some(p => p.points[0]![0] > 400)).toBe(true);
  });
  it("paints marsh pools and reeds on swamp and quiet drifts on snow", () => {
    const { document, cartography } = fixture();
    const field = { id: "patch", punkte: [[0, 0], [600, 0], [600, 600], [0, 600]] as TacticalPoint[] };
    const paint = (material: "swamp" | "snow") => cartographyDraw({ ...document, geometry: { ...document.geometry, regions: [field] } },
      { ...cartography, regions: [{ regionId: "patch", role: "terrain", material, authored: false, locked: false, provenance: null }] }).polygons.filter(p => p.regionId === "patch");
    const swamp = paint("swamp"), snow = paint("snow");
    expect(swamp.length).toBeGreaterThan(30); expect(swamp.some(p => p.points.length === 10)).toBe(true);
    expect(snow.length).toBeGreaterThan(10); expect(snow.some(p => p.fill === 0xeef0ea && p.opacity === 1 && p.points.length === 4)).toBe(true);
    const drifts = snow.filter(p => p.opacity === .35);
    expect(drifts.length).toBeGreaterThan(5); expect(new Set(drifts.map(p => p.fill)).size).toBe(1);
  });
});
