// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import type { FastifyInstance } from "fastify";
import { Type, type Static } from "@sinclair/typebox";
import type { Db } from "../db/index.ts";
import { createIdentity } from "../identity/index.ts";
import { createAtlas } from "../domain/atlas.ts";
import { createAtlasQuellen } from "../domain/atlas-quellen.ts";
import { WIKI_ASSET_GRENZEN } from "../domain/wiki-medien.ts";
import { ImportValidationError } from "@chronicle/io";
import { createImports } from "../domain/imports.ts";
import type { AppConfig } from "../app.ts";
import { Id } from "@chronicle/protocol";

export function registerImports(app: FastifyInstance,db: Db,config: AppConfig) {
  const identity = createIdentity(db,config), atlas = createAtlas(db,config), imports = createImports(db,config);
  const quellen = createAtlasQuellen(db,config);
  const closed = {additionalProperties:false}, jsonBody = Type.Object({json:Type.String({maxLength:32*1024*1024})},closed);
  const attribution = Type.Object({ complete: Type.Literal(true), authors: Type.Array(Type.String({ minLength: 1, maxLength: 512, pattern: "\\S" }), { maxItems: 100_000 }),
    anonymousContributions: Type.Integer({ minimum: 0, maximum: Number.MAX_SAFE_INTEGER }), revisionSha1: Type.String({ pattern: "^[0-9a-zA-Z]{1,40}$" }) }, closed);
  const eron = Type.Object({articles:Type.Array(Type.Unknown(),{maxItems:10_000}),templates:Type.Array(Type.Unknown(),{maxItems:10_000}),wikiUrl:Type.String({maxLength:1000}),
    license: Type.Optional(Type.String({ minLength: 1, maxLength: 200, pattern: "\\S" })),
    attributionByPageId: Type.Optional(Type.Record(Type.String({ pattern: "^[1-9][0-9]{0,15}$" }), attribution, { ...closed, maxProperties: 10_000 })),
    // Der Dateibestand des Quell-Wikis: Metadaten, keine Bytes. Die Bytes kommen einzeln über
    // /wiki-medien/:id/bytes, damit ein Artikelimport nicht auf hundert CDN-Antworten wartet.
    media: Type.Optional(Type.Array(Type.Unknown(), { maxItems: 20_000 })) },closed);
  const selection = Type.Object({entryIds:Type.Array(Id,{maxItems:10_000})},closed);
  // Adresse und Kartenname kommen vom Menschen; die Feinpruefung macht `wiki-abruf.ts`.
  const ausWiki = Type.Object({wiki:Type.String({minLength:1,maxLength:500}),titel:Type.String({minLength:1,maxLength:255})},closed);
  const bildFrage = Type.Object({dateiname:Type.String({minLength:1,maxLength:512}),
    lizenz:Type.Optional(Type.Union([Type.Literal("frei"),Type.Literal("zitat"),Type.Literal("unbekannt")])),
    quelle:Type.Optional(Type.String({maxLength:2000}))},closed);
  const link = Type.Object({entryId:Id,expectedVersion:Type.Integer({minimum:1})},closed), reveal = Type.Object({actorId:Id},closed);
  type Scope = {campaignId:string}; type Item = Scope & {id:string}; type Node = Item & {nodeId:string};
  // Der Weg hinein trägt 64 MiB, der Weg hinaus steht auf 4/Minute (http/bundles.ts). Acht und
  // nicht vier: ein Import wird beim Einrichten mehrfach hintereinander versucht, ein Export nicht.
  const importLimit = {rateLimit:{max:8,timeWindow:"1 minute"}};
  app.post<{Params:Scope;Body:Static<typeof jsonBody>}>("/api/campaigns/:campaignId/maps/import", {schema:{body:jsonBody},bodyLimit:64*1024*1024,config:importLimit}, async req =>
    atlas.importMap((await identity.authenticate(req.headers.cookie)).userId,req.params.campaignId,req.body.json));
  /**
   * Die Karte aus einem Wiki. NUR hier spricht der Server nach draußen, und nur, weil die
   * Spielleitung gerade eine Adresse eingetippt hat: kein Zeitplan, kein Programmstart, kein
   * importierter Inhalt erreicht diesen Weg. Der Ratenzaehler ist derselbe wie beim Import.
   */
  app.post<{Params:Scope;Body:Static<typeof ausWiki>}>("/api/campaigns/:campaignId/maps/aus-wiki",
    {schema:{body:ausWiki},config:importLimit}, async req =>
      quellen.ausWiki((await identity.authenticate(req.headers.cookie)).userId, req.params.campaignId, req.body));
  /** Die mitgelieferte Beispielkarte — derselbe Weg, nur ohne Netz. */
  app.post<{Params:Scope}>("/api/campaigns/:campaignId/maps/beispiel", {config:importLimit}, async req =>
    quellen.beispiel((await identity.authenticate(req.headers.cookie)).userId, req.params.campaignId));
  /**
   * Eine Karte, die nur aus einem Bild besteht (Inkarnate, Wonderdraft, ein Scan). Die Bytes
   * kommen roh, weil base64 in JSON ein Drittel Aufschlag kostet und die Vermessung ohnehin auf
   * den Bytes arbeitet — derselbe Rahmen wie beim Bildbestand.
   */
  app.post<{Params:Scope;Querystring:Static<typeof bildFrage>}>("/api/campaigns/:campaignId/maps/bild",
    {schema:{querystring:bildFrage},bodyLimit:WIKI_ASSET_GRENZEN.bytes+1024,config:importLimit}, async req => {
      const body: unknown = req.body;
      if (!Buffer.isBuffer(body)) throw new ImportValidationError("bild", "raw image bytes required");
      return quellen.ausBild((await identity.authenticate(req.headers.cookie)).userId, req.params.campaignId,
        { dateiname: req.query.dateiname, ...(req.query.lizenz ? { lizenz: req.query.lizenz } : {}), ...(req.query.quelle ? { quelle: req.query.quelle } : {}) }, body);
    });
  app.get<{Params:Item}>("/api/campaigns/:campaignId/maps/:id/image", async (req, reply) => {
    const bild = await atlas.mapImage((await identity.authenticate(req.headers.cookie)).userId, req.params.campaignId, req.params.id);
    return reply.header("Cache-Control", "private, no-store").header("X-Content-Type-Options", "nosniff")
      .header("Content-Security-Policy", "default-src 'none'; sandbox").header("ETag", `"${bild.sha256}"`)
      .type(bild.mime).send(bild.daten);
  });
  app.get<{Params:Scope}>("/api/campaigns/:campaignId/maps", async req => atlas.listMaps((await identity.authenticate(req.headers.cookie)).userId,req.params.campaignId));
  app.get<{Params:Item}>("/api/campaigns/:campaignId/maps/:id", async req => atlas.getMap((await identity.authenticate(req.headers.cookie)).userId,req.params.campaignId,req.params.id));
  app.post<{Params:Node;Body:Static<typeof link>}>("/api/campaigns/:campaignId/maps/:id/nodes/:nodeId/link", {schema:{body:link}}, async req =>
    atlas.linkEntry((await identity.authenticate(req.headers.cookie)).userId,req.params.campaignId,req.params.id,req.params.nodeId,req.body.entryId,req.body.expectedVersion));
  app.post<{Params:Node;Body:Static<typeof reveal>}>("/api/campaigns/:campaignId/maps/:id/nodes/:nodeId/reveal", {schema:{body:reveal}}, async req => {
    await atlas.revealNode((await identity.authenticate(req.headers.cookie)).userId,req.params.campaignId,req.params.id,req.params.nodeId,req.body.actorId); return {ok:true};
  });
  app.post<{Params:Scope;Body:Static<typeof eron>}>("/api/campaigns/:campaignId/imports/eron", {schema:{body:eron},bodyLimit:24*1024*1024,config:importLimit}, async req =>
    imports.previewEron((await identity.authenticate(req.headers.cookie)).userId,req.params.campaignId,req.body));
  app.post<{Params:Item;Body:Static<typeof selection>}>("/api/campaigns/:campaignId/imports/:id/accept", {schema:{body:selection}}, async req =>
    imports.acceptEron((await identity.authenticate(req.headers.cookie)).userId,req.params.campaignId,req.params.id,req.body.entryIds));
  app.get<{Params:Item}>("/api/campaigns/:campaignId/imports/:id", async req => imports.artifact((await identity.authenticate(req.headers.cookie)).userId,req.params.campaignId,req.params.id));
}
