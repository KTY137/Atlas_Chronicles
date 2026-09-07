import type { CanonicalValue } from "@chronicle/core";
import { describe, expect, it } from "vitest";
import { createCampaignBundleV2 } from "../src/campaign-bundle-v2.ts";
import { createCampaignBundleV5 } from "../src/native-v5/bundle.ts";
import { campaignFixtureV2 } from "./campaign-v2-fixture.ts";
import { campaignFixtureV5 } from "./campaign-v5-fixture.ts";
import { seal } from "./campaign-fixture.ts";

// Die Kartenfassung einer Gegenstandsvorlage ist Fassung 2 des Vertrags. Sie darf NUR dort
// durchkommen, wo das Profil sie kennt: der eingefrorene v2-Umschlag muss sie ablehnen, sonst
// enthielte ein altes Paket eine Fassung, die sein eigener Leser nicht versteht.
const karte = (ueberschreibung: Record<string, unknown> = {}) => ({
  schemaVersion: 2, name: "Laterne des Kartografen", loreEntryId: "entry", tags: ["licht"],
  seltenheit: "selten", kategorie: "Werkzeug", bildAssetId: null,
  spruch: "Sie brennt auch dort, wo es nichts zu sehen gibt.",
  zeilen: [{ label: "Gewicht", wert: "1 Pfund" }, { label: "Wert", wert: "40 Silber" }],
  ...ueberschreibung,
});

/** Setzt die Gegenstandsdefinition samt Hash — und im Ereignis dieselbe, sonst weichen sie ab. */
function mitDefinition<T extends { tables: Record<string, Record<string, CanonicalValue>[]> }>(daten: T, definition: unknown): T {
  const wert = definition as CanonicalValue;
  daten.tables.item_template_revisions![0]!.definition = wert;
  daten.tables.item_template_revisions![0]!.content_hash = seal(definition);
  // Das Ereignis traegt die Definition ZWEIMAL — in `result` und in `after_state`. Nach dem
  // tiefen Kopieren der Vorlage sind das zwei Objekte; nur eines zu setzen laesst den Pruefer
  // zu Recht anschlagen.
  for (const ereignis of daten.tables.actor_inventory_events!) {
    if (!String(ereignis.operation).startsWith("item.")) continue;
    for (const feld of ["result", "after_state", "before_state"] as const) {
      const zustand = ereignis[feld] as Record<string, CanonicalValue> | null;
      if (zustand && "definition" in zustand) zustand.definition = wert;
    }
  }
  return daten;
}

describe("Die Lootkarte als Fassung 2 der Gegenstandsvorlage", () => {
  it("kommt durch den aktuellen Umschlag", () => {
    const bundle = createCampaignBundleV5(mitDefinition(campaignFixtureV5(), karte()));
    const gespeichert = bundle.tables.item_template_revisions[0]!.definition as Record<string, unknown>;
    expect(gespeichert.seltenheit).toBe("selten");
    expect(gespeichert.spruch).toContain("nichts zu sehen");
    expect((gespeichert.zeilen as unknown[]).length).toBe(2);
  });

  it("wird vom eingefrorenen Umschlag abgewiesen", () => {
    // Das ist der Kern: v2 ist eingefroren und kennt nur Fassung 1. Ihn nachtraeglich zu
    // oeffnen waere die stille Umdeutung, gegen die unveraenderliche Revisionen stehen.
    expect(() => createCampaignBundleV2(mitDefinition(campaignFixtureV2(), karte()))).toThrow(/definition/);
  });

  it("laesst Fassung 1 unveraendert gelten", () => {
    // Nicht-Rueckwirkung: eine Vorlage von vorgestern bleibt lesbar, ohne umgeschrieben zu werden.
    const alt = { schemaVersion: 1, name: "Laterne", loreEntryId: "entry", tags: ["licht"] };
    const bundle = createCampaignBundleV5(mitDefinition(campaignFixtureV5(), alt));
    expect((bundle.tables.item_template_revisions[0]!.definition as Record<string, unknown>).schemaVersion).toBe(1);
  });

  it("weist eine erfundene Seltenheit ab — sie haette keinen Rahmen", () => {
    expect(() => createCampaignBundleV5(mitDefinition(campaignFixtureV5(), karte({ seltenheit: "goettlich" })))).toThrow(/rarity/);
  });

  it("weist zusaetzliche Eigenschaften und zu lange Angaben ab", () => {
    expect(() => createCampaignBundleV5(mitDefinition(campaignFixtureV5(), karte({ angriff: 12 })))).toThrow(/unsupported|definition/);
    expect(() => createCampaignBundleV5(mitDefinition(campaignFixtureV5(), karte({ spruch: "x".repeat(601) })))).toThrow(/spruch/);
    expect(() => createCampaignBundleV5(mitDefinition(campaignFixtureV5(), karte({ kategorie: "x".repeat(81) })))).toThrow(/kategorie/);
  });

  it("begrenzt die freien Zeilen der Karte", () => {
    const viele = Array.from({ length: 9 }, (_, i) => ({ label: `L${i}`, wert: "1" }));
    expect(() => createCampaignBundleV5(mitDefinition(campaignFixtureV5(), karte({ zeilen: viele })))).toThrow(/zeilen/);
    expect(() => createCampaignBundleV5(mitDefinition(campaignFixtureV5(), karte({ zeilen: [{ label: "L", wert: "1", extra: 2 }] })))).toThrow(/zeilen/);
  });
});
