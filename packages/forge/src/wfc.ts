import { canonicalHash } from "@chronicle/core";
import { rauschen, type Rauschen } from "./kartenwerk.ts";

/**
 * Wave Function Collapse, tiled model, as a pure function.
 *
 * WFC treats a grid as a set of cells, each a superposition of every tile that has not yet been
 * ruled out, and resolves it by repeatedly collapsing the least-certain cell to one weighted
 * choice and propagating the resulting edge constraints to its neighbours. Gumin's own writeup
 * of the algorithm concedes that tileset satisfiability is not guaranteed and can be expensive to
 * decide — there is no general test that a given set of tiles and sockets tiles a WxH rectangle
 * before you try. That single fact drives every rule below:
 *
 *  - **No `Math.random`, ever.** A generator whose output cannot be replayed from its inputs is
 *    not a generator, it is a one-time show. The PRNG is xoshiro128** (`kartenwerk.ts`'s
 *    `rauschen`, the one noise source this package already has — reusing it instead of
 *    re-deriving a second RNG keeps exactly one canonical noise path in this codebase), seeded
 *    from `canonicalHash(auftrag.keim)`. Same `keim` and the same `WfcAuftrag` therefore produce
 *    a byte-identical `WfcErgebnis`, every time, on every platform, forever.
 *  - **No open-ended backtracking.** Real WFC implementations retry a whole run from scratch on
 *    contradiction, which is exactly the unbounded behaviour an adversarial or merely careless
 *    tileset turns into a hang. This solver never restarts: a contradiction (a cell whose domain
 *    empties out during propagation) is recorded — `null` in `raster`, one tick of
 *    `widersprueche` — and solving continues over the rest of the grid. That is the "leave it
 *    null" option the contract allows, chosen over backtracking precisely because it is the one
 *    option whose worst case is still linear in the grid, not exponential in the tileset.
 *  - **A hard step budget regardless.** Even a linear worst case is a worst case a caller should
 *    be able to bound, so every unit of work — each collapse and each propagation-queue pop —
 *    counts against `maxSchritte` (default `WFC_MAX_SCHRITTE_STANDARD`). Hitting the cap ends the
 *    run with whatever has been decided so far and `vollstaendig: false`. A partial grid is an
 *    honest answer; a caller that never gets an answer is not.
 *  - **Pure.** No DOM, no I/O, no timers, no module-level mutable state — everything the function
 *    needs travels in through `WfcAuftrag` and everything it produces travels out through the
 *    return value, so it is safe to call from a worker, a test, or a server with no adaptation.
 */

// ---------------------------------------------------------------------------------------------
// Contract
// ---------------------------------------------------------------------------------------------

export interface WfcKachel {
  readonly id: string;
  /** Relative selection weight among the candidates still valid for a cell. Must be >= 0. */
  readonly gewicht: number;
  /** Socket per edge, clockwise from north. Two tiles may touch when sockets match. */
  readonly kanten: readonly [string, string, string, string];
}

export interface WfcAuftrag {
  readonly keim: string;
  readonly breite: number;
  readonly hoehe: number;
  readonly kacheln: readonly WfcKachel[];
  /** Hard cap on total collapse + propagation operations. Defaults to `WFC_MAX_SCHRITTE_STANDARD`. */
  readonly maxSchritte?: number;
}

export interface WfcErgebnis {
  /** Row-major, length `breite * hoehe`. `null` is either "not yet reached" or "contradiction". */
  readonly raster: readonly (string | null)[];
  readonly breite: number;
  readonly hoehe: number;
  readonly schritte: number;
  readonly widersprueche: number;
  /** True only if every cell holds a tile and no contradiction was ever recorded. */
  readonly vollstaendig: boolean;
}

export const WFC_MAX_SCHRITTE_STANDARD = 200_000;

export class WfcError extends Error {
  override readonly name = "WfcError";
  constructor(readonly path: string, message: string) {
    super(`${path}: ${message}`);
  }
}
const fail = (path: string, message: string): never => { throw new WfcError(path, message); };

// ---------------------------------------------------------------------------------------------
// Directions — clockwise from north, matching `WfcKachel.kanten`'s own tuple order
// ---------------------------------------------------------------------------------------------

const NORD = 0, OST = 1, SUED = 2, WEST = 3;
/** Grid offset per direction. Which way is "down" is an internal bookkeeping choice only. */
const VERSATZ: readonly (readonly [number, number])[] = [[0, -1], [1, 0], [0, 1], [-1, 0]];
/** The edge a neighbour presents back at you is its opposite-facing socket. */
const GEGENUEBER: readonly [number, number, number, number] = [SUED, WEST, NORD, OST];

/** Two tiles may sit next to each other along `richtung` iff the touching sockets are equal. */
const kompatibel = (quelle: WfcKachel, nachbar: WfcKachel, richtung: number): boolean =>
  quelle.kanten[richtung] === nachbar.kanten[GEGENUEBER[richtung]!];

// ---------------------------------------------------------------------------------------------
// Validation — a malformed request is refused, never silently coerced
// ---------------------------------------------------------------------------------------------

function pruefeAuftrag(auftrag: WfcAuftrag): void {
  if (typeof auftrag?.keim !== "string" || !auftrag.keim.length) fail("auftrag.keim", "nichtleerer Keim erwartet");
  if (!Number.isSafeInteger(auftrag.breite) || auftrag.breite < 1) fail("auftrag.breite", "positive Ganzzahl erwartet");
  if (!Number.isSafeInteger(auftrag.hoehe) || auftrag.hoehe < 1) fail("auftrag.hoehe", "positive Ganzzahl erwartet");
  // An empty tileset has no solution, not even an empty one — every cell would need a value that
  // does not exist. Refusing loudly here is cheaper than a caller discovering it in a report line.
  if (!Array.isArray(auftrag.kacheln) || auftrag.kacheln.length === 0) fail("auftrag.kacheln", "mindestens eine Kachel erwartet");
  auftrag.kacheln.forEach((kachel, i) => {
    if (typeof kachel?.id !== "string" || !kachel.id.length) fail(`auftrag.kacheln[${i}].id`, "nichtleere Id erwartet");
    if (typeof kachel.gewicht !== "number" || !Number.isFinite(kachel.gewicht) || kachel.gewicht < 0) {
      fail(`auftrag.kacheln[${i}].gewicht`, "endliche Zahl >= 0 erwartet");
    }
    if (!Array.isArray(kachel.kanten) || kachel.kanten.length !== 4 || kachel.kanten.some((k) => typeof k !== "string")) {
      fail(`auftrag.kacheln[${i}].kanten`, "genau vier Sockel-Strings erwartet (Nord, Ost, Süd, West)");
    }
  });
  if (auftrag.maxSchritte !== undefined && (!Number.isSafeInteger(auftrag.maxSchritte) || auftrag.maxSchritte < 1)) {
    fail("auftrag.maxSchritte", "positive Ganzzahl erwartet");
  }
}

// ---------------------------------------------------------------------------------------------
// Weighted choice
// ---------------------------------------------------------------------------------------------

/**
 * Pick one tile index from `domaene`, honouring `gewicht` in expectation. `kartenwerk.ts`'s
 * `Rauschen` only exposes integer draws (`ganz`) and uniform picks (`waehle`) — deliberately: it
 * is the one PRNG surface this package has, and duplicating a second float-sampling primitive
 * beside it is exactly the parallel stack the constitution forbids. So weights are scaled to
 * integers and drawn with `ganz`, which keeps this on the one existing RNG entry point.
 */
function gewichteteWahl(domaene: ReadonlySet<number>, kacheln: readonly WfcKachel[], r: Rauschen): number {
  const optionen = [...domaene];
  if (optionen.length === 1) return optionen[0]!;
  // 1e6 keeps sub-integer weights (e.g. 0.5 vs 0.25) distinguishable after rounding to integer
  // steps for `ganz`, without the complexity of a dedicated float sampler for a single call site.
  const PRAEZISION = 1_000_000;
  const stufen = optionen.map((i) => Math.max(0, Math.round(kacheln[i]!.gewicht * PRAEZISION)));
  const gesamt = stufen.reduce((summe, wert) => summe + wert, 0);
  // All remaining candidates weigh zero (every 0-weight tile that survived propagation): fall
  // back to a uniform pick rather than divide by zero — reporting "no valid weighting" is not
  // this function's job, it still owes the caller a tile.
  if (gesamt <= 0) return optionen[r.ganz(0, optionen.length - 1)]!;
  let schwelle = r.ganz(0, gesamt - 1);
  for (let k = 0; k < optionen.length; k++) {
    schwelle -= stufen[k]!;
    if (schwelle < 0) return optionen[k]!;
  }
  return optionen[optionen.length - 1]!;
}

// ---------------------------------------------------------------------------------------------
// Solve
// ---------------------------------------------------------------------------------------------

export function loeseWfc(auftrag: WfcAuftrag): WfcErgebnis {
  pruefeAuftrag(auftrag);
  const { kacheln, breite, hoehe } = auftrag;
  const maxSchritte = auftrag.maxSchritte ?? WFC_MAX_SCHRITTE_STANDARD;
  const n = breite * hoehe;

  // The seed is the whole input to the noise: same keim, same PRNG stream, same collapse order,
  // same weighted draws — the definition of "deterministic" the contract asks for.
  const r = rauschen(canonicalHash(auftrag.keim));

  const alleIndizes = new Set<number>(kacheln.map((_, i) => i));
  const domaenen: Set<number>[] = Array.from({ length: n }, () => new Set(alleIndizes));
  const raster: (string | null)[] = new Array(n).fill(null);
  const blockiert = new Uint8Array(n);
  let schritte = 0;
  let widersprueche = 0;

  const idx = (x: number, y: number): number => y * breite + x;

  /**
   * Arc-consistency propagation from one just-changed cell. Every domain change is monotonic
   * (cells only ever lose candidates), so total work across the whole solve is bounded by
   * `n * kacheln.length` quite apart from the explicit `maxSchritte` check — the budget below is
   * belt-and-suspenders against a pathological neighbour count, not the only thing standing
   * between this function and a hang.
   */
  const propagiere = (start: number): void => {
    const warteschlange: number[] = [start];
    while (warteschlange.length > 0) {
      if (schritte >= maxSchritte) return;
      const aktuell = warteschlange.shift()!;
      schritte++;
      // A blocked cell is a recorded contradiction, not a value — it must never constrain a
      // neighbour, or one bad cell would cascade into rejecting perfectly fine choices around it.
      if (blockiert[aktuell]) continue;
      const quelle = domaenen[aktuell]!;
      const cx = aktuell % breite, cy = Math.floor(aktuell / breite);
      for (let richtung = 0; richtung < 4; richtung++) {
        const [dx, dy] = VERSATZ[richtung]!;
        const nx = cx + dx, ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= breite || ny >= hoehe) continue;
        const nIdx = idx(nx, ny);
        if (blockiert[nIdx]) continue;
        const nachbar = domaenen[nIdx]!;
        const gefiltert = new Set<number>();
        for (const nTile of nachbar) {
          for (const qTile of quelle) {
            if (kompatibel(kacheln[qTile]!, kacheln[nTile]!, richtung)) { gefiltert.add(nTile); break; }
          }
        }
        if (gefiltert.size === nachbar.size) continue; // nothing new was ruled out
        if (gefiltert.size === 0) {
          // Contradiction: reported, not thrown. A previously-collapsed neighbour that turns out
          // incompatible after the fact is un-collapsed back to null rather than left standing on
          // a value this solve can no longer justify.
          blockiert[nIdx] = 1;
          raster[nIdx] = null;
          widersprueche++;
          continue;
        }
        domaenen[nIdx] = gefiltert;
        if (gefiltert.size === 1 && raster[nIdx] === null) {
          const [einzig] = gefiltert;
          raster[nIdx] = kacheln[einzig!]!.id;
        }
        warteschlange.push(nIdx);
        if (schritte >= maxSchritte) return;
      }
    }
  };

  while (schritte < maxSchritte) {
    // Lowest-entropy-first: plain candidate count, not weighted Shannon entropy. A count is a
    // total order with no ties to break by floating-point comparison, which is what keeps two
    // runs of the same input byte-identical; the weighting still gets its say in `gewichteteWahl`.
    let best = -1, besteGroesse = Number.POSITIVE_INFINITY;
    for (let i = 0; i < n; i++) {
      if (blockiert[i] || raster[i] !== null) continue;
      const groesse = domaenen[i]!.size;
      if (groesse === 0) continue; // defensive only: propagation blocks a cell the instant this happens
      if (groesse < besteGroesse) {
        besteGroesse = groesse;
        best = i;
        if (groesse === 1) break; // nothing can beat 1, and the scan order makes this the leftmost tie
      }
    }
    if (best === -1) break; // every cell is either decided or a recorded contradiction

    const gewaehlt = gewichteteWahl(domaenen[best]!, kacheln, r);
    domaenen[best] = new Set([gewaehlt]);
    raster[best] = kacheln[gewaehlt]!.id;
    schritte++;
    if (schritte >= maxSchritte) break;
    propagiere(best);
  }

  // Redundant with "no null cells" in practice (a blocked cell's raster entry never leaves null),
  // but stating both conditions says directly what "complete" means rather than leaning on that
  // invariant holding forever.
  const vollstaendig = widersprueche === 0 && raster.every((wert) => wert !== null);
  return Object.freeze({
    raster: Object.freeze(raster), breite, hoehe, schritte, widersprueche, vollstaendig,
  });
}
