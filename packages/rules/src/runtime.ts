// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { evaluateFormula, type Scalar } from "./formula.ts";
import type { FieldSchema, PackagePin } from "./package.ts";
import { abilityOverview, evaluateComputedFields, evaluateVitals, parseSupportedRulePackage,
  supportedPackageContentHash, validatePackageFields, type AbilityOverview, type AnyRulePackage,
  type ModifierTarget, type RuleAbility, type RuleCondition, type VitalReading } from "./package-v2.ts";
import { RuleValidationError, deepFreeze } from "./validation.ts";

/** Read model, not a second rules engine. Only the host calls the builders below. */
export const RULE_RUNTIME_CONTRACT = 1 as const;
const ENGINE_ACTION_INPUTS = new Set(["einsatz", "mod_ziel", "mod_ergebnis"]);
const DISPLAY_SEED = "00000000000000000000000000000001";
export interface RuleRuntimeIdentity {
  readonly contractVersion: typeof RULE_RUNTIME_CONTRACT;
  readonly pin: PackagePin;
  readonly contentHash: string;
}
export interface RuleRuntimeAction {
  readonly id: string;
  readonly name: string;
  readonly disclosure: string;
  /** Only fields a human may enter. Engine-owned modifier/ability fields stay on the host contract. */
  readonly inputs: Readonly<Record<string, FieldSchema>>;
  readonly acceptsAbilityUse: boolean;
  /** Outcome-band actions need table confirmation and are deliberately excluded from threshold doors. */
  readonly delegable: boolean;
}
export interface RuleRuntimeAbilityUse { readonly id: string; readonly name: string; readonly cost: number; readonly text: string }
export interface RuleRuntimePassiveEffect {
  readonly id: string; readonly name: string; readonly source: "ability" | "condition";
  readonly target: ModifierTarget; readonly value: number;
}
export interface RuleRuntimeActionState {
  readonly actionId: string;
  readonly abilities: readonly RuleRuntimeAbilityUse[];
  readonly passive: readonly RuleRuntimePassiveEffect[];
}
export interface RuleRuntime extends RuleRuntimeIdentity {
  readonly name: string;
  readonly fields: Readonly<Record<string, FieldSchema>>;
  readonly sections: readonly { readonly id: string; readonly label: string; readonly fields: readonly string[] }[];
  readonly defaults: Readonly<Record<string, Scalar>>;
  readonly computed: readonly { readonly id: string; readonly label: string }[];
  readonly abilityField: string | null;
  readonly conditionField: string | null;
  readonly abilities: readonly Pick<RuleAbility, "id" | "name" | "group" | "rank" | "kind" | "cost" | "price" | "requires" | "text">[];
  readonly conditions: readonly Pick<RuleCondition, "id" | "name" | "text">[];
  readonly actions: readonly RuleRuntimeAction[];
}
export interface RuleRuntimePreview extends RuleRuntimeIdentity {
  readonly valid: boolean;
  readonly errors: readonly string[];
  /** Null on failure: never present stale, partly evaluated or silently repaired values. */
  readonly fields: Readonly<Record<string, Scalar>> | null;
  readonly computed: Readonly<Record<string, number>>;
  readonly vitals: readonly VitalReading[];
  readonly abilities: AbilityOverview | null;
  readonly actionStates: readonly RuleRuntimeActionState[];
}
function identity(pkg: AnyRulePackage): RuleRuntimeIdentity {
  return { contractVersion: RULE_RUNTIME_CONTRACT, pin: { id: pkg.id, version: pkg.version }, contentHash: supportedPackageContentHash(pkg) };
}
const actionMatches = (pattern: string, actionId: string) => pattern.endsWith("*") ? actionId.startsWith(pattern.slice(0, -1)) : pattern === actionId;
const selected = (value: Scalar | undefined): string[] => typeof value === "string" ? [...new Set(value.split(/[\s,]+/).filter(Boolean))] : [];
function actionStates(pkg: AnyRulePackage, fields: Readonly<Record<string, Scalar>>): readonly RuleRuntimeActionState[] {
  if (pkg.schemaVersion !== 2 || !pkg.abilityRules) return [];
  const learnedIds = new Set(selected(fields[pkg.abilityRules.abilityField]));
  const activeConditions = new Set(pkg.abilityRules.conditionField ? selected(fields[pkg.abilityRules.conditionField]) : []);
  const abilities = pkg.abilities ?? [], conditions = pkg.conditions ?? [];
  const actorContext = { seed: DISPLAY_SEED, actor: fields, input: {}, knowledge: { actorId: "rule-runtime", passages: [] } } as const;
  const numeric = (source: string): number => {
    const value = evaluateFormula(source, actorContext).value;
    if (typeof value !== "number" || !Number.isFinite(value)) throw new RuleValidationError("runtime modifier: expected finite number");
    return value;
  };
  return pkg.actions.map(action => {
    const accepts = !!action.inputs.einsatz;
    const candidates = accepts ? abilities.filter(ability => learnedIds.has(ability.id) && ability.kind !== "dauerhaft"
      && (ability.modifiers ?? []).some(modifier => modifier.actions.some(pattern => actionMatches(pattern, action.id))))
      .map(({ id, name, cost, text }) => ({ id, name, cost, text })) : [];
    const passive: RuleRuntimePassiveEffect[] = [];
    for (const condition of conditions) if (activeConditions.has(condition.id)) for (const modifier of condition.modifiers ?? [])
      if (modifier.actions.some(pattern => actionMatches(pattern, action.id))) passive.push({ id: condition.id, name: condition.name, source: "condition", target: modifier.target, value: numeric(modifier.value) });
    for (const ability of abilities) if (learnedIds.has(ability.id) && ability.kind === "dauerhaft") for (const modifier of ability.modifiers ?? [])
      if (modifier.actions.some(pattern => actionMatches(pattern, action.id))) passive.push({ id: ability.id, name: ability.name, source: "ability", target: modifier.target, value: numeric(modifier.value) });
    return { actionId: action.id, abilities: candidates, passive };
  });
}
export function buildRuleRuntime(input: AnyRulePackage): RuleRuntime {
  const pkg = parseSupportedRulePackage(input), v2 = pkg.schemaVersion === 2 ? pkg : null;
  const sections = pkg.layout.sections.map(section => ({ ...section, fields: [...section.fields] }));
  const placed = new Set(sections.flatMap(section => section.fields));
  const remaining = Object.keys(pkg.fields).filter(id => !placed.has(id));
  // Imported layouts may omit fields. They must remain editable, not disappear from the sheet.
  if (remaining.length) {
    let id = "runtime_unplaced";
    while (sections.some(section => section.id === id)) id += "_";
    sections.push({ id, label: "Weitere Felder", fields: remaining });
  }
  return deepFreeze({ ...identity(pkg), name: pkg.name, fields: pkg.fields, sections,
    // Defaults may still violate a cross-field constraint; preview reports that instead of
    // making the entire editor inaccessible. Nothing is saved by loading the manifest.
    defaults: Object.fromEntries(Object.entries(pkg.fields).map(([id, field]) => [id, field.default])),
    computed: (v2?.computed ?? []).map(({ id, label }) => ({ id, label })),
    abilityField: v2?.abilityRules?.abilityField ?? null,
    conditionField: v2?.abilityRules?.conditionField ?? null,
    abilities: (v2?.abilities ?? []).map(({ id, name, group, rank, kind, cost, price, requires, text }) =>
      ({ id, name, group, rank, kind, cost, price, ...(requires ? { requires } : {}), text })),
    conditions: (v2?.conditions ?? []).map(({ id, name, text }) => ({ id, name, text })),
    actions: pkg.actions.map(action => ({ id: action.id, name: action.name, disclosure: action.disclosure,
      inputs: Object.fromEntries(Object.entries(action.inputs).filter(([id]) => !(v2?.abilityRules && ENGINE_ACTION_INPUTS.has(id)))),
      acceptsAbilityUse: !!(v2?.abilityRules && action.inputs.einsatz), delegable: !(v2?.actions.find(candidate => candidate.id === action.id)?.outcome) })),
  });
}
/** Deterministic, side-effect-free evaluation. No dice, actor mutation, activation or fallback package. */
export function previewRuleRuntime(input: AnyRulePackage, values: unknown): RuleRuntimePreview {
  const pkg = parseSupportedRulePackage(input), base = identity(pkg);
  try {
    const fields = validatePackageFields(pkg, values);
    return deepFreeze({ ...base, valid: true, errors: [], fields,
      computed: evaluateComputedFields(pkg, fields), vitals: evaluateVitals(pkg, fields), abilities: abilityOverview(pkg, fields), actionStates: actionStates(pkg, fields) });
  } catch (error) {
    if (!(error instanceof RuleValidationError)) throw error;
    return deepFreeze({ ...base, valid: false, errors: [error.message], fields: null, computed: {}, vitals: [], abilities: null, actionStates: [] });
  }
}
