// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import type { ActorCard, ItemCard, LootRarityValue } from "@chronicle/protocol";
import { t } from "../i18n";

/**
 * Der Speicherstand: was es gibt, wie viel davon, und **wo es liegt**.
 *
 * Eine reine Ableitung aus der Liste, die die Spielleitung ohnehin schon geholt hat. Bewusst
 * keine zweite Abfrage und keine Aggregation auf dem Server: dieselben Zahlen an zwei Orten
 * auszurechnen heißt, sie irgendwann verschieden auszurechnen.
 *
 * **Stücke und Karten sind zwei Zahlen, nicht eine.** Eine Instanz kann `quantity: 20` tragen —
 * zwanzig Pfeile sind ein Eintrag im Inventar, aber zwanzig Stücke im Bestand. Beides
 * zusammenzuwerfen macht die Übersicht falsch, sobald jemand Verbrauchsgut führt.
 *
 * **Archiviertes zählt nicht mit.** Ein archivierter Gegenstand ist aus dem Spiel genommen; ihn
 * im Bestand zu führen hieße, der Spielleitung Vorrat zu versprechen, den sie nicht hat.
 */

export interface Vergabe { actorId: string; name: string; stuecke: number; karten: number }
export interface Vorratszeile {
  templateId: string; name: string; seltenheit: LootRarityValue | null;
  karten: number; stuecke: number;
  imVorratKarten: number; imVorratStuecke: number;
  vergeben: readonly Vergabe[];
}
export interface Speicherstats {
  zeilen: readonly Vorratszeile[];
  vorlagen: number; karten: number; stuecke: number;
  imVorratStuecke: number; vergebeneStuecke: number;
}

const leer: Speicherstats = { zeilen: [], vorlagen: 0, karten: 0, stuecke: 0, imVorratStuecke: 0, vergebeneStuecke: 0 };

export function speicherstats(items: readonly ItemCard[], actors: readonly ActorCard[]): Speicherstats {
  const namen = new Map(actors.map(actor => [actor.id, actor.name]));
  const nach = new Map<string, { zeile: Vorratszeile; vergaben: Map<string, Vergabe>; hoechsteRevision: number }>();
  let karten = 0, stuecke = 0, imVorratStuecke = 0, vergebeneStuecke = 0;

  for (const item of items) {
    if (item.archivedAt !== null) continue;
    const menge = item.state.quantity;
    karten += 1; stuecke += menge;
    const schluessel = item.template.id;
    let eintrag = nach.get(schluessel);
    if (!eintrag) {
      eintrag = { vergaben: new Map(), hoechsteRevision: 0, zeile: {
        templateId: schluessel, name: item.definition.name,
        seltenheit: item.definition.schemaVersion === 2 ? item.definition.seltenheit : null,
        karten: 0, stuecke: 0, imVorratKarten: 0, imVorratStuecke: 0, vergeben: [],
      } };
      nach.set(schluessel, eintrag);
    }
    const zeile = eintrag.zeile as { -readonly [K in keyof Vorratszeile]: Vorratszeile[K] };
    zeile.karten += 1; zeile.stuecke += menge;
    // Die jüngste Fassung gewinnt die Beschriftung: eine überarbeitete Vorlage heißt womöglich
    // anders, und der Bestand soll den Namen zeigen, den die Karte heute trägt. Ältere Stücke
    // behalten ihre eigene Revision — gezählt werden sie trotzdem unter derselben Vorlage.
    if (item.template.revision >= eintrag.hoechsteRevision) {
      eintrag.hoechsteRevision = item.template.revision;
      zeile.name = item.definition.name;
      zeile.seltenheit = item.definition.schemaVersion === 2 ? item.definition.seltenheit : null;
    }
    if (item.holderActorId === null) {
      zeile.imVorratKarten += 1; zeile.imVorratStuecke += menge; imVorratStuecke += menge;
    } else {
      vergebeneStuecke += menge;
      const vorhanden = eintrag.vergaben.get(item.holderActorId);
      if (vorhanden) { vorhanden.stuecke += menge; vorhanden.karten += 1; }
      else eintrag.vergaben.set(item.holderActorId, {
        actorId: item.holderActorId, name: namen.get(item.holderActorId) ?? t("Unbekannte Figur"), stuecke: menge, karten: 1,
      });
    }
  }
  if (!nach.size) return leer;

  const vergleiche = (a: string, b: string) => a.localeCompare(b, "de");
  const zeilen = [...nach.values()].map(({ zeile, vergaben }) => ({
    ...zeile, vergeben: [...vergaben.values()].sort((a, b) => vergleiche(a.name, b.name)),
  })).sort((a, b) => vergleiche(a.name, b.name));
  return { zeilen, vorlagen: zeilen.length, karten, stuecke, imVorratStuecke, vergebeneStuecke };
}
