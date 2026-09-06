import type { FastifyInstance, FastifyRequest } from "fastify";
import { Type, type Static } from "@sinclair/typebox";
import type { Db } from "../db/index.ts";
import type { AppConfig } from "../app.ts";
import { createIdentity } from "../identity/index.ts";
import { createGameplay } from "../domain/gameplay.ts";
import * as P from "@chronicle/protocol";

export function registerGameplay(app: FastifyInstance, db: Db, config: AppConfig) {
  const identity=createIdentity(db,config), game=createGameplay(db,config);
  const auth=async (req:FastifyRequest)=>(await identity.authenticate(req.headers.cookie)).userId;
  type Scope={campaignId:string}; type Item=Scope & {id:string};
  const base="/api/campaigns/:campaignId";
  app.get<{Params:Scope}>(`${base}/rules`,async req=>game.listPackages(await auth(req),req.params.campaignId));
  app.post<{Params:Scope;Body:unknown}>(`${base}/rules`,{schema:{body:Type.Object({},{additionalProperties:true})}},async req=>game.installPackage(await auth(req),req.params.campaignId,req.body));
  app.post<{Params:Scope;Body:Static<typeof P.PackageActivation>}>(`${base}/rules/activate`,{schema:{body:P.PackageActivation}},async req=>game.activatePackage(await auth(req),req.params.campaignId,req.body));
  app.get<{Params:Item}>(`${base}/actors/:id/sheet`,async req=>game.getSheet(await auth(req),req.params.campaignId,req.params.id));
  app.put<{Params:Item;Body:Static<typeof P.SheetUpdate>}>(`${base}/actors/:id/sheet`,{schema:{body:P.SheetUpdate}},async req=>game.updateSheet(await auth(req),req.params.campaignId,{...req.body,actorId:req.params.id}));
  app.post<{Params:Item;Body:Static<typeof P.ResourceAdjustment>}>(`${base}/actors/:id/resource`,{schema:{body:P.ResourceAdjustment}},async req=>game.adjustResource(await auth(req),req.params.campaignId,{...req.body,actorId:req.params.id}));
  app.get<{Params:Scope}>(`${base}/scenes`,async req=>game.listScenes(await auth(req),req.params.campaignId));
  app.post<{Params:Scope;Body:Static<typeof P.SceneDraft>}>(`${base}/scenes`,{schema:{body:P.SceneDraft}},async req=>game.createScene(await auth(req),req.params.campaignId,req.body));
  app.post<{Params:Item}>(`${base}/scenes/:id/start`,async req=>game.startScene(await auth(req),req.params.campaignId,req.params.id));
  app.get<{Params:Scope}>(`${base}/rolls`,async req=>game.listRolls(await auth(req),req.params.campaignId));
  app.post<{Params:Scope;Body:Static<typeof P.ActionDraft>}>(`${base}/rolls`,{schema:{body:P.ActionDraft}},async req=>game.prepareAction(await auth(req),req.params.campaignId,req.body));
  app.get<{Params:Item}>(`${base}/rolls/:id`,async req=>game.getRoll(await auth(req),req.params.campaignId,req.params.id));
  app.post<{Params:Item}>(`${base}/rolls/:id/confirm`,async req=>game.confirmAction(await auth(req),req.params.campaignId,req.params.id));
  app.get<{Params:Item}>(`${base}/rolls/:id/replay`,async req=>game.replayRoll(await auth(req),req.params.campaignId,req.params.id));
  app.get<{Params:Item}>(`${base}/passages/:id/provenance`,async req=>game.mintProvenance(await auth(req),req.params.campaignId,req.params.id));
  app.post<{Params:Scope;Body:Static<typeof P.MintDraft>}>(`${base}/mints/gesprochen`,{schema:{body:P.MintDraft}},async req=>game.mintGesprochen(await auth(req),req.params.campaignId,req.body));
  app.post<{Params:Scope;Body:Static<typeof P.MintDraft>}>(`${base}/mints/ratifikation`,{schema:{body:P.MintDraft}},async req=>game.mintRatifikation(await auth(req),req.params.campaignId,req.body));
  app.post<{Params:Scope;Body:Static<typeof P.CorrectionDraft>}>(`${base}/mints/berichtigung`,{schema:{body:P.CorrectionDraft}},async req=>game.mintBerichtigung(await auth(req),req.params.campaignId,{...req.body,ersetztPassageId:req.body.replaces}));
  app.post<{Params:Scope;Body:Static<typeof P.DefeatDraft>}>(`${base}/mints/defeat`,{schema:{body:P.DefeatDraft}},async req=>game.confirmDefeat(await auth(req),req.params.campaignId,req.body));
  app.get<{Params:Scope}>(`${base}/vollmachten`,async req=>game.listVollmachten(await auth(req),req.params.campaignId));
  app.post<{Params:Scope;Body:Static<typeof P.VollmachtDraft>}>(`${base}/vollmachten`,{schema:{body:P.VollmachtDraft}},async req=>game.issueVollmacht(await auth(req),req.params.campaignId,req.body));
  app.post<{Params:Item;Body:Static<typeof P.DoorAction>}>(`${base}/vollmachten/:id/roll`,{schema:{body:P.DoorAction}},async req=>game.prepareVollmacht(await auth(req),req.params.campaignId,req.params.id,req.body));
  app.post<{Params:Item}>(`${base}/vollmachten/rolls/:id/confirm`,async req=>game.confirmVollmacht(await auth(req),req.params.campaignId,req.params.id));
  app.delete<{Params:Item}>(`${base}/vollmachten/:id`,async req=>game.revokeVollmacht(await auth(req),req.params.campaignId,req.params.id));
}
