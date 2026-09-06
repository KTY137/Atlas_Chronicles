// Copyright (c) 2026 Atlas Chronicles contributors. SPDX-License-Identifier: MIT
// v2-local structural primitives; the published v1 implementation remains unchanged.
import { canonicalHash, type CanonicalValue } from "@chronicle/core";
import { CAMPAIGN_BUNDLE_LIMITS, type CampaignColumn } from "./campaign-schema.ts";
import { ImportValidationError } from "./validation.ts";
type Row = Record<string, CanonicalValue>;
export const fail = (path: string, message: string): never => { throw new ImportValidationError(path, message); };
export const hash = (value: unknown): string => canonicalHash(value as CanonicalValue);
export const object = (value: unknown, path: string): Row => {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(path, "object required");
  return value as Row;
};
export const list = (value: unknown, path: string, max: number = CAMPAIGN_BUNDLE_LIMITS.rowsPerTable): CanonicalValue[] => {
  if (!Array.isArray(value) || value.length > max) fail(path, `array of at most ${max} items required`);
  return value as CanonicalValue[];
};
export const string = (value: unknown, path: string, max = 128): string => {
  if (typeof value !== "string" || !value.length || value.length > max) fail(path, "bounded nonempty string required");
  return value as string;
};
export function keys(row: Row, required: readonly string[], path: string, optional: readonly string[] = []): void {
  for (const key of Object.keys(row)) if (!required.includes(key) && !optional.includes(key)) fail(`${path}.${key}`, "unknown field; explicit migration required");
  for (const key of required) if (!Object.hasOwn(row, key)) fail(`${path}.${key}`, "required field missing");
}
export function numeric(value: unknown, path: string, minimum = 0): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < minimum) fail(path, "bounded integer required");
  return value as number;
}
export function digest(value: unknown, path: string): string {
  const result = string(value, path, 64); if (!/^[a-f0-9]{64}$/.test(result)) fail(path, "SHA256 lowercase hex required"); return result;
}
export function assertJson(value: unknown): void {
  let nodes = 0; const ancestors = new Set<object>();
  const walk = (v: unknown, depth: number, path: string): void => {
    if (++nodes > CAMPAIGN_BUNDLE_LIMITS.nodes || depth > CAMPAIGN_BUNDLE_LIMITS.depth) fail(path, "JSON complexity limit exceeded");
    if (v === null || typeof v === "boolean") return;
    if (typeof v === "number") { if (!Number.isFinite(v)) fail(path, "finite JSON number required"); return; }
    if (typeof v === "string") { if (v.length > CAMPAIGN_BUNDLE_LIMITS.stringLength) fail(path, "string limit exceeded"); return; }
    if (!v || typeof v !== "object") fail(path, "JSON value required");
    const ref = v as object;
    if (ancestors.has(ref)) fail(path, "cyclic JSON value");
    const proto = Object.getPrototypeOf(v);
    if (!Array.isArray(v) && proto !== Object.prototype && proto !== null) fail(path, "plain JSON object required");
    ancestors.add(ref);
    if (Array.isArray(v)) {
      if (v.length > CAMPAIGN_BUNDLE_LIMITS.nodes) fail(path, "array limit exceeded");
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
export function validateColumn(value: CanonicalValue | undefined, c: CampaignColumn, path: string): void {
  if (value === null && c.nullable) return;
  if (c.kind === "json") { if (value === undefined || value === null) fail(path, "JSON document required"); return; }
  if (c.kind === "bigint") {
    if (typeof value !== "string" || !/^(0|[1-9][0-9]{0,18})$/.test(value) || BigInt(value) > 9223372036854775807n) fail(path, "nonnegative SQL bigint must be a canonical decimal string");
    return;
  }
  if (c.kind === "text") {
    if (typeof value !== "string" || value.length > (c.maxLength ?? 1_000_000)) fail(path, "bounded text required");
    if (c.values && !c.values.includes(value as string)) fail(path, "unsupported enum value; explicit migration required");
    if (c.pattern && !new RegExp(c.pattern).test(value as string)) fail(path, "invalid string encoding");
    return;
  }
  if (c.kind === "boolean") { if (typeof value !== "boolean") fail(path, "boolean required"); return; }
  if (typeof value !== "number" || !Number.isFinite(value) || (c.kind === "integer" && !Number.isSafeInteger(value)) || value < (c.minimum ?? -Infinity) || value > (c.maximum ?? Infinity)) fail(path, "number outside declared range");
}
export function rejectDuplicateKeys(text: string): void {
  const stack: { object: boolean; key: boolean; seen: Set<string> }[] = [];
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      const start = i; for (++i; i < text.length; i++) { if (text[i] === "\\") i++; else if (text[i] === '"') break; }
      const top = stack[stack.length - 1];
      if (top?.object && top.key) { const key = JSON.parse(text.slice(start, i + 1)) as string; if (top.seen.has(key)) fail("$", `duplicate JSON key: ${key}`); top.seen.add(key); top.key = false; }
    } else if (c === "{" || c === "[") stack.push({ object: c === "{", key: c === "{", seen: new Set() });
    else if (c === "}" || c === "]") stack.pop();
    else if (c === ",") { const top = stack[stack.length - 1]; if (top?.object) top.key = true; }
  }
}
