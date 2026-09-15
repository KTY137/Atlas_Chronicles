// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { describe, expect, it } from "vitest";
import { defaultSupportedActorFields, evaluateComputedFields, evaluateFormula, evaluateSupportedAction, parseSupportedRulePackage, previewSupportedPackageMigration, replaySupportedAction, stableJson, SupportedRulePackageRegistry, validatePackageFields, type ActionResultV2, type EvaluationContext, type Scalar } from "../src/index.ts";
import { HOW_TO_BE_A_HERO_PACKAGE as template, HTBAH_DEFAULT_SKILLS, HTBAH_EXAMPLE_CHARACTERS, HTBAH_ATTRIBUTION, HTBAH_RULE_GUIDANCE, createHowToBeAHeroPackage, type HtbahSkill } from "../src/examples.ts";

const context = (actor: Readonly<Record<string, Scalar>>, seed = "00000001000000020000000300000004", input: Readonly<Record<string, Scalar>> = {}): EvaluationContext => ({ seed, actor, input, knowledge: { actorId: "hero", passages: [] } });
// Find real authoritative-engine seeds for every possible W100; never stub RNG or receipts.
const seeds = new Map<number, string>();
for (let i = 1; seeds.size < 100 && i < 10_000; i++) {
  const seed = `00000001${(Math.imul(i, 0x9e3779b9) >>> 0).toString(16).padStart(8, "0")}0000000300000004`;
  seeds.set(evaluateFormula("1d100", context({}, seed)).value as number, seed);
}
const skillPackage = createHowToBeAHeroPackage({ skills: [{ id: "test", label: "Test", group: "handeln" }] });
const classify = (roll: number, target: number, skill: boolean): string => roll === 100 ? "critical_failure" : skill && roll === 1 ? "critical_success" : roll >= 90 + target / 10 ? "critical_failure" : skill && roll <= target / 10 ? "critical_success" : roll <= target ? "success" : "failure";

describe("pinned HTBAH exhaustive checks", () => {
  it("obtains one actual engine seed for all 100 outcomes", () => expect(seeds.size).toBe(100));
  it.each([1, 9, 10, 70, 73, 99, 100])("classifies all W100 results for effective skill %s", target => {
    const fields = { skill_test: target, bonus_test: false };
    for (const [roll, seed] of seeds) {
      const result = evaluateSupportedAction(skillPackage, "skill_test", context(fields, seed)) as ActionResultV2;
      expect(result.total).toBe(roll); expect(result.outcome!.id).toBe(classify(roll, target, true));
      expect(result.success).toBe(["success", "critical_success"].includes(result.outcome!.id));
      expect(result.dice).toHaveLength(1); expect(result.dice[0]!.rolls).toHaveLength(1);
      expect(result.outcomeTrace).toHaveLength(3);
    }
  });
  it.each([0, 1, 7, 10, 40])("classifies all W100 results for aptitude %s without critical success", target => {
    const skills: HtbahSkill[] = Array.from({ length: 5 }, (_, i) => ({ id: `value_${i}`, label: `Value ${i}`, group: "handeln" }));
    const pkg = createHowToBeAHeroPackage({ skills });
    let points = target * 10;
    const actor: Record<string, Scalar> = {};
    for (const skill of skills) { const allocated = Math.min(100, points); points -= allocated; actor[`skill_${skill.id}`] = allocated; actor[`bonus_${skill.id}`] = false; }
    expect(evaluateComputedFields(pkg, actor).aptitude_handeln).toBe(target);
    for (const [roll, seed] of seeds) {
      const result = evaluateSupportedAction(pkg, "aptitude_handeln", context(actor, seed)) as ActionResultV2;
      expect(result.outcome!.id).toBe(classify(roll, target, false)); expect(result.outcome!.id).not.toBe("critical_success"); expect(result.dice).toHaveLength(1);
    }
  });
  it("rejects an unlearned skill before dice even when its group grants a bonus", () => {
    expect(() => evaluateSupportedAction(skillPackage, "skill_test", context({ skill_test: 0 }))).toThrow(/ungelernt/);
    expect(() => evaluateSupportedAction(template, "skill_klettern", context({ skill_klettern: 0, skill_feinmechanik: 50 }))).toThrow(/ungelernt/);
    const manual = evaluateSupportedAction(template, "manual_ruling", context({}, seeds.get(1), { target: 0, critical_success_max: 0, critical_failure_min: 100, skill_check: true })) as ActionResultV2;
    expect(manual.outcome!.id).toBe("critical_success");
  });
  it("pins the approved 70/97 boundary, 73/97 ordinary failure, and equality success", () => {
    for (const [target, roll, outcome] of [[70, 97, "critical_failure"], [73, 97, "failure"], [73, 73, "success"], [100, 100, "critical_failure"]] as const) {
      expect((evaluateSupportedAction(skillPackage, "skill_test", context({ skill_test: target, bonus_test: false }, seeds.get(roll))) as ActionResultV2).outcome!.id).toBe(outcome);
    }
  });
});

describe("character arithmetic, configurable catalogue and resources", () => {
  it("provides two distinct original complete 400-point examples", () => {
    for (const example of HTBAH_EXAMPLE_CHARACTERS) {
      const values = evaluateComputedFields(template, example.fields); expect(values.points_spent).toBe(400); expect(values.points_available).toBe(0);
      expect(validatePackageFields(template, JSON.parse(JSON.stringify(example.fields)))).toEqual(example.fields);
    }
    expect(HTBAH_EXAMPLE_CHARACTERS[0]!.fields).not.toEqual(HTBAH_EXAMPLE_CHARACTERS[1]!.fields);
    expect(HTBAH_EXAMPLE_CHARACTERS[1]!.fields.skill_klettern).toBe(0);
    expect(new SupportedRulePackageRegistry().install(template)).toEqual(template);
    expect(defaultSupportedActorFields(template).hp).toBe(100);
  });
  it("rounds group totals 124/125 and aptitudes 14/15 commercially", () => {
    for (const [points, aptitude, gbp] of [[124, 12, 1], [125, 13, 1], [140, 14, 1], [150, 15, 2]]) {
      const values = evaluateComputedFields(template, { skill_klettern: 75, skill_feinmechanik: points! - 75 });
      expect(values.aptitude_handeln).toBe(aptitude); expect(values.gbp_max_handeln).toBe(gbp);
    }
  });
  it("preserves explicit bonus opt-out, rejects effective >100 and injected computed values", () => {
    expect(() => validatePackageFields(skillPackage, { skill_test: 100 })).toThrow(/effektiver Wert/);
    const values = evaluateComputedFields(skillPackage, { skill_test: 100, bonus_test: false }); expect(values.effective_test).toBe(100);
    expect(() => validatePackageFields(skillPackage, { effective_test: 1 })).toThrow(/unsupported/);
    expect(() => validatePackageFields(skillPackage, { skill_unknown: 1 })).toThrow(/unsupported/);
  });
  it("tracks spent GBP across edits and explicit reset, while allowing budget adjustments", () => {
    const example = HTBAH_EXAMPLE_CHARACTERS[0]!.fields;
    const spent = validatePackageFields(template, { ...example, gbp_spent_handeln: 2 }); expect(evaluateComputedFields(template, spent).gbp_remaining_handeln).toBe(0);
    expect(() => validatePackageFields(template, { ...spent, skill_klettern: 0, skill_feinmechanik: 0, skill_spurenlesen: 0 })).toThrow(/Geistesblitze/);
    const reset = validatePackageFields(template, { ...spent, gbp_spent_handeln: 0 }); expect(evaluateComputedFields(template, reset).gbp_remaining_handeln).toBe(2);
    expect(reset.hp).toBe(100);
    const overspent = { ...example, skill_naturkunde: 61 }; expect(evaluateComputedFields(template, overspent).points_available).toBe(-1);
    expect(evaluateComputedFields(template, { ...overspent, budget_adjustment: 1 }).points_available).toBe(0);
  });
  it("fits 24 skills with longest IDs all in one group under formula and shared operation limits", () => {
    const skills: HtbahSkill[] = Array.from({ length: 24 }, (_, i) => ({ id: `s${String(i).padStart(2, "0")}${"a".repeat(45)}`, label: `Skill ${i}`, group: "handeln" }));
    const pkg = createHowToBeAHeroPackage({ skills }); const actor = Object.fromEntries(skills.flatMap(skill => [[`skill_${skill.id}`, 10], [`bonus_${skill.id}`, true]]));
    expect(Object.keys(pkg.fields)).toHaveLength(56); expect(pkg.computed).toHaveLength(35); expect(pkg.actions).toHaveLength(30);
    const result = evaluateSupportedAction(pkg, `skill_${skills[0]!.id}`, context(actor)) as ActionResultV2;
    expect(result.evaluationOperations).toBeLessThanOrEqual(4096); expect(evaluateComputedFields(pkg, actor).aptitude_handeln).toBe(24);
    expect(replaySupportedAction(pkg, result).valid).toBe(true);
    const revision = createHowToBeAHeroPackage({ skills, version: "1.3.0", migrations: [{ from: pkg.version, to: "1.3.0", steps: [] }] });
    const migration = previewSupportedPackageMigration(pkg, revision, [{ id: "maximum_catalogue", fields: actor }]);
    expect(migration.entities[0]!.after).toEqual(validatePackageFields(pkg, actor));
  });
  it("rejects empty, oversize, duplicate, executable and mismatched catalogues", () => {
    for (const skills of [[], Array.from({ length: 25 }, (_, i) => ({ id: `s${i}`, label: "Skill", group: "handeln" })), [HTBAH_DEFAULT_SKILLS[0], HTBAH_DEFAULT_SKILLS[0]], [{ id: "bad();", label: "Bad", group: "handeln" }], [{ id: "bad", label: "Bad", group: "secret" }]]) expect(() => createHowToBeAHeroPackage({ skills: skills as HtbahSkill[] })).toThrow();
  });
  it("makes catalogue migration explicit and rejects migrated effective skills over 100", () => {
    const extra = { id: "segeln", label: "Segeln", group: "handeln" as const };
    const make = (steps: readonly import("../src/index.ts").MigrationStep[]) => createHowToBeAHeroPackage({ skills: [...HTBAH_DEFAULT_SKILLS, extra], version: "1.3.0", migrations: [{ from: template.version, to: "1.3.0", steps }] });
    const rows = HTBAH_EXAMPLE_CHARACTERS.map(example => ({ id: example.id, fields: example.fields }));
    expect(() => previewSupportedPackageMigration(template, make([]), rows)).toThrow(/explicit add\/archive/);
    const steps = [{ kind: "add" as const, field: "skill_segeln", value: 0 }, { kind: "add" as const, field: "bonus_segeln", value: true }];
    const preview = previewSupportedPackageMigration(template, make(steps), rows); expect(preview.entities[0]!.after.skill_segeln).toBe(0);
    expect(() => previewSupportedPackageMigration(template, make([{ ...steps[0]!, value: 100 }, steps[1]!]), rows)).toThrow(/effektiver Wert/);
  });
});

describe("initiative, damage, agreed checks and provenance", () => {
  it("uses one selected damage branch for 1W10 and 10W10, doubles the bonus once", () => {
    for (const dice_count of [1, 10]) {
      const plain = evaluateSupportedAction(template, "damage", context({}, undefined, { dice_count, bonus: 7, critical: false })) as ActionResultV2;
      const critical = evaluateSupportedAction(template, "damage", context({}, undefined, { dice_count, bonus: 7, critical: true })) as ActionResultV2;
      expect(plain.dice).toHaveLength(1); expect(plain.dice[0]!.rolls).toHaveLength(dice_count); expect(critical.dice).toEqual(plain.dice);
      expect(critical.total).toBe(plain.total * 2); expect(replaySupportedAction(template, critical).valid).toBe(true);
    }
  });
  it("adds Handeln to one initiative die and records manual thresholds", () => {
    const fields = HTBAH_EXAMPLE_CHARACTERS[0]!.fields; const result = evaluateSupportedAction(template, "initiative", context(fields));
    expect(result.total).toBe(result.dice[0]!.total + evaluateComputedFields(template, fields).aptitude_handeln!);
    const input = { target: 73, critical_success_max: 7, critical_failure_min: 99, skill_check: true };
    const agreed = evaluateSupportedAction(template, "manual_ruling", context(fields, seeds.get(98), input)) as ActionResultV2;
    expect(agreed.outcome!.id).toBe("failure"); expect(agreed.context.input).toEqual(input);
    expect(agreed.outcome!.comparisons.map(item => item.threshold)).toEqual([99, 7, 73]);
  });
  it("retains portable attribution, pinned divergence and guidance through JSON", () => {
    const roundtrip = parseSupportedRulePackage(stableJson(template)); expect(roundtrip).toEqual(template);
    expect(template.attribution).toEqual(HTBAH_ATTRIBUTION); expect(template.license).toBe("CC-BY-NC-SA-4.0");
    expect(HTBAH_ATTRIBUTION.sources.some(source => source.url.includes("oldid=27220"))).toBe(true);
    expect(HTBAH_ATTRIBUTION.changes).toMatch(/Begabung 0/); expect(HTBAH_RULE_GUIDANCE.health).toMatch(/mehr als 60 LP führt/);
  });
});
