// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { parseFormula } from "@chronicle/rules";
import { blockFor, blockKinds, FormulaBlocks } from "../src/features/FormulaBlocks";
import { compileFormula, formulaDraft, formulaSource, literalDraft } from "../src/features/rule-forge-model";
import type { FormulaSources } from "../src/features/formula-sugar";

const sources: FormulaSources = { actor: [{ id: "geschick", label: "Geschick", type: "number" }], input: [{ id: "bonus", label: "Bonus", type: "number" }] };
const options = { allowDice: true, allowKnowledge: false };
const render = (expression: string) => renderToStaticMarkup(createElement(FormulaBlocks, { value: formulaDraft(parseFormula(expression)), onChange() {}, sources, options }));

describe("horizontal blocks", () => {
  it("lays a formula out left to right with labelled groups instead of nested cards", () => {
    const html = render("1d20 + actor.geschick");
    expect(html).toContain('class="ff-block ff-block-dice"'); expect(html).toContain('aria-label="Rechenzeichen"');
    expect(html).toContain('class="ff-block ff-block-attribute"'); expect(html).toContain(">Geschick · Zahl<");
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
  it("builds a compilable formula for every block kind", () => {
    for (const kind of blockKinds(sources, options)) expect(() => compileFormula(blockFor(kind.id, sources))).not.toThrow();
  });
  it("supports the menu's wrap-left, wrap-right, art-wechseln, and remove-argument edits as compilable formulas", () => {
    const attribute = blockFor("attribute", sources);
    // "Links anhängen": onChange({ kind: "binary", op: "+", left: literalDraft(), right: value })
    expect(formulaSource(compileFormula({ kind: "binary", op: "+", left: literalDraft(), right: attribute }))).toBe("0 + actor.geschick");
    // "Rechts anhängen": onChange({ kind: "binary", op: "+", left: value, right: literalDraft() })
    expect(formulaSource(compileFormula({ kind: "binary", op: "+", left: attribute, right: literalDraft() }))).toBe("actor.geschick + 0");
    // "Entfernen" on one arg of a three-argument min(...): onChange({ ...value, args: value.args.filter((_, n) => n !== i) })
    const three = { kind: "call" as const, name: "min" as const, args: [literalDraft(), literalDraft(), literalDraft()] };
    const withoutMiddle = { ...three, args: three.args.filter((_, n) => n !== 1) };
    expect(formulaSource(compileFormula(withoutMiddle))).toBe("min(0, 0)");
    // "Art wechseln" replaces a nested node with blockFor(kind, sources); the surrounding tree must still compile.
    const nested = { kind: "if" as const, condition: blockFor("compare", sources), then: attribute, else: literalDraft() };
    const changed = { ...nested, condition: blockFor("boolean", sources) };
    expect(() => compileFormula(changed)).not.toThrow();
    expect(formulaSource(compileFormula(changed))).toBe("if(false, actor.geschick, 0)");
  });
});
