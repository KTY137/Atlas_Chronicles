// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import zlib from "node:zlib";
import test from "node:test";
import assert from "node:assert/strict";
import { CHRONICLE_HEROES_PACKAGE, buildRuleRuntime, previewRuleRuntime, parseSupportedRulePackage } from "../../packages/rules/src/index.ts";
import { switchRuleDraft } from "../../packages/client/src/features/rule-runtime-state.ts";

test("actor-template package select really swaps host fields and abilities", () => {
  const lite = parseSupportedRulePackage(JSON.parse(zlib.gunzipSync(fs.readFileSync(new URL("../../packages/rules/test/fixtures/chronicles-lite-v1.rules.json.gz", import.meta.url))).toString("utf8")));
  let source = fs.readFileSync(new URL("../../packages/client/src/features/ActorTemplatesHost.tsx", import.meta.url), "utf8") + "\nexport { ActorTemplateForm };\n";
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  let cursor = 0, changed = false, props;
  const slots = [];
  const React = {
    useState(initial) { const i = cursor++; if (!slots[i]) slots[i] = { value: typeof initial === "function" ? initial() : initial }; return [slots[i].value, next => { slots[i].value = typeof next === "function" ? next(slots[i].value) : next; changed = true; }]; },
    useEffect() { cursor++; },
    useMemo(fn) { cursor++; return fn(); },
    useRef(initial) { const i = cursor++; return slots[i] ??= { current: initial }; },
    useCallback(fn) { cursor++; return fn; },
  };
  const element = (type, elementProps) => ({ type, props: elementProps || {} });
  const stateFor = (pin, draft, rules) => {
    const pkg = rules.packages.find(candidate => candidate.id === pin.id && candidate.version === pin.version);
    const manifest = buildRuleRuntime(pkg), values = draft ?? manifest.defaults, preview = previewRuleRuntime(pkg, values);
    return { manifest, values, preview, error: "", pending: false, canSave: preview.valid, reload() {} };
  };
  let currentProps;
  const mod = { exports: {} };
  vm.runInNewContext(code, {
    module: mod, exports: mod.exports, console,
    require(name) {
      if (name === "react") return React;
      if (name === "react/jsx-runtime") return { jsx: element, jsxs: element, Fragment: "Fragment" };
      if (name === "@chronicle/ui") return { Button: "Button", Loading: "Loading", Notice: "Notice" };
      if (name === "@chronicle/protocol") return {};
      if (name === "@chronicle/rules") return { stableJson: value => JSON.stringify(value) };
      if (name === "../api") return { api() {}, apiPath: (_campaign, path) => path };
      if (name === "../i18n") return { t: text => text };
      if (name === "../hooks") return { useResource: () => ({ data: [], loading: false, error: "" }), useTask: () => ({ busy: false, error: "", setError() {}, run: async fn => fn() }) };
      if (name === "./game-api") return { useCommand: () => async () => ({ id: "saved" }) };
      if (name === "./RuleFields") return { RuleFields: "RuleFields" };
      if (name === "./HostRuleFields") return { HostRuleFields: "HostRuleFields" };
      if (name === "./useHostRules") return { useHostRules: (_campaign, pin, draft) => stateFor(pin, draft, currentProps.rules) };
      if (name === "./rule-runtime-state") return { switchRuleDraft };
      if (name.endsWith(".css")) return {};
      return new Proxy({}, { get: () => () => null });
    },
  }, { filename: "ActorTemplatesHost.cjs" });
  const Form = mod.exports.ActorTemplateForm;
  function walk(node, out = []) { if (Array.isArray(node)) node.forEach(child => walk(child, out)); else if (node?.props) { out.push(node); walk(node.props.children, out); } return out; }
  function render() { let tree; for (let n = 0; n < 10; n++) { cursor = 0; changed = false; tree = Form(currentProps); if (!changed) return tree; } throw new Error("ActorTemplateForm did not settle"); }
  currentProps = { campaignId: "campaign", rules: { pin: { id: CHRONICLE_HEROES_PACKAGE.id, version: CHRONICLE_HEROES_PACKAGE.version }, packages: [CHRONICLE_HEROES_PACKAGE, lite] }, original: null, onDirty() {}, onSaved() {}, onOpenLoot() {} };

  let nodes = walk(render());
  let select = nodes.find(node => node.type === "select" && node.props.value === `${CHRONICLE_HEROES_PACKAGE.id}@${CHRONICLE_HEROES_PACKAGE.version}`);
  let host = nodes.find(node => node.type === "HostRuleFields");
  assert.ok(select); assert.ok(host);
  assert.equal(host.props.state.manifest.abilities.length, 200);
  assert.equal(Object.keys(host.props.state.values).length, 29);

  select.props.onChange({ target: { value: `${lite.id}@${lite.version}` } });
  nodes = walk(render()); host = nodes.find(node => node.type === "HostRuleFields");
  assert.equal(host.props.state.manifest.pin.id, lite.id);
  assert.equal(host.props.state.manifest.abilities.length, 0);
  assert.equal(Object.keys(host.props.state.values).length, 107);

  select = nodes.find(node => node.type === "select" && node.props.value === `${lite.id}@${lite.version}`);
  select.props.onChange({ target: { value: `${CHRONICLE_HEROES_PACKAGE.id}@${CHRONICLE_HEROES_PACKAGE.version}` } });
  nodes = walk(render()); host = nodes.find(node => node.type === "HostRuleFields");
  assert.equal(host.props.state.manifest.pin.id, CHRONICLE_HEROES_PACKAGE.id);
  assert.equal(host.props.state.manifest.abilities.length, 200);
  assert.equal(Object.keys(host.props.state.values).length, 29);
});
