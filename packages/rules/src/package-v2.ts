// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { ENGINE_VERSION, RNG_ALGORITHM, evaluateFormula, inferFormulaType, parseEvaluationContext, parseFormula, type EvaluationContext, type Formula, type FormulaFieldTypes, type FormulaResult, type FormulaType, type Scalar } from "./formula.ts";
import { evaluateAction, parseRulePackage, replayAction, validateEntityFields, type ActionResult, type FieldSchema, type PackagePin, type RuleAction, type RulePackage } from "./package.ts";
import { parseRuleCollections, parseRulePresentation, validateRuleCollections, type RuleCollection, type RulePresentationV3 } from "./presentation-v3.ts";
import { array, deepFreeze, fail, finite, identifier, keys, parseBoundedJson, record, snapshotJson, stableJson, string, RULE_LIMITS } from "./validation.ts";

export const RULE_PACKAGE_SCHEMA_VERSION_V2 = 2 as const;
export const OUTCOME_VERSION = "1.0.0" as const;
export interface ComputedField { readonly id: string; readonly label: string; readonly expression: string }
export interface RuleAssertion { readonly id: string; readonly message: string; readonly expression: string }
export type OutcomeComparison = "eq" | "lt" | "lte" | "gt" | "gte";
export interface OutcomeLabel { readonly id: string; readonly label: string; readonly success: boolean }
export interface OutcomeBand extends OutcomeLabel { readonly comparison: OutcomeComparison; readonly expression: string }
export interface RuleOutcome { readonly bands: readonly OutcomeBand[]; readonly fallback: OutcomeLabel }
export interface RuleAttribution {
  readonly title: string;
  readonly sources: readonly { readonly title: string; readonly url: string; readonly revision: string; readonly authors: readonly string[] }[];
  readonly licenseUrl: string; readonly notice: string; readonly changes: string;
}
/**
 * Ein Vitalwert ist ein Bogenfeld, das im Spiel steigt und fällt und dessen Erschöpfung eine
 * erklärte Folge hat — Leben, Mana, Ausdauer. Er ist ausdrücklich NICHT jede Zahl auf dem Bogen:
 * ein leergespielter Geistesblitz-Zähler ist kein Vitalwert und darf keine Niederlage auslösen.
 * Genau diese Verwechslung hat das Schema-v2-Verbot in `adjustResource` erzwungen
 * (`design/iterations/how-to-be-a-hero-20260906.md` §H1); die Deklaration hebt sie auf.
 */
export const VITAL_COLORS = ["red", "orange", "yellow", "green", "teal", "blue", "purple", "grey"] as const;
export type VitalColor = typeof VITAL_COLORS[number];
export interface RuleVital {
  /** Kennung eines vorhandenen Zahlenfelds dieses Pakets. */
  readonly id: string;
  readonly label: string;
  /** Deterministischer Zahlenausdruck über Bogenfelder — der Höchststand der Anzeige. */
  readonly max: string;
  /** Was Erreichen von 0 bedeutet. `defeat` stellt die Niederlage zur Bestätigung an. */
  readonly depletion: "defeat" | "none";
  /**
   * Farbe der Leiste. Ein Palettenname folgt den Signalfarben des jeweiligen Looks (auch eines
   * selbst gebauten) und bleibt so in hellen wie dunklen Looks lesbar; ein Farbwert `#rrggbb` ist
   * die freie Wahl der Spielleitung und gilt in jedem Look gleich. Fehlt sie, gilt die
   * Akzentfarbe. Optional und additiv: ein Paket ohne Farbe bleibt byteidentisch.
   */
  readonly color?: VitalColor | `#${string}`;
}
/**
 * Fähigkeiten und Zustände (Spec 2026-09-11-chronicleheroes-faehigkeiten). Die Formelsprache bleibt
 * unverändert: die Engine rechnet die passenden Modifikatoren vor dem Wurf aus und setzt ihre Summe in
 * die Parameter `mod_ziel`/`mod_ergebnis`, die eine Aktion dafür erklärt. So bleiben alte Quittungen
 * nachrechenbar, und die Aktion entscheidet selbst, wo die Zahl wirkt.
 */
export type ModifierTarget = "ziel" | "ergebnis";
export interface RuleModifier { readonly actions: readonly string[]; readonly target: ModifierTarget; readonly value: string }
export type AbilityKind = "dauerhaft" | "einsatz" | "reaktion";
export interface RuleAbility {
  readonly id: string; readonly name: string; readonly group: string; readonly rank: 1 | 2 | 3; readonly kind: AbilityKind;
  /** Funkenkosten beim Einsatz — ein Hinweis; abgehakt wird am Bogen, ein Wurf schreibt nichts. */
  readonly cost: number;
  /** Preis gegen `abilityRules.budget`. */
  readonly price: number;
  readonly requires?: readonly string[]; readonly prerequisite?: string; readonly text: string; readonly modifiers?: readonly RuleModifier[];
}
export interface RuleCondition { readonly id: string; readonly name: string; readonly text: string; readonly modifiers?: readonly RuleModifier[] }
export interface RuleAbilityRules { readonly abilityField: string; readonly conditionField?: string; readonly budget?: string }
export interface AppliedModifier { readonly source: "ability" | "condition"; readonly id: string; readonly target: ModifierTarget; readonly value: number }
export interface AbilityOverview { readonly learned: readonly string[]; readonly conditions: readonly string[]; readonly spent: number; readonly budget: number | null; readonly learnable: readonly string[] }
export interface RuleActionV2 extends RuleAction { readonly outcome?: RuleOutcome; readonly preconditions?: readonly RuleAssertion[] }
export interface RuleSelfTestV2 { readonly name: string; readonly actionId: string; readonly context: EvaluationContext; readonly expectedTotal: number; readonly expectedSuccess?: boolean; readonly expectedOutcomeId?: string }
export interface RulePackageV2 extends Omit<RulePackage, "schemaVersion" | "actions" | "selfTests"> {
  readonly schemaVersion: 2; readonly actions: readonly RuleActionV2[];
  readonly computed?: readonly ComputedField[]; readonly constraints?: readonly RuleAssertion[];
  readonly vitals?: readonly RuleVital[];
  readonly attribution?: RuleAttribution; readonly selfTests?: readonly RuleSelfTestV2[];
  readonly abilityRules?: RuleAbilityRules; readonly abilities?: readonly RuleAbility[]; readonly conditions?: readonly RuleCondition[];
  /** Optional universal UI layer. Mechanics stay schema v2; presentation itself is versioned independently. */
  readonly collections?: readonly RuleCollection[];
  readonly presentation?: RulePresentationV3;
}
/** Ein Vitalwert samt gemessenem Stand — die Zahlen, aus denen eine Anzeige entsteht. */
export interface VitalReading extends RuleVital {
  readonly value: number;
  readonly maximum: number;
  /** Der Vorrat ist aufgebraucht: `value <= 0`. */
  readonly depleted: boolean;
}
export interface ClassifiedOutcome extends OutcomeLabel {
  readonly matchedBand: number | null;
  readonly comparisons: readonly { readonly id: string; readonly comparison: OutcomeComparison; readonly threshold: number; readonly matched: boolean }[];
}
export interface OutcomeExpressionTrace extends FormulaResult { readonly id: string; readonly expression: string; readonly value: number }
export interface ActionResultV2 extends Omit<ActionResult, "schemaVersion"> {
  readonly schemaVersion: 2; readonly packageSchemaVersion: 2; readonly outcomeVersion: typeof OUTCOME_VERSION;
  /** Lowercase SHA-256 of UTF-8 stableJson(parseSupportedRulePackage(package)). */
  readonly packageContentHash: string;
  /** Actual formula operations across fields, preconditions, primary roll and every band. */
  readonly evaluationOperations: number;
  readonly outcome?: ClassifiedOutcome; readonly outcomeTrace?: readonly OutcomeExpressionTrace[];
  /** Nur bei Paketen mit `abilityRules`: welche Fähigkeit oder welcher Zustand wie viel beitrug. */
  readonly modifiers?: readonly AppliedModifier[];
}
export type AnyRulePackage = RulePackage | RulePackageV2;
export type AnyActionResult = ActionResult | ActionResultV2;

const comparisons: readonly OutcomeComparison[] = ["eq", "lt", "lte", "gt", "gte"];
/**
 * Pakete, die diese Engine selbst geprüft und tief eingefroren hat. Sie können sich nicht mehr ändern,
 * erneutes Prüfen ergäbe dasselbe — ohne dieses Gedächtnis prüfte jeder Wurf und jede Bogenprüfung
 * alle 200 Fähigkeiten von ChronicleHeroes von vorn und hashte dazu das ganze Paket. Kopien und
 * fremde Objekte stehen nicht darin und werden weiterhin vollständig geprüft.
 */
const geprueft = new WeakSet<object>();
const bekannt = (input: unknown): input is AnyRulePackage => typeof input === "object" && input !== null && geprueft.has(input);
const digests = new WeakMap<object, string>();
const types = (fields: Readonly<Record<string, FieldSchema>>): Readonly<Record<string, FormulaType>> => Object.fromEntries(Object.entries(fields).map(([id, field]) => [id, field.type === "integer" ? "number" : field.type]));
function deterministic(ast: Formula): void {
  switch (ast.kind) {
    case "dice": fail("declarative expression: dice forbidden");
    case "literal": case "field": return;
    case "unary": deterministic(ast.value); return;
    case "binary": deterministic(ast.left); deterministic(ast.right); return;
    case "if": deterministic(ast.condition); deterministic(ast.then); deterministic(ast.else); return;
    case "call":
      if (["haelt", "haelt_etikett", "erfahrungsgrad"].includes(ast.name)) fail("declarative expression: knowledge predicates forbidden");
      for (const argument of ast.args) deterministic(argument); return;
  }
}
function expression(value: unknown, expected: FormulaType, fields: FormulaFieldTypes): void {
  const ast = parseFormula(string(value, "expression", RULE_LIMITS.formulaLength)); deterministic(ast);
  if (inferFormulaType(ast, fields) !== expected) fail(`declarative expression: expected ${expected}`);
}
function uniqueId(value: unknown, seen: Set<string>, at: string): void {
  const id = identifier(value, `${at}.id`); if (seen.has(id)) fail(`${at}: duplicate id`); seen.add(id);
}
function assertions(input: unknown, maximum: number, fields: FormulaFieldTypes): void {
  const seen = new Set<string>();
  for (const item of array(input, "assertions", maximum)) {
    const row = record(item, "assertion"); keys(row, ["id", "message", "expression"], "assertion");
    uniqueId(row.id, seen, "assertion"); string(row.message, "assertion.message", 1024); expression(row.expression, "boolean", fields);
  }
}
function label(row: Record<string, unknown>, seen: Set<string>): void {
  uniqueId(row.id, seen, "outcome"); string(row.label, "outcome.label", 120);
  if (typeof row.success !== "boolean") fail("outcome: success must be boolean");
}
function httpUrl(value: unknown): void {
  const source = string(value, "source URL", 2048);
  if (!/^https?:\/\//.test(source) || source.includes("\\")) fail("source URL: expected absolute HTTP(S) URL");
  try { const url = new URL(source); if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || /[\u0000-\u0020\u007f]/.test(source)) fail("source URL: expected inert HTTP(S) URL"); }
  catch { fail("source URL: expected inert HTTP(S) URL"); }
}

function smallInteger(value: unknown, at: string, maximum: number): void {
  if (!Number.isSafeInteger(value) || (value as number) < 0 || (value as number) > maximum) fail(`${at}: expected an integer from 0 to ${maximum}`);
}
const actionMatches = (pattern: string, actionId: string): boolean => pattern.endsWith("*") ? actionId.startsWith(pattern.slice(0, -1)) : pattern === actionId;
/** Die drei optionalen Bausteine, geschlossen geprüft. Alles, was ein Wurf später braucht, steht hier fest. */
function abilityDeclarations(data: Record<string, unknown>, base: RulePackage, actorOnly: FormulaFieldTypes): void {
  if (data.abilityRules === undefined) fail("abilityRules: required when abilities or conditions are declared");
  const rules = record(data.abilityRules, "abilityRules"); keys(rules, ["abilityField", "conditionField", "budget"], "abilityRules");
  const textField = (value: unknown, at: string): void => {
    const field = base.fields[identifier(value, at)];
    if (!field || field.type !== "string" || field.enum || (field.maxLength ?? 0) < 64) fail(`${at}: expected a string field of this package with maxLength of at least 64`);
  };
  textField(rules.abilityField, "abilityRules.abilityField");
  if (rules.conditionField !== undefined) textField(rules.conditionField, "abilityRules.conditionField");
  if (data.conditions !== undefined && rules.conditionField === undefined) fail("abilityRules.conditionField: required when conditions are declared");
  if (rules.budget !== undefined) expression(rules.budget, "number", actorOnly);
  const modifiers = (input: unknown, at: string): void => {
    for (const item of array(input, `${at}.modifiers`, 4)) {
      const row = record(item, "modifier"); keys(row, ["actions", "target", "value"], "modifier");
      if (row.target !== "ziel" && row.target !== "ergebnis") fail(`${at}: modifier target must be "ziel" or "ergebnis"`);
      const parameter = `mod_${row.target}`, patterns = array(row.actions, `${at}.modifier.actions`, 16);
      if (!patterns.length) fail(`${at}: modifier needs at least one action`);
      for (const raw of patterns) {
        const pattern = string(raw, `${at}.modifier.action`, 97), prefix = pattern.endsWith("*") ? pattern.slice(0, -1) : null;
        if (prefix === null) identifier(pattern, `${at}.modifier.action`); else if (!/^[a-z][a-z0-9_-]*$/.test(prefix)) fail(`${at}: invalid action prefix ${pattern}`);
        const hits = base.actions.filter(action => actionMatches(pattern, action.id));
        if (prefix === null && !hits.length) fail(`${at}: unknown action ${pattern}`);
        for (const action of hits) {
          const schema = action.inputs[parameter];
          if (!schema || (schema.type !== "integer" && schema.type !== "number")) fail(`${at}: action ${action.id} must declare the number input ${parameter}`);
        }
      }
      expression(row.value, "number", actorOnly);
    }
  };
  const abilityIds = new Set<string>(), abilityRows = data.abilities === undefined ? [] : array(data.abilities, "abilities", 512).map(item => record(item, "ability"));
  for (const row of abilityRows) { keys(row, ["id", "name", "group", "rank", "kind", "cost", "price", "requires", "prerequisite", "text", "modifiers"], "ability"); uniqueId(row.id, abilityIds, "ability"); }
  for (const row of abilityRows) {
    const at = `ability ${String(row.id)}`;
    string(row.name, `${at}.name`, 120); string(row.group, `${at}.group`, 80); string(row.text, `${at}.text`, 600);
    if (row.rank !== 1 && row.rank !== 2 && row.rank !== 3) fail(`${at}: rank must be 1, 2 or 3`);
    if (row.kind !== "dauerhaft" && row.kind !== "einsatz" && row.kind !== "reaktion") fail(`${at}: kind must be dauerhaft, einsatz or reaktion`);
    smallInteger(row.cost, `${at}.cost`, 9); smallInteger(row.price, `${at}.price`, 99);
    if (row.requires !== undefined) for (const need of array(row.requires, `${at}.requires`, 4)) {
      const id = identifier(need, `${at}.requires`);
      if (id === row.id || !abilityIds.has(id)) fail(`${at}: requires unknown ability ${id}`);
    }
    if (row.prerequisite !== undefined) expression(row.prerequisite, "boolean", actorOnly);
    if (row.modifiers !== undefined) modifiers(row.modifiers, at);
  }
  const conditionIds = new Set<string>();
  for (const item of data.conditions === undefined ? [] : array(data.conditions, "conditions", 32)) {
    const row = record(item, "condition"); keys(row, ["id", "name", "text", "modifiers"], "condition"); uniqueId(row.id, conditionIds, "condition");
    const at = `condition ${String(row.id)}`;
    string(row.name, `${at}.name`, 120); string(row.text, `${at}.text`, 600);
    if (row.modifiers !== undefined) modifiers(row.modifiers, at);
  }
}

/** Common v1 records are checked by the frozen v1 parser through an explicit projection.
 * All v2 additions are closed and checked independently; nothing is silently discarded. */
export function parseRulePackageV2(input: unknown): RulePackageV2 {
  if (bekannt(input) && input.schemaVersion === 2) return input;
  const data = record(typeof input === "string" ? parseBoundedJson(input) : snapshotJson(input), "package");
  keys(data, ["schemaVersion", "id", "name", "version", "engineVersion", "license", "authors", "fields", "layout", "actions", "migrations", "selfTests", "computed", "constraints", "vitals", "attribution", "abilityRules", "abilities", "conditions", "collections", "presentation"], "package");
  if (data.schemaVersion !== 2) fail("package: expected schemaVersion 2");
  const actionRows = array(data.actions, "actions", RULE_LIMITS.actions).map(item => record(item, "action"));
  const projectedActions = actionRows.map(action => {
    keys(action, ["id", "name", "version", "expression", "inputs", "disclosure", "requiresConfirmation", "threshold", "outcome", "preconditions"], "action");
    const { outcome: _outcome, preconditions: _preconditions, ...legacy } = action; return legacy;
  });
  const projectedTests = data.selfTests === undefined ? undefined : array(data.selfTests, "selfTests", 64).map(item => {
    const test = record(item, "selfTest"); keys(test, ["name", "actionId", "context", "expectedTotal", "expectedSuccess", "expectedOutcomeId"], "selfTest");
    if (test.expectedSuccess !== undefined && typeof test.expectedSuccess !== "boolean") fail("selfTest: expectedSuccess must be boolean");
    if (test.expectedOutcomeId !== undefined) identifier(test.expectedOutcomeId, "expectedOutcomeId");
    const { expectedSuccess: _success, expectedOutcomeId: _outcome, ...legacy } = test; return legacy;
  });
  const { computed: _computed, constraints: _constraints, vitals: _vitals, attribution: _attribution, selfTests: _tests, abilityRules: _abilityRules, abilities: _abilities, conditions: _conditions, collections: _collections, presentation: _presentation, ...common } = data;
  const base = parseRulePackage({ ...common, schemaVersion: 1, actions: projectedActions, ...(projectedTests === undefined ? {} : { selfTests: projectedTests }) });
  const actorTypes = types(base.fields); const actorOnly = { actor: actorTypes, input: {} };
  if (data.computed !== undefined) {
    const seen = new Set(Object.keys(base.fields));
    for (const item of array(data.computed, "computed", 64)) {
      const row = record(item, "computed"); keys(row, ["id", "label", "expression"], "computed");
      uniqueId(row.id, seen, "computed"); string(row.label, "computed.label", 120); expression(row.expression, "number", actorOnly);
    }
  }
  if (data.constraints !== undefined) assertions(data.constraints, 64, actorOnly);
  if (data.vitals !== undefined) {
    const seen = new Set<string>();
    for (const item of array(data.vitals, "vitals", RULE_LIMITS.vitals)) {
      const row = record(item, "vital"); keys(row, ["id", "label", "max", "depletion", "color"], "vital");
      const id = identifier(row.id, "vital.id");
      if (seen.has(id)) fail("vitals: duplicate id"); seen.add(id);
      if (actorTypes[id] !== "number") fail(`vital ${id}: expected a number or integer field of this package`);
      string(row.label, "vital.label", 120);
      expression(row.max, "number", actorOnly);
      if (row.depletion !== "defeat" && row.depletion !== "none") fail("vital: depletion must be \"defeat\" or \"none\"");
      if (row.color !== undefined && !(VITAL_COLORS as readonly unknown[]).includes(row.color) && !(typeof row.color === "string" && /^#[0-9a-f]{6}$/.test(row.color))) fail(`vital ${id}: color must be one of ${VITAL_COLORS.join(", ")} or a lowercase #rrggbb value`);
    }
  }
  for (const [index, action] of actionRows.entries()) {
    const fields = { actor: actorTypes, input: types(base.actions[index]!.inputs) };
    if (action.preconditions !== undefined) assertions(action.preconditions, 8, fields);
    if (action.outcome !== undefined) {
      if (action.threshold !== undefined) fail("action: outcome and threshold are mutually exclusive");
      const outcome = record(action.outcome, "outcome"); keys(outcome, ["bands", "fallback"], "outcome"); const seen = new Set<string>();
      for (const item of array(outcome.bands, "outcome.bands", 8)) {
        const band = record(item, "band"); keys(band, ["id", "label", "comparison", "expression", "success"], "band"); label(band, seen);
        if (!comparisons.includes(band.comparison as OutcomeComparison)) fail("outcome: invalid comparison"); expression(band.expression, "number", fields);
      }
      const fallback = record(outcome.fallback, "fallback"); keys(fallback, ["id", "label", "success"], "fallback"); label(fallback, seen);
    }
  }
  if (data.abilityRules !== undefined || data.abilities !== undefined || data.conditions !== undefined) abilityDeclarations(data, base, actorOnly);
  if (data.attribution !== undefined) {
    const row = record(data.attribution, "attribution"); keys(row, ["title", "sources", "licenseUrl", "notice", "changes"], "attribution");
    string(row.title, "attribution.title", 120); string(row.notice, "attribution.notice", 1024); string(row.changes, "attribution.changes", 1024); httpUrl(row.licenseUrl);
    const sources = array(row.sources, "attribution.sources", 8); if (!sources.length) fail("attribution: source required");
    for (const item of sources) {
      const source = record(item, "source"); keys(source, ["title", "url", "revision", "authors"], "source");
      string(source.title, "source.title", 120); httpUrl(source.url); string(source.revision, "source.revision", 120);
      for (const author of array(source.authors, "source.authors", 32)) string(author, "source.author", 120);
    }
  }
  const collections = parseRuleCollections(data.collections, base.fields);
  // One text field cannot hold both a learned-ability list and a JSON collection: each parser
  // accepts the other's empty default, so the clash would only surface on the first real sheet.
  if (data.abilityRules !== undefined) {
    const rules = data.abilityRules as { abilityField?: unknown; conditionField?: unknown };
    for (const collection of collections) if (collection.storageField === rules.abilityField || collection.storageField === rules.conditionField)
      fail(`collection ${collection.id}: storage field ${collection.storageField} already stores abilities or conditions`);
  }
  // Optional context members are left out when absent: an explicit `undefined` is not an
  // absent optional property under `exactOptionalPropertyTypes`.
  const presentation = parseRulePresentation(data.presentation, {
    fields: base.fields,
    actions: data.actions as unknown as readonly RuleActionV2[],
    ...(data.computed !== undefined ? { computed: data.computed as unknown as readonly ComputedField[] } : {}),
    ...(data.vitals !== undefined ? { vitals: data.vitals as unknown as readonly RuleVital[] } : {}),
    ...(data.abilities !== undefined ? { abilities: data.abilities as unknown as readonly RuleAbility[] } : {}),
    ...(data.conditions !== undefined ? { conditions: data.conditions as unknown as readonly RuleCondition[] } : {}),
  }, collections);
  const parsed = deepFreeze({ ...data,
    ...(data.collections === undefined ? {} : { collections }),
    ...(presentation === undefined ? {} : { presentation }),
  } as unknown as RulePackageV2); geprueft.add(parsed); return parsed;
}
export function parseSupportedRulePackage(input: unknown): AnyRulePackage {
  if (bekannt(input)) return input;
  const data = record(typeof input === "string" ? parseBoundedJson(input) : snapshotJson(input), "package");
  if (data.schemaVersion === 2) return parseRulePackageV2(data);
  if (data.schemaVersion !== 1) return fail("package: unsupported schemaVersion; explicit format migration required");
  const parsed = parseRulePackage(data); geprueft.add(parsed); return parsed;
}

/** One aggregate budget per public operation, including dice-free formulas. */
class Budget {
  operations = 0;
  evaluate(expression: string, context: EvaluationContext): FormulaResult {
    const result = evaluateFormula(expression, context); this.operations += result.operations;
    if (this.operations > RULE_LIMITS.operations) fail("evaluation: aggregate operation limit exceeded");
    return result;
  }
}
const fieldContext = (actor: Readonly<Record<string, Scalar>>): EvaluationContext => ({ seed: "00000000000000000000000000000001", actor, input: {}, knowledge: { actorId: "fields", passages: [] } });
interface ResolvedAbilities { readonly learned: readonly RuleAbility[]; readonly conditions: readonly RuleCondition[]; readonly spent: number; readonly budget: number | null }
interface ResolvedFields { readonly fields: Readonly<Record<string, Scalar>>; readonly computed: Readonly<Record<string, number>>; readonly abilities?: ResolvedAbilities }
/** Eine Kennungsliste aus einem Textfeld („a, b, c"). Leer ist keine Auswahl; unbekannt oder doppelt ist ein Fehler. */
function selection(value: Scalar | undefined, known: ReadonlySet<string>, what: string): string[] {
  if (typeof value !== "string" || !value.trim()) return [];
  const ids = value.split(",").map(part => part.trim()).filter(Boolean), seen = new Set<string>();
  for (const id of ids) {
    if (!known.has(id)) fail(`${what} ${id}: unknown`);
    if (seen.has(id)) fail(`${what} ${id}: duplicate`);
    seen.add(id);
  }
  return ids;
}
function resolveAbilities(pkg: RulePackageV2, fields: Readonly<Record<string, Scalar>>, budget: Budget): ResolvedAbilities {
  const rules = pkg.abilityRules!, abilities = new Map((pkg.abilities ?? []).map(ability => [ability.id, ability]));
  const conditions = new Map((pkg.conditions ?? []).map(condition => [condition.id, condition])), context = fieldContext(fields);
  const learned = selection(fields[rules.abilityField], new Set(abilities.keys()), "ability").map(id => abilities.get(id)!), ids = new Set(learned.map(ability => ability.id));
  for (const ability of learned) {
    for (const need of ability.requires ?? []) if (!ids.has(need)) fail(`ability ${ability.id}: requires ${need}`);
    if (ability.prerequisite !== undefined && budget.evaluate(ability.prerequisite, context).value !== true) fail(`ability ${ability.id}: prerequisite not met`);
  }
  const spent = learned.reduce((sum, ability) => sum + ability.price, 0);
  const limit = rules.budget === undefined ? null : finite(budget.evaluate(rules.budget, context).value, "ability budget");
  if (limit !== null && spent > limit) fail(`ability budget exceeded: ${spent} > ${limit}`);
  const active = rules.conditionField === undefined ? [] : selection(fields[rules.conditionField], new Set(conditions.keys()), "condition").map(id => conditions.get(id)!);
  return { learned, conditions: active, spent, budget: limit };
}
function resolveFields(pkg: AnyRulePackage, input: unknown, budget: Budget): ResolvedFields {
  const fields = validateEntityFields(pkg.fields, input); const computed: Record<string, number> = {};
  let abilities: ResolvedAbilities | undefined;
  if (pkg.schemaVersion === 2) {
    if (pkg.collections?.length) validateRuleCollections(pkg.collections, fields);
    const context = fieldContext(fields);
    for (const assertion of pkg.constraints ?? []) if (budget.evaluate(assertion.expression, context).value !== true) fail(`constraint ${assertion.id}: ${assertion.message}`);
    for (const output of pkg.computed ?? []) computed[output.id] = finite(budget.evaluate(output.expression, context).value, `computed ${output.id}`);
    if (pkg.abilityRules) abilities = resolveAbilities(pkg, fields, budget);
  }
  return { fields, computed: deepFreeze(computed), ...(abilities ? { abilities } : {}) };
}
/**
 * Die Modifikatoren eines Wurfs: aktive Zustände, gelernte dauerhafte Fähigkeiten und die im Parameter
 * `einsatz` gewählten. Ihre Summe ersetzt `mod_ziel`/`mod_ergebnis` — ein von Hand übergebener Wert
 * zählt nicht, sonst ließe sich jede Probe erleichtern.
 */
function applyModifiers(pkg: RulePackageV2, action: RuleActionV2, resolved: ResolvedFields, input: Readonly<Record<string, Scalar>>, budget: Budget): { input: Readonly<Record<string, Scalar>>; applied: readonly AppliedModifier[] } {
  const own = resolved.abilities!, catalogue = new Map((pkg.abilities ?? []).map(ability => [ability.id, ability]));
  const learned = new Set(own.learned.map(ability => ability.id)), context = fieldContext(resolved.fields);
  const chosen = action.inputs.einsatz ? selection(input.einsatz, new Set(catalogue.keys()), "einsatz") : [];
  for (const id of chosen) if (!learned.has(id) || catalogue.get(id)!.kind === "dauerhaft") fail(`einsatz ${id}: only learned einsatz or reaktion abilities can be used`);
  const sources = [
    ...own.conditions.map(condition => ({ source: "condition" as const, id: condition.id, modifiers: condition.modifiers ?? [] })),
    ...own.learned.filter(ability => ability.kind === "dauerhaft").map(ability => ({ source: "ability" as const, id: ability.id, modifiers: ability.modifiers ?? [] })),
    ...chosen.map(id => ({ source: "ability" as const, id, modifiers: catalogue.get(id)!.modifiers ?? [] })),
  ];
  const sums: Record<ModifierTarget, number> = { ziel: 0, ergebnis: 0 }, applied: AppliedModifier[] = [];
  for (const origin of sources) for (const modifier of origin.modifiers) {
    if (!modifier.actions.some(pattern => actionMatches(pattern, action.id))) continue;
    const value = finite(budget.evaluate(modifier.value, context).value, `modifier ${origin.id}`);
    sums[modifier.target] += value; applied.push({ source: origin.source, id: origin.id, target: modifier.target, value });
  }
  const next: Record<string, Scalar> = { ...input };
  for (const target of ["ziel", "ergebnis"] as const) {
    const schema = action.inputs[`mod_${target}`]; if (!schema) continue;
    const value = schema.type === "integer" ? Math.round(sums[target]) : sums[target];
    next[`mod_${target}`] = Math.min(schema.maximum ?? value, Math.max(schema.minimum ?? value, value));
  }
  return { input: deepFreeze(next), applied: deepFreeze(applied) };
}
export function validatePackageFields(rawPackage: AnyRulePackage, input: unknown): Readonly<Record<string, Scalar>> {
  return resolveFields(parseSupportedRulePackage(rawPackage), input, new Budget()).fields;
}
export function defaultSupportedActorFields(pkg: AnyRulePackage): Readonly<Record<string, Scalar>> { return validatePackageFields(pkg, {}); }
export function evaluateComputedFields(rawPackage: AnyRulePackage, input: unknown): Readonly<Record<string, number>> {
  return resolveFields(parseSupportedRulePackage(rawPackage), input, new Budget()).computed;
}
/**
 * Die Vitalwerte eines Bogens samt Stand und Höchststand. Ein Paket ohne Deklaration liefert
 * eine leere Liste — kein Vitalwert ist ein zulässiger Zustand, kein Fehler. Die Bogenwerte
 * laufen durch dieselbe Prüfung wie überall; ein ungültiger Bogen hat auch keine gültige Anzeige.
 */
export function evaluateVitals(rawPackage: AnyRulePackage, input: unknown): readonly VitalReading[] {
  const pkg = parseSupportedRulePackage(rawPackage);
  if (pkg.schemaVersion !== 2 || !pkg.vitals?.length) return deepFreeze([] as VitalReading[]);
  const budget = new Budget(), { fields } = resolveFields(pkg, input, budget), context = fieldContext(fields);
  return deepFreeze(pkg.vitals.map(vital => {
    const value = finite(fields[vital.id], `vital ${vital.id}`);
    return { ...vital, value, maximum: finite(budget.evaluate(vital.max, context).value, `vital ${vital.id}: maximum`), depleted: value <= 0 };
  }));
}
/**
 * Was ein Bogen gelernt hat, welche Zustände wirken, was ausgegeben ist und was jetzt lernbar wäre —
 * Vorstufen gelernt, Voraussetzung erfüllt, Preis im Budget. Die Prüfung je Kandidat bekommt ein eigenes
 * Rechenbudget: das ist eine Anzeige über einen ganzen Katalog, kein Wurf.
 */
export function abilityOverview(rawPackage: AnyRulePackage, input: unknown): AbilityOverview {
  const pkg = parseSupportedRulePackage(rawPackage);
  if (pkg.schemaVersion !== 2 || !pkg.abilityRules) return deepFreeze({ learned: [], conditions: [], spent: 0, budget: null, learnable: [] });
  const resolved = resolveFields(pkg, input, new Budget()), own = resolved.abilities!, context = fieldContext(resolved.fields);
  const learned = new Set(own.learned.map(ability => ability.id));
  const learnable = (pkg.abilities ?? []).filter(ability => !learned.has(ability.id)
    && (ability.requires ?? []).every(id => learned.has(id))
    && (own.budget === null || own.spent + ability.price <= own.budget)
    && (ability.prerequisite === undefined || new Budget().evaluate(ability.prerequisite, context).value === true)).map(ability => ability.id);
  return deepFreeze({ learned: [...learned], conditions: own.conditions.map(condition => condition.id), spent: own.spent, budget: own.budget, learnable });
}
/**
 * Die wirkenden Zustände eines Bogens, für Anzeigen wie den Kampftisch: Kennung und Name, sonst
 * nichts. Anders als `abilityOverview` prüft sie keinen Fähigkeitskatalog — eine Karte will wissen,
 * was wirkt, nicht was lernbar wäre —, und eine unbekannte Kennung fällt weg, statt die Anzeige
 * scheitern zu lassen.
 */
export function activeConditions(rawPackage: AnyRulePackage, fields: Readonly<Record<string, Scalar>>): readonly { readonly id: string; readonly name: string }[] {
  const pkg = parseSupportedRulePackage(rawPackage);
  if (pkg.schemaVersion !== 2 || !pkg.abilityRules?.conditionField || !pkg.conditions?.length) return deepFreeze([]);
  const roh = fields[pkg.abilityRules.conditionField];
  if (typeof roh !== "string") return deepFreeze([]);
  const namen = new Map(pkg.conditions.map(condition => [condition.id, condition.name]));
  return deepFreeze([...new Set(roh.split(/[\s,]+/).filter(Boolean))].flatMap(id => {
    const name = namen.get(id);
    return name === undefined ? [] : [{ id, name }];
  }));
}
/** Die Vitalwerte, deren Erschöpfung eine Niederlage bedeutet — die einzige Quelle dafür. */
export function depletedDefeatVitals(rawPackage: AnyRulePackage, input: unknown): readonly VitalReading[] {
  return evaluateVitals(rawPackage, input).filter(vital => vital.depletion === "defeat" && vital.depleted);
}
function matches(comparison: OutcomeComparison, value: number, threshold: number): boolean {
  switch (comparison) { case "eq": return value === threshold; case "lt": return value < threshold; case "lte": return value <= threshold; case "gt": return value > threshold; case "gte": return value >= threshold; }
}
export function evaluateSupportedAction(rawPackage: AnyRulePackage, actionId: string, rawContext: EvaluationContext): AnyActionResult {
  const pkg = parseSupportedRulePackage(rawPackage); if (pkg.schemaVersion === 1) return evaluateAction(pkg, actionId, rawContext);
  const action = pkg.actions.find(item => item.id === actionId); if (!action) fail("action: not found in pinned package");
  const budget = new Budget(); const context = parseEvaluationContext(rawContext);
  const fields = resolveFields(pkg, context.actor, budget);
  let input = validateEntityFields(action.inputs, context.input ?? {}), applied: readonly AppliedModifier[] | undefined;
  if (pkg.abilityRules) ({ input, applied } = applyModifiers(pkg, action, fields, input, budget));
  const resolved = deepFreeze({ ...context, actor: fields.fields, input });
  for (const assertion of action.preconditions ?? []) if (budget.evaluate(assertion.expression, resolved).value !== true) fail(`precondition ${assertion.id}: ${assertion.message}`);
  const { value, ...calculation } = budget.evaluate(action.expression, resolved); const total = finite(value, "action total");
  let classified: { outcome: ClassifiedOutcome; outcomeTrace: readonly OutcomeExpressionTrace[] } | undefined;
  if (action.outcome) {
    const outcomeTrace = action.outcome.bands.map(band => ({ id: band.id, expression: band.expression, ...budget.evaluate(band.expression, resolved) })) as OutcomeExpressionTrace[];
    const comparisons = action.outcome.bands.map((band, index) => ({ id: band.id, comparison: band.comparison, threshold: finite(outcomeTrace[index]!.value, "outcome threshold"), matched: matches(band.comparison, total, outcomeTrace[index]!.value) }));
    const first = comparisons.findIndex(item => item.matched); const selected = first < 0 ? action.outcome.fallback : action.outcome.bands[first]!;
    classified = { outcome: { id: selected.id, label: selected.label, success: selected.success, matchedBand: first < 0 ? null : first, comparisons }, outcomeTrace };
  }
  return deepFreeze({ schemaVersion: 2, packageSchemaVersion: 2, outcomeVersion: OUTCOME_VERSION, packageContentHash: packageDigest(pkg), engineVersion: ENGINE_VERSION, package: { id: pkg.id, version: pkg.version }, action: { id: action.id, version: action.version }, context: resolved, expression: action.expression, ...calculation, total, requiresConfirmation: true, evaluationOperations: budget.operations,
    ...(applied ? { modifiers: applied } : {}),
    ...(classified ? { ...classified, success: classified.outcome.success } : action.threshold === undefined ? {} : { success: total >= action.threshold }),
  });
}
export function replaySupportedAction(rawPackage: AnyRulePackage, receipt: AnyActionResult): { readonly valid: boolean; readonly result?: AnyActionResult; readonly reason?: string } {
  try {
    const pkg = parseSupportedRulePackage(rawPackage); const saved = record(snapshotJson(receipt), "receipt") as unknown as AnyActionResult;
    if (pkg.schemaVersion === 1) return saved.schemaVersion === 1 ? replayAction(pkg, saved) : { valid: false, reason: "package/receipt schema mismatch" };
    if (saved.schemaVersion !== 2 || saved.packageSchemaVersion !== 2 || saved.outcomeVersion !== OUTCOME_VERSION || saved.engineVersion !== ENGINE_VERSION || saved.rngAlgorithm !== RNG_ALGORITHM) return { valid: false, reason: "unsupported replay version" };
    if (saved.package.id !== pkg.id || saved.package.version !== pkg.version || saved.packageContentHash !== packageDigest(pkg)) return { valid: false, reason: "package content or pin does not match receipt" };
    const result = evaluateSupportedAction(pkg, saved.action.id, saved.context);
    return stableJson(result) === stableJson(saved) ? { valid: true, result } : { valid: false, reason: "receipt differs from deterministic replay" };
  } catch { return { valid: false, reason: "invalid receipt or package" }; }
}
export class SupportedRulePackageRegistry {
  readonly #packages = new Map<string, AnyRulePackage>();
  install(input: unknown): AnyRulePackage {
    const pkg = parseSupportedRulePackage(input); const key = `${pkg.id}@${pkg.version}`; const previous = this.#packages.get(key);
    if (previous && stableJson(previous) !== stableJson(pkg)) fail("package: immutable version already installed with different content");
    if (pkg.schemaVersion === 2) defaultSupportedActorFields(pkg);
    for (const test of pkg.selfTests ?? []) {
      const result = evaluateSupportedAction(pkg, test.actionId, test.context);
      const extended = test as RuleSelfTestV2;
      if (result.total !== test.expectedTotal || (extended.expectedSuccess !== undefined && result.success !== extended.expectedSuccess) || (extended.expectedOutcomeId !== undefined && (result.schemaVersion !== 2 || result.outcome?.id !== extended.expectedOutcomeId))) fail(`package self-test failed: ${test.name}`);
    }
    this.#packages.set(key, previous ?? pkg); return previous ?? pkg;
  }
  get(pin: PackagePin): AnyRulePackage { const pkg = this.#packages.get(`${pin.id}@${pin.version}`); if (!pkg) fail("package: pinned version is not installed"); return pkg; }
  list(): readonly AnyRulePackage[] { return Object.freeze([...this.#packages.values()].sort((a, b) => `${a.id}@${a.version}` < `${b.id}@${b.version}` ? -1 : 1)); }
}

/** Synchronous browser-safe SHA-256; independent of host APIs, UTF-8, lowercase hex. */
export function supportedPackageContentHash(input: AnyRulePackage): string { return packageDigest(parseSupportedRulePackage(input)); }
function packageDigest(pkg: AnyRulePackage): string {
  if (!bekannt(pkg)) return computeDigest(pkg);
  const known = digests.get(pkg); if (known) return known;
  const digest = computeDigest(pkg); digests.set(pkg, digest); return digest;
}
function computeDigest(pkg: AnyRulePackage): string {
  const bytes = new TextEncoder().encode(stableJson(pkg)); const size = Math.ceil((bytes.length + 9) / 64) * 64;
  const buffer = new Uint8Array(size); buffer.set(bytes); buffer[bytes.length] = 0x80; const view = new DataView(buffer.buffer);
  view.setUint32(size - 8, Math.floor(bytes.length / 0x20000000)); view.setUint32(size - 4, (bytes.length * 8) >>> 0);
  const state = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
  const constants = [0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
  const rotate = (value: number, shift: number) => (value >>> shift) | (value << (32 - shift)); const words = new Uint32Array(64);
  for (let offset = 0; offset < size; offset += 64) {
    for (let i = 0; i < 16; i++) words[i] = view.getUint32(offset + i * 4);
    for (let i = 16; i < 64; i++) { const x = words[i - 15]!; const y = words[i - 2]!; words[i] = (words[i - 16]! + (rotate(x, 7) ^ rotate(x, 18) ^ (x >>> 3)) + words[i - 7]! + (rotate(y, 17) ^ rotate(y, 19) ^ (y >>> 10))) >>> 0; }
    let [a, b, c, d, e, f, g, h] = state as [number, number, number, number, number, number, number, number];
    for (let i = 0; i < 64; i++) {
      const t1 = (h + (rotate(e, 6) ^ rotate(e, 11) ^ rotate(e, 25)) + ((e & f) ^ (~e & g)) + constants[i]! + words[i]!) >>> 0;
      const t2 = ((rotate(a, 2) ^ rotate(a, 13) ^ rotate(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) >>> 0;
      h = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
    }
    for (const [i, value] of [a, b, c, d, e, f, g, h].entries()) state[i] = (state[i]! + value) >>> 0;
  }
  return state.map(word => word.toString(16).padStart(8, "0")).join("");
}
