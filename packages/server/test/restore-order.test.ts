// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { describe, expect, it } from "vitest";
// Immer das neueste Profil: der Wächter ist nur so viel wert, wie er aktuell ist.
import { CAMPAIGN_V16_TABLES } from "@chronicle/io";
import { restoreOrder } from "../src/domain/bundles.ts";

/**
 * Der Zwilling zur Löschabdeckung aus `deletion.test.ts`.
 *
 * Die Löschprüfung leitet ihre Erwartung aus dem laufenden Schema her und hat deshalb sofort
 * gemeldet, dass `beziehungen` fehlt. Für den **Restore** gab es diesen Wächter nicht: eine
 * Tabelle, die im Profil steht, aber nicht in `restoreOrder`, wird beim Wiederherstellen
 * **stillschweigend übersprungen**. Kein Fehler, keine Warnung — die Zeilen sind einfach weg,
 * und zwar genau dann, wenn jemand ein Backup zurückspielt.
 *
 * Das ist die teuerste Art von Datenverlust, weil sie erst auffällt, wenn das Original schon
 * fort ist. Diese Datei macht sie zu einem roten Test.
 *
 * Die Löschseite bleibt bei `deletion.test.ts`: sie leitet ihre Erwartung aus dem laufenden
 * Schema her und ist damit genauer, als eine Liste hier je wäre.
 */
describe("Jede Profiltabelle wird auch wirklich zurückgespielt", () => {
  const profil = CAMPAIGN_V16_TABLES.map(table => table.name);

  it("nennt restoreOrder jede Tabelle des Kampagnenprofils", () => {
    expect(profil.filter(name => !restoreOrder.includes(name))).toEqual([]);
  });

  it("nennt restoreOrder keine Tabelle, die das Profil nicht kennt", () => {
    expect(restoreOrder.filter(name => !profil.includes(name))).toEqual([]);
  });

  it("nennt restoreOrder keine Tabelle zweimal", () => {
    expect(restoreOrder.length).toBe(new Set(restoreOrder).size);
  });

});
