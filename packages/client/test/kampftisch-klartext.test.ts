// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Am Tisch sitzt eine Spielleitung, kein Entwickler (Kayas Klartext-Regel). Diese Wörter stehen
// in Code, Tests und Spezifikation — nie in dem, was die Oberfläche zeigt.
const FILES = ["Kampftisch.tsx", "Kampfkarte.tsx", "KampfBalken.tsx", "KampfFenster.tsx", "KampfAufnahme.tsx", "kampftisch-model.ts"];
const FORBIDDEN = /\b(projektion\w*|masken?\w*|payload|nutzlast|fingerabdruck|schema\w*|server|token|kennung\w*|actor\w*|vitalwert\w*|sheet|json|id)\b/i;
/** Sichtbarer Text: JSX-Textknoten, beschriftende Eigenschaften und jede Zeichenkette mit Leerzeichen außerhalb von className. */
function visibleStrings(source: string): string[] {
  const out: string[] = [];
  for (const match of source.matchAll(/>([^<>{}\n]+)</g)) out.push(match[1]!);
  for (const match of source.matchAll(/(["'`])((?:\\.|(?!\1).)*)\1/g)) {
    const before = source.slice(Math.max(0, match.index! - 24), match.index!);
    if (/\bclass(?:Name)?\s*=\s*\{?\s*$/.test(before)) continue;
    const content = match[2]!.replace(/\$\{[^}]*\}/g, " ");
    if (content.includes(" ")) out.push(content);
  }
  // Wege zum Server (`/actors/…/sheet/…`) sind keine Anzeige, auch wenn nach dem Ausblenden der
  // Platzhalter ein Leerzeichen darin steht.
  return out.map(s => s.trim()).filter(s => s.length > 2 && !/^[;,:)}\]]/.test(s) && !s.startsWith("/"));
}
describe("Klartext am Kampftisch", () => {
  it.each(FILES)("%s zeigt kein Fachwort", file => {
    const hits = visibleStrings(readFileSync(new URL(`../src/features/${file}`, import.meta.url), "utf8")).filter(text => FORBIDDEN.test(text));
    expect(hits, hits.join("\n")).toEqual([]);
  });
  it("beißt selbst", () => {
    expect(visibleStrings('return <p>Die Maske liegt in der Nutzlast.</p>;').filter(text => FORBIDDEN.test(text))).toHaveLength(1);
  });
});
