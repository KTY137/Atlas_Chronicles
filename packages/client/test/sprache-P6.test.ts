// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
//
// Paket P6 — Wiki, Lesen, Import, Veröffentlichung. Der Katalog wird aus den echten
// JSON-Dateien geladen, nicht aus einer Kopie im Test: eine umformulierte deutsche Zeile
// oder eine gelöschte Übersetzung fällt hier auf, nicht erst in der Oberfläche.
import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it } from "vitest";
import { plural, setzeEnglischeQuelleFuerTests, setzeSprache, t } from "../src/i18n.ts";
import { artTitel } from "../src/features/wiki-navigation-model.ts";

const lies = (pfad: string) => JSON.parse(readFileSync(new URL(pfad, import.meta.url), "utf8")) as Record<string, never>;
const KATALOG = { texte: lies("../src/i18n/en/P6.json"), plural: lies("../src/i18n/en.plural.json") };

describe("Sprachpaket P6 — Wiki, Lesen, Import, Veröffentlichung", () => {
  beforeEach(async () => { setzeEnglischeQuelleFuerTests(async () => KATALOG); await setzeSprache("de"); });

  it("übersetzt Stichproben aus allen Ecken des Pakets ins Englische", async () => {
    await setzeSprache("en");
    expect(t("Wiki importieren")).toBe("Import wiki");                       // Wiki.tsx
    expect(t("Geschichten mit Herkunft.")).toBe("Stories with provenance."); // ImportView.tsx
    expect(t("Der Bestand")).toBe("The collection");                         // WikiMedien.tsx
    expect(t("Neu für dich")).toBe("New to you");                            // Reader.tsx
    expect(t("Veröffentlichung")).toBe("Publication");                       // PublicationWorkbench.tsx
    expect(t("Herkunft ansehen")).toBe("View provenance");                   // PassageProvenance.tsx
  });

  it("füllt Platzhalter der englischen Fassung und zählt Dateien in beiden Formen", async () => {
    await setzeSprache("en");
    expect(t("Lizenzstatus von {name}", { name: "Bodin.jpg" })).toBe("Licence status of Bodin.jpg");
    expect(t("Seite {seite}", { seite: 305 })).toBe("Page 305");
    expect(plural(1, "{n} Datei holen", "{n} Dateien holen")).toBe("Fetch 1 file");
    expect(plural(7, "{n} Datei holen", "{n} Dateien holen")).toBe("Fetch 7 files");
  });

  it("übersetzt die Artenüberschriften der Navigation an ihrer Anzeigestelle", async () => {
    expect(artTitel("ort")).toBe("Orte");
    await setzeSprache("en");
    expect(artTitel("ort")).toBe("Places");
    expect(artTitel("charakter")).toBe("Characters");
    // Eine unbekannte Art bleibt „Sonstiges", auch übersetzt.
    expect(artTitel("gibt-es-nicht")).toBe("Other");
  });

  it("liefert auf Deutsch wieder den Quelltext, samt Platzhaltern und Pluralformen", async () => {
    await setzeSprache("en");
    await setzeSprache("de");
    expect(t("Wiki importieren")).toBe("Wiki importieren");
    expect(t("Geschichten mit Herkunft.")).toBe("Geschichten mit Herkunft.");
    expect(t("Der Bestand")).toBe("Der Bestand");
    expect(t("Neu für dich")).toBe("Neu für dich");
    expect(t("Veröffentlichung")).toBe("Veröffentlichung");
    expect(t("Herkunft ansehen")).toBe("Herkunft ansehen");
    expect(t("Lizenzstatus von {name}", { name: "Bodin.jpg" })).toBe("Lizenzstatus von Bodin.jpg");
    expect(plural(1, "{n} Datei holen", "{n} Dateien holen")).toBe("1 Datei holen");
    expect(plural(7, "{n} Datei holen", "{n} Dateien holen")).toBe("7 Dateien holen");
    expect(artTitel("ort")).toBe("Orte");
  });
});
