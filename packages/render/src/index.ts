// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
export { createMapRenderer, MapRendererUnavailableError, type MapRendererOptions } from "./renderer.ts";
export { imageRasterLayout, rasterTilesFit, snapMapPoint, visibleMapTiles, visibleGridLines } from "./tactical-geometry.ts";
export type { ImageRasterLayout, ImageRasterTile, VisibleTile } from "./tactical-geometry.ts";
export type { MapEditorInteraction, MapRasterTile, MapRasterSampling, MapRendererBackend, MapScenePatch } from "./model.ts";
export { fitCamera, hitTestMap, mapToScreen, normalizeCamera, pointInPolygon, screenToMap, validateMapScene, zoomCamera } from "./geometry.ts";
export type { MapCamera, MapHit, MapPinIcon, MapPoint, MapRenderer, MapStampImage, ProjectedMapCell, ProjectedMapPin, ProjectedMapScene, ProjectedMapStamp, ProjectedMapToken } from "./model.ts";
export { planeStapel } from "./stapel.ts";
export type { StapelPlan, StapelGrenzen } from "./stapel.ts";
export { gitterFeld, zelleBei, zellenMitte } from "./gitter-feld.ts";
export type { GitterFeld } from "./gitter-feld.ts";
export { pruefeBudget, RENDER_BUDGET } from "./budget.ts";
export type { BudgetGrenzen, BudgetBericht, Ueberschreitung } from "./budget.ts";
