// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { Type, type Static } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import type { Beziehungsart } from "@chronicle/chronik";
import type { Db } from "../db/index.ts";
import type { AppConfig } from "../app.ts";
import { createIdentity } from "../identity/index.ts";
import { createGefuege } from "../domain/gefuege.ts";

const id = Type.String({ minLength: 1, maxLength: 128 });
export const BEZIEHUNGSARTEN = ["elternteil_von", "verheiratet_mit", "geschwister_von", "buendnis_mit", "feindschaft_mit", "lehen_von", "mitglied_von"] as const;
/** Die geschlossene Menge steht im Schema, damit eine unbekannte Art an der Tuer scheitert. */
const BeziehungAnlegen = Type.Object({
  passageId: id, vonEntryId: id, nachEntryId: id,
  art: Type.Union(BEZIEHUNGSARTEN.map(value => Type.Literal(value))),
  rolle: Type.Optional(Type.String({ minLength: 1, maxLength: 160, pattern: "\S" })),
}, { additionalProperties: false });

export function registerGefuege(app: FastifyInstance, db: Db, config: AppConfig) {
  const identity = createIdentity(db, config), domain = createGefuege(db, config);
  const user = async (cookie: string | undefined) => (await identity.authenticate(cookie)).userId;
  type Scope = { campaignId: string };
  app.get<{ Params: Scope }>("/api/campaigns/:campaignId/gefuege", async req =>
    domain.gefuege(await user(req.headers.cookie), req.params.campaignId));
  app.get<{ Params: Scope & { entryId: string } }>("/api/campaigns/:campaignId/entries/:entryId/gefuege", async req =>
    domain.gefuege(await user(req.headers.cookie), req.params.campaignId, req.params.entryId));
  app.post<{ Params: Scope; Body: Static<typeof BeziehungAnlegen> }>("/api/campaigns/:campaignId/beziehungen",
    { schema: { body: BeziehungAnlegen } }, async req =>
      domain.anlegen(await user(req.headers.cookie), req.params.campaignId, { ...req.body, art: req.body.art as Beziehungsart }));
  app.post<{ Params: Scope & { id: string } }>("/api/campaigns/:campaignId/beziehungen/:id/zurueckziehen", async req =>
    domain.zurueckziehen(await user(req.headers.cookie), req.params.campaignId, req.params.id));
}
