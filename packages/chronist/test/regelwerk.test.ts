// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { describe, expect, it } from "vitest";
import { pruefeChronik, type Zeitereignis } from "../src/index.ts";

// Das Regelwerk des Chronisten meldet NUR, was sicher falsch ist. Ein Fehlalarm ist bei einem
// Pruefwerkzeug teurer als ein uebersehener Fall — deshalb steht in dieser Datei mindestens so
// viel darueber, was NICHT gemeldet wird, wie darueber, was gemeldet wird.

let laufend = 0;
const ereignis = (art: string, jahr: number | null, entryId: string, titel: string, extra: Partial<Zeitereignis> = {}): Zeitereignis => ({
  id: `e${++laufend}`, art, jahr, genau: true, roh: jahr === null ? "" : String(jahr),
  entryId, titel, passageId: `p${laufend}`, ...extra,
});

describe("Das Regelwerk des Chronisten", () => {
  it("findet einen Tod vor der Geburt und nennt seine Belege", () => {
    const befunde = pruefeChronik([
      ereignis("geburt", 812, "e1", "Mara von Eron"),
      ereignis("tod", 799, "e1", "Mara von Eron"),
    ]);
    expect(befunde).toHaveLength(1);
    expect(befunde[0]).toMatchObject({ art: "tod_vor_geburt", titel: "Mara von Eron" });
    expect(befunde[0]!.text).toContain("799");
    // Ein Vorschlag ohne Beleg waere eine Behauptung: beide Passagen stehen dabei.
    expect(befunde[0]!.passagen).toHaveLength(2);
  });

  it("meldet zwei verschiedene Jahre für dieselbe Aussage", () => {
    const befunde = pruefeChronik([
      ereignis("gruendung", 412, "e2", "Eron"),
      ereignis("gruendung", 417, "e2", "Eron"),
    ]);
    expect(befunde).toHaveLength(1);
    expect(befunde[0]).toMatchObject({ art: "widerspruechliche_jahre" });
    expect(befunde[0]!.text).toContain("412 und 417");
  });

  it("hält ein ungenaues Jahr für keinen Widerspruch", () => {
    // „um 812" und „812" sind dieselbe Aussage in zwei Schaerfen, nicht zwei Aussagen. Und ein
    // ungefaehrer Vergleich waere selbst ungefaehr — ein ungefaehrer Widerspruch ist keiner.
    expect(pruefeChronik([
      ereignis("gruendung", 412, "e3", "Kalt"),
      ereignis("gruendung", 417, "e3", "Kalt", { genau: false, roh: "um 417" }),
    ])).toEqual([]);
    expect(pruefeChronik([
      ereignis("geburt", 812, "e4", "Halm", { genau: false, roh: "um 812" }),
      ereignis("tod", 799, "e4", "Halm"),
    ])).toEqual([]);
  });

  it("meldet ein Datumsfeld, das kein Jahr hergibt — samt seinem Rohtext", () => {
    const befunde = pruefeChronik([], [
      ereignis("tod", null, "e5", "Der Wehrmeister", { roh: "im Winter nach dem Fall" }),
    ]);
    expect(befunde).toHaveLength(1);
    expect(befunde[0]).toMatchObject({ art: "unlesbares_datum", titel: "Der Wehrmeister" });
    // Der Rohtext gehoert dazu: wer ihn liest, sieht sofort, ob es ein Tippfehler ist.
    expect(befunde[0]!.text).toContain("im Winter nach dem Fall");
  });

  it("faellt kein Urteil über eine erfundene Welt", () => {
    // „Ein Jahrhundert ohne Ereignis" waere ein Urteil, kein Widerspruch — und ein
    // Pruefwerkzeug, das Urteile faellt, wird abgeschaltet.
    const weit = pruefeChronik([
      ereignis("datum", 100, "e6", "Erste Chronik"),
      ereignis("datum", 900, "e7", "Zweite Chronik"),
    ]);
    expect(weit).toEqual([]);
  });

  it("lässt eine widerspruchsfreie Chronik in Ruhe", () => {
    expect(pruefeChronik([
      ereignis("geburt", 780, "e8", "Sera"),
      ereignis("tod", 831, "e8", "Sera"),
      ereignis("gruendung", 412, "e9", "Eron"),
      // Eine Praegung traegt keine Jahresaussage dieser Art und wird nicht verglichen.
      ereignis("praegung", 500, "e9", "Eron"),
    ])).toEqual([]);
  });

  it("ordnet die Befunde nach Titel, damit dieselbe Chronik dieselbe Liste ergibt", () => {
    const befunde = pruefeChronik([
      ereignis("gruendung", 1, "z", "Zunder"), ereignis("gruendung", 2, "z", "Zunder"),
      ereignis("gruendung", 3, "a", "Amulett"), ereignis("gruendung", 4, "a", "Amulett"),
    ]);
    expect(befunde.map(b => b.titel)).toEqual(["Amulett", "Zunder"]);
  });

  it("bleibt bei einer leeren Chronik still", () => {
    expect(pruefeChronik([], [])).toEqual([]);
  });
});
