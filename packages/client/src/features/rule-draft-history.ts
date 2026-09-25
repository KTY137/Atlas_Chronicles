// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { t } from "../i18n";
import type { RuleDraft } from "./rule-forge-model";

/**
 * Rückgängig und Wiederholen über den ganzen Regelentwurf (Level 2, L2-E3). Rein: der Verlauf ist
 * ein Wert, die Werkstatt hält ihn im Zustand. Schnelles Tippen im selben Bereich wird zu einem
 * Schritt zusammengefasst, sonst bräuchte jeder Buchstabe ein eigenes Rückgängig.
 */
export type DraftArea = "package" | "fields" | "sheet" | "actions" | "computed" | "constraints" | "vitals" | "collections" | "abilities" | "conditions" | "tests" | "migrations" | "other";
export interface DraftStep { readonly draft: RuleDraft; readonly area: DraftArea }
export interface DraftHistory { readonly past: readonly DraftStep[]; readonly future: readonly DraftStep[]; readonly lastArea: DraftArea | null; readonly lastAt: number }
export const HISTORY_LIMIT = 100;
export const COALESCE_MS = 800;
export const emptyHistory = (): DraftHistory => ({ past: [], future: [], lastArea: null, lastAt: 0 });

const AREAS: readonly [DraftArea, readonly (keyof RuleDraft)[]][] = [
  ["package", ["name", "id", "version", "license", "authors", "attribution", "schemaVersion"]],
  ["fields", ["fields"]], ["sheet", ["presentation", "sections", "presentationAuto"]], ["actions", ["actions"]],
  ["computed", ["computed"]], ["constraints", ["constraints"]], ["vitals", ["vitals"]], ["collections", ["collections"]],
  ["abilities", ["abilities", "abilityRules"]], ["conditions", ["conditions"]], ["tests", ["selfTests", "includeSelfTests"]], ["migrations", ["migrations"]],
];
/** Welcher Bereich sich geändert hat — der erste in Werkstatt-Reihenfolge; Attribute ziehen oft den Bogen mit. */
export function changedArea(before: RuleDraft, after: RuleDraft): DraftArea {
  for (const [area, keys] of AREAS) if (keys.some(key => before[key] !== after[key])) return area;
  return "other";
}
export function areaLabel(area: DraftArea): string {
  switch (area) {
    case "package": return t("Paketangaben"); case "fields": return t("Attribute"); case "sheet": return t("Bogen"); case "actions": return t("Aktionen");
    case "computed": return t("Abgeleitete Werte"); case "constraints": return t("Bogenregeln"); case "vitals": return t("Balken"); case "collections": return t("Listen");
    case "abilities": return t("Fähigkeiten"); case "conditions": return t("Zustände"); case "tests": return t("Pakettests"); case "migrations": return t("Migration");
    case "other": return t("Entwurf");
  }
}

/** Eine Änderung festhalten: `before` wird rückgängig machbar, die Zukunft verfällt. */
export function record(history: DraftHistory, before: RuleDraft, after: RuleDraft, now: number): DraftHistory {
  if (before === after) return history;
  const area = changedArea(before, after);
  if (history.lastArea === area && now - history.lastAt < COALESCE_MS && history.past.length) return { ...history, future: [], lastAt: now };
  return { past: [...history.past, { draft: before, area }].slice(-HISTORY_LIMIT), future: [], lastArea: area, lastAt: now };
}
export function undo(history: DraftHistory, current: RuleDraft): { history: DraftHistory; draft: RuleDraft } | null {
  const step = history.past.at(-1); if (!step) return null;
  return { draft: step.draft, history: { past: history.past.slice(0, -1), future: [...history.future, { draft: current, area: step.area }], lastArea: null, lastAt: 0 } };
}
export function redo(history: DraftHistory, current: RuleDraft): { history: DraftHistory; draft: RuleDraft } | null {
  const step = history.future.at(-1); if (!step) return null;
  return { draft: step.draft, history: { past: [...history.past, { draft: current, area: step.area }], future: history.future.slice(0, -1), lastArea: null, lastAt: 0 } };
}
