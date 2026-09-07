// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { describe, expect, it } from "vitest";
import type { ActorCard, ItemCard, ItemContract } from "@chronicle/protocol";
import { speicherstats } from "../src/features/speicherstats";

// Der Speicherstand beantwortet die eine Frage, die der Vorrat allein nicht beantwortet:
// WO liegt der Loot? Die Spielleitung holt die Liste ohnehin — hier wird nur gerechnet.

const karte = (name: string, seltenheit?: "selten" | "episch"): ItemContract => seltenheit
  ? { schemaVersion: 2, name, loreEntryId: null, tags: [], seltenheit, kategorie: "", bildAssetId: null, spruch: "", zeilen: [] }
  : { schemaVersion: 1, name, loreEntryId: null, tags: [] };

let laufend = 0;
const stueck = (templateId: string, definition: ItemContract, holderActorId: string | null, quantity = 1,
  extras: Partial<ItemCard> = {}): ItemCard => ({
  id: `i${++laufend}`, version: 1, holderActorId, archivedAt: null,
  template: { id: templateId, revision: 1 }, definition, state: { quantity, notes: "", equipped: false }, ...extras,
});
const figur = (id: string, name: string): ActorCard => ({
  id, campaignId: "c", name, kind: "player_character", version: 1, archivedAt: null,
  loreEntryId: null, template: null, canControl: true, canReadAs: true,
});

describe("Der Speicherstand", () => {
  const sera = figur("a1", "Sera"), brannt = figur("a2", "Brannt");

  it("zählt Karten und Stücke getrennt", () => {
    // Zwanzig Pfeile sind EIN Eintrag im Inventar und zwanzig Stücke im Bestand. Beides
    // zusammenzuwerfen macht die Übersicht falsch, sobald jemand Verbrauchsgut führt.
    const stand = speicherstats([stueck("t1", karte("Pfeil"), null, 20), stueck("t1", karte("Pfeil"), "a1", 5)], [sera]);
    expect(stand).toMatchObject({ vorlagen: 1, karten: 2, stuecke: 25, imVorratStuecke: 20, vergebeneStuecke: 5 });
    expect(stand.zeilen[0]).toMatchObject({ name: "Pfeil", karten: 2, stuecke: 25, imVorratKarten: 1, imVorratStuecke: 20 });
  });

  it("sagt, bei wem was liegt", () => {
    const stand = speicherstats([
      stueck("t1", karte("Laterne", "selten"), null),
      stueck("t1", karte("Laterne", "selten"), "a1", 2),
      stueck("t1", karte("Laterne", "selten"), "a1"),
      stueck("t1", karte("Laterne", "selten"), "a2"),
    ], [sera, brannt]);
    const zeile = stand.zeilen[0]!;
    expect(zeile.seltenheit).toBe("selten");
    // Nach Namen sortiert, damit dieselbe Runde immer dieselbe Reihenfolge sieht.
    expect(zeile.vergeben.map(v => [v.name, v.karten, v.stuecke])).toEqual([["Brannt", 1, 1], ["Sera", 2, 3]]);
    expect(zeile.imVorratStuecke).toBe(1);
  });

  it("lässt Archiviertes aus dem Bestand heraus", () => {
    // Ein archivierter Gegenstand ist aus dem Spiel genommen. Ihn mitzuzählen hieße, Vorrat zu
    // versprechen, den es nicht mehr gibt.
    const stand = speicherstats([
      stueck("t1", karte("Laterne"), null),
      stueck("t1", karte("Laterne"), null, 1, { archivedAt: 1 }),
    ], []);
    expect(stand).toMatchObject({ karten: 1, stuecke: 1, imVorratStuecke: 1 });
  });

  it("ordnet die Vorlagen nach Namen und nennt jede nur einmal", () => {
    const stand = speicherstats([
      stueck("t2", karte("Zunder"), null), stueck("t1", karte("Amulett"), null), stueck("t3", karte("Messer"), null),
      stueck("t1", karte("Amulett"), "a1"),
    ], [sera]);
    expect(stand.zeilen.map(z => z.name)).toEqual(["Amulett", "Messer", "Zunder"]);
    expect(stand.vorlagen).toBe(3);
  });

  it("nimmt die Beschriftung aus der jüngsten Revision, zählt aber alle Stücke zusammen", () => {
    // Eine überarbeitete Vorlage heißt womöglich anders. Der Bestand soll den heutigen Namen
    // zeigen — und ältere Stücke trotzdem mitzählen, denn es ist dieselbe Vorlage.
    const stand = speicherstats([
      stueck("t1", karte("Messingschlüssel"), null, 1, { template: { id: "t1", revision: 1 } }),
      stueck("t1", karte("Eisenschlüssel"), "a1", 1, { template: { id: "t1", revision: 2 } }),
    ], [sera]);
    expect(stand.zeilen).toHaveLength(1);
    expect(stand.zeilen[0]).toMatchObject({ name: "Eisenschlüssel", karten: 2, stuecke: 2 });
  });

  it("nennt eine Figur beim Namen, auch wenn sie nicht in der Liste steht", () => {
    // Eine archivierte oder gerade nicht sichtbare Figur darf keine leere Zeile erzeugen.
    const stand = speicherstats([stueck("t1", karte("Laterne"), "a9")], []);
    expect(stand.zeilen[0]!.vergeben[0]).toMatchObject({ actorId: "a9", name: "Unbekannte Figur", stuecke: 1 });
  });

  it("bleibt bei leerem Bestand ein gültiger Stand", () => {
    expect(speicherstats([], [])).toMatchObject({ zeilen: [], vorlagen: 0, karten: 0, stuecke: 0 });
  });
});
