/**
 * Der Eron-Korpus als lebender Bestand: importierte Artikel plus alles, was in
 * Chronicle geschrieben wurde. Beide sind dasselbe Objekt — ein importierter
 * Artikel unterscheidet sich nur durch seine Herkunft, nicht durch sein Format.
 *
 * Prosa: Eron Wiki (eron.fandom.com/de) · CC BY-SA 3.0 · Welt von Kaya und
 * Kollegen. Beispiel-Universum, nie Produktinhalt (Invariante K7).
 */

import generated from "./wiki.generated.json";
import { getStore, subscribe } from "./wikiStore";
import {
  kindOf,
  parseWikitext,
  plainText,
  type ParsedArticle,
  type Span,
} from "./wikitext";

export type { Block, Span, WikiSection } from "./wikitext";
export { plainText } from "./wikitext";

interface GeneratedEntry {
  title: string;
  wikitext: string;
  lastEdit: string;
  bytes: number;
  image: string | null;
  source: string;
  license: string;
  revision: number | null;
}

export interface WikiArticle extends ParsedArticle {
  id: string;
  title: string;
  kind: string;
  wikitext: string;
  image: string | null;
  lastEdit: string;
  /** Woher der Artikel stammt — trägt die CC-BY-SA-Pflicht. */
  origin: { source: string; license: string; revision: number | null } | null;
  edited: boolean;
  created: boolean;
  backlinks: string[];
  redLinks: string[];
  words: number;
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

const IMPORTED = (generated as { entries: GeneratedEntry[] }).entries;
const importedByTitle = new Map(IMPORTED.map((e) => [e.title, e]));

const countWords = (article: ParsedArticle): number =>
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

interface Corpus {
  articles: WikiArticle[];
  byTitle: Map<string, WikiArticle>;
  stats: {
    articles: number;
    words: number;
    sections: number;
    links: number;
    redLinks: number;
    edited: number;
    created: number;
  };
}

let corpus: Corpus | null = null;

function build(): Corpus {
  const store = getStore();

  /* Titel = importierte ∪ lokal angelegte. */
  const titles = new Set<string>([
    ...IMPORTED.map((e) => e.title),
    ...Object.keys(store),
  ]);

  const articles: WikiArticle[] = [];
  for (const title of titles) {
    const imported = importedByTitle.get(title);
    const edit = store[title];
    const wikitext = edit?.wikitext ?? imported?.wikitext ?? "";
    const parsed = parseWikitext(wikitext);

    articles.push({
      ...parsed,
      id: title,
      title,
      kind: kindOf(parsed.templateName),
      wikitext,
      image: imported?.image ? (mediaByFile.get(imported.image) ?? null) : null,
      lastEdit: edit?.editedAt ?? imported?.lastEdit ?? "",
      origin: edit?.origin
        ? edit.origin
        : imported
          ? {
              source: imported.source,
              license: imported.license,
              revision: imported.revision,
            }
          : null,
      /* Live importiert zaehlt nicht als lokal bearbeitet. */
      edited: Boolean(edit) && !edit.origin && Boolean(imported),
      created: Boolean(edit?.created) || (!imported && !edit?.origin),
      backlinks: [],
      redLinks: [],
      words: countWords(parsed),
    });
  }

  articles.sort((a, b) => a.title.localeCompare(b.title, "de"));

  const byTitle = new Map(articles.map((a) => [a.title, a]));
  for (const article of articles) {
    for (const target of article.links) {
      const hit = byTitle.get(target);
      if (hit && hit.title !== article.title) hit.backlinks.push(article.title);
    }
    article.redLinks = article.links.filter((l) => !byTitle.has(l));
  }
  for (const article of articles) {
    article.backlinks = [...new Set(article.backlinks)].sort((a, b) =>
      a.localeCompare(b, "de"),
    );
  }

  return {
    articles,
    byTitle,
    stats: {
      articles: articles.length,
      words: articles.reduce((s, a) => s + a.words, 0),
      sections: articles.reduce((s, a) => s + a.sections.length, 0),
      links: articles.reduce((s, a) => s + a.links.length, 0),
      redLinks: new Set(articles.flatMap((a) => a.redLinks)).size,
      edited: articles.filter((a) => a.edited).length,
      created: articles.filter((a) => a.created).length,
    },
  };
}

function current(): Corpus {
  if (!corpus) corpus = build();
  return corpus;
}

/* Nach jedem Schreibvorgang neu aufbauen: Links, Backlinks und rote Links
   müssen sofort stimmen — ein neuer Artikel färbt seine roten Links grün. */
subscribe(() => {
  corpus = null;
});

export const allArticles = (): WikiArticle[] => current().articles;
export const getArticle = (title: string): WikiArticle | undefined =>
  current().byTitle.get(title);
export const articleExists = (title: string): boolean =>
  current().byTitle.has(title);
export const corpusStats = () => current().stats;

export const DEFAULT_ARTICLE = "Flüsterer";

/** Vorlage für einen neu angelegten Artikel — ein Keim, kein leeres Blatt. */
export const seedWikitext = (title: string, from?: string): string =>
  `'''${title}''' —${from ? ` erwähnt in [[${from}]].` : ""} Hier steht noch nichts.\n\n` +
  `== Überblick ==\nSchreib hier, was am Tisch bekannt wurde.\n`;

export interface SearchHit {
  article: WikiArticle;
  score: number;
  snippet: string;
}

export function searchArticles(query: string, limit = 40): SearchHit[] {
  const needle = query.trim().toLowerCase();
  const articles = current().articles;

  if (!needle) {
    return articles.slice(0, limit).map((article) => ({
      article,
      score: 0,
      snippet: plainText(article.lead).slice(0, 120),
    }));
  }

  const hits: SearchHit[] = [];
  for (const article of articles) {
    const title = article.title.toLowerCase();
    let score = 0;
    if (title === needle) score = 100;
    else if (title.startsWith(needle)) score = 80;
    else if (title.includes(needle)) score = 60;

    const lead = plainText(article.lead);
    const inLead = lead.toLowerCase().indexOf(needle);
    if (inLead !== -1) score = Math.max(score, 40);

    let snippet = lead.slice(0, 120);
    if (score <= 40 && inLead !== -1) {
      const from = Math.max(0, inLead - 40);
      snippet = `${from > 0 ? "…" : ""}${lead.slice(from, from + 120)}`;
    }

    if (score === 0) {
      for (const section of article.sections) {
        for (const block of section.blocks) {
          if (block.kind !== "p") continue;
          const text = plainText(block.spans);
          const at = text.toLowerCase().indexOf(needle);
          if (at !== -1) {
            score = 20;
            const from = Math.max(0, at - 40);
            snippet = `${from > 0 ? "…" : ""}${text.slice(from, from + 120)}`;
            break;
          }
        }
        if (score) break;
      }
    }

    if (score > 0) hits.push({ article, score, snippet });
  }

  return hits
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.article.title.localeCompare(b.article.title, "de"),
    )
    .slice(0, limit);
}

/** Die am häufigsten verlangten roten Links — was die Welt als Nächstes braucht. */
export function topRedLinks(limit = 12): { title: string; wanted: number }[] {
  const counts = new Map<string, number>();
  for (const article of current().articles) {
    for (const red of article.redLinks) {
      counts.set(red, (counts.get(red) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([title, wanted]) => ({ title, wanted }))
    .sort((a, b) => b.wanted - a.wanted || a.title.localeCompare(b.title, "de"))
    .slice(0, limit);
}

export type { Span as WikiSpan };
