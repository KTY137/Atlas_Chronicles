// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { describe, expect, it } from "vitest";
import { balkenFuerRunde, karteFuerLeitung, karteFuerRunde, vorgabeSicht, wortstufe, zehntel, type KartenQuelle, type VitalStand } from "../src/index.ts";

// Die Projektion ist die ganze Sichtregel des Kampftischs. Was hier nicht steht, erreicht die
// Runde nicht — deshalb prüft diese Datei vor allem, was FEHLT.
const leben: VitalStand = { id: "hp", label: "Leben", wert: 9, hoechst: 14, depletion: "defeat" };
const mana: VitalStand = { id: "mana", label: "Mana", wert: 22, hoechst: 30, depletion: "none" };
const quelle = (teil: Partial<KartenQuelle> = {}): KartenQuelle => ({
  id: "k1", name: "Graf Veyl", nameFuerRunde: null, seite: "gegner", lage: "feld", actorId: "a1", initiative: 17, ordnung: 3,
  initiativeRollId: "wurf-1", amZug: false, sicht: vorgabeSicht("gegner"), vomKampfAngelegt: true, version: 2, bogenVersion: 4,
  vitals: [leben, mana], zustaende: [{ id: "blutend", name: "Blutend" }], bild: { version: 2 }, aufgebraucht: false, ...teil,
});
const niemand = new Set<string>();

describe("Wortstufen und Zehntel", () => {
  it.each([[0, 10, "leer"], [-3, 10, "leer"], [0.1, 10, "knapp"], [4.9, 10, "knapp"], [5, 10, "gut"], [9.99, 10, "gut"], [10, 10, "voll"], [12, 10, "voll"], [1, 0, "voll"], [0, 0, "leer"]] as const)(
    "wortstufe(%s, %s) = %s", (wert, hoechst, stufe) => expect(wortstufe(wert, hoechst)).toBe(stufe));
  it.each([[0, 10, 0], [0.01, 10, 1], [0.4, 10, 1], [5, 10, 5], [9.6, 10, 9], [9.99, 10, 9], [10, 10, 10], [11, 10, 10], [3, 0, 10]] as const)(
    "zehntel(%s, %s) = %s", (wert, hoechst, z) => expect(zehntel(wert, hoechst)).toBe(z));
});

describe("Ein Balken für die Runde", () => {
  it("trägt je Anzeige nur, was diese Anzeige braucht", () => {
    expect(balkenFuerRunde(leben, "genau")).toEqual({ id: "hp", label: "Leben", art: "leben", anzeige: "genau", wert: 9, hoechst: 14 });
    expect(balkenFuerRunde(leben, "fuellstand")).toEqual({ id: "hp", label: "Leben", art: "leben", anzeige: "fuellstand", zehntel: 6 });
    expect(balkenFuerRunde(mana, "worte")).toEqual({ id: "mana", label: "Mana", art: "vorrat", anzeige: "worte", stufe: "gut" });
    expect(balkenFuerRunde(leben, "verborgen")).toBeNull();
  });
});

describe("Eine Karte für die Runde", () => {
  it("lässt Hand und Ablage ganz weg", () => {
    expect(karteFuerRunde(quelle({ lage: "hand" }), niemand)).toBeNull();
    expect(karteFuerRunde(quelle({ lage: "ablage" }), niemand)).toBeNull();
  });

  it("trägt keine Ordnung, keine Einstellungen, keinen Beleg und keine fremde Figur", () => {
    const karte = karteFuerRunde(quelle(), niemand)!;
    expect(Object.keys(karte).sort()).toEqual(["amZug", "balken", "bild", "eigene", "gewuerfelt", "id", "initiative", "lage", "name", "seite", "zustaende"]);
    expect(karte.gewuerfelt).toBe(true);
  });

  it("ersetzt den Namen und versteckt Bild und Zustände nach Einstellung", () => {
    const karte = karteFuerRunde(quelle({ nameFuerRunde: "Vermummte Gestalt", sicht: { ...vorgabeSicht("gegner"), bild: false, zustaende: false } }), niemand)!;
    expect(karte).toMatchObject({ name: "Vermummte Gestalt", bild: null, zustaende: [] });
    expect(JSON.stringify(karte)).not.toContain("Graf Veyl");
  });

  it("nimmt für Balken ohne eigene Einstellung den Standard — auch nach einem Paketwechsel", () => {
    // `mana` hat keinen Eintrag, `alt` gibt es im Paket nicht mehr: weder bricht etwas, noch wird etwas offen.
    const sicht = { schema: 1 as const, standard: "verborgen" as const, balken: { hp: "fuellstand" as const, alt: "genau" as const }, zustaende: true, bild: true };
    expect(karteFuerRunde(quelle({ sicht }), niemand)!.balken).toEqual([{ id: "hp", label: "Leben", art: "leben", anzeige: "fuellstand", zehntel: 6 }]);
  });

  it("zeigt die eigene Figur genau und mit echtem Namen, auch wenn die Spielleitung sie verkleidet", () => {
    const sicht = { ...vorgabeSicht("gegner"), standard: "verborgen" as const, bild: false, zustaende: false };
    const verkleidet = quelle({ nameFuerRunde: "Die Fremde", sicht });
    const eigene = karteFuerRunde(verkleidet, new Set(["a1"]))!;
    expect(eigene).toMatchObject({ eigene: true, name: "Graf Veyl", actorId: "a1", bogenVersion: 4, bild: { version: 2 } });
    expect(eigene.balken.map(b => b.anzeige)).toEqual(["genau", "genau"]);
    expect(karteFuerRunde(verkleidet, new Set(["jemand-anders"]))).toMatchObject({ eigene: false, name: "Die Fremde", balken: [], bild: null });
  });
});

describe("Eine Karte für die Spielleitung", () => {
  it("liest an jedem Balken mit, was die Runde bekommt", () => {
    const karte = karteFuerLeitung(quelle({ sicht: { ...vorgabeSicht("gegner"), balken: { mana: "verborgen" } } }));
    expect(karte.balken).toEqual([
      { id: "hp", label: "Leben", wert: 9, hoechst: 14, art: "leben", maske: "worte", fuerRunde: { id: "hp", label: "Leben", art: "leben", anzeige: "worte", stufe: "gut" } },
      { id: "mana", label: "Mana", wert: 22, hoechst: 30, art: "vorrat", maske: "verborgen", fuerRunde: null },
    ]);
    expect(karte).toMatchObject({ ordnung: 3, initiativeRollId: "wurf-1", gewuerfelt: true, vomKampfAngelegt: true, version: 2 });
  });
});
