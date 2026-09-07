import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DEMO_RULE_PACKAGE, HOW_TO_BE_A_HERO_PACKAGE, HTBAH_EXAMPLE_CHARACTERS, evaluateSupportedAction, parseSupportedRulePackage, stableJson, type RulePackageV2 } from "@chronicle/rules";
import { compilePackage, forkPackage, packageDraft, packageTestResults, validateDraft } from "../src/features/rule-forge-model";
import { RuleComputedFields } from "../src/features/RuleComputedFields";
import { RollCard } from "../src/features/RollCard";

describe("lossless supported rule workshop", () => {
  it.each([DEMO_RULE_PACKAGE, HOW_TO_BE_A_HERO_PACKAGE])("retains every package byte through opening and exporting $name", pkg => {
    expect(stableJson(compilePackage(packageDraft(pkg)))).toBe(stableJson(pkg));
  });
  it("retains ordered outcomes, source notes, empty declarations and classification tests in forks", () => {
    const pkg = parseSupportedRulePackage({ ...HOW_TO_BE_A_HERO_PACKAGE, computed: [], constraints: [], actions: HOW_TO_BE_A_HERO_PACKAGE.actions.map(action => ({ ...action, preconditions: [] })) });
    const draft = forkPackage(pkg, [pkg]), compiled = compilePackage(draft) as RulePackageV2;
    // Die Abzweigung erhöht die Patch-Stelle der Vorlage. Aus der Vorlage abgeleitet, nicht
    // festgeschrieben: sonst prüft der Fall die ausgelieferte Version statt die Abzweigung.
    const [major, minor, patch] = pkg.version.split(".").map(Number) as [number, number, number];
    expect(compiled.version).toBe(`${major}.${minor}.${patch + 1}`);
    expect(compiled.attribution).toEqual(pkg.schemaVersion === 2 ? pkg.attribution : null);
    expect(compiled.actions).toEqual(pkg.actions); expect(compiled.computed).toEqual([]); expect(compiled.constraints).toEqual([]);
    // Vitalwerte überleben die Abzweigung unverändert — eine Kopie ohne sie hätte keine Niederlage.
    expect(compiled.vitals).toEqual(pkg.schemaVersion === 2 ? pkg.vitals : undefined);
    expect(compiled.selfTests).toEqual(pkg.selfTests);
  });
  it("blocks conflicting fixed thresholds and classification without discarding either draft value", () => {
    const draft = packageDraft(HOW_TO_BE_A_HERO_PACKAGE); draft.actions[0]!.thresholdEnabled = true;
    expect(validateDraft(draft).valid).toBe(false); expect(draft.actions[0]!.outcome).toBeDefined();
  });
  it("checks classification expectations instead of treating an equal die total as a passed test", () => {
    const draft = packageDraft(HOW_TO_BE_A_HERO_PACKAGE), first = draft.selfTests[0]!;
    expect(packageTestResults(compilePackage(draft)).every(result => result.passed)).toBe(true);
    first.expectedSuccess = !first.expectedSuccess;
    expect(packageTestResults(compilePackage(draft))[0]!.passed).toBe(false);
  });
  it("shows derived values and classified results without threshold-up wording", () => {
    const pkg = HOW_TO_BE_A_HERO_PACKAGE, fields = HTBAH_EXAMPLE_CHARACTERS[0]!.fields;
    const computed = renderToStaticMarkup(createElement(RuleComputedFields, { pkg, fields }));
    expect(computed).toContain("Begabung · Handeln"); expect(computed).toContain("vollständig verteilt");
    const receipt = evaluateSupportedAction(pkg, "aptitude_handeln", { seed: "00000001000000020000000300000004", actor: fields, input: {}, knowledge: { actorId: "actor", passages: [] } });
    const card = { id: "roll", actorId: "actor", status: "bestaetigt" as const, receipt, receiptHash: "a".repeat(64), preparedAt: 1, fictionDate: "Tag 1", vollmachtId: null, confirmation: { rollId: "roll", success: false, mint: null, confirmedAt: 1, seal: "b".repeat(64) } };
    const output = renderToStaticMarkup(createElement(RollCard, { card, campaignId: "campaign", actorName: "Mara", onChanged: () => {} }));
    expect(output).toContain("Probe misslungen"); expect(output).not.toContain("Schwelle nicht erreicht");
  });
});
