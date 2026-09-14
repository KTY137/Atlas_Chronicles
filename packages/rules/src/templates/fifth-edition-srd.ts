// SPDX-License-Identifier: CC-BY-4.0
// This work includes material taken from the System Reference Document 5.1 ("SRD 5.1")
// by Wizards of the Coast LLC. The SRD 5.1 is licensed under CC-BY-4.0.
// See THIRD-PARTY-NOTICES.md for the full attribution statement.
import { ENGINE_VERSION } from "../formula.ts";
import type { FieldSchema } from "../package.ts";
import { parseRulePackageV2, type RuleActionV2, type RulePackageV2 } from "../package-v2.ts";

const integer = (label: string, minimum: number, maximum: number, value: number): FieldSchema =>
  ({ type: "integer", label, minimum, maximum, default: value });
const text = (label: string, maxLength = 120, value = ""): FieldSchema =>
  ({ type: "string", label, maxLength, default: value });
const bool = (label: string, value = false): FieldSchema => ({ type: "boolean", label, default: value });
const choice = (label: string, values: readonly string[], value = values[0] ?? ""): FieldSchema =>
  ({ type: "string", label, maxLength: 80, enum: [...values], default: value });

const ABILITIES = ["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"] as const;
const abilityLabel: Record<(typeof ABILITIES)[number], string> = {
  strength: "Strength", dexterity: "Dexterity", constitution: "Constitution",
  intelligence: "Intelligence", wisdom: "Wisdom", charisma: "Charisma",
};
const modifier = (ability: string) => `floor((actor.${ability} - 10) / 2)`;
const proficiencyBonus = "2 + floor((actor.level - 1) / 4)";
const d20 = 'if(input.roll_mode == "advantage", 2d20kh1, if(input.roll_mode == "disadvantage", 2d20kl1, 1d20))';
const proficiencyTerm = `(input.proficiency_multiplier * (${proficiencyBonus}))`;
const rollMode = () => choice("Roll Mode", ["normal", "advantage", "disadvantage"], "normal");
const baseAction = {
  version: "1.0.0",
  disclosure: "SRD 5.1 compatible fifth-edition mechanic.",
  requiresConfirmation: true as const,
};

const check = (id: string, name: string, ability: string): RuleActionV2 => ({
  ...baseAction,
  id,
  name,
  inputs: {
    dc: integer("Difficulty Class", 0, 40, 10),
    proficiency_multiplier: integer("Proficiency multiplier", 0, 2, 0),
    roll_mode: rollMode(),
    misc_bonus: integer("Misc. bonus", -20, 20, 0),
  },
  expression: `${d20} + ${modifier(ability)} + ${proficiencyTerm} + input.misc_bonus`,
  outcome: {
    bands: [{ id: "success", label: "Success", comparison: "gte", expression: "input.dc", success: true }],
    fallback: { id: "failure", label: "Failure", success: false },
  },
});

const savingThrow = (ability: (typeof ABILITIES)[number]): RuleActionV2 =>
  check(`${ability}_save`, `${abilityLabel[ability]} Saving Throw`, ability);
const skill = (id: string, label: string, ability: (typeof ABILITIES)[number]): RuleActionV2 =>
  check(`skill_${id}`, label, ability);

const ATTACK_ABILITIES = ["strength", "dexterity", "intelligence", "wisdom", "charisma"] as const;
const attackActions: RuleActionV2[] = ATTACK_ABILITIES.map(ability => ({
  ...baseAction,
  id: `attack_${ability}`,
  name: `${abilityLabel[ability]} Attack Roll`,
  inputs: {
    armor_class: integer("Armor Class", 0, 40, 10),
    proficiency_multiplier: integer("Proficiency multiplier", 0, 1, 1),
    roll_mode: rollMode(),
    misc_bonus: integer("Magic / misc. bonus", -20, 20, 0),
  },
  expression: `${d20} + ${modifier(ability)} + ${proficiencyTerm} + input.misc_bonus`,
  outcome: {
    bands: [{ id: "hit", label: "Hit", comparison: "gte", expression: "input.armor_class", success: true }],
    fallback: { id: "miss", label: "Miss", success: false },
  },
}));

const CLASS_NAMES = [
  "Barbarian", "Bard", "Cleric", "Druid", "Fighter", "Monk", "Paladin", "Ranger", "Rogue", "Sorcerer", "Warlock", "Wizard",
] as const;
const ALIGNMENTS = [
  "Lawful Good", "Neutral Good", "Chaotic Good", "Lawful Neutral", "Neutral", "Chaotic Neutral", "Lawful Evil", "Neutral Evil", "Chaotic Evil", "Unaligned",
] as const;
const SIZES = ["Tiny", "Small", "Medium", "Large", "Huge", "Gargantuan"] as const;
const DAMAGE_TYPES = ["Acid", "Bludgeoning", "Cold", "Fire", "Force", "Lightning", "Necrotic", "Piercing", "Poison", "Psychic", "Radiant", "Slashing", "Thunder"] as const;
const SPELL_SCHOOLS = ["Abjuration", "Conjuration", "Divination", "Enchantment", "Evocation", "Illusion", "Necromancy", "Transmutation"] as const;
const CONDITION_NAMES = ["Blinded", "Charmed", "Deafened", "Exhaustion", "Frightened", "Grappled", "Incapacitated", "Invisible", "Paralyzed", "Petrified", "Poisoned", "Prone", "Restrained", "Stunned", "Unconscious", "Other"] as const;

const fields: Record<string, FieldSchema> = {
  character_name: text("Character Name", 120), player_name: text("Player Name", 120),
  class_name: choice("Class", CLASS_NAMES, "Fighter"), subclass: text("Subclass / Archetype", 120),
  level: integer("Level", 1, 20, 1), background: text("Background", 120), ancestry: text("Race / Ancestry", 120),
  alignment: choice("Alignment", ALIGNMENTS, "Neutral"), experience: integer("Experience Points", 0, 9999999, 0),
  size: choice("Size", SIZES, "Medium"), inspiration: bool("Inspiration"),

  strength: integer("Strength", 1, 30, 10), dexterity: integer("Dexterity", 1, 30, 10),
  constitution: integer("Constitution", 1, 30, 10), intelligence: integer("Intelligence", 1, 30, 10),
  wisdom: integer("Wisdom", 1, 30, 10), charisma: integer("Charisma", 1, 30, 10),

  armor_class: integer("Armor Class", 0, 40, 10), speed: integer("Speed", 0, 300, 30),
  current_hp: integer("Current Hit Points", 0, 9999, 10), max_hp: integer("Hit Point Maximum", 1, 9999, 10),
  temp_hp: integer("Temporary Hit Points", 0, 9999, 0), hit_dice_total: text("Hit Dice", 80, "1d10"),
  hit_dice_spent: integer("Hit Dice Spent", 0, 20, 0), death_successes: integer("Death Save Successes", 0, 3, 0),
  death_failures: integer("Death Save Failures", 0, 3, 0),

  uses_magic: bool("Spellcasting"),
  spellcasting_ability: choice("Spellcasting Ability", ["intelligence", "wisdom", "charisma"], "intelligence"),
  spell_save_dc: integer("Spell Save DC", 0, 40, 10), spell_attack_bonus: integer("Spell Attack Bonus", -20, 40, 0),
  slot_1_max: integer("1st-level Slots", 0, 99, 0), slot_1_used: integer("1st-level Slots Used", 0, 99, 0),
  slot_2_max: integer("2nd-level Slots", 0, 99, 0), slot_2_used: integer("2nd-level Slots Used", 0, 99, 0),
  slot_3_max: integer("3rd-level Slots", 0, 99, 0), slot_3_used: integer("3rd-level Slots Used", 0, 99, 0),
  slot_4_max: integer("4th-level Slots", 0, 99, 0), slot_4_used: integer("4th-level Slots Used", 0, 99, 0),
  slot_5_max: integer("5th-level Slots", 0, 99, 0), slot_5_used: integer("5th-level Slots Used", 0, 99, 0),
  slot_6_max: integer("6th-level Slots", 0, 99, 0), slot_6_used: integer("6th-level Slots Used", 0, 99, 0),
  slot_7_max: integer("7th-level Slots", 0, 99, 0), slot_7_used: integer("7th-level Slots Used", 0, 99, 0),
  slot_8_max: integer("8th-level Slots", 0, 99, 0), slot_8_used: integer("8th-level Slots Used", 0, 99, 0),
  slot_9_max: integer("9th-level Slots", 0, 99, 0), slot_9_used: integer("9th-level Slots Used", 0, 99, 0),

  personality_traits: text("Personality Traits", 1000), ideals: text("Ideals", 1000), bonds: text("Bonds", 1000),
  flaws: text("Flaws", 1000), notes: text("Notes", 4000),
  proficiencies_data: text("Proficiencies Data", 4096, "[]"), attacks_data: text("Attacks Data", 4096, "[]"),
  equipment_data: text("Equipment Data", 4096, "[]"), features_data: text("Features Data", 4096, "[]"),
  spells_data: text("Spells Data", 4096, "[]"), resources_data: text("Resources Data", 4096, "[]"),
  conditions_data: text("Conditions / Effects Data", 4096, "[]"),
};

const computed = [
  { id: "proficiency_bonus", label: "Proficiency Bonus", expression: proficiencyBonus },
  ...ABILITIES.map(ability => ({ id: `${ability}_modifier`, label: `${abilityLabel[ability]} Modifier`, expression: modifier(ability) })),
  { id: "initiative", label: "Initiative", expression: modifier("dexterity") },
  { id: "passive_perception", label: "Passive Wisdom (Perception)", expression: `10 + ${modifier("wisdom")}` },
];

const skills: RuleActionV2[] = [
  skill("acrobatics", "Acrobatics", "dexterity"), skill("animal_handling", "Animal Handling", "wisdom"),
  skill("arcana", "Arcana", "intelligence"), skill("athletics", "Athletics", "strength"),
  skill("deception", "Deception", "charisma"), skill("history", "History", "intelligence"),
  skill("insight", "Insight", "wisdom"), skill("intimidation", "Intimidation", "charisma"),
  skill("investigation", "Investigation", "intelligence"), skill("medicine", "Medicine", "wisdom"),
  skill("nature", "Nature", "intelligence"), skill("perception", "Perception", "wisdom"),
  skill("performance", "Performance", "charisma"), skill("persuasion", "Persuasion", "charisma"),
  skill("religion", "Religion", "intelligence"), skill("sleight_of_hand", "Sleight of Hand", "dexterity"),
  skill("stealth", "Stealth", "dexterity"), skill("survival", "Survival", "wisdom"),
];
const abilityChecks = ABILITIES.map(ability => check(`${ability}_check`, `${abilityLabel[ability]} Check`, ability));
const saves = ABILITIES.map(ability => savingThrow(ability));

const actions: RuleActionV2[] = [
  ...abilityChecks, ...saves, ...skills, ...attackActions,
  {
    ...baseAction, id: "initiative_roll", name: "Initiative",
    inputs: { roll_mode: rollMode(), misc_bonus: integer("Misc. bonus", -20, 20, 0) },
    expression: `${d20} + ${modifier("dexterity")} + input.misc_bonus`,
  },
  {
    ...baseAction, id: "death_save", name: "Death Saving Throw", inputs: { roll_mode: rollMode() }, expression: d20,
    disclosure: "SRD 5.1 death saving throw. The ordinary 10+ success threshold is classified automatically; natural 1/20 special handling remains visible in the die trace and is resolved by the table until the generic outcome schema exposes natural-die predicates.",
    outcome: { bands: [{ id: "success", label: "Success", comparison: "gte", expression: "10", success: true }], fallback: { id: "failure", label: "Failure", success: false } },
  },
  {
    ...baseAction, id: "spell_attack", name: "Spell Attack",
    inputs: { armor_class: integer("Armor Class", 0, 40, 10), attack_bonus: integer("Spell Attack Bonus", -20, 40, 0), roll_mode: rollMode() },
    expression: `${d20} + input.attack_bonus`,
    outcome: { bands: [{ id: "hit", label: "Hit", comparison: "gte", expression: "input.armor_class", success: true }], fallback: { id: "miss", label: "Miss", success: false } },
  },
];

export const FIFTH_EDITION_SRD_PACKAGE: RulePackageV2 = parseRulePackageV2({
  schemaVersion: 2,
  id: "org.atlas-chronicles.srd.5e",
  name: "5E SRD 5.1",
  version: "1.0.0",
  engineVersion: ENGINE_VERSION,
  license: "CC-BY-4.0",
  authors: ["Atlas Chronicles contributors"],
  attribution: {
    title: "System Reference Document 5.1",
    sources: [{
      title: "System Reference Document 5.1 (Creative Commons)",
      url: "https://www.dndbeyond.com/srd",
      revision: "5.1",
      authors: ["Wizards of the Coast LLC"],
    }],
    licenseUrl: "https://creativecommons.org/licenses/by/4.0/legalcode",
    notice: "This work includes material taken from the System Reference Document 5.1 (SRD 5.1) by Wizards of the Coast LLC and available at https://dnd.wizards.com/resources/systems-reference-document. The SRD 5.1 is licensed under the Creative Commons Attribution 4.0 International License available at https://creativecommons.org/licenses/by/4.0/legalcode.",
    changes: "Atlas Chronicles expresses SRD 5.1 character-sheet and resolution mechanics as bounded declarative fields, collections, formulas and presentation metadata; labels are arranged for the Atlas UI.",
  },
  fields,
  layout: { sections: [
    { id: "identity", label: "Identity", fields: ["character_name", "player_name", "class_name", "subclass", "level", "background", "ancestry", "alignment", "experience", "size", "inspiration"] },
    { id: "abilities", label: "Ability Scores", fields: ["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"] },
    { id: "combat", label: "Combat", fields: ["armor_class", "speed", "current_hp", "max_hp", "temp_hp", "hit_dice_total", "hit_dice_spent", "death_successes", "death_failures"] },
    { id: "spellcasting", label: "Spellcasting", fields: ["uses_magic", "spellcasting_ability", "spell_save_dc", "spell_attack_bonus"] },
    { id: "spell_slots", label: "Spell Slots", parent: "spellcasting", fields: ["slot_1_max", "slot_1_used", "slot_2_max", "slot_2_used", "slot_3_max", "slot_3_used", "slot_4_max", "slot_4_used", "slot_5_max", "slot_5_used", "slot_6_max", "slot_6_used", "slot_7_max", "slot_7_used", "slot_8_max", "slot_8_used", "slot_9_max", "slot_9_used"] },
    { id: "roleplay", label: "Roleplaying", fields: ["personality_traits", "ideals", "bonds", "flaws", "notes"] },
    { id: "storage", label: "Structured Data", fields: ["proficiencies_data", "attacks_data", "equipment_data", "features_data", "spells_data", "resources_data", "conditions_data"] },
  ] },
  computed,
  vitals: [{ id: "current_hp", label: "Hit Points", max: "actor.max_hp", depletion: "defeat" }],
  collections: [
    { id: "proficiencies", label: "Proficiencies & Languages", storageField: "proficiencies_data", minItems: 0, maxItems: 64, primaryField: "name", itemFields: {
      name: text("Name", 120), type: choice("Type", ["Skill", "Saving Throw", "Armor", "Weapon", "Tool", "Language", "Other"], "Other"), expertise: bool("Expertise"), notes: text("Notes", 240),
    } },
    { id: "attacks", label: "Attacks & Spell Attacks", storageField: "attacks_data", minItems: 0, maxItems: 48, primaryField: "name", itemFields: {
      name: text("Name", 120), ability: choice("Ability", ["strength", "dexterity", "intelligence", "wisdom", "charisma"], "strength"), proficient: bool("Proficient", true),
      magic_bonus: integer("Magic / misc. bonus", -20, 20, 0), damage: text("Damage", 100), damage_type: choice("Damage Type", DAMAGE_TYPES, "Slashing"), range: text("Range", 80), notes: text("Notes", 240),
    } },
    { id: "equipment", label: "Equipment", storageField: "equipment_data", minItems: 0, maxItems: 64, primaryField: "name", itemFields: {
      name: text("Name", 120), quantity: integer("Quantity", 0, 9999, 1), weight: integer("Weight (tenths)", 0, 999999, 0), equipped: bool("Equipped"), attuned: bool("Attuned"), notes: text("Notes", 240),
    } },
    { id: "features", label: "Features & Traits", storageField: "features_data", minItems: 0, maxItems: 64, primaryField: "name", itemFields: {
      name: text("Name", 160), source: text("Source", 120), level: integer("Level", 0, 20, 0), uses_max: integer("Uses", 0, 999, 0), uses_spent: integer("Uses Spent", 0, 999, 0),
      recharge: choice("Recharge", ["None", "Short Rest", "Long Rest", "Special"], "None"), notes: text("Description / Notes", 400),
    } },
    { id: "resources", label: "Class & Character Resources", storageField: "resources_data", minItems: 0, maxItems: 48, primaryField: "name", itemFields: {
      name: text("Name", 120), current: integer("Current", 0, 9999, 0), maximum: integer("Maximum", 0, 9999, 0), recharge: choice("Recharge", ["None", "Short Rest", "Long Rest", "Special"], "Long Rest"), notes: text("Notes", 240),
    } },
    { id: "spells", label: "Spells", storageField: "spells_data", minItems: 0, maxItems: 64, primaryField: "name", itemFields: {
      name: text("Name", 160), level: integer("Spell Level", 0, 9, 0), school: choice("School", SPELL_SCHOOLS, "Evocation"), prepared: bool("Prepared"), ritual: bool("Ritual"), concentration: bool("Concentration"),
      casting_time: text("Casting Time", 80), range: text("Range", 80), duration: text("Duration", 80), components: text("Components", 120), notes: text("Description / Notes", 400),
    } },
    { id: "conditions", label: "Conditions & Effects", storageField: "conditions_data", minItems: 0, maxItems: 32, primaryField: "name", itemFields: {
      name: choice("Name", CONDITION_NAMES, "Other"), source: text("Source", 120), duration: text("Duration", 120), notes: text("Effect / Notes", 400),
    } },
  ],
  presentation: { schemaVersion: 3, root: [
    { kind: "group", id: "identity-ui", label: "Character", render: "grid", children: [
      { kind: "field", id: "character-name-ui", ref: "character_name" }, { kind: "field", id: "class-ui", ref: "class_name" }, { kind: "field", id: "subclass-ui", ref: "subclass" }, { kind: "field", id: "level-ui", ref: "level" },
      { kind: "field", id: "background-ui", ref: "background" }, { kind: "field", id: "ancestry-ui", ref: "ancestry" }, { kind: "field", id: "alignment-ui", ref: "alignment" },
      { kind: "field", id: "experience-ui", ref: "experience" }, { kind: "field", id: "size-ui", ref: "size" }, { kind: "field", id: "inspiration-ui", ref: "inspiration" }, { kind: "field", id: "player-name-ui", ref: "player_name" },
    ] },
    { kind: "group", id: "abilities-ui", label: "Abilities", render: "grid", children: ABILITIES.flatMap(ability => [
      { kind: "field" as const, id: `${ability}-ui`, ref: ability }, { kind: "computed" as const, id: `${ability}-modifier-ui`, ref: `${ability}_modifier` },
    ]) },
    { kind: "group", id: "combat-ui", label: "Combat", render: "cards", children: [
      { kind: "field", id: "armor-class-ui", ref: "armor_class" }, { kind: "computed", id: "initiative-ui", ref: "initiative" }, { kind: "field", id: "speed-ui", ref: "speed" },
      { kind: "vital", id: "hp-ui", ref: "current_hp" }, { kind: "field", id: "temp-hp-ui", ref: "temp_hp" }, { kind: "field", id: "hit-dice-total-ui", ref: "hit_dice_total" }, { kind: "field", id: "hit-dice-spent-ui", ref: "hit_dice_spent" },
      { kind: "field", id: "death-success-ui", ref: "death_successes" }, { kind: "field", id: "death-failure-ui", ref: "death_failures" },
      { kind: "collection", id: "attacks-ui", ref: "attacks", render: "table" },
      { kind: "actions", id: "combat-actions-ui", label: "Combat Rolls", refs: ["initiative_roll", "attack_strength", "attack_dexterity", "death_save"] },
    ] },
    { kind: "group", id: "skills-ui", label: "Checks, Skills & Saves", render: "cards", children: [
      { kind: "computed", id: "proficiency-ui", ref: "proficiency_bonus" }, { kind: "computed", id: "passive-perception-ui", ref: "passive_perception" },
      { kind: "collection", id: "proficiencies-ui", ref: "proficiencies", render: "table" },
      { kind: "actions", id: "skill-actions-ui", label: "Skill Checks", refs: skills.map(row => row.id) },
      { kind: "actions", id: "save-actions-ui", label: "Saving Throws", refs: saves.map(row => row.id) },
      { kind: "actions", id: "ability-actions-ui", label: "Ability Checks", refs: abilityChecks.map(row => row.id) },
    ] },
    { kind: "group", id: "features-ui", label: "Features & Resources", render: "cards", children: [
      { kind: "collection", id: "features-collection-ui", ref: "features", render: "cards" }, { kind: "collection", id: "resources-collection-ui", ref: "resources", render: "table" },
    ] },
    { kind: "group", id: "inventory-ui", label: "Equipment", render: "cards", children: [{ kind: "collection", id: "equipment-collection-ui", ref: "equipment", render: "table" }] },
    { kind: "group", id: "spellcasting-ui", label: "Spellcasting", render: "cards", visibleIf: "actor.uses_magic", collapsible: true, children: [
      { kind: "field", id: "spellcasting-ability-ui", ref: "spellcasting_ability" }, { kind: "field", id: "spell-save-dc-ui", ref: "spell_save_dc" }, { kind: "field", id: "spell-attack-bonus-ui", ref: "spell_attack_bonus" },
      ...Array.from({ length: 9 }, (_, index) => ({ kind: "group" as const, id: `slot-${index + 1}-ui`, label: `Level ${index + 1} Slots`, render: "compact" as const, children: [
        { kind: "field" as const, id: `slot-${index + 1}-max-ui`, ref: `slot_${index + 1}_max` }, { kind: "field" as const, id: `slot-${index + 1}-used-ui`, ref: `slot_${index + 1}_used` },
      ] })),
      { kind: "collection", id: "spells-ui", ref: "spells", render: "cards" }, { kind: "actions", id: "spell-actions-ui", label: "Spell Rolls", refs: ["spell_attack", "attack_intelligence", "attack_wisdom", "attack_charisma"] },
    ] },
    { kind: "group", id: "conditions-ui", label: "Conditions & Effects", render: "cards", children: [{ kind: "collection", id: "conditions-collection-ui", ref: "conditions", render: "cards" }] },
    { kind: "group", id: "roleplay-ui", label: "Roleplaying & Notes", render: "cards", collapsible: true, children: [
      { kind: "field", id: "traits-ui", ref: "personality_traits" }, { kind: "field", id: "ideals-ui", ref: "ideals" }, { kind: "field", id: "bonds-ui", ref: "bonds" }, { kind: "field", id: "flaws-ui", ref: "flaws" }, { kind: "field", id: "notes-ui", ref: "notes" },
    ] },
  ] },
  actions,
  migrations: [],
});
