// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import type { FastifyInstance } from "fastify";
import { Type, type Static, type TSchema } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import { MapFloorValidationError, RoomFogValidationError, TacticalMapValidationError, TacticalCartographyValidationError } from "@chronicle/szene";
import * as P from "../../../protocol/src/map-studio.ts";
import type { Db } from "../db/index.ts";
import { createIdentity, type IdentityConfig } from "../identity/index.ts";
import { createMapStudio } from "../domain/map-studio.ts";
import { TacticalValidationError } from "../domain/tactical.ts";

export function registerMapStudio(app: FastifyInstance, db: Db, config: IdentityConfig) {
  const studio = createMapStudio(db, config), identity = createIdentity(db, config);
  const auth = async (cookie?: string) => (await identity.authenticate(cookie)).userId;
  const base = "/api/campaigns/:campaignId/tactical/maps/:id";
  type Params = { campaignId: string; id: string };
  const query = Type.Object({ revision: Type.Optional(Type.String({ pattern: "^[1-9][0-9]{0,9}$" })) }, { additionalProperties: false });
  const run = async <T>(work: () => Promise<T>) => {
    try { return await work(); } catch (error) {
      if (error instanceof MapFloorValidationError || error instanceof RoomFogValidationError || error instanceof TacticalMapValidationError || error instanceof TacticalCartographyValidationError)
        throw new TacticalValidationError(error.message);
      throw error;
    }
  };
  const options = (schema: TSchema) => ({ schema: { body: schema }, bodyLimit: 2 * 1024 * 1024,
    config: { rateLimit: { max: 60, timeWindow: "1 minute" } },
    // Reject instead of silently removing unknown fields from versioned commands.
    validatorCompiler: () => (data: unknown) => Value.Check(schema, data) ? { value: data } : { error: new TacticalValidationError("Bitte Geschossangaben und Raumfreigaben prüfen.") },
  });
  app.get<{ Params: Params }>(`${base}/floors`, req => run(async () => studio.getFloors(await auth(req.headers.cookie), req.params.campaignId, req.params.id)));
  app.post<{ Params: Params; Body: P.MapFloorAddInput }>(`${base}/floors`, { ...options(P.MapFloorAddSchema), config: { rateLimit: { max: 8, timeWindow: "1 minute" } } }, req => run(async () => studio.addFloor(await auth(req.headers.cookie), req.params.campaignId, req.params.id, req.body)));
  app.post<{ Params: Params; Body: P.MapFloorLinkInput }>(`${base}/floors/links`, options(P.MapFloorLinkSchema), req => run(async () => studio.linkFloors(await auth(req.headers.cookie), req.params.campaignId, req.params.id, req.body)));
  app.post<{ Params: Params; Body: P.MapFloorUnlinkInput }>(`${base}/floors/unlink`, options(P.MapFloorUnlinkSchema), req => run(async () => studio.unlinkFloors(await auth(req.headers.cookie), req.params.campaignId, req.params.id, req.body)));
  app.post<{ Params: Params; Body: P.MapFloorRenameInput }>(`${base}/floors/name`, options(P.MapFloorRenameSchema), req => run(async () => studio.renameFloor(await auth(req.headers.cookie), req.params.campaignId, req.params.id, req.body)));
  app.post<{ Params: Params; Body: unknown }>(`${base}/floors/detach`, options(P.MapFloorDetachSchema), req => run(async () => studio.detachFloor(await auth(req.headers.cookie), req.params.campaignId, req.params.id, req.body)));
  app.get<{ Params: Params; Querystring: Static<typeof query> }>(`${base}/fog`, { schema: { querystring: query } }, req => run(async () => {
    const revision = req.query.revision === undefined ? undefined : Number(req.query.revision);
    if (revision !== undefined && (!Number.isSafeInteger(revision) || revision > 2147483647)) throw new TacticalValidationError("Ungültige Kartennummer.");
    return studio.getFog(await auth(req.headers.cookie), req.params.campaignId, req.params.id, revision);
  }));
  app.post<{ Params: Params; Body: P.RoomFogSetInput }>(`${base}/fog`, options(P.RoomFogSetSchema), req => run(async () => studio.setFog(await auth(req.headers.cookie), req.params.campaignId, req.params.id, req.body)));
}
