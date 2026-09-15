// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { describe, expect, it } from "vitest";
import { CHRONICLE_HEROES_PACKAGE, D20_REFERENCE_PACKAGE, DEMO_RULE_PACKAGE, THREE_D20_REFERENCE_PACKAGE, buildRuleRuntime, describeRuleCapabilities } from "../src/index.ts";
import { HOW_TO_BE_A_HERO_PACKAGE } from "../src/examples.ts";

describe("rule capabilities are derived from the package, never declared", () => {
  it("tells a flat v1 demo package from the reference families", () => {
    const demo = describeRuleCapabilities(DEMO_RULE_PACKAGE);
    expect(demo.presentationTree).toBe(false);
    expect(demo.abilities).toBe(0);
    expect(demo.categoryDepth).toBeGreaterThanOrEqual(1);
    expect(demo.actions).toBe(DEMO_RULE_PACKAGE.actions.length);
  });
  it("recognises multi-roll checks, graded outcomes and dice families", () => {
    const three = describeRuleCapabilities(THREE_D20_REFERENCE_PACKAGE);
    expect(three.multiRollChecks).toBe(true);
    expect(three.gradedOutcomes).toBe(true);
    expect(three.diceFamilies).toEqual(["W20"]);
    expect(three.categoryDepth).toBe(2);
    const d20 = describeRuleCapabilities(D20_REFERENCE_PACKAGE);
    expect(d20.multiRollChecks).toBe(false);
    expect(d20.gradedOutcomes).toBe(true);
    expect(d20.collections).toBe(2);
    expect(d20.vitals).toBe(1);
    expect(d20.presentationTree).toBe(true);
  });
  it("counts the ChronicleHeroes catalogue and HTBAH nesting", () => {
    const chronicle = describeRuleCapabilities(CHRONICLE_HEROES_PACKAGE);
    expect(chronicle.abilities).toBe(200);
    expect(chronicle.conditions).toBe(12);
    expect(chronicle.diceFamilies).toContain("W100");
    expect(describeRuleCapabilities(HOW_TO_BE_A_HERO_PACKAGE).categoryDepth).toBeGreaterThanOrEqual(2);
  });
  it("rides along in the runtime manifest without changing the contract", () => {
    const runtime = buildRuleRuntime(THREE_D20_REFERENCE_PACKAGE);
    expect(runtime.capabilities).toEqual(describeRuleCapabilities(THREE_D20_REFERENCE_PACKAGE));
    expect(runtime.contractVersion).toBe(2);
  });
});
