/**
 * `@chronicle/szene` — Map, Region, Place, Token/Placement, Runtime Scene.
 *
 * May NOT know: knowledge decisions, and may never import `@chronicle/chronik`.
 * No Pixi, no React, no server (RB-20b:520-525).
 */
export {
  MAX_TIEFE,
  RAUM_KANTEN,
  UNVERORTET_TITEL,
  type Rahmen,
  type Anker,
  type Weltkeim,
  type Herkunft,
  type KnotenArt,
  type KantenArt,
  type Kante,
  type Knoten,
  type Ort,
  type ErzeugerAdapter,
  type PyramidRef,
  type Stamp,
  type SceneDoc,
  type Region,
  type PlacePoint,
  type MapAnchor,
} from "./model.ts";

export {
  weltkeim,
  raumEltern,
  tiefe,
  pruefeContainment,
  ortswissenFuer,
  type ContainmentVerstoss,
  type KnotenIndex,
} from "./containment.ts";
export { TACTICAL_MAP_VERSION, TACTICAL_MAP_LIMITS, TacticalMapValidationError, parseBoundedMapJson, parseTacticalMapDocument, serializeTacticalMapDocument } from "./tactical-map.ts";
export type { TacticalPoint, TacticalGrid, TacticalWall, TacticalPortal, TacticalLight, TacticalImageRef, TacticalGeometryElevation, TacticalMapDocumentV1 } from "./tactical-map.ts";
export { ASSETPAKET_VERSION, ASSETPAKET_LIMITS, ASSET_MIME_TYPES, ASSET_ARTEN, AssetpaketValidationError, parseAssetpaket, serializeAssetpaket, assetVerweis, assetIndex, pruefeStampVerweise } from "./assetpaket.ts";
export type { AssetMimeType, AssetArt, Lizenz, PaketAsset, AssetpaketV1, AufgeloestesAsset, UnaufgeloesterVerweis } from "./assetpaket.ts";
