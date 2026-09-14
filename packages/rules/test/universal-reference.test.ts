// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { describe, expect, it } from "vitest";
import {
  CHRONICLES_LITE_PACKAGE, CHRONICLES_LITE_SKILLS, chroniclesLiteSkillField,
  D20_REFERENCE_PACKAGE, FIFTH_EDITION_REFERENCE_PACKAGE, THREE_D20_REFERENCE_PACKAGE, UNIVERSAL_REFERENCE_PACKAGES,
  buildRuleRuntime, evaluateComputedFields, evaluateSupportedAction, parseSupportedRulePackage, previewRuleRuntime,
} from "../src/index.ts";

const context = { seed: "00000001000000020000000300000004", actor: {}, input: {}, knowledge: { actorId: "reference", passages: [] } } as const;

describe("universal structural reference systems", () => {
  it("keeps all first-party references inside the ordinary supported package contract", () => {
    expect(UNIVERSAL_REFERENCE_PACKAGES).toHaveLength(4);
    expect(UNIVERSAL_REFERENCE_PACKAGES.map(pkg => pkg.id)).toEqual([
      D20_REFERENCE_PACKAGE.id,
      FIFTH_EDITION_REFERENCE_PACKAGE.id,
      THREE_D20_REFERENCE_PACKAGE.id,
      CHRONICLES_LITE_PACKAGE.id,
    ]);
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

  it("supports graded d20 outcomes from action inputs without a game-specific evaluator", () => {
    const result = evaluateSupportedAction(D20_REFERENCE_PACKAGE, "graded_check", { ...context, input: { dc: 15 } });
    if (result.schemaVersion !== 2) throw new Error("graded D20 reference must use schemaVersion 2");
    expect(result.dice).toHaveLength(1);
    expect(["critical_success", "success", "failure", "critical_failure"]).toContain(result.outcome?.id);
    expect(result.outcome?.comparisons.map(row => row.id)).toEqual(["critical_success", "success", "critical_failure"]);
  });

  it("runs a fifth-edition-style sheet through the same runtime, including proficiency and conditional magic", () => {
    const runtime = buildRuleRuntime(FIFTH_EDITION_REFERENCE_PACKAGE);
    expect(runtime.presentation?.schemaVersion).toBe(3);
    expect(runtime.collections.map(collection => collection.id)).toEqual(["proficiencies", "attacks", "features", "spells"]);
    expect(evaluateComputedFields(FIFTH_EDITION_REFERENCE_PACKAGE, runtime.defaults).proficiency_bonus).toBe(2);
    expect(evaluateComputedFields(FIFTH_EDITION_REFERENCE_PACKAGE, { ...runtime.defaults, level: 5 }).proficiency_bonus).toBe(3);

    const plain = evaluateSupportedAction(FIFTH_EDITION_REFERENCE_PACKAGE, "strength_check", {
      ...context, actor: runtime.defaults, input: { dc: 10, proficient: false },
    });
    const proficient = evaluateSupportedAction(FIFTH_EDITION_REFERENCE_PACKAGE, "strength_check", {
      ...context, actor: runtime.defaults, input: { dc: 10, proficient: true },
    });
    expect(plain.dice).toEqual(proficient.dice);
    expect(proficient.total - plain.total).toBe(2);

    const mundane = previewRuleRuntime(FIFTH_EDITION_REFERENCE_PACKAGE, runtime.defaults);
    expect(mundane.valid).toBe(true);
    expect(mundane.visiblePresentationIds).not.toContain("magic-ui");
    const magical = previewRuleRuntime(FIFTH_EDITION_REFERENCE_PACKAGE, { ...runtime.defaults, uses_magic: true });
    expect(magical.valid).toBe(true);
    expect(magical.visiblePresentationIds).toContain("magic-ui");
    expect(magical.visiblePresentationIds).toContain("spells-ui");
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

  it("ships Chronicles Lite as a real 100-skill W50 package instead of a test-only fixture", () => {
    expect(CHRONICLES_LITE_SKILLS).toHaveLength(100);
    expect(CHRONICLES_LITE_SKILLS.filter(skill => skill.group === "handeln")).toHaveLength(34);
    expect(CHRONICLES_LITE_SKILLS.filter(skill => skill.group === "wissen")).toHaveLength(33);
    expect(CHRONICLES_LITE_SKILLS.filter(skill => skill.group === "soziales")).toHaveLength(33);

    const runtime = buildRuleRuntime(CHRONICLES_LITE_PACKAGE);
    expect(Object.keys(runtime.fields)).toHaveLength(105);
    expect(runtime.actions).toHaveLength(100);
    expect(runtime.sections.find(section => section.id === "handeln")?.parent).toBe("skills");
    expect(runtime.sections.find(section => section.id === "wissen")?.parent).toBe("skills");
    expect(runtime.sections.find(section => section.id === "soziales")?.parent).toBe("skills");
    expect(runtime.presentation?.schemaVersion).toBe(3);

    const field = chroniclesLiteSkillField("klettern");
    const result = evaluateSupportedAction(CHRONICLES_LITE_PACKAGE, "check_klettern", {
      ...context,
      actor: { ...runtime.defaults, [field]: 50 },
    });
    if (result.schemaVersion !== 2) throw new Error("Chronicles Lite must use schemaVersion 2");
    expect(result.dice).toHaveLength(1);
    expect(result.dice[0]?.sides).toBe(50);
    expect(["critical_success", "success", "critical_failure"]).toContain(result.outcome?.id);
  });
});
