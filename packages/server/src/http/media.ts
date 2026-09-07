// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import type { FastifyInstance, FastifyRequest } from "fastify";
import { Type, type Static } from "@sinclair/typebox";
import { Id } from "@chronicle/protocol";
import type { Db } from "../db/index.ts";
import { createIdentity, type IdentityConfig } from "../identity/index.ts";
import { createMedia, MediaUnavailable, type MediaServerConfig } from "../domain/media.ts";

/** App's ordinary authenticated cookie, Origin and error policies also govern media. */
export function registerMedia(app: FastifyInstance, db: Db, identityConfig: IdentityConfig, livekit?: MediaServerConfig) {
  const identity = createIdentity(db, identityConfig);
  const media = createMedia(db, { ...(identityConfig.now ? { now: identityConfig.now } : {}), ...(livekit ? { livekit } : {}) });
  const auth = async (req: FastifyRequest) => (await identity.authenticate(req.headers.cookie)).userId;
  const closed = { additionalProperties: false };
  const tokenBody = Type.Object({ roomId: Type.Optional(Id) }, closed);
  const whisperBody = Type.Object({ memberIds: Type.Array(Id, { minItems: 1, maxItems: 6, uniqueItems: true }) }, closed);
  const presenceBody = Type.Object({ roomId: Id }, closed);
  type Scope = { campaignId: string }; type Item = Scope & { id: string };
  const base = "/api/campaigns/:campaignId/media";
  // Keep provider failures explicit even when the outer app hides internal errors.
  const call = async <T>(reply: { code: (status: number) => unknown }, fn: () => Promise<T>) => {
    try { return await fn(); } catch (error) {
      if (!(error instanceof MediaUnavailable)) throw error;
      reply.code(503); return { error: "media-unavailable", message: error.message };
    }
  };
  app.get<{ Params: Scope }>(base, async req => media.status(await auth(req), req.params.campaignId));
  app.post<{ Params: Scope; Body: Static<typeof tokenBody> }>(`${base}/token`, { schema: { body: tokenBody }, config: { rateLimit: { max: 20, timeWindow: "1 minute" } } }, async (req, reply) =>
    call(reply, async () => { const me = await identity.authenticate(req.headers.cookie); return media.token(me.userId, req.params.campaignId, req.body.roomId, me.credentialId); }));
  app.post<{ Params: Scope; Body: Static<typeof whisperBody> }>(`${base}/whispers`, { schema: { body: whisperBody } }, async (req, reply) =>
    call(reply, async () => media.createWhisper(await auth(req), req.params.campaignId, req.body.memberIds)));
  app.delete<{ Params: Item }>(`${base}/whispers/:id`, async (req, reply) => call(reply, async () => media.closeWhisper(await auth(req), req.params.campaignId, req.params.id)));
  app.post<{ Params: Scope; Body: Static<typeof presenceBody> }>(`${base}/presence`, { schema: { body: presenceBody } }, async (req, reply) =>
    call(reply, async () => media.heartbeat(await auth(req), req.params.campaignId, req.body.roomId)));
  app.delete<{ Params: Scope }>(`${base}/presence`, async (req, reply) => call(reply, async () => media.leave(await auth(req), req.params.campaignId)));
  app.post<{ Params: Item }>(`${base}/members/:id/revoke`, async (req, reply) => call(reply, async () => media.revokeMember(await auth(req), req.params.campaignId, req.params.id)));
  app.post<{ Params: Item }>(`${base}/members/:id/restore`, async req => media.restoreMember(await auth(req), req.params.campaignId, req.params.id));
  let running: Promise<void> | undefined;
  const reconcile = () => {
    running ??= media.reconcile().catch(() => { app.log.warn("Media room cleanup pending; provider unavailable"); }).finally(() => { running = undefined; });
    return running;
  };
  const timer = livekit ? setInterval(() => { void reconcile(); }, 10_000) : undefined;
  timer?.unref();
  app.addHook("onReady", reconcile);
  app.addHook("onResponse", async (req, reply) => {
    if (livekit && reply.statusCode < 300 && ((req.method === "POST" && req.url === "/api/logout") ||
      (req.method === "DELETE" && req.url.startsWith("/api/credentials/")))) void reconcile();
  });
  app.addHook("onClose", async () => { if (timer) clearInterval(timer); await running; });
  return media;
}
