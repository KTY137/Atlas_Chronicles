// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const FILES = ["RuleForge.tsx", "RuleActionEditor.tsx", "RuleFieldList.tsx", "RuleDeclarativeEditor.tsx", "RuleForgePreview.tsx", "FormulaField.tsx", "FormulaLine.tsx", "FormulaBlocks.tsx", "FormulaGraph.tsx", "formula-sugar.ts", "formula-example.ts", "formula-graph-model.ts", "RuleMap.tsx", "rule-map-model.ts", "RuleAbilityEditor.tsx", "rule-ability-model.ts"];
const FORBIDDEN = /\b(parser|token|tokenizer|kanonisch\w*|syntax\w*|ast|ports?|skalar\w*|identifier|schema\w*|typinferenz|literal\w*|operand\w*|operator\w*|expression\w*|inputs?|fields?)\b/i;
/** Visible text: JSX text nodes, template/string props that reach the screen, and the plain strings in the German catalogues. */
function visibleStrings(source: string): string[] {
  const out: string[] = [];
  for (const match of source.matchAll(/>([^<>{}\n]+)</g)) out.push(match[1]!);
  for (const match of source.matchAll(/(?:aria-label|title|placeholder|label|help|message|detail|resultLabel)\s*[:=]\s*(?:\{)?\s*(["'`])((?:\\.|(?!\1).)*)\1/g)) out.push(match[2]!.replace(/\$\{[^}]*\}/g, ""));
  // Third pass: any quoted string or backtick template anywhere in the file — including inside
  // `{`…`}`-wrapped JSX children, which the first pass cannot see because it stops at `{`. Prose
  // is the only kind of string literal that contains a space; identifiers, class names, ids and
  // paths never do, so requiring a space is what keeps this pass from re-flagging code as text.
  for (const match of source.matchAll(/(["'`])((?:\\.|(?!\1).)*)\1/g)) {
    // A CSS class list ("ff-port ff-port-in") is space-separated but never reaches the user as
    // text — exempt it the same way identifiers and data-* attributes are already exempt.
    const before = source.slice(Math.max(0, match.index! - 20), match.index!);
    if (/\bclass(?:Name)?\s*=\s*\{?\s*$/.test(before)) continue;
    const content = match[2]!.replace(/\$\{[^}]*\}/g, " ");
    if (content.includes(" ")) out.push(content);
  }
  // TypeScript generics (Record<A, B<C>>) create spurious ">…<" spans outside JSX; a stray
  // leading punctuation mark is the tell that this capture starts mid-declaration, not mid-prose.
  return out.map(s => s.trim()).filter(s => s.length > 2 && !/^[;,:)}\]]/.test(s));
}
describe("plain language in the rule forge", () => {
  it.each(FILES)("%s shows no jargon to the user", file => {
    const source = readFileSync(new URL(`../src/features/${file}`, import.meta.url), "utf8");
    const hits = visibleStrings(source).filter(text => FORBIDDEN.test(text));
    expect(hits, hits.join("\n")).toEqual([]);
  });
});
describe("the gate itself keeps biting", () => {
  it("catches jargon in a static JSX text node", () => {
    const source = 'return <p>Dieses Attribut ist ein Skalar mit festem Typ.</p>;';
    const hits = visibleStrings(source).filter(text => FORBIDDEN.test(text));
    expect(hits.length).toBeGreaterThan(0);
  });
  it("catches jargon inside a `{`…`}`-wrapped template literal JSX child", () => {
    const source = 'return <small>{`Feld ${id} ist ein Skalar mit festem Typ.`}</small>;';
    const hits = visibleStrings(source).filter(text => FORBIDDEN.test(text));
    expect(hits.length).toBeGreaterThan(0);
  });
  it("does not flag a clean German sentence", () => {
    const source = 'return <p>{`Dieses Attribut heißt ${sigil}${id} und trägt einen Wert.`}</p>;';
    const hits = visibleStrings(source).filter(text => FORBIDDEN.test(text));
    expect(hits, hits.join("\n")).toEqual([]);
  });
});
