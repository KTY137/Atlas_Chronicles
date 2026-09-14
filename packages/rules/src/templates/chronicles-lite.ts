// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { ENGINE_VERSION } from "../formula.ts";
import type { FieldSchema } from "../package.ts";
import { parseRulePackageV2, type RuleActionV2, type RulePackageV2 } from "../package-v2.ts";

export type ChroniclesLiteGroup = "handeln" | "wissen" | "soziales";
export interface ChroniclesLiteSkill { readonly id: string; readonly label: string; readonly group: ChroniclesLiteGroup }

export const CHRONICLES_LITE_GROUP_LABELS: Readonly<Record<ChroniclesLiteGroup, string>> = Object.freeze({
  handeln: "Handeln",
  wissen: "Wissen",
  soziales: "Soziales",
});

/**
 * First-party, system-neutral skill catalogue for Chronicles Lite.
 * The names are intentionally broad so the package works for fantasy, modern, sci-fi and mixed campaigns.
 */
export const CHRONICLES_LITE_SKILLS: readonly ChroniclesLiteSkill[] = Object.freeze([
  { id: "nahkampf", label: "Nahkampf", group: "handeln" },
  { id: "fernkampf", label: "Fernkampf", group: "handeln" },
  { id: "werfen", label: "Werfen", group: "handeln" },
  { id: "athletik", label: "Athletik", group: "handeln" },
  { id: "klettern", label: "Klettern", group: "handeln" },
  { id: "schwimmen", label: "Schwimmen", group: "handeln" },
  { id: "springen", label: "Springen", group: "handeln" },
  { id: "schleichen", label: "Schleichen", group: "handeln" },
  { id: "akrobatik", label: "Akrobatik", group: "handeln" },
  { id: "balance", label: "Balance", group: "handeln" },
  { id: "reiten", label: "Reiten", group: "handeln" },
  { id: "fahrzeugfuehrung", label: "Fahrzeugführung", group: "handeln" },
  { id: "ueberleben", label: "Überleben", group: "handeln" },
  { id: "orientierung", label: "Orientierung", group: "handeln" },
  { id: "erste_hilfe", label: "Erste Hilfe", group: "handeln" },
  { id: "handwerk", label: "Handwerk", group: "handeln" },
  { id: "reparieren", label: "Reparieren", group: "handeln" },
  { id: "schloesser_knacken", label: "Schlösser knacken", group: "handeln" },
  { id: "fingerfertigkeit", label: "Fingerfertigkeit", group: "handeln" },
  { id: "taschendiebstahl", label: "Taschendiebstahl", group: "handeln" },
  { id: "tarnen", label: "Tarnen", group: "handeln" },
  { id: "jagen", label: "Jagen", group: "handeln" },
  { id: "fischen", label: "Fischen", group: "handeln" },
  { id: "kochen", label: "Kochen", group: "handeln" },
  { id: "tanzen", label: "Tanzen", group: "handeln" },
  { id: "musizieren", label: "Musizieren", group: "handeln" },
  { id: "beschatten", label: "Beschatten", group: "handeln" },
  { id: "entkommen", label: "Entkommen", group: "handeln" },
  { id: "reflexe", label: "Reflexe", group: "handeln" },
  { id: "kraftakt", label: "Kraftakt", group: "handeln" },
  { id: "ausdauer", label: "Ausdauer", group: "handeln" },
  { id: "wahrnehmung", label: "Wahrnehmung", group: "handeln" },
  { id: "suchen", label: "Suchen", group: "handeln" },
  { id: "improvisierte_werkzeuge", label: "Improvisierte Werkzeuge", group: "handeln" },

  { id: "allgemeinwissen", label: "Allgemeinwissen", group: "wissen" },
  { id: "geschichte", label: "Geschichte", group: "wissen" },
  { id: "geografie", label: "Geografie", group: "wissen" },
  { id: "naturkunde", label: "Naturkunde", group: "wissen" },
  { id: "medizin", label: "Medizin", group: "wissen" },
  { id: "biologie", label: "Biologie", group: "wissen" },
  { id: "chemie", label: "Chemie", group: "wissen" },
  { id: "physik", label: "Physik", group: "wissen" },
  { id: "mathematik", label: "Mathematik", group: "wissen" },
  { id: "informatik", label: "Informatik", group: "wissen" },
  { id: "technik", label: "Technik", group: "wissen" },
  { id: "mechanik", label: "Mechanik", group: "wissen" },
  { id: "elektronik", label: "Elektronik", group: "wissen" },
  { id: "astronomie", label: "Astronomie", group: "wissen" },
  { id: "religion", label: "Religion", group: "wissen" },
  { id: "mythologie", label: "Mythologie", group: "wissen" },
  { id: "okkultismus", label: "Okkultismus", group: "wissen" },
  { id: "magiekunde", label: "Magiekunde", group: "wissen" },
  { id: "rechtskunde", label: "Rechtskunde", group: "wissen" },
  { id: "wirtschaft", label: "Wirtschaft", group: "wissen" },
  { id: "politik", label: "Politik", group: "wissen" },
  { id: "sprachen", label: "Sprachen", group: "wissen" },
  { id: "linguistik", label: "Linguistik", group: "wissen" },
  { id: "kulturkunde", label: "Kulturkunde", group: "wissen" },
  { id: "archaeologie", label: "Archäologie", group: "wissen" },
  { id: "kriminalistik", label: "Kriminalistik", group: "wissen" },
  { id: "taktik", label: "Taktik", group: "wissen" },
  { id: "strategie", label: "Strategie", group: "wissen" },
  { id: "navigation", label: "Navigation", group: "wissen" },
  { id: "tierkunde", label: "Tierkunde", group: "wissen" },
  { id: "pflanzenkunde", label: "Pflanzenkunde", group: "wissen" },
  { id: "geologie", label: "Geologie", group: "wissen" },
  { id: "recherche", label: "Recherche", group: "wissen" },

  { id: "ueberreden", label: "Überreden", group: "soziales" },
  { id: "verhandeln", label: "Verhandeln", group: "soziales" },
  { id: "einschuechtern", label: "Einschüchtern", group: "soziales" },
  { id: "taeuschen", label: "Täuschen", group: "soziales" },
  { id: "menschenkenntnis", label: "Menschenkenntnis", group: "soziales" },
  { id: "empathie", label: "Empathie", group: "soziales" },
  { id: "auftreten", label: "Auftreten", group: "soziales" },
  { id: "fuehrung", label: "Führung", group: "soziales" },
  { id: "diplomatie", label: "Diplomatie", group: "soziales" },
  { id: "etikette", label: "Etikette", group: "soziales" },
  { id: "strassenwissen", label: "Straßenwissen", group: "soziales" },
  { id: "kontakte", label: "Kontakte", group: "soziales" },
  { id: "beruhigen", label: "Beruhigen", group: "soziales" },
  { id: "motivieren", label: "Motivieren", group: "soziales" },
  { id: "lehren", label: "Lehren", group: "soziales" },
  { id: "befragen", label: "Befragen", group: "soziales" },
  { id: "verhoeren", label: "Verhören", group: "soziales" },
  { id: "flirten", label: "Flirten", group: "soziales" },
  { id: "feilschen", label: "Feilschen", group: "soziales" },
  { id: "geschichten_erzaehlen", label: "Geschichten erzählen", group: "soziales" },
  { id: "schauspiel", label: "Schauspiel", group: "soziales" },
  { id: "improvisation", label: "Improvisation", group: "soziales" },
  { id: "komik", label: "Komik", group: "soziales" },
  { id: "rhetorik", label: "Rhetorik", group: "soziales" },
  { id: "debattieren", label: "Debattieren", group: "soziales" },
  { id: "mediation", label: "Mediation", group: "soziales" },
  { id: "netzwerken", label: "Netzwerken", group: "soziales" },
  { id: "verkleiden", label: "Verkleiden", group: "soziales" },
  { id: "geruechte", label: "Gerüchte", group: "soziales" },
  { id: "gastfreundschaft", label: "Gastfreundschaft", group: "soziales" },
  { id: "anheuern", label: "Anheuern", group: "soziales" },
  { id: "provozieren", label: "Provozieren", group: "soziales" },
  { id: "vertrauen_gewinnen", label: "Vertrauen gewinnen", group: "soziales" },
]);

export const chroniclesLiteSkillField = (id: string): string => `skill_${id}`;
const text = (label: string, maxLength: number, value = ""): FieldSchema => ({ type: "string", label, maxLength, default: value });
const integer = (label: string, minimum: number, maximum: number, value: number): FieldSchema => ({ type: "integer", label, minimum, maximum, default: value });

const fields: Record<string, FieldSchema> = {
  name: text("Name", 120),
  role: text("Rolle / Beruf", 120),
  vitality: integer("Aktuelle Vitalität", 0, 999, 20),
  max_vitality: integer("Maximale Vitalität", 1, 999, 20),
  notes: text("Notizen", 4096),
};
for (const skill of CHRONICLES_LITE_SKILLS) fields[chroniclesLiteSkillField(skill.id)] = integer(skill.label, 0, 50, 10);

function skillAction(skill: ChroniclesLiteSkill): RuleActionV2 {
  const field = chroniclesLiteSkillField(skill.id);
  return {
    id: `check_${skill.id}`,
    name: skill.label,
    version: "1.0.0",
    expression: "1d50",
    disclosure: `${skill.label}: W50-Probe. Das Ergebnis muss höchstens dem gespeicherten Fertigkeitswert entsprechen; 50 ist immer ein kritischer Fehlschlag.`,
    requiresConfirmation: true,
    inputs: {},
    outcome: {
      bands: [
        { id: "critical_failure", label: "Kritisch misslungen", comparison: "gte", expression: "50", success: false },
        { id: "critical_success", label: "Kritisch gelungen", comparison: "lte", expression: `max(1, floor(actor.${field} / 10))`, success: true },
        { id: "success", label: "Gelungen", comparison: "lte", expression: `actor.${field}`, success: true },
      ],
      fallback: { id: "failure", label: "Misslungen", success: false },
    },
  };
}

const actions = CHRONICLES_LITE_SKILLS.map(skillAction);
const skillsIn = (group: ChroniclesLiteGroup) => CHRONICLES_LITE_SKILLS.filter(skill => skill.group === group);
const fieldNodes = (group: ChroniclesLiteGroup) => skillsIn(group).map(skill => ({ kind: "field" as const, id: `${skill.id}-ui`, ref: chroniclesLiteSkillField(skill.id), render: "compact" as const }));
const actionRefs = (group: ChroniclesLiteGroup) => skillsIn(group).map(skill => `check_${skill.id}`);

/**
 * Chronicles Lite v1: a compact W50 ruleset with exactly 100 broad, individually rollable skills.
 * It is first-party Atlas content and intentionally setting-neutral.
 */
export const CHRONICLES_LITE_PACKAGE: RulePackageV2 = parseRulePackageV2({
  schemaVersion: 2,
  id: "org.atlas-chronicles.chronicles-lite",
  name: "Chronicles Lite",
  version: "1.0.0",
  engineVersion: ENGINE_VERSION,
  license: "BUSL-1.1",
  authors: ["Kaya Yesilyurt", "Atlas Chronicles"],
  fields,
  layout: { sections: [
    { id: "identity", label: "Identität", fields: ["name", "role"] },
    { id: "skills", label: "Fähigkeiten", fields: [] },
    { id: "handeln", label: "Handeln", parent: "skills", fields: skillsIn("handeln").map(skill => chroniclesLiteSkillField(skill.id)) },
    { id: "wissen", label: "Wissen", parent: "skills", fields: skillsIn("wissen").map(skill => chroniclesLiteSkillField(skill.id)) },
    { id: "soziales", label: "Soziales", parent: "skills", fields: skillsIn("soziales").map(skill => chroniclesLiteSkillField(skill.id)) },
    { id: "resources", label: "Ressourcen", fields: ["vitality", "max_vitality", "notes"] },
  ] },
  vitals: [{ id: "vitality", label: "Vitalität", max: "actor.max_vitality", depletion: "defeat" }],
  presentation: { schemaVersion: 3, root: [
    { kind: "group", id: "identity-ui", label: "Identität", render: "compact", children: [
      { kind: "field", id: "name-ui", ref: "name" },
      { kind: "field", id: "role-ui", ref: "role" },
    ] },
    { kind: "group", id: "skills-ui", label: "Fähigkeiten", render: "cards", children: [
      { kind: "group", id: "handeln-ui", label: "Handeln", render: "grid", collapsible: true, children: [
        ...fieldNodes("handeln"),
        { kind: "actions", id: "handeln-actions-ui", label: "Proben · Handeln", refs: actionRefs("handeln") },
      ] },
      { kind: "group", id: "wissen-ui", label: "Wissen", render: "grid", collapsible: true, children: [
        ...fieldNodes("wissen"),
        { kind: "actions", id: "wissen-actions-ui", label: "Proben · Wissen", refs: actionRefs("wissen") },
      ] },
      { kind: "group", id: "soziales-ui", label: "Soziales", render: "grid", collapsible: true, children: [
        ...fieldNodes("soziales"),
        { kind: "actions", id: "soziales-actions-ui", label: "Proben · Soziales", refs: actionRefs("soziales") },
      ] },
    ] },
    { kind: "group", id: "resources-ui", label: "Ressourcen", render: "compact", children: [
      { kind: "vital", id: "vitality-ui", ref: "vitality" },
      { kind: "field", id: "max-vitality-ui", ref: "max_vitality" },
      { kind: "field", id: "notes-ui", ref: "notes", render: "section" },
    ] },
  ] },
  actions,
  migrations: [],
});
