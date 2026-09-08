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
    // "Bausteine" is the current view-switch label and legitimately contains "Baustein"; the
    // lookahead excludes it while still catching the old singular builder vocabulary.
    expect(render("1")).not.toMatch(/Baustein(?!e)|Linker Wert|Rechter Wert|Ausdruck/);
  });
});
