// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { evaluateFormula, type Scalar } from "./formula.ts";
import { previewPackageMigration, type MigrationEntity, type MigrationPreview } from "./migration.ts";
import { parseSupportedRulePackage, validatePackageFields, type AnyRulePackage } from "./package-v2.ts";
import { deepFreeze, fail, record, snapshotJson, stableJson, string, RULE_LIMITS } from "./validation.ts";

/** Explicit direct same-ID transitions, including v1 -> v2. V2 -> v1 is not admitted.
 * No defaulted additions or implicit archival; source and target constraints both apply.
 * Each entity has three independently bounded phases: source field validation <=4096
 * operations, all numeric steps together <=4096, destination validation <=4096.
 * The <=12288 total permits two full 24-skill sheets without an unbounded batch: at
 * most 2048 entities and 128 explicitly declared steps per entity are admitted. */
export function previewSupportedPackageMigration(oldPackage: AnyRulePackage, newPackage: AnyRulePackage, input: readonly MigrationEntity[]): MigrationPreview {
  const from = parseSupportedRulePackage(oldPackage); const to = parseSupportedRulePackage(newPackage);
  if (from.schemaVersion === 1 && to.schemaVersion === 1) return previewPackageMigration(from, to, input);
  if (to.schemaVersion !== 2) fail("migration: schema downgrade is not supported");
  if (from.id !== to.id || from.version === to.version) fail("migration: different versions of the same package required");
  const migration = to.migrations.find(item => item.from === from.version && item.to === to.version);
  if (!migration) fail("migration: explicit direct migration required");
  const rows = snapshotJson(input); if (!Array.isArray(rows) || rows.length > 2048) fail("migration: invalid entity batch"); const seen = new Set<string>();
  const entities = rows.map(item => {
    const row = record(item, "entity"); const id = string(row.id, "entity id"); if (seen.has(id)) fail("migration: duplicate entity id"); seen.add(id);
    const before = validatePackageFields(from, row.fields); const values = { ...before }; const archived: Record<string, Scalar> = {}; const changes: string[] = []; let operations = 0;
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
          operations += result.operations; if (operations > RULE_LIMITS.operations) fail("migration: aggregate operation limit exceeded");
          values[step.field] = result.value; changes.push(`transform ${step.field}`); break;
        }
      }
    }
    if (stableJson(Object.keys(values).sort()) !== stableJson(Object.keys(to.fields).sort())) fail("migration: final fields differ from target schema; explicit add/archive required");
    return { id, before, after: validatePackageFields(to, values), archived, changes };
  });
  return deepFreeze({ from: { id: from.id, version: from.version }, to: { id: to.id, version: to.version }, requiresConfirmation: true, entities });
}
