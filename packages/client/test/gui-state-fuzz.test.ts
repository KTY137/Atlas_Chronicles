// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { transformSync } from "esbuild";
import { describe, expect, it, vi } from "vitest";
import { I18nStub } from "../src/i18n";

/** Execute the production hooks/effects; the driver owns only render timing,
 * transport completion order and browser focus, not the behavior under test. */
function driver(file: string, exported: string, imports: Record<string, unknown> = {}, globals: Record<string, unknown> = {}) {
  let cursor = 0, dirty = false, mounted = true, writesAfterUnmount = 0;
  const slots: any[] = [], pending: { i: number; effect: () => any }[] = [];
  const equal = (a: any[] | undefined, b: any[]) => a?.length === b.length && a.every((x, i) => Object.is(x, b[i]));
  const react = {
    useRef(value: unknown) { const i = cursor++; return slots[i] ??= { current: value }; },
    useState(value: any) { const i = cursor++; slots[i] ??= { value: typeof value === "function" ? value() : value }; return [slots[i].value, (next: any) => { if (!mounted) { writesAfterUnmount++; return; } const v = typeof next === "function" ? next(slots[i].value) : next; if (!Object.is(v, slots[i].value)) { slots[i].value = v; dirty = true; } }]; },
    useMemo(fn: () => any) { return fn(); },
    useCallback(fn: any, deps: any[]) { const i = cursor++; if (!slots[i] || !equal(slots[i].deps, deps)) slots[i] = { fn, deps }; return slots[i].fn; },
    useEffect(effect: () => any, deps: any[]) { const i = cursor++; if (!slots[i] || !equal(slots[i].deps, deps)) { slots[i] = { deps, cleanup: slots[i]?.cleanup }; pending.push({ i, effect }); } },
  };
  class ApiError extends Error { constructor(public status: number, message: string) { super(message); } }
  const mod = { exports: {} as any }, jsx = (type: any, props: any) => ({ type, props });
  let source = readFileSync(new URL(file, import.meta.url), "utf8");
  if (!source.includes(`export function ${exported}(`)) source += `\nexport { ${exported} };`;
  runInNewContext(transformSync(source, { loader: "tsx", format: "cjs", jsx: "automatic" }).code, {
    module: mod, exports: mod.exports, ...globals,
    require: (name: string) => name === "react" ? react : name === "react/jsx-runtime" ? { jsx, jsxs: jsx } : name.endsWith("i18n") ? I18nStub : imports[name] ?? (name === "./api" ? { ApiError, errorText: (e: Error) => e.message } : new Proxy({}, { get: (_t, key) => String(key) })),
  });
  return {
    render(props?: unknown) { let value: any; for (let i = 0; i < 30; i++) { cursor = 0; dirty = false; value = mod.exports[exported](props); for (const p of pending.splice(0)) { slots[p.i].cleanup?.(); slots[p.i].cleanup = p.effect(); } if (!dirty) return value; } throw new Error("Render loop"); },
    unmount() { for (const slot of slots) slot?.cleanup?.(); mounted = false; },
    writesAfterUnmount: () => writesAfterUnmount, ApiError,
  };
}
const deferred = () => { let resolve!: () => void, reject!: (e: Error) => void; const promise = new Promise<void>((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };

describe("GUI async state fuzz", () => {
  it("coalesces same-frame double submissions before disabled buttons have rendered", async () => {
    const d = driver("../src/hooks.ts", "useTask"), wait = deferred(), work = vi.fn(() => wait.promise);
    const task = d.render(); const first = task.run(work), second = task.run(work);
    await Promise.resolve(); expect(work).toHaveBeenCalledTimes(1);
    expect(d.render().busy).toBe(true); wait.resolve(); await Promise.all([first, second]); expect(d.render().busy).toBe(false);
  });
  it.each([43, 713, 20260911])("keeps the lock and error state coherent under seeded event bursts (%i)", async seed => {
    const d = driver("../src/hooks.ts", "useTask"); let n = seed, calls = 0;
    for (let round = 0; round < 80; round++) {
      n = (Math.imul(n, 1664525) + 1013904223) >>> 0;
      const task = d.render(), wait = deferred(), jobs: Promise<void>[] = [];
      const work = () => { calls++; return wait.promise; };
      for (let i = 0; i < 2 + n % 7; i++) jobs.push(task.run(work));
      await Promise.resolve(); expect(calls).toBe(round + 1); expect(d.render().busy).toBe(true);
      if (n & 1) wait.reject(new d.ApiError(409, `conflict-${round}`)); else wait.resolve();
      await Promise.all(jobs);
      const result = d.render(); expect(result.busy).toBe(false);
      expect(result.status).toBe(n & 1 ? 409 : 0); expect(result.error).toBe(n & 1 ? `conflict-${round}` : "");
    }
  });
  it("does not write hook state after the owning form unmounts", async () => {
    const d = driver("../src/hooks.ts", "useTask"), wait = deferred();
    const job = d.render().run(() => wait.promise); await Promise.resolve(); d.unmount();
    wait.reject(new Error("late response")); await job; expect(d.writesAfterUnmount()).toBe(0);
  });
  it("recovers after a synchronous handler failure", async () => {
    const d = driver("../src/hooks.ts", "useTask");
    await d.render().run(() => { throw new Error("sync failure"); });
    expect(d.render()).toMatchObject({ busy: false, error: "sync failure" });
    await d.render().run(async () => {}); expect(d.render()).toMatchObject({ busy: false, error: "", status: 0 });
  });
});

describe("polled deep-link focus", () => {
  it("focuses a linked door once, not again while editing a dropdown after every refresh", () => {
    const focus = vi.fn(); let doorRows: unknown[] | null = null;
    const d = driver("../src/features/TableView.tsx", "Doors", {
      "../hooks": { useTask: () => ({ busy: false }), useResource: (path: string | null) => ({ data: path?.endsWith("/vollmachten") ? doorRows : null }) },
      "./game-api": { useCommand: () => vi.fn() }, "../api": { apiPath: (_id: string, path: string) => path },
    }, { document: { getElementById: () => doorRows ? { focus } : null } });
    const props = { selectedId: "door-one", campaignId: "c", rules: { packages: [] }, roster: [], actorId: "", gm: true, revision: 0, onChanged: vi.fn() };
    d.render(props); expect(focus).not.toHaveBeenCalled();
    doorRows = []; d.render(props); expect(focus).toHaveBeenCalledTimes(1);
    for (let poll = 0; poll < 50; poll++) { doorRows = []; d.render({ ...props, revision: poll }); }
    expect(focus).toHaveBeenCalledTimes(1);
    d.render({ ...props, selectedId: "door-two" }); expect(focus).toHaveBeenCalledTimes(2);
  });
});
