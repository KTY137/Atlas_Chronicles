// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
/**
 * Der Bogen liest sich wie ein Bogen (Plan 2026-09-26 „Zugänglich und schön“, Aufgabe 4, Spec E3/E15):
 * Wertkacheln mit − und +, der Bereich leise, keine Formularsprache, Fähigkeiten als Karten, Balken
 * zuerst nur bei alten Paketen — und die Teilung „Wer ist die Figur / Was kann sie“ für den geführten Weg.
 */
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import * as rules from "@chronicle/rules";
import type { AnyRulePackage, FieldSchema, Scalar } from "@chronicle/rules";
import { RuleFields } from "../src/features/RuleFields";
import { RulePresentationView } from "../src/features/RulePresentationView";
import { HostRuleFields } from "../src/features/HostRuleFields";
import { fieldPart, stepValue, unknownListEntries } from "../src/features/rule-fields-model";
import type { HostRuleEditorState } from "../src/features/useHostRules";

const staerke: FieldSchema = { type: "integer", label: "Stärke", minimum: 0, maximum: 50, default: 10 };
const felder = (fields: Record<string, FieldSchema>, values: Record<string, Scalar>, extra: Record<string, unknown> = {}) =>
  renderToStaticMarkup(createElement(RuleFields, { fields, values, onChange() {}, ...extra }));

/** Alle öffnenden Tags eines Elements, samt ihrer Attribute. */
const tags = (html: string, name: string) => [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, "g"))].map(match => match[0]);
/** HTML-Attributnamen sind unabhängig von Groß- und Kleinschreibung; React schreibt etwa `inputMode`. */
const attr = (tag: string, name: string) => new RegExp(`\\s${name}="([^"]*)"`, "i").exec(tag)?.[1];
const buttons = (html: string) => [...html.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)].map(match => ({ tag: `<button${match[1]}>`, text: match[2]!, name: attr(`<button${match[1]}>`, "aria-label") ?? match[2]!, disabled: /\sdisabled=""/.test(match[1]!) }));
const idOf = (html: string, className: string, text: string) => new RegExp(`<[a-z]+ id="([^"]+)" class="${className}">${text}<`).exec(html)?.[1];

const hostState = (pkg: AnyRulePackage, values: Record<string, Scalar>) => {
  const manifest = rules.buildRuleRuntime(pkg), preview = rules.previewRuleRuntime(pkg, values);
  return { manifest, values, preview, error: "", pending: false, canSave: preview.valid, reload() {} } as unknown as HostRuleEditorState;
};
const host = (pkg: AnyRulePackage, values: Record<string, Scalar>, extra: Record<string, unknown> = {}) =>
  renderToStaticMarkup(createElement(HostRuleFields, { state: hostState(pkg, values), onChange() {}, ...extra }));

const lite = rules.CHRONICLES_LITE_PACKAGE, liteRuntime = rules.buildRuleRuntime(lite);
const litePreview = rules.previewRuleRuntime(lite, liteRuntime.defaults);
const liteView = (extra: Record<string, unknown> = {}) =>
  renderToStaticMarkup(createElement(RulePresentationView, { runtime: liteRuntime, preview: litePreview, values: liteRuntime.defaults, onChange() {}, ...extra }));
const heroes = rules.CHRONICLE_HEROES_PACKAGE, heroesValues = { ...rules.CHRONICLE_EXAMPLE_CHARACTERS[0]!.fields };

describe("Wertkachel statt Formularzeile", () => {
  it("schreibt keine Formularsprache und zeigt den Bereich leise", () => {
    const html = felder({ staerke }, { staerke: 10 });
    expect(html).not.toMatch(/Pflichtfeld|optional/);
    expect(html).toMatch(/class="rule-field-range"[^>]*>0–50</);
    const hint = idOf(html, "sr-only", "Wert von 0 bis 50");
    expect(hint, "ausführliche Beschreibung nur für Bildschirmleser").toBeDefined();
    const input = tags(html, "input").find(tag => attr(tag, "type") === "number")!;
    expect(attr(input, "aria-describedby")!.split(" ")).toContain(hint);
    expect(attr(input, "inputmode")).toBe("numeric");
  });

  it("schreibt große und negative Grenzen lesbar", () => {
    const html = felder({ anpassung: { type: "integer", label: "Anpassung", minimum: -360, maximum: 1000000, default: 0 } }, {});
    expect(html).toContain(">−360–1.000.000<");
    expect(html).toContain("Wert von −360 bis 1.000.000");
  });

  it("gibt jedem Zahlenfeld − und + mit sprechendem Namen", () => {
    const names = buttons(felder({ staerke }, { staerke: 10 })).map(button => button.name);
    expect(names).toEqual(["Stärke um eins senken", "Stärke um eins erhöhen"]);
  });

  it("sperrt + am Höchstwert und − am Mindestwert und nennt den Grund im Namen", () => {
    const oben = buttons(felder({ staerke }, { staerke: 50 }));
    expect(oben[1]!.disabled).toBe(true);
    expect(oben[1]!.name).toMatch(/^Stärke um eins erhöhen/);
    expect(oben[1]!.name).toContain("50");
    expect(oben[0]!.disabled).toBe(false);
    const unten = buttons(felder({ staerke }, { staerke: 0 }));
    expect(unten[0]!.disabled).toBe(true);
    expect(unten[0]!.name).toMatch(/^Stärke um eins senken/);
    expect(unten[1]!.disabled).toBe(false);
  });

  it("lässt ein geleertes Zahlenfeld bearbeitbar, sagt schlicht was fehlt und zählt vom Mindestwert", () => {
    const html = felder({ staerke }, { staerke: "" });
    expect(html).toContain("Bitte eine Zahl eingeben.");
    const input = tags(html, "input").find(tag => attr(tag, "type") === "number")!;
    expect(attr(input, "value")).toBe("");
    expect(input).not.toMatch(/\sdisabled=""/);
    expect(buttons(html).map(button => button.disabled)).toEqual([false, false]);
    expect(stepValue(staerke, "", 1)).toBe(0);
    expect(stepValue(staerke, "", -1)).toBe(0);
  });

  it("zeigt Ja/Nein als Schalterzeile", () => {
    const html = felder({ kritisch: { type: "boolean", label: "Kritischer Angriff", default: false } }, {});
    expect(html).toMatch(/<label class="rule-field-toggle"[^>]*>(?:(?!<\/label>)[\s\S])*<input[^>]*type="checkbox"/);
  });

  it("zeigt die Zeichengrenze erst ab 80 Prozent Füllung", () => {
    const notiz: FieldSchema = { type: "string", label: "Notiz", maxLength: 10, default: "" };
    expect(felder({ notiz }, { notiz: "abcdefgh" })).toContain("8 / 10");
    expect(felder({ notiz }, { notiz: "abcdefg" })).not.toContain("/ 10");
  });

  it("lässt die Regelschmiede mit layout=form beim alten Formular", () => {
    const html = felder({ staerke, notiz: { type: "string", label: "Notiz", maxLength: 10, default: "" } }, { staerke: 10 }, { layout: "form" });
    expect(html).toContain("Pflichtfeld");
    expect(html).toContain("optional");
    expect(html).toContain("Ganzzahl von 0 bis 50, z. B. 10");
    expect(html).not.toContain("rule-field-tile");
    expect(buttons(html)).toHaveLength(0);
  });
});

describe("Schrittweite des Steppers", () => {
  const eng: FieldSchema = { type: "integer", label: "x", minimum: 0, maximum: 5, default: 1 };
  it("bleibt im Bereich und sagt null, wo kein Schritt mehr geht", () => {
    expect(stepValue(eng, 5, 1)).toBeNull();
    expect(stepValue(eng, 0, -1)).toBeNull();
    expect(stepValue(eng, "", 1)).toBe(0);
    expect(stepValue(eng, 2, -1)).toBe(1);
    expect(stepValue(eng, 2, 1)).toBe(3);
  });
  it("holt einen Wert außerhalb des Bereichs zurück, statt ihn weiter hinauszuschieben", () => {
    expect(stepValue(eng, 9, -1)).toBe(5);
    expect(stepValue(eng, 9, 1)).toBeNull();
    expect(stepValue(eng, -3, 1)).toBe(0);
  });
  it("geht bei Kommazahlen in ganzen Schritten und rundet Ganzzahlfelder", () => {
    const zahl: FieldSchema = { type: "number", label: "Gewicht", minimum: 0, maximum: 10, default: 0.5 };
    expect(stepValue(zahl, 2.5, 1)).toBe(3.5);
    expect(stepValue(zahl, 0.5, -1)).toBe(0);
    expect(stepValue(eng, 2.5, 1)).toBe(3);
    expect(stepValue(eng, 2.5, -1)).toBe(2);
  });
  it("tritt bei Text, Auswahl und Ja/Nein nicht in Kraft", () => {
    expect(stepValue({ type: "string", label: "Name", maxLength: 5, default: "" }, "a", 1)).toBeNull();
    expect(stepValue({ type: "boolean", label: "Ja", default: false }, true, 1)).toBeNull();
  });
});

describe("Wer ist die Figur, was kann sie", () => {
  it("ordnet Texte der Figur zu und Listen, Zahlen und Schalter ihren Werten", () => {
    const runtime = rules.buildRuleRuntime(heroes);
    expect(fieldPart("name", runtime.fields.name!, runtime)).toBe("identity");
    expect(fieldPart("profession", runtime.fields.profession!, runtime)).toBe("identity");
    expect(fieldPart(runtime.abilityField!, runtime.fields[runtime.abilityField!]!, runtime)).toBe("values");
    expect(fieldPart(runtime.conditionField!, runtime.fields[runtime.conditionField!]!, runtime)).toBe("values");
    expect(fieldPart("lebenskraft", runtime.fields.lebenskraft!, runtime)).toBe("values");
    const text: FieldSchema = { type: "string", label: "Waffen", maxLength: 500, default: "" };
    expect(fieldPart("waffen", text, { abilityField: null, conditionField: null, collections: [{ storageField: "waffen" }] } as never)).toBe("values");
  });

  it("zeigt bei Chronicles Lite unter „identity“ Name und Rolle, aber keine Wertkachel", () => {
    const html = liteView({ part: "identity" });
    expect(html).toContain(">Name</label>");
    expect(html).toContain(">Rolle / Beruf</label>");
    expect(html).not.toContain("rule-field-tile");
    expect(html).not.toContain("vitalwert");
  });

  it("zeigt unter „values“ Kacheln und Balken, aber nicht den Namen", () => {
    const html = liteView({ part: "values" });
    expect(html).toContain("rule-field-tile");
    expect(html).toContain("vitalwert");
    expect(html).not.toContain(">Name</label>");
    expect(html).not.toContain("Rolle / Beruf");
  });

  it("lässt eine Gruppe, deren Kinder alle wegfallen, ganz weg", () => {
    const html = liteView({ part: "identity" });
    // Die Fertigkeitsgruppen haben nur Zahlen und Proben — kein leerer Rahmen bleibt stehen.
    expect(html).not.toContain(rules.CHRONICLES_LITE_GROUP_LABELS.handeln);
    expect(html).not.toMatch(/<legend>Fähigkeiten<\/legend>/);
    expect(html).not.toMatch(/<fieldset[^>]*>\s*<legend>[^<]*<\/legend>\s*<div[^>]*>\s*<\/div>\s*<\/fieldset>/);
  });

  it("blendet mit omit einzelne Felder aus, etwa den Namen im geführten Weg", () => {
    const html = liteView({ part: "identity", omit: ["name"] });
    expect(html).not.toContain(">Name</label>");
    expect(html).toContain(">Rolle / Beruf</label>");
    const legacy = host(heroes, heroesValues, { part: "identity", omit: ["name"] });
    expect(legacy).not.toContain(">Name</label>");
    expect(legacy).toContain(">Beruf / Rolle</label>");
  });

  it("teilt auch alte Pakete ohne Bogenbaum", () => {
    const wer = host(heroes, heroesValues, { part: "identity" });
    expect(wer).toContain(">Name</label>");
    expect(wer).not.toContain("vitalwert");
    expect(wer).not.toContain("stat-tile");
    expect(wer).not.toContain("ability-card");
    const was = host(heroes, heroesValues, { part: "values" });
    expect(was).toContain("vitalwert");
    expect(was).toContain("rule-field-tile");
    expect(was).not.toContain(">Name</label>");
  });
});

describe("Reihenfolge der Balken", () => {
  it("lässt sie bei einem v3-Bogen dort, wo die Autorin sie hingesetzt hat", () => {
    const html = liteView();
    const firstSkill = rules.CHRONICLES_LITE_SKILLS[0]!.label;
    expect(html.indexOf("vitalwert")).toBeGreaterThan(html.indexOf(`>${firstSkill}</label>`));
    expect(html.indexOf("vitalwert")).toBeGreaterThan(html.indexOf(">Name</label>"));
  });
  it("stellt sie bei alten Paketen an den Anfang", () => {
    const html = host(heroes, heroesValues);
    expect(html.indexOf('class="vitalwert')).toBeGreaterThan(-1);
    expect(html.indexOf('class="vitalwert')).toBeLessThan(html.indexOf("<fieldset"));
  });
});

describe("Berechnete Werte, Fähigkeiten, Zustände", () => {
  it("zeigt berechnete Werte als Kacheln ohne Eingabe", () => {
    const html = host(heroes, heroesValues);
    expect(html).toMatch(/<dl class="stat-tiles"/);
    expect(html).toMatch(/<div class="stat-tile"><dt>/);
  });

  it("nennt Fähigkeitsknöpfe nach ihrer Fähigkeit und begründet gesperrtes Lernen", () => {
    const values = { ...heroesValues, [rules.CHRONICLE_ABILITY_FIELD]: "harter_schlag" };
    const html = host(heroes, values);
    const all = buttons(html);
    const name = rules.CHRONICLE_HEROES_PACKAGE.abilities!.find(ability => ability.id === "harter_schlag")!.name;
    expect(all.some(button => button.text === `${name} verlernen`)).toBe(true);
    expect(all.some(button => button.text === "Verlernen" || button.text === "Lernen")).toBe(false);
    const locked = all.find(button => / lernen$/.test(button.text) && button.disabled)!;
    expect(locked, "mindestens eine noch nicht lernbare Fähigkeit").toBeDefined();
    const reason = attr(locked.tag, "aria-describedby")!;
    expect(html).toMatch(new RegExp(`id="${reason.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"[^>]*>[^<]+<`));
  });

  it("erklärt eine leere Fähigkeitenliste mit dem Begriff und ohne Beispielknopf", () => {
    const html = host(heroes, { ...heroesValues, [rules.CHRONICLE_ABILITY_FIELD]: "" });
    expect(html).toContain("Noch keine Fähigkeit gelernt.");
    expect(html).toContain("Was bedeutet „Fähigkeit“?");
    expect(html).not.toContain("Mit Beispiel beginnen");
  });

  it("zeigt Zustände als Umschalt-Chips mit Beschreibung darunter", () => {
    const html = host(heroes, heroesValues);
    expect(html).toMatch(/<label class="condition-chip[^"]*"[^>]*><input[^>]*type="checkbox"/);
    const condition = rules.CHRONICLE_HEROES_PACKAGE.conditions![0]!;
    expect(html).toContain(condition.text.replace(/&/g, "&amp;").replace(/"/g, "&quot;"));
  });
});

describe("Gespeicherte Liste reparieren", () => {
  it("erscheint nur, wenn eine Liste Einträge hält, die das Regelwerk nicht kennt", () => {
    const runtime = rules.buildRuleRuntime(heroes);
    expect(unknownListEntries(runtime, { [rules.CHRONICLE_ABILITY_FIELD]: "harter_schlag" })).toEqual([]);
    expect(unknownListEntries(runtime, { [rules.CHRONICLE_ABILITY_FIELD]: "harter_schlag, gibt_es_nicht" }))
      .toEqual([{ field: rules.CHRONICLE_ABILITY_FIELD, unknown: ["gibt_es_nicht"] }]);
    expect(host(heroes, heroesValues)).not.toContain("Gespeicherte Liste reparieren");
    const kaputt = host(heroes, { ...heroesValues, [rules.CHRONICLE_ABILITY_FIELD]: "harter_schlag, gibt_es_nicht" });
    expect(kaputt).toContain("Gespeicherte Liste reparieren");
    expect(kaputt).not.toContain("Kennungslisten");
  });
});

describe("Rückfragen im Look", () => {
  it.each(["CharacterSheet.tsx", "CharacterPortrait.tsx", "HostRuleFields.tsx", "RulePresentationView.tsx", "FaehigkeitenBogen.tsx"])("%s fragt nicht mit window.confirm", file => {
    expect(readFileSync(new URL(`../src/features/${file}`, import.meta.url), "utf8")).not.toMatch(/window\.confirm/);
  });
});

describe("Bogen-Stile auf der gemeinsamen Leiter", () => {
  it.each(["rule-fields.css", "rule-categories.css", "character-sheet.css", "vitalanzeige.css"])("%s nutzt nur Farbtoken und keine Schrift unter 12 px", file => {
    const css = readFileSync(new URL(`../src/features/${file}`, import.meta.url), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    expect(css).not.toMatch(/#[0-9a-f]{3,8}\b|\brgba?\(|\bhsla?\(/i);
    const sizes = [...css.matchAll(/font-size:\s*([\d.]+)(px|rem)\b/g)].map(([, value, unit]) => Number(value) * (unit === "rem" ? 16 : 1));
    expect(sizes.filter(size => size < 12)).toEqual([]);
    expect(css).not.toMatch(/var\(--(ink|border|ink-muted|surface-sunken)\)/);
  });
});
