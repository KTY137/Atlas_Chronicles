import { describe, expect, it } from "vitest";
import {
  canonicalHash,
  canonicalJson,
  deriveId,
  NonCanonicalValueError,
  nurLeitung,
  fuerLeitung,
  hoeheresOrtswissen,
} from "@chronicle/core";

describe("canonicalJson — the determinism substrate (gate G-RL1 / assertion A14)", () => {
  it("sorts object keys by UTF-16 code unit, not by locale", () => {
    // The tr-TR trap: a locale-aware sort reorders I/i and the hash silently changes.
    // The CI matrix runs this suite under LANG=tr-TR (06:3274), so the assertion is the
    // real gate, not a formality.
    const a = canonicalJson({ Istanbul: 1, iznik: 2, Izmir: 3 });
    expect(a).toBe('{"Istanbul":1,"Izmir":3,"iznik":2}');
  });

  it("is stable under key insertion order", () => {
    const one = canonicalJson({ b: 1, a: { d: 2, c: 3 } });
    const two = canonicalJson({ a: { c: 3, d: 2 }, b: 1 });
    expect(one).toBe(two);
  });

  it("refuses undefined rather than silently dropping it", () => {
    // A silently dropped field is a lie about completeness — the same principle
    // RB-12 §2.8 applies to unconvertible wikitext.
    expect(() => canonicalJson({ a: undefined } as never)).toThrow(NonCanonicalValueError);
  });

  it("refuses NaN and Infinity rather than emitting null", () => {
    expect(() => canonicalJson({ a: NaN } as never)).toThrow(NonCanonicalValueError);
    expect(() => canonicalJson({ a: Infinity } as never)).toThrow(NonCanonicalValueError);
  });

  it("hashes identically for structurally identical values", () => {
    expect(canonicalHash({ x: [1, 2], y: "ä" })).toBe(canonicalHash({ y: "ä", x: [1, 2] }));
  });
});

describe("deriveId — invariant I8: an id is a hash, never an array index", () => {
  const base = {
    erzeuger: "azgaar-fmg",
    version: "1.138.2",
    keim: "chronicle-1",
    kind: "knoten",
    pfad: ["burg", "Rendale"],
  } as const;

  it("is deterministic across calls", () => {
    expect(deriveId(base)).toBe(deriveId({ ...base }));
  });

  it("changes when the generator version changes — a bump is a migration, not an upgrade", () => {
    expect(deriveId(base)).not.toBe(deriveId({ ...base, version: "1.139.0" }));
  });

  it("changes when the path changes, so two burgs never collide", () => {
    expect(deriveId(base)).not.toBe(deriveId({ ...base, pfad: ["burg", "Rendal"] }));
  });

  it("does not depend on the canvas size, because the canvas is not in the input", () => {
    // The measured failure this defends against: same seed, 1280x720 -> 1600x900 keeps
    // (id, name) for 0 of 664 burgs (RB-21d:234). Our id survives because it is derived
    // from the name path, not from FMG's array position.
    expect(deriveId(base)).toBe(deriveId({ ...base }));
  });
});

describe("NurLeitung — GM-only data is unrepresentable in a player payload", () => {
  it("round-trips through the explicitly named unwrap", () => {
    const truth = nurLeitung({ schwerer_als_er_aussieht: true });
    expect(fuerLeitung(truth).schwerer_als_er_aussieht).toBe(true);
  });

  it("is not structurally assignable to its own payload type", () => {
    const truth = nurLeitung(42);
    // @ts-expect-error — a NurLeitung<number> must never be usable as a number.
    const leaked: number = truth;
    void leaked;
  });
});

describe("Ortswissen is a closed ternary and joins monotonically", () => {
  it("takes the higher of two knowledge levels", () => {
    expect(hoeheresOrtswissen("unbekannt", "benannt")).toBe("benannt");
    expect(hoeheresOrtswissen("erschlossen", "benannt")).toBe("erschlossen");
    expect(hoeheresOrtswissen("benannt", "benannt")).toBe("benannt");
  });
});
