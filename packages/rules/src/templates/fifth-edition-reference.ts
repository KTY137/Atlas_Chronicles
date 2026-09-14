// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { ENGINE_VERSION } from "../formula.ts";
import type { FieldSchema } from "../package.ts";
import { parseRulePackageV2, type RuleActionV2, type RulePackageV2 } from "../package-v2.ts";

/**
 * First-party clean-room compatibility fixture for fifth-edition-style play.
 * It copies no third-party prose, classes, species, spells, monsters, settings or tables.
 * The package exists to exercise the universal runtime with the familiar structural needs of
 * level-based proficiency, six abilities, attacks, features, proficiencies and spell lists.
 */
const integer = (label: string, minimum: number, maximum: number, value: number): FieldSchema =>
  ({ type: "integer", label, minimum, maximum, default: value });
const text = (label: string, maxLength = 120, value = ""): FieldSchema => ({ type: "string", label, maxLength, default: value });
const abilityModifier = (field: string) => `floor((actor.${field} - 10) / 2)`;
const proficiencyBonus = "2 + floor((actor.level - 1) / 4)";
const baseAction = {
  version: "1.0.0", disclosure: "Atlas Chronicles clean-room 5E-compatible reference mechanic.",
  requiresConfirmation: true as const,
};
function abilityCheck(id: string, name: string, field: string): RuleActionV2 {
  return {
    ...baseAction, id, name,
    inputs: {
      dc: integer("Difficulty", 0, 100, 10),
      proficient: { type: "boolean", label: "Apply proficiency", default: false },
    },
    expression: `1d20 + ${abilityModifier(field)} + if(input.proficient, ${proficiencyBonus}, 0)`,
    outcome: {
      bands: [{ id: "success", label: "Success", comparison: "gte", expression: "input.dc", success: true }],
      fallback: { id: "failure", label: "Failure", success: false },
    },
  };
}

export const FIFTH_EDITION_REFERENCE_PACKAGE: RulePackageV2 = parseRulePackageV2({
  schemaVersion: 2,
  id: "org.atlas-chronicles.reference.5e-compatible",
  name: "5E Compatible Reference",
  version: "1.0.0",
  engineVersion: ENGINE_VERSION,
  license: "MIT",
  authors: ["Atlas Chronicles contributors"],
  fields: {
    name: text("Name"), level: integer("Level", 1, 20, 1), ancestry: text("Ancestry"), class_name: text("Class"), background: text("Background"),
    strength: integer("Strength", 1, 30, 10), dexterity: integer("Dexterity", 1, 30, 10), constitution: integer("Constitution", 1, 30, 10),
    intelligence: integer("Intelligence", 1, 30, 10), wisdom: integer("Wisdom", 1, 30, 10), charisma: integer("Charisma", 1, 30, 10),
    hp: integer("Current HP", 0, 999, 10), max_hp: integer("Maximum HP", 1, 999, 10), armor_class: integer("Armor Class", 0, 50, 10), speed: integer("Speed", 0, 300, 30),
    hit_dice: text("Hit Dice", 80), inspiration: { type: "boolean", label: "Inspiration", default: false }, uses_magic: { type: "boolean", label: "Uses magic", default: false },
    proficiencies_data: text("Proficiency data", 4096, "[]"), attacks_data: text("Attack data", 4096, "[]"), features_data: text("Feature data", 4096, "[]"), spells_data: text("Spell data", 4096, "[]"),
  },
  layout: { sections: [
    { id: "identity", label: "Identity", fields: ["name", "level", "ancestry", "class_name", "background"] },
    { id: "abilities", label: "Abilities", fields: ["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"] },
    { id: "combat", label: "Combat", fields: ["hp", "max_hp", "armor_class", "speed", "hit_dice", "inspiration"] },
    { id: "magic", label: "Magic", fields: ["uses_magic"] },
  ] },
  computed: [
    { id: "strength_modifier", label: "Strength modifier", expression: abilityModifier("strength") },
    { id: "dexterity_modifier", label: "Dexterity modifier", expression: abilityModifier("dexterity") },
    { id: "constitution_modifier", label: "Constitution modifier", expression: abilityModifier("constitution") },
    { id: "intelligence_modifier", label: "Intelligence modifier", expression: abilityModifier("intelligence") },
    { id: "wisdom_modifier", label: "Wisdom modifier", expression: abilityModifier("wisdom") },
    { id: "charisma_modifier", label: "Charisma modifier", expression: abilityModifier("charisma") },
    { id: "proficiency_bonus", label: "Proficiency bonus", expression: proficiencyBonus },
    { id: "passive_awareness", label: "Passive awareness", expression: `10 + ${abilityModifier("wisdom")}` },
  ],
  vitals: [{ id: "hp", label: "Hit Points", max: "actor.max_hp", depletion: "defeat" }],
  collections: [
    { id: "proficiencies", label: "Proficiencies", storageField: "proficiencies_data", minItems: 0, maxItems: 48, primaryField: "name", itemFields: {
      name: text("Name", 120), kind: { type: "string", label: "Kind", maxLength: 16, default: "skill", enum: ["save", "skill", "tool", "language"] },
    } },
    { id: "attacks", label: "Attacks", storageField: "attacks_data", minItems: 0, maxItems: 24, primaryField: "name", itemFields: {
      name: text("Name", 120), attack_bonus: integer("Attack bonus", -20, 40, 0), damage: text("Damage", 80), range: text("Range", 80),
    } },
    { id: "features", label: "Features", storageField: "features_data", minItems: 0, maxItems: 48, primaryField: "name", itemFields: {
      name: text("Name", 120), source: text("Source", 120), uses: integer("Uses", 0, 99, 0), notes: text("Notes", 320),
    } },
    { id: "spells", label: "Spells", storageField: "spells_data", minItems: 0, maxItems: 64, primaryField: "name", itemFields: {
      name: text("Name", 120), level: integer("Level", 0, 9, 0), prepared: { type: "boolean", label: "Prepared", default: false }, notes: text("Notes", 320),
    } },
  ],
  presentation: { schemaVersion: 3, root: [
    { kind: "group", id: "identity-ui", label: "Identity", render: "grid", children: [
      { kind: "field", id: "name-ui", ref: "name" }, { kind: "field", id: "level-ui", ref: "level" }, { kind: "field", id: "ancestry-ui", ref: "ancestry" },
      { kind: "field", id: "class-ui", ref: "class_name" }, { kind: "field", id: "background-ui", ref: "background" },
      { kind: "computed", id: "proficiency-ui", ref: "proficiency_bonus" },
    ] },
    { kind: "group", id: "abilities-ui", label: "Abilities", render: "grid", children: [
      { kind: "field", id: "str-ui", ref: "strength" }, { kind: "computed", id: "str-mod-ui", ref: "strength_modifier" },
      { kind: "field", id: "dex-ui", ref: "dexterity" }, { kind: "computed", id: "dex-mod-ui", ref: "dexterity_modifier" },
      { kind: "field", id: "con-ui", ref: "constitution" }, { kind: "computed", id: "con-mod-ui", ref: "constitution_modifier" },
      { kind: "field", id: "int-ui", ref: "intelligence" }, { kind: "computed", id: "int-mod-ui", ref: "intelligence_modifier" },
      { kind: "field", id: "wis-ui", ref: "wisdom" }, { kind: "computed", id: "wis-mod-ui", ref: "wisdom_modifier" },
      { kind: "field", id: "cha-ui", ref: "charisma" }, { kind: "computed", id: "cha-mod-ui", ref: "charisma_modifier" },
      { kind: "computed", id: "passive-awareness-ui", ref: "passive_awareness" },
    ] },
    { kind: "group", id: "combat-ui", label: "Combat", render: "cards", children: [
      { kind: "vital", id: "hp-ui", ref: "hp" }, { kind: "field", id: "max-hp-ui", ref: "max_hp" }, { kind: "field", id: "ac-ui", ref: "armor_class" },
      { kind: "field", id: "speed-ui", ref: "speed" }, { kind: "field", id: "hit-dice-ui", ref: "hit_dice" }, { kind: "field", id: "inspiration-ui", ref: "inspiration" },
      { kind: "collection", id: "attacks-ui", ref: "attacks", render: "table" },
      { kind: "actions", id: "combat-actions-ui", label: "Combat checks", refs: ["initiative", "attack_roll"] },
    ] },
    { kind: "collection", id: "proficiencies-ui", ref: "proficiencies", render: "table" },
    { kind: "collection", id: "features-ui", ref: "features", render: "cards" },
    { kind: "group", id: "magic-ui", label: "Magic", render: "cards", visibleIf: "actor.uses_magic == true", collapsible: true, children: [
      { kind: "field", id: "uses-magic-ui", ref: "uses_magic" }, { kind: "collection", id: "spells-ui", ref: "spells", render: "table" },
    ] },
    { kind: "actions", id: "ability-checks-ui", label: "Ability checks", refs: ["strength_check", "dexterity_check", "constitution_check", "intelligence_check", "wisdom_check", "charisma_check"] },
  ] },
  actions: [
    abilityCheck("strength_check", "Strength Check", "strength"), abilityCheck("dexterity_check", "Dexterity Check", "dexterity"),
    abilityCheck("constitution_check", "Constitution Check", "constitution"), abilityCheck("intelligence_check", "Intelligence Check", "intelligence"),
    abilityCheck("wisdom_check", "Wisdom Check", "wisdom"), abilityCheck("charisma_check", "Charisma Check", "charisma"),
    { ...baseAction, id: "initiative", name: "Initiative", inputs: {}, expression: `1d20 + ${abilityModifier("dexterity")}` },
    { ...baseAction, id: "attack_roll", name: "Attack Roll", inputs: { attack_bonus: integer("Attack bonus", -20, 40, 0), defense: integer("Defense", 0, 100, 10) }, expression: "1d20 + input.attack_bonus",
      outcome: { bands: [{ id: "hit", label: "Hit", comparison: "gte", expression: "input.defense", success: true }], fallback: { id: "miss", label: "Miss", success: false } } },
  ],
  migrations: [],
});
