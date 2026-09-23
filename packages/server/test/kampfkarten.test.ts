// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { KampfFuerLeitung } from "@chronicle/protocol";
import { createTestDb, migrate, type Db } from "../src/db/index.ts";
import { Conflict, Gone } from "../src/domain/errors.ts";
import { kampfFixture } from "./kampf-fixture.ts";

// Was am Tisch vorkommt: verdecken, ausspielen, umlegen, vom Feld nehmen — und wer dabei dran ist.
describe("Der Kampftisch", () => {
  let db: Db;
  beforeAll(async () => { db = await createTestDb(); await migrate(db); }, 30_000);
  afterAll(async () => { await db?.close(); });

  type Stand = { readonly teilnehmer: readonly { readonly name: string; readonly amZug: boolean; readonly lage: string }[] };
  const amZug = (k: Stand) => k.teilnehmer.find(t => t.amZug)?.name ?? null;
  const namen = (k: { readonly teilnehmer: readonly { readonly name: string }[] }) => k.teilnehmer.map(t => t.name);
  /** Wer am Zug ist, liegt auf dem Feld — nach jedem Schritt. */
  const invariante = (k: Stand) => expect(k.teilnehmer.filter(t => t.amZug && t.lage !== "feld")).toEqual([]);
  const karte = (k: KampfFuerLeitung, name: string) => k.teilnehmer.find(t => t.name === name)!;

  async function tisch(karten: readonly { name: string; initiative: number; lage?: "hand" | "feld" }[]) {
    const f = await kampfFixture(db);
    const kampf = await f.buehne.anlegen(f.gm, f.campaign, { name: "Tisch" });
    for (const k of karten) await f.buehne.teilnehmerHinzufuegen(f.gm, f.campaign, kampf.id,
      { name: k.name, seite: "gegner", initiative: k.initiative, ...(k.lage ? { lage: k.lage } : {}) });
    return { f, kampfId: kampf.id };
  }

  describe("Lage und Zug", () => {
    it("lässt verdeckte Karten aus der Zugfolge und zählt die Runde nur über das Feld", async () => {
      const { f, kampfId } = await tisch([{ name: "A", initiative: 20 }, { name: "B", initiative: 15, lage: "hand" }, { name: "C", initiative: 10 }]);
      let stand = await f.buehne.eroeffnen(f.gm, f.campaign, kampfId); invariante(stand);
      expect(amZug(stand)).toBe("A");
      stand = await f.buehne.naechsterZug(f.gm, f.campaign, kampfId, karte(stand, "A").id, 1);
      expect([amZug(stand), stand.runde]).toEqual(["C", 1]);
      stand = await f.buehne.naechsterZug(f.gm, f.campaign, kampfId, karte(stand, "C").id, 1);
      expect([amZug(stand), stand.runde]).toEqual(["A", 2]); invariante(stand);
    });

    it("reiht eine ausgespielte Karte nach Initiative ein; vor dem aktuellen Zug handelt sie ab der nächsten Runde", async () => {
      const { f, kampfId } = await tisch([{ name: "A", initiative: 20 }, { name: "B", initiative: 15, lage: "hand" }, { name: "C", initiative: 10 }]);
      let stand = await f.buehne.eroeffnen(f.gm, f.campaign, kampfId);
      stand = await f.buehne.naechsterZug(f.gm, f.campaign, kampfId, karte(stand, "A").id, 1);
      const b = karte(stand, "B");
      stand = await f.buehne.lageSetzen(f.gm, f.campaign, kampfId, b.id, { lage: "feld", expectedVersion: b.version });
      expect(amZug(stand)).toBe("C"); invariante(stand);
      stand = await f.buehne.naechsterZug(f.gm, f.campaign, kampfId, karte(stand, "C").id, 1);
      expect([amZug(stand), stand.runde]).toEqual(["A", 2]);
      stand = await f.buehne.naechsterZug(f.gm, f.campaign, kampfId, karte(stand, "A").id, 2);
      expect(amZug(stand)).toBe("B");
    });

    it("gibt den Zug weiter, wenn die Karte am Zug umgelegt wird, und zählt beim Rücksprung die Runde", async () => {
      const { f, kampfId } = await tisch([{ name: "A", initiative: 20 }, { name: "B", initiative: 10 }]);
      let stand = await f.buehne.eroeffnen(f.gm, f.campaign, kampfId);
      stand = await f.buehne.naechsterZug(f.gm, f.campaign, kampfId, karte(stand, "A").id, 1);
      const b = karte(stand, "B");
      stand = await f.buehne.lageSetzen(f.gm, f.campaign, kampfId, b.id, { lage: "umgelegt", expectedVersion: b.version });
      expect([amZug(stand), stand.runde, karte(stand, "B").lage]).toEqual(["A", 2, "umgelegt"]); invariante(stand);
    });

    it("lässt niemanden am Zug, wenn das Feld leer wird — die nächste Feldkarte beginnt", async () => {
      const { f, kampfId } = await tisch([{ name: "A", initiative: 20 }, { name: "B", initiative: 10, lage: "hand" }]);
      let stand = await f.buehne.eroeffnen(f.gm, f.campaign, kampfId);
      const a = karte(stand, "A");
      stand = await f.buehne.lageSetzen(f.gm, f.campaign, kampfId, a.id, { lage: "ablage", expectedVersion: a.version });
      expect(amZug(stand)).toBeNull(); invariante(stand);
      const b = karte(stand, "B");
      stand = await f.buehne.lageSetzen(f.gm, f.campaign, kampfId, b.id, { lage: "feld", expectedVersion: b.version });
      expect(amZug(stand)).toBe("B");
    });

    it("eröffnet nicht ohne Karte auf dem Feld", async () => {
      const { f, kampfId } = await tisch([{ name: "A", initiative: 20, lage: "hand" }]);
      await expect(f.buehne.eroeffnen(f.gm, f.campaign, kampfId)).rejects.toBeInstanceOf(Conflict);
    });

    it("weist einen veralteten Stand ab, statt still zu überschreiben", async () => {
      const { f, kampfId } = await tisch([{ name: "A", initiative: 20 }]);
      const vorher = karte(await f.buehne.buehne(f.gm, f.campaign, kampfId) as KampfFuerLeitung, "A");
      expect(vorher.version).toBe(0);
      const nach = await f.buehne.lageSetzen(f.gm, f.campaign, kampfId, vorher.id, { lage: "hand", expectedVersion: 0 });
      expect(karte(nach, "A")).toMatchObject({ lage: "hand", version: 1 });
      // Ein zweites Fenster mit dem alten Stand:
      await expect(f.buehne.lageSetzen(f.gm, f.campaign, kampfId, vorher.id, { lage: "umgelegt", expectedVersion: 0 })).rejects.toBeInstanceOf(Conflict);
      expect(karte(await f.buehne.buehne(f.gm, f.campaign, kampfId) as KampfFuerLeitung, "A").lage).toBe("hand");
    });

    it("ändert nach dem Ende nichts mehr", async () => {
      const { f, kampfId } = await tisch([{ name: "A", initiative: 20 }]);
      await f.buehne.eroeffnen(f.gm, f.campaign, kampfId);
      const aus = await f.buehne.beenden(f.gm, f.campaign, kampfId), a = karte(aus, "A");
      await expect(f.buehne.lageSetzen(f.gm, f.campaign, kampfId, a.id, { lage: "hand", expectedVersion: a.version })).rejects.toBeInstanceOf(Conflict);
      await expect(f.buehne.initiativeSetzen(f.gm, f.campaign, kampfId, a.id, { initiative: 3, initiativeRollId: null })).rejects.toBeInstanceOf(Conflict);
    });

    it("lässt die Karte am Zug dran, wenn ihre Initiative mitten in der Runde sinkt; danach gilt die neue Reihenfolge", async () => {
      const { f, kampfId } = await tisch([{ name: "A", initiative: 30 }, { name: "B", initiative: 20 }, { name: "C", initiative: 10 }]);
      let stand = await f.buehne.eroeffnen(f.gm, f.campaign, kampfId);
      stand = await f.buehne.initiativeSetzen(f.gm, f.campaign, kampfId, karte(stand, "A").id, { initiative: 5, initiativeRollId: null });
      expect(namen(stand)).toEqual(["B", "C", "A"]);
      expect(amZug(stand)).toBe("A");
      // A steht jetzt hinten: der nächste Zug springt an den Anfang. C kommt in dieser Runde nicht
      // mehr dran — so hat die Spielleitung die Reihenfolge gesetzt, und so steht es in der Spezifikation (E6).
      stand = await f.buehne.naechsterZug(f.gm, f.campaign, kampfId, karte(stand, "A").id, 1);
      expect([amZug(stand), stand.runde]).toEqual(["B", 2]);
    });

    it("nimmt eine Karte samt ihrer Lage vom Tisch", async () => {
      const { f, kampfId } = await tisch([{ name: "A", initiative: 20, lage: "hand" }]);
      const a = karte(await f.buehne.buehne(f.gm, f.campaign, kampfId) as KampfFuerLeitung, "A");
      expect(a.version).toBe(1);
      expect((await f.buehne.teilnehmerEntfernen(f.gm, f.campaign, kampfId, a.id)).teilnehmer).toEqual([]);
    });

    it("lässt Spielende weder Lage noch Initiative ändern", async () => {
      const { f, kampfId } = await tisch([{ name: "A", initiative: 20 }]);
      const a = karte(await f.buehne.buehne(f.gm, f.campaign, kampfId) as KampfFuerLeitung, "A");
      await expect(f.buehne.lageSetzen(f.thorn.userId, f.campaign, kampfId, a.id, { lage: "hand", expectedVersion: 0 })).rejects.toBeInstanceOf(Gone);
      await expect(f.buehne.initiativeSetzen(f.thorn.userId, f.campaign, kampfId, a.id, { initiative: 1, initiativeRollId: null })).rejects.toBeInstanceOf(Gone);
    });

    it("schreibt für eine Karte in Voreinstellung keine Zeile", async () => {
      const { f, kampfId } = await tisch([{ name: "A", initiative: 20 }]);
      expect(karte(await f.buehne.buehne(f.gm, f.campaign, kampfId) as KampfFuerLeitung, "A").version).toBe(0);
      expect((await db.query("SELECT 1 FROM kampf_karten WHERE campaign_id=$1", [f.campaign])).rowCount).toBe(0);
    });
  });
});
