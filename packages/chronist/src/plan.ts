// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { canonicalJson } from "@chronicle/core";
import type { ChronistCitation, ChronistKind, ChronistMode, ChronistSnapshot, ChronistUnitPlan } from "./types.ts";
import { CHRONIST_LIMITS, chronistHash, chronistValue, codeUnitCompare } from "./hash.ts";
import { assertChronist, parseChronistUnitPlan } from "./parse.ts";
import { chronistFactSourceIds, chronistSourceSentences, extractChronistDates, isChronistTextBoundary } from "./sources.ts";

export const CHRONIST_PROMPT_VERSION = "chronist-prompt-2" as const;
/**
 * Welche Art Vorschlag eine Aufgabe hervorbringt. Eine Aufgabe, eine Art — die Prüfung weist
 * jeden Vorschlag ab, der die Art seiner Aufgabe verfehlt, und der Prompt nennt nur diese eine.
 */
export const CHRONIST_MODUS_ART: Readonly<Record<ChronistMode, ChronistKind>> = Object.freeze({
  prosa: "ereignis", sitzung: "ereignis", abriss: "abriss", artikel: "artikel", ueberarbeitung: "ueberarbeitung",
});
/** Aufgaben, die viele Quellen über Zwischenstufen zu einem Entwurf zusammenführen. */
export const chronistFasstZusammen = (mode: ChronistMode): boolean => mode === "abriss" || mode === "artikel";
export const CHRONIST_PLAN_VERSION = "chronist-plan-1" as const;
export const CHRONIST_RULE_UNIT = "regelwerk";
export const chronistSortedIds = (ids: readonly string[]): readonly string[] => [...new Set(ids)].sort(codeUnitCompare);

/** Deterministic recipe only. Actual full wire admission remains before every claim. */
export function planChronistUnits(snapshot: ChronistSnapshot): readonly ChronistUnitPlan[] {
  const plans: ChronistUnitPlan[] = [];
  // Leave space for fixed profile instructions/schema, escaping, facts and relative anchors.
  const chars = Math.max(64, Math.floor((snapshot.budget.maxInputCharsPerCall - 4000) / 3));
  const maxOutputChars = Math.min(snapshot.budget.maxOutputCharsPerCall,
    chronistFasstZusammen(snapshot.mode) ? Math.max(128, Math.floor((snapshot.budget.maxInputCharsPerCall - 4000) / 12)) : 16000);
  // **Eine Überarbeitung hängt an ihrer einen Passage und an nichts sonst.** Die Datumsfakten
  // stehen den anderen Aufgaben als Bezugsanker für relative Angaben zur Verfügung; hier ist
  // `date` ohnehin immer null, und mitgeführte Fremdquellen würden die Zusage „eine Passage, eine
  // Einheit" stillschweigend brechen — an ihr hängt, welche Passage der Antrag ersetzen darf.
  const nutztFakten = snapshot.mode !== "ueberarbeitung";
  const allFactIds = nutztFakten ? snapshot.facts.map(f => f.id) : [];
  const factSources = nutztFakten ? snapshot.facts.flatMap(f => [...chronistFactSourceIds(f, snapshot.sources)]) : [];
  const add = (spans: readonly ChronistCitation[], parents: readonly ChronistUnitPlan[] = []) => {
    const factIds = parents.length ? chronistSortedIds(parents.flatMap(p => [...p.factIds])) : chronistSortedIds(allFactIds);
    const sourceIds = chronistSortedIds(parents.length ? parents.flatMap(p => [...p.sourceIds]) : [...spans.map(s => s.sourceId), ...factSources]);
    const recipe = { mode: snapshot.mode, sourceIds, sourceSpans: spans, factIds,
      parentUnitIds: parents.map(p => p.unitId), promptVersion: CHRONIST_PROMPT_VERSION, maxOutputChars };
    const unit = { unitId: chronistHash("unit-plan", chronistValue({ planVersion: CHRONIST_PLAN_VERSION, scopeHash: snapshot.scopeHash, recipe })), ...recipe };
    plans.push(unit); assertChronist(plans.length <= CHRONIST_LIMITS.modelUnits, "budget"); return unit;
  };
  for (const source of snapshot.sources) {
    if (source.block.kind === "rohblock" || source.text.trim().length === 0) continue;
    // **Eine Passage, eine Einheit.** Wer eine Passage überarbeitet, überarbeitet sie ganz: eine
    // in Stücke zerlegte Passage ergäbe mehrere Fassungen, von denen nur eine die alte ersetzen
    // kann. Passt sie nicht in einen Aufruf, bleibt sie ungeändert — das ist ehrlicher als eine
    // halbe Fassung. Zugleich ist damit die Beleggrenze gezogen: die Einheit kennt genau diese
    // eine Quelle, also kann die Prüfung unten kein fremdes Zitat durchlassen.
    if (snapshot.mode === "ueberarbeitung") {
      if (source.text.length <= chars) add([{ sourceId: source.sourceId, from: 0, to: source.text.length }]);
      continue;
    }
    const dates = extractChronistDates(source);
    const spans = snapshot.mode === "prosa" ? chronistSourceSentences(source).filter(s =>
      !dates.some(d => d.citation.from >= s.from && d.citation.to <= s.to) ||
      /\b(später|spaeter|zuvor|davor|danach|nachdem|vorher|later|earlier|after|before)\b/i.test(source.text.slice(s.from, s.to)))
      : [{ sourceId: source.sourceId, from: 0, to: source.text.length }];
    // A recognized date field is entirely handled by rules, including unreadable values.
    if (snapshot.mode === "prosa" && source.block.kind === "feld" && snapshot.facts.some(f => f.passageId === source.ref.passageId)) continue;
    for (const span of spans) {
      for (let from = span.from; from < span.to;) {
        let to = Math.min(span.to, from + chars);
        if (!isChronistTextBoundary(source.text, to)) to--;
        add([{ sourceId: source.sourceId, from, to }]); from = to;
      }
    }
  }
  // Every intermediate and final abriss is in the preview recipe, with transitive dependencies.
  if (chronistFasstZusammen(snapshot.mode) && plans.length > 1) {
    let level = [...plans];
    while (level.length > 1) {
      const next: ChronistUnitPlan[] = [];
      for (let i = 0; i < level.length; i += 2) {
        const parents = level.slice(i, i + 2);
        if (parents.length === 1) next.push(parents[0]!);
        else next.push(add([], parents));
      }
      level = next;
    }
  }
  return plans;
}

export function assertChronistUnitPlan(plan: ChronistUnitPlan, snapshot: ChronistSnapshot): void {
  parseChronistUnitPlan(plan);
  const expected = planChronistUnits(snapshot).find(u => u.unitId === plan.unitId);
  assertChronist(expected && canonicalJson(chronistValue(expected)) === canonicalJson(chronistValue(plan)), "scope-changed");
}

/** Leaves expose their exact spans; summaries may cite only spans inherited from their parents. */
export function chronistUnitSpans(plan: ChronistUnitPlan, plans: readonly ChronistUnitPlan[]): readonly ChronistCitation[] {
  const map = new Map(plans.map(p => [p.unitId, p])), visiting = new Set<string>();
  const visit = (unit: ChronistUnitPlan): readonly ChronistCitation[] => {
    assertChronist(!visiting.has(unit.unitId)); visiting.add(unit.unitId);
    const spans = [...unit.sourceSpans, ...unit.parentUnitIds.flatMap(id => { const p = map.get(id); assertChronist(p); return [...visit(p)]; })];
    visiting.delete(unit.unitId); return spans;
  };
  return visit(plan);
}
