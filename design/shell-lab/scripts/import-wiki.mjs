/**
 * Importiert den Eron-Fixture-Auszug (74 Artikel, MediaWiki-Wikitext) in eine
 * strukturierte Form, die die Welt-Bühne rendern kann.
 *
 * Erzeugt `src/wiki.generated.json`. Der Parser deckt ab, was im Korpus
 * tatsächlich vorkommt (siehe Erhebung: 43 Infoboxen, 47 Listen, 66 Fettungen,
 * 1 Tabelle, 11 Dateiverweise, keine refs/galleries). Was er NICHT kann, wird
 * verworfen statt halb gerendert — und im Bericht gezählt, damit die Lücke
 * sichtbar bleibt.
 *
 * Quelle: Eron Wiki (eron.fandom.com/de) · CC BY-SA 3.0.
 */

import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import path from "node:path";

const FIXTURE = path.resolve("../fixtures/eron");
const raw = JSON.parse(readFileSync(path.join(FIXTURE, "articles.json"), "utf8"));
const articles = Array.isArray(raw) ? raw : (raw.articles ?? Object.values(raw));

const stats = { droppedTemplates: 0, tables: 0, files: 0, imagesResolved: 0 };

/* ---------------------------------------------------------------- Medien */

const mediaFiles = readdirSync(path.join(FIXTURE, "media")).filter((f) =>
  f.endsWith(".webp"),
);
const normalise = (name) =>
  name
    .replace(/\.(jpg|jpeg|png|webp|gif|PNG|JPG)$/i, "")
    .replace(/[_\s]+/g, "")
    .toLowerCase();
const mediaByKey = new Map(mediaFiles.map((f) => [normalise(f), f]));
const resolveImage = (wikiName) => mediaByKey.get(normalise(wikiName)) ?? null;

/* ------------------------------------------------------- Klammer-Parsing */

/** Findet das Ende eines {{...}} ab openIndex, respektiert Verschachtelung. */
function matchBraces(text, openIndex) {
  let depth = 0;
  for (let i = openIndex; i < text.length - 1; i += 1) {
    if (text[i] === "{" && text[i + 1] === "{") {
      depth += 1;
      i += 1;
    } else if (text[i] === "}" && text[i + 1] === "}") {
      depth -= 1;
      i += 1;
      if (depth === 0) return i + 1;
    }
  }
  return -1;
}

/** Teilt Template-Parameter an `|`, ignoriert `|` in [[…]] und {{…}}. */
function splitParams(body) {
  const parts = [];
  let current = "";
  let square = 0;
  let curly = 0;
  for (let i = 0; i < body.length; i += 1) {
    const two = body.slice(i, i + 2);
    if (two === "[[") { square += 1; current += two; i += 1; continue; }
    if (two === "]]") { square -= 1; current += two; i += 1; continue; }
    if (two === "{{") { curly += 1; current += two; i += 1; continue; }
    if (two === "}}") { curly -= 1; current += two; i += 1; continue; }
    if (body[i] === "|" && square === 0 && curly === 0) { parts.push(current); current = ""; continue; }
    current += body[i];
  }
  parts.push(current);
  return parts;
}

/* --------------------------------------------------------------- Inline */

const stripMarkup = (s) =>
  s
    .replace(/'''(.+?)'''/g, "$1")
    .replace(/''(.+?)''/g, "$1")
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, "$2")
    .replace(/\[\[([^\]]+)\]\]/g, "$1")
    .replace(/\{\{[^}]*\}\}/g, "")
    .replace(/<[^>]+>/g, "")
    .trim();

/** Wikitext-Inline → Spans. */
function parseInline(text) {
  const spans = [];
  const pattern =
    /'''(.+?)'''|''(.+?)''|\[\[([^\]|]+)\|([^\]]+)\]\]|\[\[([^\]]+)\]\]|\[(https?:\/\/\S+?) ([^\]]+)\]/g;
  let last = 0;
  let m;
  while ((m = pattern.exec(text)) !== null) {
    if (m.index > last) {
      spans.push({ t: "text", v: text.slice(last, m.index) });
    }
    if (m[1] !== undefined) spans.push({ t: "b", v: m[1] });
    else if (m[2] !== undefined) spans.push({ t: "i", v: m[2] });
    else if (m[3] !== undefined) spans.push({ t: "link", to: m[3].trim(), v: m[4] });
    else if (m[5] !== undefined) {
      const target = m[5].trim();
      if (/^(Datei|File|Bild|Kategorie|Category):/i.test(target)) {
        stats.files += 1;
      } else {
        spans.push({ t: "link", to: target, v: target });
      }
    } else if (m[6] !== undefined) spans.push({ t: "text", v: m[7] });
    last = pattern.lastIndex;
  }
  if (last < text.length) spans.push({ t: "text", v: text.slice(last) });

  return spans
    .map((s) =>
      s.t === "text"
        ? { ...s, v: s.v.replace(/\{\{[^}]*\}\}/g, "").replace(/<[^>]+>/g, "") }
        : s,
    )
    .filter((s) => (s.t === "text" ? s.v.length > 0 : true));
}

/* ---------------------------------------------------------------- Blöcke */

function parseTable(lines, start) {
  const headers = [];
  const rows = [];
  let row = null;
  let i = start + 1;
  for (; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (line.startsWith("|}")) break;
    if (line.startsWith("!")) {
      headers.push(...line.slice(1).split("!!").map((c) => stripMarkup(c)));
    } else if (line.startsWith("|-")) {
      if (row) rows.push(row);
      row = [];
    } else if (line.startsWith("|") && row) {
      row.push(parseInline(line.slice(1).trim()));
    }
  }
  if (row && row.length) rows.push(row);
  stats.tables += 1;
  return [{ kind: "table", headers, rows: rows.filter((r) => r.length) }, i];
}

/** Rohtext eines Abschnitts → Blöcke. */
function parseBlocks(text) {
  const blocks = [];
  const lines = text.split("\n");
  let paragraph = [];

  const flush = () => {
    const joined = paragraph.join(" ").trim();
    paragraph = [];
    if (!joined) return;
    const spans = parseInline(joined);
    if (spans.some((s) => (s.v ?? "").trim().length)) blocks.push({ kind: "p", spans });
  };

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) { flush(); continue; }
    if (trimmed.startsWith("{|")) {
      flush();
      const [table, end] = parseTable(lines, i);
      blocks.push(table);
      i = end;
      continue;
    }
    if (/^\*+\s*/.test(trimmed) || /^#[^#]/.test(trimmed)) {
      flush();
      const ordered = trimmed.startsWith("#");
      const items = [];
      while (
        i < lines.length &&
        (ordered ? /^#[^#]/ : /^\*+\s*/).test(lines[i].trim())
      ) {
        const content = lines[i].trim().replace(/^[*#]+\s*/, "");
        if (content) items.push(parseInline(content));
        i += 1;
      }
      i -= 1;
      if (items.length) blocks.push({ kind: ordered ? "ol" : "ul", items });
      continue;
    }
    if (trimmed.startsWith("{{")) {
      const end = matchBraces(line, 0);
      if (end === -1) { stats.droppedTemplates += 1; continue; }
      const rest = trimmed.slice(end).trim();
      if (rest) paragraph.push(rest);
      stats.droppedTemplates += 1;
      continue;
    }
    paragraph.push(trimmed);
  }
  flush();
  return blocks;
}

/* -------------------------------------------------------------- Artikel */

const KIND_BY_TEMPLATE = [
  [/person/i, "Person"],
  [/rasse|spezies/i, "Spezies"],
  [/regierung|organisation/i, "Organisation"],
  [/ort|stadt|land|reich/i, "Ort"],
  [/waffe|gegenstand/i, "Gegenstand"],
  [/ereignis|krieg|schlacht/i, "Ereignis"],
];

function parseArticle(entry) {
  let text = entry.wikitext.replace(/\{\{DISPLAYTITLE:[^}]*\}\}/g, "").trim();

  /* Infobox: führendes Template mit Parametern. */
  const facts = [];
  let templateName = (entry.templates_used ?? [])[0] ?? "";
  if (text.startsWith("{{")) {
    const end = matchBraces(text, 0);
    if (end > 0) {
      const inner = text.slice(2, end - 2);
      const params = splitParams(inner);
      const name = params.shift().trim();
      if (params.length) {
        templateName = name;
        for (const param of params) {
          const eq = param.indexOf("=");
          if (eq === -1) continue;
          const key = param.slice(0, eq).trim();
          const value = param
            .slice(eq + 1)
            .split("\n")
            .map((l) => stripMarkup(l.replace(/^\*\s*/, "")))
            .filter(Boolean)
            .join(" · ");
          if (key && value) {
            facts.push([
              key.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase()),
              value,
            ]);
          }
        }
        text = text.slice(end).trim();
      }
    }
  }

  /* Abschnitte an Überschriften trennen. */
  const sections = [];
  const headingPattern = /^(={2,6})\s*(.+?)\s*\1\s*$/gm;
  let cursor = 0;
  let current = { level: 1, heading: null, blocks: [] };
  let m;
  while ((m = headingPattern.exec(text)) !== null) {
    current.blocks = parseBlocks(text.slice(cursor, m.index));
    if (current.blocks.length || current.heading) sections.push(current);
    current = { level: m[1].length, heading: stripMarkup(m[2]), blocks: [] };
    cursor = headingPattern.lastIndex;
  }
  current.blocks = parseBlocks(text.slice(cursor));
  if (current.blocks.length || current.heading) sections.push(current);

  /* Lead = erster Absatz des ersten Abschnitts ohne Überschrift. */
  let lead = null;
  if (sections.length && sections[0].heading === null) {
    const firstParagraph = sections[0].blocks.findIndex((b) => b.kind === "p");
    if (firstParagraph !== -1) {
      lead = sections[0].blocks[firstParagraph].spans;
      sections[0].blocks.splice(firstParagraph, 1);
    }
    if (!sections[0].blocks.length) sections.shift();
  }

  const kind =
    KIND_BY_TEMPLATE.find(([re]) => re.test(templateName))?.[1] ?? "Artikel";

  const imageName = [...entry.wikitext.matchAll(/\[\[(?:Datei|File|Bild):([^\]|#]+)/gi)]
    .map((match) => match[1].trim())
    .map(resolveImage)
    .find(Boolean);
  const infoboxImage = facts.find(([k]) => /^bild$/i.test(k))?.[1];
  /* Fallback: Artikeltitel selbst (Bodin → Bodin.webp, Song Kayn → SongKayn.webp),
     danach Präfix (Valor Saron → Valor_Saron_1.webp). */
  const byTitleImage =
    resolveImage(entry.title) ??
    mediaFiles.find((f) => normalise(f).startsWith(normalise(entry.title))) ??
    null;
  const image =
    imageName ?? (infoboxImage ? resolveImage(infoboxImage) : null) ?? byTitleImage;
  if (image) stats.imagesResolved += 1;

  return {
    id: entry.title,
    title: entry.title,
    kind,
    lead,
    facts: facts.filter(([k]) => !/^bild$/i.test(k)).slice(0, 12),
    sections,
    links: [...new Set((entry.links ?? []).map((l) => l.trim()))],
    backlinks: [],
    image,
    bytes: entry.bytes,
    lastEdit: (entry.last_edit ?? "").slice(0, 10),
    sectionCount: (entry.sections ?? []).length,
  };
}

const parsed = articles.map(parseArticle);

/* Backlinks aus dem echten Linkgraphen. */
const byTitle = new Map(parsed.map((a) => [a.title, a]));
for (const article of parsed) {
  for (const target of article.links) {
    const hit = byTitle.get(target);
    if (hit && hit.title !== article.title) hit.backlinks.push(article.title);
  }
}
for (const article of parsed) {
  article.backlinks = [...new Set(article.backlinks)].sort();
  /* „Rot" = im Korpus verlinkt, aber ohne eigenen Artikel. */
  article.redLinks = article.links.filter((l) => !byTitle.has(l));
}

parsed.sort((a, b) => a.title.localeCompare(b.title, "de"));

writeFileSync(
  "src/wiki.generated.json",
  `${JSON.stringify({ articles: parsed }, null, 0)}\n`,
);

const words = parsed.reduce(
  (sum, a) =>
    sum +
    a.sections.reduce(
      (s, sec) =>
        s +
        sec.blocks.reduce(
          (b, block) =>
            b +
            (block.kind === "p"
              ? block.spans.reduce((w, sp) => w + (sp.v ?? "").split(/\s+/).length, 0)
              : 0),
          0,
        ),
      0,
    ),
  0,
);

console.log(
  JSON.stringify(
    {
      artikel: parsed.length,
      mitLead: parsed.filter((a) => a.lead).length,
      mitFakten: parsed.filter((a) => a.facts.length).length,
      mitBild: parsed.filter((a) => a.image).length,
      abschnitte: parsed.reduce((s, a) => s + a.sections.length, 0),
      woerter: words,
      backlinksGesamt: parsed.reduce((s, a) => s + a.backlinks.length, 0),
      roteLinks: new Set(parsed.flatMap((a) => a.redLinks)).size,
      ...stats,
    },
    null,
    1,
  ),
);
