// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { describe, expect, it } from "vitest";
import {
  FIFTH_EDITION_SRD_PACKAGE,
  buildRuleRuntime,
  evaluateComputedFields,
  evaluateSupportedAction,
  parseSupportedRulePackage,
  previewRuleRuntime,
} from "../src/index.ts";

const seed = "00000001000000020000000300000004";
const knowledge = { actorId: "srd-hero", passages: [] } as const;

describe("5E SRD 5.1 package", () => {
  it("round-trips through the closed supported-package parser with CC attribution", () => {
    const cloned = JSON.parse(JSON.stringify(FIFTH_EDITION_SRD_PACKAGE));
    expect(parseSupportedRulePackage(cloned)).toEqual(FIFTH_EDITION_SRD_PACKAGE);
    expect(FIFTH_EDITION_SRD_PACKAGE.license).toBe("CC-BY-4.0");
    expect(FIFTH_EDITION_SRD_PACKAGE.attribution?.title).toBe("System Reference Document 5.1");
    expect(FIFTH_EDITION_SRD_PACKAGE.attribution?.sources[0]?.authors).toContain("Wizards of the Coast LLC");
  });

  it("contains the ordinary 5e character-sheet domains", () => {
    const runtime = buildRuleRuntime(FIFTH_EDITION_SRD_PACKAGE);
    expect(runtime.presentation?.schemaVersion).toBe(3);
    expect(runtime.collections.map(row => row.id)).toEqual([
      "proficiencies", "attacks", "equipment", "features", "resources", "spells", "conditions",
    ]);
    expect(Object.keys(runtime.fields)).toEqual(expect.arrayContaining([
      "class_name", "level", "strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma",
      "armor_class", "current_hp", "max_hp", "death_successes", "death_failures", "uses_magic",
      "slot_1_max", "slot_9_max",
    ]));
    expect(runtime.actions.map(row => row.id)).toEqual(expect.arrayContaining([
      "skill_perception", "skill_stealth", "strength_save", "wisdom_save", "attack_strength", "attack_dexterity",
      "initiative_roll", "death_save", "spell_attack",
    ]));
  });

  it("uses level-based proficiency including expertise multiplier", () => {
    const runtime = buildRuleRuntime(FIFTH_EDITION_SRD_PACKAGE);
    expect(evaluateComputedFields(FIFTH_EDITION_SRD_PACKAGE, runtime.defaults).proficiency_bonus).toBe(2);
    expect(evaluateComputedFields(FIFTH_EDITION_SRD_PACKAGE, { ...runtime.defaults, level: 5 }).proficiency_bonus).toBe(3);
    expect(evaluateComputedFields(FIFTH_EDITION_SRD_PACKAGE, { ...runtime.defaults, level: 17 }).proficiency_bonus).toBe(6);

    const actor = { ...runtime.defaults, level: 5, strength: 10 };
    const plain = evaluateSupportedAction(FIFTH_EDITION_SRD_PACKAGE, "skill_athletics", {
      seed, actor, input: { dc: 10, proficiency_multiplier: 0, roll_mode: "normal", misc_bonus: 0 }, knowledge,
    });
    const proficient = evaluateSupportedAction(FIFTH_EDITION_SRD_PACKAGE, "skill_athletics", {
      seed, actor, input: { dc: 10, proficiency_multiplier: 1, roll_mode: "normal", misc_bonus: 0 }, knowledge,
    });
    const expertise = evaluateSupportedAction(FIFTH_EDITION_SRD_PACKAGE, "skill_athletics", {
      seed, actor, input: { dc: 10, proficiency_multiplier: 2, roll_mode: "normal", misc_bonus: 0 }, knowledge,
    });
    expect(proficient.total - plain.total).toBe(3);
    expect(expertise.total - plain.total).toBe(6);
  });

  it("rolls advantage and disadvantage through the generic dice grammar", () => {
    const runtime = buildRuleRuntime(FIFTH_EDITION_SRD_PACKAGE);
    const actor = { ...runtime.defaults, dexterity: 10 };
    const baseInput = { dc: 10, proficiency_multiplier: 0, misc_bonus: 0 };
    const normal = evaluateSupportedAction(FIFTH_EDITION_SRD_PACKAGE, "skill_stealth", {
      seed, actor, input: { ...baseInput, roll_mode: "normal" }, knowledge,
    });
    const advantage = evaluateSupportedAction(FIFTH_EDITION_SRD_PACKAGE, "skill_stealth", {
      seed, actor, input: { ...baseInput, roll_mode: "advantage" }, knowledge,
    });
    const disadvantage = evaluateSupportedAction(FIFTH_EDITION_SRD_PACKAGE, "skill_stealth", {
      seed, actor, input: { ...baseInput, roll_mode: "disadvantage" }, knowledge,
    });
    expect(normal.dice[0]).toMatchObject({ sides: 20 });
    expect(advantage.dice[0]?.rolls[0]).toHaveLength(2);
    expect(advantage.dice[0]?.kept).toHaveLength(1);
    expect(disadvantage.dice[0]?.rolls[0]).toHaveLength(2);
    expect(disadvantage.dice[0]?.kept).toHaveLength(1);
  });

  it("hides spellcasting until the character uses magic", () => {
    const runtime = buildRuleRuntime(FIFTH_EDITION_SRD_PACKAGE);
    const mundane = previewRuleRuntime(FIFTH_EDITION_SRD_PACKAGE, runtime.defaults);
    expect(mundane.valid).toBe(true);
    expect(mundane.visiblePresentationIds).not.toContain("spellcasting-ui");
    const magical = previewRuleRuntime(FIFTH_EDITION_SRD_PACKAGE, { ...runtime.defaults, uses_magic: true });
    expect(magical.valid).toBe(true);
    expect(magical.visiblePresentationIds).toContain("spellcasting-ui");
    expect(magical.visiblePresentationIds).toContain("spells-ui");
    expect(magical.visiblePresentationIds).toContain("slot-9-ui");
  });
});
