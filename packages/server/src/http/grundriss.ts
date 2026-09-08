// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import type { FastifyInstance } from "fastify";
import { Type, type Static } from "@sinclair/typebox";
import { GrundrissError, GRUNDRISS_LIMITS, HOEHLE_LIMITS, SIEDLUNG_LIMITS, SIEDLUNG_STANDORTE } from "@chronicle/forge";
import { BAUWERK_TYPEN, KARTEN_SETTINGS, TacticalMapValidationError } from "@chronicle/szene";
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

export const BauwerkTypSchema = Type.Union(BAUWERK_TYPEN.map(typ => Type.Literal(typ)));
export const KartenSettingSchema = Type.Union(KARTEN_SETTINGS.map(setting => Type.Literal(setting)));
export const KartenStilSchema = Type.Union([Type.Literal("grundriss"), Type.Literal("gemalt"), Type.Literal("zeitwelten"), Type.Literal("genres")]);
export const OptionenSchema = Type.Object({
  setting: Type.Optional(KartenSettingSchema),
  zellen: Type.Optional(Type.Tuple([zelle, zelle])),
  zellgroesse: Type.Optional(Type.Integer({ minimum: GRUNDRISS_LIMITS.zellgroesseMin, maximum: GRUNDRISS_LIMITS.zellgroesseMax })),
  raeume: Type.Optional(Type.Integer({ minimum: GRUNDRISS_LIMITS.raeumeMin, maximum: GRUNDRISS_LIMITS.raeumeMax })),
  minRaum: Type.Optional(Type.Integer({ minimum: GRUNDRISS_LIMITS.minRaumMin, maximum: GRUNDRISS_LIMITS.minRaumMax })),
  schleifen: Type.Optional(Type.Integer({ minimum: 0, maximum: GRUNDRISS_LIMITS.schleifenMax })),
  moeblierung: Type.Optional(Type.Number({ minimum: 0, maximum: 1 })),
  licht: Type.Optional(Type.Boolean()),
  gangboden: Type.Optional(Type.String({ minLength: 1, maxLength: 64 })),
  anordnung: Type.Optional(Type.Union([Type.Literal("raster"), Type.Literal("streuung"), Type.Literal("kachelwerk")])),
  profil: Type.Optional(Type.Union([Type.Literal("frei"), BauwerkTypSchema])),
}, closed);

/**
 * Die Höhle hat eigene Regler: Kammern statt Räume, eine Füllung und eine Glättung. Sie
 * ergibt dieselbe Art Ergebnis wie der Grundriss (`Grundriss` mit `art: "hoehle"`) und geht
 * deshalb denselben Persistenzweg — ein zweiter waere die Doppelung, die dieses Modul meidet.
 */
export const HoehleOptionenSchema = Type.Object({
  zellen: Type.Optional(Type.Tuple([zelle, zelle])),
  zellgroesse: Type.Optional(Type.Integer({ minimum: GRUNDRISS_LIMITS.zellgroesseMin, maximum: GRUNDRISS_LIMITS.zellgroesseMax })),
  kammern: Type.Optional(Type.Integer({ minimum: HOEHLE_LIMITS.kammernMin, maximum: HOEHLE_LIMITS.kammernMax })),
  fuellung: Type.Optional(Type.Number({ minimum: 0.2, maximum: 0.7 })),
  glaettung: Type.Optional(Type.Integer({ minimum: 0, maximum: HOEHLE_LIMITS.glaettungMax })),
  mindestFlaeche: Type.Optional(Type.Integer({ minimum: HOEHLE_LIMITS.mindestFlaecheMin, maximum: 4096 })),
  moeblierung: Type.Optional(Type.Number({ minimum: 0, maximum: 1 })),
  licht: Type.Optional(Type.Boolean()),
}, closed);

const grundstueck = Type.Integer({ minimum: SIEDLUNG_LIMITS.grundstueckMin, maximum: SIEDLUNG_LIMITS.grundstueckMax });
export const SiedlungOptionenSchema = Type.Object({
  setting: Type.Optional(KartenSettingSchema),
  standort: Type.Optional(Type.Union(SIEDLUNG_STANDORTE.map(value => Type.Literal(value)))),
  art: Type.Optional(Type.Union([Type.Literal("weiler"), Type.Literal("dorf"), Type.Literal("stadt")])),
  ausdehnung: Type.Optional(Type.Tuple([zelle, zelle])),
  zellgroesse: Type.Optional(Type.Integer({ minimum: SIEDLUNG_LIMITS.zellgroesseMin, maximum: SIEDLUNG_LIMITS.zellgroesseMax })),
  bauwerke: Type.Optional(Type.Integer({ minimum: SIEDLUNG_LIMITS.bauwerkeMin, maximum: SIEDLUNG_LIMITS.bauwerkeMax })),
  strassenDichte: Type.Optional(Type.Number({ minimum: 0, maximum: 1 })),
  grundstueck: Type.Optional(Type.Tuple([grundstueck, grundstueck])),
  licht: Type.Optional(Type.Boolean()),
}, closed);

const gemeinsam = {
  commandId: Type.String({ minLength: 1, maxLength: 128 }),
  name: Type.String({ minLength: 1, maxLength: 160, pattern: "\\S" }),
  keim: Type.String({ minLength: 1, maxLength: 256, pattern: "\\S" }),
  stil: Type.Optional(KartenStilSchema),
};
/**
 * Zwei Arten, eine Tuer. Die Union ist nach `art` unterschieden, damit die Regler der einen
 * Art nicht bei der anderen durchrutschen: eine „Fuellung" an einem Grundriss waere eine
 * Angabe, die niemand liest, und stillschweigend ignorierte Eingaben sind schlimmer als
 * abgewiesene.
 */
export const GrundrissSchema = Type.Union([
  Type.Object({ ...gemeinsam, art: Type.Optional(Type.Literal("grundriss")), optionen: Type.Optional(OptionenSchema) }, closed),
  Type.Object({ ...gemeinsam, art: Type.Literal("hoehle"), optionen: Type.Optional(HoehleOptionenSchema) }, closed),
  Type.Object({ ...gemeinsam, art: Type.Literal("siedlung"), optionen: Type.Optional(SiedlungOptionenSchema) }, closed),
]);

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
