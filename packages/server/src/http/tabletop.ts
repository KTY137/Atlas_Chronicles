// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import type { FastifyInstance, FastifyRequest } from "fastify";
import { AdventureAdvance, AdventureUpdate } from "@chronicle/protocol";
import type { AppConfig } from "../app.ts";
import type { Db } from "../db/index.ts";
import { createTabletop } from "../domain/tabletop.ts";
import { createIdentity } from "../identity/index.ts";

export function registerTabletop(app: FastifyInstance, db: Db, config: AppConfig) {
  const service = createTabletop(db, config), identity = createIdentity(db, config);
  const auth = async (req: FastifyRequest) => (await identity.authenticate(req.headers.cookie)).userId;
  type Scope = { campaignId: string };
  const base = "/api/campaigns/:campaignId/tabletop/adventure";
  app.get<{ Params: Scope }>(base, async req => service.getAdventure(await auth(req), req.params.campaignId));
  app.put<{ Params: Scope }>(base, { schema: { body: AdventureUpdate } }, async req => service.saveAdventure(await auth(req), req.params.campaignId, req.body));
  app.post<{ Params: Scope }>(`${base}/advance`, { schema: { body: AdventureAdvance } }, async req => service.advanceAdventure(await auth(req), req.params.campaignId, req.body));
}
