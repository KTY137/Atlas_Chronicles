// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { transformSync } from "esbuild";
import { describe, expect, it } from "vitest";
import * as rules from "@chronicle/rules";
import * as model from "../src/features/rule-forge-model";
import * as computed from "../src/features/RuleComputedFields";
import * as FormulaSugar from "../src/features/formula-sugar";
import * as FormulaExample from "../src/features/formula-example";

/** Actual component handlers with controlled hooks, without a browser/build/server. */
function harness(file: string, component: string, initial: Record<string, any>, extraExports = "", mocks: Record<string, any> = {}) {
  const slots: any[] = [], requests: { path: string; request: any }[] = [], jobs: Promise<unknown>[] = [];
  let props = initial, cursor = 0, changed = false, effects: { i: number; fn: () => any }[] = [], tree: any;
  const same = (a: unknown[] | undefined, b: unknown[]) => a?.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  const react = {
    useId: () => `review-${cursor++}`,
    createContext: (defaultValue: unknown) => ({ _defaultValue: defaultValue }),
    useContext: (context: { _defaultValue: unknown }) => context._defaultValue,
    useState(initial: any) {
      const i = cursor++; slots[i] ??= { value: typeof initial === "function" ? initial() : initial };
      return [slots[i].value, (next: any) => { const value = typeof next === "function" ? next(slots[i].value) : next; if (!Object.is(value, slots[i].value)) { slots[i].value = value; changed = true; } }];
    },
    useRef(value: unknown) { const i = cursor++; return slots[i] ??= { current: value }; },
    useMemo(fn: () => unknown) { return fn(); },
    useCallback(fn: unknown, deps: unknown[]) { const i = cursor++; if (!slots[i] || !same(slots[i].deps, deps)) slots[i] = { fn, deps }; return slots[i].fn; },
    useEffect(fn: () => unknown, deps: unknown[]) { const i = cursor++; if (!slots[i] || !same(slots[i].deps, deps)) { slots[i] = { deps, cleanup: slots[i]?.cleanup }; effects.push({ i, fn }); } },
  };
  const element = (type: unknown, props: unknown) => ({ type, props }), mod = { exports: {} as any };
  const actual = readFileSync(new URL(`../src/features/${file}`, import.meta.url), "utf8");
  const code = transformSync(`${actual}\n${extraExports ? `export { ${extraExports} };` : ""}`, { loader: "tsx", format: "cjs", jsx: "automatic" }).code;
  runInNewContext(code, { module: mod, exports: mod.exports, window: { confirm: () => true },
    require: (name: string) => {
      if (name === "react") return react;
      if (name === "react/jsx-runtime") return { jsx: element, jsxs: element, Fragment: "Fragment" };
      // The VM creates a separate Object prototype; JSON transport normalizes
      // it so the real rule validator sees the browser's single-realm shape.
      if (name === "@chronicle/rules") return { ...rules,
        validatePackageFields: (pkg: rules.AnyRulePackage, fields: unknown) => rules.validatePackageFields(pkg, model.copyJson(fields)),
        evaluateComputedFields: (pkg: rules.AnyRulePackage, fields: any) => rules.evaluateComputedFields(pkg, model.copyJson(fields)),
      };
      if (name === "./rule-forge-model") return model;
      if (name === "./RuleComputedFields") return computed;
      if (name === "./formula-sugar") return FormulaSugar;
      if (name === "./formula-example") return FormulaExample;
      if (name === "../hooks") return { useResource: (path: string) => props.resource?.(path) ?? { data: null, loading: false, error: "" }, useTask: () => ({ busy: false, error: "", setError() {}, run: (fn: () => Promise<unknown>) => { const job = fn().catch(() => undefined); jobs.push(job); return job; } }) };
      if (name === "../api") return { apiPath: (id: string, suffix: string) => `/api/campaigns/${id}${suffix}`, api: async (path: string, request: unknown) => { requests.push({ path, request }); return props.transport?.(path, request); } };
      if (Object.hasOwn(mocks, name)) return mocks[name];
      return new Proxy({}, { get: (_target, key) => String(key) });
    },
  });
  function render() {
    for (let repeat = 0; repeat < 30; repeat++) {
      cursor = 0; changed = false; effects = []; tree = mod.exports[component](props);
      for (const effect of effects) { slots[effect.i].cleanup?.(); slots[effect.i].cleanup = effect.fn(); }
      if (!changed) return tree;
    }
    throw new Error("Component did not settle");
  }
  function nodes(predicate: (node: any) => boolean) {
    const found: any[] = [], visit = (node: any) => { if (Array.isArray(node)) node.forEach(visit); else if (node?.props) { if (predicate(node)) found.push(node); visit(node.props.children); } };
    visit(render()); return found;
  }
  const text = (node: any): string => Array.isArray(node) ? node.map(text).join("") : node?.props ? text(node.props.children) : node == null ? "" : String(node);
  return { render, nodes, requests, text, replace: (next: Record<string, any>) => { props = { ...props, ...next }; render(); }, settle: async () => { await Promise.all(jobs); render(); } };
}

describe("independent HTBAH client review", () => {
  it("keeps an incomplete visual expression editable without throwing or losing it", () => {
    const updates: string[] = [], draft = model.packageDraft(rules.HOW_TO_BE_A_HERO_PACKAGE);
    draft.computed = [{ id: "review_value", label: "Review value", expression: "0" }];
    const h = harness("FormulaField.tsx", "FormulaField", { label: "Berechnung", value: "0", sources: { actor: [], input: [] }, allowDice: false, allowKnowledge: false, fields: [], onChange: (value: string) => {
      updates.push(value); draft.computed = [{ ...draft.computed![0]!, expression: value }];
    } }, "", { "./FormulaLine": { FormulaLine: "FormulaLine" }, "./FormulaGraph": { FormulaGraph: "FormulaGraph" } });
    h.nodes(node => node.type === "button" && h.text(node) === "Bausteine")[0]!.props.onClick();
    const blocks = () => h.nodes(node => node.type === "FormulaBlocks")[0]!;
    expect(() => blocks().props.onChange({ kind: "literal", type: "number", value: "" })).not.toThrow();
    expect(updates.at(-1)).toBe("");
    expect(model.validateDraft(draft).valid).toBe(false);
    // The parent rerender must keep the incomplete visual input while its published source is invalid; installation cannot reuse the old zero.
    h.replace({ value: updates.at(-1) });
    expect(blocks().props.value).toMatchObject({ kind: "literal", value: "" });
    expect(h.nodes(node => node.type === "FormulaLine")[0]!.props.analysis.ok).toBe(false);
    blocks().props.onChange({ kind: "literal", type: "number", value: "25" });
    expect(updates.at(-1)).toBe("25");
    expect(model.validateDraft(draft).valid).toBe(true);
    h.replace({ value: updates.at(-1) });
    expect(h.nodes(node => node.type === "FormulaLine")[0]!.props.analysis.ok).toBe(true);
    h.replace({ value: "50" });
    expect(blocks().props.value).toMatchObject({ kind: "literal", value: "50" });
  });

  it("allows a valid HTBAH sheet to save without invented mandatory notes", () => {
    const pkg = rules.HOW_TO_BE_A_HERO_PACKAGE, values = { ...rules.HTBAH_EXAMPLE_CHARACTERS[0]!.fields, notes: "" };
    expect(() => rules.validatePackageFields(pkg, model.copyJson(values))).not.toThrow();
    const h = harness("RuleFields.tsx", "RuleFields", { fields: pkg.fields, values, onChange() {} });
    const notes = h.nodes(node => node.type === "input" && node.props.id.endsWith("-notes"))[0]!;
    expect(notes.props.value).toBe("");
    // Native form validation rejects a required empty text control before onSubmit.
    expect(notes.props.required).not.toBe(true);
    expect(h.nodes(node => node.type === "input" && node.props.id.endsWith("-hp"))[0]!.props.required).toBe(true);
  });

  it.each([
    ["regrouped", rules.HTBAH_DEFAULT_SKILLS.map(skill => ({ ...skill, group: "handeln" as const }))],
    ["replaced", rules.HTBAH_DEFAULT_SKILLS.map((skill, i) => ({ ...skill, id: `custom_${i}` }))],
  ] as const)("does not offer invalid or falsely described 400-point examples for a %s catalogue", (_name, skills) => {
    const pkg = rules.createHowToBeAHeroPackage({ skills });
    const h = harness("RuleForgePreview.tsx", "RuleForgePreview", { pkg });
    const load = h.nodes(node => node.type === "Button" && h.text(node).includes("HTBAH-Beispielfiguren laden"))[0];
    // With a changed catalogue, adapting the examples or withholding this shortcut
    // with an explanation is valid. Silently importing incompatible values is not.
    if (!load || load.props.disabled) {
      expect(h.text(h.render())).toContain("angepassten Katalog");
      expect(h.nodes(node => node.type?.name === "FixturePanel")).toHaveLength(2);
      return;
    }
    load.props.onClick();
    const fixtures = h.nodes(node => node.type?.name === "FixturePanel");
    expect(fixtures).toHaveLength(2);
    for (const { props: { fixture } } of fixtures) {
      expect(() => rules.validatePackageFields(pkg, fixture.values)).not.toThrow();
      if (String(fixture.values.notes).includes("400 verteilten Startpunkten")) {
        expect(rules.evaluateComputedFields(pkg, fixture.values).points_spent).toBe(400);
      }
    }
  });

  it.each(["original", "renamed"])("retains both usable 400-point examples for the %s compatible catalogue", name => {
    const pkg = name === "original" ? rules.HOW_TO_BE_A_HERO_PACKAGE : rules.createHowToBeAHeroPackage({ skills: rules.HTBAH_DEFAULT_SKILLS.map(skill => ({ ...skill, label: `Eigene Bezeichnung ${skill.label}` })) });
    const h = harness("RuleForgePreview.tsx", "RuleForgePreview", { pkg });
    const load = h.nodes(node => node.type === "Button" && h.text(node).includes("HTBAH-Beispielfiguren laden"))[0]!;
    expect(load).toBeDefined(); expect(load.props.disabled).not.toBe(true); load.props.onClick();
    const fixtures = h.nodes(node => node.type?.name === "FixturePanel");
    expect(fixtures).toHaveLength(2);
    for (const { props: { fixture } } of fixtures) {
      expect(() => rules.validatePackageFields(pkg, fixture.values)).not.toThrow();
      expect(rules.evaluateComputedFields(pkg, fixture.values).points_spent).toBe(400);
    }
  });

  it("keeps Geistesblitz expenditure as a dirty draft and resolves a lost save response without double spending", async () => {
    const pkg = rules.HOW_TO_BE_A_HERO_PACKAGE;
    let authoritative = { actorId: "actor", packageId: pkg.id, packageVersion: pkg.version, fields: { ...rules.HTBAH_EXAMPLE_CHARACTERS[0]!.fields }, version: 1, defeatPending: false, defeatedAt: null };
    const dirtiness: boolean[] = [], saved: unknown[] = [];
    const h = harness("CharacterSheet.tsx", "SheetForm", { campaignId: "campaign", latest: authoritative, rules: { packages: [pkg], pin: { id: pkg.id, version: pkg.version }, version: 1 }, gm: true,
      onDirty: (value: boolean) => dirtiness.push(value), onSaved: () => saved.push(true),
      transport: async (_path: string, request: any) => {
        if (request.body.expectedVersion !== authoritative.version) throw new Error("Version conflict");
        authoritative = { ...authoritative, fields: request.body.fields, version: authoritative.version + 1 };
        throw new Error("Accepted response lost");
      },
    }, "SheetForm");
    const spend = () => h.nodes(node => node.type === "Button" && h.text(node) === "Geistesblitz einsetzen · Handeln")[0]!;
    spend().props.onClick(); h.render();
    expect(h.requests).toHaveLength(0); expect(dirtiness.at(-1)).toBe(true);
    const submit = () => h.nodes(node => node.type === "form")[0]!.props.onSubmit({ preventDefault() {} });
    expect(h.nodes(node => node.type === "form")).toHaveLength(1); // No legacy resource command for v2.
    submit(); await h.settle();
    expect(h.requests[0]!.request.body).toMatchObject({ expectedVersion: 1, fields: { gbp_spent_handeln: 1 } });
    expect(dirtiness.at(-1)).toBe(true); expect(saved).toHaveLength(0);
    // A manual retry retains the original absolute values and version; it cannot
    // turn an ambiguous acceptance into a second expenditure.
    submit(); await h.settle();
    expect(h.requests[1]!.request.body).toMatchObject({ expectedVersion: 1, fields: { gbp_spent_handeln: 1 } });
    expect(authoritative.version).toBe(2); expect(authoritative.fields.gbp_spent_handeln).toBe(1);
    h.replace({ latest: authoritative });
    expect(h.requests).toHaveLength(2);
    h.nodes(node => node.type === "Button" && h.text(node) === "Aktuellen Bogen übernehmen")[0]!.props.onClick(); h.render();
    expect(dirtiness.at(-1)).toBe(false);
  });

  it("preserves an edited HTBAH field against a newer authoritative sheet", () => {
    const pkg = rules.HOW_TO_BE_A_HERO_PACKAGE, latest = { actorId: "actor", packageId: pkg.id, packageVersion: pkg.version, fields: { ...rules.HTBAH_EXAMPLE_CHARACTERS[0]!.fields }, version: 1, defeatPending: false, defeatedAt: null };
    const h = harness("CharacterSheet.tsx", "SheetForm", { campaignId: "campaign", latest, rules: { packages: [pkg] }, gm: false, onDirty() {}, onSaved() {} }, "SheetForm");
    h.nodes(node => node.type === "RuleFields")[0]!.props.onChange({ hp: 60 });
    h.replace({ latest: { ...latest, version: 2, fields: { ...latest.fields, hp: 20 } } });
    expect(h.nodes(node => node.type === "RuleFields")[0]!.props.values.hp).toBe(60);
    expect(h.nodes(node => node.type === "Button" && h.text(node) === "Aktuellen Bogen übernehmen")).toHaveLength(1);
    expect(h.requests).toHaveLength(0);
  });

  it("does not load incompatible default-catalogue examples into a new custom-catalogue sheet", () => {
    const pkg = rules.createHowToBeAHeroPackage({ skills: rules.HTBAH_DEFAULT_SKILLS.map(skill => ({ ...skill, group: "handeln" })) });
    const latest = { actorId: "actor", packageId: pkg.id, packageVersion: pkg.version, fields: rules.defaultSupportedActorFields(pkg), version: 0, defeatPending: false, defeatedAt: null };
    const h = harness("CharacterSheet.tsx", "SheetForm", { campaignId: "campaign", latest, rules: { packages: [pkg] }, gm: false, onDirty() {}, onSaved() {} }, "SheetForm");
    const example = h.nodes(node => node.type === "Button" && h.text(node).includes("Mara Morgenwind als Beispiel übernehmen"))[0];
    if (!example || example.props.disabled) {
      expect(h.text(h.render())).toContain("angepassten Katalog");
      expect(h.nodes(node => node.type === "RuleFields").length).toBeGreaterThan(0);
      return;
    }
    example.props.onClick();
    const values = h.nodes(node => node.type === "RuleFields")[0]!.props.values;
    expect(() => rules.validatePackageFields(pkg, model.copyJson(values))).not.toThrow();
    expect(h.requests).toHaveLength(0);
  });
});
