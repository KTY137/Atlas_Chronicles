// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { trustPassageId, type PassageId } from "@chronicle/core";
import type { Blockinhalt } from "@chronicle/chronik";
import type { Db } from "../db/index.ts";
import { createDocuments } from "./documents.ts";
import { createCampaigns, type DomainConfig } from "./campaigns.ts";

/**
 * `Berechnete Zeitleiste aus Prägedaten` — die Herkunftsschicht IST eine Zeitleiste.
 *
 * **Keine neue Tabelle, kein von Hand gepflegter Strang.** Die Ereignisse werden aus zwei
 * Beständen errechnet, die es ohnehin gibt:
 *
 *  1. **Datumsfelder** der Passagen — was das Quellwiki über Geburt, Tod und Gründung sagt.
 *  2. **Bestätigte Prägungen** (`confirmed_mints`) — was am Tisch Kanon wurde, mit Weltzeit,
 *     Spieltag und Siegel.
 *
 * Beides läuft durch dieselbe Sichtbarkeitsregel wie alles andere: **ein Ereignis erscheint
 * genau dann, wenn die Leserin die Passage hält, aus der es stammt.** Seras Zeitleiste ist
 * nicht die der Spielleitung, und sie ist es aus demselben Grund wie ihr Artikel.
 */

export interface Weltjahr { jahr: number; genau: boolean }

/** Welche Felder überhaupt ein Datum sind. Eine benannte Liste, keine Ratefunktion. */
const DATUMSFELDER: readonly { readonly muster: RegExp; readonly art: Ereignisart }[] = [
  { muster: /^(geburt|geboren|geburtsdatum|birth)$/, art: "geburt" },
  { muster: /^(tod|todesdatum|gestorben|death)$/, art: "tod" },
  { muster: /^(gr(ü|ue)ndung|gegr(ü|ue)ndet|founded)$/, art: "gruendung" },
  { muster: /^(datum|jahr|zeitpunkt|date|year)$/, art: "datum" },
];
export type Ereignisart = "geburt" | "tod" | "gruendung" | "datum" | "praegung";

/**
 * Liest ein Weltjahr aus dem Freitext der Quelle — und gibt `null` zurück, wo es keins gibt.
 *
 * Der Kalender einer erfundenen Welt ist nicht parsbar, und so tut diese Funktion auch nicht.
 * Sie liest **eine** Zahl und **ein** Vorzeichen und meldet mit `genau: false`, dass daneben
 * noch etwas stand, das sie nicht verstanden hat („Winter 866", „c.a 1200 v. K."). Der
 * Rohtext wird immer mitgeführt und in der Oberfläche gezeigt: die Leserin sieht, was ihr
 * Wiki sagt, nicht was wir daraus gemacht haben.
 *
 * Ein Wert mit Einheit ist eine Messung, kein Datum — sonst stünde `Größe: 180 cm` als
 * Jahr 180 zwischen zwei Schlachten.
 */
export function leseWeltjahr(text: string): Weltjahr | null {
  const roh = text.trim();
  if (!roh) return null;
  // Einheiten schliessen den Wert aus, bevor irgendeine Zahl gelesen wird.
  if (/\d\s*(cm|mm|m|km|kg|g|%|°)\b/i.test(roh)) return null;
  const ziffern = /(\d{1,6})/.exec(roh.replace(/[.,](?=\d{3}\b)/g, ""))?.[1];
  if (!ziffern) return null;
  const zahl = Number(ziffern);
  if (!Number.isFinite(zahl)) return null;
  const vorChristus = /\bv\s*\.?\s*(k|c|chr)\b/i.test(roh);
  const jahr = vorChristus ? -zahl : zahl;
  // Genau ist ein Wert nur, wenn ausser der Zahl und einer Aera-Angabe nichts uebrig bleibt.
  const rest = roh.replace(ziffern, " ").replace(/\b[vn]\s*\.?\s*(k|c|chr)\b\.?/gi, " ").replace(/[.,\s]+/g, "");
  return { jahr, genau: rest.length === 0 };
}

export interface Ereignis {
  id: string; art: Ereignisart; jahr: number | null; genau: boolean; roh: string;
  entryId: string; titel: string; passageId: string;
  /** Nur bei einer Prägung: der Spieltag und das Siegel, an denen sie hängt. */
  spieltag?: string; siegel?: string;
}
export interface Zeitleiste { ereignisse: readonly Ereignis[]; ohneJahr: readonly Ereignis[] }

const feldwert = (inhalt: Blockinhalt): string =>
  inhalt.kind === "feld" ? inhalt.werte.map(wert => wert.map(teil => teil.text).join("")).join(" / ") : "";

const normalisiere = (text: string) => text.trim().toLowerCase().replace(/\s+/g, "");

export function createZeitleiste(db: Db, config: DomainConfig = {}) {
  const campaigns = createCampaigns(db, config);

  async function zeitleiste(userId: string, campaignId: string): Promise<Zeitleiste> {
    const member = await campaigns.requireMember(userId, campaignId);
    const docs = createDocuments(db, config);
    const gehalten: ReadonlySet<PassageId> | null = member.role === "leitung"
      ? null : await docs.held(campaignId, member.actorId);
    const sichtbar = (passageId: string) => gehalten === null || gehalten.has(trustPassageId(passageId));

    const felder = (await db.query<{ id: string; entry_id: string; title: string; content: Blockinhalt }>(
      `SELECT p.id,p.entry_id,e.title,p.content FROM passages p JOIN entries e ON e.id=p.entry_id
       WHERE p.campaign_id=$1 AND p.retired_at_revision IS NULL AND p.content->>'kind'='feld'
       ORDER BY p.ord,p.id`, [campaignId])).rows;

    const ereignisse: Ereignis[] = [], ohneJahr: Ereignis[] = [];
    for (const row of felder) {
      if (!sichtbar(row.id)) continue;
      const inhalt = row.content;
      if (inhalt.kind !== "feld") continue;
      const schluessel = normalisiere(inhalt.schluessel), label = normalisiere(inhalt.label);
      const treffer = DATUMSFELDER.find(eintrag => eintrag.muster.test(schluessel) || eintrag.muster.test(label));
      if (!treffer) continue;
      const roh = feldwert(inhalt);
      const gelesen = leseWeltjahr(roh);
      const ereignis: Ereignis = { id: `feld:${row.id}`, art: treffer.art, jahr: gelesen?.jahr ?? null,
        genau: gelesen?.genau ?? false, roh, entryId: row.entry_id, titel: row.title, passageId: row.id };
      (gelesen ? ereignisse : ohneJahr).push(ereignis);
    }

    const praegungen = (await db.query<{ id: string; passage_id: string; entry_id: string; title: string; provenance: { fictionDate?: string; playDate?: string }; seal: string }>(
      `SELECT m.id,m.passage_id,p.entry_id,e.title,m.provenance,m.seal FROM confirmed_mints m
       JOIN passages p ON p.id=m.passage_id JOIN entries e ON e.id=p.entry_id
       WHERE m.campaign_id=$1 ORDER BY m.confirmed_at,m.id`, [campaignId])).rows;
    for (const row of praegungen) {
      if (!sichtbar(row.passage_id)) continue;
      const roh = (row.provenance?.fictionDate ?? "").trim();
      const gelesen = leseWeltjahr(roh);
      const ereignis: Ereignis = { id: `praegung:${row.id}`, art: "praegung", jahr: gelesen?.jahr ?? null,
        genau: gelesen?.genau ?? false, roh, entryId: row.entry_id, titel: row.title, passageId: row.passage_id,
        ...(row.provenance?.playDate ? { spieltag: row.provenance.playDate } : {}), siegel: row.seal };
      (gelesen ? ereignisse : ohneJahr).push(ereignis);
    }

    ereignisse.sort((links, rechts) => (links.jahr! - rechts.jahr!) || (links.titel < rechts.titel ? -1 : links.titel > rechts.titel ? 1 : links.id < rechts.id ? -1 : 1));
    ohneJahr.sort((links, rechts) => links.titel < rechts.titel ? -1 : links.titel > rechts.titel ? 1 : links.id < rechts.id ? -1 : 1);
    return { ereignisse, ohneJahr };
  }

  return { zeitleiste };
}
