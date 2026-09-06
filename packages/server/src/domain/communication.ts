import { createTactical } from "./tactical.ts";
import { randomUUID, createHash } from "node:crypto";
import { stableJson } from "@chronicle/rules";
import type { Static } from "@sinclair/typebox";
import type { MessageDraft, WireCommandBody } from "@chronicle/protocol";
import type { Db } from "../db/index.ts";
import { createCampaigns, type DomainConfig } from "./campaigns.ts";
import { createDocuments } from "./documents.ts";
import { createAtlas } from "./atlas.ts";
import { createGameplay } from "./gameplay.ts";
import { createWeek } from "./week.ts";
import { createActors, listControlledActorIds } from "./actors.ts";
import { Gone, Conflict } from "./errors.ts";

const hash=(v:unknown)=>createHash("sha256").update(stableJson(v)).digest("hex");
export function createCommunication(db:Db,cfg:DomainConfig={}) {
  const now=cfg.now ?? Date.now, campaigns=createCampaigns(db,cfg);
  async function messages(userId:string,campaignId:string,kind:"letter"|"table"="letter") {
    await campaigns.requireMember(userId,campaignId);
    return (await db.query(`SELECT m.id,m.author_name AS "authorName",m.user_id AS "userId",m.body,m.parent_id AS "parentId",m.kind,m.created_at AS "createdAt"
      FROM campaign_messages m WHERE m.campaign_id=$1 AND m.kind=$2 AND m.removed_at IS NULL AND (m.expires_at IS NULL OR m.expires_at>$3)
      AND (m.kind='letter' OR EXISTS(SELECT 1 FROM game_sessions s WHERE s.id=m.session_id AND s.ended_at IS NULL)) ORDER BY m.created_at DESC,m.id DESC LIMIT 500`,[campaignId,kind,now()])).rows.reverse();
  }
  async function send(userId:string,campaignId:string,input:Static<typeof MessageDraft>) {
    return db.transaction(async tx=>{
      await tx.query("SELECT id FROM campaigns WHERE id=$1 FOR UPDATE",[campaignId]);
      const member=await createCampaigns(tx,cfg).requireMember(userId,campaignId,["leitung","spieler"]);
      const requestHash=hash({campaignId,operation:"message",input});
      const old=(await tx.query<{request_hash:string;response:{id:string}}>("SELECT request_hash,response FROM commands WHERE user_id=$1 AND command_id=$2",[userId,input.commandId])).rows[0];
      if(old) {if(old.request_hash!==requestHash) throw new Conflict(); return old.response;}
      if(!input.body.trim() || input.body.length>8000) throw new Gone();
      const recent=await tx.query("SELECT id FROM campaign_messages WHERE campaign_id=$1 AND user_id=$2 AND created_at>$3",[campaignId,userId,now()-60_000]);
      if(recent.rowCount>=30) throw new Conflict();
      const session=input.kind==="table" ? (await tx.query<{id:string;scene_id:string;version:number}>(`SELECT s.id,s.scene_id,c.version FROM game_sessions s
        JOIN scenes c ON c.id=s.scene_id AND c.campaign_id=s.campaign_id WHERE s.campaign_id=$1 AND s.ended_at IS NULL`,[campaignId])).rows[0] : null;
      if(input.kind==="table"&&!session) throw new Gone();
      if(input.expectedScene && (input.kind!=="table" || session?.scene_id!==input.expectedScene.id || session.version!==input.expectedScene.version)) throw new Conflict();
      if(input.parentId) {
        const parent=await tx.query("SELECT id FROM campaign_messages WHERE id=$1 AND campaign_id=$2 AND kind=$3 AND removed_at IS NULL AND (expires_at IS NULL OR expires_at>$4)",[input.parentId,campaignId,input.kind,now()]);
        if(!parent.rowCount) throw new Gone();
      }
      const result={id:randomUUID()};
      await tx.query(`INSERT INTO campaign_messages(id,campaign_id,user_id,author_name,body,parent_id,kind,session_id,created_at,expires_at)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,[result.id,campaignId,userId,member.displayName,input.body.trim(),input.parentId??null,input.kind,session?.id??null,now(),input.kind==="table"?now()+14*86400_000:null]);
      await tx.query("INSERT INTO commands(user_id,command_id,campaign_id,request_hash,response,created_at) VALUES($1,$2,$3,$4,$5,$6)",[userId,input.commandId,campaignId,requestHash,result,now()]);
      return result;
    });
  }
  async function remove(userId:string,campaignId:string,id:string) {
    const member=await campaigns.requireMember(userId,campaignId);
    if(!(await db.query("UPDATE campaign_messages SET removed_at=$4 WHERE id=$1 AND campaign_id=$2 AND ($3 OR user_id=$5) RETURNING id",[id,campaignId,member.role==="leitung",now(),userId])).rowCount) throw new Gone();
  }
  async function purge() {
    // The table buffer is physically erased, including descendants, never archived as a transcript.
    await db.query(`DELETE FROM campaign_messages WHERE kind='table' AND (expires_at<=$1 OR session_id IN (SELECT id FROM game_sessions WHERE ended_at IS NOT NULL))`,[now()]);
  }
  async function execute(userId:string,campaignId:string,command:WireCommandBody) {
    await campaigns.requireMember(userId,campaignId);
    const game=createGameplay(db,cfg), body=command.payload;
    switch(body.kind) {
      case "message": return send(userId,campaignId,{...body.body,commandId:command.commandId});
      case "roll": return {id:(await game.prepareAction(userId,campaignId,{...body.body,commandId:command.commandId})).id};
      case "confirm-roll": return {id:(await game.confirmAction(userId,campaignId,body.rollId)).rollId};
      case "door-roll": return {id:(await game.prepareVollmacht(userId,campaignId,body.vollmachtId,{...body.body,commandId:command.commandId})).id};
      case "confirm-door": return {id:(await game.confirmVollmacht(userId,campaignId,body.rollId)).rollId};
      case "speak": return {id:(await game.mintGesprochen(userId,campaignId,{...body.body,commandId:command.commandId})).id};
      case "reveal": await createDocuments(db,cfg).revealPassage(userId,campaignId,body.passageId,body.actorId); return {ok:true};
    }
  }
  async function projectedFingerprint(userId:string,campaignId:string) {
    const docs=createDocuments(db,cfg), atlas=createAtlas(db,cfg),game=createGameplay(db,cfg),week=createWeek(db,cfg);
    const member=await campaigns.requireMember(userId,campaignId);
    const list=await docs.listEntries(userId,campaignId), maps=await atlas.listMaps(userId,campaignId);
    const entries=[]; for(const e of list) entries.push(await week.umbruch(userId,campaignId,e.id));
    const mapViews=[]; for(const m of maps) mapViews.push(await atlas.getMap(userId,campaignId,m.id));
    const actors=createActors(db,cfg), controlled=await listControlledActorIds(db,member);
    const sheets=[]; for(const actorId of controlled) sheets.push(await game.getSheet(userId,campaignId,actorId));
    const inventory=[]; if(member.role==="leitung") inventory.push(await actors.listItems(userId,campaignId));
    else for(const actorId of controlled) inventory.push(await actors.listItems(userId,campaignId,actorId));
    const templates=member.role==="leitung" ? [await actors.listActorTemplates(userId,campaignId),await actors.listItemTemplates(userId,campaignId)] : [];
    const theme=(await db.query("SELECT theme_id,theme_revision,version FROM campaign_theme_pins WHERE campaign_id=$1",[campaignId])).rows[0] ?? null;
    const authoring=member.role==="leitung" ? (await db.query("SELECT count(*)::text AS count FROM authoring_events WHERE campaign_id=$1",[campaignId])).rows[0] : null;
    return hash({theme,authoring,tactical:(await createTactical(db,cfg).getActive(userId,campaignId))?.digest ?? null,entries,maps:mapViews,sheets,actors:await actors.listActors(userId,campaignId),perspective:await actors.getReaderPerspective(userId,campaignId),inventory,templates,rules:await game.listPackages(userId,campaignId),clock:await week.getClock(userId,campaignId),letters:await week.listLetters(userId,campaignId),scenes:await game.listScenes(userId,campaignId),rolls:await game.listRolls(userId,campaignId),doors:await game.listVollmachten(userId,campaignId),messages:await messages(userId,campaignId),table:await messages(userId,campaignId,"table")});
  }
  async function sync(userId:string,campaignId:string) {
    return db.transaction(async tx=>{
      // Cursor insertion takes a foreign-key KEY SHARE lock on the campaign. Take
      // the writer lock first: door expiry in the projection needs it later, and
      // simultaneous first connections must not upgrade each other's FK locks.
      if(!(await tx.query(`SELECT c.id FROM campaigns c JOIN campaign_memberships m ON m.campaign_id=c.id
        WHERE c.id=$1 AND m.user_id=$2 FOR UPDATE OF c FOR SHARE OF m`,[campaignId,userId])).rowCount) throw new Gone();
      await createCampaigns(tx,cfg).requireMember(userId,campaignId);
      await tx.query("INSERT INTO event_cursors(user_id,campaign_id) VALUES($1,$2) ON CONFLICT DO NOTHING",[userId,campaignId]);
      const cursor=(await tx.query<{last_seq:string;projection_hash:string|null}>("SELECT last_seq,projection_hash FROM event_cursors WHERE user_id=$1 AND campaign_id=$2 FOR UPDATE",[userId,campaignId])).rows[0]!;
      const next=await createCommunication(tx,cfg).projectedFingerprint(userId,campaignId);
      if(cursor.projection_hash===next) return Number(cursor.last_seq);
      const seq=Number(cursor.last_seq)+(cursor.projection_hash===null?0:1);
      if(cursor.projection_hash!==null) await tx.query("INSERT INTO events(user_id,campaign_id,seq,payload,created_at) VALUES($1,$2,$3,$4,$5)",[userId,campaignId,seq,{type:"refresh"},now()]);
      await tx.query("UPDATE event_cursors SET last_seq=$3,projection_hash=$4 WHERE user_id=$1 AND campaign_id=$2",[userId,campaignId,seq,next]);
      return seq;
    });
  }
  async function resume(userId:string,campaignId:string,after:number) {
    await campaigns.requireMember(userId,campaignId);
    const rows=(await db.query<{seq:string}>("SELECT seq FROM events WHERE user_id=$1 AND campaign_id=$2 AND seq>$3 ORDER BY seq LIMIT 256",[userId,campaignId,after])).rows;
    // Persisted events contain only invalidations. No historical private payload is replayable.
    return rows.map(r=>({type:"refresh" as const,seq:Number(r.seq)}));
  }
  return {messages,send,remove,purge,execute,projectedFingerprint,sync,resume};
}
