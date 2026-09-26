// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { describe, expect, it } from "vitest";
import { KARTEN_SICHT_MAX_BALKEN, gueltigeKartenSicht } from "@chronicle/protocol";
import { RULE_LIMITS } from "@chronicle/rules";

// Die Sichteinstellung einer Karte trägt je Balken einen Eintrag. Darf ein Regelpaket mehr
// Balken ausweisen, als die Einstellung aufnimmt, scheitert jede Einstellung an dieser Karte.
describe("Die Grenzen des Kampftischs folgen den Regelpaketen", () => {
  it("nimmt so viele Balken auf, wie ein Paket ausweisen darf", () => {
    expect(KARTEN_SICHT_MAX_BALKEN).toBe(RULE_LIMITS.vitals);
    const balken = Object.fromEntries(Array.from({ length: RULE_LIMITS.vitals }, (_, i) => [`balken_${i}`, "worte" as const]));
    expect(gueltigeKartenSicht({ schema: 1, standard: "genau", balken, zustaende: true, bild: true })).toBe(true);
    expect(gueltigeKartenSicht({ schema: 1, standard: "genau", balken: { ...balken, zu_viel: "genau" }, zustaende: true, bild: true })).toBe(false);
  });
});
