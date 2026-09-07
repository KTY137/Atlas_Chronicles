import { readFileSync } from "node:fs";
import { erzeugeGrundriss, GRUNDRISS_ERZEUGER, GRUNDRISS_VERSION, GRUNDRISS_STANDARD, type GrundrissOptionen } from "@chronicle/forge";
import { parseAssetpaket, serializeTacticalMapDocument, type AssetpaketV1 } from "@chronicle/szene";
import type { Db } from "../db/index.ts";
import type { IdentityConfig } from "../identity/index.ts";
import { createCampaigns } from "./campaigns.ts";
import { createTactical, TacticalValidationError } from "./tactical.ts";

/**
 * Die eigene Erzeugung, an das Produkt angeschlossen.
 *
 * `packages/forge/src/grundriss.ts` was complete, tested against a real asset pack, and exported
 * from the barrel — and **unreachable**: no server route, no client surface, `erzeugeGrundriss`
 * mentioned nowhere under `packages/server` or `packages/client`. A generator nobody can invoke
 * is the inverse of a fake preview, and just as far from a product.
 *
 * This module is deliberately thin, because the important decision is what it does NOT do:
 *
 * **It invents no second persistence path.** A generated floorplan IS a tactical map. It leaves
 * the generator as an ordinary `TacticalMapDocumentV1`, is serialised with the published
 * serialiser, and is handed to the existing `importMap` as a `native` source — the same door a
 * hand-authored map walks through. Revisioning, anchors, the command log, tiles and undo are
 * therefore had for free and cannot drift, which is what the constitution's "one canonical path
 * per responsibility" is protecting (§5). A parallel `tactical_generated_*` stack would have
 * duplicated all of it and diverged by the second bug fix.
 *
 * The seam turned out to be open already: `prepareImport` accepts `format: "native"` with no
 * image, and a document whose `background` is `null` is valid. Nothing in the map subsystem had
 * to change.
 */

/** The generator needs an asset pack, and the pack's identity is part of the seed (see below). */
const PAKET_URL = new URL("../../../../assets/packs/pk.grundriss/paket.json", import.meta.url);

let cached: AssetpaketV1 | null = null;
function paket(): AssetpaketV1 {
  if (cached) return cached;
  try {
    cached = parseAssetpaket(readFileSync(PAKET_URL, "utf8"));
  } catch (cause) {
    // Fail loudly and specifically. A generator that silently falls back to an empty pack would
    // produce a map that is subtly wrong instead of a request that is honestly refused.
    throw new TacticalValidationError("Das Grundriss-Assetpaket ist auf diesem Server nicht lesbar.");
  }
  return cached;
}

export interface GrundrissRequest {
  readonly commandId: string;
  readonly name: string;
  /**
   * The seed. In the product this is normally an `Ort.kindKeim` handed over from a generated
   * world — the derived child seed Azgaar computes and throws away. Accepting a free-text seed as
   * well is what lets a GM generate a room without first owning a continent.
   */
  readonly keim: string;
  readonly optionen?: Partial<GrundrissOptionen>;
}

export function createGrundriss(db: Db, cfg: IdentityConfig) {
  const campaigns = createCampaigns(db);

  const erzeuge = (input: GrundrissRequest) =>
    erzeugeGrundriss(
      { keim: input.keim, titel: input.name, ...(input.optionen ? { optionen: input.optionen } : {}) },
      paket(),
    );

  /**
   * Provenance for a map nobody photographed. `generator`/`generatorVersion` carry the engine, and
   * the licence is the pack's own — we generated the geometry, but the pack owns the art it
   * references, and saying otherwise in an export would make our user the infringer.
   */
  const herkunft = (keimHash: string) => ({
    name: `Erzeugt · ${keimHash.slice(0, 12)}`,
    creator: GRUNDRISS_ERZEUGER,
    sourceUrl: null,
    license: paket().lizenz.spdx,
    licenseUrl: null,
    retrievedAt: null,
    generator: GRUNDRISS_ERZEUGER,
    generatorVersion: GRUNDRISS_VERSION,
  });

  return {
    /** Optionen the client offers, so the surface cannot drift from the generator's own defaults. */
    defaults(): GrundrissOptionen {
      return GRUNDRISS_STANDARD;
    },

    /** Generate without persisting: the GM sees the room count and the seed before committing. */
    async preview(userId: string, campaignId: string, input: GrundrissRequest) {
      await campaigns.requireMember(userId, campaignId, ["leitung"]);
      const grundriss = erzeuge(input);
      return {
        keimHash: grundriss.keim.keimHash,
        wurzelId: grundriss.wurzelId as string,
        art: grundriss.art,
        bericht: grundriss.bericht,
        raeume: grundriss.raeume.length,
        knoten: grundriss.knoten.length,
        groesse: grundriss.karte.geometry.size,
      };
    },

    /**
     * Generate and persist through the canonical map path.
     *
     * The `keimHash` is returned rather than the seed alone, because the seed alone is not a world
     * identity: RB-21d measured the same seed under a changed option vector keeping `(id, name)`
     * for **0 of 664** generated settlements. Here the pack's id and version are inside the
     * `Weltkeim` too, so swapping the pack honestly yields a different map instead of quietly
     * yielding the same one differently.
     */
    async generate(userId: string, campaignId: string, input: GrundrissRequest) {
      await campaigns.requireMember(userId, campaignId, ["leitung"]);
      const grundriss = erzeuge(input);
      return db.transaction(async tx => {
        const ack = await createTactical(tx, cfg).importMap(userId, campaignId, {
          commandId: input.commandId,
          name: input.name,
          format: "native",
          sourceText: serializeTacticalMapDocument(grundriss.karte),
          provenance: herkunft(grundriss.keim.keimHash),
        });
        // Region ids are Knoten ids. Retain their derived child seeds with the persisted map,
        // so opening an edited room tomorrow reaches the same address as opening it today.
        await tx.query(`INSERT INTO tactical_map_nodes(map_id,knoten_id,campaign_id,data)
          SELECT $1,n.id,$2,n.data FROM jsonb_to_recordset($3::jsonb) AS n(id text,data jsonb)
          ON CONFLICT(map_id,knoten_id) DO NOTHING`,
        [ack.subjectId, campaignId, JSON.stringify(grundriss.knoten.map(data => ({ id: data.id, data })))]);
        return {
          ack,
          keimHash: grundriss.keim.keimHash,
          wurzelId: grundriss.wurzelId as string,
          bericht: grundriss.bericht,
        };
      });
    },
  };
}
