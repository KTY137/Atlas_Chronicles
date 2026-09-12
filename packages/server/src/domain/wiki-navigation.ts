// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import type { Blockinhalt, InlineText } from "@chronicle/chronik";
import { Value } from "@sinclair/typebox/value";
import { MoveNavigationEntry, type MoveNavigationEntryBody } from "@chronicle/protocol";
import type { Db } from "../db/index.ts";
import { createDocuments, plainBlock } from "./documents.ts";
import type { DomainConfig } from "./campaigns.ts";
import { Conflict, Gone } from "./errors.ts";

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
  type EintragsZeile = { id: string; slug: string; title: string; art: string; elternId: string | null };

  /**
   * Das Navigationsskelett: Ordnung ohne Inhalt. Bewusst ohne `source()` — ein Aufruf pro Eintrag
   * ist bei einer flachen Liste erträglich (documents.ts:98) und würde einen Baum erschlagen.
   */
  async function uebersicht(userId: string, campaignId: string) {
    return read(userId, campaignId, async (tx, docs) => {
      const rolle = (await tx.query<{ role: string }>("SELECT role FROM campaign_memberships WHERE campaign_id=$1 AND user_id=$2", [campaignId, userId])).rows[0]?.role;
      const leitung = rolle === "leitung";
      const wissen = await docs.knowledge(userId, campaignId);
      const rows = (await tx.query<EintragsZeile>(`SELECT id,slug,title,art,parent_entry_id AS "elternId"
        FROM entries WHERE campaign_id=$1 ORDER BY title COLLATE "C",id`, [campaignId])).rows;
      const zuordnung = (await tx.query<{ entryId: string; categoryId: string }>(`SELECT entry_id AS "entryId",category_id AS "categoryId"
        FROM entry_categories WHERE campaign_id=$1 ORDER BY entry_id,category_id`, [campaignId])).rows;
      const kategorienJeEintrag = new Map<string, string[]>();
      for (const zeile of zuordnung) kategorienJeEintrag.set(zeile.entryId, [...(kategorienJeEintrag.get(zeile.entryId) ?? []), zeile.categoryId]);

      // Die Silhouette: der unbekannte Eintrag zählt mit und trägt seine Kanten, aber weder Titel
      // noch Slug verlassen den Server. Was hier nicht ausgelassen wird, kann der Client nicht
      // mehr verbergen — deshalb steht die Grenze hier und in keinem Endpunkt zweimal.
      const artikel = rows.map(row => {
        const bekannt = leitung || (wissen.bekannteEntryIds?.has(row.id) ?? false);
        const gemeinsam = { id: row.id, art: row.art, elternId: row.elternId, kategorieIds: kategorienJeEintrag.get(row.id) ?? [] };
        return bekannt
          ? { ...gemeinsam, slug: row.slug, titel: row.title, bekannt: true }
          : { ...gemeinsam, bekannt: false };
      });

      const kategorieZeilen = (await tx.query<{ id: string; slug: string; title: string; elternId: string | null; sichtbarkeit: string }>(
        `SELECT id,slug,title,parent_category_id AS "elternId",sichtbarkeit FROM categories WHERE campaign_id=$1 ORDER BY title COLLATE "C",id`, [campaignId])).rows;
      const bekannteEintraege = new Set(artikel.filter(eintrag => eintrag.bekannt).map(eintrag => eintrag.id));
      const stand = new Map<string, { bekannt: number; gesamt: number }>();
      for (const zeile of zuordnung) {
        const zahl = stand.get(zeile.categoryId) ?? { bekannt: 0, gesamt: 0 };
        zahl.gesamt += 1; if (bekannteEintraege.has(zeile.entryId)) zahl.bekannt += 1;
        stand.set(zeile.categoryId, zahl);
      }
      const kategorien = kategorieZeilen.map(zeile => ({
        id: zeile.id, slug: zeile.slug, titel: zeile.title, elternId: zeile.elternId, sichtbarkeit: zeile.sichtbarkeit,
        ...(stand.get(zeile.id) ?? { bekannt: 0, gesamt: 0 }) }));
      const zaehler = new Map<string, { art: string; bekannt: number; gesamt: number }>();
      for (const eintrag of artikel) {
        const stand = zaehler.get(eintrag.art) ?? { art: eintrag.art, bekannt: 0, gesamt: 0 };
        stand.gesamt += 1; if (eintrag.bekannt) stand.bekannt += 1;
        zaehler.set(eintrag.art, stand);
      }
      return { kategorien, arten: [...zaehler.values()], artikel };
    });
  }
  /** Move one visible occurrence; other category memberships survive a category-to-category move. */
  async function moveEntry(userId: string, campaignId: string, entryId: string, input: MoveNavigationEntryBody) {
    if (!Value.Check(MoveNavigationEntry, input)) throw new Gone("navigation-input");
    return db.transaction(async tx => {
      // Same lock order as document/import writers; membership cannot change during the move.
      const member = await tx.query(`SELECT c.id FROM campaigns c JOIN campaign_memberships m ON m.campaign_id=c.id
        WHERE c.id=$1 AND m.user_id=$2 AND m.role='leitung' FOR UPDATE OF c FOR SHARE OF m`, [campaignId, userId]);
      if (!member.rowCount) throw new Gone();
      const entry = (await tx.query<{ art: string }>("SELECT art FROM entries WHERE campaign_id=$1 AND id=$2 FOR UPDATE", [campaignId, entryId])).rows[0];
      if (!entry) throw new Gone();
      const current = (await tx.query<{ id: string }>("SELECT category_id AS id FROM entry_categories WHERE campaign_id=$1 AND entry_id=$2", [campaignId, entryId])).rows.map(row => row.id).sort();
      const expected = [...input.expectedCategoryIds].sort();
      if (entry.art !== input.expectedArt || current.length !== expected.length || current.some((id, i) => id !== expected[i])) throw new Conflict();
      if (input.fromCategoryId !== null && !current.includes(input.fromCategoryId)) throw new Conflict();
      if (input.fromCategoryId === null && current.length) throw new Conflict();
      let categories: string[], art = entry.art;
      if (input.destination.kind === "category") {
        const target = await tx.query("SELECT id FROM categories WHERE campaign_id=$1 AND id=$2", [campaignId, input.destination.id]);
        if (!target.rowCount) throw new Gone();
        categories = [...new Set([...current.filter(id => id !== input.fromCategoryId), input.destination.id])].sort();
      } else {
        // The built-in type groups contain uncategorised articles only.
        categories = []; art = input.destination.art;
      }
      await tx.query("DELETE FROM entry_categories WHERE campaign_id=$1 AND entry_id=$2 AND NOT(category_id=ANY($3::text[]))", [campaignId, entryId, categories]);
      for (const id of categories) await tx.query("INSERT INTO entry_categories(campaign_id,entry_id,category_id) VALUES($1,$2,$3) ON CONFLICT DO NOTHING", [campaignId, entryId, id]);
      if (art !== entry.art) await tx.query("UPDATE entries SET art=$3 WHERE campaign_id=$1 AND id=$2", [campaignId, entryId, art]);
      return { entryId, art, kategorieIds: categories };
    });
  }
  return { resolveSlug, backlinks, uebersicht, moveEntry };
}
