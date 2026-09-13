// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { transformSync } from "esbuild";
import { describe, expect, it } from "vitest";
import * as MapGeneration from "../src/features/map-generation.ts";
import { I18nStub } from "../src/i18n.ts";

/** Executes production component handlers/effects with controlled resources and transport. */
function harness(file: string, initial: Record<string, any>, component = file, extraExports = "") {
  const slots: any[] = [], requests: { path: string; request: any }[] = [], jobs: Promise<unknown>[] = [], confirmations: string[] = [];
  let props = initial, cursor = 0, changed = false, effects: { i: number; fn: () => any }[] = [], tree: any;
  const same = (a: unknown[] | undefined, b: unknown[]) => a?.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  const react = {
    useState(initial: any) {
      const i = cursor++; slots[i] ??= { value: typeof initial === "function" ? initial() : initial };
      return [slots[i].value, (next: any) => { const value = typeof next === "function" ? next(slots[i].value) : next; if (!Object.is(value, slots[i].value)) { slots[i].value = value; changed = true; } }];
    },
    useRef(value: unknown) { const i = cursor++; return slots[i] ??= { current: value }; },
    useMemo(fn: () => unknown) { return fn(); },
    useCallback(fn: unknown, deps: unknown[]) { const i = cursor++; if (!slots[i] || !same(slots[i].deps, deps)) slots[i] = { fn, deps }; return slots[i].fn; },
    useEffect(fn: () => unknown, deps: unknown[]) { const i = cursor++; if (!slots[i] || !same(slots[i].deps, deps)) { slots[i] = { deps, cleanup: slots[i]?.cleanup }; effects.push({ i, fn }); } },
  };
  const element = (type: unknown, props: unknown, key: unknown) => ({ type, props, key }), mod = { exports: {} as any };
  const actual = readFileSync(new URL(file === "../hooks" ? "../src/hooks.ts" : `../src/features/${file}.tsx`, import.meta.url), "utf8");
  runInNewContext(transformSync(`${actual}\n${extraExports ? `export { ${extraExports} };` : ""}`, { loader: "tsx", format: "cjs", jsx: "automatic" }).code, {
    module: mod, exports: mod.exports, crypto: { randomUUID: () => "test-seed-123456" }, window: { confirm: (message: string) => { confirmations.push(message); return props.confirm ?? true; } },
    require: (name: string) => {
      if (name === "../i18n" || name === "./i18n" || name === "../../i18n") return I18nStub;
      if (name === "react") return react;
      if (name === "./map-generation") return MapGeneration;
      if (name === "react/jsx-runtime") return { jsx: element, jsxs: element, Fragment: "Fragment" };
      if (name === "../hooks") return { useResource: (path: string) => props.resource?.(path) ?? { data: null, loading: false, loaded: true, error: "" }, useTask: () => ({ busy: false, error: "", setError() {}, run: (fn: () => Promise<unknown>) => { const job = fn().catch(() => undefined); jobs.push(job); return job; } }) };
      if (name === "../api") return { apiPath: (id: string, suffix: string) => `/api/campaigns/${id}${suffix}`, api: async (path: string, request: unknown) => { requests.push({ path, request }); return props.transport?.(path, request); } };
      if (name === "./game-api") return { useCommand: () => async (path: string, body: unknown) => { requests.push({ path, request: { body } }); return props.transport?.(path, { body }); } };
      return new Proxy({}, { get: (_target, key) => String(key) });
    },
  });
  function render() {
    for (let repeat = 0; repeat < 30; repeat++) {
      cursor = 0; changed = false; effects = []; tree = mod.exports[component](...(props.arguments ?? [props]));
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
  const button = (label: string) => nodes(node => node.type === "Button" && text(node) === label)[0]!;
  return { render, nodes, requests, confirmations, text, button, replace: (next: Record<string, any>) => { props = { ...props, ...next }; render(); }, settle: async () => { await Promise.all(jobs); render(); } };
}

const campaign = { id: "campaign", role: "spieler" }, actor = { id: "a", name: "Mara", canControl: true };
const callbacks = { onChanged() {}, onDirty() {} };
const loaded = (data: unknown) => ({ data, loading: false, loaded: true, error: "" });

describe("gameplay draft regression review", () => {
  it("waits for the first loaded roll history before marking newly arriving rolls", () => {
    const h = harness("../hooks", { arguments: [null] }, "useFrischeKarten");
    expect([...h.render()]).toEqual([]);
    h.replace({ arguments: [["old-roll"]] });
    expect([...h.render()]).toEqual([]);
    h.replace({ arguments: [["new-roll", "old-roll"]] });
    expect([...h.render()]).toEqual(["new-roll"]);
  });

  it("respects a single edited map dimension while retaining the generator default for the other", async () => {
    const defaults = { grundriss: { raeume: 8, zellen: [64, 64], zellgroesse: 96, licht: true }, hoehle: { kammern: 8, zellen: [64, 64], zellgroesse: 96, licht: true }, siedlung: { ausdehnung: [36, 28], zellgroesse: 96, bauwerke: 42 } };
    const h = harness("TacticalGenerate", { campaignId: "campaign", onCreated() {}, resource: () => loaded(defaults) });
    h.nodes(n => n.type === "input" && n.props.maxLength === 160)[0]!.props.onChange({ target: { value: "Testkarte" } });
    h.nodes(n => n.type === "input" && n.props.maxLength === 256)[0]!.props.onChange({ target: { value: "seed" } });
    const controls = h.nodes(n => n.type === "MapGenerationControls")[0]!;
    controls.props.onChange({ ...controls.props.value, art: "grundriss", breite: 96 });
    h.nodes(n => n.type === "form")[0]!.props.onSubmit({ preventDefault() {} }); await h.settle();
    expect(h.requests[0]?.request.body.optionen.zellen).toEqual([96, 64]);
  });

  it("opens a first actor assigned after MeineFigur initially loaded an empty account", () => {
    let actors: any[] = [];
    const h = harness("MeineFigur", { campaign, ...callbacks, resource: (path: string) => loaded(path.endsWith("/actors") ? actors : { packages: [] }) });
    expect(h.nodes(n => n.type === "CharacterSheet")).toHaveLength(0);
    actors = [actor]; h.replace({});
    expect(h.nodes(n => n.type === "CharacterSheet")[0]?.props.actorId).toBe("a");
  });

  it("preserves a chosen settlement size profile and discards incompatible floorplan options", async () => {
    const defaults = { grundriss: { raeume: 8, zellen: [64, 64], zellgroesse: 96, licht: true }, hoehle: { kammern: 8, zellen: [64, 64], zellgroesse: 96, licht: true },
      siedlung: { art: "dorf", bauwerke: 42, ausdehnung: [36, 28], zellgroesse: 96, strassenDichte: .3, licht: true } };
    const h = harness("TacticalGenerate", { campaignId: "campaign", onCreated() {}, resource: () => loaded(defaults) });
    h.nodes(n => n.type === "input" && n.props.maxLength === 160)[0]!.props.onChange({ target: { value: "Silberbach" } });
    h.nodes(n => n.type === "input" && n.props.maxLength === 256)[0]!.props.onChange({ target: { value: "seed" } });
    const controls = () => h.nodes(n => n.type === "MapGenerationControls")[0]!;
    controls().props.onChange({ ...controls().props.value, art: "grundriss", anzahl: 4, anordnung: "raster", moeblierung: .4 });
    // The size-profile control supplies both dimensions; editing width must retain its height.
    controls().props.onChange({ ...controls().props.value, art: "siedlung", siedlung: "weiler", breite: 24, hoehe: 20, anzahl: 12, dichte: .15 });
    controls().props.onChange({ ...controls().props.value, breite: 32 });
    h.nodes(n => n.type === "form")[0]!.props.onSubmit({ preventDefault() {} }); await h.settle();
    expect(h.requests[0]?.request.body).toEqual({ art: "siedlung", name: "Silberbach", keim: "seed", stil: "gemalt", optionen: { art: "weiler", standort: "fluss", setting: "fantasy", ausdehnung: [32, 20], bauwerke: 12, strassenDichte: .15, relief: .5, bewaldung: .5, licht: true } });
  });

  it("keeps sheet dirtiness when inventory is clean and allows declining an actor switch", () => {
    const dirty: boolean[] = [];
    const h = harness("MeineFigur", { campaign, ...callbacks, confirm: false, onDirty: (value: boolean) => dirty.push(value), resource: (path: string) => loaded(path.endsWith("/actors") ? [actor, { ...actor, id: "b" }] : { packages: [] }) });
    h.nodes(n => n.type === "CharacterSheet")[0]!.props.onDirty(true);
    h.nodes(n => n.type === "Inventory")[0]!.props.onDirty(false); h.render();
    expect.soft(dirty.at(-1)).toBe(true);
    h.nodes(n => n.type === "select")[0]!.props.onChange({ target: { value: "b" } }); h.render();
    expect(h.confirmations).toHaveLength(1);
    expect(h.nodes(n => n.type === "CharacterSheet")[0]!.props.actorId).toBe("a");
  });

  it("reports both money and sheet edits without a clean sibling clearing the other", () => {
    const dirty: boolean[] = [];
    const h = harness("CharacterSheet", { campaignId: "campaign", actorId: "a", rules: {}, gm: false, ...callbacks, onDirty: (value: boolean) => dirty.push(value), resource: () => loaded({ actorId: "a" }) });
    const money = h.nodes(n => n.type === "Geldzaehler")[0]!;
    expect(typeof money.props.onDirty).toBe("function");
    money.props.onDirty(true);
    h.nodes(n => n.type?.name === "SheetForm")[0]!.props.onDirty(false); h.render();
    expect(dirty.at(-1)).toBe(true);
  });

  it("does not offer a balance command before the campaign has named its currency", () => {
    const h = harness("Geldzaehler", { campaignId: "campaign", actorId: "a", gm: true, revision: 0, resource: (path: string) => loaded(path.endsWith("/einheit") ? null : { actorId: "a", betrag: 0, version: 0 }) });
    expect(h.nodes(n => n.type === "input" && n.props.type === "number")[0]!.props.disabled).toBe(true);
    expect(h.button("Übernehmen").props.disabled).toBe(true);
    expect(h.button(" Währung benennen").props.disabled).toBe(false);
  });

  it("preserves a money draft and its original concurrency version after a remote update", async () => {
    let stand = { actorId: "a", betrag: 20, version: 1 };
    const dirty: boolean[] = [];
    const h = harness("Geldzaehler", { campaignId: "campaign", actorId: "a", gm: false, revision: 0, onDirty: (value: boolean) => dirty.push(value), resource: (path: string) => loaded(path.endsWith("/einheit") ? { name: "Taler", version: 1 } : stand), transport: async () => { throw new Error("Version conflict"); } });
    h.nodes(n => n.type === "input" && n.props.type === "number")[0]!.props.onChange({ target: { valueAsNumber: 25 } }); h.render();
    stand = { ...stand, betrag: 10, version: 2 }; h.replace({ revision: 1 });
    expect.soft(h.nodes(n => n.type === "input" && n.props.type === "number")[0]!.props.value).toBe(25);
    expect.soft(dirty.at(-1)).toBe(true);
    h.button("Übernehmen").props.onClick(); await h.settle();
    expect(h.requests[0]?.request.body).toEqual({ betrag: 25, expectedVersion: 1 });
  });

  it("never carries a money draft into another actor with the same version", () => {
    let stand = { actorId: "a", betrag: 20, version: 1 };
    const h = harness("Geldzaehler", { campaignId: "campaign", actorId: "a", gm: false, revision: 0, resource: (path: string) => loaded(path.endsWith("/einheit") ? { name: "Taler", version: 1 } : stand) });
    h.nodes(n => n.type === "input" && n.props.type === "number")[0]!.props.onChange({ target: { valueAsNumber: 25 } }); h.render();
    stand = { actorId: "b", betrag: 80, version: 1 }; h.replace({ actorId: "b" });
    expect(h.nodes(n => n.type === "input" && n.props.type === "number")[0]!.props.value).toBe(80);
    expect(h.button("Übernehmen").props.disabled).toBe(true);
  });

  it("keeps an acknowledged money balance while its reload is pending", async () => {
    const stand = { actorId: "a", betrag: 20, version: 1 };
    const h = harness("Geldzaehler", { campaignId: "campaign", actorId: "a", gm: false, revision: 0, resource: (path: string) => loaded(path.endsWith("/einheit") ? { name: "Taler", version: 1 } : stand), transport: async () => ({ ...stand, betrag: 25, version: 2 }) });
    h.nodes(n => n.type === "input" && n.props.type === "number")[0]!.props.onChange({ target: { valueAsNumber: 25 } });
    h.button("Übernehmen").props.onClick(); await h.settle();
    expect(h.nodes(n => n.type === "input" && n.props.type === "number")[0]!.props.value).toBe(25);
  });

  it("does not let a previous actor's delayed save clear the next actor's money draft", async () => {
    let stand = { actorId: "a", betrag: 20, version: 1 }, accept!: (value: unknown) => void;
    const h = harness("Geldzaehler", { campaignId: "campaign", actorId: "a", gm: false, revision: 0, resource: (path: string) => loaded(path.endsWith("/einheit") ? { name: "Taler", version: 1 } : stand), transport: () => new Promise(resolve => { accept = resolve; }) });
    const input = () => h.nodes(n => n.type === "input" && n.props.type === "number")[0]!;
    input().props.onChange({ target: { valueAsNumber: 25 } }); h.button("Übernehmen").props.onClick();
    stand = { actorId: "b", betrag: 80, version: 1 }; h.replace({ actorId: "b" });
    input().props.onChange({ target: { valueAsNumber: 90 } }); h.render();
    accept({ actorId: "a", betrag: 25, version: 2 }); await h.settle();
    expect(input().props.value).toBe(90);
  });

  it("pins currency rename to the version from when the rename started", async () => {
    let einheit = { name: "Taler", version: 1 };
    const h = harness("Geldzaehler", { campaignId: "campaign", actorId: "a", gm: true, revision: 0, resource: (path: string) => loaded(path.endsWith("/einheit") ? einheit : { actorId: "a", betrag: 20, version: 1 }), transport: async () => { throw new Error("Version conflict"); } });
    h.button(" Währung benennen").props.onClick();
    h.nodes(n => n.type === "input" && n.props.maxLength === 40)[0]!.props.onChange({ target: { value: "Gold" } });
    einheit = { name: "Silber", version: 2 }; h.replace({ revision: 1 });
    h.nodes(n => n.type === "form")[0]!.props.onSubmit({ preventDefault() {} }); await h.settle();
    expect(h.requests[0]?.request.body).toEqual({ name: "Gold", expectedVersion: 1 });
  });

  it("resets templateId and name after cancelling the creation form so re-opening starts fresh", () => {
    const vorlage = { id: "t1", name: "Krieger", anfangswerte: {} };
    const h = harness("FigurAntrag", {
      campaignId: "campaign",
      rules: { packages: [], pin: { id: "", version: "" }, version: 0 },
      revision: 0,
      onChanged() {},
      resource: (path: string) => loaded(path.includes("freigegeben") ? [vorlage] : []),
    });
    // Open the creation form and fill in template + name.
    h.button("Figur anlegen").props.onClick();
    h.nodes(n => n.type === "select" && n.props.required)[0]!.props.onChange({ target: { value: "t1" } });
    h.nodes(n => n.type === "input" && n.props.required)[0]!.props.onChange({ target: { value: "Gandalf" } });
    // Cancel — old bug left templateId and name in state.
    h.button("Abbrechen").props.onClick();
    // Re-open the form; it must be completely empty.
    h.button("Figur anlegen").props.onClick();
    expect(h.nodes(n => n.type === "select" && n.props.required)[0]!.props.value).toBe("");
    expect(h.nodes(n => n.type === "input" && n.props.required)[0]!.props.value).toBe("");
  });
});
