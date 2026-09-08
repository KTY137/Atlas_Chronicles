# Regelschmiede Formel-Bauteil Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Die Regelschmiede bekommt ein Formel-Bauteil mit Zeile (`1d20 + @geschick`), aufgeräumten Bausteinen und Knotennetz als drei Ansichten desselben Syntaxbaums, dazu ein Layout im Objekt-Bild (Attribute, Abgeleitet, Aktionen als Methoden) und Klartext ohne Fachjargon.

**Architecture:** Zwei additive Exporte im Regelpaket (`tokenizeFormula`, `parseFormulaDetailed`) liefern Tokens und Fehlerpositionen aus der einen Grammatik. Der Client entzuckert `@x`/`?x` nur beim Anzeigen und Tippen; gespeichert bleibt `actor.x`/`input.x`. Ein Bauteil `FormulaField` hält Text und Baum und rendert wahlweise `FormulaLine`, `FormulaBlocks` oder `FormulaGraph`; Aktionen und Attribute bekommen Liste-plus-Editor.

**Tech Stack:** TypeScript, React 18 (JSX automatic), Vitest (Umgebung `node`, Rendering über `react-dom/server` und den vorhandenen Harness), Playwright (`msedge` unter Windows), esbuild/Vite, keine neue Abhängigkeit.

**Spec:** `docs/superpowers/specs/2026-09-08-regelschmiede-formel-bauteil-design.md`

## Global Constraints

- Keine Änderung an `parseFormula`, `evaluateFormula`, `ENGINE_VERSION` (`1.0.0`), Paketformaten, Belegen; im Regelpaket nur additive Exporte plus Tests.
- Nicht anfassen: `packages/protocol`, `packages/io`, `packages/server`, `packages/chronist`, `.claude/worktrees/featureliste` (Flächen der Sitzung `project-atlas-54`).
- Jede Quelldatei beginnt mit `// SPDX-License-Identifier: BUSL-1.1` und `// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.` (nicht in `.sql`, nicht in `.md`).
- Sichtbare Texte ohne Fachjargon (Verbotsliste in Task 11): Parser, Token, Tokenizer, kanonisch, Syntax, Syntaxbaum, AST, Port, Skalar, Identifier, Schema, Typinferenz, Literal, Operand, Operator, Expression, Input, Field. Alltagswörter: Formel, Zeile, Wert, Attribut, Parameter, Würfel, Rechenzeichen, Bedingung, Beispiel.
- Zucker: `@ident` ⇄ `actor.ident`, `?ident` ⇄ `input.ident`; `?ident.member` ist reserviert und liefert einen Klartextfehler. Unveränderte Ausdrücke werden byteidentisch zurückgeschrieben.
- Gezielte Tests statt voller Suite (~4 min). Beide Gates vor jedem Abschluss: `npm run typecheck` (prüft den Client nicht) und `npm run build` (prüft den Client). Vitest: `npx vitest run <dateien>`. Playwright: `npx playwright test <spec>`.
- Commits nur eigene Dateien, nie fremde Zwischenstände; Commit-Trailer `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- Ansichtswahl und Erst-Hinweis im `localStorage`, jeder Zugriff in `try/catch`, Seite funktioniert ohne gespeicherten Wert.

---

## Dateistruktur

| Datei | Verantwortung |
| --- | --- |
| `packages/rules/src/formula.ts` (ändern) | `tokenizeFormula`, `parseFormulaDetailed`, interner Parser mit Positionen; `parseFormula` unverändert im Verhalten |
| `packages/rules/src/index.ts` (ändern) | Exporte der neuen Funktionen und Typen |
| `packages/rules/test/formula-detailed.test.ts` (neu) | Tokens, Positionen, Fehlercodes, Gleichheit mit `parseFormula` |
| `packages/client/src/features/formula-sugar.ts` (neu) | Zucker hin/zurück mit Positionsabbildung, Analyse (Spans, Fehler in Klartext, Vorschläge), Vervollständigung |
| `packages/client/src/features/formula-example.ts` (neu) | Beispielfigur, Auswertung mit der Engine, Zerlegung aus der Ablaufspur, Text „Beispiel: 17 = …" |
| `packages/client/src/features/formula-graph-model.ts` (neu) | Baum → Knoten/Kanten/Layout; Bearbeitungen am Baum über Pfade |
| `packages/client/src/features/FormulaLine.tsx` (neu) | Zeile: Eingabe, Überlagerung, Vervollständigung, Spickzettel, Statuszeile |
| `packages/client/src/features/FormulaBlocks.tsx` (neu, ersetzt `FormulaBuilder.tsx`) | Waagerechte Bausteine mit Menü |
| `packages/client/src/features/FormulaGraph.tsx` (neu) | Knotennetz mit SVG-Kanten und Bearbeitung |
| `packages/client/src/features/FormulaField.tsx` (neu) | Bauteil: Text+Baum, Umschalter, Byte-Treue, Beispiel-Kontext |
| `packages/client/src/features/formula-field.css` (neu) | Stile aller Formelansichten |
| `packages/client/src/features/RuleActionEditor.tsx` (neu) | Aktionen: Liste plus Methodenkarte |
| `packages/client/src/features/RuleFieldList.tsx` (neu) | Attribute: Liste plus Editor (FieldEditor zieht um) |
| `packages/client/src/features/RuleDeclarativeEditor.tsx` (ändern) | `ExpressionInput` → `FormulaField`; Abgeleitet als drei Listen |
| `packages/client/src/features/RuleForge.tsx` (ändern) | Objektkarte, Reiter im Objekt-Bild, Beispiel-Kontext, Migration mit `FormulaField` |
| `packages/client/src/features/rule-forge-model.ts` (ändern) | `expression?` an `DraftAction` und numerischem Migrationsschritt |
| `packages/client/src/features/rule-forge.css` (ändern) | Liste-plus-Editor, Objektkarte |
| `packages/client/test/formula-sugar.test.ts`, `formula-example.test.ts`, `formula-graph-model.test.ts`, `formula-field.test.ts`, `rule-forge-klartext.test.ts` (neu) | gezielte Tests |
| `packages/client/test/htbah-client-review.test.ts`, `rule-forge-model.test.ts` (ändern) | an `FormulaField` und `expression?` angepasst |
| `e2e/rule-forge.spec.ts`, `e2e/htbah.spec.ts` (ändern), `e2e/rule-forge-formula.spec.ts` (neu) | Browserabläufe |
| `design/iterations/regelschmiede-formel-bauteil-20260908.md` (neu), `STATUS.md` (ändern) | Nachweise |

---

### Task 1: Tokens und Fehlerpositionen im Regelpaket

**Files:**
- Modify: `packages/rules/src/formula.ts` (Zeilen 36–89: `parseFormula`)
- Modify: `packages/rules/src/index.ts` (Zeile 5)
- Test: `packages/rules/test/formula-detailed.test.ts`

**Interfaces:**
- Consumes: `fail`, `RULE_LIMITS`, `string`, `identifier`, `parseDice`, `inferFormulaType`, `parseFormulaAst` aus derselben Datei.
- Produces:
  ```ts
  export type FormulaTokenKind = "dice" | "number" | "string" | "word" | "operator" | "paren" | "comma" | "dot" | "invalid";
  export interface FormulaToken { readonly kind: FormulaTokenKind; readonly text: string; readonly start: number; readonly end: number }
  export type FormulaErrorCode = "invalid-token" | "expected" | "unsupported-function" | "unknown-field" | "argument-count" | "limit" | "type" | "dice" | "number";
  export type FormulaParseDetail =
    | { readonly ok: true; readonly ast: Formula; readonly tokens: readonly FormulaToken[] }
    | { readonly ok: false; readonly code: FormulaErrorCode; readonly message: string; readonly start: number; readonly end: number; readonly tokens: readonly FormulaToken[]; readonly expected?: string; readonly name?: string };
  export function tokenizeFormula(source: string): readonly FormulaToken[];
  export function parseFormulaDetailed(source: string, fields?: FormulaFieldTypes): FormulaParseDetail;
  ```
  `start`/`end` sind Zeichenpositionen in `source`; bei Fehlern am Ende gilt `start === end === source.length`.

- [ ] **Step 1: Failing test schreiben**

`packages/rules/test/formula-detailed.test.ts`:

```ts
// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { describe, expect, it } from "vitest";
import { RuleValidationError, parseFormula, parseFormulaDetailed, tokenizeFormula } from "../src/index.ts";

const fields = { actor: { geschick: "number" as const, vertraut: "boolean" as const }, input: { bonus: "number" as const } };

describe("formula tokens carry positions", () => {
  it("tokenizes dice, numbers, words, operators and strings with offsets", () => {
    expect(tokenizeFormula('1d20 + actor.geschick >= "x"')).toEqual([
      { kind: "dice", text: "1d20", start: 0, end: 4 }, { kind: "operator", text: "+", start: 5, end: 6 },
      { kind: "word", text: "actor", start: 7, end: 12 }, { kind: "dot", text: ".", start: 12, end: 13 }, { kind: "word", text: "geschick", start: 13, end: 21 },
      { kind: "operator", text: ">=", start: 22, end: 24 }, { kind: "string", text: '"x"', start: 25, end: 28 },
    ]);
    expect(tokenizeFormula("min(1, 2)").map(t => t.kind)).toEqual(["word", "paren", "number", "comma", "number", "paren"]);
  });
  it("reports an unknown character as an invalid token instead of throwing", () => {
    expect(tokenizeFormula("1 + §2")).toEqual([{ kind: "number", text: "1", start: 0, end: 1 }, { kind: "operator", text: "+", start: 2, end: 3 }, { kind: "invalid", text: "§2", start: 4, end: 6 }]);
  });
});

describe("detailed parsing agrees with the frozen parser", () => {
  it.each(["1d20 + actor.geschick", "if(actor.vertraut, 2, 1)", "min(1, input.bonus) * 2", "(1 + 2) * 3", '"a" == "a"'])("returns the same tree for %s", source => {
    const detail = parseFormulaDetailed(source, fields);
    expect(detail.ok).toBe(true);
    if (detail.ok) expect(detail.ast).toEqual(parseFormula(source));
  });
  it.each([
    ["1 + §2", "invalid-token", 4, 6],
    ["(1 + 2", "expected", 6, 6],
    ["1 +", "expected", 3, 3],
    ["1 2", "expected", 2, 3],
    ["borf(1)", "unsupported-function", 0, 4],
    ["actor.gescick + 1", "unknown-field", 0, 13],
    ["min(1)", "argument-count", 0, 6],
    ["if(1, 2)", "argument-count", 0, 8],
    ["actor.vertraut + 1", "type", 0, 14],
    ["1d0", "dice", 0, 3],
    ["1e400", "number", 0, 5],
  ])("locates %s as %s at %i..%i", (source, code, start, end) => {
    const detail = parseFormulaDetailed(source, fields);
    expect(detail.ok).toBe(false);
    if (!detail.ok) { expect(detail.code).toBe(code); expect([detail.start, detail.end]).toEqual([start, end]); }
  });
  it("names the unknown field and the unsupported function", () => {
    const unknown = parseFormulaDetailed("actor.gescick", fields), func = parseFormulaDetailed("borf(1)", fields);
    expect(!unknown.ok && unknown.name).toBe("actor.gescick");
    expect(!func.ok && func.name).toBe("borf");
    const paren = parseFormulaDetailed("(1", fields);
    expect(!paren.ok && paren.expected).toBe(")");
  });
  it("reports length and nesting limits as limit", () => {
    expect(parseFormulaDetailed("1".repeat(4097))).toMatchObject({ ok: false, code: "limit", start: 0 });
    expect(parseFormulaDetailed("(".repeat(40) + "1" + ")".repeat(40))).toMatchObject({ ok: false, code: "limit" });
  });
  it("keeps parseFormula messages and error class unchanged", () => {
    expect(() => parseFormula("borf(1)")).toThrow(RuleValidationError);
    expect(() => parseFormula("borf(1)")).toThrow("formula: unsupported function borf");
    expect(() => parseFormula("1 + §2")).toThrow("formula: invalid token at 4");
  });
});
```

Hinweis zu `"1e400"`: die Token-Regel kennt kein `e`, der Text zerfällt in `1` und `e400`; erwartet ist dann `expected` an `e400`. Passe die Zeile beim Schreiben so an: `["1e400", "expected", 1, 5]`. Für `number` nutze stattdessen `["99999999999999", "number", 0, 14]` (über 1e12).

- [ ] **Step 2: Test laufen lassen, Fehlschlag sehen**

Run: `npx vitest run packages/rules/test/formula-detailed.test.ts`
Expected: FAIL — `tokenizeFormula` / `parseFormulaDetailed` sind kein Export von `../src/index.ts`.

- [ ] **Step 3: Parser refaktorieren und neue Funktionen schreiben**

In `packages/rules/src/formula.ts` die bisherige Funktion `parseFormula` (Zeilen 36–89) durch diesen Block ersetzen. `parseFormulaAst` und alles danach bleiben unverändert.

```ts
export type FormulaTokenKind = "dice" | "number" | "string" | "word" | "operator" | "paren" | "comma" | "dot" | "invalid";
export interface FormulaToken { readonly kind: FormulaTokenKind; readonly text: string; readonly start: number; readonly end: number }
export type FormulaErrorCode = "invalid-token" | "expected" | "unsupported-function" | "unknown-field" | "argument-count" | "limit" | "type" | "dice" | "number";
export type FormulaParseDetail =
  | { readonly ok: true; readonly ast: Formula; readonly tokens: readonly FormulaToken[] }
  | { readonly ok: false; readonly code: FormulaErrorCode; readonly message: string; readonly start: number; readonly end: number; readonly tokens: readonly FormulaToken[]; readonly expected?: string; readonly name?: string };

const TOKEN = /\s*(\d{1,3}d\d{1,6}(?:(?:kh|kl)\d{1,3})?(?:!\d{1,2})?|(?:\d+(?:\.\d+)?|\.\d+)|"(?:[^"\\\r\n]|\\["\\/bfnrt]|\\u[\da-fA-F]{4})*"|[a-zA-Z_][a-zA-Z_0-9]*|==|!=|>=|<=|&&|\|\||[+*/%(),.!<>-])/y;
function tokenKind(text: string): FormulaTokenKind {
  if (/^\d+d/.test(text)) return "dice";
  if (/^[\d.]/.test(text)) return "number";
  if (text.startsWith('"')) return "string";
  if (/^[a-zA-Z_]/.test(text)) return "word";
  if (text === "(" || text === ")") return "paren";
  if (text === ",") return "comma";
  if (text === ".") return "dot";
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

/** Error with the token index the parser was looking at; message and class stay exactly as before. */
class FormulaSyntaxError extends RuleValidationError {
  constructor(message: string, readonly tokenIndex: number, readonly code: FormulaErrorCode, readonly expected?: string, readonly name?: string) { super(message); }
}
/** Pratt parser over a token list; records the token span of every node for the detailed variant. */
function parseTokens(tokens: readonly string[], spans?: Map<Formula, readonly [number, number]>): Formula {
  let cursor = 0; let nodes = 0;
  const syntax = (code: FormulaErrorCode, message: string, at = cursor, extra: { expected?: string; name?: string } = {}): never => { throw new FormulaSyntaxError(message, at, code, extra.expected, extra.name); };
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
        if (args.length !== 3) syntax("argument-count", "if: expected three arguments", start, { name: t });
        left = { kind: "if", condition: args[0]!, then: args[1]!, else: args[2]! };
      } else {
        if (t === "min" || t === "max" ? args.length < 2 : args.length !== 1) syntax("argument-count", `${t}: invalid argument count`, start, { name: t });
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
  const at = (index: number): [number, number] => { const token = tokens[index]; return token ? [token.start, token.end] : [source.length, source.length]; };
  const between = (span: readonly [number, number]): [number, number] => [tokens[span[0]]?.start ?? source.length, tokens[span[1] - 1]?.end ?? source.length];
  if (typeof source !== "string" || source.length > RULE_LIMITS.formulaLength) return { ok: false, code: "limit", message: "formula: expected nonempty string (max 4096)", start: 0, end: source.length, tokens };
  const last = tokens[tokens.length - 1];
  if (last?.kind === "invalid") return { ok: false, code: "invalid-token", message: `formula: invalid token at ${last.start}`, start: last.start, end: last.end, tokens };
  if (tokens.length > RULE_LIMITS.formulaNodes * 4) return { ok: false, code: "limit", message: "formula: token limit exceeded", start: 0, end: source.length, tokens };
  const spans = new Map<Formula, readonly [number, number]>(); let raw: Formula;
  try { raw = parseTokens(tokens.map(t => t.text), spans); }
  catch (error) {
    if (error instanceof FormulaSyntaxError) { const [start, end] = at(error.tokenIndex); return { ok: false, code: error.code, message: error.message, start, end, tokens, ...(error.expected ? { expected: error.expected } : {}), ...(error.name ? { name: error.name } : {}) }; }
    const message = error instanceof Error ? error.message : "formula: invalid"; return { ok: false, code: "limit", message, start: 0, end: source.length, tokens };
  }
  let ast: Formula;
  try { ast = parseFormulaAst(raw); } catch (error) { return { ok: false, code: "limit", message: error instanceof Error ? error.message : "formula: invalid", start: 0, end: source.length, tokens }; }
  if (fields) {
    // Children first: the deepest node that fails on its own is the culprit, its parent only inherits the failure.
    const check = (node: Formula): FormulaParseDetail | null => {
      const children: Formula[] = node.kind === "unary" ? [node.value] : node.kind === "binary" ? [node.left, node.right] : node.kind === "if" ? [node.condition, node.then, node.else] : node.kind === "call" ? [...node.args] : [];
      for (const child of children) { const failure = check(child); if (failure) return failure; }
      try { inferFormulaType(node, fields); return null; }
      catch (error) {
        const message = error instanceof Error ? error.message : "formula: invalid", [start, end] = between(spans.get(node) ?? [0, tokens.length]);
        const unknown = /^formula: unknown ((?:actor|input)\.[^\s]+)$/.exec(message);
        return { ok: false, code: unknown ? "unknown-field" : "type", message, start, end, tokens, ...(unknown ? { name: unknown[1]! } : {}) };
      }
    };
    const failure = check(raw); if (failure) return failure;
  }
  return { ok: true, ast, tokens };
}
```

Dann in `packages/rules/src/index.ts` Zeile 5 erweitern:

```ts
export { ENGINE_VERSION, RNG_ALGORITHM, parseDice, parseFormula, parseFormulaAst, parseFormulaDetailed, tokenizeFormula, inferFormulaType, evaluateFormula, parseEvaluationContext, type Scalar, type FormulaType, type Formula, type FormulaFieldTypes, type FormulaToken, type FormulaTokenKind, type FormulaErrorCode, type FormulaParseDetail, type EvaluationContext, type DiceTrace, type TraceStep, type FormulaResult } from "./formula.ts";
```

Achtung: `RuleValidationError` wird oben in `formula.ts` noch nicht importiert; `import { fail, finite, integer, record, keys, identifier, string, snapshotJson, deepFreeze, RULE_LIMITS, RuleValidationError } from "./validation.ts";`. Die alte Prüfung `finite(Number(t), "literal")` bleibt inhaltlich (gleiche Grenze 1e12), nur mit Position.

- [ ] **Step 4: Tests laufen lassen**

Run: `npx vitest run packages/rules/test/formula-detailed.test.ts packages/rules/test/rules.test.ts packages/rules/test/package-v2.test.ts packages/rules/test/how-to-be-a-hero.test.ts`
Expected: alle grün. Danach `npx vitest run packages/client/test/rule-forge-model.test.ts packages/client/test/htbah-forge.test.ts` (Konsumenten von `parseFormula`) grün und `npx tsc -p tsconfig.json --noEmit` Exit 0.

- [ ] **Step 5: Commit**

```bash
git add packages/rules/src/formula.ts packages/rules/src/index.ts packages/rules/test/formula-detailed.test.ts
git commit -m "feat(rules): Tokens und Fehlerpositionen aus der einen Formelgrammatik" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2: Zucker, Analyse und Vervollständigung im Client

**Files:**
- Create: `packages/client/src/features/formula-sugar.ts`
- Test: `packages/client/test/formula-sugar.test.ts`

**Interfaces:**
- Consumes: `parseFormulaDetailed`, `tokenizeFormula`, `type Formula`, `type FormulaType`, `type FormulaErrorCode`, `type FormulaFieldTypes` aus `@chronicle/rules` (Task 1).
- Produces:
  ```ts
  export interface FormulaMember { readonly id: string; readonly label: string; readonly type: FormulaType }
  export interface FormulaSources { readonly actor: readonly FormulaMember[]; readonly input: readonly FormulaMember[] }
  export interface FormulaOptions { readonly allowDice: boolean; readonly allowKnowledge: boolean }
  export type SpanKind = "attribute" | "parameter" | "dice" | "number" | "text" | "function" | "keyword" | "operator" | "paren" | "invalid";
  export interface HighlightSpan { readonly kind: SpanKind; readonly start: number; readonly end: number; readonly title?: string; readonly missing?: boolean }
  export interface FormulaError { readonly message: string; readonly start: number; readonly end: number; readonly code: FormulaErrorCode | "object-path" | "dice-forbidden" | "knowledge-forbidden" | "empty" }
  export interface FormulaAnalysis { readonly text: string; readonly canonical: string; readonly ok: boolean; readonly ast?: Formula; readonly error?: FormulaError; readonly spans: readonly HighlightSpan[] }
  export interface CompletionItem { readonly insert: string; readonly title: string; readonly detail: string; readonly kind: "attribute" | "parameter" | "function" | "dice" | "note" }
  export interface Completion { readonly start: number; readonly end: number; readonly items: readonly CompletionItem[] }
  export function desugarFormula(text: string): { canonical: string; map: readonly number[] };
  export function resugarFormula(expression: string): string;
  export function fieldTypesOf(sources: FormulaSources): FormulaFieldTypes;
  export function analyzeFormula(text: string, sources: FormulaSources, options: FormulaOptions): FormulaAnalysis;
  export function completionsAt(text: string, caret: number, sources: FormulaSources, options: FormulaOptions): Completion | null;
  export function typeWord(type: FormulaType): string; // "Zahl" | "Ja/Nein" | "Text"
  export const FUNCTION_HELP: readonly { name: string; title: string; knowledge: boolean; insert: string }[];
  ```
  `map[i]` ist die Position in `text`, an der das kanonische Zeichen `i` beginnt; `map[canonical.length]` ist `text.length`.

- [ ] **Step 1: Failing test schreiben**

`packages/client/test/formula-sugar.test.ts`:

```ts
// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { describe, expect, it } from "vitest";
import { HOW_TO_BE_A_HERO_PACKAGE } from "@chronicle/rules";
import { analyzeFormula, completionsAt, desugarFormula, resugarFormula, type FormulaSources } from "../src/features/formula-sugar";

const sources: FormulaSources = { actor: [{ id: "geschick", label: "Geschick", type: "number" }, { id: "vertraut", label: "Vertraut", type: "boolean" }, { id: "erste-hilfe", label: "Erste Hilfe", type: "number" }], input: [{ id: "bonus", label: "Bonus", type: "number" }] };
const options = { allowDice: true, allowKnowledge: false };

describe("sugar keeps the stored expression canonical", () => {
  it.each([["1d20 + @geschick", "1d20 + actor.geschick"], ["?bonus * 2", "input.bonus * 2"], ['"@nicht" == @geschick', '"@nicht" == actor.geschick'], ["actor.geschick", "actor.geschick"]])("desugars %s", (text, canonical) => {
    expect(desugarFormula(text).canonical).toBe(canonical);
  });
  it("maps canonical positions back to the typed text", () => {
    const { canonical, map } = desugarFormula("1d20 + @geschick");
    expect(canonical.slice(7, 21)).toBe("actor.geschick"); expect(map[7]).toBe(7); expect(map[21]).toBe(16); expect(map[canonical.length]).toBe(16);
  });
  it.each([["actor.geschick + input.bonus", "@geschick + ?bonus"], ['"actor.x" + 1', '"actor.x" + 1'], ["min(actor.geschick, 3)", "min(@geschick, 3)"]])("resugars %s", (expression, text) => {
    expect(resugarFormula(expression)).toBe(text);
  });
  it("round-trips the HTBAH package expressions byte for byte", () => {
    for (const action of HOW_TO_BE_A_HERO_PACKAGE.actions) expect(desugarFormula(resugarFormula(action.expression)).canonical).toBe(action.expression);
    for (const value of HOW_TO_BE_A_HERO_PACKAGE.computed ?? []) expect(desugarFormula(resugarFormula(value.expression)).canonical).toBe(value.expression);
  });
});

describe("analysis explains in plain German with positions in the typed text", () => {
  it("highlights attributes, parameters, dice and functions", () => {
    const analysis = analyzeFormula("min(1d20, 3) + @geschick + ?bonus", sources, options);
    expect(analysis.ok).toBe(true); expect(analysis.canonical).toBe("min(1d20, 3) + actor.geschick + input.bonus");
    expect(analysis.spans.map(s => [s.kind, s.start, s.end])).toEqual([["function", 0, 3], ["paren", 3, 4], ["dice", 4, 8], ["operator", 8, 9], ["number", 10, 11], ["paren", 11, 12], ["operator", 13, 14], ["attribute", 15, 24], ["operator", 25, 26], ["parameter", 27, 33]]);
    expect(analysis.spans.find(s => s.kind === "attribute")?.title).toBe("Geschick");
  });
  it.each([
    ["1d20 + @gescick", "unknown-field", "Das Attribut „gescick“ gibt es nicht. Meintest du „geschick“?", 7, 15],
    ["(1 + 2", "expected", "Hier fehlt eine schließende Klammer.", 6, 6],
    ["1 +", "expected", "Nach dem Rechenzeichen fehlt noch ein Wert, zum Beispiel eine Zahl, ein Würfel oder ein Attribut.", 3, 3],
    ["borf(1)", "unsupported-function", "„borf“ kennt die Schmiede nicht. Erlaubt sind min, max, floor, ceil, round, abs und if.", 0, 4],
    ["min(1)", "argument-count", "„min“ braucht mindestens zwei Werte.", 0, 6],
    ["@vertraut + 1", "type", "Hier wird eine Zahl gebraucht, aber „Vertraut“ ist Ja/Nein.", 0, 9],
    ["1 + §", "invalid-token", "Dieses Zeichen gehört nicht in eine Formel.", 4, 5],
    ["?waffe.schaden", "object-path", "Werte von Gegenständen kommen mit einem späteren Schritt; heute gibt es nur Attribute und Parameter.", 0, 14],
    ["", "empty", "Trage eine Formel ein, zum Beispiel 1d20 + @geschick.", 0, 0],
  ])("explains %s", (text, code, message, start, end) => {
    const analysis = analyzeFormula(text, sources, options);
    expect(analysis.ok).toBe(false); expect(analysis.error).toEqual(expect.objectContaining({ code, message, start, end }));
  });
  it("forbids dice and knowledge where the caller says so", () => {
    expect(analyzeFormula("1d6 + 1", sources, { allowDice: false, allowKnowledge: false }).error).toMatchObject({ code: "dice-forbidden", start: 0, end: 3 });
    expect(analyzeFormula('haelt("x")', sources, { allowDice: true, allowKnowledge: false }).error).toMatchObject({ code: "knowledge-forbidden", start: 0, end: 5 });
    expect(analyzeFormula('haelt("x")', sources, { allowDice: true, allowKnowledge: true }).ok).toBe(true);
  });
  it("marks a reference to a removed attribute as missing", () => {
    expect(analyzeFormula("@weg", { actor: [], input: [] }, options).spans[0]).toMatchObject({ kind: "attribute", missing: true });
  });
});

describe("completion follows the caret", () => {
  it("offers attributes after @ filtered by label or id", () => {
    const completion = completionsAt("1 + @Ges", 8, sources, options)!;
    expect([completion.start, completion.end]).toEqual([4, 8]);
    expect(completion.items.map(i => i.insert)).toEqual(["@geschick"]);
    expect(completion.items[0]).toMatchObject({ title: "Geschick", detail: "geschick · Zahl", kind: "attribute" });
  });
  it("offers parameters after ? and explains when there are none", () => {
    expect(completionsAt("?", 1, sources, options)!.items.map(i => i.insert)).toEqual(["?bonus"]);
    const none = completionsAt("?", 1, { ...sources, input: [] }, options)!;
    expect(none.items).toEqual([{ kind: "note", insert: "", title: "Hier gibt es keine Parameter.", detail: "Parameter gibt es nur bei Aktionen, weil sie beim Würfeln abgefragt werden. Nutze Attribute mit @." }]);
  });
  it("skips hyphenated ids and says why", () => {
    const completion = completionsAt("@erste", 6, sources, options)!;
    expect(completion.items).toEqual([{ kind: "note", insert: "", title: "Erste Hilfe", detail: "Kennungen mit Bindestrich lassen sich in Formeln nicht verwenden. Benenne das Attribut um, zum Beispiel erste_hilfe." }]);
  });
  it("offers functions and dice while typing plain letters or after a d", () => {
    expect(completionsAt("mi", 2, sources, options)!.items.map(i => i.insert)).toEqual(["min("]);
    expect(completionsAt("m", 1, sources, options)!.items.map(i => i.insert)).toEqual(["min(", "max("]);
    expect(completionsAt("1d", 2, sources, options)!.items.map(i => i.insert)).toEqual(["1d20", "1d100", "1d6", "2d6", "2d20kh1", "2d20kl1", "1d6!3"]);
    expect(completionsAt("1d", 2, sources, { allowDice: false, allowKnowledge: false })).toBeNull();
    expect(completionsAt("1 + ", 4, sources, options)).toBeNull();
  });
});
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag sehen**

Run: `npx vitest run packages/client/test/formula-sugar.test.ts`
Expected: FAIL — Modul `../src/features/formula-sugar` fehlt.

- [ ] **Step 3: Modul schreiben**

`packages/client/src/features/formula-sugar.ts`:

```ts
// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { parseFormulaDetailed, tokenizeFormula, type Formula, type FormulaErrorCode, type FormulaFieldTypes, type FormulaType } from "@chronicle/rules";

export interface FormulaMember { readonly id: string; readonly label: string; readonly type: FormulaType }
export interface FormulaSources { readonly actor: readonly FormulaMember[]; readonly input: readonly FormulaMember[] }
export interface FormulaOptions { readonly allowDice: boolean; readonly allowKnowledge: boolean }
export type SpanKind = "attribute" | "parameter" | "dice" | "number" | "text" | "function" | "keyword" | "operator" | "paren" | "invalid";
export interface HighlightSpan { readonly kind: SpanKind; readonly start: number; readonly end: number; readonly title?: string; readonly missing?: boolean }
export interface FormulaError { readonly message: string; readonly start: number; readonly end: number; readonly code: FormulaErrorCode | "object-path" | "dice-forbidden" | "knowledge-forbidden" | "empty" }
export interface FormulaAnalysis { readonly text: string; readonly canonical: string; readonly ok: boolean; readonly ast?: Formula; readonly error?: FormulaError; readonly spans: readonly HighlightSpan[] }
export interface CompletionItem { readonly insert: string; readonly title: string; readonly detail: string; readonly kind: "attribute" | "parameter" | "function" | "dice" | "note" }
export interface Completion { readonly start: number; readonly end: number; readonly items: readonly CompletionItem[] }

const SIGIL: Record<"actor" | "input", string> = { actor: "@", input: "?" };
const IDENT = /[a-z][a-z0-9_-]*/y, STRING = /"(?:[^"\\\r\n]|\\["\\/bfnrt]|\\u[\da-fA-F]{4})*"/y;
const KNOWLEDGE = new Set(["haelt", "haelt_etikett", "erfahrungsgrad"]);
export const FUNCTION_HELP: readonly { name: string; title: string; knowledge: boolean; insert: string }[] = [
  { name: "min", title: "kleinster Wert", knowledge: false, insert: "min(" }, { name: "max", title: "größter Wert", knowledge: false, insert: "max(" },
  { name: "floor", title: "abrunden", knowledge: false, insert: "floor(" }, { name: "ceil", title: "aufrunden", knowledge: false, insert: "ceil(" },
  { name: "round", title: "runden", knowledge: false, insert: "round(" }, { name: "abs", title: "Betrag ohne Vorzeichen", knowledge: false, insert: "abs(" },
  { name: "if", title: "wenn … dann … sonst", knowledge: false, insert: "if(" },
  { name: "haelt", title: "Figur hält diese Passage", knowledge: true, insert: "haelt(" }, { name: "haelt_etikett", title: "gehaltene Passagen mit Etikett zählen", knowledge: true, insert: "haelt_etikett(" }, { name: "erfahrungsgrad", title: "Erfahrungsgrad zu einem Etikett", knowledge: true, insert: "erfahrungsgrad(" },
];
const DICE_SUGGESTIONS: readonly { insert: string; title: string }[] = [
  { insert: "1d20", title: "ein W20" }, { insert: "1d100", title: "ein W100" }, { insert: "1d6", title: "ein W6" }, { insert: "2d6", title: "zwei W6" },
  { insert: "2d20kh1", title: "zwei W20, den höheren behalten" }, { insert: "2d20kl1", title: "zwei W20, den niedrigeren behalten" }, { insert: "1d6!3", title: "W6, bei 6 bis zu dreimal weiterwürfeln" },
];
export const typeWord = (type: FormulaType): string => type === "number" ? "Zahl" : type === "boolean" ? "Ja/Nein" : "Text";
export const fieldTypesOf = (sources: FormulaSources): FormulaFieldTypes => ({ actor: Object.fromEntries(sources.actor.map(m => [m.id, m.type])), input: Object.fromEntries(sources.input.map(m => [m.id, m.type])) });

/** `@x` → `actor.x`, `?x` → `input.x` outside strings, with a position map from canonical to typed text. */
export function desugarFormula(text: string): { canonical: string; map: readonly number[] } {
  let canonical = ""; const map: number[] = []; let i = 0;
  const push = (piece: string, from: number) => { for (let n = 0; n < piece.length; n++) map.push(from); canonical += piece; };
  while (i < text.length) {
    const ch = text[i]!;
    if (ch === '"') { STRING.lastIndex = i; const match = STRING.exec(text); const piece = match ? match[0] : text.slice(i); for (let n = 0; n < piece.length; n++) map.push(i + n); canonical += piece; i += piece.length; continue; }
    if (ch === "@" || ch === "?") {
      IDENT.lastIndex = i + 1; const match = IDENT.exec(text);
      if (match) { const source = ch === "@" ? "actor" : "input"; push(`${source}.`, i); for (let n = 0; n < match[0].length; n++) map.push(i + 1 + n); canonical += match[0]; i += 1 + match[0].length; continue; }
    }
    map.push(i); canonical += ch; i++;
  }
  map.push(text.length);
  return { canonical, map };
}
/** `actor.x` → `@x`, `input.x` → `?x`, everything else byte for byte. */
export function resugarFormula(expression: string): string {
  const tokens = tokenizeFormula(expression); let out = ""; let cursor = 0;
  for (let n = 0; n < tokens.length; n++) {
    const token = tokens[n]!, dot = tokens[n + 1], field = tokens[n + 2];
    if (token.kind === "word" && (token.text === "actor" || token.text === "input") && dot?.kind === "dot" && dot.start === token.end && field?.kind === "word" && field.start === dot.end) {
      out += expression.slice(cursor, token.start) + SIGIL[token.text as "actor" | "input"] + field.text; cursor = field.end; n += 2;
    }
  }
  return out + expression.slice(cursor);
}
const member = (sources: FormulaSources, source: "actor" | "input", id: string): FormulaMember | undefined => sources[source].find(m => m.id === id);
function suggestion(sources: FormulaSources, source: "actor" | "input", id: string): string | undefined {
  const distance = (a: string, b: string): number => {
    const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array<number>(b.length).fill(0)]);
    for (let j = 1; j <= b.length; j++) d[0]![j] = j;
    for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i]![j] = Math.min(d[i - 1]![j]! + 1, d[i]![j - 1]! + 1, d[i - 1]![j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1));
    return d[a.length]![b.length]!;
  };
  return [...sources[source]].map(m => ({ id: m.id, d: distance(id, m.id) })).filter(m => m.d <= 2).sort((a, b) => a.d - b.d)[0]?.id;
}
function explain(code: FormulaErrorCode, detail: { message: string; expected?: string; name?: string }, sources: FormulaSources): string {
  switch (code) {
    case "invalid-token": return "Dieses Zeichen gehört nicht in eine Formel.";
    case "expected": return detail.expected === ")" ? "Hier fehlt eine schließende Klammer." : detail.expected === "end" ? "Nach diesem Wert fehlt ein Rechenzeichen wie + oder *." : detail.expected === "field" ? "Nach @ oder ? gehört eine Kennung, zum Beispiel @geschick." : "Nach dem Rechenzeichen fehlt noch ein Wert, zum Beispiel eine Zahl, ein Würfel oder ein Attribut.";
    case "unsupported-function": return `„${detail.name}“ kennt die Schmiede nicht. Erlaubt sind min, max, floor, ceil, round, abs und if.`;
    case "unknown-field": { const [source, id] = (detail.name ?? "actor.").split(".") as ["actor" | "input", string]; const hint = suggestion(sources, source, id); const what = source === "actor" ? "Das Attribut" : "Den Parameter"; return `${what} „${id}“ gibt es nicht.${hint ? ` Meintest du „${hint}“?` : ""}`; }
    case "argument-count": return detail.name === "if" ? "„if“ braucht genau drei Werte: Bedingung, dann, sonst." : detail.name === "min" || detail.name === "max" ? `„${detail.name}“ braucht mindestens zwei Werte.` : `„${detail.name}“ braucht genau einen Wert.`;
    case "limit": return "Diese Formel ist zu lang oder zu tief verschachtelt. Teile sie in einen abgeleiteten Wert auf.";
    case "dice": return "Würfel schreibt man als Anzahl, d und Seiten, zum Beispiel 1d20 oder 2d6; mindestens 2 Seiten, höchstens 100 Würfel.";
    case "number": return "Diese Zahl ist zu groß. Erlaubt sind Werte bis eine Billion.";
    case "type": { const wanted = /expected (number|boolean|string)/.exec(detail.message)?.[1] as FormulaType | undefined; return wanted ? `Hier wird ${wanted === "number" ? "eine Zahl" : wanted === "boolean" ? "Ja/Nein" : "ein Text"} gebraucht.` : "Die Werte passen hier nicht zusammen."; }
  }
}
/** Refines a type error with the offending reference, e.g. „aber „Vertraut“ ist Ja/Nein“. */
function typeDetail(message: string, spanText: string, sources: FormulaSources): string {
  const ref = /^([@?])([a-z][a-z0-9_]*)$/.exec(spanText.trim()); if (!ref) return message;
  const found = member(sources, ref[1] === "@" ? "actor" : "input", ref[2]!); if (!found) return message;
  return message.replace(/ gebraucht\.$/, ` gebraucht, aber „${found.label}“ ist ${typeWord(found.type)}.`);
}
function spansOf(canonical: string, map: readonly number[], sources: FormulaSources): HighlightSpan[] {
  const tokens = tokenizeFormula(canonical), spans: HighlightSpan[] = [];
  const back = (start: number, end: number): [number, number] => [map[start]!, map[end]!];
  for (let n = 0; n < tokens.length; n++) {
    const token = tokens[n]!, dot = tokens[n + 1], field = tokens[n + 2];
    if (token.kind === "word" && (token.text === "actor" || token.text === "input") && dot?.kind === "dot" && field?.kind === "word") {
      const found = member(sources, token.text, field.text), [start, end] = back(token.start, field.end);
      spans.push({ kind: token.text === "actor" ? "attribute" : "parameter", start, end, ...(found ? { title: found.label } : { missing: true }) }); n += 2; continue;
    }
    const [start, end] = back(token.start, token.end);
    const kind: SpanKind = token.kind === "word" ? (token.text === "true" || token.text === "false" ? "keyword" : "function") : token.kind === "string" ? "text" : token.kind === "comma" || token.kind === "dot" ? "operator" : token.kind;
    spans.push({ kind, start, end, ...(kind === "function" ? { title: FUNCTION_HELP.find(f => f.name === token.text)?.title ?? "" } : {}) });
  }
  return spans;
}
export function analyzeFormula(text: string, sources: FormulaSources, options: FormulaOptions): FormulaAnalysis {
  const { canonical, map } = desugarFormula(text), spans = spansOf(canonical, map, sources);
  const failure = (error: FormulaError): FormulaAnalysis => ({ text, canonical, ok: false, error, spans });
  if (!text.trim()) return failure({ code: "empty", message: "Trage eine Formel ein, zum Beispiel 1d20 + @geschick.", start: 0, end: 0 });
  const path = /(^|[^"\w])([?@])[a-z][a-z0-9_-]*(\.[a-z][a-z0-9_-]*)+/.exec(text);
  if (path) { const start = path.index + path[1]!.length; return failure({ code: "object-path", message: "Werte von Gegenständen kommen mit einem späteren Schritt; heute gibt es nur Attribute und Parameter.", start, end: start + path[0].length - path[1]!.length }); }
  const detail = parseFormulaDetailed(canonical, fieldTypesOf(sources));
  if (!detail.ok) {
    const start = map[detail.start] ?? text.length, end = map[detail.end] ?? text.length;
    let message = explain(detail.code, detail, sources);
    if (detail.code === "type") message = typeDetail(message, text.slice(start, end), sources);
    return failure({ code: detail.code, message, start, end });
  }
  const dice = spans.find(s => s.kind === "dice");
  const knowledge = spans.find(s => s.kind === "function" && KNOWLEDGE.has(text.slice(s.start, s.end)));
  if (!options.allowDice && dice) return failure({ code: "dice-forbidden", message: "Würfel sind hier nicht erlaubt: Dieser Wert gilt ohne Wurf. Nutze Attribute und Zahlen.", start: dice.start, end: dice.end });
  if (!options.allowKnowledge && knowledge) return failure({ code: "knowledge-forbidden", message: "Das Wissen der Figur lässt sich hier nicht abfragen, nur in der Ergebnisformel einer Aktion.", start: knowledge.start, end: knowledge.end });
  return { text, canonical, ok: true, ast: detail.ast, spans };
}
export function completionsAt(text: string, caret: number, sources: FormulaSources, options: FormulaOptions): Completion | null {
  const before = text.slice(0, caret), match = /([@?])([a-zA-Z0-9_-]*)$|(?:^|[^a-zA-Z0-9_@?"])([a-zA-Z][a-zA-Z0-9_]*)$|(\d{1,3}d[a-z0-9!]*)$/.exec(before);
  if (!match) return null;
  const fold = (value: string) => value.toLocaleLowerCase("de");
  if (match[1]) {
    const source = match[1] === "@" ? "actor" : "input", query = fold(match[2] ?? ""), start = caret - match[0].length;
    if (source === "input" && !sources.input.length) return { start, end: caret, items: [{ kind: "note", insert: "", title: "Hier gibt es keine Parameter.", detail: "Parameter gibt es nur bei Aktionen, weil sie beim Würfeln abgefragt werden. Nutze Attribute mit @." }] };
    const items: CompletionItem[] = sources[source].filter(m => !query || fold(m.id).includes(query) || fold(m.label).includes(query)).map(m => m.id.includes("-")
      ? { kind: "note" as const, insert: "", title: m.label, detail: `Kennungen mit Bindestrich lassen sich in Formeln nicht verwenden. Benenne das Attribut um, zum Beispiel ${m.id.replaceAll("-", "_")}.` }
      : { kind: source === "actor" ? "attribute" as const : "parameter" as const, insert: `${match[1]}${m.id}`, title: m.label, detail: `${m.id} · ${typeWord(m.type)}` });
    return { start, end: caret, items };
  }
  if (match[3]) {
    const query = fold(match[3]), start = caret - match[3].length;
    const items = FUNCTION_HELP.filter(f => (options.allowKnowledge || !f.knowledge) && f.name.startsWith(query)).map(f => ({ kind: "function" as const, insert: f.insert, title: f.name, detail: f.title }));
    return items.length ? { start, end: caret, items } : null;
  }
  if (!options.allowDice) return null;
  const typed = fold(match[0]), start = caret - match[0].length;
  const items = DICE_SUGGESTIONS.filter(d => typed.endsWith("d") || d.insert.startsWith(typed)).map(d => ({ kind: "dice" as const, insert: d.insert, title: d.insert, detail: d.title }));
  return items.length ? { start, end: caret, items } : null;
}
```

Hinweis zur Vervollständigung von Funktionen: Das Muster `(?:^|[^a-zA-Z0-9_@?"])([a-zA-Z][a-zA-Z0-9_]*)$` verhindert, dass `@geschick` oder ein Wort in einer Zeichenkette als Funktionsname gilt. Bei „mi" liefert der Filter `startsWith` nur `min(`; bei „m" `min(` und `max(` in der Reihenfolge von `FUNCTION_HELP`.

- [ ] **Step 4: Tests laufen lassen**

Run: `npx vitest run packages/client/test/formula-sugar.test.ts`
Expected: alle grün. Bei Abweichungen der erwarteten Positionen die Erwartung gegen den getippten Text nachzählen (ab 0), nicht die Logik lockern.

- [ ] **Step 5: Commit**

```bash
git add packages/client/src/features/formula-sugar.ts packages/client/test/formula-sugar.test.ts
git commit -m "feat(schmiede): Zucker, Klartextfehler und Vervollständigung für Formeln" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 3: Beispielfigur und Zerlegung aus der Ablaufspur

**Files:**
- Create: `packages/client/src/features/formula-example.ts`
- Test: `packages/client/test/formula-example.test.ts`

**Interfaces:**
- Consumes: `evaluateFormula`, `parseFormula`, `type Formula`, `type Scalar`, `type ProjectedKnowledge`, `type FormulaResult` aus `@chronicle/rules`; `resugarFormula`, `type FormulaSources` aus Task 2; `scalarValue`, `type DraftField` aus `rule-forge-model.ts`.
- Produces:
  ```ts
  export interface ExampleFigure { readonly name: string; readonly values: Readonly<Record<string, Scalar>>; readonly inputs: Readonly<Record<string, Readonly<Record<string, Scalar>>>>; readonly passages: ProjectedKnowledge["passages"] }
  export interface ExampleContext { readonly seed: string; readonly actor: Readonly<Record<string, Scalar>>; readonly input: Readonly<Record<string, Scalar>>; readonly knowledge: ProjectedKnowledge; readonly name: string }
  export interface ExamplePart { readonly label: string; readonly value: Scalar; readonly sign: "+" | "-" }
  export type ExampleResult = { readonly ok: true; readonly value: Scalar; readonly parts: readonly ExamplePart[]; readonly text: string } | { readonly ok: false; readonly message: string };
  export const DEFAULT_EXAMPLE_SEED = "00000001000000020000000300000004";
  export function randomSeed(): string;
  export function exampleContextFor(fields: readonly DraftField[], inputs: readonly DraftField[], figure: ExampleFigure | null, seed: string, actionId?: string): ExampleContext;
  export function formulaExample(canonical: string, context: ExampleContext, sources: FormulaSources): ExampleResult;
  ```
  `text` ist die fertige Anzeige, z. B. `Beispiel für Sera: 17 = 12 (1d20) + 5 (Geschick)`; für Ja/Nein `Beispiel für Sera: trifft zu`.

- [ ] **Step 1: Failing test schreiben**

`packages/client/test/formula-example.test.ts`:

```ts
// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { describe, expect, it } from "vitest";
import { evaluateFormula } from "@chronicle/rules";
import { DEFAULT_EXAMPLE_SEED, exampleContextFor, formulaExample, randomSeed } from "../src/features/formula-example";
import { newField } from "../src/features/rule-forge-model";

const geschick = { ...newField("geschick"), label: "Geschick", defaultValue: "3" }, bonus = { ...newField("bonus"), label: "Bonus", defaultValue: "1" };
const sources = { actor: [{ id: "geschick", label: "Geschick", type: "number" as const }], input: [{ id: "bonus", label: "Bonus", type: "number" as const }] };

describe("example context", () => {
  it("uses draft defaults when there is no figure and figure values when there is one", () => {
    const plain = exampleContextFor([geschick], [bonus], null, DEFAULT_EXAMPLE_SEED);
    expect(plain).toMatchObject({ actor: { geschick: 3 }, input: { bonus: 1 }, name: "Beispielfigur", seed: DEFAULT_EXAMPLE_SEED });
    const figure = { name: "Sera", values: { geschick: 5 }, inputs: { angriff: { bonus: 2 } }, passages: [] };
    expect(exampleContextFor([geschick], [bonus], figure, DEFAULT_EXAMPLE_SEED, "angriff")).toMatchObject({ actor: { geschick: 5 }, input: { bonus: 2 }, name: "Sera" });
    expect(exampleContextFor([geschick], [bonus], figure, DEFAULT_EXAMPLE_SEED, "other").input).toEqual({ bonus: 1 });
  });
  it("skips draft fields whose default is not yet a valid value", () => {
    expect(exampleContextFor([{ ...geschick, defaultValue: "" }], [], null, DEFAULT_EXAMPLE_SEED).actor).toEqual({});
  });
  it("draws 32 lowercase hex digits", () => { expect(randomSeed()).toMatch(/^[0-9a-f]{32}$/); expect(randomSeed()).not.toBe(randomSeed()); });
});

describe("example breakdown", () => {
  const context = exampleContextFor([geschick], [bonus], null, DEFAULT_EXAMPLE_SEED);
  it("explains a plus chain term by term with the same engine result", () => {
    const result = formulaExample("1d20 + actor.geschick - input.bonus", context, sources);
    const engine = evaluateFormula("1d20 + actor.geschick - input.bonus", context);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe(engine.value);
      expect(result.parts.map(p => [p.sign, p.label, p.value])).toEqual([["+", "1d20", engine.dice[0]!.total], ["+", "Geschick", 3], ["-", "Bonus", 1]]);
      expect(result.text).toBe(`Beispiel für Beispielfigur: ${engine.value} = ${engine.dice[0]!.total} (1d20) + 3 (Geschick) − 1 (Bonus)`);
    }
  });
  it("shows only the value for other shapes and words for booleans", () => {
    expect(formulaExample("min(actor.geschick, 2)", context, sources)).toMatchObject({ ok: true, value: 2, parts: [], text: "Beispiel für Beispielfigur: 2" });
    expect(formulaExample("actor.geschick > 2", context, sources)).toMatchObject({ ok: true, value: true, text: "Beispiel für Beispielfigur: trifft zu" });
    expect(formulaExample("actor.geschick > 9", context, sources)).toMatchObject({ ok: true, value: false, text: "Beispiel für Beispielfigur: trifft nicht zu" });
  });
  it("reports evaluation problems in plain words", () => {
    expect(formulaExample("1 / 0", context, sources)).toEqual({ ok: false, message: "Mit den Beispielwerten teilt diese Formel durch null." });
    expect(formulaExample("actor.fehlt", context, sources)).toMatchObject({ ok: false });
  });
});
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag sehen**

Run: `npx vitest run packages/client/test/formula-example.test.ts`
Expected: FAIL — Modul fehlt.

- [ ] **Step 3: Modul schreiben**

`packages/client/src/features/formula-example.ts`:

```ts
// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { evaluateFormula, parseFormula, type Formula, type ProjectedKnowledge, type Scalar } from "@chronicle/rules";
import { resugarFormula, type FormulaSources } from "./formula-sugar";
import { formulaSource, scalarValue, type DraftField } from "./rule-forge-model";

export interface ExampleFigure { readonly name: string; readonly values: Readonly<Record<string, Scalar>>; readonly inputs: Readonly<Record<string, Readonly<Record<string, Scalar>>>>; readonly passages: ProjectedKnowledge["passages"] }
export interface ExampleContext { readonly seed: string; readonly actor: Readonly<Record<string, Scalar>>; readonly input: Readonly<Record<string, Scalar>>; readonly knowledge: ProjectedKnowledge; readonly name: string }
export interface ExamplePart { readonly label: string; readonly value: Scalar; readonly sign: "+" | "-" }
export type ExampleResult = { readonly ok: true; readonly value: Scalar; readonly parts: readonly ExamplePart[]; readonly text: string } | { readonly ok: false; readonly message: string };
export const DEFAULT_EXAMPLE_SEED = "00000001000000020000000300000004";

export function randomSeed(): string {
  const bytes = new Uint8Array(16); crypto.getRandomValues(bytes);
  const seed = Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");
  return /^0+$/.test(seed) ? "00000001000000020000000300000004" : seed;
}
function draftValues(fields: readonly DraftField[], given: Readonly<Record<string, Scalar>>): Record<string, Scalar> {
  const values: Record<string, Scalar> = {};
  for (const field of fields) {
    if (!/^[a-z][a-z0-9_-]*$/.test(field.id)) continue;
    if (Object.hasOwn(given, field.id)) { values[field.id] = given[field.id]!; continue; }
    try { values[field.id] = scalarValue(field.type === "integer" ? "number" : field.type, field.defaultValue, field.label); } catch { /* an incomplete draft field simply has no example value yet */ }
  }
  return values;
}
export function exampleContextFor(fields: readonly DraftField[], inputs: readonly DraftField[], figure: ExampleFigure | null, seed: string, actionId?: string): ExampleContext {
  return { seed, name: figure?.name || "Beispielfigur", actor: draftValues(fields, figure?.values ?? {}), input: draftValues(inputs, (actionId && figure?.inputs[actionId]) || {}),
    knowledge: { actorId: "beispiel", passages: figure?.passages ?? [] } };
}
/** Top-level `+`/`-` chain as ordered terms with their trace paths; anything else is a single term. */
function terms(ast: Formula, path: string, sign: "+" | "-"): { node: Formula; path: string; sign: "+" | "-" }[] {
  if (ast.kind === "binary" && (ast.op === "+" || ast.op === "-")) return [...terms(ast.left, `${path}.left`, sign), ...terms(ast.right, `${path}.right`, ast.op === "-" ? (sign === "+" ? "-" : "+") : sign)];
  return [{ node: ast, path, sign }];
}
function label(node: Formula, sources: FormulaSources): string {
  if (node.kind === "field") return sources[node.source].find(m => m.id === node.field)?.label ?? node.field;
  return resugarFormula(formulaSource(node));
}
const show = (value: Scalar): string => typeof value === "boolean" ? (value ? "trifft zu" : "trifft nicht zu") : typeof value === "number" ? String(Math.round(value * 100) / 100) : `„${value}“`;
function plain(message: string): string {
  if (/division by zero/.test(message)) return "Mit den Beispielwerten teilt diese Formel durch null.";
  if (/unknown (actor|input)\./.test(message)) return "Die Formel verweist auf ein Attribut, das die Beispielfigur nicht hat.";
  if (/limit/.test(message)) return "Die Formel braucht mehr Rechenschritte, als erlaubt sind.";
  return "Das Beispiel lässt sich mit diesen Werten nicht berechnen.";
}
export function formulaExample(canonical: string, context: ExampleContext, sources: FormulaSources): ExampleResult {
  try {
    const ast = parseFormula(canonical), result = evaluateFormula(ast, { seed: context.seed, actor: context.actor, input: context.input, knowledge: context.knowledge });
    const chain = terms(ast, "root", "+");
    const parts: ExamplePart[] = chain.length > 1 ? chain.map(term => ({ sign: term.sign, label: label(term.node, sources), value: result.trace.find(step => step.path === term.path)?.value ?? 0 })) : [];
    const head = `Beispiel für ${context.name}: ${show(result.value)}`;
    const text = parts.length ? `${head} = ${parts.map((part, i) => `${i === 0 ? (part.sign === "-" ? "− " : "") : part.sign === "-" ? " − " : " + "}${show(part.value)} (${part.label})`).join("")}` : head;
    return { ok: true, value: result.value, parts, text };
  } catch (error) { return { ok: false, message: plain(error instanceof Error ? error.message : "") }; }
}
```

- [ ] **Step 4: Tests laufen lassen**

Run: `npx vitest run packages/client/test/formula-example.test.ts packages/client/test/formula-sugar.test.ts`
Expected: grün. Das Minuszeichen in der Anzeige ist das typografische `−` (U+2212), im Test genauso.

- [ ] **Step 5: Commit**

```bash
git add packages/client/src/features/formula-example.ts packages/client/test/formula-example.test.ts
git commit -m "feat(schmiede): Beispielwurf mit Zerlegung aus der Ablaufspur der Engine" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 4: Die Zeile — Eingabe, Überlagerung, Vervollständigung, Spickzettel

**Files:**
- Create: `packages/client/src/features/FormulaLine.tsx`
- Create: `packages/client/src/features/formula-field.css`
- Test: `packages/client/test/formula-line.test.ts`

**Interfaces:**
- Consumes: `analyzeFormula`, `completionsAt`, `type FormulaAnalysis`, `type FormulaSources`, `type FormulaOptions`, `type Completion` (Task 2); `Button` aus `@chronicle/ui`.
- Produces:
  ```tsx
  export interface FormulaLineProps {
    id: string; label: string; help?: string; text: string; analysis: FormulaAnalysis;
    sources: FormulaSources; options: FormulaOptions; status: ReactNode; disabled?: boolean;
    onText(next: string): void;
  }
  export function FormulaLine(props: FormulaLineProps): JSX.Element;
  export const CHEAT_SHEET: readonly { title: string; text: string }[];
  ```
  Das Eingabefeld hat `role="combobox"`, `aria-autocomplete="list"`, `aria-expanded`, `aria-controls` auf die Liste, `aria-activedescendant` auf den aktiven Eintrag, `aria-describedby` auf die Statuszeile, `aria-invalid` bei Fehler. Die Statuszeile hat `id={`${id}-status`}`.

- [ ] **Step 1: Failing test schreiben**

`packages/client/test/formula-line.test.ts` (statisches Rendern; Tastatur und Popover prüft der Browserablauf in Task 12):

```ts
// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { analyzeFormula, type FormulaSources } from "../src/features/formula-sugar";
import { CHEAT_SHEET, FormulaLine } from "../src/features/FormulaLine";

const sources: FormulaSources = { actor: [{ id: "geschick", label: "Geschick", type: "number" }], input: [] };
const options = { allowDice: true, allowKnowledge: false };
const render = (text: string, status = "Beispiel für Sera: 17") => renderToStaticMarkup(createElement(FormulaLine, { id: "f", label: "Ergebnis", text, analysis: analyzeFormula(text, sources, options), sources, options, status, onText() {} }));

describe("formula line", () => {
  it("renders the typed text once in a combobox and once as coloured spans with the label as tooltip", () => {
    const html = render("1d20 + @geschick");
    expect(html).toContain('role="combobox"'); expect(html).toContain('value="1d20 + @geschick"');
    expect(html).toContain('class="ff-tok ff-tok-dice">1d20<'); expect(html).toContain('class="ff-tok ff-tok-attribute" title="Geschick">@geschick<');
    expect(html).toContain('id="f-status"'); expect(html).toContain("Beispiel für Sera: 17"); expect(html).not.toContain("aria-invalid");
  });
  it("underlines the failing part and prints the plain explanation instead of the example", () => {
    const html = render("1d20 + @gescick");
    expect(html).toContain('aria-invalid="true"'); expect(html).toContain('class="ff-tok ff-tok-attribute ff-tok-error"');
    expect(html).toContain("Das Attribut „gescick“ gibt es nicht. Meintest du „geschick“?"); expect(html).not.toContain("Beispiel für Sera");
  });
  it("keeps a trailing error position visible as a marker at the end", () => {
    expect(render("1 +")).toContain('class="ff-tok ff-tok-end ff-tok-error"');
  });
  it("offers the cheat sheet with six clickable examples and no jargon", () => {
    const html = render("1");
    expect(CHEAT_SHEET).toHaveLength(6);
    for (const item of CHEAT_SHEET) expect(html).toContain(item.title);
    expect(html).not.toMatch(/Parser|Token|Syntax|kanonisch/i);
  });
});
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag sehen**

Run: `npx vitest run packages/client/test/formula-line.test.ts`
Expected: FAIL — Modul `FormulaLine` fehlt.

- [ ] **Step 3: Bauteil und CSS schreiben**

`packages/client/src/features/FormulaLine.tsx`:

```tsx
// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { BookOpen, X } from "lucide-react";
import { Button } from "@chronicle/ui";
import { completionsAt, type Completion, type FormulaAnalysis, type FormulaOptions, type FormulaSources } from "./formula-sugar";

export interface FormulaLineProps {
  id: string; label: string; help?: string; text: string; analysis: FormulaAnalysis;
  sources: FormulaSources; options: FormulaOptions; status: ReactNode; disabled?: boolean;
  onText(next: string): void;
}
export const CHEAT_SHEET: readonly { title: string; text: string }[] = [
  { title: "Wurf plus Attribut", text: "1d20 + @geschick" }, { title: "Zwei Würfel, den besseren nehmen", text: "2d20kh1 + @geschick" },
  { title: "Wenn … dann … sonst", text: "if(@geschick >= 12, 1d20 + 2, 1d20)" }, { title: "Erfolg ab 15", text: "1d20 + @geschick >= 15" },
  { title: "Abrunden", text: "floor(@geschick / 2)" }, { title: "Mindestens 1", text: "max(1, @geschick - 3)" },
];
const HINT_KEY = "atlas.formula-hint-seen";
const readFlag = (key: string): boolean => { try { return localStorage.getItem(key) === "1"; } catch { return true; } };
const writeFlag = (key: string) => { try { localStorage.setItem(key, "1"); } catch { /* browser storage may be blocked; the hint simply shows again */ } };

/** Coloured copy of the typed text laid under a real input, so caret, selection and undo stay native. */
function Overlay({ text, analysis }: { text: string; analysis: FormulaAnalysis }) {
  const error = analysis.error, pieces: ReactNode[] = []; let cursor = 0;
  const inError = (start: number, end: number) => !!error && error.start < error.end && start < error.end && end > error.start;
  for (const [i, span] of analysis.spans.entries()) {
    if (span.start > cursor) pieces.push(text.slice(cursor, span.start));
    const classes = ["ff-tok", `ff-tok-${span.kind}`, span.missing ? "ff-tok-missing" : "", inError(span.start, span.end) ? "ff-tok-error" : ""].filter(Boolean).join(" ");
    pieces.push(<span key={i} className={classes} {...(span.title ? { title: span.title } : {})}>{text.slice(span.start, span.end)}</span>);
    cursor = span.end;
  }
  if (cursor < text.length) pieces.push(text.slice(cursor));
  if (error && error.start === error.end && error.start >= text.length) pieces.push(<span key="end" className="ff-tok ff-tok-end ff-tok-error" aria-hidden="true"> </span>);
  return <div className="ff-line-overlay" aria-hidden="true">{pieces}{text.length ? null : <span className="ff-line-placeholder">1d20 + @attribut</span>}</div>;
}

export function FormulaLine({ id, label, help, text, analysis, sources, options, status, disabled = false, onText }: FormulaLineProps) {
  const input = useRef<HTMLInputElement>(null);
  const [completion, setCompletion] = useState<Completion | null>(null), [active, setActive] = useState(0), [sheet, setSheet] = useState(false);
  const [hintSeen, setHintSeen] = useState(true);
  useEffect(() => { setHintSeen(readFlag(HINT_KEY)); }, []);
  const refresh = (value: string, caret: number) => { const next = completionsAt(value, caret, sources, options); setCompletion(next); setActive(0); };
  const accept = (index: number) => {
    const item = completion?.items[index]; if (!completion || !item || !item.insert) { setCompletion(null); return; }
    const next = text.slice(0, completion.start) + item.insert + text.slice(completion.end), caret = completion.start + item.insert.length;
    onText(next); setCompletion(null);
    requestAnimationFrame(() => { input.current?.setSelectionRange(caret, caret); input.current?.focus(); });
  };
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!completion) return;
    if (event.key === "ArrowDown") { event.preventDefault(); setActive(value => (value + 1) % completion.items.length); }
    else if (event.key === "ArrowUp") { event.preventDefault(); setActive(value => (value + completion.items.length - 1) % completion.items.length); }
    else if (event.key === "Enter" || event.key === "Tab") { if (completion.items[active]?.insert) { event.preventDefault(); accept(active); } }
    else if (event.key === "Escape") { event.preventDefault(); setCompletion(null); }
  };
  const listId = `${id}-list`, statusId = `${id}-status`, error = analysis.error;
  return <div className={`ff-line${error ? " ff-line-invalid" : ""}`}>
    <label htmlFor={id}>{label}</label>
    {!hintSeen ? <p className="ff-hint">Tippe @ für Attribute, ? für Parameter, Zahlen und Würfel wie 1d20 direkt. <Button variant="quiet" aria-label="Hinweis schließen" onClick={() => { writeFlag(HINT_KEY); setHintSeen(true); }}><X size={13} /></Button></p> : null}
    <div className="ff-line-stack">
      <Overlay text={text} analysis={analysis} />
      <input ref={input} id={id} className="ff-line-input" value={text} disabled={disabled} autoComplete="off" spellCheck={false} maxLength={4096}
        role="combobox" aria-autocomplete="list" aria-expanded={!!completion} aria-controls={listId} aria-activedescendant={completion ? `${listId}-${active}` : undefined}
        aria-describedby={statusId} aria-invalid={error ? true : undefined}
        onChange={event => { onText(event.target.value); refresh(event.target.value, event.target.selectionStart ?? event.target.value.length); }}
        onKeyDown={onKeyDown} onBlur={() => setTimeout(() => setCompletion(null), 120)}
        onSelect={event => { const target = event.currentTarget; if (completion) refresh(target.value, target.selectionStart ?? target.value.length); }} />
      {completion ? <ul id={listId} className="ff-completion" role="listbox" aria-label="Vorschläge">{completion.items.map((item, i) => <li key={`${item.kind}-${item.insert || item.title}`} id={`${listId}-${i}`} role="option" aria-selected={i === active} className={`ff-completion-${item.kind}${i === active ? " is-active" : ""}`} onMouseDown={event => { event.preventDefault(); accept(i); }}><strong>{item.title}</strong><small>{item.detail}</small></li>)}</ul> : null}
    </div>
    <p id={statusId} className="ff-line-status" aria-live="polite">{error ? <span className="ff-error">{error.message}</span> : status}</p>
    {help ? <small className="ff-help">{help}</small> : null}
    <div className="ff-line-tools"><Button variant="quiet" aria-expanded={sheet} onClick={() => setSheet(value => !value)}><BookOpen size={14} />Spickzettel</Button></div>
    {sheet ? <ul className="ff-cheat-sheet" aria-label="Beispiele zum Einsetzen">{CHEAT_SHEET.map(item => <li key={item.text}><button type="button" disabled={disabled} onClick={() => { onText(item.text); setSheet(false); }}><strong>{item.title}</strong><code>{item.text}</code></button></li>)}</ul> : null}
  </div>;
}
```

`packages/client/src/features/formula-field.css`:

```css
/* Formel-Bauteil: Zeile, Bausteine, Knoten. Farben nur aus den App-Variablen. */
.ff-field { margin: 18px 0; }
.ff-field-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 6px; }
.ff-views { display: inline-flex; border: 1px solid var(--line); border-radius: 20px; overflow: hidden; }
.ff-views button { border: 0; background: transparent; color: var(--text-muted); padding: 5px 12px; font-size: 12px; cursor: pointer; }
.ff-views button[aria-pressed="true"] { background: var(--accent-soft); color: var(--text); }
.ff-line label { display: block; font-size: 12px; margin-bottom: 6px; }
.ff-line-stack { position: relative; font: 14px/1.6 var(--font-mono); }
.ff-line-input, .ff-line-overlay { box-sizing: border-box; width: 100%; padding: 10px 14px; font: inherit; letter-spacing: 0; white-space: pre; overflow: hidden; }
.ff-line-overlay { position: absolute; inset: 0; pointer-events: none; color: var(--text); border: 1px solid transparent; }
.ff-line-input { position: relative; background: var(--bg); color: transparent; caret-color: var(--text); border: 1px solid var(--line-strong); border-radius: 5px; }
.ff-line-input::selection { background: var(--accent-soft); }
.ff-line-input:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }
.ff-line-invalid .ff-line-input { border-color: var(--danger); }
.ff-line-placeholder { color: var(--text-faint); }
.ff-tok-attribute, .ff-tok-parameter { background: var(--accent-soft); border-radius: 4px; padding: 1px 0; }
.ff-tok-parameter { text-decoration: underline dotted; }
.ff-tok-dice { color: var(--accent-strong); font-weight: 600; }
.ff-tok-number { color: var(--text); }
.ff-tok-text { color: var(--ok); }
.ff-tok-function, .ff-tok-keyword { color: var(--accent); }
.ff-tok-operator, .ff-tok-paren { color: var(--text-muted); }
.ff-tok-missing { text-decoration: line-through; color: var(--danger); }
.ff-tok-error { text-decoration: underline wavy var(--danger); text-underline-offset: 3px; }
.ff-tok-end { display: inline-block; min-width: 6px; border-bottom: 2px wavy var(--danger); }
.ff-completion { position: absolute; z-index: 5; left: 0; right: 0; top: 100%; margin: 4px 0 0; padding: 4px; list-style: none; background: var(--surface); border: 1px solid var(--line-strong); border-radius: 6px; max-height: 260px; overflow: auto; font: 13px/1.4 var(--font-body); box-shadow: 0 10px 30px rgba(0, 0, 0, .35); }
.ff-completion li { display: grid; gap: 2px; padding: 6px 10px; border-radius: 4px; cursor: pointer; }
.ff-completion li.is-active { background: var(--accent-soft); }
.ff-completion li small { color: var(--text-muted); }
.ff-completion-note { cursor: default; opacity: .8; }
.ff-line-status { margin: 8px 0 0; font-size: 12px; color: var(--text-muted); min-height: 1.4em; }
.ff-error { color: var(--danger); }
.ff-help { display: block; color: var(--text-muted); margin-top: 4px; }
.ff-hint { display: flex; align-items: center; gap: 8px; font-size: 12px; background: var(--accent-soft); border-left: 2px solid var(--accent); padding: 8px 12px; margin: 0 0 8px; }
.ff-line-tools { margin-top: 6px; }
.ff-cheat-sheet { list-style: none; margin: 6px 0 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 6px; }
.ff-cheat-sheet button { width: 100%; text-align: left; display: grid; gap: 4px; padding: 8px 10px; background: var(--surface); border: 1px solid var(--line); border-radius: 5px; color: var(--text); cursor: pointer; }
.ff-cheat-sheet code { font: 12px var(--font-mono); color: var(--text-muted); }
.ff-readonly { font-size: 12px; color: var(--text-muted); margin: 0 0 8px; }
.ff-reroll { margin-left: 8px; }
```

- [ ] **Step 4: Tests laufen lassen**

Run: `npx vitest run packages/client/test/formula-line.test.ts`
Expected: grün. Falls die Attribut-Zeichenfolge im HTML anders sortiert ist (`title` vor `class`), die Erwartung an die tatsächliche React-Ausgabe anpassen; React gibt Attribute in Prop-Reihenfolge aus, hier `className` vor `title`.

- [ ] **Step 5: Commit**

```bash
git add packages/client/src/features/FormulaLine.tsx packages/client/src/features/formula-field.css packages/client/test/formula-line.test.ts
git commit -m "feat(schmiede): Formelzeile mit farbiger Überlagerung, Vorschlägen und Spickzettel" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 5: Bausteine, aufgeräumt

**Files:**
- Create: `packages/client/src/features/FormulaBlocks.tsx`
- Modify: `packages/client/src/features/formula-field.css` (Anhang)
- Test: `packages/client/test/formula-blocks.test.ts`

**Interfaces:**
- Consumes: `FormulaDraft`, `compileFormula`, `formulaDraft`, `formulaSource`, `literalDraft` aus `rule-forge-model.ts`; `FUNCTION_HELP`, `typeWord`, `type FormulaSources`, `type FormulaOptions` (Task 2); `RULE_LIMITS`, `inferFormulaType`, `parseFormula` aus `@chronicle/rules`.
- Produces:
  ```tsx
  export interface FormulaBlocksProps { value: FormulaDraft; onChange(next: FormulaDraft): void; sources: FormulaSources; options: FormulaOptions; disabled?: boolean; resultLabel?: string }
  export function FormulaBlocks(props: FormulaBlocksProps): JSX.Element;
  export function blockKinds(sources: FormulaSources, options: FormulaOptions): readonly { id: BlockKind; label: string; disabled: boolean }[];
  export type BlockKind = "number" | "text" | "boolean" | "attribute" | "parameter" | "dice" | "calc" | "compare" | "negate" | "if" | "function";
  export function blockFor(kind: BlockKind, sources: FormulaSources): FormulaDraft;
  ```
  Jeder Baustein rendert als `<span class="ff-block ff-block-<kind>" role="group" aria-label="<Beschriftung>">`; Rechenzeichen als `<select aria-label="Rechenzeichen">`; das Menü als `<details class="ff-block-menu">` mit Knöpfen „Art wechseln", „Links anhängen", „Rechts anhängen", „Entfernen".

- [ ] **Step 1: Failing test schreiben**

`packages/client/test/formula-blocks.test.ts`:

```ts
// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { parseFormula } from "@chronicle/rules";
import { blockFor, blockKinds, FormulaBlocks } from "../src/features/FormulaBlocks";
import { compileFormula, formulaDraft, formulaSource } from "../src/features/rule-forge-model";
import type { FormulaSources } from "../src/features/formula-sugar";

const sources: FormulaSources = { actor: [{ id: "geschick", label: "Geschick", type: "number" }], input: [{ id: "bonus", label: "Bonus", type: "number" }] };
const options = { allowDice: true, allowKnowledge: false };
const render = (expression: string) => renderToStaticMarkup(createElement(FormulaBlocks, { value: formulaDraft(parseFormula(expression)), onChange() {}, sources, options }));

describe("horizontal blocks", () => {
  it("lays a formula out left to right with labelled groups instead of nested cards", () => {
    const html = render("1d20 + actor.geschick");
    expect(html).toContain('class="ff-block ff-block-dice"'); expect(html).toContain('aria-label="Rechenzeichen"');
    expect(html).toContain('class="ff-block ff-block-attribute"'); expect(html).toContain(">Geschick<");
    expect(html).not.toContain("Linker Wert"); expect(html).not.toContain("Baustein");
  });
  it("shows parentheses only where the tree needs them and if as three slots", () => {
    expect(render("(1 + 2) * 3")).toContain('class="ff-block-paren">(<');
    expect(render("1 + 2 * 3")).not.toContain("ff-block-paren");
    const html = render("if(actor.geschick > 2, 1, 0)");
    for (const slot of ["wenn", "dann", "sonst"]) expect(html).toContain(`class="ff-slot-label">${slot}<`);
  });
  it("offers block kinds that fit the sources and options", () => {
    const kinds = blockKinds({ actor: [], input: [] }, { allowDice: false, allowKnowledge: false });
    expect(kinds.find(k => k.id === "attribute")?.disabled).toBe(true); expect(kinds.find(k => k.id === "dice")?.disabled).toBe(true);
    expect(blockKinds(sources, options).every(k => !k.disabled)).toBe(true);
    expect(compileFormula(blockFor("attribute", sources))).toEqual({ kind: "field", source: "actor", field: "geschick" });
    expect(formulaSource(compileFormula(blockFor("compare", sources)))).toBe("0 >= 0");
  });
});
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag sehen**

Run: `npx vitest run packages/client/test/formula-blocks.test.ts`
Expected: FAIL — Modul fehlt.

- [ ] **Step 3: Bauteil schreiben**

`packages/client/src/features/FormulaBlocks.tsx`:

```tsx
// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { useId } from "react";
import { RULE_LIMITS } from "@chronicle/rules";
import { FUNCTION_HELP, typeWord, type FormulaOptions, type FormulaSources } from "./formula-sugar";
import { literalDraft, type FormulaDraft } from "./rule-forge-model";

export type BlockKind = "number" | "text" | "boolean" | "attribute" | "parameter" | "dice" | "calc" | "compare" | "negate" | "if" | "function";
export interface FormulaBlocksProps { value: FormulaDraft; onChange(next: FormulaDraft): void; sources: FormulaSources; options: FormulaOptions; disabled?: boolean; resultLabel?: string }
type Binary = Extract<FormulaDraft, { kind: "binary" }>;
const CALC: Binary["op"][] = ["+", "-", "*", "/", "%"], COMPARE: Binary["op"][] = ["==", "!=", ">", ">=", "<", "<=", "&&", "||"];
const OP_LABEL: Record<Binary["op"], string> = { "+": "+", "-": "−", "*": "×", "/": "÷", "%": "Rest", "==": "=", "!=": "≠", ">": ">", ">=": "≥", "<": "<", "<=": "≤", "&&": "und", "||": "oder" };
const PRECEDENCE: Record<Binary["op"], number> = { "||": 1, "&&": 2, "==": 3, "!=": 3, ">": 4, ">=": 4, "<": 4, "<=": 4, "+": 5, "-": 5, "*": 6, "/": 6, "%": 6 };
const KIND_LABEL: Record<BlockKind, string> = { number: "Zahl", text: "Text", boolean: "Ja/Nein", attribute: "Attribut", parameter: "Parameter", dice: "Würfel", calc: "Rechnung", compare: "Vergleich", negate: "Umkehren", if: "Wenn … dann … sonst", function: "Funktion" };

export function blockKinds(sources: FormulaSources, options: FormulaOptions): readonly { id: BlockKind; label: string; disabled: boolean }[] {
  return (Object.keys(KIND_LABEL) as BlockKind[]).map(id => ({ id, label: KIND_LABEL[id], disabled: id === "attribute" ? !sources.actor.length : id === "parameter" ? !sources.input.length : id === "dice" ? !options.allowDice : false }));
}
export function blockFor(kind: BlockKind, sources: FormulaSources): FormulaDraft {
  switch (kind) {
    case "number": return literalDraft("number"); case "text": return literalDraft("string"); case "boolean": return literalDraft("boolean");
    case "attribute": return { kind: "field", source: "actor", field: sources.actor[0]?.id ?? "" };
    case "parameter": return { kind: "field", source: "input", field: sources.input[0]?.id ?? "" };
    case "dice": return { kind: "dice", count: "1", sides: "20", keep: "none", keepCount: "1", explode: "" };
    case "calc": return { kind: "binary", op: "+", left: literalDraft(), right: literalDraft() };
    case "compare": return { kind: "binary", op: ">=", left: literalDraft(), right: literalDraft() };
    case "negate": return { kind: "unary", op: "-", value: literalDraft() };
    case "if": return { kind: "if", condition: literalDraft("boolean"), then: literalDraft(), else: literalDraft() };
    case "function": return { kind: "call", name: "min", args: [literalDraft(), literalDraft()] };
  }
}
const kindOf = (value: FormulaDraft): BlockKind => value.kind === "literal" ? (value.type === "number" ? "number" : value.type === "string" ? "text" : "boolean") : value.kind === "field" ? (value.source === "actor" ? "attribute" : "parameter") : value.kind === "binary" ? (COMPARE.includes(value.op) ? "compare" : "calc") : value.kind === "unary" ? "negate" : value.kind === "call" ? "function" : value.kind;

interface BlockProps { value: FormulaDraft; onChange(next: FormulaDraft): void; onRemove?(): void; sources: FormulaSources; options: FormulaOptions; disabled: boolean; label: string; depth: number; parentPrecedence: number }
function Block({ value, onChange, onRemove, sources, options, disabled, label, depth, parentPrecedence }: BlockProps) {
  const id = useId(), kind = kindOf(value), canNest = depth < RULE_LIMITS.formulaDepth - 1;
  const child = (node: FormulaDraft, change: (next: FormulaDraft) => void, name: string, precedence = 0, remove?: () => void) => <Block value={node} onChange={change} onRemove={remove} sources={sources} options={options} disabled={disabled} label={name} depth={depth + 1} parentPrecedence={precedence} />;
  const wrap = (side: "left" | "right") => onChange(side === "right" ? { kind: "binary", op: "+", left: value, right: literalDraft() } : { kind: "binary", op: "+", left: literalDraft(), right: value });
  const precedence = value.kind === "binary" ? PRECEDENCE[value.op] : value.kind === "unary" ? 7 : 8, parens = precedence < parentPrecedence;
  const menu = <details className="ff-block-menu"><summary aria-label={`Menü für ${label}`}>⋯</summary>
    <label>Art wechseln<select value={kind} disabled={disabled} onChange={event => onChange(blockFor(event.target.value as BlockKind, sources))}>{blockKinds(sources, options).map(k => <option key={k.id} value={k.id} disabled={k.disabled || (!canNest && ["calc", "compare", "negate", "if", "function"].includes(k.id))}>{k.label}</option>)}</select></label>
    <div className="ff-block-menu-actions"><button type="button" disabled={disabled || !canNest} onClick={() => wrap("left")}>Links anhängen</button><button type="button" disabled={disabled || !canNest} onClick={() => wrap("right")}>Rechts anhängen</button>{onRemove ? <button type="button" disabled={disabled} onClick={onRemove}>Entfernen</button> : null}</div>
  </details>;
  let body: JSX.Element;
  switch (value.kind) {
    case "literal": body = value.type === "boolean"
      ? <select aria-label={label} value={value.value} disabled={disabled} onChange={event => onChange({ ...value, value: event.target.value })}><option value="true">wahr</option><option value="false">falsch</option></select>
      : <input aria-label={label} type={value.type === "number" ? "number" : "text"} step="any" size={Math.max(3, value.value.length)} value={value.value} disabled={disabled} onChange={event => onChange({ ...value, value: event.target.value })} />; break;
    case "field": { const members = sources[value.source], found = members.find(m => m.id === value.field);
      body = <select aria-label={label} value={value.field} disabled={disabled} onChange={event => onChange({ ...value, field: event.target.value })}>{!found ? <option value={value.field}>{value.field ? `${value.field} (gibt es nicht mehr)` : "wählen …"}</option> : null}{members.map(m => <option key={m.id} value={m.id}>{m.label} · {typeWord(m.type)}</option>)}</select>; break; }
    case "dice": body = <span className="ff-dice"><input aria-label="Anzahl Würfel" type="number" min={1} max={RULE_LIMITS.dice} value={value.count} disabled={disabled} onChange={event => onChange({ ...value, count: event.target.value })} /><span>d</span><input aria-label="Seiten je Würfel" type="number" min={2} max={RULE_LIMITS.sides} value={value.sides} disabled={disabled} onChange={event => onChange({ ...value, sides: event.target.value })} />
      <select aria-label="Welche Würfel zählen" value={value.keep} disabled={disabled} onChange={event => onChange({ ...value, keep: event.target.value as typeof value.keep })}><option value="none">alle zählen</option><option value="highest">höchste behalten</option><option value="lowest">niedrigste behalten</option></select>
      {value.keep !== "none" ? <input aria-label="Wie viele behalten" type="number" min={1} max={RULE_LIMITS.dice} value={value.keepCount} disabled={disabled} onChange={event => onChange({ ...value, keepCount: event.target.value })} /> : null}
      <label className="ff-dice-explode"><input type="checkbox" checked={value.explode !== ""} disabled={disabled} onChange={event => onChange({ ...value, explode: event.target.checked ? "3" : "" })} />bei Höchstwurf weiterwürfeln</label>
      {value.explode !== "" ? <input aria-label="Höchstens so oft weiterwürfeln" type="number" min={1} max={RULE_LIMITS.explosions} value={value.explode} disabled={disabled} onChange={event => onChange({ ...value, explode: event.target.value })} /> : null}</span>; break;
    case "unary": body = <><select aria-label="Umkehrung" value={value.op} disabled={disabled} onChange={event => onChange({ ...value, op: event.target.value as "-" | "!" })}><option value="-">− (Vorzeichen umkehren)</option><option value="!">nicht</option></select>{child(value.value, next => onChange({ ...value, value: next }), "Wert", 7)}</>; break;
    case "binary": { const ops = COMPARE.includes(value.op) ? COMPARE : CALC;
      body = <>{child(value.left, left => onChange({ ...value, left }), "linke Seite", precedence, () => onChange(value.right))}<select aria-label="Rechenzeichen" value={value.op} disabled={disabled} onChange={event => onChange({ ...value, op: event.target.value as Binary["op"] })}>{ops.map(op => <option key={op} value={op}>{OP_LABEL[op]}</option>)}</select>{child(value.right, right => onChange({ ...value, right }), "rechte Seite", precedence + 1, () => onChange(value.left))}</>; break; }
    case "if": body = <><span className="ff-slot-label">wenn</span>{child(value.condition, condition => onChange({ ...value, condition }), "Bedingung")}<span className="ff-slot-label">dann</span>{child(value.then, then => onChange({ ...value, then }), "Wert wenn wahr")}<span className="ff-slot-label">sonst</span>{child(value.else, otherwise => onChange({ ...value, else: otherwise }), "Wert wenn falsch")}</>; break;
    case "call": { const help = FUNCTION_HELP.find(f => f.name === value.name), variadic = value.name === "min" || value.name === "max";
      body = <><select aria-label="Funktion" value={value.name} disabled={disabled} onChange={event => { const name = event.target.value as typeof value.name, knowledge = !!FUNCTION_HELP.find(f => f.name === name)?.knowledge; onChange({ ...value, name, args: name === "min" || name === "max" ? [literalDraft(), literalDraft()] : [literalDraft(knowledge ? "string" : "number")] }); }}>{FUNCTION_HELP.filter(f => f.name !== "if" && (options.allowKnowledge || !f.knowledge)).map(f => <option key={f.name} value={f.name}>{f.name} · {f.title}</option>)}</select>
        <span className="ff-block-paren">(</span>{value.args.map((arg, i) => <span className="ff-arg" key={i}>{i ? <span className="ff-block-paren">,</span> : null}{child(arg, next => onChange({ ...value, args: value.args.map((v, n) => n === i ? next : v) }), help?.knowledge ? "Etikett oder Kennung" : `Wert ${i + 1}`, 0, variadic && value.args.length > 2 ? () => onChange({ ...value, args: value.args.filter((_, n) => n !== i) }) : undefined)}</span>)}
        {variadic && value.args.length < 8 ? <button type="button" className="ff-add-arg" disabled={disabled} onClick={() => onChange({ ...value, args: [...value.args, literalDraft()] })} aria-label="Weiteren Wert anhängen">+</button> : null}<span className="ff-block-paren">)</span></>; break; }
  }
  return <span className={`ff-block ff-block-${kind}`} role="group" aria-label={label} id={id}>{parens ? <span className="ff-block-paren">(</span> : null}{body}{parens ? <span className="ff-block-paren">)</span> : null}{menu}</span>;
}
export function FormulaBlocks({ value, onChange, sources, options, disabled = false, resultLabel = "Formel" }: FormulaBlocksProps) {
  return <div className="ff-blocks"><Block value={value} onChange={onChange} sources={sources} options={options} disabled={disabled} label={resultLabel} depth={0} parentPrecedence={0} /></div>;
}
```

An `formula-field.css` anhängen:

```css
.ff-blocks { overflow-x: auto; padding: 12px; background: var(--bg); border: 1px solid var(--line); border-radius: 5px; font: 13px/1.6 var(--font-body); }
.ff-block { display: inline-flex; align-items: center; gap: 6px; padding: 4px 6px; margin: 2px; border: 1px solid var(--line); border-radius: 6px; background: var(--surface); vertical-align: middle; white-space: nowrap; }
.ff-block-attribute, .ff-block-parameter { background: var(--accent-soft); border-color: transparent; }
.ff-block-dice { border-color: var(--accent-strong); }
.ff-block-calc, .ff-block-compare, .ff-block-if, .ff-block-function { background: transparent; border-style: dashed; }
.ff-block input, .ff-block select { font: inherit; padding: 3px 6px; border: 1px solid var(--line-strong); border-radius: 4px; background: var(--bg); color: var(--text); min-width: 3.5em; }
.ff-block input[type="number"] { width: 5em; }
.ff-block-paren { color: var(--text-muted); font-weight: 600; }
.ff-slot-label { font-size: 11px; text-transform: uppercase; letter-spacing: .04em; color: var(--accent); }
.ff-dice { display: inline-flex; align-items: center; gap: 4px; }
.ff-dice-explode { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; color: var(--text-muted); }
.ff-arg { display: inline-flex; align-items: center; gap: 4px; }
.ff-add-arg { border: 1px dashed var(--line-strong); background: transparent; color: var(--text); border-radius: 4px; cursor: pointer; }
.ff-block-menu { position: relative; }
.ff-block-menu summary { list-style: none; cursor: pointer; color: var(--text-muted); padding: 0 4px; }
.ff-block-menu summary::-webkit-details-marker { display: none; }
.ff-block-menu[open] > :not(summary) { position: absolute; z-index: 4; top: 100%; left: 0; display: grid; gap: 6px; min-width: 200px; padding: 10px; background: var(--surface); border: 1px solid var(--line-strong); border-radius: 6px; white-space: normal; }
.ff-block-menu-actions { display: flex; flex-wrap: wrap; gap: 6px; }
.ff-block-menu-actions button { font: inherit; padding: 4px 8px; border: 1px solid var(--line); background: var(--bg); color: var(--text); border-radius: 4px; cursor: pointer; }
```

- [ ] **Step 4: Tests laufen lassen**

Run: `npx vitest run packages/client/test/formula-blocks.test.ts packages/client/test/rule-forge-model.test.ts`
Expected: grün.

- [ ] **Step 5: Commit**

```bash
git add packages/client/src/features/FormulaBlocks.tsx packages/client/src/features/formula-field.css packages/client/test/formula-blocks.test.ts
git commit -m "feat(schmiede): waagerechte Bausteine mit Menü statt verschachtelter Karten" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 6: Knotennetz — Modell, Layout, Bearbeitung, Zeichnung

**Files:**
- Create: `packages/client/src/features/formula-graph-model.ts`
- Create: `packages/client/src/features/FormulaGraph.tsx`
- Modify: `packages/client/src/features/formula-field.css` (Anhang)
- Test: `packages/client/test/formula-graph-model.test.ts`

**Interfaces:**
- Consumes: `type Formula`, `type FormulaType`, `inferFormulaType`, `parseFormula` aus `@chronicle/rules`; `type FormulaSources`, `fieldTypesOf`, `FUNCTION_HELP`, `typeWord` (Task 2); `formulaSource`, `copyJson` aus `rule-forge-model.ts`.
- Produces (Modell):
  ```ts
  export type NodePath = readonly number[]; // Kindindex je Ebene: unary 0; binary 0=links 1=rechts; if 0/1/2; call i
  export type GraphKind = "attribute" | "parameter" | "dice" | "number" | "text" | "boolean" | "calc" | "compare" | "logic" | "negate" | "if" | "function";
  export interface GraphNode { readonly id: string; readonly path: NodePath; readonly kind: GraphKind; readonly label: string; readonly detail: string; readonly type: FormulaType | "unknown"; readonly x: number; readonly y: number; readonly inputs: readonly string[] }
  export interface GraphEdge { readonly from: string; readonly to: string; readonly slot: number }
  export interface FormulaGraphLayout { readonly nodes: readonly GraphNode[]; readonly edges: readonly GraphEdge[]; readonly width: number; readonly height: number; readonly resultType: FormulaType | "unknown" }
  export const NODE_WIDTH = 168, NODE_HEIGHT = 48, GAP_X = 56, GAP_Y = 14;
  export function formulaGraph(ast: Formula, sources: FormulaSources): FormulaGraphLayout;
  export function nodeAt(ast: Formula, path: NodePath): Formula;
  export function replaceAt(ast: Formula, path: NodePath, next: Formula): Formula;
  export function removeAt(ast: Formula, path: NodePath): Formula;      // Kind einer Rechnung: Elternknoten wird zum Geschwister; sonst Platzhalter 0/false
  export function wrapAt(ast: Formula, path: NodePath, op: "+" | "-" | "*" | "/"): Formula; // Knoten wird linke Seite einer neuen Rechnung mit 0
  export function moveSubtree(ast: Formula, from: NodePath, to: NodePath): Formula; // Teilbaum `from` ersetzt `to`; an `from` bleibt ein Platzhalter
  ```
- Produces (Zeichnung):
  ```tsx
  export interface FormulaGraphProps { ast: Formula; onChange(next: Formula): void; sources: FormulaSources; options: FormulaOptions; disabled?: boolean; readOnly?: boolean }
  export function FormulaGraph(props: FormulaGraphProps): JSX.Element;
  ```

- [ ] **Step 1: Failing test schreiben**

`packages/client/test/formula-graph-model.test.ts`:

```ts
// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { describe, expect, it } from "vitest";
import { parseFormula } from "@chronicle/rules";
import { formulaGraph, moveSubtree, nodeAt, removeAt, replaceAt, wrapAt, NODE_WIDTH } from "../src/features/formula-graph-model";
import { formulaSource } from "../src/features/rule-forge-model";
import type { FormulaSources } from "../src/features/formula-sugar";

const sources: FormulaSources = { actor: [{ id: "geschick", label: "Geschick", type: "number" }], input: [{ id: "bonus", label: "Bonus", type: "number" }] };
const ast = parseFormula("1d20 + actor.geschick >= input.bonus");

describe("graph layout", () => {
  it("places leaves left, the result right, and types every node", () => {
    const graph = formulaGraph(ast, sources);
    expect(graph.nodes.map(n => [n.kind, n.label])).toEqual([["compare", "≥"], ["calc", "+"], ["dice", "1d20"], ["attribute", "Geschick"], ["parameter", "Bonus"]]);
    const x = Object.fromEntries(graph.nodes.map(n => [n.label, n.x]));
    expect(x["1d20"]).toBe(0); expect(x["+"]).toBe(NODE_WIDTH + 56); expect(x["≥"]).toBe(2 * (NODE_WIDTH + 56));
    expect(graph.nodes.find(n => n.label === "≥")?.type).toBe("boolean"); expect(graph.resultType).toBe("boolean");
    expect(graph.edges).toEqual([{ from: "n.0", to: "n", slot: 0 }, { from: "n.0.0", to: "n.0", slot: 0 }, { from: "n.0.1", to: "n.0", slot: 1 }, { from: "n.1", to: "n", slot: 1 }]);
    expect(graph.nodes.find(n => n.label === "Bonus")!.y).toBeGreaterThan(graph.nodes.find(n => n.label === "Geschick")!.y);
  });
  it("marks unknown references without throwing", () => {
    expect(formulaGraph(parseFormula("actor.weg + 1"), sources).nodes[1]).toMatchObject({ kind: "attribute", type: "unknown", detail: "gibt es nicht mehr" });
  });
});

describe("graph edits", () => {
  it("replaces, removes, wraps and moves subtrees by path", () => {
    expect(formulaSource(replaceAt(ast, [0, 1], { kind: "literal", value: 4 }))).toBe("1d20 + 4 >= input.bonus");
    expect(formulaSource(removeAt(ast, [0, 0]))).toBe("actor.geschick >= input.bonus");
    expect(formulaSource(removeAt(ast, [1]))).toBe("1d20 + actor.geschick >= 0");
    expect(formulaSource(wrapAt(ast, [1], "*"))).toBe("1d20 + actor.geschick >= input.bonus * 0");
    expect(formulaSource(moveSubtree(ast, [0, 0], [1]))).toBe("0 + actor.geschick >= 1d20");
    expect(nodeAt(ast, [0, 1])).toEqual({ kind: "field", source: "actor", field: "geschick" });
    expect(() => moveSubtree(ast, [0], [0, 1])).toThrow(/eigenen/);
  });
  it("removes a leaf of a function or if by turning it into a placeholder", () => {
    expect(formulaSource(removeAt(parseFormula("min(1, 2)"), [0]))).toBe("min(0, 2)");
    expect(formulaSource(removeAt(parseFormula("if(true, 1, 2)"), [0]))).toBe("if(false, 1, 2)");
  });
});
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag sehen**

Run: `npx vitest run packages/client/test/formula-graph-model.test.ts`
Expected: FAIL — Modul fehlt.

- [ ] **Step 3: Modell schreiben**

`packages/client/src/features/formula-graph-model.ts`:

```ts
// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { inferFormulaType, type Formula, type FormulaType } from "@chronicle/rules";
import { fieldTypesOf, FUNCTION_HELP, type FormulaSources } from "./formula-sugar";
import { copyJson } from "./rule-forge-model";

export type NodePath = readonly number[];
export type GraphKind = "attribute" | "parameter" | "dice" | "number" | "text" | "boolean" | "calc" | "compare" | "logic" | "negate" | "if" | "function";
export interface GraphNode { readonly id: string; readonly path: NodePath; readonly kind: GraphKind; readonly label: string; readonly detail: string; readonly type: FormulaType | "unknown"; readonly x: number; readonly y: number; readonly inputs: readonly string[] }
export interface GraphEdge { readonly from: string; readonly to: string; readonly slot: number }
export interface FormulaGraphLayout { readonly nodes: readonly GraphNode[]; readonly edges: readonly GraphEdge[]; readonly width: number; readonly height: number; readonly resultType: FormulaType | "unknown" }
export const NODE_WIDTH = 168, NODE_HEIGHT = 48, GAP_X = 56, GAP_Y = 14;
const OP: Record<string, string> = { "+": "+", "-": "−", "*": "×", "/": "÷", "%": "Rest", "==": "=", "!=": "≠", ">": ">", ">=": "≥", "<": "<", "<=": "≤", "&&": "und", "||": "oder" };

export const children = (node: Formula): readonly Formula[] => node.kind === "unary" ? [node.value] : node.kind === "binary" ? [node.left, node.right] : node.kind === "if" ? [node.condition, node.then, node.else] : node.kind === "call" ? node.args : [];
export function nodeAt(ast: Formula, path: NodePath): Formula { let node = ast; for (const index of path) { const next = children(node)[index]; if (!next) throw new Error("Diesen Teil der Formel gibt es nicht."); node = next; } return node; }
function withChild(node: Formula, index: number, child: Formula): Formula {
  switch (node.kind) {
    case "unary": return { ...node, value: child };
    case "binary": return index === 0 ? { ...node, left: child } : { ...node, right: child };
    case "if": return index === 0 ? { ...node, condition: child } : index === 1 ? { ...node, then: child } : { ...node, else: child };
    case "call": return { ...node, args: node.args.map((arg, i) => i === index ? child : arg) };
    default: throw new Error("Dieser Teil der Formel hat keine Unterteile.");
  }
}
export function replaceAt(ast: Formula, path: NodePath, next: Formula): Formula {
  if (!path.length) return copyJson(next);
  const [index, ...rest] = path as [number, ...number[]]; const node = copyJson(ast);
  return withChild(node, index, replaceAt(children(node)[index]!, rest, next));
}
const placeholderFor = (parent: Formula, index: number): Formula => parent.kind === "if" && index === 0 || parent.kind === "unary" && parent.op === "!" || parent.kind === "binary" && (parent.op === "&&" || parent.op === "||") ? { kind: "literal", value: false } : parent.kind === "call" && ["haelt", "haelt_etikett", "erfahrungsgrad"].includes(parent.name) ? { kind: "literal", value: "" } : { kind: "literal", value: 0 };
export function removeAt(ast: Formula, path: NodePath): Formula {
  if (!path.length) return { kind: "literal", value: 0 };
  const parentPath = path.slice(0, -1), index = path[path.length - 1]!, parent = nodeAt(ast, parentPath);
  if (parent.kind === "binary") return replaceAt(ast, parentPath, index === 0 ? parent.right : parent.left);
  if (parent.kind === "call" && (parent.name === "min" || parent.name === "max") && parent.args.length > 2) return replaceAt(ast, parentPath, { ...parent, args: parent.args.filter((_, i) => i !== index) });
  return replaceAt(ast, path, placeholderFor(parent, index));
}
export function wrapAt(ast: Formula, path: NodePath, op: "+" | "-" | "*" | "/"): Formula {
  return replaceAt(ast, path, { kind: "binary", op, left: nodeAt(ast, path), right: { kind: "literal", value: 0 } });
}
const prefix = (a: NodePath, b: NodePath) => a.length <= b.length && a.every((v, i) => v === b[i]);
export function moveSubtree(ast: Formula, from: NodePath, to: NodePath): Formula {
  if (prefix(from, to)) throw new Error("Ein Teil kann nicht in seinen eigenen Unterteil verschoben werden.");
  const moved = copyJson(nodeAt(ast, from)), parent = from.length ? nodeAt(ast, from.slice(0, -1)) : null;
  const cleared = parent ? replaceAt(ast, from, placeholderFor(parent, from[from.length - 1]!)) : ast;
  return replaceAt(cleared, to, moved);
}
function describe(node: Formula, sources: FormulaSources): { kind: GraphKind; label: string; detail: string } {
  switch (node.kind) {
    case "literal": return typeof node.value === "number" ? { kind: "number", label: String(node.value), detail: "Zahl" } : typeof node.value === "boolean" ? { kind: "boolean", label: node.value ? "wahr" : "falsch", detail: "Ja/Nein" } : { kind: "text", label: `„${node.value}“`, detail: "Text" };
    case "field": { const found = sources[node.source].find(m => m.id === node.field); return { kind: node.source === "actor" ? "attribute" : "parameter", label: found?.label ?? node.field, detail: found ? `${node.source === "actor" ? "Attribut" : "Parameter"} · ${node.field}` : "gibt es nicht mehr" }; }
    case "dice": return { kind: "dice", label: `${node.count}d${node.sides}${node.keep ? (node.keep.mode === "highest" ? "kh" : "kl") + node.keep.count : ""}${node.explode ? "!" + node.explode : ""}`, detail: "Würfel" };
    case "unary": return { kind: "negate", label: node.op === "-" ? "−" : "nicht", detail: "Umkehren" };
    case "binary": return { kind: ["&&", "||"].includes(node.op) ? "logic" : ["+", "-", "*", "/", "%"].includes(node.op) ? "calc" : "compare", label: OP[node.op]!, detail: ["+", "-", "*", "/", "%"].includes(node.op) ? "Rechnung" : "Vergleich" };
    case "if": return { kind: "if", label: "wenn", detail: "wenn · dann · sonst" };
    case "call": return { kind: "function", label: node.name, detail: FUNCTION_HELP.find(f => f.name === node.name)?.title ?? "Funktion" };
  }
}
export function formulaGraph(ast: Formula, sources: FormulaSources): FormulaGraphLayout {
  const fields = fieldTypesOf(sources), nodes: GraphNode[] = [], edges: GraphEdge[] = [];
  const typeOf = (node: Formula): FormulaType | "unknown" => { try { return inferFormulaType(node, fields); } catch { return "unknown"; } };
  let depthMax = 0; let row = 0;
  // Leaves get consecutive rows in reading order; every parent sits at the mean of its children.
  const place = (node: Formula, path: NodePath, depth: number): { id: string; y: number } => {
    const id = ["n", ...path].join("."), kids = children(node); depthMax = Math.max(depthMax, depth);
    const placed = kids.map((child, i) => place(child, [...path, i], depth + 1));
    const y = placed.length ? placed.reduce((sum, p) => sum + p.y, 0) / placed.length : row++ * (NODE_HEIGHT + GAP_Y);
    for (const [i, child] of placed.entries()) edges.push({ from: child.id, to: id, slot: i });
    const { kind, label, detail } = describe(node, sources);
    nodes.push({ id, path, kind, label, detail, type: typeOf(node), x: depth, y, inputs: placed.map(p => p.id) });
    return { id, y };
  };
  place(ast, [], 0);
  // Order: parents before children in reading order (pre-order) so the tree reads left→right per row.
  const ordered = [...nodes].sort((a, b) => a.path.length - b.path.length || a.path.join(".").localeCompare(b.path.join("."), undefined, { numeric: true }));
  const laid = ordered.map(n => ({ ...n, x: (depthMax - n.x) * (NODE_WIDTH + GAP_X) }));
  const orderedEdges = edges.sort((a, b) => a.to.length - b.to.length || a.to.localeCompare(b.to, undefined, { numeric: true }) || a.slot - b.slot);
  return { nodes: laid, edges: orderedEdges, width: (depthMax + 1) * NODE_WIDTH + depthMax * GAP_X, height: Math.max(1, row) * (NODE_HEIGHT + GAP_Y) - GAP_Y, resultType: typeOf(ast) };
}
```

Hinweis zur Knotenreihenfolge im Test: Erwartet ist die Vorordnung `≥, +, 1d20, Geschick, Bonus`; das ist `n, n.0, n.0.0, n.0.1, n.1` in numerischer Sortierung. Die Kanten sind nach Ziel und Anschluss sortiert.

- [ ] **Step 4: Modelltests laufen lassen**

Run: `npx vitest run packages/client/test/formula-graph-model.test.ts`
Expected: grün.

- [ ] **Step 5: Zeichnung schreiben**

`packages/client/src/features/FormulaGraph.tsx`:

```tsx
// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { useState } from "react";
import type { Formula } from "@chronicle/rules";
import { FUNCTION_HELP, typeWord, type FormulaOptions, type FormulaSources } from "./formula-sugar";
import { formulaGraph, moveSubtree, nodeAt, removeAt, replaceAt, wrapAt, GAP_X, NODE_HEIGHT, NODE_WIDTH, type GraphNode, type NodePath } from "./formula-graph-model";
import { blockFor, blockKinds, type BlockKind } from "./FormulaBlocks";
import { compileFormula } from "./rule-forge-model";

export interface FormulaGraphProps { ast: Formula; onChange(next: Formula): void; sources: FormulaSources; options: FormulaOptions; disabled?: boolean; readOnly?: boolean }
const OPS: Record<string, readonly string[]> = { calc: ["+", "-", "*", "/", "%"], compare: ["==", "!=", ">", ">=", "<", "<="], logic: ["&&", "||"] };
const OP_LABEL: Record<string, string> = { "+": "+", "-": "−", "*": "×", "/": "÷", "%": "Rest", "==": "=", "!=": "≠", ">": ">", ">=": "≥", "<": "<", "<=": "≤", "&&": "und", "||": "oder" };

export function FormulaGraph({ ast, onChange, sources, options, disabled = false, readOnly = false }: FormulaGraphProps) {
  const graph = formulaGraph(ast, sources), locked = disabled || readOnly;
  const [selected, setSelected] = useState<string | null>(null), [dragging, setDragging] = useState<NodePath | null>(null);
  const byId = new Map(graph.nodes.map(n => [n.id, n]));
  const edit = (next: Formula) => { onChange(next); setSelected(null); };
  const change = (node: GraphNode, mutate: (current: Formula) => Formula) => edit(replaceAt(ast, node.path, mutate(nodeAt(ast, node.path))));
  const drop = (target: GraphNode) => { if (!dragging || locked) return; try { edit(moveSubtree(ast, dragging, target.path)); } catch { /* moving a part into itself is refused; nothing changes */ } setDragging(null); };
  const path = (edge: { from: string; to: string; slot: number }) => {
    const from = byId.get(edge.from)!, to = byId.get(edge.to)!, x1 = from.x + NODE_WIDTH, y1 = from.y + NODE_HEIGHT / 2, x2 = to.x, y2 = to.y + 14 + edge.slot * 12;
    return `M ${x1} ${y1} C ${x1 + GAP_X / 2} ${y1}, ${x2 - GAP_X / 2} ${y2}, ${x2} ${y2}`;
  };
  return <div className="ff-graph" role="group" aria-label="Formel als Knotennetz">
    <p className="ff-graph-legend"><span className="ff-type ff-type-number">Zahl</span><span className="ff-type ff-type-boolean">Ja/Nein</span><span className="ff-type ff-type-string">Text</span><span>Ergebnis: {graph.resultType === "unknown" ? "noch unklar" : typeWord(graph.resultType)}</span>{readOnly ? <span className="ff-readonly">Die Zeile enthält einen Fehler; hier siehst du den Stand davor.</span> : null}</p>
    <div className="ff-graph-canvas" style={{ width: graph.width, height: graph.height }}>
      <svg className="ff-graph-edges" width={graph.width} height={graph.height} aria-hidden="true">{graph.edges.map(edge => <path key={`${edge.from}-${edge.to}`} d={path(edge)} className={`ff-edge ff-type-${byId.get(edge.from)!.type}`} />)}</svg>
      {graph.nodes.map(node => <div key={node.id} className={`ff-node ff-node-${node.kind} ff-type-${node.type}${selected === node.id ? " is-selected" : ""}`} style={{ left: node.x, top: node.y, width: NODE_WIDTH, height: NODE_HEIGHT }} role="button" tabIndex={locked ? -1 : 0} aria-label={`${node.label}, ${node.detail}`} aria-pressed={selected === node.id}
        onClick={() => !locked && setSelected(current => current === node.id ? null : node.id)} onKeyDown={event => { if (!locked && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); setSelected(current => current === node.id ? null : node.id); } }}
        onPointerUp={() => drop(node)}>
        <strong>{node.label}</strong><small>{node.detail}</small>
        {node.inputs.map((_, slot) => <span key={slot} className="ff-port ff-port-in" style={{ top: 14 + slot * 12 - 4 }} aria-hidden="true" />)}
        {node.path.length ? <span className="ff-port ff-port-out" aria-hidden="true" onPointerDown={event => { if (locked) return; event.stopPropagation(); setDragging(node.path); }} /> : null}
      </div>)}
    </div>
    {selected && byId.get(selected) && !locked ? <NodeEditor node={byId.get(selected)!} current={nodeAt(ast, byId.get(selected)!.path)} sources={sources} options={options} onReplace={next => change(byId.get(selected)!, () => next)} onRemove={() => edit(removeAt(ast, byId.get(selected)!.path))} onWrap={op => edit(wrapAt(ast, byId.get(selected)!.path, op))} /> : null}
    {dragging ? <p className="ff-graph-drag">Lass den Teil auf dem Knoten los, der ihn bekommen soll. Escape bricht ab.</p> : null}
  </div>;
}

function NodeEditor({ node, current, sources, options, onReplace, onRemove, onWrap }: { node: GraphNode; current: Formula; sources: FormulaSources; options: FormulaOptions; onReplace(next: Formula): void; onRemove(): void; onWrap(op: "+" | "-" | "*" | "/"): void }) {
  const ops = OPS[node.kind];
  return <div className="ff-node-editor" role="group" aria-label={`Bearbeiten: ${node.label}`}>
    {current.kind === "binary" && ops ? <label>Rechenzeichen<select value={current.op} onChange={event => onReplace({ ...current, op: event.target.value as typeof current.op })}>{ops.map(op => <option key={op} value={op}>{OP_LABEL[op]}</option>)}</select></label> : null}
    {current.kind === "field" ? <label>{current.source === "actor" ? "Attribut" : "Parameter"}<select value={current.field} onChange={event => onReplace({ ...current, field: event.target.value })}>{sources[current.source].map(m => <option key={m.id} value={m.id}>{m.label} · {typeWord(m.type)}</option>)}</select></label> : null}
    {current.kind === "literal" && typeof current.value === "number" ? <label>Zahl<input type="number" step="any" value={current.value} onChange={event => { const value = event.target.valueAsNumber; if (Number.isFinite(value)) onReplace({ kind: "literal", value }); }} /></label> : null}
    {current.kind === "literal" && typeof current.value === "boolean" ? <label>Wert<select value={String(current.value)} onChange={event => onReplace({ kind: "literal", value: event.target.value === "true" })}><option value="true">wahr</option><option value="false">falsch</option></select></label> : null}
    {current.kind === "literal" && typeof current.value === "string" ? <label>Text<input value={current.value} maxLength={4096} onChange={event => onReplace({ kind: "literal", value: event.target.value })} /></label> : null}
    {current.kind === "dice" ? <label>Würfel<input value={`${current.count}d${current.sides}`} readOnly /><small>Anzahl und Seiten änderst du in der Zeile oder in den Bausteinen.</small></label> : null}
    {current.kind === "call" ? <label>Funktion<select value={current.name} onChange={event => { const name = event.target.value as typeof current.name; onReplace({ kind: "call", name, args: name === "min" || name === "max" ? [current.args[0] ?? { kind: "literal", value: 0 }, current.args[1] ?? { kind: "literal", value: 0 }] : [current.args[0] ?? { kind: "literal", value: 0 }] }); }}>{FUNCTION_HELP.filter(f => f.name !== "if" && (options.allowKnowledge || !f.knowledge)).map(f => <option key={f.name} value={f.name}>{f.name} · {f.title}</option>)}</select></label> : null}
    <label>Durch etwas anderes ersetzen<select value="" onChange={event => { if (event.target.value) onReplace(compileFormula(blockFor(event.target.value as BlockKind, sources))); }}><option value="">wählen …</option>{blockKinds(sources, options).map(k => <option key={k.id} value={k.id} disabled={k.disabled}>{k.label}</option>)}</select></label>
    <div className="ff-node-editor-actions">{(["+", "-", "*", "/"] as const).map(op => <button key={op} type="button" onClick={() => onWrap(op)}>{`Rechenschritt ${OP_LABEL[op]} anhängen`}</button>)}<button type="button" onClick={onRemove}>Entfernen</button></div>
  </div>;
}
```

An `formula-field.css` anhängen:

```css
.ff-graph { overflow-x: auto; padding: 12px; background: var(--bg); border: 1px solid var(--line); border-radius: 5px; }
.ff-graph-legend { display: flex; flex-wrap: wrap; gap: 12px; margin: 0 0 10px; font-size: 12px; color: var(--text-muted); }
.ff-type { padding: 1px 8px; border-radius: 10px; border: 1px solid currentColor; }
.ff-type-number { color: var(--accent); } .ff-type-boolean { color: var(--ok); } .ff-type-string { color: var(--text-muted); } .ff-type-unknown { color: var(--danger); }
.ff-graph-canvas { position: relative; min-height: 60px; }
.ff-graph-edges { position: absolute; inset: 0; overflow: visible; }
.ff-edge { fill: none; stroke: currentColor; stroke-width: 2; opacity: .7; }
.ff-node { position: absolute; box-sizing: border-box; display: grid; align-content: center; gap: 2px; padding: 6px 14px; background: var(--surface); border: 1px solid currentColor; border-radius: 8px; cursor: pointer; }
.ff-node strong { color: var(--text); font-size: 14px; } .ff-node small { color: var(--text-muted); font-size: 11px; }
.ff-node.is-selected { outline: 2px solid var(--accent); outline-offset: 2px; }
.ff-node:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.ff-node-attribute, .ff-node-parameter { background: var(--accent-soft); }
.ff-port { position: absolute; width: 9px; height: 9px; border-radius: 50%; background: currentColor; }
.ff-port-in { left: -5px; } .ff-port-out { right: -5px; top: calc(50% - 4px); cursor: grab; }
.ff-node-editor { display: grid; gap: 8px; margin-top: 12px; padding: 12px; background: var(--surface); border: 1px solid var(--line-strong); border-radius: 6px; font-size: 13px; }
.ff-node-editor label { display: grid; gap: 4px; }
.ff-node-editor-actions { display: flex; flex-wrap: wrap; gap: 6px; }
.ff-node-editor-actions button { font: inherit; padding: 5px 9px; border: 1px solid var(--line); background: var(--bg); color: var(--text); border-radius: 4px; cursor: pointer; }
.ff-graph-drag { font-size: 12px; color: var(--accent); margin: 8px 0 0; }
```

- [ ] **Step 6: Typen und Tests prüfen**

Run: `npx vitest run packages/client/test/formula-graph-model.test.ts packages/client/test/formula-blocks.test.ts && npm run build`
Expected: Tests grün; der Client-Typecheck im Build meldet keine Fehler in den neuen Dateien. (Die neuen Bauteile sind noch nirgends eingebunden; `npm run build` prüft sie trotzdem, weil `include: ["src"]` gilt.)

- [ ] **Step 7: Commit**

```bash
git add packages/client/src/features/formula-graph-model.ts packages/client/src/features/FormulaGraph.tsx packages/client/src/features/formula-field.css packages/client/test/formula-graph-model.test.ts
git commit -m "feat(schmiede): Knotennetz mit Layout, Anschlüssen und Bearbeitung am Knoten" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 7: Das Bauteil `FormulaField` und der Ausdruck im Entwurf

**Files:**
- Create: `packages/client/src/features/FormulaField.tsx`
- Modify: `packages/client/src/features/rule-forge-model.ts` (Zeilen 23–34 Typen, 116–121 `draftExpression`, 148–152 `migrationStep`)
- Modify: `packages/client/src/features/formula-field.css` (Anhang)
- Test: `packages/client/test/formula-field.test.ts`, `packages/client/test/rule-forge-model.test.ts` (Ergänzung)

**Interfaces:**
- Consumes: Tasks 2–6; `FormulaExampleContext` wird hier definiert.
- Produces:
  ```tsx
  export type FormulaView = "line" | "blocks" | "graph";
  export const FormulaExampleContext: React.Context<ExampleFigure | null>;
  export interface FormulaFieldProps {
    id?: string; label: string; help?: string; value: string; onChange(next: string): void;
    sources: FormulaSources; allowDice: boolean; allowKnowledge: boolean;
    fields: readonly DraftField[]; inputs?: readonly DraftField[]; actionId?: string; disabled?: boolean;
  }
  export function FormulaField(props: FormulaFieldProps): JSX.Element;
  export function readFormulaView(): FormulaView; export function writeFormulaView(view: FormulaView): void;
  ```
  Modell: `DraftAction` und der numerische Migrationsschritt bekommen `expression?: string`. `draftExpression(draft)` liefert `draft.expression`, wenn gesetzt; sonst wie bisher. `packageDraft` setzt `expression: a.expression` (Byte-Treue).

- [ ] **Step 1: Failing tests schreiben**

An `packages/client/test/rule-forge-model.test.ts` anhängen:

```ts
describe("expression text on drafts", () => {
  it("returns the typed expression verbatim when set and falls back to the visual tree otherwise", async () => {
    const { draftExpression, packageDraft } = await import("../src/features/rule-forge-model");
    const draft = packageDraft(DEMO_RULE_PACKAGE), action = draft.actions[0]!;
    expect(draftExpression(action)).toBe(DEMO_RULE_PACKAGE.actions[0]!.expression);
    expect(draftExpression({ ...action, expression: "1d20 + actor.insight" })).toBe("1d20 + actor.insight");
    expect(draftExpression({ ...action, expression: "1d20 +" })).toBe("1d20 +");
    expect(validateDraft({ ...draft, actions: [{ ...action, expression: "1d20 +" }] }).valid).toBe(false);
  });
});
```

`packages/client/test/formula-field.test.ts`:

```ts
// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FormulaField, FormulaExampleContext } from "../src/features/FormulaField";
import { newField } from "../src/features/rule-forge-model";

const fields = [{ ...newField("geschick"), label: "Geschick", defaultValue: "3" }];
const sources = { actor: [{ id: "geschick", label: "Geschick", type: "number" as const }], input: [] };
const render = (value: string, extra: Partial<Parameters<typeof FormulaField>[0]> = {}) => renderToStaticMarkup(createElement(FormulaExampleContext.Provider, { value: { name: "Sera", values: { geschick: 5 }, inputs: {}, passages: [] } },
  createElement(FormulaField, { label: "Ergebnis", value, onChange() {}, sources, allowDice: true, allowKnowledge: false, fields, ...extra })));

describe("formula field", () => {
  it("shows the stored expression with sugar, the view switch and an example from the figure", () => {
    const html = render("1d20 + actor.geschick");
    expect(html).toContain('value="1d20 + @geschick"');
    for (const view of ["Zeile", "Bausteine", "Knoten"]) expect(html).toContain(`>${view}<`);
    expect(html).toMatch(/Beispiel für Sera: \d+ = \d+ \(1d20\) \+ 5 \(Geschick\)/);
    expect(html).toContain("Neu würfeln");
  });
  it("explains a missing figure and a dice-free value plainly", () => {
    const html = renderToStaticMarkup(createElement(FormulaField, { label: "Höchststand", value: "actor.geschick * 2", onChange() {}, sources, allowDice: false, allowKnowledge: false, fields }));
    expect(html).toContain("Beispiel für Beispielfigur: 6"); expect(html).not.toContain("Neu würfeln");
  });
  it("never shows the old builder vocabulary", () => {
    expect(render("1")).not.toMatch(/Baustein|Linker Wert|Rechter Wert|Ausdruck/);
  });
});
```

- [ ] **Step 2: Tests laufen lassen, Fehlschlag sehen**

Run: `npx vitest run packages/client/test/formula-field.test.ts packages/client/test/rule-forge-model.test.ts`
Expected: FAIL — `FormulaField` fehlt; `draftExpression` ignoriert `expression`.

- [ ] **Step 3: Modell erweitern**

In `packages/client/src/features/rule-forge-model.ts`:

```ts
// Zeile 23–28: DraftAction
export interface DraftAction {
  localId: string; id: string; name: string; version: string; disclosure: string;
  inputs: DraftField[]; thresholdEnabled: boolean; threshold: string; formula: FormulaDraft;
  originalExpression?: string; originalFormula?: FormulaDraft;
  /** The typed expression, canonical (`actor.x`); wins over `formula` when present, even while invalid. */
  expression?: string;
  outcome?: RuleOutcome; preconditions?: readonly RuleAssertion[];
}
// Zeile 33: numerischer Migrationsschritt
  | { localId: string; kind: "numeric"; field: string; formula: FormulaDraft; originalExpression?: string; originalFormula?: FormulaDraft; expression?: string };
// draftExpression
export function draftExpression(draft: { formula: FormulaDraft; originalFormula?: FormulaDraft; originalExpression?: string; expression?: string }): string {
  if (draft.expression !== undefined) return draft.expression;
  const ast = compileFormula(draft.formula);
  if (draft.originalFormula && draft.originalExpression !== undefined && stableJson(draft.originalFormula) === stableJson(draft.formula)) return draft.originalExpression;
  return formulaSource(ast);
}
```

In `packageDraft` (Aktionen) hinter `originalExpression: a.expression` ergänzen: `expression: a.expression`. In `migrationStepDraft` für `numeric` ergänzen: `expression: step.expression`. In `newAction` ergänzen: `expression: "1d20"`.

- [ ] **Step 4: Bauteil schreiben**

`packages/client/src/features/FormulaField.tsx`:

```tsx
// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { createContext, useContext, useEffect, useId, useMemo, useRef, useState } from "react";
import { Dices } from "lucide-react";
import { Button } from "@chronicle/ui";
import type { Formula } from "@chronicle/rules";
import { analyzeFormula, resugarFormula, type FormulaSources } from "./formula-sugar";
import { DEFAULT_EXAMPLE_SEED, exampleContextFor, formulaExample, randomSeed, type ExampleFigure } from "./formula-example";
import { FormulaLine } from "./FormulaLine";
import { FormulaBlocks } from "./FormulaBlocks";
import { FormulaGraph } from "./FormulaGraph";
import { compileFormula, formulaDraft, formulaSource, type DraftField, type FormulaDraft } from "./rule-forge-model";
import "./formula-field.css";

export type FormulaView = "line" | "blocks" | "graph";
export const FormulaExampleContext = createContext<ExampleFigure | null>(null);
export interface FormulaFieldProps {
  id?: string; label: string; help?: string; value: string; onChange(next: string): void;
  sources: FormulaSources; allowDice: boolean; allowKnowledge: boolean;
  fields: readonly DraftField[]; inputs?: readonly DraftField[]; actionId?: string; disabled?: boolean;
}
const VIEW_KEY = "atlas.formula-view", VIEWS: readonly [FormulaView, string][] = [["line", "Zeile"], ["blocks", "Bausteine"], ["graph", "Knoten"]];
export function readFormulaView(): FormulaView { try { const value = localStorage.getItem(VIEW_KEY); return value === "blocks" || value === "graph" ? value : "line"; } catch { return "line"; } }
export function writeFormulaView(view: FormulaView): void { try { localStorage.setItem(VIEW_KEY, view); } catch { /* storage may be blocked; the choice just does not persist */ } }

export function FormulaField({ id, label, help, value, onChange, sources, allowDice, allowKnowledge, fields, inputs = [], actionId, disabled = false }: FormulaFieldProps) {
  const generated = useId(), fieldId = id ?? generated, options = useMemo(() => ({ allowDice, allowKnowledge }), [allowDice, allowKnowledge]);
  const [text, setText] = useState(() => resugarFormula(value)), emitted = useRef(value);
  const [view, setView] = useState<FormulaView>("line"), [seed, setSeed] = useState(DEFAULT_EXAMPLE_SEED);
  useEffect(() => { setView(readFormulaView()); }, []);
  // A value arriving from outside (opening a package, undoing) replaces the typed text; our own emissions do not.
  useEffect(() => { if (value !== emitted.current) { emitted.current = value; setText(resugarFormula(value)); } }, [value]);
  const analysis = useMemo(() => analyzeFormula(text, sources, options), [text, sources, options]);
  const lastValid = useRef<Formula | null>(null); if (analysis.ok && analysis.ast) lastValid.current = analysis.ast;
  const figure = useContext(FormulaExampleContext);
  const example = useMemo(() => analysis.ok ? formulaExample(analysis.canonical, exampleContextFor(fields, inputs, figure, seed, actionId), sources) : null, [analysis, fields, inputs, figure, seed, actionId, sources]);
  const emit = (canonical: string) => { emitted.current = canonical; onChange(canonical); };
  const onText = (next: string) => { setText(next); emit(analyzeFormula(next, sources, options).canonical); };
  const fromTree = (ast: Formula) => { const canonical = formulaSource(ast); setText(resugarFormula(canonical)); emit(canonical); };
  const fromDraft = (draft: FormulaDraft) => { try { fromTree(compileFormula(draft)); } catch { /* an incomplete block: keep the draft visible, publish an invalid expression so the package cannot install */ setBlocks(draft); emit(""); } };
  const [blocks, setBlocks] = useState<FormulaDraft | null>(null);
  useEffect(() => { if (analysis.ok) setBlocks(null); }, [analysis.ok, text]);
  const hasDice = analysis.ast ? /\dd\d/.test(analysis.canonical) : false;
  const status = example ? example.ok ? <>{example.text}{hasDice ? <Button variant="quiet" className="ff-reroll" aria-label="Neu würfeln" onClick={() => setSeed(randomSeed())}><Dices size={13} />Neu würfeln</Button> : null}</> : example.message : "";
  const tree = analysis.ok && analysis.ast ? analysis.ast : lastValid.current;
  const readOnly = !analysis.ok;
  return <div className="ff-field">
    <div className="ff-field-head"><span className="ff-field-title">{label}</span><div className="ff-views" role="group" aria-label="Ansicht der Formel">{VIEWS.map(([key, name]) => <button key={key} type="button" aria-pressed={view === key} onClick={() => { setView(key); writeFormulaView(key); }}>{name}</button>)}</div></div>
    {view === "line" ? <FormulaLine id={fieldId} label="Formel" help={help} text={text} analysis={analysis} sources={sources} options={options} status={status} disabled={disabled} onText={onText} /> : null}
    {view !== "line" ? <>
      <FormulaLine id={fieldId} label="Formel" help={help} text={text} analysis={analysis} sources={sources} options={options} status={status} disabled={disabled} onText={onText} />
      {readOnly && !blocks ? <p className="ff-readonly">Die Zeile enthält einen Fehler; hier siehst du den Stand davor.</p> : null}
      {view === "blocks" ? (blocks ?? tree ? <FormulaBlocks value={blocks ?? formulaDraft(tree!)} onChange={fromDraft} sources={sources} options={options} disabled={disabled || (readOnly && !blocks)} resultLabel={label} /> : null) : null}
      {view === "graph" ? (tree ? <FormulaGraph ast={tree} onChange={fromTree} sources={sources} options={options} disabled={disabled} readOnly={readOnly} /> : null) : null}
    </> : null}
  </div>;
}
```

Erklärung zweier Entscheidungen, die im Plan gelten:
- Die Zeile bleibt in den Ansichten Bausteine und Knoten sichtbar (schmal darüber), damit Fehlertext und Beispiel immer an derselben Stelle stehen und der Baum nie ohne Text existiert.
- Ein unvollständiger Baustein (leere Zahl) hält den Bausteinentwurf lokal (`blocks`) und veröffentlicht `""`; damit ist der Paketentwurf ungültig, genau wie bei der alten `ExpressionInput` (H6).

An `formula-field.css` anhängen:

```css
.ff-field-title { font-size: 12px; color: var(--text-muted); }
.ff-field .ff-line + .ff-blocks, .ff-field .ff-line + .ff-graph, .ff-field .ff-readonly + .ff-blocks, .ff-field .ff-readonly + .ff-graph { margin-top: 10px; }
@media (max-width: 760px) { .ff-views button { padding: 5px 9px; } .ff-cheat-sheet { grid-template-columns: minmax(0, 1fr); } }
```

- [ ] **Step 5: Tests laufen lassen**

Run: `npx vitest run packages/client/test/formula-field.test.ts packages/client/test/rule-forge-model.test.ts packages/client/test/htbah-forge.test.ts`
Expected: grün (`htbah-forge` bestätigt weiter die Byte-Treue über `packageDraft` → `compilePackage`).

- [ ] **Step 6: Commit**

```bash
git add packages/client/src/features/FormulaField.tsx packages/client/src/features/rule-forge-model.ts packages/client/src/features/formula-field.css packages/client/test/formula-field.test.ts packages/client/test/rule-forge-model.test.ts
git commit -m "feat(schmiede): Formel-Bauteil mit Zeile, Bausteinen und Knoten aus einem Baum" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 8: Abgeleitet, Ergebnisbereiche, Migration auf das Bauteil umstellen; alten Baukasten entfernen

**Files:**
- Modify: `packages/client/src/features/RuleDeclarativeEditor.tsx` (`ExpressionInput` Zeilen 9–33, `AssertionEditor`, `VitalEditor`, `RuleDeclarativeEditor`, `RuleActionExtensions`)
- Modify: `packages/client/src/features/RuleForge.tsx` (`MigrationStepEditor` Zeilen 294–300, Import von `FormulaBuilder`)
- Delete: `packages/client/src/features/FormulaBuilder.tsx`
- Modify: `packages/client/src/features/rule-forge.css` (Zeilen 47–54 `.rf-formula*` entfernen)
- Modify: `packages/client/test/htbah-client-review.test.ts` (Zeilen 63–83)

**Interfaces:**
- Consumes: `FormulaField` (Task 7), `sourcesFromDraft` (neu, unten), `draftExpression` mit `expression?` (Task 7).
- Produces: `export function sourcesFromDraft(fields: readonly DraftField[], inputs: readonly DraftField[] = []): FormulaSources` in `formula-sugar.ts`: Kennung, Bezeichnung (Fallback Kennung) und Typ (`integer` → `number`) je Feld; ungültige Kennungen werden ausgelassen.

- [ ] **Step 1: Failing test schreiben**

`packages/client/test/htbah-client-review.test.ts`, den Test „keeps an incomplete numeric visual expression editable without throwing or losing it" (Zeilen 63–83) so ersetzen:

```ts
  it("keeps an incomplete visual expression editable without throwing or losing it", () => {
    const updates: string[] = [], draft = model.packageDraft(rules.HOW_TO_BE_A_HERO_PACKAGE);
    draft.computed = [{ id: "review_value", label: "Review value", expression: "0" }];
    const h = harness("FormulaField.tsx", "FormulaField", { label: "Berechnung", value: "0", sources: { actor: [], input: [] }, allowDice: false, allowKnowledge: false, fields: [], onChange: (value: string) => {
      updates.push(value); draft.computed = [{ ...draft.computed![0]!, expression: value }];
    } }, "FormulaField", { "./FormulaLine": { FormulaLine: "FormulaLine" }, "./FormulaGraph": { FormulaGraph: "FormulaGraph" } });
    h.nodes(node => node.type === "button" && h.text(node) === "Bausteine")[0]!.props.onClick();
    const blocks = () => h.nodes(node => node.type === "FormulaBlocks")[0]!;
    expect(() => blocks().props.onChange({ kind: "literal", type: "number", value: "" })).not.toThrow();
    expect(updates.at(-1)).toBe("");
    expect(model.validateDraft(draft).valid).toBe(false);
    // The parent rerender must keep the incomplete visual input while its published source is invalid; installation cannot reuse the old zero.
    h.replace({ value: updates.at(-1) });
    expect(blocks().props.value).toMatchObject({ kind: "literal", value: "" });
    expect(h.nodes(node => node.type === "FormulaLine")[0]!.props.analysis.ok).toBe(false);
    blocks().props.onChange({ kind: "literal", type: "number", value: "25" });
    expect(updates.at(-1)).toBe("25");
    expect(model.validateDraft(draft).valid).toBe(true);
    h.replace({ value: updates.at(-1) });
    expect(h.nodes(node => node.type === "FormulaLine")[0]!.props.analysis.ok).toBe(true);
    h.replace({ value: "50" });
    expect(blocks().props.value).toMatchObject({ kind: "literal", value: "50" });
  });
```

Der Harness in dieser Datei löst `require("./FormulaBlocks")` über den Proxy auf; damit `FormulaBlocks` als echtes Bauteil gerendert wird, im `require` des Harness (Zeile ~40) ergänzen: `if (name === "./FormulaBlocks") return FormulaBlocksModule;` mit `import * as FormulaBlocksModule from "../src/features/FormulaBlocks";` sowie `if (name === "./formula-sugar") return FormulaSugar;`, `if (name === "./formula-example") return FormulaExample;`, `if (name === "./rule-forge-model") return model;` mit den entsprechenden Imports. `./FormulaLine` und `./FormulaGraph` kommen als Zeichenketten-Typen aus den `mocks`, damit der Test nur das Bauteil selbst prüft.

- [ ] **Step 2: Test laufen lassen, Fehlschlag sehen**

Run: `npx vitest run packages/client/test/htbah-client-review.test.ts`
Expected: FAIL — `FormulaField.tsx` hat noch keinen Knopf „Bausteine" im Harness-Baum bzw. `sourcesFromDraft` fehlt (je nach Reihenfolge).

- [ ] **Step 3: `sourcesFromDraft` ergänzen und die Editoren umstellen**

In `formula-sugar.ts` anhängen (Import `type DraftField` aus `./rule-forge-model`):

```ts
export function sourcesFromDraft(fields: readonly DraftField[], inputs: readonly DraftField[] = []): FormulaSources {
  const members = (list: readonly DraftField[]): FormulaMember[] => list.filter(f => /^[a-z][a-z0-9_-]*$/.test(f.id)).map(f => ({ id: f.id, label: f.label.trim() || f.id, type: f.type === "integer" ? "number" : f.type }));
  return { actor: members(fields), input: members(inputs) };
}
```

`RuleDeclarativeEditor.tsx`: `ExpressionInput` samt `FormulaBuilder`-Import löschen und durch eine dünne Hülle ersetzen, die überall statt `ExpressionInput` steht:

```tsx
import { FormulaField } from "./FormulaField";
import { sourcesFromDraft } from "./formula-sugar";
function ExpressionInput({ value, onChange, draft, action, label, help }: { value: string; onChange(value: string): void; draft: RuleDraft; action?: DraftAction; label: string; help?: string }) {
  return <FormulaField label={label} help={help} value={value} onChange={onChange} sources={sourcesFromDraft(draft.fields, action?.inputs ?? [])} fields={draft.fields} inputs={action?.inputs ?? []} actionId={action?.id} allowDice={false} allowKnowledge={false} />;
}
```

Alle Aufrufer anpassen: `AssertionEditor` bekommt `draft` und optional `action` statt `fields`; `VitalEditor` ruft `<ExpressionInput label="Höchststand" help="Der höchste Stand, den der Balken zeigt, zum Beispiel @konstitution * 5." value={vital.max} onChange={…} draft={draft} />`; `RuleDeclarativeEditor` für berechnete Werte `label="Berechnung" help="Ergibt sich aus Attributen, ohne Wurf."`; `RuleActionExtensions` für Bereiche `label="Vergleichswert" draft={draft} action={action}`; Vorbedingungen `label="Bedingung" draft={draft} action={action}`. Die Texte der Abschnitte im Objekt-Bild: `<h3>Abgeleitete Werte</h3><p className="rf-help">Werte, die sich aus Attributen ergeben, zum Beispiel ein Bonus aus Geschick. Sie werden bei der Anzeige berechnet und nicht gespeichert.</p>`, Bedingungen `<h3>Regeln für einen gültigen Bogen</h3>`, Balken bleibt. Der Schalter für Version 1 heißt jetzt: `<Button onClick={…}>Abgeleitete Werte, Regeln und Balken einschalten</Button>` mit dem Satz davor: „Damit wechselt dieses Paket auf das erweiterte Format. Lebenspunkte und andere Balken ändern Spielende dann über den Bogen, nicht über den alten Schnellknopf. Gespeicherte Würfelbelege behalten ihre bisherigen Regeln."

`RuleForge.tsx`, `MigrationStepEditor` (Zeile 298): den `FormulaBuilder`-Aufruf ersetzen durch

```tsx
{step.kind === "numeric" ? <FormulaField label="Neuer Zahlenwert" help="@value ist der bisherige Zahlenwert dieses Attributs, zum Beispiel @value * 2." value={draftExpression(step)} onChange={expression => onChange({ ...step, expression })} sources={{ actor: [{ id: "value", label: "bisheriger Wert", type: "number" }], input: [] }} fields={[{ ...newField("value"), label: "bisheriger Wert", defaultValue: "1" }]} allowDice={false} allowKnowledge={false} /> : null}
```

`draftExpression(step)` funktioniert, weil der numerische Schritt `formula`, `originalFormula`, `originalExpression` und `expression?` trägt (Task 7). Import `FormulaBuilder` in `RuleForge.tsx` entfernen, `FormulaField` importieren. Danach `packages/client/src/features/FormulaBuilder.tsx` löschen und in `rule-forge.css` die Zeilen 47–54 (`.rf-formula` bis `.rf-function-arg`) sowie die `.rf-formula-*`-Regeln in den Media-Queries (Zeilen 71–72) entfernen.

- [ ] **Step 4: Tests laufen lassen**

Run: `npx vitest run packages/client/test/htbah-client-review.test.ts packages/client/test/htbah-forge.test.ts packages/client/test/rule-forge-model.test.ts && npm run build`
Expected: grün; Build ohne Verweise auf `FormulaBuilder`. `grep -rn "FormulaBuilder" packages/client/src` liefert nichts.

- [ ] **Step 5: Commit**

```bash
git add -A packages/client/src/features/RuleDeclarativeEditor.tsx packages/client/src/features/RuleForge.tsx packages/client/src/features/FormulaBuilder.tsx packages/client/src/features/rule-forge.css packages/client/src/features/formula-sugar.ts packages/client/test/htbah-client-review.test.ts
git commit -m "refactor(schmiede): abgeleitete Werte, Bereiche und Migration nutzen das Formel-Bauteil" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 9: Aktionen als Methoden — Liste plus Karte

**Files:**
- Create: `packages/client/src/features/RuleActionEditor.tsx`
- Modify: `packages/client/src/features/RuleForge.tsx` (`ActionEditor` Zeilen 262–278 entfernen; Aufruf im Reiter `actions`)
- Modify: `packages/client/src/features/rule-forge.css` (Anhang `.rf-split`)
- Modify: `e2e/rule-forge.spec.ts` (Zeilen 66–77)
- Test: `packages/client/test/rule-action-editor.test.ts`

**Interfaces:**
- Consumes: `FormulaField`, `sourcesFromDraft`, `draftExpression`, `newAction`, `moveItem`, `RULE_LIMITS`, `RuleActionExtensions`, `FieldList` (bleibt in `RuleForge.tsx` exportiert: `export function FieldList`).
- Produces:
  ```tsx
  export function RuleActionEditor({ draft, disabled, onChange }: { draft: RuleDraft; disabled: boolean; onChange(actions: DraftAction[]): void }): JSX.Element;
  ```
  Aufbau: `<div className="rf-split"><nav className="rf-list" aria-label="Aktionen">…</nav><section className="rf-detail" aria-label="Aktion">…</section></div>`. Listeneinträge sind Knöpfe mit `aria-current="true"` für die gewählte Aktion; ab zehn Einträgen ein Suchfeld `aria-label="Aktion suchen"`.

- [ ] **Step 1: Failing test schreiben**

`packages/client/test/rule-action-editor.test.ts`:

```ts
// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { HOW_TO_BE_A_HERO_PACKAGE } from "@chronicle/rules";
import { RuleActionEditor } from "../src/features/RuleActionEditor";
import { newPackage, packageDraft } from "../src/features/rule-forge-model";

describe("actions as methods", () => {
  it("renders a list beside the card of the selected action with parameters and the formula field", () => {
    const draft = newPackage("Sera"), html = renderToStaticMarkup(createElement(RuleActionEditor, { draft, disabled: false, onChange() {} }));
    expect(html).toContain('aria-label="Aktionen"'); expect(html).toContain('aria-current="true"');
    expect(html).toContain(">Parameter<"); expect(html).toContain(">Ergebnis<"); expect(html).toContain(">Erfolg<");
    expect(html).toContain('value="' + draft.actions[0]!.name + '"');
    expect(html).not.toContain("Aktion bearbeiten"); expect(html).not.toMatch(/Eingaben der Aktion|Baustein/);
  });
  it("adds a search box once the list is long", () => {
    const html = renderToStaticMarkup(createElement(RuleActionEditor, { draft: packageDraft(HOW_TO_BE_A_HERO_PACKAGE), disabled: false, onChange() {} }));
    expect(html).toContain('aria-label="Aktion suchen"');
  });
});
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag sehen**

Run: `npx vitest run packages/client/test/rule-action-editor.test.ts`
Expected: FAIL — Modul fehlt.

- [ ] **Step 3: Bauteil schreiben**

`packages/client/src/features/RuleActionEditor.tsx`:

```tsx
// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { useState } from "react";
import { ArrowDown, ArrowUp, Plus, Search, Trash2 } from "lucide-react";
import { Button } from "@chronicle/ui";
import { RULE_LIMITS } from "@chronicle/rules";
import { FormulaField } from "./FormulaField";
import { sourcesFromDraft } from "./formula-sugar";
import { RuleActionExtensions } from "./RuleDeclarativeEditor";
import { FieldList } from "./RuleFieldList";
import { draftExpression, moveItem, newAction, type DraftAction, type RuleDraft } from "./rule-forge-model";

export function RuleActionEditor({ draft, disabled, onChange }: { draft: RuleDraft; disabled: boolean; onChange(actions: DraftAction[]): void }) {
  const [selected, setSelected] = useState(""), [query, setQuery] = useState("");
  const action = draft.actions.find(a => a.localId === selected) ?? draft.actions[0];
  const update = (next: DraftAction) => onChange(draft.actions.map(a => a.localId === next.localId ? next : a));
  const shown = draft.actions.filter(a => !query.trim() || `${a.name} ${a.id}`.toLocaleLowerCase("de").includes(query.trim().toLocaleLowerCase("de")));
  const index = action ? draft.actions.indexOf(action) : -1;
  return <div className="rf-split">
    <nav className="rf-list" aria-label="Aktionen">
      <div className="rf-section-heading"><h3>Aktionen</h3><Button disabled={disabled || draft.actions.length >= RULE_LIMITS.actions} onClick={() => { const next = newAction(draft.actions.map(a => a.id)); onChange([...draft.actions, next]); setSelected(next.localId); }}><Plus size={15} />Aktion</Button></div>
      <p className="rf-help">Was eine Figur tun kann: ein Wurf mit Attributen, Parametern und einer Erfolgsregel.</p>
      {draft.actions.length >= 10 ? <label className="rf-list-search"><Search size={14} aria-hidden="true" /><input aria-label="Aktion suchen" value={query} placeholder="Name oder Kennung" onChange={event => setQuery(event.target.value)} /></label> : null}
      <ul>{shown.map(a => <li key={a.localId}><button type="button" aria-current={a.localId === action?.localId ? "true" : undefined} onClick={() => setSelected(a.localId)}><strong>{a.name || "Ohne Namen"}</strong><small>{a.id}{a.inputs.length ? ` · ${a.inputs.length} Parameter` : ""}</small></button></li>)}</ul>
      {!draft.actions.length ? <p>Noch keine Aktion. Lege oben die erste an, zum Beispiel „Angriff": 1d20 plus Geschick, Erfolg ab 15.</p> : null}
    </nav>
    {action ? <section className="rf-detail" aria-label="Aktion"><fieldset className="rf-editor-fields" disabled={disabled}>
      <div className="rf-section-heading"><h4>{action.name || "Ohne Namen"}</h4><span className="rf-toolbar"><span className="rf-order"><Button variant="quiet" disabled={index <= 0} aria-label="Nach oben verschieben" onClick={() => onChange(moveItem(draft.actions, index, -1))}><ArrowUp size={14} /></Button><Button variant="quiet" disabled={index >= draft.actions.length - 1} aria-label="Nach unten verschieben" onClick={() => onChange(moveItem(draft.actions, index, 1))}><ArrowDown size={14} /></Button></span><Button variant="quiet" onClick={() => { onChange(draft.actions.filter(a => a.localId !== action.localId)); setSelected(""); }}><Trash2 size={15} />Aktion entfernen</Button></span></div>
      <div className="rf-form-grid"><label>Name<input value={action.name} maxLength={120} onChange={event => update({ ...action, name: event.target.value })} /><small>So heißt die Aktion am Tisch, zum Beispiel Angriff.</small></label><label>Kennung<input value={action.id} maxLength={96} spellCheck={false} onChange={event => update({ ...action, id: event.target.value })} /><small>Für Pakettests und Migrationen, zum Beispiel angriff. Nur Kleinbuchstaben, Ziffern, „_" und „-", beginnend mit einem Buchstaben.</small></label></div>
      <h5>Parameter</h5><p className="rf-help">Was beim Würfeln abgefragt wird, zum Beispiel ein Bonus. In der Formel als ?kennung.</p>
      <FieldList title="Parameter" fields={action.inputs} onChange={inputs => update({ ...action, inputs })} compact />
      <h5>Ergebnis</h5>
      <FormulaField label="Ergebnis" help="Der Wurf mit allen Zuschlägen, zum Beispiel 1d20 + @geschick + ?bonus." value={draftExpression(action)} onChange={expression => update({ ...action, expression })} sources={sourcesFromDraft(draft.fields, action.inputs)} fields={draft.fields} inputs={action.inputs} actionId={action.id} allowDice allowKnowledge />
      <h5>Erfolg</h5>
      <label className="rf-check"><input type="checkbox" disabled={!!action.outcome} checked={action.thresholdEnabled} onChange={event => update({ ...action, thresholdEnabled: event.target.checked })} />Feste Erfolgsschwelle verwenden</label>
      {action.thresholdEnabled ? <label>Erfolg ab Ergebnis<input type="number" value={action.threshold} step="any" onChange={event => update({ ...action, threshold: event.target.value })} /><small>Das Ergebnis mit allen Zuschlägen muss mindestens diese Zahl erreichen, zum Beispiel 15 bei einem W20.</small></label> : null}
      {action.outcome ? <p className="rf-help">Diese Aktion nutzt die Ergebnisbereiche weiter unten.</p> : null}
      <RuleActionExtensions draft={draft} action={action} onChange={update} />
      <details className="rf-input-editor"><summary>Details</summary>
        <label>Version dieser Aktion<input value={action.version} placeholder="1.0.0" onChange={event => update({ ...action, version: event.target.value })} /><small>Eigene Version, unabhängig vom Paket, zum Beispiel 1.0.0.</small></label>
        <label>Erklärung am Tisch<textarea rows={3} value={action.disclosure} maxLength={1024} onChange={event => update({ ...action, disclosure: event.target.value })} /><small>Erkläre, wie das Wissen der Figur das Ergebnis beeinflusst. Am Tisch bleibt die Bestätigung durch Menschen erforderlich.</small></label>
      </details>
    </fieldset></section> : null}
  </div>;
}
```

`FieldList` bekommt in Task 10 die Option `compact` (ohne Suchfeld, ohne Liste-plus-Editor, Karten wie heute, aber mit Objekt-Wörtern); bis dahin in `RuleForge.tsx` exportieren: `export function FieldList(...)`. Im Reiter `actions` in `RuleForge.tsx`: `{tab === "actions" ? <RuleActionEditor draft={current} disabled={!editable || task.busy} onChange={actions => edit({ ...current, actions })} /> : null}` und die alte `ActionEditor`-Funktion löschen.

An `rule-forge.css` anhängen:

```css
.rf-split { display: grid; grid-template-columns: minmax(220px, 280px) minmax(0, 1fr); gap: 20px; align-items: start; }
.rf-list ul { list-style: none; margin: 8px 0 0; padding: 0; display: grid; gap: 4px; }
.rf-list li button { width: 100%; text-align: left; display: grid; gap: 2px; padding: 8px 10px; border: 1px solid var(--line); border-radius: 5px; background: var(--surface); color: var(--text); cursor: pointer; }
.rf-list li button[aria-current="true"] { border-color: var(--accent); background: var(--accent-soft); }
.rf-list li button small { color: var(--text-muted); overflow-wrap: anywhere; }
.rf-list-search { display: flex; align-items: center; gap: 6px; margin-top: 8px; }
.rf-list-search input { flex: 1; }
.rf-detail h5 { margin: 20px 0 6px; font-size: 13px; letter-spacing: .04em; text-transform: uppercase; color: var(--accent); }
@media (max-width: 760px) { .rf-split { grid-template-columns: minmax(0, 1fr); } }
```

`e2e/rule-forge.spec.ts`, Zeilen 66–77 ersetzen (der Baukasten wird durch die Zeile ersetzt):

```ts
    await gm.getByRole("tab", { name: "Aktionen", exact: true }).click();
    await editor.getByRole("button", { name: "Aktion", exact: true }).click();
    await editor.getByLabel(/^Name/).fill("Nordlichtprobe");
    await editor.getByLabel(/^Kennung/).fill("explore");
    await editor.getByLabel("Feste Erfolgsschwelle verwenden").check();
    await editor.getByLabel("Erfolg ab Ergebnis").fill("1");
    const formula = editor.getByRole("combobox", { name: "Formel", exact: true }).first();
    await formula.fill("1d6 + @ins");
    await gm.getByRole("option", { name: /Wachsamkeit/ }).click();
    await expect(formula).toHaveValue("1d6 + @insight");
    await expect(editor.getByText(/^Beispiel für /)).toBeVisible();
```

- [ ] **Step 4: Tests laufen lassen**

Run: `npx vitest run packages/client/test/rule-action-editor.test.ts packages/client/test/htbah-client-review.test.ts && npm run build`
Expected: grün, Build grün.

- [ ] **Step 5: Commit**

```bash
git add packages/client/src/features/RuleActionEditor.tsx packages/client/src/features/RuleForge.tsx packages/client/src/features/rule-forge.css packages/client/test/rule-action-editor.test.ts e2e/rule-forge.spec.ts
git commit -m "feat(schmiede): Aktionen als Methoden mit Liste, Parametern und Formel-Bauteil" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 10: Attribute als Liste plus Editor, Objektkarte, Reiter im Objekt-Bild

**Files:**
- Create: `packages/client/src/features/RuleFieldList.tsx` (`FieldList` und `FieldEditor` ziehen aus `RuleForge.tsx` um)
- Modify: `packages/client/src/features/RuleForge.tsx` (Reiter, Beschreibungen, Objektkarte, `FieldList`-Import, `locateValidationError`-Labels, Beispiel-Kontext)
- Modify: `packages/client/src/features/RuleForgePreview.tsx` (meldet die erste Testfigur nach oben)
- Modify: `packages/client/src/features/rule-forge.css` (Objektkarte)
- Modify: `e2e/rule-forge.spec.ts`, `e2e/htbah.spec.ts` (Reiternamen)
- Test: `packages/client/test/rule-field-list.test.ts`

**Interfaces:**
- Produces:
  ```tsx
  export function FieldList({ title, fields, onChange, compact }: { title: string; fields: DraftField[]; onChange(fields: DraftField[]): void; compact?: boolean }): JSX.Element;
  ```
  Ohne `compact`: `<div className="rf-split"><nav className="rf-list" aria-label="Attribute">…</nav><section className="rf-detail" aria-label="Attribut">FieldEditor</section></div>`, Suchfeld `aria-label="Attribut suchen"` ab zehn Einträgen. Mit `compact`: Karten untereinander wie heute (für Parameter).
  `RuleForgePreview` bekommt `onFigure?(figure: ExampleFigure | null): void` und ruft es bei jeder Änderung der ersten Testfigur (`useEffect` über `fixtures[0]`, `pkg`) mit `{ name, values: fixtureValues(pkg.fields, values), inputs, passages }`.
  Reiter: `["package", "Paket"], ["fields", "Attribute"], ["sheet", "Bogen"], ["actions", "Aktionen"], ["computed", "Abgeleitet"], ["tests", "Pakettests"], ["migrations", "Migration"]`.

- [ ] **Step 1: Failing test schreiben**

`packages/client/test/rule-field-list.test.ts`:

```ts
// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FieldList } from "../src/features/RuleFieldList";
import { newField } from "../src/features/rule-forge-model";

const fields = Array.from({ length: 12 }, (_, i) => ({ ...newField(`wert_${i}`), label: `Wert ${i}` }));
describe("attributes as list plus editor", () => {
  it("lists every attribute, edits the first one and offers search beyond ten", () => {
    const html = renderToStaticMarkup(createElement(FieldList, { title: "Attribute", fields, onChange() {} }));
    expect(html).toContain('aria-label="Attribute"'); expect(html).toContain('aria-current="true"'); expect(html).toContain('aria-label="Attribut suchen"');
    expect(html).toContain('value="Wert 0"'); expect(html).not.toContain('value="Wert 1"');
    expect(html).toContain("In Formeln als @wert_0");
  });
  it("keeps the compact card layout for parameters", () => {
    const html = renderToStaticMarkup(createElement(FieldList, { title: "Parameter", fields: fields.slice(0, 2), onChange() {}, compact: true }));
    expect(html).not.toContain("rf-split"); expect(html).toContain('value="Wert 1"'); expect(html).toContain("In Formeln als ?wert_0");
  });
});
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag sehen**

Run: `npx vitest run packages/client/test/rule-field-list.test.ts`
Expected: FAIL — Modul fehlt.

- [ ] **Step 3: `RuleFieldList.tsx` schreiben, `RuleForge.tsx` umbauen**

`packages/client/src/features/RuleFieldList.tsx`: `FieldEditor` (heutige Zeilen 232–251 von `RuleForge.tsx`) unverändert übernehmen bis auf drei Texte: Überschrift „Feld hinzufügen" → „Attribut hinzufügen", Hilfe zur Kennung → `So heißt das Attribut in Formeln: In Formeln als ${sigil}${field.id || "kennung"}. Nur Kleinbuchstaben, Ziffern und „_", beginnend mit einem Buchstaben; ein Bindestrich lässt sich in Formeln nicht verwenden.` (mit `sigil = compact ? "?" : "@"`, als Prop `sigil` an `FieldEditor` durchgereicht), Fehlerhinweis „Feldkennung" → „Kennung". Dazu:

```tsx
export function FieldList({ title, fields, onChange, compact = false }: { title: string; fields: DraftField[]; onChange(fields: DraftField[]): void; compact?: boolean }) {
  const [selected, setSelected] = useState(""), [query, setQuery] = useState("");
  const add = () => { const next = newField(uniqueId(compact ? "parameter" : "attribut", fields.map(f => f.id))); onChange([...fields, next]); setSelected(next.localId); };
  const sigil = compact ? "?" : "@";
  const editor = (field: DraftField, index: number) => <FieldEditor key={field.localId} field={field} index={index} length={fields.length} sigil={sigil} onChange={next => onChange(fields.map(f => f.localId === field.localId ? next : f))} onRemove={() => { onChange(fields.filter(f => f.localId !== field.localId)); setSelected(""); }} onMove={delta => onChange(moveItem(fields, index, delta))} />;
  const heading = <div className="rf-section-heading"><h3>{title}</h3><Button disabled={fields.length >= RULE_LIMITS.fields} onClick={add}><Plus size={15} />{compact ? "Parameter hinzufügen" : "Attribut hinzufügen"}</Button></div>;
  if (compact) return <>{heading}{!fields.length ? <p className="rf-help">Keine Parameter. Die Aktion würfelt nur mit Attributen und festen Zahlen.</p> : null}{fields.map(editor)}</>;
  const current = fields.find(f => f.localId === selected) ?? fields[0];
  const shown = fields.filter(f => !query.trim() || `${f.label} ${f.id}`.toLocaleLowerCase("de").includes(query.trim().toLocaleLowerCase("de")));
  return <div className="rf-split">
    <nav className="rf-list" aria-label="Attribute">{heading}
      <p className="rf-help">Die Werte, die jede Figur trägt, zum Beispiel Geschick oder Lebenspunkte. In Formeln als @kennung.</p>
      {fields.length >= 10 ? <label className="rf-list-search"><Search size={14} aria-hidden="true" /><input aria-label="Attribut suchen" value={query} placeholder="Bezeichnung oder Kennung" onChange={event => setQuery(event.target.value)} /></label> : null}
      <ul>{shown.map(f => <li key={f.localId}><button type="button" aria-current={f.localId === current?.localId ? "true" : undefined} onClick={() => setSelected(f.localId)}><strong>{f.label || "Ohne Bezeichnung"}</strong><small>{f.id} · {f.type === "integer" ? "ganze Zahl" : f.type === "number" ? "Zahl" : f.type === "boolean" ? "Ja/Nein" : "Text"}</small></button></li>)}</ul>
      {!fields.length ? <p>Noch keine Attribute. Lege oben das erste an, zum Beispiel „Geschick" als ganze Zahl von 0 bis 6.</p> : null}
    </nav>
    {current ? <section className="rf-detail" aria-label="Attribut">{editor(current, fields.indexOf(current))}</section> : null}
  </div>;
}
```

In `RuleForge.tsx`:
1. `FieldList` und `FieldEditor` löschen, `import { FieldList } from "./RuleFieldList";`.
2. Reiter und Beschreibungen ersetzen:
   ```ts
   const tabs: [EditorTab, string][] = [["package", "Paket"], ["fields", "Attribute"], ["sheet", "Bogen"], ["actions", "Aktionen"], ["computed", "Abgeleitet"], ["tests", "Pakettests"], ["migrations", "Migration"]];
   const tabDescriptions: Record<EditorTab, string> = {
     package: "Name, Version, Kennung und Lizenz: die Grunddaten dieses Regelwerks.",
     fields: "Attribute: die Werte, die jede Figur trägt, zum Beispiel Geschick oder Lebenspunkte.",
     sheet: "Bogen: wie die Attribute auf dem Charakterbogen angeordnet sind.",
     actions: "Aktionen: was eine Figur tun kann und wie dafür gewürfelt wird.",
     computed: "Abgeleitet: Werte, die sich aus Attributen ergeben, Regeln für einen gültigen Bogen und Balken wie Lebenspunkte.",
     tests: "Pakettests: feste Beispiele, die bei jeder Installation nachgerechnet werden.",
     migrations: "Migration: wie vorhandene Bögen beim Wechsel auf diese Version übernommen werden.",
   };
   ```
   Im Reiter `fields`: `<FieldList title="Attribute" … />`. In `locateValidationError` bleiben die Muster; `label(...)` liefert automatisch „Attribute"/„Abgeleitet". In `explainValidationError` die Reiternamen „Felder" → „Attribute", „Berechnungen" → „Abgeleitet" und „Baustein" → „die markierte Stelle in der Formel" ersetzen.
3. Objektkarte: den `rf-card`-Block „Aufbau dieses Pakets" ersetzen durch
   ```tsx
   <div className="rf-card rf-object" aria-label="Die Figur in diesem Regelwerk"><div className="rf-section-heading"><h3>Die Figur in diesem Regelwerk</h3><span className="rf-help">Schritt {tabs.findIndex(([id]) => id === tab) + 1} von {tabs.length}</span></div><p className="rf-help">{tabDescriptions[tab]}</p>
     <div className="rf-toolbar"><span className="rf-node-badge">{current.fields.length} Attribute</span><span className="rf-node-badge">{(current.computed?.length ?? 0)} abgeleitet</span><span className="rf-node-badge">{(current.constraints?.length ?? 0)} Regeln</span><span className="rf-node-badge">{(current.vitals?.length ?? 0)} Balken</span><span className="rf-node-badge">{current.actions.length} Aktionen</span><span className="rf-node-badge">{current.selfTests.length} Pakettests</span></div></div>
   ```
4. Beispiel-Kontext: `const [figure, setFigure] = useState<ExampleFigure | null>(null);` und den Editorbereich in `<FormulaExampleContext.Provider value={figure}>…</FormulaExampleContext.Provider>` hüllen; `<RuleForgePreview pkg={previewPkg} onFigure={setFigure} onSaveTest={…} />`.

`RuleForgePreview.tsx`: Prop `onFigure?: (figure: ExampleFigure | null) => void` und

```tsx
useEffect(() => { const first = fixtures[0]; onFigure?.(pkg && first ? { name: first.name, values: fixtureValues(pkg.fields, first.values), inputs: first.inputs, passages: first.passages.map(p => ({ passageId: p.passageId, labels: p.labels.split(",").map(s => s.trim()).filter(Boolean), experience: p.experience })) } : null); }, [fixtures, pkg, onFigure]);
```

An `rule-forge.css` anhängen: `.rf-object .rf-toolbar { margin-top: 10px; }`.

In `e2e/rule-forge.spec.ts` Zeile 60 `"Felder"` → `"Attribute"`; in `e2e/htbah.spec.ts` Zeile 62 `"Berechnungen"` → `"Abgeleitet"`. In `rule-forge.spec.ts` Zeile 61 bleibt `.rf-card` mit Überschrift „Scharfsinn" gültig, weil `FieldEditor` weiter eine `rf-card` mit `h4` rendert; da der Editor nur das gewählte Attribut zeigt, vorher den Listeneintrag klicken: `await editor.getByRole("button", { name: /Scharfsinn/ }).click();`.

- [ ] **Step 4: Tests laufen lassen**

Run: `npx vitest run packages/client/test/rule-field-list.test.ts packages/client/test/rule-action-editor.test.ts packages/client/test/htbah-client-review.test.ts && npm run build && npx playwright test e2e/rule-forge.spec.ts e2e/htbah.spec.ts`
Expected: alles grün. Bei einem roten Browserablauf zuerst den Fehlerkontext in `test-results/**/error-context.md` lesen und die Spec an das neue Layout anpassen, ohne Erwartungen an Belege oder Rechte zu lockern.

- [ ] **Step 5: Commit**

```bash
git add packages/client/src/features/RuleFieldList.tsx packages/client/src/features/RuleForge.tsx packages/client/src/features/RuleForgePreview.tsx packages/client/src/features/rule-forge.css packages/client/test/rule-field-list.test.ts e2e/rule-forge.spec.ts e2e/htbah.spec.ts
git commit -m "feat(schmiede): Attribute als Liste plus Editor, Objektkarte und Reiter im Objekt-Bild" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 11: Jargon-Gate

**Files:**
- Test: `packages/client/test/rule-forge-klartext.test.ts`
- Modify: alle in Task 8–10 genannten Bauteile, wo der Test anschlägt

- [ ] **Step 1: Test schreiben**

```ts
// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const FILES = ["RuleForge.tsx", "RuleActionEditor.tsx", "RuleFieldList.tsx", "RuleDeclarativeEditor.tsx", "RuleForgePreview.tsx", "FormulaField.tsx", "FormulaLine.tsx", "FormulaBlocks.tsx", "FormulaGraph.tsx", "formula-sugar.ts", "formula-example.ts", "formula-graph-model.ts"];
const FORBIDDEN = /\b(parser|token|tokenizer|kanonisch\w*|syntax\w*|ast|ports?|skalar\w*|identifier|schema\w*|typinferenz|literal\w*|operand\w*|operator\w*|expression\w*|inputs?|fields?)\b/i;
/** Visible text: JSX text nodes, template/string props that reach the screen, and the plain strings in the German catalogues. */
function visibleStrings(source: string): string[] {
  const out: string[] = [];
  for (const match of source.matchAll(/>([^<>{}]+)</g)) out.push(match[1]!);
  for (const match of source.matchAll(/(?:aria-label|title|placeholder|label|help|message|detail|resultLabel)\s*[:=]\s*(?:\{)?\s*(["'`])((?:\\.|(?!\1).)*)\1/g)) out.push(match[2]!);
  return out.map(s => s.trim()).filter(s => s.length > 2);
}
describe("plain language in the rule forge", () => {
  it.each(FILES)("%s shows no jargon to the user", file => {
    const source = readFileSync(new URL(`../src/features/${file}`, import.meta.url), "utf8");
    const hits = visibleStrings(source).filter(text => FORBIDDEN.test(text));
    expect(hits, hits.join("\n")).toEqual([]);
  });
});
```

- [ ] **Step 2: Test laufen lassen und jeden Treffer in Alltagssprache umformulieren**

Run: `npx vitest run packages/client/test/rule-forge-klartext.test.ts`
Expected zunächst: rot mit einer Liste. Jeden Treffer im Quelltext ersetzen (zum Beispiel „Ausdruck" → „Formel", „Eingaben" → „Parameter", „Feld" → „Attribut"), dann erneut laufen lassen bis grün. Kommentare und Kennungen sind nicht betroffen, weil nur JSX-Text und die genannten Props gelesen werden. Falls ein Treffer ein Wort in einem Kommentar innerhalb von JSX ist (`{/* … */}`), den Kommentar außerhalb des JSX platzieren.

- [ ] **Step 3: Commit**

```bash
git add packages/client/test/rule-forge-klartext.test.ts packages/client/src/features
git commit -m "test(schmiede): Jargon-Gate für sichtbare Texte der Regelschmiede" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 12: Browserablauf, Nachweise, Gates

**Files:**
- Create: `e2e/rule-forge-formula.spec.ts`
- Create: `design/iterations/regelschmiede-formel-bauteil-20260908.md`
- Modify: `STATUS.md` (neuer Kopfabschnitt)

- [ ] **Step 1: Browserablauf schreiben**

`e2e/rule-forge-formula.spec.ts` (Aufbau wie `rule-forge.spec.ts`, Zeilen 1–31 übernehmen, dann):

```ts
test("typing a formula with suggestions, plain errors, three views, install and roll", async ({ browser, page: gm }) => {
  const context = await browser.newContext(), player = await context.newPage(), errors: string[] = [];
  for (const page of [gm, player]) page.on("pageerror", error => errors.push(error.message));
  const base = `${origin}/api/campaigns/${campaignId}`, editor = gm.locator(".rf-editor-fields").first();
  try {
    await signIn(gm.context(), gmSession); await signIn(context, playerSession);
    await gm.goto(`${origin}/?campaign=${campaignId}&stage=schmiede&forge=rules`);
    await gm.getByRole("button", { name: "Neues Paket", exact: true }).click();
    await editor.getByRole("textbox", { name: /Paketkennung/ }).fill("de.nordlicht.formeln");
    await gm.getByRole("tab", { name: "Aktionen", exact: true }).click();
    const formula = editor.getByRole("combobox", { name: "Formel", exact: true }).first();
    await formula.fill("1d20 + @ins");
    const suggestions = gm.getByRole("listbox", { name: "Vorschläge" });
    await expect(suggestions.getByRole("option")).toHaveCount(1);
    await gm.keyboard.press("Enter");
    await expect(formula).toHaveValue("1d20 + @insight");
    await expect(editor.getByText(/^Beispiel für /)).toBeVisible();
    await formula.fill("1d20 + @insigt");
    await expect(editor.getByText("Das Attribut „insigt“ gibt es nicht. Meintest du „insight“?")).toBeVisible();
    await expect(gm.getByRole("button", { name: "Version installieren", exact: true })).toBeDisabled();
    await formula.fill("1d20 + @insight");
    await gm.getByRole("button", { name: "Bausteine", exact: true }).click();
    await expect(editor.getByRole("group", { name: "Ergebnis", exact: true }).getByRole("combobox", { name: "Rechenzeichen", exact: true })).toHaveValue("+");
    await editor.getByRole("group", { name: "Ergebnis", exact: true }).getByRole("combobox", { name: "Rechenzeichen", exact: true }).selectOption("*");
    await expect(formula).toHaveValue("1d20 * @insight");
    await gm.getByRole("button", { name: "Knoten", exact: true }).click();
    await expect(gm.getByRole("group", { name: "Formel als Knotennetz", exact: true }).getByRole("button", { name: /Geschick|insight|Scharfsinn/ })).toBeVisible();
    await gm.getByRole("button", { name: "Zeile", exact: true }).click();
    await formula.fill("1d20 + @insight");
    const install = gm.waitForResponse(r => r.url() === `${base}/rules` && r.request().method() === "POST");
    await gm.getByRole("button", { name: "Version installieren", exact: true }).click(); expect((await install).status()).toBe(200);
    const preview = gm.waitForResponse(r => r.url() === `${base}/rules/preview` && r.request().method() === "POST");
    await gm.getByRole("button", { name: "Aktivierung prüfen", exact: true }).click(); expect((await preview).status()).toBe(200);
    const activate = gm.waitForResponse(r => r.url() === `${base}/rules/activate` && r.request().method() === "POST");
    await gm.getByRole("button", { name: "Geprüfte Version für diese Runde aktivieren", exact: true }).click(); expect((await activate).status()).toBe(200);
    await player.goto(`${origin}/?campaign=${campaignId}&stage=tisch`);
    await player.getByRole("tab", { name: "Aktionen", exact: true }).click();
    const rolled = player.waitForResponse(r => r.url() === `${base}/rolls` && r.request().method() === "POST");
    await player.getByRole("button", { name: "Würfeln", exact: true }).click();
    const roll = await (await rolled).json() as ActionCard;
    expect(roll.receipt.expression).toBe("1d20 + actor.insight");
    await gm.setViewportSize({ width: 390, height: 844 });
    await expect(formula).toBeVisible();
    expect(await gm.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(errors).toEqual([]);
  } finally { await context.close(); }
});

test("opening the HTBAH template shows sugar and downloads the package byte for byte", async ({ page: gm }) => {
  await signIn(gm.context(), gmSession);
  await gm.goto(`${origin}/?campaign=${campaignId}&stage=schmiede&forge=rules`);
  await gm.getByRole("button", { name: "HTBAH-Vorlage anpassen" }).click();
  await gm.getByRole("button", { name: "HTBAH als Regelentwurf öffnen" }).click();
  await gm.getByRole("tab", { name: "Aktionen", exact: true }).click();
  await gm.getByRole("button", { name: /Initiative/ }).click();
  await expect(gm.locator(".rf-editor-fields").first().getByRole("combobox", { name: "Formel", exact: true }).first()).toHaveValue(/^1d10 \+ /);
  const downloadPromise = gm.waitForEvent("download");
  await gm.getByRole("button", { name: "Paketdatei", exact: true }).click();
  const downloaded = parseSupportedRulePackage(await readFile((await (await downloadPromise).path())!, "utf8"));
  expect(stableJson(downloaded)).toBe(stableJson(HOW_TO_BE_A_HERO_PACKAGE));
});
```

Imports dazu: `ActionCard` aus `../packages/client/src/features/game-api`, `parseSupportedRulePackage`, `stableJson`, `HOW_TO_BE_A_HERO_PACKAGE` aus `@chronicle/rules`, `readFile` aus `node:fs/promises`. Falls `roll.receipt.expression` im Beleg unter einem anderen Schlüssel liegt, den Schlüssel aus `packages/protocol/src/gameplay.ts` (nur lesen) übernehmen.

- [ ] **Step 2: Browserabläufe laufen lassen**

Run: `npm run build && npx playwright test e2e/rule-forge-formula.spec.ts e2e/rule-forge.spec.ts e2e/htbah.spec.ts`
Expected: grün. Rote Fälle über `test-results/**/error-context.md` diagnostizieren; Ursache beheben, Erwartungen nicht lockern.

- [ ] **Step 3: Gates und Konsumenten**

Run:
```bash
npm run typecheck && npm run build && npm run gate:version && npm run gate:boundaries
npx vitest run packages/rules/test packages/client/test/formula-sugar.test.ts packages/client/test/formula-example.test.ts packages/client/test/formula-line.test.ts packages/client/test/formula-blocks.test.ts packages/client/test/formula-graph-model.test.ts packages/client/test/formula-field.test.ts packages/client/test/rule-action-editor.test.ts packages/client/test/rule-field-list.test.ts packages/client/test/rule-forge-klartext.test.ts packages/client/test/rule-forge-model.test.ts packages/client/test/htbah-forge.test.ts packages/client/test/htbah-client-review.test.ts packages/client/test/roll-card.test.ts packages/server/test/rules.test.ts
```
Expected: alles grün (`server/test/rules.test.ts` deckt den Server-Konsumenten von `@chronicle/rules`; existiert die Datei unter anderem Namen, `ls packages/server/test | grep -i rule`).

- [ ] **Step 4: Nachweise schreiben**

`design/iterations/regelschmiede-formel-bauteil-20260908.md`: Auftrag (Kaya), Entscheidungen (Verweis auf die Spec), was gebaut wurde (drei Ansichten, Zucker, Klartext, Objekt-Bild), gemessene Nachweise (Testzahlen aus Step 2–3, Browserabläufe, Gates), Abweichungen von der Spec (Chip zeigt die Kennung, die Bezeichnung als Tooltip und im Beispiel; Zeile bleibt in Bausteine/Knoten sichtbar), offen (Regelkarte, Kategorien, Ausrüstung, Beispiel-Regelwerke, Lizenzfragen). `STATUS.md`: neuer Kopfabschnitt „Regelschmiede: Formel-Bauteil im Objekt-Bild — 2026-09-08" mit denselben Fakten in acht Zeilen.

- [ ] **Step 5: Commit**

```bash
git add e2e/rule-forge-formula.spec.ts design/iterations/regelschmiede-formel-bauteil-20260908.md STATUS.md
git commit -m "test(schmiede): Browserablauf für Formelzeile, Ansichten und Beleg; Nachweise" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

## Selbstprüfung des Plans

- Spec-Abdeckung: 3.1 Zucker → Task 2/7; 3.2 Exporte → Task 1; 3.3 Vervollständigung → Task 2/4; 3.4 Fehlerkatalog → Task 2 (+ Codes `dice`, `number`, `object-path`, `dice-forbidden`, `knowledge-forbidden`, `empty` zusätzlich zur Spec); 4.1–4.2 Bauteil und Umschalter → Task 7; 4.3 Zeile, Spickzettel, Erst-Hinweis → Task 4; 4.4 Beispiel → Task 3/7; 4.5 Bausteine → Task 5; 4.6 Knoten → Task 6; 4.7 Telefon → Task 12 (390 px); 5 Klartext, Schalter → Task 8/11; 6 Layout → Task 9/10; 7 Grenzen → Global Constraints; 8 Prüfung → Task 12.
- Abweichung von der Spec, absichtlich: Der Chip in der Zeile zeigt die Kennung (`@geschick`), nicht die Bezeichnung, weil die Überlagerung zeichengenau über dem echten Eingabefeld liegen muss; die Bezeichnung steht als Tooltip, in der Vorschlagsliste und im Beispiel. Die Zeile bleibt in den Ansichten Bausteine und Knoten sichtbar.
- Typkonsistenz: `FormulaSources`/`FormulaMember`/`FormulaOptions` (Task 2) werden in Task 3–10 gleich verwendet; `ExampleFigure` (Task 3) in Task 7/10; `FormulaDraft` bleibt das Modell der Bausteine; `expression?` an `DraftAction` (Task 7) wird in Task 9 gesetzt und in Task 8 über `draftExpression` gelesen.
