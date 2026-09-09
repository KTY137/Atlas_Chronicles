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
