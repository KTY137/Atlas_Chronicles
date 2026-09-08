// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
//
// Paket P7 (Chronist und Kanal). Der Katalog kommt über denselben `import.meta.glob`-Lader
// wie in der Anwendung; geprüft werden Stichproben aus allen Sorten von Fundstellen:
// gewöhnliches `t("…")`, Platzhalter, eine Etikettentabelle, eine Zahl über `locale()` und
// ein Fehlersatz, der über einen Datencode nachgeschlagen wird.
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { locale, setzeEnglischeQuelleFuerTests, setzeSprache, t } from "../src/i18n.ts";
import { chronistReason } from "../src/features/chronist-api.ts";
import { CHRONIST_TASK_LABEL, VORSCHLAG_ART_LABEL, chronistCost, chronistNumber } from "../src/features/chronist-model.ts";
import { LIVE_STATUS_LABEL } from "../src/features/useCampaignLive.ts";

const stichproben = () => ({
  ueberschrift: t("Der Chronist"),
  aufgabe: t(CHRONIST_TASK_LABEL.prosa.titel),
  art: t(VORSCHLAG_ART_LABEL.luecke),
  verbindung: t(LIVE_STATUS_LABEL.connected),
  freigabe: chronistReason("freigabe-expired"),
  unbekannt: chronistReason("gibt-es-nicht"),
  kosten: chronistCost(null, "EUR"),
  zahl: chronistNumber(1234),
  consent: t("Ich gebe diese {anzahl} Passagen und den angezeigten Umfang für diesen Lauf an {anbieter} ({modell}) frei.",
    { anzahl: 3, anbieter: "Ollama", modell: "llama" }),
});

describe("Sprachpaket P7 — Chronist und Kanal", () => {
  beforeEach(async () => { setzeEnglischeQuelleFuerTests(null); await setzeSprache("de"); });
  afterAll(async () => { setzeEnglischeQuelleFuerTests(null); await setzeSprache("de"); });

  it("liefert die Stichproben auf Englisch, sobald der Katalog geladen ist", async () => {
    await setzeSprache("en");
    expect(locale()).toBe("en-GB");
    expect(stichproben()).toEqual({
      ueberschrift: "The Chronicler",
      aufgabe: "Review the wiki",
      art: "Open dating",
      verbindung: "Live connected",
      freigabe: "Your consent for external processing has expired. Create the preview again and consent to the displayed scope once more.",
      unbekannt: "The analysis was interrupted. Check the run status and try the offered action again.",
      kosten: "Cost unknown",
      zahl: "1,234",
      consent: "I consent to these 3 passages and the displayed scope going to Ollama (llama) for this run.",
    });
  });

  it("bleibt auf Deutsch der Quelltext, mit deutscher Zahlschreibweise", async () => {
    await setzeSprache("en");
    await setzeSprache("de");
    expect(locale()).toBe("de-DE");
    expect(stichproben()).toEqual({
      ueberschrift: "Der Chronist",
      aufgabe: "Wiki durchsehen",
      art: "Offene Datierung",
      verbindung: "Live verbunden",
      freigabe: "Deine Freigabe für die externe Verarbeitung ist abgelaufen. Erstelle die Vorschau erneut und gib den angezeigten Umfang noch einmal frei.",
      unbekannt: "Die Auswertung wurde unterbrochen. Prüfe den Laufstand und versuche die angebotene Aktion erneut.",
      kosten: "Kosten unbekannt",
      zahl: "1.234",
      consent: "Ich gebe diese 3 Passagen und den angezeigten Umfang für diesen Lauf an Ollama (llama) frei.",
    });
  });

  it("gibt für einen fehlenden Code keine Freigabe-Meldung und für keinen Code gar nichts", async () => {
    await setzeSprache("en");
    expect(chronistReason(null)).toBe("");
  });
});
