import type { FastifyInstance, FastifyReply } from "fastify";
import { Type, type Static } from "@sinclair/typebox";
import { textHash } from "@chronicle/core";
import type * as P from "../../../protocol/src/authoring.ts";
import type { Db } from "../db/index.ts";
import { Gone } from "../domain/errors.ts";
import { createPublication, publicBacklinks, publicBytes, publicFeed, publicHtml, publicRobots, publicSearch, publicSitemap, publicSocialCard, type PublicDeliveryConfig } from "../domain/public-projection.ts";

/** These routes intentionally never authenticate a cookie or borrow a GM reader. */
export function registerPublication(app: FastifyInstance, db: Db, config: PublicDeliveryConfig) {
  const domain = createPublication(db, config), root = "/public/:publicKey";
  type Key = { publicKey: string }; type World = Key & { worldSlug: string }; type Article = World & { articleSlug: string };
  const send = (reply: FastifyReply, mime: string, body: string) => reply.type(mime).header("Cache-Control", "no-store").header("ETag", `"${textHash(body)}"`)
    .header("X-Content-Type-Options", "nosniff").header("Referrer-Policy", "no-referrer")
    .header("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'; img-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'").send(body);
  const json = (reply: FastifyReply, value: unknown) => send(reply, "application/json; charset=utf-8", publicBytes(value));
  const target = (world: P.PublicWorld, slug: string) => { const entry = world.entries.find(e => e.slug === slug); if (!entry) throw new Gone(); return entry; };
  app.get<{ Params: World }>("/w/:publicKey/:worldSlug", async (req, reply) => domain.canonicalRoute(req.params.publicKey, req.params.worldSlug, undefined, (world, entry, redirect) =>
    redirect ? reply.header("Cache-Control", "no-store").redirect(redirect, 302) : send(reply, "text/html; charset=utf-8", publicHtml(world, config.origin, entry))));
  app.get<{ Params: Article }>("/w/:publicKey/:worldSlug/:articleSlug", async (req, reply) => domain.canonicalRoute(req.params.publicKey, req.params.worldSlug, req.params.articleSlug, (world, entry, redirect) =>
    redirect ? reply.header("Cache-Control", "no-store").redirect(redirect, 302) : send(reply, "text/html; charset=utf-8", publicHtml(world, config.origin, entry))));
  app.get<{ Params: Key }>(`${root}/world.json`, async (req, reply) => domain.withWorld(req.params.publicKey, world => json(reply, world)));
  app.get<{ Params: Key & { articleSlug: string } }>(`${root}/entries/:articleSlug`, async (req, reply) => domain.withWorld(req.params.publicKey, world => json(reply, target(world, req.params.articleSlug))));
  const search = Type.Object({ q: Type.Optional(Type.String({ maxLength: 200 })) }, { additionalProperties: false });
  app.get<{ Params: Key; Querystring: Static<typeof search> }>(`${root}/search`, { schema: { querystring: search } }, async (req, reply) => domain.withWorld(req.params.publicKey, world => json(reply, publicSearch(world, req.query.q ?? ""))));
  app.get<{ Params: Key & { articleSlug: string } }>(`${root}/backlinks/:articleSlug`, async (req, reply) => domain.withWorld(req.params.publicKey, world => json(reply, publicBacklinks(world, target(world, req.params.articleSlug)))));
  app.get<{ Params: Key }>(`${root}/feed.json`, async (req, reply) => domain.withWorld(req.params.publicKey, world => send(reply, "application/feed+json; charset=utf-8", publicBytes(publicFeed(world, config.origin)))));
  app.get<{ Params: Key }>(`${root}/sitemap.xml`, async (req, reply) => domain.withWorld(req.params.publicKey, world => send(reply, "application/xml; charset=utf-8", publicSitemap(world, config.origin))));
  app.get<{ Params: Key }>(`${root}/robots.txt`, async (req, reply) => domain.withWorld(req.params.publicKey, world => send(reply, "text/plain; charset=utf-8", publicRobots(world, config.origin))));
  const cardQuery = Type.Object({ article: Type.Optional(Type.String({ minLength: 1, maxLength: 200 })) }, { additionalProperties: false });
  app.get<{ Params: Key; Querystring: Static<typeof cardQuery> }>(`${root}/social.svg`, { schema: { querystring: cardQuery } }, async (req, reply) => domain.withWorld(req.params.publicKey, world => send(reply, "image/svg+xml; charset=utf-8", publicSocialCard(world, req.query.article ? target(world, req.query.article) : null))));
  app.get<{ Params: { "*": string } }>("/wiki/*", async (req, reply) => domain.resolveLegacy("/wiki/" + req.params["*"], location => reply.header("Cache-Control", "no-store").redirect(location, 302)));
  app.get<{ Params: { locale: string; "*": string } }>("/:locale/wiki/*", async (req, reply) => domain.resolveLegacy(`/${req.params.locale}/wiki/${req.params["*"]}`, location => reply.header("Cache-Control", "no-store").redirect(location, 302)));
  app.get("/robots.txt", async (_req, reply) => send(reply, "text/plain; charset=utf-8", config.publicDeliveryEnabled === true ? "User-agent: *\nDisallow: /api/\nDisallow: /join/\nAllow: /w/\n" : "User-agent: *\nDisallow: /\n"));
}
