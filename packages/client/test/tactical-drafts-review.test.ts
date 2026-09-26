// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { transformSync } from "esbuild";
import { describe, expect, it } from "vitest";
import * as MapGeneration from "../src/features/map-generation.ts";
import { I18nStub } from "../src/i18n.ts";

/** Runs the actual component handlers/effects with controlled props and transport;
 * no browser, server, or production exports are changed by this review harness. */
function harness(file: "TacticalView" | "TacticalPreparation", component: string, initial: Record<string, any>, resource: (path: string | null) => any = () => ({ data: null, loading: false, error: "" })) {
  const slots: any[] = [], commands: { path: string; body: any }[] = [], jobs: Promise<unknown>[] = [], confirmations: string[] = [];
  let cursor = 0, changed = false, effects: { i: number; fn: () => any }[] = [], props = initial, tree: any;
  const same = (a: unknown[] | undefined, b: unknown[]) => a?.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  const react = {
    useRef(value: unknown) { const i = cursor++; return slots[i] ??= { current: value }; },
    useState(initial: any) {
      const i = cursor++; slots[i] ??= { value: typeof initial === "function" ? initial() : initial };
      return [slots[i].value, (next: any) => { const value = typeof next === "function" ? next(slots[i].value) : next; if (!Object.is(value, slots[i].value)) { slots[i].value = value; changed = true; } }];
    },
    useCallback(fn: unknown, deps: unknown[]) { const i = cursor++; if (!slots[i] || !same(slots[i].deps, deps)) slots[i] = { fn, deps }; return slots[i].fn; },
    useMemo(fn: () => unknown) { return fn(); },
    useEffect(fn: () => unknown, deps: unknown[]) { const i = cursor++; if (!slots[i] || !same(slots[i].deps, deps)) { slots[i] = { deps, cleanup: slots[i]?.cleanup }; effects.push({ i, fn }); } },
  };
  const element = (type: unknown, props: unknown) => ({ type, props }), mod = { exports: {} as any };
  const actual = readFileSync(new URL(`../src/features/${file}.tsx`, import.meta.url), "utf8");
  const extra = (file === "TacticalView" ? ["TokenEditor", "LiveBoard"] : ["ScenePlan", "PlanForm"])
    .filter(name => !actual.includes(`export function ${name}(`)).join(", ");
  const code = transformSync(`${actual}\nexport { ${extra} };`, { loader: "tsx", format: "cjs", jsx: "automatic" }).code;
  runInNewContext(code, { module: mod, exports: mod.exports, crypto: { randomUUID: () => "review-command" }, window: { confirm: (message: string) => { confirmations.push(message); return true; } },
    require: (name: string) => {
      if (name === "../i18n" || name === "./i18n" || name === "../../i18n") return I18nStub;
      if (name === "react") return react;
      if (name === "./map-generation") return MapGeneration;
      if (name === "react/jsx-runtime") return { jsx: element, jsxs: element, Fragment: "Fragment" };
      if (name === "../hooks") return { useResource: resource, useTask: () => ({ busy: false, error: "", run: (fn: () => Promise<unknown>) => { const job = fn(); jobs.push(job); return job; } }) };
      if (name === "./game-api") return { useCommand: () => async (path: string, body: unknown) => { commands.push({ path, body }); return { subjectId: "subject", version: 2 }; } };
      if (name === "../api") return { apiPath: (id: string, suffix: string) => `/api/campaigns/${id}${suffix}`, api: async () => props.current, markiereAenderung() {} };
      if (name === "@chronicle/render") return { snapMapPoint: (point: unknown) => point };
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
    const found: any[] = [];
    const visit = (node: any) => { if (Array.isArray(node)) node.forEach(visit); else if (node?.props) { if (predicate(node)) found.push(node); visit(node.props.children); } };
    visit(render()); return found;
  }
  const inputs = () => nodes(node => node.type === "input" && node.props.type === "number");
  return { render, nodes, inputs, commands, confirmations, replace: (next: Record<string, any>) => { props = { ...props, ...next }; render(); },
    settle: async () => { await Promise.all(jobs); render(); } };
}

const callbacks = { onChanged: () => {}, onDirty: () => {} };
const token = { id: "token", actorId: "actor", name: "Actor", canMove: true, x: 0, y: 0, elevation: 0, rotation: 0, scale: 1, version: 1 };
const map = { id: "map", name: "Map", revision: 1, version: 1, contentHash: "map-one", document: { geometry: { size: [100, 100], regions: [], stamps: [], places: [] }, walls: [], portals: [], grid: { kind: "none" }, elevation: 0 } };
const scene = { id: "scene", name: "Scene", status: "prepared", version: 1 };
const plan = { sceneId: "scene", mapId: "map", mapRevision: 1, version: 1, tokens: [token] };

describe("independent tactical draft review", () => {
  it("keeps a successfully loaded null plan mounted during refresh and after a transient failure", async () => {
    const slots: any[] = [], calls: { resolve: (value: unknown) => void; reject: (error: Error) => void }[] = [];
    let cursor = 0, changed = false, effects: { i: number; fn: () => any }[] = [], value: any, revision = 0;
    const react = {
      useState(initial: any) {
        const i = cursor++; slots[i] ??= { value: typeof initial === "function" ? initial() : initial };
        return [slots[i].value, (next: any) => { const update = typeof next === "function" ? next(slots[i].value) : next; if (!Object.is(update, slots[i].value)) { slots[i].value = update; changed = true; } }];
      },
      useEffect(fn: () => any, deps: unknown[]) {
        const i = cursor++, old = slots[i];
        if (!old || deps.some((v, index) => !Object.is(v, old.deps[index]))) { slots[i] = { deps, cleanup: old?.cleanup }; effects.push({ i, fn }); }
      },
    };
    class ApiError extends Error { constructor(readonly status: number) { super("Temporary server failure"); } }
    const mod = { exports: {} as any }, actual = readFileSync(new URL("../src/hooks.ts", import.meta.url), "utf8");
    runInNewContext(transformSync(actual, { loader: "ts", format: "cjs" }).code, {
      module: mod, exports: mod.exports, AbortController, setTimeout, clearTimeout,
      require: (name: string) => name === "react" ? react : { ApiError, errorText: (error: Error) => error.message, aktuellerSchreibStand: () => 0,
        api: () => new Promise((resolve, reject) => calls.push({ resolve, reject })),
      },
    });
    function render() {
      for (let repeat = 0; repeat < 20; repeat++) {
        cursor = 0; changed = false; effects = []; value = mod.exports.useResource("/scenes/scene/tactical-plan", revision);
        for (const effect of effects) { slots[effect.i].cleanup?.(); slots[effect.i].cleanup = effect.fn(); }
        if (!changed) return value;
      }
      throw new Error("Resource hook did not settle");
    }
    expect(render()).toMatchObject({ data: null, loading: true });
    calls[0]!.resolve(null); for (let i = 0; i < 10; i++) await Promise.resolve();
    expect(render()).toMatchObject({ data: null, loading: false, error: "" });
    revision++;
    // A successful null means "no saved plan yet", not "never loaded".
    expect.soft(render()).toMatchObject({ data: null, loading: false, error: "" });
    calls[1]!.reject(new ApiError(503)); for (let i = 0; i < 10; i++) await Promise.resolve();
    expect(render()).toMatchObject({ data: null, loading: false, error: "Temporary server failure" });
    revision++;
    expect(render()).toMatchObject({ data: null, loading: false, error: "" });
    for (const slot of slots) slot?.cleanup?.();
  });

  it("preserves a failed movement's command id while another independent token command completes", async () => {
    const calls: { body: Record<string, unknown>; resolve: (value: unknown) => void; reject: (error: Error) => void }[] = [];
    let sequence = 0;
    const mod = { exports: {} as any }, actual = readFileSync(new URL("../src/features/game-api.ts", import.meta.url), "utf8");
    runInNewContext(transformSync(actual, { loader: "ts", format: "cjs" }).code, {
      module: mod, exports: mod.exports, crypto: { randomUUID: () => `command-${++sequence}` },
      require: (name: string) => name === "react" ? { useRef: (initial: unknown) => ({ current: initial }) } : {
        api: (_path: string, request: { body: Record<string, unknown> }) => new Promise((resolve, reject) => { calls.push({ body: request.body, resolve, reject }); }),
      },
    });
    // LiveBoard shares this hook across independently busy TokenEditor forms.
    const command = mod.exports.useCommand(), a = command("/tokens/a/move", { expectedVersion: 1, x: 10 });
    const b = command("/tokens/b/move", { expectedVersion: 1, x: 20 }).catch(() => null);
    calls[0]!.resolve({ subjectId: "a", version: 2 }); await a;
    calls[1]!.reject(new Error("Response lost after acceptance")); await b;
    const originalId = calls[1]!.body.commandId, retry = command("/tokens/b/move", { expectedVersion: 1, x: 20 });
    calls[2]!.resolve({ subjectId: "b", version: 2 }); await retry;
    expect(calls[2]!.body.commandId).toBe(originalId);
  });

  it("keeps an accepted token position until refreshed props catch up to its acknowledgement", async () => {
    const accepted: unknown[] = [];
    const h = harness("TacticalView", "TokenEditor", { token, active: true, busy: false, selected: false, onDirty: () => {},
      onMove: async (_baseline: unknown, values: unknown) => { accepted.push(values); return { subjectId: "token", version: 2 }; } });
    h.inputs()[0]!.props.onChange({ target: { valueAsNumber: 20 } });
    h.nodes(node => node.type === "form")[0]!.props.onSubmit({ preventDefault() {} }); await h.settle();
    expect(accepted).toEqual([{ x: 20, y: 0, elevation: 0, rotation: 0, scale: 1 }]);
    expect(h.inputs()[0]!.props.value).toBe(20);
  });

  it.each([["saved", plan], ["new", null]])("keeps the selected %s plan editor mounted after a transient refresh error", (_name, currentPlan) => {
    let error = "";
    const h = harness("TacticalPreparation", "ScenePlan", { campaignId: "campaign", map, revision: 1, ...callbacks }, path => ({
      data: path?.endsWith("/scenes") ? [scene] : path?.endsWith("/actors") ? [] : currentPlan, loading: false, loaded: !!path, error: path?.endsWith("/tactical-plan") ? error : "",
    }));
    h.nodes(node => node.type === "select")[0]!.props.onChange({ target: { value: "scene" } });
    const before = h.nodes(node => node.type?.name === "PlanForm")[0]!;
    expect(before).toBeDefined(); before.props.onDirty(true);
    error = "Temporary connection failure"; h.replace({ revision: 2 });
    expect(h.nodes(node => node.type?.name === "PlanForm")).toHaveLength(1);
  });

  it("does not silently bind an in-progress token draft to a remotely advanced map revision", async () => {
    const h = harness("TacticalPreparation", "PlanForm", { campaignId: "campaign", scene, map, current: plan, actors: [], ...callbacks });
    h.inputs()[0]!.props.onChange({ target: { valueAsNumber: 20 } });
    h.replace({ map: { ...map, version: 2, revision: 2, contentHash: "map-two" } });
    h.nodes(node => node.type === "form")[0]!.props.onSubmit({ preventDefault() {} }); await h.settle();
    // Keeping the old pin or blocking save is valid, as is explicitly asking
    // the user to accept the changed map before binding their existing draft.
    if (h.commands[0]?.body.mapRevision === 2) expect(h.confirmations.length).toBeGreaterThan(0);
  });
});
