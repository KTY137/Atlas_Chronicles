// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { describe, expect, it } from "vitest";
import { CHRONICLE_HEROES_PACKAGE, DEMO_RULE_PACKAGE, RULE_LIMITS, abilityOverview, defaultSupportedActorFields, parseEvaluationContext, parseRulePackage, parseSupportedRulePackage, validatePackageFields } from "../src/index.ts";

function packageWithFields(count: number): unknown {
  const fields: Record<string, unknown> = JSON.parse(JSON.stringify(DEMO_RULE_PACKAGE.fields)) as Record<string, unknown>;
  for (let i = Object.keys(fields).length; i < count; i++) {
    fields[`feld_${i}`] = { type: "integer", label: `Feld ${i}`, default: 0, minimum: 0, maximum: 100 };
  }
  return { ...DEMO_RULE_PACKAGE, fields };
}
function packageWithActions(count: number): unknown {
  const source = DEMO_RULE_PACKAGE.actions[0]!;
  const actions = Array.from({ length: count }, (_, i) => ({ ...source, id: `aktion_${i}`, name: `Aktion ${i}` }));
  return { ...DEMO_RULE_PACKAGE, actions };
}
function contextWithActorFields(count: number): unknown {
  return {
    seed: "00000000000000000000000000000001",
    actor: Object.fromEntries(Array.from({ length: count }, (_, i) => [`feld_${i}`, i % 10])),
    input: {}, knowledge: { actorId: "limit-test", passages: [] },
  };
}

// Kaya, 2026-09-25: „so dass man sich nie Sorgen machen muss, auch bei über 1000 Fähigkeiten/Attributen“.
// Die Grenzen stehen in RULE_LIMITS; hier zählt, dass sie genau an ihrer Stelle greifen.
const FIELDS = RULE_LIMITS.fields, ACTIONS = RULE_LIMITS.actions;
describe("Regelpaket-Grenzen", () => {
  it("liegt weit über tausend und nimmt ein Paket mit genau so vielen Feldern an", () => {
    expect(FIELDS).toBeGreaterThanOrEqual(10_000);
    expect(() => parseRulePackage(packageWithFields(FIELDS))).not.toThrow();
  });

  it("weist das Feld über der Grenze weiterhin an der Paketgrenze zurück", () => {
    expect(() => parseRulePackage(packageWithFields(FIELDS + 1))).toThrow(/too many fields/);
  });

  it("wendet dieselbe Grenze auf den Figurenkontext an", () => {
    expect(() => parseEvaluationContext(contextWithActorFields(FIELDS))).not.toThrow();
    expect(() => parseEvaluationContext(contextWithActorFields(FIELDS + 1))).toThrow(/too many fields/);
  });

  it("nimmt so viele einzeln würfelbare Aktionen an, wie die Grenze erlaubt, und weist eine mehr ab", () => {
    expect(ACTIONS).toBeGreaterThanOrEqual(10_000);
    expect(() => parseRulePackage(packageWithActions(ACTIONS))).not.toThrow();
    expect(() => parseRulePackage(packageWithActions(ACTIONS + 1))).toThrow(/actions/);
  }, 60_000);
});

describe("ein vollständiges Regelwerk passt hinein", () => {
  // Ein Katalog in der Größe eines ganzen Systems: 2000 Fähigkeiten mit langen Beschreibungen,
  // Zaubergrade 0–9 und Stufen bis 20, über tausend Attribute und lange Listen im Bogen.
  it("nimmt 2000 Fähigkeiten, lange Texte, Ränge 0 bis 20 und über 1000 Attribute an", () => {
    const base = JSON.parse(JSON.stringify(CHRONICLE_HEROES_PACKAGE)) as Record<string, any>;
    const text = "Ein langer Regeltext. ".repeat(250);
    const abilities = Array.from({ length: 2000 }, (_, i) => ({ id: `faehigkeit_${i}`, name: `Fähigkeit ${i}`, group: `Zauber/Grad ${i % 10}`,
      rank: i % 21, kind: "einsatz", cost: i % 100, price: (i * 37) % 5000, text, ...(i > 0 && i % 7 === 0 ? { requires: [`faehigkeit_${i - 1}`] } : {}) }));
    for (let i = 0; i < 1100; i++) base.fields[`wert_${i}`] = { type: "integer", label: `Wert ${i}`, default: 0, minimum: 0, maximum: 100 };
    base.fields[base.abilityRules.abilityField] = { ...base.fields[base.abilityRules.abilityField], maxLength: RULE_LIMITS.stringValue };
    // Das Punktebudget ist eine Regel von ChronicleHeroes, keine Grenze; hier zählt nur, dass tausend gelernte Fähigkeiten Platz haben.
    delete base.abilityRules.budget;
    const pkg = parseSupportedRulePackage({ ...base, abilities });
    expect(pkg.schemaVersion === 2 && pkg.abilities?.length).toBe(2000);
    expect(Object.keys(pkg.fields).length).toBeGreaterThan(1100);
    // Eine Figur, die tausend davon gelernt hat, lässt sich speichern.
    const learned = abilities.slice(0, 1000).map(row => row.id).join(", ");
    const fields = validatePackageFields(pkg, { ...defaultSupportedActorFields(pkg), [base.abilityRules.abilityField]: learned });
    expect(abilityOverview(pkg, fields).learned.length).toBe(1000);
  }, 60_000);
});
