import type { Knoten } from "@chronicle/szene";
import type { Db } from "../db/index.ts";
import type { IdentityConfig } from "../identity/index.ts";
import { createCampaigns } from "./campaigns.ts";
import { Gone } from "./errors.ts";
import { createGrundriss } from "./grundriss.ts";

/**
 * Der Zugang — the address `kette.test.ts` proves exists in the data but nobody can walk.
 *
 * The corpus states the gap in its own words: a generated child world is "rendered into an
 * iframe and thrown away — no id, no parent edge, no coordinate frame, no permission and no
 * persistence. **The gap is not the generator. It is the address.**" `importiereAzgaar` already
 * keeps the derived child seed on every place (`Ort.kindKeim`, mirrored onto the imported
 * `Knoten.herkunft.kindKeim` — `azgaar.ts:245,247`), and `erzeugeGrundriss` already consumes one.
 * This module is the address itself: it resolves a `Knoten` to its (possibly not-yet-existing)
 * child map, and makes "enter" an idempotent, permissioned operation instead of a fresh roll.
 *
 * Three decisions this module is not allowed to get wrong, because each one is exactly the
 * failure mode the brief names:
 *
 * 1. **No second persistence stack (§5).** A child map IS an ordinary tactical map. This module
 *    never touches `tactical_*` tables directly — it calls `createGrundriss(...).generate`, the
 *    same call `packages/server/src/domain/grundriss.ts` itself makes, which in turn goes
 *    through `tactical.importMap`. `betreten_karten` (013_betreten.sql) stores only the edge
 *    from a node to the map that path produced, never the map's content.
 * 2. **The seed comes from the node, never the caller.** `input.name` is cosmetic only; the seed
 *    handed to `erzeugeGrundriss` is always `Knoten.herkunft.kindKeim`, read server-side. A
 *    caller-supplied seed would let any member re-roll (or choose) the contents of a dungeon
 *    that is supposed to belong to a specific place.
 * 3. **Idempotent on the node, not on the request.** Entering the same room twice must return
 *    the same map — an address that mints a new world on every visit is a slot machine, not a
 *    place — so the lookup and the insert are both keyed on `(campaign_id, knoten_id)`, not on
 *    `commandId` (that command-level dedup already exists one layer down, inside
 *    `tactical.importMap`'s own receipts, and solves a different problem: replay-safety of one
 *    network call, not "have we already opened this door").
 *
 * Assumption, made explicit because nothing in the brief pins it down: the only place a `Knoten`
 * is currently persisted in this codebase is `atlas_nodes` (`packages/server/src/domain/atlas.ts`,
 * migration `003_atlas_imports.sql`), written by importing an Azgaar world. `id` is content-derived
 * (`deriveKnotenId`, "never an index" — `model.ts:121`), so a lookup by `(campaign_id, id)` alone
 * is exact and needs no map id — the same property that lets one node be found without knowing
 * which import produced it.
 */

interface KnotenRow {
  data: Knoten;
}

interface AdresseRow {
  map_id: string;
  keim_hash: string;
}

export interface BetretenInput {
  readonly commandId: string;
  readonly knotenId: string;
  /** Cosmetic only — see module doc point 2. Never influences the generated content. */
  readonly name?: string;
}

export function createBetreten(db: Db, cfg: IdentityConfig) {
  const campaigns = createCampaigns(db);
  const grundriss = createGrundriss(db, cfg);
  const now = cfg.now ?? Date.now;

  async function findKnoten(campaignId: string, knotenId: string): Promise<Knoten | null> {
    const row = (
      await db.query<KnotenRow>("SELECT data FROM atlas_nodes WHERE campaign_id=$1 AND id=$2 LIMIT 1", [campaignId, knotenId])
    ).rows[0];
    return row?.data ?? null;
  }

  async function adresse(campaignId: string, knotenId: string): Promise<AdresseRow | null> {
    return (
      await db.query<AdresseRow>("SELECT map_id, keim_hash FROM betreten_karten WHERE campaign_id=$1 AND knoten_id=$2", [campaignId, knotenId])
    ).rows[0] ?? null;
  }

  return {
    /** Read-only, any member: asking whether a door opens is not opening it. */
    async betretbar(userId: string, campaignId: string, knotenId: string) {
      await campaigns.requireMember(userId, campaignId);
      const knoten = await findKnoten(campaignId, knotenId);
      if (!knoten) throw new Gone("knoten");
      const bestehend = await adresse(campaignId, knotenId);
      return {
        // Honestly null rather than invented, per the brief: a node with no kindKeim is not
        // enterable, full stop.
        kindKeim: knoten.herkunft?.kindKeim ?? null,
        vorhandeneKarteId: bestehend?.map_id ?? null,
        titel: knoten.titel ?? "Unbenannt",
      };
    },

    /**
     * Mint the address, or hand back the one that already exists. Only `leitung` may cause a
     * write; anyone else is refused before the node is even looked up, so a refusal never leaks
     * whether the node exists or what it would generate.
     */
    async betrete(userId: string, campaignId: string, input: BetretenInput) {
      await campaigns.requireMember(userId, campaignId, ["leitung"]);
      const knoten = await findKnoten(campaignId, input.knotenId);
      if (!knoten) throw new Gone("knoten");

      // Idempotency first, and keyed on the node (module doc point 3) — a repeat entry must be a
      // pure read and must never re-invoke the generator.
      const bestehend = await adresse(campaignId, input.knotenId);
      if (bestehend) return { mapId: bestehend.map_id, erzeugt: false, keimHash: bestehend.keim_hash };

      // The seed is the node's own derived child seed — never `input` (module doc point 2).
      const kindKeim = knoten.herkunft?.kindKeim ?? null;
      if (kindKeim === null) throw new Gone("kein-kindkeim");

      const titel = input.name?.trim() || knoten.titel || "Unbenannt";
      // The canonical path (module doc point 1): the exact call `grundriss.ts` itself makes.
      const erzeugung = await grundriss.generate(userId, campaignId, { commandId: input.commandId, name: titel, keim: kindKeim });

      // The unique key on (campaign_id, knoten_id) — not the read above — is what actually
      // guarantees one address per node: two concurrent first entries can both pass the check
      // above. `ON CONFLICT DO NOTHING RETURNING` makes the loser's freshly generated map an
      // unreferenced (harmless, never-returned) orphan rather than a second live address for the
      // same door. Wrapping this whole function in one outer transaction to close that window
      // was rejected: `grundriss.generate` runs its own transaction one layer down (via
      // `tactical.importMap`), and nesting a lock-holding transaction around a call that opens
      // its own would deadlock the very locks it is trying to serialize.
      const minted = await db.query<AdresseRow>(
        `INSERT INTO betreten_karten(campaign_id,knoten_id,map_id,keim_hash,created_by,created_at)
         VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT (campaign_id,knoten_id) DO NOTHING
         RETURNING map_id, keim_hash`,
        [campaignId, input.knotenId, erzeugung.ack.subjectId, erzeugung.keimHash, userId, now()],
      );
      if (minted.rows[0]) return { mapId: minted.rows[0].map_id, erzeugt: true, keimHash: minted.rows[0].keim_hash };
      const gewonnen = await adresse(campaignId, input.knotenId);
      if (!gewonnen) throw new Gone("betreten-race"); // unreachable: ON CONFLICT implies a winning row exists
      return { mapId: gewonnen.map_id, erzeugt: false, keimHash: gewonnen.keim_hash };
    },
  };
}
