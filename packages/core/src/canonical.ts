import { sha256Hex } from "./sha256.ts";

/**
 * Canonical JSON — the determinism substrate.
 *
 * Gate G-RL1 · Nachgerechnet requires byte-identical replay on Windows/macOS/Linux, in
 * Chromium *and* Node, across two package minors, under locale `tr-TR`
 * (design/06-giga-product-architecture.md:3274, design/iterations/CHAMPION.md:770).
 * Assertion A14 requires the same of the importer (design/research/RB-12-eron-uebernahme.md:955).
 *
 * Three rules make that reachable, and all three are locale traps that bit somebody first:
 *   1. Object keys are sorted by UTF-16 code unit, NOT by `localeCompare` — under `tr-TR`
 *      a locale-aware sort reorders `I`/`i` and the hash changes.
 *   2. Numbers must be integers or exactly representable; `NaN`/`Infinity` are rejected
 *      rather than silently becoming `null` the way `JSON.stringify` does.
 *   3. `undefined` is rejected, not dropped — a silently dropped field is a lie about
 *      completeness, the same principle RB-12 §2.8 applies to unconvertible wikitext.
 */
export type CanonicalValue =
  | string
  | number
  | boolean
  | null
  | readonly CanonicalValue[]
  | { readonly [k: string]: CanonicalValue };

export class NonCanonicalValueError extends Error {
  constructor(readonly path: string, message: string) {
    super(`${path}: ${message}`);
    this.name = "NonCanonicalValueError";
  }
}

/** Sort by UTF-16 code unit. Never `localeCompare` — see rule 1 above. */
const byCodeUnit = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

function write(value: unknown, path: string, out: string[]): void {
  if (value === null) {
    out.push("null");
    return;
  }
  switch (typeof value) {
    case "string":
      out.push(JSON.stringify(value));
      return;
    case "boolean":
      out.push(value ? "true" : "false");
      return;
    case "number": {
      if (!Number.isFinite(value)) {
        throw new NonCanonicalValueError(path, `${String(value)} is not canonically representable`);
      }
      // `JSON.stringify` already emits the shortest round-tripping form for doubles and is
      // locale-independent; `toLocaleString` is the trap and is deliberately not used.
      out.push(JSON.stringify(value));
      return;
    }
    case "undefined":
      throw new NonCanonicalValueError(path, "undefined is not encodable — omit the key or use null");
    default:
      break;
  }
  if (Array.isArray(value)) {
    out.push("[");
    for (let i = 0; i < value.length; i++) {
      if (i > 0) out.push(",");
      write(value[i], `${path}[${i}]`, out);
    }
    out.push("]");
    return;
  }
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj).sort(byCodeUnit);
    out.push("{");
    let first = true;
    for (const k of keys) {
      const v = obj[k];
      if (v === undefined) {
        throw new NonCanonicalValueError(`${path}.${k}`, "undefined is not encodable");
      }
      if (!first) out.push(",");
      first = false;
      out.push(JSON.stringify(k), ":");
      write(v, `${path}.${k}`, out);
    }
    out.push("}");
    return;
  }
  throw new NonCanonicalValueError(path, `${typeof value} is not encodable`);
}

/** Deterministic, locale-free JSON. The only serialiser allowed to feed a hash. */
export function canonicalJson(value: CanonicalValue): string {
  const out: string[] = [];
  write(value, "$", out);
  return out.join("");
}

/** sha256 over canonical JSON, lowercase hex. */
export function canonicalHash(value: CanonicalValue): string {
  return sha256Hex(canonicalJson(value));
}

/** sha256 over raw text, lowercase hex. For source bytes we did not author. */
export function textHash(text: string): string {
  return sha256Hex(text);
}
