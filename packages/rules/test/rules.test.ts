import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DEMO_RULE_PACKAGE, ENGINE_VERSION, RNG_ALGORITHM, RULE_LIMITS, RulePackageRegistry, RuleValidationError, defaultActorFields, erfahrungsgrad, evaluateAction, evaluateFormula, haelt, haelt_etikett, parseDice, parseFormula, parseFormulaAst, parseProjectedKnowledge, parseRulePackage, previewPackageMigration, replayAction, stableJson, type EvaluationContext, type Formula, type RulePackage } from "../src/index.ts";

const SEED = "00000001000000020000000300000004";
const context = (experience?: "erfahren" | "gesprochen" | "gehoert"): EvaluationContext => ({
  seed: SEED, actor: { insight: 2 }, input: { topic: "spuren" },
  knowledge: { actorId: "sera", passages: experience ? [{ passageId: "p-visible", labels: ["spuren"], experience }] : [] },
});
const clonePackage = (): Record<string, unknown> => JSON.parse(JSON.stringify(DEMO_RULE_PACKAGE)) as Record<string, unknown>;
const fixture = (name: string) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8");

describe("declarative package boundary", () => {
  it("parses an original package and produces an empty semantic JSON roundtrip", () => {
    expect(parseRulePackage(stableJson(DEMO_RULE_PACKAGE))).toEqual(DEMO_RULE_PACKAGE);
    expect(defaultActorFields(DEMO_RULE_PACKAGE)).toEqual({ insight: 2, vigour: 6, name: "Reisende Person" });
    expect(Object.isFrozen(DEMO_RULE_PACKAGE.actions[0])).toBe(true);
  });
  it.each(["duplicate-key.json", "prototype-key.json"])("rejects hostile archive fixture %s", name => {
    expect(() => parseRulePackage(fixture(name))).toThrow(RuleValidationError);
  });
  it("rejects escaped duplicate keys", () => {
    expect(() => parseRulePackage('{"id":"one","\\u0069d":"two"}')).toThrow(/duplicate/);
  });
  it.each(["scripts", "assets", "entitySchemas", "unsafeHtml"])("rejects unsupported behavior %s", property => {
    expect(() => parseRulePackage({ ...clonePackage(), [property]: "https://evil.invalid/execute" })).toThrow(/unsupported/);
  });
  it.each([2, 0, "1"])("rejects unsupported schema version %s", schemaVersion => {
    expect(() => parseRulePackage({ ...clonePackage(), schemaVersion })).toThrow(/schemaVersion/);
  });
  it("rejects unsupported engines, invalid release versions and unbounded schema fields", () => {
    expect(() => parseRulePackage({ ...clonePackage(), engineVersion: "9.0.0" })).toThrow(/engine/);
    expect(() => parseRulePackage({ ...clonePackage(), version: "latest" })).toThrow(/version/);
    const pkg = clonePackage(); (pkg.fields as Record<string, unknown>).unbounded = { type: "integer", label: "Unsafe", default: 0 };
    expect(() => parseRulePackage(pkg)).toThrow(/minimum/);
  });
  it("rejects duplicate action IDs, unknown references and skipped confirmation", () => {
    const action = DEMO_RULE_PACKAGE.actions[0]!;
    expect(() => parseRulePackage({ ...clonePackage(), actions: [action, action] })).toThrow(/duplicate action/);
    expect(() => parseRulePackage({ ...clonePackage(), layout: { sections: [{ id: "bad", label: "Bad", fields: ["secret"] }] } })).toThrow(/unknown field/);
    expect(() => parseRulePackage({ ...clonePackage(), actions: [{ ...action, requiresConfirmation: false }] })).toThrow(/confirmation/);
  });
  it("validates formula types and both conditional branches before any roll", () => {
    const action = DEMO_RULE_PACKAGE.actions[0]!;
    for (const expression of ['1 + "oops"', 'if(true, 1, actor.unknown)', 'haelt("pid")', 'if(true, 1, false)']) {
      expect(() => parseRulePackage({ ...clonePackage(), actions: [{ ...action, expression }] })).toThrow(RuleValidationError);
    }
  });
  it("rejects huge JSON, deep JSON, non-JSON values and getters without invoking them", () => {
    expect(() => parseRulePackage('"' + "x".repeat(RULE_LIMITS.packageBytes) + '"')).toThrow(/size limit/);
    expect(() => parseRulePackage("[".repeat(60) + "0" + "]".repeat(60))).toThrow(/complexity/);
    expect(() => parseRulePackage({ ...clonePackage(), callback: () => 1 })).toThrow(/JSON/);
    let executed = false;
    const obj = Object.defineProperty({}, "id", { enumerable: true, get: () => { executed = true; return "evil"; } });
    expect(() => parseRulePackage(obj)).toThrow(/accessor/); expect(executed).toBe(false);
    const cycle: Record<string, unknown> = {}; cycle.self = cycle;
    expect(() => parseRulePackage(cycle)).toThrow(/cyclic/);
  });
});

describe("bounded formula and dice engine", () => {
  it("uses explicit arithmetic precedence, lazy branches and normalized ASTs", () => {
    expect(evaluateFormula("2 + 3 * 4", context()).value).toBe(14);
    expect(evaluateFormula("if(true, 8, 1 / 0)", context()).value).toBe(8);
    expect(evaluateFormula("false && (1 / 0 > 0)", context()).value).toBe(false);
    expect(evaluateFormula("max(1, 2, floor(8.9))", context()).value).toBe(8);
    expect(parseFormula("1 + 2")).toEqual(parseFormula("1+2"));
  });
  it.each(["eval(1)", "fetch(1)", "process.env", "actor.constructor", "actor[\"insight\"]", "1;2", "1 ** 2", "Date.now()", "(()=>1)()", "while(true)", "1d6!", "0d6", "101d6", "1d1", "1d100001", "1d6kh2"])("rejects hostile or unsupported formula %s", expression => {
    expect(() => parseFormula(expression)).toThrow(RuleValidationError);
  });
  it("rejects arbitrary AST calls and unsupported node properties", () => {
    expect(() => parseFormulaAst(JSON.parse(fixture("host-language-ast.json")))).toThrow(/unsupported/);
    expect(() => parseFormulaAst({ kind: "literal", value: 1, execute: "ignored?" })).toThrow(/unsupported/);
  });
  it("caps recursive expressions, left-deep chains and direct ASTs", () => {
    expect(() => parseFormula("(".repeat(40) + "1" + ")".repeat(40))).toThrow(/complexity/);
    expect(() => parseFormula(Array(80).fill("1").join("+"))).toThrow(/complexity/);
    expect(() => parseFormula("1".repeat(4097))).toThrow(/max/);
    let ast: Formula = { kind: "literal", value: 1 };
    for (let i = 0; i < 60; i++) ast = { kind: "unary", op: "-", value: ast };
    expect(() => evaluateFormula(ast, context())).toThrow(/complexity/);
  });
  it("bounds dice across all nodes and explosions, and rejects non-finite arithmetic", () => {
    expect(() => evaluateFormula("100d6 + 1d6", context())).toThrow(/total dice limit/);
    expect(() => evaluateFormula("100d2!20", context())).toThrow(/total dice limit/);
    expect(() => evaluateFormula("1 / 0", context())).toThrow(/zero/);
    expect(() => evaluateFormula("1000000000000 * 2", context())).toThrow(/finite/);
  });
  it("matches the published xoshiro128** state transition vector [1,2,3,4]", () => {
    const result = evaluateFormula("4d100000", context());
    expect(result.rngAlgorithm).toBe(RNG_ALGORITHM);
    expect(result.dice[0]!.rolls).toEqual([[11521], [1], [27041], [19201]]);
    expect(result.value).toBe(57764);
  });
  it("retains individual dice, stable tie ordering and capped explosion evidence", () => {
    const high = evaluateFormula("4d6kh2", context());
    const low = evaluateFormula("4d6kl2", context());
    expect(high.dice[0]!.rolls).toEqual(low.dice[0]!.rolls);
    expect(high.dice[0]!.kept).toHaveLength(2); expect(low.dice[0]!.kept).toHaveLength(2);
    expect(Number(high.value)).toBeGreaterThanOrEqual(Number(low.value));
    const exploded = evaluateFormula("1d2!1", { ...context(), seed: "ffffffffffffffffffffffffffffffff" });
    expect(exploded.dice[0]!.rolls[0]!.length).toBeLessThanOrEqual(2);
    expect(typeof exploded.dice[0]!.capped).toBe("boolean");
    expect(parseDice("4d6kh3!2")).toEqual({ kind: "dice", count: 4, sides: 6, keep: { mode: "highest", count: 3 }, explode: 2 });
  });
  it.each(["", "guess", "0".repeat(32), "1".repeat(64)])("rejects invalid seed %s", seed => {
    expect(() => evaluateFormula("1d6", { ...context(), seed })).toThrow(/seed/);
  });
});

describe("knowledge belongs to the rolling character projection", () => {
  it("gives experienced and heard characters different modifiers with identical dice", () => {
    const own = evaluateAction(DEMO_RULE_PACKAGE, "investigate", context("erfahren"));
    const heard = evaluateAction(DEMO_RULE_PACKAGE, "investigate", context("gehoert"));
    const absent = evaluateAction(DEMO_RULE_PACKAGE, "investigate", context());
    expect(own.total - heard.total).toBe(2); expect(heard.total - absent.total).toBe(1);
    expect(own.dice).toEqual(heard.dice); expect(own.trace.find(s => s.label === "erfahrungsgrad")?.evidence).toEqual(["p-visible"]);
    expect(absent.trace.filter(s => s.evidence).every(s => s.evidence!.length === 0)).toBe(true);
  });
  it("has byte-identical results when hidden worlds differ but projections do not", () => {
    const hiddenA = { passageId: "secret-one", labels: ["spuren"], experience: "erfahren" };
    const hiddenB = { passageId: "secret-two", labels: ["treasure"], experience: "gehoert" };
    const project = (_hidden: unknown): EvaluationContext => context("gehoert");
    const a = stableJson(evaluateAction(DEMO_RULE_PACKAGE, "investigate", project(hiddenA)));
    const b = stableJson(evaluateAction(DEMO_RULE_PACKAGE, "investigate", project(hiddenB)));
    expect(a).toBe(b); expect(a).not.toContain("secret-one"); expect(b).not.toContain("secret-two");
  });
  it("derives strongest held experience, counts distinct passages and never guesses access", () => {
    const knowledge = parseProjectedKnowledge({ actorId: "sera", passages: [
      { passageId: "a", labels: ["spuren"], experience: "gehoert" },
      { passageId: "b", labels: ["spuren"], experience: "gesprochen" },
    ] });
    expect(haelt(knowledge, "a")).toBe(true); expect(haelt(knowledge, "secret")).toBe(false);
    expect(haelt_etikett(knowledge, "spuren")).toBe(2); expect(erfahrungsgrad(knowledge, "spuren")).toBe("gesprochen");
    expect(erfahrungsgrad(knowledge, "secret")).toBe("unbekannt");
  });
  it("rejects private fields, duplicate held passages and forged experience constructors", () => {
    const p = context("gehoert").knowledge.passages[0]!;
    expect(() => parseProjectedKnowledge({ actorId: "x", passages: [{ ...p, grant: "all" }] })).toThrow(/unsupported/);
    expect(() => parseProjectedKnowledge({ actorId: "x", passages: [p, p] })).toThrow(/duplicate/);
    expect(() => parseProjectedKnowledge({ actorId: "x", passages: [{ ...p, experience: "gm" }] })).toThrow(/experience/);
  });
});

describe("action receipts, replay and immutable versions", () => {
  it("replays every field byte-for-byte and detects changed totals, seed, engine and pin", () => {
    const receipt = evaluateAction(DEMO_RULE_PACKAGE, "investigate", context("erfahren"));
    expect(receipt.engineVersion).toBe(ENGINE_VERSION); expect(receipt.requiresConfirmation).toBe(true);
    expect(replayAction(DEMO_RULE_PACKAGE, receipt)).toEqual({ valid: true, result: receipt });
    expect(replayAction(DEMO_RULE_PACKAGE, { ...receipt, total: receipt.total + 1 }).valid).toBe(false);
    expect(replayAction(DEMO_RULE_PACKAGE, { ...receipt, context: { ...receipt.context, seed: "ffffffffffffffffffffffffffffffff" } }).valid).toBe(false);
    expect(replayAction(DEMO_RULE_PACKAGE, { ...receipt, package: { ...receipt.package, version: "1.1.0" } }).valid).toBe(false);
    expect(replayAction(DEMO_RULE_PACKAGE, { ...receipt, engineVersion: "0.0.0" } as unknown as typeof receipt).valid).toBe(false);
  });
  it("does not accept caller values outside the declared actor and input schema", () => {
    expect(() => evaluateAction(DEMO_RULE_PACKAGE, "investigate", { ...context(), actor: { insight: 100 } })).toThrow(/range/);
    expect(() => evaluateAction(DEMO_RULE_PACKAGE, "investigate", { ...context(), actor: { admin: true } })).toThrow(/unsupported/);
    expect(() => evaluateAction(DEMO_RULE_PACKAGE, "investigate", { ...context(), input: { secret: 2 } })).toThrow(/unsupported/);
    expect(() => evaluateAction(DEMO_RULE_PACKAGE, "unknown", context())).toThrow(/not found/);
  });
  it("installs inactive versions, rejects overwrites and runs package self-tests", () => {
    const registry = new RulePackageRegistry(); registry.install(DEMO_RULE_PACKAGE);
    expect(registry.install(DEMO_RULE_PACKAGE)).toBe(registry.get(DEMO_RULE_PACKAGE));
    expect(() => registry.install({ ...clonePackage(), name: "Silent alteration" })).toThrow(/immutable/);
    const good = { ...clonePackage(), version: "1.1.0", selfTests: [{ name: "original vector", actionId: "investigate", context: context(), expectedTotal: 2 }] };
    registry.install(good); expect(registry.get(DEMO_RULE_PACKAGE).version).toBe("1.0.0"); expect(registry.list()).toHaveLength(2);
    expect(() => registry.install({ ...good, version: "1.2.0", selfTests: [{ ...good.selfTests[0], expectedTotal: 900 }] })).toThrow(/self-test/);
    expect(() => registry.get({ id: DEMO_RULE_PACKAGE.id, version: "1.2.0" })).toThrow(/not installed/);
  });
});

describe("migration dry-run and non-retroactivity", () => {
  function nextPackage(): RulePackage {
    const source = DEMO_RULE_PACKAGE;
    return parseRulePackage({ ...source, version: "1.1.0",
      fields: { focus: source.fields.insight, name: source.fields.name, luck: { type: "integer", label: "Gluck", minimum: 0, maximum: 10, default: 1 } },
      layout: { sections: [{ id: "character", label: "Figur", fields: ["name", "focus", "luck"] }] },
      actions: source.actions.map(action => ({ ...action, version: "1.1.0", expression: action.expression.replace("actor.insight", "actor.focus") })),
      migrations: [{ from: "1.0.0", to: "1.1.0", steps: [
        { kind: "rename", from: "insight", to: "focus" }, { kind: "archive", field: "vigour" },
        { kind: "add", field: "luck", value: 1 }, { kind: "numeric", field: "focus", expression: "min(6, actor.value + 1)" },
      ] }],
    });
  }
  it("previews field changes, preserves removed data and leaves old receipts untouched", () => {
    const oldReceipt = evaluateAction(DEMO_RULE_PACKAGE, "investigate", context("erfahren")); const original = stableJson(oldReceipt);
    const actor = { id: "sera", fields: defaultActorFields(DEMO_RULE_PACKAGE) }; const next = nextPackage();
    const preview = previewPackageMigration(DEMO_RULE_PACKAGE, next, [actor]);
    expect(preview.entities[0]!.after).toEqual({ focus: 3, luck: 1, name: "Reisende Person" });
    expect(preview.entities[0]!.archived).toEqual({ vigour: 6 }); expect(preview.requiresConfirmation).toBe(true);
    expect(actor.fields).toEqual(defaultActorFields(DEMO_RULE_PACKAGE)); expect(stableJson(oldReceipt)).toBe(original);
    expect(replayAction(DEMO_RULE_PACKAGE, oldReceipt).valid).toBe(true); expect(replayAction(next, oldReceipt).valid).toBe(false);
  });
  it("requires explicit migration and never overwrites a rename target", () => {
    const next = nextPackage(); const actors = [{ id: "sera", fields: defaultActorFields(DEMO_RULE_PACKAGE) }];
    expect(() => previewPackageMigration(DEMO_RULE_PACKAGE, { ...next, migrations: [] }, actors)).toThrow(/explicit/);
    expect(() => previewPackageMigration(DEMO_RULE_PACKAGE, { ...next, migrations: [{ from: "1.0.0", to: "1.1.0", steps: [{ kind: "rename", from: "insight", to: "vigour" }] }] }, actors)).toThrow(/occupied/);
    expect(() => previewPackageMigration(DEMO_RULE_PACKAGE, { ...next, migrations: [{ from: "1.0.0", to: "1.1.0", steps: [] }] }, actors)).toThrow(/final fields/);
  });
  it("forbids randomness, implicit knowledge and undeclared migration operations", () => {
    const next = nextPackage();
    for (const expression of ["1d6", 'haelt_etikett("spuren")', 'if(haelt("p"), 1, 0)']) {
      expect(() => parseRulePackage({ ...next, migrations: [{ from: "1.0.0", to: "1.1.0", steps: [{ kind: "numeric", field: "focus", expression }] }] })).toThrow(RuleValidationError);
    }
    expect(() => parseRulePackage({ ...next, migrations: [{ from: "1.0.0", to: "1.1.0", steps: [{ kind: "execute", script: "yes" }] }] })).toThrow(/unsupported/);
  });
});
