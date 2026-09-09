// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { describe, expect, it } from "vitest";
import { importiereEronKarte } from "@chronicle/forge";
import type { CanonicalValue } from "@chronicle/core";
import { createCampaignBundleV3 } from "../src/campaign-bundle-v3.ts";
import { upgradeCampaignBundleV3 } from "../src/native-v4/bundle.ts";
import { CAMPAIGN_V18_TABLES } from "../src/native-v18/schema.ts";
import { createCampaignBundleV19, parseCampaignBundleV19, serializeCampaignBundleV19, validateCampaignBundleV19 } from "../src/native-v19/bundle.ts";
import { CAMPAIGN_V19_TABLES, CAMPAIGN_V19_MODULES, emptyCampaignTablesV19, type CampaignTableNameV19 } from "../src/native-v19/schema.ts";
import { createCurrentCampaignBundle, currentCampaignSemanticDiff, parseCurrentCampaignBundle, serializeCurrentCampaignBundle } from "../src/native-v19/current.ts";
import { campaignFixtureV3 } from "./campaign-v3-fixture.ts";

type MutableRow = Record<string, CanonicalValue>;
const AT = "1788696000000";
/**
 * Eine echte, aber winzige Kartenquelle: dasselbe Format, das eine Fandom-Karte mitbringt, nur
 * ohne Marker. Genau die Form, die eine hochgeladene Inkarnate-Karte erzeugt — und schnell genug,
 * dass diese Suite den Bundle-Bau ein Dutzend Mal ertragen kann.
 */
const QUELLE = importiereEronKarte(JSON.stringify({ mapImage: "Andaria 03.02.2024.jpg",
  coordinateOrder: "xy", origin: "top-left", mapBounds: [[0, 0], [8192, 8192]], categories: [], markers: [] }));

/**
 * Die Kampagne aus dem gemeinsamen Fixture, dazu eine Karte, die weiß, woher sie kommt.
 *
 * Genau das war vorher unmöglich: die Herkunft der einen Karte stand im Quelltext, nicht in der
 * Kampagne — und eine Sicherung konnte sie deshalb weder mitnehmen noch zurückbringen.
 */
function fixture(mitHerkunft = true) {
  const legacy = upgradeCampaignBundleV3(createCampaignBundleV3(campaignFixtureV3(0))).bundle;
  const tables = JSON.parse(JSON.stringify({ ...emptyCampaignTablesV19(), ...legacy.tables })) as Record<CampaignTableNameV19, MutableRow[]>;
  const data = { campaignId: "campaign", universeId: "universe", exportedAt: legacy.manifest.exportedAt, tables };
  // Das gemeinsame Fixture kennt keine Weltkarte; hier bekommt es genau eine — echte, aus der
  // Beispielquelle abgeleitete —, damit die Herkunft auf etwas zeigen kann.
  const wert = (v: unknown) => JSON.parse(JSON.stringify(v)) as CanonicalValue;
  tables.artifacts = [{ id: "artefakt", campaign_id: "campaign", kind: "eron-map", source_hash: QUELLE.quelle.sha256,
    source: wert(QUELLE), report: wert(QUELLE.bericht), created_by: "gm", created_at: AT }];
  tables.atlas_maps = [{ id: "karte", campaign_id: "campaign", artifact_id: "artefakt",
    title: QUELLE.titel, width: 8192, height: 8192, version: 1, created_at: AT }];
  tables.atlas_nodes = QUELLE.knoten.map(node => ({ map_id: "karte", id: node.id, campaign_id: "campaign", data: wert(node), entry_id: null }));
  if (!mitHerkunft) return data;
  tables.atlas_karten_herkunft = [{ map_id: "karte", campaign_id: "campaign", art: "wiki",
    wiki_url: "https://eron.fandom.com/de/", seitentitel: "Karte:Andaria", pageid: "280", revid: "1149",
    bild_dateiname: "Andaria 03.02.2024.jpg", lizenz: "CC BY-SA 3.0", abgerufen_am: AT, geholt_von: "gm" }];
  return data;
}

describe("native v19 Kartenherkunft", () => {
  it("ergänzt V18 rein additiv um genau eine Tabelle und ein Modul", () => {
    const vorher = CAMPAIGN_V18_TABLES.map(table => table.name);
    const nachher = CAMPAIGN_V19_TABLES.map(table => table.name);
    expect(nachher.slice(0, vorher.length)).toEqual(vorher);
    expect(nachher.slice(vorher.length)).toEqual(["atlas_karten_herkunft"]);
    expect(CAMPAIGN_V19_MODULES[CAMPAIGN_V19_MODULES.length - 1]).toBe("kartenherkunft");
  });

  it("führt die Herkunft unverändert durch Sicherung und Wiederherstellung", () => {
    const data = fixture();
    const bundle = createCampaignBundleV19(data);
    expect(bundle.version).toBe(19);
    expect(bundle.manifest.kartenherkunftSchemaVersion).toBe(1);
    expect(bundle.manifest.modules.find(m => m.name === "kartenherkunft")).toMatchObject({ count: 1, version: 1 });
    const reopened = parseCampaignBundleV19(serializeCampaignBundleV19(bundle));
    expect(reopened.tables.atlas_karten_herkunft).toEqual(data.tables.atlas_karten_herkunft);
    expect(validateCampaignBundleV19(reopened).manifest.contentHash).toBe(bundle.manifest.contentHash);
    expect(currentCampaignSemanticDiff(bundle, reopened)).toEqual([]);
  });

  it("delegiert an V18, solange keine Karte ihre Herkunft mitschreibt", () => {
    const leer = createCurrentCampaignBundle(fixture(false));
    expect(leer.version).toBeLessThan(19);
    expect(parseCurrentCampaignBundle(serializeCurrentCampaignBundle(leer)).version).toBe(leer.version);
    expect(createCurrentCampaignBundle(fixture()).version).toBe(19);
  });

  it("weist eine erfundene Karte, eine halbe Wiki-Angabe und eine unbekannte Person ab", () => {
    const erfunden = fixture();
    erfunden.tables.atlas_karten_herkunft[0]!.map_id = "gibt-es-nicht";
    expect(() => createCampaignBundleV19(erfunden)).toThrow(/provenance map missing/);

    const halb = fixture();
    halb.tables.atlas_karten_herkunft[0]!.wiki_url = null;
    expect(() => createCampaignBundleV19(halb)).toThrow(/provenance wiki address/);

    const unsicher = fixture();
    unsicher.tables.atlas_karten_herkunft[0]!.wiki_url = "http://eron.fandom.com/de/";
    expect(() => createCampaignBundleV19(unsicher)).toThrow(/provenance address must be https/);

    const bildOhneBild = fixture();
    bildOhneBild.tables.atlas_karten_herkunft[0]! = { ...bildOhneBild.tables.atlas_karten_herkunft[0]!,
      art: "bild", wiki_url: null, seitentitel: null, bild_dateiname: null };
    expect(() => createCampaignBundleV19(bildOhneBild)).toThrow(/an image map needs its picture/);

    const fremd = fixture();
    fremd.tables.atlas_karten_herkunft[0]!.campaign_id = "andere";
    expect(() => createCampaignBundleV19(fremd)).toThrow(/provenance campaign/);

    const unbekannt = fixture();
    unbekannt.tables.atlas_karten_herkunft[0]!.geholt_von = "niemand";
    expect(() => createCampaignBundleV19(unbekannt)).toThrow(/kartenherkunft identity/);

    const doppelt = fixture();
    doppelt.tables.atlas_karten_herkunft.push({ ...doppelt.tables.atlas_karten_herkunft[0]! });
    expect(() => createCampaignBundleV19(doppelt)).toThrow(/duplicate primary key/);
  });
});
