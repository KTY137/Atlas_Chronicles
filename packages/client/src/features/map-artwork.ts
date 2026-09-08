// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { ASSET_GENRES, ASSET_GENRE_LABEL, type AssetGenre, type AssetpaketV1, type PaketAsset, type Stamp, type TacticalMapDocumentV1, type TacticalPoint } from "@chronicle/szene";
import { t } from "../i18n";

export interface ArtworkBrush { packId: string; cellSize: number; asset: PaketAsset }
export const artworkName = (name: string) => name.replaceAll("_", " ").replace(/^./, character => character.toLocaleUpperCase("de"));
export const artworkGenre = (asset: PaketAsset): AssetGenre | undefined => ASSET_GENRES.find(genre => asset.schlagworte.includes(`genre_${genre}`));
export function artworkMatches(asset: PaketAsset, query: string, category: string, era: string, genre: string): boolean {
  const assetGenre = artworkGenre(asset), needle = query.trim().toLocaleLowerCase("de");
  return (category === "all" || asset.art === category)
    && (genre === "all" || assetGenre === genre)
    && (era === "all" || !asset.schlagworte.some(tag => ["fantasy", "gegenwart", "scifi"].includes(tag)) || asset.schlagworte.includes(era))
    && (!needle || `${artworkName(asset.name)} ${asset.schlagworte.join(" ")} ${assetGenre ? t(ASSET_GENRE_LABEL[assetGenre]) : ""}`.toLocaleLowerCase("de").includes(needle));
}
export function artworkBrush(pack: AssetpaketV1, asset: PaketAsset): ArtworkBrush { return { packId: pack.id, cellSize: pack.zellgroesse, asset }; }
/** Intrinsic artwork stays in scale with the map; clamp its whole footprint onto the canvas. */
export function placeArtwork(document: TacticalMapDocumentV1, brush: ArtworkBrush, point: TacticalPoint, id: string): Stamp | null {
  const [width, height] = document.geometry.size;
  const scale = (document.grid.kind === "none" ? 64 : document.grid.size) / brush.cellSize;
  const halfWidth = brush.asset.groesse[0] * scale / 2, halfHeight = brush.asset.groesse[1] * scale / 2;
  if (![...point, scale, halfWidth, halfHeight].every(Number.isFinite) || scale <= 0 || halfWidth * 2 > width || halfHeight * 2 > height) return null;
  return { id, a: `${brush.packId}/${brush.asset.name}`, x: Math.max(halfWidth, Math.min(width - halfWidth, point[0])),
    y: Math.max(halfHeight, Math.min(height - halfHeight, point[1])), s: scale, r: 0,
    l: brush.asset.art === "boden" ? -80 : brush.asset.schlagworte.includes("dach") ? 40 : 15 };
}
