// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { readFileSync } from "node:fs";
import { erzeugeGrundriss, erzeugeHoehle, erzeugeSiedlung, siedlungStandard, GRUNDRISS_STANDARD, HOEHLE_STANDARD, SIEDLUNG_STANDARD, GRUNDRISS_LIMITS, HOEHLE_LIMITS, SIEDLUNG_LIMITS, type GrundrissOptionen, type HoehleOptionen, type SiedlungOptionen } from "@chronicle/forge";
import { KARTEN_SETTINGS, parseAssetpaket, serializeTacticalMapDocument, type AssetpaketV1, type KartenSetting, type Weltkeim } from "@chronicle/szene";
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
export type KartenArt = "grundriss" | "hoehle" | "siedlung";
export type KartenStil = "grundriss" | "gemalt" | "zeitwelten";
export type KartenOptionen = Partial<GrundrissOptionen> | Partial<HoehleOptionen> | Partial<SiedlungOptionen>;
const PAKET_URLS: Record<KartenStil, URL> = {
  grundriss: new URL("../../../../assets/packs/pk.grundriss/paket.json", import.meta.url),
  gemalt: new URL("../../../../assets/packs/pk.gemalt/paket.json", import.meta.url),
  zeitwelten: new URL("../../../../assets/packs/pk.zeitwelten/paket.json", import.meta.url),
};
const cached = new Map<KartenStil, AssetpaketV1>();
function paket(stil: KartenStil = "grundriss"): AssetpaketV1 {
  if (!Object.hasOwn(PAKET_URLS, stil)) throw new TacticalValidationError("Bitte einen vorhandenen Kartenstil auswählen.");
  const existing = cached.get(stil);
  if (existing) return existing;
  try {
    const loaded = parseAssetpaket(readFileSync(PAKET_URLS[stil], "utf8"));
    cached.set(stil, loaded);
    return loaded;
  } catch (cause) {
    // Fail loudly and specifically. A generator that silently falls back to an empty pack would
    // produce a map that is subtly wrong instead of a request that is honestly refused.
    throw new TacticalValidationError("Das gewählte Karten-Assetpaket ist auf diesem Server nicht lesbar.");
  }
}

/** Reject irrelevant options for domain callers as well as HTTP callers. Numeric bounds stay
 * with the generators; a cave's options must never be silently swallowed by a floorplan. */
export function validateKartenOptionen(art: KartenArt, optionen?: KartenOptionen): void {
  const keys: Record<KartenArt, readonly string[]> = {
    grundriss: ["zellen", "zellgroesse", "raeume", "minRaum", "schleifen", "moeblierung", "licht", "gangboden", "anordnung", "profil", "setting"],
    hoehle: ["zellen", "zellgroesse", "kammern", "fuellung", "glaettung", "mindestFlaeche", "moeblierung", "licht"],
    siedlung: ["art", "ausdehnung", "zellgroesse", "bauwerke", "strassenDichte", "grundstueck", "licht", "setting"],
  };
  if (!Object.hasOwn(keys, art) || optionen !== undefined && (!optionen || typeof optionen !== "object" || Array.isArray(optionen)
    || ![Object.prototype, null].includes(Object.getPrototypeOf(optionen)) || Object.keys(optionen).some(key => !keys[art].includes(key))))
    throw new TacticalValidationError("Bitte die Optionen der gewählten Kartenart verwenden.");
  if (optionen && "setting" in optionen && !KARTEN_SETTINGS.some(setting => setting === optionen.setting))
    throw new TacticalValidationError("Bitte ein vorhandenes Kartensetting auswählen.");
}

/** The normalized seed vector owns generation settings; older generators omitted this field. */
function setting(ergebnis: { keim: Pick<Weltkeim, "optionen"> }): KartenSetting {
  const value = ergebnis.keim.optionen.setting;
  return KARTEN_SETTINGS.find(candidate => candidate === value) ?? "fantasy";
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
  /**
   * Welche Art Karte entsteht. `grundriss` sind Räume und Gänge (Schloss, Krypta, Haus),
   * `hoehle` ist gewachsener Fels. Beide liefern dasselbe Ergebnis (`Grundriss`) und gehen
   * denselben Weg in die Datenbank; nur der Erzeuger dahinter ist ein anderer.
   */
  readonly art?: KartenArt;
  readonly stil?: KartenStil;
  readonly optionen?: KartenOptionen;
}

export function createGrundriss(db: Db, cfg: IdentityConfig) {
  const campaigns = createCampaigns(db);

  const erzeuge = (input: GrundrissRequest) => {
    // Die Verzweigung ist die ganze Erweiterung: `erzeugeHoehle` war gebaut, geprueft und aus dem
    // Fass exportiert — und unerreichbar, genau wie `erzeugeGrundriss` es einmal war.
    const auftrag = { keim: input.keim, titel: input.name };
    validateKartenOptionen(input.art ?? "grundriss", input.optionen);
    return input.art === "hoehle"
      ? erzeugeHoehle({ ...auftrag, ...(input.optionen ? { optionen: input.optionen as Partial<HoehleOptionen> } : {}) }, paket(input.stil))
      : input.art === "siedlung"
        ? erzeugeSiedlung({ ...auftrag, ...(input.optionen ? { optionen: input.optionen as Partial<SiedlungOptionen> } : {}) }, paket(input.stil))
        : erzeugeGrundriss({ ...auftrag, ...(input.optionen ? { optionen: input.optionen as Partial<GrundrissOptionen> } : {}) }, paket(input.stil));
  };

  /**
   * Provenance for a map nobody photographed. `generator`/`generatorVersion` carry the engine, and
   * the licence is the pack's own — we generated the geometry, but the pack owns the art it
   * references, and saying otherwise in an export would make our user the infringer.
   */
  /**
   * Der Erzeuger kommt aus dem ERGEBNIS, nicht aus einer Konstante. Vorher stand hier fest
   * `GRUNDRISS_ERZEUGER`; seit die Kartenart waehlbar ist, haette eine erzeugte Hoehle damit den
   * Grundriss-Generator als ihren Urheber genannt — eine falsche Herkunftsangabe in genau dem
   * Feld, ueber dem der Absatz daueber steht.
   */
  const herkunft = (ergebnis: { keim: Pick<Weltkeim, "keimHash" | "optionen">; erzeuger: string; version: string }, stil?: KartenStil) => ({
    // Der Name der Quelle nennt das Werkzeug. Das ist die Signatur, die mit der Karte in jeden
    // Export wandert — und es bleibt eine Aussage ueber die ERZEUGUNG, nicht ueber das Werk:
    // was auf der Karte steht, hat sich die Runde ausgedacht.
    name: `Erzeugt mit Atlas Chronicles · ${ergebnis.keim.keimHash.slice(0, 12)}`,
    creator: ergebnis.erzeuger,
    sourceUrl: null,
    license: paket(stil).lizenz.spdx,
    licenseUrl: null,
    retrievedAt: null,
    generator: ergebnis.erzeuger,
    generatorVersion: ergebnis.version,
    setting: setting(ergebnis),
  });

  return {
    /** The surface receives the exact generator defaults and the locally available styles. */
    defaults() {
      return { grundriss: GRUNDRISS_STANDARD, hoehle: HOEHLE_STANDARD, siedlung: SIEDLUNG_STANDARD,
        siedlungsarten: { weiler: siedlungStandard("weiler"), dorf: siedlungStandard("dorf"), stadt: siedlungStandard("stadt") },
        stile: [{ id: "grundriss", titel: "Grundriss" }, { id: "gemalt", titel: "Gemalt" }, { id: "zeitwelten", titel: "Zeitwelten" }],
        limits: { grundriss: GRUNDRISS_LIMITS, hoehle: HOEHLE_LIMITS, siedlung: SIEDLUNG_LIMITS } };
    },

    /** Generate without persisting: the GM sees the room count and the seed before committing. */
    async preview(userId: string, campaignId: string, input: GrundrissRequest) {
      await campaigns.requireMember(userId, campaignId, ["leitung"]);
      const grundriss = erzeuge(input);
      return {
        keimHash: grundriss.keim.keimHash,
        wurzelId: grundriss.wurzelId as string,
        art: grundriss.art,
        stil: input.stil ?? "grundriss",
        setting: setting(grundriss),
        bericht: grundriss.bericht,
        ...(grundriss.art === "siedlung" ? { bauwerke: grundriss.bauwerke.length, strassen: grundriss.strassen.length } : { raeume: grundriss.raeume.length }),
        knoten: grundriss.knoten.length,
        groesse: grundriss.karte.geometry.size,
        document: grundriss.karte,
        nodes: grundriss.knoten.filter(node => node.id !== grundriss.wurzelId).map(node => ({
          knotenId: node.id, titel: node.titel ?? "Unbenannt", art: node.art,
          ...(node.bauwerk ? { bauwerk: node.bauwerk } : {}), x: node.anker?.bei[0] ?? 0, y: node.anker?.bei[1] ?? 0,
        })),
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
          provenance: herkunft(grundriss, input.stil),
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
