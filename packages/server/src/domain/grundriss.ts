// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { erzeugeAnlage, ANLAGE_STANDARD, anlageOptionen, type AnlageOptionen } from "@chronicle/forge";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { erzeugeHaus, type Haus, type HausAuftrag } from "@chronicle/forge";
import { erzeugeGrundriss, erzeugeHoehle, erzeugeSiedlung, siedlungStandard, BAUWERK_AUSDEHNUNG, GRUNDRISS_STANDARD, HOEHLE_STANDARD, SIEDLUNG_STANDARD, SIEDLUNG_STANDORTE, GRUNDRISS_LIMITS, HOEHLE_LIMITS, SIEDLUNG_LIMITS, type GrundrissOptionen, type HoehleOptionen, type SiedlungOptionen, erzeugeRegion, REGION_STANDARD, REGION_LIMITS, type RegionOptionen } from "@chronicle/forge";
import { parseRoadPlan, RoadPlanError, parseSettlementPlan, SettlementPlanError, inferLegacyCartography, BAUWERK_TYPEN, KARTEN_SETTINGS, parseAssetpaket, parseTacticalCartography, serializeTacticalMapDocument, type AssetpaketV1, type BauwerkTyp, type KartenSetting, type MapFloorStack, type Weltkeim } from "@chronicle/szene";
import type { Db } from "../db/index.ts";
import type { IdentityConfig } from "../identity/index.ts";
import { createCampaigns } from "./campaigns.ts";
import { createTactical, TacticalValidationError } from "./tactical.ts";
import { floorStackFor, insertFloorStack } from "./map-studio-state.ts";

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
export type KartenArt = "grundriss" | "hoehle" | "siedlung" | "region";
export type KartenStil = "grundriss" | "gemalt" | "zeitwelten" | "genres";
export type KartenOptionen = Partial<GrundrissOptionen> | Partial<HoehleOptionen> | Partial<SiedlungOptionen> | Partial<RegionOptionen> | Partial<AnlageOptionen>;
const PAKET_URLS: Record<KartenStil, URL> = {
  grundriss: new URL("../../../../assets/packs/pk.grundriss/paket.json", import.meta.url),
  gemalt: new URL("../../../../assets/packs/pk.gemalt/paket.json", import.meta.url),
  zeitwelten: new URL("../../../../assets/packs/pk.zeitwelten/paket.json", import.meta.url),
  genres: new URL("../../../../assets/packs/pk.genres/paket.json", import.meta.url),
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
  if (art === "siedlung" && optionen && "anlage" in optionen) { anlageOptionen(optionen as Partial<AnlageOptionen>); return; }
  const keys: Record<KartenArt, readonly string[]> = {
    grundriss: ["zellen", "zellgroesse", "raeume", "minRaum", "schleifen", "moeblierung", "licht", "gangboden", "anordnung", "profil", "setting"],
    hoehle: ["zellen", "zellgroesse", "kammern", "fuellung", "glaettung", "mindestFlaeche", "moeblierung", "licht"],
    siedlung: ["art", "ausdehnung", "zellgroesse", "bauwerke", "strassenDichte", "grundstueck", "licht", "setting", "standort", "relief", "bewaldung", "planung", "verkehr", "mauer", "burg"],
    region: ["ausdehnung", "zellgroesse", "orte", "setting", "standort", "relief", "bewaldung"],
  };
  if (!Object.hasOwn(keys, art) || optionen !== undefined && (!optionen || typeof optionen !== "object" || Array.isArray(optionen)
    || ![Object.prototype, null].includes(Object.getPrototypeOf(optionen)) || Object.keys(optionen).some(key => !keys[art].includes(key))))
    throw new TacticalValidationError("Bitte die Optionen der gewählten Kartenart verwenden.");
  if (optionen && "verkehr" in optionen) {
    try { parseRoadPlan(optionen.verkehr); } catch (error) { if (error instanceof RoadPlanError) throw new TacticalValidationError(error.message); throw error; }
  }
  if (optionen && "planung" in optionen) {
    try { parseSettlementPlan(optionen.planung); } catch (error) { if (error instanceof SettlementPlanError) throw new TacticalValidationError(error.message); throw error; }
  }
  if (optionen && "setting" in optionen && !KARTEN_SETTINGS.some(setting => setting === optionen.setting))
    throw new TacticalValidationError("Bitte ein vorhandenes Kartensetting auswählen.");
  if (optionen && "standort" in optionen && !SIEDLUNG_STANDORTE.some(value => value === optionen.standort))
    throw new TacticalValidationError("Bitte einen vorhandenen Standort auswählen.");
}

/** The normalized seed vector owns generation settings; older generators omitted this field. */
function setting(ergebnis: { keim: Pick<Weltkeim, "optionen"> }): KartenSetting {
  const value = ergebnis.keim.optionen.setting;
  return KARTEN_SETTINGS.find(candidate => candidate === value) ?? "fantasy";
}

/**
 * Wo ein Gebäude auf seiner Elternkarte steht: sein Umriss in deren Feldern und die Seite, vor der
 * die Straße liegt. Nur `betreten` kennt beides; die freie Erzeugung baut ein Rechteck nach Typ.
 */
export interface HausLage { readonly umriss?: readonly (readonly [number, number])[]; readonly strasse?: readonly [number, number] }

/**
 * Ein Gebäudetyp ohne eigene Größe und Raumzahl wird ein **Haus**: Geschosse, Treppen, Räume nach
 * dem Umriss. Wer Breite, Höhe oder Raumzahl vorgibt, bestellt die freie Grundrissleinwand und
 * bekommt sie — eine gewählte Größe gilt, statt stillschweigend überstimmt zu werden.
 */
export function wirdHaus(art: KartenArt | undefined, optionen?: KartenOptionen): boolean {
  if ((art ?? "grundriss") !== "grundriss" || !optionen) return false;
  const o = optionen as Partial<GrundrissOptionen>;
  return BAUWERK_TYPEN.some(typ => typ === o.profil) && ["zellen", "raeume", "minRaum", "schleifen"].every(key => !(key in o));
}
/** Ohne gewählten Stil nimmt ein Haus das Paket seines Settings; ein gewählter Stil — der seiner Stadt — gilt. */
const hausStil = (setting: KartenSetting): KartenStil => setting === "fantasy" ? "grundriss" : "zeitwelten";

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
  const campaigns = createCampaigns(db), now = cfg.now ?? Date.now;

  const erzeuge = (input: GrundrissRequest) => {
    // Die Verzweigung ist die ganze Erweiterung: `erzeugeHoehle` war gebaut, geprueft und aus dem
    // Fass exportiert — und unerreichbar, genau wie `erzeugeGrundriss` es einmal war.
    const auftrag = { keim: input.keim, titel: input.name };
    validateKartenOptionen(input.art ?? "grundriss", input.optionen);
    return input.art === "hoehle"
      ? erzeugeHoehle({ ...auftrag, ...(input.optionen ? { optionen: input.optionen as Partial<HoehleOptionen> } : {}) }, paket(input.stil))
      : input.art === "siedlung"
        ? input.optionen && "anlage" in input.optionen ? erzeugeAnlage({ ...auftrag, optionen: input.optionen as Partial<AnlageOptionen> }, paket(input.stil))
        : erzeugeSiedlung({ ...auftrag, ...(input.optionen ? { optionen: input.optionen as Partial<SiedlungOptionen> } : {}) }, paket(input.stil))
        : input.art === "region"
          ? erzeugeRegion({ ...auftrag, ...(input.optionen ? { optionen: input.optionen as Partial<RegionOptionen> } : {}) }, paket(input.stil))
          : erzeugeGrundriss({ ...auftrag, ...(input.optionen ? { optionen: input.optionen as Partial<GrundrissOptionen> } : {}) }, paket(input.stil));
  };
  /** Ein Haus liefert sein Erdgeschoss als die Karte, die man betritt; die übrigen Geschosse hängen daran. */
  const erzeugeKarte = (input: GrundrissRequest, lage?: HausLage): { grundriss: ReturnType<typeof erzeuge>; haus: Haus | null; stil: KartenStil } => {
    if (!wirdHaus(input.art, input.optionen)) return { grundriss: erzeuge(input), haus: null, stil: input.stil ?? "grundriss" };
    validateKartenOptionen("grundriss", input.optionen);
    const o = input.optionen as Partial<GrundrissOptionen>, setting = o.setting ?? "fantasy", stil = input.stil ?? hausStil(setting);
    const auftrag: HausAuftrag = { keim: input.keim, titel: input.name, profil: o.profil as BauwerkTyp, setting,
      ...(o.zellgroesse !== undefined ? { zellgroesse: o.zellgroesse } : {}), ...(o.moeblierung !== undefined ? { moeblierung: o.moeblierung } : {}),
      ...(o.licht !== undefined ? { licht: o.licht } : {}), ...(lage?.umriss ? { umriss: lage.umriss } : {}), ...(lage?.strasse ? { strasse: lage.strasse } : {}) };
    const haus = erzeugeHaus(auftrag, paket(stil));
    return { grundriss: haus.geschosse.find(g => g.stufe === 0)!.grundriss, haus, stil };
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

  const kartografie = (ergebnis: ReturnType<typeof erzeuge>) => {
    if ("cartography" in ergebnis) return parseTacticalCartography(ergebnis.cartography, ergebnis.karte);
    const inferred = inferLegacyCartography(ergebnis.karte, { nodes: ergebnis.knoten });
    return parseTacticalCartography({ ...inferred, regions: inferred.regions.map(region => ({ ...region, provenance: ergebnis.keim })) }, ergebnis.karte);
  };

  return {
    /** The surface receives the exact generator defaults and the locally available styles. */
    defaults() {
      return { grundriss: GRUNDRISS_STANDARD, hoehle: HOEHLE_STANDARD, siedlung: SIEDLUNG_STANDARD, region: REGION_STANDARD,
        siedlungsarten: { weiler: siedlungStandard("weiler"), dorf: siedlungStandard("dorf"), stadt: siedlungStandard("stadt") },
        // Eine Fantasy-Stadt aus Vierteln hat eine andere Vorgabe als eine Stadt der Gegenwart; die
        // Oberfläche nennt je Setting die Zahl, die hier wirklich gebaut wird.
        siedlungsartenJeSetting: Object.fromEntries(KARTEN_SETTINGS.map(s => [s, { weiler: siedlungStandard("weiler", s), dorf: siedlungStandard("dorf", s), stadt: siedlungStandard("stadt", s) }])) as Record<KartenSetting, Record<"weiler" | "dorf" | "stadt", ReturnType<typeof siedlungStandard>>>,
        strassenplanung: 1, siedlungsplanung: 1, gebaeude: BAUWERK_AUSDEHNUNG, anlagen: ANLAGE_STANDARD,
        stile: [{ id: "grundriss", titel: "Grundriss" }, { id: "gemalt", titel: "Gemalt" }, { id: "zeitwelten", titel: "Zeitwelten" }, { id: "genres", titel: "Genre-Archiv" }],
        limits: { grundriss: GRUNDRISS_LIMITS, hoehle: HOEHLE_LIMITS, siedlung: SIEDLUNG_LIMITS, region: REGION_LIMITS } };
    },

    /** Generate without persisting: the GM sees the room count and the seed before committing. */
    async preview(userId: string, campaignId: string, input: GrundrissRequest) {
      await campaigns.requireMember(userId, campaignId, ["leitung"]);
      const { grundriss, haus, stil } = erzeugeKarte(input);
      return {
        keimHash: grundriss.keim.keimHash,
        generator: { id: grundriss.erzeuger, version: grundriss.version },
        wurzelId: grundriss.wurzelId as string,
        art: grundriss.art,
        stil,
        // Die Vorschau zeigt das Erdgeschoss; die Zahl nennt, was beim Speichern mit entsteht.
        ...(haus ? { geschosse: haus.geschosse.map(g => ({ stufe: g.stufe, name: g.name, raeume: g.grundriss.raeume.length })) } : {}),
        setting: setting(grundriss),
        bericht: grundriss.bericht,
        ...(grundriss.art === "siedlung" ? { bauwerke: grundriss.bauwerke.length, strassen: grundriss.strassen.length } : grundriss.art === "region" ? { orte: grundriss.orte.length, strassen: grundriss.strassen.length } : { raeume: grundriss.raeume.length }),
        knoten: grundriss.knoten.length,
        groesse: grundriss.karte.geometry.size,
        document: grundriss.karte,
        cartography: kartografie(grundriss),
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
    async generate(userId: string, campaignId: string, input: GrundrissRequest, lage?: HausLage) {
      await campaigns.requireMember(userId, campaignId, ["leitung"]);
      const { grundriss, haus, stil } = erzeugeKarte(input, lage);
      if ("verkehr" in grundriss.bericht && grundriss.bericht.verkehr && (grundriss.bericht.verkehr.invalidNodes.length || grundriss.bericht.verkehr.unreachableNodes.length || grundriss.bericht.verkehr.routes.some(r => r.status !== "gebaut")))
        throw new TacticalValidationError("Der Straßenplan ist noch nicht ausführbar. Korrigiere die markierten Verbindungen oder Wegpunkte vor dem Speichern.");
      return db.transaction(async tx => {
        const tactical = createTactical(tx, cfg);
        const ack = await tactical.importMap(userId, campaignId, {
          commandId: input.commandId,
          name: input.name,
          format: "native",
          sourceText: serializeTacticalMapDocument(grundriss.karte),
          provenance: herkunft(grundriss, stil),
        }, { cartography: kartografie(grundriss), nodes: grundriss.knoten });
        if (haus && haus.geschosse.length > 1) {
          // Jedes weitere Geschoss ist eine gewöhnliche Karte im selben Rahmen, und der Verband ist
          // derselbe, den das Kartenstudio von Hand anlegt: Treppen sind dort Übergänge.
          const karten = new Map<number, string>([[0, ack.subjectId]]);
          for (const g of haus.geschosse) if (g.stufe !== 0) {
            const floor = await tactical.importMap(userId, campaignId, {
              commandId: createHash("sha256").update(`haus-geschoss:${input.commandId}:${g.stufe}`).digest("hex"),
              name: `${input.name.trim().slice(0, 140)} · ${g.name}`, format: "native",
              sourceText: serializeTacticalMapDocument(g.grundriss.karte), provenance: herkunft(g.grundriss, stil),
            }, { cartography: kartografie(g.grundriss), nodes: g.grundriss.knoten });
            karten.set(g.stufe, floor.subjectId);
          }
          // Eine wiederholte Anfrage findet ihren Verband schon vor und legt keinen zweiten an.
          if (!(await floorStackFor(tx, campaignId, ack.subjectId))) {
            const stack: MapFloorStack = { schemaVersion: 1, rootMapId: ack.subjectId,
              floors: haus.geschosse.map(g => ({ mapId: karten.get(g.stufe)!, level: g.stufe, name: g.name })),
              links: haus.treppen.map(t => ({ id: t.id, name: t.name, kind: t.kind, fromMapId: karten.get(t.vonStufe)!, toMapId: karten.get(t.nachStufe)!,
                fromRegionId: t.vonRaum, toRegionId: t.nachRaum, position: t.position })) };
            await insertFloorStack(tx, campaignId, userId, stack, now());
          }
        }
        return {
          ack,
          keimHash: grundriss.keim.keimHash,
          wurzelId: grundriss.wurzelId as string,
          bericht: grundriss.bericht,
          ...(haus ? { geschosse: haus.geschosse.length } : {}),
        };
      });
    },
  };
}
