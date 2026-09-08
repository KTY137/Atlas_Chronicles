// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { transformSync } from "esbuild";
import { describe, expect, it } from "vitest";
import * as Entities from "../src/features/tactical-entities.ts";
import { mapRegionOutlines } from "../src/features/map-region-outlines.ts";

/** Runs the actual component handlers/effects with controlled resource responses.
 * No DOM/WebGL emulation: canvas assertions concern the real renderer input contract. */
function harness(file: string, component: string, initial: Record<string, any>, resource: (path: string | null) => any = path => ({ data: path ? [] : null, loading: false, error: "" }), mocks: Record<string, unknown> = {}) {
  const slots: any[] = [];
  let cursor = 0, changed = false, effects: { i: number; fn: () => any }[] = [], props = initial, tree: any;
  const same = (a: unknown[] | undefined, b: unknown[]) => a?.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  const react = {
    useRef(value: unknown) { const i = cursor++; return slots[i] ??= { current: value }; },
    useId() { return "review-control"; },
    useState(initial: any) {
      const i = cursor++; slots[i] ??= { value: typeof initial === "function" ? initial() : initial };
      return [slots[i].value, (next: any) => { const value = typeof next === "function" ? next(slots[i].value) : next; if (!Object.is(value, slots[i].value)) { slots[i].value = value; changed = true; } }];
    },
    useCallback(fn: unknown, deps: unknown[]) { const i = cursor++; if (!slots[i] || !same(slots[i].deps, deps)) slots[i] = { fn, deps }; return slots[i].fn; },
    useMemo(fn: () => unknown) { return fn(); },
    useEffect(fn: () => unknown, deps: unknown[]) { const i = cursor++; if (!slots[i] || !same(slots[i].deps, deps)) { slots[i] = { deps, cleanup: slots[i]?.cleanup }; effects.push({ i, fn }); } },
    useLayoutEffect(fn: () => unknown, deps: unknown[]) { const i = cursor++; if (!slots[i] || !same(slots[i].deps, deps)) { slots[i] = { deps, cleanup: slots[i]?.cleanup }; effects.push({ i, fn }); } },
  };
  const element = (type: unknown, props: any) => { if (type === "div" && props.ref) props.ref.current = { clientWidth: 100, clientHeight: 100 }; return { type, props }; }, mod = { exports: {} as any };
  const actual = readFileSync(new URL(`../src/features/${file}.tsx`, import.meta.url), "utf8");
  const extra = component === file || actual.includes(`export function ${component}(`) ? "" : `\nexport { ${component} };`;
  runInNewContext(transformSync(actual + extra, { loader: "tsx", format: "cjs", jsx: "automatic" }).code, {
    module: mod, exports: mod.exports, AbortController, setTimeout: () => 1, clearTimeout: () => {}, crypto: { randomUUID: () => "new-place" }, window: { confirm: () => true, devicePixelRatio: 1 },
    require: (name: string) => {
      if (name in mocks) return mocks[name];
      if (name === "react") return react;
      if (name === "./map-region-outlines") return { mapRegionOutlines };
      if (name === "react/jsx-runtime") return { jsx: element, jsxs: element, Fragment: "Fragment" };
      if (name === "./tactical-entities") return Entities;
      if (name === "../hooks") return { useResource: resource, useTask: () => ({ busy: false, error: "", run: (fn: () => unknown) => fn() }) };
      if (name === "./game-api") return { useCommand: () => async () => ({ subjectId: "subject", version: 2 }) };
      if (name === "../api") return { apiPath: (id: string, suffix: string) => `/api/campaigns/${id}${suffix}`, plainText: () => "Passage" };
      if (name === "@chronicle/szene") return { TACTICAL_MAP_LIMITS: { places: 20_000 } };
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
  const text = (node: any): string => typeof node === "string" || typeof node === "number" ? String(node) : Array.isArray(node) ? node.map(text).join("") : node?.props ? text(node.props.children) : "";
  return { render, nodes, text, replace: (next: Record<string, any>) => { props = { ...props, ...next }; render(); },
    cleanup: () => { for (const slot of slots) slot?.cleanup?.(); } };
}

const callbacks = { onChanged: () => {}, onDirty: () => {}, onOpenEntry: () => {} };
const objects: Entities.MapObject[] = [
  { kind: "place", id: "outside", x: -1, y: 10, label: "An imported point outside the map", entryId: "entry" },
  { kind: "stamp", id: "inside", x: 20, y: 20, label: "A visible stamp", entryId: "entry" },
];
const document = { geometry: { size: [100, 100], places: [{ id: "outside", x: -1, y: 10 }], stamps: [{ id: "inside", a: "pk.private/chest", x: 20, y: 20, s: 1, r: 0, l: 0 }], regions: [] }, grid: { kind: "none" }, frame: { einheitenProPixel: 1 }, elevation: 0, walls: [], geometryElevation: [] };
const map = { id: "map", name: "Map", revision: 1, version: 1, contentHash: "map-one", document, anchors: [] };
const board = { gm: true, sessionId: "session", size: [100, 100], entities: objects, regions: [], tokens: [], grid: { kind: "none" }, rasterDigest: "raster", undoTargets: [], portals: [], elevation: 0, active: true };

describe("independent tactical entity client review", () => {
  it("keeps all 70,000 outline objects reachable while the graphic retains a selected overflow object", () => {
    const all = Array.from({ length: 70_000 }, (_, i): Entities.MapObject => ({ id: String(i).padStart(5, "0"), kind: i < 50_000 ? "stamp" : "place", x: 10, y: 10, label: `Object ${i}` }));
    const selected = Entities.objectKey(all.at(-1)!);
    const window = Entities.mapObjectWindow(all, selected, 100, 100);
    expect(window).toHaveLength(20_000); expect(window.at(-1)).toBe(all.at(-1)); expect(all).toHaveLength(70_000);
    const selections: string[] = [];
    const h = harness("TacticalObjectList", "TacticalObjectList", { objects: all, selected: "", onSelect: (key: string) => selections.push(key) });
    try {
      expect(h.nodes(n => n.type === "li")).toHaveLength(100);
      h.nodes(n => n.type === "input")[0]!.props.onChange({ target: { value: "Object 69999" } });
      const item = h.nodes(n => n.type === "li")[0]!;
      expect(h.text(item)).toContain("Object 69999");
      item.props.children[0].props.onClick(); expect(selections).toEqual([selected]);
    } finally { h.cleanup(); }
  });

  it("keeps equal stamp/place geometry IDs distinct in the list and selection window", () => {
    const all: Entities.MapObject[] = [{ kind: "place", id: "same", x: 0, y: 0, label: "Place" }, { kind: "stamp", id: "same", x: 10, y: 10, label: "Stamp" }];
    const h = harness("TacticalObjectList", "TacticalObjectList", { objects: all, selected: "stamp:same", onSelect: () => {} });
    try {
      expect(Entities.mapObjectWindow(all, "stamp:same", 100, 100).map(Entities.objectKey)).toEqual(["place:same", "stamp:same"]);
      const buttons = h.nodes(n => n.type === "Button");
      expect(buttons.map(b => b.props["aria-pressed"])).toEqual([false, true]);
    } finally { h.cleanup(); }
  });

  it.each(["live", "preparation"])("selects an out-of-map %s outline object without sending an invalid renderer selection", mode => {
    const h = mode === "live"
      ? harness("TacticalView", "LiveBoard", { campaignId: "campaign", gm: true, revision: 1, ...callbacks }, () => ({ data: board, loading: false, error: "" }))
      : harness("TacticalPreparation", "MapEditor", { current: map, campaignId: "campaign", ...callbacks });
    try {
      const outline = h.nodes(n => n.type === (mode === "live" ? "TacticalObjectList" : "TacticalEntitiesEditor"))[0]!;
      outline.props.onSelect("place:outside");
      const canvas = h.nodes(n => n.type === "TacticalCanvas")[0]!;
      expect(canvas.props.scene.pins.some((p: any) => p.id === "place:outside")).toBe(false);
      // renderer.ts select() rejects any identity absent from the projected scene.
      // The full GM outline must retain the item without causing that exception.
      expect(canvas.props.selection).toBeNull();
      expect(h.nodes(n => n.type === (mode === "live" ? "TacticalObjectList" : "TacticalEntitiesEditor"))[0]!.props.selected).toBe("place:outside");
    } finally { h.cleanup(); }
  });

  it("quarantines a cached GM projection immediately when the current role becomes player", () => {
    const h = harness("TacticalView", "LiveBoard", { campaignId: "campaign", gm: true, revision: 1, ...callbacks }, () => ({ data: board, loading: false, error: "" }));
    try {
      expect(h.nodes(n => n.type === "TacticalCanvas")).toHaveLength(1);
      h.replace({ gm: false });
      expect(h.nodes(n => n.type === "TacticalCanvas" || n.type === "TacticalObjectList")).toHaveLength(0);
      expect(h.text(h.render())).not.toContain(objects[0]!.label);
    } finally { h.cleanup(); }
  });

  it.each(["live", "preparation"].flatMap(mode => [false, true].map(overflow => ({ mode, overflow }))))("preserves the $mode outside-map outline choice after a graphic selection (overflow=$overflow)", async ({ mode, overflow }) => {
    const stamps = overflow ? [...Array.from({ length: 20_000 }, (_, i) => ({ ...document.geometry.stamps[0]!, id: String(i).padStart(5, "0") })), { ...document.geometry.stamps[0]!, id: "zz-overflow" }] : document.geometry.stamps;
    const currentMap = { ...map, document: { ...document, geometry: { ...document.geometry, stamps } } };
    const currentBoard = { ...board, entities: [objects[0]!, ...stamps.map(s => ({ ...objects[1]!, id: s.id }))] };
    const priorKey = overflow ? "stamp:zz-overflow" : "stamp:inside";
    const h = mode === "live"
      ? harness("TacticalView", "LiveBoard", { campaignId: "campaign", gm: true, revision: 1, ...callbacks }, () => ({ data: currentBoard, loading: false, error: "" }))
      : harness("TacticalPreparation", "MapEditor", { current: currentMap, campaignId: "campaign", ...callbacks });
    const outline = () => h.nodes(n => n.type === (mode === "live" ? "TacticalObjectList" : "TacticalEntitiesEditor"))[0]!;
    const canvasProps = () => h.nodes(n => n.type === "TacticalCanvas")[0]!.props;
    let onSelect: (hit: unknown) => void = () => {};
    let graphicSelection: any = null;
    const fakeRenderer = {
      // Mirrors renderer.update's removal callback and select's programmatic callback.
      update: (scene: any) => { if (graphicSelection && !scene.pins.some((pin: any) => pin.id === graphicSelection.id)) { graphicSelection = null; onSelect(null); } },
      destroy: () => {}, getCamera: () => ({ x: 0, y: 0, scale: 1 }), setCamera: () => {},
      select: (hit: unknown) => { graphicSelection = hit; onSelect(hit); },
    };
    const canvas = harness("TacticalCanvas", "TacticalCanvas", canvasProps(), undefined, {
      "./Appearance": { useAppearance: () => ({ resolved: { sampling: "linear" } }) },
      "@chronicle/render": { createMapRenderer: async (_host: unknown, _scene: unknown, options: any) => { onSelect = options.onSelect; return fakeRenderer; } },
    });
    try {
      canvas.render(); await Promise.resolve(); canvas.render();
      outline().props.onSelect(priorKey); canvas.replace(canvasProps());
      expect(outline().props.selected).toBe(priorKey);
      outline().props.onSelect("place:outside"); canvas.replace(canvasProps());
      expect(outline().props.selected).toBe("place:outside");
    } finally { canvas.cleanup(); h.cleanup(); }
  });

  it("drops controlled token selection when the replacement projection removes that token", async () => {
    const token = { id: "token", actorId: "actor", name: "Actor", x: 10, y: 10, elevation: 0, rotation: 0, scale: 1, version: 1, canMove: true };
    let response: any = { ...board, tokens: [token] };
    const h = harness("TacticalView", "LiveBoard", { campaignId: "campaign", gm: true, revision: 1, ...callbacks }, () => ({ data: response, loading: false, error: "" }));
    const canvasProps = () => h.nodes(n => n.type === "TacticalCanvas")[0]!.props;
    let onSelect: (hit: unknown) => void = () => {}, graphicSelection: any = null;
    const fakeRenderer = {
      update: (scene: any) => { if (graphicSelection && !scene.tokens.some((t: any) => t.id === graphicSelection.id)) { graphicSelection = null; onSelect(null); } },
      destroy: () => {}, getCamera: () => ({ x: 0, y: 0, scale: 1 }), setCamera: () => {},
      select: (hit: unknown) => { graphicSelection = hit; onSelect(hit); },
    };
    const canvas = harness("TacticalCanvas", "TacticalCanvas", canvasProps(), undefined, {
      "./Appearance": { useAppearance: () => ({ resolved: { sampling: "linear" } }) },
      "@chronicle/render": { createMapRenderer: async (_host: unknown, _scene: unknown, options: any) => { onSelect = options.onSelect; return fakeRenderer; } },
    });
    try {
      canvas.render(); await Promise.resolve(); canvas.render();
      onSelect({ kind: "token", id: "token" }); canvas.replace(canvasProps());
      expect(canvasProps().selection).toEqual({ kind: "token", id: "token" });
      response = { ...response, tokens: [] }; canvas.replace(canvasProps());
      expect(canvasProps().selection).toBeNull();
    } finally { canvas.cleanup(); h.cleanup(); }
  });
});
