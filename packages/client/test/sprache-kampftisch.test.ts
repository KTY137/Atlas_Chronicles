// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { beforeEach, describe, expect, it } from "vitest";
import { setzeEnglischeQuelleFuerTests, setzeSprache, t, type PluralFormen } from "../src/i18n.ts";
import KAMPFTISCH from "../src/i18n/en/kampftisch.json";
import P3 from "../src/i18n/en/P3.json";
import PLURAL from "../src/i18n/en.plural.json";
import { MASKE_LABEL, WORT_LEBEN_LABEL } from "../src/features/kampftisch-model";

// Geladen wird der echte Katalog, nicht ein Auszug: ein umformulierter Satz fällt hier auf.
const katalog = { texte: { ...(P3 as Record<string, string>), ...(KAMPFTISCH as Record<string, string>) }, plural: PLURAL as unknown as Record<string, PluralFormen> };

describe("Sprachpaket Kampftisch", () => {
  beforeEach(async () => { setzeEnglischeQuelleFuerTests(async () => katalog); await setzeSprache("de"); });
  it("bleibt deutsch, solange Deutsch gewählt ist", () => {
    expect(t("Der Kampftisch")).toBe("Der Kampftisch");
    expect(t(MASKE_LABEL.worte)).toBe("In Worten");
  });
  it("übersetzt nach Englisch", async () => {
    await setzeSprache("en");
    expect(t("Der Kampftisch")).toBe("The combat table");
    expect(t(MASKE_LABEL.worte)).toBe("In words");
    expect(t(WORT_LEBEN_LABEL.knapp)).toBe("badly hurt");
    expect(t("etwa {n} von 10", { n: 6 })).toBe("about 6 of 10");
  });
});
