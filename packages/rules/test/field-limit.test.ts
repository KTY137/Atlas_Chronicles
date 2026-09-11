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
function contextWithActorFields(count: number): unknown {
  return {
    seed: "00000000000000000000000000000001",
    actor: Object.fromEntries(Array.from({ length: count }, (_, i) => [`feld_${i}`, i % 10])),
    input: {}, knowledge: { actorId: "limit-test", passages: [] },
  };
}

describe("Bogenfeld-Grenze", () => {
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
});
