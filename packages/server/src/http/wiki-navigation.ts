// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import type { FastifyInstance } from "fastify";
import type { Db } from "../db/index.ts";
import type { AppConfig } from "../app.ts";
import { createIdentity } from "../identity/index.ts";
import { createWikiNavigation } from "../domain/wiki-navigation.ts";

export function registerWikiNavigation(app: FastifyInstance, db: Db, config: AppConfig) {
  const identity = createIdentity(db, config), wiki = createWikiNavigation(db, config);
  app.get<{ Params: { campaignId: string; slug: string } }>("/api/campaigns/:campaignId/wiki/:slug", async req =>
    wiki.resolveSlug((await identity.authenticate(req.headers.cookie)).userId, req.params.campaignId, req.params.slug));
  app.get<{ Params: { campaignId: string } }>("/api/campaigns/:campaignId/navigation", async req =>
    wiki.uebersicht((await identity.authenticate(req.headers.cookie)).userId, req.params.campaignId));
  app.get<{ Params: { campaignId: string; id: string } }>("/api/campaigns/:campaignId/entries/:id/backlinks", async req =>
    wiki.backlinks((await identity.authenticate(req.headers.cookie)).userId, req.params.campaignId, req.params.id));
}
