// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { describe, expect, it } from "vitest";
import { DEMO_RULE_PACKAGE, type AnyRulePackage } from "@chronicle/rules";
import { resolveActorTemplateRules, type ActorTemplateRulesDraft } from "../src/features/actor-template-rules";

const old = DEMO_RULE_PACKAGE;
const lite: AnyRulePackage = { ...old, id: "de.test.lite", version: "1.0.0", name: "Lite fixture",
  fields: { handeln: { type: "integer", label: "Handeln", default: 10, minimum: 0, maximum: 30 },
    f_nahkampf: { type: "integer", label: "Nahkampf", default: 0, minimum: 0, maximum: 30 } },
  layout: { sections: [{ id: "skills", label: "Skills", fields: ["handeln", "f_nahkampf"] }] },
};
const pin = (pkg: AnyRulePackage) => ({ id: pkg.id, version: pkg.version });
const rules = (pkg: AnyRulePackage) => ({ packages: [old, lite], pin: pin(pkg) });

describe("actor template rule ownership", () => {
  it("follows the active package in an untouched form, including A -> B -> A", () => {
    const a = resolveActorTemplateRules(rules(old), null);
    const b = resolveActorTemplateRules(rules(lite), null);
    expect(a.pkg).toBe(old);
    expect(b.pkg).toBe(lite);
    expect(b.fields).toEqual({ handeln: 10, f_nahkampf: 0 });
    expect(resolveActorTemplateRules(rules(old), null)).toEqual(a);
  });
  it("keeps intentionally edited values and their original pin across activation", () => {
    const draft: ActorTemplateRulesDraft = { pin: pin(lite), fields: { handeln: 15, f_nahkampf: 7 } };
    const result = resolveActorTemplateRules(rules(old), draft);
    expect(result.pkg).toBe(lite);
    expect(result.fields).toBe(draft.fields);
    expect(result.pin).toBe(draft.pin);
  });
  it("keeps a saved revision on its own package, not the campaign's latest package", () => {
    const original = resolveActorTemplateRules(rules(old), null);
    const result = resolveActorTemplateRules(rules(lite), { pin: original.pin, fields: original.fields });
    expect(result.pkg).toBe(old);
    expect(result.fields).toEqual(original.fields);
  });
  it("resolves by id AND version, including same-name packages", () => {
    const v2: AnyRulePackage = { ...lite, version: "2.0.0", fields: { ...lite.fields,
      f_fernkampf: { type: "integer", label: "Fernkampf", default: 3, minimum: 0, maximum: 30 } } };
    const result = resolveActorTemplateRules({ pin: pin(v2), packages: [lite, v2] }, null);
    expect(result.pkg).toBe(v2);
    expect(result.fields.f_fernkampf).toBe(3);
    const frozen = resolveActorTemplateRules({ pin: pin(v2), packages: [lite, v2] }, { pin: pin(lite), fields: { handeln: 11 } });
    expect(frozen.pkg).toBe(lite);
    expect(frozen.fields).not.toHaveProperty("f_fernkampf");
  });
  it("picks up a delayed package without freezing an empty defaults record", () => {
    const pending = resolveActorTemplateRules({ pin: pin(lite), packages: [] }, null);
    expect(pending.pkg).toBeUndefined();
    expect(pending.fields).toEqual({});
    expect(resolveActorTemplateRules(rules(lite), null).fields).toEqual({ handeln: 10, f_nahkampf: 0 });
  });
  it("does not silently substitute another package for an unavailable saved pin", () => {
    const draft = { pin: { id: "de.missing.rules", version: "1.0.0" }, fields: { original: 9 } };
    const result = resolveActorTemplateRules(rules(lite), draft);
    expect(result.pkg).toBeUndefined();
    expect(result.fields).toBe(draft.fields);
    expect(result.pin).toEqual(draft.pin);
  });
  it("fresh defaults do not mutate the package or leak into the next form", () => {
    const first = resolveActorTemplateRules(rules(lite), null);
    first.fields.f_nahkampf = 19;
    expect(resolveActorTemplateRules(rules(lite), null).fields.f_nahkampf).toBe(0);
    expect(lite.fields.f_nahkampf!.default).toBe(0);
  });
});
