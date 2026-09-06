import type { FastifyInstance } from "fastify";
import { Type, type Static } from "@sinclair/typebox";
import type { Db } from "../db/index.ts";
import type { AppConfig } from "../app.ts";
import { createIdentity } from "../identity/index.ts";
import { createWeek } from "../domain/week.ts";
import { Id } from "@chronicle/protocol";

export function registerWeek(app: FastifyInstance, db: Db, config: AppConfig) {
  const identity = createIdentity(db, config), week = createWeek(db, config), closed = { additionalProperties: false };
  const clock = Type.Object({ expectedVersion: Type.Integer({ minimum: 0 }), day: Type.Integer({ minimum: 0, maximum: 1_000_000 }), label: Type.String({ minLength: 1, maxLength: 120 }), postDays: Type.Integer({ minimum: 0, maximum: 365 }) }, closed);
  const letter = Type.Object({ commandId: Id, fromActorId: Type.Optional(Id), toActorIds: Type.Array(Id, { minItems: 1, maxItems: 16, uniqueItems: true }), passageIds: Type.Array(Id, { minItems: 1, maxItems: 32, uniqueItems: true }), note: Type.String({ maxLength: 4000 }) }, closed);
  const empty = Type.Object({}, closed);
  const read = Type.Object({ expectedHash: Type.Optional(Type.String({ pattern: "^[a-f0-9]{64}$" })) }, closed);
  type Scope = { campaignId: string }; type Letter = Scope & { id: string }; type Entry = Scope & { entryId: string };
  app.get<{ Params: Scope }>("/api/campaigns/:campaignId/week/clock", async req => week.getClock((await identity.authenticate(req.headers.cookie)).userId, req.params.campaignId));
  app.put<{ Params: Scope; Body: Static<typeof clock> }>("/api/campaigns/:campaignId/week/clock", { schema: { body: clock } }, async req =>
    week.setClock((await identity.authenticate(req.headers.cookie)).userId, req.params.campaignId, { ...req.body, version: req.body.expectedVersion }));
  app.post<{ Params: Scope; Body: Static<typeof letter> }>("/api/campaigns/:campaignId/week/letters", { schema: { body: letter } }, async req =>
    week.sendLetter((await identity.authenticate(req.headers.cookie)).userId, req.params.campaignId, req.body));
  app.get<{ Params: Scope }>("/api/campaigns/:campaignId/week/letters", async req => week.listLetters((await identity.authenticate(req.headers.cookie)).userId, req.params.campaignId));
  app.get<{ Params: Letter }>("/api/campaigns/:campaignId/week/letters/:id", async req => week.getLetter((await identity.authenticate(req.headers.cookie)).userId, req.params.campaignId, req.params.id));
  app.post<{ Params: Letter }>("/api/campaigns/:campaignId/week/letters/:id/read", { schema: { body: empty } }, async req => week.readLetter((await identity.authenticate(req.headers.cookie)).userId, req.params.campaignId, req.params.id));
  app.get<{ Params: Entry }>("/api/campaigns/:campaignId/entries/:entryId/umbruch", async req => week.umbruch((await identity.authenticate(req.headers.cookie)).userId, req.params.campaignId, req.params.entryId));
  app.post<{ Params: Entry; Body: Static<typeof read> }>("/api/campaigns/:campaignId/entries/:entryId/read", { schema: { body: read } }, async req => week.markRead((await identity.authenticate(req.headers.cookie)).userId, req.params.campaignId, req.params.entryId, req.body.expectedHash));
  app.get<{ Params: Scope }>("/api/campaigns/:campaignId/week/difference", async req => week.difference((await identity.authenticate(req.headers.cookie)).userId, req.params.campaignId));
}
