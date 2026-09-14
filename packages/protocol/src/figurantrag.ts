// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
/**
 * Der Figurantrag — ein Spieler bittet um eine Figur, die Spielleitung entscheidet.
 *
 * **Der Antrag ist ein eigenes Objekt, nicht eine halbfertige Figur.** Eine „unbestätigte Figur"
 * wäre eine Zeile in `actors`, auf die `authorizeActor` und seine acht Aufrufer bereits antworten
 * müssten — jeder von ihnen bräuchte dann eine zusätzliche Bedingung, und eine einzige vergessene
 * Stelle gäbe Zugriff auf etwas, das niemand freigegeben hat. Deshalb entsteht die Figur erst bei
 * der Bestätigung, über denselben `instantiateActor`, den die Spielleitung sonst auch benutzt.
 * Vorher gibt es nur diesen Antrag.
 *
 * **Die Vorlage muss freigegeben sein.** Eine Figurvorlage ist Werkstattmaterial der
 * Spielleitung; erst eine ausdrückliche Freigabe macht sie für Spieler wählbar. Die Freigabe
 * ist widerrufbar und trägt ihre eigene Version.
 */
import { RuleValues } from "./rule-runtime.ts";
import { Type, type Static } from "@sinclair/typebox";

const closed = { additionalProperties: false } as const;
const id = Type.String({ minLength: 1, maxLength: 128 });
const name = Type.String({ minLength: 1, maxLength: 160, pattern: "\\S" });
const reason = Type.String({ minLength: 1, maxLength: 500, pattern: "\\S" });
const version = Type.Integer({ minimum: 1, maximum: 2_147_483_647 });
/** Eine noch nie erteilte Freigabe hat die Version 0 — wie jeder andere noch nicht erteilte Grant. */
const grantVersion = Type.Integer({ minimum: 0, maximum: 2_147_483_647 });
const werte = RuleValues;

export const FIGURANTRAG_STATUS = ["offen", "bestaetigt", "abgelehnt", "zurueckgezogen"] as const;
export type FigurantragStatus = typeof FIGURANTRAG_STATUS[number];
export const FIGURANTRAG_OPERATIONS = [
  "figurvorlage.freigeben", "figurvorlage.entziehen",
  "figurantrag.beantragen", "figurantrag.zuruecknehmen", "figurantrag.bestaetigen", "figurantrag.ablehnen",
] as const;
export type FigurantragOperation = typeof FIGURANTRAG_OPERATIONS[number];

/**
 * Der Antrag, wie ihn beide Seiten sehen.
 *
 * `anfangswerte` fuehrt **nur die abweichenden Felder**: die Vorlage bleibt die Grundlage, der
 * Antrag nennt, was daran anders sein soll. Ohne diese Angabe auf der Karte entschiede die
 * Spielleitung blind — sie saehe einen Namen und eine Vorlage, aber nicht die Werte, die sie
 * damit bestaetigt.
 *
 * `package` wird vom hostautoritativen Pfad aus genau der beantragten Vorlagenrevision
 * projiziert. Es bleibt optional, damit historische/alte interne Erzeuger von `FigurantragCard`
 * beim schrittweisen Entfernen des Legacy-Pfads lesbar bleiben; die produktive HTTP-Projektion
 * liefert es immer.
 */
export interface FigurantragCard {
  id: string; templateId: string; templateRevision: number; name: string;
  anfangswerte: Record<string, unknown>;
  package?: { id: string; version: string };
  status: FigurantragStatus; version: number; antragsteller: string; createdAt: string;
  decidedBy: string | null; decidedAt: string | null; actorId: string | null; reason: string | null;
}
/**
 * Die Spielerprojektion einer freigegebenen Vorlage.
 *
 * Ohne `beute`: die Beutetabelle einer Vorlage ist Spielleitungswissen — sie verriete vorab, was
 * an einer Figur hängt. Ohne `loreEntryId`: der Verweis zeigt auf einen Wikiartikel, dessen
 * Sichtbarkeit am Wissensblick hängt; die einfachste sichere Regel lässt ihn für Spieler immer
 * weg, statt für jede Karte eine zweite Wissensabfrage zu fahren.
 */
export interface FreigegebeneVorlageCard {
  id: string; name: string; art: string; anfangswerte: Record<string, unknown>; version: number;
  package: { id: string; version: string };
}
/**
 * Der Freigabestand einer Figurvorlage, wie ihn die **Spielleitung** auf ihrer Vorlagenkarte
 * liest. `null` heisst: nie freigegeben.
 *
 * Ohne diese Angabe muesste der Freigabeschalter seine `expectedVersion` raten. Nach einem Entzug
 * und einer erneuten Freigabe in einer frueheren Sitzung waere die geratene Zahl dauerhaft falsch,
 * und auch Neuladen loeste den 409 nicht auf — die Version stand ja nirgends.
 */
export interface FigurvorlageFreigabeStand { frei: boolean; version: number }
/** Die Quittung der Freigabe. `freigegeben` ist die Antwort, alles andere ihr Beleg. */
export interface FigurantragFreigabeAck {
  templateId: string; campaignId: string; freigegeben: boolean; version: number;
  freedBy: string; freedAt: string; revokedAt: string | null;
}

export const FigurvorlageFreigabeBody = Type.Object({ expectedVersion: grantVersion }, closed);
export const FigurantragAntragBody = Type.Object({ commandId: id, templateId: id, name, anfangswerte: werte }, closed);
export const FigurantragEntscheidungBody = Type.Object({ expectedVersion: version }, closed);
export const FigurantragAblehnungBody = Type.Object({ expectedVersion: version, reason }, closed);

export type FigurvorlageFreigabeInput = Static<typeof FigurvorlageFreigabeBody>;
export type FigurantragAntragInput = Static<typeof FigurantragAntragBody>;
export type FigurantragEntscheidungInput = Static<typeof FigurantragEntscheidungBody>;
export type FigurantragAblehnungInput = Static<typeof FigurantragAblehnungBody>;
