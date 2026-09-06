/**
 * Der importierte Eron-Korpus: 74 Artikel, erzeugt von `scripts/import-wiki.mjs`
 * aus `design/fixtures/eron/articles.json`.
 *
 * Prosa: Eron Wiki (eron.fandom.com/de) · CC BY-SA 3.0 · Welt von Kaya und
 * Kollegen. Beispiel-Universum, nie Produktinhalt (Invariante K7).
 */

import generated from "./wiki.generated.json";

export type Span =
  | { t: "text"; v: string }
  | { t: "b"; v: string }
  | { t: "i"; v: string }
  | { t: "link"; v: string; to: string };

export type Block =
  | { kind: "p"; spans: Span[] }
  | { kind: "ul"; items: Span[][] }
  | { kind: "ol"; items: Span[][] }
  | { kind: "table"; headers: string[]; rows: Span[][][] };

export interface WikiSection {
  level: number;
  heading: string | null;
  blocks: Block[];
}

export interface WikiArticle {
  id: string;
  title: string;
  kind: string;
  lead: Span[] | null;
  facts: [string, string][];
  sections: WikiSection[];
  links: string[];
  backlinks: string[];
  redLinks: string[];
  image: string | null;
  bytes: number;
  lastEdit: string;
  sectionCount: number;
}

/* Medien liegen als echte Assets neben der Fixture; Vite löst sie zu URLs auf. */
const mediaUrls = import.meta.glob<string>(
  "../../fixtures/eron/media/*.webp",
  { eager: true, query: "?url", import: "default" },
);
const mediaByFile = new Map(
  Object.entries(mediaUrls).map(([filePath, url]) => [
    filePath.split("/").pop() as string,
    url,
  ]),
);

export const ARTICLES = (generated.articles as WikiArticle[]).map((article) => ({
  ...article,
  image: article.image ? (mediaByFile.get(article.image) ?? null) : null,
}));

export const ARTICLE_BY_TITLE = new Map(ARTICLES.map((a) => [a.title, a]));

export const articleExists = (title: string) => ARTICLE_BY_TITLE.has(title);

/** Startartikel der Welt-Bühne: die Organisation, an der die Kampagne hängt. */
export const DEFAULT_ARTICLE = "Flüsterer";

export const plainText = (spans: Span[] | null): string =>
  (spans ?? []).map((s) => s.v).join("");

/** Wortzahl eines Artikels — Grundlage für „Umfang" in der Übersicht. */
export const articleWords = (article: WikiArticle): number =>
  plainText(article.lead).split(/\s+/).filter(Boolean).length +
  article.sections.reduce(
    (sum, section) =>
      sum +
      section.blocks.reduce(
        (blockSum, block) =>
          blockSum +
          (block.kind === "p"
            ? plainText(block.spans).split(/\s+/).filter(Boolean).length
            : 0),
        0,
      ),
    0,
  );

export interface SearchHit {
  article: WikiArticle;
  score: number;
  snippet: string;
}

/** Titel- und Volltextsuche über den ganzen Korpus. */
export function searchArticles(query: string, limit = 12): SearchHit[] {
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return ARTICLES.slice(0, limit).map((article) => ({
      article,
      score: 0,
      snippet: plainText(article.lead).slice(0, 120),
    }));
  }

  const hits: SearchHit[] = [];
  for (const article of ARTICLES) {
    const title = article.title.toLowerCase();
    let score = 0;
    if (title === needle) score = 100;
    else if (title.startsWith(needle)) score = 80;
    else if (title.includes(needle)) score = 60;

    const lead = plainText(article.lead);
    const bodyIndex = lead.toLowerCase().indexOf(needle);
    if (bodyIndex !== -1) score = Math.max(score, 40);

    let snippet = lead.slice(0, 120);
    if (score === 40 && bodyIndex !== -1) {
      const from = Math.max(0, bodyIndex - 40);
      snippet = `${from > 0 ? "…" : ""}${lead.slice(from, from + 120)}`;
    }

    if (score === 0) {
      /* Volltext über die Abschnitte — teurer, deshalb zuletzt. */
      const found = article.sections.some((section) =>
        section.blocks.some(
          (block) =>
            block.kind === "p" &&
            plainText(block.spans).toLowerCase().includes(needle),
        ),
      );
      if (found) score = 20;
    }

    if (score > 0) hits.push({ article, score, snippet });
  }

  return hits
    .sort((a, b) => b.score - a.score || a.article.title.localeCompare(b.article.title, "de"))
    .slice(0, limit);
}

/** Die häufigsten roten Links — was die Welt als Nächstes braucht. */
export function topRedLinks(limit = 8): { title: string; wanted: number }[] {
  const counts = new Map<string, number>();
  for (const article of ARTICLES) {
    for (const red of article.redLinks) {
      counts.set(red, (counts.get(red) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([title, wanted]) => ({ title, wanted }))
    .sort((a, b) => b.wanted - a.wanted || a.title.localeCompare(b.title, "de"))
    .slice(0, limit);
}

export const CORPUS_STATS = {
  articles: ARTICLES.length,
  words: ARTICLES.reduce((sum, a) => sum + articleWords(a), 0),
  sections: ARTICLES.reduce((sum, a) => sum + a.sections.length, 0),
  links: ARTICLES.reduce((sum, a) => sum + a.links.length, 0),
  redLinks: new Set(ARTICLES.flatMap((a) => a.redLinks)).size,
};
