// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import type { Static } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import * as P from "@chronicle/protocol";
import type { Db } from "../db/index.ts";
import type { AppConfig } from "../app.ts";
import { createIdentity } from "../identity/index.ts";
import { createErleichterungen } from "../domain/erleichterungen.ts";

/**
 * Die Türen zu den Erleichterungen. **Das Einlösen steht bewusst nicht hier** — es geschieht am
 * Wurf (`POST /rolls` mit `erleichterungId`), auf dem einen Weg, auf dem in diesem Haus Würfel
 * fallen. Eine eigene Einlöseroute wäre ein zweiter Wurfpfad.
 */
export function registerErleichterungen(app: FastifyInstance, db: Db, config: AppConfig) {
  const identity = createIdentity(db, config), domain = createErleichterungen(db, config);
  const user = async (cookie: string | undefined) => (await identity.authenticate(cookie)).userId;
  type Scope = { campaignId: string };

  app.get<{ Params: Scope }>("/api/campaigns/:campaignId/erleichterungen", async req =>
    domain.offene(await user(req.headers.cookie), req.params.campaignId));
  app.get<{ Params: Scope & { actorId: string } }>("/api/campaigns/:campaignId/actors/:actorId/erleichterungen", async req =>
    domain.offene(await user(req.headers.cookie), req.params.campaignId, req.params.actorId));
  app.post<{ Params: Scope; Body: Static<typeof P.ErleichterungDraft> }>("/api/campaigns/:campaignId/erleichterungen",
    { schema: { body: P.ErleichterungDraft } }, async req =>
      domain.gewaehren(await user(req.headers.cookie), req.params.campaignId, req.body));
  app.delete<{ Params: Scope & { id: string } }>("/api/campaigns/:campaignId/erleichterungen/:id", async req =>
    domain.widerrufen(await user(req.headers.cookie), req.params.campaignId, req.params.id));
}
