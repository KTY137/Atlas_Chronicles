// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MapEditTools, mapToolSettings } from "../src/features/MapEditTools.tsx";

const render = (patch: Partial<ReturnType<typeof mapToolSettings>> = {}) => renderToStaticMarkup(createElement(MapEditTools, {
  value: { ...mapToolSettings(100), ...patch }, onChange() {}, linked: false, onLock() {}, onRotate() {}, onRemove() {}, onVary() {}, busy: false, childrenConfirmed: true,
}));

describe("the height tool in the map studio", () => {
  it("stands in the landscape group with its shortcut and defaults to a gentle raise", () => {
    const html = render();
    expect(html).toContain('aria-label="Höhe"');
    expect(html).toContain("<kbd aria-hidden=\"true\">E</kbd>");
    const settings = mapToolSettings(100);
    expect(settings.reliefMode).toBe("raise"); expect(settings.reliefStrength).toBeGreaterThan(0); expect(settings.reliefStrength).toBeLessThanOrEqual(1);
  });
  it("explains itself in plain words: four modes, a radius in cells and a strength", () => {
    const html = render({ tool: "relief" });
    expect(html).toContain("Höhe formen");
    for (const mode of ["Anheben", "Absenken", "Glätten", "Einebnen"]) expect(html).toContain(`<strong>${mode}</strong>`);
    expect(html).toContain('aria-label="Anheben · Hügel und Berge auftürmen"');
    expect(html).toContain("Pinselradius"); expect(html).toContain("Zellen");
    expect(html).toContain('aria-label="Stärke"');
    expect(html).toContain("Wasser, das du mit dem Gelände-Pinsel malst, senkt das Land; Fels hebt es.");
    expect(html).not.toMatch(/Heightmap|Raster-Sample|Interpolation/);
  });
  it("offers swamp and snow as terrain materials next to the older ones", () => {
    const html = render({ tool: "terrain" });
    for (const material of ["Sumpf", "Schnee", "Wiese", "Fels", "Wasser"]) expect(html).toContain(`aria-label="${material}"`);
    expect(html).toContain("map-material-swamp"); expect(html).toContain("map-material-snow");
  });
});
