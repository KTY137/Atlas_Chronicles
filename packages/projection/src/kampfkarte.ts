// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import type { BalkenArt, BalkenFuerRunde, BalkenMaske, KampfSeite, KarteFuerLeitung, KarteFuerRunde, KartenBild, KartenLage,
  KartenSichtDaten, KartenZustand, Wortstufe } from "@chronicle/protocol";

/**
 * Die Sicht auf eine Karte des Kampftischs — rein, ohne Speicher, ohne HTTP.
 *
 * Der Server ist der Projektor (Grenze B9): er baut aus der Wahrheit der Spielleitung
 * (`KartenQuelle`) je Betrachter die Karte, die dieser bekommen darf. Die Oberfläche rechnet
 * nie selbst; sogar die Vorschau „Mit den Augen der Runde“ holt sie beim Server ab. Eine zweite
 * Rechnung liefe beim ersten Randfall auseinander — und wäre dann die, die etwas verrät.
 */
export interface VitalStand {
  readonly id: string; readonly label: string; readonly wert: number; readonly hoechst: number; readonly depletion: "defeat" | "none";
  /** Die Farbe aus dem Regelpaket, falls es eine wählt. */
  readonly farbe?: string;
}
const farbeVon = (vital: VitalStand): { readonly farbe?: string } => vital.farbe === undefined ? {} : { farbe: vital.farbe };
export interface KartenQuelle {
  readonly id: string; readonly name: string; readonly nameFuerRunde: string | null; readonly seite: KampfSeite; readonly lage: KartenLage;
  readonly actorId: string | null; readonly initiative: number; readonly ordnung: number; readonly initiativeRollId: string | null;
  readonly amZug: boolean; readonly sicht: KartenSichtDaten; readonly vomKampfAngelegt: boolean; readonly version: number;
  readonly bogenVersion: number | null; readonly vitals: readonly VitalStand[]; readonly zustaende: readonly KartenZustand[];
  readonly bild: KartenBild | null; readonly aufgebraucht: boolean;
}

/** Gefährten sieht die Runde genau, alles andere in Worten. Die Spielleitung ändert das je Karte. */
export function vorgabeSicht(seite: KampfSeite): KartenSichtDaten {
  return { schema: 1, standard: seite === "gefaehrten" ? "genau" : "worte", balken: {}, zustaende: true, bild: true };
}

/** Voll, mehr als halb, noch etwas, leer. Ein Höchstwert ≤ 0 zählt als voll, solange etwas da ist. */
export function wortstufe(wert: number, hoechst: number): Wortstufe {
  if (wert <= 0) return "leer";
  if (hoechst <= 0) return "voll";
  const anteil = wert / hoechst;
  return anteil >= 1 ? "voll" : anteil >= 0.5 ? "gut" : "knapp";
}

/**
 * Der Füllstand in Zehnteln. Ein fast voller Balken erscheint nicht voll und ein fast leerer nicht
 * leer; ohne Höchstwert lässt sich aus der Zahl kein genauer Wert zurückrechnen.
 */
export function zehntel(wert: number, hoechst: number): number {
  if (wert <= 0) return 0;
  if (hoechst <= 0 || wert / hoechst >= 1) return 10;
  return Math.min(9, Math.max(1, Math.round(wert / hoechst * 10)));
}

export const balkenArt = (depletion: "defeat" | "none"): BalkenArt => depletion === "defeat" ? "leben" : "vorrat";

/** Die Einstellung eines Balkens; ohne eigenen Eintrag gilt der Standard der Karte. */
export function maskeFuer(sicht: KartenSichtDaten, vitalId: string): BalkenMaske {
  const eigene = Object.hasOwn(sicht.balken, vitalId) ? sicht.balken[vitalId] : undefined;
  return eigene ?? sicht.standard;
}

export function balkenFuerRunde(vital: VitalStand, maske: BalkenMaske): BalkenFuerRunde | null {
  const { id, label } = vital, art = balkenArt(vital.depletion), farbe = farbeVon(vital);
  switch (maske) {
    case "genau": return { id, label, art, ...farbe, anzeige: "genau", wert: vital.wert, hoechst: vital.hoechst };
    case "fuellstand": return { id, label, art, ...farbe, anzeige: "fuellstand", zehntel: zehntel(vital.wert, vital.hoechst) };
    case "worte": return { id, label, art, ...farbe, anzeige: "worte", stufe: wortstufe(vital.wert, vital.hoechst) };
    case "verborgen": return null;
  }
}

/** Sieht ein Betrachter ohne Leitung das Bild dieser Karte? Dieselbe Regel für Nutzlast und Bildweg. */
export function zeigtBild(karte: Pick<KartenQuelle, "lage" | "actorId" | "sicht">, fuehrt: ReadonlySet<string>): boolean {
  if (karte.lage === "hand" || karte.lage === "ablage") return false;
  return (karte.actorId !== null && fuehrt.has(karte.actorId)) || karte.sicht.bild;
}

export function karteFuerLeitung(q: KartenQuelle): KarteFuerLeitung {
  return {
    id: q.id, name: q.name, nameFuerRunde: q.nameFuerRunde, seite: q.seite, lage: q.lage, actorId: q.actorId,
    initiative: q.initiative, ordnung: q.ordnung, initiativeRollId: q.initiativeRollId, gewuerfelt: q.initiativeRollId !== null,
    amZug: q.amZug, sicht: q.sicht, vomKampfAngelegt: q.vomKampfAngelegt, version: q.version, bogenVersion: q.bogenVersion,
    balken: q.vitals.map(vital => {
      const maske = maskeFuer(q.sicht, vital.id);
      return { id: vital.id, label: vital.label, wert: vital.wert, hoechst: vital.hoechst, art: balkenArt(vital.depletion), ...farbeVon(vital), maske, fuerRunde: balkenFuerRunde(vital, maske) };
    }),
    zustaende: q.zustaende, bild: q.bild, aufgebraucht: q.aufgebraucht,
  };
}

/**
 * Eine Karte für einen Betrachter ohne Leitung. `null` heißt: die Karte fehlt in seiner Nutzlast —
 * nicht „verdeckt“, sondern nicht da. `fuehrt` sind die Figuren, die der Betrachter führt; ihre
 * Werte sieht er immer genau, denn ihren Bogen kann er ohnehin lesen.
 */
export function karteFuerRunde(q: KartenQuelle, fuehrt: ReadonlySet<string>): KarteFuerRunde | null {
  if (q.lage === "hand" || q.lage === "ablage") return null;
  const eigene = q.actorId !== null && fuehrt.has(q.actorId);
  const balken = q.vitals.flatMap(vital => {
    const b = balkenFuerRunde(vital, eigene ? "genau" : maskeFuer(q.sicht, vital.id));
    return b ? [b] : [];
  });
  return {
    id: q.id, name: eigene ? q.name : q.nameFuerRunde ?? q.name, seite: q.seite, lage: q.lage,
    initiative: q.initiative, gewuerfelt: q.initiativeRollId !== null, amZug: q.amZug, eigene,
    ...(eigene && q.actorId !== null ? { actorId: q.actorId, ...(q.bogenVersion !== null ? { bogenVersion: q.bogenVersion } : {}) } : {}),
    balken, zustaende: eigene || q.sicht.zustaende ? q.zustaende : [], bild: zeigtBild(q, fuehrt) ? q.bild : null,
  };
}
