// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { BAUWERK_TYPEN } from "@chronicle/szene";
import type { GenerationDefaults, GenerationSettings } from "./map-generation";

export const SETTLEMENT_TYPE_LABEL = { weiler: "Weiler", dorf: "Dorf", stadt: "Stadt" } as const;
export const SETTLEMENT_TYPES = ["weiler", "dorf", "stadt"] as const;

/** One source for the size buttons and the concrete entrance picker, including older hosts. */
export function settlementPreset(art: GenerationSettings["siedlung"], defaults: GenerationDefaults): GenerationDefaults["siedlung"] {
  const supplied = defaults.siedlungsarten?.[art];
  if (supplied) return supplied;
  if (art === "dorf") return defaults.siedlung;
  return { ...defaults.siedlung, art, ...(art === "weiler"
    ? { ausdehnung: [24, 20] as const, bauwerke: 12, strassenDichte: .15, licht: false }
    : { ausdehnung: [56, 44] as const, bauwerke: 130, strassenDichte: .55, licht: true }) };
}

/** The choice is a UI projection of existing fields, never a second persisted map type. */
export function entranceTypeValue(value: GenerationSettings): string {
  return value.art === "siedlung" && value.anlage ? `anlage:${value.anlage}` : value.art === "siedlung" ? `siedlung:${value.siedlung}`
    : value.art === "grundriss" ? `grundriss:${value.profil}` : value.art;
}

export function changeEntranceType(value: GenerationSettings, choice: string, defaults: GenerationDefaults): GenerationSettings {
  if (choice === entranceTypeValue(value)) return value;
  const { planung, anlage: _anlage, graben: _graben, symmetrie: _symmetrie, ...other } = value;
  const reset = { ...other, breite: "" as const, hoehe: "" as const, anzahl: "" as const };
  const compound = choice === "anlage:burg" ? "burg" : choice === "anlage:schloss" ? "schloss" : null;
  if (compound) {
    const preset = defaults.anlagen?.[compound];
    if (!preset) return value;
    return { ...reset, art: "siedlung", siedlung: "stadt", anlage: compound, profil: "frei", breite: preset.ausdehnung[0], hoehe: preset.ausdehnung[1], anzahl: preset.bauwerke,
      ...(compound === "burg" ? { graben: preset.graben ?? false } : { symmetrie: preset.symmetrie ?? 1 }) };
  }
  if (choice === "hoehle") return { ...reset, art: "hoehle", profil: "frei" };
  const settlement = SETTLEMENT_TYPES.find(art => choice === `siedlung:${art}`);
  if (settlement) {
    const preset = settlementPreset(settlement, defaults);
    return { ...reset, ...(planung ? { planung } : {}), art: "siedlung", siedlung: settlement, profil: "frei",
      breite: preset.ausdehnung[0], hoehe: preset.ausdehnung[1], anzahl: preset.bauwerke,
      dichte: preset.strassenDichte, licht: preset.licht };
  }
  if (choice === "grundriss:frei") return { ...reset, art: "grundriss", profil: "frei" };
  const profil = BAUWERK_TYPEN.find(typ => choice === `grundriss:${typ}`);
  if (profil) return { ...reset, art: "grundriss", profil };
  // /betreten cannot generate regions; invented profiles must not become a silent dungeon.
  return value;
}
