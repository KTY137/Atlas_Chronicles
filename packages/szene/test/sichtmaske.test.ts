// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { describe, expect, it } from "vitest";
import { baueMaske, erweitereMaske, type Maske } from "../src/sichtmaske.ts";
import type { Region } from "../src/model.ts";

/** Deterministic PRNG (mulberry32) so the property test is reproducible across runs/CI. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function region(id: string, seedX: number): Region {
  // Points are derived from the id/seed so polygons are distinguishable in multiset comparisons.
  return { id, punkte: [[seedX, 0], [seedX + 10, 0], [seedX + 10, 10], [seedX, 10]] };
}

function regions(n: number): Region[] {
  return Array.from({ length: n }, (_, i) => region(`r${i}`, i * 100));
}

/** Order-independent comparison: `sichtbar` carries no id per polygon by design (see the
 * `Kein Nenner` comment in sichtmaske.ts), and `baueMaske`/`erweitereMaske` are free to return
 * polygons in different orders (map order vs. reveal-append order) for the same logical mask.
 * "Exactly the same result" therefore means the same multiset of polygons plus the same
 * `enthuellt` set plus the same version — not the same array order. */
function multiset(polys: readonly (readonly (readonly [number, number])[])[]): string[] {
  return polys.map((p) => JSON.stringify(p)).sort();
}
function assertSameMask(a: Maske, b: Maske): void {
  expect(multiset(a.sichtbar)).toEqual(multiset(b.sichtbar));
  expect([...a.enthuellt].sort()).toEqual([...b.enthuellt].sort());
  expect(a.version).toBe(b.version);
}

describe("baueMaske — full rebuild from an id set", () => {
  it("empty reveal yields an empty mask", () => {
    const maske = baueMaske({ regionen: regions(5), enthuellt: new Set() });
    expect(maske.sichtbar).toEqual([]);
    expect(maske.enthuellt.size).toBe(0);
    expect(maske.version).toBe(0);
  });

  it("reveals exactly one region", () => {
    const rs = regions(5);
    const maske = baueMaske({ regionen: rs, enthuellt: new Set(["r2"]) });
    expect(maske.sichtbar).toEqual([rs[2]!.punkte]);
    expect(maske.enthuellt).toEqual(new Set(["r2"]));
    expect(maske.version).toBe(1);
  });

  it("ignores an unknown id silently instead of throwing or leaking a mismatch count", () => {
    const rs = regions(3);
    const maske = baueMaske({ regionen: rs, enthuellt: new Set(["r1", "geist"]) });
    expect(maske.sichtbar).toEqual([rs[1]!.punkte]);
    expect(maske.enthuellt).toEqual(new Set(["r1"])); // the stale id is dropped, not echoed back
    expect(maske.version).toBe(1); // sichtbar.length === enthuellt.size — no silent divergence
  });

  it("Kein Nenner: the output never contains an id the viewer did not hold, for many random sets", () => {
    const rs = regions(40);
    const gen = rng(7);
    for (let i = 0; i < 50; i++) {
      const held = new Set(rs.filter(() => gen() < 0.3).map((r) => r.id));
      const maske = baueMaske({ regionen: rs, enthuellt: held });
      for (const id of maske.enthuellt) expect(held.has(id)).toBe(true);
      // and nothing about the 40-region map's total size leaks through the shape of the result:
      expect(maske.sichtbar.length).toBe(maske.enthuellt.size);
    }
  });
});

describe("erweitereMaske — incremental agreement with a full rebuild", () => {
  it("revealing the same id twice is idempotent", () => {
    const rs = regions(4);
    const once = erweitereMaske(baueMaske({ regionen: rs, enthuellt: new Set() }), rs, ["r0"]);
    const twice = erweitereMaske(once, rs, ["r0"]);
    assertSameMask(once, twice);
    expect(twice.sichtbar.length).toBe(1);
  });

  it("revealing an unknown id changes nothing", () => {
    const rs = regions(4);
    const before = baueMaske({ regionen: rs, enthuellt: new Set(["r0"]) });
    const after = erweitereMaske(before, rs, ["geist"]);
    assertSameMask(before, after);
  });

  it("version increases only on an actual, novel reveal", () => {
    const rs = regions(4);
    const v0 = baueMaske({ regionen: rs, enthuellt: new Set() });
    const v1 = erweitereMaske(v0, rs, ["r0"]);
    expect(v1.version).toBeGreaterThan(v0.version);
    const v1Again = erweitereMaske(v1, rs, ["r0", "geist"]); // duplicate + unknown: no-op
    expect(v1Again.version).toBe(v1.version);
    const v2 = erweitereMaske(v1Again, rs, ["r1"]);
    expect(v2.version).toBeGreaterThan(v1.version);
  });

  it("agrees with a full rebuild over 200+ random incremental sequences (the correctness claim)", () => {
    const gen = rng(1234);
    const rs = regions(30);
    for (let trial = 0; trial < 250; trial++) {
      const initial = new Set(rs.filter(() => gen() < 0.2).map((r) => r.id));
      const additions = rs.filter(() => gen() < 0.2).map((r) => r.id);
      // Sprinkle in stale ids and re-reveals of ids already in `initial` to exercise both
      // silent-ignore paths inside the same property run, not just the dedicated unit tests.
      additions.push("geist-" + trial, ...[...initial].slice(0, 1));

      const full = baueMaske({ regionen: rs, enthuellt: new Set([...initial, ...additions]) });
      const incremental = erweitereMaske(baueMaske({ regionen: rs, enthuellt: initial }), rs, additions);
      assertSameMask(full, incremental);
    }
  });
});

describe("large input performance", () => {
  it("completes for 2000 regions and reports measured incremental vs. rebuild cost", () => {
    const rs = regions(2000);
    const gen = rng(99);
    const revealOrder = rs.map((r) => r.id).sort(() => gen() - 0.5).slice(0, 800);

    let maske = baueMaske({ regionen: rs, enthuellt: new Set() });
    const incrementalStart = performance.now();
    for (const id of revealOrder) maske = erweitereMaske(maske, rs, [id]);
    const incrementalTotalMs = performance.now() - incrementalStart;
    const perIncrementalRevealMs = incrementalTotalMs / revealOrder.length;

    expect(maske.enthuellt.size).toBe(800);
    expect(maske.sichtbar.length).toBe(800);

    const rebuildStart = performance.now();
    const rebuilt = baueMaske({ regionen: rs, enthuellt: maske.enthuellt });
    const rebuildMs = performance.now() - rebuildStart;

    assertSameMask(maske, rebuilt);

    // eslint-disable-next-line no-console
    console.log(
      `sichtmaske perf: ${perIncrementalRevealMs.toFixed(2)} ms per incremental reveal ` +
        `(${incrementalTotalMs.toFixed(2)} ms / ${revealOrder.length} reveals); ` +
        `${rebuildMs.toFixed(2)} ms full rebuild at 800/2000 revealed ` +
        `(corpus reference: 9.38 ms/reveal, 386 ms rebuild — not asserted here)`,
    );
  });
});
