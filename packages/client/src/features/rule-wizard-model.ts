// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import type { AnyRulePackage, RuleOutcome, RuleVital } from "@chronicle/rules";
import { t } from "../i18n";
import { formulaDraft, localKey, newField, newPackage, type DraftAction, type DraftField, type DraftSection, type RuleDraft } from "./rule-forge-model";
import { placeOnSheet, sheetTree, withSheetTree } from "./rule-sheet-model";
import { parseFormula } from "@chronicle/rules";

/**
 * Der Regelwerk-Assistent (Leiter, Schritt a): aus Antworten in Alltagssprache wird ein gültiger,
 * spielbarer Entwurf — ohne dass jemand Attribute, Aktionen oder Formeln kennen muss. Rein: keine
 * Oberfläche, kein Speicher; die Werkbank verfeinert danach, was hier entsteht.
 */
export type WizardGenre = "fantasy" | "scifi" | "horror" | "gegenwart" | "eigenes";
export type WizardSystem = "w20" | "w100" | "2w6" | "3w6";
export interface WizardBar { key: string; label: string; on: boolean; color: NonNullable<RuleVital["color"]>; defeat: boolean }
export interface WizardSkill { name: string; attribute: string }
export interface WizardAnswers {
  name: string; genre: WizardGenre; system: WizardSystem;
  /** Anzeigenamen der Eigenschaften in der gewählten Reihenfolge. */
  attributes: string[];
  bars: WizardBar[];
  skills: WizardSkill[];
  /** Fertigkeiten tragen einen eigenen Wert, der zur Eigenschaft hinzukommt. */
  skillValues: boolean;
}

export const GENRES: readonly WizardGenre[] = ["fantasy", "scifi", "horror", "gegenwart", "eigenes"];
export function genreLabel(genre: WizardGenre): string {
  switch (genre) { case "fantasy": return t("Fantasy"); case "scifi": return t("Science-Fiction"); case "horror": return t("Horror"); case "gegenwart": return t("Gegenwart"); case "eigenes": return t("Etwas Eigenes"); }
}
export function genreAttributes(genre: WizardGenre): string[] {
  switch (genre) {
    case "fantasy": return [t("Stärke"), t("Geschick"), t("Verstand"), t("Willenskraft"), t("Ausstrahlung")];
    case "scifi": return [t("Körper"), t("Reflexe"), t("Technik"), t("Intellekt"), t("Präsenz")];
    case "horror": return [t("Körper"), t("Nerven"), t("Verstand"), t("Auftreten"), t("Glück")];
    case "gegenwart": return [t("Fitness"), t("Geschick"), t("Wissen"), t("Wahrnehmung"), t("Charme")];
    case "eigenes": return [t("Kraft"), t("Geschick"), t("Verstand")];
  }
}
export function genreBars(genre: WizardGenre): WizardBar[] {
  const life: WizardBar = { key: "leben", label: genre === "gegenwart" ? t("Gesundheit") : t("Leben"), on: true, color: "red", defeat: true };
  switch (genre) {
    case "fantasy": return [life, { key: "mana", label: t("Mana"), on: true, color: "blue", defeat: false }, { key: "ausdauer", label: t("Ausdauer"), on: false, color: "green", defeat: false }];
    case "scifi": return [life, { key: "energie", label: t("Energie"), on: true, color: "teal", defeat: false }, { key: "schild", label: t("Schild"), on: false, color: "blue", defeat: false }];
    case "horror": return [life, { key: "verstand", label: t("Geistige Gesundheit"), on: true, color: "purple", defeat: false }];
    case "gegenwart": return [life, { key: "stress", label: t("Belastbarkeit"), on: false, color: "orange", defeat: false }];
    case "eigenes": return [life, { key: "vorrat", label: t("Vorrat"), on: false, color: "yellow", defeat: false }];
  }
}
/** Vorschläge je Genre; die Eigenschaft ist die Position in `genreAttributes`. */
export function genreSkills(genre: WizardGenre): { name: string; attribute: number }[] {
  const s = (name: string, attribute: number) => ({ name, attribute });
  switch (genre) {
    case "fantasy": return [s(t("Klettern"), 0), s(t("Schleichen"), 1), s(t("Wahrnehmung"), 2), s(t("Wissen"), 2), s(t("Überreden"), 4), s(t("Heilkunde"), 2), s(t("Einschüchtern"), 3)];
    case "scifi": return [s(t("Pilotieren"), 1), s(t("Schießen"), 1), s(t("Hacken"), 2), s(t("Medizin"), 3), s(t("Verhandeln"), 4), s(t("Reparieren"), 2)];
    case "horror": return [s(t("Nachforschen"), 2), s(t("Verstecken"), 1), s(t("Erste Hilfe"), 2), s(t("Rennen"), 0), s(t("Beruhigen"), 3), s(t("Okkultes Wissen"), 2)];
    case "gegenwart": return [s(t("Fahren"), 1), s(t("Recherche"), 2), s(t("Überzeugen"), 4), s(t("Sport"), 0), s(t("Beobachten"), 3)];
    case "eigenes": return [];
  }
}

interface SystemSpec {
  attribute: { min: number; max: number; start: number };
  skill: { min: number; max: number; start: number };
  bar: number;
  formula(attribute: string, skill?: string): { expression: string; thresholdEnabled: boolean; threshold: string; outcome?: RuleOutcome };
  /** Chance auf (mindestens einen) Erfolg bei einem Wert, exakt gezählt. */
  chance(value: number): number;
}
const d = (sides: number) => Array.from({ length: sides }, (_, i) => i + 1);
function sumDistribution(count: number, sides: number): Map<number, number> {
  let dist = new Map([[0, 1]]);
  for (let i = 0; i < count; i++) { const next = new Map<number, number>(); for (const [total, p] of dist) for (const face of d(sides)) next.set(total + face, (next.get(total + face) ?? 0) + p / sides); dist = next; }
  return dist;
}
const probability = (dist: Map<number, number>, test: (total: number) => boolean) => [...dist].reduce((sum, [total, p]) => sum + (test(total) ? p : 0), 0);
const underBand = (target: string): RuleOutcome => ({ bands: [{ id: "gelungen", label: t("Gelungen"), comparison: "lte", expression: target, success: true }], fallback: { id: "misslungen", label: t("Misslungen"), success: false } });
export const SYSTEMS: Readonly<Record<WizardSystem, SystemSpec>> = {
  w20: { attribute: { min: 0, max: 5, start: 2 }, skill: { min: 0, max: 5, start: 0 }, bar: 20,
    formula: (a, s) => ({ expression: `1d20 + actor.${a}${s ? ` + actor.${s}` : ""}`, thresholdEnabled: true, threshold: "15" }),
    chance: value => probability(sumDistribution(1, 20), total => total + value >= 15) },
  w100: { attribute: { min: 1, max: 100, start: 40 }, skill: { min: 0, max: 60, start: 0 }, bar: 12,
    formula: (a, s) => ({ expression: "1d100", thresholdEnabled: false, threshold: "0", outcome: underBand(s ? `actor.${a} + actor.${s}` : `actor.${a}`) }),
    chance: value => probability(sumDistribution(1, 100), total => total <= value) },
  "2w6": { attribute: { min: -1, max: 3, start: 1 }, skill: { min: 0, max: 2, start: 0 }, bar: 10,
    formula: (a, s) => ({ expression: `2d6 + actor.${a}${s ? ` + actor.${s}` : ""}`, thresholdEnabled: false, threshold: "0", outcome: {
      bands: [{ id: "voll", label: t("Voller Erfolg"), comparison: "gte", expression: "10", success: true }, { id: "mit_haken", label: t("Erfolg mit Haken"), comparison: "gte", expression: "7", success: true }],
      fallback: { id: "misserfolg", label: t("Misserfolg"), success: false } } }),
    chance: value => probability(sumDistribution(2, 6), total => total + value >= 7) },
  "3w6": { attribute: { min: 3, max: 18, start: 10 }, skill: { min: 0, max: 6, start: 0 }, bar: 12,
    formula: (a, s) => ({ expression: "3d6", thresholdEnabled: false, threshold: "0", outcome: underBand(s ? `actor.${a} + actor.${s}` : `actor.${a}`) }),
    chance: value => probability(sumDistribution(3, 6), total => total <= value) },
};
export function systemTitle(system: WizardSystem): string {
  switch (system) {
    case "w20": return t("Ein W20 plus Wert gegen eine Schwierigkeit");
    case "w100": return t("Ein W100 unter den Wert");
    case "2w6": return t("Zwei W6 plus Wert, drei Ausgänge");
    case "3w6": return t("Drei W6 unter den Wert");
  }
}
export function systemExplanation(system: WizardSystem): string {
  switch (system) {
    case "w20": return t("Eigenschaften sind kleine Boni von 0 bis 5. Gewürfelt wird ein W20, der Bonus kommt dazu; ab 15 gelingt es. Klassisch für Fantasy-Abenteuer.");
    case "w100": return t("Eigenschaften sind Prozentwerte von 1 bis 100. Wer mit dem W100 höchstens seinen Wert würfelt, schafft es. Sofort lesbar: 60 heißt 60 % Chance.");
    case "2w6": return t("Eigenschaften reichen von −1 bis +3. Zwei W6 plus Wert: ab 10 klappt es voll, von 7 bis 9 mit einem Haken, darunter geht es schief. Gut für erzählerisches Spiel.");
    case "3w6": return t("Eigenschaften reichen von 3 bis 18. Drei W6 müssen höchstens den Wert erreichen. Mittlere Werte sind häufig, Extreme selten.");
  }
}
/** Ein fester Beispielwurf, damit die Regel greifbar wird. */
export function systemExample(system: WizardSystem, attribute: string): string {
  switch (system) {
    case "w20": return t("Beispiel: Der W20 zeigt 13, plus {name} 3 macht 16. Ab 15 gelingt es, also geschafft.", { name: attribute });
    case "w100": return t("Beispiel: {name} ist 45, der W100 zeigt 38. Höchstens 45, also geschafft.", { name: attribute });
    case "2w6": return t("Beispiel: Die W6 zeigen 4 und 3, plus {name} 1 macht 8: Erfolg mit Haken.", { name: attribute });
    case "3w6": return t("Beispiel: {name} ist 11, die drei W6 zeigen 3, 5 und 2, zusammen 10. Höchstens 11, also geschafft.", { name: attribute });
  }
}

/** Kennung aus einem Anzeigenamen: klein, Umlaute ausgeschrieben, nur Buchstaben, Ziffern und _ (Formeln kennen keinen Bindestrich). */
export function identifierFor(label: string, taken: ReadonlySet<string>): string {
  const base = label.toLocaleLowerCase("de").replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").replace(/^[^a-z]+/, "").slice(0, 48) || "wert";
  let id = base, n = 2; while (taken.has(id)) id = `${base}_${n++}`;
  return id;
}
function slug(label: string): string {
  return label.toLocaleLowerCase("de").replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss").normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").replace(/^[^a-z]+/, "").slice(0, 40) || "regelwerk";
}

export function defaultAnswers(genre: WizardGenre = "fantasy"): WizardAnswers {
  return { name: "", genre, system: "w20", attributes: genreAttributes(genre), bars: genreBars(genre), skills: [], skillValues: false };
}
/** Genre wechseln: Vorschläge folgen, eigene Namen bleiben erhalten, soweit sie nicht Vorschläge des alten Genres waren. */
export function withGenre(answers: WizardAnswers, genre: WizardGenre): WizardAnswers {
  const oldSuggested = new Set(genreAttributes(answers.genre));
  const own = answers.attributes.filter(name => !oldSuggested.has(name));
  return { ...answers, genre, attributes: [...genreAttributes(genre), ...own], bars: genreBars(genre), skills: answers.skills.filter(skill => !genreSkills(answers.genre).some(s => s.name === skill.name)) };
}
export function wizardProblems(answers: WizardAnswers): string[] {
  const problems: string[] = [];
  if (!answers.attributes.filter(name => name.trim()).length) problems.push(t("Eine Figur braucht mindestens eine Eigenschaft."));
  if (answers.skills.some(skill => !answers.attributes.includes(skill.attribute))) problems.push(t("Eine Fertigkeit verweist auf eine Eigenschaft, die es nicht mehr gibt."));
  return problems;
}

/** Der Entwurf aus den Antworten. Wirft nie; ungültige Antworten zeigt `wizardProblems`. */
export function wizardDraft(answers: WizardAnswers, authorName: string, installed: readonly AnyRulePackage[]): RuleDraft {
  const spec = SYSTEMS[answers.system];
  const base = newPackage(authorName, installed);
  const nameField = base.fields.find(field => field.id === "name") ?? { ...newField("name", "string"), label: t("Name") };
  const taken = new Set<string>(["name"]);
  const number = (label: string, range: { min: number; max: number; start: number }): DraftField => ({ ...newField(identifierFor(label, taken)), label, minimum: String(range.min), maximum: String(range.max), defaultValue: String(range.start) });
  const attributeFields = answers.attributes.map(name => name.trim()).filter(Boolean).map(label => { const field = number(label, spec.attribute); taken.add(field.id); return field; });
  const attributeId = new Map(attributeFields.map(field => [field.label, field.id]));
  const skills = answers.skills.filter(skill => skill.name.trim() && attributeId.has(skill.attribute));
  const skillFields = answers.skillValues ? skills.map(skill => { const field = number(skill.name.trim(), spec.skill); taken.add(field.id); return field; }) : [];
  const bars = answers.bars.filter(bar => bar.on && bar.label.trim());
  const barFields = bars.map(bar => { const field = { ...number(bar.label.trim(), { min: 0, max: 999, start: spec.bar }) }; taken.add(field.id); return field; });

  const actionIds = new Set<string>();
  const action = (id: string, name: string, attribute: DraftField, skill?: DraftField): DraftAction => {
    const rule = spec.formula(attribute.id, skill?.id), actionId = identifierFor(id, actionIds); actionIds.add(actionId);
    const disclosure = describeRoll(answers.system, skill ? `${attribute.label} + ${skill.label}` : attribute.label);
    return { localId: localKey(), id: actionId, name, version: "1.0.0", disclosure, inputs: [], thresholdEnabled: rule.thresholdEnabled, threshold: rule.threshold,
      formula: formulaDraft(parseFormula(rule.expression)), expression: rule.expression, ...(rule.outcome ? { outcome: rule.outcome } : {}) };
  };
  const actions = [
    ...attributeFields.map(field => action(`probe_${field.id}`, t("{name}-Probe", { name: field.label }), field)),
    ...skills.map((skill, i) => action(skill.name, skill.name.trim(), attributeFields.find(field => field.id === attributeId.get(skill.attribute))!, answers.skillValues ? skillFields[i] : undefined)),
  ];

  const section = (id: string, label: string, fields: readonly DraftField[]): DraftSection => ({ localId: localKey(), id, label, fieldKeys: fields.map(field => field.localId), parentLocalId: null });
  const sections = [section("figur", t("Figur"), [nameField]), section("eigenschaften", t("Eigenschaften"), attributeFields),
    ...(skillFields.length ? [section("fertigkeiten", t("Fertigkeiten"), skillFields)] : []), ...(barFields.length ? [section("vorraete", t("Vorräte"), barFields)] : [])];
  const vitals: RuleVital[] = bars.map((bar, i) => ({ id: barFields[i]!.id, label: bar.label.trim(), max: String(spec.bar), depletion: bar.defeat ? "defeat" : "none", color: bar.color }));
  const name = answers.name.trim() || t("Mein Regelwerk");
  let id = `de.eigene-regeln.${slug(name)}`, n = 2; while (installed.some(pkg => pkg.id === id)) id = `de.eigene-regeln.${slug(name)}-${n++}`;
  let draft: RuleDraft = { ...base, schemaVersion: 2, id, name, fields: [nameField, ...attributeFields, ...skillFields, ...barFields], sections, actions, vitals,
    computed: [], constraints: [], collections: [], presentation: undefined, presentationAuto: undefined, selfTests: [], includeSelfTests: false, migrations: [] };
  const { presentation: _p, presentationAuto: _a, ...rest } = draft;
  // Ein Bogenbaum von Anfang an: der Bogen-Editor der Werkbank arbeitet dann ohne Umstellung weiter.
  draft = withSheetTree(rest, sheetTree(rest));
  for (const vital of vitals) draft = placeOnSheet(draft, "vital", vital.id, true);
  return draft;
}
function describeRoll(system: WizardSystem, what: string): string {
  switch (system) {
    case "w20": return t("Ein W20 plus {wert}; ab 15 gelingt es.", { wert: what });
    case "w100": return t("Ein W100; höchstens {wert} gelingt.", { wert: what });
    case "2w6": return t("Zwei W6 plus {wert}; ab 10 voller Erfolg, 7 bis 9 Erfolg mit Haken.", { wert: what });
    case "3w6": return t("Drei W6; höchstens {wert} gelingt.", { wert: what });
  }
}
