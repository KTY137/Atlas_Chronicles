// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { describe, expect, it } from "vitest";
import { evaluateVitals, type RulePackageV2, type Scalar } from "@chronicle/rules";
import { compilePackage, newField, newPackage, packageDraft, validateDraft, type RuleDraft } from "../src/features/rule-forge-model";

// „Dynamisch setzbare Bars": die Spielleitung legt in der Schmiede fest, welche Zahlen als
// Balken erscheinen. Diese Datei prueft den Weg vom Entwurf zum Paket — und zurueck.

/** Ein Entwurf mit drei Zahlenfeldern: Leben, Mana, Ausdauer. */
function entwurf(): RuleDraft {
  const draft = { ...newPackage(), schemaVersion: 2 as const };
  const felder = ([["leben", "Leben", "100"], ["mana", "Mana", "50"], ["ausdauer", "Ausdauer", "30"]] as const)
    .map(([id, label, max]) => ({ ...newField(), id, label, type: "integer" as const, minimum: "0", maximum: max, defaultValue: max }));
  return { ...draft, fields: [...draft.fields, ...felder] };
}
const mitBalken = (draft: RuleDraft) => ({ ...draft, vitals: [
  { id: "leben", label: "Leben", max: "100", depletion: "defeat" as const },
  { id: "mana", label: "Mana", max: "50", depletion: "none" as const },
  { id: "ausdauer", label: "Ausdauer", max: "30", depletion: "none" as const },
] });

describe("Balken aus der Schmiede", () => {
  it("macht aus drei erklärten Balken ein gültiges Paket", () => {
    const geprüft = validateDraft(mitBalken(entwurf()));
    expect(geprüft.valid).toBe(true);
    const pkg = (geprüft as { valid: true; value: RulePackageV2 }).value;
    expect(pkg.vitals?.map(v => v.id)).toEqual(["leben", "mana", "ausdauer"]);
    // Und die Anzeige liest daraus wirklich drei Balken — der ganze Zweck der Uebung.
    const werte: Record<string, Scalar> = { leben: 40, mana: 5, ausdauer: 30 };
    expect(evaluateVitals(pkg, werte).map(v => [v.label, v.value, v.maximum]))
      .toEqual([["Leben", 40, 100], ["Mana", 5, 50], ["Ausdauer", 30, 30]]);
  });

  it("überlebt den Weg zurück in den Entwurf", () => {
    // Wer ein Paket zum Bearbeiten oeffnet, darf seine Balken nicht verlieren.
    const pkg = (validateDraft(mitBalken(entwurf())) as { valid: true; value: RulePackageV2 }).value;
    const zurueck = packageDraft(pkg);
    expect(zurueck.vitals).toEqual(pkg.vitals);
    expect((compilePackage(zurueck) as RulePackageV2).vitals).toEqual(pkg.vitals);
  });

  it("weist einen Balken auf einem Feld ab, das keine Zahl ist", () => {
    // Ein Textfeld haette keinen Stand. Der Editor laesst es gar nicht erst waehlen — der Parser
    // ist die zweite, verbindliche Grenze.
    const draft = entwurf();
    const text = { ...newField(), id: "notiz", label: "Notiz", type: "string" as const, maxLength: "200", defaultValue: "" };
    const kaputt = { ...draft, fields: [...draft.fields, text], vitals: [{ id: "notiz", label: "Notiz", max: "10", depletion: "none" as const }] };
    const geprüft = validateDraft(kaputt);
    expect(geprüft.valid).toBe(false);
    expect((geprüft as { valid: false; error: string }).error).toMatch(/number or integer/);
  });

  it("weist zwei Balken auf demselben Feld ab", () => {
    const doppelt = { ...entwurf(), vitals: [
      { id: "leben", label: "Leben", max: "100", depletion: "defeat" as const },
      { id: "leben", label: "Nochmal Leben", max: "100", depletion: "none" as const },
    ] };
    expect(validateDraft(doppelt).valid).toBe(false);
  });

  it("weist einen Höchststand ab, der kein tragfähiger Ausdruck ist", () => {
    for (const max of ["1d6", "actor.gibtsnicht", "true"]) {
      const kaputt = { ...entwurf(), vitals: [{ id: "leben", label: "Leben", max, depletion: "none" as const }] };
      expect(validateDraft(kaputt).valid).toBe(false);
    }
    // Ein Ausdruck ueber ein anderes Bogenfeld ist dagegen genau der Sinn der Sache.
    const abgeleitet = { ...entwurf(), vitals: [{ id: "mana", label: "Mana", max: "leben_max()", depletion: "none" as const }] };
    expect(validateDraft(abgeleitet).valid).toBe(false);
    const richtig = { ...entwurf(), vitals: [{ id: "mana", label: "Mana", max: "actor.leben / 2", depletion: "none" as const }] };
    expect(validateDraft(richtig).valid).toBe(true);
  });

  it("lässt ein Paket ohne Balken ein Paket ohne Balken sein", () => {
    const geprüft = validateDraft(entwurf());
    expect(geprüft.valid).toBe(true);
    expect((geprüft as { valid: true; value: RulePackageV2 }).value.vitals).toBeUndefined();
  });
});
