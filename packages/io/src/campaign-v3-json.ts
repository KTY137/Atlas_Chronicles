// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
// Copyright (c) 2026 Atlas Chronicles contributors. SPDX-License-Identifier: MIT
import { CAMPAIGN_BUNDLE_V3_LIMITS as LIMITS } from "./campaign-v3-limits.ts";
import { fail } from "./campaign-v2-json.ts";
// Structural primitives have unchanged semantics; v3 adds only a larger bounded
// outer JSON walk. No published v1/v2 parser or limit is modified.
export { fail, hash, object, list, string, keys, numeric, digest, validateColumn, rejectDuplicateKeys } from "./campaign-v2-json.ts";

/** Tactical evidence uses the established sorted-object JSON bytes without the
 * unrelated 1 MiB/50k-node RulePackage admission limit. Callers preflight JSON
 * and validate each tactical document before encoding. */
export function tacticalJson(value: unknown): string {
  const sort = (v: unknown): unknown => Array.isArray(v) ? v.map(sort)
    : v !== null && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map(key => [key, sort((v as Record<string, unknown>)[key])])) : v;
  return JSON.stringify(sort(value));
}

export function assertJson(value: unknown): void {
  let nodes = 0;
  const ancestors = new Set<object>();
  const walk = (v: unknown, depth: number, path: string): void => {
    if (++nodes > LIMITS.nodes || depth > LIMITS.depth) fail(path, "JSON complexity limit exceeded");
    if (v === null || typeof v === "boolean") return;
    if (typeof v === "number") { if (!Number.isFinite(v)) fail(path, "finite JSON number required"); return; }
    if (typeof v === "string") { if (v.length > LIMITS.stringLength) fail(path, "string limit exceeded"); return; }
    if (!v || typeof v !== "object") fail(path, "JSON value required");
    const ref = v as object;
    if (ancestors.has(ref)) fail(path, "cyclic JSON value");
    const proto = Object.getPrototypeOf(v);
    if (!Array.isArray(v) && proto !== Object.prototype && proto !== null) fail(path, "plain JSON object required");
    ancestors.add(ref);
    if (Array.isArray(v)) {
      if (v.length > LIMITS.nodes) fail(path, "array limit exceeded");
      if (Reflect.ownKeys(v).some(k => k !== "length" && (typeof k !== "string" || !/^(0|[1-9][0-9]*)$/.test(k) || Number(k) >= v.length))) fail(path, "non-JSON array properties are forbidden");
      for (let i = 0; i < v.length; i++) {
        const d = Object.getOwnPropertyDescriptor(v, String(i));
        if (!d || !("value" in d)) fail(path, "sparse arrays and accessors are forbidden");
        walk(d!.value, depth + 1, `${path}[${i}]`);
      }
    } else {
      for (const key of Reflect.ownKeys(ref)) {
        if (typeof key !== "string" || ["__proto__", "prototype", "constructor"].includes(key)) fail(path, "unsafe JSON key");
        const k = key as string, d = Object.getOwnPropertyDescriptor(ref, k)!;
        if (!d.enumerable || !("value" in d)) fail(path, "hidden fields and accessors are forbidden");
        walk(d.value, depth + 1, `${path}.${k}`);
      }
    }
    ancestors.delete(ref);
  };
  walk(value, 0, "$");
}
