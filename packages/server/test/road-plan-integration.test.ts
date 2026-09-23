// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { parseCurrentCampaignBundle, serializeCurrentCampaignBundle, currentCampaignSemanticDiff } from "@chronicle/io";
import type { RoadPlan } from "@chronicle/szene";
import { buildApp } from "../src/app.ts";
import { createTestDb, migrate, type Db } from "../src/db/index.ts";
import { createIdentity } from "../src/identity/index.ts";
import { createCampaigns } from "../src/domain/campaigns.ts";
import { createGrundriss } from "../src/domain/grundriss.ts";
import { createTactical } from "../src/domain/tactical.ts";
import { createBetreten } from "../src/domain/betreten.ts";
import { exportCampaignBundle, initializeCampaignRestoreTarget, restoreCampaignBundle } from "../src/domain/bundles.ts";

describe("road plans through real HTTP, storage and access boundaries", () => {
  let db: Db, app: FastifyInstance, gm: string, campaign: string, cookie: string, playerCookie: string;
  const config = { origin: "https://road.test", cookieSecret: "road-cookie-secret-longer-than-32", bootstrapToken: "road-bootstrap-secret-longer-than-32" };
  beforeAll(async () => {
    db = await createTestDb(); await migrate(db);
    const identity = createIdentity(db,config), campaigns = createCampaigns(db);
    gm=(await identity.bootstrap("Road tests")).userId;
    campaign=(await campaigns.createCampaign(gm,{name:"Road network"})).id;
    cookie=`chronicle_session=${(await identity.issueSession(gm)).value}`;
    const invitation=await campaigns.issueInvitation(gm,campaign), request=await campaigns.requestJoin(invitation.code,{displayName:"Player"});
    const player=(await campaigns.approveJoin(gm,campaign,request.id)).userId;
    playerCookie=`chronicle_session=${(await identity.issueSession(player)).value}`;
    app=await buildApp(db,config);
  },30000);
  afterAll(async()=>{await app?.close();await db?.close();});
  const post=(path:string,payload:object,session=cookie)=>app.inject({method:"POST",url:`/api/campaigns/${campaign}${path}`,headers:{cookie:session,origin:config.origin},payload});
  const graph:RoadPlan={schemaVersion:1,maxSteigung:24,knoten:[{id:"entry",name:"Westtor",art:"tor",position:[.1,.5]},{id:"market",name:"Markt",art:"platz",position:[.9,.5]}],verbindungen:[{id:"main",von:"entry",nach:"market",art:"hauptstrasse",bruecke:false}]};
  const input=()=>({commandId:randomUUID(),art:"siedlung",stil:"gemalt",name:"Straßennetz",keim:"roads-http",optionen:{art:"dorf",standort:"ebene",relief:0,verkehr:graph}});

  it("advertises the versioned capability rather than accepting unsupported UI options",async()=>{
    const res=await app.inject({url:`/api/campaigns/${campaign}/tactical/generate/defaults`,headers:{cookie}});
    expect(res.statusCode).toBe(200);expect(res.json().strassenplanung).toBe(1);
  });
  it("previews without writes, saves idempotently and restores the native graph with its map",async()=>{
    const request=input(),before=await createTactical(db).listMaps(gm,campaign),preview=await post("/tactical/generate/preview",request);
    expect(preview.statusCode,preview.body).toBe(200);
    expect(preview.json().bericht.verkehr.routes[0].status).toBe("gebaut");
    expect(preview.json().bericht.verkehr.unreachableNodes).toEqual([]);
    expect(await createTactical(db).listMaps(gm,campaign)).toHaveLength(before.length);
    const saved=await post("/tactical/generate",request);expect(saved.statusCode,saved.body).toBe(200);
    expect((await post("/tactical/generate",request)).json()).toEqual(saved.json());
    const map=await createTactical(db).getMap(gm,campaign,saved.json().ack.subjectId);
    expect(map.document).toEqual(preview.json().document);
    expect(map.cartography!.regions[0]!.provenance!.optionen.verkehr).toEqual(graph);
    const entries=await createBetreten(db,config).children(gm,campaign,{parentKind:"tactical",parentMapId:map.id});
    expect(entries.nodes.length).toBeGreaterThan(0);
    const building=entries.nodes.find(n=>n.bauwerk)!;
    const visit={commandId:randomUUID(),parentKind:"tactical",parentMapId:map.id,knotenId:building.knotenId,expectedVersion:entries.version,art:"grundriss"};
    const entered=await post("/betreten",visit);expect(entered.statusCode,entered.body).toBe(200);
    const interior=await createTactical(db).getMap(gm,campaign,entered.json().mapId);
    expect(interior.cartography!.regions[0]!.provenance!.optionen.profil).toBe(building.bauwerk!.typ);
    // Merely re-entering never reapplies generation constraints to existing edits.
    expect((await post("/betreten",{...visit,commandId:randomUUID()})).json().mapId).toBe(interior.id);
    const now={...config,now:()=>Date.parse("2026-09-11T15:00:00Z")},bundle=await exportCampaignBundle(db,gm,campaign,now),target=await createTestDb();
    try{
      await initializeCampaignRestoreTarget(target);
      await restoreCampaignBundle(target,parseCurrentCampaignBundle(serializeCurrentCampaignBundle(bundle)));
      expect(currentCampaignSemanticDiff(bundle,await exportCampaignBundle(target,gm,campaign,now))).toEqual([]);
      expect((await createTactical(target).getMap(gm,campaign,map.id)).cartography).toEqual(map.cartography);
    }finally{await target.close();}
  },60000); // Fantasy-Städte aus Vierteln (v11): einzeln ~24 s, unter Parallellast mehr.
  it("reports invalid wet endpoints in preview but refuses a partial durable map",async()=>{
    const request=input();request.optionen={...request.optionen,standort:"insel",verkehr:{...graph,knoten:[{...graph.knoten[0]!,position:[0,0]},graph.knoten[1]!]}};
    const before=await createTactical(db).listMaps(gm,campaign),res=await post("/tactical/generate/preview",request);
    expect(res.statusCode,res.body).toBe(200);expect(res.json().bericht.verkehr.invalidNodes).toContain("entry");
    const denied=await post("/tactical/generate",request);expect(denied.statusCode,denied.body).toBe(400);expect(denied.json().error).toBe("Bitte Eingaben prüfen.");
    await expect(createGrundriss(db,config).generate(gm,campaign,request as never)).rejects.toThrow("Straßenplan ist noch nicht ausführbar");
    expect(await createTactical(db).listMaps(gm,campaign)).toHaveLength(before.length);
  });
  it("rejects malformed and irrelevant graphs before storing maps",async()=>{
    const before=await createTactical(db).listMaps(gm,campaign);
    for(const request of [{...input(),optionen:{verkehr:{schemaVersion:2}}},{...input(),optionen:{anlage:"burg",verkehr:graph}},{...input(),art:"region"},{...input(),art:"hoehle"},
      {...input(),optionen:{verkehr:{...graph,verbindungen:[{...graph.verbindungen[0],nach:"missing"}]}}}])expect((await post("/tactical/generate",request)).statusCode).toBe(400);
    expect(await createTactical(db).listMaps(gm,campaign)).toHaveLength(before.length);
  });
  it("preserves GM-only access to previews, diagnostics and generation",async()=>{
    expect((await post("/tactical/generate/preview",input(),playerCookie)).statusCode).toBe(404);
    expect((await post("/tactical/generate",input(),playerCookie)).statusCode).toBe(404);
    expect((await post("/tactical/generate/preview",input(),"")).statusCode).not.toBe(200);
  });
});
