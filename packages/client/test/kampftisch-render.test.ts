// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { KarteFuerRunde } from "@chronicle/protocol";
import { Kampfkarte } from "../src/features/Kampfkarte";
import { ansichtFuerLeitung, ansichtFuerRunde, type KartenAktionen, type KartenAnsicht } from "../src/features/kampftisch-model";
import { LEITUNGSKARTE, RUNDENKARTE } from "./kampftisch-beispiele";

// Die Karte zeichnet, was sie bekommt. Zwei Dinge muss sie trotzdem richtig machen: der Runde
// nichts zeigen, was nur die Spielleitung bedienen darf, und jeden Zustand als Wort sagen.
const nichts = () => undefined;
const aktionen: KartenAktionen = { lage: nichts, sicht: nichts, maske: nichts, initiative: nichts, loeschen: nichts, wert: nichts };
const zeige = (karte: KartenAnsicht, leitung: boolean) => renderToStaticMarkup(createElement(Kampfkarte,
  { karte, leitung, busy: false, aktionen, bildUrl: (id: string, v: number) => `/bild/${id}?v=${v}`, wurf: null }));

describe("Die Kampfkarte", () => {
  it("zeigt der Spielleitung Wert, Rundensicht, zweiten Namen und das Kartenmenü", () => {
    const html = zeige(ansichtFuerLeitung(LEITUNGSKARTE), true);
    expect(html).toContain("40 / 100");
    expect(html).toContain("Die Runde sieht: schwer angeschlagen");
    expect(html).toContain("Die Runde liest: „Vermummte Gestalt“");
    expect(html).toContain('aria-label="Was mit Graf Veyl geschehen soll"');
    expect(html).toContain("am Zug");
    expect(html).toContain("Blutend");
  });

  it("färbt einen Balken so, wie das Regelpaket es wählt — mit den Klassen der Vitalanzeige", () => {
    const mitFarbe = (farbe: string): KarteFuerRunde => ({ ...RUNDENKARTE, balken: RUNDENKARTE.balken.map(b => ({ ...b, farbe })) });
    const palette = zeige(ansichtFuerRunde(mitFarbe("teal")), false);
    expect(palette).toContain("mit-regelfarbe vitalwert-farbe-teal");
    expect(palette).not.toContain("data-farbe");
    const frei = zeige(ansichtFuerRunde(mitFarbe("#12ab34")), false);
    expect(frei).toContain("--vital-fill:#12ab34");
    expect(zeige(ansichtFuerRunde(RUNDENKARTE), false)).toContain('data-farbe="danger"');
  });

  it("zeigt der Runde nur das Wort, kein Menü und nie „Ohne Werte“", () => {
    const html = zeige(ansichtFuerRunde(RUNDENKARTE), false);
    expect(html).toContain("schwer angeschlagen");
    expect(html).not.toContain("/ 100");
    expect(html).not.toContain("geschehen soll");
    expect(html).not.toContain("Ohne Werte");
    expect(html).not.toContain("Die Runde sieht");
  });

  it("sagt den Füllstand ohne Zahl und stempelt umgelegte Karten mit Wort", () => {
    const karte: KarteFuerRunde = { ...RUNDENKARTE, lage: "umgelegt", balken: [{ id: "hp", label: "Lebenspunkte", art: "leben", anzeige: "fuellstand", zehntel: 6 }] };
    const html = zeige(ansichtFuerRunde(karte), false);
    expect(html).toContain('aria-valuetext="etwa 6 von 10"');
    expect(html).toContain("umgelegt");
    expect(html).not.toMatch(/\d+ \/ \d+/);
  });

  it("gibt der eigenen Figur eine Marke und einen Knopf für den Wert", () => {
    const eigene: KarteFuerRunde = { ...RUNDENKARTE, name: "Mira", eigene: true, actorId: "a9", bogenVersion: 2,
      balken: [{ id: "hp", label: "Lebenspunkte", art: "leben", anzeige: "genau", wert: 70, hoechst: 100 }] };
    const html = zeige(ansichtFuerRunde(eigene), false);
    expect(html).toContain("Deine Figur");
    expect(html).toContain('aria-label="Lebenspunkte ändern, jetzt 70 / 100"');
  });

  it("zeigt der Spielleitung eine Karte ohne Bogen als „Ohne Werte“ und eine Handkarte als verdeckt", () => {
    expect(zeige(ansichtFuerLeitung({ ...LEITUNGSKARTE, actorId: null, bogenVersion: null, balken: [] }), true)).toContain("Ohne Werte");
    const klein = renderToStaticMarkup(createElement(Kampfkarte, { karte: ansichtFuerLeitung({ ...LEITUNGSKARTE, lage: "hand", amZug: false }), leitung: true, klein: true,
      busy: false, aktionen, bildUrl: () => "", wurf: null }));
    expect(klein).toContain("verdeckt");
  });
});
