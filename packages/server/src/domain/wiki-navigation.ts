import type { Blockinhalt, InlineText } from "@chronicle/chronik";
import type { Db } from "../db/index.ts";
import { createDocuments, plainBlock } from "./documents.ts";
import type { DomainConfig } from "./campaigns.ts";
import { Gone } from "./errors.ts";

function inlineParts(block: Blockinhalt): readonly InlineText[] {
  switch (block.kind) {
    case "absatz": case "zitat": case "bildunterschrift": return block.inhalt;
    case "feld": return block.werte.flat();
    case "liste": return block.punkte.flat();
    case "rohblock": return [];
  }
}

export function createWikiNavigation(db: Db, config: DomainConfig = {}) {
  async function read<T>(userId: string, campaignId: string, action: (tx: Db, docs: ReturnType<typeof createDocuments>) => Promise<T>): Promise<T> {
    return db.transaction(async tx => {
      // Hold the same campaign boundary used by document/grant writers while
      // deriving the reader's knowledge and its navigation response.
      const member = await tx.query(`SELECT c.id FROM campaigns c JOIN campaign_memberships m ON m.campaign_id=c.id
        WHERE c.id=$1 AND m.user_id=$2 FOR SHARE OF c,m`, [campaignId, userId]);
      if (!member.rowCount) throw new Gone();
      return action(tx, createDocuments(tx, config));
    });
  }

  async function resolveSlug(userId: string, campaignId: string, slug: string) {
    return read(userId, campaignId, async (tx, docs) => {
      const target = (await tx.query<{ id: string }>(`SELECT id FROM entries WHERE campaign_id=$1 AND slug=$2
        UNION SELECT entry_id AS id FROM entry_aliases WHERE campaign_id=$1 AND slug=$2`, [campaignId, slug])).rows;
      if (target.length !== 1) throw new Gone();
      const entry = await docs.getEntry(userId, campaignId, target[0]!.id);
      return { entryId: entry.entryId, slug: entry.slug, title: entry.titel };
    });
  }

  async function backlinks(userId: string, campaignId: string, entryId: string) {
    return read(userId, campaignId, async (tx, docs) => {
      const target = await docs.getEntry(userId, campaignId, entryId);
      const knowledge = await docs.knowledge(userId, campaignId);
      const aliases = (await tx.query<{ slug: string }>("SELECT slug FROM entry_aliases WHERE campaign_id=$1 AND entry_id=$2", [campaignId, entryId])).rows;
      const slugs = new Set([target.slug, ...aliases.map(row => row.slug)]);
      const rows = (await tx.query<{ entryId: string; title: string; slug: string; passageId: string; content: Blockinhalt }>(`SELECT e.id AS "entryId",e.title,e.slug,p.id AS "passageId",p.content
        FROM passages p JOIN entries e ON e.id=p.entry_id AND e.campaign_id=p.campaign_id
        WHERE p.campaign_id=$1 AND p.retired_at_revision IS NULL AND p.id=ANY($2::text[])
        ORDER BY e.title COLLATE "C",e.id,p.ord,p.id`, [campaignId, [...knowledge.gehaltenePids]])).rows;
      return rows.filter(row => inlineParts(row.content).some(part => part.marks.some(mark => mark.art === "link"
        && (mark.zielEntryId !== undefined ? mark.zielEntryId === entryId : slugs.has(mark.zielSlug)))))
        .map(row => ({ entryId: row.entryId, title: row.title, slug: row.slug, passageId: row.passageId, excerpt: plainBlock(row.content).slice(0, 240) }));
    });
  }
  return { resolveSlug, backlinks };
}
