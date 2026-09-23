// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
//
// Paket P3 — Tisch, Woche, Kampf. Der deutsche Quelltext bleibt im Code; diese Datei prüft,
// dass genau dieser Quelltext den englischen Eintrag findet und dass die Rückkehr nach Deutsch
// wieder den Ursprungstext liefert. Geladen wird der echte Katalog `en/P3.json` — nicht ein
// Auszug davon —, damit ein umformulierter Satz hier auffällt und nicht erst im Betrieb.
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it } from "vitest";
import type { ItemContract } from "@chronicle/protocol";
import { plural, setzeEnglischeQuelleFuerTests, setzeSprache, t, locale, type PluralFormen } from "../src/i18n.ts";
import P3 from "../src/i18n/en/P3.json";
import PLURAL from "../src/i18n/en.plural.json";
import { Lootkarte } from "../src/features/Lootkarte";

const katalog = {
  texte: P3 as Record<string, string>,
  plural: PLURAL as unknown as Record<string, PluralFormen>,
};

const karte: ItemContract = {
  schemaVersion: 2, name: "Laterne des Kartografen", loreEntryId: null, tags: ["licht"],
  seltenheit: "episch", kategorie: "Werkzeug", bildAssetId: null, spruch: "", zeilen: [],
};
const ohneGesicht: ItemContract = { schemaVersion: 1, name: "Laterne", loreEntryId: null, tags: [] };
const zeige = (definition: ItemContract) =>
  renderToStaticMarkup(createElement(Lootkarte, { definition, campaignId: "kampagne" }));

describe("Sprachpaket P3 — Tisch, Woche, Kampf", () => {
  beforeEach(async () => { setzeEnglischeQuelleFuerTests(async () => katalog); await setzeSprache("de"); });

  it("liefert die deutschen Stichproben unverändert, solange Deutsch gewählt ist", () => {
    expect(locale()).toBe("de-DE");
    // WeekView, TableView, Kampftisch (siehe sprache-kampftisch.test.ts), Zeitstrahl, Geldzaehler.
    expect(t("Weltzeit und Postlaufzeit")).toBe("Weltzeit und Postlaufzeit");
    expect(t("Handelnde Figur")).toBe("Handelnde Figur");
    expect(t("Spieltag {tag}", { tag: "7" })).toBe("Spieltag 7");
    expect(t("Betrag in {waehrung}", { waehrung: "Silbertaler" })).toBe("Betrag in Silbertaler");
  });

  it("übersetzt dieselben Stichproben nach setzeSprache(\"en\")", async () => {
    await setzeSprache("en");
    expect(locale()).toBe("en-GB");
    expect(t("Weltzeit und Postlaufzeit")).toBe("World time and postal time");
    expect(t("Handelnde Figur")).toBe("Active character");
    expect(t("Spieltag {tag}", { tag: "7" })).toBe("Game day 7");
    expect(t("Betrag in {waehrung}", { waehrung: "Silbertaler" })).toBe("Amount in Silbertaler");
  });

  it("trägt die Pluralstellen beider Sprachen", async () => {
    expect(plural(1, "{n} Tag", "{n} Tage")).toBe("1 Tag");
    expect(plural(3, "{n} Passage ausgewählt", "{n} Passagen ausgewählt")).toBe("3 Passagen ausgewählt");
    expect(plural(1, "ein Punkt", "{n} Punkte")).toBe("ein Punkt");
    await setzeSprache("en");
    expect(plural(1, "{n} Tag", "{n} Tage")).toBe("1 day");
    expect(plural(3, "{n} Passage ausgewählt", "{n} Passagen ausgewählt")).toBe("3 passages selected");
    expect(plural(1, "ein Punkt", "{n} Punkte")).toBe("one point");
    expect(plural(4, "ein Punkt", "{n} Punkte")).toBe("4 points");
  });

  it("zeichnet die Lootkarte in beiden Sprachen und lässt das Wasserzeichen stehen", async () => {
    const deutsch = zeige(karte);
    expect(deutsch).toContain("Episch");
    expect(deutsch).toContain("Atlas Chronicles");
    expect(zeige(ohneGesicht)).toContain("noch kein Kartengesicht");
    await setzeSprache("en");
    const englisch = zeige(karte);
    expect(englisch).toContain("Epic");
    expect(englisch).not.toContain("Episch");
    // Der Produktname ist keine Oberfläche: er bleibt in jeder Sprache derselbe.
    expect(englisch).toContain("Atlas Chronicles");
    // Der Name des Gegenstands gehört der Runde und wird nicht übersetzt.
    expect(englisch).toContain("Laterne des Kartografen");
    expect(zeige(ohneGesicht)).toContain("This template has no card face yet.");
  });

  it("kehrt nach Deutsch zurück und liefert wieder den Quelltext", async () => {
    await setzeSprache("en");
    expect(t("Gewertete Würfel")).toBe("Counted dice");
    await setzeSprache("de");
    expect(t("Gewertete Würfel")).toBe("Gewertete Würfel");
    expect(zeige(karte)).toContain("Episch");
  });

  it("hält jeden Katalogeintrag für einen Text mit denselben Platzhaltern", () => {
    const platzhalter = (text: string) => [...text.matchAll(/\{([A-Za-z0-9_]+)\}/g)].map(treffer => treffer[1]).sort();
    for (const [schluessel, wert] of Object.entries(P3 as Record<string, string>)) {
      expect(typeof wert, schluessel).toBe("string");
      expect(wert.length, schluessel).toBeGreaterThan(0);
      expect(platzhalter(wert), schluessel).toEqual(platzhalter(schluessel));
    }
  });
});
