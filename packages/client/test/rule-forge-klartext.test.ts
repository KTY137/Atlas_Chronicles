// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const FILES = ["RuleForge.tsx", "RuleActionEditor.tsx", "RuleFieldList.tsx", "RuleDeclarativeEditor.tsx", "RuleForgePreview.tsx", "FormulaField.tsx", "FormulaLine.tsx", "FormulaBlocks.tsx", "FormulaGraph.tsx", "formula-sugar.ts", "formula-example.ts", "formula-graph-model.ts"];
const FORBIDDEN = /\b(parser|token|tokenizer|kanonisch\w*|syntax\w*|ast|ports?|skalar\w*|identifier|schema\w*|typinferenz|literal\w*|operand\w*|operator\w*|expression\w*|inputs?|fields?)\b/i;
/** Visible text: JSX text nodes, template/string props that reach the screen, and the plain strings in the German catalogues. */
function visibleStrings(source: string): string[] {
  const out: string[] = [];
  for (const match of source.matchAll(/>([^<>{}\n]+)</g)) out.push(match[1]!);
  for (const match of source.matchAll(/(?:aria-label|title|placeholder|label|help|message|detail|resultLabel)\s*[:=]\s*(?:\{)?\s*(["'`])((?:\\.|(?!\1).)*)\1/g)) out.push(match[2]!.replace(/\$\{[^}]*\}/g, ""));
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
