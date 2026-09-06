import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { Db } from "../db/index.ts";
import { createIdentity, type IdentityConfig } from "../identity/index.ts";
import { createPacks, PackIntegrityError } from "../domain/packs.ts";

/**
 * Serving asset-pack artwork so the map renderer can draw placements.
 *
 * These routes are read-only by construction — no `POST`/`PUT`/`DELETE` anywhere below — and every
 * one of them authenticates first, exactly like the rest of the API (`grundriss.ts`'s `auth`). A
 * pack has no campaign or ownership scope of its own, so there is no membership rule to enforce
 * beyond "this is a signed-in identity"; the security work that matters happens one layer down, in
 * `domain/packs.ts`, where a request name is resolved against the manifest and never against the
 * filesystem directly.
 *
 * `PackIntegrityError` is caught here, explicitly, rather than left for the host app's error
 * handler to infer from a `statusCode` field: this route is meant to be mountable as-is, and a
 * corrupted pack file must fail loudly (500) under any host, not silently degrade to whatever that
 * host's catch-all happens to do with an error type it has never heard of. `Gone` (unknown pack,
 * unknown asset, unauthenticated) is left to propagate — every host in this codebase already maps
 * it to 404, which is exactly the "existence and permission collapse to one response" policy
 * `domain/errors.ts` documents.
 */
export function registerPacks(app: FastifyInstance, db: Db, config: IdentityConfig) {
  const identity = createIdentity(db, config), packs = createPacks();
  const auth = async (req: FastifyRequest) => { await identity.authenticate(req.headers.cookie); };
  const base = "/api/packs";
  type PackParams = { packId: string };
  type AssetParams = PackParams & { "*": string };

  const guarded = <T>(reply: FastifyReply, work: () => T): T | undefined => {
    try { return work(); }
    catch (error) {
      if (error instanceof PackIntegrityError) { reply.code(500).send({ error: "Asset-Paket beschädigt." }); return undefined; }
      throw error;
    }
  };

  app.get(base, async (req) => { await auth(req); return packs.list(); });

  app.get<{ Params: PackParams }>(`${base}/:packId/manifest`, async (req) => {
    await auth(req);
    return packs.manifest(req.params.packId);
  });

  app.get<{ Params: AssetParams }>(`${base}/:packId/asset/*`, async (req, reply) => {
    await auth(req);
    return guarded(reply, () => {
      const { asset } = packs.resolveAsset(req.params.packId, req.params["*"]);
      // Strong caching: the asset's own sha256 IS its cache key. A client that already has the
      // bytes for this hash never needs them again, and a changed hash (new pack version) busts
      // the cache automatically because the ETag itself changes.
      const etag = `"${asset.sha256}"`;
      if (req.headers["if-none-match"] === etag) { reply.code(304).header("ETag", etag); return; }
      const { mimeType, bytes } = packs.readAsset(req.params.packId, req.params["*"]);
      reply.type(mimeType).header("ETag", etag).header("Cache-Control", "public, max-age=31536000, immutable").send(bytes);
    });
  });
}
