// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
/**
 * Die kleinen Bausteine hinter den Reitern „Fähigkeiten" und „Zustände" der Regelschmiede. Was gültig
 * ist, entscheidet die Paketprüfung; hier steht nur, was angeboten und neu angelegt wird.
 */
import { RULE_LIMITS, type RuleAbility, type RuleCondition, type RuleModifier } from "@chronicle/rules";
import { t } from "../i18n";
import { freeId, newField, uniqueId, type DraftAction, type DraftField, type RuleDraft } from "./rule-forge-model";
import { allNodeIds, sheetTree, uniqueNodeId, withSheetTree } from "./rule-sheet-model";

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

/** Auswahlwert „Neues Attribut anlegen“: statt ein vorhandenes Textattribut zu belegen, entsteht ein eigenes. */
export const NEUES_ATTRIBUT = "";
const SPEICHER_LAENGE = "4000";

/**
 * Fähigkeiten und Zustände einschalten. Gelernte Fähigkeiten und aktive Zustände liegen je in einem
 * Textattribut; ohne Wahl legt die Schmiede zwei eigene an, statt ein vorhandenes Feld zu belegen.
 * Die neuen Speicherattribute kommen nicht als Textfeld auf den Bogen: der Bogen zeigt dafür Listen.
 */
export function enableAbilities(draft: RuleDraft, gelernt: string = NEUES_ATTRIBUT, aktiv: string = NEUES_ATTRIBUT): RuleDraft {
  const root = draft.presentation ? sheetTree(draft) : null, fields = [...draft.fields];
  const create = (base: string, label: string): string => {
    const id = freeId(base, fields.map(field => field.id));
    fields.push({ ...newField(id, "string"), label, maxLength: SPEICHER_LAENGE, defaultValue: "" });
    return id;
  };
  const abilityField = gelernt || create("faehigkeiten", t("Gelernte Fähigkeiten"));
  const conditionField = aktiv || create("zustaende", t("Aktive Zustände"));
  const next: RuleDraft = { ...draft, schemaVersion: 2, fields, abilityRules: { ...draft.abilityRules, abilityField, conditionField }, abilities: draft.abilities ?? [], conditions: draft.conditions ?? [] };
  return root ? withSheetTree(next, root) : next;
}

/** Legt die Liste der Fähigkeiten oder Zustände auf den Bogen, falls der Bogen einen Aufbau hat und sie dort noch fehlt. */
function mitBogenplatz(draft: RuleDraft, kind: "abilities" | "conditions"): RuleDraft {
  if (!draft.presentation) return draft;
  const root = sheetTree(draft), ids = allNodeIds(root);
  const vorhanden = (nodes: typeof root): boolean => nodes.some(node => node.kind === kind || (node.kind === "group" && vorhanden(node.children)));
  if (vorhanden(root)) return draft;
  return withSheetTree(draft, [...root, { kind, id: uniqueNodeId(kind === "abilities" ? "faehigkeiten" : "zustaende", ids) }]);
}
/** Wirkungen greifen nur in Aktionen, die dafür eine Zahl annehmen; ohne solche Aktion bleibt das Beispiel ohne Wirkung. */
function wirkung(draft: RuleDraft, value: string): Pick<RuleAbility, "modifiers"> {
  const actions = zielAktionen(draft, "ergebnis").map(action => action.id).slice(0, RULE_LIMITS.modifierPatterns);
  return actions.length ? { modifiers: [{ actions, target: "ergebnis", value }] } : {};
}

/** „Mit Beispiel beginnen“ bei den Fähigkeiten: Kraftschlag. Schaltet Fähigkeiten dafür ein, wenn nötig. */
export function withExampleAbility(draft: RuleDraft): RuleDraft {
  const base = draft.schemaVersion === 2 && draft.abilityRules ? draft : enableAbilities(draft);
  const abilities = base.abilities ?? [];
  const ability: RuleAbility = { id: freeId("kraftschlag", abilities.map(row => row.id)), name: t("Kraftschlag"), group: t("Kampf"), rank: 1, kind: "dauerhaft", cost: 0, price: 3,
    text: t("Wer Kraftschlag gelernt hat, schlägt mit mehr Wucht zu: +2 auf das Ergebnis passender Würfe."), ...wirkung(base, "2") };
  return mitBogenplatz({ ...base, abilities: [...abilities, ability] }, "abilities");
}

/** „Mit Beispiel beginnen“ bei den Zuständen: Erschöpft, −2 auf alle Proben. */
export function withExampleCondition(draft: RuleDraft): RuleDraft {
  const base = draft.schemaVersion !== 2 || !draft.abilityRules ? enableAbilities(draft)
    : draft.abilityRules.conditionField ? draft : enableAbilities(draft, draft.abilityRules.abilityField, NEUES_ATTRIBUT);
  const conditions = base.conditions ?? [];
  const condition: RuleCondition = { id: freeId("erschoepft", conditions.map(row => row.id)), name: t("Erschöpft"),
    text: t("Die Figur ist müde: −2 auf alle Proben."), ...wirkung(base, "-2") };
  return mitBogenplatz({ ...base, conditions: [...conditions, condition] }, "conditions");
}
