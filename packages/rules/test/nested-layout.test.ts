// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { describe, expect, it } from "vitest";
import { buildRuleRuntime, DEMO_RULE_PACKAGE, parseRulePackage } from "../src/index.ts";
import { HOW_TO_BE_A_HERO_PACKAGE, HTBAH_GROUPS } from "../src/templates/how-to-be-a-hero.ts";

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

describe("nested character-sheet categories", () => {
  it("keeps flat v1 packages backwards compatible", () => {
    const parsed = parseRulePackage(clone(DEMO_RULE_PACKAGE));
    expect(parsed.layout.sections.every(section => section.parent === undefined)).toBe(true);
    expect(buildRuleRuntime(parsed).sections.every(section => section.parent === null)).toBe(true);
  });

  it("accepts arbitrary parent chains and projects them into the runtime", () => {
    const raw = clone(DEMO_RULE_PACKAGE) as unknown as Record<string, unknown>;
    raw.layout = { sections: [
      { id: "skills", label: "Fähigkeiten", fields: [] },
      { id: "acting", label: "Handeln", fields: ["vigour"], parent: "skills" },
      { id: "movement", label: "Bewegung", fields: ["insight"], parent: "acting" },
      { id: "identity", label: "Figur", fields: ["name"] },
    ] };
    const parsed = parseRulePackage(raw), runtime = buildRuleRuntime(parsed);
    expect(parsed.layout.sections.find(section => section.id === "acting")?.parent).toBe("skills");
    expect(runtime.sections.find(section => section.id === "movement")?.parent).toBe("acting");
    expect(runtime.sections.find(section => section.id === "skills")?.parent).toBeNull();
  });

  it("rejects missing parents, self-parenting and cycles", () => {
    const withSections = (sections: unknown[]) => ({ ...clone(DEMO_RULE_PACKAGE), layout: { sections } });
    expect(() => parseRulePackage(withSections([
      { id: "child", label: "Kind", fields: ["name"], parent: "missing" },
    ]))).toThrow(/unknown parent/);
    expect(() => parseRulePackage(withSections([
      { id: "self", label: "Selbst", fields: ["name"], parent: "self" },
    ]))).toThrow(/parent itself/);
    expect(() => parseRulePackage(withSections([
      { id: "a", label: "A", fields: ["name"], parent: "b" },
      { id: "b", label: "B", fields: ["insight"], parent: "a" },
    ]))).toThrow(/cycle/);
  });

  it("models HTBAH skills below a real Fähigkeiten meta-category", () => {
    const sections = HOW_TO_BE_A_HERO_PACKAGE.layout.sections;
    const skills = sections.find(section => section.id === "skills");
    expect(skills).toMatchObject({ label: "Fähigkeiten", fields: [] });
    for (const group of HTBAH_GROUPS) expect(sections.find(section => section.id === group)?.parent).toBe("skills");
    expect(sections.find(section => section.id === "geistesblitz")?.parent).toBe("resources");
  });
});
