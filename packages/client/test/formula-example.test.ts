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
    const engine = evaluateFormula("1d20 + actor.geschick - input.bonus", { seed: context.seed, actor: context.actor, input: context.input, knowledge: context.knowledge });
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
  it("renders a negative head value with the typographic minus, never the ASCII hyphen", () => {
    const result = formulaExample("0 - actor.geschick", context, sources);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.text).toBe("Beispiel für Beispielfigur: −3 = 0 (0) − 3 (Geschick)");
      expect(result.text).not.toContain("-");
    }
  });
});
