// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { randomUUID } from "node:crypto";
import { Value } from "@sinclair/typebox/value";
import { admitChronistValue,createChronistGraph,deriveChronistFacts,planChronistUnits,chronistRuleCandidates,parseChronistBudget,
  CHRONIST_DEFAULT_BUDGET,type ChronistSnapshot,type ChronistStopReason } from "@chronicle/chronist";
import { ChronistPreview,StartChronistRun,ResumeChronistRun,type ChronistPreviewBody,type StartChronistRunBody,type ResumeChronistRunBody,
  type ChronistPreviewResult,type ChronistRunView,type ChronistRunPage,type ChronistStartAck } from "@chronicle/protocol";
import { chronistScopeHash,emptyChronistCheckpoints,type ChronistRunRow,type ChronistProviderRecord,type ChronistStartRequest,type ChronistControlEvidence } from "@chronicle/io";
import type { Db } from "../../db/index.ts";
import { createCampaigns } from "../campaigns.ts";
import { Gone } from "../errors.ts";
import { ChronistConflict,createChronistSources,collectChronistSources,chronistSourceStatus,lockChronistCampaign,pageLimit } from "./sources.ts";
import { createChronistProposals } from "./proposals.ts";
import { ChronistCheckpointSaver } from "./checkpointer.ts";
import { CHRONIST_DISPATCH_LOCK,chronistDbTime,createChronistStore,getChronistRun,hashChronist,recoverChronistRun,saveChronistRun,chronistUsage } from "./store.ts";
import type { ChronistProviderBinding,ChronistServiceConfig } from "./runtime.ts";
export function createChronistService(db:Db,config:ChronistServiceConfig={}){
  const owner=randomUUID(),running=new Map<string,{abort:AbortController;promise:Promise<void>}>();let closed=false;
  const sourceService=createChronistSources(db,config),proposals=createChronistProposals(db,config);
  async function providers(userId:string,campaignId:string){await createCampaigns(db,config).requireMember(userId,campaignId,["leitung"]);return {providers:config.chronist?.providers??[]};}
  function resolve(providerId:string,model:string):ChronistProviderBinding{const p=config.chronist?.resolveProvider(providerId,model);
    if(!p||p.description.id!==providerId||!p.description.models.includes(model))throw new Gone("chronist-provider");return p;}
  function recordProvider(binding:ChronistProviderBinding,model:string):ChronistProviderRecord{return {schemaVersion:1,description:binding.description,model,fingerprint:binding.fingerprint,profileId:binding.profileId};}
  async function prepare(tx:Db,userId:string,campaignId:string,input:ChronistPreviewBody){
    const binding=resolve(input.providerId,input.model),provider=recordProvider(binding,input.model),budget=parseChronistBudget({...CHRONIST_DEFAULT_BUDGET,...input.budget});
    if(input.mode==="sitzung"&&!input.sessionId)throw new Gone("saved-session-notes-required");
    const sources=await collectChronistSources(tx,userId,campaignId,input.sourceRefs,input.mode==="sitzung"?input.sessionId!:null);
    const base={schemaVersion:1 as const,graphVersion:"chronist-1" as const,mode:input.mode,sessionId:input.sessionId??null,sources,facts:deriveChronistFacts(sources),budget};
    if(base.sessionId&&!((await tx.query("SELECT id FROM game_sessions WHERE id=$1 AND campaign_id=$2",[base.sessionId,campaignId])).rowCount))throw new Gone("session");
    const scopeHash=chronistScopeHash(base,provider),snapshot:ChronistSnapshot={...base,scopeHash,runId:"scope-preview"},plans=planChronistUnits(snapshot);
    const findings=chronistRuleCandidates(snapshot).flatMap(c=>c.ruleFinding?[c.ruleFinding]:[]),sourceChars=sources.reduce((n,s)=>n+s.text.length,0);
    const maxCalls=plans.length*2,inputChars=maxCalls*budget.maxInputCharsPerCall,outputChars=plans.reduce((n,p)=>n+p.maxOutputChars*2,0),pricing=provider.description.pricing;
    const warnings:string[]=[];if(!provider.description.available)warnings.push("provider-unavailable");
    if(maxCalls>budget.maxCalls||inputChars>budget.maxInputChars||outputChars>budget.maxOutputChars)warnings.push("partial-budget");
    if(admitChronistValue({snapshot,plans}).bytes>8*1024*1024)throw new ChronistConflict("budget");
    const preview:ChronistPreviewResult={scopeHash,mode:input.mode,sessionId:base.sessionId,sources,sourceChars,budget,provider:provider.description,model:input.model,
      modelUnits:plans.length,maxCalls,ruleFindings:findings,estimate:{inputChars,outputChars,costMicros:null,currency:pricing?.currency??null},warnings};
    return {binding,provider,snapshot,preview};
  }
  async function preview(userId:string,campaignId:string,input:ChronistPreviewBody):Promise<ChronistPreviewResult>{admitChronistValue(input);if(!Value.Check(ChronistPreview,input))throw new Gone("chronist-input");
    return db.transaction(async tx=>{await lockChronistCampaign(tx,userId,campaignId);return (await prepare(tx,userId,campaignId,input)).preview;});}
  function request(userId:string,campaignId:string,input:StartChronistRunBody,providerFingerprint:string):ChronistStartRequest{
    const refs=[...new Map(input.sourceRefs.map(r=>[JSON.stringify([r.entryId,r.passageId,r.revisionId,r.contentHash]),r])).values()].sort((a,b)=>{
      for(const key of ["entryId","passageId","revisionId","contentHash"] as const){if(a[key]<b[key])return -1;if(a[key]>b[key])return 1;}return 0;});
    return {schemaVersion:1,operation:"chronist.start",actorUserId:userId,campaignId,commandId:input.commandId,scopeHash:input.scopeHash,
      mode:input.mode,sessionId:input.sessionId??null,sourceRefs:refs,providerId:input.providerId,model:input.model,providerFingerprint,
      budget:parseChronistBudget({...CHRONIST_DEFAULT_BUDGET,...input.budget}),externalConsent:input.externalConsent??null};
  }
  const consent=(binding:ChronistProviderBinding,scopeHash:string,value:{scopeHash:string}|undefined)=>{
    if(binding.description.location==="fremd"&&value?.scopeHash!==scopeHash)throw new ChronistConflict("scope-changed");
    if(binding.description.location==="lokal"&&value!==undefined)throw new Gone("external-consent-unexpected");return value??null;};
  async function view(tx:Db,run:ChronistRunRow):Promise<ChronistRunView>{const count=Number((await tx.query<{count:string}>("SELECT count(*)::text AS count FROM chronist_vorschlaege WHERE run_id=$1",[run.id])).rows[0]!.count),at=await chronistDbTime(tx,config),expired=run.state==="running"&&Number(run.lease_until)<=at;
    return {runId:run.id,version:run.version,state:expired?"paused":run.state,mode:run.mode,sessionId:run.session_id,scopeHash:run.snapshot.scopeHash,provider:run.provider.description,model:run.provider.model,
      createdAt:Number(run.created_at),updatedAt:Number(run.updated_at),stopReason:run.stop_reason,cancelRequested:run.cancel_requested,budget:run.snapshot.budget,
      usage:chronistUsage(run,await chronistDbTime(tx,config)),sources:run.snapshot.sources,unknownCalls:run.evidence.calls.filter(c=>c.state==="unknown").length,
      progress:{modelUnits:run.evidence.plans.length,recordedCalls:run.evidence.calls.filter(c=>c.outcome!==null).length,suggestions:count,rejections:run.evidence.rejections.reduce((n,r)=>n+r.count,0)},
      actions:expired?["resume"]:run.state==="running"?["cancel"]:run.state==="completed"?[]:["resume"]};}
  async function getRun(userId:string,campaignId:string,runId:string):Promise<ChronistRunView>{return db.transaction(async tx=>{await lockChronistCampaign(tx,userId,campaignId);return view(tx,await getChronistRun(tx,campaignId,runId));});}
  async function listRuns(userId:string,campaignId:string,options:{after?:string;limit?:number}={}):Promise<ChronistRunPage>{return db.transaction(async tx=>{
    await lockChronistCampaign(tx,userId,campaignId);const limit=pageLimit(options.limit),rows=(await tx.query<ChronistRunRow>(`SELECT * FROM chronist_laeufe WHERE campaign_id=$1
      AND ($2::text IS NULL OR id COLLATE "C">$2 COLLATE "C") ORDER BY id COLLATE "C" LIMIT $3`,[campaignId,options.after??null,limit+1])).rows;
    return {runs:await Promise.all(rows.slice(0,limit).map(r=>view(tx,r))),after:rows.length>limit?rows[limit-1]!.id:null,complete:rows.length<=limit};});}
  function launch(run:ChronistRunRow,binding:ChronistProviderBinding,resume:boolean):void{
    if(closed||running.has(run.id))return;const abort=new AbortController(),control=run.evidence.controlEvidence.at(-1)!;
    const store=createChronistStore(db,config,{runId:run.id,campaignId:run.campaign_id,actorUserId:control.actorUserId,executionId:control.executionId,fence:run.fence,owner,provider:binding});
    const saver=new ChronistCheckpointSaver(run.id,store.transaction),graph=createChronistGraph({effects:store.effects,provider:{prepare:binding.prepare,invoke:binding.bind(store.consumePermit,store.checkDispatch)},checkpointer:saver});
    const timer=setTimeout(()=>abort.abort(),Math.max(1,run.snapshot.budget.maxActiveMs-chronistUsage(run).activeMs));timer.unref();
    const promise=Promise.resolve().then(()=>resume?graph.resume(run.id,abort.signal):graph.start(run.snapshot,abort.signal)).catch(async(error:unknown)=>{
      const reason:ChronistStopReason=error instanceof ChronistConflict&&["budget","source-stale","authorization","scope-changed"].includes(error.reason)?error.reason as ChronistStopReason:abort.signal.aborted?"cancelled":"provider-unavailable";
      await db.transaction(async tx=>{await tx.query("SELECT pg_advisory_xact_lock($1)",[CHRONIST_DISPATCH_LOCK]);await tx.query("SELECT id FROM campaigns WHERE id=$1 FOR UPDATE",[run.campaign_id]);
        const current=await getChronistRun(tx,run.campaign_id,run.id,true);if(current.fence!==run.fence||current.lease_owner!==owner||current.state!=="running")return;
        const at=await chronistDbTime(tx,config);recoverChronistRun(current,at);current.stop_reason=current.evidence.calls.some(c=>c.state==="unknown")?"outcome-unknown":reason;current.version++;await saveChronistRun(tx,current);
      }).catch(()=>undefined);
    }).finally(()=>{clearTimeout(timer);running.delete(run.id);});running.set(run.id,{abort,promise});
  }
  async function start(userId:string,campaignId:string,input:StartChronistRunBody):Promise<ChronistStartAck>{admitChronistValue(input);if(!Value.Check(StartChronistRun,input))throw new Gone("chronist-input");if(closed)throw new Gone("chronist-closed");
    const result=await db.transaction(async tx=>{await tx.query("SELECT pg_advisory_xact_lock($1)",[CHRONIST_DISPATCH_LOCK]);await lockChronistCampaign(tx,userId,campaignId);
      const existing=(await tx.query<ChronistRunRow>("SELECT * FROM chronist_laeufe WHERE campaign_id=$1 AND created_by=$2 AND start_command_id=$3",[campaignId,userId,input.commandId])).rows[0];
      if(existing){if(existing.request_hash!==hashChronist("start-request",request(userId,campaignId,input,existing.provider.fingerprint)))throw new ChronistConflict("command-conflict");return {ack:existing.start_ack};}
      const prepared=await prepare(tx,userId,campaignId,input);if(prepared.snapshot.scopeHash!==input.scopeHash)throw new ChronistConflict("scope-changed");
      const externalConsent=consent(prepared.binding,input.scopeHash,input.externalConsent),at=await chronistDbTime(tx,config);
      const active=(await tx.query<ChronistRunRow>("SELECT * FROM chronist_laeufe WHERE campaign_id=$1 AND state='running' FOR UPDATE",[campaignId])).rows[0];
      if(active){if(Number(active.lease_until)>at)throw new ChronistConflict("call-in-flight");recoverChronistRun(active,at);active.version++;await saveChronistRun(tx,active);}
      const id=randomUUID(),executionId=randomUUID(),snapshot={...prepared.snapshot,runId:id},startRequest=request(userId,campaignId,input,prepared.provider.fingerprint),ack:ChronistStartAck={runId:id,version:1,state:"running"};
      const control:ChronistControlEvidence={schemaVersion:1,executionId,kind:"start",actorUserId:userId,decidedAt:at,scopeHash:input.scopeHash,providerFingerprint:prepared.provider.fingerprint,externalConsent,acknowledgeUnknownOutcome:false};
      const run:ChronistRunRow={id,campaign_id:campaignId,created_by:userId,created_at:String(at),updated_at:String(at),version:1,state:"running",mode:input.mode,session_id:input.sessionId??null,
        start_command_id:input.commandId,start_request:startRequest,request_hash:hashChronist("start-request",startRequest),start_ack:ack,snapshot,provider:prepared.provider,
        evidence:{schemaVersion:1,controlEvidence:[control],plans:planChronistUnits(snapshot),units:[],calls:[],rejections:[],executions:[{executionId,actorUserId:userId,fence:1,startedAt:at,accountedThrough:at,reservedUntil:at+Math.min(5000,snapshot.budget.maxActiveMs),closedAt:null,closeKind:null}]},
        checkpoints:emptyChronistCheckpoints(),stop_reason:null,cancel_requested:false,fence:1,lease_owner:owner,lease_until:String(at+Math.min(5000,snapshot.budget.maxActiveMs))};
      await tx.query(`INSERT INTO chronist_laeufe(id,campaign_id,created_by,created_at,updated_at,version,state,mode,session_id,start_command_id,start_request,request_hash,start_ack,snapshot,provider,evidence,checkpoints,stop_reason,cancel_requested,fence,lease_owner,lease_until)
        VALUES($1,$2,$3,$4,$4,1,'running',$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,NULL,false,1,$15,$16)`,[id,campaignId,userId,at,input.mode,input.sessionId??null,input.commandId,JSON.stringify(startRequest),run.request_hash,JSON.stringify(ack),JSON.stringify(snapshot),JSON.stringify(run.provider),JSON.stringify(run.evidence),JSON.stringify(run.checkpoints),owner,run.lease_until]);
      await saveChronistRun(tx,run);return {ack,run,binding:prepared.binding};});
    if(result.run&&result.binding)launch(result.run,result.binding,false);return result.ack;
  }
  async function resume(userId:string,campaignId:string,runId:string,input:ResumeChronistRunBody):Promise<ChronistRunView>{admitChronistValue(input);if(!Value.Check(ResumeChronistRun,input))throw new Gone("chronist-input");if(closed)throw new Gone("chronist-closed");
    const result=await db.transaction(async tx=>{await tx.query("SELECT pg_advisory_xact_lock($1)",[CHRONIST_DISPATCH_LOCK]);await lockChronistCampaign(tx,userId,campaignId);
      const run=await getChronistRun(tx,campaignId,runId,true),at=await chronistDbTime(tx,config),last=run.evidence.controlEvidence.at(-1)!;
      if(run.state==="running"&&run.version===input.expectedVersion+1&&last.kind==="resume"&&last.actorUserId===userId&&last.scopeHash===input.scopeHash
        &&hashChronist("control",last.externalConsent)===hashChronist("control",input.externalConsent??null)&&last.acknowledgeUnknownOutcome===(input.acknowledgeUnknownOutcome??false))return {view:await view(tx,run)};
      if(run.version!==input.expectedVersion||run.state==="completed")throw new ChronistConflict("run-version");
      if(run.state==="running"&&Number(run.lease_until)>at)throw new ChronistConflict("call-in-flight");
      if(run.state==="running"||run.evidence.executions.some(e=>e.closedAt===null))recoverChronistRun(run,at);
      const binding=resolve(run.provider.description.id,run.provider.model);
      if(!binding.description.available&&run.evidence.plans.length)throw new ChronistConflict("provider-unavailable");
      if(binding.fingerprint!==run.provider.fingerprint||binding.profileId!==run.provider.profileId||input.scopeHash!==run.snapshot.scopeHash)throw new ChronistConflict("scope-changed");
      const status=await chronistSourceStatus(tx,userId,campaignId,run.snapshot.sources);if(status.stale)throw new ChronistConflict("source-stale");
      const externalConsent=consent(binding,input.scopeHash,input.externalConsent);if(run.evidence.calls.some(c=>c.state==="unknown")&&!input.acknowledgeUnknownOutcome)throw new ChronistConflict("outcome-unknown");
      const active=(await tx.query<ChronistRunRow>("SELECT * FROM chronist_laeufe WHERE campaign_id=$1 AND state='running' AND id<>$2 FOR UPDATE",[campaignId,runId])).rows[0];
      if(active){if(Number(active.lease_until)>at)throw new ChronistConflict("call-in-flight");recoverChronistRun(active,at);active.version++;await saveChronistRun(tx,active);}
      const used=chronistUsage(run).activeMs;if(used>=run.snapshot.budget.maxActiveMs)throw new ChronistConflict("budget");
      const executionId=randomUUID(),startedAt=Math.max(at,...run.evidence.executions.map(e=>e.closedAt??e.reservedUntil));if(startedAt>at)throw new ChronistConflict("call-in-flight");
      run.fence++;run.version++;run.state="running";run.stop_reason=null;run.cancel_requested=false;run.lease_owner=owner;run.lease_until=String(at+Math.min(5000,run.snapshot.budget.maxActiveMs-used));
      run.evidence.controlEvidence.push({schemaVersion:1,executionId,kind:"resume",actorUserId:userId,decidedAt:at,scopeHash:input.scopeHash,providerFingerprint:binding.fingerprint,externalConsent,acknowledgeUnknownOutcome:input.acknowledgeUnknownOutcome??false});
      run.evidence.executions.push({executionId,actorUserId:userId,fence:run.fence,startedAt:at,accountedThrough:at,reservedUntil:Number(run.lease_until),closedAt:null,closeKind:null});run.updated_at=String(at);
      await saveChronistRun(tx,run);return {view:await view(tx,run),run,binding};});
    if(result.run&&result.binding){await running.get(runId)?.promise;launch(result.run,result.binding,true);}return result.view;
  }
  async function cancel(userId:string,campaignId:string,runId:string,expectedVersion:number):Promise<ChronistRunView>{const result=await db.transaction(async tx=>{
    await tx.query("SELECT pg_advisory_xact_lock($1)",[CHRONIST_DISPATCH_LOCK]);await lockChronistCampaign(tx,userId,campaignId);const run=await getChronistRun(tx,campaignId,runId,true);
    if(run.cancel_requested&&(run.version===expectedVersion+1||run.version===expectedVersion))return view(tx,run);
    if(run.version!==expectedVersion||run.state!=="running")throw new ChronistConflict("run-version");run.cancel_requested=true;run.version++;run.updated_at=String(await chronistDbTime(tx,config));await saveChronistRun(tx,run);return view(tx,run);});running.get(runId)?.abort.abort();return result;}
  async function close():Promise<void>{closed=true;for(const r of running.values())r.abort.abort();
    let timer:ReturnType<typeof setTimeout>|undefined;try{await Promise.race([Promise.allSettled([...running.values()].map(r=>r.promise)),new Promise<never>((_resolve,reject)=>{timer=setTimeout(()=>reject(new Error("chronist-drain-timeout")),5000);})]);}finally{if(timer)clearTimeout(timer);}}
  return {providers,preview,start,resume,cancel,getRun,listRuns,close,...sourceService,...proposals};
}
