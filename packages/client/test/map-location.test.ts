// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { createElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { GRUNDRISS_STANDARD, HOEHLE_STANDARD, SIEDLUNG_STANDARD, SIEDLUNG_STANDORTE } from "@chronicle/forge";
import { MAP_LOCATIONS, MapGenerationControls } from "../src/features/MapGenerationControls.tsx";
import { changeGenerationSetting, generationOptions, generationSettings, type GenerationSettings } from "../src/features/map-generation.ts";

const defaults = { grundriss: GRUNDRISS_STANDARD, hoehle: HOEHLE_STANDARD, siedlung: SIEDLUNG_STANDARD };
function elements(node: ReactNode): ReactElement<Record<string, unknown>>[] {
  if (Array.isArray(node)) return node.flatMap(elements);
  if (!node || typeof node !== "object" || !("props" in node)) return [];
  const element = node as ReactElement<Record<string, unknown>>;
  return [element, ...elements(element.props.children as ReactNode)];
}

describe("visible settlement location controls", () => {
  it.each([false, true])("offers every location, nine of them, before fine settings (compact=%s)", compact => {
    const html = renderToStaticMarkup(createElement(MapGenerationControls, { value: generationSettings(), defaults, compact, onChange() {} }));
    expect(MAP_LOCATIONS.map(location => location.id)).toEqual(SIEDLUNG_STANDORTE);
    const start = html.indexOf('aria-label="Standort der Siedlung"');
    expect(start).toBeGreaterThan(0);
    expect(start).toBeLessThan(html.indexOf("<details"));
    expect(MAP_LOCATIONS).toHaveLength(9);
    for (const location of MAP_LOCATIONS) expect(html).toContain(`<strong>${location.label}</strong>`);
    for (const label of ["Relief", "Bewaldung"]) expect(html).toContain(`aria-label="${label}"`);
    expect(html).toContain("Bestimmt Gelände, Wasser und bebaubares Land");
  });

  it.each(SIEDLUNG_STANDORTE)("%s changes the submitted location while preserving dimensions and setting", standort => {
    const original: GenerationSettings = { ...generationSettings(), breite: 48, hoehe: 32, setting: "gegenwart" };
    let chosen = original;
    const tree = MapGenerationControls({ value: original, defaults, onChange: next => { chosen = next; } });
    const group = elements(tree).find(element => element.props["aria-label"] === "Landschaft auswählen")!;
    const button = elements(group).filter(element => element.type === "button")[SIEDLUNG_STANDORTE.indexOf(standort)]!;
    (button.props.onClick as () => void)();
    expect(chosen).toEqual({ ...original, standort });
    expect(generationOptions(chosen, defaults)).toMatchObject({ standort, setting: "gegenwart", ausdehnung: [48, 32] });
    expect(changeGenerationSetting(chosen, "scifi").standort).toBe(standort);
    for (const art of ["grundriss", "hoehle"] as const) expect(generationOptions({ ...chosen, art }, defaults)).not.toHaveProperty("standort");
  });
});
