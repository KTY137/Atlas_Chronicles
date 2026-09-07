// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { projiziereEntry, type EntryProjektion } from "@chronicle/projection";
import type { Db } from "../db/index.ts";
import { createDocuments } from "./documents.ts";
import { createCampaigns, type DomainConfig } from "./campaigns.ts";
import { Gone } from "./errors.ts";

/**
 * `Die Gegenüberstellung` — derselbe Artikel nebeneinander für zwei Figuren.
 *
 * Zwei Aufrufe DERSELBEN Projektion, nicht ein zweiter Filter: Grenze B9 hält, weil der
 * Server beide Sichten herleitet und der Client nie eine Sichtbarkeitsmarke bekommt. Was
 * keine der beiden Figuren hält, erscheint in keiner Spalte und in keiner Zeile — `Kein
 * Nenner`, dieselbe Existenzgrenze wie im Einzelbuch.
 *
 * Die Fläche gehört der Spielleitung. Jeder andere Aufruf — falsche Rolle, fremde Figur,
 * fehlender Parameter — endet in `Gone` und damit in genau der 404-Antwort, die auch ein
 * Eintrag liefert, den es nicht gibt. Es gibt keinen 403, der die Existenz der Route
 * gegenüber einem Spieler bestätigt.
 */
export type Seite = "nur-links" | "nur-rechts" | "beide";
export interface Spalte { actorId: string; name: string; passagen: EntryProjektion["passagen"] }
export interface Gegenueberstellung {
  entryId: string; slug: string; titel: string;
  links: Spalte; rechts: Spalte;
  zeilen: readonly { pid: string; ord: number; seite: Seite }[];
}

export function createGegenueberstellung(db: Db, config: DomainConfig = {}) {
  const campaigns = createCampaigns(db, config);

  async function figur(campaignId: string, actorId: string | undefined): Promise<{ id: string; name: string }> {
    if (!actorId) throw new Gone();
    const row = (await db.query<{ id: string; name: string }>(
      "SELECT id,name FROM actors WHERE id=$1 AND campaign_id=$2", [actorId, campaignId])).rows[0];
    if (!row) throw new Gone();
    return row;
  }

  async function compare(userId: string, campaignId: string, entryId: string,
    linksId: string | undefined, rechtsId: string | undefined): Promise<Gegenueberstellung> {
    const member = await campaigns.requireMember(userId, campaignId);
    if (member.role !== "leitung") throw new Gone();
    const docs = createDocuments(db, config);
    const [links, rechts] = [await figur(campaignId, linksId), await figur(campaignId, rechtsId)];
    const source = await docs.source(campaignId, entryId);
    const quelle = { entryId, slug: source.entry.slug, titel: source.entry.title, passagen: source.passagen };
    const projektionen = [] as EntryProjektion[];
    for (const actor of [links, rechts]) projektionen.push(projiziereEntry(quelle, await docs.wissenFor(campaignId, "spieler", actor.id)));
    const [a, b] = projektionen as [EntryProjektion, EntryProjektion];
    // Der projizierte `ord` ist pro Spalte neu gezaehlt, damit keine Leserin Luecken zaehlen
    // kann. Die gemeinsame Zeile braucht die Ordnung der Quelle - sie ist hier zulaessig,
    // weil diese Flaeche der Spielleitung gehoert, die das ganze Buch ohnehin haelt.
    const linksPids = new Set(a.passagen.map(p => p.pid)), rechtsPids = new Set(b.passagen.map(p => p.pid));
    const zeilen = source.passagen
      .filter(p => linksPids.has(p.pid) || rechtsPids.has(p.pid))
      .map(p => ({ pid: p.pid as string, ord: p.ord,
        seite: (linksPids.has(p.pid) ? (rechtsPids.has(p.pid) ? "beide" : "nur-links") : "nur-rechts") as Seite }));
    return { entryId, slug: source.entry.slug, titel: source.entry.title,
      links: { actorId: links.id, name: links.name, passagen: a.passagen },
      rechts: { actorId: rechts.id, name: rechts.name, passagen: b.passagen }, zeilen };
  }
  return { compare };
}
