// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import type { BannerId } from "@chronicle/theme";
import type { ReactNode } from "react";
import { FANTASY_ART } from "./pixel-banner-fantasy";
import { FUTURE_ART } from "./pixel-banner-future";
import { DISCOVERY_ART } from "./pixel-banner-discoveries";
export { BANNER_PALETTES } from "./pixel-banner-palettes";

/** Original 640 ? 96 pixel panoramas. The shared element trees never do frame work. */
export const BANNER_ART: Record<BannerId, ReactNode> = {
  ...FANTASY_ART, ...FUTURE_ART, ...DISCOVERY_ART,
};
