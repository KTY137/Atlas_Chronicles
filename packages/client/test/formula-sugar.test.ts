// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { describe, expect, it } from "vitest";
import { HOW_TO_BE_A_HERO_PACKAGE } from "@chronicle/rules";
import { analyzeFormula, completionsAt, desugarFormula, resugarFormula, type FormulaSources } from "../src/features/formula-sugar";

const sources: FormulaSources = { actor: [{ id: "geschick", label: "Geschick", type: "number" }, { id: "vertraut", label: "Vertraut", type: "boolean" }, { id: "erste-hilfe", label: "Erste Hilfe", type: "number" }], input: [{ id: "bonus", label: "Bonus", type: "number" }] };
const options = { allowDice: true, allowKnowledge: false };

describe("sugar keeps the stored expression canonical", () => {
  it.each([["1d20 + @geschick", "1d20 + actor.geschick"], ["?bonus * 2", "input.bonus * 2"], ['"@nicht" == @geschick', '"@nicht" == actor.geschick'], ["actor.geschick", "actor.geschick"]])("desugars %s", (text, canonical) => {
    expect(desugarFormula(text).canonical).toBe(canonical);
  });
  it("maps canonical positions back to the typed text", () => {
    const { canonical, map } = desugarFormula("1d20 + @geschick");
    expect(canonical.slice(7, 21)).toBe("actor.geschick"); expect(map[7]).toBe(7); expect(map[21]).toBe(16); expect(map[canonical.length]).toBe(16);
  });
  it.each([["actor.geschick + input.bonus", "@geschick + ?bonus"], ['"actor.x" + 1', '"actor.x" + 1'], ["min(actor.geschick, 3)", "min(@geschick, 3)"]])("resugars %s", (expression, text) => {
    expect(resugarFormula(expression)).toBe(text);
  });
  it("round-trips the HTBAH package expressions byte for byte", () => {
    for (const action of HOW_TO_BE_A_HERO_PACKAGE.actions) expect(desugarFormula(resugarFormula(action.expression)).canonical).toBe(action.expression);
    for (const value of HOW_TO_BE_A_HERO_PACKAGE.computed ?? []) expect(desugarFormula(resugarFormula(value.expression)).canonical).toBe(value.expression);
  });
});

describe("analysis explains in plain German with positions in the typed text", () => {
  it("highlights attributes, parameters, dice and functions", () => {
    const analysis = analyzeFormula("min(1d20, 3) + @geschick + ?bonus", sources, options);
    expect(analysis.ok).toBe(true); expect(analysis.canonical).toBe("min(1d20, 3) + actor.geschick + input.bonus");
    expect(analysis.spans.map(s => [s.kind, s.start, s.end])).toEqual([["function", 0, 3], ["paren", 3, 4], ["dice", 4, 8], ["operator", 8, 9], ["number", 10, 11], ["paren", 11, 12], ["operator", 13, 14], ["attribute", 15, 24], ["operator", 25, 26], ["parameter", 27, 33]]);
    expect(analysis.spans.find(s => s.kind === "attribute")?.title).toBe("Geschick");
  });
  it.each([
    ["1d20 + @gescick", "unknown-field", "Das Attribut „gescick“ gibt es nicht. Meintest du „geschick“?", 7, 15],
    ["(1 + 2", "expected", "Hier fehlt eine schließende Klammer.", 6, 6],
    ["1 +", "expected", "Nach dem Rechenzeichen fehlt noch ein Wert, zum Beispiel eine Zahl, ein Würfel oder ein Attribut.", 3, 3],
    ["borf(1)", "unsupported-function", "„borf“ kennt die Schmiede nicht. Erlaubt sind min, max, floor, ceil, round, abs und if.", 0, 4],
    ["min(1)", "argument-count", "„min“ braucht mindestens zwei Werte.", 0, 6],
    ["@vertraut + 1", "type", "Hier wird eine Zahl gebraucht, aber „Vertraut“ ist Ja/Nein.", 0, 9],
    ["1 + §", "invalid-token", "Dieses Zeichen gehört nicht in eine Formel.", 4, 5],
    ["?waffe.schaden", "object-path", "Werte von Gegenständen kommen mit einem späteren Schritt; heute gibt es nur Attribute und Parameter.", 0, 14],
    ["", "empty", "Trage eine Formel ein, zum Beispiel 1d20 + @geschick.", 0, 0],
  ])("explains %s", (text, code, message, start, end) => {
    const analysis = analyzeFormula(text, sources, options);
    expect(analysis.ok).toBe(false); expect(analysis.error).toEqual(expect.objectContaining({ code, message, start, end }));
  });
  it("forbids dice and knowledge where the caller says so", () => {
    expect(analyzeFormula("1d6 + 1", sources, { allowDice: false, allowKnowledge: false }).error).toMatchObject({ code: "dice-forbidden", start: 0, end: 3 });
    expect(analyzeFormula('haelt("x")', sources, { allowDice: true, allowKnowledge: false }).error).toMatchObject({ code: "knowledge-forbidden", start: 0, end: 5 });
    expect(analyzeFormula('haelt("x")', sources, { allowDice: true, allowKnowledge: true }).ok).toBe(true);
  });
  it("marks a reference to a removed attribute as missing", () => {
    expect(analyzeFormula("@weg", { actor: [], input: [] }, options).spans[0]).toMatchObject({ kind: "attribute", missing: true });
  });
});

describe("completion follows the caret", () => {
  it("offers attributes after @ filtered by label or id", () => {
    const completion = completionsAt("1 + @Ges", 8, sources, options)!;
    expect([completion.start, completion.end]).toEqual([4, 8]);
    expect(completion.items.map(i => i.insert)).toEqual(["@geschick"]);
    expect(completion.items[0]).toMatchObject({ title: "Geschick", detail: "geschick · Zahl", kind: "attribute" });
  });
  it("offers parameters after ? and explains when there are none", () => {
    expect(completionsAt("?", 1, sources, options)!.items.map(i => i.insert)).toEqual(["?bonus"]);
    const none = completionsAt("?", 1, { ...sources, input: [] }, options)!;
    expect(none.items).toEqual([{ kind: "note", insert: "", title: "Hier gibt es keine Parameter.", detail: "Parameter gibt es nur bei Aktionen, weil sie beim Würfeln abgefragt werden. Nutze Attribute mit @." }]);
  });
  it("skips hyphenated ids and says why", () => {
    const completion = completionsAt("@erste", 6, sources, options)!;
    expect(completion.items).toEqual([{ kind: "note", insert: "", title: "Erste Hilfe", detail: "Kennungen mit Bindestrich lassen sich in Formeln nicht verwenden. Benenne das Attribut um, zum Beispiel erste_hilfe." }]);
  });
  it("offers functions and dice while typing plain letters or after a d", () => {
    expect(completionsAt("mi", 2, sources, options)!.items.map(i => i.insert)).toEqual(["min("]);
    expect(completionsAt("m", 1, sources, options)!.items.map(i => i.insert)).toEqual(["min(", "max("]);
    expect(completionsAt("1d", 2, sources, options)!.items.map(i => i.insert)).toEqual(["1d20", "1d100", "1d6", "2d6", "2d20kh1", "2d20kl1", "1d6!3"]);
    expect(completionsAt("1d", 2, sources, { allowDice: false, allowKnowledge: false })).toBeNull();
    expect(completionsAt("1 + ", 4, sources, options)).toBeNull();
  });
});
