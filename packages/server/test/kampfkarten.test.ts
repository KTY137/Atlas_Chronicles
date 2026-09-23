// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { KampfFuerLeitung, KampfFuerRunde } from "@chronicle/protocol";
import { createTestDb, migrate, type Db } from "../src/db/index.ts";
import { Conflict, Gone } from "../src/domain/errors.ts";
import { createActorPortraits } from "../src/domain/actor-portrait.ts";
import { kampfFixture, PNG_BASE64, kampfCfg } from "./kampf-fixture.ts";

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

  describe("Was die Runde sieht", () => {
    /** Mira (15) und Thorn (11) als Gefährten, ein Wolf (12) auf dem Feld, ein Späher (9) verdeckt in der Hand. */
    async function tischMitGegner() {
      const f = await kampfFixture(db);
      const kampf = await f.buehne.anlegen(f.gm, f.campaign, { name: "Sicht" });
      const wolf = await f.gegner("Wolf"), spaeher = await f.gegner("Späher");
      await f.buehne.teilnehmerHinzufuegen(f.gm, f.campaign, kampf.id, { name: "Mira", seite: "gefaehrten", initiative: 15, actorId: f.mira.actorId });
      await f.buehne.teilnehmerHinzufuegen(f.gm, f.campaign, kampf.id, { name: "Thorn", seite: "gefaehrten", initiative: 11, actorId: f.thorn.actorId });
      await f.buehne.teilnehmerHinzufuegen(f.gm, f.campaign, kampf.id, { name: "Wolf", seite: "gegner", initiative: 12, actorId: wolf });
      await f.buehne.teilnehmerHinzufuegen(f.gm, f.campaign, kampf.id, { name: "Späher", seite: "gegner", initiative: 9, actorId: spaeher, lage: "hand" });
      return { f, kampfId: kampf.id, wolf, spaeher };
    }
    const leitungsSicht = async (f: Awaited<ReturnType<typeof kampfFixture>>, kampfId: string) => await f.buehne.buehne(f.gm, f.campaign, kampfId) as KampfFuerLeitung;
    const rundenSicht = async (f: Awaited<ReturnType<typeof kampfFixture>>, userId: string, kampfId: string) => await f.buehne.buehne(userId, f.campaign, kampfId) as KampfFuerRunde;
    const von = <K extends { readonly name: string }>(kampf: { readonly teilnehmer: readonly K[] }, name: string): K => kampf.teilnehmer.find(k => k.name === name)!;

    it("lässt Handkarten, Ordnung und Einstellungen aus der Nutzlast der Spielenden", async () => {
      const { f, kampfId } = await tischMitGegner();
      const mira = await rundenSicht(f, f.mira.userId, kampfId);
      expect(Object.keys(mira).sort()).toEqual(["beendetAm", "erstelltAm", "id", "name", "runde", "teilnehmer", "zustand"]);
      expect(namen(mira)).toEqual(["Mira", "Wolf", "Thorn"]);
      expect(Object.keys(von(mira, "Wolf")).sort()).toEqual(["amZug", "balken", "bild", "eigene", "gewuerfelt", "id", "initiative", "lage", "name", "seite", "zustaende"]);
      expect(JSON.stringify(mira)).not.toContain("Späher");
    });

    it("zeigt Gegner in Worten, die eigene Figur genau und fremde Gefährten nach Einstellung", async () => {
      const { f, kampfId } = await tischMitGegner();
      const mira = await rundenSicht(f, f.mira.userId, kampfId);
      expect(von(mira, "Wolf").balken).toEqual([{ id: "hp", label: "Lebenspunkte", art: "leben", anzeige: "worte", stufe: "knapp" }]);
      expect(von(mira, "Mira")).toMatchObject({ eigene: true, actorId: f.mira.actorId, balken: [{ anzeige: "genau", wert: 70, hoechst: 100 }] });
      expect(von(mira, "Thorn").balken[0]).toMatchObject({ anzeige: "genau" });
      // Die Spielleitung verbirgt Thorns Werte vor der Runde; Thorns eigener Spieler sieht sie weiter.
      const thorn = von(await leitungsSicht(f, kampfId), "Thorn");
      await f.buehne.sichtSetzen(f.gm, f.campaign, kampfId, thorn.id, { sicht: { ...thorn.sicht, standard: "verborgen" }, nameFuerRunde: null, expectedVersion: thorn.version });
      expect(von(await rundenSicht(f, f.mira.userId, kampfId), "Thorn").balken).toEqual([]);
      expect(von(await rundenSicht(f, f.thorn.userId, kampfId), "Thorn").balken[0]).toMatchObject({ anzeige: "genau" });
      // Und die Spielleitung liest an jedem Balken mit, was die Runde bekommt.
      expect(von(await leitungsSicht(f, kampfId), "Wolf").balken[0]).toMatchObject({ wert: 40, maske: "worte", fuerRunde: { stufe: "knapp" } });
    });

    it("ersetzt den Namen, versteckt Bild und Zustände und zeigt der Spielleitung dasselbe als Vorschau", async () => {
      const { f, kampfId } = await tischMitGegner();
      const wolf = von(await leitungsSicht(f, kampfId), "Wolf");
      await f.buehne.sichtSetzen(f.gm, f.campaign, kampfId, wolf.id, {
        sicht: { ...wolf.sicht, balken: { hp: "fuellstand" }, bild: false, zustaende: false }, nameFuerRunde: "Schatten im Gebüsch", expectedVersion: wolf.version });
      const mira = await rundenSicht(f, f.mira.userId, kampfId);
      expect(von(mira, "Schatten im Gebüsch")).toMatchObject({ bild: null, zustaende: [], balken: [{ anzeige: "fuellstand", zehntel: 4 }] });
      expect(JSON.stringify(mira)).not.toContain("Wolf");
      const vorschau = await f.buehne.alsRunde(f.gm, f.campaign, kampfId);
      expect(namen(vorschau)).toEqual(["Mira", "Schatten im Gebüsch", "Thorn"]);
      expect(vorschau.teilnehmer.every(k => !k.eigene)).toBe(true);
      await expect(f.buehne.alsRunde(f.mira.userId, f.campaign, kampfId)).rejects.toBeInstanceOf(Gone);
    });

    it("zeigt dem Spieler seine eigene Figur mit echtem Namen, auch wenn die Spielleitung sie verkleidet", async () => {
      const { f, kampfId } = await tischMitGegner();
      const m = von(await leitungsSicht(f, kampfId), "Mira");
      await f.buehne.sichtSetzen(f.gm, f.campaign, kampfId, m.id, { sicht: { ...m.sicht, standard: "verborgen" }, nameFuerRunde: "Die Fremde", expectedVersion: m.version });
      expect(von(await rundenSicht(f, f.mira.userId, kampfId), "Mira")).toMatchObject({ eigene: true, balken: [{ anzeige: "genau", wert: 70 }] });
      const thorn = await rundenSicht(f, f.thorn.userId, kampfId);
      expect(namen(thorn)).toContain("Die Fremde");
      expect(von(thorn, "Die Fremde").balken).toEqual([]);
    });

    it("weist eine Sicht mit altem Stand ab und lässt Spielende keine Sicht setzen", async () => {
      const { f, kampfId } = await tischMitGegner();
      const wolf = von(await leitungsSicht(f, kampfId), "Wolf");
      await f.buehne.sichtSetzen(f.gm, f.campaign, kampfId, wolf.id, { sicht: wolf.sicht, nameFuerRunde: "A", expectedVersion: wolf.version });
      await expect(f.buehne.sichtSetzen(f.gm, f.campaign, kampfId, wolf.id, { sicht: wolf.sicht, nameFuerRunde: "B", expectedVersion: wolf.version })).rejects.toBeInstanceOf(Conflict);
      await expect(f.buehne.sichtSetzen(f.mira.userId, f.campaign, kampfId, wolf.id, { sicht: wolf.sicht, nameFuerRunde: null, expectedVersion: wolf.version + 1 })).rejects.toBeInstanceOf(Gone);
    });

    it("zeigt in beendeten Kämpfen keine Balken", async () => {
      const { f, kampfId } = await tischMitGegner();
      await f.buehne.eroeffnen(f.gm, f.campaign, kampfId); await f.buehne.beenden(f.gm, f.campaign, kampfId);
      const balkenZahl = (k: { readonly teilnehmer: readonly { readonly balken: readonly unknown[] }[] }) => k.teilnehmer.map(t => t.balken.length);
      expect(balkenZahl(await leitungsSicht(f, kampfId)).every(n => n === 0)).toBe(true);
      expect(balkenZahl(await rundenSicht(f, f.mira.userId, kampfId)).every(n => n === 0)).toBe(true);
    });

    it("zeigt eine Gegnerfigur, die mitten im Kampf ins Archiv ging, weiter mit ihren Werten", async () => {
      const { f, kampfId, wolf } = await tischMitGegner();
      const figur = await f.actors.getActor(f.gm, f.campaign, wolf);
      await f.actors.archiveActor(f.gm, f.campaign, wolf, { commandId: randomUUID(), expectedVersion: figur.version!, reason: "Aus der Liste geräumt" });
      expect(von(await leitungsSicht(f, kampfId), "Wolf").balken[0]).toMatchObject({ wert: 40 });
    });

    it("liefert Bilder nur für Karten, die der Betrachter sehen darf", async () => {
      const { f, kampfId, wolf, spaeher } = await tischMitGegner();
      const bilder = createActorPortraits(db, kampfCfg), png = Buffer.from(PNG_BASE64, "base64");
      await bilder.upload(f.gm, f.campaign, wolf, 0, png); await bilder.upload(f.gm, f.campaign, spaeher, 0, png);
      const gm = await leitungsSicht(f, kampfId), w = von(gm, "Wolf"), s = von(gm, "Späher");
      expect(w.bild).toEqual({ version: 1 });
      expect((await f.buehne.bild(f.mira.userId, f.campaign, kampfId, w.id)).data.equals(png)).toBe(true);
      await expect(f.buehne.bild(f.mira.userId, f.campaign, kampfId, s.id)).rejects.toBeInstanceOf(Gone);
      expect((await f.buehne.bild(f.gm, f.campaign, kampfId, s.id)).mime).toBe("image/png");
      await f.buehne.sichtSetzen(f.gm, f.campaign, kampfId, w.id, { sicht: { ...w.sicht, bild: false }, nameFuerRunde: null, expectedVersion: w.version });
      await expect(f.buehne.bild(f.mira.userId, f.campaign, kampfId, w.id)).rejects.toBeInstanceOf(Gone);
    });

    it("meldet der Spielleitung aufgebrauchtes Leben, entscheidet aber nichts", async () => {
      const { f, kampfId, wolf } = await tischMitGegner();
      const bogen = await f.game.getSheet(f.gm, f.campaign, wolf);
      await f.game.updateSheet(f.gm, f.campaign, { actorId: wolf, expectedVersion: bogen.version, fields: { ...bogen.fields, hp: 0 } });
      expect(von(await leitungsSicht(f, kampfId), "Wolf")).toMatchObject({ aufgebraucht: true, lage: "feld" });
    });
  });
});
