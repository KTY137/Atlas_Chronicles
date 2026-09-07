// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { trustUniverseId } from "@chronicle/core";
import { decomposeWiki, importEron, namespaceLinkTarget, wikiSlug } from "../src/index.ts";
import type { EronArticle, EronTemplate } from "../src/index.ts";

/**
 * DIE KANTENERHALTUNG — assertion A9's missing sibling.
 *
 * A9 measures TEXT conservation and it is a good gate, but it has a blind spot that cost us
 * three real defects in one afternoon: **a quarantined block keeps its text.** When
 * `unsupported()` wrongly decided a paragraph was raw HTML, when an infobox behind a lead
 * sentence fell into the body, and when a wikitable was refused conversion — nothing was lost
 * as bytes. A9 sat at 99.9 % throughout and said nothing. What was lost was STRUCTURE, and in a
 * product whose headline is *„der rote Link ist eine Tür"* the link graph IS the product. A link
 * inside a `rohblock` is invisible to the door graph, and a door that is never extracted can
 * never be triaged, ranked or opened.
 *
 * So: we had an anti-loss gate for bytes and none for edges. This is the one for edges, and it
 * computes over the same source as A9 so no second notion of truth enters the codebase.
 *
 * The invariant: **every article link in the source is either extracted, or refused for a named
 * reason. Unexplained shortfall must be zero.**
 *
 * What this gate found and forced, in order:
 *   1. B1 — infoboxes behind a lead sentence, 39 field rows quarantined instead of parsed
 *   2. `<nowiki/>` — the empty separator read as raw HTML, 4 paragraphs quarantined
 *   3. namespace links — `Kategorie:` and `Map:` counted as doors, i.e. as demand for pages
 *      nobody can ever write
 *   4. the harvest — §2.8 keeps an unconvertible block RAW, which is a statement about
 *      STRUCTURE and must not quietly become one about DEMAND
 *
 * The end state is the one the corpus always claimed and had never once reproduced with running
 * code: **689 doors, triaged 113 / 100 / 472 / 4**, byte-for-byte RB-12's assertion A8.
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
        `  Kantenerhaltung                  ${((extracted.size / inSource.size) * 100).toFixed(2)} %`,
        "",
      ].join("\n"),
    );
    expect(shortfall, `missing link targets: ${shortfall.slice(0, 20).join(", ")}`).toHaveLength(0);
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

  it("harvests the refused wikitable's doors without converting it", () => {
    // Both halves of §2.8 must hold at once, which is the whole point of the harvest:
    //   - nothing silently DROPPED: the 51 noble houses are real doors and are registered
    //   - nothing silently PROMOTED: the table itself is still a rohblock, still verbatim,
    //     still rendered as „Aus dem Wiki übernommen — nicht umgewandelt"
    const doors = new Set(result.redLinks.map((d) => d.zielSlug));
    for (const house of ["Haus Hohenstein", "Haus Eisklinge", "Die Schlangenburg", "Burg Hohenstein"]) {
      expect(doors, `${house} should be an open door`).toContain(house);
    }
    const tables = result.passages.filter(
      (p) => p.inhalt.kind === "rohblock" && p.inhalt.grund === "wikitabelle",
    );
    expect(tables, "the corpus's single wikitable must stay unconverted").toHaveLength(1);
    const table = tables[0]!.inhalt;
    expect(table.kind === "rohblock" && table.quelltext.startsWith("{|")).toBe(true);
  });

  it("never promotes a namespace link to a door", () => {
    // `[[Kategorie:Charaktere]]` is a classification and `[[Map:Andaria]]` is an interactive
    // map. Both were being counted as red links — demand for an article nobody can ever write.
    for (const door of result.redLinks) expect(namespaceLinkTarget(door.zielSlug)).toBe(false);
    const doors = new Set(result.redLinks.map((d) => d.zielSlug));
    expect(doors.has("Kategorie:Charaktere")).toBe(false);
    expect(doors.has("Map:Andaria")).toBe(false);
  });

  it("reproduces the fixture's door set exactly", () => {
    const theirs = new Set(graph.redlink_targets_by_incoming.map((row) => wikiSlug(row.title)));
    const ours = new Set(result.redLinks.map((d) => d.zielSlug));
    const missing = [...theirs].filter((t) => !ours.has(t));
    const surplus = [...ours].filter((t) => !theirs.has(t));
    console.log(`  Türen: graph.json ${theirs.size} · unsere ${ours.size} · fehlend ${missing.length} · zusätzlich ${surplus.length}`);
    expect(missing, `doors we lack: ${missing.slice(0, 20).join(", ")}`).toHaveLength(0);
    expect(surplus, `doors we invented: ${surplus.slice(0, 20).join(", ")}`).toHaveLength(0);
  });

  it("reproduces RB-12 assertion A8's door triage, which nothing had ever reproduced", () => {
    // 113 / 100 / 472 / 4. The corpus asserted these four numbers; no artefact in the lineage
    // had ever produced them from running code. They were right all along — we were
    // under-extracting.
    expect(result.report.tuerbilanz).toEqual({ tuer: 113, spur: 100, notiz: 472, verworfen: 4 });
    expect(result.report.distinkteRoteZiele).toBe(689);
  });
});
