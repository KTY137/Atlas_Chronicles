import type { FastifyInstance } from "fastify";
import type { Db } from "../db/index.ts";
import type { AppConfig } from "../app.ts";
import { createIdentity } from "../identity/index.ts";
import { createZeitleiste } from "../domain/zeitleiste.ts";
import { createChronist } from "../domain/chronist.ts";

export function registerZeitleiste(app: FastifyInstance, db: Db, config: AppConfig) {
  const identity = createIdentity(db, config), domain = createZeitleiste(db, config), chronist = createChronist(db, config);
  app.get<{ Params: { campaignId: string } }>("/api/campaigns/:campaignId/zeitleiste", async req =>
    domain.zeitleiste((await identity.authenticate(req.headers.cookie)).userId, req.params.campaignId));
  // Der Chronist steht neben der Zeitleiste, weil er aus ihr liest — und weil eine eigene
  // Flaeche fuer eine Liste von Vorschlaegen mehr Weg als Nutzen waere.
  app.get<{ Params: { campaignId: string } }>("/api/campaigns/:campaignId/chronist", async req =>
    chronist.vorschlaege((await identity.authenticate(req.headers.cookie)).userId, req.params.campaignId));
}
