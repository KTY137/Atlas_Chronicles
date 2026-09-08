// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import type { FastifyInstance } from "fastify";
import { Type, type Static } from "@sinclair/typebox";
import { TacticalMapValidationError } from "@chronicle/szene";
import { UvttValidationError } from "@chronicle/forge";
import * as P from "../../../protocol/src/tactical.ts";
import type { Db } from "../db/index.ts";
import { createIdentity, type IdentityConfig } from "../identity/index.ts";
import { createTactical, TacticalValidationError } from "../domain/tactical.ts";
import { TacticalRasterError } from "../domain/tactical-raster.ts";

/** Route-specific bound includes escaped JSON source and an optional native image. */
export const TACTICAL_IMPORT_BODY_LIMIT = 96 * 1024 * 1024;
export function registerTactical(app: FastifyInstance, db: Db, config: IdentityConfig) {
  const identity = createIdentity(db, config), tactical = createTactical(db, config);
  const auth = async (cookie: string | undefined) => (await identity.authenticate(cookie)).userId;
  const base = "/api/campaigns/:campaignId";
  type Scope = { campaignId: string }; type Item = Scope & { id: string };
  type Token = Item & { tokenId: string }; type Portal = Item & { portalId: string };
  type Tile = Item & { level: string; x: string; y: string };
  const revisionQuery = Type.Object({ revision: Type.Optional(Type.String({ pattern: "^[1-9][0-9]{0,9}$" })) }, { additionalProperties: false });
  const tileQuery = Type.Object({ ...revisionQuery.properties, view: Type.Optional(Type.String({ pattern: "^[a-f0-9]{64}$" })) }, { additionalProperties: false });
  // Die drei Routen mit TACTICAL_IMPORT_BODY_LIMIT tragen bis zu 96 MiB und rastern anschließend.
  // Ohne eigenes Budget liefen sie unter dem allgemeinen 240/Minute, während der weit billigere
  // Export auf 4/Minute steht (http/bundles.ts). Acht lässt ein ungeduldiges Nacheinander zu.
  const importLimit = { rateLimit: { max: 8, timeWindow: "1 minute" } };
  // Panning and revising a map requests many tiles. They share one bounded budget across both
  // preview and live routes, separate from commands and lists. Reusing one plugin hook matters:
  // route-specific config alone would create a separate store for each route. The plugin keeps
  // the application's verified-user/IP identity rule; raster concurrency is still bounded below.
  // Minimal route harnesses without the plugin retain their existing unthrottled test setup.
  const tileAdmission = app.hasDecorator("rateLimit") ? app.rateLimit({ max: 768, timeWindow: "1 minute" }) : undefined;
  const tileOptions = { config: { rateLimit: false as const }, ...(tileAdmission ? { onRequest: tileAdmission } : {}), schema: { querystring: tileQuery } };
  const number = (raw: string, minimum = 0) => {
    const value = Number(raw);
    if (!/^[0-9]{1,10}$/.test(raw) || !Number.isSafeInteger(value) || value < minimum || value > 2_147_483_647) throw new TacticalValidationError("Ungültige Kartennummer.");
    return value;
  };
  const revision = (raw?: string) => raw === undefined ? undefined : number(raw, 1);
  async function run<T>(work: () => Promise<T>): Promise<T> {
    try { return await work(); } catch (error) {
      if (error instanceof TacticalMapValidationError || error instanceof UvttValidationError) throw new TacticalValidationError(error.message);
      if (error instanceof TacticalRasterError) {
        const failure = new Error(error.message) as Error & { statusCode: number };
        failure.statusCode = error.code === "invalid" ? 400 : 503; throw failure;
      }
      throw error;
    }
  }
  app.get<{ Params: Scope }>(`${base}/tactical/maps`, req => run(async () => tactical.listMaps(await auth(req.headers.cookie), req.params.campaignId)));
  app.post<{ Params: Scope; Body: P.TacticalImportInput }>(`${base}/tactical/maps/import-preview`, { bodyLimit: TACTICAL_IMPORT_BODY_LIMIT, config: importLimit, schema: { body: P.TacticalImportSchema } }, req => run(async () => tactical.importPreview(await auth(req.headers.cookie), req.params.campaignId, req.body)));
  app.post<{ Params: Scope; Body: P.TacticalImportInput }>(`${base}/tactical/maps`, { bodyLimit: TACTICAL_IMPORT_BODY_LIMIT, config: importLimit, schema: { body: P.TacticalImportSchema } }, req => run(async () => tactical.importMap(await auth(req.headers.cookie), req.params.campaignId, req.body)));
  app.get<{ Params: Item; Querystring: Static<typeof revisionQuery> }>(`${base}/tactical/maps/:id`, { schema: { querystring: revisionQuery } }, req => run(async () => tactical.getMap(await auth(req.headers.cookie), req.params.campaignId, req.params.id, revision(req.query.revision))));
  app.get<{ Params: Item; Querystring: Static<typeof revisionQuery> }>(`${base}/tactical/maps/:id/source`, { schema: { querystring: revisionQuery } }, req => run(async () => tactical.getSource(await auth(req.headers.cookie), req.params.campaignId, req.params.id, revision(req.query.revision))));
  app.get<{ Params: Item; Querystring: Static<typeof revisionQuery> }>(`${base}/tactical/maps/:id/uvtt`, { schema: { querystring: revisionQuery } }, req => run(async () => tactical.exportMap(await auth(req.headers.cookie), req.params.campaignId, req.params.id, revision(req.query.revision))));
  app.put<{ Params: Item; Body: P.TacticalRevisionInput }>(`${base}/tactical/maps/:id/revision`, { bodyLimit: TACTICAL_IMPORT_BODY_LIMIT, config: importLimit, schema: { body: P.TacticalRevisionSchema } }, req => run(async () => tactical.reviseMap(await auth(req.headers.cookie), req.params.campaignId, req.params.id, req.body)));
  app.get<{ Params: Item }>(`${base}/scenes/:id/tactical-plan`, req => run(async () => tactical.getPlan(await auth(req.headers.cookie), req.params.campaignId, req.params.id)));
  app.put<{ Params: Item; Body: P.TacticalPlanInput }>(`${base}/scenes/:id/tactical-plan`, { schema: { body: P.TacticalPlanSchema } }, req => run(async () => tactical.savePlan(await auth(req.headers.cookie), req.params.campaignId, req.params.id, req.body)));
  app.get<{ Params: Scope }>(`${base}/tactical/active`, req => run(async () => tactical.getActive(await auth(req.headers.cookie), req.params.campaignId)));
  app.get<{ Params: Item }>(`${base}/sessions/:id/tactical`, req => run(async () => tactical.getSession(await auth(req.headers.cookie), req.params.campaignId, req.params.id)));
  app.post<{ Params: Token; Body: P.TacticalMoveInput }>(`${base}/sessions/:id/tactical/tokens/:tokenId/move`, { schema: { body: P.TacticalMoveSchema } }, req => run(async () => tactical.moveToken(await auth(req.headers.cookie), req.params.campaignId, req.params.id, req.params.tokenId, req.body)));
  app.post<{ Params: Portal; Body: P.TacticalPortalInput }>(`${base}/sessions/:id/tactical/portals/:portalId`, { schema: { body: P.TacticalPortalSchema } }, req => run(async () => tactical.setPortal(await auth(req.headers.cookie), req.params.campaignId, req.params.id, req.params.portalId, req.body)));
  app.post<{ Params: Item; Body: P.TacticalUndoInput }>(`${base}/sessions/:id/tactical/undo`, { schema: { body: P.TacticalUndoSchema } }, req => run(async () => tactical.undo(await auth(req.headers.cookie), req.params.campaignId, req.params.id, req.body)));
  app.get<{ Params: Tile; Querystring: Static<typeof tileQuery> }>(`${base}/sessions/:id/tactical/tiles/:level/:x/:y`, tileOptions, (req, reply) => run(async () => {
    const tile = await tactical.getTile(await auth(req.headers.cookie), req.params.campaignId, req.params.id, number(req.params.level), number(req.params.x), number(req.params.y), req.query.view);
    return reply.header("Cache-Control", "private, no-store").header("X-Tactical-View", tile.view).type(tile.mimeType).send(tile.bytes);
  }));
  app.get<{ Params: Tile; Querystring: Static<typeof tileQuery> }>(`${base}/tactical/maps/:id/tiles/:level/:x/:y`, tileOptions, (req, reply) => run(async () => {
    const tile = await tactical.getMapTile(await auth(req.headers.cookie), req.params.campaignId, req.params.id, revision(req.query.revision), number(req.params.level), number(req.params.x), number(req.params.y), req.query.view);
    return reply.header("Cache-Control", "private, no-store").header("X-Tactical-View", tile.view).type(tile.mimeType).send(tile.bytes);
  }));
}
