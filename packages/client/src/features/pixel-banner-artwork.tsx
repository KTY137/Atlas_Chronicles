// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import type { BannerId } from "@chronicle/theme";
import type { ReactNode } from "react";
import { BANNER_ART } from "./pixel-banner-scenes";
import { FANTASY_VIGNETTES } from "./pixel-banner-vignettes-fantasy";
import { FUTURE_VIGNETTES } from "./pixel-banner-vignettes-future";
import { DISCOVERY_VIGNETTES } from "./pixel-banner-vignettes-discoveries";
import { BANNER_PALETTES } from "./pixel-banner-palettes";
import { Rain } from "./pixel-banner-primitives";

const VIGNETTES = { ...FANTASY_VIGNETTES, ...FUTURE_VIGNETTES, ...DISCOVERY_VIGNETTES } satisfies Record<BannerId, ReactNode>;

/** One complete composition: a central landmark and two different small stories. */
export function BannerArtwork({ scene }: { scene: BannerId }) {
  return <>{BANNER_ART[scene]}<g className="pb-vignettes" data-vignettes={scene}>{VIGNETTES[scene]}</g>
    {(scene === "neonregen" || scene === "eiswacht") && <Rain p={BANNER_PALETTES[scene]} snow={scene === "eiswacht"} />}
  </>;
}
