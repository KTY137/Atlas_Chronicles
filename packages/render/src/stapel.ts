// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import type { MapCamera, MapPoint, ProjectedMapStamp } from "./model.ts";

/**
 * Der Stempelwurf — the CPU half of `S-K1`, the one-day spike RB-20b §10 asked for and priced at
 * "frame time at p50/p95, draw calls, texture count ... the count at which it first misses 16.7 ms."
 * This module answers the part that never needs a GPU: which stamps are worth drawing this frame,
 * and how they should be grouped before anything is submitted.
 *
 * The split falls directly out of RB-20b §2's measurement. `ParticleContainer`'s own documented
 * per-particle fields are, verbatim: *"texture, position, anchor, scale, rotation, alpha and
 * color."* Set beside `ProjectedMapStamp` — `{asset, x, y, s, r, l, t}` — the brief's conclusion is
 * exact, not rhetorical:
 *
 * > "The stamp record is not merely renderable by `ParticleContainer` — it is `ParticleContainer`'s
 * > data model, field for field. Pixi shipped the map editor's renderer before we asked for it."
 *
 * That is also why this file imports nothing from `pixi.js`: the *decision* of what to draw is pure
 * arithmetic over plain data, and belongs on the `szene`/`render` side of the `MapRenderer` seam,
 * not behind it. `S-K1` itself — real frame time on a real GPU — stays unmeasured here on purpose;
 * the 50,000-stamp test below reports only the CPU planning cost, not the render.
 */

/**
 * `ProjectedMapStamp` deliberately carries no width/height — RB-20b's stamp is a transform, not
 * pixels, and the true footprint only exists once a texture has loaded inside the renderer, which
 * this module must not import. Absent that, every stamp is bounded by the circumscribed circle of
 * one assumed reference footprint, scaled by `s`. A circle is rotation-invariant by construction, so
 * this sidesteps computing the actual rotated rectangle for every stamp, every frame, and it can only
 * ever *over*-include a stamp near the edge — never pop one that should be visible. A renderer that
 * later carries real per-asset extents can tighten this without changing the contract below.
 */
const REFERENZ_KANTE = 64;
const REFERENZ_HALBDIAGONALE = (REFERENZ_KANTE / 2) * Math.SQRT2;

const STANDARD_MASSEN_AB = 2_000;
/** Pixi's own batch renderer limit (RB-02, restated in RB-20b §2's failure-order table). */
const STANDARD_MAX_TEXTUREN = 16;

export interface StapelGrenzen {
  /** Visible-stamp count above which the renderer should prefer bulk (particle) drawing. */
  readonly massenAb?: number;
  /** Distinct-texture count above which a single batch can no longer hold the frame. */
  readonly maxTexturen?: number;
}

export interface StapelPlan {
  /** Buckets keyed by asset: one draw call each if the renderer honours them. */
  readonly buendel: readonly { readonly asset: string; readonly stamps: readonly ProjectedMapStamp[] }[];
  /** Stamps outside the viewport, excluded before any GPU work. */
  readonly verworfen: number;
  readonly sichtbar: number;
  /** Distinct textures a frame would bind. Pixi batches at most 16. */
  readonly texturen: number;
  /** True when the plan exceeds a batching bound and the renderer should use bulk mode. */
  readonly massenmodus: boolean;
}

function vergleicheSchicht(a: ProjectedMapStamp, b: ProjectedMapStamp): number {
  // Layer first (author intent), id second (a total order for stamps sharing a layer) — the same
  // key `renderer.ts#drawStamps` sorts by, so two identical scenes draw in the same order whichever
  // path renders them, and screenshots taken against either stay comparable.
  if (a.l !== b.l) return a.l - b.l;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/**
 * Plans a frame's stamp draw without touching a GPU. Culls against the viewport, then buckets the
 * survivors by asset in a fully deterministic order — independent of the input array's own order, so
 * two scenes with the same stamps in different arrival order still produce byte-identical plans.
 *
 * Hot path: called once per frame against every stamp in the scene. The cull loop below performs no
 * allocation for a discarded stamp — only screen-space arithmetic and a counter increment — because a
 * 50,000-stamp scene (RB-20b's own fixture) cannot afford one object per candidate, only per survivor.
 */
export function planeStapel(
  stamps: readonly ProjectedMapStamp[],
  kamera: MapCamera,
  viewport: MapPoint,
  grenzen?: StapelGrenzen,
): StapelPlan {
  const massenAb = grenzen?.massenAb ?? STANDARD_MASSEN_AB;
  const maxTexturen = grenzen?.maxTexturen ?? STANDARD_MAX_TEXTUREN;
  const breite = viewport[0], hoehe = viewport[1];
  const kx = kamera.x, ky = kamera.y, skala = kamera.scale;

  const eimer = new Map<string, ProjectedMapStamp[]>();
  let verworfen = 0;

  for (let i = 0; i < stamps.length; i++) {
    const stamp = stamps[i]!;
    // Inlined `mapToScreen`: that helper allocates a fresh tuple per call, which this loop — run
    // over every stamp, every frame — cannot pay for on the majority (culled) branch.
    const sx = stamp.x * skala + kx;
    const sy = stamp.y * skala + ky;
    // Rotation is irrelevant to a circle's radius; this is the whole point of bounding by the
    // circumscribed circle instead of the true rotated rectangle. `r` is read only by the renderer.
    const radius = REFERENZ_HALBDIAGONALE * stamp.s * skala;
    if (sx + radius < 0 || sx - radius > breite || sy + radius < 0 || sy - radius > hoehe) {
      verworfen++;
      continue;
    }
    let bucket = eimer.get(stamp.asset);
    if (!bucket) { bucket = []; eimer.set(stamp.asset, bucket); }
    bucket.push(stamp);
  }

  // Sorting bucket keys, rather than trusting `Map` insertion order, is what makes bucket order
  // independent of the order stamps arrived in — the other half of the determinism guarantee above.
  const buendel = [...eimer.keys()].sort().map((asset) => {
    const bucket = eimer.get(asset)!;
    bucket.sort(vergleicheSchicht);
    return { asset, stamps: bucket };
  });

  const sichtbar = stamps.length - verworfen;
  const texturen = buendel.length;
  const massenmodus = sichtbar > massenAb || texturen > maxTexturen;

  return { buendel, verworfen, sichtbar, texturen, massenmodus };
}
