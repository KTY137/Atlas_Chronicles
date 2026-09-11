// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import assert from "node:assert/strict";
import { it as test } from "vitest";
import type { RuleAbility } from "@chronicle/rules";
import type { DraftField, RuleDraft } from "../src/features/rule-forge-model";
import { renameRuleEntry, removeRuleEntry, ruleEntryReferences, prerequisiteCandidates, type RuleEntryEdit } from "../src/features/rule-ability-references";

function field(id: string, value = "", maxLength = "256"): DraftField {
  return { localId: id, id, label: id, type: "string", defaultValue: value, minimum: "0", maximum: "0", maxLength, hasEnum: false, enumValues: [] };
}
function ability(id: string, requires?: readonly string[]): RuleAbility {
  return { id, name: id, group: "Test", rank: 1, kind: "einsatz", cost: 1, price: 3, text: "a, unrelated text", ...(requires ? { requires } : {}) };
}
function fixture(): RuleDraft {
  return {
    schemaVersion: 2, id: "rules", name: "Test", version: "1.0.0", license: "BUSL-1.1", authors: [],
    abilityRules: { abilityField: "learned", conditionField: "active", budget: "9" },
    abilities: [ability("a"), ability("b", ["a"]), ability("c", ["b"]), ability("abc")],
    conditions: [{ id: "a", name: "Same identifier in another namespace", text: "a" }, { id: "cold", name: "Cold", text: "cold" }],
    fields: [field("learned", " a, abc "), field("active", "a, cold"), field("notes", "a")], sections: [],
    actions: [{ localId: "roll", id: "roll", name: "Roll", version: "1.0.0", disclosure: "open", thresholdEnabled: false, threshold: "0",
      formula: { kind: "literal", type: "number", value: "1" }, inputs: [field("einsatz", "a,abc"), field("notes", "a")] }],
    migrations: [{ localId: "old", from: "0.9.0", steps: [
      { localId: "add", kind: "add", field: "learned", type: "string", value: "a" },
      { localId: "note", kind: "add", field: "notes", type: "string", value: "a" },
    ] }],
    selfTests: [{ name: "Roll", actionId: "roll", context: {
      actor: { learned: "a, b", active: "a", notes: "a" }, input: { einsatz: " a ", notes: "a" },
      seed: "00000000000000000000000000000001", knowledge: { actorId: "fields", passages: [] },
    }, expectedTotal: 1 }], includeSelfTests: false,
  };
}
function freeze<T>(value: T): T {
  if (value && typeof value === "object") { Object.freeze(value); for (const child of Object.values(value)) freeze(child); }
  return value;
}
function changed(result: RuleEntryEdit): RuleDraft { assert.ok(result.ok); return result.draft; }

test("renames exact ability tokens everywhere without mutating the original or changing unrelated data", () => {
  const original = freeze(fixture()), d = changed(renameRuleEntry(original, "ability", "a", "new_a"));
  assert.equal(d.abilities![0]!.id, "new_a"); assert.deepEqual(d.abilities![1]!.requires, ["new_a"]);
  assert.equal(d.fields[0]!.defaultValue, " new_a, abc "); assert.equal(d.fields[1]!.defaultValue, "a, cold"); assert.equal(d.fields[2]!.defaultValue, "a");
  assert.equal(d.actions[0]!.inputs[0]!.defaultValue, "new_a,abc"); assert.equal(d.actions[0]!.inputs[1]!.defaultValue, "a");
  assert.equal(d.selfTests[0]!.context.actor.learned, "new_a, b"); assert.equal(d.selfTests[0]!.context.actor.active, "a");
  assert.equal(d.selfTests[0]!.context.input.einsatz, " new_a "); assert.equal(d.selfTests[0]!.expectedTotal, 1);
  assert.equal(d.includeSelfTests, false);
  assert.deepEqual(d.migrations[0]!.steps[0], { localId: "add", kind: "add", field: "learned", type: "string", value: "new_a" });
  assert.deepEqual(d.migrations[0]!.steps[1], original.migrations[0]!.steps[1]);
  assert.equal(d.abilities![0]!.text, "a, unrelated text"); assert.equal(d.conditions![0]!.id, "a");
  assert.equal(original.abilities![0]!.id, "a"); assert.equal("requires" in d.abilities![0]!, false);
});
test("renames only the condition namespace", () => {
  const original = freeze(fixture()), d = changed(renameRuleEntry(original, "condition", "a", "alert"));
  assert.equal(d.fields[1]!.defaultValue, "alert, cold"); assert.equal(d.selfTests[0]!.context.actor.active, "alert");
  assert.deepEqual(d.abilities, original.abilities); assert.deepEqual(d.actions, original.actions);
  assert.equal(d.selfTests[0]!.context.input.einsatz, " a ");
});
test("returns the same object for a no-op", () => { const d = freeze(fixture()); assert.equal(changed(renameRuleEntry(d, "ability", "a", "a")), d); });
for (const id of ["", "A", " a", "a ", "a,b", "1abc", "a.b", "constructor", "prototype", "__proto__", "a".repeat(97)]) {
  test(`rejects invalid identifier ${JSON.stringify(id)} atomically`, () => {
    assert.deepEqual(renameRuleEntry(freeze(fixture()), "ability", "a", id), { ok: false, reason: "identifier" });
  });
}
test("rejects duplicate targets and missing or ambiguous sources", () => {
  const d = fixture(); assert.deepEqual(renameRuleEntry(d, "ability", "a", "b"), { ok: false, reason: "duplicate" });
  assert.deepEqual(renameRuleEntry(d, "ability", "absent", "next"), { ok: false, reason: "missing" });
  d.abilities = [...d.abilities!, ability("a")]; assert.deepEqual(renameRuleEntry(d, "ability", "a", "next"), { ok: false, reason: "missing" });
});
test("finds all explicit usages, including disabled tests and migration defaults", () => {
  assert.deepEqual(ruleEntryReferences(fixture(), "ability", "a").map(r => r.kind).sort(), ["ability", "action", "field", "migration", "test"]);
});
for (const kind of ["ability", "condition"] as const) test(`refuses deletion of a referenced ${kind}`, () => {
  const d = freeze(fixture()); assert.deepEqual(removeRuleEntry(d, kind, "a"), { ok: false, reason: "used" });
  assert.deepEqual(d.abilities![1]!.requires, ["a"]);
});
test("removes unused entries without cascading or weakening prerequisites", () => {
  const d = changed(removeRuleEntry(freeze(fixture()), "ability", "c"));
  assert.deepEqual(d.abilities!.map(a => a.id), ["a", "b", "abc"]); assert.deepEqual(d.abilities![1]!.requires, ["a"]);
});
test("does not confuse substrings with references", () => {
  const d = fixture(); d.abilities = [ability("a"), ability("abc")]; d.fields[0]!.defaultValue = "abc"; d.actions = []; d.selfTests = []; d.migrations = [];
  assert.equal(removeRuleEntry(freeze(d), "ability", "a").ok, true);
});
test("rejects field list overflow atomically", () => {
  const d = fixture(); d.fields[0]!.maxLength = "9";
  assert.deepEqual(renameRuleEntry(freeze(d), "ability", "a", "longer_identifier"), { ok: false, reason: "length" });
});
test("rejects action input overflow atomically", () => {
  const d = fixture(); d.actions[0]!.inputs[0]!.maxLength = "5";
  assert.deepEqual(renameRuleEntry(freeze(d), "ability", "a", "long"), { ok: false, reason: "length" });
});
test("does not materialize omitted actor or input values", () => {
  const d = fixture(), first = d.selfTests[0]!; d.selfTests = [{ ...first, context: { ...first.context, actor: {}, input: {} } }];
  const result = changed(renameRuleEntry(freeze(d), "ability", "a", "new_a"));
  assert.deepEqual(result.selfTests[0]!.context.actor, {}); assert.deepEqual(result.selfTests[0]!.context.input, {});
});
test("excludes self, existing prerequisites and transitive dependents", () => {
  const d = fixture(); assert.deepEqual(prerequisiteCandidates(d, "a").map(a => a.id), ["abc"]);
  assert.deepEqual(prerequisiteCandidates(d, "b").map(a => a.id), ["abc"]);
});
test("handles a full 512-ability chain without recursion", () => {
  const d = fixture(); d.abilities = Array.from({ length: 512 }, (_, i) => ability(`a${i}`, i ? [`a${i - 1}`] : undefined));
  assert.deepEqual(prerequisiteCandidates(d, "a0"), []);
});
test("terminates on imported cycles and respects the four-prerequisite limit", () => {
  const d = fixture(); d.abilities = [ability("a", ["c"]), ...d.abilities!.slice(1)];
  assert.deepEqual(prerequisiteCandidates(d, "a").map(a => a.id), ["abc"]);
  d.abilities = [ability("a", ["b", "c", "abc", "other"]), ...d.abilities.slice(1)];
  assert.deepEqual(prerequisiteCandidates(d, "a"), []);
});
