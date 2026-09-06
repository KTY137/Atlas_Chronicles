/**
 * Wikitext-Parser — läuft zur Laufzeit im Browser, nicht nur beim Import.
 *
 * Das ist die Voraussetzung fürs Schreiben: Wer einen Artikel bearbeitet,
 * ändert Wikitext, und dieselbe Funktion strukturiert ihn sofort neu. Ein
 * Parser, ein Format, kein Serialisierungs-Rückweg, der auseinanderlaufen kann.
 *
 * Deckt ab, was im Korpus vorkommt (43 Infoboxen, 47 Listen, 66 Fettungen,
 * 1 Tabelle, Dateiverweise). Was er nicht kann, verwirft er sichtbar statt es
 * halb zu rendern.
 */

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

export interface ParsedArticle {
  lead: Span[] | null;
  facts: [string, string][];
  sections: WikiSection[];
  templateName: string;
  infoboxImage: string | null;
  links: string[];
}

/* ------------------------------------------------------- Klammer-Parsing */

/** Ende eines {{…}} ab openIndex, respektiert Verschachtelung. */
export function matchBraces(text: string, openIndex: number): number {
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
function splitParams(body: string): string[] {
  const parts: string[] = [];
  let current = "";
  let square = 0;
  let curly = 0;
  for (let i = 0; i < body.length; i += 1) {
    const two = body.slice(i, i + 2);
    if (two === "[[") { square += 1; current += two; i += 1; continue; }
    if (two === "]]") { square -= 1; current += two; i += 1; continue; }
    if (two === "{{") { curly += 1; current += two; i += 1; continue; }
    if (two === "}}") { curly -= 1; current += two; i += 1; continue; }
    if (body[i] === "|" && square === 0 && curly === 0) {
      parts.push(current);
      current = "";
      continue;
    }
    current += body[i];
  }
  parts.push(current);
  return parts;
}

/* --------------------------------------------------------------- Inline */

export const stripMarkup = (s: string): string =>
  s
    .replace(/'''(.+?)'''/g, "$1")
    .replace(/''(.+?)''/g, "$1")
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, "$2")
    .replace(/\[\[([^\]]+)\]\]/g, "$1")
    .replace(/\{\{[^}]*\}\}/g, "")
    .replace(/<[^>]+>/g, "")
    .trim();

const INLINE =
  /'''(.+?)'''|''(.+?)''|\[\[([^\]|]+)\|([^\]]+)\]\]|\[\[([^\]]+)\]\]|\[(https?:\/\/\S+?) ([^\]]+)\]/g;

export function parseInline(text: string): Span[] {
  const spans: Span[] = [];
  INLINE.lastIndex = 0;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = INLINE.exec(text)) !== null) {
    if (m.index > last) spans.push({ t: "text", v: text.slice(last, m.index) });
    if (m[1] !== undefined) spans.push({ t: "b", v: m[1] });
    else if (m[2] !== undefined) spans.push({ t: "i", v: m[2] });
    else if (m[3] !== undefined) spans.push({ t: "link", to: m[3].trim(), v: m[4] });
    else if (m[5] !== undefined) {
      const target = m[5].trim();
      if (!/^(Datei|File|Bild|Kategorie|Category):/i.test(target)) {
        spans.push({ t: "link", to: target, v: target });
      }
    } else if (m[6] !== undefined) spans.push({ t: "text", v: m[7] });
    last = INLINE.lastIndex;
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

function parseTable(lines: string[], start: number): [Block, number] {
  const headers: string[] = [];
  const rows: Span[][][] = [];
  let row: Span[][] | null = null;
  let i = start + 1;
  for (; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (line.startsWith("|}")) break;
    if (line.startsWith("!")) {
      headers.push(...line.slice(1).split("!!").map(stripMarkup));
    } else if (line.startsWith("|-")) {
      if (row) rows.push(row);
      row = [];
    } else if (line.startsWith("|") && row) {
      row.push(parseInline(line.slice(1).trim()));
    }
  }
  if (row && row.length) rows.push(row);
  return [
    { kind: "table", headers, rows: rows.filter((r) => r.length) },
    i,
  ];
}

export function parseBlocks(text: string): Block[] {
  const blocks: Block[] = [];
  const lines = text.split("\n");
  let paragraph: string[] = [];

  const flush = () => {
    const joined = paragraph.join(" ").trim();
    paragraph = [];
    if (!joined) return;
    const spans = parseInline(joined);
    if (spans.some((s) => s.v.trim().length)) blocks.push({ kind: "p", spans });
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
      const marker = ordered ? /^#[^#]/ : /^\*+\s*/;
      const items: Span[][] = [];
      while (i < lines.length && marker.test(lines[i].trim())) {
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
      if (end === -1) continue;
      const rest = trimmed.slice(end).trim();
      if (rest) paragraph.push(rest);
      continue;
    }

    paragraph.push(trimmed);
  }
  flush();
  return blocks;
}

/* -------------------------------------------------------------- Artikel */

/** Vollständiger Wikitext → Struktur. Wird beim Laden und bei jedem Speichern aufgerufen. */
export function parseWikitext(source: string): ParsedArticle {
  let text = source.replace(/\{\{DISPLAYTITLE:[^}]*\}\}/g, "").trim();

  const facts: [string, string][] = [];
  let templateName = "";
  let infoboxImage: string | null = null;

  if (text.startsWith("{{")) {
    const end = matchBraces(text, 0);
    if (end > 0) {
      const params = splitParams(text.slice(2, end - 2));
      const name = (params.shift() ?? "").trim();
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
          if (!key || !value) continue;
          if (/^bild$/i.test(key)) {
            infoboxImage = value;
            continue;
          }
          facts.push([
            key.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase()),
            value,
          ]);
        }
        text = text.slice(end).trim();
      }
    }
  }

  const sections: WikiSection[] = [];
  const heading = /^(={2,6})\s*(.+?)\s*\1\s*$/gm;
  let cursor = 0;
  let current: WikiSection = { level: 1, heading: null, blocks: [] };
  let m: RegExpExecArray | null;
  while ((m = heading.exec(text)) !== null) {
    current.blocks = parseBlocks(text.slice(cursor, m.index));
    if (current.blocks.length || current.heading) sections.push(current);
    current = { level: m[1].length, heading: stripMarkup(m[2]), blocks: [] };
    cursor = heading.lastIndex;
  }
  current.blocks = parseBlocks(text.slice(cursor));
  if (current.blocks.length || current.heading) sections.push(current);

  let lead: Span[] | null = null;
  if (sections.length && sections[0].heading === null) {
    const first = sections[0].blocks.findIndex((b) => b.kind === "p");
    if (first !== -1) {
      lead = (sections[0].blocks[first] as { spans: Span[] }).spans;
      sections[0].blocks.splice(first, 1);
    }
    if (!sections[0].blocks.length) sections.shift();
  }

  const links = [
    ...new Set(
      [...source.matchAll(/\[\[([^\]|#]+)(?:\|[^\]]*)?\]\]/g)]
        .map((match) => match[1].trim())
        .filter((t) => t && !/^(Datei|File|Bild|Kategorie|Category):/i.test(t)),
    ),
  ];

  return { lead, facts: facts.slice(0, 12), sections, templateName, infoboxImage, links };
}

const KIND_BY_TEMPLATE: [RegExp, string][] = [
  [/person/i, "Person"],
  [/rasse|spezies/i, "Spezies"],
  [/regierung|organisation/i, "Organisation"],
  [/ort|stadt|land|reich/i, "Ort"],
  [/waffe|gegenstand/i, "Gegenstand"],
  [/ereignis|krieg|schlacht/i, "Ereignis"],
];

export const kindOf = (templateName: string): string =>
  KIND_BY_TEMPLATE.find(([re]) => re.test(templateName))?.[1] ?? "Artikel";

export const plainText = (spans: Span[] | null): string =>
  (spans ?? []).map((s) => s.v).join("");
