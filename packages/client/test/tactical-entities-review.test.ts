// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { transformSync } from "esbuild";
import { describe, expect, it } from "vitest";
import * as Entities from "../src/features/tactical-entities.ts";
import * as MapGeneration from "../src/features/map-generation.ts";
import * as MapArtwork from "../src/features/map-artwork.ts";
import { I18nStub } from "../src/i18n.ts";
import * as MapStudio from "../src/features/map-studio.ts";
import * as MapEditHistory from "../src/features/map-edit-history.ts";
import { mapToolSettings } from "../src/features/MapEditTools.tsx";
import * as Szene from "@chronicle/szene";
import * as Render from "@chronicle/render";
import * as Forge from "@chronicle/forge";

/** Runs the actual component handlers/effects with controlled resource responses.
 * No DOM/WebGL emulation: canvas assertions concern the real renderer input contract. */
function harness(file: string, component: string, initial: Record<string, any>, resource: (path: string | null) => any = path => ({ data: path ? [] : null, loading: false, error: "" }), mocks: Record<string, unknown> = {}, confirm: () => boolean = () => true) {
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
    useMemo(fn: () => unknown, deps: unknown[]) { const i = cursor++; if (!slots[i] || !same(slots[i].deps, deps)) slots[i] = { value: fn(), deps }; return slots[i].value; },
    useEffect(fn: () => unknown, deps: unknown[]) { const i = cursor++; if (!slots[i] || !same(slots[i].deps, deps)) { slots[i] = { deps, cleanup: slots[i]?.cleanup }; effects.push({ i, fn }); } },
    useLayoutEffect(fn: () => unknown, deps: unknown[]) { const i = cursor++; if (!slots[i] || !same(slots[i].deps, deps)) { slots[i] = { deps, cleanup: slots[i]?.cleanup }; effects.push({ i, fn }); } },
  };
  const element = (type: unknown, props: any) => { if (type === "div" && props.ref) props.ref.current = { clientWidth: 100, clientHeight: 100 }; return { type, props }; }, mod = { exports: {} as any };
  const actual = readFileSync(new URL(`../src/features/${file}.tsx`, import.meta.url), "utf8");
  const extra = component === file || actual.includes(`export function ${component}(`) ? "" : `\nexport { ${component} };`;
  runInNewContext(transformSync(actual + extra, { loader: "tsx", format: "cjs", jsx: "automatic" }).code, {
    module: mod, exports: mod.exports, AbortController, setTimeout: () => 1, clearTimeout: () => {}, crypto: { randomUUID: () => "new-place" }, window: { confirm, devicePixelRatio: 1 },
    document: { fullscreenElement: null, fullscreenEnabled: false, addEventListener() {}, removeEventListener() {} },
    require: (name: string) => {
      if (name in mocks) return mocks[name];
      if (name === "../i18n" || name === "./i18n" || name === "../../i18n") return I18nStub;
      if (name === "react") return react;
      if (name === "react/jsx-runtime") return { jsx: element, jsxs: element, Fragment: "Fragment" };
      if (name === "./tactical-entities") return Entities;
      if (name === "./map-generation") return MapGeneration;
      if (name === "./map-artwork") return MapArtwork;
      if (name === "./map-studio") return MapStudio;
      if (name === "./map-edit-history") return MapEditHistory;
      if (name === "./MapEditTools") return { MapEditTools: "MapEditTools", mapToolSettings };
      if (name === "@chronicle/render") return Render;
      if (name === "@chronicle/forge") return Forge;
      if (name === "../hooks") return { useResource: resource, useTask: () => ({ busy: false, error: "", run: (fn: () => unknown) => fn() }) };
      if (name === "./game-api") return { useCommand: () => async () => ({ subjectId: "subject", version: 2 }) };
      if (name === "../api") return { apiPath: (id: string, suffix: string) => `/api/campaigns/${id}${suffix}`, plainText: () => "Passage" };
      if (name === "@chronicle/szene") return { ...Szene, TACTICAL_MAP_LIMITS: { places: 20_000, stamps: 50_000 } };
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
// The editor now validates every opened document (inferLegacyCartography → parseTacticalMapDocument),
// so the fixture must be a complete, closed tactical map rather than a partial shape.
const document = Szene.parseTacticalMapDocument({ schemaVersion: 1, kind: "tactical-map", coordinates: "image-pixels", frame: { ursprung: [0, 0], einheitenProPixel: 1, ordnung: "xy", hoch: "unten" },
  geometry: { v: 3, size: [100, 100], places: [{ id: "outside", x: -1, y: 10 }], stamps: [{ id: "inside", a: "pk.private/chest", x: 20, y: 20, s: 1, r: 0, l: 0 }], regions: [] },
  grid: { kind: "none" }, elevation: 0, geometryElevation: [], walls: [], portals: [], lights: [], environment: { bakedLighting: false, ambientLightArgb: "ffffffff" }, background: null });
const map = { id: "map", name: "Map", revision: 1, version: 1, contentHash: "map-one", document, anchors: [] };
const board = { gm: true, sessionId: "session", size: [100, 100], entities: objects, regions: [], tokens: [], grid: { kind: "none" }, rasterDigest: "raster", undoTargets: [], portals: [], elevation: 0, active: true };

describe("independent tactical entity client review", () => {
  it("renders the GM's pinned city footprints and artwork without replacing authorized object markers", () => {
    const church = { knotenId: "church", titel: "Kapelle am Markt", art: "bauwerk", x: 50, y: 50, bauwerk: { typ: "kirche", beschreibung: "Privater Spielleitungsentwurf" } };
    const pinned = { ...document, geometry: { ...document.geometry, regions: [{ id: "church", punkte: [[20, 20], [80, 20], [80, 80], [20, 80]] }] } };
    const response = { ...board, map: { id: "city", name: "Stadt", revision: 2 }, document: pinned, walls: [] };
    const paths: (string | null)[] = [];
    const h = harness("TacticalView", "LiveBoard", { campaignId: "campaign", gm: true, revision: 1, ...callbacks }, path => {
      paths.push(path); return { data: path?.endsWith("/tactical/active") ? response : { nodes: [church], art: "siedlung" }, loading: false, error: "" };
    });
    try {
      const rendered = h.nodes(node => node.type === "TacticalCanvas")[0]!.props.scene;
      expect(paths).toContain("/api/campaigns/campaign/maps/tactical/city/children");
      expect(rendered.cells).toEqual([{ id: "church", polygon: pinned.geometry.regions[0]!.punkte, surface: "building", roof: "pitched", fill: MapGeneration.BUILDING_COLORS.kirche, label: church.titel }]);
      expect(rendered.stamps).toEqual([{ id: "inside", asset: "pk.private/chest", x: 20, y: 20, s: 1, r: 0, l: 0 }]);
      expect(rendered.pins).toEqual([{ id: "stamp:inside", x: 20, y: 20, label: objects[1]!.label, entryId: "entry" }]);
      expect(rendered.id).toBe(board.sessionId);
    } finally { h.cleanup(); }
  });

  it("ignores forged GM documents and cached building metadata in a player projection without requesting private nodes", () => {
    const secret = { knotenId: "secret-church", titel: "Geheime Kapelle", art: "bauwerk", x: 50, y: 50, bauwerk: { typ: "kirche", beschreibung: "Unsichtbares Geheimnis" } };
    const knownRegion = { id: "public-road", points: [[0, 0], [10, 0], [10, 10]] };
    const response = { ...board, gm: false, entities: [], regions: [knownRegion], map: { id: "city", name: "Stadt" },
      document: { ...document, geometry: { ...document.geometry, regions: [{ id: secret.knotenId, punkte: [[20, 20], [80, 20], [80, 80]] }] } },
      walls: [{ id: "private-wall", points: [[20, 20], [80, 20]] }],
    };
    const paths: (string | null)[] = [];
    const h = harness("TacticalView", "LiveBoard", { campaignId: "campaign", gm: false, revision: 1, ...callbacks }, path => {
      paths.push(path);
      // Even a retained/forged hook response at the disabled path cannot promote this player.
      return { data: path?.endsWith("/tactical/active") ? response : { nodes: [secret], art: "siedlung" }, loading: false, error: "" };
    });
    try {
      const rendered = h.nodes(node => node.type === "TacticalCanvas")[0]!.props.scene;
      expect(paths.filter(path => path?.includes("/children"))).toHaveLength(0);
      expect(rendered.cells).toEqual([{ id: knownRegion.id, polygon: knownRegion.points, fill: 0xd98e3b }]);
      expect(rendered.stamps).toBeUndefined(); expect(rendered.pins).toHaveLength(0); expect(rendered.lines).toHaveLength(0);
      const output = JSON.stringify(rendered); expect(output).not.toContain("pk.private"); expect(output).not.toContain(secret.titel); expect(output).not.toContain(secret.knotenId);
    } finally { h.cleanup(); }
  });

  it("drops private artwork and stops node requests immediately after the current GM role is revoked", () => {
    const response = { ...board, map: { id: "city", name: "Stadt" }, document };
    const paths: (string | null)[] = [];
    const h = harness("TacticalView", "LiveBoard", { campaignId: "campaign", gm: true, revision: 1, ...callbacks }, path => {
      paths.push(path); return { data: path?.endsWith("/tactical/active") ? response : { nodes: [], art: "siedlung" }, loading: false, error: "" };
    });
    try {
      expect(h.nodes(node => node.type === "TacticalCanvas")[0]!.props.scene.stamps).toHaveLength(1);
      paths.length = 0; h.replace({ gm: false });
      expect(h.nodes(node => node.type === "TacticalCanvas")).toHaveLength(0);
      expect(paths.filter(path => path?.includes("/children"))).toHaveLength(0);
    } finally { h.cleanup(); }
  });

  it("selects a named city building from its footprint and preserves its region knowledge binding", () => {
    const church = { knotenId: "church", titel: "Kapelle am Markt", art: "bauwerk", x: 50, y: 50, bauwerk: { typ: "kirche", beschreibung: "Ein stiller Ort." } };
    const cityDocument = { ...document, geometry: { ...document.geometry, regions: [{ id: church.knotenId, punkte: [[20, 20], [80, 20], [80, 80], [20, 80]] }] } };
    // The server always ships legacy cartography inferred with the stored nodes (tactical.ts); the editor trusts it over node evidence.
    const current = { ...map, document: cityDocument, legacyCartography: Szene.inferLegacyCartography(cityDocument, { nodes: [{ id: church.knotenId, art: "bauwerk" }] }),
      anchors: [{ targetKind: "region", targetId: church.knotenId, entryId: "entry", passageId: "passage" }] };
    const h = harness("MapEditor", "MapEditor", { current, campaignId: "campaign", ...callbacks }, path => ({
      data: !path ? null : path.endsWith("/children") ? { nodes: [church], art: "siedlung" } : path.endsWith("/entries/entry") ? { passagen: [] } : [], loading: false, error: "",
    }));
    try {
      h.nodes(node => node.type === "TacticalCanvas")[0]!.props.onSelect({ kind: "cell", id: church.knotenId });
      const canvas = h.nodes(node => node.type === "TacticalCanvas")[0]!;
      // The studio highlights the selected footprint itself; the node pin stays in the scene for the label.
      expect(canvas.props.selection).toEqual({ kind: "cell", id: church.knotenId });
      expect(canvas.props.scene.cells[0]).toMatchObject({ id: "church", surface: "building" });
      expect(canvas.props.scene.pins.find((pin: any) => pin.id === "node:church")).toMatchObject({ label: church.titel });
      expect(h.nodes(node => node.type === "select").slice(0, 3).map(node => node.props.value)).toEqual(["church", "entry", "passage"]);
      expect(h.text(h.render())).toContain(church.titel);
    } finally { h.cleanup(); }
  });

  it("names the revision being edited next to the button that saves one", () => {
    const h = harness("MapEditor", "MapEditor", { current: { ...map, revision: 7 }, campaignId: "campaign", ...callbacks });
    try {
      // The rework of 2026-09-08 replaced this line with the studio tagline. The heading then
      // offered "Kartenrevision speichern" beside nothing that said which revision was open,
      // and the desktop smoke lost its user-visible proof that a save had landed.
      const heading = h.nodes(node => node.props?.className === "page-heading")[0]!;
      expect(h.text(heading)).toContain("Kartenrevision 7.");
      expect(h.text(heading)).toContain("Kartenrevision speichern");
    } finally { h.cleanup(); }
  });

  it("resets an unsaved grid change and unfinished region to the saved document", () => {
    const h = harness("MapEditor", "MapEditor", { current: map, campaignId: "campaign", ...callbacks });
    try {
      h.nodes(node => node.type === "select" && node.props["aria-label"] === "Kartenraster")[0]!.props.onChange({ target: { value: "square" } });
      h.nodes(node => node.type === "Button" && h.text(node) === "Region zeichnen")[0]!.props.onClick();
      h.nodes(node => node.type === "TacticalCanvas")[0]!.props.onPoint([10, 10]);
      const reset = h.nodes(node => node.type === "Button" && h.text(node) === "Entwurf zurücksetzen")[0]!;
      expect(reset.props.disabled).toBe(false); reset.props.onClick();
      expect(h.nodes(node => node.type === "select" && node.props["aria-label"] === "Kartenraster")[0]!.props.value).toBe("none");
      expect(h.nodes(node => node.type === "Button" && h.text(node) === "Entwurf zurücksetzen")[0]!.props.disabled).toBe(true);
      expect(h.nodes(node => node.type === "TacticalCanvas")[0]!.props.scene.lines).toHaveLength(0);
    } finally { h.cleanup(); }
  });

  it("places real catalogue artwork and removes only that stamp's knowledge and elevation references", () => {
    const current = { ...map, document: { ...document, geometryElevation: [{ targetKind: "stamp", targetId: "inside", elevation: 2 }, { targetKind: "place", targetId: "outside", elevation: 3 }] },
      anchors: [{ targetKind: "stamp", targetId: "inside", entryId: "entry", passageId: null }, { targetKind: "place", targetId: "outside", entryId: "entry", passageId: null }] };
    const h = harness("MapEditor", "MapEditor", { current, campaignId: "campaign", ...callbacks });
    const palette = () => h.nodes(node => node.type === "MapArtworkPalette")[0]!.props;
    const tools = () => h.nodes(node => node.type === "MapEditTools")[0]!.props;
    try {
      // A grid-less legacy map gets a 100 px construction cell, so a snapped click on this
      // 100 × 100 fixture would land on the corner. Placement position is not what this case checks.
      tools().onChange({ ...tools().value, snap: false });
      palette().onBrush({ packId: "pk.zeitwelten", cellSize: 64, asset: { name: "schreibtisch", groesse: [20, 20], art: "moebel", schlagworte: ["schreibtisch"] } });
      h.nodes(node => node.type === "TacticalCanvas")[0]!.props.onPoint([40, 40]);
      expect(palette().document.geometry.stamps).toHaveLength(2);
      expect(palette().document.geometry.stamps[1]).toMatchObject({ a: "pk.zeitwelten/schreibtisch", x: 40, y: 40 });
      palette().onRemove("inside");
      expect(palette().document.geometry.stamps.map((stamp: any) => stamp.id)).toEqual(["new-place"]);
      expect(palette().document.geometryElevation).toEqual([{ targetKind: "place", targetId: "outside", elevation: 3 }]);
      expect(h.nodes(node => node.type === "TacticalEntitiesEditor")[0]!.props.anchors).toEqual([current.anchors[1]]);
      h.nodes(node => node.type === "Button" && h.text(node) === "Entwurf zurücksetzen")[0]!.props.onClick();
      expect(palette().document).toEqual(current.document); expect(palette().brush).toBeNull();
    } finally { h.cleanup(); }
  });

  it("switches from an artwork brush to region drawing when adding a numeric corner", () => {
    const h = harness("MapEditor", "MapEditor", { current: map, campaignId: "campaign", ...callbacks });
    const palette = () => h.nodes(node => node.type === "MapArtworkPalette")[0]!.props;
    try {
      palette().onBrush({ packId: "pk.zeitwelten", cellSize: 64, asset: { name: "schreibtisch", groesse: [20, 20], art: "moebel", schlagworte: ["schreibtisch"] } });
      h.nodes(node => node.type === "Button" && h.text(node) === "Eckpunkt hinzufügen")[0]!.props.onClick();
      h.nodes(node => node.type === "TacticalCanvas")[0]!.props.onPoint([40, 40]);
      expect(palette().document.geometry.stamps).toEqual(document.geometry.stamps);
      expect(palette().brush).toBeNull();
      expect(h.nodes(node => node.type === "TacticalCanvas")[0]!.props.scene.lines).toContainEqual({ id: "draft-region", points: [[0, 0], [40, 40]], color: 0xffffff });
    } finally { h.cleanup(); }
  });

  it("opens generation by default, selects the saved result and keeps the editor when discarding its draft is declined", () => {
    let allowDiscard = false;
    const h = harness("TacticalPreparation", "TacticalPreparation", { campaignId: "campaign", revision: 1, ...callbacks }, path => ({
      data: path?.endsWith("/tactical/maps") ? [map] : path?.endsWith("/tactical/maps/map") ? map : null, loading: false, error: "",
    }), {}, () => allowDiscard);
    try {
      expect(h.nodes(node => node.type === "TacticalGenerate")).toHaveLength(1);
      h.nodes(node => node.type === "TacticalGenerate")[0]!.props.onCreated("map");
      expect(h.nodes(node => node.type === "TacticalGenerate")).toHaveLength(0);
      expect(h.nodes(node => node.type === "MapLibrary")[0]!.props.selected).toEqual({ kind: "tactical", id: "map" });
      h.nodes(node => node.type === "MapEditor")[0]!.props.onDirty(true);
      h.nodes(node => node.type === "Button" && h.text(node) === "Neue Karte erzeugen")[0]!.props.onClick();
      expect(h.nodes(node => node.type === "TacticalGenerate")).toHaveLength(0);
      expect(h.nodes(node => node.type === "MapEditor")).toHaveLength(1);
      allowDiscard = true;
      h.nodes(node => node.type === "Button" && h.text(node) === "Neue Karte erzeugen")[0]!.props.onClick();
      expect(h.nodes(node => node.type === "TacticalGenerate")).toHaveLength(1);
      expect(h.nodes(node => node.type === "MapEditor")).toHaveLength(0);
    } finally { h.cleanup(); }
  });

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
      : harness("MapEditor", "MapEditor", { current: map, campaignId: "campaign", ...callbacks });
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
      : harness("MapEditor", "MapEditor", { current: currentMap, campaignId: "campaign", ...callbacks });
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
