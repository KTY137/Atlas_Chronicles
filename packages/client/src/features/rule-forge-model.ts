// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import {
  DEMO_RULE_PACKAGE, ENGINE_VERSION, evaluateSupportedAction, parseFormula, parseFormulaAst, parseSupportedRulePackage,
  stableJson, type FieldSchema, type Formula, type FormulaType, type MigrationStep,
  type AnyRulePackage, type RulePackageV2, type RuleOutcome, type RuleAssertion, type Scalar,
} from "@chronicle/rules";
import { t } from "../i18n";

export type FormulaDraft =
  | { kind: "literal"; type: FormulaType; value: string }
  | { kind: "field"; source: "actor" | "input"; field: string }
  | { kind: "dice"; count: string; sides: string; keep: "none" | "highest" | "lowest"; keepCount: string; explode: string }
  | { kind: "unary"; op: "-" | "!"; value: FormulaDraft }
  | { kind: "binary"; op: Extract<Formula, { kind: "binary" }>["op"]; left: FormulaDraft; right: FormulaDraft }
  | { kind: "if"; condition: FormulaDraft; then: FormulaDraft; else: FormulaDraft }
  | { kind: "call"; name: Extract<Formula, { kind: "call" }>["name"]; args: FormulaDraft[] };
export interface DraftField {
  localId: string; id: string; label: string; type: FieldSchema["type"];
  defaultValue: string; minimum: string; maximum: string; maxLength: string;
  hasEnum: boolean; enumValues: string[];
}
/** `parentLocalId` keeps hierarchy stable while section ids are being edited. */
export interface DraftSection { localId: string; id: string; label: string; fieldKeys: string[]; parentLocalId: string | null }
export interface DraftAction {
  localId: string; id: string; name: string; version: string; disclosure: string;
  inputs: DraftField[]; thresholdEnabled: boolean; threshold: string; formula: FormulaDraft;
  originalExpression?: string; originalFormula?: FormulaDraft;
  /** The typed expression, canonical (`actor.x`); wins over `formula` when present, even while invalid. */
  expression?: string;
  outcome?: RuleOutcome; preconditions?: readonly RuleAssertion[];
}
export type DraftMigrationStep =
  | { localId: string; kind: "rename"; from: string; to: string }
  | { localId: string; kind: "add"; field: string; type: FormulaType; value: string }
  | { localId: string; kind: "archive"; field: string }
  | { localId: string; kind: "numeric"; field: string; formula: FormulaDraft; originalExpression?: string; originalFormula?: FormulaDraft; expression?: string };
export interface DraftMigration { localId: string; from: string; steps: DraftMigrationStep[] }
export type PackageSelfTest = NonNullable<RulePackageV2["selfTests"]>[number];
export interface RuleDraft {
  schemaVersion: 1 | 2;
  id: string; name: string; version: string; license: string; authors: string[];
  fields: DraftField[]; sections: DraftSection[]; actions: DraftAction[];
  migrations: DraftMigration[]; selfTests: PackageSelfTest[]; includeSelfTests: boolean;
  computed?: RulePackageV2["computed"]; constraints?: RulePackageV2["constraints"]; vitals?: RulePackageV2["vitals"]; attribution?: RulePackageV2["attribution"];
  // Fähigkeiten und Zustände reisen unverändert mit, bis die Regelschmiede eigene Reiter dafür hat.
  abilityRules?: RulePackageV2["abilityRules"]; abilities?: RulePackageV2["abilities"]; conditions?: RulePackageV2["conditions"];
}
export type Validation<T> = { valid: true; value: T } | { valid: false; error: string };
let localSequence = 0;
/** Editor identities never enter exported packages or authoritative campaign state. */
export const localKey = (): string => `forge-${++localSequence}`;
export const copyJson = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
export const literalDraft = (type: FormulaType = "number"): FormulaDraft => ({ kind: "literal", type, value: type === "number" ? "0" : type === "boolean" ? "false" : "spuren" });

export function numberValue(value: string, label: string): number {
  if (!value.trim()) throw new Error(t("{label}: Bitte eine Zahl eintragen.", { label }));
  const result = Number(value);
  if (!Number.isFinite(result) || Math.abs(result) > 1e12) throw new Error(t("{label}: Eine endliche Zahl zwischen −10¹² und 10¹² ist erforderlich.", { label }));
  return result;
}
export function scalarValue(type: FormulaType, value: string, label: string): Scalar {
  if (type === "number") return numberValue(value, label);
  if (type === "boolean") { if (value !== "true" && value !== "false") throw new Error(t("{label}: Wahr oder falsch wählen.", { label })); return value === "true"; }
  return value;
}

export function formulaDraft(ast: Formula): FormulaDraft {
  switch (ast.kind) {
    case "literal": return { kind: "literal", type: typeof ast.value as FormulaType, value: String(ast.value) };
    case "field": return { ...ast };
    case "dice": return { kind: "dice", count: String(ast.count), sides: String(ast.sides), keep: ast.keep?.mode ?? "none", keepCount: String(ast.keep?.count ?? 1), explode: ast.explode === undefined ? "" : String(ast.explode) };
    case "unary": return { ...ast, value: formulaDraft(ast.value) };
    case "binary": return { ...ast, left: formulaDraft(ast.left), right: formulaDraft(ast.right) };
    case "if": return { kind: "if", condition: formulaDraft(ast.condition), then: formulaDraft(ast.then), else: formulaDraft(ast.else) };
    case "call": return { ...ast, args: ast.args.map(formulaDraft) };
  }
}
function compileNode(draft: FormulaDraft): Formula {
  switch (draft.kind) {
    case "literal": return { kind: "literal", value: scalarValue(draft.type, draft.value, t("Konstante")) };
    case "field": return { ...draft };
    case "dice": return { kind: "dice", count: numberValue(draft.count, t("Würfelanzahl")), sides: numberValue(draft.sides, t("Würfelseiten")),
      ...(draft.keep === "none" ? {} : { keep: { mode: draft.keep, count: numberValue(draft.keepCount, t("Gewertete Würfel")) } }),
      ...(draft.explode.trim() ? { explode: numberValue(draft.explode, t("Explosionsgrenze")) } : {}) };
    case "unary": return { ...draft, value: compileNode(draft.value) };
    case "binary": return { ...draft, left: compileNode(draft.left), right: compileNode(draft.right) };
    case "if": return { kind: "if", condition: compileNode(draft.condition), then: compileNode(draft.then), else: compileNode(draft.else) };
    case "call": return { ...draft, args: draft.args.map(compileNode) };
  }
}
export const compileFormula = (draft: FormulaDraft): Formula => parseFormulaAst(compileNode(draft));

/** The expression grammar has no exponent notation. Expand it without decimal rounding. */
export function decimalSource(value: number): string {
  if (!Number.isFinite(value)) throw new Error(t("Die Formel enthält keine endliche Zahl."));
  const text = String(value); if (!/[eE]/.test(text)) return text;
  const [coefficient, exponent] = text.split(/[eE]/), negative = coefficient!.startsWith("-");
  const unsigned = negative ? coefficient!.slice(1) : coefficient!, [whole, fraction = ""] = unsigned.split(".");
  const digits = whole! + fraction, point = whole!.length + Number(exponent);
  const result = point <= 0 ? `0.${"0".repeat(-point)}${digits}` : point >= digits.length ? digits + "0".repeat(point - digits.length) : `${digits.slice(0, point)}.${digits.slice(point)}`;
  return (negative ? "-" : "") + result;
}
const expressionPrecedence: Readonly<Record<Extract<Formula, { kind: "binary" }>["op"], number>> = { "||": 1, "&&": 2, "==": 3, "!=": 3, ">": 4, ">=": 4, "<": 4, "<=": 4, "+": 5, "-": 5, "*": 6, "/": 6, "%": 6 };
export function formulaSource(ast: Formula): string { return expressionSource(ast, 0); }
function expressionSource(ast: Formula, parentPrecedence: number): string {
  let result: string;
  const precedence = ast.kind === "binary" ? expressionPrecedence[ast.op] : ast.kind === "unary" || ast.kind === "literal" && typeof ast.value === "number" && ast.value < 0 ? 7 : 8;
  switch (ast.kind) {
    case "literal": result = typeof ast.value === "number" ? decimalSource(ast.value) : JSON.stringify(ast.value); break;
    case "field": result = `${ast.source}.${ast.field}`; break;
    case "dice": result = `${ast.count}d${ast.sides}${ast.keep ? `${ast.keep.mode === "highest" ? "kh" : "kl"}${ast.keep.count}` : ""}${ast.explode === undefined ? "" : `!${ast.explode}`}`; break;
    case "unary": result = `${ast.op}${expressionSource(ast.value, 7)}`; break;
    // Right operands at the same precedence need parentheses: even addition is not
    // safely associative with finite-precision numbers. Left chains need none.
    case "binary": result = `${expressionSource(ast.left, precedence)} ${ast.op} ${expressionSource(ast.right, precedence + 1)}`; break;
    case "if": result = `if(${formulaSource(ast.condition)}, ${formulaSource(ast.then)}, ${formulaSource(ast.else)})`; break;
    case "call": result = `${ast.name}(${ast.args.map(formulaSource).join(", ")})`; break;
  }
  return precedence < parentPrecedence ? `(${result})` : result;
}
export function draftExpression(draft: { formula: FormulaDraft; originalFormula?: FormulaDraft; originalExpression?: string; expression?: string }): string {
  // The typed expression, when present, wins verbatim — even while invalid (H6: an incomplete
  // block must invalidate the package draft, never silently fall back to the visual tree).
  if (draft.expression !== undefined) return draft.expression;
  const ast = compileFormula(draft.formula);
  // Opening an installed package must not rewrite even equivalent expression bytes.
  if (draft.originalFormula && draft.originalExpression !== undefined && stableJson(draft.originalFormula) === stableJson(draft.formula)) return draft.originalExpression;
  return formulaSource(ast);
}

export function fieldDraft(id: string, field: FieldSchema): DraftField {
  return { localId: localKey(), id, label: field.label, type: field.type, defaultValue: String(field.default), minimum: String(field.minimum ?? 0), maximum: String(field.maximum ?? 20), maxLength: String(field.maxLength ?? 120), hasEnum: field.enum !== undefined, enumValues: [...(field.enum ?? [])] };
}
export function newField(id: string, type: FieldSchema["type"] = "integer"): DraftField {
  return fieldDraft(id, type === "integer" || type === "number" ? { type, label: "Neues Feld", default: 0, minimum: 0, maximum: 20 }
    : type === "boolean" ? { type, label: "Neues Feld", default: false } : { type, label: "Neues Feld", default: "", maxLength: 120 });
}
export function changeFieldType(field: DraftField, type: FieldSchema["type"]): DraftField { return { ...newField(field.id, type), localId: field.localId, label: field.label }; }
export function uniqueId(prefix: string, ids: readonly string[]): string { let n = 1; while (ids.includes(`${prefix}${n}`)) n++; return `${prefix}${n}`; }
function fieldsMap(fields: readonly DraftField[]): Record<string, FieldSchema> {
  const result: Record<string, FieldSchema> = Object.create(null) as Record<string, FieldSchema>;
  for (const field of fields) {
    if (!/^[a-z][a-z0-9_-]*$/.test(field.id) || ["constructor", "prototype", "__proto__"].includes(field.id)) throw new Error(t("Feldkennung „{kennung}“: Kleinbuchstaben, Ziffern, _ und - verwenden; mit einem Buchstaben beginnen.", { kennung: field.id }));
    if (Object.hasOwn(result, field.id)) throw new Error(t("Die Feldkennung „{kennung}“ ist doppelt vergeben.", { kennung: field.id }));
    const common = { type: field.type, label: field.label, default: scalarValue(field.type === "integer" ? "number" : field.type, field.defaultValue, t("{label}: Vorgabe", { label: field.label })) };
    result[field.id] = field.type === "integer" || field.type === "number" ? { ...common, minimum: numberValue(field.minimum, t("{label}: Minimum", { label: field.label })), maximum: numberValue(field.maximum, t("{label}: Maximum", { label: field.label })) }
      : field.type === "string" ? { ...common, maxLength: numberValue(field.maxLength, t("{label}: Zeichenlimit", { label: field.label })), ...(field.hasEnum ? { enum: [...field.enumValues] } : {}) } : common;
  }
  return result;
}
export function migrationStepDraft(step: MigrationStep): DraftMigrationStep {
  if (step.kind === "numeric") { const formula = formulaDraft(parseFormula(step.expression)); return { localId: localKey(), kind: "numeric", field: step.field, formula, originalFormula: copyJson(formula), originalExpression: step.expression, expression: step.expression }; }
  if (step.kind === "add") return { localId: localKey(), kind: "add", field: step.field, type: typeof step.value as FormulaType, value: String(step.value) };
  return { localId: localKey(), ...step };
}
function migrationStep(step: DraftMigrationStep): MigrationStep {
  if (step.kind === "rename") return { kind: "rename", from: step.from, to: step.to };
  if (step.kind === "archive") return { kind: "archive", field: step.field };
  if (step.kind === "numeric") return { kind: "numeric", field: step.field, expression: draftExpression(step) };
  return { kind: "add", field: step.field, value: scalarValue(step.type, step.value, t("Neuer Feldwert")) };
}
export function packageDraft(input: AnyRulePackage): RuleDraft {
  const pkg = parseSupportedRulePackage(input), fields = Object.entries(pkg.fields).map(([id, field]) => fieldDraft(id, field));
  const sectionKeys = new Map(pkg.layout.sections.map(section => [section.id, localKey()]));
  return { schemaVersion: pkg.schemaVersion, id: pkg.id, name: pkg.name, version: pkg.version, license: pkg.license, authors: [...pkg.authors], fields,
    sections: pkg.layout.sections.map(s => ({ localId: sectionKeys.get(s.id)!, id: s.id, label: s.label, fieldKeys: s.fields.map(id => fields.find(f => f.id === id)!.localId), parentLocalId: s.parent ? sectionKeys.get(s.parent) ?? null : null })),
    actions: pkg.actions.map(a => { const formula = formulaDraft(parseFormula(a.expression)); return { localId: localKey(), id: a.id, name: a.name, version: a.version, disclosure: a.disclosure, inputs: Object.entries(a.inputs).map(([id, f]) => fieldDraft(id, f)), thresholdEnabled: a.threshold !== undefined, threshold: String(a.threshold ?? 0), formula, originalFormula: copyJson(formula), originalExpression: a.expression,
      ...("outcome" in a && a.outcome ? { outcome: copyJson(a.outcome as RuleOutcome) } : {}), ...("preconditions" in a ? { preconditions: copyJson(a.preconditions as readonly RuleAssertion[]) } : {}) }; }),
    migrations: pkg.migrations.map(m => ({ localId: localKey(), from: m.from, steps: m.steps.map(migrationStepDraft) })),
    selfTests: copyJson([...(pkg.selfTests ?? [])]), includeSelfTests: pkg.selfTests !== undefined,
    ...(pkg.schemaVersion === 2 ? { ...(pkg.computed !== undefined ? { computed: copyJson(pkg.computed) } : {}), ...(pkg.constraints !== undefined ? { constraints: copyJson(pkg.constraints) } : {}), ...(pkg.vitals !== undefined ? { vitals: copyJson(pkg.vitals) } : {}), ...(pkg.attribution !== undefined ? { attribution: copyJson(pkg.attribution) } : {}), ...(pkg.abilityRules !== undefined ? { abilityRules: copyJson(pkg.abilityRules) } : {}), ...(pkg.abilities !== undefined ? { abilities: copyJson(pkg.abilities) } : {}), ...(pkg.conditions !== undefined ? { conditions: copyJson(pkg.conditions) } : {}) } : {}) };
}
export function compilePackage(draft: RuleDraft): AnyRulePackage {
  const fields = fieldsMap(draft.fields);
  return parseSupportedRulePackage({ schemaVersion: draft.schemaVersion, engineVersion: ENGINE_VERSION, id: draft.id, name: draft.name, version: draft.version, license: draft.license, authors: [...draft.authors], fields,
    layout: { sections: draft.sections.map(s => {
      const parent = s.parentLocalId ? draft.sections.find(candidate => candidate.localId === s.parentLocalId) : undefined;
      if (s.parentLocalId && !parent) throw new Error(t("Der Bogenabschnitt „{abschnitt}“ verweist auf eine entfernte Oberkategorie.", { abschnitt: s.label }));
      return { id: s.id, label: s.label, fields: s.fieldKeys.map(key => { const field = draft.fields.find(f => f.localId === key); if (!field) throw new Error(t("Der Bogenabschnitt „{abschnitt}“ verweist auf ein entferntes Feld.", { abschnitt: s.label })); return field.id; }), ...(parent ? { parent: parent.id } : {}) };
    }) },
    actions: draft.actions.map(a => ({ id: a.id, name: a.name, version: a.version, disclosure: a.disclosure, requiresConfirmation: true, inputs: fieldsMap(a.inputs), expression: draftExpression(a), ...(a.thresholdEnabled ? { threshold: numberValue(a.threshold, t("{name}: Erfolgsschwelle", { name: a.name })) } : {}), ...(a.outcome ? { outcome: copyJson(a.outcome) } : {}), ...(a.preconditions !== undefined ? { preconditions: copyJson(a.preconditions) } : {}) })),
    migrations: draft.migrations.map(m => ({ from: m.from, to: draft.version, steps: m.steps.map(migrationStep) })),
    ...(draft.includeSelfTests || draft.selfTests.length ? { selfTests: copyJson(draft.selfTests) } : {}),
    ...(draft.computed !== undefined ? { computed: copyJson(draft.computed) } : {}), ...(draft.constraints !== undefined ? { constraints: copyJson(draft.constraints) } : {}), ...(draft.vitals !== undefined ? { vitals: copyJson(draft.vitals) } : {}), ...(draft.attribution !== undefined ? { attribution: copyJson(draft.attribution) } : {}), ...(draft.abilityRules !== undefined ? { abilityRules: copyJson(draft.abilityRules) } : {}), ...(draft.abilities !== undefined ? { abilities: copyJson(draft.abilities) } : {}), ...(draft.conditions !== undefined ? { conditions: copyJson(draft.conditions) } : {}) });
}
export function validateDraft(draft: RuleDraft): Validation<AnyRulePackage> {
  try { return { valid: true, value: compilePackage(draft) }; } catch (e) { return { valid: false, error: e instanceof Error ? e.message : t("Das Paket konnte nicht geprüft werden.") }; }
}
export function nextVersion(pkg: AnyRulePackage, installed: readonly AnyRulePackage[]): string {
  const [major, minor, patch] = pkg.version.split(".").map(Number); let next = patch! + 1;
  while (installed.some(p => p.id === pkg.id && p.version === `${major}.${minor}.${next}`)) next++;
  if (next > 999999) throw new Error(t("Bitte die nächste Paketversion selbst festlegen."));
  return `${major}.${minor}.${next}`;
}
export function forkPackage(pkg: AnyRulePackage, installed: readonly AnyRulePackage[]): RuleDraft {
  const draft = packageDraft(pkg); draft.version = nextVersion(pkg, installed);
  draft.migrations = [{ localId: localKey(), from: pkg.version, steps: [] }];
  return draft;
}
export function newPackage(author: string, installed: readonly AnyRulePackage[] = []): RuleDraft {
  const draft = packageDraft(DEMO_RULE_PACKAGE); let id = "de.meine-runde.regelwerk", suffix = 2;
  while (installed.some(p => p.id === id)) id = `de.meine-runde.regelwerk-${suffix++}`;
  draft.id = id; draft.name = "Mein Regelwerk"; draft.authors = [author || "Spielleitung"]; draft.version = "1.0.0"; draft.migrations = []; draft.selfTests = []; draft.includeSelfTests = false;
  return draft;
}
// `expression` is deliberately left unset: setting it here reproduces the packageDraft hazard —
// once set it freezes draftExpression on this text, so a later `.formula`-only edit (RuleForge.tsx
// still edits actions through `.formula`) would go unpublished. The `.formula` fallback already
// prints "1d20".
export function newAction(ids: readonly string[]): DraftAction { return { localId: localKey(), id: uniqueId("aktion", ids), name: "Neue Aktion", version: "1.0.0", disclosure: "Ein Würfel entscheidet über diese Handlung. Das Ergebnis wird am Tisch bestätigt.", inputs: [], thresholdEnabled: false, threshold: "10", formula: formulaDraft(parseFormula("1d20")) }; }
export function moveItem<T>(items: readonly T[], index: number, delta: -1 | 1): T[] { const result = [...items], next = index + delta; if (index >= 0 && index < result.length && next >= 0 && next < result.length) [result[index], result[next]] = [result[next]!, result[index]!]; return result; }
export function fieldTypes(fields: readonly DraftField[]): Record<string, FormulaType> { return Object.fromEntries(fields.map(f => [f.id, f.type === "integer" ? "number" : f.type])); }

/** Test fixtures follow the current schema without carrying removed draft fields into evaluation. */
export function fixtureValues(fields: Readonly<Record<string, FieldSchema>>, values: Readonly<Record<string, Scalar>>): Record<string, Scalar> {
  return Object.fromEntries(Object.entries(fields).map(([id, field]) => [id, Object.hasOwn(values, id) ? values[id] : field.default]));
}
export function packageTestResults(pkg: AnyRulePackage): { name: string; expected: number; actual?: number; passed: boolean; error?: string }[] {
  return (pkg.selfTests ?? []).map(test => {
    try { const result = evaluateSupportedAction(pkg, test.actionId, test.context), actual = result.total;
      const passed = actual === test.expectedTotal && (!("expectedSuccess" in test) || result.success === test.expectedSuccess) && (!("expectedOutcomeId" in test) || result.schemaVersion === 2 && result.outcome?.id === test.expectedOutcomeId);
      return { name: test.name, expected: test.expectedTotal, actual, passed }; }
    catch (error) { return { name: test.name, expected: test.expectedTotal, passed: false, error: error instanceof Error ? error.message : t("Test fehlgeschlagen.") }; }
  });
}
