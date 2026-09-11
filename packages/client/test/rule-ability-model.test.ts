// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
/** Die kleinen Bausteine hinter den Reitern „Fähigkeiten" und „Zustände" der Regelschmiede (Schritt 3b). */
import { describe, expect, it } from "vitest";
import { CHRONICLE_HEROES_PACKAGE, parseSupportedRulePackage } from "@chronicle/rules";
import { compilePackage, packageDraft } from "../src/features/rule-forge-model";
import { listenAttribute, newAbility, newCondition, newModifier, zielAktionen } from "../src/features/rule-ability-model";

const draft = packageDraft(CHRONICLE_HEROES_PACKAGE);

describe("Fähigkeiten und Zustände in der Regelschmiede", () => {
  it("legt eine neue Fähigkeit und einen neuen Zustand mit freier Kennung an, und das Paket bleibt gültig", () => {
    const ability = newAbility(draft.abilities!.map(eintrag => eintrag.id)), condition = newCondition(draft.conditions!.map(eintrag => eintrag.id));
    expect(draft.abilities!.some(eintrag => eintrag.id === ability.id)).toBe(false);
    const erweitert = { ...draft, abilities: [...draft.abilities!, { ...ability, modifiers: [newModifier(zielAktionen(draft, "ziel"))] }], conditions: [...draft.conditions!, condition] };
    expect(() => parseSupportedRulePackage(compilePackage(erweitert))).not.toThrow();
  });

  it("bietet für die Kennungslisten nur Textattribute ohne Auswahlwerte mit mindestens 64 Zeichen an", () => {
    const ids = listenAttribute(draft).map(feld => feld.id);
    expect(ids).toEqual(expect.arrayContaining(["faehigkeiten", "zustaende"]));
    expect(ids).not.toContain("lebenskraft");
    // Unter 64 Zeichen passt keine Liste hinein — dasselbe Attribut, nur kürzer, fällt heraus.
    const kurz = { ...draft, fields: draft.fields.map(feld => feld.id === "name" ? { ...feld, maxLength: "32" } : feld) };
    expect(listenAttribute(kurz).map(feld => feld.id)).not.toContain("name");
  });

  it("nennt die Aktionen, die eine Wirkung auf den Zielwert oder das Ergebnis annehmen", () => {
    expect(zielAktionen(draft, "ergebnis").map(action => action.id).sort()).toEqual(["initiative", "schaden"]);
    expect(zielAktionen(draft, "ziel").map(action => action.id)).toContain("skill_athletik");
    expect(zielAktionen(draft, "ziel").map(action => action.id)).not.toContain("manual_ruling");
  });
});
