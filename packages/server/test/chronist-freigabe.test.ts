// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { randomUUID } from "node:crypto";
import { afterAll,beforeAll,describe,expect,it } from "vitest";
import { renderChronistUnit,type ChronistCallOutcome } from "@chronicle/chronist";
import { createCurrentCampaignBundle,currentCampaignTables,type ChronistRunRow } from "@chronicle/io";
import type { ChronistPreviewBody,ChronistProviderDescription } from "@chronicle/protocol";
import { createTestDb,migrate,type Db } from "../src/db/index.ts";
import { createIdentity } from "../src/identity/index.ts";
import { createCampaigns } from "../src/domain/campaigns.ts";
import { createDocuments } from "../src/domain/documents.ts";
import { createChronistService } from "../src/domain/chronist/service.ts";
import type { ChronistProviderBinding } from "../src/domain/chronist/runtime.ts";
import { freigabeHash,issueFreigabe,verifyFreigabe } from "../src/domain/chronist/freigabe.ts";
import { exportCampaignBundle } from "../src/domain/bundles.ts";
import { buildApp } from "../src/app.ts";


/** The signing secret of the running application. A token never leaves this boundary as bytes. */
const cookieSecret="chronist-freigabe-cookie-secret-at-least-32-characters";
const identityConfig={origin:"https://chronist-freigabe.test",cookieSecret};
let clock=1788696000000;const now=()=>clock;
const paragraph=(text:string)=>({inhalt:{kind:"absatz" as const,inhalt:[{text,marks:[]}]}});
const failedUsage=(inputChars:number)=>({inputChars,outputChars:0,outputComplete:true,inputTokens:null,outputTokens:null,
  tokensComplete:false,durationMs:1,costMicros:null,currency:null,costKind:"unknown" as const,costComplete:false});

describe("server-issued Chronist egress release",()=>{
  let db:Db,gm:string;const services:ReturnType<typeof createChronistService>[]=[];
  beforeAll(async()=>{db=await createTestDb();await migrate(db);gm=(await createIdentity(db,identityConfig).bootstrap("Kaya")).userId;},30000);
  afterAll(async()=>{for(const service of services)await service.close();await db.close();});
  async function fixture(options:{external?:boolean;pricing?:ChronistProviderDescription["pricing"];fail?:boolean}={}){
    const campaignId=(await createCampaigns(db).createCampaign(gm,{name:"Freigabe"})).id,docs=createDocuments(db);
    const entry=await docs.saveEntry(gm,campaignId,{title:"Mara",passages:[paragraph("Mara brach auf.")]});let calls=0;
    const binding:ChronistProviderBinding={fingerprint:"a".repeat(64),profileId:"ollama-chat-1",
      description:{id:"recorded",label:"Aufzeichnung",location:options.external?"fremd":"lokal",transport:"http",available:true,
        availabilityCode:null,models:["recorded"],pricing:options.pricing??null},
      prepare:(plan,snapshot,attempt,parents)=>renderChronistUnit("ollama-chat-1","recorded","a".repeat(64),plan,snapshot,attempt,parents),
      bind:consume=>async(unit,permit)=>{expect(await consume(permit,unit)).toBe(true);calls++;
        if(options.fail)return {kind:"failed",code:"unavailable",mayHaveExecuted:false,usage:failedUsage(unit.dispatch.inputChars)} as ChronistCallOutcome;
        const citation=unit.sourceSpans[0]!,text=JSON.stringify({schemaVersion:1,candidates:[{kind:"abriss",text:"Mara brach auf.",citations:[citation],date:null}]});
        return {kind:"returned",reply:{text},usage:{...failedUsage(unit.dispatch.inputChars),outputChars:text.length,inputTokens:13,outputTokens:17,tokensComplete:true}} as ChronistCallOutcome;}};
    const service=createChronistService(db,{cookieSecret,now,chronist:{providers:[binding.description],resolveProvider:()=>binding}});
    services.push(service);
    const sourceRefs=(await service.sources(gm,campaignId,{entryId:entry.entryId})).sources.map(source=>source.ref);
    const input:ChronistPreviewBody={mode:"abriss",sourceRefs,providerId:"recorded",model:"recorded"};
    return {campaignId,docs,entry,service,binding,input,calls:()=>calls};
  }
  /** Der dauerhafte Beleg selbst; die Schemadeckung des Exports prüft `native-v16-roundtrip`. */
  const storedRun=async(runId:string)=>(await db.query<ChronistRunRow>("SELECT * FROM chronist_laeufe WHERE id=$1",[runId])).rows[0]!;
  const settled=async(f:Awaited<ReturnType<typeof fixture>>,runId:string)=>{
    await expect.poll(async()=>(await f.service.getRun(gm,f.campaignId,runId)).state,{timeout:15000,interval:30}).not.toBe("running");
    return f.service.getRun(gm,f.campaignId,runId);};

  it("weist einen externen Start ohne Freigabe ab, ohne einen Aufruf zu senden",async()=>{
    const f=await fixture({external:true}),preview=await f.service.preview(gm,f.campaignId,f.input);
    expect(preview.freigabe).not.toBeNull();expect(preview.freigabe!.ablaufAt).toBe(clock+300_000);
    await expect(f.service.start(gm,f.campaignId,{...f.input,scopeHash:preview.scopeHash,commandId:randomUUID()}))
      .rejects.toMatchObject({reason:"freigabe-missing"});
    expect(f.calls()).toBe(0);
  },20000);

  it("weist eine Freigabe einer fremden Kampagne ab",async()=>{
    const a=await fixture({external:true}),b=await fixture({external:true});
    const pa=await a.service.preview(gm,a.campaignId,a.input),pb=await b.service.preview(gm,b.campaignId,b.input);
    await expect(a.service.start(gm,a.campaignId,{...a.input,scopeHash:pa.scopeHash,commandId:randomUUID(),
      externalConsent:{scopeHash:pa.scopeHash,token:pb.freigabe!.token}})).rejects.toMatchObject({reason:"scope-changed"});
    expect(a.calls()).toBe(0);expect(b.calls()).toBe(0);
  },20000);

  it("weist die Freigabe eines anderen Nutzers ab",async()=>{
    const f=await fixture({external:true}),other=randomUUID();
    await db.query("INSERT INTO users(id,display_name,created_at) VALUES($1,'Zweite Leitung',0)",[other]);
    await db.query("INSERT INTO campaign_memberships(campaign_id,user_id,role,display_name,name_skeleton) VALUES($1,$2,'leitung','Zweite Leitung','zweiteleitung')",[f.campaignId,other]);
    const mine=await f.service.preview(gm,f.campaignId,f.input),theirs=await f.service.preview(other,f.campaignId,f.input);
    expect(theirs.scopeHash).toBe(mine.scopeHash);expect(theirs.freigabe!.token).not.toBe(mine.freigabe!.token);
    await expect(f.service.start(gm,f.campaignId,{...f.input,scopeHash:mine.scopeHash,commandId:randomUUID(),
      externalConsent:{scopeHash:mine.scopeHash,token:theirs.freigabe!.token}})).rejects.toMatchObject({reason:"scope-changed"});
    expect(f.calls()).toBe(0);
  },20000);

  it("weist eine abgelaufene Freigabe ab",async()=>{
    const f=await fixture({external:true}),preview=await f.service.preview(gm,f.campaignId,f.input);
    clock+=300_000+1000;
    await expect(f.service.start(gm,f.campaignId,{...f.input,scopeHash:preview.scopeHash,commandId:randomUUID(),
      externalConsent:{scopeHash:preview.scopeHash,token:preview.freigabe!.token}})).rejects.toMatchObject({reason:"freigabe-expired"});
    expect(f.calls()).toBe(0);
  },20000);

  it("verbraucht eine Freigabe genau einmal und belegt sie ohne das Token",async()=>{
    const f=await fixture({external:true}),preview=await f.service.preview(gm,f.campaignId,f.input);
    const externalConsent={scopeHash:preview.scopeHash,token:preview.freigabe!.token};
    const ack=await f.service.start(gm,f.campaignId,{...f.input,scopeHash:preview.scopeHash,commandId:randomUUID(),externalConsent});
    expect((await settled(f,ack.runId)).state).toBe("completed");expect(f.calls()).toBe(1);
    await expect(f.service.start(gm,f.campaignId,{...f.input,scopeHash:preview.scopeHash,commandId:randomUUID(),externalConsent}))
      .rejects.toMatchObject({reason:"freigabe-used"});
    expect(f.calls()).toBe(1);
    const run=await storedRun(ack.runId),control=run.evidence.controlEvidence[0]!;
    expect(JSON.stringify(run)).not.toContain(externalConsent.token);
    expect(control.freigabeHash).toMatch(/^[a-f0-9]{64}$/);
    expect(control.freigabeAblaufAt).toBe(preview.freigabe!.ablaufAt);
    expect(control.externalConsent).toEqual({scopeHash:preview.scopeHash});
    expect(run.start_request.externalConsent).toEqual({scopeHash:preview.scopeHash});
  },30000);

  it("verlangt für eine Fortsetzung eine frische Freigabe",async()=>{
    const f=await fixture({external:true,fail:true}),first=await f.service.preview(gm,f.campaignId,f.input);
    const consumed={scopeHash:first.scopeHash,token:first.freigabe!.token};
    const ack=await f.service.start(gm,f.campaignId,{...f.input,scopeHash:first.scopeHash,commandId:randomUUID(),externalConsent:consumed});
    const paused=await settled(f,ack.runId);expect(paused.state).toBe("paused");
    await expect(f.service.resume(gm,f.campaignId,ack.runId,{expectedVersion:paused.version,scopeHash:paused.scopeHash,externalConsent:consumed}))
      .rejects.toMatchObject({reason:"freigabe-used"});
    const fresh=await f.service.preview(gm,f.campaignId,f.input);
    expect(fresh.freigabe!.token).not.toBe(consumed.token);
    const resumed=await f.service.resume(gm,f.campaignId,ack.runId,{expectedVersion:paused.version,scopeHash:paused.scopeHash,
      externalConsent:{scopeHash:paused.scopeHash,token:fresh.freigabe!.token}});
    expect(resumed.version).toBe(paused.version+1);
    await settled(f,ack.runId);
    const run=await storedRun(ack.runId);
    expect(run.evidence.controlEvidence).toHaveLength(2);
    expect(run.evidence.controlEvidence.map(control=>control.freigabeHash)).toEqual([expect.stringMatching(/^[a-f0-9]{64}$/),expect.stringMatching(/^[a-f0-9]{64}$/)]);
    expect(run.evidence.controlEvidence[1]!.freigabeAblaufAt).toBe(fresh.freigabe!.ablaufAt);
    expect(JSON.stringify(run)).not.toContain(fresh.freigabe!.token);
    expect(JSON.stringify(run)).not.toContain(consumed.token);
  },40000);

  it("verbietet ein Token bei lokaler Verarbeitung",async()=>{
    const local=await fixture(),remote=await fixture({external:true});
    const remotePreview=await remote.service.preview(gm,remote.campaignId,remote.input);
    const localPreview=await local.service.preview(gm,local.campaignId,local.input);
    expect(localPreview.freigabe).toBeNull();
    await expect(local.service.start(gm,local.campaignId,{...local.input,scopeHash:localPreview.scopeHash,commandId:randomUUID(),
      externalConsent:{scopeHash:localPreview.scopeHash,token:remotePreview.freigabe!.token}}))
      .rejects.toMatchObject({reason:"external-consent-unexpected"});
    expect(local.calls()).toBe(0);expect(remote.calls()).toBe(0);
  },20000);

  it("schätzt die Kosten als obere Schranke, wenn ein Tarif hinterlegt ist",async()=>{
    const pricing={currency:"USD",inputMicrosPerMillion:2_000_000,outputMicrosPerMillion:10_000_000,asOf:"2026-09-08"};
    const f=await fixture({external:true,pricing}),preview=await f.service.preview(gm,f.campaignId,f.input);
    // Nicht die Formel nachbauen, sonst macht der Test jeden Rechenfehler mit — genau das ist
    // hier passiert: die Ausgabe ging einmal ungeteilt als Tokenzahl ein und war 4x zu hoch.
    // Beide Budgets sind ZEICHEN; vier Zeichen sind ein Token, in beide Richtungen.
    const calls=Math.min(preview.maxCalls,preview.budget.maxCalls);
    const eingabeTokenProCall=Math.ceil(preview.budget.maxInputCharsPerCall/4);
    const ausgabeTokenProCall=Math.max(64,Math.min(16_000,Math.ceil(preview.budget.maxOutputCharsPerCall/4)));
    expect(calls).toBeGreaterThan(0);
    expect(ausgabeTokenProCall).toBeLessThan(preview.budget.maxOutputCharsPerCall);
    const eingabeAnteil=calls*eingabeTokenProCall*2_000_000/1e6, ausgabeAnteil=calls*ausgabeTokenProCall*10_000_000/1e6;
    expect(preview.estimate.costMicros).toBe(Math.ceil(eingabeAnteil+ausgabeAnteil));
    // Gegenprobe gegen die alte, falsche Rechnung: sie lag um das Vierfache des Ausgabeanteils daneben.
    expect(preview.estimate.costMicros).toBeLessThan(Math.ceil(eingabeAnteil+ausgabeAnteil*4));
    expect(preview.estimate.costMicros!).toBeGreaterThan(0);
    expect(preview.estimate.costKind).toBe("estimated");
    expect(preview.estimate.currency).toBe("USD");
  },20000);

  it("erkennt eine nicht-kanonische Schreibweise desselben Tokens",async()=>{
    const claim={campaignId:"k",userId:"u",scopeHash:"0".repeat(64),providerFingerprint:"a".repeat(64),model:"m"};
    const {token}=issueFreigabe(cookieSecret,claim,clock);
    expect(verifyFreigabe(cookieSecret,token,claim,clock)).toBe("ok");
    for(const zusatz of ["A","-","_"]){
      const verbogen=token+zusatz;
      // Dieselben Bytes, dieselbe gültige Signatur — aber eine andere Zeichenkette. Ohne
      // kanonische Kodierung wäre aus einem Einmal-Token ein Vorrat geworden.
      expect(Buffer.from(verbogen,"base64url").equals(Buffer.from(token,"base64url"))).toBe(true);
      expect(verifyFreigabe(cookieSecret,verbogen,claim,clock)).toBe("malformed");
      expect(freigabeHash(verbogen)).toBe(freigabeHash(token));
    }
    expect(verifyFreigabe(cookieSecret,token,{...claim,userId:"andere"},clock)).toBe("mismatch");
    expect(verifyFreigabe(cookieSecret,"nicht-base64url!!",claim,clock)).toBe("malformed");
  },20000);

  it("verbraucht eine Freigabe auch für ein frisches Dienstobjekt dauerhaft",async()=>{
    const f=await fixture({external:true}),preview=await f.service.preview(gm,f.campaignId,f.input);
    const externalConsent={scopeHash:preview.scopeHash,token:preview.freigabe!.token};
    const ack=await f.service.start(gm,f.campaignId,{...f.input,scopeHash:preview.scopeHash,commandId:randomUUID(),externalConsent});
    expect((await settled(f,ack.runId)).state).toBe("completed");
    // Ein Neustart bringt eine leere Map mit; der Beleg in der Datenbank bringt die Wahrheit.
    expect((await db.query("SELECT 1 FROM chronist_laeufe WHERE evidence->'controlEvidence' @> $1::jsonb",
      [JSON.stringify([{freigabeHash:freigabeHash(externalConsent.token)}])])).rowCount).toBe(1);
    const neu=createChronistService(db,{cookieSecret,now,chronist:{providers:[f.binding.description],resolveProvider:()=>f.binding}});
    services.push(neu);
    await expect(neu.start(gm,f.campaignId,{...f.input,scopeHash:preview.scopeHash,commandId:randomUUID(),externalConsent}))
      .rejects.toMatchObject({reason:"freigabe-used"});
    expect(f.calls()).toBe(1);
  },30000);

  it("liest Altbestand ohne Freigabefelder und weist einen fremden Beleg mit null ab",async()=>{
    const f=await fixture({external:true}),preview=await f.service.preview(gm,f.campaignId,f.input);
    const ack=await f.service.start(gm,f.campaignId,{...f.input,scopeHash:preview.scopeHash,commandId:randomUUID(),
      externalConsent:{scopeHash:preview.scopeHash,token:preview.freigabe!.token}});
    await settled(f,ack.runId);
    const bundle=await exportCampaignBundle(db,gm,f.campaignId),base=currentCampaignTables(bundle);
    const rebuild=(tables:unknown)=>createCurrentCampaignBundle({campaignId:f.campaignId,universeId:bundle.manifest.universeId,
      exportedAt:bundle.manifest.exportedAt,tables:tables as ReturnType<typeof currentCampaignTables>});
    expect(()=>rebuild(structuredClone(base))).not.toThrow();
    const alt=structuredClone(base) as unknown as {chronist_laeufe:{evidence:{controlEvidence:Record<string,unknown>[]}}[]};
    for(const control of alt.chronist_laeufe[0]!.evidence.controlEvidence){delete control.freigabeAblaufAt;delete control.freigabeHash;}
    expect(()=>rebuild(alt)).not.toThrow();
    for(const feld of ["freigabeAblaufAt","freigabeHash"]){
      const leer=structuredClone(base) as unknown as {chronist_laeufe:{evidence:{controlEvidence:Record<string,unknown>[]}}[]};
      leer.chronist_laeufe[0]!.evidence.controlEvidence[0]![feld]=null;
      expect(()=>rebuild(leer)).toThrow();
    }
    const halb=structuredClone(base) as unknown as {chronist_laeufe:{evidence:{controlEvidence:Record<string,unknown>[]}}[]};
    delete halb.chronist_laeufe[0]!.evidence.controlEvidence[0]!.freigabeHash;
    expect(()=>rebuild(halb)).toThrow();
  },30000);

  it("verlangt ein ausreichendes Anwendungsgeheimnis und reicht es über den Anwendungsrahmen durch",async()=>{
    expect(()=>createChronistService(db,{cookieSecret:"zu-kurz"})).toThrow(/at least 32 characters/);
    const ohne=createChronistService(db,{now,chronist:{providers:[],resolveProvider:()=>undefined}});services.push(ohne);
    const f=await fixture({external:true});
    const app=await buildApp(db,{...identityConfig,bootstrapToken:"chronist-freigabe-bootstrap-at-least-32-characters",
      chronist:{providers:[f.binding.description],resolveProvider:()=>f.binding}});
    try{
      const session=await createIdentity(db,identityConfig).issueSession(gm),cookie=session.setCookie.split(";")[0]!;
      const reply=await app.inject({method:"POST",url:`/api/campaigns/${f.campaignId}/chronist/runs/preview`,
        headers:{cookie,origin:identityConfig.origin},payload:f.input});
      expect(reply.statusCode).toBe(200);
      // Der echte Anwendungsrahmen signiert mit seinem cookieSecret, nicht mit einem Prozessschlüssel.
      const freigabe=(reply.json() as {freigabe:{token:string}|null}).freigabe;
      expect(freigabe).not.toBeNull();
      expect(verifyFreigabe(cookieSecret,freigabe!.token,{campaignId:f.campaignId,userId:gm,
        scopeHash:(reply.json() as {scopeHash:string}).scopeHash,providerFingerprint:f.binding.fingerprint,model:"recorded"},Date.now())).toBe("ok");
    }finally{await app.close();}
  },30000);

  it("weist die Schätzung ohne hinterlegten Tarif als unbekannt aus",async()=>{
    const f=await fixture({external:true}),preview=await f.service.preview(gm,f.campaignId,f.input);
    expect(preview.estimate.costMicros).toBeNull();
    expect(preview.estimate.costKind).toBe("unknown");
    expect(preview.estimate.currency).toBeNull();
  },20000);
});
