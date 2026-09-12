// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import type { FastifyInstance } from "fastify";
import { Type, type Static } from "@sinclair/typebox";
import { ACTOR_PORTRAIT_LIMITS, ActorPortraitChange } from "../../../protocol/src/actor-portrait.ts";
import type { Db } from "../db/index.ts";
import { createIdentity, type IdentityConfig } from "../identity/index.ts";
import { createActorPortraits } from "../domain/actor-portrait.ts";
import { ActorValidationError } from "../domain/actors.ts";

/** Registered after WikiMedien, sharing its raw raster content-type parser. */
export function registerActorPortraits(app: FastifyInstance, db: Db, config: IdentityConfig) {
  const portraits = createActorPortraits(db, config), identity = createIdentity(db, config);
  const auth = async (cookie: string | undefined) => (await identity.authenticate(cookie)).userId;
  const base = "/api/campaigns/:campaignId/actors/:id/portrait";
  type Scope = { campaignId: string; id: string };
  const query = Type.Object({ expectedVersion: Type.String({ pattern: "^(0|[1-9][0-9]{0,9})$" }) }, { additionalProperties: false });
  app.get<{ Params: Scope }>(base, async req => portraits.get(await auth(req.headers.cookie), req.params.campaignId, req.params.id));
  app.put<{ Params: Scope; Querystring: Static<typeof query> }>(`${base}/bytes`, { bodyLimit: ACTOR_PORTRAIT_LIMITS.bytes, schema: { querystring: query } }, async req => {
    if (!Buffer.isBuffer(req.body)) throw new ActorValidationError("Bitte eine PNG-, JPEG-, WebP- oder GIF-Datei auswählen.");
    return portraits.upload(await auth(req.headers.cookie), req.params.campaignId, req.params.id, Number(req.query.expectedVersion), req.body);
  });
  app.delete<{ Params: Scope; Body: Static<typeof ActorPortraitChange> }>(base, { schema: { body: ActorPortraitChange } }, async req =>
    portraits.remove(await auth(req.headers.cookie), req.params.campaignId, req.params.id, req.body.expectedVersion));
  app.get<{ Params: Scope }>(`${base}/file`, async (req, reply) => {
    const result = await portraits.file(await auth(req.headers.cookie), req.params.campaignId, req.params.id);
    return reply.header("Cache-Control", "private, no-store").header("X-Content-Type-Options", "nosniff")
      .header("Content-Security-Policy", "default-src 'none'; sandbox").header("ETag", `"${result.sha256}"`).type(result.mime).send(result.data);
  });
}
