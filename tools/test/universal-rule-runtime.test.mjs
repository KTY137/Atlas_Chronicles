// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
// Run with Node >=22.16: node --experimental-transform-types --test tools/test/universal-rule-runtime.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { createHash } from "node:crypto";
import { stripTypeScriptTypes } from "node:module";
import { runInNewContext } from "node:vm";
import { CHRONICLE_HEROES_PACKAGE, DEMO_RULE_PACKAGE, RULE_LIMITS, SupportedRulePackageRegistry,
  buildRuleRuntime, previewRuleRuntime, parseSupportedRulePackage, stableJson } from "../../packages/rules/src/index.ts";
import { currentRulePreview, matchesRuleRuntime, rulePreviewKey, switchRuleDraft, forgetRuleAbility } from "../../packages/client/src/features/rule-runtime-state.ts";

const lite = parseSupportedRulePackage(JSON.parse(gunzipSync(readFileSync(new URL("../../packages/rules/test/fixtures/chronicles-lite-v1.rules.json.gz", import.meta.url))).toString("utf8")));
const heroes = CHRONICLE_HEROES_PACKAGE;
const manifest = buildRuleRuntime(lite);
const clone = value => JSON.parse(JSON.stringify(value));

test("the actual Lite v1 fixture installs with all 12 self-tests, 107 fields and 103 checks", () => {
  new SupportedRulePackageRegistry().install(lite);
  assert.equal(lite.selfTests.length, 12);
  assert.equal(Object.keys(manifest.fields).length, 107);
  assert.equal(manifest.actions.length, 103);
  assert.equal(new Set(manifest.sections.flatMap(section => section.fields)).size, 107);
  assert.equal(previewRuleRuntime(lite, manifest.defaults).valid, true);
  assert.equal(manifest.contentHash, createHash("sha256").update(stableJson(lite)).digest("hex"));
});

test("switching ChronicleHeroes -> Lite atomically drops old defaults, abilities and conditions", () => {
  const old = buildRuleRuntime(heroes);
  assert.ok(old.abilities.length > 0);
  const draft = switchRuleDraft({ pin: old.pin, fields: { ...old.defaults, name: "Old" } }, manifest.pin);
  assert.equal(draft.fields, null);
  assert.deepEqual(draft.pin, manifest.pin);
  assert.deepEqual(manifest.abilities, []);
  assert.deepEqual(manifest.conditions, []);
  assert.equal(manifest.abilityField, null);
  assert.equal(manifest.conditionField, null);
  assert.equal(Object.hasOwn(manifest.defaults, old.abilityField), false);
  assert.equal(switchRuleDraft(draft, manifest.pin), draft, "reselecting the same pin is a no-op");
});

test("runtime metadata is immutable and does not expose executable computed/ability/action formulas", () => {
  const runtime = buildRuleRuntime(heroes);
  assert.equal(Object.isFrozen(runtime), true);
  assert.equal(Object.isFrozen(runtime.fields), true);
  assert.ok(runtime.computed.every(field => !Object.hasOwn(field, "expression")));
  assert.ok(runtime.abilities.every(ability => !Object.hasOwn(ability, "modifiers") && !Object.hasOwn(ability, "prerequisite")));
  assert.ok(runtime.actions.every(action => !Object.hasOwn(action, "expression") && !Object.hasOwn(action, "outcome") && !Object.hasOwn(action, "preconditions") && !Object.hasOwn(action, "modifiers")));
  assert.ok(runtime.actions.every(action => !Object.hasOwn(action.inputs, "mod_ziel") && !Object.hasOwn(action.inputs, "mod_ergebnis") && !Object.hasOwn(action.inputs, "einsatz")));
});

test("host action runtime exposes only safe actor-specific choices, never modifier formulas", () => {
  const runtime = buildRuleRuntime(heroes);
  const fields = { ...runtime.defaults, skill_athletik: 50, faehigkeiten: "leichtfuessig, kraftakt", zustaende: "erschoepft" };
  const preview = previewRuleRuntime(heroes, fields);
  assert.equal(preview.valid, true);
  const action = runtime.actions.find(item => item.id === "skill_athletik");
  assert.ok(action);
  assert.equal(action.acceptsAbilityUse, true);
  assert.equal(Object.hasOwn(action.inputs, "einsatz"), false);
  assert.equal(Object.hasOwn(action.inputs, "mod_ziel"), false);
  const state = preview.actionStates.find(item => item.actionId === "skill_athletik");
  assert.deepEqual(state?.abilities.map(item => [item.id, item.cost]), [["kraftakt", 1]]);
  assert.deepEqual(state?.passive.map(item => [item.id, item.target, item.value]), [
    ["erschoepft", "ziel", -10], ["leichtfuessig", "ziel", 5],
  ]);
  assert.equal(JSON.stringify({ action, state }).includes("actor.skill_athletik"), false);
});

test("invalid constraints discard every derived display but preserve the input object", () => {
  const fields = { ...manifest.defaults, handeln: manifest.defaults.handeln - 5 };
  const original = clone(fields), invalid = previewRuleRuntime(lite, fields);
  assert.equal(invalid.valid, false);
  assert.ok(invalid.errors.some(error => error.includes("30 Punkte")));
  assert.equal(invalid.fields, null);
  assert.deepEqual(invalid.computed, {});
  assert.deepEqual(invalid.vitals, []);
  assert.equal(invalid.abilities, null);
  assert.deepEqual(fields, original);
});

test("unknown fields are rejected rather than carried into another ruleset or silently discarded", () => {
  const result = previewRuleRuntime(lite, { ...manifest.defaults, rogue_field: 7 });
  assert.equal(result.valid, false);
  assert.equal(result.fields, null);
  assert.ok(result.errors.length);
});

test("unplaced fields stay editable even if the fallback section ID was already used", () => {
  const pkg = parseSupportedRulePackage({ ...clone(DEMO_RULE_PACKAGE), layout: { sections: [{ id: "runtime_unplaced", label: "First", fields: [] }] } });
  const runtime = buildRuleRuntime(pkg);
  assert.equal(runtime.sections.at(-1).id, "runtime_unplaced_");
  assert.deepEqual(runtime.sections.at(-1).fields, Object.keys(pkg.fields));
});

test("all 512 engine fields survive manifest and preview; a 513th package field fails", () => {
  const pkg = clone(DEMO_RULE_PACKAGE);
  while (Object.keys(pkg.fields).length < RULE_LIMITS.fields) pkg.fields[`field_${Object.keys(pkg.fields).length}`] = { type: "integer", label: "Value", default: 0, minimum: 0, maximum: 100 };
  const runtime = buildRuleRuntime(pkg), preview = previewRuleRuntime(pkg, runtime.defaults);
  assert.equal(Object.keys(preview.fields).length, 512);
  pkg.fields.one_too_many = { type: "boolean", label: "Extra", default: false };
  assert.throws(() => buildRuleRuntime(pkg));
});

test("a package with invalid defaults can be opened and repaired rather than becoming inaccessible", () => {
  const pkg = parseSupportedRulePackage({ ...clone(lite), fields: { ...clone(lite.fields), handeln: { ...lite.fields.handeln, default: manifest.defaults.handeln - 5 } } });
  const runtime = buildRuleRuntime(pkg);
  assert.equal(previewRuleRuntime(pkg, runtime.defaults).valid, false);
  assert.equal(previewRuleRuntime(pkg, { ...runtime.defaults, handeln: manifest.defaults.handeln }).valid, true);
});

test("preview identity includes campaign, content, full input and retry epoch", () => {
  const a = previewRuleRuntime(lite, manifest.defaults), key = rulePreviewKey("one", manifest, manifest.defaults);
  const slot = { key, data: a, error: "" };
  assert.equal(currentRulePreview(slot, key, manifest), a);
  for (const next of [rulePreviewKey("two", manifest, manifest.defaults), rulePreviewKey("one", manifest, { ...manifest.defaults, name: "New" }), rulePreviewKey("one", manifest, manifest.defaults, 1)]) assert.equal(currentRulePreview(slot, next, manifest), null);
  assert.equal(currentRulePreview(slot, key, { ...manifest, contentHash: "0".repeat(64) }), null);
  assert.equal(matchesRuleRuntime({ ...a, contractVersion: 2 }, manifest.pin), false);
  assert.equal(matchesRuleRuntime(a, buildRuleRuntime(heroes).pin), false);
  for (const malformed of [null, undefined, 7, {}, { contractVersion: 1, pin: null }, { ...a, contentHash: null }]) assert.equal(matchesRuleRuntime(malformed, manifest.pin), false);
  assert.equal(rulePreviewKey("one", manifest, Object.fromEntries(Object.entries(manifest.defaults).reverse())), key);
});

test("forgetting a prerequisite explicitly removes all transitive dependants", () => {
  const runtime = { ...manifest, abilities: [{ id: "first" }, { id: "second", requires: ["first"] }, { id: "third", requires: ["second"] }, { id: "independent" }] };
  assert.deepEqual(forgetRuleAbility(runtime, ["first", "second", "third", "independent"], "first"), ["independent"]);
});

/** Executes the production hook/effects, not a reimplementation. Imports are supplied as
 * controlled dependencies, like the repository's component review harnesses. No DOM claim. */
function hook(initial = heroes) {
  const slots = [], effects = [], timers = new Map(), requests = [];
  let cursor = 0, timerId = 0, dirty = false, pin = buildRuleRuntime(initial).pin, fields = null, campaign = "campaign";
  let source = { data: buildRuleRuntime(initial), loading: false, error: "" };
  const react = {
    useState(initial) {
      const i = cursor++;
      slots[i] ??= { value: typeof initial === "function" ? initial() : initial };
      return [slots[i].value, next => { slots[i].value = typeof next === "function" ? next(slots[i].value) : next; dirty = true; }];
    },
    useEffect(fn, deps) {
      const i = cursor++, old = slots[i];
      if (!old || old.deps.length !== deps.length || deps.some((value, index) => !Object.is(value, old.deps[index]))) {
        slots[i] = { deps, cleanup: old?.cleanup }; effects.push({ i, fn });
      }
    },
  };
  const code = stripTypeScriptTypes(readFileSync(new URL("../../packages/client/src/features/useHostRules.ts", import.meta.url), "utf8"), { mode: "transform" })
    .replace(/^import .*;\s*$/gm, "").replace("export function useHostRules", "function useHostRules");
  const run = runInNewContext(`${code}\nuseHostRules`, {
    ...react, URLSearchParams, AbortController, currentRulePreview, matchesRuleRuntime, rulePreviewKey,
    useResource: () => source, apiPath: (id, suffix) => `/api/campaigns/${id}${suffix}`,
    t: text => text, errorText: error => error.message,
    setTimeout: fn => { timers.set(++timerId, fn); return timerId; }, clearTimeout: id => timers.delete(id),
    api: (path, options) => new Promise((resolve, reject) => { requests.push({ path, ...options, resolve, reject }); }),
  });
  function render() {
    let result;
    for (let n = 0; n < 20; n++) {
      cursor = 0; dirty = false; result = run(campaign, pin, fields);
      for (const { i, fn } of effects.splice(0)) { slots[i].cleanup?.(); slots[i].cleanup = fn(); }
      if (!dirty) return result;
    }
    throw new Error("Hook failed to settle");
  }
  return { requests, render,
    select(pkg) { pin = buildRuleRuntime(pkg).pin; fields = null; source = { data: buildRuleRuntime(pkg), loading: false, error: "" }; return render(); },
    edit(next) { fields = next; return render(); },
    source(next) { source = next; return render(); },
    timers() { const work = [...timers.values()]; timers.clear(); work.forEach(fn => fn()); },
    async settle() { for (let i = 0; i < 8; i++) await Promise.resolve(); return render(); },
    dispose() { slots.forEach(slot => slot.cleanup?.()); },
  };
}

test("production hook rejects a delayed ChronicleHeroes preview after switching to Lite", async () => {
  const h = hook();
  assert.equal(h.render().canSave, false); h.timers();
  const old = h.requests[0];
  assert.equal(h.select(lite).canSave, false); h.timers();
  const current = h.requests[1];
  assert.equal(old.signal.aborted, true);
  old.resolve(previewRuleRuntime(heroes, old.body.fields));
  assert.equal((await h.settle()).preview, null);
  current.resolve(previewRuleRuntime(lite, current.body.fields));
  const done = await h.settle();
  assert.equal(done.canSave, true); assert.equal(done.preview.pin.id, lite.id);
  assert.equal(done.manifest.abilities.length, 0); assert.equal(Object.keys(done.values).length, 107);
  h.dispose();
});

test("production hook rejects A -> B -> A old responses even when transport ignores cancellation", async () => {
  const h = hook(); h.render(); h.timers(); const oldA = h.requests[0];
  h.select(lite); h.timers(); const oldB = h.requests[1];
  h.select(heroes); h.timers(); const newA = h.requests[2];
  oldA.resolve(previewRuleRuntime(heroes, oldA.body.fields)); oldB.resolve(previewRuleRuntime(lite, oldB.body.fields));
  assert.equal((await h.settle()).canSave, false);
  newA.resolve(previewRuleRuntime(heroes, newA.body.fields));
  assert.equal((await h.settle()).canSave, true);
  h.dispose();
});

test("editing immediately invalidates a valid preview; network errors never enable saving", async () => {
  const h = hook(lite); h.render(); h.timers(); const initial = h.requests[0];
  initial.resolve(previewRuleRuntime(lite, initial.body.fields)); assert.equal((await h.settle()).canSave, true);
  const edited = h.edit({ ...manifest.defaults, name: "Updated" });
  assert.equal(edited.preview, null); assert.equal(edited.canSave, false); h.timers();
  h.requests[1].reject(new Error("offline"));
  assert.equal((await h.settle()).canSave, false); assert.equal(h.render().error, "offline");
  h.render().reload(); assert.equal(h.render().canSave, false); h.timers();
  h.requests[2].resolve(previewRuleRuntime(lite, h.requests[2].body.fields));
  assert.equal((await h.settle()).canSave, true);
  h.dispose();
});

test("a mismatched hash or missing manifest never triggers a local rule fallback", async () => {
  const h = hook(lite); h.render(); h.timers();
  h.requests[0].resolve({ ...previewRuleRuntime(lite, manifest.defaults), contentHash: "f".repeat(64) });
  const wrong = await h.settle(); assert.equal(wrong.canSave, false); assert.ok(wrong.error);
  const missing = h.source({ data: null, loading: false, error: "not installed" });
  assert.equal(missing.manifest, null); assert.equal(missing.canSave, false);
  h.dispose();
});

test("display translations cannot overwrite host values, bounds, budgets or custom wording", () => {
  const code = stripTypeScriptTypes(readFileSync(new URL("../../packages/client/src/features/rule-runtime-display.ts", import.meta.url), "utf8"), { mode: "transform" })
    .replace(/^import .*;\s*$/gm, "").replace("export function displayRuleRuntime", "function displayRuleRuntime");
  const source = clone(heroes), view = clone(heroes), id = Object.keys(source.fields)[0];
  view.fields[id] = { ...view.fields[id], label: "Translated label", default: "DO NOT USE", maximum: 999999 };
  view.abilities[0] = { ...view.abilities[0], name: "Translated ability", price: 999999 };
  const display = runInNewContext(`${code}\ndisplayRuleRuntime`, { displayRulePackage: () => view });
  const runtime = buildRuleRuntime(heroes), preview = previewRuleRuntime(heroes, runtime.defaults), before = clone(runtime);
  const result = display(runtime, preview, source);
  assert.equal(result.runtime.fields[id].label, "Translated label");
  assert.equal(result.runtime.fields[id].default, runtime.fields[id].default);
  assert.equal(result.runtime.fields[id].maximum, runtime.fields[id].maximum);
  assert.equal(result.runtime.abilities[0].name, "Translated ability");
  assert.equal(result.runtime.abilities[0].price, runtime.abilities[0].price);
  assert.equal(result.runtime.defaults, runtime.defaults);
  assert.equal(result.preview.fields, preview.fields);
  assert.equal(result.preview.abilities, preview.abilities);
  assert.equal(result.runtime.contentHash, runtime.contentHash);
  assert.deepEqual(runtime, before);
  const custom = { ...runtime, fields: { ...runtime.fields, [id]: { ...runtime.fields[id], label: "GM authored label" } } };
  assert.equal(display(custom, preview, source).runtime.fields[id].label, "GM authored label");
  assert.equal(display(runtime, preview, { ...source, version: "99.0.0" }).runtime, runtime);
  assert.equal(display(runtime, preview).runtime, runtime);
});
