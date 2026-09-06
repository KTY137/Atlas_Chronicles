/** Closed presentation boundary. Only records already selected by the server belong here. */
export type MapPoint = readonly [number, number];
export interface ProjectedMapCell {
  readonly id: string;
  readonly polygon: readonly MapPoint[];
  readonly fill?: number;
}
export interface ProjectedMapPin {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly label: string;
  readonly entryId?: string;
  readonly color?: number;
}
export interface ProjectedMapToken {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly label: string;
  readonly color?: number;
  /** Screen-pixel radius, independent of camera zoom. */
  readonly radius?: number;
}
export interface ProjectedMapScene {
  readonly id: string;
  readonly width: number;
  readonly height: number;
  readonly cells: readonly ProjectedMapCell[];
  readonly pins: readonly ProjectedMapPin[];
  readonly tokens?: readonly ProjectedMapToken[];
}
/** Translation in viewport CSS pixels, then scale in CSS pixels per map unit. */
export interface MapCamera { readonly x: number; readonly y: number; readonly scale: number }
export interface MapHit { readonly kind: "pin" | "token" | "cell"; readonly id: string }

export interface MapRenderer {
  readonly backend: "pixi-webgl";
  update(scene: ProjectedMapScene): void;
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
