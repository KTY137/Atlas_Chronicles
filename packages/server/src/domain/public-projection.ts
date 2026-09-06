import type { Blockinhalt, InlineText, Passage } from "@chronicle/chronik";
import { HIGH_CONTRAST_COLORS, THEME_MOTION_RECIPES, type ThemeColors, type ThemeFontId, type ThemeManifestV1 } from "@chronicle/theme";
import { canonicalJson, textHash, type CanonicalValue } from "@chronicle/core";
import type * as P from "../../../protocol/src/authoring.ts";
import type { Db } from "../db/index.ts";
import { Gone } from "./errors.ts";
import { collectPublicationSources, publicTheme, readPublicationPolicy, normalizePublicationRoute } from "./authoring.ts";

export interface PublicEntrySource { entryId: string; publication: P.EntryPublication; document: { title: string; slug: string; passagen: readonly Passage[] } }
export interface PublicDeliveryConfig { origin: string; publicDeliveryEnabled?: boolean }
const byText = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
export const publicBytes = (value: unknown) => canonicalJson(value as CanonicalValue);
export const publicHash = (value: unknown) => textHash(publicBytes(value));
export const publicPath = (world: Pick<P.PublicWorld, "publicKey" | "slug">, slug?: string) => `/w/${encodeURIComponent(world.publicKey)}/${encodeURIComponent(world.slug)}${slug === undefined ? "" : "/" + encodeURIComponent(slug)}`;

/** No viewer identity or membership enters this projection. Its complete inputs are
 * immutable selected revisions plus explicit publication policy and public routes. */
export function projectPublicWorld(policy: P.PublicationPolicy, sources: readonly PublicEntrySource[], routes: readonly P.PublicationRoute[], theme: ThemeManifestV1): P.PublicWorld {
  const active = sources.filter(source => source.publication.enabled), byId = new Map(active.map(row => [row.entryId, row.publication.publicSlug]));
  const names = new Map(active.map(row => [row.publication.publicSlug, row.publication.publicSlug]));
  for (const route of routes) if (route.kind === "article" && route.entryId && byId.has(route.entryId)) names.set(route.route, byId.get(route.entryId)!);
  const scope = { publicKey: policy.publicKey, slug: policy.worldSlug };
  const inline = (values: readonly InlineText[]): P.PublicInline[] => values.map(value => ({ text: value.text, marks: value.marks.map(mark => {
    switch (mark.art) {
      case "em": case "strong": case "code": return { art: mark.art };
      case "link": {
        const target = mark.zielEntryId ? byId.get(mark.zielEntryId) : names.get(mark.zielSlug);
        return { art: "link", href: target ? publicPath(scope, target) : null };
      }
      default: { const exhaustive: never = mark; return exhaustive; }
    }
  }) }));
  const block = (value: Blockinhalt): P.PublicBlock => {
    switch (value.kind) {
      case "absatz": case "zitat": case "bildunterschrift": return { kind: value.kind, inhalt: inline(value.inhalt) };
      case "feld": return { kind: "feld", schluessel: value.schluessel, label: value.label, gruppe: value.gruppe ?? null, werte: value.werte.map(inline), mehrwertig: value.mehrwertig };
      case "liste": return { kind: "liste", geordnet: value.geordnet, punkte: value.punkte.map(inline) };
      case "rohblock": return { kind: "rohblock", quelltext: value.quelltext };
      default: { const exhaustive: never = value; return exhaustive; }
    }
  };
  const entries: P.PublicEntry[] = active.map(source => {
    const publication = source.publication, selected = new Set(publication.passageIds), ordinals = new Map<string, number>();
    const passages = source.document.passagen.filter(p => selected.has(p.pid)).map((p, ordinal) => { ordinals.set(p.pid, ordinal); return { ordinal, path: p.pfad, content: block(p.inhalt) }; });
    return { slug: publication.publicSlug, title: source.document.title, passages, contentWarnings: publication.metadata.contentWarnings, attributions: publication.metadata.attributions,
      mints: publication.metadata.mints.map(mint => ({ ordinal: ordinals.get(mint.passageId)!, date: mint.date, kind: mint.kind })) };
  }).sort((a, b) => byText(a.slug, b.slug));
  return { publicKey: policy.publicKey, slug: policy.worldSlug, title: policy.title, description: policy.description, locale: policy.locale, contentWarnings: policy.contentWarnings, theme, entries };
}

export function createPublication(db: Db, config: PublicDeliveryConfig) {
  function gate() { if (config.publicDeliveryEnabled !== true) throw new Gone(); }
  async function withWorld<T>(publicKey: string, work: (world: P.PublicWorld, routes: P.PublicationRoute[], tx: Db) => Promise<T> | T): Promise<T> {
    gate();
    return db.transaction(async tx => {
      // Writers use the exclusive campaign lock. Hold the shared admission lock
      // through rendering/sending, so a committed unpublish wins every later read.
      const row = (await tx.query<{ campaign_id: string }>(`SELECT p.campaign_id FROM campaign_publications p JOIN campaigns c ON c.id=p.campaign_id
        WHERE p.public_key=$1 AND p.enabled=true FOR SHARE OF c,p`, [publicKey])).rows[0];
      if (!row) throw new Gone(); gate();
      const policy = (await readPublicationPolicy(tx, row.campaign_id))!;
      const aliases = (await tx.query<P.PublicationRoute>('SELECT kind,route,entry_id AS "entryId",source_url AS "sourceUrl" FROM publication_routes WHERE campaign_id=$1', [row.campaign_id])).rows;
      const world = projectPublicWorld(policy, await collectPublicationSources(tx, row.campaign_id), aliases, await publicTheme(tx, row.campaign_id, policy));
      gate(); return work(world, aliases, tx);
    });
  }
  async function resolveLegacy<T>(path: string, work: (location: string) => Promise<T> | T): Promise<T> {
    gate(); let route: string;
    try { route = normalizePublicationRoute("legacy", path); } catch { throw new Gone(); }
    return db.transaction(async tx => {
      const row = (await tx.query<{ public_key: string; entry_id: string }>(`SELECT p.public_key,r.entry_id FROM publication_routes r
        JOIN campaign_publications p ON p.campaign_id=r.campaign_id JOIN campaigns c ON c.id=r.campaign_id
        JOIN entry_publications ep ON ep.entry_id=r.entry_id AND ep.campaign_id=r.campaign_id JOIN entries e ON e.id=ep.entry_id
        WHERE r.kind='legacy' AND r.route=$1 AND p.enabled=true AND e.public=true FOR SHARE OF c,p`, [route])).rows[0];
      if (!row) throw new Gone();
      return createPublication(tx, config).withWorld(row.public_key, (world, aliases) => {
        const alias = aliases.find(r => r.kind === "legacy" && r.route === route && r.entryId === row.entry_id);
        if (!alias) throw new Gone();
        // Resolve canonical entry identity only inside the delivery transaction.
        return tx.query<{ public_slug: string }>("SELECT public_slug FROM entry_publications WHERE entry_id=$1", [row.entry_id]).then(result => {
          const slug = result.rows[0]?.public_slug; if (!slug || !world.entries.some(entry => entry.slug === slug)) throw new Gone();
          return work(publicPath(world, slug));
        });
      });
    });
  }
  async function canonicalRoute<T>(publicKey: string, requestedWorld: string, requestedEntry: string | undefined, work: (world: P.PublicWorld, entry: P.PublicEntry | null, redirect: string | null) => Promise<T> | T): Promise<T> {
    return withWorld(publicKey, async (world, aliases, tx) => {
      if (requestedWorld !== world.slug && !aliases.some(r => r.kind === "world" && r.route === requestedWorld)) throw new Gone();
      let entry: P.PublicEntry | null = null;
      if (requestedEntry !== undefined) {
        entry = world.entries.find(e => e.slug === requestedEntry) ?? null;
        if (!entry) {
          const alias = aliases.find(r => r.kind === "article" && r.route === requestedEntry); if (!alias?.entryId) throw new Gone();
          // Alias IDs never leave the server: return only a published canonical URL.
          const source = (await tx.query<{ public_slug: string }>("SELECT public_slug FROM entry_publications WHERE entry_id=$1", [alias.entryId])).rows[0];
          entry = world.entries.find(e => e.slug === source?.public_slug) ?? null;
        }
        if (!entry) throw new Gone();
      }
      const changed = requestedWorld !== world.slug || requestedEntry !== undefined && requestedEntry !== entry?.slug;
      return work(world, entry, changed ? publicPath(world, entry?.slug) : null);
    });
  }
  return { withWorld, canonicalRoute, resolveLegacy, getWorld: (publicKey: string) => withWorld(publicKey, world => world),
    listWorlds: async () => { gate(); return (await db.query<{ public_key: string }>("SELECT public_key FROM campaign_publications WHERE enabled=true ORDER BY public_key COLLATE \"C\"")).rows.map(row => row.public_key); } };
}

const escape = (value: string): string => value.replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
const inlineText = (values: readonly P.PublicInline[]) => values.map(value => value.text).join("");
export function publicBlockText(block: P.PublicBlock): string {
  switch (block.kind) {
    case "absatz": case "zitat": case "bildunterschrift": return inlineText(block.inhalt);
    case "feld": return `${block.label}: ${block.werte.map(inlineText).join(", ")}`;
    case "liste": return block.punkte.map(inlineText).join(" ");
    case "rohblock": return block.quelltext;
  }
}
function inlineHtml(values: readonly P.PublicInline[]): string {
  return values.map(value => {
    let text = escape(value.text);
    for (const mark of value.marks) {
      switch (mark.art) {
        case "em": case "strong": case "code": text = `<${mark.art}>${text}</${mark.art}>`; break;
        case "link": text = mark.href ? `<a href="${escape(mark.href)}">${text}</a>` : `<span>${text}</span>`; break;
      }
    }
    return text;
  }).join("");
}
function blockHtml(block: P.PublicBlock): string {
  switch (block.kind) {
    case "absatz": return `<p>${inlineHtml(block.inhalt)}</p>`;
    case "zitat": return `<blockquote>${inlineHtml(block.inhalt)}</blockquote>`;
    case "bildunterschrift": return `<p class="caption">${inlineHtml(block.inhalt)}</p>`;
    case "feld": return `<dl><dt>${escape(block.label)}</dt>${block.werte.map(value => `<dd>${inlineHtml(value)}</dd>`).join("")}</dl>`;
    case "liste": { const tag = block.geordnet ? "ol" : "ul"; return `<${tag}>${block.punkte.map(value => `<li>${inlineHtml(value)}</li>`).join("")}</${tag}>`; }
    case "rohblock": return `<pre>${escape(block.quelltext)}</pre>`;
  }
}
export function publicSearch(world: P.PublicWorld, query: string) {
  const needle = query.trim().normalize("NFKC").toLowerCase();
  const results = world.entries.filter(entry => `${entry.title} ${entry.passages.map(p => publicBlockText(p.content)).join(" ")}`.normalize("NFKC").toLowerCase().includes(needle))
    .map(entry => ({ title: entry.title, url: publicPath(world, entry.slug), excerpt: entry.passages.map(p => publicBlockText(p.content)).join(" ").slice(0, 240) }));
  return { results, count: results.length };
}
export function publicBacklinks(world: P.PublicWorld, target: P.PublicEntry) {
  const href = publicPath(world, target.slug);
  const hasLink = (block: P.PublicBlock): boolean => {
    const rows = block.kind === "feld" ? block.werte : block.kind === "liste" ? block.punkte : block.kind === "rohblock" ? [] : [block.inhalt];
    return rows.some(row => row.some(value => value.marks.some(mark => mark.art === "link" && mark.href === href)));
  };
  return world.entries.filter(entry => entry.passages.some(p => hasLink(p.content))).map(entry => ({ title: entry.title, url: publicPath(world, entry.slug) }));
}
export function publicFeed(world: P.PublicWorld, origin: string) {
  const visible = world.entries.flatMap(entry => entry.mints.map(mint => ({ title: entry.title, url: absolute(origin, publicPath(world, entry.slug)) + `#passage-${mint.ordinal + 1}`,
    content_text: publicBlockText(entry.passages[mint.ordinal]!.content), _chronicle: { date: mint.date, kind: mint.kind } })))
    .sort((a, b) => byText(b._chronicle.date, a._chronicle.date) || byText(a.url, b.url) || byText(a._chronicle.kind, b._chronicle.kind));
  // Publicly identical selections are one feed item. No seal, PID, hidden mint ID
  // or timestamp is used to distinguish otherwise identical public records.
  const items = [...new Map(visible.map(item => { const id = publicHash(item); return [id, { id, ...item }] as const; })).values()];
  return { version: "https://jsonfeed.org/version/1.1", title: world.title, description: world.description, language: world.locale,
    home_page_url: absolute(origin, publicPath(world)), feed_url: absolute(origin, `/public/${encodeURIComponent(world.publicKey)}/feed.json`), items };
}
const absolute = (origin: string, path: string) => new URL(path, new URL(origin).origin).href;
export function publicSitemap(world: P.PublicWorld, origin: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${[publicPath(world), ...world.entries.map(entry => publicPath(world, entry.slug))].map(path => `<url><loc>${escape(absolute(origin, path))}</loc></url>`).join("")}</urlset>`;
}
export function publicRobots(world: P.PublicWorld, origin: string): string { return `User-agent: *\nAllow: ${publicPath(world)}\nSitemap: ${absolute(origin, `/public/${encodeURIComponent(world.publicKey)}/sitemap.xml`)}\n`; }
const PUBLIC_FONTS: Readonly<Record<ThemeFontId, string>> = Object.freeze({ cinzel: "Georgia,'Times New Roman',serif", plex: "system-ui,-apple-system,'Segoe UI',sans-serif", system: "system-ui,-apple-system,'Segoe UI',sans-serif", serif: "Georgia,'Times New Roman',serif", mono: "ui-monospace,'Cascadia Code',Consolas,monospace" });
const colorVariables = (colors: ThemeColors) => Object.entries(colors).map(([key, value]) => `--${key}:${value}`).join(";");
function publicThemeCss(theme: ThemeManifestV1): string {
  const motion = THEME_MOTION_RECIPES[theme.motion];
  return `:root{${colorVariables(theme.colors)};--space:${theme.geometry.spacing}px;--radius:${theme.geometry.radius}px;--border:${theme.geometry.border}px;--font-display:${PUBLIC_FONTS[theme.typography.display]};--font-body:${PUBLIC_FONTS[theme.typography.body]};--font-mono:${PUBLIC_FONTS.mono}}
html{color-scheme:normal}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font-size:1.125rem;line-height:1.7;font-family:var(--font-body)}
header,main{max-width:75ch;margin:auto;padding:max(1rem,calc(var(--space)*3))}header{border-bottom:var(--border) solid var(--line-strong)}h1,h2,h3{font-family:var(--font-display);line-height:1.3;overflow-wrap:anywhere}section,article>footer{margin-block:calc(var(--space)*4)}
a{color:var(--link);text-underline-offset:.2em;transition:color ${motion.controlMs}ms ${motion.cadence === "steps" ? "steps(4,end)" : "ease"}}a:visited{color:var(--link-visited)}a:focus-visible{outline:3px solid var(--focus);outline-offset:4px}::selection{background:var(--selection);color:var(--selection-ink)}
code,pre{font-family:var(--font-mono)}pre{white-space:pre-wrap;overflow-wrap:anywhere}blockquote{border-inline-start:var(--border) solid var(--accent);margin-inline:0;padding-inline:calc(var(--space)*2)}.warnings{background:var(--warning-soft);color:var(--warning);padding:calc(var(--space)*2);border:var(--border) solid currentColor;border-radius:var(--radius)}
[data-edges=etched] header{border-bottom:calc(var(--border)*3) double var(--line-strong)}[data-edges=cut] .warnings{border-inline-start-width:calc(var(--border)*4);border-start-start-radius:0;border-end-end-radius:0}[data-edges=pixel] .warnings{border-radius:0;box-shadow:var(--border) var(--border) 0 var(--warning)}
li,dd{overflow-wrap:anywhere}img,canvas{max-width:100%;image-rendering:${theme.sampling === "nearest" ? "pixelated" : "auto"}}.skip{position:absolute;inset-inline-start:-10000px}.skip:focus{inset-inline-start:1rem;background:var(--bg);padding:.5rem;z-index:1}
@media(prefers-contrast:more){:root{${colorVariables(HIGH_CONTRAST_COLORS)}}.warnings{box-shadow:none}header{border-bottom:2px solid var(--text)}}
@media(forced-colors:active){:root{--bg:Canvas;--text:CanvasText;--link:LinkText;--link-visited:VisitedText;--focus:Highlight;--warning-soft:Canvas;--warning:CanvasText;--line-strong:CanvasText;--accent:CanvasText;--selection:Highlight;--selection-ink:HighlightText}*{forced-color-adjust:auto}.warnings{box-shadow:none}}
@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}}`;
}
export function publicSocialCard(world: P.PublicWorld, entry: P.PublicEntry | null = null): string {
  const title = entry?.title ?? world.title, text = (entry ? entry.passages.map(p => publicBlockText(p.content)).join(" ") : world.description).slice(0, 180);
  const lines = text.match(/.{1,55}(?:\s|$)|.{1,55}/gu) ?? [];
  const theme = world.theme;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-label="${escape(title)}"><rect width="1200" height="630" fill="${theme.colors.bg}"/><rect x="60" y="60" width="1080" height="510" rx="${theme.geometry.radius}" fill="none" stroke="${theme.colors.accent}" stroke-width="${theme.geometry.border * 2}"/><text x="100" y="170" fill="${theme.colors.text}" font-family="${escape(PUBLIC_FONTS[theme.typography.display])}" font-size="48">${escape(title.slice(0, 48))}</text>${lines.slice(0, 4).map((line, i) => `<text x="100" y="${280 + i * 50}" fill="${theme.colors.text}" font-family="${escape(PUBLIC_FONTS[theme.typography.body])}" font-size="28">${escape(line)}</text>`).join("")}</svg>`;
}
export function publicHtml(world: P.PublicWorld, origin: string, entry: P.PublicEntry | null = null): string {
  const de = world.locale === "de", title = entry?.title ?? world.title, path = publicPath(world, entry?.slug), description = (entry ? entry.passages.map(p => publicBlockText(p.content)).join(" ") : world.description).slice(0, 240);
  const canonical = absolute(origin, path), card = absolute(origin, `/public/${encodeURIComponent(world.publicKey)}/social.svg${entry ? "?article=" + encodeURIComponent(entry.slug) : ""}`);
  const warnings = [...world.contentWarnings, ...(entry?.contentWarnings ?? [])];
  const body = entry ? `<article><h1>${escape(entry.title)}</h1>${entry.passages.map(p => `<section id="passage-${p.ordinal + 1}">${p.path.length ? `<h2>${escape(p.path.join(" / "))}</h2>` : ""}${blockHtml(p.content)}</section>`).join("")}${entry.attributions.length ? `<footer><h2>${de ? "Quellen und Lizenz" : "Sources and license"}</h2><ul>${entry.attributions.map(a => `<li><a href="${escape(a.sourceUrl)}" rel="noreferrer">${escape(a.sourceUrl)}</a> · ${escape(a.license)} · ${escape(a.authors.join(", "))}${a.anonymousContributions ? ` · ${a.anonymousContributions} ${de ? "anonyme Beiträge" : "anonymous contributions"}` : ""}</li>`).join("")}</ul></footer>` : ""}</article>`
    : `<h1>${escape(world.title)}</h1><p>${escape(world.description)}</p><ul>${world.entries.map(e => `<li><a href="${escape(publicPath(world, e.slug))}">${escape(e.title)}</a></li>`).join("")}</ul>`;
  return `<!doctype html><html lang="${world.locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(title)}</title><meta name="description" content="${escape(description)}"><link rel="canonical" href="${escape(canonical)}"><meta property="og:title" content="${escape(title)}"><meta property="og:description" content="${escape(description)}"><meta property="og:url" content="${escape(canonical)}"><meta property="og:locale" content="${de ? "de_DE" : "en_US"}"><meta property="og:image" content="${escape(card)}"><meta property="og:type" content="${entry ? "article" : "website"}"><link rel="alternate" type="application/feed+json" href="/public/${encodeURIComponent(world.publicKey)}/feed.json"><style>${publicThemeCss(world.theme)}</style></head><body data-edges="${world.theme.geometry.edges}"><a class="skip" href="#content">${de ? "Zum Inhalt" : "Skip to content"}</a><header><nav aria-label="${de ? "Welt" : "World"}"><a href="${escape(publicPath(world))}">${escape(world.title)}</a></nav></header><main id="content">${warnings.length ? `<aside class="warnings" aria-label="${de ? "Inhaltshinweise" : "Content warnings"}"><ul>${warnings.map(w => `<li>${escape(w)}</li>`).join("")}</ul></aside>` : ""}${body}</main></body></html>`;
}
