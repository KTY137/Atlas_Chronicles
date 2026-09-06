import type { FastifyInstance } from "fastify";
import { Type, type Static } from "@sinclair/typebox";
import { GrundrissError, GRUNDRISS_LIMITS } from "@chronicle/forge";
import { TacticalMapValidationError } from "@chronicle/szene";
import type { Db } from "../db/index.ts";
import { createIdentity, type IdentityConfig } from "../identity/index.ts";
import { createGrundriss } from "../domain/grundriss.ts";
import { TacticalValidationError } from "../domain/tactical.ts";

/**
 * The route that makes our own generator reachable.
 *
 * It deliberately does not define a second map API: `POST …/tactical/generate` produces a map and
 * answers with the very same `TacticalAck` the import route answers with, so every client path
 * that already knows how to open, revise, plan and render an imported map works unchanged on a
 * generated one. The generator is a new *entrance*, not a new subsystem.
 *
 * Every bound below is read from `GRUNDRISS_LIMITS`, which lives beside the algorithm. A schema
 * carrying its own numbers would drift: a route that accepted 4,000 rooms while the generator
 * refused them would only move the error somewhere less useful, and one that accepted fewer than
 * the generator supports would silently amputate a working feature.
 */
const closed = { additionalProperties: false } as const;

const zelle = Type.Integer({ minimum: GRUNDRISS_LIMITS.zellenMin, maximum: GRUNDRISS_LIMITS.zellenMax });

const OptionenSchema = Type.Object({
  zellen: Type.Optional(Type.Tuple([zelle, zelle])),
  zellgroesse: Type.Optional(Type.Integer({ minimum: GRUNDRISS_LIMITS.zellgroesseMin, maximum: GRUNDRISS_LIMITS.zellgroesseMax })),
  raeume: Type.Optional(Type.Integer({ minimum: GRUNDRISS_LIMITS.raeumeMin, maximum: GRUNDRISS_LIMITS.raeumeMax })),
  minRaum: Type.Optional(Type.Integer({ minimum: GRUNDRISS_LIMITS.minRaumMin, maximum: GRUNDRISS_LIMITS.minRaumMax })),
  schleifen: Type.Optional(Type.Integer({ minimum: 0, maximum: GRUNDRISS_LIMITS.schleifenMax })),
  moeblierung: Type.Optional(Type.Number({ minimum: 0, maximum: 1 })),
  licht: Type.Optional(Type.Boolean()),
  gangboden: Type.Optional(Type.String({ minLength: 1, maxLength: 64 })),
}, closed);

export const GrundrissSchema = Type.Object({
  commandId: Type.String({ minLength: 1, maxLength: 128 }),
  name: Type.String({ minLength: 1, maxLength: 160, pattern: "\\S" }),
  keim: Type.String({ minLength: 1, maxLength: 512 }),
  optionen: Type.Optional(OptionenSchema),
}, closed);

export type GrundrissBody = Static<typeof GrundrissSchema>;

export function registerGrundriss(app: FastifyInstance, db: Db, config: IdentityConfig) {
  const identity = createIdentity(db, config), grundriss = createGrundriss(db, config);
  const auth = async (cookie: string | undefined) => (await identity.authenticate(cookie)).userId;
  const base = "/api/campaigns/:campaignId";
  type Scope = { campaignId: string };

  async function run<T>(work: () => Promise<T>): Promise<T> {
    try { return await work(); } catch (error) {
      // The generator's own refusals are user errors, not server faults: an impossible room count
      // is a request to fix, not an incident to page someone about.
      if (error instanceof GrundrissError || error instanceof TacticalMapValidationError) {
        throw new TacticalValidationError(error.message);
      }
      throw error;
    }
  }

  app.get(`${base}/tactical/generate/defaults`, () => grundriss.defaults());

  app.post<{ Params: Scope; Body: GrundrissBody }>(
    `${base}/tactical/generate/preview`,
    { schema: { body: GrundrissSchema } },
    req => run(async () => grundriss.preview(await auth(req.headers.cookie), req.params.campaignId, req.body)),
  );

  app.post<{ Params: Scope; Body: GrundrissBody }>(
    `${base}/tactical/generate`,
    { schema: { body: GrundrissSchema } },
    req => run(async () => grundriss.generate(await auth(req.headers.cookie), req.params.campaignId, req.body)),
  );
}
