// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { canonicalHash, trustActorId, trustEntryId, trustPassageId, trustRevisionId, trustUserId, type CanonicalValue } from "@chronicle/core";
import type { Blockinhalt, Passage } from "@chronicle/chronik";
import { createCampaignBundleV15, currentCampaignTables, parseCampaignBundleV15, serializeCampaignBundleV15 } from "@chronicle/io";
import { createTestDb, migrate, type Db } from "../src/db/index.ts";
import { createIdentity } from "../src/identity/index.ts";
import { createCampaigns } from "../src/domain/campaigns.ts";
import { createDocuments, type SubmitProposalInput } from "../src/domain/documents.ts";
import { createGameplay } from "../src/domain/gameplay.ts";
import { exportCampaignBundle } from "../src/domain/bundles.ts";
import { Conflict, Gone } from "../src/domain/errors.ts";

const config = { origin: "https://document-proposal.test", cookieSecret: "document-proposal-test-secret-over-thirty-two-characters", now: () => 1788868800000 };
const block = (text: string): Blockinhalt => ({ kind: "absatz", inhalt: [{ text, marks: [] }] });
const hash = (value: unknown) => canonicalHash(value as CanonicalValue);
interface Snapshot { title: string; slug: string; passagen: Passage[]; tags: string[][] }

describe("internal human document proposals through the migrated database", () => {
  let db: Db, gm: string, secondGm: string;
  beforeAll(async () => {
    db = await createTestDb(); await migrate(db);
    gm = (await createIdentity(db, config).bootstrap("First GM")).userId;
    secondGm = randomUUID();
    await db.query("INSERT INTO users(id,display_name,created_at) VALUES($1,'Second GM',1)", [secondGm]);
    // Represents the caller's durable ACK write, with a real database failure after the document savepoint.
    await db.query("CREATE TEMP TABLE chronist_document_test_acks (id text PRIMARY KEY, ack jsonb NOT NULL, accepted boolean NOT NULL CHECK (accepted))");
  }, 30_000);
  afterAll(async () => { await db?.close(); });

  async function fixture() {
    const campaign = await createCampaigns(db, config).createCampaign(gm, { name: "Proposal manuscripts" });
    await db.query("INSERT INTO campaign_memberships(campaign_id,user_id,role,display_name,name_skeleton) VALUES($1,$2,'leitung','Second GM','second-gm')", [campaign.id, secondGm]);
    return { campaign, docs: createDocuments(db, config) };
  }
  async function revision(id: string) {
    return (await db.query<{ id: string; document: Snapshot; content_hash: string; author_user_id: string }>("SELECT id,document,content_hash,author_user_id FROM revisions WHERE id=$1", [id])).rows[0]!;
  }
  async function state(campaignId: string) {
    return {
      entries: (await db.query("SELECT * FROM entries WHERE campaign_id=$1 ORDER BY id", [campaignId])).rows,
      revisions: (await db.query("SELECT r.* FROM revisions r JOIN entries e ON e.id=r.entry_id WHERE e.campaign_id=$1 ORDER BY r.id", [campaignId])).rows,
      passages: (await db.query("SELECT * FROM passages WHERE campaign_id=$1 ORDER BY id", [campaignId])).rows,
      lineage: (await db.query("SELECT l.* FROM lineage_events l JOIN entries e ON e.id=l.entry_id WHERE e.campaign_id=$1 ORDER BY l.seq", [campaignId])).rows,
    };
  }
  async function seedSnapshot(f: Awaited<ReturnType<typeof fixture>>, legacy = false, createdAt = legacy ? 0 : config.now()) {
    const id = trustEntryId(randomUUID()), revisionId = trustRevisionId(randomUUID()), actorId = trustActorId(randomUUID());
    await db.query("INSERT INTO actors(id,campaign_id,user_id,name) VALUES($1,$2,$3,'Historical author')", [actorId, f.campaign.id, gm]);
    const passagen: Passage[] = [
      { pid: trustPassageId(randomUUID()), entryId: id, gen: 2, ord: 0, pfad: ["History", "Canon"], inhalt: block("The old canonical account"), geltung: "kanon", praegung: { art: "gesprochen", sitzung: "between-sessions" }, autorUserId: trustUserId(gm), erstelltInRevision: revisionId },
      { pid: trustPassageId(randomUUID()), entryId: id, gen: 1, ord: 3, pfad: ["Questions"], inhalt: block("The other author's note"), geltung: "notiz", praegung: null, autorUserId: trustUserId(secondGm), autorActorId: actorId, erstelltInRevision: revisionId },
      { pid: trustPassageId(randomUUID()), entryId: id, gen: 1, ord: 7, pfad: ["Imported"], inhalt: block("An authorless imported fragment"), geltung: "notiz", praegung: null, erstelltInRevision: revisionId },
    ];
    const snapshot: Snapshot = { title: "Historical account", slug: "Historical_Account", passagen, tags: [["canon", "chronist-session:old"], ["question"], ["imported"]] };
    await db.transaction(async tx => {
      await tx.query("INSERT INTO entries(id,universe_id,campaign_id,slug,title,current_revision_id,created_by) VALUES($1,$2,$3,$4,$5,$6,$7)", [id, f.campaign.universeId, f.campaign.id, snapshot.slug, snapshot.title, revisionId, gm]);
      const document = legacy ? {} : snapshot;
      await tx.query("INSERT INTO revisions(id,entry_id,seq,author_user_id,content_hash,document,created_at) VALUES($1,$2,1,$3,$4,$5,$6)", [revisionId, id, gm, legacy ? "migration-001-hash" : hash(document), document, createdAt]);
      for (const [index, p] of passagen.entries()) {
        await tx.query("INSERT INTO passages(id,entry_id,campaign_id,revision_id,ord,path,content,gen,geltung,praegung,tags) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)",
          [p.pid, id, f.campaign.id, revisionId, p.ord, JSON.stringify(p.pfad), p.inhalt, p.gen, p.geltung, p.praegung, JSON.stringify(snapshot.tags[index])]);
      }
    });
    return { id, revisionId, snapshot };
  }

  it("writes a new human article with antrag and null mint before hashing, returning only stable new identities", async () => {
    const f = await fixture(), blocks = [block("A human-reviewed event"), block("A second paragraph")];
    const ack = await f.docs.submitProposal(secondGm, f.campaign.id, { target: { kind: "new", title: "  New account  ", slug: "  Custom Account  " }, blocks });
    expect(Object.keys(ack).sort()).toEqual(["entryId", "passageIds", "revisionId", "version"]);
    expect(ack.version).toBe(1); expect(new Set(ack.passageIds).size).toBe(2);
    const saved = await revision(ack.revisionId);
    expect(saved.content_hash).toBe(hash(saved.document)); expect(saved.author_user_id).toBe(secondGm);
    expect(saved.document).toMatchObject({ title: "New account", slug: "custom-account", tags: [[], []] });
    expect(saved.document.passagen.map(p => p.pid)).toEqual(ack.passageIds);
    saved.document.passagen.forEach((p, ord) => expect(p).toEqual({ pid: ack.passageIds[ord], entryId: ack.entryId, gen: 1, ord, pfad: [], inhalt: blocks[ord], geltung: "antrag", praegung: null, autorUserId: secondGm, erstelltInRevision: ack.revisionId }));
    expect(await f.docs.getEntry(secondGm, f.campaign.id, ack.entryId)).toMatchObject({ version: 1, revisionId: ack.revisionId });
    expect((await db.query("SELECT event FROM lineage_events WHERE revision_id=$1 ORDER BY seq", [ack.revisionId])).rows).toEqual(ack.passageIds.map(pid => ({ event: { kind: "create", pid } })));
    expect((await db.query("SELECT id FROM confirmed_mints WHERE campaign_id=$1", [f.campaign.id])).rowCount).toBe(0);
    expect((await db.query("SELECT passage_id FROM revelations WHERE campaign_id=$1", [f.campaign.id])).rowCount).toBe(0);
  });

  it("lets a second GM append while preserving every old snapshot object, author, path, tag and canonical row", async () => {
    const f = await fixture(), old = await seedSnapshot(f), before = await state(f.campaign.id);
    const ack = await f.docs.submitProposal(secondGm, f.campaign.id, { target: { kind: "existing", entryId: old.id, expectedVersion: 1 }, blocks: [block("An appended proposal")] });
    const saved = await revision(ack.revisionId), after = await state(f.campaign.id);
    expect(ack.entryId).toBe(old.id); expect(ack.version).toBe(2); expect(ack.passageIds).toHaveLength(1);
    expect(saved.document.passagen.slice(0, 3)).toEqual(old.snapshot.passagen);
    expect(saved.document.tags.slice(0, 3)).toEqual(old.snapshot.tags);
    expect(saved.document).toMatchObject({ title: old.snapshot.title, slug: old.snapshot.slug });
    expect(saved.document.passagen[3]).toMatchObject({ ord: 8, autorUserId: secondGm, geltung: "antrag", praegung: null });
    expect(saved.content_hash).toBe(hash(saved.document));
    expect((await revision(old.revisionId)).document).toEqual(old.snapshot);
    expect(after.passages.filter(p => p.id !== ack.passageIds[0])).toEqual(before.passages);
    expect((await f.docs.getEntry(gm, f.campaign.id, old.id)).passagen.map(p => p.pid)).toEqual([...old.snapshot.passagen.map(p => p.pid), ...ack.passageIds]);
    expect(after.lineage).toHaveLength(before.lineage.length + 1);
  });

  it("matches the current snapshot after an actual mint and allows a separate later ratification of the new proposal", async () => {
    const f = await fixture(), entry = await f.docs.saveEntry(gm, f.campaign.id, { title: "Minted account", passages: [{ inhalt: block("Old truth"), pfad: ["Chronicle"], tags: ["old"] }] });
    const game = createGameplay(db, config);
    const mint = await game.mintGesprochen(gm, f.campaign.id, { commandId: randomUUID(), passageId: entry.passagen[0]!.pid, fictionDate: "Spring 842" });
    const minted = await revision(mint.revisionId);
    const ack = await f.docs.submitProposal(secondGm, f.campaign.id, { target: { kind: "existing", entryId: entry.entryId, expectedVersion: 2 }, blocks: [block("New claim")] });
    const submitted = await revision(ack.revisionId);
    expect(submitted.document.passagen[0]).toEqual(minted.document.passagen[0]);
    expect(submitted.document.passagen[0]).toMatchObject({ gen: 2, geltung: "kanon", praegung: { art: "gesprochen" } });
    expect(submitted.document.tags[0]).toEqual(["old"]);
    expect(submitted.document.passagen[1]).toMatchObject({ geltung: "antrag", praegung: null });
    expect((await db.query("SELECT id FROM confirmed_mints WHERE campaign_id=$1", [f.campaign.id])).rowCount).toBe(1);
    const exported = await exportCampaignBundle(db, gm, f.campaign.id, config);
    // The collector selects the oldest sufficient format. Validate its complete real rows
    // through V15 as well, without manufacturing an unrelated map deletion just to select V15.
    const v15 = createCampaignBundleV15({ campaignId: f.campaign.id, universeId: f.campaign.universeId,
      exportedAt: exported.manifest.exportedAt, tables: currentCampaignTables(exported) });
    const parsed = parseCampaignBundleV15(serializeCampaignBundleV15(v15));
    expect(parsed.version).toBe(15);
    expect(parsed.tables.revisions.find(r => r.id === ack.revisionId)?.document).toEqual(submitted.document);
    expect(parsed.tables.revisions.find(r => r.id === mint.revisionId)?.document).toEqual(minted.document);
    await game.mintRatifikation(gm, f.campaign.id, { commandId: randomUUID(), passageId: ack.passageIds[0]!, fictionDate: "Autumn 842" });
    expect(await revision(ack.revisionId)).toEqual(submitted);
    expect((await f.docs.source(f.campaign.id, entry.entryId)).passagen[1]).toMatchObject({ geltung: "kanon", praegung: { art: "ratifikation" } });
  });

  it("rejects stale, missing and foreign targets without writing any revision", async () => {
    const f = await fixture(), entry = await f.docs.saveEntry(gm, f.campaign.id, { title: "Current", passages: [{ inhalt: block("Old") }] });
    await f.docs.saveEntry(gm, f.campaign.id, { title: "Current", expectedVersion: 1, passages: [{ pid: entry.passagen[0]!.pid, inhalt: block("Changed") }] }, entry.entryId);
    const before = await state(f.campaign.id);
    await expect(f.docs.submitProposal(gm, f.campaign.id, { target: { kind: "existing", entryId: entry.entryId, expectedVersion: 1 }, blocks: [block("Stale")] })).rejects.toBeInstanceOf(Conflict);
    await expect(f.docs.submitProposal(gm, f.campaign.id, { target: { kind: "existing", entryId: "missing", expectedVersion: 1 }, blocks: [block("Missing")] })).rejects.toBeInstanceOf(Gone);
    const other = await fixture();
    await expect(f.docs.submitProposal(gm, other.campaign.id, { target: { kind: "existing", entryId: entry.entryId, expectedVersion: 2 }, blocks: [block("Foreign")] })).rejects.toBeInstanceOf(Gone);
    expect(await state(f.campaign.id)).toEqual(before); expect((await state(other.campaign.id)).entries).toEqual([]);
  });

  it.each(["new", "existing"] as const)("rolls back the complete %s document when the parent transaction cannot persist its ACK", async kind => {
    const f = await fixture(), entry = await f.docs.saveEntry(gm, f.campaign.id, { title: "Before ACK", passages: [{ inhalt: block("Original") }] }), before = await state(f.campaign.id);
    const target: SubmitProposalInput["target"] = kind === "new" ? { kind, title: "Must roll back" } : { kind, entryId: entry.entryId, expectedVersion: 1 };
    const commandId = randomUUID(); let written: { entryId: string; revisionId: string } | undefined;
    await expect(db.transaction(async tx => {
      const ack = await createDocuments(tx, config).submitProposal(secondGm, f.campaign.id, { target, blocks: [block("Uncommitted proposal")] });
      written = ack;
      expect((await tx.query("SELECT id FROM revisions WHERE id=$1", [ack.revisionId])).rowCount).toBe(1);
      await tx.query("INSERT INTO chronist_document_test_acks(id,ack,accepted) VALUES($1,$2,false)", [commandId, ack]);
    })).rejects.toMatchObject({ code: "23514" });
    expect(written).toBeDefined(); expect(await state(f.campaign.id)).toEqual(before);
    expect((await db.query("SELECT id FROM chronist_document_test_acks WHERE id=$1", [commandId])).rowCount).toBe(0);
  });

  it("handles only the supported migration-era empty snapshot without inventing old authors", async () => {
    const f = await fixture(), old = await seedSnapshot(f, true);
    const live = await f.docs.source(f.campaign.id, old.id);
    const ack = await f.docs.submitProposal(secondGm, f.campaign.id, { target: { kind: "existing", entryId: old.id, expectedVersion: 1 }, blocks: [block("Modern human proposal")] });
    const saved = await revision(ack.revisionId);
    expect(saved.document.passagen.slice(0, 3)).toEqual(live.passagen);
    expect(saved.document.tags.slice(0, 3)).toEqual(old.snapshot.tags);
    for (const p of saved.document.passagen.slice(0, 3)) { expect(p).not.toHaveProperty("autorUserId"); expect(p).not.toHaveProperty("autorActorId"); }
    expect(saved.document.passagen[3]).toHaveProperty("autorUserId", secondGm);
    expect((await revision(old.revisionId)).document).toEqual({});
    const corrupt = await fixture(), nonlegacy = await seedSnapshot(corrupt, true, config.now()), before = await state(corrupt.campaign.id);
    await expect(corrupt.docs.submitProposal(gm, corrupt.campaign.id, { target: { kind: "existing", entryId: nonlegacy.id, expectedVersion: 1 }, blocks: [block("Must reject")] })).rejects.toBeInstanceOf(Gone);
    expect(await state(corrupt.campaign.id)).toEqual(before);
  });

  it("refuses a head snapshot that no longer matches the live passage content or tags", async () => {
    const f = await fixture(), old = await seedSnapshot(f);
    await db.query("UPDATE passages SET tags='[\"changed outside the revision\"]'::jsonb WHERE id=$1", [old.snapshot.passagen[0]!.pid]);
    const before = await state(f.campaign.id);
    await expect(f.docs.submitProposal(gm, f.campaign.id, { target: { kind: "existing", entryId: old.id, expectedVersion: 1 }, blocks: [block("Must reject")] })).rejects.toBeInstanceOf(Gone);
    expect(await state(f.campaign.id)).toEqual(before);
  });

  it("uses current GM membership and never accepts caller-supplied identity, permission or mint fields", async () => {
    const f = await fixture(), input: SubmitProposalInput = { target: { kind: "new", title: "Human gate" }, blocks: [block("A claim")] };
    await db.query("UPDATE campaign_memberships SET role='beobachter' WHERE campaign_id=$1 AND user_id=$2", [f.campaign.id, secondGm]);
    await expect(f.docs.submitProposal(secondGm, f.campaign.id, input)).rejects.toBeInstanceOf(Gone);
    await expect(f.docs.submitProposal("model", f.campaign.id, input)).rejects.toBeInstanceOf(Gone);
    for (const forged of [{ ...input, autorUserId: secondGm }, { ...input, geltung: "kanon" }, { ...input, role: "leitung" }, { ...input, blocks: [{ ...block("Injected"), pid: "controlled", praegung: { art: "ratifikation" } }] }]) {
      await expect(f.docs.submitProposal(gm, f.campaign.id, forged as SubmitProposalInput)).rejects.toBeInstanceOf(Gone);
    }
    expect((await state(f.campaign.id)).entries).toEqual([]);
  });

  it("keeps slug, closed block and combined 1000-passage limits on the internal path", async () => {
    const f = await fixture(), entry = await f.docs.saveEntry(gm, f.campaign.id, { title: "Occupied", passages: [{ inhalt: block("Resident") }] });
    const before = await state(f.campaign.id);
    await expect(f.docs.submitProposal(gm, f.campaign.id, { target: { kind: "new", title: "Other", slug: "Occupied" }, blocks: [block("Claim")] })).rejects.toBeInstanceOf(Conflict);
    await expect(f.docs.submitProposal(gm, f.campaign.id, { target: { kind: "new", title: "!!!" }, blocks: [block("Claim")] })).rejects.toBeInstanceOf(Gone);
    await expect(f.docs.submitProposal(gm, f.campaign.id, { target: { kind: "new", title: "Empty" }, blocks: [] })).rejects.toBeInstanceOf(Gone);
    await expect(f.docs.submitProposal(gm, f.campaign.id, { target: { kind: "new", title: "Invalid" }, blocks: [{ kind: "html", html: "<b>Claim</b>" }] as unknown as Blockinhalt[] })).rejects.toBeInstanceOf(Gone);
    await expect(f.docs.submitProposal(gm, f.campaign.id, { target: { kind: "existing", entryId: entry.entryId, expectedVersion: 1 }, blocks: Array.from({ length: 1000 }, () => block("Claim")) })).rejects.toBeInstanceOf(Gone);
    expect(await state(f.campaign.id)).toEqual(before);
  });

  it("leaves normal saveEntry drafts as notiz, including later edits of a submitted proposal", async () => {
    const f = await fixture(), entry = await f.docs.saveEntry(gm, f.campaign.id, { title: "Regular draft", passages: [{ inhalt: block("Just a note") }] });
    expect((await revision(entry.revisionId!)).document.passagen[0]).toMatchObject({ geltung: "notiz", praegung: null });
    const ack = await f.docs.submitProposal(gm, f.campaign.id, { target: { kind: "new", title: "Submitted" }, blocks: [block("Before edit")] });
    const edited = await f.docs.saveEntry(gm, f.campaign.id, { title: "Submitted", expectedVersion: 1, passages: [{ pid: ack.passageIds[0]!, inhalt: block("Human edit") }, { inhalt: block("New note") }] }, ack.entryId);
    const saved = await revision(edited.revisionId!);
    expect(saved.document.passagen.map(p => p.geltung)).toEqual(["notiz", "notiz"]);
    expect(saved.document.passagen.map(p => p.praegung)).toEqual([null, null]);
    expect(saved.content_hash).toBe(hash(saved.document));
  });
});
