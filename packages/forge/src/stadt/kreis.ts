// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { fail } from "../kartenwerk.ts";
import { qp, type Polygon, type Punkt } from "../polygon.ts";

/**
 * **Kreise ohne Winkelfunktion.** `Math.sin`/`cos` sind nicht bitgleich über Engines (`polygon.ts`,
 * Regel 2), `Math.sqrt` ist es. Der Kosinus eines Drittel- oder Viertelkreises ist exakt (−½, 0);
 * jede Halbierung des Winkels ist `cos(θ/2) = √((1 + cos θ) / 2)`. Die Richtungen entstehen dann
 * durch fortgesetztes Drehen, also nur aus Multiplikation und Addition.
 */
const cache = new Map<number, readonly Punkt[]>();

export function kreisRichtungen(n: number): readonly Punkt[] {
  const alt = cache.get(n);
  if (alt) return alt;
  let basis = n, halbierungen = 0;
  while (basis > 4 && basis % 2 === 0) { basis /= 2; halbierungen++; }
  if (!Number.isSafeInteger(n) || (basis !== 3 && basis !== 4) || n > 4096) fail("geometrie", "kreis", `ein Kreis lässt sich nur in 3·2ᵏ oder 4·2ᵏ Teile schneiden, nicht in ${n}`);
  let c = basis === 3 ? -.5 : 0;
  for (let k = 0; k < halbierungen; k++) c = Math.sqrt((1 + c) / 2);
  const s = Math.sqrt(1 - c * c), richtungen: Punkt[] = [[1, 0]];
  for (let i = 1; i < n; i++) { const [x, y] = richtungen[i - 1]!; richtungen.push([x * c - y * s, x * s + y * c]); }
  const fest = Object.freeze(richtungen);
  cache.set(n, fest);
  return fest;
}

/** Ein regelmäßiges n-Eck um `m`, die erste Ecke in Richtung `d0` (Einheitsvektor). */
export function vieleck(m: Punkt, radius: number, n: number, d0: Punkt = [1, 0]): Polygon {
  return kreisRichtungen(n).map(([x, y]) => qp([m[0] + (x * d0[0] - y * d0[1]) * radius, m[1] + (x * d0[1] + y * d0[0]) * radius]));
}
