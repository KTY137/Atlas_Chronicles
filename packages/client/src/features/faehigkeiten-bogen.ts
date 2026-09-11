// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
/**
 * Die Logik hinter Fähigkeiten und Zuständen am Bogen und am Tisch — rein, ohne React, damit sie ohne
 * Oberfläche prüfbar ist (Spec 2026-09-11-chronicleheroes-faehigkeiten, Schritt 3). Gerechnet wird
 * nie hier: was wirkt, entscheidet die Engine beim Wurf. Diese Datei sagt nur, was angeboten wird.
 */
import { abilityOverview, type AbilityOverview, type AnyRulePackage, type RuleAbility, type RuleModifier, type Scalar } from "@chronicle/rules";

/** Parameter, die die Engine selbst setzt (`mod_*`) oder die ein eigenes Bedienelement haben (`einsatz`). */
export const ENGINE_INPUTS: ReadonlySet<string> = new Set(["einsatz", "mod_ziel", "mod_ergebnis"]);
const regelnVon = (pkg: AnyRulePackage | undefined) => pkg?.schemaVersion === 2 ? pkg.abilityRules : undefined;
const katalog = (pkg: AnyRulePackage): readonly RuleAbility[] => pkg.schemaVersion === 2 ? pkg.abilities ?? [] : [];

/**
 * Die Parameter einer Aktion, die ein Mensch eintragen darf. Nur bei Paketen mit Fähigkeiten sind die
 * drei Engine-Parameter reserviert — ein fremdes Regelwerk darf einen eigenen Parameter so nennen.
 */
export function sichtbareEingaben<T>(pkg: AnyRulePackage | undefined, inputs: Readonly<Record<string, T>>): Record<string, T> {
  if (!regelnVon(pkg)) return { ...inputs };
  return Object.fromEntries(Object.entries(inputs).filter(([id]) => !ENGINE_INPUTS.has(id)));
}

/** Eine Kennungsliste aus einem Bogenfeld („a, b, c"). */
export const faehigkeitenListe = (value: unknown): string[] => typeof value === "string" ? value.split(",").map(teil => teil.trim()).filter(Boolean) : [];

/** Verlernen nimmt alles mit, was darauf aufbaut — sonst wäre der Bogen danach ungültig. */
export function verlernen(pkg: AnyRulePackage, gelernt: readonly string[], id: string): string[] {
  const nachKennung = new Map(katalog(pkg).map(ability => [ability.id, ability])), weg = new Set([id]);
  for (let geaendert = true; geaendert;) {
    geaendert = false;
    for (const kandidat of gelernt) if (!weg.has(kandidat) && (nachKennung.get(kandidat)?.requires ?? []).some(vorstufe => weg.has(vorstufe))) { weg.add(kandidat); geaendert = true; }
  }
  return gelernt.filter(kandidat => !weg.has(kandidat));
}

export type NichtLernbar = { art: "gelernt" } | { art: "vorstufe"; fehlend: string[] } | { art: "erfahrung"; fehlt: number } | { art: "voraussetzung" } | { art: "bogen" };
/** Die Übersicht einmal für den ganzen Katalog; ohne Übergabe wird sie hier berechnet. */
export function uebersichtVon(pkg: AnyRulePackage, fields: Readonly<Record<string, Scalar>>): AbilityOverview | null {
  try { return abilityOverview(pkg, fields); } catch { return null; }
}
/** Warum eine Fähigkeit gerade nicht lernbar ist — oder `null`, wenn sie es ist. */
export function grundNichtLernbar(pkg: AnyRulePackage, fields: Readonly<Record<string, Scalar>>, id: string, uebersicht: AbilityOverview | null = uebersichtVon(pkg, fields)): NichtLernbar | null {
  const regeln = regelnVon(pkg), ability = katalog(pkg).find(kandidat => kandidat.id === id);
  if (!regeln || !ability) return { art: "bogen" };
  const gelernt = faehigkeitenListe(fields[regeln.abilityField]);
  if (gelernt.includes(id)) return { art: "gelernt" };
  const namen = new Map(katalog(pkg).map(kandidat => [kandidat.id, kandidat.name]));
  const fehlend = (ability.requires ?? []).filter(vorstufe => !gelernt.includes(vorstufe)).map(vorstufe => namen.get(vorstufe) ?? vorstufe);
  if (fehlend.length) return { art: "vorstufe", fehlend };
  if (!uebersicht) return { art: "bogen" };
  if (uebersicht.learnable.includes(id)) return null;
  if (uebersicht.budget !== null && uebersicht.spent + ability.price > uebersicht.budget) return { art: "erfahrung", fehlt: uebersicht.spent + ability.price - uebersicht.budget };
  return { art: "voraussetzung" };
}

const trifft = (muster: string, actionId: string) => muster.endsWith("*") ? actionId.startsWith(muster.slice(0, -1)) : muster === actionId;
const wirkungenAuf = (modifiers: readonly RuleModifier[] | undefined, actionId: string) => (modifiers ?? []).filter(modifier => modifier.actions.some(muster => trifft(muster, actionId)));

/** Gelernte Einsatz- und Reaktionsfähigkeiten, die diese Aktion treffen und die sie annehmen kann. */
export function einsatzKandidaten(pkg: AnyRulePackage, fields: Readonly<Record<string, Scalar>>, actionId: string): RuleAbility[] {
  const regeln = regelnVon(pkg), action = pkg.actions.find(kandidat => kandidat.id === actionId);
  if (!regeln || !action?.inputs.einsatz) return [];
  const gelernt = new Set(faehigkeitenListe(fields[regeln.abilityField]));
  return katalog(pkg).filter(ability => gelernt.has(ability.id) && ability.kind !== "dauerhaft" && wirkungenAuf(ability.modifiers, actionId).length > 0);
}

export interface Mitwirkung { readonly id: string; readonly name: string; readonly quelle: "zustand" | "faehigkeit"; readonly ziel: "ziel" | "ergebnis"; readonly wert: string }
/** Was bei dieser Aktion ohnehin mitwirkt: aktive Zustände, dann gelernte dauerhafte Fähigkeiten — die Reihenfolge der Engine. */
export function wirktMit(pkg: AnyRulePackage, fields: Readonly<Record<string, Scalar>>, actionId: string): Mitwirkung[] {
  const regeln = regelnVon(pkg);
  if (!regeln || pkg.schemaVersion !== 2) return [];
  const zustaende = regeln.conditionField ? new Set(faehigkeitenListe(fields[regeln.conditionField])) : new Set<string>();
  const gelernt = new Set(faehigkeitenListe(fields[regeln.abilityField]));
  return [
    ...(pkg.conditions ?? []).filter(zustand => zustaende.has(zustand.id)).flatMap(zustand => wirkungenAuf(zustand.modifiers, actionId)
      .map(modifier => ({ id: zustand.id, name: zustand.name, quelle: "zustand" as const, ziel: modifier.target, wert: modifier.value }))),
    ...katalog(pkg).filter(ability => gelernt.has(ability.id) && ability.kind === "dauerhaft").flatMap(ability => wirkungenAuf(ability.modifiers, actionId)
      .map(modifier => ({ id: ability.id, name: ability.name, quelle: "faehigkeit" as const, ziel: modifier.target, wert: modifier.value }))),
  ];
}

/** Namen für Kennungen aus einer Quittung: Fähigkeiten und Zustände. */
export function quellenNamen(pkg: AnyRulePackage | undefined): ReadonlyMap<string, string> {
  if (!pkg || pkg.schemaVersion !== 2) return new Map();
  return new Map([...(pkg.abilities ?? []), ...(pkg.conditions ?? [])].map(eintrag => [eintrag.id, eintrag.name]));
}
