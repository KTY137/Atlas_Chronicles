// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { randomUUID } from "node:crypto";
import { Type } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import { canonicalHash, trustEntryId, trustPassageId, trustRevisionId, trustUserId, trustActorId, type PassageId, type CanonicalValue } from "@chronicle/core";
import { lineage, resolvePassage, mergeGuard, type Blockinhalt, type Passage, type LineageEvent } from "@chronicle/chronik";
import { Block, Id, SaveDocument } from "@chronicle/protocol";
import { projiziereEntry, type BetrachterWissen, type EntryProjektion } from "@chronicle/projection";
import { wikiAlsMarkdown } from "@chronicle/io";
import type { Db } from "../db/index.ts";
import { createCampaigns, type DomainConfig } from "./campaigns.ts";
import { Gone, Conflict } from "./errors.ts";

export interface PassageInput { pid?: string; inhalt: Blockinhalt; pfad?: string[]; tags?: string[] }
export interface DocumentInput { title: string; slug?: string; passages: PassageInput[]; expectedVersion?: number }
export interface SubmitProposalInput {
  readonly target: { readonly kind: "existing"; readonly entryId: string; readonly expectedVersion: number }
    | { readonly kind: "new"; readonly title: string; readonly slug?: string };
  readonly blocks: readonly Blockinhalt[];
}
export interface SubmittedDocument {
  readonly entryId: string; readonly revisionId: string; readonly version: number;
  /** Only the new proposal passages, in document order. */
  readonly passageIds: readonly string[];
}
interface EntryRow { id: string; universe_id: string; campaign_id: string; slug: string; title: string; version: number; current_revision_id: string; public: boolean }
interface PassageRow { id: string; entry_id: string; revision_id: string; ord: number; path: string[]; content: Blockinhalt; gen: number; geltung: Passage["geltung"]; praegung: Passage["praegung"]; tags: string[] }
interface DocumentSnapshot { title: string; slug: string; passagen: readonly Passage[]; tags: readonly (readonly string[])[] }
const closed = { additionalProperties: false } as const;
// Internal intent only. The public SaveDocument schema still exposes no status or author.
const SubmitProposal = Type.Object({
  target: Type.Union([
    Type.Object({ kind: Type.Literal("existing"), entryId: Id, expectedVersion: Type.Integer({ minimum: 1 }) }, closed),
    Type.Object({ kind: Type.Literal("new"), title: SaveDocument.properties.title, slug: SaveDocument.properties.slug }, closed),
  ]),
  blocks: Type.Array(Block, { minItems: 1, maxItems: 1000 }),
}, closed);
export const plainBlock = (block: Blockinhalt): string => {
  switch (block.kind) {
    case "absatz": case "zitat": case "bildunterschrift": return block.inhalt.map((t) => t.text).join("");
    case "feld": return block.werte.map((v) => v.map((t) => t.text).join("")).join("\n");
    case "liste": return block.punkte.map((v) => v.map((t) => t.text).join("")).join("\n");
    case "rohblock": return block.quelltext;
  }
};
const hash = (value: unknown) => canonicalHash(value as CanonicalValue);
const slugify = (value: string) => value.normalize("NFKC").trim().toLowerCase().replace(/[^\p{L}\p{N}_-]+/gu, "-").replace(/^-|-$/g, "");

export function createDocuments(db: Db, cfg: DomainConfig = {}) {
  const now = cfg.now ?? Date.now, campaigns = createCampaigns(db, cfg);
  async function authorizeWrite(tx: Db, userId: string, campaignId: string) {
    // All knowledge-changing commands use the campaign lock before entry/passages.
    // Keep the author membership stable until the same transaction commits.
    const locked = await tx.query(`SELECT c.id FROM campaigns c JOIN campaign_memberships m ON m.campaign_id=c.id
      WHERE c.id=$1 AND m.user_id=$2 AND m.role='leitung' FOR UPDATE OF c FOR SHARE OF m`, [campaignId, userId]);
    if (!locked.rowCount) throw new Gone("membership");
    return createCampaigns(tx, cfg).requireMember(userId, campaignId, ["leitung"]);
  }
  async function source(campaignId: string, entryId: string) {
    const entry = (await db.query<EntryRow>("SELECT * FROM entries WHERE id=$1 AND campaign_id=$2", [entryId, campaignId])).rows[0];
    if (!entry) throw new Gone("entry");
    const rows = (await db.query<PassageRow>("SELECT * FROM passages WHERE entry_id=$1 AND retired_at_revision IS NULL ORDER BY ord,id", [entryId])).rows;
    const passagen: Passage[] = rows.map((p) => ({ pid: trustPassageId(p.id), entryId: trustEntryId(p.entry_id), gen: p.gen,
      ord: p.ord, pfad: p.path, inhalt: p.content, geltung: p.geltung, praegung: p.praegung, erstelltInRevision: trustRevisionId(p.revision_id) }));
    return { entry, rows, passagen };
  }
  async function events(campaignId: string): Promise<LineageEvent[]> {
    return (await db.query<{ event: LineageEvent }>(`SELECT l.event FROM lineage_events l JOIN entries e ON e.id=l.entry_id
      WHERE e.campaign_id=$1 ORDER BY l.seq`, [campaignId])).rows.map((r) => r.event);
  }
  async function held(campaignId: string, actorId: string | null): Promise<Set<PassageId>> {
    if (!actorId) return new Set();
    const granted = await db.query<{ passage_id: string }>("SELECT passage_id FROM revelations WHERE campaign_id=$1 AND actor_id=$2 AND revoked_at IS NULL", [campaignId, actorId]);
    const history = await events(campaignId);
    return new Set(granted.rows.flatMap((r) => resolvePassage(trustPassageId(r.passage_id), history)));
  }
  async function knowledge(userId: string, campaignId: string): Promise<BetrachterWissen> {
    const membership = await campaigns.requireMember(userId, campaignId);
    return wissenFor(campaignId, membership.role, membership.actorId);
  }
  /**
   * Das hergeleitete Wissen GENAU EINER Rolle/Figur — dieselbe Ableitung, die `knowledge`
   * für den eigenen Betrachter fährt. Die Gegenüberstellung ruft sie zweimal; wer sie
   * ruft, hat die Berechtigung vorher entschieden (Grenze B9: der Projektor ist der Server).
   */
  async function wissenFor(campaignId: string, role: string, actorId: string | null): Promise<BetrachterWissen> {
    const ids = role === "leitung"
      ? new Set((await db.query<{ id: string }>("SELECT id FROM passages WHERE campaign_id=$1 AND retired_at_revision IS NULL", [campaignId])).rows.map((r) => trustPassageId(r.id)))
      : await held(campaignId, actorId);
    const known = (await db.query<{ entry_id: string }>("SELECT DISTINCT entry_id FROM passages WHERE campaign_id=$1 AND id=ANY($2::text[]) AND retired_at_revision IS NULL", [campaignId, [...ids]])).rows;
    const knownIds = known.map(row => row.entry_id);
    const names = (await db.query<{ slug: string; id: string }>(`SELECT slug,id FROM entries WHERE campaign_id=$1 AND id=ANY($2::text[])
      UNION SELECT slug,entry_id AS id FROM entry_aliases WHERE campaign_id=$1 AND entry_id=ANY($2::text[])`, [campaignId, knownIds])).rows;
    const knownSlugs = new Map<string, string>(), ambiguous = new Set<string>();
    for (const row of names) {
      if (knownSlugs.has(row.slug) && knownSlugs.get(row.slug) !== row.id) ambiguous.add(row.slug);
      knownSlugs.set(row.slug, row.id);
    }
    for (const name of ambiguous) knownSlugs.delete(name);
    const doors = actorId ? (await db.query<{ id: string; target_slug: string; expires_at: string }>(
      `SELECT id,target_slug,expires_at FROM (
        SELECT id,target_slug,expires_at,issued_at FROM vollmachten WHERE campaign_id=$1 AND actor_id=$2 AND status='offen' AND expires_at>$3
        UNION ALL SELECT v.id,e.slug AS target_slug,v.expires_at,v.issued_at FROM action_vollmachten v
          JOIN passages p ON p.id=v.passage_id JOIN entries e ON e.id=p.entry_id
          WHERE v.campaign_id=$1 AND v.actor_id=$2 AND v.status='offen' AND v.expires_at>$3 AND v.revoked_at IS NULL
      ) doors ORDER BY issued_at,id`, [campaignId, actorId, now()])).rows : [];
    return { gehaltenePids: ids, bekannteEntryIds: new Set(knownIds), bekannteSlugs: knownSlugs,
      offeneTueren: new Map(doors.map((v) => [v.target_slug, { vollmachtId: v.id, verfallAt: Number(v.expires_at) }])) };
  }
  async function getEntry(userId: string, campaignId: string, entryId: string): Promise<EntryProjektion & { version?: number; revisionId?: string }> {
    const member = await campaigns.requireMember(userId, campaignId), wissen = await knowledge(userId, campaignId);
    const s = await source(campaignId, entryId);
    if (member.role !== "leitung" && !s.passagen.some((p) => wissen.gehaltenePids.has(p.pid))) throw new Gone("entry");
    const projected = projiziereEntry({ entryId, slug: s.entry.slug, titel: s.entry.title, passagen: s.passagen }, wissen);
    return member.role === "leitung" ? { ...projected, version: s.entry.version, revisionId: s.entry.current_revision_id } : projected;
  }
  async function listEntries(userId: string, campaignId: string, query = "") {
    const member = await campaigns.requireMember(userId, campaignId), wissen = await knowledge(userId, campaignId);
    const rows = (await db.query<EntryRow>("SELECT * FROM entries WHERE campaign_id=$1 ORDER BY title COLLATE \"C\",id", [campaignId])).rows;
    const result: { id: string; slug: string; title: string; excerpt: string }[] = [];
    for (const row of rows) {
      if (member.role !== "leitung" && !wissen.bekannteEntryIds?.has(row.id)) continue;
      const s = await source(campaignId, row.id);
      const text = s.passagen.filter((p) => wissen.gehaltenePids.has(p.pid)).map((p) => plainBlock(p.inhalt)).join(" ");
      if (query && !`${row.title} ${text}`.toLowerCase().includes(query.toLowerCase())) continue;
      result.push({ id: row.id, slug: row.slug, title: row.title, excerpt: text.slice(0,180) });
    }
    return result;
  }
  async function saveEntry(userId: string, campaignId: string, input: DocumentInput, entryId?: string) {
    if (!input.title.trim() || input.title.length > 200 || input.passages.length > 1000) throw new Gone("document-invalid");
    return db.transaction(async (tx) => {
      const scoped = createDocuments(tx, cfg), membership = await authorizeWrite(tx, userId, campaignId);
      const id = entryId ?? randomUUID(), revisionId = randomUUID();
      if (entryId) await tx.query("SELECT id FROM entries WHERE id=$1 AND campaign_id=$2 FOR UPDATE", [entryId, campaignId]);
      const old = entryId ? await scoped.source(campaignId, entryId) : null;
      if (old && input.expectedVersion !== old.entry.version) throw new Conflict();
      const version = (old?.entry.version ?? 0) + 1, oldIds = new Set(old?.passagen.map((p) => p.pid) ?? []);
      const slug = await availableSlug(tx, campaignId, id, slugify(input.slug ?? old?.entry.slug ?? input.title));
      const seen = new Set<string>();
      const passagen: Passage[] = input.passages.map((p, ord) => {
        const pid = p.pid ? trustPassageId(p.pid) : trustPassageId(randomUUID());
        if (seen.has(pid) || (p.pid && !oldIds.has(pid))) throw new Gone("passage-identity");
        seen.add(pid);
        const existing = old?.passagen.find((s) => s.pid === pid);
        const unchanged = existing && hash(existing.inhalt) === hash(p.inhalt);
        return { pid, entryId: trustEntryId(id), gen: existing?.gen ?? 1, ord, pfad: p.pfad ?? [], inhalt: p.inhalt,
          geltung: unchanged ? existing.geltung : "notiz", praegung: unchanged ? existing.praegung : null, autorUserId: trustUserId(userId),
          erstelltInRevision: existing?.erstelltInRevision ?? trustRevisionId(revisionId) };
      });
      const snapshot = { title: input.title.trim(), slug, passagen, tags: input.passages.map((p) => p.tags ?? []) };
      await persistRevision(tx, userId, campaignId, membership.universeId, id, revisionId, version, old, snapshot);
      return scoped.getEntry(userId, campaignId, id);
    });
  }

  async function availableSlug(tx: Db, campaignId: string, entryId: string, slug: string) {
    if (!slug || slug.length > 200) throw new Gone("slug-invalid");
    const occupied = await tx.query(`SELECT id FROM entries WHERE campaign_id=$1 AND slug=$2 AND id<>$3
      UNION SELECT entry_id AS id FROM entry_aliases WHERE campaign_id=$1 AND slug=$2 AND entry_id<>$3`, [campaignId, slug, entryId]);
    if (occupied.rowCount) throw new Conflict();
    return slug;
  }

  /** Both write intents arrive here after authorization, target CAS and complete snapshot construction. */
  async function persistRevision(tx: Db, userId: string, campaignId: string, universeId: string, id: string,
    revisionId: string, version: number, old: Awaited<ReturnType<typeof source>> | null, snapshot: DocumentSnapshot) {
    const scoped = createDocuments(tx, cfg), { title, slug, passagen, tags } = snapshot;
    const delta = lineage((old?.passagen ?? []).map((p) => ({ pid: p.pid, text: plainBlock(p.inhalt), fingerprint: hash(p.inhalt) })),
      passagen.map((p) => ({ pid: p.pid, text: plainBlock(p.inhalt), fingerprint: hash(p.inhalt) })));
    const actors = (await tx.query<{ id: string }>("SELECT id FROM actors WHERE campaign_id=$1", [campaignId])).rows;
    const holdings = await Promise.all(actors.map(async (a) => ({ id: trustActorId(a.id), held: await scoped.held(campaignId, a.id) })));
    for (const event of delta) if (event.kind === "merge" && mergeGuard(event.parents, (pid) => holdings.filter((a) => a.held.has(pid)).map((a) => a.id)))
      throw new Conflict();
    if (!old) await tx.query(`INSERT INTO entries(id,universe_id,campaign_id,slug,title,current_revision_id,created_by)
      VALUES($1,$2,$3,$4,$5,$6,$7)`, [id, universeId, campaignId, slug, title, revisionId, userId]);
    await tx.query(`INSERT INTO revisions(id,entry_id,seq,author_user_id,content_hash,document,created_at)
      VALUES($1,$2,$3,$4,$5,$6,$7)`, [revisionId, id, version, userId, hash(snapshot), snapshot, now()]);
    if (old) {
      if (old.entry.slug !== slug) await tx.query("INSERT INTO entry_aliases(campaign_id,slug,entry_id) VALUES($1,$2,$3) ON CONFLICT DO NOTHING", [campaignId, old.entry.slug, id]);
      await tx.query("UPDATE entries SET slug=$2,title=$3,current_revision_id=$4,version=$5 WHERE id=$1", [id, slug, title, revisionId, version]);
      await tx.query("UPDATE passages SET retired_at_revision=$2 WHERE entry_id=$1 AND retired_at_revision IS NULL AND NOT(id=ANY($3::text[]))", [id, revisionId, passagen.map(p => p.pid)]);
    }
    for (const [index, p] of passagen.entries()) {
      await tx.query(`INSERT INTO passages(id,entry_id,campaign_id,revision_id,ord,path,content,gen,geltung,praegung,tags)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
        ON CONFLICT(id) DO UPDATE SET ord=EXCLUDED.ord,path=EXCLUDED.path,content=EXCLUDED.content,tags=EXCLUDED.tags,geltung=EXCLUDED.geltung,praegung=EXCLUDED.praegung`,
        [p.pid, id, campaignId, p.erstelltInRevision, p.ord, JSON.stringify(p.pfad), JSON.stringify(p.inhalt), p.gen, p.geltung, p.praegung, JSON.stringify(tags[index])]);
    }
    for (const event of delta) await tx.query("INSERT INTO lineage_events(entry_id,revision_id,event,created_at) VALUES($1,$2,$3,$4)", [id, revisionId, event, now()]);
  }

  /** Read snapshot-only authors without assigning the submitting GM to any resident passage. */
  async function appendSnapshot(tx: Db, old: Awaited<ReturnType<typeof source>>): Promise<DocumentSnapshot> {
    const revision = (await tx.query<{ document: DocumentSnapshot; content_hash: string; created_at: string }>(
      "SELECT document,content_hash,created_at FROM revisions WHERE id=$1 AND entry_id=$2", [old.entry.current_revision_id, old.entry.id])).rows[0];
    const document = revision?.document;
    if (!document || typeof document !== "object" || Array.isArray(document)) throw new Gone("target-history-unavailable");
    // Migration 002 introduced {} with created_at=0. Its author column is the revision author,
    // not evidence of passage authorship. Preserve the known live state and the historical {}.
    if (Object.keys(document).length === 0 && Number(revision.created_at) === 0) {
      return { title: old.entry.title, slug: old.entry.slug, passagen: old.passagen, tags: old.rows.map(p => p.tags) };
    }
    if (hash(document) !== revision.content_hash || document.title !== old.entry.title || document.slug !== old.entry.slug
      || !Array.isArray(document.passagen) || !Array.isArray(document.tags)
      || document.passagen.length !== old.passagen.length || document.tags.length !== old.rows.length) throw new Gone("target-history-unavailable");
    // Minting changes gen/geltung/praegung in both the live rows and the current snapshot.
    // Check those live fields, keeping optional snapshot metadata untouched.
    const liveKeys = ["pid", "entryId", "gen", "ord", "pfad", "inhalt", "geltung", "praegung", "erstelltInRevision"] as const;
    for (const [index, live] of old.passagen.entries()) {
      const saved = document.passagen[index];
      if (!saved || typeof saved !== "object" || Array.isArray(saved)
        || liveKeys.some(key => !(key in saved) || hash(saved[key]) !== hash(live[key]))
        || hash(document.tags[index]) !== hash(old.rows[index]!.tags)) throw new Gone("target-history-unavailable");
    }
    return document;
  }

  /** Internal only; a parent's proposal/ACK transaction owns the final commit. */
  async function submitProposal(userId: string, campaignId: string, input: SubmitProposalInput): Promise<SubmittedDocument> {
    // Retain one validated input even while waiting for campaign/entry locks.
    let checked: SubmitProposalInput;
    try { checked = structuredClone(input); if (!Value.Check(SubmitProposal, checked)) throw new Error(); }
    catch { throw new Gone("document-invalid"); }
    return db.transaction(async tx => {
      const membership = await authorizeWrite(tx, userId, campaignId), scoped = createDocuments(tx, cfg), target = checked.target;
      const id = target.kind === "existing" ? target.entryId : randomUUID(), revisionId = randomUUID();
      if (target.kind === "existing") await tx.query("SELECT id FROM entries WHERE id=$1 AND campaign_id=$2 FOR UPDATE", [id, campaignId]);
      const old = target.kind === "existing" ? await scoped.source(campaignId, id) : null;
      if (old && target.kind === "existing" && target.expectedVersion !== old.entry.version) throw new Conflict();
      if ((old?.passagen.length ?? 0) + checked.blocks.length > 1000) throw new Gone("document-invalid");
      const title = target.kind === "new" ? target.title.trim() : old!.entry.title;
      if (!title || title.length > 200) throw new Gone("document-invalid");
      const slug = await availableSlug(tx, campaignId, id, target.kind === "new" ? slugify(target.slug ?? target.title) : old!.entry.slug);
      const resident = old ? await appendSnapshot(tx, old) : { passagen: [], tags: [] };
      const nextOrd = resident.passagen.reduce((next, p) => Math.max(next, p.ord + 1), 0);
      const added: Passage[] = checked.blocks.map((inhalt, index) => ({ pid: trustPassageId(randomUUID()), entryId: trustEntryId(id),
        gen: 1, ord: nextOrd + index, pfad: [], inhalt, geltung: "antrag", praegung: null,
        autorUserId: trustUserId(userId), erstelltInRevision: trustRevisionId(revisionId) }));
      const snapshot = { title, slug, passagen: [...resident.passagen, ...added], tags: [...resident.tags, ...added.map(() => [])] };
      const version = (old?.entry.version ?? 0) + 1;
      await persistRevision(tx, userId, campaignId, membership.universeId, id, revisionId, version, old, snapshot);
      return { entryId: id, revisionId, version, passageIds: added.map(p => p.pid) };
    });
  }
  async function revealPassage(userId: string, campaignId: string, passageId: string, actorId: string) {
    await db.transaction(async tx => {
      await authorizeWrite(tx, userId, campaignId);
      const valid = await tx.query(`SELECT 1 FROM actors a CROSS JOIN passages p WHERE a.id=$1 AND a.campaign_id=$3
        AND p.id=$2 AND p.campaign_id=$3 AND p.retired_at_revision IS NULL`, [actorId, passageId, campaignId]);
      if (!valid.rowCount) throw new Gone();
      await tx.query(`INSERT INTO revelations(campaign_id,actor_id,passage_id,granted_at,granted_by)
        VALUES($1,$2,$3,$4,$5) ON CONFLICT(actor_id,passage_id) DO UPDATE SET revoked_at=NULL`, [campaignId, actorId, passageId, now(), userId]);
    });
  }
  async function history(userId: string, campaignId: string, entryId: string) {
    await campaigns.requireMember(userId, campaignId, ["leitung"]);
    await source(campaignId, entryId);
    return (await db.query(`SELECT id,seq,content_hash AS "contentHash",created_at AS "createdAt",document
      FROM revisions WHERE entry_id=$1 ORDER BY seq DESC`, [entryId])).rows;
  }
  /**
   * Die sichtbare Chronik als ein Markdown-Dokument.
   *
   * Ausdrücklich über `listEntries` und `getEntry` gebaut statt über eigene Abfragen: die
   * Sichtbarkeit behält damit GENAU EINE Herleitung. Eine zweite, schnellere hier wäre der Ort,
   * an dem der Export eines Tages mehr zeigt als der Artikel — still, und zugunsten des Lecks.
   * Der Preis ist bekannt und wird bewusst gezahlt: zwei Lesungen je Artikel. Ein Export ist
   * eine Geste am Ende eines Abends, kein Renderpfad.
   */
  async function exportWiki(userId: string, campaignId: string): Promise<{ dateiname: string; markdown: string }> {
    const member = await campaigns.requireMember(userId, campaignId);
    const kopf = (await db.query<{ name: string }>("SELECT name FROM campaigns WHERE id=$1", [campaignId])).rows[0];
    if (!kopf) throw new Gone("campaign");
    const artikel: EntryProjektion[] = [];
    for (const eintrag of await listEntries(userId, campaignId)) artikel.push(await getEntry(userId, campaignId, eintrag.id));
    const markdown = wikiAlsMarkdown({ titel: kopf.name, artikel, vollstaendig: member.role === "leitung",
      erzeugtAm: new Date(now()).toISOString().slice(0, 10) });
    return { dateiname: `${slugify(kopf.name) || "chronik"}.md`, markdown };
  }

  return { source, held, knowledge, wissenFor, listEntries, getEntry, saveEntry, submitProposal, revealPassage, history, exportWiki };
}
