import {
  canonicalHash, canonicalJson, deriveAssetId, deriveEntryId, deriveId, derivePassageId, trustImportId, trustRevisionId,
  type AssetId, type CanonicalValue, type EntryId, type PassageId,
} from "@chronicle/core";
import { tuerklasse, type Alias, type Blockinhalt, type Entry, type InlineMark, type InlineText, type Link, type Passage, type Revision, type Verlust } from "@chronicle/chronik";
import type { EronArticle, EronAssetEntwurf, EronImportInput, EronImportResult, EronMediaFile, EronReimportPlan, EronTemplate, ImportedMediaReference, ImportProvenance } from "./model.ts";
import { array, assertJson, integer, object, sourceUrl, string, ImportValidationError } from "./validation.ts";
import { namespaceLinkTarget, blockPlainText, dateiSlug, decomposeWiki, eronNotationTarget, wikiSlug } from "./wikitext.ts";
import { brauchbareQuelle, leseLizenz, parseMediaInventory } from "./medien.ts";

const canonical = (value: unknown): CanonicalValue => value as CanonicalValue;

function parseArticles(value: unknown): EronArticle[] {
  const ids = new Set<number>(), titles = new Set<string>();
  return array(value, "articles", 10_000).map((item, i) => {
    const row = object(item, `articles[${i}]`);
    const title = string(row.title, `articles[${i}].title`, 512);
    const pageid = integer(row.pageid, `articles[${i}].pageid`, 1);
    if (ids.has(pageid) || titles.has(wikiSlug(title))) throw new ImportValidationError(`articles[${i}]`, "duplicate page identity/title");
    ids.add(pageid); titles.add(wikiSlug(title));
    return { title, pageid, ns: integer(row.ns, `articles[${i}].ns`), revid: integer(row.revid, `articles[${i}].revid`, 1), wikitext: string(row.wikitext, `articles[${i}].wikitext`, 1_000_000, true) };
  });
}

function parseTemplates(value: unknown): EronTemplate[] {
  const titles = new Set<string>();
  return array(value, "templates", 10_000).map((item, i) => {
    const row = object(item, `templates[${i}]`);
    const title = string(row.title, `templates[${i}].title`, 512);
    if (titles.has(wikiSlug(title))) throw new ImportValidationError(`templates[${i}]`, "duplicate template title");
    titles.add(wikiSlug(title));
    return { title, source: string(row.source, `templates[${i}].source`, 1_000_000, true) };
  });
}

function mapInline(block: Blockinhalt, map: (inline: readonly InlineText[]) => readonly InlineText[]): Blockinhalt {
  switch (block.kind) {
    case "absatz": case "zitat": case "bildunterschrift": return { ...block, inhalt: map(block.inhalt) };
    case "feld": return { ...block, werte: block.werte.map(map) };
    case "liste": return { ...block, punkte: block.punkte.map(map) };
    case "rohblock": return block;
  }
}

/** Pure, bounded import preview. Server authorization and human acceptance are separate commands. */
export function importEron(input: EronImportInput): EronImportResult {
  assertJson(input.articles, "articles"); assertJson(input.templates, "templates");
  const original = { articles: input.articles, templates: input.templates };
  if (Buffer.byteLength(canonicalJson(canonical(original)), "utf8") > 20_000_000) throw new ImportValidationError("source", "maximum source size is 20 MB");
  const articles = parseArticles(input.articles).sort((a, b) => a.pageid - b.pageid);
  const templates = parseTemplates(input.templates);
  const inventory = parseMediaInventory(input.media);
  const wikiUrl = sourceUrl(input.wikiUrl, "wikiUrl");
  string(input.universeId, "universeId", 128);
  if (input.campaignId !== undefined) string(input.campaignId, "campaignId", 128);
  const importiertAm = string(input.importiertAm, "importiertAm", 40);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(importiertAm) || !Number.isFinite(Date.parse(importiertAm))) throw new ImportValidationError("importiertAm", "UTC ISO timestamp required");
  if (input.minimumParagraphLength !== undefined) integer(input.minimumParagraphLength, "minimumParagraphLength");
  const sourceHash = canonicalHash(canonical(original));
  const scope = canonicalHash({ universeId: input.universeId, campaignId: input.campaignId ?? null, wikiUrl });
  const base = { erzeuger: "eron-json", version: "1", keim: scope };
  const importId = trustImportId(deriveId({ ...base, kind: "import", pfad: [sourceHash, importiertAm] }));
  const entries: Entry[] = [], revisions: Revision[] = [], passages: Passage[] = [], aliases: Alias[] = [], links: Link[] = [];
  const provenance: ImportProvenance[] = [], losses: Verlust[] = [], media: ImportedMediaReference[] = [];
  const targets = new Map<string, EntryId>(), redirects = new Map<string, string>();
  let droppedCharacters = 0;
  const entryIdFor = (pageid: number) => deriveEntryId({ ...base, kind: "entry", pfad: [String(pageid)] });
  for (const article of articles) {
    if (article.ns !== 0) { losses.push({ art: "nicht-umgewandelt", bezeichnung: article.title, detail: "Non-article namespace preserved in source only" }); continue; }
    const redirect = /^\s*#(?:WEITERLEITUNG|REDIRECT)\s*\[\[([^\]]+)\]\]\s*$/i.exec(article.wikitext);
    if (redirect) redirects.set(wikiSlug(article.title), wikiSlug(redirect[1]!.split("|")[0]!));
    else targets.set(wikiSlug(article.title), entryIdFor(article.pageid));
  }
  for (const [from, target] of redirects) {
    let next = target; const seen = new Set([from]);
    while (redirects.has(next) && !seen.has(next)) { seen.add(next); next = redirects.get(next)!; }
    const id = seen.has(next) ? undefined : targets.get(next);
    if (id) { aliases.push({ universeId: input.universeId, vonSlug: from, nachEntryId: id }); targets.set(from, id); }
    else losses.push({ art: "nicht-umgewandelt", bezeichnung: from, detail: "Redirect target is missing or cyclic; preserved in source" });
  }
  for (const article of articles) {
    const slug = wikiSlug(article.title);
    if (article.ns !== 0 || redirects.has(slug)) continue;
    const document = decomposeWiki(article.wikitext, article.pageid, templates, {
      ...(input.minimumParagraphLength !== undefined ? { minimumParagraphLength: input.minimumParagraphLength } : {}),
      ...(input.templateTypes ? { templateTypes: input.templateTypes } : {}),
    });
    losses.push(...document.losses); media.push(...document.media); droppedCharacters += document.droppedCharacters;
    const entryId = entryIdFor(article.pageid);
    const contentHash = canonicalHash(canonical(document.blocks));
    const revisionId = trustRevisionId(deriveId({ ...base, kind: "revision", pfad: [String(article.pageid), String(article.revid), contentHash] }));
    entries.push({ id: entryId, universeId: input.universeId, ...(input.campaignId ? { campaignId: input.campaignId } : {}), slug,
      titel: article.title, art: document.art, kanonstatus: "kanon", aktuelleRevision: revisionId,
      ...(document.displayTitle !== undefined ? { anzeigename: document.displayTitle } : {}), ...(document.sortKey !== undefined ? { sortierschluessel: document.sortKey } : {}) });
    revisions.push({ id: revisionId, entryId, seq: 1, inhaltsHash: contentHash });
    const occurrence = new Map<string, number>();
    const attribution = input.attributionByPageId?.[String(article.pageid)];
    if (attribution) {
      if (attribution.complete !== true) throw new ImportValidationError("attribution", "complete revision history must be explicitly confirmed");
      array(attribution.authors, "attribution.authors").forEach((author) => string(author, "attribution.author", 512));
      integer(attribution.anonymousContributions, "attribution.anonymousContributions");
      if (!/^[0-9a-z]{1,40}$/i.test(attribution.revisionSha1)) throw new ImportValidationError("attribution.revisionSha1", "MediaWiki SHA1 required");
      if (!attribution.authors.length && attribution.anonymousContributions === 0) throw new ImportValidationError("attribution", "author history cannot be empty");
    }
    document.blocks.forEach((block, ord) => {
      // Resolution never enters this hash: creating a target later must not re-identify a passage.
      const hash = canonicalHash(canonical(block.inhalt));
      const n = occurrence.get(hash) ?? 0; occurrence.set(hash, n + 1);
      const pid = derivePassageId({ ...base, kind: "passage", pfad: [String(article.pageid), hash, String(n)] });
      passages.push({ pid, gen: 1, entryId, ord, pfad: block.pfad, inhalt: block.inhalt, geltung: "notiz", praegung: null, erstelltInRevision: revisionId });
      const common = { passageId: pid, importId, quellWikiUrl: wikiUrl,
        quellArtikelUrl: `${wikiUrl}wiki/${encodeURIComponent(article.title.replace(/ /g, "_"))}`,
        quellPageid: article.pageid, quellRevid: article.revid, passageSha256: hash, pfad: block.pfad, ordnung: ord,
        lizenz: string(input.license ?? "CC-BY-SA-3.0", "license", 200), importiertAm };
      if (attribution) provenance.push({ status: "complete", value: { ...common, quellSha1: attribution.revisionSha1,
        autoren: [...new Set(attribution.authors)].sort(), anonymeBeitraege: attribution.anonymousContributions } });
      else provenance.push({ status: "incomplete", value: common, missing: ["complete-author-history", "revision-sha1"] });
    });
  }
  /**
   * DIE BILDER — from "a reference we chose not to convert" to an addressable asset.
   *
   * Two records, on purpose. A `ImportedMediaReference` is one article pointing at one file;
   * an `EronAssetEntwurf` is the file itself. They are not the same thing and merging them was
   * the first thing that broke: `Erismus` alone points at seven plates, `Valor Saron 3.jpg` is
   * pointed at twice, and 14 files in the inventory are pointed at by nobody.
   *
   * The asset id is derived from the NORMALISED file name and the import scope, so the same
   * picture keeps one identity across `[[Datei:Bodin.jpg|mini]]` in the body and
   * `|Bild=Datei:Bodin.jpg` in an infobox — and keeps it across a reimport, which is what makes
   * fetching the bytes a separate, resumable step rather than a second import.
   */
  const assetIdFor = (dateiname: string): AssetId => deriveAssetId({ ...base, kind: "asset", pfad: [dateiname] });
  const inventoryBySlug = new Map<string, EronMediaFile>(inventory.map((file) => [dateiSlug(file.title), file]));
  const referenced = [...new Set(media.map((row) => row.fileName))].sort();
  const entwurf = (dateiname: string, file: EronMediaFile | undefined, verwaist: boolean): EronAssetEntwurf => {
    const lizenz = file ? leseLizenz(file) : { status: "unbekannt" as const };
    const quellUrl = brauchbareQuelle(file?.url);
    const beschreibung = brauchbareQuelle(file?.descriptionurl);
    return {
      id: assetIdFor(dateiname), universeId: input.universeId, dateiname,
      lizenzStatus: lizenz.status, lizenzGesetztVon: "import",
      ...(lizenz.quelle ? { lizenzQuelle: lizenz.quelle } : {}),
      ...(beschreibung ? { beschreibungsseiteUrl: beschreibung } : {}),
      ...(quellUrl ? { quellUrl } : {}),
      // Dimensions and byte count from the inventory are the source's CLAIM. They are useful for
      // deciding what to fetch and are overwritten by measurement the moment bytes arrive.
      ...(file?.width ? { breite: file.width } : {}), ...(file?.height ? { hoehe: file.height } : {}),
      ...(file?.size ? { bytes: file.size } : {}), ...(file?.uploader ? { urheber: file.uploader } : {}),
      ...(file?.uploaded_at ? { hochgeladenAm: file.uploaded_at } : {}),
      ...(file?.mime ? { behaupteterMime: file.mime } : {}),
      verwendetVon: [...(file?.used_by_articles ?? [])].sort(), verwaist, imBestand: file !== undefined,
    };
  };
  const assets: EronAssetEntwurf[] = referenced.map((dateiname) => entwurf(dateiname, inventoryBySlug.get(dateiname), false));
  for (const file of inventory) {
    const dateiname = dateiSlug(file.title);
    if (referenced.includes(dateiname)) continue;
    /**
     * „Verwaist" heißt: **das Quell-Wiki selbst** benutzt die Datei nirgends — nicht bloß, dass
     * sie in den gerade übergebenen Artikeln nicht vorkommt. Der Unterschied ist keine Feinheit:
     * wer zwei von 74 Artikeln importiert, hätte sonst 39 Dateien als verwaist gemeldet
     * bekommen, die in Wahrheit zu den 72 anderen gehören. Eine verwaiste Datei ist ein Fund
     * (fünf Andaria-Karten, die kein Artikel einbindet), eine außerhalb der Auswahl liegende
     * ist schlicht nicht gemeint.
     */
    const verwaist = (file.used_by_articles?.length ?? 0) === 0;
    assets.push(entwurf(dateiname, file, verwaist));
    if (verwaist) losses.push({ art: "verwaiste-datei", bezeichnung: dateiname, detail: "Keine Seite dieses Wikis benutzt die Datei" });
  }
  assets.sort((a, b) => a.dateiname < b.dateiname ? -1 : a.dateiname > b.dateiname ? 1 : 0);
  const assetsBySlug = new Map(assets.map((asset) => [asset.dateiname, asset]));
  for (const dateiname of referenced) {
    if (inventoryBySlug.has(dateiname) || inventory.length === 0) continue;
    // The inventory answered, and this file is not in it: the article points at a picture that
    // was never uploaded. That is a red link with an image tag, and it is worth saying so.
    losses.push({ art: "nicht-umgewandelt", bezeichnung: dateiname, detail: "Die Datei ist im Quell-Wiki nicht vorhanden" });
  }
  const enrichedMedia: ImportedMediaReference[] = media.map((row) => {
    const asset = assetsBySlug.get(row.fileName);
    const file = inventoryBySlug.get(row.fileName);
    return { ...row, licenseStatus: asset?.lizenzStatus ?? "unbekannt", state: file ? "beschrieben" : "referenziert",
      ...(asset ? { assetId: asset.id } : {}),
      ...(asset?.beschreibungsseiteUrl ? { beschreibungsseiteUrl: asset.beschreibungsseiteUrl } : {}),
      ...(asset?.quellUrl ? { quellUrl: asset.quellUrl } : {}),
      ...(asset?.urheber ? { urheber: asset.urheber } : {}),
      ...(file?.mime ? { behaupteterMime: file.mime } : {}) };
  });
  const missingTargets = new Map<string, Set<EntryId>>();
  const reject = input.rejectLinkTarget ?? eronNotationTarget;
  const linkedPassages = passages.map((passage): Passage => ({ ...passage, inhalt: mapInline(passage.inhalt, (inline) => inline.map((part) => ({
    ...part, marks: part.marks.flatMap<InlineMark>((mark) => {
      if (mark.art !== "link") return [mark];
      // A namespace link is not a missing article. Counting it as a door inflates the one
      // number this product sells, with demand for a page nobody can ever write.
      if (namespaceLinkTarget(mark.zielSlug)) {
        losses.push({ art: "verworfenes-linkziel", bezeichnung: mark.zielSlug,
          detail: `Namensraum-Link, keine Tür (Passage ${passage.pid})` });
        return [];
      }
      const target = targets.get(mark.zielSlug);
      if (!target) {
        const sources = missingTargets.get(mark.zielSlug) ?? new Set<EntryId>(); sources.add(passage.entryId); missingTargets.set(mark.zielSlug, sources);
        if (reject(mark.zielSlug)) {
          losses.push({ art: "verworfenes-linkziel", bezeichnung: mark.zielSlug, detail: `Passage ${passage.pid}` }); return [];
        }
      }
      links.push({ quellEntryId: passage.entryId, quellPassageId: passage.pid, zielSlug: mark.zielSlug, ...(target ? { zielEntryId: target } : {}) });
      return [{ ...mark, ...(target ? { zielEntryId: target } : {}) }];
    }),
  }))) }));
  /**
   * The figure's asset id is resolved here and NOT before, for the same reason a link target is:
   * `derivePassageId` hashes the block as the source wrote it, so a passage may not change
   * identity because a file was later found, licensed or fetched.
   */
  const resolvedPassages = linkedPassages.map((passage): Passage => passage.inhalt.kind === "bildunterschrift"
    ? { ...passage, inhalt: { ...passage.inhalt, assetId: assetIdFor(passage.inhalt.dateiname ?? String(passage.inhalt.assetId)) } }
    : passage);

  /**
   * §2.8 keeps an unconvertible block RAW. That is a statement about STRUCTURE, and it must not
   * quietly become a statement about DEMAND: a refusal to convert is not a refusal to notice.
   *
   * The corpus's single wikitable — `Liste der Häuser von Andaria` — carries **51 distinct link
   * targets**, the noble houses. Left unharvested they are 7.4 % of the cold-start door
   * inventory, invisible: a door that is never extracted can never be triaged, ranked or opened.
   *
   * Harvesting them breaks neither half of §2.8's rule. Nothing is silently DROPPED (the block
   * still renders verbatim in its bordered card, "Aus dem Wiki übernommen — nicht umgewandelt")
   * and nothing is silently PROMOTED (no structure is invented, no passage is created, the table
   * stays a `rohblock`). Only the demand is registered, anchored on the rohblock passage that
   * actually contains it.
   */
  const harvestRohblockTargets = (quelltext: string): string[] => {
    const out: string[] = [];
    const text = quelltext.replace(/<nowiki\b[^>]*>[\s\S]*?<\/nowiki\s*>|<!--[\s\S]*?-->/gi, "");
    for (const match of text.matchAll(/\[\[([^\]|]+)/g)) {
      const slug = wikiSlug(match[1]!);
      if (slug && !namespaceLinkTarget(slug) && !out.includes(slug)) out.push(slug);
    }
    return out;
  };
  for (const passage of resolvedPassages) {
    if (passage.inhalt.kind !== "rohblock") continue;
    for (const slug of harvestRohblockTargets(passage.inhalt.quelltext)) {
      const target = targets.get(slug);
      if (!target) {
        const sources = missingTargets.get(slug) ?? new Set<EntryId>();
        sources.add(passage.entryId);
        missingTargets.set(slug, sources);
        if (reject(slug)) continue;
      }
      links.push({ quellEntryId: passage.entryId, quellPassageId: passage.pid, zielSlug: slug,
        ...(target ? { zielEntryId: target } : {}) });
    }
  }
  const redLinks = [...missingTargets].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
    .map(([zielSlug, sources]) => ({ zielSlug, eingehend: sources.size, klasse: tuerklasse(sources.size, reject(zielSlug)) }));
  const passageCounts = { absatz: 0, feld: 0, liste: 0, zitat: 0, bildunterschrift: 0, rohblock: 0 };
  passages.forEach((passage) => passageCounts[passage.inhalt.kind]++);
  const doorCounts = { tuer: 0, spur: 0, notiz: 0, verworfen: 0 }; redLinks.forEach((link) => doorCounts[link.klasse]++);
  const assetLicenceCounts = { frei: 0, zitat: 0, unbekannt: 0 }; assets.forEach((asset) => assetLicenceCounts[asset.lizenzStatus]++);
  const retainedCharacters = passages.reduce((sum, passage) => sum + blockPlainText(passage.inhalt).length, 0);
  return { importerVersion: "1", importId, universeId: input.universeId, ...(input.campaignId ? { campaignId: input.campaignId } : {}),
    entries, revisions, passages: resolvedPassages, aliases, links, redLinks, provenance, media: enrichedMedia, assets,
    source: { format: "eron-json", sha256: sourceHash, wikiUrl, ...JSON.parse(JSON.stringify(original)) as typeof original },
    report: { importId, quelle: wikiUrl, eintraege: entries.length, aliase: aliases.length, passagen: passages.length,
      passagenNachArt: passageCounts, blaueKanten: links.filter((link) => link.zielEntryId !== undefined).length,
      roteKanten: links.filter((link) => link.zielEntryId === undefined).length, distinkteRoteZiele: redLinks.length,
      tuerbilanz: doorCounts, verluste: losses, textErhaltung: retainedCharacters + droppedCharacters === 0 ? 1 : retainedCharacters / (retainedCharacters + droppedCharacters),
      // Counted over FILES, not over references: seven plates in one article are seven files,
      // and the same portrait used twice is one. No byte has been fetched at this point — the
      // count says what the source wiki claims about its own pictures, which for this corpus is
      // "nothing at all" for 37 of 41 of them.
      assetsNachLizenz: assetLicenceCounts },
    reviewRequired: true, attributionComplete: provenance.every((item) => item.status === "complete"),
  };
}

/** Reimport cannot revoke a human's historical knowledge or mint upstream edits automatically. */
export function planEronReimport(previous: EronImportResult, next: EronImportResult): EronReimportPlan {
  if (previous.universeId !== next.universeId || previous.campaignId !== next.campaignId || previous.source.wikiUrl !== next.source.wikiUrl) {
    throw new ImportValidationError("reimport", "source and universe/campaign must match");
  }
  const key = (row: ImportProvenance) => `${row.value.quellPageid}:${row.value.passageSha256}`;
  const oldByHash = new Map<string, PassageId[]>();
  previous.provenance.forEach((row) => { const ids = oldByHash.get(key(row)) ?? []; ids.push(row.value.passageId); oldByHash.set(key(row), ids); });
  const nextProvenance = new Map(next.provenance.map((row) => [row.value.passageId, row]));
  const kept = new Set<PassageId>(), additions: Passage[] = [];
  const unchanged: { existingPassageId: PassageId; candidatePassageId: PassageId }[] = [];
  for (const candidate of next.passages) {
    const row = nextProvenance.get(candidate.pid);
    const old = row ? oldByHash.get(key(row))?.shift() : undefined;
    if (old) { kept.add(old); unchanged.push({ existingPassageId: old, candidatePassageId: candidate.pid }); }
    else additions.push(candidate);
  }
  const oldEntries = new Map(previous.entries.map((entry) => [entry.id, entry]));
  return { unchanged, additions, removalCandidates: previous.passages.filter((passage) => !kept.has(passage.pid)),
    entryChanges: next.entries.filter((entry) => canonicalJson(canonical(entry)) !== canonicalJson(canonical(oldEntries.get(entry.id) ?? null))).map((entry) => entry.id), reviewRequired: true };
}
