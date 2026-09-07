// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { randomUUID, createHash } from "node:crypto";
import { resolvePassage, type Blockinhalt, type LineageEvent, type Passage, type Quelle } from "@chronicle/chronik";
import { trustActorId, trustEntryId, trustPassageId, trustRevisionId } from "@chronicle/core";
import { projiziereEntry } from "@chronicle/projection";
import { stableJson } from "@chronicle/rules";
import type { Db } from "../db/index.ts";
import { createCampaigns, type DomainConfig, type Membership } from "./campaigns.ts";
import { createDocuments } from "./documents.ts";
import { createGameplay } from "./gameplay.ts";
import { Conflict, Gone } from "./errors.ts";

export interface FictionClock { day: number; label: string; postDays: number; version: number }
export interface SendLetterInput { commandId: string; fromActorId?: string; toActorIds: string[]; passageIds: string[]; note: string }
interface LetterSnapshot { passageId: string; entryId: string; slug: string; title: string; content: Blockinhalt; path: string[]; ord: number; sourceRevisionId: string; sourceGen: number; sourceHash: string; sourceQuelle: Quelle; tags: string[]; knownTargets: string[] }
interface LetterRow { id: string; campaign_id: string; from_actor_id: string; sent_by: string; command_id: string; request_hash: string; note: string; snapshots: LetterSnapshot[]; seal: string; sent_at: string; sent_day: number; sent_label: string; arrival_day: number }
interface RecipientRow { actor_id: string; delivered_at: string | null; delivered_day: number | null; delivered_label: string | null; read_at: string | null; read_day: number | null }
interface GrantSnapshot { actorId: string; passageId: string; quelle: Quelle; grantedAt: number }
const hash = (v: unknown) => createHash("sha256").update(stableJson(v)).digest("hex");
const text = (v: unknown, max: number) => { if (typeof v !== "string" || !v.trim() || v.length > max) throw new Gone("invalid-input"); return v; };
const whole = (v: unknown, max: number) => { if (typeof v !== "number" || !Number.isInteger(v) || v < 0 || v > max) throw new Gone("invalid-input"); return v; };
function linkedTargets(block: Blockinhalt): string[] {
  const groups = (() => { switch (block.kind) {
    case "absatz": case "zitat": case "bildunterschrift": return [block.inhalt];
    case "feld": return block.werte;
    case "liste": return block.punkte;
    case "rohblock": return [];
  } })();
  return [...new Set(groups.flatMap(group => group.flatMap(i => i.marks.flatMap(m => m.art === "link" && m.zielEntryId ? [m.zielEntryId] : []))))].sort();
}

export function createWeek(db: Db, cfg: DomainConfig = {}) {
  const now = cfg.now ?? Date.now;
  async function authorize(tx: Db, userId: string, campaignId: string, gm = false): Promise<Membership> {
    if (!(await tx.query("SELECT c.id FROM campaigns c JOIN campaign_memberships m ON m.campaign_id=c.id WHERE c.id=$1 AND m.user_id=$2 FOR UPDATE OF c FOR SHARE OF m", [campaignId, userId])).rowCount) throw new Gone();
    return createCampaigns(tx, cfg).requireMember(userId, campaignId, gm ? ["leitung"] : undefined);
  }
  async function clock(tx: Db, campaignId: string): Promise<FictionClock> {
    const row = (await tx.query<{ day: number; label: string; post_days: number; version: number }>("SELECT * FROM week_clocks WHERE campaign_id=$1", [campaignId])).rows[0];
    return row ? { day: row.day, label: row.label, postDays: row.post_days, version: row.version } : { day: 0, label: "Tag 0", postDays: 0, version: 0 };
  }
  async function getClock(userId: string, campaignId: string) { await createCampaigns(db, cfg).requireMember(userId, campaignId); return clock(db, campaignId); }
  async function setClock(userId: string, campaignId: string, input: FictionClock) {
    return db.transaction(async tx => {
      await authorize(tx, userId, campaignId, true); const previous = await clock(tx, campaignId);
      if (previous.version !== input.version) throw new Conflict(); whole(input.day, 1_000_000); whole(input.postDays, 365); text(input.label, 120);
      if (input.day < previous.day) throw new Conflict();
      await tx.query(`INSERT INTO week_clocks(campaign_id,day,label,post_days,version,updated_at,updated_by) VALUES($1,$2,$3,$4,$5,$6,$7)
        ON CONFLICT(campaign_id) DO UPDATE SET day=EXCLUDED.day,label=EXCLUDED.label,post_days=EXCLUDED.post_days,version=EXCLUDED.version,updated_at=EXCLUDED.updated_at,updated_by=EXCLUDED.updated_by`,
        [campaignId, input.day, input.label, input.postDays, previous.version + 1, now(), userId]);
      await deliverDue(tx, campaignId);
      return clock(tx, campaignId);
    });
  }
  async function sender(tx: Db, member: Membership, requested?: string): Promise<string> {
    const actorId = requested ?? member.actorId; if (!actorId || member.role === "beobachter") throw new Gone();
    const actor = await tx.query(`SELECT p.actor_id FROM actor_profiles p JOIN actor_controllers g
      ON g.actor_id=p.actor_id AND g.campaign_id=p.campaign_id
      WHERE p.actor_id=$1 AND p.campaign_id=$2 AND p.archived_at IS NULL
        AND g.user_id=$3 AND g.permission='control' AND g.revoked_at IS NULL`, [actorId, member.campaignId, member.userId]);
    if (!actor.rowCount) throw new Gone();
    return actorId;
  }
  async function history(tx: Db, campaignId: string) {
    return (await tx.query<{ seq: string; event: LineageEvent }>("SELECT l.seq,l.event FROM lineage_events l JOIN entries e ON e.id=l.entry_id WHERE e.campaign_id=$1 ORDER BY l.seq", [campaignId])).rows;
  }
  async function sourceSnapshots(tx: Db, campaignId: string, actorId: string, passageIds: string[]): Promise<LetterSnapshot[]> {
    const docs = createDocuments(tx, cfg), held = await docs.held(campaignId, actorId);
    if (passageIds.some(id => !held.has(trustPassageId(id)))) throw new Gone();
    // Lock owning entries before passages, matching the document writer. Frozen content
    // and provenance therefore come from one consistent authoring version.
    const rows = (await tx.query<{ id: string; entry_id: string; slug: string; title: string; content: Blockinhalt; path: string[]; ord: number; revision_id: string; gen: number; tags: string[] }>(`SELECT p.*,e.slug,e.title FROM passages p JOIN entries e ON e.id=p.entry_id
      WHERE p.campaign_id=$1 AND p.id=ANY($2::text[]) AND p.retired_at_revision IS NULL ORDER BY e.id,p.ord,p.id FOR UPDATE OF e,p`, [campaignId, passageIds])).rows;
    if (rows.length !== passageIds.length) throw new Gone();
    const lineage = (await history(tx, campaignId)).map(r => r.event);
    const grants = (await tx.query<{ passage_id: string; quelle: Quelle }>("SELECT passage_id,quelle FROM revelations WHERE campaign_id=$1 AND actor_id=$2 AND revoked_at IS NULL ORDER BY passage_id", [campaignId, actorId])).rows;
    const sources = new Map<string, Quelle>();
    for (const grant of grants) for (const pid of resolvePassage(trustPassageId(grant.passage_id), lineage)) if (!sources.has(pid)) sources.set(pid, grant.quelle);
    const knownEntries = new Set((await tx.query<{ entry_id: string }>("SELECT DISTINCT entry_id FROM passages WHERE campaign_id=$1 AND id=ANY($2::text[]) AND retired_at_revision IS NULL", [campaignId, [...held]])).rows.map(p => p.entry_id));
    const ordinals = new Map<string, number>();
    return rows.map(p => {
      const projected = projiziereEntry({ entryId: p.entry_id, slug: p.slug, titel: p.title, passagen: [{ pid: trustPassageId(p.id), entryId: trustEntryId(p.entry_id), gen: p.gen,
        ord: p.ord, pfad: p.path, inhalt: p.content, geltung: "notiz", praegung: null, erstelltInRevision: trustRevisionId(p.revision_id) }] }, { gehaltenePids: held, bekannteEntryIds: knownEntries, offeneTueren: new Map() }).passagen[0]!;
      const ord = ordinals.get(p.entry_id) ?? 0; ordinals.set(p.entry_id, ord + 1);
      // Rehydrate this locally produced projection for the same projector at delivery;
      // only the non-mechanical field marker is restored, never private author metadata.
      const content = (projected.inhalt.kind === "feld" ? { ...projected.inhalt, klauselKandidat: false } : projected.inhalt) as unknown as Blockinhalt;
      return { passageId: p.id, entryId: p.entry_id, slug: p.slug, title: p.title, content, path: [...projected.pfad], ord,
        sourceRevisionId: p.revision_id, sourceGen: p.gen, sourceHash: hash({ passageId: p.id, content: projected.inhalt, tags: p.tags }),
        sourceQuelle: sources.get(p.id) ?? { art: "gehoert" as const, von: trustActorId(actorId) }, tags: p.tags, knownTargets: linkedTargets(content) };
    });
  }
  async function deliverDue(tx: Db, campaignId: string): Promise<void> {
    const current = await clock(tx, campaignId);
    const due = (await tx.query<LetterRow & { recipient_actor_id: string }>(`SELECT l.*,r.actor_id AS recipient_actor_id FROM letters l JOIN letter_recipients r ON r.letter_id=l.id
      JOIN actor_profiles p ON p.actor_id=r.actor_id AND p.campaign_id=r.campaign_id AND p.archived_at IS NULL
      WHERE l.campaign_id=$1 AND l.arrival_day<=$2 AND r.delivered_at IS NULL AND EXISTS (
        SELECT 1 FROM actor_controllers g JOIN campaign_memberships m ON m.campaign_id=g.campaign_id AND m.user_id=g.user_id
        WHERE g.actor_id=r.actor_id AND g.campaign_id=r.campaign_id AND g.revoked_at IS NULL AND g.permission='control'
          AND m.role IN ('leitung','spieler')) ORDER BY l.id,r.actor_id FOR UPDATE OF r`, [campaignId, current.day])).rows;
    for (const letter of due) {
      const deliveredAt = now();
      const outcomes: { passageId: string; sourceRevisionId: string; sourceHash: string; quelle: { art: "gehoert"; von: string }; grant: "current" | "historical-only" }[] = [];
      const proof = { schemaVersion: 1, letterId: letter.id, letterSeal: letter.seal, fromActorId: letter.from_actor_id, toActorId: letter.recipient_actor_id,
        sentAt: Number(letter.sent_at), sentDay: letter.sent_day, scheduledDay: letter.arrival_day, deliveredAt, deliveredDay: current.day, deliveredLabel: current.label,
        passages: outcomes };
      const sources = (await tx.query<{ id: string; entry_id: string; slug: string; title: string; content: Blockinhalt; path: string[]; tags: string[] }>(`SELECT p.id,p.entry_id,p.content,p.path,p.tags,e.slug,e.title FROM passages p JOIN entries e ON e.id=p.entry_id
        WHERE p.campaign_id=$1 AND p.id=ANY($2::text[]) AND p.retired_at_revision IS NULL ORDER BY e.id,p.ord,p.id FOR UPDATE OF e,p`, [campaignId, letter.snapshots.map(p => p.passageId)])).rows;
      // Compare order only within the mailed selection. Hidden insertions can change
      // source ordinals and document revisions without changing the reader's evidence.
      const ordinals = new Map<string, number>();
      const currentSources = new Map(sources.map(source => {
        const ord = ordinals.get(source.entry_id) ?? 0; ordinals.set(source.entry_id, ord + 1);
        return [source.id, { ...source, ord }] as const;
      }));
      for (const passage of letter.snapshots) {
        const source = currentSources.get(passage.passageId);
        const projected = source ? projiziereEntry({ entryId: source.entry_id, slug: source.slug, titel: source.title, passagen: [{
          pid: trustPassageId(passage.passageId), entryId: trustEntryId(source.entry_id), gen: 1, ord: source.ord, pfad: source.path, inhalt: source.content,
          geltung: "notiz", praegung: null, erstelltInRevision: trustRevisionId(passage.sourceRevisionId),
        }] }, { gehaltenePids: new Set([trustPassageId(passage.passageId)]), bekannteEntryIds: new Set(passage.knownTargets), offeneTueren: new Map() }).passagen[0] : null;
        // Existing sealed letters use the content-and-tags sourceHash. Keep that hash
        // compatible and verify the remaining reader-visible identity against their
        // already sealed snapshot fields; never rewrite immutable letters or receipts.
        const unchanged = source && projected && source.entry_id === passage.entryId && source.slug === passage.slug && source.title === passage.title
          && source.ord === passage.ord && stableJson(projected.pfad) === stableJson(passage.path)
          && hash({ passageId: passage.passageId, content: projected.inhalt, tags: source.tags }) === passage.sourceHash;
        outcomes.push({ passageId: passage.passageId, sourceRevisionId: passage.sourceRevisionId, sourceHash: passage.sourceHash,
          quelle: { art: "gehoert", von: letter.from_actor_id }, grant: unchanged ? "current" : "historical-only" });
        if (!unchanged) continue;
        // This grant is hearsay. Already-held firsthand or spoken knowledge never loses
        // its stronger source merely because an envelope arrives.
        await tx.query(`INSERT INTO revelations(campaign_id,actor_id,passage_id,granted_at,granted_by,quelle)
          VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(actor_id,passage_id) DO UPDATE SET revoked_at=NULL,
          granted_at=CASE WHEN revelations.revoked_at IS NOT NULL THEN EXCLUDED.granted_at ELSE revelations.granted_at END,
          granted_by=CASE WHEN revelations.revoked_at IS NOT NULL THEN EXCLUDED.granted_by ELSE revelations.granted_by END,
          quelle=CASE WHEN revelations.revoked_at IS NOT NULL THEN EXCLUDED.quelle ELSE revelations.quelle END`,
          [campaignId, letter.recipient_actor_id, passage.passageId, deliveredAt, letter.sent_by, { art: "gehoert", von: letter.from_actor_id }]);
      }
      await tx.query("UPDATE letter_recipients SET delivered_at=$3,delivered_day=$4,delivered_label=$5 WHERE letter_id=$1 AND actor_id=$2", [letter.id, letter.recipient_actor_id, deliveredAt, current.day, current.label]);
      await tx.query("INSERT INTO letter_delivery_receipts(letter_id,campaign_id,actor_id,proof,seal,delivered_at) VALUES($1,$2,$3,$4,$5,$6)", [letter.id, campaignId, letter.recipient_actor_id, proof, hash(proof), deliveredAt]);
    }
  }
  async function sendLetter(userId: string, campaignId: string, input: SendLetterInput) {
    return db.transaction(async tx => {
      const member = await authorize(tx, userId, campaignId), actorId = await sender(tx, member, input.fromActorId);
      text(input.commandId, 128);
      if (!Array.isArray(input.toActorIds) || !input.toActorIds.length || input.toActorIds.length > 16 || new Set(input.toActorIds).size !== input.toActorIds.length || input.toActorIds.includes(actorId)) throw new Gone("recipients");
      if (!Array.isArray(input.passageIds) || !input.passageIds.length || input.passageIds.length > 32 || new Set(input.passageIds).size !== input.passageIds.length || typeof input.note !== "string" || input.note.length > 4000) throw new Gone("letter-input");
      const requestHash = hash(input);
      const old = (await tx.query<LetterRow>("SELECT * FROM letters WHERE campaign_id=$1 AND sent_by=$2 AND command_id=$3", [campaignId, userId, input.commandId])).rows[0];
      if (old) { if (old.request_hash !== requestHash) throw new Conflict(); return createWeek(tx, cfg).getLetter(userId, campaignId, old.id); }
      const recipients = await tx.query(`SELECT p.actor_id FROM actor_profiles p WHERE p.campaign_id=$1
        AND p.actor_id=ANY($2::text[]) AND p.archived_at IS NULL AND EXISTS (
          SELECT 1 FROM actor_controllers g JOIN campaign_memberships m ON m.campaign_id=g.campaign_id AND m.user_id=g.user_id
          WHERE g.campaign_id=p.campaign_id AND g.actor_id=p.actor_id AND g.revoked_at IS NULL AND g.permission='control'
            AND m.role IN ('leitung','spieler')) AND ($3 OR EXISTS (
          SELECT 1 FROM campaign_memberships m WHERE m.campaign_id=p.campaign_id AND m.actor_id=p.actor_id
        ) OR EXISTS (SELECT 1 FROM actor_controllers own WHERE own.campaign_id=p.campaign_id
          AND own.actor_id=p.actor_id AND own.user_id=$4 AND own.revoked_at IS NULL AND own.permission='control'))`,
        [campaignId, input.toActorIds, member.role === "leitung", userId]); if (recipients.rowCount !== input.toActorIds.length) throw new Gone();
      const snapshots = await sourceSnapshots(tx, campaignId, actorId, input.passageIds); const current = await clock(tx, campaignId);
      const id = randomUUID(), sentAt = now(), arrivalDay = current.day + current.postDays;
      const seal = hash({ schemaVersion: 1, id, fromActorId: actorId, toActorIds: [...input.toActorIds].sort(), note: input.note, snapshots, sentAt, sentDay: current.day, sentLabel: current.label, arrivalDay });
      await tx.query("INSERT INTO letters(id,campaign_id,from_actor_id,sent_by,command_id,request_hash,note,snapshots,seal,sent_at,sent_day,sent_label,arrival_day) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)", [id, campaignId, actorId, userId, input.commandId, requestHash, input.note, JSON.stringify(snapshots), seal, sentAt, current.day, current.label, arrivalDay]);
      for (const recipient of input.toActorIds) await tx.query("INSERT INTO letter_recipients(letter_id,campaign_id,actor_id) VALUES($1,$2,$3)", [id, campaignId, recipient]);
      await deliverDue(tx, campaignId);
      return createWeek(tx, cfg).getLetter(userId, campaignId, id);
    });
  }
  async function ownLetter(tx: Db, userId: string, campaignId: string, id: string) {
    const member = await createCampaigns(tx, cfg).requireMember(userId, campaignId);
    const letter = (await tx.query<LetterRow>("SELECT * FROM letters WHERE id=$1 AND campaign_id=$2", [id, campaignId])).rows[0]; if (!letter) throw new Gone();
    const recipients = (await tx.query<RecipientRow>("SELECT * FROM letter_recipients WHERE letter_id=$1 ORDER BY actor_id", [id])).rows;
    const sent = letter.sent_by === userId;
    const received = member.actorId ? recipients.find(r => r.actor_id === member.actorId && r.delivered_at !== null) : undefined;
    if (!sent && !received) throw new Gone();
    return { member, letter, sent, recipients: sent ? recipients : [received!] };
  }
  function envelope(letter: LetterRow, sent: boolean, recipients: RecipientRow[]) {
    return { id: letter.id, direction: sent ? "sent" : "received", fromActorId: letter.from_actor_id,
      sentAt: Number(letter.sent_at), sentDay: letter.sent_day, sentLabel: letter.sent_label, arrivalDay: letter.arrival_day,
      recipients: recipients.map(r => ({ actorId: r.actor_id, deliveredAt: r.delivered_at === null ? null : Number(r.delivered_at), deliveredDay: r.delivered_day, deliveredLabel: r.delivered_label, readAt: r.read_at === null ? null : Number(r.read_at), readDay: r.read_day })), seal: letter.seal };
  }
  async function listLetters(userId: string, campaignId: string) {
    const member = await createCampaigns(db, cfg).requireMember(userId, campaignId);
    const rows = (await db.query<LetterRow>(`SELECT DISTINCT l.* FROM letters l LEFT JOIN letter_recipients r ON r.letter_id=l.id
      WHERE l.campaign_id=$1 AND (l.sent_by=$2 OR (r.actor_id=$3 AND r.delivered_at IS NOT NULL)) ORDER BY l.sent_at,l.id`, [campaignId, userId, member.actorId])).rows;
    return Promise.all(rows.map(async l => { const own = await ownLetter(db, userId, campaignId, l.id); return envelope(l, own.sent, own.recipients); }));
  }
  async function getLetter(userId: string, campaignId: string, id: string) {
    const own = await ownLetter(db, userId, campaignId, id), knowledge = await createDocuments(db, cfg).knowledge(userId, campaignId);
    // A sender's historical copy survives loss of present-day grants. Only that frozen
    // copy is available; target links still use the reader's current projected knowledge.
    const frozenPids = new Set(own.letter.snapshots.map(p => trustPassageId(p.passageId)));
    const groups = new Map<string, LetterSnapshot[]>(); for (const p of own.letter.snapshots) groups.set(p.entryId, [...(groups.get(p.entryId) ?? []), p]);
    const articles = [...groups.values()].map(rows => {
      const first = rows[0]!;
      const passagen: Passage[] = rows.map(p => ({ pid: trustPassageId(p.passageId), entryId: trustEntryId(p.entryId), gen: p.sourceGen, ord: p.ord, pfad: p.path, inhalt: p.content,
        geltung: "notiz", praegung: null, erstelltInRevision: trustRevisionId(p.sourceRevisionId) }));
      const article = projiziereEntry({ entryId: first.entryId, slug: first.slug, titel: first.title, passagen }, { ...knowledge, gehaltenePids: frozenPids });
      return { ...article, citations: rows.map(p => ({ passageId: p.passageId, sourceRevisionId: p.sourceRevisionId, sourceHash: p.sourceHash, quelle: { art: "gehoert", von: own.letter.from_actor_id } })) };
    });
    const delivery = own.sent ? [] : (await db.query<{ proof: unknown; seal: string }>("SELECT proof,seal FROM letter_delivery_receipts WHERE letter_id=$1 AND actor_id=$2", [id, own.member.actorId])).rows;
    return { ...envelope(own.letter, own.sent, own.recipients), note: own.letter.note, noteIsCanon: false as const, articles, delivery };
  }
  async function readLetter(userId: string, campaignId: string, id: string) {
    return db.transaction(async tx => {
      await authorize(tx, userId, campaignId); const own = await ownLetter(tx, userId, campaignId, id);
      const recipient = own.recipients.find(r => r.actor_id === own.member.actorId && r.delivered_at !== null); if (!recipient) throw new Gone();
      const current = await clock(tx, campaignId);
      await tx.query("UPDATE letter_recipients SET read_at=$3,read_day=$4 WHERE letter_id=$1 AND actor_id=$2 AND read_at IS NULL", [id, recipient.actor_id, now(), current.day]);
      return createWeek(tx, cfg).getLetter(userId, campaignId, id);
    });
  }
  async function umbruch(userId: string, campaignId: string, entryId: string) {
    const member = await createCampaigns(db, cfg).requireMember(userId, campaignId);
    const article = await createDocuments(db, cfg).getEntry(userId, campaignId, entryId);
    const watermark = (await db.query<{ actor_id: string | null; projected_hashes: Record<string, string> }>("SELECT actor_id,projected_hashes FROM reading_watermarks WHERE campaign_id=$1 AND reader_user_id=$2 AND entry_id=$3", [campaignId, userId, entryId])).rows[0];
    const seen = watermark?.actor_id === member.actorId ? watermark.projected_hashes : {};
    const passagen = article.passagen.map(p => ({ ...p, unread: seen[p.pid] !== hash({ pid: p.pid, pfad: p.pfad, inhalt: p.inhalt }) }));
    return { entryId: article.entryId, slug: article.slug, titel: article.titel, passagen, unreadCount: passagen.filter(p => p.unread).length,
      readHash: hash({ userId, campaignId, actorId: member.actorId, article }) };
  }
  async function markRead(userId: string, campaignId: string, entryId: string, expectedHash?: string) {
    return db.transaction(async tx => {
      const member = await authorize(tx, userId, campaignId); const article = await createDocuments(tx, cfg).getEntry(userId, campaignId, entryId);
      if (expectedHash !== undefined && expectedHash !== hash({ userId, campaignId, actorId: member.actorId, article })) throw new Conflict();
      const hashes = Object.fromEntries(article.passagen.map(p => [p.pid, hash({ pid: p.pid, pfad: p.pfad, inhalt: p.inhalt })]));
      await tx.query(`INSERT INTO reading_watermarks(campaign_id,reader_user_id,actor_id,entry_id,projected_hashes,read_at) VALUES($1,$2,$3,$4,$5,$6)
        ON CONFLICT(campaign_id,reader_user_id,entry_id) DO UPDATE SET actor_id=EXCLUDED.actor_id,projected_hashes=EXCLUDED.projected_hashes,read_at=EXCLUDED.read_at`, [campaignId, userId, member.actorId, entryId, hashes, now()]);
      return createWeek(tx, cfg).umbruch(userId, campaignId, entryId);
    });
  }
  async function difference(userId: string, campaignId: string) {
    await createCampaigns(db, cfg).requireMember(userId, campaignId, ["leitung"]);
    await createGameplay(db, cfg).expireVollmachten(userId, campaignId);
    const latest = (await db.query<{ id: string; started_at: string; knowledge: GrantSnapshot[] | null; lineage_seq: string | null }>(`SELECT s.id,s.started_at,b.knowledge,b.lineage_seq FROM game_sessions s LEFT JOIN week_baselines b ON b.session_id=s.id
      WHERE s.campaign_id=$1 ORDER BY s.started_at DESC,s.id DESC LIMIT 1`, [campaignId])).rows[0];
    const graph = await history(db, campaignId);
    const oldGraph = graph.filter(e => Number(e.seq) <= Number(latest?.lineage_seq ?? 0)).map(e => e.event);
    const oldHeld = new Set((latest?.knowledge ?? []).flatMap(g => resolvePassage(trustPassageId(g.passageId), oldGraph).map(pid => `${g.actorId}:${pid}`)));
    const grants = (await db.query<{ actor_id: string; passage_id: string; quelle: Quelle; granted_at: string }>("SELECT * FROM revelations WHERE campaign_id=$1 AND revoked_at IS NULL", [campaignId])).rows;
    const current = new Map<string, { actorId: string; passageId: string; quelle: Quelle; grantedAt: number }>();
    for (const g of grants) for (const pid of resolvePassage(trustPassageId(g.passage_id), graph.map(e => e.event))) current.set(`${g.actor_id}:${pid}`, { actorId: g.actor_id, passageId: pid, quelle: g.quelle, grantedAt: Number(g.granted_at) });
    const ordered = (await db.query<{ id: string; entry_id: string }>("SELECT p.id,p.entry_id FROM passages p JOIN entries e ON e.id=p.entry_id WHERE p.campaign_id=$1 AND p.retired_at_revision IS NULL ORDER BY e.title COLLATE \"C\",e.id,p.ord,p.id", [campaignId])).rows;
    const knowledgeAdded = latest?.knowledge ? ordered.flatMap(p => [...current.values()].filter(g => g.passageId === p.id && !oldHeld.has(`${g.actorId}:${p.id}`)).sort((a, b) => a.actorId < b.actorId ? -1 : 1).map(g => ({ ...g, entryId: p.entry_id }))) : [];
    const doors = await createGameplay(db, cfg).listVollmachten(userId, campaignId);
    const inTransit = (await db.query("SELECT l.id AS \"letterId\",l.from_actor_id AS \"fromActorId\",r.actor_id AS \"toActorId\",l.arrival_day AS \"arrivalDay\" FROM letters l JOIN letter_recipients r ON r.letter_id=l.id WHERE l.campaign_id=$1 AND r.delivered_at IS NULL ORDER BY l.from_actor_id,r.actor_id,l.id", [campaignId])).rows;
    return { sinceSessionId: latest?.id ?? null, baselineKnown: latest?.knowledge !== undefined && latest.knowledge !== null,
      window: { from: latest ? Number(latest.started_at) : null, to: now() }, knowledgeAdded,
      open: doors.filter(d => d.status === "offen"), expired: doors.filter(d => d.status === "verfallen" && d.expiresAt >= Number(latest?.started_at ?? 0)), inTransit };
  }
  return { getClock, setClock, sendLetter, listLetters, getLetter, readLetter, umbruch, markRead, difference };
}
