// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { Type, type Static } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { KampfBeenden, KampfSeiteSchema, KarteInitiativeSetzen, KarteLageSetzen, KarteSichtSetzen, KartenAusVorlage, KartenSicht,
  NameFuerRundeSchema, StartLageSchema } from "@chronicle/protocol";
import type { Db } from "../db/index.ts";
import type { AppConfig } from "../app.ts";
import { createIdentity } from "../identity/index.ts";
import { createKampfbuehne } from "../domain/kampfbuehne.ts";

const id = Type.String({ minLength: 1, maxLength: 128 });

const KampfAnlegen = Type.Object({ name: Type.String({ minLength: 1, maxLength: 512 }) }, { additionalProperties: false });
/**
 * Die geschlossene Menge steht im Schema, damit eine erfundene Seite an der Tür scheitert und
 * nicht erst am CHECK der Datenbank. Die Initiative darf negativ sein: nicht jedes Regelsystem
 * zählt von null aufwärts.
 */
const TeilnehmerAnlegen = Type.Object({
  name: Type.String({ minLength: 1, maxLength: 512 }),
  seite: KampfSeiteSchema,
  initiative: Type.Integer({ minimum: -1_000_000, maximum: 1_000_000 }),
  actorId: Type.Optional(Type.Union([id, Type.Null()])),
  initiativeRollId: Type.Optional(Type.Union([id, Type.Null()])),
  lage: Type.Optional(StartLageSchema),
  nameFuerRunde: Type.Optional(NameFuerRundeSchema),
  sicht: Type.Optional(KartenSicht),
}, { additionalProperties: false });
/** A participant acts again next round, so both values identify the expected turn. */
const ZugWeiter = Type.Object({ von: id, runde: Type.Integer({ minimum: 1, maximum: 2_147_483_647 }) }, { additionalProperties: false });

export function registerKampfbuehne(app: FastifyInstance, db: Db, config: AppConfig) {
  const identity = createIdentity(db, config), domain = createKampfbuehne(db, config);
  const user = async (cookie: string | undefined) => (await identity.authenticate(cookie)).userId;
  type Scope = { campaignId: string };
  type Kampf = Scope & { kampfId: string };
  type Karte = Kampf & { teilnehmerId: string };
  const basis = "/api/campaigns/:campaignId/kaempfe", kampf = `${basis}/:kampfId`, karte = `${kampf}/teilnehmer/:teilnehmerId`;

  app.get<{ Params: Scope }>(basis, async req => domain.buehnen(await user(req.headers.cookie), req.params.campaignId));
  app.get<{ Params: Kampf }>(kampf, async req => domain.buehne(await user(req.headers.cookie), req.params.campaignId, req.params.kampfId));
  app.get<{ Params: Kampf }>(`${kampf}/als-runde`, async req => domain.alsRunde(await user(req.headers.cookie), req.params.campaignId, req.params.kampfId));
  app.post<{ Params: Scope; Body: Static<typeof KampfAnlegen> }>(basis, { schema: { body: KampfAnlegen } }, async req =>
    domain.anlegen(await user(req.headers.cookie), req.params.campaignId, req.body));
  app.post<{ Params: Kampf; Body: Static<typeof TeilnehmerAnlegen> }>(`${kampf}/teilnehmer`, { schema: { body: TeilnehmerAnlegen } }, async req =>
    domain.teilnehmerHinzufuegen(await user(req.headers.cookie), req.params.campaignId, req.params.kampfId, req.body));
  app.post<{ Params: Kampf; Body: Static<typeof KartenAusVorlage> }>(`${kampf}/teilnehmer/aus-vorlage`, { schema: { body: KartenAusVorlage } }, async req =>
    domain.ausVorlage(await user(req.headers.cookie), req.params.campaignId, req.params.kampfId, req.body));
  app.delete<{ Params: Karte }>(karte, async req =>
    domain.teilnehmerEntfernen(await user(req.headers.cookie), req.params.campaignId, req.params.kampfId, req.params.teilnehmerId));
  app.post<{ Params: Karte; Body: Static<typeof KarteLageSetzen> }>(`${karte}/lage`, { schema: { body: KarteLageSetzen } }, async req =>
    domain.lageSetzen(await user(req.headers.cookie), req.params.campaignId, req.params.kampfId, req.params.teilnehmerId, req.body));
  app.post<{ Params: Karte; Body: Static<typeof KarteSichtSetzen> }>(`${karte}/sicht`, { schema: { body: KarteSichtSetzen } }, async req =>
    domain.sichtSetzen(await user(req.headers.cookie), req.params.campaignId, req.params.kampfId, req.params.teilnehmerId, req.body));
  app.post<{ Params: Karte; Body: Static<typeof KarteInitiativeSetzen> }>(`${karte}/initiative`, { schema: { body: KarteInitiativeSetzen } }, async req =>
    domain.initiativeSetzen(await user(req.headers.cookie), req.params.campaignId, req.params.kampfId, req.params.teilnehmerId, req.body));
  app.get<{ Params: Karte }>(`${karte}/bild`, async (req, reply) => {
    const bild = await domain.bild(await user(req.headers.cookie), req.params.campaignId, req.params.kampfId, req.params.teilnehmerId);
    return reply.header("Cache-Control", "private, no-store").header("X-Content-Type-Options", "nosniff")
      .header("Content-Security-Policy", "default-src 'none'; sandbox").header("ETag", `"${bild.sha256}"`).type(bild.mime).send(bild.data);
  });
  app.post<{ Params: Kampf }>(`${kampf}/eroeffnen`, async req => domain.eroeffnen(await user(req.headers.cookie), req.params.campaignId, req.params.kampfId));
  app.post<{ Params: Kampf; Body: Static<typeof ZugWeiter> }>(`${kampf}/zug`, { schema: { body: ZugWeiter } }, async req =>
    domain.naechsterZug(await user(req.headers.cookie), req.params.campaignId, req.params.kampfId, req.body.von, req.body.runde));
  app.post<{ Params: Kampf; Body: Static<typeof KampfBeenden> }>(`${kampf}/beenden`, { schema: { body: KampfBeenden } }, async req => {
    const userId = await user(req.headers.cookie), stand = await domain.beenden(userId, req.params.campaignId, req.params.kampfId);
    return req.body.archivieren ? { ...stand, aufraeumen: await domain.archiviereKampffiguren(userId, req.params.campaignId, req.params.kampfId) } : stand;
  });
}
