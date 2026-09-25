// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { describe, expect, it } from "vitest";
import { cartographyDraw, createCartographyDraw, cartographyLayerOf, cartographyPaintsWalls, rendererVersion } from "../src/cartography-projection.ts";
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
describe("a viewer reuses unchanged landscape artwork", () => {
  it("keeps the drawing across furnishing, name, lighting, grid and ownership edits", () => {
    const { document, cartography } = fixture(), draw = createCartographyDraw();
    const first = draw(document, cartography);
    const nextDocument: TacticalMapDocumentV1 = { ...document, grid: { kind: "none" },
      geometry: { ...document.geometry, stamps: [{ id: "chair", a: "pk.test/chair", x: 20, y: 30, s: 1, r: .5, l: 0 }], places: [{ id: "marker", x: 50, y: 60 }] },
      lights: [{ id: "lamp", position: [20, 30], range: 100, intensity: .8, colorArgb: "ffddaa77", shadows: false, elevation: 0 }] };
    const nextCartography: TacticalCartographyV1 = { ...cartography,
      labels: [{ id: "name", text: "The new name", points: [[40, 50]], style: "ort", size: 18 }],
      regions: cartography.regions.map(role => ({ ...role, authored: true, locked: true,
        ...(role.role === "building" ? { attachedStampIds: ["chair"] } : {}) })) };
    expect(draw(nextDocument, nextCartography)).toBe(first);
    expect(first).toEqual(cartographyDraw(nextDocument, nextCartography));
  });

  it("refreshes every visual dependency and keeps the previous drawing intact", () => {
    const { document, cartography } = fixture();
    const relief: CartographyReliefV1 = { schemaVersion: 1, columns: 11, rows: 11, seaLevel: 77, heights: Array.from({ length: 121 }, (_, index) => 90 + index % 11 * 12) };
    const landscape = { ...cartography, relief };
    type Arguments = Parameters<typeof cartographyDraw>;
    const changes: readonly [string, Arguments][] = [
      ["geometry", [{ ...document, geometry: { ...document.geometry, regions: document.geometry.regions.map(region => ({ ...region, punkte: region.punkte.map(([x, y]) => [x + 10, y] as const) })) } }, landscape]],
      ["walls", [{ ...document, walls: [{ id: "perimeter", kind: "wall", elevation: 0, points: [[100, 300], [450, 300]] }] }, landscape]],
      ["dimensions", [{ ...document, geometry: { ...document.geometry, size: [700, 650] } }, landscape]],
      ["background", [{ ...document, background: { sha256: "a".repeat(64), mimeType: "image/png", width: 600, height: 600 } }, landscape]],
      ["construction size", [document, { ...landscape, construction: { ...landscape.construction, cellSize: 80 } }]],
      ["construction origin", [document, { ...landscape, construction: { ...landscape.construction, origin: [12, 15] } }]],
      ["relief", [document, { ...landscape, relief: { ...relief, heights: relief.heights.map(height => height + 5) } }]],
      ["role material", [document, { ...landscape, regions: landscape.regions.map(role => role.role === "terrain" ? { ...role, material: "rock" } : role) }]],
      ["plot ownership", [document, { ...landscape, regions: landscape.regions.map(role => role.role === "building" ? { ...role, lotRegionId: "lot" } : role) }]],
      ["setting", [document, landscape, "scifi"]],
      ["stored mood", [document, { ...landscape, mood: "nacht" }]],
      ["preview mood", [document, landscape, "fantasy", { mood: "winter" }]],
      ["paper", [document, landscape, "fantasy", { paper: false }]],
      ["contours", [document, landscape, "fantasy", { contours: false }]],
      ["shading", [document, landscape, "fantasy", { shading: false }]],
      ["hidden layer", [document, landscape, "fantasy", { hide: ["water"] }]],
    ];
    for (const [name, args] of changes) {
      const draw = createCartographyDraw(), first = draw(document, landscape), saved = structuredClone(first);
      const next = draw(...args);
      expect(next, name).not.toBe(first);
      expect(next, name).toEqual(cartographyDraw(...args));
      expect(first, name).toEqual(saved);
    }
  });

  it("retains a room floor while its furniture changes and repaints a new floor material", () => {
    const { document, cartography } = fixture(), draw = createCartographyDraw();
    const room: TacticalCartographyV1 = { ...cartography, regions: [{ regionId: "house", role: "room", authored: false, locked: false, provenance: null,
      interior: { schemaVersion: 1, floor: "wood", stampIds: [], wallIds: [], portalIds: [], lightIds: [] } }] };
    const first = draw(document, room);
    const furnished: TacticalCartographyV1 = { ...room, regions: room.regions.map(role => role.role === "room" ? { ...role, interior: { ...role.interior!, stampIds: ["chair"] } } : role) };
    expect(draw(document, furnished)).toBe(first);
    const stone: TacticalCartographyV1 = { ...furnished, regions: furnished.regions.map(role => role.role === "room" ? { ...role, interior: { ...role.interior!, floor: "stone" } } : role) };
    expect(draw(document, stone)).not.toBe(first);
    expect(draw(document, stone)).toEqual(cartographyDraw(document, stone));
  });

  it("treats equivalent default and hidden-layer choices identically", () => {
    const { document, cartography } = fixture(), draw = createCartographyDraw();
    const first = draw(document, cartography);
    expect(draw(document, cartography, "fantasy", { contours: true, shading: true, paper: true, mood: "tag", hide: [] })).toBe(first);
    const hidden = draw(document, cartography, "fantasy", { hide: ["water", "building"] });
    expect(draw(document, cartography, "fantasy", { hide: ["building", "water", "water"] })).toBe(hidden);
  });

  it("repaints a village that grows into a town on the same regional footprint", () => {
    const { document, cartography } = fixture(), draw = createCartographyDraw();
    const village: TacticalCartographyV1 = { ...cartography, regions: [{ regionId: "house", role: "ort", groesse: "dorf", standort: "ebene", authored: false, locked: false, provenance: null }] };
    const first = draw(document, village);
    const town: TacticalCartographyV1 = { ...village, regions: village.regions.map(role => role.role === "ort" ? { ...role, groesse: "stadt" } : role) };
    expect(draw(document, town)).not.toBe(first);
    expect(draw(document, town)).toEqual(cartographyDraw(document, town));
  });

  it("replaces the retained drawing when authorized geometry shrinks and isolates viewers", () => {
    const { document, cartography } = fixture(), draw = createCartographyDraw();
    const first = draw(document, cartography);
    const visible = { ...document, geometry: { ...document.geometry, regions: document.geometry.regions.filter(region => region.id !== "house") } };
    const reduced = draw(visible, cartography);
    expect(reduced.polygons.some(polygon => polygon.regionId === "house")).toBe(false);
    expect(reduced).toEqual(cartographyDraw(visible, cartography));
    expect(draw(document, cartography)).not.toBe(first);
    expect(createCartographyDraw()(document, cartography)).not.toBe(first);
  });
});

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
    expect(flatDrawing.rendererVersion).toBe(rendererVersion);
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
    // On the ground, contours and shading off is the same as no relief at all; the river keeps
    // its relief-born waterfall either way, so only the ground is compared.
    const none = cartographyDraw(ridge.document, ridge.cartography, "fantasy", { contours: false, shading: false });
    expect(none.polygons.filter(p => p.regionId === "ground").length).toBe(cartographyDraw(ridge.document, without).polygons.filter(p => p.regionId === "ground").length);
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

describe("the sheet itself: parchment, vignette, sea floor, hills, spruce and roads", () => {
  const rect = (x: number, y: number, w: number, h: number): TacticalPoint[] => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
  const sheet = (regions: { id: string; punkte: TacticalPoint[] }[], roles: TacticalCartographyV1["regions"], relief?: CartographyReliefV1) => {
    const { document, cartography } = fixture();
    return { document: { ...document, geometry: { ...document.geometry, regions } }, cartography: { ...cartography, construction: { cellSize: 60, origin: [0, 0] as TacticalPoint }, regions: roles, ...(relief ? { relief } : {}) } };
  };
  const ground = { regionId: "ground", role: "terrain", material: "grass", authored: false, locked: false, provenance: null } as const;
  it("mottles a generated map first and darkens its edges last, and leaves an imported image alone", () => {
    const { document, cartography } = sheet([{ id: "ground", punkte: rect(0, 0, 600, 600) }], [ground]);
    const drawing = cartographyDraw(document, cartography);
    expect(drawing.polygons[0]!.opacity).toBe(.24);
    expect(drawing.polygons.at(-1)!.fill).toBe(0x2b2218);
    expect(drawing.polygons.filter(p => p.fill === 0x2b2218)).toHaveLength(16);
    const bare = cartographyDraw(document, cartography, "fantasy", { paper: false });
    expect(bare.polygons.some(p => p.opacity === .24 || p.fill === 0x2b2218)).toBe(false);
    const photographed = cartographyDraw({ ...document, background: { contentHash: "a".repeat(64), mimeType: "image/png", width: 600, height: 600 } } as unknown as typeof document, cartography);
    expect(photographed.polygons.some(p => p.opacity === .24 || p.fill === 0x2b2218)).toBe(false);
  });
  it("steps the sea floor deeper away from the shore and only under water", () => {
    const relief: CartographyReliefV1 = { schemaVersion: 1, columns: 11, rows: 11, seaLevel: 77, heights: Array.from({ length: 121 }, (_, k) => (k % 11) < 5 ? 120 : 20) };
    const { document, cartography } = sheet([{ id: "ground", punkte: rect(0, 0, 600, 600) }, { id: "sea", punkte: rect(300, 0, 300, 600) }], [ground, { regionId: "sea", role: "water", material: "sea", authored: false, locked: false, provenance: null }], relief);
    const deep = cartographyDraw(document, cartography, "fantasy", { paper: false, contours: false }).polygons.filter(p => p.regionId === "ground" && p.opacity === .15);
    expect(deep.length).toBeGreaterThan(20);
    expect(deep.every(p => p.points.every(q => q[0] >= 240))).toBe(true);
    expect(new Set(deep.map(p => p.fill)).size).toBe(1);
  });
  it("draws hills on rising land, none on a plain, none on tilled fields", () => {
    const hilly: CartographyReliefV1 = { schemaVersion: 1, columns: 11, rows: 11, seaLevel: 77, heights: Array.from({ length: 121 }, () => 160) };
    const flat: CartographyReliefV1 = { ...hilly, heights: Array.from({ length: 121 }, () => 117) };
    const draw = (relief: CartographyReliefV1, roles: TacticalCartographyV1["regions"], regions: { id: string; punkte: TacticalPoint[] }[]) => { const s = sheet(regions, roles, relief); return cartographyDraw(s.document, s.cartography, "fantasy", { paper: false, contours: false }).polygons.filter(p => p.regionId === "ground" && p.opacity === .55); };
    const mounds = draw(hilly, [ground], [{ id: "ground", punkte: rect(0, 0, 600, 600) }]);
    expect(mounds.length).toBeGreaterThan(10);
    expect(draw(flat, [ground], [{ id: "ground", punkte: rect(0, 0, 600, 600) }])).toHaveLength(0);
    const field = { regionId: "field", role: "terrain", material: "field", authored: false, locked: false, provenance: null } as const;
    const farmed = draw(hilly, [ground, field], [{ id: "ground", punkte: rect(0, 0, 600, 600) }, { id: "field", punkte: rect(0, 0, 600, 300) }]);
    expect(farmed.length).toBeLessThan(mounds.length);
    // A mound stands on its lattice point and rises up to a third of a cell above it.
    expect(farmed.every(p => p.points.every(q => q[1] >= 300 - 20))).toBe(true);
  });
  it("mixes spruce into a wood, more of it on high ground, and inks roads along their outer edge", () => {
    const high: CartographyReliefV1 = { schemaVersion: 1, columns: 11, rows: 11, seaLevel: 77, heights: Array.from({ length: 121 }, () => 180) };
    const low: CartographyReliefV1 = { ...high, heights: Array.from({ length: 121 }, () => 120) };
    const forest = { regionId: "wood", role: "terrain", material: "forest", authored: false, locked: false, provenance: null } as const;
    const spruce = (relief: CartographyReliefV1) => { const s = sheet([{ id: "wood", punkte: rect(0, 0, 600, 600) }], [forest], relief); return cartographyDraw(s.document, s.cartography, "fantasy", { paper: false, contours: false, shading: false }).polygons.filter(p => p.regionId === "wood" && p.points.length === 11 && p.opacity === 1).length; };
    expect(spruce(high)).toBeGreaterThan(spruce(low)); expect(spruce(low)).toBeGreaterThan(0);
    const path = { regionId: "track", role: "road", material: "path", authored: false, locked: false, provenance: null } as const;
    const s = sheet([{ id: "ground", punkte: rect(0, 0, 600, 600) }, { id: "track", punkte: rect(100, 280, 400, 40) }], [ground, path]);
    const track = cartographyDraw(s.document, s.cartography, "fantasy", { paper: false }).polygons.filter(p => p.regionId === "track");
    expect(track.filter(p => p.opacity === .22)).toHaveLength(4);
    expect(track.filter(p => p.opacity === .28)).toHaveLength(2);
  });
});

describe("what makes it a painting: patchwork fields, chimneys, a mottled plain, a massif that pales with height", () => {
  const rect = (x: number, y: number, w: number, h: number): TacticalPoint[] => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
  const base = { authored: false, locked: false, provenance: null } as const;
  it("colours neighbouring parcels differently and sets a chimney with its shadow on most roofs", () => {
    const { document, cartography } = fixture();
    const fields = Array.from({ length: 12 }, (_, index) => ({ id: `feld-${index}`, punkte: rect(index * 45, 0, 40, 80) }));
    const houses = Array.from({ length: 12 }, (_, index) => ({ id: `haus-${index}`, punkte: rect(index * 45, 200, 40, 30) }));
    const drawing = cartographyDraw({ ...document, geometry: { ...document.geometry, regions: [...fields, ...houses] } },
      { ...cartography, construction: { cellSize: 64, origin: [0, 0] }, regions: [...fields.map(field => ({ ...base, regionId: field.id, role: "terrain", material: "field" } as const)), ...houses.map(house => ({ ...base, regionId: house.id, role: "building" } as const))] }, "fantasy", { paper: false });
    const fills = new Set(fields.map(field => drawing.polygons.find(p => p.regionId === field.id && p.opacity === 1 && p.points.length === 4)!.fill));
    expect(fills.size).toBe(3);
    const chimneys = houses.filter(house => drawing.polygons.some(p => p.regionId === house.id && p.fill === 0x5a4a40));
    expect(chimneys.length).toBeGreaterThan(5); expect(chimneys.length).toBeLessThan(12);
    for (const house of chimneys) expect(drawing.polygons.filter(p => p.regionId === house.id && p.fill === 0x8d7a6a)).toHaveLength(1);
  });
  it("mottles the open ground before the relief and the woods, from one global lattice, not over water", () => {
    const { document, cartography } = fixture();
    const regions = [{ id: "ground", punkte: rect(0, 0, 600, 600) }, { id: "wood", punkte: rect(0, 0, 200, 600) }, { id: "sea", punkte: rect(400, 0, 200, 600) }];
    const roles = [{ ...base, regionId: "ground", role: "terrain", material: "grass" }, { ...base, regionId: "wood", role: "terrain", material: "forest" }, { ...base, regionId: "sea", role: "water", material: "sea" }] as const;
    const drawing = cartographyDraw({ ...document, geometry: { ...document.geometry, regions } }, { ...cartography, construction: { cellSize: 60, origin: [0, 0] }, regions: [...roles] }, "fantasy", { paper: false });
    const first = (id: string) => drawing.polygons.findIndex(p => p.regionId === id), mottle = drawing.polygons.map((p, index) => ({ p, index })).filter(({ p }) => p.regionId === "ground" && p.opacity === .11);
    expect(mottle.length).toBeGreaterThan(30);
    expect(mottle.every(({ index }) => index < first("wood") && index < first("sea"))).toBe(true);
    expect(mottle.every(({ index }) => index > first("ground"))).toBe(true);
  });
  it("paints a massif paler where the land under it is higher", () => {
    const { document, cartography } = fixture();
    const relief: CartographyReliefV1 = { schemaVersion: 1, columns: 11, rows: 11, seaLevel: 77, heights: Array.from({ length: 121 }, (_, k) => (k % 11) < 5 ? 200 : 250) };
    const regions = [{ id: "foot", punkte: rect(0, 0, 240, 600) }, { id: "crest", punkte: rect(360, 0, 240, 600) }];
    const roles = regions.map(region => ({ ...base, regionId: region.id, role: "terrain", material: "rock" } as const));
    const drawing = cartographyDraw({ ...document, geometry: { ...document.geometry, regions } }, { ...cartography, construction: { cellSize: 60, origin: [0, 0] }, regions: roles, relief }, "fantasy", { paper: false, contours: false, shading: false });
    const fill = (id: string) => drawing.polygons.find(p => p.regionId === id && p.opacity === 1 && p.points.length === 4)!.fill;
    expect(fill("crest")).toBeGreaterThan(fill("foot"));
    const plain = cartographyDraw({ ...document, geometry: { ...document.geometry, regions } }, { ...cartography, construction: { cellSize: 60, origin: [0, 0] }, regions: roles }, "fantasy", { paper: false });
    expect(plain.polygons.find(p => p.regionId === "crest" && p.opacity === 1 && p.points.length === 4)!.fill).toBe(plain.polygons.find(p => p.regionId === "foot" && p.opacity === 1 && p.points.length === 4)!.fill);
  });
});

describe("a plot is a garden around its house", () => {
  it("fences the plot with posts and grows beds, a tree or a bush only where no roof stands", () => {
    const { document, cartography } = fixture();
    const rect = (x: number, y: number, w: number, h: number): TacticalPoint[] => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
    const regions = [{ id: "plot", punkte: rect(0, 0, 400, 300) }, { id: "house", punkte: rect(40, 40, 200, 120) }];
    const roles = [
      { regionId: "plot", role: "lot", authored: false, locked: false, provenance: null },
      { regionId: "house", role: "building", lotRegionId: "plot", authored: false, locked: false, provenance: null },
    ] as const;
    const drawing = cartographyDraw({ ...document, geometry: { ...document.geometry, regions } }, { ...cartography, construction: { cellSize: 64, origin: [0, 0] }, regions: [...roles] }, "fantasy", { paper: false });
    const plot = drawing.polygons.filter(p => p.regionId === "plot");
    const posts = plot.filter(p => p.opacity === .3 && p.points.length === 4);
    expect(posts.length).toBeGreaterThan(40);
    const garden = plot.filter(p => p.opacity === .38 || p.opacity === 1 && p.points.length === 14 || p.opacity === 1 && p.points.length === 7);
    expect(garden.length).toBeGreaterThan(6);
    const house = regions[1]!.punkte;
    const insideHouse = (point: TacticalPoint) => point[0] > house[0]![0] && point[0] < house[1]![0] && point[1] > house[0]![1] && point[1] < house[2]![1];
    expect(garden.every(p => p.points.every(point => !insideHouse(point)))).toBe(true);
    const bare = cartographyDraw({ ...document, geometry: { ...document.geometry, regions: [regions[0]!] } }, { ...cartography, construction: { cellSize: 64, origin: [0, 0] }, regions: [roles[0]] }, "fantasy", { paper: false }).polygons.filter(p => p.regionId === "plot");
    expect(bare.filter(p => p.opacity === .38 || p.opacity === 1 && p.points.length === 14 || p.opacity === 1 && p.points.length === 7).length).toBeGreaterThan(garden.length);
  });
});

describe("mood and layers: the same map by night, under snow, in autumn, and with a layer lifted", () => {
  const rect = (x: number, y: number, w: number, h: number): TacticalPoint[] => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
  const base = { authored: false, locked: false, provenance: null } as const;
  const scene = () => {
    const { document, cartography } = fixture();
    const regions = [{ id: "ground", punkte: rect(0, 0, 600, 600) }, { id: "wood", punkte: rect(0, 0, 200, 600) }, { id: "sea", punkte: rect(400, 0, 200, 600) }, { id: "house", punkte: rect(250, 250, 60, 40) }, { id: "lane", punkte: rect(220, 400, 200, 30) }];
    const roles = [{ ...base, regionId: "ground", role: "terrain", material: "grass" }, { ...base, regionId: "wood", role: "terrain", material: "forest" }, { ...base, regionId: "sea", role: "water", material: "sea" }, { ...base, regionId: "house", role: "building" }, { ...base, regionId: "lane", role: "road", material: "street" }] as const;
    return { document: { ...document, geometry: { ...document.geometry, regions } }, cartography: { ...cartography, construction: { cellSize: 60, origin: [0, 0] as TacticalPoint }, regions: [...roles] } };
  };
  const channels = (color: number) => [color >> 16, color >> 8 & 255, color & 255] as const;
  const fill = (drawing: ReturnType<typeof cartographyDraw>, id: string) => drawing.polygons.find(p => p.regionId === id && p.opacity === 1 && p.points.length === 4)!.fill;
  it("sinks every colour of the night into the same blue dusk and keeps every polygon", () => {
    const { document, cartography } = scene();
    const day = cartographyDraw(document, cartography), night = cartographyDraw(document, { ...cartography, mood: "nacht" });
    expect(night.polygons).toHaveLength(day.polygons.length);
    for (let index = 0; index < day.polygons.length; index++) {
      const [r, g, b] = channels(day.polygons[index]!.fill), [nr, ng, nb] = channels(night.polygons[index]!.fill);
      expect(nr).toBeLessThanOrEqual(r); expect(ng).toBeLessThanOrEqual(g); expect(nb).toBeLessThanOrEqual(b);
      expect(night.polygons[index]!.opacity).toBe(day.polygons[index]!.opacity);
    }
    expect(channels(night.background!)[2]).toBeGreaterThan(channels(night.background!)[0]);
    expect(cartographyDraw(document, cartography, "fantasy", { mood: "nacht" })).toEqual(night);
    expect(cartographyDraw(document, { ...cartography, mood: "nacht" }, "fantasy", { mood: "tag" })).toEqual(day);
  });
  it("lays snow on the meadow and ice on the water in winter, and turns the wood russet in autumn", () => {
    const { document, cartography } = scene();
    const day = cartographyDraw(document, cartography), winter = cartographyDraw(document, { ...cartography, mood: "winter" }), autumn = cartographyDraw(document, { ...cartography, mood: "herbst" });
    const luminance = (color: number) => { const [r, g, b] = channels(color); return r * .3 + g * .59 + b * .11; };
    expect(luminance(fill(winter, "ground"))).toBeGreaterThan(luminance(fill(day, "ground")) + 30);
    expect(luminance(fill(winter, "sea"))).toBeGreaterThan(luminance(fill(day, "sea")) + 25);
    const [dr, dg] = channels(fill(day, "wood")), [ar, ag] = channels(fill(autumn, "wood"));
    expect(dg).toBeGreaterThan(dr); expect(ar).toBeGreaterThan(ag);
    expect(winter.polygons).toHaveLength(day.polygons.length); expect(autumn.polygons).toHaveLength(day.polygons.length);
  });
  it("lifts a hidden layer with everything that belongs to it and leaves the others untouched", () => {
    const { document, cartography } = scene();
    const all = cartographyDraw(document, cartography, "fantasy", { paper: false }), without = cartographyDraw(document, cartography, "fantasy", { paper: false, hide: ["water", "building"] });
    expect(without.polygons.some(p => p.regionId === "sea" || p.regionId === "house")).toBe(false);
    for (const id of ["ground", "wood", "lane"]) expect(without.polygons.filter(p => p.regionId === id)).toEqual(all.polygons.filter(p => p.regionId === id));
    expect(all.polygons.some(p => p.regionId === "sea") && all.polygons.some(p => p.regionId === "house")).toBe(true);
    const bare = cartographyDraw(document, cartography, "fantasy", { paper: false, hide: ["terrain", "water", "road", "lot", "building", "room"] });
    expect(bare.polygons).toHaveLength(0); expect(bare.background).toBe(all.background);
  });
  it("lifts the stone walls of a town plan as their own layer", () => {
    const { document, cartography } = scene();
    const walled = { ...document, walls: [{ id: "wall", kind: "wall" as const, elevation: 0, points: [[100, 100], [300, 100]] as TacticalPoint[] }] };
    expect(cartographyDraw(walled, cartography, "fantasy", { paper: false }).polygons.some(p => p.regionId === "wall")).toBe(true);
    expect(cartographyDraw(walled, cartography, "fantasy", { paper: false, hide: ["walls"] }).polygons.some(p => p.regionId === "wall")).toBe(false);
  });
});

describe("a settlement seen from the region: roofs, a church, a wall", () => {
  const rect = (x: number, y: number, w: number, h: number): TacticalPoint[] => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
  const base = { authored: false, locked: false, provenance: null } as const;
  const sheet = (groesse: "weiler" | "dorf" | "stadt", setting: "fantasy" | "gegenwart" = "fantasy") => {
    const { document, cartography } = fixture();
    const regions = [{ id: "ground", punkte: rect(0, 0, 600, 600) }, { id: "ort", punkte: rect(150, 150, 300, 260) }];
    const roles = [{ ...base, regionId: "ground", role: "terrain", material: "grass" }, { ...base, regionId: "ort", role: "ort", groesse, standort: "huegel" }] as const;
    return cartographyDraw({ ...document, geometry: { ...document.geometry, regions } }, { ...cartography, construction: { cellSize: 60, origin: [0, 0] }, regions: [...roles] }, setting, { paper: false }).polygons.filter(p => p.regionId === "ort");
  };
  it("draws more roofs the bigger the place, above the roads and below the buildings", () => {
    const hamlet = sheet("weiler"), village = sheet("dorf"), town = sheet("stadt");
    const roofs = (polygons: typeof hamlet) => polygons.filter(p => p.points.length === 4 && p.opacity === 1).length;
    expect(roofs(hamlet)).toBeGreaterThan(4); expect(roofs(village)).toBeGreaterThan(roofs(hamlet)); expect(roofs(town)).toBeGreaterThan(roofs(village));
    expect(cartographyLayerOf({ ...base, regionId: "x", role: "ort", groesse: "dorf", standort: "ebene" })).toBe("building");
  });
  it("gives a village a church spire and a town its wall with towers, and flat roofs outside the fantasy setting", () => {
    const { document, cartography } = fixture();
    const spire = (polygons: ReturnType<typeof sheet>) => polygons.filter(p => p.fill === 0x683e32 && p.opacity === 1).length;
    expect(spire(sheet("weiler"))).toBe(0); expect(spire(sheet("dorf"))).toBe(1);
    const town = sheet("stadt"), stone = town.filter(p => p.fill === 0xaaa08a);
    expect(stone.length).toBeGreaterThanOrEqual(8);
    expect(sheet("dorf", "gegenwart").filter(p => p.fill === 0x683e32)).toHaveLength(0);
    void document; void cartography;
  });
});

describe("water and coast: piers with boats, reed belts, waterfalls and river mouths", () => {
  const rect = (x: number, y: number, w: number, h: number): TacticalPoint[] => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
  const base = { authored: false, locked: false, provenance: null } as const;
  const draw = (regions: { id: string; punkte: TacticalPoint[] }[], roles: TacticalCartographyV1["regions"], relief?: CartographyReliefV1) => {
    const { document, cartography } = fixture();
    return cartographyDraw({ ...document, geometry: { ...document.geometry, regions } }, { ...cartography, construction: { cellSize: 60, origin: [0, 0] }, regions: roles, ...(relief ? { relief } : {}) }, "fantasy", { paper: false, contours: false, shading: false }).polygons;
  };
  const ground = { ...base, regionId: "ground", role: "terrain", material: "grass" } as const;
  it("lays planks and posts on a pier and moors a boat alongside", () => {
    const polygons = draw([{ id: "ground", punkte: rect(0, 0, 600, 600) }, { id: "sea", punkte: rect(300, 0, 300, 600) }, { id: "pier", punkte: rect(280, 290, 160, 24) }],
      [ground, { ...base, regionId: "sea", role: "water", material: "sea" }, { ...base, regionId: "pier", role: "road", material: "steg" }]).filter(p => p.regionId === "pier");
    expect(polygons.filter(p => p.fill === 0x3d2e1e).length).toBeGreaterThanOrEqual(6);
    expect(polygons.filter(p => p.fill === 0x683e32 && p.opacity === .35).length).toBeGreaterThan(3);
    expect(polygons.filter(p => p.points.length === 6 && p.fill === 0xa6825a).length).toBeGreaterThanOrEqual(1);
  });
  it("grows reeds on the land side of a lake shore and none along a river", () => {
    const lake = draw([{ id: "ground", punkte: rect(0, 0, 600, 600) }, { id: "lake", punkte: rect(200, 200, 200, 200) }], [ground, { ...base, regionId: "lake", role: "water", material: "lake" }]);
    const reeds = lake.filter(p => p.regionId === "lake" && p.fill === 0x6b7a37);
    expect(reeds.length).toBeGreaterThan(6);
    expect(reeds.every(p => p.points.every(q => q[0] < 200 || q[0] > 400 || q[1] < 200 || q[1] > 400))).toBe(true);
    const river = draw([{ id: "ground", punkte: rect(0, 0, 600, 600) }, { id: "river", punkte: rect(0, 280, 600, 40) }], [ground, { ...base, regionId: "river", role: "water", material: "river" }]);
    expect(river.filter(p => p.regionId === "river" && p.fill === 0x6b7a37)).toHaveLength(0);
  });
  it("whitens a reach that drops steeply and fans out a reach that ends in the sea", () => {
    const steep: CartographyReliefV1 = { schemaVersion: 1, columns: 11, rows: 11, seaLevel: 77, heights: Array.from({ length: 121 }, (_, k) => (k % 11) < 5 ? 180 : 100) };
    const fall = draw([{ id: "ground", punkte: rect(0, 0, 600, 600) }, { id: "river", punkte: rect(200, 280, 200, 40) }], [ground, { ...base, regionId: "river", role: "water", material: "river" }], steep).filter(p => p.regionId === "river");
    expect(fall.filter(p => p.fill === 0xf4fbfb)).toHaveLength(4);
    const flat: CartographyReliefV1 = { ...steep, heights: Array.from({ length: 121 }, () => 120) };
    expect(draw([{ id: "ground", punkte: rect(0, 0, 600, 600) }, { id: "river", punkte: rect(200, 280, 200, 40) }], [ground, { ...base, regionId: "river", role: "water", material: "river" }], flat).filter(p => p.regionId === "river" && p.fill === 0xf4fbfb)).toHaveLength(0);
    const mouth = draw([{ id: "ground", punkte: rect(0, 0, 600, 600) }, { id: "sea", punkte: rect(400, 0, 200, 600) }, { id: "river", punkte: rect(250, 280, 160, 40) }],
      [ground, { ...base, regionId: "sea", role: "water", material: "sea" }, { ...base, regionId: "river", role: "water", material: "river" }]).filter(p => p.regionId === "river");
    expect(mouth.filter(p => p.fill === 0xe1eeea && p.opacity === .55)).toHaveLength(2);
    expect(mouth.some(p => p.opacity === .32 && p.points.length === 4)).toBe(true);
  });
});

describe("a cave: rock around chambers, rough edges, rubble and moss", () => {
  const rect = (x: number, y: number, w: number, h: number): TacticalPoint[] => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
  const base = { authored: false, locked: false, provenance: null } as const;
  const interior = (floor: "stone" | "wood") => ({ schemaVersion: 1 as const, floor, stampIds: [], wallIds: [], portalIds: [], lightIds: [] });
  const draw = (floor: "stone" | "wood", ground: "rock" | "grass") => {
    const { document, cartography } = fixture();
    const regions = [{ id: "mass", punkte: rect(0, 0, 600, 600) }, { id: "hall", punkte: rect(120, 120, 300, 240) }];
    return cartographyDraw({ ...document, geometry: { ...document.geometry, regions } }, { ...cartography, construction: { cellSize: 60, origin: [0, 0] },
      regions: [{ ...base, regionId: "mass", role: "terrain", material: ground }, { ...base, regionId: "hall", role: "room", interior: interior(floor) }] }, "fantasy", { paper: false }).polygons;
  };
  it("draws the rock as a dark stippled mass without summits and bounds the chamber with broken strokes, rubble and moss", () => {
    const cave = draw("stone", "rock"), mass = cave.filter(p => p.regionId === "mass"), hall = cave.filter(p => p.regionId === "hall");
    expect(mass.some(p => p.opacity === .8 && p.points.length === 5)).toBe(false);
    expect(mass.filter(p => p.opacity === .55).length).toBeGreaterThan(40);
    expect(hall.filter(p => p.fill === 0x2b2620 && p.opacity === .55).length).toBeGreaterThanOrEqual(12);
    expect(hall.filter(p => p.points.length === 5 && p.fill !== 0x5f7a3c && p.opacity === 1).length).toBeGreaterThan(4);
    expect(hall.filter(p => p.fill === 0x5f7a3c)).not.toHaveLength(0);
    expect(hall.filter(p => p.fill === 0x403c36)).toHaveLength(0);
  });
  it("leaves a built house and an open massif as they were", () => {
    const house = draw("wood", "grass");
    expect(house.filter(p => p.regionId === "hall" && p.fill === 0x403c36).length).toBeGreaterThan(3);
    expect(house.filter(p => p.fill === 0x2b2620)).toHaveLength(0);
    const massif = draw("wood", "rock");
    expect(massif.filter(p => p.regionId === "mass" && p.opacity === .8 && p.points.length === 5).length).toBeGreaterThan(0);
  });
});

describe("cartography-12: Türme, Mauer und Marktplätze der Viertelstadt", () => {
  const z = 64, S = .8660254037844386, kreis = [[1, 0], [S, .5], [.5, S], [0, 1], [-.5, S], [-S, .5], [-1, 0], [-S, -.5], [-.5, -S], [0, -1], [.5, -S], [S, -.5]] as const;
  const turm: TacticalPoint[] = kreis.map(([x, y]) => [(4 + x * .42) * z, (4 + y * .42) * z]);
  const platz: TacticalPoint[] = [[6 * z, 6 * z], [10 * z, 6 * z], [10 * z, 9 * z], [6 * z, 9 * z]];
  const haus: TacticalPoint[] = [[1 * z, 7 * z], [2 * z, 7 * z], [2 * z, 8 * z], [1 * z, 8 * z]];
  const role = (regionId: string, extra: object) => ({ regionId, authored: false, locked: false, provenance: null, ...extra });
  const document: TacticalMapDocumentV1 = { schemaVersion: 1, kind: "tactical-map", coordinates: "image-pixels", frame: { ursprung: [0, 0], einheitenProPixel: 1 / z, ordnung: "xy", hoch: "unten" },
    geometry: { v: 3, size: [12 * z, 12 * z], stamps: [], places: [], regions: [{ id: "grund", punkte: [[0, 0], [12 * z, 0], [12 * z, 12 * z], [0, 12 * z]] }, { id: "turm", punkte: turm }, { id: "platz", punkte: platz }, { id: "haus", punkte: haus }] },
    grid: { kind: "square", size: z, origin: [0, 0] }, elevation: 0, geometryElevation: [],
    walls: [{ id: "mauer", kind: "wall", elevation: 0, points: [[1 * z, 4 * z], [3.6 * z, 4 * z]] }], portals: [], lights: [], environment: { bakedLighting: false, ambientLightArgb: "ffffffff" }, background: null };
  const cartography = { schemaVersion: 1, kind: "tactical-cartography", construction: { cellSize: z, origin: [0, 0] }, regions: [
    role("grund", { role: "terrain", material: "grass" }), role("turm", { role: "building" }), role("platz", { role: "road", material: "square" }), role("haus", { role: "building" }),
  ] } as unknown as TacticalCartographyV1;

  it("trägt die neue Fassung", () => expect(rendererVersion).toBe("cartography-13"));
  it("zeichnet einen Rundturm als Stein ohne Firstband und nach der Mauer", () => {
    const d = cartographyDraw(document, cartography, "fantasy");
    const letzteMauer = Math.max(...d.polygons.map((p, i) => p.regionId === "mauer" ? i : -1));
    // Der Schatten liegt wie bei jedem Dach unter allem; der Turm selbst kommt nach der Mauer.
    const turmTeile = d.polygons.map((p, i) => ({ p, i })).filter(({ p, i }) => p.regionId === "turm" && i > letzteMauer);
    expect(turmTeile.length).toBeGreaterThanOrEqual(3);
    expect(d.polygons.some((p, i) => p.regionId === "turm" && i < letzteMauer && p.fill !== 0x26332b)).toBe(false);
    expect(turmTeile.some(({ p }) => p.fill === 0xaaa08a)).toBe(true);
  });
  it("macht die Mauer einer Fantasy-Stadt breiter als eine Federlinie", () => {
    const stein = cartographyDraw(document, cartography, "fantasy").polygons.find(p => p.regionId === "mauer" && p.fill === 0xaaa08a)!;
    const ys = stein.points.map(p => p[1]);
    expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThanOrEqual(z * .18);
  });
  it("pflastert große Plätze und stellt Marktstände darauf, nur in Fantasy", () => {
    const fantasy = cartographyDraw(document, cartography, "fantasy").polygons.filter(p => p.regionId === "platz");
    const modern = cartographyDraw(document, cartography, "gegenwart").polygons.filter(p => p.regionId === "platz");
    expect(fantasy.some(p => p.fill === 0xe8d9b0)).toBe(true);
    expect(modern.some(p => p.fill === 0xe8d9b0)).toBe(false);
  });
});

describe("cartography-13: Dächer, Straßen, Felder und Zäune der heutigen Stadt und der Kolonie", () => {
  const z = 64, rect = (x: number, y: number, w: number, h: number): TacticalPoint[] => [[x * z, y * z], [(x + w) * z, y * z], [(x + w) * z, (y + h) * z], [x * z, (y + h) * z]];
  const kreis = (cx: number, cy: number, r: number, n: number): TacticalPoint[] => Array.from({ length: n }, (_, k) => [(cx + Math.cos(k / n * Math.PI * 2) * r) * z, (cy + Math.sin(k / n * Math.PI * 2) * r) * z]);
  const role = (regionId: string, extra: object) => ({ regionId, authored: false, locked: false, provenance: null, ...extra });
  type Teil = readonly [string, TacticalPoint[], object];
  const zeichne = (setting: "fantasy" | "gegenwart" | "scifi", teile: readonly Teil[], mauer = false) => {
    const regions = [{ id: "grund", punkte: rect(0, 0, 14, 14) }, ...teile.map(([id, punkte]) => ({ id, punkte }))];
    const document: TacticalMapDocumentV1 = { schemaVersion: 1, kind: "tactical-map", coordinates: "image-pixels", frame: { ursprung: [0, 0], einheitenProPixel: 1 / z, ordnung: "xy", hoch: "unten" },
      geometry: { v: 3, size: [14 * z, 14 * z], stamps: [], places: [], regions }, grid: { kind: "square", size: z, origin: [0, 0] }, elevation: 0, geometryElevation: [],
      walls: mauer ? [{ id: "zaun", kind: "wall", elevation: 0, points: [[1 * z, 12 * z], [9 * z, 12 * z]] }] : [], portals: [], lights: [], environment: { bakedLighting: false, ambientLightArgb: "ffffffff" }, background: null };
    const cartography = { schemaVersion: 1, kind: "tactical-cartography", construction: { cellSize: z, origin: [0, 0] },
      regions: [role("grund", { role: "terrain", material: "grass" }), ...teile.map(([id, , extra]) => role(id, extra))] } as unknown as TacticalCartographyV1;
    return cartographyDraw(document, cartography, setting, { paper: false });
  };
  const von = (d: ReturnType<typeof zeichne>, id: string) => d.polygons.filter(p => p.regionId === id);
  const haus = rect(2, 2, 4, 2.5);

  it("zeichnet ein Sheddach mit mehr Streifen als ein Flachdach", () => {
    const flach = von(zeichne("gegenwart", [["h", haus, { role: "building", dach: "flach" }]]), "h");
    const halle = von(zeichne("gegenwart", [["h", haus, { role: "building", dach: "halle" }]]), "h");
    expect(halle.length).toBeGreaterThan(flach.length + 3);
  });
  it("setzt ohne Dachform die Vorgabe des Settings: Giebel in Fantasy, Flachdach sonst", () => {
    const zug = (d: ReturnType<typeof zeichne>) => JSON.stringify(von(d, "h"));
    expect(zug(zeichne("fantasy", [["h", haus, { role: "building" }]]))).toBe(zug(zeichne("fantasy", [["h", haus, { role: "building", dach: "giebel" }]])));
    expect(zug(zeichne("gegenwart", [["h", haus, { role: "building" }]]))).toBe(zug(zeichne("gegenwart", [["h", haus, { role: "building", dach: "flach" }]])));
  });
  it("gibt einer Kuppel in der Kolonie einen leuchtenden Rand und einem Landefeld Markierung und Lichter", () => {
    const d = zeichne("scifi", [["k", kreis(4, 4, 1.5, 12), { role: "building", dach: "kuppel" }], ["p", kreis(9, 9, 2.5, 16), { role: "building", dach: "plattform" }]]);
    expect(von(d, "k").some(p => p.fill === 0x5fe0e6)).toBe(true);
    expect(von(d, "p").some(p => p.fill === 0xe0b040)).toBe(true);
    expect(von(d, "p").filter(p => p.fill === 0x7ff0ff).length).toBeGreaterThanOrEqual(4);
  });
  it("strichelt die Mittellinie heutiger Hauptstraßen und lässt Kolonie-Straßen an den Rändern leuchten", () => {
    const strasse = rect(0, 6, 14, 1.4);
    expect(von(zeichne("gegenwart", [["s", strasse, { role: "road", material: "street" }]]), "s").filter(p => p.fill === 0xf2f2ea).length).toBeGreaterThanOrEqual(6);
    expect(von(zeichne("scifi", [["s", strasse, { role: "road", material: "street" }]]), "s").filter(p => p.fill === 0x5fe0e6).length).toBeGreaterThanOrEqual(2);
    expect(von(zeichne("fantasy", [["s", strasse, { role: "road", material: "street" }]]), "s").some(p => p.fill === 0xf2f2ea || p.fill === 0x5fe0e6)).toBe(false);
  });
  it("macht Felder der Kolonie zu Solar- und Hydrokulturflächen", () => {
    const d = zeichne("scifi", Array.from({ length: 6 }, (_, i): Teil => [`f${i}`, rect(1 + i * 2, 9, 1.8, 3), { role: "terrain", material: "field" }]));
    const farben = new Set(d.polygons.filter(p => p.regionId.startsWith("f")).map(p => p.fill));
    expect(farben.has(0x2c4a66) || farben.has(0x5f9a6a)).toBe(true);
  });
  it("zeichnet den Zaun der Kolonie leuchtend statt aus Stein", () => {
    // Mauern malt die Kartenoptik nur auf Ortskarten (mit Gebäuden): ein Haus gehört dazu.
    const zaun = von(zeichne("scifi", [["h", haus, { role: "building" }]], true), "zaun");
    expect(zaun.some(p => p.fill === 0x5fe0e6)).toBe(true);
    expect(zaun.some(p => p.fill === 0x8ea5aa || p.fill === 0xaaa08a)).toBe(false);
  });
});

describe("cartography-13: das Ortssymbol spricht sein Setting", () => {
  const rect = (x: number, y: number, w: number, h: number): TacticalPoint[] => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
  const base = { authored: false, locked: false, provenance: null } as const;
  const ort = (setting: "fantasy" | "gegenwart" | "scifi") => {
    const { document, cartography } = fixture();
    const regions = [{ id: "ground", punkte: rect(0, 0, 600, 600) }, { id: "ort", punkte: rect(150, 150, 300, 260) }];
    const roles = [{ ...base, regionId: "ground", role: "terrain", material: "grass" }, { ...base, regionId: "ort", role: "ort", groesse: "stadt", standort: "huegel" }] as const;
    return cartographyDraw({ ...document, geometry: { ...document.geometry, regions } }, { ...cartography, construction: { cellSize: 60, origin: [0, 0] }, regions: [...roles] }, setting, { paper: false }).polygons.filter(p => p.regionId === "ort");
  };
  it("zeigt Kirche und Steinmauer nur in Fantasy", () => {
    for (const setting of ["gegenwart", "scifi"] as const) {
      const p = ort(setting);
      expect(p.some(x => x.fill === 0x683e32), setting).toBe(false);
      expect(p.some(x => x.fill === 0xaaa08a || x.fill === 0x8ea5aa), setting).toBe(false);
    }
    expect(ort("fantasy").some(x => x.fill === 0xaaa08a)).toBe(true);
  });
  it("umgibt eine Kolonie mit leuchtendem Zaun und gibt ihr ein Landefeld", () => {
    const p = ort("scifi");
    expect(p.some(x => x.fill === 0x5fe0e6)).toBe(true);
    expect(p.some(x => x.fill === 0xe0b040)).toBe(true);
  });
  it("gibt einer heutigen Stadt dunkle Hochhäuser in der Mitte", () => {
    expect(ort("gegenwart").filter(x => x.fill === 0x4d5a5c).length).toBeGreaterThanOrEqual(3);
  });
});
