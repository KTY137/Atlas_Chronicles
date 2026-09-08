// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { randomUUID } from "node:crypto";
import { afterAll,beforeAll,describe,expect,it } from "vitest";
import { renderChronistUnit,type ChronistCallOutcome } from "@chronicle/chronist";
import { createPgDb,migrate,type Db } from "../src/db/index.ts";
import { createIdentity } from "../src/identity/index.ts";
import { createCampaigns } from "../src/domain/campaigns.ts";
import { createDocuments } from "../src/domain/documents.ts";
import { createChronist } from "../src/domain/chronist.ts";
import type { ChronistProviderBinding } from "../src/domain/chronist/runtime.ts";
const connection=process.env.TEST_DATABASE_URL,schema=`chronicle_chronist_${randomUUID().replaceAll("-","")}`;
const deferred=()=>{let resolve!:()=>void;const promise=new Promise<void>(r=>{resolve=r;});return {promise,resolve};};
describe.skipIf(!connection)("Chronist durable dispatch concurrency on separate Postgres connections",()=>{
  let admin:Db,a:Db,b:Db,gm:string;const services:ReturnType<typeof createChronist>[]=[];
  beforeAll(async()=>{admin=createPgDb(connection!);await admin.query(`CREATE SCHEMA "${schema}"`);const url=new URL(connection!);url.searchParams.set("options",`-c search_path=${schema}`);
    a=createPgDb(url.href,{max:2});b=createPgDb(url.href,{max:2});await migrate(a);gm=(await createIdentity(a,{origin:"https://chronist-pg.test",cookieSecret:"chronist-real-pg-cookie-secret-at-least-32"}).bootstrap("Kaya")).userId;
    const [pa,pb]=await Promise.all([a.query("SELECT pg_backend_pid() AS id"),b.query("SELECT pg_backend_pid() AS id")]);expect(pa.rows[0]!.id).not.toBe(pb.rows[0]!.id);
  },30000);
  afterAll(async()=>{for(const s of services)await s.close();await a?.close();await b?.close();if(admin){if(!/^chronicle_chronist_[a-f0-9]{32}$/.test(schema))throw new Error("unexpected test schema");await admin.query(`DROP SCHEMA "${schema}" CASCADE`);await admin.close();}});
  async function fixture(){const campaignId=(await createCampaigns(a).createCampaign(gm,{name:"Dispatch race"})).id;
    await createDocuments(a).saveEntry(gm,campaignId,{title:"Der Aufbruch",passages:[{inhalt:{kind:"absatz",inhalt:[{text:"Mara brach auf.",marks:[]}]}}]});return campaignId;}
  function gated(){const release=deferred();let calls=0,active=0,maxActive=0;
    const binding:ChronistProviderBinding={description:{id:"recorded",label:"Aufgezeichnet",location:"lokal",transport:"http",available:true,availabilityCode:null,models:["recorded"],pricing:null},fingerprint:"b".repeat(64),profileId:"ollama-chat-1",
      prepare:(plan,snapshot,attempt,parents)=>renderChronistUnit("ollama-chat-1","recorded","b".repeat(64),plan,snapshot,attempt,parents),
      bind:consume=>async(unit,permit)=>{const claims=await Promise.all([consume(permit,unit),consume(permit,unit)]);expect(claims.filter(Boolean)).toHaveLength(1);calls++;active++;maxActive=Math.max(maxActive,active);await release.promise;active--;
        const text='{"schemaVersion":1,"candidates":[]}';return {kind:"returned",reply:{text},usage:{inputChars:unit.dispatch.inputChars,outputChars:text.length,outputComplete:true,inputTokens:null,outputTokens:null,tokensComplete:false,durationMs:1,costMicros:null,currency:null,costKind:"unknown",costComplete:false}} as ChronistCallOutcome;}};
    const config={chronist:{providers:[binding.description],resolveProvider:()=>binding,globalConcurrency:1}};
    const first=createChronist(a,config),second=createChronist(b,config);services.push(first,second);return {first,second,release,calls:()=>calls,maxActive:()=>maxActive};}
  async function input(service:ReturnType<typeof createChronist>,campaignId:string){const sourceRefs=(await service.sources(gm,campaignId)).sources.map(s=>s.ref),value={mode:"abriss" as const,sourceRefs,providerId:"recorded",model:"recorded"};
    return {...value,scopeHash:(await service.preview(gm,campaignId,value)).scopeHash,commandId:randomUUID()};}
  it("admits one active campaign owner across connections and consumes each permit exactly once",async()=>{
    const campaign=await fixture(),g=gated(),one=await input(g.first,campaign),two={...one,commandId:randomUUID()};
    try{const results=await Promise.allSettled([g.first.start(gm,campaign,one),g.second.start(gm,campaign,two)]);expect(results.filter(r=>r.status==="fulfilled")).toHaveLength(1);
      expect(results.filter(r=>r.status==="rejected")).toHaveLength(1);await expect.poll(g.calls,{timeout:5000}).toBe(1);
      const active=(await g.first.listRuns(gm,campaign)).runs[0]!;expect(active.usage).toMatchObject({knownCalls:0,reservedCalls:1,knownInputChars:0,reservedInputChars:active.usage.inputChars});
      expect(Number((await b.query<{count:string}>("SELECT count(*)::text AS count FROM chronist_laeufe WHERE campaign_id=$1 AND state='running'",[campaign])).rows[0]!.count)).toBe(1);
    }finally{g.release.resolve();await g.first.close();await g.second.close();}expect(g.calls()).toBe(1);
  },15000);
  it("holds a global slot across campaigns and preserves reservations when the second run resumes",async()=>{
    const [ca,cb]=await Promise.all([fixture(),fixture()]),g=gated(),ia=await input(g.first,ca),ib=await input(g.second,cb);
    try{const [aa,ab]=await Promise.all([g.first.start(gm,ca,ia),g.second.start(gm,cb,ib)]);await expect.poll(g.calls,{timeout:5000}).toBe(1);
      await expect.poll(async()=>{const x=await g.first.getRun(gm,ca,aa.runId),y=await g.second.getRun(gm,cb,ab.runId);return [x,y].filter(r=>r.state==="paused").length;},{timeout:5000}).toBe(1);
      const ra=await g.first.getRun(gm,ca,aa.runId),paused=ra.state==="paused"?{service:g.first,campaign:ca,run:ra,ack:aa}:{service:g.second,campaign:cb,run:await g.second.getRun(gm,cb,ab.runId),ack:ab};
      expect(paused.run.stopReason).toBe("call-in-flight");expect(paused.run.usage.calls).toBe(0);g.release.resolve();
      await expect.poll(async()=>(await g.first.getRun(gm,ca,aa.runId)).state==="completed"||(await g.second.getRun(gm,cb,ab.runId)).state==="completed",{timeout:5000}).toBe(true);
      await paused.service.resume(gm,paused.campaign,paused.ack.runId,{expectedVersion:paused.run.version,scopeHash:paused.run.scopeHash});
      await expect.poll(g.calls,{timeout:5000}).toBe(2);await expect.poll(async()=>(await paused.service.getRun(gm,paused.campaign,paused.ack.runId)).state,{timeout:5000}).toBe("completed");
      expect(g.maxActive()).toBe(1);expect((await paused.service.getRun(gm,paused.campaign,paused.ack.runId)).usage.calls).toBe(1);
    }finally{g.release.resolve();await g.first.close();await g.second.close();}
  },20000);
});
