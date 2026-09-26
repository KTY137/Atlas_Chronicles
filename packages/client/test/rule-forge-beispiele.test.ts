// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { describe, expect, it } from "vitest";
import { evaluateSupportedAction, defaultSupportedActorFields } from "@chronicle/rules";
import { exampleAttribute, newPackage, validateDraft, withExampleAction, type RuleDraft } from "../src/features/rule-forge-model";
import { addExampleVital } from "../src/features/rule-vital-model";
import { enableAbilities, withExampleAbility, withExampleCondition } from "../src/features/rule-ability-model";
import { isOnSheet, sheetTree, syncSheetWithFields } from "../src/features/rule-sheet-model";
import { withExampleCollection } from "../src/features/RuleCollectionEditor";
import { withExampleComputed } from "../src/features/RuleDeclarativeEditor";
import { defaultAnswers, wizardDraft } from "../src/features/rule-wizard-model";

// Spec E12: Jede leere Liste bietet „Mit Beispiel beginnen“; das Beispiel ist gültig und danach frei bearbeitbar.
const blank = () => newPackage("Kaya");
const wizard = () => wizardDraft({ ...defaultAnswers(), name: "Nordlicht" }, "Kaya", []);
function valid(draft: RuleDraft) {
  const checked = validateDraft(draft);
  if (!checked.valid) throw new Error(checked.error);
  return checked.value;
}
const kinds = (draft: RuleDraft) => { const out: string[] = []; const walk = (nodes: ReturnType<typeof sheetTree>) => nodes.forEach(node => { out.push(node.kind); if (node.kind === "group") walk(node.children); }); walk(sheetTree(draft)); return out; };

describe("Mit Beispiel beginnen", () => {
  for (const [name, start] of [["leeres Paket", blank], ["Assistent", wizard]] as const) {
    it(`legt Stärke als ganze Zahl von 1 bis 20 an (${name})`, () => {
      const draft = start(), field = exampleAttribute(draft.fields.map(f => f.id));
      expect(field).toMatchObject({ label: "Stärke", type: "integer", minimum: "1", maximum: "20", defaultValue: "10" });
      const next = syncSheetWithFields({ ...draft, fields: [...draft.fields, field] }, draft.fields);
      expect(valid(next).fields[field.id]).toBeDefined();
    });
    it(`legt die Probe auf Stärke samt Stärke an (${name})`, () => {
      const draft = start(), next = syncSheetWithFields(withExampleAction(draft), draft.fields), pkg = valid(next);
      const action = pkg.actions.at(-1)!;
      expect(action.name).toBe("Probe auf Stärke");
      expect(action.expression).toContain("actor.staerke");
      expect(action.threshold).toBe(15);
      const result = evaluateSupportedAction(pkg, action.id, { seed: "00000001000000020000000300000004", actor: defaultSupportedActorFields(pkg), input: {}, knowledge: { actorId: "probe", passages: [] } });
      expect(Number.isFinite(result.total)).toBe(true);
      expect(isOnSheet(next, "field", "staerke")).toBe(true);
    });
    it(`legt den Balken Leben an (${name})`, () => {
      const result = addExampleVital(start()), pkg = valid(result.draft);
      expect(pkg.schemaVersion === 2 ? pkg.vitals?.find(v => v.id === result.id) : undefined).toMatchObject({ label: "Leben", max: "10" });
    });
    it(`legt Kraftschlag an und schaltet Fähigkeiten dafür ein (${name})`, () => {
      const next = withExampleAbility(start()), pkg = valid(next);
      expect(pkg.schemaVersion === 2 && pkg.abilities?.map(a => a.name)).toEqual(["Kraftschlag"]);
      expect(kinds(next)).toContain("abilities");
      // Die Speicherattribute stehen nicht als Textfeld auf dem Bogen.
      expect(isOnSheet(next, "field", next.abilityRules!.abilityField)).toBe(false);
    });
    it(`legt den Zustand Erschöpft an (${name})`, () => {
      const next = withExampleCondition(start()), pkg = valid(next);
      expect(pkg.schemaVersion === 2 && pkg.conditions?.map(c => c.name)).toEqual(["Erschöpft"]);
      expect(kinds(next)).toContain("conditions");
    });
    it(`legt die Liste Ausrüstung mit Name und Gewicht an (${name})`, () => {
      const next = withExampleCollection(start()), pkg = valid(next);
      const list = pkg.schemaVersion === 2 ? pkg.collections?.at(-1) : undefined;
      expect(list?.label).toBe("Ausrüstung");
      expect(Object.values(list!.itemFields).map(f => f.label)).toEqual(["Name", "Gewicht"]);
      expect(isOnSheet(next, "collection", list!.id)).toBe(true);
    });
    it(`legt einen berechneten Wert an (${name})`, () => {
      const next = withExampleComputed(start()), pkg = valid(next);
      expect(pkg.schemaVersion === 2 ? pkg.computed?.at(-1)?.label : undefined).toBe("Verteidigung");
    });
  }

  it("wirkt Erschöpft auf Aktionen, die eine Wirkung annehmen", () => {
    const draft = withExampleAction(blank());
    const action = draft.actions.at(-1)!;
    const accepting = { ...draft, actions: draft.actions.map(a => a.localId === action.localId ? { ...a, inputs: [{ ...exampleAttribute([]), id: "mod_ergebnis", label: "Wirkung", minimum: "-20", maximum: "20", defaultValue: "0" }] } : a) };
    const next = withExampleCondition(accepting);
    expect(next.conditions?.[0]?.modifiers).toEqual([{ actions: [action.id], target: "ergebnis", value: "-2" }]);
    valid(next);
  });

  it("schaltet Fähigkeiten mit zwei neuen Attributen ein, statt ein vorhandenes zu belegen", () => {
    const draft = blank(), next = enableAbilities(draft);
    expect(next.fields.length).toBe(draft.fields.length + 2);
    expect(next.abilityRules).toMatchObject({ abilityField: "faehigkeiten", conditionField: "zustaende" });
    valid(next);
  });
});
