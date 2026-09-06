import { ENGINE_VERSION, RNG_ALGORITHM, evaluateFormula, inferFormulaType, parseEvaluationContext, parseFormula, type EvaluationContext, type Formula, type FormulaFieldTypes, type FormulaResult, type FormulaType, type Scalar } from "./formula.ts";
import { evaluateAction, parseRulePackage, replayAction, validateEntityFields, type ActionResult, type FieldSchema, type PackagePin, type RuleAction, type RulePackage } from "./package.ts";
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
export interface RuleActionV2 extends RuleAction { readonly outcome?: RuleOutcome; readonly preconditions?: readonly RuleAssertion[] }
export interface RuleSelfTestV2 { readonly name: string; readonly actionId: string; readonly context: EvaluationContext; readonly expectedTotal: number; readonly expectedSuccess?: boolean; readonly expectedOutcomeId?: string }
export interface RulePackageV2 extends Omit<RulePackage, "schemaVersion" | "actions" | "selfTests"> {
  readonly schemaVersion: 2; readonly actions: readonly RuleActionV2[];
  readonly computed?: readonly ComputedField[]; readonly constraints?: readonly RuleAssertion[];
  readonly attribution?: RuleAttribution; readonly selfTests?: readonly RuleSelfTestV2[];
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
}
export type AnyRulePackage = RulePackage | RulePackageV2;
export type AnyActionResult = ActionResult | ActionResultV2;

const comparisons: readonly OutcomeComparison[] = ["eq", "lt", "lte", "gt", "gte"];
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

/** Common v1 records are checked by the frozen v1 parser through an explicit projection.
 * All v2 additions are closed and checked independently; nothing is silently discarded. */
export function parseRulePackageV2(input: unknown): RulePackageV2 {
  const data = record(typeof input === "string" ? parseBoundedJson(input) : snapshotJson(input), "package");
  keys(data, ["schemaVersion", "id", "name", "version", "engineVersion", "license", "authors", "fields", "layout", "actions", "migrations", "selfTests", "computed", "constraints", "attribution"], "package");
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
  const { computed: _computed, constraints: _constraints, attribution: _attribution, selfTests: _tests, ...common } = data;
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
  return deepFreeze(data as unknown as RulePackageV2);
}
export function parseSupportedRulePackage(input: unknown): AnyRulePackage {
  const data = record(typeof input === "string" ? parseBoundedJson(input) : snapshotJson(input), "package");
  if (data.schemaVersion === 1) return parseRulePackage(data);
  if (data.schemaVersion === 2) return parseRulePackageV2(data);
  return fail("package: unsupported schemaVersion; explicit format migration required");
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
function resolveFields(pkg: AnyRulePackage, input: unknown, budget: Budget): { fields: Readonly<Record<string, Scalar>>; computed: Readonly<Record<string, number>> } {
  const fields = validateEntityFields(pkg.fields, input); const computed: Record<string, number> = {};
  if (pkg.schemaVersion === 2) {
    const context = fieldContext(fields);
    for (const assertion of pkg.constraints ?? []) if (budget.evaluate(assertion.expression, context).value !== true) fail(`constraint ${assertion.id}: ${assertion.message}`);
    for (const output of pkg.computed ?? []) computed[output.id] = finite(budget.evaluate(output.expression, context).value, `computed ${output.id}`);
  }
  return { fields, computed: deepFreeze(computed) };
}
export function validatePackageFields(rawPackage: AnyRulePackage, input: unknown): Readonly<Record<string, Scalar>> {
  return resolveFields(parseSupportedRulePackage(rawPackage), input, new Budget()).fields;
}
export function defaultSupportedActorFields(pkg: AnyRulePackage): Readonly<Record<string, Scalar>> { return validatePackageFields(pkg, {}); }
export function evaluateComputedFields(rawPackage: AnyRulePackage, input: unknown): Readonly<Record<string, number>> {
  return resolveFields(parseSupportedRulePackage(rawPackage), input, new Budget()).computed;
}
function matches(comparison: OutcomeComparison, value: number, threshold: number): boolean {
  switch (comparison) { case "eq": return value === threshold; case "lt": return value < threshold; case "lte": return value <= threshold; case "gt": return value > threshold; case "gte": return value >= threshold; }
}
export function evaluateSupportedAction(rawPackage: AnyRulePackage, actionId: string, rawContext: EvaluationContext): AnyActionResult {
  const pkg = parseSupportedRulePackage(rawPackage); if (pkg.schemaVersion === 1) return evaluateAction(pkg, actionId, rawContext);
  const action = pkg.actions.find(item => item.id === actionId); if (!action) fail("action: not found in pinned package");
  const budget = new Budget(); const context = parseEvaluationContext(rawContext);
  const resolved = deepFreeze({ ...context, actor: resolveFields(pkg, context.actor, budget).fields, input: validateEntityFields(action.inputs, context.input ?? {}) });
  for (const assertion of action.preconditions ?? []) if (budget.evaluate(assertion.expression, resolved).value !== true) fail(`precondition ${assertion.id}: ${assertion.message}`);
  const { value, ...calculation } = budget.evaluate(action.expression, resolved); const total = finite(value, "action total");
  let classified: { outcome: ClassifiedOutcome; outcomeTrace: readonly OutcomeExpressionTrace[] } | undefined;
  if (action.outcome) {
    // Evaluate ALL bands, including those after the first match, with no primary RNG reuse.
    const outcomeTrace = action.outcome.bands.map(band => ({ id: band.id, expression: band.expression, ...budget.evaluate(band.expression, resolved) })) as OutcomeExpressionTrace[];
    const comparisons = action.outcome.bands.map((band, index) => ({ id: band.id, comparison: band.comparison, threshold: finite(outcomeTrace[index]!.value, "outcome threshold"), matched: matches(band.comparison, total, outcomeTrace[index]!.value) }));
    const first = comparisons.findIndex(item => item.matched); const selected = first < 0 ? action.outcome.fallback : action.outcome.bands[first]!;
    classified = { outcome: { id: selected.id, label: selected.label, success: selected.success, matchedBand: first < 0 ? null : first, comparisons }, outcomeTrace };
  }
  return deepFreeze({ schemaVersion: 2, packageSchemaVersion: 2, outcomeVersion: OUTCOME_VERSION, packageContentHash: packageDigest(pkg), engineVersion: ENGINE_VERSION, package: { id: pkg.id, version: pkg.version }, action: { id: action.id, version: action.version }, context: resolved, expression: action.expression, ...calculation, total, requiresConfirmation: true, evaluationOperations: budget.operations,
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

/** Synchronous browser-safe SHA-256; independent of host APIs, UTF-8, lowercase hex.
 * This hashes the rules stableJson encoding, not core's distinct canonical encoding. */
export function supportedPackageContentHash(input: AnyRulePackage): string { return packageDigest(parseSupportedRulePackage(input)); }
function packageDigest(pkg: AnyRulePackage): string {
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
