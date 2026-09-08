// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { erfahrungsgrad, haelt, haelt_etikett, parseProjectedKnowledge, type ProjectedKnowledge } from "./knowledge.ts";
import { fail, finite, integer, record, keys, identifier, string, snapshotJson, deepFreeze, RULE_LIMITS, RuleValidationError } from "./validation.ts";

export type Scalar = number | boolean | string;
export type FormulaType = "number" | "boolean" | "string";
export type BinaryOperator = "+" | "-" | "*" | "/" | "%" | "==" | "!=" | ">" | ">=" | "<" | "<=" | "&&" | "||";
export type Formula =
  | { readonly kind: "literal"; readonly value: Scalar }
  | { readonly kind: "field"; readonly source: "actor" | "input"; readonly field: string }
  | { readonly kind: "dice"; readonly count: number; readonly sides: number; readonly keep?: { readonly mode: "highest" | "lowest"; readonly count: number }; readonly explode?: number }
  | { readonly kind: "unary"; readonly op: "-" | "!"; readonly value: Formula }
  | { readonly kind: "binary"; readonly op: BinaryOperator; readonly left: Formula; readonly right: Formula }
  | { readonly kind: "if"; readonly condition: Formula; readonly then: Formula; readonly else: Formula }
  | { readonly kind: "call"; readonly name: "min" | "max" | "floor" | "ceil" | "round" | "abs" | "haelt" | "haelt_etikett" | "erfahrungsgrad"; readonly args: readonly Formula[] };

export const ENGINE_VERSION = "1.0.0" as const;
export const RNG_ALGORITHM = "xoshiro128ss-hex128-rejection-v1" as const;
const PRECEDENCE: Readonly<Record<string, number>> = { "||": 1, "&&": 2, "==": 3, "!=": 3, ">": 4, ">=": 4, "<": 4, "<=": 4, "+": 5, "-": 5, "*": 6, "/": 6, "%": 6 };
const CALLS = ["min", "max", "floor", "ceil", "round", "abs", "haelt", "haelt_etikett", "erfahrungsgrad"] as const;

/** Dice notation: NdS, optionally khN/klN and !CAP (explicit bounded explosions). */
export function parseDice(source: string): Extract<Formula, {kind: "dice"}> {
  if (typeof source !== "string" || source.length > 48) fail("dice: invalid notation");
  const match = /^(\d{1,3})d(\d{1,6})(?:(kh|kl)(\d{1,3}))?(?:!(\d{1,2}))?$/.exec(source);
  if (!match) fail("dice: expected NdS, optional khN/klN and !CAP");
  const count = integer(Number(match[1]), "dice count", 1, RULE_LIMITS.dice);
  const sides = integer(Number(match[2]), "dice sides", 2, RULE_LIMITS.sides);
  return deepFreeze({ kind: "dice", count, sides,
    ...(match[3] ? { keep: { mode: match[3] === "kh" ? "highest" as const : "lowest" as const, count: integer(Number(match[4]), "keep count", 1, count) } } : {}),
    ...(match[5] ? { explode: integer(Number(match[5]), "explosion cap", 1, RULE_LIMITS.explosions) } : {}),
  });
}

export type FormulaTokenKind = "dice" | "number" | "string" | "word" | "operator" | "paren" | "comma" | "dot" | "invalid";
export interface FormulaToken { readonly kind: FormulaTokenKind; readonly text: string; readonly start: number; readonly end: number }
export type FormulaErrorCode = "invalid-token" | "expected" | "unsupported-function" | "unknown-field" | "argument-count" | "limit" | "type" | "dice" | "number";
export type FormulaParseDetail =
  | { readonly ok: true; readonly ast: Formula; readonly tokens: readonly FormulaToken[] }
  | { readonly ok: false; readonly code: FormulaErrorCode; readonly message: string; readonly start: number; readonly end: number; readonly tokens: readonly FormulaToken[]; readonly expected?: string; readonly name?: string };

const TOKEN = /\s*(\d{1,3}d\d{1,6}(?:(?:kh|kl)\d{1,3})?(?:!\d{1,2})?|(?:\d+(?:\.\d+)?|\.\d+)|"(?:[^"\\\r\n]|\\["\\/bfnrt]|\\u[\da-fA-F]{4})*"|[a-zA-Z_][a-zA-Z_0-9]*|==|!=|>=|<=|&&|\|\||[+*/%(),.!<>-])/y;
function tokenKind(text: string): FormulaTokenKind {
  if (/^\d+d/.test(text)) return "dice";
  if (text === ".") return "dot";
  if (/^[\d.]/.test(text)) return "number";
  if (text.startsWith('"')) return "string";
  if (/^[a-zA-Z_]/.test(text)) return "word";
  if (text === "(" || text === ")") return "paren";
  if (text === ",") return "comma";
  return "operator";
}
/** Same token rule as the parser, with positions; an unreadable rest becomes one `invalid` token. */
export function tokenizeFormula(source: string): readonly FormulaToken[] {
  const tokens: FormulaToken[] = []; let offset = 0;
  while (offset < source.length) {
    if (/^\s*$/.test(source.slice(offset))) break;
    TOKEN.lastIndex = offset; const match = TOKEN.exec(source);
    if (!match) { const rest = /\s*(\S+)/y; rest.lastIndex = offset; const bad = rest.exec(source)!; const start = bad.index + bad[0].length - bad[1]!.length; tokens.push({ kind: "invalid", text: bad[1]!, start, end: start + bad[1]!.length }); break; }
    const text = match[1]!, end = TOKEN.lastIndex;
    tokens.push({ kind: tokenKind(text), text, start: end - text.length, end }); offset = end;
  }
  return tokens;
}

/** Error with the token span the parser was looking at; message and class stay exactly as before.
 *  Field is called `subject` (not `name`) to avoid shadowing Error#name from the base class. */
class FormulaSyntaxError extends RuleValidationError {
  constructor(message: string, readonly tokenIndex: number, readonly code: FormulaErrorCode, readonly expected?: string, readonly subject?: string, readonly spanEnd?: number) { super(message); }
}
/** Pratt parser over a token list; records the token span of every node for the detailed variant. */
function parseTokens(tokens: readonly string[], spans?: Map<Formula, readonly [number, number]>): Formula {
  let cursor = 0; let nodes = 0;
  // `spanEnd`, when given, widens the reported location from the single anchor token to [at, spanEnd)
  // — used for argument-count errors, where the whole call (not just its name) is the culprit.
  const syntax = (code: FormulaErrorCode, message: string, at = cursor, extra: { expected?: string; name?: string; spanEnd?: number } = {}): never => { throw new FormulaSyntaxError(message, at, code, extra.expected, extra.name, extra.spanEnd); };
  const take = (expected: string) => { if (tokens[cursor] !== expected) syntax("expected", `formula: expected ${expected}`, cursor, { expected }); cursor++; };
  const remember = (node: Formula, start: number): Formula => { spans?.set(node, [start, cursor]); return node; };
  const parse = (minPrecedence: number, depth: number): Formula => {
    if (depth > RULE_LIMITS.formulaDepth || ++nodes > RULE_LIMITS.formulaNodes) syntax("limit", "formula: complexity limit exceeded");
    const start = cursor, t = tokens[cursor++]; let left: Formula;
    if (!t) return syntax("expected", "formula: missing expression", cursor - 1, { expected: "expression" });
    if (t === "-" || t === "!") left = { kind: "unary", op: t, value: parse(7, depth + 1) };
    else if (t === "(") { left = parse(0, depth + 1); take(")"); }
    else if (/^\d+d/.test(t)) { try { left = parseDice(t); } catch (error) { syntax("dice", error instanceof Error ? error.message : "dice: invalid notation", start); } }
    else if (/^[\d.]/.test(t)) { const value = Number(t); if (!Number.isFinite(value) || Math.abs(value) > 1e12) syntax("number", "literal: expected finite number within +/-1e12", start); left = { kind: "literal", value }; }
    else if (t.startsWith('"')) left = { kind: "literal", value: JSON.parse(t) as string };
    else if (t === "true" || t === "false") left = { kind: "literal", value: t === "true" };
    else if (t === "actor" || t === "input") {
      take("."); const field = tokens[cursor++];
      if (typeof field !== "string" || !/^[a-z][a-z0-9_-]*$/.test(field) || ["constructor", "prototype", "__proto__"].includes(field)) syntax("expected", "field: invalid identifier", cursor - 1, { expected: "field" });
      left = { kind: "field", source: t, field: field as string };
    } else {
      if (t !== "if" && !(CALLS as readonly string[]).includes(t)) syntax("unsupported-function", `formula: unsupported function ${t}`, start, { name: t });
      take("("); const args: Formula[] = [];
      if (tokens[cursor] !== ")") for (;;) {
        args.push(parse(0, depth + 1)); if (args.length > 8) syntax("argument-count", "formula: argument limit exceeded", start);
        if (tokens[cursor] !== ",") break; cursor++;
      }
      take(")");
      if (t === "if") {
        if (args.length !== 3) syntax("argument-count", "if: expected three arguments", start, { name: t, spanEnd: cursor });
        left = { kind: "if", condition: args[0]!, then: args[1]!, else: args[2]! };
      } else {
        if (t === "min" || t === "max" ? args.length < 2 : args.length !== 1) syntax("argument-count", `${t}: invalid argument count`, start, { name: t, spanEnd: cursor });
        left = { kind: "call", name: t as Extract<Formula, {kind: "call"}>["name"], args };
      }
    }
    remember(left!, start);
    for (;;) {
      const op = tokens[cursor]; const precedence = op ? PRECEDENCE[op] : undefined;
      if (precedence === undefined || precedence < minPrecedence) break;
      cursor++; if (++nodes > RULE_LIMITS.formulaNodes) syntax("limit", "formula: node limit exceeded");
      left = remember({ kind: "binary", op: op as BinaryOperator, left: left!, right: parse(precedence + 1, depth + 1) }, start);
    }
    return left!;
  };
  const ast = parse(0, 0); if (cursor !== tokens.length) syntax("expected", `formula: unexpected token ${tokens[cursor]}`, cursor, { expected: "end" });
  return ast;
}

/** Pratt parser for an explicitly closed grammar. No host language is evaluated. */
export function parseFormula(source: string): Formula {
  string(source, "formula", RULE_LIMITS.formulaLength);
  const tokens = tokenizeFormula(source), last = tokens[tokens.length - 1];
  if (last?.kind === "invalid") fail(`formula: invalid token at ${last.start}`);
  if (tokens.length > RULE_LIMITS.formulaNodes * 4) fail("formula: token limit exceeded");
  // Left-associative chains must obey the same depth cap as parenthesised expressions.
  return parseFormulaAst(parseTokens(tokens.map(t => t.text)));
}

/** Same grammar and type check, reported with positions instead of thrown. */
export function parseFormulaDetailed(source: string, fields?: FormulaFieldTypes): FormulaParseDetail {
  const tokens = tokenizeFormula(source);
  const between = (span: readonly [number, number]): [number, number] => [tokens[span[0]]?.start ?? source.length, tokens[span[1] - 1]?.end ?? source.length];
  const at = (index: number, spanEnd?: number): [number, number] => spanEnd === undefined ? between([index, index + 1]) : between([index, spanEnd]);
  if (typeof source !== "string" || source.length > RULE_LIMITS.formulaLength) return { ok: false, code: "limit", message: "formula: expected nonempty string (max 4096)", start: 0, end: source.length, tokens };
  const last = tokens[tokens.length - 1];
  if (last?.kind === "invalid") return { ok: false, code: "invalid-token", message: `formula: invalid token at ${last.start}`, start: last.start, end: last.end, tokens };
  if (tokens.length > RULE_LIMITS.formulaNodes * 4) return { ok: false, code: "limit", message: "formula: token limit exceeded", start: 0, end: source.length, tokens };
  const spans = new Map<Formula, readonly [number, number]>(); let raw: Formula;
  try { raw = parseTokens(tokens.map(t => t.text), spans); }
  catch (error) {
    if (error instanceof FormulaSyntaxError) { const [start, end] = at(error.tokenIndex, error.spanEnd); return { ok: false, code: error.code, message: error.message, start, end, tokens, ...(error.expected ? { expected: error.expected } : {}), ...(error.subject ? { name: error.subject } : {}) }; }
    const message = error instanceof Error ? error.message : "formula: invalid"; return { ok: false, code: "limit", message, start: 0, end: source.length, tokens };
  }
  let ast: Formula;
  try { ast = parseFormulaAst(raw); } catch (error) { return { ok: false, code: "limit", message: error instanceof Error ? error.message : "formula: invalid", start: 0, end: source.length, tokens }; }
  if (fields) {
    // The type each child must have for `node`'s own check to pass; null means "no fixed requirement".
    // Mirrors inferFormulaType's requireType calls, but only to locate the culprit — never to validate.
    const requiredChildTypes = (node: Formula): readonly (FormulaType | null)[] => {
      switch (node.kind) {
        case "unary": return [node.op === "!" ? "boolean" : "number"];
        case "binary": {
          if (node.op === "==" || node.op === "!=") return [null, inferFormulaType(node.left, fields)];
          const type = node.op === "&&" || node.op === "||" ? "boolean" : "number";
          return [type, type];
        }
        case "if": return ["boolean", null, inferFormulaType(node.then, fields)];
        case "call": return (["haelt", "haelt_etikett", "erfahrungsgrad"] as readonly string[]).includes(node.name) ? ["string"] : node.args.map(() => "number" as const);
        default: return [];
      }
    };
    // Children first: the deepest node that fails on its own is the culprit, its parent only inherits the failure.
    const check = (node: Formula): FormulaParseDetail | null => {
      const children: Formula[] = node.kind === "unary" ? [node.value] : node.kind === "binary" ? [node.left, node.right] : node.kind === "if" ? [node.condition, node.then, node.else] : node.kind === "call" ? [...node.args] : [];
      for (const child of children) { const failure = check(child); if (failure) return failure; }
      try { inferFormulaType(node, fields); return null; }
      catch (error) {
        const message = error instanceof Error ? error.message : "formula: invalid";
        const unknown = /^formula: unknown ((?:actor|input)\.[^\s]+)$/.exec(message);
        if (unknown) { const [start, end] = between(spans.get(node) ?? [0, tokens.length]); return { ok: false, code: "unknown-field", message, start, end, tokens, name: unknown[1]! }; }
        // Every child already passed on its own; `node`'s own check fails only because one of them has the
        // wrong type in this context. Point at that child's span, not the whole enclosing expression.
        const required = requiredChildTypes(node);
        const culprit = children.find((child, i) => { const expected = required[i]; return expected != null && inferFormulaType(child, fields) !== expected; });
        const [start, end] = between(spans.get(culprit ?? node) ?? [0, tokens.length]);
        return { ok: false, code: "type", message, start, end, tokens };
      }
    };
    const failure = check(raw); if (failure) return failure;
  }
  return { ok: true, ast, tokens };
}

export function parseFormulaAst(input: unknown): Formula {
  const root = snapshotJson(input); let nodes = 0;
  const visit = (value: unknown, depth: number): void => {
    if (depth > RULE_LIMITS.formulaDepth || ++nodes > RULE_LIMITS.formulaNodes) fail("formula: AST complexity limit exceeded");
    const row = record(value, "formula AST");
    switch (row.kind) {
      case "literal": keys(row, ["kind", "value"], "literal"); if (typeof row.value === "number") finite(row.value, "literal"); else if (typeof row.value !== "boolean" && typeof row.value !== "string") fail("literal: unsupported value"); return;
      case "field": keys(row, ["kind", "source", "field"], "field"); if (row.source !== "actor" && row.source !== "input") fail("field: invalid source"); identifier(row.field, "field"); return;
      case "dice": {
        keys(row, ["kind", "count", "sides", "keep", "explode"], "dice"); const count = integer(row.count, "dice count", 1, RULE_LIMITS.dice); integer(row.sides, "dice sides", 2, RULE_LIMITS.sides);
        if (row.explode !== undefined) integer(row.explode, "explosion cap", 1, RULE_LIMITS.explosions);
        if (row.keep !== undefined) { const keep = record(row.keep, "keep"); keys(keep, ["mode", "count"], "keep"); if (keep.mode !== "highest" && keep.mode !== "lowest") fail("keep: invalid mode"); integer(keep.count, "keep count", 1, count); }
        return;
      }
      case "unary": keys(row, ["kind", "op", "value"], "unary"); if (row.op !== "-" && row.op !== "!") fail("unary: invalid operator"); visit(row.value, depth + 1); return;
      case "binary": keys(row, ["kind", "op", "left", "right"], "binary"); if (typeof row.op !== "string" || !Object.hasOwn(PRECEDENCE, row.op)) fail("binary: invalid operator"); visit(row.left, depth + 1); visit(row.right, depth + 1); return;
      case "if": keys(row, ["kind", "condition", "then", "else"], "if"); visit(row.condition, depth + 1); visit(row.then, depth + 1); visit(row.else, depth + 1); return;
      case "call": {
        keys(row, ["kind", "name", "args"], "call"); if (!(CALLS as readonly unknown[]).includes(row.name) || !Array.isArray(row.args)) fail("call: unsupported function");
        if (row.args.length > 8 || (row.name === "min" || row.name === "max" ? row.args.length < 2 : row.args.length !== 1)) fail("call: invalid argument count");
        for (const arg of row.args) visit(arg, depth + 1); return;
      }
      default: fail("formula: unsupported AST node");
    }
  };
  visit(root, 0); return deepFreeze(root as Formula);
}

export interface FormulaFieldTypes { readonly actor: Readonly<Record<string, FormulaType>>; readonly input: Readonly<Record<string, FormulaType>> }
export function inferFormulaType(ast: Formula, fields: FormulaFieldTypes): FormulaType {
  const requireType = (node: Formula, expected: FormulaType) => { if (inferFormulaType(node, fields) !== expected) fail(`formula: expected ${expected}`); };
  switch (ast.kind) {
    case "literal": return typeof ast.value as FormulaType;
    case "dice": return "number";
    case "field": { const source = fields[ast.source]; if (!Object.hasOwn(source, ast.field)) fail(`formula: unknown ${ast.source}.${ast.field}`); return source[ast.field]!; }
    case "unary": { const type = ast.op === "!" ? "boolean" : "number"; requireType(ast.value, type); return type; }
    case "binary": {
      if (ast.op === "==" || ast.op === "!=") { const left = inferFormulaType(ast.left, fields); requireType(ast.right, left); return "boolean"; }
      const type = ast.op === "&&" || ast.op === "||" ? "boolean" : "number";
      requireType(ast.left, type); requireType(ast.right, type);
      return [">", ">=", "<", "<=", "&&", "||"].includes(ast.op) ? "boolean" : "number";
    }
    case "if": requireType(ast.condition, "boolean"); { const type = inferFormulaType(ast.then, fields); requireType(ast.else, type); return type; }
    case "call": {
      if (["haelt", "haelt_etikett", "erfahrungsgrad"].includes(ast.name)) { requireType(ast.args[0]!, "string"); return ast.name === "haelt" ? "boolean" : ast.name === "erfahrungsgrad" ? "string" : "number"; }
      for (const arg of ast.args) requireType(arg, "number"); return "number";
    }
  }
}

export interface EvaluationContext {
  /** Exactly 128 bits as 32 hexadecimal digits, supplied by the authoritative server. */
  readonly seed: string;
  readonly actor: Readonly<Record<string, Scalar>>;
  readonly input?: Readonly<Record<string, Scalar>>;
  readonly knowledge: ProjectedKnowledge;
}
export interface DiceTrace { readonly path: string; readonly sides: number; readonly rolls: readonly (readonly number[])[]; readonly kept: readonly number[]; readonly total: number; readonly capped: boolean }
export interface TraceStep { readonly path: string; readonly kind: Formula["kind"]; readonly value: Scalar; readonly label?: string; readonly evidence?: readonly string[] }
export interface FormulaResult { readonly value: Scalar; readonly normalForm: Formula; readonly dice: readonly DiceTrace[]; readonly trace: readonly TraceStep[]; readonly operations: number; readonly rngAlgorithm: typeof RNG_ALGORITHM }

function scalarMap(value: unknown, at: string): Readonly<Record<string, Scalar>> {
  const data = record(value, at); if (Object.keys(data).length > RULE_LIMITS.fields) fail(`${at}: too many fields`);
  for (const [key, v] of Object.entries(data)) { identifier(key, at); if (typeof v === "number") finite(v, at); else if (typeof v !== "string" && typeof v !== "boolean") fail(`${at}: expected scalar fields`); }
  return data as Record<string, Scalar>;
}
export function parseEvaluationContext(input: unknown): EvaluationContext {
  const data = record(snapshotJson(input), "context"); keys(data, ["seed", "actor", "input", "knowledge"], "context");
  if (typeof data.seed !== "string" || !/^[a-fA-F0-9]{32}$/.test(data.seed) || /^0+$/.test(data.seed)) fail("seed: expected nonzero 128-bit hexadecimal seed");
  return deepFreeze({ seed: data.seed.toLowerCase(), actor: scalarMap(data.actor, "actor"), input: scalarMap(data.input ?? {}, "input"), knowledge: parseProjectedKnowledge(data.knowledge) });
}

/** A portable PRNG is for deterministic replay, not cryptographic secrecy. */
function generator(seed: string): () => number {
  const state = [0, 8, 16, 24].map(offset => Number.parseInt(seed.slice(offset, offset + 8), 16) >>> 0);
  const rotl = (value: number, n: number): number => ((value << n) | (value >>> (32 - n))) >>> 0;
  return () => {
    const result = Math.imul(rotl(Math.imul(state[1]!, 5), 7), 9) >>> 0;
    const t = state[1]! << 9;
    state[2] = (state[2]! ^ state[0]!) >>> 0; state[3] = (state[3]! ^ state[1]!) >>> 0;
    state[1] = (state[1]! ^ state[2]!) >>> 0; state[0] = (state[0]! ^ state[3]!) >>> 0;
    state[2] = (state[2]! ^ t) >>> 0; state[3] = rotl(state[3]!, 11);
    return result;
  };
}

export function evaluateFormula(source: string | Formula, rawContext: EvaluationContext): FormulaResult {
  const ast = typeof source === "string" ? parseFormula(source) : parseFormulaAst(source);
  const context = parseEvaluationContext(rawContext);
  inferFormulaType(ast, { actor: Object.fromEntries(Object.entries(context.actor).map(([k, v]) => [k, typeof v as FormulaType])), input: Object.fromEntries(Object.entries(context.input ?? {}).map(([k, v]) => [k, typeof v as FormulaType])) });
  const next = generator(context.seed); let operations = 0; let dieCount = 0;
  const dice: DiceTrace[] = []; const trace: TraceStep[] = [];
  const spend = () => { if (++operations > RULE_LIMITS.operations) fail("evaluation: operation limit exceeded"); };
  const num = (v: Scalar) => finite(v, "arithmetic");
  const bool = (v: Scalar): boolean => { if (typeof v !== "boolean") fail("boolean required"); return v; };
  const draw = (sides: number): number => {
    if (++dieCount > RULE_LIMITS.dice) fail("evaluation: total dice limit exceeded");
    const bound = Math.floor(0x1_0000_0000 / sides) * sides;
    // Unbiased rejection sampling; rejected PRNG words also consume the operation budget.
    for (;;) { spend(); const word = next(); if (word < bound) return word % sides + 1; }
  };
  const visit = (node: Formula, path: string): Scalar => {
    spend(); let value: Scalar; let evidence: string[] | undefined; let label: string | undefined;
    switch (node.kind) {
      case "literal": value = node.value; break;
      case "field": value = (node.source === "actor" ? context.actor : context.input!)[node.field]!; label = `${node.source}.${node.field}`; break;
      case "dice": {
        const rolls: number[][] = []; let capped = false;
        for (let i = 0; i < node.count; i++) {
          const chain = [draw(node.sides)];
          if (node.explode) while (chain[chain.length - 1] === node.sides && chain.length <= node.explode) chain.push(draw(node.sides));
          if (node.explode && chain.length === node.explode + 1 && chain[chain.length - 1] === node.sides) capped = true;
          rolls.push(chain);
        }
        const totals = rolls.map(chain => chain.reduce((sum, n) => sum + n, 0));
        const kept = totals.map((_, i) => i);
        if (node.keep) kept.sort((a, b) => (node.keep!.mode === "highest" ? totals[b]! - totals[a]! : totals[a]! - totals[b]!) || a - b).splice(node.keep.count);
        kept.sort((a, b) => a - b); value = kept.reduce((sum, i) => sum + totals[i]!, 0);
        dice.push({ path, sides: node.sides, rolls, kept, total: value, capped }); break;
      }
      case "unary": { const v = visit(node.value, `${path}.value`); value = node.op === "!" ? !bool(v) : -num(v); break; }
      case "binary": {
        const left = visit(node.left, `${path}.left`);
        if (node.op === "&&" && !bool(left)) { value = false; break; }
        if (node.op === "||" && bool(left)) { value = true; break; }
        const right = visit(node.right, `${path}.right`);
        switch (node.op) {
          case "+": value = num(left) + num(right); break;
          case "-": value = num(left) - num(right); break;
          case "*": value = num(left) * num(right); break;
          case "/": if (num(right) === 0) fail("division by zero"); value = num(left) / num(right); break;
          case "%": if (num(right) === 0) fail("division by zero"); value = num(left) % num(right); break;
          case "==": value = left === right; break;
          case "!=": value = left !== right; break;
          case ">": value = num(left) > num(right); break;
          case ">=": value = num(left) >= num(right); break;
          case "<": value = num(left) < num(right); break;
          case "<=": value = num(left) <= num(right); break;
          case "&&": case "||": value = bool(right); break;
        }
        break;
      }
      case "if": value = bool(visit(node.condition, `${path}.condition`)) ? visit(node.then, `${path}.then`) : visit(node.else, `${path}.else`); break;
      case "call": {
        const args = node.args.map((arg, i) => visit(arg, `${path}.args.${i}`)); label = node.name;
        switch (node.name) {
          case "min": value = Math.min(...args.map(num)); break;
          case "max": value = Math.max(...args.map(num)); break;
          case "floor": value = Math.floor(num(args[0]!)); break;
          case "ceil": value = Math.ceil(num(args[0]!)); break;
          case "round": value = Math.round(num(args[0]!)); break;
          case "abs": value = Math.abs(num(args[0]!)); break;
          case "haelt": { const pid = args[0] as string; value = haelt(context.knowledge, pid); evidence = context.knowledge.passages.filter(p => p.passageId === pid).map(p => p.passageId).sort(); break; }
          case "haelt_etikett": case "erfahrungsgrad": {
            const tag = args[0] as string; value = node.name === "haelt_etikett" ? haelt_etikett(context.knowledge, tag) : erfahrungsgrad(context.knowledge, tag);
            evidence = context.knowledge.passages.filter(p => p.labels.includes(tag)).map(p => p.passageId).sort(); break;
          }
        }
        break;
      }
    }
    if (typeof value === "number") value = Object.is(value, -0) ? 0 : finite(value, "result");
    trace.push({ path, kind: node.kind, value, ...(label === undefined ? {} : { label }), ...(evidence === undefined ? {} : { evidence }) });
    return value;
  };
  const value = visit(ast, "root");
  return deepFreeze({ value, normalForm: ast, dice, trace, operations, rngAlgorithm: RNG_ALGORITHM });
}
