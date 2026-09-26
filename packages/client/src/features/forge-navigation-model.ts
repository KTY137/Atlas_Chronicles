// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { RULE_LIMITS } from "@chronicle/rules";
import { t } from "../i18n";
import type { RuleDraft } from "./rule-forge-model";

/**
 * Wegweiser der Werkbank, ohne Oberfläche: welche Bereiche es gibt, welche jemand beim ersten
 * Öffnen sieht, wo ein Befund der Paketprüfung hingehört und wie er in Alltagssprache heißt.
 *
 * Kaya, 2026-09-26: Wer das System nicht kennt, soll schnell wissen, wie es geht. Darum öffnet die
 * Werkbank im Modus „Das Wichtigste“ mit acht Bereichen; die übrigen sechs erscheinen hinter
 * „Alle Bereiche zeigen“ — oder von selbst, sobald das Paket dort Inhalt oder ein Problem hat.
 * Ein Bereich mit Inhalt wird nie versteckt, der gerade offene auch nicht.
 */
export type ForgeSection = "package" | "map" | "fields" | "computed" | "vitals" | "collections" | "sheet" | "actions" | "abilities" | "conditions" | "constraints" | "try" | "migrations" | "publish";
export type SectionGroupId = "overview" | "figure" | "table" | "finish";
export const SECTION_GROUPS: readonly { id: SectionGroupId; sections: readonly ForgeSection[] }[] = [
  { id: "overview", sections: ["package", "map"] },
  { id: "figure", sections: ["fields", "computed", "vitals", "collections", "sheet"] },
  { id: "table", sections: ["actions", "abilities", "conditions", "constraints"] },
  { id: "finish", sections: ["try", "migrations", "publish"] },
];
export const SECTIONS: readonly ForgeSection[] = SECTION_GROUPS.flatMap(group => group.sections);
/** Die acht Bereiche, mit denen ein eigenes Regelwerk entsteht (Spec E10). */
export const CORE_SECTIONS: readonly ForgeSection[] = ["package", "fields", "vitals", "actions", "abilities", "sheet", "try", "publish"];

export type SectionMode = "wichtig" | "alle";
export type SectionNumbers = Readonly<Partial<Record<ForgeSection, number>>>;

/** Die sichtbaren Bereiche in der festen Reihenfolge der Navigation. */
export function visibleSections(mode: SectionMode, counts: SectionNumbers, problems: SectionNumbers, active?: ForgeSection): ForgeSection[] {
  if (mode === "alle") return [...SECTIONS];
  return SECTIONS.filter(id => CORE_SECTIONS.includes(id) || id === active || (counts[id] ?? 0) > 0 || (problems[id] ?? 0) > 0);
}

/** Wie viele Einträge ein Bereich hat; `null`, wo Zählen nichts sagt (Paket, Karte, Bogen, Übernehmen). */
export function sectionCount(id: ForgeSection, draft: RuleDraft): number | null {
  switch (id) {
    case "fields": return draft.fields.length;
    case "computed": return draft.computed?.length ?? 0;
    case "vitals": return draft.vitals?.length ?? 0;
    case "collections": return draft.collections?.length ?? 0;
    case "actions": return draft.actions.length;
    case "abilities": return draft.abilities?.length ?? 0;
    case "conditions": return draft.conditions?.length ?? 0;
    case "constraints": return draft.constraints?.length ?? 0;
    case "try": return draft.selfTests.length;
    case "migrations": return draft.migrations.length;
    default: return null;
  }
}
export function sectionCounts(draft: RuleDraft): Record<ForgeSection, number> {
  return Object.fromEntries(SECTIONS.map(id => [id, sectionCount(id, draft) ?? 0])) as Record<ForgeSection, number>;
}

/** Die Wahl „Das Wichtigste“ oder „Alle Bereiche“ merkt sich der Browser je Person. */
export const SECTION_MODE_KEY = "atlas.forge.bereiche";
export function readSectionMode(): SectionMode {
  try { return localStorage.getItem(SECTION_MODE_KEY) === "alle" ? "alle" : "wichtig"; } catch { return "wichtig"; }
}
export function writeSectionMode(mode: SectionMode): void {
  try { localStorage.setItem(SECTION_MODE_KEY, mode); } catch { /* storage may be blocked; the choice just does not persist */ }
}

/** Wo ein Befund der Paketprüfung hingehört: der Bereich, in dem man ihn behebt. */
export function locateValidationError(message: string, draft: RuleDraft): { section: ForgeSection } | null {
  const byPrefix: [RegExp, ForgeSection][] = [
    [/^package (id|name|version)\b/, "package"], [/^license\b/, "package"], [/^author\b/, "package"],
    [/^package: (author required|invalid namespaced id|requires unsupported engine|unsupported schemaVersion)/, "package"],
    [/^action (id|name|version|disclosure)\b/, "actions"], [/^action:|^threshold\b|^formula: unknown/, "actions"],
    [/^layout\b|^section\b|^presentation/, "sheet"], [/^migration|^rename:|^add:|^archive:/, "migrations"],
    [/^selfTest\b/, "try"], [/^abilit|^ability\b/, "abilities"], [/^condition/, "conditions"],
    [/^vital/, "vitals"], [/^constraint/, "constraints"], [/^collection/, "collections"], [/^computed/, "computed"],
  ];
  const hit = byPrefix.find(([pattern]) => pattern.test(message));
  if (hit) return { section: hit[1] };
  const quoted = /„([^"]+)"/.exec(message)?.[1];
  const labelled = /^([^:]+):/.exec(message)?.[1]?.trim();
  if ((quoted && draft.fields.some(f => f.id === quoted)) || (labelled && draft.fields.some(f => f.label === labelled))) return { section: "fields" };
  if ((quoted && draft.actions.some(a => a.id === quoted || a.inputs.some(i => i.id === quoted))) || (labelled && draft.actions.some(a => a.inputs.some(i => i.label === labelled)))) return { section: "actions" };
  if (/^field\b/.test(message)) return { section: "fields" };
  return null;
}

/**
 * Befunde der Paketprüfung und der Würfel-Engine in Alltagssprache. Unbekannte Befunde bleiben,
 * wie sie sind; bekannte sagen, was falsch ist und in welchem Bereich man es behebt.
 */
export function explainValidationError(message: string): string {
  const rewrites: [RegExp, string][] = [
    [/^package: invalid namespaced id$/, t("Die Paketkennung passt nicht ins Muster: nur Kleinbuchstaben und Ziffern, in mindestens zwei durch Punkt oder Bindestrich getrennten Teilen, z. B. de.meine-runde.regelwerk.")],
    [/^package name: expected nonempty string/, t("Das Paket braucht einen Namen. Trage im Reiter „Paket“ einen Namen ein, z. B. Mein Regelwerk.")],
    [/^license: expected nonempty string/, t("Die Lizenz darf nicht leer sein. Trage im Reiter „Paket“ z. B. MIT ein.")],
    [/^author: expected nonempty string/, t("Eine Urheberschaft ist leer. Trage im Reiter „Paket“ einen Namen ein oder entferne das leere Feld.")],
    [/^package: author required$/, t("Ein Regelpaket braucht mindestens eine Urheberschaft. Trage im Reiter „Paket“ mindestens eine Person ein.")],
    [/^package version: expected release version/, t("Die Paketversion muss dem Muster x.y.z folgen, z. B. 1.0.0 – drei durch Punkte getrennte Zahlen.")],
    [/^action version: expected release version/, t("Die Aktionsversion muss dem Muster x.y.z folgen, z. B. 1.0.0.")],
    [/^migration\.from: expected release version/, t("Die Ausgangsversion im Reiter „Migration“ muss dem Muster x.y.z folgen, z. B. 1.0.0.")],
    [/^action id: invalid identifier$/, t("Die Aktionskennung passt nicht ins Muster. Nur Kleinbuchstaben, Ziffern, „_“ und „-“, das erste Zeichen muss ein Buchstabe sein, z. B. angriff oder erste-hilfe. Öffne den Reiter „Aktionen“.")],
    [/^package: duplicate action id$/, t("Zwei Aktionen haben dieselbe Kennung. Vergib im Reiter „Aktionen“ für jede Aktion eine eigene Kennung.")],
    [/^section id: invalid identifier$/, t("Die Abschnittskennung passt nicht ins Muster. Nur Kleinbuchstaben, Ziffern, „_“ und „-“, das erste Zeichen muss ein Buchstabe sein. Öffne den Reiter „Bogen“.")],
    [/^layout: duplicate section id$/, t("Zwei Abschnitte haben dieselbe Kennung. Vergib im Reiter „Bogen“ unterschiedliche Abschnittskennungen.")],
    [/^layout: duplicate field reference$/, t("Ein Feld ist im selben Abschnitt doppelt eingetragen. Entferne den doppelten Eintrag im Reiter „Bogen“.")],
    [/^layout: unknown field reference$/, t("Der Bogen verweist auf ein Feld, das es nicht mehr gibt. Öffne den Reiter „Bogen“ und entferne oder ersetze den verwaisten Eintrag.")],
    [/^layout: unknown parent section$/, t("Eine Kategorie verweist auf eine Oberkategorie, die nicht mehr existiert. Wähle im Reiter „Bogen“ eine andere Oberkategorie.")],
    [/^layout: section cannot parent itself$/, t("Eine Kategorie kann nicht ihre eigene Oberkategorie sein. Wähle im Reiter „Bogen“ eine andere Ebene.")],
    [/^layout: category cycle$/, t("Die Kategorien bilden einen Kreis. Eine Unterkategorie darf nicht wieder über ihren eigenen Nachfahren liegen.")],
    [/^layout: category nesting too deep$/, t("Der Kategorienbaum ist zu tief verschachtelt. Reduziere ihn auf höchstens {ebenen} Ebenen.", { ebenen: RULE_LIMITS.nestingDepth })],
    [/^field: reversed range$/, t("Bei einem Attribut ist das Minimum größer als das Maximum. Öffne den Reiter „Attribute“ und stelle sicher, dass jedes Minimum kleiner oder gleich seinem Maximum ist.")],
    [/outside declared range$/, t("Ein Vorgabewert liegt außerhalb von Minimum und Maximum. Öffne den betroffenen Reiter und passe entweder den Vorgabewert oder die Grenzen an.")],
    [/invalid string length$/, t("Ein Text ist leer oder länger als das erlaubte Zeichenlimit. Öffne den betroffenen Reiter und kürze den Text oder erhöhe „Maximale Zeichen“.")],
    [/^action: result must be numeric$/, t("Das Ergebnis einer Aktion muss eine Zahl sein. Öffne den Reiter „Aktionen“ und prüfe die Formel – sie darf nicht mit einem Vergleich oder einem Text enden.")],
    [/^package: action required$/, t("Ein Regelpaket braucht mindestens eine Aktion. Lege im Reiter „Aktionen“ eine erste Aktion an.")],
    [/^formula: unknown (actor|input)\.(.+)$/, t("Die Formel verwendet ein Feld, das es nicht mehr gibt. Öffne den Reiter „Aktionen“, such die markierte Stelle in der Formel und wähle dort ein vorhandenes Feld neu aus.")],
    [/dice forbidden$/, t("In einer Versionsmigration sind Würfel nicht erlaubt, nur Berechnungen aus dem bisherigen Zahlenwert. Entferne den Würfel an der markierten Stelle in der Formel im Reiter „Migration“.")],
    [/^migration: numeric result required$/, t("Die Formel zur Zahlenumrechnung muss eine Zahl ergeben. Prüfe die Formel im betroffenen Migrationsschritt.")],
    [/knowledge predicates forbidden$/, t("Gehaltenes Wissen darf in einer Migration nicht abgefragt werden, nur der bisherige Zahlenwert. Passe die Formel im Reiter „Migration“ an.")],
    [/^migration: must target this package version from a different version$/, t("Ein Migrationsweg muss von einer anderen Version zu dieser Version führen. Ändere die Ausgangsversion im Reiter „Migration“.")],
    [/^migration: duplicate source version$/, t("Zwei Migrationswege haben dieselbe Ausgangsversion. Es darf nur einen Weg je Ausgangsversion geben. Öffne den Reiter „Migration“.")],
    [/^migration: final fields differ from target schema/, t("Nach den Migrationsschritten stimmen die Felder nicht mit dieser Version überein. Jedes neue Feld braucht einen eigenen „Hinzufügen“-Schritt, jedes entfernte Feld einen eigenen „Archivieren“-Schritt.")],
    [/^rename: identical fields$/, t("Umbenennen: Die neue Attributkennung muss sich von der bisherigen unterscheiden.")],
    [/^presentation: root may not be empty$/, t("Der Bogen ist leer. Lege im Reiter „Bogen“ mindestens einen Eintrag an.")],
    [/^presentation: unknown (field|computed|vital|collection) reference/, t("Der Bogen zeigt einen Eintrag, den es nicht mehr gibt. Öffne den Reiter „Bogen“ und nimm ihn vom Bogen.")],
    [/^presentation: duplicate \w+ reference/, t("Ein Eintrag steht zweimal auf dem Bogen. Öffne den Reiter „Bogen“ und nimm einen davon herunter.")],
    [/^vital .+: expected a number or integer field/, t("Ein Balken braucht ein Zahlenattribut für seinen Stand. Öffne den Reiter „Balken“ und wähle eines aus.")],
    [/^collection .+: storageField must reference/, t("Eine Liste hat ihr Speicherattribut verloren. Öffne den Reiter „Listen“ und entferne die Liste oder lege sie neu an.")],
    [/^vitals: duplicate id$/, t("Zwei Balken benutzen dasselbe Attribut. Jedes Zahlenattribut trägt höchstens einen Balken.")],
    [/^seed: /, t("Der Würfelstart muss aus genau 32 Zeichen von 0 bis 9 und a bis f bestehen und darf nicht nur Nullen enthalten.")],
    [/^formula: (invalid token|expected)/, t("Die Formel ist unvollständig oder enthält ein Zeichen, das hier nicht passt. Öffne die markierte Formel und vervollständige sie.")],
  ];
  return rewrites.find(([pattern]) => pattern.test(message))?.[1] ?? message;
}
