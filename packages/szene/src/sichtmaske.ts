import type { Region } from "./model.ts";

/**
 * `sichtmaske.ts` — the derived fog-of-war render artifact.
 *
 * "The authoritative fog is not geometry at all. It is a set of revealed region and place ids —
 *  which is exactly `Sicht`. The polygon mask is a *derived render artifact*: computed in a
 *  worker, cached per character, updated incrementally per reveal, and rebuilt from scratch only
 *  on join or on a permission change."
 *
 * So the direction of derivation is fixed: `Ortswissen`/`Sicht` (a set of ids, held server-side
 * per viewer) is the source of truth. This module is the pure half of that pipeline — the
 * algorithm a worker thread runs to turn "these ids are revealed" into "these polygons are
 * drawable". It never runs the other way: nothing here may reconstruct an id set from geometry,
 * and nothing here may be handed geometry it then treats as authoritative.
 */

export interface MaskeEingabe {
  readonly regionen: readonly Region[];
  readonly enthuellt: ReadonlySet<string>;
}

export interface Maske {
  // Readonly all the way down, written as three explicit modifiers on purpose: the shorter
  // `readonly (readonly [number, number])[][]` parses as a readonly array of MUTABLE arrays,
  // and a mask a caller can edit in place stops being a derived artifact and becomes a second
  // source of truth — the exact inversion this module exists to prevent.
  readonly sichtbar: readonly (readonly (readonly [number, number])[])[];
  readonly enthuellt: ReadonlySet<string>;
  readonly version: number;
}

/**
 * `Kein Nenner` — a security property, not a style preference. The returned `Maske` must never
 * let a caller infer how many regions exist in total or which ids are still hidden. Concretely
 * that means: never store `regionen.length` anywhere in the result, never enumerate ids that are
 * *not* in the caller's own `enthuellt`, and never let `sichtbar.length` diverge from
 * `enthuellt.size` (a mismatch would itself be a side channel — "some ids matched, some silently
 * didn't" is exactly the kind of count a denominator-free API must not expose).
 *
 * A stale id (one that no longer names a region — the map changed under a revelation the viewer
 * still holds) is dropped from both `sichtbar` and the returned `enthuellt`. That is why the
 * output set can be a strict subset of the input set, never a superset: the invariant a caller
 * may rely on is "everything named here, I already knew about", not "everything I knew about is
 * named here".
 */
export function baueMaske(eingabe: MaskeEingabe): Maske {
  const sichtbar: (readonly (readonly [number, number])[])[] = [];
  const enthuellt = new Set<string>();
  // Iterate `regionen`, not `enthuellt`: this is the full rebuild, so the natural cost is one
  // pass over the map, and doing it this way means an id with no matching region simply never
  // gets looked at — "ignored silently" falls out of the loop shape instead of needing a branch.
  for (const region of eingabe.regionen) {
    if (!eingabe.enthuellt.has(region.id)) continue;
    sichtbar.push(region.punkte);
    enthuellt.add(region.id);
  }
  return Object.freeze({ sichtbar: Object.freeze(sichtbar), enthuellt, version: enthuellt.size });
}

/**
 * Incremental: add newly revealed ids to an existing mask without rebuilding it.
 *
 * `vorher` stands in for the worker's cache — the previously computed `Maske` — so the only work
 * this function does is resolve the *new* ids against `regionen` and append. It never re-walks
 * `vorher.sichtbar`, so its cost is proportional to `neu`, not to the size of the map or of what
 * was already revealed. That proportionality is the entire "incremental" claim; the property
 * test in sichtmaske.test.ts is what makes it more than an assertion.
 *
 * `version` is `enthuellt.size` — a pure function of the (already-exposed) revealed set, not a
 * counter carried across calls. That keeps `erweitereMaske` as referentially transparent as
 * `baueMaske`: two calls with equal `vorher`/`regionen`/`neu` always produce an equal `Maske`.
 */
export function erweitereMaske(vorher: Maske, regionen: readonly Region[], neu: Iterable<string>): Maske {
  const byId = new Map<string, Region>();
  for (const region of regionen) byId.set(region.id, region);
  const enthuellt = new Set(vorher.enthuellt);
  const sichtbar: (readonly (readonly [number, number])[])[] = vorher.sichtbar.slice();
  for (const id of neu) {
    if (enthuellt.has(id)) continue; // already revealed (or revealed twice in `neu`): idempotent
    const region = byId.get(id);
    if (!region) continue; // stale/unknown id: ignored silently, never surfaced as an error
    enthuellt.add(id);
    sichtbar.push(region.punkte);
  }
  return Object.freeze({ sichtbar: Object.freeze(sichtbar), enthuellt, version: enthuellt.size });
}
