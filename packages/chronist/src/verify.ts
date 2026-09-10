// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { canonicalJson } from "@chronicle/core";
import type { Blockinhalt } from "@chronicle/chronik";
import { pruefeChronik } from "./regelwerk.ts";
import type { ChronistCandidate, ChronistCitation, ChronistDate, ChronistModelDraft, ChronistModelUnit, ChronistSnapshot, ChronistUnitPlan } from "./types.ts";
import { chronistHash, chronistValue } from "./hash.ts";
import { assertChronist, parseChronistCandidate, parseChronistModelUnit } from "./parse.ts";
import { chronistCitationText, chronistFactSourceIds, chronistSourceSentences, extractChronistDates } from "./sources.ts";
import { CHRONIST_MODUS_ART, chronistSortedIds, chronistUnitSpans, planChronistUnits } from "./plan.ts";

export function chronistCandidateHash(candidate: ChronistCandidate): string { return chronistHash("candidate", chronistValue(parseChronistCandidate(candidate))); }
const paragraph = (text: string): Blockinhalt => ({ kind: "absatz", inhalt: [{ text, marks: [] }] });
const bodyKey = (body: Omit<ChronistCandidate, "candidateKey">) => chronistHash("candidate", chronistValue(body));
/**
 * Ein Ereignis ist ein Satz, ein Artikel hat Absätze. Leerzeilen im Modelltext werden deshalb zu
 * eigenen Absatzblöcken — mehr Struktur trägt der Block-AST nicht, und mehr soll ein Modell hier
 * auch nicht setzen können: es bleibt bei reinem Text ohne Auszeichnung und ohne HTML.
 */
const absaetze = (text: string): readonly Blockinhalt[] => {
  const teile = text.split(/\n\s*\n+/).map(part => part.trim()).filter(part => part.length > 0);
  return teile.length ? teile.map(paragraph) : [paragraph(text)];
};
export function candidateFromDraft(draft: ChronistModelDraft, unit: ChronistModelUnit, _snapshot: ChronistSnapshot): ChronistCandidate {
  const mehrteilig = draft.kind === "artikel" || draft.kind === "ueberarbeitung";
  const body = { kind: draft.kind, blocks: mehrteilig ? [...absaetze(draft.text)] : [paragraph(draft.text)],
    citations: draft.citations, dependencies: unit.sourceIds, origin: "modell" as const, ruleFinding: null, date: draft.date };
  return parseChronistCandidate({ candidateKey: bodyKey(body), ...body });
}

export function chronistRuleCandidates(snapshot: ChronistSnapshot): readonly ChronistCandidate[] {
  const result: ChronistCandidate[] = [];
  const findings = pruefeChronik(snapshot.facts.filter(f => f.jahr !== null), snapshot.facts.filter(f => f.jahr === null));
  for (const finding of findings) {
    const sources = snapshot.sources.filter(s => s.ref.entryId === finding.entryId && finding.passagen.includes(s.ref.passageId));
    const citations = sources.filter(s => s.text.length > 0).map(s => ({ sourceId: s.sourceId, from: 0, to: s.text.length }));
    // Empty source fields still have a rule finding, but no citable text and no proposal card.
    if (!citations.length) continue;
    const body = { kind: finding.art === "unlesbares_datum" ? "luecke" as const : "widerspruch" as const,
      blocks: [paragraph(finding.text)], citations, dependencies: chronistSortedIds(sources.map(s => s.sourceId)),
      origin: "regelwerk" as const, ruleFinding: finding, date: null };
    result.push({ candidateKey: bodyKey(body), ...body });
  }
  if (snapshot.mode === "prosa") for (const source of snapshot.sources) {
    for (const evidence of extractChronistDates(source)) {
      const sentence = chronistSourceSentences(source).find(s => s.from <= evidence.citation.from && s.to >= evidence.citation.to) ?? evidence.citation;
      const body = { kind: "ereignis" as const, blocks: [paragraph(source.text.slice(sentence.from, sentence.to))], citations: [sentence],
        dependencies: [source.sourceId], origin: "regelwerk" as const, ruleFinding: null,
        date: { kind: "absolute" as const, year: evidence.year, source: evidence.citation } };
      result.push({ candidateKey: bodyKey(body), ...body });
    }
  }
  return [...new Map(result.map(c => [c.candidateKey, c])).values()];
}

export function resolveChronistDate(date: ChronistDate, snapshot: ChronistSnapshot): number | null {
  if (date.kind === "absolute") return date.year;
  const anchors = snapshot.facts.filter(f => f.genau && f.jahr !== null && chronistFactSourceIds(f, snapshot.sources).includes(date.anchorSourceId));
  const years = [...new Set(anchors.map(f => f.jahr!))];
  if (years.length !== 1) return null;
  const conflicts = pruefeChronik(snapshot.facts);
  if (anchors.some(a => conflicts.some(f => f.entryId === a.entryId && f.passagen.includes(a.passageId)))) return null;
  const year = years[0]! + date.offsetYears;
  return Number.isSafeInteger(year) && year >= -999999 && year <= 999999 ? year : null;
}
const same = (a: unknown, b: unknown) => canonicalJson(chronistValue(a)) === canonicalJson(chronistValue(b));

/** Only an explicit, bounded year distance can license a relative date. No model arithmetic. */
export function extractChronistRelativeOffsets(text: string): readonly number[] {
  const words: Readonly<Record<string, number>> = { ein: 1, eins: 1, eine: 1, einem: 1, einen: 1, zwei: 2, drei: 3, vier: 4, fünf: 5, fuenf: 5, sechs: 6, sieben: 7, acht: 8, neun: 9, zehn: 10, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
  const values: number[] = [];
  for (const m of text.matchAll(/\b(\d{1,7}|ein(?:s|e|em|en)?|zwei|drei|vier|fünf|fuenf|sechs|sieben|acht|neun|zehn|one|two|three|four|five|six|seven|eight|nine|ten)\s+(?:Jahr(?:e|en)?|years?)\s+(später|spaeter|danach|nach|zuvor|davor|vorher|vor|later|after|earlier|before)\b/gi)) {
    const n = /^\d/.test(m[1]!) ? Number(m[1]) : words[m[1]!.toLowerCase()]!;
    values.push(/^(zuvor|davor|vorher|vor|earlier|before)$/i.test(m[2]!) ? -n : n);
  }
  return [...new Set(values)];
}

export function verifyChronistCandidate(value: ChronistCandidate, unit: ChronistModelUnit, snapshot: ChronistSnapshot):
  { readonly ok: true; readonly candidate: ChronistCandidate } | { readonly ok: false; readonly reason: "schema" | "citation" | "rule-conflict" } {
  let candidate: ChronistCandidate;
  try { candidate = parseChronistCandidate(value); parseChronistModelUnit(unit); } catch { return { ok: false, reason: "schema" }; }
  const { candidateKey, ...body } = candidate;
  if (candidateKey !== bodyKey(body)) return { ok: false, reason: "schema" };
  if (candidate.origin === "regelwerk") return chronistRuleCandidates(snapshot).some(c => same(c, candidate)) ? { ok: true, candidate } : { ok: false, reason: "rule-conflict" };
  const plans = planChronistUnits(snapshot), plan = plans.find(p => p.unitId === unit.unitId);
  const { attempt: _attempt, parentResults: _parents, dispatch: _dispatch, ...unitPlan } = unit;
  if (!plan || !same(plan, unitPlan)) return { ok: false, reason: "schema" };
  if (!same(candidate.dependencies, plan.sourceIds)) return { ok: false, reason: "citation" };
  if (candidate.kind !== CHRONIST_MODUS_ART[snapshot.mode]) return { ok: false, reason: "schema" };
  const spans = chronistUnitSpans(plan, plans);
  const cited = (c: ChronistCitation): boolean => Boolean(chronistCitationText(c, snapshot.sources)?.trim()) &&
    spans.some(s => s.sourceId === c.sourceId && s.from <= c.from && s.to >= c.to);
  if (!candidate.citations.every(cited)) return { ok: false, reason: "citation" };
  if (candidate.date !== null) {
    if (!cited(candidate.date.source) || !candidate.citations.some(c => c.sourceId === candidate.date!.source.sourceId && c.from <= candidate.date!.source.from && c.to >= candidate.date!.source.to)) return { ok: false, reason: "citation" };
    const year = resolveChronistDate(candidate.date, snapshot);
    if (year === null) return { ok: false, reason: "rule-conflict" };
    const dateSource = snapshot.sources.find(s => s.sourceId === candidate.date!.source.sourceId)!;
    const facts = snapshot.facts.filter(f => f.genau && f.jahr !== null && chronistFactSourceIds(f, snapshot.sources).includes(dateSource.sourceId) && unit.factIds.includes(f.id));
    if (candidate.date.kind === "relative") {
      const offsets = extractChronistRelativeOffsets(chronistCitationText(candidate.date.source, snapshot.sources)!);
      if (offsets.length !== 1 || offsets[0] !== candidate.date.offsetYears) return { ok: false, reason: "rule-conflict" };
      if (!unit.sourceIds.includes(candidate.date.anchorSourceId)) return { ok: false, reason: "citation" };
      const anchors = snapshot.facts.filter(f => f.genau && f.jahr !== null && chronistFactSourceIds(f, snapshot.sources).includes(candidate.date!.kind === "relative" ? candidate.date!.anchorSourceId : ""));
      if (!anchors.length || anchors.some(f => !unit.factIds.includes(f.id))) return { ok: false, reason: "citation" };
    } else {
      // An asserted absolute year must be rule-readable inside the precise date citation.
      const evidence = extractChronistDates(dateSource).filter(e => e.citation.from >= candidate.date!.source.from && e.citation.to <= candidate.date!.source.to);
      if (!evidence.some(e => e.year === year)) return { ok: false, reason: "rule-conflict" };
    }
    // Direct contradiction with a certain fact in the cited statement cannot be model-approved.
    const local = extractChronistDates(dateSource).filter(e => e.citation.from >= candidate.date!.source.from && e.citation.to <= candidate.date!.source.to);
    if (local.some(e => e.year !== year)) return { ok: false, reason: "rule-conflict" };
    if (facts.some(f => f.art !== "ereignis" && f.jahr !== year)) return { ok: false, reason: "rule-conflict" };
    const art = facts.find(f => f.art !== "ereignis")?.art;
    if (art) {
      const newFindings = pruefeChronik([...snapshot.facts.filter(f => f.id !== facts[0]?.id), {
        id: candidate.candidateKey, art, jahr: year, genau: true, roh: "", entryId: dateSource.ref.entryId, titel: dateSource.title, passageId: dateSource.ref.passageId,
      }]);
      if (newFindings.some(f => f.entryId === dateSource.ref.entryId && f.passagen.includes(dateSource.ref.passageId))) return { ok: false, reason: "rule-conflict" };
    }
  }
  return { ok: true, candidate };
}

/** The verified original, never a user-editable proposal, is allowed into a parent prompt. */
export function assertChronistParentCandidates(plan: ChronistUnitPlan, candidates: readonly ChronistCandidate[], snapshot: ChronistSnapshot): void {
  const unit = { ...plan, attempt: 1 as const, parentResults: [], dispatch: { schemaVersion: 1 as const, profileId: "validation", model: "validation", wireText: "validation", inputChars: 10, maxOutputChars: plan.maxOutputChars, requestHash: "0".repeat(64) } };
  for (const c of candidates) assertChronist(verifyChronistCandidate(c, unit, snapshot).ok);
}
