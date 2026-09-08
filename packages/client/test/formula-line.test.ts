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
