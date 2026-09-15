// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { THREE_D20_REFERENCE_PACKAGE, describeRuleCapabilities } from "@chronicle/rules";
import { RuleCapabilityCard, RuleForgePath, forgePathSteps, type ForgePathState } from "../src/features/RuleForgePath";

const base: ForgePathState = { editable: false, valid: true, fields: 3, actions: 1, tests: 0, testsPass: true, installed: true, reviewed: false, active: true };
const states = (s: ForgePathState) => forgePathSteps(s).map(step => step.state);

describe("the forge path", () => {
  it("points at the foundation while an installed package is only viewed", () => {
    expect(states(base)).toEqual(["current", "todo", "todo", "done", "done"]);
  });
  it("walks from an invalid draft to a tested, installed and active version", () => {
    expect(states({ ...base, editable: true, valid: false, installed: false, active: false })).toEqual(["done", "current", "todo", "todo", "todo"]);
    expect(states({ ...base, editable: true, installed: false, active: false })).toEqual(["done", "done", "current", "todo", "todo"]);
    expect(states({ ...base, editable: true, tests: 2, installed: false, active: false })).toEqual(["done", "done", "done", "current", "todo"]);
    expect(states({ ...base, editable: true, tests: 2, active: false })).toEqual(["done", "done", "done", "done", "current"]);
    expect(states({ ...base, editable: true, tests: 2 })).toEqual(["done", "done", "done", "done", "done"]);
  });
  it("renders five numbered stations with a jump on every open one", () => {
    const html = renderToStaticMarkup(createElement(RuleForgePath, { state: base, onJump() {} }));
    expect(html).toContain('aria-label="Der Weg zum eigenen Regelwerk"');
    expect(html).toContain('aria-current="step"');
    expect(html.match(/<li /g)?.length).toBe(5);
    expect(html).toContain("Zu den Vorlagen");
    expect(html).not.toContain("Zur Übernahme");
  });
  it("describes the package in plain words", () => {
    const html = renderToStaticMarkup(createElement(RuleCapabilityCard, { capabilities: describeRuleCapabilities(THREE_D20_REFERENCE_PACKAGE) }));
    expect(html).toContain("Was dieses Regelwerk kann");
    expect(html).toContain("<dd>W20</dd>");
    expect(html).toContain("Proben mit mehreren Würfen</dt><dd>ja</dd>");
    expect(html).toContain("Abgestufte Ergebnisse</dt><dd>ja</dd>");
  });
});
