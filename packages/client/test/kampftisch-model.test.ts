// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { describe, expect, it } from "vitest";
import { KARTEN_LAGEN, type KampfFuerLeitung, type KampfFuerRunde, type KarteFuerLeitung } from "@chronicle/protocol";
import type { ActionCard } from "../src/features/game-api";
import { LAGE_WEGE, LAGE_WEG_LABEL, ansichtFuerLeitung, ansichtFuerRunde, balkenFarbe, initialen, juengsterInitiativwurf, nichtArchiviertAus, reihen, tischAnsicht, zielDes } from "../src/features/kampftisch-model";
import { LEITUNGSKARTE, RUNDENKARTE } from "./kampftisch-beispiele";

describe("Die Ansicht einer Karte", () => {
  it("zeigt der Spielleitung jeden Balken genau und hält ihre Einstellung daneben", () => {
    const ansicht = ansichtFuerLeitung(LEITUNGSKARTE);
    expect(ansicht.balken[0]!.anzeige).toEqual({ id: "hp", label: "Lebenspunkte", art: "leben", anzeige: "genau", wert: 40, hoechst: 100 });
    expect(ansicht.balken[0]!.leitung?.maske).toBe("worte");
    expect(ansicht.bearbeitbar).toEqual({ actorId: "a1", bogenVersion: 3 });
    expect(ansicht.roh).toBe(LEITUNGSKARTE);
  });

  it("lässt die Runde nur ihre eigene Figur bearbeiten und sagt nie „ohne Werte“", () => {
    expect(ansichtFuerRunde(RUNDENKARTE)).toMatchObject({ bearbeitbar: null, roh: null, ohneWerte: false });
    const eigene = ansichtFuerRunde({ ...RUNDENKARTE, eigene: true, actorId: "a9", bogenVersion: 2, balken: [] });
    expect(eigene).toMatchObject({ bearbeitbar: { actorId: "a9", bogenVersion: 2 }, ohneWerte: false });
  });
});

describe("Die Reihen auf dem Tisch", () => {
  it("stellt Gegner oben, Gefährten unten und lässt Hand und Ablage weg", () => {
    const karte = (id: string, seite: KarteFuerLeitung["seite"], lage: KarteFuerLeitung["lage"]) => ansichtFuerLeitung({ ...LEITUNGSKARTE, id, seite, lage });
    const ergebnis = reihen([karte("a", "gefaehrten", "feld"), karte("b", "gegner", "hand"), karte("c", "gegner", "umgelegt"), karte("d", "neutral", "ablage"), karte("e", "neutral", "feld")]);
    expect(ergebnis.map(r => [r.seite, r.karten.map(k => k.id)])).toEqual([["gegner", ["c"]], ["neutral", ["e"]], ["gefaehrten", ["a"]]]);
  });
});

describe("Die Wege einer Karte", () => {
  it("bietet aus jeder Lage einen beschrifteten Weg in jede andere erreichbare Lage, nie in dieselbe", () => {
    for (const lage of KARTEN_LAGEN) for (const weg of LAGE_WEGE[lage]) {
      expect(zielDes(weg)).not.toBe(lage);
      expect(LAGE_WEG_LABEL[weg].length).toBeGreaterThan(0);
    }
    expect(LAGE_WEGE.hand.map(zielDes)).toEqual(["feld", "ablage"]);
  });
});

describe("Kleinigkeiten", () => {
  it("färbt Leben rot und reiht andere Balken durch", () => {
    const b = (art: "leben" | "vorrat") => ({ anzeige: { id: "x", label: "X", art, anzeige: "worte" as const, stufe: "gut" as const }, leitung: null });
    expect(balkenFarbe(b("leben"), 0)).toBe("danger");
    expect([1, 2, 3, 4].map(stelle => balkenFarbe(b("vorrat"), stelle))).toEqual(["ok", "warning", "private", "info"]);
  });
  it("nimmt die Farbe aus dem Regelpaket, wenn sie gültig ist", () => {
    const b = (farbe: string) => ({ anzeige: { id: "x", label: "X", art: "leben" as const, farbe, anzeige: "worte" as const, stufe: "gut" as const }, leitung: null });
    expect(balkenFarbe(b("teal"), 0)).toBe("teal");
    expect(balkenFarbe(b("#12ab34"), 0)).toBe("#12ab34");
    expect(balkenFarbe(b("lila"), 0)).toBe("danger");
    expect(balkenFarbe(b("#FFF"), 0)).toBe("danger");
  });
  it("zählt, wer beim Aufräumen nicht ins Archiv ging", () => {
    expect(nichtArchiviertAus({ id: "k", aufraeumen: { archiviert: ["a"], nichtArchiviert: ["b", "c"] } })).toBe(2);
    expect(nichtArchiviertAus({ id: "k", aufraeumen: { archiviert: ["a"], nichtArchiviert: [] } })).toBe(0);
    expect(nichtArchiviertAus({ id: "k" })).toBe(0);
    expect(nichtArchiviertAus(null)).toBe(0);
  });
  it("bildet Initialen aus höchstens zwei Wörtern", () => {
    expect(initialen("Wolf 1")).toBe("W1");
    expect(initialen("graf von veyl")).toBe("GV");
  });
  it("findet den jüngsten Initiativwurf einer Figur", () => {
    const wurf = (id: string, actorId: string, aktion: string, preparedAt: number) => ({ id, actorId, preparedAt, receipt: { action: { id: aktion }, total: 7 } }) as unknown as ActionCard;
    const wuerfe = [wurf("alt", "a1", "initiative", 1), wurf("neu", "a1", "initiative", 5), wurf("fremd", "a2", "initiative", 9), wurf("probe", "a1", "klettern", 8)];
    expect(juengsterInitiativwurf(wuerfe, "a1")?.id).toBe("neu");
    expect(juengsterInitiativwurf(wuerfe, null)).toBeNull();
  });
});

describe("Die Vorschau „Mit den Augen der Runde“", () => {
  const kampfLeitung: KampfFuerLeitung = { id: "k1", name: "Hinterhalt", zustand: "laufend", runde: 1, erstelltAm: 0, beendetAm: null, leitung: true, teilnehmer: [LEITUNGSKARTE] };

  it("fällt bei einer noch nicht geladenen oder fehlgeschlagenen Vorschau NIE auf die Karten der Spielleitung zurück", () => {
    // Genau der Fall, den ein Ladezustand oder ein Fehler der Vorschau nicht zeigen darf: echte
    // Namen, Hand und genaue Werte unter dem Banner „So sieht die Runde …“.
    expect(tischAnsicht(kampfLeitung, true, null)).toEqual({ leitung: false, karten: [] });
  });

  it("zeigt mit geladener Vorschau die Sicht der Runde, nie die der Spielleitung", () => {
    const geladen: KampfFuerRunde = { id: "k1", name: "Hinterhalt", zustand: "laufend", runde: 1, erstelltAm: 0, beendetAm: null, teilnehmer: [RUNDENKARTE] };
    const { leitung, karten } = tischAnsicht(kampfLeitung, true, geladen);
    expect(leitung).toBe(false);
    expect(karten).toHaveLength(1);
    expect(karten[0]!.roh).toBeNull();
  });

  it("zeigt ohne Vorschau die Sicht der Spielleitung", () => {
    const { leitung, karten } = tischAnsicht(kampfLeitung, false, null);
    expect(leitung).toBe(true);
    expect(karten[0]!.roh).toBe(LEITUNGSKARTE);
  });
});
