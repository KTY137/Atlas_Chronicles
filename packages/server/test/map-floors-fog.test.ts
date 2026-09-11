// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import sharp from "sharp";
import { inspectUvttImage } from "@chronicle/forge";
import { floorPointInside, type TacticalMapDocumentV1 } from "@chronicle/szene";
import { parseCurrentCampaignBundle, serializeCurrentCampaignBundle, currentCampaignSemanticDiff, createCampaignBundleV20, currentCampaignTables } from "@chronicle/io";
import { buildApp } from "../src/app.ts";
import { createTestDb, migrate, type Db } from "../src/db/index.ts";
import { createIdentity } from "../src/identity/index.ts";
import { createCampaigns } from "../src/domain/campaigns.ts";
import { createGrundriss } from "../src/domain/grundriss.ts";
import { Conflict } from "../src/domain/errors.ts";
import { createMapStudio } from "../src/domain/map-studio.ts";
import { createTactical, tacticalHash } from "../src/domain/tactical.ts";
import { createMapLifecycle } from "../src/domain/map-lifecycle.ts";
import { createBetreten } from "../src/domain/betreten.ts";
import { createGameplay } from "../src/domain/gameplay.ts";
import { createDocuments } from "../src/domain/documents.ts";
import { exportCampaignBundle, initializeCampaignRestoreTarget, restoreCampaignBundle } from "../src/domain/bundles.ts";

const cmd=()=>({commandId:randomUUID()});
const provenance={name:"Rooms",creator:"Fixture",sourceUrl:null,license:"CC0-1.0",licenseUrl:null,retrievedAt:null,generator:null,generatorVersion:null};
const drawing=():TacticalMapDocumentV1=>({schemaVersion:1,kind:"tactical-map",coordinates:"image-pixels",frame:{ursprung:[0,0],einheitenProPixel:1,ordnung:"xy",hoch:"unten"},
  geometry:{v:3,size:[64,64],stamps:[],places:[{id:"lore",x:48,y:12}],regions:[{id:"left",punkte:[[0,0],[30,0],[30,64],[0,64]]},{id:"right",punkte:[[34,0],[64,0],[64,64],[34,64]]}]},
  grid:{kind:"square",size:8,origin:[0,0]},elevation:0,geometryElevation:[],walls:[],portals:[],lights:[],environment:{bakedLighting:false,ambientLightArgb:"ffffffff"},background:null});

describe("floors and manual fog through real HTTP, persistence and player projections",()=>{
  let db:Db,app:FastifyInstance,gm:string,campaign:string,cookie:string,player:string,actorId:string,otherPlayer:string,otherActor:string,playerCookie:string;
  const cfg={now:Date.now,origin:"https://floor.test",cookieSecret:"floor-test-secret-longer-than-thirty-two-characters",bootstrapToken:"floor-bootstrap-secret-longer-than-thirty-two"};
  beforeAll(async()=>{
    db=await createTestDb();await migrate(db);const identity=createIdentity(db,cfg),campaigns=createCampaigns(db);
    gm=(await identity.bootstrap("Floor GM")).userId;
    cookie=`chronicle_session=${(await identity.issueSession(gm)).value}`;
    app=await buildApp(db,cfg);
  },30000);
  beforeEach(async()=>{
    const identity=createIdentity(db,cfg),campaigns=createCampaigns(db);
    campaign=(await campaigns.createCampaign(gm,{name:"Floor campaign"})).id;
    for(const name of ["Sera","Tarin"]){const invite=await campaigns.issueInvitation(gm,campaign),request=await campaigns.requestJoin(invite.code,{displayName:name}),approved=await campaigns.approveJoin(gm,campaign,request.id);
      if(name==="Sera"){player=approved.userId;actorId=approved.actorId;playerCookie=`chronicle_session=${(await identity.issueSession(player)).value}`;}else{otherPlayer=approved.userId;otherActor=approved.actorId;}}
  },30000);
  afterAll(async()=>{await app?.close();await db?.close();});
  const post=(mapId:string,suffix:string,payload:object,session=cookie)=>app.inject({method:"POST",url:`/api/campaigns/${campaign}/tactical/maps/${mapId}/${suffix}`,headers:{cookie:session,origin:cfg.origin},payload});
  const get=(mapId:string,suffix:string,session=cookie)=>app.inject({url:`/api/campaigns/${campaign}/tactical/maps/${mapId}/${suffix}`,headers:{cookie:session}});
  const studio=()=>createMapStudio(db,cfg),tactical=()=>createTactical(db,cfg);
  async function blueprint(){const result=await createGrundriss(db,cfg).generate(gm,campaign,{...cmd(),art:"grundriss",stil:"gemalt",name:"Haus",keim:"floor-blueprint",optionen:{profil:"haus",zellen:[24,20]}});
    return tactical().getMap(gm,campaign,result.ack.subjectId);}
  const add=(map:Awaited<ReturnType<typeof blueprint>>,expectedVersion=0,level=1)=>({...cmd(),expectedVersion,expectedMapVersion:map.version,name:level<0?"Keller":"Obergeschoss",level,fromRegionId:map.cartography!.regions.find(r=>r.role==="room")!.regionId,linkKind:"stairs",copyContents:false});
  async function fogFixture(){
    const docs=createDocuments(db),entry=await docs.saveEntry(gm,campaign,{title:`Private lore ${randomUUID()}`,passages:[{inhalt:{kind:"absatz",inhalt:[{text:"Known left",marks:[]}]}},{inhalt:{kind:"absatz",inhalt:[{text:"SECRET-RIGHT-TEXT",marks:[]}]}}]});
    await docs.revealPassage(gm,campaign,entry.passagen[0]!.pid,actorId);
    const image=await sharp({create:{width:64,height:64,channels:4,background:"#dd6e32"}}).png().toBuffer(),b64=image.toString("base64"),ref=inspectUvttImage(b64);
    const doc={...drawing(),background:{sha256:ref.sha256,mimeType:ref.mimeType,width:ref.width,height:ref.height}};
    const anchors=[{targetKind:"region",targetId:"left",entryId:entry.entryId,passageId:entry.passagen[0]!.pid},{targetKind:"place",targetId:"lore",entryId:entry.entryId,passageId:entry.passagen[1]!.pid}];
    const mapId=(await tactical().importMap(gm,campaign,{...cmd(),name:"SECRET-MAP-NAME",format:"native",sourceText:JSON.stringify(doc),provenance,imageBase64:b64,anchors})).subjectId;
    const scene=await createGameplay(db).createScene(gm,campaign,{name:"Floor scene",entryIds:[],fictionDate:"Day one"});
    await tactical().savePlan(gm,campaign,scene.id,{...cmd(),expectedVersion:0,mapId,mapRevision:1,tokens:[{id:randomUUID(),actorId,x:12,y:12,elevation:0,rotation:0,scale:1},{id:randomUUID(),actorId:otherActor,x:48,y:12,elevation:0,rotation:0,scale:1}]});
    const sessionId=String((await createGameplay(db).startScene(gm,campaign,scene.id)).id);
    return {mapId,sessionId,doc,anchors,entry};
  }
  async function fog(mapId:string,action:"enable"|"knowledge"|"reveal"|"hide",regionIds:string[]=[],audience:string|null=null,revision=1){const v=await studio().getFog(gm,campaign,mapId,revision);return studio().setFog(gm,campaign,mapId,{...cmd(),expectedVersion:v.version,mapRevision:revision,action,audience,regionIds});}

  it("creates a separately revisioned upper floor with aligned travel and no copied identity or reveals",async()=>{
    const map=await blueprint(),before=tacticalHash(map),input=add(map),res=await post(map.id,"floors",input);expect(res.statusCode,res.body).toBe(200);
    const ack=res.json(),copied=await tactical().getMap(gm,campaign,ack.mapId),stack=(await studio().getFloors(gm,campaign,ack.mapId)).stack;
    expect(stack.floors.map(f=>f.level)).toEqual([0,1]);expect(copied.revision).toBe(1);expect(copied.anchors).toEqual([]);
    expect(copied.document.geometry.stamps).toEqual([]);expect(copied.document.lights).toEqual([]);
    const oldIds=new Set(map.document.geometry.regions.map(r=>r.id));expect(copied.document.geometry.regions.every(r=>!oldIds.has(r.id))).toBe(true);
    const link=stack.links[0]!;expect(floorPointInside(link.position,map.document.geometry.regions.find(r=>r.id===link.fromRegionId)!.punkte)).toBe(true);
    expect(floorPointInside(link.position,copied.document.geometry.regions.find(r=>r.id===link.toRegionId)!.punkte)).toBe(true);
    expect(tacticalHash(await tactical().getMap(gm,campaign,map.id))).toBe(before);
    expect((await studio().getFog(gm,campaign,ack.mapId)).state).toEqual({schemaVersion:1,enabled:true,party:[],actors:[]});
    expect((await post(map.id,"floors",input)).json()).toEqual(ack);
    const ancestry=await createBetreten(db,cfg).children(gm,campaign,{parentKind:"tactical",parentMapId:ack.mapId});expect(ancestry.ancestors.map(a=>a.id)).toContain(map.id);
  },30000);
  it("creates a basement and permits a multi-level lift, not a non-adjacent staircase",async()=>{
    const map=await blueprint(),a=await studio().addFloor(gm,campaign,map.id,add(map,0,-1));expect((await studio().getFloors(gm,campaign,a.mapId)).stack.floors[0]!.level).toBe(-1);
    const before=(await tactical().listMaps(gm,campaign)).length;
    await expect(studio().addFloor(gm,campaign,map.id,add(map,1,3))).rejects.toThrow();expect(await tactical().listMaps(gm,campaign)).toHaveLength(before);
    const lift=await studio().addFloor(gm,campaign,map.id,{...add(map,1,3),linkKind:"lift",copyContents:true});
    const copied=await tactical().getMap(gm,campaign,lift.mapId);expect(copied.document.geometry.stamps.length).toBe(map.document.geometry.stamps.length);expect(copied.document.geometry.stamps.length).toBeGreaterThan(0);
    expect(new Set(copied.document.geometry.stamps.map(s=>s.id)).size).toBe(copied.document.geometry.stamps.length);
  },30000);
  it("rejects stale versions, duplicate levels and unknown HTTP fields without writes",async()=>{
    const map=await blueprint(),before=(await tactical().listMaps(gm,campaign)).length;
    for(const patch of [{expectedVersion:99},{expectedMapVersion:99}])expect((await post(map.id,"floors",{...add(map),...patch})).statusCode).toBe(409);
    expect((await post(map.id,"floors",{...add(map),extra:true})).statusCode).toBe(400);
    expect((await post(map.id,"floors",{...add(map),level:0})).statusCode).toBe(400);
    expect(await tactical().listMaps(gm,campaign)).toHaveLength(before);
  });
  it("preserves landing anchors when either floor is edited and allows independent non-geometric edits",async()=>{
    const map=await blueprint(),ack=await studio().addFloor(gm,campaign,map.id,add(map)),upper=await tactical().getMap(gm,campaign,ack.mapId),stack=(await studio().getFloors(gm,campaign,map.id)).stack;
    const roomId=stack.links[0]!.toRegionId,changed={...upper.document,geometry:{...upper.document.geometry,regions:upper.document.geometry.regions.map(r=>r.id===roomId?{...r,punkte:r.punkte.map(([x,y])=>[x+800,y+800])}:r)}};
    await expect(tactical().reviseMap(gm,campaign,upper.id,{...cmd(),expectedVersion:1,schemaVersion:3,document:changed,anchors:[],cartography:upper.cartography,addedBuildings:[],addedRooms:[]})).rejects.toThrow();
    expect((await tactical().getMap(gm,campaign,upper.id)).revision).toBe(1);
    await fog(upper.id,"reveal",[roomId]);
    await tactical().reviseMap(gm,campaign,upper.id,{...cmd(),expectedVersion:1,schemaVersion:3,document:{...upper.document,elevation:5},anchors:[],cartography:upper.cartography,addedBuildings:[],addedRooms:[]});
    expect((await tactical().getMap(gm,campaign,map.id)).document.elevation).toBe(map.document.elevation);
    expect((await studio().getFog(gm,campaign,upper.id,2)).state).toEqual({schemaVersion:1,enabled:true,party:[],actors:[]});
    expect((await studio().getFog(gm,campaign,upper.id,1)).state.party).toContain(roomId);
  });
  it("adds and removes validated links; detaching preserves the map and requires explicit deletion later",async()=>{
    const map=await blueprint(),ack=await studio().addFloor(gm,campaign,map.id,add(map)),view=await studio().getFloors(gm,campaign,map.id),l=view.stack.links[0]!;
    const extra={...cmd(),expectedVersion:1,name:"Lift",kind:"lift",toMapId:ack.mapId,fromRegionId:l.fromRegionId,toRegionId:l.toRegionId,position:l.position};
    await expect(studio().linkFloors(gm,campaign,map.id,{...extra,position:[0,0]})).rejects.toThrow();
    expect((await studio().linkFloors(gm,campaign,map.id,extra)).version).toBe(2);
    const added=(await studio().getFloors(gm,campaign,map.id)).stack.links.find(x=>x.id!==l.id)!;
    expect((await studio().unlinkFloors(gm,campaign,map.id,{...cmd(),expectedVersion:2,linkId:added.id})).version).toBe(3);
    expect((await studio().renameFloor(gm,campaign,ack.mapId,{...cmd(),expectedVersion:3,name:"Dachgeschoss"})).version).toBe(4);
    await expect(createMapLifecycle(db).preview(gm,campaign,{kind:"tactical",id:ack.mapId})).rejects.toThrow();
    await studio().detachFloor(gm,campaign,ack.mapId,{...cmd(),expectedVersion:4});
    expect((await studio().getFloors(gm,campaign,ack.mapId)).version).toBe(0);
    expect((await studio().getFloors(gm,campaign,map.id)).stack.links).toEqual([]);
    expect((await tactical().getMap(gm,campaign,ack.mapId)).id).toBe(ack.mapId);
  });
  it("denies every floor and fog endpoint to players and rejects wrong campaigns",async()=>{
    const map=await blueprint();for(const endpoint of ["floors","fog"]){expect((await get(map.id,endpoint,playerCookie)).statusCode).toBe(404);expect((await get(map.id,endpoint,"")).statusCode).not.toBe(200);}
    for(const [endpoint,input] of [["floors",add(map)],["floors/links",{...cmd(),expectedVersion:1,name:"x",kind:"stairs",toMapId:map.id,fromRegionId:"x",toRegionId:"x",position:[0,0]}],["floors/name",{...cmd(),expectedVersion:1,name:"x"}],["floors/unlink",{...cmd(),expectedVersion:1,linkId:"x"}],["floors/detach",{...cmd(),expectedVersion:1}],["fog",{...cmd(),expectedVersion:0,mapRevision:1,action:"enable",audience:null,regionIds:[]}] ] as const)
      expect((await post(map.id,endpoint,input,playerCookie)).statusCode).toBe(404);
    const different=(await createCampaigns(db).createCampaign(gm,{name:"Different"})).id;
    await expect(studio().getFloors(gm,different,map.id)).rejects.toThrow();await expect(studio().getFog(gm,different,map.id)).rejects.toThrow();
  });
  it("switches from Chronicle knowledge to explicit room reveals without disclosing linked lore or GM state",async()=>{
    const f=await fogFixture();expect((await tactical().getSession(player,campaign,f.sessionId)).regions.map(r=>r.id)).toEqual(["left"]);
    await fog(f.mapId,"enable");expect((await tactical().getSession(player,campaign,f.sessionId)).regions).toEqual([]);
    await fog(f.mapId,"reveal",["right"]);
    const view=await tactical().getSession(player,campaign,f.sessionId);expect(view.regions.map(r=>r.id)).toEqual(["right"]);expect(view.tokens).toHaveLength(1);expect(view.entities).toEqual([]);
    const payload=JSON.stringify(view);for(const secret of ["SECRET-RIGHT-TEXT","SECRET-MAP-NAME","sourceId","document","cartography","mapId","party","actors"])expect(payload).not.toContain(secret);
    await fog(f.mapId,"hide",["right"]);expect((await tactical().getSession(player,campaign,f.sessionId)).regions).toEqual([]);
    expect((await tactical().getSession(gm,campaign,f.sessionId)).regions).toHaveLength(2);
    await fog(f.mapId,"knowledge");expect((await tactical().getSession(player,campaign,f.sessionId)).regions.map(r=>r.id)).toEqual(["left"]);
  });
  it("keeps personal reveals private and applies explicit party hides to all actors",async()=>{
    const f=await fogFixture();await fog(f.mapId,"reveal",["right"],actorId);
    expect((await tactical().getSession(player,campaign,f.sessionId)).regions.map(r=>r.id)).toEqual(["right"]);expect((await tactical().getSession(otherPlayer,campaign,f.sessionId)).regions).toEqual([]);
    const otherBefore=await tactical().getSession(otherPlayer,campaign,f.sessionId);
    await fog(f.mapId,"reveal",["left"],actorId);expect(await tactical().getSession(otherPlayer,campaign,f.sessionId)).toEqual(otherBefore);
    await fog(f.mapId,"hide",["right","left"]);expect((await tactical().getSession(player,campaign,f.sessionId)).regions).toEqual([]);
  });
  it("masks actual image pixels and invalidates a previously permitted raster URL after hiding",async()=>{
    const f=await fogFixture();await fog(f.mapId,"reveal",["left"]);
    const view=await tactical().getSession(player,campaign,f.sessionId),tile=await tactical().getTile(player,campaign,f.sessionId,0,0,0,view.rasterDigest);
    const image=await sharp(tile.bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true});const alpha=(x:number,y:number)=>image.data[(y*image.info.width+x)*4+3];
    expect(alpha(12,12)).toBe(255);expect(alpha(48,12)).toBe(0);
    await fog(f.mapId,"hide",["left"]);await expect(tactical().getTile(player,campaign,f.sessionId,0,0,0,view.rasterDigest)).rejects.toThrow();
    const hidden=await tactical().getTile(player,campaign,f.sessionId,0,0,0);const pixels=await sharp(hidden.bytes).ensureAlpha().raw().toBuffer();expect(pixels.filter((_,i)=>i%4===3).every(v=>v===0)).toBe(true);
  });
  it("rejects an in-flight tile when the GM hides its room before delivery",async()=>{
    const f=await fogFixture();await fog(f.mapId,"reveal",["left"]);
    let release!:()=>void;const barrier=new Promise<void>(resolve=>{release=resolve;});let projected=false;
    const observed:Db={...db,transaction:async work=>{const result=await db.transaction(work);
      if(result&&typeof result==="object"&&"request" in result&&"digest" in result){projected=true;await barrier;}
      return result;
    }};
    const tile=createTactical(observed,cfg).getTile(player,campaign,f.sessionId,0,0,0);void tile.catch(()=>{});
    try{await expect.poll(()=>projected).toBe(true);await fog(f.mapId,"hide",["left"]);}finally{release();}
    await expect(tile).rejects.toBeInstanceOf(Conflict);
    expect((await tactical().getSession(player,campaign,f.sessionId)).regions).toEqual([]);
  });
  it("cannot reveal another room/revision/actor with a forged or stale command",async()=>{
    const f=await fogFixture(),request={...cmd(),expectedVersion:0,mapRevision:1,action:"reveal",audience:null,regionIds:["left"]};
    expect((await post(f.mapId,"fog",{...request,regionIds:["missing"]})).statusCode).toBe(400);
    expect((await post(f.mapId,"fog",{...request,audience:randomUUID()})).statusCode).toBe(404);
    expect((await post(f.mapId,"fog",{...request,extra:true})).statusCode).toBe(400);
    const first=await post(f.mapId,"fog",request);expect(first.statusCode,first.body).toBe(200);expect((await post(f.mapId,"fog",request)).json()).toEqual(first.json());
    expect((await post(f.mapId,"fog",{...request,regionIds:["right"]})).statusCode).toBe(409);
    expect((await post(f.mapId,"fog",{...request,...cmd(),action:"hide"})).statusCode).toBe(409);
    expect((await post(f.mapId,"fog",{...request,...cmd(),mapRevision:55})).statusCode).toBe(404);
  });
  it("never rebinds an already running scene to an edited floor or that floor's new fog state",async()=>{
    const f=await fogFixture();await fog(f.mapId,"reveal",["left"]);
    await tactical().reviseMap(gm,campaign,f.mapId,{...cmd(),expectedVersion:1,document:{...f.doc,elevation:1},anchors:f.anchors});
    expect((await studio().getFog(gm,campaign,f.mapId,2)).state.enabled).toBe(true);expect((await studio().getFog(gm,campaign,f.mapId,2)).state.party).toEqual([]);
    await fog(f.mapId,"reveal",["right"],null,2);
    expect((await tactical().getSession(player,campaign,f.sessionId)).regions.map(r=>r.id)).toEqual(["left"]);
    expect((await tactical().getSession(gm,campaign,f.sessionId)).map!.revision).toBe(1);
  });
  it("round trips floors, links, fog, receipts and active player projections through native V20",async()=>{
    const map=await blueprint(),upper=await studio().addFloor(gm,campaign,map.id,add(map));
    const f=await fogFixture();await fog(f.mapId,"reveal",["right"],actorId);
    const bundle=await exportCampaignBundle(db,gm,campaign); const target=await createTestDb();expect(bundle.version).toBe(20);
    try{await initializeCampaignRestoreTarget(target); const encoded=serializeCurrentCampaignBundle(bundle);const parsed=parseCurrentCampaignBundle(encoded);await restoreCampaignBundle(target,parsed);const exported=await exportCampaignBundle(target,gm,campaign);expect(currentCampaignSemanticDiff(bundle,exported)).toEqual([]);expect(await createMapStudio(target).getFloors(gm,campaign,upper.mapId)).toEqual(await studio().getFloors(gm,campaign,upper.mapId));expect(await createTactical(target).getSession(player,campaign,f.sessionId)).toEqual(await tactical().getSession(player,campaign,f.sessionId));}finally{await target.close();}
  },30000);
  it("rejects correctly rehashed but cross-linked native floor/fog corruption",async()=>{
    const map=await blueprint();await studio().addFloor(gm,campaign,map.id,add(map));
    const bundle=await exportCampaignBundle(db,gm,campaign),tables=currentCampaignTables(bundle);
    const build=(patch:object)=>createCampaignBundleV20({campaignId:campaign,universeId:bundle.manifest.universeId,exportedAt:bundle.manifest.exportedAt,tables:{...tables,...patch}});
    const f=tables.map_floor_stacks.find(r=>(r.document as any).links.length)!;
    expect(()=>build({map_floor_stacks:tables.map_floor_stacks.map(row=>row===f?{...row,document:{...(row.document as any),rootMapId:"missing"}}:row)})).toThrow();
    const fogRow=tables.map_room_fog[0]!;
    expect(()=>build({map_room_fog:tables.map_room_fog.map(row=>row===fogRow?{...row,document:{...(row.document as any),party:["not-a-room"]}}:row)})).toThrow();
    const receipt=tables.map_studio_commands[0]!,input={...(receipt.request as any),expectedVersion:123};
    expect(()=>build({map_studio_commands:tables.map_studio_commands.map(row=>row===receipt?{...row,request:input,request_hash:tacticalHash({userId:row.actor_user_id,campaignId:campaign,mapId:row.scope_id,operation:row.operation,input})}:row)})).toThrow();
  },30000);
});
