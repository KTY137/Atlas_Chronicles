// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { transformSync } from "esbuild";
import * as rules from "@chronicle/rules";
import * as model from "../src/features/rule-forge-model";
import * as references from "../src/features/rule-ability-references";
import * as abilityModel from "../src/features/rule-ability-model";
import * as sheetModel from "../src/features/rule-sheet-model";
import * as nav from "../src/features/RuleForgeNav";
import * as path from "../src/features/RuleForgePath";
import * as draftHistory from "../src/features/rule-draft-history";
import * as draftStore from "../src/features/rule-draft-store";
import { I18nStub } from "../src/i18n.ts";
import { describe, expect, it } from "vitest";

/** Exercise real component handlers with controlled hooks, preserving native fieldset disabling. */
function harness(file: string, initial: Record<string, any>) {
  const slots: any[] = [];
  const jobs: Promise<unknown>[] = [], requests: { path: string; request: any }[] = [], confirmations: string[] = [];
  let props = initial, cursor = 0, changed = false, effects: (() => void)[] = [];
  const same = (a: any[], b: any[]) => a?.length === b?.length && a.every((item, i) => Object.is(item, b[i]));
  const react = {
    useState(value: any) { const i = cursor++; slots[i] ??= { value: typeof value === "function" ? value() : value }; return [slots[i].value, (next: any) => { const value = typeof next === "function" ? next(slots[i].value) : next; if (!Object.is(value, slots[i].value)) { slots[i].value = value; changed = true; } }]; },
    useRef(value: any) { const i = cursor++; return slots[i] ??= { current: value }; },
    useMemo(fn: () => any, deps: any[]) { const i = cursor++; if (!slots[i] || !same(slots[i].deps, deps)) slots[i] = { value: fn(), deps }; return slots[i].value; },
    useEffect(fn: () => any, deps: any[]) { const i = cursor++; if (!slots[i] || !same(slots[i].deps, deps)) { slots[i] = { deps }; effects.push(fn); } },
  };
  const element = (type: any, props: any, key: any) => ({ type, props, key });
  const mod = { exports: {} as any };
  runInNewContext(transformSync(readFileSync(new URL(`../src/features/${file}.tsx`, import.meta.url), "utf8"), { loader: "tsx", format: "cjs", jsx: "automatic" }).code, {
    module: mod, exports: mod.exports, document: { getElementById: () => ({ focus() {} }) }, window: { confirm: (message: string) => { confirmations.push(message); return true; } },
    require: (name: string) => {
      if (name === "react") return react;
      if (name === "react/jsx-runtime") return { jsx: element, jsxs: element, Fragment: "Fragment" };
      if (name === "../i18n") return I18nStub;
      if (name === "@chronicle/rules") return rules;
      if (name === "./rule-forge-model") return model;
      if (name === "./rule-ability-references") return references;
      if (name === "./rule-ability-model") return abilityModel;
      if (name === "./FormulaField") return { FormulaField: "FormulaField", FormulaExampleContext: { Provider: "Provider" } };
      if (name === "./rule-sheet-model") return sheetModel;
      if (name === "./RuleForgeNav") return nav;
      if (name === "./RuleForgePath") return path;
      if (name === "./rule-draft-history") return draftHistory;
      if (name === "./rule-draft-store") return draftStore;
      if (name === "./RuleForgePreview") return { RuleForgePreview: "RuleForgePreview", LiveSheet: "LiveSheet", useExampleFigure: () => null, useForgeFixtures: () => react.useState([{ id: "fixture-sera", name: "Sera", values: {}, inputs: {}, passages: [] }, { id: "fixture-brannt", name: "Brannt", values: {}, inputs: {}, passages: [] }]) };
      if (name === "../hooks") return { useResource: () => ({ data: props.rules, loading: false, error: "" }), useTask: () => ({ busy: false, error: "", setError() {}, run(fn: () => Promise<unknown>) { const job = fn(); jobs.push(job); return job; } }) };
      if (name === "../api") return { apiPath: (_: string, suffix: string) => suffix, errorText: String, api: async (path: string, request: any) => { requests.push({ path, request }); return props.transport?.(path, request); } };
      return new Proxy({}, { get: (_, key) => String(key) });
    },
  });
  function render() {
    for (let repeat = 0; repeat < 20; repeat++) {
      cursor = 0; changed = false; effects = [];
      const tree = mod.exports[file === "RuleFieldList" ? "FieldList" : file](props);
      effects.forEach(fn => fn());
      if (!changed) return tree;
    }
    throw new Error("Component did not settle");
  }
  function nodes(predicate: (node: any) => boolean) {
    const found: any[] = [];
    function visit(node: any, inheritedDisabled = false) {
      if (Array.isArray(node)) node.forEach(child => visit(child, inheritedDisabled));
      else if (node?.props) {
        const disabled = inheritedDisabled || (node.type === "fieldset" && !!node.props.disabled);
        const current = { ...node, inheritedDisabled, disabled: disabled || !!node.props.disabled };
        if (predicate(current)) found.push(current);
        visit(node.props.children, disabled);
      }
    }
    visit(render()); return found;
  }
  const text = (node: any): string => Array.isArray(node) ? node.map(text).join("") : node?.props ? text(node.props.children) : node == null ? "" : String(node);
  return { nodes, text, requests, confirmations, async settle() { await Promise.all(jobs); render(); }, replace(next: Record<string, any>) { props = { ...props, ...next }; }, button: (label: string) => nodes(n => (n.type === "Button" || n.type === "button") && text(n) === label)[0]! };
}

const pkg = rules.DEMO_RULE_PACKAGE;
const forgeProps = { campaign: { id: "campaign", name: "Runde", role: "leitung" }, authorName: "Kaya", onDirty() {}, rules: { packages: [pkg], pin: { id: pkg.id, version: pkg.version }, version: 1 } };
type Harness = ReturnType<typeof harness>;
/** Die Regelwerkstatt öffnet mit der Bibliothek; ein Eintrag öffnet die Werkbank. */
const openCatalogItem = (h: Harness, name: string) => h.nodes(n => n.type === "button" && n.props.className?.includes("rf-catalog-item") && h.text(n).startsWith(name))[0]!.props.onClick();
const section = (h: Harness, id: nav.ForgeSection) => h.nodes(n => n.type?.name === "RuleForgeNav")[0]!.props.onChange(id);

describe("installed rule packages remain browsable", () => {
  it.each([["fields", "FieldList"], ["abilities", "RuleAbilityEditor"], ["conditions", "RuleConditionEditor"], ["vitals", "RuleVitalEditor"], ["computed", "RuleComputedEditor"], ["sheet", "RuleSheetEditor"]] as const)("%s navigation remains enabled while editing stays locked", (id, component) => {
    const h = harness("RuleForge", forgeProps);
    openCatalogItem(h, pkg.name);
    section(h, id);
    const editor = h.nodes(n => n.type === component)[0]!;
    expect(editor.inheritedDisabled).toBe(false);
    expect(editor.props.disabled).toBe(true);
  });

  it("locks attribute mutations and leaves entry selection and search usable", () => {
    const fields = Array.from({ length: 12 }, (_, i) => ({ ...model.newField(`wert_${i}`), label: `Wert ${i}` }));
    const h = harness("RuleFieldList", { title: "Attribute", fields, disabled: true, onChange() {} });
    expect(h.button("Attribut hinzufügen").disabled).toBe(true);
    expect(h.nodes(n => n.props["aria-label"] === "Attribut suchen")[0]!.disabled).toBe(false);
    const second = h.nodes(n => n.type === "button" && h.text(n).startsWith("Wert 1wert_1"))[0]!;
    expect(second.disabled).toBe(false);
    second.props.onClick();
    expect(h.nodes(n => n.type?.name === "FieldEditor")[0]!.props.field.id).toBe("wert_1");
    expect(h.nodes(n => n.type?.name === "FieldEditor")[0]!.inheritedDisabled).toBe(true);
  });

  it("lets an installed ability be selected while its fields and budget stay locked", () => {
    const draft = { ...model.packageDraft(pkg), schemaVersion: 2, abilityRules: { abilityField: "learned", conditionField: "active" }, abilities: [abilityModel.newAbility([]), abilityModel.newAbility(["faehigkeit"])] };
    const h = harness("RuleAbilityEditor", { draft, disabled: true, onChange() {} });
    const list = h.nodes(n => n.type?.name === "Auswahlliste")[0]!;
    expect(list.inheritedDisabled).toBe(false);
    expect(list.props.disabled).toBe(true);
    list.props.onWaehlen(1);
    expect(h.nodes(n => n.type === "input" && n.props.value === draft.abilities[1]!.name).every(n => n.inheritedDisabled)).toBe(true);
    expect(h.nodes(n => n.type === "fieldset" && n.props.className === "rf-card")[0]!.disabled).toBe(true);
  });
});

describe("package examples during invalid edits", () => {
  it("keeps the last valid preview for orientation without saving its tests into an invalid draft", () => {
    const h = harness("RuleForge", forgeProps);
    openCatalogItem(h, pkg.name);
    h.button("Neue Version erstellen").props.onClick();
    const editor = h.nodes(n => n.type?.name === "PackageEditor")[0]!;
    editor.props.onChange({ ...editor.props.draft, name: "" });
    section(h, "try");
    const preview = h.nodes(n => n.type === "RuleForgePreview")[0]!;
    expect(preview.props.pkg).not.toBeNull();
    expect(preview.props.onSaveTest).toBeUndefined();
  });
});

describe("attribute search recovery", () => {
  it("keeps an active search clearable after the list shrinks below ten", () => {
    const fields = Array.from({ length: 10 }, (_, i) => ({ ...model.newField(`wert_${i}`), label: `Wert ${i}` }));
    const h = harness("RuleFieldList", { title: "Attribute", fields, onChange() {} });
    h.nodes(n => n.props["aria-label"] === "Attribut suchen")[0]!.props.onChange({ target: { value: "Wert 9" } });
    h.replace({ fields: fields.slice(0, 9) });
    expect(h.nodes(n => n.props["aria-label"] === "Attribut suchen")).toHaveLength(1);
    expect(h.nodes(n => n.props.role === "status").map(h.text).join("")).toContain("Keine Attribute gefunden");
  });

  it("shows a newly added attribute even when the previous search excluded it", () => {
    const fields = Array.from({ length: 10 }, (_, i) => ({ ...model.newField(`wert_${i}`), label: `Wert ${i}` }));
    const h = harness("RuleFieldList", { title: "Attribute", fields, onChange(next: model.DraftField[]) { h.replace({ fields: next }); } });
    h.nodes(n => n.props["aria-label"] === "Attribut suchen")[0]!.props.onChange({ target: { value: "Wert 9" } });
    h.button("Attribut hinzufügen").props.onClick();
    expect(h.nodes(n => n.props["aria-label"] === "Attribut suchen")[0]!.props.value).toBe("");
    expect(h.nodes(n => n.type === "button" && n.props["aria-current"] === "true")).toHaveLength(1);
  });
});

describe("deleting a library version while another draft is open", () => {
  it.each(["Neues Paket", "Neue Version erstellen"])("preserves the edited %s draft when deleting its last library selection", async start => {
    const archived = { ...pkg, id: "de.library.archived", name: "Archived rules" };
    const library = { ...forgeProps.rules, packages: [pkg, archived], bibliothek: [{ id: archived.id, version: archived.version, genommen: false, loeschbar: true, hindernisse: [] }] };
    const dirty: boolean[] = [];
    const h = harness("RuleForge", { ...forgeProps, rules: library, onDirty(value: boolean) { dirty.push(value); }, transport() { h.replace({ rules: forgeProps.rules }); } });
    openCatalogItem(h, archived.name);
    if (start === "Neues Paket") h.button("Zur Bibliothek").props.onClick();
    h.button(start).props.onClick();
    const editor = h.nodes(n => n.type?.name === "PackageEditor")[0]!;
    const unfinished = { ...editor.props.draft, name: "", license: "My unfinished license" };
    editor.props.onChange(unfinished);
    // Zurück in die Bibliothek verwirft nichts: der Entwurf bleibt als „Offener Entwurf“ stehen.
    h.button("Zur Bibliothek").props.onClick();
    expect(h.nodes(n => n.props.className === "rf-open-draft")).toHaveLength(1);
    h.nodes(n => n.type === "button" && n.props.className?.includes("rf-catalog-item") && h.text(n).startsWith(archived.name))[0]!.props.onContextMenu({ preventDefault() {}, stopPropagation() {}, clientX: 10, clientY: 10 });
    const deletion = h.nodes(n => n.type === "MapContextMenu")[0]!.props.actions.find((action: any) => action.id === "loeschen");
    expect(deletion.disabled).toBe(false);
    deletion.onSelect();
    await h.settle();
    expect(h.requests).toEqual([{ path: "/rules", request: { method: "DELETE", body: { packageId: archived.id, packageVersion: archived.version } } }]);
    h.button("Weiter bearbeiten").props.onClick();
    const retained = h.nodes(n => n.type?.name === "PackageEditor")[0]!;
    expect(retained.props.draft).toEqual(unfinished);
    expect(retained.inheritedDisabled).toBe(false);
    expect(dirty.at(-1)).toBe(true);
    expect(h.confirmations).toHaveLength(1);
    expect(h.confirmations[0]).toContain("endgültig löschen");
  });

  it("clears a matching read-only draft after its freshly installed version is deleted", async () => {
    const dirty: boolean[] = [];
    const h = harness("RuleForge", { ...forgeProps, onDirty(value: boolean) { dirty.push(value); }, transport(_path: string, request: any) {
      if (request.method === "POST") {
        const installed = request.body;
        h.replace({ rules: { ...forgeProps.rules, packages: [pkg, installed], bibliothek: [{ id: installed.id, version: installed.version, genommen: false, loeschbar: true, hindernisse: [] }] } });
        return installed;
      }
      h.replace({ rules: forgeProps.rules });
    } });
    h.button("Neues Paket").props.onClick();
    const newId = h.nodes(n => n.type?.name === "PackageEditor")[0]!.props.draft.id;
    section(h, "publish");
    h.button("Version installieren").props.onClick();
    await h.settle();
    section(h, "package");
    expect(h.nodes(n => n.type?.name === "PackageEditor")[0]!.inheritedDisabled).toBe(true);
    h.button("Zur Bibliothek").props.onClick();
    h.nodes(n => n.type === "button" && n.props.className?.includes("rf-catalog-item") && h.text(n).includes(newId))[0]!.props.onContextMenu({ preventDefault() {}, stopPropagation() {}, clientX: 10, clientY: 10 });
    h.nodes(n => n.type === "MapContextMenu")[0]!.props.actions.find((action: any) => action.id === "loeschen").onSelect();
    await h.settle();
    // Der schreibgeschützte Entwurf der gelöschten Fassung ist weg; die Bibliothek zeigt keinen offenen Entwurf mehr.
    expect(h.nodes(n => n.props.className === "rf-open-draft")).toHaveLength(0);
    expect(h.nodes(n => n.type === "button" && n.props.className?.includes("rf-catalog-item") && h.text(n).includes(newId))).toHaveLength(0);
    openCatalogItem(h, pkg.name);
    expect(h.nodes(n => n.type?.name === "PackageEditor")[0]!.props.draft.id).toBe(pkg.id);
    expect(dirty.at(-1)).toBe(false);
  });
});
