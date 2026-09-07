// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
/**
 * `@chronicle/szene` — Map, Region, Place, Token/Placement, Runtime Scene.
 *
 * May NOT know: knowledge decisions, and may never import `@chronicle/chronik`.
 * No Pixi, no React, no server (RB-20b:520-525).
 */
/**
 * Knoten, Kante, Ort and Anker are all keyed by KnotenId, so a consumer of this package must
 * be able to name it. Re-exported rather than left to @chronicle/core, so that using the scene
 * model does not force a second dependency purely to spell its own ids.
 */
export type { KnotenId } from "@chronicle/core";

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
export { baueMaske, erweitereMaske } from "./sichtmaske.ts";
export type { Maske, MaskeEingabe } from "./sichtmaske.ts";
export { entfernung, pfadlaenge, flaeche, rasterEntfernung, nachWelt, nachRahmen } from "./messung.ts";
export type { Punkt } from "./messung.ts";
