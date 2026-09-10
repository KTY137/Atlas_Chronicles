// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { describe, expect, it } from "vitest";
import {
  CHRONICLE_HEROES_PACKAGE as template, CHRONICLE_DEFAULT_SKILLS, CHRONICLE_EXAMPLE_CHARACTERS, CHRONICLE_START_POINTS,
  CHRONICLE_ARMOUR_FIELD, CHRONICLE_FUNKEN_FIELD, CHRONICLE_FIELDS, CHRONICLE_SKILL_LIBRARY, CHRONICLE_MAX_SKILLS, RULE_LIMITS,
  createChronicleHeroesPackage, defaultSupportedActorFields,
  evaluateComputedFields, evaluateFormula, evaluateSupportedAction, validatePackageFields,
  SupportedRulePackageRegistry, type ActionResultV2, type EvaluationContext, type Scalar,
} from "../src/index.ts";

const context = (actor: Readonly<Record<string, Scalar>>, seed = "00000001000000020000000300000004", input: Readonly<Record<string, Scalar>> = {}): EvaluationContext =>
  ({ seed, actor, input, knowledge: { actorId: "held", passages: [] } });
// Real engine seeds for every possible W100 — the dice are never stubbed.
const seeds = new Map<number, string>();
for (let i = 1; seeds.size < 100 && i < 10_000; i++) {
  const seed = `00000001${(Math.imul(i, 0x9e3779b9) >>> 0).toString(16).padStart(8, "0")}0000000300000004`;
  seeds.set(evaluateFormula("1d100", context({}, seed)).value as number, seed);
}
const one = createChronicleHeroesPackage({ skills: [{ id: "probe", label: "Probe", field: "koerper" }] });
/** The band the rules promise: fixed edges, and a critical success never beyond the value itself. */
const expected = (roll: number, value: number): string =>
  roll >= 96 ? "critical_failure" : roll <= Math.min(5, value) ? "critical_success" : roll <= value ? "success" : "failure";

describe("ChronicleHeroes — the shipped rules", () => {
  it("installs into a registry, which runs its self-tests against the real engine", () => {
    const registry = new SupportedRulePackageRegistry();
    expect(() => registry.install(template)).not.toThrow();
    expect(registry.get({ id: template.id, version: template.version }).name).toBe("ChronicleHeroes");
    expect(template.license).toBe("BUSL-1.1");
    expect(template.selfTests?.length).toBeGreaterThan(0);
  });

  it("keeps the critical edges fixed at 1–5 and 96–100 for every value, unlike a scaling band", () => {
    expect(seeds.size).toBe(100);
    for (const value of [0, 1, 5, 6, 40, 95, 96, 100]) {
      const actor = { skill_probe: value, bonus_probe: false };
      for (const [roll, seed] of seeds) {
        if (value === 0) continue; // an unlearned skill is refused before it is rolled
        const result = evaluateSupportedAction(one, "skill_probe", context(actor, seed)) as ActionResultV2;
        expect(result.total, `Wert ${value}, Wurf ${roll}`).toBe(roll);
        expect(result.outcome!.id, `Wert ${value}, Wurf ${roll}`).toBe(expected(roll, value));
        expect(result.success).toBe(["success", "critical_success"].includes(result.outcome!.id));
      }
    }
  }, 60_000);

  it("gives a talent probe the same bands, and never a critical success when the talent is zero", () => {
    for (const [roll, seed] of seeds) {
      const result = evaluateSupportedAction(template, "talent_geist", context({}, seed)) as ActionResultV2;
      expect(result.outcome!.id, `Wurf ${roll}`).toBe(roll >= 96 ? "critical_failure" : "failure");
      expect(result.outcome!.id).not.toBe("critical_success");
    }
    // With points in the field, the same low rolls become critical successes.
    const able = { skill_buchwissen: 60, skill_wahrnehmung: 60, skill_feldmedizin: 60 };
    const low = evaluateSupportedAction(template, "talent_geist", context(able, seeds.get(3)!)) as ActionResultV2;
    expect(low.outcome!.id).toBe("critical_success");
  }, 60_000);

  it("refuses to roll a skill without points and names the talent instead", () => {
    expect(() => evaluateSupportedAction(template, "skill_athletik", context({ skill_athletik: 0 }))).toThrow(/Talentprobe/);
  });

  it("lets armour take damage off, never below zero, and doubles a critical hit before the armour bites", () => {
    const damage = (input: Record<string, Scalar>, seed = seeds.get(50)!) =>
      (evaluateSupportedAction(template, "schaden", context({}, seed, { dice_count: 2, bonus: 4, critical: false, ziel_ruestung: 0, ...input })) as ActionResultV2).total;
    const bare = damage({});
    expect(bare).toBeGreaterThan(4);
    expect(damage({ ziel_ruestung: 3 })).toBe(bare - 3);
    // Armour cannot heal: a heavy plate against a scratch stops at zero.
    expect(damage({ dice_count: 1, bonus: 0, ziel_ruestung: 10 })).toBe(0);
    // The critical doubles dice and bonus together, and only then is the armour subtracted.
    expect(damage({ critical: true, ziel_ruestung: 3 })).toBe(bare * 2 - 3);
  });

  it("makes armour cost initiative, which is the whole trade", () => {
    const actor = { skill_athletik: 70, skill_handwerk: 50, skill_schlagkraft: 60 }; // Körper-Talent 20 (Durchschnitt 60, geteilt durch 3)
    const roll = (ruestung: number) => (evaluateSupportedAction(template, "initiative", context({ ...actor, [CHRONICLE_ARMOUR_FIELD]: ruestung }, seeds.get(7)!)) as ActionResultV2).total;
    expect(roll(0) - roll(4)).toBe(4);
    expect(evaluateComputedFields(template, { ...actor, [CHRONICLE_ARMOUR_FIELD]: 4 })["initiative_value"]).toBe(16);
  });

  it("derives talent, value, vitality and sparks from the sheet alone", () => {
    const actor = { skill_athletik: 70, skill_handwerk: 50, skill_schlagkraft: 60, bonus_athletik: true };
    const values = evaluateComputedFields(template, actor);
    expect(values["talent_koerper"]).toBe(20);
    expect(values["effective_athletik"]).toBe(90);
    expect(values["lebenskraft_max"]).toBe(80);
    expect(values["funken_max"]).toBe(2);
    // Turning the talent bonus off is the documented way out of a value above 100.
    expect(evaluateComputedFields(template, { ...actor, bonus_athletik: false })["effective_athletik"]).toBe(70);
  });

  it("rejects a value above 100 and an overspent spark pool", () => {
    const over = { skill_athletik: 95, skill_handwerk: 90, skill_schlagkraft: 90, bonus_athletik: true };
    expect(template.constraints?.some(rule => rule.id === "skill_valid_athletik")).toBe(true);
    expect(() => validatePackageFields(template, { ...defaultSupportedActorFields(template), ...over })).toThrow();
    expect(() => validatePackageFields(template, { ...defaultSupportedActorFields(template), [CHRONICLE_FUNKEN_FIELD]: 20 })).toThrow();
  });

  it("ships two example characters that spend their points exactly and differ in armour", () => {
    expect(CHRONICLE_EXAMPLE_CHARACTERS).toHaveLength(2);
    for (const person of CHRONICLE_EXAMPLE_CHARACTERS) {
      const values = evaluateComputedFields(template, person.fields);
      expect(values["points_spent"], person.name).toBe(CHRONICLE_START_POINTS);
      expect(values["points_available"], person.name).toBe(0);
    }
    const armour = CHRONICLE_EXAMPLE_CHARACTERS.map(person => person.fields[CHRONICLE_ARMOUR_FIELD]);
    expect(armour).toEqual([4, 0]);
  });


  it("offers a library of one hundred skills, spread over the three fields, all with valid stable keys", () => {
    expect(CHRONICLE_SKILL_LIBRARY).toHaveLength(100);
    expect(new Set(CHRONICLE_SKILL_LIBRARY.map(skill => skill.id)).size).toBe(100);
    expect(new Set(CHRONICLE_SKILL_LIBRARY.map(skill => skill.label)).size).toBe(100);
    for (const skill of CHRONICLE_SKILL_LIBRARY) {
      expect(skill.id).toMatch(/^[a-z][a-z0-9_-]*$/);
      expect(CHRONICLE_FIELDS).toContain(skill.field);
      expect(skill.label.trim()).toBe(skill.label);
    }
    for (const field of CHRONICLE_FIELDS) expect(CHRONICLE_SKILL_LIBRARY.filter(skill => skill.field === field).length).toBeGreaterThanOrEqual(30);
    // Every default skill is drawn from the library, so a round never sees two spellings of one thing.
    for (const skill of CHRONICLE_DEFAULT_SKILLS) expect(CHRONICLE_SKILL_LIBRARY).toContainEqual(skill);
  });

  it("carries a full catalogue of 24 within the engine's field budget, and refuses a 25th", () => {
    const chosen = CHRONICLE_SKILL_LIBRARY.slice(0, CHRONICLE_MAX_SKILLS);
    const full = createChronicleHeroesPackage({ skills: chosen });
    expect(Object.keys(full.fields).length).toBeLessThanOrEqual(RULE_LIMITS.fields);
    expect(full.actions.length).toBeLessThanOrEqual(RULE_LIMITS.actions);
    expect(() => new SupportedRulePackageRegistry().install(full)).not.toThrow();
    expect(() => createChronicleHeroesPackage({ skills: CHRONICLE_SKILL_LIBRARY.slice(0, CHRONICLE_MAX_SKILLS + 1) })).toThrow();
  }, 60_000);

  it("keeps talent independent of how large the catalogue is", () => {
    const three = CHRONICLE_SKILL_LIBRARY.filter(skill => skill.field === "koerper").slice(0, 3);
    const eight = CHRONICLE_SKILL_LIBRARY.filter(skill => skill.field === "koerper").slice(0, 8);
    const value = (skills: readonly typeof three[number][]) => {
      const pkg = createChronicleHeroesPackage({ skills });
      const actor = Object.fromEntries(skills.map(skill => [`skill_${skill.id}`, 60]));
      return evaluateComputedFields(pkg, actor)["talent_koerper"];
    };
    // Three skills at 60 and eight skills at 60 describe the same competence, so the talent matches.
    expect(value(three)).toBe(20);
    expect(value(eight)).toBe(20);
  }, 60_000);

  it("carries its own attribution and takes nothing from a foreign rulebook", () => {
    expect(template.attribution!.notice).toMatch(/eigenes Regelwerk/);
    expect(template.authors).toContain("Atlas Chronicles");
    const serialized = JSON.stringify(template);
    for (const foreign of ["howtobeahero", "How to be a Hero", "Geistesblitz", "Begabung"]) expect(serialized).not.toContain(foreign);
  });

  it("names nine skills in three fields and keeps stable field keys", () => {
    expect(CHRONICLE_DEFAULT_SKILLS).toHaveLength(9);
    for (const skill of CHRONICLE_DEFAULT_SKILLS) {
      expect(template.fields[`skill_${skill.id}`]).toBeDefined();
      expect(template.fields[`bonus_${skill.id}`]).toBeDefined();
    }
    expect(template.vitals).toEqual([{ id: "lebenskraft", label: "Lebenskraft", max: expect.any(String), depletion: "defeat" }]);
  });
});
