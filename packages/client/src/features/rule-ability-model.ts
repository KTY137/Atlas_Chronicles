// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
/**
 * Die kleinen Bausteine hinter den Reitern „Fähigkeiten" und „Zustände" der Regelschmiede. Was gültig
 * ist, entscheidet die Paketprüfung; hier steht nur, was angeboten und neu angelegt wird.
 */
import type { RuleAbility, RuleCondition, RuleModifier } from "@chronicle/rules";
import { uniqueId, type DraftAction, type DraftField, type RuleDraft } from "./rule-forge-model";

export const newAbility = (ids: readonly string[]): RuleAbility =>
  ({ id: uniqueId("faehigkeit", ids), name: "Neue Fähigkeit", group: "Allgemein", rank: 1, kind: "dauerhaft", cost: 0, price: 3, text: "Was diese Fähigkeit bewirkt, in einem Satz." });
export const newCondition = (ids: readonly string[]): RuleCondition =>
  ({ id: uniqueId("zustand", ids), name: "Neuer Zustand", text: "Was dieser Zustand bewirkt, in einem Satz." });
export const newModifier = (actions: readonly DraftAction[]): RuleModifier =>
  ({ actions: actions[0] ? [actions[0].id] : [], target: "ziel", value: "10" });

/** Textattribute, die eine Kennungsliste tragen können — dieselbe Regel wie in der Paketprüfung. */
export const listenAttribute = (draft: RuleDraft): DraftField[] =>
  draft.fields.filter(feld => feld.type === "string" && !feld.hasEnum && Number(feld.maxLength) >= 64);

/** Aktionen, die eine Wirkung auf dieses Ziel annehmen: sie erklären `mod_ziel` bzw. `mod_ergebnis` als Zahl. */
export const zielAktionen = (draft: RuleDraft, target: RuleModifier["target"]): DraftAction[] =>
  draft.actions.filter(action => action.inputs.some(parameter => parameter.id === `mod_${target}` && (parameter.type === "integer" || parameter.type === "number")));
