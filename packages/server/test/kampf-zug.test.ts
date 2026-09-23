// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { describe, expect, it } from "vitest";
import type { KartenLage } from "@chronicle/protocol";
import { naechsteFeldkarte, zugNachVerlassen } from "../src/domain/kampf-zug.ts";

// Die Karten stehen bereits in Initiativreihenfolge. Am Zug ist nur, wer auf dem Feld liegt.
const k = (id: string, lage: KartenLage = "feld") => ({ id, lage });

describe("Der nächste Zug", () => {
  it("überspringt Karten, die nicht auf dem Feld liegen", () =>
    expect(naechsteFeldkarte([k("a"), k("b", "hand"), k("c", "umgelegt"), k("d")], "a")).toEqual({ id: "d", neueRunde: false }));
  it("beginnt die Runde neu, wenn der Zug an den Anfang springt", () =>
    expect(naechsteFeldkarte([k("a"), k("b", "ablage"), k("c")], "c")).toEqual({ id: "a", neueRunde: true }));
  it("lässt eine einzelne Feldkarte in der nächsten Runde wieder handeln", () =>
    expect(naechsteFeldkarte([k("a"), k("b", "hand")], "a")).toEqual({ id: "a", neueRunde: true }));
  it("kennt keinen Nachfolger für eine Karte außerhalb des Felds", () =>
    expect(naechsteFeldkarte([k("a", "hand"), k("b")], "a")).toBeNull());
});

describe("Die Karte am Zug verlässt das Feld", () => {
  it("gibt an die nächste Feldkarte weiter", () =>
    expect(zugNachVerlassen([k("a"), k("b", "hand"), k("c")], "a")).toEqual({ amZug: "c", neueRunde: false }));
  it("springt beim Verlassen der letzten an den Anfang und zählt die Runde", () =>
    expect(zugNachVerlassen([k("a"), k("c")], "c")).toEqual({ amZug: "a", neueRunde: true }));
  it("lässt niemanden am Zug, wenn die letzte Feldkarte geht", () =>
    expect(zugNachVerlassen([k("a"), k("b", "hand")], "a")).toEqual({ amZug: null, neueRunde: false }));
});
