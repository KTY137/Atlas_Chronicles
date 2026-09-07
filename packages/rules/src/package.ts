// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { ENGINE_VERSION, RNG_ALGORITHM, evaluateFormula, inferFormulaType, parseEvaluationContext, parseFormula, type EvaluationContext, type Formula, type FormulaResult, type FormulaType, type Scalar } from "./formula.ts";
import { array, deepFreeze, fail, finite, identifier, integer, keys, parseBoundedJson, record, semver, snapshotJson, stableJson, string, RULE_LIMITS } from "./validation.ts";

export const RULE_PACKAGE_SCHEMA_VERSION = 1 as const;
export interface FieldSchema {
  readonly type: "integer" | "number" | "boolean" | "string";
  readonly label: string;
  readonly default: Scalar;
  readonly minimum?: number;
  readonly maximum?: number;
  readonly maxLength?: number;
  readonly enum?: readonly string[];
}
export interface RuleAction {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly expression: string;
  readonly inputs: Readonly<Record<string, FieldSchema>>;
  /** Visible explanation of which knowledge predicates affect this action. */
  readonly disclosure: string;
  readonly requiresConfirmation: true;
  readonly threshold?: number;
}
export type MigrationStep =
  | { readonly kind: "rename"; readonly from: string; readonly to: string }
  | { readonly kind: "add"; readonly field: string; readonly value: Scalar }
  | { readonly kind: "archive"; readonly field: string }
  | { readonly kind: "numeric"; readonly field: string; readonly expression: string };
export interface RuleMigration { readonly from: string; readonly to: string; readonly steps: readonly MigrationStep[] }
export interface RulePackage {
  readonly schemaVersion: 1;
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly engineVersion: typeof ENGINE_VERSION;
  readonly license: string;
  readonly authors: readonly string[];
  readonly fields: Readonly<Record<string, FieldSchema>>;
  readonly layout: { readonly sections: readonly { readonly id: string; readonly label: string; readonly fields: readonly string[] }[] };
  readonly actions: readonly RuleAction[];
  readonly migrations: readonly RuleMigration[];
  readonly selfTests?: readonly { readonly name: string; readonly actionId: string; readonly context: EvaluationContext; readonly expectedTotal: number }[];
}
export interface PackagePin { readonly id: string; readonly version: string }
export interface ActionResult extends Omit<FormulaResult, "value"> {
  readonly schemaVersion: 1;
  readonly engineVersion: typeof ENGINE_VERSION;
  readonly package: PackagePin;
  readonly action: { readonly id: string; readonly version: string };
  readonly context: EvaluationContext;
  readonly expression: string;
  readonly total: number;
  readonly requiresConfirmation: true;
  readonly success?: boolean;
}

export function validateFieldValue(schema: FieldSchema, value: unknown, at: string): Scalar {
  if (schema.type === "integer" || schema.type === "number") {
    const number = finite(value, at);
    if (schema.type === "integer" && !Number.isSafeInteger(number)) fail(`${at}: expected integer`);
    if (number < schema.minimum! || number > schema.maximum!) fail(`${at}: outside declared range`);
    return number;
  }
  if (schema.type === "boolean") { if (typeof value !== "boolean") fail(`${at}: expected boolean`); return value; }
  if (typeof value !== "string" || value.length > schema.maxLength!) fail(`${at}: invalid string length`);
  if (schema.enum && !schema.enum.includes(value)) fail(`${at}: invalid enum value`);
  return value;
}
function fieldSchemas(input: unknown, at: string): Readonly<Record<string, FieldSchema>> {
  const fields = record(input, at); if (Object.keys(fields).length > RULE_LIMITS.fields) fail(`${at}: too many fields`);
  for (const [id, value] of Object.entries(fields)) {
    identifier(id, at); const field = record(value, `${at}.${id}`);
    keys(field, ["type", "label", "default", "minimum", "maximum", "maxLength", "enum"], `${at}.${id}`);
    string(field.label, "field label", 120);
    if (field.type === "integer" || field.type === "number") {
      finite(field.minimum, "minimum"); finite(field.maximum, "maximum");
      if ((field.minimum as number) > (field.maximum as number)) fail("field: reversed range");
      if (field.type === "integer" && (!Number.isSafeInteger(field.minimum) || !Number.isSafeInteger(field.maximum))) fail("integer field: fractional bounds");
      if (field.maxLength !== undefined || field.enum !== undefined) fail("numeric field: string constraints forbidden");
    } else if (field.type === "string") {
      integer(field.maxLength, "maxLength", 1, 4096);
      if (field.minimum !== undefined || field.maximum !== undefined) fail("string field: numeric constraints forbidden");
      if (field.enum !== undefined) { const items = array(field.enum, "enum", 64).map(v => string(v, "enum value", field.maxLength as number)); if (!items.length || new Set(items).size !== items.length) fail("field: enum must be nonempty and unique"); }
    } else if (field.type === "boolean") {
      if (["minimum", "maximum", "maxLength", "enum"].some(key => field[key] !== undefined)) fail("boolean field: unsupported constraint");
    } else fail("field: unsupported type");
    validateFieldValue(field as unknown as FieldSchema, field.default, `${at}.${id}.default`);
  }
  return fields as unknown as Readonly<Record<string, FieldSchema>>;
}
function fieldTypes(fields: Readonly<Record<string, FieldSchema>>): Readonly<Record<string, FormulaType>> {
  return Object.fromEntries(Object.entries(fields).map(([id, field]) => [id, field.type === "integer" ? "number" : field.type]));
}
function includesDice(ast: Formula): boolean {
  switch (ast.kind) {
    case "dice": return true;
    case "literal": case "field": return false;
    case "unary": return includesDice(ast.value);
    case "binary": return includesDice(ast.left) || includesDice(ast.right);
    case "if": return includesDice(ast.condition) || includesDice(ast.then) || includesDice(ast.else);
    case "call": return ast.args.some(includesDice);
  }
}

/** The published v1 vocabulary is deliberately closed; unknown behavior is rejected. */
export function parseRulePackage(input: string | unknown): RulePackage {
  const data = record(typeof input === "string" ? parseBoundedJson(input) : snapshotJson(input), "package");
  keys(data, ["schemaVersion", "id", "name", "version", "engineVersion", "license", "authors", "fields", "layout", "actions", "migrations", "selfTests"], "package");
  if (data.schemaVersion !== RULE_PACKAGE_SCHEMA_VERSION) fail("package: unsupported schemaVersion; an explicit format migration is required");
  const id = string(data.id, "package id", 128); if (!/^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)+$/.test(id)) fail("package: invalid namespaced id");
  string(data.name, "package name", 120); const version = semver(data.version, "package version");
  if (data.engineVersion !== ENGINE_VERSION) fail(`package: requires unsupported engine; expected ${ENGINE_VERSION}`);
  string(data.license, "license", 120);
  if (!array(data.authors, "authors", 32).length) fail("package: author required");
  for (const author of data.authors as unknown[]) string(author, "author", 120);
  const fields = fieldSchemas(data.fields, "fields");
  const layout = record(data.layout, "layout"); keys(layout, ["sections"], "layout"); const sectionIds = new Set<string>();
  for (const item of array(layout.sections, "sections", 32)) {
    const section = record(item, "section"); keys(section, ["id", "label", "fields"], "section");
    const sectionId = identifier(section.id, "section id"); if (sectionIds.has(sectionId)) fail("layout: duplicate section id"); sectionIds.add(sectionId);
    string(section.label, "section label", 120); const refs = array(section.fields, "section fields", RULE_LIMITS.fields);
    if (new Set(refs).size !== refs.length) fail("layout: duplicate field reference");
    for (const ref of refs) if (typeof ref !== "string" || !Object.hasOwn(fields, ref)) fail("layout: unknown field reference");
  }
  const actionIds = new Set<string>();
  const actions = array(data.actions, "actions", RULE_LIMITS.actions); if (!actions.length) fail("package: action required");
  for (const item of actions) {
    const action = record(item, "action"); keys(action, ["id", "name", "version", "expression", "inputs", "disclosure", "requiresConfirmation", "threshold"], "action");
    const actionId = identifier(action.id, "action id"); if (actionIds.has(actionId)) fail("package: duplicate action id"); actionIds.add(actionId);
    string(action.name, "action name", 120); semver(action.version, "action version"); string(action.disclosure, "action disclosure", 1024);
    if (action.requiresConfirmation !== true) fail("action: human confirmation is mandatory");
    if (action.threshold !== undefined) finite(action.threshold, "threshold");
    const inputs = fieldSchemas(action.inputs, "action inputs");
    const ast = parseFormula(string(action.expression, "action expression", RULE_LIMITS.formulaLength));
    if (inferFormulaType(ast, { actor: fieldTypes(fields), input: fieldTypes(inputs) }) !== "number") fail("action: result must be numeric");
  }
  const migrationIds = new Set<string>();
  for (const item of array(data.migrations, "migrations", 64)) {
    const migration = record(item, "migration"); keys(migration, ["from", "to", "steps"], "migration");
    const from = semver(migration.from, "migration.from"); const to = semver(migration.to, "migration.to");
    if (from === to || to !== version) fail("migration: must target this package version from a different version");
    if (migrationIds.has(from)) fail("migration: duplicate source version"); migrationIds.add(from);
    for (const operation of array(migration.steps, "migration steps", 128)) {
      const step = record(operation, "migration step");
      switch (step.kind) {
        case "rename": keys(step, ["kind", "from", "to"], "rename"); identifier(step.from, "rename.from"); identifier(step.to, "rename.to"); if (step.from === step.to) fail("rename: identical fields"); break;
        case "add": keys(step, ["kind", "field", "value"], "add"); identifier(step.field, "add.field"); if (typeof step.value === "number") finite(step.value, "add.value"); else if (typeof step.value !== "boolean" && typeof step.value !== "string") fail("add: scalar required"); break;
        case "archive": keys(step, ["kind", "field"], "archive"); identifier(step.field, "archive.field"); break;
        case "numeric": {
          keys(step, ["kind", "field", "expression"], "numeric"); identifier(step.field, "numeric.field");
          const ast = parseFormula(string(step.expression, "numeric.expression", RULE_LIMITS.formulaLength));
          if (includesDice(ast)) fail("migration: dice forbidden");
          if (inferFormulaType(ast, { actor: { value: "number" }, input: {} }) !== "number") fail("migration: numeric result required");
          // Knowledge is an actor projection, never an implicit migration source.
          if (/\b(?:haelt|haelt_etikett|erfahrungsgrad)\s*\(/.test(step.expression as string)) fail("migration: knowledge predicates forbidden");
          break;
        }
        default: fail("migration: unsupported operation");
      }
    }
  }
  if (data.selfTests !== undefined) for (const item of array(data.selfTests, "selfTests", 64)) {
    const test = record(item, "selfTest"); keys(test, ["name", "actionId", "context", "expectedTotal"], "selfTest"); string(test.name, "selfTest.name", 120);
    if (typeof test.actionId !== "string" || !actionIds.has(test.actionId)) fail("selfTest: unknown action"); parseEvaluationContext(test.context); finite(test.expectedTotal, "expectedTotal");
  }
  return deepFreeze(data as unknown as RulePackage);
}

/** Applies declared defaults, validates every supplied value, rejects undeclared fields. */
export function validateEntityFields(fields: Readonly<Record<string, FieldSchema>>, input: unknown): Readonly<Record<string, Scalar>> {
  const data = record(snapshotJson(input), "entity"); keys(data, Object.keys(fields), "entity");
  const result: Record<string, Scalar> = {};
  for (const [id, field] of Object.entries(fields)) result[id] = validateFieldValue(field, Object.hasOwn(data, id) ? data[id] : field.default, `entity.${id}`);
  return deepFreeze(result);
}
export function defaultActorFields(pkg: RulePackage): Readonly<Record<string, Scalar>> {
  return validateEntityFields(parseRulePackage(pkg).fields, {});
}
export function evaluateAction(rawPackage: RulePackage, actionId: string, rawContext: EvaluationContext): ActionResult {
  const pkg = parseRulePackage(rawPackage); const action = pkg.actions.find(a => a.id === actionId);
  if (!action) fail("action: not found in pinned package");
  const context = parseEvaluationContext(rawContext);
  const resolved = deepFreeze({ ...context, actor: validateEntityFields(pkg.fields, context.actor), input: validateEntityFields(action.inputs, context.input ?? {}) });
  const { value, ...calculation } = evaluateFormula(action.expression, resolved);
  return deepFreeze({ schemaVersion: 1, engineVersion: ENGINE_VERSION, package: { id: pkg.id, version: pkg.version }, action: { id: action.id, version: action.version }, context: resolved,
    expression: action.expression, ...calculation, total: finite(value, "action total"), requiresConfirmation: true,
    ...(action.threshold === undefined ? {} : { success: (value as number) >= action.threshold }),
  });
}

export function replayAction(pkg: RulePackage, receipt: ActionResult): { readonly valid: boolean; readonly result?: ActionResult; readonly reason?: string } {
  try {
    const saved = record(snapshotJson(receipt), "receipt") as unknown as ActionResult;
    if (saved.engineVersion !== ENGINE_VERSION || saved.rngAlgorithm !== RNG_ALGORITHM) return { valid: false, reason: "unsupported replay engine" };
    if (saved.package.id !== pkg.id || saved.package.version !== pkg.version) return { valid: false, reason: "package pin does not match receipt" };
    const result = evaluateAction(pkg, saved.action.id, saved.context);
    return stableJson(result) === stableJson(saved) ? { valid: true, result } : { valid: false, reason: "receipt differs from deterministic replay" };
  } catch { return { valid: false, reason: "invalid receipt or package" }; }
}

/** Immutable version catalog. Installation is separate from campaign activation. */
export class RulePackageRegistry {
  readonly #packages = new Map<string, RulePackage>();
  install(input: unknown): RulePackage {
    const pkg = parseRulePackage(input); const key = `${pkg.id}@${pkg.version}`; const previous = this.#packages.get(key);
    if (previous && stableJson(previous) !== stableJson(pkg)) fail("package: immutable version already installed with different content");
    for (const test of pkg.selfTests ?? []) {
      const result = evaluateAction(pkg, test.actionId, test.context);
      if (result.total !== test.expectedTotal) fail(`package self-test failed: ${test.name}`);
    }
    this.#packages.set(key, previous ?? pkg); return previous ?? pkg;
  }
  get(pin: PackagePin): RulePackage {
    const pkg = this.#packages.get(`${pin.id}@${pin.version}`); if (!pkg) fail("package: pinned version is not installed"); return pkg;
  }
  list(): readonly RulePackage[] { return Object.freeze([...this.#packages.values()].sort((a, b) => `${a.id}@${a.version}` < `${b.id}@${b.version}` ? -1 : 1)); }
}
