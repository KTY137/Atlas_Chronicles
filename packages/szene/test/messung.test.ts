import { describe, expect, it } from "vitest";
import {
  entfernung,
  flaeche,
  nachRahmen,
  nachWelt,
  pfadlaenge,
  rasterEntfernung,
  type Punkt,
} from "../src/messung.ts";
import type { Rahmen } from "../src/model.ts";
import type { TacticalGrid } from "../src/tactical-map.ts";

/** Deterministic PRNG (mulberry32) — property-style coverage without CI flakiness. */
function zufallsgenerator(saat: number): () => number {
  let a = saat >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rahmenMit = (teile: Partial<Rahmen>): Rahmen => ({
  ursprung: [0, 0],
  einheitenProPixel: 1,
  ordnung: "xy",
  hoch: "unten",
  ...teile,
});

describe("nachWelt / nachRahmen — frame <-> world is an exact round trip", () => {
  const zufall = zufallsgenerator(1337);
  const kombinationen = [
    ["xy", "oben"],
    ["xy", "unten"],
    ["yx", "oben"],
    ["yx", "unten"],
  ] as const;

  it.each(kombinationen)(
    "recovers 50 random pixel points for ordnung=%s hoch=%s",
    (ordnung, hoch) => {
      const rahmen = rahmenMit({
        ursprung: [zufall() * 200 - 100, zufall() * 200 - 100],
        einheitenProPixel: 0.1 + zufall() * 5,
        ordnung,
        hoch,
      });
      for (let i = 0; i < 50; i++) {
        const pixel: Punkt = [zufall() * 2000 - 1000, zufall() * 2000 - 1000];
        const zurueck = nachRahmen(rahmen, nachWelt(rahmen, pixel));
        expect(zurueck[0]).toBeCloseTo(pixel[0], 8);
        expect(zurueck[1]).toBeCloseTo(pixel[1], 8);
      }
    },
  );
});

describe("nachWelt — ordnung and hoch are interpreted, not ignored", () => {
  it("hoch: oben really flips the vertical axis relative to hoch: unten", () => {
    const unten = rahmenMit({ hoch: "unten" });
    const oben = rahmenMit({ hoch: "oben" });
    const pixel: Punkt = [7, 5];
    expect(nachWelt(unten, pixel)).toEqual([7, 5]);
    expect(nachWelt(oben, pixel)).toEqual([7, -5]);
  });

  it("ordnung: yx really swaps the axis order relative to xy", () => {
    const xy = rahmenMit({ ursprung: [100, 200] });
    const yx = rahmenMit({ ursprung: [100, 200], ordnung: "yx" });
    const pixel: Punkt = [3, 9];
    // dx=3, dy=9 (hoch: unten, no flip). xy -> ursprung+[dx,dy]; yx -> ursprung+[dy,dx].
    expect(nachWelt(xy, pixel)).toEqual([103, 209]);
    expect(nachWelt(yx, pixel)).toEqual([109, 203]);
  });
});

describe("entfernung — distance in the frame's own units", () => {
  it("is symmetric", () => {
    const rahmen = rahmenMit({ ursprung: [3, -2], einheitenProPixel: 2, ordnung: "yx", hoch: "oben" });
    const a: Punkt = [10, 5];
    const b: Punkt = [-4, 22];
    expect(entfernung(rahmen, a, b)).toBeCloseTo(entfernung(rahmen, b, a), 12);
  });

  it("scales linearly with einheitenProPixel", () => {
    const basis = rahmenMit({});
    const skaliert = rahmenMit({ einheitenProPixel: 4 });
    const a: Punkt = [0, 0];
    const b: Punkt = [3, 4];
    expect(entfernung(skaliert, a, b)).toBeCloseTo(entfernung(basis, a, b) * 4, 12);
  });

  it("is unaffected by ordnung/hoch alone (both are isometries of the plane)", () => {
    const a: Punkt = [12, -7];
    const b: Punkt = [-3, 40];
    const referenz = entfernung(rahmenMit({}), a, b);
    for (const ordnung of ["xy", "yx"] as const) {
      for (const hoch of ["oben", "unten"] as const) {
        expect(entfernung(rahmenMit({ ordnung, hoch }), a, b)).toBeCloseTo(referenz, 12);
      }
    }
  });
});

describe("pfadlaenge — path length", () => {
  it("sums consecutive segment distances", () => {
    const rahmen = rahmenMit({ einheitenProPixel: 2 });
    const p0: Punkt = [0, 0];
    const p1: Punkt = [3, 4];
    const p2: Punkt = [3, 16];
    const erwartet = entfernung(rahmen, p0, p1) + entfernung(rahmen, p1, p2);
    expect(pfadlaenge(rahmen, [p0, p1, p2])).toBeCloseTo(erwartet, 12);
  });

  it("is zero for fewer than two points", () => {
    const rahmen = rahmenMit({});
    expect(pfadlaenge(rahmen, [[5, 5]])).toBe(0);
    expect(pfadlaenge(rahmen, [])).toBe(0);
  });
});

describe("flaeche — shoelace area, absolute", () => {
  it("of a unit square is 1", () => {
    const rahmen = rahmenMit({});
    const quadrat: Punkt[] = [[0, 0], [1, 0], [1, 1], [0, 1]];
    expect(flaeche(rahmen, quadrat)).toBeCloseTo(1, 12);
  });

  it("scales with the square of einheitenProPixel", () => {
    const basis = rahmenMit({});
    const skaliert = rahmenMit({ einheitenProPixel: 3 });
    const quadrat: Punkt[] = [[0, 0], [2, 0], [2, 2], [0, 2]];
    expect(flaeche(skaliert, quadrat)).toBeCloseTo(flaeche(basis, quadrat) * 9, 9);
  });

  it("of a right triangle matches base*height/2", () => {
    const rahmen = rahmenMit({});
    const dreieck: Punkt[] = [[0, 0], [6, 0], [0, 4]];
    expect(flaeche(rahmen, dreieck)).toBeCloseTo(12, 12);
  });

  it("sums both lobes of a self-touching polygon (a bowtie meeting at one shared vertex)", () => {
    const rahmen = rahmenMit({});
    // Two right triangles (legs 4,4 -> area 8 each) joined only at the shared origin vertex,
    // both wound the same direction, so shoelace adds them: 8 + 8 = 16.
    const schmetterling: Punkt[] = [[0, 0], [4, 0], [4, 4], [0, 0], [-4, 0], [-4, -4]];
    expect(flaeche(rahmen, schmetterling)).toBeCloseTo(16, 9);
  });

  it("is orientation-independent (reversing winding keeps the same absolute area)", () => {
    const rahmen = rahmenMit({});
    const vorwaerts: Punkt[] = [[0, 0], [5, 0], [5, 3], [0, 3]];
    const rueckwaerts = [...vorwaerts].reverse();
    expect(flaeche(rahmen, rueckwaerts)).toBeCloseTo(flaeche(rahmen, vorwaerts), 12);
  });

  it("of a degenerate 2-point polygon is zero", () => {
    const rahmen = rahmenMit({});
    expect(flaeche(rahmen, [[0, 0], [10, 10]])).toBe(0);
    expect(flaeche(rahmen, [[0, 0]])).toBe(0);
    expect(flaeche(rahmen, [])).toBe(0);
  });
});

describe("rasterEntfernung — square grid requires an explicit metric", () => {
  const gitter: TacticalGrid = { kind: "square", size: 10, origin: [0, 0] };

  it("throws instead of silently picking a metric", () => {
    expect(() => rasterEntfernung(gitter, [0, 0], [30, 40])).toThrow(/quadratMetrik/);
  });

  it("computes distinct Chebyshev and Euclidean step counts for a diagonal move", () => {
    const a: Punkt = [0, 0];
    const b: Punkt = [30, 40]; // 3 cells right, 4 cells down
    expect(rasterEntfernung(gitter, a, b, "chebyshev")).toBeCloseTo(4, 9);
    expect(rasterEntfernung(gitter, a, b, "euklidisch")).toBeCloseTo(5, 9); // 3-4-5 triangle
  });

  it("respects a non-zero grid origin", () => {
    const versetzt: TacticalGrid = { kind: "square", size: 10, origin: [5, 5] };
    expect(rasterEntfernung(versetzt, [5, 5], [35, 5], "chebyshev")).toBeCloseTo(3, 9);
  });
});

describe("rasterEntfernung — hex grid matches known small cases", () => {
  const groesse = 10;
  /** Independent reimplementation of pointy hex_to_pixel, used only to build fixtures — not
   * shared code with messung.ts's pixel_to_hex, so this cross-checks the inverse relationship. */
  const pointyMitte = (q: number, r: number): Punkt => [
    groesse * (Math.sqrt(3) * q + (Math.sqrt(3) / 2) * r),
    groesse * (1.5 * r),
  ];
  const gitter: TacticalGrid = { kind: "hex", size: groesse, origin: [0, 0], orientation: "pointy", offset: "odd" };

  it.each([
    [[0, 0], [0, 0], 0],
    [[0, 0], [1, 0], 1],
    [[0, 0], [0, 1], 1],
    [[0, 0], [1, -1], 1],
    [[0, 0], [2, -1], 2],
    [[1, 0], [-1, 0], 2],
    [[2, 0], [0, 2], 2],
  ] as const)("axial %j to %j is %d step(s)", (aAxial, bAxial, erwartet) => {
    const a = pointyMitte(aAxial[0], aAxial[1]);
    const b = pointyMitte(bAxial[0], bAxial[1]);
    expect(rasterEntfernung(gitter, a, b)).toBeCloseTo(erwartet, 9);
  });

  it("ignores the fourth argument (metric choice is meaningless for hexes)", () => {
    const a = pointyMitte(0, 0);
    const b = pointyMitte(2, -1);
    expect(rasterEntfernung(gitter, a, b, "chebyshev")).toBeCloseTo(2, 9);
  });

  it("also works for flat-orientation hexes", () => {
    const flach: TacticalGrid = { kind: "hex", size: groesse, origin: [0, 0], orientation: "flat", offset: "even" };
    const flatMitte = (q: number, r: number): Punkt => [
      groesse * (1.5 * q),
      groesse * ((Math.sqrt(3) / 2) * q + Math.sqrt(3) * r),
    ];
    expect(rasterEntfernung(flach, flatMitte(0, 0), flatMitte(2, -1))).toBeCloseTo(2, 9);
  });
});

describe("rasterEntfernung — gridless falls back to Euclidean pixel distance", () => {
  it("matches a plain 3-4-5 Euclidean distance", () => {
    const gitter: TacticalGrid = { kind: "none" };
    expect(rasterEntfernung(gitter, [0, 0], [3, 4])).toBeCloseTo(5, 9);
  });
});
