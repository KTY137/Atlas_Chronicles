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
