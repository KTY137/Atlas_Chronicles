// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { describe, expect, it, vi } from "vitest";
import { GRUNDRISS_STANDARD, HOEHLE_STANDARD, SIEDLUNG_STANDARD } from "@chronicle/forge";
import { BAUWERK_TYPEN } from "@chronicle/szene";
import { MapGenerationControls } from "../src/features/MapGenerationControls.tsx";
import { generationError, generationOptions, generationSettings, type GenerationDefaults, type GenerationSettings } from "../src/features/map-generation.ts";
import { changeEntranceType, entranceTypeValue, settlementPreset, SETTLEMENT_TYPES } from "../src/features/map-type-selection.ts";

const defaults: GenerationDefaults = { grundriss: GRUNDRISS_STANDARD, hoehle: HOEHLE_STANDARD, siedlung: SIEDLUNG_STANDARD };
// This component has no hooks. Walk its real JSX and call its real event handlers; do not
// replace its choice mapping with a mock. DOM accessibility and the HTTP route need E2E too.
interface Element { type: unknown; props: Record<string, any> }
function nodes(tree: unknown): Element[] {
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  if (tree && typeof tree === "object" && "props" in tree) {
    const node = tree as Element;
    return [node, ...nodes(node.props.children)];
  }
  return [];
}
function controls(value = generationSettings(), onChange: (next: GenerationSettings) => void = () => {}, profileLocked = false) {
  return MapGenerationControls({ value, defaults, onChange, compact: true, profileLocked });
}
function picker(tree: unknown) {
  const select = nodes(tree).find(node => node.type === "select");
  if (!select) throw new Error("Entrance type selector is missing");
  return select;
}
const options = (tree: unknown) => nodes(tree).filter(node => node.type === "option");

describe("concrete entrance map types", () => {
  it("offers each supported concrete type once, rather than only four families", () => {
    const values = options(picker(controls())).map(option => option.props.value);
    expect(values).toEqual([
      ...SETTLEMENT_TYPES.map(type => `siedlung:${type}`), "grundriss:frei",
      ...BAUWERK_TYPEN.map(type => `grundriss:${type}`), "hoehle",
    ]);
    expect(new Set(values).size).toBe(values.length);
    expect(values).not.toContain("region");
  });

  it("keeps the controlled selection and the request options in sync", () => {
    let value = generationSettings();
    for (const choice of ["siedlung:stadt", "grundriss:haus", "hoehle", "siedlung:dorf"]) {
      picker(controls(value, next => { value = next; })).props.onChange({ target: { value: choice } });
      expect(picker(controls(value)).props.value).toBe(choice);
      expect(entranceTypeValue(value)).toBe(choice);
      expect(generationError(value, defaults)).toBeNull();
      const request = { art: value.art, stil: value.stil, optionen: generationOptions(value, defaults) };
      if (value.art === "siedlung") expect(request.optionen).toMatchObject({ art: value.siedlung, ausdehnung: [value.breite, value.hoehe], bauwerke: value.anzahl });
      else if (value.art === "grundriss") expect(request.optionen).toMatchObject({ profil: "haus" });
      else expect(request.optionen).not.toHaveProperty("profil");
    }
  });

  it("clears city dimensions and building counts before choosing every interior profile", () => {
    const city = changeEntranceType(generationSettings(), "siedlung:stadt", defaults);
    for (const typ of BAUWERK_TYPEN) {
      const value = changeEntranceType(city, `grundriss:${typ}`, defaults);
      expect(value).toMatchObject({ art: "grundriss", profil: typ, breite: "", hoehe: "", anzahl: "" });
      const request = generationOptions(value, defaults);
      expect(request).toMatchObject({ profil: typ });
      expect(request).not.toHaveProperty("raeume");
      expect(request).not.toHaveProperty("zellen");
      expect(request).not.toHaveProperty("bauwerke");
    }
  });

  it("clears an obsolete building profile for caves and free dungeons", () => {
    for (const choice of ["hoehle", "grundriss:frei"]) {
      const value = changeEntranceType(generationSettings("grundriss", "kirche"), choice, defaults);
      expect(value.profil).toBe("frei");
      expect(entranceTypeValue(value)).toBe(choice);
    }
  });

  it("does not silently reinterpret malformed or unsupported choices", () => {
    const value = generationSettings();
    for (const choice of ["region", "siedlung", "siedlung:unknown", "grundriss:unknown", "grundriss:haus:extra", "", "__proto__"]) {
      expect(changeEntranceType(value, choice, defaults)).toBe(value);
    }
  });

  it("retains manual adjustments when the current type is selected again", () => {
    const value = { ...generationSettings(), breite: 71, hoehe: 35, anzahl: 83 };
    expect(changeEntranceType(value, "siedlung:dorf", defaults)).toBe(value);
  });

  it("uses host-specific settlement profiles rather than replacing them with UI constants", () => {
    const custom: GenerationDefaults = { ...defaults, siedlungsarten: {
      weiler: settlementPreset("weiler", defaults), dorf: defaults.siedlung,
      stadt: { ...defaults.siedlung, art: "stadt", ausdehnung: [61, 43], bauwerke: 149, strassenDichte: .65, licht: false },
    } };
    expect(changeEntranceType(generationSettings(), "siedlung:stadt", custom)).toMatchObject({
      siedlung: "stadt", breite: 61, hoehe: 43, anzahl: 149, dichte: .65, licht: false,
    });
  });

  it("shares legacy settlement presets with the size buttons", () => {
    for (const type of SETTLEMENT_TYPES) {
      const value = changeEntranceType(generationSettings("grundriss"), `siedlung:${type}`, defaults);
      const preset = settlementPreset(type, defaults);
      expect([value.breite, value.hoehe, value.anzahl, value.dichte, value.licht])
        .toEqual([...preset.ausdehnung, preset.bauwerke, preset.strassenDichte, preset.licht]);
    }
  });

  it("preserves terrain, era and visual style across type changes", () => {
    const value: GenerationSettings = { ...generationSettings(), standort: "insel", setting: "scifi", stil: "genres", relief: .85, bewaldung: .15 };
    expect(changeEntranceType(value, "grundriss:labor", defaults)).toMatchObject({
      standort: "insel", setting: "scifi", stil: "genres", relief: .85, bewaldung: .15,
    });
  });

  it("keeps inherited building profiles locked without disabling the existing family choice", () => {
    const change = vi.fn(), tree = controls(generationSettings("grundriss", "kirche"), change, true);
    const selects = nodes(tree).filter(node => node.type === "select");
    expect(selects[1]?.props).toMatchObject({ value: "kirche", disabled: true });
    expect(selects[0]?.props.disabled).not.toBe(true);
    expect(options(selects[0]).map(option => option.props.value)).not.toContain("region");
    selects[0]!.props.onChange({ target: { value: "hoehle" } });
    expect(change).toHaveBeenCalledWith(expect.objectContaining({ art: "hoehle", profil: "kirche" }));
  });

  it("does not duplicate the profile selector on an unlocked compact interior", () => {
    const selects = nodes(controls(generationSettings("grundriss", "haus"))).filter(node => node.type === "select");
    expect(selects).toHaveLength(1);
    expect(selects[0]?.props.value).toBe("grundriss:haus");
  });

  it("leaves standalone regional generation available", () => {
    const change = vi.fn();
    const tree = MapGenerationControls({ value: generationSettings(), defaults, onChange: change });
    const families = nodes(tree).find(node => node.props["aria-label"] === "Art der Karte");
    const buttons = nodes(families).filter(node => node.type === "button");
    expect(buttons).toHaveLength(4);
    buttons[0]!.props.onClick();
    expect(change).toHaveBeenCalledWith(expect.objectContaining({ art: "region" }));
  });

  it("can display an unsupported incoming regional value without offering it as a valid choice", () => {
    const regional = options(picker(controls(generationSettings("region")))).find(option => option.props.value === "region");
    expect(regional?.props.disabled).toBe(true);
  });
});
