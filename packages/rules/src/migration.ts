// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { evaluateFormula, type Scalar } from "./formula.ts";
import { parseRulePackage, validateEntityFields, type PackagePin, type RulePackage } from "./package.ts";
import { deepFreeze, fail, record, snapshotJson, stableJson, string } from "./validation.ts";

export interface MigrationEntity { readonly id: string; readonly fields: Readonly<Record<string, Scalar>> }
export interface MigrationPreview {
  readonly from: PackagePin;
  readonly to: PackagePin;
  readonly requiresConfirmation: true;
  readonly entities: readonly {
    readonly id: string;
    readonly before: Readonly<Record<string, Scalar>>;
    readonly after: Readonly<Record<string, Scalar>>;
    readonly archived: Readonly<Record<string, Scalar>>;
    readonly changes: readonly string[];
  }[];
}

/** Dry-run only: callers explicitly commit this proposal with a campaign version guard.
 * Saved rolls, their contexts, their traces, and old package versions are never inputs.
 */
export function previewPackageMigration(oldPackage: RulePackage, newPackage: RulePackage, input: readonly MigrationEntity[]): MigrationPreview {
  const from = parseRulePackage(oldPackage); const to = parseRulePackage(newPackage);
  if (from.id !== to.id || from.version === to.version) fail("migration: different versions of the same package required");
  const migration = to.migrations.find(m => m.from === from.version && m.to === to.version);
  if (!migration) fail("migration: explicit direct migration required");
  const entities = snapshotJson(input); if (!Array.isArray(entities) || entities.length > 2048) fail("migration: invalid entity batch");
  const seen = new Set<string>();
  const migrated = entities.map(item => {
    const row = record(item, "entity"); const id = string(row.id, "entity id"); if (seen.has(id)) fail("migration: duplicate entity id"); seen.add(id);
    const before = validateEntityFields(from.fields, row.fields); const values = { ...before }; const archived: Record<string, Scalar> = {}; const changes: string[] = [];
    for (const step of migration.steps) {
      switch (step.kind) {
        case "rename":
          if (!Object.hasOwn(values, step.from) || Object.hasOwn(values, step.to)) fail("migration rename: missing source or occupied target");
          values[step.to] = values[step.from]!; delete values[step.from]; changes.push(`rename ${step.from} -> ${step.to}`); break;
        case "add":
          if (Object.hasOwn(values, step.field)) fail("migration add: field already exists");
          values[step.field] = step.value; changes.push(`add ${step.field}`); break;
        case "archive":
          if (!Object.hasOwn(values, step.field) || Object.hasOwn(archived, step.field)) fail("migration archive: missing field or duplicate archival");
          archived[step.field] = values[step.field]!; delete values[step.field]; changes.push(`archive ${step.field}`); break;
        case "numeric": {
          if (typeof values[step.field] !== "number") fail("migration numeric: numeric field required");
          const result = evaluateFormula(step.expression, { seed: "00000000000000000000000000000001", actor: { value: values[step.field]! }, input: {}, knowledge: { actorId: id, passages: [] } });
          values[step.field] = result.value; changes.push(`transform ${step.field}`); break;
        }
      }
    }
    // New fields must be explicitly introduced by a migration, not silently defaulted.
    if (stableJson(Object.keys(values).sort()) !== stableJson(Object.keys(to.fields).sort())) fail("migration: final fields differ from target schema; explicit add/archive required");
    const after = validateEntityFields(to.fields, values);
    return { id, before, after, archived, changes };
  });
  return deepFreeze({ from: { id: from.id, version: from.version }, to: { id: to.id, version: to.version }, requiresConfirmation: true, entities: migrated });
}
