import type { FastifyInstance } from "fastify";
import { Type, type Static } from "@sinclair/typebox";
import { serializeThemeManifest } from "@chronicle/theme";
import * as P from "../../../protocol/src/authoring.ts";
import type { Db } from "../db/index.ts";
import { createIdentity, type IdentityConfig } from "../identity/index.ts";
import { AuthoringValidationError, createAuthoring } from "../domain/authoring.ts";
import { publicHtml } from "../domain/public-projection.ts";

export function registerAuthoring(app: FastifyInstance, db: Db, config: IdentityConfig & { publicDeliveryEnabled?: boolean }) {
  const identity = createIdentity(db, config), domain = createAuthoring(db, config);
  const auth = async (cookie: string | undefined) => (await identity.authenticate(cookie)).userId;
  const base = "/api/campaigns/:campaignId";
  type Scope = { campaignId: string }; type Item = Scope & { id: string };
  const revisionQuery = Type.Object({ revision: Type.Optional(Type.String({ pattern: "^[1-9][0-9]{0,9}$" })) }, { additionalProperties: false });
  const revision = (value?: string) => { if (value === undefined) return undefined; const n = Number(value); if (!Number.isInteger(n) || n < 1 || n > 2_147_483_647) throw new AuthoringValidationError("Ungültige Theme-Revision."); return n; };
  app.get<{ Params: Scope }>(`${base}/themes`, async req => domain.listThemes(await auth(req.headers.cookie), req.params.campaignId));
  app.post<{ Params: Scope; Body: P.ThemeCreateInput }>(`${base}/themes`, { schema: { body: P.ThemeCreateSchema } }, async req => domain.createTheme(await auth(req.headers.cookie), req.params.campaignId, req.body));
  app.post<{ Params: Scope; Body: P.ThemeCreateInput }>(`${base}/themes/import`, { schema: { body: P.ThemeCreateSchema } }, async req => domain.createTheme(await auth(req.headers.cookie), req.params.campaignId, req.body));
  app.post<{ Params: Scope; Body: Static<typeof P.ThemePreviewSchema> }>(`${base}/themes/preview`, { schema: { body: P.ThemePreviewSchema } }, async req => domain.previewTheme(await auth(req.headers.cookie), req.params.campaignId, req.body));
  app.get<{ Params: Item; Querystring: Static<typeof revisionQuery> }>(`${base}/themes/:id`, { schema: { querystring: revisionQuery } }, async req => domain.getTheme(await auth(req.headers.cookie), req.params.campaignId, req.params.id, revision(req.query.revision)));
  app.put<{ Params: Item; Body: P.ThemeReviseInput }>(`${base}/themes/:id`, { schema: { body: P.ThemeReviseSchema } }, async req => domain.reviseTheme(await auth(req.headers.cookie), req.params.campaignId, req.params.id, req.body));
  app.get<{ Params: Item; Querystring: Static<typeof revisionQuery> }>(`${base}/themes/:id/export`, { schema: { querystring: revisionQuery } }, async (req, reply) => {
    const theme = await domain.getTheme(await auth(req.headers.cookie), req.params.campaignId, req.params.id, revision(req.query.revision));
    return reply.type("application/json").header("Content-Disposition", 'attachment; filename="theme.chronicle-theme"').send(serializeThemeManifest(theme.manifest));
  });
  app.get<{ Params: Scope }>(`${base}/theme-pin`, async req => domain.getThemePin(await auth(req.headers.cookie), req.params.campaignId));
  app.put<{ Params: Scope; Body: P.ThemePinUpdateInput }>(`${base}/theme-pin`, { schema: { body: P.ThemePinUpdateSchema } }, async req => domain.pinTheme(await auth(req.headers.cookie), req.params.campaignId, req.body));
  app.get<{ Params: Scope }>(`${base}/publication`, async req => ({ policy: await domain.getPublication(await auth(req.headers.cookie), req.params.campaignId), deliveryEnabled: config.publicDeliveryEnabled === true }));
  app.put<{ Params: Scope; Body: P.PublicationConfigureInput }>(`${base}/publication`, { schema: { body: P.PublicationConfigureSchema } }, async req => domain.configurePublication(await auth(req.headers.cookie), req.params.campaignId, req.body));
  app.get<{ Params: Item }>(`${base}/entries/:id/publication`, async req => domain.getEntryPublication(await auth(req.headers.cookie), req.params.campaignId, req.params.id));
  app.get<{ Params: Item }>(`${base}/entries/:id/publication/sources`, async req => domain.publicationSources(await auth(req.headers.cookie), req.params.campaignId, req.params.id));
  app.put<{ Params: Item; Body: P.EntryPublishInput }>(`${base}/entries/:id/publication`, { schema: { body: P.EntryPublishSchema } }, async req => domain.publishEntry(await auth(req.headers.cookie), req.params.campaignId, req.params.id, req.body));
  app.post<{ Params: Item; Body: P.EntryUnpublishInput }>(`${base}/entries/:id/publication/unpublish`, { schema: { body: P.EntryUnpublishSchema } }, async req => domain.unpublishEntry(await auth(req.headers.cookie), req.params.campaignId, req.params.id, req.body));
  app.post<{ Params: Item; Body: P.EntryPublishPreviewInput }>(`${base}/entries/:id/publication/preview`, { schema: { body: P.EntryPublishPreviewSchema } }, async req => {
    const result = await domain.previewEntry(await auth(req.headers.cookie), req.params.campaignId, req.params.id, req.body);
    return { ...result, html: publicHtml(result.world, config.origin, result.world.entries.find(e => e.slug === result.entrySlug)!) };
  });
  app.get<{ Params: Scope }>(`${base}/publication/routes`, async req => domain.listRoutes(await auth(req.headers.cookie), req.params.campaignId));
  app.post<{ Params: Scope; Body: P.PublicationRouteAddInput }>(`${base}/publication/routes`, { schema: { body: P.PublicationRouteAddSchema } }, async req => domain.addRoute(await auth(req.headers.cookie), req.params.campaignId, req.body));
  app.post<{ Params: Scope; Body: P.PublicationRouteRemoveInput }>(`${base}/publication/routes/remove`, { schema: { body: P.PublicationRouteRemoveSchema } }, async req => domain.removeRoute(await auth(req.headers.cookie), req.params.campaignId, req.body));
}
