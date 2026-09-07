// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DEMO_RULE_PACKAGE, parseSupportedRulePackage, type AnyRulePackage, type Scalar } from "@chronicle/rules";
import { Vitalanzeige } from "../src/features/Vitalanzeige";

// Leben, Mana und Ausdauer sind keine erfundenen Begriffe der Oberflaeche: sie stehen im
// Regelpaket. Diese Datei prueft, dass die Anzeige liest, was dort AUSGEWIESEN ist — und nichts
// dazuerfindet.

const zahl = (label: string, max: number) => ({ type: "integer" as const, label, minimum: 0, maximum: max, default: max });
const mitVitalwerten = (vitals: readonly { id: string; label: string; max: string; depletion: "defeat" | "none" }[]): AnyRulePackage =>
  parseSupportedRulePackage({
    ...DEMO_RULE_PACKAGE, schemaVersion: 2,
    fields: { ...DEMO_RULE_PACKAGE.fields, leben: zahl("Leben", 100), mana: zahl("Mana", 50), ausdauer: zahl("Ausdauer", 30) },
    vitals,
  });
const drei = mitVitalwerten([
  { id: "leben", label: "Leben", max: "100", depletion: "defeat" },
  { id: "mana", label: "Mana", max: "50", depletion: "none" },
  { id: "ausdauer", label: "Ausdauer", max: "actor.vigour * 5", depletion: "none" },
]);
const zeige = (pkg: AnyRulePackage, fields: Record<string, Scalar>) =>
  renderToStaticMarkup(createElement(Vitalanzeige, { pkg, fields }));
const werte = (overrides: Record<string, Scalar> = {}) =>
  ({ name: "Sera", insight: 2, vigour: 6, leben: 100, mana: 50, ausdauer: 30, ...overrides });

describe("Die Vitalanzeige", () => {
  it("zeigt genau die Werte, die das Paket ausweist", () => {
    const html = zeige(drei, werte({ leben: 37, mana: 12 }));
    for (const label of ["Leben", "Mana", "Ausdauer"]) expect(html).toContain(label);
    // Die Zahl steht immer da — der Balken illustriert, er behauptet nicht.
    expect(html).toContain("37 / 100");
    expect(html).toContain("12 / 50");
  });

  it("rechnet den Höchststand aus dem Ausdruck des Pakets", () => {
    // `actor.vigour * 5` mit vigour 6 ergibt 30 — und mit 4 eben 20. Ein fest verdrahteter
    // Höchstwert waere genau die zweite Wahrheit, die beim ersten Ausdruck auseinanderliefe.
    expect(zeige(drei, werte({ vigour: 6, insight: 2, ausdauer: 30 }))).toContain("30 / 30");
    expect(zeige(drei, werte({ vigour: 4, insight: 2, ausdauer: 20 }))).toContain("20 / 20");
  });

  it("zeigt gar nichts, wenn das Paket keine Vitalwerte kennt", () => {
    // Kein leeres Geruest: ein Paket ohne Deklaration hat keine Balken, und das ist zulaessig.
    expect(zeige(DEMO_RULE_PACKAGE, { name: "Sera", insight: 2, vigour: 6 })).toBe("");
    expect(zeige(mitVitalwerten([]), werte())).toBe("");
  });

  it("nennt Erschöpfung beim Wort und unterscheidet ihre Folge", () => {
    const html = zeige(drei, werte({ leben: 0, mana: 0 }));
    // Ein leerer Balken allein saehe bei beiden gleich aus. Was Niederlage bedeutet, hat das
    // Paket erklaert — und wer es liest, soll es lesen koennen.
    expect(html).toContain("Niederlage bestätigen");
    expect(html).toContain("Aufgebraucht.");
    expect(html).toContain("erschoepft");
  });

  it("bleibt bei einem Wert über dem Höchststand ehrlich", () => {
    // Der Balken laeuft voll, die Zahl bleibt, wie sie ist.
    const html = zeige(drei, werte({ leben: 100, mana: 50 }));
    expect(html).toContain("100 / 100");
    expect(html).toContain("inline-size:100%");
  });

  it("füllt fehlende Felder mit den Voreinstellungen des Pakets", () => {
    // Gemessen, nicht angenommen: ein Bogen ohne Werte ist kein Fehler — die Feldprüfung setzt
    // die Voreinstellungen ein, und die Balken stehen auf voll.
    const html = zeige(drei, { name: "Sera" } as Record<string, Scalar>);
    expect(html).toContain("100 / 100");
    expect(html).toContain("50 / 50");
  });

  it("bricht nicht an einem Bogen, der gerade ungültig ist", () => {
    // Mitten im Bearbeiten kann ein Wert ausserhalb seines Bereichs liegen. Dann gibt es eben
    // keine Balken — keine Fehlermeldung an einer Stelle, die nur illustriert.
    expect(zeige(drei, werte({ leben: 999 }))).toBe("");
  });
});
