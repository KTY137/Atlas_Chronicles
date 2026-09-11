// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { describe, expect, it } from "vitest";
import { DEMO_RULE_PACKAGE, RULE_LIMITS, parseEvaluationContext, parseRulePackage } from "../src/index.ts";

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

describe("Regelpaket-Grenzen", () => {
  it("beträgt 512 und nimmt ein Paket mit genau 512 Feldern an", () => {
    expect(RULE_LIMITS.fields).toBe(512);
    expect(() => parseRulePackage(packageWithFields(512))).not.toThrow();
  });

  it("weist das 513. Bogenfeld weiterhin an der Paketgrenze zurück", () => {
    expect(() => parseRulePackage(packageWithFields(513))).toThrow(/too many fields/);
  });

  it("wendet dieselbe 512er Grenze auf den Figurenkontext an", () => {
    expect(() => parseEvaluationContext(contextWithActorFields(512))).not.toThrow();
    expect(() => parseEvaluationContext(contextWithActorFields(513))).toThrow(/too many fields/);
  });

  it("nimmt 512 einzeln würfelbare Aktionen an und weist die 513. ab", () => {
    expect(RULE_LIMITS.actions).toBe(512);
    expect(() => parseRulePackage(packageWithActions(512))).not.toThrow();
    expect(() => parseRulePackage(packageWithActions(513))).toThrow(/actions/);
  });
});
