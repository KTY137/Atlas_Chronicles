// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { TACTICAL_MAP_LIMITS, type Stamp, type TacticalMapDocumentV1, type TacticalPoint } from "@chronicle/szene";
import { placeArtwork, type ArtworkBrush } from "./map-artwork";

/**
 * The scatter brush: one stroke across the land, and the chosen motif falls along it the way a
 * painter dabs trees into a wood — spaced, turned and sized a little differently each time.
 * Everything is derived from the stroke and the gesture's seed, so the preview a game master
 * sees while dragging is exactly what the commit keeps, and the same stroke never lands twice
 * in the same way on two different gestures.
 */
export interface ScatterSettings {
  /** Whether dragging scatters; off, a click sets one object as before. */
  readonly on: boolean;
  /** Distance between objects along the stroke, in construction cells. */
  readonly spacing: number;
  /** 0..1: how far each object may stray from the line, turn and grow or shrink. */
  readonly jitter: number;
}
export const scatterSettings = (): ScatterSettings => ({ on: false, spacing: 1.2, jitter: .7 });
export const SCATTER_SPACING = { min: .4, max: 4 } as const;
export interface ScatterPlacement { readonly x: number; readonly y: number; readonly r: number; readonly s: number }

/** A small deterministic generator seeded from a string, the same everywhere the brush runs. */
function random(seed: string): () => number {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index++) hash = Math.imul(hash ^ seed.charCodeAt(index), 16777619);
  let state = hash >>> 0;
  return () => {
    state = state + 0x6d2b79f5 >>> 0;
    let t = state;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/**
 * Positions along a stroke. The first object sits at the stroke's start; every further one
 * follows after `spacing` map units of arc length, pushed sideways by up to `jitter · spacing/2`
 * and along by a little, turned by up to a full circle and scaled by up to ±30 %.
 */
export function scatterAlong(path: readonly TacticalPoint[], spacing: number, jitter: number, seed: string, limit = 2048): ScatterPlacement[] {
  if (!path.length || !(spacing > 0) || !Number.isFinite(spacing)) return [];
  const spread = Math.max(0, Math.min(1, jitter)), next = random(seed), placements: ScatterPlacement[] = [];
  const place = (x: number, y: number, tx: number, ty: number) => {
    const across = (next() - .5) * spacing * spread, along = (next() - .5) * spacing * .5 * spread;
    placements.push({ x: x - ty * across + tx * along, y: y + tx * across + ty * along, r: next() * Math.PI * 2 * spread, s: 1 + (next() - .5) * .6 * spread });
  };
  place(path[0]![0], path[0]![1], 1, 0);
  let carried = 0;
  for (let index = 1; index < path.length && placements.length < limit; index++) {
    const a = path[index - 1]!, b = path[index]!, dx = b[0] - a[0], dy = b[1] - a[1], length = Math.hypot(dx, dy);
    if (!length) continue;
    const tx = dx / length, ty = dy / length;
    let at = spacing - carried;
    while (at <= length && placements.length < limit) { place(a[0] + tx * at, a[1] + ty * at, tx, ty); at += spacing; }
    carried = length - (at - spacing);
  }
  return placements;
}

/** The stroke as stamps: each placement clamped onto the sheet by `placeArtwork`, with the
 * brush's own turns and size applied on top, never past the document's stamp budget. */
export function scatterStamps(document: TacticalMapDocumentV1, brush: ArtworkBrush, path: readonly TacticalPoint[], cellSize: number, settings: ScatterSettings, seed: string, id: (index: number) => string, turns = 0, size = 1): Stamp[] {
  const room = TACTICAL_MAP_LIMITS.stamps - document.geometry.stamps.length;
  if (room <= 0) return [];
  const spacing = Math.max(SCATTER_SPACING.min, Math.min(SCATTER_SPACING.max, settings.spacing)) * cellSize * Math.max(.25, size);
  const stamps: Stamp[] = [];
  for (const [index, placement] of scatterAlong(path, spacing, settings.jitter, seed, Math.min(room, 2048)).entries()) {
    const stamp = placeArtwork(document, brush, [placement.x, placement.y], id(index));
    if (stamp) stamps.push({ ...stamp, r: (stamp.r + turns * Math.PI / 2 + placement.r) % (2 * Math.PI), s: stamp.s * size * placement.s });
  }
  return stamps;
}
