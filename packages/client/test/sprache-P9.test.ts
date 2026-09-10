// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
//
// Paket P9: das Aussehen. Die zwoelf Looks, die Kachelwand der Look-Auswahl und die
// Klartext-Fassung von „Deine Darstellung". Geprueft wird dieser Katalog — nicht der Lader
// (das tut `i18n.test.ts`): dass die Stichproben englisch herauskommen, dass sie auf Deutsch
// wortgleich dastehen, und vor allem, dass JEDER Look einen Alltagsnamen und einen erklaerten
// Satz hat. Genau das ist die bindende Regel des Auftraggebers: keine rohe Kennung sichtbar.
import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it } from "vitest";
import { THEME_PRESET_IDS } from "@chronicle/theme";
import { aktuelleSprache, setzeEnglischeQuelleFuerTests, setzeSprache, t } from "../src/i18n.ts";
import { LOOK_ERKLAERUNG_LABEL, LOOK_LABEL, LOOK_VORSCHAU } from "../src/features/look-namen.ts";

const lies = (pfad: string) => JSON.parse(readFileSync(new URL(pfad, import.meta.url), "utf8")) as Record<string, unknown>;
const P9 = lies("../src/i18n/en/P9.json");
const texte = Object.fromEntries(
  Object.entries(P9).filter(([schluessel, wert]) => !schluessel.startsWith("__") && typeof wert === "string"),
) as Record<string, string>;
const englisch = async () => { setzeEnglischeQuelleFuerTests(async () => ({ texte, plural: {} })); await setzeSprache("en"); };

describe("Sprachpaket P9 — das Aussehen", () => {
  beforeEach(async () => { setzeEnglischeQuelleFuerTests(null); await setzeSprache("de"); });

  it("gibt jedem der zwölf Looks einen Alltagsnamen und einen Satz — keine rohe Kennung", () => {
    for (const id of THEME_PRESET_IDS) {
      const name = LOOK_LABEL[id], satz = LOOK_ERKLAERUNG_LABEL[id];
      expect(name, `${id} ohne Namen`).toBeTruthy();
      expect(satz, `${id} ohne Erklärung`).toBeTruthy();
      // Der Name darf nicht die Kennung selbst sein — sonst steht der Jargon wieder da.
      // „Messing" ist die Ausnahme: der deutsche Alltagsname trifft zufällig die Kennung.
      if (id !== "Brass") expect(name).not.toBe(id);
      expect(satz.length).toBeGreaterThan(25);
      expect(satz.endsWith(".")).toBe(true);
    }
    expect(new Set(Object.values(LOOK_LABEL)).size).toBe(THEME_PRESET_IDS.length);
  });

  it("übersetzt jeden Looknamen und jede Erklärung ins Englische", async () => {
    await englisch();
    expect(aktuelleSprache()).toBe("en");
    for (const id of THEME_PRESET_IDS) {
      expect(texte, `${id}: Name ohne Katalogeintrag`).toHaveProperty(LOOK_LABEL[id]);
      expect(texte, `${id}: Erklärung ohne Katalogeintrag`).toHaveProperty(LOOK_ERKLAERUNG_LABEL[id]);
    }
    expect(t("Lagerfeuer")).toBe("Campfire");
    expect(t("Tageslicht")).toBe("Daylight");
    expect(t("Mit {name} beginnen", { name: "Polarlicht" })).toBe("Start from Polarlicht");
    expect(t("Gerade sichtbar: {look}.", { look: "Midnight" })).toBe("Currently showing: Midnight.");
  });

  it("bleibt ohne Katalog vollständig deutsch statt leer", () => {
    expect(t("Wie schmuckvoll?")).toBe("Wie schmuckvoll?");
    expect(t("Zierbilder ausblenden")).toBe("Zierbilder ausblenden");
    expect(t("Mit {name} beginnen", { name: "Messing" })).toBe("Mit Messing beginnen");
  });

  /** Die Kachel zeigt vier Farben. Ohne diese Zusicherung wäre eine leere Probe möglich,
   * und die Auswahl zeigte Namen statt Aussehen — also wieder das alte Aufklappmenü. */
  it("hält für jeden Look vier echte Farbproben und eine Hell/Dunkel-Angabe bereit", () => {
    expect(LOOK_VORSCHAU).toHaveLength(THEME_PRESET_IDS.length);
    for (const look of LOOK_VORSCHAU) {
      expect(look.proben).toHaveLength(4);
      for (const farbe of look.proben) expect(farbe).toMatch(/^#[0-9a-f]{6}$/i);
      expect(typeof look.hell).toBe("boolean");
    }
    const helle = LOOK_VORSCHAU.filter(look => look.hell).map(look => look.id);
    expect(helle).toEqual(["Medieval", "Parchment", "Dawn"]);
  });
});
