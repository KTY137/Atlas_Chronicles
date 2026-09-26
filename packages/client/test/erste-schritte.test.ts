// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { describe, expect, it } from "vitest";
import { alleErledigt, ersteSchritte } from "../src/features/erste-schritte";

// E14: Die Checkliste „So startet deine Runde“ hakt sich aus dem echten Stand ab.
const frisch = { regelwerkAktiv: true, vorlagen: 0, freigegebeneVorlagen: 0, mitspieler: 0, figuren: 0, offeneAntraege: 0 };

describe("Erste Schritte der Runde", () => {
  it("hakt in einer frischen Runde mit Chronicles Lite nur das Regelwerk ab", () => {
    const schritte = ersteSchritte(frisch);
    expect(schritte.map(schritt => schritt.id)).toEqual(["regelwerk", "vorlage", "einladen", "figuren"]);
    expect(schritte.filter(schritt => schritt.erledigt).map(schritt => schritt.id)).toEqual(["regelwerk"]);
    expect(alleErledigt(schritte)).toBe(false);
  });

  it("lässt die Figuren offen, solange Anträge warten, und sagt wie viele", () => {
    const figuren = ersteSchritte({ ...frisch, figuren: 3, offeneAntraege: 2 }).find(schritt => schritt.id === "figuren")!;
    expect(figuren.erledigt).toBe(false);
    expect(figuren.hinweis).toBe("2 Anträge warten");
    expect(ersteSchritte({ ...frisch, offeneAntraege: 1 }).find(schritt => schritt.id === "figuren")!.hinweis).toBe("Ein Antrag wartet");
  });

  it("hakt eine Vorlage erst ab, wenn Mitspieler sie beantragen können, und sagt, was fehlt", () => {
    const vorlage = ersteSchritte({ ...frisch, vorlagen: 2, freigegebeneVorlagen: 0 }).find(schritt => schritt.id === "vorlage")!;
    expect(vorlage.erledigt).toBe(false);
    expect(vorlage.hinweis).toBe("Gib eine Vorlage für Mitspieler frei, damit sie Figuren beantragen können.");
    expect(ersteSchritte(frisch).find(schritt => schritt.id === "vorlage")!.hinweis).toBeUndefined();
  });

  it("ist startklar, wenn alles erledigt ist", () => {
    const schritte = ersteSchritte({ regelwerkAktiv: true, vorlagen: 1, freigegebeneVorlagen: 1, mitspieler: 2, figuren: 1, offeneAntraege: 0 });
    expect(schritte.every(schritt => schritt.erledigt)).toBe(true);
    expect(alleErledigt(schritte)).toBe(true);
  });

  it("zeigt beim Laden oder bei einem Fehler keine Haken statt einer Fehlerwand", () => {
    const schritte = ersteSchritte({ regelwerkAktiv: null, vorlagen: null, freigegebeneVorlagen: null, mitspieler: null, figuren: null, offeneAntraege: null });
    expect(schritte).toHaveLength(4);
    expect(schritte.some(schritt => schritt.erledigt)).toBe(false);
    expect(schritte.some(schritt => schritt.hinweis)).toBe(false);
  });

  it("wertet einen einzeln fehlenden Zähler als offen, ohne die übrigen zu verlieren", () => {
    const schritte = ersteSchritte({ ...frisch, vorlagen: 2, freigegebeneVorlagen: 1, mitspieler: null });
    expect(schritte.find(schritt => schritt.id === "vorlage")!.erledigt).toBe(true);
    expect(schritte.find(schritt => schritt.id === "einladen")!.erledigt).toBe(false);
  });
});
