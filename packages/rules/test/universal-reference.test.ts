// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { describe, expect, it } from "vitest";
import {
  D20_REFERENCE_PACKAGE, THREE_D20_REFERENCE_PACKAGE, UNIVERSAL_REFERENCE_PACKAGES,
  buildRuleRuntime, evaluateComputedFields, evaluateSupportedAction, parseSupportedRulePackage,
} from "../src/index.ts";

const context = { seed: "00000001000000020000000300000004", actor: {}, input: {}, knowledge: { actorId: "reference", passages: [] } } as const;

describe("universal structural reference systems", () => {
  it("keeps both first-party references inside the ordinary supported package contract", () => {
    expect(UNIVERSAL_REFERENCE_PACKAGES).toHaveLength(2);
    for (const pkg of UNIVERSAL_REFERENCE_PACKAGES) expect(parseSupportedRulePackage(JSON.parse(JSON.stringify(pkg)))).toEqual(pkg);
  });

  it("projects a nested d20 sheet without game-specific UI metadata", () => {
    const runtime = buildRuleRuntime(D20_REFERENCE_PACKAGE);
    expect(runtime.sections.find(section => section.id === "statistics")?.parent).toBeNull();
    expect(runtime.sections.find(section => section.id === "abilities")?.parent).toBe("statistics");
    expect(runtime.sections.find(section => section.id === "combat")?.parent).toBe("statistics");
    expect(runtime.sections.find(section => section.id === "abilities")?.fields).toEqual(["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"]);
    const computed = evaluateComputedFields(D20_REFERENCE_PACKAGE, {});
    expect(computed.strength_modifier).toBe(0);
    expect(computed.dexterity_modifier).toBe(0);
    const result = evaluateSupportedAction(D20_REFERENCE_PACKAGE, "strength_check", context);
    expect(result.dice).toHaveLength(1);
    expect(result.dice[0]).toMatchObject({ sides: 20, kept: [0] });
  });

  it("evaluates a three-independent-d20 talent check with three distinct dice traces", () => {
    const runtime = buildRuleRuntime(THREE_D20_REFERENCE_PACKAGE);
    expect(runtime.sections.find(section => section.id === "physical")?.parent).toBe("talents");
    expect(runtime.sections.find(section => section.id === "social")?.parent).toBe("talents");
    expect(runtime.sections.find(section => section.id === "knowledge")?.parent).toBe("talents");
    const result = evaluateSupportedAction(THREE_D20_REFERENCE_PACKAGE, "athletics_check", context);
    if (result.schemaVersion !== 2) throw new Error("3W20 reference must use schemaVersion 2");
    expect(result.dice).toHaveLength(3);
    expect(result.dice.map(die => die.sides)).toEqual([20, 20, 20]);
    expect(result.dice.every(die => die.rolls.length === 1 && die.rolls[0]?.length === 1)).toBe(true);
    expect(result.outcome?.id === "success" || result.outcome?.id === "failure").toBe(true);
  });
});
