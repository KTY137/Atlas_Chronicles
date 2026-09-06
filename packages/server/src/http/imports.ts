import type { FastifyInstance } from "fastify";
import { Type, type Static } from "@sinclair/typebox";
import type { Db } from "../db/index.ts";
import { createIdentity } from "../identity/index.ts";
import { createAtlas } from "../domain/atlas.ts";
import { createImports } from "../domain/imports.ts";
import type { AppConfig } from "../app.ts";
import { Id } from "@chronicle/protocol";

export function registerImports(app: FastifyInstance,db: Db,config: AppConfig) {
  const identity = createIdentity(db,config), atlas = createAtlas(db,config), imports = createImports(db,config);
  const closed = {additionalProperties:false}, jsonBody = Type.Object({json:Type.String({maxLength:32*1024*1024})},closed);
  const eron = Type.Object({articles:Type.Array(Type.Unknown(),{maxItems:10_000}),templates:Type.Array(Type.Unknown(),{maxItems:10_000}),wikiUrl:Type.String({maxLength:1000})},closed);
  const selection = Type.Object({entryIds:Type.Array(Id,{maxItems:10_000})},closed);
  const link = Type.Object({entryId:Id,expectedVersion:Type.Integer({minimum:1})},closed), reveal = Type.Object({actorId:Id},closed);
  type Scope = {campaignId:string}; type Item = Scope & {id:string}; type Node = Item & {nodeId:string};
  app.post<{Params:Scope;Body:Static<typeof jsonBody>}>("/api/campaigns/:campaignId/maps/import", {schema:{body:jsonBody},bodyLimit:64*1024*1024}, async req =>
    atlas.importMap((await identity.authenticate(req.headers.cookie)).userId,req.params.campaignId,req.body.json));
  app.get<{Params:Scope}>("/api/campaigns/:campaignId/maps", async req => atlas.listMaps((await identity.authenticate(req.headers.cookie)).userId,req.params.campaignId));
  app.get<{Params:Item}>("/api/campaigns/:campaignId/maps/:id", async req => atlas.getMap((await identity.authenticate(req.headers.cookie)).userId,req.params.campaignId,req.params.id));
  app.post<{Params:Node;Body:Static<typeof link>}>("/api/campaigns/:campaignId/maps/:id/nodes/:nodeId/link", {schema:{body:link}}, async req =>
    atlas.linkEntry((await identity.authenticate(req.headers.cookie)).userId,req.params.campaignId,req.params.id,req.params.nodeId,req.body.entryId,req.body.expectedVersion));
  app.post<{Params:Node;Body:Static<typeof reveal>}>("/api/campaigns/:campaignId/maps/:id/nodes/:nodeId/reveal", {schema:{body:reveal}}, async req => {
    await atlas.revealNode((await identity.authenticate(req.headers.cookie)).userId,req.params.campaignId,req.params.id,req.params.nodeId,req.body.actorId); return {ok:true};
  });
  app.post<{Params:Scope;Body:Static<typeof eron>}>("/api/campaigns/:campaignId/imports/eron", {schema:{body:eron},bodyLimit:24*1024*1024}, async req =>
    imports.previewEron((await identity.authenticate(req.headers.cookie)).userId,req.params.campaignId,req.body));
  app.post<{Params:Item;Body:Static<typeof selection>}>("/api/campaigns/:campaignId/imports/:id/accept", {schema:{body:selection}}, async req =>
    imports.acceptEron((await identity.authenticate(req.headers.cookie)).userId,req.params.campaignId,req.params.id,req.body.entryIds));
  app.get<{Params:Item}>("/api/campaigns/:campaignId/imports/:id", async req => imports.artifact((await identity.authenticate(req.headers.cookie)).userId,req.params.campaignId,req.params.id));
}
