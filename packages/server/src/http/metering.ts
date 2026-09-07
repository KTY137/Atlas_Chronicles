// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
/**
 * Die Raumuhr, sichtbar für den, der sie bezahlt.
 *
 * S3 verlangt, dass Räume und Speicher zu ihren Kosten bepreist werden, nie Funktionen. Eine
 * Abrechnung, die der Nutzer nicht nachrechnen kann, passt nicht zu einem Projekt, das an
 * jeder anderen Stelle Belege führt — deshalb gibt es die Zahlen, bevor es die Rechnung gibt
 * (design/10-hosted-betrieb-und-auslieferung.md §3.4).
 */
import type { FastifyInstance } from "fastify";
import { Type, type Static } from "@sinclair/typebox";
import type { Db } from "../db/index.ts";
import type { AppConfig } from "../app.ts";
import { createIdentity } from "../identity/index.ts";
import { createMetering } from "../domain/metering.ts";

// Millisekunden seit Epoche, als Zeichenkette übergeben: ein 13-stelliger Wert überlebt den
// Weg durch die Query nicht zuverlässig als Zahl, und ein stilles Runden wäre hier eine
// falsche Rechnung.
const zeitpunkt = Type.Optional(Type.String({ pattern: "^(0|[1-9][0-9]{0,14})$" }));
const zeitraum = Type.Object({ from: zeitpunkt, to: zeitpunkt }, { additionalProperties: false });

export function registerMetering(app: FastifyInstance, db: Db, config: AppConfig) {
  const identity = createIdentity(db, config), metering = createMetering(db, config);
  app.get<{ Params: { campaignId: string }; Querystring: Static<typeof zeitraum> }>(
    "/api/campaigns/:campaignId/usage", { schema: { querystring: zeitraum } }, async (request) => {
      const user = await identity.authenticate(request.headers.cookie);
      const from = request.query.from === undefined ? undefined : Number(request.query.from);
      const to = request.query.to === undefined ? undefined : Number(request.query.to);
      return metering.campaignUsage(user.userId, request.params.campaignId, from, to);
    });
}
