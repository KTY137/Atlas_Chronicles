// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
/**
 * **ChronicleHeroes** — das mitgelieferte Regelwerk von Atlas Chronicles.
 *
 * Eigenes Werk. Es steht bewusst neben `how-to-be-a-hero.ts`, das als Beispiel einer
 * *fremden* Adaption im Repository bleibt: jenes Paket ist CC BY-NC-SA 4.0 lizenziert und
 * darf deshalb nicht in einem ausgelieferten Build stecken. Dieses hier trägt dieselbe
 * Lizenz wie das übrige Produkt und ist damit auslieferbar.
 *
 * **Der Entwurf in einem Absatz.** Neun Fertigkeiten in drei Feldern. Eine Probe ist ein
 * W100 unter den Fertigkeitswert. Wer in einem Feld viel kann, bekommt daraus sein
 * *Talent* — den Wert für alles, wofür es keine eigene Fertigkeit gibt. Aus den Talenten
 * wächst die Lebenskraft und ein kleiner Vorrat an *Funken*, mit denen man einen
 * misslungenen Wurf wiederholen darf.
 *
 * **Was es gegenüber der Vorlage anders macht:**
 * 1. **Rüstung ist Teil der Regeln, nicht der Absprache.** Ein Wert von 0 bis 10. Er zieht
 *    von jedem erlittenen Schaden ab — und geht zugleich von der Initiative ab. Panzerung
 *    schützt und macht langsam; das ist die einzige echte Abwägung, die das System stellt,
 *    und sie kostet keine zusätzliche Regel.
 * 2. **Feste kritische Grenzen.** 1 bis 5 ist ein kritischer Erfolg, 96 bis 100 ein
 *    kritischer Fehlschlag — immer, für Fertigkeiten wie für Talente. Keine mit dem Wert
 *    wandernde Grenze, die man am Tisch nachrechnen muss.
 * 3. **Ein Funkenvorrat statt drei.** Ein Zähler für die ganze Figur.
 * 4. **Schaden auf W6.** Kleinere Würfel, damit Rüstung spürbar bleibt: 3 Punkte Panzerung
 *    gegen 2W6 sind eine Entscheidung, gegen 2W10 wären sie Rauschen.
 *
 * Die Zahlen sind so gewählt, dass eine frische Figur mit 360 Punkten in ihrem besten Feld
 * um die 70 erreicht, rund 60 bis 76 Lebenskraft trägt und drei Funken hat.
 */
import { type Scalar } from "../formula.ts";
import { type FieldSchema, type RuleMigration } from "../package.ts";
import { defaultSupportedActorFields, parseRulePackageV2, validatePackageFields, type ComputedField, type RuleActionV2, type RuleAssertion, type RuleAttribution, type RuleOutcome, type RulePackageV2 } from "../package-v2.ts";
import { array, deepFreeze, fail, identifier, keys, record, snapshotJson, string } from "../validation.ts";

export type ChronicleField = "koerper" | "geist" | "herz";
export interface ChronicleSkill { readonly id: string; readonly label: string; readonly field: ChronicleField }
export interface ChroniclePackageOptions { readonly skills?: readonly ChronicleSkill[]; readonly id?: string; readonly version?: string; readonly migrations?: readonly RuleMigration[] }

export const CHRONICLE_FIELDS: readonly ChronicleField[] = Object.freeze(["koerper", "geist", "herz"]);
export const CHRONICLE_FIELD_LABELS: Readonly<Record<ChronicleField, string>> = Object.freeze({ koerper: "Körper", geist: "Geist", herz: "Herz" });
/** Startpunkte einer frischen Figur. Die Runde darf sie über die Punkteanpassung verschieben. */
export const CHRONICLE_START_POINTS = 360;
/** Höchste Panzerung, die das Grundregelwerk kennt. Darüber verhandelt die Runde. */
export const CHRONICLE_MAX_ARMOUR = 10;
export const CHRONICLE_VERSION = "1.0.0";

export const CHRONICLE_DEFAULT_SKILLS: readonly ChronicleSkill[] = deepFreeze([
  { id: "athletik", label: "Athletik", field: "koerper" },
  { id: "handwerk", label: "Handwerk", field: "koerper" },
  { id: "schlagkraft", label: "Schlagkraft", field: "koerper" },
  { id: "buchwissen", label: "Buchwissen", field: "geist" },
  { id: "wahrnehmung", label: "Wahrnehmung", field: "geist" },
  { id: "feldmedizin", label: "Feldmedizin", field: "geist" },
  { id: "ueberreden", label: "Überreden", field: "herz" },
  { id: "menschenkenntnis", label: "Menschenkenntnis", field: "herz" },
  { id: "mut", label: "Mut", field: "herz" },
]);

export const CHRONICLE_ATTRIBUTION: RuleAttribution = deepFreeze({
  title: "ChronicleHeroes · Grundregeln 1.0",
  sources: [
    { title: "ChronicleHeroes — Regeln und Entwurfsbegründung", url: "https://github.com/KTY137/Atlas_Chronicles/blob/main/packages/rules/src/templates/chronicle-heroes.ts", revision: `Fassung ${CHRONICLE_VERSION}`, authors: ["Kaya Yesilyurt", "Atlas Chronicles"] },
  ],
  licenseUrl: "https://github.com/KTY137/Atlas_Chronicles/blob/main/LICENSE",
  notice: "ChronicleHeroes ist ein eigenes Regelwerk von Atlas Chronicles und steht unter derselben Lizenz wie das Produkt. Es übernimmt keine Texte, Tabellen oder Werte aus fremden Regelwerken.",
  changes: "Erstfassung. Feste kritische Grenzen (1–5 / 96–100) statt mit dem Fertigkeitswert wandernder; ein gemeinsamer Funkenvorrat statt eines je Feld; Rüstung als Regelwert, der Schaden mindert und Initiative kostet; Schaden auf W6.",
});

export const CHRONICLE_RULE_GUIDANCE = deepFreeze({
  creation: `${CHRONICLE_START_POINTS} Startpunkte auf neun Fertigkeiten. Kein Wert darf über 100 steigen, den Talentbonus eingerechnet. Vorteile, Nachteile und Entwicklung hält die Runde über die vereinbarte Punkteanpassung fest; übrige Punkte dürfen offen bleiben.`,
  talent: "Talent eines Feldes: die Summe seiner drei Fertigkeiten geteilt durch zehn, gerundet. Es ist der Wert für alles, wofür keine Fertigkeit eingetragen ist, und der Bonus, den eine gelernte Fertigkeit obendrauf bekommt.",
  probe: "Probe: ein W100 unter oder gleich dem Wert. 1 bis 5 gelingt kritisch, 96 bis 100 misslingt kritisch — unabhängig vom Wert. Eine Fertigkeit ohne Punkte wird nicht gewürfelt; dafür steht das Talent ihres Feldes.",
  health: "Lebenskraft: 40 plus das doppelte Körper-Talent. Bei 0 ist die Figur außer Gefecht; was das erzählerisch heißt, entscheidet die Runde. Ein Wurf verändert die Lebenskraft nie von selbst.",
  armour: `Rüstung 0 bis ${CHRONICLE_MAX_ARMOUR}. Sie zieht von jedem erlittenen Schaden ab und ebenso von der Initiative. Wer sich panzert, hält mehr aus und kommt später dran.`,
  initiative: "Initiative: 1W10 plus Körper-Talent minus Rüstung. Höhere Ergebnisse handeln zuerst; Gleichstände entscheidet die Runde.",
  damage: "Schaden: gewählte 1 bis 8 W6 plus abgesprochener Bonus. Ein kritischer Treffer verdoppelt diese Summe. Erst danach zieht die Rüstung des Ziels ab; unter null wird nicht gezählt. Der Wurf verändert keine Lebenskraft automatisch.",
  funken: "Funken: gerundet ein Zwölftel der Summe aller drei Talente. Ein Funke erlaubt, eine misslungene, nicht kritisch misslungene Probe zu wiederholen. Erst den Funken im Bogen ausgeben und speichern, dann neu würfeln; beide Belege bleiben. Zu Beginn eines Abenteuers füllt die Runde den Vorrat ausdrücklich auf.",
});

/** IDs sind stabile Katalogkennungen; ein geänderter Name ändert nie einen gespeicherten Schlüssel. */
export function parseChronicleSkills(input: unknown): readonly ChronicleSkill[] {
  const items = array(snapshotJson(input), "skill catalogue", 24);
  if (!items.length) fail("skill catalogue: 1–24 skills required");
  const seen = new Set<string>();
  return deepFreeze(items.map(item => {
    const row = record(item, "skill"); keys(row, ["id", "label", "field"], "skill");
    const id = identifier(row.id, "skill.id");
    if (id.length > 48) fail("skill.id: maximum 48 characters");
    if (seen.has(id)) fail("skill catalogue: duplicate id");
    seen.add(id);
    const label = string(row.label, "skill.label", 80);
    if (!CHRONICLE_FIELDS.includes(row.field as ChronicleField)) fail("skill: unknown field");
    return { id, label, field: row.field as ChronicleField };
  }));
}

export const chronicleSkillField = (id: string): string => `skill_${id}`;
export const chronicleBonusField = (id: string): string => `bonus_${id}`;
export const CHRONICLE_ARMOUR_FIELD = "ruestung";
export const CHRONICLE_FUNKEN_FIELD = "funken_spent";

/** Ausgewogene Summen halten auch 24 lange IDs unter der eingefrorenen AST-Tiefe. */
function sum(items: readonly string[]): string {
  if (!items.length) return "0";
  if (items.length === 1) return items[0]!;
  const half = Math.ceil(items.length / 2);
  return `(${sum(items.slice(0, half))} + ${sum(items.slice(half))})`;
}
const integerField = (label: string, minimum: number, maximum: number, value = 0): FieldSchema => ({ type: "integer", label, default: value, minimum, maximum });
const textField = (label: string, maxLength: number): FieldSchema => ({ type: "string", label, default: "", maxLength });
const booleanField = (label: string, value: boolean): FieldSchema => ({ type: "boolean", label, default: value });

/**
 * Dieselben Banden für jede Probe. Der kritische Erfolg ist zusätzlich an den Wert gebunden:
 * wer nichts kann, gelingt auch mit einer 3 nicht kritisch — sonst wäre eine ungelernte
 * Talentprobe mit Talent 0 die verlässlichste Quelle kritischer Erfolge im ganzen System.
 */
function probeOutcome(target: string): RuleOutcome {
  return { bands: [
    { id: "critical_failure", label: "Kritisch misslungen", comparison: "gte", expression: "96", success: false },
    { id: "critical_success", label: "Kritisch gelungen", comparison: "lte", expression: `min(5, ${target})`, success: true },
    { id: "success", label: "Gelungen", comparison: "lte", expression: target, success: true },
  ], fallback: { id: "failure", label: "Misslungen", success: false } };
}

export function createChronicleHeroesPackage(options: ChroniclePackageOptions = {}): RulePackageV2 {
  const skills = parseChronicleSkills(options.skills ?? CHRONICLE_DEFAULT_SKILLS);
  const raw = (skill: ChronicleSkill) => `actor.${chronicleSkillField(skill.id)}`;
  const talent = (field: ChronicleField) => `round(${sum(skills.filter(skill => skill.field === field).map(raw))} / 10)`;
  const effective = (skill: ChronicleSkill) => `(${raw(skill)} + if(actor.${chronicleBonusField(skill.id)}, ${talent(skill.field)}, 0))`;
  const armour = `actor.${CHRONICLE_ARMOUR_FIELD}`;
  const vitality = `40 + 2 * (${talent("koerper")})`;
  const funkenMax = `round((${CHRONICLE_FIELDS.map(field => `(${talent(field)})`).join(" + ")}) / 12)`;

  const fields: Record<string, FieldSchema> = {
    name: textField("Name", 120),
    profession: textField("Beruf / Rolle", 120),
    notes: textField("Notizen / Absprachen", 4096),
    lebenskraft: integerField("Lebenskraft", 0, 200, 40),
    [CHRONICLE_ARMOUR_FIELD]: integerField("Rüstung", 0, CHRONICLE_MAX_ARMOUR),
    [CHRONICLE_FUNKEN_FIELD]: integerField("Ausgegebene Funken", 0, 24),
    budget_adjustment: integerField("Vereinbarte Punkteanpassung", -CHRONICLE_START_POINTS, 1_000_000),
  };
  const computed: ComputedField[] = [];
  const constraints: RuleAssertion[] = [];
  const actions: RuleActionV2[] = [];
  const baseAction = { version: "1.0.0", requiresConfirmation: true as const, inputs: {} };

  for (const field of CHRONICLE_FIELDS) {
    computed.push({ id: `talent_${field}`, label: `Talent · ${CHRONICLE_FIELD_LABELS[field]}`, expression: talent(field) });
  }
  for (const skill of skills) {
    fields[chronicleSkillField(skill.id)] = integerField(`${skill.label} · Punkte`, 0, 100);
    fields[chronicleBonusField(skill.id)] = booleanField(`${skill.label} · Talentbonus`, true);
    computed.push({ id: `effective_${skill.id}`, label: `${skill.label} · Wert`, expression: effective(skill) });
    constraints.push({ id: `skill_valid_${skill.id}`, message: `${skill.label}: Wert über 100. Punkte umverteilen oder den Talentbonus ausdrücklich abwählen.`, expression: `${effective(skill)} <= 100` });
    actions.push({ ...baseAction, id: `skill_${skill.id}`, name: skill.label, expression: "1d100",
      disclosure: `Fertigkeitsprobe ${CHRONICLE_FIELD_LABELS[skill.field]}: gespeicherte Punkte plus gewählter Talentbonus; ein W100. ${CHRONICLE_RULE_GUIDANCE.probe} Ohne Modifikator.`,
      preconditions: [{ id: "learned", message: "Diese Fertigkeit hat keine Punkte. Stattdessen die Talentprobe ihres Feldes wählen.", expression: `${raw(skill)} > 0` }],
      outcome: probeOutcome(effective(skill)) });
  }
  computed.push(
    { id: "lebenskraft_max", label: "Lebenskraft · Höchstwert", expression: vitality },
    { id: "funken_max", label: "Funken gesamt", expression: funkenMax },
    { id: "funken_remaining", label: "Funken übrig", expression: `${funkenMax} - actor.${CHRONICLE_FUNKEN_FIELD}` },
    { id: "initiative_value", label: "Initiative · Zuschlag", expression: `(${talent("koerper")}) - ${armour}` },
    { id: "points_spent", label: "Verteilte Punkte", expression: sum(skills.map(raw)) },
    { id: "points_available", label: "Noch verfügbare Punkte", expression: `${CHRONICLE_START_POINTS} + actor.budget_adjustment - ${sum(skills.map(raw))}` },
  );
  constraints.push({ id: "funken_valid", message: "Ausgegebene Funken übersteigen den abgeleiteten Vorrat. Ausgabe ausdrücklich korrigieren.", expression: `actor.${CHRONICLE_FUNKEN_FIELD} <= ${funkenMax}` });

  for (const field of CHRONICLE_FIELDS) {
    actions.push({ ...baseAction, id: `talent_${field}`, name: `Talent · ${CHRONICLE_FIELD_LABELS[field]}`, expression: "1d100",
      disclosure: `Ein W100 auf das Talent ${CHRONICLE_FIELD_LABELS[field]}. ${CHRONICLE_RULE_GUIDANCE.talent} ${CHRONICLE_RULE_GUIDANCE.probe}`,
      outcome: probeOutcome(talent(field)) });
  }
  actions.push({ ...baseAction, id: "initiative", name: "Initiative", expression: `1d10 + (${talent("koerper")}) - ${armour}`, disclosure: `${CHRONICLE_RULE_GUIDANCE.initiative} ${CHRONICLE_RULE_GUIDANCE.armour}` });

  let dice = "8d6";
  for (let count = 7; count >= 1; count--) dice = `if(input.dice_count == ${count}, ${count}d6, ${dice})`;
  actions.push({ ...baseAction, id: "schaden", name: "Schaden", expression: `max(0, (${dice} + input.bonus) * if(input.critical, 2, 1) - input.ziel_ruestung)`,
    inputs: {
      dice_count: integerField("Anzahl W6", 1, 8, 1),
      bonus: integerField("Abgesprochener Schadensbonus", 0, 50),
      critical: booleanField("Kritischer Treffer", false),
      ziel_ruestung: integerField("Rüstung des Ziels", 0, CHRONICLE_MAX_ARMOUR),
    },
    disclosure: `${CHRONICLE_RULE_GUIDANCE.damage} ${CHRONICLE_RULE_GUIDANCE.health}` });

  actions.push({ ...baseAction, id: "manual_ruling", name: "Abgesprochene Probe", expression: "1d100",
    inputs: {
      target: { type: "number", label: "Abgesprochener Endwert", default: 50, minimum: 0, maximum: 100 },
      critical_success_max: { type: "number", label: "Kritischer Erfolg bis", default: 5, minimum: 0, maximum: 99 },
      critical_failure_min: { type: "number", label: "Kritischer Fehlschlag ab", default: 96, minimum: 1, maximum: 100 },
    },
    disclosure: "Absprache der Spielleitung: Endwert und kritische Grenzen ausdrücklich festlegen. Die Eingaben bleiben im Beleg stehen.",
    outcome: { bands: [
      { id: "critical_failure", label: "Kritisch misslungen", comparison: "gte", expression: "input.critical_failure_min", success: false },
      { id: "critical_success", label: "Kritisch gelungen", comparison: "lte", expression: "min(input.critical_success_max, input.target)", success: true },
      { id: "success", label: "Gelungen", comparison: "lte", expression: "input.target", success: true },
    ], fallback: { id: "failure", label: "Misslungen", success: false } } });

  return parseRulePackageV2({
    schemaVersion: 2,
    id: options.id ?? "de.atlaschronicles.chronicleheroes",
    name: "ChronicleHeroes",
    version: options.version ?? CHRONICLE_VERSION,
    engineVersion: "1.0.0",
    license: "BUSL-1.1",
    authors: ["Kaya Yesilyurt", "Atlas Chronicles"],
    fields,
    layout: { sections: [
      { id: "character", label: "Figur und Absprachen", fields: ["name", "profession", "notes", "budget_adjustment"] },
      { id: "koerperwerte", label: "Lebenskraft, Rüstung und Funken", fields: ["lebenskraft", CHRONICLE_ARMOUR_FIELD, CHRONICLE_FUNKEN_FIELD] },
      ...CHRONICLE_FIELDS.map(field => ({ id: field, label: CHRONICLE_FIELD_LABELS[field], fields: skills.filter(skill => skill.field === field).flatMap(skill => [chronicleSkillField(skill.id), chronicleBonusField(skill.id)]) })),
    ] },
    actions, computed, constraints,
    vitals: [
      // Der Höchstwert wächst mit dem Körper-Talent; der Funkenzähler ist ausdrücklich KEIN
      // Vitalwert — ein leerer Vorrat ist kein Ausfall, sondern nur ein leerer Vorrat.
      { id: "lebenskraft", label: "Lebenskraft", max: vitality, depletion: "defeat" as const },
    ],
    attribution: CHRONICLE_ATTRIBUTION,
    migrations: options.migrations ?? [],
    selfTests: [
      { name: "Talent 0: W100 21 misslingt", actionId: "talent_koerper", context: { seed: "00000001000000020000000300000004", actor: {}, input: {}, knowledge: { actorId: "selftest", passages: [] } }, expectedTotal: 21, expectedSuccess: false, expectedOutcomeId: "failure" },
      { name: "Initiative ohne Talent und ohne Rüstung: W10 1", actionId: "initiative", context: { seed: "00000001000000020000000300000004", actor: {}, input: {}, knowledge: { actorId: "selftest", passages: [] } }, expectedTotal: 1 },
    ],
  });
}

export const CHRONICLE_HEROES_PACKAGE = createChronicleHeroesPackage();

export interface ChronicleExampleCharacter { readonly id: string; readonly name: string; readonly description: string; readonly fields: Readonly<Record<string, Scalar>> }
function example(id: string, name: string, profession: string, points: readonly number[], ruestung: number): ChronicleExampleCharacter {
  const fields = {
    ...defaultSupportedActorFields(CHRONICLE_HEROES_PACKAGE), name, profession,
    notes: `Beispielperson mit ${CHRONICLE_START_POINTS} verteilten Startpunkten. Fertigkeiten, Rüstung und Geschichte darf die Runde frei ändern.`,
    [CHRONICLE_ARMOUR_FIELD]: ruestung,
    ...Object.fromEntries(CHRONICLE_DEFAULT_SKILLS.map((skill, index) => [chronicleSkillField(skill.id), points[index]!])),
  };
  return { id, name, description: `${profession} · ${CHRONICLE_START_POINTS} Startpunkte · Rüstung ${ruestung}`, fields: validatePackageFields(CHRONICLE_HEROES_PACKAGE, fields) };
}
export const CHRONICLE_EXAMPLE_CHARACTERS: readonly ChronicleExampleCharacter[] = deepFreeze([
  // Gepanzert und langsam: Rüstung 4 schluckt Schaden und kostet vier Punkte Initiative.
  example("brand", "Brandt Eisenhand", "Karawanenwache", [70, 45, 65, 20, 40, 25, 30, 35, 30], 4),
  // Ungepanzert und schnell: dieselben 360 Punkte, in Geist und Herz gelegt.
  example("liva", "Liva Sonnenrahm", "Wanderärztin und Vermittlerin", [25, 35, 15, 60, 55, 70, 55, 25, 20], 0),
]);
