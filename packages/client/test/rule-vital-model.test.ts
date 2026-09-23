// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { describe, expect, it } from "vitest";
import { evaluateVitals, defaultSupportedActorFields } from "@chronicle/rules";
import { newPackage, validateDraft } from "../src/features/rule-forge-model";
import { isOnSheet } from "../src/features/rule-sheet-model";
import { VITAL_PRESETS, addOwnVital, addVitalPreset, hasPreset } from "../src/features/rule-vital-model";

const [leben, mana] = VITAL_PRESETS;

describe("Schnellanlage der Balken", () => {
  it("legt mit einem Klick Attribut, Balken und Bogenplatz an, und das Paket bleibt gültig", () => {
    const { draft, id } = addVitalPreset(newPackage("Kaya"), leben!);
    expect(id).toBe("leben");
    expect(draft.fields.find(field => field.id === "leben")).toMatchObject({ label: "Leben", type: "integer", defaultValue: "20" });
    expect(draft.vitals).toEqual([{ id: "leben", label: "Leben", max: "20", depletion: "defeat" }]);
    expect(isOnSheet(draft, "vital", "leben")).toBe(true);
    expect(isOnSheet(draft, "field", "leben")).toBe(true);
    const compiled = validateDraft(draft);
    expect(compiled.valid).toBe(true);
    if (!compiled.valid) return;
    // Eine neue Figur beginnt mit vollem Balken.
    expect(evaluateVitals(compiled.value, defaultSupportedActorFields(compiled.value))).toMatchObject([{ id: "leben", value: 20, maximum: 20, depleted: false }]);
    expect(hasPreset(draft, leben!)).toBe(true);
    expect(hasPreset(draft, mana!)).toBe(false);
  });

  it("stapelt mehrere Balken oben auf dem Bogen in der Reihenfolge der Anlage", () => {
    const first = addVitalPreset(newPackage("Kaya"), leben!).draft;
    const second = addVitalPreset(first, mana!).draft;
    expect(second.presentation!.root.slice(0, 2).map(node => node.kind === "vital" ? node.ref : node.kind)).toEqual(["leben", "mana"]);
    expect(validateDraft(second).valid).toBe(true);
  });

  it("nimmt ein vorhandenes Zahlenattribut gleichen Namens, statt ein zweites anzulegen", () => {
    const base = addVitalPreset(newPackage("Kaya"), leben!).draft;
    const withoutBar = { ...base, vitals: [] };
    const again = addVitalPreset(withoutBar, leben!);
    expect(again.id).toBe("leben");
    expect(again.draft.fields.filter(field => field.id.startsWith("leben"))).toHaveLength(1);
  });

  it("„Eigener Balken“ nimmt das erste freie Zahlenattribut", () => {
    const result = addOwnVital(newPackage("Kaya"));
    expect(result).not.toBeNull();
    expect(result!.draft.vitals).toHaveLength(1);
    expect(isOnSheet(result!.draft, "vital", result!.id)).toBe(true);
    expect(validateDraft(result!.draft).valid).toBe(true);
  });
});
