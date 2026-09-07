// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { describe, expect, it } from "vitest";
import { gitterFeld, zelleBei, zellenMitte } from "../src/gitter-feld.ts";
import type { TacticalGrid } from "@chronicle/szene";
import type { MapCamera } from "../src/model.ts";

// Small deterministic PRNG (mulberry32) so "many random points" is reproducible across runs
// without pulling in a test dependency.
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function intIn(next: () => number, lo: number, hi: number): number { return lo + Math.floor(next() * (hi - lo + 1)); }

const SQUARE: TacticalGrid = { kind: "square", size: 40, origin: [13, -7] };
const HEX_POINTY: TacticalGrid = { kind: "hex", size: 25, origin: [5, 11], orientation: "pointy", offset: "odd" };
const HEX_FLAT: TacticalGrid = { kind: "hex", size: 25, origin: [5, 11], orientation: "flat", offset: "even" };
const CAM: MapCamera = { x: 100, y: -40, scale: 1 };

describe("gitterFeld: procedural grid uniforms (RB-02 CPU half)", () => {
  it("round-trips zellenMitte -> zelleBei for many random square cells", () => {
    const next = rng(1);
    for (let i = 0; i < 200; i++) {
      const cell = [intIn(next, -500, 500), intIn(next, -500, 500)] as const;
      expect(zelleBei(SQUARE, zellenMitte(SQUARE, cell))).toEqual(cell);
    }
  });

  it("round-trips zellenMitte -> zelleBei for many random pointy-hex cells", () => {
    const next = rng(2);
    for (let i = 0; i < 200; i++) {
      const cell = [intIn(next, -200, 200), intIn(next, -200, 200)] as const;
      expect(zelleBei(HEX_POINTY, zellenMitte(HEX_POINTY, cell))).toEqual(cell);
    }
  });

  it("round-trips zellenMitte -> zelleBei for many random flat-hex cells", () => {
    const next = rng(3);
    for (let i = 0; i < 200; i++) {
      const cell = [intIn(next, -200, 200), intIn(next, -200, 200)] as const;
      expect(zelleBei(HEX_FLAT, zellenMitte(HEX_FLAT, cell))).toEqual(cell);
    }
  });

  it("resolves square boundary points with the stated rule: top/left-inclusive, bottom/right-exclusive", () => {
    const [ox, oy] = SQUARE.kind === "square" ? SQUARE.origin : [0, 0], s = 40;
    // Exactly on the shared edge between cell 2 and cell 3 belongs to cell 3 (the higher index).
    expect(zelleBei(SQUARE, [ox + 3 * s, oy + 5 * s + 1])).toEqual([3, 5]);
    // One ULP-scale step below the edge still belongs to the lower cell.
    expect(zelleBei(SQUARE, [ox + 3 * s - 1e-9, oy + 5 * s + 1])).toEqual([2, 5]);
    // The rule is symmetric across zero: the boundary at the origin itself is cell 0, not -1.
    expect(zelleBei(SQUARE, [ox, oy])).toEqual([0, 0]);
    expect(zelleBei(SQUARE, [ox - 1e-9, oy])).toEqual([-1, 0]);
  });

  it("resolves a hex edge-shared point deterministically (same cell on repeated calls)", () => {
    const centreA = zellenMitte(HEX_POINTY, [0, 0]);
    const centreB = zellenMitte(HEX_POINTY, [1, 0]);
    const midpoint = [(centreA[0] + centreB[0]) / 2, (centreA[1] + centreB[1]) / 2] as const;
    const first = zelleBei(HEX_POINTY, midpoint);
    const second = zelleBei(HEX_POINTY, midpoint);
    expect(second).toEqual(first);
    // Whatever the tie-break picks, it must be one of the two hexes that actually share that edge.
    expect(first[0] === 0 || first[0] === 1).toBe(true);
    expect(first[1]).toBe(0);
  });

  it("hex neighbours of a cell are exactly six, and each is adjacent (shared-edge distance)", () => {
    const centre = zellenMitte(HEX_POINTY, [4, -2]);
    const offsets: readonly (readonly [number, number])[] = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
    expect(offsets).toHaveLength(6);
    const expectedDistance = 25 * Math.sqrt(3); // circumradius s -> centre-to-centre distance across a shared edge
    for (const [dq, dr] of offsets) {
      const neighbourCell = [4 + dq, -2 + dr] as const;
      const neighbourCentre = zellenMitte(HEX_POINTY, neighbourCell);
      const distance = Math.hypot(neighbourCentre[0] - centre[0], neighbourCentre[1] - centre[1]);
      expect(distance).toBeCloseTo(expectedDistance, 6);
      // Adjacency must agree with picking: a point nudged 90% of the way toward the
      // neighbour's centre must already resolve to the neighbour, not to the origin cell.
      const nudged = [centre[0] + (neighbourCentre[0] - centre[0]) * 0.9, centre[1] + (neighbourCentre[1] - centre[1]) * 0.9] as const;
      expect(zelleBei(HEX_POINTY, nudged)).toEqual(neighbourCell);
    }
  });

  it("sichtbareZellen grows as the camera zooms out and shrinks as it zooms in (square)", () => {
    const viewport = [800, 600] as const;
    const zoomedIn = gitterFeld(SQUARE, { ...CAM, scale: 4 }, viewport).sichtbareZellen;
    const neutral = gitterFeld(SQUARE, { ...CAM, scale: 1 }, viewport).sichtbareZellen;
    const zoomedOut = gitterFeld(SQUARE, { ...CAM, scale: 0.25 }, viewport).sichtbareZellen;
    expect(zoomedIn).toBeLessThan(neutral);
    expect(neutral).toBeLessThan(zoomedOut);
  });

  it("sichtbareZellen grows as the camera zooms out and shrinks as it zooms in (hex)", () => {
    const viewport = [800, 600] as const;
    const zoomedIn = gitterFeld(HEX_POINTY, { ...CAM, scale: 4 }, viewport).sichtbareZellen;
    const neutral = gitterFeld(HEX_POINTY, { ...CAM, scale: 1 }, viewport).sichtbareZellen;
    const zoomedOut = gitterFeld(HEX_POINTY, { ...CAM, scale: 0.25 }, viewport).sichtbareZellen;
    expect(zoomedIn).toBeLessThan(neutral);
    expect(neutral).toBeLessThan(zoomedOut);
  });

  it("'keines' yields no lattice and a defined, non-throwing fallback", () => {
    const none: TacticalGrid = { kind: "none" };
    const field = gitterFeld(none, CAM, [800, 600]);
    expect(field.art).toBe("keines");
    expect(field.ursprung).toEqual([0, 0]);
    expect(field.schritt).toEqual([0, 0]);
    expect(field.sichtbareZellen).toBe(0);
    expect(field.hexOrientierung).toBeUndefined();
    expect(zelleBei(none, [123.45, -678.9])).toEqual([0, 0]);
    expect(zellenMitte(none, [7, 7])).toEqual([0, 0]);
  });

  it("is independent of viewport translation at fixed zoom: schritt is unchanged, ursprung shifts by the pan delta", () => {
    const viewport = [800, 600] as const;
    const a = gitterFeld(SQUARE, CAM, viewport);
    const panned: MapCamera = { ...CAM, x: CAM.x + 123, y: CAM.y - 456 };
    const b = gitterFeld(SQUARE, panned, viewport);
    expect(b.schritt).toEqual(a.schritt);
    expect(b.ursprung[0] - a.ursprung[0]).toBeCloseTo(123, 9);
    expect(b.ursprung[1] - a.ursprung[1]).toBeCloseTo(-456, 9);
  });

  it("keeps a full cell count identical under a pan by exactly whole cells (square)", () => {
    const viewport = [800, 600] as const;
    const a = gitterFeld(SQUARE, CAM, viewport);
    // Explicit whole-cell shift (3 cells) at fixed scale: the visible window slides by an exact
    // lattice period, so the shaded cell count must not change even though ursprung does.
    const cellSize = (SQUARE as Extract<TacticalGrid, { kind: "square" }>).size;
    const shifted: MapCamera = { ...CAM, x: CAM.x - cellSize * CAM.scale * 3 };
    const b = gitterFeld(SQUARE, shifted, viewport);
    expect(b.sichtbareZellen).toBe(a.sichtbareZellen);
  });

  it("line strength (staerke) stays one CSS pixel across camera scales", () => {
    const viewport = [800, 600] as const;
    for (const scale of [0.01, 0.25, 1, 4, 64]) {
      expect(gitterFeld(SQUARE, { ...CAM, scale }, viewport).staerke).toBe(1);
      expect(gitterFeld(HEX_POINTY, { ...CAM, scale }, viewport).staerke).toBe(1);
    }
  });

  it("maps grid kind and hex orientation onto the German 'art'/'hexOrientierung' fields", () => {
    const viewport = [800, 600] as const;
    expect(gitterFeld(SQUARE, CAM, viewport).art).toBe("quadrat");
    expect(gitterFeld(SQUARE, CAM, viewport).hexOrientierung).toBeUndefined();
    expect(gitterFeld(HEX_POINTY, CAM, viewport).art).toBe("hex");
    expect(gitterFeld(HEX_POINTY, CAM, viewport).hexOrientierung).toBe("spitz");
    expect(gitterFeld(HEX_FLAT, CAM, viewport).hexOrientierung).toBe("flach");
  });

  it("computes a huge extent's cell count in O(1) time without building a per-cell array", () => {
    const hugeGrid: TacticalGrid = { kind: "square", size: 1, origin: [0, 0] };
    const hugeCamera: MapCamera = { x: 0, y: 0, scale: 1 };
    const hugeViewport = [50_000_000, 50_000_000] as const;
    const start = performance.now();
    const field = gitterFeld(hugeGrid, hugeCamera, hugeViewport);
    const elapsedMs = performance.now() - start;
    // 50M x 50M unit cells at size 1 is 2.5e15 cells. An implementation that built an array
    // (or even a typed array) of that length would throw a RangeError or hang; this must
    // return the arithmetic count near-instantly instead.
    expect(field.sichtbareZellen).toBeGreaterThan(2e15);
    expect(Number.isFinite(field.sichtbareZellen)).toBe(true);
    expect(elapsedMs).toBeLessThan(50);
  });

  it("throws on non-finite camera, grid size, or viewport instead of silently degrading", () => {
    expect(() => gitterFeld(SQUARE, { x: Number.NaN, y: 0, scale: 1 }, [800, 600])).toThrow();
    expect(() => gitterFeld(SQUARE, CAM, [0, 600])).toThrow();
    expect(() => gitterFeld({ kind: "square", size: 0, origin: [0, 0] }, CAM, [800, 600])).toThrow();
    expect(() => zelleBei(SQUARE, [Number.NaN, 0])).toThrow();
  });
});
