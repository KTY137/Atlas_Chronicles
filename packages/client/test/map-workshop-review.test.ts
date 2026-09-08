// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { transformSync } from "esbuild";
import { describe, expect, it, vi } from "vitest";
import { BAUWERK_LABEL, BAUWERK_TYPEN, KARTEN_SETTING_LABEL } from "@chronicle/szene";
import * as Generation from "../src/features/map-generation.ts";

/** Actual form handlers/effects, with held transport responses. The harness controls network
 * ordering and prop refreshes; it does not reproduce CAS, preview or navigation decisions. */
function harness(file: "NestedMapView" | "TacticalGenerate", component: string, initial: Record<string, any>, resource: (path: string | null) => unknown = () => null) {
  const slots: any[] = [], jobs: Promise<unknown>[] = [];
  const requests: { path: string; body: any; method: string | undefined; resolve: (value: unknown) => void; reject: (error: Error) => void }[] = [];
  const confirmations: string[] = [];
  let cursor = 0, changed = false, effects: { i: number; fn: () => any }[] = [], props = initial, tree: any, alive = true, unmountedWrites = 0, acceptsDiscard = true;
  const same = (a: unknown[] | undefined, b: unknown[]) => a?.length === b.length && a.every((value, index) => Object.is(value, b[index]));
  const react = {
    useRef(value: unknown) { const i = cursor++; return slots[i] ??= { current: value }; },
    useState(initial: any) {
      const i = cursor++; slots[i] ??= { value: typeof initial === "function" ? initial() : initial };
      return [slots[i].value, (next: any) => {
        if (!alive) { unmountedWrites++; return; }
        const value = typeof next === "function" ? next(slots[i].value) : next;
        if (!Object.is(value, slots[i].value)) { slots[i].value = value; changed = true; }
      }];
    },
    useMemo(fn: () => unknown) { return fn(); },
    useCallback(fn: unknown, deps: unknown[]) { const i = cursor++; if (!slots[i] || !same(slots[i].deps, deps)) slots[i] = { fn, deps }; return slots[i].fn; },
    useEffect(fn: () => unknown, deps: unknown[]) { const i = cursor++; if (!slots[i] || !same(slots[i].deps, deps)) { slots[i] = { deps, cleanup: slots[i]?.cleanup }; effects.push({ i, fn }); } },
  };
  const task = { busy: false, error: "", run: (work: () => Promise<unknown>) => {
    task.busy = true; task.error = "";
    const job = work().catch(error => { task.error = String(error); }).finally(() => { task.busy = false; });
    jobs.push(job); return job;
  } };
  const element = (type: unknown, props: any) => ({ type, props }), mod = { exports: {} as any };
  const source = readFileSync(new URL(`../src/features/${file}.tsx`, import.meta.url), "utf8");
  const exported = source.includes(`export function ${component}(`) ? source : `${source}\nexport { ${component} };`;
  runInNewContext(transformSync(exported, { loader: "tsx", format: "cjs", jsx: "automatic" }).code, {
    module: mod, exports: mod.exports, crypto: { randomUUID: () => "test-seed-123456" },
    window: { confirm: (message: string) => { confirmations.push(message); return acceptsDiscard; } },
    require: (name: string) => {
      if (name === "react") return react;
      if (name === "react/jsx-runtime") return { jsx: element, jsxs: element, Fragment: "Fragment" };
      if (name === "@chronicle/szene") return { BAUWERK_TYPEN, BAUWERK_LABEL, KARTEN_SETTING_LABEL };
      if (name === "./map-generation") return Generation;
      if (name === "../hooks") return { useResource: (path: string | null) => ({ data: resource(path), loading: false, error: "" }), useTask: () => task };
      if (name === "./game-api") return { useCommand: () => (path: string, body: unknown, method?: string) => new Promise((resolve, reject) => { requests.push({ path, body, method, resolve, reject }); }) };
      if (name === "../api") return { apiPath: (campaign: string, path: string) => `/api/campaigns/${campaign}${path}` };
      return new Proxy({}, { get: (_target, key) => String(key) });
    },
  });
  function render() {
    if (!alive) throw new Error("Cannot render an unmounted review component");
    for (let repeat = 0; repeat < 30; repeat++) {
      cursor = 0; changed = false; effects = []; tree = mod.exports[component](props);
      for (const effect of effects) { slots[effect.i].cleanup?.(); slots[effect.i].cleanup = effect.fn(); }
      if (!changed) return tree;
    }
    throw new Error("Review component did not settle");
  }
  function nodes(predicate: (node: any) => boolean) {
    const found: any[] = [];
    const visit = (node: any) => { if (Array.isArray(node)) node.forEach(visit); else if (node?.props) { if (predicate(node)) found.push(node); visit(node.props.children); } };
    visit(render()); return found;
  }
  const text = (node: any): string => typeof node === "string" || typeof node === "number" ? String(node) : Array.isArray(node) ? node.map(text).join("") : node?.props ? text(node.props.children) : "";
  return { render, nodes, text, requests, confirmations,
    button: (label: string) => nodes(node => node.type === "Button" && text(node).trim() === label)[0]!,
    input: () => nodes(node => node.type === "input")[0]!,
    submit: () => nodes(node => node.type === "form")[0]!.props.onSubmit({ preventDefault() {} }),
    replace: (next: Record<string, any>) => { props = { ...props, ...next }; render(); },
    acceptDiscard: (value: boolean) => { acceptsDiscard = value; },
    release: async (index: number, value: unknown) => { requests[index]!.resolve(value); await jobs[index]; if (alive) render(); },
    fail: async (index: number, error: Error) => { requests[index]!.reject(error); await jobs[index]; if (alive) render(); },
    cleanup: () => { if (alive) { for (const slot of slots) slot?.cleanup?.(); alive = false; } },
    unmountedWrites: () => unmountedWrites,
  };
}

const church = { knotenId: "church", titel: "Alte Kapelle", art: "bauwerk", x: 100, y: 100, canEnter: true, vorhandeneKarteId: null, bauwerk: { typ: "kirche", beschreibung: "Am Marktplatz" } };
const defaults = { grundriss: { zellen: [40, 30], zellgroesse: 96, raeume: 8 }, hoehle: { zellen: [40, 30], zellgroesse: 96, kammern: 8 }, siedlung: { ausdehnung: [36, 28], zellgroesse: 96, bauwerke: 42 } };
const mapDocument = { geometry: { size: [300, 200], regions: [{ id: "church", punkte: [[50, 50], [150, 50], [150, 150], [50, 150]] }], places: [], stamps: [] }, grid: { kind: "none" }, walls: [], portals: [] };
const preview = { keimHash: "preview-one", art: "siedlung", groesse: [300, 200], document: mapDocument, nodes: [church], bauwerke: 1, strassen: 1, bericht: { nichtBedient: [] } };

describe("map workshop concurrency and navigation review", () => {
  it("submits the draft's original CAS version when another editor refreshes the parent", async () => {
    const h = harness("NestedMapView", "BuildingMetadata", { campaignId: "campaign", mapId: "city", node: church, version: 4, onDirty: () => {}, onChanged: () => {} });
    try {
      h.input().props.onChange({ target: { value: "Meine Kapelle" } });
      h.replace({ node: { ...church, titel: "Fremde Änderung" }, version: 5 });
      expect(h.input().props.value).toBe("Meine Kapelle"); h.submit();
      expect(h.requests[0]).toMatchObject({ method: "PUT", body: { expectedVersion: 4, titel: "Meine Kapelle", bauwerk: church.bauwerk } });
      await h.fail(0, new Error("Versionskonflikt"));
      expect(h.input().props.value).toBe("Meine Kapelle"); expect(h.text(h.render())).toContain("Versionskonflikt");
    } finally { h.cleanup(); }
  });

  it("retains acknowledged metadata and version when a delayed refresh carries older props", async () => {
    const changed = vi.fn(), h = harness("NestedMapView", "BuildingMetadata", { campaignId: "campaign", mapId: "city", node: church, version: 4, onDirty: () => {}, onChanged: changed });
    try {
      h.input().props.onChange({ target: { value: "  Neue Kapelle  " } }); h.submit();
      await h.release(0, { version: 5 });
      h.replace({ node: { ...church }, version: 4 });
      expect(h.input().props.value).toBe("Neue Kapelle"); expect(h.button("Metadaten speichern").props.disabled).toBe(true);
      h.input().props.onChange({ target: { value: "Kapelle des Morgens" } }); h.submit();
      expect(h.requests[1]!.body).toMatchObject({ expectedVersion: 5, titel: "Kapelle des Morgens" });
      await h.release(1, { version: 6 }); expect(changed).toHaveBeenCalledTimes(2);
    } finally { h.cleanup(); }
  });

  it("loads a concurrent metadata revision only after confirmed draft replacement", async () => {
    const h = harness("NestedMapView", "BuildingMetadata", { campaignId: "campaign", mapId: "city", node: church, version: 4, onDirty: () => {}, onChanged: () => {} });
    try {
      h.input().props.onChange({ target: { value: "Mein Entwurf" } });
      h.replace({ node: { ...church, titel: "Anderer Stand", bauwerk: { typ: "turm", beschreibung: "Neue Nutzung" } }, version: 7 });
      h.acceptDiscard(false); h.button("Aktuellen Stand übernehmen").props.onClick();
      expect(h.input().props.value).toBe("Mein Entwurf");
      h.acceptDiscard(true); h.button("Aktuellen Stand übernehmen").props.onClick();
      expect(h.input().props.value).toBe("Anderer Stand");
      expect(h.nodes(node => node.type === "select")[0]!.props.value).toBe("turm");
      h.input().props.onChange({ target: { value: "Mein neuer Entwurf" } }); h.submit();
      expect(h.requests[0]!.body.expectedVersion).toBe(7); await h.release(0, { version: 8 });
    } finally { h.cleanup(); }
  });

  it("does not update an unmounted metadata form after its save completes", async () => {
    const changed = vi.fn(), h = harness("NestedMapView", "BuildingMetadata", { campaignId: "campaign", mapId: "city", node: church, version: 4, onDirty: () => {}, onChanged: changed });
    h.input().props.onChange({ target: { value: "Abgeschlossene Kapelle" } }); h.submit(); h.cleanup();
    await h.release(0, { version: 5 });
    expect(h.unmountedWrites()).toBe(0); expect(changed).not.toHaveBeenCalled();
  });

  it("removes a completed preview when settings change, then renders only the new result", async () => {
    const h = harness("TacticalGenerate", "TacticalGenerate", { campaignId: "campaign", onCreated: () => {} }, path => path?.endsWith("/defaults") ? defaults : null);
    try {
      h.input().props.onChange({ target: { value: "Neue Stadt" } });
      expect(h.button("Erzeugen und speichern").props.disabled).toBe(true);
      h.button("Erzeugen und speichern").props.onClick(); expect(h.requests).toHaveLength(0);
      h.submit(); await h.release(0, preview);
      expect(h.nodes(node => node.type === "TacticalCanvas")[0]!.props.scene.id).toBe("preview:preview-one");
      expect(h.button("Erzeugen und speichern").props.disabled).toBe(false);
      const controls = h.nodes(node => node.type === "MapGenerationControls")[0]!;
      controls.props.onChange({ ...controls.props.value, breite: 60, stil: "grundriss" });
      expect(h.nodes(node => node.type === "TacticalCanvas")).toHaveLength(0);
      expect(h.button("Erzeugen und speichern").props.disabled).toBe(true);
      h.button("Erzeugen und speichern").props.onClick(); expect(h.requests).toHaveLength(1);
      h.submit(); expect(h.requests[1]!.body).toMatchObject({ stil: "grundriss", optionen: { ausdehnung: [60, 28] } });
      await h.release(1, { ...preview, keimHash: "preview-two" });
      expect(h.nodes(node => node.type === "TacticalCanvas")[0]!.props.scene.id).toBe("preview:preview-two");
    } finally { h.cleanup(); }
  });

  it("reports settings-only and seed-only drafts, clears reverted edits and resets after a saved preview", async () => {
    const dirty = vi.fn(), created = vi.fn();
    const h = harness("TacticalGenerate", "TacticalGenerate", { campaignId: "campaign", onCreated: created, onDirty: dirty }, path => path?.endsWith("/defaults") ? defaults : null);
    try {
      h.render(); expect(dirty).toHaveBeenLastCalledWith(false);
      const original = h.nodes(node => node.type === "MapGenerationControls")[0]!.props.value;
      h.nodes(node => node.type === "MapGenerationControls")[0]!.props.onChange({ ...original, setting: "scifi", stil: "zeitwelten", licht: false });
      h.render(); expect(dirty).toHaveBeenLastCalledWith(true);
      h.nodes(node => node.type === "MapGenerationControls")[0]!.props.onChange(original);
      h.render(); expect(dirty).toHaveBeenLastCalledWith(false);
      h.nodes(node => node.type === "input" && node.props.maxLength === 256)[0]!.props.onChange({ target: { value: "edited-world-seed" } });
      h.render(); expect(dirty).toHaveBeenLastCalledWith(true);
      h.input().props.onChange({ target: { value: "Gespeicherte Stadt" } });
      h.submit(); await h.release(0, preview);
      h.button("Erzeugen und speichern").props.onClick();
      expect(h.requests[1]!.body.keim).toBe("edited-world-seed");
      await h.release(1, { ack: { subjectId: "saved-city" } });
      expect(created).toHaveBeenCalledWith("saved-city");
      expect(dirty).toHaveBeenLastCalledWith(false);
      expect(h.input().props.value).toBe("");
      expect(h.nodes(node => node.type === "TacticalCanvas")).toHaveLength(0);
      expect(h.button("Erzeugen und speichern").props.disabled).toBe(true);
    } finally { h.cleanup(); }
  });

  it("rejects a held preview from a previous campaign and ignores completion after unmount", async () => {
    const h = harness("TacticalGenerate", "TacticalGenerate", { campaignId: "old-campaign", onCreated: () => {} }, path => path?.endsWith("/defaults") ? defaults : null);
    h.input().props.onChange({ target: { value: "Neue Stadt" } }); h.submit();
    h.replace({ campaignId: "new-campaign" }); await h.release(0, preview);
    expect(h.nodes(node => node.type === "TacticalCanvas")).toHaveLength(0);
    h.submit(); expect(h.requests[1]!.path).toContain("/new-campaign/"); h.cleanup();
    await h.release(1, { ...preview, keimHash: "preview-two" }); expect(h.unmountedWrites()).toBe(0);
  });

  it("keeps an unsaved building selection when navigation discard is declined", () => {
    const house = { ...church, knotenId: "house", titel: "Haus am Tor", bauwerk: { typ: "haus", beschreibung: "" }, x: 220, vorhandeneKarteId: "saved-interior" };
    const navigate = vi.fn(), h = harness("NestedMapView", "NestedMapView", { campaignId: "campaign", mapId: "city", revision: 1, onNavigate: navigate, onRoot: () => {}, onChanged: () => {}, onDirty: () => {} }, path => path?.endsWith("/children") ? { nodes: [church, house], version: 4, ancestors: [], art: "siedlung" } : { id: "city", name: "Stadt", revision: 1, document: mapDocument });
    try {
      h.nodes(node => node.type === "TacticalCanvas")[0]!.props.onSelect({ kind: "cell", id: "church" });
      h.nodes(node => node.type?.name === "BuildingMetadata")[0]!.props.onDirty(true);
      h.acceptDiscard(false); h.nodes(node => node.type === "TacticalCanvas")[0]!.props.onSelect({ kind: "pin", id: "house" });
      expect(navigate).not.toHaveBeenCalled();
      expect(h.nodes(node => node.type === "TacticalCanvas")[0]!.props.selection).toEqual({ kind: "pin", id: "church" });
      h.acceptDiscard(true); h.nodes(node => node.type === "TacticalCanvas")[0]!.props.onSelect({ kind: "pin", id: "house" });
      expect(navigate).toHaveBeenCalledWith({ kind: "tactical", id: "saved-interior", title: house.titel });
    } finally { h.cleanup(); }
  });

  it("opens an existing interior without submitting generation options or a new command", () => {
    const opened = vi.fn(), h = harness("NestedMapView", "MapEntrance", { campaignId: "campaign", parentKind: "tactical", parentMapId: "city", nodeId: "church", title: church.titel, version: 8, canEnter: true, childMapId: "existing-interior", profil: "kirche", onOpen: opened, onChanged: () => {} });
    try {
      h.button("Unterkarte öffnen").props.onClick();
      expect(opened).toHaveBeenCalledWith("existing-interior"); expect(h.requests).toHaveLength(0);
    } finally { h.cleanup(); }
  });
});
