// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { canonicalHash, trustPassageId, type CanonicalValue } from "@chronicle/core";
import { canonicalChronistSources, makeChronistSourceSnapshot, parseChronistSourceRef, type ChronistSourceRef, type ChronistSourceSnapshot } from "@chronicle/chronist";
import type { Blockinhalt } from "@chronicle/chronik";
import type { ChronistSessionContext, ChronistSessionPage, ChronistSourcePage } from "@chronicle/protocol";
import type { Db } from "../../db/index.ts";
import { createCampaigns, type DomainConfig } from "../campaigns.ts";
import { createDocuments } from "../documents.ts";
import { createGameplay } from "../gameplay.ts";
import { Conflict, Gone } from "../errors.ts";
export class ChronistConflict extends Conflict {constructor(readonly reason:string){super();}}
export const pageLimit=(value?:number)=>Number.isInteger(value)&&value!>=1?Math.min(value!,100):50;
export async function lockChronistCampaign(tx:Db,userId:string,campaignId:string,gm=true):Promise<void>{
  const r=await tx.query(`SELECT c.id FROM campaigns c JOIN campaign_memberships m ON m.campaign_id=c.id
    WHERE c.id=$1 AND m.user_id=$2 AND ($3::boolean=false OR m.role='leitung') FOR UPDATE OF c FOR SHARE OF m`,[campaignId,userId,gm]);
  if(!r.rowCount)throw new Gone("membership");
}
interface SourceRow {id:string;entry_id:string;content:Blockinhalt;geltung:string;title:string;current_revision_id:string;document:{passagen?:readonly {pid:string;inhalt:Blockinhalt}[]}}
export async function collectChronistSources(tx:Db,userId:string,campaignId:string,refs:readonly ChronistSourceRef[],sessionId:string|null=null):Promise<readonly ChronistSourceSnapshot[]>{
  if(!refs.length||refs.length>512)throw new Gone("sources-invalid");
  const docs=createDocuments(tx),wissen=await docs.knowledge(userId,campaignId),seen=new Map<string,string>(),selected:ChronistSourceSnapshot[]=[];
  let note=false;
  if(sessionId&&!((await tx.query("SELECT id FROM game_sessions WHERE id=$1 AND campaign_id=$2",[sessionId,campaignId])).rowCount))throw new Gone("session");
  for(const raw of refs){const ref=parseChronistSourceRef(raw),pin=JSON.stringify(ref),old=seen.get(ref.passageId);
    if(old){if(old!==pin)throw new ChronistConflict("source-stale");continue;}seen.set(ref.passageId,pin);
    if(!wissen.gehaltenePids.has(trustPassageId(ref.passageId)))throw new Gone("source");
    const row=(await tx.query<SourceRow>(`SELECT p.id,p.entry_id,p.content,p.geltung,e.title,e.current_revision_id,r.document
      FROM passages p JOIN entries e ON e.id=p.entry_id JOIN revisions r ON r.id=e.current_revision_id AND r.entry_id=e.id
      WHERE p.id=$1 AND p.entry_id=$2 AND p.campaign_id=$3 AND e.campaign_id=$3 AND p.retired_at_revision IS NULL`,[ref.passageId,ref.entryId,campaignId])).rows[0];
    const historical=row?.document.passagen?.find(p=>p.pid===ref.passageId);
    if(!row||row.current_revision_id!==ref.revisionId||canonicalHash(row.content as unknown as CanonicalValue)!==ref.contentHash
      ||!historical||canonicalHash(historical.inhalt as unknown as CanonicalValue)!==ref.contentHash)throw new ChronistConflict("source-stale");
    note ||=row.geltung==="notiz";selected.push(makeChronistSourceSnapshot(ref,row.title,row.content));
  }
  if(sessionId&&!note)throw new Gone("saved-session-notes-required");
  return canonicalChronistSources(selected);
}
/** Current rights and head/title/block pins are checked independently of historical citations. */
export async function chronistSourceStatus(tx:Db,userId:string,campaignId:string,sources:readonly ChronistSourceSnapshot[]):Promise<{visible:boolean;stale:boolean;gm:boolean}>{
  const member=await createCampaigns(tx).requireMember(userId,campaignId),wissen=await createDocuments(tx).knowledge(userId,campaignId);
  let stale=false;for(const source of sources){
    const row=(await tx.query<{title:string;current_revision_id:string;content:Blockinhalt;retired_at_revision:string|null}>(`SELECT e.title,e.current_revision_id,p.content,p.retired_at_revision FROM passages p
      JOIN entries e ON e.id=p.entry_id WHERE p.id=$1 AND p.entry_id=$2 AND p.campaign_id=$3 AND e.campaign_id=$3`,[source.ref.passageId,source.ref.entryId,campaignId])).rows[0];
    if(member.role!=="leitung"&&!wissen.gehaltenePids.has(trustPassageId(source.ref.passageId)))return {visible:false,stale:true,gm:false};
    stale ||=!row||row.retired_at_revision!==null||row.title!==source.title||row.current_revision_id!==source.ref.revisionId
      ||canonicalHash(row.content as unknown as CanonicalValue)!==source.ref.contentHash;
  }return {visible:member.role==="leitung"||!stale,stale,gm:member.role==="leitung"};
}
export function createChronistSources(db:Db,cfg:DomainConfig={}){
  async function sources(userId:string,campaignId:string,options:{entryId?:string;after?:string;limit?:number}={}):Promise<ChronistSourcePage>{
    return db.transaction(async tx=>{await lockChronistCampaign(tx,userId,campaignId);const limit=pageLimit(options.limit);
      const rows=(await tx.query<{id:string;entry_id:string;current_revision_id:string;content:Blockinhalt}>(`SELECT p.id,p.entry_id,p.content,e.current_revision_id
        FROM passages p JOIN entries e ON e.id=p.entry_id WHERE p.campaign_id=$1 AND p.retired_at_revision IS NULL
        AND ($2::text IS NULL OR e.id=$2) AND ($3::text IS NULL OR p.id COLLATE "C">$3 COLLATE "C") ORDER BY p.id COLLATE "C" LIMIT $4`,[campaignId,options.entryId??null,options.after??null,limit+1])).rows;
      const selected=rows.slice(0,limit),refs=selected.map(r=>({entryId:r.entry_id,passageId:r.id,revisionId:r.current_revision_id,contentHash:canonicalHash(r.content as unknown as CanonicalValue)}));
      return {sources:refs.length?await collectChronistSources(tx,userId,campaignId,refs):[],after:rows.length>limit?selected.at(-1)!.id:null,complete:rows.length<=limit};});
  }
  async function sessions(userId:string,campaignId:string,options:{after?:string;limit?:number}={}):Promise<ChronistSessionPage>{
    return db.transaction(async tx=>{await lockChronistCampaign(tx,userId,campaignId);const limit=pageLimit(options.limit);
      const rows=(await tx.query<{id:string;scene_id:string;name:string;started_at:string;ended_at:string|null}>(`SELECT g.id,g.scene_id,s.name,g.started_at,g.ended_at FROM game_sessions g JOIN scenes s ON s.id=g.scene_id
        WHERE g.campaign_id=$1 AND ($2::text IS NULL OR g.id COLLATE "C">$2 COLLATE "C") ORDER BY g.id COLLATE "C" LIMIT $3`,[campaignId,options.after??null,limit+1])).rows;
      const selected=rows.slice(0,limit);return {sessions:selected.map(r=>({id:r.id,sceneId:r.scene_id,name:r.name,startedAt:Number(r.started_at),endedAt:r.ended_at===null?null:Number(r.ended_at)})),after:rows.length>limit?selected.at(-1)!.id:null,complete:rows.length<=limit};});
  }
  async function sessionContext(userId:string,campaignId:string,sessionId:string,options:{after?:string;limit?:number}={}):Promise<ChronistSessionContext>{
    return db.transaction(async tx=>{await lockChronistCampaign(tx,userId,campaignId);const limit=pageLimit(options.limit);
      const s=(await tx.query<{id:string;scene_id:string;name:string;fiction_date:string;started_at:string;ended_at:string|null}>(`SELECT g.*,s.name,s.fiction_date FROM game_sessions g JOIN scenes s ON s.id=g.scene_id
        WHERE g.id=$1 AND g.campaign_id=$2`,[sessionId,campaignId])).rows[0];if(!s)throw new Gone("session");
      const rows=(await tx.query<{id:string;actor_name:string;action_id:string;fiction_date:string;confirmed_at:string}>(`SELECT r.id,a.name AS actor_name,r.action_id,r.fiction_date,r.confirmed_at FROM action_rolls r JOIN actors a ON a.id=r.actor_id
        WHERE r.campaign_id=$1 AND r.session_id=$2 AND r.status='bestaetigt' AND r.confirmed_at IS NOT NULL
        AND ($3::text IS NULL OR r.id COLLATE "C">$3 COLLATE "C") ORDER BY r.id COLLATE "C" LIMIT $4`,[campaignId,sessionId,options.after??null,limit+1])).rows;
      const rolls:ChronistSessionContext["rolls"][number][]=[];
      for(const r of rows.slice(0,limit)){try{const replay=await createGameplay(tx,cfg).replayRoll(userId,campaignId,r.id);if(!replay.valid)continue;
        const total=replay.receipt.total;if(!Number.isFinite(total))continue;
        rolls.push({id:r.id,actorName:r.actor_name,actionId:r.action_id,fictionDate:r.fiction_date,confirmedAt:Number(r.confirmed_at),resultText:`Ergebnis: ${total}`});}catch{/* Invalid or unreadable receipts never become note context. */}}
      return {sessionId,scene:{id:s.scene_id,name:s.name,fictionDate:s.fiction_date},startedAt:Number(s.started_at),endedAt:s.ended_at===null?null:Number(s.ended_at),rolls,
        after:rows.length>limit?rows[limit-1]!.id:null,complete:rows.length<=limit};});
  }
  return {sources,sessions,sessionContext};
}
