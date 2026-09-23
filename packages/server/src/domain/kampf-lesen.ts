// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { gueltigeKartenSicht, type KampfFuerLeitung, type KampfFuerRunde, type KampfKopf, type KampfSeite, type KartenLage, type KartenSichtDaten, type Kampfzustand } from "@chronicle/protocol";
import { karteFuerLeitung, karteFuerRunde, vorgabeSicht, type KartenQuelle, type VitalStand } from "@chronicle/projection";
import { activeConditions, evaluateVitals, type AnyRulePackage, type Scalar } from "@chronicle/rules";
import type { Db } from "../db/index.ts";
import type { DomainConfig } from "./campaigns.ts";
import { Gone } from "./errors.ts";
import { createGameplay } from "./gameplay.ts";

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

export async function lies(tx: Db, campaignId: string, kampfId: string, sperren = false): Promise<KampfRoh> {
  const kopf = (await tx.query<KampfRow>(
    `SELECT id,name,zustand,runde,erstellt_am,beendet_am FROM kaempfe WHERE id=$1 AND campaign_id=$2${sperren ? " FOR UPDATE" : ""}`,
    [kampfId, campaignId])).rows[0];
  if (!kopf) throw new Gone();
  const reihen = (await tx.query<KarteRow>(
    `SELECT t.id,t.name,t.seite,t.actor_id,t.initiative,t.ordnung,t.initiative_roll_id,t.am_zug,
       k.lage,k.name_fuer_runde,k.sicht,k.vom_kampf_angelegt,k.version
     FROM kampf_teilnehmer t LEFT JOIN kampf_karten k ON k.teilnehmer_id=t.id AND k.campaign_id=t.campaign_id
     WHERE t.campaign_id=$1 AND t.kampf_id=$2`, [campaignId, kampfId])).rows;
  return {
    id: kopf.id, name: kopf.name, zustand: kopf.zustand, runde: Number(kopf.runde),
    erstelltAm: Number(kopf.erstellt_am), beendetAm: kopf.beendet_am === null ? null : Number(kopf.beendet_am),
    karten: reihen.map(karteAusZeile).sort(nachInitiative),
  };
}

export const kampfKopf = (roh: KampfRoh): KampfKopf =>
  ({ id: roh.id, name: roh.name, zustand: roh.zustand, runde: roh.runde, erstelltAm: roh.erstelltAm, beendetAm: roh.beendetAm });

const vitalStaende = (pkg: AnyRulePackage, fields: Readonly<Record<string, Scalar>>): VitalStand[] => {
  // Ein Bogen mitten im Umbau kann ungültig sein — dann eben keine Balken, statt eines Fehlers.
  try { return evaluateVitals(pkg, fields).map(v => ({ id: v.id, label: v.label, wert: v.value, hoechst: v.maximum, depletion: v.depletion })); }
  catch { return []; }
};
const zustaendeVon = (pkg: AnyRulePackage, fields: Readonly<Record<string, Scalar>>) => {
  try { return [...activeConditions(pkg, fields)]; } catch { return []; }
};

/**
 * Die Karten mit ihren Werten. Beendete Kämpfe lesen keine Bögen: die Werte von jetzt sind nicht
 * die von damals, und der Rückblick zeigt, wer dabei war und wer lag (Spezifikation E4).
 */
async function quellen(tx: Db, cfg: DomainConfig, campaignId: string, roh: KampfRoh): Promise<KartenQuelle[]> {
  const ids = [...new Set(roh.karten.flatMap(k => k.actorId ? [k.actorId] : []))];
  const boegen = roh.zustand !== "beendet" && ids.length ? await createGameplay(tx, cfg).boegenFuerProjektion(campaignId, ids) : new Map();
  const bilder = new Map(ids.length ? (await tx.query<{ actor_id: string; version: number }>(
    "SELECT actor_id,version FROM actor_portraits WHERE campaign_id=$1 AND actor_id=ANY($2::text[]) AND mime IS NOT NULL", [campaignId, ids])).rows
    .map(row => [row.actor_id, { version: Number(row.version) }] as const) : []);
  return roh.karten.map(k => {
    const bogen = k.actorId ? boegen.get(k.actorId) : undefined;
    const vitals = bogen ? vitalStaende(bogen.pkg, bogen.sheet.fields) : [];
    return {
      ...k, bogenVersion: bogen ? bogen.sheet.version : null, vitals,
      zustaende: bogen ? zustaendeVon(bogen.pkg, bogen.sheet.fields) : [],
      bild: k.actorId ? bilder.get(k.actorId) ?? null : null,
      aufgebraucht: !!bogen && (bogen.sheet.defeatPending || vitals.some(v => v.depletion === "defeat" && v.wert <= 0)),
    };
  });
}

export async function kampfFuerLeitung(tx: Db, cfg: DomainConfig, campaignId: string, roh: KampfRoh): Promise<KampfFuerLeitung> {
  return { leitung: true, ...kampfKopf(roh), teilnehmer: (await quellen(tx, cfg, campaignId, roh)).map(karteFuerLeitung) };
}

/** Für jeden ohne Leitung. Verdeckte Karten verlassen den Server nicht — ihre Bögen werden gar nicht erst gelesen. */
export async function kampfFuerRunde(tx: Db, cfg: DomainConfig, campaignId: string, roh: KampfRoh, fuehrt: ReadonlySet<string>): Promise<KampfFuerRunde> {
  const sichtbar: KampfRoh = { ...roh, karten: roh.karten.filter(k => k.lage === "feld" || k.lage === "umgelegt") };
  return { ...kampfKopf(roh), teilnehmer: (await quellen(tx, cfg, campaignId, sichtbar)).flatMap(q => { const karte = karteFuerRunde(q, fuehrt); return karte ? [karte] : []; }) };
}
