export class RuleValidationError extends Error {
  override readonly name = "RuleValidationError";
  constructor(message: string) { super(message); }
}

export const RULE_LIMITS = Object.freeze({
  packageBytes: 1_048_576, jsonDepth: 48, jsonNodes: 50_000,
  formulaLength: 4096, formulaDepth: 32, formulaNodes: 512,
  operations: 4096, dice: 100, sides: 100_000, explosions: 20,
  fields: 64, actions: 64, knowledgePassages: 2048, vitals: 8,
});

export function fail(message: string): never { throw new RuleValidationError(message); }
export function record(value: unknown, at: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) fail(`${at}: expected object`);
  const proto: unknown = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) fail(`${at}: expected plain JSON object`);
  return value as Record<string, unknown>;
}
export function keys(value: Record<string, unknown>, allowed: readonly string[], at: string): void {
  for (const key of Object.keys(value)) if (!allowed.includes(key)) fail(`${at}: unsupported property ${key}`);
}
export function string(value: unknown, at: string, max = 256): string {
  if (typeof value !== "string" || value.length === 0 || value.length > max) fail(`${at}: expected nonempty string (max ${max})`);
  return value;
}
export function integer(value: unknown, at: string, min: number, max: number): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < min || value > max) fail(`${at}: expected integer ${min}..${max}`);
  return value;
}
export function finite(value: unknown, at: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || Math.abs(value) > 1e12) fail(`${at}: expected finite number within +/-1e12`);
  return value;
}
function jsonNumber(value: number): number {
  // Container timestamps and provenance use epoch milliseconds. Formula arithmetic has
  // its own tighter bound; applying that bound to generic JSON would reject today's date.
  if (!Number.isFinite(value) || Math.abs(value) > Number.MAX_SAFE_INTEGER) fail("JSON number: outside finite safe range");
  return value;
}
export function array(value: unknown, at: string, max: number): unknown[] {
  if (!Array.isArray(value) || value.length > max) fail(`${at}: expected array (max ${max})`);
  return value;
}
export function identifier(value: unknown, at: string): string {
  const result = string(value, at, 96);
  if (!/^[a-z][a-z0-9_-]*$/.test(result) || ["constructor", "prototype", "__proto__"].includes(result)) fail(`${at}: invalid identifier`);
  return result;
}
export function semver(value: unknown, at: string): string {
  const result = string(value, at, 32);
  if (!/^(0|[1-9]\d{0,5})\.(0|[1-9]\d{0,5})\.(0|[1-9]\d{0,5})$/.test(result)) fail(`${at}: expected release version x.y.z`);
  return result;
}

/** JSON parser with duplicate-key rejection and bounds before recursion / JSON.parse. */
export function parseBoundedJson(source: string): unknown {
  if (new TextEncoder().encode(source).length > RULE_LIMITS.packageBytes) fail("package: size limit exceeded");
  let pos = 0; let nodes = 0;
  const whitespace = () => { while (pos < source.length && /[\t\n\r ]/.test(source[pos]!)) pos++; };
  const quoted = (): string => {
    const start = pos++;
    while (pos < source.length) {
      const ch = source[pos++];
      if (ch === "\\") { pos++; continue; }
      if (ch === '"') {
        try { return JSON.parse(source.slice(start, pos)) as string; } catch { fail("package: invalid JSON string"); }
      }
    }
    return fail("package: unterminated JSON string");
  };
  const value = (depth: number): void => {
    if (++nodes > RULE_LIMITS.jsonNodes || depth > RULE_LIMITS.jsonDepth) fail("package: JSON complexity limit exceeded");
    whitespace(); const ch = source[pos];
    if (ch === '"') { quoted(); return; }
    if (ch === "{" || ch === "[") {
      const object = ch === "{"; const close = object ? "}" : "]"; const seen = new Set<string>();
      pos++; whitespace(); if (source[pos] === close) { pos++; return; }
      for (;;) {
        whitespace();
        if (object) {
          if (source[pos] !== '"') fail("package: expected JSON key");
          const key = quoted();
          if (seen.has(key)) fail(`package: duplicate JSON key ${key}`);
          if (["__proto__", "constructor", "prototype"].includes(key)) fail("package: forbidden JSON key");
          seen.add(key); whitespace(); if (source[pos++] !== ":") fail("package: expected colon");
        }
        value(depth + 1); whitespace();
        if (source[pos] === close) { pos++; return; }
        if (source[pos++] !== ",") fail("package: invalid JSON collection");
      }
    }
    const start = pos;
    while (pos < source.length && !/[\t\n\r ,}\]]/.test(source[pos]!)) pos++;
    if (pos === start) fail("package: expected JSON value");
    try { const v: unknown = JSON.parse(source.slice(start, pos)); if (typeof v === "number") jsonNumber(v); } catch { fail("package: invalid JSON primitive"); }
  };
  value(0); whitespace(); if (pos !== source.length) fail("package: trailing JSON content");
  try { return JSON.parse(source) as unknown; } catch { return fail("package: invalid JSON"); }
}

/** Snapshot JSON objects without invoking getters, prototypes or toJSON. */
export function snapshotJson(input: unknown): unknown {
  const ancestors = new Set<object>(); let nodes = 0;
  const copy = (value: unknown, depth: number): unknown => {
    if (++nodes > RULE_LIMITS.jsonNodes || depth > RULE_LIMITS.jsonDepth) fail("JSON complexity limit exceeded");
    if (value === null || typeof value === "boolean" || typeof value === "string") return value;
    if (typeof value === "number") return jsonNumber(value);
    if (typeof value !== "object") return fail("expected JSON value");
    if (ancestors.has(value)) fail("cyclic JSON is forbidden");
    ancestors.add(value);
    let result: unknown;
    if (Array.isArray(value)) {
      if (value.length > RULE_LIMITS.jsonNodes) fail("JSON array too large");
      const out: unknown[] = [];
      for (let i = 0; i < value.length; i++) {
        const descriptor = Object.getOwnPropertyDescriptor(value, String(i));
        if (!descriptor || !Object.hasOwn(descriptor, "value")) fail("sparse arrays and accessors are forbidden");
        out.push(copy(descriptor.value, depth + 1));
      }
      result = out;
    } else {
      record(value, "JSON"); const out: Record<string, unknown> = {};
      for (const key of Object.keys(value)) {
        if (["__proto__", "constructor", "prototype"].includes(key)) fail("forbidden JSON key");
        const descriptor = Object.getOwnPropertyDescriptor(value, key)!;
        if (!Object.hasOwn(descriptor, "value")) fail("JSON accessors are forbidden");
        out[key] = copy(descriptor.value, depth + 1);
      }
      result = out;
    }
    ancestors.delete(value); return result;
  };
  const result = copy(input, 0);
  if (new TextEncoder().encode(JSON.stringify(result)).length > RULE_LIMITS.packageBytes) fail("JSON size limit exceeded");
  return result;
}

export function stableJson(value: unknown): string {
  const sort = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(sort);
    if (v !== null && typeof v === "object") return Object.fromEntries(Object.keys(v).sort().map(k => [k, sort((v as Record<string, unknown>)[k])]));
    return v;
  };
  return JSON.stringify(sort(snapshotJson(value)));
}

export function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}
