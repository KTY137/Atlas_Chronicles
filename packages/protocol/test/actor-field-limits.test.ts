// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { describe, expect, it } from "vitest";
import { Value } from "@sinclair/typebox/value";
import { RULE_LIMITS } from "@chronicle/rules";
import { ActorTemplateCreate, ActorTemplateRevise } from "../src/actors";
import { FigurantragAntragBody } from "../src/figurantrag";

const fields = (n: number) => Object.fromEntries(Array.from({ length: n }, (_, i) => [`skill_${i}`, i]));
const definition = (values: Record<string, unknown>, v2 = false) => ({ schemaVersion: v2 ? 2 : 1,
  name: "Large ruleset template", kind: "npc", loreEntryId: null,
  package: { id: "de.test.rules", version: "1.0.0" }, fields: values, ...(v2 ? { beute: [] } : {}),
});
function accepted(values: Record<string, unknown>) {
  return [
    ...[false, true].flatMap(v2 => [
      Value.Check(ActorTemplateCreate, { commandId: "create", definition: definition(values, v2) }),
      Value.Check(ActorTemplateRevise, { commandId: "revise", expectedVersion: 1, reason: "Updated values", definition: definition(values, v2) }),
    ]),
    Value.Check(FigurantragAntragBody, { commandId: "apply", templateId: "template", name: "Applicant", anfangswerte: values }),
  ];
}

describe("actor field transport matches the rule engine", () => {
  it.each([0, 64, 65, 107, RULE_LIMITS.fields])("supports %i fields in templates, revisions and applications", n => {
    expect(accepted(fields(n))).toEqual([true, true, true, true, true]);
  });
  it("retains the finite field limit", () => {
    expect(RULE_LIMITS.fields).toBe(512);
    expect(accepted(fields(RULE_LIMITS.fields + 1))).toEqual([false, false, false, false, false]);
  });
  it.each(["BadKey", "bad.key", "0invalid", "a".repeat(97)])("rejects an invalid field key: %s", key => {
    expect(accepted({ [key]: 0 })).toEqual([false, false, false, false, false]);
  });
  it.each([null, [], {}, "x".repeat(4097), 1e12 + 1])("retains scalar validation for %j", value => {
    expect(accepted({ skill: value })).toEqual([false, false, false, false, false]);
  });
});
