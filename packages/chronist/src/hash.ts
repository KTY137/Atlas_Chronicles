// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { canonicalHash, type CanonicalValue } from "@chronicle/core";

export const CHRONIST_HASH_KINDS = ["source-snapshot", "scope", "unit-plan", "dispatch", "candidate", "draft", "start-request", "submit-request", "ack", "checkpoint", "run-evidence"] as const;
export const CHRONIST_LIMITS = Object.freeze({
  sources: 512, sourceChars: 1_000_000, modelUnits: 128, candidates: 256,
  evidenceBytes: 16 * 1024 * 1024, draftBytes: 2 * 1024 * 1024,
  hashBytes: 20 * 1024 * 1024, hashNodes: 500_000, hashDepth: 48,
  maxCalls: 128, maxInputChars: 4_000_000, maxOutputChars: 512_000,
  callTimeoutMs: 120_000, maxActiveMs: 1_800_000, concurrency: 4,
  maxInputCharsPerCall: 24_000, maxOutputCharsPerCall: 64_000,
});
export const CHRONIST_DEFAULT_BUDGET = Object.freeze({
  maxCalls: 32, maxInputChars: 400_000, maxOutputChars: 64_000,
  callTimeoutMs: 60_000, maxActiveMs: 300_000, concurrency: 2,
  maxInputCharsPerCall: 12_000, maxOutputCharsPerCall: 12_000,
});
export class ChronistValidationError extends Error {
  constructor(readonly code: "schema" | "budget" | "citation" | "rule-conflict" | "scope-changed", message = code) {
    super(`chronist: ${message}`); this.name = "ChronistValidationError";
  }
}

/** Measures the existing canonical encoding, without allocating the complete JSON or running getters. */
export function admitChronistValue(value: unknown): { readonly bytes: number; readonly nodes: number } {
  let bytes = 0, nodes = 0;
  const visiting = new Set<object>();
  const add = (n: number) => { bytes += n; if (bytes > CHRONIST_LIMITS.hashBytes) throw new ChronistValidationError("budget"); };
  const stringBytes = (s: string) => {
    // At least one byte per code unit except paired surrogates; reject massive strings first.
    if (s.length > CHRONIST_LIMITS.hashBytes) throw new ChronistValidationError("budget");
    add(2);
    for (let i = 0; i < s.length; i++) {
      const c = s.charCodeAt(i);
      if (c === 34 || c === 92 || c === 8 || c === 9 || c === 10 || c === 12 || c === 13) add(2);
      else if (c < 32) add(6);
      else if (c < 128) add(1);
      else if (c < 2048) add(2);
      else if (c >= 0xd800 && c <= 0xdbff && i + 1 < s.length && s.charCodeAt(i + 1) >= 0xdc00 && s.charCodeAt(i + 1) <= 0xdfff) { add(4); i++; }
      else if (c >= 0xd800 && c <= 0xdfff) add(6);
      else add(3);
    }
  };
  const visit = (v: unknown, depth: number): void => {
    if (++nodes > CHRONIST_LIMITS.hashNodes || depth > CHRONIST_LIMITS.hashDepth) throw new ChronistValidationError("budget");
    if (v === null) { add(4); return; }
    if (typeof v === "string") { stringBytes(v); return; }
    if (typeof v === "boolean") { add(v ? 4 : 5); return; }
    if (typeof v === "number" && Number.isFinite(v)) { add(JSON.stringify(v).length); return; }
    if (typeof v !== "object") throw new ChronistValidationError("schema");
    const proto: unknown = Object.getPrototypeOf(v);
    if (visiting.has(v) || (Array.isArray(v) ? proto !== Array.prototype : proto !== Object.prototype && proto !== null)) throw new ChronistValidationError("schema");
    visiting.add(v);
    const descriptors = Object.getOwnPropertyDescriptors(v);
    const keys = Reflect.ownKeys(descriptors);
    if (keys.some(k => typeof k !== "string")) throw new ChronistValidationError("schema");
    if (Array.isArray(v)) {
      if (v.length > CHRONIST_LIMITS.hashNodes || keys.length !== v.length + 1) throw new ChronistValidationError("schema");
      add(2 + Math.max(0, v.length - 1));
      for (let i = 0; i < v.length; i++) {
        const d = descriptors[String(i)];
        if (!d || !d.enumerable || !("value" in d)) throw new ChronistValidationError("schema");
        visit(d.value, depth + 1);
      }
    } else {
      add(2 + Math.max(0, keys.length - 1));
      for (const key of keys as string[]) {
        const d = descriptors[key]!;
        if (!d.enumerable || !("value" in d) || key === "__proto__" || key === "prototype" || key === "constructor") throw new ChronistValidationError("schema");
        stringBytes(key); add(1); visit(d.value, depth + 1);
      }
    }
    visiting.delete(v);
  };
  visit(value, 0);
  return { bytes, nodes };
}

export function chronistHash(kind: string, value: CanonicalValue): string {
  if (!(CHRONIST_HASH_KINDS as readonly string[]).includes(kind)) throw new ChronistValidationError("schema");
  const envelope = { hashVersion: "chronist-hash-1", kind, value };
  admitChronistValue(envelope);
  return canonicalHash(envelope);
}

/** For structurally typed DTOs: validate before using the shared canonical encoder. */
export function chronistValue(value: unknown): CanonicalValue { admitChronistValue(value); return value as CanonicalValue; }
export const codeUnitCompare = (a: string, b: string): number => a < b ? -1 : a > b ? 1 : 0;
