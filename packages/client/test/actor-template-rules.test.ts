// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { transformSync } from "esbuild";
import { describe, expect, it } from "vitest";
import { I18nStub } from "../src/i18n.ts";

// Exercise the actual form, not a second implementation of its state transitions.
const field = (label: string, value = 0) => ({ type: "integer", label, default: value, minimum: 0, maximum: 50 });
const heroes = { id: "test.heroes", version: "1.0.0", name: "ChronicleHeroes", fields: { strength: field("Strength", 5) } };
const lite = { id: "test.lite", version: "1.0.0", name: "Chronicles Lite", fields: Object.fromEntries(Array.from({ length: 100 }, (_, i) => [`skill_${i}`, field(i === 0 ? "Nahkampf" : `Skill ${i}`, 10)])) };
const defaults = (fields: Record<string, { default: unknown }>) => Object.fromEntries(Object.entries(fields).map(([key, item]) => [key, item.default]));
const pin = (pkg: { id: string; version: string }) => ({ id: pkg.id, version: pkg.version });
const original = { id: "template", revision: 1, version: 1, archivedAt: null, contentHash: "hash", definition: { schemaVersion: 1, name: "Guard", kind: "npc", loreEntryId: null, package: pin(heroes), fields: { strength: 7 } } };
type Node = { type: unknown; props: Record<string, any> };

function form(saved: typeof original | null = null) {
  const slots: any[] = [], calls: any[] = [], dirty: boolean[] = [];
  let cursor = 0;
  const task = { busy: false, error: "", status: 0, setError(value: string) { this.error = value; }, run: (work: () => Promise<void>) => work() };
  const react = {
    useState(initial: any) {
      const index = cursor++;
      if (!slots[index]) slots[index] = { value: typeof initial === "function" ? initial() : initial };
      return [slots[index].value, (next: any) => { slots[index].value = typeof next === "function" ? next(slots[index].value) : next; }];
    },
    useRef(initial: unknown) { const index = cursor++; return slots[index] ??= { current: initial }; },
    useEffect() {}, useCallback: (fn: unknown) => fn,
  };
  const element = (type: unknown, props: Record<string, unknown>): Node => ({ type, props });
  const mod = { exports: {} as any };
  const source = readFileSync(new URL("../src/features/ActorWorkbench.tsx", import.meta.url), "utf8");
  runInNewContext(transformSync(`${source}\nexport { ActorTemplateForm };`, { loader: "tsx", format: "cjs", jsx: "automatic" }).code, {
    module: mod, exports: mod.exports,
    require: (name: string) => {
      if (name === "react") return react;
      if (name === "react/jsx-runtime") return { jsx: element, jsxs: element, Fragment: "Fragment" };
      if (name === "../i18n") return I18nStub;
      if (name === "../api") return { apiPath: (_: string, suffix: string) => suffix };
      if (name === "../hooks") return { useTask: () => task, useResource: () => ({ data: [], loading: false, error: "" }) };
      if (name === "./game-api") return { defaults, useCommand: () => async (...args: any[]) => { calls.push(args); return { id: "saved" }; } };
      return new Proxy({}, { get: (_, key) => String(key) });
    },
  });
  const props = { campaignId: "campaign", rules: { packages: [heroes, lite] as any[], pin: pin(heroes), version: 1 }, original: saved, onDirty: (value: boolean) => dirty.push(value), onSaved() {} };
  const render = () => { cursor = 0; return mod.exports.ActorTemplateForm(props) as Node; };
  const text = (node: any): string => Array.isArray(node) ? node.map(text).join("") : node?.props ? text(node.props.children) : node == null ? "" : String(node);
  function nodes() {
    const result: Node[] = [];
    const visit = (node: any) => { if (Array.isArray(node)) node.forEach(visit); else if (node?.props) { result.push(node); visit(node.props.children); } };
    visit(render()); return result;
  }
  return {
    props, task, calls, dirty,
    fields: () => nodes().find(node => node.type === "RuleFields")!,
    select: (pkg: { id: string; version: string }) => nodes().find(node => node.type === "select" && String(node.props.value).includes("@"))!.props.onChange({ target: { value: `${pkg.id}@${pkg.version}` } }),
    name(value: string) { nodes().find(node => node.type === "input" && node.props.maxLength === 160)!.props.onChange({ target: { value } }); },
    messages: () => nodes().filter(node => node.type === "Notice").map(text).join(" "),
    async submit() { render().props.onSubmit({ preventDefault() {} }); await Promise.resolve(); await Promise.resolve(); },
  };
}

describe("actor-template rule selection and save feedback", () => {
  it("replaces the complete skill list and payload when explicitly switching packages", async () => {
    const h = form(); h.name("Scout");
    h.fields().props.onChange({ strength: 21 });
    h.select(lite);
    expect(h.fields().props.fields).toEqual(lite.fields);
    expect(h.fields().props.values).toEqual(defaults(lite.fields));
    expect(h.fields().props.values).not.toHaveProperty("strength");
    await h.submit();
    expect(h.calls[0][1].definition).toMatchObject({ name: "Scout", package: pin(lite), fields: defaults(lite.fields) });
    expect(Object.keys(h.calls[0][1].definition.fields)).toHaveLength(100);
    h.select(heroes);
    expect(h.fields().props.values).toEqual({ strength: 5 });
  });

  it("follows newly activated campaign rules without losing a new draft's name", async () => {
    const h = form(); h.name("Scout");
    h.props.rules = { ...h.props.rules, pin: pin(lite), version: 2 };
    expect(h.fields().props.fields).toEqual(lite.fields);
    expect(h.fields().props.values).toEqual(defaults(lite.fields));
    await h.submit();
    expect(h.calls[0][1].definition).toMatchObject({ name: "Scout", package: pin(lite), fields: defaults(lite.fields) });
  });

  it("follows a new version of the same package before its values are edited", () => {
    const h = form(); h.fields();
    const next = { ...heroes, version: "2.0.0", fields: { perception: field("Perception", 9) } };
    h.props.rules = { packages: [heroes, next], pin: pin(next), version: 2 };
    expect(h.fields().props.values).toEqual({ perception: 9 });
  });

  it("does not silently overwrite edited values when campaign rules change in another window", () => {
    const h = form(); h.fields().props.onChange({ strength: 31 });
    h.props.rules = { ...h.props.rules, pin: pin(lite), version: 2 };
    expect(h.fields().props.values).toEqual({ strength: 31 });
    expect(h.messages()).toContain("Diese Vorlage verwendet andere Regeln als die Kampagne.");
    h.select(lite);
    expect(h.fields().props.values).toEqual(defaults(lite.fields));
  });

  it("keeps an existing immutable template pinned until explicitly changed", () => {
    const h = form(original); h.props.rules.pin = pin(lite);
    expect(h.fields().props.values).toEqual({ strength: 7 });
    h.select(lite);
    expect(h.fields().props.values).toEqual(defaults(lite.fields));
    expect(original.definition.fields).toEqual({ strength: 7 });
  });

  it("preserves an explicit non-campaign package across resource refreshes", () => {
    const h = form(); h.select(lite);
    h.props.rules = { packages: [heroes, lite], pin: pin(heroes), version: 3 };
    expect(h.fields().props.fields).toEqual(lite.fields);
  });

  it("populates submitted defaults when the package arrives after the initial render", async () => {
    const h = form(); h.props.rules.packages = []; h.name("Late package");
    h.props.rules.packages = [heroes, lite];
    expect(h.fields().props.values).toEqual({ strength: 5 });
    await h.submit();
    expect(h.calls[0][1].definition.fields).toEqual({ strength: 5 });
  });

  it.each([400, 403, 404, 409, 500])("does not invent a revision conflict for a new template (HTTP %s)", status => {
    const h = form(); h.task.error = "Bitte Eingaben prüfen."; h.task.status = status;
    expect(h.messages()).toContain("Bitte Eingaben prüfen.");
    expect(h.messages()).not.toContain("Lade die Vorlage erneut");
  });

  it.each([400, 403, 404, 500])("does not append a revision hint to an unrelated edit failure (HTTP %s)", status => {
    const h = form(original); h.task.error = "Failure"; h.task.status = status;
    expect(h.messages()).not.toContain("Lade die Vorlage erneut");
  });

  it("retains the reload hint for a real revision conflict", () => {
    const h = form(original); h.task.error = "Conflict"; h.task.status = 409;
    expect(h.messages()).toContain("Lade die Vorlage erneut");
  });

  it("clears an obsolete save error when selecting another package", () => {
    const h = form(); h.task.error = "Bitte Eingaben prüfen."; h.task.status = 400;
    h.select(lite);
    expect(h.messages()).not.toContain("Bitte Eingaben prüfen.");
  });

  it("ignores a vanished option instead of dereferencing an absent package", () => {
    const h = form();
    expect(() => h.select({ id: "test.absent", version: "1.0.0" })).not.toThrow();
    expect(h.fields().props.values).toEqual({ strength: 5 });
  });
});
