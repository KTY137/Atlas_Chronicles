// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { ENGINE_VERSION } from "../formula.ts";
import type { FieldSchema } from "../package.ts";
import { parseRulePackageV2, type RuleActionV2, type RulePackageV2 } from "../package-v2.ts";

/**
 * First-party, clean-room reference packages for the universal rule runtime.
 * They intentionally contain no third-party rule text, setting material, spell lists, classes,
 * monsters, trademarks-as-content or copied tables. Their job is architectural: prove that one
 * engine + one dynamic sheet renderer can express very different families of tabletop rules.
 */
const integer = (label: string, minimum: number, maximum: number, value: number): FieldSchema =>
  ({ type: "integer", label, minimum, maximum, default: value });
const text = (label: string, maxLength = 120, value = ""): FieldSchema => ({ type: "string", label, maxLength, default: value });
const baseAction = { version: "1.0.0", disclosure: "First-party Atlas Chronicles reference mechanic.", requiresConfirmation: true as const, inputs: {} };

const d20Modifier = (field: string) => `floor((actor.${field} - 10) / 2)`;
const d20Check = (id: string, name: string, field: string): RuleActionV2 => ({
  ...baseAction, id, name, expression: `1d20 + ${d20Modifier(field)}`, threshold: 10,
  disclosure: `Reference D20 check: one W20 plus the modifier derived from ${field}. The fixed threshold is intentionally simple and can be edited in the Rule Forge.`,
});
const gradedD20Check = (id: string, name: string, field: string): RuleActionV2 => ({
  ...baseAction, id, name,
  inputs: { dc: integer("Difficulty", 0, 100, 15) },
  expression: `1d20 + ${d20Modifier(field)}`,
  outcome: {
    bands: [
      { id: "critical_success", label: "Critical success", comparison: "gte", expression: "input.dc + 10", success: true },
      { id: "success", label: "Success", comparison: "gte", expression: "input.dc", success: true },
      { id: "critical_failure", label: "Critical failure", comparison: "lte", expression: "input.dc - 10", success: false },
    ],
    fallback: { id: "failure", label: "Failure", success: false },
  },
  disclosure: `Reference graded D20 check: one W20 plus the modifier derived from ${field}; margins of ten demonstrate multi-band outcomes without a game-specific evaluator.`,
});

/** Generic D20-family structure, not D&D or Pathfinder content. */
export const D20_REFERENCE_PACKAGE: RulePackageV2 = parseRulePackageV2({
  schemaVersion: 2,
  id: "org.atlas-chronicles.reference.d20",
  name: "D20 Fantasy Reference",
  version: "1.1.0",
  engineVersion: ENGINE_VERSION,
  license: "MIT",
  authors: ["Atlas Chronicles contributors"],
  fields: {
    name: text("Name"), level: integer("Level", 1, 20, 1),
    strength: integer("Strength", 1, 30, 10), dexterity: integer("Dexterity", 1, 30, 10),
    constitution: integer("Constitution", 1, 30, 10), intelligence: integer("Intelligence", 1, 30, 10),
    wisdom: integer("Wisdom", 1, 30, 10), charisma: integer("Charisma", 1, 30, 10),
    hp: integer("Current HP", 0, 999, 10), max_hp: integer("Maximum HP", 1, 999, 10),
    armor: integer("Defense", 0, 50, 10), speed: integer("Speed", 0, 300, 30),
    weapons_data: text("Weapon data", 4096, "[]"), spells_data: text("Spell data", 4096, "[]"),
  },
  layout: { sections: [
    { id: "identity", label: "Identity", fields: ["name", "level"] },
    { id: "statistics", label: "Statistics", fields: [] },
    { id: "abilities", label: "Ability Scores", parent: "statistics", fields: ["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"] },
    { id: "combat", label: "Combat", parent: "statistics", fields: ["hp", "max_hp", "armor", "speed"] },
  ] },
  computed: [
    { id: "strength_modifier", label: "Strength modifier", expression: d20Modifier("strength") },
    { id: "dexterity_modifier", label: "Dexterity modifier", expression: d20Modifier("dexterity") },
    { id: "constitution_modifier", label: "Constitution modifier", expression: d20Modifier("constitution") },
    { id: "intelligence_modifier", label: "Intelligence modifier", expression: d20Modifier("intelligence") },
    { id: "wisdom_modifier", label: "Wisdom modifier", expression: d20Modifier("wisdom") },
    { id: "charisma_modifier", label: "Charisma modifier", expression: d20Modifier("charisma") },
  ],
  vitals: [{ id: "hp", label: "Hit Points", max: "actor.max_hp", depletion: "defeat" }],
  collections: [
    { id: "weapons", label: "Weapons", storageField: "weapons_data", minItems: 0, maxItems: 24, primaryField: "name", itemFields: {
      name: text("Name", 120), attack_bonus: integer("Attack bonus", -20, 40, 0), damage: text("Damage", 80), equipped: { type: "boolean", label: "Equipped", default: false },
    } },
    { id: "spells", label: "Spells", storageField: "spells_data", minItems: 0, maxItems: 64, primaryField: "name", itemFields: {
      name: text("Name", 120), level: integer("Level", 0, 9, 0), prepared: { type: "boolean", label: "Prepared", default: false }, notes: text("Notes", 240),
    } },
  ],
  presentation: { schemaVersion: 3, root: [
    { kind: "group", id: "identity-ui", label: "Identity", render: "compact", children: [
      { kind: "field", id: "name-ui", ref: "name" }, { kind: "field", id: "level-ui", ref: "level" },
    ] },
    { kind: "group", id: "statistics-ui", label: "Statistics", render: "grid", children: [
      { kind: "group", id: "ability-scores-ui", label: "Ability Scores", render: "grid", children: [
        { kind: "field", id: "strength-ui", ref: "strength" }, { kind: "computed", id: "strength-mod-ui", ref: "strength_modifier" },
        { kind: "field", id: "dexterity-ui", ref: "dexterity" }, { kind: "computed", id: "dexterity-mod-ui", ref: "dexterity_modifier" },
        { kind: "field", id: "constitution-ui", ref: "constitution" }, { kind: "computed", id: "constitution-mod-ui", ref: "constitution_modifier" },
        { kind: "field", id: "intelligence-ui", ref: "intelligence" }, { kind: "computed", id: "intelligence-mod-ui", ref: "intelligence_modifier" },
        { kind: "field", id: "wisdom-ui", ref: "wisdom" }, { kind: "computed", id: "wisdom-mod-ui", ref: "wisdom_modifier" },
        { kind: "field", id: "charisma-ui", ref: "charisma" }, { kind: "computed", id: "charisma-mod-ui", ref: "charisma_modifier" },
      ] },
      { kind: "group", id: "combat-ui", label: "Combat", render: "cards", children: [
        { kind: "vital", id: "hp-vital-ui", ref: "hp" }, { kind: "field", id: "max-hp-ui", ref: "max_hp" },
        { kind: "field", id: "armor-ui", ref: "armor" }, { kind: "field", id: "speed-ui", ref: "speed" },
        { kind: "collection", id: "weapons-ui", ref: "weapons", render: "table" },
        { kind: "actions", id: "combat-actions-ui", label: "Quick checks", refs: ["initiative", "strength_check", "dexterity_check"] },
      ] },
    ] },
    { kind: "group", id: "magic-ui", label: "Magic", render: "cards", visibleIf: "actor.level >= 2", collapsible: true, children: [
      { kind: "collection", id: "spells-ui", ref: "spells", render: "cards" },
    ] },
    { kind: "actions", id: "other-actions-ui", label: "Other checks", refs: ["constitution_check", "intelligence_check", "wisdom_check", "charisma_check", "graded_check"] },
  ] },
  actions: [
    d20Check("strength_check", "Strength Check", "strength"), d20Check("dexterity_check", "Dexterity Check", "dexterity"),
    d20Check("constitution_check", "Constitution Check", "constitution"), d20Check("intelligence_check", "Intelligence Check", "intelligence"),
    d20Check("wisdom_check", "Wisdom Check", "wisdom"), d20Check("charisma_check", "Charisma Check", "charisma"),
    gradedD20Check("graded_check", "Graded D20 Check", "wisdom"),
    { ...baseAction, id: "initiative", name: "Initiative", expression: `1d20 + ${d20Modifier("dexterity")}` },
  ],
  migrations: [{ from: "1.0.0", to: "1.1.0", steps: [
    { kind: "add", field: "weapons_data", value: "[]" }, { kind: "add", field: "spells_data", value: "[]" },
  ] }],
});

const threeD20 = (id: string, name: string, talent: string, first: string, second: string, third: string): RuleActionV2 => ({
  ...baseAction, id, name,
  expression: `max(0, 1d20 - actor.${first}) + max(0, 1d20 - actor.${second}) + max(0, 1d20 - actor.${third})`,
  outcome: { bands: [{ id: "success", label: "Success", comparison: "lte", expression: `actor.${talent}`, success: true }], fallback: { id: "failure", label: "Failure", success: false } },
  disclosure: `Reference 3W20 check: three independent W20 rolls are compared with ${first}, ${second} and ${third}; the total excess must fit inside ${talent}.`,
});

/** Generic three-independent-d20 structure, deliberately not DSA content. */
export const THREE_D20_REFERENCE_PACKAGE: RulePackageV2 = parseRulePackageV2({
  schemaVersion: 2,
  id: "org.atlas-chronicles.reference.3d20",
  name: "3W20 Talent Reference",
  version: "1.1.0",
  engineVersion: ENGINE_VERSION,
  license: "MIT",
  authors: ["Atlas Chronicles contributors"],
  fields: {
    name: text("Name"),
    courage: integer("Courage", 1, 20, 10), cleverness: integer("Cleverness", 1, 20, 10), intuition: integer("Intuition", 1, 20, 10),
    charisma: integer("Charisma", 1, 20, 10), dexterity: integer("Dexterity", 1, 20, 10), agility: integer("Agility", 1, 20, 10),
    athletics: integer("Athletics reserve", 0, 30, 6), diplomacy: integer("Diplomacy reserve", 0, 30, 6), lore: integer("Lore reserve", 0, 30, 6),
    hp: integer("Current vitality", 0, 999, 20), max_hp: integer("Maximum vitality", 1, 999, 20),
    specialties_data: text("Specialty data", 4096, "[]"),
  },
  layout: { sections: [
    { id: "identity", label: "Identity", fields: ["name"] },
    { id: "attributes", label: "Attributes", fields: ["courage", "cleverness", "intuition", "charisma", "dexterity", "agility"] },
    { id: "talents", label: "Talents", fields: [] },
    { id: "physical", label: "Physical", parent: "talents", fields: ["athletics"] },
    { id: "social", label: "Social", parent: "talents", fields: ["diplomacy"] },
    { id: "knowledge", label: "Knowledge", parent: "talents", fields: ["lore"] },
    { id: "resources", label: "Resources", fields: ["hp", "max_hp"] },
  ] },
  vitals: [{ id: "hp", label: "Vitality", max: "actor.max_hp", depletion: "defeat" }],
  collections: [{ id: "specialties", label: "Specialties", storageField: "specialties_data", minItems: 0, maxItems: 32, primaryField: "name", itemFields: {
    name: text("Name", 120), talent: { type: "string", label: "Talent", maxLength: 40, default: "athletics", enum: ["athletics", "diplomacy", "lore"] }, bonus: integer("Bonus", -10, 20, 1),
  } }],
  presentation: { schemaVersion: 3, root: [
    { kind: "field", id: "identity-name-ui", ref: "name", render: "compact" },
    { kind: "group", id: "attributes-ui", label: "Attributes", render: "grid", collapsible: true, children: [
      { kind: "field", id: "courage-ui", ref: "courage" }, { kind: "field", id: "cleverness-ui", ref: "cleverness" }, { kind: "field", id: "intuition-ui", ref: "intuition" },
      { kind: "field", id: "charisma-ui-3d20", ref: "charisma" }, { kind: "field", id: "dexterity-ui-3d20", ref: "dexterity" }, { kind: "field", id: "agility-ui", ref: "agility" },
    ] },
    { kind: "group", id: "talents-ui", label: "Talents", render: "cards", children: [
      { kind: "group", id: "physical-ui", label: "Physical", children: [{ kind: "field", id: "athletics-ui", ref: "athletics" }] },
      { kind: "group", id: "social-ui", label: "Social", children: [{ kind: "field", id: "diplomacy-ui", ref: "diplomacy" }] },
      { kind: "group", id: "knowledge-ui", label: "Knowledge", children: [{ kind: "field", id: "lore-ui", ref: "lore" }] },
      { kind: "collection", id: "specialties-ui", ref: "specialties", render: "table" },
    ] },
    { kind: "group", id: "resources-ui", label: "Resources", render: "compact", children: [
      { kind: "vital", id: "vitality-ui", ref: "hp" }, { kind: "field", id: "max-vitality-ui", ref: "max_hp" },
    ] },
    { kind: "actions", id: "talent-checks-ui", label: "Talent checks", refs: ["athletics_check", "diplomacy_check", "lore_check"] },
  ] },
  actions: [
    threeD20("athletics_check", "Athletics Check", "athletics", "courage", "intuition", "agility"),
    threeD20("diplomacy_check", "Diplomacy Check", "diplomacy", "intuition", "charisma", "cleverness"),
    threeD20("lore_check", "Lore Check", "lore", "cleverness", "intuition", "cleverness"),
  ],
  migrations: [{ from: "1.0.0", to: "1.1.0", steps: [{ kind: "add", field: "specialties_data", value: "[]" }] }],
});

export const UNIVERSAL_REFERENCE_PACKAGES: readonly RulePackageV2[] = Object.freeze([D20_REFERENCE_PACKAGE, THREE_D20_REFERENCE_PACKAGE]);
