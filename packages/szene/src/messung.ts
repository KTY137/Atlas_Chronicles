// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import type { Rahmen } from "./model.ts";
import type { TacticalGrid } from "./tactical-map.ts";

/**
 * MEASUREMENT — distance, path length and area, expressed in a map's OWN units.
 *
 * The corpus holds **three mutually incompatible coordinate contracts**: FMG's
 * `graphWidth/graphHeight`, UVTT's `resolution {map_origin, map_size, pixels_per_grid}`, and
 * Fandom `interactivemap`'s `mapBounds` with `origin: "bottom-left"` and
 * `coordinateOrder: "xy"`. None nests into another. `Rahmen` exists so every artefact carries
 * its own; **this module is the only place allowed to interpret one.** A measurement that
 * ignores `ordnung` or `hoch` silently returns a plausible wrong number, which is worse than an
 * error — a GM who trusts a wrong number makes a wrong call at the table.
 *
 * `Punkt` is not defined anywhere else in the corpus (checked: no `packages/*` source declares
 * it). It is introduced here, scoped to this module, as the tuple shape every geometry array in
 * `model.ts` and `tactical-map.ts` already uses (`Rahmen.ursprung`, `Anker.bei`, `TacticalPoint`)
 * — so callers pass existing coordinate pairs in without a conversion step.
 *
 * The pixel -> world formula is not invented here; it is copied from the ratified contract in
 * `packages/szene/schema/README.md` ("Coordinates and geometry"): for image point `(u,v)`,
 * `dx = u*einheitenProPixel`, `dy = v*einheitenProPixel*(hoch==="unten"?1:-1)`, and the result is
 * `ursprung + [dx,dy]` for `ordnung:"xy"` or `ursprung + [dy,dx]` for `"yx"`. `nachRahmen` is the
 * algebraic inverse of exactly that formula, not an independent reinterpretation of it.
 */
export type Punkt = readonly [number, number];

// ---------------------------------------------------------------------------------------
// Frame <-> world — the only functions permitted to touch ordnung/hoch/ursprung directly
// ---------------------------------------------------------------------------------------

/**
 * Local raster point (as stored in `SceneDoc`/`TacticalMapDocumentV1` geometry, always
 * top-left-origin, downward-y image pixels) -> the frame's declared external world point.
 */
export function nachWelt(rahmen: Rahmen, punkt: Punkt): Punkt {
  const [u, v] = punkt;
  const dx = u * rahmen.einheitenProPixel;
  // The sign flip, not a magnitude change: "hoch: oben" means world y runs opposite to the
  // image row direction (top-anchored, standard Cartesian); "unten" (Fandom-style
  // bottom-left origin) means it runs the same way pixel rows do. Squaring later erases this
  // sign in distance/area math, which is exactly why those two invariants must be verified on
  // `nachWelt` directly rather than inferred from a metric that cannot see the flip.
  const dy = v * rahmen.einheitenProPixel * (rahmen.hoch === "unten" ? 1 : -1);
  return rahmen.ordnung === "xy"
    ? [rahmen.ursprung[0] + dx, rahmen.ursprung[1] + dy]
    : [rahmen.ursprung[0] + dy, rahmen.ursprung[1] + dx];
}

/** World point -> local raster point. Exact algebraic inverse of {@link nachWelt}. */
export function nachRahmen(rahmen: Rahmen, punkt: Punkt): Punkt {
  const [wx, wy] = punkt;
  const [dx, dy] = rahmen.ordnung === "xy"
    ? [wx - rahmen.ursprung[0], wy - rahmen.ursprung[1]]
    // Inverse of nachWelt's yx branch, which sets world = [ursprung[0] + dy, ursprung[1] + dx].
    // The origin components must swap here too: subtracting ursprung[0] from wy is only correct
    // when the origin is symmetric, which is exactly why a square-origin fixture hides the bug.
    : [wy - rahmen.ursprung[1], wx - rahmen.ursprung[0]];
  const u = dx / rahmen.einheitenProPixel;
  // 1/(+-1) === (+-1), so multiplying back by the same sign undoes the flip exactly.
  const v = (dy / rahmen.einheitenProPixel) * (rahmen.hoch === "unten" ? 1 : -1);
  return [u, v];
}

// ---------------------------------------------------------------------------------------
// Distance, path length, area — always routed through nachWelt, never through raw pixels
// ---------------------------------------------------------------------------------------

function euklidisch(a: Punkt, b: Punkt): number {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Straight-line distance between two local raster points, in the frame's external units.
 *
 * Both points are converted through {@link nachWelt} before measuring. This is not strictly
 * required for a plain Euclidean distance — `ordnung`/`hoch` are an axis permutation and a sign
 * flip, both isometries that leave a Euclidean norm unchanged — but routing through `nachWelt`
 * anyway keeps exactly one code path responsible for interpreting a `Rahmen`, so a future,
 * non-isometric frame contract (e.g. independent per-axis scale) cannot silently go stale here.
 */
export function entfernung(rahmen: Rahmen, a: Punkt, b: Punkt): number {
  return euklidisch(nachWelt(rahmen, a), nachWelt(rahmen, b));
}

/** Total length of an open polyline through local raster points, in the frame's external units. */
export function pfadlaenge(rahmen: Rahmen, punkte: readonly Punkt[]): number {
  if (punkte.length < 2) return 0;
  const welt = punkte.map(p => nachWelt(rahmen, p));
  let summe = 0;
  for (let i = 1; i < welt.length; i++) summe += euklidisch(welt[i - 1]!, welt[i]!);
  return summe;
}

/**
 * Absolute area of a closed polygon given as local raster points, in the frame's external
 * squared units (shoelace formula). Fewer than 3 points is a degenerate polygon — area 0, not an
 * error, since a point or a segment is a legitimate (if useless) measurement input.
 *
 * `ordnung`/`hoch` can flip the *sign* of the shoelace sum (axis swap and vertical mirroring are
 * both orientation-reversing), which is exactly why the result is `Math.abs`-ed: this function
 * promises a magnitude, never a winding direction.
 */
export function flaeche(rahmen: Rahmen, polygon: readonly Punkt[]): number {
  if (polygon.length < 3) return 0;
  const welt = polygon.map(p => nachWelt(rahmen, p));
  let doppelteFlaeche = 0;
  for (let i = 0; i < welt.length; i++) {
    const [x1, y1] = welt[i]!;
    const [x2, y2] = welt[(i + 1) % welt.length]!;
    doppelteFlaeche += x1 * y2 - x2 * y1;
  }
  return Math.abs(doppelteFlaeche) / 2;
}

// ---------------------------------------------------------------------------------------
// Grid-step distance — square, hex, and gridless, per TacticalGrid (tactical-map.ts)
// ---------------------------------------------------------------------------------------

/**
 * Deliberately not called "chebyshev | euclidean" alone and defaulted: a square grid's step
 * count is genuinely ambiguous between "no diagonal discount" (Chebyshev; common tabletop rule)
 * and true geometric distance (Euclidean). Picking one silently would be exactly the kind of
 * plausible-wrong-number this module exists to refuse, so {@link rasterEntfernung} requires the
 * caller to name one for a square grid instead of defaulting.
 */
export type QuadratMetrik = "chebyshev" | "euklidisch";

/**
 * Fractional axial (q, r) hex coordinates for a local raster point, per Red Blob Games' standard
 * pixel-to-hex formulas (screen coordinates, downward y — the same convention `TacticalGrid`
 * geometry already uses). `offset` (even/odd) is deliberately not consulted: it only disambiguates
 * *row/column storage addressing* for a rectangular hex array, never the continuous pixel
 * geometry, which is already fully determined by `size` + `orientation` + `origin`.
 */
function achsial(
  gitter: Extract<TacticalGrid, { readonly kind: "hex" }>,
  punkt: Punkt,
): readonly [number, number] {
  const x = punkt[0] - gitter.origin[0];
  const y = punkt[1] - gitter.origin[1];
  const wurzel3 = Math.sqrt(3);
  if (gitter.orientation === "pointy") {
    return [((wurzel3 / 3) * x - (1 / 3) * y) / gitter.size, ((2 / 3) * y) / gitter.size];
  }
  return [((2 / 3) * x) / gitter.size, ((-1 / 3) * x + (wurzel3 / 3) * y) / gitter.size];
}

/** Cube-coordinate hex distance (`(|dq|+|dr|+|ds|)/2`, with `s = -q-r`), evaluated on the
 * fractional axial coordinates directly — exact for points on hex centers, and well-defined
 * (not just "rounded to the nearest hex") for any point in between. */
function hexAbstand(
  gitter: Extract<TacticalGrid, { readonly kind: "hex" }>,
  a: Punkt,
  b: Punkt,
): number {
  const [qa, ra] = achsial(gitter, a);
  const [qb, rb] = achsial(gitter, b);
  const dq = qa - qb;
  const dr = ra - rb;
  const ds = -dq - dr;
  return (Math.abs(dq) + Math.abs(dr) + Math.abs(ds)) / 2;
}

/**
 * Distance between two local raster points expressed in grid steps, for whichever of the three
 * grid kinds the product ships (`square`, `hex`, `none`). Operates in raster/pixel space, not
 * world space: a grid's `size`/`origin` are declared in image pixels (see `TacticalGrid`), so
 * there is nothing here for `nachWelt` to do.
 *
 * `quadratMetrik` is required — not defaulted — when `gitter.kind === "square"`; see
 * {@link QuadratMetrik}. It is accepted but ignored for `hex`/`none`, where only one sane metric
 * exists (the hex cube metric; plain Euclidean pixel distance, respectively).
 */
export function rasterEntfernung(
  gitter: TacticalGrid,
  a: Punkt,
  b: Punkt,
  quadratMetrik?: QuadratMetrik,
): number {
  switch (gitter.kind) {
    case "square": {
      if (quadratMetrik === undefined) {
        throw new RangeError(
          "rasterEntfernung: a square grid supports both Chebyshev and Euclidean step counts; " +
            "the caller must name one explicitly via quadratMetrik. No metric is picked silently.",
        );
      }
      const spalte = (p: Punkt) => (p[0] - gitter.origin[0]) / gitter.size;
      const zeile = (p: Punkt) => (p[1] - gitter.origin[1]) / gitter.size;
      const dSpalte = spalte(a) - spalte(b);
      const dZeile = zeile(a) - zeile(b);
      return quadratMetrik === "chebyshev"
        ? Math.max(Math.abs(dSpalte), Math.abs(dZeile))
        : Math.sqrt(dSpalte * dSpalte + dZeile * dZeile);
    }
    case "hex":
      return hexAbstand(gitter, a, b);
    case "none":
      // No cell pitch exists to count steps in. Euclidean pixel distance is the only fallback
      // that does not invent a grid the map declared it does not have.
      return euklidisch(a, b);
    default: {
      const unerreichbar: never = gitter;
      throw new RangeError(`rasterEntfernung: unhandled grid kind ${JSON.stringify(unerreichbar)}`);
    }
  }
}
