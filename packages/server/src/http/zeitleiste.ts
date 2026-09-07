import type { FastifyInstance } from "fastify";
import type { Db } from "../db/index.ts";
import type { AppConfig } from "../app.ts";
import { createIdentity } from "../identity/index.ts";
import { createZeitleiste } from "../domain/zeitleiste.ts";

export function registerZeitleiste(app: FastifyInstance, db: Db, config: AppConfig) {
  const identity = createIdentity(db, config), domain = createZeitleiste(db, config);
  app.get<{ Params: { campaignId: string } }>("/api/campaigns/:campaignId/zeitleiste", async req =>
    domain.zeitleiste((await identity.authenticate(req.headers.cookie)).userId, req.params.campaignId));
}
