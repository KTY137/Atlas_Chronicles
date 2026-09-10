// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { describe, expect, it } from "vitest";
import type { TacticalCartographyV1 } from "@chronicle/szene";
import type { ProjectedMapScene } from "@chronicle/render";
import { applyLayers, blockedRegionIds, layerBlocked, layerOfRegion, layerView, MAP_LAYERS, mapLayerLabel, mapLayerState, toggleLayer } from "../src/features/map-layers.ts";

const base = { authored: false, locked: false, provenance: null } as const;
const cartography: TacticalCartographyV1 = { schemaVersion: 1, kind: "tactical-cartography", construction: { cellSize: 64, origin: [0, 0] }, regions: [
  { ...base, regionId: "meadow", role: "terrain", material: "grass" }, { ...base, regionId: "pond", role: "water", material: "lake" }, { ...base, regionId: "lane", role: "road", material: "path" },
  { ...base, regionId: "yard", role: "lot" }, { ...base, regionId: "barn", role: "building" }, { ...base, regionId: "hall", role: "room" }, { ...base, regionId: "unknown", role: "generic" },
] };
const scene: ProjectedMapScene = { id: "s", width: 100, height: 100, cells: [], pins: [{ id: "p", x: 1, y: 1, label: "Hof" }], title: "Hof", grid: { kind: "square", size: 64, origin: [0, 0] },
  stamps: [{ id: "t", asset: "pk.gemalt/tisch", x: 5, y: 5, s: 1, r: 0, l: 0 }], lights: [{ id: "l", x: 5, y: 5, range: 10 }], lines: [{ id: "w", points: [[0, 0], [1, 1]] }] };

describe("the layer panel: hide while working, lock when done, never saved", () => {
  it("names every row in plain words and knows which rows the tools can change", () => {
    for (const layer of MAP_LAYERS) expect(mapLayerLabel(layer.id)).toMatch(/\S/);
    expect(MAP_LAYERS.filter(layer => layer.lockable).map(layer => layer.id)).toEqual(["einrichtung", "waende", "gebaeude", "raeume", "grundstuecke", "wege", "wasser", "gelaende"]);
    expect(MAP_LAYERS.filter(layer => layer.relief).map(layer => layer.id)).toEqual(["hoehenlinien", "schattierung"]);
  });
  it("toggles hidden and locked independently and blocks a layer for either reason", () => {
    let state = mapLayerState();
    expect(layerBlocked(state, "wasser")).toBe(false);
    state = toggleLayer(state, "wasser", "hidden"); expect(layerBlocked(state, "wasser")).toBe(true); expect(state.locked.has("wasser")).toBe(false);
    state = toggleLayer(state, "wasser", "hidden"); expect(layerBlocked(state, "wasser")).toBe(false);
    state = toggleLayer(state, "wasser", "locked"); expect(layerBlocked(state, "wasser")).toBe(true); expect(state.hidden.has("wasser")).toBe(false);
  });
  it("puts every region on exactly one row, land for a region without a role, and protects the blocked rows' regions", () => {
    expect(cartography.regions.map(layerOfRegion)).toEqual(["gelaende", "wasser", "wege", "grundstuecke", "gebaeude", "raeume", "gelaende"]);
    expect(layerOfRegion(undefined)).toBe("gelaende");
    const state = toggleLayer(toggleLayer(mapLayerState(), "wasser", "hidden"), "gebaeude", "locked");
    expect(blockedRegionIds(state, cartography)).toEqual(["pond", "barn"]);
    expect(blockedRegionIds(mapLayerState(), cartography)).toEqual([]);
  });
  it("tells the shared projection what to leave out", () => {
    expect(layerView(mapLayerState())).toEqual({ contours: true, shading: true, paper: true, hide: [] });
    const state = ["hoehenlinien", "papier", "wasser", "waende", "namen"].reduce((old, id) => toggleLayer(old, id as "namen", "hidden"), mapLayerState());
    expect(layerView(state)).toEqual({ contours: false, shading: true, paper: false, hide: ["walls", "water"] });
  });
  it("strips hidden furniture, lights, walls, names and grid from the scene and leaves the rest alone", () => {
    expect(applyLayers(scene, mapLayerState())).toEqual(scene);
    const state = ["einrichtung", "lichter", "waende", "namen", "raster"].reduce((old, id) => toggleLayer(old, id as "namen", "hidden"), mapLayerState());
    const shown = applyLayers(scene, state);
    expect(shown.stamps).toEqual([]); expect(shown.lights).toEqual([]); expect(shown.lines).toEqual([]);
    expect(shown.showLabels).toBe(false); expect(shown).not.toHaveProperty("title"); expect(shown.grid).toEqual({ kind: "none" });
    expect(shown.pins).toEqual(scene.pins); expect(shown.cells).toEqual(scene.cells);
  });
});
