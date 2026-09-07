import { trustAssetId } from "@chronicle/core";
import type { Blockinhalt, EntryArt, InlineMark, InlineText, Verlust } from "@chronicle/chronik";
import type { EronTemplate, ImportedMediaReference } from "./model.ts";
import { ImportValidationError } from "./validation.ts";

export const ERON_TEMPLATE_TYPES: Readonly<Record<string, EntryArt>> = Object.freeze({
  Person: "charakter", "Infobox Charakter": "charakter", Regierung: "organisation",
  "Rasse/Spezies": "spezies", "Rüstung/Waffe": "gegenstand", "Infobox Item": "gegenstand",
  Krieg: "ereignis", Ereignis: "ereignis", "Infobox Ereignis": "ereignis",
  Stadt: "ort", "Planet/Mond": "ort", "Infobox Ort": "ort",
});

/**
 * MediaWiki namespace prefixes. A link into a namespace is NOT an article link and must never
 * become a door: `[[Kategorie:Charaktere]]` is a classification, `[[Map:Andaria]]` is an
 * interactive map, and neither is a missing article somebody could sit down and write.
 *
 * Measured on the real corpus: exactly two such targets (`Kategorie:Charaktere`, `Map:Andaria`)
 * were being counted as red links, i.e. as demand for an article that can never exist.
 *
 * This list is per-wiki and per-language, exactly like the notation guard, and must become
 * user-editable before a second corpus arrives (assertion A19). The values here are the
 * namespaces the fixture wiki actually declares plus their English equivalents.
 */
export const MEDIAWIKI_NAMESPACES: readonly string[] = [
  "Benutzer", "User", "Benutzer Diskussion", "User talk",
  "Datei", "File", "Bild", "Image",
  "MediaWiki", "Vorlage", "Template", "Kategorie", "Category",
  "Modul", "Module", "Blog", "Karte", "Map",
  "Spezial", "Special", "Hilfe", "Help", "Diskussion", "Talk",
];

/** True when a link target addresses a namespace rather than an article. */
export const namespaceLinkTarget = (slug: string): boolean => {
  const colon = slug.indexOf(":");
  if (colon <= 0) return false;
  const prefix = slug.slice(0, colon).trim().toLowerCase();
  return MEDIAWIKI_NAMESPACES.some((ns) => ns.toLowerCase() === prefix);
};

export const eronNotationTarget = (slug: string): boolean => /^(?:[NV]\.\s?K\.?|\d{1,4}|[A-Za-zÄÖÜäöüß])$/.test(slug);

/**
 * One identity per file, whatever syntax pointed at it.
 *
 * This matters more than it looks. The body writes `[[Datei:Bodin.jpg|mini|Bodin]]` and the
 * infobox writes `|Bild=Datei:Bodin.jpg`, while `Olav der Ehrliche` writes
 * `Bild=Datei:Olav_der_herrliche.png#filelinks` — three spellings of one picture. Normalising
 * only some of them gives the same image two asset identities, which is how a corpus ends up
 * storing the same bytes twice and revealing them under two different permissions.
 */
export const dateiSlug = (raw: string): string => wikiSlug(raw.replace(/^\s*:?\s*(?:Datei|File|Bild|Image)\s*:/i, ""));

/**
 * MediaWiki image options, German and English. Everything that is NOT an option is the caption —
 * that is MediaWiki's own rule, and it is why the list has to be complete rather than clever:
 * an unrecognised option silently becomes the words printed under the picture.
 */
const BILD_OPTIONEN = {
  rahmen: /^(?:thumb|thumbnail|mini|miniatur|frame|framed|gerahmt|frameless|rahmenlos|border|rand)$/i,
  ausrichtung: /^(?:left|links|right|rechts|cent(?:er|re)|zentriert|none|ohne)$/i,
  vertikal: /^(?:baseline|sub|super|top|text-top|middle|bottom|text-bottom|oben|unten|mitte|zeilenmitte)$/i,
  groesse: /^(?:\d{1,5}|x\d{1,5}|\d{1,5}x\d{1,5})px$/i,
  hochkant: /^(?:upright|hochkant)(?:=[\d.]*)?$/i,
  benannt: /^(?:alt|link|page|class|lang|thumbtime|start|end)\s*=/i,
} as const;

const AUSRICHTUNGEN: Readonly<Record<string, "links" | "rechts" | "zentriert" | "ohne">> = {
  left: "links", links: "links", right: "rechts", rechts: "rechts",
  center: "zentriert", centre: "zentriert", zentriert: "zentriert", none: "ohne", ohne: "ohne",
};

export interface BildAufruf {
  readonly dateiname: string;
  readonly beschriftung: string;
  readonly alt?: string;
  readonly ausrichtung?: "links" | "rechts" | "zentriert" | "ohne";
  readonly breite?: number;
}

/**
 * Read one `[[Datei:…|…]]` call. Returns null when there is no file name at all, which is the
 * only case the caller must quarantine; everything else is readable even when unusual.
 */
export function parseBildAufruf(inner: string): BildAufruf | null {
  let parts: string[];
  try { parts = splitWikiTopLevel(inner); } catch { return null; }
  const dateiname = dateiSlug(parts.shift() ?? "");
  if (!dateiname) return null;
  let beschriftung = "", alt: string | undefined, ausrichtung: BildAufruf["ausrichtung"], breite: number | undefined;
  for (const part of parts) {
    const option = part.trim();
    if (BILD_OPTIONEN.ausrichtung.test(option)) { ausrichtung = AUSRICHTUNGEN[option.toLowerCase()]; continue; }
    if (BILD_OPTIONEN.groesse.test(option)) {
      // `x120px` constrains the height only; there is no width to record, and inventing one
      // would turn a source hint into a false measurement.
      const width = /^(\d{1,5})(?:x\d{1,5})?px$/i.exec(option)?.[1];
      if (width) breite = Number(width);
      continue;
    }
    if (BILD_OPTIONEN.rahmen.test(option) || BILD_OPTIONEN.vertikal.test(option) || BILD_OPTIONEN.hochkant.test(option)) continue;
    if (BILD_OPTIONEN.benannt.test(option)) {
      const [name, ...rest] = option.split("=");
      if (name!.trim().toLowerCase() === "alt") alt = inlinePlainText(parseWikiInline(rest.join("=").trim()));
      continue;
    }
    // MediaWiki keeps the LAST caption when several are given.
    if (option) beschriftung = part.trim();
  }
  return { dateiname, beschriftung, ...(alt ? { alt } : {}), ...(ausrichtung ? { ausrichtung } : {}), ...(breite ? { breite } : {}) };
}

/** MediaWiki first-letter matching is locale-free; fragments do not identify an entry. */
export function wikiSlug(title: string): string {
  const clean = title.replace(/_/g, " ").split("#", 1)[0]!.trim().replace(/\s+/g, " ").normalize("NFC");
  return clean ? clean[0]!.toUpperCase() + clean.slice(1) : "";
}

function entity(text: string): string {
  return text.replace(/&(?:amp|lt|gt|quot|apos|nbsp|#\d+|#x[\da-f]+);/gi, (match) => {
    const named: Record<string, string> = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&apos;": "'", "&nbsp;": " " };
    const known = named[match.toLowerCase()];
    if (known !== undefined) return known;
    const hex = match[2]?.toLowerCase() === "x";
    const point = Number.parseInt(match.slice(hex ? 3 : 2, -1), hex ? 16 : 10);
    return point > 0 && point <= 0x10ffff && !(point >= 0xd800 && point <= 0xdfff) ? String.fromCodePoint(point) : match;
  });
}

/**
 * A self-closing `<nowiki/>` is MediaWiki's EMPTY separator. It renders nothing; its only job is
 * to stop a link trail or a list marker from continuing — `[[Waldelf|Wald-]]<nowiki/>und` must
 * render "Wald-und" with only "Wald-" inside the link.
 *
 * It must be matched BEFORE the paired form everywhere, because `<nowiki\b[^>]*>` happily
 * matches `<nowiki/>` (the `[^>]*` eats the slash) and would then swallow everything up to some
 * later `</nowiki>`.
 *
 * Measured on the real corpus: 4 occurrences in 2 articles (Bjoldiri, Kaiserthing). Before this
 * was handled, `unsupported()` saw a bare tag, decided the paragraph was HTML, and quarantined
 * real prose — taking every link that prose carried out of the door graph with it.
 */
const OPAQUE = /^(?:<nowiki\s*\/>|<nowiki\b[^>]*>[\s\S]*?<\/nowiki\s*>|<!--[\s\S]*?-->)/i;
const EMPTY_NOWIKI = /^<nowiki\s*\/>/i;

/** End-exclusive balanced scan; nowiki/comments are opaque, links and templates nest independently. */
export function balancedEnd(text: string, start: number): number {
  const first = text.slice(start, start + 2);
  if (first !== "{{" && first !== "[[") return -1;
  const stack = [first === "{{" ? "}}" : "]]"];
  for (let i = start + 2; i < text.length;) {
    const opaque = OPAQUE.exec(text.slice(i));
    if (opaque) { i += opaque[0].length; continue; }
    const token = text.slice(i, i + 2);
    if (token === "{{" || token === "[[") {
      stack.push(token === "{{" ? "}}" : "]]");
      if (stack.length > 64) throw new ImportValidationError("wikitext", "maximum nesting depth exceeded");
      i += 2;
    } else if (token === stack.at(-1)) {
      stack.pop(); i += 2;
      if (!stack.length) return i;
    } else i++;
  }
  return -1;
}

/** Split only outside nested calls and links; a link label's pipe never starts a field. */
export function splitWikiTopLevel(text: string, separator = "|"): string[] {
  const out: string[] = [];
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    const opaque = OPAQUE.exec(text.slice(i));
    if (opaque) { i += opaque[0].length - 1; continue; }
    if (["{{", "[["].includes(text.slice(i, i + 2))) {
      const end = balancedEnd(text, i);
      if (end < 0) throw new ImportValidationError("wikitext", "unclosed template or link");
      i = end - 1;
    } else if (text[i] === separator) {
      out.push(text.slice(start, i)); start = i + 1;
    }
  }
  out.push(text.slice(start));
  return out;
}

export function parseWikiInline(source: string, inherited: readonly InlineMark[] = [], depth = 0): InlineText[] {
  if (depth > 64) throw new ImportValidationError("wikitext", "maximum inline depth exceeded");
  const out: InlineText[] = [];
  let strong = false, em = false, pending = "";
  const marks = (): InlineMark[] => [...inherited, ...(strong ? [{ art: "strong" as const }] : []), ...(em ? [{ art: "em" as const }] : [])];
  const flush = () => { if (pending) out.push({ text: entity(pending), marks: marks() }); pending = ""; };
  for (let i = 0; i < source.length;) {
    // Consumed, never emitted. It cannot let a trail through: the trail regex below matches
    // letters only, and this begins with "<".
    const empty = EMPTY_NOWIKI.exec(source.slice(i));
    if (empty) { i += empty[0].length; continue; }
    const nowiki = /^<nowiki\b[^>]*>([\s\S]*?)<\/nowiki\s*>/i.exec(source.slice(i));
    if (nowiki) { flush(); out.push({ text: entity(nowiki[1]!), marks: marks() }); i += nowiki[0].length; continue; }
    const comment = /^<!--[\s\S]*?-->/.exec(source.slice(i));
    if (comment) { i += comment[0].length; continue; }
    const br = /^<br\s*\/?\s*>/i.exec(source.slice(i));
    if (br) { pending += "\n"; i += br[0].length; continue; }
    const quotes = /^(?:'{5}|'{3}|'{2})/.exec(source.slice(i));
    if (quotes) {
      flush();
      if (quotes[0].length !== 2) strong = !strong;
      if (quotes[0].length !== 3) em = !em;
      i += quotes[0].length; continue;
    }
    if (source.slice(i, i + 2) === "[[") {
      const end = balancedEnd(source, i);
      if (end < 0) { pending += source.slice(i); break; }
      const parts = splitWikiTopLevel(source.slice(i + 2, end - 2));
      const target = wikiSlug(parts.shift()!);
      const trail = /^[äöüßa-z]+/.exec(source.slice(end))?.[0] ?? "";
      const label = (parts.length ? parts.join("|") : source.slice(i + 2, end - 2)) + trail;
      flush();
      out.push(...parseWikiInline(label, [...marks(), ...(target ? [{ art: "link" as const, zielSlug: target }] : [])], depth + 1));
      i = end + trail.length; continue;
    }
    pending += source[i]; i++;
  }
  flush();
  return out;
}

export const inlinePlainText = (inline: readonly InlineText[]): string => inline.map((part) => part.text).join("");

export function blockPlainText(block: Blockinhalt): string {
  switch (block.kind) {
    case "absatz": case "zitat": case "bildunterschrift": return inlinePlainText(block.inhalt);
    case "feld": return block.werte.map(inlinePlainText).join("\n");
    case "liste": return block.punkte.map(inlinePlainText).join("\n");
    case "rohblock": return block.quelltext;
  }
}

interface FieldDefinition { key: string; label: string; image: boolean; group?: string }
function fields(template: EronTemplate): FieldDefinition[] {
  const infobox = /<infobox\b[^>]*>([\s\S]*?)<\/infobox\s*>/i.exec(template.source)?.[1];
  if (!infobox) return [];
  const result: FieldDefinition[] = [];
  let group: string | undefined;
  for (const match of infobox.matchAll(/<header\b[^>]*>([\s\S]*?)<\/header\s*>|<(data|title|image)\b[^>]*\bsource\s*=\s*["']([^"']+)["'][^>]*(?:\/>|>([\s\S]*?)<\/\2\s*>)/gi)) {
    if (match[1] !== undefined) { group = entity(match[1].replace(/<[^>]+>/g, "").trim()); continue; }
    const key = entity(match[3]!);
    const label = entity(/<label\b[^>]*>([\s\S]*?)<\/label>/i.exec(match[4] ?? "")?.[1]?.replace(/<[^>]+>/g, "").trim() ?? key);
    if (!result.some((row) => row.key === key)) result.push({ key, label, image: match[2]!.toLowerCase() === "image", ...(group ? { group } : {}) });
  }
  return result;
}

function unsupported(text: string): boolean {
  // The empty separator is stripped first — see EMPTY_NOWIKI. Treating it as HTML quarantined
  // real prose, and with it every link that prose carried.
  const safe = text.replace(/<nowiki\s*\/>|<nowiki\b[^>]*>[\s\S]*?<\/nowiki\s*>|<!--[\s\S]*?-->|<br\s*\/?\s*>/gi, "");
  return /\{\{|\{\||<[^>]+>|\[(?:https?:|\/\/)|~~~~/.test(safe);
}

export interface DecomposedArticle {
  readonly art: EntryArt;
  readonly blocks: readonly { readonly pfad: readonly string[]; readonly inhalt: Blockinhalt }[];
  readonly losses: readonly Verlust[];
  readonly media: readonly ImportedMediaReference[];
  readonly displayTitle?: string;
  readonly sortKey?: string;
  readonly droppedCharacters: number;
}

/** RB-12 V1 atom boundary. Templates are read as data; nothing is expanded or executed. */
export function decomposeWiki(
  source: string,
  pageid: number,
  templates: readonly EronTemplate[],
  options: { minimumParagraphLength?: number; templateTypes?: Readonly<Record<string, EntryArt>> } = {},
): DecomposedArticle {
  const blocks: { pfad: string[]; inhalt: Blockinhalt }[] = [];
  const losses: Verlust[] = [], media: ImportedMediaReference[] = [];
  const headingPath: { level: number; title: string }[] = [];
  let art: EntryArt = "sonstiges", displayTitle: string | undefined, sortKey: string | undefined, droppedCharacters = 0;
  const emit = (inhalt: Blockinhalt) => blocks.push({ pfad: headingPath.map((h) => h.title), inhalt });
  const raw = (text: string, reason: "wikitabelle" | "unbekannte-vorlage" | "sonstiges" = "sonstiges") => {
    emit({ kind: "rohblock", quelltext: text, grund: reason });
    losses.push({ art: "nicht-umgewandelt", bezeichnung: String(pageid), detail: text });
  };
  const metadata = (text: string): boolean => {
    const match = /^\{\{(DISPLAYTITLE|DEFAULTSORT)\s*[:|]([\s\S]*?)\}\}$/i.exec(text);
    if (!match) return false;
    const value = inlinePlainText(parseWikiInline(match[2]!)).replace(/<[^>]*>/g, "");
    if (match[1]!.toUpperCase() === "DISPLAYTITLE") displayTitle = value; else sortKey = value;
    return true;
  };
  /**
   * A picture becomes a passage — `bildunterschrift` — instead of quarantine.
   *
   * It used to become a `rohblock`: the reader saw the wikitext of the portrait in a bordered
   * "not converted" card, and the import report counted every figure as a loss. On this corpus
   * that is the portrait of every named character, the coat of arms of the Kaiserreich and all
   * seven plates of `Erismus`. The bytes are still a separate step — an article import must not
   * wait on a CDN — but the FIGURE is now structure the product owns, and an asset that has not
   * been fetched renders as a named placeholder rather than as source code.
   *
   * `assetId` carries the normalised file name here and is rewritten to the derived id by
   * `importEron`, exactly like a link target: resolution must not enter the passage's identity.
   */
  const image = (text: string, inner: string, ausInfobox: boolean) => {
    const call = parseBildAufruf(inner);
    if (!call) { raw(text); return; }
    media.push({ pageid, fileName: call.dateiname, source: text, licenseStatus: "unbekannt", state: "referenziert" });
    emit({
      kind: "bildunterschrift", assetId: trustAssetId(call.dateiname), dateiname: call.dateiname,
      inhalt: call.beschriftung ? parseWikiInline(call.beschriftung) : [],
      ...(call.alt ? { alt: call.alt } : {}), ...(call.ausrichtung ? { ausrichtung: call.ausrichtung } : {}),
      ...(call.breite ? { breite: call.breite } : {}), ...(ausInfobox ? { ausInfobox: true } : {}),
    });
  };

  /**
   * Decompose one top-level template call into `feld` passages — die geteilte Infobox.
   * Returns false when the call is not an infobox (no `<infobox>` definition) or is malformed,
   * leaving the caller to quarantine it rather than guess.
   */
  const infobox = (call: string): boolean => {
    let parts: string[];
    try { parts = splitWikiTopLevel(call.slice(2, -2)); } catch { return false; }
    const name = wikiSlug(parts.shift()!.replace(/^(?:Vorlage|Template):/i, ""));
    const template = templates.find((t) => wikiSlug(t.title.replace(/^(?:Vorlage|Template):/i, "")) === name);
    const definitions = template ? fields(template) : [];
    if (!definitions.length) return false;
    art = options.templateTypes?.[name] ?? ERON_TEMPLATE_TYPES[name] ?? "sonstiges";
    const values = new Map<string, string>();
    for (const part of parts) {
      const pair = splitWikiTopLevel(part, "=");
      if (pair.length < 2 || values.has(pair[0]!.trim())) return false;
      values.set(pair[0]!.trim(), pair.slice(1).join("=").trim());
    }
    for (const key of values.keys()) {
      if (!definitions.some((field) => field.key === key)) {
        definitions.push({ key, label: key, image: false });
        if (values.get(key)) losses.push({ art: "nicht-umgewandelt", bezeichnung: `${name}.${key}`, detail: "Unknown field label; original parameter retained" });
      }
    }
    for (const field of definitions) {
      const value = values.get(field.key);
      if (!value) continue;
      // An infobox image field may hold a bare name, a `Datei:` name, or full `[[…]]` markup.
      if (field.image) { image(`{{${name}|${field.key}=${value}}}`, /^\[\[[\s\S]*\]\]$/.test(value.trim()) ? value.trim().slice(2, -2) : value, true); continue; }
      if (unsupported(value)) { raw(`{{${name}|${field.key}=${value}}}`, "unbekannte-vorlage"); continue; }
      const many = /^\s*[*#]/.test(value);
      emit({ kind: "feld", schluessel: field.key, label: field.label, ...(field.group ? { gruppe: field.group } : {}),
        werte: (many ? value.split(/\n(?=\s*[*#])/).map((v) => v.replace(/^\s*[*#]\s*/, "")) : [value]).map((v) => parseWikiInline(v)),
        mehrwertig: many, klauselKandidat: /^(?:Schaden|Rüstung|Ruestung|Wert|Bonus|Malus|Reichweite)$/i.test(field.key) });
    }
    return true;
  };

  let body = source.replace(/\r\n?/g, "\n").trimStart();

  // Step 1 — the maximal prefix of adjacent top-level calls (RB-12 §2.4).
  while (body.startsWith("{{")) {
    const end = balancedEnd(body, 0);
    if (end < 0) { raw(body, "unbekannte-vorlage"); body = ""; break; }
    const call = body.slice(0, end);
    body = body.slice(end).trimStart();
    if (metadata(call)) continue;
    if (!infobox(call)) raw(call, "unbekannte-vorlage");
  }

  /**
   * Step 1b — audit blocker **B1**, and the reason this pass exists.
   *
   * RB-12 §2.4 says "scan balanced `{{…}}` **from offset 0**". `design/fixtures/eron/PRUEFUNG.md`
   * proved that rule silently loses every field of an article whose infobox sits behind a lead
   * sentence — measured here on the real corpus as **39 parameter rows across 6 articles**,
   * each of which was landing in the quarantine as an "unknown template" instead of becoming
   * fields. The text survived as a `rohblock`; the STRUCTURE did not, and the structure is the
   * product.
   *
   * The corrected rule: **an infobox is an infobox because its template declares `<infobox>`,
   * not because it happens to start at byte 0.** Position is a formatting accident; the field
   * declaration is the contract. Note that `Ork`'s call is glued to the end of a sentence and
   * `Haus der Münze`'s sits behind a `<br />`, so a "must be on its own line" rule would still
   * have lost two of the six.
   *
   * Everything that is NOT an infobox stays exactly where it was, so the quarantine path and
   * its loss accounting are untouched — this pass can only convert what was being thrown away.
   * `DISPLAYTITLE`/`DEFAULTSORT` are also lifted here, which is RB-12 §2.4 step 3's
   * "anywhere in BODY" rather than the leading-prefix approximation.
   */
  let rest = "", index = 0;
  while (index < body.length) {
    const opaque = OPAQUE.exec(body.slice(index));
    if (opaque) { rest += opaque[0]; index += opaque[0].length; continue; }
    if (body.startsWith("[[", index)) {
      // A `{{` inside a link is not top level and must not be hoisted out of its label.
      const end = balancedEnd(body, index);
      if (end < 0) { rest += body.slice(index); break; }
      rest += body.slice(index, end); index = end; continue;
    }
    if (body.startsWith("{{", index)) {
      const end = balancedEnd(body, index);
      if (end < 0) { rest += body.slice(index); break; }
      const call = body.slice(index, end);
      index = end;
      if (metadata(call) || infobox(call)) continue;
      rest += call; continue;
    }
    rest += body[index]; index++;
  }
  body = rest;

  let pending: string[] = [], kind: "paragraph" | "list" = "paragraph";
  const flush = () => {
    const text = pending.join("\n").trim(); pending = [];
    if (!text) return;
    if (metadata(text)) return;
    if (unsupported(text)) { raw(text, text.includes("{|") ? "wikitabelle" : text.includes("{{") ? "unbekannte-vorlage" : "sonstiges"); return; }
    if (kind === "list") {
      const ordered = text.startsWith("#");
      if (text.split("\n").some((line) => !line.startsWith(ordered ? "#" : "*") || /^[*#]{2}/.test(line))) { raw(text); return; }
      emit({ kind: "liste", geordnet: ordered, punkte: text.split("\n").map((line) => parseWikiInline(line.replace(/^[*#]\s*/, ""))) });
    } else {
      const inline = parseWikiInline(text), plain = inlinePlainText(inline);
      if (plain.length < (options.minimumParagraphLength ?? 40)) {
        droppedCharacters += plain.length;
        losses.push({ art: "kurzer-absatz", bezeichnung: String(pageid), detail: text });
      } else emit({ kind: "absatz", inhalt: inline });
    }
  };
  const lines = body.split("\n");
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i]!;
    const heading = /^(={2,6})\s*(.+?)\s*\1\s*$/.exec(line);
    if (heading) {
      flush(); const level = heading[1]!.length;
      while (headingPath.length && headingPath.at(-1)!.level >= level) headingPath.pop();
      headingPath.push({ level, title: inlinePlainText(parseWikiInline(heading[2]!)) }); continue;
    }
    if (/^\s*\{\|/.test(line) || /^\s*<blockquote\b/i.test(line)) {
      flush(); const table = /^\s*\{\|/.test(line), chunks = [line];
      const closed = (chunk: string) => table ? /\|}/.test(chunk) : /<\/blockquote\s*>/i.test(chunk);
      while (!closed(chunks.at(-1)!) && i + 1 < lines.length) chunks.push(lines[++i]!);
      const text = chunks.join("\n");
      const content = text.replace(/^\s*<blockquote\b[^>]*>/i, "").replace(/<\/blockquote\s*>\s*$/i, "");
      if (!table && closed(text) && !unsupported(content)) emit({ kind: "zitat", inhalt: parseWikiInline(content.trim()) });
      else raw(text, table ? "wikitabelle" : "sonstiges");
      continue;
    }
    // Lift image markup before paragraph identity is calculated. Media bytes are a separate adapter.
    let file = /\[\[(?:Datei|File|Bild|Image):/i.exec(line);
    while (file) {
      const end = balancedEnd(line, file.index);
      if (end < 0) break;
      const prefix = line.slice(0, file.index);
      if (prefix.trim()) pending.push(prefix);
      flush();
      const text = line.slice(file.index, end);
      image(text, text.slice(2, -2), false);
      line = line.slice(end); file = /\[\[(?:Datei|File|Bild|Image):/i.exec(line);
    }
    if (!line.trim()) { flush(); continue; }
    const nextKind = /^[*#]/.test(line) ? "list" : "paragraph";
    if (pending.length && kind !== nextKind) flush();
    kind = nextKind; pending.push(line);
  }
  flush();
  return { art, blocks, losses, media, droppedCharacters, ...(displayTitle !== undefined ? { displayTitle } : {}), ...(sortKey !== undefined ? { sortKey } : {}) };
}
