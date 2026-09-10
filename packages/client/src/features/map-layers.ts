// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { cartographyLayerOf, type CartographyLayer, type CartographyRegionV1, type CartographyView, type TacticalCartographyV1 } from "@chronicle/szene";
import type { ProjectedMapScene } from "@chronicle/render";
import { t } from "../i18n";

/**
 * The studio's layer panel: what a game master hides while working and locks when it is done.
 * Both are the editor's own view for this sitting and are never saved — the lock on a single
 * area (`region.locked`) is the one that travels with the map. A hidden layer is also blocked
 * for editing: you cannot move what you cannot see.
 */
export type MapLayerId = "namen" | "einrichtung" | "lichter" | "waende" | "gebaeude" | "raeume" | "grundstuecke" | "wege" | "wasser" | "hoehenlinien" | "schattierung" | "gelaende" | "papier" | "raster";
export interface MapLayerState { readonly hidden: ReadonlySet<MapLayerId>; readonly locked: ReadonlySet<MapLayerId> }
export interface MapLayer {
  readonly id: MapLayerId;
  /** The drawn layer of the shared projection this row switches, if it is one. */
  readonly drawn?: CartographyLayer;
  /** Whether the row can be locked: only layers that the tools can change. */
  readonly lockable: boolean;
  /** Rows that exist only on a map with a relief. */
  readonly relief?: boolean;
}
/** Top to bottom, the way the layers stack in the picture. */
export const MAP_LAYERS: readonly MapLayer[] = [
  { id: "namen", lockable: false }, { id: "einrichtung", lockable: true }, { id: "lichter", lockable: false }, { id: "waende", drawn: "walls", lockable: true },
  { id: "gebaeude", drawn: "building", lockable: true }, { id: "raeume", drawn: "room", lockable: true }, { id: "grundstuecke", drawn: "lot", lockable: true },
  { id: "wege", drawn: "road", lockable: true }, { id: "wasser", drawn: "water", lockable: true },
  { id: "hoehenlinien", lockable: false, relief: true }, { id: "schattierung", lockable: false, relief: true },
  { id: "gelaende", drawn: "terrain", lockable: true }, { id: "papier", lockable: false }, { id: "raster", lockable: false },
];
// Labels are looked up on every render so a language change reaches them.
export function mapLayerLabel(id: MapLayerId): string {
  switch (id) {
    case "namen": return t("Namen"); case "einrichtung": return t("Einrichtung"); case "lichter": return t("Lichter"); case "waende": return t("Wände & Türen");
    case "gebaeude": return t("Gebäude"); case "raeume": return t("Räume"); case "grundstuecke": return t("Grundstücke"); case "wege": return t("Wege & Straßen");
    case "wasser": return t("Wasser"); case "hoehenlinien": return t("Höhenlinien"); case "schattierung": return t("Schattierung"); case "gelaende": return t("Gelände");
    case "papier": return t("Papier"); case "raster": return t("Ansichtsraster");
  }
}
export const mapLayerState = (): MapLayerState => ({ hidden: new Set(), locked: new Set() });
export function toggleLayer(state: MapLayerState, id: MapLayerId, what: "hidden" | "locked"): MapLayerState {
  const next = new Set(state[what]);
  if (next.has(id)) next.delete(id); else next.add(id);
  return { ...state, [what]: next };
}
/** Hidden or locked: the tools leave this layer alone. */
export function layerBlocked(state: MapLayerState, id: MapLayerId): boolean { return state.hidden.has(id) || state.locked.has(id); }
/** The row a region belongs to, by its role; a region without a role is land. */
export function layerOfRegion(role: CartographyRegionV1 | undefined): MapLayerId {
  return MAP_LAYERS.find(layer => layer.drawn === cartographyLayerOf(role))!.id;
}
/** Every region on a hidden or locked layer, for the edit's protected ids. */
export function blockedRegionIds(state: MapLayerState, cartography: TacticalCartographyV1): string[] {
  return cartography.regions.filter(region => layerBlocked(state, layerOfRegion(region))).map(region => region.regionId);
}
/** What the shared projection leaves out for this view. */
export function layerView(state: MapLayerState): CartographyView {
  return { contours: !state.hidden.has("hoehenlinien"), shading: !state.hidden.has("schattierung"), paper: !state.hidden.has("papier"),
    hide: MAP_LAYERS.filter(layer => layer.drawn && state.hidden.has(layer.id)).map(layer => layer.drawn!) };
}
/** The scene without its hidden furniture, lights, walls, names and grid. The drawing itself is
 * already reduced by `layerView`; this is what the renderer draws on top of it. */
export function applyLayers(scene: ProjectedMapScene, state: MapLayerState): ProjectedMapScene {
  const { title, ...rest } = scene, hidden = state.hidden;
  return { ...rest,
    ...(hidden.has("namen") ? { showLabels: false } : title !== undefined ? { title } : {}),
    ...(hidden.has("einrichtung") ? { stamps: [] } : {}), ...(hidden.has("lichter") ? { lights: [] } : {}), ...(hidden.has("waende") ? { lines: [] } : {}),
    ...(hidden.has("raster") ? { grid: { kind: "none" as const } } : {}) };
}
