// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import type { TacticalGrid } from "@chronicle/szene";
import { mapToScreen, screenToMap } from "./geometry.ts";
import type { MapCamera } from "./model.ts";

/**
 * RB-02 (rendering research) rules that a grid must be "a procedural shader on a single quad
 * (square/hex/iso). Never geometry per cell." The renderer today (tactical-geometry.ts's
 * visibleGridLines, cached by grid-cache.ts) instead builds a polyline per grid line and
 * re-tessellates them as the viewport pans — at the shipped budget of up to 192x192 cells that
 * is hundreds of line-segment arrays rebuilt on every pan tick, competing with tokens and fog
 * for the same frame budget.
 *
 * This module is the CPU half of the procedural replacement: everything a full-quad shader pass
 * needs (uniforms) plus the picking math that must agree with what that shader would paint, all
 * computed in O(1) — no per-line, no per-cell allocation. It imports no GPU/Pixi API; a later
 * renderer change consumes it by uploading `GitterFeld` as shader uniforms and drawing one quad.
 *
 * Boundary rule (states the one free choice this module makes): a point ON a lattice edge
 * belongs to the higher-index cell on that axis — equivalently every cell is top/left-inclusive,
 * bottom/right-exclusive. That is exactly what `Math.floor` gives for free (no epsilon fudging),
 * and it matches how visibleGridLines already enumerates a line only once, at its lower edge.
 */

export interface GitterFeld {
  /** Uniforms for a single full-quad shader pass. */
  readonly ursprung: readonly [number, number];
  readonly schritt: readonly [number, number];
  readonly art: "quadrat" | "hex" | "keines";
  /** Hex only: flat-top or pointy-top changes the lattice, not just the look. */
  readonly hexOrientierung?: "spitz" | "flach";
  /** Line width in CSS pixels, resolution-independent. */
  readonly staerke: number;
  /** Cells fully or partly inside the viewport — what a shader would shade. */
  readonly sichtbareZellen: number;
}

// The shader converts this fixed CSS-pixel width into world units per fragment using the
// camera scale it already receives; keeping it a constant here (never scaled by `kamera.scale`)
// is what keeps hairlines crisp at any zoom instead of thickening/thinning with the map.
const LINIENSTAERKE_CSS_PIXEL = 1;

function pruefeKamera(kamera: MapCamera): void {
  if (![kamera.x, kamera.y].every(Number.isFinite) || !Number.isFinite(kamera.scale) || kamera.scale <= 0) throw new Error("invalid kamera");
}
function pruefeGitterGroesse(gitter: Extract<TacticalGrid, { kind: "square" | "hex" }>): void {
  if (!(gitter.size > 0) || !Number.isFinite(gitter.size) || !gitter.origin.every(Number.isFinite)) throw new Error("invalid grid size");
}

/** Hex lattice periodicity in world units — the spacing between repeating hex centres along
 * each axis. Shared verbatim (same formula, same variable roles) by `gitterFeld`, `zelleBei`
 * and `zellenMitte`, so the step a shader would tile by, the cell count, and the picked cell
 * for a point can never drift apart from one another. */
function hexPeriode(gitter: Extract<TacticalGrid, { kind: "hex" }>): readonly [number, number] {
  const pointy = gitter.orientation === "pointy";
  return pointy ? [Math.sqrt(3) * gitter.size, 1.5 * gitter.size] : [1.5 * gitter.size, Math.sqrt(3) * gitter.size];
}

export function gitterFeld(gitter: TacticalGrid, kamera: MapCamera, viewport: readonly [number, number]): GitterFeld {
  if (gitter.kind === "none") return { ursprung: [0, 0], schritt: [0, 0], art: "keines", staerke: 0, sichtbareZellen: 0 };
  pruefeKamera(kamera);
  pruefeGitterGroesse(gitter);
  if (!viewport.every(Number.isFinite) || viewport[0] <= 0 || viewport[1] <= 0) throw new Error("invalid viewport");

  // Uniform derivation: `ursprung` is the one term that carries camera translation (it is
  // where the lattice origin lands on screen); `schritt` depends only on cell size and zoom.
  // That split is exactly the invariant a shader needs to redraw on pan without re-deriving
  // the lattice, and it is the property under test for "independent of viewport translation".
  const ursprung = mapToScreen(gitter.origin, kamera);
  const [wx0, wy0] = screenToMap([0, 0], kamera);
  const [wx1, wy1] = screenToMap(viewport, kamera);
  const [ox, oy] = gitter.origin;

  if (gitter.kind === "square") {
    const s = gitter.size;
    const schritt: readonly [number, number] = [s * kamera.scale, s * kamera.scale];
    // Cell-index span from floor() alone, no enumeration: the count of integers in
    // [floor((wx0-ox)/s), floor((wx1-ox)/s)] is exactly the number of columns a shader
    // would shade, whether that span is 3 cells or 3 million.
    const spalten = Math.floor((wx1 - ox) / s) - Math.floor((wx0 - ox) / s) + 1;
    const zeilen = Math.floor((wy1 - oy) / s) - Math.floor((wy0 - oy) / s) + 1;
    return { ursprung, schritt, art: "quadrat", staerke: LINIENSTAERKE_CSS_PIXEL, sichtbareZellen: Math.max(0, spalten) * Math.max(0, zeilen) };
  }

  const [dx, dy] = hexPeriode(gitter);
  const schritt: readonly [number, number] = [dx * kamera.scale, dy * kamera.scale];
  // +3 rather than +1: offset rows/columns are shifted by half a period (see zelleBei/
  // tactical-geometry.ts's visibleGridLines), so a naive division under-counts at the seams.
  // This still costs one division and one floor per axis, not a loop.
  const spalten = Math.floor((wx1 - ox) / dx) - Math.floor((wx0 - ox) / dx) + 3;
  const zeilen = Math.floor((wy1 - oy) / dy) - Math.floor((wy0 - oy) / dy) + 3;
  return {
    ursprung, schritt, art: "hex", hexOrientierung: gitter.orientation === "pointy" ? "spitz" : "flach",
    staerke: LINIENSTAERKE_CSS_PIXEL, sichtbareZellen: Math.max(0, spalten) * Math.max(0, zeilen),
  };
}

/** Which cell contains a world point — the same lattice the shader draws, so picking agrees
 * with pixels. Returns square/rectangular cell indices, or hex axial (q, r) coordinates. */
export function zelleBei(gitter: TacticalGrid, punkt: readonly [number, number]): readonly [number, number] {
  if (!punkt.every(Number.isFinite)) throw new Error("invalid punkt");
  // "none" has no lattice; [0, 0] is the one defined fallback cell, and zellenMitte's own
  // "none" fallback below maps back to the same pair, so the two stay a consistent (trivial) pair.
  if (gitter.kind === "none") return [0, 0];
  pruefeGitterGroesse(gitter);
  const [ox, oy] = gitter.origin, s = gitter.size, x = punkt[0] - ox, y = punkt[1] - oy;
  if (gitter.kind === "square") return [Math.floor(x / s), Math.floor(y / s)];

  // Axial cube rounding, identical formula (same variable roles a/b/c, q/r) to
  // tactical-geometry.ts's snapMapPoint, so this picking path and the already-shipped
  // snap-to-grid path can never disagree about which cell a point belongs to.
  const pointy = gitter.orientation === "pointy";
  const q = pointy ? (Math.sqrt(3) / 3 * x - y / 3) / s : (2 * x) / (3 * s);
  const r = pointy ? (2 * y) / (3 * s) : (-x / 3 + Math.sqrt(3) / 3 * y) / s;
  let a = Math.round(q), b = Math.round(-q - r), c = Math.round(r);
  const da = Math.abs(a - q), db = Math.abs(b + q + r), dc = Math.abs(c - r);
  if (da > db && da > dc) a = -b - c; else if (db > dc) b = -a - c; else c = -a - b;
  return [a, c];
}

/** Centre of a cell in world coordinates. Inverse of zelleBei up to rounding. */
export function zellenMitte(gitter: TacticalGrid, zelle: readonly [number, number]): readonly [number, number] {
  if (!zelle.every(Number.isFinite)) throw new Error("invalid zelle");
  if (gitter.kind === "none") return [0, 0];
  pruefeGitterGroesse(gitter);
  const [ox, oy] = gitter.origin, s = gitter.size, [i, j] = zelle;
  if (gitter.kind === "square") return [ox + (i + 0.5) * s, oy + (j + 0.5) * s];
  // Standard axial-to-pixel conversion, the exact inverse of the q/r formulas in zelleBei
  // above and of the final return in tactical-geometry.ts's snapMapPoint.
  return gitter.orientation === "pointy"
    ? [ox + s * Math.sqrt(3) * (i + j / 2), oy + s * 1.5 * j]
    : [ox + s * 1.5 * i, oy + s * Math.sqrt(3) * (j + i / 2)];
}
