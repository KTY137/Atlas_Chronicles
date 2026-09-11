// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { describe, expect, it } from "vitest";
import { ANLAGE_STANDARD, GRUNDRISS_STANDARD, HOEHLE_STANDARD, SIEDLUNG_STANDARD, REGION_STANDARD } from "@chronicle/forge";
import { MapGenerationControls } from "../src/features/MapGenerationControls.tsx";
import { generationSettings, generationOptions, generationError } from "../src/features/map-generation.ts";
import { changeEntranceType, entranceTypeValue } from "../src/features/map-type-selection.ts";
const defaults = { grundriss: GRUNDRISS_STANDARD, hoehle: HOEHLE_STANDARD, siedlung: SIEDLUNG_STANDARD, region: REGION_STANDARD, anlagen: ANLAGE_STANDARD };
function nodes(value: any): any[] { return Array.isArray(value) ? value.flatMap(nodes) : value?.props ? [value, ...nodes(value.props.children)] : []; }
describe("compound controls and honest generation requests", () => {
  it("offers both compounds at a main-map entrance and clears their options when changing type", () => {
    let value = generationSettings();
    const tree = () => MapGenerationControls({ value, defaults, compact: true, onChange: next => { value = next; } });
    const picker = () => nodes(tree()).find(node => node.type === "select");
    expect(nodes(picker()).filter(n => n.type === "option").map(n => n.props.value)).toContain("anlage:burg");
    for (const type of ["anlage:burg", "anlage:schloss", "grundriss:haus", "siedlung:dorf"]) {
      picker().props.onChange({ target: { value: type } });
      expect(picker().props.value).toBe(type); expect(entranceTypeValue(value)).toBe(type);
      expect(generationError(value, defaults)).toBeNull();
      const options = generationOptions(value, defaults);
      if (type.startsWith("anlage:")) { expect(options).toHaveProperty("anlage"); expect(options).not.toHaveProperty("strassenDichte"); expect(options).not.toHaveProperty("art"); }
      else { expect(options).not.toHaveProperty("anlage"); expect(value).not.toHaveProperty("graben"); expect(value).not.toHaveProperty("symmetrie"); }
    }
  });
  it("does not offer unavailable compounds on an older host", () => {
    const old = { ...defaults, anlagen: undefined }, value = generationSettings();
    const tree = MapGenerationControls({ value, defaults: old, compact: true, onChange() {} });
    expect(nodes(tree).filter(n => n.type === "option").map(n => n.props.value)).not.toContain("anlage:burg");
    expect(changeEntranceType(value, "anlage:burg", old)).toBe(value);
  });
  it("gives compounds their actual numeric limits and applicable parameters", () => {
    for (const art of ["burg", "schloss"] as const) {
      const value = changeEntranceType(generationSettings(), `anlage:${art}`, defaults);
      const tree = MapGenerationControls({ value, defaults, onChange() {} });
      const count = nodes(tree).filter(n => n.type === "input" && n.props.type === "number")[2];
      expect(count.props.min).toBe(art === "burg" ? 7 : 3); expect(count.props.max).toBe(art === "burg" ? 12 : 7);
      expect(generationError({ ...value, anzahl: 42 }, defaults)).not.toBeNull();
      expect(generationError({ ...value, breite: 16 }, defaults)).not.toBeNull();
    }
  });
  it("does not show room/furniture inputs on regional maps", () => {
    const tree = MapGenerationControls({ value: generationSettings("region"), defaults, onChange() {} });
    const count = nodes(tree).filter(n => n.type === "input" && n.props.type === "number")[2];
    expect(count.props.min).toBe(1); expect(count.props.max).toBe(24);
    expect(nodes(tree).filter(n => n.type === "input" && n.props.type === "checkbox")).toHaveLength(0);
  });
});
