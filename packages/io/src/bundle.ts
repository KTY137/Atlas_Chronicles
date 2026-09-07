import { canonicalHash, canonicalJson, type CampaignId, type CanonicalValue, type UniverseId } from "@chronicle/core";
import type { Alias, Asset, Entry, ImportBericht, LineageEvent, Link, Passage, Revelation, Revision } from "@chronicle/chronik";
import type { EronSource, ImportProvenance } from "./model.ts";
import { array, assertJson, boolean, choice, integer, object, sourceUrl, string, ImportValidationError } from "./validation.ts";

export const WIKI_BUNDLE_VERSION = 1 as const;

/** The complete wiki module snapshot. Actor identities and map/rule modules belong to the app bundle. */
export interface WikiBundleData {
  readonly universeId: UniverseId;
  readonly campaignId?: CampaignId;
  readonly entries: readonly Entry[];
  readonly revisions: readonly Revision[];
  readonly passages: readonly Passage[];
  readonly aliases: readonly Alias[];
  readonly links: readonly Link[];
  readonly revelations: readonly Revelation[];
  readonly lineage: readonly LineageEvent[];
  readonly assets: readonly Asset[];
  readonly provenance: readonly ImportProvenance[];
  readonly sources: readonly EronSource[];
  readonly importReports: readonly ImportBericht[];
}

export interface WikiBundle extends WikiBundleData {
  readonly format: "atlas-chronicles/wiki";
  readonly version: typeof WIKI_BUNDLE_VERSION;
  readonly blockAstVersion: 1;
}

type Row = Record<string, unknown>;
const ids = (value: unknown, path: string): string => string(value, path, 128);
const strings = (value: unknown, path: string): string[] => array(value, path).map((v, i) => string(v, `${path}[${i}]`, 100_000, true));
const optional = (row: Row, key: string, path: string) => { if (row[key] !== undefined) string(row[key], `${path}.${key}`, 100_000); };
const hash = (value: unknown, path: string) => {
  if (!/^[a-f0-9]{64}$/.test(string(value, path, 64))) throw new ImportValidationError(path, "SHA256 hex required");
};
function keys(row: Row, allowed: string[], path: string): void {
  for (const key of Object.keys(row)) if (!allowed.includes(key)) throw new ImportValidationError(`${path}.${key}`, "unknown field; migration required");
}
function idRows(value: unknown, id: string, path: string): Map<string, Row> {
  const result = new Map<string, Row>();
  array(value, path).forEach((value, i) => {
    const row = object(value, `${path}[${i}]`), key = ids(row[id], `${path}[${i}].${id}`);
    if (result.has(key)) throw new ImportValidationError(path, `duplicate ${id}`);
    result.set(key, row);
  });
  return result;
}
const reference = (value: unknown, rows: ReadonlyMap<string, unknown>, path: string) => {
  const id = ids(value, path);
  if (!rows.has(id)) throw new ImportValidationError(path, "dangling reference");
  return id;
};

function inline(value: unknown, path: string, entries: Map<string, Row>): void {
  array(value, path).forEach((value, i) => {
    const p = `${path}[${i}]`, row = object(value, p); keys(row, ["text", "marks"], p);
    string(row.text, `${p}.text`, 1_000_000, true);
    array(row.marks, `${p}.marks`, 32).forEach((value, j) => {
      const p2 = `${p}.marks[${j}]`, mark = object(value, p2);
      const art = choice(mark.art, ["em", "strong", "code", "link"], `${p2}.art`);
      keys(mark, art === "link" ? ["art", "zielSlug", "zielEntryId"] : ["art"], p2);
      if (art === "link") {
        string(mark.zielSlug, `${p2}.zielSlug`, 512);
        if (mark.zielEntryId !== undefined) reference(mark.zielEntryId, entries, `${p2}.zielEntryId`);
      }
    });
  });
}

function block(value: unknown, path: string, entries: Map<string, Row>, assets: Map<string, Row>): void {
  const row = object(value, path);
  const kind = choice(row.kind, ["absatz", "feld", "liste", "zitat", "bildunterschrift", "rohblock"], `${path}.kind`);
  switch (kind) {
    case "absatz": case "zitat":
      keys(row, ["kind", "inhalt"], path); inline(row.inhalt, `${path}.inhalt`, entries); break;
    case "bildunterschrift":
      keys(row, ["kind", "assetId", "inhalt", "dateiname", "alt", "ausrichtung", "breite", "ausInfobox"], path);
      reference(row.assetId, assets, `${path}.assetId`); inline(row.inhalt, `${path}.inhalt`, entries);
      optional(row, "dateiname", path); optional(row, "alt", path);
      if (row.ausrichtung !== undefined) choice(row.ausrichtung, ["links", "rechts", "zentriert", "ohne"], `${path}.ausrichtung`);
      if (row.breite !== undefined) integer(row.breite, `${path}.breite`, 1);
      if (row.ausInfobox !== undefined) boolean(row.ausInfobox, `${path}.ausInfobox`);
      break;
    case "feld":
      keys(row, ["kind", "schluessel", "label", "gruppe", "werte", "mehrwertig", "klauselKandidat"], path);
      string(row.schluessel, `${path}.schluessel`, 512); string(row.label, `${path}.label`, 1000); optional(row, "gruppe", path);
      boolean(row.mehrwertig, `${path}.mehrwertig`); boolean(row.klauselKandidat, `${path}.klauselKandidat`);
      array(row.werte, `${path}.werte`).forEach((v, i) => inline(v, `${path}.werte[${i}]`, entries));
      if (row.mehrwertig === false && (row.werte as unknown[]).length !== 1) throw new ImportValidationError(path, "single-valued field needs exactly one value");
      break;
    case "liste":
      keys(row, ["kind", "geordnet", "punkte"], path); boolean(row.geordnet, `${path}.geordnet`);
      array(row.punkte, `${path}.punkte`).forEach((v, i) => inline(v, `${path}.punkte[${i}]`, entries)); break;
    case "rohblock":
      keys(row, ["kind", "quelltext", "grund"], path); string(row.quelltext, `${path}.quelltext`, 1_000_000, true);
      choice(row.grund, ["wikitabelle", "unbekannte-vorlage", "generator-prosa", "sonstiges"], `${path}.grund`); break;
  }
}

function quelle(value: unknown, path: string, passages: Map<string, Row>, mint: boolean): void {
  if (mint && value === null) return;
  const row = object(value, path);
  const art = choice(row.art, mint ? ["wurf", "gesprochen", "ratifikation", "berichtigung", "vollmacht"] : ["wurf", "gesprochen", "gehoert", "passage"], `${path}.art`);
  const key = ({ wurf: "wurfId", gesprochen: "sitzung", ratifikation: "sitzung", berichtigung: "ersetzt", vollmacht: "vollmachtId", gehoert: "von", passage: "ueber" } as const)[art];
  keys(row, ["art", key], path); string(row[key], `${path}.${key}`, 1000);
  if (key === "ersetzt" || key === "ueber") reference(row[key], passages, `${path}.${key}`);
}

/** Strict schema and graph validation. Parsing does not grant roles or write storage. */
export function validateWikiBundle(value: unknown): WikiBundle {
  assertJson(value);
  const row = object(value, "$"), rootKeys = ["format", "version", "blockAstVersion", "universeId", "campaignId", "entries", "revisions", "passages", "aliases", "links", "revelations", "lineage", "assets", "provenance", "sources", "importReports"];
  keys(row, rootKeys, "$");
  if (row.format !== "atlas-chronicles/wiki" || row.version !== WIKI_BUNDLE_VERSION || row.blockAstVersion !== 1) throw new ImportValidationError("$", "unsupported wiki bundle or AST version; explicit migration required");
  ids(row.universeId, "$.universeId"); optional(row, "campaignId", "$");
  const entries = idRows(row.entries, "id", "entries"), revisions = idRows(row.revisions, "id", "revisions"), passages = idRows(row.passages, "pid", "passages"), assets = idRows(row.assets, "id", "assets");
  const slugs = new Set<string>();
  for (const entry of entries.values()) {
    const path = `entries.${String(entry.id)}`;
    keys(entry, ["id", "universeId", "campaignId", "parentEntryId", "slug", "titel", "art", "kanonstatus", "abgeloestDurch", "aktuelleRevision", "erstelltVon", "anzeigename", "sortierschluessel"], path);
    if (entry.universeId !== row.universeId || entry.campaignId !== row.campaignId) throw new ImportValidationError(path, "entry scope differs from bundle scope");
    const slug = string(entry.slug, `${path}.slug`, 512); string(entry.titel, `${path}.titel`, 512);
    if (slugs.has(slug)) throw new ImportValidationError(path, "duplicate entry slug"); slugs.add(slug);
    choice(entry.art, ["charakter", "organisation", "spezies", "gegenstand", "ereignis", "ort", "regelseite", "sonstiges"], `${path}.art`);
    choice(entry.kanonstatus, ["kanon", "geruecht", "apokryph", "abgeloest"], `${path}.kanonstatus`);
    const rev = reference(entry.aktuelleRevision, revisions, `${path}.aktuelleRevision`);
    if (revisions.get(rev)!.entryId !== entry.id) throw new ImportValidationError(path, "current revision belongs to another entry");
    for (const key of ["parentEntryId", "abgeloestDurch"]) if (entry[key] !== undefined) reference(entry[key], entries, `${path}.${key}`);
    for (const key of ["erstelltVon", "anzeigename", "sortierschluessel"]) optional(entry, key, path);
  }
  const sequences = new Set<string>();
  for (const rev of revisions.values()) {
    const path = `revisions.${String(rev.id)}`; keys(rev, ["id", "entryId", "seq", "autorUserId", "inhaltsHash"], path);
    reference(rev.entryId, entries, `${path}.entryId`); integer(rev.seq, `${path}.seq`, 1); hash(rev.inhaltsHash, `${path}.inhaltsHash`); optional(rev, "autorUserId", path);
    const seq = `${String(rev.entryId)}:${String(rev.seq)}`;
    if (sequences.has(seq)) throw new ImportValidationError(path, "duplicate revision sequence"); sequences.add(seq);
  }
  for (const asset of assets.values()) {
    const path = `assets.${String(asset.id)}`; keys(asset, ["id", "universeId", "dateiname", "mime", "sha256", "lizenzStatus", "lizenzQuelle", "lizenzGesetztVon", "beschreibungsseiteUrl", "breite", "hoehe", "bytes", "urheber", "hochgeladenAm", "quellUrl", "behaupteterMime", "verwendetVon", "verwaist", "imBestand"], path);
    if (asset.universeId !== row.universeId) throw new ImportValidationError(path, "asset universe differs from bundle");
    string(asset.dateiname, `${path}.dateiname`, 512);
    // Beide oder keins: `mime` und `sha256` beschreiben Bytes. Ein Bündel darf eine Datei
    // führen, deren Bytes nie geholt wurden — sonst wäre ein Artikel erst exportierbar, wenn
    // jedes Bild darin heruntergeladen ist. Es darf nur nie einen Typ ohne Messung behaupten.
    if ((asset.mime === undefined) !== (asset.sha256 === undefined)) throw new ImportValidationError(path, "asset mime and sha256 are set together or not at all");
    if (asset.mime !== undefined) { string(asset.mime, `${path}.mime`, 200); hash(asset.sha256, `${path}.sha256`); }
    choice(asset.lizenzStatus, ["frei", "zitat", "unbekannt"], `${path}.lizenzStatus`); choice(asset.lizenzGesetztVon, ["import", "mensch"], `${path}.lizenzGesetztVon`);
    optional(asset, "lizenzQuelle", path); optional(asset, "beschreibungsseiteUrl", path);
    optional(asset, "urheber", path); optional(asset, "hochgeladenAm", path); optional(asset, "quellUrl", path);
    optional(asset, "behaupteterMime", path);
    for (const key of ["verwaist", "imBestand"]) if (asset[key] !== undefined) boolean(asset[key], `${path}.${key}`);
    if (asset.verwendetVon !== undefined) array(asset.verwendetVon, `${path}.verwendetVon`, 10_000).forEach((title, i) => string(title, `${path}.verwendetVon[${i}]`, 512));
    for (const key of ["breite", "hoehe", "bytes"]) if (asset[key] !== undefined) integer(asset[key], `${path}.${key}`, 1);
  }
  const ordinals = new Set<string>();
  for (const passage of passages.values()) {
    const path = `passages.${String(passage.pid)}`;
    keys(passage, ["pid", "gen", "entryId", "ord", "pfad", "inhalt", "geltung", "praegung", "autorUserId", "autorActorId", "erstelltInRevision", "zurueckgezogenInRevision"], path);
    reference(passage.entryId, entries, `${path}.entryId`); integer(passage.gen, `${path}.gen`, 1); integer(passage.ord, `${path}.ord`); strings(passage.pfad, `${path}.pfad`);
    choice(passage.geltung, ["notiz", "antrag", "kanon"], `${path}.geltung`); quelle(passage.praegung, `${path}.praegung`, passages, true);
    for (const key of ["erstelltInRevision", "zurueckgezogenInRevision"]) {
      if (key === "zurueckgezogenInRevision" && passage[key] === undefined) continue;
      const revision = revisions.get(reference(passage[key], revisions, `${path}.${key}`))!;
      if (revision.entryId !== passage.entryId) throw new ImportValidationError(path, "passage revision belongs to another entry");
    }
    optional(passage, "autorUserId", path); optional(passage, "autorActorId", path); block(passage.inhalt, `${path}.inhalt`, entries, assets);
    if (passage.zurueckgezogenInRevision === undefined) {
      const ordinal = `${String(passage.entryId)}:${String(passage.ord)}`;
      if (ordinals.has(ordinal)) throw new ImportValidationError(path, "duplicate live passage ordinal"); ordinals.add(ordinal);
    }
  }
  const aliasSlugs = new Set<string>();
  array(row.aliases, "aliases").forEach((value, i) => {
    const p = `aliases[${i}]`, alias = object(value, p); keys(alias, ["universeId", "vonSlug", "nachEntryId"], p);
    if (alias.universeId !== row.universeId) throw new ImportValidationError(p, "alias universe differs from bundle");
    const slug = string(alias.vonSlug, `${p}.vonSlug`, 512); reference(alias.nachEntryId, entries, `${p}.nachEntryId`);
    if (slugs.has(slug) || aliasSlugs.has(slug)) throw new ImportValidationError(p, "duplicate or shadowing alias"); aliasSlugs.add(slug);
  });
  array(row.links, "links").forEach((value, i) => {
    const p = `links[${i}]`, link = object(value, p); keys(link, ["quellEntryId", "quellPassageId", "zielSlug", "zielEntryId"], p);
    reference(link.quellEntryId, entries, `${p}.quellEntryId`); const passage = passages.get(reference(link.quellPassageId, passages, `${p}.quellPassageId`))!;
    if (passage.entryId !== link.quellEntryId) throw new ImportValidationError(p, "link source entry and passage disagree");
    string(link.zielSlug, `${p}.zielSlug`, 512); if (link.zielEntryId !== undefined) reference(link.zielEntryId, entries, `${p}.zielEntryId`);
  });
  array(row.revelations, "revelations").forEach((value, i) => {
    const p = `revelations[${i}]`, revelation = object(value, p); keys(revelation, ["passageId", "actorId", "quelle", "gewaehrtIn", "widerrufenAm"], p);
    reference(revelation.passageId, passages, `${p}.passageId`); ids(revelation.actorId, `${p}.actorId`); quelle(revelation.quelle, `${p}.quelle`, passages, false);
    optional(revelation, "gewaehrtIn", p); optional(revelation, "widerrufenAm", p);
  });
  const ancestry = new Map<string, Set<string>>();
  array(row.lineage, "lineage").forEach((value, i) => {
    const p = `lineage[${i}]`, event = object(value, p), kind = choice(event.kind, ["create", "revise", "retire", "split", "merge"], `${p}.kind`);
    if (kind === "create" || kind === "revise" || kind === "retire") { keys(event, ["kind", "pid"], p); reference(event.pid, passages, `${p}.pid`); return; }
    keys(event, kind === "split" ? ["kind", "parent", "children"] : ["kind", "parents", "child"], p);
    const parents = kind === "split" ? [reference(event.parent, passages, `${p}.parent`)] : strings(event.parents, `${p}.parents`);
    const children = kind === "merge" ? [reference(event.child, passages, `${p}.child`)] : strings(event.children, `${p}.children`);
    if ((kind === "split" ? children : parents).length < 2 || new Set(parents).size !== parents.length || new Set(children).size !== children.length) throw new ImportValidationError(p, "split/merge needs distinct participants");
    const owner = passages.get(reference(parents[0], passages, p))!.entryId;
    for (const id of [...parents, ...children]) if (passages.get(reference(id, passages, p))!.entryId !== owner) throw new ImportValidationError(p, "lineage cannot cross entries");
    for (const parent of parents) for (const child of children) {
      if (parent === child && kind === "merge") continue;
      const seen = new Set<string>(), pending = [child];
      while (pending.length) { const id = pending.pop()!; if (id === parent) throw new ImportValidationError(p, "cyclic lineage"); if (!seen.has(id)) { seen.add(id); pending.push(...(ancestry.get(id) ?? [])); } }
      const edges = ancestry.get(parent) ?? new Set<string>(); edges.add(child); ancestry.set(parent, edges);
    }
  });
  validateImportMetadata(row, passages);
  return JSON.parse(JSON.stringify(row)) as WikiBundle;
}

function validateImportMetadata(root: Row, passages: Map<string, Row>): void {
  const sourced = new Set<string>();
  const requiredSources = new Set<string>();
  array(root.provenance, "provenance").forEach((value, i) => {
    const p = `provenance[${i}]`, wrapper = object(value, p), status = choice(wrapper.status, ["complete", "incomplete"], `${p}.status`);
    keys(wrapper, status === "complete" ? ["status", "value"] : ["status", "value", "missing"], p);
    const row = object(wrapper.value, `${p}.value`);
    keys(row, ["passageId", "importId", "quellWikiUrl", "quellArtikelUrl", "quellPageid", "quellRevid", "passageSha256", "pfad", "ordnung", "lizenz", "importiertAm", ...(status === "complete" ? ["autoren", "anonymeBeitraege", "quellSha1"] : [])], p);
    const pid = reference(row.passageId, passages, `${p}.passageId`);
    if (sourced.has(pid)) throw new ImportValidationError(p, "duplicate passage provenance"); sourced.add(pid);
    ids(row.importId, `${p}.importId`); sourceUrl(row.quellWikiUrl, `${p}.quellWikiUrl`); sourceUrl(row.quellArtikelUrl, `${p}.quellArtikelUrl`);
    integer(row.quellPageid, `${p}.quellPageid`, 1); integer(row.quellRevid, `${p}.quellRevid`, 1); hash(row.passageSha256, `${p}.passageSha256`);
    requiredSources.add(`${String(row.quellWikiUrl)}:${String(row.quellPageid)}:${String(row.quellRevid)}`);
    strings(row.pfad, `${p}.pfad`); integer(row.ordnung, `${p}.ordnung`); string(row.lizenz, `${p}.lizenz`, 200); string(row.importiertAm, `${p}.importiertAm`, 40);
    if (status === "complete") {
      const authors = strings(row.autoren, `${p}.autoren`); const anonymous = integer(row.anonymeBeitraege, `${p}.anonymeBeitraege`);
      if (!authors.length && anonymous === 0) throw new ImportValidationError(p, "complete attribution needs author history");
      string(row.quellSha1, `${p}.quellSha1`, 40);
    } else if (JSON.stringify(wrapper.missing) !== '["complete-author-history","revision-sha1"]') throw new ImportValidationError(p, "missing attribution evidence must remain explicit");
  });
  for (const passage of passages.values()) if (passage.praegung === null && !sourced.has(String(passage.pid))) throw new ImportValidationError("provenance", "imported passage has no source record");
  array(root.sources, "sources").forEach((value, i) => {
    const p = `sources[${i}]`, row = object(value, p); keys(row, ["format", "sha256", "wikiUrl", "articles", "templates"], p);
    if (row.format !== "eron-json") throw new ImportValidationError(p, "unsupported source format");
    sourceUrl(row.wikiUrl, `${p}.wikiUrl`); array(row.articles, `${p}.articles`); array(row.templates, `${p}.templates`); hash(row.sha256, `${p}.sha256`);
    if (row.sha256 !== canonicalHash({ articles: row.articles as CanonicalValue, templates: row.templates as CanonicalValue })) throw new ImportValidationError(p, "source digest mismatch");
    for (const article of row.articles as unknown[]) {
      const page = object(article, `${p}.articles`);
      requiredSources.delete(`${String(row.wikiUrl)}:${String(page.pageid)}:${String(page.revid)}`);
    }
  });
  if (requiredSources.size) throw new ImportValidationError("sources", "import provenance has no matching original source artifact");
  array(root.importReports, "importReports").forEach((value, i) => {
    const p = `importReports[${i}]`, row = object(value, p);
    keys(row, ["importId", "quelle", "eintraege", "aliase", "passagen", "passagenNachArt", "blaueKanten", "roteKanten", "distinkteRoteZiele", "tuerbilanz", "verluste", "textErhaltung", "assetsNachLizenz"], p);
    ids(row.importId, `${p}.importId`); sourceUrl(row.quelle, `${p}.quelle`);
    for (const key of ["eintraege", "aliase", "passagen", "blaueKanten", "roteKanten", "distinkteRoteZiele"]) integer(row[key], `${p}.${key}`);
    for (const [key, names] of Object.entries({ passagenNachArt: ["absatz", "feld", "liste", "zitat", "bildunterschrift", "rohblock"], tuerbilanz: ["tuer", "spur", "notiz", "verworfen"], assetsNachLizenz: ["frei", "zitat", "unbekannt"] })) {
      const counts = object(row[key], `${p}.${key}`); keys(counts, names, p); names.forEach((name) => integer(counts[name], `${p}.${key}.${name}`));
    }
    if (typeof row.textErhaltung !== "number" || row.textErhaltung < 0 || row.textErhaltung > 1) throw new ImportValidationError(p, "text retention must be between 0 and 1");
    array(row.verluste, `${p}.verluste`).forEach((value, j) => {
      const p2 = `${p}.verluste[${j}]`, loss = object(value, p2); keys(loss, ["art", "bezeichnung", "detail"], p2);
      choice(loss.art, ["kurzer-absatz", "unbenutzte-vorlage", "modul", "verworfenes-linkziel", "verwaiste-datei", "nicht-umgewandelt"], `${p2}.art`);
      string(loss.bezeichnung, `${p2}.bezeichnung`, 1000); optional(loss, "detail", p2);
    });
  });
}

export function createWikiBundle(data: WikiBundleData): WikiBundle {
  return validateWikiBundle({ format: "atlas-chronicles/wiki", version: WIKI_BUNDLE_VERSION, blockAstVersion: 1, ...data });
}

export function serializeWikiBundle(bundle: WikiBundle): string {
  return canonicalJson(validateWikiBundle(bundle) as unknown as CanonicalValue);
}

export function parseWikiBundle(text: string): WikiBundle {
  if (Buffer.byteLength(text, "utf8") > 30_000_000) throw new ImportValidationError("$", "maximum wiki bundle size is 30 MB");
  let value: unknown;
  try { value = JSON.parse(text); } catch { throw new ImportValidationError("$", "invalid JSON"); }
  return validateWikiBundle(value);
}
