// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { chronistHash, planChronistUnits, type ChronistBudget, type ChronistCallOutcome, type ChronistCandidate,
  type ChronistModelUnit, type ChronistSnapshot, type ChronistStopReason, type ChronistUnitPlan, type ChronistUsageEvidence } from "@chronicle/chronist";
import type { CanonicalValue } from "@chronicle/core";
import type { Blockinhalt } from "@chronicle/chronik";
import type { ChronistProviderDescription, ChronistStartAck, ChronistSubmissionAck } from "@chronicle/protocol";
export interface ChronistProviderRecord {schemaVersion:1;description:ChronistProviderDescription;model:string;fingerprint:string;profileId:string}
export interface ChronistControlEvidence {schemaVersion:1;executionId:string;kind:"start"|"resume";actorUserId:string;decidedAt:number;
  scopeHash:string;providerFingerprint:string;externalConsent:{scopeHash:string}|null;acknowledgeUnknownOutcome:boolean}
export interface ChronistExecution {executionId:string;actorUserId:string;fence:number;startedAt:number;accountedThrough:number;
  reservedUntil:number;closedAt:number|null;closeKind:"completed"|"partial"|"paused"|"crash"|null}
export interface ChronistCallHistory {state:"reserved"|"dispatched"|"returned"|"failed"|"unknown";at:number;actorUserId:string;
  outcome:ChronistCallOutcome|null}
export interface ChronistCallRecord {schemaVersion:1;runId:string;unitId:string;attempt:1|2;callId:string;requestHash:string;fence:number;
  state:ChronistCallHistory["state"];claimedAt:number;dispatchAt:number|null;deadlineAt:number|null;
  reservation:{calls:1;inputChars:number;outputChars:number;storageBytes:number};usage:ChronistUsageEvidence|null;
  outcome:ChronistCallOutcome|null;history:ChronistCallHistory[]}
export interface ChronistEvidence {schemaVersion:1;controlEvidence:ChronistControlEvidence[];plans:readonly ChronistUnitPlan[];
  units:ChronistModelUnit[];calls:ChronistCallRecord[];executions:ChronistExecution[];
  rejections:{unitId:string;attempt:0|1|2;reason:"schema"|"citation"|"rule-conflict";count:number}[]}
export type ChronistEncoded = null|string|number|boolean|{t:"undefined"}|{t:"array";v:ChronistEncoded[]}
  |{t:"object";v:[string,ChronistEncoded][]}|{t:"error";v:"graph-error"}
  |{t:"send";node:string;args:ChronistEncoded;timeout:number|null};
export interface ChronistStoredCheckpoint {namespace:string;id:string;parentId:string|null;type:"chronist-checkpoint-json-1";
  checkpoint:ChronistEncoded;metadata:ChronistEncoded;newVersions:Record<string,string|number>;
  writes:{taskId:string;index:number;channel:string;value:ChronistEncoded}[]}
export interface ChronistCheckpointStore {schemaVersion:1;serializerVersion:"chronist-checkpoint-json-1";
  checkpoints:ChronistStoredCheckpoint[];prunedBefore:{namespace:string;checkpointId:string}[]}
export interface ChronistStartRequest {schemaVersion:1;operation:"chronist.start";actorUserId:string;campaignId:string;commandId:string;
  scopeHash:string;mode:ChronistSnapshot["mode"];sessionId:string|null;sourceRefs:readonly ChronistSnapshot["sources"][number]["ref"][];
  providerId:string;model:string;providerFingerprint:string;budget:ChronistBudget;externalConsent:{scopeHash:string}|null}
export interface ChronistSubmissionRequest {schemaVersion:1;operation:"chronist.submit";actorUserId:string;campaignId:string;
  proposalId:string;commandId:string;expectedVersion:number;expectedDraftHash:string;
  target:{kind:"existing";entryId:string;expectedVersion:number}|{kind:"new";title:string;slug:string|null}}
export interface ChronistRunRow {id:string;campaign_id:string;created_by:string;created_at:string;updated_at:string;version:number;
  state:"running"|"paused"|"partial"|"completed";mode:ChronistSnapshot["mode"];session_id:string|null;
  start_command_id:string;start_request:ChronistStartRequest;request_hash:string;start_ack:ChronistStartAck;
  snapshot:ChronistSnapshot;provider:ChronistProviderRecord;evidence:ChronistEvidence;checkpoints:ChronistCheckpointStore;
  stop_reason:ChronistStopReason|null;cancel_requested:boolean;fence:number;lease_owner:string|null;lease_until:string|null}
export interface ChronistProposalRow {id:string;campaign_id:string;run_id:string;unit_id:string;candidate_key:string;version:number;
  original:ChronistCandidate;original_hash:string;blocks:readonly Blockinhalt[];draft_hash:string;dependencies:readonly string[];
  state:"offen"|"eingereicht"|"verworfen";updated_by:string;updated_at:string;accepted_by:string|null;
  submission_command_id:string|null;submission_request:ChronistSubmissionRequest|null;submission_request_hash:string|null;
  submission_ack:ChronistSubmissionAck|null}
export function emptyChronistCheckpoints():ChronistCheckpointStore {
  return {schemaVersion:1,serializerVersion:"chronist-checkpoint-json-1",checkpoints:[],prunedBefore:[]};
}
/** Strip IDs from the deterministic recipe before hashing: scope never hashes itself. */
export function chronistScopeValue(snapshot:Omit<ChronistSnapshot,"runId"|"scopeHash">,provider:ChronistProviderRecord) {
  const plans=planChronistUnits({...snapshot,runId:"scope-preview",scopeHash:"0".repeat(64)});
  const indices=new Map(plans.map((p,i)=>[p.unitId,i]));
  const recipe=plans.map(({unitId:_unit,parentUnitIds,...p})=>({...p,parentPlanIndices:parentUnitIds.map(id=>indices.get(id)!)}));
  return {schemaVersion:1,hashVersion:"chronist-hash-1",graphVersion:"chronist-1",promptVersion:"chronist-prompt-1",
    mode:snapshot.mode,sessionId:snapshot.sessionId,sources:snapshot.sources,facts:snapshot.facts,budget:snapshot.budget,recipe,
    provider:{id:provider.description.id,location:provider.description.location,model:provider.model,
      fingerprint:provider.fingerprint,profileId:provider.profileId}};
}
export const chronistScopeHash=(snapshot:Omit<ChronistSnapshot,"runId"|"scopeHash">,provider:ChronistProviderRecord)=>
  chronistHash("scope",chronistScopeValue(snapshot,provider) as unknown as CanonicalValue);
/** Only known human evidence locations contribute identities. Provider data never does. */
export function collectChronistIdentityIds(runs:readonly ChronistRunRow[],proposals:readonly ChronistProposalRow[]):readonly string[] {
  const ids=new Set<string>();
  for(const r of runs){ids.add(r.created_by);ids.add(r.start_request.actorUserId);
    for(const c of r.evidence.controlEvidence)ids.add(c.actorUserId);
    for(const e of r.evidence.executions)ids.add(e.actorUserId);
    for(const call of r.evidence.calls)for(const h of call.history)ids.add(h.actorUserId);}
  for(const p of proposals){ids.add(p.updated_by);if(p.accepted_by)ids.add(p.accepted_by);if(p.submission_request)ids.add(p.submission_request.actorUserId);}
  return [...ids].sort();
}
