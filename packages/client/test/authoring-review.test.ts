import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { transformSync } from "esbuild";
import { describe, expect, it } from "vitest";
import * as Theme from "../../theme/src/index.ts";

/** Actual ThemeWorkbench handlers/effects, with controlled transport and hook scheduling.
 * The isolated VM's plain objects are bridged into the pure parser's own realm; its
 * real closed parser, preset data, contrast evaluation and resolver are retained. */
function themeHarness() {
  const slots: any[] = [], commands: { path: string; body: any; method: string }[] = [], jobs: Promise<unknown>[] = [];
  let cursor = 0, changed = false, effects: { i: number; fn: () => any }[] = [], tree: any, headVersion = 1, catalogFailure: 404 | 503 | null = null;
  const dirtyReports: boolean[] = [];
  const same = (a: unknown[] | undefined, b: unknown[]) => a?.length === b.length && a.every((value, i) => Object.is(value, b[i]));
  const react = {
    useRef(initial: unknown) { const i = cursor++; return slots[i] ??= { current: initial }; },
    useState(initial: any) {
      const i = cursor++; slots[i] ??= { value: typeof initial === "function" ? initial() : initial };
      return [slots[i].value, (next: any) => { const value = typeof next === "function" ? next(slots[i].value) : next; if (!Object.is(value, slots[i].value)) { slots[i].value = value; changed = true; } }];
    },
    useMemo(fn: () => unknown) { return fn(); },
    useCallback(fn: unknown, deps: unknown[]) { const i = cursor++; if (!slots[i] || !same(slots[i].deps, deps)) slots[i] = { fn, deps }; return slots[i].fn; },
    useEffect(fn: () => unknown, deps: unknown[]) { const i = cursor++; if (!slots[i] || !same(slots[i].deps, deps)) { slots[i] = { deps, cleanup: slots[i]?.cleanup }; effects.push({ i, fn }); } },
  };
  let release!: (ack: { subjectId: string; version: number }) => void;
  const heldAck = new Promise<{ subjectId: string; version: number }>(resolve => { release = resolve; });
  const manifest = { ...Theme.getThemePreset("Fantasy"), name: "Author A revision one" };
  const card = (revision: number) => ({ id: "theme", revision, version: headVersion, manifest: revision === 1 ? manifest : { ...manifest, name: "Author B concurrent revision" }, contentHash: "test-only-transport", accessibilityReport: Theme.evaluateThemeAccessibility(manifest) });
  const bridge = (value: unknown) => JSON.parse(JSON.stringify(value));
  const element = (type: unknown, props: unknown) => ({ type, props }), mod = { exports: {} as any };
  const source = transformSync(readFileSync(new URL("../src/features/ThemeWorkbench.tsx", import.meta.url), "utf8"), { loader: "tsx", format: "cjs", jsx: "automatic" }).code;
  const props = { campaign: { id: "campaign", name: "Campaign", role: "leitung" }, liveRevision: 0, onDirty: (dirty: boolean) => dirtyReports.push(dirty), onChanged: () => {} };
  runInNewContext(source, {
    module: mod, exports: mod.exports, window: { confirm: () => true },
    require: (name: string) => {
      if (name === "react") return react;
      if (name === "react/jsx-runtime") return { jsx: element, jsxs: element, Fragment: "Fragment" };
      if (name === "@chronicle/theme") return { ...Theme,
        parseThemeManifest: (input: unknown) => Theme.parseThemeManifest(typeof input === "string" ? input : bridge(input)),
        evaluateThemeAccessibility: (input: unknown) => Theme.evaluateThemeAccessibility(bridge(input)),
        resolveTheme: (input: unknown, preferences: unknown, system: unknown) => Theme.resolveTheme(bridge(input), bridge(preferences), bridge(system)),
      };
      if (name === "./Appearance") return { appearanceStyle: () => ({}), useAppearance: () => ({ preferences: Theme.DEFAULT_ACCESSIBILITY_PREFERENCES, system: {} }) };
      if (name === "../hooks") return { useTask: () => ({ busy: false, error: "", setError: () => {}, run: (fn: () => Promise<unknown>) => { const job = fn(); jobs.push(job); return job; } }),
        useResource: (path: string) => path.endsWith("/themes") ? {
          data: catalogFailure === 404 ? null : headVersion > 1 ? [card(headVersion)] : [],
          loaded: catalogFailure !== 404, loading: false, error: catalogFailure === null ? "" : catalogFailure === 404 ? "Nicht gefunden" : "Vorübergehend nicht erreichbar",
        } : { data: { pin: null, manifest: Theme.PUBLIC_DEFAULT_THEME }, loaded: true, loading: false, error: "" },
      };
      if (name === "./game-api") return { useCommand: () => async (path: string, body: unknown, method: string) => {
        commands.push({ path, body, method }); return commands.length === 1 ? heldAck : { subjectId: "theme", version: 3 };
      } };
      if (name === "../api") return { apiPath: (campaign: string, suffix: string) => `/api/campaigns/${campaign}${suffix}`, errorText: (error: Error) => error.message,
        api: async (path: string) => card(Number(new URL(path, "https://test.invalid").searchParams.get("revision"))),
      };
      return new Proxy({}, { get: (_target, key) => String(key) });
    },
  });
  function render() {
    for (let attempts = 0; attempts < 25; attempts++) {
      cursor = 0; changed = false; effects = []; tree = mod.exports.ThemeWorkbench(props);
      for (const effect of effects) { slots[effect.i].cleanup?.(); slots[effect.i].cleanup = effect.fn(); }
      if (!changed) return tree;
    }
    throw new Error("ThemeWorkbench did not settle");
  }
  function nodes(predicate: (node: any) => boolean) {
    const found: any[] = [];
    const visit = (node: any) => { if (Array.isArray(node)) node.forEach(visit); else if (node?.props) { if (predicate(node)) found.push(node); visit(node.props.children); } };
    visit(render()); return found;
  }
  const text = (node: any): string => typeof node === "string" ? node : Array.isArray(node) ? node.map(text).join("") : node?.props ? text(node.props.children) : "";
  return { commands, dirtyReports, render, nodes,
    name: () => nodes(node => node.type === "input" && node.props.maxLength === 100)[0],
    button: (label: string) => nodes(node => node.type === "Button" && text(node) === label)[0],
    concurrentHead: () => { headVersion = 2; },
    failCatalog: (status: 404 | 503) => { catalogFailure = status; },
    release: () => release({ subjectId: "theme", version: 1 }),
    settle: async () => { await Promise.all(jobs); render(); },
    cleanup: () => { for (const slot of slots) slot?.cleanup?.(); },
  };
}

describe("independent authoring acknowledgement review", () => {
  it("does not bind an acknowledged old theme manifest to a concurrent newer head CAS", async () => {
    const h = themeHarness();
    try {
      h.name().props.onChange({ target: { value: "Author A revision one" } });
      h.button("Als neues Theme speichern").props.onClick();
      expect(h.commands).toHaveLength(1);
      // A succeeded as revision1; while its response was held, another GM created
      // revision2. The real revision GET contract returns revision1 + current version2.
      h.concurrentHead(); h.release(); await h.settle();
      expect(h.name().props.value).toBe("Author A revision one");
      h.name().props.onChange({ target: { value: "A new edit from A's acknowledged content" } });
      const save = h.button("Neue Revision speichern");
      if (!save.props.disabled) { save.props.onClick(); await h.settle(); }
      // Blocking this stale save is also safe. If offered, it must conflict against
      // acknowledged version1, requiring an explicit load of B before using version2.
      if (h.commands.length > 1) expect(h.commands[1]!.body.expectedVersion).toBe(1);
      expect(h.dirtyReports).toContain(true);
    } finally { h.cleanup(); }
  });

  it.each([503, 404] as const)("%i refresh retains a transient draft but removes private authoring controls after terminal denial", status => {
    const h = themeHarness();
    try {
      h.concurrentHead();
      h.nodes(node => node.type === "Button" && node.props["aria-pressed"] !== undefined)[0]!.props.onClick();
      expect(h.name().props.value).toBe("Author B concurrent revision");
      h.name().props.onChange({ target: { value: "Private unpublished authoring draft" } });
      h.failCatalog(status);
      const names = h.nodes(node => node.type === "input" && node.props.maxLength === 100);
      if (status === 503) {
        expect(names).toHaveLength(1); expect(names[0]!.props.value).toBe("Private unpublished authoring draft");
        expect(h.dirtyReports.at(-1)).toBe(true);
      } else {
        expect(names).toHaveLength(0);
        expect(JSON.stringify(h.render())).not.toContain("Private unpublished authoring draft");
        expect(JSON.stringify(h.render())).not.toContain("Author B concurrent revision");
      }
    } finally { h.cleanup(); }
  });

  it.each(["PixelArt", "Medieval"] as const)("the %s preview carries its own full recipe instead of inheriting the shell recipe", preset => {
    const h = themeHarness();
    try {
      h.button(`Vorlage ${preset}`).props.onClick();
      const preview = h.nodes(node => node.props.className?.split(" ").includes("theme-preview"))[0]!;
      const recipe = Theme.resolveTheme(Theme.getThemePreset(preset));
      // This is the actual component-to-CSS scope seam. Painted selector precedence,
      // geometry, image sampling and transitions still require root's browser check.
      expect(preview.props["data-appearance-edges"]).toBe(recipe.geometry.edges);
      expect(preview.props["data-appearance-icons"]).toBe(recipe.geometry.icons);
      expect(preview.props["data-appearance-sampling"]).toBe(recipe.sampling);
      expect(preview.props["data-appearance-motion"]).toBe(recipe.motion.cadence);
      expect(preview.props["data-appearance-atmosphere"]).toBe(recipe.atmosphere);
    } finally { h.cleanup(); }
  });
});
