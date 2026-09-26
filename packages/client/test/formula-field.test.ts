// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FormulaField, FormulaExampleContext, displayAnalysis, isExternalValue } from "../src/features/FormulaField";
import { newField } from "../src/features/rule-forge-model";
import { analyzeFormula } from "../src/features/formula-sugar";

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

// The two guards below (external value replaces the typed text; the component's own emissions do
// not) live inside a `useEffect` that never runs under `renderToStaticMarkup` — SSR has no commit
// phase, so effects are pure no-ops there, and this suite has no jsdom/interactive DOM to re-render
// the component with new props and let React actually run them. That path genuinely needs a DOM;
// rather than fake it, the exact predicate the effect uses is extracted and tested directly here.
describe("external-value guard (isExternalValue)", () => {
  it("does not treat an echo of our own last emission as an external value", () => {
    expect(isExternalValue("1d20 + actor.geschick", "1d20 + actor.geschick")).toBe(false);
  });
  it("treats a different incoming value (opening a package, undo) as external", () => {
    expect(isExternalValue("2d6", "1d20")).toBe(true);
  });
});

describe("incomplete-block display (displayAnalysis)", () => {
  const sourcesLocal = { actor: [{ id: "geschick", label: "Geschick", type: "number" as const }], input: [] };
  it("passes a valid analysis through unchanged while no block is incomplete", () => {
    const analysis = analyzeFormula("1d20 + actor.geschick", sourcesLocal, { allowDice: true, allowKnowledge: false });
    expect(displayAnalysis(analysis, false)).toBe(analysis);
  });
  it("overrides an otherwise-valid analysis with the incomplete-block error, keeping text, canonical and spans", () => {
    const analysis = analyzeFormula("1d20 + actor.geschick", sourcesLocal, { allowDice: true, allowKnowledge: false });
    const shown = displayAnalysis(analysis, true);
    expect(shown.ok).toBe(false);
    expect(shown.error?.message).toBe("Ergänze den leeren Wert in den Bauteilen; bis dahin ist die Formel unvollständig.");
    expect(shown.text).toBe(analysis.text); expect(shown.canonical).toBe(analysis.canonical); expect(shown.spans).toBe(analysis.spans);
  });
});

describe("the formula input is named after its field", () => {
  it("joins the visible field title and the line label", () => {
    const html = render("1d20 + actor.geschick", { id: "ergebnis" });
    expect(html).toContain('id="ergebnis-title"');
    expect(html).toContain('aria-labelledby="ergebnis-title ergebnis-label"');
    expect(html).toContain('id="ergebnis-label"');
    // Die Ansage des Beispiels läuft über eine eigene, ruhige Region statt über die sichtbare Zeile.
    expect(html).not.toContain('aria-live="polite"');
    expect(html).toContain('role="status"');
  });
});
