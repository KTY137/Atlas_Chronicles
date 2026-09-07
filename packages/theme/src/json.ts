// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { THEME_LIMITS } from "./model.ts";

export class ThemeValidationError extends Error {
  override readonly name = "ThemeValidationError";
  constructor(readonly path: string, message: string) { super(`${path}: ${message}`); }
}
export function fail(path: string, message: string): never { throw new ThemeValidationError(path, message); }
type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
const forbidden = (key: string) => key === "__proto__" || key === "constructor" || key === "prototype";

/** UTF-8 byte counting without Node, TextEncoder, or DOM types; lone surrogates count
 * as the UTF-8 replacement character, matching transport encoding. */
function byteLength(text: string): number {
  let bytes = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    if (c <= 0x7f) bytes++;
    else if (c <= 0x7ff) bytes += 2;
    else if (c >= 0xd800 && c <= 0xdbff && i + 1 < text.length && text.charCodeAt(i + 1) >= 0xdc00 && text.charCodeAt(i + 1) <= 0xdfff) { bytes += 4; i++; }
    else bytes += 3;
    if (bytes > THEME_LIMITS.bytes) return bytes;
  }
  return bytes;
}
function bounded(text: string): void { if (text.length > THEME_LIMITS.bytes || byteLength(text) > THEME_LIMITS.bytes) fail("json", "64 KiB byte limit exceeded"); }

/** Detect duplicate (including escaped) keys before JSON.parse discards them. */
function parseText(text: string): unknown {
  bounded(text);
  let cursor = 0, nodes = 0;
  const whitespace = () => { while (cursor < text.length && /[\t\r\n ]/.test(text[cursor]!)) cursor++; };
  const stringToken = (): string => {
    const start = cursor++; let escaped = false;
    while (cursor < text.length) {
      const char = text[cursor++]!;
      if (!escaped && char === '"') { try { return JSON.parse(text.slice(start, cursor)) as string; } catch { return fail("json", "invalid string"); } }
      if (!escaped && char === "\\") escaped = true; else escaped = false;
    }
    return fail("json", "unterminated string");
  };
  const value = (depth: number): void => {
    if (++nodes > THEME_LIMITS.nodes || depth > THEME_LIMITS.depth) fail("json", "complexity limit exceeded");
    whitespace(); const char = text[cursor];
    if (char === '"') { stringToken(); return; }
    if (char === "{") {
      cursor++; whitespace(); const keys = new Set<string>();
      if (text[cursor] === "}") { cursor++; return; }
      for (;;) {
        whitespace(); if (text[cursor] !== '"') fail("json", "object key expected");
        const key = stringToken(); if (keys.has(key)) fail("json", "duplicate object key"); if (forbidden(key)) fail("json", "prototype key forbidden"); keys.add(key);
        whitespace(); if (text[cursor++] !== ":") fail("json", "colon expected"); value(depth + 1); whitespace();
        const separator = text[cursor++]; if (separator === "}") return; if (separator !== ",") fail("json", "object separator expected");
      }
    }
    if (char === "[") {
      cursor++; whitespace(); if (text[cursor] === "]") { cursor++; return; }
      for (;;) { value(depth + 1); whitespace(); const separator = text[cursor++]; if (separator === "]") return; if (separator !== ",") fail("json", "array separator expected"); }
    }
    const start = cursor; while (cursor < text.length && !/[\s,}\]]/.test(text[cursor]!)) cursor++;
    if (cursor === start) fail("json", "value expected");
  };
  value(0); whitespace(); if (cursor !== text.length) fail("json", "trailing data");
  try { return JSON.parse(text) as unknown; } catch { return fail("json", "invalid JSON"); }
}

function canonical(value: Json): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key]!)}`).join(",")}}`;
}
export function readThemeJson(input: unknown): Json {
  const raw = typeof input === "string" ? parseText(input) : input;
  let nodes = 0, stringBytes = 0; const active = new Set<object>();
  const snapshot = (value: unknown, path: string, depth: number): Json => {
    if (++nodes > THEME_LIMITS.nodes || depth > THEME_LIMITS.depth) fail(path, "complexity limit exceeded");
    if (value === null || typeof value === "boolean") return value;
    if (typeof value === "string") { stringBytes += byteLength(value); if (stringBytes > THEME_LIMITS.bytes) fail(path, "64 KiB byte limit exceeded"); return value; }
    if (typeof value === "number") { if (!Number.isFinite(value)) fail(path, "finite number required"); return value; }
    if (typeof value !== "object") return fail(path, "JSON value required");
    if (active.has(value)) fail(path, "cyclic input"); active.add(value);
    if (Object.getOwnPropertySymbols(value).length) fail(path, "symbol properties forbidden");
    if (Array.isArray(value)) {
      if (Object.getPrototypeOf(value) !== Array.prototype || Object.getOwnPropertyNames(value).length !== value.length + 1 || value.length > THEME_LIMITS.nodes) fail(path, "plain dense array required");
      const result: Json[] = [];
      for (let i = 0; i < value.length; i++) { const descriptor = Object.getOwnPropertyDescriptor(value, String(i)); if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) fail(path, "dense data array required"); result.push(snapshot(descriptor.value, `${path}[${i}]`, depth + 1)); }
      active.delete(value); return result;
    }
    if (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) fail(path, "plain object required");
    const result: Record<string, Json> = {};
    for (const key of Object.getOwnPropertyNames(value)) {
      if (forbidden(key)) fail(path, "prototype key forbidden");
      stringBytes += byteLength(key); if (stringBytes > THEME_LIMITS.bytes) fail(path, "64 KiB byte limit exceeded");
      const descriptor = Object.getOwnPropertyDescriptor(value, key)!;
      if (!("value" in descriptor) || !descriptor.enumerable) fail(path, "enumerable data property required");
      result[key] = snapshot(descriptor.value, `${path}.${key}`, depth + 1);
    }
    active.delete(value); return result;
  };
  const result = snapshot(raw, "json", 0); bounded(canonical(result)); return result;
}
/** Bounded canonical JSON: UTF-16 key order, JSON number/string spelling, no whitespace.
 * This validates JSON safety, not a manifest schema; use serializeThemeManifest for files. */
export function themeCanonicalJson(input: unknown): string { return canonical(readThemeJson(input)); }
export function object(value: unknown, path: string, keys: readonly string[]): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return fail(path, "object required");
  const row = value as Record<string, unknown>;
  for (const key of Object.keys(row)) if (!keys.includes(key)) fail(`${path}.${key}`, "unknown property; explicit migration required");
  for (const key of keys) if (!Object.hasOwn(row, key)) fail(`${path}.${key}`, "required property missing");
  return row;
}
export function choice(value: unknown, choices: readonly (string | number)[], path: string): void {
  if ((typeof value !== "string" && typeof value !== "number") || !choices.includes(value)) fail(path, `expected ${choices.join(" | ")}`);
}
export function plainText(value: unknown, path: string, max: number, allowEmpty = false): void {
  if (typeof value !== "string" || (!allowEmpty && !value.trim()) || value.length > max || /[<>\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/.test(value)) fail(path, "bounded plain text required");
  for (let i = 0; i < value.length; i++) {
    const c = value.charCodeAt(i);
    if (c >= 0xd800 && c <= 0xdbff) { const next = value.charCodeAt(++i); if (!(next >= 0xdc00 && next <= 0xdfff)) fail(path, "valid Unicode required"); }
    else if (c >= 0xdc00 && c <= 0xdfff) fail(path, "valid Unicode required");
  }
}
export function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object") { for (const child of Object.values(value)) deepFreeze(child); Object.freeze(value); }
  return value;
}
