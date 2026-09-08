// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { Value } from "@sinclair/typebox/value";
import { admitChronistValue } from "@chronicle/chronist";
import { EditChronistProposal, SubmitChronistProposal, type EditChronistProposalBody, type SubmitChronistProposalBody,
  type ChronistSuggestionPage, type ChronistSuggestionView, type ChronistSubmissionAck } from "@chronicle/protocol";
import type { ChronistProposalRow,ChronistRunRow,ChronistSubmissionRequest } from "@chronicle/io";
import type { Db } from "../../db/index.ts";
import { createCampaigns } from "../campaigns.ts";
import { createDocuments } from "../documents.ts";
import { Gone } from "../errors.ts";
import { ChronistConflict,chronistSourceStatus,lockChronistCampaign,pageLimit } from "./sources.ts";
import { CHRONIST_DISPATCH_LOCK,chronistDbTime,checkChronistStorage,getChronistRun,hashChronist } from "./store.ts";
import type { ChronistServiceConfig } from "./runtime.ts";
export function createChronistProposals(db:Db,cfg:ChronistServiceConfig={}){
  async function proposal(tx:Db,campaignId:string,id:string,lock=false):Promise<ChronistProposalRow>{const row=(await tx.query<ChronistProposalRow>(`SELECT * FROM chronist_vorschlaege WHERE id=$1 AND campaign_id=$2${lock?" FOR UPDATE":""}`,[id,campaignId])).rows[0];if(!row)throw new Gone("chronist-proposal");return row;}
  async function project(tx:Db,userId:string,campaignId:string,p:ChronistProposalRow,run?:ChronistRunRow):Promise<ChronistSuggestionView|null>{
    const r=run??await getChronistRun(tx,campaignId,p.run_id),sources=r.snapshot.sources.filter(s=>p.dependencies.includes(s.sourceId));
    if(sources.length!==p.dependencies.length)throw new ChronistConflict("source-stale");
    const rights=await chronistSourceStatus(tx,userId,campaignId,sources);if(!rights.visible)return null;
    return {id:p.id,runId:p.run_id,unitId:p.unit_id,version:p.version,kind:p.original.kind,origin:p.original.origin,state:p.state,
      originalBlocks:p.original.blocks,blocks:p.blocks,draftHash:p.draft_hash,sources,citations:p.original.citations,stale:rights.stale,submissionAck:p.submission_ack};
  }
  async function suggestions(userId:string,campaignId:string,options:{runId?:string;after?:string;limit?:number}={}):Promise<ChronistSuggestionPage>{
    return db.transaction(async tx=>{await lockChronistCampaign(tx,userId,campaignId,false);const limit=pageLimit(options.limit);
      const rows=(await tx.query<ChronistProposalRow>(`SELECT * FROM chronist_vorschlaege WHERE campaign_id=$1 AND ($2::text IS NULL OR run_id=$2)
        AND ($3::text IS NULL OR id COLLATE "C">$3 COLLATE "C") ORDER BY id COLLATE "C"`,[campaignId,options.runId??null,options.after??null])).rows;
      const visible:ChronistSuggestionView[]=[];for(const p of rows){const view=await project(tx,userId,campaignId,p);if(view)visible.push(view);if(visible.length>limit)break;}
      return {suggestions:visible.slice(0,limit),after:visible.length>limit?visible[limit-1]!.id:null,complete:visible.length<=limit};});
  }
  async function getSuggestion(userId:string,campaignId:string,id:string):Promise<ChronistSuggestionView>{return db.transaction(async tx=>{
    await lockChronistCampaign(tx,userId,campaignId,false);const view=await project(tx,userId,campaignId,await proposal(tx,campaignId,id));if(!view)throw new Gone("chronist-proposal");return view;});}
  async function editSuggestion(userId:string,campaignId:string,id:string,input:EditChronistProposalBody):Promise<ChronistSuggestionView>{
    admitChronistValue(input);if(!Value.Check(EditChronistProposal,input))throw new Gone("chronist-input");
    return db.transaction(async tx=>{await tx.query("SELECT pg_advisory_xact_lock($1)",[CHRONIST_DISPATCH_LOCK]);await lockChronistCampaign(tx,userId,campaignId);
      const p=await proposal(tx,campaignId,id,true);if(p.version!==input.expectedVersion||p.state!=="offen")throw new ChronistConflict("proposal-version");
      p.blocks=input.blocks as ChronistProposalRow["blocks"];p.draft_hash=hashChronist("draft",p.blocks);p.version++;p.updated_by=userId;p.updated_at=String(await chronistDbTime(tx,cfg));
      await tx.query("UPDATE chronist_vorschlaege SET version=$2,blocks=$3,draft_hash=$4,updated_by=$5,updated_at=$6 WHERE id=$1",[id,p.version,JSON.stringify(p.blocks),p.draft_hash,userId,p.updated_at]);
      const run=await getChronistRun(tx,campaignId,p.run_id,true);await checkChronistStorage(tx,run);return (await project(tx,userId,campaignId,p,run))!;});
  }
  async function discardSuggestion(userId:string,campaignId:string,id:string,expectedVersion:number):Promise<ChronistSuggestionView>{
    return db.transaction(async tx=>{await tx.query("SELECT pg_advisory_xact_lock($1)",[CHRONIST_DISPATCH_LOCK]);await lockChronistCampaign(tx,userId,campaignId);
      const p=await proposal(tx,campaignId,id,true);if(p.state==="verworfen"&&(p.version===expectedVersion+1||p.version===expectedVersion))return (await project(tx,userId,campaignId,p))!;
      if(p.version!==expectedVersion||p.state!=="offen")throw new ChronistConflict("proposal-version");p.state="verworfen";p.version++;
      await tx.query("UPDATE chronist_vorschlaege SET state='verworfen',version=$2,updated_by=$3,updated_at=$4 WHERE id=$1",[id,p.version,userId,await chronistDbTime(tx,cfg)]);
      return (await project(tx,userId,campaignId,p))!;});
  }
  async function submitSuggestion(userId:string,campaignId:string,id:string,input:SubmitChronistProposalBody):Promise<ChronistSubmissionAck>{
    admitChronistValue(input);if(!Value.Check(SubmitChronistProposal,input))throw new Gone("chronist-input");
    const request:ChronistSubmissionRequest={schemaVersion:1,operation:"chronist.submit",actorUserId:userId,campaignId,proposalId:id,commandId:input.commandId,
      expectedVersion:input.expectedVersion,expectedDraftHash:input.expectedDraftHash,target:input.target.kind==="existing"?{...input.target}:{kind:"new",title:input.target.title.trim(),slug:input.target.slug??null}};
    const requestHash=hashChronist("submit-request",request);
    return db.transaction(async tx=>{await tx.query("SELECT pg_advisory_xact_lock($1)",[CHRONIST_DISPATCH_LOCK]);await lockChronistCampaign(tx,userId,campaignId);
      await createCampaigns(tx,cfg).requireMember(userId,campaignId,["leitung"]);
      const known=(await tx.query<ChronistProposalRow>("SELECT * FROM chronist_vorschlaege WHERE campaign_id=$1 AND accepted_by=$2 AND submission_command_id=$3",[campaignId,userId,input.commandId])).rows[0];
      if(known){if(known.submission_request_hash!==requestHash||!known.submission_ack)throw new ChronistConflict("command-conflict");return known.submission_ack;}
      const p=await proposal(tx,campaignId,id,true);if(p.state!=="offen"||p.version!==input.expectedVersion||p.draft_hash!==input.expectedDraftHash)throw new ChronistConflict("proposal-version");
      const run=await getChronistRun(tx,campaignId,p.run_id,true),sources=run.snapshot.sources.filter(s=>p.dependencies.includes(s.sourceId));
      const status=await chronistSourceStatus(tx,userId,campaignId,sources);if(sources.length!==p.dependencies.length||!status.visible||status.stale)throw new ChronistConflict("source-stale");
      const target=request.target.kind==="existing"?request.target:{kind:"new" as const,title:request.target.title,...(request.target.slug===null?{}:{slug:request.target.slug})};
      const submitted=await createDocuments(tx,cfg).submitProposal(userId,campaignId,{target,blocks:p.blocks});
      const ack:ChronistSubmissionAck={...submitted,commandId:input.commandId,proposalId:id,proposalVersion:p.version+1,state:"eingereicht"};
      await tx.query(`UPDATE chronist_vorschlaege SET state='eingereicht',version=$2,updated_by=$3,updated_at=$4,accepted_by=$3,
        submission_command_id=$5,submission_request=$6,submission_request_hash=$7,submission_ack=$8 WHERE id=$1`,[id,ack.proposalVersion,userId,await chronistDbTime(tx,cfg),input.commandId,JSON.stringify(request),requestHash,JSON.stringify(ack)]);
      await checkChronistStorage(tx,run);return ack;});
  }
  return {suggestions,getSuggestion,editSuggestion,discardSuggestion,submitSuggestion};
}
