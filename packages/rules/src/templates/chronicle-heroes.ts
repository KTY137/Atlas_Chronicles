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
import { defaultSupportedActorFields, parseRulePackageV2, validatePackageFields, type ComputedField, type RuleAbility, type RuleActionV2, type RuleAssertion, type RuleAttribution, type RuleCondition, type RuleModifier, type RuleOutcome, type RulePackageV2 } from "../package-v2.ts";
import { array, deepFreeze, fail, identifier, keys, record, snapshotJson, string } from "../validation.ts";
import { CHRONICLE_ABILITY_LIBRARY, CHRONICLE_CONDITIONS, type ChronicleAbilityEntry, type ChronicleEffect } from "./chronicle-heroes-faehigkeiten.ts";

export type ChronicleField = "koerper" | "geist" | "herz";
export interface ChronicleSkill { readonly id: string; readonly label: string; readonly field: ChronicleField }
export interface ChroniclePackageOptions { readonly skills?: readonly ChronicleSkill[]; readonly id?: string; readonly version?: string; readonly migrations?: readonly RuleMigration[] }

export const CHRONICLE_FIELDS: readonly ChronicleField[] = Object.freeze(["koerper", "geist", "herz"]);
export const CHRONICLE_FIELD_LABELS: Readonly<Record<ChronicleField, string>> = Object.freeze({ koerper: "Körper", geist: "Geist", herz: "Herz" });
/** Startpunkte einer frischen Figur. Die Runde darf sie über die Punkteanpassung verschieben. */
export const CHRONICLE_START_POINTS = 360;
/** Höchste Panzerung, die das Grundregelwerk kennt. Darüber verhandelt die Runde. */
export const CHRONICLE_MAX_ARMOUR = 10;
export const CHRONICLE_VERSION = "2.0.0";
/** Bogenfelder von 2.0: Erfahrung, der auf Fertigkeiten gelegte Teil, gelernte Fähigkeiten, aktive Zustände. */
export const CHRONICLE_XP_FIELD = "erfahrung";
export const CHRONICLE_XP_SKILLS_FIELD = "erfahrung_fertigkeiten";
export const CHRONICLE_ABILITY_FIELD = "faehigkeiten";
export const CHRONICLE_CONDITION_FIELD = "zustaende";
/** Erfahrung, mit der eine frische Figur ihre ersten drei Fähigkeiten vom Rang 1 bezahlt. */
export const CHRONICLE_START_ABILITY_BUDGET = 9;
/** Punkte je auf Fertigkeiten gelegter Erfahrung. */
export const CHRONICLE_POINTS_PER_XP = 5;

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


/**
 * **Die Sammlung: einhundert Fertigkeiten zur Auswahl.**
 *
 * Eine Runde aktiviert davon bis zu 24 — nicht aus Geschmack, sondern weil die Regelmaschine
 * höchstens 64 Bogenfelder je Paket trägt (`RULE_LIMITS.fields`) und jede Fertigkeit zwei davon
 * belegt: ihre Punkte und ihren Talentbonus. Die Sammlung ist deshalb ein Vorrat, aus dem die
 * Spielleitung den Katalog ihrer Welt zusammenstellt — kein Bogen, den jemand ausfüllt.
 *
 * Genau deshalb rechnet das Talent mit dem Durchschnitt seines Feldes statt mit der Summe: ein
 * Katalog mit drei Fertigkeiten je Feld und einer mit acht ergeben dieselben Talentwerte.
 */
export const CHRONICLE_SKILL_LIBRARY: readonly ChronicleSkill[] = deepFreeze([
  { id: "athletik", label: "Athletik", field: "koerper" },
  { id: "klettern", label: "Klettern", field: "koerper" },
  { id: "schwimmen", label: "Schwimmen", field: "koerper" },
  { id: "laufen", label: "Laufen", field: "koerper" },
  { id: "springen", label: "Springen", field: "koerper" },
  { id: "balancieren", label: "Balancieren", field: "koerper" },
  { id: "schleichen", label: "Schleichen", field: "koerper" },
  { id: "verstecken", label: "Verstecken", field: "koerper" },
  { id: "zaehigkeit", label: "Zähigkeit", field: "koerper" },
  { id: "ausweichen", label: "Ausweichen", field: "koerper" },
  { id: "schlagkraft", label: "Schlagkraft", field: "koerper" },
  { id: "fechten", label: "Fechten", field: "koerper" },
  { id: "ringen", label: "Ringen", field: "koerper" },
  { id: "bogenschiessen", label: "Bogenschießen", field: "koerper" },
  { id: "werfen", label: "Werfen", field: "koerper" },
  { id: "schildkampf", label: "Schildkampf", field: "koerper" },
  { id: "reiten", label: "Reiten", field: "koerper" },
  { id: "fahren", label: "Fahren", field: "koerper" },
  { id: "segeln", label: "Segeln", field: "koerper" },
  { id: "handwerk", label: "Handwerk", field: "koerper" },
  { id: "schmieden", label: "Schmieden", field: "koerper" },
  { id: "zimmern", label: "Zimmern", field: "koerper" },
  { id: "steinmetzarbeit", label: "Steinmetzarbeit", field: "koerper" },
  { id: "lederarbeit", label: "Lederarbeit", field: "koerper" },
  { id: "weben", label: "Weben", field: "koerper" },
  { id: "schloesser_oeffnen", label: "Schlösser öffnen", field: "koerper" },
  { id: "fallen_stellen", label: "Fallen stellen", field: "koerper" },
  { id: "taschendiebstahl", label: "Taschendiebstahl", field: "koerper" },
  { id: "kochen", label: "Kochen", field: "koerper" },
  { id: "jagen", label: "Jagen", field: "koerper" },
  { id: "fischen", label: "Fischen", field: "koerper" },
  { id: "graben", label: "Graben", field: "koerper" },
  { id: "seilkunde", label: "Seilkunde", field: "koerper" },
  { id: "feuer_machen", label: "Feuer machen", field: "koerper" },

  { id: "buchwissen", label: "Buchwissen", field: "geist" },
  { id: "wahrnehmung", label: "Wahrnehmung", field: "geist" },
  { id: "feldmedizin", label: "Feldmedizin", field: "geist" },
  { id: "heilkunde", label: "Heilkunde", field: "geist" },
  { id: "kraeuterkunde", label: "Kräuterkunde", field: "geist" },
  { id: "giftkunde", label: "Giftkunde", field: "geist" },
  { id: "tierkunde", label: "Tierkunde", field: "geist" },
  { id: "pflanzenkunde", label: "Pflanzenkunde", field: "geist" },
  { id: "gesteinskunde", label: "Gesteinskunde", field: "geist" },
  { id: "wetterkunde", label: "Wetterkunde", field: "geist" },
  { id: "sternkunde", label: "Sternkunde", field: "geist" },
  { id: "geschichte", label: "Geschichte", field: "geist" },
  { id: "rechtskunde", label: "Rechtskunde", field: "geist" },
  { id: "glaubenslehre", label: "Glaubenslehre", field: "geist" },
  { id: "sprachen", label: "Sprachen", field: "geist" },
  { id: "schreiben", label: "Schreiben", field: "geist" },
  { id: "rechnen", label: "Rechnen", field: "geist" },
  { id: "kartenkunde", label: "Kartenkunde", field: "geist" },
  { id: "orientierung", label: "Orientierung", field: "geist" },
  { id: "spurenlesen", label: "Spurenlesen", field: "geist" },
  { id: "schaetzen", label: "Schätzen", field: "geist" },
  { id: "mechanik", label: "Mechanik", field: "geist" },
  { id: "baukunst", label: "Baukunst", field: "geist" },
  { id: "bergbau", label: "Bergbau", field: "geist" },
  { id: "seefahrt", label: "Seefahrt", field: "geist" },
  { id: "kriegskunst", label: "Kriegskunst", field: "geist" },
  { id: "entschluesseln", label: "Entschlüsseln", field: "geist" },
  { id: "faelschung_erkennen", label: "Fälschung erkennen", field: "geist" },
  { id: "gedaechtnis", label: "Gedächtnis", field: "geist" },
  { id: "konzentration", label: "Konzentration", field: "geist" },
  { id: "planen", label: "Planen", field: "geist" },
  { id: "beobachten", label: "Beobachten", field: "geist" },
  { id: "lauschen", label: "Lauschen", field: "geist" },

  { id: "ueberreden", label: "Überreden", field: "herz" },
  { id: "menschenkenntnis", label: "Menschenkenntnis", field: "herz" },
  { id: "mut", label: "Mut", field: "herz" },
  { id: "auftreten", label: "Auftreten", field: "herz" },
  { id: "verhandeln", label: "Verhandeln", field: "herz" },
  { id: "feilschen", label: "Feilschen", field: "herz" },
  { id: "luegen", label: "Lügen", field: "herz" },
  { id: "einschuechtern", label: "Einschüchtern", field: "herz" },
  { id: "beruhigen", label: "Beruhigen", field: "herz" },
  { id: "troesten", label: "Trösten", field: "herz" },
  { id: "anfuehren", label: "Anführen", field: "herz" },
  { id: "befehlen", label: "Befehlen", field: "herz" },
  { id: "aufmuntern", label: "Aufmuntern", field: "herz" },
  { id: "erzaehlen", label: "Erzählen", field: "herz" },
  { id: "singen", label: "Singen", field: "herz" },
  { id: "musizieren", label: "Musizieren", field: "herz" },
  { id: "tanzen", label: "Tanzen", field: "herz" },
  { id: "schauspiel", label: "Schauspiel", field: "herz" },
  { id: "dichten", label: "Dichten", field: "herz" },
  { id: "zeichnen", label: "Zeichnen", field: "herz" },
  { id: "gastfreundschaft", label: "Gastfreundschaft", field: "herz" },
  { id: "benehmen", label: "Benehmen", field: "herz" },
  { id: "markthandel", label: "Markthandel", field: "herz" },
  { id: "geruechte_sammeln", label: "Gerüchte sammeln", field: "herz" },
  { id: "beziehungen_pflegen", label: "Beziehungen pflegen", field: "herz" },
  { id: "selbstbeherrschung", label: "Selbstbeherrschung", field: "herz" },
  { id: "willenskraft", label: "Willenskraft", field: "herz" },
  { id: "glaube", label: "Glaube", field: "herz" },
  { id: "tiere_beruhigen", label: "Tiere beruhigen", field: "herz" },
  { id: "umgang_mit_kindern", label: "Umgang mit Kindern", field: "herz" },
  { id: "verzeihen", label: "Verzeihen", field: "herz" },
  { id: "streit_schlichten", label: "Streit schlichten", field: "herz" },
  { id: "werben", label: "Werben", field: "herz" },
]);
/** Wie viele Fertigkeiten ein Katalog gleichzeitig trägt; darüber reißt das Feldbudget. */
export const CHRONICLE_MAX_SKILLS = 24;

export const CHRONICLE_ATTRIBUTION: RuleAttribution = deepFreeze({
  title: "ChronicleHeroes · Grundregeln 2.0",
  sources: [
    { title: "ChronicleHeroes — Regeln und Entwurfsbegründung", url: "https://github.com/KTY137/Atlas_Chronicles/blob/main/packages/rules/src/templates/chronicle-heroes.ts", revision: `Fassung ${CHRONICLE_VERSION}`, authors: ["Kaya Yesilyurt", "Atlas Chronicles"] },
  ],
  licenseUrl: "https://github.com/KTY137/Atlas_Chronicles/blob/main/LICENSE",
  notice: "ChronicleHeroes ist ein eigenes Regelwerk von Atlas Chronicles und steht unter derselben Lizenz wie das Produkt. Es übernimmt keine Texte, Tabellen oder Werte aus fremden Regelwerken.",
  changes: "1.0: feste kritische Grenzen (1–5 / 96–100) statt mit dem Fertigkeitswert wandernder; ein gemeinsamer Funkenvorrat statt eines je Feld; Rüstung als Regelwert, der Schaden mindert und Initiative kostet; Schaden auf W6. 2.0: 200 Fähigkeiten in Ketten vom Rang 1 bis 3, zwölf Zustände, Aufstieg über Erfahrung, zwölf Archetypen.",
});

export const CHRONICLE_RULE_GUIDANCE = deepFreeze({
  creation: `${CHRONICLE_START_POINTS} Startpunkte auf die Fertigkeiten und drei Fähigkeiten vom Rang 1. Kein Wert darf über 100 steigen, den Talentbonus eingerechnet. Wer schnell starten will, nimmt einen Archetyp und ändert danach, was nicht passt; übrige Punkte dürfen offen bleiben.`,
  faehigkeiten: "Fähigkeiten: 200 zur Auswahl, in Ketten vom Rang 1 bis 3. Rang 1 kostet 3 Erfahrung, Rang 2 kostet 5, Rang 3 kostet 8. Ein höherer Rang verlangt die Stufe darunter und mehr Punkte in der zugehörigen Fertigkeit: 30, 50, 70. Dauerhafte Fähigkeiten wirken immer. Einsatz-Fähigkeiten wählt man beim Wurf und hakt ihre Funken am Bogen ab; Reaktionen ebenso, auch außerhalb des eigenen Zugs.",
  zustaende: "Zustände: die Spielleitung hakt sie am Bogen an. Sie rechnen bei jedem passenden Wurf mit, bis sie wieder abgehakt sind.",
  aufstieg: `Aufstieg: nach jedem Abend 1 bis 3 Erfahrung. Jede auf Fertigkeiten gelegte Erfahrung gibt ${CHRONICLE_POINTS_PER_XP} Punkte; die übrige bezahlt Fähigkeiten. Zum Start gibt es ${CHRONICLE_START_ABILITY_BUDGET} Erfahrung nur für Fähigkeiten — genug für drei vom Rang 1. Allgemeine Fähigkeiten vom Rang 2 verlangen 6 gesammelte Erfahrung, vom Rang 3 zwölf.`,
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
  const items = array(snapshotJson(input), "skill catalogue", CHRONICLE_MAX_SKILLS);
  if (!items.length) fail(`skill catalogue: 1–${CHRONICLE_MAX_SKILLS} skills required`);
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

/**
 * Die symbolischen Ziele einer Wirkung, gegen den Katalog der Runde aufgelöst. Eine fehlende Fertigkeit
 * lenkt auf die Talentprobe ihres Feldes um — innerhalb einer Fähigkeit nur einmal, sonst stapelte
 * „+5 auf Klettern, Springen und Balancieren" ohne diese drei Fertigkeiten zu +15 auf das Talent.
 */
function modifiersFor(effects: readonly ChronicleEffect[], skills: readonly ChronicleSkill[], at: string): RuleModifier[] {
  const fieldOf = (id: string): ChronicleField => CHRONICLE_SKILL_LIBRARY.find(skill => skill.id === id)?.field ?? fail(`${at}: unknown skill ${id}`);
  const umgelenkt = new Set<string>(), modifiers: RuleModifier[] = [];
  for (const effect of effects) {
    let actions: string[];
    if (effect.ziel === "schaden" || effect.ziel === "initiative") actions = [effect.ziel];
    else if (effect.ziel === "proben") actions = ["skill_*", "talent_*"];
    else if (effect.ziel === "talente") actions = ["talent_*"];
    else if (effect.ziel.startsWith("feld:")) {
      const feld = effect.ziel.slice(5) as ChronicleField;
      actions = [...skills.filter(skill => skill.field === feld).map(skill => `skill_${skill.id}`), `talent_${feld}`];
    } else {
      const id = effect.ziel.slice("fertigkeit:".length), feld = fieldOf(id);
      if (skills.some(skill => skill.id === id)) actions = [`skill_${id}`];
      else if (umgelenkt.has(`${effect.art}:${feld}`)) continue;
      else { umgelenkt.add(`${effect.art}:${feld}`); actions = [`talent_${feld}`]; }
    }
    for (let start = 0; start < actions.length; start += 16) modifiers.push({ actions: actions.slice(start, start + 16), target: effect.art, value: String(effect.wert) });
  }
  if (modifiers.length > 4) fail(`${at}: too many modifier groups for this skill catalogue`);
  return modifiers;
}
const XP_THRESHOLDS = [0, 6, 12] as const;
function abilityFor(entry: ChronicleAbilityEntry, skills: readonly ChronicleSkill[], talent: (field: ChronicleField) => string): RuleAbility {
  let prerequisite: string | undefined;
  if (entry.fertigkeit) {
    const skill = CHRONICLE_SKILL_LIBRARY.find(candidate => candidate.id === entry.fertigkeit) ?? fail(`ability ${entry.id}: unknown skill ${entry.fertigkeit}`);
    // Ohne die Fertigkeit im Katalog zählt das Talent ihres Feldes, mit einem Drittel der Punkte —
    // dieselbe Umrechnung, mit der das Talent aus den Fertigkeiten entsteht.
    prerequisite = skills.some(candidate => candidate.id === skill.id) ? `actor.${chronicleSkillField(skill.id)} >= ${entry.mindestens}` : `(${talent(skill.field)}) >= ${Math.round(entry.mindestens! / 3)}`;
  } else if (entry.rang > 1) prerequisite = `actor.${CHRONICLE_XP_FIELD} >= ${XP_THRESHOLDS[entry.rang - 1]}`;
  const modifiers = modifiersFor(entry.wirkungen, skills, `ability ${entry.id}`);
  const group = entry.feld === "allgemein" ? `Allgemein · ${entry.gruppe}` : `${CHRONICLE_FIELD_LABELS[entry.feld]} · ${entry.gruppe}`;
  return { id: entry.id, name: entry.name, group, rank: entry.rang, kind: entry.kind, cost: entry.funken, price: entry.preis,
    ...(entry.vorstufe ? { requires: [entry.vorstufe] } : {}), ...(prerequisite ? { prerequisite } : {}), text: entry.text, ...(modifiers.length ? { modifiers } : {}) };
}
/** 1.0 → 2.0 fügt die vier Bogenfelder hinzu; nichts Bestehendes ändert seine Bedeutung. */
export const CHRONICLE_MIGRATION_1_TO_2: RuleMigration = deepFreeze({ from: "1.0.0", to: "2.0.0", steps: [
  { kind: "add", field: CHRONICLE_XP_FIELD, value: 0 }, { kind: "add", field: CHRONICLE_XP_SKILLS_FIELD, value: 0 },
  { kind: "add", field: CHRONICLE_ABILITY_FIELD, value: "" }, { kind: "add", field: CHRONICLE_CONDITION_FIELD, value: "" },
] });

export function createChronicleHeroesPackage(options: ChroniclePackageOptions = {}): RulePackageV2 {
  const skills = parseChronicleSkills(options.skills ?? CHRONICLE_DEFAULT_SKILLS);
  const raw = (skill: ChronicleSkill) => `actor.${chronicleSkillField(skill.id)}`;
  // Durchschnitt des Feldes, geteilt durch drei: derselbe Talentwert bei drei wie bei acht
  // Fertigkeiten je Feld. Ein leeres Feld trägt kein Talent statt einer Division durch null.
  const talent = (field: ChronicleField) => { const own = skills.filter(skill => skill.field === field); return own.length ? `round(${sum(own.map(raw))} / ${own.length * 3})` : "0"; };
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
    [CHRONICLE_XP_FIELD]: integerField("Erfahrung gesamt", 0, 999),
    [CHRONICLE_XP_SKILLS_FIELD]: integerField("Davon auf Fertigkeiten gelegt", 0, 999),
    [CHRONICLE_ABILITY_FIELD]: textField("Fähigkeiten", 4096),
    [CHRONICLE_CONDITION_FIELD]: textField("Zustände", 1024),
  };
  // Die Parameter, über die Fähigkeiten und Zustände wirken. Die Engine setzt `mod_*` selbst; von Hand
  // übergeben zählt nicht. `einsatz` nennt die gewählten Einsatz- und Reaktionsfähigkeiten.
  const einsatz = textField("Eingesetzte Fähigkeiten", 512);
  const probeInputs = { einsatz, mod_ziel: integerField("Erleichterung aus Fähigkeiten und Zuständen", -60, 60) };
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
    actions.push({ ...baseAction, id: `skill_${skill.id}`, name: skill.label, expression: "1d100", inputs: probeInputs,
      disclosure: `Fertigkeitsprobe ${CHRONICLE_FIELD_LABELS[skill.field]}: gespeicherte Punkte plus gewählter Talentbonus, dazu Fähigkeiten und Zustände; ein W100. ${CHRONICLE_RULE_GUIDANCE.probe}`,
      preconditions: [{ id: "learned", message: "Diese Fertigkeit hat keine Punkte. Stattdessen die Talentprobe ihres Feldes wählen.", expression: `${raw(skill)} > 0` }],
      outcome: probeOutcome(`(${effective(skill)} + input.mod_ziel)`) });
  }
  computed.push(
    { id: "lebenskraft_max", label: "Lebenskraft · Höchstwert", expression: vitality },
    { id: "funken_max", label: "Funken gesamt", expression: funkenMax },
    { id: "funken_remaining", label: "Funken übrig", expression: `${funkenMax} - actor.${CHRONICLE_FUNKEN_FIELD}` },
    { id: "initiative_value", label: "Initiative · Zuschlag", expression: `(${talent("koerper")}) - ${armour}` },
    { id: "points_spent", label: "Verteilte Punkte", expression: sum(skills.map(raw)) },
    { id: "points_available", label: "Noch verfügbare Punkte", expression: `${CHRONICLE_START_POINTS} + actor.budget_adjustment + ${CHRONICLE_POINTS_PER_XP} * actor.${CHRONICLE_XP_SKILLS_FIELD} - ${sum(skills.map(raw))}` },
  );
  constraints.push({ id: "funken_valid", message: "Ausgegebene Funken übersteigen den abgeleiteten Vorrat. Ausgabe ausdrücklich korrigieren.", expression: `actor.${CHRONICLE_FUNKEN_FIELD} <= ${funkenMax}` });
  constraints.push({ id: "erfahrung_valid", message: "Auf Fertigkeiten ist mehr Erfahrung gelegt, als die Figur gesammelt hat.", expression: `actor.${CHRONICLE_XP_SKILLS_FIELD} <= actor.${CHRONICLE_XP_FIELD}` });

  for (const field of CHRONICLE_FIELDS) {
    actions.push({ ...baseAction, id: `talent_${field}`, name: `Talent · ${CHRONICLE_FIELD_LABELS[field]}`, expression: "1d100", inputs: probeInputs,
      disclosure: `Ein W100 auf das Talent ${CHRONICLE_FIELD_LABELS[field]}, dazu Fähigkeiten und Zustände. ${CHRONICLE_RULE_GUIDANCE.talent} ${CHRONICLE_RULE_GUIDANCE.probe}`,
      outcome: probeOutcome(`((${talent(field)}) + input.mod_ziel)`) });
  }
  actions.push({ ...baseAction, id: "initiative", name: "Initiative", expression: `1d10 + (${talent("koerper")}) - ${armour} + input.mod_ergebnis`,
    inputs: { einsatz, mod_ergebnis: integerField("Zuschlag aus Fähigkeiten und Zuständen", -20, 20) },
    disclosure: `${CHRONICLE_RULE_GUIDANCE.initiative} ${CHRONICLE_RULE_GUIDANCE.armour} Fähigkeiten und Zustände rechnen mit.` });

  let dice = "8d6";
  for (let count = 7; count >= 1; count--) dice = `if(input.dice_count == ${count}, ${count}d6, ${dice})`;
  actions.push({ ...baseAction, id: "schaden", name: "Schaden", expression: `max(0, (${dice} + input.bonus + input.mod_ergebnis) * if(input.critical, 2, 1) - input.ziel_ruestung)`,
    inputs: {
      einsatz,
      mod_ergebnis: integerField("Zuschlag aus Fähigkeiten und Zuständen", -20, 40),
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
      { id: "entwicklung", label: "Erfahrung, Fähigkeiten und Zustände", fields: [CHRONICLE_XP_FIELD, CHRONICLE_XP_SKILLS_FIELD, CHRONICLE_ABILITY_FIELD, CHRONICLE_CONDITION_FIELD] },
      ...CHRONICLE_FIELDS.map(field => ({ id: field, label: CHRONICLE_FIELD_LABELS[field], fields: skills.filter(skill => skill.field === field).flatMap(skill => [chronicleSkillField(skill.id), chronicleBonusField(skill.id)]) })),
    ] },
    actions, computed, constraints,
    vitals: [
      // Der Höchstwert wächst mit dem Körper-Talent; der Funkenzähler ist ausdrücklich KEIN
      // Vitalwert — ein leerer Vorrat ist kein Ausfall, sondern nur ein leerer Vorrat.
      { id: "lebenskraft", label: "Lebenskraft", max: vitality, depletion: "defeat" as const },
    ],
    attribution: CHRONICLE_ATTRIBUTION,
    abilityRules: { abilityField: CHRONICLE_ABILITY_FIELD, conditionField: CHRONICLE_CONDITION_FIELD,
      budget: `${CHRONICLE_START_ABILITY_BUDGET} + actor.${CHRONICLE_XP_FIELD} - actor.${CHRONICLE_XP_SKILLS_FIELD}` },
    abilities: CHRONICLE_ABILITY_LIBRARY.map(entry => abilityFor(entry, skills, talent)),
    conditions: CHRONICLE_CONDITIONS.map((entry): RuleCondition => {
      const modifiers = modifiersFor(entry.wirkungen, skills, `condition ${entry.id}`);
      return { id: entry.id, name: entry.name, text: entry.text, ...(modifiers.length ? { modifiers } : {}) };
    }),
    // Die Migration gehört nur zur ausgelieferten Fassung; ein angepasster Katalog mit eigener Version bringt seine eigene mit.
    migrations: options.migrations ?? ((options.version ?? CHRONICLE_VERSION) === CHRONICLE_VERSION ? [CHRONICLE_MIGRATION_1_TO_2] : []),
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

/**
 * Zwölf Archetypen: fertige Startbögen für die neun Grundfertigkeiten, je 360 Punkte und drei
 * Fähigkeiten vom Rang 1, deren Voraussetzungen diese Punkte erfüllen. Ein Anfang, keine Klasse —
 * alles darf die Runde danach ändern.
 */
export type ChronicleArchetype = ChronicleExampleCharacter;
function archetype(id: string, name: string, profession: string, points: readonly number[], ruestung: number, abilities: readonly [string, string, string]): ChronicleArchetype {
  const fields = {
    ...defaultSupportedActorFields(CHRONICLE_HEROES_PACKAGE), name, profession,
    notes: `Archetyp ${name}: ${CHRONICLE_START_POINTS} Startpunkte und drei Fähigkeiten vom Rang 1. Alles darf die Runde danach frei ändern.`,
    [CHRONICLE_ARMOUR_FIELD]: ruestung,
    [CHRONICLE_ABILITY_FIELD]: abilities.join(", "),
    ...Object.fromEntries(CHRONICLE_DEFAULT_SKILLS.map((skill, index) => [chronicleSkillField(skill.id), points[index]!])),
  };
  return { id, name, description: `${profession} · ${abilities.length} Fähigkeiten · Rüstung ${ruestung}`, fields: validatePackageFields(CHRONICLE_HEROES_PACKAGE, fields) };
}
// Reihenfolge der Punkte: Athletik, Handwerk, Schlagkraft, Buchwissen, Wahrnehmung, Feldmedizin, Überreden, Menschenkenntnis, Mut.
export const CHRONICLE_ARCHETYPES: readonly ChronicleArchetype[] = deepFreeze([
  archetype("kaempfer", "Kämpfer", "Söldner", [65, 30, 70, 15, 40, 20, 25, 30, 65], 3, ["harter_schlag", "leichtfuessig", "beherzt"]),
  archetype("spaeher", "Späher", "Kundschafter", [60, 25, 30, 30, 70, 25, 25, 40, 55], 1, ["wachsam", "leise_sohlen", "faehrtenkunde"]),
  archetype("heiler", "Heiler", "Feldscher", [25, 30, 15, 55, 40, 70, 40, 55, 30], 0, ["verbandskunde", "heilkundig", "sanfte_stimme"]),
  archetype("gelehrter", "Gelehrter", "Archivar", [20, 40, 15, 70, 55, 45, 40, 45, 30], 0, ["belesen", "sprachtalent", "gutes_gedaechtnis"]),
  archetype("haendler", "Händler", "Kaufmann", [30, 35, 15, 45, 45, 20, 70, 65, 35], 0, ["redegewandt", "geschaeftssinn", "gutes_gespuer"]),
  archetype("hauptmann", "Hauptmann", "Anführer einer Wache", [50, 20, 55, 30, 40, 25, 50, 35, 55], 4, ["vorbild", "taktiker", "beherzt"]),
  archetype("dieb", "Dieb", "Fassadenkletterer", [60, 55, 20, 25, 60, 20, 45, 50, 25], 1, ["lange_finger", "flink", "pokerface"]),
  archetype("handwerker", "Handwerker", "Schmied", [45, 70, 50, 30, 35, 25, 35, 30, 40], 2, ["geschickte_haende", "tueftler", "dickes_fell"]),
  archetype("barde", "Barde", "Spielmann", [35, 20, 15, 35, 45, 25, 65, 55, 65], 0, ["spielmann", "buehnenpraesenz", "frohsinn"]),
  archetype("jaeger", "Jäger", "Waldläufer", [60, 40, 45, 20, 65, 30, 20, 35, 45], 1, ["pirschjaeger", "ruhige_hand", "wachsam"]),
  archetype("priester", "Priester", "Wanderprediger", [25, 35, 20, 55, 40, 50, 45, 40, 50], 0, ["gottvertrauen", "standhaft", "glueckskind"]),
  archetype("abenteurer", "Abenteurer", "Glücksritter", [50, 40, 40, 40, 45, 35, 35, 40, 35], 1, ["kampferprobt", "weitgereist", "wachsam"]),
]);
