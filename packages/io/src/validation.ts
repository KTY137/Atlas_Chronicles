// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
export class ImportValidationError extends Error {
  constructor(readonly path: string, message: string) {
    super(`${path}: ${message}`);
    this.name = "ImportValidationError";
  }
}

export function object(value: unknown, path: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new ImportValidationError(path, "object required");
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) throw new ImportValidationError(path, "plain JSON object required");
  return value as Record<string, unknown>;
}

export function array(value: unknown, path: string, maximum = 100_000): unknown[] {
  if (!Array.isArray(value) || value.length > maximum) throw new ImportValidationError(path, `array of at most ${maximum} items required`);
  return value;
}

export function string(value: unknown, path: string, maximum = 1_000_000, allowEmpty = false): string {
  if (typeof value !== "string" || value.length > maximum || (!allowEmpty && !value.trim())) {
    throw new ImportValidationError(path, "bounded string required");
  }
  return value;
}

export function integer(value: unknown, path: string, minimum = 0): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < minimum) throw new ImportValidationError(path, `integer >= ${minimum} required`);
  return value;
}

export function choice<T extends string>(value: unknown, choices: readonly T[], path: string): T {
  if (typeof value !== "string" || !choices.includes(value as T)) throw new ImportValidationError(path, `expected ${choices.join(" | ")}`);
  return value as T;
}

export function boolean(value: unknown, path: string): boolean {
  if (typeof value !== "boolean") throw new ImportValidationError(path, "boolean required");
  return value;
}

/** Bound JSON depth, unsupported values and prototype keys before cloning or traversal. */
export function assertJson(value: unknown, path = "$", depth = 0): void {
  if (depth > 64) throw new ImportValidationError(path, "maximum JSON depth exceeded");
  if (value === null || typeof value === "string" || typeof value === "boolean") return;
  if (typeof value === "number" && Number.isFinite(value)) return;
  if (Array.isArray(value)) {
    array(value, path).forEach((child, i) => assertJson(child, `${path}[${i}]`, depth + 1));
    return;
  }
  const row = object(value, path);
  for (const [key, child] of Object.entries(row)) {
    if (["__proto__", "prototype", "constructor"].includes(key)) throw new ImportValidationError(path, "unsafe object key");
    assertJson(child, `${path}.${key}`, depth + 1);
  }
}

export function sourceUrl(value: unknown, path: string): string {
  const text = string(value, path, 2048);
  let url: URL;
  try { url = new URL(text); } catch { throw new ImportValidationError(path, "absolute HTTP(S) URL required"); }
  if (!["https:", "http:"].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new ImportValidationError(path, "plain HTTP(S) source URL required");
  }
  return url.href.replace(/\/+$/, "") + "/";
}
