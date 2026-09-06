/**
 * `NurLeitung<T>` — GM-only data, unrepresentable in a player payload at *type* level.
 *
 * The champion's wording (design/iterations/CHAMPION.md:382-387): die Sicht is a composing
 * choke point with **no denominator field**; Grenze B9 — *der Projektor ist der Server*, and
 * **no visibility metadata on any player payload, ever**.
 *
 * The mechanism is deliberately not a policy. A policy is a sentence somebody has to remember
 * at 01:00 on a Saturday. This is a wrapper type with **no encoder instance in the player
 * payload codec**: the player-facing encoder is a total function over a closed union, and
 * there is no branch that accepts a `NurLeitung`. Handing it one is a compile error.
 *
 * Round 2's finding is why: eight leaks appeared in code written by the doctrine's own authors
 * (design/iterations/README.md:55). Discipline lost that argument; the type system does not
 * get tired.
 *
 * Implementation note — the brand is **type-only**. `declare const` has no runtime existence,
 * so the carrier object holds `wert` and nothing else; the phantom key exists purely to defeat
 * structural assignability. Writing the brand as a real runtime key would put a literal
 * "gm-only" marker into every payload we serialise, which is exactly the visibility metadata
 * Grenze B9 forbids.
 */
declare const NUR_LEITUNG: unique symbol;

export type NurLeitung<T> = {
  readonly [NUR_LEITUNG]: "gm-only";
  readonly wert: T;
};

/** Wrap ground truth so it can only ever travel to the GM surface. */
export function nurLeitung<T>(wert: T): NurLeitung<T> {
  return { wert } as unknown as NurLeitung<T>;
}

/**
 * Unwrap. The name is long and ugly on purpose: every read of GM ground truth should be
 * visible in review, and `grep -r fuerLeitung` must find all of them.
 */
export function fuerLeitung<T>(v: NurLeitung<T>): T {
  return (v as unknown as { readonly wert: T }).wert;
}

/**
 * `Kein Nenner` — no reader surface prints a number whose value depends on content the reader
 * does not hold. No "3 von 12", no "2 Absätze verborgen", no canon progress bar.
 *
 * A count over a projected set is safe (the reader holds every element). A count over the
 * *unprojected* set is an oracle. This type exists so the difference is written down where the
 * value is produced rather than argued about where it is rendered.
 */
export type GezaehltUeberSichtbares = {
  readonly kind: "gezaehlt-ueber-sichtbares";
  readonly wert: number;
};

export const zaehleSichtbares = (xs: { readonly length: number }): GezaehltUeberSichtbares => ({
  kind: "gezaehlt-ueber-sichtbares",
  wert: xs.length,
});
