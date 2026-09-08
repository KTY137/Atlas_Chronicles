// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { canonicalHash, canonicalJson } from "@chronicle/core";
import type { Blockinhalt } from "@chronicle/chronik";
import type { Zeitereignis } from "./regelwerk.ts";
import type { ChronistCitation, ChronistSnapshot, ChronistSourceRef, ChronistSourceSnapshot } from "./types.ts";
import { CHRONIST_LIMITS, admitChronistValue, chronistHash, chronistValue, codeUnitCompare } from "./hash.ts";
import { arrayValue, assertChronist, closed, hashValue, idValue, oneOf, parseChronistBlock, parseChronistBudget, parseChronistFact, parseChronistSourceRef, parseChronistSourceShape } from "./parse.ts";

/** Frozen plain-block-1 mapping: same bytes as the document writer's plainBlock. */
export function chronistPlainBlock(block: Blockinhalt): string {
  switch (block.kind) {
    case "absatz": case "zitat": case "bildunterschrift": return block.inhalt.map(t => t.text).join("");
    case "feld": return block.werte.map(v => v.map(t => t.text).join("")).join("\n");
    case "liste": return block.punkte.map(v => v.map(t => t.text).join("")).join("\n");
    case "rohblock": return block.quelltext;
  }
}
export function makeChronistSourceSnapshot(ref: ChronistSourceRef, title: string, block: Blockinhalt): ChronistSourceSnapshot {
  parseChronistSourceRef(ref); parseChronistBlock(block);
  const base = { ref, title, block, textVersion: "plain-block-1" as const, text: chronistPlainBlock(block) };
  const source = { sourceId: chronistHash("source-snapshot", chronistValue(base)), ...base };
  return parseChronistSourceSnapshot(source);
}
export function parseChronistSourceSnapshot(value: unknown): ChronistSourceSnapshot {
  const source = parseChronistSourceShape(value);
  const { sourceId, ...base } = source;
  assertChronist(source.ref.contentHash === canonicalHash(chronistValue(source.block)));
  assertChronist(source.text === chronistPlainBlock(source.block));
  assertChronist(sourceId === chronistHash("source-snapshot", chronistValue(base)));
  return source;
}
function compareSources(a: ChronistSourceSnapshot, b: ChronistSourceSnapshot): number {
  for (const key of ["entryId", "passageId", "revisionId", "contentHash"] as const) {
    const cmp = codeUnitCompare(a.ref[key], b.ref[key]); if (cmp) return cmp;
  }
  return 0;
}
export function canonicalChronistSources(sources: readonly ChronistSourceSnapshot[]): readonly ChronistSourceSnapshot[] {
  assertChronist(sources.length <= CHRONIST_LIMITS.sources, "budget");
  const result: ChronistSourceSnapshot[] = [];
  for (const source of sources.map(parseChronistSourceSnapshot).sort(compareSources)) {
    const previous = result.at(-1);
    if (previous?.ref.entryId === source.ref.entryId && previous.ref.passageId === source.ref.passageId) {
      assertChronist(previous.sourceId === source.sourceId); continue;
    }
    result.push(source);
  }
  assertChronist(result.reduce((n, s) => n + s.text.length, 0) <= CHRONIST_LIMITS.sourceChars, "budget");
  return result;
}
export function isChronistTextBoundary(text: string, index: number): boolean {
  return Number.isInteger(index) && index >= 0 && index <= text.length && !(index > 0 && index < text.length &&
    text.charCodeAt(index - 1) >= 0xd800 && text.charCodeAt(index - 1) <= 0xdbff && text.charCodeAt(index) >= 0xdc00 && text.charCodeAt(index) <= 0xdfff);
}
export function chronistCitationText(citation: ChronistCitation, sources: readonly ChronistSourceSnapshot[]): string | null {
  const source = sources.find(s => s.sourceId === citation.sourceId);
  return source && citation.from < citation.to && isChronistTextBoundary(source.text, citation.from) && isChronistTextBoundary(source.text, citation.to)
    ? source.text.slice(citation.from, citation.to) : null;
}
export function chronistSourceSentences(source: ChronistSourceSnapshot): readonly ChronistCitation[] {
  const result: ChronistCitation[] = []; let from = 0;
  for (const m of source.text.matchAll(/(?<=[.!?])\s+(?=[A-ZÄÖÜ])|\n+/g)) {
    if (source.text.slice(from, m.index).trim()) result.push({ sourceId: source.sourceId, from, to: m.index });
    from = m.index + m[0].length;
  }
  if (source.text.slice(from).trim()) result.push({ sourceId: source.sourceId, from, to: source.text.length });
  return result;
}
export interface ChronistDateEvidence {
  readonly year: number; readonly art: string; readonly citation: ChronistCitation;
}
const fieldArt = (block: Blockinhalt): string | null => {
  if (block.kind !== "feld") return null;
  const keys = [block.schluessel, block.label].map(s => s.toLowerCase().replace(/\s+/g, ""));
  return keys.some(s => /^(geburt|geboren|geburtsdatum|birth)$/.test(s)) ? "geburt"
    : keys.some(s => /^(tod|todesdatum|gestorben|death)$/.test(s)) ? "tod"
    : keys.some(s => /^(gr(ü|ue)ndung|gegr(ü|ue)ndet|founded)$/.test(s)) ? "gruendung"
    : keys.some(s => /^(datum|jahr|zeitpunkt|date|year)$/.test(s)) ? "datum" : null;
};
function proseArt(text: string, from: number, to: number): string {
  const markers = [...text.matchAll(/\b(geboren|geburt|born|birth|starb|gestorben|tod|died|death|gegründet|gegruendet|gründung|gruendung|founded)\b/gi)]
    .map(m => ({ word: m[0], distance: m.index >= to ? m.index - to : m.index + m[0].length <= from ? from - m.index - m[0].length : 0 }))
    .sort((a, b) => a.distance - b.distance);
  const marker = markers[0];
  if (!marker || marker.distance > 60) return "ereignis";
  return /^(geboren|geburt|born|birth)$/i.test(marker.word) ? "geburt" : /^(starb|gestorben|tod|died|death)$/i.test(marker.word) ? "tod" : "gruendung";
}
function signedYear(number: string, era = ""): number | null {
  const result = /^v|^b/i.test(era.trim()) ? -Math.abs(Number(number)) : Number(number);
  return Number.isSafeInteger(result) && result >= -999999 && result <= 999999 ? result : null;
}
function approximateFieldYear(text: string): number | null {
  if (/\d\s*(cm|mm|m|km|kg|g|%|°)\b/i.test(text)) return null;
  const normalized = text.replace(/[.,](?=\d{3}\b)/g, "");
  const match = /(?<!\d)([+-]?\d{1,6})(?!\d)/.exec(normalized);
  if (!match) return null;
  return signedYear(match[1]!, /\bv\s*\.?\s*(k|c|chr)\b/i.test(text) ? "v" : "");
}
/** Intentionally narrow: explicit world-year prose, never arbitrary quantities or implied calendars. */
export function extractChronistDates(source: ChronistSourceSnapshot): readonly ChronistDateEvidence[] {
  const result: ChronistDateEvidence[] = [], art = fieldArt(source.block);
  if (art !== null) {
    const match = /^\s*([+-]?\d{1,6})(?:\s+([vn]\s*\.?\s*(?:k|c|chr)\.?|bce?|ce|ad))?\s*$/i.exec(source.text);
    const year = match ? signedYear(match[1]!, match[2]) : null;
    if (year !== null && source.text.length) result.push({ year, art, citation: { sourceId: source.sourceId, from: 0, to: source.text.length } });
    return result;
  }
  for (const span of chronistSourceSentences(source)) {
    const text = source.text.slice(span.from, span.to);
    const pattern = /\b(?:im\s+Jahr(?:e)?|Jahr|in\s+the\s+year|year)\s+([+-]?\d{1,6})(?!\d)(?:\s+([vn]\s*\.?\s*(?:k|c|chr)\.?|bce?|ce|ad))?|(?<![\d+-])([+-]?\d{1,6})(?!\d)\s+([vn]\s*\.?\s*(?:k|c|chr)\.?|bce?|ce|ad)\b/gi;
    for (const match of text.matchAll(pattern)) {
      if (/\b(?:um|etwa|circa|ungefähr|ca\.?|around|about)\s*$/i.test(text.slice(0, match.index))) continue;
      const year = signedYear(match[1] ?? match[3]!, match[2] ?? match[4]);
      if (year !== null) result.push({ year, art: proseArt(text, match.index, match.index + match[0].length), citation: { sourceId: source.sourceId, from: span.from + match.index, to: span.from + match.index + match[0].length } });
    }
    if (!result.some(e => e.citation.from >= span.from && e.citation.to <= span.to)) {
      const direct = /\b(?:geboren|starb|gestorben|gegründet|gegruendet|born|died|founded)\s+([+-]?\d{1,6})(?!\d)|(?<!\d)([+-]?\d{1,6})(?!\d)\s+(?:geboren|gestorben|gegründet|gegruendet|born|died|founded)\b/gi;
      for (const match of text.matchAll(direct)) {
        if (/\b(?:um|etwa|circa|ungefähr|ca\.?|around|about)\s*$/i.test(text.slice(0, match.index))) continue;
        const year = signedYear(match[1] ?? match[2]!);
        if (year !== null) result.push({ year, art: proseArt(text, match.index, match.index + match[0].length), citation: { sourceId: source.sourceId, from: span.from + match.index, to: span.from + match.index + match[0].length } });
      }
    }
  }
  return result;
}
export function deriveChronistFacts(sources: readonly ChronistSourceSnapshot[]): readonly Zeitereignis[] {
  const facts: Zeitereignis[] = [];
  for (const source of canonicalChronistSources(sources)) {
    const dates = extractChronistDates(source), field = fieldArt(source.block);
    const evidence = dates.length ? dates.map(d => ({ jahr: d.year, genau: true, art: d.art, citation: d.citation }))
      : field ? [{ jahr: approximateFieldYear(source.text), genau: false, art: field, citation: { sourceId: source.sourceId, from: 0, to: source.text.length } }] : [];
    for (const item of evidence) {
      const fact = { art: item.art, jahr: item.jahr, genau: item.genau, roh: source.text.slice(item.citation.from, item.citation.to), entryId: source.ref.entryId, titel: source.title, passageId: source.ref.passageId };
      facts.push({ id: chronistHash("unit-plan", chronistValue({ kind: "fact", sourceIds: [source.sourceId], citation: item.citation, fact })), ...fact });
    }
  }
  return facts;
}
export function chronistFactSourceIds(fact: Zeitereignis, sources: readonly ChronistSourceSnapshot[]): readonly string[] {
  return sources.filter(s => s.ref.entryId === fact.entryId && s.ref.passageId === fact.passageId).map(s => s.sourceId);
}
export function parseChronistSnapshot(value: unknown): ChronistSnapshot {
  admitChronistValue(value);
  const o = closed(value, ["schemaVersion", "graphVersion", "runId", "mode", "sessionId", "scopeHash", "sources", "facts", "budget"]);
  assertChronist(o.schemaVersion === 1 && o.graphVersion === "chronist-1"); idValue(o.runId); oneOf(o.mode, ["prosa", "sitzung", "abriss"]);
  if (o.sessionId !== null) idValue(o.sessionId); assertChronist(o.mode !== "sitzung" || o.sessionId !== null); hashValue(o.scopeHash); parseChronistBudget(o.budget);
  const sources = arrayValue(o.sources, CHRONIST_LIMITS.sources).map(parseChronistSourceSnapshot);
  const canonical = canonicalChronistSources(sources);
  assertChronist(canonical.length === sources.length && canonical.every((s, i) => s.sourceId === sources[i]!.sourceId));
  const facts = arrayValue(o.facts, 10000).map(parseChronistFact);
  assertChronist(canonicalJson(chronistValue(facts)) === canonicalJson(chronistValue(deriveChronistFacts(canonical))));
  return value as ChronistSnapshot;
}
