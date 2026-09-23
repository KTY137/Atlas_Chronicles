// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { describe, expect, it } from "vitest";
import { rauschen } from "../src/kartenwerk.ts";
import { flaeche, type Polygon } from "../src/polygon.ts";
import { flecken, spirale } from "../src/stadt/viertel/flecken.ts";

const rahmen: Polygon = [[0, 0], [56, 0], [56, 44], [0, 44]];
const r = () => rauschen("0123456789abcdef0123456789abcdef");
const mittel = (l: number[]) => l.reduce((a, b) => a + b, 0) / l.length;

describe("Flecken auf der Spirale", () => {
  it("liegen alle im Rahmen und decken ihn lückenlos", () => {
    const f = flecken(spirale([28, 22], 30, 17, rahmen, r()), 30, rahmen, [28, 22]);
    expect(f.reduce((s, x) => s + flaeche(x.zelle), 0)).toBeCloseTo(56 * 44, 0);
    for (const x of f) for (const [px, py] of x.zelle) {
      expect(px).toBeGreaterThanOrEqual(0); expect(px).toBeLessThanOrEqual(56);
      expect(py).toBeGreaterThanOrEqual(0); expect(py).toBeLessThanOrEqual(44);
    }
  });
  it("sind innen kleiner als außen", () => {
    const f = flecken(spirale([28, 22], 30, 17, rahmen, r()), 30, rahmen, [28, 22]);
    const innen = f.filter(x => x.nr < 30).map(x => flaeche(x.zelle)), aussen = f.slice(Math.floor(f.length * 2 / 3)).map(x => flaeche(x.zelle));
    expect(aussen.length).toBeGreaterThan(5);
    expect(mittel(aussen)).toBeGreaterThan(mittel(innen) * 1.5);
  });
  it("sind deterministisch und nach der Spirale nummeriert", () => {
    const a = flecken(spirale([28, 22], 30, 17, rahmen, r()), 30, rahmen, [28, 22]);
    const b = flecken(spirale([28, 22], 30, 17, rahmen, r()), 30, rahmen, [28, 22]);
    expect(a).toEqual(b);
    expect(a.map(x => x.nr)).toEqual([...a.map(x => x.nr)].sort((x, y) => x - y));
  });
  it("füllt auch eine winzige Karte mit mindestens so vielen Flecken wie die Stadt braucht", () => {
    const klein: Polygon = [[0, 0], [24, 0], [24, 18], [0, 18]];
    const f = flecken(spirale([12, 9], 4, 4, klein, r()), 4, klein, [12, 9]);
    expect(f.length).toBeGreaterThanOrEqual(4);
  });
});
