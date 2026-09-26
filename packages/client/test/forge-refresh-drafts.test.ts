// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { transformSync } from "esbuild";
import { describe, expect, it } from "vitest";
import { I18nStub } from "../src/i18n.ts";

type Resource = { data: unknown; loading: boolean; error: string };
type Node = { type: unknown; props: Record<string, any>; key?: string };
const loaded = (data: unknown): Resource => ({ data, loading: false, error: "" });
const rules = { packages: [], pin: { id: "demo", version: "1.0.0" }, version: 1 };

/** Render the real workshop shells; retain child positions as React's unkeyed identity.
 * Rückfragen laufen seit 2026-09-26 über `confirmAction` aus `@chronicle/ui` (im Look, als Versprechen);
 * der Stub hält jede Frage fest und lehnt ab, wie vorher die Browser-Rückfrage. */
function workshop(component: "FigureWorkshop" | "LootWorkshop") {
  const slots: any[] = [], dirtyReports: boolean[] = [], confirmations: string[] = [];
  let cursor = 0, resources: Record<string, Resource> = { "/rules": loaded(rules), "/actors": loaded([]) };
  const react = {
    lazy: () => "Lazy", Suspense: "Suspense",
    useState(initial: unknown) {
      const index = cursor++;
      slots[index] ??= { value: initial };
      return [slots[index].value, (next: any) => { slots[index].value = typeof next === "function" ? next(slots[index].value) : next; }];
    },
    useCallback: (fn: unknown) => fn,
  };
  const element = (type: unknown, props: Record<string, unknown>, key?: string): Node => ({ type, props, key });
  const mod = { exports: {} as any };
  const source = readFileSync(new URL("../src/features/ForgeWorkbench.tsx", import.meta.url), "utf8");
  runInNewContext(transformSync(`${source}\nexport { FigureWorkshop, LootWorkshop };`, { loader: "tsx", format: "cjs", jsx: "automatic" }).code, {
    module: mod, exports: mod.exports,
    require: (name: string) => {
      if (name === "react") return react;
      if (name === "@chronicle/ui") return new Proxy({
        confirmAction: async (request: string | { title?: string; message: string }) => { confirmations.push(typeof request === "string" ? request : request.title ?? request.message); return false; },
        announce() {}, focusHeading() {}, tabKeyTarget: () => null,
      } as Record<string, unknown>, { get: (target, key) => key in target ? target[key as string] : String(key) });
      if (name === "react/jsx-runtime") return { jsx: element, jsxs: element, Fragment: "Fragment" };
      if (name === "../i18n") return I18nStub;
      if (name === "../api") return { apiPath: (_: string, suffix: string) => suffix };
      if (name === "../hooks") return { useResource: (path: string | null) => path ? resources[path] : loaded(null) };
      return new Proxy({}, { get: (_, key) => String(key) });
    },
  });
  const props = { campaignId: "campaign", revision: 0, onChanged() {}, onOpenLoot() {}, onDirty: (value: boolean) => dirtyReports.push(value) };
  const render = () => { cursor = 0; return mod.exports[component](props); };
  function nodes() {
    const found: (Node & { position: string })[] = [];
    const visit = (node: any, position: string) => {
      if (Array.isArray(node)) node.forEach((child, index) => visit(child, `${position}/${index}`));
      else if (node?.props) { found.push({ ...node, position }); visit(node.props.children, `${position}/children`); }
    };
    visit(render(), "root"); return found;
  }
  return {
    dirtyReports, confirmations, nodes,
    child: (type: string) => nodes().find(node => node.type === type),
    /** Die Reiter sind echte `Tabs`: gewählt wird über `onChange`, die Rückfrage ist asynchron. */
    tab: async (id: string) => { nodes().find(node => node.type === "Tabs")!.props.onChange(id); await new Promise(resolve => setTimeout(resolve, 0)); },
    replace: (path: string, value: Resource) => { resources = { ...resources, [path]: value }; },
  };
}

describe("workshop drafts survive a failed background refresh", () => {
  it.each([
    ["FigureWorkshop", "ActorTemplates", "/rules", undefined, "create"],
    ["FigureWorkshop", "InstantiateActor", "/rules", "create", "templates"],
    ["LootWorkshop", "Inventory", "/actors", "inventory", "templates"],
  ] as const)("keeps %s/%s mounted with its dirty navigation guard", async (component, editor, path, initialTab, otherTab) => {
    const h = workshop(component);
    if (initialTab) await h.tab(initialTab);
    const before = h.child(editor)!;
    expect(before).toBeDefined();
    before.props.onDirty(true);
    const previousData = path === "/rules" ? rules : before.props.actors;
    h.replace(path, { data: previousData, loading: false, error: "Temporary refresh failure" });
    expect(h.nodes().some(node => node.type === "Notice" && node.props.error && node.props.children === "Temporary refresh failure")).toBe(true);
    const during = h.child(editor);
    expect(during, "a retained resource must not unmount an unsaved editor").toBeDefined();
    expect(during?.position).toBe(before.position);
    expect(during?.key).toBe(before.key);
    await h.tab(otherTab);
    expect(h.confirmations).toHaveLength(1);
    expect(h.child(editor)).toBeDefined();
    expect(h.dirtyReports.at(-1)).toBe(true);
    h.replace(path, loaded(previousData));
    expect(h.child(editor)?.position).toBe(before.position);
    expect(h.nodes().filter(node => node.type === "Notice")).toHaveLength(0);
  });

  it.each(["FigureWorkshop", "LootWorkshop"] as const)("preserves initial loading and no-data error behavior in %s", async component => {
    const h = workshop(component);
    const path = component === "FigureWorkshop" ? "/rules" : "/actors";
    const editor = component === "FigureWorkshop" ? "ActorTemplates" : "Inventory";
    if (component === "LootWorkshop") await h.tab("inventory");
    h.replace(path, { data: null, loading: true, error: "" });
    expect(h.child(editor)).toBeUndefined();
    expect(h.child("Loading")).toBeDefined();
    h.replace(path, { data: null, loading: false, error: "Access denied" });
    expect(h.child(editor)).toBeUndefined();
    expect(h.nodes().some(node => node.type === "Notice" && node.props.children === "Access denied")).toBe(true);
  });
});
