// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { describe, expect, it } from "vitest";
import { DEMO_RULE_PACKAGE } from "@chronicle/rules";
import { compilePackage, packageDraft } from "../src/features/rule-forge-model";

describe("RuleForge nested sheet layout", () => {
  it("round-trips a parent category without leaking editor-local identities", () => {
    const draft = packageDraft(DEMO_RULE_PACKAGE);
    const child = draft.sections[0]!;
    const meta = {
      localId: "test-meta-local",
      id: "werte",
      label: "Werte",
      fieldKeys: [],
      parentLocalId: null,
    };
    draft.sections = [meta, { ...child, parentLocalId: meta.localId }];

    const compiled = compilePackage(draft);
    expect(compiled.layout.sections).toEqual([
      { id: "werte", label: "Werte", fields: [] },
      { id: child.id, label: child.label, fields: ["name", "insight", "vigour"], parent: "werte" },
    ]);
    expect(JSON.stringify(compiled)).not.toContain("test-meta-local");

    const reopened = packageDraft(compiled);
    const reopenedMeta = reopened.sections.find(section => section.id === "werte")!;
    const reopenedChild = reopened.sections.find(section => section.id === child.id)!;
    expect(reopenedChild.parentLocalId).toBe(reopenedMeta.localId);
  });
});
