// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { candidateFromDraft,chronistHash,chronistCandidateHash,parseChronistCandidate,parseChronistModelReply,verifyChronistCandidate,type ChronistCandidate } from "@chronicle/chronist";
import type { CanonicalValue } from "@chronicle/core";
import { keys,object,fail } from "../campaign-v3-json.ts";
import type { ChronistProposalRow,ChronistRunRow } from "./data.ts";
const stops=new Set(["cancelled","budget","source-stale","authorization","provider-unavailable","outcome-unknown","call-in-flight","scope-changed"]);
const require=(value:unknown,message:string):void=>{if(!value)fail("chronist",message);};
const closed=(value:unknown,names:readonly string[])=>keys(object(value,"chronist"),names,"chronist");
const hashes=(values:readonly ChronistCandidate[])=>values.map(chronistCandidateHash).sort().join("/");
const same=(a:unknown,b:unknown)=>chronistHash("checkpoint",a as CanonicalValue)===chronistHash("checkpoint",b as CanonicalValue);
/** Fixed chronist-1 graph state is evidence, never an independent claim that work happened. */
export function chronistGraphEvidence(run:ChronistRunRow,proposals:readonly ChronistProposalRow[]){
  const plans=new Map(run.evidence.plans.map(p=>[p.unitId,p]));
  function proof(unitId:unknown,attempt:unknown){
    const unit=run.evidence.units.find(u=>u.unitId===unitId&&u.attempt===attempt);
    const call=run.evidence.calls.find(c=>c.unitId===unitId&&c.attempt===attempt);
    if(!unit||call?.outcome?.kind!=="returned")return null;
    const rejected={schema:0,citation:0,"rule-conflict":0};let candidates:ChronistCandidate[]=[];
    let reply;try{reply=parseChronistModelReply(JSON.parse(call.outcome.reply.text));}catch{rejected.schema=1;return {unit,call,candidates,rejected,schemaError:true};}
    for(const draft of reply.candidates){const result=verifyChronistCandidate(candidateFromDraft(draft,unit,run.snapshot),unit,run.snapshot);
      if(result.ok)candidates.push(result.candidate);else rejected[result.reason]++;}
    candidates=[...new Map(candidates.map(c=>[c.candidateKey,c])).values()];return {unit,call,candidates,rejected,schemaError:false};
  }
  function rejectionsMatch(result:NonNullable<ReturnType<typeof proof>>){
    for(const reason of ["schema","citation","rule-conflict"] as const){const saved=run.evidence.rejections.find(r=>r.unitId===result.unit.unitId&&r.attempt===result.unit.attempt&&r.reason===reason);
      require((saved?.count??0)===result.rejected[reason],"checkpoint rejection proof");}
  }
  function originalsMatch(unitId:string,candidates:readonly ChronistCandidate[]){
    require(hashes(proposals.filter(p=>p.run_id===run.id&&p.unit_id===unitId).map(p=>parseChronistCandidate(p.original)))===hashes(candidates),"checkpoint persisted candidates");
  }
  function statuses(value:unknown,childUnit?:unknown){
    const entries=Object.entries(object(value,"statuses"));require(entries.length<=run.evidence.plans.length,"checkpoint status count");
    for(const [unitId,raw] of entries){const status=object(raw,"status");closed(status,["kind","attempt","reason","advanceOnResume","candidateCount","rejected"]);
      require(plans.has(unitId)&&(childUnit===undefined||unitId===childUnit),"checkpoint status unit");
      require(["done","blocked","skipped"].includes(String(status.kind))&&(status.attempt===1||status.attempt===2)
        &&typeof status.advanceOnResume==="boolean"&&typeof status.rejected==="boolean"&&Number.isSafeInteger(status.candidateCount)&&Number(status.candidateCount)>=0&&Number(status.candidateCount)<=256,"checkpoint status fields");
      const call=run.evidence.calls.find(c=>c.unitId===unitId&&c.attempt===status.attempt);
      const rejects=run.evidence.rejections.filter(r=>r.unitId===unitId&&r.attempt<=Number(status.attempt)&&r.count>0);
      if(status.rejected)require(rejects.length>0,"checkpoint rejected status");
      if(status.kind==="done"){
        const result=proof(unitId,status.attempt);require(result&&(!result.schemaError||status.attempt===2),"checkpoint done without returned call");
        require(status.reason===null&&status.advanceOnResume===false&&status.candidateCount===result!.candidates.length,"checkpoint done fields");
        rejectionsMatch(result!);originalsMatch(unitId,result!.candidates);
        // The repair edge carries the schema rejection into its second attempt; a new worker after a human resume starts clean.
        require(status.rejected===Object.values(result!.rejected).some(n=>n>0)||(status.rejected===true&&status.attempt===2&&rejects.some(r=>r.attempt===1&&r.reason==="schema")),"checkpoint done rejection");
      }else{
        require(status.candidateCount===0,"checkpoint blocked candidate count");
        if(status.kind==="blocked")require(stops.has(String(status.reason)),"checkpoint blocked reason");
        else require(status.attempt===2&&status.reason===null&&status.advanceOnResume===true,"checkpoint skipped fields");
        if(status.advanceOnResume)require(call&&call.history.some(h=>h.state==="failed"||h.state==="unknown"),"checkpoint retry evidence");
        if(status.reason==="outcome-unknown")require(call&&call.history.some(h=>h.state==="unknown"),"checkpoint unknown evidence");
      }
    }
  }
  function values(value:Record<string,unknown>,namespace:string){
    const child=namespace!=="";
    if(value.runId!==undefined)require(value.runId===run.id,"checkpoint run");
    if(value.unitId!==undefined)require(child&&typeof value.unitId==="string"&&plans.has(value.unitId),"checkpoint child identity");
    if(value.attempt!==undefined)require(child&&(value.attempt===1||value.attempt===2),"checkpoint attempt");
    if(value.stopReason!==undefined)require(value.stopReason===null||stops.has(String(value.stopReason)),"checkpoint stop reason");
    for(const flag of ["schemaRepair","rejected","advanceOnResume"]){if(value[flag]!==undefined)require(child&&typeof value[flag]==="boolean","checkpoint worker flag");}
    if(value.statuses!==undefined)statuses(value.statuses,child?value.unitId:undefined);
    const unit=value.unit===null||value.unit===undefined?null:object(value.unit,"unit");
    if(unit)require(child&&unit.unitId===value.unitId&&unit.attempt===value.attempt,"checkpoint unit correspondence");
    if(value.outcome!==undefined&&value.outcome!==null){const call=run.evidence.calls.find(c=>c.unitId===value.unitId&&c.attempt===value.attempt);
      require(unit&&call&&call.history.some(h=>h.outcome&&same(h.outcome,value.outcome)),"checkpoint outcome correspondence");}
    if(value.candidates!==undefined){require(child&&Array.isArray(value.candidates)&&value.candidates.length<=256,"checkpoint candidate channel");
      const candidates=(value.candidates as unknown[]).map(parseChronistCandidate),result=proof(value.unitId,value.attempt);
      require(new Set(candidates.map(c=>c.candidateKey)).size===candidates.length,"checkpoint duplicate candidates");
      if(candidates.length)require(unit&&result&&candidates.every(c=>result.candidates.some(p=>chronistCandidateHash(p)===chronistCandidateHash(c))),"checkpoint candidate response correspondence");
      if(Object.hasOwn(value,"branch:to:persist")||Object.hasOwn(value,"branch:to:settle")&&value.stopReason===null){
        require(result&&hashes(candidates)===hashes(result.candidates),"checkpoint verification result");rejectionsMatch(result!);
        if(Object.hasOwn(value,"branch:to:settle"))originalsMatch(String(value.unitId),candidates);}
    }
    if(value.schemaRepair===true){const result=proof(value.unitId,value.attempt);require(value.attempt===1&&result?.schemaError,"checkpoint repair proof");rejectionsMatch(result!);}
    if(value.rejected===true)require(run.evidence.rejections.some(r=>r.unitId===value.unitId&&r.attempt<=Number(value.attempt)&&r.count>0),"checkpoint rejection evidence");
    if(!child&&Object.hasOwn(value,"branch:to:finish")){
      const known=object(value.statuses,"statuses");require(value.stopReason===null&&!Object.values(known).some(s=>(s as {kind:string}).kind==="blocked"),"checkpoint premature finish");
      require(!run.evidence.plans.some(p=>!known[p.unitId]&&p.parentUnitIds.every(id=>(known[id] as {kind?:string}|undefined)?.kind==="done")),"checkpoint skipped ready work");
    }
  }
  return {values,statuses};
}
