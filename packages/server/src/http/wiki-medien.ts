// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import type { FastifyInstance } from "fastify";
import { Type, type Static } from "@sinclair/typebox";
import { Id } from "@chronicle/protocol";
import { ImportValidationError } from "@chronicle/io";
import type { Db } from "../db/index.ts";
import type { AppConfig } from "../app.ts";
import { createIdentity } from "../identity/index.ts";
import { createWikiMedien, WIKI_ASSET_GRENZEN } from "../domain/wiki-medien.ts";

/**
 * Die Bytes kommen roh herein und roh heraus.
 *
 * Roh herein, weil base64 in JSON ein Drittel Aufschlag kostet und die Prüfung ohnehin auf den
 * Bytes arbeitet. Roh heraus mit `nosniff` und dem gemessenen Typ, damit der Browser nie über
 * den Inhalt einer fremden Datei abstimmt — dieselbe Zusage, die die Kartenauslieferung gibt.
 */
export function registerWikiMedien(app: FastifyInstance, db: Db, config: AppConfig) {
  const identity = createIdentity(db, config), medien = createWikiMedien(db, config);
  const closed = { additionalProperties: false };
  const status = Type.Union([Type.Literal("frei"), Type.Literal("zitat"), Type.Literal("unbekannt")]);
  const lizenz = Type.Object({ status, quelle: Type.Optional(Type.String({ maxLength: 2000 })) }, closed);
  const anlage = Type.Object({
    dateiname: Type.String({ minLength: 1, maxLength: 512 }),
    lizenz: Type.Optional(status),
    quelle: Type.Optional(Type.String({ maxLength: 2000 })),
  }, closed);
  type Scope = { campaignId: string };
  type Item = Scope & { id: string };
  const user = async (cookie: string | undefined) => (await identity.authenticate(cookie)).userId;

  app.get<{ Params: Scope }>("/api/campaigns/:campaignId/wiki-medien", async (req) =>
    medien.bestand(await user(req.headers.cookie), req.params.campaignId));

  /**
   * Eine Zeile für ein eigenes Bild. Zwei Aufrufe statt einem: erst die Zeile, dann dieselben
   * Bytes durch dieselbe Vermessung wie bei jeder Wiki-Datei. Ein Weg für Bilder, zwei Eingänge.
   */
  app.post<{ Params: Scope; Body: Static<typeof anlage> }>("/api/campaigns/:campaignId/wiki-medien",
    { schema: { body: anlage, params: Type.Object({ campaignId: Type.String() }, closed) } }, async (req) =>
      medien.anlegen(await user(req.headers.cookie), req.params.campaignId, req.body));

  /**
   * Jeder Bildtyp landet im selben Rohpuffer. Der `Content-Type` des Uploads ist eine Behauptung
   * des Absenders und wird nicht geprüft, sondern durch die Magic Bytes ERSETZT — deshalb steht
   * hier eine Liste erlaubter Rahmen und keine Typprüfung.
   */
  app.addContentTypeParser(["image/png", "image/jpeg", "image/webp", "image/gif", "application/octet-stream"],
    { parseAs: "buffer", bodyLimit: WIKI_ASSET_GRENZEN.bytes + 1024 },
    (_req: unknown, body: Buffer, done: (error: Error | null, value?: unknown) => void) => { done(null, body); });

  app.put<{ Params: Item }>("/api/campaigns/:campaignId/wiki-medien/:id/bytes",
    { bodyLimit: WIKI_ASSET_GRENZEN.bytes + 1024 }, async (req) => {
      const body: unknown = req.body;
      if (!Buffer.isBuffer(body)) throw new ImportValidationError("bild", "raw image bytes required");
      return medien.bytesAnnehmen(await user(req.headers.cookie), req.params.campaignId, req.params.id, body);
    });

  app.get<{ Params: Item }>("/api/campaigns/:campaignId/wiki-medien/:id/datei", async (req, reply) => {
    const datei = await medien.ausliefern(await user(req.headers.cookie), req.params.campaignId, req.params.id);
    return reply
      .header("Cache-Control", "private, max-age=300")
      .header("X-Content-Type-Options", "nosniff")
      .header("Content-Security-Policy", "default-src 'none'; sandbox")
      .header("ETag", `"${datei.sha256}"`)
      .type(datei.mime).send(datei.daten);
  });

  app.post<{ Params: Item; Body: Static<typeof lizenz> }>("/api/campaigns/:campaignId/wiki-medien/:id/lizenz",
    { schema: { body: lizenz, params: Type.Object({ campaignId: Type.String(), id: Id }, closed) } }, async (req) =>
      medien.lizenzSetzen(await user(req.headers.cookie), req.params.campaignId, req.params.id, req.body.status, req.body.quelle ?? null));
}
