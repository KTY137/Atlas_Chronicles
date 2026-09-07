import type { Static } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import * as P from "@chronicle/protocol";
import type { Db } from "../db/index.ts";
import type { AppConfig } from "../app.ts";
import { createIdentity } from "../identity/index.ts";
import { createGeld } from "../domain/geld.ts";

/**
 * Die Türen zum Geldzähler. Die Einheit gehört der Runde und wird von der Spielleitung benannt;
 * die Börse gehört der Figur, und wer sie führt, ändert sie — dieselbe Prüfung wie beim Inventar.
 */
export function registerGeld(app: FastifyInstance, db: Db, config: AppConfig) {
  const identity = createIdentity(db, config), domain = createGeld(db, config);
  const user = async (cookie: string | undefined) => (await identity.authenticate(cookie)).userId;
  type Scope = { campaignId: string };
  type Figur = Scope & { actorId: string };

  app.get<{ Params: Scope }>("/api/campaigns/:campaignId/geld/einheit", async req =>
    domain.einheit(await user(req.headers.cookie), req.params.campaignId));
  app.put<{ Params: Scope; Body: Static<typeof P.GeldEinheitDraft> }>("/api/campaigns/:campaignId/geld/einheit",
    { schema: { body: P.GeldEinheitDraft } }, async req =>
      domain.einheitSetzen(await user(req.headers.cookie), req.params.campaignId, req.body));
  app.get<{ Params: Scope }>("/api/campaigns/:campaignId/geld", async req =>
    domain.alle(await user(req.headers.cookie), req.params.campaignId));
  app.get<{ Params: Figur }>("/api/campaigns/:campaignId/actors/:actorId/geld", async req =>
    domain.bestand(await user(req.headers.cookie), req.params.campaignId, req.params.actorId));
  app.put<{ Params: Figur; Body: Static<typeof P.GeldstandDraft> }>("/api/campaigns/:campaignId/actors/:actorId/geld",
    { schema: { body: P.GeldstandDraft } }, async req =>
      domain.setzen(await user(req.headers.cookie), req.params.campaignId, req.params.actorId, req.body));
}
