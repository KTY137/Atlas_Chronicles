import { performance } from "node:perf_hooks";
import { describe, expect, it } from "vitest";
import { planeStapel } from "../src/stapel.ts";
import type { MapCamera, ProjectedMapStamp } from "../src/model.ts";

const IDENTITAET: MapCamera = { x: 0, y: 0, scale: 1 };
const VIEWPORT: readonly [number, number] = [800, 600];

function stempel(overrides: Partial<ProjectedMapStamp> & Pick<ProjectedMapStamp, "id">): ProjectedMapStamp {
  return { asset: "pk.wald/baum", x: 100, y: 100, s: 1, r: 0, l: 0, ...overrides };
}

describe("planeStapel — viewport cull", () => {
  it("keeps every stamp visible when the camera comfortably covers the whole map", () => {
    const stamps = Array.from({ length: 25 }, (_, i) => stempel({ id: `s${i}`, x: (i % 5) * 100 + 50, y: Math.floor(i / 5) * 100 + 50 }));
    const plan = planeStapel(stamps, IDENTITAET, VIEWPORT);
    expect(plan.sichtbar).toBe(25);
    expect(plan.verworfen).toBe(0);
  });

  it("discards every stamp when the camera is panned far away from the map", () => {
    const stamps = Array.from({ length: 10 }, (_, i) => stempel({ id: `s${i}`, x: i * 10, y: i * 10 }));
    const camera: MapCamera = { x: -1_000_000, y: -1_000_000, scale: 1 };
    const plan = planeStapel(stamps, camera, VIEWPORT);
    expect(plan.sichtbar).toBe(0);
    expect(plan.verworfen).toBe(10);
    expect(plan.buendel).toEqual([]);
  });

  it("keeps a large rotated stamp whose center sits just outside the viewport edge (the point-test trap)", () => {
    // Screen-space center at x=850 is 50px past the right edge (viewport width 800) — a naive
    // point-in-viewport test rejects this outright. A large scale gives it a footprint that still
    // overlaps the viewport once rotated, so the correct answer is KEEP.
    const stamp = stempel({ id: "riese", x: 850, y: 300, s: 5, r: Math.PI / 4 });
    const plan = planeStapel([stamp], IDENTITAET, VIEWPORT);
    expect(plan.sichtbar).toBe(1);
    expect(plan.verworfen).toBe(0);
  });

  it("culls a small stamp whose center sits just outside the viewport edge", () => {
    // Same edge offset as the previous test, but a stamp-scale footprint too small to reach back in —
    // proves the cull is not simply "always keep near the edge."
    const stamp = stempel({ id: "klein", x: 850, y: 300, s: 1, r: Math.PI / 4 });
    const plan = planeStapel([stamp], IDENTITAET, VIEWPORT);
    expect(plan.sichtbar).toBe(0);
    expect(plan.verworfen).toBe(1);
  });

  it("is invariant to rotation angle for the same position and scale", () => {
    // The bounding circle used for culling does not depend on `r`; the renderer alone reads it.
    const a = planeStapel([stempel({ id: "a", x: 850, y: 300, s: 5, r: 0 })], IDENTITAET, VIEWPORT);
    const b = planeStapel([stempel({ id: "a", x: 850, y: 300, s: 5, r: 2.4 })], IDENTITAET, VIEWPORT);
    expect(a.sichtbar).toBe(b.sichtbar);
  });
});

describe("planeStapel — bucketing", () => {
  it("groups visible stamps into buckets by asset", () => {
    const stamps = [
      stempel({ id: "a1", asset: "pk.wald/baum" }),
      stempel({ id: "a2", asset: "pk.wald/fels" }),
      stempel({ id: "a3", asset: "pk.wald/baum" }),
    ];
    const plan = planeStapel(stamps, IDENTITAET, VIEWPORT);
    expect(plan.buendel.map((b) => b.asset)).toEqual(["pk.wald/baum", "pk.wald/fels"]);
    expect(plan.buendel.find((b) => b.asset === "pk.wald/baum")?.stamps.map((s) => s.id)).toEqual(["a1", "a3"]);
  });

  it("orders stamps inside a bucket by layer then id, regardless of input order", () => {
    const stamps = [
      stempel({ id: "z", asset: "pk.wald/baum", l: 2 }),
      stempel({ id: "a", asset: "pk.wald/baum", l: 0 }),
      stempel({ id: "m", asset: "pk.wald/baum", l: 0 }),
      stempel({ id: "b", asset: "pk.wald/baum", l: 1 }),
    ];
    const plan = planeStapel(stamps, IDENTITAET, VIEWPORT);
    const order = plan.buendel[0]!.stamps.map((s) => s.id);
    expect(order).toEqual(["a", "m", "b", "z"]);
  });

  it("orders buckets deterministically by asset name", () => {
    const stamps = [
      stempel({ id: "1", asset: "pk.wald/zeder" }),
      stempel({ id: "2", asset: "pk.wald/ahorn" }),
      stempel({ id: "3", asset: "pk.wald/buche" }),
    ];
    const plan = planeStapel(stamps, IDENTITAET, VIEWPORT);
    expect(plan.buendel.map((b) => b.asset)).toEqual(["pk.wald/ahorn", "pk.wald/buche", "pk.wald/zeder"]);
  });

  it("counts distinct assets for texturen, not total stamp count", () => {
    const stamps = Array.from({ length: 40 }, (_, i) => stempel({ id: `s${i}`, asset: i % 3 === 0 ? "pk.wald/baum" : i % 3 === 1 ? "pk.wald/fels" : "pk.wald/busch" }));
    const plan = planeStapel(stamps, IDENTITAET, VIEWPORT);
    expect(plan.sichtbar).toBe(40);
    expect(plan.texturen).toBe(3);
  });
});

describe("planeStapel — massenmodus", () => {
  it("stays false at exactly the default massenAb threshold", () => {
    const stamps = Array.from({ length: 2_000 }, (_, i) => stempel({ id: `s${i}` }));
    expect(planeStapel(stamps, IDENTITAET, VIEWPORT).massenmodus).toBe(false);
  });

  it("flips true past the default massenAb threshold", () => {
    const stamps = Array.from({ length: 2_001 }, (_, i) => stempel({ id: `s${i}` }));
    expect(planeStapel(stamps, IDENTITAET, VIEWPORT).massenmodus).toBe(true);
  });

  it("is overridable: a raised massenAb keeps a large scene out of bulk mode", () => {
    const stamps = Array.from({ length: 2_001 }, (_, i) => stempel({ id: `s${i}` }));
    expect(planeStapel(stamps, IDENTITAET, VIEWPORT, { massenAb: 5_000 }).massenmodus).toBe(false);
  });

  it("flips true when distinct textures exceed maxTexturen, even with few stamps", () => {
    const stamps = Array.from({ length: 17 }, (_, i) => stempel({ id: `s${i}`, asset: `pk.wald/art-${i}` }));
    const plan = planeStapel(stamps, IDENTITAET, VIEWPORT);
    expect(plan.sichtbar).toBeLessThan(2_000); // far under the stamp-count threshold; texture count alone triggers it
    expect(plan.texturen).toBe(17);
    expect(plan.massenmodus).toBe(true);
  });

  it("is overridable: a raised maxTexturen keeps a texture-heavy scene out of bulk mode", () => {
    const stamps = Array.from({ length: 17 }, (_, i) => stempel({ id: `s${i}`, asset: `pk.wald/art-${i}` }));
    const plan = planeStapel(stamps, IDENTITAET, VIEWPORT, { maxTexturen: 32 });
    expect(plan.massenmodus).toBe(false);
  });
});

describe("planeStapel — determinism and edges", () => {
  it("produces an identical plan for the same stamps regardless of arrival order", () => {
    const stamps = Array.from({ length: 200 }, (_, i) => stempel({ id: `s${i}`, asset: `pk.wald/art-${i % 7}`, x: (i * 37) % 800, y: (i * 53) % 600, l: i % 4 }));
    const shuffled = [...stamps].reverse();
    const planA = planeStapel(stamps, IDENTITAET, VIEWPORT);
    const planB = planeStapel(shuffled, IDENTITAET, VIEWPORT);
    expect(planB).toEqual(planA);
  });

  it("accounts for every input stamp between visible and discarded", () => {
    const stamps = Array.from({ length: 123 }, (_, i) => stempel({ id: `s${i}`, x: i % 2 === 0 ? 100 : -1_000_000 }));
    const plan = planeStapel(stamps, IDENTITAET, VIEWPORT);
    expect(plan.sichtbar + plan.verworfen).toBe(123);
  });

  it("returns all zeroes and an empty buendel for empty input", () => {
    const plan = planeStapel([], IDENTITAET, VIEWPORT);
    expect(plan).toEqual({ buendel: [], verworfen: 0, sichtbar: 0, texturen: 0, massenmodus: false });
  });

  it("plans 50,000 stamps within a frame-scale CPU budget — the planning half of S-K1", () => {
    const stamps: ProjectedMapStamp[] = Array.from({ length: 50_000 }, (_, i) => stempel({
      id: `s${i}`,
      asset: `pk.wald/art-${i % 12}`,
      x: (i * 97) % 10_000,
      y: (i * 131) % 10_000,
      s: 1 + (i % 5) * 0.5,
      r: (i % 8) * (Math.PI / 4),
      l: i % 6,
    }));
    // A wide, zoomed-out camera so a realistic fraction — not all, not none — survives the cull.
    const camera: MapCamera = { x: -1_000, y: -1_000, scale: 0.3 };
    const start = performance.now();
    const plan = planeStapel(stamps, camera, VIEWPORT);
    const elapsedMs = performance.now() - start;
    // eslint-disable-next-line no-console
    console.log(`[S-K1 CPU planning] 50,000 stamps: ${elapsedMs.toFixed(3)} ms, ${plan.sichtbar} visible, ${plan.texturen} textures, massenmodus=${plan.massenmodus}`);
    expect(plan.sichtbar + plan.verworfen).toBe(50_000);
    expect(plan.texturen).toBeLessThanOrEqual(12);
    // Not a hard perf assertion (this reports the number, per the brief, rather than asserting it) —
    // only a sanity ceiling so a real algorithmic regression (e.g. an accidental O(n^2)) still fails.
    expect(elapsedMs).toBeLessThan(1_000);
  });
});
