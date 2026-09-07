import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { canonicalJson, trustUniverseId, type CanonicalValue } from "@chronicle/core";
import { blockPlainText, decomposeWiki, importEron, parseWikiInline, planEronReimport, splitWikiTopLevel, wikiSlug } from "../src/index.ts";
import type { EronArticle, EronImportInput, EronTemplate } from "../src/index.ts";

const articles = JSON.parse(readFileSync(new URL("../../../design/fixtures/eron/articles.json", import.meta.url), "utf8")) as EronArticle[];
const templates = JSON.parse(readFileSync(new URL("../../../design/fixtures/eron/templates.json", import.meta.url), "utf8")) as EronTemplate[];
const config = { universeId: trustUniverseId("eron"), wikiUrl: "https://eron.fandom.com/de/", importiertAm: "2026-09-06T12:00:00Z", templates };
const page = (pageid: number, title: string, wikitext: string): EronArticle => ({ pageid, title, wikitext, ns: 0, revid: 100 + pageid });
const run = (rows: EronArticle[], options: Partial<EronImportInput> = {}) => importEron({ ...config, articles: rows, ...options });

describe("real Eron import", () => {
  it("imports the documented war into 16 fields and 7 prose atoms", () => {
    const article = articles.find((row) => row.title === "Der Große Krieg")!;
    const result = run([article]);
    expect(result.entries[0]?.art).toBe("ereignis");
    expect(result.report.passagenNachArt.feld).toBe(16);
    expect(result.report.passagenNachArt.absatz).toBe(7);
    expect(result.passages).toHaveLength(23);
    expect(result.passages.filter((p) => p.inhalt.kind === "feld" && p.inhalt.schluessel === "Schlachten")[0]?.inhalt)
      .toMatchObject({ mehrwertig: true, werte: expect.any(Array) });
    expect(result.passages.every((p) => p.praegung === null && p.geltung === "notiz")).toBe(true);
  });
  it("retains the infobox-only Arvex article with 18 atoms", () => {
    const result = run([articles.find((row) => row.title === "Arvex Aurelius Paradon")!]);
    expect(result.report.passagenNachArt.feld).toBe(18);
    expect(result.report.passagenNachArt.absatz).toBe(0);
    expect(result.entries).toHaveLength(1);
  });
  it("imports the entire real fixture deterministically and treats its redirect as an alias", () => {
    const first = run(articles), second = run(articles);
    expect(canonicalJson(first as unknown as CanonicalValue)).toBe(canonicalJson(second as unknown as CanonicalValue));
    expect(first.entries).toHaveLength(73);
    expect(first.aliases).toHaveLength(1);
    expect(first.entries.some((entry) => entry.titel === "Kaiserliche Flotte")).toBe(false);
    expect(first.source.articles).toEqual(articles);
    expect(first.source.templates).toEqual(templates);
    expect(first.attributionComplete).toBe(false);
    expect(first.provenance.every((row) => row.status === "incomplete" && !("autoren" in row.value))).toBe(true);
    expect(first.media.length).toBeGreaterThan(0);
    // Without a file inventory nothing is known beyond the reference itself — and that is stated,
    // not guessed. Every figure still gets a stable asset identity so the bytes can arrive later.
    expect(first.media.every((row) => row.licenseStatus === "unbekannt" && row.state === "referenziert")).toBe(true);
    expect(first.media.every((row) => typeof row.assetId === "string" && row.assetId.length === 32)).toBe(true);
  });
  it("accepts explicit author history and preserves attribution instead of attributing it to the importer", () => {
    const result = run([page(1, "Article", "A sufficiently long article paragraph about the source world.")], {
      attributionByPageId: { "1": { complete: true, authors: ["Original author", "Earlier author"], anonymousContributions: 3, revisionSha1: "a".repeat(31) } },
    });
    expect(result.attributionComplete).toBe(true);
    expect(result.provenance[0]).toMatchObject({ status: "complete", value: { autoren: ["Earlier author", "Original author"], anonymeBeitraege: 3 } });
    expect(result.passages[0]?.autorUserId).toBeUndefined();
  });
});

describe("wikitext boundary and losses", () => {
  it("balances nested templates, pipes in links, and nowiki separators", () => {
    expect(splitWikiTopLevel("Person|Name=[[House|Label]]|Other={{Nested|a=b}}|Literal=<nowiki>|</nowiki>"))
      .toEqual(["Person", "Name=[[House|Label]]", "Other={{Nested|a=b}}", "Literal=<nowiki>|</nowiki>"]);
    const result = decomposeWiki("{{Person|Name=A|Verwandte=*[[First|Brother]]\n*[[Second]]|Haut={{Unknown|x=y}}}}Lead prose directly after the final brace is retained correctly.", 1, templates);
    expect(result.blocks.filter((row) => row.inhalt.kind === "feld")).toHaveLength(2);
    expect(result.blocks.some((row) => row.inhalt.kind === "rohblock" && row.inhalt.quelltext.includes("{{Unknown|x=y}}"))).toBe(true);
    expect(result.blocks.at(-1)?.inhalt.kind).toBe("absatz");
  });
  it("keeps German linktrails, accents and first-letter canonicalization", () => {
    expect(wikiSlug(" n._K.#Zeit ")).toBe("N. K.");
    const inline = parseWikiInline("'''[[Kaiserreich]]s''' und <nowiki>[[Kein Link]]</nowiki>");
    expect(inline[0]).toMatchObject({ text: "Kaiserreichs", marks: [{ art: "strong" }, { art: "link", zielSlug: "Kaiserreich" }] });
    expect(inline.at(-1)).toEqual({ text: "[[Kein Link]]", marks: [] });
  });
  it("preserves unsafe/unknown constructs in inert raw blocks with explicit losses", () => {
    const source = "{{Unknown|deep={{Other|x=1}}}}\n\n<script>alert('x')</script>\n\n{| class=table\n| content\n|}\n\n== Empty heading ==";
    const result = run([page(1, "Unknown", source)]);
    expect(result.passages).toHaveLength(3);
    expect(result.passages.every((row) => row.inhalt.kind === "rohblock")).toBe(true);
    expect(result.report.verluste.filter((row) => row.art === "nicht-umgewandelt")).toHaveLength(3);
    expect((result.source.articles as EronArticle[])[0]?.wikitext).toBe(source);
  });
  it("separates heading addresses, quote/list atoms, short losses and file markup from prose", () => {
    const source = "== History ==\n=== Empty ===\n== People ==\n* A\n* B\n\n<blockquote>A quoted statement.</blockquote>\n\nShort\n\n[[Datei:Portrait.jpg|mini|Caption]]\nThis is a sufficiently long paragraph about the portrait's subject.";
    const result = run([page(1, "Portrait", source)]);
    // The file markup is still lifted out of the paragraph before its identity is calculated —
    // but it now lands as a figure with its caption, not in the quarantine card it used to get.
    expect(result.report.passagenNachArt).toMatchObject({ liste: 1, zitat: 1, absatz: 1, bildunterschrift: 1, rohblock: 0 });
    expect(result.passages.every((p) => p.pfad.join("/") === "People")).toBe(true);
    expect(result.report.verluste.some((loss) => loss.art === "kurzer-absatz" && loss.detail === "Short")).toBe(true);
    const paragraph = result.passages.find((p) => p.inhalt.kind === "absatz")!;
    expect(blockPlainText(paragraph.inhalt)).not.toContain("Portrait.jpg");
    const figure = result.passages.find((p) => p.inhalt.kind === "bildunterschrift")!;
    expect(blockPlainText(figure.inhalt)).toBe("Caption");
    expect(figure.inhalt).toMatchObject({ dateiname: "Portrait.jpg" });
    expect(result.media[0]?.fileName).toBe("Portrait.jpg");
  });
  it("counts missing target demand once per article and rejects notation links", () => {
    const result = run([1, 2, 3].map((i) => page(i, `Article ${i}`, "[[Andaria]] and [[Andaria]] are mentioned; [[n. K.]] is a date suffix here.")));
    expect(result.redLinks).toContainEqual({ zielSlug: "Andaria", eingehend: 3, klasse: "tuer" });
    expect(result.redLinks).toContainEqual({ zielSlug: "N. K.", eingehend: 3, klasse: "verworfen" });
    expect(result.links.some((link) => link.zielSlug === "N. K.")).toBe(false);
  });
  it("resolves redirect chains and reports missing/cyclic targets without inventing entries", () => {
    const result = run([page(1, "A", "#REDIRECT [[B]]"), page(2, "B", "#REDIRECT [[C]]"), page(3, "C", "This is a long enough article body to remain a readable passage."), page(4, "Loop", "#REDIRECT [[Loop]]")]);
    expect(result.entries).toHaveLength(1); expect(result.aliases).toHaveLength(2);
    expect(result.report.verluste.some((loss) => loss.bezeichnung === "Loop")).toBe(true);
  });
});

describe("review-only reimport and input validation", () => {
  const a = "An existing paragraph that describes the first ancient kingdom in detail.";
  const b = "A second existing paragraph that describes a different ancient kingdom.";
  it("keeps identities across reordering, duplicate content and newly resolved links", () => {
    const first = run([page(1, "Source", `${a}\n\n${b}\n\n${a}`)]);
    const next = run([page(1, "Source", `${b}\n\n== New heading ==\n${a}\n\n${a}`)]);
    const plan = planEronReimport(first, next);
    expect(plan.unchanged).toHaveLength(3); expect(plan.additions).toHaveLength(0); expect(plan.removalCandidates).toHaveLength(0);
    expect(plan.unchanged.every((row) => row.existingPassageId === row.candidatePassageId)).toBe(true);
    expect(new Set(first.passages.map((p) => p.pid)).size).toBe(3);
  });
  it("proposes additions/removals without deleting or mutating existing historical passages", () => {
    const first = run([page(1, "Source", a)]), saved = JSON.stringify(first);
    const plan = planEronReimport(first, run([page(1, "Source", b)]));
    expect(plan.reviewRequired).toBe(true); expect(plan.additions).toHaveLength(1); expect(plan.removalCandidates).toEqual(first.passages);
    expect(JSON.stringify(first)).toBe(saved);
  });
  it("rejects malformed input, duplicate identity, dangerous JSON keys and unsafe URLs", () => {
    expect(() => run([page(1, "A", a), page(1, "B", b)])).toThrow(/duplicate/);
    expect(() => importEron({ ...config, articles: [{ title: "Missing" }] })).toThrow();
    expect(() => run([page(1, "A", a)], { wikiUrl: "javascript:alert(1)" })).toThrow(/HTTP/);
    expect(() => run(JSON.parse('[{"__proto__":{"polluted":true}}]'))).toThrow(/unsafe/);
    expect(() => run([page(1, "A", "{{".repeat(65) + "}}".repeat(65))])).toThrow(/depth/);
  });
});

describe("Kategorien des Quellwikis", () => {
  it("hebt die Kategorie auf, statt sie nur als Namensraum-Link zu verwerfen", () => {
    const result = run([page(9001, "Sethra die Stumme", "Eine Göttin, die niemand nennt, und die deshalb in keiner Chronik steht. [[Kategorie:Charaktere]]")]);
    const entry = result.entries[0]!;
    expect(result.kategorien).toEqual([{ entryId: entry.id, name: "Charaktere", slug: wikiSlug("Charaktere") }]);
    // Sie bleibt dabei, was sie war: keine Tür und kein Rotlink.
    expect(result.redLinks.some((row) => /Kategorie/i.test(String(row.zielSlug)))).toBe(false);
    expect(result.links.some((row) => /Kategorie/i.test(row.zielSlug))).toBe(false);
  });

  it("nennt jede Kategorie des echten Korpus genau einmal je Artikel", () => {
    const result = run(articles);
    const doppelt = result.kategorien.filter((row, index) =>
      result.kategorien.findIndex((other) => other.entryId === row.entryId && other.slug === row.slug) !== index);
    expect(doppelt).toEqual([]);
    expect(result.kategorien.length).toBeGreaterThan(0);
  });
});
