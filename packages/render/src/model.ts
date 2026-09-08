// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
/// <reference lib="dom" />
import type { TacticalGrid } from "@chronicle/szene";
/** Closed presentation boundary. Only records already selected by the server belong here. */
export type MapPoint = readonly [number, number];
export type MapRasterSampling = "nearest" | "linear";
export type MapRendererBackend = "pixi-webgl" | "pixi-webgpu" | "pixi-canvas";
/** Closed, local vector artwork; an icon never names an image or network resource. */
export type MapPinIcon = "place" | "city" | "castle" | "cave" | "ruin" | "portal";
export interface ProjectedMapCell {
  readonly id: string;
  readonly polygon: readonly MapPoint[];
  readonly fill?: number;
  /** Presentation only: a settlement footprint or street band, never a new stored map kind. */
  readonly surface?: "building" | "street";
  readonly roof?: "pitched" | "flat" | "tech";
}
export interface ProjectedMapPin {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly label: string;
  readonly entryId?: string;
  readonly color?: number;
  /** Optional 24-CSS-pixel badge. Omitted icons retain the original point marker. */
  readonly icon?: MapPinIcon;
}
export interface ProjectedMapToken {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly label: string;
  readonly color?: number;
  /** Screen-pixel radius, independent of camera zoom. */
  readonly radius?: number;
  /** A server-projected interaction affordance; the server still authorizes every command. */
  readonly movable?: boolean;
  /** Optional server version; a changed version invalidates an in-progress drag. */
  readonly revision?: number;
}
/**
 * A placement on the map. Field for field this is the generator's own `Stamp` and, not by
 * accident, also a GPU particle's data model — RB-20b:167 observed that Pixi shipped the map
 * editor's renderer before we asked for it.
 *
 * `asset` is a pack-qualified reference ("pk.grundriss/moebel/tisch"), never a URL: the renderer
 * must not be able to name a network location, and a pack can be re-pointed without rewriting
 * every placement.
 */
export interface ProjectedMapStamp {
  readonly id: string;
  readonly asset: string;
  readonly x: number;
  readonly y: number;
  /** Uniform scale, 1 = the asset's own size. */
  readonly s: number;
  /** Rotation in radians. */
  readonly r: number;
  /** Layer index; lower draws first. */
  readonly l: number;
  /** Optional tint, 0 or absent = none. */
  readonly t?: number;
}
/** Ownership of each bitmap transfers to the renderer, exactly as with raster tiles. */
export interface MapStampImage { readonly asset: string; readonly image: ImageBitmap }
export interface ProjectedMapScene {
  readonly id: string;
  readonly width: number;
  readonly height: number;
  readonly cells: readonly ProjectedMapCell[];
  readonly pins: readonly ProjectedMapPin[];
  readonly tokens?: readonly ProjectedMapToken[];
  readonly grid?: TacticalGrid;
  readonly lines?: readonly { readonly id: string; readonly points: readonly MapPoint[]; readonly color?: number }[];
  /** Placements. A stamp with no supplied image draws nothing — never a placeholder box. */
  readonly stamps?: readonly ProjectedMapStamp[];
  /** Changing the authorized raster scope discards every old texture immediately. */
  readonly rasterScope?: string;
  /** Presentation only; omitted sampling uses linear filtering. */
  readonly rasterSampling?: MapRasterSampling;
  /** Show collision-limited pin names. False hides all names; omitted retains selection-only names. */
  readonly showLabels?: boolean;
}
/** The host fetches authorized tiles. Ownership of each bitmap transfers to the renderer. */
export interface MapRasterTile { readonly id: string; readonly left: number; readonly top: number; readonly width: number; readonly height: number; readonly pixelScale: number; readonly image: ImageBitmap }
export interface MapScenePatch { readonly sceneId: string; readonly tokens?: readonly ProjectedMapToken[]; readonly pins?: readonly ProjectedMapPin[]; readonly cells?: readonly ProjectedMapCell[] }
/** Translation in viewport CSS pixels, then scale in CSS pixels per map unit. */
export interface MapCamera { readonly x: number; readonly y: number; readonly scale: number }
export interface MapHit { readonly kind: "pin" | "token" | "cell"; readonly id: string }

export interface MapRenderer {
  readonly backend: MapRendererBackend;
  update(scene: ProjectedMapScene): void;
  applyPatch(patch: MapScenePatch): void;
  setRasterTiles(scope: string, tiles: readonly MapRasterTile[]): void;
  /** Supply pack artwork. The renderer never fetches; the host owns requests and their lifetime. */
  setStampImages(images: readonly MapStampImage[]): void;
  resize(width: number, height: number): void;
  fit(): void;
  getCamera(): MapCamera;
  setCamera(camera: MapCamera): void;
  zoomAt(factor: number, point?: MapPoint): void;
  panBy(x: number, y: number): void;
  /** Hit point uses viewport CSS pixels, not client or world coordinates. */
  hitTest(point: MapPoint): MapHit | null;
  select(hit: MapHit | null): void;
  destroy(): void;
}
