// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import type { Blockinhalt } from "@chronicle/chronik";
import type { Befund, Zeitereignis } from "./regelwerk.ts";
import { BEFUNDARTEN } from "./regelwerk.ts";
import { admitChronistValue, CHRONIST_LIMITS, ChronistValidationError } from "./hash.ts";
import type { ChronistBudget, ChronistCandidate, ChronistCitation, ChronistDate, ChronistDispatch, ChronistModelDraft, ChronistModelUnit, ChronistSourceRef, ChronistSourceSnapshot, ChronistUnitPlan, ChronistUsageEvidence, ChronistCallOutcome } from "./types.ts";

export function assertChronist(condition: unknown, code: "schema" | "budget" | "citation" | "rule-conflict" | "scope-changed" = "schema"): asserts condition {
  if (!condition) throw new ChronistValidationError(code);
}
export function closed(value: unknown, required: readonly string[], optional: readonly string[] = []): Record<string, unknown> {
  assertChronist(value !== null && typeof value === "object" && !Array.isArray(value));
  const obj = value as Record<string, unknown>;
  assertChronist(required.every(k => Object.hasOwn(obj, k)) && Object.keys(obj).every(k => required.includes(k) || optional.includes(k)));
  return obj;
}
export const stringValue = (v: unknown, min = 0, max: number = CHRONIST_LIMITS.sourceChars): string => { assertChronist(typeof v === "string" && v.length >= min && v.length <= max); return v; };
export const idValue = (v: unknown): string => stringValue(v, 1, 200);
export const hashValue = (v: unknown): string => { assertChronist(typeof v === "string" && /^[0-9a-f]{64}$/.test(v)); return v; };
export const integer = (v: unknown, min = 0, max = Number.MAX_SAFE_INTEGER): number => { assertChronist(typeof v === "number" && Number.isSafeInteger(v) && v >= min && v <= max); return v; };
const bool = (v: unknown): boolean => { assertChronist(typeof v === "boolean"); return v; };
export function arrayValue(v: unknown, max = 512): readonly unknown[] { assertChronist(Array.isArray(v) && v.length <= max); return v; }
export function oneOf<T extends string>(v: unknown, values: readonly T[]): T { assertChronist(typeof v === "string" && (values as readonly string[]).includes(v)); return v as T; }
const strings = (v: unknown, max = 512) => { const a = arrayValue(v, max).map(idValue); assertChronist(new Set(a).size === a.length); return a; };
const inspected = <T>(value: unknown, parse: (v: unknown) => T): T => { admitChronistValue(value); return parse(value); };

function inline(v: unknown): void {
  const o = closed(v, ["text", "marks"]); stringValue(o.text);
  for (const mark of arrayValue(o.marks, 32)) {
    const m = closed(mark, ["art"], ["zielSlug", "zielEntryId"]);
    if (oneOf(m.art, ["em", "strong", "code", "link"]) === "link") { closed(m, ["art", "zielSlug"], ["zielEntryId"]); stringValue(m.zielSlug, 1, 500); if (m.zielEntryId !== undefined) idValue(m.zielEntryId); }
    else closed(m, ["art"]);
  }
}
function inlines(v: unknown): void { arrayValue(v, 10000).forEach(inline); }
function block(v: unknown): Blockinhalt {
  const kind = oneOf(closed(v, ["kind"], ["inhalt", "schluessel", "label", "gruppe", "werte", "mehrwertig", "klauselKandidat", "geordnet", "punkte", "assetId", "dateiname", "alt", "ausrichtung", "breite", "ausInfobox", "quelltext", "grund"]).kind,
    ["absatz", "zitat", "feld", "liste", "bildunterschrift", "rohblock"]);
  if (kind === "absatz" || kind === "zitat") inlines(closed(v, ["kind", "inhalt"]).inhalt);
  else if (kind === "feld") {
    const o = closed(v, ["kind", "schluessel", "label", "werte", "mehrwertig", "klauselKandidat"], ["gruppe"]);
    stringValue(o.schluessel, 1, 500); stringValue(o.label, 0, 1000); if (o.gruppe !== undefined) stringValue(o.gruppe, 0, 1000);
    arrayValue(o.werte, 10000).forEach(inlines); bool(o.mehrwertig); bool(o.klauselKandidat);
  } else if (kind === "liste") { const o = closed(v, ["kind", "geordnet", "punkte"]); bool(o.geordnet); arrayValue(o.punkte, 10000).forEach(inlines); }
  else if (kind === "bildunterschrift") {
    const o = closed(v, ["kind", "assetId", "inhalt"], ["dateiname", "alt", "ausrichtung", "breite", "ausInfobox"]);
    idValue(o.assetId); inlines(o.inhalt); for (const k of ["dateiname", "alt"]) if (o[k] !== undefined) stringValue(o[k]);
    if (o.ausrichtung !== undefined) oneOf(o.ausrichtung, ["links", "rechts", "zentriert", "ohne"]);
    if (o.breite !== undefined) integer(o.breite, 1); if (o.ausInfobox !== undefined) bool(o.ausInfobox);
  } else { const o = closed(v, ["kind", "quelltext", "grund"]); stringValue(o.quelltext); oneOf(o.grund, ["wikitabelle", "unbekannte-vorlage", "generator-prosa", "sonstiges"]); }
  return v as Blockinhalt;
}
export const parseChronistBlock = (v: unknown): Blockinhalt => inspected(v, block);
function sourceRef(v: unknown): ChronistSourceRef {
  const o = closed(v, ["entryId", "passageId", "revisionId", "contentHash"]);
  idValue(o.entryId); idValue(o.passageId); idValue(o.revisionId); hashValue(o.contentHash); return v as ChronistSourceRef;
}
export const parseChronistSourceRef = (v: unknown): ChronistSourceRef => inspected(v, sourceRef);
export function parseChronistSourceShape(v: unknown): ChronistSourceSnapshot {
  return inspected(v, value => { const o = closed(value, ["sourceId", "ref", "title", "block", "textVersion", "text"]);
    hashValue(o.sourceId); sourceRef(o.ref); stringValue(o.title, 0, 10000); block(o.block); assertChronist(o.textVersion === "plain-block-1"); stringValue(o.text); return value as ChronistSourceSnapshot;
  });
}
export function parseChronistBudget(v: unknown): ChronistBudget {
  return inspected(v, value => { const keys = ["maxCalls", "maxInputChars", "maxOutputChars", "callTimeoutMs", "maxActiveMs", "concurrency", "maxInputCharsPerCall", "maxOutputCharsPerCall"] as const;
    const o = closed(value, keys); for (const key of keys) integer(o[key], key === "maxCalls" || key === "maxInputChars" || key === "maxOutputChars" ? 0 : 1, CHRONIST_LIMITS[key]); return value as ChronistBudget;
  });
}
export function parseChronistFact(v: unknown): Zeitereignis {
  const o = closed(v, ["id", "art", "jahr", "genau", "roh", "entryId", "titel", "passageId"]);
  idValue(o.id); oneOf(o.art, ["geburt", "tod", "gruendung", "datum", "ereignis"]); if (o.jahr !== null) integer(o.jahr, -999999, 999999); bool(o.genau);
  stringValue(o.roh); idValue(o.entryId); stringValue(o.titel, 0, 10000); idValue(o.passageId); return v as Zeitereignis;
}
function citation(v: unknown): ChronistCitation { const o = closed(v, ["sourceId", "from", "to"]); hashValue(o.sourceId); integer(o.from, 0, CHRONIST_LIMITS.sourceChars); integer(o.to, 1, CHRONIST_LIMITS.sourceChars); assertChronist(Number(o.from) < Number(o.to)); return v as ChronistCitation; }
export const parseChronistCitation = (v: unknown): ChronistCitation => inspected(v, citation);
function date(v: unknown): ChronistDate | null {
  if (v === null) return null;
  const o = closed(v, ["kind", "source"], ["year", "anchorSourceId", "offsetYears"]); citation(o.source);
  if (oneOf(o.kind, ["absolute", "relative"]) === "absolute") { closed(o, ["kind", "source", "year"]); integer(o.year, -999999, 999999); }
  else { closed(o, ["kind", "source", "anchorSourceId", "offsetYears"]); hashValue(o.anchorSourceId); integer(o.offsetYears, -1999998, 1999998); }
  return v as ChronistDate;
}
function draft(v: unknown): ChronistModelDraft {
  const o = closed(v, ["kind", "text", "citations", "date"]);
  const kind = oneOf(o.kind, ["ereignis", "abriss"]); stringValue(o.text, 1, 16000); assertChronist(String(o.text).trim().length > 0);
  // Text is always rendered as a plain AST paragraph; the model cannot create links or HTML.
  assertChronist(!/<\/?[a-z][^>]*>/i.test(String(o.text)));
  const citations = arrayValue(o.citations, 512); assertChronist(citations.length > 0); citations.forEach(citation); date(o.date);
  if (kind === "abriss") assertChronist(o.date === null); return v as ChronistModelDraft;
}
export function parseChronistModelReply(value: unknown): { readonly schemaVersion: 1; readonly candidates: readonly ChronistModelDraft[] } {
  return inspected(value, v => { const o = closed(v, ["schemaVersion", "candidates"]); assertChronist(o.schemaVersion === 1); arrayValue(o.candidates, CHRONIST_LIMITS.candidates).forEach(draft); return v as { schemaVersion: 1; candidates: readonly ChronistModelDraft[] }; });
}
function finding(v: unknown): Befund | null { if (v === null) return null; const o = closed(v, ["art", "entryId", "titel", "text", "passagen"]); oneOf(o.art, BEFUNDARTEN); idValue(o.entryId); stringValue(o.titel, 0, 10000); stringValue(o.text, 1, 16000); arrayValue(o.passagen, 512).forEach(idValue); return v as Befund; }
function candidate(v: unknown): ChronistCandidate {
  const o = closed(v, ["candidateKey", "kind", "blocks", "citations", "dependencies", "origin", "ruleFinding", "date"]);
  hashValue(o.candidateKey); oneOf(o.kind, ["ereignis", "widerspruch", "luecke", "abriss"]);
  const blocks = arrayValue(o.blocks, 64); assertChronist(blocks.length > 0); blocks.forEach(block);
  const citations = arrayValue(o.citations, 512); assertChronist(citations.length > 0); citations.forEach(citation);
  const dependencies = strings(o.dependencies); assertChronist(dependencies.length > 0); dependencies.forEach(hashValue);
  oneOf(o.origin, ["regelwerk", "modell"]); finding(o.ruleFinding); date(o.date);
  assertChronist(o.kind !== "abriss" || o.date === null);
  if (o.origin === "modell") {
    assertChronist(o.ruleFinding === null && (o.kind === "ereignis" || o.kind === "abriss"));
    assertChronist(blocks.length === 1 && (blocks[0] as Blockinhalt).kind === "absatz");
    const b = blocks[0] as Extract<Blockinhalt, { kind: "absatz" }>;
    assertChronist(b.inhalt.length === 1 && b.inhalt[0]!.marks.length === 0); stringValue(b.inhalt[0]!.text, 1, 16000);
    assertChronist(!/<\/?[a-z][^>]*>/i.test(b.inhalt[0]!.text));
  }
  return v as ChronistCandidate;
}
export const parseChronistCandidate = (v: unknown): ChronistCandidate => inspected(v, candidate);
function unitPlan(v: unknown, extra: readonly string[] = []): ChronistUnitPlan {
  const o = closed(v, ["unitId", "mode", "sourceIds", "sourceSpans", "factIds", "parentUnitIds", "promptVersion", "maxOutputChars"], extra);
  hashValue(o.unitId); oneOf(o.mode, ["prosa", "sitzung", "abriss"]); strings(o.sourceIds).forEach(hashValue); arrayValue(o.sourceSpans, 512).forEach(citation);
  strings(o.factIds, 10000).forEach(hashValue); strings(o.parentUnitIds, 128).forEach(hashValue); assertChronist(o.promptVersion === "chronist-prompt-1"); integer(o.maxOutputChars, 1, CHRONIST_LIMITS.maxOutputCharsPerCall); return v as ChronistUnitPlan;
}
export const parseChronistUnitPlan = (v: unknown): ChronistUnitPlan => inspected(v, unitPlan);
export function parseChronistDispatch(v: unknown): ChronistDispatch {
  const o = closed(v, ["schemaVersion", "profileId", "model", "wireText", "inputChars", "maxOutputChars", "requestHash"]);
  assertChronist(o.schemaVersion === 1); idValue(o.profileId); stringValue(o.model, 1, 256); assertChronist(!/[\u0000-\u001f]/.test(String(o.model))); stringValue(o.wireText, 1, CHRONIST_LIMITS.maxInputCharsPerCall);
  integer(o.inputChars, 1, CHRONIST_LIMITS.maxInputCharsPerCall); assertChronist(o.inputChars === String(o.wireText).length); integer(o.maxOutputChars, 1, CHRONIST_LIMITS.maxOutputCharsPerCall); hashValue(o.requestHash); return v as ChronistDispatch;
}
export function parseChronistModelUnit(v: unknown): ChronistModelUnit {
  return inspected(v, value => { unitPlan(value, ["attempt", "parentResults", "dispatch"]); const o = value as Record<string, unknown>;
    integer(o.attempt, 1, 2); arrayValue(o.parentResults, 128).forEach(p => { const r = closed(p, ["unitId", "candidateHashes"]); hashValue(r.unitId); arrayValue(r.candidateHashes, 256).forEach(hashValue); }); parseChronistDispatch(o.dispatch); return value as ChronistModelUnit;
  });
}
export function parseChronistUsage(v: unknown): ChronistUsageEvidence {
  const o = closed(v, ["inputChars", "outputChars", "outputComplete", "inputTokens", "outputTokens", "tokensComplete", "durationMs", "costMicros", "currency", "costKind", "costComplete"]);
  integer(o.inputChars, 0, CHRONIST_LIMITS.maxInputCharsPerCall); integer(o.outputChars, 0, CHRONIST_LIMITS.maxOutputCharsPerCall); bool(o.outputComplete); bool(o.tokensComplete); bool(o.costComplete); integer(o.durationMs);
  for (const k of ["inputTokens", "outputTokens", "costMicros"]) if (o[k] !== null) integer(o[k]);
  if (o.currency !== null) assertChronist(typeof o.currency === "string" && /^[A-Z]{3}$/.test(o.currency));
  oneOf(o.costKind, ["reported", "estimated", "unknown"]); assertChronist(o.costKind !== "unknown" || o.costMicros === null);
  assertChronist(o.tokensComplete !== true || o.inputTokens !== null && o.outputTokens !== null);
  assertChronist(o.costComplete !== true || o.costMicros !== null && o.currency !== null);
  return v as ChronistUsageEvidence;
}
export function parseChronistCallOutcome(v: unknown): ChronistCallOutcome {
  return inspected(v, value => { const o = closed(value, ["kind", "usage"], ["reply", "code", "mayHaveExecuted"]); parseChronistUsage(o.usage);
    if (oneOf(o.kind, ["returned", "failed"]) === "returned") { closed(o, ["kind", "usage", "reply"]); stringValue(closed(o.reply, ["text"]).text, 0, CHRONIST_LIMITS.maxOutputCharsPerCall); }
    else { closed(o, ["kind", "usage", "code", "mayHaveExecuted"]); oneOf(o.code, ["unavailable", "timeout", "cancelled", "output-limit"]); bool(o.mayHaveExecuted); }
    return value as ChronistCallOutcome;
  });
}
