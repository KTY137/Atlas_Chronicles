// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { transformSync } from "esbuild";
import { describe, expect, it } from "vitest";

type Element = { type: string | ((props: any) => Element); props: any; key?: string; rendered?: Element };
type Fiber = { slots: any[]; cursor: number };

/** Run the real table, actor workbench and creation form together, including keyed unmounts. */
function tableHarness(requests: { openTab?: { tab: string; request: number }; openDoor?: { id: string; request: number } } = {}) {
  const fibers = new Map<string, Fiber>(), modules = new Map<string, any>();
  let current: Fiber, changed = false, effects: (() => void)[] = [], tree: Element;
  const confirmations: string[] = [];
  let parentDirty = false;
  const location = { href: "https://review.test/?campaign=campaign&stage=tisch&tab=actors", search: "?campaign=campaign&stage=tisch&tab=actors" };
  const same = (a: unknown[] | undefined, b: unknown[]) => a?.length === b.length && a.every((value, i) => Object.is(value, b[i]));
  const react = {
    useState(initial: any) {
      const fiber = current, i = fiber.cursor++;
      fiber.slots[i] ??= { value: typeof initial === "function" ? initial() : initial };
      return [fiber.slots[i].value, (next: any) => {
        const value = typeof next === "function" ? next(fiber.slots[i].value) : next;
        if (!Object.is(value, fiber.slots[i].value)) { fiber.slots[i].value = value; changed = true; }
      }];
    },
    useRef(value: unknown) { const i = current.cursor++; return current.slots[i] ??= { current: value }; },
    useCallback(fn: unknown, deps: unknown[]) {
      const i = current.cursor++;
      if (!current.slots[i] || !same(current.slots[i].deps, deps)) current.slots[i] = { fn, deps };
      return current.slots[i].fn;
    },
    useEffect(fn: () => any, deps: unknown[]) {
      const fiber = current, i = fiber.cursor++;
      if (!fiber.slots[i] || !same(fiber.slots[i].deps, deps)) {
        const cleanup = fiber.slots[i]?.cleanup;
        fiber.slots[i] = { deps };
        effects.push(() => { cleanup?.(); fiber.slots[i].cleanup = fn(); });
      }
    },
  };
  const actors = ["a", "b"].map(id => ({ id, name: id.toUpperCase(), canControl: true, kind: "npc", version: 1, template: null, loreEntryId: null }));
  const resources = (path: string | null) => ({ loading: false, loaded: true, error: "", data:
    path === null ? null : path?.endsWith("/actors") ? actors : path?.endsWith("/rules") ? { pin: { id: "demo", version: "1" }, packages: [] }
      : path?.endsWith("/actor-templates") ? [{ id: "template", revision: 1, definition: { name: "Guard" } }] : [] });
  function load(file: string): any {
    if (modules.has(file)) return modules.get(file);
    const mod = { exports: {} as any }, jsx = (type: Element["type"], props: any, key?: string) => ({ type, props, key });
    const source = readFileSync(new URL(`../src/${file}`, import.meta.url), "utf8");
    runInNewContext(transformSync(source, { loader: file.endsWith("tsx") ? "tsx" : "ts", format: "cjs", jsx: "automatic" }).code, {
      module: mod, exports: mod.exports, location, URL, URLSearchParams,
      document: { getElementById: () => ({ focus() {} }) },
      window: { confirm: (message: string) => { confirmations.push(message); return true; }, history: { replaceState: (_state: unknown, _title: string, url: URL) => { location.href = String(url); location.search = url.search; } } },
      require: (name: string) => {
        if (name === "react") return react;
        if (name === "react/jsx-runtime") return { jsx, jsxs: jsx, Fragment: "Fragment" };
        if (name === "../navigation") return load("navigation.ts");
        if (name === "./ActorWorkbench") return load("features/ActorWorkbench.tsx");
        if (name === "../hooks") return { useResource: resources, useTask: () => ({ busy: false, error: "" }), useFrischeKarten: () => new Set() };
        if (name === "../api") return { apiPath: (id: string, suffix: string) => `/api/campaigns/${id}${suffix}` };
        if (name === "./game-api") return { useCommand: () => () => undefined };
        return new Proxy({}, { get: (_target, key) => String(key) });
      },
    });
    modules.set(file, mod.exports);
    return mod.exports;
  }
  const props = { campaign: { id: "campaign", role: "leitung" }, userId: "gm", onOpenEntry() {},
    onDirty: (value: boolean) => { parentDirty = value; }, ...requests };
  function render() {
    for (let turn = 0; turn < 30; turn++) {
      changed = false; effects = [];
      const visited = new Set<string>();
      function visit(value: any, path: string): any {
        if (Array.isArray(value)) return value.map((child, i) => visit(child, `${path}/${i}`));
        if (!value?.props) return value;
        if (typeof value.type === "function") {
          if (!["TableView", "ActorWorkbench", "InstantiateActor"].includes(value.type.name)) return value;
          const id = `${path}/${value.type.name}:${value.key ?? ""}`;
          visited.add(id); current = fibers.get(id) ?? { slots: [], cursor: 0 }; current.cursor = 0; fibers.set(id, current);
          return { ...value, rendered: visit(value.type(value.props), id) };
        }
        return { ...value, props: { ...value.props, children: visit(value.props.children, `${path}/${value.type}:${value.key ?? ""}`) } };
      }
      tree = visit({ type: load("features/TableView.tsx").TableView, props }, "root");
      for (const [id, fiber] of fibers) if (!visited.has(id)) { fibers.delete(id); for (const slot of fiber.slots) slot?.cleanup?.(); }
      for (const effect of effects) effect();
      if (!changed) return;
    }
    throw new Error("Component tree did not settle");
  }
  function nodes(predicate: (node: Element) => boolean) {
    render(); const found: Element[] = [];
    const walk = (value: any) => { if (Array.isArray(value)) value.forEach(walk); else if (value?.props) { if (predicate(value)) found.push(value); walk(value.rendered ?? value.props.children); } };
    walk(tree); return found;
  }
  const text = (value: any): string => Array.isArray(value) ? value.map(text).join("") : value?.props ? text(value.rendered ?? value.props.children) : value == null ? "" : String(value);
  const field = (label: string, type: string) => {
    const container = nodes(node => node.type === "label" && text(node).startsWith(label))[0]!;
    const children = Array.isArray(container.props.children) ? container.props.children : [container.props.children];
    return children.find((node: Element) => node?.type === type)! as Element;
  };
  return { render, nodes, text, field, confirmations, dirty: () => { render(); return parentDirty; } };
}

describe("table navigation across child editors", () => {
  it("discards the creation draft after an accepted actor switch and guards the next draft", () => {
    const h = tableHarness();
    h.field("Name dieser Figur", "input").props.onChange({ target: { value: "Unsaved guard" } });
    expect(h.dirty()).toBe(true);
    h.field("Handelnde Figur", "select").props.onChange({ target: { value: "b" } });
    expect(h.confirmations).toHaveLength(1);
    expect(h.field("Name dieser Figur", "input").props.value).toBe("");
    expect(h.dirty()).toBe(false);
    h.field("Name dieser Figur", "input").props.onChange({ target: { value: "Next draft" } });
    expect(h.dirty()).toBe(true);
    h.nodes(node => node.props.role === "tab" && h.text(node) === "Aktionen")[0]!.props.onClick();
    h.render();
    expect(h.confirmations).toHaveLength(2);
  });

  it("opens the requested door when an earlier dashboard tab request is still present", () => {
    const h = tableHarness({ openTab: { tab: "kampf", request: 1 }, openDoor: { id: "door", request: 2 } });
    expect(h.nodes(node => node.props.role === "tab" && node.props["aria-selected"]).map(h.text)).toEqual(["Vollmachten"]);
  });
});
