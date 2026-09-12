// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import type { BannerId } from "@chronicle/theme";
import { memo } from "react";
import { useAppearance } from "./Appearance";
import { BANNER_PALETTES } from "./pixel-banner-palettes";
import { BannerArtwork } from "./pixel-banner-artwork";
import { BannerLandscape } from "./pixel-banner-landscape";
import "./pixel-banner.css";

/** One central scene, with distinct scenery extending along a wide header. */
export const PixelBanner = memo(function PixelBanner({ scene, animated = false, preview = false }: { scene: BannerId; animated?: boolean; preview?: boolean }) {
  // Direct SVG also keeps every animated element in the painted DOM. Pattern
  // instances can retain a stale frame despite their source animation running.
  return <span className={`pixel-banner ${preview ? "pixel-banner-preview" : "pixel-banner-strip"}`}
    data-scene={scene} data-animated={String(animated)} aria-hidden="true" style={{ background: BANNER_PALETTES[scene].sky }}>
    {!preview && <svg className="pb-landscape" focusable="false" viewBox="-4096 0 8192 96" preserveAspectRatio="xMidYMid slice"><BannerLandscape scene={scene} /></svg>}
    {/* Layout rounds the header width to 426.65625px. Fit its exact 64px height
        so a 96-unit weather period stays exactly 64px; previews fit completely. */}
    <svg className="pb-scene" focusable="false" viewBox="0 0 640 96" preserveAspectRatio={preview ? "xMidYMid meet" : "xMidYMid slice"}
      style={{ width: preview ? "100%" : 640 * 2 / 3, height: preview ? "100%" : 64 }}>
      <g data-landmark={scene}><BannerArtwork scene={scene} /></g>
    </svg>
  </span>;
});

export function ContextBanner() {
  const { preferences, resolved } = useAppearance();
  if (preferences.banner === "none" || !resolved.art) return null;
  return <div className="context-banner"><PixelBanner scene={preferences.banner}
    animated={preferences.bannerAnimation && resolved.motion.cadence !== "none"} /></div>;
}
