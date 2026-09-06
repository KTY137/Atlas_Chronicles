import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { decomposeWiki } from "../src/index.ts";
import type { EronArticle, EronTemplate } from "../src/index.ts";

/**
 * Audit blocker **B1** — "die Infobox steht nicht bei Offset 0".
 *
 * `design/fixtures/eron/PRUEFUNG.md` filed this against RB-12 §2.4, whose step 1 reads
 * "scan balanced `{{…}}` **from offset 0**". On a real corpus that rule throws away every
 * field of any article whose infobox sits behind a lead sentence: the call falls into BODY and
 * is quarantined as an unknown template. The text survives (it becomes a `rohblock`, because
 * nothing is ever silently dropped) but the STRUCTURE is gone — and the structure is the
 * product. `die geteilte Infobox` is the majority of all atoms in this corpus.
 *
 * The corrected rule, implemented in `wikitext.ts`: **an infobox is an infobox because its
 * template declares `<infobox>`, not because of where it happens to start.**
 *
 * Measured on the real corpus, before -> after: `feld` 535 -> 574 (+39), `rohblock` 43 -> 38,
 * losses 88 -> 79, text conservation 99.91 % -> 99.94 %.
 *
 * Two corrections to the audit, both recorded here so the next reader inherits the measurement
 * rather than the claim:
 *   1. The audit named FIVE articles. There are SIX — it missed `Remus' Kaiserreich`, whose
 *      infobox sits behind a `{{DISPLAYTITLE:}}` *and* a lead sentence, and which alone
 *      accounts for 14 of the 39 fields.
 *   2. The audit priced `Haus der Münze` at 22 fields; it has SEVEN parameter rows. The 22
 *      counts bullet VALUES (`aufgabe` and `mitglieder` each carry several). Under the V1 atom
 *      rule a row is one passage carrying an ordered `werte[]`, so seven is the right number
 *      and the audit's total of 40 landed near the true 39 by a coincidence of composition.
 */

const fixture = (name: string) =>
  JSON.parse(readFileSync(new URL(`../../../design/fixtures/eron/${name}`, import.meta.url), "utf8"));

const articles = fixture("articles.json") as EronArticle[];
const templates = fixture("templates.json") as EronTemplate[];
const article = (title: string) => articles.find((a) => a.title === title)!;
const fields = (title: string) =>
  decomposeWiki(article(title).wikitext!, article(title).pageid, templates).blocks.filter(
    (b) => b.inhalt.kind === "feld",
  );

/** title -> parameter rows that must survive, measured from the source call. */
const B1_ARTICLES: readonly [string, number][] = [
  ["Dunkelelf", 5],
  ["Flusself", 4],
  ["Mensch", 5],
  ["Ork", 4],
  ["Haus der Münze", 7],
  ["Remus' Kaiserreich", 14],
];

describe("B1 — an infobox behind a lead sentence still becomes fields", () => {
  it.each(B1_ARTICLES)("recovers every parameter row of %s", (title, expected) => {
    expect(fields(title)).toHaveLength(expected);
  });

  it("recovers 39 field rows in total across the six affected articles", () => {
    const total = B1_ARTICLES.reduce((sum, [title]) => sum + fields(title).length, 0);
    expect(total).toBe(39);
  });

  it("no longer quarantines those infoboxes as unknown templates", () => {
    for (const [title] of B1_ARTICLES) {
      const blocks = decomposeWiki(article(title).wikitext!, article(title).pageid, templates).blocks;
      const quarantined = blocks.filter(
        (b) => b.inhalt.kind === "rohblock" && b.inhalt.grund === "unbekannte-vorlage" && /^\{\{(?:Rasse|Regierung)/.test(b.inhalt.quelltext),
      );
      expect(quarantined, `${title} still quarantines its infobox`).toHaveLength(0);
    }
  });

  it("keeps the lead prose that sits in front of the infobox", () => {
    // The regression this guards: hoisting the call out of the middle of a sentence must not
    // take the sentence with it. `Ork`'s infobox is glued directly to the end of its lead —
    // a "block-level calls only" rule would have missed it, and a careless removal would have
    // eaten the sentence.
    const ork = decomposeWiki(article("Ork").wikitext!, article("Ork").pageid, templates);
    const prose = ork.blocks.filter((b) => b.inhalt.kind === "absatz");
    expect(prose.length).toBeGreaterThan(0);
    const first = prose[0]!.inhalt;
    expect(first.kind === "absatz" && first.inhalt.map((p) => p.text).join("")).toContain("Ork");
  });

  it("sets the entry type from an infobox that is not at offset 0", () => {
    // The type comes from the template name; if the call is quarantined the article silently
    // becomes `sonstiges`, which is how a typed corpus quietly turns into an untyped one.
    expect(decomposeWiki(article("Dunkelelf").wikitext!, article("Dunkelelf").pageid, templates).art).toBe("spezies");
    expect(decomposeWiki(article("Haus der Münze").wikitext!, article("Haus der Münze").pageid, templates).art).toBe("organisation");
  });

  it("treats an underscored template name as the same template", () => {
    // MediaWiki title normalisation: `Infobox_Charakter` and `Infobox Charakter` are one page.
    // Recorded because a probe written during this investigation got it wrong and mis-attributed
    // 17 fields to the B1 fix that had never been broken at all.
    expect(fields("Bodin").length).toBeGreaterThan(0);
    expect(fields("Irme").length).toBeGreaterThan(0);
  });
});
