// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
//
// Paket P1 (Regelschmiede): der deutsche Quelltext bleibt im Code, `P1.json` liefert die
// englische Fassung. Geprüft wird beides — englisch nach `setzeSprache("en")`, deutsch
// danach wieder —, damit weder ein fehlender Eintrag noch ein verrutschter Rückweg
// unbemerkt bleibt. Eine Stichprobe läuft absichtlich durch echten Paketcode
// (`numberValue` aus `rule-forge-model.ts`) statt nur durch `t` selbst.
import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it } from "vitest";
import { aktuelleSprache, setzeEnglischeQuelleFuerTests, setzeSprache, t } from "../src/i18n.ts";
import { numberValue } from "../src/features/rule-forge-model.ts";

const KATALOG = JSON.parse(readFileSync(new URL("../src/i18n/en/P1.json", import.meta.url), "utf8")) as Record<string, string>;
const englisch = async () => {
  setzeEnglischeQuelleFuerTests(async () => ({ texte: KATALOG, plural: {} }));
  await setzeSprache("en");
};

/** Je eine Stichprobe aus jeder Datei des Pakets. */
const STICHPROBEN: [string, string][] = [
  ["Regelwerkstatt", "Rule Forge"],                                    // RuleForge.tsx
  ["Abgeleitete Werte", "Derived values"],                                // RuleDeclarativeEditor.tsx
  ["Testtafel", "Test bench"],                                          // RuleForgePreview.tsx
  ["Bitte Ja oder Nein auswählen.", "Please choose yes or no."],        // RuleFields.tsx
  ["Berechnete Werte", "Computed values"],                              // RuleComputedFields.tsx
];

describe("Sprachpaket P1 — Regelschmiede", () => {
  beforeEach(async () => { setzeEnglischeQuelleFuerTests(null); await setzeSprache("de"); });

  it("liefert die Stichproben auf Englisch, sobald der Katalog geladen ist", async () => {
    await englisch();
    expect(aktuelleSprache()).toBe("en");
    expect(STICHPROBEN.map(([de]) => t(de))).toEqual(STICHPROBEN.map(([, en]) => en));
  });

  it("gibt dieselben Stichproben nach der Rückkehr wieder deutsch aus", async () => {
    await englisch();
    await setzeSprache("de");
    expect(aktuelleSprache()).toBe("de");
    expect(STICHPROBEN.map(([de]) => t(de))).toEqual(STICHPROBEN.map(([de]) => de));
  });

  it("füllt die Platzhalter der englischen Fassung", async () => {
    expect(t("Paketstruktur, Feldtypen und Formeln gültig · {bestanden} von {gesamt} Pakettests bestanden.", { bestanden: 2, gesamt: 7 }))
      .toBe("Paketstruktur, Feldtypen und Formeln gültig · 2 von 7 Pakettests bestanden.");
    await englisch();
    expect(t("Paketstruktur, Feldtypen und Formeln gültig · {bestanden} von {gesamt} Pakettests bestanden.", { bestanden: 2, gesamt: 7 }))
      .toBe("Package structure, field types and formulas valid · 2 of 7 package tests passed.");
    expect(t("Für diese Runde ist jetzt {name} {version} aktiv.", { name: "Mein Regelwerk", version: "1.0.0" }))
      .toBe("Mein Regelwerk 1.0.0 is now active for this party.");
  });

  it("übersetzt auch die Fehlersätze aus rule-forge-model", async () => {
    expect(() => numberValue("", "Würfelanzahl")).toThrow("Würfelanzahl: Bitte eine Zahl eintragen.");
    await englisch();
    expect(() => numberValue("", t("Würfelanzahl"))).toThrow("Number of dice: Please enter a number.");
  });

  it("kennt zu jeder Stichprobe einen Katalogeintrag mit denselben Platzhaltern", () => {
    const platzhalter = (text: string) => [...new Set([...text.matchAll(/\{([A-Za-z0-9_]+)\}/g)].map(treffer => treffer[1]))].sort();
    for (const [schluessel, wert] of Object.entries(KATALOG)) {
      expect(typeof wert).toBe("string");
      expect(platzhalter(wert)).toEqual(platzhalter(schluessel));
    }
    expect(Object.keys(KATALOG).length).toBeGreaterThan(300);
  });
});
