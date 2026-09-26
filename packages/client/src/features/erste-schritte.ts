// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { t } from "../i18n";

/**
 * „So startet deine Runde“ (E14) — die Checkliste der Spielleitung, abgehakt aus dem echten Stand.
 *
 * `null` heißt: noch nicht geladen oder nicht erreichbar. Ein solcher Punkt bleibt ohne Haken,
 * statt eine Fehlerwand zu zeigen — die Liste ist eine Orientierung, kein Prüfbericht.
 */
export type ErsterSchrittId = "regelwerk" | "vorlage" | "einladen" | "figuren";
export interface RundenStand {
  regelwerkAktiv: boolean | null;
  vorlagen: number | null;
  /** Vorlagen, die Mitspieler als Figur beantragen können. Ohne sie bleibt der Antrag leer. */
  freigegebeneVorlagen: number | null;
  mitspieler: number | null;
  figuren: number | null;
  offeneAntraege: number | null;
}
export interface ErsterSchritt { id: ErsterSchrittId; erledigt: boolean; hinweis?: string }

const mehrAlsNull = (wert: number | null) => wert !== null && wert > 0;

export function ersteSchritte(stand: RundenStand): ErsterSchritt[] {
  const warten = stand.offeneAntraege ?? 0;
  const figuren: ErsterSchritt = { id: "figuren", erledigt: mehrAlsNull(stand.figuren) && stand.offeneAntraege === 0 };
  if (warten > 0) figuren.hinweis = warten === 1 ? t("Ein Antrag wartet") : t("{anzahl} Anträge warten", { anzahl: warten });
  // Eine Vorlage allein reicht nicht: erst eine freigegebene lässt Mitspieler eine Figur beantragen.
  const vorlage: ErsterSchritt = { id: "vorlage", erledigt: mehrAlsNull(stand.vorlagen) && mehrAlsNull(stand.freigegebeneVorlagen) };
  if (mehrAlsNull(stand.vorlagen) && stand.freigegebeneVorlagen === 0) vorlage.hinweis = t("Gib eine Vorlage für Mitspieler frei, damit sie Figuren beantragen können.");
  return [
    { id: "regelwerk", erledigt: stand.regelwerkAktiv === true },
    vorlage,
    { id: "einladen", erledigt: mehrAlsNull(stand.mitspieler) },
    figuren,
  ];
}

export function alleErledigt(schritte: readonly ErsterSchritt[]): boolean {
  return schritte.length > 0 && schritte.every(schritt => schritt.erledigt);
}
