// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { describe, expect, it } from "vitest";
import { D20_REFERENCE_PACKAGE } from "@chronicle/rules";
import { compilePackage, ensurePresentationV3, packageDraft } from "../src/features/rule-forge-model";

describe("RuleForge presentation v3", () => {
  it("round-trips the reference presentation and collections without editor identities", () => {
    const draft = packageDraft(D20_REFERENCE_PACKAGE);
    expect(draft.presentation?.schemaVersion).toBe(3);
    expect(draft.collections?.map(row => row.id)).toEqual(["weapons", "spells"]);
    const compiled = compilePackage(draft);
    expect(compiled).toEqual(D20_REFERENCE_PACKAGE);
    expect(JSON.stringify(compiled)).not.toContain("forge-");
  });

  it("upgrades a legacy section tree to presentation v3 without changing field identities", () => {
    const draft = packageDraft({ ...D20_REFERENCE_PACKAGE, presentation: undefined, collections: undefined } as any);
    const upgraded = ensurePresentationV3(draft);
    expect(upgraded.schemaVersion).toBe(2);
    expect(upgraded.presentation?.schemaVersion).toBe(3);
    const refs: string[] = [];
    const visit = (nodes: readonly any[]) => nodes.forEach(node => { if (node.kind === "field") refs.push(node.ref); if (node.kind === "group") visit(node.children); });
    visit(upgraded.presentation!.root);
    expect(new Set(refs)).toEqual(new Set(upgraded.fields.map(field => field.id)));
  });
});
