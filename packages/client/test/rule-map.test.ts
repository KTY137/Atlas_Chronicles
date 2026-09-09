// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { HOW_TO_BE_A_HERO_PACKAGE } from "@chronicle/rules";
import { RuleMap, type RuleMapView } from "../src/features/RuleMap";
import { newField, newPackage, packageDraft, type RuleDraft } from "../src/features/rule-forge-model";

const htbah = packageDraft(HOW_TO_BE_A_HERO_PACKAGE);
const render = (draft: RuleDraft, initialView?: RuleMapView, initialSelected?: string, disabled = false) =>
  renderToStaticMarkup(createElement(RuleMap, { draft, onChange() {}, onOpen() {}, disabled, initialView, initialSelected }));

describe("rule map", () => {
  it("shows the three modes and, by default, the character as one object card", () => {
    const html = render(htbah);
    for (const view of ["Übersicht", "Karte", "Knotennetz"]) expect(html).toContain(`>${view}<`);
    expect(html).toContain("Schaden");
    expect(html).toContain("?dice_count: Zahl, ?bonus: Zahl, ?critical: Ja/Nein");
    expect(html).toContain("Figur und Absprachen");
    expect(html).toContain("Lebenspunkte");
    expect(html).toContain('aria-label="Knoten suchen"');
  });
  it("draws the map in four labelled columns with one button per node", () => {
    const html = render(htbah, "map");
    for (const column of ["Attribute", "Abgeleitet", "Regeln und Balken", "Aktionen"]) expect(html).toContain(`>${column}<`);
    expect(html).toContain('data-node-id="action:damage"');
    expect(html).toContain('data-node-id="attribute:hp"');
    expect(html).toContain("<svg");
  });
  it("embeds every readable formula as a small node net in the network mode", () => {
    const html = render(htbah, "network");
    expect(html.match(/Formel als Knotennetz/g)?.length ?? 0).toBeGreaterThan(htbah.actions.length);
    expect(html).not.toContain("Ergebnis: Zahl");
  });
  it("opens the chosen node for editing with its formula and its neighbours", () => {
    const html = render(htbah, "map", "action:initiative");
    expect(html).toContain("Bearbeiten: Initiative");
    expect(html).toContain('value="1d10 + round(');
    expect(html).toContain("Hängt zusammen mit");
    expect(html).toContain("Im Reiter Aktionen öffnen");
  });
  it("lists findings in plain words and points each at its node", () => {
    const draft = newPackage("Kaya"); draft.schemaVersion = 2;
    draft.fields = [...draft.fields, { ...newField("unbenutzt"), label: "Unbenutzt" }];
    draft.computed = [{ id: "weg", label: "Weg", expression: "actor.laufen" }];
    const html = render(draft);
    // weg → unknown attribute, unbenutzt and vigour → unused numbers.
    expect(html).toContain("3 Hinweise");
    expect(html).toContain("Verweist auf @laufen, das es in diesem Paket nicht gibt.");
    expect(html).toContain("Wird in keiner Formel benutzt.");
  });
  it("keeps navigation usable while the package is read-only", () => {
    const html = render(htbah, "map", "computed:points_spent", true);
    expect(html).toMatch(/<fieldset[^>]*\sdisabled/);
    expect(html).toContain('data-node-id="computed:points_spent"');
  });
});
