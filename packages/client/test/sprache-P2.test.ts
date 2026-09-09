// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
//
// Paket P2 — Figuren, Bogen, Werkbänke, Gefüge, Formeln. Der deutsche Quelltext bleibt im
// Code; diese Datei prüft, dass genau dieser Quelltext den englischen Eintrag findet und dass
// die Rückkehr nach Deutsch wieder den Ursprungstext liefert. Geladen wird der echte Katalog
// `en/P2.json` — nicht ein Auszug davon —, damit ein umformulierter Satz hier auffällt und
// nicht erst im Betrieb.
import { beforeEach, describe, expect, it } from "vitest";
import { plural, setzeEnglischeQuelleFuerTests, setzeSprache, t, locale, type PluralFormen } from "../src/i18n.ts";
import P2 from "../src/i18n/en/P2.json";
import PLURAL from "../src/i18n/en.plural.json";

const katalog = {
  texte: P2 as Record<string, string>,
  plural: PLURAL as unknown as Record<string, PluralFormen>,
};

describe("Sprachpaket P2 — Figuren, Werkbänke, Gefüge", () => {
  beforeEach(async () => { setzeEnglischeQuelleFuerTests(async () => katalog); await setzeSprache("de"); });

  it("liefert die deutschen Stichproben unverändert, solange Deutsch gewählt ist", () => {
    expect(locale()).toBe("de-DE");
    // FigurAntrag, MeineFigur, CharacterSheet, ActorWorkbench, ForgeWorkbench, Gefuege.
    expect(t("Deine eigene Figur")).toBe("Deine eigene Figur");
    expect(t("Bogen speichern")).toBe("Bogen speichern");
    expect(t("Inventar · {name}", { name: "Sera" })).toBe("Inventar · Sera");
    expect(t("Vorrat der Spielleitung")).toBe("Vorrat der Spielleitung");
    expect(t("Das Gefüge")).toBe("Das Gefüge");
  });

  it("übersetzt dieselben Stichproben nach setzeSprache(\"en\")", async () => {
    await setzeSprache("en");
    expect(locale()).toBe("en-GB");
    expect(t("Deine eigene Figur")).toBe("Your own character");
    expect(t("Bogen speichern")).toBe("Save the sheet");
    // Der Name der Figur gehört der Runde und wird nicht übersetzt; nur der Rahmen ist Oberfläche.
    expect(t("Inventar · {name}", { name: "Sera" })).toBe("Inventory · Sera");
    expect(t("Vorrat der Spielleitung")).toBe("GM stash");
    expect(t("Das Gefüge")).toBe("The Web of Relations");
  });

  it("trägt die Anzeigetexte der Etikettentabellen in beiden Sprachen", async () => {
    // `t(HTBAH_GROUP_LABELS[gruppe])` und `t(FIGURENART_LABEL[art])` schlagen den deutschen
    // Anzeigetext nach; die gespeicherte Art bleibt der Datenschlüssel.
    expect(t("Handeln")).toBe("Handeln");
    expect(t("Spielerfigur")).toBe("Spielerfigur");
    await setzeSprache("en");
    expect(t("Handeln")).toBe("Action");
    expect(t("Spielerfigur")).toBe("Player character");
    expect(t("Elternteil von")).toBe("Parent of");
  });

  it("trägt die Pluralstellen der Beuteübergabe in beiden Sprachen", async () => {
    expect(plural(1, "{n} Stück übergeben", "{n} Stücke übergeben")).toBe("1 Stück übergeben");
    expect(plural(3, "{n} Stück an {ziel} übergeben", "{n} Stücke an {ziel} übergeben", { ziel: "Sera" }))
      .toBe("3 Stücke an Sera übergeben");
    await setzeSprache("en");
    expect(plural(1, "{n} Stück übergeben", "{n} Stücke übergeben")).toBe("1 item handed over");
    expect(plural(3, "{n} Stück an {ziel} übergeben", "{n} Stücke an {ziel} übergeben", { ziel: "Sera" }))
      .toBe("Hand 3 items to Sera");
  });

  it("kehrt nach Deutsch zurück und liefert wieder den Quelltext", async () => {
    await setzeSprache("en");
    expect(t("Noch führst du keine Figur.")).toBe("You do not play a character yet.");
    await setzeSprache("de");
    expect(t("Noch führst du keine Figur.")).toBe("Noch führst du keine Figur.");
  });

  it("hält jeden Katalogeintrag für einen Text mit denselben Platzhaltern", () => {
    const platzhalter = (text: string) => [...text.matchAll(/\{([A-Za-z0-9_]+)\}/g)].map(treffer => treffer[1]).sort();
    for (const [schluessel, wert] of Object.entries(P2 as Record<string, string>)) {
      expect(typeof wert, schluessel).toBe("string");
      expect(wert.length, schluessel).toBeGreaterThan(0);
      expect(platzhalter(wert), schluessel).toEqual(platzhalter(schluessel));
    }
  });
});
