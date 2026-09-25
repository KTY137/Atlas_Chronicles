// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { gueltigeKartenSicht, type KampfFuerLeitung, type KampfFuerRunde, type KampfKopf, type KampfSeite, type KartenLage, type KartenSichtDaten, type KartenZustand, type Kampfzustand } from "@chronicle/protocol";
import { karteFuerLeitung, karteFuerRunde, vorgabeSicht, type KartenQuelle, type VitalStand } from "@chronicle/projection";
import { activeConditions, evaluateVitals, stableJson } from "@chronicle/rules";
import type { Db } from "../db/index.ts";
import type { DomainConfig } from "./campaigns.ts";
import { Gone } from "./errors.ts";
import { createGameplay, merke, type BogenFuerProjektion } from "./gameplay.ts";

/**
 * Den Kampftisch lesen: Zeilen aus `kaempfe`, `kampf_teilnehmer` und `kampf_karten` zu einem
 * Stand, der für Befehle reicht (`KampfRoh`), und daraus die Nutzlast der Spielleitung.
 */
export interface KarteRoh {
  readonly id: string; readonly name: string; readonly seite: KampfSeite; readonly actorId: string | null;
  readonly initiative: number; readonly ordnung: number; readonly initiativeRollId: string | null; readonly amZug: boolean;
  readonly lage: KartenLage; readonly nameFuerRunde: string | null; readonly sicht: KartenSichtDaten;
  readonly vomKampfAngelegt: boolean;
  /** 0 = die Karte hat noch keine Zeile in `kampf_karten`, sie trägt die Voreinstellung. */
  readonly version: number;
}
export interface KampfRoh extends KampfKopf { readonly karten: readonly KarteRoh[] }

interface KampfRow { id: string; name: string; zustand: Kampfzustand; runde: number; erstellt_am: string | number; beendet_am: string | number | null }
interface KarteRow {
  id: string; name: string; seite: KampfSeite; actor_id: string | null; initiative: number; ordnung: number; initiative_roll_id: string | null; am_zug: boolean;
  lage: KartenLage | null; name_fuer_runde: string | null; sicht: unknown; vom_kampf_angelegt: boolean | null; version: number | null;
}

/** Eine unlesbare Sichteinstellung zeigt nichts — der sichere Rückfall, nie der offene. */
const SICHT_BEI_FEHLER: KartenSichtDaten = { schema: 1, standard: "verborgen", balken: {}, zustaende: false, bild: false };

/** Höhere Initiative zuerst, Gleichstand nach der stabilen Ordnungszahl. */
const nachInitiative = (a: KarteRoh, b: KarteRoh): number => b.initiative - a.initiative || a.ordnung - b.ordnung;

function karteAusZeile(row: KarteRow): KarteRoh {
  const sicht = row.sicht === null || row.sicht === undefined ? vorgabeSicht(row.seite) : gueltigeKartenSicht(row.sicht) ? row.sicht : SICHT_BEI_FEHLER;
  return {
    id: row.id, name: row.name, seite: row.seite, actorId: row.actor_id, initiative: Number(row.initiative), ordnung: Number(row.ordnung),
    initiativeRollId: row.initiative_roll_id, amZug: row.am_zug, lage: row.lage ?? "feld", nameFuerRunde: row.name_fuer_runde,
    sicht, vomKampfAngelegt: row.vom_kampf_angelegt ?? false, version: row.version === null ? 0 : Number(row.version),
  };
}

const KARTEN_SPALTEN = `t.id,t.name,t.seite,t.actor_id,t.initiative,t.ordnung,t.initiative_roll_id,t.am_zug,
       k.lage,k.name_fuer_runde,k.sicht,k.vom_kampf_angelegt,k.version
     FROM kampf_teilnehmer t LEFT JOIN kampf_karten k ON k.teilnehmer_id=t.id AND k.campaign_id=t.campaign_id`;

const kampfAus = (kopf: KampfRow, reihen: readonly KarteRow[]): KampfRoh => ({
  id: kopf.id, name: kopf.name, zustand: kopf.zustand, runde: Number(kopf.runde),
  erstelltAm: Number(kopf.erstellt_am), beendetAm: kopf.beendet_am === null ? null : Number(kopf.beendet_am),
  karten: reihen.map(karteAusZeile).sort(nachInitiative),
});

export async function lies(tx: Db, campaignId: string, kampfId: string, sperren = false): Promise<KampfRoh> {
  const kopf = (await tx.query<KampfRow>(
    `SELECT id,name,zustand,runde,erstellt_am,beendet_am FROM kaempfe WHERE id=$1 AND campaign_id=$2${sperren ? " FOR UPDATE" : ""}`,
    [kampfId, campaignId])).rows[0];
  if (!kopf) throw new Gone();
  const reihen = (await tx.query<KarteRow>(`SELECT ${KARTEN_SPALTEN} WHERE t.campaign_id=$1 AND t.kampf_id=$2`, [campaignId, kampfId])).rows;
  return kampfAus(kopf, reihen);
}

type KartenZeile = Pick<KarteRow, "lage" | "name_fuer_runde" | "sicht" | "vom_kampf_angelegt" | "version">;
const OHNE_KARTENZEILE: KartenZeile = { lage: null, name_fuer_runde: null, sicht: null, vom_kampf_angelegt: null, version: null };

/**
 * Alle Kämpfe einer Kampagne, neueste zuerst — drei Abfragen, gleich wie viele es sind.
 * Teilnehmer und Karten kommen getrennt und werden hier zusammengelegt (wie der LEFT JOIN in
 * `lies`): über die ganze Kampagne wählt der Planer ohne frische Statistik sonst eine
 * verschachtelte Schleife über alle Paare.
 */
export async function liesAlle(tx: Db, campaignId: string): Promise<KampfRoh[]> {
  const koepfe = (await tx.query<KampfRow>(
    "SELECT id,name,zustand,runde,erstellt_am,beendet_am FROM kaempfe WHERE campaign_id=$1 ORDER BY erstellt_am DESC,id", [campaignId])).rows;
  if (!koepfe.length) return [];
  const teilnehmer = (await tx.query<Omit<KarteRow, keyof KartenZeile> & { kampf_id: string }>(
    "SELECT kampf_id,id,name,seite,actor_id,initiative,ordnung,initiative_roll_id,am_zug FROM kampf_teilnehmer WHERE campaign_id=$1", [campaignId])).rows;
  const karten = new Map((await tx.query<KartenZeile & { teilnehmer_id: string }>(
    "SELECT teilnehmer_id,lage,name_fuer_runde,sicht,vom_kampf_angelegt,version FROM kampf_karten WHERE campaign_id=$1", [campaignId])).rows
    .map(row => [row.teilnehmer_id, row] as const));
  const jeKampf = new Map<string, KarteRow[]>();
  for (const t of teilnehmer) {
    const k = karten.get(t.id) ?? OHNE_KARTENZEILE;
    const row: KarteRow = { ...t, lage: k.lage, name_fuer_runde: k.name_fuer_runde, sicht: k.sicht, vom_kampf_angelegt: k.vom_kampf_angelegt, version: k.version };
    const liste = jeKampf.get(t.kampf_id);
    if (liste) liste.push(row); else jeKampf.set(t.kampf_id, [row]);
  }
  return koepfe.map(kopf => kampfAus(kopf, jeKampf.get(kopf.id) ?? []));
}

export const kampfKopf = (roh: KampfRoh): KampfKopf =>
  ({ id: roh.id, name: roh.name, zustand: roh.zustand, runde: roh.runde, erstelltAm: roh.erstelltAm, beendetAm: roh.beendetAm });

interface Werte { readonly vitals: readonly VitalStand[]; readonly zustaende: readonly KartenZustand[] }
const KEINE_WERTE: Werte = Object.freeze({ vitals: Object.freeze([]), zustaende: Object.freeze([]) });
/**
 * Balken und Zustände je Bogen, nach Inhalt: Paket (Inhaltshash) und Bogenwerte. Beides zu
 * berechnen kostet Millisekunden je Karte, und der Abdruck der Live-Verbindung fragt alle paar
 * Sekunden — ein unveränderter Bogen wird so nie zweimal ausgewertet. Klein und begrenzt.
 */
const WERTE = new Map<string, Werte>(), WERTE_GRENZE = 500;

function werteVon(bogen: BogenFuerProjektion): Werte {
  const schluessel = `${bogen.schluessel}\u0000${stableJson(bogen.sheet.fields)}`, bekannt = WERTE.get(schluessel);
  if (bekannt) { merke(WERTE, schluessel, bekannt, WERTE_GRENZE); return bekannt; }
  const { pkg, sheet: { fields } } = bogen;
  let vitals: readonly VitalStand[] = [], zustaende: readonly KartenZustand[] = [];
  // Ein Bogen mitten im Umbau kann ungültig sein — dann eben keine Balken, statt eines Fehlers.
  try { vitals = evaluateVitals(pkg, fields).map(v => ({ id: v.id, label: v.label, wert: v.value, hoechst: v.maximum, depletion: v.depletion, ...(v.color === undefined ? {} : { farbe: v.color }) })); }
  catch { vitals = []; }
  try { zustaende = [...activeConditions(pkg, fields)]; } catch { zustaende = []; }
  const werte: Werte = Object.freeze({ vitals: Object.freeze(vitals.map(v => Object.freeze(v))), zustaende: Object.freeze(zustaende) });
  merke(WERTE, schluessel, werte, WERTE_GRENZE);
  return werte;
}

/** Was die Karten eines oder mehrerer Kämpfe brauchen: Bögen und Bilder, einmal gelesen. */
interface Vorrat { readonly boegen: ReadonlyMap<string, BogenFuerProjektion>; readonly bilder: ReadonlyMap<string, { readonly version: number }> }
const figurenVon = (roh: KampfRoh): string[] => roh.karten.flatMap(k => k.actorId ? [k.actorId] : []);

/**
 * Beendete Kämpfe lesen keine Bögen: die Werte von jetzt sind nicht die von damals, und der
 * Rückblick zeigt, wer dabei war und wer lag (Spezifikation E4). Gelesen wird nur, was in den
 * übergebenen Kämpfen liegt — wer für die Runde projiziert, übergibt nur die sichtbaren Karten.
 */
async function vorrat(tx: Db, cfg: DomainConfig, campaignId: string, kaempfe: readonly KampfRoh[]): Promise<Vorrat> {
  const ids = [...new Set(kaempfe.flatMap(figurenVon))];
  const mitBogen = [...new Set(kaempfe.filter(roh => roh.zustand !== "beendet").flatMap(figurenVon))];
  const boegen = mitBogen.length ? await createGameplay(tx, cfg).boegenFuerProjektion(campaignId, mitBogen) : new Map<string, BogenFuerProjektion>();
  const bilder = new Map(ids.length ? (await tx.query<{ actor_id: string; version: number }>(
    "SELECT actor_id,version FROM actor_portraits WHERE campaign_id=$1 AND actor_id=ANY($2::text[]) AND mime IS NOT NULL", [campaignId, ids])).rows
    .map(row => [row.actor_id, { version: Number(row.version) }] as const) : []);
  return { boegen, bilder };
}

function quellen(roh: KampfRoh, v: Vorrat): KartenQuelle[] {
  return roh.karten.map(k => {
    const bogen = k.actorId && roh.zustand !== "beendet" ? v.boegen.get(k.actorId) : undefined;
    const { vitals, zustaende } = bogen ? werteVon(bogen) : KEINE_WERTE;
    return {
      ...k, bogenVersion: bogen ? bogen.sheet.version : null, vitals: [...vitals], zustaende: [...zustaende],
      bild: k.actorId ? v.bilder.get(k.actorId) ?? null : null,
      aufgebraucht: !!bogen && (bogen.sheet.defeatPending || vitals.some(vital => vital.depletion === "defeat" && vital.wert <= 0)),
    };
  });
}

const nurSichtbar = (roh: KampfRoh): KampfRoh => ({ ...roh, karten: roh.karten.filter(k => k.lage === "feld" || k.lage === "umgelegt") });
const alsLeitung = (roh: KampfRoh, v: Vorrat): KampfFuerLeitung => ({ leitung: true, ...kampfKopf(roh), teilnehmer: quellen(roh, v).map(karteFuerLeitung) });
const alsRunde = (sichtbar: KampfRoh, v: Vorrat, fuehrt: ReadonlySet<string>): KampfFuerRunde =>
  ({ ...kampfKopf(sichtbar), teilnehmer: quellen(sichtbar, v).flatMap(q => { const karte = karteFuerRunde(q, fuehrt); return karte ? [karte] : []; }) });

export async function kampfFuerLeitung(tx: Db, cfg: DomainConfig, campaignId: string, roh: KampfRoh): Promise<KampfFuerLeitung> {
  return alsLeitung(roh, await vorrat(tx, cfg, campaignId, [roh]));
}

/** Für jeden ohne Leitung. Verdeckte Karten verlassen den Server nicht — ihre Bögen werden gar nicht erst gelesen. */
export async function kampfFuerRunde(tx: Db, cfg: DomainConfig, campaignId: string, roh: KampfRoh, fuehrt: ReadonlySet<string>): Promise<KampfFuerRunde> {
  const sichtbar = nurSichtbar(roh);
  return alsRunde(sichtbar, await vorrat(tx, cfg, campaignId, [sichtbar]), fuehrt);
}

/** Mehrere Kämpfe für einen Betrachter (`null` = Spielleitung), mit einem gemeinsamen Vorrat. */
export async function kaempfeDarstellen(tx: Db, cfg: DomainConfig, campaignId: string, rohe: readonly KampfRoh[],
  fuehrt: ReadonlySet<string> | null): Promise<(KampfFuerLeitung | KampfFuerRunde)[]> {
  if (fuehrt === null) { const v = await vorrat(tx, cfg, campaignId, rohe); return rohe.map(roh => alsLeitung(roh, v)); }
  const sichtbar = rohe.map(nurSichtbar), v = await vorrat(tx, cfg, campaignId, sichtbar);
  return sichtbar.map(roh => alsRunde(roh, v, fuehrt));
}
