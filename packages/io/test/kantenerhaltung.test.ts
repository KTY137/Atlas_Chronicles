import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { trustUniverseId } from "@chronicle/core";
import { decomposeWiki, importEron, namespaceLinkTarget, wikiSlug } from "../src/index.ts";
import type { EronArticle, EronTemplate } from "../src/index.ts";

/**
 * DIE KANTENERHALTUNG — assertion A9's missing sibling.
 *
 * A9 measures TEXT conservation and it is a good gate, but it has a blind spot that cost us two
 * real defects in one afternoon: **a quarantined block keeps its text.** When `unsupported()`
 * wrongly decided a paragraph was raw HTML, or when an infobox behind a lead sentence fell into
 * the body, nothing was lost as bytes — A9 sat at 99.9 % throughout and said nothing. What was
 * lost was STRUCTURE, and in a product whose headline is *„der rote Link ist eine Tür"* the
 * link graph IS the product. A link inside a `rohblock` is invisible to the door graph, and a
 * door that is never extracted can never be triaged, ranked or opened.
 *
 * So: we had an anti-loss gate for bytes and none for edges. This is the one for edges.
 *
 * The invariant is deliberately not "we extract every link". Some links are *correctly* not
 * extracted, and the gate names each reason instead of tolerating a fudge factor:
 *   - links inside a quarantined block (RB-12 §2.8 — the one wikitable is refused on purpose)
 *   - namespace links (`Kategorie:`, `Map:` …), which are classifications, not missing articles
 * Everything else must be accounted for. **Unexplained shortfall must be zero.**
 *
 * It computes over the same source as A9, so no second notion of truth enters the codebase.
 */

const fixture = (name: string) =>
  JSON.parse(readFileSync(new URL(`../../../design/fixtures/eron/${name}`, import.meta.url), "utf8"));

const articles = fixture("articles.json") as EronArticle[];
const templates = fixture("templates.json") as EronTemplate[];
const graph = fixture("graph.json") as {
  _meta: { distinct_link_targets: number };
  redlink_targets_by_incoming: { title: string }[];
};

/**
 * The fixture's own crawler counts file and category links as classifications rather than link
 * targets, but DOES count other namespaces (its 762 includes `Map:Andaria`). We mirror that
 * boundary here so the two censuses are comparable, and reconcile the remainder explicitly
 * below rather than nudging a number until it matches.
 */
const CLASSIFICATION = /^(?:Datei|File|Bild|Image|Kategorie|Category)\s*:/i;

function targetsIn(wikitext: string): { article: Set<string>; namespace: Set<string> } {
  const article = new Set<string>();
  const namespace = new Set<string>();
  // nowiki and comment regions are not markup and must not be counted as links.
  const text = wikitext.replace(/<nowiki\b[^>]*>[\s\S]*?<\/nowiki\s*>|<!--[\s\S]*?-->/gi, "");
  for (const m of text.matchAll(/\[\[([^\]|]+)/g)) {
    const raw = m[1]!;
    if (CLASSIFICATION.test(raw)) continue;
    const slug = wikiSlug(raw);
    if (!slug) continue;
    if (namespaceLinkTarget(slug)) namespace.add(slug);
    else article.add(slug);
  }
  return { article, namespace };
}

const result = importEron({
  universeId: trustUniverseId("eron"),
  wikiUrl: "https://eron.fandom.com/de/",
  importiertAm: "2026-09-06T12:00:00Z",
  templates,
  articles,
});

const extracted = new Set<string>([
  ...result.links.map((l) => l.zielSlug),
  ...result.redLinks.map((d) => d.zielSlug),
]);

const inSource = new Set<string>();
const inNamespace = new Set<string>();
const quarantined = new Set<string>();
for (const a of articles) {
  if (!a.wikitext) continue;
  const { article: art, namespace: ns } = targetsIn(a.wikitext);
  for (const t of art) inSource.add(t);
  for (const t of ns) inNamespace.add(t);
  for (const block of decomposeWiki(a.wikitext, a.pageid, templates).blocks) {
    if (block.inhalt.kind !== "rohblock") continue;
    for (const t of targetsIn(block.inhalt.quelltext).article) quarantined.add(t);
  }
}

const shortfall = [...inSource].filter((t) => !extracted.has(t));
const unexplained = shortfall.filter((t) => !quarantined.has(t));

describe("die Kantenerhaltung — no link may vanish without a named reason", () => {
  it("accounts for every article link in the source", () => {
    console.log(
      [
        "",
        "  DIE KANTENERHALTUNG",
        "  -------------------",
        `  Artikel-Linkziele im Quelltext   ${inSource.size}`,
        `  Namensraum-Ziele (keine Türen)   ${inNamespace.size}   [${[...inNamespace].join(", ")}]`,
        `  davon extrahiert                 ${extracted.size}`,
        `  Fehlbetrag                       ${shortfall.length}`,
        `    in Quarantäne (§2.8)           ${shortfall.filter((t) => quarantined.has(t)).length}`,
        `    unerklärt                      ${unexplained.length}`,
        `  Kantenerhaltung                  ${((extracted.size / inSource.size) * 100).toFixed(2)} %`,
        "",
      ].join("\n"),
    );
    expect(unexplained, `unexplained missing link targets: ${unexplained.slice(0, 20).join(", ")}`).toHaveLength(0);
  });

  it("agrees with the fixture's own link census once namespaces are added back", () => {
    // The fixture's crawler verified all 762 targets individually against the live wiki, so
    // agreeing with it is what makes our number trustworthy rather than merely self-consistent.
    // The single difference is `Map:Andaria`: the crawler counts it as a target, we classify it
    // as a namespace and refuse to call it a door. Both are defensible; the reconciliation is
    // written down so nobody has to rediscover the off-by-one.
    expect(inSource.size + inNamespace.size).toBe(graph._meta.distinct_link_targets);
    expect([...inNamespace]).toEqual(["Map:Andaria"]);
  });

  it("loses exactly the wikitable, and says so", () => {
    // RB-12 §2.8 refuses to convert a wikitable. That refusal is honest, but it is not free:
    // the corpus's single table is `Liste der Häuser von Andaria`, and it carries 51 distinct
    // targets — the noble houses. They are real, wanted doors that the rule keeps closed.
    // This is a PRODUCT gap, recorded as a measurement rather than discovered later as a
    // surprise: 51 of graph.json's 689 doors, i.e. 7.4 % of the cold-start inventory.
    expect(shortfall).toHaveLength(51);
    expect(shortfall.every((t) => quarantined.has(t))).toBe(true);
    expect(shortfall).toContain("Haus Hohenstein");
  });

  it("never promotes a namespace link to a door", () => {
    // `[[Kategorie:Charaktere]]` is a classification and `[[Map:Andaria]]` is an interactive
    // map. Both were being counted as red links — demand for an article nobody can ever write.
    for (const door of result.redLinks) expect(namespaceLinkTarget(door.zielSlug)).toBe(false);
    const doors = new Set(result.redLinks.map((d) => d.zielSlug));
    expect(doors.has("Kategorie:Charaktere")).toBe(false);
    expect(doors.has("Map:Andaria")).toBe(false);
  });

  it("reports every door the fixture knows about, except the quarantined table", () => {
    const theirs = new Set(graph.redlink_targets_by_incoming.map((row) => wikiSlug(row.title)));
    const ours = new Set(result.redLinks.map((d) => d.zielSlug));
    const missing = [...theirs].filter((t) => !ours.has(t));
    const surplus = [...ours].filter((t) => !theirs.has(t));
    console.log(`  Türen: graph.json ${theirs.size} · unsere ${ours.size} · fehlend ${missing.length} · zusätzlich ${surplus.length}`);
    expect(surplus, `we invented doors: ${surplus.join(", ")}`).toHaveLength(0);
    expect(missing.every((t) => quarantined.has(t)), "a door went missing for a reason other than quarantine").toBe(true);
  });
});
