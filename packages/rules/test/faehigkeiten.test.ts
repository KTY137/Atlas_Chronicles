// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
/**
 * Fähigkeiten und Zustände in der Regel-Engine (Spec 2026-09-11-chronicleheroes-faehigkeiten).
 * Allgemein, nicht ChronicleHeroes-eigen: ein kleines eigenes Paket reicht, um jede Zusage zu prüfen.
 */
import { describe, expect, it } from "vitest";
import * as rules from "../src/index.ts";
import type { EvaluationContext } from "../src/index.ts";

const zahl = (label: string, minimum: number, maximum: number, standard = 0) => ({ type: "integer", label, default: standard, minimum, maximum });
const text = (label: string, maxLength: number) => ({ type: "string", label, default: "", maxLength });
const paket = (anpassen: (roh: Record<string, unknown>) => void = () => {}) => {
  const roh: Record<string, unknown> = {
    schemaVersion: 2, id: "de.test.faehigkeiten", name: "Fähigkeitsprobe", version: "1.0.0", engineVersion: "1.0.0", license: "BUSL-1.1", authors: ["Test"],
    fields: { athletik: zahl("Athletik", 0, 100), erfahrung: zahl("Erfahrung", 0, 99), faehigkeiten: text("Fähigkeiten", 512), zustaende: text("Zustände", 256) },
    layout: { sections: [{ id: "bogen", label: "Bogen", fields: ["athletik", "erfahrung", "faehigkeiten", "zustaende"] }] },
    actions: [
      { id: "probe_athletik", name: "Athletik", version: "1.0.0", expression: "1d100", disclosure: "Probe", requiresConfirmation: true,
        inputs: { einsatz: text("Einsatz", 128), mod_ziel: zahl("Erleichterung", -100, 100) },
        outcome: { bands: [{ id: "gelungen", label: "Gelungen", comparison: "lte", expression: "actor.athletik + input.mod_ziel", success: true }], fallback: { id: "misslungen", label: "Misslungen", success: false } } },
      { id: "schaden", name: "Schaden", version: "1.0.0", expression: "2 + input.mod_ergebnis", disclosure: "Schaden", requiresConfirmation: true,
        inputs: { einsatz: text("Einsatz", 128), mod_ergebnis: zahl("Zusatz", -50, 50) } },
    ],
    migrations: [],
    abilityRules: { abilityField: "faehigkeiten", conditionField: "zustaende", budget: "3 + actor.erfahrung" },
    abilities: [
      { id: "laeufer", name: "Läufer", group: "Körper", rank: 1, kind: "dauerhaft", cost: 0, price: 3, prerequisite: "actor.athletik >= 20", text: "+10 auf Athletik.",
        modifiers: [{ actions: ["probe_athletik"], target: "ziel", value: "10" }] },
      { id: "sprinter", name: "Sprinter", group: "Körper", rank: 2, kind: "einsatz", cost: 1, price: 5, requires: ["laeufer"], text: "+20 auf jede Probe.",
        modifiers: [{ actions: ["probe_*"], target: "ziel", value: "20" }] },
      { id: "wucht", name: "Wucht", group: "Körper", rank: 1, kind: "einsatz", cost: 1, price: 3, text: "Zehntel der Athletik als Zusatzschaden.",
        modifiers: [{ actions: ["schaden"], target: "ergebnis", value: "floor(actor.athletik / 10)" }] },
    ],
    conditions: [{ id: "erschoepft", name: "Erschöpft", text: "-10 auf jede Probe.", modifiers: [{ actions: ["probe_*"], target: "ziel", value: "-10" }] }],
  };
  anpassen(roh);
  return rules.parseSupportedRulePackage(JSON.stringify(roh));
};
const kontext = (actor: Record<string, string | number>, input: Record<string, string | number> = {}): EvaluationContext =>
  ({ seed: "00000001000000020000000300000004", actor: { athletik: 50, erfahrung: 0, faehigkeiten: "", zustaende: "", ...actor }, input, knowledge: { actorId: "held", passages: [] } });
type MitModifikatoren = { modifiers?: readonly { source: string; id: string; target: string; value: number }[]; context: EvaluationContext; outcome?: { comparisons: readonly { threshold: number }[] } };
const wurf = (pkg: rules.AnyRulePackage, aktion: string, ctx: EvaluationContext) => rules.evaluateSupportedAction(pkg, aktion, ctx) as unknown as MitModifikatoren;

describe("Wirkung am Wurf", () => {
  it("lässt eine gelernte dauerhafte Fähigkeit von selbst wirken und schreibt sie in die Quittung", () => {
    const ergebnis = wurf(paket(), "probe_athletik", kontext({ faehigkeiten: "laeufer" }));
    expect(ergebnis.modifiers).toEqual([{ source: "ability", id: "laeufer", target: "ziel", value: 10 }]);
    expect(ergebnis.context.input?.mod_ziel).toBe(10);
    expect(ergebnis.outcome!.comparisons[0]!.threshold).toBe(60);
  });

  it("setzt eine Einsatz-Fähigkeit nur ein, wenn sie beim Wurf gewählt ist", () => {
    const bogen = { faehigkeiten: "laeufer, sprinter", erfahrung: 5 };
    expect(wurf(paket(), "probe_athletik", kontext(bogen)).context.input?.mod_ziel).toBe(10);
    expect(wurf(paket(), "probe_athletik", kontext(bogen, { einsatz: "sprinter" })).context.input?.mod_ziel).toBe(30);
    expect(() => wurf(paket(), "probe_athletik", kontext({ faehigkeiten: "laeufer" }, { einsatz: "wucht" }))).toThrow(/einsatz/);
    expect(() => wurf(paket(), "probe_athletik", kontext({ faehigkeiten: "laeufer" }, { einsatz: "laeufer" }))).toThrow(/einsatz/);
  });

  it("rechnet aktive Zustände mit und trifft Aktionen über ein Präfix", () => {
    const ergebnis = wurf(paket(), "probe_athletik", kontext({ zustaende: "erschoepft" }));
    expect(ergebnis.modifiers).toEqual([{ source: "condition", id: "erschoepft", target: "ziel", value: -10 }]);
    expect(ergebnis.context.input?.mod_ziel).toBe(-10);
  });

  it("überschreibt einen von Hand übergebenen Modifikator und rechnet den Ergebnis-Zusatz", () => {
    expect(wurf(paket(), "probe_athletik", kontext({}, { mod_ziel: 90 })).context.input?.mod_ziel).toBe(0);
    const schaden = rules.evaluateSupportedAction(paket(), "schaden", kontext({ faehigkeiten: "wucht", athletik: 47 }, { einsatz: "wucht" }));
    expect(schaden.total).toBe(6);
  });

  it("bleibt nachrechenbar, und eine geänderte Wirkung entwertet die Quittung", () => {
    const pkg = paket(), ergebnis = rules.evaluateSupportedAction(pkg, "probe_athletik", kontext({ faehigkeiten: "laeufer" }));
    expect(rules.replaySupportedAction(pkg, ergebnis).valid).toBe(true);
    const anders = paket(roh => { ((roh.abilities as Record<string, unknown>[])[0]!.modifiers as Record<string, unknown>[])[0]!.value = "15"; });
    expect(rules.replaySupportedAction(anders, ergebnis).valid).toBe(false);
  });

  it("lässt Pakete ohne Fähigkeiten und ihre Quittungen unverändert", () => {
    const ohne = paket(roh => { delete roh.abilityRules; delete roh.abilities; delete roh.conditions; });
    expect("modifiers" in rules.evaluateSupportedAction(ohne, "schaden", kontext({}))).toBe(false);
  });
});

describe("Prüfung am Bogen", () => {
  it("weist unbekannte, doppelte, ungelernte Vorstufen, unerfüllte Voraussetzungen und ein überzogenes Budget zurück", () => {
    const pkg = paket();
    expect(() => rules.validatePackageFields(pkg, { faehigkeiten: "gibtsnicht" })).toThrow(/gibtsnicht/);
    expect(() => rules.validatePackageFields(pkg, { athletik: 50, faehigkeiten: "laeufer, laeufer" })).toThrow(/doppelt|duplicate/);
    expect(() => rules.validatePackageFields(pkg, { athletik: 50, erfahrung: 5, faehigkeiten: "sprinter" })).toThrow(/laeufer/);
    expect(() => rules.validatePackageFields(pkg, { athletik: 10, faehigkeiten: "laeufer" })).toThrow(/laeufer/);
    expect(() => rules.validatePackageFields(pkg, { athletik: 50, faehigkeiten: "laeufer, wucht" })).toThrow(/budget/i);
    expect(rules.validatePackageFields(pkg, { athletik: 50, erfahrung: 3, faehigkeiten: "laeufer, wucht" }).faehigkeiten).toBe("laeufer, wucht");
    expect(() => rules.validatePackageFields(pkg, { zustaende: "verflucht" })).toThrow(/verflucht/);
  });

  it("zeigt in der Übersicht, was gelernt, ausgegeben und jetzt lernbar ist", () => {
    const uebersicht = rules.abilityOverview(paket(), { athletik: 50, erfahrung: 5, faehigkeiten: "laeufer", zustaende: "erschoepft" });
    expect(uebersicht).toMatchObject({ learned: ["laeufer"], conditions: ["erschoepft"], spent: 3, budget: 8 });
    expect([...uebersicht.learnable].sort()).toEqual(["sprinter", "wucht"]);
    expect(rules.abilityOverview(paket(), { athletik: 10 }).learnable).toEqual(["wucht"]);
  });
});

describe("Prüfung des Pakets", () => {
  it("weist fehlerhafte Erklärungen zurück", () => {
    expect(() => paket(roh => { ((roh.abilities as Record<string, unknown>[])[2]!.modifiers as Record<string, unknown>[])[0]!.actions = ["probe_athletik"]; })).toThrow(/mod_ergebnis/);
    expect(() => paket(roh => { (roh.abilities as Record<string, unknown>[])[1]!.requires = ["unbekannt"]; })).toThrow(/unbekannt/);
    expect(() => paket(roh => { (roh.abilityRules as Record<string, unknown>).abilityField = "athletik"; })).toThrow(/abilityField/);
    expect(() => paket(roh => { ((roh.abilities as Record<string, unknown>[])[0]!.modifiers as Record<string, unknown>[])[0]!.value = "1d6"; })).toThrow(/dice/);
    expect(() => paket(roh => { (roh.abilities as Record<string, unknown>[])[0]!.rank = 4; })).toThrow(/rank/);
    expect(() => paket(roh => { (roh.abilities as Record<string, unknown>[])[0]!.geheim = true; })).toThrow();
  });
});
