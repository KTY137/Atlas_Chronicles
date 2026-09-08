// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { parseFormulaDetailed, tokenizeFormula, type Formula, type FormulaErrorCode, type FormulaFieldTypes, type FormulaType } from "@chronicle/rules";

export interface FormulaMember { readonly id: string; readonly label: string; readonly type: FormulaType }
export interface FormulaSources { readonly actor: readonly FormulaMember[]; readonly input: readonly FormulaMember[] }
export interface FormulaOptions { readonly allowDice: boolean; readonly allowKnowledge: boolean }
export type SpanKind = "attribute" | "parameter" | "dice" | "number" | "text" | "function" | "keyword" | "operator" | "paren" | "invalid";
export interface HighlightSpan { readonly kind: SpanKind; readonly start: number; readonly end: number; readonly title?: string; readonly missing?: boolean }
export interface FormulaError { readonly message: string; readonly start: number; readonly end: number; readonly code: FormulaErrorCode | "object-path" | "dice-forbidden" | "knowledge-forbidden" | "empty" }
export interface FormulaAnalysis { readonly text: string; readonly canonical: string; readonly ok: boolean; readonly ast?: Formula; readonly error?: FormulaError; readonly spans: readonly HighlightSpan[] }
export interface CompletionItem { readonly insert: string; readonly title: string; readonly detail: string; readonly kind: "attribute" | "parameter" | "function" | "dice" | "note" }
export interface Completion { readonly start: number; readonly end: number; readonly items: readonly CompletionItem[] }

const SIGIL: Record<"actor" | "input", string> = { actor: "@", input: "?" };
const IDENT = /[a-z][a-z0-9_-]*/y, STRING = /"(?:[^"\\\r\n]|\\["\\/bfnrt]|\\u[\da-fA-F]{4})*"/y;
const KNOWLEDGE = new Set(["haelt", "haelt_etikett", "erfahrungsgrad"]);
export const FUNCTION_HELP: readonly { name: string; title: string; knowledge: boolean; insert: string }[] = [
  { name: "min", title: "kleinster Wert", knowledge: false, insert: "min(" }, { name: "max", title: "größter Wert", knowledge: false, insert: "max(" },
  { name: "floor", title: "abrunden", knowledge: false, insert: "floor(" }, { name: "ceil", title: "aufrunden", knowledge: false, insert: "ceil(" },
  { name: "round", title: "runden", knowledge: false, insert: "round(" }, { name: "abs", title: "Betrag ohne Vorzeichen", knowledge: false, insert: "abs(" },
  { name: "if", title: "wenn … dann … sonst", knowledge: false, insert: "if(" },
  { name: "haelt", title: "Figur hält diese Passage", knowledge: true, insert: "haelt(" }, { name: "haelt_etikett", title: "gehaltene Passagen mit Etikett zählen", knowledge: true, insert: "haelt_etikett(" }, { name: "erfahrungsgrad", title: "Erfahrungsgrad zu einem Etikett", knowledge: true, insert: "erfahrungsgrad(" },
];
const DICE_SUGGESTIONS: readonly { insert: string; title: string }[] = [
  { insert: "1d20", title: "ein W20" }, { insert: "1d100", title: "ein W100" }, { insert: "1d6", title: "ein W6" }, { insert: "2d6", title: "zwei W6" },
  { insert: "2d20kh1", title: "zwei W20, den höheren behalten" }, { insert: "2d20kl1", title: "zwei W20, den niedrigeren behalten" }, { insert: "1d6!3", title: "W6, bei 6 bis zu dreimal weiterwürfeln" },
];
export const typeWord = (type: FormulaType): string => type === "number" ? "Zahl" : type === "boolean" ? "Ja/Nein" : "Text";
export const fieldTypesOf = (sources: FormulaSources): FormulaFieldTypes => ({ actor: Object.fromEntries(sources.actor.map(m => [m.id, m.type])), input: Object.fromEntries(sources.input.map(m => [m.id, m.type])) });

/** `@x` → `actor.x`, `?x` → `input.x` outside strings, with a position map from canonical to typed text. */
export function desugarFormula(text: string): { canonical: string; map: readonly number[] } {
  let canonical = ""; const map: number[] = []; let i = 0;
  const push = (piece: string, from: number) => { for (let n = 0; n < piece.length; n++) map.push(from); canonical += piece; };
  while (i < text.length) {
    const ch = text[i]!;
    if (ch === '"') { STRING.lastIndex = i; const match = STRING.exec(text); const piece = match ? match[0] : text.slice(i); for (let n = 0; n < piece.length; n++) map.push(i + n); canonical += piece; i += piece.length; continue; }
    if (ch === "@" || ch === "?") {
      IDENT.lastIndex = i + 1; const match = IDENT.exec(text);
      if (match) { const source = ch === "@" ? "actor" : "input"; push(`${source}.`, i); for (let n = 0; n < match[0].length; n++) map.push(i + 1 + n); canonical += match[0]; i += 1 + match[0].length; continue; }
    }
    map.push(i); canonical += ch; i++;
  }
  map.push(text.length);
  return { canonical, map };
}
/** `actor.x` → `@x`, `input.x` → `?x`, everything else byte for byte. */
export function resugarFormula(expression: string): string {
  const tokens = tokenizeFormula(expression); let out = ""; let cursor = 0;
  for (let n = 0; n < tokens.length; n++) {
    const token = tokens[n]!, dot = tokens[n + 1], field = tokens[n + 2];
    if (token.kind === "word" && (token.text === "actor" || token.text === "input") && dot?.kind === "dot" && dot.start === token.end && field?.kind === "word" && field.start === dot.end) {
      out += expression.slice(cursor, token.start) + SIGIL[token.text as "actor" | "input"] + field.text; cursor = field.end; n += 2;
    }
  }
  return out + expression.slice(cursor);
}
const member = (sources: FormulaSources, source: "actor" | "input", id: string): FormulaMember | undefined => sources[source].find(m => m.id === id);
function suggestion(sources: FormulaSources, source: "actor" | "input", id: string): string | undefined {
  const distance = (a: string, b: string): number => {
    const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array<number>(b.length).fill(0)]);
    for (let j = 1; j <= b.length; j++) d[0]![j] = j;
    for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i]![j] = Math.min(d[i - 1]![j]! + 1, d[i]![j - 1]! + 1, d[i - 1]![j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1));
    return d[a.length]![b.length]!;
  };
  return [...sources[source]].map(m => ({ id: m.id, d: distance(id, m.id) })).filter(m => m.d <= 2).sort((a, b) => a.d - b.d)[0]?.id;
}
function explain(code: FormulaErrorCode, detail: { message: string; expected?: string; name?: string }, sources: FormulaSources): string {
  switch (code) {
    case "invalid-token": return "Dieses Zeichen gehört nicht in eine Formel.";
    case "expected": return detail.expected === ")" ? "Hier fehlt eine schließende Klammer." : detail.expected === "end" ? "Nach diesem Wert fehlt ein Rechenzeichen wie + oder *." : detail.expected === "field" ? "Nach @ oder ? gehört eine Kennung, zum Beispiel @geschick." : "Nach dem Rechenzeichen fehlt noch ein Wert, zum Beispiel eine Zahl, ein Würfel oder ein Attribut.";
    case "unsupported-function": return `„${detail.name}“ kennt die Schmiede nicht. Erlaubt sind min, max, floor, ceil, round, abs und if.`;
    case "unknown-field": { const [source, id] = (detail.name ?? "actor.").split(".") as ["actor" | "input", string]; const hint = suggestion(sources, source, id); const what = source === "actor" ? "Das Attribut" : "Den Parameter"; return `${what} „${id}“ gibt es nicht.${hint ? ` Meintest du „${hint}“?` : ""}`; }
    case "argument-count": return detail.name === "if" ? "„if“ braucht genau drei Werte: Bedingung, dann, sonst." : detail.name === "min" || detail.name === "max" ? `„${detail.name}“ braucht mindestens zwei Werte.` : `„${detail.name}“ braucht genau einen Wert.`;
    case "limit": return "Diese Formel ist zu lang oder zu tief verschachtelt. Teile sie in einen abgeleiteten Wert auf.";
    case "dice": return "Würfel schreibt man als Anzahl, d und Seiten, zum Beispiel 1d20 oder 2d6; mindestens 2 Seiten, höchstens 100 Würfel.";
    case "number": return "Diese Zahl ist zu groß. Erlaubt sind Werte bis eine Billion.";
    case "type": { const wanted = /expected (number|boolean|string)/.exec(detail.message)?.[1] as FormulaType | undefined; return wanted ? `Hier wird ${wanted === "number" ? "eine Zahl" : wanted === "boolean" ? "Ja/Nein" : "ein Text"} gebraucht.` : "Die Werte passen hier nicht zusammen."; }
  }
}
/** Refines a type error with the offending reference, e.g. „aber „Vertraut“ ist Ja/Nein“. */
function typeDetail(message: string, spanText: string, sources: FormulaSources): string {
  const ref = /^([@?])([a-z][a-z0-9_]*)$/.exec(spanText.trim()); if (!ref) return message;
  const found = member(sources, ref[1] === "@" ? "actor" : "input", ref[2]!); if (!found) return message;
  return message.replace(/ gebraucht\.$/, ` gebraucht, aber „${found.label}“ ist ${typeWord(found.type)}.`);
}
function spansOf(canonical: string, map: readonly number[], sources: FormulaSources): HighlightSpan[] {
  const tokens = tokenizeFormula(canonical), spans: HighlightSpan[] = [];
  const back = (start: number, end: number): [number, number] => [map[start]!, map[end]!];
  for (let n = 0; n < tokens.length; n++) {
    const token = tokens[n]!, dot = tokens[n + 1], field = tokens[n + 2];
    if (token.kind === "word" && (token.text === "actor" || token.text === "input") && dot?.kind === "dot" && field?.kind === "word") {
      const found = member(sources, token.text, field.text), [start, end] = back(token.start, field.end);
      spans.push({ kind: token.text === "actor" ? "attribute" : "parameter", start, end, ...(found ? { title: found.label } : { missing: true }) }); n += 2; continue;
    }
    const [start, end] = back(token.start, token.end);
    const kind: SpanKind = token.kind === "word" ? (token.text === "true" || token.text === "false" ? "keyword" : "function") : token.kind === "string" ? "text" : token.kind === "comma" || token.kind === "dot" ? "operator" : token.kind;
    spans.push({ kind, start, end, ...(kind === "function" ? { title: FUNCTION_HELP.find(f => f.name === token.text)?.title ?? "" } : {}) });
  }
  return spans;
}
export function analyzeFormula(text: string, sources: FormulaSources, options: FormulaOptions): FormulaAnalysis {
  const { canonical, map } = desugarFormula(text), spans = spansOf(canonical, map, sources);
  const failure = (error: FormulaError): FormulaAnalysis => ({ text, canonical, ok: false, error, spans });
  if (!text.trim()) return failure({ code: "empty", message: "Trage eine Formel ein, zum Beispiel 1d20 + @geschick.", start: 0, end: 0 });
  const path = /(^|[^"\w])([?@])[a-z][a-z0-9_-]*(\.[a-z][a-z0-9_-]*)+/.exec(text);
  if (path) { const start = path.index + path[1]!.length; return failure({ code: "object-path", message: "Werte von Gegenständen kommen mit einem späteren Schritt; heute gibt es nur Attribute und Parameter.", start, end: start + path[0].length - path[1]!.length }); }
  const detail = parseFormulaDetailed(canonical, fieldTypesOf(sources));
  if (!detail.ok) {
    const start = map[detail.start] ?? text.length, end = map[detail.end] ?? text.length;
    let message = explain(detail.code, detail, sources);
    if (detail.code === "type") message = typeDetail(message, text.slice(start, end), sources);
    return failure({ code: detail.code, message, start, end });
  }
  const dice = spans.find(s => s.kind === "dice");
  const knowledge = spans.find(s => s.kind === "function" && KNOWLEDGE.has(text.slice(s.start, s.end)));
  if (!options.allowDice && dice) return failure({ code: "dice-forbidden", message: "Würfel sind hier nicht erlaubt: Dieser Wert gilt ohne Wurf. Nutze Attribute und Zahlen.", start: dice.start, end: dice.end });
  if (!options.allowKnowledge && knowledge) return failure({ code: "knowledge-forbidden", message: "Das Wissen der Figur lässt sich hier nicht abfragen, nur in der Ergebnisformel einer Aktion.", start: knowledge.start, end: knowledge.end });
  return { text, canonical, ok: true, ast: detail.ast, spans };
}
export function completionsAt(text: string, caret: number, sources: FormulaSources, options: FormulaOptions): Completion | null {
  const before = text.slice(0, caret), match = /([@?])([a-zA-Z0-9_-]*)$|(?:^|[^a-zA-Z0-9_@?"])([a-zA-Z][a-zA-Z0-9_]*)$|(\d{1,3}d[a-z0-9!]*)$/.exec(before);
  if (!match) return null;
  const fold = (value: string) => value.toLocaleLowerCase("de");
  if (match[1]) {
    const source = match[1] === "@" ? "actor" : "input", query = fold(match[2] ?? ""), start = caret - match[0].length;
    if (source === "input" && !sources.input.length) return { start, end: caret, items: [{ kind: "note", insert: "", title: "Hier gibt es keine Parameter.", detail: "Parameter gibt es nur bei Aktionen, weil sie beim Würfeln abgefragt werden. Nutze Attribute mit @." }] };
    const items: CompletionItem[] = sources[source].filter(m => !query || fold(m.id).includes(query) || fold(m.label).includes(query)).map(m => m.id.includes("-")
      ? { kind: "note" as const, insert: "", title: m.label, detail: `Kennungen mit Bindestrich lassen sich in Formeln nicht verwenden. Benenne das Attribut um, zum Beispiel ${m.id.replaceAll("-", "_")}.` }
      : { kind: source === "actor" ? "attribute" as const : "parameter" as const, insert: `${match[1]}${m.id}`, title: m.label, detail: `${m.id} · ${typeWord(m.type)}` });
    return { start, end: caret, items };
  }
  if (match[3]) {
    const query = fold(match[3]), start = caret - match[3].length;
    const items = FUNCTION_HELP.filter(f => (options.allowKnowledge || !f.knowledge) && f.name.startsWith(query)).map(f => ({ kind: "function" as const, insert: f.insert, title: f.name, detail: f.title }));
    return items.length ? { start, end: caret, items } : null;
  }
  if (!options.allowDice) return null;
  const typed = fold(match[0]), start = caret - match[0].length;
  const items = DICE_SUGGESTIONS.filter(d => typed.endsWith("d") || d.insert.startsWith(typed)).map(d => ({ kind: "dice" as const, insert: d.insert, title: d.insert, detail: d.title }));
  return items.length ? { start, end: caret, items } : null;
}
