// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { expect, it } from "vitest";
import { CHRONICLE_HEROES_PACKAGE } from "@chronicle/rules";
import { packageDraft } from "../src/features/rule-forge-model";
import { renameRuleEntry, ruleEntryReferences } from "../src/features/rule-ability-references";

function withoutInput() {
  const draft = packageDraft(CHRONICLE_HEROES_PACKAGE), ability = draft.abilities![0]!, field = draft.abilityRules!.abilityField;
  draft.selfTests = [{ name: "Ohne Eingaben", actionId: draft.actions[0]!.id, expectedTotal: 0, context: {
    seed: "00000000000000000000000000000001", actor: { [field]: ability.id }, input: {}, knowledge: { actorId: "fields", passages: [] },
  } }];
  // Omitted input is accepted by persisted package tests, even when a parsed context usually has {}.
  Reflect.deleteProperty(draft.selfTests[0]!.context, "input");
  return { draft, ability, field };
}
it("findet Verweise auch in einem Pakettest ohne Eingabeblock", () => {
  const { draft, ability } = withoutInput();
  expect(ruleEntryReferences(draft, "ability", ability.id)).toContainEqual({ kind: "test", name: "Ohne Eingaben" });
});
it("benennt die Figurenauswahl um, ohne einen fehlenden Eingabeblock hinzuzuerfinden", () => {
  const { draft, ability, field } = withoutInput();
  const result = renameRuleEntry(draft, "ability", ability.id, "umbenannt");
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.reason);
  expect(result.draft.selfTests[0]!.context.actor[field]).toBe("umbenannt");
  expect(Object.hasOwn(result.draft.selfTests[0]!.context, "input")).toBe(false);
  expect(draft.selfTests[0]!.context.actor[field]).toBe(ability.id);
});
