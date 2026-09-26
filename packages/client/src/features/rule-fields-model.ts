// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
/**
 * Die Regeln hinter dem Bogen, ohne React (Plan 2026-09-26 „Zugänglich und schön“, Aufgabe 4).
 *
 * Hier steht nur, was der Bogen anbietet: wohin ein Schritt mit − oder + führt, welches Feld zu
 * „Wer ist die Figur?“ und welches zu „Was kann sie?“ gehört, und ob eine gespeicherte Liste
 * Einträge hält, die das Regelwerk nicht kennt. Ob ein Wert gilt, entscheidet weiter der Host.
 */
import type { AbilityOverview, FieldSchema, RuleRuntime, Scalar } from "@chronicle/rules";
import { ruleIdList } from "./rule-runtime-state";

/** Wertkacheln auf dem Bogen oder das alte Formular der Regelschmiede. */
export type RuleFieldsLayout = "sheet" | "form";
/** „identity“: wer die Figur ist (Name, Beruf, Notizen). „values“: alles, womit sie spielt. */
export type RuleFieldPart = "identity" | "values";
export type RuleFieldsPart = RuleFieldPart | "all";

/** Die Speicherfelder des Regelwerks: Fähigkeiten, Zustände und Listen. Ein voller `RuleRuntime` passt. */
export type RuleFieldStorage = Pick<RuleRuntime, "abilityField" | "conditionField" | "collections">;
const NO_STORAGE: RuleFieldStorage = { abilityField: null, conditionField: null, collections: [] };

/**
 * Gehört ein Feld zu „Wer ist die Figur?“ oder zu „Was kann sie?“ (E15)?
 * Texte und Auswahlen beschreiben die Figur. Zahlen, Schalter und die Textfelder, in denen das
 * Regelwerk Fähigkeiten, Zustände oder Listen speichert, sind ihre Werte.
 */
export function fieldPart(id: string, field: FieldSchema, runtime: RuleFieldStorage): RuleFieldPart {
  if (field.type !== "string") return "values";
  if (id === runtime.abilityField || id === runtime.conditionField) return "values";
  if (runtime.collections.some(collection => collection.storageField === id)) return "values";
  return "identity";
}

/** Soll dieses Feld im gewünschten Teil erscheinen? `omit` blendet einzelne Felder ganz aus. */
export function showsField(id: string, field: FieldSchema, part: RuleFieldsPart = "all", omit?: readonly string[], runtime: RuleFieldStorage = NO_STORAGE): boolean {
  if (omit?.includes(id)) return false;
  return part === "all" || fieldPart(id, field, runtime) === part;
}

/** Ob ein Knoten, der kein Feld ist (Balken, berechneter Wert, Fähigkeiten …), im Teil erscheint. */
export const showsValues = (part: RuleFieldsPart = "all"): boolean => part !== "identity";

/**
 * Wohin führt ein Druck auf − oder +? `null` heißt: dieser Schritt verließe den Bereich.
 *
 * Ein leeres oder kaputtes Feld beginnt wieder beim kleinsten erlaubten Wert — in beide Richtungen,
 * damit der Stepper auch nach dem Leeren weiterhilft. Ein Wert außerhalb des Bereichs wird in den
 * Bereich zurückgeholt, nie weiter hinausgeschoben. Kommazahlen gehen in ganzen Schritten.
 */
export function stepValue(field: FieldSchema, value: Scalar, direction: 1 | -1): number | null {
  if ((field.type !== "integer" && field.type !== "number") || field.enum) return null;
  const minimum = field.minimum ?? -Infinity, maximum = field.maximum ?? Infinity;
  if (typeof value !== "number" || !Number.isFinite(value)) return Number.isFinite(minimum) ? minimum : Math.min(maximum, 0);
  if (direction > 0 ? value >= maximum : value <= minimum) return null;
  const next = field.type === "integer"
    ? (direction > 0 ? Math.floor(value) + 1 : Math.ceil(value) - 1)
    // Gleitkommareste wie 3.4999999999 bleiben so unsichtbar, wie sie sein sollten.
    : Math.round((value + direction) * 1e9) / 1e9;
  return Math.min(maximum, Math.max(minimum, next));
}

/** Eine Zahl zum Lesen: Tausender nach Sprache (über `format`) und ein echtes Minuszeichen. */
export function displayNumber(value: number, format: (value: number) => string = String): string {
  return format(value).replace(/^-/, "−");
}
/** Der Bereich einer Zahl als leise Angabe, etwa „0–50“ oder „−360–1.000.000“. */
export function rangeText(field: FieldSchema, format: (value: number) => string = String): string | null {
  return (field.type === "integer" || field.type === "number") && field.minimum !== undefined && field.maximum !== undefined
    ? `${displayNumber(field.minimum, format)}–${displayNumber(field.maximum, format)}` : null;
}

/** „8 / 10“ ab 80 Prozent der Zeichengrenze; darunter bleibt die Grenze aus dem Weg. */
export function textCounter(value: Scalar, maxLength: number | undefined): string | null {
  if (typeof value !== "string" || !maxLength) return null;
  return value.length >= maxLength * 0.8 ? `${value.length} / ${maxLength}` : null;
}

/** Eine gespeicherte Liste mit Einträgen, die das Regelwerk nicht (mehr) kennt. */
export interface UnknownListEntries { readonly field: string; readonly unknown: readonly string[] }
/** Nur solche Listen brauchen die Reparatur von Hand; alle anderen bearbeitet der Bogen selbst. */
export function unknownListEntries(runtime: Pick<RuleRuntime, "abilityField" | "conditionField" | "abilities" | "conditions">, values: Readonly<Record<string, Scalar>>): UnknownListEntries[] {
  const lists: [string | null, readonly { id: string }[]][] = [[runtime.abilityField, runtime.abilities], [runtime.conditionField, runtime.conditions]];
  return lists.flatMap(([field, entries]) => {
    if (!field || !entries.length) return [];
    const known = new Set(entries.map(entry => entry.id)), unknown = ruleIdList(values[field]).filter(id => !known.has(id));
    return unknown.length ? [{ field, unknown }] : [];
  });
}

/** Warum eine Fähigkeit gerade nicht lernbar ist — oder `null`, wenn sie es ist. Nur Erklärung: die Freigabe kommt vom Host. */
export type LearnBlock = { art: "bogen" } | { art: "vorstufe"; fehlend: string[] } | { art: "punkte"; kosten: number; rest: number } | { art: "sonst" };
export function learnBlock(runtime: Pick<RuleRuntime, "abilities">, learned: readonly string[], overview: AbilityOverview | null, id: string): LearnBlock | null {
  if (!overview) return { art: "bogen" };
  if (overview.learnable.includes(id)) return null;
  const ability = runtime.abilities.find(candidate => candidate.id === id);
  if (!ability) return { art: "sonst" };
  const names = new Map(runtime.abilities.map(candidate => [candidate.id, candidate.name]));
  const fehlend = (ability.requires ?? []).filter(required => !learned.includes(required)).map(required => names.get(required) ?? required);
  if (fehlend.length) return { art: "vorstufe", fehlend };
  if (overview.budget !== null && overview.spent + ability.price > overview.budget) return { art: "punkte", kosten: ability.price, rest: overview.budget - overview.spent };
  return { art: "sonst" };
}
