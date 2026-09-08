// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
//
// Paket P8: Rahmen, Anmeldung, Konto, Bausteine — und die statischen Fehlersaetze des
// Servers. Geprueft wird nicht der Lader (das tut `i18n.test.ts`), sondern dieser Katalog:
// dass die Stichproben aus den P8-Dateien englisch herauskommen, dass sie auf Deutsch
// wieder wortgleich dastehen, und dass ein Serversatz seinen Weg durch `errorText` findet.
import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it } from "vitest";
import { Loading, registriereUebersetzer } from "../../ui/src/index.tsx";
import { ApiError, errorText } from "../src/api.ts";
import { aktuelleSprache, plural, setzeEnglischeQuelleFuerTests, setzeSprache, t } from "../src/i18n.ts";

const lies = (pfad: string) => JSON.parse(readFileSync(new URL(pfad, import.meta.url), "utf8")) as Record<string, unknown>;
const P8 = lies("../src/i18n/en/P8.json");
const PLURAL = lies("../src/i18n/en.plural.json");

const texte = Object.fromEntries(Object.entries(P8).filter(([schluessel, wert]) => !schluessel.startsWith("__") && typeof wert === "string")) as Record<string, string>;
const dynamisch = P8["__dynamisch"] as string[];
const katalog = { texte, plural: PLURAL as Record<string, { eins: string; viele: string }> };

/** Wie im Betrieb: Deutsch ist der Anfangszustand, der Katalog kommt auf Wunsch dazu. */
const englisch = async () => { setzeEnglischeQuelleFuerTests(async () => katalog); await setzeSprache("en"); };

describe("Sprachpaket P8 — Rahmen, Anmeldung, Konto", () => {
  beforeEach(async () => { setzeEnglischeQuelleFuerTests(null); await setzeSprache("de"); });

  it("uebersetzt die Stichproben aus App, Auth, Round, Konto und den Bausteinen", async () => {
    await englisch();
    expect(aktuelleSprache()).toBe("en");
    // App.tsx: Bereichsname und die Rueckfrage vor dem Verlassen einer Ansicht.
    expect(t("Heute")).toBe("Today");
    expect(t("Ungespeicherte Änderungen verwerfen?")).toBe("Discard unsaved changes?");
    // Auth.tsx
    expect(t("Mit Passkey anmelden")).toBe("Sign in with a passkey");
    // Account.tsx / AppearanceSettings.tsx
    expect(t("Deine Darstellung")).toBe("Your appearance");
    // packages/ui/src/index.tsx
    expect(t("Wird geladen …")).toBe("Loading …");
    // ErrorBoundary.tsx
    expect(t("Seite neu laden")).toBe("Reload the page");
  });

  it("setzt die Platzhalter der englischen Fassung", async () => {
    await englisch();
    expect(t("Gerät für {name} koppeln", { name: "Sera" })).toBe("Pair a device for Sera");
    expect(t("Vorlage {id}", { id: "Aurora" })).toBe("Template Aurora");
  });

  it("waehlt in Round.tsx beide Pluralformen", async () => {
    const eins = "Eine Person wartet vor der Tür auf deine Freigabe.";
    const viele = "{n} Personen warten vor der Tür auf deine Freigabe.";
    expect(plural(1, eins, viele)).toBe(eins);
    expect(plural(3, eins, viele)).toBe("3 Personen warten vor der Tür auf deine Freigabe.");
    await englisch();
    expect(plural(1, eins, viele)).toBe("One person is waiting at the door for your approval.");
    expect(plural(3, eins, viele)).toBe("3 people are waiting at the door for your approval.");
  });

  it("liefert einen statischen Serverfehlersatz ueber errorText englisch", async () => {
    const antwort = new ApiError(409, "Konflikt: Bitte den aktuellen Stand laden.");
    expect(errorText(antwort)).toBe("Konflikt: Bitte den aktuellen Stand laden.");
    await englisch();
    expect(errorText(antwort)).toBe("Conflict: please load the current state.");
    expect(errorText(new ApiError(404, "Nicht verfügbar"))).toBe("Not available");
    // Ein Satz, den der Server erst zur Laufzeit bildet, bleibt unveraendert stehen.
    expect(errorText(new ApiError(400, "Zeile 7: unbekannte Vorlage"))).toBe("Zeile 7: unbekannte Vorlage");
  });

  it("fuehrt jeden dynamischen Serversatz auch als uebersetzten Eintrag", () => {
    expect(dynamisch).toHaveLength(15);
    for (const satz of dynamisch) expect(texte[satz], satz).toBeTypeOf("string");
  });

  it("uebersetzt den Baustein `Loading` erst mit registriertem Uebersetzer", async () => {
    // `packages/ui` haengt nicht am Client: ohne Registrierung bleibt der Text deutsch,
    // auch wenn der Katalog laengst englisch ist.
    const ladetext = () => (Loading({}) as { props: { children: unknown[] } }).props.children[1];
    await englisch();
    expect(ladetext()).toBe("Wird geladen …");
    try {
      registriereUebersetzer(t);
      expect(ladetext()).toBe("Loading …");
      await setzeSprache("de");
      expect(ladetext()).toBe("Wird geladen …");
    } finally { registriereUebersetzer(text => text); }
  });

  it("laesst die Eigenbezeichnungen der Sprachauswahl unangetastet", () => {
    // „Deutsch" und „English" stehen in AppearanceSettings.tsx in ihrer eigenen Sprache.
    expect(texte).not.toHaveProperty("Deutsch");
    expect(texte).not.toHaveProperty("English");
  });

  it("kehrt auf Deutsch zurueck und liefert wieder den Quelltext", async () => {
    await englisch();
    await setzeSprache("de");
    expect(aktuelleSprache()).toBe("de");
    expect(t("Heute")).toBe("Heute");
    expect(t("Ungespeicherte Änderungen verwerfen?")).toBe("Ungespeicherte Änderungen verwerfen?");
    expect(t("Mit Passkey anmelden")).toBe("Mit Passkey anmelden");
    expect(t("Deine Darstellung")).toBe("Deine Darstellung");
    expect(t("Wird geladen …")).toBe("Wird geladen …");
    expect(t("Seite neu laden")).toBe("Seite neu laden");
    expect(errorText(new ApiError(409, "Konflikt: Bitte den aktuellen Stand laden."))).toBe("Konflikt: Bitte den aktuellen Stand laden.");
  });
});
