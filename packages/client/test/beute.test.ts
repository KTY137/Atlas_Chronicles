// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { describe, expect, it } from "vitest";
import type { ItemCard } from "@chronicle/protocol";
import { uebergabeplan } from "../src/features/beute";

/**
 * Der Uebergabeplan — die eine Entscheidung hinter „Beute uebernehmen".
 *
 * Geprueft wird die Regel, nicht die Schleife: welche Gegenstaende ein Zug bewegt, in welcher
 * Reihenfolge, und was er ausdruecklich liegen laesst.
 */
const karte = (over: Partial<ItemCard> & { name?: string }): ItemCard => ({
  id: over.id ?? "id-1", version: over.version ?? 1, holderActorId: over.holderActorId ?? null,
  archivedAt: over.archivedAt ?? null, template: { id: "vorlage", revision: 1 },
  definition: { schemaVersion: 1, name: over.name ?? "Ding", loreEntryId: null, tags: [] },
  state: { quantity: 1, notes: "", equipped: false },
});

describe("Uebergabeplan", () => {
  it("nimmt jede Karte mit ihrer erwarteten Version — und laesst archivierte liegen", () => {
    const plan = uebergabeplan([
      karte({ id: "a", name: "Fell", version: 3, holderActorId: "wolf" }),
      karte({ id: "b", name: "Zahn", version: 7, holderActorId: "wolf" }),
      karte({ id: "c", name: "Weggelegtes", holderActorId: "wolf", archivedAt: 1 }),
    ], "sera");
    // Ein weggelegter Gegenstand ist keine Beute.
    expect(plan.map(p => p.id)).toEqual(["a", "b"]);
    // Die Version reist mit: derselbe Schutz wie bei einer einzelnen Uebergabe.
    expect(plan.find(p => p.id === "b")!.expectedVersion).toBe(7);
  });

  it("bewegt nicht, was schon am Ziel liegt", () => {
    // Ein Befehl, der nichts aendert, verbraucht eine Version, schreibt einen Beleg und macht aus
    // „3 von 3" ein „0 von 3" — er luegt ueber Arbeit.
    const plan = uebergabeplan([
      karte({ id: "a", name: "Fell", holderActorId: "sera" }),
      karte({ id: "b", name: "Zahn", holderActorId: "wolf" }),
    ], "sera");
    expect(plan.map(p => p.id)).toEqual(["b"]);
  });

  it("kennt den Vorrat der Spielleitung als eigenes Ziel", () => {
    const imVorrat = karte({ id: "a", name: "Fell", holderActorId: null });
    const beiDerFigur = karte({ id: "b", name: "Zahn", holderActorId: "sera" });
    // Ziel Vorrat: was schon im Vorrat liegt, bleibt liegen.
    expect(uebergabeplan([imVorrat, beiDerFigur], null).map(p => p.id)).toEqual(["b"]);
    // Und umgekehrt.
    expect(uebergabeplan([imVorrat, beiDerFigur], "sera").map(p => p.id)).toEqual(["a"]);
  });

  it("haelt eine feste Reihenfolge, damit ein Abbruch reproduzierbar bleibt", () => {
    const plan = uebergabeplan([
      karte({ id: "z", name: "Ölzweig", holderActorId: "wolf" }),
      karte({ id: "a", name: "Ähre", holderActorId: "wolf" }),
      karte({ id: "m", name: "Ähre", holderActorId: "wolf" }),
    ], "sera");
    // Nach Name, dann Kennung — und deutsch sortiert, damit „Ähre" vor „Ölzweig" steht.
    expect(plan.map(p => p.id)).toEqual(["a", "m", "z"]);
  });

  it("gibt fuer ein leeres Inventar nichts zurueck", () => {
    expect(uebergabeplan([], "sera")).toEqual([]);
  });
});
