// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import type { ItemCard } from "@chronicle/protocol";

/**
 * BEUTE ÜBERNEHMEN — die Regel, welche Gegenstände ein Zug wirklich bewegt.
 *
 * Der Wolf trägt sein Fell, seit er erschaffen wurde (Feature 16). Am Tisch fehlte danach der
 * kurze Weg: die Spielleitung musste jeden einzelnen Gegenstand von Hand umhängen. Dieser Plan
 * ist die eine Entscheidung dahinter — und er steht hier als reine Funktion, weil eine Schleife
 * über Befehle sich schlecht prüfen lässt, eine Liste dagegen sehr gut.
 *
 * **Es entsteht kein zweiter Besitzweg.** Jeder Posten geht durch denselben `custody`-Befehl wie
 * eine einzelne Übergabe, mit derselben erwarteten Version. Der Plan sagt nur, was zu tun ist.
 */
export interface Uebergabeposten {
  readonly id: string;
  readonly expectedVersion: number;
  readonly name: string;
}

/**
 * Was von `items` an `ziel` gehen muss. `ziel === null` ist der Vorrat der Spielleitung.
 *
 * Drei Auslassungen, jede mit Grund:
 *
 * - **Was schon dort liegt**, wird nicht bewegt. Ein Befehl, der nichts ändert, verbraucht eine
 *   Version, schreibt einen Beleg und macht aus „3 von 3" ein „0 von 3" — er lügt über Arbeit.
 * - **Archiviertes** bleibt liegen: ein weggelegter Gegenstand ist keine Beute.
 * - **Feste Reihenfolge** nach Name, dann Kennung. Bricht ein Zug in der Mitte ab, ist derselbe
 *   Anfang wieder derselbe — und der Bericht liest sich in der Reihenfolge der Liste.
 */
export function uebergabeplan(items: readonly ItemCard[], ziel: string | null): Uebergabeposten[] {
  return items
    .filter(item => item.archivedAt === null && (item.holderActorId ?? null) !== ziel)
    .map(item => ({ id: item.id, expectedVersion: item.version, name: item.definition.name }))
    .sort((a, b) => a.name.localeCompare(b.name, "de") || a.id.localeCompare(b.id));
}
