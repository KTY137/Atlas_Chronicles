// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { describe, expect, it } from "vitest";
import { parseMapFloorStack, floorRoomAnchor, floorPointInside, validateFloorMaps, emptyRoomFog, parseRoomFog, applyRoomFog, visibleFogRegions,
  type MapFloorStack, type TacticalMapDocumentV1 } from "../src/index.ts";
const room = [[0,0],[20,0],[20,20],[0,20]] as const;
const doc = (): TacticalMapDocumentV1 => ({ schemaVersion:1,kind:"tactical-map",coordinates:"image-pixels",frame:{ursprung:[0,0],einheitenProPixel:1,ordnung:"xy",hoch:"unten"},
  geometry:{v:3,size:[40,40],regions:[{id:"room",punkte:room}],stamps:[],places:[]},grid:{kind:"square",size:8,origin:[0,0]},elevation:0,geometryElevation:[],walls:[],portals:[],lights:[],environment:{bakedLighting:false,ambientLightArgb:"ffffffff"},background:null });
const stack=():MapFloorStack=>({schemaVersion:1,rootMapId:"ground",floors:[{mapId:"ground",level:0,name:"Ground"},{mapId:"upper",level:1,name:"Upper"}],links:[{id:"stairs",name:"Stairs",kind:"stairs",fromMapId:"ground",toMapId:"upper",fromRegionId:"room",toRegionId:"room",position:[10,10]}]});
describe("floor stack contract and common coordinate frames",()=>{
  it("round trips and sorts floors without confusing height with floor identity",()=>{const v=stack();expect(parseMapFloorStack(JSON.stringify(v))).toEqual(v);expect(doc().elevation).toBe(0);});
  it.each([
    {schemaVersion:2},{invented:true},{rootMapId:"upper"},{floors:[]},
    {floors:[{mapId:"ground",level:0,name:"A"},{mapId:"upper",level:0,name:"B"}]},
    {floors:[{mapId:"ground",level:0,name:"A"},{mapId:"ground",level:1,name:"B"}]},
    {floors:[{mapId:"ground",level:0,name:"A"},{mapId:"upper",level:33,name:"B"}]},
    {links:[{...stack().links[0],toMapId:"missing"}]},{links:[{...stack().links[0],position:[0,Infinity]}]},
    {links:[stack().links[0],stack().links[0]]},
  ])("rejects malformed or contradictory stacks %j",patch=>expect(()=>parseMapFloorStack({...stack(),...patch})).toThrow());
  it("requires adjacent stairs/openings but permits a multi-floor lift",()=>{
    const v={...stack(),floors:[stack().floors[0]!,{...stack().floors[1]!,level:3}]};
    expect(()=>parseMapFloorStack(v)).toThrow();expect(parseMapFloorStack({...v,links:[{...v.links[0],kind:"lift"}]}).links[0]!.kind).toBe("lift");
  });
  it("checks both landings and rejects a changed frame, deleted room or landing on the wall",()=>{
    const v=stack(),maps=new Map([["ground",doc()],["upper",doc()]]);expect(()=>validateFloorMaps(v,maps)).not.toThrow();
    expect(()=>validateFloorMaps(v,new Map([...maps,["upper",{...doc(),grid:{kind:"none"}}]]))).toThrow();
    expect(()=>validateFloorMaps(v,new Map([...maps,["upper",{...doc(),geometry:{...doc().geometry,regions:[]}}]]))).toThrow();
    expect(()=>validateFloorMaps({...v,links:[{...v.links[0]!,position:[20,10]}]},maps)).toThrow();
  });
  it("finds an interior point even when the bounding-box centre is outside a concave room",()=>{
    const c=[[0,0],[20,0],[20,4],[4,4],[4,16],[20,16],[20,20],[0,20]] as const;
    expect(floorPointInside([10,10],c)).toBe(false);expect(floorPointInside(floorRoomAnchor(c),c)).toBe(true);expect(floorPointInside([0,0],c)).toBe(false);
  });
});
describe("revision-bound manual room exploration",()=>{
  const rooms=new Set(["a","b","c"]),change=(action:"reveal"|"hide",audience:string|null,regionIds=["a"])=>({action,audience,regionIds});
  it("keeps existing Chronicle knowledge when manual mode has not been enabled",()=>{expect([...visibleFogRegions(null,"p",rooms,new Set(["a","foreign"]))]).toEqual(["a"]);});
  it("starts enabled mode completely hidden even if the actor knows all Chronicle anchors",()=>{const s=applyRoomFog(emptyRoomFog(),{action:"enable",audience:null,regionIds:[]},rooms);expect([...visibleFogRegions(s,"p",rooms,rooms)]).toEqual([]);});
  it("reveals and re-hides for a whole party without changing the source object",()=>{
    const s=emptyRoomFog(),revealed=applyRoomFog(s,change("reveal",null),rooms);expect(s.party).toEqual([]);
    expect([...visibleFogRegions(revealed,"p",rooms,new Set())]).toEqual(["a"]);
    expect([...visibleFogRegions(applyRoomFog(revealed,change("hide",null),rooms),"p",rooms,new Set())]).toEqual([]);
  });
  it("personal grants remain private and personal hiding overrides a party reveal",()=>{
    let s=applyRoomFog(emptyRoomFog(),change("reveal",null),rooms);s=applyRoomFog(s,change("reveal","p",["b"]),rooms);s=applyRoomFog(s,change("hide","p"),rooms);
    expect([...visibleFogRegions(s,"p",rooms,new Set())]).toEqual(["b"]);expect([...visibleFogRegions(s,"other",rooms,new Set())]).toEqual(["a"]);
  });
  it("party changes clear competing personal overrides for the selected rooms",()=>{
    let s=applyRoomFog(emptyRoomFog(),change("reveal","p"),rooms);s=applyRoomFog(s,change("hide",null),rooms);
    expect(s.actors).toEqual([]);expect([...visibleFogRegions(s,"p",rooms,rooms)]).toEqual([]);
  });
  it("enforces accumulated party limits, not just the size of each reveal request",()=>{
    const many=new Set(Array.from({length:4097},(_,i)=>`room-${i}`));
    const s=applyRoomFog(emptyRoomFog(),change("reveal",null,[...many].slice(0,4096)),many);
    expect(()=>applyRoomFog(s,change("reveal",null,[[...many][4096]!]),many)).toThrow();
    expect(s.party).toHaveLength(4096);
  });
  it("knowledge mode is an explicit return to Chronicle permissions, not reveal-all",()=>{
    let s=applyRoomFog(emptyRoomFog(),change("reveal",null,["a","b"]),rooms);
    s=applyRoomFog(s,{action:"knowledge",audience:null,regionIds:[]},rooms);
    expect([...visibleFogRegions(s,"p",rooms,new Set(["c"]))]).toEqual(["c"]);
  });
  it.each([change("reveal",null,[]),change("hide",null,["absent"]),change("reveal",null,["a","a"]),{action:"enable",audience:"p",regionIds:[]}])("rejects invalid reveal instructions %j",c=>{expect(()=>applyRoomFog(emptyRoomFog(),c as never,rooms)).toThrow();});
  it.each([{...emptyRoomFog(),extra:true},{...emptyRoomFog(),schemaVersion:2},{...emptyRoomFog(),party:["a","a"]},{...emptyRoomFog(),actors:[{actorId:"p",revealed:["a"],hidden:["a"]}]}])("rejects forged state %j",c=>expect(()=>parseRoomFog(c)).toThrow());
});
