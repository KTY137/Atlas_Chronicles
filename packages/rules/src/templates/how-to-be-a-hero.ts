// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
/** Template data/adaptation: CC BY-NC-SA-4.0. See the colocated license notice.
 * Engine implementation remains separately licensed under packages/rules/LICENSE. */
import { type Scalar } from "../formula.ts";
import { type FieldSchema, type RuleMigration } from "../package.ts";
import { defaultSupportedActorFields, parseRulePackageV2, validatePackageFields, type ComputedField, type RuleActionV2, type RuleAssertion, type RuleAttribution, type RuleOutcome, type RulePackageV2 } from "../package-v2.ts";
import { array, deepFreeze, fail, identifier, keys, record, snapshotJson, string } from "../validation.ts";

export type HtbahGroup = "handeln" | "wissen" | "soziales";
export interface HtbahSkill { readonly id: string; readonly label: string; readonly group: HtbahGroup }
export interface HtbahPackageOptions { readonly skills?: readonly HtbahSkill[]; readonly id?: string; readonly version?: string; readonly migrations?: readonly RuleMigration[] }
export const HTBAH_GROUPS: readonly HtbahGroup[] = Object.freeze(["handeln", "wissen", "soziales"]);
export const HTBAH_GROUP_LABELS: Readonly<Record<HtbahGroup, string>> = Object.freeze({ handeln: "Handeln", wissen: "Wissen", soziales: "Soziales" });
export const HTBAH_EDITION = "How to be a Hero · Grundregelwerk (PDF 2018, bestätigte Wikifassung 2021)";
/**
 * Die ausgelieferte Fassung der Adaption. **1.1.0** trägt die Vitalwert-Deklaration: dasselbe
 * Regelwerk, aber Tod bei 0 Lebenspunkten steht jetzt im Paket statt nur im Erläuterungstext.
 * Das ändert den Inhalts-Hash, also muss die Version es sagen — ein geändertes Dokument unter
 * unveränderter Version wäre genau die stille Drift, gegen die die Installationsprüfung steht.
 */
export const HTBAH_VERSION = "1.1.0";
export const HTBAH_DEFAULT_SKILLS: readonly HtbahSkill[] = deepFreeze([
  { id: "klettern", label: "Klettern", group: "handeln" }, { id: "feinmechanik", label: "Feinmechanik", group: "handeln" }, { id: "spurenlesen", label: "Spurenlesen", group: "handeln" },
  { id: "naturkunde", label: "Naturkunde", group: "wissen" }, { id: "heilkunde", label: "Heilkunde", group: "wissen" }, { id: "geschichte", label: "Geschichte", group: "wissen" },
  { id: "verhandeln", label: "Verhandeln", group: "soziales" }, { id: "beruhigen", label: "Beruhigen", group: "soziales" }, { id: "auftreten", label: "Auftreten", group: "soziales" },
]);
export const HTBAH_ATTRIBUTION: RuleAttribution = deepFreeze({
  title: HTBAH_EDITION,
  sources: [
    { title: "Offizielles Grundregelwerk (PDF)", url: "https://howtobeahero.de/images/4/47/Regelwerk.pdf", revision: "PDF, offizieller Upload vom 26.05.2018; Seiten 3–8, 12, 21", authors: ["How to be a Hero-Team"] },
    { title: "Dateiversion und Versionsgeschichte des Regelwerks", url: "https://howtobeahero.de/index.php?title=Datei:Regelwerk.pdf&oldid=5015", revision: "oldid=5015; Upload ist kein Autorenbeleg", authors: ["How to be a Hero-Wiki-Beitragende"] },
    { title: "Würfe & Proben – bestätigte Fassung", url: "https://howtobeahero.de/index.php?title=W%C3%BCrfe_%26_Proben_(kritische_Erfolge_%26_Fehlschl%C3%A4ge)&oldid=27220", revision: "oldid=27220, bestätigt am 08.04.2021", authors: ["How to be a Hero-Team", "How to be a Hero-Wiki-Beitragende"] },
    { title: "Begabungen – bestätigte Fassung", url: "https://howtobeahero.de/index.php?title=Begabungen&oldid=27263", revision: "oldid=27263", authors: ["Murmel Gippert", "Mariana Friedrich", "Mewo", "weitere How to be a Hero-Wiki-Beitragende"] },
    { title: "Abweichende jüngere Probenfassung (nicht ausgewählt)", url: "https://howtobeahero.de/index.php?title=W%C3%BCrfe_%26_Proben_(kritische_Erfolge_%26_Fehlschl%C3%A4ge)&oldid=33560", revision: "oldid=33560, 27.07.2022, unbestätigt", authors: ["SirT0b1", "How to be a Hero-Wiki-Beitragende"] },
  ],
  licenseUrl: "https://creativecommons.org/licenses/by-nc-sa/4.0/",
  notice: "How to be a Hero-Team und Wiki-Beitragende; genannte Mitwirkende und Versionsgeschichten siehe Quellen. CC BY-NC-SA 4.0: Namensnennung, nichtkommerziell, Weitergabe unter gleichen Bedingungen. Atlas Chronicles-Adaption, keine offizielle Empfehlung. Quellenvermerke und frühere Änderungsvermerke bei Bearbeitungen erhalten. Keine Logos, Illustrationen oder Buchseiten enthalten.",
  changes: "Für Atlas Chronicles in deklarative Regeln und Bogenfelder übertragen; Erläuterungen neu formuliert; bestätigte Regelversion festgeschrieben. Bei Fertigkeitswert 70 ist 97 bereits kritisch misslungen; die jüngere unbestätigte Fassung beginnt bei 98. Expliziter Adaptionsvorrang: Begabungsproben haben keinen kritischen Erfolg, bei Begabung 0 misslingt auch eine 1. Interpretation des kritischen Schadens: 2 × (Nd10 + abgesprochener Bonus), einschließlich Bonus. Beispielkatalog und Beispielpersonen sind eigene Beispiele, keine verbindlichen offiziellen Fertigkeiten.",
});
export const HTBAH_RULE_GUIDANCE = deepFreeze({
  creation: "400 Startpunkte. Vorteile, Nachteile und Entwicklung werden über eine ausdrücklich vereinbarte Budgetanpassung festgehalten. Verbleibende Punkte dürfen beim Bearbeiten offen bleiben; Überziehung vor Spielbereitschaft klären.",
  health: "100 Lebenspunkte zu Beginn. Unter 10 LP bewusstlos, bei 0 LP tot. Ein einzelner Verlust von mehr als 60 LP führt zur Bewusstlosigkeit. Die Runde bestätigt die Anwendung dieser Zustände ausdrücklich; eine Bogenänderung setzt keinen automatischen Zustand.",
  parry: "Parade: Begabungsprobe Handeln, höchstens einmal pro Runde. Fernkampfangriffe und kritische Angriffe können nicht pariert werden. Die Runde verwaltet diese Einschränkungen.",
  luck: "Geistesblitz erlaubt die Wiederholung einer misslungenen, nicht kritisch misslungenen Probe derselben Gruppe. Zuerst einen Punkt ausdrücklich im Bogen ausgeben und speichern, dann separat erneut würfeln; den ersten Beleg erhalten. Kein atomarer Tausch oder automatischer Ersatzwurf. Neuer Abend / Abenteuer: Punkte ausdrücklich auffüllen.",
  initiative: "Initiative: 1W10 + Handeln; höhere Ergebnisse handeln zuerst. Die Runde entscheidet Gleichstände und Reihenfolge.",
  damage: "Schaden: gewählte 1–10 W10 + abgesprochener Bonus. Kritischer Angriff: 2 × (Würfelsumme + Bonus). Das Mitverdoppeln des Bonus ist die erklärte Adaptionsinterpretation. Waffenwerte legt die Runde fest; der Wurf verändert keine LP automatisch.",
  edition: HTBAH_ATTRIBUTION.changes,
});

/** IDs are explicit stable catalogue identities; changing a label never changes saved keys. */
export function parseHtbahSkills(input: unknown): readonly HtbahSkill[] {
  const items = array(snapshotJson(input), "skill catalogue", 24); if (!items.length) fail("skill catalogue: 1–24 skills required"); const seen = new Set<string>();
  return deepFreeze(items.map(item => {
    const row = record(item, "skill"); keys(row, ["id", "label", "group"], "skill"); const id = identifier(row.id, "skill.id");
    if (id.length > 48) fail("skill.id: maximum 48 characters"); if (seen.has(id)) fail("skill catalogue: duplicate id"); seen.add(id);
    const label = string(row.label, "skill.label", 80); if (!HTBAH_GROUPS.includes(row.group as HtbahGroup)) fail("skill: unknown group");
    return { id, label, group: row.group as HtbahGroup };
  }));
}
export const htbahSkillField = (id: string): string => `skill_${id}`;
export const htbahBonusField = (id: string): string => `bonus_${id}`;
export const htbahSpentField = (group: HtbahGroup): string => `gbp_spent_${group}`;
// Balanced sums keep 24 arbitrarily long stable IDs below the frozen AST depth limit.
function sum(items: readonly string[]): string { if (!items.length) return "0"; if (items.length === 1) return items[0]!; const half = Math.ceil(items.length / 2); return `(${sum(items.slice(0, half))} + ${sum(items.slice(half))})`; }
const integerField = (label: string, minimum: number, maximum: number, value = 0): FieldSchema => ({ type: "integer", label, default: value, minimum, maximum });
const textField = (label: string, maxLength: number): FieldSchema => ({ type: "string", label, default: "", maxLength });
const booleanField = (label: string, value: boolean): FieldSchema => ({ type: "boolean", label, default: value });
function coreOutcome(target: string, skill: boolean): RuleOutcome {
  return { bands: [
    { id: "critical_failure", label: "Kritisch misslungen", comparison: "gte", expression: `min(100, 90 + (${target}) / 10)`, success: false },
    ...(skill ? [{ id: "critical_success", label: "Kritisch gelungen", comparison: "lte" as const, expression: `max(1, (${target}) / 10)`, success: true }] : []),
    { id: "success", label: "Gelungen", comparison: "lte", expression: target, success: true },
  ], fallback: { id: "failure", label: "Misslungen", success: false } };
}
export function createHowToBeAHeroPackage(options: HtbahPackageOptions = {}): RulePackageV2 {
  const skills = parseHtbahSkills(options.skills ?? HTBAH_DEFAULT_SKILLS);
  const raw = (skill: HtbahSkill) => `actor.${htbahSkillField(skill.id)}`;
  const aptitude = (group: HtbahGroup) => `round(${sum(skills.filter(skill => skill.group === group).map(raw))} / 10)`;
  const maximumGbp = (group: HtbahGroup) => `round((${aptitude(group)}) / 10)`;
  const effective = (skill: HtbahSkill) => `(${raw(skill)} + if(actor.${htbahBonusField(skill.id)}, ${aptitude(skill.group)}, 0))`;
  const fields: Record<string, FieldSchema> = { name: textField("Name", 120), profession: textField("Beruf / Rolle", 120), notes: textField("Notizen / Absprachen", 4096), hp: integerField("Lebenspunkte", 0, 100, 100), budget_adjustment: integerField("Vereinbarte Punkteanpassung", -400, 1_000_000) };
  const computed: ComputedField[] = []; const constraints: RuleAssertion[] = []; const actions: RuleActionV2[] = [];
  const baseAction = { version: "1.0.0", requiresConfirmation: true as const, inputs: {} };
  for (const group of HTBAH_GROUPS) {
    const label = HTBAH_GROUP_LABELS[group]; fields[htbahSpentField(group)] = integerField(`Ausgegebene Geistesblitze · ${label}`, 0, 24);
    computed.push({ id: `aptitude_${group}`, label: `Begabung · ${label}`, expression: aptitude(group) }, { id: `gbp_max_${group}`, label: `Geistesblitze gesamt · ${label}`, expression: maximumGbp(group) }, { id: `gbp_remaining_${group}`, label: `Geistesblitze übrig · ${label}`, expression: `${maximumGbp(group)} - actor.${htbahSpentField(group)}` });
    constraints.push({ id: `gbp_valid_${group}`, message: `Ausgegebene Geistesblitze (${label}) übersteigen den abgeleiteten Vorrat. Ausgabe ausdrücklich korrigieren.`, expression: `actor.${htbahSpentField(group)} <= ${maximumGbp(group)}` });
  }
  for (const skill of skills) {
    fields[htbahSkillField(skill.id)] = integerField(`${skill.label} · Rohpunkte`, 0, 100); fields[htbahBonusField(skill.id)] = booleanField(`${skill.label} · Begabungsbonus`, true);
    computed.push({ id: `effective_${skill.id}`, label: `${skill.label} · effektiver Wert`, expression: effective(skill) });
    constraints.push({ id: `skill_valid_${skill.id}`, message: `${skill.label}: effektiver Wert über 100. Punkte umverteilen oder den Begabungsbonus ausdrücklich abwählen.`, expression: `${effective(skill)} <= 100` });
    actions.push({ ...baseAction, id: `skill_${skill.id}`, name: skill.label, expression: "1d100", disclosure: `Fertigkeitsprobe ${HTBAH_GROUP_LABELS[skill.group]}: gespeicherte Rohpunkte plus gewählter Begabungsbonus; ein W100. 1 kritisch gelungen, 100 kritisch misslungen; inklusive kritische Grenzen der bestätigten Fassung. Ohne Modifikator.`, preconditions: [{ id: "learned", message: "Diese Fertigkeit ist ungelernt (0 Rohpunkte). Stattdessen die zugehörige Begabungsprobe wählen.", expression: `${raw(skill)} > 0` }], outcome: coreOutcome(effective(skill), true) });
  }
  computed.push({ id: "points_spent", label: "Verteilte Punkte", expression: sum(skills.map(raw)) }, { id: "points_available", label: "Noch verfügbare Punkte", expression: `400 + actor.budget_adjustment - ${sum(skills.map(raw))}` });
  for (const group of HTBAH_GROUPS) actions.push({ ...baseAction, id: `aptitude_${group}`, name: `Begabung · ${HTBAH_GROUP_LABELS[group]}`, expression: "1d100", disclosure: `Ein W100 auf Begabung ${HTBAH_GROUP_LABELS[group]}. Keine kritischen Erfolge; bei Begabung 0 misslingt auch eine 1 (ausdrücklicher Adaptionsvorrang). 100 kritisch misslungen. ${group === "handeln" ? HTBAH_RULE_GUIDANCE.parry : "Ohne Modifikator."}`, outcome: coreOutcome(aptitude(group), false) });
  actions.push({ ...baseAction, id: "initiative", name: "Initiative", expression: `1d10 + ${aptitude("handeln")}`, disclosure: HTBAH_RULE_GUIDANCE.initiative });
  let dice = "10d10"; for (let count = 9; count >= 1; count--) dice = `if(input.dice_count == ${count}, ${count}d10, ${dice})`;
  actions.push({ ...baseAction, id: "damage", name: "Schaden", expression: `(${dice} + input.bonus) * if(input.critical, 2, 1)`, inputs: { dice_count: integerField("Anzahl W10", 1, 10, 1), bonus: integerField("Abgesprochener Schadensbonus", 0, 1000), critical: booleanField("Kritischer Angriff", false) }, disclosure: `${HTBAH_RULE_GUIDANCE.damage} ${HTBAH_RULE_GUIDANCE.health}` });
  actions.push({ ...baseAction, id: "manual_ruling", name: "Abgesprochene Probe", expression: "1d100", inputs: { target: { type: "number", label: "Abgesprochener Endwert", default: 50, minimum: 0, maximum: 100 }, critical_success_max: { type: "number", label: "Kritischer Erfolg bis (0: nur natürliche 1 bei Fertigkeit)", default: 5, minimum: 0, maximum: 99 }, critical_failure_min: { type: "number", label: "Kritischer Fehlschlag ab", default: 95, minimum: 1, maximum: 100 }, skill_check: booleanField("Fertigkeit (sonst Begabung)", true) }, disclosure: "Manuelle SL-Absprache: Endwert und kritische Grenzen ausdrücklich festlegen; keine offizielle allgemeine Modifikatorformel. Eingaben bleiben im Beleg. 100 ist kritisch misslungen; bei Fertigkeiten ist 1 kritisch gelungen, Begabungen haben keine kritischen Erfolge.", outcome: { bands: [
    { id: "critical_failure", label: "Kritisch misslungen", comparison: "gte", expression: "max(if(input.skill_check, 2, 1), input.critical_failure_min)", success: false },
    { id: "critical_success", label: "Kritisch gelungen", comparison: "lte", expression: "if(input.skill_check, max(1, input.critical_success_max), 0)", success: true },
    { id: "success", label: "Gelungen", comparison: "lte", expression: "input.target", success: true },
  ], fallback: { id: "failure", label: "Misslungen", success: false } } });
  return parseRulePackageV2({ schemaVersion: 2, id: options.id ?? "de.howtobeahero.core", name: "How to be a Hero", version: options.version ?? HTBAH_VERSION, engineVersion: "1.0.0", license: "CC-BY-NC-SA-4.0", authors: ["How to be a Hero-Team und Wiki-Beitragende", "Atlas Chronicles: deklarative Adaption und eigene Beispiele"], fields, layout: { sections: [
    { id: "character", label: "Figur und Absprachen", fields: ["name", "profession", "notes", "hp", "budget_adjustment"] },
    ...HTBAH_GROUPS.map(group => ({ id: group, label: HTBAH_GROUP_LABELS[group], fields: skills.filter(skill => skill.group === group).flatMap(skill => [htbahSkillField(skill.id), htbahBonusField(skill.id)]) })),
    { id: "geistesblitz", label: "Geistesblitze · ausgegebene Punkte", fields: HTBAH_GROUPS.map(htbahSpentField) },
  ] }, actions, computed, constraints, vitals: [
    // Tod bei 0 Lebenspunkten ist die Regel des Systems (Grundregelwerk, Bewusstlosigkeit unter 10).
    // Bis 1.1.0 stand sie nur als Erläuterung daneben; jetzt trägt sie das Paket selbst.
    // Die drei Geistesblitz-Zähler sind ausdrücklich KEINE Vitalwerte: ein leerer Vorrat ist
    // kein Tod. Genau diese Verwechslung hat das v2-Verbot in `adjustResource` erzwungen.
    { id: "hp", label: "Lebenspunkte", max: "100", depletion: "defeat" as const },
  ], attribution: HTBAH_ATTRIBUTION, migrations: options.migrations ?? [], selfTests: [
    { name: "Begabung 0: W100 21 misslingt", actionId: "aptitude_handeln", context: { seed: "00000001000000020000000300000004", actor: {}, input: {}, knowledge: { actorId: "selftest", passages: [] } }, expectedTotal: 21, expectedSuccess: false, expectedOutcomeId: "failure" },
    { name: "Initiative ohne Handeln: W10 1", actionId: "initiative", context: { seed: "00000001000000020000000300000004", actor: {}, input: {}, knowledge: { actorId: "selftest", passages: [] } }, expectedTotal: 1 },
    { name: "Kritischer Schaden verdoppelt Bonus: (1 + 3) mal 2", actionId: "damage", context: { seed: "00000001000000020000000300000004", actor: {}, input: { dice_count: 1, bonus: 3, critical: true }, knowledge: { actorId: "selftest", passages: [] } }, expectedTotal: 8 },
  ] });
}
export const HOW_TO_BE_A_HERO_PACKAGE = createHowToBeAHeroPackage();
export interface HtbahExampleCharacter { readonly id: string; readonly name: string; readonly description: string; readonly fields: Readonly<Record<string, Scalar>> }
function example(id: string, name: string, profession: string, points: readonly number[]): HtbahExampleCharacter {
  const fields = { ...defaultSupportedActorFields(HOW_TO_BE_A_HERO_PACKAGE), name, profession, notes: "Eigene Beispielperson mit 400 verteilten Startpunkten. Fertigkeiten und Geschichte darf die Runde frei ändern.", ...Object.fromEntries(HTBAH_DEFAULT_SKILLS.map((skill, index) => [htbahSkillField(skill.id), points[index]!])) };
  return { id, name, description: `${profession} · eigene Beispielperson · 400 Startpunkte`, fields: validatePackageFields(HOW_TO_BE_A_HERO_PACKAGE, fields) };
}
export const HTBAH_EXAMPLE_CHARACTERS: readonly HtbahExampleCharacter[] = deepFreeze([
  example("mara", "Mara Morgenwind", "Reisende Kartografin", [65, 45, 40, 60, 35, 25, 55, 40, 35]),
  example("taro", "Taro Fenn", "Feldarzt und Geschichtenhüter", [0, 70, 60, 55, 65, 30, 45, 0, 75]),
]);
