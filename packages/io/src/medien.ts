import type { LizenzStatus } from "@chronicle/chronik";
import type { EronMediaFile } from "./model.ts";
import { array, object, string, ImportValidationError } from "./validation.ts";
import { dateiSlug } from "./wikitext.ts";

/**
 * DIE LIZENZLESUNG.
 *
 * The measured starting point, and it is the reason this file is careful rather than clever:
 * on the real corpus **0 of 41 files carry any licence field at all** (`LicenseShortName`,
 * `License`, `UsageTerms` are empty throughout), and exactly four carry a licence *category* —
 * one `PD`, one `Bildzitat`, one `Lizenz unbekannt`, two housekeeping. The wiki is therefore
 * telling us, in its own categories, that part of its picture collection is not its authors'.
 *
 * The contract (`Asset` in @chronicle/chronik) states the rule this implements: *a file with an
 * unknown licence is imported, quarantined and visibly marked. It is never refused and it is
 * never treated as clean.* So the classifier is deliberately pessimistic:
 *
 * - `frei` requires a NAMED licence — CC0, CC BY, CC BY-SA, GFDL, public domain, gemeinfrei.
 * - `zitat` is set when the wiki itself declares a quotation or fair use. That is the wiki
 *   admitting the file is somebody else's.
 * - everything else is `unbekannt`, **including `{{Selbst erstellt}}`**. "Own work" names an
 *   author; it does not grant terms. Reading it as a licence would let the most common
 *   self-declaration on any wiki launder itself into a permission nobody gave.
 *
 * Every verdict carries the exact text it was made from, so a human can overrule it and see why.
 */
const FREIE_LIZENZ = /\b(?:cc[\s-]?0|cc[\s-]?by(?:[\s-]?sa)?(?:[\s-]?\d(?:\.\d)?)?|creative[\s-]?commons|public[\s-]?domain|gemeinfrei|gfdl|free[\s-]art[\s-]licen[cs]e)\b/i;
const ZITAT_LIZENZ = /\b(?:bildzitat|zitatrecht|fair[\s-]?use|zitat)\b/i;
const UNBEKANNT_LIZENZ = /\b(?:lizenz[\s-]?unbekannt|unknown[\s-]?licen[cs]e|no[\s-]?licen[cs]e)\b/i;

/**
 * A category NAME is structured evidence; prose is not. `Kategorie:PD` is a licence statement on
 * every MediaWiki that uses it, while the letters "pd" inside a sentence are noise — so the
 * two-letter forms are admitted here and nowhere else. The whole string must match.
 */
const FREIE_KATEGORIE = /^(?:pd(?:[-\s].{0,40})?|cc(?:[\s-]?by(?:[\s-]?sa)?)?(?:[\s-]?\d(?:\.\d)?)?|gemeinfrei|public[\s-]?domain|gfdl|copyleft)$/i;

export interface Lizenzurteil {
  readonly status: LizenzStatus;
  /** The exact source text the verdict rests on, or absent when nothing said anything. */
  readonly quelle?: string;
}

export function leseLizenz(file: EronMediaFile): Lizenzurteil {
  const kandidaten: string[] = [];
  const kategorien: string[] = [];
  for (const kategorie of file.categories ?? []) {
    const name = kategorie.replace(/^Kategorie:|^Category:/i, "").trim();
    kategorien.push(name); kandidaten.push(name);
  }
  for (const key of ["LicenseShortName", "License", "UsageTerms", "Attribution", "Copyrighted"]) {
    const value = file.licence?.[key];
    if (typeof value === "string" && value.trim()) kandidaten.push(value.trim());
  }
  if (typeof file.description_page_wikitext === "string") {
    // Only the templates and headings of the description page, not its prose: a sentence
    // mentioning "public domain" in passing must not licence somebody's artwork.
    for (const match of file.description_page_wikitext.matchAll(/\{\{([^}|]{1,120})/g)) kandidaten.push(match[1]!.trim());
  }
  // Explicit "unknown" beats everything: a wiki that says it does not know must not be
  // overridden by a stray word somewhere else on the page.
  for (const text of kandidaten) if (UNBEKANNT_LIZENZ.test(text)) return { status: "unbekannt", quelle: text };
  for (const text of kandidaten) if (ZITAT_LIZENZ.test(text)) return { status: "zitat", quelle: text };
  for (const text of kandidaten) if (FREIE_LIZENZ.test(text)) return { status: "frei", quelle: text };
  for (const name of kategorien) if (FREIE_KATEGORIE.test(name)) return { status: "frei", quelle: name };
  const erste = kandidaten.find((text) => text.length > 0);
  return { status: "unbekannt", ...(erste ? { quelle: erste } : {}) };
}

/** Bounded parse of the file inventory. Same discipline as articles: shape, size, no surprises. */
export function parseMediaInventory(value: unknown): EronMediaFile[] {
  if (value === undefined || value === null) return [];
  const seen = new Set<string>();
  const out: EronMediaFile[] = [];
  for (const [i, item] of array(value, "media", 20_000).entries()) {
    const row = object(item, `media[${i}]`);
    const title = string(row.title, `media[${i}].title`, 512);
    const slug = dateiSlug(title);
    if (!slug) throw new ImportValidationError(`media[${i}].title`, "file name required");
    // A duplicate row is a source defect, not something to average out silently.
    if (seen.has(slug)) throw new ImportValidationError(`media[${i}]`, "duplicate file title");
    seen.add(slug);
    const text = (key: string, max = 2048): string | undefined => {
      const raw = row[key];
      return typeof raw === "string" && raw.trim() ? string(raw, `media[${i}].${key}`, max) : undefined;
    };
    const zahl = (key: string): number | undefined => {
      const raw = row[key];
      return typeof raw === "number" && Number.isSafeInteger(raw) && raw >= 0 ? raw : undefined;
    };
    const kategorien = Array.isArray(row.categories)
      ? row.categories.filter((c): c is string => typeof c === "string").slice(0, 256).map((c) => c.slice(0, 512)) : [];
    const genutztVon = Array.isArray(row.used_by_articles)
      ? row.used_by_articles.filter((c): c is string => typeof c === "string").slice(0, 4096).map((c) => c.slice(0, 512)) : [];
    const lizenz = row.licence ?? row.license;
    out.push({
      title, categories: kategorien, used_by_articles: genutztVon,
      ...(text("url", 4096) ? { url: text("url", 4096)! } : {}),
      ...(text("descriptionurl", 4096) ? { descriptionurl: text("descriptionurl", 4096)! } : {}),
      ...(text("mime", 200) ? { mime: text("mime", 200)! } : {}),
      ...(text("uploader", 512) ? { uploader: text("uploader", 512)! } : {}),
      ...(text("uploaded_at", 64) ? { uploaded_at: text("uploaded_at", 64)! } : {}),
      ...(text("description_page_wikitext", 100_000) ? { description_page_wikitext: text("description_page_wikitext", 100_000)! } : {}),
      ...(zahl("width") !== undefined ? { width: zahl("width")! } : {}),
      ...(zahl("height") !== undefined ? { height: zahl("height")! } : {}),
      ...(zahl("size") !== undefined ? { size: zahl("size")! } : {}),
      ...(lizenz && typeof lizenz === "object" && !Array.isArray(lizenz)
        ? { licence: Object.fromEntries(Object.entries(lizenz as Record<string, unknown>)
            .filter(([, v]) => v === null || typeof v === "string").slice(0, 64)
            .map(([k, v]) => [k.slice(0, 128), typeof v === "string" ? v.slice(0, 4096) : null])) }
        : {}),
    });
  }
  return out;
}

/**
 * Only http(s), only a plain URL. The stored address is provenance and a fetch instruction; a
 * `javascript:` or `data:` "source" would be neither.
 */
export const brauchbareQuelle = (url: string | undefined): string | undefined => {
  if (!url) return undefined;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.toString() : undefined;
  } catch { return undefined; }
};
