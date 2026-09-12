// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { transformSync } from "esbuild";
import { describe, expect, it } from "vitest";
import * as Protocol from "@chronicle/protocol";
import * as Model from "../src/features/tabletop-model.ts";
import { I18nStub } from "../src/i18n.ts";

function harness(file: "AdventureTree" | "TableDice", component: string, initial: Record<string, any>, response: (path: string, body: any) => any,
  resource: () => any = () => ({ data: [], error: "", loading: false })) {
  const slots: any[] = [], calls: { path: string; body: any }[] = [], jobs: Promise<unknown>[] = [], confirmations: string[] = [];
  let cursor = 0, changed = false, effects: { i: number; run: () => any }[] = [], tree: any, props = initial, sequence = 0, discard = true;
  const same = (a: any[] | undefined, b: any[]) => a?.length === b.length && a.every((value, i) => Object.is(value, b[i]));
  const react = {
    useState(initialValue: any) { const i = cursor++; slots[i] ??= { value: typeof initialValue === "function" ? initialValue() : initialValue }; return [slots[i].value, (next: any) => {
      const value = typeof next === "function" ? next(slots[i].value) : next;
      if (!Object.is(value, slots[i].value)) { slots[i].value = value; changed = true; }
    }]; },
    useEffect(run: () => any, deps: any[]) { const i = cursor++; if (!slots[i] || !same(slots[i].deps, deps)) { slots[i] = { deps, cleanup: slots[i]?.cleanup }; effects.push({ i, run }); } },
  };
  const mod = { exports: {} as any }, jsx = (type: any, p: any, key?: string) => ({ type, props: p, key });
  const source = readFileSync(new URL(`../src/features/${file}.tsx`, import.meta.url), "utf8") + (file === "AdventureTree" ? "\nexport { AdventureEditor };" : "");
  runInNewContext(transformSync(source, { loader: "tsx", format: "cjs", jsx: "automatic" }).code, {
    module: mod, exports: mod.exports, crypto: { randomUUID: () => `new-${++sequence}` },
    window: { confirm: (text: string) => { confirmations.push(text); return discard; } },
    require: (name: string) => {
      if (name === "react") return react;
      if (name === "react/jsx-runtime") return { jsx, jsxs: jsx, Fragment: "Fragment" };
      if (name === "@chronicle/protocol") return Protocol;
      if (name === "./tabletop-model") return Model;
      if (name === "../i18n") return I18nStub;
      if (name === "../api") return { apiPath: (id: string, suffix: string) => `/api/campaigns/${id}${suffix}` };
      if (name === "./game-api") return { useCommand: () => async (path: string, body: any) => { calls.push({ path, body }); return response(path, body); } };
      if (name === "../hooks") return { useResource: resource, useFrischeKarten: () => new Set(), useTask: () => ({ busy: false, error: "", status: 0, setError() {}, run: (work: () => Promise<void>) => { const job = work(); jobs.push(job); return job; } }) };
      return new Proxy({}, { get: (_target, key) => String(key) });
    },
  });
  const text = (value: any): string => Array.isArray(value) ? value.map(text).join("") : value?.props ? text(value.props.children) : value == null || typeof value === "boolean" ? "" : String(value);
  function render() {
    for (let tries = 0; tries < 30; tries++) {
      changed = false; effects = []; cursor = 0; tree = mod.exports[component](props);
      for (const effect of effects) { slots[effect.i].cleanup?.(); slots[effect.i].cleanup = effect.run(); }
      if (!changed) return;
    }
    throw new Error("Tabletop component did not settle");
  }
  function nodes(predicate: (node: any) => boolean) {
    render(); const found: any[] = [];
    const walk = (node: any) => { if (Array.isArray(node)) node.forEach(walk); else if (node?.props) { if (predicate(node)) found.push(node); walk(node.props.children); } };
    walk(tree); return found;
  }
  return { calls, confirmations, nodes, replace(next: any) { props = { ...props, ...next }; render(); }, discard(value: boolean) { discard = value; },
    button(label: string) { return nodes(node => node.type === "Button" && text(node).trim() === label)[0]; },
    content() { render(); return text(tree); }, async settle() { await Promise.all(jobs); render(); } };
}
const remote: Protocol.AdventureCard = { version: 1, currentNodeId: null, updatedAt: 1, document: { schemaVersion: 1, name: "Tower", rootId: "a", nodes: [{ id: "a", title: "Gate", notes: "Private notes", sceneId: null, choices: [] }] } };
const callbacks = { onChanged() {}, onDirty() {} };
describe("tabletop draft and access lifecycle", () => {
  it("preserves local story text across remote changes and requires explicit discard to reload", () => {
    const h = harness("AdventureTree", "AdventureEditor", { campaignId: "c", remote, scenes: [], ...callbacks }, () => remote);
    h.nodes(node => node.type === "input")[1].props.onChange({ target: { value: "Local draft" } });
    const newer = { ...remote, version: 2, document: { ...remote.document, nodes: [{ ...remote.document.nodes[0]!, title: "Remote title" }] } };
    h.replace({ remote: newer });
    expect(h.nodes(node => node.type === "input")[1].props.value).toBe("Local draft");
    expect(h.button("Baum speichern").props.disabled).toBe(true);
    h.discard(false); h.button("Aktuellen Baum laden").props.onClick(); expect(h.content()).toContain("Local draft");
    h.discard(true); h.button("Aktuellen Baum laden").props.onClick();
    expect(h.nodes(node => node.type === "input")[1].props.value).toBe("Remote title"); expect(h.confirmations).toHaveLength(2);
  });
  it("saves a new branch with the expected version and holds the accepted version across an old poll", async () => {
    const h = harness("AdventureTree", "AdventureEditor", { campaignId: "c", remote, scenes: [], ...callbacks }, (_path, body) => ({ ...remote, version: 2, document: body.document }));
    h.button("Abzweigung mit neuer Szene").props.onClick();
    h.nodes(node => node.type === "input")[1].props.onChange({ target: { value: "Hall" } });
    h.button("Baum speichern").props.onClick(); await h.settle();
    expect(h.calls[0]!.body.expectedVersion).toBe(1);
    const document = h.calls[0]!.body.document as Protocol.AdventureTree;
    expect(Protocol.validAdventureTree(document)).toBe(true); expect(document.nodes[0]!.choices[0]!.targetId).toBe(document.nodes[1]!.id);
    expect(document.nodes[1]!.title).toBe("Hall");
    h.replace({ remote }); expect(h.content()).toContain("Hall"); expect(h.button("Baum speichern").props.disabled).toBe(true);
  });
  it("advances through the server using the saved tree and linked scene versions", async () => {
    const linked = { ...remote, document: { ...remote.document, nodes: [{ ...remote.document.nodes[0]!, sceneId: "scene" }] } };
    const h = harness("AdventureTree", "AdventureEditor", { campaignId: "c", remote: linked, scenes: [{ id: "scene", name: "Hall", version: 7 }], ...callbacks }, () => ({ ...linked, version: 2, currentNodeId: "a" }));
    h.button("Diese Szene beginnen").props.onClick(); await h.settle();
    expect(h.calls).toEqual([{ path: "/api/campaigns/c/tabletop/adventure/advance", body: { expectedVersion: 1, expectedSceneVersion: 7, nodeId: "a" } }]);
  });
  it("clears an accepted result when its actor leaves the authorized table projection", async () => {
    const receipt = { id: "roll", actorId: "a", receipt: { package: { id: Protocol.TABLE_DICE_PACKAGE_ID }, total: 19, context: { input: { minimum: 1 } }, dice: [{ sides: 20, kept: [0], rolls: [[19]] }] } };
    const h = harness("TableDice", "TableDice", { campaignId: "c", actorId: "a", participants: [{ id: "a", name: "Sera", canControl: true }], revision: 0, onChanged() {} }, () => receipt);
    h.nodes(node => node.type === "form")[0].props.onSubmit({ preventDefault() {} }); await h.settle();
    expect(h.content()).toContain("19");
    h.replace({ participants: [] }); expect(h.content()).not.toContain("19");
  });
});
