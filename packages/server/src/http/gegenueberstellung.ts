// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import type { FastifyInstance } from "fastify";
import type { Db } from "../db/index.ts";
import type { AppConfig } from "../app.ts";
import { createIdentity } from "../identity/index.ts";
import { createGegenueberstellung } from "../domain/gegenueberstellung.ts";

export function registerGegenueberstellung(app: FastifyInstance, db: Db, config: AppConfig) {
  const identity = createIdentity(db, config), domain = createGegenueberstellung(db, config);
  app.get<{ Params: { campaignId: string; id: string }; Querystring: { links?: string; rechts?: string } }>(
    "/api/campaigns/:campaignId/entries/:id/gegenueberstellung", async req =>
      domain.compare((await identity.authenticate(req.headers.cookie)).userId,
        req.params.campaignId, req.params.id, req.query.links, req.query.rechts));
}
