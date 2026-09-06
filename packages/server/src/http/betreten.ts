import type { FastifyInstance } from "fastify";
import { Type, type Static } from "@sinclair/typebox";
import { GrundrissError } from "@chronicle/forge";
import { TacticalMapValidationError } from "@chronicle/szene";
import type { Db } from "../db/index.ts";
import { createIdentity, type IdentityConfig } from "../identity/index.ts";
import { createBetreten } from "../domain/betreten.ts";
import { TacticalValidationError } from "../domain/tactical.ts";

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

export const BetretenSchema = Type.Object({
  commandId: Type.String({ minLength: 1, maxLength: 128 }),
  knotenId: Type.String({ minLength: 1, maxLength: 128 }),
  name: Type.Optional(Type.String({ minLength: 1, maxLength: 160, pattern: "\\S" })),
}, closed);

export type BetretenBody = Static<typeof BetretenSchema>;

export function registerBetreten(app: FastifyInstance, db: Db, config: IdentityConfig) {
  const identity = createIdentity(db, config), betreten = createBetreten(db, config);
  const auth = async (cookie: string | undefined) => (await identity.authenticate(cookie)).userId;
  const base = "/api/campaigns/:campaignId";
  type Knoten = { campaignId: string; knotenId: string };
  type Scope = { campaignId: string };

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

  // Read-only: may I go in, and is there already something behind this door? Answering needs no
  // leitung, because a member has to be able to see a door to decide whether to knock.
  app.get<{ Params: Knoten }>(
    `${base}/knoten/:knotenId/betretbar`,
    req => run(async () => betreten.betretbar(await auth(req.headers.cookie), req.params.campaignId, req.params.knotenId)),
  );

  // Entering twice returns the first map, never a second one: an address that mints a new place
  // on every visit is a slot machine, not a place.
  app.post<{ Params: Scope; Body: BetretenBody }>(
    `${base}/betreten`,
    { schema: { body: BetretenSchema } },
    req => run(async () => betreten.betrete(await auth(req.headers.cookie), req.params.campaignId, req.body)),
  );
}
