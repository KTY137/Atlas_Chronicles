// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import type { FastifyInstance } from "fastify";
import { Type, type Static } from "@sinclair/typebox";
import * as P from "../../../protocol/src/actors.ts";
import * as F from "../../../protocol/src/figurantrag.ts";
import { RULE_BODY_LIMIT } from "../../../protocol/src/rule-runtime.ts";
import type { Db } from "../db/index.ts";
import type { IdentityConfig } from "../identity/index.ts";
import { createIdentity } from "../identity/index.ts";
import { ActorValidationError, createActors } from "../domain/actors.ts";
import { createActorDeletion } from "../domain/actor-deletion.ts";
import { createPinnedFigurantrag } from "../domain/figurantrag-pinned.ts";
import { instantiatePinnedActor } from "../domain/pinned-actors.ts";

/** The existing app supplies authenticated-cookie, Origin, rate-limit and error policies. */
export function registerActors(app: FastifyInstance, db: Db, config: IdentityConfig) {
  const identity = createIdentity(db, config), actors = createActors(db, config), deletion = createActorDeletion(db, config), antraege = createPinnedFigurantrag(db, config);
  const auth = async (cookie: string | undefined) => (await identity.authenticate(cookie)).userId;
  const base = "/api/campaigns/:campaignId";
  type Scope = { campaignId: string }; type Item = Scope & { id: string }; type Controller = Item & { userId: string };
  const revisionQuery = Type.Object({ revision: Type.Optional(Type.String({ pattern: "^[1-9][0-9]{0,9}$" })) }, { additionalProperties: false });
  const revision = (raw?: string) => {
    if (raw === undefined) return undefined;
    const value = Number(raw); if (!Number.isInteger(value) || value < 1 || value > 2_147_483_647) throw new ActorValidationError("Ungültige Vorlagenrevision.");
    return value;
  };
  app.get<{ Params: Scope }>(`${base}/actors`, async req => actors.listActors(await auth(req.headers.cookie), req.params.campaignId));
  app.get<{ Params: Item }>(`${base}/actors/:id`, async req => actors.getActor(await auth(req.headers.cookie), req.params.campaignId, req.params.id));
  app.post<{ Params: Scope; Body: Static<typeof P.ActorInstantiate> }>(`${base}/actors/instantiate`, { schema: { body: P.ActorInstantiate } }, async req => instantiatePinnedActor(db, config, await auth(req.headers.cookie), req.params.campaignId, req.body));
  app.put<{ Params: Item; Body: Static<typeof P.ActorProfileUpdate> }>(`${base}/actors/:id`, { schema: { body: P.ActorProfileUpdate } }, async req => actors.updateActor(await auth(req.headers.cookie), req.params.campaignId, req.params.id, req.body));
  app.post<{ Params: Item; Body: Static<typeof P.ArchiveObject> }>(`${base}/actors/:id/archive`, { schema: { body: P.ArchiveObject } }, async req => actors.archiveActor(await auth(req.headers.cookie), req.params.campaignId, req.params.id, req.body));
  app.delete<{ Params: Item; Body: Static<typeof P.ArchiveObject> }>(`${base}/actors/:id`, { schema: { body: P.ArchiveObject } }, async req => deletion.deleteActor(await auth(req.headers.cookie), req.params.campaignId, req.params.id, req.body));
  app.get<{ Params: Item }>(`${base}/actors/:id/controllers`, async req => actors.listControllers(await auth(req.headers.cookie), req.params.campaignId, req.params.id));
  app.put<{ Params: Controller; Body: Static<typeof P.ActorControllerGrant> }>(`${base}/actors/:id/controllers/:userId`, { schema: { body: P.ActorControllerGrant } }, async req => actors.grantController(await auth(req.headers.cookie), req.params.campaignId, req.params.id, req.params.userId, req.body));
  app.post<{ Params: Controller; Body: Static<typeof P.ActorControllerRevoke> }>(`${base}/actors/:id/controllers/:userId/revoke`, { schema: { body: P.ActorControllerRevoke } }, async req => actors.revokeController(await auth(req.headers.cookie), req.params.campaignId, req.params.id, req.params.userId, req.body));
  app.get<{ Params: Scope }>(`${base}/reader-perspective`, async req => actors.getReaderPerspective(await auth(req.headers.cookie), req.params.campaignId));
  app.put<{ Params: Scope; Body: Static<typeof P.ReaderPerspectiveUpdate> }>(`${base}/reader-perspective`, { schema: { body: P.ReaderPerspectiveUpdate } }, async req => actors.setReaderPerspective(await auth(req.headers.cookie), req.params.campaignId, req.body));

  app.get<{ Params: Scope }>(`${base}/actor-templates`, async req => actors.listActorTemplates(await auth(req.headers.cookie), req.params.campaignId));
  // Vor `:id` eingetragen: `freigegeben` ist ein fester Pfad, kein Vorlagenname. Die
  // Spielerprojektion der freigegebenen Vorlagen — ohne Beute, ohne fremden Artikelverweis.
  app.get<{ Params: Scope }>(`${base}/actor-templates/freigegeben`, async req => antraege.freigegebeneVorlagen(await auth(req.headers.cookie), req.params.campaignId));
  app.get<{ Params: Item; Querystring: Static<typeof revisionQuery> }>(`${base}/actor-templates/:id`, { schema: { querystring: revisionQuery } }, async req => actors.getActorTemplate(await auth(req.headers.cookie), req.params.campaignId, req.params.id, revision(req.query.revision)));
  app.post<{ Params: Scope; Body: Static<typeof P.ActorTemplateCreate> }>(`${base}/actor-templates`, { bodyLimit: RULE_BODY_LIMIT, schema: { body: P.ActorTemplateCreate } }, async req => actors.createActorTemplate(await auth(req.headers.cookie), req.params.campaignId, req.body));
  app.put<{ Params: Item; Body: Static<typeof P.ActorTemplateRevise> }>(`${base}/actor-templates/:id`, { bodyLimit: RULE_BODY_LIMIT, schema: { body: P.ActorTemplateRevise } }, async req => actors.reviseActorTemplate(await auth(req.headers.cookie), req.params.campaignId, req.params.id, req.body));
  app.post<{ Params: Item; Body: Static<typeof P.ArchiveObject> }>(`${base}/actor-templates/:id/archive`, { schema: { body: P.ArchiveObject } }, async req => actors.archiveActorTemplate(await auth(req.headers.cookie), req.params.campaignId, req.params.id, req.body));
  app.delete<{ Params: Item; Body: Static<typeof P.ArchiveObject> }>(`${base}/actor-templates/:id`, { schema: { body: P.ArchiveObject } }, async req => deletion.deleteActorTemplate(await auth(req.headers.cookie), req.params.campaignId, req.params.id, req.body));
  app.get<{ Params: Scope }>(`${base}/item-templates`, async req => actors.listItemTemplates(await auth(req.headers.cookie), req.params.campaignId));
  app.get<{ Params: Item; Querystring: Static<typeof revisionQuery> }>(`${base}/item-templates/:id`, { schema: { querystring: revisionQuery } }, async req => actors.getItemTemplate(await auth(req.headers.cookie), req.params.campaignId, req.params.id, revision(req.query.revision)));
  app.post<{ Params: Scope; Body: Static<typeof P.ItemTemplateCreate> }>(`${base}/item-templates`, { schema: { body: P.ItemTemplateCreate } }, async req => actors.createItemTemplate(await auth(req.headers.cookie), req.params.campaignId, req.body));
  app.put<{ Params: Item; Body: Static<typeof P.ItemTemplateRevise> }>(`${base}/item-templates/:id`, { schema: { body: P.ItemTemplateRevise } }, async req => actors.reviseItemTemplate(await auth(req.headers.cookie), req.params.campaignId, req.params.id, req.body));
  app.post<{ Params: Item; Body: Static<typeof P.ArchiveObject> }>(`${base}/item-templates/:id/archive`, { schema: { body: P.ArchiveObject } }, async req => actors.archiveItemTemplate(await auth(req.headers.cookie), req.params.campaignId, req.params.id, req.body));
  app.get<{ Params: Scope }>(`${base}/items`, async req => actors.listItems(await auth(req.headers.cookie), req.params.campaignId));
  app.get<{ Params: Item }>(`${base}/actors/:id/items`, async req => actors.listItems(await auth(req.headers.cookie), req.params.campaignId, req.params.id));
  app.get<{ Params: Item }>(`${base}/items/:id`, async req => actors.getItem(await auth(req.headers.cookie), req.params.campaignId, req.params.id));
  app.post<{ Params: Scope; Body: Static<typeof P.ItemInstantiate> }>(`${base}/items/instantiate`, { schema: { body: P.ItemInstantiate } }, async req => actors.instantiateItem(await auth(req.headers.cookie), req.params.campaignId, req.body));
  app.put<{ Params: Item; Body: Static<typeof P.ItemUpdate> }>(`${base}/items/:id`, { schema: { body: P.ItemUpdate } }, async req => actors.updateItem(await auth(req.headers.cookie), req.params.campaignId, req.params.id, req.body));
  app.post<{ Params: Item; Body: Static<typeof P.ItemCustodyChange> }>(`${base}/items/:id/custody`, { schema: { body: P.ItemCustodyChange } }, async req => actors.transferItem(await auth(req.headers.cookie), req.params.campaignId, req.params.id, req.body));
  app.post<{ Params: Item; Body: Static<typeof P.ArchiveObject> }>(`${base}/items/:id/archive`, { schema: { body: P.ArchiveObject } }, async req => actors.archiveItem(await auth(req.headers.cookie), req.params.campaignId, req.params.id, req.body));

  /**
   * Der Figurantrag. Die Rechte liegen in der Domain — hier steht keine zweite Rollenprüfung,
   * die von ihr abweichen könnte. `Conflict`, `Gone` und `ActorValidationError` beantwortet der
   * Fehlerbehandler der Anwendung wie bei jeder anderen Figurenroute auch.
   */
  app.put<{ Params: Item; Body: Static<typeof F.FigurvorlageFreigabeBody> }>(`${base}/actor-templates/:id/freigabe`, { schema: { body: F.FigurvorlageFreigabeBody } }, async req => antraege.freigeben(await auth(req.headers.cookie), req.params.campaignId, req.params.id, req.body.expectedVersion));
  app.post<{ Params: Item; Body: Static<typeof F.FigurvorlageFreigabeBody> }>(`${base}/actor-templates/:id/freigabe/entziehen`, { schema: { body: F.FigurvorlageFreigabeBody } }, async req => antraege.entziehen(await auth(req.headers.cookie), req.params.campaignId, req.params.id, req.body.expectedVersion));
  app.get<{ Params: Scope }>(`${base}/figurantraege`, async req => antraege.liste(await auth(req.headers.cookie), req.params.campaignId));
  // Die Befehls-ID steht im Körper, nicht in der Route: sie gehört zur Anfrage, deren
  // Wiederholung dieselbe Antwort bekommen soll.
  app.post<{ Params: Scope; Body: Static<typeof F.FigurantragAntragBody> }>(`${base}/figurantraege`, { bodyLimit: RULE_BODY_LIMIT, schema: { body: F.FigurantragAntragBody } }, async req => antraege.beantragen(await auth(req.headers.cookie), req.params.campaignId, req.body.commandId,
    { templateId: req.body.templateId, name: req.body.name, anfangswerte: req.body.anfangswerte }));
  app.post<{ Params: Item; Body: Static<typeof F.FigurantragEntscheidungBody> }>(`${base}/figurantraege/:id/zuruecknehmen`, { schema: { body: F.FigurantragEntscheidungBody } }, async req => antraege.zuruecknehmen(await auth(req.headers.cookie), req.params.campaignId, req.params.id, req.body.expectedVersion));
  app.post<{ Params: Item; Body: Static<typeof F.FigurantragEntscheidungBody> }>(`${base}/figurantraege/:id/bestaetigen`, { schema: { body: F.FigurantragEntscheidungBody } }, async req => antraege.bestaetigen(await auth(req.headers.cookie), req.params.campaignId, req.params.id, req.body.expectedVersion));
  app.post<{ Params: Item; Body: Static<typeof F.FigurantragAblehnungBody> }>(`${base}/figurantraege/:id/ablehnen`, { schema: { body: F.FigurantragAblehnungBody } }, async req => antraege.ablehnen(await auth(req.headers.cookie), req.params.campaignId, req.params.id, req.body.expectedVersion, req.body.reason));
}
