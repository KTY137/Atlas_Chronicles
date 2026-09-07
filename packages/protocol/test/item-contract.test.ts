// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { Value } from "@sinclair/typebox/value";
import { describe, expect, it } from "vitest";
import { ItemContractV1, ItemContractV2, ItemContractAny, ItemTemplateCreate, LOOT_RARITIES, ErleichterungDraft } from "../src/index.ts";

// Der Gegenstandsvertrag ist die Tuer, durch die eine Lootkarte in die Welt kommt. Beide
// Fassungen muessen durch dieselbe Tuer passen — und nichts sonst.
const karte = (ueberschreibung: Record<string, unknown> = {}) => ({
  schemaVersion: 2, name: "Laterne des Kartografen", loreEntryId: null, tags: ["licht"],
  seltenheit: "selten", kategorie: "Werkzeug", bildAssetId: null,
  spruch: "Sie brennt auch dort, wo es nichts zu sehen gibt.",
  zeilen: [{ label: "Gewicht", wert: "1 Pfund" }],
  ...ueberschreibung,
});
const alt = { schemaVersion: 1, name: "Laterne", loreEntryId: null, tags: ["licht"] };
const fehler = (schema: Parameters<typeof Value.Errors>[0], wert: unknown) =>
  [...Value.Errors(schema, wert)].map(e => `${e.path}: ${e.message}`);

describe("Der Gegenstandsvertrag", () => {
  it("nimmt die Kartenfassung an", () => {
    expect(fehler(ItemContractV2, karte())).toEqual([]);
    expect(Value.Check(ItemContractV2, karte())).toBe(true);
  });

  it("nimmt beide Fassungen durch dieselbe Tür", () => {
    // Nicht-Rueckwirkung: eine Vorlage von vorgestern muss weiter gespeichert werden koennen.
    expect(Value.Check(ItemContractAny, alt)).toBe(true);
    expect(Value.Check(ItemContractAny, karte())).toBe(true);
    expect(Value.Check(ItemTemplateCreate, { commandId: "c1", definition: karte() })).toBe(true);
    expect(Value.Check(ItemTemplateCreate, { commandId: "c1", definition: alt })).toBe(true);
  });

  it("weist ab, was keine der beiden Fassungen ist", () => {
    // Eine erfundene Seltenheit haette keinen Rahmen; eine erfundene Eigenschaft keine Bedeutung.
    expect(Value.Check(ItemContractAny, karte({ seltenheit: "goettlich" }))).toBe(false);
    expect(Value.Check(ItemContractAny, karte({ angriff: 12 }))).toBe(false);
    expect(Value.Check(ItemContractAny, karte({ schemaVersion: 3 }))).toBe(false);
    // Eine Kartenfassung ohne Gesicht ist keine: die Felder sind Pflicht, nicht Kür.
    const { seltenheit: _weg, ...ohne } = karte();
    expect(Value.Check(ItemContractAny, ohne)).toBe(false);
  });

  it("kennt genau die fünf Seltenheiten, die die Karte zeichnen kann", () => {
    expect([...LOOT_RARITIES]).toEqual(["gewoehnlich", "ungewoehnlich", "selten", "episch", "legendaer"]);
    for (const stufe of LOOT_RARITIES) expect(Value.Check(ItemContractV2, karte({ seltenheit: stufe }))).toBe(true);
  });

  it("begrenzt Spruch, Art und Zeilen", () => {
    expect(Value.Check(ItemContractV2, karte({ spruch: "x".repeat(601) }))).toBe(false);
    expect(Value.Check(ItemContractV2, karte({ kategorie: "x".repeat(81) }))).toBe(false);
    expect(Value.Check(ItemContractV2, karte({ zeilen: Array.from({ length: 9 }, () => ({ label: "L", wert: "1" })) }))).toBe(false);
    expect(Value.Check(ItemContractV2, karte({ zeilen: [{ label: " ", wert: "1" }] }))).toBe(false);
  });

  it("laesst Fassung 1 unveraendert", () => {
    // Die alte Fassung darf durch die Erweiterung nicht strenger oder lockerer geworden sein.
    expect(Value.Check(ItemContractV1, alt)).toBe(true);
    expect(Value.Check(ItemContractV1, { ...alt, seltenheit: "selten" })).toBe(false);
  });

  it("verlangt für eine Erleichterung eine echte Begründung", () => {
    // Zweimal ist beim Schreiben ein Backslash im Muster verlorengegangen — und ein einfach
    // maskiertes S ist in TypeScript schlicht der Buchstabe S. Dieser Fall prüft deshalb die
    // WIRKUNG statt der Schreibweise: eine
    // Begründung aus Leerzeichen ist keine, und „Seil gesichert" muss durchkommen, obwohl kein
    // grosses S darin vorkommt.
    const entwurf = (grund: string) => ({ actorId: "a", gemeinteAktion: "skill_klettern", gewuerfelteAktion: "manual_ruling", eingaben: { target: 70 }, grund });
    expect(Value.Check(ErleichterungDraft, entwurf("Du hast das Seil vorher gesichert."))).toBe(true);
    expect(Value.Check(ErleichterungDraft, entwurf("weil"))).toBe(true);
    expect(Value.Check(ErleichterungDraft, entwurf("   "))).toBe(false);
    expect(Value.Check(ErleichterungDraft, entwurf(""))).toBe(false);
  });
});
