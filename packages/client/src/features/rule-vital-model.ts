// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import type { RuleVital } from "@chronicle/rules";
import { newField, uniqueId, type RuleDraft } from "./rule-forge-model";
import { placeOnSheet, syncSheetWithFields } from "./rule-sheet-model";

/**
 * Die Schnellanlage der Balken: ein Klick legt Zahlenattribut, Balken und Bogenplatz zugleich an.
 * Die Werte sind ein Anfang, kein Regelvorschlag — Höchststand und Verhalten bei 0 stellt die
 * Spielleitung danach frei ein.
 */
export type VitalPresetId = "leben" | "mana" | "ausdauer";
export interface VitalPreset { id: VitalPresetId; label: string; max: string; depletion: RuleVital["depletion"]; color: NonNullable<RuleVital["color"]> }
export const VITAL_PRESETS: readonly VitalPreset[] = [
  { id: "leben", label: "Leben", max: "20", depletion: "defeat", color: "red" },
  { id: "mana", label: "Mana", max: "10", depletion: "none", color: "blue" },
  { id: "ausdauer", label: "Ausdauer", max: "10", depletion: "none", color: "green" },
];
const numeric = (type: string) => type === "integer" || type === "number";

/** Gibt es schon einen Balken dieses Namens? Dann ist die Schnellanlage erledigt. */
export function hasPreset(draft: RuleDraft, preset: VitalPreset): boolean {
  return (draft.vitals ?? []).some(vital => vital.label.trim().toLocaleLowerCase("de") === preset.label.toLocaleLowerCase("de") || vital.id === preset.id);
}

/** Legt den Balken an und liefert den neuen Entwurf samt Kennung des Balkens. Format 1 wird dabei erweitert. */
export function addVitalPreset(draft: RuleDraft, preset: VitalPreset): { draft: RuleDraft; id: string } {
  const vitals = draft.vitals ?? [], taken = new Set(vitals.map(vital => vital.id));
  const reusable = draft.fields.find(field => field.id === preset.id && numeric(field.type) && !taken.has(field.id));
  let next: RuleDraft = { ...draft, schemaVersion: 2 };
  let id = reusable?.id;
  if (!id) {
    id = draft.fields.some(field => field.id === preset.id) ? uniqueId(preset.id, draft.fields.map(field => field.id)) : preset.id;
    const field = { ...newField(id), label: preset.label, minimum: "0", maximum: "999", defaultValue: preset.max };
    next = syncSheetWithFields({ ...next, fields: [...next.fields, field] }, draft.fields);
  }
  next = { ...next, vitals: [...vitals, { id, label: preset.label, max: preset.max, depletion: preset.depletion, color: preset.color }] };
  return { draft: placeOnSheet(next, "vital", id, true), id };
}

/** „Eigener Balken“: das erste Zahlenattribut, das noch keinen Balken trägt. */
export function addOwnVital(draft: RuleDraft): { draft: RuleDraft; id: string } | null {
  const vitals = draft.vitals ?? [];
  const free = draft.fields.find(field => numeric(field.type) && !vitals.some(vital => vital.id === field.id));
  if (!free) return null;
  const next: RuleDraft = { ...draft, schemaVersion: 2, vitals: [...vitals, { id: free.id, label: free.label || free.id, max: String(free.maximum || "100"), depletion: "none" }] };
  return { draft: placeOnSheet(next, "vital", free.id, true), id: free.id };
}

/** „Mit Beispiel beginnen“ bei den Balken: Leben mit Höchststand 10, in der Palettenfarbe Rot. */
export function addExampleVital(draft: RuleDraft): { draft: RuleDraft; id: string } {
  return addVitalPreset(draft, { ...VITAL_PRESETS[0]!, max: "10" });
}
