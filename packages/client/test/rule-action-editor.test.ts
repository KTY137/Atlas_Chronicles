// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { HOW_TO_BE_A_HERO_PACKAGE } from "@chronicle/rules/examples";
import { RuleActionEditor } from "../src/features/RuleActionEditor";
import { newPackage, packageDraft } from "../src/features/rule-forge-model";

describe("actions as methods", () => {
  it("renders a list beside the card of the selected action with parameters and the formula field", () => {
    const draft = newPackage("Sera"), html = renderToStaticMarkup(createElement(RuleActionEditor, { draft, disabled: false, onChange() {} }));
    expect(html).toContain('aria-label="Aktionen"'); expect(html).toContain('aria-current="true"');
    expect(html).toContain(">Parameter<"); expect(html).toContain(">Ergebnis<"); expect(html).toContain(">Erfolg<");
    expect(html).toContain('value="' + draft.actions[0]!.name + '"');
    expect(html).not.toContain("Aktion bearbeiten"); expect(html).not.toContain("Eingaben der Aktion");
    // "Bausteine" is FormulaField's own pre-existing view-switcher label (unrelated to this
    // component's wording); only the old, more specific jargon phrase is checked for here.
    expect(html).not.toContain("unvollständige Bausteine");
  });
  it("adds a search box once the list is long", () => {
    const html = renderToStaticMarkup(createElement(RuleActionEditor, { draft: packageDraft(HOW_TO_BE_A_HERO_PACKAGE), disabled: false, onChange() {} }));
    expect(html).toContain('aria-label="Aktion suchen"');
  });
});
