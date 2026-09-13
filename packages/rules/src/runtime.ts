// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import type { Scalar } from "./formula.ts";
import type { FieldSchema, PackagePin } from "./package.ts";
import { abilityOverview, evaluateComputedFields, evaluateVitals, parseSupportedRulePackage,
  supportedPackageContentHash, validatePackageFields, type AbilityOverview, type AnyRulePackage,
  type RuleAbility, type RuleCondition, type VitalReading } from "./package-v2.ts";
import { RuleValidationError, deepFreeze } from "./validation.ts";

/** Read model, not a second rules engine. Only the host calls the builders below. */
export const RULE_RUNTIME_CONTRACT = 1 as const;
export interface RuleRuntimeIdentity {
  readonly contractVersion: typeof RULE_RUNTIME_CONTRACT;
  readonly pin: PackagePin;
  readonly contentHash: string;
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
  readonly actions: readonly { readonly id: string; readonly name: string }[];
}
export interface RuleRuntimePreview extends RuleRuntimeIdentity {
  readonly valid: boolean;
  readonly errors: readonly string[];
  /** Null on failure: never present stale, partly evaluated or silently repaired values. */
  readonly fields: Readonly<Record<string, Scalar>> | null;
  readonly computed: Readonly<Record<string, number>>;
  readonly vitals: readonly VitalReading[];
  readonly abilities: AbilityOverview | null;
}
function identity(pkg: AnyRulePackage): RuleRuntimeIdentity {
  return { contractVersion: RULE_RUNTIME_CONTRACT, pin: { id: pkg.id, version: pkg.version }, contentHash: supportedPackageContentHash(pkg) };
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
    actions: pkg.actions.map(({ id, name }) => ({ id, name })),
  });
}
/** Deterministic, side-effect-free evaluation. No dice, actor mutation, activation or fallback package. */
export function previewRuleRuntime(input: AnyRulePackage, values: unknown): RuleRuntimePreview {
  const pkg = parseSupportedRulePackage(input), base = identity(pkg);
  try {
    const fields = validatePackageFields(pkg, values);
    return deepFreeze({ ...base, valid: true, errors: [], fields,
      computed: evaluateComputedFields(pkg, fields), vitals: evaluateVitals(pkg, fields), abilities: abilityOverview(pkg, fields) });
  } catch (error) {
    if (!(error instanceof RuleValidationError)) throw error;
    return deepFreeze({ ...base, valid: false, errors: [error.message], fields: null, computed: {}, vitals: [], abilities: null });
  }
}
