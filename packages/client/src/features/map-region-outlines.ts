// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import type { TacticalMapDocumentV1 } from "@chronicle/szene";
import type { ProjectedMapScene } from "@chronicle/render";

/** Region fills lie below floor artwork; outlines keep generated plots and roads readable. */
export function mapRegionOutlines(document: TacticalMapDocumentV1): NonNullable<ProjectedMapScene["lines"]> {
  if (document.background || !document.geometry.stamps.length) return [];
  return document.geometry.regions.filter(region => region.punkte.length > 2).map(region => ({
    id: `outline:${region.id}`, points: [...region.punkte, region.punkte[0]!], color: 0x765039,
  }));
}
