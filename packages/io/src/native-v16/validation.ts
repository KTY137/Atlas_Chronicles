// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { canonicalHash,type CanonicalValue } from "@chronicle/core";
import { admitChronistValue,chronistHash,chronistCandidateHash,chronistRuleCandidates,parseChronistSnapshot,parseChronistCandidate,
  parseChronistModelUnit,parseChronistCallOutcome,planChronistUnits,renderChronistUnit,verifyChronistCandidate,
  parseChronistBlock,parseChronistModelReply,candidateFromDraft,CHRONIST_GRAPH_CHANNELS,CHRONIST_GRAPH_NODES } from "@chronicle/chronist";
import { keys,object,fail } from "../campaign-v3-json.ts";
import type { CampaignRow } from "../campaign-schema.ts";
import type { CampaignTablesV16 } from "./schema.ts";
import { chronistScopeHash,collectChronistIdentityIds,type ChronistRunRow,type ChronistProposalRow,type ChronistCallRecord,type ChronistCheckpointStore } from "./data.ts";
import { decodeChronistCheckpoint,type ChronistSendData } from "./checkpoint-codec.ts";
import { chronistGraphEvidence } from "./graph-evidence.ts";
function require(v:unknown,message:string):asserts v{if(!v)fail("chronist",message);}
const closed=(v:unknown,names:readonly string[],optional:readonly string[]=[])=>keys(object(v,"chronist"),names,"chronist",optional);
const hash=(kind:string,v:unknown)=>chronistHash(kind,v as CanonicalValue);
const same=(a:unknown,b:unknown)=>hash("run-evidence",a)===hash("run-evidence",b);
const integer=(v:unknown,min=0)=>Number.isSafeInteger(v)&&Number(v)>=min;
const unique=(values:readonly string[],name:string)=>require(new Set(values).size===values.length,`duplicate ${name}`);
const blockHash=(v:unknown)=>canonicalHash(v as CanonicalValue);
export function validateChronistSend(run:ChronistRunRow,send:ChronistSendData):void{
  closed(send.args,["runId","unitId","attempt"]);const args=send.args as {runId:string;unitId:string;attempt:number};
  require(send.node==="work"&&args.runId===run.id&&(args.attempt===1||args.attempt===2)&&run.evidence.plans.some(p=>p.unitId===args.unitId),"invalid Send recipe");
  require(send.timeout===null||(integer(send.timeout,1)&&send.timeout<=run.snapshot.budget.callTimeoutMs),"invalid Send timeout");
}
const specials=new Set(["__start__","__end__","__input__","__error__","__interrupt__","__resume__","__scheduled__","__pregel_tasks","__tasks__","__no_writes__","__return__"]);
const channel=(name:string)=>specials.has(name)||(CHRONIST_GRAPH_CHANNELS as readonly string[]).includes(name)
  ||(name.startsWith("branch:to:")&&(CHRONIST_GRAPH_NODES as readonly string[]).includes(name.slice(10)));
export function validateChronistCheckpoints(run:ChronistRunRow,proposals:readonly ChronistProposalRow[]=[]):void{
  const graph=chronistGraphEvidence(run,proposals);
  const store=run.checkpoints;closed(store,["schemaVersion","serializerVersion","checkpoints","prunedBefore"]);
  require(store.schemaVersion===1&&store.serializerVersion==="chronist-checkpoint-json-1"&&Array.isArray(store.checkpoints)&&Array.isArray(store.prunedBefore),"checkpoint version");
  require(store.checkpoints.length<=258&&store.prunedBefore.length<=129,"checkpoint retention");
  require(!run.evidence.units.length&&!run.evidence.calls.length||store.checkpoints.some(c=>c.namespace===""),"missing graph progress");
  unique(store.checkpoints.map(c=>`${c.namespace}/${c.id}`),"checkpoint");unique(store.prunedBefore.map(p=>p.namespace),"pruned namespace");
  const latest=store.checkpoints.filter(c=>c.namespace==="").sort((a,b)=>a.id<b.id?1:-1)[0];
  if(run.state==="completed"){
    require(latest&&run.stop_reason===null,"completed graph missing");
    const checkpoint=decodeChronistCheckpoint(latest!.checkpoint,{validateSend:s=>validateChronistSend(run,s)}) as {channel_values:Record<string,unknown>};
    const statuses=object(checkpoint.channel_values.statuses,"completed statuses");
    require(run.evidence.plans.every(p=>{const s=statuses[p.unitId] as {kind?:string;rejected?:boolean}|undefined;return s?.kind==="done"&&s.rejected===false;}),"completed graph work proof");
  }
  for(const boundary of store.prunedBefore){closed(boundary,["namespace","checkpointId"]);require(typeof boundary.namespace==="string"&&typeof boundary.checkpointId==="string","pruning boundary");}
  for(const stored of store.checkpoints){closed(stored,["namespace","id","parentId","type","checkpoint","metadata","newVersions","writes"]);
    require(stored.namespace===""||/^work:[a-zA-Z0-9_-]+(?:\|[a-zA-Z0-9_:-]+)*$/.test(stored.namespace),"unknown namespace");
    require(typeof stored.id==="string"&&stored.id.length<=256&&(stored.parentId===null||typeof stored.parentId==="string")&&stored.type==="chronist-checkpoint-json-1","checkpoint identity");
    require(store.checkpoints.filter(c=>c.namespace===stored.namespace).length<=2,"checkpoint retention");
    if(stored.parentId&&!store.checkpoints.some(c=>c.namespace===stored.namespace&&c.id===stored.parentId))require(store.prunedBefore.some(p=>p.namespace===stored.namespace&&stored.parentId!<=p.checkpointId),"checkpoint parent missing");
    const sends=new Set<object>();
    const options={validateSend:(send:ChronistSendData)=>validateChronistSend(run,send),restoreSend:(send:ChronistSendData)=>{const value={chronistSend:send};sends.add(value);return value;}};
    const checkpoint=decodeChronistCheckpoint(stored.checkpoint,options) as Record<string,unknown>,metadata=decodeChronistCheckpoint(stored.metadata,options) as Record<string,unknown>;
    closed(checkpoint,["v","id","ts","channel_values","channel_versions","versions_seen"]);
    require(checkpoint.v===4&&checkpoint.id===stored.id&&typeof checkpoint.ts==="string"&&Number.isFinite(Date.parse(checkpoint.ts)),"checkpoint fields");
    const values=object(checkpoint.channel_values,"channels"),versions=object(checkpoint.channel_versions,"versions"),seen=object(checkpoint.versions_seen,"seen");
    require(Object.keys(values).every(channel)&&Object.keys(versions).every(channel)&&Object.keys(stored.newVersions).every(channel),"unknown checkpoint channel");
    require(Object.values(versions).every(v=>typeof v==="string"&&v.length<=256||integer(v))&&Object.values(stored.newVersions).every(v=>typeof v==="string"&&v.length<=256||integer(v)),"channel version");
    for(const [node,channels] of Object.entries(seen)){require(specials.has(node)||(CHRONIST_GRAPH_NODES as readonly string[]).includes(node),"unknown seen node");require(Object.entries(object(channels,"seen")).every(([key,value])=>channel(key)&&(typeof value==="string"&&value.length<=256||integer(value))),"unknown seen channel");}
    if(values.runId!==undefined)require(values.runId===run.id,"checkpoint run");
    if(values.unitId!==undefined)require(run.evidence.plans.some(p=>p.unitId===values.unitId),"checkpoint unit");
    if(values.unit!==undefined&&values.unit!==null){parseChronistModelUnit(values.unit);require(run.evidence.units.some(u=>same(u,values.unit)),"checkpoint dispatch evidence");}
    if(values.outcome!==undefined&&values.outcome!==null){parseChronistCallOutcome(values.outcome);require(run.evidence.calls.some(c=>c.outcome&&same(c.outcome,values.outcome)),"checkpoint outcome evidence");}
    if(values.ready!==undefined){require(Array.isArray(values.ready),"ready channel");for(const args of values.ready as unknown[])validateChronistSend(run,{node:"work",args,timeout:null});}
    graph.values(values,stored.namespace);
    require(["input","loop","update","fork"].includes(String(metadata.source))&&integer(metadata.step,-1)&&metadata.parents&&typeof metadata.parents==="object","checkpoint metadata");
    require(!Object.hasOwn(metadata,"counters_since_delta_snapshot"),"DeltaChannels are unsupported");
    require(Object.keys(metadata).every(k=>["source","step","parents","thread_id","runId","langgraph_step","langgraph_node","langgraph_triggers","langgraph_path","langgraph_checkpoint_ns","checkpoint_ns"].includes(k)),"unknown checkpoint metadata");
    for(const [namespace,id] of Object.entries(object(metadata.parents,"metadata parents")))require((namespace===""||/^work:[a-zA-Z0-9_-]+$/.test(namespace))&&typeof id==="string"&&id.length<=256,"metadata parent identity");
    for(const name of ["thread_id","runId"])if(metadata[name]!==undefined)require(metadata[name]===run.id,"metadata run identity");
    if(metadata.langgraph_step!==undefined)require(integer(metadata.langgraph_step,-1),"metadata graph step");
    if(metadata.langgraph_node!==undefined)require((CHRONIST_GRAPH_NODES as readonly unknown[]).includes(metadata.langgraph_node),"metadata graph node");
    for(const name of ["checkpoint_ns","langgraph_checkpoint_ns"])if(metadata[name]!==undefined)require(metadata[name]===stored.namespace,"metadata namespace");
    if(metadata.langgraph_triggers!==undefined)require(Array.isArray(metadata.langgraph_triggers)&&metadata.langgraph_triggers.every(v=>typeof v==="string"&&channel(v)),"metadata triggers");
    if(metadata.langgraph_path!==undefined)require(Array.isArray(metadata.langgraph_path)&&metadata.langgraph_path.length===2&&["__pregel_pull","__pregel_push"].includes(String(metadata.langgraph_path[0]))&&(typeof metadata.langgraph_path[1]==="string"||integer(metadata.langgraph_path[1])),"metadata path");
    function validateValue(name:string,value:unknown){
      if(name==="__pregel_tasks"||name==="__tasks__"){const tasks=Array.isArray(value)?value:[value];require(tasks.length<=run.snapshot.budget.concurrency&&tasks.every(v=>v&&typeof v==="object"&&sends.has(v)),"checkpoint task envelope");}
      else if(name==="__interrupt__"){const items=Array.isArray(value)?value:[value];require(items.length<=1,"checkpoint interrupt");for(const raw of items){const item=object(raw,"interrupt");closed(item,["id","value"]);const interrupt=object(item.value,"interrupt value");closed(interrupt,["schemaVersion","runId","reason"]);
        require(typeof item.id==="string"&&item.id.length<=256&&interrupt.schemaVersion===1&&interrupt.runId===run.id,"checkpoint interrupt identity");graph.values({stopReason:interrupt.reason},"");}}
      else if(name==="__error__")require(value instanceof Error&&value.message==="graph-error","checkpoint safe error");
      else if(name==="__resume__")require(value===undefined||value===true||value!==null&&typeof value==="object"&&!Array.isArray(value)&&Object.values(value).every(v=>v===true),"checkpoint resume token");
      else if(name==="__no_writes__")require(value===null,"checkpoint empty write");
      else if(name.startsWith("branch:to:"))require(value===null||typeof value==="string"&&(CHRONIST_GRAPH_NODES as readonly string[]).includes(value),"checkpoint branch trigger");
      else if(name==="__start__"||name==="__input__"){const input=object(value,"graph input");closed(input,stored.namespace?["runId","unitId","attempt"]:["runId","statuses","ready","stopReason"]);graph.values(input,stored.namespace);}
    }
    for(const [name,value] of Object.entries(values))validateValue(name,value);
    unique(stored.writes.map(w=>`${w.taskId}/${w.index}`),"pending write");
    const pending=new Map<string,Record<string,unknown>>();
    for(const write of stored.writes){closed(write,["taskId","index","channel","value"]);require(typeof write.taskId==="string"&&write.taskId.length<=256&&Number.isSafeInteger(write.index)&&write.index>=-4&&channel(write.channel),"pending write identity");
      const special:Record<string,number>={__error__:-1,__scheduled__:-2,__interrupt__:-3,__resume__:-4};if(write.channel in special)require(write.index===special[write.channel],"special write index");else require(write.index>=0,"regular write index");
      const value=decodeChronistCheckpoint(write.value,options);validateValue(write.channel,value);
      const merged=pending.get(write.taskId)??{...values};merged[write.channel]=value;pending.set(write.taskId,merged);}
    for(const value of pending.values())graph.values(value,stored.namespace);
  }
}
function validateCall(run:ChronistRunRow,call:ChronistCallRecord):void{
  closed(call,["schemaVersion","runId","unitId","attempt","callId","requestHash","fence","state","claimedAt","dispatchAt","deadlineAt","reservation","usage","outcome","history"]);
  const unit=run.evidence.units.find(u=>u.unitId===call.unitId&&u.attempt===call.attempt),execution=run.evidence.executions.find(e=>e.fence===call.fence);
  require(call.schemaVersion===1&&call.runId===run.id&&unit&&execution&&call.requestHash===unit.dispatch.requestHash&&integer(call.claimedAt),"call ownership");
  closed(call.reservation,["calls","inputChars","outputChars","storageBytes"]);
  require(call.reservation.calls===1&&call.reservation.inputChars===unit.dispatch.inputChars&&call.reservation.outputChars===unit.dispatch.maxOutputChars
    &&integer(call.reservation.storageBytes)&&call.reservation.storageBytes>=unit.dispatch.maxOutputChars*12+65536,"call reservation");
  require(Array.isArray(call.history)&&call.history.length>=1&&call.history.length<=8,"call history");
  require(call.history[0]!.state==="reserved"&&call.history[0]!.at===call.claimedAt,"initial call evidence");
  const transitions:Record<string,readonly string[]>={reserved:["dispatched","failed"],dispatched:["returned","failed","unknown"],unknown:["unknown","returned","failed"],returned:[],failed:[]};
  let previous:ChronistCallRecord["history"][number]|undefined,usage=call.history[0]!.outcome?.usage;
  for(const h of call.history){closed(h,["state","at","actorUserId","outcome"]);require(integer(h.at)&&h.actorUserId===execution.actorUserId,"call human identity");
    if(previous)require(h.at>=previous.at&&transitions[previous.state]?.includes(h.state),"call state transition");
    if(h.outcome){const outcome=parseChronistCallOutcome(h.outcome);require(outcome.usage.inputChars===call.reservation.inputChars&&outcome.usage.outputChars<=call.reservation.outputChars,"call usage bounds");
      if(outcome.kind==="returned")require(outcome.usage.outputComplete&&outcome.reply.text.length===outcome.usage.outputChars,"returned usage");
      if(usage)require(outcome.usage.outputChars>=usage.outputChars&&outcome.usage.durationMs>=usage.durationMs&&(outcome.usage.inputTokens??0)>=(usage.inputTokens??0)&&(outcome.usage.outputTokens??0)>=(usage.outputTokens??0)&&(outcome.usage.costMicros??0)>=(usage.costMicros??0)
        &&(!usage.tokensComplete||outcome.usage.tokensComplete)&&(!usage.costComplete||outcome.usage.costComplete)&&(usage.currency===null||usage.currency===outcome.usage.currency),"usage decreased");usage=outcome.usage;
      if(previous?.state==="reserved")require(outcome.kind==="failed"&&!outcome.mayHaveExecuted,"unclaimed dispatch");}
    else require(!["returned","failed"].includes(h.state),"missing outcome");previous=h;
  }
  require(previous!.state===call.state&&same(previous!.outcome,call.outcome)&&same(usage??null,call.usage),"final call evidence");
  const dispatched=call.history.find(h=>h.state==="dispatched");require(dispatched?call.dispatchAt===dispatched.at&&call.deadlineAt===dispatched.at+run.snapshot.budget.callTimeoutMs:call.dispatchAt===null&&call.deadlineAt===null,"dispatch deadline");
  require(call.claimedAt>=execution.startedAt&&(!call.deadlineAt||call.deadlineAt<=execution.reservedUntil),"call interval reservation");
}
export function validateChronistTables(tables:CampaignTablesV16,campaignId:string):void{
  const runs=tables.chronist_laeufe as unknown as readonly ChronistRunRow[],proposals=tables.chronist_vorschlaege as unknown as readonly ChronistProposalRow[];
  const users=new Set(tables.users.map(u=>String(u.id))),entries=new Map(tables.entries.map(e=>[String(e.id),e])),revisions=new Map(tables.revisions.map(r=>[String(r.id),r])),passages=new Map(tables.passages.map(p=>[String(p.id),p]));
  unique(runs.map(r=>`${r.campaign_id}/${r.created_by}/${r.start_command_id}`),"start command");unique(proposals.map(p=>`${p.run_id}/${p.unit_id}/${p.candidate_key}`),"candidate");
  unique(proposals.filter(p=>p.submission_command_id!==null).map(p=>`${p.campaign_id}/${p.accepted_by}/${p.submission_command_id}`),"submission command");
  require(runs.filter(r=>r.state==="running").length<=1,"active campaign slot");
  for(const run of runs){require(run.campaign_id===campaignId,"run campaign");const snapshot=parseChronistSnapshot(run.snapshot);
    require(snapshot.runId===run.id&&snapshot.mode===run.mode&&snapshot.sessionId===run.session_id,"run snapshot identity");
    if(run.session_id)require(tables.game_sessions.some(s=>s.id===run.session_id&&s.campaign_id===campaignId),"session scope");
    closed(run.provider,["schemaVersion","description","model","fingerprint","profileId"]);require(run.provider.schemaVersion===1&&/^[a-f0-9]{64}$/.test(run.provider.fingerprint),"provider fingerprint");
    const desc=run.provider.description;closed(desc,["id","label","location","transport","available","availabilityCode","models","pricing"]);
    require(["lokal","fremd"].includes(desc.location)&&["http","cli"].includes(desc.transport)&&typeof desc.available==="boolean"&&Array.isArray(desc.models)&&desc.models.includes(run.provider.model),"provider description");
    if(desc.pricing!==null){closed(desc.pricing,["currency","inputMicrosPerMillion","outputMicrosPerMillion","asOf"]);require(integer(desc.pricing.inputMicrosPerMillion)&&integer(desc.pricing.outputMicrosPerMillion),"pricing");}
    require(snapshot.scopeHash===chronistScopeHash(snapshot,run.provider),"scope hash");
    for(const source of snapshot.sources){const e=entries.get(source.ref.entryId),r=revisions.get(source.ref.revisionId),p=passages.get(source.ref.passageId);
      require(e&&r&&p&&e.campaign_id===campaignId&&r.entry_id===e.id&&p.entry_id===e.id&&p.campaign_id===campaignId,"source relationship");
      const document=r.document as unknown as {title:string;passagen:readonly {pid:string;inhalt:unknown}[]};
      require(document.title===source.title&&Array.isArray(document.passagen)&&document.passagen.some(p=>p.pid===source.ref.passageId&&blockHash(p.inhalt)===source.ref.contentHash),"source snapshot");}
    const req=run.start_request;closed(req,["schemaVersion","operation","actorUserId","campaignId","commandId","scopeHash","mode","sessionId","sourceRefs","providerId","model","providerFingerprint","budget","externalConsent"]);
    require(req.schemaVersion===1&&req.operation==="chronist.start"&&req.actorUserId===run.created_by&&req.campaignId===campaignId&&req.commandId===run.start_command_id&&req.scopeHash===snapshot.scopeHash
      &&req.mode===run.mode&&req.sessionId===run.session_id&&req.providerId===desc.id&&req.model===run.provider.model&&req.providerFingerprint===run.provider.fingerprint
      &&same(req.budget,snapshot.budget)&&same(req.sourceRefs,snapshot.sources.map(s=>s.ref))&&run.request_hash===hash("start-request",req),"original start request");
    closed(run.start_ack,["runId","version","state"]);require(run.start_ack.runId===run.id&&run.start_ack.version===1&&run.start_ack.state==="running","original start ACK");
    const ev=run.evidence;closed(ev,["schemaVersion","controlEvidence","plans","units","calls","executions","rejections"]);require(ev.schemaVersion===1,"evidence schema");
    require(same(ev.plans,planChronistUnits(snapshot)),"unit plan recipe");require(ev.controlEvidence.length>=1&&ev.controlEvidence.length<=1000&&ev.units.length<=256&&ev.calls.length<=128,"evidence count");
    unique(ev.controlEvidence.map(c=>c.executionId),"execution decision");unique(ev.executions.map(e=>e.executionId),"execution interval");unique(ev.units.map(u=>`${u.unitId}/${u.attempt}`),"dispatch");unique(ev.calls.map(c=>c.callId),"call");unique(ev.calls.map(c=>`${c.unitId}/${c.attempt}`),"call attempt");
    unique(ev.executions.map(e=>String(e.fence)),"execution fence");
    require(ev.executions.length===ev.controlEvidence.length&&ev.executions.every(e=>e.fence<=run.fence)
      &&Number(run.created_at)===ev.controlEvidence[0]!.decidedAt&&(run.lease_owner===null)===(run.lease_until===null),"runtime ownership lineage");
    let previousEnd=0,active=0;
    for(const [index,e] of ev.executions.entries()){closed(e,["executionId","actorUserId","fence","startedAt","accountedThrough","reservedUntil","closedAt","closeKind"]);
      require(integer(e.fence,1)&&integer(e.startedAt)&&e.startedAt>=previousEnd&&e.accountedThrough>=e.startedAt&&e.reservedUntil>=e.accountedThrough&&(e.closedAt===null||(e.closedAt>=e.startedAt&&e.closedAt<=e.reservedUntil)),"execution interval");
      if(e.closedAt===null)require(index===ev.executions.length-1&&e.closeKind===null,"open execution");else require(["completed","partial","paused","crash"].includes(String(e.closeKind)),"execution close");
      previousEnd=e.closedAt??e.reservedUntil;active+=previousEnd-e.startedAt;}
    require(active<=snapshot.budget.maxActiveMs,"active budget");
    for(const [index,c] of ev.controlEvidence.entries()){closed(c,["schemaVersion","executionId","kind","actorUserId","decidedAt","scopeHash","providerFingerprint","externalConsent","acknowledgeUnknownOutcome"],["freigabeAblaufAt","freigabeHash"]);
      require(c.schemaVersion===1&&c.kind===(index===0?"start":"resume")&&integer(c.decidedAt)&&c.scopeHash===snapshot.scopeHash&&c.providerFingerprint===run.provider.fingerprint&&typeof c.acknowledgeUnknownOutcome==="boolean","control evidence");
      require(ev.executions.some(e=>e.executionId===c.executionId&&e.actorUserId===c.actorUserId&&e.startedAt===c.decidedAt),"control interval");
      require(desc.location==="lokal"?c.externalConsent===null:same(c.externalConsent,{scopeHash:snapshot.scopeHash}),"external consent");
      // Der Beleg trägt den Abdruck der Freigabe und ihren Ablauf; ein lesbares Token wäre ein Leck.
      // Vor der Einführung geschriebene Belege führen beide Felder gar nicht; sie bleiben lesbar.
      // Ein neuer fremder Beleg, der sie führt, darf sie nicht auf null setzen.
      const altbestand=!Object.hasOwn(c,"freigabeAblaufAt")&&!Object.hasOwn(c,"freigabeHash");
      require(desc.location==="lokal"?(c.freigabeAblaufAt??null)===null&&(c.freigabeHash??null)===null
        :altbestand||(c.freigabeAblaufAt!==null&&c.freigabeAblaufAt!==undefined&&integer(c.freigabeAblaufAt)&&c.freigabeAblaufAt>=c.decidedAt
          &&typeof c.freigabeHash==="string"&&/^[a-f0-9]{64}$/.test(c.freigabeHash)),"external release evidence");}
    require(same(req.externalConsent,ev.controlEvidence[0]!.externalConsent),"original consent");
    for(const unit of ev.units){parseChronistModelUnit(unit);const plan=ev.plans.find(p=>p.unitId===unit.unitId);require(plan,"unknown dispatch unit");
      const parents=plan.parentUnitIds.map(unitId=>({unitId,candidates:proposals.filter(p=>p.run_id===run.id&&p.unit_id===unitId).sort((a,b)=>a.candidate_key<b.candidate_key?-1:1).map(p=>parseChronistCandidate(p.original))}));
      require(same(unit,renderChronistUnit(run.provider.profileId,run.provider.model,run.provider.fingerprint,plan,snapshot,unit.attempt,parents)),"complete dispatch recipe");}
    for(const call of ev.calls)validateCall(run,call);
    const usedInput=ev.calls.reduce((n,c)=>n+c.reservation.inputChars,0),usedOutput=ev.calls.reduce((n,c)=>n+(c.usage?.outputComplete?c.usage.outputChars:c.reservation.outputChars),0);
    require(ev.calls.length<=snapshot.budget.maxCalls&&usedInput<=snapshot.budget.maxInputChars&&usedOutput<=snapshot.budget.maxOutputChars,"cumulative budget");
    for(const unit of ev.plans)require(ev.calls.filter(c=>c.unitId===unit.unitId).length<=2,"attempt ceiling");
    unique(ev.rejections.map(r=>`${r.unitId}/${r.attempt}/${r.reason}`),"rejection");for(const r of ev.rejections){closed(r,["unitId","attempt","reason","count"]);require([0,1,2].includes(r.attempt)&&["schema","citation","rule-conflict"].includes(r.reason)&&integer(r.count)&&r.count<=256,"rejection evidence");}
    validateChronistCheckpoints(run,proposals.filter(p=>p.run_id===run.id));
    const own=proposals.filter(p=>p.run_id===run.id);require(own.length<=256,"candidate limit");
    const evidenceSize=admitChronistValue({snapshot:run.snapshot,provider:run.provider,startRequest:run.start_request,startAck:run.start_ack,evidence:run.evidence,checkpoints:run.checkpoints,
      originals:own.map(p=>({unitId:p.unit_id,original:p.original,originalHash:p.original_hash,submissionRequest:p.submission_request,submissionAck:p.submission_ack}))}).bytes;
    require(evidenceSize+ev.calls.reduce((n,c)=>n+(!c.usage?.outputComplete?c.reservation.storageBytes:0),0)<=16*1024*1024&&admitChronistValue(own.map(p=>p.blocks)).bytes<=2*1024*1024,"aggregate storage budget");
  }
  for(const p of proposals){const run=runs.find(r=>r.id===p.run_id);require(run&&p.campaign_id===campaignId,"proposal campaign");const original=parseChronistCandidate(p.original);
    require(Array.isArray(p.blocks)&&p.blocks.length>=1&&p.blocks.length<=1000,"draft blocks");for(const b of p.blocks)parseChronistBlock(b);
    require(original.candidateKey===p.candidate_key&&chronistCandidateHash(original)===p.original_hash&&hash("draft",p.blocks)===p.draft_hash&&same(p.dependencies,original.dependencies),"candidate/draft hash");
    if(original.origin==="regelwerk")require(p.unit_id==="regelwerk"&&chronistRuleCandidates(run.snapshot).some(r=>chronistCandidateHash(r)===p.original_hash),"rule evidence");
    else require(run.evidence.units.some(u=>{if(u.unitId!==p.unit_id||!verifyChronistCandidate(original,u,run.snapshot).ok)return false;
      const call=run.evidence.calls.find(c=>c.unitId===u.unitId&&c.attempt===u.attempt);if(call?.outcome?.kind!=="returned")return false;
      try{return parseChronistModelReply(JSON.parse(call.outcome.reply.text)).candidates.some(d=>chronistCandidateHash(candidateFromDraft(d,u,run.snapshot))===p.original_hash);}catch{return false;}}),"candidate response evidence");
    if(p.state!=="eingereicht"){require(p.accepted_by===null&&p.submission_command_id===null&&p.submission_request===null&&p.submission_request_hash===null&&p.submission_ack===null,"unexpected submission");continue;}
    const req=p.submission_request,ack=p.submission_ack;require(req&&ack,"submission missing");
    closed(req,["schemaVersion","operation","actorUserId","campaignId","proposalId","commandId","expectedVersion","expectedDraftHash","target"]);
    require(req.schemaVersion===1&&req.operation==="chronist.submit"&&req.actorUserId===p.accepted_by&&req.campaignId===campaignId&&req.proposalId===p.id&&req.commandId===p.submission_command_id&&req.expectedDraftHash===p.draft_hash&&hash("submit-request",req)===p.submission_request_hash,"submission original request");
    closed(ack,["commandId","proposalId","proposalVersion","state","entryId","revisionId","version","passageIds"]);
    require(ack.commandId===req.commandId&&ack.proposalId===p.id&&ack.proposalVersion===req.expectedVersion+1&&p.version===ack.proposalVersion&&ack.state==="eingereicht","submission original ACK");
    const revision=revisions.get(ack.revisionId),entry=entries.get(ack.entryId);require(revision&&entry&&revision.entry_id===entry.id&&entry.campaign_id===campaignId&&revision.seq===ack.version&&revision.author_user_id===req.actorUserId,"submission revision");
    const document=revision.document as unknown as {title:string;slug:string;passagen:readonly Record<string,unknown>[];tags:unknown[]};
    require(Array.isArray(document.passagen)&&Array.isArray(document.tags)&&ack.passageIds.length===p.blocks.length,"submission passages");unique(ack.passageIds,"submission passage");
    const appended=document.passagen.slice(-ack.passageIds.length);for(const [i,passage]of appended.entries())require(passage.pid===ack.passageIds[i]&&same(passage.inhalt,p.blocks[i])&&passage.geltung==="antrag"&&passage.praegung===null&&passage.autorUserId===req.actorUserId&&passage.erstelltInRevision===ack.revisionId,"historical proposal passage");
    if(req.target.kind==="existing"){closed(req.target,["kind","entryId","expectedVersion"]);require(req.target.entryId===ack.entryId&&req.target.expectedVersion+1===ack.version,"target revision step");
      const targetVersion=req.target.expectedVersion,previous=tables.revisions.find(r=>r.entry_id===ack.entryId&&r.seq===targetVersion);require(previous,"previous target snapshot");const before=previous.document as unknown as typeof document;
      const prefix=document.passagen.slice(0,-ack.passageIds.length);
      if(Object.keys(before).length===0&&previous.created_at==="0"&&previous.seq===1){
        // Migration 002 has no predecessor bytes. Its first full snapshot preserves the known
        // passage identities, and must not invent historical human/actor authorship.
        require(document.tags.length===document.passagen.length&&prefix.every(p=>!Object.hasOwn(p,"autorUserId")&&!Object.hasOwn(p,"autorActorId")&&p.erstelltInRevision===previous.id&&passages.get(String(p.pid))?.entry_id===ack.entryId),"migration baseline proposal");
      }else require(same(prefix,before.passagen)&&same(document.tags.slice(0,-ack.passageIds.length),before.tags)&&document.title===before.title&&document.slug===before.slug,"old passages changed");
    }else{closed(req.target,["kind","title","slug"]);require(req.target.kind==="new"&&req.target.title===req.target.title.trim()&&document.title===req.target.title&&ack.version===1&&document.passagen.length===ack.passageIds.length,"new target");
      const expected=(req.target.slug??req.target.title).normalize("NFKC").trim().toLowerCase().replace(/[^\p{L}\p{N}_-]+/gu,"-").replace(/^-|-$/g,"");require(document.slug===expected,"target slug normalization");}
  }
  for(const id of collectChronistIdentityIds(runs,proposals))require(users.has(id),"missing historical human identity");
}
