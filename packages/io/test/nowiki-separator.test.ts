import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { decomposeWiki, parseWikiInline, inlinePlainText, blockPlainText } from "../src/index.ts";
import type { EronArticle, EronTemplate } from "../src/index.ts";

/**
 * The empty `<nowiki/>` separator.
 *
 * MediaWiki's self-closing `<nowiki/>` renders NOTHING. Its only job is to stop a link trail or
 * a list marker from continuing: `[[Waldelf|Wald-]]<nowiki/>und` must render "Wald-und" with
 * only "Wald-" inside the link.
 *
 * The defect it caused here was quiet and expensive. `unsupported()` strips PAIRED nowiki, saw
 * the bare tag left over, concluded "this paragraph contains raw HTML", and quarantined it as a
 * `rohblock`. Nothing was lost as text — the quarantine is honest, which is exactly why the
 * text-conservation gate stayed green at 99.9 % and never flagged it. What was lost was
 * STRUCTURE: four real paragraphs, and with them **39 link edges** (20 blue, 19 red) that never
 * reached the door graph. A door that is never extracted cannot be triaged, ranked or opened.
 *
 * Measured on the real corpus, before -> after:
 *   rohblock 38 -> 34 · absatz 479 -> 483 · blue edges 1070 -> 1090 · red edges 1798 -> 1817
 *   distinct doors 639 -> 640 · tuer 107 -> 108 · spur 87 -> 91 · losses 79 -> 75
 *
 * The ordering rule this file also guards: the empty form must be matched BEFORE the paired
 * form, because `<nowiki\b[^>]*>` matches `<nowiki/>` (the `[^>]*` eats the slash) and would
 * then swallow everything up to some later `</nowiki>`.
 */

const fixture = (name: string) =>
  JSON.parse(readFileSync(new URL(`../../../design/fixtures/eron/${name}`, import.meta.url), "utf8"));

const articles = fixture("articles.json") as EronArticle[];
const templates = fixture("templates.json") as EronTemplate[];
const article = (title: string) => articles.find((a) => a.title === title)!;

describe("the empty <nowiki/> separator", () => {
  it("renders as nothing and does not leak into the text", () => {
    const inline = parseWikiInline("Wald-<nowiki/>und Seeelfen");
    expect(inlinePlainText(inline)).toBe("Wald-und Seeelfen");
  });

  it("stops a link trail without being emitted", () => {
    // Without the separator the German linktrail absorbs "en" into the link.
    const withTrail = parseWikiInline("[[Zwerg|Zwerg]]en leben hier");
    expect(withTrail[0]!.marks.some((m) => m.art === "link")).toBe(true);
    expect(inlinePlainText(withTrail)).toBe("Zwergen leben hier");

    const stopped = parseWikiInline("[[Waldelf|Wald-]]<nowiki/>und Seeelfen");
    expect(inlinePlainText(stopped)).toBe("Wald-und Seeelfen");
    const linked = stopped.filter((part) => part.marks.some((m) => m.art === "link"));
    expect(inlinePlainText(linked)).toBe("Wald-");
  });

  it("is matched before the paired form, so it cannot swallow to a later closing tag", () => {
    // If the empty form were tried second, `<nowiki\b[^>]*>` would match `<nowiki/>` and consume
    // everything through to `</nowiki>`, silently deleting "MITTE".
    const inline = parseWikiInline("A<nowiki/>MITTE<nowiki>B</nowiki>C");
    expect(inlinePlainText(inline)).toBe("AMITTEBC");
  });

  it("does not make a paragraph look like raw HTML", () => {
    const blocks = decomposeWiki(
      "Die Bevölkerung umfasst [[Kobold|Kobolde]], [[Waldelf|Wald-]]<nowiki/>und Seeelfen sowie weitere Völker der Region.",
      1,
      [],
    ).blocks;
    expect(blocks).toHaveLength(1);
    expect(blocks[0]!.inhalt.kind).toBe("absatz");
  });

  it("keeps the real corpus's affected paragraphs out of the quarantine", () => {
    // Bjoldiri and Kaiserthing are the only two articles in the corpus that use it.
    for (const title of ["Bjoldiri", "Kaiserthing"]) {
      const { blocks } = decomposeWiki(article(title).wikitext!, article(title).pageid, templates);
      const quarantinedProse = blocks.filter(
        (b) => b.inhalt.kind === "rohblock" && /<nowiki\s*\/>/i.test(b.inhalt.quelltext),
      );
      expect(quarantinedProse, `${title} still quarantines a paragraph over an empty separator`).toHaveLength(0);
    }
  });

  it("releases the links those paragraphs carry into the graph", () => {
    // The point of the fix: structure, not bytes. A link inside a rohblock is invisible to the
    // door graph, so a quarantined paragraph is a silently missing set of doors.
    const { blocks } = decomposeWiki(article("Bjoldiri").wikitext!, article("Bjoldiri").pageid, templates);
    const prose = blocks.filter((b) => b.inhalt.kind === "absatz");
    const targets = new Set<string>();
    for (const block of prose) {
      if (block.inhalt.kind !== "absatz") continue;
      for (const part of block.inhalt.inhalt) {
        for (const mark of part.marks) if (mark.art === "link") targets.add(mark.zielSlug);
      }
    }
    for (const expected of ["Kobold", "Mensch", "Ork", "Waldelf"]) {
      expect(targets, `Bjoldiri should link to ${expected}`).toContain(expected);
    }
  });

  it("preserves the surrounding sentence verbatim", () => {
    const { blocks } = decomposeWiki(article("Bjoldiri").wikitext!, article("Bjoldiri").pageid, templates);
    const text = blocks.map((b) => blockPlainText(b.inhalt)).join("\n");
    expect(text).not.toContain("<nowiki");
    expect(text).toContain("Bjoldiri");
  });
});
