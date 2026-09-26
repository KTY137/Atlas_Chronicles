// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { t } from "../i18n";

/**
 * Der Grund einer Änderung ist für Menschen freiwillig, für den Server Pflicht.
 *
 * Kaya, 2026-09-26: Wer eine Figur anlegt oder einen Bogen ändert, soll nicht an einem Feld
 * „Grund der Änderung“ hängen bleiben. Der Serververtrag bleibt trotzdem, wie er ist: jeder
 * Eintrag im Verlauf trägt einen Grund (1–500 Zeichen, mindestens ein sichtbares Zeichen).
 * Bleibt das Feld leer, schickt der Client deshalb einen festen, ehrlichen Standardgrund.
 */
export type GrundArt = "bogen" | "inventar" | "figur" | "vorlage";

export function defaultReason(kind: GrundArt): string {
  switch (kind) {
    case "bogen": return t("Bogen bearbeitet");
    case "inventar": return t("Inventar bearbeitet");
    case "figur": return t("Figur bearbeitet");
    default: return t("Vorlage bearbeitet");
  }
}

/** Der eingetragene Grund, sonst der Standardgrund der Art. */
export function reasonOrDefault(reason: string, kind: GrundArt): string {
  return reason.trim() || defaultReason(kind);
}
