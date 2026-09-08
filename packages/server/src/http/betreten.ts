// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import type { FastifyInstance } from "fastify";
import { Type, type Static } from "@sinclair/typebox";
import { GrundrissError } from "@chronicle/forge";
import { TacticalMapValidationError } from "@chronicle/szene";
import type { Db } from "../db/index.ts";
import { createIdentity, type IdentityConfig } from "../identity/index.ts";
import { createBetreten } from "../domain/betreten.ts";
import { TacticalValidationError } from "../domain/tactical.ts";
import { MapLifecycleConflict } from "../domain/map-lifecycle.ts";
import { BauwerkTypSchema, KartenStilSchema, OptionenSchema, HoehleOptionenSchema, SiedlungOptionenSchema } from "./grundriss.ts";

/**
 * „Betreten" — the address, made walkable.
 *
 * The map research put the whole nesting thesis in one sentence: *"Every one of those child
 * worlds is rendered into an iframe and thrown away — no id, no parent edge, no coordinate frame,
 * no permission and no persistence. **The gap is not the generator. It is the address.**"*
 *
 * `createBetreten` closed the data half. These two routes are what let a person walk it, and they
 * exist in the same commit as the domain on purpose: this session has spent its evening finding
 * finished, tested, unreachable modules — `erzeugeGrundriss`, `erzeugeHoehle`,
 * `erzeugeVerschachtelt` — and shipping one more would be the same defect wearing a newer date.
 *
 * The seed is deliberately NOT in the request body. It is read server-side from the node's own
 * `herkunft.kindKeim`, because a caller-supplied seed would let anyone re-roll somebody else's
 * crypt. `name` is cosmetic and never reaches the generator.
 */
const closed = { additionalProperties: false } as const;

const gemeinsam = {
  commandId: Type.String({ minLength: 1, maxLength: 128 }),
  knotenId: Type.String({ minLength: 1, maxLength: 128 }),
  parentKind: Type.Optional(Type.Union([Type.Literal("atlas"), Type.Literal("tactical")])),
  parentMapId: Type.Optional(Type.String({ minLength: 1, maxLength: 128 })),
  expectedVersion: Type.Optional(Type.Integer({ minimum: 1 })),
  targetMapId: Type.Optional(Type.String({ minLength: 1, maxLength: 128 })),
  name: Type.Optional(Type.String({ minLength: 1, maxLength: 160, pattern: "\\S" })),
  stil: Type.Optional(KartenStilSchema),
};
export const BetretenSchema = Type.Union([
  Type.Object({ ...gemeinsam, art: Type.Optional(Type.Literal("grundriss")), optionen: Type.Optional(OptionenSchema) }, closed),
  Type.Object({ ...gemeinsam, art: Type.Literal("hoehle"), optionen: Type.Optional(HoehleOptionenSchema) }, closed),
  Type.Object({ ...gemeinsam, art: Type.Literal("siedlung"), optionen: Type.Optional(SiedlungOptionenSchema) }, closed),
]);
export const KnotenMetadataSchema = Type.Object({
  commandId: Type.String({ minLength: 1, maxLength: 128 }),
  expectedVersion: Type.Integer({ minimum: 1 }),
  titel: Type.String({ minLength: 1, maxLength: 160, pattern: "\\S" }),
  bauwerk: Type.Optional(Type.Object({ typ: BauwerkTypSchema, beschreibung: Type.String({ maxLength: 2000 }) }, closed)),
}, closed);

export type BetretenBody = Static<typeof BetretenSchema>;

export function registerBetreten(app: FastifyInstance, db: Db, config: IdentityConfig) {
  const identity = createIdentity(db, config), betreten = createBetreten(db, config);
  const auth = async (cookie: string | undefined) => (await identity.authenticate(cookie)).userId;
  const base = "/api/campaigns/:campaignId";
  type Knoten = { campaignId: string; knotenId: string };
  type Scope = { campaignId: string };
  type Parent = Scope & { parentKind: "atlas" | "tactical"; parentMapId: string };

  async function run<T>(work: () => Promise<T>): Promise<T> {
    try { return await work(); } catch (error) {
      // A generator's refusal is a request to fix, not an incident: an impossible child map is a
      // 4xx, and only a genuine fault should ever reach the 500 path.
      if (error instanceof GrundrissError || error instanceof TacticalMapValidationError) {
        throw new TacticalValidationError(error.message);
      }
      throw error;
    }
  }

  // Legacy descriptor uses the same atlas visibility projection as the scoped route.
  // Player responses never include generator seeds or the ids of private tactical drafts.
  app.get<{ Params: Knoten }>(
    `${base}/knoten/:knotenId/betretbar`,
    req => run(async () => betreten.betretbar(await auth(req.headers.cookie), req.params.campaignId, req.params.knotenId)),
  );

  app.get<{ Params: Parent & { knotenId: string } }>(
    `${base}/maps/:parentKind/:parentMapId/knoten/:knotenId/betretbar`,
    req => run(async () => betreten.betretbar(await auth(req.headers.cookie), req.params.campaignId, req.params.knotenId,
      { parentKind: req.params.parentKind, parentMapId: req.params.parentMapId })),
  );
  app.get<{ Params: Parent }>(
    `${base}/maps/:parentKind/:parentMapId/children`,
    req => run(async () => betreten.children(await auth(req.headers.cookie), req.params.campaignId,
      { parentKind: req.params.parentKind, parentMapId: req.params.parentMapId })),
  );

  // Entering twice returns the first map, never a second one: an address that mints a new place
  // on every visit is a slot machine, not a place.
  app.post<{ Params: Scope; Body: BetretenBody }>(
    `${base}/betreten`,
    { schema: { body: BetretenSchema } },
    (req, reply) => run(async () => betreten.betrete(await auth(req.headers.cookie), req.params.campaignId, req.body)).catch(error => {
      if (error instanceof MapLifecycleConflict) return reply.code(409).send(error.response());
      throw error;
    }),
  );
  app.put<{ Params: Scope & { parentMapId: string; knotenId: string }; Body: Static<typeof KnotenMetadataSchema> }>(
    `${base}/maps/tactical/:parentMapId/knoten/:knotenId/metadata`,
    { schema: { body: KnotenMetadataSchema } },
    req => run(async () => betreten.updateMetadata(await auth(req.headers.cookie), req.params.campaignId,
      req.params.parentMapId, req.params.knotenId, req.body)),
  );
}
