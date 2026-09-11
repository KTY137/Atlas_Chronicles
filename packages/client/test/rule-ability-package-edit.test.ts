// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { describe, expect, it } from "vitest";
import { CHRONICLE_HEROES_PACKAGE, parseSupportedRulePackage, stableJson } from "@chronicle/rules";
import { compilePackage, packageDraft } from "../src/features/rule-forge-model";
import { renameRuleEntry } from "../src/features/rule-ability-references";

describe("Kennungswechsel im echten ChronicleHeroes-Entwurf", () => {
  it.each(["ability", "condition"] as const)("behält nach einem %s-Wechsel ein prüfbares Paket ohne Änderung des Originals", kind => {
    const before = stableJson(CHRONICLE_HEROES_PACKAGE), draft = packageDraft(CHRONICLE_HEROES_PACKAGE);
    const old = kind === "ability" ? draft.abilities![0]!.id : draft.conditions![0]!.id;
    const result = renameRuleEntry(draft, kind, old, "umbenannter_eintrag");
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.reason);
    const parsed = parseSupportedRulePackage(compilePackage(result.draft));
    expect(parsed.schemaVersion).toBe(2);
    if (parsed.schemaVersion !== 2) throw new Error("Expected schema version 2");
    expect((kind === "ability" ? parsed.abilities : parsed.conditions)?.some(entry => entry.id === "umbenannter_eintrag")).toBe(true);
    expect(stableJson(CHRONICLE_HEROES_PACKAGE)).toBe(before);
    expect(stableJson(parsed.actions)).toBe(stableJson(CHRONICLE_HEROES_PACKAGE.actions));
  });
});
