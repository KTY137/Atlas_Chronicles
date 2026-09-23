// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import type { KartenLage } from "@chronicle/protocol";

/**
 * Die Zugregeln des Kampftischs, rein. Die Karten stehen bereits in Initiativreihenfolge; am Zug
 * ist nur, wer auf dem Feld liegt, und nur Feld-Karten zählen die Runde (Spezifikation E2).
 */
export interface ZugKarte { readonly id: string; readonly lage: KartenLage }

/** Wer nach `vonId` dran ist, und ob dabei eine neue Runde beginnt. */
export function naechsteFeldkarte(karten: readonly ZugKarte[], vonId: string): { readonly id: string; readonly neueRunde: boolean } | null {
  const feld = karten.filter(k => k.lage === "feld"), stelle = feld.findIndex(k => k.id === vonId);
  if (stelle < 0) return null;
  const naechste = (stelle + 1) % feld.length;
  return { id: feld[naechste]!.id, neueRunde: naechste === 0 };
}

/**
 * Die Karte `wegId` war am Zug und verlässt das Feld. Der Zug geht an die Karte, die jetzt an
 * ihrer Stelle steht; war sie die letzte, springt er an den Anfang, und das ist die neue Runde.
 */
export function zugNachVerlassen(karten: readonly ZugKarte[], wegId: string): { readonly amZug: string | null; readonly neueRunde: boolean } {
  const feld = karten.filter(k => k.lage === "feld"), stelle = feld.findIndex(k => k.id === wegId), rest = feld.filter(k => k.id !== wegId);
  if (stelle < 0 || !rest.length) return { amZug: null, neueRunde: false };
  return { amZug: rest[stelle % rest.length]!.id, neueRunde: stelle === rest.length };
}
