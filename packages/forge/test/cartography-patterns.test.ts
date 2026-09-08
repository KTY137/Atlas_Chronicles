// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { describe, expect, it } from "vitest";
import { CARTOGRAPHY_PATTERNS, solveCartographyPatterns, type PatternCell } from "../src/cartography-patterns.ts";

describe("local cartography adjacency constraints", () => {
  it("connects pinned neighboring road ports and respects the fixed outside boundary", () => {
    const result = solveCartographyPatterns({ seed: "road", cells: [
      { x: 0, y: 0, candidates: ["road:2"] }, { x: 1, y: 0, candidates: ["road:1", "road:8", "terrain:grass"] },
    ] });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.assignments.map(cell => cell.pattern.id)).toEqual(["road:2", "road:8"]);
  });
  it("rejects incompatible fixed neighbors instead of displaying a disconnected road", () => {
    expect(solveCartographyPatterns({ seed: "closed", cells: [
      { x: 0, y: 0, candidates: ["road:2"] }, { x: 1, y: 0, candidates: ["terrain:grass"] },
    ] })).toMatchObject({ ok: false, code: "contradiction" });
  });
  it("requires the bridge pattern where independent water and road networks cross", () => {
    const result = solveCartographyPatterns({ seed: "bridge", cells: [{ x: 0, y: 0, candidates: CARTOGRAPHY_PATTERNS.map(value => value.id) }],
      boundary: [{ x: 0, y: 0, side: 0, port: "water" }, { x: 0, y: 0, side: 2, port: "water" },
        { x: 0, y: 0, side: 1, port: "road" }, { x: 0, y: 0, side: 3, port: "road" }] });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.assignments[0]!.pattern.id).toBe("bridge:ew");
  });
  it("does not invent open network ports at the selection boundary", () => {
    expect(solveCartographyPatterns({ seed: "edge", cells: [{ x: 0, y: 0, candidates: ["road:10"] }] })).toMatchObject({ ok: false, code: "contradiction" });
  });
  it("is deterministic even when the caller changes cell and candidate ordering", () => {
    const cells: PatternCell[] = Array.from({ length: 16 }, (_, i) => ({ x: i % 4, y: Math.floor(i / 4), candidates: ["terrain:grass", "terrain:forest", "terrain:field"] }));
    const before = JSON.stringify(cells), first = solveCartographyPatterns({ seed: "repeatable", cells });
    const second = solveCartographyPatterns({ seed: "repeatable", cells: [...cells].reverse().map(cell => ({ ...cell, candidates: [...cell.candidates].reverse() })) });
    expect(first.ok).toBe(true); expect(second).toEqual(first); expect(JSON.stringify(cells)).toBe(before);
    const other = solveCartographyPatterns({ seed: "different", cells }); expect(other.ok).toBe(true); expect(other).not.toEqual(first);
  });
  it("stops on a deterministic propagation budget and returns no partial assignments", () => {
    const result = solveCartographyPatterns({ seed: "budget", cells: [{ x: 0, y: 0, candidates: ["terrain:grass"] }], limits: { propagations: 0 } });
    expect(result).toMatchObject({ ok: false, code: "budget" }); expect(result).not.toHaveProperty("assignments");
  });
  it("backtracks an inconsistent network loop and reports exhaustion without leaking a partial grid", () => {
    // Three XOR corners and one equal corner cannot close. Each edge alone has support;
    // simple one-pass neighbor checks would wrongly accept this closed loop.
    const cells = [
      { x: 0, y: 0, candidates: ["road:2", "road:4"] }, { x: 1, y: 0, candidates: ["road:8", "road:4"] },
      { x: 1, y: 1, candidates: ["road:1", "road:8"] }, { x: 0, y: 1, candidates: ["terrain:grass", "road:3"] },
    ];
    const full = solveCartographyPatterns({ seed: "loop", cells });
    expect(full).toMatchObject({ ok: false, code: "contradiction" }); expect(full.statistics.backtracks).toBeGreaterThan(0);
    const bounded = solveCartographyPatterns({ seed: "loop", cells, limits: { backtracks: 0 } });
    expect(bounded).toMatchObject({ ok: false, code: "budget" }); expect(bounded).not.toHaveProperty("assignments");
  });
  it("rejects oversized, duplicate, nonintegral and unknown inputs before searching", () => {
    for (const cells of [
      Array.from({ length: 1025 }, (_, x) => ({ x, y: 0, candidates: ["terrain:grass"] })),
      [{ x: 0, y: 0, candidates: ["terrain:grass"] }, { x: 0, y: 0, candidates: ["terrain:grass"] }],
      [{ x: .5, y: 0, candidates: ["terrain:grass"] }], [{ x: 0, y: 0, candidates: ["missing"] }],
    ]) expect(solveCartographyPatterns({ cells, seed: "bad" }).ok).toBe(false);
  });
});
