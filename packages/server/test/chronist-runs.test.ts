// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { randomUUID } from "node:crypto";
import { mkdir,mkdtemp } from "node:fs/promises";
import { resolve,join } from "node:path";
import { afterAll,beforeAll,describe,expect,it } from "vitest";
import { renderChronistUnit,chronistHash,type ChronistCallOutcome } from "@chronicle/chronist";
import { currentCampaignTables,createCurrentCampaignBundle,serializeCurrentCampaignBundle,parseCurrentCampaignBundle,decodeChronistCheckpoint,encodeChronistCheckpoint,validateChronistSend,type ChronistRunRow } from "@chronicle/io";
import { Send } from "@langchain/langgraph";
import { uuid6 } from "@langchain/langgraph-checkpoint";
import { createTestDb,migrate,type Db } from "../src/db/index.ts";
import { createIdentity } from "../src/identity/index.ts";
import { createCampaigns } from "../src/domain/campaigns.ts";
import { createDocuments,type PassageInput } from "../src/domain/documents.ts";
import { createChronist } from "../src/domain/chronist.ts";
import type { ChronistProviderBinding,ChronistServiceConfig } from "../src/domain/chronist/runtime.ts";
import type { ChronistFreigabeConfig } from "../src/domain/chronist/freigabe.ts";
import { exportCampaignBundle,restoreCampaignBundle } from "../src/domain/bundles.ts";
import { seedActorControl } from "./actor-fixtures.ts";
import { buildApp } from "../src/app.ts";
import { createGameplay } from "../src/domain/gameplay.ts";
import { createChronistStore } from "../src/domain/chronist/store.ts";
import { ChronistCheckpointSaver } from "../src/domain/chronist/checkpointer.ts";
const identityConfig={origin:"https://chronist-runs.test",cookieSecret:"chronist-run-cookie-secret-at-least-32-characters"};
const paragraph=(text:string):PassageInput=>({inhalt:{kind:"absatz",inhalt:[{text,marks:[]}]}});
const field=(key:string,text:string):PassageInput=>({inhalt:{kind:"feld",schluessel:key,label:key,werte:[[{text,marks:[]}]],mehrwertig:false,klauselKandidat:false}});
describe("durable Chronist through real database and graph",()=>{
  let db:Db,gm:string;const services:ReturnType<typeof createChronist>[]=[];
  beforeAll(async()=>{db=await createTestDb();await migrate(db);gm=(await createIdentity(db,identityConfig).bootstrap("Kaya")).userId;},30000);
  afterAll(async()=>{for(const s of services)await s.close();await db.close();});
  async function fixture(passages:PassageInput[],external=false,database:Db=db,art:"abriss"|"artikel"|"ueberarbeitung"="abriss"){
    const campaignId=(await createCampaigns(database).createCampaign(gm,{name:"Chronist"})).id,docs=createDocuments(database),entry=await docs.saveEntry(gm,campaignId,{title:"Mara",passages});let calls=0;
    const binding:ChronistProviderBinding={description:{id:"recorded",label:"Aufzeichnung",location:external?"fremd":"lokal",transport:"http",available:true,availabilityCode:null,models:["recorded"],pricing:null},fingerprint:"a".repeat(64),profileId:"ollama-chat-1",
      prepare:(plan,snapshot,attempt,parents)=>renderChronistUnit("ollama-chat-1","recorded","a".repeat(64),plan,snapshot,attempt,parents),
      bind:consume=>async(unit,permit)=>{expect(await consume(permit,unit)).toBe(true);expect(await consume(permit,unit)).toBe(false);calls++;
        const citation=unit.sourceSpans[0]!,leerzeile=String.fromCharCode(10,10);
        const absatz=art==="abriss"?"Mara brach auf.":["Mara brach auf.","Sie kam nicht zurück."].join(leerzeile);
        const text=JSON.stringify({schemaVersion:1,candidates:[{kind:art,text:absatz,citations:[citation],date:null}]});
        return {kind:"returned",reply:{text},usage:{inputChars:unit.dispatch.inputChars,outputChars:text.length,outputComplete:true,inputTokens:13,outputTokens:17,tokensComplete:true,durationMs:1,costMicros:null,currency:null,costKind:"unknown",costComplete:false}} as ChronistCallOutcome;}};
    const serviceConfig:ChronistServiceConfig&ChronistFreigabeConfig={cookieSecret:identityConfig.cookieSecret,chronist:{providers:[binding.description],resolveProvider:()=>binding}};
    const service=createChronist(database,serviceConfig);services.push(service);
    const sourcePage=await service.sources(gm,campaignId,{entryId:entry.entryId}),sourceRefs=sourcePage.sources.map(s=>s.ref);
    return {campaignId,docs,entry,service,binding,sourceRefs,calls:()=>calls};
  }
  async function settled(f:Awaited<ReturnType<typeof fixture>>,runId:string){await expect.poll(async()=>(await f.service.getRun(gm,f.campaignId,runId)).state,{timeout:15000,interval:30}).not.toBe("running");return f.service.getRun(gm,f.campaignId,runId);}
  it("runs rules without calls and submits one historical human proposal atomically",async()=>{
    const f=await fixture([field("geburt","812"),field("tod","799")]),input={mode:"prosa" as const,sourceRefs:f.sourceRefs,providerId:"recorded",model:"recorded"};
    const preview=await f.service.preview(gm,f.campaignId,input);expect(preview.modelUnits).toBe(0);expect(preview.ruleFindings).toHaveLength(1);
    const start={...input,commandId:randomUUID(),scopeHash:preview.scopeHash},ack=await f.service.start(gm,f.campaignId,start),run=await settled(f,ack.runId);
    expect(run.state).toBe("completed");expect(f.calls()).toBe(0);expect(await f.service.start(gm,f.campaignId,start)).toEqual(ack);
    const p=(await f.service.suggestions(gm,f.campaignId,{runId:ack.runId})).suggestions.find(p=>p.kind==="widerspruch")!;
    const submit={commandId:randomUUID(),expectedVersion:p.version,expectedDraftHash:p.draftHash,target:{kind:"new" as const,title:"  Widerspruch  ",slug:"Historical_Account"}};
    const submitted=await f.service.submitSuggestion(gm,f.campaignId,p.id,submit);
    const article=await f.docs.getEntry(gm,f.campaignId,submitted.entryId);expect((await db.query<{geltung:string}>("SELECT geltung FROM passages WHERE entry_id=$1",[submitted.entryId])).rows.map(p=>p.geltung)).toEqual(["antrag"]);
    expect((await db.query("SELECT id FROM confirmed_mints WHERE campaign_id=$1",[f.campaignId])).rowCount).toBe(0);
    await createGameplay(db).mintRatifikation(gm,f.campaignId,{commandId:randomUUID(),passageId:submitted.passageIds[0]!,fictionDate:"813"});
    const minted=await f.docs.source(f.campaignId,submitted.entryId);
    await f.docs.saveEntry(gm,f.campaignId,{title:"Weitergeschrieben",expectedVersion:minted.entry.version,passages:minted.passagen.map(p=>({pid:p.pid,inhalt:p.inhalt}))},submitted.entryId);
    expect(await f.service.submitSuggestion(gm,f.campaignId,p.id,submit)).toEqual(submitted);
    const bundle=await exportCampaignBundle(db,gm,f.campaignId);expect(bundle.version).toBe(16);
    expect(parseCurrentCampaignBundle(serializeCurrentCampaignBundle(bundle)).manifest.contentHash).toBe(bundle.manifest.contentHash);
    const restored=await createTestDb();try{await migrate(restored);await restoreCampaignBundle(restored,bundle);
      const retry=createChronist(restored);expect(await retry.submitSuggestion(gm,f.campaignId,p.id,submit)).toEqual(submitted);await retry.close();
      expect((await restored.query("SELECT id FROM revisions WHERE entry_id=$1",[submitted.entryId])).rowCount).toBe(3);
      const reexport=await exportCampaignBundle(restored,gm,f.campaignId);expect(reexport.version).toBe(16);
      expect((await restored.query<{lease_owner:string|null;lease_until:string|null}>("SELECT lease_owner,lease_until FROM chronist_laeufe WHERE id=$1",[ack.runId])).rows[0]).toEqual({lease_owner:null,lease_until:null});
    }finally{await restored.close();}
  },30000);
  it("records exact dispatch usage and real nested graph checkpoints",async()=>{
    const f=await fixture([paragraph("Mara brach auf.")]),input={mode:"abriss" as const,sourceRefs:f.sourceRefs,providerId:"recorded",model:"recorded"};
    const preview=await f.service.preview(gm,f.campaignId,input),ack=await f.service.start(gm,f.campaignId,{...input,scopeHash:preview.scopeHash,commandId:randomUUID()}),run=await settled(f,ack.runId);
    expect(run.state).toBe("completed");expect(f.calls()).toBe(1);expect(run.usage.calls).toBe(1);expect(run.usage.outputChars).toBeGreaterThan(0);
    expect(run.usage).toMatchObject({knownCalls:1,reservedCalls:0,knownInputChars:run.usage.inputChars,reservedInputChars:0});
    const row=(await db.query<{checkpoints:{checkpoints:{namespace:string}[]}}>("SELECT checkpoints FROM chronist_laeufe WHERE id=$1",[ack.runId])).rows[0]!;
    expect(row.checkpoints.checkpoints.some(c=>c.namespace.startsWith("work:"))).toBe(true);
    const bundle=await exportCampaignBundle(db,gm,f.campaignId);expect(bundle.version).toBe(16);expect(createCurrentCampaignBundle({campaignId:f.campaignId,universeId:bundle.manifest.universeId,exportedAt:bundle.manifest.exportedAt,tables:currentCampaignTables(bundle)}).manifest.contentHash).toBe(bundle.manifest.contentHash);
  },25000);
  it("preserves edited drafts, old target snapshots and supported migration baselines on existing-target submission",async()=>{
    const f=await fixture([field("datum","812"),field("datum","813")]),input={mode:"prosa" as const,sourceRefs:f.sourceRefs,providerId:"recorded",model:"recorded"},preview=await f.service.preview(gm,f.campaignId,input),ack=await f.service.start(gm,f.campaignId,{...input,scopeHash:preview.scopeHash,commandId:randomUUID()});await settled(f,ack.runId);
    const proposals=(await f.service.suggestions(gm,f.campaignId,{runId:ack.runId})).suggestions;expect(proposals.length).toBeGreaterThanOrEqual(2);
    for(const [index,legacy] of [false,true].entries()){
      let target:Awaited<ReturnType<typeof f.docs.getEntry>>;
      if(legacy){const entryId=randomUUID(),revisionId=randomUUID(),passageId=randomUUID();
        await db.transaction(async tx=>{await tx.query("INSERT INTO entries(id,universe_id,campaign_id,slug,title,current_revision_id,created_by) SELECT $1,universe_id,id,'alte-migration','Alte Migration',$3,$4 FROM campaigns WHERE id=$2",[entryId,f.campaignId,revisionId,gm]);
          await tx.query("INSERT INTO revisions(id,entry_id,seq,author_user_id,content_hash,document,created_at) VALUES($1,$2,1,$3,$4,'{}',0)",[revisionId,entryId,gm,"0".repeat(64)]);
          await tx.query("INSERT INTO passages(id,entry_id,campaign_id,revision_id,ord,path,content,gen,geltung,praegung,tags) VALUES($1,$2,$3,$4,0,'[]',$5,1,'notiz',NULL,'[]')",[passageId,entryId,f.campaignId,revisionId,paragraph("Vorhandener unveränderter Text").inhalt]);});target=await f.docs.getEntry(gm,f.campaignId,entryId);
      }else target=await f.docs.saveEntry(gm,f.campaignId,{title:"Bestehender Artikel",passages:[paragraph("Vorhandener unveränderter Text")]});
      const before=(await db.query<{document:unknown}>("SELECT document FROM revisions WHERE id=$1",[target.revisionId])).rows[0]!.document;
      const proposal=proposals[index]!,edited=await f.service.editSuggestion(gm,f.campaignId,proposal.id,{expectedVersion:proposal.version,blocks:[{kind:"absatz",inhalt:[{text:"Menschlich überarbeiteter Entwurf",marks:[]}]}]});
      expect(edited.originalBlocks).toEqual(proposal.originalBlocks);const request={commandId:randomUUID(),expectedVersion:edited.version,expectedDraftHash:edited.draftHash,target:{kind:"existing" as const,entryId:target.entryId,expectedVersion:target.version!}};
      const submitted=await f.service.submitSuggestion(gm,f.campaignId,proposal.id,request);expect(submitted.version).toBe(2);expect(submitted.passageIds).toHaveLength(1);
      expect((await db.query<{document:unknown}>("SELECT document FROM revisions WHERE id=$1",[target.revisionId])).rows[0]!.document).toEqual(before);
      expect(await f.service.submitSuggestion(gm,f.campaignId,proposal.id,request)).toEqual(submitted);
    }
    expect((await exportCampaignBundle(db,gm,f.campaignId)).version).toBe(16);expect(f.calls()).toBe(0);
  },15000);
  it("hides complete secret dependencies and stale sources from players, preserves GM review",async()=>{
    const f=await fixture([field("geburt","812"),field("tod","799")]),player=randomUUID(),actor=randomUUID();
    await db.query("INSERT INTO users(id,display_name,created_at) VALUES($1,'Sera',0)",[player]);await db.query("INSERT INTO actors(id,campaign_id,user_id,name) VALUES($1,$2,$3,'Sera')",[actor,f.campaignId,player]);
    await db.query("INSERT INTO campaign_memberships(campaign_id,user_id,role,display_name,name_skeleton,actor_id) VALUES($1,$2,'spieler','Sera','sera',$3)",[f.campaignId,player,actor]);await seedActorControl(db,f.campaignId,actor,player);
    const input={mode:"prosa" as const,sourceRefs:f.sourceRefs,providerId:"recorded",model:"recorded"},preview=await f.service.preview(gm,f.campaignId,input),ack=await f.service.start(gm,f.campaignId,{...input,scopeHash:preview.scopeHash,commandId:randomUUID()});await settled(f,ack.runId);
    await f.docs.revealPassage(gm,f.campaignId,f.entry.passagen[0]!.pid,actor);
    expect((await f.service.suggestions(player,f.campaignId)).suggestions.filter(p=>p.kind==="widerspruch")).toEqual([]);
    await f.docs.revealPassage(gm,f.campaignId,f.entry.passagen[1]!.pid,actor);expect((await f.service.suggestions(player,f.campaignId)).suggestions.filter(p=>p.kind==="widerspruch")).toHaveLength(1);
    await db.query("UPDATE revelations SET revoked_at=1 WHERE actor_id=$1 AND passage_id=$2",[actor,f.entry.passagen[1]!.pid]);expect((await f.service.suggestions(player,f.campaignId)).suggestions.filter(p=>p.kind==="widerspruch")).toHaveLength(0);
    await f.docs.saveEntry(gm,f.campaignId,{title:"Mara aktualisiert",expectedVersion:f.entry.version!,passages:(await f.docs.source(f.campaignId,f.entry.entryId)).passagen.map(p=>({pid:p.pid,inhalt:p.inhalt}))},f.entry.entryId);
    const proposal=(await f.service.suggestions(gm,f.campaignId)).suggestions[0]!;expect(proposal.stale).toBe(true);
    await expect(f.service.submitSuggestion(gm,f.campaignId,proposal.id,{commandId:randomUUID(),expectedVersion:proposal.version,expectedDraftHash:proposal.draftHash,target:{kind:"new",title:"Veraltet"}})).rejects.toMatchObject({reason:"source-stale"});
  },25000);
  it("requires exact external consent and a fresh source preview",async()=>{
    const f=await fixture([paragraph("Mara brach auf.")],true),input={mode:"abriss" as const,sourceRefs:f.sourceRefs,providerId:"recorded",model:"recorded"},preview=await f.service.preview(gm,f.campaignId,input);
    await expect(f.service.start(gm,f.campaignId,{...input,scopeHash:preview.scopeHash,commandId:randomUUID()})).rejects.toMatchObject({reason:"freigabe-missing"});expect(f.calls()).toBe(0);
    await f.docs.saveEntry(gm,f.campaignId,{title:"Mara",expectedVersion:f.entry.version!,passages:[{pid:f.entry.passagen[0]!.pid,...paragraph("Mara blieb hier.")}]},f.entry.entryId);
    await expect(f.service.start(gm,f.campaignId,{...input,scopeHash:preview.scopeHash,commandId:randomUUID(),externalConsent:{scopeHash:preview.scopeHash,token:preview.freigabe!.token}})).rejects.toMatchObject({reason:"source-stale"});expect(f.calls()).toBe(0);
  });
  it("paginates confirmed session context and requires saved notes for the selected real session",async()=>{
    const f=await fixture([paragraph("PRIVATE-SOURCE-BODY")]),game=createGameplay(db,{seed:()=>"00000001000000020000000300000004"}),actor=randomUUID();
    await db.query("INSERT INTO actors(id,campaign_id,user_id,name) VALUES($1,$2,$3,'Mara')",[actor,f.campaignId,gm]);await seedActorControl(db,f.campaignId,actor,gm);
    const scene=await game.createScene(gm,f.campaignId,{name:"Am Tor",entryIds:[f.entry.entryId],fictionDate:"812"}),session=await game.startScene(gm,f.campaignId,scene.id),confirmed:string[]=[];
    for(let i=0;i<3;i++){const roll=await game.prepareAction(gm,f.campaignId,{commandId:randomUUID(),actorId:actor,actionId:"investigate",fictionDate:"812"});await game.confirmAction(gm,f.campaignId,roll.id);confirmed.push(roll.id);}
    const pending=await game.prepareAction(gm,f.campaignId,{commandId:randomUUID(),actorId:actor,actionId:"investigate"});
    const second=await game.createScene(gm,f.campaignId,{name:"Eine andere Sitzung",entryIds:[],fictionDate:"813"}),other=await game.startScene(gm,f.campaignId,second.id);
    const elsewhere=await game.prepareAction(gm,f.campaignId,{commandId:randomUUID(),actorId:actor,actionId:"investigate"});await game.confirmAction(gm,f.campaignId,elsewhere.id);
    const page=await f.service.sessions(gm,f.campaignId,{limit:1}),next=await f.service.sessions(gm,f.campaignId,{limit:1,after:page.after!});expect(page.complete).toBe(false);expect(next.complete).toBe(true);
    expect([...page.sessions,...next.sessions].map(s=>s.id).sort()).toEqual([session.id,other.id].sort());
    const first=await f.service.sessionContext(gm,f.campaignId,String(session.id),{limit:2}),last=await f.service.sessionContext(gm,f.campaignId,String(session.id),{limit:2,after:first.after!});
    expect(first.complete).toBe(false);expect(last.complete).toBe(true);expect([...first.rolls,...last.rolls].map(r=>r.id).sort()).toEqual(confirmed.sort());
    const context=JSON.stringify([first,last]);expect(context).not.toContain(pending.id);expect(context).not.toContain(elsewhere.id);expect(context).not.toContain("PRIVATE-SOURCE-BODY");expect(context).not.toContain('"receipt"');expect(context).not.toContain('"context"');
    const input={mode:"sitzung" as const,sessionId:String(session.id),sourceRefs:f.sourceRefs,providerId:"recorded",model:"recorded"};
    await expect(f.service.preview(gm,f.campaignId,input)).resolves.toMatchObject({sessionId:session.id});
    await expect(f.service.preview(gm,f.campaignId,{...input,sessionId:randomUUID()})).rejects.toThrow();expect(f.calls()).toBe(0);
  },15000);
  it("rechecks exact dispatched input and cancellation at the bridge, and retains late receipts while close drains",async()=>{
    const f=await fixture([paragraph("Mara brach auf.")]);await f.service.close();let release!:()=>void,arrived=false,recheck!:(changed?:boolean)=>Promise<boolean>;
    const held=new Promise<void>(resolve=>{release=resolve;}),binding:ChronistProviderBinding={...f.binding,bind:(consume,check)=>async(unit,permit)=>{
      expect(check).toBeDefined();expect(await check!(permit,unit)).toBe(false);expect(await consume(permit,unit)).toBe(true);
      recheck=(changed=false)=>check!(permit,changed?{...unit,dispatch:{...unit.dispatch,wireText:unit.dispatch.wireText+"injected"}}:unit);expect(await recheck()).toBe(true);expect(await recheck(true)).toBe(false);arrived=true;
      await held;const text='{"schemaVersion":1,"candidates":[]}';return {kind:"returned",reply:{text},usage:{inputChars:unit.dispatch.inputChars,outputChars:text.length,outputComplete:true,inputTokens:13,outputTokens:17,tokensComplete:true,durationMs:5500,costMicros:null,currency:null,costKind:"unknown",costComplete:false}};
    }},service=createChronist(db,{chronist:{providers:[binding.description],resolveProvider:()=>binding}});services.push(service);
    const input={mode:"abriss" as const,sourceRefs:f.sourceRefs,providerId:"recorded",model:"recorded"},preview=await service.preview(gm,f.campaignId,input),ack=await service.start(gm,f.campaignId,{...input,scopeHash:preview.scopeHash,commandId:randomUUID()});
    try{await expect.poll(()=>arrived,{timeout:5000}).toBe(true);const active=await service.getRun(gm,f.campaignId,ack.runId);await service.cancel(gm,f.campaignId,ack.runId,active.version);expect(await recheck()).toBe(false);
      await expect(service.close()).rejects.toThrow("chronist-drain-timeout");expect((await db.query("SELECT id FROM chronist_laeufe WHERE id=$1",[ack.runId])).rowCount).toBe(1);
    }finally{release();await service.close();}
    const settled=await service.getRun(gm,f.campaignId,ack.runId);expect(settled.state).toBe("paused");expect(settled.usage.calls).toBe(1);expect(settled.usage.outputChars).toBe(35);expect(settled.usage.outputTokens).toBe(17);expect(settled.unknownCalls).toBe(0);
    expect((await exportCampaignBundle(db,gm,f.campaignId)).version).toBe(16);
  },15000);
  it("HTTP admits decimal pagination and rejects unpublished fields without coercion",async()=>{
    const f=await fixture([field("geburt","812")]),session=await createIdentity(db,identityConfig).issueSession(gm);
    const app=await buildApp(db,{...identityConfig,bootstrapToken:"chronist-http-bootstrap-at-least-32-characters",chronist:{providers:[f.binding.description],resolveProvider:()=>f.binding}});
    try{const cookie=session.setCookie.split(";")[0]!,base=`/api/campaigns/${f.campaignId}/chronist`;
      const read=await app.inject({url:`${base}/sources?limit=50&entryId=${f.entry.entryId}`,headers:{cookie}});expect(read.statusCode).toBe(200);expect(read.json().sources).toHaveLength(1);
      expect((await app.inject({url:`${base}/sessions?limit=100`,headers:{cookie}})).statusCode).toBe(200);
      expect((await app.inject({url:`${base}/sources?limit=1.5`,headers:{cookie}})).statusCode).toBe(400);
      const preview=await app.inject({method:"POST",url:`${base}/runs/preview`,headers:{cookie,origin:identityConfig.origin},payload:{mode:"prosa",sourceRefs:f.sourceRefs,providerId:"recorded",model:"recorded",secret:"not-admitted"}});expect(preview.statusCode).toBe(400);
      expect((await app.inject({url:`${base}/runs?limit=50`,headers:{cookie}})).statusCode).toBe(200);
      expect(f.calls()).toBe(0);
    }finally{await app.close();}
  },15000);
  it("starts an acknowledged resume after the previous local execution finishes its committed pause",async()=>{
    const f=await fixture([paragraph("Mara brach auf.")]);await f.service.close();let release!:()=>void,pausedCommitted=false,calls=0;
    const gate=new Promise<void>(r=>{release=r;}),wrapped:Db={...db,transaction:async fn=>{let paused=false;
      const result=await db.transaction(tx=>fn({...tx,query:async<T=Record<string,unknown>>(sql:string,params?:readonly unknown[])=>{const result=await tx.query<T>(sql,params);if(sql.startsWith("UPDATE chronist_laeufe SET updated_at")&&params?.[3]==="paused")paused=true;return result;}}));
      if(paused&&!pausedCommitted){pausedCommitted=true;await gate;}return result;}};
    const binding:ChronistProviderBinding={...f.binding,bind:consume=>async(unit,permit)=>{expect(await consume(permit,unit)).toBe(true);calls++;
      const usage={inputChars:unit.dispatch.inputChars,outputChars:0,outputComplete:true,inputTokens:0,outputTokens:0,tokensComplete:true,durationMs:1,costMicros:null,currency:null,costKind:"unknown" as const,costComplete:false};
      if(calls===1)return {kind:"failed",code:"unavailable",mayHaveExecuted:false,usage};const text='{"schemaVersion":1,"candidates":[]}';return {kind:"returned",reply:{text},usage:{...usage,outputChars:text.length}};
    }},service=createChronist(wrapped,{chronist:{providers:[binding.description],resolveProvider:()=>binding}});services.push(service);
    const input={mode:"abriss" as const,sourceRefs:f.sourceRefs,providerId:"recorded",model:"recorded"},preview=await service.preview(gm,f.campaignId,input),ack=await service.start(gm,f.campaignId,{...input,scopeHash:preview.scopeHash,commandId:randomUUID()});
    try{await expect.poll(()=>pausedCommitted,{timeout:5000}).toBe(true);const paused=await service.getRun(gm,f.campaignId,ack.runId);let acknowledged=false;
      const resumed=service.resume(gm,f.campaignId,ack.runId,{expectedVersion:paused.version,scopeHash:paused.scopeHash}).then(result=>{acknowledged=true;return result;});
      await expect.poll(async()=>(await service.getRun(gm,f.campaignId,ack.runId)).state,{timeout:5000}).toBe("running");expect(acknowledged).toBe(false);release();await resumed;
      await expect.poll(async()=>(await service.getRun(gm,f.campaignId,ack.runId)).state,{timeout:5000}).toBe("completed");expect(calls).toBe(2);expect((await exportCampaignBundle(db,gm,f.campaignId)).version).toBe(16);
    }finally{release();await service.close();}
  },15000);
  it("rolls back the document revision when saving the durable decision fails",async()=>{
    const f=await fixture([field("datum","812")]),input={mode:"prosa" as const,sourceRefs:f.sourceRefs,providerId:"recorded",model:"recorded"},preview=await f.service.preview(gm,f.campaignId,input),ack=await f.service.start(gm,f.campaignId,{...input,commandId:randomUUID(),scopeHash:preview.scopeHash});await settled(f,ack.runId);
    const p=(await f.service.suggestions(gm,f.campaignId)).suggestions[0]!,request={commandId:randomUUID(),expectedVersion:p.version,expectedDraftHash:p.draftHash,target:{kind:"new" as const,title:"Atomare Entscheidung"}};
    const failing:Db={...db,transaction:fn=>db.transaction(tx=>fn({...tx,query:async(sql,params)=>{if(sql.includes("SET state='eingereicht'"))throw new Error("injected decision failure");return tx.query(sql,params);}}))};
    const broken=createChronist(failing);await expect(broken.submitSuggestion(gm,f.campaignId,p.id,request)).rejects.toThrow("injected decision failure");await broken.close();
    expect((await db.query("SELECT id FROM entries WHERE campaign_id=$1 AND title='Atomare Entscheidung'",[f.campaignId])).rowCount).toBe(0);
    expect((await f.service.getSuggestion(gm,f.campaignId,p.id)).state).toBe("offen");
    const [one,two]=await Promise.all([f.service.submitSuggestion(gm,f.campaignId,p.id,request),f.service.submitSuggestion(gm,f.campaignId,p.id,request)]);expect(one).toEqual(two);
    expect((await db.query("SELECT id FROM revisions WHERE entry_id=$1",[one.entryId])).rowCount).toBe(1);
  });
  it("rejects independently rehashed Native tampering in scope, wire input, usage, original output, and checkpoint tags",async()=>{
    const f=await fixture([paragraph("Mara brach auf.")]),input={mode:"abriss" as const,sourceRefs:f.sourceRefs,providerId:"recorded",model:"recorded"},preview=await f.service.preview(gm,f.campaignId,input),ack=await f.service.start(gm,f.campaignId,{...input,commandId:randomUUID(),scopeHash:preview.scopeHash});await settled(f,ack.runId);
    const bundle=await exportCampaignBundle(db,gm,f.campaignId),base=currentCampaignTables(bundle);
    const mutations:((tables:any)=>void)[]=[
      t=>{t.chronist_laeufe[0].snapshot.sources[0].text="Fremde Quelle";},
      t=>{t.chronist_laeufe[0].evidence.units[0].dispatch.wireText+="secret extra context";},
      t=>{t.chronist_laeufe[0].evidence.calls[0].reservation.inputChars=0;},
      t=>{t.chronist_laeufe[0].evidence.calls[0].history[1].actorUserId="missing-human";},
      t=>{t.chronist_laeufe[0].evidence.calls.push(structuredClone(t.chronist_laeufe[0].evidence.calls[0]));},
      t=>{t.chronist_laeufe[0].checkpoints.checkpoints[0].checkpoint={t:"constructor",module:"node:fs"};},
      t=>{t.chronist_laeufe[0].checkpoints.checkpoints[0].checkpoint={t:"send",node:"arbitrary-effect",args:{t:"object",v:[]},timeout:null};},
      t=>{const p=t.chronist_vorschlaege[0];p.original.blocks=[{kind:"absatz",inhalt:[{text:"Neue erfundene Aussage",marks:[]}]}];p.original_hash=chronistHash("candidate",p.original);p.blocks=p.original.blocks;p.draft_hash=chronistHash("draft",p.blocks);},
      t=>{const run=t.chronist_laeufe[0],stored=run.checkpoints.checkpoints.findLast((c:any)=>c.namespace===""),checkpoint=decodeChronistCheckpoint(stored.checkpoint) as any;checkpoint.channel_values.statuses[run.evidence.plans[0].unitId].candidateCount+=1;stored.checkpoint=encodeChronistCheckpoint(checkpoint);},
    ];
    for(const mutate of mutations){const tables=structuredClone(base);mutate(tables);expect(()=>createCurrentCampaignBundle({campaignId:f.campaignId,universeId:bundle.manifest.universeId,exportedAt:bundle.manifest.exportedAt,tables})).toThrow();}
  },15000);
  it("the real saver preserves undefined, fixed Send and special writes while pruning exact old IDs",async()=>{
    const f=await fixture([paragraph("Mara brach auf.")]),input={mode:"abriss" as const,sourceRefs:f.sourceRefs,providerId:"recorded",model:"recorded"},preview=await f.service.preview(gm,f.campaignId,input),ack=await f.service.start(gm,f.campaignId,{...input,commandId:randomUUID(),scopeHash:preview.scopeHash});await settled(f,ack.runId);await f.service.close();
    const run=(await db.query<ChronistRunRow>("SELECT * FROM chronist_laeufe WHERE id=$1",[ack.runId])).rows[0]!,control=run.evidence.controlEvidence.at(-1)!;
    const store=createChronistStore(db,{}, {runId:run.id,campaignId:f.campaignId,actorUserId:gm,executionId:control.executionId,fence:run.fence,owner:run.lease_owner!,provider:f.binding}),saver=new ChronistCheckpointSaver(run.id,store.transaction),config={configurable:{thread_id:run.id,checkpoint_ns:""}};
    const send=new Send("work",{runId:run.id,unitId:run.evidence.plans[0]!.unitId,attempt:1}),[type,bytes]=await saver.serde.dumpsTyped({send,missing:undefined,tag:{t:"undefined"},error:new Error("PRIVATE-PROVIDER-SECRET")});
    expect(type).toBe("chronist-checkpoint-json-1");expect(Buffer.from(bytes).toString()).not.toContain("PRIVATE-PROVIDER-SECRET");
    const decoded=await saver.serde.loadsTyped(type,bytes) as any;expect(decoded.send).toBeInstanceOf(Send);expect(Object.hasOwn(decoded,"missing")).toBe(true);expect(decoded.missing).toBeUndefined();expect(decoded.tag).toEqual({t:"undefined"});expect(decoded.error.message).toBe("graph-error");
    await expect(saver.serde.loadsTyped("json",bytes)).rejects.toThrow();await expect(saver.serde.loadsTyped(type,'{"t":"constructor","module":"node:fs"}')).rejects.toThrow();
    const original=(await saver.getTuple(config))!,taskId=randomUUID();await saver.putWrites(original.config,[["__error__",new Error("discarded")],["__resume__",undefined],["runId",run.id]],taskId);
    await saver.putWrites(original.config,[["__error__",new Error("discarded again")],["__resume__",true],["runId",run.id]],taskId);
    expect((await saver.getTuple(original.config))!.pendingWrites!.some(w=>w[1]==="__resume__"&&w[2]===true)).toBe(true);
    await expect(saver.putWrites(original.config,[["__error__",new Error()],["__resume__",true],["runId","different-run"]],taskId)).rejects.toMatchObject({reason:"checkpoint-write-conflict"});
    const next=await saver.put(original.config,{...original.checkpoint,id:uuid6(100),ts:new Date().toISOString()},original.metadata!,{}),last=await saver.put(next,{...original.checkpoint,id:uuid6(101),ts:new Date().toISOString()},original.metadata!,{});
    expect(await saver.getTuple(original.config)).toBeUndefined();expect((await saver.getTuple(config))!.config.configurable!.checkpoint_id).toBe(last.configurable!.checkpoint_id);
    const older=[];for await(const tuple of saver.list(config,{before:last,limit:1}))older.push(tuple);expect(older).toHaveLength(1);expect(older[0]!.config.configurable!.checkpoint_id).toBe(next.configurable!.checkpoint_id);
    expect((await exportCampaignBundle(db,gm,f.campaignId)).version).toBe(16);
    await db.query("UPDATE chronist_laeufe SET fence=fence+1 WHERE id=$1",[run.id]);await expect(saver.putWrites(last,[["runId",run.id]],randomUUID())).rejects.toMatchObject({reason:"authorization"});
  },15000);
  it("reopens real fan-out checkpoints and resumes only the interrupted child with preserved unknown usage",async()=>{
    await mkdir(resolve(".local"),{recursive:true});const path=await mkdtemp(join(resolve(".local"),"chronist-restart-"));let local=await createTestDb(path),resumed:ReturnType<typeof createChronist>|undefined;
    try{await migrate(local);await local.query("INSERT INTO users(id,display_name,created_at,platform_role) VALUES($1,'Kaya',0,'leitung')",[gm]);
      const f=await fixture([paragraph("Mara brach auf."),paragraph("Sera blieb zurück.")],true,local);await f.service.close();let calls=0;
      const binding:ChronistProviderBinding={...f.binding,bind:consume=>async(unit,permit)=>{expect(await consume(permit,unit)).toBe(true);calls++;
        if(calls===2)return {kind:"failed",code:"timeout",mayHaveExecuted:true,usage:{inputChars:unit.dispatch.inputChars,outputChars:3,outputComplete:false,inputTokens:null,outputTokens:null,tokensComplete:false,durationMs:1,costMicros:null,currency:null,costKind:"unknown",costComplete:false}};
        const text='{"schemaVersion":1,"candidates":[]}';return {kind:"returned",reply:{text},usage:{inputChars:unit.dispatch.inputChars,outputChars:text.length,outputComplete:true,inputTokens:null,outputTokens:null,tokensComplete:false,durationMs:1,costMicros:null,currency:null,costKind:"unknown",costComplete:false}};}};
      const config={cookieSecret:identityConfig.cookieSecret,chronist:{providers:[binding.description],resolveProvider:()=>binding}},first=createChronist(local,config),input={mode:"abriss" as const,sourceRefs:f.sourceRefs,providerId:"recorded",model:"recorded"};
      const preview=await first.preview(gm,f.campaignId,input);expect(preview.modelUnits).toBe(3);const externalConsent={scopeHash:preview.scopeHash,token:preview.freigabe!.token},ack=await first.start(gm,f.campaignId,{...input,commandId:randomUUID(),scopeHash:preview.scopeHash,externalConsent});
      await expect.poll(async()=>(await first.getRun(gm,f.campaignId,ack.runId)).state,{timeout:10000}).toBe("paused");const paused=await first.getRun(gm,f.campaignId,ack.runId);expect(paused.unknownCalls).toBe(1);expect(calls).toBe(2);
      const exported=await exportCampaignBundle(local,gm,f.campaignId);expect(exported.version).toBe(16);
      const forged=structuredClone(currentCampaignTables(exported)) as any,forgedRun=forged.chronist_laeufe[0],last=forgedRun.checkpoints.checkpoints.findLast((c:any)=>c.namespace===""),checkpoint=decodeChronistCheckpoint(last.checkpoint,{validateSend:s=>validateChronistSend(forgedRun,s)}) as any;
      const uncalled=forgedRun.evidence.plans.find((p:any)=>!forgedRun.evidence.calls.some((c:any)=>c.unitId===p.unitId));expect(uncalled).toBeDefined();
      checkpoint.channel_values.statuses[uncalled.unitId]={kind:"done",attempt:1,reason:null,advanceOnResume:false,candidateCount:0,rejected:false};last.checkpoint=encodeChronistCheckpoint(checkpoint);
      expect(()=>createCurrentCampaignBundle({campaignId:f.campaignId,universeId:exported.manifest.universeId,exportedAt:exported.manifest.exportedAt,tables:forged})).toThrow();
      await first.close();await local.close();local=await createTestDb(path);resumed=createChronist(local,config);
      expect((await resumed.getRun(gm,f.campaignId,ack.runId)).usage).toEqual(paused.usage);expect(calls).toBe(2);
      // Jede Fortsetzung nach aussen verlangt eine frische, serverseitig ausgestellte Freigabe.
      const wieder={scopeHash:paused.scopeHash,token:(await resumed.preview(gm,f.campaignId,input)).freigabe!.token};
      await expect(resumed.resume(gm,f.campaignId,ack.runId,{expectedVersion:paused.version,scopeHash:paused.scopeHash,externalConsent:wieder})).rejects.toMatchObject({reason:"outcome-unknown"});
      const otherGm=randomUUID();await local.query("INSERT INTO users(id,display_name,created_at) VALUES($1,'Historische Leitung',0)",[otherGm]);
      await local.query("INSERT INTO campaign_memberships(campaign_id,user_id,role,display_name,name_skeleton) VALUES($1,$2,'leitung','Historische Leitung','historischeleitung')",[f.campaignId,otherGm]);
      const fuerAndere={scopeHash:paused.scopeHash,token:(await resumed.preview(otherGm,f.campaignId,input)).freigabe!.token};
      await resumed.resume(otherGm,f.campaignId,ack.runId,{expectedVersion:paused.version,scopeHash:paused.scopeHash,acknowledgeUnknownOutcome:true,externalConsent:fuerAndere});
      await expect.poll(async()=>(await resumed!.getRun(gm,f.campaignId,ack.runId)).state,{timeout:10000}).toBe("completed");const finished=await resumed.getRun(gm,f.campaignId,ack.runId);
      expect(calls).toBe(4);expect(finished.usage.calls).toBe(4);expect(finished.usage.outputChars).toBeGreaterThan(paused.usage.outputChars);expect(finished.usage.reservedOutputChars).toBe(paused.usage.reservedOutputChars);
      await local.query("DELETE FROM campaign_memberships WHERE campaign_id=$1 AND user_id=$2",[f.campaignId,otherGm]);
      const historical=await exportCampaignBundle(local,gm,f.campaignId);expect(historical.version).toBe(16);expect(historical.tables.users.some(u=>u.id===otherGm)).toBe(true);
    }finally{await resumed?.close();await local.close();}
  },45000);
  it("überarbeitet jede Passage einzeln und setzt die neue Fassung an die Stelle der alten",async()=>{
    const f=await fixture([paragraph("Mara brach auf."),paragraph("Sie kam nicht zurück.")],false,db,"ueberarbeitung");
    // Berichtigt wird Kanon. Eine bloße Notiz ändert man in der Chronik, da ist nichts zu ersetzen.
    const gespeichert=await f.docs.source(f.campaignId,f.entry.entryId);
    for(const passage of gespeichert.passagen)
      await createGameplay(db).mintGesprochen(gm,f.campaignId,{commandId:randomUUID(),passageId:passage.pid,fictionDate:"812"});
    // Jede Prägung ist eine neue Fassung des Artikels: die Quellen danach frisch lesen.
    const refs=(await f.service.sources(gm,f.campaignId,{entryId:f.entry.entryId})).sources.map(s=>s.ref);
    const stand=(await f.docs.source(f.campaignId,f.entry.entryId)).entry.version;
    const input={mode:"ueberarbeitung" as const,sourceRefs:refs,providerId:"recorded",model:"recorded"};
    const preview=await f.service.preview(gm,f.campaignId,input);
    // Eine Passage, eine Einheit — genau das ist die Zusage, an der die Berichtigung hängt.
    expect(preview.modelUnits).toBe(2);
    const ack=await f.service.start(gm,f.campaignId,{...input,commandId:randomUUID(),scopeHash:preview.scopeHash});
    expect((await settled(f,ack.runId)).state).toBe("completed");
    const vorschlaege=(await f.service.suggestions(gm,f.campaignId,{runId:ack.runId})).suggestions;
    expect(vorschlaege).toHaveLength(2);
    for(const v of vorschlaege){
      expect(v.kind).toBe("ueberarbeitung");
      expect(v.sources).toHaveLength(1);
      expect(v.ueberarbeitet).toEqual({entryId:f.entry.entryId,passageId:v.sources[0]!.ref.passageId});
      // Mehrere Absätze, keine Textwand.
      expect(v.blocks.length).toBeGreaterThan(1);
    }
    const p=vorschlaege[0]!,fremd=vorschlaege[1]!;
    // Die Oberfläche darf sich das Ziel nicht ausdenken: eine fremde Passage wird abgewiesen.
    await expect(f.service.submitSuggestion(gm,f.campaignId,p.id,{commandId:randomUUID(),expectedVersion:p.version,expectedDraftHash:p.draftHash,
      target:{kind:"revision",entryId:f.entry.entryId,passageId:fremd.ueberarbeitet!.passageId,expectedVersion:stand}})).rejects.toMatchObject({reason:"proposal-version"});
    const submitted=await f.service.submitSuggestion(gm,f.campaignId,p.id,{commandId:randomUUID(),expectedVersion:p.version,expectedDraftHash:p.draftHash,
      target:{kind:"revision",entryId:f.entry.entryId,passageId:p.ueberarbeitet!.passageId,expectedVersion:stand}});
    expect(submitted.entryId).toBe(f.entry.entryId);
    expect(submitted.berichtigt).toBe(p.ueberarbeitet!.passageId);
    // Bis hierhin ist nichts ersetzt: der Antrag liegt daneben, die alte Passage steht unverändert.
    const vorher=await f.docs.source(f.campaignId,f.entry.entryId);
    expect(vorher.passagen.find(x=>x.pid===p.ueberarbeitet!.passageId)?.geltung).not.toBe("zurückgezogen");
    expect(vorher.passagen.find(x=>x.pid===submitted.passageIds[0]!)?.geltung).toBe("antrag");
    await createGameplay(db).mintBerichtigung(gm,f.campaignId,{commandId:randomUUID(),passageId:submitted.passageIds[0]!,
      fictionDate:"813",ersetztPassageId:submitted.berichtigt!});
    const nachher=await f.docs.source(f.campaignId,f.entry.entryId);
    const neue=nachher.passagen.find(x=>x.pid===submitted.passageIds[0]!)!;
    expect(neue.geltung).toBe("kanon");
    expect(neue.praegung).toEqual({art:"berichtigung",ersetzt:p.ueberarbeitet!.passageId});
  },45000);

  it("schreibt aus vielen Passagen einen Artikel in mehreren Absätzen",async()=>{
    const f=await fixture([paragraph("Mara brach auf und kam nicht zurück.")],false,db,"artikel");
    const input={mode:"artikel" as const,sourceRefs:f.sourceRefs,providerId:"recorded",model:"recorded"};
    const preview=await f.service.preview(gm,f.campaignId,input);
    const ack=await f.service.start(gm,f.campaignId,{...input,commandId:randomUUID(),scopeHash:preview.scopeHash});
    expect((await settled(f,ack.runId)).state).toBe("completed");
    const vorschlaege=(await f.service.suggestions(gm,f.campaignId,{runId:ack.runId})).suggestions;
    expect(vorschlaege.length).toBeGreaterThan(0);
    expect(vorschlaege.every(v=>v.kind==="artikel")).toBe(true);
    // Ein Artikel ist keine Überarbeitung: er ersetzt nichts, er entsteht neu.
    expect(vorschlaege.every(v=>v.ueberarbeitet===null)).toBe(true);
    expect(vorschlaege[0]!.blocks.length).toBeGreaterThan(1);
    const p=vorschlaege[0]!;
    const submitted=await f.service.submitSuggestion(gm,f.campaignId,p.id,{commandId:randomUUID(),expectedVersion:p.version,
      expectedDraftHash:p.draftHash,target:{kind:"new",title:"Maras Aufbruch"}});
    expect(submitted.berichtigt).toBeNull();
    expect((await f.docs.getEntry(gm,f.campaignId,submitted.entryId)).titel).toBe("Maras Aufbruch");
  },45000);
});
