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
    ["99999999999999", "number", 0, 14],
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
    // The old scanner reported where scanning stopped (end of the previous good token), not the bad
    // character's own position; parseFormulaDetailed keeps the exact position (see the table above, 4..6).
    expect(() => parseFormula("1 + §2")).toThrow("formula: invalid token at 3");
  });
  it("keeps the old 96-character field-identifier cap and message", () => {
    expect(() => parseFormula("actor.")).toThrow("field: expected nonempty string (max 96)");
    expect(() => parseFormula(`actor.${"a".repeat(97)}`)).toThrow("field: expected nonempty string (max 96)");
    const detail = parseFormulaDetailed(`actor.${"a".repeat(97)}`);
    expect(detail.ok).toBe(false);
    if (!detail.ok) expect(detail.expected).toBe("field");
  });
  it("reports the token limit before an invalid character found beyond it", () => {
    const source = "1+".repeat(1100) + "§";
    expect(() => parseFormula(source)).toThrow(/token limit/);
    const detail = parseFormulaDetailed(source);
    expect(detail.ok).toBe(false);
    if (!detail.ok) expect(detail.code).toBe("limit");
  });
});
