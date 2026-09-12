// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { CHRONICLE_HEROES_PACKAGE, CHRONICLE_FIELD_LABELS, CHRONICLE_SKILL_LIBRARY, CHRONICLE_RULE_GUIDANCE, type AnyRulePackage, type ChronicleExampleCharacter, type ChronicleSkill, type RulePackageV2 } from "@chronicle/rules";
import { aktuelleSprache, spracheStand, t } from "../i18n";

const template = CHRONICLE_HEROES_PACKAGE;
const skillById = new Map(CHRONICLE_SKILL_LIBRARY.map(skill => [skill.id, skill]));
const sourceUrl = "/packages/rules/src/templates/chronicle-heroes.ts";
const exact = (value: string, original: string | undefined) => value === original ? t(value) : value;
const cache = new WeakMap<AnyRulePackage, { revision: number; value: AnyRulePackage }>();

export function chronicleSkillLabel(skill: ChronicleSkill): string { return exact(skill.label, skillById.get(skill.id)?.label); }

/** A display copy only. Never install, hash or save this copy as a rule package.
 * Translation requires both the stable template identity and its unchanged source wording.
 * Defaults, enums, expressions, IDs, versions, self-tests and player-authored text are preserved.
 */
export function displayRulePackage<T extends AnyRulePackage>(pkg: T): T {
  if (aktuelleSprache() !== "en" || pkg.schemaVersion !== 2 || !pkg.attribution?.sources.some(source => source.url.includes(sourceUrl))) return pkg;
  const cached = cache.get(pkg), revision = spracheStand();
  if (cached?.revision === revision) return cached.value as T;
  const fieldLabel = (id: string): string | undefined => {
    if (template.fields[id]) return template.fields[id]!.label;
    if (!/^(skill|bonus)_/.test(id)) return undefined;
    const skill = skillById.get(id.replace(/^(skill|bonus)_/, ""));
    return skill ? `${skill.label} · ${id.startsWith("skill_") ? "Punkte" : "Talentbonus"}` : undefined;
  };
  const view: RulePackageV2 = { ...pkg,
    fields: Object.fromEntries(Object.entries(pkg.fields).map(([id, field]) => [id, { ...field, label: exact(field.label, fieldLabel(id)) }])),
    layout: { ...pkg.layout, sections: pkg.layout.sections.map(section => ({ ...section, label: exact(section.label, template.layout.sections.find(row => row.id === section.id)?.label) })) },
    computed: pkg.computed?.map(field => ({ ...field, label: exact(field.label, template.computed?.find(row => row.id === field.id)?.label ?? (skillById.has(field.id.slice(10)) && field.id.startsWith("effective_") ? `${skillById.get(field.id.slice(10))!.label} · Wert` : undefined)) })),
    vitals: pkg.vitals?.map(vital => ({ ...vital, label: exact(vital.label, template.vitals?.find(row => row.id === vital.id)?.label) })),
    constraints: pkg.constraints?.map(assertion => {
      const skill = assertion.id.startsWith("skill_valid_") ? skillById.get(assertion.id.slice(12)) : undefined;
      const original = template.constraints?.find(row => row.id === assertion.id)?.message ?? (skill ? `${skill.label}: Wert über 100. Punkte umverteilen oder den Talentbonus ausdrücklich abwählen.` : undefined);
      return { ...assertion, message: exact(assertion.message, original) };
    }),
    abilities: pkg.abilities?.map(ability => {
      const original = template.abilities?.find(row => row.id === ability.id);
      return { ...ability, name: exact(ability.name, original?.name), group: exact(ability.group, original?.group), text: exact(ability.text, original?.text) };
    }),
    conditions: pkg.conditions?.map(condition => {
      const original = template.conditions?.find(row => row.id === condition.id);
      return { ...condition, name: exact(condition.name, original?.name), text: exact(condition.text, original?.text) };
    }),
    actions: pkg.actions.map(action => {
      const skill = action.id.startsWith("skill_") ? skillById.get(action.id.slice(6)) : undefined;
      const original = template.actions.find(row => row.id === action.id) ?? (skill ? template.actions.find(row => row.id === "skill_athletik") : undefined);
      const skillDisclosure = skill ? `Fertigkeitsprobe ${CHRONICLE_FIELD_LABELS[skill.field]}: gespeicherte Punkte plus gewählter Talentbonus, dazu Fähigkeiten und Zustände; ein W100. ${CHRONICLE_RULE_GUIDANCE.probe}` : undefined;
      return { ...action, name: exact(action.name, skill?.label ?? original?.name), disclosure: exact(action.disclosure, skillDisclosure ?? original?.disclosure),
        inputs: Object.fromEntries(Object.entries(action.inputs).map(([id, field]) => [id, { ...field, label: exact(field.label, original?.inputs[id]?.label) }])),
        preconditions: action.preconditions?.map(condition => ({ ...condition, message: exact(condition.message, original?.preconditions?.find(row => row.id === condition.id)?.message) })),
        ...(action.outcome ? { outcome: { ...action.outcome, bands: action.outcome.bands.map(band => ({ ...band, label: exact(band.label, original?.outcome?.bands.find(row => row.id === band.id)?.label) })),
          fallback: { ...action.outcome.fallback, label: exact(action.outcome.fallback.label, original?.outcome?.fallback.label) } } } : {}),
      };
    }),
    attribution: pkg.attribution ? { ...pkg.attribution,
      title: exact(pkg.attribution.title, template.attribution?.title), notice: exact(pkg.attribution.notice, template.attribution?.notice), changes: exact(pkg.attribution.changes, template.attribution?.changes),
      sources: pkg.attribution.sources.map(source => { const original = template.attribution?.sources.find(row => row.url === source.url); return { ...source, title: exact(source.title, original?.title), revision: exact(source.revision, original?.revision) }; }),
    } : undefined,
  };
  // Optional declarations must stay absent, not become own properties with undefined values:
  // the shared rule engine deliberately accepts JSON only, including for an ability overview.
  const value = JSON.parse(JSON.stringify(view)) as T;
  cache.set(pkg, { revision, value });
  return value;
}

/** Examples are explicit new drafts; stored names and notes never pass through this helper. */
export function displayChronicleExample(example: ChronicleExampleCharacter): ChronicleExampleCharacter {
  return { ...example, name: t(example.name), description: t(example.description), fields: { ...example.fields,
    name: t(String(example.fields.name)), profession: t(String(example.fields.profession)), notes: t(String(example.fields.notes)),
  } };
}
