// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { randomUUID } from "node:crypto";
import { admitChronistValue, chronistCandidateHash, chronistHash, chronistRuleCandidates, parseChronistCallOutcome,
  parseChronistCandidate, parseChronistModelUnit, parseChronistModelReply,candidateFromDraft,verifyChronistCandidate, type ChronistEffectsPort, type ChronistModelUnit,
  type ChronistCallPermit, type ChronistCallOutcome, type ChronistStopReason, type ChronistCandidate } from "@chronicle/chronist";
import type { CanonicalValue } from "@chronicle/core";
import type { ChronistRunRow, ChronistProposalRow, ChronistCallRecord, ChronistExecution } from "@chronicle/io";
import type { ChronistUsageView } from "@chronicle/protocol";
import type { Db } from "../../db/index.ts";
import { createCampaigns } from "../campaigns.ts";
import { Gone } from "../errors.ts";
import { ChronistConflict, chronistSourceStatus, lockChronistCampaign } from "./sources.ts";
import type { ChronistProviderBinding, ChronistServiceConfig } from "./runtime.ts";
export const CHRONIST_DISPATCH_LOCK=7342646;
export const CHRONIST_EVIDENCE_BYTES=16*1024*1024,CHRONIST_DRAFT_BYTES=2*1024*1024;
export const hashChronist=(kind:string,value:unknown)=>chronistHash(kind,value as CanonicalValue);
export async function chronistDbTime(tx:Db,cfg:ChronistServiceConfig={}):Promise<number>{
  if(cfg.now)return cfg.now();return Number((await tx.query<{now:string}>("SELECT floor(extract(epoch FROM clock_timestamp())*1000)::bigint::text AS now")).rows[0]!.now);
}
export async function getChronistRun(tx:Db,campaignId:string,runId:string,lock=false):Promise<ChronistRunRow>{
  const row=(await tx.query<ChronistRunRow>(`SELECT * FROM chronist_laeufe WHERE id=$1 AND campaign_id=$2${lock?" FOR UPDATE":""}`,[runId,campaignId])).rows[0];
  if(!row)throw new Gone("chronist-run");return row;
}
export function chronistUsage(run:ChronistRunRow,at=0):ChronistUsageView{
  const calls=run.evidence.calls;let outputChars=0,reservedOutputChars=0,inputTokens=0,outputTokens=0,costMicros=0;
  let tokensComplete=true,costComplete=true,currency:string|null=null;
  for(const c of calls){const u=c.usage;outputChars+=u?.outputChars??0;if(!u?.outputComplete)reservedOutputChars+=c.reservation.outputChars-(u?.outputChars??0);
    inputTokens+=u?.inputTokens??0;outputTokens+=u?.outputTokens??0;costMicros+=u?.costMicros??0;
    tokensComplete&&=!!u?.tokensComplete;costComplete&&=!!u?.costComplete;
    if(u?.currency){if(currency&&currency!==u.currency)costComplete=false;else currency=u.currency;}}
  const activeMs=run.evidence.executions.reduce((n,e)=>n+Math.max(0,(e.closedAt??Math.max(e.accountedThrough,Math.min(at,e.reservedUntil)))-e.startedAt),0);
  return {calls:calls.length,inputChars:calls.reduce((n,c)=>n+c.reservation.inputChars,0),outputChars,reservedOutputChars,activeMs,
    knownCalls:calls.filter(c=>c.state==="returned"||c.state==="failed").length,reservedCalls:calls.filter(c=>c.state==="reserved"||c.state==="dispatched"||c.state==="unknown").length,
    knownInputChars:calls.reduce((n,c)=>n+(c.usage?.inputChars??0),0),reservedInputChars:calls.reduce((n,c)=>n+(c.usage?0:c.reservation.inputChars),0),
    inputTokens:tokensComplete||inputTokens?inputTokens:null,outputTokens:tokensComplete||outputTokens?outputTokens:null,tokensComplete,
    costMicros:costComplete||costMicros?costMicros:null,currency,costComplete};
}
export async function checkChronistStorage(tx:Db,run:ChronistRunRow):Promise<void>{
  const proposals=(await tx.query<ChronistProposalRow>("SELECT * FROM chronist_vorschlaege WHERE run_id=$1",[run.id])).rows;
  const originals=proposals.map(p=>({unitId:p.unit_id,original:p.original,originalHash:p.original_hash,submissionRequest:p.submission_request,submissionAck:p.submission_ack}));
  const size=admitChronistValue({snapshot:run.snapshot,provider:run.provider,startRequest:run.start_request,startAck:run.start_ack,evidence:run.evidence,checkpoints:run.checkpoints,originals}).bytes;
  const bound=run.evidence.calls.reduce((n,c)=>n+(!c.usage?.outputComplete?c.reservation.storageBytes:0),0);
  if(size+bound>CHRONIST_EVIDENCE_BYTES||admitChronistValue(proposals.map(p=>p.blocks)).bytes>CHRONIST_DRAFT_BYTES||proposals.length>256)throw new ChronistConflict("budget");
}
export async function saveChronistRun(tx:Db,run:ChronistRunRow):Promise<void>{
  await checkChronistStorage(tx,run);
  await tx.query(`UPDATE chronist_laeufe SET updated_at=$2,version=$3,state=$4,evidence=$5,checkpoints=$6,stop_reason=$7,
    cancel_requested=$8,fence=$9,lease_owner=$10,lease_until=$11 WHERE id=$1`,[run.id,run.updated_at,run.version,run.state,
      JSON.stringify(run.evidence),JSON.stringify(run.checkpoints),run.stop_reason,run.cancel_requested,run.fence,run.lease_owner,run.lease_until]);
}
const zeroOutcome=(input:number):ChronistCallOutcome=>({kind:"failed",code:"unavailable",mayHaveExecuted:false,usage:{inputChars:input,outputChars:0,outputComplete:true,inputTokens:0,outputTokens:0,tokensComplete:true,durationMs:0,costMicros:null,currency:null,costKind:"unknown",costComplete:false}});
/** Expiration records uncertainty; it never dispatches or resets reservations. */
export function recoverChronistRun(run:ChronistRunRow,at:number):void{
  for(const call of run.evidence.calls){if(call.state!=="reserved"&&call.state!=="dispatched")continue;
    const actor=call.history[0]!.actorUserId;
    if(call.state==="reserved"){const outcome=zeroOutcome(call.reservation.inputChars);call.state="failed";call.outcome=outcome;call.usage=outcome.usage;
      call.history.push({state:"failed",at,actorUserId:actor,outcome});}
    else{call.state="unknown";call.history.push({state:"unknown",at,actorUserId:actor,outcome:null});}}
  for(const e of run.evidence.executions)if(e.closedAt===null){e.closedAt=e.reservedUntil;e.accountedThrough=e.reservedUntil;e.closeKind="crash";}
  run.state="paused";run.stop_reason=run.evidence.calls.some(c=>c.state==="unknown")?"outcome-unknown":"cancelled";
  run.lease_owner=null;run.lease_until=null;run.updated_at=String(at);
}
export interface ChronistExecutionBinding {readonly runId:string;readonly campaignId:string;readonly actorUserId:string;
  readonly executionId:string;readonly fence:number;readonly owner:string;readonly provider:ChronistProviderBinding}
export function createChronistStore(db:Db,cfg:ChronistServiceConfig,binding:ChronistExecutionBinding){
  const {runId,campaignId,actorUserId,fence,owner,provider}=binding;
  async function transaction<T>(fn:(tx:Db,run:ChronistRunRow,at:number)=>Promise<T>,late=false):Promise<T>{return db.transaction(async tx=>{
    await tx.query("SELECT pg_advisory_xact_lock($1)",[CHRONIST_DISPATCH_LOCK]);
    if(late)await tx.query("SELECT id FROM campaigns WHERE id=$1 FOR UPDATE",[campaignId]);else await lockChronistCampaign(tx,actorUserId,campaignId);
    const run=await getChronistRun(tx,campaignId,runId,true),at=await chronistDbTime(tx,cfg);
    if(!late&&(run.fence!==fence||run.lease_owner!==owner||Number(run.lease_until)<at))throw new ChronistConflict("authorization");
    const result=await fn(tx,run,at);run.updated_at=String(at);await saveChronistRun(tx,run);return result;
  });}
  function execution(run:ChronistRunRow):ChronistExecution{
    const found=run.evidence.executions.find(e=>e.executionId===binding.executionId&&e.fence===fence);if(!found)throw new ChronistConflict("authorization");return found;
  }
  async function current(tx:Db,run:ChronistRunRow,at:number):Promise<ChronistStopReason|null>{
    if(run.state!=="running")return "authorization";
    if(run.fence!==fence||run.lease_owner!==owner||Number(run.lease_until)<at)return "authorization";
    if(run.cancel_requested)return "cancelled";
    const member=await createCampaigns(tx).requireMember(actorUserId,campaignId);if(member.role!=="leitung")return "authorization";
    const status=await chronistSourceStatus(tx,actorUserId,campaignId,run.snapshot.sources);if(status.stale)return "source-stale";
    if(provider.fingerprint!==run.provider.fingerprint||provider.profileId!==run.provider.profileId)return "scope-changed";
    const e=execution(run),others=run.evidence.executions.filter(x=>x!==e).reduce((n,x)=>n+(x.closedAt??x.reservedUntil)-x.startedAt,0);
    e.accountedThrough=Math.max(e.accountedThrough,at);
    const until=Math.max(e.reservedUntil,Math.min(at+5000,e.startedAt+run.snapshot.budget.maxActiveMs-others));
    if(until<at||others+at-e.startedAt>=run.snapshot.budget.maxActiveMs)return "budget";
    e.reservedUntil=until;run.lease_until=String(until);return null;
  }
  async function readOriginals(tx:Db,unitId:string):Promise<readonly ChronistCandidate[]>{
    return (await tx.query<ChronistProposalRow>("SELECT * FROM chronist_vorschlaege WHERE run_id=$1 AND unit_id=$2 ORDER BY candidate_key COLLATE \"C\"",[runId,unitId])).rows.map(p=>p.original);
  }
  async function validateUnit(tx:Db,run:ChronistRunRow,unit:ChronistModelUnit):Promise<void>{
    parseChronistModelUnit(unit);const plan=run.evidence.plans.find(p=>p.unitId===unit.unitId);if(!plan)throw new ChronistConflict("scope-changed");
    const parents=await Promise.all(plan.parentUnitIds.map(async unitId=>({unitId,candidates:await readOriginals(tx,unitId)})));
    const expected=provider.prepare(plan,run.snapshot,unit.attempt,parents);
    if(hashChronist("unit-plan",expected)!==hashChronist("unit-plan",unit))throw new ChronistConflict("scope-changed");
  }
  const effects:ChronistEffectsPort={
    async check(){try{return await transaction((tx,run,at)=>current(tx,run,at));}catch(e){if(e instanceof Gone)return "authorization";if(e instanceof ChronistConflict)return e.reason as ChronistStopReason;throw e;}},
    async readSnapshot(){return transaction(async(tx,run,at)=>{const reason=await current(tx,run,at);if(reason)throw new ChronistConflict(reason);return run.snapshot;});},
    async readCandidates(unitId){return transaction(async(tx,run,at)=>{const reason=await current(tx,run,at);if(reason)throw new ChronistConflict(reason);return readOriginals(tx,unitId);});},
    async persistUnit(unit){await transaction(async(tx,run,at)=>{const reason=await current(tx,run,at);if(reason)throw new ChronistConflict(reason);await validateUnit(tx,run,unit);
      const old=run.evidence.units.find(u=>u.unitId===unit.unitId&&u.attempt===unit.attempt);if(old){if(hashChronist("unit-plan",old)!==hashChronist("unit-plan",unit))throw new ChronistConflict("scope-changed");return;}
      run.evidence.units.push(unit);});},
    async claimCall(unit,attempt){return transaction(async(tx,run,at)=>{
      if(attempt!==unit.attempt)throw new ChronistConflict("scope-changed");
      const stored=run.evidence.units.find(u=>u.unitId===unit.unitId&&u.attempt===attempt);if(!stored||hashChronist("unit-plan",stored)!==hashChronist("unit-plan",unit))throw new ChronistConflict("scope-changed");
      const old=run.evidence.calls.find(c=>c.unitId===unit.unitId&&c.attempt===attempt);
      if(old){if(old.requestHash!==unit.dispatch.requestHash)throw new ChronistConflict("scope-changed");
        if(old.state==="unknown")return {kind:"stop",reason:"outcome-unknown"};
        if(old.outcome)return {kind:"recorded",outcome:old.outcome};return {kind:"stop",reason:"call-in-flight"};}
      const reason=await current(tx,run,at);if(reason)return {kind:"stop",reason};
      if(!provider.description.available)return {kind:"stop",reason:"provider-unavailable"};await validateUnit(tx,run,unit);
      const calls=run.evidence.calls.filter(c=>c.unitId===unit.unitId);if(calls.length>=2||(attempt===2&&!calls.length))return {kind:"stop",reason:"budget"};
      if(calls.some(c=>c.state==="unknown")&&!run.evidence.controlEvidence.at(-1)!.acknowledgeUnknownOutcome)return {kind:"stop",reason:"outcome-unknown"};
      const usage=chronistUsage(run,at),budget=run.snapshot.budget,d=unit.dispatch;
      if(usage.calls+1>budget.maxCalls||usage.inputChars+d.inputChars>budget.maxInputChars||usage.outputChars+usage.reservedOutputChars+d.maxOutputChars>budget.maxOutputChars
        ||d.inputChars>budget.maxInputCharsPerCall||d.maxOutputChars>budget.maxOutputCharsPerCall)return {kind:"stop",reason:"budget"};
      const active=(c:ChronistCallRecord)=>c.state==="reserved"||((c.state==="dispatched"||c.state==="unknown")&&Number(c.deadlineAt)>at);
      if(run.evidence.calls.filter(active).length>=budget.concurrency)return {kind:"stop",reason:"call-in-flight"};
      const all=(await tx.query<{evidence:ChronistRunRow["evidence"]}>("SELECT evidence FROM chronist_laeufe")).rows;
      if(all.reduce((n,r)=>n+r.evidence.calls.filter(active).length,0)>=(cfg.chronist?.globalConcurrency??4))return {kind:"stop",reason:"call-in-flight"};
      const e=execution(run),deadline=at+budget.callTimeoutMs,others=run.evidence.executions.filter(x=>x!==e).reduce((n,x)=>n+(x.closedAt??x.reservedUntil)-x.startedAt,0);
      if(others+Math.max(e.reservedUntil,deadline)-e.startedAt>budget.maxActiveMs)return {kind:"stop",reason:"budget"};
      e.reservedUntil=Math.max(e.reservedUntil,deadline);run.lease_until=String(e.reservedUntil);
      const call:ChronistCallRecord={schemaVersion:1,runId,unitId:unit.unitId,attempt,callId:randomUUID(),requestHash:d.requestHash,fence,state:"reserved",claimedAt:at,dispatchAt:null,deadlineAt:null,
        reservation:{calls:1,inputChars:d.inputChars,outputChars:d.maxOutputChars,storageBytes:d.maxOutputChars*12+65536},usage:null,outcome:null,
        history:[{state:"reserved",at,actorUserId,outcome:null}]};run.evidence.calls.push(call);
      return {kind:"invoke",permit:{callId:call.callId,fence,requestHash:call.requestHash}};
    });},
    async recordCall(permit,outcome){await transaction(async(_tx,run,at)=>{
      parseChronistCallOutcome(outcome);const call=run.evidence.calls.find(c=>c.callId===permit.callId&&c.fence===permit.fence&&c.requestHash===permit.requestHash);
      if(!call||permit.fence!==fence)throw new ChronistConflict("authorization");
      if(call.outcome){if(hashChronist("run-evidence",call.outcome)===hashChronist("run-evidence",outcome))return;
        const old=call.usage!,next=outcome.usage;
        if(call.state!=="unknown"||old.outputComplete||next.outputChars<old.outputChars||next.durationMs<old.durationMs
          ||(next.inputTokens??0)<(old.inputTokens??0)||(next.outputTokens??0)<(old.outputTokens??0)||(next.costMicros??0)<(old.costMicros??0)
          ||old.tokensComplete&&!next.tokensComplete||old.costComplete&&!next.costComplete||old.currency!==null&&next.currency!==old.currency)throw new ChronistConflict("call-outcome");}
      if(outcome.usage.inputChars!==call.reservation.inputChars||outcome.usage.outputChars>call.reservation.outputChars
        ||(outcome.kind==="returned"&&outcome.reply.text.length!==outcome.usage.outputChars))throw new ChronistConflict("call-usage");
      if(call.state==="reserved"&&(outcome.kind!=="failed"||outcome.mayHaveExecuted))throw new ChronistConflict("call-not-dispatched");
      call.outcome=outcome;call.usage=outcome.usage;
      call.state=outcome.kind==="returned"?"returned":(!outcome.mayHaveExecuted||outcome.usage.outputComplete)?"failed":"unknown";
      call.history.push({state:call.state,at,actorUserId,outcome});
    },true);},
    async persistCandidates(unitId,candidates){await transaction(async(tx,run,at)=>{
      const reason=await current(tx,run,at);if(reason)throw new ChronistConflict(reason);
      const units=run.evidence.units.filter(u=>u.unitId===unitId),unit=units.at(-1),rules=chronistRuleCandidates(run.snapshot);
      for(const input of candidates){const candidate=parseChronistCandidate(input);
        if(candidate.origin==="regelwerk"){if(unitId!=="regelwerk"||!rules.some(r=>chronistCandidateHash(r)===chronistCandidateHash(candidate)))throw new ChronistConflict("candidate-invalid");}
        else {const call=run.evidence.calls.find(c=>c.unitId===unitId&&c.attempt===unit?.attempt);
          if(!unit||!verifyChronistCandidate(candidate,unit,run.snapshot).ok||call?.outcome?.kind!=="returned")throw new ChronistConflict("candidate-invalid");
          const drafts=parseChronistModelReply(JSON.parse(call.outcome.reply.text)).candidates;
          if(!drafts.some(d=>chronistCandidateHash(candidateFromDraft(d,unit,run.snapshot))===chronistCandidateHash(candidate)))throw new ChronistConflict("candidate-invalid");}
        const old=(await tx.query<ChronistProposalRow>("SELECT * FROM chronist_vorschlaege WHERE run_id=$1 AND unit_id=$2 AND candidate_key=$3",[runId,unitId,candidate.candidateKey])).rows[0];
        if(old){if(old.original_hash!==chronistCandidateHash(candidate))throw new ChronistConflict("candidate-conflict");continue;}
        await tx.query(`INSERT INTO chronist_vorschlaege(id,campaign_id,run_id,unit_id,candidate_key,version,original,original_hash,blocks,draft_hash,dependencies,state,updated_by,updated_at)
          VALUES($1,$2,$3,$4,$5,1,$6,$7,$8,$9,$10,'offen',$11,$12)`,[randomUUID(),campaignId,runId,unitId,candidate.candidateKey,JSON.stringify(candidate),chronistCandidateHash(candidate),JSON.stringify(candidate.blocks),hashChronist("draft",candidate.blocks),JSON.stringify(candidate.dependencies),actorUserId,at]);}
    });},
    async recordRejection(unitId,attempt,reason,count){await transaction(async(_tx,run,at)=>{
      if(!Number.isInteger(count)||count<0||count>256)throw new ChronistConflict("rejection-invalid");
      if(await current(_tx,run,at))throw new ChronistConflict("authorization");
      const old=run.evidence.rejections.find(r=>r.unitId===unitId&&r.attempt===attempt&&r.reason===reason);
      if(old){if(old.count!==count)throw new ChronistConflict("rejection-conflict");}else run.evidence.rejections.push({unitId,attempt,reason,count});});},
    async finish(result,reason){await transaction(async(_tx,run,at)=>{
      if(run.state!=="running"){if(run.state===result&&run.stop_reason===reason)return;throw new ChronistConflict("run-state");}
      const e=execution(run);e.accountedThrough=Math.max(e.accountedThrough,at);e.closedAt=Math.min(at,e.reservedUntil);e.closeKind=result;
      run.state=result;run.stop_reason=reason;run.version++;run.lease_until=String(Math.max(at+5000,e.reservedUntil));
      // Keep this fence briefly for the framework's final synchronous checkpoint. A new execution changes it.
    });},
  };
  async function consumePermit(permit:ChronistCallPermit,providedUnit:ChronistModelUnit):Promise<boolean>{try{return await transaction(async(tx,run,at)=>{
    const call=run.evidence.calls.find(c=>c.callId===permit.callId&&c.fence===permit.fence&&c.requestHash===permit.requestHash);
    if(!call||call.state!=="reserved"||permit.fence!==fence)return false;
    const reason=await current(tx,run,at);if(reason)return false;
    const unit=run.evidence.units.find(u=>u.unitId===call.unitId&&u.attempt===call.attempt);if(!unit)return false;
    if(hashChronist("unit-plan",providedUnit)!==hashChronist("unit-plan",unit))return false;await validateUnit(tx,run,unit);
    call.state="dispatched";call.dispatchAt=at;call.deadlineAt=at+run.snapshot.budget.callTimeoutMs;
    const e=execution(run),others=run.evidence.executions.filter(x=>x!==e).reduce((n,x)=>n+(x.closedAt??x.reservedUntil)-x.startedAt,0);
    if(others+call.deadlineAt-e.startedAt>run.snapshot.budget.maxActiveMs)throw new ChronistConflict("budget");
    e.reservedUntil=Math.max(e.reservedUntil,call.deadlineAt);run.lease_until=String(e.reservedUntil);
    call.history.push({state:"dispatched",at,actorUserId,outcome:null});return true;
  });}catch(error){if(error instanceof Gone||error instanceof ChronistConflict)return false;throw error;}}
  async function checkDispatch(permit:ChronistCallPermit,providedUnit:ChronistModelUnit):Promise<boolean>{try{return await transaction(async(tx,run,at)=>{
    const call=run.evidence.calls.find(c=>c.callId===permit.callId&&c.fence===permit.fence&&c.requestHash===permit.requestHash);
    if(!call||call.state!=="dispatched"||permit.fence!==fence||call.deadlineAt===null||call.deadlineAt<=at)return false;
    if(await current(tx,run,at))return false;
    const unit=run.evidence.units.find(u=>u.unitId===call.unitId&&u.attempt===call.attempt);if(!unit)return false;
    if(hashChronist("unit-plan",providedUnit)!==hashChronist("unit-plan",unit))return false;
    await validateUnit(tx,run,unit);return true;
  });}catch(error){if(error instanceof Gone||error instanceof ChronistConflict)return false;throw error;}}
  return {effects,consumePermit,checkDispatch,transaction};
}
