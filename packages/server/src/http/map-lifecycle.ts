// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import type { FastifyInstance, FastifyReply } from "fastify";
import { Type } from "@sinclair/typebox";
import { MapDeleteSchema, MapKindSchema, type MapDeleteInput, type MapKind } from "@chronicle/protocol";
import type { Db } from "../db/index.ts";
import { createIdentity, type IdentityConfig } from "../identity/index.ts";
import { Conflict } from "../domain/errors.ts";
import { createMapLifecycle, MapLifecycleConflict } from "../domain/map-lifecycle.ts";

export function registerMapLifecycle(app: FastifyInstance, db: Db, config: IdentityConfig): void {
  const identity = createIdentity(db, config), domain = createMapLifecycle(db, config);
  const params = Type.Object({ campaignId: Type.String({ minLength: 1, maxLength: 128 }), kind: MapKindSchema,
    mapId: Type.String({ minLength: 1, maxLength: 128 }) }, { additionalProperties: false });
  type Params = { campaignId: string; kind: MapKind; mapId: string };
  const base = "/api/campaigns/:campaignId/maps/:kind/:mapId";
  const ref = (at: Params) => ({ kind: at.kind, id: at.mapId });
  async function run(reply: FastifyReply, work: () => Promise<unknown>) {
    try { return await work(); }
    catch (error) {
      if (error instanceof MapLifecycleConflict) return reply.code(409).send(error.response());
      if (error instanceof Conflict) return reply.code(409).send({ code: "conflict", error: "Die Karte wurde inzwischen geändert. Bitte die Löschvorschau neu öffnen." });
      throw error;
    }
  }
  app.get<{ Params: Params }>(`${base}/deletion-preview`, { schema: { params } }, (req, reply) => run(reply, async () =>
    domain.preview((await identity.authenticate(req.headers.cookie)).userId, req.params.campaignId, ref(req.params))));
  app.post<{ Params: Params; Body: MapDeleteInput }>(`${base}/delete`, { schema: { params, body: MapDeleteSchema } }, (req, reply) => run(reply, async () =>
    domain.remove((await identity.authenticate(req.headers.cookie)).userId, req.params.campaignId, ref(req.params), req.body)));
}
