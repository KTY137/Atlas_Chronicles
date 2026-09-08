// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { cartographyDraw, rendererVersion, type CartographyDrawing } from "../../szene/src/cartography-projection.ts";
import type { TacticalCartographyV1, TacticalMapDocumentV1 } from "@chronicle/szene";
import { createTacticalRasterService } from "../src/domain/tactical-raster.ts";

const rect = (x: number, y: number, w: number, h: number) => [[x,y],[x+w,y],[x+w,y+h],[x,y+h]] as const;
const drawing = (width = 8, height = 8): CartographyDrawing => ({ rendererVersion, width, height, background: 0x224466,
  polygons: [{ regionId: "house", points: rect(0,0,width,height), fill: 0xff0000, opacity: 1 }] });
const tile = (d: CartographyDrawing) => ({ image: null, documentSize: [d.width,d.height] as const, drawing: d, regions: null, level: 0, x: 0, y: 0 });
const pixels = async (bytes: Buffer) => sharp(bytes).ensureAlpha().raw().toBuffer();
const at = (bytes: Buffer, width: number, x: number, y: number) => [...bytes.subarray((y*width+x)*4,(y*width+x)*4+4)];

describe("cartography raster shares the authoritative visibility boundary", () => {
  it("keeps a joined river open: a construction seam cannot become a bank across its channel", async () => {
    const source: TacticalMapDocumentV1 = { schemaVersion: 1, kind: "tactical-map", coordinates: "image-pixels",
      frame: { ursprung: [0,0], einheitenProPixel: 1, ordnung: "xy", hoch: "unten" },
      geometry: { v: 3, size: [128,128], stamps: [], places: [], regions: [{ id: "river", punkte: rect(40,0,48,128) }] },
      grid: { kind: "square", size: 64, origin: [0,0] }, elevation: 0, geometryElevation: [], walls: [], portals: [], lights: [],
      environment: { bakedLighting: false, ambientLightArgb: "ffffffff" }, background: null };
    const role = { role: "water", material: "river", authored: false, locked: false, provenance: null } as const;
    const semantic: TacticalCartographyV1 = { schemaVersion: 1, kind: "tactical-cartography", construction: { cellSize: 64, origin: [0,0] }, regions: [{ regionId: "river", ...role }] };
    const split = { ...source, geometry: { ...source.geometry, regions: [{ id: "north", punkte: rect(40,0,48,64) }, { id: "south", punkte: [[40,64],[64,64],[88,64],[88,128],[40,128]] as const }] } };
    const splitRoles = { ...semantic, regions: [{ regionId: "north", ...role }, { regionId: "south", ...role }] };
    const service = createTacticalRasterService();
    const whole = await pixels((await service.renderTacticalTile(tile(cartographyDraw(source, semantic)))).bytes);
    const joined = await pixels((await service.renderTacticalTile(tile(cartographyDraw(split, splitRoles)))).bytes);
    for (const y of [62,63,64,65]) for (let x = 48; x < 80; x++) expect(at(joined,128,x,y)).toEqual(at(whole,128,x,y));
    // Real banks remain legible on both sides, and still respect the final knowledge mask.
    expect(at(joined,128,40,64)).not.toEqual(at(joined,128,60,64));
    const hidden = await pixels((await service.renderTacticalTile({ ...tile(cartographyDraw(split, splitRoles)), regions: [rect(0,0,64,128)] })).bytes);
    expect(at(hidden,128,86,64)).toEqual([0,0,0,0]);
  });
  it("draws vector-only maps and masks geometry by pixels, not by a visible centroid", async () => {
    const service = createTacticalRasterService();
    const result = await service.renderTacticalTile({ ...tile(drawing()), regions: [rect(0,0,3,8)] });
    const raw = await pixels(result.bytes);
    expect(at(raw,8,2,4)).toEqual([255,0,0,255]);
    expect(at(raw,8,3,4)).toEqual([0,0,0,0]);
    expect(at(raw,8,7,4)).toEqual([0,0,0,0]);
  });
  it("requires the complete coarse pixel footprint, unions adjacent known areas, and handles odd edges", async () => {
    const service = createTacticalRasterService();
    const base = { ...tile(drawing(5,3)), tileSize: 2, level: 1 };
    const result = await service.renderTacticalTile({ ...base, regions: [rect(0,0,1,3),rect(1,0,2,3),rect(4,0,1,3)] });
    const raw = await pixels(result.bytes);
    expect(at(raw,2,0,0)).toEqual([255,0,0,255]);
    expect(at(raw,2,1,0)).toEqual([0,0,0,0]);
    const edge = await service.renderTacticalTile({ ...base, x: 1, regions: [rect(4,0,1,3)] });
    expect(at(await pixels(edge.bytes),1,0,1)).toEqual([255,0,0,255]);
  });
  it("hidden geometry and previous revisions cannot alter visible bytes", async () => {
    const service = createTacticalRasterService();
    const a = { ...drawing(), polygons: [{ regionId:"visible", points:rect(0,0,4,8),fill:0x123456,opacity:1 }, {regionId:"secret",points:rect(4,0,4,8),fill:0xff0000,opacity:1}] };
    const b = { ...a, polygons: [a.polygons[0]!, {...a.polygons[1]!, fill:0x00ff00}] };
    const known = [rect(0,0,3,8)];
    const one = await service.renderTacticalTile({...tile(a),regions:known});
    expect(at(await pixels(one.bytes),8,1,1)).toEqual([0x12,0x34,0x56,255]);
    const two = await service.renderTacticalTile({...tile(b),regions:known});
    expect(one.bytes.equals(two.bytes)).toBe(true);
    const revoked = await service.renderTacticalTile({...tile(a),regions:[]});
    expect((await pixels(revoked.bytes)).every(value=>value===0)).toBe(true);
  });
  it("uses concave and half-pixel visibility precisely, even when a polygon covers the image center", async()=>{
    const service=createTacticalRasterService();
    const mask=[[[.5,0],[4.5,0],[4.5,2],[2.5,2],[2.5,6],[.5,6]] as const];
    const result=await service.renderTacticalTile({...tile(drawing(6,6)),regions:mask}),raw=await pixels(result.bytes);
    expect(at(raw,6,0,4)).toEqual([255,0,0,255]);
    expect(at(raw,6,2,4)).toEqual([0,0,0,0]);
    expect(at(raw,6,4,0)).toEqual([0,0,0,0]);
  });
  it("blends the same ordered primitives over an admitted image and bakes identical full-resolution export",async()=>{
    const service=createTacticalRasterService();
    const image=await sharp({create:{width:8,height:8,channels:4,background:{r:0,g:0,b:200,alpha:1}}}).png().toBuffer();
    const d={...drawing(),background:null,polygons:[{regionId:"house",points:rect(0,0,8,8),fill:0xc80000,opacity:.5}]};
    const result=await service.renderTacticalTile({...tile(d),image}),raw=await pixels(result.bytes);
    expect(at(raw,8,1,1)).toEqual([100,0,100,255]);
    const exported=await service.renderCartographyImage({drawing:d,image,documentSize:[8,8]});
    expect(exported.bytes.equals(result.bytes)).toBe(true);
    const changed={...d,polygons:[{...d.polygons[0]!,fill:0x00c800}]};
    const next=await service.renderTacticalTile({...tile(changed),image});
    expect(at(await pixels(next.bytes),8,1,1)).toEqual([0,100,100,255]);
    expect(service.stats().cacheHits).toBe(1);
    const noImage=await service.renderCartographyImage({drawing:d,image:null,documentSize:[8,8]});
    expect(at(await pixels(noImage.bytes),8,1,1)).toEqual([200,0,0,128]);
    expect((await sharp(exported.bytes).metadata()).exif).toBeUndefined();
  });
  it("bounds full exports before allocation, rejects nonnumeric drawing inputs, and snapshots queued primitives",async()=>{
    const service=createTacticalRasterService({maxConcurrent:1,maxQueue:1});
    await expect(service.renderCartographyImage({image:null,drawing:drawing(12000,12000),documentSize:[12000,12000]})).rejects.toMatchObject({code:"invalid",message:"server raster pixel limit is 16,000,000"});
    for(const bad of [{...drawing(),background:"<svg/>"},{...drawing(),width:9},{...drawing(),polygons:[{...drawing().polygons[0],fill:NaN}]},{...drawing(),polygons:[{...drawing().polygons[0],opacity:2}]}]) {
      await expect(service.renderTacticalTile({...tile(drawing()),drawing:bad as CartographyDrawing})).rejects.toMatchObject({code:"invalid"});
    }
    const mutable=structuredClone(drawing(256,256));
    const first=service.renderTacticalTile(tile(drawing(256,256)));
    const second=service.renderTacticalTile(tile(mutable));
    (mutable.polygons[0] as {fill:number}).fill=0x00ff00;
    await expect(service.renderTacticalTile(tile(drawing()))).rejects.toMatchObject({code:"busy"});
    await first;
    expect(at(await pixels((await second).bytes),256,4,4)).toEqual([255,0,0,255]);
    expect(service.stats()).toMatchObject({active:0,queued:0});
  });
  it("renders 144M vector documents with only tile-sized allocations and respects far tile offsets", async () => {
    const d = { ...drawing(12000,12000), polygons:[{regionId:"far",points:rect(11776,11776,224,224),fill:0x00ff00,opacity:1}] };
    const service = createTacticalRasterService();
    const result = await service.renderTacticalTile({...tile(d),x:46,y:46,regions:[rect(11776,11776,224,224)]});
    expect([result.width,result.height]).toEqual([224,224]);
    expect(at(await pixels(result.bytes),224,100,100)).toEqual([0,255,0,255]);
    expect(service.stats().cacheBytes).toBe(0);
  });
});
