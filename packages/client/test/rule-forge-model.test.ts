// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { describe, expect, it } from "vitest";
import { DEMO_RULE_PACKAGE, RulePackageRegistry, evaluateFormula, parseFormula, parseRulePackage, previewPackageMigration, stableJson, type EvaluationContext } from "@chronicle/rules";
import { changeFieldType, compileFormula, compilePackage, copyJson, decimalSource, fieldDraft, fixtureValues, forkPackage, formulaDraft, formulaSource, migrationStepDraft, newAction, newField, newPackage, numberValue, packageDraft, packageTestResults, validateDraft } from "../src/features/rule-forge-model";

const context: EvaluationContext = { seed: "00000001000000020000000300000004", actor: { n: 3 }, input: { topic: "spuren" }, knowledge: { actorId: "fixture-sera", passages: [{ passageId: "beispiel", labels: ["spuren"], experience: "erfahren" }] } };

describe("visual Formula IR authoring", () => {
  it.each([
    "0", "0.0000001", "true", '"Spuren \\"lesen\\""'.replaceAll('\\\\', '\\'), "actor.n", "input.topic", "3d6kh2!2", "3d6kl1", "-actor.n", "!false",
    "1 + 2 * 3", "(1 + 2) * 3", "8 / (2 + 2)", "7 % 4", "3 - (2 - 1)", "3 == 3", "3 != 2", "3 > 2", "3 >= 3", "2 < 3", "3 <= 3", "true && false", "true || false",
    "if(true, 4, 1 / 0)", "min(2, 3, -1)", "max(1, 2, 3, 4, 5, 6, 7, 8)", "floor(2.7)", "ceil(2.1)", "round(2.5)", "abs(-3)", 'haelt("beispiel")', "haelt_etikett(input.topic)", 'erfahrungsgrad(input.topic) == "erfahren"',
  ])("preserves %s through the visual tree", expression => {
    const original = parseFormula(expression), draft = formulaDraft(original), ast = compileFormula(draft);
    expect(ast).toEqual(original);
    const result = evaluateFormula(formulaSource(ast), context), expected = evaluateFormula(expression, context);
    expect(result.value).toEqual(expected.value); expect(result.dice).toEqual(expected.dice);
  });
  it("does not turn empty, invalid, or unbounded numeric input into zero", () => {
    for (const value of ["", "  ", "NaN", "Infinity", "1000000000001"]) expect(() => numberValue(value, "Wert")).toThrow();
    expect(() => compileFormula({ kind: "dice", count: "1.5", sides: "6", keep: "none", keepCount: "1", explode: "" })).toThrow();
    expect(() => compileFormula({ kind: "literal", type: "number", value: "" })).toThrow();
    expect(numberValue("-1.25", "Wert")).toBe(-1.25);
  });
  it("preserves valid long expression chains without doubling their parser depth", () => {
    const source = Array.from({ length: 32 }, () => "1").join(" + ");
    const draft = formulaDraft(parseFormula(source));
    expect(evaluateFormula(formulaSource(compileFormula(draft)), context).value).toBe(32);
    const pkg = newPackage("Sera"); pkg.actions[0]!.formula = draft;
    expect(validateDraft(pkg).valid).toBe(true);
  });
  it.each([1e-7, -1e-7, 1.234567e-8, 5e-324, 1e12])("prints %s as an exact decimal accepted by the closed grammar", value => {
    expect(decimalSource(value)).not.toMatch(/[eE]/); expect(evaluateFormula(decimalSource(value), context).value).toBe(value);
  });
  it("rejects host-language expressions and invalid knowledge arguments", () => {
    const draft = newPackage("Sera"); draft.actions[0]!.formula = { kind: "call", name: "haelt", args: [{ kind: "literal", type: "number", value: "1" }] };
    expect(validateDraft(draft).valid).toBe(false);
    expect(() => parseFormula("globalThis.fetch(1)")).toThrow();
  });
});

describe("immutable rule package drafts", () => {
  it("opens and exports existing packages without rewriting expression bytes or optional members", () => {
    const input = parseRulePackage({ ...DEMO_RULE_PACKAGE, actions: [{ ...DEMO_RULE_PACKAGE.actions[0], expression: "  1d6 + actor.insight   " }], selfTests: [], version: "1.1.0", migrations: [{ from: "1.0.0", to: "1.1.0", steps: [{ kind: "numeric", field: "insight", expression: "actor.value *  1" }] }] });
    const draft = packageDraft(input);
    expect(stableJson(compilePackage(draft))).toBe(stableJson(input));
    draft.name = "Geänderter Entwurf"; expect(input.name).toBe(DEMO_RULE_PACKAGE.name);
    expect(stableJson(compilePackage(packageDraft(DEMO_RULE_PACKAGE)))).toBe(stableJson(DEMO_RULE_PACKAGE));
  });
  it("creates an editable next version with an explicit direct migration without mutating history", () => {
    const occupied = parseRulePackage({ ...DEMO_RULE_PACKAGE, version: "1.0.1" });
    const draft = forkPackage(DEMO_RULE_PACKAGE, [DEMO_RULE_PACKAGE, occupied]);
    expect(draft.version).toBe("1.0.2"); expect(draft.migrations.map(({ from, steps }) => ({ from, steps }))).toEqual([{ from: "1.0.0", steps: [] }]);
    draft.fields[0]!.defaultValue = "4";
    expect(DEMO_RULE_PACKAGE.fields.insight!.default).toBe(2);
    const target = compilePackage(draft), registry = new RulePackageRegistry(); registry.install(DEMO_RULE_PACKAGE); registry.install(target);
    expect(() => registry.install({ ...DEMO_RULE_PACKAGE, name: "Anderer Inhalt" })).toThrow(/immutable/);
    expect(registry.get({ id: DEMO_RULE_PACKAGE.id, version: "1.0.0" })).toEqual(DEMO_RULE_PACKAGE);
  });
  it("keeps section references attached to editor identities when a field is renamed", () => {
    const draft = newPackage("Sera"); const field = draft.fields.find(f => f.id === "name")!;
    field.id = "character_name";
    const pkg = compilePackage(draft); expect(pkg.layout.sections[0]!.fields).toContain("character_name"); expect(pkg.layout.sections[0]!.fields).not.toContain("name");
    draft.fields = draft.fields.filter(f => f.localId !== field.localId); expect(validateDraft(draft).valid).toBe(false);
  });
  it("keeps reference errors visible when action fields are removed", () => {
    const draft = newPackage("Sera"); draft.fields = draft.fields.filter(f => f.id !== "insight"); draft.sections = [];
    expect(validateDraft(draft).valid).toBe(false);
  });
  it("supports every field type and rejects duplicate or prototype identifiers", () => {
    const draft = newPackage("Sera"); draft.fields.push(fieldDraft("ratio", { type: "number", label: "Faktor", default: 1.5, minimum: 0, maximum: 3 }), newField("ready", "boolean"), fieldDraft("mood", { type: "string", label: "Stimmung", default: "ruhig", maxLength: 20, enum: ["ruhig", "wach"] }));
    expect(compilePackage(draft).fields.ratio!.default).toBe(1.5);
    const ready = draft.fields.find(f => f.id === "ready")!; expect(changeFieldType(ready, "integer").localId).toBe(ready.localId);
    const duplicate = copyJson(draft); duplicate.fields.push(newField("insight")); expect(validateDraft(duplicate).valid).toBe(false);
    for (const id of ["constructor", "__proto__", "prototype"]) { const unsafe = copyJson(draft); unsafe.fields.push(newField(id)); expect(validateDraft(unsafe).valid).toBe(false); }
  });
  it("creates new namespaced packages and distinct actions without an identity collision", () => {
    const first = compilePackage(newPackage("Sera")); const second = compilePackage(newPackage("Brannt", [first])); expect(second.id).not.toBe(first.id); expect(second.authors).toEqual(["Brannt"]);
    expect(newAction(["aktion1", "aktion2"]).id).toBe("aktion3");
  });
});

describe("migration and fixture evidence", () => {
  it("authors ordered rename, add, archive, and numeric steps against real migration semantics", () => {
    const draft = forkPackage(DEMO_RULE_PACKAGE, [DEMO_RULE_PACKAGE]);
    draft.fields = draft.fields.filter(f => f.id !== "name"); draft.sections = []; draft.fields.push(newField("ready", "boolean"));
    draft.fields.find(f => f.id === "vigour")!.id = "energy";
    draft.migrations[0]!.steps = [{ kind: "rename", from: "vigour", to: "energy" }, { kind: "numeric", field: "energy", expression: "min(actor.value * 2, 12)" }, { kind: "archive", field: "name" }, { kind: "add", field: "ready", value: true }].map(step => migrationStepDraft(step as Parameters<typeof migrationStepDraft>[0]));
    const pkg = compilePackage(draft), preview = previewPackageMigration(DEMO_RULE_PACKAGE, pkg, [{ id: "sera", fields: { insight: 3, vigour: 4, name: "Sera" } }]);
    expect(preview.entities[0]!.after).toEqual({ insight: 3, energy: 8, ready: true }); expect(preview.entities[0]!.archived).toEqual({ name: "Sera" });
    expect(preview.entities[0]!.before).toEqual({ insight: 3, vigour: 4, name: "Sera" });
  });
  it("rejects implicit field additions and random or knowledge-based numeric migrations", () => {
    const draft = forkPackage(DEMO_RULE_PACKAGE, [DEMO_RULE_PACKAGE]); draft.fields.push(newField("newfield"));
    expect(() => previewPackageMigration(DEMO_RULE_PACKAGE, compilePackage(draft), [{ id: "sera", fields: {} }])).toThrow(/explicit add/);
    for (const expression of ["1d6", 'haelt_etikett("spuren")']) { draft.migrations[0]!.steps = [migrationStepDraft({ kind: "numeric", field: "insight", expression })]; expect(validateDraft(draft).valid).toBe(false); }
  });
  it("drops removed fixture fields, preserves invalid draft values for honest errors, and fills new defaults", () => {
    expect(fixtureValues(DEMO_RULE_PACKAGE.fields, { insight: "", removed: 42 })).toEqual({ insight: "", vigour: 6, name: "Reisende Person" });
  });
  it("runs saved fixture expectations rather than treating shape validation as a passing test", () => {
    const pkg = parseRulePackage({ ...DEMO_RULE_PACKAGE, actions: [{ ...DEMO_RULE_PACKAGE.actions[0], expression: 'haelt_etikett("spuren")' }], selfTests: [
      { name: "Gehalten", actionId: "investigate", context: { ...context, actor: {} }, expectedTotal: 1 },
      { name: "Falsche Erwartung", actionId: "investigate", context: { ...context, actor: {} }, expectedTotal: 2 },
      { name: "Falscher Feldtyp", actionId: "investigate", context: { ...context, actor: { insight: "leer" } }, expectedTotal: 1 },
    ] });
    const results = packageTestResults(pkg); expect(results.map(r => r.passed)).toEqual([true, false, false]); expect(results[1]!.actual).toBe(1); expect(results[2]!.error).toMatch(/number/);
    expect(() => new RulePackageRegistry().install(pkg)).toThrow(/self-test failed/);
  });
});

describe("expression text on drafts", () => {
  it("returns the typed expression verbatim when set and falls back to the visual tree otherwise", async () => {
    const { draftExpression, packageDraft } = await import("../src/features/rule-forge-model");
    const draft = packageDraft(DEMO_RULE_PACKAGE), action = draft.actions[0]!;
    expect(draftExpression(action)).toBe(DEMO_RULE_PACKAGE.actions[0]!.expression);
    expect(draftExpression({ ...action, expression: "1d20 + actor.insight" })).toBe("1d20 + actor.insight");
    expect(draftExpression({ ...action, expression: "1d20 +" })).toBe("1d20 +");
    expect(validateDraft({ ...draft, actions: [{ ...action, expression: "1d20 +" }] }).valid).toBe(false);
  });
});
