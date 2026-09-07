import { Type, type Static } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import type { Db } from "../db/index.ts";
import type { AppConfig } from "../app.ts";
import { createIdentity } from "../identity/index.ts";
import { createKampfbuehne, type Seite } from "../domain/kampfbuehne.ts";

const id = Type.String({ minLength: 1, maxLength: 128 });
export const SEITEN = ["gefaehrten", "gegner", "neutral"] as const;

const KampfAnlegen = Type.Object({ name: Type.String({ minLength: 1, maxLength: 512 }) }, { additionalProperties: false });
/**
 * Die geschlossene Menge steht im Schema, damit eine erfundene Seite an der Tür scheitert und
 * nicht erst am CHECK der Datenbank. Die Initiative darf negativ sein: nicht jedes Regelsystem
 * zählt von null aufwärts, und ein Malus, den das Regelpaket erlaubt, darf hier nicht scheitern.
 */
const TeilnehmerAnlegen = Type.Object({
  name: Type.String({ minLength: 1, maxLength: 512 }),
  seite: Type.Union(SEITEN.map(value => Type.Literal(value))),
  initiative: Type.Integer({ minimum: -1_000_000, maximum: 1_000_000 }),
  actorId: Type.Optional(Type.Union([id, Type.Null()])),
  initiativeRollId: Type.Optional(Type.Union([id, Type.Null()])),
}, { additionalProperties: false });
/** `von` nennt, wer gerade dran ist — der zweite Klick soll niemanden überspringen. */
const ZugWeiter = Type.Object({ von: id }, { additionalProperties: false });

export function registerKampfbuehne(app: FastifyInstance, db: Db, config: AppConfig) {
  const identity = createIdentity(db, config), domain = createKampfbuehne(db, config);
  const user = async (cookie: string | undefined) => (await identity.authenticate(cookie)).userId;
  type Scope = { campaignId: string };
  type Kampf = Scope & { kampfId: string };

  app.get<{ Params: Scope }>("/api/campaigns/:campaignId/kaempfe", async req =>
    domain.buehnen(await user(req.headers.cookie), req.params.campaignId));
  app.get<{ Params: Kampf }>("/api/campaigns/:campaignId/kaempfe/:kampfId", async req =>
    domain.buehne(await user(req.headers.cookie), req.params.campaignId, req.params.kampfId));
  app.post<{ Params: Scope; Body: Static<typeof KampfAnlegen> }>("/api/campaigns/:campaignId/kaempfe",
    { schema: { body: KampfAnlegen } }, async req =>
      domain.anlegen(await user(req.headers.cookie), req.params.campaignId, req.body));
  app.post<{ Params: Kampf; Body: Static<typeof TeilnehmerAnlegen> }>("/api/campaigns/:campaignId/kaempfe/:kampfId/teilnehmer",
    { schema: { body: TeilnehmerAnlegen } }, async req =>
      domain.teilnehmerHinzufuegen(await user(req.headers.cookie), req.params.campaignId, req.params.kampfId,
        { ...req.body, seite: req.body.seite as Seite }));
  app.delete<{ Params: Kampf & { teilnehmerId: string } }>("/api/campaigns/:campaignId/kaempfe/:kampfId/teilnehmer/:teilnehmerId", async req =>
    domain.teilnehmerEntfernen(await user(req.headers.cookie), req.params.campaignId, req.params.kampfId, req.params.teilnehmerId));
  app.post<{ Params: Kampf }>("/api/campaigns/:campaignId/kaempfe/:kampfId/eroeffnen", async req =>
    domain.eroeffnen(await user(req.headers.cookie), req.params.campaignId, req.params.kampfId));
  app.post<{ Params: Kampf; Body: Static<typeof ZugWeiter> }>("/api/campaigns/:campaignId/kaempfe/:kampfId/zug",
    { schema: { body: ZugWeiter } }, async req =>
      domain.naechsterZug(await user(req.headers.cookie), req.params.campaignId, req.params.kampfId, req.body.von));
  app.post<{ Params: Kampf }>("/api/campaigns/:campaignId/kaempfe/:kampfId/beenden", async req =>
    domain.beenden(await user(req.headers.cookie), req.params.campaignId, req.params.kampfId));
}
