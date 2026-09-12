// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { useId } from "react";
import type { BannerId } from "@chronicle/theme";
import { useAppearance } from "./Appearance";
import { BANNER_ART, BANNER_PALETTES } from "./pixel-banner-scenes";
import "./pixel-banner.css";

/** The same artwork is cropped for cards and tiled across wide headers. */
export function PixelBanner({ scene, animated = false, preview = false }: { scene: BannerId; animated?: boolean; preview?: boolean }) {
  const patternId = `pixel-banner-${useId().replace(/:/g, "")}`;
  // Keep preview pixels at their native size. Fractional `slice` scaling makes
  // crispEdges round repeated rain fields differently at the loop boundary.
  const scale = preview ? 1 : 2 / 3;
  return <span className={`pixel-banner ${preview ? "pixel-banner-preview" : "pixel-banner-strip"}`}
    data-scene={scene} data-animated={String(animated)} aria-hidden="true" style={{ background: BANNER_PALETTES[scene].sky }}>
    <svg focusable="false"><defs><pattern id={patternId} x="50%" y="0" width={640 * scale} height={96 * scale} viewBox="0 0 640 96" patternUnits="userSpaceOnUse" patternTransform={`translate(${-320 * scale} 0)`}>
        {BANNER_ART[scene]}
      </pattern></defs><rect width="100%" height="100%" fill={`url(#${patternId})`} /></svg>
  </span>;
}

export function ContextBanner() {
  const { preferences, resolved } = useAppearance();
  if (preferences.banner === "none" || !resolved.art) return null;
  return <div className="context-banner"><PixelBanner scene={preferences.banner}
    animated={preferences.bannerAnimation && resolved.motion.cadence !== "none"} /></div>;
}
