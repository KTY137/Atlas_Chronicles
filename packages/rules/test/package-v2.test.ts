// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import * as rules from "../src/index.ts";
import type { EvaluationContext } from "../src/index.ts";

const context: EvaluationContext = { seed: "00000001000000020000000300000004", actor: {}, input: {}, knowledge: { actorId: "hero", passages: [] } };
const fixture = () => ({ ...rules.DEMO_RULE_PACKAGE, schemaVersion: 2, actions: [{ ...rules.DEMO_RULE_PACKAGE.actions[0]!, id: "check", expression: "1d100", inputs: {}, threshold: undefined, outcome: { bands: [{ id: "success", label: "Success", comparison: "lte", expression: "70", success: true }], fallback: { id: "failure", label: "Failure", success: false } } }], computed: [{ id: "unused", label: "Unused", expression: "actor.insight + 1" }], constraints: [{ id: "bounded", message: "Vigour exceeds insight", expression: "actor.vigour <= actor.insight + 4" }], selfTests: [], attribution: { title: "Fixture", sources: [{ title: "Source", url: "https://example.org/rules", revision: "1", authors: ["Test"] }], licenseUrl: "https://creativecommons.org/licenses/by-nc-sa/4.0/", notice: "Test attribution", changes: "Original fixture" } });
// Serializing removes the deliberately absent v1 threshold without relaxing the parser.
const pkg = () => rules.parseSupportedRulePackage(JSON.stringify(fixture()));
const changed = (overrides: Record<string, unknown>) => rules.parseSupportedRulePackage({ ...pkg(), ...overrides });
const balanced = (count: number): string => count === 1 ? "1" : `(${balanced(Math.floor(count / 2))} + ${balanced(Math.ceil(count / 2))})`;

describe("supported v2 package regressions", () => {
  it("binds attribution and unused computed expressions to original receipts", () => {
    const original = pkg(); const result = rules.evaluateSupportedAction(original, "check", context);
    expect(rules.replaySupportedAction(original, result).valid).toBe(true);
    for (const changed of [{ ...original, attribution: { ...fixture().attribution, notice: "Rewritten author" } }, { ...original, computed: [{ id: "unused", label: "Unused", expression: "actor.insight + 2" }] }]) {
      expect(rules.replaySupportedAction(rules.parseSupportedRulePackage(changed), result).valid).toBe(false);
    }
    expect(rules.supportedPackageContentHash(original)).toBe(createHash("sha256").update(rules.stableJson(original)).digest("hex"));
  });
  it("rejects cross-field violations on direct validation and before rolling", () => {
    const original = pkg();
    expect(() => rules.validatePackageFields(original, { insight: 0, vigour: 6 })).toThrow(/Vigour/);
    expect(() => rules.evaluateSupportedAction(original, "check", { ...context, actor: { insight: 0, vigour: 6 } })).toThrow(/Vigour/);
    expect(() => rules.validatePackageFields(original, { unused: 12 })).toThrow(/unsupported/);
  });
  it("requires explicit catalogue migration and validates target constraints", () => {
    const original = pkg();
    const revision = rules.parseSupportedRulePackage({ ...original, version: "1.1.0", fields: { ...original.fields, added: { type: "integer", label: "New", default: 0, minimum: 0, maximum: 100 } }, migrations: [{ from: original.version, to: "1.1.0", steps: [] }] });
    const entities = [{ id: "hero", fields: rules.defaultSupportedActorFields(original) }];
    expect(() => rules.previewSupportedPackageMigration(original, revision, entities)).toThrow(/explicit add\/archive/);
    const valid = rules.parseSupportedRulePackage({ ...revision, migrations: [{ from: original.version, to: "1.1.0", steps: [{ kind: "add", field: "added", value: 2 }] }] });
    expect(rules.previewSupportedPackageMigration(original, valid, entities).entities[0]!.after.added).toBe(2);
    const invalid = rules.parseSupportedRulePackage({ ...valid, constraints: [{ id: "invalid", message: "Target invalid", expression: "actor.added < 1" }] });
    expect(() => rules.previewSupportedPackageMigration(original, invalid, entities)).toThrow(/Target invalid/);
  });
});

describe("closed v2 vocabulary and deterministic limits", () => {
  it("keeps v1 parsing, receipts, defaults and registry behavior identical", () => {
    const legacyContext = { ...context, input: { topic: "spuren" } };
    expect(rules.stableJson(rules.evaluateSupportedAction(rules.DEMO_RULE_PACKAGE, "investigate", legacyContext))).toBe(rules.stableJson(rules.evaluateAction(rules.DEMO_RULE_PACKAGE, "investigate", legacyContext)));
    expect(rules.defaultSupportedActorFields(rules.DEMO_RULE_PACKAGE)).toEqual(rules.defaultActorFields(rules.DEMO_RULE_PACKAGE));
    expect(() => rules.parseRulePackage(pkg())).toThrow();
    for (const key of ["computed", "constraints", "vitals", "attribution"]) expect(() => rules.parseSupportedRulePackage({ ...rules.DEMO_RULE_PACKAGE, [key]: [] })).toThrow(/unsupported/);
    expect(() => rules.parseSupportedRulePackage({ ...pkg(), schemaVersion: 3 })).toThrow(/unsupported/);
  });
  it.each(["1d6", 'if(false, 1d6, 0)', 'haelt_etikett("secret")', 'if(haelt("secret"), 1, 0)', "actor.absent", "input.missing", "actor.unused", '"string"', "true"])("rejects nonportable computed expression %s", expression => {
    expect(() => changed({ computed: [{ id: "value", label: "Value", expression }] })).toThrow();
  });
  it("rejects duplicate IDs, stored/computed collisions, unsafe URLs and mismatched types", () => {
    const output = { id: "value", label: "Value", expression: "1" };
    expect(() => changed({ computed: [output, output] })).toThrow(/duplicate/);
    expect(() => changed({ computed: [{ ...output, id: "insight" }] })).toThrow(/duplicate/);
    expect(() => changed({ constraints: [{ id: "bad", message: "Bad", expression: "1" }] })).toThrow(/boolean/);
    expect(() => changed({ attribution: { ...fixture().attribution, licenseUrl: "javascript:alert(1)" } })).toThrow(/HTTP/);
    expect(() => changed({ attribution: { ...fixture().attribution, sources: [{ ...fixture().attribution.sources[0], url: "https://user:password@example.org" }] } })).toThrow(/HTTP/);
    expect(() => changed({ actions: [{ ...pkg().actions[0], preconditions: [{ id: "bad", message: "Bad", expression: 'haelt("secret")' }] }] })).toThrow(/knowledge/);
  });
  // Ein Vitalwert ist die einzige Quelle der Niederlage. Was er annehmen darf, entscheidet hier
  // der Parser — nicht die Anzeige und nicht der Server, die beide nur lesen, was hier durchkam.
  it("rejects vitals without a numeric field, a portable maximum or a declared depletion", () => {
    const vital = { id: "vigour", label: "Kraft", max: "12", depletion: "defeat" };
    expect(() => changed({ vitals: [vital, vital] })).toThrow(/duplicate/);
    // Ein Vitalwert ohne Zahlenfeld haette keinen Stand: weder ein Textfeld noch ein fehlendes.
    for (const id of ["name", "absent"]) expect(() => changed({ vitals: [{ ...vital, id }] })).toThrow(/number or integer/);
    // Eine unbekannte oder fehlende Erschoepfung ist keine Voreinstellung, sondern ein Fehler.
    for (const depletion of ["death", "", 0, true]) expect(() => changed({ vitals: [{ ...vital, depletion }] })).toThrow(/depletion/);
    expect(() => changed({ vitals: [{ id: vital.id, label: vital.label, max: vital.max }] })).toThrow(/depletion/);
    // `null` ist gueltiges JSON und faellt deshalb erst der Erschoepfungspruefung zum Opfer;
    // `undefined` ist keins und scheitert schon am Transportvertrag. Beide Wege enden in einer
    // Ablehnung — keiner in einer stillen Voreinstellung.
    expect(() => changed({ vitals: [{ ...vital, depletion: null }] })).toThrow(/depletion/);
    expect(() => changed({ vitals: [{ ...vital, depletion: undefined }] })).toThrow(/JSON value/);
    expect(() => changed({ vitals: [{ ...vital, ruin: true }] })).toThrow(/unsupported property ruin/);
    expect(() => changed({ vitals: [{ ...vital, label: "" }] })).toThrow(/vital.label/);
    expect(() => changed({ vitals: Array.from({ length: 9 }, () => vital) })).toThrow(/max 8/);
  });
  // Der Hoechststand wird gegen GESPEICHERTE Felder geprueft und spaeter gegen dieselben
  // ausgewertet. Faenden die beiden Namensraeume auseinander, ergaebe ein gueltiges Paket eine
  // Anzeige, die erst beim Anschauen bricht — deshalb steht jede dieser Ablehnungen hier.
  it.each(["1d6", "actor.absent", "actor.name", "actor.unused", "input.topic", "true", '"string"'])("rejects nonportable vital maximum %s", max => {
    expect(() => changed({ vitals: [{ id: "vigour", label: "Kraft", max, depletion: "defeat" }] })).toThrow();
  });
  it("reads declared vitals with an evaluated maximum and reports defeat only where it is declared", () => {
    // Kein Vitalwert ist ein zulaessiger Zustand: weder ein v1-Paket noch ein v2-Paket ohne
    // Deklaration hat eine Anzeige, und beide duerfen deswegen nicht werfen.
    expect(rules.evaluateVitals(rules.DEMO_RULE_PACKAGE, {})).toEqual([]);
    expect(rules.evaluateVitals(pkg(), {})).toEqual([]);
    expect(rules.depletedDefeatVitals(pkg(), {})).toEqual([]);
    const declared = changed({ vitals: [
      { id: "vigour", label: "Kraft", max: "actor.insight * 2", depletion: "defeat" },
      { id: "insight", label: "Scharfsinn", max: "6", depletion: "none" },
    ] });
    expect(rules.evaluateVitals(declared, { insight: 3, vigour: 6 })).toEqual([
      { id: "vigour", label: "Kraft", max: "actor.insight * 2", depletion: "defeat", value: 6, maximum: 6, depleted: false },
      { id: "insight", label: "Scharfsinn", max: "6", depletion: "none", value: 3, maximum: 6, depleted: false },
    ]);
    expect(rules.depletedDefeatVitals(declared, { insight: 3, vigour: 6 })).toEqual([]);
    // Beide Vorraete sind leer — aber nur der ausgewiesene bedeutet Niederlage. Das ist der
    // ganze Unterschied zur v1-Grobheit "irgendeine Zahl ist 0", die H1 zu Recht gesperrt hat.
    expect(rules.evaluateVitals(declared, { insight: 0, vigour: 0 }).map(v => v.depleted)).toEqual([true, true]);
    expect(rules.depletedDefeatVitals(declared, { insight: 0, vigour: 0 }).map(v => v.id)).toEqual(["vigour"]);
    // Ein ungueltiger Bogen hat auch keine gueltige Anzeige: die Vertragspruefung laeuft zuerst.
    expect(() => rules.evaluateVitals(declared, { insight: 0, vigour: 6 })).toThrow(/Vigour/);
  });
  it("rejects malformed and ambiguous outcome records", () => {
    const action = fixture().actions[0]!; const original = JSON.parse(JSON.stringify(action)) as Record<string, unknown>;
    const band = action.outcome.bands[0]!;
    const outcome = action.outcome;
    for (const bad of [
      { ...outcome, bands: [band, band] },
      { ...outcome, fallback: { ...outcome.fallback, id: band.id } },
      { ...outcome, bands: [{ ...band, comparison: "equals" }] },
      { ...outcome, bands: [{ ...band, expression: "1d100" }] },
      { ...outcome, bands: [{ ...band, expression: "input.absent" }] },
      { ...outcome, bands: [{ ...band, success: "true" }] },
    ]) expect(() => changed({ actions: [{ ...original, outcome: bad }] })).toThrow();
    expect(() => changed({ actions: [{ ...original, threshold: 0 }] })).toThrow(/mutually exclusive/);
  });
  it.each(["https:example.org", "https:/example.org", "https:\\example.org"])("rejects source URL shorthand outside the published HTTP(S) schema: %s", licenseUrl => {
    expect(() => changed({ attribution: { ...fixture().attribution, licenseUrl } })).toThrow(/HTTP/);
  });
  it("evaluates every ordered band even after an earlier match", () => {
    const action = pkg().actions[0]!;
    const invalid = changed({ actions: [{ ...action, expression: "1", outcome: { bands: [
      { id: "first", label: "First", comparison: "eq", expression: "1", success: true },
      { id: "later", label: "Later", comparison: "eq", expression: "1 / 0", success: false },
    ], fallback: { id: "fallback", label: "Fallback", success: false } } }] });
    expect(() => rules.evaluateSupportedAction(invalid, "check", context)).toThrow(/division by zero/);
    const blocked = changed({ actions: [{ ...action, expression: "1 / 0 + 1d100", preconditions: [{ id: "stop", message: "Stop before dice", expression: "false" }] }] });
    expect(() => rules.evaluateSupportedAction(blocked, "check", context)).toThrow(/Stop before dice/);
  });
  it("shares operations across computations, assertions, the primary roll and all bands", () => {
    const action = pkg().actions[0]!;
    const excessive = changed({ computed: Array.from({ length: 9 }, (_, i) => ({ id: `computed_${i}`, label: "Computed", expression: balanced(128) })), actions: [{ ...action, outcome: { bands: Array.from({ length: 8 }, (_, i) => ({ id: `band_${i}`, label: "Band", comparison: "gte", expression: balanced(128), success: false })), fallback: { id: "fallback", label: "Fallback", success: true } } }] });
    expect(() => rules.evaluateSupportedAction(excessive, "check", context)).toThrow(/aggregate operation/);
    const computed = changed({ computed: Array.from({ length: 17 }, (_, i) => ({ id: `computed_${i}`, label: "Computed", expression: balanced(128) })) });
    expect(() => rules.validatePackageFields(computed, {})).toThrow(/aggregate operation/);
    expect(() => rules.evaluateComputedFields(computed, {})).toThrow(/aggregate operation/);
  });
});

describe("complete replay and installation", () => {
  it("records one primary RNG calculation and ordered threshold traces separately", () => {
    const original = pkg(); const result = rules.evaluateSupportedAction(original, "check", context);
    if (result.schemaVersion !== 2) throw new Error("v2 expected");
    const primary = rules.evaluateFormula("1d100", result.context);
    expect(result.dice).toEqual(primary.dice); expect(result.trace).toEqual(primary.trace); expect(result.operations).toBe(primary.operations);
    expect(result.outcomeTrace).toHaveLength(1); expect(result.outcomeTrace![0]!.dice).toEqual([]);
    expect(result.success).toBe(result.outcome!.success); expect(result.evaluationOperations).toBeGreaterThan(result.operations);
    const altered = JSON.parse(JSON.stringify(result)) as rules.ActionResultV2;
    const mutations: unknown[] = [{ ...altered, total: altered.total + 1 }, { ...altered, packageSchemaVersion: 1 }, { ...altered, outcomeVersion: "2.0.0" }, { ...altered, packageContentHash: "0".repeat(64) }, { ...altered, outcome: { ...altered.outcome, success: !altered.success } }, { ...altered, outcomeTrace: [] }];
    for (const mutation of mutations) expect(rules.replaySupportedAction(original, mutation as rules.AnyActionResult).valid).toBe(false);
    expect(rules.replaySupportedAction(rules.DEMO_RULE_PACKAGE, result).valid).toBe(false);
  });
  it("checks success and outcome self-tests rather than total alone", () => {
    const original = pkg(); const result = rules.evaluateSupportedAction(original, "check", context);
    if (result.schemaVersion !== 2) throw new Error("v2 expected");
    const test = { name: "Outcome", actionId: "check", context, expectedTotal: result.total, expectedSuccess: result.success, expectedOutcomeId: result.outcome!.id };
    const registry = new rules.SupportedRulePackageRegistry(); const installed = registry.install(changed({ selfTests: [test] }));
    expect(registry.get(installed)).toBe(installed); expect(registry.list()).toHaveLength(1);
    expect(() => new rules.SupportedRulePackageRegistry().install(changed({ selfTests: [{ ...test, expectedSuccess: !result.success }] }))).toThrow(/self-test/);
    expect(() => new rules.SupportedRulePackageRegistry().install(changed({ selfTests: [{ ...test, expectedOutcomeId: "wrong" }] }))).toThrow(/self-test/);
    expect(() => registry.install({ ...installed, name: "Changed content" })).toThrow(/immutable/);
    expect(() => new rules.SupportedRulePackageRegistry().install(changed({ constraints: [{ id: "bad_default", message: "Bad default", expression: "false" }] }))).toThrow(/Bad default/);
  });
  it.each([1, 55, 56, 63, 64, 65, 120, 511, 1024])("matches native SHA-256 with varying UTF-8 length %s", length => {
    const original = changed({ attribution: { ...fixture().attribution, notice: "ä".repeat(length) } });
    expect(rules.supportedPackageContentHash(original)).toBe(createHash("sha256").update(rules.stableJson(original)).digest("hex"));
  });
});

describe("supported migrations", () => {
  it("admits explicit v1 to v2 and preserves archived values", () => {
    const legacy = rules.DEMO_RULE_PACKAGE;
    const target = rules.parseSupportedRulePackage({ ...pkg(), version: "1.1.0", migrations: [{ from: legacy.version, to: "1.1.0", steps: [] }] });
    const rows = [{ id: "hero", fields: rules.defaultActorFields(legacy) }];
    expect(rules.previewSupportedPackageMigration(legacy, target, rows).entities[0]!.after).toEqual(rows[0]!.fields);
    const { name: _name, ...fields } = target.fields;
    const removed = rules.parseSupportedRulePackage({ ...target, fields, layout: { sections: [] }, migrations: [{ from: legacy.version, to: "1.1.0", steps: [{ kind: "archive", field: "name" }] }] });
    const preview = rules.previewSupportedPackageMigration(legacy, removed, rows);
    expect(preview.entities[0]!.archived.name).toBe(rows[0]!.fields.name);
    expect(() => rules.previewSupportedPackageMigration(legacy, rules.parseSupportedRulePackage({ ...removed, migrations: [{ from: legacy.version, to: "1.1.0", steps: [] }] }), rows)).toThrow(/explicit add\/archive/);
    expect(() => rules.previewSupportedPackageMigration(target, { ...legacy, version: "2.0.0" }, rows)).toThrow(/downgrade/);
  });
  it("validates the source, refuses cross-ID switches and bounds migration operations", () => {
    const original = pkg(); const revision = changed({ version: "1.1.0", migrations: [{ from: original.version, to: "1.1.0", steps: [] }] });
    expect(() => rules.previewSupportedPackageMigration(original, revision, [{ id: "hero", fields: { insight: 0, vigour: 6 } }])).toThrow(/Vigour/);
    expect(() => rules.previewSupportedPackageMigration(original, { ...revision, id: "another.system" }, [])).toThrow(/same package/);
    const excessive = changed({ version: "1.1.0", migrations: [{ from: original.version, to: "1.1.0", steps: Array.from({ length: 17 }, () => ({ kind: "numeric", field: "insight", expression: balanced(128) })) }] });
    expect(() => rules.previewSupportedPackageMigration(original, excessive, [{ id: "hero", fields: {} }])).toThrow(/aggregate operation/);
  });
});
