// Frozen V4 source/provenance rules; no mutable server or protocol import.
import { canonicalJson, type CanonicalValue } from "@chronicle/core";
import { fail, object, list, string } from "../campaign-v3-json.ts";
import type { CampaignRow } from "../campaign-schema.ts";
import type { CampaignTablesV4 } from "./schema.ts";

export const json = (value: unknown): string => canonicalJson(value as CanonicalValue);
export function equal(actual: unknown, expected: unknown, path: string): void { if (json(actual) !== json(expected)) fail(path, "state/request/source mismatch"); }
export function normalizeRoute(kind: string, route: string): string {
  if (kind !== "legacy") { if (route.length > 200 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(route)) fail("route", "valid public slug required"); return route; }
  let path: string;
  try { path = decodeURIComponent(route).normalize("NFC"); } catch { return fail("route", "invalid escaped path"); }
  const match = /^\/(?:(?<locale>[A-Za-z]{2}(?:-[A-Za-z]{2})?)\/)?wiki\/(?<article>.+)$/.exec(path);
  if (!match || /[\\?#\u0000-\u001f\u007f%]/.test(path) || path.split("/").slice(1).some(part => [".", "..", ""].includes(part))) fail("route", "local /wiki/ or /<locale>/wiki/ path required");
  const normalized = (match!.groups!.locale ? `/${match!.groups!.locale.toLowerCase()}` : "") + "/wiki/" + match!.groups!.article!.split("/").map(encodeURIComponent).join("/");
  if (normalized.length > 2048) fail("route", "path limit exceeded"); return normalized;
}

export function sourceIndex(tables: CampaignTablesV4) {
  const revisions = new Map(tables.revisions.map(row => [String(row.id), row]));
  const artifacts = new Map(tables.artifacts.map(row => [String(row.id), row]));
  const mints = new Map(tables.confirmed_mints.map(row => [String(row.id), row]));
  const acceptances = new Map<string, CampaignRow[]>(), parents = new Map<string, { revision: number; parents: string[] }[]>();
  for (const row of tables.import_acceptances) { const id = String(row.entry_id); const rows = acceptances.get(id) ?? []; rows.push(row); acceptances.set(id, rows); }
  for (const rows of acceptances.values()) rows.sort((a, b) => Number(revisions.get(String(a.revision_id))!.seq) - Number(revisions.get(String(b.revision_id))!.seq));
  for (const row of tables.lineage_events) {
    const event = object(row.event, "lineage.event"), revision = Number(revisions.get(String(row.revision_id))!.seq);
    const children = event.kind === "split" ? list(event.children, "lineage.children") : event.kind === "merge" ? [event.child] : [];
    const ancestors = event.kind === "split" ? [String(event.parent)] : event.kind === "merge" ? list(event.parents, "lineage.parents").map(String) : [];
    for (const child of children) { const key = `${String(row.entry_id)}\u0000${String(child)}`, rows = parents.get(key) ?? []; rows.push({ revision, parents: ancestors }); parents.set(key, rows); }
  }
  function revision(id: unknown, entryId: unknown): CampaignRow {
    const row = revisions.get(string(id, "publication.revisionId")); if (!row || row.entry_id !== entryId) return fail("publication.revisionId", "missing or foreign article revision"); return row;
  }
  function accepted(entryId: string, maxRevision: number) {
    const result: Record<string, CanonicalValue>[] = [];
    for (const row of acceptances.get(entryId) ?? []) {
      if (Number(revision(row.revision_id, entryId).seq) > maxRevision) continue;
      const artifact = artifacts.get(String(row.artifact_id))!; if (artifact.kind !== "eron-preview") continue;
      const source = object(artifact.source, "artifact.source"), data = object(source.result, "artifact.result");
      // One preview may contain many articles; accepting one article cannot attest
      // another article's source URL merely because it shares that artifact.
      const ownIds = new Set(list(data.passages, "artifact.passages").map(value => object(value, "artifact.passage")).filter(passage => passage.entryId === entryId).map(passage => String(passage.pid)));
      for (const provenance of list(data.provenance, "artifact.provenance")) {
        const origin = object(provenance, "provenance");
        if (ownIds.has(String(object(origin.value, "provenance.value").passageId))) result.push(origin);
      }
    }
    return result;
  }
  const metadataCache = new Map<string, { attributions: unknown[]; mints: { mintId: string; passageId: CanonicalValue | undefined; date: string; kind: CanonicalValue | undefined }[] }>();
  function metadata(entryId: string, revisionId: string, selectedIds: readonly string[], warnings: readonly string[], mintIds: readonly string[]) {
    const cacheKey = json([entryId, revisionId, selectedIds, mintIds]), cached = metadataCache.get(cacheKey);
    if (cached) return { contentWarnings: warnings, ...cached };
    const pinned = revision(revisionId, entryId), document = object(pinned.document, "publication.document"), passages = list(document.passagen, "publication.passages").map(value => object(value, "publication.passage"));
    const selected = new Set(selectedIds), ancestors = new Set(selectedIds);
    if (selectedIds.some(id => !passages.some(passage => passage.pid === id))) fail("publication.passageIds", "selection is absent from pinned revision");
    const pending = [...selectedIds];
    while (pending.length) for (const edge of parents.get(`${entryId}\u0000${pending.pop()!}`) ?? []) {
      if (edge.revision > Number(pinned.seq)) continue;
      for (const parent of edge.parents) if (!ancestors.has(parent)) { ancestors.add(parent); pending.push(parent); }
    }
    const attributions = new Map<string, unknown>();
    // Explicit reacceptance may complete an earlier incomplete assertion. The
    // last acceptance per original PID wins only up to this immutable public cut.
    const assertions = new Map<string, Record<string, CanonicalValue>>();
    for (const origin of accepted(entryId, Number(pinned.seq))) {
      const source = object(origin.value, "attribution.value");
      if (ancestors.has(String(source.passageId))) assertions.set(String(source.passageId), origin);
    }
    for (const origin of assertions.values()) {
      const source = object(origin.value, "attribution.value");
      if (origin.status !== "complete" || !Array.isArray(source.autoren) || !Number.isInteger(source.anonymeBeitraege) || !source.lizenz || /unknown|unbekannt/i.test(String(source.lizenz))) fail("publication.attribution", "selected source lacks complete attribution");
      const attribution = { sourceUrl: source.quellArtikelUrl, license: source.lizenz, authors: [...list(source.autoren, "attribution.authors")].sort(), anonymousContributions: source.anonymeBeitraege };
      attributions.set(json(attribution), attribution);
    }
    const publicMints = mintIds.map(id => {
      const mint = mints.get(id); if (!mint) return fail("publication.mints", "missing mint");
      const minted = revision(mint.revision_id, entryId), mintedPassages = list(object(minted.document, "mint.document").passagen, "mint.passages").map(value => object(value, "mint.passage"));
      const current = passages.find(passage => passage.pid === mint.passage_id), previous = mintedPassages.find(passage => passage.pid === mint.passage_id);
      if (!selected.has(String(mint.passage_id)) || !current || !previous || Number(minted.seq) > Number(pinned.seq)) fail("publication.mints", "mint is absent from selected historical content");
      equal(current!.inhalt, previous!.inhalt, "publication.mints.content");
      let date: string; try { date = new Date(Number(mint.confirmed_at)).toISOString().slice(0, 10); } catch { return fail("publication.mints.date", "supported UTC date required"); }
      return { mintId: id, passageId: mint.passage_id, date, kind: mint.kind };
    });
    const result = { attributions: [...attributions].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([, value]) => value), mints: publicMints };
    metadataCache.set(cacheKey, result); return { contentWarnings: warnings, ...result };
  }
  function legacy(entryId: string, sourceUrl: string, route: string): void {
    let url: URL;
    try { url = new URL(sourceUrl); if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.search || url.hash || normalizeRoute("legacy", url.pathname) !== route) throw new Error(); }
    catch { return fail("route.sourceUrl", "matching HTTP(S) source without credentials or query required"); }
    if (!accepted(entryId, Infinity).some(origin => object(origin.value, "provenance").quellArtikelUrl === sourceUrl)) fail("route.sourceUrl", "source is not backed by an accepted import");
  }
  return { revision, metadata, legacy };
}
