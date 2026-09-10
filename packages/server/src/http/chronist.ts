// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import type { FastifyInstance,FastifyReply } from "fastify";
import { Type } from "@sinclair/typebox";
import { ChronistPreview,StartChronistRun,ResumeChronistRun,ChronistControl,EditChronistProposal,SubmitChronistProposal,
  type ChronistPreviewBody,type StartChronistRunBody,type ResumeChronistRunBody,type EditChronistProposalBody,type SubmitChronistProposalBody } from "@chronicle/protocol";
import { ChronistValidationError } from "@chronicle/chronist";
import type { Db } from "../db/index.ts";
import type { AppConfig } from "../app.ts";
import { createIdentity } from "../identity/index.ts";
import { createChronistService } from "../domain/chronist/service.ts";
import { ChronistConflict } from "../domain/chronist/sources.ts";
const query=Type.Object({after:Type.Optional(Type.String({maxLength:256})),limit:Type.Optional(Type.String({pattern:"^(?:[1-9][0-9]?|100)$"})),entryId:Type.Optional(Type.String({maxLength:256})),runId:Type.Optional(Type.String({maxLength:256}))},{additionalProperties:false});
type Params={campaignId:string;runId:string;id:string;sessionId:string};
type Query={after?:string;limit?:string;entryId?:string;runId?:string};
const parsedQuery=({limit,...rest}:Query)=>({...rest,...(limit===undefined?{}:{limit:Number(limit)})});
export function registerChronist(app:FastifyInstance,db:Db,config:AppConfig){
  const service=createChronistService(db,config),identity=createIdentity(db,config),base="/api/campaigns/:campaignId/chronist";
  const user=async(cookie:string|undefined)=>(await identity.authenticate(cookie)).userId;
  async function handle<T>(reply:FastifyReply,fn:()=>Promise<T>):Promise<T|FastifyReply>{try{return await fn();}catch(error){
    if(error instanceof ChronistConflict)return reply.code(409).send({error:"Chronist-Stand prüfen und erneut bestätigen.",code:error.reason});
    if(error instanceof ChronistValidationError)return reply.code(error.code==="budget"?409:400).send({error:"Chronist-Eingabe prüfen.",code:error.code});throw error;}}
  app.get<{Params:Params}>(`${base}/providers`,async req=>service.providers(await user(req.headers.cookie),req.params.campaignId));
  // POST, obwohl nichts gespeichert wird: der Suchlauf greift nach aussen (auf die
  // Rueckschleife dieses Rechners) und wird ausdruecklich ausgeloest, nie nebenbei geholt.
  app.post<{Params:Params}>(`${base}/providers/scan`,async(req,reply)=>handle(reply,async()=>service.rescanProviders(await user(req.headers.cookie),req.params.campaignId)));
  app.get<{Params:Params;Querystring:Query}>(`${base}/sources`,{schema:{querystring:query}},async(req,reply)=>handle(reply,async()=>service.sources(await user(req.headers.cookie),req.params.campaignId,parsedQuery(req.query))));
  app.get<{Params:Params;Querystring:Query}>(`${base}/sessions`,{schema:{querystring:query}},async req=>service.sessions(await user(req.headers.cookie),req.params.campaignId,parsedQuery(req.query)));
  app.get<{Params:Params;Querystring:Query}>(`${base}/sessions/:sessionId/context`,{schema:{querystring:query}},async req=>service.sessionContext(await user(req.headers.cookie),req.params.campaignId,req.params.sessionId,parsedQuery(req.query)));
  app.post<{Params:Params;Body:ChronistPreviewBody}>(`${base}/runs/preview`,{schema:{body:ChronistPreview}},async(req,reply)=>handle(reply,async()=>service.preview(await user(req.headers.cookie),req.params.campaignId,req.body)));
  app.post<{Params:Params;Body:StartChronistRunBody}>(`${base}/runs`,{schema:{body:StartChronistRun}},async(req,reply)=>handle(reply,async()=>{const ack=await service.start(await user(req.headers.cookie),req.params.campaignId,req.body);reply.code(202);return ack;}));
  app.get<{Params:Params;Querystring:Query}>(`${base}/runs`,{schema:{querystring:query}},async req=>service.listRuns(await user(req.headers.cookie),req.params.campaignId,parsedQuery(req.query)));
  app.get<{Params:Params}>(`${base}/runs/:runId`,async req=>service.getRun(await user(req.headers.cookie),req.params.campaignId,req.params.runId));
  app.post<{Params:Params;Body:ResumeChronistRunBody}>(`${base}/runs/:runId/resume`,{schema:{body:ResumeChronistRun}},async(req,reply)=>handle(reply,async()=>service.resume(await user(req.headers.cookie),req.params.campaignId,req.params.runId,req.body)));
  app.post<{Params:Params;Body:{expectedVersion:number}}>(`${base}/runs/:runId/cancel`,{schema:{body:ChronistControl}},async(req,reply)=>handle(reply,async()=>service.cancel(await user(req.headers.cookie),req.params.campaignId,req.params.runId,req.body.expectedVersion)));
  app.get<{Params:Params;Querystring:Query}>(`${base}/suggestions`,{schema:{querystring:query}},async req=>service.suggestions(await user(req.headers.cookie),req.params.campaignId,parsedQuery(req.query)));
  app.get<{Params:Params}>(`${base}/suggestions/:id`,async req=>service.getSuggestion(await user(req.headers.cookie),req.params.campaignId,req.params.id));
  app.put<{Params:Params;Body:EditChronistProposalBody}>(`${base}/suggestions/:id`,{schema:{body:EditChronistProposal},bodyLimit:2*1024*1024},async(req,reply)=>handle(reply,async()=>service.editSuggestion(await user(req.headers.cookie),req.params.campaignId,req.params.id,req.body)));
  app.post<{Params:Params;Body:{expectedVersion:number}}>(`${base}/suggestions/:id/discard`,{schema:{body:ChronistControl}},async(req,reply)=>handle(reply,async()=>service.discardSuggestion(await user(req.headers.cookie),req.params.campaignId,req.params.id,req.body.expectedVersion)));
  app.post<{Params:Params;Body:SubmitChronistProposalBody}>(`${base}/suggestions/:id/submit`,{schema:{body:SubmitChronistProposal}},async(req,reply)=>handle(reply,async()=>service.submitSuggestion(await user(req.headers.cookie),req.params.campaignId,req.params.id,req.body)));
  app.addHook("onClose",async()=>service.close());return service;
}
